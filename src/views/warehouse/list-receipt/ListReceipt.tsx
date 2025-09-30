import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,

    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    TableSortLabel, useMediaQuery
} from '@mui/material';
import { keyframes, styled, useTheme } from '@mui/material/styles';
import { IconDots, IconEye, IconTrash, IconSearch, IconEdit, IconFileDownload, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import axios from 'axios';
import server from '../../../assets/address.json';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ReceiptItemsTable from './ReceiptItemsTable';
import DeleteReceiptModal from './DeleteReceipt';
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';
import logoSrc from 'src/assets/images/logos/logo.png';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { useAuth } from 'src/context/AuthContext';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import {
    WarehouseType,
    ReceiptItem,
    ProcessedReceiptItem,
    ReceiptType
} from './types';
import BlankCard from 'src/components/shared/BlankCard';

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
    // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
    fontSize: '0.8rem', // Varsayılan olarak küçük font
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem', // Masaüstünde daha büyük
    },
}));

// Table Style and Functions
type SortableReceiptKeys = 'code' | 'docDate' | 'warehouseId';

const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;

const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

const descendingComparator = <T, Key extends string>(a: T, b: T, orderBy: Key): number => {
    const getNestedValue = (obj: any, path: string): any => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    const valA = getNestedValue(a, orderBy);
    const valB = getNestedValue(b, orderBy);
    if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
    if (valA === undefined || valA === null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    return 0;
};

const getComparator = (order: 'asc' | 'desc', orderBy: SortableReceiptKeys): (a: ReceiptType, b: ReceiptType) => number => {
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

const ListReceipts = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [warehouse, setWarehouse] = useState<number | null>(null);
    const [code, setCode] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [receiptItems, setReceiptItems] = useState<ProcessedReceiptItem[]>([]);
    const [deletedItems, setDeletedItems] = useState<ProcessedReceiptItem[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [receiptsList, setReceiptsList] = useState<ReceiptType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [orderBy, setOrderBy] = useState<SortableReceiptKeys>('docDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedReceiptForMenu, setSelectedReceiptForMenu] = useState<ReceiptType | null>(null);
    // const openMenu = Boolean(anchorEl);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<ProcessedReceiptItem[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<number | null>(null);
    const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // 👇 State for new download modals
    const [openAllDownloadModal, setOpenAllDownloadModal] = useState(false);
    const [openFilteredDownloadModal, setOpenFilteredDownloadModal] = useState(false);
    const [openReceiptDetailsDownloadModal, setOpenReceiptDetailsDownloadModal] = useState(false);


    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return format(date, 'dd MMMM yyyy', { locale: tr });
        } catch (e) {
            return "Geçersiz Tarih";
        }
    };

    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };
    const clearAlert = () => { setAlertMessage(null); };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) { timer = setTimeout(() => { clearAlert(); }, 5000); }
        return () => { clearTimeout(timer); };
    }, [alertMessage]);

    const fetchWarehouses = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const allWarehouses = response.data.data as WarehouseType[];
                const activeWarehouses = allWarehouses.filter(item => item.recordStatus === 0);
                setWarehousesList(activeWarehouses);
            } else {
                showAlert(response.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error');
                setWarehousesList([]);
            }
        } catch (e: any) {
            showAlert('Depolar yüklenirken bir hata oluştu.', 'error');
            setWarehousesList([]);
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    const getReceipts = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn("No auth token found, redirecting to login.");
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-receipt",
                { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setReceiptsList(response.data.data as ReceiptType[]);
            } else { showAlert(response.data.message || 'Fişlar yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert('Fişlar yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    useEffect(() => {
        getReceipts();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasDateFilter);
    }, [searchTerm, startDate, endDate]);

    const handleReceiptItemsUpdate = (items: ProcessedReceiptItem[]) => {
        setReceiptItems(items);
        setHasUnsavedChanges(true);
    };

    const handleReceiptItemsDelete = (item: ProcessedReceiptItem) => {
        setDeletedItems(prev => [...prev, item]);
        setHasUnsavedChanges(true);
    };

    const handleRestoreItem = (id: number) => {
        const itemToRestore = deletedItems.find(item => item.id === id);
        if (itemToRestore) {
            setReceiptItems(prev => [...prev, itemToRestore]);
            setDeletedItems(prev => prev.filter(item => item.id !== id));
            setHasUnsavedChanges(true);
        }
    };

    const validateForm = (): boolean => {
        if (!docDate || !warehouse) {
            showAlert('Lütfen tüm zorunlu alanları (Depo, Tarih) doldurun.', 'warning');
            return false;
        }
        if (receiptItems.length === 0 || receiptItems.some(item => !item.item || Number(item.quantity) <= 0 || isNaN(Number(item.quantity)) || !item.invoiceDetailId)) {
            showAlert('Lütfen en az bir ürün ekleyin ve tüm ürün alanlarını doğru şekilde doldurun.', 'warning');
            return false;
        }
        return true;
    };

    const resetForm = () => {
        setHasUnsavedChanges(false);
        setCode('');
        setWarehouse(null);
        setDocDate(new Date());
        setReceiptItems([]);
        setDeletedItems([]);
        setEditingReceiptId(null);
        setIsFormVisible(false);
        clearAlert();
    };

    const handleSaveReceipt = async () => {
        if (!validateForm()) return;
        const finalReceiptItems = [...receiptItems, ...deletedItems.map(item => ({ ...item, recordStatus: 1 }))];

        const receiptData = {
            docDate: docDate?.toISOString(),
            warehouseId: Number(warehouse),
            receiptDetails: finalReceiptItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                description: item.description,
                invoiceDetailId: Number(item.invoiceDetailId),
                providerId: Number(item.providerId),
                firm: item.firm
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.post(server.baseurl + server.warehouse + "create-receipt", receiptData, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 201) {
                resetForm();
                getReceipts();
                showAlert('Fiş başarıyla kaydedildi!', 'success');
            } else { showAlert(response.data.message || 'Fiş kaydedilirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Fiş kaydedilirken bir hata oluştu.', 'error'); }
        }
    };

    const handleUpdateReceipt = async () => {
        if (!validateForm() || !editingReceiptId) return;
        const finalReceiptItems = [...receiptItems, ...deletedItems.map(item => ({ ...item, recordStatus: 1 }))];
        const receiptData = {
            id: Number(editingReceiptId),
            code: code,
            docDate: docDate?.toISOString(),
            warehouseId: Number(warehouse),
            receiptDetails: finalReceiptItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                description: item.description,
                invoiceDetailId: Number(item.invoiceDetailId),
                providerId: Number(item.providerId),
                firm: item.firm
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.put(server.baseurl + server.warehouse + "update-receipt", receiptData, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                showAlert('Fiş başarıyla güncellendi!', 'success');
                resetForm();
                getReceipts();
            } else { showAlert(response.data.message || 'Fiş güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            }
            else { showAlert('Fiş güncellenirken bir hata oluştu.', 'error'); }
        }
    };

    const handleEditClick = (row: ReceiptType) => {
        setEditingReceiptId(row.id);
        setCode(row.code);
        setDocDate(new Date(row.docDate));
        const warehouseObject = warehousesList.find(w => Number(w.id) === Number(row.warehouse.id)) || null;
        setSelectedWarehouse(warehouseObject);
        setWarehouse(row.warehouse.id);
        const processedItems: ProcessedReceiptItem[] = row.receiptDetails.map(detail => {
            const invoiceNo = detail.invoiceDetail?.invoiceHeader?.invoiceNo || '-';
            return {
                id: Number(detail.id),
                item: detail.item.id,
                itemName: detail.item.name,
                invoiceNo: invoiceNo,
                unit: detail.item.unit,
                quantity: Number(detail.quantity),
                description: detail.description,
                invoiceDetailId: Number(detail.invoiceDetail.id),
                providerId: Number(detail.provider?.id || 0),
                providerName: detail.provider?.name || '',
                firm: detail.firm,
                recordStatus: detail.recordStatus
            };
        });
        setReceiptItems(processedItems.filter(item => item.recordStatus === 0));
        setDeletedItems(processedItems.filter(item => item.recordStatus === 1));
        handleCloseMenu();
        setIsFormVisible(true);
        clearAlert();
    };

    const handleOpenModal = (details: ReceiptItem[]) => {
        const processedDetails: ProcessedReceiptItem[] = details.map(detail => ({
            id: Number(detail.id),
            item: detail.item.id,
            itemName: detail.item.name,
            invoiceNo: detail.invoiceDetail?.invoiceHeader?.invoiceNo || '',
            unit: detail.item.unit,
            quantity: Number(detail.quantity),
            description: detail.description,
            invoiceDetailId: Number(detail.invoiceDetail?.id),
            providerId: Number(detail.provider?.id || 0),
            providerName: detail.provider?.name || '',
            firm: detail.firm,
            recordStatus: detail.recordStatus
        }));
        setModalDetails(processedDetails);
        setOpenModal(true);
    };
    const handleCloseModal = () => setOpenModal(false);
    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10)); setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value); setPage(0);
    };
    const handleRequestSort = (property: SortableReceiptKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ReceiptType) => {
        setAnchorEl(event.currentTarget);
        setSelectedReceiptForMenu(row);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedReceiptForMenu(null); };
    const handleClickOpenDeleteModal = (id: number) => {
        setReceiptIdToDelete(id);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setReceiptIdToDelete(null);
    };
    const isFormComplete = useMemo(() => {
        const hasValidItems = receiptItems.length > 0 && !receiptItems.some(item => !item.item || Number(item.quantity) <= 0 || isNaN(Number(item.quantity)) || !item.invoiceDetailId);
        const isMainFormComplete = docDate && warehouse;
        return isMainFormComplete && hasValidItems;
    }, [docDate, warehouse, receiptItems]);

    const filteredReceipts = useMemo(() => {
        return receiptsList.filter(receipt => {
            const matchesSearch = receipt.code.toLowerCase().includes(searchTerm.toLowerCase());
            const docDate = new Date(receipt.docDate);
            const matchesDate =
                (!startDate || docDate >= startDate) &&
                (!endDate || docDate <= endDate);
            return matchesSearch && matchesDate;
        });
    }, [receiptsList, searchTerm, startDate, endDate]);

    const sortedAndFilteredReceipts = stableSort(filteredReceipts, getComparator(order, orderBy));
    const paginatedReceipts = sortedAndFilteredReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    // --- توابع کمکی برای دانلود PDF و Excel (با ساختار دقیق نمونه شما) ---

    const getDocFonts = (doc: jsPDF) => {
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
    };

    const getPdfHeader = (doc: jsPDF, title: string, startY: number, isFiltered: boolean = false) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoImg = new Image();
        logoImg.src = logoSrc;

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, startY, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('Times', 'bold');
        doc.text(`Rapor Tarih:`, 15, startY + 10);
        doc.setFont('Times', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, startY + 10);
        doc.addImage(logoImg, 'PNG', pageWidth - 60, startY + 5, 50, 25);

        if (isFiltered) {
            let filterInfo = '';
            if (searchTerm) filterInfo += `Arama: ${searchTerm} | `;
            if (startDate || endDate) {
                const startStr = startDate ? format(startDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                const endStr = endDate ? format(endDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                filterInfo += `Tarih Aralığı: ${startStr} - ${endStr}`;
            }
            if (filterInfo) {
                doc.setFont('Arial', 'normal');
                doc.setFontSize(9);
                doc.text(filterInfo, pageWidth / 2, startY + 32, { align: 'center' });
            }
        }
        return isFiltered ? startY + 40 : startY + 30;
    };

    const getPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const docAny = doc as any;

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0);
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

        const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
        const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        doc.setFont('NotoSans', 'normal');
        doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    };

    const getExcelStyles = () => {
        const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
        const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
        const headerFont = { ...font, bold: true };
        const centerAlignment = { vertical: 'middle', horizontal: 'center' as const, wrapText: true };
        const leftAlignment = { vertical: 'middle', horizontal: 'left' as const, wrapText: true };
        const fullHeaderStyle = { border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>;
        const bodyStyle = { border, alignment: leftAlignment, font } as Partial<Excel.Style>;
        return { fullHeaderStyle, bodyStyle, thinBorder, border, headerFill, font, headerFont, centerAlignment, leftAlignment };
    };

    const addCompanyInfoToExcel = (ws: Excel.Worksheet, columnCount: number) => {
        ws.addRow([]);
        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
        ];
        const mergeRangeEndColumn = String.fromCharCode(65 + columnCount - 1);
        companyInfo.forEach(line => {
            const row = ws.addRow([line]);
            row.getCell(1).alignment = { horizontal: 'center' as const };
            row.getCell(1).font = { name: 'Arial', size: 8, bold: false };
            ws.mergeCells(`A${row.number}:${mergeRangeEndColumn}${row.number}`);
        });
    };

    // --- توابع دانلود PDF ---

    const calculateTotalQuantity = (items: ReceiptItem[]): { [unit: string]: number } => {
        const totals: { [unit: string]: number } = {};
        items.forEach(item => {
            const unit = item.item.unit?.title || 'Bilinmiyor';
            const quantity = Number(item.quantity) || 0;
            totals[unit] = (totals[unit] || 0) + quantity;
        });
        return totals;
    };


    const handleDownloadReceiptDetailsPDF = async (receipt: ReceiptType) => {
        showAlert('Fiş detayları PDF oluşturuluyor...', 'info');
        setOpenReceiptDetailsDownloadModal(false);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            getDocFonts(doc);
            doc.setFont('NotoSans');

            const header = () => {
                doc.setFont('NotoSans', 'normal');
                doc.setFontSize(14);
                doc.text('Fiş Detay Raporu', pageWidth / 2, 15, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('Times', 'bold');
                doc.text(`Rapor Tarih:`, 15, 25);
                doc.setFont('Times', 'normal');
                doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 25);
                const logoImg = new Image();
                logoImg.src = logoSrc;
                doc.addImage(logoImg, 'PNG', pageWidth - 60, 20, 50, 25);
            };

            const footer = () => {
                doc.setFont('NotoSans', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(0);
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
                const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
                const pageCount = (doc as any).internal.getNumberOfPages();
                doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
                doc.setFont('NotoSans', 'normal');
                doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            };

            header();

            let currentY = 50;
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(12);
            doc.text('Fiş Bilgileri:', 15, currentY);
            currentY += 8;
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(10);
            doc.text(`Fiş Kodu: ${receipt.code || '-'}`, 15, currentY);
            currentY += 6;
            doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, currentY);
            currentY += 6;
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, currentY);
            currentY += 10;

            if (receipt.receiptDetails.length > 0) {
                doc.setFont('NotoSans', 'bold');
                doc.setFontSize(12);
                doc.text('Ürün Detayları:', 15, currentY);
                currentY += 5;

                const rows = receipt.receiptDetails.map(item => [
                    item.invoiceDetail?.invoiceHeader?.invoiceNo || '-',
                    item.provider?.name || '-',
                    item.firm ? 'Şirket İçi' : 'Şirket Dışı',
                    item.item.name || '-',
                    item.quantity,
                    item.item.unit?.title || '-',
                    item.description,
                ]);

                const totals = calculateTotalQuantity(receipt.receiptDetails);
                const totalRows = Object.entries(totals).map(([unit, total]) => [
                    { content: 'Toplam:', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
                    total,
                    unit,
                    ''
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [['Fatura No', 'Tedarikçi', 'Firma', 'Ürün Adı', 'Miktar', 'Birim', 'Açıklama']],
                    body: rows,
                    foot: totalRows as any,
                    theme: 'grid',
                    styles: {
                        font: 'NotoSans',
                        fontStyle: 'normal',
                        fontSize: 10,
                        cellPadding: 2,
                        overflow: 'linebreak'
                    },
                    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
                    didDrawPage: (_data) => {
                        header();
                        footer();
                    },
                    showHead: 'everyPage',
                    margin: { top: 50, bottom: 45 },
                });
            } else {
                doc.text('Bu fişe ait ürün bilgisi bulunamadı.', 15, currentY + 10);
            }

            footer();
            doc.save(`Fiş_Detay_${receipt.code}.pdf`);
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error("Detay PDF oluşturulurken hata:", error);
            showAlert('Detay PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleDownloadAllOrFilteredPDF = (data: ReceiptType[], isFiltered: boolean) => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        getDocFonts(doc);
        doc.setFont('NotoSans');

        let yPos = 15;

        data.forEach((receipt, index) => {
            if (index > 0) {
                doc.addPage();
                yPos = 15;
            }

            yPos = getPdfHeader(doc, isFiltered ? 'Filtrelenmiş Fişler Raporu' : 'Tüm Fişler Raporu', yPos, isFiltered) + 10;

            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(12);
            doc.text(`Fiş Kodu: ${receipt.code || '-'}`, 15, yPos);
            yPos += 6;
            doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
            yPos += 6;
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos);
            yPos += 10;

            if (receipt.receiptDetails.length > 0) {
                const rows = receipt.receiptDetails.map(item => [
                    item.invoiceDetail?.invoiceHeader?.invoiceNo || '-',
                    item.provider?.name || '-',
                    item.firm ? 'Şirket İçi' : 'Şirket Dışı',
                    item.item.name || '-',
                    item.quantity,
                    item.item.unit?.title || '-',
                    item.description,
                ]);

                const totals = calculateTotalQuantity(receipt.receiptDetails);
                const totalRows = Object.entries(totals).map(([unit, total]) => [
                    { content: 'Toplam:', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
                    total,
                    unit,
                    ''
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Fatura No', 'Tedarikçi', 'Firma', 'Ürün Adı', 'Miktar', 'Birim', 'Açıklama']],
                    body: rows,
                    foot: totalRows as any,
                    theme: 'grid',
                    styles: {
                        font: 'NotoSans',
                        fontStyle: 'normal',
                        fontSize: 10,
                        cellPadding: 2,
                        overflow: 'linebreak'
                    },
                    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                    footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
                    didDrawPage: (_data) => {
                        getPdfHeader(doc, isFiltered ? 'Filtrelenmiş Fişler Raporu' : 'Tüm Fişler Raporu', 15, isFiltered);
                        getPdfFooter(doc);
                    },
                    showHead: 'everyPage',
                    margin: { top: 50, bottom: 45 },
                });
            } else {
                doc.text('Bu fişe ait ürün bilgisi bulunamadı.', 15, yPos);
            }
        });

        doc.save(`${isFiltered ? 'Filtrelenmiş' : 'Tüm'}_Fişlerin_Detaylı_Raporu.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    };

    // --- توابع دانلود Excel ---

    const handleDownloadReceiptDetailsExcel = async (receipt: ReceiptType) => {
        showAlert('Fiş detayları Excel oluşturuluyor...', 'info');
        setOpenReceiptDetailsDownloadModal(false);
        try {
            const { fullHeaderStyle, bodyStyle } = getExcelStyles();
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Fiş Detayları', { views: [{ rightToLeft: false }] });

            const titleRow = worksheet.addRow([`Fiş Detay Raporu - ${receipt.code}`]);
            titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
            titleRow.getCell(1).alignment = { horizontal: 'center' as const };
            worksheet.mergeCells('A1:B1');
            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells('A2:B2');
            worksheet.addRow([]);

            const infoHeaders = ['Fiş Kodu', 'Depo', 'Tarih'];
            const infoData = [receipt.code || '-', receipt.warehouse?.name || '-', formatDateDisplay(receipt.docDate)];

            const infoTitleRow = worksheet.addRow(['Fiş Bilgileri']);
            infoTitleRow.eachCell(c => {
                Object.assign(c.style, fullHeaderStyle);
                c.style.alignment = { ...c.style.alignment, horizontal: 'left' as const };
            });
            worksheet.mergeCells(`A${infoTitleRow.number}:B${infoTitleRow.number}`);

            infoHeaders.forEach((header, index) => {
                worksheet.addRow([header, infoData[index]]).eachCell(c => Object.assign(c.style, bodyStyle));
            });
            worksheet.addRow([]);

            const itemHeaders = ['Fatura No', 'Tedarikçi', 'Firma', 'Ürün Adı', 'Miktar', 'Birim', 'Açıklama'];
            const columnCount = itemHeaders.length;

            if (receipt.receiptDetails.length > 0) {
                const infoTitleRow = worksheet.addRow(['Ürün Detayları']);
                infoTitleRow.eachCell(c => {
                    Object.assign(c.style, fullHeaderStyle);
                    c.style.alignment = { ...c.style.alignment, horizontal: 'left' as const };
                });
                worksheet.mergeCells(`A${infoTitleRow.number}:${String.fromCharCode(65 + columnCount - 1)}${infoTitleRow.number}`);

                const itemHeaderRow = worksheet.addRow(itemHeaders);
                itemHeaderRow.eachCell(c => Object.assign(c.style, fullHeaderStyle));

                receipt.receiptDetails.forEach(item => {
                    worksheet.addRow([
                        item.invoiceDetail?.invoiceHeader?.invoiceNo || '-',
                        item.provider?.name || '-',
                        item.firm ? 'Şirket İçi' : 'Şirket Dışı',
                        item.item.name || '-',
                        item.quantity,
                        item.item.unit?.title || '-',
                        item.description
                    ]).eachCell(c => Object.assign(c.style, bodyStyle));
                });

                const totals = calculateTotalQuantity(receipt.receiptDetails);
                Object.entries(totals).forEach(([unit, total]) => {
                    const totalRow = worksheet.addRow([]);
                    totalRow.getCell(5).value = 'Toplam:';
                    totalRow.getCell(5).style = { ...bodyStyle, font: { ...bodyStyle.font, bold: true }, alignment: { ...bodyStyle.alignment, horizontal: 'right' as const } };
                    totalRow.getCell(6).value = total;
                    totalRow.getCell(6).style = bodyStyle;
                    totalRow.getCell(7).value = unit;
                    totalRow.getCell(7).style = bodyStyle;
                    worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
                });
                worksheet.addRow([]);
            } else {
                worksheet.addRow(['Bu fişe ait ürün bilgisi bulunamadı.']).eachCell(c => Object.assign(c.style, bodyStyle));
            }

            // --- Corrected Block ---
            // Move the company info and column width logic here
            addCompanyInfoToExcel(worksheet, columnCount);
            if (worksheet.columns) {
                worksheet.columns.forEach(column => {
                    let maxLength = 0;
                    // ✅ یک بررسی اضافی نیز برای اطمینان از تعریف column اضافه کنید
                    if (column && column.eachCell) {
                        column.eachCell({ includeEmpty: true }, cell => {
                            const columnLength = cell.value ? cell.value.toString().length : 10;
                            if (columnLength > maxLength) maxLength = columnLength;
                        });
                    }
                    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
                });
            }
            // --- End of Corrected Block ---

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Fiş_Detay_${receipt.code}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error("Excel oluşturulurken hata:", error);
            showAlert('Excel oluşturulurken bir hata oluştu.', 'error');
        }
    };
    const handleDownloadAllOrFilteredExcel = async (data: ReceiptType[], isFiltered: boolean) => {
        showAlert('Excel dosyası oluşturuluyor...', 'info');
        setOpenAllDownloadModal(false);
        setOpenFilteredDownloadModal(false);
        if (!data || data.length === 0) {
            showAlert('Dışa aktarılacak fiş bulunamadı.', 'warning');
            return;
        }
        try {
            const { fullHeaderStyle, bodyStyle } = getExcelStyles();
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Fiş Raporu', { views: [{ rightToLeft: false }] });
            const titleText = isFiltered ? 'Filtrelenmiş Fiş Raporu' : 'Tüm Fiş Raporu';
            worksheet.addRow([titleText]).eachCell(c => {
                c.font = { name: 'Times New Roman', size: 12, bold: true };
                c.alignment = { horizontal: 'center' as const };
            });
            worksheet.mergeCells('A1:B1');
            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells('A2:B2');
            worksheet.addRow([]);

            const itemHeaders = ['Fatura No', 'Tedarikçi', 'Firma', 'Ürün Adı', 'Miktar', 'Birim', 'Açıklama'];

            data.forEach((receipt, index) => {
                if (index > 0) worksheet.addRow([]); // Blank row for separation

                const receiptInfoRow = worksheet.addRow([`Fiş Kodu: ${receipt.code || '-'}`, `Depo: ${receipt.warehouse?.name || '-'}`, `Tarih: ${formatDateDisplay(receipt.docDate)}`]);
                receiptInfoRow.eachCell(c => Object.assign(c.style, bodyStyle));

                worksheet.addRow([]);
                const itemHeaderRow = worksheet.addRow(itemHeaders);
                itemHeaderRow.eachCell(c => Object.assign(c.style, fullHeaderStyle));

                receipt.receiptDetails.forEach(item => {
                    worksheet.addRow([
                        item.invoiceDetail?.invoiceHeader?.invoiceNo || '-',
                        item.provider?.name || '-',
                        item.firm ? 'Şirket İçi' : 'Şirket Dışı',
                        item.item.name || '-',
                        item.quantity,
                        item.item.unit?.title || '-',
                        item.description
                    ]).eachCell(c => Object.assign(c.style, bodyStyle));
                });

                const totals = calculateTotalQuantity(receipt.receiptDetails);
                Object.entries(totals).forEach(([unit, total]) => {
                    const totalRow = worksheet.addRow([]);
                    totalRow.getCell(5).value = 'Toplam:';
                    totalRow.getCell(5).style = { ...bodyStyle, font: { ...bodyStyle.font, bold: true }, alignment: { ...bodyStyle.alignment, horizontal: 'right' as const } };
                    totalRow.getCell(6).value = total;
                    totalRow.getCell(6).style = bodyStyle;
                    totalRow.getCell(7).value = unit;
                    totalRow.getCell(7).style = bodyStyle;
                    worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
                });
            });

            addCompanyInfoToExcel(worksheet, itemHeaders.length);

            if (worksheet.columns) {
                worksheet.columns.forEach(column => {
                    let maxLength = 0;
                    // ✅ یک بررسی اضافی نیز برای اطمینان از تعریف column اضافه کنید
                    if (column && column.eachCell) {
                        column.eachCell({ includeEmpty: true }, cell => {
                            const columnLength = cell.value ? cell.value.toString().length : 10;
                            if (columnLength > maxLength) maxLength = columnLength;
                        });
                    }
                    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const fileNamePrefix = isFiltered ? 'Filtrelenmiş_Fişler' : 'Tüm_Fişler';
            saveAs(new Blob([buffer]), `${fileNamePrefix}_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error("Excel oluşturulurken hata:", error);
            showAlert('Excel oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleDownloadAllClicked = () => {
        setOpenAllDownloadModal(true);
    };

    const handleDownloadFilteredClicked = () => {
        setOpenFilteredDownloadModal(true);
    };

    const handleDownloadReceiptDetailsClicked = (receipt: ReceiptType) => {
        setSelectedReceiptForMenu(receipt);
        setOpenReceiptDetailsDownloadModal(true);
    };

    return (
        <Box mt={2}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                mb={3}
                spacing={2}
                flexWrap="wrap"
            >
                <Typography variant="h6" sx={{ mb: { xs: 2, md: 0 } }}>
                    {editingReceiptId ? `Fişi Düzenle: ${code}` : "Yeni Fiş Kaydet"}</Typography>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Fiş Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={isSmallScreen}
                            >
                                Yeni Fiş Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={resetForm}
                                fullWidth={isSmallScreen}
                                startIcon={<IconX size={20} />}
                            >
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Stack>
            {((isFormVisible && hasCreatePermission) || (editingReceiptId && hasEditPermission)) && (
                <>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <CustomFormLabel htmlFor="warehouse-autocomplete" required>Depo</CustomFormLabel>
                                <Autocomplete<WarehouseType>
                                    id="warehouse-autocomplete"
                                    options={warehousesList}
                                    getOptionLabel={(option) => option.name}
                                    value={selectedWarehouse}
                                    onChange={(_event, newValue) => {
                                        setSelectedWarehouse(newValue);
                                        setWarehouse(newValue ? newValue.id : null);
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Depo Seçin" variant="outlined" size="small" />}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <CustomFormLabel htmlFor="doc-date" required>Tarihi</CustomFormLabel>
                                    <DatePicker
                                        value={docDate} onChange={(newValue) => setDocDate(newValue)}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => <TextField {...params} size="small" />}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        </Grid>
                        <Typography variant="h6" mb={2} sx={{ mt: 3 }}>Ürün Detayları</Typography>
                        <ReceiptItemsTable
                            items={receiptItems}
                            deletedItems={deletedItems}
                            onItemsUpdate={handleReceiptItemsUpdate}
                            onItemDelete={handleReceiptItemsDelete}
                            onRestoreItem={handleRestoreItem}
                            showAlert={showAlert}
                        />
                        <Box mt={3} textAlign="right">
                            {editingReceiptId ? (
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {hasEditPermission && <Button variant="contained" color="info" onClick={handleUpdateReceipt}>Güncelle</Button>}
                                    <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                                </Stack>
                            ) : (
                                <>
                                    {hasCreatePermission && (
                                        <CustomTooltip
                                            title={hasUnsavedChanges ? "Tüm alanları doldurup Fişi kaydetmek için tıklayın." : "Fiş kaydetme hazır"}
                                            placement="top"
                                        >
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleSaveReceipt}
                                                disabled={!isFormComplete || !hasUnsavedChanges}
                                                sx={{ animation: hasUnsavedChanges && isFormComplete ? `${blinkAnimation} 1.5s infinite` : 'none' }}
                                            >
                                                Fişi Kaydet
                                            </Button>
                                        </CustomTooltip>
                                    )}
                                </>
                            )}
                        </Box>
                    </Paper>
                </>
            )}
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Fiş indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="info"
                                    onClick={handleDownloadFilteredClicked}
                                    startIcon={<IconFileDownload />}
                                    isBlinking={true}
                                    disabled={loadingData}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Fişleri İndir" : ""}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadAllClicked}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Fiş Listesi</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Fiş Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
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
                        <Typography variant="h6" sx={{ ml: 2 }}>Fişler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table aria-label="receipt table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')}>
                                            <Typography variant="h6">Fiş Kodu</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'warehouseId'} direction={orderBy === 'warehouseId' ? order : 'asc'} onClick={() => handleRequestSort('warehouseId')}>
                                            <Typography variant="h6">Depo</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                            <Typography variant="h6">Tarih</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ürün Detayları</Typography></StyledTableCell>
                                    <StyledTableCell align="right"></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedReceipts.length > 0 ? (
                                    paginatedReceipts.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">
                                                    {row.warehouse?.name || '-'}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.receiptDetails)}>
                                                    Görünüm
                                                </Button>
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                <IconButton
                                                    id={`basic-button-${row.id}`}
                                                    aria-controls={Boolean(anchorEl) ? 'basic-menu' : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                                                    onClick={(event) => handleClickMenu(event, row)}
                                                >
                                                    <IconDots size={20} />
                                                </IconButton>
                                                <Menu
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={Boolean(anchorEl) && selectedReceiptForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                                >
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişi PDF olarak indirin" : ""}>
                                                            <MuiMenuItem onClick={() => handleDownloadReceiptDetailsClicked(row)}>
                                                                <ListItemIcon><IconFileDownload size={18} /></ListItemIcon> Detayları İndir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişi düzenleyin" : ""}>
                                                            <MuiMenuItem onClick={() => handleEditClick(row)}>
                                                                <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişi silin" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenDeleteModal(row.id)}>
                                                                <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç Fiş bulunamadı.
                                            </Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredReceipts.length}
                    rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </BlankCard>
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
                <DialogTitle>Fiş Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="Ürün detayları tablosu">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Fatura No</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tedarikçi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Firma</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ürün Adı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.length > 0 ? (
                                    modalDetails.map((detail, index) => (
                                        <TableRow key={detail.id || index}>
                                            <StyledTableCell><Typography variant="body1">{detail.invoiceNo || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.providerName || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.firm ? 'Şirket İçi' : 'Şirket Dışı'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.itemName || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.quantity}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.unit?.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={7} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç ürün detayı bulunamadı.
                                            </Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Kapat</Button></DialogActions>
            </Dialog>
            <DeleteReceiptModal
                openModal={openDeleteModal} onClose={handleClickCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                onDeleteSuccess={getReceipts} showAlert={showAlert}
            />
            <Dialog open={openAllDownloadModal} onClose={() => setOpenAllDownloadModal(false)}>
                <DialogTitle>Tüm Fişler İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button
                            variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredPDF(receiptsList, false);
                                setOpenAllDownloadModal(false);
                            }}
                        >
                            Tüm Fişler Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredExcel(receiptsList, false);
                                setOpenAllDownloadModal(false);
                            }}
                        >
                            Tüm Fişler Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAllDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openFilteredDownloadModal} onClose={() => setOpenFilteredDownloadModal(false)}>
                <DialogTitle>Filtrelenmiş Fişler İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button
                            variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredPDF(sortedAndFilteredReceipts, true);
                                setOpenFilteredDownloadModal(false);
                            }}
                        >
                            Filtrelenmiş Fişler Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredExcel(sortedAndFilteredReceipts, true);
                                setOpenFilteredDownloadModal(false);
                            }}
                        >
                            Filtrelenmiş Fişler Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenFilteredDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openReceiptDetailsDownloadModal} onClose={() => setOpenReceiptDetailsDownloadModal(false)}>
                <DialogTitle>Detaylı Fiş Raporu İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button
                            variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => {
                                if (selectedReceiptForMenu) {
                                    handleDownloadReceiptDetailsPDF(selectedReceiptForMenu);
                                    setOpenReceiptDetailsDownloadModal(false);
                                }
                            }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => {
                                if (selectedReceiptForMenu) {
                                    handleDownloadReceiptDetailsExcel(selectedReceiptForMenu);
                                    setOpenReceiptDetailsDownloadModal(false);
                                }
                            }}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReceiptDetailsDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListReceipts;