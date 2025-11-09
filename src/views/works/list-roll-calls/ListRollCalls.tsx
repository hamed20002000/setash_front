// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//     TableContainer, Table, TableHead, TableRow, TableBody,
//     TableCell as MuiTableCell,
//     MenuItem as MuiMenuItem,
//     Typography, Menu, IconButton, ListItemIcon, Box,
//     Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
//     CircularProgress, Paper, Autocomplete, Dialog, DialogTitle,
//     DialogContent, DialogActions, FormControl,
//     ToggleButton as MuiToggleButton, ToggleButtonGroup,
//     TableSortLabel
// } from '@mui/material';
// import { keyframes, styled } from '@mui/material/styles';
// import {
//     IconDots, IconEdit, IconTrash, IconSearch, IconPlus,
//     IconX, IconFileDownload
// } from '@tabler/icons-react';

// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { DatePicker, TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
// import { format } from 'date-fns';
// import { tr } from 'date-fns/locale';
// import axios from 'axios';
// import server from '../../../assets/address.json';
// import { useAuth } from 'src/context/AuthContext';
// import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
// import DeleteRollCalls from './DeleteRollCalls'; // ⚠️ فرض بر وجود این کامپوننت در همین مسیر است

// // ابزارهای گزارش‌گیری
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import Excel from 'exceljs';
// import { saveAs } from 'file-saver';
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular'; // ⚠️ فرض بر وجود فایل فونت
// import Logo from 'src/assets/images/logos/logo.png'; // ⚠️ فرض بر وجود لوگو
// import BlankCard from "src/components/shared/BlankCard";
// import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";

// // =========================================================================
// // ۱. Typeها و Styled Components
// // =========================================================================

// const formatDateDisplay = (dateString: string | null): string => {
//     if (!dateString) return "-";
//     try {
//         return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
//     } catch (e) {
//         return "Geçersiz Tarih";
//     }
// };

// const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
//     '&.Mui-selected': {
//         color: 'white',
//         // 'Tümü' (All) -> Primary Color
//         ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
//         // 'Aktif' (Active) -> Success Color (Yeşil)
//         ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
//         // 'Pasif' (Inactive) -> Error Color (Kırmızı)
//         ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
//     },
//     '&:not(.Mui-selected)': {
//         color: theme.palette.text.primary,
//         borderColor: theme.palette.divider,
//         '&:hover': { backgroundColor: theme.palette.action.hover },
//     },
// }));

// const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
//     fontFamily: 'NotoSans',
//     fontSize: '0.8rem',
//     [theme.breakpoints.up('md')]: {
//         fontSize: '1rem',
//     },
// }));

// const blinkAnimation = keyframes`
//    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
//    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
//    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
// `;
// const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
//     animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
//     transition: 'transform 0.3s ease-in-out',
// }));


// interface PersonnelWorkPlace {
//     id: number;
//     personnel: { id: number; name: string; family: string };
//     position: { id: number; title: string } | null;
//     placeId: number;
//     type: 0 | 1 | 2 | 3; // 1 = WORKHOUSE
//     placeKind: string;
//     placeName: string;
//     personnelName: string;
// }

// interface RollCallType {
//     id: number;
//     date: string;
//     startTime: string | null;
//     endTime: string | null;
//     createAt: string;
//     recordStatus: number;
//     personnelWorkPlace: {
//         id: number;
//         placeId: string;
//         type: string;
//         personnel: { id: string; name: string; family: string; };
//         position: { id: string; title: string; };
//         workhouse?: { name: string }; // فرض می‌کنیم نام ورک‌هاوس در این فیلد می‌آید
//     };
//     personnelName: string;
//     placeName: string;
//     positionTitle: string;
//     status: 'Aktif' | 'Pasif';
// }

// type SortableRollCallKeys = 'date' | 'startTime' | 'endTime' | 'createAt' | 'personnelName' | 'placeName';

// interface ValidationErrors {
//     date: boolean;
//     personnel: boolean;
//     endTime: boolean;
// }

// // =========================================================================
// // ۲. توابع کمکی برای مرتب‌سازی
// // =========================================================================

// const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
//     const valA = a[orderBy];
//     const valB = b[orderBy];
//     if (valB === undefined || valB === null) {
//         return (valA === undefined || valA === null) ? 0 : -1;
//     }
//     if (valA === undefined || valA === null) {
//         return 1;
//     }
//     if (typeof valB === 'string' && typeof valA === 'string') {
//         return valB.localeCompare(valA);
//     }
//     if (String(valB) < String(valA)) {
//         return -1;
//     }
//     if (String(valB) > String(valA)) {
//         return 1;
//     }
//     return 0;
// };

// const getComparator = (order: 'asc' | 'desc', orderBy: SortableRollCallKeys): (a: RollCallType, b: RollCallType) => number => {
//     return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
// };

// const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
//     const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
//     stabilizedThis.sort((a, b) => {
//         const order = comparator(a[0], b[0]);
//         if (order !== 0) return order;
//         return a[1] - b[1];
//     });
//     return stabilizedThis.map((el) => el[0]);
// };


// // =========================================================================
// // ۳. توابع گزارش‌گیری (Header/Footer/PDF/Excel)
// // =========================================================================

// const addPdfHeader = (doc: any, title: string) => {
//     const pageWidth = doc.internal.pageSize.getWidth();
//     doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 40, 25); // اگر لوگو دارید

//     doc.setFont('NotoSans', 'normal');
//     doc.setFontSize(14);
//     doc.text(title, pageWidth / 2, 15, { align: 'center' });

//     doc.setFontSize(10);
//     doc.text(`Rapor Tarihi:`, 15, 25);
//     doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 25);
// };

// const addPdfFooter = (doc: any) => {
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const pageHeight = doc.internal.pageSize.getHeight();
//     doc.setFontSize(8);
//     doc.setFont('NotoSans', 'normal');
//     const companyInfo = [
//         'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
//         'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
//         'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
//     ];
//     let footerY = pageHeight - 30;
//     companyInfo.forEach(line => {
//         doc.text(line, pageWidth / 2, footerY, { align: 'center' });
//         footerY += 4;
//     });
//     doc.setFontSize(10);
//     const docAny = doc as any;
//     const pageCount = docAny.internal.getNumberOfPages();
//     doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//     docAny.setFont('NotoSans', 'normal');
//     docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//     docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
// };

// const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
//     worksheet.views = [{ rightToLeft: false }];

//     const titleRow = worksheet.addRow([title]);
//     titleRow.font = { name: 'NotoSans', size: 14, bold: true };
//     worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
//     titleRow.getCell(1).alignment = { horizontal: 'center' };

//     const dateRow = worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
//     dateRow.font = { name: 'NotoSans', size: 10, bold: false };
//     dateRow.getCell(1).alignment = { horizontal: 'left' };
//     worksheet.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);

//     worksheet.addRow([]);
// };

// const addExcelCompanyInfo = (worksheet: Excel.Worksheet, startRow: number, columnsLength: number) => {
//     const companyInfo = [
//         'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
//         'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
//         'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
//     ];
//     let rowNum = startRow;
//     companyInfo.forEach(line => {
//         const row = worksheet.getRow(rowNum);
//         row.getCell(1).value = line;
//         row.getCell(1).alignment = { horizontal: 'center', readingOrder: 'ltr' };
//         row.getCell(1).font = { name: 'NotoSans', size: 8, bold: false };
//         worksheet.mergeCells(`A${rowNum}:${String.fromCharCode(65 + columnsLength - 1)}${rowNum}`);
//         rowNum++;
//     });
// };

// const ListRollCalls = () => {
//     const navigate = useNavigate();
//     const { isTooltipGloballyEnabled } = useTooltip();
//     const { allowedOperations } = useAuth();

//     // -- Stateهای فرم --
//     const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
//     const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
//     const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
//     const [selectedPersonnelWorkPlaceId, setSelectedPersonnelWorkPlaceId] = useState<number | null>(null);
//     const [editingId, setEditingId] = useState<number | null>(null);

//     // -- Stateهای لیست و واکشی --
//     const [rollCallsList, setRollCallsList] = useState<RollCallType[]>([]);
//     const [personnelWorkPlaces, setPersonnelWorkPlaces] = useState<PersonnelWorkPlace[]>([]);
//     const [loadingData, setLoadingData] = useState<boolean>(true);
//     const [isFormVisible, setIsFormVisible] = useState(false);
//     const [isBlinking, setIsBlinking] = useState(true);
//     const [loadingButton, setLoadingButton] = useState<boolean>(false);

//     // -- Stateهای خطا و پیام --
//     const [alertMessage, setAlertMessage] = useState<string | null>(null);
//     const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
//     const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
//         date: false,
//         personnel: false,
//         endTime: false
//     });
//     // -- Stateهای جدول، فیلتر و مرتب‌سازی --
//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(10);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [orderBy, setOrderBy] = useState<SortableRollCallKeys>('createAt');
//     const [order, setOrder] = useState<'asc' | 'desc'>('desc');
//     const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

//     const [itemToDelete, setItemToDelete] = useState<RollCallType | null>(null);

//     // -- Stateهای عملیات منو و حذف --
//     const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//     const [selectedRowForMenu, setSelectedRowForMenu] = useState<RollCallType | null>(null);
//     const openMenu = Boolean(anchorEl);
//     const [openDeleteModal, setOpenDeleteModal] = useState(false);

//     // -- Stateهای دانلود --
//     const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
//     const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
//     const [selectedRollCallForDownload, setSelectedRollCallForDownload] = useState<RollCallType | null>(null);


//     // دسترسی‌های کاربر
//     const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
//     const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
//     const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
//     const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

//     // =========================================================================
//     // ۴. توابع API و مدیریت Alert
//     // =========================================================================

//     const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//         setAlertMessage(message);
//         setAlertSeverity(severity);
//     }, []);

//     const clearAlert = () => setAlertMessage(null);
//     useEffect(() => {
//         let timer: NodeJS.Timeout;
//         if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
//         return () => { if (timer) clearTimeout(timer); };
//     }, [alertMessage]);
//     useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);


//     const fetchPersonnelWorkPlaces = useCallback(async () => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate('/'); return; }

//         try {
//             const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels-work-places`, {
//                 headers: { Authorization: `Bearer ${authToken}` }
//             });

//             if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
//                 const workhouseAssignments = res.data.data
//                     .filter((r: any) => Number(r.type) === 1) // فقط WORKHOUSE
//                     .map((r: any) => ({
//                         id: Number(r.id),
//                         personnel: { id: Number(r.personnel.id), name: r.personnel.name, family: r.personnel.family },
//                         position: r.position ? { id: Number(r.position.id), title: r.position.title } : null,
//                         placeId: Number(r.placeId),
//                         type: 1 as 1,
//                         placeKind: 'WORKHOUSE',
//                         placeName: r.workhouse?.name || '-',
//                         personnelName: `${r.personnel?.name ?? ''} ${r.personnel?.family ?? ''}`.trim(),
//                     }));

//                 setPersonnelWorkPlaces(workhouseAssignments);
//             }
//         } catch (e) {
//             showAlert('Personel işyeri listesi yüklenirken bir hata oluştu.', 'error');
//         }
//     }, [navigate, showAlert]);

//     const fetchRollCalls = useCallback(async () => {
//         setLoadingData(true);
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate('/'); setLoadingData(false); return; }

//         try {
//             const res = await axios.get(`${server.baseurl}${server.hr}get-all-RollCalls`, {
//                 headers: { Authorization: `Bearer ${authToken}` }
//             });

//             if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
//                 const mappedData: RollCallType[] = res.data.data.map((r: any) => ({
//                     id: Number(r.id),
//                     date: r.date,
//                     startTime: r.startTime,
//                     endTime: r.endTime,
//                     createAt: r.createAt,
//                     recordStatus: Number(r.recordStatus),
//                     personnelWorkPlace: r.personnelWorkPlace,
//                     personnelName: `${r.personnelWorkPlace.personnel?.name ?? ''} ${r.personnelWorkPlace.personnel?.family ?? ''}`.trim(),
//                     positionTitle: r.personnelWorkPlace.position?.title || '-',
//                     placeName: r.personnelWorkPlace.workhouse?.name || '-',
//                     status: Number(r.recordStatus) === 0 ? 'Aktif' : 'Pasif'
//                 }));
//                 setRollCallsList(mappedData);
//             } else {
//                 showAlert('Yoklama listesi yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e) {
//             showAlert('Yoklama listesi yüklenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingData(false);
//         }
//     }, [navigate, showAlert]);

//     useEffect(() => {
//         fetchPersonnelWorkPlaces();
//         fetchRollCalls();
//     }, [fetchPersonnelWorkPlaces, fetchRollCalls]);

//     useEffect(() => {
//         const timer = setTimeout(() => { setIsBlinking(false); }, 5000);
//         return () => { clearTimeout(timer); };
//     }, []);

//     // =========================================================================
//     // ۵. منطق فرم و اعتبارسنجی
//     // =========================================================================

//     const resetFormAndState = () => {
//         setSelectedDate(new Date());
//         setSelectedStartTime(null);
//         setSelectedEndTime(null);
//         setSelectedPersonnelWorkPlaceId(null);
//         setEditingId(null);
//         setValidationErrors({ date: false, personnel: false, endTime: false });
//         setIsFormVisible(false);
//         clearAlert();
//     };


//     const validateForm = () => {
//         let isValid = true;
//         const errors: ValidationErrors = {
//             date: false,
//             personnel: false,
//             endTime: false
//         };
//         // 1. اعتبارسنجی تاریخ
//         if (!selectedDate) {
//             errors.date = true;
//             isValid = false;
//             showAlert('Lütfen bir tarih seçin.', 'warning');
//         }

//         // 2. اعتبارسنجی ساعت‌ها (بخش کلیدی)

//         // ✅ تغییر کلیدی: اگر تاریخ انتخاب شده باشد، انتخاب ساعت اجباری است
//         const isTimeSelectionRequired = !!selectedDate;

//         // آیا حداقل یکی از ساعت‌ها انتخاب شده است؟ (برای بررسی تداخل)
//         const isTimeSelected = selectedStartTime || selectedEndTime;

//         // اگر انتخاب ساعت اجباری بود اما هیچ ساعتی انتخاب نشده بود:
//         if (isTimeSelectionRequired && !isTimeSelected) {
//             errors.endTime = true; // می‌توانیم از endTime برای نمایش خطا استفاده کنیم
//             isValid = false;
//             showAlert('Tarih seçildiğinde Başlangıç ve Bitiş saatleri zorunludur.', 'warning');
//         }

//         // اگر یکی انتخاب شده ولی دیگری نه (اجبار به انتخاب جفت ساعت):
//         else if (isTimeSelected) {
//             const isStartMissing = !selectedStartTime;
//             const isEndMissing = !selectedEndTime;

//             if (isStartMissing || isEndMissing) {
//                 errors.endTime = true;
//                 isValid = false;
//                 showAlert('Başlangıç veya Bitiş saati seçildiğinde, her ikisi de seçilmelidir.', 'warning');
//             }

//             // اگر هر دو انتخاب شده بودند، بررسی می‌کنیم که ساعت پایان بعد از شروع باشد
//             else if (selectedStartTime && selectedEndTime && selectedStartTime >= selectedEndTime) {
//                 errors.endTime = true;
//                 isValid = false;
//                 showAlert('Bitiş saati, Başlangıç saatinden sonra olmalıdır.', 'warning');
//             }
//         }


//         setValidationErrors(errors);
//         return isValid;
//     };

//     const getPayload = () => ({
//         date: selectedDate ? selectedDate.toISOString() : undefined,
//         startTime: selectedStartTime ? format(selectedStartTime, 'HH:mm:00') : null,
//         endTime: selectedEndTime ? format(selectedEndTime, 'HH:mm:00') : null,
//         personnelWorkPlaceId: selectedPersonnelWorkPlaceId,
//     });

//     const insertRollCall = async () => {
//         if (!validateForm() || !hasCreatePermission) return;
//         setLoadingButton(true);
//         const authToken = localStorage.getItem('authToken');
//         try {
//             const payload = getPayload();
//             // API: create-roll-call
//             const response = await axios.post(`${server.baseurl}${server.hr}create-roll-call`, payload, {
//                 headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
//             });
//             if (response.data.httpStatusCode === 201) {
//                 showAlert('Yeni yoklama kaydı başarıyla eklendi.', 'success');
//                 resetFormAndState();
//                 fetchRollCalls();
//             } else {
//                 showAlert(response.data.message || 'Yoklama kaydı eklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Sunucu ile bağlantı hatası.', 'error');
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const editRollCall = async () => {
//         if (!validateForm() || !editingId || !hasEditPermission) return;
//         setLoadingButton(true);
//         const authToken = localStorage.getItem('authToken');
//         try {
//             const payload = { id: editingId, ...getPayload() };
//             // API: update-roll-call
//             const response = await axios.put(`${server.baseurl}${server.hr}update-roll-call`, payload, {
//                 headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
//             });
//             if (response.data.httpStatusCode === 200) {
//                 showAlert('Yoklama kaydı başarıyla güncellendi.', 'success');
//                 resetFormAndState();
//                 fetchRollCalls();
//             } else {
//                 showAlert(response.data.message || 'Yoklama kaydı güncellenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Sunucu ile bağlantı hatası.', 'error');
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const handleEditClick = () => {
//         if (selectedRowForMenu) {
//             const row = selectedRowForMenu;
//             setEditingId(row.id);

//             try {
//                 // Saat formatı HH:mm:ss olduğu için، Date ساختگی ایجاد می‌شود
//                 const timeBase = new Date('2000-01-01');
//                 setSelectedDate(row.date ? new Date(row.date) : null);
//                 setSelectedStartTime(row.startTime ? new Date(`${timeBase.toISOString().split('T')[0]}T${row.startTime}`) : null);
//                 setSelectedEndTime(row.endTime ? new Date(`${timeBase.toISOString().split('T')[0]}T${row.endTime}`) : null);
//                 setSelectedPersonnelWorkPlaceId(Number(row.personnelWorkPlace.id));
//             } catch (e) {
//                 showAlert('Tarih/saat verileri dönüştürülürken hata oluştu.', 'error');
//             }

//             setValidationErrors({ date: false, personnel: false, endTime: false });
//             setIsFormVisible(true);
//         }
//         handleCloseMenu();
//     };

//     // =========================================================================
//     // ۶. منطق جدول، فیلتر و مرتب‌سازی
//     // =========================================================================

//     const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => {
//         if (newFilter !== null) {
//             setStatusFilter(newFilter); // ✅ به‌روزرسانی وضعیت فیلتر
//             setPage(0); // بازگشت به صفحه اول
//         }
//     };

//     const displayedRollCalls = useMemo(() => {
//         const filteredBySearchAndStatus = rollCallsList.filter(rc => {
//             const matchesSearch = searchTerm.trim() === '' ||
//                 rc.personnelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 rc.placeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 rc.positionTitle?.toLowerCase().includes(searchTerm.toLowerCase());

//             const matchesStatus =
//                 statusFilter === 'all' ||
//                 (statusFilter === 'active' && rc.recordStatus === 0) ||
//                 (statusFilter === 'inactive' && rc.recordStatus === 1);

//             return matchesSearch && matchesStatus;
//         });

//         const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
//         return sortedData;
//     }, [rollCallsList, searchTerm, statusFilter, order, orderBy]);

//     const paginatedRollCalls = useMemo(() => {
//         return displayedRollCalls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
//     }, [displayedRollCalls, page, rowsPerPage]);

//     const handleRequestSort = (property: SortableRollCallKeys) => {
//         const isAsc = orderBy === property && order === 'asc';
//         setOrder(isAsc ? 'desc' : 'asc');
//         setOrderBy(property);
//         setPage(0);
//     };

//     const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
//     const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
//         setRowsPerPage(parseInt(event.target.value, 10));
//         setPage(0);
//     };
//     const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//         setSearchTerm(event.target.value);
//         setPage(0);
//     };

//     const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RollCallType) => {
//         setAnchorEl(event.currentTarget);
//         setSelectedRowForMenu(row);
//     };

//     const handleCloseMenu = () => {
//         setAnchorEl(null);
//         setSelectedRowForMenu(null);
//     };

//     const handleClickOpenDeleteModal = () => {
//         if (selectedRowForMenu) {
//             // ✅ آبجکت کامل رکورد را ذخیره می‌کنیم
//             setItemToDelete(selectedRowForMenu);
//             setOpenDeleteModal(true);
//         }
//         handleCloseMenu();
//     };

//     const handleClickCloseDeleteModal = () => {
//         setOpenDeleteModal(false);
//         // ✅ آبجکت حذف شده را پاک می‌کنیم
//         setItemToDelete(null);
//         fetchRollCalls();
//     };
//     // =========================================================================
//     // ۷. توابع دانلود (Download Functions)
//     // =========================================================================

//     const exportRollCallsToPdf = async (data: RollCallType[], isFiltered: boolean) => {
//         if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
//         setLoadingData(true);
//         showAlert('Rapor oluşturuluyor...', 'info');

//         const doc = new jsPDF();
//         const docAny = doc as any;

//         // ⚠️ تنظیم فونت برای پشتیبانی از کاراکترهای ترکی
//         if (typeof docAny.addFileToVFS === 'function') {
//             docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//             docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//             docAny.setFont('NotoSans');
//         } else {
//             docAny.setFont('Helvetica'); // بازگشت به فونت پیش‌فرض
//         }

//         const columns = [
//             "ID", "Personel", "Pozisyon", "Tarih", "Başlangıç", "Bitiş"
//         ];
//         const rows = data.map(row => [
//             row.id,
//             row.personnelName,
//             row.positionTitle,
//             formatDateDisplay(row.date),
//             row.startTime || '-',
//             row.endTime || '-'
//         ]);

//         const headerTitle = isFiltered ? "Filtrelenmiş Yoklama Raporu" : "Tüm Yoklama Raporu";

//         autoTable(docAny, {
//             startY: 45,
//             head: [columns],
//             body: rows,
//             theme: 'grid',
//             styles: { font: docAny.getFont().fontName, fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
//             headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//             didDrawPage: (_hookData: any) => {
//                 addPdfHeader(doc, headerTitle);
//                 addPdfFooter(doc);
//             },
//             showHead: 'everyPage',
//             margin: { top: 65, bottom: 45, left: 10, right: 10 }
//         });
//         docAny.save(isFiltered ? 'Filtrelenmis_Yoklamalar.pdf' : 'Tum_Yoklamalar.pdf');
//         showAlert('PDF başarıyla oluşturuldu.', 'success');
//         setLoadingData(false);
//     };

//     const exportRollCallsToExcel = async (data: RollCallType[], isFiltered: boolean) => {
//         if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
//         setLoadingData(true);
//         showAlert('Rapor oluşturuluyor...', 'info');

//         const workbook = new Excel.Workbook();
//         const worksheet = workbook.addWorksheet('Yoklamalar');

//         const columns = [
//             "ID", "Personel", "Pozisyon", "Tarih", "Başlangıç Saati", "Bitiş Saati"
//         ];
//         const headerTitle = isFiltered ? "Filtrelenmiş Yoklama Raporu" : "Tüm Yoklama Raporu";
//         addExcelHeader(worksheet, headerTitle, columns.length);

//         const headerRow = worksheet.addRow(columns);
//         headerRow.font = { name: 'NotoSans', bold: true };
//         headerRow.eachCell(cell => {
//             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
//         });

//         data.forEach(row => {
//             worksheet.addRow([
//                 row.id,
//                 row.personnelName,
//                 row.positionTitle,
//                 formatDateDisplay(row.date),
//                 row.startTime || '-',
//                 row.endTime || '-'
//             ]);
//         });

//         worksheet.columns.forEach(column => {
//             let maxLength = 0;
//             if (column && typeof column.eachCell === 'function') {
//                 column.eachCell({ includeEmpty: true }, cell => {
//                     const columnLength = cell.value ? cell.value.toString().length : 10;
//                     if (columnLength > maxLength) maxLength = columnLength;
//                 });
//             }
//             column.width = Math.min(Math.max(maxLength + 2, 15), 50);
//         });

//         addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, columns.length);

//         const fileName = isFiltered ? 'Filtrelenmis_Yoklamalar.xlsx' : 'Tum_Yoklamalar.xlsx';
//         workbook.xlsx.writeBuffer().then(buffer => {
//             saveAs(new Blob([buffer]), fileName);
//             showAlert('Excel başarıyla oluşturuldu.', 'success');
//         });
//         setLoadingData(false);
//     };

//     // Download Modal Handlers
//     const handleOpenDownloadAllModal = () => { setOpenDownloadAllModal(true); };
//     const handleCloseDownloadAllModal = () => { setOpenDownloadAllModal(false); };

//     const handleOpenRowDownloadModal = (rollCall: RollCallType) => {
//         setSelectedRollCallForDownload(rollCall);
//         setOpenRowDownloadModal(true);
//         handleCloseMenu();
//     };
//     const handleCloseRowDownloadModal = () => {
//         setOpenRowDownloadModal(false);
//         setSelectedRollCallForDownload(null);
//     };

//     const handleDownloadAll = (format: 'pdf' | 'excel', isFiltered: boolean) => {
//         const dataToDownload = isFiltered ? displayedRollCalls : rollCallsList;

//         if (format === 'pdf') {
//             exportRollCallsToPdf(dataToDownload, isFiltered);
//         } else {
//             exportRollCallsToExcel(dataToDownload, isFiltered);
//         }
//         handleCloseDownloadAllModal();
//     };

//     const handleDownloadRow = (format: 'pdf' | 'excel') => {
//         if (selectedRollCallForDownload) {
//             if (format === 'pdf') {
//                 exportRollCallsToPdf([selectedRollCallForDownload], false);
//             } else {
//                 exportRollCallsToExcel([selectedRollCallForDownload], false);
//             }
//         }
//         handleCloseRowDownloadModal();
//     };


//     return (
//         <>
//             <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
//                 <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
//                     <Typography variant="h4">Yoklama Kayıtları (Şantiye)</Typography>
//                     <Stack direction="row" spacing={1}>
//                         {!isFormVisible && hasCreatePermission && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni yoklama kaydı oluşturmak için tıklayınız" : ""}>
//                                 <BlinkingButton
//                                     variant="contained"
//                                     color="primary"
//                                     onClick={() => setIsFormVisible(true)}
//                                     isBlinking={isBlinking}
//                                     fullWidth={false}
//                                     startIcon={<IconPlus size={20} />}
//                                 >
//                                     Yeni Yoklama Kaydet
//                                 </BlinkingButton>
//                             </CustomTooltip>
//                         )}
//                         {isFormVisible && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
//                                 <Button
//                                     variant="contained"
//                                     color="error"
//                                     onClick={resetFormAndState}
//                                     fullWidth={false}
//                                     startIcon={<IconX size={20} />}
//                                 >
//                                     Gizle
//                                 </Button>
//                             </CustomTooltip>
//                         )}
//                     </Stack>
//                 </Stack>

//                 {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
//                     <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
//                         <Typography variant="h5" mb={2}>{editingId ? 'Yoklama Kaydını Düzenle' : 'Yeni Yoklama Kaydı'}</Typography>

//                         <Grid container spacing={2}>
//                             {/* Personel Seçimi (Sadece WORKHOUSE) */}
//                             <Grid item xs={12} sm={4}>
//                                 <FormControl fullWidth size="small" error={validationErrors.personnel}>
//                                     <CustomFormLabel htmlFor="personnel-selection" required>Personel (Şantiye)</CustomFormLabel>
//                                     <Autocomplete
//                                         id="personnel-selection"
//                                         options={personnelWorkPlaces}
//                                         getOptionLabel={(option) => `${option.personnelName}`}
//                                         isOptionEqualToValue={(option, value) => option.id === value.id}
//                                         value={personnelWorkPlaces.find(p => p.id === selectedPersonnelWorkPlaceId) || null}
//                                         onChange={(_event, newValue) => {
//                                             setSelectedPersonnelWorkPlaceId(newValue ? newValue.id : null);
//                                             if (validationErrors.personnel && newValue) setValidationErrors({ ...validationErrors, personnel: false });
//                                         }}
//                                         size="small"
//                                         renderInput={(params) => (
//                                             <TextField
//                                                 {...params}
//                                                 label="Personel/Şantiye Seçin"
//                                                 error={validationErrors.personnel}
//                                                 helperText={validationErrors.personnel ? "Personel seçimi zorunludur!" : ""}
//                                             />
//                                         )}
//                                         sx={{ width: '100%' }}
//                                         noOptionsText="Şantiye işyeri kaydı bulunamadı."
//                                     />
//                                 </FormControl>
//                             </Grid>

//                             {/* Tarih Seçimi */}
//                             <Grid item xs={12} sm={3}>
//                                 <CustomFormLabel htmlFor="date-selection" required>Tarih</CustomFormLabel>
//                                 <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
//                                     <DatePicker
//                                         label="Tarih Seçin"
//                                         value={selectedDate}
//                                         inputFormat="dd/MM/yyyy"
//                                         onChange={(newValue) => {
//                                             setSelectedDate(newValue);
//                                             if (validationErrors.date && newValue) setValidationErrors({ ...validationErrors, date: false });
//                                         }}
//                                         renderInput={(params) => (
//                                             <TextField
//                                                 {...params}
//                                                 size="small"
//                                                 fullWidth
//                                                 error={validationErrors.date}
//                                                 helperText={validationErrors.date ? "Tarih zorunludur!" : ""}
//                                             />
//                                         )}
//                                     />
//                                 </LocalizationProvider>
//                             </Grid>

//                             {/* Saat Seçimi */}
//                             <Grid item xs={12} sm={2}>
//                                 <CustomFormLabel htmlFor="start-time">Başlangıç Saati</CustomFormLabel>
//                                 <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
//                                     <TimePicker
//                                         label="Başlangıç"
//                                         value={selectedStartTime}
//                                         onChange={(newValue) => {
//                                             setSelectedStartTime(newValue);
//                                             if (validationErrors.endTime) validateForm();
//                                         }}
//                                         renderInput={(params) => <TextField {...params} size="small" fullWidth error={validationErrors.endTime} />}
//                                         ampm={false}
//                                         views={['hours', 'minutes']}
//                                     />
//                                 </LocalizationProvider>
//                             </Grid>

//                             <Grid item xs={12} sm={2}>
//                                 <CustomFormLabel htmlFor="end-time">Bitiş Saati</CustomFormLabel>
//                                 <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
//                                     <TimePicker
//                                         label="Bitiş"
//                                         value={selectedEndTime}
//                                         onChange={(newValue) => {
//                                             setSelectedEndTime(newValue);
//                                             if (validationErrors.endTime) validateForm();
//                                         }}
//                                         renderInput={(params) => <TextField {...params} size="small" fullWidth error={validationErrors.endTime} />}
//                                         ampm={false}
//                                         views={['hours', 'minutes']}
//                                     />
//                                 </LocalizationProvider>
//                             </Grid>
//                             <Grid item xs={12} sm={1}>
//                                 <CustomFormLabel htmlFor="clear-time" sx={{ color: 'transparent' }}>Temizle</CustomFormLabel>
//                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Saatleri temizle" : ""}>
//                                     <IconButton
//                                         onClick={() => { setSelectedStartTime(null); setSelectedEndTime(null); setValidationErrors({ ...validationErrors, endTime: false }); }}
//                                         color="error"
//                                         sx={{ mt: 0.5, p: 1 }}
//                                     >
//                                         <IconX size={20} />
//                                     </IconButton>
//                                 </CustomTooltip>
//                             </Grid>

//                             <Grid item xs={12}>
//                                 <Stack direction="row" spacing={1} justifyContent="flex-end">
//                                     {editingId !== null ? (
//                                         <>
//                                             <Button variant="contained" color="info" onClick={editRollCall} disabled={loadingButton || !hasEditPermission}>
//                                                 {loadingButton ? 'Güncelleniyor...' : 'Düzenle'}
//                                             </Button>
//                                             <Button variant="outlined" color="secondary" onClick={resetFormAndState}>İptal Et</Button>
//                                         </>
//                                     ) : (
//                                         <>
//                                             <Button variant="contained" color="success" onClick={insertRollCall} disabled={loadingButton || !hasCreatePermission}>
//                                                 {loadingButton ? 'Kaydediliyor...' : 'Yeni Kayıt Ekle'}
//                                             </Button>
//                                         </>
//                                     )}
//                                 </Stack>
//                             </Grid>
//                         </Grid>


//                     </Paper>
//                 )}
//             </div>



//             <>
//                 {alertMessage && (
//                     <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
//                         <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
//                     </Stack>
//                 )}
//             </>
//             <Grid item xs={12} sm={6} md={6} mb={2} sx={{ textAlign: 'right' }}>
//                 <Button
//                     variant="contained"
//                     color="primary"
//                     onClick={handleOpenDownloadAllModal}
//                     startIcon={<IconFileDownload />}
//                     disabled={loadingData || !hasDownloadPermission}
//                 >
//                     Tümünü İndir
//                 </Button>
//             </Grid>
//             {/* TABLE AND FILTERS */}
//             <BlankCard>
//                 <Box sx={{ p: 2 }}>
//                     <Grid container spacing={2} alignItems="center">
//                         <Grid item xs={12} sm={6} md={8}>
//                             <TextField
//                                 label="Personel, Pozisyon veya Unvan Ara"
//                                 variant="outlined"
//                                 fullWidth
//                                 value={searchTerm}
//                                 onChange={handleSearchChange}
//                                 InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
//                             />
//                         </Grid>
//                         <Grid item xs={12} sm={6} md={4}>
//                             <ToggleButtonGroup
//                                 value={statusFilter}
//                                 exclusive
//                                 onChange={handleStatusFilterChange}
//                                 aria-label="Status filter"
//                                 fullWidth
//                             >
//                                 {/* Tümü (همه) - recordStatus: 0 veya 1 */}
//                                 <StyledToggleButton value="all" aria-label="all records">Tümü</StyledToggleButton>

//                                 {/* Aktif (فعال) - recordStatus: 0 */}
//                                 <StyledToggleButton value="active" aria-label="active records">Aktif</StyledToggleButton>

//                                 {/* Pasif (غیرفعال) - recordStatus: 1 */}
//                                 <StyledToggleButton value="inactive" aria-label="inactive records">Pasif</StyledToggleButton>
//                             </ToggleButtonGroup>
//                         </Grid>
//                     </Grid>
//                 </Box>
//                 <TableContainer>
//                     {loadingData ? (
//                         <Box display="flex" justifyContent="center" alignItems="center" height="200px">
//                             <CircularProgress />
//                             <Typography variant="h6" sx={{ ml: 2 }}>Yoklama kayıtları yükleniyor...</Typography>
//                         </Box>
//                     ) : (
//                         <Table aria-label="roll call table">
//                             <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
//                                 <TableRow>
//                                     <StyledTableCell sx={{ color: "#171c23" }}>
//                                         <TableSortLabel active={orderBy === 'personnelName'} direction={orderBy === 'personnelName' ? order : 'asc'} onClick={() => handleRequestSort('personnelName')}>Personel</TableSortLabel>
//                                     </StyledTableCell>
//                                     <StyledTableCell sx={{ color: "#171c23" }}>Pozisyon</StyledTableCell>
//                                     <StyledTableCell sx={{ color: "#171c23" }}>
//                                         <TableSortLabel active={orderBy === 'date'} direction={orderBy === 'date' ? order : 'asc'} onClick={() => handleRequestSort('date')}>Tarih</TableSortLabel>
//                                     </StyledTableCell>
//                                     <StyledTableCell sx={{ color: "#171c23" }}>Başlangıç</StyledTableCell>
//                                     <StyledTableCell sx={{ color: "#171c23" }}>Bitiş</StyledTableCell>
//                                     <StyledTableCell sx={{ color: "#171c23" }}>
//                                         <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')}>Oluşturulma Tarihi</TableSortLabel>
//                                     </StyledTableCell>
//                                     <StyledTableCell></StyledTableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {paginatedRollCalls.length > 0 ? (
//                                     paginatedRollCalls.map((row) => (
//                                         <TableRow key={row.id} hover>
//                                             <StyledTableCell><Typography variant="body1">{row.personnelName}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{row.positionTitle || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.date)}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{row.startTime || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{row.endTime || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography></StyledTableCell>
//                                             <StyledTableCell>
//                                                 <IconButton onClick={(event) => handleClickMenu(event, row)}>
//                                                     <IconDots width={18} />
//                                                 </IconButton>
//                                                 <Menu
//                                                     anchorEl={anchorEl}
//                                                     open={openMenu && selectedRowForMenu?.id === row.id}
//                                                     onClose={handleCloseMenu}
//                                                 >
//                                                     {hasEditPermission && (
//                                                         <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>
//                                                     )}
//                                                     {hasDeletePermission && (
//                                                         <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
//                                                     )}
//                                                     {hasDownloadPermission && (
//                                                         <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu Satırı İndir</MuiMenuItem>
//                                                     )}
//                                                 </Menu>
//                                             </StyledTableCell>
//                                         </TableRow>
//                                     ))
//                                 ) : (
//                                     <TableRow><StyledTableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç yoklama kaydı bulunamadı.</Typography></StyledTableCell></TableRow>
//                                 )}
//                             </TableBody>
//                         </Table>
//                     )}
//                 </TableContainer>
//                 <TablePagination
//                     rowsPerPageOptions={[5, 10, 25]}
//                     component="div"
//                     count={displayedRollCalls.length}
//                     rowsPerPage={rowsPerPage}
//                     page={page}
//                     onPageChange={handleChangePage}
//                     onRowsPerPageChange={handleChangeRowsPerPage}
//                     labelRowsPerPage="Sayfa başına düşen:"
//                     labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
//                 />
//             </BlankCard>

//             {/* Modal for All/Filtered Downloads */}
//             <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
//                 <DialogTitle>Rapor İndirme Seçeneği</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         {searchTerm.trim() !== '' && (
//                             <Typography variant="subtitle2" color="textSecondary">Filtrelenmiş Kayıt Sayısı: {displayedRollCalls.length}</Typography>
//                         )}
//                         <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('pdf', searchTerm.trim() !== '')}>
//                             {searchTerm.trim() !== '' ? 'Filtrelenmiş PDF' : 'Tümünü PDF İndir'}
//                         </Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('excel', searchTerm.trim() !== '')}>
//                             {searchTerm.trim() !== '' ? 'Filtrelenmiş Excel' : 'Tümünü Excel İndir'}
//                         </Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button>
//                 </DialogActions>
//             </Dialog>

//             {/* Modal for downloading a single row */}
//             <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
//                 <DialogTitle>Satır İndirme Seçeneği</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button>
//                 </DialogActions>
//             </Dialog>

//             <DeleteRollCalls
//                 openModal={openDeleteModal}
//                 onClose={handleClickCloseDeleteModal}
//                 // ✅ استفاده از itemToDelete جدید
//                 itemToDelete={itemToDelete}
//                 showAlert={showAlert}
//                 onDeleteSuccess={fetchRollCalls}
//             />
//         </>
//     );
// };

// export default ListRollCalls;

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, Dialog, DialogTitle,
    DialogContent, DialogActions,
    // ToggleButton as MuiToggleButton, ToggleButtonGroup,
    TableSortLabel
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconCheck
} from '@tabler/icons-react';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useAuth } from 'src/context/AuthContext';
import { CustomTooltip } from 'src/context/TooltipContext';
import DeleteRollCalls from './DeleteRollCalls';
// ابزارهای گزارش‌گیری
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import BlankCard from "src/components/shared/BlankCard";
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";

// =========================================================================
// ۱. Typeها و Styled Components
// =========================================================================

const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    try {
        return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

// تابع کمکی برای فرمت ساعت برای نمایش در TimePicker
const parseTimeForTimePicker = (timeString: string | null): Date | null => {
    if (!timeString) return null;
    try {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    } catch (e) {
        return null;
    }
}

// const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
//     '&.Mui-selected': {
//         color: 'white',
//         ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
//         ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
//         ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
//     },
//     '&:not(.Mui-selected)': {
//         color: theme.palette.text.primary,
//         borderColor: theme.palette.divider,
//         '&:hover': { backgroundColor: theme.palette.action.hover },
//     },
// }));

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

interface PersonnelWorkPlace {
    id: number;
    personnel: { id: number; name: string; family: string };
    position: { id: number; title: string } | null;
    placeId: number;
    type: 0 | 1 | 2 | 3; // 1 = WORKHOUSE
    placeKind: string;
    placeName: string;
    personnelName: string;
    hasRollCallToday: boolean;
}

interface RollCallType {
    id: number;
    date: string;
    startTime: string | null;
    endTime: string | null;
    createAt: string;
    recordStatus: number;
    personnelWorkPlace: {
        id: string;
        placeId: string;
        type: string;
        personnel: { id: string; name: string; family: string; };
        position: { id: string; title: string; };
        workhouse?: { name: string };
    };
    personnelName: string;
    placeName: string;
    positionTitle: string;
    status: 'Aktif' | 'Pasif';
}

type SortableRollCallKeys = 'date' | 'startTime' | 'endTime' | 'createAt' | 'personnelName' | 'placeName';

// State برای نگهداری ساعات در جدول ثبت روزانه
interface DailyTimes {
    startTime: Date | null;
    endTime: Date | null;
    loading: boolean;
}

// =========================================================================
// ۲. توابع کمکی برای مرتب‌سازی
// =========================================================================

const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) {
        return (valA === undefined || valA === null) ? 0 : -1;
    }
    if (valA === undefined || valA === null) {
        return 1;
    }
    if (typeof valB === 'string' && typeof valA === 'string') {
        return valB.localeCompare(valA);
    }
    if (String(valB) < String(valA)) {
        return -1;
    }
    if (String(valB) > String(valA)) {
        return 1;
    }
    return 0;
};

const getComparator = (order: 'asc' | 'desc', orderBy: SortableRollCallKeys): (a: RollCallType, b: RollCallType) => number => {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};

// =========================================================================
// ۳. توابع گزارش‌گیری (Header/Footer/PDF/Excel)
// =========================================================================

const addPdfHeader = (doc: any, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 40, 25);

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Rapor Tarihi:`, 15, 25);
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 25);
};

const addPdfFooter = (doc: any) => {
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
        footerY += 4;
    });
    doc.setFontSize(10);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    docAny.setFont('NotoSans', 'normal');
    docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
};

const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
    worksheet.views = [{ rightToLeft: false }];

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { name: 'NotoSans', size: 14, bold: true };
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
    titleRow.getCell(1).alignment = { horizontal: 'center' };

    const dateRow = worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
    dateRow.font = { name: 'NotoSans', size: 10, bold: false };
    dateRow.getCell(1).alignment = { horizontal: 'left' };
    worksheet.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);

    worksheet.addRow([]);
};

const addExcelCompanyInfo = (worksheet: Excel.Worksheet, startRow: number, columnsLength: number) => {
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
    ];
    let rowNum = startRow;
    companyInfo.forEach(line => {
        const row = worksheet.getRow(rowNum);
        row.getCell(1).value = line;
        row.getCell(1).alignment = { horizontal: 'center', readingOrder: 'ltr' };
        row.getCell(1).font = { name: 'NotoSans', size: 8, bold: false };
        worksheet.mergeCells(`A${rowNum}:${String.fromCharCode(65 + columnsLength - 1)}${rowNum}`);
        rowNum++;
    });
};

const ListRollCalls = () => {
    const navigate = useNavigate();
    const { allowedOperations } = useAuth();
    const theme = useTheme();

    // --- Stateهای ویرایش مودال ---
    const [editingId, setEditingId] = useState<number | null>(null);
    const [itemToEdit, setItemToEdit] = useState<RollCallType | null>(null);
    const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
    const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [editValidationErrors, setEditValidationErrors] = useState<boolean>(false);

    // --- Stateهای ثبت حضور روزانه ---
    const defaultStartTime = useMemo(() => {
        const date = new Date();
        date.setHours(8, 0, 0, 0);
        return date;
    }, []);
    const defaultEndTime = useMemo(() => {
        const date = new Date();
        date.setHours(17, 0, 0, 0);
        return date;
    }, []);
    const [dailyTimes, setDailyTimes] = useState<Record<number, DailyTimes>>({});
    const [isDailyRegisterLoading, setIsDailyRegisterLoading] = useState<Record<number, boolean>>({});


    // --- Stateهای لیست و واکشی ---
    const [rollCallsList, setRollCallsList] = useState<RollCallType[]>([]);
    const [personnelWorkPlaces, setPersonnelWorkPlaces] = useState<PersonnelWorkPlace[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);

    // --- Stateهای خطا و پیام ---
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // --- Stateهای جدول، فیلتر و مرتب‌سازی ---
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [orderBy, setOrderBy] = useState<SortableRollCallKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    // const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [itemToDelete, setItemToDelete] = useState<RollCallType | null>(null);

    // --- Stateهای عملیات منو و حذف/دانلود ---
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<RollCallType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);

    // ⚠️ تفکیک مودال‌های دانلود
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    // const [selectedRollCallForDownload, setSelectedRollCallForDownload] = useState<RollCallType | null>(null);


    // دسترسی‌های کاربر
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // =========================================================================
    // ۴. توابع API و مدیریت Alert
    // =========================================================================

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

    // واکشی لیست پرسنل WorkPlace
    const fetchPersonnelWorkPlaces = useCallback(async (rollCalls?: RollCallType[]) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels-work-places`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const today = format(new Date(), 'yyyy-MM-dd');
                const todayRollCalls = rollCalls ? rollCalls.filter(rc => format(new Date(rc.date), 'yyyy-MM-dd') === today) : [];

                const workhouseAssignments: PersonnelWorkPlace[] = res.data.data
                    .filter((r: any) => Number(r.type) === 1) // فقط WORKHOUSE
                    .map((r: any) => {
                        const personnelWorkPlaceId = Number(r.id);
                        const hasRollCallToday = todayRollCalls.some(rc => Number(rc.personnelWorkPlace?.id) === personnelWorkPlaceId);

                        return {
                            id: personnelWorkPlaceId,
                            personnel: { id: Number(r.personnel.id), name: r.personnel.name, family: r.personnel.family },
                            position: r.position ? { id: Number(r.position.id), title: r.position.title } : null,
                            placeId: Number(r.placeId),
                            type: 1 as 1,
                            placeKind: 'WORKHOUSE',
                            placeName: r.workhouse?.name || '-',
                            personnelName: `${r.personnel?.name ?? ''} ${r.personnel?.family ?? ''}`.trim(),
                            hasRollCallToday: hasRollCallToday,
                        };
                    });

                setPersonnelWorkPlaces(workhouseAssignments);

                // مقداردهی اولیه DailyTimes
                setDailyTimes(
                    workhouseAssignments.reduce((acc, p) => ({
                        ...acc,
                        [p.id]: {
                            startTime: defaultStartTime,
                            endTime: defaultEndTime,
                            loading: false
                        }
                    }), {})
                );
            }
        } catch (e) {
            showAlert('Personel işyeri listesi yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, defaultStartTime, defaultEndTime]);

    // واکشی لیست سوابق حضور
    const fetchRollCalls = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-RollCalls`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const mappedData: RollCallType[] = res.data.data.map((r: any) => ({
                    id: Number(r.id),
                    date: r.date,
                    startTime: r.startTime,
                    endTime: r.endTime,
                    createAt: r.createAt,
                    recordStatus: Number(r.recordStatus),
                    personnelWorkPlace: r.personnelWorkPlace,
                    personnelName: `${r.personnelWorkPlace.personnel?.name ?? ''} ${r.personnelWorkPlace.personnel?.family ?? ''}`.trim(),
                    positionTitle: r.personnelWorkPlace.position?.title || '-',
                    placeName: r.personnelWorkPlace.workhouse?.name || '-',
                    status: Number(r.recordStatus) === 0 ? 'Aktif' : 'Pasif'
                }));
                setRollCallsList(mappedData);
                fetchPersonnelWorkPlaces(mappedData);
            } else {
                showAlert('Yoklama listesi yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            showAlert('Yoklama listesi yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert, fetchPersonnelWorkPlaces]);

    useEffect(() => {
        fetchRollCalls();
    }, [fetchRollCalls]);

    // =========================================================================
    // ۵. منطق ثبت حضور روزانه (جدول جدید)
    // =========================================================================

    const handleDailyTimeChange = useCallback((id: number, field: keyof DailyTimes, value: Date | null) => {
        setDailyTimes(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    }, []);

    const handleDailyRollCall = async (row: PersonnelWorkPlace) => {
        if (!hasCreatePermission || isDailyRegisterLoading[row.id] || row.hasRollCallToday) return;

        const dailyRecord = dailyTimes[row.id] || { startTime: defaultStartTime, endTime: defaultEndTime };
        const { startTime, endTime } = dailyRecord;

        // اعتبارسنجی
        if (!startTime || !endTime || startTime >= endTime) {
            showAlert('Başlangıç ve Bitiş saatleri doğru seçilmelidir. (Başlangıç < Bitiş)', 'error');
            return;
        }

        setIsDailyRegisterLoading(prev => ({ ...prev, [row.id]: true }));
        const authToken = localStorage.getItem('authToken');

        const payload = {
            date: new Date().toISOString(),
            startTime: format(startTime, 'HH:mm:00'),
            endTime: format(endTime, 'HH:mm:00'),
            personnelWorkPlaceId: row.id,
        };

        try {
            const response = await axios.post(`${server.baseurl}${server.hr}create-roll-call`, payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 201) {
                showAlert(`${row.personnelName} için yoklama kaydı başarıyla onaylandı.`, 'success');
                setPersonnelWorkPlaces(prev => prev.map(p => p.id === row.id ? { ...p, hasRollCallToday: true } : p));
                fetchRollCalls();
            } else {
                showAlert(response.data.message || 'Kayıt eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Sunucu ile bağlantı hatası.', 'error');
        } finally {
            setIsDailyRegisterLoading(prev => ({ ...prev, [row.id]: false }));
        }
    };

    // =========================================================================
    // ۶. منطق ویرایش سوابق (Modal Edit)
    // =========================================================================

    const validateEditForm = () => {
        const isTimeSelected = selectedStartTime && selectedEndTime;
        if (!isTimeSelected) {
            showAlert('Başlangıç ve Bitiş saatleri zorunludur.', 'warning');
            setEditValidationErrors(true);
            return false;
        }
        if (selectedStartTime! >= selectedEndTime!) {
            showAlert('Bitiş saati, Başlangıç saatinden sonra olmalıdır.', 'warning');
            setEditValidationErrors(true);
            return false;
        }
        setEditValidationErrors(false);
        return true;
    };


    const handleOpenEditModal = () => {
        if (!selectedRowForMenu || !hasEditPermission) return;

        const row = selectedRowForMenu;
        setItemToEdit(row);
        setEditingId(row.id);

        try {
            setSelectedStartTime(parseTimeForTimePicker(row.startTime));
            setSelectedEndTime(parseTimeForTimePicker(row.endTime));
        } catch (e) {
            showAlert('Tarih/saat verileri dönüştürülürken hata oluştu.', 'error');
            return;
        }
        setOpenEditModal(true);
        handleCloseMenu();
    };

    const handleCloseEditModal = () => {
        setOpenEditModal(false);
        setItemToEdit(null);
        setEditingId(null);
        setSelectedStartTime(null);
        setSelectedEndTime(null);
        setEditValidationErrors(false);
        setLoadingButton(false);
        clearAlert();
    };


    const editRollCall = async () => {
        if (!validateEditForm() || !editingId || !hasEditPermission) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');

        debugger

        try {
            const payload = {
                id: Number(editingId),
                date: itemToEdit!.date,
                startTime: selectedStartTime ? format(selectedStartTime, 'HH:mm:00') : null,
                endTime: selectedEndTime ? format(selectedEndTime, 'HH:mm:00') : null,
                personnelWorkPlaceId: Number(itemToEdit!.personnelWorkPlace.id),
            };

            const response = await axios.put(`${server.baseurl}${server.hr}update-roll-call`, payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Yoklama kaydı başarıyla güncellendi.', 'success');
                handleCloseEditModal();
                fetchRollCalls();
            } else {
                showAlert(response.data.message || 'Yoklama kaydı güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Sunucu ile bağlantı hatası.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };


    // =========================================================================
    // ۷. منطق جدول، فیلتر و مرتب‌سازی
    // =========================================================================

    // const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => {
    //     if (newFilter !== null) {
    //         setStatusFilter(newFilter);
    //         setPage(0);
    //     }
    // };

    const displayedRollCalls = useMemo(() => {
        const filteredBySearchAndStatus = rollCallsList.filter(rc => {
            const matchesSearch = searchTerm.trim() === '' ||
                rc.personnelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rc.placeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rc.positionTitle?.toLowerCase().includes(searchTerm.toLowerCase());

            // const matchesStatus =
            //     statusFilter === 'all' ||
            //     (statusFilter === 'active' && rc.recordStatus === 0) ||
            //     (statusFilter === 'inactive' && rc.recordStatus === 1);

            return matchesSearch
            // && matchesStatus;
        });

        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
        return sortedData;
    }, [rollCallsList, searchTerm, order, orderBy]);

    const paginatedRollCalls = useMemo(() => {
        return displayedRollCalls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedRollCalls, page, rowsPerPage]);

    const handleRequestSort = (property: SortableRollCallKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RollCallType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setItemToDelete(selectedRowForMenu);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setItemToDelete(null);
        fetchRollCalls();
    };

    // =========================================================================
    // ۸. توابع دانلود (Download Functions)
    // =========================================================================

    const exportRollCallsToPdf = async (data: RollCallType[], isFiltered: boolean) => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true);
        showAlert('Rapor oluşturuluyor...', 'info');

        const doc = new jsPDF();
        const docAny = doc as any;

        if (typeof docAny.addFileToVFS === 'function') {
            docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            docAny.setFont('NotoSans');
        } else {
            docAny.setFont('Helvetica');
        }

        const columns = [
            "Personel", "Pozisyon", "Tarih", "Başlangıç", "Bitiş"
        ];
        const rows = data.map(row => [

            row.personnelName,
            row.positionTitle,
            formatDateDisplay(row.date),
            row.startTime || '-',
            row.endTime || '-'
        ]);

        const headerTitle = isFiltered ? "Filtrelenmiş Yoklama Raporu" : "Tüm Yoklama Raporu";

        autoTable(docAny, {
            startY: 45,
            head: [columns],
            body: rows,
            theme: 'grid',
            styles: { font: docAny.getFont().fontName, fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: (_hookData: any) => {
                addPdfHeader(doc, headerTitle);
                addPdfFooter(doc);
            },
            showHead: 'everyPage',
            margin: { top: 65, bottom: 45, left: 10, right: 10 }
        });
        docAny.save(isFiltered ? 'Filtrelenmis_Yoklamalar.pdf' : 'Tum_Yoklamalar.pdf');
        showAlert('PDF başarıyla oluşturuldu.', 'success');
        setLoadingData(false);
    };

    const exportRollCallsToExcel = async (data: RollCallType[], isFiltered: boolean) => {
        if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true);
        showAlert('Rapor oluşturuluyor...', 'info');

        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Yoklamalar');

        const columns = [
            "Personel", "Pozisyon", "Tarih", "Başlangıç Saati", "Bitiş Saati"
        ];
        const headerTitle = isFiltered ? "Filtrelenmiş Yoklama Raporu" : "Tüm Yoklama Raporu";
        addExcelHeader(worksheet, headerTitle, columns.length);

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        data.forEach(row => {
            worksheet.addRow([

                row.personnelName,
                row.positionTitle,
                formatDateDisplay(row.date),
                row.startTime || '-',
                row.endTime || '-'
            ]);
        });

        worksheet.columns.forEach(column => {
            let maxLength = 0;
            if (column && typeof column.eachCell === 'function') {
                column.eachCell({ includeEmpty: true }, cell => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) maxLength = columnLength;
                });
            }
            column.width = Math.min(Math.max(maxLength + 2, 15), 50);
        });

        addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, columns.length);

        const fileName = isFiltered ? 'Filtrelenmis_Yoklamalar.xlsx' : 'Tum_Yoklamalar.xlsx';
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        });
        setLoadingData(false);
    };

    // ⚠️ توابع جدید برای مدیریت مودال دانلود فیلتر شده و دانلود همه
    const handleOpenDownloadAllModal = () => { setOpenDownloadAllModal(true); };
    const handleCloseDownloadAllModal = () => { setOpenDownloadAllModal(false); };

    const handleOpenDownloadFilteredModal = () => { setOpenDownloadFilteredModal(true); };
    const handleCloseDownloadFilteredModal = () => { setOpenDownloadFilteredModal(false); };

    const handleDownloadAll = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedRollCalls : rollCallsList;

        if (format === 'pdf') {
            exportRollCallsToPdf(dataToDownload, isFiltered);
        } else {
            exportRollCallsToExcel(dataToDownload, isFiltered);
        }
        // بسته شدن مودال صحیح بر اساس وضعیت فیلتر
        if (isFiltered) {
            handleCloseDownloadFilteredModal();
        } else {
            handleCloseDownloadAllModal();
        }
    };
    // توابع دانلود یک ردیف
    const handleOpenRowDownloadModal = (_rollCall: RollCallType) => {
        // setSelectedRollCallForDownload(rollCall);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleCloseRowDownloadModal = () => {
        setOpenRowDownloadModal(false);
        // setSelectedRollCallForDownload(null);
    };


    return (
        <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h5" mb={3}>Bugün İçin Yoklama Onayı ({formatDateDisplay(new Date().toISOString())})</Typography>
                <TableContainer>
                    {loadingData && personnelWorkPlaces.length === 0 ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="150px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Personel listesi yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table size="small">
                            <TableHead sx={{ background: theme.palette.grey[200] }}>
                                <TableRow>
                                    <StyledTableCell sx={{ width: '35%' }}>Personel (Şantiye)</StyledTableCell>
                                    <StyledTableCell sx={{ width: '15%' }}>Tarih</StyledTableCell>
                                    <StyledTableCell sx={{ width: '20%' }}>Başlangıç Saati</StyledTableCell>
                                    <StyledTableCell sx={{ width: '20%' }}>Bitiş Saati</StyledTableCell>
                                    <StyledTableCell sx={{ width: '10%' }}>Eylem</StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {personnelWorkPlaces.length > 0 ? (
                                    personnelWorkPlaces.map((row) => {
                                        const isRegistered = row.hasRollCallToday;
                                        const isLoading = isDailyRegisterLoading[row.id];

                                        return (
                                            <TableRow
                                                key={row.id}
                                                sx={{
                                                    transition: 'background-color 0.3s ease',
                                                    backgroundColor: isRegistered ? theme.palette.success.light + '33' : 'inherit'
                                                }}
                                            >
                                                <StyledTableCell>
                                                    <Typography variant="body1" fontWeight={isRegistered ? 'bold' : 'normal'}>
                                                        {row.personnelName}

                                                    </Typography>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Typography variant="body2">{formatDateDisplay(new Date().toISOString())}</Typography>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                                        <TimePicker
                                                            value={dailyTimes[row.id]?.startTime || defaultStartTime}
                                                            onChange={(v) => handleDailyTimeChange(row.id, 'startTime', v)}
                                                            renderInput={(params) => <TextField {...params} size="small" />}
                                                            ampm={false} views={['hours', 'minutes']}
                                                            disabled={isRegistered || !hasCreatePermission}
                                                        />
                                                    </LocalizationProvider>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                                        <TimePicker
                                                            value={dailyTimes[row.id]?.endTime || defaultEndTime}
                                                            onChange={(v) => handleDailyTimeChange(row.id, 'endTime', v)}
                                                            renderInput={(params) => <TextField {...params} size="small" />}
                                                            ampm={false} views={['hours', 'minutes']}
                                                            disabled={isRegistered || !hasCreatePermission}
                                                        />
                                                    </LocalizationProvider>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <CustomTooltip title={isRegistered ? "Bugün için zaten kayıtlı" : "Yoklamayı onayla"}>
                                                        <Button
                                                            variant="contained"
                                                            color={isRegistered ? 'success' : 'primary'}
                                                            onClick={() => handleDailyRollCall(row)}
                                                            disabled={isRegistered || isLoading || !hasCreatePermission}
                                                            startIcon={isRegistered ? <IconCheck size={18} /> : null}
                                                        >
                                                            {isLoading ? <CircularProgress size={20} color="inherit" /> : (isRegistered ? 'Onaylandı' : 'Onayla')}
                                                        </Button>
                                                    </CustomTooltip>
                                                </StyledTableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow><StyledTableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Şantiye işyeri kaydı bulunamadı veya yetkiniz yok.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
            </Paper>


            {/* ========================================================================= */}
            {/* B. سوابق حضور (LIST TABLE) و فیلترها */}
            {/* ========================================================================= */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4">Yoklama Kayıt Geçmişi</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenDownloadAllModal}
                        startIcon={<IconFileDownload />}
                        disabled={loadingData || !hasDownloadPermission}
                    >
                        Tümünü İndir
                    </Button>

                    {/* ⚠️ نمایش شرطی دکمه فیلتر شده */}
                    {searchTerm.trim() !== '' && hasDownloadPermission && (
                        <Button
                            variant="contained"
                            color="info"
                            onClick={handleOpenDownloadFilteredModal}
                            startIcon={<IconFileDownload />}
                            disabled={loadingData || displayedRollCalls.length === 0}
                        >
                            Filtrelenmiş İndir ({displayedRollCalls.length})
                        </Button>
                    )}
                </Stack>
            </Stack>

            <BlankCard>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Personel, Pozisyon veya Şantiye Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        {/* <Grid item xs={12} sm={6} md={4}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
                                <StyledToggleButton value="all" aria-label="all records">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active records">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive records">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid> */}
                    </Grid>
                </Box>
                <>

                    {alertMessage && (
                        <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                            <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                        </Stack>
                    )}
                </>
                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Kayıtlar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="roll call table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'personnelName'} direction={orderBy === 'personnelName' ? order : 'asc'} onClick={() => handleRequestSort('personnelName')}>Personel</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>Pozisyon</StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'date'} direction={orderBy === 'date' ? order : 'asc'} onClick={() => handleRequestSort('date')}>Tarih</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>Başlangıç</StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>Bitiş</StyledTableCell>
                                    {/* <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')}>Oluşturulma Tarihi</TableSortLabel>
                                    </StyledTableCell> */}
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRollCalls.length > 0 ? (
                                    paginatedRollCalls.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <StyledTableCell><Typography variant="body1">{row.personnelName}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.positionTitle || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.date)}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.startTime || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.endTime || '-'}</Typography></StyledTableCell>
                                            {/* <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography></StyledTableCell> */}
                                            <StyledTableCell>
                                                <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                    <IconDots width={18} />
                                                </IconButton>
                                                <Menu
                                                    anchorEl={anchorEl}
                                                    open={openMenu && selectedRowForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                >
                                                    {hasEditPermission && (
                                                        <MuiMenuItem onClick={handleOpenEditModal}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu Satırı İndir</MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><StyledTableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç yoklama kaydı bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={displayedRollCalls.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            {/* Modal for Edit Record (ویرایش سوابق) */}
            <Dialog open={openEditModal} onClose={handleCloseEditModal} maxWidth="xs">
                <DialogTitle>
                    Kayıt Düzenle: {itemToEdit?.personnelName} ({formatDateDisplay(itemToEdit?.date)})
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                        Yalnızca Başlangıç ve Bitiş saatleri değiştirilebilir.
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <CustomFormLabel htmlFor="start-time" required>Başlangıç Saati</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                <TimePicker
                                    label="Başlangıç"
                                    value={selectedStartTime}
                                    onChange={(newValue) => { setSelectedStartTime(newValue); setEditValidationErrors(false); }}
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth error={editValidationErrors} />}
                                    ampm={false} views={['hours', 'minutes']}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={6}>
                            <CustomFormLabel htmlFor="end-time" required>Bitiş Saati</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                <TimePicker
                                    label="Bitiş"
                                    value={selectedEndTime}
                                    onChange={(newValue) => { setSelectedEndTime(newValue); setEditValidationErrors(false); }}
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth error={editValidationErrors} />}
                                    ampm={false} views={['hours', 'minutes']}
                                />
                            </LocalizationProvider>
                        </Grid>
                        {editValidationErrors && (
                            <Grid item xs={12}>
                                <Typography color="error" variant="caption">Lütfen saatleri kontrol edin. Bitiş saati başlangıçtan sonra olmalıdır.</Typography>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditModal} color="secondary">İptal Et</Button>
                    <Button onClick={editRollCall} color="info" disabled={loadingButton}>
                        {loadingButton ? 'Güncelleniyor...' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ⚠️ Modal 1: دانلود تمام سوابق */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">Toplam Kayıt Sayısı: {rollCallsList.length}</Typography>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('pdf', false)}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('excel', false)}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* ⚠️ Modal 2: دانلود سوابق فیلتر شده */}
            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">Filtrelenmiş Kayıt Sayısı: {displayedRollCalls.length}</Typography>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('pdf', true)}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('excel', true)}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadFilteredModal} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Modal for downloading a single row */}
            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Satır İndirme Seçeneği</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('pdf', false)}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('excel', false)}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <DeleteRollCalls
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                itemToDelete={itemToDelete}
                showAlert={showAlert}
                onDeleteSuccess={fetchRollCalls}
            />
        </>
    );
};

export default ListRollCalls;