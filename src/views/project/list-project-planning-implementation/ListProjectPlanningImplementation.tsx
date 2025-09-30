// ListProjectPlanningImplementation.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Autocomplete, RadioGroup, FormControlLabel, Radio,
    Stepper, Step, StepLabel, Divider,
} from '@mui/material';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX,
    IconPlus, IconEye, IconChecks,
    IconArrowRight
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteProjectPlanningImplementation from './DeleteProjectPlanningImplementation';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { useAuth } from 'src/context/AuthContext';
import { IconArrowBack } from "@tabler/icons-react";


// =========================================================================
// ************************* Styled Components & Types ***********************
// =========================================================================

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
interface PlanningType {
    id: number;
    // title: string; // این عنوان خود پلنینگ است
    createAt: string;
    recordStatus: number;
    status: string;
    startDate: string;
    endDate: string;
    // اضافه شدن ساختار پروژه مادر
    project: {
        id: string;
        title: string; // نام پروژه مادر (مثلاً "fadak")
    };
    compositeTitle: string;
}

interface ForceMajorType {
    id: number;
    title: string;
    createAt: string;
    recordStatus: number;
    status: string;
}

interface ImplementationValue {
    amount?: number;
    item?: string;
    from?: string;
    to?: string;
    lang?: string;
    lat?: string;
    attachment?: string;
}

interface ProjectPlanningImplementationType {
    id: number;
    projectPlanningId: number;
    forceMajorId?: number;
    startDate: string;
    endDate: string;
    description: string;
    planningStatus: number;
    projectPlanning: {
        id: number;
        title: string;
        startDate?: string;
        endDate?: string;
    };
    forceMajor?: {
        id: number;
        title: string;
    };
    kaziYapilanDirekSayisi?: ImplementationValue;
    altMontajiYapilanDirekSayisi?: ImplementationValue;
    betonAtilanDirekSayisi?: ImplementationValue;
    ustMontajiOrulenDirekSayisi?: ImplementationValue;
    ustMontajiKurulanDirekSayisi?: ImplementationValue;
    dikilenBetonDirekSayisi?: ImplementationValue;
    iletkenCekilenDirekSayisi?: ImplementationValue;
    ayiriciTakilanDirekSayisi?: ImplementationValue;
    dikilenAydinlatmaDirekSayisi?: ImplementationValue;
    kabloKanali?: ImplementationValue;
    cekilenKabloMiktari?: ImplementationValue;
    transformator?: ImplementationValue;
    dagitimPanosu?: ImplementationValue;
    sahaDagTMKutusu?: ImplementationValue;
    betonKosk?: ImplementationValue;
    hucre?: ImplementationValue;
}

const IMPLEMENTATION_FIELDS: { key: keyof Omit<ProjectPlanningImplementationType, 'id' | 'projectPlanningId' | 'forceMajorId' | 'startDate' | 'endDate' | 'description' | 'planningStatus' | 'projectPlanning' | 'forceMajor'>, label: string }[] = [
    { key: 'kaziYapilanDirekSayisi', label: 'Kazı Yapılan Direk Sayısı' },
    { key: 'altMontajiYapilanDirekSayisi', label: 'Alt Montajı Yapılan Direk Sayısı' },
    { key: 'betonAtilanDirekSayisi', label: 'Beton Atılan Direk Sayısı' },
    { key: 'ustMontajiOrulenDirekSayisi', label: 'Üst Montajı Örülen Direk Sayısı' },
    { key: 'ustMontajiKurulanDirekSayisi', label: 'Üst Montajı Kurulan Direk Sayısı' },
    { key: 'dikilenBetonDirekSayisi', label: 'Dikilen Beton Direk Sayısı' },
    { key: 'iletkenCekilenDirekSayisi', label: 'İletken Çekilen Direk Sayısı' },
    { key: 'ayiriciTakilanDirekSayisi', label: 'Ayırıcı Takılan Direk Sayısı' },
    { key: 'dikilenAydinlatmaDirekSayisi', label: 'Dikilen Aydınlatma Direk Sayısı' },
    { key: 'kabloKanali', label: 'Kablo Kanalı' },
    { key: 'cekilenKabloMiktari', label: 'Çekilen Kablo Miktarı' },
    { key: 'transformator', label: 'Transformatör' },
    { key: 'dagitimPanosu', label: 'Dağıtım Panosu' },
    { key: 'sahaDagTMKutusu', label: 'Saha Dağ TM Kutusu' },
    { key: 'betonKosk', label: 'Beton Köşk' },
    { key: 'hucre', label: 'Hücre' },
];

const STEPS = ['Proje Planlama Seçimi', 'Zamanlama ve Ana Detaylar', 'Operasyonel Değer Girişi', 'İnceleme ve Onay'];

// توابع مرتب‌سازی (بدون تغییر)
const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
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

const getComparator = <Key extends keyof ProjectPlanningImplementationType>(order: 'asc' | 'desc', orderBy: Key): (a: ProjectPlanningImplementationType, b: ProjectPlanningImplementationType) => number => {
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


// =========================================================================
// ****************************** Main Component *****************************
// =========================================================================

const ListProjectPlanningImplementation = () => {
    const navigate = useNavigate();

    // State Management
    const [projectPlanningsList, setProjectPlanningsList] = useState<PlanningType[]>([]);
    const [forceMajorsList, setForceMajorsList] = useState<ForceMajorType[]>([]);
    const [implementationsList, setImplementationsList] = useState<ProjectPlanningImplementationType[]>([]);

    const [selectedProjectPlanning, setSelectedProjectPlanning] = useState<PlanningType | null>(null);
    const [selectedForceMajor, setSelectedForceMajor] = useState<ForceMajorType | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [description, setDescription] = useState<string>('');
    // 0: Başladı, 1: Tamamlandı, 2: Durduruldu, 3: Devam Ediyor
    const [planningStatus, setPlanningStatus] = useState<'0' | '1' | '2' | '3'>('3');

    const [formData, setFormData] = useState<Record<string, ImplementationValue>>({});
    const [filesToUpload, setFilesToUpload] = useState<Record<string, File | null>>({});

    const [editingId, setEditingId] = useState<number | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // UI States
    const [activeStep, setActiveStep] = useState(0);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [isBlinking, setIsBlinking] = useState(true);

    // Table States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ProjectPlanningImplementationType | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [implementationIdToDelete, setImplementationIdToDelete] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<keyof ProjectPlanningImplementationType>('startDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [detailData, setDetailData] = useState<ProjectPlanningImplementationType | null>(null);

    // Value Modal States
    const [openValueModal, setOpenValueModal] = useState(false);
    const [currentField, setCurrentField] = useState<string | null>(null);
    const [currentValues, setCurrentValues] = useState<ImplementationValue>({ amount: 0, item: '', from: '', to: '', lang: '', lat: '', attachment: '' });

    const openMenu = Boolean(anchorEl);

    // Auth & Tooltip
    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // Handlers
    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };
    const clearAlert = () => setAlertMessage(null);

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 0: return 'Başladı';
            case 1: return 'Tamamlandı';
            case 2: return 'Durduruldu';
            case 3: return 'Devam Ediyor';
            default: return 'Bilinmiyor';
        }
    };

    const resetFormAndState = () => {
        setSelectedProjectPlanning(null);
        setSelectedForceMajor(null);
        setStartDate(null);
        setEndDate(null);
        setDescription('');
        setPlanningStatus('3'); // پیش‌فرض: Devam Ediyor
        setFormData({});
        setEditingId(null);
        setActiveStep(0);
        setIsFormVisible(false);
        clearAlert();
    };

    // Stepper Handlers
    const handleStepChange = (step: number) => {
        if (step >= 0 && step < STEPS.length) {
            setActiveStep(step);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNext = () => {
        clearAlert();
        // Geliştirme Notu: Adım 0 ve Adım 1'deki kontroller yerinde kalır.

        if (activeStep === 0) {
            if (!selectedProjectPlanning) {
                showAlert('Lütfen bir proje planlaması seçin.', 'warning');
                return;
            }
        }

        if (activeStep === 1) {
            const minDate = selectedProjectPlanning ? new Date(selectedProjectPlanning.startDate) : null;
            const maxDate = selectedProjectPlanning ? new Date(selectedProjectPlanning.endDate) : null;

            if (!startDate || !endDate) {
                showAlert('Lütfen Başlangıç ve Bitiş Tarihlerini girin.', 'warning');
                return;
            }
            if (startDate > endDate || (minDate && startDate < minDate) || (maxDate && endDate > maxDate)) {
                showAlert('Geçerli bir tarih aralığı seçin (Planlama sınırları içinde olmalıdır).', 'warning');
                return;
            }
        }

        // **Nokta 1: Operasyonel Değer Girişi (Adım 2) Kontrolü**
        if (activeStep === 2) {
            // بررسی می‌کنیم که آیا هر فیلد در لیست ثابت IMPLEMENTATION_FIELDS
            // در formData وجود دارد و مقدار amount آن > 0 است.
            const allFieldsMandatoryFilled = IMPLEMENTATION_FIELDS.every(field => {
                const data = formData[field.key];
                return data && data.amount !== undefined && data.amount > 0;
            });

            if (!allFieldsMandatoryFilled) {
                showAlert('Devam etmek için listedeki **tüm** operasyonel maddelere (miktar > 0 olacak şekilde) değer girilmesi zorunludur.', 'error');
                return;
            }
        }

        handleStepChange(activeStep + 1);
    };
    const handleBack = () => {
        handleStepChange(activeStep - 1);
    };

    // Value Modal Handlers
    const handleOpenValueModal = (fieldKey: string) => {
        setCurrentField(fieldKey);
        // مقداردهی اولیه از formData در صورت وجود
        const existingData = formData[fieldKey] || { amount: 0, item: '', from: '', to: '', lang: '', lat: '', attachment: '' };
        // اطمینان از مقداردهی amount
        if (existingData.amount === undefined) existingData.amount = 0;

        setCurrentValues(existingData);
        setOpenValueModal(true);
    };
    const handleCloseValueModal = () => {
        setOpenValueModal(false);
        setCurrentField(null);
        setCurrentValues({ amount: 0, item: '', from: '', to: '', lang: '', lat: '', attachment: '' });
    };
    const handleSaveValue = () => {
        if (currentField) {
            const amount = Number(currentValues.amount);
            if (isNaN(amount) || amount < 0) {
                showAlert('Miktar negatif olamaz veya geçerli bir sayı olmalıdır.', 'error');
                return;
            }

            // اگر مقدار صفر بود، فیلد را حذف کنید
            if (amount === 0) {
                // اگر مقدار صفر است: فیلد را از formData حذف کن و فایل را از filesToUpload پاک کن
                setFormData(prev => {
                    const newState = { ...prev };
                    delete newState[currentField];
                    return newState;
                });
                setFilesToUpload(prev => {
                    const newState = { ...prev };
                    delete newState[currentField];
                    return newState;
                });
            } else {
                setFormData(prev => ({ ...prev, [currentField]: { ...currentValues, amount } }));
            }
            handleCloseValueModal();
        }
    };


    const getListPlannings = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-project-plannings", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const formattedData = response.data.data.map((item: any) => {
                    const projectTitle = item.project?.title || 'Projeye Ait Planlama';
                    const startDateFormatted = item.startDate ? format(new Date(item.startDate), 'dd/MM/yyyy', { locale: tr }) : 'Tarih Belirtilmemiş';
                    const endDateFormatted = item.endDate ? format(new Date(item.endDate), 'dd/MM/yyyy', { locale: tr }) : 'Tarih Belirtilmemiş';

                    return {
                        ...item,
                        status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                        // ایجاد عنوان ترکیبی مورد نیاز شما
                        compositeTitle: `${projectTitle} (Başlangıç: ${startDateFormatted} - Bitiş: ${endDateFormatted})`,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        project: item.project,
                    };
                });
                setProjectPlanningsList(formattedData as PlanningType[]);
            } else {
                showAlert(response.data.message || 'Planlama listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Planlama listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        }
    }, [navigate]);

    const getListForceMajors = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-force-majors", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const formattedData = response.data.data
                    .filter((item: any) => item.recordStatus === 0)
                    .map((item: any) => ({
                        id: item.id,
                        title: item.title,
                        recordStatus: item.recordStatus,
                        createAt: item.createAt,
                        status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    }));
                setForceMajorsList(formattedData as ForceMajorType[]);
            } else {
                showAlert(response.data.message || 'Operasyon listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Operasyon listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    const getListImplementations = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-project-planning-Implementation", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const formattedData = response.data.data.map((item: any) => ({
                    ...item,
                    status: item.planningStatus === 0 ? 'Aktif' : 'Pasif',
                    projectPlanning: {
                        ...item.projectPlanning,
                        startDate: item.projectPlanning.startDate,
                        endDate: item.projectPlanning.endDate,
                    }
                }));
                setImplementationsList(formattedData as ProjectPlanningImplementationType[]);
            } else {
                showAlert(response.data.message || 'Uygulama listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Uygulama listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    const uploadFilesHandler = async (): Promise<Record<string, string>> => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return {}; // یا خطا پرتاب کند

        const filesToUploadArray = [];
        const fileKeys: string[] = []; // کلیدهای عملیاتی مربوط به فایل‌ها

        // 1. فایل‌هایی که باید آپلود شوند را جمع‌آوری می‌کند.
        for (const key in filesToUpload) {
            const file = filesToUpload[key];
            if (file) {
                filesToUploadArray.push(file);
                fileKeys.push(key);
            }
        }

        if (filesToUploadArray.length === 0) {
            return {};
        }

        const uploadFormData = new FormData();
        filesToUploadArray.forEach(file => uploadFormData.append('files', file));

        try {
            const uploadResponse = await axios.post(
                server.baseurl + server.baseinfo + "upload-files",
                uploadFormData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            if (uploadResponse.data.httpStatusCode === 201) {
                const fileUrls: string[] = uploadResponse.data.data.files;

                // نگاشت URLهای برگشتی به کلیدهای عملیاتی
                const uploadedFileUrlsMap: Record<string, string> = {};
                fileUrls.forEach((url, index) => {
                    uploadedFileUrlsMap[fileKeys[index]] = url;
                });

                return uploadedFileUrlsMap;

            } else {
                showAlert('Dosyalar yüklenirken bir hata oluştu: ' + (uploadResponse.data.message || 'Bilinmeyen Hata'), 'error');
                throw new Error("Dosya yükleme başarısız.");
            }
        } catch (e: any) {
            showAlert('Dosya yükleme sırasında bağlantı hatası: ' + (e.response?.data?.message || 'Lütfen tekrar deneyin.'), 'error');
            throw new Error("Dosya yükleme sırasında bağlantı hatası.");
        }
    };

    const buildFullPayload = (uploadedFilesMap: Record<string, string>) => {
        const fullFormData = IMPLEMENTATION_FIELDS.reduce((acc, field) => {
            const key = field.key;
            const existingData = formData[key] || {};

            // اگر فایل آپلود شده، از URL آن استفاده کن، در غیر این صورت از نام فایل موجود در existingData استفاده کن.
            const attachmentUrl = uploadedFilesMap[key] || existingData.attachment || '';

            acc[key] = {
                amount: existingData.amount || 0,
                item: existingData.item || '',
                from: existingData.from || '',
                to: existingData.to || '',
                lang: existingData.lang || '',
                lat: existingData.lat || '',
                attachment: attachmentUrl,
            };
            return acc;
        }, {} as Record<string, ImplementationValue>);

        return fullFormData;
    };

    const insertImplementation = async () => {
        if (!selectedProjectPlanning || !startDate || !endDate) {
            showAlert('Lütfen tüm gerekli alanları doldurunuz!', 'warning');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        try {
            // 1. فایل‌ها را آپلود کرده و نگاشت URL را دریافت کن
            const uploadedFileUrlsMap = await uploadFilesHandler();

            // 2. Payload نهایی را با تمام فیلدها و URLهای فایل بساز
            const finalFormData = buildFullPayload(uploadedFileUrlsMap);

            const payload = {
                projectPlanningId: Number(selectedProjectPlanning.id),
                forceMajorId: selectedForceMajor ? Number(selectedForceMajor.id) : null,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                description: description,
                planningStatus: Number(planningStatus),
                ...finalFormData,
            };
            debugger
            // 3. ارسال درخواست POST
            const response = await axios.post(
                server.baseurl + server.warehouse + "create-project-planning-implementation",
                payload,
                { headers: { "Accept": "application/json", 'Content-Type': 'application/json', "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni uygulama kaydı başarıyla eklendi!', 'success');
                resetFormAndState();
                getListImplementations();
            } else {
                showAlert(response.data.message || 'Yeni uygulama kaydı eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            // خطا توسط uploadFilesHandler پرتاب شده یا خطای API اصلی است
            if (!(e instanceof Error && e.message.includes("Dosya yükleme"))) {
                showAlert(e.response?.data?.message || 'Uygulama kaydı eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    const editImplementation = async () => {
        if (!editingId || !selectedProjectPlanning || !startDate || !endDate) {
            showAlert('Lütfen tüm gerekli alanları doldurunuz!', 'warning');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        try {
            // 1. فایل‌ها را آپلود کرده و نگاشت URL را دریافت کن
            const uploadedFileUrlsMap = await uploadFilesHandler();

            // 2. Payload نهایی را با تمام فیلدها و URLهای فایل بساز
            const finalFormData = buildFullPayload(uploadedFileUrlsMap);

            const payload = {
                id: editingId,
                projectPlanningId: Number(selectedProjectPlanning.id),
                forceMajorId: selectedForceMajor ? Number(selectedForceMajor.id) : null,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                description: description,
                planningStatus: Number(planningStatus),
                ...finalFormData,
            };

            // 3. ارسال درخواست PUT
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-project-planning-implementation",
                payload,
                { headers: { "Accept": "application/json", 'Content-Type': 'application/json', "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Uygulama kaydı başarıyla güncellendi!', 'success');
                resetFormAndState();
                getListImplementations();
            } else {
                showAlert(response.data.message || 'Uygulama kaydı güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            }
            else if (!(e instanceof Error && e.message.includes("Dosya yükleme"))) {
                showAlert(e.response?.data?.message || 'Uygulama kaydı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-project-planning-implementation",
                { id: Number(id), planningStatus: statusValue },
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = getStatusLabel(statusValue);
                showAlert(`Uygulama kaydı başarıyla "${statusText}" olarak ayarlandı!`, 'success');
                getListImplementations();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            handleCloseMenu();
        }
    };

    const handleEditClick = () => {
        if (selectedRowForMenu) {

            // 1. Planlama Objesini Bulma (تاریخ‌ها باید وجود داشته باشند)
            const projectPlanningWithDates = projectPlanningsList.find(p => p.id === selectedRowForMenu.projectPlanningId) || selectedRowForMenu.projectPlanning;

            // 2. Force Major'ı Güvenli Şekilde Ayarlama
            // ForceMajorType yapısına tam olarak uyan bir obje oluşturulur.
            const forceMajorData: ForceMajorType | null = selectedRowForMenu.forceMajor
                ? {
                    id: selectedRowForMenu.forceMajor.id,
                    title: selectedRowForMenu.forceMajor.title,
                    // فرض می‌شود که اگر آبجکت forceMajor موجود باشد، بقیه فیلدها را می‌توان با مقادیر پیش‌فرض یا جستجو پر کرد
                    createAt: '',
                    recordStatus: 0,
                    status: 'Aktif'
                }
                : null;

            setEditingId(selectedRowForMenu.id);
            // setSelectProjectPlanning yapısını ProjectPlanningType olarak tanımlayınız.
            setSelectedProjectPlanning(projectPlanningWithDates as PlanningType);
            setSelectedForceMajor(forceMajorData); // <-- حالا از نوع صحیح است

            // 3. تنظیم تاریخ‌ها و توضیحات (بدون تغییر)
            setStartDate(new Date(selectedRowForMenu.startDate));
            setEndDate(new Date(selectedRowForMenu.endDate));
            setDescription(selectedRowForMenu.description);
            setPlanningStatus(selectedRowForMenu.planningStatus.toString() as '0' | '1' | '2' | '3');

            // 4. پر کردن formData (مطابق پاسخ‌های قبلی)
            const newFormData = IMPLEMENTATION_FIELDS.reduce((acc, field) => {
                const key = field.key;
                if (selectedRowForMenu[key] && selectedRowForMenu[key]?.amount !== undefined && selectedRowForMenu[key]?.amount > 0) {
                    acc[key] = selectedRowForMenu[key] as ImplementationValue;
                }
                return acc;
            }, {} as Record<string, ImplementationValue>);
            setFormData(newFormData);

            setIsFormVisible(true);
            setActiveStep(0);
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
        }
        handleCloseMenu();
        clearAlert();
    };
    // ... سایر Handlers (Menu, Delete, Details, Download, Table pagination/sort) ...
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ProjectPlanningImplementationType) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setImplementationIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => { setOpenDeleteModal(false); setImplementationIdToDelete(null); getListImplementations(); };
    const handleShowDetails = () => {
        if (selectedRowForMenu) {
            setDetailData(selectedRowForMenu);
            setOpenDetailModal(true);
        }
        handleCloseMenu();
    };
    const handleCloseDetailModal = () => setOpenDetailModal(false);
    const handleSetActive = () => { if (selectedRowForMenu) { sendStatusUpdate(selectedRowForMenu.id, 3); } }; // Devam Ediyor
    const handleSetInactive = () => { if (selectedRowForMenu) { sendStatusUpdate(selectedRowForMenu.id, 2); } }; // Durduruldu
    const handleDownloadPDF = (_data: ProjectPlanningImplementationType[]) => { showAlert("PDF İndiriliyor (Test)", "info"); };
    const handleExportExcel = async (_data: ProjectPlanningImplementationType[]) => { showAlert("Excel İndiriliyor (Test)", "info"); };
    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); setPage(0); };
    const handleRequestSort = (property: keyof ProjectPlanningImplementationType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    // Effects & Memoizations
    useEffect(() => {
        getListPlannings();
        getListForceMajors();
        getListImplementations();
    }, [getListPlannings, getListForceMajors, getListImplementations]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) { timer = setTimeout(() => clearAlert(), 5000); }
        return () => clearTimeout(timer);
    }, [alertMessage]);

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Filter & Sort
    const filteredImplementations = implementationsList.filter(implementation => {
        const matchesSearch = implementation.projectPlanning?.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && implementation.planningStatus !== 1) || // Aktif/Devam Ediyor/Başladı (0, 3)
            (statusFilter === 'inactive' && (implementation.planningStatus === 1 || implementation.planningStatus === 2)); // Tamamlandı/Durduruldu (1, 2)
        return matchesSearch && matchesStatus;
    });
    const sortedAndFilteredImplementations = stableSort(filteredImplementations, getComparator(order, orderBy));
    const paginatedImplementations = sortedAndFilteredImplementations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


    const ImplementationValueChips = ({ values }: { values: ImplementationValue }) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'flex-start', alignItems: 'center' }}>
            {values.amount !== undefined && values.amount > 0 && <Chip label={`Miktar: ${values.amount}`} color="success" size="small" />}
            {values.item && <Chip label={`Öğe: ${values.item}`} color="primary" size="small" />}
            {values.from && <Chip label={`Başlangıç: ${values.from}`} color="secondary" size="small" />}
            {values.to && <Chip label={`Bitiş: ${values.to}`} color="secondary" size="small" />}
            {values.lang && <Chip label={`Enlem: ${values.lang}`} color="info" size="small" />}
            {values.lat && <Chip label={`Boylam: ${values.lat}`} color="info" size="small" />}
            {values.attachment && <Chip label={`Ek: ${values.attachment}`} color="warning" size="small" />}
        </Box>
    );

    const renderStepContent = (step: number) => {
        const selectedPlanning = selectedProjectPlanning;

        switch (step) {
            case 0:
                // Geliştirme Notu: Autocomplete'teki value={selectedPlanning} ve options={projectPlanningsList} ile isOptionEqualToValue ayarları, verilerin görünmesi için yeterlidir.
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="project-planning-select" required>
                                Seçilen Proje için Planlamayı Seçin
                            </CustomFormLabel>
                            <Autocomplete
                                id="project-planning-select"
                                options={projectPlanningsList.filter(p => p.recordStatus === 0)}
                                // استفاده از عنوان ترکیبی جدید
                                getOptionLabel={(option) => option.compositeTitle}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                value={selectedPlanning}
                                onChange={(_event, newValue) => { setSelectedProjectPlanning(newValue); clearAlert(); }}
                                renderInput={(params) => <TextField {...params} fullWidth placeholder="Proje Adı veya Tarih Aralığı Ara" size="small" />}
                            />
                        </Grid>
                        {selectedPlanning && (
                            <Grid item xs={12}>
                                <Alert severity="info" variant="outlined">
                                    <Typography variant="subtitle1">Ana Planlama Tarihleri:</Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={1}>
                                        <Chip label={`Plan Başlangıcı: ${format(new Date(selectedPlanning.startDate), 'dd MMMM yyyy', { locale: tr })}`} color="primary" />
                                        <Chip label={`Plan Bitişi: ${format(new Date(selectedPlanning.endDate), 'dd MMMM yyyy', { locale: tr })}`} color="primary" />
                                    </Stack>
                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>Uygulama tarih aralığınız bu sınırlar içinde olmalıdır.</Typography>
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                );
            case 1:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="force-major-select">Mücbir Sebep (İsteğe Bağlı)</CustomFormLabel>
                            <Autocomplete
                                id="force-major-select"
                                options={forceMajorsList.filter(fm => fm.recordStatus === 0)}
                                getOptionLabel={(option) => option.title}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                value={selectedForceMajor}
                                onChange={(_event, newValue) => { setSelectedForceMajor(newValue); }}
                                renderInput={(params) => <TextField {...params} fullWidth placeholder="Mücbir Sebep Ara" size="small" />}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel>Uygulama Durumu</CustomFormLabel>
                            <RadioGroup row value={planningStatus} onChange={(e) => setPlanningStatus(e.target.value as '0' | '1' | '2' | '3')}>
                                <FormControlLabel value="3" control={<Radio />} label="Devam Ediyor" />
                                <FormControlLabel value="0" control={<Radio />} label="Başladı" />
                                <FormControlLabel value="1" control={<Radio />} label="Tamamlandı" />
                                <FormControlLabel value="2" control={<Radio />} label="Durduruldu" />
                            </RadioGroup>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="start-date" required>Uygulama Başlangıç Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                <DatePicker
                                    value={startDate}
                                    onChange={(newValue) => setStartDate(newValue)}
                                    inputFormat="dd/MM/yyyy"
                                    minDate={selectedPlanning ? new Date(selectedPlanning.startDate) : undefined}
                                    maxDate={selectedPlanning ? new Date(selectedPlanning.endDate) : undefined}
                                    renderInput={(params) => (<TextField {...params} fullWidth size="small" />)}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel htmlFor="end-date" required>Uygulama Bitiş Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                <DatePicker
                                    value={endDate}
                                    onChange={(newValue) => setEndDate(newValue)}
                                    inputFormat="dd/MM/yyyy"
                                    minDate={startDate || (selectedPlanning ? new Date(selectedPlanning.startDate) : undefined)}
                                    maxDate={selectedPlanning ? new Date(selectedPlanning.endDate) : undefined}
                                    renderInput={(params) => (<TextField {...params} fullWidth size="small" />)}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="description">Açıklama</CustomFormLabel>
                            <CustomTextField id="description" value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} multiline rows={4} fullWidth />
                        </Grid>
                    </Grid>
                );
            case 2:
                // Geliştirme Notu: Her bir Implementation Field bir kart olarak gösteriliyor.
                return (
                    <Grid container spacing={3}>
                        {IMPLEMENTATION_FIELDS.map(field => {
                            // const hasValue = formData[field.key] && formData[field.key].amount !== undefined && formData[field.key].amount > 0;
                            const valueObject = formData[field.key];
                            const hasValue = valueObject && valueObject.amount !== undefined && valueObject.amount > 0;

                            return (
                                <Grid item xs={12} sm={6} md={3} key={field.key}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <CustomFormLabel sx={{ mb: hasValue ? 0 : 1 }}>{field.label}</CustomFormLabel>

                                        <Stack direction="row" justifyContent="center" alignItems="center" sx={{ position: "relative", top: "12px" }}>
                                            {hasValue && (
                                                <IconButton onClick={(e) => { e.stopPropagation(); handleOpenValueModal(field.key); }} size="small">
                                                    <IconEdit size={16} color="gray" />
                                                </IconButton>
                                            )}
                                        </Stack>
                                    </Box>

                                    <Box
                                        onClick={() => handleOpenValueModal(field.key)}
                                        sx={{
                                            border: hasValue ? '2px solid rgba(1, 209, 95, 0.77)' : '2px dashed lightgray',
                                            bgcolor: hasValue ? 'rgba(1, 209, 95, 0.1)' : 'transparent',
                                            borderRadius: '8px',
                                            p: 2,
                                            minHeight: '120px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': { boxShadow: '0px 0px 8px rgba(0,0,0,0.1)' }
                                        }}
                                    >

                                        {hasValue ? (
                                            <ImplementationValueChips values={formData[field.key]} />
                                        ) : (
                                            <Stack alignItems="center" justifyContent="center" height="95px">
                                                <IconPlus size={32} color="lightgray" />
                                            </Stack>
                                        )}
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                );
            case 3:
                const projectTitle = selectedPlanning?.project?.title || 'Proje Adı Bulunamadı';
                const planningCompositeTitle = selectedPlanning?.compositeTitle || 'Planlama Detayı Bulunamadı';

                return (
                    <BlankCard>
                        <Box p={3}>
                            <Typography variant="h6" gutterBottom>Uygulama Bilgileri Özeti</Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={12}><Typography variant="subtitle1">Proje Adı: {projectTitle}</Typography></Grid>
                                <Grid item xs={12}><Typography variant="subtitle1">Seçilen Planlama: {planningCompositeTitle}</Typography></Grid>

                                <Grid item xs={12} sm={6}><Typography variant="body2">Başlangıç Tarihi: {startDate ? format(startDate, 'dd MMMM yyyy', { locale: tr }) : '-'}</Typography></Grid>
                                <Grid item xs={12} sm={6}><Typography variant="body2">Bitiş Tarihi: {endDate ? format(endDate, 'dd MMMM yyyy', { locale: tr }) : '-'}</Typography></Grid>
                                <Grid item xs={12} sm={6}><Typography variant="body2">Mücbir Sebep: {selectedForceMajor?.title || 'Yok'}</Typography></Grid>
                                <Grid item xs={12} sm={6}><Typography variant="body2">Durum: {getStatusLabel(Number(planningStatus))}</Typography></Grid>
                                <Grid item xs={12}><Typography variant="body2">Açıklama: {description || 'Yok'}</Typography></Grid>

                                <Grid item xs={12} sx={{ mt: 3 }}>
                                    <Typography variant="h6" gutterBottom>Kaydedilen Operasyonel Değerler</Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    {IMPLEMENTATION_FIELDS.map(field => {
                                        const values = formData[field.key];
                                        return values && values.amount !== undefined && values.amount > 0 && (
                                            <Box key={field.key} mb={2} p={1} sx={{ borderLeft: '3px solid green', bgcolor: 'rgba(1, 209, 95, 0.05)' }}>
                                                <Typography variant="subtitle2">{field.label}</Typography>
                                                <ImplementationValueChips values={values} />
                                            </Box>
                                        );
                                    })}
                                    {Object.keys(formData).length === 0 && (
                                        <Alert severity="warning">Henüz hiçbir operasyonel değer kaydedilmedi.</Alert>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    </BlankCard>
                );
            default:
                return null;
        }
    };

    // =========================================================================
    // ****************************** JSX Render *********************************
    // =========================================================================

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>
                    <Typography variant="h5">{editingId ? 'Proje Uygulamasını Düzenle' : 'Yeni Proje Uygulaması Kaydet'}</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni proje uygulama kaydı kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} fullWidth={false} startIcon={<IconPlus size={20} />}>
                                    Yeni Uygulama Kaydı
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button variant="contained" color="error" onClick={resetFormAndState} fullWidth={false} startIcon={<IconX size={20} />}>
                                    Formu Gizle
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>

                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}

                {/* Stepper Form */}
                {isFormVisible && ((hasCreatePermission && editingId === null) || (editingId && hasEditPermission)) && (
                    <Box sx={{ width: '100%', mt: 3 }}>
                        {/* Devam/Geri Butonları Üstte */}
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Button variant="contained" color="error" disabled={activeStep === 0}
                                onClick={handleBack} startIcon={<IconArrowBack size={20} />}>
                                Geri
                            </Button>
                            {activeStep < STEPS.length - 1 ? (
                                <Button onClick={handleNext} variant="contained" color="primary"
                                    endIcon={<IconArrowRight />}>
                                    Devam
                                </Button>
                            ) : (
                                <CustomTooltip title={isTooltipGloballyEnabled ? `${editingId ? 'Düzenlemeyi' : 'Kaydı'} onaylayın` : ""}>
                                    <Button
                                        variant="contained"
                                        color={editingId ? 'info' : 'success'}
                                        onClick={editingId ? editImplementation : insertImplementation}
                                        disabled={loadingButton}
                                        startIcon={loadingButton ? <CircularProgress size={20} color="inherit" /> : <IconChecks size={20} />}
                                    >
                                        {loadingButton ? 'İşleniyor...' : editingId ? 'Onayla ve Düzenle' : 'Onayla ve Kaydet'}
                                    </Button>
                                </CustomTooltip>
                            )}
                        </Stack>

                        {/* Stepper Başlık ve Tıklanabilir Adımlar */}
                        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                            {STEPS.map((label, index) => (
                                <Step key={label} onClick={() => handleStepChange(index)} completed={activeStep > index} sx={{ cursor: 'pointer' }}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>


                        <Box sx={{ mt: 4, mb: 2 }}>
                            {renderStepContent(activeStep)}
                        </Box>


                        {/* Devam/Geri Butonları Üstte */}
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Button variant="contained" color="error" disabled={activeStep === 0}
                                onClick={handleBack} startIcon={<IconArrowBack size={20} />}>
                                Geri
                            </Button>
                            {activeStep < STEPS.length - 1 ? (
                                <Button onClick={handleNext} variant="contained" color="primary"
                                    endIcon={<IconArrowRight />}>
                                    Devam
                                </Button>
                            ) : (
                                <CustomTooltip title={isTooltipGloballyEnabled ? `${editingId ? 'Düzenlemeyi' : 'Kaydı'} onaylayın` : ""}>
                                    <Button
                                        variant="contained"
                                        color={editingId ? 'info' : 'success'}
                                        onClick={editingId ? editImplementation : insertImplementation}
                                        disabled={loadingButton}
                                        startIcon={loadingButton ? <CircularProgress size={20} color="inherit" /> : <IconChecks size={20} />}
                                    >
                                        {loadingButton ? 'İşleniyor...' : editingId ? 'Onayla ve Düzenle' : 'Onayla ve Kaydet'}
                                    </Button>
                                </CustomTooltip>
                            )}
                        </Stack>


                        {/* Butonlar Altta (Yedek) - Üstteki butonu bıraktık */}
                    </Box>
                )}
            </div>

            <Divider />

            {/* Liste ve Tablo Bölümü (Türkçe Metinler) */}
            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
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
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Uygulama Ara (Planlama Adı)"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={(_event, newFilter) => newFilter !== null && setStatusFilter(newFilter)} aria-label="Status filter" fullWidth>
                                <StyledToggleButton value="all" aria-label="all plannings">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active plannings">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive plannings">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    <Table aria-label="implementation table">
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell><TableSortLabel active={orderBy === 'projectPlanning'} direction={orderBy === 'projectPlanning' ? order : 'asc'} onClick={() => handleRequestSort('projectPlanning')} style={{ color: "#171c23" }}><Typography variant="h6">Proje Planlama Adı</Typography></TableSortLabel></StyledTableCell>
                                <StyledTableCell><TableSortLabel active={orderBy === 'startDate'} direction={orderBy === 'startDate' ? order : 'asc'} onClick={() => handleRequestSort('startDate')} style={{ color: "#171c23" }}><Typography variant="h6">Başlangıç Tarihi</Typography></TableSortLabel></StyledTableCell>
                                <StyledTableCell><TableSortLabel active={orderBy === 'endDate'} direction={orderBy === 'endDate' ? order : 'asc'} onClick={() => handleRequestSort('endDate')} style={{ color: "#171c23" }}><Typography variant="h6">Bitiş Tarihi</Typography></TableSortLabel></StyledTableCell>
                                <StyledTableCell><TableSortLabel active={orderBy === 'planningStatus'} direction={orderBy === 'planningStatus' ? order : 'asc'} onClick={() => handleRequestSort('planningStatus')} style={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></TableSortLabel></StyledTableCell>
                                <StyledTableCell></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={5} align="center"><CircularProgress /><Typography variant="subtitle1" color="textSecondary">Uygulamalar yükleniyor...</Typography></StyledTableCell></TableRow>
                            ) : paginatedImplementations.length > 0 ? (
                                paginatedImplementations.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell><Typography variant="body1">{row.projectPlanning?.title}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{format(new Date(row.startDate), 'dd MMMM yyyy', { locale: tr })}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{format(new Date(row.endDate), 'dd MMMM yyyy', { locale: tr })}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            <Chip
                                                label={getStatusLabel(row.planningStatus)}
                                                sx={{
                                                    backgroundColor: row.planningStatus === 1 ? (theme) => theme.palette.error.light : (theme) => theme.palette.success.light,
                                                    color: row.planningStatus === 1 ? (theme) => theme.palette.error.main : (theme) => theme.palette.success.main
                                                }}
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}><IconDots width={18} /></IconButton>
                                            </CustomTooltip>
                                            <Menu id="basic-menu" anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu} MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`, }}>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Detayları görüntüle" : ""}>
                                                    <MuiMenuItem onClick={handleShowDetails}><ListItemIcon><IconEye width={18} /></ListItemIcon>Detayları Gör</MuiMenuItem>
                                                </CustomTooltip>
                                                {hasEditPermission && (selectedRowForMenu?.planningStatus !== 2 && selectedRowForMenu?.planningStatus !== 1) && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu uygulama kaydını Durduruldu yap" : ""}><MuiMenuItem onClick={handleSetInactive}><ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon>Durduruldu Yap</MuiMenuItem></CustomTooltip>
                                                )}
                                                {hasEditPermission && (selectedRowForMenu?.planningStatus === 2) && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu uygulama kaydını Devam Ediyor yap" : ""}><MuiMenuItem onClick={handleSetActive}><ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon>Devam Ediyor Yap</MuiMenuItem></CustomTooltip>
                                                )}
                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu uygulama kaydını düzenle" : ""}><MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem></CustomTooltip>
                                                )}
                                                {hasDeletePermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu uygulama kaydını sil" : ""}><MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem></CustomTooltip>
                                                )}
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç uygulama kaydı bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sortedAndFilteredImplementations.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa Başına Satır:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            {/* Delete Modal */}
            <DeleteProjectPlanningImplementation openModal={openDeleteModal} onClose={handleClickCloseDeleteModal} implementationIdToDelete={implementationIdToDelete} onDeleteSuccess={getListImplementations} showAlert={showAlert} />

            {/* Download Modal */}
            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2}>
                    <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadPDF(sortedAndFilteredImplementations)}>PDF Olarak İndir</Button>
                    <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleExportExcel(sortedAndFilteredImplementations)}>Excel Olarak İndir</Button>
                </Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            {/* Details Modal */}
            <Dialog open={openDetailModal} onClose={handleCloseDetailModal} fullWidth maxWidth="sm">
                <DialogTitle>Proje Uygulama Detayları</DialogTitle>
                <DialogContent dividers>
                    {detailData && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}><Typography variant="subtitle1">Proje Planlama: {detailData.projectPlanning?.title}</Typography></Grid>
                            <Grid item xs={12}><Typography variant="subtitle1">Mücbir Sebep: {detailData.forceMajor?.title || 'Yok'}</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2">Başlangıç Tarihi: {format(new Date(detailData.startDate), 'dd MMMM yyyy', { locale: tr })}</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2">Bitiş Tarihi: {format(new Date(detailData.endDate), 'dd MMMM yyyy', { locale: tr })}</Typography></Grid>
                            <Grid item xs={12}><Typography variant="body2">Açıklama: {detailData.description}</Typography></Grid>
                            <Grid item xs={12}><Typography variant="body2">Durum: {getStatusLabel(detailData.planningStatus)}</Typography></Grid>

                            {IMPLEMENTATION_FIELDS.map(field => {
                                const values = detailData[field.key];
                                return values && values.amount !== undefined && values.amount > 0 && (
                                    <Grid item xs={12} key={field.key}>
                                        <Typography variant="subtitle2" mt={2}>{field.label}</Typography>
                                        <ImplementationValueChips values={values} />
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDetailModal} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Value Input Modal (Genişletilmiş ve İki Sütunlu) */}
            {/* Value Input Modal (Genişletilmiş ve İki Sütunlu) */}
            <Dialog open={openValueModal} onClose={handleCloseValueModal} fullWidth maxWidth="md">
                <DialogTitle>{IMPLEMENTATION_FIELDS.find(f => f.key === currentField)?.label} için Değer Girin</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>

                        {/* Satır ۱ - Miktar ve Öğe */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel required>Miktar (Miktar)</CustomFormLabel>
                            <CustomTextField type="number" value={currentValues.amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, amount: Number(e.target.value) }))} fullWidth size="small" inputProps={{ min: 0 }} onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel>Öğe/Birim (Öğe)</CustomFormLabel>
                            <CustomTextField value={currentValues.item} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, item: e.target.value }))} fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} />
                        </Grid>

                        {/* Satır ۲ - Başlangıç ve Bitiş */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel>Başlangıç Noktası (From)</CustomFormLabel>
                            <CustomTextField value={currentValues.from} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, from: e.target.value }))} fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel>Bitiş Noktası (To)</CustomFormLabel>
                            <CustomTextField value={currentValues.to} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, to: e.target.value }))} fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} />
                        </Grid>

                        {/* Satır ۳ - Konum Bilgileri */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel>Enlem (Lang)</CustomFormLabel>
                            <CustomTextField type="text" value={currentValues.lang} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, lang: e.target.value }))} fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel>Boylam (Lat)</CustomFormLabel>
                            <CustomTextField type="text" value={currentValues.lat} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentValues(prev => ({ ...prev, lat: e.target.value }))} fullWidth size="small" onFocus={(e: React.ChangeEvent<HTMLInputElement>) => e.target.select()} />
                        </Grid>

                        {/* **Satır ۴ - Ek/Ataşman (Dosya Seçimi)** */}
                        <Grid item xs={12}>
                            <CustomFormLabel>Ek/Ataşman (Dosya Seçimi)</CustomFormLabel>
                            <Stack direction="row" spacing={1} alignItems="center">
                                {/* Hidden input for file selection */}
                                <input
                                    type="file"
                                    id={`attachment-input-${currentField}`}
                                    hidden
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        const fileName = file ? file.name : '';

                                        // 1. فایل را در State filesToUpload ذخیره کن
                                        setFilesToUpload(prev => ({ ...prev, [currentField!]: file }));

                                        // 2. نام فایل را در formData (به عنوان attachment URL/Name) ذخیره کن
                                        setCurrentValues(prev => ({ ...prev, attachment: fileName }));
                                    }}
                                />
                                {/* Button to trigger the file input */}
                                <label htmlFor={`attachment-input-${currentField}`}>
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        startIcon={<IconFileDownload size={18} />}
                                    >
                                        Dosya Seç
                                    </Button>
                                </label>
                                {/* Display the selected file name */}
                                <Typography variant="body2" color="textSecondary" noWrap>
                                    {currentValues.attachment || 'Henüz dosya seçilmedi'}
                                </Typography>
                            </Stack>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseValueModal}>İptal</Button>
                    <Button variant="contained" onClick={handleSaveValue}>Kaydet</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListProjectPlanningImplementation;