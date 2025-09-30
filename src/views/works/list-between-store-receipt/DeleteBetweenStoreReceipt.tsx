import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// --- Type Definitions (Props) ---
type Props = {
    openModal: boolean;
    // تغییر نام prop ها از dispatch به receipt
    receiptIdToDelete: string | null;
    receiptCodeToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteBetweenStoreReceipt = ({ openModal, receiptIdToDelete, receiptCodeToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDeleteReceipt = async () => {
        if (receiptIdToDelete === null) {
            showAlert('Silinecek depo giriş belgesi seçilmedi.', 'warning');
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
            // ✨ تغییر API endpoint به 'delete-between-store-receipt'
            const response = await axios.delete(
                `${server.baseurl}${server.warehouse}delete-between-store-receipt/${receiptIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Depo giriş belgesi başarıyla silindi!', 'success');
                onDeleteSuccess();
            } else {
                showAlert(response.data.message || 'Depo giriş belgesi silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Depo giriş belgesi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
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
                {"Bu depo giriş belgesini silmek istediğinizden emin misiniz?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {receiptCodeToDelete} kodlu depo giriş belgesini silerseniz, geri almanın bir yolu yoktur.
                    Kaydı silmek istediğinizden eminseniz,
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                    <Button onClick={onClose} disabled={loading}>İptal et</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen depo giriş belgesini sil" : ""}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteReceipt}
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

export default DeleteBetweenStoreReceipt;