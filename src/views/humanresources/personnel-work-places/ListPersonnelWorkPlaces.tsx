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
    Dialog, DialogTitle, DialogContent, DialogActions, Chip,
    OutlinedInput,
    Checkbox,
    ListItemText,
    SelectChangeEvent,
    DialogContentText,
    Autocomplete
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
import autoTable from 'jspdf-autotable';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        // برای حل مشکل فرمت ISO در برخی تاریخ‌ها
        const date = new Date(dateString.length === 10 ? dateString : String(dateString));
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

// ... (Styled Components remain the same)
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

// نوع‌های داده‌ای اصلی (با تغییرات)
interface PersonnelLite {
    id: number;
    name: string;
    family: string;
    hasISG?: boolean; // NEW: برای فیلتر
}
interface PositionType { id: number; title: string; recordStatus?: number; createAt?: string }
interface WarehouseType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string }
interface WorkhouseType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string }
interface CarWarehouseType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string }
interface StoreType { id: number; name: string; code?: string; address?: string; recordStatus?: number; createAt?: string; workhouse?: { id: number; name: string } }
type PlaceKind = 'WAREHOUSE' | 'WORKHOUSE' | 'WORKHOUSE_STORE' | 'FILO';

type SortableKeys = keyof Pick<PersonnelWorkPlace, 'startDate' | 'endDate' | 'createAt'> | 'personnelName' | 'placeName';

interface PersonnelWorkPlace {
    id: number;
    personnel: { id: number; name: string; family: string };
    position?: { id: number; title: string } | null;
    userRole?: { id: number; title: string } | null;

    placeId: number;
    type: 0 | 1 | 2 | 3;

    startDate: string;
    endDate: string | null; // می‌تواند null باشد
    description: string;
    recordStatus?: number;
    createAt?: string;

    placeKind: PlaceKind;
    placeName: string;
    personnelName: string;
}

interface RoleLite { id: string; role: { id: number; name: string; }; recordStatus: number; }
interface UserType {
    id: string; username: string; email: string; status: string; recordStatus: number; imageUrl: string;
    userRoles: RoleLite[]; // اضافه شده برای رفع خطا
}


// توابع کمکی مرتب‌سازی (unchanged)
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

    // ... (Permission Checks)
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const { isTooltipGloballyEnabled } = useTooltip();

    // ------------------------------------
    // States Form (UPDATED for Single/Bulk & No End Date)
    // ------------------------------------
    const [editingId, setEditingId] = useState<number | null>(null);
    const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk'>('single'); // NEW
    const [personnelId, setPersonnelId] = useState<number | ''>('');
    const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<number[]>([]); // NEW

    const [positionId, setPositionId] = useState<number | ''>('');
    const [userId, setUserId] = useState<string | null>(null);
    const [userRoleId, setUserRoleId] = useState<number | null>(null);
    const [placeKind, setPlaceKind] = useState<PlaceKind>('WAREHOUSE');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | ''>('');
    const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
    const [selectedCarWarehouseId, setSelectedCarWarehouseId] = useState<number | ''>('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    // const [endDate, setEndDate] = useState<Date | null>(null); // REMOVED FROM FORM STATE
    const [description, setDescription] = useState<string>("");

    const [personnels, setPersonnels] = useState<PersonnelLite[]>([]);
    const [positionsList, setPositionsList] = useState<PositionType[]>([]);
    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [carWarehousesList, setCarWarehousesList] = useState<CarWarehouseType[]>([]);
    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [usersList, setUsersList] = useState<UserType[]>([]);
    const [userRolesList, setUserRolesList] = useState<any[]>([]);

    const [storeNames, setStoreNames] = useState<Map<number, string>>(new Map());

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
    // States Menu/Modals (UPDATED for End Cooperation)
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

    // NEW: End Cooperation Modal States
    const [openEndCooperationModal, setOpenEndCooperationModal] = useState(false);
    const [rowForEndCooperation, setRowForEndCooperation] = useState<PersonnelWorkPlace | null>(null);
    const [endCooperationDate, setEndCooperationDate] = useState<Date | null>(null);
    const [endCoopError, setEndCoopError] = useState(false);



    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const nameInputRef = useRef<HTMLInputElement>(null);

    // ------------------------------------
    // Alert & Initialization Logic (unchanged)
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
    // Data Fetching Functions (UPDATED for ISG Filter & Dependency Fix)
    // ------------------------------------
    const fetchPersonnels = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            // API جدید پرسنل که hasISG را برمی‌گرداند
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const data = res.data.data as any[];

                // CRITICAL: فیلتر کردن پرسنلی که hasISG = true دارند
                const filteredAndMapped = data
                    .filter(p => p.hasISG === true && (!p.workEndDate || p.workEndDate === null)) // <-- شرط workEndDate اضافه شد
                    .map(p => ({
                        id: Number(p.id),
                        name: p.name,
                        family: p.family,
                        hasISG: p.hasISG
                    })) as PersonnelLite[];

                setPersonnels(filteredAndMapped);
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

    const fetchCarWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            // API: get-car-warehouses
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-car-warehouses`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const all = response.data.data as any[];
                const mapped = all
                    .filter((item: any) => item.recordStatus === 0) // فقط رکوردهای فعال (Aktif)
                    .map((item: any) => ({
                        id: Number(item.id),
                        name: item.name,
                        code: item.code,
                    })) as CarWarehouseType[];
                setCarWarehousesList(mapped);
            } else { showAlert(response.data.message || 'Filo listesi alınamadı.', 'error'); }
        } catch (e) { showAlert('Filo listesi çekilirken bir hata oluştu.', 'error'); }
    }, [navigate]);

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

    // const getUserRoles = (userId: string) => {
    //     const authToken = localStorage.getItem('authToken');
    //     axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${userId}`, {
    //         headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    //     }).then((result) => {
    //         if (result.data.httpStatusCode === 200) {
    //             debugger
    //             const userRoles = result.data.data.userRoles.filter((role: Role) => role.recordStatus === 0);
    //             setUserRolesList(userRoles);
    //         } else {
    //             showAlert(result.data.message || 'Kullanıcı rol listesi alınırken bir hata oluştu.', 'error');
    //         }
    //     }).catch((_e) => {
    //         showAlert('Kullanıcı rol listesi alınırken bir hata oluştu.', 'error');
    //     });
    // };


    // ListPersonnelWorkPlaces.tsx - حدود خط 344
    const getUserRoles = (userId: string) => {
        const authToken = localStorage.getItem('authToken');
        axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${userId}`, {
            headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                // debugger // <-- حذف شد
                const userRoles = result.data.data.userRoles
                    // 1. فیلتر کردن وضعیت RecordStatus=0
                    .filter((role: RoleLite) => role.recordStatus === 0)
                // 2. Map کردن به ساختار دلخواه اگر نیاز باشد، در غیر این صورت مستقیماً استفاده می‌کنیم

                setUserRolesList(userRoles); // userRolesList اکنون RoleLite[] است
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




    // MODIFIED: Logic to fetch all assignments and compute placeName (Dependency fix)
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
                        userRole: r.userRole ? { id: Number(r.userRole.id), title: r.userRole.role?.name } : null,
                        placeId: Number(r.placeId),
                        type: typeNum as 0 | 1 | 2 | 3,
                        placeKind: kind,
                        startDate: r.startDate,
                        endDate: r.endDate,
                        description: r.description,
                        recordStatus: r.recordStatus,
                        createAt: r.createAt,
                        placeName: '',
                        personnelName: `${r.personnel?.name ?? ''} ${r.personnel?.family ?? ''}`.trim(),
                    };
                }) as PersonnelWorkPlace[];

                // 2. Optimized Fetching/Caching for Store Names (Workhouse Stores)
                // Collect unique Store IDs that need resolving
                const storeIdsToFetch = Array.from(new Set(rawRows
                    .filter(row => row.type === 2 && !storeNames.has(row.placeId))
                    .map(row => row.placeId)
                ));

                const promises = storeIdsToFetch.map(id => fetchStoreNameById(id));
                const fetchedNames = await Promise.all(promises);

                const updatedStoreNames = new Map(storeNames);
                storeIdsToFetch.forEach((id, index) => {
                    updatedStoreNames.set(id, fetchedNames[index]);
                });
                setStoreNames(updatedStoreNames);

                // 3. Compute final placeName for all rows
                const finalRows = rawRows.map(row => {
                    let name = '-';
                    // NOTE: This logic relies on global lists (warehousesList, workhousesList, carWarehousesList)
                    // being fetched BEFORE fetchAssignments is run.
                    if (row.type === 0) {
                        name = warehousesList.find(w => w.id === row.placeId)?.name || '-';
                    } else if (row.type === 1) {
                        name = workhousesList.find(w => w.id === row.placeId)?.name || '-';
                    } else if (row.type === 2) {
                        name = updatedStoreNames.get(row.placeId) || '-';
                    } else if (row.type === 3) {
                        name = carWarehousesList.find(w => w.id === row.placeId)?.name || '-';
                    }

                    return { ...row, placeName: name };
                });

                setAssignments(finalRows);
            } else {
                showAlert(res.data.message || 'Kayıtlar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            showAlert('Kayıtlar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, warehousesList, workhousesList, carWarehousesList]);



    useEffect(() => {
        // بارگذاری اولیه لیست‌های مرجع (فقط یک بار)
        fetchPersonnels();
        getListPositions();
        fetchWarehouses();
        fetchWorkhouses();
        fetchCarWarehouses(); // اگر API Filo دارید، اینجا فراخوانی کنید
        getListUsers();

    }, []);
    // CRITICAL FIX: Load all data first, then fetch assignments relying on the data.
    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments, warehousesList, workhousesList, carWarehousesList]);

    // ------------------------------------
    // Form Logic (UPDATED)
    // ------------------------------------
    useEffect(() => {
        // ... (PlaceKind dependency logic - unchanged)
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
    // const [endError, setEndError] = useState(false); // REMOVED

    const validateForm = (): boolean => {
        let ok = true;

        // NEW: اعتبارسنجی پرسنل بر اساس حالت Single/Bulk
        const personnelSelection = assignmentMode === 'single' ? personnelId : selectedPersonnelIds.length;
        if (!personnelSelection || personnelSelection === 0) {
            setPersonnelError(true); ok = false;
        } else setPersonnelError(false);

        if (!positionId) { setPositionError(true); ok = false; } else setPositionError(false);

        const computedPlaceId = placeKind === 'WAREHOUSE' ? selectedWarehouseId :
            placeKind === 'WORKHOUSE' ? selectedWorkhouseId :
                placeKind === 'WORKHOUSE_STORE' ? selectedStoreId : selectedCarWarehouseId;
        if (!computedPlaceId) { setPlaceError(true); ok = false; } else setPlaceError(false);

        if (!startDate) { setStartError(true); ok = false; } else setStartError(false);
        // if (!endDate) { setEndError(true); ok = false; } else setEndError(false); // REMOVED

        if (!ok) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return ok;
    };

    const resetForm = () => {
        setEditingId(null);
        setPersonnelId('');
        setSelectedPersonnelIds([]); // NEW: Reset bulk select
        // setEndDate(null); // REMOVED
        setStartDate(null);
        setAssignmentMode('single'); // NEW: Reset mode
        // ... (Other resets remain the same)
        setPositionId('');
        setUserId(null);
        setUserRoleId(null);
        setPlaceKind('WAREHOUSE');
        setSelectedWarehouseId('');
        setSelectedWorkhouseId('');
        setSelectedStoreId('');
        setSelectedCarWarehouseId('');
        setDescription('');
        setPersonnelError(false); setPositionError(false); setPlaceError(false); setStartError(false); // setEndError(false) REMOVED
        setIsFormVisible(false);
        setIsUserRoleDisabled(false);
    };

    // NEW/MODIFIED: Builds payload for Single (edit/insert) or Bulk
    const buildPayload = (isBulk: boolean) => {
        const placeIdToSend = placeKind === 'WAREHOUSE' ? selectedWarehouseId :
            placeKind === 'WORKHOUSE' ? selectedWorkhouseId :
                placeKind === 'WORKHOUSE_STORE' ? selectedStoreId : selectedCarWarehouseId;

        const typeToSend = placeKind === 'WAREHOUSE' ? 0 :
            placeKind === 'WORKHOUSE' ? 1 :
                placeKind === 'WORKHOUSE_STORE' ? 2 : 3;

        const baseItem = {
            positionId: Number(positionId),
            userRoleId: isBulk ? null : (userRoleId ?? 0),
            placeId: Number(placeIdToSend),
            type: typeToSend,
            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: null, // CRITICAL: Always null for registration/default
            description: description?.trim() || ''
        };

        if (isBulk) {
            // حالت گروهی: آرایه از اشیاء
            return selectedPersonnelIds.map(pId => ({
                ...baseItem,
                personnelId: pId,
            }));
        } else {
            // حالت تکی (برای ویرایش یا ثبت تکی)
            return {
                ...baseItem,
                id: editingId ?? undefined,
                personnelId: Number(personnelId),
            };
        }
    };


    const insertSingleAssignment = async () => {
        debugger
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            const payload = buildPayload(false);
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

    // NEW: Bulk Insert
    const insertBulkAssignment = async () => {
        debugger
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            const payload = buildPayload(true); // isBulk = true
            const res = await axios.post(`${server.baseurl}${server.hr}create-personnel-work-place-as-bulk`, payload, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });

            if (res.data.httpStatusCode === 201 || res.data.httpStatusCode === 200) {
                showAlert(`${selectedPersonnelIds.length} adet görevlendirme başarıyla eklendi!`, 'success');
                resetForm();
                fetchAssignments();
            } else { showAlert(res.data.message || 'Toplu görevlendirme eklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'Toplu görevlendirme eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    const editAssignment = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }
        try {
            const payload = buildPayload(false);
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

    // NEW: Submit handler for form (directs to single or bulk)
    const handleSubmitForm = () => {
        if (editingId) {
            editAssignment();
        } else {
            if (assignmentMode === 'single') {
                insertSingleAssignment();
            } else {
                insertBulkAssignment();
            }
        }
    };


    // (MODIFIED) handleEditClick to set placeId, type, and userId correctly
    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        const r = selectedRowForMenu;

        setEditingId(r.id);
        setPersonnelId(r.personnel?.id ?? '');
        setSelectedPersonnelIds([]); // Clear bulk selection
        setAssignmentMode('single'); // Always switch to single mode when editing

        setPositionId(r.position?.id ?? '');
        // setUserRoleId(r.userRole?.id ?? null);
        setUserRoleId(Number(r.userRole?.id) ?? null);

        // Find the User ID associated with the User Role ID in the list
        const relatedUser = usersList.find(u => u.userRoles && u.userRoles.some(role => Number(role.role.id) === r.userRole?.id));
        if (relatedUser) {
            setUserId(relatedUser.id);
            getUserRoles(relatedUser.id);
        } else {
            setUserId(null);
            setUserRolesList([]);
        }

        setPlaceKind(r.placeKind);

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

            const store = storesList.find(s => s.id === r.placeId);
            const workhouseId = store?.workhouse?.id ?? '';
            setSelectedWorkhouseId(workhouseId);

            if (workhouseId && typeof workhouseId === 'number') {
                fetchStoresByWorkhouseId(workhouseId);
            }
        } else if (r.type === 3) { // FILO
            setSelectedCarWarehouseId(r.placeId);
            setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId('');
        }

        setStartDate(r.startDate ? new Date(r.startDate) : null);
        // setEndDate(r.endDate ? new Date(r.endDate) : null); // REMOVED
        setDescription(r.description || '');

        setIsFormVisible(true);
        setIsUserRoleDisabled(true);

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);

        handleCloseMenu();
    };

    // NEW: Submit End Cooperation (Menu Action)
    const submitEndCooperation = async () => {
        if (!rowForEndCooperation || !endCooperationDate) {
            setEndCoopError(true);
            return;
        }
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');

        try {
            const payload = {
                id: rowForEndCooperation.id,
                endDate: new Date(endCooperationDate).toISOString(),
            };

            const res = await axios.put(`${server.baseurl}${server.hr}update-personnel-work-place`, payload, { headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            if (res.data.httpStatusCode === 200) {
                showAlert('İş birliği başarıyla sonlandırıldı!', 'success');
                setOpenEndCooperationModal(false);
                fetchAssignments();
            } else {
                showAlert(res.data.message || 'İş birliği sonlandırılamadı.', 'error');
            }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'İş birliği sonlandırılırken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
            setEndCoopError(false);
        }
    };

    // ... (Table & Filter logic remains the same)
    const isFilterActive = useMemo(() => !!searchTerm.trim() || startFilter !== null || endFilter !== null || statusFilter !== 'all', [searchTerm, startFilter, endFilter, statusFilter]);
    const filteredAssignments = useMemo(() => {
        const list = assignments.filter(r => {
            const matchesSearch = r.personnelName.toLowerCase().includes(searchTerm.toLowerCase()) || r.placeName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);
            const sDate = r.startDate ? new Date(r.startDate) : null;
            const inRange = (!startFilter || (sDate && sDate >= startFilter)) && (!endFilter || (sDate && sDate <= endFilter));
            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [assignments, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredAssignments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredAssignments, page, rowsPerPage]);

    // Menu Handlers remain the same
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


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

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

                            {/* NEW: Toggle Single/Bulk Mode */}
                            <Grid item xs={12}>
                                <CustomFormLabel>Atama Modu</CustomFormLabel>
                                <ToggleButtonGroup
                                    value={assignmentMode}
                                    exclusive
                                    onChange={(_, v) => {
                                        if (v) {
                                            setAssignmentMode(v as 'single' | 'bulk');
                                            // Reset selections on mode change
                                            setPersonnelId('');
                                            setSelectedPersonnelIds([]);
                                        }
                                    }}
                                    sx={{ mb: 1, height: 40 }}
                                    disabled={editingId !== null} // Cannot change mode when editing
                                >
                                    <MuiToggleButton value="single">Tek Tek Ekleme</MuiToggleButton>
                                    <MuiToggleButton value="bulk">Toplu Ekleme</MuiToggleButton>
                                </ToggleButtonGroup>
                            </Grid>

                            {/* Personnel (Single/Multi-Select) */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Personel {assignmentMode === 'bulk' && <>(Çoklu Seçim)</>}</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }} error={personnelError}>
                                    <InputLabel id="sel-personnel">Personel Seçin</InputLabel>

                                    {assignmentMode === 'single' ? (
                                        <Autocomplete
                                            options={personnels}
                                            size="small"
                                            getOptionLabel={(option) => `${option.name} ${option.family}`}

                                            value={personnels.find(p => p.id === personnelId) || null}

                                            isOptionEqualToValue={(option, value) => option.id === value.id}

                                            onChange={(_, newValue) => {
                                                const newId = newValue ? newValue.id : '';
                                                setPersonnelId(newId);
                                                if (personnelError) setPersonnelError(false);
                                            }}

                                            disabled={isUserRoleDisabled || editingId !== null}

                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Personel Seçin"
                                                    error={personnelError}
                                                    helperText={personnelError ? 'Zorunlu alan!' : ''}
                                                />
                                            )}
                                        />
                                    ) : (
                                        <Select
                                            labelId="sel-personnel"
                                            id="select-personnel-bulk"
                                            multiple
                                            value={selectedPersonnelIds}
                                            onChange={(e: SelectChangeEvent<number[]>) => {
                                                setSelectedPersonnelIds(e.target.value as number[]);
                                                if (personnelError) setPersonnelError(false);
                                            }}

                                            input={<OutlinedInput id="select-multiple-chip" label="Personel Seçin" />}

                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((id) => {
                                                        const p = personnels.find(prsnl => prsnl.id === id);
                                                        return p ? (
                                                            <Chip
                                                                key={id}
                                                                label={`${p.name} ${p.family}`}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                        ) : null;
                                                    })}
                                                </Box>
                                            )}
                                        >
                                            {personnels.map((p) => (
                                                <MuiMenuItem key={p.id} value={p.id}>
                                                    <Checkbox checked={selectedPersonnelIds.indexOf(p.id) > -1} />
                                                    <ListItemText primary={`${p.name} ${p.family}`} />
                                                </MuiMenuItem>
                                            ))}
                                        </Select>

                                    )}
                                    {personnelError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur! (Sadece ISG=true olanlar listelenir)</Typography>}
                                </FormControl>
                            </Grid>
                            {/* Position - تبدیل به Autocomplete */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Pozisyon</CustomFormLabel>
                                <Autocomplete
                                    options={positionsList}
                                    size="small"
                                    // 💡 نحوه نمایش برچسب
                                    getOptionLabel={(option) => option.title}

                                    // 💡 یافتن مقدار فعلی بر اساس ID
                                    value={positionsList.find(pos => pos.id === positionId) || null}

                                    isOptionEqualToValue={(option, value) => option.id === value.id}

                                    onChange={(_, newValue) => {
                                        const newId = newValue ? newValue.id : '';
                                        setPositionId(newId); // فرض می‌کنیم setPositionId می‌تواند string/number را بپذیرد
                                        if (positionError) setPositionError(false);
                                    }}

                                    disabled={isUserRoleDisabled}

                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Pozisyon Seçin"
                                            error={positionError}
                                            helperText={positionError ? 'Bu alan zorunludur!' : ''}
                                        />
                                    )}
                                />
                            </Grid>
                            {/* User (Kullanıcı) - تبدیل به Autocomplete */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel>Kullanıcı</CustomFormLabel>
                                <Autocomplete
                                    options={usersList}
                                    size="small"
                                    getOptionLabel={(option) => option.username}

                                    // 💡 یافتن مقدار فعلی بر اساس ID (User ID معمولا string است)
                                    value={usersList.find(user => user.id === userId) || null}

                                    isOptionEqualToValue={(option, value) => option.id === value.id}

                                    onChange={(_, newValue) => {
                                        const selectedUser = newValue;
                                        const selectedUserId = selectedUser ? selectedUser.id : '';

                                        setUserId(selectedUserId); // ID کاربر (string)
                                        setUserRoleId(null); // ریست کردن نقش

                                        // 💡 فراخوانی API مرتبط فقط اگر کاربری انتخاب شده باشد
                                        if (selectedUserId) {
                                            getUserRoles(selectedUserId);
                                        }
                                    }}

                                    disabled={isUserRoleDisabled || assignmentMode === 'bulk'}

                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Kullanıcı Seçin"
                                        />
                                    )}
                                />
                            </Grid>

                            {/* User Role (Kullanıcı Rolü) - تبدیل به Autocomplete */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel>Kullanıcı Rolü</CustomFormLabel>
                                <Autocomplete
                                    // 💡 ابتدا آیتم‌های فعال را فیلتر کنید
                                    options={userRolesList.filter(role => role.recordStatus === 0)}
                                    size="small"
                                    // 💡 نمایش نام نقش (role.name)
                                    getOptionLabel={(option) => option.role.name}

                                    // 💡 یافتن مقدار فعلی بر اساس userRoleId (عدد)
                                    value={userRolesList.find(item => item.id === userRoleId) || null}

                                    isOptionEqualToValue={(option, value) => option.id === value.id}

                                    onChange={(_, newValue) => {
                                        const newRoleId = newValue ? newValue.id : null;
                                        setUserRoleId(newRoleId); // ذخیره ID نقش (عدد)
                                    }}

                                    disabled={assignmentMode === 'bulk' || userRolesList.length === 0}

                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Kullanıcı Rolü"
                                        />
                                    )}
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

                            {/* Dynamic Place Selectors (Same logic as before) */}
                            {placeKind === 'WAREHOUSE' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Depo</CustomFormLabel>
                                    <Autocomplete
                                        options={warehousesList}
                                        size="small"
                                        // 💡 نمایش نام
                                        getOptionLabel={(option) => option.name}
                                        // 💡 مقدار فعلی
                                        value={warehousesList.find(w => w.id === selectedWarehouseId) || null}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}

                                        onChange={(_, newValue) => {
                                            const newId = newValue ? newValue.id : '';
                                            setSelectedWarehouseId(newId);
                                            if (placeError) setPlaceError(false);
                                        }}

                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Depo Seçin"
                                                error={placeError}
                                                helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}
                            {placeKind === 'WORKHOUSE' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Şantiye</CustomFormLabel>
                                    <Autocomplete
                                        options={workhousesList}
                                        size="small"
                                        getOptionLabel={(option) => option.name}
                                        value={workhousesList.find(w => w.id === selectedWorkhouseId) || null}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}

                                        onChange={(_, newValue) => {
                                            const newId = newValue ? newValue.id : '';
                                            setSelectedWorkhouseId(newId);
                                            if (placeError) setPlaceError(false);
                                        }}

                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Şantiye Seçin"
                                                error={placeError}
                                                helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}
                            {placeKind === 'WORKHOUSE_STORE' && (
                                <>
                                    <Grid item xs={12} sm={4}>
                                        <CustomFormLabel required>Şantiye (İlişkili)</CustomFormLabel>
                                        <Autocomplete
                                            options={workhousesList}
                                            size="small"
                                            getOptionLabel={(option) => option.name}
                                            value={workhousesList.find(w => w.id === selectedWorkhouseId) || null}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}

                                            onChange={(_, newValue) => {
                                                const newId = newValue ? newValue.id : '';
                                                setSelectedWorkhouseId(newId);
                                                setSelectedStoreId(''); // ریست کردن Deposu
                                                if (newId) fetchStoresByWorkhouseId(Number(newId)); // فراخوانی لیست جدید
                                            }}

                                            renderInput={(params) => (
                                                <TextField {...params} label="Şantiye Seçin" />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <CustomFormLabel required>Şantiyenin Deposu</CustomFormLabel>
                                        <Autocomplete
                                            options={storesList}
                                            size="small"
                                            getOptionLabel={(option) => option.name}
                                            value={storesList.find(s => s.id === selectedStoreId) || null}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}

                                            onChange={(_, newValue) => {
                                                const newId = newValue ? newValue.id : '';
                                                setSelectedStoreId(newId);
                                                if (placeError) setPlaceError(false);
                                            }}

                                            disabled={!selectedWorkhouseId || storesList.length === 0}

                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Depo Seçin"
                                                    error={placeError}
                                                    helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                                />
                                            )}
                                        />
                                        {selectedWorkhouseId && storesList.length === 0 && (
                                            <Typography variant="caption" sx={{ ml: 1.5, mt: 0.5 }} color="warning.main">Seçili şantiyeye ait depo bulunamadı.</Typography>
                                        )}
                                    </Grid>
                                </>
                            )}
                            {placeKind === 'FILO' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Filo Depo</CustomFormLabel>
                                    <Autocomplete
                                        options={carWarehousesList} // ⭐️ استفاده از لیست واکشی شده ⭐️
                                        size="small"
                                        getOptionLabel={(option) => `${option.name} (${option.code || '-'})`} // نمایش نام و کد
                                        value={carWarehousesList.find(w => w.id === selectedCarWarehouseId) || null}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}

                                        onChange={(_, newValue) => {
                                            const newId = newValue ? newValue.id : '';
                                            setSelectedCarWarehouseId(newId);
                                            if (placeError) setPlaceError(false);
                                        }}

                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Filo Depo Seçin"
                                                error={placeError}
                                                helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}

                            {/* Dates (EndDate REMOVED) */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Başlangıç Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker label="Başlangıç Tarihi"
                                        value={startDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(v) => { setStartDate(v); if (startError) setStartError(false); }} renderInput={(params) => <TextField {...params} size="small" fullWidth error={startError} helperText={startError ? 'Zorunlu alan' : ''} />} />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12}>
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <CustomTextField placeholder="Açıklama" fullWidth multiline rows={4}
                                    value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} inputRef={nameInputRef} />
                            </Grid>

                            {/* Form Actions */}
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {editingId !== null ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili görevlendirmeyi güncelle" : ""}>
                                                <Button variant="contained" color="info" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><IconHelmet fontSize={20} /> Bekleniyor...</> : 'Düzenle'}</Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni kayıt moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni görevlendirme ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><IconHelmet fontSize={20} /> Bekleniyor...</> : `Yeni ${assignmentMode === 'single' ? 'Görevlendirme' : 'Toplu Atama'} Ekle`}</Button>
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
                                        // <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableRow
                                            key={row.id}
                                            sx={{
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                ...(row.endDate && row.endDate !== "N/A"
                                                    ? { backgroundColor: '#ffa7a76e' } // رنگ Hex مستقیم + Opacity
                                                    : {}
                                                )
                                            }}
                                        >
                                            <StyledTableCell>{row.personnelName || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.position?.title || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.userRole ? row.userRole.title : '-'}</StyledTableCell>

                                            <StyledTableCell>
                                                {row.placeKind === 'WAREHOUSE' ? 'Depo' :
                                                    row.placeKind === 'WORKHOUSE' ? 'Şantiye' :
                                                        row.placeKind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' :
                                                            row.placeKind === 'FILO' ? 'Filo' : '-'}
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                {row.placeName}
                                            </StyledTableCell>

                                            <StyledTableCell>{formatDateDisplay(row.startDate)}</StyledTableCell>
                                            <StyledTableCell>{row.endDate == 'N/A' ? '-' : formatDateDisplay(row.endDate)}</StyledTableCell>

                                            <StyledTableCell sx={{ maxWidth: 280 }}>
                                                <Typography variant="body1" noWrap title={row.description || ''}>{row.description || '-'}</Typography>

                                                {row.description != null && row.description.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                            handleOpenDescriptionModal(row.description);
                                                        }}>
                                                            Devamını Oku
                                                        </Button>
                                                    </CustomTooltip>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton onClick={(e) => handleClickMenu(e, row)}><IconDots width={18} /></IconButton>
                                                </CustomTooltip>
                                                <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>


                                                    {hasEditPermission && selectedRowForMenu && (
                                                        <MuiMenuItem
                                                            onClick={() => {
                                                                setRowForEndCooperation(selectedRowForMenu);
                                                                setEndCooperationDate(null);
                                                                setOpenEndCooperationModal(true);
                                                                handleCloseMenu();
                                                            }}
                                                        >
                                                            <ListItemIcon><IconX width={18} /></ListItemIcon> Görev Sonlandırma
                                                        </MuiMenuItem>
                                                    )}
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

            {/* NEW: İş Birliğini Sonlandır Modal */}
            <Dialog open={openEndCooperationModal} onClose={() => setOpenEndCooperationModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>İş Birliğini Sonlandır</DialogTitle>
                <DialogContent>
                    {rowForEndCooperation && (
                        <Stack spacing={2}>
                            <Typography>Personel: {rowForEndCooperation.personnelName}</Typography>
                            <Typography>Pozisyon: {rowForEndCooperation.position?.title || '-'}</Typography>
                            <Typography>Başlangıç Tarihi: {formatDateDisplay(rowForEndCooperation.startDate)}</Typography>

                            <CustomFormLabel required>Bitiş Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Bitiş Tarihi Seçin"
                                    value={endCooperationDate}

                                    inputFormat="dd/MM/yyyy"
                                    minDate={new Date(rowForEndCooperation.startDate)}
                                    onChange={(v) => { setEndCooperationDate(v); setEndCoopError(false); }}
                                    renderInput={(params) =>
                                        <TextField {...params} size="small" fullWidth
                                            error={endCoopError}
                                            helperText={endCoopError ? 'Bitiş tarihi zorunludur' : ''}
                                        />
                                    }
                                />
                            </LocalizationProvider>
                            {/* <Alert severity="warning">Bu işlem, görevlendirmeyi sonlandıracaktır.</Alert> */}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEndCooperationModal(false)} color="secondary">İptal</Button>
                    <Button onClick={submitEndCooperation} color="error" disabled={loadingButton || !endCooperationDate}>Sonlandır</Button>
                </DialogActions>
            </Dialog>


            <Dialog
                open={openDescriptionModal}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>


            <DeletePersonnelWorkPlaces openModal={openDeleteModal} onClose={handleCloseDeleteModal} idToDelete={deleteId} nameToDelete={deleteName} onDeleteSuccess={() => fetchAssignments()} showAlert={showAlert} />
        </>
    );
};

export default ListPersonnelWorkPlaces;