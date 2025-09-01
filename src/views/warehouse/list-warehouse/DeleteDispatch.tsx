import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from 'src/assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// --- Props interface ---
type Props = {
    openModal: boolean;
    dispatchIdToDelete: string | null;
    dispatchCodeToDelete: string; // برای نمایش کد سند توزیع در پیام تایید
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteDispatch = ({ openModal, dispatchIdToDelete, dispatchCodeToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    // State for Dispatch In Use modal
    const [openDispatchInUseModal, setOpenDispatchInUseModal] = useState<boolean>(false);

    const handleDeleteDispatch = async () => {
        if (dispatchIdToDelete === null) {
            showAlert('Silinecek sevk belgesi seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-warehouse-dispatch/${dispatchIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Sevk belgesi başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Sevk belgesi silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            console.error("Error deleting dispatch:", e);

            if (e.response && e.response.status === 500) {
                onClose();
                setOpenDispatchInUseModal(true);
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Sevk belgesi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDispatchInUseModal = () => {
        setOpenDispatchInUseModal(false);
    };

    return (
        <>
            {/* Main Delete Confirmation Modal */}
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu sevk belgesini silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {dispatchCodeToDelete} kodlu sevk belgesini silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen sevk belgesini sil" : ""}>
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

            {/* Dialog for Dispatch In Use */}
            <Dialog
                open={openDispatchInUseModal}
                onClose={handleCloseDispatchInUseModal}
                aria-labelledby="dispatch-in-use-dialog-title"
                aria-describedby="dispatch-in-use-dialog-description"
            >
                <DialogTitle id="dispatch-in-use-dialog-title">
                    {"Hata: Sevk Belgesi Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="dispatch-in-use-dialog-description">
                        Bu sevk belgesi şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDispatchInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeleteDispatch;