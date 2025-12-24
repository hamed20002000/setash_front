import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Box, Typography, Autocomplete, Chip, Stack, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { IconTrash, IconEdit, IconReload, IconCheck, IconX } from '@tabler/icons-react';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import ListIcon from '@mui/icons-material/List';
import axios from 'axios';
import server from 'src/assets/address.json';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    InvoiceType,
    ProcessedReceiptItem,
    ReceiptItemsTableProps,
} from './types';
import { useNavigate } from 'react-router-dom';

const stripHtml = (htmlString: string) => {
    if (!htmlString) return "";
    if (typeof window === 'undefined') return htmlString.replace(/<[^>]+>/g, '');
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

const ReceiptItemsTable: React.FC<ReceiptItemsTableProps> = ({
    items,
    deletedItems,
    onItemsUpdate,
    onItemDelete,
    onRestoreItem,
    showAlert,
    onInvoiceSelect,
    getReceipts,
    isInvoiceComboDisabled,
}) => {
    const navigate = useNavigate();
    const [invoicesList, setInvoicesList] = useState<InvoiceType[]>([]);  // برای کمبو: فقط بازها
    const [allInvoices, setAllInvoices] = useState<InvoiceType[]>([]);    // برای مودال: status=1 (باز و بسته)
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
    const [editingItem, setEditingItem] = useState<ProcessedReceiptItem | null>(null);

    // مودال «Listeyi Göster»
    const [openInvoiceListModal, setOpenInvoiceListModal] = useState(false);

    const { isTooltipGloballyEnabled } = useTooltip();

    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            return format(date, 'dd MMMM yyyy', { locale: tr });
        } catch {
            return "Geçersiz Tarih";
        }
    };

    // --- API: به‌روزرسانی وضعیت فاکتور (Açık / Sonlandırılmış) ---
    const updateInvoiceIsEnd = async (invoiceId: number, isEnd: boolean) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const url = server.baseurl + server.initialoperations + "update-invoice-is-end";
            const payload = { id: Number(invoiceId), isEnd };
            const resp = await axios.put(url, payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (resp.data?.httpStatusCode === 200) {
                showAlert(isEnd ? 'Fatura sonlandırıldı.' : 'Fatura tekrar açıldı.', 'success');
                await getInvoices();        // رفرش لیست‌های مودال و کمبو
                if (typeof getReceipts === 'function') await getReceipts(); // اگر لازم شد والد هم رفرش شود
            } else {
                showAlert(resp.data?.message || 'Fatura durumu güncellenemedi.', 'error');
            }
        } catch {
            showAlert('Fatura durumu güncellenirken bir hata oluştu.', 'error');
        }
    };

    // هندل انتخاب Radio برای هر ردیف مودال
    const handleToggleInvoiceRow = async (row: InvoiceType, val: 'open' | 'ended') => {
        const isEnd = (val === 'ended');
        await updateInvoiceIsEnd(Number(row.id), isEnd);
    };

    // --- GET: فاکتورها (فقط status=1 در مودال نمایش داده می‌شوند) ---
    const getInvoices = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-invoices",
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                const fetchedInvoices = (response.data.data as InvoiceType[]) || [];

                // اگر این فیلتر کسب‌وکاری لازم است، نگهش داریم
                const businessFiltered = fetchedInvoices.filter(inv => inv?.warehouse !== null && inv?.workhouse === null);

                // فقط status = 1 برای مودال
                const statusOk = businessFiltered.filter(inv => inv.status === 1);

                // برای کمبو: فقط بازها (isEnd !== true)
                const openForCombo = statusOk.filter(inv => inv.isEnd !== true);

                setAllInvoices(statusOk);
                setInvoicesList(openForCombo);
            } else {
                showAlert(response.data.message || 'Faturalar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert('Faturalar yüklenirken bir hata oluştu.', 'error');
            }
        }
    }, [showAlert, navigate]);

    useEffect(() => {
        getInvoices();
    }, [getInvoices]);

    // اگر در حالت ویرایش کمبو قفل است و آیتم‌ها داریم، مقدار نمایشی کمبو را از آیتم‌ها ست کن
    useEffect(() => {
        if (isInvoiceComboDisabled && !selectedInvoice && items.length) {
            setSelectedInvoice({
                id: items[0].invoiceDetailId,
                invoiceNo: items[0].invoiceNo || '',
                docDate: new Date().toISOString(),
                invoiceDetails: [],
                status: 1,
                warehouse: null as any,
                workhouse: null as any,
                isEnd: false as any,
            } as unknown as InvoiceType);
        }
    }, [isInvoiceComboDisabled, selectedInvoice, items]);

    const handleInvoiceChange = (_event: any, newValue: InvoiceType | null) => {
        setSelectedInvoice(newValue);
        onInvoiceSelect(newValue);

        if (newValue) {
            const newItems: ProcessedReceiptItem[] = newValue.invoiceDetails.map(detail => ({
                id: crypto.randomUUID() as unknown as number, // در صورت نیاز type را به string|number تغییر بده
                item: detail.item.id,
                itemName: detail.item.name,
                invoiceNo: newValue.invoiceNo,
                unit: detail.item.unit,
                quantity: Number(detail.quantity),
                description: detail.description,
                invoiceDetailId: Number(detail.id),
                providerId: detail.provider ? detail.provider.id : 0,
                providerName: detail.provider?.name || 'N/A',
                firm: detail.firm ?? false,
                orderDetail: detail.orderDetail,
            }));
            onItemsUpdate(newItems);
        } else {
            onItemsUpdate([]);
        }
    };

    const handleEditClick = (item: ProcessedReceiptItem) => setEditingItem(item);

    // const handleUpdateChange = (id: any, field: 'quantity' | 'description', value: any) => {
    //     if (field === 'quantity') {
    //         const numValue = Number(value);
    //         if (isNaN(numValue) || numValue <= 0) return;
    //     }
    //     const updatedItems = items.map(item => {
    //         if (item.id === id) {
    //             return {
    //                 ...item,
    //                 [field]: field === 'quantity' ? Number(value) : value
    //             };
    //         }
    //         return item;
    //     });
    //     onItemsUpdate(updatedItems);
    // };

    const handleUpdateChange = (id: any, field: 'quantity' | 'description', value: any) => {
        if (field === 'quantity') {
            const numValue = Number(value);
            const currentItem = items.find(i => i.id === id);

            // بررسی مقدار کمتر از صفر
            if (numValue <= 0) {
                showAlert('Miktar 0\'dan büyük olmalıdır.', 'error');
                return;
            }

            // رفع خطای تایپ اسکریپت با تبدیل رشته به عدد
            if (currentItem?.orderDetail?.quantity && numValue > Number(currentItem.orderDetail.quantity)) {
                showAlert(`Miktar fatura miktarından (${currentItem.orderDetail.quantity}) fazla olamaz!`, 'warning');
                return;
            }
        }

        const updatedItems = items.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    [field]: field === 'quantity' ? Number(value) : value
                };
            }
            return item;
        });
        onItemsUpdate(updatedItems);
    };
    const handleDeleteClick = (item: ProcessedReceiptItem) => {
        onItemDelete({ ...item, isDeleted: true });
        const updatedItems = items.filter(i => i.id !== item.id);
        onItemsUpdate(updatedItems);
    };

    const handleCancelEdit = () => setEditingItem(null);

    // const handleSaveEdit = () => {
    //     if (!editingItem) return;
    //     const currentItem = items.find(i => i.id === editingItem.id);
    //     if (currentItem && (currentItem.quantity <= 0 || isNaN(currentItem.quantity))) {
    //         showAlert('Miktar 0\'dan büyük bir sayı olmalıdır.', 'warning');
    //         return;
    //     }
    //     setEditingItem(null);
    //     showAlert('Ürün başarıyla güncellendi.', 'success');
    // };

    const handleSaveEdit = () => {
        if (!editingItem) return;

        const currentItem = items.find(i => i.id === editingItem.id);

        if (!currentItem || currentItem.quantity <= 0) {
            showAlert('Lütfen geçerli یک miktar giriniz.', 'error');
            return;
        }

        if (
            currentItem.orderDetail?.quantity &&
            currentItem.quantity > Number(currentItem.orderDetail.quantity)
        ) {
            showAlert(`Hata: Miktar fatura limitini (${currentItem.orderDetail.quantity}) aşıyor!`, 'error');
            return;
        }

        setEditingItem(null);
        showAlert('Ürün başarıyla güncellendi.', 'success');
    };
    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            {/* لیبل + دکمه نمایش مودال */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <CustomFormLabel htmlFor="invoice-autocomplete" required>Fatura Seçin*</CustomFormLabel>
                <Stack direction="row" spacing={1}>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Fatura listesini gör" : ""}>
                        <Button
                            variant="outlined"
                            onClick={() => setOpenInvoiceListModal(true)}
                            startIcon={<ListIcon />}
                        >
                            Listeyi Göster
                        </Button>
                    </CustomTooltip>
                </Stack>
            </Box>

            {/* کمبو: فقط فاکتورهای باز (status=1 && isEnd=false) */}
            <Autocomplete<InvoiceType>
                id="invoice-autocomplete"
                options={invoicesList}
                getOptionLabel={(option) => {
                    const d = option?.docDate ? format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr }) : '—';
                    return `${option?.invoiceNo ?? '—'} (${d})`;
                }}
                value={selectedInvoice}
                onChange={handleInvoiceChange}
                isOptionEqualToValue={(option, value) => !!value && option.id === value.id}
                disabled={isInvoiceComboDisabled}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Fatura"
                        variant="outlined"
                        size="small"
                        helperText={isInvoiceComboDisabled ? "Fatura, sonlandırılmış bir fişe bağlıdır ve değiştirilemez." : ""}
                    />
                )}
                renderOption={(props, option) => (
                    <Box component="li" {...props}>
                        <Typography>
                            <strong>{option.invoiceNo}</strong> {`(${formatDateDisplay(option.docDate)})`}
                        </Typography>
                    </Box>
                )}
            />

            {/* Deleted chips */}
            {deletedItems.length > 0 && (
                <Box mb={2} p={2} border="1px solid" borderColor="error.main" borderRadius={2} bgcolor="error.light">
                    <Typography variant="subtitle2" color="error.dark" mb={1}>Silinen Ürünler:</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {deletedItems.map(item => (
                            <Chip
                                key={item.id}
                                label={`${item.itemName} (${item.quantity})`}
                                onDelete={() => onRestoreItem(item.id)}
                                deleteIcon={<IconReload />}
                                color="error"
                                variant="outlined"
                                sx={{ mb: 1 }}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Table of selected items */}
            <Typography variant="h6" gutterBottom mt={2}>Eklenen Ürünler</Typography>
            <TableContainer sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <Table stickyHeader aria-label="receipt items table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Fatura No</TableCell>
                            <TableCell>Tedarikçi</TableCell>
                            <TableCell>Firma</TableCell>
                            <TableCell>Ürün</TableCell>
                            <TableCell>Miktar</TableCell>
                            <TableCell>Birim</TableCell>
                            <TableCell>Açıklama</TableCell>
                            <TableCell align="right">İşlemler</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length > 0 ? (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.invoiceNo || '-'}</TableCell>
                                    <TableCell>{item.providerName || '-'}</TableCell>
                                    <TableCell>{item.firm ? 'Şirket İçi' : 'Şirket Dışı'}</TableCell>
                                    <TableCell><Typography>{item.itemName || '-'}</Typography></TableCell>
                                    <TableCell>
                                        {editingItem?.id === item.id ? (
                                            // <TextField
                                            //     type="number"
                                            //     size="small"
                                            //     value={item.quantity}
                                            //     onChange={(e) => handleUpdateChange(item.id as any, 'quantity', e.target.value)}
                                            //     InputProps={{ inputProps: { min: 1, step: 'any' } }}
                                            // />
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateChange(item.id, 'quantity', e.target.value)}
                                                InputProps={{
                                                    inputProps: {
                                                        min: 0, // جلوگیری از انتخاب صفر یا منفی از طریق فلش‌ها
                                                        step: 'any'
                                                    }
                                                }}
                                                error={item.quantity <= 0} // قرمز شدن فیلد در صورت مقدار نامعتبر
                                            />
                                        ) : (
                                            <Typography>{Number(item.quantity).toFixed(2)}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell><Typography>{item.unit?.title}</Typography></TableCell>
                                    <TableCell>
                                        {editingItem?.id === item.id ? (
                                            <TextField
                                                size="small"
                                                multiline
                                                rows={1}
                                                fullWidth
                                                value={item.description}
                                                onChange={(e) => handleUpdateChange(item.id as any, 'description', e.target.value)}
                                            />
                                        ) : (
                                            <Typography>{stripHtml(item.description)}</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        {editingItem?.id === item.id ? (
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kaydet" : ""}>
                                                    <IconButton color="success" onClick={handleSaveEdit}>
                                                        <IconCheck size={20} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "İptal" : ""}>
                                                    <IconButton color="error" onClick={handleCancelEdit}>
                                                        <IconX size={20} />
                                                    </IconButton>
                                                </CustomTooltip>
                                            </Stack>
                                        ) : (
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü düzenle" : ""}>
                                                    <IconButton color="primary" onClick={() => handleEditClick(item)}>
                                                        <IconEdit size={20} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü sil" : ""}>
                                                    <IconButton color="error" onClick={() => handleDeleteClick(item)}>
                                                        <IconTrash size={20} />
                                                    </IconButton>
                                                </CustomTooltip>
                                            </Stack>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    <Typography variant="subtitle1" color="textSecondary">Lütfen bir fatura seçerek ürün ekleyin.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* --- مودال لیست فاکتورها دقیقا با RadioGroup برای Aç/Kapat --- */}
            <Dialog open={openInvoiceListModal} onClose={() => setOpenInvoiceListModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Fatura Listesi</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><Typography variant="h6">Kod</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Tarih</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                    <TableCell align="center"><Typography variant="h6">Aç/Kapat</Typography></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allInvoices.length > 0 ? allInvoices.map(row => (
                                    <TableRow key={row.id}>
                                        <TableCell>{row.invoiceNo}</TableCell>
                                        <TableCell>{formatDateDisplay(row.docDate)}</TableCell>
                                        <TableCell>
                                            {row.isEnd
                                                ? <Chip size="small" label="Sonlandırılmış" color="error" />
                                                : <Chip size="small" label="Açık" color="success" />}
                                        </TableCell>
                                        <TableCell align="center">
                                            <RadioGroup
                                                row
                                                value={row.isEnd ? 'ended' : 'open'}
                                                onChange={(_, val) => handleToggleInvoiceRow(row, val as 'open' | 'ended')}
                                            >
                                                <FormControlLabel value="open" control={<Radio />} label="Açık" />
                                                <FormControlLabel value="ended" control={<Radio />} label="Sonlandırılmış" />
                                            </RadioGroup>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">Fatura bulunamadı.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenInvoiceListModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default ReceiptItemsTable;
