

// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//     TableContainer, Table, TableHead, TableRow, TableBody,
//     TableCell as MuiTableCell, MenuItem as MuiMenuItem,
//     Typography, Menu, IconButton, ListItemIcon, Box,
//     Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
//     CircularProgress, Paper, Autocomplete,
//     Dialog, DialogTitle, DialogContent, DialogActions, Chip
// } from '@mui/material';
// import { keyframes, styled } from '@mui/material/styles';
// import {
//     IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconEye, IconX, IconFileText, IconFileSpreadsheet, IconReload, IconBan
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
// import DeleteReceiptsDestructionSendedFromStore from "./DeleteReceiptsDestructionSendedFromStore";
// import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
// import Excel from 'exceljs';
// import { saveAs } from 'file-saver';

// // --- Styled ---
// const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
//     fontFamily: 'NotoSans',
//     fontSize: '0.8rem',
//     [theme.breakpoints.up('md')]: { fontSize: '1rem' },
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

// // --- Types (aligned with API) ---
// interface UnitType { id: string; title: string; }
// interface ItemType { id: string; name: string; abbreviation?: string; unit: UnitType; }
// interface WarehouseType { id: string | number; name: string; code: string; recordStatus?: number; status?: 'Aktif' | 'Pasif'; }

// interface StoreType { id: number | string; name: string; code?: string; recordStatus: number; }
// interface WorkRef { id: number; }
// interface WorkhouseType { id: number; name: string; code?: string; recordStatus: number; work?: WorkRef; status?: 'Aktif' | 'Pasif' }

// interface StoreDispatchHeaders {
//     id: string | number;
//     code: string;
//     docDate?: string;
//     store?: { id: string | number; name: string; };
// }
// interface StoreDispatchDetail {
//     id: string | number;
//     quantity: string | number;
//     createAt?: string;
//     recordStatus?: number;
//     description?: string;
//     item: ItemType;
// }
// interface DispatchHeader {
//     id: string | number;
//     code: string;
//     docDate: string;
//     createAt: string;
//     recordStatus: number;
//     status: number;
//     statusDescription?: string | null;
//     isEnd: boolean | null;
//     destruction?: boolean | null;
//     store: StoreType;
//     storeDispatchDetails: StoreDispatchDetail[];
// }

// interface ReceiptDetailType {
//     id: string;
//     quantity: string;
//     description: string;
//     item: ItemType;
//     storeDispatchDetail: {
//         id: string | number;
//         quantity: string;
//         description?: string;
//         storeDispatchHeaders: StoreDispatchHeaders;
//     };
// }

// interface SendedReceiptType {
//     id: string;
//     code: string;
//     docDate: string;
//     createAt: string;
//     recordStatus: number;
//     isEnd: boolean | null;
//     receiptDetails: ReceiptDetailType[];
//     warehouse: WarehouseType;
//     statusText?: 'Aktif' | 'Pasif';
//     statusColor?: 'success' | 'error';
// }


// interface FormReceiptDetail {
//     itemId: number;
//     quantity: number | string;
//     description: string;
//     StoreDispatchDetailId: number;
//     item?: ItemType;
//     dispatchCode?: string;
//     maxDispatchQuantity: number;
//     StoreDispatchId: number;
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
// interface EditReceiptData extends NewReceiptData { id: number; code: string; }

// interface ApiResponse<T> {
//     success: boolean;
//     httpStatusCode: number;
//     message: string;
//     data: T;
// }

// // --- Utils ---
// const formatDateDisplay = (dateString: string | null): string => {
//     if (!dateString) return "N/A";
//     try { return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr }); }
//     catch { return "Geçersiz Tarih"; }
// };
// const getStatus = (recordStatus: number): { text: 'Aktif' | 'Pasif', color: 'success' | 'error' } =>
//     (recordStatus === 0 ? { text: 'Aktif', color: 'success' } : { text: 'Pasif', color: 'error' });

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
//     let y = pageHeight - 30;
//     companyInfo.forEach(line => { doc.text(line, pageWidth / 2, y, { align: 'center' }); y += 4; });
//     doc.setFontSize(10);
//     doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//     doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//     const docAny = doc as any;
//     const pageCount = docAny.internal.getNumberOfPages();
//     doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
// };
// const exportReceiptsToPdf = (data: SendedReceiptType[], title: string, subtitle?: string) => {
//     if (!data?.length) throw new Error('PDF oluşturulacak veri bulunamadı.');
//     const doc = new jsPDF();
//     const docAny = doc as any;

//     data.forEach((receipt, index) => {
//         let yPos = 55;
//         if (index > 0) doc.addPage();
//         addPdfHeader(doc, title, subtitle);

//         doc.setFontSize(10);
//         doc.text(`Giriş Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
//         doc.text(`Belge Kodu: ${receipt.code || '-'}`, 15, yPos + 5);
//         doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos + 10);
//         yPos += 20;

//         const head = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
//         const body = (receipt.receiptDetails || []).map(d => [
//             d.item?.name || '-',
//             d.quantity,
//             d.item?.unit?.title || '-',
//             d.description || '-',
//             d.storeDispatchDetail?.storeDispatchHeaders?.code || '-',
//         ]);
//         const totalQuantity = (receipt.receiptDetails || []).reduce((s, d) => s + Number(d.quantity), 0);

//         autoTable(docAny, {
//             startY: yPos,
//             head: [head],
//             body,
//             theme: 'grid',
//             styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
//             headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//             didDrawPage: () => { addPdfFooter(doc); },
//         });

//         const finalY = docAny.lastAutoTable.finalY || yPos;
//         doc.setFontSize(10);
//         doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);
//     });

//     doc.save(`${title.replace(/ /g, '_')}.pdf`);
// };

// // --- Excel helpers ---
// const addExcelHeader = (ws: Excel.Worksheet, title: string, colLen: number) => {
//     ws.views = [{ rightToLeft: true }];
//     const t = ws.addRow([title]); t.font = { name: 'NotoSans', size: 14, bold: true };
//     ws.mergeCells(t.number, 1, t.number, colLen); t.getCell(1).alignment = { horizontal: 'center' };
//     const d = ws.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
//     d.font = { name: 'NotoSans', size: 10 }; ws.mergeCells(d.number, 1, d.number, colLen);
//     ws.addRow([]);
// };
// const addExcelCompanyInfo = (ws: Excel.Worksheet, startRow: number, colLen: number) => {
//     const lines = [
//         'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
//         'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
//         'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
//     ];
//     let r = startRow;
//     lines.forEach(line => {
//         const row = ws.getRow(r);
//         row.getCell(1).value = line;
//         row.getCell(1).alignment = { horizontal: 'center', readingOrder: 'ltr' };
//         row.getCell(1).font = { name: 'NotoSans', size: 8 };
//         ws.mergeCells(`A${r}:${String.fromCharCode(65 + colLen - 1)}${r}`);
//         r++;
//     });
// };
// const exportReceiptsToExcel = async (data: SendedReceiptType[], title: string) => {
//     if (!data?.length) throw new Error('Excel oluşturulacak veri bulunamadı.');

//     const wb = new Excel.Workbook();
//     data.forEach(receipt => {
//         const ws = wb.addWorksheet(`Giriş_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_'));
//         const head = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
//         addExcelHeader(ws, title, head.length);

//         ws.addRow([`Belge Kodu:`, receipt.code]);
//         ws.addRow([`Giriş Depo:`, receipt.warehouse?.name || '-']);
//         ws.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
//         ws.addRow([]);

//         const hr = ws.addRow(head);
//         hr.font = { name: 'NotoSans', bold: true };
//         hr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

//         (receipt.receiptDetails || []).forEach(d => {
//             ws.addRow([
//                 d.item?.name || '-',
//                 d.quantity,
//                 d.item?.unit?.title || '-',
//                 d.description || '-',
//                 d.storeDispatchDetail?.storeDispatchHeaders?.code || '-',
//             ]);
//         });

//         const total = (receipt.receiptDetails || []).reduce((s, d) => s + Number(d.quantity), 0);
//         const tr = ws.addRow(['Toplam Miktar', total, '', '', '']);
//         tr.font = { name: 'NotoSans', bold: true }; tr.getCell(2).numFmt = '0';

//         ws.addRow([]);
//         addExcelCompanyInfo(ws, ws.lastRow!.number + 2, head.length);
//     });

//     const buffer = await wb.xlsx.writeBuffer();
//     saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}.xlsx`);
// };

// // --- Component ---
// const ListReceiptsDestructionSendedFromStore = () => {
//     const navigate = useNavigate();
//     const authToken = localStorage.getItem('authToken');

//     // State
//     const [docDate, setDocDate] = useState<Date | null>(new Date());
//     const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

//     const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
//     const [receiptList, setReceiptList] = useState<SendedReceiptType[]>([]);
//     const [displayedReceipts, setDisplayedReceipts] = useState<SendedReceiptType[]>([]);

//     const [loadingData, setLoadingData] = useState(true);
//     const [loadingButton, setLoadingButton] = useState(false);

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

//     // NEW: end/restore flow
//     const [openIsEndModal, setOpenIsEndModal] = useState(false);
//     const [lastCreatedReceiptId, setLastCreatedReceiptId] = useState<number | null>(null);
//     const [lastCreatedReceiptCode, setLastCreatedReceiptCode] = useState<string | null>(null);

//     const [hiddenWarehouseIds, setHiddenWarehouseIds] = useState<Set<number>>(new Set());
//     const [openInactiveModal, setOpenInactiveModal] = useState(false);

//     // --- NEW: Combos like ListReceiptsSendedFromStore
//     const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
//     const [storesList, setStoresList] = useState<StoreType[]>([]);
//     const [dispatchHeadersList, setDispatchHeadersList] = useState<DispatchHeader[]>([]);
//     const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);
//     const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
//     const [selectedDispatchId, setSelectedDispatchId] = useState<number | null>(null);
//     const [workhouseError, setWorkhouseError] = useState(false);
//     const [storeError, setStoreError] = useState(false);
//     const [dispatchError, setDispatchError] = useState(false);
//     const [loadingWorkhouses, setLoadingWorkhouses] = useState(false);
//     const [loadingStores, setLoadingStores] = useState(false);
//     const [loadingDispatches, setLoadingDispatches] = useState(false);

//     const { isTooltipGloballyEnabled } = useTooltip();
//     const { allowedOperations } = useAuth();
//     const ops = allowedOperations ?? [];
//     const hasCreatePermission = useMemo(() => ops.some(op => op.systemOperationName === 'Eklemek'), [ops]);
//     const hasEditPermission = useMemo(() => ops.some(op => op.systemOperationName === 'Düzenlemek'), [ops]);
//     const hasDeletePermission = useMemo(() => ops.some(op => op.systemOperationName === 'Silmek'), [ops]);
//     const hasDownloadPermission = useMemo(() => ops.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [ops]);

//     // inactive invoices
//     type InactiveInvoice = { id: number; invoiceNo: string; docDate: string; warehouseId: number; };
//     const inactiveInvoices: InactiveInvoice[] = useMemo(() => {
//         return (receiptList || [])
//             .filter(r => r.isEnd === true)
//             .map(r => ({
//                 id: Number(r.id),
//                 invoiceNo: r.code,
//                 docDate: r.docDate,
//                 warehouseId: Number(r.warehouse?.id)
//             }));
//     }, [receiptList]);
//     const inactiveCount = inactiveInvoices.length;

//     // Helpers
//     const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//         setAlertMessage(message); setAlertSeverity(severity);
//         setTimeout(() => setAlertMessage(null), 5000);
//     }, []);

//     const fetchWarehouses = useCallback(async () => {
//         const token = localStorage.getItem('authToken');
//         if (!token) { navigate("/"); return []; }
//         try {
//             const res = await axios.get<ApiResponse<WarehouseType[]>>(
//                 server.baseurl + server.initialoperations + "get-warehouses",
//                 { headers: { "Authorization": `Bearer ${token}` } }
//             );
//             if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
//                 const active = res.data.data
//                     .filter(s => s.recordStatus === 0)
//                     .map(s => ({ ...s, id: Number(s.id) }));
//                 setWarehouses(active); return active;
//             } else { showAlert(res.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error'); return []; }
//         } catch { showAlert('Depolar yüklenirken bir hata oluştu.', 'error'); return []; }
//     }, [navigate, showAlert]);

//     // --- NEW: combos fetchers
//     const fetchWorkhouses = useCallback(async () => {
//         setLoadingWorkhouses(true);
//         const token = localStorage.getItem('authToken');
//         if (!token) { navigate("/"); setLoadingWorkhouses(false); return; }
//         try {
//             const response = await axios.get(
//                 server.baseurl + server.initialoperations + "get-workhouse",
//                 { headers: { "Authorization": `Bearer ${token}` } }
//             );
//             if (response.data?.httpStatusCode === 200) {
//                 const normalized: WorkhouseType[] = (response.data.data as any[]).map(i => ({
//                     id: Number(i.id),
//                     name: String(i.name ?? ''),
//                     code: i.code ?? undefined,
//                     recordStatus: Number(i.recordStatus ?? 1),
//                     work: i.work ? { id: Number(i.work.id) } : undefined,
//                     status: Number(i.recordStatus) === 0 ? 'Aktif' : 'Pasif',
//                 }));
//                 setWorkhousesList(normalized.filter(w => w.recordStatus === 0));
//             } else {
//                 showAlert(response.data?.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch {
//             showAlert('Şantiyeler yüklenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingWorkhouses(false);
//         }
//     }, [navigate, showAlert]);

//     const fetchStoresByWorkhouseId = useCallback(async (workhouseId: number) => {
//         const token = localStorage.getItem('authToken');
//         if (!token) { navigate("/"); return []; }
//         setLoadingStores(true);
//         try {
//             const response = await axios.get(
//                 server.baseurl + server.initialoperations + `get-stores-by-workhouse-id/${Number(workhouseId)}`,
//                 { headers: { "Authorization": `Bearer ${token}` } }
//             );
//             if (response.data.httpStatusCode === 200) {
//                 const activeStores = (response.data.data as StoreType[]).filter(s => s.recordStatus === 0)
//                     .map(s => ({ ...s, id: Number(s.id) }));
//                 setStoresList(activeStores);
//                 return activeStores;
//             } else {
//                 showAlert(response.data.message || 'Şantiye Depoları yüklenirken hata.', 'error');
//                 setStoresList([]); return [];
//             }
//         } catch {
//             showAlert('Şantiye Depoları yüklenirken hata.', 'error');
//             setStoresList([]); return [];
//         } finally {
//             setLoadingStores(false);
//         }
//     }, [navigate, showAlert]);

//     // IMPORTANT: NEW API for dispatch list
//     const fetchDispatchHeadersByStoreId = useCallback(async (storeId: number | string) => {
//         if (!authToken) { navigate("/"); return []; }
//         setLoadingDispatches(true);
//         try {
//             const url = server.baseurl + server.warehouse + `get-Store-dispatches-return-to-center/${Number(storeId)}`;
//             const response = await axios.get(url, { headers: { "Authorization": `Bearer ${authToken}` } });

//             if (response.data?.httpStatusCode === 200 && Array.isArray(response.data.data)) {
//                 const all: DispatchHeader[] = response.data.data;
//                 const filtered = all
//                     .filter(d => Number(d.status) === 1 && d.isEnd !== true);
//                 setDispatchHeadersList(filtered);
//                 return filtered;
//             } else {
//                 showAlert(response.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
//                 setDispatchHeadersList([]); return [];
//             }
//         } catch {
//             showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
//             setDispatchHeadersList([]); return [];
//         } finally {
//             setLoadingDispatches(false);
//         }
//     }, [authToken, showAlert, navigate]);

//     // Initial load
//     const fetchInitialData = useCallback(async () => {
//         setLoadingData(true);
//         if (!authToken) { navigate("/"); setLoadingData(false); return; }
//         try {
//             await Promise.all([fetchWarehouses(), fetchWorkhouses()]);
//             const receiptsRes = await axios.get<ApiResponse<SendedReceiptType[]>>(
//                 server.baseurl + server.warehouse + `get-Receipt-destruction-sended-from-store-to-warehouse`,
//                 { headers: { "Authorization": `Bearer ${authToken}` } }
//             );
//             if (receiptsRes.data?.httpStatusCode === 200) {
//                 const formatted = receiptsRes.data.data.map(d => ({ ...d, ...getStatus(d.recordStatus) }));
//                 setReceiptList(formatted);
//             } else {
//                 showAlert(receiptsRes.data?.message || 'Giriş belgeleri yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch {
//             showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
//         } finally { setLoadingData(false); }
//     }, [authToken, fetchWarehouses, fetchWorkhouses, navigate, showAlert]);
//     useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

//     // filters (normalize dates)
//     useEffect(() => {
//         const s = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
//         const e = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
//         const list = receiptList.filter(r => {
//             const txt = (r.code?.toLowerCase() ?? '') + ' ' + (r.warehouse?.name?.toLowerCase() ?? '');
//             const matches = txt.includes(searchTerm.toLowerCase());
//             const t = new Date(r.docDate);
//             const okS = !s || t >= s;
//             const okE = !e || t <= e;
//             return matches && okS && okE;
//         });
//         setDisplayedReceipts(list); setPage(0);
//     }, [receiptList, searchTerm, startDate, endDate]);
//     useEffect(() => { setIsFilterActive((searchTerm.trim() !== '') || startDate !== null || endDate !== null); }, [searchTerm, startDate, endDate]);
//     useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

//     // --- NEW: chained effects (combos)
//     useEffect(() => {
//         setSelectedStoreId(null);
//         setStoresList([]);
//         setSelectedDispatchId(null);
//         setDispatchHeadersList([]);
//         setReceiptDetails([]);
//         if (selectedWorkhouseId) {
//             fetchStoresByWorkhouseId(selectedWorkhouseId);
//             if (workhouseError) setWorkhouseError(false);
//         }
//     }, [selectedWorkhouseId, fetchStoresByWorkhouseId, workhouseError]);

//     useEffect(() => {
//         setSelectedDispatchId(null);
//         setDispatchHeadersList([]);
//         setReceiptDetails([]);
//         if (selectedStoreId) {
//             fetchDispatchHeadersByStoreId(selectedStoreId);
//             if (storeError) setStoreError(false);
//         }
//     }, [selectedStoreId, fetchDispatchHeadersByStoreId, storeError]);

//     // Populate receiptDetails when dispatch selected
//     useEffect(() => {
//         if (!selectedDispatchId) return;
//         const head = dispatchHeadersList.find(d => Number(d.id) === Number(selectedDispatchId));
//         if (!head) return;

//         const details: FormReceiptDetail[] = (head.storeDispatchDetails || []).map((detail) => ({
//             itemId: Number(detail.item.id),
//             quantity: Number(detail.quantity),
//             description: detail.description || '',
//             StoreDispatchDetailId: Number(detail.id),
//             item: detail.item,
//             dispatchCode: head.code,
//             maxDispatchQuantity: Number(detail.quantity),
//             StoreDispatchId: Number(head.id),
//         }));
//         setReceiptDetails(details);
//         if (dispatchError) setDispatchError(false);
//     }, [selectedDispatchId, dispatchHeadersList, dispatchError]);

//     // form validity (exactly like the first component)
//     const isFormValid = useMemo(() => {
//         if (!selectedWorkhouseId || !selectedStoreId || !selectedDispatchId) return false;
//         if (!selectedWarehouseId || !docDate) return false;
//         if (receiptDetails.length === 0) return false;

//         const byDetail = receiptDetails.reduce((m, d) => {
//             const q = Number(d.quantity) || 0;
//             m[d.StoreDispatchDetailId] = (m[d.StoreDispatchDetailId] ?? 0) + q;
//             return m;
//         }, {} as Record<number, number>);

//         return receiptDetails.every(d => {
//             const q = Number(d.quantity);
//             return (
//                 d.itemId > 0 &&
//                 d.StoreDispatchDetailId > 0 &&
//                 Number.isFinite(q) &&
//                 q > 0 &&
//                 byDetail[d.StoreDispatchDetailId] <= Number(d.maxDispatchQuantity)
//             );
//         });
//     }, [selectedWorkhouseId, selectedStoreId, selectedDispatchId, selectedWarehouseId, docDate, receiptDetails]);

//     const validateForm = (): boolean => {
//         let ok = true;

//         if (!selectedWorkhouseId) { setWorkhouseError(true); ok = false; }
//         if (!selectedStoreId) { setStoreError(true); ok = false; }
//         if (!selectedDispatchId) { setDispatchError(true); ok = false; }
//         if (!selectedWarehouseId) { setWarehouseIdError(true); ok = false; } else setWarehouseIdError(false);
//         if (!docDate) { setDocDateError(true); ok = false; } else setDocDateError(false);

//         if (receiptDetails.length === 0) { setReceiptDetailsError(true); ok = false; }
//         else {
//             const byDetail = receiptDetails.reduce((m, d) => {
//                 const q = Number(d.quantity) || 0;
//                 m[d.StoreDispatchDetailId] = (m[d.StoreDispatchDetailId] ?? 0) + q;
//                 return m;
//             }, {} as Record<number, number>);
//             const detailsOk = receiptDetails.every(d => {
//                 const q = Number(d.quantity);
//                 const max = Number(d.maxDispatchQuantity);
//                 if (!Number.isFinite(q) || q <= 0) return false;
//                 if (byDetail[d.StoreDispatchDetailId] > max) return false;
//                 if (d.StoreDispatchDetailId <= 0 || d.itemId <= 0) return false;
//                 return true;
//             });
//             setReceiptDetailsError(!detailsOk);
//             if (!detailsOk) ok = false;
//         }

//         if (!ok) showAlert('Lütfen tüm zorunlu alanları (Şantiye, Şantiye Depo, Sevk Belgesi, Giriş Depo, Tarih) doldurun ve ürün satırlarını doğru girin.', 'warning');
//         return ok;
//     };

//     const resetFormAndState = () => {
//         setDocDate(new Date());
//         setSelectedWarehouseId(null);

//         setSelectedWorkhouseId(null);
//         setSelectedStoreId(null);
//         setSelectedDispatchId(null);
//         setStoresList([]);
//         setDispatchHeadersList([]);

//         setReceiptDetails([]);
//         setEditingId(null);
//         setEditingCode(null);
//         setDocDateError(false);
//         setWarehouseIdError(false);
//         setReceiptDetailsError(false);
//         setIsFormVisible(false);
//         setRemovedReceiptDetails([]);
//         setLastCreatedReceiptId(null);
//         setLastCreatedReceiptCode(null);
//         setWorkhouseError(false);
//         setStoreError(false);
//         setDispatchError(false);
//     };

//     // --- API: Update isEnd ---
//     const updateReceiptIsEnd = async (id: number, isEnd: boolean) => {
//         const url = server.baseurl + server.warehouse + "update-receipt-is-end";
//         const payload = { id, isEnd };
//         const res = await axios.put(url, payload, {
//             headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
//         });
//         return res?.data;
//     };

//     const findNewestReceiptForWarehouse = (receipts: SendedReceiptType[], whId: number) => {
//         const list = receipts.filter(r => Number(r.warehouse?.id) === whId);
//         if (list.length === 0) return null;
//         return list.reduce((acc, cur) =>
//             new Date(cur.createAt) > new Date(acc.createAt) ? cur : acc
//         );
//     };

//     // --- Insert ---
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
//             debugger
//             const res = await axios.post(
//                 server.baseurl + server.warehouse + "create-receipt-destruction-sended-from-store-to-warehouse",
//                 payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
//             );
//             if (res.data.httpStatusCode === 201) {
//                 showAlert('Yeni giriş belgesi başarıyla eklendi!', 'success');

//                 // refresh list & open isEnd modal with newest
//                 const receiptsRes = await axios.get<ApiResponse<SendedReceiptType[]>>(
//                     server.baseurl + server.warehouse + `get-Receipt-destruction-sended-from-store-to-warehouse`,
//                     { headers: { "Authorization": `Bearer ${authToken}` } }
//                 );
//                 if (receiptsRes.data?.httpStatusCode === 200) {
//                     const all = receiptsRes.data.data;
//                     setReceiptList(all.map(d => ({ ...d, ...getStatus(d.recordStatus) })));
//                     const newest = findNewestReceiptForWarehouse(all, Number(selectedWarehouseId));
//                     if (newest) {
//                         setLastCreatedReceiptId(Number(newest.id));
//                         setLastCreatedReceiptCode(newest.code);
//                         setOpenIsEndModal(true);
//                     } else {
//                         showAlert('Kayıt eklendi ama fiş ID tespit edilemedi.', 'warning');
//                     }
//                 } else {
//                     await fetchInitialData();
//                 }
//             } else showAlert(res.data.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
//         } finally { setLoadingButton(false); }
//     };

//     // --- Edit ---
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
//             const res = await axios.put(
//                 server.baseurl + server.warehouse + "update-receipt-destruction-sended-from-store-to-warehouse",
//                 payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
//             );
//             if (res.data.httpStatusCode === 200) {
//                 showAlert('Giriş belgesi başarıyla güncellendi!', 'success');
//                 resetFormAndState(); fetchInitialData();
//             } else showAlert(res.data.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//         } catch (e: any) {
//             if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
//             else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
//             else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
//         } finally { setLoadingButton(false); }
//     };

//     // --- End flow handlers ---
//     const handleFinalSaveReceipt = async (shouldEnd: boolean) => {
//         try {
//             if (!shouldEnd) {
//                 showAlert('Fiş kaydedildi.', 'success');
//                 setOpenIsEndModal(false);
//                 resetFormAndState();
//                 return;
//             }
//             if (!lastCreatedReceiptId) {
//                 showAlert('Yeni oluşturulan fiş ID bulunamadı.', 'error');
//                 setOpenIsEndModal(false);
//                 return;
//             }
//             const res = await updateReceiptIsEnd(lastCreatedReceiptId, true);
//             if (res?.httpStatusCode === 200) {
//                 showAlert(`Fiş ${lastCreatedReceiptCode ?? ''} başarıyla sonlandırıldı.`, 'success');
//                 if (selectedWarehouseId) {
//                     setHiddenWarehouseIds(prev => {
//                         const s = new Set(prev);
//                         s.add(Number(selectedWarehouseId));
//                         return s;
//                     });
//                 }
//                 setOpenIsEndModal(false);
//                 await fetchInitialData();
//                 resetFormAndState();
//             } else {
//                 showAlert(res?.message || 'Fiş sonlandırılamadı.', 'error');
//             }
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Fiş sonlandırılırken bir hata oluştu.', 'error');
//         }
//     };

//     const handleReactivateInvoice = async (inv: InactiveInvoice) => {
//         try {
//             const res = await updateReceiptIsEnd(inv.id, false);
//             if (res?.httpStatusCode === 200) {
//                 showAlert(`Fatura ${inv.invoiceNo} aktif hale getirildi.`, 'success');
//                 setHiddenWarehouseIds(prev => {
//                     const s = new Set(prev);
//                     s.delete(Number(inv.warehouseId));
//                     return s;
//                 });
//                 await fetchInitialData();
//             } else {
//                 showAlert(res?.message || 'Fatura geri alınamadı.', 'error');
//             }
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Geri alma sırasında hata oluştu.', 'error');
//         }
//     };

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
//     const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

//     const handleOpenRowDownloadModal = (receipt: SendedReceiptType) => { setSelectedReceiptForDownload(receipt); setOpenRowDownloadModal(true); handleCloseMenu(); };
//     const handleDownloadSingleReceipt = async (format: 'pdf' | 'excel') => {
//         if (!selectedReceiptForDownload) return;
//         const data = [selectedReceiptForDownload];
//         const title = `Giriş Belgesi Detayları: ${selectedReceiptForDownload.code}`;
//         showAlert('Rapor oluşturuluyor...', 'info');
//         try {
//             if (format === 'pdf') exportReceiptsToPdf(data, title);
//             else await exportReceiptsToExcel(data, title);
//             showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
//         } catch (e: any) { showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error'); }
//         finally { setOpenRowDownloadModal(false); }
//     };

//     const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };

//     const handleRemoveReceiptDetail = useCallback((index: number) => {
//         setReceiptDetails(prev => {
//             const removed = prev[index]; if (!removed) return prev;
//             setRemovedReceiptDetails(p => [...p, removed]);
//             const next = prev.filter((_, i) => i !== index);
//             setReceiptDetailsError(next.length === 0);
//             return next;
//         });
//     }, []);

//     const handleRestoreRemovedDetail = useCallback((idx: number) => {
//         const item = removedReceiptDetails[idx];
//         if (item) {
//             setReceiptDetails(prev => [...prev, item]);
//             setRemovedReceiptDetails(prev => prev.filter((_, i) => i !== idx));
//             setReceiptDetailsError(false);
//         }
//     }, [removedReceiptDetails]);

//     // --- Edit click: prefill combos from row
//     const handleEditClick = async () => {
//         if (!selectedRowForMenu) return;
//         setLoadingData(true);
//         try {
//             // Derive store & dispatch from first detail
//             const first = selectedRowForMenu.receiptDetails?.[0];
//             const sdh = first?.storeDispatchDetail?.storeDispatchHeaders;
//             const dispatchId = sdh?.id ? Number(sdh.id) : null;
//             const storeId = sdh?.store?.id ? Number(sdh.store.id) : null;

//             // Prefill combos
//             if (storeId) {
//                 setSelectedStoreId(storeId);
//                 await fetchDispatchHeadersByStoreId(storeId);
//             }
//             if (dispatchId) {
//                 const existing = dispatchHeadersList.find(d => Number(d.id) === dispatchId);
//                 if (!existing && storeId) {
//                     // add minimal dispatch so user can see/edit current one
//                     const artificial: DispatchHeader | null = sdh ? {
//                         id: dispatchId,
//                         code: sdh.code,
//                         docDate: sdh.docDate || new Date().toISOString(),
//                         createAt: sdh.docDate || new Date().toISOString(),
//                         recordStatus: 0,
//                         status: 1,
//                         isEnd: false,
//                         store: { id: storeId, name: sdh.store?.name || '', recordStatus: 0 },
//                         storeDispatchDetails: (selectedRowForMenu.receiptDetails || []).map(d => ({
//                             id: Number(d.storeDispatchDetail?.id),
//                             quantity: Number(d.storeDispatchDetail?.quantity || d.quantity),
//                             description: d.storeDispatchDetail?.description || d.description || '',
//                             item: d.item
//                         }))
//                     } : null;
//                     if (artificial) setDispatchHeadersList(prev => [...prev, artificial]);
//                 }
//                 setSelectedDispatchId(dispatchId);
//             }

//             // receiptDetails for edit (max from dispatch if exists)
//             let maxMap = new Map<number, number>();
//             const activeSelected = (dispatchId
//                 ? (dispatchHeadersList.find(d => Number(d.id) === dispatchId) ?? null)
//                 : null);

//             if (activeSelected) {
//                 activeSelected.storeDispatchDetails.forEach(dd => {
//                     maxMap.set(Number(dd.id), Number(dd.quantity));
//                 });
//             }

//             const formatted: FormReceiptDetail[] = (selectedRowForMenu.receiptDetails || []).map(d => {
//                 const sdd = d.storeDispatchDetail;
//                 const sddId = sdd ? Number(sdd.id) : 0;
//                 const maxQty = maxMap.has(sddId)
//                     ? Number(maxMap.get(sddId))
//                     : (sdd?.quantity ? Number(sdd.quantity) : Number(d.quantity));
//                 const dispId = dispatchId ?? 0;
//                 const dispCode = sdh?.code || 'N/A';
//                 return {
//                     itemId: Number(d.item.id),
//                     quantity: Number(d.quantity),
//                     description: d.description || '',
//                     StoreDispatchDetailId: sddId,
//                     item: d.item,
//                     dispatchCode: dispCode,
//                     maxDispatchQuantity: maxQty,
//                     StoreDispatchId: dispId,
//                 };
//             });

//             setReceiptDetails(formatted);
//             setEditingId(selectedRowForMenu.id);
//             setEditingCode(selectedRowForMenu.code);
//             setDocDate(new Date(selectedRowForMenu.docDate));
//             setSelectedWarehouseId(Number(selectedRowForMenu.warehouse?.id) || null);
//             setIsFormVisible(true);
//             handleCloseMenu();
//         } catch {
//             showAlert('Düzenleme için veri hazırlanırken bir hata oluştu.', 'error');
//         } finally { setLoadingData(false); }
//     };

//     // --- Render ---
//     return (
//         <Box mt={2}>
//             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
//                 <Typography variant="h5">Depoya Gelen (İmha/İade) Sevk Girişleri</Typography>
//                 <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
//                     {!isFormVisible && hasCreatePermission && (
//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Giriş Belgesi kaydetmek için tıklayınız" : ""}>
//                             <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} startIcon={<IconPlus />}>
//                                 Yeni Giriş Kaydet
//                             </BlinkingButton>
//                         </CustomTooltip>
//                     )}
//                     {isFormVisible && (
//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
//                             <Button variant="contained" color="error" onClick={resetFormAndState} disabled={loadingButton} startIcon={<IconX size={20} />}>
//                                 Gizle
//                             </Button>
//                         </CustomTooltip>
//                     )}
//                 </Stack>
//             </Stack>

//             {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
//                 <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h5" mb={2}>{editingId ? 'Depo Giriş Belgesini Düzenle' : 'Yeni Depo Giriş Belgesi'}</Typography>

//                     {/* NEW: Combos row (exactly like the first component) */}
//                     <Grid container spacing={2}>
//                         {/* Şantiye */}
//                         <Grid item xs={12} sm={4}>
//                             <CustomFormLabel required>Şantiye</CustomFormLabel>
//                             <Autocomplete
//                                 options={workhousesList}
//                                 value={workhousesList.find(w => Number(w.id) === selectedWorkhouseId) || null}
//                                 loading={loadingWorkhouses}
//                                 getOptionLabel={(o) => o.name}
//                                 isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
//                                 onChange={(_, v) => {
//                                     setSelectedWorkhouseId(v ? Number(v.id) : null);
//                                     setWorkhouseError(false);
//                                 }}
//                                 renderInput={(params) => (
//                                     <TextField
//                                         {...params}
//                                         size="small"
//                                         placeholder="Şantiye seçin"
//                                         error={workhouseError}
//                                         helperText={workhouseError ? "Şantiye zorunludur!" : ""}
//                                     />
//                                 )}
//                             />
//                         </Grid>

//                         {/* Şantiye Depo */}
//                         <Grid item xs={12} sm={4}>
//                             <CustomFormLabel required>Şantiye Depo</CustomFormLabel>
//                             <Autocomplete
//                                 options={storesList}
//                                 value={storesList.find(s => Number(s.id) === selectedStoreId) || null}
//                                 loading={loadingStores}
//                                 getOptionLabel={(o) => o.name}
//                                 isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
//                                 onChange={(_, v) => {
//                                     setSelectedStoreId(v ? Number(v.id) : null);
//                                     setStoreError(false);
//                                 }}
//                                 renderInput={(params) => (
//                                     <TextField
//                                         {...params}
//                                         size="small"
//                                         placeholder="Şantiye Depo seçin"
//                                         error={storeError}
//                                         helperText={storeError ? "Şantiye Depo zorunludur!" : ""}
//                                     />
//                                 )}
//                             />
//                         </Grid>

//                         {/* Sevk Belgesi (from return-to-center) */}
//                         <Grid item xs={12} sm={4}>
//                             <CustomFormLabel required>Sevk Belgesi</CustomFormLabel>
//                             <Autocomplete
//                                 options={dispatchHeadersList}
//                                 value={dispatchHeadersList.find(d => Number(d.id) === selectedDispatchId) || null}
//                                 loading={loadingDispatches}
//                                 getOptionLabel={(o) => `${o.code} — ${formatDateDisplay(o.docDate)}`}
//                                 isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
//                                 onChange={(_, v) => {
//                                     setSelectedDispatchId(v ? Number(v.id) : null);
//                                     setDispatchError(false);
//                                 }}
//                                 renderInput={(params) => (
//                                     <TextField
//                                         {...params}
//                                         size="small"
//                                         placeholder="Sevk Belgesi seçin"
//                                         error={dispatchError}
//                                         helperText={dispatchError ? "Sevk Belgesi zorunludur!" : ""}
//                                     />
//                                 )}
//                             />
//                         </Grid>

//                         {/* Giriş Depo */}
//                         <Grid item xs={12} sm={6}>
//                             <CustomFormLabel required>Giriş Depo</CustomFormLabel>
//                             <Autocomplete
//                                 id="warehouse-select"
//                                 options={warehouses
//                                     .filter(w => (w.recordStatus ?? 0) === 0)
//                                     .filter(w => !hiddenWarehouseIds.has(Number(w.id)))}
//                                 getOptionLabel={(option) => option.name}
//                                 value={warehouses.find(w => Number(w.id) === selectedWarehouseId && !hiddenWarehouseIds.has(Number(w.id))) || null}
//                                 onChange={async (_, newValue) => {
//                                     const newId = newValue ? Number(newValue.id) : null;
//                                     setSelectedWarehouseId(newId);
//                                     if (warehouseIdError && newValue) setWarehouseIdError(false);
//                                 }}
//                                 isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
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
//                                     onChange={(v) => { setDocDate(v); if (docDateError && v) setDocDateError(false); }}
//                                     inputFormat="dd/MM/yyyy"
//                                     renderInput={(params) => <TextField {...params} fullWidth size="small" error={docDateError} helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""} />}
//                                 />
//                             </LocalizationProvider>
//                         </Grid>
//                     </Grid>

//                     {/* Details (auto-filled by dispatch selection) */}
//                     <Box mt={4}>
//                         <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={1} flexWrap="wrap">
//                             <Typography variant="h6">Giriş Detayları</Typography>
//                             <Stack direction="row" spacing={1} alignItems="center">
//                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Sonlandırılmış faturaları göster" : ""}>
//                                     <span>
//                                         <Button
//                                             variant="outlined"
//                                             color="secondary"
//                                             startIcon={<IconBan size={18} />}
//                                             onClick={() => setOpenInactiveModal(true)}
//                                             disabled={inactiveCount === 0}
//                                         >
//                                             Sonlandırılmış ({inactiveCount})
//                                         </Button>
//                                     </span>
//                                 </CustomTooltip>
//                             </Stack>
//                         </Stack>

//                         {removedReceiptDetails.length > 0 && (
//                             <Box sx={{ border: '1px dashed', borderColor: "error.main", p: 2, mb: 2, mt: 2, borderRadius: 1, backgroundColor: 'rgba(255, 0, 0, 0.05)' }}>
//                                 <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler (Geri Yüklemek İçin Tıklayın)</Typography>
//                                 <Stack direction="row" spacing={1} flexWrap="wrap">
//                                     {removedReceiptDetails.map((detail, idx) => (
//                                         <Chip
//                                             key={idx}
//                                             label={`${detail?.item?.name || 'Ürün'} (${detail.quantity} ${detail?.item?.unit?.title || 'Birim'})`}
//                                             color="error" variant="outlined"
//                                             onClick={() => handleRestoreRemovedDetail(idx)}
//                                             onDelete={() => handleRestoreRemovedDetail(idx)}
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
//                                 {receiptDetails.length === 0 && selectedDispatchId ? (
//                                     <Grid item xs={12}><Alert severity="info">Seçilen sevk belgesi için ürün detayı bulunamadı.</Alert></Grid>
//                                 ) : (
//                                     receiptDetails.map((detail, index) => {
//                                         const max = detail.maxDispatchQuantity;
//                                         const itemLabel = detail.item?.name || 'Ürün Adı Bulunamadı';
//                                         const unitLabel = detail.item?.unit?.title || 'Birim';
//                                         return (
//                                             <Grid item xs={12} key={index}>
//                                                 <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
//                                                     <Stack direction="row" spacing={1} alignItems="center">
//                                                         <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{itemLabel}</Typography>
//                                                         <Chip label={unitLabel} color="success" size="small" />
//                                                         {detail.dispatchCode && <Chip label={`Sevk Kodu: ${detail.dispatchCode}`} color="info" size="small" />}
//                                                     </Stack>
//                                                     <Grid container spacing={2}>
//                                                         <Grid item xs={12} sm={4} md={3}>
//                                                             <CustomTextField
//                                                                 type="number" label="Miktar" placeholder="Miktar"
//                                                                 value={detail.quantity}
//                                                                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
//                                                                     const val = e.target.value;
//                                                                     setReceiptDetails(prev => {
//                                                                         const list = [...prev];
//                                                                         const row = { ...list[index] };
//                                                                         const maxQ = Number(row.maxDispatchQuantity);
//                                                                         const num = Number(val);
//                                                                         if (isNaN(num) || num < 0) { showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning'); row.quantity = 0; }
//                                                                         else if (num > maxQ) { showAlert(`Girdiğiniz miktar sevk miktarından (${maxQ}) fazla olamaz!`, 'warning'); row.quantity = maxQ; }
//                                                                         else row.quantity = num;
//                                                                         list[index] = row; return list;
//                                                                     });
//                                                                 }}
//                                                                 fullWidth size="small"
//                                                                 InputProps={{ endAdornment: (<InputAdornment position="end">{`Max: ${max}`}</InputAdornment>), inputProps: { min: 0 } }}
//                                                                 error={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(max))}
//                                                                 helperText={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(max)) ? `Max: ${max}` : ""}
//                                                             />
//                                                         </Grid>
//                                                         <Grid item xs={11} sm={7} md={8}>
//                                                             <CustomTextField
//                                                                 label="Açıklama" placeholder="Açıklama"
//                                                                 value={detail.description}
//                                                                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
//                                                                     const val = e.target.value;
//                                                                     setReceiptDetails(prev => {
//                                                                         const list = [...prev];
//                                                                         list[index] = { ...list[index], description: val };
//                                                                         return list;
//                                                                     });
//                                                                 }}
//                                                                 fullWidth size="small"
//                                                             />
//                                                         </Grid>
//                                                         <Grid item xs={1} sm={1} md={1}>
//                                                             <IconButton color="error" size="small" onClick={() => handleRemoveReceiptDetail(index)} disabled={loadingButton}>
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
//                                 <Button variant="outlined" color="secondary" onClick={resetFormAndState} disabled={loadingButton}>İptal Et</Button>
//                             </>
//                         ) : (
//                             hasCreatePermission && (
//                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak giriş belgesini kaydedin." : ""}>
//                                     <span>
//                                         <BlinkingButton variant="contained" color="success" onClick={insertReceipt} disabled={!isFormValid || loadingButton} isBlinking={isFormValid && !loadingButton}>
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
//                             <BlinkingButton variant="contained" color="secondary" onClick={() => setOpenDownloadFilteredModal(true)} startIcon={<IconFileDownload />} isBlinking={true} disabled={loadingData || displayedReceipts.length === 0}>
//                                 Filtrelenmişi İndir
//                             </BlinkingButton>
//                         </CustomTooltip>
//                     )}
//                     {hasDownloadPermission && (
//                         <Button variant="contained" color="primary" onClick={() => setOpenDownloadAllModal(true)} startIcon={<IconFileDownload />} disabled={loadingData || receiptList.length === 0}>
//                             Tümünü İndir
//                         </Button>
//                     )}
//                 </Stack>

//                 <Box sx={{ p: 2 }}>
//                     <Grid container spacing={2} alignItems="center">
//                         <Grid item xs={12} sm={6} md={4}>
//                             <TextField
//                                 label="Giriş Belgesi Ara" variant="outlined" fullWidth
//                                 value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
//                                 InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
//                             />
//                         </Grid>
//                         <Grid item xs={12} sm={6} md={8}>
//                             <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                 <Stack direction="row" spacing={1} alignItems="center">
//                                     <DatePicker label="Başlangıç Tarihi" value={startDate} inputFormat="dd/MM/yyyy" onChange={(v) => setStartDate(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
//                                     <DatePicker label="Bitiş Tarihi" value={endDate} inputFormat="dd/MM/yyyy" onChange={(v) => setEndDate(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
//                                     <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
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
//                                     <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
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
//                                                 {row.isEnd ? <Chip label="Sonlandı" color="error" size="small" /> : <Chip label="Açık" color="success" size="small" />}
//                                             </StyledTableCell>
//                                             <StyledTableCell>
//                                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
//                                                     <Button
//                                                         variant="outlined" startIcon={<IconEye />}
//                                                         onClick={() => { setDetailsToShow(row.receiptDetails || []); setOpenDetailsModal(true); }}
//                                                     >
//                                                         Görünüm
//                                                     </Button>
//                                                 </CustomTooltip>
//                                             </StyledTableCell>
//                                             <StyledTableCell>
//                                                 <IconButton onClick={(e) => { setSelectedRowForMenu(row); setAnchorEl(e.currentTarget); }}>
//                                                     <IconDots width={18} />
//                                                 </IconButton>
//                                                 <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
//                                                     {hasDownloadPermission && (
//                                                         <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
//                                                             <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir
//                                                         </MuiMenuItem>
//                                                     )}
//                                                     {hasEditPermission && (
//                                                         <MuiMenuItem onClick={handleEditClick}>
//                                                             <ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle
//                                                         </MuiMenuItem>
//                                                     )}
//                                                     {hasDeletePermission && (
//                                                         <MuiMenuItem onClick={handleClickOpenDeleteModal}>
//                                                             <ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek
//                                                         </MuiMenuItem>
//                                                     )}
//                                                 </Menu>
//                                             </StyledTableCell>
//                                         </TableRow>
//                                     ))
//                                 ) : (
//                                     <TableRow>
//                                         <StyledTableCell colSpan={6} align="center">
//                                             <Typography variant="subtitle1" color="textSecondary">Hiç giriş belgesi bulunamadı.</Typography>
//                                         </StyledTableCell>
//                                     </TableRow>
//                                 )}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                 )}

//                 <TablePagination
//                     rowsPerPageOptions={[5, 10, 25]} component="div"
//                     count={displayedReceipts.length} rowsPerPage={rowsPerPage} page={page}
//                     onPageChange={(_, p) => setPage(p)}
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
//                                     {detailsToShow.map((d, i) => (
//                                         <TableRow key={d.id || i}>
//                                             <StyledTableCell><Typography variant="body1">{d.item?.name || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{d.quantity || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{d.item?.unit?.title || '-'}</Typography></StyledTableCell>
//                                             <StyledTableCell><Typography variant="body1">{d.description || '-'}</Typography></StyledTableCell>
//                                         </TableRow>
//                                     ))}
//                                     <TableRow sx={{ backgroundColor: 'rgb(240, 240, 240)' }}>
//                                         <StyledTableCell sx={{ fontWeight: 'bold' }}>Toplam Miktar:</StyledTableCell>
//                                         <StyledTableCell sx={{ fontWeight: 'bold' }}>
//                                             {detailsToShow.reduce((s, d) => s + Number(d.quantity), 0)}
//                                         </StyledTableCell>
//                                         <StyledTableCell></StyledTableCell>
//                                         <StyledTableCell></StyledTableCell>
//                                     </TableRow>
//                                 </TableBody>
//                             </Table>
//                         </TableContainer>
//                     ) : (
//                         <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>Bu giriş belgesi için detay bulunamadı.</Typography>
//                     )}
//                 </DialogContent>
//                 <DialogActions><Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button></DialogActions>
//             </Dialog>

//             {/* Download Modals */}
//             <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
//                 <DialogTitle>Tüm Giriş Belgelerini İndir</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => { showAlert('Rapor oluşturuluyor...', 'info'); exportReceiptsToPdf(receiptList, 'Tüm Depo Giriş Raporu'); setOpenDownloadAllModal(false); }}>
//                             PDF Olarak İndir
//                         </Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={async () => { showAlert('Rapor oluşturuluyor...', 'info'); await exportReceiptsToExcel(receiptList, 'Tüm Depo Giriş Raporu'); setOpenDownloadAllModal(false); }}>
//                             Excel Olarak İndir
//                         </Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
//             </Dialog>

//             <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
//                 <DialogTitle>Filtrelenmiş Giriş Belgelerini İndir</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => { showAlert('Rapor oluşturuluyor...', 'info'); exportReceiptsToPdf(displayedReceipts, 'Filtrelenmiş Depo Giriş Raporu', `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay((endDate || new Date()).toISOString())}`); setOpenDownloadFilteredModal(false); }}>
//                             PDF Olarak İndir
//                         </Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={async () => { showAlert('Rapor oluşturuluyor...', 'info'); await exportReceiptsToExcel(displayedReceipts, 'Filtrelenmiş Depo Giriş Raporu'); setOpenDownloadFilteredModal(false); }}>
//                             Excel Olarak İndir
//                         </Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
//             </Dialog>

//             <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
//                 <DialogTitle>Dosya Formatını Seçin</DialogTitle>
//                 <DialogContent>
//                     <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
//                         <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadSingleReceipt('pdf')}>PDF Olarak İndir</Button>
//                         <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadSingleReceipt('excel')}>Excel Olarak İndir</Button>
//                     </Stack>
//                 </DialogContent>
//                 <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button></DialogActions>
//             </Dialog>

//             {/* Delete */}
//             <DeleteReceiptsDestructionSendedFromStore
//                 openModal={openDeleteModal}
//                 onClose={handleCloseDeleteModal}
//                 receiptIdToDelete={receiptIdToDelete}
//                 receiptCodeToDelete={receiptCodeToDelete}
//                 onDeleteSuccess={() => fetchInitialData()}
//                 showAlert={showAlert}
//             />

//             {/* Modal: Sonlandırma onayı */}
//             <Dialog open={openIsEndModal} onClose={() => setOpenIsEndModal(false)}>
//                 <DialogTitle>Fatura Durumu Onayı</DialogTitle>
//                 <DialogContent>
//                     <Typography>
//                         Fişi kaydettikten sonra, bu faturanın Fişini Sonlandırmak (Belge No: {lastCreatedReceiptCode ?? 'N/A'}) ister misiniz?
//                     </Typography>
//                     <Typography variant="caption" color="textSecondary">
//                         (Bu, bu faturaya ait başka bir fiş belgesi oluşturulamayacağı anlamına gelir.)
//                     </Typography>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => handleFinalSaveReceipt(false)} color="error">Hayır (Sadece Fişi Kaydet)</Button>
//                     <Button onClick={() => handleFinalSaveReceipt(true)} color="primary" variant="contained" autoFocus>Evet (Kaydet ve Fişi Sonlandır)</Button>
//                 </DialogActions>
//             </Dialog>

//             {/* Sonlandırılmış فاکتورها */}
//             <Dialog open={openInactiveModal} onClose={() => setOpenInactiveModal(false)} maxWidth="md" fullWidth>
//                 <DialogTitle>Sonlandırılmış Faturalar (Fişi Kesilmiş)</DialogTitle>
//                 <DialogContent dividers>
//                     <TableContainer component={Paper}>
//                         <Table size="small">
//                             <TableHead>
//                                 <TableRow>
//                                     <StyledTableCell><Typography variant="h6">Fatura No</Typography></StyledTableCell>
//                                     <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
//                                     <StyledTableCell align="right"><Typography variant="h6">İşlem</Typography></StyledTableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {inactiveInvoices.length > 0 ? (
//                                     inactiveInvoices.map((invoice) => (
//                                         <TableRow key={invoice.id}>
//                                             <StyledTableCell>{invoice.invoiceNo}</StyledTableCell>
//                                             <StyledTableCell>{formatDateDisplay(invoice.docDate)}</StyledTableCell>
//                                             <StyledTableCell align="right">
//                                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Faturayı aktif listeye geri alın" : ""}>
//                                                     <Button
//                                                         variant="outlined"
//                                                         size="small"
//                                                         color="warning"
//                                                         onClick={() => handleReactivateInvoice(invoice)}
//                                                     >
//                                                         Geri Al
//                                                     </Button>
//                                                 </CustomTooltip>
//                                             </StyledTableCell>
//                                         </TableRow>
//                                     ))
//                                 ) : (
//                                     <TableRow>
//                                         <StyledTableCell colSpan={3} align="center">
//                                             <Typography variant="subtitle1" color="textSecondary">Sonlandırılmış fatura bulunamadı.</Typography>
//                                         </StyledTableCell>
//                                     </TableRow>
//                                 )}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => setOpenInactiveModal(false)}>Kapat</Button>
//                 </DialogActions>
//             </Dialog>
//         </Box>
//     );
// };

// export default ListReceiptsDestructionSendedFromStore;

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell, MenuItem as MuiMenuItem, Typography, Menu,
    IconButton, ListItemIcon, Box, Stack, Grid, Button, Alert,
    TablePagination, TextField, InputAdornment, CircularProgress, Paper,
    Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions, Chip, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconEye, IconX,
    IconFileText, IconFileSpreadsheet
} from '@tabler/icons-react';
import BoltIcon from '@mui/icons-material/Bolt';
import ListIcon from '@mui/icons-material/List';
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
import DeleteReceiptsDestructionSendedFromStore from "./DeleteReceiptsDestructionSendedFromStore";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

// --- Styled ---
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
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

// --- Types ---
interface UnitType { id: string; title: string; }
interface ItemType { id: string; name: string; abbreviation?: string; unit: UnitType; }
interface WarehouseType { id: string | number; name: string; code: string; recordStatus?: number; status?: 'Aktif' | 'Pasif'; }

interface StoreType {
    id: string | number;
    name: string;
    code?: string;
    address?: string;
    recordStatus: number;
}
interface WorkRef { id: number; }
interface WorkhouseType {
    id: number;
    name: string;
    code?: string;
    recordStatus: number;
    work?: WorkRef;
    status?: 'Aktif' | 'Pasif';
}

interface DispatchHeader {
    id: string | number;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    status: number;
    statusDescription?: string | null;
    isEnd: boolean | null;
    destruction?: boolean | null;
    store: StoreType;
    storeDispatchDetails: Array<{
        id: string | number;
        quantity: string | number;
        createAt?: string;
        recordStatus?: number;
        description?: string;
        item: ItemType;
    }>;
}

interface StoreDispatchHeaders { id: string; code: string; docDate?: string; store?: { id: string | number; name: string; } }
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
    recordStatus: number;  // Durum ستون
    isEnd: boolean | null; // (دیگه برای رسید استفاده نمی‌کنیم)
    receiptDetails: ReceiptDetailType[];
    warehouse: WarehouseType;
    statusText?: 'Aktif' | 'Pasif';
    statusColor?: 'success' | 'error';
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
    receiptDetails: { itemId: number; quantity: number; description: string; StoreDispatchDetailId: number; }[];
}
interface EditReceiptData extends NewReceiptData { id: number; code: string; }

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

// --- Utils ---
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try { return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr }); }
    catch { return "Geçersiz Tarih"; }
};
const getStatus = (recordStatus: number): { text: 'Aktif' | 'Pasif', color: 'success' | 'error' } =>
    (recordStatus === 0 ? { text: 'Aktif', color: 'success' } : { text: 'Pasif', color: 'error' });

// --- PDF/Excel helpers (بدون تغییر اساسی) ---
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
    let y = pageHeight - 30;
    companyInfo.forEach(line => { doc.text(line, pageWidth / 2, y, { align: 'center' }); y += 4; });
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};
const exportReceiptsToPdf = (data: SendedReceiptType[], title: string, subtitle?: string) => {
    if (!data?.length) throw new Error('PDF oluşturulacak veri bulunamadı.');
    const doc = new jsPDF();
    const docAny = doc as any;

    data.forEach((receipt, index) => {
        let yPos = 55;
        if (index > 0) doc.addPage();
        addPdfHeader(doc, title, subtitle);

        doc.setFontSize(10);
        doc.text(`Giriş Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
        doc.text(`Belge Kodu: ${receipt.code || '-'}`, 15, yPos + 5);
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos + 10);
        yPos += 20;

        const head = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
        const body = (receipt.receiptDetails || []).map(d => [
            d.item?.name || '-',
            d.quantity,
            d.item?.unit?.title || '-',
            d.description || '-',
            d.storeDispatchDetail?.storeDispatchHeaders?.code || '-',
        ]);
        const totalQuantity = (receipt.receiptDetails || []).reduce((s, d) => s + Number(d.quantity), 0);

        autoTable(docAny, {
            startY: yPos, head: [head], body, theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: () => { addPdfFooter(doc); },
        });

        const finalY = docAny.lastAutoTable.finalY || yPos;
        doc.setFontSize(10);
        doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
};
const addExcelHeader = (ws: Excel.Worksheet, title: string, colLen: number) => {
    ws.views = [{ rightToLeft: true }];
    const t = ws.addRow([title]); t.font = { name: 'NotoSans', size: 14, bold: true };
    ws.mergeCells(t.number, 1, t.number, colLen); t.getCell(1).alignment = { horizontal: 'center' };
    const d = ws.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
    d.font = { name: 'NotoSans', size: 10 }; ws.mergeCells(d.number, 1, d.number, colLen);
    ws.addRow([]);
};
const addExcelCompanyInfo = (ws: Excel.Worksheet, startRow: number, colLen: number) => {
    const lines = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
    ];
    let r = startRow;
    lines.forEach(line => {
        const row = ws.getRow(r);
        row.getCell(1).value = line;
        row.getCell(1).alignment = { horizontal: 'center', readingOrder: 'ltr' };
        row.getCell(1).font = { name: 'NotoSans', size: 8 };
        ws.mergeCells(`A${r}:${String.fromCharCode(65 + colLen - 1)}${r}`); r++;
    });
};
const exportReceiptsToExcel = async (data: SendedReceiptType[], title: string) => {
    if (!data?.length) throw new Error('Excel oluşturulacak veri bulunamadı.');

    const wb = new Excel.Workbook();
    data.forEach(receipt => {
        const ws = wb.addWorksheet(`Giriş_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_'));
        const head = ['Malzeme', 'Miktar', 'Birim', 'Açıklama', 'Sevk Kodu'];
        addExcelHeader(ws, title, head.length);

        ws.addRow([`Belge Kodu:`, receipt.code]);
        ws.addRow([`Giriş Depo:`, receipt.warehouse?.name || '-']);
        ws.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
        ws.addRow([]);

        const hr = ws.addRow(head);
        hr.font = { name: 'NotoSans', bold: true };
        hr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        (receipt.receiptDetails || []).forEach(d => {
            ws.addRow([
                d.item?.name || '-', d.quantity, d.item?.unit?.title || '-', d.description || '-',
                d.storeDispatchDetail?.storeDispatchHeaders?.code || '-',
            ]);
        });

        const total = (receipt.receiptDetails || []).reduce((s, d) => s + Number(d.quantity), 0);
        const tr = ws.addRow(['Toplam Miktar', total, '', '', '']);
        tr.font = { name: 'NotoSans', bold: true }; tr.getCell(2).numFmt = '0';

        ws.addRow([]);
        addExcelCompanyInfo(ws, ws.lastRow!.number + 2, head.length);
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}.xlsx`);
};

// --- Component ---
const ListReceiptsDestructionSendedFromStore = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // State (form)
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);

    // NEW combos like original component:
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [dispatchHeadersList, setDispatchHeadersList] = useState<DispatchHeader[]>([]);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [selectedDispatchId, setSelectedDispatchId] = useState<number | null>(null);

    const [workhouseError, setWorkhouseError] = useState(false);
    const [storeError, setStoreError] = useState(false);
    const [dispatchError, setDispatchError] = useState(false);

    const [loadingWorkhouses, setLoadingWorkhouses] = useState(false);
    const [loadingStores, setLoadingStores] = useState(false);
    const [loadingDispatches, setLoadingDispatches] = useState(false);

    // details
    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);

    // list/grid
    const [receiptList, setReceiptList] = useState<SendedReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<SendedReceiptType[]>([]);

    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);

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

    // End flow (ONLY dispatch now)
    const [openIsEndModal, setOpenIsEndModal] = useState(false);
    // const [lastCreatedReceiptCode, setLastCreatedReceiptCode] = useState<string | null>(null);

    // Modal to manage dispatch list
    const [openDispatchManageModal, setOpenDispatchManageModal] = useState(false);
    const [dispatchManageFilterInactiveOnly, setDispatchManageFilterInactiveOnly] = useState(false);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();
    const ops = allowedOperations ?? [];
    const hasCreatePermission = useMemo(() => ops.some(op => op.systemOperationName === 'Eklemek'), [ops]);
    const hasEditPermission = useMemo(() => ops.some(op => op.systemOperationName === 'Düzenlemek'), [ops]);
    const hasDeletePermission = useMemo(() => ops.some(op => op.systemOperationName === 'Silmek'), [ops]);
    const hasDownloadPermission = useMemo(() => ops.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [ops]);

    // Helpers
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);

    // --- Fetchers for combos (like original) ---
    const fetchWarehouses = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) { navigate("/"); return []; }
        try {
            const res = await axios.get<ApiResponse<WarehouseType[]>>(
                server.baseurl + server.initialoperations + "get-warehouses",
                { headers: { "Authorization": `Bearer ${token}` } }
            );
            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const active = res.data.data.filter(s => s.recordStatus === 0).map(s => ({ ...s, id: Number(s.id) }));
                setWarehouses(active);
                return active;
            } else { showAlert(res.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error'); return []; }
        } catch { showAlert('Depolar yüklenirken bir hata oluştu.', 'error'); return []; }
    }, [navigate, showAlert]);

    const fetchWorkhouses = useCallback(async () => {
        setLoadingWorkhouses(true);
        const token = localStorage.getItem('authToken');
        if (!token) { navigate("/"); setLoadingWorkhouses(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse",
                { headers: { "Authorization": `Bearer ${token}` } });
            if (response.data?.httpStatusCode === 200) {
                const normalized: WorkhouseType[] = (response.data.data as any[]).map(i => ({
                    id: Number(i.id), name: String(i.name ?? ''), code: i.code ?? undefined,
                    recordStatus: Number(i.recordStatus ?? 1),
                    work: i.work ? { id: Number(i.work.id) } : undefined,
                    status: Number(i.recordStatus) === 0 ? 'Aktif' : 'Pasif',
                }));
                setWorkhousesList(normalized.filter(w => w.recordStatus === 0));
            } else showAlert(response.data?.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error');
        } catch { showAlert('Şantiyeler yüklenirken bir hata oluştu.', 'error'); }
        finally { setLoadingWorkhouses(false); }
    }, [navigate, showAlert]);

    const fetchStoresByWorkhouseId = useCallback(async (workhouseId: string | number) => {
        if (!authToken) { navigate("/"); return []; }
        setLoadingStores(true);
        try {
            const res = await axios.get(
                server.baseurl + server.initialoperations + `get-stores-by-workhouse-id/${Number(workhouseId)}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (res.data.httpStatusCode === 200) {
                const active = (res.data.data as StoreType[]).filter(s => s.recordStatus === 0);
                setStoresList(active); return active;
            } else { showAlert(res.data.message || 'Şantiye Depoları yüklenirken bir hata oluştu.', 'error'); setStoresList([]); return []; }
        } catch { showAlert('Şantiye Depoları yüklenirken bir hata oluştu.', 'error'); setStoresList([]); return []; }
        finally { setLoadingStores(false); }
    }, [authToken, navigate, showAlert]);

    // IMPORTANT: fill Sevk Belgesi combo from "get-Store-dispatches-return-to-center"
    const fetchDispatchHeadersByStoreId = useCallback(async (storeId: number | string) => {
        if (!authToken) { navigate("/"); return []; }
        setLoadingDispatches(true);
        try {
            // اگر مسیر دقیق متفاوت است این URL را مطابق بک‌اند اصلاح کنید
            const url = server.baseurl + server.warehouse + `get-Store-dispatches-return-to-center/${Number(storeId)}`;
            const res = await axios.get(url, { headers: { "Authorization": `Bearer ${authToken}` } });

            if (res.data?.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                // تمام dispatchها را می‌آوریم؛ فیلتر وضعیت انتخابی بعداً در مودال
                const all: DispatchHeader[] = res.data.data;
                setDispatchHeadersList(all);
                return all;
            } else {
                showAlert(res.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
                setDispatchHeadersList([]); return [];
            }
        } catch {
            showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            setDispatchHeadersList([]); return [];
        } finally { setLoadingDispatches(false); }
    }, [authToken, showAlert, navigate]);

    // receipts list
    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            await Promise.all([fetchWarehouses(), fetchWorkhouses()]);
            const receiptsRes = await axios.get<ApiResponse<SendedReceiptType[]>>(
                server.baseurl + server.warehouse + `get-Receipt-destruction-sended-from-store-to-warehouse`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (receiptsRes.data?.httpStatusCode === 200) {
                const formatted = receiptsRes.data.data.map(d => ({ ...d, ...getStatus(d.recordStatus) }));
                setReceiptList(formatted);
            } else {
                showAlert(receiptsRes.data?.message || 'Giriş belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch { showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error'); }
        finally { setLoadingData(false); }
    }, [authToken, fetchWarehouses, fetchWorkhouses, navigate, showAlert]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // --- chained combos like original ---
    useEffect(() => {
        setSelectedStoreId(null); setStoresList([]);
        setSelectedDispatchId(null); setDispatchHeadersList([]);
        setReceiptDetails([]);
        if (selectedWorkhouseId) {
            fetchStoresByWorkhouseId(selectedWorkhouseId);
            if (workhouseError) setWorkhouseError(false);
        }
    }, [selectedWorkhouseId, fetchStoresByWorkhouseId, workhouseError]);

    useEffect(() => {
        setSelectedDispatchId(null); setDispatchHeadersList([]);
        setReceiptDetails([]);
        if (selectedStoreId) {
            fetchDispatchHeadersByStoreId(selectedStoreId);
            if (storeError) setStoreError(false);
        }
    }, [selectedStoreId, fetchDispatchHeadersByStoreId, storeError]);

    // when dispatch changes -> fill receiptDetails from its storeDispatchDetails
    useEffect(() => {
        if (!selectedDispatchId) return;
        const selected = dispatchHeadersList.find(d => Number(d.id) === Number(selectedDispatchId));
        if (!selected) return;

        const details: FormReceiptDetail[] = (selected.storeDispatchDetails || []).map((detail) => ({
            itemId: Number(detail.item.id),
            quantity: Number(detail.quantity),
            description: detail.description || '',
            StoreDispatchDetailId: Number(detail.id),
            item: detail.item,
            dispatchCode: selected.code,
            maxDispatchQuantity: Number(detail.quantity),
            StoreDispatchId: Number(selected.id),
        }));
        setReceiptDetails(details);
        if (dispatchError) setDispatchError(false);
    }, [selectedDispatchId, dispatchHeadersList, dispatchError]);

    // selected dispatch code (for modal text)
    const selectedDispatchCode = useMemo(() => {
        const found = dispatchHeadersList.find(d => Number(d.id) === Number(selectedDispatchId));
        return found?.code ?? null;
    }, [dispatchHeadersList, selectedDispatchId]);

    // filters
    useEffect(() => {
        const s = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
        const e = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
        const list = receiptList.filter(r => {
            const txt = (r.code?.toLowerCase() ?? '') + ' ' + (r.warehouse?.name?.toLowerCase() ?? '');
            const matches = txt.includes(searchTerm.toLowerCase());
            const t = new Date(r.docDate);
            const okS = !s || t >= s;
            const okE = !e || t <= e;
            return matches && okS && okE;
        });
        setDisplayedReceipts(list); setPage(0);
    }, [receiptList, searchTerm, startDate, endDate]);

    useEffect(() => {
        setIsFilterActive((searchTerm.trim() !== '') || startDate !== null || endDate !== null);
    }, [searchTerm, startDate, endDate]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

    // form validity
    const isFormValid = useMemo(() => {
        if (!selectedWorkhouseId || !selectedStoreId || !selectedDispatchId) return false;
        if (!selectedWarehouseId || !docDate) return false;
        if (receiptDetails.length === 0) return false;

        const byDetail = receiptDetails.reduce((m, d) => {
            const q = Number(d.quantity) || 0;
            m[d.StoreDispatchDetailId] = (m[d.StoreDispatchDetailId] ?? 0) + q;
            return m;
        }, {} as Record<number, number>);

        return receiptDetails.every(d => {
            const q = Number(d.quantity);
            return (
                d.itemId > 0 &&
                d.StoreDispatchDetailId > 0 &&
                Number.isFinite(q) &&
                q > 0 &&
                byDetail[d.StoreDispatchDetailId] <= Number(d.maxDispatchQuantity)
            );
        });
    }, [selectedWorkhouseId, selectedStoreId, selectedDispatchId, selectedWarehouseId, docDate, receiptDetails]);

    const validateForm = (): boolean => {
        let ok = true;
        if (!selectedWorkhouseId) { setWorkhouseError(true); ok = false; }
        if (!selectedStoreId) { setStoreError(true); ok = false; }
        if (!selectedDispatchId) { setDispatchError(true); ok = false; }
        if (!selectedWarehouseId) { setWarehouseIdError(true); ok = false; }
        if (!docDate) { setDocDateError(true); ok = false; }

        if (receiptDetails.length === 0) { setReceiptDetailsError(true); ok = false; }
        else {
            const byDetail = receiptDetails.reduce((m, d) => {
                const q = Number(d.quantity) || 0;
                m[d.StoreDispatchDetailId] = (m[d.StoreDispatchDetailId] ?? 0) + q;
                return m;
            }, {} as Record<number, number>);

            const detailsOk = receiptDetails.every(d => {
                const q = Number(d.quantity);
                const max = Number(d.maxDispatchQuantity);
                if (!Number.isFinite(q) || q <= 0) return false;
                if (byDetail[d.StoreDispatchDetailId] > max) return false;
                if (d.StoreDispatchDetailId <= 0 || d.itemId <= 0) return false;
                return true;
            });
            setReceiptDetailsError(!detailsOk);
            if (!detailsOk) ok = false;
        }

        if (!ok) showAlert('Lütfen tüm zorunlu alanları (Şantiye, Şantiye Depo, Sevk Belgesi, Giriş Depo, Tarih) doldurun ve ürün satırlarını doğru girin.', 'warning');
        return ok;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setSelectedWarehouseId(null);

        setSelectedWorkhouseId(null);
        setSelectedStoreId(null);
        setSelectedDispatchId(null);
        setStoresList([]);
        setDispatchHeadersList([]);

        setReceiptDetails([]);
        setEditingId(null);
        setEditingCode(null);
        setDocDateError(false);
        setWarehouseIdError(false);
        setReceiptDetailsError(false);
        setIsFormVisible(false);
        setRemovedReceiptDetails([]);
        // setLastCreatedReceiptCode(null);
        setWorkhouseError(false);
        setStoreError(false);
        setDispatchError(false);
    };

    // --- API: update dispatch isEnd (enable/disable combo option)
    const updateDispatchIsEnd = async (dispatchId: number, isEnd: boolean) => {
        const url = server.baseurl + server.warehouse + "update-store-dispatch-is-end";
        const payload = { id: dispatchId, isEnd };
        const res = await axios.put(url, payload, {
            headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
        });
        return res?.data;
    };

    // --- Insert receipt (no isEnd on receipt!)
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
            const res = await axios.post(
                server.baseurl + server.warehouse + "create-receipt-destruction-sended-from-store-to-warehouse",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (res.data.httpStatusCode === 201) {
                showAlert('Yeni giriş belgesi başarıyla eklendi!', 'success');
                // setLastCreatedReceiptCode(res.data?.data?.code ?? null);
                // پس از ذخیره، بپرسیم آیا کمبو (Sevk Belgesi) غیرفعال شود؟
                setOpenIsEndModal(true);
                // لیست اصلی را رفرش کنیم
                await fetchInitialData();
            } else showAlert(res.data.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    // --- Edit receipt
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
            const res = await axios.put(
                server.baseurl + server.warehouse + "update-receipt-destruction-sended-from-store-to-warehouse",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (res.data.httpStatusCode === 200) {
                showAlert('Giriş belgesi başarıyla güncellendi!', 'success');
                resetFormAndState(); fetchInitialData();
            } else showAlert(res.data.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    // --- After insert: ask to disable selected dispatch (combo)
    const handleFinalToggleDispatch = async (shouldDisable: boolean) => {
        try {
            if (!shouldDisable) {
                showAlert('Fiş kaydedildi.', 'success');
                setOpenIsEndModal(false);
                resetFormAndState();
                return;
            }
            if (!selectedDispatchId) {
                showAlert('Sevk Belgesi seçilmedi.', 'error');
                setOpenIsEndModal(false);
                return;
            }
            const res = await updateDispatchIsEnd(Number(selectedDispatchId), true);
            if (res?.httpStatusCode === 200) {
                showAlert(`Sevk Belgesi ${selectedDispatchCode ?? ''} sonlandırıldı.`, 'success');
                setOpenIsEndModal(false);
                // بازخوانی کمبو تا وضعیت isEnd را ببینیم
                if (selectedStoreId) await fetchDispatchHeadersByStoreId(selectedStoreId);
                resetFormAndState();
            } else showAlert(res?.message || 'Sevk Belgesi sonlandırılamadı.', 'error');
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Sevk Belgesi sonlandırılırken bir hata oluştu.', 'error');
        }
    };

    // --- Manage Dispatch Modal helpers ---
    const openManageModal = (inactiveOnly: boolean) => {
        setDispatchManageFilterInactiveOnly(inactiveOnly);
        setOpenDispatchManageModal(true);
    };
    const handleChangeDispatchActiveState = async (dispatch: DispatchHeader, makeActive: boolean) => {
        try {
            const res = await updateDispatchIsEnd(Number(dispatch.id), !makeActive); // active => isEnd=false
            if (res?.httpStatusCode === 200) {
                showAlert(`Sevk Belgesi ${dispatch.code} ${makeActive ? 'aktif' : 'sonlandırıldı'}.`, 'success');
                // update local list
                setDispatchHeadersList(prev => prev.map(d => d.id === dispatch.id ? { ...d, isEnd: !makeActive } : d));
            } else showAlert(res?.message || 'Güncelleme başarısız.', 'error');
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Güncelleme sırasında hata oluştu.', 'error');
        }
    };

    // UI handlers
    const handleCancelEdit = () => resetFormAndState();
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
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
        setReceiptDetails(prev => {
            const list = [...prev];
            const row = { ...list[index] };
            const max = Number(row.maxDispatchQuantity);

            if (field === 'quantity') {
                const num = Number(value);
                if (isNaN(num) || num < 0) { showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning'); row.quantity = 0; }
                else if (num > max) { showAlert(`Girdiğiniz miktar sevk miktarından (${max}) fazla olamaz!`, 'warning'); row.quantity = max; }
                else row.quantity = num;
            } else if (field === 'description') row.description = value;

            list[index] = row;
            return list;
        });
    }, [showAlert]);

    const handleOpenRowDownloadModal = (receipt: SendedReceiptType) => { setSelectedReceiptForDownload(receipt); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleDownloadSingleReceipt = async (format: 'pdf' | 'excel') => {
        if (!selectedReceiptForDownload) return;
        const data = [selectedReceiptForDownload];
        const title = `Giriş Belgesi Detayları: ${selectedReceiptForDownload.code}`;
        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') exportReceiptsToPdf(data, title);
            else await exportReceiptsToExcel(data, title);
            showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error'); }
        finally { setOpenRowDownloadModal(false); }
    };

    const handleDownload = async (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const data = isFiltered ? displayedReceipts : receiptList;
        const title = isFiltered ? 'Filtrelenmiş Depo Giriş Raporu' : 'Tüm Depo Giriş Raporu';
        const end = endDate || new Date();
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(end.toISOString())}` : undefined;

        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') exportReceiptsToPdf(data, title, subtitle);
            else await exportReceiptsToExcel(data, title);
            showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error'); }
    };

    const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };
    const handleRemoveReceiptDetail = useCallback((index: number) => {
        setReceiptDetails(prev => {
            const removed = prev[index]; if (!removed) return prev;
            setRemovedReceiptDetails(p => [...p, removed]);
            const next = prev.filter((_, i) => i !== index);
            setReceiptDetailsError(next.length === 0);
            return next;
        });
    }, []);
    const handleRestoreRemovedDetail = useCallback((idx: number) => {
        const item = removedReceiptDetails[idx];
        if (item) {
            setReceiptDetails(prev => [...prev, item]);
            setRemovedReceiptDetails(prev => prev.filter((_, i) => i !== idx));
            setReceiptDetailsError(false);
        }
    }, [removedReceiptDetails]);

    // --- Render ---
    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Depoya Gelen (İmha/İade) Sevk Girişleri</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Giriş Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} startIcon={<IconPlus />}>
                                Yeni Giriş Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button variant="contained" color="error" onClick={resetFormAndState} disabled={loadingButton} startIcon={<IconX size={20} />}>
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Stack>

            {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" mb={2}>{editingId ? 'Depo Giriş Belgesini Düzenle' : 'Yeni Depo Giriş Belgesi'}</Typography>

                    {/* Combos Row */}
                    <Grid container spacing={2}>
                        {/* Şantiye */}
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel required>Şantiye</CustomFormLabel>
                            <Autocomplete
                                options={workhousesList}
                                value={workhousesList.find(w => Number(w.id) === selectedWorkhouseId) || null}
                                loading={loadingWorkhouses}
                                getOptionLabel={(o) => o.name}
                                isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                                onChange={(_, v) => { setSelectedWorkhouseId(v ? Number(v.id) : null); setWorkhouseError(false); }}
                                renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Şantiye seçin" error={workhouseError} helperText={workhouseError ? "Şantiye zorunludur!" : ""} />
                                )}
                            />
                        </Grid>

                        {/* Şantiye Depo */}
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel required>Şantiye Depo</CustomFormLabel>
                            <Autocomplete
                                options={storesList}
                                value={storesList.find(s => Number(s.id) === selectedStoreId) || null}
                                loading={loadingStores}
                                getOptionLabel={(o) => o.name}
                                isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                                onChange={(_, v) => { setSelectedStoreId(v ? Number(v.id) : null); setStoreError(false); }}
                                renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Şantiye Depo seçin" error={storeError} helperText={storeError ? "Şantiye Depo zorunludur!" : ""} />
                                )}
                            />
                        </Grid>

                        {/* Sevk Belgesi + Manage Button */}
                        <Grid item xs={12} sm={4}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <CustomFormLabel required>Sevk Belgesi</CustomFormLabel>
                                <CustomTooltip title="Sevk Belgeleri listesi">
                                    <span>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<ListIcon />}
                                            onClick={() => openManageModal(false)}
                                            disabled={!dispatchHeadersList.length}
                                        >
                                            Listeyi Göster
                                        </Button>
                                    </span>
                                </CustomTooltip>
                            </Stack>
                            <Autocomplete
                                options={dispatchHeadersList.filter(d => d.isEnd !== true)} // only active options
                                value={dispatchHeadersList.find(d => Number(d.id) === selectedDispatchId) || null}
                                loading={loadingDispatches}
                                getOptionLabel={(o) => `${o.code} — ${formatDateDisplay(o.docDate)}`}
                                isOptionEqualToValue={(a, b) => Number(a.id) === Number(b.id)}
                                onChange={(_, v) => { setSelectedDispatchId(v ? Number(v.id) : null); setDispatchError(false); }}
                                renderInput={(params) => (
                                    <TextField {...params} size="small" placeholder="Sevk Belgesi seçin" error={dispatchError} helperText={dispatchError ? "Sevk Belgesi zorunludur!" : ""} />
                                )}
                            />
                        </Grid>

                        {/* Giriş Depo */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel required>Giriş Depo</CustomFormLabel>
                            <Autocomplete
                                id="warehouse-select"
                                options={warehouses.filter(w => (w.recordStatus ?? 0) === 0)}
                                getOptionLabel={(option) => option.name}
                                value={warehouses.find(w => Number(w.id) === selectedWarehouseId) || null}
                                onChange={(_, newValue) => { const newId = newValue ? Number(newValue.id) : null; setSelectedWarehouseId(newId); if (warehouseIdError && newValue) setWarehouseIdError(false); }}
                                isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                                renderInput={(params) => (
                                    <TextField {...params} fullWidth size="small" placeholder="Giriş Depo Seçin" error={warehouseIdError} helperText={warehouseIdError ? "Depo seçimi zorunludur!" : ""} />
                                )}
                            />
                        </Grid>

                        {/* Belge Tarihi */}
                        <Grid item xs={12} sm={6}>
                            <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    value={docDate}
                                    onChange={(v) => { setDocDate(v); if (docDateError && v) setDocDateError(false); }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => <TextField {...params} fullWidth size="small" error={docDateError} helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""} />}
                                />
                            </LocalizationProvider>
                        </Grid>
                    </Grid>

                    {/* Details */}
                    <Box mt={4}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={1} flexWrap="wrap">
                            <Typography variant="h6">Giriş Detayları</Typography>
                            {/* <Stack direction="row" spacing={1} alignItems="center">
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Sonlandırılmış Sevk Belgeleri" : ""}>
                                    <span>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            startIcon={<IconBan size={18} />}
                                            onClick={() => openManageModal(true)}
                                            disabled={!dispatchHeadersList.some(d => d.isEnd === true)}
                                        >
                                            Sonlandırılmış
                                        </Button>
                                    </span>
                                </CustomTooltip>
                            </Stack> */}
                        </Stack>

                        {removedReceiptDetails.length > 0 && (
                            <Box sx={{ border: '1px dashed', borderColor: "error.main", p: 2, mb: 2, mt: 2, borderRadius: 1, backgroundColor: 'rgba(255, 0, 0, 0.05)' }}>
                                <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler (Geri Yüklemek İçin Tıklayın)</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {removedReceiptDetails.map((detail, idx) => (
                                        <Chip
                                            key={idx}
                                            label={`${detail?.item?.name || 'Ürün'} (${detail.quantity} ${detail?.item?.unit?.title || 'Birim'})`}
                                            color="error" variant="outlined"
                                            onClick={() => handleRestoreRemovedDetail(idx)}
                                            onDelete={() => handleRestoreRemovedDetail(idx)}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {loadingData && selectedDispatchId ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={24} />
                                <Typography variant="caption" sx={{ ml: 1 }}>Sevk detayları yükleniyor...</Typography>
                            </Box>
                        ) : (
                            <Grid container spacing={2}>
                                {receiptDetails.length === 0 && selectedDispatchId ? (
                                    <Grid item xs={12}><Alert severity="info">Seçilen sevk belgesi için ürün detayı bulunamadı.</Alert></Grid>
                                ) : (
                                    receiptDetails.map((detail, index) => {
                                        const max = detail.maxDispatchQuantity;
                                        const itemLabel = detail.item?.name || 'Ürün Adı Bulunamadı';
                                        const unitLabel = detail.item?.unit?.title || 'Birim';
                                        return (
                                            <Grid item xs={12} key={index}>
                                                <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{itemLabel}</Typography>
                                                        <Chip label={unitLabel} color="success" size="small" />
                                                        {detail.dispatchCode && <Chip label={`Sevk Kodu: ${detail.dispatchCode}`} color="info" size="small" />}
                                                    </Stack>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={4} md={3}>
                                                            <CustomTextField
                                                                type="number" label="Miktar" placeholder="Miktar"
                                                                value={detail.quantity}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                                fullWidth size="small"
                                                                InputProps={{ endAdornment: (<InputAdornment position="end">{`Max: ${max}`}</InputAdornment>), inputProps: { min: 0 } }}
                                                                error={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(max))}
                                                                helperText={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(max)) ? `Max: ${max}` : ""}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={11} sm={7} md={8}>
                                                            <CustomTextField
                                                                label="Açıklama" placeholder="Açıklama"
                                                                value={detail.description}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                                fullWidth size="small"
                                                            />
                                                        </Grid>
                                                        <Grid item xs={1} sm={1} md={1}>
                                                            <IconButton color="error" size="small" onClick={() => handleRemoveReceiptDetail(index)} disabled={loadingButton}>
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
                                        <BlinkingButton variant="contained" color="success" onClick={insertReceipt} disabled={!isFormValid || loadingButton} isBlinking={isFormValid && !loadingButton}>
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
                            <BlinkingButton variant="contained" color="secondary" onClick={() => setOpenDownloadFilteredModal(true)} startIcon={<IconFileDownload />} isBlinking={true} disabled={loadingData || displayedReceipts.length === 0}>
                                Filtrelenmişi İndir
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {hasDownloadPermission && (
                        <Button variant="contained" color="primary" onClick={() => setOpenDownloadAllModal(true)} startIcon={<IconFileDownload />} disabled={loadingData || receiptList.length === 0}>
                            Tümünü İndir
                        </Button>
                    )}
                </Stack>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                label="Giriş Belgesi Ara" variant="outlined" fullWidth
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={8}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Başlangıç Tarihi" value={startDate} inputFormat="dd/MM/yyyy" onChange={(v) => setStartDate(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                                    <DatePicker label="Bitiş Tarihi" value={endDate} inputFormat="dd/MM/yyyy" onChange={(v) => setEndDate(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
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

                                            {/* Durum now based on recordStatus */}
                                            <StyledTableCell>
                                                {row.recordStatus === 0 ? (
                                                    <Chip label="Aktif" color="success" size="small" />
                                                ) : (
                                                    <Chip label="Pasif" color="error" size="small" />
                                                )}
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                    <Button
                                                        variant="outlined" startIcon={<IconEye />}
                                                        onClick={() => { setDetailsToShow(row.receiptDetails || []); setOpenDetailsModal(true); }}
                                                    >
                                                        Görünüm
                                                    </Button>
                                                </CustomTooltip>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(e) => { setSelectedRowForMenu(row); setAnchorEl(e.currentTarget); }}>
                                                    <IconDots width={18} />
                                                </IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasEditPermission && (
                                                        <MuiMenuItem onClick={() => {
                                                            // Prefill edit using row
                                                            const firstDetail = row.receiptDetails?.[0];
                                                            const sdh = firstDetail?.storeDispatchDetail?.storeDispatchHeaders;
                                                            const dispatchId = sdh?.id ? Number(sdh.id) : null;
                                                            const storeId = sdh?.store?.id ? Number(sdh.store.id) : null;

                                                            if (storeId) {
                                                                setSelectedStoreId(storeId);
                                                                fetchDispatchHeadersByStoreId(storeId);
                                                            }
                                                            if (dispatchId) setSelectedDispatchId(dispatchId);

                                                            const maxMap = new Map<number, number>();
                                                            const activeSelected = dispatchHeadersList.find(d => Number(d.id) === (dispatchId ?? -1));
                                                            if (activeSelected) {
                                                                activeSelected.storeDispatchDetails.forEach(dd => {
                                                                    maxMap.set(Number(dd.id), Number(dd.quantity));
                                                                });
                                                            }

                                                            const formatted: FormReceiptDetail[] = (row.receiptDetails || []).map(d => {
                                                                const sdd = d.storeDispatchDetail;
                                                                const sddId = sdd ? Number(sdd.id) : 0;
                                                                const maxQty = maxMap.has(sddId) ? Number(maxMap.get(sddId)) : (sdd?.quantity ? Number(sdd.quantity) : Number(d.quantity));
                                                                const dispCode = sdh?.code || 'N/A';
                                                                return {
                                                                    itemId: Number(d.item.id),
                                                                    quantity: Number(d.quantity),
                                                                    description: d.description || '',
                                                                    StoreDispatchDetailId: sddId,
                                                                    item: d.item,
                                                                    dispatchCode: dispCode,
                                                                    maxDispatchQuantity: maxQty,
                                                                    StoreDispatchId: dispatchId ?? 0,
                                                                };
                                                            });

                                                            setReceiptDetails(formatted);
                                                            if (sdh?.store?.id) setSelectedStoreId(Number(sdh.store.id));
                                                            setEditingId(row.id);
                                                            setEditingCode(row.code);
                                                            setDocDate(new Date(row.docDate));
                                                            setSelectedWarehouseId(Number(row.warehouse?.id) || null);
                                                            setIsFormVisible(true);
                                                            handleCloseMenu();
                                                        }}>
                                                            <ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                            <ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek
                                                        </MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={6} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç giriş belgesi bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]} component="div"
                    count={displayedReceipts.length} rowsPerPage={rowsPerPage} page={page}
                    onPageChange={(_, p) => setPage(p)}
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
                                    {detailsToShow.map((d, i) => (
                                        <TableRow key={d.id || i}>
                                            <StyledTableCell><Typography variant="body1">{d.item?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{d.quantity || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{d.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{d.description || '-'}</Typography></StyledTableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow sx={{ backgroundColor: 'rgb(240, 240, 240)' }}>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Toplam Miktar:</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>
                                            {detailsToShow.reduce((s, d) => s + Number(d.quantity), 0)}
                                        </StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>Bu giriş belgesi için detay bulunamadı.</Typography>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Download Modals */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Giriş Belgelerini İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => { handleDownload('pdf', false); setOpenDownloadAllModal(false); }}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => { handleDownload('excel', false); setOpenDownloadAllModal(false); }}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Giriş Belgelerini İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => { handleDownload('pdf', true); setOpenDownloadFilteredModal(false); }}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => { handleDownload('excel', true); setOpenDownloadFilteredModal(false); }}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadSingleReceipt('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadSingleReceipt('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Delete */}
            <DeleteReceiptsDestructionSendedFromStore
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />

            {/* Modal: بعد از Insert فقط برای Sevk Belgesi */}
            <Dialog open={openIsEndModal} onClose={() => setOpenIsEndModal(false)}>
                <DialogTitle>Fatura Durumu Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Fişi kaydettiniz. Bu faturanın ilgili <b>Sevk Belgesi</b>'ni Sonlandırmak
                        (Sevk Belgesi: {selectedDispatchCode ?? 'N/A'}) ister misiniz?
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        (Bu, bu Sevk Belgesi için başka bir giriş belgesi oluşturulamayacağı anlamına gelir.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleFinalToggleDispatch(false)} color="error">Hayır</Button>
                    <Button onClick={() => handleFinalToggleDispatch(true)} color="primary" variant="contained" autoFocus>Evet (Sevk Belgesi’ni Sonlandır)</Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Yönet/نمایش لیست کل Sevk Belgeleri با رادیوباتن فعال/غیر فعال */}
            <Dialog open={openDispatchManageModal} onClose={() => setOpenDispatchManageModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sevk Belgeleri Yönetimi</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell align="right"><Typography variant="h6">Aktif / Sonlandırılmış</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dispatchHeadersList
                                    .filter(d => dispatchManageFilterInactiveOnly ? d.isEnd === true : true)
                                    .map(d => (
                                        <TableRow key={String(d.id)}>
                                            <StyledTableCell>{d.code}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(d.docDate)}</StyledTableCell>
                                            <StyledTableCell>
                                                {d.isEnd ? <Chip label="Sonlandırılmış" color="error" size="small" /> : <Chip label="Aktif" color="success" size="small" />}
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                <RadioGroup
                                                    row
                                                    value={d.isEnd ? 'inactive' : 'active'}
                                                    onChange={(e) => {
                                                        const v = e.target.value; // 'active' | 'inactive'
                                                        const makeActive = v === 'active';
                                                        handleChangeDispatchActiveState(d, makeActive);
                                                    }}
                                                >
                                                    <FormControlLabel value="active" control={<Radio />} label="Açık" />
                                                    <FormControlLabel value="inactive" control={<Radio />} label="Sonlandırılmış" />
                                                </RadioGroup>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDispatchManageModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListReceiptsDestructionSendedFromStore;
