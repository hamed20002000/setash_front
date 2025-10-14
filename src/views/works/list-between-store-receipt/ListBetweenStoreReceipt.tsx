import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconArrowRight, IconEye, IconX, IconFileText, IconFileSpreadsheet
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

interface UnitType {
    id: string;
    title: string;
}

interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    unit: UnitType;
}

interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
    originStoreDispatchDetail: { id: string, storeDispatch: { code: string } } | null;
}

interface StoreType {
    id: string;
    name: string;
    code: string;
    recordStatus?: number;
}

interface BetweenStoreReceiptType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    storeReceiptDetails: ReceiptDetailType[];
    store: StoreType; // Destination store where the receipt is created
    statusText?: 'Aktif' | 'Pasif';
    statusColor?: 'success' | 'error';
}

interface DispatchDetailInfo {
    id: string; // originStoreDispatchDeatailId
    quantity: string;
    description: string;
    item: ItemType;
    store: StoreType;
    dispatchCode: string;
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
    storeId: number;
    receiptDetails: {
        itemId: number;
        quantity: number;
        description: string;
        originStoreDispatchDeatailId: number;
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
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const getStatus = (recordStatus: number): { text: 'Aktif' | 'Pasif', color: 'success' | 'error' } => {
    return recordStatus === 0 ? { text: 'Aktif', color: 'success' } : { text: 'Pasif', color: 'error' };
};

// --- PDF & Excel Report Functions ---

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
        doc.text(subtitle, 70, 52);
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

const exportReceiptsToPdf = (data: BetweenStoreReceiptType[], title: string, subtitle?: string) => {
    if (!data || data.length === 0) {
        throw new Error('PDF oluşturulacak veri bulunamadı.');
    }

    const doc = new jsPDF();
    const docAny = doc as any;
    let yPos = 55;

    data.forEach((receipt, index) => {
        if (index > 0) {
            doc.addPage();
            yPos = 55;
        }

        addPdfHeader(doc, title, subtitle);

        doc.setFontSize(10);
        doc.text(`Giriş Depo: ${receipt.store?.name || '-'}`, 15, yPos);
        doc.text(`Belge Kodu: ${receipt.code || '-'}`, 15, yPos + 5);
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos + 10);

        yPos += 20;

        const detailsRows = (receipt.storeReceiptDetails || []).map(d => [
            d.item?.name || '-',
            d.quantity,
            d.item?.unit?.title || '-',
            d.description || '-'
        ]);

        const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
        const totalQuantity = (receipt.storeReceiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);

        autoTable(docAny, {
            startY: yPos,
            head: [columns],
            body: detailsRows,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: (hookData: any) => {
                if (hookData.pageNumber > 1) {
                    addPdfHeader(doc, title, subtitle);
                }
                addPdfFooter(doc);
            }
        });

        const finalY = docAny.lastAutoTable.finalY || yPos;
        doc.setFontSize(10);
        doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);
        yPos = finalY + 10;
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
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

const exportReceiptsToExcel = (data: BetweenStoreReceiptType[], title: string) => {
    if (!data || data.length === 0) {
        throw new Error('Excel oluşturulacak veri bulunamadı.');
    }

    const workbook = new Excel.Workbook();

    data.forEach(receipt => {
        const worksheetTitle = `Giriş_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_');
        const worksheet = workbook.addWorksheet(worksheetTitle);

        const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
        const totalColumns = detailsColumns.length;

        addExcelHeader(worksheet, title, totalColumns);

        worksheet.addRow([`Belge Kodu:`, receipt.code]);
        worksheet.addRow([`Giriş Depo:`, receipt.store?.name || '-']);
        worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
        worksheet.addRow([]); // حذف Durum

        const headerRow = worksheet.addRow(detailsColumns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        (receipt.storeReceiptDetails || []).forEach(d => {
            worksheet.addRow([
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);
        });

        const totalQuantity = (receipt.storeReceiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
        const totalRow = worksheet.addRow([`Toplam Miktar`, totalQuantity, '', '']);
        totalRow.font = { name: 'NotoSans', bold: true };
        totalRow.getCell(2).numFmt = '0';

        worksheet.addRow([]);
        addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);
    });

    const fileName = `${title.replace(/ /g, '_')}.xlsx`;
    return workbook.xlsx.writeBuffer().then(buffer => {
        saveAs(new Blob([buffer]), fileName);
    });
};

// --- Main Component ---

const ListBetweenStoreReceipt = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // --- State Variables ---
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
    const [receiptList, setReceiptList] = useState<BetweenStoreReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<BetweenStoreReceiptType[]>([]);

    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');


    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<BetweenStoreReceiptType | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [storeIdError, setStoreIdError] = useState<boolean>(false);
    const [receiptDetailsError, setReceiptDetailsError] = useState<boolean>(false);

    const [stores, setStores] = useState<StoreType[]>([]);
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
    const [selectedReceiptForDownload, setSelectedReceiptForDownload] = useState<BetweenStoreReceiptType | null>(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // --- Handlers ---
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    // در ListBetweenStoreReceipt.tsx

    const loadReceiptDetailsFromDispatchInfo = useCallback(() => {
        if (dispatchDetailsInfo.length === 0) {
            setReceiptDetails([]);
            return;
        }

        const newDetails: FormReceiptDetail[] = dispatchDetailsInfo.map(info => ({
            itemId: Number(info.item.id),
            // مقدار اولیه را برابر با حداکثر مجاز (مقدار محموله) قرار دهید
            quantity: Number(info.quantity),
            description: info.description,
            originStoreDispatchDeatailId: Number(info.id),
            item: info.item,
            dispatchCode: info.dispatchCode,
            maxDispatchQuantity: Number(info.quantity), // مقدار Max Qty اصلی
        }));

        setReceiptDetails(newDetails);
    }, [dispatchDetailsInfo]);

    const handleLoadDispatchDetails = () => {
        if (dispatchDetailsInfo.length === 0) {
            showAlert('Bu depo için alınacak sevk detayı bulunamadı.', 'warning');
            return;
        }
        loadReceiptDetailsFromDispatchInfo();
    };


    // API Call: Fetch Dispatch Details by Destination Store ID
    const fetchDispatchDetails = useCallback(async (destinationStoreId: string) => {
        if (!authToken) { navigate("/"); return []; }
        setLoadingData(true);
        try {
            const response = await axios.get<ApiResponse<any[]>>(
                `${server.baseurl}${server.warehouse}get-between-store-dispatches-by-destination-store-id/${destinationStoreId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const formattedDetails: DispatchDetailInfo[] = response.data.data.flatMap((dispatch: any) =>
                    (dispatch.storeDispatchDetails || []).map((detail: any) => ({
                        id: String(detail.id), // This is the originStoreDispatchDetailId
                        quantity: String(detail.quantity),
                        description: String(detail.description || ''),
                        item: detail.item,
                        store: dispatch.store,
                        dispatchCode: dispatch.code,
                    }))
                );
                setDispatchDetailsInfo(formattedDetails);
                return formattedDetails;
            } else {
                setDispatchDetailsInfo([]);
                showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'warning');
                return [];
            }
        } catch (e: any) {
            setDispatchDetailsInfo([]);
            showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
            return [];
        } finally {
            setLoadingData(false);
        }
    }, [showAlert, authToken, navigate]);


    // API Call: Fetch Receipts and Initial Data
    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        try {
            const [storesRes, receiptsRes] = await Promise.all([
                axios.get<ApiResponse<StoreType[]>>(server.baseurl + server.initialoperations + "get-stores", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<BetweenStoreReceiptType[]>>(server.baseurl + server.warehouse + `get-between-store-receipts`, { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);

            setStores(storesRes.data?.data?.filter(s => s.recordStatus === 0).map(s => ({ ...s, id: String(s.id) })) || []);

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
        } catch (e: any) {
            showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert, authToken]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // --- Filtering and Validation Effects ---

    useEffect(() => {
        let filteredReceipts = receiptList.filter(r => {
            const matchesSearch = r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.store?.name && r.store.name.toLowerCase().includes(searchTerm.toLowerCase()));



            const rDocDate = new Date(r.docDate);
            const startCheck = !startDate || rDocDate >= startDate;
            const endCheck = !endDate || rDocDate <= endDate;

            return matchesSearch && startCheck && endCheck;
        });
        setDisplayedReceipts(filteredReceipts);
        setPage(0);
    }, [receiptList, searchTerm, startDate, endDate]);

    useEffect(() => {
        const isValid = !!selectedStoreId && !!docDate && receiptDetails.length > 0 &&
            receiptDetails.every(d => d.itemId > 0 && d.originStoreDispatchDeatailId > 0 &&
                Number(d.quantity) > 0 && Number(d.quantity) <= d.maxDispatchQuantity);
        setIsFormValid(isValid);
    }, [selectedStoreId, docDate, receiptDetails]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        // const hasStatusFilter = statusFilter !== 'all'; // حذف شده
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasDateFilter); // statusFilter حذف شد
    }, [searchTerm, startDate, endDate]); // statusFilter حذف شد

    useEffect(() => {
        const timer = setTimeout(() => { setIsBlinking(false); }, 5000);
        return () => { clearTimeout(timer); };
    }, []);


    const validateForm = (): boolean => {
        let isValid = true;
        if (!selectedStoreId) { setStoreIdError(true); isValid = false; } else { setStoreIdError(false); }
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }

        if (receiptDetails.length === 0) {
            setReceiptDetailsError(true);
            isValid = false;
        } else {
            const isDetailsValid = receiptDetails.every((detail) => {
                const numQuantity = Number(detail.quantity);
                const maxQuantity = Number(detail.maxDispatchQuantity); // استفاده از مقدار ثابت

                if (isNaN(numQuantity) || numQuantity <= 0) {
                    return false; // مقدار نامعتبر یا صفر
                }

                // اعتبارسنجی بر اساس Max Dispatch Quantity (ثابت)
                if (numQuantity > maxQuantity) {
                    return false; // بیشتر از مقدار محموله است.
                }
                return true;
            });

            if (!isDetailsValid) {
                setReceiptDetailsError(true);
                isValid = false;
            } else {
                setReceiptDetailsError(false);
            }
        }
        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setSelectedStoreId(null);
        setReceiptDetails([]);
        setEditingId(null);
        setEditingCode(null);
        setDispatchDetailsInfo([]);
        setDocDateError(false);
        setStoreIdError(false);
        setReceiptDetailsError(false);
        setIsFormVisible(false);
    };

    // --- CRUD Operations ---

    const insertReceipt = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        try {
            const payload: NewReceiptData = {
                docDate: docDate?.toISOString() || new Date().toISOString(),
                storeId: Number(selectedStoreId),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    originStoreDispatchDeatailId: d.originStoreDispatchDeatailId
                }))
            };
            const response = await axios.post(server.baseurl + server.warehouse + "create-between-store-receipt", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni giriş belgesi başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Giriş belgesi eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editReceipt = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        try {
            const payload: EditReceiptData = {
                id: Number(editingId),
                code: editingCode!,
                docDate: docDate?.toISOString() || new Date().toISOString(),
                storeId: Number(selectedStoreId),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    originStoreDispatchDeatailId: d.originStoreDispatchDeatailId
                }))
            };
            debugger
            const response = await axios.put(server.baseurl + server.warehouse + "update-between-store-receipt", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
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

    // در ListBetweenStoreReceipt.tsx

    const handleEditClick = async () => {
        if (selectedRowForMenu) {
            setLoadingData(true);
            try {
                // 1. Fetch dispatch details for the target store to get Max Qty (مثلا 580)
                const fetchedDispatchDetails = await fetchDispatchDetails(selectedRowForMenu.store.id);

                const formattedDetails: FormReceiptDetail[] = (selectedRowForMenu.storeReceiptDetails || []).map(d => {
                    const originalDispatchDetailId = d.originStoreDispatchDetail ? Number(d.originStoreDispatchDetail.id) : 0;

                    // 2. پیدا کردن آیتم محموله متناظر برای گرفتن مقدار MAX
                    const dispatchInfo = fetchedDispatchDetails.find(info => Number(info.id) === originalDispatchDetailId);

                    // ✨✨✨ نکته کلیدی اصلاح:
                    // مقدار ماکسیمم مجاز را از محموله ارسالی (dispatchInfo) می‌گیریم،
                    // نه از مقدار فعلی ثبت شده در سند (d.quantity).
                    const maxAllowedQty = dispatchInfo ? Number(dispatchInfo.quantity) : Number(d.quantity);

                    return {
                        itemId: Number(d.item.id),
                        quantity: Number(d.quantity), // مقدار ثبت شده فعلی (200)
                        description: d.description,
                        originStoreDispatchDeatailId: originalDispatchDetailId,
                        item: d.item,
                        dispatchCode: dispatchInfo?.dispatchCode || 'N/A',
                        // ✨✨ مقدار Max Qty باید مقدار ارسالی (580) باشد.
                        maxDispatchQuantity: maxAllowedQty,
                    };
                });

                setReceiptDetails(formattedDetails);
                setEditingId(selectedRowForMenu.id);
                setEditingCode(selectedRowForMenu.code);
                setDocDate(new Date(selectedRowForMenu.docDate));
                setSelectedStoreId(Number(selectedRowForMenu.store.id));
                setIsFormVisible(true);
                handleCloseMenu();
            } catch (error) {
                showAlert('Düzenleme için veri hazırlanırken bir hata oluştu.', 'error');
            } finally {
                setLoadingData(false);
            }
        }
    };

    const handleCancelEdit = () => {
        resetFormAndState();
    };

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

            // Max Quantity ثابت (مقدار اصلی محموله) را از آبجکت آیتم فعلی می‌خوانیم.
            const maxQuantity = Number(updatedDetail.maxDispatchQuantity);

            if (field === 'quantity') {
                const numValue = Number(value);

                // 1. اعتبارسنجی مقادیر نامعتبر یا منفی
                if (isNaN(numValue) || numValue < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updatedDetail.quantity = 0;
                }
                // 2. اعتبارسنجی بیش از حد مجاز (Max Quantity)
                else if (numValue > maxQuantity) {
                    showAlert(`Girdiğiniz miktar sevk miktarından (${maxQuantity}) fazla olamaz!`, 'warning');
                    updatedDetail.quantity = maxQuantity;
                }
                // 3. اعمال تغییر در صورت معتبر بودن
                else {
                    updatedDetail.quantity = numValue;
                }
            }
            // 4. تغییر فیلد توضیحات (Description)
            else if (field === 'description') {
                updatedDetail.description = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [showAlert]);

    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedReceipts : receiptList;
        const title = isFiltered ? 'Filtrelenmiş Depo Giriş Raporu' : 'Tüm Depo Giriş Raporu';

        // تاریخ پایان اگر Null بود، تاریخ امروز را قرار می‌دهد
        const end = endDate || new Date();
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(end.toISOString())}` : undefined;

        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') {
                exportReceiptsToPdf(dataToDownload, title, subtitle);
            } else {
                exportReceiptsToExcel(dataToDownload, title);
            }
            showAlert('Rapor başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) {
            showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error');
        }
    };

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
            if (format === 'pdf') {
                exportReceiptsToPdf(data, title);
            } else {
                exportReceiptsToExcel(data, title);
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

    // --- UI Render ---

    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Şantiyenin Depo Arası Giriş İşlemleri</Typography>

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
                    <Typography variant="h5" mb={2}>{editingId ? 'Depo Giriş Belgesini Düzenle' : 'Yeni Depo Giriş Belgesi'}</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel required>Giriş Depo</CustomFormLabel>
                            <Autocomplete
                                id="store-select"
                                options={stores.filter(s => s.recordStatus === 0)}
                                getOptionLabel={(option) => option.name}
                                value={stores.find(s => Number(s.id) === selectedStoreId) || null}
                                onChange={async (_, newValue) => {
                                    setSelectedStoreId(newValue ? Number(newValue.id) : null);
                                    if (newValue) {
                                        const details = await fetchDispatchDetails(newValue.id);
                                        // اگر در حالت ثبت جدید هستیم، بارگذاری آیتم‌ها با دکمه انجام می‌شود.
                                        if (!editingId && details.length === 0) {
                                            showAlert('Bu depo için alınacak sevk detayı bulunamadı.', 'warning');
                                        }
                                    } else {
                                        setDispatchDetailsInfo([]);
                                        setReceiptDetails([]);
                                    }
                                    if (storeIdError && newValue) setStoreIdError(false);
                                }}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        placeholder="Giriş Depo Seçin"
                                        error={storeIdError}
                                        helperText={storeIdError ? "Depo seçimi zorunludur!" : ""}
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
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Giriş Detayları</Typography>
                            <Button
                                variant="outlined"
                                startIcon={<IconPlus />}
                                onClick={handleLoadDispatchDetails}
                                disabled={!selectedStoreId || loadingData || receiptDetails.length > 0}
                            >
                                Sevk Detaylarını Yükle
                            </Button>
                        </Stack>
                        {loadingData && selectedStoreId ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : (
                            <Grid container spacing={2}>
                                {receiptDetails.length === 0 && selectedStoreId && !editingId ? (
                                    <Grid item xs={12}>
                                        <Alert severity="info">Yüklenecek sevk detayı bulunamadı veya butona basmadınız.</Alert>
                                    </Grid>
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

                                                        </Box>
                                                    </Grid>

                                                    <Grid item xs={6} sm={3} md={3}>
                                                        <CustomTextField
                                                            type="number"
                                                            label={`Miktar (Max: ${maxQuantity})`}
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
                                                    <Grid item xs={6} sm={5} md={4}>
                                                        <CustomTextField
                                                            label="Açıklama (Opsiyonel)"
                                                            placeholder="Açıklama"
                                                            value={detail.description}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                            fullWidth
                                                            size="small"
                                                        />
                                                    </Grid>

                                                </Grid>
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
                        {/* حذف Grid item مربوط به ToggleButtonGroup */}
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
                                    {/* حذف ستون Durum */}
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
                                            {/* حذف سلول Durum */}
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                    <Button
                                                        variant="outlined"
                                                        startIcon={<IconEye />}
                                                        onClick={() => {
                                                            setDetailsToShow(row.storeReceiptDetails || []);
                                                            setOpenDetailsModal(true);
                                                        }}
                                                    >
                                                        Görünüm
                                                    </Button>
                                                </CustomTooltip>
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
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                            Bu satırı indir
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                    {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}
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

            {/* ✨ کامپوننت حذف */}
            <DeleteBetweenStoreReceipt
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />
        </Box>
    );
};

export default ListBetweenStoreReceipt;