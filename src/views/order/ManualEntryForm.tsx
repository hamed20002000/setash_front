import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { IconDots, IconEye, IconEdit, IconTrash, IconSearch, IconCheck, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import axios from 'axios';
import server from '../../assets/address.json';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import OrderItemsTable from './OrderItemsTable';
import DeleteOrderModal from './DeleteOrderModal';

// Type Definitions
interface Work { id: string; title: string; startDate: string; endDate: string; createAt: string; recordStatus: number; }
interface Network { id: string; createAt: string; recordStatus: number; title: string; description: string; work: Work; }
interface UnitType { id: string; title: string; recordStatus: number; createAt: string; }
interface ItemType { id: string; name: string; description: string; abbreviation: string; recordStatus: number; weight: number | null; createAt: string; unit: UnitType; status: string; }
interface OrderItem {
    id: number;
    item: string;
    quantity: number;
    description: string;
    isEditing: boolean;
    unit?: UnitType;
    isRegistered?: boolean;
    price: number;
}
interface OrderType { id: number; network: { id: string; title: string; }; docDate: string; status: number; orderDetails: OrderDetailType[]; }
interface OrderDetailType {
    id: number;
    item: { id: string; name: string; unit: { title: string; }; };
    quantity: number;
    description: string;
    price: number
}

// Table Style and Functions
type SortableOrderKeys = 'network.title' | 'docDate' | 'status';

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'pending' && selected && { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } }),
        ...(value === 'approved' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'rejected' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableOrderKeys): (a: OrderType, b: OrderType) => number => {
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

const ManualEntryForm = () => {
    const navigate = useNavigate();
    const [network, setNetwork] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [orderItems, setOrderItems] = useState<OrderItem[]>([{ id: Date.now(), item: '', quantity: 0, description: '', price: 0, isEditing: true }]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
    const [selectedWork, setSelectedWork] = useState<Work | null>(null);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [networkError, setNetworkError] = useState(false);
    const [docDateError, setDocDateError] = useState(false);
    const [orderItemsError, setOrderItemsError] = useState(false);

    // Table States
    const [ordersList, setOrdersList] = useState<OrderType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [orderBy, setOrderBy] = useState<SortableOrderKeys>('docDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderForMenu, setSelectedOrderForMenu] = useState<OrderType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<OrderDetailType[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState<number | null>(null);
    const [orderTitleToDelete, setOrderTitleToDelete] = useState<string>('');
    const [editingId, setEditingId] = useState<number | null>(null);


    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState<1 | 2 | null>(null);
    const [description, setDescription] = useState('');
    const [statusError, setStatusError] = useState(false);
    const [idRow, setIdRow] = useState(0);


    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return format(date, 'dd MMMM yyyy', { locale: tr });
        } catch (e) {
            console.log("Tarih biçimlendirilirken hata oluştu:", e);
            return "Geçersiz Tarih";
        }
    };

    const handleItemChange = (id: number, field: string, value: any) => {
        const updatedOrderItems = orderItems.map(item => {
            if (item.id === id) {
                if (field === 'item') {
                    const selectedItem = itemsList.find(i => i.id === value);

                    return {
                        ...item,
                        item: value,
                        quantity: selectedItem?.weight || 0,
                        unit: selectedItem?.unit,
                        description: '',
                        isRegistered: !!selectedItem
                    };
                } else {
                    return { ...item, [field]: value };
                }
            }
            return item;
        });
        setOrderItems(updatedOrderItems);
    };

    const selectedItemIds = orderItems
        .filter(item => !item.isEditing)
        .map(item => item.item);
    const availableItemsList = itemsList.filter(item => !selectedItemIds.includes(item.id));

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

    const getNetworks = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const result = await axios.request({ baseURL: server.baseurl + server.initialoperations + "get-networks", method: "get", headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const activeNetworks = result.data.data.filter((net: Network) => net.recordStatus === 0);
                setNetworks(activeNetworks);
            }
            else { showAlert(result.data.message || 'Şebeke listesi alınamadı.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Şebeke listesi alınırken bir hata oluştu.', 'error'); }
        }
    };

    const getListItem = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
            if (response.data && response.data.success) {
                const activeItems = response.data.data.filter((item: ItemType) => item.recordStatus === 0);
                setItemsList(activeItems);
            }
            else { showAlert('Ürünler yüklenmedi.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Ürünler sunucudan alınamadı', 'error'); }
        }
    };

    const getListOrders = async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-orders", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setOrdersList(response.data.data as OrderType[]);
            } else { showAlert(response.data.message || 'Siparişler yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert('Siparişler yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    };

    useEffect(() => {
        getNetworks();
        getListItem();
        getListOrders();
    }, []);

    const handleAddItem = () => {
        setOrderItems(prevItems => prevItems.map(item => ({ ...item, isEditing: false })));
        setOrderItems(prevItems => [...prevItems, { id: Date.now(), item: '', quantity: 0, description: '', price: 0, isEditing: true }]);
    };
    const handleRemoveItem = (id: number) => { setOrderItems(prevItems => prevItems.filter(item => item.id !== id)); };
    const handleToggleEdit = (id: number) => { setOrderItems(prevItems => prevItems.map(item => ({ ...item, isEditing: item.id === id ? !item.isEditing : false }))); };

    const validateForm = (): boolean => {
        let isValid = true;
        if (!network) { setNetworkError(true); isValid = false; } else { setNetworkError(false); }
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }
        const hasEmptyItem = orderItems.some(item => !item.item || item.quantity <= 0 || !item.description);
        if (orderItems.length === 0 || hasEmptyItem) { setOrderItemsError(true); isValid = false; } else { setOrderItemsError(false); }
        if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return isValid;
    };

    const resetForm = () => {
        setNetwork('');
        setDocDate(new Date());
        setOrderItems([{ id: Date.now(), item: '', quantity: 0, description: '', price: 0, isEditing: true }]);
        setSelectedWork(null);
        setEditingId(null);
        setNetworkError(false);
        setDocDateError(false);
        setOrderItemsError(false);
    };

    const handleSaveOrder = async () => {
        debugger
        if (!validateForm()) return;
        const orderData = {
            docDate: docDate?.toISOString(),
            networkId: Number(network),
            status: 0,
            orderDetails: orderItems.map(item => ({
                itemId: Number(item.item),
                quantity: parseFloat(String((item.quantity).toFixed(2))),
                price: (item.price).toFixed(2),
                description: item.description
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-order", orderData,
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Sipariş başarıyla kaydedildi!', 'success');
                resetForm();
                getListOrders();
            } else { showAlert(response.data.message || 'Sipariş kaydedilirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Sipariş kaydedilirken bir hata oluştu.', 'error'); }
        }
    };

    const handleUpdateOrder = async () => {
        if (!validateForm() || !editingId) return;
        const orderData = {
            id: Number(editingId),
            docDate: docDate?.toISOString(),
            networkId: Number(network),
            orderDetails: orderItems.map(item => ({
                itemId: Number(item.item),
                quantity: parseFloat(String(item.quantity)),
                price: (item.price).toFixed(2),
                description: item.description
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-order", orderData,
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Sipariş başarıyla güncellendi!', 'success');
                resetForm();
                getListOrders();
            } else { showAlert(response.data.message || 'Sipariş güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Sipariş güncellenirken bir hata oluştu.', 'error'); }
        }
    };


    const handleEditClick = (row: OrderType) => {
        setEditingId(row.id);
        const selectedNetwork = networks.find(net => net.title === row.network.title);
        if (selectedNetwork) {
            setNetwork(selectedNetwork.id);
            setSelectedWork(selectedNetwork.work);
        }
        setDocDate(new Date(row.docDate));
        const itemsToEdit: OrderItem[] = row.orderDetails.map(detail => {
            const fullItem = itemsList.find(item => item.id === detail.item.id);
            return {
                id: detail.id,
                item: fullItem ? fullItem.id : '',
                quantity: detail.quantity,
                description: detail.description,
                price: detail.price,
                isEditing: false, // ✅ حتماً این را روی true تنظیم کنید تا ویرایش شود
                unit: fullItem ? fullItem.unit : undefined,
                isRegistered: true,
            };
        });
        setOrderItems(itemsToEdit);
        handleCloseMenu();
        clearAlert();
    };
    // Table Handlers
    const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'pending' | 'approved' | 'rejected' | null) => {
        if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); }
    };
    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10)); setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value); setPage(0);
    };
    const handleRequestSort = (property: SortableOrderKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    };
    const handleOpenModal = (details: OrderDetailType[]) => {
        setModalDetails(details); setOpenModal(true);
    };
    const handleCloseModal = () => { setOpenModal(false); };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: OrderType) => {
        setAnchorEl(event.currentTarget);
        setSelectedOrderForMenu(row);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedOrderForMenu(null); };
    // const handleAction = async (action: 'approve' | 'reject' | 'edit' | 'delete') => {
    //     alert(`Sipariş #${selectedOrderForMenu?.id} için "${action}" işlemi yapıldı.`);
    //     handleCloseMenu();
    // };
    const handleClickOpenDeleteModal = (id: number, title: string) => {
        setOrderIdToDelete(id); setOrderTitleToDelete(title); setOpenDeleteModal(true); handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false); setOrderIdToDelete(null); setOrderTitleToDelete('');
    };
    const stripHtml = (htmlString: string): string => {
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        return doc.body.textContent || "";
    };
    const handleOpenRegisterModal = (_item: { name: string; unit: string; }) => {
        // console.log(item)
    };
    const handleClickOpenStatusModal = (id: number, action: 'approve' | 'reject') => {
        setStatusToUpdate(action === 'approve' ? 1 : 2);
        // setSelectedOrderForMenu(ordersList.find(o => o.id === id) || null); 
        setIdRow(id)
        setDescription('');
        setOpenStatusModal(true);
        handleCloseMenu();
    };

    const handleCloseStatusModal = () => {
        setOpenStatusModal(false);
        setStatusToUpdate(null);
        setDescription('');
        setStatusError(false);
    };

    const handleUpdateStatus = async () => {
        if (!description.trim()) {
            setStatusError(true);
            showAlert('Lütfen bir açıklama giriniz.', 'warning');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        debugger
        try {
            const payload = {
                id: Number(idRow),
                status: statusToUpdate,
                description: description.trim()
            };

            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-order-status",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Sipariş durumu başarıyla güncellendi!', 'success');
                getListOrders(); // Sipariş listesini güncelle
            } else {
                showAlert(response.data.message || 'Sipariş durumu güncellenirken bir hata oluştu.', 'error');
            }

        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Sipariş durumu güncellenirken bir hata oluştu.', 'error');
            }
        } finally {
            handleCloseStatusModal();

            getListOrders();
        }
    };

    // Table filtering and sorting
    const filteredOrders = ordersList.filter(order => {
        const matchesSearch = order.network.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'pending' && order.status === 0) ||
            (statusFilter === 'approved' && order.status === 1) ||
            (statusFilter === 'rejected' && order.status === 2);
        return matchesSearch && matchesStatus;
    });

    const sortedAndFilteredOrders = stableSort(filteredOrders, getComparator(order, orderBy));
    const paginatedOrders = sortedAndFilteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box>
            {/* Alert Box */}
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}

            {/* Registration Form */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" mb={2}>Sipariş Detayları</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <CustomFormLabel htmlFor="network-autocomplete" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
                            Şebeke
                        </CustomFormLabel>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Autocomplete<Network>
                                id="network-autocomplete" options={networks} getOptionLabel={(option) => option.title}
                                value={networks.find(net => net.id === network) || null}
                                onChange={(_event, newValue) => {
                                    setNetwork(newValue ? newValue.id : ''); setSelectedWork(newValue ? newValue.work : null);
                                    if (networkError && newValue) setNetworkError(false);
                                }} renderInput={(params) => (
                                    <TextField {...params} label="Şebeke Seçin" variant="outlined" fullWidth error={networkError} helperText={networkError ? "Bu alan zorunludur!" : ""}
                                    />
                                )} sx={{ flexGrow: 1 }}
                            />
                            {selectedWork && (<Chip label={selectedWork.title} color="primary" variant="outlined" />)}
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <CustomFormLabel htmlFor="doc-date" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
                                Tarihi
                            </CustomFormLabel>
                            <DatePicker
                                value={docDate}
                                onChange={(newValue) => {
                                    setDocDate(newValue);
                                    if (docDateError && newValue)
                                        setDocDateError(false);
                                }}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField {...params}
                                        fullWidth error={docDateError}
                                        helperText={docDateError ? "Bu alan zorunludur!" : ""} />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>
                </Grid>
                <Typography variant="h6" mb={2} sx={{ mt: 3 }}>Ürün Detayları</Typography>
                <OrderItemsTable
                    items={orderItems} itemsList={itemsList} onItemChange={handleItemChange} onAddItem={handleAddItem}
                    onRemoveItem={handleRemoveItem} onToggleEdit={handleToggleEdit} availableItemsList={availableItemsList}
                    onOpenRegisterModal={handleOpenRegisterModal}
                />
                {orderItemsError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>Sipariş en az bir ürün içermeli ve tüm ürün alanları dolu olmalıdır!</Typography>
                )}
                <Box mt={3} textAlign="right">
                    {editingId ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button variant="contained" color="info" onClick={handleUpdateOrder}>Düzenle</Button>
                            <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                        </Stack>
                    ) : (
                        <Button variant="contained" color="primary" onClick={handleSaveOrder}>Siparişi Kaydet</Button>
                    )}
                </Box>
            </Paper>

            {/* Orders Table */}
            <Box sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Sipariş Listesi</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            label="Sipariş Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <ToggleButtonGroup
                            value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth
                        >
                            <StyledToggleButton value="all" aria-label="all orders">Tümü</StyledToggleButton>
                            <StyledToggleButton value="pending" aria-label="pending orders">Beklemede</StyledToggleButton>
                            <StyledToggleButton value="approved" aria-label="approved orders">Onaylandı</StyledToggleButton>
                            <StyledToggleButton value="rejected" aria-label="rejected orders">Reddedildi</StyledToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>
            </Box>

            <TableContainer component={Paper}>
                <Table aria-label="order table">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'network.title'} direction={orderBy === 'network.title' ? order : 'asc'} onClick={() => handleRequestSort('network.title')}>
                                    <Typography variant="h6">Şebeke Adı</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                    <Typography variant="h6">Tarih</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleRequestSort('status')}>
                                    <Typography variant="h6">Durum</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell><Typography variant="h6">Ürün Detayları</Typography></TableCell>
                            <TableCell align="right"><Typography variant="h6">İşlemler</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loadingData ? (
                            <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : (
                            paginatedOrders.length > 0 ? (
                                paginatedOrders.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell><Typography variant="h6">{row.network.title}</Typography></TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                {row.status === 0 && <HourglassEmptyIcon sx={{ color: 'orange' }} fontSize="small" />}
                                                {row.status === 1 && <CheckCircleOutlineIcon color="success" fontSize="small" />}
                                                {row.status === 2 && <HighlightOffIcon color="error" fontSize="small" />}
                                                <Typography variant="h6">{row.status === 0 ? "Beklemede" : row.status === 0 ? "Onaylandı" : "Reddedildi"}</Typography>
                                            </Stack>

                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.orderDetails)}>
                                                Görünüm
                                            </Button>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined}
                                                aria-haspopup="true" aria-expanded={openMenu && selectedOrderForMenu?.id === row.id ? 'true' : undefined}
                                                onClick={(event) => handleClickMenu(event, row)}>
                                                <IconDots size={20} />
                                            </IconButton>
                                            <Menu id="basic-menu" anchorEl={anchorEl} open={openMenu && selectedOrderForMenu?.id === row.id} onClose={handleCloseMenu}
                                                MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}>

                                                {selectedOrderForMenu?.status === 0 && (
                                                    <>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                            <ListItemIcon><IconCheck size={18} /></ListItemIcon>
                                                            Onayla
                                                        </MenuItem>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                            <ListItemIcon><IconX size={18} /></ListItemIcon>
                                                            Reddet
                                                        </MenuItem>
                                                    </>
                                                )}

                                                {/* If status is 1, show "Reddet" (Reject) */}
                                                {selectedOrderForMenu?.status === 1 && (
                                                    <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                        <ListItemIcon><IconX size={18} /></ListItemIcon>
                                                        Reddet
                                                    </MenuItem>
                                                )}

                                                {/* If status is 2, show "Onayla" (Approve) */}
                                                {selectedOrderForMenu?.status === 2 && (
                                                    <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                        <ListItemIcon><IconCheck size={18} /></ListItemIcon>
                                                        Onayla
                                                    </MenuItem>
                                                )}
                                                <MenuItem onClick={() => handleEditClick(row)}><ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle</MenuItem>
                                                <MenuItem onClick={() => handleClickOpenDeleteModal(row.id, row.network.title)}><ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek</MenuItem>
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç sipariş bulunamadı.</Typography></TableCell></TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredOrders.length}
                rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
            />

            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
                <DialogTitle>Ürün Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ürün Adı</TableCell>
                                    <TableCell>Miktar</TableCell>
                                    <TableCell>Birim</TableCell>
                                    <TableCell>Açıklama</TableCell>
                                    <TableCell>Fiyat</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.map((detail, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{detail.item.name}</TableCell>
                                        <TableCell>{detail.quantity}</TableCell>
                                        <TableCell>{detail.item.unit.title}</TableCell>
                                        <TableCell> <Typography>{stripHtml(detail.description)}</Typography></TableCell>
                                        <TableCell>{detail.price}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openStatusModal} onClose={handleCloseStatusModal} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {statusToUpdate === 1 ? 'Onaylama Açıklaması' : 'Reddetme Açıklaması'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Açıklama"
                        type="text"
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            if (statusError) setStatusError(false);
                        }}
                        error={statusError}
                        helperText={statusError && 'Bu alan zorunludur.'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusModal} color="secondary">
                        İptal
                    </Button>
                    <Button onClick={handleUpdateStatus} color="primary">
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>

            <DeleteOrderModal
                openModal={openDeleteModal} onClose={handleClickCloseDeleteModal}
                orderIdToDelete={orderIdToDelete} orderTitleToDelete={orderTitleToDelete}
                onDeleteSuccess={getListOrders} showAlert={showAlert}
            />
        </Box>
    );
};

export default ManualEntryForm;