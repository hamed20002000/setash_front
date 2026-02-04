// src/views/project/transmissions/SelectProductTypeModal.tsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Autocomplete, Stack, Typography,
} from '@mui/material';
import { SelectOption } from './types';

interface SelectProductTypeModalProps {
    open: boolean;
    onClose: () => void;
    onSelectProductType: (productType: SelectOption) => void;
    onRegisterNewProductType: (name: string, type: number) => Promise<void>;
    showAlert: (message: string, severity: "success" | "error" | "warning" | "info") => void;

    availableProductTypeOptions: SelectOption[];
}

const SelectProductTypeModal: React.FC<SelectProductTypeModalProps> = ({
    open,
    onClose,
    onSelectProductType,
    availableProductTypeOptions,
}) => {
    const [selectedOption, setSelectedOption] = useState<SelectOption | null>(null);


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
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Mevcut ürün tiplerinden Seç"
                                variant="outlined"
                            />
                        )}
                    />

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