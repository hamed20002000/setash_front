// src/views/warehouses/DeleteStoreDispatchReturnToCenter.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    dispatchIdToDelete: string | null;
    dispatchCodeToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteStoreDispatchReturnToCenter = ({ openModal, dispatchIdToDelete, dispatchCodeToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDeleteDispatch = async () => {
        if (dispatchIdToDelete === null) {
            showAlert('Silinecek iade sevk belgesi seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            // **API Endpoint for Delete Dispatch RETURN To Center**
            const response = await axios.delete(
                `${server.baseurl}${server.warehouse}delete-store-dispatch-return-to-center/${dispatchIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('İade sevk belgesi başarıyla silindi!', 'success');
                onDeleteSuccess();
            } else {
                showAlert(response.data.message || 'İade sevk belgesi silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'İade sevk belgesi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
            }
        } finally {
            setLoading(false);
            onClose();
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description">
            <DialogTitle id="alert-dialog-title">
                {"Bu iade sevk belgesini silmek istediğinizden emin misiniz?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>{dispatchCodeToDelete}</span> kodlu iade sevk belgesini silerseniz, geri almanın bir yolu yoktur.
                    Kaydı silmek istediğinizden eminseniz,
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                    <Button onClick={onClose} disabled={loading}>İptal et</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen iade sevk belgesini sil" : ""}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteDispatch}
                        autoFocus
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                            </>
                        ) : (
                            'Silmek'
                        )}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteStoreDispatchReturnToCenter;