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

import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX,
    IconPlus, IconEye, IconArrowRight
} from '@tabler/icons-react';
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

// ================= Styled =================
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
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
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
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));

// ================= Types =================
interface ProjectType {
    id: number;
    title: string;
    createAt: string;
    recordStatus: number;
    status: string;
    type: 0 | 1 | 2;
    startDate?: string;
    endDate?: string;
    predictEndDate?: string;
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
    project: { id: number; title: string };
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

// فیلدها و رنگ‌ها (برای دانلود و UI)
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

// ================= Helpers =================
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
const getComparator = <Key extends keyof PlanningType>(order: 'asc' | 'desc', orderBy: Key) =>
    (a: PlanningType, b: PlanningType) => order === 'desc'
        ? descendingComparator(a, b, orderBy)
        : -descendingComparator(a, b, orderBy);

const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
        const order = comparator(a[0], b[0]); if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilized.map(el => el[0]);
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// ⬇️ جدید: تنظیم ساعت برای ارسال
const toDateAt = (d: Date, h: number, m: number) => {
    const x = new Date(d);
    x.setHours(h, m, 0, 0);
    return x;
};

// جدید: آخرین تاریخ شروع ثبت‌شده
const getLastPlanningStart = (arr: PlanningType[]): Date | null => {
    if (!arr || arr.length === 0) return null;
    const maxMs = Math.max(...arr.map(x => startOfDay(new Date(x.startDate)).getTime()));
    return new Date(maxMs);
};

// const getLastPlanningEnd = (arr: PlanningType[]): Date | null => {
//     if (!arr || arr.length === 0) return null;
//     const maxMs = Math.max(...arr.map(x => new Date(x.endDate).getTime()));
//     return new Date(maxMs);
// };

// ================= Component =================
const ListProjectPlanning = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();
    const numericProjectId = useMemo(() => Number(projectId), [projectId]);

    // States
    const [projectData, setProjectData] = useState<ProjectType | null>(null);
    const [planningsList, setPlanningsList] = useState<PlanningType[]>([]);

    const [startDate, setStartDate] = useState<Date | null>(null);   // فرم (خودکار)
    const [endDate, setEndDate] = useState<Date | null>(null);       // فرم (خودکار)

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

    const [rowForDownload, setRowForDownload] = useState<PlanningType | null>(null);


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

    // بازه پروژه برای محدودسازی
    const [projectStart, setProjectStart] = useState<Date | null>(null);
    const [projectEnd, setProjectEnd] = useState<Date | null>(null);
    const [canCreateInRange, setCanCreateInRange] = useState(true);

    // فیلتر فیلدهای قابل نمایش/ویرایش طبق نوع پروژه
    const getFilteredPlanningFields = useCallback((projectType: ProjectType['type']) => {
        if (projectType === undefined || projectType === null) return [];
        if (projectType === 0) return ALL_PLANNING_FIELDS.filter(f => f.color === 'yellow');                  // AG
        if (projectType === 1) return ALL_PLANNING_FIELDS.filter(f => f.color === 'yellow' || f.color === 'orange'); // OG
        if (projectType === 2) return ALL_PLANNING_FIELDS.filter(f => f.color === 'yellow' || f.color === 'blue');   // Tesis-Ket
        return [];
    }, []);
    const planningFields = useMemo(() => {
        if (!projectData || projectData.type === undefined || projectData.type === null) return [];
        return getFilteredPlanningFields(projectData.type);
    }, [projectData?.type, getFilteredPlanningFields]);

    // ====== Alerts
    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => { setAlertMessage(message); setAlertSeverity(severity); };
    const clearAlert = () => setAlertMessage(null);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => clearTimeout(timer);
    }, [alertMessage]);
    useEffect(() => {
        const t = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(t);
    }, []);

    // ====== API: Project (با تاریخ‌ها)
    const fetchProjects = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !numericProjectId) { navigate("/"); setLoadingData(false); return; }

        try {
            const response = await axios.get(
                server.baseurl + server.warehouse + `get-project-by-id/${numericProjectId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                const p = response.data.data;
                const formatted: ProjectType = {
                    ...p,
                    id: Number(p.id),
                    recordStatus: p.recordStatus,
                    status: p.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    type: p.type as ProjectType['type'],
                    startDate: p.startDate,
                    endDate: p.endDate,
                    predictEndDate: p.predictEndDate,
                };
                setProjectData(formatted);

                const s = p.startDate ? new Date(p.startDate) : null;
                const e = p.endDate ? new Date(p.endDate) : null;
                setProjectStart(s);
                setProjectEnd(e);
            } else {
                showAlert(response.data.message || 'Proje bilgileri yüklenirken bir hata oluştu.', 'error');
                setProjectData(null);
                setProjectStart(null);
                setProjectEnd(null);
            }
        } catch {
            showAlert('Proje bilgileri yüklenirken bir hata oluştu.', 'error');
            setProjectData(null);
            setProjectStart(null);
            setProjectEnd(null);
        } finally {
            setLoadingData(false);
        }
    }, [navigate, numericProjectId]);

    // ====== API: Planning list
    const getListPlannings = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            const response = await axios.get(
                server.baseurl + server.warehouse + "get-project-planning-by-project-id/" + numericProjectId,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                const rawData = response.data.data;
                const dataArray = Array.isArray(rawData) ? rawData : [rawData];
                const formattedData = dataArray.map((item: any) => ({
                    ...item,
                    project: item.project || { title: '' },
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                }));
                setPlanningsList(formattedData as PlanningType[]);
            } else {
                showAlert(response.data.message || 'Planlama listesi alınırken bir hata oluştu.', 'error');
                setPlanningsList([]);
            }
        } catch {
            showAlert('Planlama listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            setPlanningsList([]);
        } finally {
            setLoadingData(false);
        }
    }, [navigate, numericProjectId]);

    // ====== محاسبه خودکار بازه تاریخ فرم (start=end همان روز)
    useEffect(() => {
        if (!projectStart || !projectEnd) return;

        // آخرین startDate ثبت‌شده (به‌صورت روز)
        const lastStart = getLastPlanningStart(planningsList);

        // اگر رکورد نیست ⇒ تاریخ شروع پروژه، وگرنه ⇒ روز بعد از آخرین
        const candidateDay = startOfDay(
            lastStart ? addDays(startOfDay(lastStart), 1) : startOfDay(projectStart)
        );

        if (candidateDay.getTime() > startOfDay(projectEnd).getTime()) {
            setCanCreateInRange(false);
            setStartDate(null);
            setEndDate(null);
            return;
        }

        setCanCreateInRange(true);
        // ✅ شروع و پایان، همان روز
        setStartDate(candidateDay);
        setEndDate(candidateDay);
    }, [projectStart, projectEnd, planningsList]);

    // ====== Effects
    useEffect(() => {
        fetchProjects();
        getListPlannings();
    }, [fetchProjects, getListPlannings]);

    // ====== Menu handlers
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: PlanningType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) { setPlanningIdToDelete(selectedRowForMenu.id); setOpenDeleteModal(true); }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setPlanningIdToDelete(null);
        getListPlannings();
    };

    // ====== Edit (تاریخ‌ها editable نیستند؛ فقط همان روز را ست می‌کنیم)
    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        setEditingId(selectedRowForMenu.id);

        const s = startOfDay(new Date(selectedRowForMenu.startDate));
        setStartDate(s);
        setEndDate(s); // همان روز

        const newFormData = planningFields.reduce((acc: any, field) => {
            const key = field.key;
            if ((selectedRowForMenu as any)[key]) acc[key] = (selectedRowForMenu as any)[key];
            return acc;
        }, {});
        setFormData(newFormData);
        setIsFormVisible(true);

        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
        handleCloseMenu();
        clearAlert();
    };

    // ====== Value modal handlers
    const handleOpenValueModal = (fieldKey: string) => {
        setCurrentField(fieldKey);
        setCurrentValues(formData[fieldKey] || { estimatedNumber: 0, min: 0, max: 0 });
        setOpenValueModal(true);
    };
    const handleCloseValueModal = () => { setOpenValueModal(false); setCurrentField(null); };
    const handleSaveValue = () => {
        if (!currentField) return;

        if (currentValues.min > currentValues.estimatedNumber) {
            showAlert('Minimum değer, Tahmini Sayıdan fazla olamaz.', 'error');
            minRef.current?.focus();
            return;
        }
        if (currentValues.max < currentValues.min) {
            showAlert('Maksimum değer Minimum değerden az olamaz.', 'error');
            maxRef.current?.focus();
            return;
        }
        // ✅ Max باید >= Tahmini باشد
        if (currentValues.max < currentValues.estimatedNumber) {
            showAlert('Maksimum değer Tahmini Sayıdan az olamaz (en az Tahmini kadar olmalı).', 'error');
            maxRef.current?.focus();
            return;
        }

        setFormData((prev: any) => ({ ...prev, [currentField]: currentValues }));
        handleCloseValueModal();
    };

    // ====== Create/Update payload helpers (بدون تغییر در روال — اوبجکت‌ها کامل ارسال می‌شن)
    const buildPlanningDetailsPayload = () => {
        return ALL_PLANNING_FIELDS.reduce((acc: any, field) => {
            const value = formData[field.key];
            if (value && value.estimatedNumber !== undefined && value.estimatedNumber !== null) {
                acc[field.key] = {
                    estimatedNumber: Number(value.estimatedNumber),
                    min: Number(value.min),
                    max: Number(value.max),
                };
            } else {
                // صفرها مثل قبل
                acc[field.key] = { estimatedNumber: 0, min: 0, max: 0 };
            }
            return acc;
        }, {});
    };

    // ====== Insert (تنها تغییر: ساعت‌ها موقع ارسال ست می‌شن)
    const insertPlanning = async () => {
        if (!canCreateInRange) { showAlert('Bu proje için girilebilecek tarih kalmadı (proje bitişini aştı).', 'warning'); return; }
        if (!startDate || !endDate || !projectData) { showAlert('Tarih aralığı hazır değil. Lütfen sayfayı yenileyin.', 'warning'); return; }

        if (projectStart && projectEnd) {
            const s = startOfDay(startDate).getTime();
            if (s < startOfDay(projectStart).getTime() || s > startOfDay(projectEnd).getTime()) {
                showAlert('Planlama tarihi proje aralığı ile uyumlu değil.', 'error'); return;
            }
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        const planningDetails = buildPlanningDetailsPayload();
        const payload = {
            startDate: toDateAt(startDate, 8, 0).toISOString(),    // 08:00 همان روز
            endDate: toDateAt(endDate, 17, 0).toISOString(),   // 17:00 همان روز
            ...planningDetails,
            projectId: numericProjectId,
        };

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
        } finally { setLoadingButton(false); }
    };

    // ====== Edit (تنها تغییر: ساعت‌ها موقع ارسال ست می‌شن)
    const editPlanning = async () => {
        if (!editingId || !startDate || !endDate || !projectData) { showAlert('Lütfen tüm gerekli alanları doldurunuz!', 'warning'); return; }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        const planningDetails = buildPlanningDetailsPayload();
        const payload = {
            id: Number(editingId),
            startDate: toDateAt(startDate, 8, 0).toISOString(),
            endDate: toDateAt(endDate, 17, 0).toISOString(),
            ...planningDetails,
            projectId: numericProjectId,
        };

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
            if (e.response?.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            } else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu، lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Planlama güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally { setLoadingButton(false); }
    };

    const resetFormAndState = () => {
        // setStartDate(null);
        // setEndDate(null);
        setFormData({});
        setEditingId(null);
        setIsFormVisible(false);
    };

    // ====== Downloads (PDF/Excel) – بدون تغییرات گسترده
    const handleDownloadPDF = (data: PlanningType[], titlePrefix: string = 'Planlama_Detay') => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak planlama bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // فونت‌ها (یکبار)
        (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        (doc as any).addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        (doc as any).addFont('Times-New-Roman.ttf', 'Times', 'normal');
        (doc as any).addFileToVFS('Arial.ttf', ArialFont);
        (doc as any).addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        const drawFooter = (pageIndex: number, total: number) => {
            doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(0);
            const company = [
                'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR',
                'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
            ];
            const ph = doc.internal.pageSize.getHeight();
            const pw = doc.internal.pageSize.getWidth();
            let y = ph - 30;
            company.forEach(line => { doc.text(line, pw / 2, y, { align: 'center' }); y += 4; });
            doc.text(`Sayfa ${pageIndex} / ${total}`, 15, ph - 10);
            doc.text('İmza', pw - 15, ph - 10, { align: 'right' });
            doc.line(pw - 65, ph - 15, pw - 15, ph - 15);
        };

        data.forEach((item, idx) => {
            if (idx > 0) doc.addPage();

            // Header
            doc.setFont('Arial', 'normal').setFontSize(14)
                .text('Proje Planlama Detayları', pageWidth / 2, 15, { align: 'center' });
            doc.setFont('Arial', 'normal').setFontSize(10);

            const projectTitle = item.project?.title ?? '-';
            doc.text(`Proje Adı: ${projectTitle}`, 15, 25);

            const prStart = projectStart ? format(projectStart, 'dd MMMM yyyy', { locale: tr }) : '-';
            const prEnd = projectEnd ? format(projectEnd, 'dd MMMM yyyy', { locale: tr }) : '-';
            doc.text(`Proje Başlangıç: ${prStart}`, 15, 30);
            doc.text(`Proje Bitiş: ${prEnd}`, 70, 30);

            doc.text(
                `Kayıt Tarihi: ${format(new Date(item.startDate), 'dd MMMM yyyy', { locale: tr })} 08:00 - 17:00`,
                15, 35
            );

            // doc.line(15, 40, pageWidth - 15, 40);
            try { doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25); } catch { }

            // کارت‌های دو ستونه
            const columnCount = 2;
            const padding = 10;
            const cardWidth = (pageWidth - padding * (columnCount + 1)) / columnCount;
            const cardHeight = 25;
            let currentY = 65;
            let columnIndex = 0;

            ALL_PLANNING_FIELDS.forEach((field) => {
                const values = (item as any)[field.key];
                if (!values) return;
                const allZero = [values.estimatedNumber, values.min, values.max].every((v: any) => Number(v) === 0);
                if (allZero) return;

                const col = columnIndex % columnCount;
                const currentX = padding + col * (cardWidth + padding);

                if (col === 0 && columnIndex > 0) {
                    // شروع ردیف جدید
                    currentY += cardHeight + 10;
                }
                if (currentY + cardHeight + 10 > pageHeight - 40) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(9).setTextColor(70, 70, 70).text(field.label, currentX, currentY);

                autoTable(doc, {
                    startY: currentY + 1,
                    margin: { left: currentX, right: pageWidth - (currentX + cardWidth) },
                    head: [['Tahmini', 'Min', 'Max']],
                    body: [[values.estimatedNumber, values.min, values.max]],
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 1, halign: 'center', fillColor: [245, 245, 245], textColor: [0, 0, 0] },
                    headStyles: { fillColor: [200, 220, 255], textColor: [0, 0, 0], fontSize: 7 },
                    columnStyles: { 0: { cellWidth: cardWidth / 3 }, 1: { cellWidth: cardWidth / 3 }, 2: { cellWidth: cardWidth / 3 } },
                });

                columnIndex++;
            });
        });

        // Footer برای همه صفحات
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) { doc.setPage(i); drawFooter(i, pageCount); }

        const name = data.length === 1
            ? `Planlama_${data[0].id}_Raporu.pdf`
            : `${titlePrefix}.pdf`;

        doc.save(name);
        showAlert('PDF başarıyla oluşturuldu.', 'success');
    };


    const handleExportExcel = async (data: PlanningType[]) => {
        setOpenDownloadModal(false);
        if (!data || data.length === 0) { showAlert('Dışa aktarılacak planlama bulunamadı.', 'warning'); return; }
        showAlert('Excel dosyası oluşturuluyor...', 'info');
        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Proje Planlama Raporu', { views: [{ rightToLeft: false }] });

            const tableHeaders = [
                'Proje Adı', 'Proje Başlangıç', 'Proje Bitiş',
                'Kayıt Tarihi (08:00 - 17:00)', 'Durum',
                ...ALL_PLANNING_FIELDS.map(f => f.label)
            ];
            const headerRow = worksheet.addRow(tableHeaders);

            const thinBorder: Excel.Border = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border: Partial<Excel.Borders> = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill: Excel.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const headerFont = { name: 'Calibri', size: 11, bold: true };

            headerRow.eachCell((cell) => { (cell as any).border = border; (cell as any).fill = headerFill; (cell as any).font = headerFont; });

            data.forEach(item => {
                const rowData = [
                    item.project.title,
                    projectStart ? format(projectStart, 'dd MMM yyyy', { locale: tr }) : '-',
                    projectEnd ? format(projectEnd, 'dd MMM yyyy', { locale: tr }) : '-',
                    `${format(new Date(item.startDate), 'dd MMM yyyy', { locale: tr })} 08:00 - 17:00`,
                    item.status,
                    ...ALL_PLANNING_FIELDS.map(f => {
                        const values = (item as any)[f.key];
                        return values ? `Tahmini: ${values.estimatedNumber}, Min: ${values.min}, Max: ${values.max}` : '-';
                    })
                ];
                const row = worksheet.addRow(rowData);
                row.eachCell((cell) => { (cell as any).border = border; });
            });

            worksheet.columns.forEach((column: any) => {
                let maxLength = 0;
                column.eachCell?.({ includeEmpty: true }, (cell: any) => {
                    const len = cell.value ? cell.value.toString().length : 10;
                    if (len > maxLength) maxLength = len;
                });
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

    // ====== Single download modal
    const handleClickOpenSingleDownloadModal = () => {
        if (selectedRowForMenu) {
            setRowForDownload(selectedRowForMenu); // snapshot ردیف
            setOpenSingleDownloadModal(true);
        }
        handleCloseMenu(); // اشکالی ندارد اگر selectedRowForMenu را null کند
    };
    const handleCloseSingleDownloadModal = () => {
        setOpenSingleDownloadModal(false);
        setRowForDownload(null);
    };

    const handleSingleDownload = (formatType: 'pdf' | 'excel') => {
        const row = rowForDownload;
        if (!row) {
            showAlert('Hata: İndirilecek planlama seçilmedi.', 'error');
            handleCloseSingleDownloadModal();
            return;
        }
        if (formatType === 'pdf') handleDownloadPDF([row], `Planlama_${row.id}_Raporu`);
        else handleExportExcel([row]);

        handleCloseSingleDownloadModal();
    };


    // ====== Filters/Sorting/Pagination
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleRequestSort = (property: keyof PlanningType) => {
        const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    };
    const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => {
        if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); }
    };
    const handleClearDateFilters = () => { setFilterStartDate(null); setFilterEndDate(null); };

    const sortedAndFilteredPlannings = useMemo(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = filterStartDate !== null || filterEndDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);

        const filtered = planningsList.filter(planning => {
            const matchesSearch = planning.project?.title?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && planning.recordStatus === 0) ||
                (statusFilter === 'inactive' && planning.recordStatus === 1);

            const pStart = new Date(planning.startDate);
            let matchesDate = true;

            if (filterStartDate) {
                const d0 = startOfDay(filterStartDate);
                if (pStart.getTime() < d0.getTime()) matchesDate = false;
            }
            if (filterEndDate) {
                const d1 = startOfDay(addDays(filterEndDate, 1)); // انتهای روز
                if (pStart.getTime() >= d1.getTime()) matchesDate = false;
            }
            return matchesSearch && matchesStatus && matchesDate;
        });

        return stableSort(filtered, getComparator(order, orderBy));
    }, [planningsList, searchTerm, statusFilter, order, orderBy, filterStartDate, filterEndDate]);

    const paginatedPlannings = sortedAndFilteredPlannings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // ====== UI
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        flexWrap="wrap"
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                    >
                        <Chip
                            label={projectData ? `Proje Planlama: ${projectData.title}` : 'Proje Planlama'}
                            color="primary"
                            variant="filled"
                            size="small"
                            sx={{ marginBottom: { xs: 1, sm: 0 } }}
                        />
                        <Chip
                            label={`Proje Tarih Aralığı: ${projectStart ? format(projectStart, 'dd MMM yyyy', { locale: tr }) : '-'} → ${projectEnd ? format(projectEnd, 'dd MMM yyyy', { locale: tr }) : '-'}`}
                            color="default"
                            variant="outlined"
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
                            <Button variant="outlined" color="error" onClick={() => navigate(-1)} endIcon={<IconArrowRight size={20} />} fullWidth={false}>
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Stack>
                </Stack>

                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="subtitle1" color="textSecondary" sx={{ ml: 2 }}>
                            Veriler yükleniyor...
                        </Typography>
                    </Box>
                ) : (
                    <>
                        {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                            <Grid container spacing={2}>
                                {/* تاریخ‌های فرم: فقط نمایش (Readonly + Disabled) */}
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel>Tarih (Otomatik)</CustomFormLabel>
                                    <TextField
                                        value={startDate ? format(startOfDay(startDate), 'dd MMMM yyyy', { locale: tr }) : '-'}
                                        size="small"
                                        fullWidth
                                        InputProps={{ readOnly: true }}
                                        disabled
                                    // helperText="Bu tarih sistem tarafından sıraya göre otomatik atanır."
                                    />
                                </Grid>
                                {/* فیلدهای داینامیک */}
                                {planningFields.map(field => (
                                    <Grid item xs={12} sm={6} md={3} key={field.key}>
                                        {formData[field.key] ? (
                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                <CustomFormLabel>{field.label}</CustomFormLabel>
                                                <IconButton onClick={() => handleOpenValueModal(field.key)} sx={{ position: "relative", top: "10px" }}>
                                                    <IconEdit size={16} />
                                                </IconButton>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "start", gap: 1 }}>
                                                {(() => {
                                                    let bgColor = '#9e9e9e';
                                                    if (field.color === 'orange') bgColor = '#fda41fff';
                                                    if (field.color === 'blue') bgColor = '#00d9ffff';
                                                    if (field.color === 'yellow') bgColor = '#ffe60aff';
                                                    return <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: bgColor, flexShrink: 0, ml: 0.5, border: 1, borderBlockStyle: "solid" }} />;
                                                })()}
                                                <CustomFormLabel style={{ margin: 0, paddingTop: 5, paddingBottom: 5 }}>{field.label}</CustomFormLabel>
                                            </Box>
                                        )}

                                        <Box
                                            onClick={() => handleOpenValueModal(field.key)}
                                            sx={{
                                                border: formData[field.key] ? '2px solid rgba(1, 209, 95, 0.77)' : '2px dashed lightgray',
                                                bgcolor: formData[field.key] ? 'rgba(1, 209, 95, 0.1)' : 'transparent',
                                                borderRadius: '8px', p: 2, cursor: 'pointer', transition: 'all 0.3s',
                                                '&:hover': { boxShadow: '0px 0px 8px rgba(0,0,0,0.1)' }
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
                                    {!canCreateInRange && (
                                        <Alert severity="info" sx={{ mb: 2 }}>
                                            Bu proje için yeni tarih aralığı kalmadı (proje bitişi nedeniyle).
                                        </Alert>
                                    )}
                                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                                        {editingId !== null ? (
                                            <>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili planlamayı güncelleyin" : ""}>
                                                    <Button variant="contained" color="info" onClick={editPlanning} disabled={loadingButton || !startDate || !endDate}>
                                                        {loadingButton ? <><BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....</> : 'Düzenlemek'}
                                                    </Button>
                                                </CustomTooltip>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni planlama moduna dön" : ""}>
                                                    <Button variant="outlined" color="secondary" onClick={resetFormAndState}>İptal Et</Button>
                                                </CustomTooltip>
                                            </>
                                        ) : (
                                            hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir planlama ekle" : ""}>
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        onClick={insertPlanning}
                                                        disabled={loadingButton || !canCreateInRange || !startDate || !endDate}
                                                    >
                                                        {loadingButton ? <><BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....</> : 'Yeni Planlama Ekle'}
                                                    </Button>
                                                </CustomTooltip>
                                            )
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>
                        )}
                    </>
                )}
                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
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
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconSearch size={20} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>

                        {/* ✅ فیلتر تاریخ‌ها با DatePicker مثل قبل */}
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
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
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
                            <Typography variant="subtitle1" color="textSecondary" sx={{ ml: 2 }}>
                                Planlamalar yükleniyor...
                            </Typography>
                        </Box>
                    ) : (
                        <Table aria-label="planning table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'project'} direction={orderBy === 'project' ? order : 'asc'} onClick={() => handleRequestSort('project' as keyof PlanningType)} style={{ color: "#171c23" }}>
                                            <Typography variant="h6">Proje Adı</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'startDate'} direction={orderBy === 'startDate' ? order : 'asc'} onClick={() => handleRequestSort('startDate')} style={{ color: "#171c23" }}>
                                            <Typography variant="h6">Başlangıç Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'endDate'} direction={orderBy === 'endDate' ? order : 'asc'} onClick={() => handleRequestSort('endDate')} style={{ color: "#171c23" }}>
                                            <Typography variant="h6">Bitiş Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Detaylar</Typography>
                                    </StyledTableCell>
                                    <StyledTableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedPlannings.length > 0 ? (
                                    paginatedPlannings.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.project?.title}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{format(new Date(row.startDate), 'dd MMMM yyyy', { locale: tr })}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{format(new Date(row.endDate), 'dd MMMM yyyy', { locale: tr })}</Typography>
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
                                                    <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined} onClick={(e) => handleClickMenu(e, row)}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <Menu id="basic-menu" anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu} MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}>

                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu planlamayı düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu planlamayı sil" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu planlamayı indir" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenSingleDownloadModal}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={6} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç planlama bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
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
            <DeleteProjectPlanning
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                planningIdToDelete={planningIdToDelete}
                onDeleteSuccess={getListPlannings}
                showAlert={showAlert}
            />

            {/* Download All/Filtered Modal */}
            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button onClick={() => handleDownloadPDF(sortedAndFilteredPlannings, 'Planlama_Raporu')}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleExportExcel(sortedAndFilteredPlannings)}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            {/* Single row download */}
            <Dialog open={openSingleDownloadModal} onClose={handleCloseSingleDownloadModal}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleSingleDownload('pdf')}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleSingleDownload('excel')}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseSingleDownloadModal} color="secondary">İptal</Button></DialogActions>
            </Dialog>


            {/* Details Modal */}
            <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Proje Planlama Detayları</DialogTitle>
                <DialogContent dividers>
                    {detailData && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}><Typography variant="subtitle1">Proje: {detailData.project?.title}</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2">Başlangıç Tarihi: {format(new Date(detailData.startDate), 'dd MMMM yyyy HH:mm', { locale: tr })}</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2">Bitiş Tarihi: {format(new Date(detailData.endDate), 'dd MMMM yyyy HH:mm', { locale: tr })}</Typography></Grid>
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
                <DialogActions><Button onClick={() => setOpenDetailModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Value Modal */}
            <Dialog open={openValueModal} onClose={handleCloseValueModal}>
                <DialogTitle>Değer Gir - {ALL_PLANNING_FIELDS.find(f => f.key === currentField)?.label}</DialogTitle>
                <DialogContent>
                    <CustomFormLabel>Tahmini Sayı</CustomFormLabel>
                    <CustomTextField
                        inputRef={estimatedRef}
                        type="number"
                        value={currentValues.estimatedNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, estimatedNumber: Number(e.target.value) }))}
                        fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} inputProps={{ min: 0 }}
                    />
                    <CustomFormLabel sx={{ mt: 2 }}>Minimum</CustomFormLabel>
                    <CustomTextField
                        inputRef={minRef}
                        type="number"
                        value={currentValues.min}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, min: Number(e.target.value) }))}
                        fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} inputProps={{ min: 0 }}
                        error={currentValues.min > currentValues.estimatedNumber}
                        helperText={currentValues.min > currentValues.estimatedNumber ? "Minimum değer Tahmini Sayıdan fazla olamaz." : ""}
                    />
                    <CustomFormLabel sx={{ mt: 2 }}>Maksimum</CustomFormLabel>
                    <CustomTextField
                        inputRef={maxRef}
                        type="number"
                        value={currentValues.max}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, max: Number(e.target.value) }))}
                        fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} inputProps={{ min: 0 }}
                        error={
                            currentValues.max < currentValues.min ||
                            currentValues.max < currentValues.estimatedNumber
                        }
                        helperText={
                            currentValues.max < currentValues.min
                                ? "Maksimum değer minimumdan az olamaz."
                                : currentValues.max < currentValues.estimatedNumber
                                    ? "Maksimum değer Tahmini Sayıdan az olamaz (en az Tahmini kadar olmalı)."
                                    : ""
                        }
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
