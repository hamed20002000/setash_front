// src/views/Warehouse/ReceiptItemsTable.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Box, Typography, Autocomplete, Chip, Stack
} from '@mui/material';
import { IconTrash, IconEdit, IconReload, IconCheck, IconX } from '@tabler/icons-react';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import axios from 'axios';
import server from 'src/assets/address.json';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    InvoiceType,
    ProcessedReceiptItem,
    ReceiptItemsTableProps,
} from './types';
import { useNavigate } from 'react-router';

const stripHtml = (htmlString: string) => {
    if (!htmlString) return "";
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

// const formatDateDisplay = (dateString: string | null): string => {
//     if (!dateString) return "N/A";
//     try {
//         const date = new Date(dateString);
//         return format(date, 'dd MMMM yyyy', { locale: tr });
//     } catch (e) {
//         return "Geçersiz Tarih";
//     }
// };

const ReceiptItemsTable: React.FC<ReceiptItemsTableProps> = ({
    items,
    deletedItems,
    onItemsUpdate,
    onItemDelete,
    onRestoreItem,
    showAlert
}) => {
    const navigate = useNavigate();
    const [invoicesList, setInvoicesList] = useState<InvoiceType[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
    const [editingItem, setEditingItem] = useState<ProcessedReceiptItem | null>(null);
    const { isTooltipGloballyEnabled } = useTooltip();

    const getInvoices = useCallback(async () => {

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-invoices", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const approvedInvoices = response.data.data.filter((invoice: InvoiceType) => invoice.status === 1);
                setInvoicesList(approvedInvoices);
            } else {
                showAlert(response.data.message || 'Faturalar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Faturalar yüklenirken bir hata oluştu.', 'error');
        }
    }, [showAlert]);

    useEffect(() => {
        getInvoices();
    }, [getInvoices]);

    // const handleInvoiceChange = (_event: any, newValue: InvoiceType | null) => {
    //     setSelectedInvoice(newValue);

    //     if (newValue) {
    //         const newItems: ProcessedReceiptItem[] = newValue.invoiceDetails.map(detail => ({
    //             id: Math.random() * 1000,
    //             item: detail.item.id,
    //             itemName: detail.item.name,
    //             invoiceNo: newValue.invoiceNo,
    //             unit: detail.item.unit,
    //             quantity: detail.quantity,
    //             description: detail.description,
    //             invoiceDetailId: detail.id,
    //             providerId: detail.provider?.id,
    //             providerName: detail.provider?.name || 'N/A',
    //             firm: detail.firm,
    //             orderDetail: detail.orderDetail, // **اضافه شده**
    //         }));
    //         onItemsUpdate(newItems);
    //     } else {
    //         onItemsUpdate([]);
    //     }
    // };

    // src/views/Warehouse/ReceiptItemsTable.tsx
    // ... (imports)

    const handleInvoiceChange = (_event: any, newValue: InvoiceType | null) => {
        setSelectedInvoice(newValue);

        if (newValue) {
            const newItems: ProcessedReceiptItem[] = newValue.invoiceDetails.map(detail => ({
                id: Math.random() * 1000,
                item: detail.item.id,
                itemName: detail.item.name,
                invoiceNo: newValue.invoiceNo,
                unit: detail.item.unit,
                quantity: Number(detail.quantity), // تبدیل رشته به عدد
                description: detail.description,
                invoiceDetailId: Number(detail.id), // تبدیل رشته به عدد
                // اطمینان از اینکه providerId همیشه یک عدد است
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

    const handleEditClick = (item: ProcessedReceiptItem) => {
        setEditingItem(item);
    };

    const handleUpdateChange = (id: number, field: 'quantity' | 'description', value: any) => {
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

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleSaveEdit = () => {
        if (!editingItem) return;
        const currentItem = items.find(i => i.id === editingItem.id);
        if (currentItem && (currentItem.quantity <= 0 || isNaN(currentItem.quantity))) {
            showAlert('Miktar 0\'dan büyük bir sayı olmalıdır.', 'warning');
            return;
        }
        setEditingItem(null);
        showAlert('Ürün başarıyla güncellendi.', 'success');
    };

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Box mb={2}>
                <CustomFormLabel htmlFor="invoice-autocomplete" required>Fatura Seçin</CustomFormLabel>
                <Autocomplete<InvoiceType>
                    id="invoice-autocomplete"
                    options={invoicesList}
                    getOptionLabel={(option) => `${option.invoiceNo} (${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
                    value={selectedInvoice}
                    onChange={handleInvoiceChange}
                    renderInput={(params) => <TextField {...params}
                        label="Fatura" variant="outlined" size="small" />
                    }
                    renderOption={(props, option) => (
                        <Box component="li" {...props}>
                            <Typography>
                                <strong>{option.invoiceNo}</strong> {`(${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
                            </Typography>
                        </Box>
                    )}
                />
            </Box>

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

            <Typography variant="h6" gutterBottom>Eklenen Ürünler</Typography>
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
                            {/* <TableCell>Sipariş Detayı</TableCell>  */}
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
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateChange(item.id, 'quantity', e.target.value)}
                                                InputProps={{ inputProps: { min: 0 } }}
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
                                                onChange={(e) => handleUpdateChange(item.id, 'description', e.target.value)}
                                            />
                                        ) : (
                                            <Typography>{stripHtml(item.description)}</Typography>
                                        )}
                                    </TableCell>
                                    {/* <TableCell>
                                        {item.orderDetail ? (
                                            <Typography variant="body2">
                                                <strong>{item.orderDetail.id}</strong><br />
                                                ({formatDateDisplay(item.orderDetail.createAt)})
                                            </Typography>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell> */}
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
                                <TableCell colSpan={9} align="center">
                                    <Typography variant="subtitle1" color="textSecondary">Hiç ürün eklenmedi.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper >
    );
};

export default ReceiptItemsTable;