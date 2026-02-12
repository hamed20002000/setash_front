// src/views/Warehouse/DeleteReceiptsSendedFromStore.tsx

import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    receiptIdToDelete: string | null;
    receiptCodeToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteReceiptsSendedFromStore = ({ openModal, receiptIdToDelete, receiptCodeToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [openInUseModal, setOpenInUseModal] = useState<boolean>(false);

    const handleDeleteReceipt = async () => {
        if (receiptIdToDelete === null) {
            showAlert('Silinecek giriş belgesi seçilmedi.', 'warning');
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
                `${server.baseurl}${server.warehouse}delete-receipt-sended-from-store-to-warehouse/${receiptIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Giriş belgesi başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Giriş belgesi silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu giriş belgesi, başka bir işlemde kullanıldığı için silinemez.', 'error');
                onClose();

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Giriş belgesi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseInUseModal = () => {
        setOpenInUseModal(false);
    };

    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu şantiyeden gelen fişi belgesini silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>{receiptCodeToDelete}</span> kodlu giriş belgesini silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen giriş belgesini sil" : ""}>
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

            <Dialog
                open={openInUseModal}
                onClose={handleCloseInUseModal}
                aria-labelledby="record-in-use-dialog-title"
                aria-describedby="record-in-use-dialog-description"
            >
                <DialogTitle id="record-in-use-dialog-title">
                    {"Hata: Kayıt Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="record-in-use-dialog-description">
                        Bu giriş belgesi şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeleteReceiptsSendedFromStore;