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
    MenuItem,
    IconButton,
    RadioGroup, FormControlLabel, Radio, FormControl, FormLabel,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconSchool, IconFileSpreadsheet,
    IconRuler
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { format } from 'date-fns';
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

// ساختار داده‌ای گزارش دوره (بر اساس آخرین JSON نمونه)
interface CoursePersonnelReportRowType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    course_title: string;
    course_hours: number;
    course_isg: boolean;
    course_start_date_time: string;
    course_end_date_time: string;
    teacher_id: string;
    teacher_name: string;
    teacher_field: string;
    class_start_date_time: string;
    class_end_date_time: string;
    personnel_id: string;
    personnel_name: string;
    personnel_isg: boolean;
}

interface CoursePersonnelReportResponseType {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    data: CoursePersonnelReportRowType[];
}

type CenterFilterValue = 'null' | 'true' | 'false';

interface FilterParams {
    workhouseId: number | null;
    fromDate: string;
    toDate: string;
    page: number;
    pageSize: number;

    isCenter: CenterFilterValue;

    // فیلدهای پنهان شده
    teacherId: number | null;
    personnelId: number | null;
}

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
}));


// --- UTILITY FUNCTIONS ---

const getCurrentYearDates = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    return {
        fromDate: format(startOfYear, 'yyyy-MM-dd'),
        toDate: format(endOfYear, 'yyyy-MM-dd'),
        startObj: startOfYear,
        endObj: endOfYear,
    };
};

// --- MODAL FOR SINGLE ROW DETAILS --- (از اینجا به بعد با توابع کامل)

interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: CoursePersonnelReportRowType | null;
    onExportExcel: (report: CoursePersonnelReportRowType) => Promise<void>;
    onExportPdf: (report: CoursePersonnelReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;

    const reportTitle = `Kurs Detayları: ${report.course_title}`;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>

                    {/* Course Info */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="primary">Kurs Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Kurs Adı" size="small" fullWidth value={report.course_title} disabled />
                            <CustomTextField label="Eğitim Saati" size="small" fullWidth value={`${report.course_hours} Saat`} disabled />
                            <CustomTextField label="İSG Eğitimi" size="small" fullWidth value={report.course_isg ? 'Evet' : 'Hayır'} disabled />
                            <CustomTextField label="Eğitmen" size="small" fullWidth value={`${report.teacher_name} (${report.teacher_field})`} disabled />
                        </Stack>
                    </Grid>

                    {/* Personnel & Dates */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="success.main">Personel, Şantiye ve Tarihler</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Personel Adı" size="small" fullWidth value={report.personnel_name} disabled />
                            <CustomTextField label="Şantiye Adı" size="small" fullWidth value={`${report.workhouse_name} (${report.workhouse_code})`} disabled />

                            <Tooltip title="Sadece kursun genel başlangıç tarihi">
                                <CustomTextField label="Kurs Başlangıç" size="small" fullWidth value={format(new Date(report.course_start_date_time), 'dd/MM/yyyy HH:mm')} disabled />
                            </Tooltip>

                            <Tooltip title="Personelin katıldığı dersin başlangıç tarihi">
                                <CustomTextField label="Ders Başlangıç" size="small" fullWidth value={format(new Date(report.class_start_date_time), 'dd/MM/yyyy HH:mm')} disabled />
                            </Tooltip>

                        </Stack>
                    </Grid>

                    {/* Export Section */}
                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Bu Kayıt İçin Raporu İndir</Typography>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                                onClick={() => onExportPdf(report)} fullWidth>
                                PDF Olarak İndir (Detay)
                            </Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                                onClick={() => onExportExcel(report)} fullWidth>
                                Excel Olarak İndir (Detay)
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
const ListPersonalCourse = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // --- State Definitions ---
    const { fromDate: defaultFromDateStr, toDate: defaultToDateStr, startObj: initialStartDate, endObj: initialEndDate } = getCurrentYearDates();

    const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
    const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
    const [searchTrigger, setSearchTrigger] = useState(0);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        workhouseId: null,
        fromDate: defaultFromDateStr,
        toDate: defaultToDateStr,
        page: 1,
        pageSize: 10,
        isCenter: 'null', // پیش‌فرض: Tümü
        teacherId: null,
        personnelId: null,
    });

    const [reportData, setReportData] = useState<CoursePersonnelReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Dropdown States (فقط Workhouse استفاده می‌شود)
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);


    // Menu/Modal States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CoursePersonnelReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<CoursePersonnelReportRowType | null>(null);


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

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CoursePersonnelReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleOpenDetailViewModal = (report: CoursePersonnelReportRowType) => {
        setSelectedReportToDownload(report);
        setOpenDetailViewModal(true);
        handleCloseMenu();
    };
    const handleCloseDetailViewModal = () => {
        setOpenDetailViewModal(false);
        setSelectedReportToDownload(null);
    };

    // --- Data Fetching (Workhouses Dropdown) ---
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
    }, [navigate, authToken, showAlert, handleApiError]);


    // --- Main Data Fetching (Course Personnel Report) ---
    const fetchCoursePersonnelReportData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }

        let isCenterAPIValue: boolean | null;
        if (filterParams.isCenter === 'true') {
            isCenterAPIValue = true;
        } else if (filterParams.isCenter === 'false') {
            isCenterAPIValue = false;
        } else {
            isCenterAPIValue = null;
        }

        const requestParams = {
            workhouseId: filterParams.workhouseId || null,
            fromDate: filterParams.fromDate || null,
            toDate: filterParams.toDate || null,
            isCenter: isCenterAPIValue,
            page: filterParams.page,
            pageSize: filterParams.pageSize,

            // فیلدهای پنهان شده (با مقادیر ثابت null)
            teacherId: filterParams.teacherId || null,
            personnelId: filterParams.personnelId || null,
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-course-personnel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                setReportData(response.data.data as CoursePersonnelReportResponseType);
            } else {
                setReportData(null);
                showAlert(response.data.message || 'Kurs/Eğitim rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) {
            setReportData(null);
            handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.');
        } finally {
            setLoadingData(false);
        }
    }, [filterParams, navigate, authToken, showAlert, handleApiError]);


    // --- Effects for Data Loading & Date Sync ---

    useEffect(() => {
        getWorkhousesList();
        fetchCoursePersonnelReportData();
    }, [getWorkhousesList]);

    useEffect(() => {
        if (startDate) {
            setFilterParams(prev => ({ ...prev, fromDate: format(startDate, 'yyyy-MM-dd'), page: 1 }));
        }
    }, [startDate]);

    useEffect(() => {
        if (endDate) {
            setFilterParams(prev => ({ ...prev, toDate: format(endDate, 'yyyy-MM-dd'), page: 1 }));
        }
    }, [endDate]);

    useEffect(() => {
        if (searchTrigger > 0 || filterParams.page !== 1) {
            fetchCoursePersonnelReportData();
        }
    }, [searchTrigger, filterParams.page]);


    // --- Handlers for Pagination & Export ---
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


    const handleExportPdfSingle = async (report: CoursePersonnelReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            const reportTitle = `Kurs Detay Raporu: ${report.course_title} - ${report.personnel_name}`;
            addPdfHeader(doc, reportTitle);

            const tableColumn = ["Alan", "Değer"];
            const tableRows = [
                ["Personel Adı", report.personnel_name],
                ["Şantiye/İşyeri", report.workhouse_name],
                ["Şantiye Kodu", report.workhouse_code],
                ["Kurs Adı", report.course_title],
                ["Eğitmen", report.teacher_name],
                ["رشته مدرس", report.teacher_field],
                ["Eğitim Saati", `${report.course_hours} Saat`],
                ["İSG Eğitimi", report.course_isg ? 'Evet' : 'Hayır'],
                ["Ders Başlangıç", format(new Date(report.class_start_date_time), 'dd/MM/yyyy HH:mm')],
                ["Ders Bitiş", format(new Date(report.class_end_date_time), 'dd/MM/yyyy HH:mm')],
            ];

            // doc.setFontSize(14); doc.text(`Kurs Detay Raporu: ${report.course_title} - ${report.personnel_name}`, 40, 40); // حذف شد به دلیل استفاده از Header

            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 6, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                didDrawPage: (_data) => {
                    addPdfFooter(doc); // فراخوانی Footer در انتهای هر صفحه
                }
            });

            doc.save(`Kurs_Detay_${report.personnel_id}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };


    // 3. Export PDF (کلیه داده‌های نمایش داده شده در جدول) - پیاده‌سازی کامل با Header/Footer و Totals
    const handleExportPdfAll = () => {
        if (!reportData || reportData.data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }

        showAlert('Genel PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, "Personel Kurs Genel Raporu"); // فراخوانی Header

            const tableColumn = [
                "Şantiye Adı", "Kurs Adı", "Eğitmen", "Eğitim Saati", "Ders Başlangıç", "Personel Adı"
            ];

            const tableRows = reportData.data.map(row => [
                row.workhouse_name,
                row.course_title,
                row.teacher_name,
                `${row.course_hours} saat`,
                format(new Date(row.class_start_date_time), 'dd/MM/yyyy HH:mm'),
                row.personnel_name,
            ]);

            // doc.setFontSize(16); doc.text("Personel Kurs Genel Raporu", 40, 40); // حذف شد
            // doc.setFontSize(10); doc.text(`Toplam Kayıt: ${reportData.totalCount}`, 40, 55); // حذف شد

            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول
                head: [tableColumn], body: tableRows, theme: 'striped',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 5, },
                headStyles: { fillColor: [30, 100, 120], textColor: 255 },

                footStyles: {
                    fillColor: [230, 240, 245],
                    textColor: [0, 0, 0],
                    fontStyle: 'normal',
                    fontSize: 9
                },

                didDrawPage: (_data) => {
                    addPdfFooter(doc); // فراخوانی Footer در انتهای هر صفحه
                }
            });

            doc.save(`Kurs_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            showAlert('Genel PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');
        } catch (e) {
            handleApiError(e, 'Genel PDF raporu oluşturulurken bir hata oluştu.');
        }
    };
    // 2. Export Excel (جزئیات تکی) - پیاده‌سازی کامل
    const handleExportExcelSingle = async (report: CoursePersonnelReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Kurs Detay', { views: [{ rightToLeft: false }] });

            const data = [
                ['Personel Adı', report.personnel_name],
                ['Şantiye/İşyeri', report.workhouse_name],
                ['Şantiye Kodu', report.workhouse_code],
                ['Kurs Adı', report.course_title],
                ['Eğitmen', report.teacher_name],
                ['رشته مدرس', report.teacher_field],
                ['Eğitim Saati', report.course_hours],
                ['İSG Eğitimi', report.course_isg ? 'Evet' : 'Hayır'],
                ['Ders Başlangıç', format(new Date(report.class_start_date_time), 'dd/MM/yyyy HH:mm')],
                ['Ders Bitiş', format(new Date(report.class_end_date_time), 'dd/MM/yyyy HH:mm')],
            ];

            const titleRow = sheet.addRow([`Personel Kurs Raporu Detayı: ${report.course_title}`]);
            titleRow.font = { name: 'Calibri', size: 14, bold: true };
            sheet.mergeCells('A1:B1'); sheet.addRow([]);

            const headerRow = sheet.addRow(['Alan', 'Değer']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            sheet.columns[0].width = 25; sheet.columns[1].width = 35;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Kurs_Detay_${report.personnel_id}_${format(new Date(), 'yyyyMMdd')}.xlsx`);

            showAlert('Excel raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };

    // 4. Export Excel (کلیه داده‌های نمایش داده شده در جدول)
    const handleExportExcelAll = async () => {
        if (!reportData || reportData.data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }

        showAlert('Genel Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Kurs Personel Genel Raporu', { views: [{ rightToLeft: false }] });

            const data = reportData.data.map(row => {
                return [
                    row.workhouse_name,
                    row.course_title,
                    row.teacher_name,
                    row.course_hours,
                    format(new Date(row.class_start_date_time), 'dd/MM/yyyy HH:mm'),
                    row.personnel_name,
                ];
            });

            const headerRowData = ["Şantiye Adı", "Kurs Adı", "Eğitmen", "Eğitim Saati", "Ders Başlangıç", "Personel Adı"];

            sheet.addRow(["Personel Kurs Genel Raporu"]);
            sheet.mergeCells('A1:F1'); sheet.getRow(1).font = { bold: true, size: 14 };
            sheet.addRow(["Toplam Kayıt:", reportData.totalCount]);
            sheet.addRow([]);

            const headerRow = sheet.addRow(headerRowData);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0E6F0' } };
                cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            sheet.columns.forEach((column, index) => {
                const minWidth = (index === 1 || index === 5) ? 30 : 18;
                column.width = minWidth;
            });


            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Kurs_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

            showAlert('Genel Excel raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Genel Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const tableHeaders = [
        { label: 'Şantiye Adı', key: 'workhouse_name' },
        { label: 'Kurs Adı', key: 'course_title' },
        { label: 'Eğitmen', key: 'teacher_name' },
        { label: 'Eğitim Saati', key: 'course_hours' },
        { label: 'Ders Başlangıç', key: 'class_start_date_time' },
        { label: 'Personel Adı', key: 'personnel_name' },
        { label: 'İşlemler', key: 'actions' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconSchool size={28} style={{ marginRight: 8 }} /> Personel Kurs Raporları
            </Typography>

            {/* --- Alert Section --- */}
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            {/* --- Filter Section --- */}
            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>

                    {/* Workhouse (Şantiye) */}
                    <Grid item xs={12} sm={6} md={6}>
                        <Autocomplete
                            id="workhouse-select"
                            options={workhousesList}
                            getOptionLabel={(o) => `${o.name} (${o.code})`}
                            value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
                            onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="Şantiye Seçiniz" fullWidth size="small" />)}
                        />
                    </Grid>

                    {/* Center Filter (Radio Buttons) */}
                    <Grid item xs={12} sm={6} md={6}>
                        <FormControl component="fieldset" fullWidth>
                            <FormLabel component="legend" sx={{ fontSize: '0.875rem' }}>Merkez Durumu</FormLabel>
                            <RadioGroup
                                row
                                name="isCenter-radio-group"
                                value={filterParams.isCenter}
                                onChange={(event) => handleFilterChange('isCenter', event.target.value as CenterFilterValue)}
                            >
                                <FormControlLabel value="null" control={<Radio size="small" />} label="Tümü" />
                                <FormControlLabel value="true" control={<Radio size="small" />} label="Sadece Merkez" />
                                <FormControlLabel value="false" control={<Radio size="small" />} label="Merkezsiz" />
                            </RadioGroup>
                        </FormControl>
                    </Grid>

                    {/* From Date - DatePicker */}
                    <Grid item xs={12} sm={6} md={6}>
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

                    {/* To Date - DatePicker */}
                    <Grid item xs={12} sm={6} md={6}>
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
                </Grid>

                {/* Search Button & Export Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, mt: 2 }}>
                    <Stack direction="row" spacing={2}>
                        {/* دانلود کلی */}
                        <Button variant="outlined" color="success" startIcon={<IconFileDownload />}
                            onClick={handleExportPdfAll} disabled={loadingData || !reportData?.data?.length}>
                            Genel PDF İndir
                        </Button>
                        <Button variant="outlined" color="primary" startIcon={<IconFileSpreadsheet />}
                            onClick={handleExportExcelAll} disabled={loadingData || !reportData?.data?.length}>
                            Genel Excel İndir
                        </Button>
                    </Stack>
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
            <Box sx={{ margin: "20px 0" }}></Box>

            {/* --- Data Table --- */}
            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="course personnel report table">
                        <TableHead style={{ background: "#f0f0f0" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (<StyledTableCell key={header.key}><Typography variant="h6" fontWeight="bold">{header.label}</Typography></StyledTableCell>))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : reportData?.data?.length ? (
                                reportData.data.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>{row.workhouse_name}</StyledTableCell>
                                        <StyledTableCell>{row.course_title}</StyledTableCell>
                                        <StyledTableCell>{row.teacher_name}</StyledTableCell>
                                        <StyledTableCell>{`${row.course_hours} saat`}</StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.class_start_date_time), 'dd/MM/yyyy HH:mm')}</StyledTableCell>
                                        <StyledTableCell>{row.personnel_name}</StyledTableCell>

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
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun personel/kurs raporu bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <>
                    {reportData && reportData.totalPages > 1 && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Pagination
                                count={reportData.totalPages} page={filterParams.page} onChange={handlePageChange}
                                color="primary" showFirstButton showLastButton
                            />
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
                report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle}
            />

        </Box>
    );
};

export default ListPersonalCourse;