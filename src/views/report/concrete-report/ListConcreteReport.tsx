// import React, { useEffect, useState, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//     TableContainer, Table, TableHead, TableRow, TableBody,
//     Typography, Box,
//     TableCell as MuiTableCell,
//     Stack, Alert, CircularProgress, Button,
//     Tooltip,
//     Dialog, DialogTitle, DialogContent, DialogActions,
//     Grid, TextField, IconButton, InputAdornment, // ✨ InputAdornment eklendi
//     Pagination,
//     Menu,
//     ListItemIcon,
//     Autocomplete,
//     MenuItem,
//     TableFooter,
// } from '@mui/material';
// import { styled } from '@mui/material/styles';
// import {
//     IconSearch, IconFileDownload, IconDots,
//     IconRuler, IconClipboardList,
//     IconFileSpreadsheet
// } from '@tabler/icons-react';
// import axios from 'axios';
// import server from '../../../assets/address.json';
// import BlankCard from '../../../components/shared/BlankCard';
// import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
// import { format, startOfYear, endOfYear } from 'date-fns';
// import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import { tr } from 'date-fns/locale';

// // --- PDF & Excel Exports ---
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// // NOTE: NotoSansRegular should be correctly imported/defined in your project structure
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import Excel from 'exceljs';
// import { saveAs } from 'file-saver';

// import Logo from 'src/assets/images/logos/logo.png';


// // --- TYPE DEFINITIONS ---
// interface WorkhouseType { id: number; name: string; code: string; address: string; createAt: string; recordStatus: number; }
// // interfaces for FirmType, ProjectType, StoreType, DispatchType were kept commented out in the original code, so I keep them commented
// interface ConcreteReportRowType {
//     workhouse_id: string; workhouse_code: string; workhousen_name: string;
//     tarih: string; proje_kodu: string; bolge_adi: string; ekip_adi: string; il: string; ilce: string;
//     proje_adi: string; is_turu: string; itemcode: string; itemname: string; unit: string;
//     quantity: string; price: string; discount: string; total: string;
// }
// interface ConcreteReportResponseType {
//     totalCount: number; totalPrice: number; page: number; pageSize: number; totalPages: number; data: ConcreteReportRowType[];
// }
// interface FilterParams {
//     docNumber: string; fromDate: string; toDate: string; projectId: number | null; workhouseId: number | null;
//     maxQuantity: number | null; minQuantity: number | null; page: number; pageSize: number;
//     storeId: number | null; dispatchId: string | null;
// }


// const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
//     fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
// }));


// // --- MODAL FOR SINGLE ROW DETAILS (UNCHANGED) ---
// interface DetailViewModalProps {
//     open: boolean;
//     onClose: () => void;
//     report: ConcreteReportRowType | null;
//     onExportExcel: (report: ConcreteReportRowType) => Promise<void>;
//     onExportPdf: (report: ConcreteReportRowType) => Promise<void>;
// }

// const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
//     if (!report) return null;
//     return (
//         <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//             <DialogTitle>Beton Raporu Detayları: {report.proje_adi}</DialogTitle>
//             <DialogContent dividers>
//                 <Grid container spacing={2}>
//                     <Grid item xs={12} md={6}>
//                         <Typography variant="h6" mb={1} color="primary">Proje Bilgileri</Typography>
//                         <Stack spacing={1}>
//                             <CustomTextField label="Proje Adı" size="small" fullWidth value={report.proje_adi} disabled />
//                             <CustomTextField label="Proje Kodu" size="small" fullWidth value={report.proje_kodu} disabled />
//                             <CustomTextField label="İş Tipi" size="small" fullWidth value={report.is_turu} disabled />
//                             <CustomTextField label="Tarih" size="small" fullWidth value={format(new Date(report.tarih), 'dd/MM/yyyy')} disabled />
//                         </Stack>
//                     </Grid>
//                     <Grid item xs={12} md={6}>
//                         <Typography variant="h6" mb={1} color="success.main">Miktar ve Maliyet</Typography>
//                         <Stack spacing={1}>
//                             <CustomTextField label="Miktar" size="small" fullWidth value={report.quantity} disabled />
//                             <CustomTextField label="Birim" size="small" fullWidth value={report.unit} disabled />
//                             <CustomTextField label="Birim Fiyat" size="small" fullWidth value={report.price} disabled />
//                             <CustomTextField label="Toplam Tutar" size="small" fullWidth value={report.total} disabled />
//                         </Stack>
//                     </Grid>
//                     <Grid item xs={12}>
//                         <Typography variant="h6" mt={2} mb={1} color="info">Konum ve Şantiye</Typography>
//                         <Stack spacing={1}>
//                             <CustomTextField label="Şantiye Adı" size="small" fullWidth value={report.workhousen_name} disabled />
//                             <CustomTextField label="Bölge" size="small" fullWidth value={report.bolge_adi} disabled />
//                             <CustomTextField label="İl / İlçe" size="small" fullWidth value={`${report.il} / ${report.ilce}`} disabled />
//                         </Stack>
//                     </Grid>
//                     <Grid item xs={12} mt={3}>
//                         <Typography variant="h6" mb={1} color="secondary">📥 Raporu İndir</Typography>
//                         <Stack direction="row" spacing={2}>
//                             <Button variant="contained" color="success" startIcon={<IconFileDownload />}
//                                 onClick={() => onExportPdf(report)} fullWidth>
//                                 PDF Olarak İndir
//                             </Button>
//                             <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
//                                 onClick={() => onExportExcel(report)} fullWidth>
//                                 Excel Olarak İndir
//                             </Button>
//                         </Stack>
//                     </Grid>
//                 </Grid>
//             </DialogContent>
//             <DialogActions>
//                 <Button onClick={onClose} color="secondary">Kapat</Button>
//             </DialogActions>
//         </Dialog>
//     );
// };


// // --- MAIN COMPONENT ---
// const ListConcreteReport = () => {
//     const navigate = useNavigate();

//     // محاسبه تاریخ‌های پیش‌فرض جدید (اول و آخر سال جاری)
//     const currentYearStart = startOfYear(new Date());
//     const currentYearEnd = endOfYear(new Date());

//     // --- State Definitions ---
//     const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
//     const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);

//     // ✨ NEW: State برای جستجوی متنی
//     const [searchTerm, setSearchTerm] = useState('');

//     // REMOVED: const [searchTrigger, setSearchTrigger] = useState(0);

//     const [filterParams, setFilterParams] = useState<FilterParams>({
//         // docNumber در اینجا به عنوان فیلد جستجوی متنی استفاده خواهد شد
//         docNumber: '',
//         fromDate: format(currentYearStart, 'yyyy-MM-dd'),
//         toDate: format(currentYearEnd, 'yyyy-MM-dd'),
//         projectId: null,
//         workhouseId: null,
//         maxQuantity: null,
//         minQuantity: null,
//         page: 1,
//         pageSize: 10,
//         storeId: null,
//         dispatchId: null,
//     });

//     const [reportData, setReportData] = useState<ConcreteReportResponseType | null>(null);
//     const [loadingData, setLoadingData] = useState(false);
//     const [alertMessage, setAlertMessage] = useState<string | null>(null);
//     const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

//     // Dropdown States
//     const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);

//     // Menu/Modal States
//     const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//     const [selectedRowForMenu, setSelectedRowForMenu] = useState<ConcreteReportRowType | null>(null);
//     const openMenu = Boolean(anchorEl);

//     const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
//     const [selectedReportToDownload, setSelectedReportToDownload] = useState<ConcreteReportRowType | null>(null);


//     const formatDateDisplay = (dateString: string | null | undefined): string => {
//         if (!dateString) return '-';
//         try {
//             return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
//                 format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
//                 format(new Date(dateString), 'dd/MM/yyyy HH:mm');
//         } catch (e) {
//             return '-';
//         }
//     };


//     // --- Utility Callbacks ---
//     const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//         setAlertMessage(message); setAlertSeverity(severity);
//         setTimeout(() => setAlertMessage(null), 5000);
//     }, []);
//     const clearAlert = () => { setAlertMessage(null); };

//     const handleApiError = useCallback((e: any, defaultMessage: string = 'Bir hata oluştu.') => {
//         if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
//         else if (e.response?.status === 500) { showAlert('Sistem hatası oluştu, lütfen deneyin.', 'error'); }
//         else { console.error("API Error:", e); showAlert(e.response?.data?.message || defaultMessage, 'error'); }
//     }, [navigate, showAlert]);

//     const handleFilterChange = (name: keyof FilterParams, value: any) => {
//         // ✨ CHANGE: همیشه صفحه را به 1 برمی‌گرداند مگر اینکه فقط pagination باشد
//         setFilterParams(prev => ({ ...prev, [name]: value, page: 1 }));
//     };

//     // REMOVED: handleSearchClick

//     const cleanCurrencyValue = (value: string) => {
//         return parseFloat(value.replace(/[^0-9,.]/g, '').replace(',', '')) || 0;
//     };


//     // --- Data Fetching (Dropdowns & Hidden Filters) ---
//     const getWorkhousesList = useCallback(async () => {
//         // ... (API call remains the same)
//         const authToken = localStorage.getItem('authToken');
//         const role = localStorage.getItem('activeUserRoleName') || '';
//         if (!authToken) { navigate("/"); return; }
//         let requestParams = {};
//         if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
//         try {
//             const response = await axios.get(
//                 server.baseurl + server.initialoperations + "get-workhouse",
//                 { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
//             );
//             if (response.data.httpStatusCode === 200) {
//                 const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
//                 setWorkhousesList(activeWorkhouses);
//             } else {
//                 showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
//             }
//         } catch (e: any) { handleApiError(e, 'Şantiye listesi alınamadı.'); }
//     }, [navigate, showAlert, handleApiError]);


//     const getStoresList = useCallback(async (workhouseId: number) => {
//         // ... (API call remains the same)
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken || !workhouseId) { return; }
//         try {
//             const response = await axios.get(
//                 server.baseurl + server.initialoperations + `get-stores-by-workhouse-id/${workhouseId}`,
//                 { headers: { "Authorization": `Bearer ${authToken}` } }
//             );
//             if (response.data.httpStatusCode === 200) {
//                 // setStoresList(response.data.data.filter((s: StoreType) => s.recordStatus === 0));
//             } else { showAlert('Depo listesi alınamadı.', 'error'); }
//         } catch (e: any) { handleApiError(e, 'Depo listesi alınamadı.'); }
//     }, [showAlert, handleApiError]);

//     const getDispatchesList = useCallback(async (storeId: number) => {
//         // ... (API call remains the same)
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken || !storeId) { return; }
//         try {
//             const response = await axios.get(
//                 server.baseurl + server.warehouse + `get-store-dispatches/${Number(storeId)}`,
//                 { headers: { "Authorization": `Bearer ${authToken}` } }
//             );
//             if (response.data.httpStatusCode === 200) {
//                 // setDispatchesList(response.data.data.filter((d: DispatchType) => d.recordStatus === 0));
//             } else { showAlert('Sevk listesi alınamadı.', 'error'); }
//         } catch (e: any) { handleApiError(e, 'Sevk listesi alınamadı.'); }
//     }, [showAlert, handleApiError]);

//     const getProjectsList = useCallback(async () => {
//         // ... (API call remains the same)
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) return;
//         try {
//             const response = await axios.get(
//                 server.baseurl + server.warehouse + "get-project",
//                 { headers: { "Authorization": `Bearer ${authToken}` } }
//             );
//             if (response.data.httpStatusCode === 200) {
//                 // setProjectsList(response.data.data.filter((p: ProjectType) => p.recordStatus === 0));
//             } else { showAlert('Proje listesi alınamadı.', 'error'); }
//         } catch (e: any) { handleApiError(e, 'Proje listesi alınamadı.'); }
//     }, [showAlert, handleApiError]);


//     // --- Main Data Fetching (for Table) ---

//     const fetchConcreteReportData = useCallback(async () => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }

//         const requestParams = {
//             // ✨ CHANGE: ارسال docNumber که اکنون با searchTerm یا dispatchId به روز می‌شود
//             docNumber: filterParams.docNumber || filterParams.dispatchId || null,
//             fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
//             toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
//             projectId: Number(filterParams.projectId) || null,
//             workhouseId: Number(filterParams.workhouseId) || null,
//             maxQuantity: filterParams.maxQuantity || null,
//             minQuantity: filterParams.minQuantity || null,
//             page: filterParams.page,
//             pageSize: filterParams.pageSize,
//         };

//         setLoadingData(true);
//         try {
//             const response = await axios.get(
//                 server.baseurl + server.report + `get-beton-filtered-report-data/`,
//                 { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
//             );

//             if (response.data.httpStatusCode === 200 && response.data.data) {
//                 setReportData(response.data.data as ConcreteReportResponseType);
//             } else {
//                 setReportData(null);
//                 showAlert(response.data.message || 'Beton rapor verileri alınamadı.', 'error');
//             }
//         } catch (e: any) {
//             setReportData(null);
//             handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.');
//         } finally {
//             setLoadingData(false);
//         }
//     }, [
//         filterParams.docNumber, filterParams.dispatchId, filterParams.fromDate, filterParams.toDate,
//         filterParams.projectId, filterParams.workhouseId, filterParams.maxQuantity,
//         filterParams.minQuantity, filterParams.page, filterParams.pageSize,
//         navigate, showAlert, handleApiError
//     ]);


//     // --- Effects for Data Loading (REACTIVE) ---
//     useEffect(() => {
//         getWorkhousesList();
//         getProjectsList();
//     }, [getWorkhousesList, getProjectsList]);

//     // Effect برای به‌روزرسانی filterParams با تغییر startDate
//     useEffect(() => {
//         if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd'));
//     }, [startDate]);

//     // Effect برای به‌روزرسانی filterParams با تغییر endDate
//     useEffect(() => {
//         if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd'));
//     }, [endDate]);

//     // Effect برای به‌روزرسانی filterParams با تغییر searchTerm
//     useEffect(() => {
//         // ✨ NEW: به روز رسانی docNumber با searchTerm و ریست کردن صفحه
//         if (filterParams.docNumber !== searchTerm) {
//             setFilterParams(prev => ({ ...prev, docNumber: searchTerm, page: 1 }));
//         }
//     }, [searchTerm, filterParams.docNumber]);


//     // Effects برای فیلترهای پنهان (Workhouse/Store/Dispatch - بدون تغییر)
//     useEffect(() => {
//         if (filterParams.workhouseId) {
//             getStoresList(filterParams.workhouseId);
//         } else {
//             handleFilterChange('storeId', null);
//             handleFilterChange('dispatchId', null);
//         }
//     }, [filterParams.workhouseId, getStoresList]);

//     useEffect(() => {
//         if (filterParams.storeId) {
//             getDispatchesList(filterParams.storeId);
//         } else {
//             handleFilterChange('dispatchId', null);
//         }
//     }, [filterParams.storeId, getDispatchesList]);

//     // ✨ CHANGED: useEffect اصلی برای واکشی داده‌ها با تغییر هر پارامتر فیلتر یا صفحه
//     // این useEffect به تمام تغییرات filterParams واکنش نشان می‌دهد.
//     useEffect(() => {
//         // فراخوانی fetchConcreteReportData با هر تغییر در فیلترها یا صفحه
//         fetchConcreteReportData();
//     }, [
//         filterParams.docNumber, // شامل SearchTerm
//         filterParams.fromDate,
//         filterParams.toDate,
//         filterParams.projectId,
//         filterParams.workhouseId,
//         filterParams.maxQuantity,
//         filterParams.minQuantity,
//         filterParams.page // برای pagination
//     ]);


//     // --- Handlers for Pagination, Menu, Modal (Unchanged) ---
//     const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
//         setFilterParams(prev => ({ ...prev, page: value }));
//     };

//     const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ConcreteReportRowType) => {
//         setAnchorEl(event.currentTarget);
//         setSelectedRowForMenu(row);
//     };
//     const handleCloseMenu = () => {
//         setAnchorEl(null);
//         setSelectedRowForMenu(null);
//     };

//     const handleOpenDetailViewModal = (report: ConcreteReportRowType) => {
//         setSelectedReportToDownload(report);
//         setOpenDetailViewModal(true);
//         handleCloseMenu();
//     };
//     const handleCloseDetailViewModal = () => {
//         setOpenDetailViewModal(false);
//         setSelectedReportToDownload(null);
//     };


//     // PDF Header/Footer (Unchanged)
//     const addPdfHeader = (doc: jsPDF, title: string) => {
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const docAny = doc as any;

//         docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
//         doc.setFont('NotoSans', 'normal');
//         doc.setFontSize(14);
//         doc.text(title, pageWidth / 2, 35, { align: 'center' });

//         doc.setFontSize(10);
//         doc.setFont('NotoSans', 'normal');
//         doc.text(`Rapor Tarihi:`, 15, 50);
//         doc.setFont('NotoSans', 'normal');
//         doc.text(`${formatDateDisplay(new Date().toISOString())}`, 85, 50);
//     };
//     const addPdfFooter = (doc: jsPDF) => {
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();
//         doc.setFontSize(8);
//         doc.setFont('NotoSans', 'normal');
//         const companyInfo = [
//             'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
//             'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
//             'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
//         ];
//         let footerY = pageHeight - 30;
//         companyInfo.forEach(line => {
//             doc.text(line, pageWidth / 2, footerY, { align: 'center' });
//             footerY += 10;
//         });
//         doc.setFontSize(10);
//         doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//         doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//         const docAny = doc as any;
//         const pageCount = docAny.internal.getNumberOfPages();
//         doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//     };


//     // Export Single Row to PDF/Excel (Unchanged)
//     const handleExportPdfSingle = async (report: ConcreteReportRowType) => {
//         // ... (implementation remains the same)
//         showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

//         try {
//             const doc = new jsPDF('portrait', 'pt', 'a4');
//             (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
//             (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
//             doc.setFont("NotoSans", "normal");


//             addPdfHeader(doc, `Beton Raporu Detayı: ${report.itemname}`);

//             const tableColumn = ["Alan (Field)", "Değer (Value)"];
//             const tableRows = [
//                 ["Proje Adı", report.proje_adi],
//                 ["Proje Kodu", report.proje_kodu],
//                 ["Şantiye Adı", report.workhousen_name],
//                 ["Şantiye Kodu", report.workhouse_code],
//                 ["Tarih", format(new Date(report.tarih), 'dd/MM/yyyy')],
//                 ["Bölge Adı", report.bolge_adi],
//                 ["İl / İlçe", `${report.il} / ${report.ilce}`],
//                 ["Ekip Adı", report.ekip_adi],
//                 ["İş Tipi", report.is_turu],
//                 ["Malzeme Kodu", report.itemcode],
//                 ["Malzeme Adı", report.itemname],
//                 ["Birim", report.unit],
//                 ["Miktar (Quantity)", report.quantity],
//                 ["Birim Fiyat (Price)", report.price],
//                 ["Toplam Tutar (Total)", report.total],
//             ];
//             doc.setFontSize(14);
//             doc.text(`Beton Raporu Detayı: ${report.proje_adi}`, 40, 40);

//             autoTable(doc, {
//                 startY: 60,
//                 head: [tableColumn],
//                 body: tableRows,
//                 theme: 'grid',
//                 styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 9, cellPadding: 6, },
//                 headStyles: { fillColor: [60, 141, 188], textColor: 255 },
//                 didDrawPage: (_data) => {
//                     addPdfFooter(doc);
//                 }
//             });

//             doc.save(`Beton_Detay_${report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.pdf`);
//             showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

//         } catch (e: any) {
//             handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.');
//         }
//     };
//     const handleExportExcelSingle = async (report: ConcreteReportRowType) => {
//         // ... (implementation remains the same)
//         showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

//         try {
//             const workbook = new Excel.Workbook();
//             const sheet = workbook.addWorksheet('Beton Detay', { views: [{ rightToLeft: false }] });

//             const data = [
//                 ['Proje Adı', report.proje_adi],
//                 ['Proje Kodu', report.proje_kodu],
//                 ['Şantiye Adı', report.workhousen_name],
//                 ['Şantiye Kodu', report.workhouse_code],
//                 ['Tarih', format(new Date(report.tarih), 'dd/MM/yyyy')],
//                 ['Bölge Adı', report.bolge_adi],
//                 ['İl', report.il],
//                 ['İlçe', report.ilce],
//                 ['Ekip Adı', report.ekip_adi],
//                 ['İş Tipi', report.is_turu],
//                 ['Malzeme Kodu', report.itemcode],
//                 ['Malzeme Adı', report.itemname],
//                 ['Birim', report.unit],
//                 ['Miktar (Quantity)', cleanCurrencyValue(report.quantity)],
//                 ['Birim Fiyat (Price)', cleanCurrencyValue(report.price)],
//                 ['Toplam Tutar (Total)', cleanCurrencyValue(report.total)],
//             ];

//             const titleRow = sheet.addRow(['Beton Raporu Detayı']);
//             titleRow.font = { name: 'Calibri', size: 14, bold: true };
//             sheet.mergeCells('A1:B1');
//             sheet.addRow([]);

//             const headerRow = sheet.addRow(['Alan (Field)', 'Değer (Value)']);
//             headerRow.eachCell((cell) => {
//                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
//                 cell.font = { bold: true };
//                 cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
//             });

//             data.forEach(row => {
//                 const newRow = sheet.addRow(row);
//                 newRow.eachCell((cell) => {
//                     cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
//                 });
//                 if (row[0] === 'Miktar (Quantity)') { newRow.getCell(2).numFmt = '#,##0.00'; }
//                 if (row[0] === 'Birim Fiyat (Price)') { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
//                 if (row[0] === 'Toplam Tutar (Total)') { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
//             });

//             sheet.columns[0].width = 25;
//             sheet.columns[1].width = 35;

//             const buffer = await workbook.xlsx.writeBuffer();
//             saveAs(new Blob([buffer]), `Beton_Detay_${report.proje_kodu}_${format(new Date(), 'yyyyMMdd')}.xlsx`);

//             showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

//         } catch (e: any) {
//             handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.');
//         }
//     };


//     // Export All Rows to PDF/Excel (Unchanged, but uses active filter params)
//     const handleExportPdfAll = (data: ConcreteReportRowType[]) => {
//         // ... (implementation remains the same)
//         if (!data || data.length === 0) {
//             showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
//             return;
//         }

//         showAlert('Tüm verilerin PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

//         try {
//             const doc = new jsPDF('landscape', 'pt', 'a4');
//             (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
//             (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
//             doc.setFont("NotoSans", "normal");


//             addPdfHeader(doc, `Beton Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);

//             const headers = ["Şantiye Adı", "Proje Adı", "Tarih", "İş Tipi", "Miktar", "Birim", "Toplam Tutar (TL)"];

//             const totalPrice = data.reduce((sum, row) => sum + cleanCurrencyValue(row.total), 0);
//             const totalDisplay = totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });


//             const body = data.map(row => {
//                 const formattedQuantity = cleanCurrencyValue(row.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//                 const rawTotal = cleanCurrencyValue(row.total);

//                 return [
//                     row.workhousen_name,
//                     row.proje_adi,
//                     format(new Date(row.tarih), 'dd/MM/yyyy'),
//                     row.is_turu,
//                     formattedQuantity,
//                     row.unit,
//                     rawTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
//                 ];
//             });

//             autoTable(doc, {
//                 startY: 70,
//                 head: [headers],
//                 body: body,
//                 theme: 'grid',
//                 styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 8, cellPadding: 4, },
//                 headStyles: { fillColor: [60, 141, 188], textColor: 255 },
//                 foot: [
//                     ['', '', '', '', '', 'TOPLAM MALİYET:', totalDisplay],
//                 ],
//                 footStyles: {
//                     fillColor: [230, 240, 245],
//                     textColor: [192, 0, 0],
//                     fontStyle: 'normal',
//                     fontSize: 9,
//                     cellWidth: 'wrap',
//                 },
//                 columnStyles: {
//                     6: { fontStyle: 'normal', halign: 'right' }
//                 },
//                 didDrawPage: (_data) => {
//                     addPdfFooter(doc);
//                 }
//             });

//             doc.save(`Beton_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.pdf`);
//             showAlert('Tüm verilerin PDF raporu başarıyla oluşturuldu.', 'success');

//         } catch (e: any) {
//             handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.');
//         }
//     };
//     const handleExportExcelAll = async (data: ConcreteReportRowType[]) => {
//         // ... (implementation remains the same)
//         showAlert('Tüm verilerin Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

//         try {
//             const workbook = new Excel.Workbook();
//             const sheet = workbook.addWorksheet('Beton Raporu', { views: [{ rightToLeft: false }] });

//             const headers = [
//                 "Şantiye Adı", "Proje Adı", "Tarih", "İş Tipi", "Miktar",
//                 "Birim", "Birim Fiyat", "Toplam Tutar (TL)"
//             ];

//             const headerRow = sheet.addRow(headers);
//             headerRow.eachCell((cell) => {
//                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
//                 cell.font = { bold: true };
//                 cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
//             });

//             data.forEach(row => {
//                 const newRow = sheet.addRow([
//                     row.workhousen_name,
//                     row.proje_adi,
//                     format(new Date(row.tarih), 'dd/MM/yyyy'),
//                     row.is_turu,
//                     cleanCurrencyValue(row.quantity),
//                     row.unit,
//                     cleanCurrencyValue(row.price),
//                     cleanCurrencyValue(row.total)
//                 ]);

//                 newRow.getCell(5).numFmt = '#,##0.00';
//                 newRow.getCell(7).numFmt = '₺ #,##0.00';
//                 newRow.getCell(8).numFmt = '₺ #,##0.00';
//                 newRow.eachCell((cell) => {
//                     cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
//                 });
//             });

//             sheet.columns.forEach((column, index) => {
//                 const header = headers[index];
//                 if (header) {
//                     column.width = Math.max(header.length + 5, 15);
//                 }
//             });

//             const buffer = await workbook.xlsx.writeBuffer();
//             saveAs(new Blob([buffer]), `Beton_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.xlsx`);
//             showAlert('Tüm verilerin Excel raporu başarıyla oluşturuldu.', 'success');

//         } catch (e: any) {
//             handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.');
//         }
//     };


//     // Function to Fetch All Data for Export (Unchanged, uses filter params)
//     const fetchFullReportData = useCallback(async (exportType: 'pdf' | 'excel') => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { showAlert('Lütfen giriş yapین.', 'warning'); return; }

//         const requestParams = {
//             // ✨ CHANGE: استفاده از docNumber که شامل searchTerm است
//             docNumber: filterParams.docNumber || null,
//             fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
//             toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
//             projectId: Number(filterParams.projectId) || null,
//             workhouseId: Number(filterParams.workhouseId) || null,
//             maxQuantity: filterParams.maxQuantity || null,
//             minQuantity: filterParams.minQuantity || null,
//             // Omit page and pageSize to fetch all data
//         };

//         const exportMessage = `Tüm rapor verileri için ${exportType.toUpperCase()} hazırlanıyor, lütfen bekleyin...`;
//         showAlert(exportMessage, 'info');

//         try {
//             const response = await axios.get(
//                 server.baseurl + server.report + `get-beton-filtered-report-data/`,
//                 { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
//             );

//             if (response.data.httpStatusCode === 200 && response.data.data?.data) {
//                 const allData = response.data.data.data as ConcreteReportRowType[];

//                 if (exportType === 'pdf') {
//                     handleExportPdfAll(allData);
//                 } else {
//                     handleExportExcelAll(allData);
//                 }
//             } else {
//                 showAlert('İndirilecek rapor verisi bulunamadı.', 'error');
//             }
//         } catch (e: any) {
//             handleApiError(e, `Tüm raporu indirirken bir sorun oluştu.`);
//         }
//     }, [filterParams, showAlert, handleApiError]);


//     const tableHeaders = [
//         { label: 'Şantiye Adı', key: 'workhousen_name' },
//         { label: 'Proje Adı', key: 'proje_adi' },
//         { label: 'Tarih', key: 'tarih' },
//         { label: 'İş Tipi', key: 'is_turu' },
//         { label: 'Miktar', key: 'quantity' },
//         { label: 'Birim', key: 'unit' },
//         { label: 'Toplam Tutar (TL)', key: 'total' },
//         { label: 'İşlemler', key: 'actions' },
//     ];


//     return (
//         <Box>
//             <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
//                 <IconClipboardList size={28} style={{ marginRight: 8 }} /> Beton Raporları
//             </Typography>

//             {/* --- Alert Section --- */}
//             {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

//             {/* --- Filter Section (REACTIVE) --- */}
//             <BlankCard sx={{ mb: 5, p: 3 }}>
//                 <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
//                 <Grid container spacing={3} p={2}>

//                     {/* ✨ NEW: فیلد جستجوی متنی */}


//                     {/* Workhouse (Şantiye) - VISIBLE */}
//                     <Grid item xs={12} sm={6} md={3}>
//                         <Autocomplete
//                             id="workhouse-select"
//                             options={workhousesList}
//                             getOptionLabel={(o) => `${o.name} (${o.code})`}
//                             value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
//                             onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)}
//                             isOptionEqualToValue={(o, v) => o.id === v.id}
//                             renderInput={(params) => (<TextField {...params} label="Şantiye (Workhouse)" fullWidth size="small" />)}
//                         />
//                     </Grid>

//                     {/* From Date - VISIBLE */}
//                     <Grid item xs={12} sm={6} md={3}>
//                         <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                             <DatePicker
//                                 label="Başlangıç Tarihi"
//                                 value={startDate}
//                                 onChange={(v) => setStartDate(v)}
//                                 inputFormat="dd/MM/yyyy"
//                                 renderInput={(params) => (
//                                     <TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />
//                                 )}
//                             />
//                         </LocalizationProvider>
//                     </Grid>

//                     {/* To Date - VISIBLE */}
//                     <Grid item xs={12} sm={6} md={3}>
//                         <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                             <DatePicker
//                                 label="Bitiş Tarihi"
//                                 value={endDate}
//                                 onChange={(v) => setEndDate(v)}
//                                 inputFormat="dd/MM/yyyy"
//                                 renderInput={(params) => (
//                                     <TextField {...params} fullWidth size="small" InputLabelProps={{ shrink: true }} />
//                                 )}
//                             />
//                         </LocalizationProvider>
//                     </Grid>

//                     {/* Min Quantity - VISIBLE */}
//                     <Grid item xs={12} sm={6} md={3}>
//                         <CustomTextField
//                             label="Min. Miktar"
//                             size="small"
//                             type="number"
//                             fullWidth
//                             value={filterParams.minQuantity || ''}
//                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('minQuantity', Number(e.target.value) || null)}
//                         />
//                     </Grid>

//                     {/* Max Quantity - VISIBLE */}
//                     <Grid item xs={12} sm={6} md={3}>
//                         <CustomTextField
//                             label="Max. Miktar"
//                             size="small"
//                             type="number"
//                             fullWidth
//                             value={filterParams.maxQuantity || ''}
//                             onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('maxQuantity', Number(e.target.value) || null)}
//                         />
//                     </Grid>
//                 </Grid>

//                 {/* Export All Buttons (دکمه "Filtreyi Uygula" حذف شد) */}
//                 <Box sx={{ p: 2 }}>

//                     <Grid container spacing={2} alignItems="center">

//                         <Grid item xs={12} sm={7} md={7}>
//                             <TextField
//                                 label="Ara (Proje Adı/Kodu, Şantiye Adı, Malzeme Adı)"
//                                 variant="outlined"
//                                 fullWidth
//                                 value={searchTerm}
//                                 onChange={(e) => setSearchTerm(e.target.value)}
//                                 size="small"
//                                 InputProps={{
//                                     startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>)
//                                 }}
//                             />
//                         </Grid>

//                         <Grid item xs={12} sm={5} md={5} spacing={2} display={'flex'} justifyContent={'space-evenly'}>
//                             <Button
//                                 variant="outlined"
//                                 color="success"
//                                 startIcon={<IconFileSpreadsheet size={20} />}
//                                 onClick={() => fetchFullReportData('excel')}
//                                 disabled={loadingData}
//                             >
//                                 Tüm Veriyi Excel İndir
//                             </Button>


//                             <Button
//                                 variant="outlined"
//                                 color="error"
//                                 startIcon={<IconFileDownload size={20} />}
//                                 onClick={() => fetchFullReportData('pdf')}
//                                 disabled={loadingData}
//                             >
//                                 Tüm Veriyi PDF İndir
//                             </Button>

//                         </Grid>
//                     </Grid>


//                     {/* REMOVED: Düğme Filtreyi Uygula */}
//                 </Box>
//             </BlankCard>
//             <Box sx={{ margin: "20px 0" }}></Box>

//             {/* --- Data Table --- */}
//             <BlankCard>
//                 <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
//                     <Table aria-label="concrete report table">
//                         <TableHead style={{ background: "#f0f0f0" }}>
//                             <TableRow>
//                                 {tableHeaders.map((header) => (<StyledTableCell key={header.key}><Typography variant="h6" fontWeight="bold">{header.label}</Typography></StyledTableCell>))}
//                             </TableRow>
//                         </TableHead>
//                         <TableBody>
//                             {loadingData ? (
//                                 <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
//                             ) : reportData?.data?.length ? (
//                                 reportData.data.map((row, index) => (
//                                     <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
//                                         <StyledTableCell>{row.workhousen_name}</StyledTableCell>
//                                         <StyledTableCell>{row.proje_adi}</StyledTableCell>
//                                         <StyledTableCell>{format(new Date(row.tarih), 'dd/MM/yyyy')}</StyledTableCell>
//                                         <StyledTableCell>{row.is_turu}</StyledTableCell>
//                                         <StyledTableCell><Typography fontWeight="bold">{row.quantity}</Typography></StyledTableCell>
//                                         <StyledTableCell>{row.unit}</StyledTableCell>
//                                         <StyledTableCell><Typography color="primary" fontWeight="bold">{row.total}</Typography></StyledTableCell>

//                                         {/* Actions Column (Menu) */}
//                                         <StyledTableCell>
//                                             <Tooltip title="Detaylar ve İşlemler">
//                                                 <IconButton
//                                                     id={`actions-button-${index}`}
//                                                     aria-controls={openMenu ? 'actions-menu' : undefined}
//                                                     aria-haspopup="true"
//                                                     aria-expanded={openMenu && selectedRowForMenu === row ? 'true' : undefined}
//                                                     onClick={(event) => handleClickMenu(event, row)}
//                                                     color="secondary"
//                                                     size="small"
//                                                 >
//                                                     <IconDots width={20} />
//                                                 </IconButton>
//                                             </Tooltip>

//                                             <Menu
//                                                 id="actions-menu"
//                                                 anchorEl={anchorEl}
//                                                 open={openMenu && selectedRowForMenu === row}
//                                                 onClose={handleCloseMenu}
//                                             >
//                                                 <MenuItem onClick={() => handleOpenDetailViewModal(row)}>
//                                                     <ListItemIcon><IconRuler width={18} /></ListItemIcon> Detayları Görüntüle
//                                                 </MenuItem>
//                                                 <MenuItem onClick={() => handleExportPdfSingle(row)}>
//                                                     <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> PDF İndir
//                                                 </MenuItem>
//                                                 <MenuItem onClick={() => handleExportExcelSingle(row)}>
//                                                     <ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon> Excel İndir
//                                                 </MenuItem>

//                                             </Menu>
//                                         </StyledTableCell>
//                                     </TableRow>
//                                 ))
//                             ) : (
//                                 <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun beton raporu bulunamadı.</Typography></StyledTableCell></TableRow>
//                             )}
//                         </TableBody>
//                         {/* --- NEW: TABLE FOOTER FOR TOTAL PRICE --- */}
//                         {reportData && reportData.data?.length > 0 && (
//                             <TableFooter>
//                                 <TableRow>
//                                     <StyledTableCell colSpan={6} align="right" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
//                                         <Typography variant="h6" fontWeight="bold">
//                                             Genel Toplam (Toplam Tutar):
//                                         </Typography>
//                                     </StyledTableCell>
//                                     <StyledTableCell align="left" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
//                                         <Typography variant="h5" color="primary" fontWeight="bold">
//                                             {reportData.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
//                                         </Typography>
//                                     </StyledTableCell>
//                                     <StyledTableCell sx={{ borderTop: '2px solid #ddd' }}></StyledTableCell>
//                                 </TableRow>
//                             </TableFooter>
//                         )}
//                     </Table>
//                 </TableContainer>

//                 {/* Pagination */}
//                 <>
//                     {reportData && reportData.totalPages > 1 && (
//                         <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
//                             <Pagination
//                                 count={reportData.totalPages}
//                                 page={filterParams.page}
//                                 onChange={handlePageChange}
//                                 color="primary"
//                                 showFirstButton
//                                 showLastButton
//                             />
//                             <Typography variant="body2" sx={{ ml: 2 }}>
//                                 Toplam: {reportData.totalCount} kayıt
//                             </Typography>
//                         </Box>
//                     )}
//                 </>
//             </BlankCard>

//             {/* --- Modal --- */}
//             <DetailViewModal
//                 open={openDetailViewModal}
//                 onClose={handleCloseDetailViewModal}
//                 report={selectedReportToDownload}
//                 onExportExcel={handleExportExcelSingle}
//                 onExportPdf={handleExportPdfSingle}
//             />

//         </Box>
//     );
// };

// export default ListConcreteReport;

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
    Pagination,
    Menu,
    ListItemIcon,
    Autocomplete,
    MenuItem,
    TableFooter,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconRuler, IconClipboardList,
    IconFileSpreadsheet
} from '@tabler/icons-react';
import axios from 'axios';
// فرض: این مسیرها در پروژه شما تعریف شده‌اند
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
// NOTE: NotoSansRegular should be correctly imported/defined in your project structure
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import Logo from 'src/assets/images/logos/logo.png';


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
    // docNumber: حذف شده، زیرا جستجوی متنی توسط searchTerm انجام می‌شود
    fromDate: string; toDate: string; projectId: number | null; workhouseId: number | null;
    maxQuantity: number | null; minQuantity: number | null; page: number; pageSize: number;
    storeId: number | null; dispatchId: string | null;
}


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
}));


// --- MODAL FOR SINGLE ROW DETAILS (بدون تغییر) ---
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
                            <CustomTextField label="Birim Fiyat" size="small" fullWidth value={report.price} disabled />
                            <CustomTextField label="Toplam Tutar" size="small" fullWidth value={report.total} disabled />
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

    // ✨ NEW: State برای جستجوی متنی (سمت کلاینت)
    const [searchTerm, setSearchTerm] = useState('');

    const [filterParams, setFilterParams] = useState<FilterParams>({
        // docNumber حذف شد
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        projectId: null,
        workhouseId: null,
        maxQuantity: null,
        minQuantity: null,
        page: 1,
        pageSize: 10,
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
        // همیشه صفحه را به 1 برمی‌گرداند مگر اینکه فقط pagination باشد
        setFilterParams(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const cleanCurrencyValue = (value: string) => {
        return parseFloat(value.replace(/[^0-9,.]/g, '').replace(',', '')) || 0;
    };


    // --- Data Fetching (Dropdowns) ---
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

        const requestParams = {
            // ✨ CHANGE: docNumber و dispatchId حذف شدند و جستجوی متنی ارسال نمی‌شود
            fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
            toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
            projectId: Number(filterParams.projectId) || null,
            workhouseId: Number(filterParams.workhouseId) || null,
            maxQuantity: filterParams.maxQuantity || null,
            minQuantity: filterParams.minQuantity || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize,
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-beton-filtered-report-data/`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
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


    // --- Effects for Data Loading (REACTIVE) ---
    useEffect(() => {
        getWorkhousesList();
    }, [getWorkhousesList]);

    useEffect(() => {
        if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd'));
    }, [startDate]);

    useEffect(() => {
        if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd'));
    }, [endDate]);

    // ✨ حذف useEffect مربوط به اتصال searchTerm به docNumber

    // ✨ CHANGED: useEffect اصلی برای واکشی داده‌ها با تغییر هر پارامتر فیلتر یا صفحه
    // این useEffect به تمام تغییرات filterParams واکنش نشان می‌دهد. (searchTerm دیگر آن را اجرا نمی‌کند)
    useEffect(() => {
        fetchConcreteReportData();
    }, [
        filterParams.fromDate, filterParams.toDate, filterParams.projectId,
        filterParams.workhouseId, filterParams.maxQuantity, filterParams.minQuantity,
        filterParams.page // برای pagination
    ]);


    // --- Client-Side Filtering Logic (NEW) ---

    // ✨ استفاده از useMemo برای فیلتر کردن داده‌های جدول بر اساس searchTerm
    const filteredReportData = useMemo(() => {
        if (!reportData?.data) return [];
        if (!searchTerm) return reportData.data;

        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

        return reportData.data.filter(row => {
            // ستون‌هایی که می‌خواهید جستجو بر اساس آن‌ها انجام شود
            const columnsToSearch = [
                row.workhousen_name,
                row.proje_adi,
                row.proje_kodu,
                row.itemname,
                row.itemcode
            ];

            return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
        });
    }, [reportData, searchTerm]);

    // --- Handlers for Pagination, Menu, Modal (Unchanged) ---
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setFilterParams(prev => ({ ...prev, page: value }));
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


    // --- Export Functions (Unchanged, but use fetchFullReportData without search param) ---

    // PDF Header/Footer (بدون تغییر)
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const docAny = doc as any;
        docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 35, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(`Rapor Tarihi:`, 15, 50);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 85, 50);
    };
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



    // Export Single Row to PDF/Excel (Unchanged)
    const handleExportPdfSingle = async (report: ConcreteReportRowType) => {
        // ... (implementation remains the same)
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
            doc.text(`Beton Raporu Detayı: ${report.proje_adi}`, 40, 40);

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
            showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

        } catch (e: any) {
            handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.');
        }
    };
    const handleExportExcelSingle = async (report: ConcreteReportRowType) => {
        // ... (implementation remains the same)
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

            showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

        } catch (e: any) {
            handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.');
        }
    };


    // Export All Rows to PDF/Excel (Unchanged, but uses active filter params)
    const handleExportPdfAll = (data: ConcreteReportRowType[]) => {
        // ... (implementation remains the same)
        if (!data || data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }

        showAlert('Tüm verilerin PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");


            addPdfHeader(doc, `Beton Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);

            const headers = ["Şantiye Adı", "Proje Adı", "Tarih", "İş Tipi", "Miktar", "Birim", "Toplam Tutar (TL)"];

            const totalPrice = data.reduce((sum, row) => sum + cleanCurrencyValue(row.total), 0);
            const totalDisplay = totalPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });


            const body = data.map(row => {
                const formattedQuantity = cleanCurrencyValue(row.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const rawTotal = cleanCurrencyValue(row.total);

                return [
                    row.workhousen_name,
                    row.proje_adi,
                    format(new Date(row.tarih), 'dd/MM/yyyy'),
                    row.is_turu,
                    formattedQuantity,
                    row.unit,
                    rawTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
                    cellWidth: 'wrap',
                },
                columnStyles: {
                    6: { fontStyle: 'normal', halign: 'right' }
                },
                didDrawPage: (_data) => {
                    addPdfFooter(doc);
                }
            });

            doc.save(`Beton_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('Tüm verilerin PDF raporu başarıyla oluşturuldu.', 'success');

        } catch (e: any) {
            handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.');
        }
    };
    const handleExportExcelAll = async (data: ConcreteReportRowType[]) => {
        // ... (implementation remains the same)
        showAlert('Tüm verilerin Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

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
            saveAs(new Blob([buffer]), `Beton_Raporu_Tümü_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            showAlert('Tüm verilerin Excel raporu başarıyla oluşturuldu.', 'success');

        } catch (e: any) {
            handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.');
        }
    };


    // Function to Fetch All Data for Export (بدون تغییر در منطق، فقط پارامتر docNumber حذف شد)
    const fetchFullReportData = useCallback(async (exportType: 'pdf' | 'excel') => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }

        const requestParams = {
            // ✨ CHANGE: docNumber حذف شد
            fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
            toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
            projectId: Number(filterParams.projectId) || null,
            workhouseId: Number(filterParams.workhouseId) || null,
            maxQuantity: filterParams.maxQuantity || null,
            minQuantity: filterParams.minQuantity || null,
            // Omit page and pageSize to fetch all data
        };

        const exportMessage = `Tüm rapor verileri için ${exportType.toUpperCase()} hazırlanıyor, lütfen bekleyin...`;
        showAlert(exportMessage, 'info');

        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-beton-filtered-report-data/`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data?.data) {
                const allData = response.data.data.data as ConcreteReportRowType[];

                if (exportType === 'pdf') {
                    handleExportPdfAll(allData);
                } else {
                    handleExportExcelAll(allData);
                }
            } else {
                showAlert('İndirilecek rapor verisi bulunamadı.', 'error');
            }
        } catch (e: any) {
            handleApiError(e, `Tüm raporu indirirken bir sorun oluştu.`);
        }
    }, [filterParams, showAlert, handleApiError]);


    const tableHeaders = [
        { label: 'Şantiye Adı', key: 'workhousen_name' },
        { label: 'Proje Adı', key: 'proje_adi' },
        { label: 'Tarih', key: 'tarih' },
        { label: 'İş Tipi', key: 'is_turu' },
        { label: 'Miktar', key: 'quantity' },
        { label: 'Birim', key: 'unit' },
        { label: 'Toplam Tutar (TL)', key: 'total' },
        { label: 'İşlemler', key: 'actions' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconClipboardList size={28} style={{ marginRight: 8 }} /> Beton Raporları
            </Typography>

            {/* --- Alert Section --- */}
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            {/* --- Filter Section (REACTIVE) --- */}
            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>



                    {/* Workhouse (Şantiye) - VISIBLE */}
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

                    {/* From Date - VISIBLE */}
                    <Grid item xs={12} sm={6} md={3}>
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

                    {/* To Date - VISIBLE */}
                    <Grid item xs={12} sm={6} md={3}>
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

                    {/* Min Quantity - VISIBLE */}
                    <Grid item xs={12} sm={6} md={3}>
                        <CustomTextField
                            label="Min. Miktar"
                            size="small"
                            type="number"
                            fullWidth
                            value={filterParams.minQuantity || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('minQuantity', Number(e.target.value) || null)}
                        />
                    </Grid>

                    {/* Max Quantity - VISIBLE */}
                    <Grid item xs={12} sm={6} md={3}>
                        <CustomTextField
                            label="Max. Miktar"
                            size="small"
                            type="number"
                            fullWidth
                            value={filterParams.maxQuantity || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('maxQuantity', Number(e.target.value) || null)}
                        />
                    </Grid>
                </Grid>

                {/* Search Bar and Export All Buttons */}
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">

                        {/* ✨ NEW: فیلد جستجوی متنی (Client-Side) */}
                        <Grid item xs={12} sm={7} md={7}>
                            <TextField
                                label="Ara (Proje Adı/Kodu, Şantiye Adı, Malzeme Adı)"
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
                                onClick={() => fetchFullReportData('excel')}
                                disabled={loadingData}
                            >
                                Tüm Veriyi Excel İndir
                            </Button>


                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<IconFileDownload size={20} />}
                                onClick={() => fetchFullReportData('pdf')}
                                disabled={loadingData}
                            >
                                Tüm Veriyi PDF İndir
                            </Button>

                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>
            <Box sx={{ margin: "20px 0" }}></Box>

            {/* --- Data Table --- */}
            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="concrete report table">
                        <TableHead style={{ background: "#f0f0f0" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (<StyledTableCell key={header.key}><Typography variant="h6" fontWeight="bold">{header.label}</Typography></StyledTableCell>))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : filteredReportData.length ? (
                                // ✨ CHANGE: استفاده از filteredReportData
                                filteredReportData.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>{row.workhousen_name}</StyledTableCell>
                                        <StyledTableCell>{row.proje_adi}</StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.tarih), 'dd/MM/yyyy')}</StyledTableCell>
                                        <StyledTableCell>{row.is_turu}</StyledTableCell>
                                        <StyledTableCell><Typography fontWeight="bold">{row.quantity}</Typography></StyledTableCell>
                                        <StyledTableCell>{row.unit}</StyledTableCell>
                                        <StyledTableCell><Typography color="primary" fontWeight="bold">{row.total}</Typography></StyledTableCell>

                                        {/* Actions Column (Menu) */}
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
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun beton raporu bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                        {/* --- Table Footer (General Total) --- */}
                        {reportData && reportData.data?.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="right" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            Genel Toplam (Toplam Tutar):
                                        </Typography>
                                    </StyledTableCell>
                                    <StyledTableCell align="left" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h5" color="primary" fontWeight="bold">
                                            {reportData.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                        </Typography>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ borderTop: '2px solid #ddd' }}></StyledTableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </TableContainer>

                {/* Pagination (بر اساس داده‌های واکشی شده API) */}
                <>
                    {reportData && reportData.totalPages > 1 && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Pagination
                                count={reportData.totalPages}
                                page={filterParams.page}
                                onChange={handlePageChange}
                                color="primary"
                                showFirstButton
                                showLastButton
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