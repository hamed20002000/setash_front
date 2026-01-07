import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, OutlinedInput, Checkbox, ListItemText,
    SelectChangeEvent, Dialog, DialogTitle, DialogContent, DialogActions,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel,
    Autocomplete, Chip, DialogContentText,
    Select
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch,
    IconHelmet, IconFileSpreadsheet, IconFileText, IconX, IconFileDownload, IconArrowRight
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


// ------------------------------------
// Helper Functions & Styled Components
// ------------------------------------
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString.length === 10 ? dateString : String(dateString));
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

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
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order; return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};

const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    "&.Mui-selected": { color: "white" },
    "&.Mui-selected[data-value='all']": { backgroundColor: theme.palette.primary.main, "&:hover": { backgroundColor: theme.palette.primary.dark } },
    "&.Mui-selected[data-value='active']": { backgroundColor: theme.palette.success.main, "&:hover": { backgroundColor: theme.palette.success.dark } },
    "&.Mui-selected[data-value='inactive']": { backgroundColor: theme.palette.error.main, "&:hover": { backgroundColor: theme.palette.error.dark } },
    "&:not(.Mui-selected)": { color: theme.palette.text.primary, borderColor: theme.palette.divider, "&:hover": { backgroundColor: theme.palette.action.hover } },
}));
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '1rem' },
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


// ------------------------------------
// Type Definitions
// ------------------------------------
interface PersonnelLite {
    id: number; // API provides string ID
    name: string;
    family: string;
    hasISG: boolean;
    recordStatus: number;
}
interface WorkhouseInfo {
    name: string;
    code?: string;
    tenderTitle?: string;
}
type SortableKeys = keyof Pick<PersonnelWorkPlace, 'startDate' | 'endDate' | 'createAt'> | 'personnelName';

interface PersonnelWorkPlace {
    id: number;
    personnel: { id: number; name: string; family: string };

    position?: { id: number; title: string } | null;
    userRole?: { id: number; title: string } | null;

    placeId: number;
    type: 1; // 💡 Hardcoded as 1 (WORKHOUSE)

    personnelName: string;
    startDate: string;
    endDate: string | null;
    description: string;
    recordStatus?: number;
    createAt?: string;
    placeKind: 'WORKHOUSE';
    placeName: string;
}
// ------------------------------------
// Main Component
// ------------------------------------
const ListPersonnelWorkPlacesByWorkhouse: React.FC = () => {
    // 💡 Reading workhouseId from URL
    const { workhouseId } = useParams<{ workhouseId: string }>();
    const navigate = useNavigate();
    const { allowedOperations } = useAuth();
    const { isTooltipGloballyEnabled } = useTooltip();
    const workhouseIdNum = useMemo(() => Number(workhouseId), [workhouseId]);

    // Permissions (unchanged)
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // const { menuItems, allowedOperations } = useAuth();
    // const findMenuByHref = (items: any[], path: string): any => {
    //     for (const item of items) {
    //         // اگر خود آیتم تطبیق داشت
    //         if (item.href === path) return item;

    //         // اگر آیتم فرزند داشت، داخل فرزندان جستجو کن
    //         if (item.children && item.children.length > 0) {
    //             const found = findMenuByHref(item.children, path);
    //             if (found) return found;
    //         }
    //     }
    //     return null;
    // };

    // // ۲. استفاده از تابع برای پیدا کردن منوی فعلی
    // const currentMenu = useMemo(() => {
    //     debugger
    //     return findMenuByHref(menuItems, location.pathname);
    // }, [menuItems, location.pathname]);

    // // ۳. استخراج ID عملیات‌ها (با اطمینان از وجود id)
    // const currentMenuOpIds = useMemo(() => {
    //     // اگر منو یا عملیات‌های آن وجود نداشت، آرایه خالی برگردان
    //     if (!currentMenu || !currentMenu.menuOperations) return [];

    //     return currentMenu.menuOperations.map((op: any) => {
    //         // با توجه به دیتای API شما، ID اصلی عملیات در این سطح است
    //         return String(op.id);
    //     });
    // }, [currentMenu]);

    // // ۴. تابع نهایی بررسی دسترسی
    // const hasPermission = (opName: string) => {
    //     return allowedOperations.some((op: any) =>
    //         op.systemOperationName === opName &&
    //         currentMenuOpIds.includes(String(op.menuOperationId))
    //     );
    // };

    // const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    // const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    // const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    // const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazدırmak"), [allowedOperations, currentMenuOpIds]);



    // ------------------------------------
    // States
    // ------------------------------------
    const [workhouseInfo, setWorkhouseInfo] = useState<WorkhouseInfo | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk'>('single');

    // 💡 Simplified form states (Only Personnel, Date, Description remain)
    const [personnelId, setPersonnelId] = useState<number | ''>('');
    const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<number[]>([]);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [description, setDescription] = useState<string>("");

    const [personnels, setPersonnels] = useState<PersonnelLite[]>([]);
    const [assignments, setAssignments] = useState<PersonnelWorkPlace[]>([]);

    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(true);
    const [isBlinking, setIsBlinking] = useState<boolean>(workhouseId === undefined);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Table & Filter States 
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableKeys>('startDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);

    // Menu/Modals 
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
    const [openEndCooperationModal, setOpenEndCooperationModal] = useState(false);
    const [rowForEndCooperation, setRowForEndCooperation] = useState<PersonnelWorkPlace | null>(null);
    const [endCooperationDate, setEndCooperationDate] = useState<Date | null>(null);
    const [endCoopError, setEndCoopError] = useState(false);
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    // ------------------------------------
    // Alert & Initialization Logic
    // ------------------------------------
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage, clearAlert]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);


    // ------------------------------------
    // API Calls (Modified)
    // ------------------------------------

    // NEW: Fetch Workhouse Details (To display header info and use for static Place Name)
    const fetchWorkhouseInfo = useCallback(async () => {
        if (!workhouseIdNum) return;
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-workhouse-by-id/${workhouseIdNum}`, {
                headers: { "Authorization": `Bearer ${authToken}` },
                params: requestParams
            });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setWorkhouseInfo({
                    name: response.data.data.name,
                    code: response.data.data.code || '-',
                    tenderTitle: response.data.data.work?.tender?.title || '-'
                });
            } else {
                showAlert('Şantiye bilgileri alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Şantiye bilgileri yüklenirken hata oluştu.', 'error');
        }
    }, [workhouseIdNum, navigate, showAlert]);

    // 💡 MODIFIED: Fetch personnel using the new API without active workplace
    const fetchPersonnels = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            // 🚀 NEW API: get-all-personnels-without-active-workplace
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels-without-active-workplace`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const data = res.data.data as any[];
                const mapped = data
                    .filter(p => p.recordStatus === 0 && p.hasISG == true) // Only Active (recordStatus=0)
                    .map(p => ({
                        id: Number(p.id),
                        name: p.name,
                        family: p.family,
                        hasISG: p.hasISG ?? false,
                        recordStatus: p.recordStatus
                    })) as PersonnelLite[];

                setPersonnels(mapped);
            } else { showAlert(res.data.message || 'Personel listesi alınamadı.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Personel listesi yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);


    // MODIFIED: Fetch assignments, filtered by workhouseId and set static place data
    const fetchAssignments = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken || !workhouseIdNum) { setLoadingData(false); return; }

        try {
            // Assuming API: get-all-personnels-work-places is used, then filtered by workhouseId
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels-work-places`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                debugger
                const filteredRows = (res.data.data as any[])
                    // 💡 Filter for type=1 (WORKHOUSE) and correct placeId
                    .filter(r => Number(r.type) === 1 && Number(r.placeId) === workhouseIdNum)
                    .map((r) => {
                        const kind = 'WORKHOUSE';
                        // 💡 Use fetched name for display
                        const placeName = workhouseInfo?.name || `Şantiye ID: ${workhouseIdNum}`;
                        const personnelName = `${r.personnel?.name ?? ''} ${r.personnel?.family ?? ''}`.trim();

                        return {
                            id: Number(r.id),
                            personnel: r.personnel ? { id: Number(r.personnel.id), name: r.personnel.name, family: r.personnel.family } : { id: Number(r.personnelId), name: '', family: '' },
                            position: r.position,
                            userRole: r.userRole,
                            placeId: workhouseIdNum,
                            type: 1 as 1,
                            placeKind: kind as 'WORKHOUSE',
                            placeName: placeName,
                            startDate: r.startDate,
                            endDate: r.endDate,
                            description: r.description,
                            recordStatus: r.recordStatus,
                            createAt: r.createAt,
                            personnelName: personnelName,
                        };
                    }) as PersonnelWorkPlace[];

                setAssignments(filteredRows);
            } else {
                showAlert(res.data.message || 'Görevlendirme kayıtları yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Görevlendirme kayıtları yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [workhouseIdNum, navigate, showAlert, workhouseInfo?.name]);


    useEffect(() => {
        if (workhouseIdNum) {
            fetchWorkhouseInfo();
            fetchPersonnels();
        }
    }, [workhouseIdNum, fetchWorkhouseInfo, fetchPersonnels]);

    useEffect(() => {
        if (workhouseInfo) {
            fetchAssignments();
        }
    }, [fetchAssignments, workhouseInfo]);

    // ------------------------------------
    // Form Logic
    // ------------------------------------
    const [personnelError, setPersonnelError] = useState(false);
    const [startError, setStartError] = useState(false);

    const validateForm = (): boolean => {
        let ok = true;
        const personnelSelection = assignmentMode === 'single' ? personnelId : selectedPersonnelIds.length;
        if (!personnelSelection || personnelSelection === 0) { setPersonnelError(true); ok = false; } else setPersonnelError(false);
        if (!startDate) { setStartError(true); ok = false; } else setStartError(false);

        if (!ok) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return ok;
    };

    const resetForm = () => {
        setEditingId(null);
        setPersonnelId('');
        setSelectedPersonnelIds([]);
        setStartDate(null);
        setDescription('');
        setAssignmentMode('single');
        setPersonnelError(false);
        setStartError(false);
        setIsFormVisible(false); // 💡 Hide form on successful save/reset
    };

    // MODIFIED: Simplified Payload Builder (Hardcoded Type and PlaceId)
    const buildPayload = (isBulk: boolean) => {
        const baseItem = {
            // 💡 Hardcoded Type 1 and PlaceId from URL
            type: 1,
            placeId: workhouseIdNum,

            positionId: 2,
            userRoleId: null,

            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: null,
            description: description?.trim() || ''
        };

        if (isBulk) {
            return selectedPersonnelIds.map(pId => ({
                ...baseItem,
                personnelId: pId,
            }));
        } else {
            return {
                ...baseItem,
                id: editingId ?? undefined,
                personnelId: Number(personnelId),
            };
        }
    };

    const insertSingleAssignment = async () => {
        if (!validateForm() || !workhouseIdNum) return;
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
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Görevlendirme eklenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    const insertBulkAssignment = async () => {
        if (!validateForm() || !workhouseIdNum) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            const payload = buildPayload(true);
            const res = await axios.post(`${server.baseurl}${server.hr}create-personnel-work-place-as-bulk`, payload, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });

            if (res.data.httpStatusCode === 201 || res.data.httpStatusCode === 200) {
                showAlert(`${selectedPersonnelIds.length} adet görevlendirme başarıyla eklendi!`, 'success');
                resetForm();
                fetchAssignments();
            } else { showAlert(res.data.message || 'Toplu görevlendirme eklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Toplu görevlendirme eklenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    // MODIFIED: Edit Assignment (Simplified Payload)
    const editAssignment = async () => {
        if (!validateForm() || !editingId || !workhouseIdNum) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }
        try {
            // Need to send required fields for PUT, even if unchanged
            const payload = {
                id: Number(editingId),
                personnelId: Number(personnelId),
                type: 1,
                placeId: workhouseIdNum,
                positionId: 2,
                userRoleId: null,
                startDate: startDate ? new Date(startDate).toISOString() : null,
                endDate: null,
                description: description?.trim() || ''
            }

            const res = await axios.put(`${server.baseurl}${server.hr}update-personnel-work-place`, payload, { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });
            if (res.data.httpStatusCode === 200) {
                showAlert('Görevlendirme başarıyla güncellendi!', 'success');
                resetForm();
                fetchAssignments();
            } else { showAlert(res.data.message || 'Görevlendirme güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Görevlendirme güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

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


    // MODIFIED: handleEditClick (Simplified logic)
    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        const r = selectedRowForMenu;

        setEditingId(r.id);
        setPersonnelId(r.personnel?.id ?? '');
        setSelectedPersonnelIds([]);
        setAssignmentMode('single');

        setStartDate(r.startDate ? new Date(r.startDate) : null);
        setDescription(r.description || '');

        setIsFormVisible(true);
        handleCloseMenu();
    };

    // MODIFIED: Submit End Cooperation (Ensures all fields are sent in PUT payload)
    const submitEndCooperation = async () => {
        if (!rowForEndCooperation || !endCooperationDate || !workhouseIdNum) {
            setEndCoopError(true);
            return;
        }
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');

        try {
            // Need to send the full required object for a PUT request
            const payload = {
                id: rowForEndCooperation.id,
                personnelId: rowForEndCooperation.personnel.id,
                type: 1,
                placeId: workhouseIdNum,
                positionId: 2,
                userRoleId: rowForEndCooperation.userRole?.id || null,
                startDate: rowForEndCooperation.startDate,
                endDate: new Date(endCooperationDate).toISOString(), // The key update
                description: rowForEndCooperation.description,
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
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'İş birliği sonlandırılamadı.', 'error');
        } finally {
            setLoadingButton(false);
            setEndCoopError(false);
        }
    };
    const getComparatorFinal = (order: 'asc' | 'desc', orderBy: SortableKeys) => {
        return order === 'desc'
            ? (a: any, b: any) => descendingComparator(a, b, orderBy as any)
            : (a: any, b: any) => -descendingComparator(a, b, orderBy as any);
    };

    const isFilterActive = useMemo(() => !!searchTerm.trim() || startFilter !== null || endFilter !== null || statusFilter !== 'all', [searchTerm, startFilter, endFilter, statusFilter]);

    const filteredAssignments = useMemo(() => {
        const list = assignments.filter(r => {
            const matchesSearch = r.personnelName.toLowerCase().includes(searchTerm.toLowerCase());

            const isActive = r.endDate === null || r.endDate === 'N/A';
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && isActive) ||
                (statusFilter === 'inactive' && !isActive);

            const sDate = r.startDate ? new Date(r.startDate) : null;
            const inRange = (!startFilter || (sDate && sDate >= startFilter)) && (!endFilter || (sDate && sDate <= endFilter));

            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparatorFinal(order, orderBy));
    }, [assignments, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredAssignments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredAssignments, page, rowsPerPage]);

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: PersonnelWorkPlace) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

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

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return; setDeleteId(selectedRowForMenu.id); setDeleteName(`${selectedRowForMenu.personnel?.name ?? ''} ${selectedRowForMenu.personnel?.family ?? ''}`.trim()); setOpenDeleteModal(true); handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchAssignments(); };


    // ------------------------------------
    // Export Functions (Unchanged structure, Simplified columns)
    // ------------------------------------
    const exportToPdf = async (rows: PersonnelWorkPlace[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');
        // @ts-ignore
        const doc = new jsPDF();
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); } catch (e) { console.warn('Font dosyaları yüklenemedi. Varsayılan font kullanılacak.'); }
        docAny.setFont('NotoSans', 'normal');

        // 💡 Simplified Columns
        const columns = ['Personel', 'Başlangıç', 'Bitiş', 'Açıklama'];
        const body = rows.map(r => [r.personnelName || '-', formatDateDisplay(r.startDate), formatDateDisplay(r.endDate), r.description || '-']);

        const title = isFiltered ? 'Filtrelenmiş Personel Görevlendirmeleri Raporu' : `Personel Görevlendirmeleri Raporu (${workhouseInfo?.name})`;

        autoTable(docAny, {
            head: [columns],
            body: body,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: 'NotoSans', fontStyle: 'normal', fontSize: 9 },
            didDrawPage: (_data: any) => {
                // Header (includes Workhouse info)
                docAny.setFont('NotoSans', 'normal');
                docAny.setFontSize(13);
                docAny.text(title, 100, 15, { align: 'center' });

                docAny.setFontSize(10);
                docAny.setFont('NotoSans', 'normal');
                docAny.text(`Şantiye:`, 15, 25);
                docAny.setFont('NotoSans', 'normal');
                docAny.text(workhouseInfo?.name || '-', 40, 25);
                doc.setFontSize(10);
                doc.setFont('NotoSans', 'bold');
                doc.text(`Rapor Tarihi:`, 15, 40);
                doc.setFont('NotoSans', 'normal');
                doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

                doc.addImage(Logo, 'PNG', pageWidth - 50, 18, 35, 18);

                doc.setLineWidth(0.5);
                doc.line(15, 45, pageWidth - 15, 45);

                // Footer
                docAny.setFont('NotoSans', 'normal');
                docAny.setFontSize(8);
                const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
                let footerY = pageHeight - 20;
                companyInfo.forEach(line => {
                    docAny.text(line, pageWidth / 2, footerY, { align: 'center' });
                    footerY += 4;
                });

                docAny.setTextColor(0);
                docAny.setFontSize(10);
                docAny.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
                docAny.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

                const pageNumber = (docAny as any).internal.getCurrentPageInfo().pageNumber;
                const pageCount = (docAny as any).internal.getNumberOfPages();
                docAny.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);


            },
            startY: 55,
            showHead: 'everyPage',
            margin: { top: 40, bottom: 45, left: 10, right: 10 }
        });

        const fileName = isFiltered ? `Filtrelenmis_Sant_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf` : `Sant_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        setLoadingData(false);
    };

    const exportToExcel = async (rows: PersonnelWorkPlace[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('Dışa aktarılacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheetName = isFiltered ? 'Filtrelenmiş' : 'Tüm Görevlendirmeler';
            const worksheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });

            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
            const fullHeaderStyle = { border: border, alignment: { vertical: 'middle', horizontal: 'center', wrapText: true }, font: { ...font, bold: true }, fill: headerFill } as Partial<Excel.Style>;
            const bodyStyle = { border: border, alignment: { vertical: 'middle', horizontal: 'left', wrapText: true }, font: font } as Partial<Excel.Style>;

            const addCompanyInfo = (ws: Excel.Worksheet, maxCol: number) => {
                ws.addRow([]);
                const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
                companyInfo.forEach(line => {
                    ws.addRow([line]);
                    const lastRow = ws.lastRow;
                    if (lastRow) {
                        lastRow.getCell(1).alignment = { horizontal: 'center' };
                        lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                        ws.mergeCells(`A${lastRow.number}:${String.fromCharCode(64 + maxCol)}${lastRow.number}`);
                    }
                });
            };

            // Title and Date
            worksheet.addRow(['']);
            const titleText = isFiltered ? 'Filtrelenmiş Şantiye Personel Görevlendirmeleri Raporu' : `Şantiye Personel Görevlendirmeleri Raporu (${workhouseInfo?.name})`;
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) { titleRow.font = { name: 'Times New Roman', size: 12, bold: true }; titleRow.getCell(1).alignment = { horizontal: 'center' }; }
            worksheet.mergeCells(`A${titleRow.number}:D${titleRow.number}`);

            worksheet.addRow([`Şantiye: ${workhouseInfo?.name || '-'} | Kod: ${workhouseInfo?.code || '-'}`]);
            worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells(`A${worksheet.lastRow!.number}:D${worksheet.lastRow!.number}`);
            worksheet.addRow([]);

            // Simplified Headers
            const tableHeaders = ['Personel', 'Başlangıç', 'Bitiş', 'Açıklama'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => { cell.style = fullHeaderStyle; });

            // Data Rows
            rows.forEach(r => {
                const row = worksheet.addRow([
                    r.personnelName || '-',
                    formatDateDisplay(r.startDate),
                    formatDateDisplay(r.endDate),
                    r.description || '-'
                ]);
                row.eachCell((cell) => { cell.style = bodyStyle; });
            });

            // Company Info at the end (using 4 columns max)
            addCompanyInfo(worksheet, 4);

            // Set Column Widths
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
            const fileName = isFiltered ? `Filtrelenmis_Sant_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx` : `Sant_Gorevlendirmeler_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        } finally {
            setLoadingData(false);
        }
    };


    // ------------------------------------
    // JSX Render
    // ------------------------------------
    return (
        <>
            {/* Header and Back Button */}
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>

                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        flexWrap="wrap"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        {workhouseIdNum ? (
                            <>
                                <Typography variant="h4" >{workhouseInfo?.name || `Şantiye ID: ${workhouseIdNum}`}</Typography>
                                {workhouseInfo?.code && <Chip label={`Kod: ${workhouseInfo.code}`} color="primary" variant="filled" size="small" />}
                            </>
                        ) : (
                            <Typography variant="h5">Personel Görevlendirmeleri (Hata: Şantiye ID Eksik)</Typography>
                        )}
                    </Stack>
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
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button variant="outlined" color="error" onClick={() => navigate(-1)} endIcon={<IconArrowRight size={20} />} fullWidth={false}>
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Stack>
                </Stack>
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2}>

                            {/* Toggle Single/Bulk Mode */}
                            <Grid item xs={12}>
                                <CustomFormLabel>Atama Modu</CustomFormLabel>
                                <ToggleButtonGroup
                                    value={assignmentMode} exclusive
                                    onChange={(_, v) => { if (v) { setAssignmentMode(v as 'single' | 'bulk'); setPersonnelId(''); setSelectedPersonnelIds([]); } }}
                                    sx={{ mb: 1, height: 40 }} disabled={editingId !== null}
                                >
                                    <MuiToggleButton value="single">Tek Tek Ekleme</MuiToggleButton>
                                    <MuiToggleButton value="bulk">Toplu Ekleme</MuiToggleButton>
                                </ToggleButtonGroup>
                            </Grid>

                            {/* Personnel (Single/Multi-Select) */}
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel required>Personel {assignmentMode === 'bulk' && <>(Çoklu Seçim)</>}</CustomFormLabel>
                                <Box sx={{ width: '100%' }} color={personnelError ? 'error.main' : 'text.primary'}>
                                    {assignmentMode === 'single' ? (
                                        <Autocomplete
                                            options={personnels}
                                            size="small"
                                            getOptionLabel={(option) => `${option.name} ${option.family} ${option.hasISG ? '(İSG Var)' : '(İSG Yok)'}`}
                                            value={personnels.find(p => p.id === personnelId) || null}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                            onChange={(_, newValue) => {
                                                const newId = newValue ? newValue.id : '';
                                                setPersonnelId(Number(newId));
                                                if (personnelError) setPersonnelError(false);
                                            }}
                                            disabled={editingId !== null}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Personel Seçin" error={personnelError} helperText={personnelError ? 'Zorunlu alan!' : ''} />
                                            )}
                                        />
                                    ) : (
                                        <Select
                                            labelId="sel-personnel"
                                            id="select-personnel-bulk"
                                            multiple
                                            fullWidth={true}
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
                                            {personnels.map((p) => {
                                                const isgStatus = p.hasISG ? '(İSG Var)' : '(İSG Yok)';
                                                return (
                                                    <MuiMenuItem key={p.id} value={p.id}>
                                                        <Checkbox checked={selectedPersonnelIds.indexOf(p.id) > -1} />

                                                        <ListItemText primary={`${p.name} ${p.family} ${isgStatus}`} />
                                                    </MuiMenuItem>
                                                );
                                            })}
                                        </Select>
                                    )}
                                </Box>

                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel required>Başlangıç Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker label="Başlangıç Tarihi"
                                        value={startDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(v) => { setStartDate(v); if (startError) setStartError(false); }} renderInput={(params) => <TextField {...params} size="small" fullWidth error={startError} helperText={startError ? 'Zorunlu alan' : ''} />} />
                                </LocalizationProvider>
                            </Grid>

                            {/* Description */}
                            <Grid item xs={12} sm={12}>
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <CustomTextField placeholder="Açıklama" fullWidth multiline rows={4}
                                    value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
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
                {/* Alert and Download Buttons */}
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

                {/* Filters */}
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Personel Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Başlangıç (Filtre)" value={startFilter} onChange={(v) => setStartFilter(v)} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                                    <DatePicker label="Bitiş (Filtre)" value={endFilter} inputFormat="dd/MM/yyyy" minDate={startFilter || undefined} onChange={(v) => setEndFilter(v)} renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
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

                {/* Table */}
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
                                    {/* 💡 Simplified Columns */}
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'personnelName'} direction={orderBy === 'personnelName' ? order : 'asc'} onClick={() => handleRequestSort('personnelName')} sx={{ color: 'inherit' }}><Typography variant="h6">Personel</Typography></TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'startDate'} direction={orderBy === 'startDate' ? order : 'asc'} onClick={() => handleRequestSort('startDate')} sx={{ color: 'inherit' }}><Typography variant="h6">Başlangıç</Typography></TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'endDate'} direction={orderBy === 'endDate' ? order : 'asc'} onClick={() => handleRequestSort('endDate')} sx={{ color: 'inherit' }}><Typography variant="h6">Bitiş</Typography></TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => {
                                        return (
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
                                                <StyledTableCell>{formatDateDisplay(row.startDate)}</StyledTableCell>
                                                <StyledTableCell>{row.endDate ? formatDateDisplay(row.endDate) : '-'}</StyledTableCell>
                                                <StyledTableCell>
                                                    {row.description && row.description.trim().length > 0 ? (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                            <Button

                                                                variant="outlined"
                                                                style={{ fontSize: "10px", padding: "2px 5px" }}
                                                                onClick={() => handleOpenDescriptionModal(row.description)}
                                                            >
                                                                Açıklamayı Oku
                                                            </Button>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <Typography variant="body2" align="center">-</Typography>
                                                    )}
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                        <IconButton onClick={(e) => handleClickMenu(e, row)} ><IconDots width={18} /></IconButton>
                                                    </CustomTooltip>
                                                    <Menu anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                        {hasEditPermission && selectedRowForMenu && ( // 💡 Restrict actions if closed
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
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Bu şantiyeye ait hiç görevlendirme bulunamadı.</Typography></StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredAssignments.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            {/* NEW: İş Birliğini Sonlandır Modal */}
            <Dialog open={openEndCooperationModal} onClose={() => setOpenEndCooperationModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>İş Birliğini Sonlandır</DialogTitle>
                <DialogContent>
                    {rowForEndCooperation && (
                        <Stack spacing={2}>
                            <Typography>Personel: **{rowForEndCooperation.personnelName}**</Typography>
                            <Typography>Şantiye: **{workhouseInfo?.name || '-'}**</Typography>
                            <Typography>Başlangıç Tarihi: {formatDateDisplay(rowForEndCooperation.startDate)}</Typography>

                            <CustomFormLabel required>Bitiş Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Bitiş Tarihi Seçin"
                                    value={endCooperationDate}
                                    inputFormat="dd/MM/yyyy"
                                    minDate={new Date(rowForEndCooperation.startDate)}
                                    onChange={(v) => { setEndCooperationDate(v); setEndCoopError(false); }}
                                    renderInput={(params) =>
                                        <TextField {...params} size="small" fullWidth error={endCoopError} helperText={endCoopError ? 'Bitiş tarihi zorunludur' : ''} />
                                    }
                                />
                            </LocalizationProvider>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEndCooperationModal(false)} color="secondary">İptal</Button>
                    <Button onClick={submitEndCooperation} color="error" disabled={loadingButton || !endCooperationDate}>Sonlandır</Button>
                </DialogActions>
            </Dialog>

            {/* Download Modals */}
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


            {/* Description Modal */}
            <Dialog open={openDescriptionModal} onClose={handleCloseDescriptionModal} maxWidth="md" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <DeletePersonnelWorkPlaces openModal={openDeleteModal} onClose={handleCloseDeleteModal} idToDelete={deleteId} nameToDelete={deleteName} onDeleteSuccess={() => fetchAssignments()} showAlert={showAlert} />
        </>
    );
};

export default ListPersonnelWorkPlacesByWorkhouse;