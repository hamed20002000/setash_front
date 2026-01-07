
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    Stack, Alert, CircularProgress, Button,
    Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, TextField, IconButton, InputAdornment,
    Menu,
    ListItemIcon,
    Autocomplete,
    MenuItem,
    TableFooter,
    TableSortLabel,
    TablePagination // ✅ اضافه شده برای صفحه‌بندی کلاینت
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconRuler, IconClipboardList,
    IconFileSpreadsheet,
    IconX
} from '@tabler/icons-react';
import axios from 'axios';

// ⚠️⚠️⚠️ مهم: مطمئن شو که مسیر فایل سرور درسته ⚠️⚠️⚠️
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


// تعریف دستی استایل برای جلوگیری از ارور ایمپورت
const visuallyHiddenStyle = {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: '1px',
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
};

// --- TYPE DEFINITIONS ---
interface WorkhouseType { id: number; name: string; code: string; address: string; createAt: string; recordStatus: number; }
interface ConcreteReportRowType {
    workhouse_id: string; workhouse_code: string; workhousen_name: string;
    tarih: string; proje_kodu: string; bolge_adi: string; ekip_adi: string; il: string; ilce: string;
    proje_adi: string; is_turu: string; itemcode: string; itemname: string; unit: string;
    quantity: string; price: string; discount: string; total: string;
}
interface ConcreteReportResponseType {
    totalCount: number; totalPrice: number; page: number; pageSize: number; totalPages: number; data: ConcreteReportRowType[];
}
interface FilterParams {
    fromDate: string; toDate: string; projectId: number | null; workhouseId: number | null;
    maxQuantity: number | null; minQuantity: number | null; page: number; pageSize: number;
    storeId: number | null; dispatchId: string | null;
}

// --- Helper Functions for Sorting ---
type Order = 'asc' | 'desc';

const cleanNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[^0-9.-]+/g, "")) || 0;
};

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    let aValue: any = a[orderBy];
    let bValue: any = b[orderBy];

    if (['quantity', 'price', 'total', 'discount'].includes(orderBy as string)) {
        aValue = cleanNumber(aValue);
        bValue = cleanNumber(bValue);
    }
    else if (orderBy === 'tarih') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
    }
    else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
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


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', },
    whiteSpace: 'nowrap',
}));


const cleanCurrencyValue = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) return 0;
    const cleanedString = String(value).replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
};



// --- MODAL FOR SINGLE ROW DETAILS ---
interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: ConcreteReportRowType | null;
    onExportExcel: (report: ConcreteReportRowType) => Promise<void>;
    onExportPdf: (report: ConcreteReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Beton Raporu Detayları: {report.proje_adi}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="primary">Proje Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Proje Adı" size="small" fullWidth value={report.proje_adi} disabled />
                            <CustomTextField label="Proje Kodu" size="small" fullWidth value={report.proje_kodu} disabled />
                            <CustomTextField label="İş Tipi" size="small" fullWidth value={report.is_turu} disabled />
                            <CustomTextField label="Tarih" size="small" fullWidth value={format(new Date(report.tarih), 'dd/MM/yyyy')} disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="success.main">Miktar ve Maliyet</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Miktar" size="small" fullWidth value={report.quantity} disabled />
                            <CustomTextField label="Birim" size="small" fullWidth value={report.unit} disabled />
                            <CustomTextField label="Birim Fiyat" size="small" fullWidth value={cleanCurrencyValue(report.price).toLocaleString('us-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })} disabled />
                            <CustomTextField label="Toplam Tutar" size="small" fullWidth value={cleanCurrencyValue(report.total).toLocaleString('us-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })} disabled />

                        </Stack>
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="h6" mt={2} mb={1} color="info">Konum ve Şantiye</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Şantiye Adı" size="small" fullWidth value={report.workhousen_name} disabled />
                            <CustomTextField label="Bölge" size="small" fullWidth value={report.bolge_adi} disabled />
                            <CustomTextField label="İl / İlçe" size="small" fullWidth value={`${report.il} / ${report.ilce}`} disabled />
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
const ListConcreteReport = () => {
    const navigate = useNavigate();

    const currentYearStart = startOfYear(new Date());
    const currentYearEnd = endOfYear(new Date());

    // --- State Definitions ---
    const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
    const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);
    const [searchTerm, setSearchTerm] = useState('');

    // Sort States
    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof ConcreteReportRowType>('tarih');

    // ✅ Client Side Pagination States
    const [page, setPage] = useState(0); // MUI TablePagination starts at 0
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        projectId: null,
        workhouseId: null,
        maxQuantity: null,
        minQuantity: null,
        page: 1,      // همیشه صفحه ۱ از سرور می‌گیریم
        pageSize: 1000, // ✅ دریافت تعداد بالا برای هندل کردن در کلاینت
        storeId: null,
        dispatchId: null,
    });

    const [reportData, setReportData] = useState<ConcreteReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Dropdown States
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);

    // Menu/Modal States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ConcreteReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<ConcreteReportRowType | null>(null);

    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
                format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
                format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            return '-';
        }
    };

    // const cleanCurrencyValue = (value: string) => {
    //     return parseFloat(value.replace(/[^0-9,.]/g, '').replace(',', '')) || 0;
    // };

    // --- Utility Callbacks ---
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);
    const clearAlert = () => { setAlertMessage(null); };

    const handleApiError = useCallback((e: any, defaultMessage: string = 'Bir hata oluştu.') => {
        console.error("API Error Full Detail:", e);
        if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
        else if (e.response?.status === 500) { showAlert('Sistem hatası oluştu, lütfen deneyin.', 'error'); }
        else { showAlert(e.response?.data?.message || defaultMessage, 'error'); }
    }, [navigate, showAlert]);

    const handleFilterChange = (name: keyof FilterParams, value: any) => {
        setFilterParams(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    // --- Data Fetching ---
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

    const fetchConcreteReportData = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }

        if (!server || !server.baseurl || !server.report) {
            return;
        }

        const requestParams = {
            fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
            toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
            projectId: Number(filterParams.projectId) || null,
            workhouseId: Number(filterParams.workhouseId) || null,
            maxQuantity: filterParams.maxQuantity || null,
            minQuantity: filterParams.minQuantity || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize, // ✅ 1000
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-beton-filtered-report-data/`,
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams,
                    timeout: 20000 // افزایش تایم اوت چون حجم دیتا ممکن است زیاد باشد
                }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                debugger
                setReportData(response.data.data as ConcreteReportResponseType);
            } else {
                setReportData(null);
                showAlert(response.data.message || 'Beton rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) {
            setReportData(null);
            handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.');
        } finally {
            setLoadingData(false);
        }
    }, [
        filterParams.fromDate, filterParams.toDate, filterParams.projectId, filterParams.workhouseId,
        filterParams.maxQuantity, filterParams.minQuantity, filterParams.page, filterParams.pageSize,
        navigate, showAlert, handleApiError
    ]);


    // --- Effects ---
    useEffect(() => {
        getWorkhousesList();
    }, [getWorkhousesList]);

    useEffect(() => {
        if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd'));
    }, [startDate]);

    useEffect(() => {
        if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd'));
    }, [endDate]);

    useEffect(() => {
        fetchConcreteReportData();
    }, [
        filterParams.fromDate, filterParams.toDate, filterParams.projectId,
        filterParams.workhouseId, filterParams.maxQuantity, filterParams.minQuantity
        // filterParams.page رو برداشتیم چون صفحه‌بندی سمت سرور دیگه تغییر نمیکنه
    ]);


    // --- Sorting & Searching Logic (Client Side) ---
    const handleRequestSort = (property: keyof ConcreteReportRowType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const processedData = useMemo(() => {
        if (!reportData?.data) return [];

        let data = [...reportData.data];

        // 1. فیلتر جستجو
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
            data = data.filter(row => {
                const columnsToSearch = [
                    row.workhousen_name,
                    row.proje_adi,
                    row.proje_kodu,
                    row.itemname,
                    row.itemcode,
                    row.is_turu
                ];
                return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
            });
        }

        // 2. مرتب‌سازی
        if (orderBy) {
            data.sort(getComparator(order, orderBy));
        }

        return data;
    }, [reportData, searchTerm, order, orderBy]);

    // ✅ Reset page when data/search changes
    useEffect(() => {
        setPage(0);
    }, [searchTerm, filterParams, reportData]);


    // ✅ Calculate Visible Rows for Client Side Pagination
    const visibleRows = useMemo(() => {
        return processedData.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
        );
    }, [processedData, page, rowsPerPage]);


    // --- Handlers for Pagination, Menu, Modal ---
    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ConcreteReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleOpenDetailViewModal = (report: ConcreteReportRowType) => {
        setSelectedReportToDownload(report);
        setOpenDetailViewModal(true);
        handleCloseMenu();
    };
    const handleCloseDetailViewModal = () => {
        setOpenDetailViewModal(false);
        setSelectedReportToDownload(null);
    };


    // --- Export Functions ---
    const addPdfHeader = (doc: jsPDF, title: string) => {

        const docAny = doc as any;
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 35; // کمی کوچک‌تر برای ظرافت بیشتر
        const logoHeight = 18;
        const margin = 15;
        const logoX = pageWidth - logoWidth - margin; // لوگو سمت راست

        try {
            doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
        } catch (e) {
            console.error("Logo yüklenemedi", e);
        }

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 25, { align: 'center' }); // عنوان وسط

        doc.setFontSize(10);
        doc.setFont('NotoSans', 'bold');
        doc.text(`Rapor Tarihi:`, 15, 35);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 35);

        // اضافه کردن خط جداکننده خاکستری طبق استاندارد جدید
        // doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(15, 40, pageWidth - 15, 40);
    };

    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(100);

        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
            'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
        ];

        let footerY = pageHeight - 40;
        companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 10;
        });

        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
        doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };


    const handleExportPdfSingle = async (report: ConcreteReportRowType) => {
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');
        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, `Beton Raporu Detayı: ${report.itemname}`);

            const tableColumn = ["Alan (Field)", "Değer (Value)"];
            const tableRows = [
                ["Proje Adı", report.proje_adi],
                ["Proje Kodu", report.proje_kodu],
                ["Şantiye Adı", report.workhousen_name],
                ["Şantiye Kodu", report.workhouse_code],
                ["Tarih", format(new Date(report.tarih), 'dd/MM/yyyy')],
                ["Bölge Adı", report.bolge_adi],
                ["İl / İlçe", `${report.il} / ${report.ilce}`],
                ["Ekip Adı", report.ekip_adi],
                ["İş Tipi", report.is_turu],
                ["Malzeme Kodu", report.itemcode],
                ["Malzeme Adı", report.itemname],
                ["Birim", report.unit],
                ["Miktar (Quantity)", report.quantity],
                ["Birim Fiyat (Price)", report.price],
                ["Toplam Tutar (Total)", report.total],
            ];
            doc.setFontSize(14);
            // doc.text(`Beton Raporu Detayı: ${report.proje_adi}`, 40, 40);

            autoTable(doc, {
                startY: 60,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 9, cellPadding: 6, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                didDrawPage: (_data) => {
                    addPdfFooter(doc);
                }
            });
            doc.save(`Beton_Detay_${report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) {
            handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.');
        }
    };

    const handleExportExcelSingle = async (report: ConcreteReportRowType) => {
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');
        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Beton Detay', { views: [{ rightToLeft: false }] });

            const data = [
                ['Proje Adı', report.proje_adi],
                ['Proje Kodu', report.proje_kodu],
                ['Şantiye Adı', report.workhousen_name],
                ['Şantiye Kodu', report.workhouse_code],
                ['Tarih', format(new Date(report.tarih), 'dd/MM/yyyy')],
                ['Bölge Adı', report.bolge_adi],
                ['İl', report.il],
                ['İlçe', report.ilce],
                ['Ekip Adı', report.ekip_adi],
                ['İş Tipi', report.is_turu],
                ['Malzeme Kodu', report.itemcode],
                ['Malzeme Adı', report.itemname],
                ['Birim', report.unit],
                ['Miktar (Quantity)', cleanCurrencyValue(report.quantity)],
                ['Birim Fiyat (Price)', cleanCurrencyValue(report.price)],
                ['Toplam Tutar (Total)', cleanCurrencyValue(report.total)],
            ];

            const titleRow = sheet.addRow(['Beton Raporu Detayı']);
            titleRow.font = { name: 'Calibri', size: 14, bold: true };
            sheet.mergeCells('A1:B1');
            sheet.addRow([]);

            const headerRow = sheet.addRow(['Alan (Field)', 'Değer (Value)']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                if (row[0] === 'Miktar (Quantity)') { newRow.getCell(2).numFmt = '#,##0.00'; }
                if (row[0] === 'Birim Fiyat (Price)') { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
                if (row[0] === 'Toplam Tutar (Total)') { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
            });
            sheet.columns[0].width = 25;
            sheet.columns[1].width = 35;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Beton_Detay_${report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            showAlert('Excel raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) {
            handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.');
        }
    };

    const handleExportPdfAll = (data: ConcreteReportRowType[]) => {
        if (!data || data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }
        showAlert('Görüntülenen verilerin PDF raporu hazırlanıyor...', 'info');
        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, `Beton Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);

            const headers = ["Şantiye Adı", "Proje Adı", "Tarih", "İş Tipi", "Miktar", "Birim", "Toplam Tutar (TL)"];

            const totalPrice = data.reduce((sum, row) => sum + cleanCurrencyValue(row.total), 0);
            const totalDisplay = totalPrice.toLocaleString('us-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });

            const body = data.map(row => {
                const formattedQuantity = cleanCurrencyValue(row.quantity).toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const rawTotal = cleanCurrencyValue(row.total);
                return [
                    row.workhousen_name,
                    row.proje_adi,
                    format(new Date(row.tarih), 'dd/MM/yyyy'),
                    row.is_turu,
                    formattedQuantity,
                    row.unit,
                    rawTotal.toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                ];
            });

            autoTable(doc, {
                startY: 70,
                head: [headers],
                body: body,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 8, cellPadding: 4, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                foot: [
                    ['', '', '', '', '', 'TOPLAM MALİYET:', totalDisplay],
                ],
                footStyles: {
                    fillColor: [230, 240, 245],
                    textColor: [192, 0, 0],
                    fontStyle: 'normal',
                    fontSize: 9,
                },
                columnStyles: {
                    6: { fontStyle: 'normal', halign: 'right' }
                },
                didDrawPage: (_data) => {
                    addPdfFooter(doc);
                }
            });
            doc.save(`Beton_Raporu_Listesi_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) {
            handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.');
        }
    };

    const handleExportExcelAll = async (data: ConcreteReportRowType[]) => {
        if (!data || data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }
        showAlert('Görüntülenen verilerin Excel raporu hazırlanıyor...', 'info');
        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Beton Raporu', { views: [{ rightToLeft: false }] });

            const headers = [
                "Şantiye Adı", "Proje Adı", "Tarih", "İş Tipi", "Miktar",
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
                    row.workhousen_name,
                    row.proje_adi,
                    format(new Date(row.tarih), 'dd/MM/yyyy'),
                    row.is_turu,
                    cleanCurrencyValue(row.quantity),
                    row.unit,
                    cleanCurrencyValue(row.price),
                    cleanCurrencyValue(row.total)
                ]);

                newRow.getCell(5).numFmt = '#,##0.00';
                newRow.getCell(7).numFmt = '₺ #,##0.00';
                newRow.getCell(8).numFmt = '₺ #,##0.00';
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
            saveAs(new Blob([buffer]), `Beton_Raporu_Listesi_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            showAlert('Excel raporu başarıyla oluşturuldu.', 'success');
        } catch (e: any) {
            handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.');
        }
    };

    const calculatedFilteredTotalPrice = useMemo(() => {
        if (!processedData) return 0;
        return processedData.reduce((acc, row) => {
            const val = cleanNumber(row.total);
            return acc + val;
        }, 0);
    }, [processedData]);

    const tableHeaders: { label: string; key: keyof ConcreteReportRowType }[] = [
        { label: 'Şantiye Adı', key: 'workhousen_name' },
        { label: 'Proje Adı', key: 'proje_adi' },
        { label: 'Tarih', key: 'tarih' },
        { label: 'İş Tipi', key: 'is_turu' },
        { label: 'Miktar', key: 'quantity' },
        { label: 'Birim', key: 'unit' },
        { label: 'Toplam Tutar (TL)', key: 'total' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconClipboardList size={28} style={{ marginRight: 8 }} /> Beton Raporları
            </Typography>

            {/* --- Alert Section --- */}
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            {/* --- Filter Section --- */}
            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            id="workhouse-select"
                            options={workhousesList}
                            getOptionLabel={(o) => `${o.name} (${o.code})`}
                            value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
                            onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="Şantiye" fullWidth size="small" />)}
                        />
                    </Grid>
                    {/* --- Filter Section --- */}
                    <Grid item xs={12} sm={6} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Başlangıç Tarihi"
                                value={startDate}
                                onChange={(v) => setStartDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        // جلوگیری از تایپ دستی
                                        onKeyDown={(e) => e.preventDefault()}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // جلوگیری از باز شدن تقویم
                                                            setStartDate(currentYearStart);
                                                        }}
                                                        sx={{ marginRight: -1 }}
                                                    >
                                                        <IconX size={16} /> {/* فراموش نکنید IconX را ایمپورت کنید */}
                                                    </IconButton>
                                                    {params.InputProps?.endAdornment}
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Bitiş Tarihi"
                                value={endDate}
                                onChange={(v) => setEndDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        // جلوگیری از تایپ دستی
                                        onKeyDown={(e) => e.preventDefault()}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEndDate(currentYearEnd);
                                                        }}
                                                        sx={{ marginRight: -1 }}
                                                    >
                                                        <IconX size={16} />
                                                    </IconButton>
                                                    {params.InputProps?.endAdornment}
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>
                    {/* <Grid item xs={12} sm={6} md={3}>
                        <CustomTextField
                            label="Min. Miktar"
                            size="small"
                            type="number"
                            fullWidth
                            value={filterParams.minQuantity || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('minQuantity', Number(e.target.value) || null)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <CustomTextField
                            label="Max. Miktar"
                            size="small"
                            type="number"
                            fullWidth
                            value={filterParams.maxQuantity || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('maxQuantity', Number(e.target.value) || null)}
                        />
                    </Grid> */}
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={7} md={7}>
                            <TextField
                                label="Ara (Proje Adı/Kodu, Şantiye Adı, İş Tipi)"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>)
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={5} md={5} spacing={2} display={'flex'} justifyContent={'space-evenly'}>
                            <Button
                                variant="outlined"
                                color="success"
                                startIcon={<IconFileSpreadsheet size={20} />}
                                onClick={() => handleExportExcelAll(processedData)}
                                disabled={loadingData || processedData.length === 0}
                            >
                                Tüm Veriyi Excel İndir
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<IconFileDownload size={20} />}
                                onClick={() => handleExportPdfAll(processedData)}
                                disabled={loadingData || processedData.length === 0}
                            >
                                Tüm Veriyi PDF İndir
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>

            <Box sx={{ margin: "20px 0" }}></Box>

            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="concrete report table">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <StyledTableCell key={header.key}>
                                        <TableSortLabel
                                            active={orderBy === header.key}
                                            direction={orderBy === header.key ? order : 'asc'}
                                            onClick={() => handleRequestSort(header.key)}
                                        >
                                            <Typography variant="h6" fontWeight="bold">
                                                {header.label}
                                            </Typography>
                                            {orderBy === header.key ? (
                                                <Box component="span" sx={visuallyHiddenStyle}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </StyledTableCell>
                                ))}
                                <StyledTableCell>
                                    <Typography variant="h6" fontWeight="bold">İşlemler</Typography>
                                </StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : visibleRows.length ? (
                                // ✅ فقط ردیف‌های برش خورده (صفحه جاری) نمایش داده می‌شوند
                                visibleRows.map((row, index) => (
                                    <TableRow key={`${row.proje_kodu}-${row.tarih}-${index}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>{row.workhousen_name}</StyledTableCell>
                                        <StyledTableCell>{row.proje_adi}</StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.tarih), 'dd/MM/yyyy')}</StyledTableCell>
                                        <StyledTableCell>{row.is_turu}</StyledTableCell>
                                        <StyledTableCell><Typography fontWeight="bold">{row.quantity}</Typography></StyledTableCell>
                                        <StyledTableCell>{row.unit}</StyledTableCell>
                                        {/* <StyledTableCell><Typography color="primary" fontWeight="bold">{row.total}</Typography></StyledTableCell> */}
                                        <StyledTableCell>
                                            <Typography color="primary" fontWeight="bold">
                                                {/* تبدیل به عدد و سپس فرمت‌بندی با جداکننده هزارگان */}
                                                {cleanCurrencyValue(row.total).toLocaleString('us-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })} TL
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Tooltip title="Detaylar ve İşlemler">
                                                <IconButton
                                                    id={`actions-button-${index}`}
                                                    aria-controls={openMenu ? 'actions-menu' : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={openMenu && selectedRowForMenu === row ? 'true' : undefined}
                                                    onClick={(event) => handleClickMenu(event, row)}
                                                    color="secondary"
                                                    size="small"
                                                >
                                                    <IconDots width={20} />
                                                </IconButton>
                                            </Tooltip>
                                            <Menu
                                                id="actions-menu"
                                                anchorEl={anchorEl}
                                                open={openMenu && selectedRowForMenu === row}
                                                onClose={handleCloseMenu}
                                            >
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
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Veri bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                        {reportData && reportData.data?.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="right" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            {searchTerm ? 'Toplam (Filtrelenmiş):' : 'Genel Toplam (Tüm Veriler):'}
                                        </Typography>
                                    </StyledTableCell>
                                    <StyledTableCell align="left" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h5" color="primary" fontWeight="bold">
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

                    {reportData && reportData.data?.length > 0 && (
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50, 100]}
                            component="div"
                            count={processedData.length} // تعداد کل دیتای فیلتر/جستجو شده
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="Satır sayısı:"
                            labelDisplayedRows={({ from, to, count }) =>
                                `${from}–${to} / ${count !== -1 ? count : `> ${to}`}`
                            }
                        />
                    )}
                </>


            </BlankCard>

            <DetailViewModal
                open={openDetailViewModal}
                onClose={handleCloseDetailViewModal}
                report={selectedReportToDownload}
                onExportExcel={handleExportExcelSingle}
                onExportPdf={handleExportPdfSingle}
            />

        </Box>
    );
};

export default ListConcreteReport;