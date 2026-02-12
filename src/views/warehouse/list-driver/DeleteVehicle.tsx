import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogContentText,
    DialogActions, Button, CircularProgress, Stack, Typography
} from '@mui/material';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useNavigate } from 'react-router';

interface DeleteVehicleProps {
    openModal: boolean;
    onClose: (success: boolean) => void;
    vehicleIdToDelete: number | null;
    vehicleNameToDelete: string;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const DeleteVehicle: React.FC<DeleteVehicleProps> = ({
    openModal,
    onClose,
    vehicleIdToDelete,
    vehicleNameToDelete,
    showAlert,
}) => {
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const handleDelete = async () => {
        if (!vehicleIdToDelete) {
            showAlert('Hata: Silinecek araç ID\'si bulunamadı.', 'error');
            onClose(false);
            return;
        }

        setLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            setLoading(false);
            onClose(false);
            return;
        }

        try {
            const response = await axios.delete(
                `${server.baseurl}${server.warehouse}delete-driver-vehicle/${vehicleIdToDelete}`,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Araç başarıyla silindi.', 'success');
                onClose(true);
            } else {
                showAlert(response.data.message || 'Araç silinirken bir hata oluştu.', 'error');
                onClose(false);
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.', 'error');
                onClose(false);
            }

        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={() => onClose(false)}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {"Araç Kaydını Sil"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {vehicleNameToDelete} adlı aracı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)} color="secondary" variant="outlined" disabled={loading}>
                    İptal Et
                </Button>
                <Button onClick={handleDelete} color="error" variant="contained" autoFocus disabled={loading}>
                    {loading ? (
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <CircularProgress size={20} color="inherit" />
                            <Typography>Siliniyor...</Typography>
                        </Stack>
                    ) : (
                        'Silmek'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteVehicle;