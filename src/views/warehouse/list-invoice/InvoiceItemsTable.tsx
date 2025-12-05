


import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Box, Typography, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Button, Chip, Stack,
    keyframes,
    styled
} from '@mui/material';
import { IconTrash, IconEye, IconEdit, IconCheck, IconRotate2, IconReload, IconEyeOff } from '@tabler/icons-react';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import axios from 'axios';
import server from 'src/assets/address.json';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// ===== Types =====
interface UnitType { id: string; title: string; recordStatus: number; createAt: string; }
interface ItemType { id: string; name: string; abbreviation: string; recordStatus: number; unit: UnitType; }
interface ProviderType { id: number; name: string; firm: string; recordStatus: number; }

interface OrderDetailType {
    id: string;
    quantity: string | null;
    price: string | null;
    description: string;
    item: ItemType;
}
export interface OrderSourceType {
    id: string;
    docDate: string;
    status: number;   // 0,1,2
    isEnd?: boolean;
    orderDetails: OrderDetailType[];
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

    // refreshSignal?: number;
    onOrderSelect?: (order: OrderSourceType | null) => void;

    showAlert?: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

// ===== Utils =====
const stripHtml = (htmlString: string) => {
    if (!htmlString) return "";
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};
const cleanAndConvertNumber = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) return 0;
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};
const cleanAndFormatPrice = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '₺0.00';
    const n = parseFloat(String(val).replace(/[$,]/g, ''));
    if (isNaN(n)) return '₺0.00';
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).replace('$', '₺');
};
const noop = (_m: string, _s: any) => { };


const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

// ===== Component =====
const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
    items,
    itemsList,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    providersList,
    // refreshSignal = 0,
    onOrderSelect,
    showAlert = noop,
}) => {
    const [openDescModal, setOpenDescModal] = useState(false);
    const [descContent, setDescContent] = useState('');

    const [activeOrders, setActiveOrders] = useState<OrderSourceType[]>([]);
    const [endedOrders, setEndedOrders] = useState<OrderSourceType[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderSourceType | null>(null);

    const [openOrderDetailsModal, setOpenOrderDetailsModal] = useState(false);
    const [openEndedOrdersModal, setOpenEndedOrdersModal] = useState(false);

    const [deletedItems, setDeletedItems] = useState<InvoiceItem[]>([]);
    const [editingItems, setEditingItems] = useState<Record<number, Partial<InvoiceItem>>>({});


    const [isBlinking, setIsBlinking] = useState(true);

    const { isTooltipGloballyEnabled } = useTooltip();

    // ---- Load Orders (initial + on refreshSignal) ----
    const fetchOrders = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        try {
            const res = await axios.get(server.baseurl + server.initialoperations + "get-orders", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.httpStatusCode === 200) {
                const all = (res.data.data as OrderSourceType[]) || [];
                const approved = all.filter(o => o.status === 1);
                setActiveOrders(approved.filter(o => o.isEnd !== true));
                setEndedOrders(approved.filter(o => o.isEnd === true));
            } else {
                showAlert(res.data?.message || 'Siparişler yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Siparişler yüklenirken bir hata oluştu.', 'error');
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => { clearTimeout(timer); };
    }, []);
    // initial

    // اگر سفارش انتخابی بعد از ریفرش دیگر در Active نبود → انتخاب و آیتم‌ها را پاک کن
    useEffect(() => {
        if (selectedOrder) {
            const stillActive = activeOrders.some(o => o.id === selectedOrder.id);
            if (!stillActive) {
                setSelectedOrder(null);
                onOrderSelect?.(null);
                // پاک‌کردن آیتم‌ها
                items.forEach(it => onRemoveItem(it.id));
                setEditingItems({});
                setDeletedItems([]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrders]);

    // ---- Reactivate Ended Order (isEnd:false) ----
    const handleReactivateOrder = async (order: OrderSourceType) => {
        const token = localStorage.getItem('authToken');
        if (!token) { showAlert('Oturum süresi doldu.', 'error'); return; }
        try {
            showAlert(`Sipariş ${order.id} tekrar listeye ekleniyor...`, 'info');
            const url = server.baseurl + server.initialoperations + "update-order-is-end";
            const payload = { id: Number(order.id), isEnd: false };
            const res = await axios.put(url, payload, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.httpStatusCode === 200) {
                showAlert('Sipariş aktifleştirildi.', 'success');
                await fetchOrders();
                setOpenEndedOrdersModal(false);
            } else {
                showAlert(res.data?.message || 'Sipariş durumu güncellenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Sipariş durumu güncellenirken bir hata oluştu.', 'error');
        }
    };

    // ---- Editing handlers ----
    const handleItemChange = (id: number, field: keyof InvoiceItem, value: any) => {
        setEditingItems(prev => {
            const currentItem = items.find(i => i.id === id);
            const pendingEdit = prev[id] || {};

            // 1. آیتم پایه (همراه با تغییر جدید)
            const updated: Partial<InvoiceItem> = {
                ...(currentItem as InvoiceItem),
                ...pendingEdit,
                [field]: value
            };

            // 2. تعریف مرجع محاسبه: فقط قیمت واحد (Fiyat)
            const basePrice = cleanAndConvertNumber(updated.price);

            // مقادیر تخفیف فعلی (یا مقدار 0 اگر معتبر نباشند)
            let discountPercent = cleanAndConvertNumber(updated.discountPercent);
            let discountAmount = cleanAndConvertNumber(updated.discountAmount);

            // 3. اعمال منطق محاسبه متقابل (بر اساس basePrice)
            if (basePrice > 0) {

                if (field === 'discountPercent') {
                    discountPercent = cleanAndConvertNumber(value);

                    // محدودیت‌ها (باید بین 0 تا 100 باشد)
                    if (discountPercent < 0) discountPercent = 0;
                    if (discountPercent > 100) discountPercent = 100;

                    // محاسبه مقدار تخفیف بر اساس درصد (از قیمت واحد)
                    discountAmount = parseFloat(((basePrice * discountPercent) / 100).toFixed(2));

                } else if (field === 'discountAmount') {
                    discountAmount = cleanAndConvertNumber(value);

                    // محدودیت‌ها (نباید از قیمت واحد بیشتر باشد)
                    if (discountAmount < 0) discountAmount = 0;
                    if (discountAmount > basePrice) discountAmount = basePrice; // ⬅️ محدودیت بر اساس قیمت واحد

                    // محاسبه درصد تخفیف بر اساس مقدار (از قیمت واحد)
                    discountPercent = parseFloat(((discountAmount / basePrice) * 100).toFixed(2));
                }
            } else {
                // اگر قیمت واحد 0 باشد، تخفیف نیز 0 است
                discountPercent = 0;
                discountAmount = 0;
            }

            // 4. به‌روزرسانی نهایی
            updated.discountPercent = discountPercent;
            updated.discountAmount = discountAmount;

            // 5. مدیریت تغییر Provider (مانند قبل)
            if (field === 'providerId') {
                const p = providersList.find(x => x.id === value);
                updated.firm = p ? p.firm === '1' : false;
            }

            // 6. بازگرداندن وضعیت به‌روز شده
            return { ...prev, [id]: updated };
        });
    };

    const handleStartEdit = (item: InvoiceItem) => {
        setEditingItems(prev => ({ ...prev, [item.id]: { ...item, providerId: item.providerId || undefined } }));
    };
    const handleSaveEdit = (item: InvoiceItem) => {
        const edited = editingItems[item.id];
        if (edited) {
            onUpdateItem({ ...item, ...(edited as InvoiceItem) });
            setEditingItems(prev => {
                const copy = { ...prev }; delete copy[item.id]; return copy;
            });
        }
    };
    const isSaveEnabled = (item: InvoiceItem) => {
        const current = editingItems[item.id] || item;
        const qty = cleanAndConvertNumber(current.quantity);
        const price = cleanAndConvertNumber(current.price);
        return !!current.providerId && qty > 0 && price > 0;
    };
    const handleRemoveItemWithUndo = (rm: InvoiceItem) => {
        setEditingItems(prev => { const c = { ...prev }; delete c[rm.id]; return c; });
        setDeletedItems(prev => [...prev, rm]);
        onRemoveItem(rm.id);
    };
    const handleUndoDelete = (it: InvoiceItem) => {
        onAddItem(it);
        setDeletedItems(prev => prev.filter(x => x.id !== it.id));
    };

    // ---- Description modal ----
    const openDesc = (content: string) => { setDescContent(stripHtml(content)); setOpenDescModal(true); };
    const closeDesc = () => { setOpenDescModal(false); setDescContent(''); };

    // ---- Source selection ----
    const handleOrderChange = (_: any, newValue: OrderSourceType | null) => {
        // اگر سفارش جدید انتخاب شد، آیتم‌های قبلی پاک شوند
        if (newValue && items.length > 0) items.forEach(i => onRemoveItem(i.id));

        setSelectedOrder(newValue);
        onOrderSelect?.(newValue); // 👈 به والد خبر بده

        setDeletedItems([]);
        setEditingItems({});

        if (newValue) {
            const map: Record<number, Partial<InvoiceItem>> = {};
            newValue.orderDetails.forEach(d => {
                const id = Date.now() + Math.floor(Math.random() * 1e6);
                const row: InvoiceItem = {
                    id,
                    item: d.item.id,
                    unit: d.item.unit,
                    quantity: cleanAndConvertNumber(d.quantity),
                    price: cleanAndConvertNumber(d.price),
                    discountPercent: 0,
                    discountAmount: 0,
                    description: d.description || '',
                    orderDetailId: d.id,
                    providerId: undefined,
                    firm: false,
                };
                onAddItem(row);
                map[id] = { ...row };
            });
            setEditingItems(map);
        }
    };

    const isItemsEmpty = items.length === 0;

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
            <Box display="flex" justifyContent="flex-end" mb={1}>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sonlandırılmış (Kapatılmış) siparişleri göster" : ""}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => setOpenEndedOrdersModal(true)}
                        disabled={endedOrders.length === 0}
                        startIcon={<IconEyeOff size={20} />}
                    >
                        Sonlandırılmış Siparişler ({endedOrders.length})
                    </Button>
                </CustomTooltip>
            </Box>

            <Typography variant="h6" gutterBottom>Siparişten Ürün Ekle</Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                    <CustomFormLabel htmlFor="order-source-autocomplete">Kaynak Sipariş Seçin</CustomFormLabel>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Autocomplete<OrderSourceType>
                            id="order-source-autocomplete"
                            options={activeOrders}
                            getOptionLabel={(o) => `${o.id} (${format(new Date(o.docDate), 'dd MMMM yyyy', { locale: tr })})`}
                            value={selectedOrder}
                            onChange={handleOrderChange}
                            sx={{ flexGrow: 1 }}
                            renderInput={(params) => <TextField {...params} label="Kaynak Sipariş" variant="outlined" size="small" />}
                            disabled={!isItemsEmpty}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                            renderOption={(props, option) => (
                                <Box component="li" {...props}>
                                    <Typography><strong>{option.id}</strong> ({format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})</Typography>
                                </Box>
                            )}
                        />
                        {selectedOrder && (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Button variant="outlined" onClick={() => setOpenOrderDetailsModal(true)}>Detayları Gör</Button>
                                <CustomTooltip title="Kaynak Siparişi Sıfırla">
                                    <IconButton color="primary" onClick={() => handleOrderChange(null, null)}>
                                        <IconRotate2 size={20} />
                                    </IconButton>
                                </CustomTooltip>
                            </Stack>
                        )}
                    </Stack>
                </Grid>
            </Grid>

            {/* Undo delete */}
            {deletedItems.length > 0 && (
                <Box mb={2} p={2} border="1px solid" borderColor="error.main" borderRadius={2} bgcolor="error.light">
                    <Typography variant="subtitle2" color="error.dark" mb={1}>Silinen Ürünler (Geri Almak için tıklayın):</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {deletedItems.map((it) => {
                            const provider = providersList.find(p => p.id === it.providerId);
                            const itemInfo = itemsList.find(i => i.id === it.item);
                            return (
                                <Chip
                                    key={it.id}
                                    label={`${itemInfo?.name} (${provider?.name || 'Tedarikçi Bilinmiyor'})`}
                                    onDelete={() => handleUndoDelete(it)}
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

            {/* Table */}
            <Typography variant="h6" gutterBottom>Eklenen Ürünler</Typography>
            <TableContainer sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <Table stickyHeader aria-label="invoice items table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: '25%' }}>Ürün & Birim</TableCell>
                            <TableCell sx={{ width: '15%' }}>Miktar & Fiyat</TableCell>
                            <TableCell sx={{ width: '20%' }}>Tedarikçi & Firm</TableCell>
                            <TableCell sx={{ width: '15%' }}>İndirimler</TableCell>
                            <TableCell sx={{ width: '20%' }}>Açıklama</TableCell>
                            <TableCell sx={{ width: '5%' }} align="right">İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map((item) => {
                                const editing = editingItems[item.id] !== undefined;
                                const current = editing ? editingItems[item.id] : item;
                                const provider = providersList.find(p => p.id === current?.providerId);
                                const product = itemsList.find(i => i.id === item.item);

                                const qty = cleanAndConvertNumber(current?.quantity);
                                const price = cleanAndConvertNumber(current?.price);
                                const providerId = current?.providerId;

                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Typography variant="subtitle1" fontWeight="bold">{product?.name || '-'}</Typography>
                                            <Typography variant="body2" color="textSecondary">{product?.unit?.title || '-'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {editing ? (
                                                <Stack direction="column" spacing={1}>
                                                    <TextField label="Miktar" type="number" size="small"
                                                        value={qty}
                                                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                        error={!qty || qty <= 0}
                                                        helperText={(!qty || qty <= 0) && 'Bu alan zorunludur.'}
                                                    />
                                                    <TextField label="Fiyat" type="number" size="small"
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
                                            {editing ? (
                                                <Stack direction="column" spacing={1}>
                                                    <Autocomplete<ProviderType>
                                                        options={providersList}
                                                        getOptionLabel={(o) => o.name}
                                                        value={provider || null}
                                                        onChange={(_e, v) => handleItemChange(item.id, 'providerId', v ? v.id : undefined)}
                                                        size="small"
                                                        renderInput={(params) => (
                                                            <TextField {...params} label="Tedarikçi" error={!providerId} helperText={!providerId && 'Bu alan zorunludur.'} />
                                                        )}
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
                                                    <Chip label={item.firm ? "Şirket İçi" : "Şirket Dışı"} color={item.firm ? "primary" : "secondary"} size="small" />
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {editing ? (
                                                <Stack direction="column" spacing={1}>
                                                    <TextField label="İndirim %" type="number" size="small"
                                                        value={Number(current?.discountPercent).toFixed(1) || 0} // ⬅️ نمایش مقدار محاسبه شده
                                                        onChange={(e) => handleItemChange(item.id, 'discountPercent', e.target.value)}
                                                    />
                                                    <TextField label="İndirim Miktar" type="number" size="small"
                                                        value={Number(current?.discountAmount).toFixed(0) || 0} // ⬅️ نمایش مقدار محاسبه شده
                                                        onChange={(e) => handleItemChange(item.id, 'discountAmount', e.target.value)}
                                                    />
                                                </Stack>
                                            ) : (
                                                <>
                                                    <Typography variant="subtitle1" noWrap>{Number(item.discountPercent).toFixed(1)}%</Typography>
                                                    <Typography variant="body2" color="textSecondary">{cleanAndFormatPrice(item.discountAmount)}</Typography>
                                                </>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {editing ? (
                                                    <TextField label="Açıklama" size="small" fullWidth multiline rows={1}
                                                        value={current?.description || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                                    />
                                                ) : (
                                                    <Typography noWrap>{stripHtml(item.description)}</Typography>
                                                )}
                                                {stripHtml(item.description).length > 20 && !editing && (
                                                    <IconButton size="small" onClick={() => openDesc(item.description || '')}>
                                                        <IconEye size={18} />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            {editing ? (
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Değişiklikleri kaydet" : ""}>
                                                    <BlinkingButton variant="outlined" color="inherit" isBlinking={isBlinking} sx={{ padding: "1px" }}>

                                                        <IconButton color="success" onClick={() => handleSaveEdit(item)} disabled={!isSaveEnabled(item)}>
                                                            <IconCheck size={20} />
                                                        </IconButton>
                                                    </BlinkingButton>
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
                                    <Typography variant="subtitle1" color="textSecondary">Lütfen bir sipariş seçerek ürün ekleyin.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Description Modal */}
            <Dialog open={openDescModal} onClose={closeDesc} maxWidth="sm" fullWidth>
                <DialogTitle>Açıklama</DialogTitle>
                <DialogContent dividers><Typography>{descContent}</Typography></DialogContent>
                <DialogActions><Button onClick={closeDesc}>Kapat</Button></DialogActions>
            </Dialog>

            {/* Order Details Modal */}
            <Dialog open={openOrderDetailsModal} onClose={() => setOpenOrderDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Kaynak Sipariş Detayları</DialogTitle>
                <DialogContent dividers>
                    {selectedOrder && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Sipariş: {selectedOrder.id} ({format(new Date(selectedOrder.docDate), 'dd MMMM yyyy', { locale: tr })})
                                <Chip
                                    label={selectedOrder.status === 1 ? "Onaylandı" : selectedOrder.status === 2 ? "Reddedildi" : "Beklemede"}
                                    sx={{ ml: 2 }}
                                    color={selectedOrder.status === 1 ? "success" : selectedOrder.status === 2 ? "error" : "warning"}
                                    variant="outlined"
                                />
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
                                        {selectedOrder.orderDetails.map((d) => (
                                            <TableRow key={d.id}>
                                                <TableCell>{d.item.name}</TableCell>
                                                <TableCell>{Number(cleanAndConvertNumber(d.quantity)).toFixed(2)}</TableCell>
                                                <TableCell>{d.item.unit?.title}</TableCell>
                                                <TableCell>{cleanAndFormatPrice(d.price || 0)}</TableCell>
                                                <TableCell>{stripHtml(d.description || '')}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenOrderDetailsModal(false)}>Kapat</Button></DialogActions>
            </Dialog>

            {/* Ended Orders Modal */}
            <Dialog open={openEndedOrdersModal} onClose={() => setOpenEndedOrdersModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sonlandırılmış Siparişler</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><Typography variant="h6">Sipariş</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="h6"></Typography></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {endedOrders.length > 0 ? (
                                    endedOrders.map((o) => (
                                        <TableRow key={o.id}>
                                            <TableCell>{o.id} ({format(new Date(o.docDate), 'dd MMMM yyyy', { locale: tr })})</TableCell>
                                            <TableCell align="right">
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Siparişi aktif listeye geri alın" : ""}>
                                                    <Button variant="outlined" size="small" color="warning" onClick={() => handleReactivateOrder(o)}>Geri Al</Button>
                                                </CustomTooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Sonlandırılmış sipariş bulunamadı.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenEndedOrdersModal(false)}>Kapat</Button></DialogActions>
            </Dialog>
        </Paper>
    );
};

export default InvoiceItemsTable;
