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
    IconUsers, IconFileSpreadsheet,
    IconRuler
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { format } from 'date-fns';

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

interface PersonnelReportRowType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    personnel_id: string;
    personnel_name: string;
    personnel_family: string;
    personnel_identity_number: string;
    personnel_position: string;
    personnel_salary: string;
    personnel_start_date: string;
}

interface PersonnelReportResponseType {
    totalCount: number;
    totalSalary: number;
    page: number;
    pageSize: number;
    totalPages: number;
    data: PersonnelReportRowType[];
}

interface FilterParams {
    fromDate: string;
    toDate: string;
    workhouseId: number | null;
    page: number;
    pageSize: number;

    // این فیلدها دیگر در UI تنظیم نمی‌شوند اما برای ارسال به API در State باقی می‌مانند
    personnelId: number | null;
    identityNumber: string;
    position: string;
}

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
}));


// --- MODAL FOR SINGLE ROW DETAILS --- (بدون تغییر عمده)
interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: PersonnelReportRowType | null;
    onExportExcel: (report: PersonnelReportRowType) => Promise<void>;
    onExportPdf: (report: PersonnelReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;

    const reportTitle = report.personnel_name ? `Personel Raporu Detayları: ${report.personnel_name}` : `Rapor Detayları`;
    const fullName = `${report.personnel_name} ${report.personnel_family}`.trim();

    const formattedSalary = isNaN(Number(report.personnel_salary.replace(/[^0-9.-]+/g, ""))) ?
        report.personnel_salary :
        Number(report.personnel_salary.replace(/[^0-9.-]+/g, "")).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });


    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="primary">Personel Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Adı Soyadı" size="small" fullWidth value={fullName} disabled />
                            {/* Kimlik No & Pozisyon پنهان شده‌اند */}
                            <CustomTextField label="Kimlik No" size="small" fullWidth value="*** Gizlenmiştir ***" disabled />
                            <CustomTextField label="Pozisyon" size="small" fullWidth value="*** Gizlenmiştir ***" disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="success.main">İşyeri ve Maaş Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Şantiye Adı" size="small" fullWidth value={report.workhouse_name} disabled />
                            <CustomTextField label="Şantiye Kodu" size="small" fullWidth value={report.workhouse_code} disabled />
                            <CustomTextField label="İşe Başlangıç" size="small" fullWidth value={format(new Date(report.personnel_start_date), 'dd/MM/yyyy')} disabled />
                            <CustomTextField label="Maaş (Aylık)" size="small" fullWidth
                                value={formattedSalary} disabled />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Raporu İndir</Typography>
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


// --- UTILITY FUNCTIONS ---

const getCurrentYearDates = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    return {
        fromDate: format(startOfYear, 'yyyy-MM-dd'),
        toDate: format(endOfYear, 'yyyy-MM-dd'),
    };
};

// --- MAIN COMPONENT ---
const ListPersonnelWorkhouseReport = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    const { fromDate: defaultFromDate, toDate: defaultToDate } = getCurrentYearDates();

    const [searchTrigger, setSearchTrigger] = useState(0);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        fromDate: defaultFromDate,
        toDate: defaultToDate,
        workhouseId: null,
        page: 1,
        pageSize: 10,

        // مقادیر این فیلدها همیشه خالی/null ارسال می‌شوند
        personnelId: null,
        identityNumber: '',
        position: '',
    });

    const [reportData, setReportData] = useState<PersonnelReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Dropdown States
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);


    // Menu/Modal States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<PersonnelReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<PersonnelReportRowType | null>(null);


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

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: PersonnelReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleOpenDetailViewModal = (report: PersonnelReportRowType) => {
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


    // --- Main Data Fetching ---

    const fetchPersonnelWorkhouseReportData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }

        // فقط workhouseId از فیلتر UI گرفته می‌شود، بقیه فیلدها مقدار null/خالی دارند.
        const requestParams = {
            workhouseId: filterParams.workhouseId || null,
            personnelId: filterParams.personnelId || null,
            identityNumber: filterParams.identityNumber || null,
            position: filterParams.position || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize,
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-workhouse-personnel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {

                const rawData = response.data.data.data.map((item: any) => {
                    // جداسازی نام و فامیلی
                    const parts = item.personnel_name.split(' ');
                    const family = parts.length > 1 ? parts.pop() || '' : '';
                    const name = parts.join(' ') || item.personnel_name;

                    return {
                        ...item,
                        personnel_name: name,
                        personnel_family: family,
                    }
                });

                setReportData({
                    ...response.data.data,
                    data: rawData
                } as PersonnelReportResponseType);

            } else {
                setReportData(null);
                showAlert(response.data.message || 'Personel rapor verileri alınamadı.', 'error');
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
        fetchPersonnelWorkhouseReportData();
    }, [getWorkhousesList]);

    useEffect(() => {
        if (searchTrigger > 0 || filterParams.page !== 1) {
            fetchPersonnelWorkhouseReportData();
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

    const handleExportPdfSingle = async (report: PersonnelReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            const reportTitle = `Personel Şantiye Akış Detay Raporu: ${report.personnel_name} ${report.personnel_family}`;
            addPdfHeader(doc, reportTitle); // فراخوانی Header

            const fullName = `${report.personnel_name} ${report.personnel_family}`.trim();

            // استخراج مبلغ حقوق به صورت عدد و فرمت دهی
            const numericSalary = Number(report.personnel_salary.replace(/[^0-9.-]+/g, ""));
            const displaySalary = isNaN(numericSalary) ?
                report.personnel_salary :
                numericSalary.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 });


            const tableColumn = ["Alan", "Değer"];
            const tableRows = [
                ["Adı Soyadı", fullName],
                ["Kimlik Numarası", 'Gizli'],
                ["Pozisyon", 'Gizli'],
                ["Şantiye (İşyeri)", report.workhouse_name],
                ["Şantiye Kodu", report.workhouse_code],
                ["İşe Başlangıç Tarihi", format(new Date(report.personnel_start_date), 'dd/MM/yyyy')],
            ];

            // ایجاد جدول جزئیات
            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول (بعد از Header)
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 6, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },

                // نمایش حقوق به عنوان یک سطر مجزا و مهم در پاورقی
                foot: [
                    ['Aylık Maaş', displaySalary],
                ],
                footStyles: {
                    fillColor: [240, 250, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'normal',
                    fontSize: 10
                },

                didDrawPage: (_data) => {
                    addPdfFooter(doc); // فراخوانی Footer در انتهای هر صفحه
                }
            });

            doc.save(`Personel_Detay_${report.personnel_identity_number}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    // 3. Export PDF (کلیه داده‌های نمایش داده شده در جدول)
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

            // فراخوانی Header
            addPdfHeader(doc, "Personel Şantiye Genel Raporu");

            const tableColumn = [
                "Şantiye Adı", "Şantiye Kodu", "Adı Soyadı", "Başlangıç Tarihi", "Maaş (TL)"
            ];

            const tableRows = reportData.data.map(row => {
                // تبدیل به عدد و فرمت دهی برای نمایش
                const displaySalary = isNaN(Number(row.personnel_salary.replace(/[^0-9.-]+/g, ""))) ? row.personnel_salary : Number(row.personnel_salary.replace(/[^0-9.-]+/g, "")).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                return [
                    row.workhouse_name,
                    row.workhouse_code,
                    `${row.personnel_name} ${row.personnel_family}`.trim(),
                    format(new Date(row.personnel_start_date), 'dd/MM/yyyy'),
                    displaySalary,
                ];
            });

            // تنظیمات جدول
            autoTable(doc, {
                startY: 70, // تنظیم ارتفاع شروع جدول (بعد از Header)
                head: [tableColumn], body: tableRows, theme: 'striped',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 5, },
                headStyles: { fillColor: [30, 100, 120], textColor: 255 },

                // 🆕 نمایش جمع کل (Totals) در Footer جدول
                foot: [
                    ['', '', '', 'TOPLAM MAAŞ', reportData.totalSalary.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 })],
                ],
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

            doc.save(`Personel_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            showAlert('Genel PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');
        } catch (e) {
            handleApiError(e, 'Genel PDF raporu oluşturulurken bir hata oluştu.');
        }
    };

    // 2. Export Excel (جزئیات تکی)
    const handleExportExcelSingle = async (report: PersonnelReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Personel Detay', { views: [{ rightToLeft: false }] });

            const fullName = `${report.personnel_name} ${report.personnel_family}`.trim();
            const numericSalary = Number(report.personnel_salary.replace(/[^0-9.-]+/g, ""));

            const data = [
                ['Adı Soyadı', fullName],
                ['Kimlik Numarası', 'Gizli'],
                ['Pozisyon', 'Gizli'],
                ['Şantiye (İşyeri)', report.workhouse_name],
                ['Şantiye Kodu', report.workhouse_code],
                ['İşe Başlangıç Tarihi', format(new Date(report.personnel_start_date), 'dd/MM/yyyy')],
                ['Aylık Maaş', isNaN(numericSalary) ? report.personnel_salary : numericSalary],
            ];

            const titleRow = sheet.addRow(['Personel Raporu Detayı']);
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
                const fieldName = row[0] as string;

                if (fieldName.includes('Maaş') && !isNaN(numericSalary)) { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
            });

            sheet.columns[0].width = 25; sheet.columns[1].width = 35;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Personel_Detay_${report.personnel_identity_number}_${format(new Date(), 'yyyyMMdd')}.xlsx`);

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
            const sheet = workbook.addWorksheet('Genel Personel Raporu', { views: [{ rightToLeft: false }] });

            const data = reportData.data.map(row => {
                const numericSalary = Number(row.personnel_salary.replace(/[^0-9.-]+/g, ""));

                return [
                    row.workhouse_name,
                    row.workhouse_code,
                    `${row.personnel_name} ${row.personnel_family}`.trim(),
                    format(new Date(row.personnel_start_date), 'dd/MM/yyyy'),
                    isNaN(numericSalary) ? row.personnel_salary : numericSalary,
                ];
            });

            const headerRowData = ["Şantiye Adı", "Şantiye Kodu", "Adı Soyadı", "İşe Başlangıç", "Maaş (TL)"];

            sheet.addRow(["Personel Şantiye Genel Raporu"]);
            sheet.mergeCells('A1:E1'); sheet.getRow(1).font = { bold: true, size: 14 };
            sheet.addRow(["Toplam Kayıt:", reportData.totalCount, "Toplam Maaş:", reportData.totalSalary.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })]);
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
                // فرمت دهی ستون پنجم (Maaş)
                newRow.getCell(5).numFmt = '₺ #,##0.00';
            });

            sheet.columns.forEach((column, index) => {
                const minWidth = index === 2 ? 30 : 15;
                column.width = minWidth;
            });


            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Personel_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

            showAlert('Genel Excel raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Genel Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const tableHeaders = [
        { label: 'Şantiye Adı', key: 'workhouse_name' },
        { label: 'Şantiye Kodu', key: 'workhouse_code' },
        { label: 'Adı Soyadı', key: 'personnel_name' },
        { label: 'Maaş (TL)', key: 'personnel_salary' },
        { label: 'İşe Başlangıç', key: 'personnel_start_date' },
        { label: 'İşlemler', key: 'actions' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconUsers size={28} style={{ marginRight: 8 }} /> Personel Şantiye Raporları
            </Typography>

            {/* --- Alert Section --- */}
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            {/* --- Filter Section (فقط Şantiye نمایش داده می‌شود) --- */}
            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2} alignItems="flex-end">

                    {/* Workhouse (Şantiye) - تنها کامبوی مورد نیاز */}
                    <Grid item xs={12} sm={6} md={4}>
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



                </Grid>
                {/* Search Button & General Export Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, mt: 2 }}>

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
                    <Table aria-label="personnel report table">
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
                                        <StyledTableCell>{row.workhouse_code}</StyledTableCell>
                                        <StyledTableCell>{`${row.personnel_name} ${row.personnel_family}`.trim()}</StyledTableCell>

                                        {/* Maaş */}
                                        <StyledTableCell>
                                            <Typography color="primary" fontWeight="bold">
                                                {isNaN(Number(row.personnel_salary.replace(/[^0-9.-]+/g, ""))) ?
                                                    row.personnel_salary :
                                                    Number(row.personnel_salary.replace(/[^0-9.-]+/g, "")).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.personnel_start_date), 'dd/MM/yyyy')}</StyledTableCell>

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
                                                    Detayları Görüntüle (Gizli Bilgiler)
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportPdfSingle(row)}>
                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                    PDF İndir (Detay)
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportExcelSingle(row)}>
                                                    <ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon>
                                                    Excel İndir (Detay)
                                                </MenuItem>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun personel raporu bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination and Summary */}
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
                    {reportData && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Typography variant="h6" color="success.main">
                                Toplam Maaş: {reportData.totalSalary.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
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

export default ListPersonnelWorkhouseReport;