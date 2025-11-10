import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, FormControl, InputLabel, Select,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch,
    IconFileSpreadsheet, IconFileText, IconX, IconFileDownload,
    IconBox,
    IconQrcode
} from '@tabler/icons-react';
import { QRCodeCanvas } from "qrcode.react";

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';
import DeleteConsignment from './DeleteConsignment';

import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

// --- Helper Functions and Styles ---
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        // تاریخ را به شیء Date تبدیل می‌کند
        const date = new Date(dateString.length === 10 ? dateString : String(dateString));
        // اگر تاریخ نامعتبر بود، متن خطا برمی‌گرداند
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    "&.Mui-selected": { color: "white" },
    "&.Mui-selected[data-value='all']": {
        backgroundColor: theme.palette.primary.main,
        "&:hover": { backgroundColor: theme.palette.primary.dark },
    },
    "&.Mui-selected[data-value='active']": {
        backgroundColor: theme.palette.success.main,
        "&:hover": { backgroundColor: theme.palette.success.dark },
    },
    "&.Mui-selected[data-value='inactive']": {
        backgroundColor: theme.palette.error.main,
        "&:hover": { backgroundColor: theme.palette.error.dark },
    },
    "&:not(.Mui-selected)": {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        "&:hover": { backgroundColor: theme.palette.action.hover },
    },
}));

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));

const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

// --- Data Interfaces (Consignment) ---
interface WarehouseType { id: number; name: string; }
interface WorkhouseType { id: number; name: string; }
interface CarWarehouseType { id: number; name: string; }
interface StoreType { id: number; name: string; workhouse?: { id: number; name: string } }

type PlaceKind = 'WAREHOUSE' | 'WORKHOUSE' | 'WORKHOUSE_STORE' | 'FILO' | 'UNKNOWN';

interface ConsignmentPayload {
    name: string;
    placeId: number;
    placeType: 0 | 1 | 2 | 3 | 4;
}

interface Consignment {
    id: number;
    name: string;
    code: string;
    placeId: number;
    type: 0 | 1 | 2 | 3 | 4;
    description?: string;
    recordStatus?: number;
    createAt?: string;

    // Computed Fields
    placeKind: PlaceKind;
    placeName: string;
}

type SortableKeys = 'id' | 'name' | 'code' | 'placeName' | 'createAt';

// --- Sorting Helpers (Unchanged) ---
const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
    if (valA === undefined || valA === null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    if (String(valB) < String(valA)) return -1;
    if (String(valB) > String(valA)) return 1;
    return 0;
};
const getComparator = (order: 'asc' | 'desc', orderBy: SortableKeys) => {
    return order === 'desc'
        ? (a: any, b: any) => descendingComparator(a, b, orderBy as any)
        : (a: any, b: any) => -descendingComparator(a, b, orderBy as any);
};
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order; return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};

// --- Main Component ---
const ListConsignments: React.FC = () => {
    const navigate = useNavigate();
    const { allowedOperations } = useAuth();

    // Permissions
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const { isTooltipGloballyEnabled } = useTooltip();

    // ------------------------------------
    // States Form
    // ------------------------------------
    const [editingId, setEditingId] = useState<number | null>(null);
    const [consignmentName, setConsignmentName] = useState<string>('');
    const [placeKind, setPlaceKind] = useState<PlaceKind>('WAREHOUSE');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | ''>('');
    const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
    const [selectedCarWarehouseId, setSelectedCarWarehouseId] = useState<number | ''>('');

    // لیست‌های مرجع
    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [carWarehousesList, setCarWarehousesList] = useState<CarWarehouseType[]>([]);
    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [consignments, setConsignments] = useState<Consignment[]>([]);

    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isBlinking, setIsBlinking] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // ------------------------------------
    // States Table/Filter
    // ------------------------------------
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableKeys>('name');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    // NEW: Date Filters for 'createAt'
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);

    const nameInputRef = useRef<HTMLInputElement>(null);

    // ------------------------------------
    // States Menu/Modals
    // ------------------------------------
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<Consignment | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<Consignment | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');


    const [nameError, setNameError] = useState(false);
    const [placeError, setPlaceError] = useState(false);

    const [openQrModal, setOpenQrModal] = useState(false);
    const [qrData, setQrData] = useState<{ code: string; name: string } | null>(null);
    const [downloadLoading, setDownloadLoading] = useState(false);


    // --- Alert & Initialization Logic ---
    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

    // --- Data Fetching Functions (Reference Lists) ---
    const fetchWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setWarehousesList(response.data.data.map((item: any) => ({ id: Number(item.id), name: item.name })) as WarehouseType[]);
            } else { showAlert(response.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Depolar yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    const fetchWorkhouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setWorkhousesList(response.data.data.map((item: any) => ({ id: Number(item.id), name: item.name })) as WorkhouseType[]);
            } else { showAlert(response.data.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Şantiyeler yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    // Mocking CarWarehouses (یا استفاده از API واقعی Filo) - اگر API واقعی دارید، آن را فعال کنید
    const fetchCarWarehouses = useCallback(() => {
        // فرض می‌کنیم این لیست از یک API دیگر یا لیست ثابت می‌آید
        setCarWarehousesList([{ id: 101, name: 'Filo Merkez' }, { id: 102, name: 'Filo Ankara' }] as CarWarehouseType[]);
    }, []);


    const fetchStoresByWorkhouseId = useCallback(async (workhouseId: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-stores-by-workhouse-id/${workhouseId}`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setStoresList(response.data.data.map((item: any) => ({ id: Number(item.id), name: item.name, workhouse: item.workhouse })) as StoreType[]);
            } else { showAlert(response.data.message || 'Şantiye depoları yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Şantiye depoları yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);


    // Fetch Consignments (MODIFIED for Dependencies)
    const fetchConsignments = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-consignments`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                debugger
                const rawRows = (res.data.data as any[]).map((r) => {
                    let name = '-';
                    const typeNum = Number(r.placeType);
                    const kind: PlaceKind = typeNum === 0 ? 'WAREHOUSE' : typeNum === 1 ? 'WORKHOUSE' : typeNum === 2 ? 'WORKHOUSE_STORE' : typeNum === 3 ? 'FILO' : 'UNKNOWN';

                    // محاسبه PlaceName بر اساس لیست‌های مرجع (از State)
                    if (typeNum === 0) {
                        name = warehousesList.find(w => w.id === Number(r.placeId))?.name || '-';
                    } else if (typeNum === 1) {
                        name = workhousesList.find(w => w.id === Number(r.placeId))?.name || '-';
                    } else if (typeNum === 2) {
                        name = storesList.find(s => s.id === Number(r.placeId))?.name || `Şantiye Deposu (ID: ${r.placeId})`;
                    } else if (typeNum === 3) {
                        name = carWarehousesList.find(w => w.id === Number(r.placeId))?.name || '-';
                    } else if (typeNum === 4) {
                        name = 'Bilinmeyen Yer Türü 4';
                    }

                    return {
                        id: Number(r.id),
                        name: r.name,
                        code: r.code || '-',
                        placeId: Number(r.placeId),
                        type: typeNum as Consignment['type'],
                        placeKind: kind,
                        description: r.description || '',
                        recordStatus: r.recordStatus,
                        createAt: r.createAt,
                        placeName: name,
                    };
                }) as Consignment[];

                setConsignments(rawRows);
            } else {
                showAlert(res.data.message || 'Kayıtlar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            showAlert('Kayıtlar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, warehousesList, workhousesList, carWarehousesList, storesList]); // <-- Dependencies برای رفع مشکل وابستگی‌ها

    // **فراخوانی اولیه لیست‌های مرجع**
    useEffect(() => {
        fetchWarehouses();
        fetchWorkhouses();
        fetchCarWarehouses();
    }, [fetchWarehouses, fetchWorkhouses, fetchCarWarehouses]);

    // **فراخوانی ثانویه Consignments (پس از بارگذاری لیست‌های مرجع)**
    useEffect(() => {
        // این useEffect تضمین می‌کند که fetchConsignments حداقل یک بار پس از پر شدن لیست‌های مرجع، اجرا شود.
        fetchConsignments();
    }, [fetchConsignments]);


    // --- Form Logic (Cont.) ---
    useEffect(() => {
        // منطق به‌روزرسانی لیست Store بر اساس Workhouse (برای WORKHOUSE_STORE)
        if (placeKind === 'WORKHOUSE_STORE') {
            setSelectedWarehouseId(''); setSelectedCarWarehouseId('');
            if (selectedWorkhouseId && typeof selectedWorkhouseId === 'number') {
                fetchStoresByWorkhouseId(selectedWorkhouseId);
            } else {
                setStoresList([]);
                setSelectedStoreId('');
            }
        } else {
            setSelectedStoreId('');
        }
        if (placeKind === 'WAREHOUSE') { setSelectedWorkhouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId(''); }
        if (placeKind === 'WORKHOUSE') { setSelectedWarehouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId(''); }
        if (placeKind === 'FILO') { setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId(''); }
    }, [placeKind, selectedWorkhouseId, fetchStoresByWorkhouseId]);



    // قبل از return اصلی کامپوننت اضافه شود
    const fetchLastConsignmentAndOpenQRModal = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        try {
            // ۱. آخرین رکورد ثبت شده را فچ کنید
            // (اگر API مخصوص برای 'get-last' ندارید، get-all را بگیرید و بر اساس createAt مرتب کنید)
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-consignments`,
                { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200 && res.data.data.length > 0) {
                const rawRows = res.data.data as any[];
                debugger

                // پیدا کردن جدیدترین رکورد بر اساس createAt
                const latestRecord = rawRows.sort((a, b) =>
                    new Date(b.createAt).getTime() - new Date(a.createAt).getTime())[0];

                if (latestRecord && latestRecord.code && latestRecord.name) {
                    console.log("QR Data Hazır:", latestRecord.code, latestRecord.name); // 👈 Console Log اضافه کنید
                    setQrData({ code: latestRecord.code, name: latestRecord.name });
                    setOpenQrModal(true);
                } else {
                    showAlert('Yeni kayıt verileri (Kod ve Ad) eksik.', 'warning');
                }
            } else {
                showAlert('Son kayıt alınamadı. Lütfen manuel kontrol edin.', 'warning');
            }
        } catch (e) {
            showAlert('Son kaydı alırken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);

    const validateForm = (): boolean => {
        let ok = true;

        if (!consignmentName.trim()) { setNameError(true); ok = false; } else setNameError(false);

        const computedPlaceId = placeKind === 'WAREHOUSE' ? selectedWarehouseId :
            placeKind === 'WORKHOUSE' ? selectedWorkhouseId :
                placeKind === 'WORKHOUSE_STORE' ? selectedStoreId : selectedCarWarehouseId;
        if (!computedPlaceId) { setPlaceError(true); ok = false; } else setPlaceError(false);

        if (!ok) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return ok;
    };

    const resetForm = () => {
        setEditingId(null);
        setConsignmentName('');

        setPlaceKind('WAREHOUSE');
        setSelectedWarehouseId('');
        setSelectedWorkhouseId('');
        setSelectedStoreId('');
        setSelectedCarWarehouseId('');

        setNameError(false); setPlaceError(false);
        setIsFormVisible(false);
    };

    const buildPayload = (id?: number): ConsignmentPayload & { id?: number } => {
        const placeIdToSend = placeKind === 'WAREHOUSE' ? selectedWarehouseId :
            placeKind === 'WORKHOUSE' ? selectedWorkhouseId :
                placeKind === 'WORKHOUSE_STORE' ? selectedStoreId : selectedCarWarehouseId;

        const typeToSend = placeKind === 'WAREHOUSE' ? 0 :
            placeKind === 'WORKHOUSE' ? 1 :
                placeKind === 'WORKHOUSE_STORE' ? 2 : 3;

        const payload: ConsignmentPayload & { id?: number } = {
            name: consignmentName.trim(),
            placeId: Number(placeIdToSend),
            placeType: typeToSend as ConsignmentPayload['placeType'],
        };

        if (id) payload.id = id;
        return payload;
    };


    const handleSubmitForm = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        const isEditing = editingId !== null;
        const payload = buildPayload(editingId ?? undefined);

        const url = isEditing
            ? `${server.baseurl}${server.hr}update-consignment`
            : `${server.baseurl}${server.hr}create-consignment`;
        const method = isEditing ? 'put' : 'post';

        try {
            const res = await axios.request({ method, url, data: payload, headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(`Ambar kaydı başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}!`, 'success');
                resetForm();
                if (!isEditing) {
                    await fetchLastConsignmentAndOpenQRModal();
                }
                fetchConsignments();
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'İşlem sırasında bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        const r = selectedRowForMenu;

        setEditingId(r.id);
        setConsignmentName(r.name);
        setPlaceKind(r.placeKind);

        // Set Place ID based on type
        if (r.type === 0) {
            setSelectedWarehouseId(r.placeId); setSelectedWorkhouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        } else if (r.type === 1) {
            setSelectedWorkhouseId(r.placeId); setSelectedWarehouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        } else if (r.type === 2) {
            setSelectedStoreId(r.placeId); setSelectedWarehouseId(''); setSelectedCarWarehouseId('');

            const store = storesList.find(s => s.id === r.placeId);
            const workhouseId = store?.workhouse?.id ?? '';
            setSelectedWorkhouseId(workhouseId);

            if (workhouseId && typeof workhouseId === 'number') {
                fetchStoresByWorkhouseId(workhouseId);
            }
        } else if (r.type === 3) {
            setSelectedCarWarehouseId(r.placeId); setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId('');
        }

        setIsFormVisible(true);

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);

        handleCloseMenu();
    };


    // --- Table & Filter Logic ---
    const isFilterActive = useMemo(() => !!searchTerm.trim() || statusFilter !== 'all' || startFilter !== null || endFilter !== null, [searchTerm, statusFilter, startFilter, endFilter]);

    const getPlaceKindText = (kind: PlaceKind) => {
        return kind === 'WAREHOUSE' ? 'Depo' :
            kind === 'WORKHOUSE' ? 'Şantiye' :
                kind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' :
                    kind === 'FILO' ? 'Filo' : 'Bilinmeyen';
    }

    const filteredConsignments = useMemo(() => {
        const list = consignments.filter(r => {
            // 1. Search Filter
            const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.placeName.toLowerCase().includes(searchTerm.toLowerCase()) || r.code.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. Status Filter
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);

            // 3. Date Filter (NEW)
            const cDate = r.createAt ? new Date(r.createAt) : null;
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) && (!endFilter || (cDate && cDate <= endFilter));


            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [consignments, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredConsignments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredConsignments, page, rowsPerPage]);

    // Menu Handlers
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: Consignment) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setDeleteName(selectedRowForMenu.name.trim());
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchConsignments(); };

    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } };
    const handleRequestSort = (property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); };
    const handleClearDateFilters = () => { setStartFilter(null); setEndFilter(null); };


    // --- Export Functions ---
    const exportToPdf = async (rows: Consignment[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

        // @ts-ignore
        const doc = new jsPDF();
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); } catch (e) { }
        docAny.setFont('NotoSans');

        const columns = ['Ambar/Mahsul Adı', 'Kod', 'Yer Türü', 'Yer', 'Kayıt Tarihi'];
        const body = rows.map(r => [
            r.name || '-',
            r.code || '-',
            getPlaceKindText(r.placeKind),
            r.placeName || '-',
            formatDateDisplay(r.createAt || null),
        ]);

        const title = isFiltered ? 'Filtrelenmiş Ambar/Mahsul Kayıtları Raporu' : 'Tüm Ambar/Mahsul Kayıtları Raporu';

        autoTable(docAny, {
            head: [columns],
            body: body,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: 'NotoSans', fontSize: 9 },
            didDrawPage: (data: any) => {
                docAny.setFont('NotoSans', 'normal'); docAny.setFontSize(14);
                docAny.text(title, pageWidth / 2, 15, { align: 'center' });
                docAny.setFontSize(10); docAny.setFont('NotoSans', 'normal');
                docAny.text(`Rapor Tarih:`, 15, 25);
                docAny.setFont('NotoSans', 'normal');
                docAny.text(`${formatDateDisplay(new Date().toISOString())}`, 35, 25);
                docAny.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

                docAny.setFont('NotoSans', 'normal'); docAny.setFontSize(8); docAny.setTextColor(0);
                const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
                let footerY = pageHeight - 30;
                companyInfo.forEach(line => { docAny.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
                const pageNumber = data.pageNumber;
                const pageCount = docAny.internal.getNumberOfPages();
                docAny.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
                docAny.setFont('NotoSans', 'normal');
                docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            },
            startY: 50, showHead: 'everyPage', margin: { top: 40, bottom: 45, left: 10, right: 10 }
        });

        const fileName = isFiltered ? `Filtrelenmis_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf` : `Tum_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        setLoadingData(false);
    };

    const exportToExcel = async (rows: Consignment[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('Dışa aktarılacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheetName = isFiltered ? 'Filtrelenmiş Kayıtlar' : 'Tüm Kayıtlar';
            const worksheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });

            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
            const headerFont = { ...font, bold: true };
            const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            const fullHeaderStyle = { border: border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>;
            const bodyStyle = { border: border, alignment: leftAlignment, font: font } as Partial<Excel.Style>;

            const addCompanyInfo = (ws: Excel.Worksheet) => {
                ws.addRow([]);
                const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
                companyInfo.forEach(line => {
                    ws.addRow([line]);
                    const lastRow = ws.lastRow;
                    if (lastRow) {
                        lastRow.getCell(1).alignment = { horizontal: 'center' };
                        lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                        ws.mergeCells(`A${lastRow.number}:F${lastRow.number}`); // 6 columns
                    }
                });
            };

            const titleText = isFiltered ? 'Filtrelenmiş Ambar/Mahsul Kayıtları Raporu' : 'Tüm Ambar/Mahsul Kayıtları Raporu';
            worksheet.addRow(['', '', '', '', '', '']); // 6 columns
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) { titleRow.font = { name: 'Times New Roman', size: 12, bold: true }; titleRow.getCell(1).alignment = { horizontal: 'center' }; }
            worksheet.mergeCells(`A${titleRow.number}:F${titleRow.number}`);

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) { dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false }; dateRow.getCell(1).alignment = { horizontal: 'left' }; }
            worksheet.addRow([]);

            const tableHeaders = ['Ambar/Mahsul Adı', 'Kod', 'Yer Türü', 'Yer', 'Kayıt Tarihi'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => { cell.style = fullHeaderStyle; });

            rows.forEach(r => {
                const row = worksheet.addRow([
                    r.name || '-',
                    r.code || '-',
                    getPlaceKindText(r.placeKind),
                    r.placeName || '-',
                    formatDateDisplay(r.createAt || null),
                ]);
                row.eachCell((cell) => { cell.style = bodyStyle; });
            });

            addCompanyInfo(worksheet);

            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                // @ts-ignore
                if (column.eachCell) {
                    // @ts-ignore
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) { maxLength = columnLength; }
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 12), 50);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = isFiltered ? `Filtrelenmis_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx` : `Tum_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const handleOpenDownloadAllModal = () => setOpenDownloadAllModal(true);
    const handleCloseDownloadAllModal = () => setOpenDownloadAllModal(false);
    const handleOpenDownloadFilteredModal = () => setOpenDownloadFilteredModal(true);
    const handleCloseDownloadFilteredModal = () => setOpenDownloadFilteredModal(false);
    const handleOpenRowDownloadModal = (row: Consignment) => { setSelectedRowForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedRowForDownload(null); };

    const handleDownloadAll = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(consignments, false) : exportToExcel(consignments, false); handleCloseDownloadAllModal(); };
    const handleDownloadFiltered = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(filteredConsignments, true) : exportToExcel(filteredConsignments, true); handleCloseDownloadFilteredModal(); };
    const handleDownloadRow = (format: 'pdf' | 'excel') => { if (!selectedRowForDownload) return; const rows = [selectedRowForDownload]; format === 'pdf' ? exportToPdf(rows, false) : exportToExcel(rows, false); handleCloseRowDownloadModal(); };


    const downloadQRCodeAsPNG = (elementId: string, filename: string) => {
        const canvas = document.getElementById(elementId) as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    // B. تابع کمکی برای دانلود PDF (با اطلاعات اضافه)
    const downloadQRCodeAsPDF = async (code: string, name: string) => {
        setDownloadLoading(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const docAny = doc as any;

        // ۱. اضافه کردن فونت برای پشتیبانی از کاراکترهای ترکی/فارسی (بر اساس کد فعلی شما)
        try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); } catch (e) { }
        docAny.setFont('NotoSans');

        // ۲. دریافت تصویر QR Code از Canvas
        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        const qrImage = canvas ? canvas.toDataURL('image/png') : null;

        docAny.setFontSize(12);
        docAny.text(`Ambar Adı: ${name}`, 10, 15);
        docAny.text(`Kod: ${code}`, 10, 25);

        if (qrImage) {
            docAny.addImage(qrImage, 'PNG', 10, 35, 60, 60); // x, y, width, height
        } else {
            docAny.text('QR Kod görseli bulunamadı.', 10, 50);
        }

        docAny.save(`QRCode_${code}.pdf`);
        setDownloadLoading(false);
    };


    const handleOpenQrModal = (row: Consignment) => {
        // از داده‌های ردیف برای پر کردن وضعیت QR Code استفاده می‌کنیم
        if (row.code && row.name) {
            setQrData({ code: row.code, name: row.name });
            setOpenQrModal(true);
        } else {
            showAlert('QR Kod oluşturmak için Kod ve Ad bilgisi eksik.', 'warning');
        }
        handleCloseMenu(); // منوی عملیات را می‌بندیم
    };

    // --- JSX Render ---
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconBox width={24} height={24} />
                        <Typography variant="h5" mb={0}>{editingId ? 'Ambar Kaydını Düzenle' : 'Yeni Ambar/Mahsul Kaydı'}</Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni kayıt formunu aç" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>Yeni Kayıt Ekle</BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizle" : ""}>
                                <Button variant="contained" color="error" onClick={resetForm} startIcon={<IconX size={20} />}>Gizle</Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2}>

                            {/* Consignment Name */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Ambar/Mahsul Adı</CustomFormLabel>
                                <CustomTextField placeholder="Adı Girin" size="small" fullWidth value={consignmentName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setConsignmentName(e.target.value);
                                        if (nameError) setNameError(false);
                                    }}
                                    inputRef={nameInputRef} error={nameError}
                                    helperText={nameError ? 'Bu alan zorunludur!' : ''}

                                />
                            </Grid>

                            {/* Place Kind Selector */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Yer Türü</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }}>
                                    <InputLabel id="sel-placekind">Yer Türü Seçin</InputLabel>
                                    <Select labelId="sel-placekind" label="Yer Türü Seçin" value={placeKind}
                                        onChange={(e) => setPlaceKind(e.target.value as PlaceKind)}>
                                        <MuiMenuItem value="WAREHOUSE">Depo</MuiMenuItem>
                                        <MuiMenuItem value="WORKHOUSE">Şantiye</MuiMenuItem>
                                        <MuiMenuItem value="WORKHOUSE_STORE">Şantiyenin Deposu</MuiMenuItem>
                                        <MuiMenuItem value="FILO">Filo</MuiMenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Dynamic Place Selectors (Depo) */}
                            {placeKind === 'WAREHOUSE' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Depo</CustomFormLabel>
                                    <FormControl size="small" sx={{ width: '100%' }} error={placeError}>
                                        <InputLabel id="sel-warehouse">Depo Seçin</InputLabel>
                                        <Select labelId="sel-warehouse" label="Depo Seçin" value={selectedWarehouseId} onChange={(e) => { setSelectedWarehouseId(Number(e.target.value)); if (placeError) setPlaceError(false); }}>
                                            {warehousesList.map(w => <MuiMenuItem key={w.id} value={w.id}>{w.name}</MuiMenuItem>)}
                                        </Select>
                                        {placeError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur!</Typography>}
                                    </FormControl>
                                </Grid>
                            )}

                            {/* Dynamic Place Selectors (Şantiye) */}
                            {placeKind === 'WORKHOUSE' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Şantiye</CustomFormLabel>
                                    <FormControl size="small" sx={{ width: '100%' }} error={placeError}>
                                        <InputLabel id="sel-workhouse">Şantiye Seçin</InputLabel>
                                        <Select labelId="sel-workhouse" label="Şantiye Seçin" value={selectedWorkhouseId} onChange={(e) => { setSelectedWorkhouseId(Number(e.target.value)); if (placeError) setPlaceError(false); }}>
                                            {workhousesList.map(w => <MuiMenuItem key={w.id} value={w.id}>{w.name}</MuiMenuItem>)}
                                        </Select>
                                        {placeError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur!</Typography>}
                                    </FormControl>
                                </Grid>
                            )}

                            {/* Dynamic Place Selectors (Şantiyenin Deposu) */}
                            {placeKind === 'WORKHOUSE_STORE' && (
                                <>
                                    <Grid item xs={12} sm={4}>
                                        <CustomFormLabel required>Şantiye (İlişkili)</CustomFormLabel>
                                        <FormControl size="small" sx={{ width: '100%' }}>
                                            <InputLabel id="sel-workhouse-2">Şantiye Seçin</InputLabel>
                                            <Select labelId="sel-workhouse-2" label="Şantiye Seçin" value={selectedWorkhouseId} onChange={(e) => { const v = Number(e.target.value); setSelectedWorkhouseId(v); setSelectedStoreId(''); }}>
                                                {workhousesList.map(w => <MuiMenuItem key={w.id} value={w.id}>{w.name}</MuiMenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <CustomFormLabel required>Şantiyenin Deposu</CustomFormLabel>
                                        <FormControl size="small" sx={{ width: '100%' }} error={placeError}>
                                            <InputLabel id="sel-store">Depo Seçin</InputLabel>
                                            <Select labelId="sel-store" label="Depo Seçin" value={selectedStoreId} onChange={(e) => { setSelectedStoreId(Number(e.target.value)); if (placeError) setPlaceError(false); }}>
                                                {storesList.map(s => <MuiMenuItem key={s.id} value={s.id}>{s.name}</MuiMenuItem>)}
                                            </Select>
                                            {placeError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur!</Typography>}
                                        </FormControl>
                                    </Grid>
                                </>
                            )}

                            {/* Dynamic Place Selectors (Filo) */}
                            {placeKind === 'FILO' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Filo Depo (CarWarehouse)</CustomFormLabel>
                                    <FormControl size="small" sx={{ width: '100%' }} error={placeError}>
                                        <InputLabel id="sel-carwarehouse">Filo Depo Seçin</InputLabel>
                                        <Select labelId="sel-carwarehouse" label="Filo Depo Seçin"
                                            value={selectedCarWarehouseId}
                                            onChange={(e) => { setSelectedCarWarehouseId(Number(e.target.value)); if (placeError) setPlaceError(false); }}
                                        >
                                            {carWarehousesList.map(w => <MuiMenuItem key={w.id} value={w.id}>{w.name}</MuiMenuItem>)}
                                        </Select>
                                        {placeError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur!</Typography>}
                                    </FormControl>
                                </Grid>
                            )}

                            {/* Form Actions */}
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {editingId !== null ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili kaydı güncelle" : ""}>
                                                <Button variant="contained" color="info" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : 'Düzenle'}</Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni kayıt moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni kayıt ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : 'Yeni Kayıt Ekle'}</Button>
                                                </CustomTooltip>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>
                )}
            </div>
            <BlankCard>
                <>
                    {alertMessage && (
                        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                            <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                        </Stack>
                    )}
                </>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <BlinkingButton variant="contained" color="secondary" onClick={handleOpenDownloadFilteredModal} isBlinking={true} disabled={loadingData} startIcon={<IconFileDownload />}>Filtrelenmişi İndir</BlinkingButton>
                        )}
                        {hasDownloadPermission && (
                            <Button variant="contained" color="primary" onClick={handleOpenDownloadAllModal} startIcon={<IconFileDownload />} disabled={loadingData}>Tümünü İndir</Button>
                        )}
                    </Stack>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ara (Ad / Kod / Yer)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>

                        {/* NEW: Date Filters (Start Date) */}
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Kayıt Başlangıç"
                                    value={startFilter}
                                    onChange={(v) => { setStartFilter(v); setPage(0); }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        {/* NEW: Date Filters (End Date) */}
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Kayıt Bitiş"
                                        value={endFilter}
                                        inputFormat="dd/MM/yyyy"
                                        minDate={startFilter || undefined} // Min date should be the start date
                                        onChange={(v) => { setEndFilter(v); setPage(0); }}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Durum filtresi" sx={{ flexGrow: 1 }}>
                                <StyledToggleButton value="all" data-value="all">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" data-value="active">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" data-value="inactive">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>

                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Kayıtlar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="consignments table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>

                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Kod</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Ambar/Mahsul Adı</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>

                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Yer Türü</Typography></StyledTableCell>

                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'placeName'} direction={orderBy === 'placeName' ? order : 'asc'} onClick={() => handleRequestSort('placeName')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Yer</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>

                                    {/* NEW: Kayıt Tarihi Column */}
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Kayıt Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>


                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>{row.code || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.name || '-'}</StyledTableCell>
                                            <StyledTableCell>
                                                {row.placeKind === 'WAREHOUSE' ? 'Depo' :
                                                    row.placeKind === 'WORKHOUSE' ? 'Şantiye' :
                                                        row.placeKind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' :
                                                            row.placeKind === 'FILO' ? 'Filo' : '-'}
                                            </StyledTableCell>
                                            <StyledTableCell>{row.placeName}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.createAt || null)}</StyledTableCell>

                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton onClick={(e) => handleClickMenu(e, row)}><IconDots width={18} /></IconButton>
                                                </CustomTooltip>
                                                <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>

                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kaydı indir" : ""}>
                                                            <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {(selectedRowForMenu?.code && hasDownloadPermission) && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydın QR Kodunu indir" : ""}>

                                                            <MuiMenuItem onClick={() => handleOpenQrModal(selectedRowForMenu as Consignment)}>
                                                                <ListItemIcon>
                                                                    <IconQrcode width={18} />
                                                                </ListItemIcon>
                                                                QR Kod İndir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={6} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kayıt bulunamadı.</Typography></StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredConsignments.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            {/* Download Modals */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAll('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAll('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadFiltered('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadFiltered('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadFilteredModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openQrModal} onClose={() => { setOpenQrModal(false); setQrData(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>🎉 Yeni Kayıt Başarıyla Eklendi!</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                    {qrData && (
                        <>
                            <Typography variant="h6" gutterBottom>Ambar/Mahsul: {qrData.name}</Typography>
                            <Typography variant="body1" color="textSecondary" mb={2}>Kod: {qrData.code}</Typography>

                            <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 2, mb: 3 }}>
                                <QRCodeCanvas id="qr-code-canvas" value={qrData.code} size={200} level="H" />
                            </Box>

                            <Stack direction="row" spacing={2} justifyContent="center" width="100%">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<IconFileText />}
                                    onClick={() => downloadQRCodeAsPDF(qrData.code, qrData.name)}
                                    disabled={downloadLoading}
                                >
                                    {downloadLoading ? <CircularProgress size={20} color="inherit" /> : 'PDF İndir'}
                                </Button>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<IconFileDownload />}
                                    onClick={() => downloadQRCodeAsPNG('qr-code-canvas', `QRCode_${qrData.code}.png`)}
                                    disabled={downloadLoading}
                                >
                                    PNG İndir
                                </Button>
                            </Stack>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenQrModal(false); setQrData(null); }} color="error" variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Modal */}
            <DeleteConsignment
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={deleteName}
                onDeleteSuccess={fetchConsignments}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListConsignments;