import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
    TextField, Box, Typography, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Button, Chip, Stack,
} from '@mui/material';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
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

interface InvoiceDetailType {
    id: number;
    quantity: number;
    price: string;
    description: string;
    item: ItemType;
}

interface InvoiceType {
    id: number;
    docDate: string;
    recordStatus: number;
    invoiceDetails: InvoiceDetailType[];
    invoiceNo: string;
    status: number;
}

interface ReceiptItem {
    id: number;
    item: string; // Ürün ID'si
    itemName: string; // Yeni: Ürün Adı
    invoiceNo: string; // Yeni: Fatura Numarası
    unit?: UnitType;
    quantity: number;
    description: string;
    invoiceDetailId: number;
}

interface ReceiptItemsTableProps {
    items: ReceiptItem[];
    onAddItem: (newItem: ReceiptItem) => void;
    onRemoveItem: (id: number) => void;
    onUpdateItem: (updatedItem: ReceiptItem) => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const stripHtml = (htmlString: string) => {
    if (!htmlString) return "";
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
};

interface ReceiptItemFormState {
    item: string;
    itemName: string;
    quantity: number;
    description: string;
    unit?: UnitType;
    invoiceDetailId: number | null;
}

const initialFormState: ReceiptItemFormState = {
    item: '',
    itemName: '',
    quantity: 0,
    description: '',
    unit: undefined,
    invoiceDetailId: null
};

const ReceiptItemsTable: React.FC<ReceiptItemsTableProps> = ({
    items,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    showAlert
}) => {
    const [openModal, setOpenModal] = useState(false);
    const [modalContent, setModalContent] = useState('');
    const [newItemForm, setNewItemForm] = useState(initialFormState);
    const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);

    const [invoicesList, setInvoicesList] = useState<InvoiceType[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
    const [invoiceDetailItems, setInvoiceDetailItems] = useState<InvoiceDetailType[]>([]);

    const { isTooltipGloballyEnabled } = useTooltip();

    const getInvoices = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
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

    const handleFormChange = (field: keyof ReceiptItemFormState, value: any) => {
        setNewItemForm(prevForm => {
            let updatedValue = value;
            if (['quantity'].includes(field)) {
                updatedValue = value === '' ? 0 : Number(value);
            }
            return { ...prevForm, [field]: updatedValue };
        });
    };

    const handleAddItemAction = () => {
        if (!newItemForm.invoiceDetailId || !selectedInvoice) {
            showAlert("Lütfen bir fatura ve ürün seçin.", "warning");
            return;
        }

        const newItem: ReceiptItem = {
            id: Date.now(),
            item: newItemForm.item,
            itemName: newItemForm.itemName,
            invoiceNo: selectedInvoice.invoiceNo,
            quantity: Number(newItemForm.quantity),
            description: newItemForm.description,
            unit: newItemForm.unit,
            invoiceDetailId: newItemForm.invoiceDetailId
        };
        onAddItem(newItem);
        resetForm();
    };

    const handleUpdateItemAction = () => {
        if (!editingItem || !selectedInvoice) return;

        const updatedItem: ReceiptItem = {
            id: editingItem.id,
            item: newItemForm.item,
            itemName: newItemForm.itemName,
            invoiceNo: selectedInvoice.invoiceNo,
            quantity: Number(newItemForm.quantity),
            description: newItemForm.description,
            unit: newItemForm.unit,
            invoiceDetailId: newItemForm.invoiceDetailId!
        };
        onUpdateItem(updatedItem);
        resetForm();
    };

    const handleEditClick = (item: ReceiptItem) => {
        setEditingItem(item);
        setNewItemForm({
            item: item.item,
            itemName: item.itemName,
            quantity: item.quantity ?? 0,
            description: item.description,
            unit: item.unit,
            invoiceDetailId: item.invoiceDetailId
        });
        const foundInvoice = invoicesList.find(invoice =>
            invoice.invoiceDetails.some(detail => detail.id === item.invoiceDetailId)
        );
        if (foundInvoice) {
            setSelectedInvoice(foundInvoice);
            setInvoiceDetailItems(foundInvoice.invoiceDetails);
        }
    };

    const resetForm = () => {
        setEditingItem(null);
        setNewItemForm(initialFormState);
        setSelectedInvoice(null);
        setInvoiceDetailItems([]);
    };

    // const handleOpenModal = (content: string) => {
    //     setModalContent(stripHtml(content));
    //     setOpenModal(true);
    // };

    const handleCloseModal = () => {
        setOpenModal(false);
        setModalContent('');
    };

    const handleInvoiceChange = (_event: any, newValue: InvoiceType | null) => {
        setSelectedInvoice(newValue);
        setNewItemForm(initialFormState);
        if (newValue) {
            setInvoiceDetailItems(newValue.invoiceDetails);
        } else {
            setInvoiceDetailItems([]);
        }
    };

    const handleItemChange = (_event: any, newValue: InvoiceDetailType | null) => {
        if (newValue) {
            setNewItemForm({
                ...newItemForm,
                item: newValue.item.id,
                itemName: newValue.item.name,
                quantity: Number(newValue.quantity),
                description: newValue.description,
                unit: newValue.item.unit,
                invoiceDetailId: newValue.id
            });
        } else {
            setNewItemForm(initialFormState);
        }
    };

    // Filtrelenmiş ürün listesini oluştur
    const availableInvoiceDetails = useMemo(() => {
        if (!selectedInvoice) return [];
        const addedDetailIds = new Set(items.map(i => i.invoiceDetailId));
        return invoiceDetailItems.filter(detail =>
            !addedDetailIds.has(detail.id) || (editingItem && detail.id === editingItem.invoiceDetailId)
        );
    }, [invoiceDetailItems, items, editingItem, selectedInvoice]);

    const isFormValid = !!selectedInvoice && !!newItemForm.item && newItemForm.quantity > 0 && !!newItemForm.invoiceDetailId;

    return (
        <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>{editingItem ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="invoice-autocomplete" required>
                        Fatura Seçin
                    </CustomFormLabel>
                    <Autocomplete<InvoiceType>
                        id="invoice-autocomplete"
                        options={invoicesList}
                        getOptionLabel={(option) => `${option.invoiceNo} (${format(new Date(option.docDate), 'dd MMMM yyyy', { locale: tr })})`}
                        value={selectedInvoice}
                        onChange={handleInvoiceChange}
                        renderInput={(params) => <TextField {...params} label="Fatura" variant="outlined" size="small" />}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel htmlFor="item-autocomplete" required>
                        Ürün Seçin
                    </CustomFormLabel>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Autocomplete<InvoiceDetailType>
                            id="item-autocomplete"
                            // `options` olarak filtrelenmiş listeyi kullan
                            options={availableInvoiceDetails}
                            getOptionLabel={(option) => option.item.name}
                            value={availableInvoiceDetails.find(i => String(i.item.id) === String(newItemForm.item)) || null}
                            onChange={handleItemChange}
                            sx={{ flexGrow: 1 }}
                            renderInput={(params) => <TextField {...params} label="Ürün Seçin" variant="outlined" size="small" />}
                            disabled={!selectedInvoice}
                        />
                        {newItemForm.unit?.title && (
                            <Chip label={newItemForm.unit.title} color="secondary" variant="outlined" />
                        )}
                    </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
                        <Button variant="contained" color="info" onClick={handleUpdateItemAction} disabled={!isFormValid}>
                            Düzenle
                        </Button>
                        <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                    </Stack>
                ) : (
                    <Button variant="contained" startIcon={<IconPlus />} onClick={handleAddItemAction} disabled={!isFormValid}>
                        Ürün Ekle
                    </Button>
                )}
            </Box>

            <Typography variant="h6" gutterBottom>Eklenen Ürünler</Typography>
            <TableContainer sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <Table stickyHeader aria-label="receipt items table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Fatura No</TableCell>
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
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Typography>{item.itemName || '-'}</Typography>
                                            {item.unit?.title && (
                                                <Chip label={item.unit.title} color="secondary" variant="outlined" />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell><Typography>{Number(item.quantity).toFixed(2)}</Typography></TableCell>
                                    <TableCell><Typography>{item.unit?.title}</Typography></TableCell>
                                    <TableCell><Typography>{stripHtml(item.description)}</Typography></TableCell>
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
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
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
        </Paper>
    );
};

export default ReceiptItemsTable;