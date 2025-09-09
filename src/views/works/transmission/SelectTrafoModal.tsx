// src/views/project/transmissions/SelectTrafoModal.tsx
import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Autocomplete, Stack, Typography,
} from '@mui/material';
// import { IconPlus } from '@tabler/icons-react';
import { SelectOption } from './types';

interface SelectTrafoModalProps {
    open: boolean;
    onClose: () => void;
    onSelectTrafo: (trafo: SelectOption) => void;
    // تابع ثبت TRAFO جدید حالا مسئول اعتبارسنجی نام هم هست
    onRegisterNewTrafo: (name: string, type: number) => Promise<void>;
    showAlert: (message: string, severity: "success" | "error" | "warning" | "info") => void;

    // لیست فیلترشده از والد
    availableTrafoOptions: SelectOption[];
}

const SelectTrafoModal: React.FC<SelectTrafoModalProps> = ({
    open,
    onClose,
    onSelectTrafo,
    // onRegisterNewTrafo,
    // showAlert,
    availableTrafoOptions,
}) => {
    const [selectedTrafo, setSelectedTrafo] = useState<SelectOption | null>(null);
    // const [newTrafoName, setNewTrafoName] = useState('');
    // const [isRegistering, setIsRegistering] = useState(false);

    // const handleRegisterTrafo = async () => {
    //     if (!newTrafoName.trim()) {
    //         showAlert('Trafo adı boş olamaz.', 'warning');
    //         return;
    //     }

    //     setIsRegistering(true);
    //     try {
    //         await onRegisterNewTrafo(newTrafoName, 0);
    //         onClose();
    //     } catch (error) {
    //         // خطاهای مربوط به API و اعتبارسنجی در کامپوننت والد مدیریت می‌شود
    //     } finally {
    //         setIsRegistering(false);
    //     }
    // };

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
                    {/* <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                            label="Yeni TRAFO Adı"
                            fullWidth
                            value={newTrafoName}
                            onChange={(e) => setNewTrafoName(e.target.value)}
                            disabled={isRegistering}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleRegisterTrafo}
                            disabled={!newTrafoName.trim() || isRegistering}
                        >
                            {isRegistering ? <CircularProgress size={24} color="inherit" /> : <IconPlus />}
                        </Button>
                    </Stack> */}
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