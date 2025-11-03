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
    ToggleButton as MuiToggleButton,
    TableSortLabel,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import {
    IconFileText,
    IconPlus, IconTrash, IconEdit,
    IconDots, IconDownload,
    IconLink, IconX,
    IconInfoCircle,
    IconSearch,
    IconFileDownload
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteRequest from './DeleteRequest'; // ⬅️ کامپوننت حذف جدید
import { useAuth } from "src/context/AuthContext";


import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
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
    user: User; // کاربری که وضعیت را تغییر داده
}

interface RequestType {
    id: number | string;
    subject: string;
    description: string;
    status: 0 | 1 | 2; // 0: Beklemede, 1: Onaylandı, 2: Reddedildi
    createAt: string;
    attachments: Attachment[];
    statusDescription?: string | null; // اگر از API برمی‌گردد
    // ⬅️ اضافه شدن فیلد تاریخچه
    requestStatusHistories?: RequestStatusHistory[];
}


// ⬅️ وضعیت‌های مرتب‌سازی
type Order = 'asc' | 'desc';
type OrderBy = keyof RequestType | 'id' | 'subject' | 'status' | 'createAt';

// ==============================================================================
// 2. STYLED COMPONENTS & UTILS
// ==============================================================================

const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    fontSize: '0.7rem',
    padding: '10px 4px', // فضای داخلی را کمی کم کنید
    lineHeight: 1.2, // ارتفاع خط را کاهش دهید

    // ⬇️ جدید: تنظیمات برای صفحه متوسط و بزرگ (md به بالا)
    [theme.breakpoints.up('md')]: {
        fontSize: '0.75rem', // سایز استاندارد یا بزرگتر (14px)
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

// قبل از کامپوننت ListRequests یا در یک فایل Utils جداگانه
const descendingComparator = <T, K extends keyof T>(a: T, b: T, orderBy: K) => {
    const va = a[orderBy] as any;
    const vb = b[orderBy] as any;

    if (vb == null) return va == null ? 0 : -1;
    if (va == null) return 1;

    // مقایسه رشته‌ها (برای subject)
    if (typeof vb === "string" && typeof va === "string") return vb.localeCompare(va);

    // مقایسه اعداد (برای status)
    if (typeof vb === "number" && typeof va === "number") return vb - va;

    // مقایسه تاریخ‌ها (برای createAt)
    if (orderBy === 'createAt') {
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

const getComparator = <K extends keyof RequestType>(order: Order, orderBy: K) =>
    order === "desc"
        ? (a: RequestType, b: RequestType) => descendingComparator(a, b, orderBy)
        : (a: RequestType, b: RequestType) => -descendingComparator(a, b, orderBy);

const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
};

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
        // format fonksiyonu date-fns'den geliyor varsayılır
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const stripHtml = (htmlString: string): string => {
    // React'te DOMParser kullanmak gerekir
    if (!htmlString) return '';
    if (typeof window === 'undefined') return htmlString;
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 50;
    const logoHeight = 25;
    const margin = 10;
    const topMargin = 20;
    const logoX = pageWidth - logoWidth - margin;

    doc.addImage(Logo, 'PNG', logoX, topMargin, logoWidth, logoHeight); // Logo görseli eklemek için

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
const ListRequests: React.FC = () => {
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();

    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const idsFromState =
        ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState :
        (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
    const hasIdsFilter = notifIds.length > 0;
    const idsSet = new Set<number>(notifIds);

    // States
    const [requestsList, setRequestsList] = useState<RequestType[]>([]);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
    const [attachmentsInEdit, setAttachmentsInEdit] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<RequestType | null>(null);
    const [subjectError, setSubjectError] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 0 | 1 | 2>('all'); // 'all', 0=Beklemede, 1=Onaylandı, 2=Reddedildi

    const [orderBy, setOrderBy] = useState<OrderBy>('createAt');
    const [order, setOrder] = useState<Order>('desc');


    // Table States
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<RequestType | null>(null);
    const openMenu = Boolean(anchorEl);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<RequestStatusHistory[]>([]);



    // Modals
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [openDownloadSingleModal, setOpenDownloadSingleModal] = useState(false);

    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
    }, [allowedOperations]);
    const hasEditPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
    }, [allowedOperations]);
    const hasDeletePermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Silmek');
    }, [allowedOperations]);

    const hasDownloadPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
    }, [allowedOperations]);

    // Utils & UX
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

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(timer);
    }, []);




    const exportRequestPdf = (requestData: RequestType, statusToLabel: (s: number) => string) => {
        const doc = new jsPDF();

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        // Genel Talep Bilgileri (Table Auto başlığının altına konulacak)
        const tableData = [
            ['Başlık', requestData.subject],
            ['Durum', statusToLabel(requestData.status)],
            ['Tarih', new Date(requestData.createAt).toLocaleDateString('tr-TR')],
            ['Açıklama', stripHtml(requestData.description) || '-'],
        ];

        autoTable(doc, {
            startY: 75, // Başlık ve Tarih bilgisi için yeterli alan bırakır
            head: [['Özellik', 'Değer']],
            body: tableData,
            theme: 'grid',
            styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: (_data: any) => {
                // Şablon başlık/altbilgi yapısını kullanır
                addPdfHeader(doc, `Talep Detay Raporu`);
                addPdfFooter(doc);

                // Talep ID'sini başlık alanına ekle
                doc.setFontSize(10);
                doc.setFont('Arial', 'normal');
                doc.text(`Talep ID: ${requestData.id}`, 15, 32);

            },
            showHead: 'firstPage',
            margin: { top: 40, bottom: 45 },
        });


        doc.save(`Talep_Raporu_${requestData.id}.pdf`);
    };

    const exportRequestExcel = async (requestData: RequestType, statusToLabel: (s: number) => string) => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Talep Detayları');
        worksheet.views = [{ rightToLeft: false }];

        worksheet.columns = [
            { header: 'Özellik', key: 'key', width: 20 },
            { header: 'Değer', key: 'value', width: 50 }
        ];

        worksheet.addRow(['Talep Detayları']).font = { bold: true, size: 14 };
        worksheet.mergeCells('A1:B1');
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.addRow([]);

        worksheet.addRow({ key: 'Talep ID', value: requestData.id });
        worksheet.addRow({ key: 'Konu', value: requestData.subject });
        worksheet.addRow({ key: 'Durum', value: statusToLabel(requestData.status) });
        worksheet.addRow({ key: 'Tarih', value: new Date(requestData.createAt).toLocaleDateString('tr-TR') });
        worksheet.addRow({ key: 'Açıklama', value: requestData.description || '-' });

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
        saveAs(new Blob([buffer]), `Talep_Raporu_${requestData.id}.xlsx`);
    };


    // ==============================================================================
    // 4. DATA FETCHING
    // ==============================================================================

    const fetchRequests = useCallback(async () => {
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
            showAlert('Talepler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);


    // ==============================================================================
    // 5. CRUD LOGIC
    // ==============================================================================

    const validateForm = (): boolean => {
        setSubjectError(false);
        if (!subject.trim()) {
            setSubjectError(true);
            showAlert("Lütfen Konu/Başlık alanını doldurun.", "warning");
            return false;
        }
        return true;
    };

    const resetForm = () => {
        setSubject('');
        setDescription('');
        setFilesToUpload([]);
        setAttachmentsInEdit([]);
        setIsEditing(false);
        setItemToEdit(null);
        setSubjectError(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ⬅️ CREATE LOGIC (شامل آپلود فایل)
    const createRequest = async () => {
        if (!validateForm()) return;

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
                    setLoadingButton(false);
                    return;
                }
            }

            const payload = {
                subject: subject,
                description: description,
                attachments: attachmentsPayload,
            };

            const response = await axios.post(
                server.baseurl + server.hr + "create-Request", // ⬅️ API ثبت
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 201) {
                showAlert('Talep başarıyla oluşturuldu!', 'success');
                resetForm();
                setIsFormVisible(false);
                fetchRequests();
            } else {
                showAlert(response.data.message || 'Talep oluşturulurken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // ⬅️ UPDATE LOGIC (شامل حفظ پیوست‌های قدیمی)
    const updateRequest = async () => {
        if (!validateForm() || !itemToEdit || !itemToEdit.id) return;

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

        try {
            let newAttachmentsPayload: Attachment[] = [];

            // 1. آپلود فایل‌های جدید
            if (filesToUpload.length > 0) {
                // ... (منطق آپلود فایل دقیقاً مانند createRequest) ...
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
                    setLoadingButton(false);
                    return;
                }
            }

            // 2. حفظ پیوست‌های قبلی که حذف نشده‌اند
            const keptExistingAttachments = itemToEdit.attachments
                .filter(att => attachmentsInEdit.includes(att.fileUrl.split('/').pop() || ''))
                .map(att => ({ fileUrl: att.fileUrl }));

            const finalAttachments = [...keptExistingAttachments, ...newAttachmentsPayload];

            const payload = {
                id: Number(itemToEdit.id),
                subject,
                description,
                attachments: finalAttachments,
            };

            const response = await axios.put(
                server.baseurl + server.hr + "update-request", // ⬅️ API آپدیت
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Talep başarıyla güncellendi!', 'success');
                resetForm();
                setIsFormVisible(false);
                fetchRequests();
            } else {
                showAlert(response.data.message || 'Talep güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleEditClick = (row: RequestType) => {
        resetForm();
        setIsEditing(true);
        setItemToEdit(row);
        setSubject(row.subject);
        setDescription(row.description);

        // تنظیم فایل‌های موجود برای نگهداری
        if (row.attachments && row.attachments.length > 0) {
            const fileNames = row.attachments.map(att => att.fileUrl.split('/').pop() || '');
            setAttachmentsInEdit(fileNames);
        } else {
            setAttachmentsInEdit([]);
        }

        setIsFormVisible(true);
        handleCloseMenu();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            setFilesToUpload(prev => [...prev, ...Array.from(files)]);
            const fileNames = Array.from(files).map(file => file.name);

            // نمایش فایل‌های جدید در لیست پیوست‌های در حال ویرایش
            setAttachmentsInEdit(prev => [...prev, ...fileNames]);
        }
    };

    // حذف یک فایل از لیست فایل‌های موجود (هنگام ویرایش)
    const handleRemoveAttachmentInEdit = (fileNameToRemove: string) => {
        // حذف از لیست نام‌های فایل‌های موجود
        setAttachmentsInEdit(prev => prev.filter(file => file !== fileNameToRemove));

        // اگر این فایل تازه انتخاب شده بود، از لیست آپلود هم حذف شود
        setFilesToUpload(prev => prev.filter(file => file.name !== fileNameToRemove));
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RequestType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        // setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = (row: RequestType) => {
        debugger
        setSelectedRowForMenu(row);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };

    const handleOpenAttachmentsModal = (attachments: Attachment[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };

    const handleCloseAttachmentsModal = () => {
        setOpenAttachmentsModal(false);
        setCurrentAttachments([]);
    };

    // ⬅️ تابع دانلود فایل پیوست شده (درخواستی شما)
    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) {
            showAlert('Dosya adresi geçersiz.', 'error');
            return;
        }
        // فرض می‌کنیم server.urldpwonload آدرس پایه برای دانلود است
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    // Table Pagination Handlers
    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // const paginatedRequestsList = useMemo(() => {
    //     return requestsList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    // }, [requestsList, page, rowsPerPage]);

    // داخل کامپوننت ListRequests

    const filteredRequests = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        return requestsList.filter((r) => {
            // 1. فیلتر جستجو (Search Filter)
            const matchesSearch =
                !q ||
                (String(r.id) ?? "").includes(q) ||
                (r.subject ?? "").toLowerCase().includes(q) ||
                (r.description ?? "").toLowerCase().includes(q);

            // 2. فیلتر وضعیت (Status Filter)
            const matchesStatus =
                statusFilter === 'all' ||
                r.status === statusFilter;

            // 3. فیلتر ID اعلان‌ها (Notification ID Filter)
            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(r.id));


            return matchesSearch && matchesStatus && matchesNotifIds;
        });
    }, [requestsList, searchTerm, statusFilter, hasIdsFilter, idsSet]);


    const sortedRequests = useMemo(() => {
        // ⬅️ تبدیل orderBy به keyof RequestType
        const validOrderBy = orderBy as keyof RequestType;
        return stableSort(filteredRequests, getComparator(order, validOrderBy));
    }, [filteredRequests, order, orderBy]);

    const paginatedRequestsList = useMemo(() =>
        sortedRequests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        , [sortedRequests, page, rowsPerPage]);





    // ⬅️ اضافه کردن Handler برای تغییر فیلتر وضعیت
    const handleStatusFilterChange = (_: any, v: 'all' | 0 | 1 | 2 | null) => {
        if (v !== null) {
            setStatusFilter(v as 'all' | 0 | 1 | 2);
            setPage(0);
        }
    };

    const handleRequestSort = (property: OrderBy) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
        setPage(0);
    };


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };


    // ⬅️ توابع مدیریت Modal تاریخچه
    const handleOpenHistoryModal = (row: RequestType) => {
        // اطمینان حاصل می‌کنیم که آرایه تاریخچه وجود دارد
        setHistoryData(row.requestStatusHistories || []);
        setOpenHistoryModal(true);
    };

    const handleCloseHistoryModal = () => {
        setOpenHistoryModal(false);
        setHistoryData([]);
    };


    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('ids');
        setSearchParams(next, { replace: true });

        navigate(location.pathname, {
            replace: true,
            state: { ...(location.state as any), notifIds: [] },
        });

        setPage(0);
    };


    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconFileText style={{ marginRight: 8 }} /> Talepler Listesi
                </Typography>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    justifyContent="flex-end"
                >
                    {!isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Talep kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => { setIsFormVisible(true); resetForm(); }}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni Talep Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => { setIsFormVisible(false); resetForm(); }}
                                fullWidth={false}
                                startIcon={<IconX size={20} />}
                            >
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Stack>

            {/* Form Bölümü */}
            {((isFormVisible && hasCreatePermission) || (isEditing && hasEditPermission)) && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" mb={2}>{isEditing ? 'Talebi Düzenle' : 'Yeni Talep Oluştur'}</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={12}>
                            <CustomFormLabel htmlFor="request-subject" required>Konu / Başlık</CustomFormLabel>
                            <CustomTextField
                                id="request-subject"
                                placeholder="Talep Başlığı"
                                size="small"
                                fullWidth
                                value={subject}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                                error={subjectError}
                                helperText={subjectError ? "Konu alanı zorunludur." : ""}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="request-description">Açıklama</CustomFormLabel>
                            <CustomTextField
                                id="request-description"
                                placeholder="Talep Detayları"
                                multiline
                                rows={4}
                                fullWidth
                                value={description}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                            />
                        </Grid>
                    </Grid>

                    {/* Attachments Section */}
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
                                // accept=".pdf, .xls, .xlsx"
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

                    {/* Form Actions */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                        {isEditing ? (
                            <>
                                <Button variant="contained" color="primary" onClick={updateRequest} disabled={loadingButton}>
                                    {loadingButton ? 'Bekleniyor...' : 'Güncellemeyi Kaydet'}
                                </Button>
                                <Button variant="outlined" color="secondary" onClick={() => { setIsFormVisible(false); resetForm(); }}>
                                    İptal Et
                                </Button>
                            </>
                        ) : (
                            <Button variant="contained" color="info" onClick={createRequest} disabled={loadingButton}>
                                {loadingButton ? 'Bekleniyor...' : 'Talep Oluştur'}
                            </Button>
                        )}
                    </Stack>
                </Paper>
            )}

            {alertMessage && (
                <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}

            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Grid container spacing={2} alignItems="center">
                    {/* Notif Filter Chip */}
                    {hasIdsFilter && (
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={`Bildirim filtresi: ${notifIds.length} id`} color="primary" size="small" />
                                <IconButton aria-label="Filtreyi temizle" size="small" onClick={clearNotifFilter} title="Filtreyi temizle">
                                    <IconX size={18} />
                                </IconButton>
                            </Stack>
                        </Grid>
                    )}

                    {/* Search Field */}
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            label="Talep Ara (Başlık/Açıklama/ID)"
                            variant="outlined"
                            fullWidth
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                            InputProps={{
                                startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>)
                            }}
                        />
                    </Grid>

                    {/* Status Filter */}
                    <Grid item xs={12} sm={6} md={4}>
                        <ToggleButtonGroup
                            value={statusFilter}
                            exclusive
                            onChange={handleStatusFilterChange}
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

            {/* Table Section */}
            <TableContainer component={Paper} sx={{ mt: 3 }}>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Talepler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <Table aria-label="Talepler tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <TableSortLabel active={orderBy === "subject"} direction={orderBy === "subject" ? order : "asc"} onClick={() => handleRequestSort("subject")}>
                                        <Typography variant="h6">Başlık</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>

                                {/* Açıklama (بدون مرتب‌سازی) */}
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>

                                {/* Durum (Status) */}
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <TableSortLabel active={orderBy === "status"} direction={orderBy === "status" ? order : "asc"} onClick={() => handleRequestSort("status")}>
                                        <Typography variant="h6">Durum</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>

                                {/* Tarih (CreateAt) */}
                                <StyledTableCell sx={{ color: "#171c23" }}>
                                    <TableSortLabel active={orderBy === "createAt"} direction={orderBy === "createAt" ? order : "desc"} onClick={() => handleRequestSort("createAt")}>
                                        <Typography variant="h6">Tarih</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Ekler</Typography></StyledTableCell>
                                <StyledTableCell></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedRequestsList.length > 0 ? (
                                paginatedRequestsList.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell><Typography variant="body1">{row.subject}</Typography></StyledTableCell>
                                        <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
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
                                            <Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" />
                                            {(row.requestStatusHistories && row.requestStatusHistories.length > 0) ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Durum Geçmişini Gör" : ""}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleOpenHistoryModal(row)}
                                                    >
                                                        <IconInfoCircle size={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                            ) : null}
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{new Date(row.createAt).toLocaleDateString('tr-TR')}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            {row.attachments && row.attachments.length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                    <IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}>
                                                        <IconLink size={18} />
                                                        <Chip label={row.attachments.length} color="primary"></Chip>
                                                    </IconButton>
                                                </CustomTooltip>
                                            ) : (
                                                <Typography variant="body2" color="textSecondary">-</Typography>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                <IconDots width={18} />
                                            </IconButton>
                                            <Menu anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                        <MuiMenuItem onClick={() => handleEditClick(row)} disabled={row.status !== 0}>
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
                                                            setSelectedRowForMenu(row); // مطمئن می‌شویم ردیف درست انتخاب شده است
                                                            setOpenDownloadSingleModal(true);
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
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">Henüz kayıtlı bir talep bulunamadı.</Typography>
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
                count={requestsList.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />

            <Dialog open={openDownloadSingleModal} onClose={() => setOpenDownloadSingleModal(false)} maxWidth="xs">
                <DialogTitle>Talep Raporunu İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 1 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                                if (selectedRowForMenu) {
                                    exportRequestPdf(selectedRowForMenu, statusToLabel); // ⬅️ فراخوانی PDF
                                }
                                setOpenDownloadSingleModal(false);
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
                                if (selectedRowForMenu) {
                                    exportRequestExcel(selectedRowForMenu, statusToLabel); // ⬅️ فراخوانی Excel
                                }
                                setOpenDownloadSingleModal(false);
                                handleCloseMenu();
                            }}
                            startIcon={<IconFileDownload />}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadSingleModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openHistoryModal} onClose={handleCloseHistoryModal} maxWidth="md" fullWidth>
                <DialogTitle>Talep Durum Geçmişi</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {historyData.length > 0 ? (
                            historyData.map((h, index) => (
                                // ⬅️ استفاده از Paper برای نمایش هر آیتم تاریخچه
                                <Paper key={index} elevation={1} sx={{ p: 2, borderLeft: `5px solid ${statusToColor(h.status)}` }}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Chip label={statusToLabel(h.status)} color={statusToColor(h.status)} size="small" />
                                        <Typography variant="caption" color="textSecondary">
                                            {new Date(h.createAt).toLocaleString('tr-TR')}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        Açıklama: {h.statusDescription || '—'}
                                    </Typography>
                                    {/* فرض می‌کنیم فیلد user در history موجود است */}
                                    <Typography variant="body2">
                                        İşlem Yapan: {h.user?.username || 'Bilinmiyor'}
                                    </Typography>
                                </Paper>
                            ))
                        ) : (
                            <Typography>Henüz durum geçmişi yok.</Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHistoryModal}>Kapat</Button>
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

            {/* Attachments Download Modal */}
            <Dialog open={openAttachmentsModal} onClose={handleCloseAttachmentsModal} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler</DialogTitle>
                <DialogContent dividers>
                    {currentAttachments.map((attachment, index) => (
                        <Button
                            key={index}
                            fullWidth
                            variant="outlined"
                            onClick={() => handleDownloadClick(attachment.fileUrl)}
                            sx={{ mt: 1 }}
                            startIcon={<IconDownload />}
                        >
                            {attachment.fileUrl.split('/').pop()}
                        </Button>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAttachmentsModal} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Modal (Gereksizse kaldırılabilir) */}
            <DeleteRequest
                openModal={openDeleteModal}
                itemToDelete={selectedRowForMenu}
                onClose={() => setOpenDeleteModal(false)}
                onDeleteSuccess={fetchRequests}
                showAlert={showAlert}
            />
        </Box>
    );
};

export default ListRequests;