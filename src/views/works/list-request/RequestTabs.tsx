import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    Typography, Box, Stack, Grid, Button, Alert,
    CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableBody,
    TablePagination,
    TableCell as MuiTableCell,
    Dialog, DialogTitle, DialogActions, DialogContent, DialogContentText,
    Divider, TextField, InputAdornment, ToggleButtonGroup, FormControl,
    ToggleButton as MuiToggleButton, TableSortLabel, Tab, Autocomplete,
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconFileText, IconPlus, IconDownload, IconLink, IconX,
    IconInfoCircle, IconSearch, IconFileDownload
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteRequest from './DeleteRequest';
import DeleteWorkhouseRent from './DeleteWorkhouseRent';
import { useAuth } from "src/context/AuthContext";

// --- گزارش‌گیری و تاریخ ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { ArialFont } from 'src/assets/fonts/Arial'; // فرض بر وجود
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Logo from 'src/assets/images/logos/logo.png'; // فرض بر وجود

// --- کامپوننت‌های فرم تفکیک‌شده (برای حل مشکل فوکوس) ---
import MaterialRequestForm from "./MaterialRequestForm";
import RentalRequestForm from "./RentalRequestForm";
import ActionMenu from "./ActionMenu";

// ==============================================================================
// 1. INTERFACES (Common for both modules)
// ==============================================================================
interface Attachment { fileUrl: string; }
interface User { username: string; }
interface RequestStatusHistory {
    status: 0 | 1 | 2; statusDescription: string; createAt: string; user: User;
}
export interface MaterialRequestType {
    id: number | string; subject: string; description: string; status: 0 | 1 | 2;
    createAt: string; attachments: Attachment[]; statusDescription?: string | null;
    requestStatusHistories?: RequestStatusHistory[];
}
export interface Workhouse { id: string; name: string; code: string; }
interface APIWorkhouse { id: string; name: string; code: string; }
export interface WorkhouseRentRequest {
    id: number | string; title: string; description: string; driverInfo: string;
    price: string; company: string; rentStartDate: string; rentEndDate: string;
    status: 0 | 1 | 2; createAt: string; attachments: Attachment[]; workhouse: APIWorkhouse;
    workhouseId?: number; workhouseName?: string;
}
type MaterialOrder = 'asc' | 'desc';
type MaterialOrderBy = keyof MaterialRequestType | 'id' | 'subject' | 'status' | 'createAt';

// ==============================================================================
// 2. STYLED COMPONENTS & UTILS
// ==============================================================================

// --- Styled Components (بدون تغییر) ---
const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    fontSize: '0.7rem', padding: '10px 4px', lineHeight: 1.2,
    [theme.breakpoints.up('md')]: { fontSize: '0.75rem', padding: '14px 12px', },
    '&.Mui-selected': { color: 'white' },
    '&.Mui-selected[data-value="all"]': { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } },
    '&.Mui-selected[data-value="0"]': { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } },
    '&.Mui-selected[data-value="1"]': { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } },
    '&.Mui-selected[data-value="2"]': { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } },
}));
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem', },
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
// --- توابع کمکی عمومی (بدون تغییر) ---
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

// --- توابع وضعیت و تاریخ (بدون تغییر) ---
const statusToLabel = (s: number) => {
    switch (s) { case 0: return "Beklemede"; case 1: return "Onaylandı"; case 2: return "Reddedildi"; default: return "-"; }
};
const statusToColor = (s: number): 'warning' | 'success' | 'error' | 'primary' => {
    switch (s) { case 0: return "warning"; case 1: return "success"; case 2: return "error"; default: return "primary"; }
};
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try { const date = new Date(dateString); return format(date, 'dd MMMM yyyy', { locale: tr }); } catch (e) { return "Geçersiz Tarih"; }
};
const stripHtml = (htmlString: string): string => {
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
    const topMargin = 5;
    const logoX = pageWidth - logoWidth - margin;

    // ⬅️ افزودن لوگو
    // @ts-ignore
    doc.addImage(Logo, 'PNG', logoX, topMargin, logoWidth, logoHeight);

    // @ts-ignore
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);

    // @ts-ignore
    doc.setFont('NotoSans', 'normal');
    doc.text(`Tarih Raporu:`, 15, 25);
    // @ts-ignore
    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 25);
};

const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    // @ts-ignore
    doc.setFont('NotoSans', 'normal');
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

const exportRequestPdf = (requestData: MaterialRequestType | WorkhouseRentRequest, title: string) => {
    const doc = new jsPDF();

    // --- تنظیمات فونت و زبان ---
    // @ts-ignore
    doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    // @ts-ignore
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    // @ts-ignore
    doc.addFileToVFS('Arial.ttf', ArialFont);
    // @ts-ignore
    doc.addFont('Arial.ttf', 'Arial', 'normal');
    // @ts-ignore
    doc.setFont('Arial');
    // ----------------------------

    const isMaterial = (requestData as MaterialRequestType).subject !== undefined;
    const tableData = [
        ['Başlık', isMaterial ? (requestData as MaterialRequestType).subject : (requestData as WorkhouseRentRequest).title],
        ['Durum', statusToLabel(requestData.status)],
        ['Tarih', new Date(requestData.createAt).toLocaleDateString('tr-TR')],
        ['Açıklama', stripHtml(requestData.description) || '-'],
        ...(!isMaterial ? [
            ['Şoför Bilgisi', (requestData as WorkhouseRentRequest).driverInfo || '-'],
            ['Kiralandığı Şirket', (requestData as WorkhouseRentRequest).company || '-'],
            ['Fiyat', (requestData as WorkhouseRentRequest).price + ' TL' || '-'],
            ['Şantiye', (requestData as WorkhouseRentRequest).workhouseName || 'Bilinmiyor'],
            ['Başlangıç', formatDateDisplay((requestData as WorkhouseRentRequest).rentStartDate)],
            ['Bitiş', formatDateDisplay((requestData as WorkhouseRentRequest).rentEndDate)],
        ] : []),
    ];

    autoTable(doc, {
        startY: 75,
        head: [['Özellik', 'Değer']],
        body: tableData,
        theme: 'grid',
        // @ts-ignore
        styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
        didDrawPage: (_data: any) => {
            addPdfHeader(doc, title);
            addPdfFooter(doc);
            doc.setFontSize(10);
            // @ts-ignore
            doc.setFont('Arial', 'normal');
            // doc.text(`Talep ID: ${requestData.id}`, 15, 32);
        },
        margin: { top: 40, bottom: 45 },
    });
    doc.save(`${title.replace(/ /g, '_')}_Raporu_${requestData.id}.pdf`);
};

const exportRequestExcel = async (requestData: MaterialRequestType | WorkhouseRentRequest, title: string) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet(title);
    worksheet.views = [{ rightToLeft: false }];

    // ⬅️ هدر اطلاعات شرکت در اکسل
    worksheet.addRow(['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.']).font = { bold: true, size: 12 };
    worksheet.addRow(['Rapor Başlığı:', title]).font = { bold: true };
    worksheet.addRow(['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    // ---------------------------------------------

    worksheet.columns = [
        { header: 'Özellik', key: 'key', width: 25 },
        { header: 'Değer', key: 'value', width: 60 }
    ];

    const isMaterial = (requestData as MaterialRequestType).subject !== undefined;
    worksheet.addRow({ key: 'Talep ID', value: requestData.id });
    worksheet.addRow({ key: 'Konu', value: isMaterial ? (requestData as MaterialRequestType).subject : (requestData as WorkhouseRentRequest).title });
    worksheet.addRow({ key: 'Durum', value: statusToLabel(requestData.status) });
    worksheet.addRow({ key: 'Oluşturulma Tarihi', value: new Date(requestData.createAt).toLocaleDateString('tr-TR') });
    worksheet.addRow({ key: 'Açıklama', value: stripHtml(requestData.description) || '-' });

    if (!isMaterial) {
        const rentalData = requestData as WorkhouseRentRequest;
        worksheet.addRow({ key: 'Şantiye', value: rentalData.workhouseName || 'Bilinmiyor' });
        worksheet.addRow({ key: 'Şoför Bilgisi', value: rentalData.driverInfo || '-' });
        worksheet.addRow({ key: 'Kiralandığı Şirket', value: rentalData.company || '-' });
        worksheet.addRow({ key: 'Fiyat', value: rentalData.price + ' TL' });
        worksheet.addRow({ key: 'Kira Başlangıç', value: formatDateDisplay(rentalData.rentStartDate) });
        worksheet.addRow({ key: 'Kira Bitiş', value: formatDateDisplay(rentalData.rentEndDate) });
    }

    worksheet.addRow([]);
    worksheet.addRow(['Ekler']).font = { bold: true, size: 12 };
    // @ts-ignore
    worksheet.mergeCells(`A${worksheet.lastRow?.number}:B${worksheet.lastRow?.number}`);

    if (requestData.attachments && requestData.attachments.length > 0) {
        worksheet.addRow(['Dosya Adı', 'URL']).font = { bold: true };
        requestData.attachments.forEach(att => { worksheet.addRow([att.fileUrl.split('/').pop() || '-', att.fileUrl]); });
    } else {
        worksheet.addRow(['Piyes bulunamadı']);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}_Raporu_${requestData.id}.xlsx`);
};

const exportAllRequestsPdf = (dataList: (MaterialRequestType | WorkhouseRentRequest)[], title: string, isMaterial: boolean) => {
    const doc = new jsPDF('l');

    doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    // @ts-ignore
    doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    // @ts-ignore
    doc.setFont('Arial');
    // ----------------------------

    const materialColumns = ['ID', 'Başlık', 'Durum', 'Tarih', 'Açıklama'];
    const rentalColumns = ['ID', 'Başlık', 'Şantiye', 'Başlangıç', 'Bitiş', 'Fiyat', 'Durum', 'Kiralandığı Şirket'];

    const head = [isMaterial ? materialColumns : rentalColumns];

    const body = dataList.map((row) => {
        if (isMaterial) {
            const mRow = row as MaterialRequestType;
            return [
                mRow.id,
                mRow.subject,
                statusToLabel(mRow.status),
                new Date(mRow.createAt).toLocaleDateString('tr-TR'),
                stripHtml(mRow.description).substring(0, 50) + '...',
            ];
        } else {
            const rRow = row as WorkhouseRentRequest;
            const priceString = String(rRow.price || 0).replace(/[^0-9.]/g, '');
            const numericPrice = parseFloat(priceString);
            const formattedPrice = isNaN(numericPrice) ? rRow.price || '-' : new Intl.NumberFormat('tr-TR', { currency: 'TRY', minimumFractionDigits: 2 }).format(numericPrice);

            return [
                rRow.id,
                // rRow.title,
                rRow.workhouseName || '-',
                formatDateDisplay(rRow.rentStartDate),
                formatDateDisplay(rRow.rentEndDate),
                formattedPrice,
                statusToLabel(rRow.status),
                rRow.company || '-',
            ];
        }
    });

    autoTable(doc, {
        head: head,
        body: body,
        startY: 40,
        theme: 'striped',
        // @ts-ignore
        styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 1, overflow: 'linebreak' },
        headStyles: { fillColor: [149, 147, 125], textColor: [255, 255, 255] },

        // ⬅️ فراخوانی Header و Footer در هر صفحه جدید
        didDrawPage: (_data: any) => {
            addPdfHeader(doc, title);
            addPdfFooter(doc);
            // @ts-ignore
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(10);
            doc.text('', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' }); // عنوان اصلی در بالاترین نقطه
        },
    });

    doc.save(`${title.replace(/ /g, '_')}_Tüm_Raporlar_${new Date().toISOString().substring(0, 10)}.pdf`);
};

const exportAllRequestsExcel = async (dataList: (MaterialRequestType | WorkhouseRentRequest)[], title: string, isMaterial: boolean) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet(title);
    worksheet.views = [{ rightToLeft: false }];

    // ⬅️ هدر اطلاعات شرکت در اکسل
    worksheet.addRow(['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.']).font = { bold: true, size: 12 };
    worksheet.addRow(['Rapor Başlığı:', title]).font = { bold: true };
    worksheet.addRow(['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    // ---------------------------------------------

    if (isMaterial) {
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Başlık', key: 'subject', width: 30 },
            { header: 'Durum', key: 'status', width: 15 },
            { header: 'Tarih', key: 'createAt', width: 18 },
            { header: 'Açıklama', key: 'description', width: 50 },
        ];
        worksheet.addRows(dataList.map(r => ({
            id: r.id,
            subject: (r as MaterialRequestType).subject,
            status: statusToLabel(r.status),
            createAt: new Date(r.createAt).toLocaleDateString('tr-TR'),
            description: stripHtml(r.description || ''),
        })));
    } else {
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Başlık', key: 'title', width: 25 },
            { header: 'Şantiye', key: 'workhouseName', width: 25 },
            { header: 'Başlangıç', key: 'rentStartDate', width: 18 },
            { header: 'Bitiş', key: 'rentEndDate', width: 18 },
            { header: 'Fiyat (TL)', key: 'price', width: 15 },
            { header: 'Durum', key: 'status', width: 15 },
            { header: 'Kiralandığı Şirket', key: 'company', width: 20 },
        ];
        worksheet.addRows(dataList.map(r => ({
            id: r.id,
            title: (r as WorkhouseRentRequest).title,
            workhouseName: (r as WorkhouseRentRequest).workhouseName || '-',
            rentStartDate: formatDateDisplay((r as WorkhouseRentRequest).rentStartDate),
            rentEndDate: formatDateDisplay((r as WorkhouseRentRequest).rentEndDate),
            price: String((r as WorkhouseRentRequest).price) + ' TL',
            status: statusToLabel(r.status),
            company: (r as WorkhouseRentRequest).company || '-',
        })));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}_Tüm_Raporlar_${new Date().toISOString().substring(0, 10)}.xlsx`);
};

// ==============================================================================
// 3. MAIN COMPONENT: RequestTabs
// ==============================================================================

const RequestTabs: React.FC = () => {
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    // --- State مدیریت Tab و UI ---
    const [currentTab, setCurrentTab] = useState('material');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    // const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // --- استیت‌های لیست‌ها و ردیف‌های انتخاب شده ---
    const [requestsList, setRequestsList] = useState<MaterialRequestType[]>([]);
    const [rentalRequestsList, setRentalRequestsList] = useState<WorkhouseRentRequest[]>([]);
    const [workhouses, setWorkhouses] = useState<Workhouse[]>([]);
    const [materialSelectedRowForMenu, setMaterialSelectedRowForMenu] = useState<MaterialRequestType | null>(null);
    const [rentalSelectedRowForMenu, setRentalSelectedRowForMenu] = useState<WorkhouseRentRequest | null>(null);
    const [materialItemToEdit, setMaterialItemToEdit] = useState<MaterialRequestType | null>(null);
    const [rentalItemToEdit, setRentalItemToEdit] = useState<WorkhouseRentRequest | null>(null);

    // --- استیت‌های Modal ---
    const [openDeleteMaterialModal, setOpenDeleteMaterialModal] = useState(false);
    const [openDeleteRentalModal, setOpenDeleteRentalModal] = useState(false);
    const [openDownloadSingleModal, setOpenDownloadSingleModal] = useState(false);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<RequestStatusHistory[]>([]);


    // --- استیت‌های فیلترینگ و Pagination ---
    // Material Table States
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');
    const [materialStatusFilter, setMaterialStatusFilter] = useState<'all' | 0 | 1 | 2>('all');
    const [materialOrderBy, setMaterialOrderBy] = useState<MaterialOrderBy>('createAt');
    const [materialOrder, setMaterialOrder] = useState<MaterialOrder>('desc');
    const [materialPage, setMaterialPage] = useState(0);
    const [materialRowsPerPage, setMaterialRowsPerPage] = useState(5);

    // Rental Table States
    const [rentalSearchTerm, setRentalSearchTerm] = useState('');
    const [rentalStatusFilter, setRentalStatusFilter] = useState<'all' | 0 | 1 | 2>('all');
    const [selectedRentalWorkhouseId, setSelectedRentalWorkhouseId] = useState<string | number>('');
    const [rentalOrderBy, setRentalOrderBy] = useState<keyof WorkhouseRentRequest>('createAt');
    const [rentalOrder, setRentalOrder] = useState<MaterialOrder>('desc');
    const [rentalPage, setRentalPage] = useState(0);
    const [rentalRowsPerPage, setRentalRowsPerPage] = useState(5);


    const [isBlinking, setIsBlinking] = useState(true);
    // ==============================================================================
    // 4. UTILS & AUTH
    // ==============================================================================
    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const idsFromState = ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState : (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id)).filter(id => Number.isFinite(id));
    const hasIdsFilter = notifIds.length > 0;
    const idsSet = new Set<number>(notifIds);

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

    // Handlers
    // const handleCloseMenu = () => { setAnchorEl(null); };
    const handleOpenAttachmentsModal = (attachments: Attachment[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };
    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };
    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('ids');
        setSearchParams(next, { replace: true });
        navigate(location.pathname, { replace: true, state: { ...(location.state as any), notifIds: [] } });
        setMaterialPage(0);
    };

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
                showAlert(response.data.message || 'Malzeme talepleri alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Malzeme talepleri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

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
            }
        } catch (e) {
            // Error handling for workhouses fetch (silent if not in rental tab)
        }
    }, []);

    const fetchRentalRequests = useCallback(async (workhouseId: string | number) => {
        if (!workhouseId) { setRentalRequestsList([]); setLoadingData(false); return; }
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
            setRentalRequestsList([]);
            showAlert('Kiralama talepleri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    // Initial Data Fetch & Tab Changes Effects
    useEffect(() => {
        if (currentTab === 'material') {
            fetchMaterialRequests();
        } else if (currentTab === 'rental') {
            fetchWorkhouses();
            const workhouseParam = searchParams.get('rentalWorkhouseId');
            if (workhouseParam) {
                setSelectedRentalWorkhouseId(workhouseParam);
                fetchRentalRequests(workhouseParam);
            } else {
                setLoadingData(false);
            }
        }
    }, [currentTab, searchParams, fetchMaterialRequests, fetchWorkhouses, fetchRentalRequests]);


    const filteredMaterialRequests = useMemo(() => {
        const q = materialSearchTerm.trim().toLowerCase();
        return requestsList.filter((r) => {
            const matchesSearch = !q || (String(r.id) ?? "").includes(q) || (r.subject ?? "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
            const matchesStatus = materialStatusFilter === 'all' || r.status === materialStatusFilter;
            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(r.id));
            return matchesSearch && matchesStatus && matchesNotifIds;
        });
    }, [requestsList, materialSearchTerm, materialStatusFilter, hasIdsFilter, idsSet]);

    const sortedMaterialRequests = useMemo(() => {
        const validOrderBy = materialOrderBy as keyof MaterialRequestType;
        // @ts-ignore
        return stableSort(filteredMaterialRequests, getComparator(materialOrder, validOrderBy));
    }, [filteredMaterialRequests, materialOrder, materialOrderBy]);

    const paginatedMaterialRequestsList = useMemo(() =>
        sortedMaterialRequests.slice(materialPage * materialRowsPerPage, materialPage * materialRowsPerPage + materialRowsPerPage)
        , [sortedMaterialRequests, materialPage, materialRowsPerPage]);


    // Rental Table Logic
    const filteredRentalRequests = useMemo(() => {
        const q = rentalSearchTerm.trim().toLowerCase();
        return rentalRequestsList.filter((r) => {
            const matchesSearch = !q || (String(r.id) ?? "").includes(q) || (r.title ?? "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q) || (r.driverInfo ?? "").toLowerCase().includes(q) || (r.company ?? "").toLowerCase().includes(q);
            const matchesStatus = rentalStatusFilter === 'all' || r.status === rentalStatusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [rentalRequestsList, rentalSearchTerm, rentalStatusFilter]);


    const sortedRentalRequests = useMemo(() => {
        const validOrderBy = rentalOrderBy as keyof WorkhouseRentRequest;
        // @ts-ignore
        return stableSort(filteredRentalRequests, getComparator(rentalOrder, validOrderBy));
    }, [filteredRentalRequests, rentalOrder, rentalOrderBy]);

    const paginatedRentalRequestsList = useMemo(() =>
        sortedRentalRequests.slice(rentalPage * rentalRowsPerPage, rentalPage * rentalRowsPerPage + rentalRowsPerPage)
        , [sortedRentalRequests, rentalPage, rentalRowsPerPage]);


    // Table Handlers
    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
        setIsFormVisible(false);
        setLoadingData(true);
        clearAlert();
    };

    // Edit Click Handlers (Passed to Forms to pre-fill and trigger update mode)
    const handleMaterialEditClick = (row: MaterialRequestType) => {
        setIsEditing(true);
        setMaterialItemToEdit(row);
        setRentalItemToEdit(null);
        setIsFormVisible(true);
        // handleCloseMenu();
    };
    const handleRentalEditClick = (row: WorkhouseRentRequest) => {
        setIsEditing(true);
        setRentalItemToEdit(row);
        setMaterialItemToEdit(null);
        setIsFormVisible(true);
        // handleCloseMenu();
    };

    // Delete Click Handlers
    const handleClickOpenDeleteModal = (row: MaterialRequestType | WorkhouseRentRequest) => {
        // handleCloseMenu();
        if (currentTab === 'material') {
            setMaterialSelectedRowForMenu(row as MaterialRequestType);
            setOpenDeleteMaterialModal(true);
        } else {
            setRentalSelectedRowForMenu(row as WorkhouseRentRequest);
            setOpenDeleteRentalModal(true);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    // --- Table UI Builders ---

    const MaterialTable = () => (
        <>

            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>

                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm filtrelenmiş kayıtları indir" : ""}>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => setOpenDownloadSingleModal(true)} // استفاده مجدد از همین Modal برای انتخاب نوع فایل
                                    startIcon={<IconFileDownload size={20} />}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>
                <Grid container spacing={2} alignItems="center">
                    {hasIdsFilter && (
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={`Bildirim filtresi: ${notifIds.length} `} color="primary" size="small" />
                                <IconButton aria-label="Filtreyi temizle" size="small" onClick={clearNotifFilter} title="Filtreyi temizle"><IconX size={18} /></IconButton>
                            </Stack>
                        </Grid>
                    )}
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            label="Talep Ara (Başlık/Açıklama/ID)" variant="outlined" fullWidth size="small"
                            value={materialSearchTerm}
                            onChange={(e) => { setMaterialSearchTerm(e.target.value); setMaterialPage(0); }}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <ToggleButtonGroup
                            value={materialStatusFilter} exclusive fullWidth size="small"
                            onChange={(_: any, v: 'all' | 0 | 1 | 2 | null) => { if (v !== null) { setMaterialStatusFilter(v); setMaterialPage(0); } }}
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
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Talepler yükleniyor...</Typography></Box>
                ) : (
                    <Table aria-label="Malzeme Talepleri tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {(['Başlık', 'Açıklama', 'Durum', 'Tarih', 'Ekler', ''] as const).map((head, index) => (
                                    <StyledTableCell key={index} sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={materialOrderBy === (head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt')}
                                            direction={materialOrderBy === (head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt') ? materialOrder : "asc"}
                                            onClick={() => {
                                                const property = head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt';
                                                const isAsc = materialOrderBy === property && materialOrder === "asc";
                                                setMaterialOrder(isAsc ? "desc" : "asc");
                                                setMaterialOrderBy(property);
                                                setMaterialPage(0);
                                            }}
                                        >
                                            <Typography variant="h6">{head}</Typography>
                                        </TableSortLabel>
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
                                            <IconButton onClick={(event) => handleClickMenu(event, row)}><IconDots width={18} /></IconButton>
                                            <Menu anchorEl={anchorEl} open={openMenu && materialSelectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                {hasEditPermission && (<MuiMenuItem onClick={() => handleMaterialEditClick(row)} disabled={row.status !== 0}><ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle</MuiMenuItem>)}
                                                {hasDeletePermission && (<MuiMenuItem onClick={() => handleClickOpenDeleteModal(row)} disabled={row.status !== 0}><ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek</MuiMenuItem>)}
                                                {hasDownloadPermission && (<MuiMenuItem onClick={() => { setMaterialSelectedRowForMenu(row); setOpenDownloadSingleModal(true); }}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem>)}
                                            </Menu>
                                        </StyledTableCell> */}

                                        <StyledTableCell>
                                            <ActionMenu
                                                row={row}
                                                type="material"
                                                permissions={{ hasEdit: hasEditPermission, hasDelete: hasDeletePermission, hasDownload: hasDownloadPermission }}
                                                handlers={{
                                                    onEdit: handleMaterialEditClick,
                                                    onDelete: handleClickOpenDeleteModal,
                                                    onDownload: (r) => { setMaterialSelectedRowForMenu(r as MaterialRequestType); setOpenDownloadSingleModal(true); }
                                                }}
                                            />
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
                rowsPerPageOptions={[5, 10, 25]} component="div"
                count={filteredMaterialRequests.length} rowsPerPage={materialRowsPerPage} page={materialPage}
                onPageChange={(_event: unknown, newPage: number) => setMaterialPage(newPage)}
                onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => { setMaterialRowsPerPage(parseInt(event.target.value, 10)); setMaterialPage(0); }}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
        </>
    );

    const RentalTable = () => (
        <>


            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>  <Grid item xs={12} mt={2} mr={2}>
                <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>

                    {hasDownloadPermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm filtrelenmiş kayıtları indir" : ""}>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => setOpenDownloadSingleModal(true)} // استفاده مجدد از همین Modal برای انتخاب نوع فایل
                                startIcon={<IconFileDownload size={20} />}
                            >
                                Tümünü İndir
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Grid>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                            <Autocomplete
                                id="table-workhouse-filter" options={workhouses} size="small"
                                getOptionLabel={(option) => option.name ? `${option.name} (Kod:${option.code})` : 'Tüm İşyerleri'}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                value={workhouses.find(w => w.id === selectedRentalWorkhouseId) || null}
                                onChange={(_event, newValue) => {
                                    const newWorkhouseId = newValue ? newValue.id : '';
                                    setSelectedRentalWorkhouseId(newWorkhouseId);
                                    setRentalPage(0);
                                    const next = new URLSearchParams(searchParams);
                                    if (newWorkhouseId) { next.set('rentalWorkhouseId', newWorkhouseId); } else { next.delete('rentalWorkhouseId'); }
                                    setSearchParams(next, { replace: true });
                                    fetchRentalRequests(newWorkhouseId);
                                }}
                                renderInput={(params) => (<TextField {...params} label="Şantiye Filtresi" variant="outlined" size="small" />)}
                            />
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Kiralama Ara (Başlık/Şirket/Şoför)" variant="outlined" fullWidth size="small"
                            value={rentalSearchTerm}
                            onChange={(e) => { setRentalSearchTerm(e.target.value); setRentalPage(0); }}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <ToggleButtonGroup
                            value={rentalStatusFilter} exclusive fullWidth size="small"
                            onChange={(_: any, v: 'all' | 0 | 1 | 2 | null) => { if (v !== null) { setRentalStatusFilter(v); setRentalPage(0); } }}
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
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Kiralama talepleri yükleniyor...</Typography></Box>
                ) : !selectedRentalWorkhouseId ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px"><Typography variant="subtitle1" color="textSecondary">Lütfen tabloyu görmek için yukarıdan bir Şantiye seçiniz.</Typography></Box>
                ) : (
                    <Table aria-label="Kiralama Talepleri tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {(['Başlık', 'Şantiye', 'Başlangıç', 'Bitiş', 'Fiyat (TL)', 'Durum', 'Ekler', ''] as const).map((head, index) => (
                                    <StyledTableCell key={index} sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={rentalOrderBy === (head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt')}
                                            direction={rentalOrderBy === (head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt') ? rentalOrder : "asc"}
                                            onClick={() => {
                                                const property = head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt';
                                                const isAsc = rentalOrderBy === property && rentalOrder === "asc";
                                                setRentalOrder(isAsc ? "desc" : "asc");
                                                setRentalOrderBy(property);
                                                setRentalPage(0);
                                            }}
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
                                                    if (isNaN(numericPrice)) return row.price || '-';
                                                    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(numericPrice);
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
                                        {/* <StyledTableCell>
                                            <IconButton onClick={(event) => handleClickMenu(event, row)}><IconDots width={18} /></IconButton>
                                            <Menu anchorEl={anchorEl} open={openMenu && rentalSelectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                {hasEditPermission && (<MuiMenuItem onClick={() => handleRentalEditClick(row)} disabled={row.status !== 0}><ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle</MuiMenuItem>)}
                                                {hasDeletePermission && (<MuiMenuItem onClick={() => handleClickOpenDeleteModal(row)} disabled={row.status !== 0}><ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek</MuiMenuItem>)}
                                                {hasDownloadPermission && (<MuiMenuItem onClick={() => { setRentalSelectedRowForMenu(row); setOpenDownloadSingleModal(true); }}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem>)}
                                            </Menu>
                                        </StyledTableCell> */}
                                        <StyledTableCell>
                                            <ActionMenu
                                                row={row}
                                                type="rental"
                                                permissions={{ hasEdit: hasEditPermission, hasDelete: hasDeletePermission, hasDownload: hasDownloadPermission }}
                                                handlers={{
                                                    onEdit: handleRentalEditClick,
                                                    onDelete: handleClickOpenDeleteModal,
                                                    onDownload: (r) => { setRentalSelectedRowForMenu(r as WorkhouseRentRequest); setOpenDownloadSingleModal(true); }
                                                }}
                                            />
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
                rowsPerPageOptions={[5, 10, 25]} component="div"
                count={filteredRentalRequests.length} rowsPerPage={rentalRowsPerPage} page={rentalPage}
                onPageChange={(_event: unknown, newPage: number) => setRentalPage(newPage)}
                onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => { setRentalRowsPerPage(parseInt(event.target.value, 10)); setRentalPage(0); }}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
        </>
    );


    // ==============================================================================
    // 7. RENDER
    // ==============================================================================

    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <TabContext value={currentTab}>
                {/* 1. Header & Tabs */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                    <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}><IconFileText style={{ marginRight: 8 }} /> Talep Yönetimi</Typography>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: { xs: 2, sm: 0 } }}>
                        <TabList onChange={handleTabChange} aria-label="Talep Türleri">
                            <Tab label="Malzeme Talepleri" value="material" />
                            <Tab label="Kiralama Talepleri" value="rental" />
                        </TabList>
                    </Box>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" justifyContent="flex-end" mb={2}>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Oluştur/Düzenle formunu açın." : ""}>
                        <BlinkingButton
                            variant="contained" color="primary"
                            onClick={() => { setIsFormVisible(true); setIsEditing(false); setMaterialItemToEdit(null); setRentalItemToEdit(null); }}
                            // isBlinking={currentTab === 'material' && !isFormVisible}
                            isBlinking={isBlinking}
                            fullWidth={false} startIcon={<IconPlus size={20} />}
                            disabled={!hasCreatePermission}
                        >
                            Yeni {currentTab === 'material' ? 'Malzeme' : 'Kiralama'} Talep Kaydet
                        </BlinkingButton>
                    </CustomTooltip>
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained" color="error"
                                onClick={() => { setIsFormVisible(false); setIsEditing(false); setMaterialItemToEdit(null); setRentalItemToEdit(null); }}
                                fullWidth={false} startIcon={<IconX size={20} />}
                            >
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>

                {/* 2. Form Bölümü (استفاده از کامپوننت‌های جدا شده) */}
                <Box>
                    {(isFormVisible && currentTab === 'material') && (
                        <MaterialRequestForm
                            isEditing={isEditing}
                            itemToEdit={materialItemToEdit}
                            showAlert={showAlert}
                            onSuccess={() => { setIsFormVisible(false); setIsEditing(false); fetchMaterialRequests(); }}
                            onCancel={() => { setIsFormVisible(false); setIsEditing(false); setMaterialItemToEdit(null); }}
                        />
                    )}
                    {(isFormVisible && currentTab === 'rental') && (
                        <RentalRequestForm
                            isEditing={isEditing}
                            itemToEdit={rentalItemToEdit}
                            workhouses={workhouses}
                            showAlert={showAlert}
                            onSuccess={() => { setIsFormVisible(false); setIsEditing(false); fetchRentalRequests(selectedRentalWorkhouseId); }}
                            onCancel={() => { setIsFormVisible(false); setIsEditing(false); setRentalItemToEdit(null); }}
                        />
                    )}
                </Box>

                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}

                {/* 3. Tab Contents */}
                <TabPanel value="material" sx={{ p: 0 }}><MaterialTable /></TabPanel>
                <TabPanel value="rental" sx={{ p: 0 }}><RentalTable /></TabPanel>
            </TabContext>

            <Dialog open={openDownloadSingleModal} onClose={() => setOpenDownloadSingleModal(false)} maxWidth="xs">
                <DialogTitle>
                    {materialSelectedRowForMenu || rentalSelectedRowForMenu
                        ? (currentTab === 'material' ? 'Malzeme Talep Raporunu İndir' : 'Kiralama Talep Raporunu İndir')
                        : (currentTab === 'material' ? 'Tüm Malzeme Taleplerini İndir' : 'Tüm Kiralama Taleplerini İndir') // عنوان برای دانلود کلی
                    }
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        {materialSelectedRowForMenu || rentalSelectedRowForMenu
                            ? "Seçilen kaydın detaylı raporunu indirin."
                            : "Tablodaki tüm filtrelenmiş kayıtların toplu raporunu indirin." // متن برای دانلود کلی
                        }
                    </DialogContentText>
                    <Stack direction="column" spacing={2} sx={{ mt: 1 }}>
                        <Button
                            variant="contained" color="primary"
                            onClick={() => {
                                const row = materialSelectedRowForMenu || rentalSelectedRowForMenu;
                                if (row) {
                                    exportRequestPdf(row, currentTab === 'material' ? 'Malzeme Talep Detay Raporu' : 'Kiralama Talep Detay Raporu');
                                } else if (currentTab === 'material') {
                                    exportAllRequestsPdf(filteredMaterialRequests, 'Tüm Malzeme Talepleri Raporu', true); // فراخوانی تابع کلی
                                } else {
                                    exportAllRequestsPdf(filteredRentalRequests, 'Tüm Kiralama Talepleri Raporu', false); // فراخوانی تابع کلی
                                }
                                setOpenDownloadSingleModal(false);
                                setMaterialSelectedRowForMenu(null);
                                setRentalSelectedRowForMenu(null);
                                // handleCloseMenu();
                            }}
                            startIcon={<IconFileDownload />}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained" color="success"
                            onClick={() => {
                                const row = materialSelectedRowForMenu || rentalSelectedRowForMenu;
                                if (row) {
                                    exportRequestExcel(row, currentTab === 'material' ? 'Malzeme Talep Detayları' : 'Kiralama Talep Detayları');
                                } else if (currentTab === 'material') {
                                    exportAllRequestsExcel(filteredMaterialRequests, 'Tüm Malzeme Talepleri Detayları', true); // فراخوانی تابع کلی
                                } else {
                                    exportAllRequestsExcel(filteredRentalRequests, 'Tüm Kiralama Talepleri Detayları', false); // فراخوانی تابع کلی
                                }
                                setOpenDownloadSingleModal(false);
                                setMaterialSelectedRowForMenu(null);
                                setRentalSelectedRowForMenu(null);
                                // handleCloseMenu();
                            }}
                            startIcon={<IconFileDownload />}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => { setOpenDownloadSingleModal(false); setMaterialSelectedRowForMenu(null); setRentalSelectedRowForMenu(null); }} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* History Modal (بازیابی شده) */}
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

            {/* Description Modal (بازیابی شده) */}
            <Dialog open={openDescriptionModal} onClose={() => setOpenDescriptionModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText><div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} /></DialogContentText>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDescriptionModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Attachments Modal */}
            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler</DialogTitle>
                <DialogContent dividers>
                    {currentAttachments.map((attachment, index) => (
                        <Button key={index} fullWidth variant="outlined" onClick={() => handleDownloadClick(attachment.fileUrl)} sx={{ mt: 1 }} startIcon={<IconDownload />}>
                            {attachment.fileUrl.split('/').pop()}
                        </Button>
                    ))}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAttachmentsModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Delete Modals */}
            <DeleteRequest
                openModal={openDeleteMaterialModal} itemToDelete={materialSelectedRowForMenu}
                onClose={() => setOpenDeleteMaterialModal(false)} onDeleteSuccess={fetchMaterialRequests} showAlert={showAlert}
            />
            <DeleteWorkhouseRent
                openModal={openDeleteRentalModal} itemToDelete={rentalSelectedRowForMenu}
                onClose={() => setOpenDeleteRentalModal(false)} onDeleteSuccess={() => fetchRentalRequests(selectedRentalWorkhouseId)} showAlert={showAlert}
            />
        </Box>
    );
};

export default RequestTabs;