// src/views/warehouse/list-order/ComparisonModal.tsx

import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper, Box,
    Chip, CircularProgress, Alert, Checkbox
} from '@mui/material';
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import { green, red } from '@mui/material/colors';

interface TenderDetailComparison {
    tenderItemId: string;
    tenderItemName: string;
    tenderItemUnit: string;
    tenderItemQuantity: number;
    warehouseBalance: number;
    isAvailable: boolean;
}

interface ComparisonModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (items: any[]) => void;
    comparisonData: TenderDetailComparison[];
    loading: boolean;
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ open, onClose, onConfirm, comparisonData, loading }) => {
    const [selectedItems, setSelectedItems] = useState<TenderDetailComparison[]>([]);

    React.useEffect(() => {
        if (open) {
            // Select all items by default when the modal opens
            setSelectedItems(comparisonData);
        }
    }, [open, comparisonData]);

    const handleToggleItem = (item: TenderDetailComparison) => {
        setSelectedItems(prev =>
            prev.some(i => i.tenderItemId === item.tenderItemId)
                ? prev.filter(i => i.tenderItemId !== item.tenderItemId)
                : [...prev, item]
        );
    };

    // const handleConfirm = () => {
    //     const confirmedOrderItems = selectedItems.map(item => ({
    //         id: Date.now() + Math.random(), // Unique ID
    //         item: item.tenderItemId,
    //         quantity: item.tenderItemQuantity,
    //         description: '',
    //         isEditing: true,
    //         unit: { id: '', title: item.tenderItemUnit, createAt: '', recordStatus: 0 },
    //         isRegistered: true,
    //         price: 0,
    //     }));
    //     onConfirm(confirmedOrderItems);
    // };

    const handleConfirm = () => {
        // 1. Filter and calculate the needed quantity only for selected items
        const neededItems = selectedItems
            .map(item => {
                const neededQuantity = item.tenderItemQuantity - item.warehouseBalance;

                // 2. Check if there is a deficit
                if (neededQuantity > 0) {
                    return {
                        id: Date.now() + Math.random(), // Unique ID
                        item: item.tenderItemId,
                        quantity: neededQuantity, // Set quantity to the calculated needed amount
                        description: '',
                        isEditing: true,
                        unit: { id: '', title: item.tenderItemUnit, createAt: '', recordStatus: 0 },
                        isRegistered: true,
                        price: 0,
                    };
                }
                return null; // Return null if there is no deficit
            })
            .filter(item => item !== null); // 3. Remove null items from the list

        // 4. Pass the filtered list to the parent component
        onConfirm(neededItems);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Depo ve İhale Karşılaştırma Raporu</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box>
                        {comparisonData.length === 0 ? (
                            <Alert severity="info">
                                Seçilen ihalede veya depoda karşılaştırılabilecek ürün bulunamadı.
                            </Alert>
                        ) : (
                            <TableContainer component={Paper}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={selectedItems.length === comparisonData.length}
                                                    indeterminate={selectedItems.length > 0 && selectedItems.length < comparisonData.length}
                                                    onChange={(_, checked) => setSelectedItems(checked ? comparisonData : [])}
                                                />
                                            </TableCell>
                                            <TableCell>Durum</TableCell>
                                            <TableCell>Ürün Adı</TableCell>
                                            <TableCell>Birim</TableCell>
                                            <TableCell>İhale Miktarı</TableCell>
                                            <TableCell>Depo Stok Miktarı</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {comparisonData.map((item) => (
                                            <TableRow key={item.tenderItemId} sx={{ backgroundColor: item.isAvailable ? green[50] : red[50] }}>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selectedItems.some(i => i.tenderItemId === item.tenderItemId)}
                                                        onChange={() => handleToggleItem(item)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={item.isAvailable ? <IconCircleCheck /> : <IconCircleX />}
                                                        label={item.isAvailable ? "Mevcut" : "Eksik"}
                                                        color={item.isAvailable ? "success" : "error"}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{item.tenderItemName}</TableCell>
                                                <TableCell>{item.tenderItemUnit}</TableCell>
                                                <TableCell>{item.tenderItemQuantity}</TableCell>
                                                <TableCell>{item.warehouseBalance}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">İptal</Button>
                <Button onClick={handleConfirm} variant="contained" disabled={selectedItems.length === 0}>
                    Seçilenleri Ekle
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ComparisonModal;