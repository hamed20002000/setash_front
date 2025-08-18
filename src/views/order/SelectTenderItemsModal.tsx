// src/components/tender/SelectTenderItemsModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    FormControl, InputLabel, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Alert, Box, Paper
} from '@mui/material';
import axios from 'axios';
import server from '../../assets/address.json';

interface TenderType { id: string; title: string; recordStatus: number; createAt: string; }
interface OrderItem {
    id: number;
    item: string;
    quantity: number;
    description: string;
    isEditing: boolean;
    unit?: UnitType;
    isRegistered?: boolean;
    price?: number;
}
interface UnitType { id: string; title: string; recordStatus: number; createAt: string; }
interface ItemType { id: string; name: string; description: string; abbreviation: string; recordStatus: number; weight: number | null; createAt: string; unit: UnitType; status: string; }

interface SelectTenderItemsModalProps {
    open: boolean;
    onClose: () => void;
    onSelectItems: (items: OrderItem[]) => void;
    tendersList: TenderType[];
    itemsList: ItemType[];
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const SelectTenderItemsModal: React.FC<SelectTenderItemsModalProps> = ({
    open,
    onClose,
    onSelectItems,
    tendersList,
    itemsList,
    showAlert
}) => {
    const [selectedTender, setSelectedTender] = useState<string>('');
    const [tenderItems, setTenderItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Fetch items for the selected tender
    useEffect(() => {
        if (selectedTender) {
            const fetchTenderItems = async () => {
                setLoading(true);
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    showAlert('Oturumunuzun süresi doldu veya yetkiniz yok.', 'error');
                    setLoading(false);
                    return;
                }
                debugger
                try {
                    const response = await axios.get(
                        `${server.baseurl + server.initialoperations}get-tender-by-id/${Number(selectedTender)}`,
                        { headers: { 'Authorization': `Bearer ${authToken}` } }
                    );

                    if (response.data.httpStatusCode === 200 && response.data.data) {
                        const allTenderDetails = response.data.data.tenderCategories
                            .flatMap((category: any) => category.tenderDetails);

                        const parsedItems: OrderItem[] = [];

                        allTenderDetails.forEach((detail: any, index: number) => {
                            // ✅ فیلتر کردن بر اساس ourProcuredItemQuantities
                            if (detail.ourProcuredItemQuantities && Number(detail.ourProcuredItemQuantities) > 0) {
                                // ✅ قیمت را از ourProcuredItemPrice استخراج کرده و کاراکتر '$' و ',' را حذف می‌کنیم


                                // const fullItem = itemsList.find(i => i.id === detail.item.id);
                                // 👈 اینجا تغییرات اعمال شده است
                                const tenderItemId = String(detail.item.id);
                                console.log('Tender Item ID:', tenderItemId);

                                const fullItem = itemsList.find(i => String(i.id) === tenderItemId);

                                // 👈 این خط را برای دیباگ کردن اضافه کنید
                                console.log('Found in itemsList:', !!fullItem);

                                parsedItems.push({
                                    id: Date.now() + index,
                                    item: fullItem ? fullItem.id : detail.item.id,
                                    quantity: Number(detail.ourProcuredItemQuantities),
                                    description: '',
                                    isEditing: false,
                                    unit: fullItem ? fullItem.unit : detail.item.unit,
                                    isRegistered: !!fullItem,
                                    price: 0, // ✅ قیمت اضافه شد
                                });
                            }
                        });

                        setTenderItems(parsedItems);
                    } else {
                        showAlert(response.data.message || 'İhale ürünleri yüklenirken bir hata oluştu.', 'error');
                    }
                } catch (e: any) {
                    showAlert('İhale ürünleri yüklenirken bir hata oluştu.', 'error');
                } finally {
                    setLoading(false);
                }
            };
            fetchTenderItems();
        }
    }, [selectedTender, itemsList, showAlert]);

    const handleConfirm = () => {
        onSelectItems(tenderItems);
        onClose();
        setSelectedTender('');
        setTenderItems([]);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>İhale Ürünlerini Seç</DialogTitle>
            <DialogContent dividers>
                <Box mb={2}>
                    <FormControl fullWidth>
                        <InputLabel>İhale Seçin</InputLabel>
                        <Select
                            value={selectedTender}
                            onChange={(e) => setSelectedTender(e.target.value as string)}
                            label="İhale Seçin"
                        >
                            <MenuItem value=""><em>Yok</em></MenuItem>
                            {tendersList.map((tender) => (
                                <MenuItem key={tender.id} value={tender.id}>{tender.title}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    selectedTender && tenderItems.length > 0 && (
                        <TableContainer component={Paper}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Ürün</TableCell>
                                        <TableCell>ÖLÇÜ</TableCell>
                                        <TableCell>Miktar</TableCell>
                                        <TableCell>Açıklama</TableCell>
                                        <TableCell>Fiyat</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tenderItems.map((item) => {
                                        // ✅ جستجوی نام آیتم بر اساس id
                                        const matchedItem = itemsList.find(i => i.id === String(item.item));
                                        const itemName = matchedItem ? matchedItem.name : item.item;

                                        return (
                                            <TableRow key={item.id}>
                                                {/* ✅ نمایش نام آیتم پیدا شده یا نام پیش‌فرض */}
                                                <TableCell>{itemName}</TableCell>
                                                <TableCell>{item.unit?.title}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{item.description}</TableCell>
                                                <TableCell>{item.price}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )
                )}
                {selectedTender && !loading && tenderItems.length === 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>Seçilen ihalede hiç ürün bulunamadı.</Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">İptal Et</Button>
                <Button onClick={handleConfirm} color="primary" disabled={tenderItems.length === 0}>Ekle</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SelectTenderItemsModal;