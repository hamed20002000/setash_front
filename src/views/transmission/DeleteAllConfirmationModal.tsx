import React from 'react';
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import { IconTrash } from '@tabler/icons-react';

interface DeleteAllConfirmationModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
}

const DeleteAllConfirmationModal: React.FC<DeleteAllConfirmationModalProps> = ({ open, onClose, onConfirm, loading }) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Tüm Kayıtları Sil</DialogTitle>
            <DialogContent>
                <Typography>Bu işlem tüm iletim kayıtlarını kalıcı olarak silecektir. Emin misiniz?</Typography>
                <Typography color="error" sx={{ mt: 1 }}>Bu işlem geri alınamaz.</Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    İptal
                </Button>
                <Button onClick={onConfirm} color="error" variant="contained" disabled={loading} startIcon={<IconTrash />}>
                    {loading ? <CircularProgress size={20} color="inherit" /> : 'Evet, Sil'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteAllConfirmationModal;