import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    TableFooter,
    Stack, Alert, CircularProgress, Button,
    Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, MenuItem, TextField, IconButton, InputAdornment,
    Pagination,
    Menu,
    ListItemIcon,
    Autocomplete,
    TableSortLabel // ✨ اضافه شده برای سورت
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconRuler, IconClipboardList, IconFileSpreadsheet,
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { format, startOfYear, endOfYear } from 'date-fns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';

// --- PDF & Excel Exports ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import Logo from 'src/assets/images/logos/logo.png';

// --- STYLES ---
const visuallyHiddenStyle = {
    border: 0, clip: 'rect(0 0 0 0)', height: '1px', margin: -1,
    overflow: 'hidden', padding: 0, position: 'absolute',
    whiteSpace: 'nowrap', width: '1px',
};

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
}));

// --- TYPE DEFINITIONS ---
interface WorkhouseType { id: number; name: string; code: string; address: string; createAt: string; recordStatus: number; }

interface ReportRowType {
    workhouse_id: string; workhouse_code: string; workhousen_name: string;
    tarih: string; proje_kodu: string; bolge_adi: string; ekip_adi: string; il: string | null;
    ilce: string; proje_adi: string; is_turu: string; itemcode: string | null;
    itemname: string; unit: string; quantity: string; price: string | null; discount: string | null;
    total: string | null;
}

interface ReportResponseType {
    totalCount: number; totalPrice: number; page: number; pageSize: number; totalPages: number; data: ReportRowType[];
}

interface FilterParams {
    fromDate: string; toDate: string; projectId: number | null; workhouseId: number | null;
    maxQuantity: number | null; minQuantity: number | null; page: number; pageSize: number;
    storeId: number | null; dispatchId: string | null; itemId: number | null;
}

// --- SORTING HELPERS (✨ توابع جدید برای سورت) ---
type Order = 'asc' | 'desc';

const cleanNumber = (value: string | number | null): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[^0-9.-]+/g, "")) || 0;
};

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    let aValue: any = a[orderBy];
    let bValue: any = b[orderBy];

    // سورت ستون‌های عددی
    if (['quantity', 'price', 'total', 'discount'].includes(orderBy as string)) {
        aValue = cleanNumber(aValue);
        bValue = cleanNumber(bValue);
    }
    // سورت تاریخ
    else if (orderBy === 'tarih') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
    }
    // سورت رشته‌ها
    else {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
    }

    if (bValue < aValue) return -1;
    if (bValue > aValue) return 1;
    return 0;
}

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}


// --- MODAL FOR SINGLE ROW DETAILS ---
interface DetailViewModalProps {
    open: boolean; onClose: () => void; report: ReportRowType | null;
    onExportExcel: (report: ReportRowType) => Promise<void>; onExportPdf: (report: ReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;
    const reportTitle = report.itemname ? `Ürün Raporu Detayları: ${report.itemname}` : `Rapor Detayları: ${report.proje_adi}`;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="primary">Malzeme Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Malzeme Adı" size="small" fullWidth value={report.itemname} disabled />
                            <CustomTextField label="Malzeme Kodu" size="small" fullWidth value={report.itemcode || '-'} disabled />
                            <CustomTextField label="Proje Adı" size="small" fullWidth value={report.proje_adi} disabled />
                            <CustomTextField label="Tarih" size="small" fullWidth value={format(new Date(report.tarih), 'dd/MM/yyyy')} disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="success.main">Miktar ve Maliyet</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Miktar" size="small" fullWidth value={report.quantity} disabled />
                            <CustomTextField label="Birim" size="small" fullWidth value={report.unit} disabled />
                            <CustomTextField label="Birim Fiyat" size="small" fullWidth value={report.price ? `${report.price}` : '-'} disabled />
                            <CustomTextField label="Toplam Tutar" size="small" fullWidth value={report.total ? `${report.total}` : '-'} disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6" mt={2} mb={1} color="info">Konum ve Şantiye</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Şantiye Adı" size="small" fullWidth value={report.workhousen_name} disabled />
                            <CustomTextField label="Bölge" size="small" fullWidth value={report.bolge_adi} disabled />
                            <CustomTextField label="İl / İlçe" size="small" fullWidth value={`${report.il || '-'} / ${report.ilce}`} disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Raporu İndir</Typography>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => onExportPdf(report)} fullWidth>PDF Olarak İndir</Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => onExportExcel(report)} fullWidth>Excel Olarak İndir</Button>
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};


// --- MAIN COMPONENT ---
const ListItemReport = () => {
    const navigate = useNavigate();
    const currentYearStart = startOfYear(new Date());
    const currentYearEnd = endOfYear(new Date());

    // --- State Definitions ---
    const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
    const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);
    const [searchTerm, setSearchTerm] = useState('');

    // ✨ Sort States
    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof ReportRowType>('tarih');

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<ReportRowType | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        projectId: null, workhouseId: null,
        maxQuantity: null, minQuantity: null,
        page: 1, pageSize: 10,
        storeId: null, dispatchId: null, itemId: null,
    });

    const [reportData, setReportData] = useState<ReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);

    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
                format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
                format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch (e) { return '-'; }
    };

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);
    const clearAlert = () => { setAlertMessage(null); };

    const handleApiError = useCallback((e: any, defaultMessage: string = 'Bir hata oluştu.') => {
        if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
        else if (e.response?.status === 500) { showAlert('Sistem hatası oluştu, lütfen deneyin.', 'error'); }
        else { console.error("API Error:", e); showAlert(e.response?.data?.message || defaultMessage, 'error'); }
    }, [navigate, showAlert]);

    const handleFilterChange = (name: keyof FilterParams, value: any) => {
        setFilterParams(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const cleanCurrencyValue = (value: string | null): number => {
        return cleanNumber(value);
    };

    // --- Data Fetching ---
    const getWorkhousesList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });
            if (response.data.httpStatusCode === 200) {
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else { showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error'); }
        } catch (e: any) { handleApiError(e, 'Şantiye listesi alınamadı.'); }
    }, [navigate, showAlert, handleApiError]);

    const fetchListItemReportData = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        const requestParams = {
            fromDate: filterParams.fromDate || null, toDate: filterParams.toDate || null,
            projectId: Number(filterParams.projectId) || null, workhouseId: Number(filterParams.workhouseId) || null,
            maxQuantity: filterParams.maxQuantity || null, minQuantity: filterParams.minQuantity || null,
            page: filterParams.page, pageSize: filterParams.pageSize,
        };
        setLoadingData(true);
        try {
            const response = await axios.get(server.baseurl + server.report + `get-other-items-filtered-report-data`, { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setReportData(response.data.data as ReportResponseType);
            } else {
                setReportData(null); showAlert(response.data.message || 'Ürün rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) { setReportData(null); handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.'); }
        finally { setLoadingData(false); }
    }, [filterParams, navigate, showAlert, handleApiError]);

    useEffect(() => { getWorkhousesList(); }, [getWorkhousesList]);
    useEffect(() => { if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd')); }, [startDate]);
    useEffect(() => { if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd')); }, [endDate]);
    useEffect(() => { fetchListItemReportData(); }, [filterParams.fromDate, filterParams.toDate, filterParams.projectId, filterParams.workhouseId, filterParams.maxQuantity, filterParams.minQuantity, filterParams.page]);

    // ✨ Sorting Handler
    const handleRequestSort = (property: keyof ReportRowType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // ✨ Filter & Sort Logic (Client-Side for Display)
    const processedData = useMemo(() => {
        if (!reportData?.data) return [];
        let data = [...reportData.data];

        // 1. Search
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
            data = data.filter(row => {
                const columnsToSearch = [row.itemname, row.workhousen_name, row.proje_adi, row.proje_kodu, row.itemcode];
                return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
            });
        }
        // 2. Sort
        if (orderBy) {
            data.sort(getComparator(order, orderBy));
        }
        return data;
    }, [reportData, searchTerm, order, orderBy]);

    // --- UI Handlers ---
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => { setFilterParams(prev => ({ ...prev, page: value })); };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ReportRowType) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleOpenDetailViewModal = (report: ReportRowType) => { setSelectedReportToDownload(report); setOpenDetailViewModal(true); handleCloseMenu(); };
    const handleCloseDetailViewModal = () => { setOpenDetailViewModal(false); setSelectedReportToDownload(null); };

    // --- EXPORT Logic ---
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth(); const docAny = doc as any;
        docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
        doc.setFont('NotoSans', 'normal'); doc.setFontSize(14); doc.text(title, pageWidth / 2, 35, { align: 'center' });
        doc.setFontSize(10); doc.setFont('NotoSans', 'normal'); doc.text(`Rapor Tarihi:`, 15, 50);
        doc.setFont('NotoSans', 'normal'); doc.text(`${formatDateDisplay(new Date().toISOString())}`, 85, 50);
    };
    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8); doc.setFont('NotoSans', 'normal');
        const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
        let footerY = pageHeight - 30;
        companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 10; });
        doc.setFontSize(10); doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        const docAny = doc as any; const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };

    const handleExportPdfSingle = async (report: ReportRowType) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');
        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans", "normal");
            addPdfHeader(doc, `Ürün Raporu Detayı: ${report.itemname}`);
            const formattedQuantity = cleanCurrencyValue(report.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedPrice = cleanCurrencyValue(report.price).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedTotal = cleanCurrencyValue(report.total).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const tableRows = [
                ["Malzeme Adı", report.itemname], ["Malzeme Kodu", report.itemcode || '-'], ["Proje Adı", report.proje_adi],
                ["Şantiye Adı", report.workhousen_name], ["Tarih", format(new Date(report.tarih), 'dd/MM/yyyy')],
                ["Miktar (Quantity)", formattedQuantity], ["Birim", report.unit], ["Birim Fiyat (Price)", formattedPrice], ["Toplam Tutar (Total)", formattedTotal],
            ];
            autoTable(doc, {
                startY: 70, head: [["Alan (Field)", "Değer (Value)"]], body: tableRows, theme: 'grid', styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 9, cellPadding: 6, }, headStyles: { fillColor: [60, 141, 188], textColor: 255 }, didDrawPage: (_data) => { addPdfFooter(doc); }
            });
            doc.save(`Urun_Detay_${report.itemcode || report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.pdf`); showAlert('PDF raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportExcelSingle = async (report: ReportRowType) => {
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');
        try {
            const workbook = new Excel.Workbook(); const sheet = workbook.addWorksheet('Ürün Detay', { views: [{ rightToLeft: false }] });
            const data = [['Malzeme Adı', report.itemname], ['Malzeme Kodu', report.itemcode || '-'], ['Proje Adı', report.proje_adi], ['Şantiye Adı', report.workhousen_name], ['Tarih', format(new Date(report.tarih), 'dd/MM/yyyy')], ['Miktar (Quantity)', cleanCurrencyValue(report.quantity)], ['Birim Fiyat (Price)', cleanCurrencyValue(report.price)], ['Toplam Tutar (Total)', cleanCurrencyValue(report.total)],];
            const titleRow = sheet.addRow(['Ürün Raporu Detayı']); titleRow.font = { name: 'Calibri', size: 14, bold: true }; sheet.mergeCells('A1:B1'); sheet.addRow([]);
            const headerRow = sheet.addRow(['Alan (Field)', 'Değer (Value)']); headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            data.forEach(row => { const newRow = sheet.addRow(row); newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; }); const fieldName: string = row[0] as string; if (fieldName.startsWith('Miktar')) { newRow.getCell(2).numFmt = '#,##0.00'; } if (fieldName.includes('Fiyat') || fieldName.includes('Tutar')) { newRow.getCell(2).numFmt = '₺ #,##0.00'; } });
            sheet.columns[0].width = 25; sheet.columns[1].width = 35;
            const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `Urun_Detay_${report.itemcode || report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.xlsx`); showAlert('Excel raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportPdfAll = (data: ReportRowType[]) => {
        if (!data || data.length === 0) { showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning'); return; }
        try {
            const doc = new jsPDF('landscape', 'pt', 'a4'); (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans", "normal");
            addPdfHeader(doc, `Ürün Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);
            const headers = ["Malzeme Adı", "Şantiye Adı", "Proje Adı", "Tarih", "Miktar", "Birim", "Toplam Tutar (TL)"];
            const totalPrice = data.reduce((sum, row) => sum + cleanCurrencyValue(row.total), 0);
            const totalDisplay = totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });
            const body = data.map(row => {
                return [row.itemname, row.workhousen_name, row.proje_adi, format(new Date(row.tarih), 'dd/MM/yyyy'), cleanCurrencyValue(row.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 }), row.unit, cleanCurrencyValue(row.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })];
            });
            autoTable(doc, { startY: 70, head: [headers], body: body, theme: 'grid', styles: { font: 'NotoSans', fontSize: 8, cellPadding: 4, }, headStyles: { fillColor: [60, 141, 188], textColor: 255 }, foot: [['', '', '', '', '', 'TOPLAM MALİYET:', totalDisplay]], footStyles: { fillColor: [230, 240, 245], textColor: [192, 0, 0], fontStyle: 'normal', fontSize: 9 }, columnStyles: { 6: { fontStyle: 'normal', halign: 'right' } }, didDrawPage: (_data) => { addPdfFooter(doc); } });
            doc.save(`Urun_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.pdf`); showAlert('PDF raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportExcelAll = async (data: ReportRowType[]) => {
        if (!data || data.length === 0) { showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning'); return; }
        try {
            const workbook = new Excel.Workbook(); const sheet = workbook.addWorksheet('Ürün Raporu', { views: [{ rightToLeft: false }] });
            const headers = ["Malzeme Adı", "Şantiye Adı", "Proje Adı", "Tarih", "Miktar", "Birim", "Birim Fiyat", "Toplam Tutar (TL)"];
            const headerRow = sheet.addRow(headers); headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            data.forEach(row => {
                const newRow = sheet.addRow([row.itemname, row.workhousen_name, row.proje_adi, format(new Date(row.tarih), 'dd/MM/yyyy'), cleanCurrencyValue(row.quantity), row.unit, cleanCurrencyValue(row.price), cleanCurrencyValue(row.total)]);
                newRow.getCell(5).numFmt = '#,##0.00'; newRow.getCell(7).numFmt = '₺ #,##0.00'; newRow.getCell(8).numFmt = '₺ #,##0.00';
                newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            });
            sheet.columns.forEach((column, index) => { const header = headers[index]; if (header) { column.width = Math.max(header.length + 5, 15); } });
            const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `Urun_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.xlsx`); showAlert('Excel raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };

    // ✨✨✨ LOGIC FOR EXPORT WITH SEARCH & SORT APPLIED ✨✨✨
    const fetchFullReportData = useCallback(async (exportType: 'pdf' | 'excel') => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        const requestParams = {
            fromDate: filterParams.fromDate || null, toDate: filterParams.toDate || null,
            projectId: Number(filterParams.projectId) || null, workhouseId: Number(filterParams.workhouseId) || null,
            maxQuantity: filterParams.maxQuantity || null, minQuantity: filterParams.minQuantity || null,
            // بدون پیج بندی برای دریافت کل دیتا
        };
        const exportMessage = `Tüm rapor verileri için ${exportType.toUpperCase()} hazırlanıyor, lütfen bekleyin...`;
        showAlert(exportMessage, 'info');

        try {
            const response = await axios.get(server.baseurl + server.report + `get-other-items-filtered-report-data`, { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });

            if (response.data.httpStatusCode === 200 && response.data.data?.data) {
                let allData = response.data.data.data as ReportRowType[];

                // 1. اعمال فیلتر جستجو روی کل داده‌ها
                if (searchTerm) {
                    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
                    allData = allData.filter(row => {
                        const columnsToSearch = [row.itemname, row.workhousen_name, row.proje_adi, row.proje_kodu, row.itemcode];
                        return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
                    });
                }

                // 2. اعمال سورت روی کل داده‌ها
                if (orderBy) {
                    allData.sort(getComparator(order, orderBy));
                }

                // ارسال داده‌های پردازش شده برای دانلود
                if (exportType === 'pdf') { handleExportPdfAll(allData); } else { handleExportExcelAll(allData); }
            } else { showAlert('İndirilecek rapor verisi bulunamadı.', 'error'); }
        } catch (e: any) { handleApiError(e, `Tüm raporu indirirken bir sorun oluştu.`); }
    }, [filterParams, showAlert, handleApiError, handleExportPdfAll, handleExportExcelAll, searchTerm, order, orderBy]); // وابستگی‌ها مهم هستند

    // ✨ محاسبه جمع کل بر اساس داده‌های فیلتر شده (سرچ شده)
    const calculatedFilteredTotalPrice = useMemo(() => {
        if (!processedData) return 0;
        return processedData.reduce((acc, row) => {
            const val = cleanNumber(row.total); // تبدیل رشته به عدد
            return acc + val;
        }, 0);
    }, [processedData]);

    const tableHeaders: { label: string; key: keyof ReportRowType }[] = [
        { label: 'Malzeme Adı', key: 'itemname' },
        { label: 'Şantiye Adı', key: 'workhousen_name' },
        { label: 'Proje Adı', key: 'proje_adi' },
        { label: 'Tarih', key: 'tarih' },
        { label: 'Miktar', key: 'quantity' },
        { label: 'Birim', key: 'unit' },
        { label: 'Toplam Tutar (TL)', key: 'total' },
    ];

    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}><IconClipboardList size={28} style={{ marginRight: 8 }} /> Ürün (Stok) Raporları</Typography>
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>
                    <Grid item xs={12} sm={6} md={3}><Autocomplete id="workhouse-select" options={workhousesList} getOptionLabel={(o) => `${o.name} (${o.code})`} value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null} onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)} isOptionEqualToValue={(o, v) => o.id === v.id} renderInput={(params) => (<TextField {...params} label="Şantiye" fullWidth size="small" />)} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}><DatePicker label="Başlangıç Tarihi" value={startDate} onChange={(v) => setStartDate(v)} inputFormat="dd/MM/yyyy" renderInput={(params) => (<TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />)} /></LocalizationProvider></Grid>
                    <Grid item xs={12} sm={6} md={3}><LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}><DatePicker label="Bitiş Tarihi" value={endDate} onChange={(v) => setEndDate(v)} inputFormat="dd/MM/yyyy" renderInput={(params) => (<TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />)} /></LocalizationProvider></Grid>
                    <Grid item xs={12} sm={6} md={3}><CustomTextField label="Min. Miktar" size="small" type="number" fullWidth value={filterParams.minQuantity || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('minQuantity', Number(e.target.value) || null)} /></Grid>
                    <Grid item xs={12} sm={6} md={3}><CustomTextField label="Max. Miktar" size="small" type="number" fullWidth value={filterParams.maxQuantity || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('maxQuantity', Number(e.target.value) || null)} /></Grid>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={7} md={7}>
                            <TextField label="Tabloda Ara (Malzeme Adı/Kodu, Proje Adı, Şantiye Adı)" variant="outlined" fullWidth value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>
                        <Grid item xs={12} sm={5} md={5} spacing={2} display={'flex'} justifyContent={'space-evenly'}>
                            <Button variant="outlined" color="success"
                                startIcon={<IconFileSpreadsheet size={20} />} onClick={() => fetchFullReportData('excel')}
                                disabled={loadingData}>Tüm Veriyi Excel İndir</Button>
                            <Button variant="outlined" color="error"
                                startIcon={<IconFileDownload size={20} />} onClick={() => fetchFullReportData('pdf')}
                                disabled={loadingData}>Tüm Veriyi PDF İndir</Button>
                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>
            <Box sx={{ margin: "20px 0" }}></Box>

            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="item report table">
                        <TableHead style={{ background: "#f0f0f0" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <StyledTableCell key={header.key} sx={header.key === 'itemname' ? { width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}}>
                                        <TableSortLabel active={orderBy === header.key} direction={orderBy === header.key ? order : 'asc'} onClick={() => handleRequestSort(header.key)}>
                                            <Typography variant="h6" fontWeight="bold">{header.label}</Typography>
                                            {orderBy === header.key ? (<Box component="span" sx={visuallyHiddenStyle}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box>) : null}
                                        </TableSortLabel>
                                    </StyledTableCell>
                                ))}
                                <StyledTableCell><Typography variant="h6" fontWeight="bold">İşlemler</Typography></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : processedData.length ? (
                                processedData.map((row, index) => (
                                    <TableRow key={`${row.tarih}-${row.itemcode}-${index}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell sx={{ width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.itemname}</StyledTableCell>
                                        <StyledTableCell>{row.workhousen_name}</StyledTableCell>
                                        <StyledTableCell>{row.proje_adi}</StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.tarih), 'dd/MM/yyyy')}</StyledTableCell>
                                        <StyledTableCell><Typography fontWeight="bold">{row.quantity}</Typography></StyledTableCell>
                                        <StyledTableCell>{row.unit}</StyledTableCell>
                                        <StyledTableCell><Typography color="primary" fontWeight="bold">{row.total || '-'} TL</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            <Tooltip title="Detaylar ve İşlemler"><IconButton id={`actions-button-${index}`} onClick={(event) => handleClickMenu(event, row)} color="secondary" size="small"><IconDots width={20} /></IconButton></Tooltip>
                                            <Menu id="actions-menu" anchorEl={anchorEl} open={openMenu && selectedRowForMenu === row} onClose={handleCloseMenu}>
                                                <MenuItem onClick={() => handleOpenDetailViewModal(row)}><ListItemIcon><IconRuler width={18} /></ListItemIcon> Detayları Görüntüle</MenuItem>
                                                <MenuItem onClick={() => handleExportPdfSingle(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> PDF İndir</MenuItem>
                                                <MenuItem onClick={() => handleExportExcelSingle(row)}><ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon> Excel İndir</MenuItem>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (<TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun ürün raporu bulunamadı.</Typography></StyledTableCell></TableRow>)}
                        </TableBody>
                        {reportData && reportData.data?.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="right" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            {/* تغییر متن اگر کاربر سرچ کرده باشد */}
                                            {searchTerm ? 'Toplam (Filtrelenmiş):' : 'Genel Toplam (Tüm Veriler):'}
                                        </Typography>
                                    </StyledTableCell>
                                    <StyledTableCell align="left" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h5" color="primary" fontWeight="bold">
                                            {/* نمایش مقدار محاسبه شده جدید */}
                                            {calculatedFilteredTotalPrice.toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                        </Typography>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ borderTop: '2px solid #ddd' }}></StyledTableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </TableContainer>
                <>
                    {reportData && reportData.totalPages > 1 && (<Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Pagination count={reportData.totalPages} page={filterParams.page} onChange={handlePageChange} color="primary" showFirstButton showLastButton /><Typography variant="body2" sx={{ ml: 2 }}>Toplam: {reportData.totalCount} kayıt</Typography></Box>)}

                </>
            </BlankCard>
            <DetailViewModal open={openDetailViewModal} onClose={handleCloseDetailViewModal} report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle} />
        </Box>
    );
};

export default ListItemReport;