import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, Autocomplete,
    Dialog, DialogTitle, DialogContent, DialogActions, Chip, Radio, RadioGroup, FormControlLabel,
    DialogContentText
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus,
    IconEye, IconX, IconFileText, IconFileSpreadsheet, IconList
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
import DeleteBetweenStoreReceipt from "./DeleteBetweenStoreReceipt";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

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
const BlinkingButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== 'isBlinking',
})<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

interface UnitType { id: string; title: string; }
interface ItemType { id: string; name: string; abbreviation: string; unit: UnitType; }

interface OriginStoreDispatchHeaders {
    id: string;
    code: string;
    docDate?: string;
    isEnd?: boolean | null;
}

interface OriginStoreDispatchDetail {
    id: string;
    quantity?: string;
    description?: string;
    storeDispatchHeaders?: OriginStoreDispatchHeaders | null;
}

interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
    originStoreDispatchDetail?: OriginStoreDispatchDetail | null;
}

interface StoreType { id: string; name: string; code: string; recordStatus?: number; }

interface BetweenStoreReceiptType {
    id: string;
    code: string;
    docDate: string;
    description: string,
    createAt: string;
    recordStatus: number;
    isEnd?: boolean | null;
    storeReceiptDetails: ReceiptDetailType[];
    store: StoreType;
}

interface DispatchDetail {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
}
interface DispatchEntity {
    id: string;
    code: string;
    docDate: string;
    storeDispatchDetails: DispatchDetail[];
    store: StoreType;
    isEnd?: boolean | null;
}

interface FormReceiptDetail {
    itemId: number;
    quantity: number | string;
    description: string;
    originStoreDispatchDeatailId: number;
    item?: ItemType;
    dispatchCode?: string;
    maxDispatchQuantity: number;
}

interface NewReceiptData {
    docDate: string;
    description: string,
    storeId: number;
    receiptDetails: {
        itemId: number;
        quantity: number;
        description: string;
        originStoreDispatchDeatailId: number;
    }[];
}

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

interface InactiveInvoice {
    id: string;
    invoiceNo: string;
    docDate: string;
}

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try { return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr }); }
    catch { return "Geçersiz Tarih"; }
};

const calculateReceiptSummaries = (details: any[]) => {
    const summary: Record<string, number> = {};
    details.forEach(d => {
        const unitTitle = d.item?.unit?.title || "Diğer";
        const qty = Number(d.quantity) || 0;
        summary[unitTitle] = (summary[unitTitle] || 0) + qty;
    });
    return summary;
};

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
    companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};

const exportReceiptsToPdf = (data: BetweenStoreReceiptType[], title: string, subtitle?: string) => {
    if (!data || data.length === 0) throw new Error('PDF oluşturulacak veri bulunamadı.');
    const doc = new jsPDF(); const docAny = doc as any; let yPos = 55;

    data.forEach((receipt, index) => {
        if (index > 0) { doc.addPage(); yPos = 55; }
        addPdfHeader(doc, title, subtitle);
        doc.setFontSize(10);
        doc.text(`Giriş Depo: ${receipt.store?.name || '-'}`, 15, yPos);
        doc.text(`Belge Kodu: ${receipt.code || '-'}`, 15, yPos + 5);
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos + 10);
        doc.text(`Genel Açıklama: ${receipt.description || '-'}`, 15, yPos + 15);
        yPos += 25;

        const detailsRows = (receipt.storeReceiptDetails || []).map(d => [
            d.item?.name || '-',
            Number(d.quantity).toLocaleString('tr-TR'),
            d.item?.unit?.title || '-',
            d.description || '-'
        ]);

        const summaries = calculateReceiptSummaries(receipt.storeReceiptDetails || []);
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
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            footStyles: { font: 'NotoSans', fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
            didDrawPage: (hookData: any) => {
                if (hookData.pageNumber > 1) addPdfHeader(doc, title, subtitle);
                addPdfFooter(doc);
            }
        });
        const finalY = docAny.lastAutoTable.finalY || yPos;
        yPos = finalY + 10;
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
const addExcelCompanyInfo = (ws: Excel.Worksheet, startRow: number, columnsLength: number) => {
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
    ];
    let rowNum = startRow;
    companyInfo.forEach(line => {
        const row = ws.getRow(rowNum);
        row.getCell(1).value = line;
        row.getCell(1).alignment = { horizontal: 'center', readingOrder: 'ltr' };
        row.getCell(1).font = { name: 'NotoSans', size: 8, bold: false };
        ws.mergeCells(`A${rowNum}:${String.fromCharCode(65 + columnsLength - 1)}${rowNum}`);
        rowNum++;
    });
};

const exportReceiptsToExcel = (data: BetweenStoreReceiptType[], title: string) => {
    if (!data || data.length === 0) throw new Error('Excel oluşturulacak veri bulunamadı.');
    const workbook = new Excel.Workbook();

    data.forEach(receipt => {
        const ws = workbook.addWorksheet(`Giriş_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_').substring(0, 30));
        const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
        addExcelHeader(ws, title, columns.length);

        ws.addRow([`Belge Kodu:`, receipt.code]);
        ws.addRow([`Giriş Depo:`, receipt.store?.name || '-']);
        ws.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
        ws.addRow(['Genel Açıklama', receipt.description || '-']);
        ws.addRow([]);

        const headerRow = ws.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        (receipt.storeReceiptDetails || []).forEach(d => {
            ws.addRow([d.item?.name || '-', Number(d.quantity), d.item?.unit?.title || '-', d.description || '-']);
        });

        ws.addRow([]);
        const summaryTitle = ws.addRow(["Birim Bazlı Toplamlar"]);
        summaryTitle.font = { bold: true, underline: true };

        const summaries = calculateReceiptSummaries(receipt.storeReceiptDetails || []);
        Object.entries(summaries).forEach(([unit, total]) => {
            const r = ws.addRow(["TOPLAM:", total, unit]);
            r.getCell(1).font = { bold: true };
            r.getCell(1).alignment = { horizontal: 'right' };
            r.getCell(2).font = { bold: true };
        });

        ws.addRow([]);
        addExcelCompanyInfo(ws, ws.lastRow!.number + 2, columns.length);

        ws.getColumn(1).width = 30;
        ws.getColumn(2).width = 15;
        ws.getColumn(3).width = 15;
        ws.getColumn(4).width = 40;
    });

    const fileName = `${title.replace(/ /g, '_')}.xlsx`;
    return workbook.xlsx.writeBuffer().then(buffer => saveAs(new Blob([buffer]), fileName));
};

const ListBetweenStoreReceipt = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);

    const [stores, setStores] = useState<StoreType[]>([]);
    const [dispatches, setDispatches] = useState<DispatchEntity[]>([]);

    const [receiptList, setReceiptList] = useState<BetweenStoreReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<BetweenStoreReceiptType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<BetweenStoreReceiptType | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [storeIdError, setStoreIdError] = useState<boolean>(false);
    const [receiptDetailsError, setReceiptDetailsError] = useState<boolean>(false);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<string | null>(null);
    const [receiptCodeToDelete, setReceiptCodeToDelete] = useState<string>('');

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [viewedReceipt, setViewedReceipt] = useState<BetweenStoreReceiptType | null>(null);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [generalDescription, setGeneralDescription] = useState('');

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedReceiptForDownload, setSelectedReceiptForDownload] = useState<BetweenStoreReceiptType | null>(null);

    const [inactiveInvoices, setInactiveInvoices] = useState<InactiveInvoice[]>([]);
    const [openInactiveModal, setOpenInactiveModal] = useState(false);

    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openDispatchListModal, setOpenDispatchListModal] = useState(false);
    const [openEndDispatchConfirmModal, setOpenEndDispatchConfirmModal] = useState(false);
    const [lastSelectedDispatch, setLastSelectedDispatch] = useState<{ id: string; code: string } | null>(null);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            if (item.href === path) return item;

            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    const currentMenu = useMemo(() => {

        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    const currentMenuOpIds = useMemo(() => {
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            return String(op.id);
        });
    }, [currentMenu]);

      const hasPermission = (opName: string) => {   
    return allowedOperations.some((op: any) =>
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazdırmak"), [allowedOperations, currentMenuOpIds]);


    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const [storesRes, receiptsRes] = await Promise.all([
                axios.get<ApiResponse<StoreType[]>>(server.baseurl + server.initialoperations + "get-stores",
                    {
                        headers: { "Authorization": `Bearer ${authToken}` },
                        params: requestParams
                    }),
                axios.get<ApiResponse<BetweenStoreReceiptType[]>>(server.baseurl + server.warehouse + `get-between-store-receipts`,
                    {
                        headers: { "Authorization": `Bearer ${authToken}` },
                        params: requestParams
                    }),
            ]);
            setStores((storesRes.data?.data || []).filter(s => s.recordStatus === 0).map(s => ({ ...s, id: String(s.id) })));
            setReceiptList(receiptsRes.data?.httpStatusCode === 200 ? receiptsRes.data.data : []);
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Veri yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert, authToken]);

    const fetchDispatchesByStore = useCallback(async (storeId: number): Promise<DispatchEntity[]> => {
        if (!authToken) { navigate("/"); return []; }
        try {
            const res = await axios.get<ApiResponse<DispatchEntity[]>>(
                `${server.baseurl}${server.warehouse}get-between-store-dispatches-by-destination-store-id/${Number(storeId)}`,

                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const list = (res.data.data || []).map(d => ({
                    id: String(d.id),
                    code: String(d.code),
                    docDate: String(d.docDate),
                    isEnd: (d as any).isEnd ?? false,
                    storeDispatchDetails: (d.storeDispatchDetails || []).map((sd: any) => ({
                        id: String(sd.id),
                        quantity: String(sd.quantity),
                        description: String(sd.description || ''),
                        item: sd.item,
                    })),
                    store: d.store
                })) as DispatchEntity[];
                setDispatches(list);
                return list;
            } else {
                setDispatches([]);
                showAlert(res.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'warning');
                return [];
            }
        } catch (e: any) {
            setDispatches([]);
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            return [];
        }
    }, [authToken, navigate, showAlert]);


    const filteredDispatches = useMemo(() => (dispatches || []).filter(d => d.isEnd !== true), [dispatches]);

    useEffect(() => {
        if (!selectedStoreId) { setInactiveInvoices([]); return; }
        const list = (receiptList || [])
            .filter(r => Number(r.store?.id) === Number(selectedStoreId) && r.isEnd === true)
            .map<InactiveInvoice>(r => ({ id: String(r.id), invoiceNo: String(r.code), docDate: String(r.docDate) }));
        setInactiveInvoices(list);
    }, [selectedStoreId, receiptList]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    useEffect(() => {
        const start = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
        const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
        const filtered = receiptList.filter(r => {
            const matchesSearch = r.code.toLowerCase().includes(searchTerm.toLowerCase())
                || (r.store?.name && r.store.name.toLowerCase().includes(searchTerm.toLowerCase()));
            const rDate = new Date(r.docDate);
            return matchesSearch && (!start || rDate >= start) && (!end || rDate <= end);
        });
        setDisplayedReceipts(filtered);
        setPage(0);
    }, [receiptList, searchTerm, startDate, endDate]);

    useEffect(() => {
        const valid = !!selectedStoreId && !!docDate && receiptDetails.length > 0 &&
            receiptDetails.every(d =>
                d.itemId > 0 &&
                d.originStoreDispatchDeatailId > 0 &&
                Number(d.quantity) > 0 &&
                Number(d.quantity) <= Number(d.maxDispatchQuantity)
            );
        setIsFormValid(valid);
    }, [selectedStoreId, docDate, receiptDetails]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasDate = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasDate);
    }, [searchTerm, startDate, endDate]);

    useEffect(() => {
        const t = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(t);
    }, []);

    const populateDetailsFromDispatch = useCallback((dispatch: DispatchEntity | null) => {
        if (!dispatch) { setReceiptDetails([]); return; }
        const newDetails: FormReceiptDetail[] = (dispatch.storeDispatchDetails || []).map(sd => ({
            itemId: Number(sd.item.id),
            quantity: Number(sd.quantity),
            description: sd.description || '',
            originStoreDispatchDeatailId: Number(sd.id),
            item: sd.item,
            dispatchCode: dispatch.code,
            maxDispatchQuantity: Number(sd.quantity),
        }));
        setReceiptDetails(newDetails);
    }, []);

    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
        setReceiptDetails(prev => {
            const newDetails = [...prev];
            const updated = { ...newDetails[index] };
            const maxQ = Number(updated.maxDispatchQuantity);

            if (field === 'quantity') {
                const numValue = Number(value);
                if (isNaN(numValue) || numValue < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updated.quantity = 0;
                } else if (numValue > maxQ) {
                    showAlert(`Girdiğiniz miktar sevk miktarından (${maxQ}) fazla olamaz!`, 'warning');
                    updated.quantity = maxQ;
                } else {
                    updated.quantity = numValue;
                }
            } else if (field === 'description') {
                updated.description = value;
            }
            newDetails[index] = updated;
            return newDetails;
        });
    }, [showAlert]);

    const validateForm = (): boolean => {
        let ok = true;
        if (!selectedStoreId) { setStoreIdError(true); ok = false; } else { setStoreIdError(false); }
        if (!docDate) { setDocDateError(true); ok = false; } else { setDocDateError(false); }

        if (receiptDetails.length === 0) { setReceiptDetailsError(true); ok = false; }
        else {
            const detailsOk = receiptDetails.every(d => {
                const q = Number(d.quantity), maxQ = Number(d.maxDispatchQuantity);
                if (isNaN(q) || q <= 0) return false;
                if (q > maxQ) return false;
                return true;
            });
            if (!detailsOk) { setReceiptDetailsError(true); ok = false; } else setReceiptDetailsError(false);
        }
        if (!ok) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return ok;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setGeneralDescription('');
        setSelectedStoreId(null);
        setSelectedDispatchId(null);
        setDispatches([]);
        setReceiptDetails([]);
        setEditingId(null);
        setEditingCode(null);
        setDocDateError(false);
        setStoreIdError(false);
        setReceiptDetailsError(false);
        setIsFormVisible(false);
    };

    const updateDispatchIsEnd = useCallback(async (id: string, isEnd: boolean) => {
        if (!authToken) { navigate("/"); return { ok: false }; }
        try {
            const r = await axios.put(
                server.baseurl + server.warehouse + "update-store-dispatch-is-end",
                { id: Number(id), isEnd },
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (r.data?.httpStatusCode === 200) return { ok: true };
            showAlert(r.data?.message || 'Sevk durumu güncellenemedi.', 'error');
            return { ok: false };
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'Sevk durumu güncellenirken hata oluştu.', 'error');
            return { ok: false };
        }
    }, [authToken, navigate, showAlert]);

    const insertReceipt = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const payload: NewReceiptData = {
                docDate: docDate?.toISOString() || new Date().toISOString(),
                description: generalDescription,
                storeId: Number(selectedStoreId),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    originStoreDispatchDeatailId: d.originStoreDispatchDeatailId
                }))
            };
            const res = await axios.post(
                server.baseurl + server.warehouse + "create-between-store-receipt",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (res.data.httpStatusCode === 201) {
                showAlert('Yeni giriş belgesi başarıyla eklendi!', 'success');

                if (selectedDispatchId) {
                    const picked = dispatches.find(d => d.id === selectedDispatchId);
                    setLastSelectedDispatch({ id: selectedDispatchId, code: picked?.code || 'N/A' });
                    setOpenEndDispatchConfirmModal(true);
                } else {
                    resetFormAndState();
                    fetchInitialData();
                }
            } else {
                showAlert(res.data.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    const editReceipt = async () => {
        if (!editingId) return;
        if (!authToken) { navigate("/"); return; }
        if (!docDate || !selectedStoreId || receiptDetails.length === 0) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
            return;
        }
        setLoadingButton(true);
        try {
            const payload = {
                id: Number(editingId),
                code: editingCode!,
                docDate: docDate?.toISOString() || new Date().toISOString(),
                description: generalDescription,
                storeId: Number(selectedStoreId),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    originStoreDispatchDeatailId: d.originStoreDispatchDeatailId
                }))
            };
            const res = await axios.put(
                server.baseurl + server.warehouse + "update-between-store-receipt",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (res.data?.httpStatusCode === 200) {
                showAlert('Giriş belgesi başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(res.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };


    const handleEditClick = async () => {
        if (!selectedRowForMenu) return;
        setLoadingData(true);
        try {
            const storeIdNum = Number(selectedRowForMenu.store.id);
            setSelectedStoreId(storeIdNum);
            const list = await fetchDispatchesByStore(storeIdNum);

            const formatted: FormReceiptDetail[] = (selectedRowForMenu.storeReceiptDetails || []).map(d => {
                const originId = d.originStoreDispatchDetail ? Number(d.originStoreDispatchDetail.id) : 0;
                const foundDispatch = list.find(dis => dis.storeDispatchDetails.some(sd => Number(sd.id) === originId));
                const foundDetail = foundDispatch?.storeDispatchDetails.find(sd => Number(sd.id) === originId);
                const maxAllowedQty = foundDetail ? Number(foundDetail.quantity) : Number(d.quantity);
                return {
                    itemId: Number(d.item.id),
                    quantity: Number(d.quantity),
                    description: d.description,
                    originStoreDispatchDeatailId: originId,
                    item: d.item,
                    dispatchCode: foundDispatch?.code || 'N/A',
                    maxDispatchQuantity: maxAllowedQty,
                };
            });
            const firstOrigin = formatted[0]?.originStoreDispatchDeatailId;
            const matchedDispatch = firstOrigin
                ? list.find(dis => dis.storeDispatchDetails.some(sd => Number(sd.id) === Number(firstOrigin)))
                : null;
            setSelectedDispatchId(matchedDispatch ? matchedDispatch.id : null);

            setReceiptDetails(formatted);
            setEditingId(selectedRowForMenu.id);
            setEditingCode(selectedRowForMenu.code);
            setDocDate(new Date(selectedRowForMenu.docDate));
            setGeneralDescription(selectedRowForMenu.description || '');
            setIsFormVisible(true);
            handleCloseMenu();
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
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
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleOpenRowDownloadModal = (receipt: BetweenStoreReceiptType) => {
        setSelectedReceiptForDownload(receipt);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleDownloadSingleReceipt = (format: 'pdf' | 'excel') => {
        if (!selectedReceiptForDownload) return;
        const data = [selectedReceiptForDownload];
        const title = `Giriş Belgesi Detayları: ${selectedReceiptForDownload.code}`;

        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') exportReceiptsToPdf(data, title);
            else exportReceiptsToExcel(data, title);
            showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error'); }
        finally { setOpenRowDownloadModal(false); }
    };

    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedReceipts : receiptList;
        const title = isFiltered ? 'Filtrelenmiş Depo Giriş Raporu' : 'Tüm Depo Giriş Raporu';
        const end = endDate || new Date();
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(end.toISOString())}` : undefined;

        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') exportReceiptsToPdf(dataToDownload, title, subtitle);
            else exportReceiptsToExcel(dataToDownload, title);
            showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) {
            showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };

    const handleToggleDispatchRow = async (row: DispatchEntity, value: 'open' | 'ended') => {
        const targetIsEnd = value === 'ended';
        const res = await updateDispatchIsEnd(row.id, targetIsEnd);
        if (res.ok) {
            setDispatches(prev => prev.map(d => d.id === row.id ? { ...d, isEnd: targetIsEnd } : d));
            showAlert(`'${row.code}' ${targetIsEnd ? 'Sonlandırıldı' : 'Açıldı'}.`, 'success');
            if (selectedDispatchId === row.id && targetIsEnd) {
                setSelectedDispatchId(null);
                setReceiptDetails([]);
            }
        }
    };

    const handleConfirmEndDispatch = async (shouldEnd: boolean) => {
        setOpenEndDispatchConfirmModal(false);
        const d = lastSelectedDispatch;
        setLastSelectedDispatch(null);
        if (!shouldEnd || !d) {
            resetFormAndState();
            fetchInitialData();
            return;
        }
        const res = await updateDispatchIsEnd(d.id, true);
        if (res.ok) {
            showAlert(`Sevk Belgesi ${d.code} sonlandırıldı.`, 'success');
            if (selectedStoreId) await fetchDispatchesByStore(selectedStoreId);
            resetFormAndState();
            fetchInitialData();
        }
    };


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Şantiyenin Depo Arası Giriş İşlemleri</Typography>

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
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel required>Giriş Şantiye Depo</CustomFormLabel>
                            <Autocomplete
                                id="store-select"
                                options={stores}
                                getOptionLabel={(option) => option.name}
                                value={stores.find(s => Number(s.id) === selectedStoreId) || null}
                                onChange={async (_, newValue) => {
                                    const newId = newValue ? Number(newValue.id) : null;
                                    setSelectedStoreId(newId);
                                    setSelectedDispatchId(null);
                                    setReceiptDetails([]);
                                    setDispatches([]);
                                    if (newId) await fetchDispatchesByStore(newId);
                                    if (storeIdError && newId) setStoreIdError(false);
                                }}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                disabled={!!editingId}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth size="small" placeholder="Giriş Depo Seçin"
                                        error={storeIdError}
                                        helperText={storeIdError ? "Depo seçimi zorunludur!" : ""}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} sm={5}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <CustomFormLabel required>Şantiyenin Depo Sevk Belgesi</CustomFormLabel>
                                <CustomTooltip title="Sevk Belgeleri listesi">
                                    <span>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<IconList size={18} />}
                                            onClick={() => setOpenDispatchListModal(true)}
                                            disabled={!selectedStoreId || !!editingId}
                                        >
                                            Listeyi Göster
                                        </Button>
                                    </span>
                                </CustomTooltip>
                            </Stack>

                            <Autocomplete<DispatchEntity>
                                id="dispatch-select"
                                options={filteredDispatches}
                                getOptionLabel={(opt) => opt ? `${opt.code} — ${formatDateDisplay(opt.docDate)}` : ''}
                                value={filteredDispatches.find(d => d.id === selectedDispatchId) || null}
                                onChange={(_, newVal) => {
                                    setSelectedDispatchId(newVal ? newVal.id : null);
                                    populateDetailsFromDispatch(newVal || null);
                                }}
                                disabled={!selectedStoreId || !!editingId}
                                renderInput={(params) => (
                                    <TextField {...params} fullWidth size="small" placeholder="Sevk Belgesi Seçin" />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} sm={3}>
                            <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    label=""
                                    value={docDate}
                                    onChange={(newValue) => { setDocDate(newValue); if (docDateError && newValue) setDocDateError(false); }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => (
                                        <TextField {...params} fullWidth size="small" error={docDateError} helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""} />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="invoice-general-description">Açıklama</CustomFormLabel>
                            <TextField
                                id="invoice-general-description"
                                label="Şantiyenin Depo Arası için genel açıklama giriniz"
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
                            <Typography variant="h6">Giriş Detayları</Typography>
                        </Stack>

                        {loadingData && selectedStoreId ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}><CircularProgress size={24} /></Box>
                        ) : (
                            <Grid container spacing={2}>
                                {receiptDetails.length === 0 && selectedStoreId && !selectedDispatchId && !editingId ? (
                                    <Grid item xs={12}><Alert severity="info">Önce «Şantiyenin Depo Sevk Belgesi» seçin.</Alert></Grid>
                                ) : (
                                    receiptDetails.map((detail, index) => {
                                        const maxQuantity = detail.maxDispatchQuantity;
                                        const itemLabel = detail.item?.name || 'Ürün Adı Bulunamadı';
                                        const unitLabel = detail.item?.unit?.title || 'Birim';
                                        const balanceDisplay = `Max: ${maxQuantity} ${unitLabel}`;

                                        return (
                                            <Grid item xs={12} key={index}>
                                                <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
                                                    <Grid item xs={12} sm={4}>
                                                        <Box>
                                                            <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
                                                                {itemLabel}
                                                            </Typography>
                                                            {detail.dispatchCode && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Sevk: {detail.dispatchCode}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Grid>

                                                    <Grid item xs={6} sm={3} md={3}>
                                                        <CustomTextField
                                                            type="number"
                                                            label={`Miktar (Max: ${maxQuantity})`}
                                                            placeholder="Miktar"
                                                            value={detail.quantity}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                            fullWidth size="small"
                                                            InputProps={{
                                                                endAdornment: (<InputAdornment position="end">{balanceDisplay}</InputAdornment>),
                                                                inputProps: { min: 0 }
                                                            }}
                                                            error={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(maxQuantity))}
                                                            helperText={receiptDetailsError && (Number(detail.quantity) <= 0 || Number(detail.quantity) > Number(maxQuantity)) ? `Max: ${maxQuantity}` : ""}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={6} sm={5} md={4}>
                                                        <CustomTextField
                                                            label="Açıklama (Opsiyonel)"
                                                            placeholder="Açıklama"
                                                            value={detail.description}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                            fullWidth size="small"
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        );
                                    })
                                )}
                            </Grid>
                        )}
                        {receiptDetailsError && (
                            <Typography color="error" variant="caption" sx={{ mt: 1.5, ml: 1.5 }}>
                                Lütfen geçerli değerleri giriniz.
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                        {editingId ? (
                            <>
                                <Button
                                    variant="contained"
                                    color="info"
                                    onClick={editReceipt}
                                    disabled={loadingButton}
                                >
                                    {loadingButton ? 'Bekleniyor...' : 'Düzenle'}
                                </Button>
                                <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>
                                    İptal Et
                                </Button>
                            </>
                        )
                            : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak giriş belgesini kaydedin." : ""}>
                                        <span>
                                            <BlinkingButton
                                                variant="contained" color="success" onClick={insertReceipt}
                                                disabled={!isFormValid || loadingButton}
                                                isBlinking={isFormValid && !loadingButton}
                                                startIcon={<BoltIcon sx={{ fontSize: 18 }} />}
                                            >
                                                {loadingButton ? 'Bekleniyor...' : 'Yeni Giriş Belgesi Ekle'}
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
                                variant="contained" color="secondary"
                                onClick={() => setOpenDownloadFilteredModal(true)}
                                startIcon={<IconFileDownload />} isBlinking={true}
                                disabled={loadingData || displayedReceipts.length === 0}
                            >
                                Filtrelenmişi İndir
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {hasDownloadPermission && (
                        <Button
                            variant="contained" color="primary"
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
                                label="Giriş Belgesi Ara" variant="outlined" fullWidth
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={8}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Başlangıç Tarihi" value={startDate} inputFormat="dd/MM/yyyy"
                                        onChange={(v) => setStartDate(v)}
                                        renderInput={(params) => (<TextField {...params} size="small" fullWidth />)}
                                    />
                                    <DatePicker
                                        label="Bitiş Tarihi" value={endDate} inputFormat="dd/MM/yyyy"
                                        onChange={(v) => setEndDate(v)}
                                        renderInput={(params) => (<TextField {...params} size="small" fullWidth />)}
                                    />
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
                        <Table aria-label="store receipt table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Giriş Depo</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Detaylar</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {displayedReceipts.length > 0 ? (
                                    displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.store?.name || '-'}</Typography></StyledTableCell>
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
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                    <Button
                                                        variant="outlined" startIcon={<IconEye />}
                                                        onClick={() => { setViewedReceipt(row); setOpenDetailsModal(true); }}
                                                    >
                                                        Görünüm
                                                    </Button>
                                                </CustomTooltip>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton
                                                    onClick={(e) => { setSelectedRowForMenu(row); setAnchorEl(e.currentTarget); }}
                                                    aria-label="row menu"
                                                >
                                                    <IconDots width={18} />
                                                </IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>

                                                    {hasEditPermission && (
                                                        <MuiMenuItem onClick={handleEditClick}>
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
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
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
                                        <StyledTableCell colSpan={5} align="center">
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

            <Dialog
                open={openDescriptionModal}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Giriş Detayları
                    {viewedReceipt && <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>({viewedReceipt.code})</Typography>}
                </DialogTitle>
                <DialogContent dividers>
                    {viewedReceipt && viewedReceipt.storeReceiptDetails.length > 0 ? (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table aria-label="Ürün detayları tablosu" size="small">
                                    <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                        <TableRow>
                                            <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {viewedReceipt.storeReceiptDetails.map((detail, index) => (
                                            <TableRow key={detail.id || index} hover>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{Number(detail.quantity).toLocaleString()}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <TableContainer component={Paper} variant="outlined" sx={{ width: 'auto', minWidth: '300px' }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                            <TableRow>
                                                <StyledTableCell align="center" colSpan={2}>
                                                    <Typography variant="subtitle2" fontWeight="bold">Birim Bazlı Toplamlar</Typography>
                                                </StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {Object.entries(calculateReceiptSummaries(viewedReceipt.storeReceiptDetails)).map(([unit, total]) => (
                                                <TableRow key={unit}>
                                                    <StyledTableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                                        Toplam {unit}:
                                                    </StyledTableCell>
                                                    <StyledTableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                                        {total.toLocaleString()}
                                                    </StyledTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Bu giriş belgesi için detay bulunamadı.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        sx={{ width: '100%' }}
                    >
                        <Button
                            variant="contained"
                            color="error"
                            fullWidth
                            sx={{ flex: 1 }}
                            startIcon={<IconFileText />}
                            disabled={!viewedReceipt}
                            onClick={() => { if (viewedReceipt) exportReceiptsToPdf([viewedReceipt], `Giriş_${viewedReceipt.code}`); }}
                        >
                            PDF İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            sx={{ flex: 1 }}
                            startIcon={<IconFileSpreadsheet />}
                            disabled={!viewedReceipt}
                            onClick={() => { if (viewedReceipt) exportReceiptsToExcel([viewedReceipt], `Giriş_${viewedReceipt.code}`); }}
                        >
                            Excel İndir
                        </Button>
                        <Button onClick={() => setOpenDetailsModal(false)} color="secondary" variant="outlined"
                            fullWidth
                            sx={{ flex: 1 }} >Kapat</Button>

                    </Stack>
                </DialogActions>
            </Dialog>
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Girişleri İndir</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={2}>
                        <Button variant="contained" color="primary" onClick={() => { handleDownload('pdf', false); setOpenDownloadAllModal(false); }}>PDF</Button>
                        <Button variant="contained" color="success" onClick={() => { handleDownload('excel', false); setOpenDownloadAllModal(false); }}>Excel</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)}>Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmişleri İndir</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={2}>
                        <Button variant="contained" color="primary" onClick={() => { handleDownload('pdf', true); setOpenDownloadFilteredModal(false); }}>PDF</Button>
                        <Button variant="contained" color="success" onClick={() => { handleDownload('excel', true); setOpenDownloadFilteredModal(false); }}>Excel</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)}>Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Seçileni İndir</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={2}>
                        <Button variant="contained" color="primary" onClick={() => handleDownloadSingleReceipt('pdf')}>PDF</Button>
                        <Button variant="contained" color="success" onClick={() => handleDownloadSingleReceipt('excel')}>Excel</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)}>Kapat</Button></DialogActions>
            </Dialog>

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
                                                    <span>
                                                        <Button variant="outlined" size="small" color="warning"
                                                            onClick={() => showAlert('Bu modal sadece gösterim amaçlı tutulmuştur.', 'info')}>
                                                            Geri Al
                                                        </Button>
                                                    </span>
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
            <DeleteBetweenStoreReceipt
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />

            <Dialog open={openDispatchListModal} onClose={() => setOpenDispatchListModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Şantiyenin Depo Sevk Listesi</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell align="center"><Typography variant="h6">Aç/Kapat</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dispatches.length > 0 ? dispatches.map(row => (
                                    <TableRow key={row.id}>
                                        <StyledTableCell>{row.code}</StyledTableCell>
                                        <StyledTableCell>{formatDateDisplay(row.docDate)}</StyledTableCell>
                                        <StyledTableCell>
                                            {row.isEnd ? <Chip size="small" label="Sonlandırılmış" color="error" /> : <Chip size="small" label="Açık" color="success" />}
                                        </StyledTableCell>
                                        <StyledTableCell align="center">
                                            <RadioGroup
                                                row
                                                value={row.isEnd ? 'ended' : 'open'}
                                                onChange={(_, val) => handleToggleDispatchRow(row, val as 'open' | 'ended')}
                                            >
                                                <FormControlLabel value="open" control={<Radio />} label="Açık" />
                                                <FormControlLabel value="ended" control={<Radio />} label="Sonlandırılmış" />
                                            </RadioGroup>
                                        </StyledTableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={4} align="center">Sevk belgesi bulunamadı.</StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDispatchListModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openEndDispatchConfirmModal} onClose={() => setOpenEndDispatchConfirmModal(false)}>
                <DialogTitle>Sevk Durumu Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Giriş kaydedildi. Bu <strong>Sevk Belgesi</strong> sonlandırılsın mı؟
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                        <strong>Sevk Kodu:</strong> {lastSelectedDispatch?.code || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        (Sonlandırılan sevk tekrar fişe bağlanamaz.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleConfirmEndDispatch(false)} color="error">Hayır</Button>
                    <Button onClick={() => handleConfirmEndDispatch(true)} color="primary" variant="contained" autoFocus>
                        Evet (Sevki Sonlandır)
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListBetweenStoreReceipt;