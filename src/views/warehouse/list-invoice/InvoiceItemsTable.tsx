import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Box, Typography, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Button, Chip, Stack, Tabs, Tab
} from '@mui/material';
import { IconPlus, IconTrash, IconEdit, IconEye } from '@tabler/icons-react';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import axios from 'axios';
import server from 'src/assets/address.json';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Type Definitions
interface UnitType {
    id: string;
    title: string;
    recordStatus: number;
    createAt: string;
}

interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    recordStatus: number;
    unit: UnitType;
}

interface OrderDetailType {
    id: string;
    quantity: string;
    price: string;
    createAt: string;
    recordStatus: number;
    description: string;
    item: ItemType;
}

interface OrderType {
    id: string;
    docDate: string;
    recordStatus: number;
    createAt: string;
    status: number;
    orderDetails: OrderDetailType[];
    network?: { title: string } | null;
}

interface ProviderType {
    id: number;
    name: string;
    firm: string;
    recordStatus: number;
}

interface InvoiceItem {
    id: number;
    item: string;
    unit?: UnitType;
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    description: string;
    orderDetailId?: string | null;
    providerId?: number;
    firm?: boolean;
}

interface InvoiceItemsTableProps {
    items: InvoiceItem[];
    itemsList: ItemType[];
    onAddItem: (newItem: InvoiceItem) => void;
    onRemoveItem: (id: number) => void;
    onUpdateItem: (updatedItem: InvoiceItem) => void;
    providersList: ProviderType[]; // New prop
}

const stripHtml = (htmlString: string) => {
    if (!htmlString) return "";
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

interface InvoiceItemFormState {
    item: string;
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    description: string;
    unit?: UnitType;
    orderDetailId?: string | null;
    provider: ProviderType | null; // Added
}

const initialFormState: InvoiceItemFormState = {
    item: '',
    quantity: 0,
    price: 0,
    discountPercent: 0,
    discountAmount: 0,
    description: '',
    unit: undefined,
    orderDetailId: null,
    provider: null
};

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
    items,
    itemsList,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    providersList
}) => {
    const [openModal, setOpenModal] = useState(false);
    const [modalContent, setModalContent] = useState('');
    const [newItemForm, setNewItemForm] = useState(initialFormState);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [tabValue, setTabValue] = useState<'without-order' | 'with-order'>('without-order');

    const [ordersList, setOrdersList] = useState<OrderType[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
    const [orderDetailItems, setOrderDetailItems] = useState<ItemType[]>([]);
    // const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
    const [openOrderDetailsModal, setOpenOrderDetailsModal] = useState(false);

    const { isTooltipGloballyEnabled } = useTooltip();

    useEffect(() => {
        const getListOrders = async () => {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) return;
            try {
                const response = await axios.get(server.baseurl + server.initialoperations + "get-orders", { headers: { "Authorization": `Bearer ${authToken}` } });
                if (response.data.httpStatusCode === 200) {
                    const activeOrders = response.data.data.filter((order: OrderType) => order.status === 1);
                    setOrdersList(activeOrders);
                } else {
                    console.error('Siparişler yüklenirken bir hata oluştu:', response.data.message);
                }
            } catch (e: any) {
                console.error('Siparişler yüklenirken bir hata oluştu:', e);
            }
        };
        getListOrders();
    }, []);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: 'without-order' | 'with-order') => {
        setTabValue(newValue);
        resetForm();
    };

    const handleFormChange = (field: keyof InvoiceItemFormState, value: any) => {
        setNewItemForm(prevForm => {
            let updatedValue = value;
            if (['quantity', 'price', 'discountPercent', 'discountAmount'].includes(field)) {
                updatedValue = value === '' ? 0 : Number(value);
            }
            const updatedForm = { ...prevForm, [field]: updatedValue };
            if (field === 'item') {
                const sourceList = tabValue === 'with-order' ? orderDetailItems : itemsList;
                const selectedItem = sourceList.find(i => i.id === value);
                updatedForm.unit = selectedItem?.unit;
            }
            return updatedForm;
        });
    };


    const handleEditClick = (item: InvoiceItem) => {
        setEditingItem(item);
        const selectedProvider = providersList.find(p => p.id === item.providerId) || null;

        // تابع کمکی برای پاکسازی و تبدیل به عدد
        const cleanAndConvertNumber = (value: string | number | undefined): number => {
            if (typeof value === 'string') {
                const cleanedString = value.replace(/[^\d.-]/g, ''); // حذف همه کاراکترها به جز اعداد، نقطه و خط تیره
                const numberValue = parseFloat(cleanedString); // تبدیل به عدد اعشاری
                return isNaN(numberValue) ? 0 : numberValue; // اگر NaN بود، 0 برگردان
            }
            return value ?? 0;
        };

        setNewItemForm({
            item: item.item,
            quantity: cleanAndConvertNumber(item.quantity),
            price: cleanAndConvertNumber(item.price),
            discountPercent: cleanAndConvertNumber(item.discountPercent),
            discountAmount: cleanAndConvertNumber(item.discountAmount), // این خط اصلاح شده است
            description: item.description,
            unit: item.unit,
            orderDetailId: item.orderDetailId,
            provider: selectedProvider,
        });

        // ...بقیه کد
    };
    const resetForm = () => {
        setEditingItem(null);
        setNewItemForm(initialFormState);
        setSelectedOrder(null);
        setOrderDetailItems([]);
        // setOrderDetailId(null);
    };
    const handleAddUpdateItem = () => {
        const itemToAdd: InvoiceItem = {
            id: editingItem ? editingItem.id : Date.now(),
            item: newItemForm.item,
            quantity: Number(newItemForm.quantity),
            price: Number(newItemForm.price),
            discountPercent: Number(newItemForm.discountPercent),
            discountAmount: Number(newItemForm.discountAmount),
            description: newItemForm.description,
            unit: newItemForm.unit,
            // **این خط را اصلاح کنید:**
            orderDetailId: newItemForm.orderDetailId,
            providerId: newItemForm.provider?.id,
            firm: newItemForm.provider?.firm === '1',
        };
        debugger
        if (editingItem) {
            onUpdateItem(itemToAdd);
        } else {
            onAddItem(itemToAdd);
        }
        resetForm();
    };
    const handleOpenModal = (content: string) => {
        setModalContent(stripHtml(content));
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setModalContent('');
    };

    const handleOrderChange = (_event: any, newValue: OrderType | null) => {
        // Sadece siparişle ilgili alanları sıfırlıyoruz.
        setSelectedOrder(newValue);
        // setOrderDetailId(null);
        setOrderDetailItems([]);
        setNewItemForm(prevForm => ({
            ...initialFormState,
            provider: prevForm.provider // En önemli değişiklik: provider bilgisini koruyoruz
        }));

        if (newValue) {
            const itemsFromOrder = newValue.orderDetails.map(d => d.item);
            setOrderDetailItems(itemsFromOrder);
        }
    };

    const handleOrderDetailItemChange = (_event: any, newValue: ItemType | null) => {
        if (newValue && selectedOrder) {
            const orderDetail = selectedOrder.orderDetails.find(d => d.item.id === newValue.id);
            if (orderDetail) {
                // setOrderDetailId(orderDetail.id);
                setNewItemForm(prevForm => ({
                    ...prevForm, // Mevcut formu koruyoruz
                    item: newValue.id,
                    quantity: Number(orderDetail.quantity),
                    price: Number(orderDetail.price ? orderDetail.price.replace(/[^\d.-]/g, '') : 0),
                    description: orderDetail.description,
                    unit: newValue.unit,
                }));
            }
        } else {
            // setOrderDetailId(null);
            setNewItemForm(prevForm => ({
                ...initialFormState,
                provider: prevForm.provider // provider bilgisini burada da koruyoruz
            }));
        }
    };

    const handleItemChangeWithoutOrder = (_event: any, newValue: ItemType | null) => {
        if (newValue) {
            setNewItemForm({
                ...initialFormState,
                item: newValue.id,
                unit: newValue.unit,
                provider: newItemForm.provider,
            });
        } else {
            setNewItemForm(initialFormState);
        }
    };
    const handleProviderChange = (_event: any, newValue: ProviderType | null) => {
        setNewItemForm(prev => ({
            ...prev,
            provider: newValue
        }));
    };

    const handleOpenOrderDetailsModal = () => {
        setOpenOrderDetailsModal(true);
    };

    const handleCloseOrderDetailsModal = () => {
        setOpenOrderDetailsModal(false);
    };


    const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
        if (priceInput === null || priceInput === undefined) {
            return '₺0.00';
        }
        const cleanedString = String(priceInput).replace(/[$,]/g, '');
        const numericValue = parseFloat(cleanedString);
        if (isNaN(numericValue)) {
            return '₺0.00';
        }
        const formattedPrice = numericValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return formattedPrice.replace('$', '₺');
    };

    const availableItems = useMemo(() => {
        if (tabValue === 'with-order' && selectedOrder) {
            const addedItemIds = new Set(items.map(i => i.item));
            return orderDetailItems.filter(item => !addedItemIds.has(item.id) || item.id === newItemForm.item);
        }
        return itemsList.filter(item =>
            !items.some(invoiceItem => invoiceItem.item === item.id) || item.id === newItemForm.item
        );
    }, [tabValue, orderDetailItems, itemsList, items, newItemForm.item, selectedOrder]);

    const isFormValid = tabValue === 'with-order'
        ? !!selectedOrder && !!newItemForm.item && newItemForm.quantity > 0 && newItemForm.price > 0 && !!newItemForm.provider
        : !!newItemForm.item && newItemForm.quantity > 0 && newItemForm.price > 0 && !!newItemForm.provider;


    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Siparişsiz Kayıt" value="without-order" />
                <Tab label="Siparişle Kayıt" value="with-order" />
            </Tabs>
            <Typography variant="h6" gutterBottom>{editingItem ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="provider-autocomplete-item" required>Tedarikçi</CustomFormLabel>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Autocomplete<ProviderType>
                            id="provider-autocomplete-item"
                            options={providersList}
                            getOptionLabel={(option) => option.name}
                            value={newItemForm.provider}
                            onChange={handleProviderChange}
                            sx={{ flexGrow: 1 }}
                            renderInput={(params) => <TextField {...params} label="Tedarikçi Seçin" variant="outlined" size="small" />}
                        />
                        {newItemForm.provider && (
                            <Chip
                                label={newItemForm.provider.firm === '1' ? "Şirket İçi" : "Şirket Dışı"}
                                color={newItemForm.provider.firm === '1' ? "primary" : "secondary"}
                                size="small"
                            />
                        )}
                    </Stack>
                </Grid>
                {tabValue === 'with-order' && (
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="order-autocomplete" required>
                            Sipariş Seçin
                        </CustomFormLabel>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Autocomplete<OrderType>
                                id="order-autocomplete"
                                options={ordersList}
                                getOptionLabel={(option) => `${option.id} (${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
                                value={selectedOrder}
                                onChange={handleOrderChange}
                                sx={{ flexGrow: 1 }}
                                renderInput={(params) => <TextField {...params} label="Sipariş" variant="outlined" size="small" />}
                            />
                            {selectedOrder && (
                                <Button
                                    variant="outlined"
                                    onClick={handleOpenOrderDetailsModal}
                                >
                                    Sipariş Detayları
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                )}
                <Grid item xs={12} sm={tabValue === 'with-order' ? 6 : 6}>
                    <CustomFormLabel htmlFor="item-autocomplete" required>
                        Ürün Seçin
                    </CustomFormLabel>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Autocomplete<ItemType>
                            id="item-autocomplete"
                            options={availableItems}
                            getOptionLabel={(option) => option.name}
                            value={availableItems.find(i => i.id === newItemForm.item) || null}
                            onChange={tabValue === 'with-order' ? handleOrderDetailItemChange : handleItemChangeWithoutOrder}
                            sx={{ flexGrow: 1 }}
                            renderInput={(params) => <TextField {...params} label="Ürün Seçin" variant="outlined" size="small" />}
                            disabled={tabValue === 'with-order' && !selectedOrder}
                        />
                        {newItemForm.unit?.title && (
                            <Chip label={newItemForm.unit.title} color="secondary" variant="outlined" />
                        )}
                    </Stack>
                </Grid>
                <Grid item xs={12} sm={3}>
                    <CustomFormLabel htmlFor="Miktar" required>
                        Miktar
                    </CustomFormLabel>
                    <TextField
                        label="Miktar" type="number" size="small" fullWidth
                        value={newItemForm.quantity !== 0 ? newItemForm.quantity : ''}
                        onChange={(e) => handleFormChange('quantity', e.target.value)}
                        InputProps={{ inputProps: { min: 0 } }}
                    />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <CustomFormLabel htmlFor="Fiyat" required>
                        Fiyat
                    </CustomFormLabel>
                    <TextField
                        label="Fiyat" type="number" size="small" fullWidth
                        value={newItemForm.price !== 0 ? newItemForm.price : ''}
                        onChange={(e) => handleFormChange('price', e.target.value)}
                        InputProps={{ inputProps: { min: 0 } }}
                    />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <CustomFormLabel htmlFor="İndirim (Yüzdesel %)">
                        İndirim (Yüzdesel %)
                    </CustomFormLabel>
                    <TextField
                        label="İndirim (Yüzdesel %)" type="number" size="small" fullWidth
                        value={newItemForm.discountPercent !== 0 ? newItemForm.discountPercent : ''}
                        onChange={(e) => handleFormChange('discountPercent', e.target.value)}
                        InputProps={{ inputProps: { min: 0 } }}
                    />
                </Grid>
                <Grid item xs={12} sm={3}>
                    <CustomFormLabel htmlFor="İndirim (Miktar)">
                        İndirim (Miktar)
                    </CustomFormLabel>
                    <TextField
                        label="İndirim (Miktar)" type="number" size="small" fullWidth
                        value={newItemForm.discountAmount !== 0 ? newItemForm.discountAmount : ''}
                        onChange={(e) => handleFormChange('discountAmount', e.target.value)}
                        InputProps={{ inputProps: { min: 0 } }}
                    />
                </Grid>
                <Grid item xs={12}>
                    <CustomFormLabel htmlFor="Açıklama">
                        Açıklama
                    </CustomFormLabel>
                    <TextField
                        label="Açıklama" size="small" fullWidth multiline rows={1}
                        value={newItemForm.description || ''}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                    />
                </Grid>
            </Grid>
            <Box textAlign="right" sx={{ mb: 2 }}>
                {editingItem ? (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                            variant="contained" color="info" onClick={handleAddUpdateItem}
                            disabled={!isFormValid}
                        >
                            Düzenle
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                    </Stack>
                ) : (
                    <Button
                        variant="contained" startIcon={<IconPlus />} onClick={handleAddUpdateItem}
                        disabled={!isFormValid}
                    >
                        Ürün Ekle
                    </Button>
                )}
            </Box>

            <Typography variant="h6" gutterBottom>Eklenen Ürünler</Typography>
            <TableContainer sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <Table stickyHeader aria-label="invoice items table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '25%' }}>Ürün</TableCell>
                            <TableCell sx={{ width: '15%' }}>Tedarikçi</TableCell>
                            <TableCell sx={{ width: '15%' }}>Firm</TableCell>
                            <TableCell sx={{ width: '15%' }}>Miktar</TableCell>
                            <TableCell sx={{ width: '15%' }}>Fiyat</TableCell>
                            <TableCell sx={{ width: '15%' }}>İndirim %</TableCell>
                            <TableCell sx={{ width: '15%' }}>İndirim Miktarı</TableCell>
                            <TableCell sx={{ width: '20%' }}>Açıklama</TableCell>
                            <TableCell sx={{ width: '15%' }} align="right">İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map((item) => {
                                const provider = providersList.find(p => p.id === item.providerId);
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Typography>{itemsList.find(i => i.id === item.item)?.name}</Typography>
                                                {item.unit?.title && (
                                                    <Chip label={item.unit.title} color="secondary" variant="outlined" />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell><Typography>{provider?.name || '-'}</Typography></TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.firm ? "Şirket İçi" : "Şirket Dışı"}
                                                color={item.firm ? "primary" : "secondary"}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography>{Number(item.quantity).toFixed(2)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography>{cleanAndFormatPrice(item.price)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography>{Number(item.discountPercent).toFixed(2)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography>{Number(item.discountAmount).toFixed(2)}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography>{stripHtml(item.description)}</Typography>
                                                {stripHtml(item.description).length > 50 && (
                                                    <IconButton size="small" onClick={() => handleOpenModal(item.description || '')}><IconEye size={18} /></IconButton>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü düzenle" : ""}>
                                                <IconButton color="primary" onClick={() => handleEditClick(item)}>
                                                    <IconEdit size={20} />
                                                </IconButton>
                                            </CustomTooltip>
                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü sil" : ""}>
                                                <IconButton color="error" onClick={() => onRemoveItem(item.id)}>
                                                    <IconTrash size={20} />
                                                </IconButton>
                                            </CustomTooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} align="center">
                                    <Typography variant="subtitle1" color="textSecondary">
                                        Hiç ürün eklenmedi.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                <DialogTitle>Açıklama</DialogTitle>
                <DialogContent dividers>
                    <Typography>{modalContent}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openOrderDetailsModal} onClose={handleCloseOrderDetailsModal} maxWidth="md" fullWidth>
                <DialogTitle>Sipariş Detayları</DialogTitle>
                <DialogContent dividers>
                    {selectedOrder && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Sipariş No: {selectedOrder.id} - Tarih: {format(new Date(selectedOrder.docDate), 'dd MMMM yyyy', { locale: tr })}
                                {selectedOrder.network && (
                                    <Chip label={`Şebeke: ${selectedOrder.network?.title || '-'}`} sx={{ ml: 2 }} color="primary" variant="outlined" />
                                )}
                            </Typography>
                            <TableContainer component={Paper} sx={{ mt: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Ürün</TableCell>
                                            <TableCell>Miktar</TableCell>
                                            <TableCell>Birim</TableCell>
                                            <TableCell>Fiyat</TableCell>
                                            <TableCell>Açıklama</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedOrder.orderDetails.map((detail) => (
                                            <TableRow key={detail.id}>
                                                <TableCell>{detail.item.name}</TableCell>
                                                <TableCell>{Number(detail.quantity).toFixed(2)}</TableCell>
                                                <TableCell>{detail.item.unit.title}</TableCell>
                                                <TableCell>{cleanAndFormatPrice(detail.price)}</TableCell>
                                                <TableCell>{stripHtml(detail.description)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseOrderDetailsModal}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default InvoiceItemsTable;