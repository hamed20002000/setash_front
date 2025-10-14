// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//     TableContainer, Table, TableHead, TableRow, TableBody,
//     TableCell as MuiTableCell,
//     MenuItem as MuiMenuItem,
//     Typography, Menu, IconButton, ListItemIcon, Box,
//     Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
//     CircularProgress, Paper, Autocomplete,
//     Dialog, DialogTitle, DialogContent, DialogActions, Chip
// } from '@mui/material';
// import { keyframes, styled } from '@mui/material/styles';
// import {
//     IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconEye, IconX, IconFileText, IconFileSpreadsheet, IconReload
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
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import Logo from 'src/assets/images/logos/logo.png';
// import DeleteReceiptsSendedFromStore from "./DeleteReceiptsSendedFromStore";
// import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import Excel from 'exceljs';
// import { saveAs } from 'file-saver';

// // --- Styled Components ---
// const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
//     fontFamily: 'NotoSans',
//     fontSize: '0.8rem',
//     [theme.breakpoints.up('md')]: {
//         fontSize: '1rem',
//     },
// }));

// const blinkAnimation = keyframes`
//   0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
//   50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
//   100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
// `;

// const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
//     animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
//     transition: 'transform 0.3s ease-in-out',
// }));

// // --- Type Definitions ---
// interface UnitType { id: string; title: string; }
// interface ItemType { id: string; name: string; abbreviation?: string; unit: UnitType; }
// interface WarehouseType { id: string; name: string; code: string; recordStatus?: number; status?: 'Aktif' | 'Pasif'; }

// interface StoreDispatchHeaders {
//     id: string;         // "15"
//     code: string;       // "000009"
//     docDate?: string;
// }

// interface StoreDispatchDetail {
//     id: string;                // "16"
//     quantity: string;          // sevk miktarı
//     createAt?: string;
//     recordStatus?: number;
//     description?: string;
//     storeDispatchHeaders: StoreDispatchHeaders;
// }

// interface ReceiptDetailType {
//     id: string;
//     quantity: string;          // رسیدشده
//     description: string;
//     item: ItemType;
//     storeDispatchDetail: StoreDispatchDetail;
// }

// interface SendedReceiptType {
//     id: string;
//     code: string;
//     docDate: string;
//     createAt: string;
//     recordStatus: number;
//     receiptDetails: ReceiptDetailType[];
//     warehouse: WarehouseType;
//     statusText?: 'Aktif' | 'Pasif';
//     statusColor?: 'success' | 'error';
// }

// // برای فرم
// interface DispatchDetailInfo {
//     id: string;               // StoreDispatchDetailId
//     quantity: string;         // sevk miktarı (max)
//     description: string;
//     item: ItemType;
//     dispatchCode: string;     // storeDispatchHeaders.code
//     dispatchId: string;       // storeDispatchHeaders.id
// }

// interface FormReceiptDetail {
//     itemId: number;
//     quantity: number | string;      // رسیدی که کاربر وارد می‌کند
//     description: string;
//     StoreDispatchDetailId: number;
//     item?: ItemType;
//     dispatchCode?: string;
//     maxDispatchQuantity: number;    // از sevk
//     StoreDispatchId: number;        // داخلی، در payload ارسال نمی‌شود
// }

// interface NewReceiptData {
//     docDate: string;
//     warehouseId: number;
//     receiptDetails: {
//         itemId: number;
//         quantity: number;
//         description: string;
//         StoreDispatchDetailId: number;
//     }[];
// }

// interface EditReceiptData extends NewReceiptData {
//     id: number;
//     code: string;
// }

// interface ApiResponse<T> {
//     success: boolean;
//     httpStatusCode: number;
//     message: string;
//     data: T;
// }

// // --- Utility Functions ---
// const formatDateDisplay = (dateString: string | null): string => {
//     if (!dateString) return "N/A";
//     try {
//         const date = new Date(dateString);
//         return format(date, 'dd MMMM yyyy', { locale: tr });
//     } catch {
//         return "Geçersiz Tarih";
//     }
// };

// const getStatus = (recordStatus: number): { text: 'Aktif' | 'Pasif', color: 'success' | 'error' } => {
//     return recordStatus === 0 ? { text: 'Aktif', color: 'success' } : { text: 'Pasif', color: 'error' };
// };

// // --- PDF helpers ---
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

//     if (subtitle) doc.text(subtitle, 70, 52);
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
//     companyInfo.forEach(line => {
//         doc.text(line, pageWidth / 2, footerY, { align: 'center' });
//         footerY += 4;
//     });
//     doc.setFontSize(10);
//     doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//     doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//     const docAny = doc as any;
//     const pageCount = docAny.internal.getNumberOfPages();
//     doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
// };

// const exportReceiptsToPdf = (data: SendedReceiptType[], title: string, subtitle?: string) => {
//     if (!data || data.length === 0) throw new Error('PDF oluşturulacak veri bulunamadı.');

//     const doc = new jsPDF();
//     const docAny = doc as any;
//     let yPos = 55;

//     data.forEach((receipt, index) => {
//         if (index > 0) { doc.addPage(); yPos = 55; }
//         addPdfHeader(doc, title, subtitle);

//         doc.setFontSize(10);
//         doc.text(`Giriş Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
//         doc.text(`Belge Kodu: ${receipt.code || '-'}`, 15, yPos + 5);
//         doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos + 10);
//         yPos += 20;

//         const detailsRows = (receipt.receiptDetails || []).map(d => [
//             d.item?.name || '-',
//             d.quantity,
//             d.item?.unit?.title || '-',
//             d.description || '-',
//             d.storeDispatchDetail?.storeDispatchHeaders?.code || '-' // Sevk Kodu
//         ]);

//         const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
//         const totalQuantity = (receipt.receiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);

//         autoTable(docAny, {
//             startY: yPos,
//             head: [columns],
//             body: detailsRows,
//             theme: 'grid',
//             styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
//             headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//             didDrawPage: () => { addPdfFooter(doc); }
//         });

//         const finalY = docAny.lastAutoTable.finalY || yPos;
//         doc.setFontSize(10);
//         doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);
//     });

//     doc.save(`${title.replace(/ /g, '_')}.pdf`);
// };

// // --- Excel helpers ---
// const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
//     worksheet.views = [{ rightToLeft: true }];
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

// const exportReceiptsToExcel = async (data: SendedReceiptType[], title: string) => {
//     if (!data || data.length === 0) throw new Error('Excel oluşturulacak veri bulunamadı.');

//     const workbook = new Excel.Workbook();

//     data.forEach(receipt => {
//         const worksheetTitle = `Giriş_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_');
//         const ws = workbook.addWorksheet(worksheetTitle);

//         const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
//         const totalColumns = detailsColumns.length;

//         addExcelHeader(ws, title, totalColumns);

//         ws.addRow([`Belge Kodu:`, receipt.code]);
//         ws.addRow([`Giriş Depo:`, receipt.warehouse?.name || '-']);
//         ws.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
//         ws.addRow([]);

//         const headerRow = ws.addRow(detailsColumns);
//         headerRow.font = { name: 'NotoSans', bold: true };
//         headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

//         (receipt.receiptDetails || []).forEach(d => {
//             ws.addRow([
//                 d.item?.name || '-',
//                 d.quantity,
//                 d.item?.unit?.title || '-',
//                 d.description || '-',
//                 d.storeDispatchDetail?.storeDispatchHeaders?.code || '-',
//             ]);
//         });

//         const totalQuantity = (receipt.receiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
//         const totalRow = ws.addRow([`Toplam Miktar`, totalQuantity, '', '', '']);
//         totalRow.font = { name: 'NotoSans', bold: true };
//         totalRow.getCell(2).numFmt = '0';

//         ws.addRow([]);
//         addExcelCompanyInfo(ws, ws.lastRow!.number + 2, totalColumns);
//     });

//     const fileName = `${title.replace(/ /g, '_')}.xlsx`;
//     const buffer = await workbook.xlsx.writeBuffer();
//     saveAs(new Blob([buffer]), fileName);
// };

// // --- Main Component ---
// const ListReceiptsSendedFromStore = () => {
//     const navigate = useNavigate();
//     const authToken = localStorage.getItem('authToken');

//     // --- State ---
//     const [docDate, setDocDate] = useState<Date | null>(new Date());
//     const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

//     const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
//     const [receiptList, setReceiptList] = useState<SendedReceiptType[]>([]);
//     const [displayedReceipts, setDisplayedReceipts] = useState<SendedReceiptType[]>([]);

//     const [loadingData, setLoadingData] = useState(true);
//     const [loadingButton, setLoadingButton] = useState(false);
//     const [isFormValid, setIsFormValid] = useState(false);

//     const [alertMessage, setAlertMessage] = useState<string | null>(null);
//     const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(5);
//     const [searchTerm, setSearchTerm] = useState('');

//     const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//     const [selectedRowForMenu, setSelectedRowForMenu] = useState<SendedReceiptType | null>(null);

//     const [editingId, setEditingId] = useState<string | null>(null);
//     const [editingCode, setEditingCode] = useState<string | null>(null);

//     const [docDateError, setDocDateError] = useState<boolean>(false);
//     const [warehouseIdError, setWarehouseIdError] = useState<boolean>(false);
//     const [receiptDetailsError, setReceiptDetailsError] = useState<boolean>(false);

//     const [removedReceiptDetails, setRemovedReceiptDetails] = useState<FormReceiptDetail[]>([]);

//     const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
//     const [dispatchDetailsInfo, setDispatchDetailsInfo] = useState<DispatchDetailInfo[]>([]);

//     const [openDeleteModal, setOpenDeleteModal] = useState(false);
//     const [receiptIdToDelete, setReceiptIdToDelete] = useState<string | null>(null);
//     const [receiptCodeToDelete, setReceiptCodeToDelete] = useState<string>('');

//     const [openDetailsModal, setOpenDetailsModal] = useState(false);
//     const [detailsToShow, setDetailsToShow] = useState<ReceiptDetailType[]>([]);

//     const [isFilterActive, setIsFilterActive] = useState(false);
//     const [startDate, setStartDate] = useState<Date | null>(null);
//     const [endDate, setEndDate] = useState<Date | null>(null);

//     const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
//     const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
//     const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
//     const [selectedReceiptForDownload, setSelectedReceiptForDownload] = useState<SendedReceiptType | null>(null);

//     const [isFormVisible, setIsFormVisible] = useState(false);
//     const [isBlinking, setIsBlinking] = useState(true);

//     const { isTooltipGloballyEnabled } = useTooltip();
//     const { allowedOperations } = useAuth();

//     const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
//     const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
//     const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
//     const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

//     // --- Helpers ---
//     const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//         setAlertMessage(message);
//         setAlertSeverity(severity);
//         setTimeout(() => { setAlertMessage(null); }, 5000);
//     }, []);

//     const fetchWarehouses = useCallback(async () => {
//         const token = localStorage.getItem('authToken');
//         if (!token) { navigate("/"); return []; }
//         try {
//             const response = await axios.get<ApiResponse<WarehouseType[]>>(
//                 server.baseurl + server.initialoperations + "get-warehouses",
//                 { headers: { "Authorization": `Bearer ${token}` } }
//             );
//             if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
//                 const activeWarehouses = response.data.data.filter(s => s.recordStatus === 0).map(s => ({ ...s, id: String(s.id) }));
//                 setWarehouses(activeWarehouses);
//                 return activeWarehouses;
//             } else {
//                 showAlert(response.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error');
//                 return [];
//             }
//         } catch {
//             showAlert('Depolar yüklenirken bir hata oluştu.', 'error');
//             return [];
//         }
//     }, [showAlert, navigate]);

//     const loadReceiptDetailsFromDispatchInfo = useCallback(() => {
//         if (dispatchDetailsInfo.length === 0) {
//             setReceiptDetails([]);
//             return;
//         }
//         const newDetails: FormReceiptDetail[] = dispatchDetailsInfo.map(info => ({
//             itemId: Number(info.item.id),
//             quantity: Number(info.quantity),
//             description: info.description || '',
//             StoreDispatchDetailId: Number(info.id),
//             item: info.item,
//             dispatchCode: info.dispatchCode,
//             maxDispatchQuantity: Number(info.quantity),
//             StoreDispatchId: Number(info.dispatchId),
//         }));
//         setReceiptDetails(newDetails);
//     }, [dispatchDetailsInfo]);

//     const handleLoadDispatchDetails = () => {
//         if (!selectedWarehouseId) {
//             showAlert('Lütfen Giriş Depo alanını doldurun.', 'warning');
//             return;
//         }
//         if (dispatchDetailsInfo.length === 0) {
//             showAlert('Sevk detayı bulunamadı. Lütfen filtreleri kontrol edin.', 'warning');
//             return;
//         }
//         loadReceiptDetailsFromDispatchInfo();
//     };

//     // dispatch details fetcher (uyumlu)
//     const fetchDispatchDetails = useCallback(async (warehouseId: string) => {
//         if (!authToken) { navigate("/"); return []; }
//         setLoadingData(true);
//         if (!warehouseId) { setLoadingData(false); return []; }

//         try {
//             const response = await axios.get<ApiResponse<any[]>>(
//                 `${server.baseurl}${server.warehouse}get-store-dispatches-by-center-id/${warehouseId}`,
//                 { headers: { Authorization: `Bearer ${authToken}` } }
//             );

//             if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
//                 const formattedDetails: DispatchDetailInfo[] = response.data.data.flatMap((dispatch: any) =>
//                     (dispatch.storeDispatchDetails || []).map((detail: any) => ({
//                         id: String(detail.id),
//                         quantity: String(detail.quantity),
//                         description: String(detail.description || ''),
//                         item: detail.item,
//                         dispatchCode: dispatch.code,
//                         dispatchId: String(dispatch.id),
//                     }))
//                 );
//                 setDispatchDetailsInfo(formattedDetails);
//                 return formattedDetails;
//             } else {
//                 setDispatchDetailsInfo([]);
//                 showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'warning');
//                 return [];
//             }
//         } catch {
//             setDispatchDetailsInfo([]);
//             showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
//             return [];
//         } finally {
//             setLoadingData(false);
//         }
//     }, [showAlert, authToken, navigate]);

//     // İlk yükleme
//     const fetchInitialData = useCallback(async () => {
//         setLoadingData(true);
//         if (!authToken) { navigate("/"); setLoadingData(false); return; }

//         try {
//             await Promise.all([fetchWarehouses()]);

//             const receiptsRes = await axios.get<ApiResponse<SendedReceiptType[]>>(
//                 server.baseurl + server.warehouse + `get-Receipt-sended-from-store-to-warehouse`,
//                 { headers: { "Authorization": `Bearer ${authToken}` } }
//             );

//             if (receiptsRes.data?.httpStatusCode === 200) {
//                 const allReceipts = receiptsRes.data.data;
//                 const formattedReceipts = allReceipts.map(d => ({
//                     ...d,
//                     ...getStatus(d.recordStatus)
//                 }));
//                 setReceiptList(formattedReceipts);
//             } else {
//                 showAlert(receiptsRes.data?.message || 'Giriş belgeleri yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch {
//             showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingData(false);
//         }
//     }, [navigate, showAlert, authToken, fetchWarehouses]);

//     useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

//     // فیلتر نمایش (با نرمال‌سازی تاریخ)
//     useEffect(() => {
//         const normalizedStart = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
//         const normalizedEnd = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

//         const filteredReceipts = receiptList.filter(r => {
//             const matchesSearch =
//                 r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 (r.warehouse?.name && r.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

//             const rDocDate = new Date(r.docDate);
//             const startCheck = !normalizedStart || rDocDate >= normalizedStart;
//             const endCheck = !normalizedEnd || rDocDate <= normalizedEnd;

//             return matchesSearch && startCheck && endCheck;
//         });

//         setDisplayedReceipts(filteredReceipts);
//         setPage(0);
//     }, [receiptList, searchTerm, startDate, endDate]);

//     // اعتبارسنجی فرم (بدون اجبار StoreDispatchId طبق ساختار Create/Update)
//     useEffect(() => {
//         const isValid =
//             !!selectedWarehouseId &&
//             !!docDate &&
//             receiptDetails.length > 0 &&
//             receiptDetails.every(d =>
//                 d.itemId > 0 &&
//                 d.StoreDispatchDetailId > 0 &&
//                 Number(d.quantity) > 0 &&
//                 Number(d.quantity) <= d.maxDispatchQuantity
//             );
//         setIsFormValid(isValid);
//     }, [selectedWarehouseId, docDate, receiptDetails]);

//     useEffect(() => {
//         const hasSearch = searchTerm.trim() !== '';
//         const hasDateFilter = startDate !== null || endDate !== null;
//         setIsFilterActive(hasSearch || hasDateFilter);
//     }, [searchTerm, startDate, endDate]);

//     useEffect(() => {
//         const timer = setTimeout(() => { setIsBlinking(false); }, 5000);
//         return () => { clearTimeout(timer); };
//     }, []);

//     const validateForm = (): boolean => {
//         let isValid = true;
//         if (!selectedWarehouseId) { setWarehouseIdError(true); isValid = false; } else { setWarehouseIdError(false); }
//         if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }

//         if (receiptDetails.length === 0) {
//             setReceiptDetailsError(true);
//             isValid = false;
//         } else {
//             const ok = receiptDetails.every((detail) => {
//                 const numQuantity = Number(detail.quantity);
//                 const maxQuantity = Number(detail.maxDispatchQuantity);

//                 if (isNaN(numQuantity) || numQuantity <= 0) return false;
//                 if (numQuantity > maxQuantity) return false;

//                 // طبق ساختار شما، در Create/Update فقط StoreDispatchDetailId لازم است
//                 if (detail.StoreDispatchDetailId <= 0) return false;
//                 if (detail.itemId <= 0) return false;

//                 return true;
//             });

//             if (!ok) {
//                 setReceiptDetailsError(true);
//                 isValid = false;
//             } else {
//                 setReceiptDetailsError(false);
//             }
//         }

//         if (!isValid) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
//         return isValid;
//     };

//     const resetFormAndState = () => {
//         setDocDate(new Date());
//         setSelectedWarehouseId(null);
//         setReceiptDetails([]);
//         setEditingId(null);
//         setEditingCode(null);
//         setDispatchDetailsInfo([]);
//         setDocDateError(false);
//         setWarehouseIdError(false);
//         setReceiptDetailsError(false);
//         setIsFormVisible(false);
//         setRemovedReceiptDetails([]);
//     };

//     // --- CRUD ---
//     const insertReceipt = async () => {
//         if (!validateForm()) return;
//         setLoadingButton(true);
//         if (!authToken) { navigate("/"); return; }

//         try {
//             const payload: NewReceiptData = {
//                 docDate: docDate?.toISOString() || new Date().toISOString(),
//                 warehouseId: Number(selectedWarehouseId),
//                 receiptDetails: receiptDetails.map(d => ({
//                     itemId: d.itemId,
//                     quantity: Number(d.quantity),
//                     description: d.description,
//                     StoreDispatchDetailId: d.StoreDispatchDetailId,
//                 }))
//             };

//             const response = await axios.post(
//                 server.baseurl + server.warehouse + "create-receipt-sended-from-store-to-warehouse",
//                 payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });

//             if (response.data.httpStatusCode === 201) {
//                 showAlert('Yeni giriş belgesi başarıyla eklendi!', 'success');
//                 resetFormAndState();
//                 fetchInitialData();
//             } else {
//                 showAlert(response.data.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const editReceipt = async () => {
//         if (!validateForm() || !editingId) return;
//         setLoadingButton(true);
//         if (!authToken) { navigate("/"); return; }

//         try {
//             const payload: EditReceiptData = {
//                 id: Number(editingId),
//                 code: editingCode!,
//                 docDate: docDate?.toISOString() || new Date().toISOString(),
//                 warehouseId: Number(selectedWarehouseId),
//                 receiptDetails: receiptDetails.map(d => ({
//                     itemId: d.itemId,
//                     quantity: Number(d.quantity),
//                     description: d.description,
//                     StoreDispatchDetailId: d.StoreDispatchDetailId,
//                 }))
//             };

//             const response = await axios.put(
//                 server.baseurl + server.warehouse + "update-receipt-sended-from-store-to-warehouse",
//                 payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });

//             if (response.data.httpStatusCode === 200) {
//                 showAlert('Giriş belgesi başarıyla güncellendi!', 'success');
//                 resetFormAndState();
//                 fetchInitialData();
//             } else {
//                 showAlert(response.data.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response && e.response.status === 500) {
//                 showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
//             } else if (e.response && e.response.status === 401) {
//                 localStorage.removeItem('authToken');
//                 showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
//                 navigate("/");
//             } else {
//                 showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//             }
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const handleEditClick = async () => {
//         if (!selectedRowForMenu) return;
//         setLoadingData(true);
//         try {
//             const destinationWarehouseId = selectedRowForMenu.warehouse.id;
//             if (!destinationWarehouseId) {
//                 showAlert('Düzenleme için gereken depo bilgisi eksik.', 'error');
//                 setLoadingData(false);
//                 return;
//             }

//             const fetchedDispatchDetails = await fetchDispatchDetails(destinationWarehouseId);

//             const dispatchDetailMap = new Map<number, DispatchDetailInfo>();
//             fetchedDispatchDetails.forEach(info => {
//                 dispatchDetailMap.set(Number(info.id), info);
//             });

//             const formattedDetails: FormReceiptDetail[] = (selectedRowForMenu.receiptDetails || []).map(d => {
//                 const sdd = d.storeDispatchDetail;
//                 const originalDispatchDetailId = sdd ? Number(sdd.id) : 0;

//                 const dispatchInfo = dispatchDetailMap.get(originalDispatchDetailId);

//                 const maxAllowedQty = dispatchInfo
//                     ? Number(dispatchInfo.quantity)
//                     : (sdd?.quantity ? Number(sdd.quantity) : Number(d.quantity));

//                 const dispatchId = dispatchInfo
//                     ? Number(dispatchInfo.dispatchId)
//                     : (sdd?.storeDispatchHeaders?.id ? Number(sdd.storeDispatchHeaders.id) : 0);

//                 const dispatchCode = dispatchInfo
//                     ? dispatchInfo.dispatchCode
//                     : (sdd?.storeDispatchHeaders?.code || 'N/A');

//                 return {
//                     itemId: Number(d.item.id),
//                     quantity: Number(d.quantity),
//                     description: d.description || '',
//                     StoreDispatchDetailId: originalDispatchDetailId,
//                     item: d.item,
//                     dispatchCode,
//                     maxDispatchQuantity: maxAllowedQty,
//                     StoreDispatchId: dispatchId,
//                 };
//             });

//             setReceiptDetails(formattedDetails);
//             setEditingId(selectedRowForMenu.id);
//             setEditingCode(selectedRowForMenu.code);
//             setDocDate(new Date(selectedRowForMenu.docDate));
//             setSelectedWarehouseId(Number(destinationWarehouseId));
//             setIsFormVisible(true);
//             handleCloseMenu();
//         } catch {
//             showAlert('Düzenleme için veri hazırlanırken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingData(false);
//         }
//     };

//     const handleCancelEdit = () => { resetFormAndState(); };

//     const handleClickOpenDeleteModal = () => {
//         if (selectedRowForMenu) {
//             setReceiptIdToDelete(selectedRowForMenu.id);
//             setReceiptCodeToDelete(selectedRowForMenu.code);
//             setOpenDeleteModal(true);
//         }
//         handleCloseMenu();
//     };

//     const handleCloseDeleteModal = () => {
//         setOpenDeleteModal(false);
//         setReceiptIdToDelete(null);
//         setReceiptCodeToDelete('');
//         fetchInitialData();
//     };

//     const handleCloseMenu = () => {
//         setAnchorEl(null);
//         setSelectedRowForMenu(null);
//     };

//     const handleDispatchDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
//         setReceiptDetails(prev => {
//             const newDetails = [...prev];
//             const updatedDetail = { ...newDetails[index] };
//             const maxQuantity = Number(updatedDetail.maxDispatchQuantity);

//             if (field === 'quantity') {
//                 const numValue = Number(value);
//                 if (isNaN(numValue) || numValue < 0) {
//                     showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
//                     updatedDetail.quantity = 0;
//                 }
//                 else if (numValue > maxQuantity) {
//                     showAlert(`Girdiğiniz miktar sevk miktarından (${maxQuantity}) fazla olamaz!`, 'warning');
//                     updatedDetail.quantity = maxQuantity;
//                 }
//                 else {
//                     updatedDetail.quantity = numValue;
//                 }
//             }
//             else if (field === 'description') {
//                 updatedDetail.description = value;
//             }

//             newDetails[index] = updatedDetail;
//             return newDetails;
//         });
//     }, [showAlert]);

//     const handleDownload = async (format: 'pdf' | 'excel', isFiltered: boolean) => {
//         const dataToDownload = isFiltered ? displayedReceipts : receiptList;
//         const title = isFiltered ? 'Filtrelenmiş Depo Giriş Raporu' : 'Tüm Depo Giriş Raporu';

//         const end = endDate || new Date();
//         const subtitle = isFiltered
//             ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(end.toISOString())}`
//             : undefined;

//         showAlert('Rapor oluşturuluyor...', 'info');
//         try {
//             if (format === 'pdf') {
//                 exportReceiptsToPdf(dataToDownload, title, subtitle);
//             } else {
//                 await exportReceiptsToExcel(dataToDownload, title);
//             }
//             showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
//         } catch (e: any) {
//             showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error');
//         }
//     };

//     const handleOpenRowDownloadModal = (receipt: SendedReceiptType) => {
//         setSelectedReceiptForDownload(receipt);
//         setOpenRowDownloadModal(true);
//         handleCloseMenu();
//     };

//     const handleDownloadSingleReceipt = async (format: 'pdf' | 'excel') => {
//         if (!selectedReceiptForDownload) return;
//         const data = [selectedReceiptForDownload];
//         const title = `Giriş Belgesi Detayları: ${selectedReceiptForDownload.code}`;

//         showAlert('Rapor oluşturuluyor...', 'info');
//         try {
//             if (format === 'pdf') {
//                 exportReceiptsToPdf(data, title);
//             } else {
//                 await exportReceiptsToExcel(data, title);
//             }
//             showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
//         } catch (e: any) {
//             showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error');
//         } finally {
//             setOpenRowDownloadModal(false);
//         }
//     };

//     const handleClearDateFilters = () => {
//         setStartDate(null);
//         setEndDate(null);
//     };

//     const handleRemoveReceiptDetail = useCallback((index: number) => {
//         setReceiptDetails(prev => {
//             const removed = prev[index];
//             if (!removed) return prev;
//             setRemovedReceiptDetails(p => [...p, removed]);
//             return prev.filter((_, i) => i !== index);
//         });
//         setTimeout(() => {
//             if (receiptDetails.length - 1 === 0) {
//                 setReceiptDetailsError(true);
//             }
//         }, 0);
//     }, [receiptDetails.length]);

//     const handleRestoreRemovedDetail = useCallback((indexToRestore: number) => {
//         const itemToRestore = removedReceiptDetails[indexToRestore];
//         if (itemToRestore) {
//             setReceiptDetails(prev => [...prev, itemToRestore]);
//             setRemovedReceiptDetails(prev => prev.filter((_, i) => i !== indexToRestore));
//             setReceiptDetailsError(false);
//         }
//     }, [removedReceiptDetails]);

//     // --- Render ---
//     return (
//         <Box mt={2}>
//             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
//                 <Typography variant="h5">Depoya Gelen Sevk Giriş İşlemleri</Typography>

//                 <Stack
//                     direction={{ xs: 'column', md: 'row' }}
//                     spacing={2}
//                     alignItems="stretch"
//                     flexGrow={1}
//                     justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
//                 >
//                     {!isFormVisible && hasCreatePermission && (
//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Giriş Belgesi kaydetmek için tıklayınız" : ""}>
//                             <BlinkingButton
//                                 variant="contained"
//                                 color="primary"
//                                 onClick={() => setIsFormVisible(true)}
//                                 isBlinking={isBlinking}
//                                 fullWidth={false}
//                                 startIcon={<IconPlus />}
//                             >
//                                 Yeni Giriş Kaydet
//                             </BlinkingButton>
//                         </CustomTooltip>
//                     )}
//                     {isFormVisible && (
//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
//                             <Button
//                                 variant="contained"
//                                 color="error"
//                                 onClick={resetFormAndState}
//                                 disabled={loadingButton}
//                                 fullWidth={false}
//                                 startIcon={<IconX size={20} />}
//                             >
//                                 Gizle
//                             </Button>
//                         </CustomTooltip>
//                     )}
//                 </Stack>
//             </Stack>

//             {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
//                 <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h5" mb={2}>{editingId ? 'Depo Giriş Belgesini Düzenle' : 'Yeni Depo Giriş Belgesi'}</Typography>
//                     <Grid container spacing={2}>
//                         {/* Giriş Depo */}
//                         <Grid item xs={12} sm={6}>
//                             <CustomFormLabel required>Giriş Depo</CustomFormLabel>
//                             <Autocomplete
//                                 id="warehouse-select"
//                                 options={warehouses.filter(w => w.recordStatus === 0)}
//                                 getOptionLabel={(option) => option.name}
//                                 value={warehouses.find(w => Number(w.id) === selectedWarehouseId) || null}
//                                 onChange={async (_, newValue) => {
//                                     const newWarehouseId = newValue ? Number(newValue.id) : null;
//                                     setSelectedWarehouseId(newWarehouseId);
//                                     setReceiptDetails([]);
//                                     if (newWarehouseId) {
//                                         const details = await fetchDispatchDetails(newValue!.id);
//                                         if (!editingId && details.length === 0) {
//                                             showAlert('Bu depoya teslim edilecek aktif sevk detayı bulunamadı.', 'warning');
//                                         }
//                                     } else {
//                                         setDispatchDetailsInfo([]);
//                                         setReceiptDetails([]);
//                                     }
//                                     if (warehouseIdError && newValue) setWarehouseIdError(false);
//                                 }}
//                                 isOptionEqualToValue={(option, value) => option.id === value.id}
//                                 renderInput={(params) => (
//                                     <TextField
//                                         {...params}
//                                         fullWidth
//                                         size="small"
//                                         placeholder="Giriş Depo Seçin"
//                                         error={warehouseIdError}
//                                         helperText={warehouseIdError ? "Depo seçimi zorunludur!" : ""}
//                                     />
//                                 )}
//                             />
//                         </Grid>
//                         {/* Belge Tarihi */}
//                         <Grid item xs={12} sm={6}>
//                             <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
//                             <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                 <DatePicker
//                                     value={docDate}
//                                     onChange={(newValue) => {
//                                         setDocDate(newValue);
//                                         if (docDateError && newValue) setDocDateError(false);
//                                     }}
//                                     inputFormat="dd/MM/yyyy"
//                                     renderInput={(params) => (
//                                         <TextField
//                                             {...params}
//                                             fullWidth
//                                             size="small"
//                                             error={docDateError}
//                                             helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""}
//                                         />
//                                     )}
//                                 />
//                             </LocalizationProvider>
//                         </Grid>
//                     </Grid>

//                     <Box mt={4}>
//                         <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
//                             <Typography variant="h6">Giriş Detayları</Typography>
//                             <Button
//                                 variant="outlined"
//                                 startIcon={<IconPlus />}
//                                 onClick={handleLoadDispatchDetails}
//                                 disabled={!selectedWarehouseId || loadingData || receiptDetails.length > 0}
//                             >
//                                 Sevk Detaylarını Yükle
//                             </Button>
//                         </Stack>

//                         {removedReceiptDetails.length > 0 && (
//                             <Box sx={{
//                                 border: '1px dashed',
//                                 borderColor: "error.main",
//                                 p: 2,
//                                 mb: 2,
//                                 mt: 2,
//                                 borderRadius: 1,
//                                 backgroundColor: 'rgba(255, 0, 0, 0.05)'
//                             }}>
//                                 <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler (Geri Yüklemek İçin Tıklayın)</Typography>
//                                 <Stack direction="row" spacing={1} flexWrap="wrap">
//                                     {removedReceiptDetails.map((detail, index) => (
//                                         <Chip
//                                             key={index}
//                                             label={`${detail?.item?.name || 'Ürün'} (${detail.quantity} ${detail?.item?.unit?.title || 'Birim'})`}
//                                             color="error"
//                                             variant="outlined"
//                                             onClick={() => handleRestoreRemovedDetail(index)}
//                                             onDelete={() => handleRestoreRemovedDetail(index)}
//                                             deleteIcon={<IconReload size={18} />}
//                                         />
//                                     ))}
//                                 </Stack>
//                             </Box>
//                         )}

//                         {loadingData && selectedWarehouseId ? (
//                             <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
//                                 <CircularProgress size={24} />
//                                 <Typography variant="caption" sx={{ ml: 1 }}>Sevk detayları yükleniyor...</Typography>
//                             </Box>
//                         ) : (
//                             <Grid container spacing={2}>
//                                 {receiptDetails.length === 0 && selectedWarehouseId && !editingId ? (
//                                     <Grid item xs={12}>
//                                         <Alert severity="info">Yüklenecek sevk detayı bulunamadı veya butona basmadınız.</Alert>
//                                     </Grid>
//                                 ) : (
//                                     receiptDetails.map((detail, index) => {
//                                         const maxQuantity = detail.maxDispatchQuantity;
//                                         const itemLabel = detail.item?.name || 'Ürün Adı Bulunamadı';
//                                         const unitLabel = detail.item?.unit?.title || 'Birim';
//                                         const balanceDisplay = `Max: ${maxQuantity}`;

//                                         return (
//                                             <Grid item xs={12} key={index}>
//                                                 <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
//                                                     <Stack direction="row" spacing={1} alignItems="center">
//                                                         <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
//                                                             {itemLabel}
//                                                         </Typography>
//                                                         <Chip label={unitLabel} color="success" size="small" />
//                                                         <Chip label={`Sevk Kodu: ${detail.dispatchCode}`} color="info" size="small" />
//                                                     </Stack>
//                                                     <Grid container spacing={2}>
//                                                         <Grid item xs={12} sm={4} md={3}>
//                                                             <CustomTextField
//                                                                 type="number"
//                                                                 label={`Miktar`}
//                                                                 placeholder="Miktar"
//                                                                 value={detail.quantity}
//                                                                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
//                                                                 fullWidth
//                                                                 size="small"
//                                                                 InputProps={{
//                                                                     endAdornment: (
//                                                                         <InputAdornment position="end">
//                                                                             {balanceDisplay}
//                                                                         </InputAdornment>
//                                                                     ),
//                                                                     inputProps: { min: 0 }
//                                                                 }}
//                                                                 error={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(maxQuantity))}
//                                                                 helperText={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(maxQuantity)) ? `Max: ${maxQuantity}` : ""}
//                                                             />
//                                                         </Grid>
//                                                         <Grid item xs={11} sm={7} md={8}>
//                                                             <CustomTextField
//                                                                 label="Açıklama"
//                                                                 placeholder="Açıklama"
//                                                                 value={detail.description}
//                                                                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
//                                                                 fullWidth
//                                                                 size="small"
//                                                             />
//                                                         </Grid>
//                                                         <Grid item xs={1} sm={1} md={1}>
//                                                             <IconButton
//                                                                 color="error"
//                                                                 size="small"
//                                                                 onClick={() => handleRemoveReceiptDetail(index)}
//                                                                 disabled={loadingButton}
//                                                                 aria-label="remove-detail"
//                                                             >
//                                                                 <IconTrash size={18} />
//                                                             </IconButton>
//                                                         </Grid>
//                                                     </Grid>
//                                                 </Paper>
//                                             </Grid>
//                                         );
//                                     })
//                                 )}
//                             </Grid>
//                         )}
//                         {receiptDetailsError && <Typography color="error" variant="caption" sx={{ mt: 1.5, ml: 1.5 }}>Lütfen مقادیر معتبر را برای تمامی ردیف ها وارد کنید.</Typography>}
//                     </Box>

//                     <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
//                         {editingId ? (
//                             <>
//                                 <Button variant="contained" color="info" onClick={editReceipt} disabled={loadingButton}>
//                                     {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
//                                 </Button>
//                                 <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
//                             </>
//                         ) : (
//                             hasCreatePermission && (
//                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak giriş belgesini kaydedin." : ""}>
//                                     <span>
//                                         <BlinkingButton
//                                             variant="contained"
//                                             color="success"
//                                             onClick={insertReceipt}
//                                             disabled={!isFormValid || loadingButton}
//                                             isBlinking={isFormValid && !loadingButton}
//                                         >
//                                             {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Giriş Belgesi Ekle'}
//                                         </BlinkingButton>
//                                     </span>
//                                 </CustomTooltip>
//                             )
//                         )}
//                     </Stack>
//                 </Paper>
//             )}

//             {alertMessage && (
//                 <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
//                     <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
//                 </Stack>
//             )}

//             <BlankCard>
//                 <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2} mb={2} mr={2}>
//                     {isFilterActive && hasDownloadPermission && (
//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle girişleri indirin" : ""}>
//                             <BlinkingButton
//                                 variant="contained"
//                                 color="secondary"
//                                 onClick={() => setOpenDownloadFilteredModal(true)}
//                                 startIcon={<IconFileDownload />}
//                                 isBlinking={true}
//                                 disabled={loadingData || displayedReceipts.length === 0}
//                             >
//                                 Filtrelenmişi İndir
//                             </BlinkingButton>
//                         </CustomTooltip>
//                     )}
//                     {hasDownloadPermission && (
//                         <Button
//                             variant="contained"
//                             color="primary"
//                             onClick={() => setOpenDownloadAllModal(true)}
//                             startIcon={<IconFileDownload />}
//                             disabled={loadingData || receiptList.length === 0}
//                         >
//                             Tümünü İndir
//                         </Button>
//                     )}
//                 </Stack>

//                 <Box sx={{ p: 2 }}>
//                     <Grid container spacing={2} alignItems="center">
//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 label="Giriş Belgesi Ara"
//                                 variant="outlined"
//                                 fullWidth
//                                 value={searchTerm}
//                                 onChange={(e) => setSearchTerm(e.target.value)}
//                                 InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
//                             />
//                         </Grid>
//                         <Grid item xs={12} sm={6} md={8}>
//                             <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                 <Stack direction="row" spacing={1} alignItems="center">
//                                     <DatePicker
//                                         label="Başlangıç Tarihi"
//                                         value={startDate}
//                                         inputFormat="dd/MM/yyyy"
//                                         onChange={(newValue) => setStartDate(newValue)}
//                                         renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                     />
//                                     <DatePicker
//                                         label="Bitiş Tarihi"
//                                         value={endDate}
//                                         inputFormat="dd/MM/yyyy"
//                                         onChange={(newValue) => setEndDate(newValue)}
//                                         renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                     />
//                                     <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
//                                         <IconX size={20} />
//                                     </IconButton>
//                                 </Stack>
//                             </LocalizationProvider>
//                         </Grid>
//                     </Grid>
//                 </Box>

//                 {loadingData ? (
//                     <Box display="flex" justifyContent="center" alignItems="center" height="200px">
//                         <CircularProgress />
//                         <Typography variant="h6" sx={{ ml: 2 }}>Depo giriş belgeleri yükleniyor...</Typography>
//                     </Box>
//                 ) : (
//                     <TableContainer component={Paper}>
//                         <Table aria-label="sended receipt table">
//                             <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
//                                 <TableRow>
//                                     <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
//                                     <StyledTableCell><Typography variant="h6">Giriş Depo</Typography></StyledTableCell>
//                                     <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
//                                     <StyledTableCell><Typography variant="h6">Detaylar</Typography></StyledTableCell>
//                                     <StyledTableCell></StyledTableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {displayedReceipts.length > 0 ? (
//                                     displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
//                                         <TableRow key={row.id}>
//                                             <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{row.warehouse?.name || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
//                                             <StyledTableCell>
//                                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
//                                                     <Button
//                                                         variant="outlined"
//                                                         startIcon={<IconEye />}
//                                                         onClick={() => {
//                                                             setDetailsToShow(row.receiptDetails || []);
//                                                             setOpenDetailsModal(true);
//                                                         }}
//                                                     >
//                                                         Görünüm
//                                                     </Button>
//                                                 </CustomTooltip>
//                                             </StyledTableCell>
//                                             <StyledTableCell>
//                                                 <IconButton
//                                                     aria-label="row-menu"
//                                                     onClick={(e) => {
//                                                         setSelectedRowForMenu(row);
//                                                         setAnchorEl(e.currentTarget);
//                                                     }}
//                                                 >
//                                                     <IconDots width={18} />
//                                                 </IconButton>
//                                                 <Menu
//                                                     anchorEl={anchorEl}
//                                                     open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
//                                                     onClose={handleCloseMenu}
//                                                 >
//                                                     {hasDownloadPermission && (
//                                                         <MuiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
//                                                             <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
//                                                             Bu satırı indir
//                                                         </MuiMenuItem>
//                                                     )}
//                                                     {hasEditPermission && (
//                                                         <MuiMenuItem onClick={handleEditClick}>
//                                                             <ListItemIcon><IconEdit width={18} /></ListItemIcon>
//                                                             Düzenle
//                                                         </MuiMenuItem>
//                                                     )}
//                                                     {hasDeletePermission && (
//                                                         <MuiMenuItem onClick={handleClickOpenDeleteModal}>
//                                                             <ListItemIcon><IconTrash width={18} /></ListItemIcon>
//                                                             Silmek
//                                                         </MuiMenuItem>
//                                                     )}
//                                                 </Menu>
//                                             </StyledTableCell>
//                                         </TableRow>
//                                     ))
//                                 ) : (
//                                     <TableRow>
//                                         <StyledTableCell colSpan={5} align="center">
//                                             <Typography variant="subtitle1" color="textSecondary">
//                                                 Hiç giriş belgesi bulunamadı.
//                                             </Typography>
//                                         </StyledTableCell>
//                                     </TableRow>
//                                 )}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                 )}

//                 <TablePagination
//                     rowsPerPageOptions={[5, 10, 25]}
//                     component="div"
//                     count={displayedReceipts.length}
//                     rowsPerPage={rowsPerPage}
//                     page={page}
//                     onPageChange={(_, newPage) => setPage(newPage)}
//                     onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
//                     labelRowsPerPage="Satır başına:"
//                 />
//             </BlankCard>

//             {/* Details Modal */}
//             <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
//                 <DialogTitle>Giriş Detayları</DialogTitle>
//                 <DialogContent>
//                     {detailsToShow.length > 0 ? (
//                         <TableContainer component={Paper}>
//                             <Table aria-label="Ürün detayları tablosu">
//                                 <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
//                                     <TableRow>
//                                         <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
//                                         <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
//                                     </TableRow>
//                                 </TableHead>
//                                 <TableBody>
//                                     {detailsToShow.map((detail, index) => (
//                                         <TableRow key={detail.id || index}>
//                                             <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{detail.quantity || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
//                                         </TableRow>
//                                     ))}
//                                     <TableRow sx={{ backgroundColor: 'rgb(240, 240, 240)' }}>
//                                         <StyledTableCell sx={{ fontWeight: 'bold' }}>Toplam Miktar:</StyledTableCell>
//                                         <StyledTableCell sx={{ fontWeight: 'bold' }}>
//                                             {detailsToShow.reduce((sum, detail) => sum + Number(detail.quantity), 0)}
//                                         </StyledTableCell>
//                                         <StyledTableCell></StyledTableCell>
//                                         <StyledTableCell></StyledTableCell>
//                                     </TableRow>
//                                 </TableBody>
//                             </Table>
//                         </TableContainer>
//                     ) : (
//                         <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
//                             Bu giriş belgesi için detay bulunamadı.
//                         </Typography>
//                     )}
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
//                 </DialogActions>
//             </Dialog>

//             {/* Download Modals */}
//             <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
//                 <DialogTitle>Tüm Giriş Belgelerini İndir</DialogTitle>
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

//             <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
//                 <DialogTitle>Filtrelenmiş Giriş Belgelerini İndir</DialogTitle>
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

//             <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
//                 <DialogTitle>Dosya Formatını Seçin</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileText />}
//                             onClick={() => handleDownloadSingleReceipt('pdf')}
//                         >
//                             PDF Olarak İndir
//                         </Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
//                             onClick={() => handleDownloadSingleReceipt('excel')}
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

//             {/* Delete */}
//             <DeleteReceiptsSendedFromStore
//                 openModal={openDeleteModal}
//                 onClose={handleCloseDeleteModal}
//                 receiptIdToDelete={receiptIdToDelete}
//                 receiptCodeToDelete={receiptCodeToDelete}
//                 onDeleteSuccess={() => fetchInitialData()}
//                 showAlert={showAlert}
//             />
//         </Box>
//     );
// };

// export default ListReceiptsSendedFromStore;

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, Autocomplete,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconEye, IconX, IconFileText, IconFileSpreadsheet, IconReload, IconBan
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
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import DeleteReceiptsSendedFromStore from "./DeleteReceiptsSendedFromStore";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

// --- Styled Components ---
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
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

// --- Type Definitions ---
interface UnitType { id: string; title: string; }
interface ItemType { id: string; name: string; abbreviation?: string; unit: UnitType; }
interface WarehouseType { id: string | number; name: string; code: string; recordStatus?: number; status?: 'Aktif' | 'Pasif'; }

interface StoreDispatchHeaders {
    id: string;
    code: string;
    docDate?: string;
}

interface StoreDispatchDetail {
    id: string;
    quantity: string;
    createAt?: string;
    recordStatus?: number;
    description?: string;
    storeDispatchHeaders: StoreDispatchHeaders;
}

interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
    storeDispatchDetail: StoreDispatchDetail;
}

interface SendedReceiptType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    isEnd: boolean | null; // 👈 اضافه شد
    receiptDetails: ReceiptDetailType[];
    warehouse: WarehouseType;
    statusText?: 'Aktif' | 'Pasif';
    statusColor?: 'success' | 'error';
}

// برای فرم
interface DispatchDetailInfo {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
    dispatchCode: string;
    dispatchId: string;
}

interface FormReceiptDetail {
    itemId: number;
    quantity: number | string;
    description: string;
    StoreDispatchDetailId: number;
    item?: ItemType;
    dispatchCode?: string;
    maxDispatchQuantity: number;
    StoreDispatchId: number;
}

interface NewReceiptData {
    docDate: string;
    warehouseId: number;
    receiptDetails: {
        itemId: number;
        quantity: number;
        description: string;
        StoreDispatchDetailId: number;
    }[];
}

interface EditReceiptData extends NewReceiptData {
    id: number;
    code: string;
}

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

// --- Utility Functions ---
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch {
        return "Geçersiz Tarih";
    }
};

const getStatus = (recordStatus: number): { text: 'Aktif' | 'Pasif', color: 'success' | 'error' } => {
    return recordStatus === 0 ? { text: 'Aktif', color: 'success' } : { text: 'Pasif', color: 'error' };
};

// --- PDF helpers ---
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

    if (subtitle) doc.text(subtitle, 70, 52);
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
        footerY += 4;
    });
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};

const exportReceiptsToPdf = (data: SendedReceiptType[], title: string, subtitle?: string) => {
    if (!data || data.length === 0) throw new Error('PDF oluşturulacak veri bulunamadı.');

    const doc = new jsPDF();
    const docAny = doc as any;
    let yPos = 55;

    data.forEach((receipt, index) => {
        if (index > 0) { doc.addPage(); yPos = 55; }
        addPdfHeader(doc, title, subtitle);

        doc.setFontSize(10);
        doc.text(`Giriş Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
        doc.text(`Belge Kodu: ${receipt.code || '-'}`, 15, yPos + 5);
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos + 10);
        yPos += 20;

        const detailsRows = (receipt.receiptDetails || []).map(d => [
            d.item?.name || '-',
            d.quantity,
            d.item?.unit?.title || '-',
            d.description || '-',
            d.storeDispatchDetail?.storeDispatchHeaders?.code || '-'
        ]);

        const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
        const totalQuantity = (receipt.receiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);

        autoTable(docAny, {
            startY: yPos,
            head: [columns],
            body: detailsRows,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: () => { addPdfFooter(doc); }
        });

        const finalY = docAny.lastAutoTable.finalY || yPos;
        doc.setFontSize(10);
        doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
};

// --- Excel helpers ---
const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
    worksheet.views = [{ rightToLeft: true }];
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

const exportReceiptsToExcel = async (data: SendedReceiptType[], title: string) => {
    if (!data || data.length === 0) throw new Error('Excel oluşturulacak veri bulunamadı.');

    const workbook = new Excel.Workbook();

    data.forEach(receipt => {
        const worksheetTitle = `Giriş_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_');
        const ws = workbook.addWorksheet(worksheetTitle);

        const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
        const totalColumns = detailsColumns.length;

        addExcelHeader(ws, title, totalColumns);

        ws.addRow([`Belge Kodu:`, receipt.code]);
        ws.addRow([`Giriş Depo:`, receipt.warehouse?.name || '-']);
        ws.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
        ws.addRow([]);

        const headerRow = ws.addRow(detailsColumns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        (receipt.receiptDetails || []).forEach(d => {
            ws.addRow([
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-',
                d.storeDispatchDetail?.storeDispatchHeaders?.code || '-',
            ]);
        });

        const totalQuantity = (receipt.receiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
        const totalRow = ws.addRow([`Toplam Miktar`, totalQuantity, '', '', '']);
        totalRow.font = { name: 'NotoSans', bold: true };
        totalRow.getCell(2).numFmt = '0';

        ws.addRow([]);
        addExcelCompanyInfo(ws, ws.lastRow!.number + 2, totalColumns);
    });

    const fileName = `${title.replace(/ /g, '_')}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};

// --- Main Component ---
const ListReceiptsSendedFromStore = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // --- State ---
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
    const [receiptList, setReceiptList] = useState<SendedReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<SendedReceiptType[]>([]);

    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<SendedReceiptType | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [warehouseIdError, setWarehouseIdError] = useState<boolean>(false);
    const [receiptDetailsError, setReceiptDetailsError] = useState<boolean>(false);

    const [removedReceiptDetails, setRemovedReceiptDetails] = useState<FormReceiptDetail[]>([]);

    const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
    const [dispatchDetailsInfo, setDispatchDetailsInfo] = useState<DispatchDetailInfo[]>([]);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<string | null>(null);
    const [receiptCodeToDelete, setReceiptCodeToDelete] = useState<string>('');

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [detailsToShow, setDetailsToShow] = useState<ReceiptDetailType[]>([]);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedReceiptForDownload, setSelectedReceiptForDownload] = useState<SendedReceiptType | null>(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    // --- New states for end/rehydrate flow ---
    const [openIsEndModal, setOpenIsEndModal] = useState(false);
    const [lastCreatedReceiptId, setLastCreatedReceiptId] = useState<number | null>(null);
    const [lastCreatedReceiptCode, setLastCreatedReceiptCode] = useState<string | null>(null);

    const [hiddenWarehouseIds, setHiddenWarehouseIds] = useState<Set<number>>(new Set()); // depoهایی که بعد از پایان، نباید در کمبو دیده شوند

    const [openInactiveModal, setOpenInactiveModal] = useState(false);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const ops = allowedOperations ?? [];
    const hasCreatePermission = useMemo(() => ops.some(op => op.systemOperationName === 'Eklemek'), [ops]);
    const hasEditPermission = useMemo(() => ops.some(op => op.systemOperationName === 'Düzenlemek'), [ops]);
    const hasDeletePermission = useMemo(() => ops.some(op => op.systemOperationName === 'Silmek'), [ops]);
    const hasDownloadPermission = useMemo(() => ops.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [ops]);

    // inactive invoices derived from receipt list (isEnd === true)
    type InactiveInvoice = { id: number; invoiceNo: string; docDate: string; warehouseId: number; };
    const inactiveInvoices: InactiveInvoice[] = useMemo(() => {
        return (receiptList || [])
            .filter(r => r.isEnd === true)
            .map(r => ({
                id: Number(r.id),
                invoiceNo: r.code,
                docDate: r.docDate,
                warehouseId: Number(r.warehouse?.id)
            }));
    }, [receiptList]);

    const inactiveCount = inactiveInvoices.length;

    // --- Helpers ---
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    const fetchWarehouses = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) { navigate("/"); return []; }
        try {
            const response = await axios.get<ApiResponse<WarehouseType[]>>(
                server.baseurl + server.initialoperations + "get-warehouses",
                { headers: { "Authorization": `Bearer ${token}` } }
            );
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const activeWarehouses = response.data.data
                    .filter(s => s.recordStatus === 0)
                    .map(s => ({ ...s, id: Number(s.id) })); // 👈 id را به number نگه داریم
                setWarehouses(activeWarehouses);
                return activeWarehouses;
            } else {
                showAlert(response.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error');
                return [];
            }
        } catch {
            showAlert('Depolar yüklenirken bir hata oluştu.', 'error');
            return [];
        }
    }, [showAlert, navigate]);

    const loadReceiptDetailsFromDispatchInfo = useCallback(() => {
        if (dispatchDetailsInfo.length === 0) {
            setReceiptDetails([]);
            return;
        }
        const newDetails: FormReceiptDetail[] = dispatchDetailsInfo.map(info => ({
            itemId: Number(info.item.id),
            quantity: Number(info.quantity),
            description: info.description || '',
            StoreDispatchDetailId: Number(info.id),
            item: info.item,
            dispatchCode: info.dispatchCode,
            maxDispatchQuantity: Number(info.quantity),
            StoreDispatchId: Number(info.dispatchId),
        }));
        setReceiptDetails(newDetails);
    }, [dispatchDetailsInfo]);

    const handleLoadDispatchDetails = () => {
        if (!selectedWarehouseId) {
            showAlert('Lütfen Giriş Depo alanını doldurun.', 'warning');
            return;
        }
        if (dispatchDetailsInfo.length === 0) {
            showAlert('Sevk detayı bulunamadı. Lütfen filtreleri kontrol edin.', 'warning');
            return;
        }
        loadReceiptDetailsFromDispatchInfo();
    };

    // dispatch details fetcher
    const fetchDispatchDetails = useCallback(async (warehouseId: number | string) => {
        if (!authToken) { navigate("/"); return []; }
        setLoadingData(true);
        if (!warehouseId) { setLoadingData(false); return []; }

        try {
            const response = await axios.get<ApiResponse<any[]>>(
                `${server.baseurl}${server.warehouse}get-store-dispatches-by-center-id/${warehouseId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const formattedDetails: DispatchDetailInfo[] = response.data.data.flatMap((dispatch: any) =>
                    (dispatch.storeDispatchDetails || []).map((detail: any) => ({
                        id: String(detail.id),
                        quantity: String(detail.quantity),
                        description: String(detail.description || ''),
                        item: detail.item,
                        dispatchCode: dispatch.code,
                        dispatchId: String(dispatch.id),
                    }))
                );
                setDispatchDetailsInfo(formattedDetails);
                return formattedDetails;
            } else {
                setDispatchDetailsInfo([]);
                showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'warning');
                return [];
            }
        } catch {
            setDispatchDetailsInfo([]);
            showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
            return [];
        } finally {
            setLoadingData(false);
        }
    }, [showAlert, authToken, navigate]);

    // GET list
    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            await Promise.all([fetchWarehouses()]);

            const receiptsRes = await axios.get<ApiResponse<SendedReceiptType[]>>(
                server.baseurl + server.warehouse + `get-Receipt-sended-from-store-to-warehouse`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (receiptsRes.data?.httpStatusCode === 200) {
                const allReceipts = receiptsRes.data.data;
                const formattedReceipts = allReceipts.map(d => ({
                    ...d,
                    ...getStatus(d.recordStatus)
                }));
                setReceiptList(formattedReceipts);
            } else {
                showAlert(receiptsRes.data?.message || 'Giriş belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Gerekli veriler yüklenirken یک hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert, authToken, fetchWarehouses]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // فیلتر نمایش
    useEffect(() => {
        const normalizedStart = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
        const normalizedEnd = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;

        const filteredReceipts = receiptList.filter(r => {
            const matchesSearch =
                r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.warehouse?.name && r.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

            const rDocDate = new Date(r.docDate);
            const startCheck = !normalizedStart || rDocDate >= normalizedStart;
            const endCheck = !normalizedEnd || rDocDate <= normalizedEnd;

            return matchesSearch && startCheck && endCheck;
        });

        setDisplayedReceipts(filteredReceipts);
        setPage(0);
    }, [receiptList, searchTerm, startDate, endDate]);

    // اعتبارسنجی فرم
    useEffect(() => {
        const isValid =
            !!selectedWarehouseId &&
            !!docDate &&
            receiptDetails.length > 0 &&
            receiptDetails.every(d =>
                d.itemId > 0 &&
                d.StoreDispatchDetailId > 0 &&
                Number(d.quantity) > 0 &&
                Number(d.quantity) <= d.maxDispatchQuantity
            );
        setIsFormValid(isValid);
    }, [selectedWarehouseId, docDate, receiptDetails]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasDateFilter);
    }, [searchTerm, startDate, endDate]);

    useEffect(() => {
        const timer = setTimeout(() => { setIsBlinking(false); }, 5000);
        return () => { clearTimeout(timer); };
    }, []);

    const validateForm = (): boolean => {
        let isValid = true;
        if (!selectedWarehouseId) { setWarehouseIdError(true); isValid = false; } else { setWarehouseIdError(false); }
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }

        if (receiptDetails.length === 0) {
            setReceiptDetailsError(true);
            isValid = false;
        } else {
            const byDetail = receiptDetails.reduce((m, d) => {
                const q = Number(d.quantity) || 0;
                m[d.StoreDispatchDetailId] = (m[d.StoreDispatchDetailId] ?? 0) + q;
                return m;
            }, {} as Record<number, number>);

            const ok = receiptDetails.every((detail) => {
                const numQuantity = Number(detail.quantity);
                const maxQuantity = Number(detail.maxDispatchQuantity);
                if (isNaN(numQuantity) || numQuantity <= 0) return false;
                if (byDetail[detail.StoreDispatchDetailId] > maxQuantity) return false;
                if (detail.StoreDispatchDetailId <= 0) return false;
                if (detail.itemId <= 0) return false;
                return true;
            });

            if (!ok) {
                setReceiptDetailsError(true);
                isValid = false;
            } else {
                setReceiptDetailsError(false);
            }
        }

        if (!isValid) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return isValid;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setSelectedWarehouseId(null);
        setReceiptDetails([]);
        setEditingId(null);
        setEditingCode(null);
        setDispatchDetailsInfo([]);
        setDocDateError(false);
        setWarehouseIdError(false);
        setReceiptDetailsError(false);
        setIsFormVisible(false);
        setRemovedReceiptDetails([]);
        setLastCreatedReceiptId(null);
        setLastCreatedReceiptCode(null);
    };

    // --- API: Update isEnd ---
    const updateReceiptIsEnd = async (id: number, isEnd: boolean) => {
        const url = server.baseurl + server.warehouse + "update-receipt-is-end";
        const payload = { id, isEnd };
        const res = await axios.put(url, payload, {
            headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
        });
        return res?.data;
    };

    // --- Insert ---
    const findNewestReceiptForWarehouse = (receipts: SendedReceiptType[], whId: number) => {
        const list = receipts.filter(r => Number(r.warehouse?.id) === whId);
        if (list.length === 0) return null;
        return list.reduce((acc, cur) =>
            new Date(cur.createAt) > new Date(acc.createAt) ? cur : acc
        );
    };

    const insertReceipt = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        try {
            const payload: NewReceiptData = {
                docDate: docDate?.toISOString() || new Date().toISOString(),
                warehouseId: Number(selectedWarehouseId),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    StoreDispatchDetailId: d.StoreDispatchDetailId,
                }))
            };

            const response = await axios.post(
                server.baseurl + server.warehouse + "create-receipt-sended-from-store-to-warehouse",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });

            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni giriş belgesi başarıyla eklendi!', 'success');

                // لیست را تازه بگیر
                const receiptsRes = await axios.get<ApiResponse<SendedReceiptType[]>>(
                    server.baseurl + server.warehouse + `get-Receipt-sended-from-store-to-warehouse`,
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );
                if (receiptsRes.data?.httpStatusCode === 200) {
                    const allReceipts = receiptsRes.data.data;
                    const newest = findNewestReceiptForWarehouse(allReceipts, Number(selectedWarehouseId));
                    if (newest) {
                        setLastCreatedReceiptId(Number(newest.id));
                        setLastCreatedReceiptCode(newest.code);
                        setOpenIsEndModal(true); // سوال پایان
                    }
                    setReceiptList(allReceipts.map(d => ({ ...d, ...getStatus(d.recordStatus) })));
                } else {
                    await fetchInitialData();
                }
            } else {
                showAlert(response.data.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // --- Edit ---
    const editReceipt = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        try {
            const payload: EditReceiptData = {
                id: Number(editingId),
                code: editingCode!,
                docDate: docDate?.toISOString() || new Date().toISOString(),
                warehouseId: Number(selectedWarehouseId),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    StoreDispatchDetailId: d.StoreDispatchDetailId,
                }))
            };

            const response = await axios.put(
                server.baseurl + server.warehouse + "update-receipt-sended-from-store-to-warehouse",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });

            if (response.data.httpStatusCode === 200) {
                showAlert('Giriş belgesi başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    // --- End flow: confirm modal handler ---
    const handleFinalSaveReceipt = async (shouldEnd: boolean) => {
        try {
            if (!shouldEnd) {
                showAlert('Fiş kaydedildi.', 'success');
                setOpenIsEndModal(false);
                // depo باید دیده شود -> هیچ کاری لازم نیست
                resetFormAndState();
                return;
            }

            if (!lastCreatedReceiptId) {
                showAlert('Yeni oluşturulan fiş ID bulunamadı.', 'error');
                setOpenIsEndModal(false);
                return;
            }

            const res = await updateReceiptIsEnd(lastCreatedReceiptId, true);
            if (res?.httpStatusCode === 200) {
                showAlert(`Fiş ${lastCreatedReceiptCode ?? ''} başarıyla sonlandırıldı.`, 'success');

                // depo را از کمبو پنهان کن
                if (selectedWarehouseId) {
                    setHiddenWarehouseIds(prev => {
                        const s = new Set(prev);
                        s.add(Number(selectedWarehouseId));
                        return s;
                    });
                }

                setOpenIsEndModal(false);
                await fetchInitialData();
                resetFormAndState();
            } else {
                showAlert(res?.message || 'Fiş sonlandırılamadı.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Fiş sonlandırılırken bir hata oluştu.', 'error');
        }
    };

    // --- Reactivate from inactive modal ---
    const handleReactivateInvoice = async (inv: InactiveInvoice) => {
        try {
            const res = await updateReceiptIsEnd(inv.id, false);
            if (res?.httpStatusCode === 200) {
                showAlert(`Fatura ${inv.invoiceNo} aktif hale getirildi.`, 'success');
                // depo را به کمبو بازگردان
                setHiddenWarehouseIds(prev => {
                    const s = new Set(prev);
                    s.delete(Number(inv.warehouseId));
                    return s;
                });
                await fetchInitialData();
            } else {
                showAlert(res?.message || 'Fatura geri alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Geri alma sırasında hata oluştu.', 'error');
        }
    };

    const handleCancelEdit = () => { resetFormAndState(); };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setReceiptIdToDelete(selectedRowForMenu.id);
            setReceiptCodeToDelete(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setReceiptIdToDelete(null);
        setReceiptCodeToDelete('');
        fetchInitialData();
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
        setReceiptDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };
            const maxQuantity = Number(updatedDetail.maxDispatchQuantity);

            if (field === 'quantity') {
                const numValue = Number(value);
                if (isNaN(numValue) || numValue < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updatedDetail.quantity = 0;
                }
                else if (numValue > maxQuantity) {
                    showAlert(`Girdiğiniz miktar sevk miktarından (${maxQuantity}) fazla olamaz!`, 'warning');
                    updatedDetail.quantity = maxQuantity;
                }
                else {
                    updatedDetail.quantity = numValue;
                }
            }
            else if (field === 'description') {
                updatedDetail.description = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [showAlert]);

    const handleDownload = async (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedReceipts : receiptList;
        const title = isFiltered ? 'Filtrelenmiş Depo Giriş Raporu' : 'Tüm Depo Giriş Raporu';

        const end = endDate || new Date();
        const subtitle = isFiltered
            ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(end.toISOString())}`
            : undefined;

        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') {
                exportReceiptsToPdf(dataToDownload, title, subtitle);
            } else {
                await exportReceiptsToExcel(dataToDownload, title);
            }
            showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) {
            showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleOpenRowDownloadModal = (receipt: SendedReceiptType) => {
        setSelectedReceiptForDownload(receipt);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    const handleDownloadSingleReceipt = async (format: 'pdf' | 'excel') => {
        if (!selectedReceiptForDownload) return;
        const data = [selectedReceiptForDownload];
        const title = `Giriş Belgesi Detayları: ${selectedReceiptForDownload.code}`;

        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') {
                exportReceiptsToPdf(data, title);
            } else {
                await exportReceiptsToExcel(data, title);
            }
            showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) {
            showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error');
        } finally {
            setOpenRowDownloadModal(false);
        }
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const handleRemoveReceiptDetail = useCallback((index: number) => {
        setReceiptDetails(prev => {
            const removed = prev[index];
            if (!removed) return prev;
            setRemovedReceiptDetails(p => [...p, removed]);
            const next = prev.filter((_, i) => i !== index);
            setReceiptDetailsError(next.length === 0);
            return next;
        });
    }, []);

    const handleRestoreRemovedDetail = useCallback((indexToRestore: number) => {
        const itemToRestore = removedReceiptDetails[indexToRestore];
        if (itemToRestore) {
            setReceiptDetails(prev => [...prev, itemToRestore]);
            setRemovedReceiptDetails(prev => prev.filter((_, i) => i !== indexToRestore));
            setReceiptDetailsError(false);
        }
    }, [removedReceiptDetails]);

    // --- Render ---
    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Depoya Gelen Sevk Giriş İşlemleri</Typography>

                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                >
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Giriş Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={false}
                                startIcon={<IconPlus />}
                            >
                                Yeni Giriş Kaydet
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
                </Stack>
            </Stack>

            {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" mb={2}>{editingId ? 'Depo Giriş Belgesini Düzenle' : 'Yeni Depo Giriş Belgesi'}</Typography>
                    <Grid container spacing={2}>
                        {/* Giriş Depo */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel required>Giriş Depo</CustomFormLabel>
                            <Autocomplete
                                id="warehouse-select"
                                options={warehouses
                                    .filter(w => (w.recordStatus ?? 0) === 0)
                                    .filter(w => !hiddenWarehouseIds.has(Number(w.id))) /* 👈 Sonlandırılmış depo’ları gizle */}
                                getOptionLabel={(option) => option.name}
                                value={warehouses.find(w => Number(w.id) === selectedWarehouseId && !hiddenWarehouseIds.has(Number(w.id))) || null}
                                onChange={async (_, newValue) => {
                                    const newWarehouseId = newValue ? Number(newValue.id) : null;
                                    setSelectedWarehouseId(newWarehouseId);
                                    setReceiptDetails([]);
                                    if (newWarehouseId) {
                                        const details = await fetchDispatchDetails(newWarehouseId);
                                        if (!editingId && details.length === 0) {
                                            showAlert('Bu depoya teslim edilecek aktif sevk detayı bulunamadı.', 'warning');
                                        }
                                    } else {
                                        setDispatchDetailsInfo([]);
                                        setReceiptDetails([]);
                                    }
                                    if (warehouseIdError && newValue) setWarehouseIdError(false);
                                }}
                                isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        placeholder="Giriş Depo Seçin"
                                        error={warehouseIdError}
                                        helperText={warehouseIdError ? "Depo seçimi zorunludur!" : ""}
                                    />
                                )}
                            />
                        </Grid>
                        {/* Belge Tarihi */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    value={docDate}
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
                    </Grid>

                    <Box mt={4}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={1} flexWrap="wrap">
                            <Typography variant="h6">Giriş Detayları</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Button
                                    variant="outlined"
                                    startIcon={<IconPlus />}
                                    onClick={handleLoadDispatchDetails}
                                    disabled={!selectedWarehouseId || loadingData || receiptDetails.length > 0}
                                >
                                    Sevk Detaylarını Yükle
                                </Button>

                                {/* 👇 دکمه Sonlandırılmış با تعداد */}
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Sonlandırılmış faturaları göster" : ""}>
                                    <span>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            startIcon={<IconBan size={18} />}
                                            onClick={() => setOpenInactiveModal(true)}
                                            disabled={inactiveCount === 0}
                                        >
                                            Sonlandırılmış ({inactiveCount})
                                        </Button>
                                    </span>
                                </CustomTooltip>
                            </Stack>
                        </Stack>

                        {removedReceiptDetails.length > 0 && (
                            <Box sx={{
                                border: '1px dashed',
                                borderColor: "error.main",
                                p: 2,
                                mb: 2,
                                mt: 2,
                                borderRadius: 1,
                                backgroundColor: 'rgba(255, 0, 0, 0.05)'
                            }}>
                                <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler (Geri Yüklemek İçin Tıklayın)</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {removedReceiptDetails.map((detail, index) => (
                                        <Chip
                                            key={index}
                                            label={`${detail?.item?.name || 'Ürün'} (${detail.quantity} ${detail?.item?.unit?.title || 'Birim'})`}
                                            color="error"
                                            variant="outlined"
                                            onClick={() => handleRestoreRemovedDetail(index)}
                                            onDelete={() => handleRestoreRemovedDetail(index)}
                                            deleteIcon={<IconReload size={18} />}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {loadingData && selectedWarehouseId ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={24} />
                                <Typography variant="caption" sx={{ ml: 1 }}>Sevk detayları yükleniyor...</Typography>
                            </Box>
                        ) : (
                            <Grid container spacing={2}>
                                {receiptDetails.length === 0 && selectedWarehouseId && !editingId ? (
                                    <Grid item xs={12}>
                                        <Alert severity="info">Yüklenecek sevk detayı bulunamadı veya butona basmadınız.</Alert>
                                    </Grid>
                                ) : (
                                    receiptDetails.map((detail, index) => {
                                        const maxQuantity = detail.maxDispatchQuantity;
                                        const itemLabel = detail.item?.name || 'Ürün Adı Bulunamadı';
                                        const unitLabel = detail.item?.unit?.title || 'Birim';
                                        const balanceDisplay = `Max: ${maxQuantity}`;

                                        return (
                                            <Grid item xs={12} key={index}>
                                                <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                                                            {itemLabel}
                                                        </Typography>
                                                        <Chip label={unitLabel} color="success" size="small" />
                                                        <Chip label={`Sevk Kodu: ${detail.dispatchCode}`} color="info" size="small" />
                                                    </Stack>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={4} md={3}>
                                                            <CustomTextField
                                                                type="number"
                                                                label={`Miktar`}
                                                                placeholder="Miktar"
                                                                value={detail.quantity}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                                fullWidth
                                                                size="small"
                                                                InputProps={{
                                                                    endAdornment: (
                                                                        <InputAdornment position="end">
                                                                            {balanceDisplay}
                                                                        </InputAdornment>
                                                                    ),
                                                                    inputProps: { min: 0 }
                                                                }}
                                                                error={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(maxQuantity))}
                                                                helperText={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(maxQuantity)) ? `Max: ${maxQuantity}` : ""}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={11} sm={7} md={8}>
                                                            <CustomTextField
                                                                label="Açıklama"
                                                                placeholder="Açıklama"
                                                                value={detail.description}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                                fullWidth
                                                                size="small"
                                                            />
                                                        </Grid>
                                                        <Grid item xs={1} sm={1} md={1}>
                                                            <IconButton
                                                                color="error"
                                                                size="small"
                                                                onClick={() => handleRemoveReceiptDetail(index)}
                                                                disabled={loadingButton}
                                                                aria-label="remove-detail"
                                                            >
                                                                <IconTrash size={18} />
                                                            </IconButton>
                                                        </Grid>
                                                    </Grid>
                                                </Paper>
                                            </Grid>
                                        );
                                    })
                                )}
                            </Grid>
                        )}
                        {receiptDetailsError && <Typography color="error" variant="caption" sx={{ mt: 1.5, ml: 1.5 }}>Lütfen مقادیر معتبر را برای تمامی ردیف ها وارد کنید.</Typography>}
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                        {editingId ? (
                            <>
                                <Button variant="contained" color="info" onClick={editReceipt} disabled={loadingButton}>
                                    {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                </Button>
                                <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
                            </>
                        ) : (
                            hasCreatePermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak giriş belgesini kaydedin." : ""}>
                                    <span>
                                        <BlinkingButton
                                            variant="contained"
                                            color="success"
                                            onClick={insertReceipt}
                                            disabled={!isFormValid || loadingButton}
                                            isBlinking={isFormValid && !loadingButton}
                                        >
                                            {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Giriş Belgesi Ekle'}
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
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle girişleri indirin" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="secondary"
                                onClick={() => setOpenDownloadFilteredModal(true)}
                                startIcon={<IconFileDownload />}
                                isBlinking={true}
                                disabled={loadingData || displayedReceipts.length === 0}
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
                            disabled={loadingData || receiptList.length === 0}
                        >
                            Tümünü İndir
                        </Button>
                    )}
                </Stack>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                label="Giriş Belgesi Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={8}>
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
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
                                        <IconX size={20} />
                                    </IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>
                    </Grid>
                </Box>

                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Depo giriş belgeleri yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table aria-label="sended receipt table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Giriş Depo</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Detaylar</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {displayedReceipts.length > 0 ? (
                                    displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.warehouse?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                {row.isEnd ? <Chip label="Sonlandı" color="error" size="small" /> : <Chip label="Açık" color="success" size="small" />}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<IconEye />}
                                                        onClick={() => {
                                                            setDetailsToShow(row.receiptDetails || []);
                                                            setOpenDetailsModal(true);
                                                        }}
                                                    >
                                                        Görünüm
                                                    </Button>
                                                </CustomTooltip>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton
                                                    aria-label="row-menu"
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
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                            Bu satırı indir
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasEditPermission && (
                                                        <MuiMenuItem onClick={async () => {
                                                            if (!selectedRowForMenu) return;
                                                            setLoadingData(true);
                                                            try {
                                                                const destinationWarehouseId = Number(selectedRowForMenu.warehouse.id);
                                                                if (!destinationWarehouseId) {
                                                                    showAlert('Düzenleme için gereken depo bilgisi eksik.', 'error');
                                                                    setLoadingData(false);
                                                                    return;
                                                                }

                                                                const fetchedDispatchDetails = await fetchDispatchDetails(destinationWarehouseId);

                                                                const dispatchDetailMap = new Map<number, DispatchDetailInfo>();
                                                                fetchedDispatchDetails.forEach(info => {
                                                                    dispatchDetailMap.set(Number(info.id), info);
                                                                });

                                                                const formattedDetails: FormReceiptDetail[] = (selectedRowForMenu.receiptDetails || []).map(d => {
                                                                    const sdd = d.storeDispatchDetail;
                                                                    const originalDispatchDetailId = sdd ? Number(sdd.id) : 0;

                                                                    const dispatchInfo = dispatchDetailMap.get(originalDispatchDetailId);

                                                                    const maxAllowedQty = dispatchInfo
                                                                        ? Number(dispatchInfo.quantity)
                                                                        : (sdd?.quantity ? Number(sdd.quantity) : Number(d.quantity));

                                                                    const dispatchId = dispatchInfo
                                                                        ? Number(dispatchInfo.dispatchId)
                                                                        : (sdd?.storeDispatchHeaders?.id ? Number(sdd.storeDispatchHeaders.id) : 0);

                                                                    const dispatchCode = dispatchInfo
                                                                        ? dispatchInfo.dispatchCode
                                                                        : (sdd?.storeDispatchHeaders?.code || 'N/A');

                                                                    return {
                                                                        itemId: Number(d.item.id),
                                                                        quantity: Number(d.quantity),
                                                                        description: d.description || '',
                                                                        StoreDispatchDetailId: originalDispatchDetailId,
                                                                        item: d.item,
                                                                        dispatchCode,
                                                                        maxDispatchQuantity: maxAllowedQty,
                                                                        StoreDispatchId: dispatchId,
                                                                    };
                                                                });

                                                                setReceiptDetails(formattedDetails);
                                                                setEditingId(selectedRowForMenu.id);
                                                                setEditingCode(selectedRowForMenu.code);
                                                                setDocDate(new Date(selectedRowForMenu.docDate));
                                                                setSelectedWarehouseId(destinationWarehouseId);
                                                                setIsFormVisible(true);
                                                                handleCloseMenu();
                                                            } catch {
                                                                showAlert('Düzenleme için veri hazırlanırken bir hata oluştu.', 'error');
                                                            } finally {
                                                                setLoadingData(false);
                                                            }
                                                        }}>
                                                            <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                            Düzenle
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                            <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                                            Silmek
                                                        </MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={6} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç giriş belgesi bulunamadı.
                                            </Typography>
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
                    count={displayedReceipts.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="Satır başına:"
                />
            </BlankCard>

            {/* Details Modal */}
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Giriş Detayları</DialogTitle>
                <DialogContent>
                    {detailsToShow.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table aria-label="Ürün detayları tablosu">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailsToShow.map((detail, index) => (
                                        <TableRow key={detail.id || index}>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.quantity || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ backgroundColor: 'rgb(240, 240, 240)' }}>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Toplam Miktar:</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>
                                            {detailsToShow.reduce((sum, detail) => sum + Number(detail.quantity), 0)}
                                        </StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Bu giriş belgesi için detay bulunamadı.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Download Modals */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Giriş Belgelerini İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', false); setOpenDownloadAllModal(false); }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', false); setOpenDownloadAllModal(false); }}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Giriş Belgelerini İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', true); setOpenDownloadFilteredModal(false); }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', true); setOpenDownloadFilteredModal(false); }}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadSingleReceipt('pdf')}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadSingleReceipt('excel')}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete */}
            <DeleteReceiptsSendedFromStore
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />

            {/* 👇 Modal: Sonlandırma onayı بعد از Insert */}
            <Dialog open={openIsEndModal} onClose={() => setOpenIsEndModal(false)}>
                <DialogTitle>Fatura Durumu Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Fişi kaydettikten sonra, bu faturanın Fişini Sonlandırmak (Belge No: {lastCreatedReceiptCode ?? 'N/A'}) ister misiniz?
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        (Bu, bu faturaya ait başka bir fiş belgesi oluşturulamayacağı anlamına gelir.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleFinalSaveReceipt(false)} color="error">Hayır (Sadece Fişi Kaydet)</Button>
                    <Button onClick={() => handleFinalSaveReceipt(true)} color="primary" variant="contained" autoFocus>Evet (Kaydet ve Fişi Sonlandır)</Button>
                </DialogActions>
            </Dialog>

            {/* 👇 Modal: Sonlandırılmış فاکتورها */}
            <Dialog open={openInactiveModal} onClose={() => setOpenInactiveModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sonlandırılmış Faturalar (Fişi Kesilmiş)</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Fatura No</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                    <StyledTableCell align="right"><Typography variant="h6">İşlem</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inactiveInvoices.length > 0 ? (
                                    inactiveInvoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <StyledTableCell>{invoice.invoiceNo}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(invoice.docDate)}</StyledTableCell>
                                            <StyledTableCell align="right">
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Faturayı aktif listeye geri alın" : ""}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        color="warning"
                                                        onClick={() => handleReactivateInvoice(invoice)}
                                                    >
                                                        Geri Al
                                                    </Button>
                                                </CustomTooltip>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={3} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Sonlandırılmış fatura bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenInactiveModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListReceiptsSendedFromStore;
