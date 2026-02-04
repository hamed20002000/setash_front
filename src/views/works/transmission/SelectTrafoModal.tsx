// src/views/project/transmissions/SelectTrafoModal.tsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Autocomplete, Stack, Typography,
} from '@mui/material';
import { SelectOption } from './types';

interface SelectTrafoModalProps {
    open: boolean;
    onClose: () => void;
    onSelectTrafo: (trafo: SelectOption) => void;
    onRegisterNewTrafo: (name: string, type: number) => Promise<void>;
    showAlert: (message: string, severity: "success" | "error" | "warning" | "info") => void;

    availableTrafoOptions: SelectOption[];
}

const SelectTrafoModal: React.FC<SelectTrafoModalProps> = ({
    open,
    onClose,
    onSelectTrafo,
    availableTrafoOptions,
}) => {
    const [selectedTrafo, setSelectedTrafo] = useState<SelectOption | null>(null);


    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>TRAFO Ekle</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body1" mb={2}>Mevcut bir TRAFO seçin veya yeni bir tane kaydedin.</Typography>
                <Stack spacing={2}>
                    <Autocomplete
                        options={availableTrafoOptions}
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedTrafo}
                        onChange={(_, newValue) => setSelectedTrafo(newValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Mevcut TRAFO'lardan Seç"
                                variant="outlined"
                            />
                        )}
                    />

                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="error" variant="outlined">İptal</Button>
                <Button
                    onClick={() => selectedTrafo && onSelectTrafo(selectedTrafo)}
                    color="primary"
                    variant="contained"
                    disabled={!selectedTrafo}
                >
                    Seç ve Ekle
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SelectTrafoModal;