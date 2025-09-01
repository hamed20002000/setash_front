// InvoiceItemsTable.tsx
import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Box, Typography, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Button, Chip, Stack
} from '@mui/material';
import { IconTrash, IconEye, IconEdit, IconCheck, IconRotate2, IconReload } from '@tabler/icons-react';
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
    providersList: ProviderType[];
}

const stripHtml = (htmlString: string) => {
    if (!htmlString) return "";
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

const cleanAndConvertNumber = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) {
        return 0;
    }
    const cleanedString = String(value).replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
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
    const [ordersList, setOrdersList] = useState<OrderType[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
    const [openOrderDetailsModal, setOpenOrderDetailsModal] = useState(false);

    // Changed to an array to handle multiple deleted items
    const [deletedItems, setDeletedItems] = useState<InvoiceItem[]>([]);

    const [editingItems, setEditingItems] = useState<Record<number, Partial<InvoiceItem>>>({});

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

    // const handleItemChange = (id: number, field: keyof InvoiceItem, value: any) => {
    //     setEditingItems(prev => ({
    //         ...prev,
    //         [id]: {
    //             ...prev[id],
    //             [field]: value
    //         }
    //     }));
    // };
    const handleItemChange = (id: number, field: keyof InvoiceItem, value: any) => {
        setEditingItems(prev => {
            const updatedItem = {
                ...prev[id],
                [field]: value
            };

            // Fix: If provider is changed, update the 'firm' status as well.
            if (field === 'providerId') {
                const selectedProvider = providersList.find(p => p.id === value);
                if (selectedProvider) {
                    updatedItem.firm = selectedProvider.firm === '1';
                } else {
                    updatedItem.firm = false; // Reset if no provider is selected
                }
            }

            return {
                ...prev,
                [id]: updatedItem
            };
        });
    };

    const handleStartEdit = (item: InvoiceItem) => {
        setEditingItems(prev => ({
            ...prev,
            [item.id]: {
                ...item,
                providerId: item.providerId || undefined,
            }
        }));
    };

    const handleSaveEdit = (item: InvoiceItem) => {
        const editedItem = editingItems[item.id];
        if (editedItem) {
            onUpdateItem({
                ...item,
                ...editedItem as InvoiceItem,
            });
            setEditingItems(prev => {
                const newEditingItems = { ...prev };
                delete newEditingItems[item.id];
                return newEditingItems;
            });
        }
    };

    const isSaveEnabled = (item: InvoiceItem) => {
        const currentItem = editingItems[item.id] || item;
        const quantity = cleanAndConvertNumber(currentItem.quantity);
        const price = cleanAndConvertNumber(currentItem.price);
        return !!currentItem.providerId && quantity > 0 && price > 0;
    };

    const handleRemoveItemWithUndo = (itemToRemove: InvoiceItem) => {
        setDeletedItems(prev => [...prev, itemToRemove]);
        onRemoveItem(itemToRemove.id);
    };

    const handleUndoDelete = (itemToRestore: InvoiceItem) => {
        onAddItem(itemToRestore);
        setDeletedItems(prev => prev.filter(item => item.id !== itemToRestore.id));
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
        setSelectedOrder(newValue);
        if (newValue) {
            const newEditingItems: Record<number, Partial<InvoiceItem>> = {};
            newValue.orderDetails.forEach(detail => {
                const uniqueId = Date.now() + Math.random();
                const itemToAdd: InvoiceItem = {
                    id: uniqueId,
                    item: detail.item.id,
                    quantity: cleanAndConvertNumber(detail.quantity),
                    price: cleanAndConvertNumber(detail.price),
                    discountPercent: 0,
                    discountAmount: 0,
                    description: detail.description,
                    unit: detail.item.unit,
                    orderDetailId: detail.id,
                    providerId: undefined, // Changed from null to undefined
                    firm: false,
                };
                onAddItem(itemToAdd);
                newEditingItems[uniqueId] = { ...itemToAdd, providerId: undefined };
            });
            setEditingItems(newEditingItems);
        }
    };

    const handleOpenOrderDetailsModal = () => {
        setOpenOrderDetailsModal(true);
    };

    const handleCloseOrderDetailsModal = () => {
        setOpenOrderDetailsModal(false);
    };
    const handleResetOrderSelection = () => {
        setSelectedOrder(null);
        setEditingItems({});
        setDeletedItems([]);
        items.forEach(item => onRemoveItem(item.id));
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

    const isInvoiceItemsEmpty = items.length === 0;

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 3 }} >
            <Typography variant="h6" gutterBottom>Fatura Ürünleri</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                    <CustomFormLabel htmlFor="order-autocomplete">
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
                            disabled={!isInvoiceItemsEmpty}
                        />
                        {selectedOrder && (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Button variant="outlined" onClick={handleOpenOrderDetailsModal}>Sipariş Detayları</Button>
                                <CustomTooltip title="Siparişi değiştir">
                                    <IconButton color="primary" onClick={handleResetOrderSelection}>
                                        <IconRotate2 size={20} />
                                    </IconButton>
                                </CustomTooltip>
                            </Stack>
                        )}
                    </Stack>

                </Grid>
            </Grid>

            {/* Undo Delete Section */}
            {/* {deletedItems.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Alert
                        severity="warning"
                        sx={{ backgroundColor: '#ff9800', color: 'white' }}
                    >
                        <Typography variant="h6">Silinen Ürünler</Typography>
                        {deletedItems.map((item) => {
                            const provider = providersList.find(p => p.id === item.providerId);
                            const itemInfo = itemsList.find(i => i.id === item.item);
                            return (
                                <Box key={item.id} sx={{ my: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="body1">{itemInfo?.name}</Typography>
                                        <Typography variant="caption">{provider?.name || 'Tedarikçi Bilinmiyor'}</Typography>
                                    </Box>
                                    <Button
                                        color="inherit"
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleUndoDelete(item)}
                                    >
                                        Geri Al
                                    </Button>
                                </Box>
                            );
                        })}
                    </Alert>
                </Box>
            )} */}
            {deletedItems.length > 0 && (
                <Box mb={2} p={2} border="1px solid" borderColor="error.main" borderRadius={2} bgcolor="error.light">
                    <Typography variant="subtitle2" color="error.dark" mb={1}>Silinen Ürünler:</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">

                        {deletedItems.map((item) => {
                            const provider = providersList.find(p => p.id === item.providerId);
                            const itemInfo = itemsList.find(i => i.id === item.item);
                            return (
                                <Chip
                                    key={item.id}
                                    label={`${itemInfo?.name} (${provider?.name || 'Tedarikçi Bilinmiyor'})`}
                                    onDelete={() => handleUndoDelete(item)}
                                    deleteIcon={<IconReload />}
                                    color="error"
                                    variant="outlined"
                                    sx={{ mb: 1 }}
                                />
                            );
                        })}
                    </Stack>
                </Box>
            )}

            <Typography variant="h6" gutterBottom>Eklenen Ürünler</Typography>
            <TableContainer sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <Table stickyHeader aria-label="invoice items table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '25%' }}>Ürün & Birim</TableCell>
                            <TableCell sx={{ width: '10%' }}>Miktar & Fiyat</TableCell>
                            <TableCell sx={{ width: '20%' }}>Tedarikçi & Firm</TableCell>
                            <TableCell sx={{ width: '15%' }}>İndirimler</TableCell>
                            <TableCell sx={{ width: '20%' }}>Açıklama</TableCell>
                            <TableCell sx={{ width: '10%' }} align="right">İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map((item) => {
                                const isEditing = editingItems[item.id] !== undefined;
                                const currentItem = isEditing ? editingItems[item.id] : item;
                                const provider = providersList.find(p => p.id === currentItem?.providerId);
                                const product = itemsList.find(i => i.id === item.item);

                                const quantity = cleanAndConvertNumber(currentItem?.quantity);
                                const price = cleanAndConvertNumber(currentItem?.price);
                                const providerId = currentItem?.providerId;

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Typography variant="subtitle1" fontWeight="bold">{product?.name || '-'}</Typography>
                                            <Typography variant="body2" color="textSecondary">{product?.unit?.title || '-'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Stack direction="column" spacing={1}>
                                                    <TextField
                                                        label="Miktar" type="number" size="small"
                                                        value={quantity}
                                                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                        error={!quantity || quantity <= 0}
                                                        helperText={(!quantity || quantity <= 0) && 'Bu alan zorunludur.'}
                                                    />
                                                    <TextField
                                                        label="Fiyat" type="number" size="small"
                                                        value={price}
                                                        onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                                        error={!price || price <= 0}
                                                        helperText={(!price || price <= 0) && 'Bu alan zorunludur.'}
                                                    />
                                                </Stack>
                                            ) : (
                                                <>
                                                    <Typography variant="subtitle1" fontWeight="bold">{Number(item.quantity).toFixed(2)}</Typography>
                                                    <Typography variant="body2" color="textSecondary">{cleanAndFormatPrice(item.price)}</Typography>
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Stack direction="column" spacing={1}>
                                                    <Autocomplete<ProviderType>
                                                        options={providersList}
                                                        getOptionLabel={(option) => option.name}
                                                        value={provider || null} // Use the found provider object here
                                                        onChange={(_event, newValue) => {
                                                            // Call handleItemChange with the new provider's ID
                                                            const newProviderId = newValue ? newValue.id : undefined;
                                                            handleItemChange(item.id, 'providerId', newProviderId);
                                                        }}
                                                        size="small"
                                                        renderInput={(params) => <TextField {...params} label="Tedarikçi" error={!providerId} helperText={!providerId && 'Bu alan zorunludur.'} />}
                                                    />
                                                    {provider && (
                                                        <Chip
                                                            label={provider.firm === '1' ? "Şirket İçi" : "Şirket Dışı"}
                                                            color={provider.firm === '1' ? "primary" : "secondary"}
                                                            size="small"
                                                        />
                                                    )}
                                                </Stack>
                                            ) : (
                                                <>
                                                    <Typography variant="subtitle1" noWrap>{provider?.name || '-'}</Typography>
                                                    <Chip
                                                        label={item.firm ? "Şirket İçi" : "Şirket Dışı"}
                                                        color={item.firm ? "primary" : "secondary"}
                                                        size="small"
                                                    />
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Stack direction="column" spacing={1}>
                                                    <TextField
                                                        label="İndirim %" type="number" size="small"
                                                        value={currentItem?.discountPercent || 0}
                                                        onChange={(e) => handleItemChange(item.id, 'discountPercent', e.target.value)}
                                                    />
                                                    <TextField
                                                        label="İndirim Miktar" type="number" size="small"
                                                        value={currentItem?.discountAmount || 0}
                                                        onChange={(e) => handleItemChange(item.id, 'discountAmount', e.target.value)}
                                                    />
                                                </Stack>
                                            ) : (
                                                <>
                                                    <Typography variant="subtitle1" noWrap>{Number(item.discountPercent).toFixed(2)}%</Typography>
                                                    <Typography variant="body2" color="textSecondary">{cleanAndFormatPrice(item.discountAmount)}</Typography>
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {isEditing ? (
                                                    <TextField
                                                        label="Açıklama" size="small" fullWidth multiline rows={1}
                                                        value={currentItem?.description || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                    />
                                                ) : (
                                                    <Typography noWrap>{stripHtml(item.description)}</Typography>
                                                )}
                                                {stripHtml(item.description).length > 20 && !isEditing && (
                                                    <IconButton size="small" onClick={() => handleOpenModal(item.description || '')}>
                                                        <IconEye size={18} />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            {isEditing ? (
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Değişiklikleri kaydet" : ""}>
                                                    <span>
                                                        <IconButton
                                                            color="success"
                                                            onClick={() => handleSaveEdit(item)}
                                                            disabled={!isSaveEnabled(item)}
                                                        >
                                                            <IconCheck size={20} />
                                                        </IconButton>
                                                    </span>
                                                </CustomTooltip>
                                            ) : (
                                                <>
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü düzenle" : ""}>
                                                        <IconButton color="primary" onClick={() => handleStartEdit(item)}>
                                                            <IconEdit size={20} />
                                                        </IconButton>
                                                    </CustomTooltip>
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü sil" : ""}>
                                                        <IconButton color="error" onClick={() => handleRemoveItemWithUndo(item)}>
                                                            <IconTrash size={20} />
                                                        </IconButton>
                                                    </CustomTooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="subtitle1" color="textSecondary">Hiç ürün eklenmedi.</Typography>
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