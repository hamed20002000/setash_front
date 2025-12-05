import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    TableFooter, // Added for total price
    Stack, Alert, CircularProgress, Button,
    Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, MenuItem, TextField, IconButton,
    Pagination,
    Menu,
    ListItemIcon,
    Autocomplete,
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
// ✨ Added startOfYear, endOfYear
import { format, startOfYear, endOfYear } from 'date-fns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';

// --- PDF & Excel Exports ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// NOTE: NotoSansRegular should be correctly imported/defined
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';


import Logo from 'src/assets/images/logos/logo.png';


// --- TYPE DEFINITIONS (UPDATED FOR API MATCHING) ---
interface WorkhouseType { id: number; name: string; code: string; address: string; createAt: string; recordStatus: number; }

interface ItemType {
    id: number; name: string; description: string; abbreviation: string; recordStatus: number;
    category: { id: number; name: string; depth: number; recordStatus: number; };
    unit: { id: number; title: string; recordStatus: number; };
    status?: string;
}

// ✨ Renamed and adjusted ReportRowType fields based on provided JSON structure
interface ReportRowType {
    workhouse_id: string; workhouse_code: string; workhousen_name: string;
    tarih: string;           // Date field name
    proje_kodu: string;      // Project Code field name
    bolge_adi: string;       // Region field name
    ekip_adi: string;        // Team name field name
    il: string | null;       // Province field name
    ilce: string;            // District field name
    proje_adi: string;       // Project Name field name
    is_turu: string;         // Work Type field name
    itemcode: string | null;
    itemname: string;
    unit: string;
    quantity: string;        // String in API output
    price: string | null;    // String/Null in API output
    discount: string | null;
    total: string | null;    // String/Null in API output
}

interface ReportResponseType {
    totalCount: number;
    totalPrice: number; // Number in API output
    page: number; pageSize: number; totalPages: number; data: ReportRowType[];
}

interface FilterParams {
    docNumber: string; fromDate: string; toDate: string; projectId: number | null; workhouseId: number | null;
    maxQuantity: number | null; minQuantity: number | null; page: number; pageSize: number;
    storeId: number | null; dispatchId: string | null; itemId: number | null;
}

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
}));


// --- MODAL FOR SINGLE ROW DETAILS (UNCHANGED LOGIC) ---
interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: ReportRowType | null;
    onExportExcel: (report: ReportRowType) => Promise<void>;
    onExportPdf: (report: ReportRowType) => Promise<void>;
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
                            {/* Uses nullish coalescing for price/total */}
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
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                                onClick={() => onExportPdf(report)} fullWidth>
                                PDF Olarak İndir
                            </Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                                onClick={() => onExportExcel(report)} fullWidth>
                                Excel Olarak İndir
                            </Button>
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

    // ✨ Calculate start/end of current year
    const currentYearStart = startOfYear(new Date());
    const currentYearEnd = endOfYear(new Date());

    // --- State Definitions ---
    const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
    const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);
    const [searchTrigger, setSearchTrigger] = useState(0);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        docNumber: '',
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        projectId: null,    // Hidden
        workhouseId: null,
        maxQuantity: null,
        minQuantity: null,
        page: 1,
        pageSize: 10,
        storeId: null,      // Hidden
        dispatchId: null,   // Hidden
        itemId: null,
    });

    const [reportData, setReportData] = useState<ReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Dropdown States
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);

    // Menu/Modal States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<ReportRowType | null>(null);


    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return '-';
        try {
            // ابتدا سعی می‌کند به عنوان DateTime فرمت کند، در غیر این صورت فقط تاریخ
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
                format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
                format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            return '-';
        }
    };


    // --- Utility Callbacks ---
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

    const handleSearchClick = () => {
        if (filterParams.page !== 1) {
            setFilterParams(prev => ({ ...prev, page: 1 }));
        }
        setSearchTrigger(prev => prev + 1);
    };

    // Helper to clean price/total strings from symbols (e.g., "$35,000.00" -> 35000)
    const cleanCurrencyValue = (value: string | null): number => {
        if (!value) return 0;
        // Removes symbols, commas (thousand separators), and parses float
        return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    };


    // --- Data Fetching (Dropdowns - Logic for hidden fields maintained) ---

    const getItemsList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); showAlert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.', 'error'); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (response.data && response.data.success) {
                const processedData = response.data.data.filter((item: any) => item.recordStatus === 0).map((item: any) => ({
                    id: item.id, name: item.name, description: item.description, abbreviation: item.abbreviation,
                    recordStatus: item.recordStatus ?? 0, category: item.category, unit: item.unit, status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                }));
                setItemsList(processedData as ItemType[]);
            } else {
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            handleApiError(e, 'Ürünler sunucudan alınamadı');
        }
    }, [navigate, showAlert, handleApiError]);


    const getWorkhousesList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );
            if (response.data.httpStatusCode === 200) {
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else {
                showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
            }
        } catch (e: any) { handleApiError(e, 'Şantiye listesi alınamadı.'); }
    }, [navigate, showAlert, handleApiError]);



    const fetchListItemReportData = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }

        const requestParams = {
            docNumber: filterParams.dispatchId || null,
            fromDate: filterParams.fromDate || null,
            toDate: filterParams.toDate || null,
            projectId: Number(filterParams.projectId) || null,
            workhouseId: Number(filterParams.workhouseId) || null,
            itemId: Number(filterParams.itemId) || null,
            maxQuantity: filterParams.maxQuantity || null,
            minQuantity: filterParams.minQuantity || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize,
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-other-items-filtered-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                // Ensure number types are used for direct access like totalPrice
                setReportData(response.data.data as ReportResponseType);
            } else {
                setReportData(null);
                showAlert(response.data.message || 'Ürün rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) {
            setReportData(null);
            handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.');
        } finally {
            setLoadingData(false);
        }
    }, [filterParams.dispatchId, filterParams.fromDate, filterParams.toDate, filterParams.projectId, filterParams.workhouseId, filterParams.itemId, filterParams.maxQuantity, filterParams.minQuantity, filterParams.page, filterParams.pageSize, navigate, showAlert, handleApiError]);


    useEffect(() => {
        getWorkhousesList();
        getItemsList();
        fetchListItemReportData();
    }, [getWorkhousesList, getItemsList]);

    useEffect(() => {
        if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd'));
    }, [startDate]);

    useEffect(() => {
        if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd'));
    }, [endDate]);



    useEffect(() => {
        if (searchTrigger > 0 || filterParams.page !== 1) {
            fetchListItemReportData();
        }
    }, [searchTrigger, filterParams.page]);


    // --- Handlers for Pagination, Menu, Modal (Unchanged) ---
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setFilterParams(prev => ({ ...prev, page: value }));
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleOpenDetailViewModal = (report: ReportRowType) => {
        setSelectedReportToDownload(report);
        setOpenDetailViewModal(true);
        handleCloseMenu();
    };
    const handleCloseDetailViewModal = () => {
        setOpenDetailViewModal(false);
        setSelectedReportToDownload(null);
    };


    // A new function to add a header to the PDF document
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const docAny = doc as any;

        // Add company logo at the top-right
        docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);

        // Add report title at the center
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 35, { align: 'center' });

        // Add report date at the top-left
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(`Rapor Tarihi:`, 15, 50);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 85, 50);
    };

    // A new function to add a footer to the PDF document
    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
        ];
        let footerY = pageHeight - 30;
        companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 10;
        });
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        const docAny = doc as any;
        const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };


    const handleExportPdfSingle = async (report: ReportRowType) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            // 🆕 فراخوانی Header
            addPdfHeader(doc, `Ürün Raporu Detayı: ${report.itemname}`);

            const tableColumn = ["Alan (Field)", "Değer (Value)"];

            // Convert price/total to number for display, using Turkish locale (TRY)
            const cleanedQuantity = cleanCurrencyValue(report.quantity);
            const cleanedPrice = cleanCurrencyValue(report.price);
            const cleanedTotal = cleanCurrencyValue(report.total);

            const formattedQuantity = cleanedQuantity.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedPrice = cleanedPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedTotal = cleanedTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });


            const tableRows = [
                ["Malzeme Adı", report.itemname],
                ["Malzeme Kodu", report.itemcode || '-'],
                ["Proje Adı", report.proje_adi],
                ["Şantiye Adı", report.workhousen_name],
                ["Tarih", format(new Date(report.tarih), 'dd/MM/yyyy')],
                ["Miktar (Quantity)", formattedQuantity],
                ["Birim", report.unit],
                ["Birim Fiyat (Price)", formattedPrice],
                ["Toplam Tutar (Total)", formattedTotal],
            ];


            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 9, cellPadding: 6, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                didDrawPage: (_data) => {
                    addPdfFooter(doc); // 🆕 فراخوانی Footer
                }
            });

            doc.save(`Urun_Detay_${report.itemcode || report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportPdfAll = (data: ReportRowType[]) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }

        if (!data || data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }

        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            // 🆕 فراخوانی Header
            addPdfHeader(doc, `Ürün  Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);

            const headers = ["Malzeme Adı", "Şantiye Adı", "Proje Adı", "Tarih", "Miktar", "Birim", "Toplam Tutar (TL)"];

            // محاسبه جمع کل از داده‌های کامل
            const totalPrice = data.reduce((sum, row) => sum + cleanCurrencyValue(row.total), 0);
            const totalDisplay = totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });


            const body = data.map(row => {
                // استفاده از cleanCurrencyValue برای اطمینان از مقدار عددی تمیز
                const formattedQuantity = cleanCurrencyValue(row.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const rawTotal = cleanCurrencyValue(row.total);

                return [
                    row.itemname,
                    row.workhousen_name,
                    row.proje_adi,
                    format(new Date(row.tarih), 'dd/MM/yyyy'),
                    formattedQuantity,
                    row.unit,
                    rawTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), // نمایش فقط عدد برای جدول
                ];
            });

            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول
                head: [headers],
                body: body,
                theme: 'grid',
                styles: { font: 'NotoSans', fontSize: 8, cellPadding: 4, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },

                // 🆕 نمایش جمع کل (Totals) در Footer جدول
                foot: [
                    ['', '', '', '', '', 'TOPLAM MALİYET:', totalDisplay],
                ],
                footStyles: {
                    fillColor: [230, 240, 245],
                    textColor: [192, 0, 0],
                    fontStyle: 'normal',
                    fontSize: 9,
                    // تراز کردن سلول‌های پایانی
                    cellWidth: 'wrap',
                },
                columnStyles: {
                    6: { fontStyle: 'normal', halign: 'right' } // ستون Total Tutar
                },
                didDrawPage: (_data) => {
                    addPdfFooter(doc); // 🆕 فراخوانی Footer
                }
            });

            doc.save(`Urun_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('Tüm verilerin PDF raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) {
            handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.');
        }
    };

    const handleExportExcelSingle = async (report: ReportRowType) => {
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Ürün Detay', { views: [{ rightToLeft: false }] });

            const data = [
                ['Malzeme Adı', report.itemname],
                ['Malzeme Kodu', report.itemcode || '-'],
                ['Proje Adı', report.proje_adi],
                ['Şantiye Adı', report.workhousen_name],
                ['Tarih', format(new Date(report.tarih), 'dd/MM/yyyy')],
                ['Miktar (Quantity)', cleanCurrencyValue(report.quantity)],
                ['Birim Fiyat (Price)', cleanCurrencyValue(report.price)],
                ['Toplam Tutar (Total)', cleanCurrencyValue(report.total)],
            ];

            const titleRow = sheet.addRow(['Ürün Raporu Detayı']);
            titleRow.font = { name: 'Calibri', size: 14, bold: true };
            sheet.mergeCells('A1:B1');
            sheet.addRow([]);

            const headerRow = sheet.addRow(['Alan (Field)', 'Değer (Value)']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
                const fieldName: string = row[0] as string;
                // Apply correct number formatting
                if (fieldName.startsWith('Miktar (Quantity)')) { newRow.getCell(2).numFmt = '#,##0.00'; }
                if (fieldName.includes('Fiyat') || fieldName.includes('Tutar')) { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
            });

            sheet.columns[0].width = 25; sheet.columns[1].width = 35;
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Urun_Detay_${report.itemcode || report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };



    const handleExportExcelAll = async (data: ReportRowType[]) => {
        showAlert('Tüm verilerin Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Ürün Raporu', { views: [{ rightToLeft: false }] });

            const headers = [
                "Malzeme Adı", "Şantiye Adı", "Proje Adı", "Tarih", "Miktar",
                "Birim", "Birim Fiyat", "Toplam Tutar (TL)"
            ];

            const headerRow = sheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow([
                    row.itemname,
                    row.workhousen_name,
                    row.proje_adi,
                    format(new Date(row.tarih), 'dd/MM/yyyy'),
                    cleanCurrencyValue(row.quantity), // Added as number (Cleaned)
                    row.unit,
                    cleanCurrencyValue(row.price),    // Added as number (Cleaned)
                    cleanCurrencyValue(row.total)     // Added as number (Cleaned)
                ]);

                // Apply Number Formatting (Excel specific number format)
                newRow.getCell(5).numFmt = '#,##0.00';      // Quantity (Miktar)
                newRow.getCell(7).numFmt = '₺ #,##0.00';    // Price (Birim Fiyat)
                newRow.getCell(8).numFmt = '₺ #,##0.00';    // Total (Toplam Tutar)
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            sheet.columns.forEach((column, index) => {
                const header = headers[index];
                if (header) {
                    column.width = Math.max(header.length + 5, 15);
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Urun_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            showAlert('Tüm verilerin Excel raporu başarıyla oluşturuldu.', 'success');

        } catch (e: any) {
            handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.');
        }
    };

    const fetchFullReportData = useCallback(async (exportType: 'pdf' | 'excel') => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        const requestParams = {
            docNumber: filterParams.dispatchId || null, fromDate: filterParams.fromDate || null, toDate: filterParams.toDate || null,
            projectId: Number(filterParams.projectId) || null, workhouseId: Number(filterParams.workhouseId) || null,
            itemId: Number(filterParams.itemId) || null, maxQuantity: filterParams.maxQuantity || null, minQuantity: filterParams.minQuantity || null,
        };
        const exportMessage = `Tüm rapor verileri için ${exportType.toUpperCase()} hazırlanıyor, lütfen bekleyin...`;
        showAlert(exportMessage, 'info');

        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-other-items-filtered-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data?.data) {
                const allData = response.data.data.data as ReportRowType[];
                if (exportType === 'pdf') { handleExportPdfAll(allData); } else { handleExportExcelAll(allData); }
            } else { showAlert('İndirilecek rapor verisi bulunamadı.', 'error'); }
        } catch (e: any) { handleApiError(e, `Tüm raporu indirirken bir sorun oluştu.`); }
    }, [filterParams, showAlert, handleApiError, handleExportPdfAll, handleExportExcelAll]);


    const tableHeaders = [
        { label: 'Malzeme Adı', key: 'itemname' },
        { label: 'Şantiye Adı', key: 'workhousen_name' },
        { label: 'Proje Adı', key: 'proje_adi' },
        { label: 'Tarih', key: 'tarih' },
        { label: 'Miktar', key: 'quantity' },
        { label: 'Birim', key: 'unit' },
        { label: 'Toplam Tutar (TL)', key: 'total' },
        { label: 'İşlemler', key: 'actions' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconClipboardList size={28} style={{ marginRight: 8 }} /> Ürün (Stok) Raporları
            </Typography>

            {/* --- Alert Section --- */}
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            {/* --- Filter Section (Hidden fields logic maintained) --- */}
            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>

                    {/* Item (Malzeme) - VISIBLE */}
                    <Grid item xs={12} sm={4} md={3}>
                        <Autocomplete
                            id="item-select" options={itemsList}
                            getOptionLabel={(o) => `${o.name} (${o.abbreviation || o.category.name})`}
                            value={itemsList.find(i => i.id === filterParams.itemId) || null}
                            onChange={(_, newValue) => handleFilterChange('itemId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="Malzeme (Ürün)" fullWidth size="small" />)}
                        />
                    </Grid>

                    {/* Workhouse (Şantiye) - VISIBLE */}
                    <Grid item xs={12} sm={4} md={3}>
                        <Autocomplete
                            id="workhouse-select" options={workhousesList}
                            getOptionLabel={(o) => `${o.name} (${o.code})`}
                            value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
                            onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="Şantiye (Workhouse)" fullWidth size="small" />)}
                        />
                    </Grid>

                    {/* Project, Store, Dispatch are HIDDEN but state/logic is maintained */}

                    {/* From Date - VISIBLE */}
                    <Grid item xs={12} sm={4} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Başlangıç Tarihi" value={startDate} onChange={(v) => setStartDate(v)} inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (<TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />)}
                            />
                        </LocalizationProvider>
                    </Grid>

                    {/* To Date - VISIBLE */}
                    <Grid item xs={12} sm={4} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Bitiş Tarihi" value={endDate} onChange={(v) => setEndDate(v)} inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (<TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />)}
                            />
                        </LocalizationProvider>
                    </Grid>

                    {/* Min Quantity - VISIBLE */}
                    <Grid item xs={12} sm={4} md={3}>
                        <CustomTextField
                            label="Min. Miktar" size="small" type="number" fullWidth
                            value={filterParams.minQuantity || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('minQuantity', Number(e.target.value) || null)}
                        />
                    </Grid>

                    {/* Max Quantity - VISIBLE */}
                    <Grid item xs={12} sm={4} md={3}>
                        <CustomTextField
                            label="Max. Miktar" size="small" type="number" fullWidth
                            value={filterParams.maxQuantity || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('maxQuantity', Number(e.target.value) || null)}
                        />
                    </Grid>
                </Grid>

                {/* Search & Export All Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, gap: 2 }}>
                    <Button
                        variant="outlined" color="success" startIcon={<IconFileSpreadsheet size={20} />}
                        onClick={() => fetchFullReportData('excel')} disabled={loadingData}>
                        Tüm Veriyi Excel İndir
                    </Button>
                    <Button
                        variant="outlined" color="error" startIcon={<IconFileDownload size={20} />}
                        onClick={() => fetchFullReportData('pdf')} disabled={loadingData}>
                        Tüm Veriyi PDF İndir
                    </Button>
                    <Button
                        variant="contained" color="primary" startIcon={<IconSearch size={20} />}
                        onClick={handleSearchClick} disabled={loadingData}>
                        Filtreyi Uygula
                    </Button>
                </Box>
            </BlankCard>
            <Box sx={{ margin: "20px 0" }}></Box>

            {/* --- Data Table --- */}
            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="item report table">
                        <TableHead style={{ background: "#f0f0f0" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <StyledTableCell
                                        key={header.key}
                                        // ✨ اعمال عرض 100px به ستون Malzeme Adı
                                        sx={header.key === 'itemname' ? { width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}}
                                    >
                                        <Typography variant="h6" fontWeight="bold">
                                            {header.label}
                                        </Typography>
                                    </StyledTableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : reportData?.data?.length ? (
                                reportData.data.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell sx={{ width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {row.itemname}
                                        </StyledTableCell>
                                        <StyledTableCell>{row.workhousen_name}</StyledTableCell>
                                        <StyledTableCell>{row.proje_adi}</StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.tarih), 'dd/MM/yyyy')}</StyledTableCell>
                                        <StyledTableCell><Typography fontWeight="bold">{row.quantity}</Typography></StyledTableCell>
                                        <StyledTableCell>{row.unit}</StyledTableCell>
                                        <StyledTableCell><Typography color="primary" fontWeight="bold">{row.total || '-'} TL</Typography></StyledTableCell>

                                        {/* Actions Column (Menu) */}
                                        <StyledTableCell>
                                            <Tooltip title="Detaylar ve İşlemler">
                                                <IconButton
                                                    id={`actions-button-${index}`} aria-controls={openMenu ? 'actions-menu' : undefined}
                                                    aria-haspopup="true" aria-expanded={openMenu && selectedRowForMenu === row ? 'true' : undefined}
                                                    onClick={(event) => handleClickMenu(event, row)} color="secondary" size="small">
                                                    <IconDots width={20} />
                                                </IconButton>
                                            </Tooltip>
                                            <Menu
                                                id="actions-menu" anchorEl={anchorEl} open={openMenu && selectedRowForMenu === row}
                                                onClose={handleCloseMenu}>
                                                <MenuItem onClick={() => handleOpenDetailViewModal(row)}>
                                                    <ListItemIcon><IconRuler width={18} /></ListItemIcon> Detayları Görüntüle
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportPdfSingle(row)}>
                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> PDF İndir
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportExcelSingle(row)}>
                                                    <ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon> Excel İndir
                                                </MenuItem>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun ürün raporu bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                        {/* --- TABLE FOOTER FOR TOTAL PRICE --- */}
                        {reportData && reportData.data?.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    {/* 6 ستون اول را ادغام می‌کند (7 ستون - 1 ستون عملیات) */}
                                    <StyledTableCell colSpan={6} align="right" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            Genel Toplam (Toplam Tutar):
                                        </Typography>
                                    </StyledTableCell>
                                    {/* نمایش جمع کل با فرمت 'en-US' */}
                                    <StyledTableCell align="left" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h5" color="primary" fontWeight="bold">
                                            {reportData.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                        </Typography>
                                    </StyledTableCell>
                                    {/* سلول خالی برای ستون عملیات */}
                                    <StyledTableCell sx={{ borderTop: '2px solid #ddd' }}></StyledTableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </TableContainer>

                {/* Pagination Section */}
                <>
                    {reportData && reportData.totalPages > 1 && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Pagination
                                count={reportData.totalPages}
                                page={filterParams.page} onChange={handlePageChange} color="primary"
                                showFirstButton showLastButton />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                Toplam: {reportData.totalCount} kayıt
                            </Typography>
                        </Box>
                    )}
                </>
            </BlankCard>

            {/* --- Modal --- */}
            <DetailViewModal
                open={openDetailViewModal} onClose={handleCloseDetailViewModal}
                report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle} />
        </Box>
    );
};

export default ListItemReport;