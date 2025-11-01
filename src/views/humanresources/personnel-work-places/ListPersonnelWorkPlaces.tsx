

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch,
    IconHelmet, IconFileSpreadsheet, IconFileText, IconX, IconFileDownload
} from '@tabler/icons-react';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';
import DeletePersonnelWorkPlaces from './DeletePersonnelWorkPlaces';

import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable'; // Import as default
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        console.log("Tarih biçimlendirilirken hata oluştu:", e);
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

// نوع‌های داده‌ای اصلی
interface PersonnelLite { id: number; name: string; family: string; }
interface PositionType { id: number; title: string; recordStatus?: number; createAt?: string }
interface WarehouseType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string }
interface WorkhouseType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string }
interface CarWarehouseType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string }
interface StoreType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string; workhouse?: { id: number; name: string } }
// PlaceKind: فیلد محاسبه شده در فرانت برای نمایش و منطق فرم (0: WAREHOUSE, 1: WORKHOUSE, 2: WORKHOUSE_STORE, 3: FILO)
type PlaceKind = 'WAREHOUSE' | 'WORKHOUSE' | 'WORKHOUSE_STORE' | 'FILO';


type SortableKeys = keyof Pick<PersonnelWorkPlace, 'startDate' | 'endDate' | 'createAt'> | 'personnelName' | 'placeName';

interface PersonnelWorkPlace {
    id: number;
    personnel: { id: number; name: string; family: string };
    position?: { id: number; title: string } | null;
    userRole?: { id: number; title: string } | null; // title: name of the role

    placeId: number; // مطابق با پاسخ API
    type: 0 | 1 | 2 | 3; // 4 نوع مختلف: 0: Depo, 1: Şantiye, 2: Şantiye Depo, 3: Filo

    startDate: string;
    endDate: string;
    description?: string;
    recordStatus?: number;
    createAt?: string;

    // فیلدهای محاسبه شده برای سادگی در نمایش و فیلترینگ
    placeKind: PlaceKind; // محاسبه شده از روی type
    placeName: string; // نام واقعی مکان، محاسبه شده در fetchAssignments
    personnelName: string; // محاسبه شده
}

interface RoleLite { id: string; role: { id: number; name: string; }; recordStatus: number; } // تعریف دقیق‌تر برای نقش‌های کاربر

interface UserType {
    id: string;
    username: string;
    email: string;
    status: string;
    recordStatus: number;
    imageUrl: string;
    // ⬅️ این پراپرتی باید اضافه شود تا خطا رفع شود
    userRoles: RoleLite[]; // یا هر نوع دقیق‌تری که برای این آرایه در بک‌اند استفاده می‌شود
}

interface Role { id: string; name: string; recordStatus: number; }


// توابع کمکی مرتب‌سازی
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


const ListPersonnelWorkPlaces: React.FC = () => {
    const navigate = useNavigate();

    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const { isTooltipGloballyEnabled } = useTooltip();

    // ------------------------------------
    // States Form
    // ------------------------------------
    const [editingId, setEditingId] = useState<number | null>(null);
    const [personnelId, setPersonnelId] = useState<number | ''>('');
    const [positionId, setPositionId] = useState<number | ''>('');
    const [userId, setUserId] = useState<string | null>(null);
    const [userRoleId, setUserRoleId] = useState<number | null>(null);
    const [placeKind, setPlaceKind] = useState<PlaceKind>('WAREHOUSE'); // Computed Field
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | ''>('');
    const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
    const [selectedCarWarehouseId, setSelectedCarWarehouseId] = useState<number | ''>('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [description, setDescription] = useState<string>("");

    const [personnels, setPersonnels] = useState<PersonnelLite[]>([]);
    const [positionsList, setPositionsList] = useState<PositionType[]>([]);
    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [carWarehousesList, setCarWarehousesList] = useState<CarWarehouseType[]>([]);
    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [usersList, setUsersList] = useState<UserType[]>([]);
    const [userRolesList, setUserRolesList] = useState<any[]>([]);

    const [storeNames, setStoreNames] = useState<Map<number, string>>(new Map()); // Cache for Store Names

    const [assignments, setAssignments] = useState<PersonnelWorkPlace[]>([]);

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
    const [orderBy, setOrderBy] = useState<SortableKeys>('startDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);
    const [isUserRoleDisabled, setIsUserRoleDisabled] = useState(false);

    // ------------------------------------
    // States Menu/Modals
    // ------------------------------------
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<PersonnelWorkPlace | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<PersonnelWorkPlace | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');

    const nameInputRef = useRef<HTMLInputElement>(null);

    // ------------------------------------
    // Alert & Initialization Logic
    // ------------------------------------
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

    // ------------------------------------
    // Data Fetching Functions
    // ------------------------------------
    const fetchPersonnels = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const data = res.data.data as any[];
                const mapped = data.map(p => ({ id: Number(p.id), name: p.name, family: p.family })) as PersonnelLite[];
                setPersonnels(mapped);


                //hazf shavad
                setCarWarehousesList(mapped)
            } else { showAlert(res.data.message || 'Personel listesi alınamadı.', 'error'); }
        } catch (e) { showAlert('Personel listesi çekilirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    const getListPositions = useCallback(() => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate('/'); setLoadingData(false); return; }
        axios.request({
            baseURL: server.baseurl + server.hr + "get-all-positions",
            method: 'get', headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                const formatted = result.data.data.map((item: any) => ({ id: Number(item.id), title: item.title, recordStatus: item.recordStatus, createAt: item.createAt }));
                setPositionsList(formatted as PositionType[]);
                setLoadingData(false);
            } else { showAlert(result.data.message || 'Pozisyon listesi alınırken bir hata oluştu.', 'error'); setLoadingData(false); }
        }).catch((e) => {
            if (e.response && e.response.status === 401) { localStorage.removeItem('authToken'); navigate('/'); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { console.error('Error fetching positions list:', e); showAlert('Pozisyon listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error'); setLoadingData(false); }
        });
    }, [navigate]);

    const fetchWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const all = response.data.data as any[];
                const mapped = all.map(item => ({
                    id: Number(item.id),
                    name: item.name,
                    code: item.code,
                    address: item.address,
                    recordStatus: item.recordStatus,
                    createAt: item.createAt
                })) as WarehouseType[];
                setWarehousesList(mapped);
            } else { showAlert(response.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Depolar yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    const fetchWorkhouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const all = response.data.data as any[];
                const mapped = all.map(item => ({
                    id: Number(item.id),
                    name: item.name,
                    code: item.code,
                    address: item.address,
                    recordStatus: item.recordStatus,
                    createAt: item.createAt
                })) as WorkhouseType[];
                setWorkhousesList(mapped);
            } else { showAlert(response.data.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Şantiyeler yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    // (NEW) Fetch CarWarehouses (Filo)
    // const fetchCarWarehouses = useCallback(async () => {
    //     const authToken = localStorage.getItem('authToken');
    //     if (!authToken) { navigate('/'); return; }
    //     try {
    //         // فرض می‌کنیم این API برای Filo است
    //         const response = await axios.get(server.baseurl + server.initialoperations + "get-car-warehouses", { headers: { Authorization: `Bearer ${authToken}` } });
    //         if (response.data.httpStatusCode === 200) {
    //             const all = response.data.data as any[];
    //             const mapped = all.map(item => ({
    //                 id: Number(item.id),
    //                 name: item.name,
    //                 code: item.code,
    //             })) as CarWarehouseType[];
    //             setCarWarehousesList(mapped);
    //         } else { showAlert(response.data.message || 'Filo listesi alınamadı.', 'error'); }
    //     } catch (e) { showAlert('Filo listesi çekilirken bir hata oluştu.', 'error'); }
    // }, [navigate]);

    const fetchStoresByWorkhouseId = useCallback(async (workhouseId: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-stores-by-workhouse-id/${workhouseId}`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const all = response.data.data as any[];
                // Note: The StoreType interface must include 'workhouse' object for handleEditClick
                const mapped = all.map(item => ({ id: Number(item.id), name: item.name, code: item.code, address: item.address, recordStatus: item.recordStatus, createAt: item.createAt, workhouse: item.workhouse })) as StoreType[];
                setStoresList(mapped);
            } else { showAlert(response.data.message || 'Şantiye depoları yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Şantiye depoları yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    const getListUsers = useCallback(() => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        axios.get(server.baseurl + server.user + "get-users", {
            headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                const formattedData = result.data.data.map((item: any) => ({
                    id: String(item.id),
                    username: item.username,
                    email: item.email,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setUsersList(formattedData as UserType[]);
            } else { showAlert(result.data.message || 'Kullanıcı listesi alınırken bir hata oluştu.', 'error'); }
        }).catch((_e) => { showAlert('Kullanıcı listesi alınırken bir hata oluştu.', 'error'); });
    }, [navigate]);

    const getUserRoles = (userId: string) => {
        const authToken = localStorage.getItem('authToken');
        axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${userId}`, {
            headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                const userRoles = result.data.data.userRoles.filter((role: Role) => role.recordStatus === 0);
                setUserRolesList(userRoles);
            } else {
                showAlert(result.data.message || 'Kullanıcı rol listesi alınırken bir hata oluştu.', 'error');
            }
        }).catch((_e) => {
            showAlert('Kullanıcı rol listesi alınırken bir hata oluştu.', 'error');
        });
    };

    // API Call برای گرفتن نام Store (برای حل مشکل N+1، اگرچه بهتر است این از سمت بکند حل شود)
    const fetchStoreNameById = async (storeId: number): Promise<string> => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return '-'; }
        try {
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-store-by-id/${storeId}`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                return response.data.data.name;
            } else {
                return 'Hata';
            }
        } catch (error) {
            console.error('Error fetching store data:', error);
            return 'Hata';
        }
    };


    // (MODIFIED) Logic to fetch all assignments and compute placeName
    const fetchAssignments = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels-work-places`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {

                // 1. Initial Mapping and PlaceKind determination (Computed Field)
                const rawRows = (res.data.data as any[]).map((r) => {
                    const typeNum = Number(r.type);
                    const kind: PlaceKind = typeNum === 0 ? 'WAREHOUSE' :
                        typeNum === 1 ? 'WORKHOUSE' :
                            typeNum === 2 ? 'WORKHOUSE_STORE' : 'FILO';

                    return {
                        id: Number(r.id),
                        personnel: r.personnel ? { id: Number(r.personnel.id), name: r.personnel.name, family: r.personnel.family } : { id: Number(r.personnelId), name: '', family: '' },
                        position: r.position ? { id: Number(r.position.id), title: r.position.title } : (r.positionId ? { id: Number(r.positionId), title: '' } : null),
                        userRole: r.userRole ? { id: Number(r.userRole.id), title: r.userRole.role.name } : null,
                        placeId: Number(r.placeId),
                        type: typeNum as 0 | 1 | 2 | 3,
                        placeKind: kind, // Computed Field
                        startDate: r.startDate,
                        endDate: r.endDate,
                        description: r.description,
                        recordStatus: r.recordStatus,
                        createAt: r.createAt,
                        placeName: '', // Will be filled in step 3
                        personnelName: `${r.personnel?.name ?? ''} ${r.personnel?.family ?? ''}`.trim(), // Computed Field
                    };
                }) as PersonnelWorkPlace[];

                // 2. Fetch Store Names (Workaround for N+1 until API is fixed)
                const updatedStoreNames = new Map(storeNames);
                for (let row of rawRows) {
                    if (row.type === 2 && !updatedStoreNames.has(row.placeId)) {
                        const storeName = await fetchStoreNameById(row.placeId); // ⬅️ هر ردیف یک درخواست جدید
                        updatedStoreNames.set(row.placeId, storeName);
                    }
                }
                setStoreNames(updatedStoreNames);

                // 3. Compute final placeName for all rows
                const finalRows = rawRows.map(row => {
                    let name = '-';
                    if (row.type === 0) { // WAREHOUSE
                        name = warehousesList.find(w => w.id === row.placeId)?.name || '-';
                    } else if (row.type === 1) { // WORKHOUSE
                        name = workhousesList.find(w => w.id === row.placeId)?.name || '-';
                    } else if (row.type === 2) { // WORKHOUSE_STORE
                        name = updatedStoreNames.get(row.placeId) || '-';
                    } else if (row.type === 3) { // FILO
                        name = carWarehousesList.find(w => w.id === row.placeId)?.name || '-';
                    }

                    return { ...row, placeName: name };
                });

                setAssignments(finalRows);
            } else {
                showAlert(res.data.message || 'Kayıtlar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            console.warn('Error fetching personnel work places:', e);
            showAlert('Kayıtlar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, warehousesList, workhousesList]); // Added dependencies

    useEffect(() => {
        // زمانی که هر سه لیست اصلی بارگذاری شدند (و تغییر کردند)، Assignmentها را بارگذاری کن
        if (warehousesList.length > 0 || workhousesList.length > 0) {
            fetchAssignments();
        }
    }, [warehousesList, workhousesList, fetchAssignments]);
    // کد اصلاح شده برای بارگذاری اولیه
    useEffect(() => {
        // این توابع فقط باید یک بار در زمان Mount شدن کامپوننت اجرا شوند
        fetchPersonnels();
        getListPositions();
        fetchWarehouses();
        fetchWorkhouses();
        // fetchCarWarehouses();
        getListUsers();
        // fetchAssignments را از اینجا حذف کنید!
    }, [fetchPersonnels, getListPositions, fetchWarehouses, fetchWorkhouses, getListUsers]);
    // توجه: حتی بهتر است توابع useCallback را از این آرایه نیز حذف کنید و صرفاً یک آرایه خالی قرار دهید اگر مطمئنید که هیچ وابستگی خارجی ندارند.
    // ------------------------------------
    // Form Logic
    // ------------------------------------
    useEffect(() => {
        // Clear non-relevant IDs when placeKind changes
        if (placeKind === 'WAREHOUSE') {
            setSelectedWorkhouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        }
        if (placeKind === 'WORKHOUSE') {
            setSelectedWarehouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        }
        if (placeKind === 'FILO') {
            setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId('');
        }
        if (placeKind === 'WORKHOUSE_STORE') {
            setSelectedWarehouseId(''); setSelectedCarWarehouseId('');
            if (selectedWorkhouseId && typeof selectedWorkhouseId === 'number') {
                fetchStoresByWorkhouseId(selectedWorkhouseId);
            } else {
                setStoresList([]);
                setSelectedStoreId('');
            }
        }
    }, [placeKind, selectedWorkhouseId, fetchStoresByWorkhouseId]);

    const [personnelError, setPersonnelError] = useState(false);
    const [positionError, setPositionError] = useState(false);
    const [placeError, setPlaceError] = useState(false);
    const [startError, setStartError] = useState(false);
    const [endError, setEndError] = useState(false);

    const validateForm = (): boolean => {
        let ok = true;
        if (!personnelId) { setPersonnelError(true); ok = false; } else setPersonnelError(false);
        if (!positionId) { setPositionError(true); ok = false; } else setPositionError(false);

        const computedPlaceId = placeKind === 'WAREHOUSE' ? selectedWarehouseId :
            placeKind === 'WORKHOUSE' ? selectedWorkhouseId :
                placeKind === 'WORKHOUSE_STORE' ? selectedStoreId : selectedCarWarehouseId;
        if (!computedPlaceId) { setPlaceError(true); ok = false; } else setPlaceError(false);

        if (!startDate) { setStartError(true); ok = false; } else setStartError(false);
        if (!endDate) { setEndError(true); ok = false; } else setEndError(false);

        if (startDate && endDate && endDate < startDate) {
            showAlert('Bitiş tarihi başlangıç tarihinden küçük olamaz!', 'warning');
            setEndError(true); ok = false;
        }
        if (!ok) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return ok;
    };

    const resetForm = () => {
        setEditingId(null);
        setPersonnelId('');
        setPositionId('');
        setUserId(null);
        setUserRoleId(null);
        // setCarWarehousesList(null)
        setPlaceKind('WAREHOUSE');
        setSelectedWarehouseId('');
        setSelectedWorkhouseId('');
        setSelectedStoreId('');
        setSelectedCarWarehouseId('');
        setStartDate(null);
        setEndDate(null);
        setDescription('');
        setPersonnelError(false); setPositionError(false); setPlaceError(false); setStartError(false); setEndError(false);
        setIsFormVisible(false);
        setIsUserRoleDisabled(false);
    };

    const buildPayload = () => {
        const placeIdToSend = placeKind === 'WAREHOUSE' ? selectedWarehouseId :
            placeKind === 'WORKHOUSE' ? selectedWorkhouseId :
                placeKind === 'WORKHOUSE_STORE' ? selectedStoreId : selectedCarWarehouseId;

        const typeToSend = placeKind === 'WAREHOUSE' ? 0 :
            placeKind === 'WORKHOUSE' ? 1 :
                placeKind === 'WORKHOUSE_STORE' ? 2 : 3;

        return {
            id: editingId ?? undefined,
            personnelId: Number(personnelId),
            positionId: Number(positionId),
            userRoleId: userRoleId ?? null,
            placeId: Number(placeIdToSend),
            type: typeToSend,
            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: endDate ? new Date(endDate).toISOString() : null,
            description: description?.trim() || ''
        };
    };


    const insertAssignment = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }
        try {
            const payload = buildPayload();
            const res = await axios.post(`${server.baseurl}${server.hr}create-personnel-work-place`, payload, { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });
            if (res.data.httpStatusCode === 201 || res.data.httpStatusCode === 200) {
                showAlert('Görevlendirme başarıyla eklendi!', 'success');
                resetForm();
                fetchAssignments();
            } else { showAlert(res.data.message || 'Görevlendirme eklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'Görevlendirme eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    const editAssignment = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }
        try {
            const payload = buildPayload();
            const res = await axios.put(`${server.baseurl}${server.hr}update-personnel-work-place`, payload, { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });
            if (res.data.httpStatusCode === 200) {
                showAlert('Görevlendirme başarıyla güncellendi!', 'success');
                resetForm();
                fetchAssignments();
            } else { showAlert(res.data.message || 'Görevlendirme güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response && e.response.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate('/'); }
            else showAlert(e?.response?.data?.message || 'Görevlendirme güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    // (MODIFIED) handleEditClick to set placeId, type, and userId correctly
    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        const r = selectedRowForMenu;

        setEditingId(r.id);
        setPersonnelId(r.personnel?.id ?? '');
        setPositionId(r.position?.id ?? '');
        setUserRoleId(r.userRole?.id ?? null);

        // Find the User ID associated with the User Role ID in the list
        const relatedUser = usersList.find(u => u.userRoles && u.userRoles.some(role => Number(role.id) === r.userRole?.id));
        if (relatedUser) {
            setUserId(relatedUser.id);
            getUserRoles(relatedUser.id);
        } else {
            setUserId(null);
            setUserRolesList([]);
        }

        setPlaceKind(r.placeKind); // Use the computed placeKind

        // Set Place ID based on type
        if (r.type === 0) { // WAREHOUSE
            setSelectedWarehouseId(r.placeId);
            setSelectedWorkhouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        } else if (r.type === 1) { // WORKHOUSE
            setSelectedWorkhouseId(r.placeId);
            setSelectedWarehouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        } else if (r.type === 2) { // WORKHOUSE_STORE
            setSelectedStoreId(r.placeId);
            setSelectedWarehouseId(''); setSelectedCarWarehouseId('');

            // To populate the Workhouse dropdown for a Store, we need to find the Workhouse ID.
            // If the storesList is comprehensive (including workhouse data), we can find it.
            const store = storesList.find(s => s.id === r.placeId);
            const workhouseId = store?.workhouse?.id ?? '';
            setSelectedWorkhouseId(workhouseId);

            // Re-fetch stores for the selected Workhouse
            if (workhouseId && typeof workhouseId === 'number') {
                fetchStoresByWorkhouseId(workhouseId);
            }

        } else if (r.type === 3) { // FILO
            setSelectedCarWarehouseId(r.placeId);
            setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId('');
        }

        setStartDate(r.startDate ? new Date(r.startDate) : null);
        setEndDate(r.endDate ? new Date(r.endDate) : null);
        setDescription(r.description || '');

        setIsFormVisible(true);
        setIsUserRoleDisabled(true); // Disable User/Role dropdowns when editing

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);

        handleCloseMenu();
    };

    const isFilterActive = useMemo(() => !!searchTerm.trim() || startFilter !== null || endFilter !== null || statusFilter !== 'all', [searchTerm, startFilter, endFilter, statusFilter]);


    const filteredAssignments = useMemo(() => {
        const list = assignments.filter(r => {
            const matchesSearch = r.personnelName.toLowerCase().includes(searchTerm.toLowerCase()) || r.placeName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);
            const sDate = r.startDate ? new Date(r.startDate) : null;
            const inRange = (!startFilter || (sDate && sDate >= startFilter)) && (!endFilter || (sDate && sDate <= endFilter));
            return matchesSearch && matchesStatus && inRange;
        });
        // Note: The sorting functions must be updated to handle the new field names (e.g., personnelName, placeName)
        return stableSort(list, getComparator(order, orderBy));
    }, [assignments, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredAssignments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredAssignments, page, rowsPerPage]);

    // ... Menu Handlers remain the same
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: PersonnelWorkPlace) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return; setDeleteId(selectedRowForMenu.id); setDeleteName(`${selectedRowForMenu.personnel?.name ?? ''} ${selectedRowForMenu.personnel?.family ?? ''}`.trim()); setOpenDeleteModal(true); handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchAssignments(); };


    const exportToPdf = async (rows: PersonnelWorkPlace[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

        // @ts-ignore
        const doc = new jsPDF();
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // تنظیمات فونت
        try {
            docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        } catch (e) {
            console.warn('Font dosyaları yüklenemedi. Varsayılan font kullanılacak.');
        }

        docAny.setFont('NotoSans');

        const columns = [
            'Personel', 'Pozisyon', 'Rol', 'Yer Türü', 'Yer', 'Başlangıç', 'Bitiş', 'Açıklama'
        ];
        const body = rows.map(r => [
            r.personnelName || '-',
            r.position?.title || '-',
            r.userRole?.title || '-',
            r.placeKind === 'WAREHOUSE' ? 'Depo' : r.placeKind === 'WORKHOUSE' ? 'Şantiye' : r.placeKind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' : 'Filo',
            r.placeName || '-',
            formatDateDisplay(r.startDate),
            formatDateDisplay(r.endDate),
            r.description || '-'
        ]);

        const title = isFiltered ? 'Filtrelenmiş Personel Görevlendirmeleri Raporu' : 'Tüm Personel Görevlendirmeleri Raporu';

        autoTable(docAny, {
            head: [columns],
            body: body,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: {
                fillColor: [242, 242, 242],
                textColor: [0, 0, 0],
                font: 'NotoSans',
                fontSize: 9,
            },
            // ** منطق Header و Footer شامل آرم **
            didDrawPage: (data: any) => {
                // Header (سربرگ)
                docAny.setFont('NotoSans', 'bold');
                docAny.setFontSize(14);
                docAny.text(title, pageWidth / 2, 15, { align: 'center' });

                docAny.setFontSize(10);
                docAny.setFont('NotoSans', 'bold');
                docAny.text(`Rapor Tarih:`, 15, 25);
                docAny.setFont('NotoSans', 'normal');
                docAny.text(`${formatDateDisplay(new Date().toISOString())}`, 35, 25);

                // ⬅️ افزودن آرم به گوشه بالا سمت راست 
                // فرض می‌شود متغیر 'Logo' یک رشته base64 یا آدرس معتبر برای jsPDF است.
                docAny.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

                // Footer (پانویس)
                docAny.setFont('NotoSans', 'normal');
                docAny.setFontSize(8);
                docAny.setTextColor(0);
                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                    'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
                ];
                let footerY = pageHeight - 30;
                companyInfo.forEach(line => {
                    docAny.text(line, pageWidth / 2, footerY, { align: 'center' });
                    footerY += 4;
                });

                // شماره صفحه و امضا
                const pageNumber = data.pageNumber;
                const pageCount = docAny.internal.getNumberOfPages();
                docAny.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
                docAny.setFont('NotoSans', 'normal');
                docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            },
            startY: 50,
            showHead: 'everyPage',
            margin: { top: 40, bottom: 45, left: 10, right: 10 }
        });

        const fileName = isFiltered ? `Filtrelenmis_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf` : `Tum_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        setLoadingData(false);
    };

    const exportToExcel = async (rows: PersonnelWorkPlace[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('Dışa aktarılacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheetName = isFiltered ? 'Filtrelenmiş Görevlendirmeler' : 'Tüm Görevlendirmeler';
            const worksheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });

            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
            const headerFont = { ...font, bold: true };
            const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            const fullHeaderStyle = {
                border: border,
                alignment: centerAlignment,
                font: headerFont,
                fill: headerFill
            } as Partial<Excel.Style>;

            const bodyStyle = {
                border: border,
                alignment: leftAlignment,
                font: font
            } as Partial<Excel.Style>;

            // 1. افزودن اطلاعات شرکت (پانویس/سربرگ در اکسل)
            const addCompanyInfo = (ws: Excel.Worksheet) => {
                ws.addRow([]);
                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                    'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
                ];
                companyInfo.forEach(line => {
                    ws.addRow([line]);
                    const lastRow = ws.lastRow;
                    if (lastRow) {
                        lastRow.getCell(1).alignment = { horizontal: 'center' };
                        lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                        ws.mergeCells(`A${lastRow.number}:H${lastRow.number}`); // Merge cells over 8 columns
                    }
                });
            };

            // 2. افزودن عنوان و تاریخ
            worksheet.addRow(['', '', '', '', '', '', '', '']); // Empty row for space
            const titleText = isFiltered ? 'Filtrelenmiş Personel Görevlendirmeleri Raporu' : 'Tüm Personel Görevlendirmeleri Raporu';
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) {
                dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
                dateRow.getCell(1).alignment = { horizontal: 'left' };
            }
            worksheet.addRow([]);

            // 3. افزودن هدر جدول
            const tableHeaders = ['Personel', 'Pozisyon', 'Rol', 'Yer Türü', 'Yer', 'Başlangıç', 'Bitiş', 'Açıklama'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            // 4. افزودن ردیف‌های داده
            rows.forEach(r => {
                const row = worksheet.addRow([
                    r.personnelName || '-',
                    r.position?.title || '-',
                    r.userRole?.title || '-',
                    r.placeKind === 'WAREHOUSE' ? 'Depo' : r.placeKind === 'WORKHOUSE' ? 'Şantiye' : r.placeKind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' : 'Filo',
                    r.placeName || '-',
                    formatDateDisplay(r.startDate),
                    formatDateDisplay(r.endDate),
                    r.description || '-'
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

            // 5. افزودن اطلاعات شرکت به پایین جدول
            addCompanyInfo(worksheet);

            // 6. تنظیم عرض ستون‌ها
            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                // @ts-ignore
                if (column.eachCell) {
                    // @ts-ignore
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 12), 50);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = isFiltered ? `Filtrelenmis_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx` : `Tum_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx`;
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
    const handleOpenRowDownloadModal = (row: PersonnelWorkPlace) => { setSelectedRowForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedRowForDownload(null); };

    const handleDownloadAll = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(assignments, false) : exportToExcel(assignments, false); handleCloseDownloadAllModal(); };
    const handleDownloadFiltered = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(filteredAssignments, true) : exportToExcel(filteredAssignments, true); handleCloseDownloadFilteredModal(); };
    const handleDownloadRow = (format: 'pdf' | 'excel') => { if (!selectedRowForDownload) return; const rows = [selectedRowForDownload]; format === 'pdf' ? exportToPdf(rows, false) : exportToExcel(rows, false); handleCloseRowDownloadModal(); };

    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } };
    const handleRequestSort = (property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); };
    const handleClearDateFilters = () => { setStartFilter(null); setEndFilter(null); };

    // ------------------------------------
    // JSX Render
    // ------------------------------------
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                    <Typography variant="h5" mb={2}>{editingId ? 'Görevlendirmeyi Düzenle' : 'Yeni Görevlendirme'}</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni görevlendirme formunu aç" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>Yeni Görevlendirme Kaydet</BlinkingButton>
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
                            {/* Personnel */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Personel</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }} error={personnelError}>
                                    <InputLabel id="sel-personnel">Personel Seçin</InputLabel>
                                    <Select
                                        labelId="sel-personnel"
                                        label="Personel Seçin"
                                        value={personnelId}

                                        disabled={isUserRoleDisabled}
                                        onChange={(e) => { setPersonnelId(Number(e.target.value)); if (personnelError) setPersonnelError(false); }}>
                                        {personnels.map(p => <MuiMenuItem key={p.id} value={p.id}>{p.name} {p.family}</MuiMenuItem>)}
                                    </Select>
                                    {personnelError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur!</Typography>}
                                </FormControl>
                            </Grid>

                            {/* Position */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Pozisyon</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }} error={positionError}>
                                    <InputLabel id="sel-position">Pozisyon Seçin</InputLabel>
                                    <Select labelId="sel-position"
                                        label="Pozisyon Seçin"
                                        value={positionId}

                                        disabled={isUserRoleDisabled}
                                        onChange={(e) => { setPositionId(Number(e.target.value)); if (positionError) setPositionError(false); }}>
                                        {positionsList.map(pos => <MuiMenuItem key={pos.id} value={pos.id}>{pos.title}</MuiMenuItem>)}
                                    </Select>
                                    {positionError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur!</Typography>}
                                </FormControl>
                            </Grid>

                            {/* User (Kullanıcı) */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel>Kullanıcı</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }}>
                                    <InputLabel id="sel-user">Kullanıcı Seçin</InputLabel>
                                    <Select
                                        labelId="sel-user"
                                        label="Kullanıcı Seçin"
                                        value={userId || ''}
                                        onChange={(e) => {
                                            const selectedUserId = String(e.target.value);
                                            setUserId(selectedUserId);
                                            getUserRoles(selectedUserId);
                                            setUserRoleId(null); // Clear role on user change
                                        }}
                                        disabled={isUserRoleDisabled}
                                    >
                                        {usersList.map((user) => (
                                            <MuiMenuItem key={user.id} value={user.id}>{user.username}</MuiMenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* User Role (Kullanıcı Rolü) */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel>Kullanıcı Rolü</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }}>
                                    <InputLabel id="sel-userrole">Kullanıcı Rolü</InputLabel>
                                    <Select labelId="sel-userrole" label="Kullanıcı Rolü" value={userRoleId || ''}
                                        onChange={(e) => setUserRoleId(Number(e.target.value))}
                                        disabled={isUserRoleDisabled || userRolesList.length === 0}
                                    >
                                        {userRolesList.filter(role => role.recordStatus === 0).map((role) => (
                                            <MuiMenuItem key={role.id} value={role.id}>{role.role.name}</MuiMenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
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

                            {/* Dynamic Place Selectors */}
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

                            {placeKind === 'WORKHOUSE_STORE' && (
                                <>
                                    <Grid item xs={12} sm={4}>
                                        <CustomFormLabel required>Şantiye (İlişkili)</CustomFormLabel>
                                        <FormControl size="small" sx={{ width: '100%' }}>
                                            <InputLabel id="sel-workhouse-2">Şantiye Seçin</InputLabel>
                                            <Select labelId="sel-workhouse-2" label="Şantiye Seçin" value={selectedWorkhouseId} onChange={(e) => { const v = Number(e.target.value); setSelectedWorkhouseId(v); if (v) fetchStoresByWorkhouseId(v); setSelectedStoreId(''); }}>
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

                            {/* Dates */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Başlangıç Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker label="Başlangıç Tarihi"
                                        value={startDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(v) => { setStartDate(v); if (startError) setStartError(false); }} renderInput={(params) => <TextField {...params} size="small" fullWidth error={startError} helperText={startError ? 'Zorunlu alan' : ''} />} />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Bitiş Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker label="Bitiş Tarihi"
                                        value={endDate}
                                        inputFormat="dd/MM/yyyy"
                                        minDate={startDate || undefined}
                                        onChange={(v) => { setEndDate(v); if (endError) setEndError(false); }} renderInput={(params) => <TextField {...params} size="small" fullWidth error={endError} helperText={endError ? 'Zorunlu alan' : ''} />} />
                                </LocalizationProvider>
                            </Grid>

                            {/* Description */}
                            <Grid item xs={12}>
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <CustomTextField placeholder="Açıklama" fullWidth value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} inputRef={nameInputRef} />
                            </Grid>

                            {/* Form Actions */}
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {editingId !== null ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili görevlendirmeyi güncelle" : ""}>
                                                <Button variant="contained" color="info" onClick={editAssignment} disabled={loadingButton}>{loadingButton ? <><IconHelmet fontSize={20} /> Bekleniyor...</> : 'Düzenle'}</Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni kayıt moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni görevlendirme ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={insertAssignment} disabled={loadingButton}>{loadingButton ? <><IconHelmet fontSize={20} /> Bekleniyor...</> : 'Yeni Görevlendirme Ekle'}</Button>
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
                            <TextField label="Ara (Personel / Yer)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Başlangıç (Filtre)" value={startFilter}
                                        onChange={(v) => setStartFilter(v)}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                                    <DatePicker label="Bitiş (Filtre)" value={endFilter}
                                        inputFormat="dd/MM/yyyy"
                                        minDate={startFilter || undefined}
                                        onChange={(v) => setEndFilter(v)} renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Durum filtresi" fullWidth>
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
                        <Table aria-label="personnel work places table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'personnelName'} direction={orderBy === 'personnelName' ? order : 'asc'} onClick={() => handleRequestSort('personnelName')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Personel</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Pozisyon</Typography></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Rol</Typography></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Yer Türü</Typography></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'placeName'} direction={orderBy === 'placeName' ? order : 'asc'} onClick={() => handleRequestSort('placeName')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Yer</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'startDate'} direction={orderBy === 'startDate' ? order : 'asc'} onClick={() => handleRequestSort('startDate')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Başlangıç</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'endDate'} direction={orderBy === 'endDate' ? order : 'asc'} onClick={() => handleRequestSort('endDate')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Bitiş</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>{row.personnelName || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.position?.title || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.userRole ? row.userRole.title : '-'}</StyledTableCell>

                                            {/* ستون Yer Türü (Type) - استفاده از فیلد محاسبه شده placeKind */}
                                            <StyledTableCell>
                                                {row.placeKind === 'WAREHOUSE' ? 'Depo' :
                                                    row.placeKind === 'WORKHOUSE' ? 'Şantiye' :
                                                        row.placeKind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' :
                                                            row.placeKind === 'FILO' ? 'Filo' : '-'}
                                            </StyledTableCell>

                                            {/* ستون Yer - استفاده از فیلد محاسبه شده placeName */}
                                            <StyledTableCell>
                                                {row.placeName}
                                            </StyledTableCell>

                                            <StyledTableCell>{formatDateDisplay(row.startDate)}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.endDate)}</StyledTableCell>

                                            <StyledTableCell sx={{ maxWidth: 280 }}>
                                                <Typography variant="body1" noWrap title={row.description || ''}>{row.description || '-'}</Typography>
                                            </StyledTableCell>
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
                                                            <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Kaydı İndir</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={9} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kayıt bulunamadı.</Typography></StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredAssignments.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            {/* Download Modals remain the same */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Görevlendirmeleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAll('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAll('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Görevlendirmeleri İndir</DialogTitle>
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

            <DeletePersonnelWorkPlaces openModal={openDeleteModal} onClose={handleCloseDeleteModal} idToDelete={deleteId} nameToDelete={deleteName} onDeleteSuccess={() => fetchAssignments()} showAlert={showAlert} />
        </>
    );
};

export default ListPersonnelWorkPlaces;