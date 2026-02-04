import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    TableSortLabel, useMediaQuery,
    DialogContentText
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
import autoTable from 'jspdf-autotable';
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
    ReceiptType,
    InvoiceType
} from './types';
import BlankCard from 'src/components/shared/BlankCard';

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

// اصلاح: کلید مرتب‌سازی تودرتو برای انبار
type SortableReceiptKeys = 'code' | 'docDate' | 'warehouse.id';

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
    const getNestedValue = (obj: any, path: string): any =>
        path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
    const valA = getNestedValue(a, orderBy as string);
    const valB = getNestedValue(b, orderBy as string);
    if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
    if (valA === undefined || valA === null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    const dateA = new Date(valA as any).getTime();
    const dateB = new Date(valB as any).getTime();
    if (!isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
    return 0;
};

const getComparator = (order: 'asc' | 'desc', orderBy: SortableReceiptKeys) =>
    order === 'desc'
        ? (a: ReceiptType, b: ReceiptType) => descendingComparator(a, b, orderBy)
        : (a: ReceiptType, b: ReceiptType) => -descendingComparator(a, b, orderBy);

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
    const [openAllDownloadModal, setOpenAllDownloadModal] = useState(false);
    const [openFilteredDownloadModal, setOpenFilteredDownloadModal] = useState(false);
    const [openReceiptDetailsDownloadModal, setOpenReceiptDetailsDownloadModal] = useState(false);
    const [isInvoiceComboDisabled, setIsInvoiceComboDisabled] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
    const [viewedReceipt, setViewedReceipt] = useState<ReceiptType | null>(null);

    const [generalDescription, setGeneralDescription] = useState('');


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openIgnoreInvoiceModal, setOpenIgnoreInvoiceModal] = useState(false);


    const nameInputRef = useRef<HTMLInputElement>(null);

    // const { allowedOperations } = useAuth();
    // const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    // const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    // const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    // const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);



    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            // اگر خود آیتم تطبیق داشت
            if (item.href === path) return item;

            // اگر آیتم فرزند داشت، داخل فرزندان جستجو کن
            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    // ۲. استفاده از تابع برای پیدا کردن منوی فعلی
    const currentMenu = useMemo(() => {

        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    // ۳. استخراج ID عملیات‌ها (با اطمینان از وجود id)
    const currentMenuOpIds = useMemo(() => {
        // اگر منو یا عملیات‌های آن وجود نداشت، آرایه خالی برگردان
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            // با توجه به دیتای API شما، ID اصلی عملیات در این سطح است
            return String(op.id);
        });
    }, [currentMenu]);

    // ۴. تابع نهایی بررسی دسترسی
    const hasPermission = (opName: string) => {
        return allowedOperations.some((op: any) =>
            op.systemOperationName === opName &&
            currentMenuOpIds.includes(String(op.menuOperationId))
        );
    };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazدırmak"), [allowedOperations, currentMenuOpIds]);

    //   const hasStatusPermission = useMemo(() => hasPermission("Onaylamak"), [allowedOperations, currentMenuOpIds]);

    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return format(date, 'dd MMMM yyyy', { locale: tr });
        } catch (e) {
            return "Geçersiz Tarih";
        }
    };

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => { setAlertMessage(null); };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) { timer = setTimeout(() => { clearAlert(); }, 5000); }
        return () => { clearTimeout(timer); };
    }, [alertMessage]);

    const fetchWarehouses = useCallback(async () => {
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
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` },
                params: requestParams
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    const getReceipts = useCallback(async () => {
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
            const response = await axios.get(server.baseurl + server.warehouse + "get-receipt",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                });
            if (response.data.httpStatusCode === 200) {
                setReceiptsList(response.data.data as ReceiptType[]);
            } else {
                showAlert(response.data.message || 'Fişlar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    useEffect(() => {
        getReceipts();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(timer);
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
        if (receiptItems.length === 0 || receiptItems.some(item =>
            !item.item || Number(item.quantity) <= 0 || isNaN(Number(item.quantity))
        )) {
            showAlert('Lütfen en az bir ürün ekleyin ve tüm ürün alanlarını doğru şekilde doldurun.', 'warning');
            return false;
        }
        if (!editingReceiptId && !selectedInvoice) {
            showAlert('Lütfen bir Fatura seçin.', 'warning');
            return false;
        }
        return true;
    };

    const calculateModalSummaries = (items: ProcessedReceiptItem[]) => {
        const summary: Record<string, number> = {};
        items.forEach(item => {
            const unitTitle = item.unit?.title || "Diğer";
            const qty = Number(item.quantity) || 0;
            summary[unitTitle] = (summary[unitTitle] || 0) + qty;
        });
        return summary;
    };

    const resetForm = () => {
        setHasUnsavedChanges(false);
        setCode('');

        setGeneralDescription('');
        setWarehouse(null);
        setDocDate(new Date());
        setReceiptItems([]);
        setDeletedItems([]);
        setEditingReceiptId(null);
        setIsFormVisible(false);
        setSelectedInvoice(null);
        setSelectedWarehouse(null);
        setIsInvoiceComboDisabled(false);
        clearAlert();
    };

    // API جدید: پایان/بازگشایی فاکتور
    const updateInvoiceIsEnd = async (invoiceId: number, isEnd: boolean) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const url = server.baseurl + server.initialoperations + "update-invoice-is-end";
            const payload = { id: Number(invoiceId), isEnd };
            const resp = await axios.put(url, payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (resp.data?.httpStatusCode === 200) {
                showAlert(isEnd ? 'Fatura sonlandırıldı.' : 'Fatura tekrar açıldı.', 'success');
            } else {
                showAlert(resp.data?.message || 'Fatura durumu güncellenemedi.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    };

    const handleInitialSaveClick = () => {
        if (!validateForm()) return;
        // مودال جدید:
        setOpenIgnoreInvoiceModal(true);
    };

    const handleFinalSaveReceipt = async (shouldEndInvoice: boolean) => {
        if (!validateForm()) return;

        const finalReceiptItems = [
            ...receiptItems,
            // ...deletedItems.map(item => ({ ...item, recordStatus: 1 }))
        ];

        const receiptData = {
            docDate: docDate?.toISOString(),
            description: generalDescription,
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
            await axios.post(
                server.baseurl + server.warehouse + "create-receipt",
                receiptData,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            showAlert('Fiş başarıyla kaydedildi.', 'success');

            if (shouldEndInvoice && selectedInvoice?.id) {
                await updateInvoiceIsEnd(Number(selectedInvoice.id), true);
            }

            resetForm();
            getReceipts();
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    };

    const handleUpdateReceipt = async () => {
        if (!validateForm() || !editingReceiptId) return;
        const finalReceiptItems = [
            ...receiptItems,
            // ...deletedItems.map(item => ({ ...item, recordStatus: 1 }))
        ];
        const receiptData = {
            id: Number(editingReceiptId),
            code: code,
            docDate: docDate?.toISOString(),
            description: generalDescription,
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
            if (e.response?.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            } else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else { showAlert('Fiş güncellenirken یک hata oluştu.', 'error'); }
        }
    };

    const handleEditClick = (row: ReceiptType) => {
        setEditingReceiptId(row.id);
        setCode(row.code);
        setGeneralDescription(row.description || '');
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

        const currentInvoiceId = Number(row.receiptDetails[0]?.invoiceDetail?.invoiceHeader?.id);
        const currentInvoice = {
            id: currentInvoiceId,
            invoiceNo: row.receiptDetails[0]?.invoiceDetail?.invoiceHeader?.invoiceNo || '',
            docDate: row.receiptDetails[0]?.invoiceDetail?.invoiceHeader?.docDate || new Date().toISOString(),
        } as InvoiceType;

        setSelectedInvoice(currentInvoice);
        setIsInvoiceComboDisabled(true);

        setIsFormVisible(true);
        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);
        clearAlert();

        handleCloseMenu();

    };

    const handleOpenModal = (row: ReceiptType) => {
        // ذخیره کل رسید برای استفاده در دکمه‌های دانلود
        setViewedReceipt(row);

        const details = row.receiptDetails; // استخراج جزئیات برای نمایش در جدول

        // همان منطق قبلی برای پردازش آیتم‌ها
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
        const isMainFormComplete = !!docDate && !!warehouse && !!selectedInvoice;
        return isMainFormComplete && hasValidItems;
    }, [docDate, warehouse, receiptItems, selectedInvoice]);

    const filteredReceipts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return receiptsList.filter(receipt => {
            const codeOk = receipt.code?.toLowerCase().includes(q);
            const whOk = receipt.warehouse?.name?.toLowerCase().includes(q);
            const invOk = receipt.receiptDetails?.some(d =>
                d.invoiceDetail?.invoiceHeader?.invoiceNo?.toLowerCase().includes(q) ||
                d.item?.name?.toLowerCase().includes(q)
            );
            const matchesSearch = !q || codeOk || whOk || invOk;

            const dd = new Date(receipt.docDate);
            const matchesDate = (!startDate || dd >= startDate) && (!endDate || dd <= endDate);
            return matchesSearch && matchesDate;
        });
    }, [receiptsList, searchTerm, startDate, endDate]);

    const sortedAndFilteredReceipts = stableSort(filteredReceipts, getComparator(order, orderBy));
    const paginatedReceipts = sortedAndFilteredReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

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
        doc.setFont('NotoSans', 'bold');
        doc.text(`Rapor Tarihi:`, 15, 40);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

        doc.addImage(logoImg, 'PNG', pageWidth - 50, 10, 35, 18);

        doc.setLineWidth(0.5);
        doc.line(15, 45, pageWidth - 15, 45);
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

    // const getPdfFooter = (doc: jsPDF) => {
    //     const pageWidth = doc.internal.pageSize.getWidth();
    //     const pageHeight = doc.internal.pageSize.getHeight();
    //     const docAny = doc as any;
    //     doc.setFont('NotoSans', 'normal');
    //     doc.setFontSize(8);
    //     doc.setTextColor(0);
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
    //     const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
    //     const pageCount = docAny.internal.getNumberOfPages();
    //     doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    //     doc.setFont('NotoSans', 'normal');
    //     doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    //     doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    // };

    const getPdfFooter = (pdfDoc: jsPDF) => {

        const pageWidth = pdfDoc.internal.pageSize.getWidth();
        const pageHeight = pdfDoc.internal.pageSize.getHeight();
        pdfDoc.setFontSize(8);
        pdfDoc.setFont('NotoSans', 'normal');
        pdfDoc.setTextColor(100);

        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İنŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
            'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
        ];

        let footerY = pageHeight - 20;
        companyInfo.forEach(line => {
            pdfDoc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 4;
        });

        pdfDoc.setTextColor(0);
        pdfDoc.setFontSize(10);
        pdfDoc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
        pdfDoc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

        const pageNumber = (pdfDoc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (pdfDoc as any).internal.getNumberOfPages();
        pdfDoc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };

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
                const logoImg = new Image();
                logoImg.src = logoSrc;
                doc.setFont('NotoSans', 'normal');
                doc.setFontSize(14);
                doc.text('Fiş Detay Raporu', pageWidth / 2, 15, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('NotoSans', 'bold');
                doc.text(`Rapor Tarihi:`, 15, 40);
                doc.setFont('NotoSans', 'normal');
                doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

                doc.addImage(logoImg, 'PNG', pageWidth - 50, 10, 35, 18);

                doc.setLineWidth(0.5);
                doc.line(15, 45, pageWidth - 15, 45);
            };

            const footer = (pdfDoc: jsPDF) => {
                pdfDoc.setFontSize(8);
                pdfDoc.setFont('NotoSans', 'normal');
                pdfDoc.setTextColor(100);

                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İنŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
                    'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
                ];

                let footerY = pageHeight - 20;
                companyInfo.forEach(line => {
                    pdfDoc.text(line, pageWidth / 2, footerY, { align: 'center' });
                    footerY += 4;
                });

                pdfDoc.setTextColor(0);
                pdfDoc.setFontSize(10);
                pdfDoc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
                pdfDoc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

                const pageNumber = (pdfDoc as any).internal.getCurrentPageInfo().pageNumber;
                const pageCount = (pdfDoc as any).internal.getNumberOfPages();
                pdfDoc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            };

            header();
            let currentY = 60;
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(12);
            doc.text('Fiş Bilgileri:', 15, currentY);
            currentY += 8;
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(8);
            doc.text(`Fiş Kodu: ${receipt.code || '-'}`, 15, currentY);
            currentY += 6;
            doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, currentY);
            currentY += 6;
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, currentY);
            currentY += 10;
            doc.text(`Genel Açıklama: ${receipt.description || '-'}`, 15, currentY);
            currentY += 14;

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
                    { content: 'Toplam:', colSpan: 4, styles: { fontStyle: 'normal', halign: 'right' } },
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
                    didDrawPage: () => {
                        header();
                        footer(doc);
                    },
                    showHead: 'everyPage',
                    margin: { top: 50, bottom: 45 },
                });
            } else {
                doc.text('Bu fişe ait ürün bilgisi bulunamadı.', 15, currentY + 10);
            }
            footer(doc);
            doc.save(`Fiş_Detay_${receipt.code}.pdf`);
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch {
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
            doc.text(`Genel Açıklama: ${receipt.description || '-'}`, 15, yPos);
            yPos += 14;

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
                    { content: 'Toplam:', colSpan: 4, styles: { fontStyle: 'normal', halign: 'right' } },
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
                    didDrawPage: () => {
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
        return { fullHeaderStyle, bodyStyle };
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

    const handleDownloadReceiptDetailsExcel = async (receipt: ReceiptType) => {
        showAlert('Fiş detayları Excel oluşturuluyor...', 'info');
        setOpenReceiptDetailsDownloadModal(false);
        try {
            const { fullHeaderStyle, bodyStyle } = getExcelStyles();
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Fiş Detayları', { views: [{ rightToLeft: false }] });
            const itemHeaders = ['Fatura No', 'Tedarikçi', 'Firma', 'Ürün Adı', 'Miktar', 'Birim', 'Açıklama'];
            const columnCount = itemHeaders.length;

            const titleRow = worksheet.addRow([`Fiş Detay Raporu - ${receipt.code}`]);
            titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
            titleRow.getCell(1).alignment = { horizontal: 'center' as const };
            worksheet.mergeCells(`A1:${String.fromCharCode(65 + columnCount - 1)}1`);

            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells(`A2:${String.fromCharCode(65 + columnCount - 1)}2`);
            worksheet.addRow([]);

            const infoHeaders = ['Fiş Kodu', 'Depo', 'Tarih', 'Genel Açıklama'];
            const infoData = [receipt.code || '-', receipt.warehouse?.name || '-',
            formatDateDisplay(receipt.docDate), receipt.description];
            const infoTitleRow = worksheet.addRow(['Fiş Bilgileri']);
            infoTitleRow.eachCell(c => {
                Object.assign(c.style, fullHeaderStyle);
                c.style.alignment = { ...c.style.alignment, horizontal: 'left' as const };
            });
            worksheet.mergeCells('A4:B4');
            infoHeaders.forEach((header, index) => {
                worksheet.addRow([header, infoData[index]]).eachCell(c => Object.assign(c.style, bodyStyle));
            });

            worksheet.addRow([]);

            if (receipt.receiptDetails.length > 0) {
                const itemDetailsTitleRow = worksheet.addRow(['Ürün Detayları']);
                itemDetailsTitleRow.eachCell(c => {
                    Object.assign(c.style, fullHeaderStyle);
                    c.style.alignment = { ...c.style.alignment, horizontal: 'left' as const };
                });
                worksheet.mergeCells(`A${itemDetailsTitleRow.number}:${String.fromCharCode(65 + columnCount - 1)}${itemDetailsTitleRow.number}`);

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

                // Totals
                const totals: { [u: string]: number } = {};
                receipt.receiptDetails.forEach(it => {
                    const u = it.item.unit?.title || 'Bilinmiyor';
                    totals[u] = (totals[u] || 0) + Number(it.quantity || 0);
                });
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

            addCompanyInfoToExcel(worksheet, columnCount);

            if (worksheet.columns) {
                worksheet.columns.forEach(column => {
                    let maxLength = 0;
                    if (column && (column as any).eachCell) {
                        (column as any).eachCell({ includeEmpty: true }, (cell: any) => {
                            const columnLength = cell.value ? cell.value.toString().length : 10;
                            if (columnLength > maxLength) maxLength = columnLength;
                        });
                    }
                    (column as any).width = Math.min(Math.max(maxLength + 2, 12), 50);
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Fiş_Detay_${receipt.code}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch {
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
            const itemHeaders = ['Fatura No', 'Tedarikçi', 'Firma', 'Ürün Adı', 'Miktar', 'Birim', 'Açıklama'];
            const columnCount = itemHeaders.length;

            const titleText = isFiltered ? 'Filtrelenmiş Fiş Raporu' : 'Tüm Fiş Raporu';
            worksheet.addRow([titleText]).eachCell(c => {
                (c as any).font = { name: 'Times New Roman', size: 12, bold: true };
                (c as any).alignment = { horizontal: 'center' as const };
            });
            worksheet.mergeCells(`A1:${String.fromCharCode(65 + columnCount - 1)}1`);
            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells(`A2:${String.fromCharCode(65 + columnCount - 1)}2`);
            worksheet.addRow([]);

            data.forEach((receipt, index) => {
                if (index > 0) worksheet.addRow([]);

                const receiptInfoRow = worksheet.addRow([`Fiş Kodu: ${receipt.code || '-'}`,
                `Depo: ${receipt.warehouse?.name || '-'}`,
                `Tarih: ${formatDateDisplay(receipt.docDate)}`,
                `Genel Açıklama: ${receipt.description || '-'}`]);
                receiptInfoRow.eachCell((c, colIndex) => {
                    Object.assign((c as any).style, bodyStyle);
                    if (colIndex === 1) worksheet.mergeCells(`A${receiptInfoRow.number}:B${receiptInfoRow.number}`);
                });

                worksheet.addRow([]);
                const itemHeaderRow = worksheet.addRow(itemHeaders);
                itemHeaderRow.eachCell(c => Object.assign((c as any).style, fullHeaderStyle));

                receipt.receiptDetails.forEach(item => {
                    worksheet.addRow([
                        item.invoiceDetail?.invoiceHeader?.invoiceNo || '-',
                        item.provider?.name || '-',
                        item.firm ? 'Şirket İçi' : 'Şirket Dışı',
                        item.item.name || '-',
                        item.quantity,
                        item.item.unit?.title || '-',
                        item.description
                    ]).eachCell(c => Object.assign((c as any).style, bodyStyle));
                });

                // Totals
                const totals: { [u: string]: number } = {};
                receipt.receiptDetails.forEach(it => {
                    const u = it.item.unit?.title || 'Bilinmiyor';
                    totals[u] = (totals[u] || 0) + Number(it.quantity || 0);
                });
                Object.entries(totals).forEach(([unit, total]) => {
                    const totalRow = worksheet.addRow([]);
                    totalRow.getCell(5).value = 'Toplam:';
                    (totalRow.getCell(5) as any).style = { ...bodyStyle, font: { ...(bodyStyle as any).font, bold: true }, alignment: { ...(bodyStyle as any).alignment, horizontal: 'right' as const } };
                    totalRow.getCell(6).value = total;
                    (totalRow.getCell(6) as any).style = bodyStyle as any;
                    totalRow.getCell(7).value = unit;
                    (totalRow.getCell(7) as any).style = bodyStyle as any;
                    worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
                });
            });

            addCompanyInfoToExcel(worksheet, itemHeaders.length);

            if (worksheet.columns) {
                worksheet.columns.forEach((column: any) => {
                    let maxLength = 0;
                    if (column && column.eachCell) {
                        column.eachCell({ includeEmpty: true }, (cell: any) => {
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
            showAlert('Excel başarıyla oluşturuldu و indiriliyor.', 'success');
        } catch {
            showAlert('Excel oluşturulurken یک hata oluştu.', 'error');
        }
    };

    const handleDownloadAllClicked = () => setOpenAllDownloadModal(true);
    const handleDownloadFilteredClicked = () => setOpenFilteredDownloadModal(true);
    const handleDownloadReceiptDetailsClicked = (receipt: ReceiptType) => {
        setSelectedReceiptForMenu(receipt);
        setOpenReceiptDetailsDownloadModal(true);
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
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                mb={3}
                spacing={2}
                flexWrap="wrap"
            >
                <Typography variant="h6" sx={{ mb: { xs: 2, md: 0 } }}>
                    {editingReceiptId ? `Fişi Düzenle: ${code}` : "Yeni Fiş Kaydet"}
                </Typography>

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
                                        value={docDate}
                                        inputRef={nameInputRef}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(newValue) => setDocDate(newValue)}
                                        renderInput={(params) => <TextField {...params} size="small" />}
                                    />
                                </LocalizationProvider>
                            </Grid>



                            <Grid item xs={12}>
                                <CustomFormLabel htmlFor="receipt-general-description">Açıklama</CustomFormLabel>
                                <TextField
                                    id="receipt-general-description"
                                    label="Fiş için genel açıklama giriniz"
                                    type="text"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    variant="outlined"
                                    value={generalDescription} // ⬅️ استفاده از نام جدید
                                    onChange={(e) => setGeneralDescription(e.target.value)} // ⬅️ استفاده از نام جدید
                                />
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
                            onInvoiceSelect={setSelectedInvoice}

                            // props زیر برای سازگاری با types فعلی نگه‌داشته شده‌اند اما دیگر استفاده عملی ندارند
                            endedInvoiceIds={[]}
                            getReceipts={getReceipts}
                            endedInvoiceReceiptMap={{}}

                            isInvoiceComboDisabled={isInvoiceComboDisabled}
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
                                                onClick={handleInitialSaveClick}
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

            {/* مودال جدید: نادیده گرفتن (sonlandır) فاکتور کمبو */}
            <Dialog open={openIgnoreInvoiceModal} onClose={() => setOpenIgnoreInvoiceModal(false)}>
                <DialogTitle>Fatura Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Fişi kaydettikten sonra, seçili fatura (No: {selectedInvoice?.invoiceNo ?? '—'}) gelecekte tekrar seçilemesin (sonlandırılsın) ister misiniz؟
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        (Evet derseniz bu fatura tekrar Fatura Seçin* listesinde görünmeyecek.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={async () => {
                        setOpenIgnoreInvoiceModal(false);
                        await handleFinalSaveReceipt(false);
                    }} color="error">
                        Hayır (Sadece Kaydet)
                    </Button>
                    <Button onClick={async () => {
                        setOpenIgnoreInvoiceModal(false);
                        await handleFinalSaveReceipt(true);
                    }} color="primary" variant="contained" autoFocus>
                        Evet (Kaydet ve Faturayı Sonlandır)
                    </Button>
                </DialogActions>
            </Dialog>

            {/* جدول و اکشن‌ها */}
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
                                        <TableSortLabel active={orderBy === 'warehouse.id'} direction={orderBy === 'warehouse.id' ? order : 'asc'} onClick={() => handleRequestSort('warehouse.id')}>
                                            <Typography variant="h6">Depo</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                            <Typography variant="h6">Tarih</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>

                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
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
                                            <StyledTableCell sx={{ maxWidth: 150 }}>
                                                {row.description && row.description.trim().length > 0 ? (
                                                    // حالت اول: اگر توضیحات وجود داشت (خالی نبود)
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
                                                    // حالت دوم: اگر توضیحات نال یا خالی بود
                                                    <Typography variant="body2" align="center">
                                                        -
                                                    </Typography>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<IconEye />}
                                                    onClick={() => handleOpenModal(row)} // ✅ تغییر: ارسال کل row بجای row.receiptDetails
                                                >
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
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişi düzenleyin" : ""}>
                                                            <MuiMenuItem onClick={() => handleEditClick(row)}>
                                                                <IconEdit size={18} style={{ marginRight: 8 }} />
                                                                Düzenle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişی silin" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenDeleteModal(row.id)}>
                                                                <IconTrash size={18} style={{ marginRight: 8 }} />
                                                                Silmek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişi PDF olarak indirin" : ""}>
                                                            <MuiMenuItem onClick={() => handleDownloadReceiptDetailsClicked(row)}>
                                                                <IconFileDownload size={18} style={{ marginRight: 8 }} />
                                                                Bu satırı indir
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
                    {/* جدول لیست آیتم‌ها */}
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
                                            <StyledTableCell><Typography variant="body1">{Number(detail.quantity).toLocaleString()}</Typography></StyledTableCell>
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

                    {/* ✅ بخش جدید: جدول خلاصه جمع‌ها بر اساس واحد */}
                    {modalDetails.length > 0 && (
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
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
                                        {Object.entries(calculateModalSummaries(modalDetails)).map(([unit, total]) => (
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
                    )}

                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} // در موبایل ستونی، در دسکتاپ ردیفی
                        spacing={2} // فاصله یکسان بین تمام دکمه‌ها
                        sx={{ width: '100%' }} // اشغال تمام عرض کادر
                    >
                        <Button
                            variant="contained"
                            color="error" // قرمز برای PDF
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }}
                            startIcon={<IconFileDownload />}
                            onClick={() => {
                                if (viewedReceipt) {
                                    handleDownloadReceiptDetailsPDF(viewedReceipt);
                                }
                            }}
                            disabled={!viewedReceipt}
                        >
                            PDF İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success" // سبز برای اکسل
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }}
                            startIcon={<IconFileDownload />}
                            onClick={() => {
                                if (viewedReceipt) {
                                    handleDownloadReceiptDetailsExcel(viewedReceipt);
                                }
                            }}
                            disabled={!viewedReceipt}
                        >
                            Excel İndir
                        </Button>
                        {/* دکمه بستن سمت راست */}
                        <Button onClick={handleCloseModal} color="secondary" variant="outlined"
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }} >
                            Kapat
                        </Button>

                    </Stack>

                </DialogActions>
            </Dialog>

            <DeleteReceiptModal
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                onDeleteSuccess={getReceipts}
                showAlert={showAlert}
            />

            {/* Modal’های دانلود */}
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
        </Box>
    );
};

export default ListReceipts;
