// src/views/project/transmissions/SelectProductTypeModal.tsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Autocomplete, Stack, Typography,
} from '@mui/material';
// import { IconPlus } from '@tabler/icons-react';
import { SelectOption } from './types';

interface SelectProductTypeModalProps {
    open: boolean;
    onClose: () => void;
    onSelectProductType: (productType: SelectOption) => void;
    // تابع ثبت گره جدید حالا مسئول اعتبارسنجی نام هم هست
    onRegisterNewProductType: (name: string, type: number) => Promise<void>;
    showAlert: (message: string, severity: "success" | "error" | "warning" | "info") => void;

    // لیست فیلترشده از والد
    availableProductTypeOptions: SelectOption[];
}

const SelectProductTypeModal: React.FC<SelectProductTypeModalProps> = ({
    open,
    onClose,
    onSelectProductType,
    // onRegisterNewProductType,
    // showAlert,
    availableProductTypeOptions,
}) => {
    const [selectedOption, setSelectedOption] = useState<SelectOption | null>(null);
    // const [newProductName, setNewProductName] = useState('');
    // const [isRegistering, setIsRegistering] = useState(false);

    // const handleRegister = async () => {
    //     if (!newProductName.trim()) {
    //         showAlert('Ürün tipi adı boş olamaz.', 'warning');
    //         return;
    //     }

    //     setIsRegistering(true);
    //     try {
    //         await onRegisterNewProductType(newProductName, 1);
    //         onClose();
    //     } catch (error) {
    //         // خطاهای مربوط به API و اعتبارسنجی در کامپوننت والد مدیریت می‌شود
    //     } finally {
    //         setIsRegistering(false);
    //     }
    // };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Ürün Tipi Ekle</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body1" mb={2}>Mevcut bir ürün tipi seçin veya yeni bir tane kaydedin.</Typography>
                <Stack spacing={2}>
                    <Autocomplete
                        options={availableProductTypeOptions}
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedOption}
                        onChange={(_, newValue) => setSelectedOption(newValue)}
                        // disabled={isRegistering}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Mevcut ürün tiplerinden Seç"
                                variant="outlined"
                            />
                        )}
                    />
                    {/* <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                            label="Yeni ürün tipi adı"
                            fullWidth
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            disabled={isRegistering}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleRegister}
                            disabled={!newProductName.trim() || isRegistering}
                        >
                            {isRegistering ? <CircularProgress size={24} color="inherit" /> : <IconPlus />}
                        </Button>
                    </Stack> */}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="error" variant="outlined">İptal</Button>
                <Button
                    onClick={() => selectedOption && onSelectProductType(selectedOption)}
                    color="primary"
                    variant="contained"
                    disabled={!selectedOption}
                >
                    Seç ve Ekle
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SelectProductTypeModal;