import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";

import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    Typography, Box, Stack, Grid, Button, Alert,
    CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableBody, Menu, ListItemIcon,
    TablePagination,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Dialog,
    DialogTitle,
    DialogActions,
    DialogContent,
    DialogContentText,
    Divider,
    TextField,
    InputAdornment,
    ToggleButtonGroup,
    FormControl,
    ToggleButton as MuiToggleButton,
    TableSortLabel,
    Tab,
    Autocomplete,
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { keyframes, styled } from '@mui/material/styles';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import {
    IconFileText,
    IconPlus, IconTrash, IconEdit,
    IconDots,
    IconLink, IconX,
    IconInfoCircle,
    IconSearch,
    IconFileDownload
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteRequest from './DeleteRequest';
import DeleteWorkhouseRent from './DeleteWorkhouseRent';
import { useAuth } from "src/context/AuthContext";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // ⬅️ افزودن این
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // ⬅️ افزودن این
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';


import Logo from 'src/assets/images/logos/logo.png';


interface Attachment {
    fileUrl: string;
}
interface User {
    username: string;
}
interface RequestStatusHistory {
    status: 0 | 1 | 2;
    statusDescription: string;
    createAt: string;
    user: User;
}
// ⬅️ ساختار داده برای "Malzeme Talepleri" (همان RequestType قبلی)
interface MaterialRequestType {
    id: number | string;
    subject: string;
    description: string;
    status: 0 | 1 | 2; // 0: Beklemede, 1: Onaylandı, 2: Reddedildi
    createAt: string;
    attachments: Attachment[];
    statusDescription?: string | null;
    requestStatusHistories?: RequestStatusHistory[];
}

// ⬅️ ساختار داده برای "Kiralama Talepleri" (درخواست‌های اجاره جدید)
interface Workhouse {
    id: string;
    name: string;
    code: string;
}
interface APIWorkhouse {
    id: string;
    name: string;
    code: string;
}
interface WorkhouseRentRequest {
    id: number | string;
    title: string;
    description: string;
    driverInfo: string;
    price: string;
    company: string;
    rentStartDate: string;
    rentEndDate: string;
    status: 0 | 1 | 2;
    createAt: string;
    attachments: Attachment[];
    workhouse: APIWorkhouse;

    workhouseId?: number;
    workhouseName?: string;
}

type MaterialOrder = 'asc' | 'desc';
type MaterialOrderBy = keyof MaterialRequestType | 'id' | 'subject' | 'status' | 'createAt';


const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    fontSize: '0.7rem',
    padding: '10px 4px',
    lineHeight: 1.2,
    [theme.breakpoints.up('md')]: {
        fontSize: '0.75rem',
        padding: '14px 12px',
    },
    '&.Mui-selected': { color: 'white' },
    '&.Mui-selected[data-value="all"]': { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } },
    '&.Mui-selected[data-value="0"]': { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } },
    '&.Mui-selected[data-value="1"]': { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } },
    '&.Mui-selected[data-value="2"]': { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } },
}));

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
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

// توابع کمکی مرتب‌سازی (بدون تغییر)
const descendingComparator = <T, K extends keyof T>(a: T, b: T, orderBy: K) => {
    const va = a[orderBy] as any;
    const vb = b[orderBy] as any;
    if (vb == null) return va == null ? 0 : -1;
    if (va == null) return 1;
    if (typeof vb === "string" && typeof va === "string") return vb.localeCompare(va);
    if (typeof vb === "number" && typeof va === "number") return vb - va;
    if (orderBy === 'createAt' || orderBy === 'rentStartDate' || orderBy === 'rentEndDate') {
        const dateA = Date.parse(String(va));
        const dateB = Date.parse(String(vb));
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return 0;
    }
    if (String(vb) < String(va)) return -1;
    if (String(vb) > String(va)) return 1;
    return 0;
};
const getComparator = <K extends keyof any>(order: MaterialOrder, orderBy: K) =>
    order === "desc"
        ? (a: any, b: any) => descendingComparator(a, b, orderBy)
        : (a: any, b: any) => -descendingComparator(a, b, orderBy);
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
};

// توابع کمکی وضعیت و نمایش تاریخ
const statusToLabel = (s: number) => {
    switch (s) {
        case 0: return "Beklemede";
        case 1: return "Onaylandı";
        case 2: return "Reddedildi";
        default: return "-";
    }
};
const statusToColor = (s: number): 'warning' | 'success' | 'error' | 'primary' => {
    switch (s) {
        case 0: return "warning";
        case 1: return "success";
        case 2: return "error";
        default: return "primary";
    }
};
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        // از تاریخچه کد شما:
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};
const stripHtml = (htmlString: string): string => {
    if (!htmlString) return '';
    if (typeof window === 'undefined') return htmlString;
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

// توابع کمکی PDF (بدون تغییر)
const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 50;
    const logoHeight = 25;
    const margin = 10;
    const topMargin = 20;
    const logoX = pageWidth - logoWidth - margin;
    doc.addImage(Logo, 'PNG', logoX, topMargin, logoWidth, logoHeight);
    doc.setFont('Arial', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('Arial', 'normal');
    doc.text(`Tarih Raporu:`, 15, 25);
    doc.setFont('Arial', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 25);
};
const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('Arial', 'normal');
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
    ];
    let footerY = pageHeight - 30;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 4;
    });
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};


const RequestTabs: React.FC = () => {
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();

    const [currentTab, setCurrentTab] = useState('material'); // 'material' | 'rental'

    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const idsFromState = ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState : (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
    const hasIdsFilter = notifIds.length > 0;
    const idsSet = new Set<number>(notifIds);




    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);

    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);

    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);
    const [requestsList, setRequestsList] = useState<MaterialRequestType[]>([]);
    const [materialSubject, setMaterialSubject] = useState('');
    const [materialDescription, setMaterialDescription] = useState('');
    const [materialItemToEdit, setMaterialItemToEdit] = useState<MaterialRequestType | null>(null);
    const [materialSubjectError, setMaterialSubjectError] = useState(false);
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');
    const [materialStatusFilter, setMaterialStatusFilter] = useState<'all' | 0 | 1 | 2>('all');
    const [materialOrderBy, setMaterialOrderBy] = useState<MaterialOrderBy>('createAt');
    const [materialOrder, setMaterialOrder] = useState<MaterialOrder>('desc');
    const [materialPage, setMaterialPage] = useState(0);
    const [materialRowsPerPage, setMaterialRowsPerPage] = useState(5);
    const [materialSelectedRowForMenu, setMaterialSelectedRowForMenu] = useState<MaterialRequestType | null>(null);

    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [attachmentsInEdit, setAttachmentsInEdit] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [openDeleteMaterialModal, setOpenDeleteMaterialModal] = useState(false);
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<RequestStatusHistory[]>([]);
    const [openDownloadMaterialSingleModal, setOpenDownloadMaterialSingleModal] = useState(false);

    const fetchMaterialRequests = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(
                server.baseurl + server.hr + "get-all-requests",
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setRequestsList(response.data.data);
            } else {
                showAlert(response.data.message || 'Talepler alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    useEffect(() => {
        if (currentTab === 'material') {
            fetchMaterialRequests();
        }
    }, [currentTab, fetchMaterialRequests]);


    const validateMaterialForm = (): boolean => {
        setMaterialSubjectError(false);
        if (!materialSubject.trim()) {
            setMaterialSubjectError(true);
            showAlert("Lütfen Konu/Başlık alanını doldurun.", "warning");
            return false;
        }
        return true;
    };
    const resetMaterialForm = () => {
        setMaterialSubject('');
        setMaterialDescription('');
        setFilesToUpload([]);
        setAttachmentsInEdit([]);
        setIsEditing(false);
        setMaterialItemToEdit(null);
        setMaterialSubjectError(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleMaterialEditClick = (row: MaterialRequestType) => {
        resetMaterialForm();
        setIsEditing(true);
        setMaterialItemToEdit(row);
        setMaterialSubject(row.subject);
        setMaterialDescription(row.description);
        if (row.attachments && row.attachments.length > 0) {
            const fileNames = row.attachments.map(att => att.fileUrl.split('/').pop() || '');
            setAttachmentsInEdit(fileNames);
        } else {
            setAttachmentsInEdit([]);
        }
        setIsFormVisible(true);
        handleCloseMenu();
    };

    const createMaterialRequest = async () => {
        if (!validateMaterialForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            let attachmentsPayload: Attachment[] = [];
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );
                if (uploadResponse.data.httpStatusCode === 201) {
                    const fileUrls = uploadResponse.data.data.files;
                    attachmentsPayload = fileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false); return;
                }
            }
            const payload = {
                subject: materialSubject,
                description: materialDescription,
                attachments: attachmentsPayload,
            };
            const response = await axios.post(
                server.baseurl + server.hr + "create-Request",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Talep başarıyla oluşturuldu!', 'success');
                resetMaterialForm();
                setIsFormVisible(false);
                fetchMaterialRequests();
            } else {
                showAlert(response.data.message || 'Talep oluşturulurken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const updateMaterialRequest = async () => {
        if (!validateMaterialForm() || !materialItemToEdit || !materialItemToEdit.id) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            let newAttachmentsPayload: Attachment[] = [];
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );
                if (uploadResponse.data.httpStatusCode === 201) {
                    const newFileUrls = uploadResponse.data.data.files;
                    newAttachmentsPayload = newFileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Yeni dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false); return;
                }
            }
            const keptExistingAttachments = materialItemToEdit.attachments
                .filter(att => attachmentsInEdit.includes(att.fileUrl.split('/').pop() || ''))
                .map(att => ({ fileUrl: att.fileUrl }));
            const finalAttachments = [...keptExistingAttachments, ...newAttachmentsPayload];
            const payload = {
                id: Number(materialItemToEdit.id),
                subject: materialSubject,
                description: materialDescription,
                attachments: finalAttachments,
            };
            const response = await axios.put(
                server.baseurl + server.hr + "update-request",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Talep başarıyla güncellendi!', 'success');
                resetMaterialForm();
                setIsFormVisible(false);
                fetchMaterialRequests();
            } else {
                showAlert(response.data.message || 'Talep güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const filteredMaterialRequests = useMemo(() => {
        const q = materialSearchTerm.trim().toLowerCase();
        return requestsList.filter((r) => {
            const matchesSearch =
                !q ||
                (String(r.id) ?? "").includes(q) ||
                (r.subject ?? "").toLowerCase().includes(q) ||
                (r.description ?? "").toLowerCase().includes(q);
            const matchesStatus = materialStatusFilter === 'all' || r.status === materialStatusFilter;
            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(r.id));
            return matchesSearch && matchesStatus && matchesNotifIds;
        });
    }, [requestsList, materialSearchTerm, materialStatusFilter, hasIdsFilter, idsSet]);

    const sortedMaterialRequests = useMemo(() => {
        const validOrderBy = materialOrderBy as keyof MaterialRequestType;
        return stableSort(filteredMaterialRequests, getComparator(materialOrder, validOrderBy));
    }, [filteredMaterialRequests, materialOrder, materialOrderBy]);

    const paginatedMaterialRequestsList = useMemo(() =>
        sortedMaterialRequests.slice(materialPage * materialRowsPerPage, materialPage * materialRowsPerPage + materialRowsPerPage)
        , [sortedMaterialRequests, materialPage, materialRowsPerPage]);


    // Handlers (Material)
    const handleMaterialSort = (property: MaterialOrderBy) => {
        const isAsc = materialOrderBy === property && materialOrder === "asc";
        setMaterialOrder(isAsc ? "desc" : "asc");
        setMaterialOrderBy(property);
        setMaterialPage(0);
    };
    const handleChangeMaterialPage = (_event: unknown, newPage: number) => setMaterialPage(newPage);
    const handleChangeMaterialRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMaterialRowsPerPage(parseInt(event.target.value, 10));
        setMaterialPage(0);
    };
    const handleMaterialStatusFilterChange = (_: any, v: 'all' | 0 | 1 | 2 | null) => {
        if (v !== null) {
            setMaterialStatusFilter(v as 'all' | 0 | 1 | 2);
            setMaterialPage(0);
        }
    };


    const [rentalRequestsList, setRentalRequestsList] = useState<WorkhouseRentRequest[]>([]);
    const [workhouses, setWorkhouses] = useState<Workhouse[]>([]);
    const [rentalTitle, setRentalTitle] = useState('');
    const [rentalDescription, setRentalDescription] = useState('');
    const [driverInfo, setDriverInfo] = useState('');
    const [price, setPrice] = useState<number | string>('');
    const [company, setCompany] = useState('');
    const [rentStartDate, setRentStartDate] = useState<Date | null>(null); // ⬅️ تغییر داده شد
    const [rentEndDate, setRentEndDate] = useState<Date | null>(null);
    const [rentStartDateError, setRentStartDateError] = useState(false);
    const [rentEndDateError, setRentEndDateError] = useState(false);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | string>('');

    const [rentalSearchTerm, setRentalSearchTerm] = useState('');
    const [rentalStatusFilter, setRentalStatusFilter] = useState<'all' | 0 | 1 | 2>('all');
    const [selectedRentalWorkhouseId, setSelectedRentalWorkhouseId] = useState<number | string>(''); // برای فیلتر جدول
    const [rentalOrderBy, setRentalOrderBy] = useState<keyof WorkhouseRentRequest>('createAt');
    const [rentalOrder, setRentalOrder] = useState<MaterialOrder>('desc');
    const [rentalPage, setRentalPage] = useState(0);
    const [rentalRowsPerPage, setRentalRowsPerPage] = useState(5);
    const [rentalSelectedRowForMenu, setRentalSelectedRowForMenu] = useState<WorkhouseRentRequest | null>(null);
    const [openDeleteRentalModal, setOpenDeleteRentalModal] = useState(false);
    const [rentalItemToEdit, setRentalItemToEdit] = useState<WorkhouseRentRequest | null>(null);

    const fetchWorkhouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setWorkhouses(response.data.data.map((w: any) => ({ id: w.id, name: w.name, code: w.code })));
            } else {
                if (currentTab === 'rental' && isFormVisible) {
                    showAlert('İşyeri listesi alınamadı.', 'error');
                }
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [showAlert, currentTab, isFormVisible]);


    const fetchRentalRequests = useCallback(async (workhouseId: string | number) => {

        if (!workhouseId) {
            setRentalRequestsList([]);
            setLoadingData(false);
            return;
        }

        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            const url = `${server.baseurl}${server.initialoperations}get-workhouse-rent-by-workhouse-id/${workhouseId}`;
            const response = await axios.get(url, { headers: { "Authorization": `Bearer ${authToken}` } });

            if (response.data.httpStatusCode === 200 && response.data.data) {

                const mappedData: WorkhouseRentRequest[] = response.data.data.map((r: any) => ({
                    ...r,
                    workhouseId: Number(r.workhouse?.id) || 0,
                    workhouseName: r.workhouse?.name || 'Bilinmiyor',
                }));

                setRentalRequestsList(mappedData);
            } else {
                setRentalRequestsList([]);
                showAlert(response.data.message || 'Kiralama talepleri alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);



    useEffect(() => {
        if (currentTab === 'rental') {
            fetchWorkhouses();
            const workhouseParam = searchParams.get('rentalWorkhouseId');
            if (workhouseParam) {
                setSelectedRentalWorkhouseId(workhouseParam);
            }
        }
    }, [currentTab, fetchWorkhouses, searchParams]);


    useEffect(() => {
        if (currentTab === 'rental' && selectedRentalWorkhouseId) {
            fetchRentalRequests(selectedRentalWorkhouseId);
        } else if (currentTab === 'rental' && !selectedRentalWorkhouseId) {
            setRentalRequestsList([]);
            setLoadingData(false);
        }
    }, [currentTab, selectedRentalWorkhouseId, fetchRentalRequests]);


    // CRUD Logics (Rental)
    const validateRentalForm = (): boolean => {
        if (!rentalTitle.trim() || !selectedWorkhouseId || !rentStartDate || !rentEndDate) {
            // تنظیم خطای جدید
            if (!rentStartDate) setRentStartDateError(true);
            if (!rentEndDate) setRentEndDateError(true);
            showAlert("Lütfen gerekli (Konu, İşyeri, Başlangıç/Bitiş Tarihi) alanları doldurun.", "warning");
            return false;
        }

        // چک کردن منطق تاریخ‌ها
        if (rentStartDate! > rentEndDate!) { // چون در شرط بالا چک کردیم که null نیستند، می‌توانیم ! استفاده کنیم.
            showAlert("Başlangıç tarihi bitiş tarihinden sonra olamaz.", "warning");
            return false;
        }
        return true;
    };

    const resetRentalForm = () => {
        setRentalTitle('');
        setRentalDescription('');
        setDriverInfo('');
        setPrice('');
        setCompany('');
        setRentStartDate(null); // ⬅️ به‌روزرسانی
        setRentEndDate(null);   // ⬅️ به‌روزرسانی
        setRentStartDateError(false); // ⬅️ اضافه شدن
        setRentEndDateError(false);
        setSelectedWorkhouseId('');
        setFilesToUpload([]);
        setAttachmentsInEdit([]);
        setIsEditing(false);
        setRentalItemToEdit(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const createRentalRequest = async () => {
        if (!validateRentalForm()) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            let attachmentsPayload: Attachment[] = [];
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );
                if (uploadResponse.data.httpStatusCode === 201) {
                    const fileUrls = uploadResponse.data.data.files;
                    attachmentsPayload = fileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false); return;
                }
            }

            const payload = {
                title: rentalTitle,
                description: rentalDescription,
                driverInfo: driverInfo,
                price: Number(price) || 0,
                company: company,
                rentStartDate: rentStartDate,
                rentEndDate: rentEndDate,
                workhouseId: Number(selectedWorkhouseId),
                attachments: attachmentsPayload,
            };

            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-workhouse-rent", // ⬅️ API ثبت جدید
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Kiralama talebi başarıyla oluşturuldu!', 'success');
                resetRentalForm();
                setIsFormVisible(false);
                if (selectedRentalWorkhouseId === selectedWorkhouseId) fetchRentalRequests(selectedWorkhouseId); // اگر فیلتر فعلی همان workhouse باشد، جدول را رفرش کن
            } else {
                showAlert(response.data.message || 'Kiralama talebi oluşturulurken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const updateRentalRequest = async () => {
        if (!validateRentalForm() || !rentalItemToEdit || !rentalItemToEdit.id) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }
        try {
            let newAttachmentsPayload: Attachment[] = [];
            if (filesToUpload.length > 0) {
                const formData = new FormData();
                filesToUpload.forEach(file => formData.append('files', file));
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );
                if (uploadResponse.data.httpStatusCode === 201) {
                    const newFileUrls = uploadResponse.data.data.files;
                    newAttachmentsPayload = newFileUrls.map((url: string) => ({ fileUrl: url }));
                } else {
                    showAlert('Yeni dosyalar yüklenirken bir hata oluştu.', 'error');
                    setLoadingButton(false); return;
                }
            }
            const keptExistingAttachments = rentalItemToEdit.attachments
                .filter(att => attachmentsInEdit.includes(att.fileUrl.split('/').pop() || ''))
                .map(att => ({ fileUrl: att.fileUrl }));
            const finalAttachments = [...keptExistingAttachments, ...newAttachmentsPayload];

            const payload = {
                id: Number(rentalItemToEdit.id),
                title: rentalTitle,
                description: rentalDescription,
                driverInfo: driverInfo,
                price: Number(price) || 0,
                company: company,
                rentStartDate: rentStartDate,
                rentEndDate: rentEndDate,
                workhouseId: Number(selectedWorkhouseId),
                attachments: finalAttachments,
            };

            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-workhouseRent", // ⬅️ API آپدیت جدید
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Kiralama talebi başarıyla güncellendi!', 'success');
                resetRentalForm();
                setIsFormVisible(false);
                fetchRentalRequests(selectedRentalWorkhouseId);
            } else {
                showAlert(response.data.message || 'Kiralama talebi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const handleRentalEditClick = (row: WorkhouseRentRequest) => {
        resetRentalForm();
        setIsEditing(true);
        setRentalItemToEdit(row);
        setRentalTitle(row.title);
        setRentalDescription(row.description);
        setDriverInfo(row.driverInfo);
        const numericPrice = row.price ? String(row.price).replace(/[^0-9.]/g, '') : '';
        setPrice(numericPrice);
        setCompany(row.company);
        setRentStartDate(row.rentStartDate ? new Date(row.rentStartDate) : null); // ⬅️ به‌روزرسانی
        setRentEndDate(row.rentEndDate ? new Date(row.rentEndDate) : null);
        setSelectedWorkhouseId(row.workhouse.id);

        if (row.attachments && row.attachments.length > 0) {
            const fileNames = row.attachments.map(att => att.fileUrl.split('/').pop() || '');
            setAttachmentsInEdit(fileNames);
        } else {
            setAttachmentsInEdit([]);
        }
        setIsFormVisible(true);
        handleCloseMenu();
    };

    // Table Data Logic (Rental)
    const filteredRentalRequests = useMemo(() => {
        const q = rentalSearchTerm.trim().toLowerCase();
        return rentalRequestsList.filter((r) => {
            const matchesSearch =
                !q ||
                (String(r.id) ?? "").includes(q) ||
                (r.title ?? "").toLowerCase().includes(q) ||
                (r.description ?? "").toLowerCase().includes(q) ||
                (r.driverInfo ?? "").toLowerCase().includes(q) ||
                (r.company ?? "").toLowerCase().includes(q);
            const matchesStatus = rentalStatusFilter === 'all' || r.status === rentalStatusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [rentalRequestsList, rentalSearchTerm, rentalStatusFilter]);


    const sortedRentalRequests = useMemo(() => {
        const validOrderBy = rentalOrderBy as keyof WorkhouseRentRequest;
        return stableSort(filteredRentalRequests, getComparator(rentalOrder, validOrderBy));
    }, [filteredRentalRequests, rentalOrder, rentalOrderBy]);

    const paginatedRentalRequestsList = useMemo(() =>
        sortedRentalRequests.slice(rentalPage * rentalRowsPerPage, rentalPage * rentalRowsPerPage + rentalRowsPerPage)
        , [sortedRentalRequests, rentalPage, rentalRowsPerPage]);

    // Handlers (Rental)
    const handleRentalWorkhouseFilterChange = (event: React.ChangeEvent<HTMLSelectElement | { name?: string; value: unknown }>) => {
        const newWorkhouseId = event.target.value as string;
        setSelectedRentalWorkhouseId(newWorkhouseId);
        setRentalPage(0);
        // آپدیت URL Search Param برای حفظ وضعیت
        const next = new URLSearchParams(searchParams);
        if (newWorkhouseId) {
            next.set('rentalWorkhouseId', newWorkhouseId);
        } else {
            next.delete('rentalWorkhouseId');
        }
        setSearchParams(next, { replace: true });
    };

    const handleRentalSort = (property: keyof WorkhouseRentRequest) => {
        const isAsc = rentalOrderBy === property && rentalOrder === "asc";
        setRentalOrder(isAsc ? "desc" : "asc");
        setRentalOrderBy(property);
        setRentalPage(0);
    };
    const handleChangeRentalPage = (_event: unknown, newPage: number) => setRentalPage(newPage);
    const handleChangeRentalRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRentalRowsPerPage(parseInt(event.target.value, 10));
        setRentalPage(0);
    };
    const handleRentalStatusFilterChange = (_: any, v: 'all' | 0 | 1 | 2 | null) => {
        if (v !== null) {
            setRentalStatusFilter(v as 'all' | 0 | 1 | 2);
            setRentalPage(0);
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
        setIsFormVisible(false); // فرم را با تغییر تب ببند
        setLoadingData(true);
        if (newValue === 'material') {
            resetRentalForm();
            setMaterialPage(0);
            fetchMaterialRequests();
        } else {
            resetMaterialForm();
            setRentalPage(0);
            if (selectedRentalWorkhouseId) {
                fetchRentalRequests(selectedRentalWorkhouseId);
            } else {
                setLoadingData(false);
            }
        }
        clearAlert();
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>,
        row: MaterialRequestType | WorkhouseRentRequest) => {
        setAnchorEl(event.currentTarget);
        if (currentTab === 'material') {
            setMaterialSelectedRowForMenu(row as MaterialRequestType);
            setRentalSelectedRowForMenu(null);
        } else {
            setRentalSelectedRowForMenu(row as WorkhouseRentRequest);
            setMaterialSelectedRowForMenu(null);
        }
    };
    const handleCloseMenu = () => { setAnchorEl(null); };

    const handleClickOpenDeleteModal = (row: MaterialRequestType | WorkhouseRentRequest) => {
        handleCloseMenu();
        if (currentTab === 'material') {
            setMaterialSelectedRowForMenu(row as MaterialRequestType);
            setOpenDeleteMaterialModal(true);
        } else {
            setRentalSelectedRowForMenu(row as WorkhouseRentRequest);
            setOpenDeleteRentalModal(true);
        }
    };
    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setFilesToUpload(prev => [...prev, ...Array.from(files)]);
            const fileNames = Array.from(files).map(file => file.name);
            setAttachmentsInEdit(prev => [...prev, ...fileNames]);
        }
    };
    const handleRemoveAttachmentInEdit = (fileNameToRemove: string) => {
        setAttachmentsInEdit(prev => prev.filter(file => file !== fileNameToRemove));
        setFilesToUpload(prev => prev.filter(file => file.name !== fileNameToRemove));
    };

    const exportRequestPdf = (requestData: MaterialRequestType | WorkhouseRentRequest, title: string) => {
        const doc = new jsPDF();
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        const isMaterial = (requestData as MaterialRequestType).subject !== undefined;

        const tableData = [
            ['Başlık', isMaterial ? (requestData as MaterialRequestType).subject : (requestData as WorkhouseRentRequest).title],
            ['Durum', statusToLabel(requestData.status)],
            ['Tarih', new Date(requestData.createAt).toLocaleDateString('tr-TR')],
            ['Açıklama', stripHtml(requestData.description) || '-'],
            ...(isMaterial ? [] : [
                ['Şoför Bilgisi', (requestData as WorkhouseRentRequest).driverInfo || '-'],
                ['Şirket', (requestData as WorkhouseRentRequest).company || '-'],
                ['Fiyat', (requestData as WorkhouseRentRequest).price + ' TL' || '-'],
                ['İşyeri', (requestData as WorkhouseRentRequest).workhouseName || 'Bilinmiyor'],
                ['Başlangıç', formatDateDisplay((requestData as WorkhouseRentRequest).rentStartDate)],
                ['Bitiş', formatDateDisplay((requestData as WorkhouseRentRequest).rentEndDate)],
            ])
        ];

        autoTable(doc, {
            startY: 75,
            head: [['Özellik', 'Değer']],
            body: tableData,
            theme: 'grid',
            styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: (_data: any) => {
                addPdfHeader(doc, title);
                addPdfFooter(doc);
                doc.setFontSize(10);
                doc.setFont('Arial', 'normal');
                doc.text(`Talep ID: ${requestData.id}`, 15, 32);
            },
            showHead: 'firstPage',
            margin: { top: 40, bottom: 45 },
        });
        doc.save(`${title.replace(/ /g, '_')}_Raporu_${requestData.id}.pdf`);
    };

    const exportRequestExcel = async (requestData: MaterialRequestType | WorkhouseRentRequest, title: string) => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title);
        worksheet.views = [{ rightToLeft: false }];

        worksheet.columns = [
            { header: 'Özellik', key: 'key', width: 25 },
            { header: 'Değer', key: 'value', width: 60 }
        ];

        worksheet.addRow([title]).font = { bold: true, size: 14 };
        worksheet.mergeCells('A1:B1');
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.addRow([]);

        const isMaterial = (requestData as MaterialRequestType).subject !== undefined;
        worksheet.addRow({ key: 'Talep ID', value: requestData.id });
        worksheet.addRow({ key: 'Konu', value: isMaterial ? (requestData as MaterialRequestType).subject : (requestData as WorkhouseRentRequest).title });
        worksheet.addRow({ key: 'Durum', value: statusToLabel(requestData.status) });
        worksheet.addRow({ key: 'Oluşturulma Tarihi', value: new Date(requestData.createAt).toLocaleDateString('tr-TR') });
        worksheet.addRow({ key: 'Açıklama', value: stripHtml(requestData.description) || '-' });

        if (!isMaterial) {
            const rentalData = requestData as WorkhouseRentRequest;
            worksheet.addRow({ key: 'İşyeri', value: rentalData.workhouseName || 'Bilinmiyor' });
            worksheet.addRow({ key: 'Şoför Bilgisi', value: rentalData.driverInfo || '-' });
            worksheet.addRow({ key: 'Şirket', value: rentalData.company || '-' });
            worksheet.addRow({ key: 'Fiyat', value: rentalData.price + ' TL' });
            worksheet.addRow({ key: 'Kira Başlangıç', value: formatDateDisplay(rentalData.rentStartDate) });
            worksheet.addRow({ key: 'Kira Bitiş', value: formatDateDisplay(rentalData.rentEndDate) });
        }

        worksheet.addRow([]);
        worksheet.addRow(['Ekler']).font = { bold: true, size: 12 };
        worksheet.mergeCells(`A${worksheet.lastRow?.number}:B${worksheet.lastRow?.number}`);

        if (requestData.attachments && requestData.attachments.length > 0) {
            worksheet.addRow(['Dosya Adı', 'URL']).font = { bold: true };
            requestData.attachments.forEach(att => {
                worksheet.addRow([att.fileUrl.split('/').pop() || '-', att.fileUrl]);
            });
        } else {
            worksheet.addRow(['Piyes bulunamadı']);
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}_Raporu_${requestData.id}.xlsx`);
    };

    const FormContent = () => {
        if (currentTab === 'material') {
            return (
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <CustomFormLabel htmlFor="material-subject" required>Konu / Başlık</CustomFormLabel>
                        <CustomTextField
                            id="material-subject"
                            placeholder="Talep Başlığı"
                            size="small"
                            fullWidth
                            value={materialSubject}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialSubject(e.target.value)}
                            error={materialSubjectError}
                            helperText={materialSubjectError ? "Konu alanı zorunludur." : ""}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <CustomFormLabel htmlFor="material-description">Açıklama</CustomFormLabel>
                        <CustomTextField
                            id="material-description"
                            placeholder="Talep Detayları"
                            multiline
                            rows={4}
                            fullWidth
                            value={materialDescription}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialDescription(e.target.value)}
                        />
                    </Grid>
                </Grid>
            );
        } else {
            // Rental Request Form
            return (
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="rental-title" required>Konu / Başlık</CustomFormLabel>
                        <CustomTextField id="rental-title" size="small" fullWidth value={rentalTitle}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRentalTitle(e.target.value)}

                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="rental-workhouse" required>Şantiye</CustomFormLabel>
                        <Autocomplete
                            id="rental-workhouse"
                            options={workhouses}
                            getOptionLabel={(option) => option.name ? `${option.name} (Kod:${option.code})` : ''}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={workhouses.find(w => w.id === selectedWorkhouseId) || null}
                            onChange={(_event, newValue) => {
                                setSelectedWorkhouseId(newValue ? newValue.id : '');
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Şantiye Seçiniz"
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                        />
                    </Grid>



                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <CustomFormLabel htmlFor="rent-start-date" required>Kira Başlangıç Tarihi</CustomFormLabel>
                            <DatePicker
                                label="Kira Başlangıç Tarihi"
                                value={rentStartDate}
                                onChange={(newValue) => {
                                    setRentStartDate(newValue);
                                    if (rentStartDateError && newValue) setRentStartDateError(false);
                                }}
                                maxDate={rentEndDate || undefined}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        size="small"
                                        fullWidth
                                        error={rentStartDateError}
                                        helperText={rentStartDateError ? "Başlangıç tarihi zorunludur!" : ""}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <CustomFormLabel htmlFor="rent-end-date" required>Kira Bitiş Tarihi</CustomFormLabel>
                            <DatePicker
                                label="Kira Bitiş Tarihi"
                                value={rentEndDate}
                                onChange={(newValue) => {
                                    setRentEndDate(newValue);
                                    if (rentEndDateError && newValue) setRentEndDateError(false);
                                }}
                                minDate={rentStartDate || undefined}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        size="small"
                                        fullWidth
                                        error={rentEndDateError}
                                        helperText={rentEndDateError ? "Bitiş tarihi zorunludur!" : ""}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="rental-company">Şirket</CustomFormLabel>
                        <CustomTextField id="rental-company" size="small" fullWidth value={company}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompany(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="rental-driver-info">Şoför Bilgisi</CustomFormLabel>
                        <CustomTextField id="rental-driver-info" size="small" fullWidth value={driverInfo}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriverInfo(e.target.value)} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="rental-price">Fiyat</CustomFormLabel>
                        <CustomTextField
                            id="rental-price"
                            type="number"
                            size="small"
                            fullWidth
                            value={price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                            InputProps={{ startAdornment: (<InputAdornment position="start">TL</InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="rental-description">Açıklama</CustomFormLabel>
                        <CustomTextField
                            id="rental-description"
                            placeholder="Talep Detayları"
                            multiline
                            rows={2}
                            fullWidth
                            value={rentalDescription}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRentalDescription(e.target.value)}
                        />
                    </Grid>
                </Grid>
            );
        }
    };

    const TableContent = () => {
        if (currentTab === 'material') {
            return (
                <>
                    <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                        <Grid container spacing={2} alignItems="center">
                            {hasIdsFilter && (
                                <Grid item xs={12}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip label={`Bildirim filtresi: ${notifIds.length} `} color="primary" size="small" />
                                        <IconButton aria-label="Filtreyi temizle" size="small" onClick={clearNotifFilter} title="Filtreyi temizle">
                                            <IconX size={18} />
                                        </IconButton>
                                    </Stack>
                                </Grid>
                            )}
                            <Grid item xs={12} sm={6} md={8}>
                                <TextField
                                    label="Talep Ara (Başlık/Açıklama/ID)"
                                    variant="outlined"
                                    fullWidth
                                    value={materialSearchTerm}
                                    onChange={(e) => { setMaterialSearchTerm(e.target.value); setMaterialPage(0); }}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <ToggleButtonGroup
                                    value={materialStatusFilter}
                                    exclusive
                                    onChange={handleMaterialStatusFilterChange}
                                    fullWidth
                                >
                                    <StyledToggleButton value="all" data-value="all">Tümü</StyledToggleButton>
                                    <StyledToggleButton value={0} data-value="0">Beklemede</StyledToggleButton>
                                    <StyledToggleButton value={1} data-value="1">Onaylandı</StyledToggleButton>
                                    <StyledToggleButton value={2} data-value="2">Reddedildi</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid>
                        </Grid>
                    </Box>
                    <TableContainer component={Paper} sx={{ mt: 3 }}>
                        {loadingData ? (
                            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                                <CircularProgress />
                                <Typography variant="h6" sx={{ ml: 2 }}>Talepler yükleniyor...</Typography>
                            </Box>
                        ) : (
                            <Table aria-label="Malzeme Talepleri tablosu">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        {(['Başlık', 'Açıklama', 'Durum', 'Tarih', 'Ekler', ''] as const).map((head, index) => (
                                            <StyledTableCell key={index} sx={{ color: "#171c23" }}>
                                                {head === 'Başlık' || head === 'Durum' || head === 'Tarih' ? (
                                                    <TableSortLabel
                                                        active={materialOrderBy === (head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt')}
                                                        direction={materialOrderBy === (head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt') ? materialOrder : "asc"}
                                                        onClick={() => handleMaterialSort(head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt')}
                                                    >
                                                        <Typography variant="h6">{head}</Typography>
                                                    </TableSortLabel>
                                                ) : <Typography variant="h6">{head}</Typography>}
                                            </StyledTableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedMaterialRequestsList.length > 0 ? (
                                        paginatedMaterialRequestsList.map((row) => (
                                            <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <StyledTableCell><Typography variant="body1">{row.subject}</Typography></StyledTableCell>
                                                <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                                    <Typography variant="body1" noWrap title={row.description || ''}>{row.description || '-'}</Typography>
                                                    {row.description != null && row.description.length > 50 && (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                            <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => { setFullDescriptionContent(row.description); setOpenDescriptionModal(true); }}>Devamını Oku</Button>
                                                        </CustomTooltip>
                                                    )}
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" />
                                                    {(row.requestStatusHistories && row.requestStatusHistories.length > 0) ? (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Durum Geçmişini Gör" : ""}>
                                                            <IconButton size="small" onClick={() => { setHistoryData(row.requestStatusHistories!); setOpenHistoryModal(true); }}><IconInfoCircle size={18} /></IconButton>
                                                        </CustomTooltip>
                                                    ) : null}
                                                </StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{new Date(row.createAt).toLocaleDateString('tr-TR')}</Typography></StyledTableCell>
                                                <StyledTableCell>
                                                    {row.attachments && row.attachments.length > 0 ? (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                            <IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary"></Chip></IconButton>
                                                        </CustomTooltip>
                                                    ) : (<Typography variant="body2" color="textSecondary">-</Typography>)}
                                                </StyledTableCell>
                                                {/* <StyledTableCell>
                                                    <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                        <IconDots width={18} /></IconButton>
                                                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && materialSelectedRowForMenu?.id === row.id}
                                                        onClose={handleCloseMenu}

                                                    >
                                                        {hasEditPermission && (<CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                            <MuiMenuItem onClick={() => handleMaterialEditClick(row)} disabled={row.status !== 0}><ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle</MuiMenuItem></CustomTooltip>)}
                                                        {hasDeletePermission && (<CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}><MuiMenuItem onClick={() => handleClickOpenDeleteModal(row)} disabled={row.status !== 0}><ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek</MuiMenuItem></CustomTooltip>)}
                                                        {hasDownloadPermission && (<CustomTooltip placement="left"
                                                         title={isTooltipGloballyEnabled ? "Talep Raporunu İndir" : ""}>
                                                         <MuiMenuItem onClick={() => {
                                                          setMaterialSelectedRowForMenu(row); 
                                                          setOpenDownloadMaterialSingleModal(true); }}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem></CustomTooltip>)}
                                                    </Menu>
                                                </StyledTableCell> */}



                                                <StyledTableCell>
                                                    <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                    <Menu anchorEl={anchorEl} open={openMenu && materialSelectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                        {hasEditPermission && (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                                <MuiMenuItem onClick={() => handleMaterialEditClick(row)} disabled={row.status !== 0}>
                                                                    <ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle
                                                                </MuiMenuItem>
                                                            </CustomTooltip>

                                                        )}
                                                        {hasDeletePermission && (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                                                                <MuiMenuItem onClick={() => handleClickOpenDeleteModal(row)} disabled={row.status !== 0}>
                                                                    <ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek
                                                                </MuiMenuItem>
                                                            </CustomTooltip>

                                                        )}
                                                        {hasDownloadPermission && (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Talep Raporunu İndir" : ""}>
                                                                <MuiMenuItem onClick={() => {
                                                                    setMaterialSelectedRowForMenu(row);
                                                                    setOpenDownloadMaterialSingleModal(true);
                                                                }}>
                                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>  Bu satırı indir
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                        )}
                                                    </Menu>
                                                </StyledTableCell>

                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><StyledTableCell colSpan={6} align="center"><Typography variant="subtitle1" color="textSecondary">Henüz kayıtlı bir talep bulunamadı.</Typography></StyledTableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredMaterialRequests.length} // ⬅️ اصلاح شده
                        rowsPerPage={materialRowsPerPage}
                        page={materialPage}
                        onPageChange={handleChangeMaterialPage}
                        onRowsPerPageChange={handleChangeMaterialRowsPerPage}
                        labelRowsPerPage="Satır başına düşen:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                    />
                </>
            );
        } else {
            // Rental Request Table
            return (
                <>
                    <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    {/* <InputLabel id="table-workhouse-select-label">Şantiye Filtresi</InputLabel> */}
                                    <Autocomplete
                                        id="table-workhouse-filter"
                                        options={workhouses}
                                        getOptionLabel={(option) => option.name ? `${option.name} (Kod:${option.code})` : 'Tüm İşyerleri'}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        value={workhouses.find(w => w.id === selectedRentalWorkhouseId) || null}
                                        onChange={(_event, newValue) => {
                                            const newWorkhouseId = newValue ? newValue.id : '';
                                            handleRentalWorkhouseFilterChange({ target: { value: newWorkhouseId } } as React.ChangeEvent<HTMLSelectElement | { name?: string; value: unknown }>);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Şantiye Filtresi"
                                                variant="outlined"
                                                size="small"
                                                InputProps={{
                                                    ...params.InputProps,

                                                }}
                                            />
                                        )}
                                    />
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Kiralama Ara (Başlık/Şirket/Şoför)"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={rentalSearchTerm}
                                    onChange={(e) => { setRentalSearchTerm(e.target.value); setRentalPage(0); }}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <ToggleButtonGroup value={rentalStatusFilter} exclusive onChange={handleRentalStatusFilterChange} fullWidth>
                                    <StyledToggleButton value="all" data-value="all">Tümü</StyledToggleButton>
                                    <StyledToggleButton value={0} data-value="0">Beklemede</StyledToggleButton>
                                    <StyledToggleButton value={1} data-value="1">Onaylandı</StyledToggleButton>
                                    <StyledToggleButton value={2} data-value="2">Reddedildi</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid>
                        </Grid>
                    </Box>

                    <TableContainer component={Paper} sx={{ mt: 3 }}>
                        {loadingData ? (
                            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                                <CircularProgress />
                                <Typography variant="h6" sx={{ ml: 2 }}>Kiralama talepleri yükleniyor...</Typography>
                            </Box>
                        ) : !selectedRentalWorkhouseId ? (
                            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                                <Typography variant="subtitle1" color="textSecondary">Lütfen tabloyu görmek için yukarıdan bir İşyeri seçiniz.</Typography>
                            </Box>
                        ) : (
                            <Table aria-label="Kiralama Talepleri tablosu">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        {(['Başlık', 'İşyeri', 'Başlangıç', 'Bitiş', 'Fiyat (TL)', 'Durum', 'Ekler', ''] as const).map((head, index) => (
                                            <StyledTableCell key={index} sx={{ color: "#171c23" }}>
                                                <TableSortLabel
                                                    active={rentalOrderBy === (head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt')}
                                                    direction={rentalOrderBy === (head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt') ? rentalOrder : "asc"}
                                                    onClick={() => handleRentalSort(head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt')}
                                                >
                                                    <Typography variant="h6">{head}</Typography>
                                                </TableSortLabel>
                                            </StyledTableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedRentalRequestsList.length > 0 ? (
                                        paginatedRentalRequestsList.map((row) => (
                                            <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <StyledTableCell><Typography variant="body1">{row.title}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.workhouseName || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.rentStartDate)}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.rentEndDate)}</Typography></StyledTableCell>
                                                <StyledTableCell>
                                                    <Typography variant="body1">
                                                        {(() => {
                                                            const priceString = String(row.price || 0).replace(/[^0-9.]/g, '');
                                                            const numericPrice = parseFloat(priceString);

                                                            if (isNaN(numericPrice)) {
                                                                return row.price || '-';
                                                            }

                                                            return new Intl.NumberFormat('tr-TR', {
                                                                style: 'currency',
                                                                currency: 'TRY',
                                                                minimumFractionDigits: 2,
                                                            }).format(numericPrice);
                                                        })()}
                                                    </Typography>
                                                </StyledTableCell>
                                                <StyledTableCell><Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" /></StyledTableCell>
                                                <StyledTableCell>
                                                    {row.attachments && row.attachments.length > 0 ? (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                            <IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary"></Chip></IconButton>
                                                        </CustomTooltip>
                                                    ) : (<Typography variant="body2" color="textSecondary">-</Typography>)}
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <IconButton onClick={(event) => handleClickMenu(event, row)}><IconDots width={18} /></IconButton>
                                                    <Menu
                                                        anchorEl={anchorEl}
                                                        open={openMenu && (
                                                            (currentTab === 'material' && materialSelectedRowForMenu?.id === row.id) ||
                                                            (currentTab === 'rental' && rentalSelectedRowForMenu?.id === row.id)
                                                        )}
                                                        onClose={handleCloseMenu}
                                                    >
                                                        {hasEditPermission && (<CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}><MuiMenuItem onClick={() => handleRentalEditClick(row)} disabled={row.status !== 0}><ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle</MuiMenuItem></CustomTooltip>)}
                                                        {hasDeletePermission && (<CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}><MuiMenuItem onClick={() => handleClickOpenDeleteModal(row)} disabled={row.status !== 0}><ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek</MuiMenuItem></CustomTooltip>)}
                                                        {hasDownloadPermission && (<CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kiralama Raporunu İndir" : ""}><MuiMenuItem onClick={() => { setRentalSelectedRowForMenu(row); setOpenDownloadMaterialSingleModal(true); }}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem></CustomTooltip>)}
                                                    </Menu>
                                                </StyledTableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><StyledTableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Seçili işyerinde kayıtlı kiralama talebi bulunamadı.</Typography></StyledTableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredRentalRequests.length} // ⬅️ اصلاح شده
                        rowsPerPage={rentalRowsPerPage}
                        page={rentalPage}
                        onPageChange={handleChangeRentalPage}
                        onRowsPerPageChange={handleChangeRentalRowsPerPage}
                        labelRowsPerPage="Satır başına düşen:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                    />
                </>
            );
        }
    };


    const handleOpenAttachmentsModal = (attachments: Attachment[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };


    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('ids');
        setSearchParams(next, { replace: true });
        navigate(location.pathname, { replace: true, state: { ...(location.state as any), notifIds: [] } });
        setMaterialPage(0);
    };

    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <TabContext value={currentTab}>
                {/* 1. Header & Tabs */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                    <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconFileText style={{ marginRight: 8 }} /> Talep Yönetimi
                    </Typography>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: { xs: 2, sm: 0 } }}>
                        <TabList onChange={handleTabChange} aria-label="Talep Türleri">
                            <Tab label="Malzeme Talepleri" value="material" />
                            <Tab label="Kiralama Talepleri" value="rental" />
                        </TabList>
                    </Box>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" justifyContent="flex-end" mb={2}>
                    {((!isFormVisible && hasCreatePermission) || (isFormVisible && isEditing && hasEditPermission)) && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "فرم ایجاد/ویرایش را باز کنید" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => { setIsFormVisible(true); currentTab === 'material' ? resetMaterialForm() : resetRentalForm(); }}
                                isBlinking={currentTab === 'material' && !isFormVisible}
                                fullWidth={false}
                                startIcon={<IconPlus size={20} />}
                            >
                                Yeni {currentTab === 'material' ? 'Malzeme' : 'Kiralama'} Talep Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => { setIsFormVisible(false); currentTab === 'material' ? resetMaterialForm() : resetRentalForm(); }}
                                fullWidth={false}
                                startIcon={<IconX size={20} />}
                            >
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
                {/* 2. Form Bölümü */}
                <Box>
                    {((isFormVisible && hasCreatePermission) || (isEditing && hasEditPermission)) && (
                        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                            <Typography variant="h6" mb={2}>{isEditing ? 'Talebi Düzenle' : 'Yeni Talep Oluştur'}</Typography>

                            {/* فرم مربوط به تب انتخاب شده */}
                            <FormContent />

                            {/* Attachment Section (مشترک) */}
                            <Paper elevation={1} sx={{ p: 2, mt: 3 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                                    <CustomFormLabel htmlFor="request-attachments">Ekler (Resim,PDF, Excel)</CustomFormLabel>
                                    <Button size="small" onClick={() => fileInputRef.current?.click()} startIcon={<IconPlus />} variant="outlined">
                                        Dosya Ekle
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                        multiple
                                        accept="image/*, .pdf, .xls, .xlsx"
                                    />
                                </Stack>
                                <Box sx={{ border: '1px solid #ccc', borderRadius: '4px', p: 1, minHeight: 50, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {attachmentsInEdit.length > 0 ? (
                                        attachmentsInEdit.map((fileName, index) => (
                                            <Chip
                                                key={index}
                                                label={fileName}
                                                onDelete={() => handleRemoveAttachmentInEdit(fileName)}
                                                sx={{ mr: 1, mb: 1 }}
                                            />
                                        ))
                                    ) : (
                                        <Typography variant="body2" color="textSecondary" sx={{ m: 'auto' }}>
                                            Henüz eklenmiş dosya yok.
                                        </Typography>
                                    )}
                                </Box>
                            </Paper>

                            {/* Form Actions (مشترک) */}
                            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                                {isEditing ? (
                                    <>
                                        <Button variant="contained" color="primary" onClick={currentTab === 'material' ? updateMaterialRequest : updateRentalRequest} disabled={loadingButton}>
                                            {loadingButton ? 'Bekleniyor...' : 'Güncellemeyi Kaydet'}
                                        </Button>
                                        <Button variant="outlined" color="secondary" onClick={() => { setIsFormVisible(false); currentTab === 'material' ? resetMaterialForm() : resetRentalForm(); }}>
                                            İptal Et
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="contained" color="info" onClick={currentTab === 'material' ? createMaterialRequest : createRentalRequest} disabled={loadingButton}>
                                        {loadingButton ? 'Bekleniyor...' : 'Talep Oluştur'}
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    )}
                </Box>


                {/* 3. Tab Contents */}
                <TabPanel value="material" sx={{ p: 0 }}>
                    <TableContent />
                </TabPanel>
                <TabPanel value="rental" sx={{ p: 0 }}>
                    <TableContent />
                </TabPanel>
            </TabContext>
            <>

                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}
            </>
            {/* Shared Dialogs (Modal) */}

            {/* Download Modal (Malzeme/Kiralama) */}
            <Dialog open={openDownloadMaterialSingleModal} onClose={() => setOpenDownloadMaterialSingleModal(false)} maxWidth="xs">
                <DialogTitle>{currentTab === 'material' ? 'Malzeme Talep Raporunu İndir' : 'Kiralama Talep Raporunu İndir'}</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 1 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                                const row = currentTab === 'material' ? materialSelectedRowForMenu : rentalSelectedRowForMenu;
                                if (row) { exportRequestPdf(row, currentTab === 'material' ? 'Malzeme Talep Detay Raporu' : 'Kiralama Talep Detay Raporu'); }
                                setOpenDownloadMaterialSingleModal(false);
                                handleCloseMenu();
                            }}
                            startIcon={<IconFileDownload />}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                                const row = currentTab === 'material' ? materialSelectedRowForMenu : rentalSelectedRowForMenu;
                                if (row) { exportRequestExcel(row, currentTab === 'material' ? 'Malzeme Talep Detayları' : 'Kiralama Talep Detayları'); }
                                setOpenDownloadMaterialSingleModal(false);
                                handleCloseMenu();
                            }}
                            startIcon={<IconFileDownload />}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadMaterialSingleModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* History Modal (فقط برای Malzeme Talepleri موجود است) */}
            <Dialog open={openHistoryModal} onClose={() => setOpenHistoryModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Talep Durum Geçmişi</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {historyData.length > 0 ? (
                            historyData.map((h, index) => (
                                <Paper key={index} elevation={1} sx={{ p: 2, borderLeft: `5px solid ${statusToColor(h.status)}` }}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Chip label={statusToLabel(h.status)} color={statusToColor(h.status)} size="small" />
                                        <Typography variant="caption" color="textSecondary">{new Date(h.createAt).toLocaleString('tr-TR')}</Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>Açıklama: {h.statusDescription || '—'}</Typography>
                                    <Typography variant="body2">İşlem Yapan: {h.user?.username || 'Bilinmiyor'}</Typography>
                                </Paper>
                            ))
                        ) : (<Typography>Henüz durum geçmişi yok.</Typography>)}
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenHistoryModal(false)}>Kapat</Button></DialogActions>
            </Dialog>

            {/* Description Modal (مشترک) */}
            <Dialog open={openDescriptionModal} onClose={() => setOpenDescriptionModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText><div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} /></DialogContentText>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDescriptionModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Attachments Modal (مشترک) */}
            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler</DialogTitle>
                <DialogContent dividers>
                    {/* {currentAttachments.map((attachment, index) => (
                        <Button key={index} fullWidth variant="outlined" onClick={() => handleDownloadClick(attachment.fileUrl)} sx={{ mt: 1 }} startIcon={<IconDownload />}>
                            {attachment.fileUrl.split('/').pop()}
                        </Button>
                    ))} */}

                    {currentAttachments.map((attachment, index) => {

                        const rawFileName = attachment.fileUrl.split('/').pop() || `Dosya ${index + 1}`;

                        let fileName = rawFileName;
                        try {
                            fileName = decodeURIComponent(rawFileName);
                        } catch (e) {
                        }
                        fileName = fileName
                            .replace(/Ä±/g, 'ı')  // ı
                            .replace(/ÄŸ/g, 'ğ')  // ğ
                            .replace(/Ã¼/g, 'ü')  // ü
                            .replace(/Ã¶/g, 'ö')  // ö
                            .replace(/Ä°/g, 'İ')  // İ
                            .replace(/ÅŸ/g, 'ş')  // ş
                            .replace(/Ã‡/g, 'Ç')  // Ç
                            .replace(/Ä±/g, 'ı'); // ğ

                        return (<Button key={index} fullWidth variant="outlined"
                            onClick={() => handleDownloadClick(attachment.fileUrl)} sx={{ mt: 1 }}>{fileName}</Button>);
                    })}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAttachmentsModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Delete Modals */}
            <DeleteRequest
                openModal={openDeleteMaterialModal}
                itemToDelete={materialSelectedRowForMenu}
                onClose={() => setOpenDeleteMaterialModal(false)}
                onDeleteSuccess={fetchMaterialRequests}
                showAlert={showAlert}
            />
            {/* فرض می‌کنیم این کامپوننت را دارید */}
            <DeleteWorkhouseRent
                openModal={openDeleteRentalModal}
                itemToDelete={rentalSelectedRowForMenu}
                onClose={() => setOpenDeleteRentalModal(false)}
                onDeleteSuccess={() => fetchRentalRequests(selectedRentalWorkhouseId)}
                showAlert={showAlert}
            />
        </Box>
    );
};

export default RequestTabs;