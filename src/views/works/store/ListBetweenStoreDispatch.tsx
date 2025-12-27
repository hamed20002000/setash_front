// import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
// import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
// import {
//     TableContainer, Table, TableHead, TableRow, TableBody,
//     TableCell as MuiTableCell,
//     MenuItem as MuiMenuItem,
//     Typography, Menu, IconButton, ListItemIcon, Box,
//     Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
//     CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
//     Chip, Autocomplete,
//     Dialog,
//     DialogTitle,
//     DialogContent,
//     FormControl,
//     RadioGroup,
//     FormControlLabel,
//     Radio,
//     DialogActions,
//     DialogContentText
// } from '@mui/material';
// import { keyframes, styled } from '@mui/material/styles';
// import {
//     IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
//     IconArrowRight, IconEye, IconX, IconReload, IconPlus,
//     IconFileSpreadsheet,
//     IconFileText,
//     IconRefresh
// } from '@tabler/icons-react';
// import BoltIcon from '@mui/icons-material/Bolt';
// import BlankCard from 'src/components/shared/BlankCard';
// import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
// import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
// import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
// import axios from 'axios';
// import server from 'src/assets/address.json';
// import { useAuth } from 'src/context/AuthContext';
// import { tr } from 'date-fns/locale';
// import { format } from 'date-fns';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import Excel from 'exceljs';
// import { saveAs } from 'file-saver';
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import Logo from 'src/assets/images/logos/logo.png';
// import DeleteBetweenStoreDispatch from "./DeleteBetweenStoreDispatch";
// import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";


// const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
//     fontFamily: 'NotoSans',
//     fontSize: '0.8rem',
//     [theme.breakpoints.up('md')]: {
//         fontSize: '1rem',
//     },
// }));

// // === Type Definitions ===
// interface DispatchDetailType {
//     id: string;
//     itemId: number;
//     quantity: number;
//     description: string;
//     item?: {
//         id: string;
//         name: string;
//         abbreviation: string;
//         unit?: {
//             id: string;
//             title: string;
//         };
//     };
// }

// interface BetweenStoreDispatchType {
//     id: string;
//     code: string;
//     docDate: string;
//     description: string,
//     createAt: string;
//     recordStatus: number;
//     status: string;
//     statusDescription: string | null;
//     store?: {
//         id: string;
//         name: string;
//     };
//     destinationStore?: {
//         id: string;
//         name: string;
//     };
//     driver?: {
//         id: string;
//         name: string;
//         family: string;
//     };
//     driverVehicle?: {
//         id: string;
//         name: string;
//         plaque: string;
//     };
//     storeDispatchDetails: DispatchDetailType[];
//     statusText?: string;
//     statusColor?: 'success' | 'error' | 'warning' | 'info';
// }

// interface NewDispatchData {
//     docDate: string;
//     description: string,
//     storeId: number;
//     driverId: number;
//     driverVehicleId: number;
//     destinationStoreId: number;
//     dispatchDetails: {
//         itemId: number;
//         quantity: number;
//         description: string;
//     }[];
// }

// interface EditDispatchData extends NewDispatchData {
//     id: number;
//     code: string;
// }

// interface DriverType {
//     id: number;
//     name: string;
//     family: string;
//     recordStatus?: number;
// }
// interface StoreType {
//     id: number;
//     name: string;
//     recordStatus?: number;
// }

// interface ItemType {
//     id: string;
//     name: string;
//     abbreviation: string;
//     unit?: {
//         id: string;
//         title: string;
//     };
//     recordStatus?: number;
// }

// interface FormDispatchDetail {
//     itemId: number | null;
//     quantity: number | string;
//     description: string;
//     item?: ItemType;
//     balance?: number;
//     unit?: {
//         id: string;
//         title: string;
//     };
// }

// interface ItemBalanceType {
//     itemId: string;
//     code: string | null;
//     name: string;
//     balance: string;
//     unit: {
//         id: string;
//         title: string;
//     };
// }

// interface ApiResponse<T> {
//     success: boolean;
//     httpStatusCode: number;
//     message: string;
//     data: T;
// }

// interface VehicleType {
//     id: number;
//     name: string;
//     model: string;
//     plaque: string;
//     recordStatus: number;
//     createAt: string;
// }

// interface ApiResponseVehicleType {
//     id: string;
//     name: string;
//     model: number;
//     plaque: string;
//     recordStatus: number;
//     createAt: string;
// }

// const formatDateDisplay = (dateString: string | null): string => {
//     if (!dateString) return "N/A";
//     try {
//         const date = new Date(dateString);
//         return format(date, 'dd MMMM yyyy', { locale: tr });
//     } catch (e) {
//         return "Geçersiz Tarih";
//     }
// };

// // --- Helper: محاسبه جمع‌ها بر اساس واحد ---
// const calculateDispatchSummaries = (details: any[]) => {
//     const summary: Record<string, number> = {};
//     details.forEach(d => {
//         const unitTitle = d.item?.unit?.title || "Diğer";
//         const qty = Number(d.quantity) || 0;
//         summary[unitTitle] = (summary[unitTitle] || 0) + qty;
//     });
//     return summary;
// };

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
// const blinkAnimation = keyframes`
//     0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
//     50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
//     100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
// `;
// const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
//     animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
//     transition: 'transform 0.3s ease-in-out',
// }));


// // PDF helpers
// const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const docAny = doc as any;
//     docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//     docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//     doc.setFont('NotoSans');

//     docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
//     doc.setFontSize(14);
//     doc.text(title, pageWidth / 2, 35, { align: 'center' });

//     doc.setFontSize(10);
//     doc.text(`Rapor Tarihi:`, 15, 45);
//     doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 45);
//     if (subtitle) {
//         doc.text(subtitle, 75, 50);
//     }
// };
// const addPdfFooter = (doc: jsPDF) => {
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
//     companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
//     doc.setFontSize(10);
//     doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//     doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//     const docAny = doc as any;
//     const pageCount = docAny.internal.getNumberOfPages();
//     doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
// };

// const exportDispatchesToPdf = (data: BetweenStoreDispatchType[], title: string, subtitle?: string) => {
//     if (!data || data.length === 0) {
//         // showAlert is not available here directly, console log instead or handle in component
//         console.warn('PDF oluşturulacak sevk belgesi bulunamadı.');
//         return;
//     }

//     const doc = new jsPDF();
//     const docAny = doc as any;
//     let yPos = 55;

//     docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//     docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//     doc.setFont('NotoSans');

//     data.forEach((dispatch, index) => {
//         if (index > 0) {
//             doc.addPage();
//             yPos = 55;
//         }

//         addPdfHeader(doc, title, subtitle);

//         doc.setFontSize(10);
//         doc.text(`Kaynak Şantiyenin Depo: ${dispatch.store?.name || '-'}`, 15, yPos);
//         yPos += 7;
//         doc.text(`Hedef Şantiyenin Depo: ${dispatch.destinationStore?.name || '-'}`, 15, yPos);
//         yPos += 7;
//         doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos);
//         yPos += 7;
//         doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || '-'})`, 15, yPos);
//         yPos += 7;
//         doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos);
//         yPos += 15;

//         doc.text(`Genel Açıklama: ${dispatch.description || '-'}`, 15, yPos);
//         yPos += 22;

//         const detailsRows = (dispatch.storeDispatchDetails || []).map(d => [
//             d.item?.name || '-',
//             Number(d.quantity).toLocaleString('tr-TR'),
//             d.item?.unit?.title || '-',
//             d.description || '-'
//         ]);

//         // محاسبه جمع‌ها برای فوتر
//         const summaries = calculateDispatchSummaries(dispatch.storeDispatchDetails || []);
//         const summaryRows = Object.entries(summaries).map(([unit, total]) => [
//             "TOPLAM:",
//             total.toLocaleString('tr-TR'),
//             unit,
//             ""
//         ]);

//         autoTable(docAny, {
//             startY: yPos,
//             head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
//             body: detailsRows,
//             foot: summaryRows, // ✅ فوتر جمع‌ها
//             theme: 'grid',
//             styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
//             headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//             footStyles: { font: 'NotoSans', fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
//             didDrawPage: () => {
//                 addPdfHeader(doc, title, subtitle);
//                 addPdfFooter(doc);
//             }
//         });

//         yPos = (docAny.lastAutoTable.finalY || yPos) + 10;
//     });

//     doc.save(`${title.replace(/ /g, '_')}.pdf`);
// };

// const addExcelHeader = (ws: Excel.Worksheet, title: string, columnsLength: number) => {
//     ws.views = [{ rightToLeft: false }];
//     const titleRow = ws.addRow([title]);
//     titleRow.font = { name: 'NotoSans', size: 14, bold: true };
//     ws.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
//     titleRow.getCell(1).alignment = { horizontal: 'center' };
//     const dateRow = ws.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
//     dateRow.font = { name: 'NotoSans', size: 10, bold: false };
//     dateRow.getCell(1).alignment = { horizontal: 'left' };
//     ws.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);
//     ws.addRow([]);
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

// const exportDispatchesToExcel = (data: BetweenStoreDispatchType[], title: string) => {
//     if (!data || data.length === 0) {
//         console.warn('Excel oluşturulacak sevk belgesi bulunamadı.');
//         return;
//     }

//     const workbook = new Excel.Workbook();

//     data.forEach(dispatch => {
//         const worksheetTitle = `Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_').substring(0, 30);
//         const worksheet = workbook.addWorksheet(worksheetTitle);

//         const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
//         const totalColumns = detailsColumns.length;

//         addExcelHeader(worksheet, title, totalColumns);

//         // افزودن جزئیات سند به ورک‌شیت
//         worksheet.addRow([`Sevk Belgesi Kodu:`, dispatch.code]);
//         worksheet.addRow([`Kaynak Şantiyenin Depo:`, dispatch.store?.name || '-']);
//         worksheet.addRow([`Hedef Şantiyenin Depo:`, dispatch.destinationStore?.name || '-']);
//         worksheet.addRow([`Şoför:`, `${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`]);
//         worksheet.addRow([`Araç:`, `${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`]);
//         worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);

//         worksheet.addRow([`Açıklama:`, dispatch.description || '-']);
//         worksheet.addRow([]);

//         const headerRow = worksheet.addRow(detailsColumns);
//         headerRow.font = { name: 'NotoSans', bold: true };
//         headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

//         (dispatch.storeDispatchDetails || []).forEach(d => {
//             worksheet.addRow([
//                 d.item?.name || '-',
//                 Number(d.quantity),
//                 d.item?.unit?.title || '-',
//                 d.description || '-'
//             ]);
//         });

//         // ✅ بخش خلاصه جمع‌ها در اکسل
//         worksheet.addRow([]);
//         const summaryTitle = worksheet.addRow(["Birim Bazlı Toplamlar"]);
//         summaryTitle.font = { bold: true, underline: true };

//         const summaries = calculateDispatchSummaries(dispatch.storeDispatchDetails || []);
//         Object.entries(summaries).forEach(([unit, total]) => {
//             const r = worksheet.addRow(["TOPLAM:", total, unit]);
//             r.getCell(1).font = { bold: true };
//             r.getCell(1).alignment = { horizontal: 'right' };
//             r.getCell(2).font = { bold: true };
//         });

//         worksheet.addRow([]);
//         addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);

//         // تنظیم عرض ستون‌ها
//         worksheet.getColumn(1).width = 30;
//         worksheet.getColumn(2).width = 15;
//         worksheet.getColumn(3).width = 15;
//         worksheet.getColumn(4).width = 40;
//     });

//     const fileName = `${title.replace(/ /g, '_')}.xlsx`;
//     workbook.xlsx.writeBuffer().then(buffer => {
//         saveAs(new Blob([buffer]), fileName);
//     });
// };


// const ListBetweenStoreDispatch = () => {
//     const { storeId } = useParams<{ storeId: string }>();
//     const navigate = useNavigate();
//     const authToken = localStorage.getItem('authToken');


//     const [searchParams, setSearchParams] = useSearchParams();
//     const location = useLocation();
//     const idsFromState =
//         ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
//     const idsFromSingleParam = (searchParams.get('ids') ?? '')
//         .split(',')
//         .map(s => s.trim())
//         .filter(Boolean);
//     const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
//     const notifIds: number[] = (idsFromState.length ? idsFromState :
//         (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
//         .map(id => Number(id))
//         .filter(id => Number.isFinite(id));
//     const hasIdsFilter = notifIds.length > 0;
//     const idsSet = new Set<number>(notifIds);


//     const nameInputRef = useRef<HTMLInputElement>(null);

//     // === State Variables ===
//     const [docDate, setDocDate] = useState<Date | null>(new Date());
//     const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
//     const [selectedDestinationStoreId, setSelectedDestinationStoreId] = useState<number | null>(null);
//     const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

//     const [dispatchDetails, setDispatchDetails] = useState<FormDispatchDetail[]>([]);
//     const [dispatchList, setDispatchList] = useState<BetweenStoreDispatchType[]>([]);
//     const [displayedDispatches, setDisplayedDispatches] = useState<BetweenStoreDispatchType[]>([]);
//     const [loadingData, setLoadingData] = useState(true);
//     const [loadingButton, setLoadingButton] = useState(false);
//     const [isFormValid, setIsFormValid] = useState(false);

//     const [alertMessage, setAlertMessage] = useState<string | null>(null);
//     const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(5);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

//     const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//     const [selectedRowForMenu, setSelectedRowForMenu] = useState<BetweenStoreDispatchType | null>(null);

//     const [editingId, setEditingId] = useState<string | null>(null);
//     const [editingCode, setEditingCode] = useState<string | null>(null);

//     const [docDateError, setDocDateError] = useState<boolean>(false);
//     const [driverIdError, setDriverIdError] = useState<boolean>(false);
//     const [destinationStoreIdError, setDestinationStoreIdError] = useState<boolean>(false);
//     const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

//     const [drivers, setDrivers] = useState<DriverType[]>([]);
//     const [stores, setStores] = useState<StoreType[]>([]);
//     const [storeItems, setStoreItems] = useState<ItemBalanceType[]>([]);

//     const [openDeleteModal, setOpenDeleteModal] = useState(false);
//     const [dispatchIdToDelete, setDispatchIdToDelete] = useState<string | null>(null);
//     const [dispatchCodeToDelete, setDispatchCodeToDelete] = useState<string>('');

//     const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
//     const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
//     const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);
//     const [openVehicleModal, setOpenVehicleModal] = useState(false);
//     const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);

//     // 🔄 تغییر State مودال به کل آبجکت برای نمایش در مودال جزئیات
//     const [openDetailsModal, setOpenDetailsModal] = useState(false);
//     const [viewedDispatch, setViewedDispatch] = useState<BetweenStoreDispatchType | null>(null);

//     const [isFilterActive, setIsFilterActive] = useState(false);
//     const [startDate, setStartDate] = useState<Date | null>(null);
//     const [endDate, setEndDate] = useState<Date | null>(null);
//     const [generalDescription, setGeneralDescription] = useState('');

//     const [removedDispatchDetails, setRemovedDispatchDetails] = useState<any[]>([]);
//     const [isFormVisible, setIsFormVisible] = useState(false);
//     const [isBlinking, setIsBlinking] = useState(true);

//     const { isTooltipGloballyEnabled } = useTooltip();
//     const { allowedOperations } = useAuth();

//     const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
//     const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

//     // Download modals
//     const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
//     const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
//     const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
//     const [selectedDispatchForDownload, setSelectedDispatchForDownload] = useState<BetweenStoreDispatchType | null>(null);

//     const [initialDispatchDetails, setInitialDispatchDetails] = useState<FormDispatchDetail[]>([]);

//     const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
//     const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
//     const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
//     const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

//     // === Form Handlers ===
//     const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//         setAlertMessage(message);
//         setAlertSeverity(severity);
//         setTimeout(() => { setAlertMessage(null); }, 5000);
//     }, []);


//     const handleClearDateFilters = () => {
//         setStartDate(null);
//         setEndDate(null);
//     };


//     const fetchVehicles = useCallback(async (driverId: string) => {
//         setLoadingData(true);
//         if (!authToken) {
//             showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
//             setLoadingData(false);
//             return;
//         }

//         try {
//             const response = await axios.get(
//                 `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${driverId}`, {
//                 headers: { Authorization: `Bearer ${authToken}` }
//             });

//             if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
//                 const formattedData: VehicleType[] = response.data.data.map((item: ApiResponseVehicleType) => ({
//                     ...item,
//                     model: String(item.model),
//                     id: Number(item.id)
//                 }));
//                 const activeVehicles = formattedData.filter(item => item.recordStatus === 0);
//                 setVehiclesList(activeVehicles);

//                 if (activeVehicles.length > 1) {
//                     setOpenVehicleModal(true);
//                     setTempSelectedVehicle(activeVehicles[0].id);
//                 } else if (activeVehicles.length === 1) {
//                     setSelectedVehicleId(activeVehicles[0].id);
//                     setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
//                 } else {
//                     setSelectedVehicleId(null);
//                     setSelectedVehicleName(null);
//                 }
//             } else {
//                 setVehiclesList([]);
//                 setSelectedVehicle(null);
//                 setSelectedVehicleName(null);
//                 showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
//             else if (e.response?.status === 401) {
//                 localStorage.removeItem('authToken');
//                 showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
//             }
//             else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingData(false);
//         }
//     }, [showAlert, authToken, navigate]);

//     // ✨ NEW: fetch all store items balance
//     const fetchStoreItems = useCallback(async () => {
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.get<ApiResponse<ItemBalanceType[]>>(
//                 `${server.baseurl}${server.warehouse}get-store-all-items-balance/${Number(storeId)}`,
//                 { headers: { Authorization: `Bearer ${authToken}` } }
//             );
//             if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
//                 setStoreItems(response.data.data);
//             } else {
//                 setStoreItems([]);
//             }
//         } catch (e: any) {
//             if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
//             else if (e.response?.status === 401) {
//                 localStorage.removeItem('authToken');
//                 showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
//             }
//             else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//         }
//     }, [navigate, storeId, showAlert, authToken]);

//     // API Calls
//     const fetchInitialData = useCallback(async () => {
//         setLoadingData(true);
//         if (!authToken) {
//             navigate("/");
//             setLoadingData(false);
//             return;
//         }

//         try {
//             const [driversRes, storesRes, betweenDispatchesRes] = await Promise.all([
//                 axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
//                 axios.get<ApiResponse<StoreType[]>>(server.baseurl + server.initialoperations + "get-stores", { headers: { "Authorization": `Bearer ${authToken}` } }),
//                 axios.get<ApiResponse<BetweenStoreDispatchType[]>>(server.baseurl + server.warehouse + `get-between-store-dispatches/${Number(storeId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
//             ]);

//             setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
//             setStores(storesRes.data?.data?.filter(w => w.recordStatus === 0).map(w => ({ ...w, id: Number(w.id) })) || []);

//             if (betweenDispatchesRes.data?.httpStatusCode === 200) {
//                 const allDispatches = betweenDispatchesRes.data.data;
//                 const formattedDispatches = allDispatches.map(d => ({
//                     ...d,
//                     status: d.recordStatus === 0 ? 'Aktif' : 'Pasif'
//                 }));
//                 setDispatchList(formattedDispatches);
//             } else {
//                 showAlert(betweenDispatchesRes.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
//             else if (e.response?.status === 401) {
//                 localStorage.removeItem('authToken');
//                 showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
//             }
//             else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingData(false);
//         }
//     }, [navigate, storeId, showAlert, authToken]);

//     useEffect(() => {
//         fetchInitialData();
//         fetchStoreItems();
//     }, [fetchInitialData, fetchStoreItems]);

//     useEffect(() => {
//         let filteredDispatches = dispatchList.filter(d => {
//             const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
//                 (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
//                 (d.destinationStore?.name && d.destinationStore.name.toLowerCase().includes(searchTerm.toLowerCase()));

//             const matchesStatus = statusFilter === 'all' ||
//                 (statusFilter === 'active' && d.recordStatus === 0) ||
//                 (statusFilter === 'inactive' && d.recordStatus === 1);

//             const docDate = new Date(d.docDate);
//             const startCheck = !startDate || docDate >= startDate;
//             const endCheck = !endDate || docDate <= endDate;


//             const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(d.id));

//             return matchesSearch && matchesStatus && startCheck && endCheck && matchesNotifIds;
//         });
//         setDisplayedDispatches(filteredDispatches);
//         setPage(0);
//     }, [dispatchList, searchTerm, statusFilter, startDate, endDate, notifIds]);

//     useEffect(() => {
//         const isValid = !!selectedDriverId && !!selectedDestinationStoreId &&
//             !!docDate && dispatchDetails.length > 0 &&
//             dispatchDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
//         setIsFormValid(isValid);
//     }, [selectedDriverId, selectedDestinationStoreId, docDate, dispatchDetails]);

//     useEffect(() => {
//         const hasSearch = searchTerm.trim() !== '';
//         const hasStatusFilter = statusFilter !== 'all';
//         const hasDateFilter = startDate !== null || endDate !== null;
//         setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
//     }, [searchTerm, statusFilter, startDate, endDate]);

//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setIsBlinking(false);
//         }, 5000);
//         return () => {
//             clearTimeout(timer);
//         };
//     }, []);

//     const validateForm = (): boolean => {
//         let isValid = true;

//         // 1. اعتبارسنجی فیلدهای اصلی (راننده، انبار مقصد، تاریخ)
//         if (!selectedDriverId) {
//             setDriverIdError(true);
//             isValid = false;
//         } else {
//             setDriverIdError(false);
//         }

//         if (!selectedDestinationStoreId) {
//             setDestinationStoreIdError(true);
//             isValid = false;
//         } else {
//             setDestinationStoreIdError(false);
//         }

//         if (!docDate) {
//             setDocDateError(true);
//             isValid = false;
//         } else {
//             setDocDateError(false);
//         }

//         // 2. اعتبارسنجی جزئیات سند (آیتم‌ها و مقادیر)
//         if (dispatchDetails.length === 0) {
//             setDispatchDetailsError(true);
//             isValid = false;
//         } else {
//             const isDetailsValid = dispatchDetails.every((detail, index) => {
//                 const numQuantity = Number(detail.quantity);

//                 // بررسی مقدار نامعتبر یا صفر
//                 if (isNaN(numQuantity) || numQuantity <= 0) {
//                     return false;
//                 }

//                 // پیدا کردن آیتم متناظر در موجودی انبار
//                 const currentItemBalance = storeItems.find(item => Number(item.itemId) === Number(detail.itemId));
//                 const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;

//                 let maxAllowedQuantity = currentStockBalance;

//                 // اگر در حالت ویرایش هستیم، مقدار اصلی آیتم را به موجودی اضافه می‌کنیم.
//                 if (editingId) {
//                     const initialDetail = initialDispatchDetails[index];
//                     if (initialDetail && Number(initialDetail.itemId) === Number(detail.itemId)) {
//                         const initialQuantity = Number(initialDetail.quantity);
//                         maxAllowedQuantity += initialQuantity;
//                     }
//                 }

//                 // بررسی تجاوز مقدار وارد شده از حداکثر مقدار مجاز
//                 if (numQuantity > maxAllowedQuantity) {
//                     return false;
//                 }

//                 return true;
//             });

//             if (!isDetailsValid) {
//                 setDispatchDetailsError(true);
//                 isValid = false;
//             } else {
//                 setDispatchDetailsError(false);
//             }
//         }

//         // 3. نمایش یک هشدار کلی در صورت وجود خطا
//         if (!isValid) {
//             showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
//         }

//         return isValid;
//     };

//     const resetFormAndState = () => {
//         setDocDate(new Date());
//         setGeneralDescription('');
//         setSelectedDriverId(null);
//         setSelectedDestinationStoreId(null);
//         setDispatchDetails([]);
//         setIsFormVisible(false);
//         setEditingId(null);
//         setDocDateError(false);
//         setDriverIdError(false);
//         setDestinationStoreIdError(false);
//         setDispatchDetailsError(false);
//         setSelectedVehicleId(null);
//         setSelectedVehicleName(null);
//         setRemovedDispatchDetails([]);
//     };

//     // === API Actions ===
//     const insertDispatch = async () => {
//         if (!validateForm()) return;
//         setLoadingButton(true);
//         if (!authToken) { navigate("/"); return; }

//         const payload: NewDispatchData = {
//             docDate: docDate?.toISOString() || new Date().toISOString(),
//             description: generalDescription,
//             storeId: Number(storeId),
//             driverId: Number(selectedDriverId),
//             driverVehicleId: Number(selectedVehicleId),
//             destinationStoreId: Number(selectedDestinationStoreId),
//             dispatchDetails: dispatchDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description }))
//         };
//         try {
//             const response = await axios.post(server.baseurl + server.warehouse + "create-between-store-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
//             if (response.data.httpStatusCode === 201) {
//                 showAlert('Yeni sevk belgesi başarıyla eklendi!', 'success');
//                 resetFormAndState();
//                 fetchInitialData();
//             } else {
//                 showAlert(response.data.message || 'Sevk belgesi eklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
//             else if (e.response?.status === 401) {
//                 localStorage.removeItem('authToken');
//                 showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
//             }
//             else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const editDispatch = async () => {
//         if (!validateForm() || !editingId) return;
//         setLoadingButton(true);
//         if (!authToken) { navigate("/"); return; }
//         const payload: EditDispatchData = {
//             id: Number(editingId),
//             code: editingCode!,
//             docDate: docDate?.toISOString() || new Date().toISOString(),
//             description: generalDescription,
//             storeId: Number(storeId),
//             driverId: Number(selectedDriverId),
//             driverVehicleId: Number(selectedVehicleId),
//             destinationStoreId: Number(selectedDestinationStoreId),
//             dispatchDetails: dispatchDetails.map(d => ({
//                 itemId: Number(d.itemId),
//                 quantity: Number(d.quantity),
//                 description: d.description
//             }))
//         };
//         try {
//             const response = await axios.put(server.baseurl + server.warehouse + "update-between-store-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
//             if (response.data.httpStatusCode === 200) {
//                 showAlert('Sevk belgesi başarıyla güncellendi!', 'success');
//                 resetFormAndState();
//                 fetchInitialData();
//             } else {
//                 showAlert(response.data.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response && e.response.status === 500) {
//                 showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

//             } else if (e.response && e.response.status === 401) {
//                 localStorage.removeItem('authToken');
//                 showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
//                 navigate("/");
//             } else {
//                 showAlert(e.response?.data?.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');

//             }
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const handleCloseMenu = () => {
//         setAnchorEl(null);
//         setSelectedRowForMenu(null);
//     };

//     const handleEditClick = async () => {
//         if (selectedRowForMenu) {
//             setLoadingData(true);
//             await fetchStoreItems(); // ابتدا موجودی‌های فعلی را بارگذاری کنید

//             const formattedDetails = (selectedRowForMenu.storeDispatchDetails || []).map(d => {
//                 const itemBalance = storeItems.find(item => Number(item.itemId) === Number(d.item?.id));
//                 return {
//                     itemId: Number(d.item?.id),
//                     quantity: d.quantity,
//                     description: d.description,
//                     item: d.item,
//                     balance: itemBalance ? Number(itemBalance.balance) : 0,
//                     unit: d.item?.unit ? { id: d.item.unit.id || d.item.id, title: d.item.unit.title } : undefined,
//                 };
//             });

//             setDispatchDetails(formattedDetails);
//             setInitialDispatchDetails(formattedDetails); // مقادیر اصلی را برای اعتبارسنجی ذخیره کنید

//             // بقیه کد ویرایش...
//             setEditingId(selectedRowForMenu.id);
//             setEditingCode(selectedRowForMenu.code);
//             setDocDate(new Date(selectedRowForMenu.docDate));
//             setGeneralDescription(selectedRowForMenu.description || '');
//             setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
//             setSelectedDestinationStoreId(Number(selectedRowForMenu.destinationStore?.id));
//             if (selectedRowForMenu.driverVehicle) {
//                 setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
//                 setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
//             }

//             setTimeout(() => {
//                 nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
//                 nameInputRef.current?.focus();
//             }, 100);
//             setIsFormVisible(true);
//             handleCloseMenu();
//             setLoadingData(false);
//         }
//     };

//     const handleCancelEdit = () => {
//         resetFormAndState();
//     };

//     const handleClickOpenDeleteModal = () => {
//         if (selectedRowForMenu) {
//             setDispatchIdToDelete(selectedRowForMenu.id);
//             setDispatchCodeToDelete(selectedRowForMenu.code);
//             setOpenDeleteModal(true);
//         }
//         handleCloseMenu();
//     };

//     const handleCloseDeleteModal = () => {
//         setOpenDeleteModal(false);
//         setDispatchIdToDelete(null);
//         setDispatchCodeToDelete('');
//         fetchInitialData();
//     };

//     const handleRemoveDispatchDetail = (index: number) => {
//         setDispatchDetails(prev => {
//             const removedItem = prev[index];
//             if (removedItem) {
//                 setRemovedDispatchDetails(oldRemoved => [...oldRemoved, removedItem]);
//             }
//             return prev.filter((_, i) => i !== index);
//         });
//     };

//     const handleRestoreDispatchDetail = (indexToRestore: number) => {
//         const itemToRestore = removedDispatchDetails[indexToRestore];
//         if (itemToRestore) {
//             setDispatchDetails(prev => [...prev, itemToRestore]);
//             setRemovedDispatchDetails(prev => prev.filter((_, i) => i !== indexToRestore));
//         }
//     };

//     // ✨ NEW: handle adding all store items to the form
//     const handleAddAllItemsToDispatch = () => {
//         const itemsToForm = storeItems.map(item => ({
//             itemId: Number(item.itemId),
//             quantity: Number(item.balance),
//             description: '',
//             item: {
//                 id: item.itemId,
//                 name: item.name,
//                 abbreviation: item.code || '',
//                 unit: item.unit
//             },
//             balance: Number(item.balance)
//         }));
//         setDispatchDetails(itemsToForm);
//     };

//     const handleDispatchDetailChange = useCallback((index: number, field: keyof FormDispatchDetail, value: any) => {
//         setDispatchDetails(prev => {
//             const newDetails = [...prev];
//             const updatedDetail = { ...newDetails[index] };

//             const originalDetail = initialDispatchDetails.find(d => d.itemId === updatedDetail.itemId);
//             const originalQuantity = originalDetail ? Number(originalDetail.quantity) : 0;

//             // پیدا کردن موجودی فعلی انبار
//             const currentItemBalance = storeItems.find(item => Number(item.itemId) === Number(updatedDetail.itemId));
//             const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;

//             // محاسبه حداکثر مقدار مجاز
//             const maxAllowedQuantity = currentStockBalance + originalQuantity;

//             if (field === 'quantity') {
//                 const numValue = Number(value);

//                 if (isNaN(numValue) || numValue < 0) {
//                     showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
//                     updatedDetail.quantity = 0;
//                 } else if (numValue > maxAllowedQuantity) {
//                     showAlert(`Girdiğiniz miktar stoktan fazla! Maksimum: ${maxAllowedQuantity}`, 'warning');
//                     updatedDetail.quantity = maxAllowedQuantity;
//                 } else {
//                     updatedDetail.quantity = numValue;
//                 }
//             }

//             else if (field === 'itemId') {
//                 const selectedItem = storeItems.find(item => Number(item.itemId) === Number(value));
//                 updatedDetail.itemId = value;
//                 updatedDetail.item = selectedItem ? {
//                     id: selectedItem.itemId,
//                     name: selectedItem.name,
//                     abbreviation: selectedItem.code || '',
//                     unit: selectedItem.unit
//                 } : undefined;
//                 updatedDetail.balance = selectedItem ? Number(selectedItem.balance) : 0;
//             } else {
//                 (updatedDetail as any)[field] = value;
//             }

//             newDetails[index] = updatedDetail;
//             return newDetails;
//         });
//     }, [showAlert, storeItems, initialDispatchDetails]); // Added initialDispatchDetails dependency

//     const handleEditVehicleSelection = () => {
//         if (vehiclesList.length > 1) {
//             setOpenVehicleModal(true);
//             setTempSelectedVehicle(selectedVehicle);
//         } else {
//             showAlert('Bu şoförün tek bir aracı bulunmaktadır.', 'info');
//         }
//     };


//     const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
//         const dataToDownload = isFiltered ? displayedDispatches : dispatchList;
//         const title = isFiltered ? 'Filtrelenmiş Şantiyenin Depo Arası Sevk Raporu' : 'Tüm Şantiyenin Depo Arası Sevk Raporu';
//         const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : new Date().toISOString())}` : undefined;

//         if (format === 'pdf') {
//             exportDispatchesToPdf(dataToDownload, title, subtitle);
//             showAlert('PDF başarıyla oluşturuldu.', 'success');
//         } else {
//             exportDispatchesToExcel(dataToDownload, title);
//             showAlert('Excel başarıyla oluşturuldu.', 'success');
//         }
//     };

//     const handleOpenRowDownloadModal = (dispatch: BetweenStoreDispatchType) => {
//         setSelectedDispatchForDownload(dispatch);
//         setOpenRowDownloadModal(true);
//         handleCloseMenu();
//     };

//     const handleDownloadSingleDispatch = (format: 'pdf' | 'excel') => {
//         if (!selectedDispatchForDownload) return;
//         const data = [selectedDispatchForDownload];
//         const title = `Sevk Belgesi Detayları: ${selectedDispatchForDownload.code}`;

//         if (format === 'pdf') {
//             exportDispatchesToPdf(data, title);
//             showAlert('PDF başarıyla oluşturuldu.', 'success');
//         } else {
//             exportDispatchesToExcel(data, title);
//             showAlert('Excel başarıyla oluşturuldu.', 'success');
//         }
//         setOpenRowDownloadModal(false);
//     };


//     const clearNotifFilter = () => {
//         const next = new URLSearchParams(searchParams);
//         next.delete('ids');
//         setSearchParams(next, { replace: true });

//         navigate(location.pathname, {
//             replace: true,
//             state: { ...(location.state as any), notifIds: [] },
//         });

//         setPage(0);
//     };


//     const handleOpenDescriptionModal = (descriptionContent: string) => {
//         setFullDescriptionContent(descriptionContent);
//         setOpenDescriptionModal(true);
//     };

//     const handleCloseDescriptionModal = () => {
//         setOpenDescriptionModal(false);
//         setFullDescriptionContent('');
//     };

//     return (
//         <>
//             <Box sx={{ p: 3 }}>
//                 <Stack
//                     direction={{ xs: 'column', md: 'row' }}
//                     justifyContent="space-between"
//                     alignItems={{ xs: 'stretch', md: 'center' }}
//                     mb={3}
//                     spacing={2}
//                     flexWrap="wrap"
//                 >
//                     <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
//                         Şantiyenin Depo Arası Sevk İşlemleri
//                     </Typography>

//                     <Stack
//                         direction={{ xs: 'column', sm: 'row' }}
//                         spacing={1}
//                         alignItems="stretch"
//                         flexGrow={1}
//                         justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
//                     >
//                         {!isFormVisible && hasCreatePermission && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şantiyenin Depo Arası Sevk Belgesi kaydetmek için tıklayınız" : ""}>
//                                 <BlinkingButton
//                                     variant="contained"
//                                     color="primary"
//                                     onClick={() => setIsFormVisible(true)}
//                                     isBlinking={isBlinking}
//                                     fullWidth={false}
//                                 >
//                                     Yeni Şantiyenin Depo Arası Sevk
//                                 </BlinkingButton>
//                             </CustomTooltip>
//                         )}
//                         {isFormVisible && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
//                                 <Button
//                                     variant="contained"
//                                     color="error"
//                                     onClick={resetFormAndState}
//                                     disabled={loadingButton}
//                                     fullWidth={false}
//                                     startIcon={<IconX size={20} />}
//                                 >
//                                     Gizle
//                                 </Button>
//                             </CustomTooltip>
//                         )}

//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
//                             <Button
//                                 variant="outlined"
//                                 color="error"
//                                 onClick={() => navigate(-1)}
//                                 endIcon={<IconArrowRight size={20} />}
//                                 fullWidth={false}
//                             >
//                                 Geri Dön
//                             </Button>
//                         </CustomTooltip>
//                     </Stack>
//                 </Stack>
//                 {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
//                     <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
//                         <Typography variant="h5" mb={2}>{editingId ? 'Şantiyenin Depo Sevk Belgesini Düzenle' : 'Yeni Şantiyenin Depo Sevk Belgesi'}</Typography>
//                         <Grid container spacing={2}>
//                             <Grid item xs={12} sm={4}>
//                                 <CustomFormLabel required>Şoför</CustomFormLabel>
//                                 <Autocomplete
//                                     id="driver-select"
//                                     options={drivers}
//                                     getOptionLabel={(option) => `${option.name} ${option.family}`}
//                                     value={drivers.find(d => d.id === selectedDriverId) || null}
//                                     onChange={(_, newValue) => {
//                                         setSelectedDriverId(newValue ? newValue.id : null);
//                                         if (newValue) {
//                                             fetchVehicles(String(newValue.id));
//                                         } else {
//                                             setSelectedVehicle(null);
//                                             setSelectedVehicleName(null);
//                                             setVehiclesList([]);
//                                         }
//                                         if (driverIdError && newValue) setDriverIdError(false);
//                                     }}
//                                     isOptionEqualToValue={(option, value) => option.id === value.id}
//                                     renderInput={(params) => (
//                                         <TextField
//                                             {...params}
//                                             fullWidth
//                                             size="small"
//                                             placeholder="Şoför Seçin"
//                                             error={driverIdError}
//                                             helperText={driverIdError ? "Şoför seçimi zorunludur!" : ""}
//                                         />
//                                     )}
//                                 />
//                                 {selectedVehicleName && (
//                                     <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
//                                         <Chip label={`Seçilen Araç: ${selectedVehicleName}`} color="info" />
//                                         <CustomTooltip title={isTooltipGloballyEnabled ? "Aracı değiştir" : ""}>
//                                             <IconButton onClick={handleEditVehicleSelection} size="small">
//                                                 <IconEdit size={18} />
//                                             </IconButton>
//                                         </CustomTooltip>
//                                     </Box>
//                                 )}
//                             </Grid>
//                             <Grid item xs={12} sm={4}>
//                                 <CustomFormLabel required>Hedef Şantiyenin Depo</CustomFormLabel>
//                                 <Autocomplete
//                                     id="destination-store-select"
//                                     options={stores.filter(s => Number(s.id) !== Number(storeId))}
//                                     getOptionLabel={(option) => option.name}
//                                     value={stores.find(s => s.id === selectedDestinationStoreId) || null}
//                                     onChange={(_, newValue) => {
//                                         setSelectedDestinationStoreId(newValue ? newValue.id : null);
//                                         if (destinationStoreIdError && newValue) setDestinationStoreIdError(false);
//                                     }}
//                                     isOptionEqualToValue={(option, value) => option.id === value.id}
//                                     renderInput={(params) => (
//                                         <TextField
//                                             {...params}
//                                             fullWidth
//                                             size="small"
//                                             placeholder="Hedef Şantiyenin Depo Seçin"
//                                             error={destinationStoreIdError}
//                                             helperText={destinationStoreIdError ? "Hedef Şantiyenin Depo seçimi zorunludur!" : ""}
//                                         />
//                                     )}
//                                 />
//                             </Grid>
//                             <Grid item xs={12} sm={4}>
//                                 <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
//                                 <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                     <DatePicker
//                                         label=""
//                                         value={docDate}

//                                         inputRef={nameInputRef}
//                                         onChange={(newValue) => {
//                                             setDocDate(newValue);
//                                             if (docDateError && newValue) setDocDateError(false);
//                                         }}
//                                         inputFormat="dd/MM/yyyy"
//                                         renderInput={(params) => (
//                                             <TextField
//                                                 {...params}
//                                                 fullWidth
//                                                 size="small"
//                                                 error={docDateError}
//                                                 helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""}
//                                             />
//                                         )}
//                                     />
//                                 </LocalizationProvider>
//                             </Grid>

//                             <Grid item xs={12}>
//                                 <CustomFormLabel htmlFor="invoice-general-description">Açıklama</CustomFormLabel>
//                                 <TextField
//                                     id="invoice-general-description"
//                                     label="Şantiyenin Depo Arası Sevk için genel açıklama giriniz"
//                                     type="text"
//                                     fullWidth
//                                     multiline
//                                     rows={3}
//                                     variant="outlined"
//                                     value={generalDescription}
//                                     onChange={(e) => setGeneralDescription(e.target.value)}
//                                 />
//                             </Grid>
//                         </Grid>
//                         {removedDispatchDetails.length > 0 && (
//                             <Box sx={{
//                                 border: '1px dashed',
//                                 borderColor: "error.main",
//                                 p: 2,
//                                 mb: 2,
//                                 mt: 2,
//                                 borderRadius: 1,
//                                 backgroundColor: 'rgba(255, 0, 0, 0.05)'
//                             }}>
//                                 <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler</Typography>
//                                 <Stack direction="row" spacing={1} flexWrap="wrap">
//                                     {removedDispatchDetails.map((detail, index) => (
//                                         <Chip
//                                             key={index}
//                                             label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
//                                             color="error"
//                                             onDelete={() => handleRestoreDispatchDetail(index)}
//                                             deleteIcon={<IconReload size={18} />}
//                                         />
//                                     ))}
//                                 </Stack>
//                             </Box>
//                         )}
//                         <Box mt={4}>
//                             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
//                                 <Typography variant="h6">Sevk Detayları</Typography>
//                                 <Button
//                                     variant="outlined"
//                                     onClick={handleAddAllItemsToDispatch}
//                                     startIcon={<IconPlus />}
//                                     disabled={storeItems.length === 0}
//                                 >
//                                     Tüm Ürünleri Stoktan Ekle
//                                 </Button>
//                             </Stack>
//                             <Grid container spacing={2}>
//                                 {dispatchDetails.map((detail, index) => {
//                                     const selectedItem = storeItems.find(item => Number(item.itemId) === Number(detail.itemId));
//                                     const maxQuantity = selectedItem ? Number(selectedItem.balance) : 0;
//                                     const displayBalance = selectedItem ? `(Stok: ${maxQuantity})` : '';

//                                     return (
//                                         <Grid item xs={12} key={index}>

//                                             <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">

//                                                 <Grid item xs={12} sm={4} md={4}>
//                                                     <Box sx={{ flexGrow: 1 }}>
//                                                         <Typography
//                                                             variant="body1"
//                                                             component="div"
//                                                             sx={{
//                                                                 fontWeight: 'bold',
//                                                                 fontSize: { xs: '0.9rem', md: '1rem' }
//                                                             }}
//                                                         >
//                                                             {selectedItem?.name || 'Ürün Adı Bulunamadı'}
//                                                         </Typography>
//                                                     </Box>
//                                                 </Grid>

//                                                 <Grid item xs={6} sm={3} md={3}>
//                                                     <CustomTextField
//                                                         type="number"
//                                                         label={`Miktar ${displayBalance}`}
//                                                         placeholder="Miktar"
//                                                         value={detail.quantity}
//                                                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
//                                                         fullWidth
//                                                         InputProps={{
//                                                             endAdornment: (
//                                                                 <InputAdornment position="end" >
//                                                                     {displayBalance}
//                                                                 </InputAdornment>
//                                                             ),
//                                                             inputProps: { min: 0 } // اطمینان از مقدار مثبت
//                                                         }}
//                                                         size="small"
//                                                         error={dispatchDetailsError && (Number(detail.quantity) < 0 || Number(detail.quantity) > (detail.balance || 0))}
//                                                         helperText={dispatchDetailsError && (Number(detail.quantity) < 0 || Number(detail.quantity) > (detail.balance || 0)) ? `Maks: ${detail.balance || 0}` : ""}
//                                                     />
//                                                 </Grid>

//                                                 <Grid item xs={6} sm={4} md={4}>
//                                                     <CustomTextField
//                                                         label="Açıklama"
//                                                         placeholder="Açıklama"
//                                                         value={detail.description}
//                                                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
//                                                         fullWidth
//                                                         size="small"
//                                                     />
//                                                 </Grid>
//                                                 <Grid item xs={12} sm={1} md={1} sx={{ textAlign: { xs: 'right', sm: 'center' } }}>

//                                                     <IconButton
//                                                         color="error"
//                                                         onClick={() => handleRemoveDispatchDetail(index)}
//                                                         aria-label="Sil"
//                                                         size="large"
//                                                     >
//                                                         <IconTrash />
//                                                     </IconButton>
//                                                 </Grid>
//                                             </Grid>
//                                         </Grid>
//                                     )
//                                 })}
//                             </Grid>
//                             {dispatchDetailsError && <Typography color="error" variant="caption" sx={{ mt: 1.5, ml: 1.5 }}>En az bir sevk detayı eklemek zorunludur!</Typography>}
//                         </Box>
//                         <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
//                             {editingId ? (
//                                 <>
//                                     <Button variant="contained" color="info" onClick={editDispatch} disabled={loadingButton}>
//                                         {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
//                                     </Button>
//                                     <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
//                                 </>
//                             ) : (
//                                 hasCreatePermission && (
//                                     <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak sevk belgesini kaydedin." : ""}>
//                                         <span>
//                                             <BlinkingButton
//                                                 variant="contained"
//                                                 color="success"
//                                                 onClick={insertDispatch}
//                                                 disabled={!isFormValid || loadingButton}
//                                                 isBlinking={isFormValid && !loadingButton}
//                                             >
//                                                 {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Sevk Belgesi Ekle'}
//                                             </BlinkingButton>
//                                         </span>
//                                     </CustomTooltip>
//                                 )
//                             )}
//                         </Stack>
//                     </Paper>
//                 )}

//                 {alertMessage && (
//                     <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
//                         <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
//                     </Stack>
//                 )}
//                 <BlankCard>
//                     <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2} mb={2} mr={2}>
//                         {isFilterActive && hasDownloadPermission && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle sevkleri indirin" : ""}>
//                                 <BlinkingButton
//                                     variant="contained"
//                                     color="secondary"
//                                     onClick={() => setOpenDownloadFilteredModal(true)}
//                                     startIcon={<IconFileDownload />}
//                                     isBlinking={true}
//                                     disabled={loadingData || displayedDispatches.length === 0}
//                                 >
//                                     Filtrelenmişi İndir
//                                 </BlinkingButton>
//                             </CustomTooltip>
//                         )}
//                         {hasDownloadPermission && (
//                             <Button
//                                 variant="contained"
//                                 color="primary"
//                                 onClick={() => setOpenDownloadAllModal(true)}
//                                 startIcon={<IconFileDownload />}
//                                 disabled={loadingData || dispatchList.length === 0}
//                             >
//                                 Tümünü İndir
//                             </Button>
//                         )}
//                     </Stack>
//                     <Box sx={{ p: 2 }}>

//                         <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
//                             <Typography variant="h5">
//                                 Şantiyenin Depo Arası Sevk Listesi

//                             </Typography>
//                             {notifIds.length > 0 && (
//                                 <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
//                                     <Chip
//                                         label={`Bildirim filtresi: ${notifIds.length}`}
//                                         color="error"
//                                         size="small"
//                                     />
//                                     <IconButton
//                                         aria-label="Bildirim filtresini temizle"
//                                         size="small"
//                                         onClick={clearNotifFilter}
//                                         sx={{ p: 0.5 }}
//                                         title="Filtreyi temizle"
//                                     >
//                                         <IconRefresh size={18} />
//                                     </IconButton>
//                                 </Stack>
//                             )}

//                         </Stack>
//                         <Grid container spacing={2} alignItems="center">
//                             <Grid item xs={12} sm={6} md={3}>
//                                 <TextField
//                                     label="Sevk Belgesi Ara"
//                                     variant="outlined"
//                                     fullWidth
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                     InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
//                                 />
//                             </Grid>
//                             <Grid item xs={12} sm={6} md={6}>
//                                 <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                     <Stack direction="row" spacing={1} alignItems="center">
//                                         <DatePicker
//                                             label="Başlangıç Tarihi"
//                                             value={startDate}
//                                             inputFormat="dd/MM/yyyy"
//                                             onChange={(newValue) => setStartDate(newValue)}
//                                             renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                         />
//                                         <DatePicker
//                                             label="Bitiş Tarihi"
//                                             value={endDate}
//                                             inputFormat="dd/MM/yyyy"
//                                             onChange={(newValue) => setEndDate(newValue)}
//                                             renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                         />
//                                         <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
//                                             <IconX size={20} />
//                                         </IconButton>
//                                     </Stack>
//                                 </LocalizationProvider>
//                             </Grid>
//                             <Grid item xs={12} sm={6} md={3}>
//                                 <ToggleButtonGroup
//                                     value={statusFilter}
//                                     exclusive
//                                     onChange={(_, newFilter) => newFilter && setStatusFilter(newFilter)}
//                                     fullWidth
//                                 >
//                                     <StyledToggleButton value="all">Tümü</StyledToggleButton>
//                                     <StyledToggleButton value="active">Aktif</StyledToggleButton>
//                                     <StyledToggleButton value="inactive">Pasif</StyledToggleButton>
//                                 </ToggleButtonGroup>
//                             </Grid>
//                         </Grid>
//                     </Box>
//                     {loadingData ? (
//                         <Box display="flex" justifyContent="center" alignItems="center" height="200px">
//                             <CircularProgress />
//                             <Typography variant="h6" sx={{ ml: 2 }}>Şantiyenin Depo arası sevk belgeleri yükleniyor...</Typography>
//                         </Box>
//                     ) : (
//                         <TableContainer component={Paper}>
//                             <Table aria-label="store dispatch table">
//                                 <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
//                                     <TableRow>
//                                         <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Kaynak Şantiyenin Depo</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Hedef Şantiyenin Depo</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Şoför</Typography></StyledTableCell>
//                                         {/* <StyledTableCell><Typography variant="h6">Araç</Typography></StyledTableCell> */}
//                                         <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Sevk Detayları</Typography></StyledTableCell>
//                                         <StyledTableCell></StyledTableCell>
//                                     </TableRow>
//                                 </TableHead>
//                                 <TableBody>
//                                     {displayedDispatches.length > 0 ? (
//                                         displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
//                                             <TableRow key={row.id}>
//                                                 <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
//                                                 <StyledTableCell><Typography variant="body1">{row.store?.name || '-'}</Typography></StyledTableCell>
//                                                 <StyledTableCell><Typography variant="body1">{row.destinationStore?.name || '-'}</Typography></StyledTableCell>
//                                                 <StyledTableCell><Typography variant="body1">{`${row.driver?.name || ''} ${row.driver?.family || ''} '-' ${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></StyledTableCell>
//                                                 {/* <StyledTableCell><Typography variant="body1">{``}</Typography></StyledTableCell> */}
//                                                 <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
//                                                 <StyledTableCell sx={{ maxWidth: 150 }}>
//                                                     {row.description && row.description.trim().length > 0 ? (
//                                                         // حالت اول: اگر توضیحات وجود داشت (خالی نبود)
//                                                         <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
//                                                             <Button

//                                                                 variant="outlined"
//                                                                 style={{ fontSize: "10px", padding: "2px 5px" }}
//                                                                 onClick={() => handleOpenDescriptionModal(row.description)}
//                                                             >
//                                                                 Açıklamayı Oku
//                                                             </Button>
//                                                         </CustomTooltip>
//                                                     ) : (
//                                                         // حالت دوم: اگر توضیحات نال یا خالی بود
//                                                         <Typography variant="body2" align="center">
//                                                             -
//                                                         </Typography>
//                                                     )}
//                                                 </StyledTableCell>
//                                                 <StyledTableCell>
//                                                     <Chip
//                                                         label={row.status}
//                                                         color={row.recordStatus === 0 ? 'success' : 'error'}
//                                                     />
//                                                 </StyledTableCell>
//                                                 <StyledTableCell>
//                                                     <Stack direction="row" spacing={1} alignItems="center">
//                                                         <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
//                                                             <Button
//                                                                 variant="outlined"
//                                                                 startIcon={<IconEye />}
//                                                                 onClick={() => {
//                                                                     setViewedDispatch(row); // 🔄 تغییر به کل آبجکت
//                                                                     setOpenDetailsModal(true);
//                                                                 }}
//                                                             >
//                                                                 Görünüm
//                                                             </Button>
//                                                         </CustomTooltip>
//                                                     </Stack>
//                                                 </StyledTableCell>
//                                                 <StyledTableCell>
//                                                     <IconButton
//                                                         onClick={(e) => {
//                                                             setSelectedRowForMenu(row);
//                                                             setAnchorEl(e.currentTarget);
//                                                         }}
//                                                     >
//                                                         <IconDots width={18} />
//                                                     </IconButton>
//                                                     <Menu
//                                                         anchorEl={anchorEl}
//                                                         open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
//                                                         onClose={handleCloseMenu}
//                                                     >
//                                                         {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
//                                                         {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}

//                                                         {hasDownloadPermission && (
//                                                             <MuiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
//                                                                 <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
//                                                                 Bu satırı indir
//                                                             </MuiMenuItem>
//                                                         )}
//                                                     </Menu>
//                                                 </StyledTableCell>
//                                             </TableRow>
//                                         ))
//                                     ) : (
//                                         <TableRow>
//                                             <StyledTableCell colSpan={9} align="center">
//                                                 <Typography variant="subtitle1" color="textSecondary">
//                                                     Hiç sevk belgesi bulunamadı.
//                                                 </Typography>
//                                             </StyledTableCell>
//                                         </TableRow>
//                                     )}
//                                 </TableBody>
//                             </Table>
//                         </TableContainer>
//                     )}
//                     <TablePagination
//                         rowsPerPageOptions={[5, 10, 25]}
//                         component="div"
//                         count={displayedDispatches.length}
//                         rowsPerPage={rowsPerPage}
//                         page={page}
//                         onPageChange={(_, newPage) => setPage(newPage)}
//                         onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
//                         labelRowsPerPage="Satır başına:"
//                     />
//                 </BlankCard>
//             </Box>


//             <Dialog
//                 open={openDescriptionModal}
//                 onClose={handleCloseDescriptionModal}
//                 maxWidth="md"
//                 fullWidth
//             >
//                 <DialogTitle>Açıklamanın Tamamı</DialogTitle>
//                 <DialogContent dividers>
//                     <DialogContentText>
//                         <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
//                     </DialogContentText>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleCloseDescriptionModal} color="primary">
//                         Kapat
//                     </Button>
//                 </DialogActions>
//             </Dialog>

//             <Dialog open={openVehicleModal} onClose={() => setOpenVehicleModal(false)}>
//                 <DialogTitle>Araç Seçin</DialogTitle>
//                 <DialogContent>
//                     <FormControl component="fieldset">
//                         <RadioGroup
//                             aria-label="vehicle"
//                             name="vehicle-radio-group"
//                             value={tempSelectedVehicle}
//                             onChange={(event) => setTempSelectedVehicle(Number(event.target.value))}
//                         >
//                             {vehiclesList.map((vehicle) => (
//                                 <FormControlLabel
//                                     key={vehicle.id}
//                                     value={vehicle.id}
//                                     control={<Radio />}
//                                     label={`${vehicle.name} (${vehicle.plaque})`}
//                                 />
//                             ))}
//                         </RadioGroup>
//                     </FormControl>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => {
//                         const selected = vehiclesList.find(v => v.id === tempSelectedVehicle);
//                         if (selected) {
//                             setSelectedVehicleId(selected.id);
//                             setSelectedVehicleName(`${selected.name} (${selected.plaque})`);
//                         }
//                         setOpenVehicleModal(false);
//                     }} color="primary" variant="contained">
//                         Seç
//                     </Button>
//                     <Button onClick={() => setOpenVehicleModal(false)} color="secondary">
//                         İptal
//                     </Button>
//                 </DialogActions>
//             </Dialog>

//             {/* ✅ Details Modal (Updated) */}
//             <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
//                 <DialogTitle>
//                     Sevk Detayları
//                     {viewedDispatch && <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>({viewedDispatch.code})</Typography>}
//                 </DialogTitle>
//                 <DialogContent dividers>
//                     {viewedDispatch && viewedDispatch.storeDispatchDetails.length > 0 ? (
//                         <>
//                             <TableContainer component={Paper} variant="outlined">
//                                 <Table aria-label="Ürün detayları tablosu" size="small">
//                                     <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
//                                         <TableRow>
//                                             <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
//                                         </TableRow>
//                                     </TableHead>
//                                     <TableBody>
//                                         {viewedDispatch.storeDispatchDetails.map((detail, index) => (
//                                             <TableRow key={detail.id || index} hover>
//                                                 <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
//                                                 <StyledTableCell><Typography variant="body1">{Number(detail.quantity).toLocaleString() || '-'}</Typography></StyledTableCell>
//                                                 <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
//                                                 <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
//                                             </TableRow>
//                                         ))}
//                                     </TableBody>
//                                 </Table>
//                             </TableContainer>

//                             {/* ✅ جدول خلاصه جمع‌ها */}
//                             <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
//                                 <TableContainer component={Paper} variant="outlined" sx={{ width: 'auto', minWidth: '300px' }}>
//                                     <Table size="small">
//                                         <TableHead sx={{ bgcolor: '#f5f5f5' }}>
//                                             <TableRow>
//                                                 <StyledTableCell align="center" colSpan={2}>
//                                                     <Typography variant="subtitle2" fontWeight="bold">Birim Bazlı Toplamlar</Typography>
//                                                 </StyledTableCell>
//                                             </TableRow>
//                                         </TableHead>
//                                         <TableBody>
//                                             {Object.entries(calculateDispatchSummaries(viewedDispatch.storeDispatchDetails)).map(([unit, total]) => (
//                                                 <TableRow key={unit}>
//                                                     <StyledTableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
//                                                         Toplam {unit}:
//                                                     </StyledTableCell>
//                                                     <StyledTableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
//                                                         {total.toLocaleString()}
//                                                     </StyledTableCell>
//                                                 </TableRow>
//                                             ))}
//                                         </TableBody>
//                                     </Table>
//                                 </TableContainer>
//                             </Box>
//                         </>
//                     ) : (
//                         <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
//                             Bu sevk belgesi için detay bulunamadı.
//                         </Typography>
//                     )}
//                 </DialogContent>
//                 {/* ✅ دکمه‌های دانلود داخل مودال */}
//                 <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
//                     <Stack
//                         direction={{ xs: 'column', sm: 'row' }} // در موبایل ستونی، در دسکتاپ ردیفی
//                         spacing={2} // فاصله یکسان بین تمام دکمه‌ها
//                         sx={{ width: '100%' }} // اشغال تمام عرض کادر
//                     >
//                         <Button
//                             variant="contained"
//                             color="error"
//                             fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
//                             sx={{ flex: 1 }}
//                             startIcon={<IconFileText />}
//                             disabled={!viewedDispatch}
//                             onClick={() => { if (viewedDispatch) exportDispatchesToPdf([viewedDispatch], `Sevk_${viewedDispatch.code}`); }}
//                         >
//                             PDF İndir
//                         </Button>
//                         <Button
//                             variant="contained"
//                             color="success"
//                             fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
//                             sx={{ flex: 1 }}
//                             startIcon={<IconFileSpreadsheet />}
//                             disabled={!viewedDispatch}
//                             onClick={() => { if (viewedDispatch) exportDispatchesToExcel([viewedDispatch], `Sevk_${viewedDispatch.code}`); }}
//                         >
//                             Excel İndir
//                         </Button>
//                         <Button onClick={() => setOpenDetailsModal(false)} color="secondary" variant="outlined" fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
//                             sx={{ flex: 1 }} >
//                             Kapat
//                         </Button>
//                     </Stack>
//                 </DialogActions>
//             </Dialog>

//             {/* Download All Modal */}
//             <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
//                 <DialogTitle>Tüm Sevk Belgelerini İndir</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileText />}
//                             onClick={() => { handleDownload('pdf', false); setOpenDownloadAllModal(false); }}
//                         >
//                             PDF Olarak İndir
//                         </Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
//                             onClick={() => { handleDownload('excel', false); setOpenDownloadAllModal(false); }}
//                         >
//                             Excel Olarak İndir
//                         </Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">
//                         Kapat
//                     </Button>
//                 </DialogActions>
//             </Dialog>

//             {/* Download Filtered Modal */}
//             <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
//                 <DialogTitle>Filtrelenmiş Sevk Belgelerini İndir</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileText />}
//                             onClick={() => { handleDownload('pdf', true); setOpenDownloadFilteredModal(false); }}
//                         >
//                             PDF Olarak İndir
//                         </Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
//                             onClick={() => { handleDownload('excel', true); setOpenDownloadFilteredModal(false); }}
//                         >
//                             Excel Olarak İndir
//                         </Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">
//                         Kapat
//                     </Button>
//                 </DialogActions>
//             </Dialog>

//             {/* Download Single Row Modal */}
//             <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
//                 <DialogTitle>Dosya Formatını Seçin</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileText />}
//                             onClick={() => handleDownloadSingleDispatch('pdf')}
//                         >
//                             PDF Olarak İndir
//                         </Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
//                             onClick={() => handleDownloadSingleDispatch('excel')}
//                         >
//                             Excel Olarak İndir
//                         </Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">
//                         Kapat
//                     </Button>
//                 </DialogActions>
//             </Dialog>

//             <DeleteBetweenStoreDispatch
//                 openModal={openDeleteModal}
//                 onClose={handleCloseDeleteModal}
//                 dispatchIdToDelete={dispatchIdToDelete}
//                 dispatchCodeToDelete={dispatchCodeToDelete}
//                 onDeleteSuccess={() => fetchInitialData()}
//                 showAlert={showAlert}
//             />
//         </>
//     );
// };

// export default ListBetweenStoreDispatch;



import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Chip, Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    DialogActions,
    DialogContentText,
    Tooltip
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconArrowRight, IconEye, IconX, IconReload, IconPlus,
    IconFileSpreadsheet,
    IconFileText,
    IconRefresh,
    IconCheck
} from '@tabler/icons-react';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from 'src/components/shared/BlankCard';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useAuth } from 'src/context/AuthContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import DeleteBetweenStoreDispatch from "./DeleteBetweenStoreDispatch";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// === Styled Components ===
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
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

// === Interfaces ===
interface DispatchDetailType {
    id: string;
    itemId: number;
    quantity: number;
    description: string;
    item?: {
        id: string;
        name: string;
        abbreviation: string;
        unit?: {
            id: string;
            title: string;
        };
    };
}

interface BetweenStoreDispatchType {
    id: string;
    code: string;
    docDate: string;
    description: string,
    createAt: string;
    recordStatus: number;
    status: string;
    statusDescription: string | null;
    store?: {
        id: string;
        name: string;
    };
    destinationStore?: {
        id: string;
        name: string;
    };
    driver?: {
        id: string;
        name: string;
        family: string;
    };
    driverVehicle?: {
        id: string;
        name: string;
        plaque: string;
    };
    storeDispatchDetails: DispatchDetailType[];
    statusText?: string;
    statusColor?: 'success' | 'error' | 'warning' | 'info';
}

interface NewDispatchData {
    docDate: string;
    description: string,
    storeId: number;
    driverId: number;
    driverVehicleId: number;
    destinationStoreId: number;
    dispatchDetails: {
        itemId: number;
        quantity: number;
        description: string;
    }[];
}

interface EditDispatchData extends NewDispatchData {
    id: number;
    code: string;
}

interface DriverType {
    id: number;
    name: string;
    family: string;
    recordStatus?: number;
}
interface StoreType {
    id: number;
    name: string;
    recordStatus?: number;
}

interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    unit?: {
        id: string;
        title: string;
    };
    recordStatus?: number;
}

interface FormDispatchDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    item?: ItemType;
    balance?: number;
    unit?: {
        id: string;
        title: string;
    };
}

interface ItemBalanceType {
    itemId: string;
    code: string | null;
    name: string;
    balance: string;
    unit: {
        id: string;
        title: string;
    };
}

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

interface VehicleType {
    id: number;
    name: string;
    model: string;
    plaque: string;
    recordStatus: number;
    createAt: string;
}

interface ApiResponseVehicleType {
    id: string;
    name: string;
    model: number;
    plaque: string;
    recordStatus: number;
    createAt: string;
}

// === Helper Functions ===
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const calculateDispatchSummaries = (details: any[]) => {
    const summary: Record<string, number> = {};
    details.forEach(d => {
        const unitTitle = d.item?.unit?.title || "Diğer";
        const qty = Number(d.quantity) || 0;
        summary[unitTitle] = (summary[unitTitle] || 0) + qty;
    });
    return summary;
};

// PDF helpers
const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');

    docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Rapor Tarihi:`, 15, 45);
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 45);
    if (subtitle) {
        doc.text(subtitle, 75, 50);
    }
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
    companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};

const exportDispatchesToPdf = (data: BetweenStoreDispatchType[], title: string, subtitle?: string) => {
    if (!data || data.length === 0) {
        console.warn('PDF oluşturulacak sevk belgesi bulunamadı.');
        return;
    }

    const doc = new jsPDF();
    const docAny = doc as any;
    let yPos = 55;

    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');

    data.forEach((dispatch, index) => {
        if (index > 0) {
            doc.addPage();
            yPos = 55;
        }

        addPdfHeader(doc, title, subtitle);

        doc.setFontSize(10);
        doc.text(`Kaynak Şantiyenin Depo: ${dispatch.store?.name || '-'}`, 15, yPos);
        yPos += 7;
        doc.text(`Hedef Şantiyenin Depo: ${dispatch.destinationStore?.name || '-'}`, 15, yPos);
        yPos += 7;
        doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos);
        yPos += 7;
        doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || '-'})`, 15, yPos);
        yPos += 7;
        doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos);
        yPos += 15;

        doc.text(`Genel Açıklama: ${dispatch.description || '-'}`, 15, yPos);
        yPos += 22;

        const detailsRows = (dispatch.storeDispatchDetails || []).map(d => [
            d.item?.name || '-',
            Number(d.quantity).toLocaleString('tr-TR'),
            d.item?.unit?.title || '-',
            d.description || '-'
        ]);

        const summaries = calculateDispatchSummaries(dispatch.storeDispatchDetails || []);
        const summaryRows = Object.entries(summaries).map(([unit, total]) => [
            "TOPLAM:",
            total.toLocaleString('tr-TR'),
            unit,
            ""
        ]);

        autoTable(docAny, {
            startY: yPos,
            head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
            body: detailsRows,
            foot: summaryRows,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            footStyles: { font: 'NotoSans', fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
            didDrawPage: () => {
                addPdfHeader(doc, title, subtitle);
                addPdfFooter(doc);
            }
        });

        yPos = (docAny.lastAutoTable.finalY || yPos) + 10;
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
};

const addExcelHeader = (ws: Excel.Worksheet, title: string, columnsLength: number) => {
    ws.views = [{ rightToLeft: false }];
    const titleRow = ws.addRow([title]);
    titleRow.font = { name: 'NotoSans', size: 14, bold: true };
    ws.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    const dateRow = ws.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
    dateRow.font = { name: 'NotoSans', size: 10, bold: false };
    dateRow.getCell(1).alignment = { horizontal: 'left' };
    ws.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);
    ws.addRow([]);
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

const exportDispatchesToExcel = (data: BetweenStoreDispatchType[], title: string) => {
    if (!data || data.length === 0) {
        console.warn('Excel oluşturulacak sevk belgesi bulunamadı.');
        return;
    }

    const workbook = new Excel.Workbook();

    data.forEach(dispatch => {
        const worksheetTitle = `Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_').substring(0, 30);
        const worksheet = workbook.addWorksheet(worksheetTitle);

        const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
        const totalColumns = detailsColumns.length;

        addExcelHeader(worksheet, title, totalColumns);

        worksheet.addRow([`Sevk Belgesi Kodu:`, dispatch.code]);
        worksheet.addRow([`Kaynak Şantiyenin Depo:`, dispatch.store?.name || '-']);
        worksheet.addRow([`Hedef Şantiyenin Depo:`, dispatch.destinationStore?.name || '-']);
        worksheet.addRow([`Şoför:`, `${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`]);
        worksheet.addRow([`Araç:`, `${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`]);
        worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);

        worksheet.addRow([`Açıklama:`, dispatch.description || '-']);
        worksheet.addRow([]);

        const headerRow = worksheet.addRow(detailsColumns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        (dispatch.storeDispatchDetails || []).forEach(d => {
            worksheet.addRow([
                d.item?.name || '-',
                Number(d.quantity),
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);
        });

        worksheet.addRow([]);
        const summaryTitle = worksheet.addRow(["Birim Bazlı Toplamlar"]);
        summaryTitle.font = { bold: true, underline: true };

        const summaries = calculateDispatchSummaries(dispatch.storeDispatchDetails || []);
        Object.entries(summaries).forEach(([unit, total]) => {
            const r = worksheet.addRow(["TOPLAM:", total, unit]);
            r.getCell(1).font = { bold: true };
            r.getCell(1).alignment = { horizontal: 'right' };
            r.getCell(2).font = { bold: true };
        });

        worksheet.addRow([]);
        addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);

        worksheet.getColumn(1).width = 30;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 40;
    });

    const fileName = `${title.replace(/ /g, '_')}.xlsx`;
    workbook.xlsx.writeBuffer().then(buffer => {
        saveAs(new Blob([buffer]), fileName);
    });
};


const ListBetweenStoreDispatch = () => {
    const { storeId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

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

    const nameInputRef = useRef<HTMLInputElement>(null);

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [selectedDestinationStoreId, setSelectedDestinationStoreId] = useState<number | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

    const [dispatchDetails, setDispatchDetails] = useState<FormDispatchDetail[]>([]);
    const [dispatchList, setDispatchList] = useState<BetweenStoreDispatchType[]>([]);
    const [displayedDispatches, setDisplayedDispatches] = useState<BetweenStoreDispatchType[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<BetweenStoreDispatchType | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [driverIdError, setDriverIdError] = useState<boolean>(false);
    const [destinationStoreIdError, setDestinationStoreIdError] = useState<boolean>(false);
    const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [stores, setStores] = useState<StoreType[]>([]);
    const [storeItems, setStoreItems] = useState<ItemBalanceType[]>([]);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [dispatchIdToDelete, setDispatchIdToDelete] = useState<string | null>(null);
    const [dispatchCodeToDelete, setDispatchCodeToDelete] = useState<string>('');

    const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);
    const [openVehicleModal, setOpenVehicleModal] = useState(false);
    const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [viewedDispatch, setViewedDispatch] = useState<BetweenStoreDispatchType | null>(null);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [generalDescription, setGeneralDescription] = useState('');

    const [removedDispatchDetails, setRemovedDispatchDetails] = useState<any[]>([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedDispatchForDownload, setSelectedDispatchForDownload] = useState<BetweenStoreDispatchType | null>(null);

    const [initialDispatchDetails, setInitialDispatchDetails] = useState<FormDispatchDetail[]>([]);

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // ✨ NEW STATE: For single item adding logic
    const [newItem, setNewItem] = useState<FormDispatchDetail | null>(null);

    // === Form Handlers ===
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);


    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };


    const fetchVehicles = useCallback(async (driverId: string) => {
        setLoadingData(true);
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            setLoadingData(false);
            return;
        }

        try {
            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${driverId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const formattedData: VehicleType[] = response.data.data.map((item: ApiResponseVehicleType) => ({
                    ...item,
                    model: String(item.model),
                    id: Number(item.id)
                }));
                const activeVehicles = formattedData.filter(item => item.recordStatus === 0);
                setVehiclesList(activeVehicles);

                if (activeVehicles.length > 1) {
                    setOpenVehicleModal(true);
                    setTempSelectedVehicle(activeVehicles[0].id);
                } else if (activeVehicles.length === 1) {
                    setSelectedVehicleId(activeVehicles[0].id);
                    setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
                } else {
                    setSelectedVehicleId(null);
                    setSelectedVehicleName(null);
                }
            } else {
                setVehiclesList([]);
                setSelectedVehicle(null);
                setSelectedVehicleName(null);
                showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [showAlert, authToken, navigate]);

    const fetchStoreItems = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<ApiResponse<ItemBalanceType[]>>(
                `${server.baseurl}${server.warehouse}get-store-all-items-balance/${Number(storeId)}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                setStoreItems(response.data.data);
            } else {
                setStoreItems([]);
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka یک işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate, storeId, showAlert, authToken]);

    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        try {
            const [driversRes, storesRes, betweenDispatchesRes] = await Promise.all([
                axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<StoreType[]>>(server.baseurl + server.initialoperations + "get-stores", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<BetweenStoreDispatchType[]>>(server.baseurl + server.warehouse + `get-between-store-dispatches/${Number(storeId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);

            setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
            setStores(storesRes.data?.data?.filter(w => w.recordStatus === 0).map(w => ({ ...w, id: Number(w.id) })) || []);

            if (betweenDispatchesRes.data?.httpStatusCode === 200) {
                const allDispatches = betweenDispatchesRes.data.data;
                const formattedDispatches = allDispatches.map(d => ({
                    ...d,
                    status: d.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setDispatchList(formattedDispatches);
            } else {
                showAlert(betweenDispatchesRes.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, storeId, showAlert, authToken]);

    useEffect(() => {
        fetchInitialData();
        fetchStoreItems();
    }, [fetchInitialData, fetchStoreItems]);

    useEffect(() => {
        let filteredDispatches = dispatchList.filter(d => {
            const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.destinationStore?.name && d.destinationStore.name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && d.recordStatus === 0) ||
                (statusFilter === 'inactive' && d.recordStatus === 1);

            const docDate = new Date(d.docDate);
            const startCheck = !startDate || docDate >= startDate;
            const endCheck = !endDate || docDate <= endDate;

            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(d.id));

            return matchesSearch && matchesStatus && startCheck && endCheck && matchesNotifIds;
        });
        setDisplayedDispatches(filteredDispatches);
        setPage(0);
    }, [dispatchList, searchTerm, statusFilter, startDate, endDate, notifIds]);

    useEffect(() => {
        const hasItems = dispatchDetails.length > 0;
        // const allQuantitiesValid = dispatchDetails.every(item => Number(item.quantity) > 0);

        const isValid =
            !!selectedDestinationStoreId &&
            !!selectedDriverId &&
            !!docDate &&
            hasItems

        setIsFormValid(isValid);
    }, [selectedDestinationStoreId, selectedDriverId, docDate, dispatchDetails]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    const validateForm = (): boolean => {
        let isValid = true;

        if (!selectedDriverId) {
            setDriverIdError(true);
            isValid = false;
        } else {
            setDriverIdError(false);
        }

        if (!selectedDestinationStoreId) {
            setDestinationStoreIdError(true);
            isValid = false;
        } else {
            setDestinationStoreIdError(false);
        }

        if (!docDate) {
            setDocDateError(true);
            isValid = false;
        } else {
            setDocDateError(false);
        }

        if (dispatchDetails.length === 0) {
            setDispatchDetailsError(true);
            isValid = false;
        } else {
            const isDetailsValid = dispatchDetails.every((detail, index) => {
                const numQuantity = Number(detail.quantity);
                if (isNaN(numQuantity) || numQuantity <= 0) {
                    return false;
                }
                const currentItemBalance = storeItems.find(item => Number(item.itemId) === Number(detail.itemId));
                const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;
                let maxAllowedQuantity = currentStockBalance;
                if (editingId) {
                    const initialDetail = initialDispatchDetails[index];
                    if (initialDetail && Number(initialDetail.itemId) === Number(detail.itemId)) {
                        const initialQuantity = Number(initialDetail.quantity);
                        maxAllowedQuantity += initialQuantity;
                    }
                }
                if (numQuantity > maxAllowedQuantity) {
                    return false;
                }
                return true;
            });

            if (!isDetailsValid) {
                setDispatchDetailsError(true);
                isValid = false;
            } else {
                setDispatchDetailsError(false);
            }
        }

        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }

        return isValid;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setGeneralDescription('');
        setSelectedDriverId(null);
        setSelectedDestinationStoreId(null);
        setDispatchDetails([]);
        setIsFormVisible(false);
        setEditingId(null);
        setDocDateError(false);
        setDriverIdError(false);
        setDestinationStoreIdError(false);
        setDispatchDetailsError(false);
        setSelectedVehicleId(null);
        setSelectedVehicleName(null);
        setRemovedDispatchDetails([]);
        setNewItem(null); // Reset new item form
    };

    const insertDispatch = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const payload: NewDispatchData = {
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
            storeId: Number(storeId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            destinationStoreId: Number(selectedDestinationStoreId),
            dispatchDetails: dispatchDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description }))
        };
        try {
            const response = await axios.post(server.baseurl + server.warehouse + "create-between-store-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni sevk belgesi başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Sevk belgesi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editDispatch = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        const payload: EditDispatchData = {
            id: Number(editingId),
            code: editingCode!,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
            storeId: Number(storeId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            destinationStoreId: Number(selectedDestinationStoreId),
            dispatchDetails: dispatchDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description
            }))
        };
        try {
            const response = await axios.put(server.baseurl + server.warehouse + "update-between-store-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 200) {
                showAlert('Sevk belgesi başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = async () => {
        if (selectedRowForMenu) {
            setLoadingData(true);
            await fetchStoreItems();

            const formattedDetails = (selectedRowForMenu.storeDispatchDetails || []).map(d => {
                const itemBalance = storeItems.find(item => Number(item.itemId) === Number(d.item?.id));
                return {
                    itemId: Number(d.item?.id),
                    quantity: d.quantity,
                    description: d.description,
                    item: d.item,
                    balance: itemBalance ? Number(itemBalance.balance) : 0,
                    unit: d.item?.unit ? { id: d.item.unit.id || d.item.id, title: d.item.unit.title } : undefined,
                };
            });

            setDispatchDetails(formattedDetails);
            setInitialDispatchDetails(formattedDetails);

            setEditingId(selectedRowForMenu.id);
            setEditingCode(selectedRowForMenu.code);
            setDocDate(new Date(selectedRowForMenu.docDate));
            setGeneralDescription(selectedRowForMenu.description || '');
            setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
            setSelectedDestinationStoreId(Number(selectedDestinationStoreId));
            if (selectedRowForMenu.driverVehicle) {
                setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
                setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
            }

            setTimeout(() => {
                nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                nameInputRef.current?.focus();
            }, 100);
            setIsFormVisible(true);
            handleCloseMenu();
            setLoadingData(false);
        }
    };

    const handleCancelEdit = () => {
        resetFormAndState();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setDispatchIdToDelete(selectedRowForMenu.id);
            setDispatchCodeToDelete(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setDispatchIdToDelete(null);
        setDispatchCodeToDelete('');
        fetchInitialData();
    };

    const handleRemoveDispatchDetail = (index: number) => {
        setDispatchDetails(prev => {
            const removedItem = prev[index];
            // Only archive if we are in EDIT mode AND the item was originally in the dispatch
            if (editingId && removedItem) {
                const wasOriginal = initialDispatchDetails.some(init => init.itemId === removedItem.itemId);
                if (wasOriginal) {
                    setRemovedDispatchDetails(oldRemoved => [...oldRemoved, removedItem]);
                }
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleRestoreDispatchDetail = (indexToRestore: number) => {
        const itemToRestore = removedDispatchDetails[indexToRestore];
        if (itemToRestore) {
            setDispatchDetails(prev => [...prev, itemToRestore]);
            setRemovedDispatchDetails(prev => prev.filter((_, i) => i !== indexToRestore));
        }
    };


    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormDispatchDetail, value: any) => {
        setDispatchDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };

            const originalDetail = initialDispatchDetails.find(d => d.itemId === updatedDetail.itemId);
            const originalQuantity = originalDetail ? Number(originalDetail.quantity) : 0;

            const currentItemBalance = storeItems.find(item => Number(item.itemId) === Number(updatedDetail.itemId));
            const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;

            const maxAllowedQuantity = currentStockBalance + originalQuantity;

            if (field === 'quantity') {
                const numValue = Number(value);

                if (isNaN(numValue) || numValue < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updatedDetail.quantity = 0;
                } else if (numValue > maxAllowedQuantity) {
                    showAlert(`Girdiğiniz miktar stoktan fazla! Maksimum: ${maxAllowedQuantity}`, 'warning');
                    updatedDetail.quantity = maxAllowedQuantity;
                } else {
                    updatedDetail.quantity = numValue;
                }
            }

            else if (field === 'itemId') {
                const selectedItem = storeItems.find(item => Number(item.itemId) === Number(value));
                updatedDetail.itemId = value;
                updatedDetail.item = selectedItem ? {
                    id: selectedItem.itemId,
                    name: selectedItem.name,
                    abbreviation: selectedItem.code || '',
                    unit: selectedItem.unit
                } : undefined;
                updatedDetail.balance = selectedItem ? Number(selectedItem.balance) : 0;
            } else {
                (updatedDetail as any)[field] = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [showAlert, storeItems, initialDispatchDetails]);

    const handleEditVehicleSelection = () => {
        if (vehiclesList.length > 1) {
            setOpenVehicleModal(true);
            setTempSelectedVehicle(selectedVehicle);
        } else {
            showAlert('Bu şoförün tek bir aracı bulunmaktadır.', 'info');
        }
    };


    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedDispatches : dispatchList;
        const title = isFiltered ? 'Filtrelenmiş Şantiyenin Depo Arası Sevk Raporu' : 'Tüm Şantiyenin Depo Arası Sevk Raporu';
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : new Date().toISOString())}` : undefined;

        if (format === 'pdf') {
            exportDispatchesToPdf(dataToDownload, title, subtitle);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } else {
            exportDispatchesToExcel(dataToDownload, title);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        }
    };

    const handleOpenRowDownloadModal = (dispatch: BetweenStoreDispatchType) => {
        setSelectedDispatchForDownload(dispatch);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    const handleDownloadSingleDispatch = (format: 'pdf' | 'excel') => {
        if (!selectedDispatchForDownload) return;
        const data = [selectedDispatchForDownload];
        const title = `Sevk Belgesi Detayları: ${selectedDispatchForDownload.code}`;

        if (format === 'pdf') {
            exportDispatchesToPdf(data, title);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } else {
            exportDispatchesToExcel(data, title);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        }
        setOpenRowDownloadModal(false);
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


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

    // تابع مدیریت دکمه افزودن تکی
    const handleAddNewRow = () => {
        // اگر لیست در حال حاضر پر است (مثلاً از طریق دکمه یکجا پر شده)، آن را پاک کن
        // اما اگر کاربر قبلاً در حال اضافه کردن تکی بوده، لیست را پاک نکن تا بتواند آیتم دوم و سوم را اضافه کند
        // تشخیص این مورد: اگر تعداد آیتم‌ها برابر با کل موجودی انبار باشد، یعنی "یکجا" اضافه شده است.
        if (dispatchDetails.length === storeItems.length && storeItems.length > 0) {
            setDispatchDetails([]);
        }

        setNewItem({
            itemId: null,
            quantity: '',
            description: '',
            balance: 0
        });
    };

    // تابع تایید و ثبت هر آیتم در لیست تکی
    const confirmNewItem = () => {
        if (newItem && newItem.itemId && Number(newItem.quantity) > 0) {
            // چک کردن برای جلوگیری از افزودن تکراری
            const exists = dispatchDetails.some(d => d.itemId === newItem.itemId);
            if (exists) {
                showAlert("Bu ürün zaten listede mevcut!", "warning");
                return;
            }

            // افزودن آیتم به لیست (بدون پاک کردن آیتم‌های قبلی تکی)
            setDispatchDetails(prev => [...prev, newItem]);

            // ریست کردن فرم ورودی برای آیتم بعدی (پنل بسته نمی‌شود، فقط فیلدها خالی می‌شوند)
            setNewItem({
                itemId: null,
                quantity: '',
                description: '',
                balance: 0
            });
        } else {
            showAlert("Lütfen bir ürün seçin ve geçerli bir miktar girin.", "warning");
        }
    };

    const handleToggleAllItems = () => {
        if (dispatchDetails.length > 0) {
            setDispatchDetails([]);
        } else {
            setNewItem(null); // بستن پنل تکی در صورت باز بودن
            const allItems = storeItems.map(item => ({
                itemId: Number(item.itemId),
                quantity: Number(item.balance), // استفاده از موجودی انبار به عنوان مقدار پیش‌فرض
                description: '',
                item: {
                    id: item.itemId,
                    name: item.name,
                    abbreviation: item.code || '',
                    unit: item.unit
                },
                balance: Number(item.balance)
            }));
            setDispatchDetails(allItems);
        }
    };

    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    mb={3}
                    spacing={2}
                    flexWrap="wrap"
                >
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                        Şantiyenin Depo Arası Sevk İşlemleri
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şantiyenin Depo Arası Sevk Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni Şantiyenin Depo Arası Sevk
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    disabled={loadingButton}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => navigate(-1)}
                                endIcon={<IconArrowRight size={20} />}
                                fullWidth={false}
                            >
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Stack>
                </Stack>
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Şantiyenin Depo Sevk Belgesini Düzenle' : 'Yeni Şantiyenin Depo Sevk Belgesi'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Şoför</CustomFormLabel>
                                <Autocomplete
                                    id="driver-select"
                                    options={drivers}
                                    getOptionLabel={(option) => `${option.name} ${option.family}`}
                                    value={drivers.find(d => d.id === selectedDriverId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedDriverId(newValue ? newValue.id : null);
                                        if (newValue) {
                                            fetchVehicles(String(newValue.id));
                                        } else {
                                            setSelectedVehicle(null);
                                            setSelectedVehicleName(null);
                                            setVehiclesList([]);
                                        }
                                        if (driverIdError && newValue) setDriverIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Şoför Seçin"
                                            error={driverIdError}
                                            helperText={driverIdError ? "Şoför seçimi zorunludur!" : ""}
                                        />
                                    )}
                                />
                                {selectedVehicleName && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                                        <Chip label={`Seçilen Araç: ${selectedVehicleName}`} color="info" />
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Aracı değiştir" : ""}>
                                            <IconButton onClick={handleEditVehicleSelection} size="small">
                                                <IconEdit size={18} />
                                            </IconButton>
                                        </CustomTooltip>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Hedef Şantiyenin Depo</CustomFormLabel>
                                <Autocomplete
                                    id="destination-store-select"
                                    options={stores.filter(s => Number(s.id) !== Number(storeId))}
                                    getOptionLabel={(option) => option.name}
                                    value={stores.find(s => s.id === selectedDestinationStoreId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedDestinationStoreId(newValue ? newValue.id : null);
                                        if (destinationStoreIdError && newValue) setDestinationStoreIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Hedef Şantiyenin Depo Seçin"
                                            error={destinationStoreIdError}
                                            helperText={destinationStoreIdError ? "Hedef Şantiyenin Depo seçimi zorunludur!" : ""}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        label=""
                                        value={docDate}
                                        inputRef={nameInputRef}
                                        onChange={(newValue) => {
                                            setDocDate(newValue);
                                            if (docDateError && newValue) setDocDateError(false);
                                        }}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                fullWidth
                                                size="small"
                                                error={docDateError}
                                                helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12}>
                                <CustomFormLabel htmlFor="invoice-general-description">Açıklama</CustomFormLabel>
                                <TextField
                                    id="invoice-general-description"
                                    label="Şantiyenin Depo Arası Sevk için genel açıklama giriniz"
                                    type="text"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    variant="outlined"
                                    value={generalDescription}
                                    onChange={(e) => setGeneralDescription(e.target.value)}
                                />
                            </Grid>
                        </Grid>

                        <Box mt={4}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Sevk Detayları</Typography>
                                <Stack direction="row" spacing={1}>
                                    {/* ✨ Button: Add Single Item */}
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={handleAddNewRow}
                                        startIcon={<IconPlus />}
                                        disabled={newItem !== null}
                                    >
                                        Tek Tek Ekle
                                    </Button>
                                    {/* ✨ Modified Button: Toggle All */}
                                    <Button
                                        variant="outlined"
                                        color={dispatchDetails.length > 0 ? "error" : "secondary"}
                                        onClick={handleToggleAllItems}
                                        startIcon={dispatchDetails.length > 0 ? <IconTrash /> : <IconPlus />}
                                        disabled={storeItems.length === 0}
                                    >
                                        {dispatchDetails.length > 0 ? "Tümünü Kaldır" : "Tümünü Ekle"}
                                    </Button>
                                </Stack>
                            </Stack>

                            <Grid container spacing={2}>
                                {/* ✨ NEW: Add Single Item Row */}
                                {newItem && (
                                    <Grid item xs={12} sx={{ bgcolor: 'rgba(0,0,0,0.03)', p: 2, borderRadius: 1, border: '1px solid #ddd', mb: 2 }}>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} sm={4}>
                                                <Autocomplete
                                                    options={storeItems.filter(
                                                        (item) => !dispatchDetails.some((d) => Number(d.itemId) === Number(item.itemId))
                                                    )}
                                                    getOptionLabel={(option) => {
                                                        if (!option) return "";
                                                        return `${option.name} (${option.balance} ${option.unit?.title || ""})`;
                                                    }}
                                                    value={storeItems.find(i => Number(i.itemId) === newItem?.itemId) || null}
                                                    onChange={(_, val) => {
                                                        if (val) {
                                                            setNewItem({
                                                                ...newItem!,
                                                                itemId: Number(val.itemId),
                                                                balance: Number(val.balance),
                                                                item: {
                                                                    id: val.itemId,
                                                                    name: val.name,
                                                                    abbreviation: val.code || '',
                                                                    unit: val.unit
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    renderInput={(params) => <TextField {...params} label="Malzeme Ara/Seç" size="small" />}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <TextField
                                                    label={`Miktar (Max: ${newItem.balance})`}
                                                    type="number"
                                                    size="small"
                                                    fullWidth
                                                    value={newItem.quantity}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val > (newItem.balance || 0)) {
                                                            setNewItem({ ...newItem, quantity: newItem.balance || 0 });
                                                            showAlert(`Stok miktarını aşamazsınız! Max: ${newItem.balance}`, "warning");
                                                        } else {
                                                            setNewItem({ ...newItem, quantity: e.target.value });
                                                        }
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <TextField
                                                    label="Açıklama"
                                                    size="small"
                                                    fullWidth
                                                    value={newItem.description}
                                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
                                                <Tooltip title="Ekle">
                                                    <IconButton color="success" onClick={confirmNewItem}><IconCheck /></IconButton>
                                                </Tooltip>
                                                <Tooltip title="İptal">
                                                    <IconButton color="error" onClick={() => setNewItem(null)}><IconX /></IconButton>
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                )}

                                {dispatchDetails.map((detail, index) => {
                                    const selectedItem = storeItems.find(item => Number(item.itemId) === Number(detail.itemId));
                                    const maxQuantity = selectedItem ? Number(selectedItem.balance) : 0;
                                    const displayBalance = selectedItem ? `(Stok: ${maxQuantity})` : '';

                                    return (
                                        <Grid item xs={12} key={index}>
                                            <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
                                                <Grid item xs={12} sm={4} md={4}>
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Typography variant="body1" component="div" sx={{ fontWeight: 'bold', fontSize: { xs: '0.9rem', md: '1rem' } }}>
                                                            {detail.item?.name || 'Ürün Adı Bulunamadı'}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6} sm={3} md={3}>
                                                    <CustomTextField
                                                        type="number"
                                                        label={`Miktar ${displayBalance}`}
                                                        placeholder="Miktar"
                                                        value={detail.quantity}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                        fullWidth
                                                        size="small"
                                                        error={dispatchDetailsError && (Number(detail.quantity) < 0)}
                                                    />
                                                </Grid>
                                                <Grid item xs={6} sm={4} md={4}>
                                                    <CustomTextField
                                                        label="Açıklama"
                                                        placeholder="Açıklama"
                                                        value={detail.description}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                        fullWidth
                                                        size="small"
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={1} md={1} sx={{ textAlign: { xs: 'right', sm: 'center' } }}>
                                                    <IconButton color="error" onClick={() => handleRemoveDispatchDetail(index)} size="large">
                                                        <IconTrash />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    )
                                })}
                            </Grid>
                            {dispatchDetailsError && <Typography color="error" variant="caption" sx={{ mt: 1.5, ml: 1.5 }}>En az bir sevk detayı eklemek zorunludur!</Typography>}
                        </Box>

                        {/* ✨ Archive/History for removed items - ONLY in Edit Mode OR manual removals */}
                        {removedDispatchDetails.length > 0 && (
                            <Box sx={{ border: '1px dashed', borderColor: "error.main", p: 2, borderRadius: 1, mt: 3, backgroundColor: 'rgba(255, 0, 0, 0.05)' }}>
                                <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {removedDispatchDetails.map((detail, index) => (
                                        <Chip
                                            key={index}
                                            label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
                                            color="error"
                                            onDelete={() => handleRestoreDispatchDetail(index)}
                                            deleteIcon={<IconReload size={18} />}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                            {editingId ? (
                                <>
                                    <Button variant="contained" color="info" onClick={editDispatch} disabled={loadingButton}>
                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
                                </>
                            ) : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak sevk belgesini kaydedin." : ""}>
                                        <span>
                                            <BlinkingButton
                                                variant="contained"
                                                color="success"
                                                size="large"
                                                onClick={insertDispatch}
                                                // دکمه با استفاده از تابع useEffect بالا کنترل می‌شود
                                                disabled={!isFormValid || loadingButton}
                                                isBlinking={isFormValid && !loadingButton}
                                            >
                                                {loadingButton ? 'Kaydediliyor...' : 'Yeni Sevk Belgesi Ekle'}
                                            </BlinkingButton>
                                        </span>
                                    </CustomTooltip>
                                )
                            )}
                        </Stack>
                    </Paper>
                )}

                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                    </Stack>
                )}
                <BlankCard>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2} mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle sevkleri indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)}
                                    startIcon={<IconFileDownload />}
                                    isBlinking={true}
                                    disabled={loadingData || displayedDispatches.length === 0}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setOpenDownloadAllModal(true)}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || dispatchList.length === 0}
                            >
                                Tümünü İndir
                            </Button>
                        )}
                    </Stack>
                    <Box sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                            <Typography variant="h5">Şantiyenin Depo Arası Sevk Listesi</Typography>
                            {notifIds.length > 0 && (
                                <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                                    <Chip label={`Bildirim filtresi: ${notifIds.length}`} color="error" size="small" />
                                    <IconButton size="small" onClick={clearNotifFilter} title="Filtreyi temizle"><IconRefresh size={18} /></IconButton>
                                </Stack>
                            )}
                        </Stack>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="Sevk Belgesi Ara"
                                    variant="outlined"
                                    fullWidth
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <DatePicker
                                            label="Başlangıç Tarihi"
                                            value={startDate}
                                            inputFormat="dd/MM/yyyy"
                                            onChange={(newValue) => setStartDate(newValue)}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        />
                                        <DatePicker
                                            label="Bitiş Tarihi"
                                            value={endDate}
                                            inputFormat="dd/MM/yyyy"
                                            onChange={(newValue) => setEndDate(newValue)}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        />
                                        <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
                                    </Stack>
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <ToggleButtonGroup
                                    value={statusFilter}
                                    exclusive
                                    onChange={(_, newFilter) => newFilter && setStatusFilter(newFilter)}
                                    fullWidth
                                >
                                    <StyledToggleButton value="all">Tümü</StyledToggleButton>
                                    <StyledToggleButton value="active">Aktif</StyledToggleButton>
                                    <StyledToggleButton value="inactive">Pasif</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid>
                        </Grid>
                    </Box>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Şantiyenin Depo arası sevk belgeleri yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table aria-label="store dispatch table">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Kaynak Şantiyenin Depo</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Hedef Şantiyenin Depo</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Şoför</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                        {/* <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell> */}
                                        <StyledTableCell><Typography variant="h6">Sevk Detayları</Typography></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedDispatches.length > 0 ? (
                                        displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                            <TableRow key={row.id}>
                                                <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.store?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.destinationStore?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{`${row.driver?.name || ''} ${row.driver?.family || ''} - ${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                                <StyledTableCell sx={{ maxWidth: 150 }}>
                                                    {row.description && row.description.trim().length > 0 ? (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                            <Button
                                                                variant="outlined"
                                                                style={{ fontSize: "10px", padding: "2px 5px" }}
                                                                onClick={() => handleOpenDescriptionModal(row.description)}
                                                            >
                                                                Açıklamayı Oku
                                                            </Button>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <Typography variant="body2" align="center">-</Typography>
                                                    )}
                                                </StyledTableCell>
                                                {/* <StyledTableCell>
                                                    <Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} />
                                                </StyledTableCell> */}
                                                <StyledTableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                            <Button
                                                                variant="outlined"
                                                                startIcon={<IconEye />}
                                                                onClick={() => {
                                                                    setViewedDispatch(row);
                                                                    setOpenDetailsModal(true);
                                                                }}
                                                            >
                                                                Görünüm
                                                            </Button>
                                                        </CustomTooltip>
                                                    </Stack>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <IconButton
                                                        onClick={(e) => {
                                                            setSelectedRowForMenu(row);
                                                            setAnchorEl(e.currentTarget);
                                                        }}
                                                    >
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                    <Menu
                                                        anchorEl={anchorEl}
                                                        open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
                                                        onClose={handleCloseMenu}
                                                    >
                                                        {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                        {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}
                                                        {hasDownloadPermission && (
                                                            <MuiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                                Bu satırı indir
                                                            </MuiMenuItem>
                                                        )}
                                                    </Menu>
                                                </StyledTableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={9} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">Hiç sevk belgesi bulunamadı.</Typography>
                                            </StyledTableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={displayedDispatches.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage="Satır başına:"
                    />
                </BlankCard>
            </Box>

            {/* Modals Handled Below... */}
            <Dialog open={openDescriptionModal} onClose={handleCloseDescriptionModal} maxWidth="md" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText><div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} /></DialogContentText>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDescriptionModal} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openVehicleModal} onClose={() => setOpenVehicleModal(false)}>
                <DialogTitle>Araç Seçin</DialogTitle>
                <DialogContent>
                    <FormControl component="fieldset">
                        <RadioGroup value={tempSelectedVehicle} onChange={(event) => setTempSelectedVehicle(Number(event.target.value))}>
                            {vehiclesList.map((v) => <FormControlLabel key={v.id} value={v.id} control={<Radio />} label={`${v.name} (${v.plaque})`} />)}
                        </RadioGroup>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        const s = vehiclesList.find(v => v.id === tempSelectedVehicle);
                        if (s) { setSelectedVehicleId(s.id); setSelectedVehicleName(`${s.name} (${s.plaque})`); }
                        setOpenVehicleModal(false);
                    }} color="primary" variant="contained">Seç</Button>
                    <Button onClick={() => setOpenVehicleModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sevk Detayları {viewedDispatch && <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>({viewedDispatch.code})</Typography>}</DialogTitle>
                <DialogContent dividers>
                    {viewedDispatch && viewedDispatch.storeDispatchDetails.length > 0 ? (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                        <TableRow>
                                            <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {viewedDispatch.storeDispatchDetails.map((detail, index) => (
                                            <TableRow key={index} hover>
                                                <StyledTableCell>{detail.item?.name || '-'}</StyledTableCell>
                                                <StyledTableCell>{Number(detail.quantity).toLocaleString()}</StyledTableCell>
                                                <StyledTableCell>{detail.item?.unit?.title || '-'}</StyledTableCell>
                                                <StyledTableCell>{detail.description || '-'}</StyledTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <TableContainer component={Paper} variant="outlined" sx={{ width: 'auto', minWidth: '300px' }}>
                                    <Table size="small">
                                        <TableBody>
                                            {Object.entries(calculateDispatchSummaries(viewedDispatch.storeDispatchDetails)).map(([unit, total]) => (
                                                <TableRow key={unit}>
                                                    <StyledTableCell sx={{ fontWeight: 'bold' }}>Toplam {unit}:</StyledTableCell>
                                                    <StyledTableCell align="right" sx={{ fontWeight: 'bold' }}>{total.toLocaleString()}</StyledTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </>
                    ) : <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>Detay bulunamadı.</Typography>}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
                        <Button variant="contained" color="error" sx={{ flex: 1 }} startIcon={<IconFileText />} onClick={() => viewedDispatch && exportDispatchesToPdf([viewedDispatch], `Sevk_${viewedDispatch.code}`)}>PDF İndir</Button>
                        <Button variant="contained" color="success" sx={{ flex: 1 }} startIcon={<IconFileSpreadsheet />} onClick={() => viewedDispatch && exportDispatchesToExcel([viewedDispatch], `Sevk_${viewedDispatch.code}`)}>Excel İndir</Button>
                        <Button onClick={() => setOpenDetailsModal(false)} variant="outlined" sx={{ flex: 1 }}>Kapat</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tümünü İndir</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={2}>
                        <Button variant="contained" color="primary" onClick={() => { handleDownload('pdf', false); setOpenDownloadAllModal(false); }}>PDF</Button>
                        <Button variant="contained" color="success" onClick={() => { handleDownload('excel', false); setOpenDownloadAllModal(false); }}>Excel</Button>
                    </Stack>
                </DialogContent>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmişi İندیر</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={2}>
                        <Button variant="contained" color="primary" onClick={() => { handleDownload('pdf', true); setOpenDownloadFilteredModal(false); }}>PDF</Button>
                        <Button variant="contained" color="success" onClick={() => { handleDownload('excel', true); setOpenDownloadFilteredModal(false); }}>Excel</Button>
                    </Stack>
                </DialogContent>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={2}>
                        <Button variant="contained" color="primary" onClick={() => handleDownloadSingleDispatch('pdf')}>PDF</Button>
                        <Button variant="contained" color="success" onClick={() => handleDownloadSingleDispatch('excel')}>Excel</Button>
                    </Stack>
                </DialogContent>
            </Dialog>

            <DeleteBetweenStoreDispatch
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                dispatchIdToDelete={dispatchIdToDelete}
                dispatchCodeToDelete={dispatchCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListBetweenStoreDispatch;