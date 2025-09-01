// src/views/Warehouse/listreceipt.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    // ToggleButtonGroup, ToggleButton as MuiToggleButton, 
    Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    TableSortLabel
} from '@mui/material';
import {
    //  styled,
    keyframes
} from '@mui/material/styles';
import { IconDots, IconEye, IconTrash, IconSearch, IconEdit, IconFileDownload } from '@tabler/icons-react';
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
import {
    WarehouseType,
    ReceiptItem,
    ProcessedReceiptItem,
    ReceiptType
} from './types';


// Table Style and Functions
type SortableReceiptKeys = 'code' | 'docDate' | 'warehouseId';

// const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
//     '&.Mui-selected': {
//         color: 'white',
//         ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
//         ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
//         ...(value === 'passive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
//     },
//     '&:not(.Mui-selected)': {
//         color: theme.palette.text.primary,
//         borderColor: theme.palette.divider,
//         '&:hover': { backgroundColor: theme.palette.action.hover },
//     },
// }));

const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;

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
    // const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');
    const [orderBy, setOrderBy] = useState<SortableReceiptKeys>('docDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedReceiptForMenu, setSelectedReceiptForMenu] = useState<ReceiptType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<ProcessedReceiptItem[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<number | null>(null);
    const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);
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

    const handleDownloadPdf = async (receipt: ReceiptType) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const logoImg = new Image();
        logoImg.src = logoSrc;

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(logoImg, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Fiş Detayları', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Fiş Kodu: ${receipt.code}`, pageWidth - 15, 40, { align: 'right' });
            doc.text(`Depo: ${warehousesList.find(w => w.id === receipt.warehouseId)?.name || '-'}`, pageWidth - 15, 47, { align: 'right' });
            doc.text(`Tarih: ${formatDateDisplay(receipt.docDate)}`, pageWidth - 15, 54, { align: 'right' });
        };

        const footer = () => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            const docAny = doc as any;
            const pageCount = docAny.internal.getNumberOfPages();
            doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        };

        const rows = receipt.receiptDetails.map(item => [
            item.invoiceDetail?.invoiceHeader?.invoiceNo || '-', // دسترسی اصلاح‌شده
            item.provider?.name || '-', // دسترسی اصلاح‌شده
            item.firm ? 'Şirket İçi' : 'Şirket Dışı',
            item.item.name || '-',
            item.quantity,
            item.item.unit?.title || '-',
            item.description,
        ]);

        try {
            autoTable(doc, {
                startY: 70,
                head: [['Fatura No', 'Tedarikçi', 'Firma', 'Ürün Adı', 'Miktar', 'Birim', 'Açıklama']],
                body: rows,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 10,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 50 },
                    4: { cellWidth: 15 },
                    5: { cellWidth: 15 },
                    6: { cellWidth: 'auto' },
                },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save(`Fiş_${receipt.code}.pdf`);
            showAlert('Fiş başarıyla PDF olarak indirildi.', 'success');
        } catch (error: any) {
            console.error(error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
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
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
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
        debugger
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
        debugger
        if (!validateForm() || !editingReceiptId) return;
        debugger

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
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Fiş güncellenirken bir hata oluştu.', 'error'); }
        }
    };

    // const handleEditClick = (row: ReceiptType) => {
    //     setEditingReceiptId(row.id);
    //     setCode(row.code);
    //     setDocDate(new Date(row.docDate));
    //     setWarehouse(row.warehouseId);
    //     const processedItems: ProcessedReceiptItem[] = row.receiptDetails.map(detail => ({
    //         id: Number(detail.id),
    //         item: detail.item.id,
    //         itemName: detail.item.name,
    //         // از Optional Chaining و مقدار پیش‌فرض استفاده کنید
    //         invoiceNo: detail.invoiceDetail.invoiceHeader?.invoiceNo || '-',
    //         unit: detail.item.unit,
    //         quantity: Number(detail.quantity),
    //         description: detail.description,
    //         invoiceDetailId: Number(detail.invoiceDetail.id),
    //         providerId: Number(detail.invoiceDetail.invoiceHeader?.provider?.id || 0),
    //         providerName: detail.invoiceDetail.invoiceHeader?.provider?.name || 'N/A',
    //         firm: detail.firm,
    //         recordStatus: detail.recordStatus
    //     }));
    //     setReceiptItems(processedItems.filter(item => item.recordStatus === 0));
    //     setDeletedItems(processedItems.filter(item => item.recordStatus === 1));
    //     handleCloseMenu();
    //     clearAlert();
    // };


    const handleEditClick = (row: ReceiptType) => {
        setEditingReceiptId(row.id);
        setCode(row.code);
        setDocDate(new Date(row.docDate));
        debugger
        const warehouseObject = warehousesList.find(w => Number(w.id) === Number(row.warehouse.id)) || null;
        setSelectedWarehouse(warehouseObject);

        // 👈 این خط را برای ذخیره ID انبار اضافه کنید
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
                providerName: detail.provider?.name || 'N/A',
                firm: detail.firm,
                recordStatus: detail.recordStatus
            };
        });
        setReceiptItems(processedItems.filter(item => item.recordStatus === 0));
        setDeletedItems(processedItems.filter(item => item.recordStatus === 1));
        handleCloseMenu();
        clearAlert();
    };

    const handleOpenModal = (details: ReceiptItem[]) => {
        const processedDetails: ProcessedReceiptItem[] = details.map(detail => ({
            id: Number(detail.id),
            item: detail.item.id,
            itemName: detail.item.name,
            invoiceNo: detail.invoiceDetail?.invoiceHeader?.invoiceNo || 'N/A', // دسترسی اصلاح‌شده
            unit: detail.item.unit,
            quantity: Number(detail.quantity),
            description: detail.description,
            invoiceDetailId: Number(detail.invoiceDetail?.id),
            providerId: Number(detail.provider?.id || 0), // دسترسی اصلاح‌شده
            providerName: detail.provider?.name || 'N/A', // دسترسی اصلاح‌شده
            firm: detail.firm,
            recordStatus: detail.recordStatus
        }));
        setModalDetails(processedDetails);
        setOpenModal(true);
    };
    const handleCloseModal = () => setOpenModal(false);
    // const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'passive' | null) => {
    //     if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); }
    // };
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

    const filteredReceipts = receiptsList.filter(receipt => {
        const matchesSearch = receipt.code.toLowerCase().includes(searchTerm.toLowerCase());
        // const matchesStatus =
        //     statusFilter === 'all' ||
        //     (statusFilter === 'active' && receipt.recordStatus === 0) ||
        //     (statusFilter === 'passive' && receipt.recordStatus === 1);
        return matchesSearch
        //  && matchesStatus;
    });

    const sortedAndFilteredReceipts = stableSort(filteredReceipts, getComparator(order, orderBy));
    const paginatedReceipts = sortedAndFilteredReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box>

            {(hasCreatePermission || hasEditPermission) && (
                <>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{editingReceiptId ? `Fişi Düzenle: ${code}` : "Yeni Fiş Kaydet"}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <CustomFormLabel htmlFor="warehouse-autocomplete" required>Depo</CustomFormLabel>
                                {/* <Autocomplete<WarehouseType>
                                    id="warehouse-autocomplete"
                                    options={warehousesList}
                                    getOptionLabel={(option) => option.name}
                                    value={warehousesList.find(w => w.id === warehouse) || null}
                                    onChange={(_event, newValue) => setWarehouse(newValue ? newValue.id : null)}
                                    renderInput={(params) => <TextField {...params} label="Depo Seçin" variant="outlined" size="small" />}
                                /> */}
                                <Autocomplete<WarehouseType>
                                    id="warehouse-autocomplete"
                                    options={warehousesList}
                                    getOptionLabel={(option) => option.name}
                                    value={selectedWarehouse} // استفاده از آبجکت انبار
                                    onChange={(_event, newValue) => {
                                        setSelectedWarehouse(newValue); // ست کردن آبجکت کامل
                                        // اگر لازم بود، id را هم ست کنید
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
                                            title={hasUnsavedChanges ? "Tüm alanları doldurup Fişu kaydetmek için tıklayın." : "Fiş kaydetme hazır"}
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

                    <Box sx={{ p: 2 }}>
                        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Fiş Listesi</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={8}>
                                <TextField
                                    label="Fiş Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                />
                            </Grid>
                            {/* <Grid item xs={12} sm={6} md={4}>
                                <ToggleButtonGroup
                                    value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth
                                >
                                    <StyledToggleButton value="all" aria-label="all receipts">Tümü</StyledToggleButton>
                                    <StyledToggleButton value="active" aria-label="active receipts">Aktif</StyledToggleButton>
                                    <StyledToggleButton value="passive" aria-label="passive receipts">Pasif</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid> */}
                        </Grid>
                    </Box>
                </>

            )}
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <TableContainer component={Paper}>
                <Table aria-label="receipt table">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')}
                                >
                                    <Typography variant="h6">Fiş Kodu</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'warehouseId'} direction={orderBy === 'warehouseId' ? order : 'asc'} onClick={() => handleRequestSort('warehouseId')}>
                                    <Typography variant="h6">Depo</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                    <Typography variant="h6">Tarih</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell><Typography variant="h6">Ürün Detayları</Typography></TableCell>
                            <TableCell align="right"><Typography variant="h6">İşlemler</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loadingData ? (
                            <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : (
                            paginatedReceipts.length > 0 ? (
                                paginatedReceipts.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell><Typography variant="h6">{row.code || '-'}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="h6">
                                                {row.warehouse?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
                                        <TableCell>
                                            <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.receiptDetails)}>
                                                Görünüm
                                            </Button>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined}
                                                aria-haspopup="true" aria-expanded={openMenu && selectedReceiptForMenu?.id === row.id ? 'true' : undefined}
                                                onClick={(event) => handleClickMenu(event, row)}>
                                                <IconDots size={20} />
                                            </IconButton>
                                            <Menu
                                                id="basic-menu" anchorEl={anchorEl}
                                                open={openMenu && selectedReceiptForMenu?.id === row.id}
                                                onClose={handleCloseMenu} MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                            >
                                                {hasDownloadPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişu PDF olarak indirin" : ""}>
                                                        <MenuItem onClick={() => handleDownloadPdf(row)}>
                                                            <ListItemIcon><IconFileDownload size={18} /></ListItemIcon> PDF
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişu düzenleyin" : ""}>
                                                        <MenuItem onClick={() => handleEditClick(row)}>
                                                            <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasDeletePermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Fişu silin" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenDeleteModal(row.id)}>
                                                            <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç Fiş bulunamadı.</Typography></TableCell></TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredReceipts.length}
                rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
            />
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
                <DialogTitle>Fiş Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Fatura No</TableCell>
                                    <TableCell>Tedarikçi</TableCell>
                                    <TableCell>Firma</TableCell>
                                    <TableCell>Ürün Adı</TableCell>
                                    <TableCell>Miktar</TableCell>
                                    <TableCell>Birim</TableCell>
                                    <TableCell>Açıklama</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.map((detail, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{detail.invoiceNo || '-'}</TableCell>
                                        <TableCell>{detail.providerName || '-'}</TableCell>
                                        <TableCell>{detail.firm ? 'Şirket İçi' : 'Şirket Dışı'}</TableCell>
                                        <TableCell>{detail.itemName || '-'}</TableCell>
                                        <TableCell>{detail.quantity}</TableCell>
                                        <TableCell>{detail.unit?.title || '-'}</TableCell>
                                        <TableCell>{detail.description}</TableCell>
                                    </TableRow>
                                ))}
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
        </Box>
    );
};

export default ListReceipts;