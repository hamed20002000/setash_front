// ListProjectPlanning.tsx
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress,
} from '@mui/material';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX,
    IconPlus, IconEye,
    IconArrowRight
} from '@tabler/icons-react';
// import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
// import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteProjectPlanning from './DeleteProjectPlaning';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { useAuth } from 'src/context/AuthContext';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

// Styled Components (Unchanged)
const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));
const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && {
            backgroundColor: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
        }),
        ...(value === 'active' && selected && {
            backgroundColor: theme.palette.success.main,
            '&:hover': { backgroundColor: theme.palette.success.dark },
        }),
        ...(value === 'inactive' && selected && {
            backgroundColor: theme.palette.error.main,
            '&:hover': { backgroundColor: theme.palette.error.dark },
        }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

// Types & Interfaces
interface ProjectType {
    id: number;
    title: string;
    createAt: string;
    recordStatus: number;
    status: string;
    type: 0 | 1 | 2; // 0=AG, 1=OG, 2=Tesis-Ket
}

interface PlanningValue {
    estimatedNumber: number;
    min: number;
    max: number;
}

interface PlanningType {
    id: number;
    startDate: string;
    endDate: string;
    projectId: number;
    project: {
        id: number;
        title: string;
    };
    recordStatus: number;
    status: string;
    kaziYapilanDirekSayisi?: PlanningValue;
    altMontajiYapilanDirekSayisi?: PlanningValue;
    betonAtilanDirekSayisi?: PlanningValue;
    ustMontajiOrulenDirekSayisi?: PlanningValue;
    ustMontajiKurulanDirekSayisi?: PlanningValue;
    dikilenBetonDirekSayisi?: PlanningValue;
    iletkenCekilenDirekSayisi?: PlanningValue;
    ayiriciTakilanDirekSayisi?: PlanningValue;
    dikilenAydinlatmaDirekSayisi?: PlanningValue;
    kabloKanali?: PlanningValue;
    cekilenKabloMiktari?: PlanningValue;
    transformator?: PlanningValue;
    dagitimPanosu?: PlanningValue;
    sahaDagTMKutusu?: PlanningValue;
    betonKosk?: PlanningValue;
    hucre?: PlanningValue;
}

// **UPDATED**: PLANNING_FIELDS with color property
const ALL_PLANNING_FIELDS: {
    key: keyof Omit<PlanningType, 'id' | 'startDate' | 'endDate' | 'projectId' | 'project' | 'recordStatus' | 'status'>,
    label: string,
    color: 'yellow' | 'orange' | 'blue'
}[] = [
        { key: 'kaziYapilanDirekSayisi', label: 'Kazı Yapılan Direk Sayısı', color: 'yellow' },
        { key: 'altMontajiYapilanDirekSayisi', label: 'Alt Montajı Yapılan Direk Sayısı', color: 'orange' },
        { key: 'betonAtilanDirekSayisi', label: 'Beton Atılan Direk Sayısı', color: 'yellow' },
        { key: 'ustMontajiOrulenDirekSayisi', label: 'Üst Montajı Örülen Direk Sayısı', color: 'orange' },
        { key: 'ustMontajiKurulanDirekSayisi', label: 'Üst Montajı Kurulan Direk Sayısı', color: 'yellow' },
        { key: 'dikilenBetonDirekSayisi', label: 'Dikilen Beton Direk Sayısı', color: 'yellow' },
        { key: 'iletkenCekilenDirekSayisi', label: 'İletken Çekilen Direk Sayısı', color: 'yellow' },
        { key: 'ayiriciTakilanDirekSayisi', label: 'Ayırıcı Takılan Direk Sayısı', color: 'yellow' },
        { key: 'dikilenAydinlatmaDirekSayisi', label: 'Dikilen Aydınlatma Direk Sayısı', color: 'blue' },
        { key: 'kabloKanali', label: 'Kablo Kanalı', color: 'yellow' },
        { key: 'cekilenKabloMiktari', label: 'Çekilen Kablo Miktarı', color: 'yellow' },
        { key: 'transformator', label: 'Transformatör', color: 'blue' },
        { key: 'dagitimPanosu', label: 'Dağıtım Panosu', color: 'blue' },
        { key: 'sahaDagTMKutusu', label: 'Saha Dağ TM Kutusu', color: 'blue' },
        { key: 'betonKosk', label: 'Beton Köşk', color: 'blue' },
        { key: 'hucre', label: 'Hücre', color: 'blue' },
    ];

// Comparator functions (Unchanged)
const descendingComparator = <T, Key extends keyof T>(
    // ... (descendingComparator and getComparator definitions)
    a: T,
    b: T,
    orderBy: Key,
): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) {
        return valA === undefined || valA === null ? 0 : -1;
    }
    if (valA === undefined || valA === null) {
        return 1;
    }
    if (typeof valB === 'string' && typeof valA === 'string') {
        return valB.localeCompare(valA);
    }
    if (typeof valB === 'number' && typeof valA === 'number') {
        return valB - valA;
    }
    if (String(valB) < String(valA)) {
        return -1;
    }
    if (String(valB) > String(valA)) {
        return 1;
    }
    return 0;
};
const getComparator = <Key extends keyof PlanningType>(
    order: 'asc' | 'desc',
    orderBy: Key,
): (a: PlanningType, b: PlanningType) => number => {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
};
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};


// Main Component
const ListProjectPlanning = () => {
    const navigate = useNavigate();

    const { projectId } = useParams<{ projectId: string }>();
    const numericProjectId = useMemo(() => Number(projectId), [projectId]);

    // State Management
    const [projectData, setProjectData] = useState<ProjectType | null>(null); // For project details
    const [planningsList, setPlanningsList] = useState<PlanningType[]>([]);

    // We derive the selected project from the URL parameter and fetched data
    const selectedProject: ProjectType | null = projectData;

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<PlanningType | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [planningIdToDelete, setPlanningIdToDelete] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<keyof PlanningType>('startDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [detailData, setDetailData] = useState<PlanningType | null>(null);
    const [openValueModal, setOpenValueModal] = useState(false);
    const [openSingleDownloadModal, setOpenSingleDownloadModal] = useState(false);
    const [currentField, setCurrentField] = useState<string | null>(null);
    const [currentValues, setCurrentValues] = useState({ estimatedNumber: 0, min: 0, max: 0 });


    const [isFilterActive, setIsFilterActive] = useState(false);


    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

    const openMenu = Boolean(anchorEl);

    const estimatedRef = useRef<HTMLInputElement>(null);
    const minRef = useRef<HTMLInputElement>(null);
    const maxRef = useRef<HTMLInputElement>(null);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // **NEW**: Dynamic Filter for Planning Fields based on Project Type
    const getFilteredPlanningFields = useCallback((projectType: ProjectType['type']) => {
        // 🟢 اگر type هنوز بارگذاری نشده (null/undefined)، آرایه خالی برگردان
        if (projectType === undefined || projectType === null) {
            return [];
        }

        if (projectType === 0) { // AG
            return ALL_PLANNING_FIELDS.filter(f => f.color === 'yellow');
        }
        if (projectType === 1) { // OG
            return ALL_PLANNING_FIELDS.filter(f => f.color === 'yellow' || f.color === 'orange');
        }
        if (projectType === 2) { // Tesis-Ket
            return ALL_PLANNING_FIELDS.filter(f => f.color === 'yellow' || f.color === 'blue');
        }

        return []; // Fallback ایمن
    }, []);

    const planningFields = useMemo(() => {
        // debugger // این خط را می‌توان حذف کرد

        // 👈 ایمن‌سازی برای null بودن selectedProject
        if (!selectedProject || selectedProject.type === undefined || selectedProject.type === null) {
            return [];
        }

        return getFilteredPlanningFields(selectedProject.type);

    }, [selectedProject?.type, getFilteredPlanningFields]);
    // Handlers
    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };
    const clearAlert = () => setAlertMessage(null);

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: PlanningType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setPlanningIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setPlanningIdToDelete(null);
        getListPlannings();
    };
    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setEditingId(selectedRowForMenu.id);
            // Since project is fixed from URL, we only set dates and form data
            setStartDate(new Date(selectedRowForMenu.startDate));
            setEndDate(new Date(selectedRowForMenu.endDate));

            const newFormData = planningFields.reduce((acc: any, field) => {
                const key = field.key;
                if ((selectedRowForMenu as any)[key]) {
                    acc[key] = (selectedRowForMenu as any)[key];
                }
                return acc;
            }, {});
            setFormData(newFormData);
            setIsFormVisible(true);
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
        handleCloseMenu();
        clearAlert();
    };
    // const handleShowDetails = () => {
    //     if (selectedRowForMenu) {
    //         setDetailData(selectedRowForMenu);
    //         setOpenDetailModal(true);
    //     }
    //     handleCloseMenu();
    // };
    const handleCloseDetailModal = () => setOpenDetailModal(false);

    const resetFormAndState = () => {
        setStartDate(null);
        setEndDate(null);
        setFormData({});
        setEditingId(null);
        setIsFormVisible(false);
    };

    const handleOpenValueModal = (fieldKey: string) => {
        setCurrentField(fieldKey);
        setCurrentValues(formData[fieldKey] || { estimatedNumber: 0, min: 0, max: 0 });
        setOpenValueModal(true);
    };
    const handleCloseValueModal = () => {
        setOpenValueModal(false);
        setCurrentField(null);
    };
    const handleSaveValue = () => {
        if (currentField) {
            if (currentValues.min > currentValues.estimatedNumber) {
                showAlert('Minimum değer, Tahmini Sayıdan fazla olamaz.', 'error');
                minRef.current?.focus();
                return;
            }
            if (currentValues.max < currentValues.min) {
                showAlert('Maksimum değer minimumdan az olamaz.', 'error');
                maxRef.current?.focus();
                return;
            }
            setFormData((prev: any) => ({ ...prev, [currentField]: currentValues }));

            handleCloseValueModal();
        }
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    const handleRequestSort = (property: keyof PlanningType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };
    const handleStatusFilterChange = (
        _event: React.MouseEvent<HTMLElement>,
        newFilter: 'all' | 'active' | 'inactive' | null,
    ) => {
        if (newFilter !== null) {
            setStatusFilter(newFilter);
            setPage(0);
        }
    };

    const fetchProjects = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !numericProjectId) { navigate("/"); setLoadingData(false); return; }

        try {
            const response = await axios.get(server.baseurl + server.warehouse + `get-project-by-id/${numericProjectId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            debugger
            if (response.data.httpStatusCode === 200) {
                const projectItem = response.data.data;
                const formattedProject: ProjectType = {
                    ...projectItem,
                    id: Number(projectItem.id),
                    recordStatus: projectItem.recordStatus,
                    status: projectItem.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    type: projectItem.type as ProjectType['type'], // Ensure type is correctly mapped
                };
                setProjectData(formattedProject);
            } else {
                showAlert(response.data.message || 'Proje bilgileri yüklenirken bir hata oluştu.', 'error');
                setProjectData(null);
            }
        } catch (e: any) {
            showAlert('Proje bilgileri yüklenirken bir hata oluştu.', 'error');
            setProjectData(null);
        } finally {
            setLoadingData(false);
        }
    }, [navigate, numericProjectId]);


    const getListPlannings = useCallback(async () => {
        const numericProjectId = Number(projectId);
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-project-planning-by-project-id/" + numericProjectId, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200 && response.data.data) {

                const rawData = response.data.data; // 🚨 این یک آبجکت است

                // اگر API یک آبجکت برگرداند، آن را در یک آرایه قرار می‌دهیم
                const dataArray = Array.isArray(rawData) ? rawData : [rawData];

                const formattedData = dataArray.map((item: any) => ({
                    ...item,
                    // مطمئن می‌شویم که project.title وجود داشته باشد، حتی اگر project null باشد
                    project: item.project || { title: 'نامشخص' },
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                }));

                // setPlanningsList اکنون یک آرایه با یک یا چند آیتم خواهد بود
                setPlanningsList(formattedData as PlanningType[]);

            } else {
                // در صورتی که httpStatusCode 200 نباشد یا data خالی باشد
                showAlert(response.data.message || 'Planlama listesi alınırken bir hata oluştu.', 'error');
                setPlanningsList([]); // آرایه را خالی کنید
            }
        } catch (e: any) {
            // ... (مدیریت خطا)
            showAlert('Planlama listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            setPlanningsList([]); // آرایه را خالی کنید
        } finally {
            setLoadingData(false);
        }
    }, [navigate, projectId]);
    const insertPlanning = async () => {

        if (!selectedProject || !startDate || !endDate) {
            showAlert('Lütfen proje, başlangıç ve bitiş tarihlerini seçiniz!', 'warning');
            return;
        }
        if (startDate.getTime() > endDate.getTime()) {
            showAlert('Başlangıç tarihi bitiş tarihinden sonra olamaz!', 'error');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        const planningDetails = ALL_PLANNING_FIELDS.reduce((acc: any, field) => {
            const value = formData[field.key];

            // اگر فیلد در فرم پر شده باشد و estimatedNumber مقدار داشته باشد
            if (value && value.estimatedNumber !== undefined && value.estimatedNumber !== null) {
                acc[field.key] = {
                    estimatedNumber: Number(value.estimatedNumber),
                    min: Number(value.min),
                    max: Number(value.max),
                };
            } else {
                // در غیر این صورت (حتی اگر در UI نمایش داده نشده باشد)، صفر ارسال کن
                acc[field.key] = {
                    estimatedNumber: 0,
                    min: 0,
                    max: 0,
                };
            }
            return acc;
        }, {});

        const payload = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            ...planningDetails, // اکنون شامل تمام فیلدها با صفر یا مقادیر وارد شده است
            projectId: numericProjectId,
        };

        debugger
        try {
            const response = await axios.post(
                server.baseurl + server.warehouse + "create-project-planning",
                payload,
                { headers: { "Accept": "application/json", 'Content-Type': 'application/json', "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni planlama başarıyla eklendi!', 'success');
                resetFormAndState();
                getListPlannings();
            } else {
                showAlert(response.data.message || 'Yeni planlama eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Planlama eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editPlanning = async () => {

        if (!editingId || !selectedProject || !startDate || !endDate) {
            showAlert('Lütfen tüm gerekli alanları doldurunuz!', 'warning');
            return;
        }
        if (startDate.getTime() > endDate.getTime()) {
            showAlert('Başlangıç tarihi bitiş tarihinden sonra olamaz!', 'error');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        const planningDetails = ALL_PLANNING_FIELDS.reduce((acc: any, field) => {
            const value = formData[field.key];

            // اگر فیلد در فرم پر شده باشد و estimatedNumber مقدار داشته باشد
            if (value && value.estimatedNumber !== undefined && value.estimatedNumber !== null) {
                acc[field.key] = {
                    estimatedNumber: Number(value.estimatedNumber),
                    min: Number(value.min),
                    max: Number(value.max),
                };
            } else {
                // در غیر این صورت (حتی اگر در UI نمایش داده نشده باشد)، صفر ارسال کن
                acc[field.key] = {
                    estimatedNumber: 0,
                    min: 0,
                    max: 0,
                };
            }
            return acc;
        }, {});


        const payload = {
            id: Number(editingId),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            ...planningDetails,
            projectId: numericProjectId,
        };
        debugger
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-project-planning",
                payload,
                { headers: { "Accept": "application/json", 'Content-Type': 'application/json', "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Planlama başarıyla güncellendi!', 'success');
                resetFormAndState();
                getListPlannings();
            } else {
                showAlert(response.data.message || 'Planlama güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Planlama güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };

    // const handleDownloadPDF = (data: PlanningType[], titlePrefix: string = 'Proje_Planlama_Raporu') => {

    //     if (!data || data.length === 0) {
    //         showAlert('PDF oluşturulacak planlama bulunamadı.', 'warning');
    //         return;
    //     }

    //     // 💡 PDF در حالت افقی (Landscape) تعریف می‌شود تا ستون‌های زیاد جا شوند
    //     const doc = new jsPDF('l');
    //     const pageWidth = doc.internal.pageSize.getWidth();
    //     const pageHeight = doc.internal.pageSize.getHeight();

    //     // (تنظیمات فونت‌ها - بدون تغییر)
    //     (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    //     (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    //     (doc as any).addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
    //     (doc as any).addFont('Times-New-Roman.ttf', 'Times', 'normal');
    //     (doc as any).addFileToVFS('Arial.ttf', ArialFont);
    //     (doc as any).addFont('Arial.ttf', 'Arial', 'normal');
    //     doc.setFont('Arial');

    //     // 💡 ساختار هدرها: 3 ستون (Tahmini, Min, Max) برای هر فیلد جزئیات
    //     const detailHeaders = ALL_PLANNING_FIELDS.flatMap(f => [
    //         `${f.label} (T)`, // Tahmini
    //         `${f.label} (Min)`,
    //         `${f.label} (Max)`
    //     ]);

    //     const tableHeaders = [
    //         'Proje Adı', 'Başlangıç Tarihi', 'Bitiş Tarihi', 'Durum',
    //         ...detailHeaders
    //     ];

    //     // 💡 نگاشت داده‌ها: هر مقدار (Estimated, Min, Max) در ستون جداگانه
    //     const tableData = data.map(item => {
    //         const detailValues = ALL_PLANNING_FIELDS.flatMap(f => {
    //             const values = (item as any)[f.key];
    //             // برای هر فیلد، سه مقدار را به عنوان ستون‌های مجزا برمی‌گرداند
    //             return values
    //                 ? [values.estimatedNumber, values.min, values.max]
    //                 : [0, 0, 0]; // ارسال صفر برای مقادیر خالی
    //         });

    //         return [
    //             item.project.title,
    //             format(new Date(item.startDate), 'dd MMM yyyy', { locale: tr }),
    //             format(new Date(item.endDate), 'dd MMM yyyy', { locale: tr }),
    //             item.status,
    //             ...detailValues
    //         ];
    //     });

    //     // تعریف استایل‌های ستون
    //     const columnStyles = {};
    //     // ستون‌های اصلی عرض بیشتری دارند
    //     columnStyles[0] = { cellWidth: 35 }; // Proje Adı

    //     // تنظیمات autoTable
    //     autoTable(doc, {
    //         // startY 65 را حفظ کنید
    //         head: [tableHeaders],
    //         body: tableData,
    //         theme: 'grid',
    //         styles: { font: 'Arial', fontSize: 6, cellPadding: 1, overflow: 'linebreak' }, // 💡 کاهش فونت و پدینگ برای جا شدن ستون‌ها
    //         headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
    //         columnStyles: columnStyles, // اعمال عرض ستون

    //         // ... (منطق didDrawPage برای هدر و فوتر - بدون تغییر)
    //         didDrawPage: () => {
    //             doc.setFont('Arial', 'bold').setFontSize(14).text('Proje Planlama Raporu', pageWidth / 2, 15, { align: 'center' });
    //             doc.setFontSize(10).setFont('Times', 'bold').text(`Tarih:`, 15, 25);
    //             doc.setFont('Times', 'normal').text(`${format(new Date(), 'dd MMMM yyyy', { locale: tr })}`, 30, 25);
    //             doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);
    //             doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(0);
    //             const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
    //             let footerY = pageHeight - 30;
    //             companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
    //             const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    //             const pageCount = (doc as any).internal.getNumberOfPages();
    //             doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    //             doc.setFont('NotoSans', 'normal').text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    //             doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    //         },
    //         showHead: 'everyPage',
    //         margin: { top: 50, bottom: 45 },
    //     });

    //     doc.save(`${titlePrefix}.pdf`);
    //     showAlert('PDF başarıyla oluşturuldu.', 'success');
    // };

    // توجه: این تابع باید در داخل کامپوننت ListProjectPlanning تعریف شود 
    // تا به متغیرهای محلی (مثل ALL_PLANNING_FIELDS، doc، format، Logo و showAlert) دسترسی داشته باشد.


    const handleDownloadPDF = (data: PlanningType[], titlePrefix: string = 'Planlama_Detay') => {

        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak planlama bulunamadı.', 'warning');
            return;
        }

        // 💡 ایجاد PDF در حالت عمودی (Portrait)
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // (تنظیمات فونت‌ها - بدون تغییر)
        (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        (doc as any).addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        (doc as any).addFont('Times-New-Roman.ttf', 'Times', 'normal');
        (doc as any).addFileToVFS('Arial.ttf', ArialFont);
        (doc as any).addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        // فرض می‌کنیم که فقط یک آیتم (یک ردیف برنامه‌ریزی) برای دانلود کارتی دارید.
        const item = data[0];

        // --- تنظیمات چیدمان کارتی ---
        const columnCount = 2; // تعداد ستون‌های کارت‌ها در هر ردیف
        const padding = 10;
        const cardWidth = (pageWidth - padding * (columnCount + 1)) / columnCount;
        const cardHeight = 25;
        let currentY = 65;
        let currentX = padding;
        let columnIndex = 0;
        // --- پایان تنظیمات چیدمان ---

        // 1. هدر و جزئیات اصلی
        doc.setFont('Arial', 'bold').setFontSize(14).text('Proje Planlama Detayları', pageWidth / 2, 15, { align: 'center' });
        doc.setFont('Arial', 'normal').setFontSize(10).text(`Proje Adı: ${item.project.title}`, 15, 25);
        doc.text(`Başlangıç: ${format(new Date(item.startDate), 'dd MMMM yyyy', { locale: tr })}`, 15, 30);
        doc.text(`Bitiş: ${format(new Date(item.endDate), 'dd MMMM yyyy', { locale: tr })}`, 70, 30);
        doc.text(`Durum: ${item.status}`, 15, 35);
        doc.line(15, 40, pageWidth - 15, 40); // جداکننده
        doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

        // 2. تکرار بر روی تمام فیلدهای برنامه‌ریزی برای ایجاد کارت
        ALL_PLANNING_FIELDS.forEach((field) => {
            const values = (item as any)[field.key];

            // فیلتر کردن مقادیر صفر
            if (!values || (values.estimatedNumber === 0 && values.min === 0 && values.max === 0)) {
                return;
            }

            // --- مدیریت چیدمان چند ستونی ---
            currentX = padding + (columnIndex % columnCount) * (cardWidth + padding);
            if (columnIndex > 0 && columnIndex % columnCount === 0) {
                currentY += cardHeight + 10; // برو به خط جدید
                currentX = padding;
            }

            // بررسی و افزودن صفحه جدید در صورت نیاز
            if (currentY + cardHeight + 10 > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                currentY = 20;
                currentX = padding;
                // 💡 برای صفحه جدید نیز لوگو و هدر را دوباره رسم کنید (اختیاری)
                doc.setFont('Arial', 'bold').setFontSize(14).text('Proje Planlama Detayları (Devam)', pageWidth / 2, 15, { align: 'center' });
            }
            // --- پایان مدیریت چیدمان ---

            // 💡 3. افزودن عنوان فیلد (بالای کارت)
            doc.setFontSize(9).setTextColor(70, 70, 70).text(field.label, currentX, currentY);

            // 💡 4. ایجاد یک جدول کوچک (کارت)
            autoTable(doc, {
                startY: currentY + 1,
                margin: { left: currentX, right: pageWidth - (currentX + cardWidth) },
                head: [['Tahmini', 'Min', 'Max']],
                body: [[values.estimatedNumber, values.min, values.max]],
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 1,
                    halign: 'center',
                    fillColor: [245, 245, 245],
                    textColor: [0, 0, 0]
                },
                headStyles: {
                    fillColor: [200, 220, 255],
                    textColor: [0, 0, 0],
                    fontSize: 7
                },
                columnStyles: {
                    0: { cellWidth: cardWidth / 3 },
                    1: { cellWidth: cardWidth / 3 },
                    2: { cellWidth: cardWidth / 3 }
                },
                didDrawCell: () => {
                }
            });

            columnIndex++; // شمارنده ستون را افزایش بده
        });

        // 3. حفظ المان‌های تکراری در فوتر (برای هر صفحه)
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(0);
            const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
            let footerY = pageHeight - 30;
            companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });

            // صفحه‌بندی
            doc.text(`Sayfa ${i} / ${pageCount}`, 15, pageHeight - 10);

            // امضا
            doc.setFont('NotoSans', 'normal').text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        }


        doc.save(`${titlePrefix}.pdf`);
        showAlert('PDF başarıyla oluşturuldu.', 'success');
    };

    const handleExportExcel = async (data: PlanningType[]) => {
        setOpenDownloadModal(false);
        if (!data || data.length === 0) {
            showAlert('Dışa aktarılacak planlama bulunamadı.', 'warning');
            return;
        }
        showAlert('Excel dosyası oluşturuluyor...', 'info');
        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Proje Planlama Raporu', { views: [{ rightToLeft: false }] });
            const tableHeaders = ['Proje Adı', 'Başlangıç Tarihi', 'Bitiş Tarihi', 'Durum', ...ALL_PLANNING_FIELDS.map(f => f.label)];
            const headerRow = worksheet.addRow(tableHeaders);
            // const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            // const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            // const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const headerFont = { name: 'Calibri', size: 11, bold: true };
            const thinBorder: Excel.Border = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border: Partial<Excel.Borders> = {
                top: thinBorder,
                left: thinBorder,
                bottom: thinBorder,
                right: thinBorder
            };

            const headerFill: Excel.Fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' }
            };
            headerRow.eachCell((cell) => { cell.border = border; cell.fill = headerFill; cell.font = headerFont; });
            data.forEach(item => {
                const rowData = [
                    item.project.title,
                    format(new Date(item.startDate), 'dd MMM yyyy', { locale: tr }),
                    format(new Date(item.endDate), 'dd MMM yyyy', { locale: tr }),
                    item.status,
                    ...ALL_PLANNING_FIELDS.map(f => {
                        const values = (item as any)[f.key];
                        return values ? `Tahmini: ${values.estimatedNumber}, Min: ${values.min}, Max: ${values.max}` : '-';
                    })
                ];
                const row = worksheet.addRow(rowData);
                row.eachCell((cell) => { cell.border = border; });
            });
            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                if (column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 15), 50);
            });
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Proje_Planlama_Raporu_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu.', 'error');
        }
    };

    const handleClickOpenSingleDownloadModal = () => {
        if (selectedRowForMenu) {
            setOpenSingleDownloadModal(true);
        }
        handleCloseMenu();
    };

    const handleCloseSingleDownloadModal = () => {
        setOpenSingleDownloadModal(false);
    };

    // Handlers دانلود ردیف تکی
    const handleSingleDownload = (format: 'pdf' | 'excel') => {
        // 💡 چک می‌کنیم که selectedRowForMenu واقعاً مقدار دارد
        if (!selectedRowForMenu) {
            showAlert('Hata: İndirilecek planlama seçilmedi.', 'error');
            handleCloseSingleDownloadModal();
            return;
        }

        if (format === 'pdf') {
            handleDownloadPDF([selectedRowForMenu], `Planlama_${selectedRowForMenu.id}_Raporu`);
        } else {
            handleExportExcel([selectedRowForMenu]);
        }
        handleCloseSingleDownloadModal();
    };
    // Effects
    useEffect(() => {
        fetchProjects();
        getListPlannings();
    }, [fetchProjects, getListPlannings]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) {
            timer = setTimeout(() => clearAlert(), 5000);
        }
        return () => clearTimeout(timer);
    }, [alertMessage]);

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(timer);
    }, []);


    const handleClearDateFilters = () => {
        setFilterStartDate(null);
        setFilterEndDate(null);
    };




    // استفاده از useMemo برای محاسبه لیست فیلتر شده و سورت شده
    const sortedAndFilteredPlannings = useMemo(() => {
        // 1. بررسی وضعیت فیلترها
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = filterStartDate !== null || filterEndDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter); // به‌روزرسانی وضعیت فعال بودن فیلتر

        // 2. اعمال فیلترها
        const filtered = planningsList.filter(planning => {

            // 1. فیلتر جستجوی متنی (بر اساس عنوان پروژه)
            // ⚠️ توجه: فیلد 'code' در رابط PlanningType وجود ندارد، اما اگر فیلد دیگری برای جستجو دارید، آن را اضافه کنید.
            const matchesSearch = planning.project?.title?.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. فیلتر وضعیت
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && planning.recordStatus === 0) ||
                (statusFilter === 'inactive' && planning.recordStatus === 1);

            // 3. فیلتر تاریخ
            const planningStartDate = new Date(planning.startDate);
            // const planningEndDate = new Date(planning.endDate); // فیلتر را فقط بر startDate اعمال می کنیم

            let matchesDate = true;

            if (filterStartDate) {
                // تنظیم به ابتدای روز
                const filterStartDay = new Date(filterStartDate);
                filterStartDay.setHours(0, 0, 0, 0);

                // اگر تاریخ شروع برنامه‌ریزی قبل از تاریخ شروع فیلتر باشد، رد می‌شود
                if (planningStartDate.getTime() < filterStartDay.getTime()) {
                    matchesDate = false;
                }
            }

            if (filterEndDate) {
                // تنظیم به انتهای روز
                const filterEndDay = new Date(filterEndDate);
                filterEndDay.setHours(23, 59, 59, 999);

                // اگر تاریخ شروع برنامه‌ریزی بعد از تاریخ پایان فیلتر باشد، رد می‌شود
                if (planningStartDate.getTime() > filterEndDay.getTime()) {
                    matchesDate = false;
                }
            }

            return matchesSearch && matchesStatus && matchesDate;
        });

        // 3. اعمال سورتینگ و بازگرداندن
        return stableSort(filtered, getComparator(order, orderBy));

    }, [planningsList, searchTerm, statusFilter, order, orderBy, filterStartDate, filterEndDate]);

    // صفحه‌بندی اکنون از لیست جدید استفاده می‌کند
    const paginatedPlannings = sortedAndFilteredPlannings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // Render Component
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>

                    <Stack direction="row" spacing={1} flexWrap="wrap">

                        <Chip
                            label={selectedProject ? `Proje Planlama: ${selectedProject.title}` : 'Proje Planlama'}
                            color="primary"
                            variant="filled"
                            size="small"
                        />

                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni proje planı kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} fullWidth={false}>
                                    Yeni Proje Planı Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button variant="contained" color="error" onClick={resetFormAndState} fullWidth={false} startIcon={<IconX size={20} />}>
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => navigate(-1)}
                                endIcon={<IconArrowRight size={20} />}
                                fullWidth={false}
                            >
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Stack>
                </Stack>
                {loadingData ? (
                    // نمایش لودینگ
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="subtitle1" color="textSecondary">Veriler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <>
                        {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                            <Grid container spacing={2}>

                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel htmlFor="start-date" required>Başlangıç Tarihi</CustomFormLabel>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                        <DatePicker
                                            value={startDate}
                                            onChange={(newValue) => setStartDate(newValue)}
                                            inputFormat="dd/MM/yyyy"
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    fullWidth
                                                    size="small"
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel htmlFor="end-date" required>Bitiş Tarihi</CustomFormLabel>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                        <DatePicker
                                            value={endDate}
                                            onChange={(newValue) => setEndDate(newValue)}
                                            inputFormat="dd/MM/yyyy"
                                            minDate={startDate || undefined}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    fullWidth
                                                    size="small"
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>
                                </Grid>

                                {/* DYNAMIC PLANNING FIELDS */}
                                {planningFields.map(field => (
                                    <Grid item xs={12} sm={6} md={3} key={field.key}>
                                        {formData[field.key] ? (
                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                <CustomFormLabel sx={{
                                                    color: field.color === 'orange' ? '#fda41fff' : field.color === 'blue' ? '#00d9ffff' : '#ffe60aff',
                                                    textShadow: '1px 1px 1px #000000'
                                                }}>
                                                    {field.label}
                                                </CustomFormLabel>
                                                <IconButton onClick={() => handleOpenValueModal(field.key)}
                                                    sx={{ position: "relative", top: "10px" }}>
                                                    <IconEdit size={16} />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <CustomFormLabel sx={{
                                                color: field.color === 'orange' ? '#fda41fff' : field.color === 'blue' ? '#00d9ffff' : '#ffe60aff',
                                                textShadow: '1px 1px 1px #000000'
                                            }}>
                                                {field.label}
                                            </CustomFormLabel>
                                        )}
                                        <Box
                                            onClick={() => handleOpenValueModal(field.key)}
                                            sx={{
                                                border: formData[field.key] ? '2px solid rgba(1, 209, 95, 0.77)' : '2px dashed lightgray',
                                                bgcolor: formData[field.key] ? 'rgba(1, 209, 95, 0.1)' : 'transparent',
                                                borderRadius: '8px',
                                                p: 2,
                                                cursor: 'pointer',
                                                transition: 'all 0.3s',
                                                position: 'relative',
                                                '&:hover': {
                                                    boxShadow: '0px 0px 8px rgba(0,0,0,0.1)'
                                                }
                                            }}
                                        >
                                            {formData[field.key] ? (
                                                <Stack spacing={1}>
                                                    <Chip label={`Tahmini: ${formData[field.key].estimatedNumber}`} color="primary" size="small" />
                                                    <Chip label={`Min: ${formData[field.key].min}`} color="error" size="small" />
                                                    <Chip label={`Max: ${formData[field.key].max}`} color="success" size="small" />
                                                </Stack>
                                            ) : (
                                                <Stack alignItems="center" justifyContent="center" height="100%">
                                                    <IconPlus size={32} color="lightgray" />
                                                </Stack>
                                            )}
                                        </Box>
                                    </Grid>
                                ))}

                                <Grid item xs={12}>
                                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                                        {editingId !== null ? (
                                            <>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili planlamayı güncelleyin" : ""}>
                                                    <Button variant="contained" color="info" onClick={editPlanning} disabled={loadingButton}>
                                                        {loadingButton ? <><BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....</> : 'Düzenlemek'}
                                                    </Button>
                                                </CustomTooltip>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni planlama moduna dön" : ""}>
                                                    <Button variant="outlined" color="secondary" onClick={resetFormAndState}>
                                                        İptal Et
                                                    </Button>
                                                </CustomTooltip>
                                            </>
                                        ) : (
                                            <>
                                                {hasCreatePermission && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir planlama ekle" : ""}>
                                                        <Button variant="contained" color="success" onClick={insertPlanning} disabled={loadingButton}>
                                                            {loadingButton ? <><BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....</> : 'Yeni Planlama Ekle'}
                                                        </Button>
                                                    </CustomTooltip>
                                                )}
                                            </>
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>
                        )}
                    </>

                )}
                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>
                            {alertMessage}
                        </Alert>
                    </Stack>
                )}
            </div>

            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">

                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle projeleri indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadModal(true)}
                                    startIcon={<IconFileDownload />}
                                    isBlinking={true}
                                    disabled={loadingData || planningsList.length === 0}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'right' }}>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                                    <Button variant="contained" color="primary" onClick={() => setOpenDownloadModal(true)} startIcon={<IconFileDownload />}>
                                        Tümünü İndir
                                    </Button>
                                </CustomTooltip>
                            </Grid>
                        )}

                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Planlama Ara (Proje Adı)"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Başlangıç Tarihi"
                                        value={filterStartDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(newValue) => setFilterStartDate(newValue)}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <DatePicker
                                        label="Bitiş Tarihi"
                                        value={filterEndDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(newValue) => setFilterEndDate(newValue)}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
                                        <IconX size={20} />
                                    </IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth>
                                <StyledToggleButton value="all" aria-label="all plannings">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active plannings">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive plannings">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="subtitle1" color="textSecondary">Planlamalar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="planning table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'project'} direction={orderBy === 'project' ? order : 'asc'} onClick={() => handleRequestSort('project')} style={{ color: "#171c23" }}><Typography variant="h6">Proje Adı</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'startDate'} direction={orderBy === 'startDate' ? order : 'asc'} onClick={() => handleRequestSort('startDate')} style={{ color: "#171c23" }}><Typography variant="h6">Başlangıç Tarihi</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'endDate'} direction={orderBy === 'endDate' ? order : 'asc'} onClick={() => handleRequestSort('endDate')} style={{ color: "#171c23" }}><Typography variant="h6">Bitiş Tarihi</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleRequestSort('status')} style={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell style={{ color: "#171c23" }}><Typography variant="h6">Detaylar</Typography></StyledTableCell>

                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedPlannings.length > 0 ? (
                                    paginatedPlannings.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell><Typography variant="body1">{row.project?.title}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{format(new Date(row.startDate), 'dd MMMM yyyy', { locale: tr })}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{format(new Date(row.endDate), 'dd MMMM yyyy', { locale: tr })}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Chip
                                                    label={row.status}
                                                    sx={{ backgroundColor: row.recordStatus === 2 ? (theme) => theme.palette.primary.light : row.recordStatus === 1 ? (theme) => theme.palette.error.light : (theme) => theme.palette.success.light, color: row.recordStatus === 2 ? (theme) => theme.palette.primary.main : row.recordStatus === 1 ? (theme) => theme.palette.error.main : (theme) => theme.palette.success.main }}
                                                />
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<IconEye />}
                                                            onClick={() => { setDetailData(row); setOpenDetailModal(true); }}
                                                        >
                                                            Görünüm
                                                        </Button>
                                                    </CustomTooltip>
                                                </Stack>
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}><IconDots width={18} /></IconButton>
                                                </CustomTooltip>
                                                <Menu id="basic-menu" anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu} MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`, }}>

                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu planlamayı indir" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenSingleDownloadModal}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>İndir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu planlamayı düzenle" : ""}><MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem></CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu planlamayı sil" : ""}><MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem></CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><StyledTableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç planlama bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sortedAndFilteredPlannings.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            {/* Delete Modal */}
            <DeleteProjectPlanning openModal={openDeleteModal} onClose={handleClickCloseDeleteModal} planningIdToDelete={planningIdToDelete} onDeleteSuccess={getListPlannings} showAlert={showAlert} />

            {/* Download Modal */}
            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2}>
                    <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadPDF(sortedAndFilteredPlannings)}>PDF Olarak İndir</Button>
                    <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleExportExcel(sortedAndFilteredPlannings)}>Excel Olarak İndir</Button>
                </Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            <Dialog open={openSingleDownloadModal} onClose={handleCloseSingleDownloadModal}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2}>
                    <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleSingleDownload('pdf')}>PDF Olarak İndir</Button>
                    <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleSingleDownload('excel')}>Excel Olarak İndir</Button>
                </Stack></DialogContent>
                <DialogActions><Button onClick={handleCloseSingleDownloadModal} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            {/* Details Modal */}
            <Dialog open={openDetailModal} onClose={handleCloseDetailModal} fullWidth maxWidth="sm">
                <DialogTitle>Proje Planlama Detayları</DialogTitle>
                <DialogContent dividers>
                    {detailData && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}><Typography variant="subtitle1">Proje: {detailData.project?.title}</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2">Başlangıç Tarihi: {format(new Date(detailData.startDate), 'dd MMMM yyyy', { locale: tr })}</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2">Bitiş Tarihi: {format(new Date(detailData.endDate), 'dd MMMM yyyy', { locale: tr })}</Typography></Grid>

                            {/* 💡 اصلاح شده: استفاده از planningFields به جای ALL_PLANNING_FIELDS */}
                            {planningFields.map(field => {
                                const values = (detailData as any)[field.key];
                                return values && (
                                    <Grid item xs={12} key={field.key}>
                                        <Typography variant="subtitle2" mt={2}>{field.label}</Typography>
                                        <Stack direction="row" spacing={1} mt={1}>
                                            <Chip label={`Tahmini: ${values.estimatedNumber}`} color="success" size="small" />
                                            <Chip label={`Min: ${values.min}`} color="primary" size="small" />
                                            <Chip label={`Max: ${values.max}`} color="secondary" size="small" />
                                        </Stack>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDetailModal} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openValueModal} onClose={handleCloseValueModal}>
                <DialogTitle>Değer Gir - {ALL_PLANNING_FIELDS.find(f => f.key === currentField)?.label}</DialogTitle>
                <DialogContent>
                    {/* فیلد Tahmini Sayı */}
                    <CustomFormLabel>Tahmini Sayı</CustomFormLabel>
                    <CustomTextField
                        inputRef={estimatedRef}
                        type="number"
                        value={currentValues.estimatedNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, estimatedNumber: Number(e.target.value) }))}
                        fullWidth
                        size="small"
                        onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()}
                        inputProps={{ min: 0 }}
                    />

                    {/* فیلد Minimum */}
                    <CustomFormLabel sx={{ mt: 2 }}>Minimum</CustomFormLabel>
                    <CustomTextField
                        inputRef={minRef}
                        type="number"
                        value={currentValues.min}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, min: Number(e.target.value) }))}
                        fullWidth
                        size="small"
                        onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()}
                        inputProps={{ min: 0 }}
                        error={currentValues.min > currentValues.estimatedNumber}
                        helperText={currentValues.min > currentValues.estimatedNumber ? "Minimum değer Tahmini Sayıdan fazla olamaz." : ""}
                    />

                    {/* فیلد Maksimum */}
                    <CustomFormLabel sx={{ mt: 2 }}>Maksimum</CustomFormLabel>
                    <CustomTextField
                        inputRef={maxRef}
                        type="number"
                        value={currentValues.max}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, max: Number(e.target.value) }))}
                        fullWidth
                        size="small"
                        onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()}
                        inputProps={{ min: 0 }}
                        error={currentValues.max < currentValues.min}
                        helperText={currentValues.max < currentValues.min ? "Maksimum değer minimumdan az olamaz." : ""}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseValueModal}>İptal</Button>
                    <Button variant="contained" onClick={handleSaveValue}>Kaydet</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListProjectPlanning;