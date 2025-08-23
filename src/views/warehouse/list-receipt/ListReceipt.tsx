// src/views/Warehouse/listreceipt.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    TableSortLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
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
import logoSrc from 'src/assets/images/logos/logo.svg';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Type Definitions
interface WarehouseType {
    id: number;
    name: string;
    recordStatus: number;
    description: string;
    status: string;
    createAt: string;
}

interface UnitType {
    id: string;
    title: string;
    recordStatus: number;
    createAt: string;
}

interface ReceiptItem {
    id: number;
    item: string;
    itemName: string;
    invoiceNo: string;
    unit?: UnitType;
    quantity: number;
    description: string;
    invoiceDetailId: number;
}

interface ReceiptType {
    id: number;
    code: string;
    docDate: string;
    warehouseId: number;
    recordStatus: number;
    createAt: string;
    receiptDetails: ReceiptItem[];
}

// Table Style and Functions
type SortableReceiptKeys = 'code' | 'docDate' | 'warehouseId';

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'passive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
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
    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [warehouse, setWarehouse] = useState<number | null>(null);
    const [code, setCode] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [receiptsList, setReceiptsList] = useState<ReceiptType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');
    const [orderBy, setOrderBy] = useState<SortableReceiptKeys>('docDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedReceiptForMenu, setSelectedReceiptForMenu] = useState<ReceiptType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<ReceiptItem[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<number | null>(null);
    const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
    const { isTooltipGloballyEnabled } = useTooltip();

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
        const pdfContent = document.createElement('div');
        pdfContent.style.padding = '20px';
        pdfContent.style.fontFamily = 'Arial, sans-serif';
        pdfContent.style.fontSize = '12px';

        // PDF başlık bölümü güncellendi
        const header = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div style="width: 100px;">
                <img src="${logoSrc}" alt="Şirket Logosu" style="width: 100%; height: auto;"/>
            </div>
            <div style="text-align: right;">
                <h3 style="margin: 0;">Makbuz Detayları</h3>
                <p style="margin: 5px 0;"><strong>Makbuz Kodu:</strong> ${receipt.code}</p>
                <p style="margin: 5px 0;"><strong>Depo:</strong> ${warehousesList.find(w => w.id === receipt.warehouseId)?.name || '-'}</p>
                <p style="margin: 5px 0;"><strong>Tarih:</strong> ${formatDateDisplay(receipt.docDate)}</p>
            </div>
        </div>
    `;

        // Tablo başlıkları ve içeriği
        const itemsTable = document.createElement('table');
        itemsTable.style.width = '100%';
        itemsTable.style.borderCollapse = 'collapse';
        itemsTable.innerHTML = `
        <thead>
            <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ürün Adı</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Miktar</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Birim</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Açıklama</th>
            </tr>
        </thead>
        <tbody>
            ${receipt.receiptDetails.map(item => `
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.itemName || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.unit?.title || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${item.description}</td>
                </tr>
            `).join('')}
        </tbody>
    `;

        // PDF footer bölümü
        const footer = `
        <div style="border-top: 1px solid black; margin-top: 50px; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="text-align: left;">
                <strong>Tarih:</strong> ${format(new Date(), 'dd MMMM yyyy', { locale: tr })}
            </div>
            <div style="text-align: right;">
                <strong>İmza</strong>
                <div style="width: 150px; border-top: 1px solid black; margin-top: 20px;"></div>
            </div>
        </div>
    `;

        // محتوا را به کانتینر موقت اضافه کنید
        pdfContent.innerHTML = header;
        pdfContent.appendChild(itemsTable);
        const footerDiv = document.createElement('div');
        footerDiv.innerHTML = footer;
        pdfContent.appendChild(footerDiv);

        document.body.appendChild(pdfContent);
        const canvas = await html2canvas(pdfContent, {
            scale: 2,
            useCORS: true,
        });
        document.body.removeChild(pdfContent);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`Makbuz_${receipt.code}.pdf`);
        showAlert('Makbuz başarıyla PDF olarak indirildi.', 'success');
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
            } else { showAlert(response.data.message || 'Makbuzlar yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert('Makbuzlar yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    useEffect(() => {
        getReceipts();
        fetchWarehouses();
    }, []);

    const handleAddReceiptItem = (newItem: ReceiptItem) => {
        setReceiptItems(prevItems => [...prevItems, newItem]);
    };

    const handleUpdateReceiptItem = (updatedItem: ReceiptItem) => {
        setReceiptItems(prevItems =>
            prevItems.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            )
        );
    };

    const handleRemoveReceiptItem = (id: number) => {
        setReceiptItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    const validateForm = (): boolean => {
        if (!code || !docDate || !warehouse) {
            showAlert('Lütfen tüm zorunlu alanları (Kod, Depo, Tarih) doldurun.', 'warning');
            return false;
        }
        if (receiptItems.length === 0 || receiptItems.some(item => !item.item || item.quantity <= 0 || isNaN(item.quantity) || !item.invoiceDetailId)) {
            showAlert('Lütfen en az bir ürün ekleyin ve tüm ürün alanlarını doğru şekilde doldurun.', 'warning');
            return false;
        }
        return true;
    };

    const resetForm = () => {
        setCode('');
        setWarehouse(null);
        setDocDate(new Date());
        setReceiptItems([]);
        setEditingReceiptId(null);
        clearAlert();
    };

    const handleSaveReceipt = async () => {
        if (!validateForm()) return;

        const receiptData = {
            code: code,
            docDate: docDate?.toISOString(),
            warehouseId: Number(warehouse),
            receiptDetails: receiptItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                description: item.description,
                invoiceDetailId: Number(item.invoiceDetailId)
            }))
        };

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.post(
                server.baseurl + server.warehouse + "create-receipt", receiptData,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                resetForm();
                getReceipts();
                showAlert('Makbuz başarıyla kaydedildi!', 'success');
            } else { showAlert(response.data.message || 'Makbuz kaydedilirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Makbuz kaydedilirken bir hata oluştu.', 'error'); }
        }
    };

    // Yeni eklenen güncelleme fonksiyonu
    const handleUpdateReceipt = async () => {
        if (!validateForm() || !editingReceiptId) return;

        const receiptData = {
            id: editingReceiptId,
            code: code,
            docDate: docDate?.toISOString(),
            warehouseId: Number(warehouse),
            receiptDetails: receiptItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                description: item.description,
                invoiceDetailId: Number(item.invoiceDetailId)
            }))
        };

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-receipt", receiptData,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Makbuz başarıyla güncellendi!', 'success');
                resetForm();
                getReceipts();
            } else { showAlert(response.data.message || 'Makbuz güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Makbuz güncellenirken bir hata oluştu.', 'error'); }
        }
    };

    const handleEditClick = (row: ReceiptType) => {
        setEditingReceiptId(row.id);
        setCode(row.code);
        setDocDate(new Date(row.docDate));
        setWarehouse(row.warehouseId);

        // Burası için ReceiptItemsTable'dan gelen itemName ve invoiceNo verisine ihtiyacınız olacak.
        // O yüzden bu veriyi API'den alıp map'lemeniz gerekmektedir.
        // Şimdilik sadece var olan verileri set ediyoruz.
        setReceiptItems(row.receiptDetails);

        handleCloseMenu();
        clearAlert();
    };

    const handleOpenModal = (details: ReceiptItem[]) => {
        setModalDetails(details);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
    };

    const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'passive' | null) => {
        if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); }
    };
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

    const filteredReceipts = receiptsList.filter(receipt => {
        const matchesSearch = receipt.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && receipt.recordStatus === 0) ||
            (statusFilter === 'passive' && receipt.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });

    const sortedAndFilteredReceipts = stableSort(filteredReceipts, getComparator(order, orderBy));
    const paginatedReceipts = sortedAndFilteredReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" mb={2}>Makbuz Detayları</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <CustomFormLabel htmlFor="code-input" required>Makbuz Kodu</CustomFormLabel>
                        <TextField id="code-input" label="Kod Girin" variant="outlined" size="small" fullWidth value={code} onChange={(e) => setCode(e.target.value)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <CustomFormLabel htmlFor="warehouse-autocomplete" required>Depo</CustomFormLabel>
                        <Autocomplete<WarehouseType>
                            id="warehouse-autocomplete"
                            options={warehousesList}
                            getOptionLabel={(option) => option.name}
                            value={warehousesList.find(w => w.id === warehouse) || null}
                            onChange={(_event, newValue) => setWarehouse(newValue ? newValue.id : null)}
                            renderInput={(params) => <TextField {...params} label="Depo Seçin" variant="outlined" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
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
                    onAddItem={handleAddReceiptItem}
                    onRemoveItem={handleRemoveReceiptItem}
                    onUpdateItem={handleUpdateReceiptItem}
                    showAlert={showAlert}
                />

                <Box mt={3} textAlign="right">
                    {editingReceiptId ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button variant="contained" color="info" onClick={handleUpdateReceipt}>Güncelle</Button>
                            <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                        </Stack>
                    ) : (
                        <Button variant="contained" color="primary" onClick={handleSaveReceipt}>Makbuzu Kaydet</Button>
                    )}
                </Box>
            </Paper>

            <Box sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Makbuz Listesi</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            label="Makbuz Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <ToggleButtonGroup
                            value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth
                        >
                            <StyledToggleButton value="all" aria-label="all receipts">Tümü</StyledToggleButton>
                            <StyledToggleButton value="active" aria-label="active receipts">Aktif</StyledToggleButton>
                            <StyledToggleButton value="passive" aria-label="passive receipts">Pasif</StyledToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>
            </Box>

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
                                    active={orderBy === 'code'}
                                    direction={orderBy === 'code' ? order : 'asc'}
                                    onClick={() => handleRequestSort('code')}
                                >
                                    <Typography variant="h6">Makbuz Kodu</Typography>
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
                                                {warehousesList.find(w => w.id === row.warehouseId)?.name || '-'}
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

                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu makbuzu PDF olarak indirin" : ""}>
                                                    <MenuItem onClick={() => handleDownloadPdf(row)}>
                                                        <ListItemIcon><IconFileDownload size={18} /></ListItemIcon> PDF
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu makbuzu düzenleyin" : ""}>
                                                    <MenuItem onClick={() => handleEditClick(row)}>
                                                        <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu makbuzu silin" : ""}>
                                                    <MenuItem onClick={() => handleClickOpenDeleteModal(row.id)}>
                                                        <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                    </MenuItem>
                                                </CustomTooltip>
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç makbuz bulunamadı.</Typography></TableCell></TableRow>
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
                <DialogTitle>Makbuz Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ürün Adı</TableCell>
                                    <TableCell>Miktar</TableCell>
                                    <TableCell>Birim</TableCell>
                                    <TableCell>Açıklama</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.map((detail, index) => (
                                    <TableRow key={index}>
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