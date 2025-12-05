import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    Stack, Alert, CircularProgress, Button,
    Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Grid,
    TextField,
    Pagination,
    Menu,
    ListItemIcon,
    Autocomplete,
    IconButton,
    MenuItem,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconCar, IconFileSpreadsheet,
    IconRuler
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { endOfYear, format, startOfYear } from 'date-fns';
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


// --- TYPE DEFINITIONS ---

interface WorkhouseType {
    id: number; name: string; code: string; address: string; createAt: string; recordStatus: number;
}

interface WorkType {
    id: number; title: string; recordStatus: number;
    startDate: string; endDate: string | null;
    tenderId: number; tenderTitle: string;
    status: string;
}

interface CarReportRowType {
    work_id: number | null;
    work_title: string | null;
    workhouse_id: number | null;
    workhouse_code: string | null;
    workhouse_name: string | null;
    personnel_id: string | null; // Note: IDs are strings in sample data
    personnel_name: string | null;
    personnel_family: string | null;
    brand: string;
    model: string;
    manufacture_date: string; // ISO date string
    plaque: string;
    fuel_type: 'GASOLINE' | 'DIESEL' | 'LPG' | 'ELECTRIC';
    fuel_date: string; // ISO date string
    fuel_fee: string; // E.g., "$10.00" - Must be parsed/formatted
    fuel_amount: number;
    total_price: string; // E.g., "$2,000.00" - This is the cost for the specific fuel record.
}

interface CarReportResponseType {
    totalCount: number;
    totalPrice: number | null; // 📌 NEW: Total price for all filtered records
    page: number;
    pageSize: number;
    totalPages: number;
    data: CarReportRowType[];
}

interface FilterParams {
    fromDate: string;
    toDate: string;
    workhouseId: number | null;
    storeId: number | null; // Not used but kept for context consistency
    dispatchId: string | null; // Not used but kept for context consistency
    page: number;
    pageSize: number;

    workId: number | null;
    // 📌 HIDDEN FIELDS - KEPT IN PARAMS FOR BACKEND CONSISTENCY IF NEEDED
    personnelId: number | null;
    brand: string;
    model: string;
}

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontStyle: 'normal', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
}));

// --- Helper function to safely parse and clean currency string ---
const parseCurrencyToNumber = (currencyString: string): number => {
    if (!currencyString) return 0;
    // Remove currency symbols ($, TL, etc.) and thousands separators (,)
    const cleanedString = currencyString.replace(/[^\d.,]/g, '');

    // Replace comma with dot for decimal point if necessary (assuming Turkish/European format)
    // If the API always returns US format (e.g. $1,000.00), this works:
    return parseFloat(cleanedString.replace(/,/g, ''));
};


// --- MODAL FOR SINGLE ROW DETAILS ---

interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: CarReportRowType | null;
    onExportExcel: (report: CarReportRowType) => Promise<void>;
    onExportPdf: (report: CarReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;

    const reportTitle = report.plaque ? `Yakıt Kaydı Detayları: ${report.plaque}` : `Kayıt Detayları`;
    const personnelFullName = `${report.personnel_name || ''} ${report.personnel_family || ''}`.trim() || '-';
    const totalCostNumber = parseCurrencyToNumber(report.total_price);
    const fuelFeeNumber = parseCurrencyToNumber(report.fuel_fee);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="primary">Araç ve Kullanım Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Plaka" size="small" fullWidth value={report.plaque} disabled />
                            <CustomTextField label="Marka / Model" size="small" fullWidth value={`${report.brand} / ${report.model}`} disabled />
                            <CustomTextField label="Şantiye" size="small" fullWidth value={report.workhouse_name || '-'} disabled />
                            <CustomTextField label="Proje / İş" size="small" fullWidth value={report.work_title || '-'} disabled />
                            <CustomTextField label="Personel Adı" size="small" fullWidth value={personnelFullName} disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="success.main">Yakıt Detayları</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Yakıt Tipi" size="small" fullWidth value={report.fuel_type} disabled />
                            <CustomTextField label="Yakıt Tarihi" size="small" fullWidth value={format(new Date(report.fuel_date), 'dd/MM/yyyy HH:mm')} disabled />
                            <CustomTextField label="Miktar (Litre)" size="small" fullWidth value={`${report.fuel_amount}`} disabled />
                            <CustomTextField label="Birim Fiyat" size="small" fullWidth value={`${fuelFeeNumber.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`} disabled />
                            <CustomTextField label="Toplam Maliyet" size="small" fullWidth value={`${totalCostNumber.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`} disabled />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Kaydı İndir</Typography>
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
const ListCarwarehouseReport = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    const currentYearStart = startOfYear(new Date());
    const currentYearEnd = endOfYear(new Date());

    const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
    const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);
    const [searchTrigger, setSearchTrigger] = useState(0);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        workhouseId: null,
        storeId: null,
        dispatchId: null,
        page: 1,
        pageSize: 10,

        workId: null,
        // 📌 HIDDEN/UNUSED FILTER FIELDS
        personnelId: null,
        brand: '',
        model: '',
    });

    const [reportData, setReportData] = useState<CarReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Dropdown States (Kept for Autocomplete fields)
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [worksList, setWorksList] = useState<WorkType[]>([]);
    // const [personnelList, setPersonnelList] = useState<PersonnelType[]>([]); // Not needed since the filter is hidden

    // Menu/Modal States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CarReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<CarReportRowType | null>(null);


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

    // --- Menu/Modal Handlers ---
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CarReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleOpenDetailViewModal = (report: CarReportRowType) => {
        setSelectedReportToDownload(report);
        setOpenDetailViewModal(true);
        handleCloseMenu();
    };
    const handleCloseDetailViewModal = () => {
        setOpenDetailViewModal(false);
        setSelectedReportToDownload(null);
    };
    // ------------------------------------

    // --- Data Fetching (Dropdowns) ---

    const getListWork = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const result = await axios.request({
                baseURL: server.baseurl + server.initialoperations + "get-works",
                method: "get",
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (result.data.httpStatusCode === 200) {
                const rawData = result.data.data;
                const formattedData: WorkType[] = rawData.map((item: any) => ({
                    id: item.id, title: item.title, startDate: item.startDate, endDate: item.endDate,
                    tenderId: item.tender ? Number(item.tender.id) : 0, tenderTitle: item.tender ? item.tender.title : '',
                    createAt: item.createAt, recordStatus: item.recordStatus,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                }));
                setWorksList(formattedData.filter(w => w.recordStatus === 0));
            } else {
                showAlert(result.data.message || 'İş listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            handleApiError(e, 'İş listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.');
        }
    }, [navigate, authToken, showAlert, handleApiError]);



    const getWorkhousesList = useCallback(async () => {
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



    // --- Main Data Fetching (Updated to match the final API structure) ---

    const fetchCarwarehouseReportData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }

        // Map filterParams to API structure for GET request query parameters
        const requestParams = {
            workhouseId: Number(filterParams.workhouseId) || null,
            workId: Number(filterParams.workId) || null,
            // Hidden filter fields sent as null/empty string to backend
            personnelId: filterParams.personnelId || null,
            brand: filterParams.brand || null,
            model: filterParams.model || null,

            fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
            toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize,
        };
        if (filterParams.fromDate) {
            requestParams.fromDate = filterParams.fromDate; // format قبلا در handleFilterChange انجام شده
        }
        if (filterParams.toDate) {
            requestParams.toDate = filterParams.toDate; // format قبلا در handleFilterChange انجام شده
        }

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-car-fuel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                setReportData(response.data.data as CarReportResponseType);
            } else {
                setReportData(null);
                showAlert(response.data.message || 'Araç depo rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) {
            setReportData(null);
            handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.');
        } finally {
            setLoadingData(false);
        }
    }, [filterParams, navigate, authToken, showAlert, handleApiError]);


    // --- Effects for Data Loading ---
    useEffect(() => {
        getWorkhousesList();
        getListWork();
        // getAllPersonnels(); // 📌 Hidden
        fetchCarwarehouseReportData();
    }, [getWorkhousesList, getListWork]); // Removed getAllPersonnels

    // Sync DatePicker Date (Date object) with FilterParams Date (string)
    useEffect(() => {
        if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd'));
        // 📌 اگر کاربر تاریخ را پاک کند، فیلتر را خالی کنید
        else handleFilterChange('fromDate', '');
    }, [startDate]);

    useEffect(() => {
        if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd'));
        // 📌 اگر کاربر تاریخ را پاک کند، فیلتر را خالی کنید
        else handleFilterChange('toDate', '');
    }, [endDate]);

    useEffect(() => {
        if (searchTrigger > 0 || filterParams.page !== 1) {
            fetchCarwarehouseReportData();
        }
    }, [searchTrigger, filterParams.page]);


    // --- Handlers for Pagination ---
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setFilterParams(prev => ({ ...prev, page: value }));
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


    const handleExportPdfSingle = async (report: CarReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            const personnelFullName = `${report.personnel_name || ''} ${report.personnel_family || ''}`.trim() || '-';
            const totalCostNumber = parseCurrencyToNumber(report.total_price);
            const fuelFeeNumber = parseCurrencyToNumber(report.fuel_fee);

            // 🆕 فراخوانی Header
            addPdfHeader(doc, `Yakıt Kaydı Detayı: ${report.plaque}`);

            const tableColumn = ["Alan (Field)", "Değer (Value)"];
            const tableRows = [
                ["Plaka", report.plaque], ["Marka / Model", `${report.brand} / ${report.model}`],
                ["Şantiye", report.workhouse_name || '-'], ["Proje / İş", report.work_title || '-'],
                ["Personel", personnelFullName],
                ["Yakıt Tipi", report.fuel_type],
                ["Yakıt Tarihi", format(new Date(report.fuel_date), 'dd/MM/yyyy HH:mm')],
                ["Miktar (Litre)", report.fuel_amount],
                ["Birim Fiyat", fuelFeeNumber.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })],
                ["Toplam Maliyet", totalCostNumber.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })],
            ];


            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 6, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                didDrawPage: (_data) => {
                    addPdfFooter(doc); // 🆕 فراخوانی Footer
                }
            });

            doc.save(`Yakıt_Detay_${report.plaque}_${format(new Date(), 'yyyyMMddHHmm')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportPdfAll = async () => {
        showAlert('Tüm verilerin PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        // 1. Fetch all data using the filter
        const allData = await fetchAllFilteredData();
        if (!allData || allData.length === 0) {
            showAlert('Dışa aktarılacak veri bulunamadı.', 'warning');
            return;
        }

        try {
            const doc = new jsPDF('landscape', 'pt', 'a4'); // Landscape for more columns
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            // 🆕 فراخوانی Header
            addPdfHeader(doc, `Araç Yakıt Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);

            const tableColumn = [
                "Plaka", "Marka/Model", "Şantiye", "Personel",
                "Yakıt Tipi", "Yakıt Tarihi", "Miktar (L)", "Birim Fiyat", "Toplam Maliyet"
            ];

            const tableRows = allData.map(row => {
                const personnelFullName = `${row.personnel_name || ''} ${row.personnel_family || ''}`.trim() || '-';
                const totalCostNumber = parseCurrencyToNumber(row.total_price);
                const fuelFeeNumber = parseCurrencyToNumber(row.fuel_fee);

                return [
                    row.plaque, `${row.brand} / ${row.model}`, row.workhouse_name || '-', personnelFullName,
                    row.fuel_type, format(new Date(row.fuel_date), 'dd/MM/yyyy HH:mm'), row.fuel_amount.toString(),
                    fuelFeeNumber.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
                    totalCostNumber.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
                ];
            });

            // 📌 محاسبه مجدد مجموع (چون از fetchAllFilteredData استفاده می‌کنیم)
            const calculatedTotalPrice = allData.reduce((sum, row) => sum + parseCurrencyToNumber(row.total_price), 0);
            const totalDisplay = calculatedTotalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });


            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 5 },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },

                // 🆕 نمایش جمع کل (Totals) در Footer جدول
                foot: [
                    ['', '', '', '', '', '', 'Toplam Maliyet:', totalDisplay, ''],
                ],
                footStyles: {
                    fillColor: [230, 240, 245],
                    textColor: [192, 0, 0], // Bold color for cost
                    fontStyle: 'normal',
                    fontSize: 9
                },
                columnStyles: {
                    7: { fontStyle: 'bold', halign: 'right' }, // Bold Total Cost column
                    8: { fontStyle: 'bold', halign: 'right' }, // Bold Total Cost column
                },
                didDrawPage: (_data) => {
                    addPdfFooter(doc); // 🆕 فراخوانی Footer
                }
            });

            doc.save(`Tum_Yakıt_Raporu_${format(new Date(), 'yyyyMMddHHmm')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Toplu PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportExcelSingle = async (report: CarReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Yakıt Kaydı Detay', { views: [{ rightToLeft: false }] });

            const personnelFullName = `${report.personnel_name || ''} ${report.personnel_family || ''}`.trim() || '-';
            const totalCostNumber = parseCurrencyToNumber(report.total_price);
            const fuelFeeNumber = parseCurrencyToNumber(report.fuel_fee);


            const data = [
                ['Plaka', report.plaque], ['Marka / Model', `${report.brand} / ${report.model}`],
                ['Şantiye', report.workhouse_name || '-'], ['Proje / İş', report.work_title || '-'],
                ['Personel', personnelFullName],
                ['Yakıt Tipi', report.fuel_type],
                ['Yakıt Tarihi', format(new Date(report.fuel_date), 'dd/MM/yyyy HH:mm')],
                ['Miktar (Litre)', report.fuel_amount],
                ['Birim Fiyat', fuelFeeNumber],
                ['Toplam Maliyet', totalCostNumber],
            ];

            const titleRow = sheet.addRow(['Araç Yakıt Kaydı Detayı']);
            titleRow.font = { name: 'Calibri', size: 14, bold: true };
            sheet.mergeCells('A1:B1'); sheet.addRow([]);

            const headerRow = sheet.addRow(['Alan (Field)', 'Değer (Value)']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach((row, _index) => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

                // Apply currency format to Maliyet and Birim Fiyat rows
                const fieldName = row[0] as string;
                if (fieldName.includes('Maliyet') || fieldName.includes('Birim Fiyat')) {
                    newRow.getCell(2).numFmt = '₺ #,##0.00';
                }
            });

            sheet.columns[0].width = 25; sheet.columns[1].width = 35;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Yakıt_Detay_${report.plaque}_${format(new Date(), 'yyyyMMddHHmm')}.xlsx`);

            showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const fetchAllFilteredData = useCallback(async () => {
        if (!authToken) { navigate("/"); return null; }

        const requestParams = {
            workhouseId: Number(filterParams.workhouseId) || null,
            workId: Number(filterParams.workId) || null,
            fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
            toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
            page: 1, // Fetch all data
            pageSize: 10000, // Large page size to ensure all data is fetched
        };

        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-car-fuel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                return response.data.data.data as CarReportRowType[];
            }
            showAlert(response.data.message || 'Tüm rapor verileri alınamadı.', 'error');
            return null;
        } catch (e: any) {
            handleApiError(e, 'Tüm rapor verileri alınırken bir sorun oluştu.');
            return null;
        }
    }, [filterParams, navigate, authToken, showAlert, handleApiError]);


    const handleExportExcelAll = async () => {
        showAlert('Tüm verilerin Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');
        const allData = await fetchAllFilteredData();
        if (!allData || allData.length === 0) {
            showAlert('Dışa aktarılacak veri bulunamadı.', 'warning');
            return;
        }

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Tüm Yakıt Kayıtları', { views: [{ rightToLeft: false }] });

            const tableColumn = [
                "Plaka", "Marka", "Model", "Şantiye Adı", "Şantiye Kodu", "Proje Adı", "Personel Adı", "Personel Soyadı",
                "Yakıt Tipi", "Yakıt Tarihi", "Miktar (L)", "Birim Fiyat (TL)", "Toplam Maliyet (TL)"
            ];

            // Add Header Row
            const headerRow = sheet.addRow(tableColumn);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            // Add Data Rows
            allData.forEach(row => {
                const totalCostNumber = parseCurrencyToNumber(row.total_price);
                const fuelFeeNumber = parseCurrencyToNumber(row.fuel_fee);

                sheet.addRow([
                    row.plaque,
                    row.brand,
                    row.model,
                    row.workhouse_name || '-',
                    row.workhouse_code || '-',
                    row.work_title || '-',
                    row.personnel_name || '-',
                    row.personnel_family || '-',
                    row.fuel_type,
                    format(new Date(row.fuel_date), 'dd/MM/yyyy HH:mm'),
                    row.fuel_amount,
                    fuelFeeNumber,
                    totalCostNumber,
                ]);
            });

            // Set column widths and currency formats
            sheet.columns.forEach((column, index) => {
                const header = tableColumn[index];
                column.width = header.length < 15 ? 15 : header.length * 1.2;

                if (header.includes('(TL)')) {
                    column.numFmt = '₺ #,##0.00'; // Apply currency format
                } else if (header.includes('(L)')) {
                    column.numFmt = '#,##0.00';
                } else if (header.includes('Tarihi')) {
                    column.numFmt = 'dd/mm/yyyy hh:mm';
                }
            });


            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Tum_Yakıt_Raporu_${format(new Date(), 'yyyyMMddHHmm')}.xlsx`);

            showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Toplu Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const tableHeaders = [
        { label: 'Plaka', key: 'plaque' },
        { label: 'Marka / Model', key: 'brand_model' },
        { label: 'Şantiye', key: 'workhouse_name' },
        { label: 'Yakıt Tipi', key: 'fuel_type' },
        { label: 'Miktar (Litre)', key: 'fuel_amount' },
        { label: 'Birim Fiyat', key: 'fuel_fee' },
        { label: 'Yakıt Tarihi', key: 'fuel_date' },
        { label: 'Toplam Maliyet', key: 'total_price' },
        { label: '', key: 'actions' },
    ];



    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconCar size={28} style={{ marginRight: 8 }} /> Araç Yakıt Raporları
            </Typography>

            {/* --- Alert Section --- */}
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            {/* --- Filter Section --- */}
            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>

                    {/* Work (İş) */}
                    <Grid item xs={12} sm={4} md={3}>
                        <Autocomplete
                            id="work-select"
                            options={worksList}
                            getOptionLabel={(o) => `${o.title} (${o.status})`}
                            value={worksList.find(w => w.id === filterParams.workId) || null}
                            onChange={(_, newValue) => handleFilterChange('workId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="İş" fullWidth size="small" />)}
                        />
                    </Grid>


                    {/* Workhouse (Şantiye) */}
                    <Grid item xs={12} sm={4} md={3}>
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

                    {/* From Date - Using DatePicker */}
                    <Grid item xs={12} sm={4} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Başlangıç Tarihi"
                                value={startDate}
                                onChange={(v) => setStartDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    {/* To Date - Using DatePicker */}
                    <Grid item xs={12} sm={4} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Bitiş Tarihi"
                                value={endDate}
                                onChange={(v) => setEndDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    {/* 📌 HIDDEN FIELDS - Used only for spacing, fields are removed/hidden as requested */}
                    {/* <Grid item xs={12} sm={4} md={3}> Personnel Autocomplete </Grid> */}
                    {/* <Grid item xs={12} sm={4} md={3}> Brand TextField </Grid> */}
                    {/* <Grid item xs={12} sm={4} md={3}> Model TextField </Grid> */}

                </Grid>
                {/* Search Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<IconSearch size={20} />}
                        onClick={handleSearchClick}
                        disabled={loadingData}
                    >
                        Filtreyi Uygula
                    </Button>
                </Box>
            </BlankCard>

            <Box sx={{ margin: "20px 0" }}>
                {/* 📌 NEW: Global Download Buttons */}
                <Typography variant="h6" mb={1} color="secondary">📥 Tüm Filtrelenmiş Verileri İndir</Typography>
                <Stack direction="row" spacing={2} mb={3}>
                    <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                        onClick={handleExportPdfAll} disabled={loadingData || !reportData?.data?.length}>
                        Tümünü PDF Olarak İndir
                    </Button>
                    <Button variant="contained" color="primary" startIcon={<IconFileSpreadsheet />}
                        onClick={handleExportExcelAll} disabled={loadingData || !reportData?.data?.length}>
                        Tümünü Excel Olarak İndir
                    </Button>
                </Stack>
            </Box>


            {/* --- Data Table --- */}
            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="car report table">
                        <TableHead style={{ background: "#f0f0f0" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (<StyledTableCell key={header.key}><Typography variant="h6" fontWeight="bold">{header.label}</Typography></StyledTableCell>))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : reportData?.data?.length ? (
                                reportData.data.map((row, index) => {
                                    const totalCostNumber = parseCurrencyToNumber(row.total_price);
                                    const fuelFeeNumber = parseCurrencyToNumber(row.fuel_fee);

                                    return (
                                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>{row.plaque}</StyledTableCell>
                                            <StyledTableCell>{`${row.brand} / ${row.model}`}</StyledTableCell>
                                            <StyledTableCell>{row.workhouse_name || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.fuel_type}</StyledTableCell>
                                            <StyledTableCell>{row.fuel_amount}</StyledTableCell>
                                            <StyledTableCell>{fuelFeeNumber.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}</StyledTableCell>
                                            <StyledTableCell>{format(new Date(row.fuel_date), 'dd/MM/yyyy')}</StyledTableCell>
                                            <StyledTableCell><Typography color="primary" fontWeight="bold">{totalCostNumber.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}</Typography></StyledTableCell>

                                            {/* Actions Column (Menu) */}
                                            <StyledTableCell>
                                                <Tooltip title="Detaylar ve İşlemler">
                                                    <IconButton
                                                        id={`actions-button-${index}`}
                                                        onClick={(event) => handleClickMenu(event, row)}
                                                        color="secondary"
                                                        size="small"
                                                    >
                                                        <IconDots width={20} />
                                                    </IconButton>
                                                </Tooltip>

                                                <Menu
                                                    id="actions-menu" anchorEl={anchorEl}
                                                    open={openMenu && selectedRowForMenu === row}
                                                    onClose={handleCloseMenu}
                                                >
                                                    <MenuItem onClick={() => handleOpenDetailViewModal(row)}>
                                                        <ListItemIcon><IconRuler width={18} /></ListItemIcon>
                                                        Detayları Görüntüle
                                                    </MenuItem>
                                                    <MenuItem onClick={() => handleExportPdfSingle(row)}>
                                                        <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                        PDF İndir
                                                    </MenuItem>
                                                    <MenuItem onClick={() => handleExportExcelSingle(row)}>
                                                        <ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon>
                                                        Excel İndir
                                                    </MenuItem>
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun yakıt kaydı bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <>
                    {reportData && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee' }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="h6" fontWeight="bold" color="error.main">
                                    TOPLAM RAPOR MALİYETİ:
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                    {reportData.totalPrice !== null ?
                                        Number(reportData.totalPrice).toLocaleString('en-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })
                                        : 'Hesaplanıyor...'
                                    }
                                </Typography>
                            </Stack>
                            {reportData.totalPages > 1 && (
                                <Stack direction="row" alignItems="center">
                                    <Pagination
                                        count={reportData.totalPages} page={filterParams.page} onChange={handlePageChange}
                                        color="primary" showFirstButton showLastButton size="small"
                                    />
                                    <Typography variant="body2" sx={{ ml: 2 }}>
                                        Toplam: {reportData.totalCount} kayıt
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                    )}
                </>

            </BlankCard>

            <DetailViewModal
                open={openDetailViewModal} onClose={handleCloseDetailViewModal}
                report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle}
            />

        </Box>
    );
};

export default ListCarwarehouseReport;