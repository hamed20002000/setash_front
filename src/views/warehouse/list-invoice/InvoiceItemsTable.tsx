

// import React, { useState, useEffect } from 'react';
// import {
//     Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
//     TextField, Box, Typography, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
//     Grid, Button, Chip, Stack
// } from '@mui/material';
// import { IconTrash, IconEye, IconEdit, IconCheck, IconRotate2, IconReload } from '@tabler/icons-react';
// import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
// import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
// import axios from 'axios';
// import server from 'src/assets/address.json';
// import { format } from 'date-fns';
// import { tr } from 'date-fns/locale';

// // Type Definitions
// interface UnitType {
//     id: string;
//     title: string;
//     recordStatus: number;
//     createAt: string;
// }

// interface ItemType {
//     id: string;
//     name: string;
//     abbreviation: string;
//     recordStatus: number;
//     unit: UnitType;
// }

// interface ProviderType {
//     id: number;
//     name: string;
//     firm: string; // '1' for true, '0' for false (based on original usage)
//     recordStatus: number;
// }

// interface InvoiceDetailFromApi {
//     id: string;
//     quantity: string;
//     price: string;
//     discountPercent: string;
//     discountAmount: string;
//     description: string;
//     firm: boolean;
//     item: ItemType;
//     orderDetail?: { id: string; quantity: string; price: string; } | null;
//     provider: ProviderType;
// }

// interface InvoiceSourceType { // Represents the Invoice data returned by the new API
//     id: string;
//     invoiceNo: string;
//     docDate: string;
//     status: number; // 0: Beklemede, 1: Onaylandı, 2: Reddedildi
//     warehouse?: { id: string; name: string; } | null;
//     invoiceDetails: InvoiceDetailFromApi[];
// }

// interface InvoiceItem {
//     id: number;
//     item: string; // Item ID
//     unit?: UnitType;
//     quantity: number;
//     price: number;
//     discountPercent: number;
//     discountAmount: number;
//     description: string;
//     orderDetailId?: string | null;
//     providerId?: number;
//     firm?: boolean;
// }

// interface InvoiceItemsTableProps {
//     items: InvoiceItem[];
//     itemsList: ItemType[];
//     onAddItem: (newItem: InvoiceItem) => void;
//     onRemoveItem: (id: number) => void;
//     onUpdateItem: (updatedItem: InvoiceItem) => void;
//     providersList: ProviderType[];
//     warehouseId: number | null;
// }

// const stripHtml = (htmlString: string) => {
//     if (!htmlString) return "";
//     const doc = new DOMParser().parseFromString(htmlString, 'text/html');
//     return doc.body.textContent || "";
// };

// const cleanAndConvertNumber = (value: string | number | undefined | null): number => {
//     if (value === null || value === undefined) {
//         return 0;
//     }
//     // Remove all non-digit, non-decimal point, non-negative sign characters
//     const cleanedString = String(value).replace(/[^\d.-]/g, '');
//     const numericValue = parseFloat(cleanedString);
//     return isNaN(numericValue) ? 0 : numericValue;
// };

// const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
//     if (priceInput === null || priceInput === undefined) {
//         return '₺0.00';
//     }
//     const cleanedString = String(priceInput).replace(/[$,]/g, '');
//     const numericValue = parseFloat(cleanedString);
//     if (isNaN(numericValue)) {
//         return '₺0.00';
//     }
//     const formattedPrice = numericValue.toLocaleString('en-US', {
//         style: 'currency',
//         currency: 'USD',
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2
//     });
//     return formattedPrice.replace('$', '₺');
// };


// const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
//     items,
//     itemsList,
//     onAddItem,
//     onRemoveItem,
//     onUpdateItem,
//     providersList,
//     warehouseId // <--- De-structure the new prop
// }) => {
//     const [openModal, setOpenModal] = useState(false);
//     const [modalContent, setModalContent] = useState('');
//     const [invoicesSourceList, setInvoicesSourceList] = useState<InvoiceSourceType[]>([]); // Renamed state
//     const [selectedInvoiceSource, setSelectedInvoiceSource] = useState<InvoiceSourceType | null>(null); // Renamed state
//     const [openInvoiceDetailsModal, setOpenInvoiceDetailsModal] = useState(false); // Renamed modal

//     const [deletedItems, setDeletedItems] = useState<InvoiceItem[]>([]);

//     const [editingItems, setEditingItems] = useState<Record<number, Partial<InvoiceItem>>>({});

//     const { isTooltipGloballyEnabled } = useTooltip();

//     // Fetch Invoices by Warehouse ID
//     useEffect(() => {
//         const getInvoicesByWarehouse = async () => {
//             const authToken = localStorage.getItem('authToken');
//             // Only proceed if authenticated and a warehouse is selected
//             if (!authToken || !warehouseId) return;

//             try {
//                 // Using the new API endpoint
//                 const response = await axios.get(
//                     `${server.baseurl}${server.initialoperations}get-invoices-by-warehouse-id/${warehouseId}`,
//                     { headers: { "Authorization": `Bearer ${authToken}` } }
//                 );
//                 debugger
//                 if (response.data.httpStatusCode === 200) {
//                     // Filter: Only approved (status 1) or relevant status invoices should be used as source
//                     const approvedInvoices = response.data.data.filter((invoice: InvoiceSourceType) => invoice.status === 1);
//                     setInvoicesSourceList(approvedInvoices);
//                 } else {
//                     console.error('Kaynak faturalar yüklenirken bir hata oluştu:', response.data.message);
//                 }
//             } catch (e: any) {
//                 console.error('Kaynak faturalar yüklenirken bir hata oluştu:', e);
//             }
//         };
//         getInvoicesByWarehouse();
//     }, [warehouseId]); // Dependency added: re-fetch when warehouseId changes

//     const handleItemChange = (id: number, field: keyof InvoiceItem, value: any) => {
//         setEditingItems(prev => {
//             const updatedItem = {
//                 ...prev[id],
//                 [field]: value
//             };

//             // Logic to update 'firm' status when 'providerId' changes
//             if (field === 'providerId') {
//                 const selectedProvider = providersList.find(p => p.id === value);
//                 if (selectedProvider) {
//                     // ProviderType.firm is string '1'/'0', convert to boolean
//                     updatedItem.firm = selectedProvider.firm === '1';
//                 } else {
//                     updatedItem.firm = false;
//                 }
//             }

//             return {
//                 ...prev,
//                 [id]: updatedItem
//             };
//         });
//     };

//     const handleStartEdit = (item: InvoiceItem) => {
//         setEditingItems(prev => ({
//             ...prev,
//             [item.id]: {
//                 ...item,
//                 providerId: item.providerId || undefined,
//             }
//         }));
//     };

//     const handleSaveEdit = (item: InvoiceItem) => {
//         const editedItem = editingItems[item.id];
//         if (editedItem) {
//             onUpdateItem({
//                 ...item,
//                 ...editedItem as InvoiceItem,
//             });
//             setEditingItems(prev => {
//                 const newEditingItems = { ...prev };
//                 delete newEditingItems[item.id];
//                 return newEditingItems;
//             });
//         }
//     };

//     const isSaveEnabled = (item: InvoiceItem) => {
//         const currentItem = editingItems[item.id] || item;
//         const quantity = cleanAndConvertNumber(currentItem.quantity);
//         const price = cleanAndConvertNumber(currentItem.price);
//         return !!currentItem.providerId && quantity > 0 && price > 0;
//     };

//     const handleRemoveItemWithUndo = (itemToRemove: InvoiceItem) => {
//         setEditingItems(prev => {
//             const newEditingItems = { ...prev };
//             delete newEditingItems[itemToRemove.id];
//             return newEditingItems;
//         });
//         setDeletedItems(prev => [...prev, itemToRemove]);
//         onRemoveItem(itemToRemove.id);
//     };

//     const handleUndoDelete = (itemToRestore: InvoiceItem) => {
//         onAddItem(itemToRestore);
//         setDeletedItems(prev => prev.filter(item => item.id !== itemToRestore.id));
//     };

//     const handleOpenDescriptionModal = (content: string) => { // Renamed handler
//         setModalContent(stripHtml(content));
//         setOpenModal(true);
//     };

//     const handleCloseDescriptionModal = () => { // Renamed handler
//         setOpenModal(false);
//         setModalContent('');
//     };


//     // Handler for changing the source invoice (previously handleOrderChange)
//     const handleInvoiceSourceChange = (_event: any, newValue: InvoiceSourceType | null) => {
//         // Clear current invoice items if a new source invoice is selected
//         if (newValue && items.length > 0) {
//             items.forEach(item => onRemoveItem(item.id));
//         }

//         setSelectedInvoiceSource(newValue);
//         setDeletedItems([]);
//         setEditingItems({});

//         if (newValue) {
//             const newEditingItems: Record<number, Partial<InvoiceItem>> = {};

//             newValue.invoiceDetails.forEach(detail => {
//                 const uniqueId = Date.now() + Math.random();

//                 // 👇🏻 حل مشکل: تبدیل ID تأمین‌کننده از رشته به عدد
//                 const numericProviderId = Number(detail.provider.id);

//                 const itemToAdd: InvoiceItem = {
//                     id: uniqueId,
//                     item: detail.item.id,
//                     quantity: cleanAndConvertNumber(detail.quantity),
//                     price: cleanAndConvertNumber(detail.price),
//                     discountPercent: cleanAndConvertNumber(detail.discountPercent),
//                     discountAmount: cleanAndConvertNumber(detail.discountAmount),
//                     description: detail.description,
//                     unit: detail.item.unit,
//                     orderDetailId: detail.orderDetail?.id || null,
//                     // استفاده از ID تبدیل شده
//                     providerId: numericProviderId,
//                     // "firm" در نمونه API شما boolean است و مستقیماً استفاده می‌شود
//                     firm: detail.firm,
//                 };
//                 onAddItem(itemToAdd);

//                 newEditingItems[uniqueId] = { ...itemToAdd };
//             });
//             setEditingItems(newEditingItems);
//         }
//     };

//     const handleOpenInvoiceDetailsModal = () => { // Renamed modal handler
//         setOpenInvoiceDetailsModal(true);
//     };

//     const handleCloseInvoiceDetailsModal = () => { // Renamed modal handler
//         setOpenInvoiceDetailsModal(false);
//     };

//     const handleResetInvoiceSourceSelection = () => { // Renamed reset handler
//         setSelectedInvoiceSource(null);
//         setEditingItems({});
//         setDeletedItems([]);
//         // This resets the entire invoice item list to zero
//         items.forEach(item => onRemoveItem(item.id));
//     };

//     // Check if item list is empty to control the Autocomplete disabled state
//     const isInvoiceItemsEmpty = items.length === 0;

//     return (
//         <Paper elevation={3} sx={{ p: 2, mt: 3 }} >
//             <Typography variant="h6" gutterBottom>Fatura Ürünleri</Typography>
//             <Grid container spacing={2} sx={{ mb: 2 }}>
//                 <Grid item xs={12}>
//                     <CustomFormLabel htmlFor="invoice-source-autocomplete">
//                         Kaynak Fatura Seçin
//                     </CustomFormLabel>
//                     <Stack direction="row" alignItems="center" spacing={2}>
//                         <Autocomplete<InvoiceSourceType>
//                             id="invoice-source-autocomplete"
//                             options={invoicesSourceList}
//                             getOptionLabel={(option) => `${option.invoiceNo} (${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
//                             value={selectedInvoiceSource}
//                             onChange={handleInvoiceSourceChange}
//                             sx={{ flexGrow: 1 }}
//                             renderInput={(params) => <TextField {...params} label="Kaynak Fatura No" variant="outlined" size="small" />}
//                             disabled={!isInvoiceItemsEmpty} // Disable if items already exist
//                         />
//                         {selectedInvoiceSource && (
//                             <Stack direction="row" alignItems="center" spacing={1}>
//                                 <Button variant="outlined" onClick={handleOpenInvoiceDetailsModal}>Detayları Gör</Button>
//                                 <CustomTooltip title="Kaynak Faturayı Sıfırla">
//                                     <IconButton color="primary" onClick={handleResetInvoiceSourceSelection}>
//                                         <IconRotate2 size={20} />
//                                     </IconButton>
//                                 </CustomTooltip>
//                             </Stack>
//                         )}
//                     </Stack>


//                 </Grid>
//             </Grid>

//             {/* Undo Delete Section */}
//             {deletedItems.length > 0 && (
//                 <Box mb={2} p={2} border="1px solid" borderColor="error.main" borderRadius={2} bgcolor="error.light">
//                     <Typography variant="subtitle2" color="error.dark" mb={1}>Silinen Ürünler (Geri Almak için tıklayın):</Typography>
//                     <Stack direction="row" spacing={1} flexWrap="wrap">

//                         {deletedItems.map((item) => {
//                             const provider = providersList.find(p => p.id === item.providerId);
//                             const itemInfo = itemsList.find(i => i.id === item.item);
//                             return (
//                                 <Chip
//                                     key={item.id}
//                                     label={`${itemInfo?.name} (${provider?.name || 'Tedarikçi Bilinmiyor'})`}
//                                     onDelete={() => handleUndoDelete(item)}
//                                     deleteIcon={<IconReload />}
//                                     color="error"
//                                     variant="outlined"
//                                     sx={{ mb: 1 }}
//                                 />
//                             );
//                         })}
//                     </Stack>
//                 </Box>
//             )}

//             <Typography variant="h6" gutterBottom>Eklenen Ürünler</Typography>
//             <TableContainer sx={{ maxHeight: 600, overflowY: 'auto' }}>
//                 <Table stickyHeader aria-label="invoice items table">
//                     <TableHead>
//                         <TableRow>
//                             <TableCell sx={{ width: '25%' }}>Ürün & Birim</TableCell>
//                             <TableCell sx={{ width: '15%' }}>Miktar & Fiyat</TableCell>
//                             <TableCell sx={{ width: '20%' }}>Tedarikçi & Firm</TableCell>
//                             <TableCell sx={{ width: '15%' }}>İndirimler</TableCell>
//                             <TableCell sx={{ width: '20%' }}>Açıklama</TableCell>
//                             <TableCell sx={{ width: '5%' }} align="right">İşlemler</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {items.length > 0 ? (
//                             items.map((item) => {
//                                 const isEditing = editingItems[item.id] !== undefined;
//                                 const currentItem = isEditing ? editingItems[item.id] : item;
//                                 // Need to search providers list using providerId from the current item being edited or displayed
//                                 const provider = providersList.find(p => p.id === currentItem?.providerId);
//                                 const product = itemsList.find(i => i.id === item.item);

//                                 const quantity = cleanAndConvertNumber(currentItem?.quantity);
//                                 const price = cleanAndConvertNumber(currentItem?.price);
//                                 const providerId = currentItem?.providerId;

//                                 return (
//                                     <TableRow key={item.id}>
//                                         <TableCell>
//                                             <Typography variant="subtitle1" fontWeight="bold">{product?.name || '-'}</Typography>
//                                             <Typography variant="body2" color="textSecondary">{product?.unit?.title || '-'}</Typography>
//                                         </TableCell>
//                                         <TableCell>
//                                             {isEditing ? (
//                                                 <Stack direction="column" spacing={1}>
//                                                     <TextField
//                                                         label="Miktar" type="number" size="small"
//                                                         value={quantity}
//                                                         onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
//                                                         error={!quantity || quantity <= 0}
//                                                         helperText={(!quantity || quantity <= 0) && 'Bu alan zorunludur.'}
//                                                     />
//                                                     <TextField
//                                                         label="Fiyat" type="number" size="small"
//                                                         value={price}
//                                                         onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
//                                                         error={!price || price <= 0}
//                                                         helperText={(!price || price <= 0) && 'Bu alan zorunludur.'}
//                                                     />
//                                                 </Stack>
//                                             ) : (
//                                                 <>
//                                                     <Typography variant="subtitle1" fontWeight="bold">{Number(item.quantity).toFixed(2)}</Typography>
//                                                     <Typography variant="body2" color="textSecondary">{cleanAndFormatPrice(item.price)}</Typography>
//                                                 </>
//                                             )}
//                                         </TableCell>
//                                         <TableCell>
//                                             {isEditing ? (
//                                                 <Stack direction="column" spacing={1}>
//                                                     <Autocomplete<ProviderType>
//                                                         options={providersList}
//                                                         getOptionLabel={(option) => option.name}
//                                                         value={provider || null}
//                                                         onChange={(_event, newValue) => {
//                                                             const newProviderId = newValue ? newValue.id : undefined;
//                                                             handleItemChange(item.id, 'providerId', newProviderId);
//                                                         }}
//                                                         size="small"
//                                                         renderInput={(params) => <TextField {...params} label="Tedarikçi" error={!providerId} helperText={!providerId && 'Bu alan zorunludur.'} />}
//                                                     />
//                                                     {provider && (
//                                                         <Chip
//                                                             label={provider.firm === '1' ? "Şirket İçi" : "Şirket Dışı"}
//                                                             color={provider.firm === '1' ? "primary" : "secondary"}
//                                                             size="small"
//                                                         />
//                                                     )}
//                                                 </Stack>
//                                             ) : (
//                                                 <>
//                                                     <Typography variant="subtitle1" noWrap>{provider?.name || '-'}</Typography>
//                                                     <Chip
//                                                         label={item.firm ? "Şirket İçi" : "Şirket Dışı"}
//                                                         color={item.firm ? "primary" : "secondary"}
//                                                         size="small"
//                                                     />
//                                                 </>
//                                             )}
//                                         </TableCell>
//                                         <TableCell>
//                                             {isEditing ? (
//                                                 <Stack direction="column" spacing={1}>
//                                                     <TextField
//                                                         label="İndirim %" type="number" size="small"
//                                                         value={currentItem?.discountPercent || 0}
//                                                         onChange={(e) => handleItemChange(item.id, 'discountPercent', e.target.value)}
//                                                     />
//                                                     <TextField
//                                                         label="İndirim Miktar" type="number" size="small"
//                                                         value={currentItem?.discountAmount || 0}
//                                                         onChange={(e) => handleItemChange(item.id, 'discountAmount', e.target.value)}
//                                                     />
//                                                 </Stack>
//                                             ) : (
//                                                 <>
//                                                     <Typography variant="subtitle1" noWrap>{Number(item.discountPercent).toFixed(2)}%</Typography>
//                                                     <Typography variant="body2" color="textSecondary">{cleanAndFormatPrice(item.discountAmount)}</Typography>
//                                                 </>
//                                             )}
//                                         </TableCell>
//                                         <TableCell>
//                                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//                                                 {isEditing ? (
//                                                     <TextField
//                                                         label="Açıklama" size="small" fullWidth multiline rows={1}
//                                                         value={currentItem?.description || ''}
//                                                         onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
//                                                     />
//                                                 ) : (
//                                                     <Typography noWrap>{stripHtml(item.description)}</Typography>
//                                                 )}
//                                                 {stripHtml(item.description).length > 20 && !isEditing && (
//                                                     <IconButton size="small" onClick={() => handleOpenDescriptionModal(item.description || '')}>
//                                                         <IconEye size={18} />
//                                                     </IconButton>
//                                                 )}
//                                             </Box>
//                                         </TableCell>
//                                         <TableCell align="right">
//                                             {isEditing ? (
//                                                 <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Değişiklikleri kaydet" : ""}>
//                                                     <span>
//                                                         <IconButton
//                                                             color="success"
//                                                             onClick={() => handleSaveEdit(item)}
//                                                             disabled={!isSaveEnabled(item)}
//                                                         >
//                                                             <IconCheck size={20} />
//                                                         </IconButton>
//                                                     </span>
//                                                 </CustomTooltip>
//                                             ) : (
//                                                 <>
//                                                     <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü düzenle" : ""}>
//                                                         <IconButton color="primary" onClick={() => handleStartEdit(item)}>
//                                                             <IconEdit size={20} />
//                                                         </IconButton>
//                                                     </CustomTooltip>
//                                                     <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ürünü sil" : ""}>
//                                                         <IconButton color="error" onClick={() => handleRemoveItemWithUndo(item)}>
//                                                             <IconTrash size={20} />
//                                                         </IconButton>
//                                                     </CustomTooltip>
//                                                 </>
//                                             )}
//                                         </TableCell>
//                                     </TableRow>
//                                 );
//                             })
//                         ) : (
//                             <TableRow>
//                                 <TableCell colSpan={6} align="center">
//                                     <Typography variant="subtitle1" color="textSecondary">Hiç ürün eklenmedi.</Typography>
//                                 </TableCell>
//                             </TableRow>
//                         )}
//                     </TableBody>
//                 </Table>
//             </TableContainer>

//             {/* Modal for long description text */}
//             <Dialog open={openModal} onClose={handleCloseDescriptionModal} maxWidth="sm" fullWidth>
//                 <DialogTitle>Açıklama</DialogTitle>
//                 <DialogContent dividers>
//                     <Typography>{modalContent}</Typography>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleCloseDescriptionModal}>Kapat</Button>
//                 </DialogActions>
//             </Dialog>

//             {/* Modal for Invoice Source Details (previously Order Details) */}
//             <Dialog open={openInvoiceDetailsModal} onClose={handleCloseInvoiceDetailsModal} maxWidth="md" fullWidth>
//                 <DialogTitle>Kaynak Fatura Detayları</DialogTitle>
//                 <DialogContent dividers>
//                     {selectedInvoiceSource && (
//                         <Box>
//                             <Typography variant="h6" gutterBottom>
//                                 Fatura No: {selectedInvoiceSource.invoiceNo} - Tarih: {format(new Date(selectedInvoiceSource.docDate), 'dd MMMM yyyy', { locale: tr })}
//                                 <Chip
//                                     label={selectedInvoiceSource.status === 1 ? "Onaylandı" : selectedInvoiceSource.status === 2 ? "Reddedildi" : "Beklemede"}
//                                     sx={{ ml: 2 }}
//                                     color={selectedInvoiceSource.status === 1 ? "success" : selectedInvoiceSource.status === 2 ? "error" : "warning"}
//                                     variant="outlined"
//                                 />
//                             </Typography>
//                             <TableContainer component={Paper} sx={{ mt: 2 }}>
//                                 <Table size="small">
//                                     <TableHead>
//                                         <TableRow>
//                                             <TableCell>Ürün</TableCell>
//                                             <TableCell>Tedarikçi</TableCell>
//                                             <TableCell>Miktar</TableCell>
//                                             <TableCell>Birim</TableCell>
//                                             <TableCell>Fiyat</TableCell>
//                                             <TableCell>Açıklama</TableCell>
//                                         </TableRow>
//                                     </TableHead>
//                                     <TableBody>
//                                         {selectedInvoiceSource.invoiceDetails.map((detail) => (
//                                             <TableRow key={detail.id}>
//                                                 <TableCell>{detail.item.name}</TableCell>
//                                                 <TableCell>{detail.provider.name}</TableCell>
//                                                 <TableCell>{Number(detail.quantity).toFixed(2)}</TableCell>
//                                                 <TableCell>{detail.item.unit.title}</TableCell>
//                                                 <TableCell>{cleanAndFormatPrice(detail.price)}</TableCell>
//                                                 <TableCell>{stripHtml(detail.description)}</TableCell>
//                                             </TableRow>
//                                         ))}
//                                     </TableBody>
//                                 </Table>
//                             </TableContainer>
//                         </Box>
//                     )}
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleCloseInvoiceDetailsModal}>Kapat</Button>
//                 </DialogActions>
//             </Dialog>
//         </Paper>
//     );
// };

// export default InvoiceItemsTable;

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

// ===============================
// Type Definitions
// ===============================
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

interface ProviderType {
    id: number;
    name: string;
    firm: string; // '1' | '0'
    recordStatus: number;
}

// ---- Order API types (source) ----
interface OrderDetailType {
    id: string;
    quantity: string | null;
    price: string | null;
    description: string;
    item: ItemType;
}

interface OrderSourceType {
    id: string;
    docDate: string;
    status: number; // 0: Beklemede, 1: Onaylandı, 2: Reddedildi
    orderDetails: OrderDetailType[];
}

// ---- Target table item types ----
interface InvoiceItem {
    id: number;
    item: string; // Item ID
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
    warehouseId: number | null; // دیگر استفاده نمی‌شود؛ برای سازگاری با Props قبلی نگه‌داشتیم
}

// ===============================
// Utils
// ===============================
const stripHtml = (htmlString: string) => {
    if (!htmlString) return "";
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

const cleanAndConvertNumber = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) return 0;
    const cleanedString = String(value).replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
};

const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
    if (priceInput === null || priceInput === undefined) return '₺0.00';
    const cleanedString = String(priceInput).replace(/[$,]/g, '');
    const numericValue = parseFloat(cleanedString);
    if (isNaN(numericValue)) return '₺0.00';
    const formattedPrice = numericValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return formattedPrice.replace('$', '₺');
};

// ===============================
// Component
// ===============================
const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
    items,
    itemsList,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    providersList,
    // warehouseId, 
}) => {
    const [openModal, setOpenModal] = useState(false);
    const [modalContent, setModalContent] = useState('');

    // ---- NEW (orders as source) ----
    const [ordersSourceList, setOrdersSourceList] = useState<OrderSourceType[]>([]);
    const [selectedOrderSource, setSelectedOrderSource] = useState<OrderSourceType | null>(null);
    const [openOrderDetailsModal, setOpenOrderDetailsModal] = useState(false);

    const [deletedItems, setDeletedItems] = useState<InvoiceItem[]>([]);
    const [editingItems, setEditingItems] = useState<Record<number, Partial<InvoiceItem>>>({});

    const { isTooltipGloballyEnabled } = useTooltip();

    // ===============================
    // Fetch Orders (no warehouse dependency)
    // ===============================
    useEffect(() => {
        const getListOrders = async () => {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) return;
            try {
                const response = await axios.get(
                    server.baseurl + server.initialoperations + "get-orders",
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );
                if (response.data?.httpStatusCode === 200) {
                    // Only approved (status === 1) – keep parity with previous logic
                    const approved = (response.data.data as OrderSourceType[]).filter(o => o.status === 1);
                    setOrdersSourceList(approved);
                } else {
                    console.error(response.data?.message || 'Siparişler yüklenirken bir hata oluştu.');
                }
            } catch (e) {
                console.error('Siparişler yüklenirken bir hata oluştu.', e);
            }
        };
        getListOrders();
    }, []);

    // ===============================
    // Editing handlers
    // ===============================
    const handleItemChange = (id: number, field: keyof InvoiceItem, value: any) => {
        setEditingItems(prev => {
            const updatedItem: Partial<InvoiceItem> = {
                ...prev[id],
                [field]: value
            };

            // Auto-set firm by provider
            if (field === 'providerId') {
                const selectedProvider = providersList.find(p => p.id === value);
                if (selectedProvider) {
                    updatedItem.firm = selectedProvider.firm === '1';
                } else {
                    updatedItem.firm = false;
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
                ...(editedItem as InvoiceItem),
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
        setEditingItems(prev => {
            const newEditingItems = { ...prev };
            delete newEditingItems[itemToRemove.id];
            return newEditingItems;
        });
        setDeletedItems(prev => [...prev, itemToRemove]);
        onRemoveItem(itemToRemove.id);
    };

    const handleUndoDelete = (itemToRestore: InvoiceItem) => {
        onAddItem(itemToRestore);
        setDeletedItems(prev => prev.filter(item => item.id !== itemToRestore.id));
    };

    const handleOpenDescriptionModal = (content: string) => {
        setModalContent(stripHtml(content));
        setOpenModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenModal(false);
        setModalContent('');
    };

    // ===============================
    // Order source selection
    // ===============================
    const handleOrderSourceChange = (_event: any, newValue: OrderSourceType | null) => {
        // Clear current invoice items if a new source is selected
        if (newValue && items.length > 0) {
            items.forEach(item => onRemoveItem(item.id));
        }

        setSelectedOrderSource(newValue);
        setDeletedItems([]);
        setEditingItems({});

        if (newValue) {
            const newEditing: Record<number, Partial<InvoiceItem>> = {};

            newValue.orderDetails.forEach(detail => {
                const uniqueId = Date.now() + Math.floor(Math.random() * 1e6);

                const itemToAdd: InvoiceItem = {
                    id: uniqueId,
                    item: detail.item.id,
                    unit: detail.item.unit,
                    quantity: cleanAndConvertNumber(detail.quantity),
                    price: cleanAndConvertNumber(detail.price),
                    discountPercent: 0,
                    discountAmount: 0,
                    description: detail.description || '',
                    orderDetailId: detail.id,
                    providerId: undefined, // orders don't have provider
                    firm: false,
                };

                onAddItem(itemToAdd);
                newEditing[uniqueId] = { ...itemToAdd };
            });

            setEditingItems(newEditing);
        }
    };

    const handleOpenOrderDetailsModal = () => setOpenOrderDetailsModal(true);
    const handleCloseOrderDetailsModal = () => setOpenOrderDetailsModal(false);

    const handleResetOrderSourceSelection = () => {
        setSelectedOrderSource(null);
        setEditingItems({});
        setDeletedItems([]);
        items.forEach(item => onRemoveItem(item.id));
    };

    const isInvoiceItemsEmpty = items.length === 0;

    // ===============================
    // Render
    // ===============================
    return (
        <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>Siparişten Ürün Ekle</Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                    <CustomFormLabel htmlFor="order-source-autocomplete">
                        Kaynak Sipariş Seçin
                    </CustomFormLabel>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Autocomplete<OrderSourceType>
                            id="order-source-autocomplete"
                            options={ordersSourceList}
                            getOptionLabel={(option) => `${option.id} (${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
                            value={selectedOrderSource}
                            onChange={handleOrderSourceChange}
                            sx={{ flexGrow: 1 }}
                            renderInput={(params) => <TextField {...params} label="Kaynak Sipariş" variant="outlined" size="small" />}
                            disabled={!isInvoiceItemsEmpty} // Disable if items already exist
                        />
                        {selectedOrderSource && (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Button variant="outlined" onClick={handleOpenOrderDetailsModal}>Detayları Gör</Button>
                                <CustomTooltip title="Kaynak Siparişi Sıfırla">
                                    <IconButton color="primary" onClick={handleResetOrderSourceSelection}>
                                        <IconRotate2 size={20} />
                                    </IconButton>
                                </CustomTooltip>
                            </Stack>
                        )}
                    </Stack>
                </Grid>
            </Grid>

            {/* Undo Delete Section */}
            {deletedItems.length > 0 && (
                <Box mb={2} p={2} border="1px solid" borderColor="error.main" borderRadius={2} bgcolor="error.light">
                    <Typography variant="subtitle2" color="error.dark" mb={1}>Silinen Ürünler (Geri Almak için tıklayın):</Typography>
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
                                                        value={provider || null}
                                                        onChange={(_event, newValue) => {
                                                            const newProviderId = newValue ? newValue.id : undefined;
                                                            handleItemChange(item.id, 'providerId', newProviderId);
                                                        }}
                                                        size="small"
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                label="Tedarikçi"
                                                                error={!providerId}
                                                                helperText={!providerId && 'Bu alan zorunludur.'}
                                                            />
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
                                                    <IconButton size="small" onClick={() => handleOpenDescriptionModal(item.description || '')}>
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

            {/* Modal for long description text */}
            <Dialog open={openModal} onClose={handleCloseDescriptionModal} maxWidth="sm" fullWidth>
                <DialogTitle>Açıklama</DialogTitle>
                <DialogContent dividers>
                    <Typography>{modalContent}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal}>Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Modal for Order Source Details */}
            <Dialog open={openOrderDetailsModal} onClose={handleCloseOrderDetailsModal} maxWidth="md" fullWidth>
                <DialogTitle>Kaynak Sipariş Detayları</DialogTitle>
                <DialogContent dividers>
                    {selectedOrderSource && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Sipariş No: {selectedOrderSource.id} - Tarih: {format(new Date(selectedOrderSource.docDate), 'dd MMMM yyyy', { locale: tr })}
                                <Chip
                                    label={selectedOrderSource.status === 1 ? "Onaylandı" : selectedOrderSource.status === 2 ? "Reddedildi" : "Beklemede"}
                                    sx={{ ml: 2 }}
                                    color={selectedOrderSource.status === 1 ? "success" : selectedOrderSource.status === 2 ? "error" : "warning"}
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
                                        {selectedOrderSource.orderDetails.map((detail) => (
                                            <TableRow key={detail.id}>
                                                <TableCell>{detail.item.name}</TableCell>
                                                <TableCell>{Number(cleanAndConvertNumber(detail.quantity)).toFixed(2)}</TableCell>
                                                <TableCell>{detail.item.unit?.title}</TableCell>
                                                <TableCell>{cleanAndFormatPrice(detail.price || 0)}</TableCell>
                                                <TableCell>{stripHtml(detail.description || '')}</TableCell>
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
