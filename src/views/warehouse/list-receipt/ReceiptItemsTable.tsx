
// // src/views/Warehouse/ReceiptItemsTable.tsx
// import React, { useState, useEffect, useCallback } from 'react';
// import {
//     Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
//     TextField, Box, Typography, Autocomplete, Chip, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions
// } from '@mui/material';
// import { IconTrash, IconEdit, IconReload, IconCheck, IconX, IconEyeOff } from '@tabler/icons-react';
// import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
// import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
// import axios from 'axios';
// import server from 'src/assets/address.json';
// import { format } from 'date-fns';
// import { tr } from 'date-fns/locale';
// import {
//     InvoiceType,
//     ProcessedReceiptItem,
//     ReceiptItemsTableProps, // فرض می‌کنیم شامل endedInvoiceReceiptMap: Record<number, number> است
// } from './types';
// import { useNavigate } from 'react-router';

// const stripHtml = (htmlString: string) => {
//     if (!htmlString) return "";
//     const doc = new DOMParser().parseFromString(htmlString, 'text/html');
//     return doc.body.textContent || "";
// };

// const ReceiptItemsTable: React.FC<ReceiptItemsTableProps> = ({
//     items,
//     deletedItems,
//     onItemsUpdate,
//     onItemDelete,
//     onRestoreItem,
//     showAlert,
//     onInvoiceSelect,
//     endedInvoiceIds,
//     getReceipts,
//     endedInvoiceReceiptMap,
//     isInvoiceComboDisabled,
// }) => {
//     const navigate = useNavigate();
//     const [invoicesList, setInvoicesList] = useState<InvoiceType[]>([]);
//     const [allInvoices, setAllInvoices] = useState<InvoiceType[]>([]);
//     const [inactiveInvoices, setInactiveInvoices] = useState<InvoiceType[]>([]);
//     const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
//     const [editingItem, setEditingItem] = useState<ProcessedReceiptItem | null>(null);
//     const [openInactiveModal, setOpenInactiveModal] = useState(false);
//     const { isTooltipGloballyEnabled } = useTooltip();

//     const formatDateDisplay = (dateString: string | null): string => {
//         if (!dateString) return "N/A";
//         try {
//             const date = new Date(dateString);
//             return format(date, 'dd MMMM yyyy', { locale: tr });
//         } catch (e) {
//             return "Geçersiz Tarih";
//         }
//     };

//     /**
//      * فعال‌سازی مجدد فاکتور با ارسال ID رسید مرتبط (همانطور که درخواست شده است).
//      */
//     const handleReactivateInvoice = async (invoice: InvoiceType) => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }

//         // 👈 استخراج ID رسید از Map ارسالی از والد
//         const receiptIdToUpdate = endedInvoiceReceiptMap[Number(invoice.id)];

//         if (!receiptIdToUpdate) {
//             showAlert('Hata: İlgili sonlandırılmış fiş ID bulunamadı.', 'error');
//             return;
//         }

//         showAlert(`Fatura ${invoice.invoiceNo} tekrar listeye ekleniyor...`, 'info');
//         debugger
//         try {
//             // ارسال receiptId و isEnd: false
//             const updateData = { id: Number(receiptIdToUpdate), isEnd: false }; // 👈 ارسال ID رسید
//             const url = server.baseurl + server.warehouse + "update-receipt-is-end";

//             const response = await axios.put(url, updateData, { headers: { "Authorization": `Bearer ${authToken}` } });

//             if (response.data.httpStatusCode === 200) {
//                 showAlert(`Fatura No: ${invoice.invoiceNo} başarıyla aktifleştirildi.`, 'success');

//                 // 1. بستن مودال
//                 setOpenInactiveModal(false);

//                 // 2. رفرش لیست اصلی رسیدها (برای به‌روزرسانی endedInvoiceReceiptMap در والد)
//                 getReceipts();

//                 // 3. رفرش لیست فاکتورهای داخل همین کامپوننت
//                 getInvoices();

//             } else {
//                 showAlert(response.data.message || 'Fiş durumu güncellenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert('Fatura durumu güncellenirken bir hata oluştu.', 'error');
//         }
//     };


//     const getInvoices = useCallback(async () => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.get(server.baseurl + server.initialoperations + "get-invoices",
//                 { headers: { "Authorization": `Bearer ${authToken}` } });

//             if (response.data.httpStatusCode === 200) {
//                 const fetchedInvoices = response.data.data as InvoiceType[];
//                 setAllInvoices(fetchedInvoices);

//             } else {
//                 showAlert(response.data.message || 'Faturalar yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 401) {
//                 localStorage.removeItem('authToken');
//                 showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
//                 navigate("/");
//             } else {
//                 showAlert('Faturalar yüklenirken bir hata oluştu.', 'error');
//             }
//         }
//     }, [showAlert, navigate]);

//     // فیلتر کردن فاکتورها بر اساس لیست endedInvoiceIds دریافتی از والد
//     useEffect(() => {
//         const activeInvoices = allInvoices.filter((invoice: InvoiceType) => {
//             const invoiceId = Number(invoice.id);
//             const isEnded = endedInvoiceIds.includes(invoiceId);

//             return invoice.status === 1 && !isEnded;
//         });

//         const endedInvoices = allInvoices.filter((invoice: InvoiceType) => {
//             const invoiceId = Number(invoice.id);
//             const isEnded = endedInvoiceIds.includes(invoiceId);

//             return invoice.status === 1 && isEnded;
//         });

//         setInvoicesList(activeInvoices);
//         setInactiveInvoices(endedInvoices);
//     }, [allInvoices, endedInvoiceIds]);

//     useEffect(() => {
//         getInvoices();
//     }, [getInvoices]);


//     const handleInvoiceChange = (_event: any, newValue: InvoiceType | null) => {
//         setSelectedInvoice(newValue);
//         onInvoiceSelect(newValue);

//         if (newValue) {
//             const newItems: ProcessedReceiptItem[] = newValue.invoiceDetails.map(detail => ({
//                 id: Math.random() * 1000,
//                 item: detail.item.id,
//                 itemName: detail.item.name,
//                 invoiceNo: newValue.invoiceNo,
//                 unit: detail.item.unit,
//                 quantity: Number(detail.quantity),
//                 description: detail.description,
//                 invoiceDetailId: Number(detail.id),
//                 providerId: detail.provider ? detail.provider.id : 0,
//                 providerName: detail.provider?.name || 'N/A',
//                 firm: detail.firm ?? false,
//                 orderDetail: detail.orderDetail,
//             }));
//             onItemsUpdate(newItems);
//         } else {
//             onItemsUpdate([]);
//         }
//     };

//     const handleEditClick = (item: ProcessedReceiptItem) => {
//         setEditingItem(item);
//     };

//     const handleUpdateChange = (id: number, field: 'quantity' | 'description', value: any) => {
//         if (field === 'quantity') {
//             const numValue = Number(value);
//             if (isNaN(numValue) || numValue < 0) return;
//         }

//         const updatedItems = items.map(item => {
//             if (item.id === id) {
//                 return {
//                     ...item,
//                     [field]: field === 'quantity' ? Number(value) : value
//                 };
//             }
//             return item;
//         });
//         onItemsUpdate(updatedItems);
//     };

//     const handleDeleteClick = (item: ProcessedReceiptItem) => {
//         onItemDelete({ ...item, isDeleted: true });
//         const updatedItems = items.filter(i => i.id !== item.id);
//         onItemsUpdate(updatedItems);
//     };

//     const handleCancelEdit = () => {
//         setEditingItem(null);
//     };

//     const handleSaveEdit = () => {
//         if (!editingItem) return;
//         const currentItem = items.find(i => i.id === editingItem.id);
//         if (currentItem && (currentItem.quantity <= 0 || isNaN(currentItem.quantity))) {
//             showAlert('Miktar 0\'dan büyük bir sayı olmalıdır.', 'warning');
//             return;
//         }
//         setEditingItem(null);
//         showAlert('Ürün başarıyla güncellendi.', 'success');
//     };

//     return (
//         <Paper elevation={3} sx={{ p: 2 }}>
//             <Box display="flex" justifyContent="flex-end" mb={1}>
//                 <CustomTooltip title={isTooltipGloballyEnabled ? "Sonlandırılmış (Fişi kesilmiş) faturaları göster" : ""}>
//                     <Button
//                         variant="outlined"
//                         color="secondary"
//                         onClick={() => setOpenInactiveModal(true)}
//                         disabled={inactiveInvoices.length === 0}
//                         startIcon={<IconEyeOff size={20} />}
//                     >
//                         Sonlandırılmış Faturalar ({inactiveInvoices.length})
//                     </Button>
//                 </CustomTooltip>
//             </Box>
//             <Box mb={2}>
//                 <CustomFormLabel htmlFor="invoice-autocomplete" required>Fatura Seçin</CustomFormLabel>
//                 <Autocomplete<InvoiceType>
//                     id="invoice-autocomplete"
//                     options={invoicesList}
//                     getOptionLabel={(option) => `${option.invoiceNo} (${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
//                     value={selectedInvoice}
//                     onChange={handleInvoiceChange}
//                     isOptionEqualToValue={(option, value) => option.id === value.id}
//                     disabled={isInvoiceComboDisabled}
//                     renderInput={(params) => <TextField {...params}
//                         label="Fatura"
//                         variant="outlined"
//                         size="small"
//                         helperText={isInvoiceComboDisabled ? "Fatura, sonlandırılmış bir fişe bağlıdır ve değiştirilemez." : ""}
//                     />
//                     }
//                     renderOption={(props, option) => (
//                         <Box component="li" {...props}>
//                             <Typography>
//                                 <strong>{option.invoiceNo}</strong> {`(${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
//                             </Typography>
//                         </Box>
//                     )}
//                 />
//             </Box>

//             {deletedItems.length > 0 && (
//                 <Box mb={2} p={2} border="1px solid" borderColor="error.main" borderRadius={2} bgcolor="error.light">
//                     <Typography variant="subtitle2" color="error.dark" mb={1}>Silinen Ürünler:</Typography>
//                     <Stack direction="row" spacing={1} flexWrap="wrap">
//                         {deletedItems.map(item => (
//                             <Chip
//                                 key={item.id}
//                                 label={`${item.itemName} (${item.quantity})`}
//                                 onDelete={() => onRestoreItem(item.id)}
//                                 deleteIcon={<IconReload />}
//                                 color="error"
//                                 variant="outlined"
//                                 sx={{ mb: 1 }}
//                             />
//                         ))}
//                     </Stack>
//                 </Box>
//             )}

//             <Typography variant="h6" gutterBottom>Eklenen Ürünler</Typography>
//             <TableContainer sx={{ maxHeight: 600, overflowY: 'auto' }}>
//                 <Table stickyHeader aria-label="receipt items table">
//                     <TableHead>
//                         <TableRow>
//                             <TableCell>Fatura No</TableCell>
//                             <TableCell>Tedarikçi</TableCell>
//                             <TableCell>Firma</TableCell>
//                             <TableCell>Ürün</TableCell>
//                             <TableCell>Miktar</TableCell>
//                             <TableCell>Birim</TableCell>
//                             <TableCell>Açıklama</TableCell>
//                             <TableCell align="right">İşlemler</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {items.length > 0 ? (
//                             items.map((item) => (
//                                 <TableRow key={item.id}>
//                                     <TableCell>{item.invoiceNo || '-'}</TableCell>
//                                     <TableCell>{item.providerName || '-'}</TableCell>
//                                     <TableCell>{item.firm ? 'Şirket İçi' : 'Şirket Dışı'}</TableCell>
//                                     <TableCell><Typography>{item.itemName || '-'}</Typography></TableCell>
//                                     <TableCell>
//                                         {editingItem?.id === item.id ? (
//                                             <TextField
//                                                 type="number"
//                                                 size="small"
//                                                 value={item.quantity}
//                                                 onChange={(e) => handleUpdateChange(item.id, 'quantity', e.target.value)}
//                                                 InputProps={{ inputProps: { min: 0 } }}
//                                             />
//                                         ) : (
//                                             <Typography>{Number(item.quantity).toFixed(2)}</Typography>
//                                         )}
//                                     </TableCell>
//                                     <TableCell><Typography>{item.unit?.title}</Typography></TableCell>
//                                     <TableCell>
//                                         {editingItem?.id === item.id ? (
//                                             <TextField
//                                                 size="small"
//                                                 multiline
//                                                 rows={1}
//                                                 fullWidth
//                                                 value={item.description}
//                                                 onChange={(e) => handleUpdateChange(item.id, 'description', e.target.value)}
//                                             />
//                                         ) : (
//                                             <Typography>{stripHtml(item.description)}</Typography>
//                                         )}
//                                     </TableCell>
//                                     <TableCell align="right">
//                                         {editingItem?.id === item.id ? (
//                                             <Stack direction="row" spacing={1} justifyContent="flex-end">
//                                                 <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kaydet" : ""}>
//                                                     <IconButton color="success" onClick={handleSaveEdit}>
//                                                         <IconCheck size={20} />
//                                                     </IconButton>
//                                                 </CustomTooltip>
//                                                 <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "İptal" : ""}>
//                                                     <IconButton color="error" onClick={handleCancelEdit}>
//                                                         <IconX size={20} />
//                                                     </IconButton>
//                                                 </CustomTooltip>
//                                             </Stack>
//                                         ) : (
//                                             <Stack direction="row" spacing={1} justifyContent="flex-end">
//                                                 <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü düzenle" : ""}>
//                                                     <IconButton color="primary" onClick={() => handleEditClick(item)}>
//                                                         <IconEdit size={20} />
//                                                     </IconButton>
//                                                 </CustomTooltip>
//                                                 <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü sil" : ""}>
//                                                     <IconButton color="error" onClick={() => handleDeleteClick(item)}>
//                                                         <IconTrash size={20} />
//                                                     </IconButton>
//                                                 </CustomTooltip>
//                                             </Stack>
//                                         )}
//                                     </TableCell>
//                                 </TableRow>
//                             ))
//                         ) : (
//                             <TableRow>
//                                 <TableCell colSpan={8} align="center">
//                                     <Typography variant="subtitle1" color="textSecondary">Lütfen bir fatura seçerek ürün ekleyin.</Typography>
//                                 </TableCell>
//                             </TableRow>
//                         )}
//                     </TableBody>
//                 </Table>
//             </TableContainer>
//             {/* Modal نمایش فاکتورهای غیرفعال */}
//             <Dialog open={openInactiveModal} onClose={() => setOpenInactiveModal(false)} maxWidth="md" fullWidth>
//                 <DialogTitle>Sonlandırılmış Faturalar (Fişi Kesilmiş)</DialogTitle>
//                 <DialogContent dividers>
//                     <TableContainer component={Paper}>
//                         <Table size="small">
//                             <TableHead>
//                                 <TableRow>
//                                     <TableCell><Typography variant="h6">Fatura No</Typography></TableCell>
//                                     <TableCell><Typography variant="h6">Tarih</Typography></TableCell>
//                                     <TableCell align="right"><Typography variant="h6">İşlem</Typography></TableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {inactiveInvoices.length > 0 ? (
//                                     inactiveInvoices.map((invoice) => (
//                                         <TableRow key={invoice.id}>
//                                             <TableCell>{invoice.invoiceNo}</TableCell>
//                                             <TableCell>{formatDateDisplay(invoice.docDate)}</TableCell>
//                                             <TableCell align="right">
//                                                 <CustomTooltip title={isTooltipGloballyEnabled ? "Faturayı aktif listeye geri alın" : ""}>
//                                                     <Button
//                                                         variant="outlined"
//                                                         size="small"
//                                                         color="warning"
//                                                         onClick={() => handleReactivateInvoice(invoice)}
//                                                     >
//                                                         Geri Al
//                                                     </Button>
//                                                 </CustomTooltip>
//                                             </TableCell>
//                                         </TableRow>
//                                     ))
//                                 ) : (
//                                     <TableRow>
//                                         <TableCell colSpan={4} align="center">
//                                             <Typography variant="subtitle1" color="textSecondary">Sonlandırılmış fatura bulunamadı.</Typography>
//                                         </TableCell>
//                                     </TableRow>
//                                 )}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => setOpenInactiveModal(false)}>Kapat</Button>
//                 </DialogActions>
//             </Dialog>
//         </Paper >
//     );
// };

// export default ReceiptItemsTable;


// src/views/Warehouse/ReceiptItemsTable.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Box, Typography, Autocomplete, Chip, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { IconTrash, IconEdit, IconReload, IconCheck, IconX, IconEyeOff } from '@tabler/icons-react';
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

const ReceiptItemsTable: React.FC<ReceiptItemsTableProps> = ({
    items,
    deletedItems,
    onItemsUpdate,
    onItemDelete,
    onRestoreItem,
    showAlert,
    onInvoiceSelect,
    endedInvoiceIds,
    getReceipts,
    endedInvoiceReceiptMap,
    isInvoiceComboDisabled,
}) => {
    const navigate = useNavigate();
    const [invoicesList, setInvoicesList] = useState<InvoiceType[]>([]);
    const [allInvoices, setAllInvoices] = useState<InvoiceType[]>([]);
    const [inactiveInvoices, setInactiveInvoices] = useState<InvoiceType[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
    const [editingItem, setEditingItem] = useState<ProcessedReceiptItem | null>(null);
    const [openInactiveModal, setOpenInactiveModal] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            return format(date, 'dd MMMM yyyy', { locale: tr });
        } catch (e) {
            return "Geçersiz Tarih";
        }
    };

    /**
     * Sonlandırılmış faturayı tekrar aktifleştir (ilgili Receipt ID ile).
     */
    const handleReactivateInvoice = async (invoice: InvoiceType) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }

        const receiptIdToUpdate = endedInvoiceReceiptMap[Number(invoice.id)];

        if (!receiptIdToUpdate) {
            showAlert('Hata: İlgili sonlandırılmış fiş ID bulunamadı.', 'error');
            return;
        }

        showAlert(`Fatura ${invoice.invoiceNo} tekrar listeye ekleniyor...`, 'info');

        try {
            const updateData = { id: Number(receiptIdToUpdate), isEnd: false };
            const url = server.baseurl + server.warehouse + "update-receipt-is-end";

            const response = await axios.put(url, updateData, { headers: { "Authorization": `Bearer ${authToken}` } });

            if (response.data.httpStatusCode === 200) {
                showAlert(`Fatura No: ${invoice.invoiceNo} başarıyla aktifleştirildi.`, 'success');
                setOpenInactiveModal(false);
                getReceipts();
                getInvoices();
            } else {
                showAlert(response.data.message || 'Fiş durumu güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Fatura durumu güncellenirken bir hata oluştu.', 'error');
        }
    };

    /**
     * Faturaları çek:
     *  - YALNIZ faturalar: warehouse !== null
     *  - VE workhouse === null olanlar
     *  - سپس بقیه منطق قبلی (active/ended) اعمال می‌شود.
     */
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

                const filtered = fetchedInvoices.filter(inv => inv?.warehouse !== null && inv?.workhouse === null);

                setAllInvoices(filtered);
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

    // endedInvoiceIds’e göre aktif/sonlandırılmış تفکیک
    useEffect(() => {
        const activeInvoices = allInvoices.filter((invoice: InvoiceType) => {
            const invoiceId = Number(invoice.id);
            const isEnded = endedInvoiceIds.includes(invoiceId);
            return invoice.status === 1 && !isEnded;
        });

        const endedInvoices = allInvoices.filter((invoice: InvoiceType) => {
            const invoiceId = Number(invoice.id);
            const isEnded = endedInvoiceIds.includes(invoiceId);
            return invoice.status === 1 && isEnded;
        });

        setInvoicesList(activeInvoices);
        setInactiveInvoices(endedInvoices);
    }, [allInvoices, endedInvoiceIds]);

    useEffect(() => {
        getInvoices();
    }, [getInvoices]);

    const handleInvoiceChange = (_event: any, newValue: InvoiceType | null) => {
        setSelectedInvoice(newValue);
        onInvoiceSelect(newValue);

        if (newValue) {
            const newItems: ProcessedReceiptItem[] = newValue.invoiceDetails.map(detail => ({
                id: Math.random() * 1000,
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

    const handleEditClick = (item: ProcessedReceiptItem) => {
        setEditingItem(item);
    };

    const handleUpdateChange = (id: number, field: 'quantity' | 'description', value: any) => {
        if (field === 'quantity') {
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < 0) return;
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
            <Box display="flex" justifyContent="flex-end" mb={1}>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sonlandırılmış (Fişi kesilmiş) faturaları göster" : ""}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => setOpenInactiveModal(true)}
                        disabled={inactiveInvoices.length === 0}
                        startIcon={<IconEyeOff size={20} />}
                    >
                        Sonlandırılmış Faturalar ({inactiveInvoices.length})
                    </Button>
                </CustomTooltip>
            </Box>
            <Box mb={2}>
                <CustomFormLabel htmlFor="invoice-autocomplete" required>Fatura Seçin</CustomFormLabel>
                <Autocomplete<InvoiceType>
                    id="invoice-autocomplete"
                    options={invoicesList}
                    getOptionLabel={(option) => `${option.invoiceNo} (${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
                    value={selectedInvoice}
                    onChange={handleInvoiceChange}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    disabled={isInvoiceComboDisabled}
                    renderInput={(params) => <TextField {...params}
                        label="Fatura"
                        variant="outlined"
                        size="small"
                        helperText={isInvoiceComboDisabled ? "Fatura, sonlandırılmış bir fişe bağlıdır ve değiştirilemez." : ""}
                    />
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

            {/* Modal: Sonlandırılmış faturalar */}
            <Dialog open={openInactiveModal} onClose={() => setOpenInactiveModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sonlandırılmış Faturalar (Fişi Kesilmiş)</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><Typography variant="h6">Fatura No</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Tarih</Typography></TableCell>
                                    <TableCell align="right"><Typography variant="h6">İşlem</Typography></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {inactiveInvoices.length > 0 ? (
                                    inactiveInvoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell>{invoice.invoiceNo}</TableCell>
                                            <TableCell>{formatDateDisplay(invoice.docDate)}</TableCell>
                                            <TableCell align="right">
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Faturayı aktif listeye geri alın" : ""}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        color="warning"
                                                        onClick={() => handleReactivateInvoice(invoice)}
                                                    >
                                                        Geri Al
                                                    </Button>
                                                </CustomTooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Sonlandırılmış fatura bulunamadı.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenInactiveModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default ReceiptItemsTable;
