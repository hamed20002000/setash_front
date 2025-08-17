// src/views/tender/AddTransmissionDetailsModal.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Stack, TextField, Autocomplete, RadioGroup, FormControlLabel,
    Radio, IconButton, Box, Chip, Typography
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';

import { MapNode, SelectOption, AddedItem, MiktarTipi, ItemType } from './types';

interface AddTransmissionDetailsModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (fromNode: MapNode, toNode: MapNode, distance: number, miktarTipi: MiktarTipi, formulaTitle: string, addedItems: AddedItem[]) => void;
    fromNode: MapNode | null;
    toNode: MapNode | null;
    itemsList: ItemType[];
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const getInitialDistance = (fromNode: MapNode | null, toNode: MapNode | null) => {
    if (!fromNode || !toNode) return '';
    const x1 = fromNode.x || 0;
    const y1 = fromNode.y || 0;
    const x2 = toNode.x || 0;
    const y2 = toNode.y || 0;
    const distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    return distance.toFixed(2);
};

const AddTransmissionDetailsModal: React.FC<AddTransmissionDetailsModalProps> = ({
    open,
    onClose,
    onSave,
    fromNode,
    toNode,
    itemsList,
    showAlert
}) => {
    const [distance, setDistance] = useState<string>('');
    type FormMiktarTipi = 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG'; // ✅ یک نوع جدید تعریف می‌کنیم
    const [miktarTipi, setMiktarTipi] = useState<FormMiktarTipi>('Yeni YG'); // ✅ از نوع جدید استفاده می‌کنیم
    const [formulaTitle, setFormulaTitle] = useState<string>('');
    const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<SelectOption | null>(null);
    const [itemQuantity, setItemQuantity] = useState<string>('');

    // این useEffect مقدار distance را هنگام باز شدن مدال تنظیم می‌کند.
    // این کار از خطای "Cannot read properties of undefined" جلوگیری می‌کند.
    React.useEffect(() => {
        if (fromNode && toNode) {
            setDistance(getInitialDistance(fromNode, toNode));
        } else {
            setDistance('');
        }
    }, [fromNode, toNode]);

    const availableItems = useMemo(() => {
        const addedItemIds = new Set(addedItems.map(item => item.id));
        return itemsList.filter(item => !addedItemIds.has(item.id)).map(item => ({
            id: item.id,
            name: item.name,
            // اگر ویژگی‌های دیگری در SelectOption دارید، اینجا اضافه کنید
            unit: item.unit,
            weight: item.weight,
            productTypeId: '', // یک مقدار پیش‌فرض
            label: '', // یک مقدار پیش‌فرض
            parent: null, // یک مقدار پیش‌فرض
        }));
    }, [itemsList, addedItems]);

    const handleAddItem = useCallback(() => {
        if (!selectedItem || !itemQuantity || parseFloat(itemQuantity) <= 0) {
            showAlert('Lütfen bir öğe ve geçerli bir miktar seçin.', 'warning');
            return;
        }

        const itemToAdd = itemsList.find(item => item.id === selectedItem.id);

        const newAddedItem: AddedItem = {
            id: selectedItem.id,
            name: selectedItem.name,
            quantity: parseFloat(itemQuantity),
            miktarTipi: miktarTipi,
            unit: itemToAdd?.unit,
        };

        setAddedItems(prev => [...prev, newAddedItem]);
        setSelectedItem(null);
        setItemQuantity('');
    }, [selectedItem, itemQuantity, showAlert, addedItems, miktarTipi, itemsList]);

    const handleSave = () => {
        if (!fromNode || !toNode || !distance) {
            showAlert('Lütfen tüm alanları doldurun.', 'warning');
            return;
        }
        onSave(fromNode, toNode, parseFloat(distance), miktarTipi, formulaTitle, addedItems);
    };

    const handleDeleteAddedItem = (itemId: string) => {
        setAddedItems(prev => prev.filter(item => item.id !== itemId));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Yeni İletim Detayları</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Box>
                        <CustomFormLabel>Kaynak ve Hedef</CustomFormLabel>
                        <TextField
                            fullWidth
                            size="small"
                            value={`${fromNode?.name || ''} -> ${toNode?.name || ''}`}
                            disabled
                        />
                    </Box>
                    <Box>
                        <CustomFormLabel>Mesafe</CustomFormLabel>
                        <TextField
                            fullWidth
                            size="small"
                            type="number"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <CustomFormLabel component="legend">Miktar Tipi</CustomFormLabel>
                        <RadioGroup row name="miktar-tipi" value={miktarTipi} onChange={(e) => setMiktarTipi(e.target.value as FormMiktarTipi)}>
                            <FormControlLabel value="Yeni YG" control={<Radio size="small" />} label="Yeni YG" />
                            <FormControlLabel value="Yeni AG" control={<Radio size="small" />} label="Yeni AG" />
                            <FormControlLabel value="DMM YG" control={<Radio size="small" />} label="DMM YG" />
                            <FormControlLabel value="DMM AG" control={<Radio size="small" />} label="DMM AG" />
                        </RadioGroup>
                    </Box>
                    <Box>
                        <CustomFormLabel>Formül Başlığı</CustomFormLabel>
                        <TextField
                            fullWidth
                            size="small"
                            value={formulaTitle}
                            onChange={(e) => setFormulaTitle(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <CustomFormLabel>Öğe ve Miktar Ekle</CustomFormLabel>
                        <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                            <Autocomplete
                                id="item-select"
                                options={availableItems}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                value={selectedItem}
                                onChange={(_e, newValue) => setSelectedItem(newValue)}
                                renderInput={(params) => <TextField {...params} label="Öğe Seçin" variant="outlined" size="small" />}
                                sx={{ flexGrow: 1 }}
                            />
                            {selectedItem && selectedItem.unit && ( // ✅ اضافه کردن شرط وجود selectedItem.unit
                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                    {selectedItem.unit.title}
                                </Typography>
                            )}
                            <TextField
                                label="Miktar"
                                type="number"
                                size="small"
                                value={itemQuantity}
                                onChange={(e) => setItemQuantity(e.target.value)}
                                sx={{ width: 100 }}
                            />
                            <IconButton color="primary" onClick={handleAddItem} disabled={!selectedItem || !itemQuantity}>
                                <IconPlus size={20} />
                            </IconButton>
                        </Stack>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                            {addedItems.map(item => (
                                <Chip
                                    key={item.id}
                                    label={`${item.name} (${item.quantity})`}
                                    onDelete={() => handleDeleteAddedItem(item.id)}
                                    color="secondary"
                                />
                            ))}
                        </Box>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="error">İptal</Button>
                <Button onClick={handleSave} color="primary" variant="contained">Kaydet</Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddTransmissionDetailsModal;