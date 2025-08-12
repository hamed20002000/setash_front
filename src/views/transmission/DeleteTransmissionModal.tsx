// --- DeleteTransmissionModal.tsx ---
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    CircularProgress, Box, Typography,
} from '@mui/material';
import { IconTrash } from '@tabler/icons-react';
// import { TransmissionRow } from './ListTransmission'; 

import { TransmissionRow } from './types';
type Props = {
    openModal: boolean;
    onClose: () => void;
    onConfirm: () => void; // ✅ این تابع از کامپوننت والد فراخوانی می‌شود
    loading: boolean; // ✅ وضعیت لودینگ از کامپوننت والد کنترل می‌شود
    dependentRows: TransmissionRow[];
};

// ✅ تابع اصلی کامپوننت
const DeleteTransmissionModal = ({ openModal, onClose, onConfirm, loading, dependentRows }: Props) => {

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
        >
            <DialogTitle id="delete-dialog-title">
                {"Bu kaydı silmek istediğinizden emin misiniz?"}
            </DialogTitle>
            <DialogContent>
                {/* ✅ نمایش شرطی پیام هشدار برای ردیف‌های وابسته */}
                {dependentRows.length > 0 ? (
                    <Box>
                        <DialogContentText id="delete-dialog-description">
                            Bu kaydı silmek, aşağıdaki bağlı kayıtları da kalıcı olarak silecektir. Emin misiniz?
                        </DialogContentText>
                        <Box component="ul" sx={{ mt: 1, p: 0, pl: 2, listStyle: 'disc' }}>
                            {dependentRows.map(row => (
                                <Typography key={row.id} component="li" variant="body2">
                                    {row.fromProductType} - {row.toProductType}
                                </Typography>
                            ))}
                        </Box>
                    </Box>
                ) : (
                    <DialogContentText id="delete-dialog-description">
                        Bu işlemi geri alamazsınız. Silmek istediğinizden emin iseniz, "Sil" düğmesine tıklayın.
                    </DialogContentText>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    İptal
                </Button>
                <Button
                    color="error"
                    variant="contained"
                    onClick={onConfirm} // ✅ تابع تأیید از والد فراخوانی می‌شود
                    autoFocus
                    disabled={loading}
                    startIcon={loading ? null : <IconTrash />}
                >
                    {loading ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : (
                        'Silmek'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteTransmissionModal;