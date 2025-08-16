// src/views/works/WorkItemInputForm.tsx

import { useState, useEffect, useRef } from 'react';
import {
    FormControl, InputLabel, Select, MenuItem as MuiMenuItem,
    TextField, Button, Stack, Box, Typography, InputAdornment, IconButton,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    ListSubheader, Grid,
} from '@mui/material';
import { IconPlus, IconSearch, IconX, IconEdit, IconTrash } from '@tabler/icons-react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import BlankCard from 'src/components/shared/BlankCard';

interface WorkItemDetail {
    id: string;
    tempId: string;
    name: string;
    value: string;
}

export interface AvailableItemOption {
    id: string;
    name: string;
    unit?: string;
}

interface WorkItemInputFormProps {
    availableItems: AvailableItemOption[];
    onAddItem: (item: WorkItemDetail) => void;
    itemsToRegister: WorkItemDetail[];
    onRemoveItem: (tempId: string) => void;
    onEditItem: (tempId: string | null) => void;
    itemToEdit: WorkItemDetail | null;
    loadingAvailableItems?: boolean;
}

const WorkItemInputForm: React.FC<WorkItemInputFormProps> = ({
    availableItems,
    onAddItem,
    itemsToRegister,
    onRemoveItem,
    onEditItem,
    itemToEdit,
    loadingAvailableItems = false,
}) => {
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [inputValue, setInputValue] = useState<string>('');
    const [itemSearchTerm, setItemSearchTerm] = useState<string>('');
    const [itemError, setItemError] = useState<boolean>(false);
    const [itemHelperText, setItemHelperText] = useState<string>('');
    const [valueError, setValueError] = useState<boolean>(false);
    const [valueHelperText, setValueHelperText] = useState<string>('');
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [itemToDeleteTempId, setItemToDeleteTempId] = useState<string | null>(null);
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLDivElement>(null);

    const [selectedItemUnit, setSelectedItemUnit] = useState<string | undefined>('');

    useEffect(() => {
        if (itemToEdit) {
            setSelectedItemId(itemToEdit.id);
            setInputValue(itemToEdit.value);
            const item = availableItems.find(i => i.id === itemToEdit.id);
            setSelectedItemUnit(item?.unit);
            setItemSearchTerm('');
            setIsSelectOpen(false);
        } else {
            setSelectedItemId('');
            setInputValue('');
            setSelectedItemUnit('');
            setItemSearchTerm('');
            setItemError(false);
            setItemHelperText('');
            setValueError(false);
            setValueHelperText('');
        }
    }, [itemToEdit, availableItems]);

    useEffect(() => {
        if (isSelectOpen && searchInputRef.current) {
            const currentCursorPosition = searchInputRef.current.selectionStart;
            searchInputRef.current.focus();
            if (currentCursorPosition !== null) {
                searchInputRef.current.setSelectionRange(currentCursorPosition, currentCursorPosition);
            }
        }
    }, [isSelectOpen, itemSearchTerm]);

    const handleAddOrUpdateClick = () => {
        let hasError = false;
        if (!selectedItemId) {
            setItemError(true);
            setItemHelperText('Lütfen bir öğe seçin!');
            hasError = true;
        } else {
            setItemError(false);
            setItemHelperText('');
        }
        if (!inputValue.trim()) {
            setValueError(true);
            setValueHelperText('Lütfen bir miktar girin!');
            hasError = true;
        } else {
            setValueError(false);
            setValueHelperText('');
        }
        if (hasError) {
            return;
        }
        const selectedItem = availableItems.find(item => item.id === selectedItemId);
        if (selectedItem) {
            const newItemDetail: WorkItemDetail = {
                id: selectedItem.id,
                name: selectedItem.name,
                value: inputValue.trim(),
                tempId: itemToEdit ? itemToEdit.tempId : String(Date.now()),
            };
            onAddItem(newItemDetail);
            setSelectedItemId('');
            setInputValue('');
            setSelectedItemUnit('');
            setItemSearchTerm('');
            setIsSelectOpen(false);
        }
    };

    const filteredAvailableItems = availableItems.filter(item =>
        item.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );

    const selectableItems = filteredAvailableItems.filter(
        (availableItem) => {
            const isRegistered = itemsToRegister.some(
                (registeredItem) =>
                    registeredItem.id === availableItem.id &&
                    (!itemToEdit || registeredItem.tempId !== itemToEdit.tempId)
            );
            return !isRegistered;
        }
    );

    const handleOpenDeleteConfirm = (tempId: string) => {
        setItemToDeleteTempId(tempId);
        setOpenDeleteConfirm(true);
    };

    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setItemToDeleteTempId(null);
    };

    const handleConfirmDelete = () => {
        if (itemToDeleteTempId) {
            onRemoveItem(itemToDeleteTempId);
            onEditItem(null);
        }
        handleCloseDeleteConfirm();
    };

    return (
        <BlankCard sx={{ p: 1, mb: 3 }}>
            <Stack spacing={2} sx={{ p: 2 }}>
                <CustomFormLabel>Öğe ve Miktar Ekle</CustomFormLabel>

                {/* ✅ تغییرات برای نمایش واحد و طرح‌بندی مطابق با عکس */}
                <Grid container spacing={2} alignItems="flex-end">
                    {/* کمبو باکس (Öğe Seçin) */}
                    <Grid item xs={12} sm={8}>
                        <FormControl fullWidth error={itemError}>
                            <InputLabel id="select-item-label">Öğe Seçin</InputLabel>
                            <Select
                                labelId="select-item-label"
                                id="select-item"
                                value={selectedItemId}
                                label="Öğe Seçin"
                                onChange={(e) => {
                                    const newId = e.target.value as string;
                                    const selectedItem = availableItems.find(item => item.id === newId);
                                    setSelectedItemId(newId);
                                    setSelectedItemUnit(selectedItem?.unit);
                                    if (itemError) {
                                        setItemError(false);
                                        setItemHelperText('');
                                    }
                                }}
                                open={isSelectOpen}
                                onOpen={() => {
                                    setIsSelectOpen(true);
                                    setTimeout(() => {
                                        if (searchInputRef.current) {
                                            searchInputRef.current.focus();
                                        }
                                    }, 50);
                                }}
                                onClose={() => {
                                    setIsSelectOpen(false);
                                    setItemSearchTerm('');
                                }}
                                MenuProps={{
                                    sx: { maxHeight: 300 },
                                    PaperProps: {
                                        sx: {
                                            "& .MuiListSubheader-root": {
                                                padding: 0
                                            }
                                        }
                                    },
                                    MenuListProps: {
                                        subheader: (
                                            <ListSubheader disableSticky sx={{ p: 1, pb: 0 }}>
                                                <TextField
                                                    autoFocus
                                                    fullWidth
                                                    placeholder="Öğe Ara..."
                                                    value={itemSearchTerm}
                                                    onChange={(e) => setItemSearchTerm(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                    InputProps={{
                                                        startAdornment: (
                                                            <InputAdornment position="start">
                                                                <IconSearch size={20} />
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                    size="small"
                                                    inputRef={searchInputRef}
                                                />
                                            </ListSubheader>
                                        )
                                    }
                                }}
                                disabled={!!itemToEdit || loadingAvailableItems}
                                size="small"
                                ref={selectRef}
                            >
                                {loadingAvailableItems ? (
                                    <MuiMenuItem disabled>Yükleniyor...</MuiMenuItem>
                                ) : (
                                    selectableItems.length > 0 ? (
                                        selectableItems.map((item) => (
                                            <MuiMenuItem key={item.id} value={item.id}>
                                                {item.name}
                                            </MuiMenuItem>
                                        ))
                                    ) : (
                                        <MuiMenuItem disabled>Hiç öğe bulunamadı.</MuiMenuItem>
                                    )
                                )}
                                {itemToEdit && (
                                    <MuiMenuItem key={itemToEdit.id} value={itemToEdit.id} disabled>
                                        {itemToEdit.name} (Düzenleniyor)
                                    </MuiMenuItem>
                                )}
                            </Select>
                            {itemHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{itemHelperText}</Typography>}
                        </FormControl>
                    </Grid>

                    {/* فیلد مقدار، واحد و دکمه‌ها در یک ردیف */}
                    <Grid item xs={12} sm={4}>
                        <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ flexGrow: 1 }}>

                            {selectedItemUnit && (
                                <Typography variant="body1" sx={{ pb: 1.5 }}>
                                    {selectedItemUnit}
                                </Typography>
                            )}
                            <TextField
                                label="Miktar"
                                variant="outlined"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (valueError && e.target.value.trim()) {
                                        setValueError(false);
                                        setValueHelperText('');
                                    }
                                }}
                                error={valueError}
                                helperText={valueHelperText}
                                sx={{ width: 100 }} // ✅ اندازه ثابت برای Miktar
                                size="small"
                            />

                            <Button
                                variant="contained"
                                color={itemToEdit ? "info" : "secondary"}
                                onClick={handleAddOrUpdateClick}
                                sx={{ minWidth: 40, height: 40, p: 0 }}
                            >
                                {itemToEdit ? <IconEdit size={20} /> : <IconPlus size={20} />}
                            </Button>
                            {itemToEdit && (
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => onEditItem(null)}
                                    sx={{ minWidth: 40, height: 40, p: 0 }}
                                >
                                    <IconX size={20} />
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>

                {itemsToRegister.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="subtitle1" mb={1}>Eklenen Öğeler:</Typography>
                        <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            p: 1,
                            border: '1px dashed #ccc',
                            borderRadius: '4px',
                            minHeight: '60px',
                            alignItems: 'flex-start'
                        }}>
                            {itemsToRegister.map((item) => {
                                const selectedItem = availableItems.find(i => i.id === item.id);
                                return (
                                    <Box
                                        key={item.tempId}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            backgroundColor: (theme) => itemToEdit && itemToEdit.tempId === item.tempId ? theme.palette.warning.light : theme.palette.info.light,
                                            color: (theme) => itemToEdit && itemToEdit.tempId === item.tempId ? theme.palette.warning.dark : theme.palette.info.dark,
                                            borderRadius: '5px',
                                            px: 1,
                                            py: 0.5,
                                            fontSize: '0.85rem',
                                            gap: 0.5
                                        }}
                                    >
                                        {item.name}: <strong>{item.value}</strong>
                                        {selectedItem?.unit && (
                                            <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
                                                ({selectedItem.unit})
                                            </Typography>
                                        )}
                                        <IconButton
                                            size="small"
                                            onClick={() => onEditItem(item.tempId)}
                                            sx={{ p: 0, ml: 0.5 }}
                                            color="primary"
                                        >
                                            <IconEdit size={16} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleOpenDeleteConfirm(item.tempId)}
                                            sx={{ p: 0 }}
                                            color="error"
                                        >
                                            <IconTrash size={16} />
                                        </IconButton>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Stack>
            <Dialog
                open={openDeleteConfirm}
                onClose={handleCloseDeleteConfirm}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Öğeyi Silmek İstediğinizden Emin Misiniz?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Bu öğeyi listeden kaldırmak istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} color="primary">
                        İptal
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>
        </BlankCard>
    );
};

export default WorkItemInputForm;