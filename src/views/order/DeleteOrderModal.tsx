import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    CircularProgress,
} from '@mui/material';
import axios from 'axios';
import server from '../../assets/address.json';

interface DeleteOrderModalProps {
    openModal: boolean;
    orderIdToDelete: number | null;
    orderTitleToDelete: string; // نام شبکه سفارش
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({
    openModal,
    orderIdToDelete,
    orderTitleToDelete,
    onClose,
    onDeleteSuccess,
    showAlert,
}) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);

    const handleDeleteOrder = async () => {
        if (orderIdToDelete === null) {
            showAlert('Silinecek sipariş seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            onClose();
            return;
        }
        debugger
        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-order/${orderIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert(`"${orderTitleToDelete}" adlı sipariş başarıyla silindi.`, 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Sipariş silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Sipariş silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description">
            <DialogTitle id="delete-dialog-title">
                {"Sipariş Silme Onayı"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-dialog-description">
                    "{orderTitleToDelete}" adlı siparişi silmek istediğinizden emin misiniz؟
                    Bu işlem geri alınamaz.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>İptal et</Button>
                <Button
                    color="error"
                    variant="contained"
                    onClick={handleDeleteOrder}
                    autoFocus
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                        </>
                    ) : (
                        'Silmek'
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteOrderModal;