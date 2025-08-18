// src/views/networks/DeleteNetwork.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type DeleteNetworkProps = {
    openModal: boolean;
    networkIdToDelete: string | null;
    networkTitleToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};
const DeleteNetwork = ({ openModal, networkIdToDelete, networkTitleToDelete, onClose, onDeleteSuccess, showAlert }: DeleteNetworkProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [openNetworkInUseModal, setOpenNetworkInUseModal] = useState<boolean>(false);
    const handleDeleteOperation = async () => {
        if (networkIdToDelete === null) {
            showAlert('Silinecek Şebekeler seçilmedi.', 'warning');
            onClose();
            return;
        }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-network/${networkIdToDelete}`,
                {
                    headers: {
                        "Accept": "text/plain",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );
            if (response.status === 200) {
                showAlert(`'${networkTitleToDelete}' başlıklı Şebekeler başarıyla silindi!`, 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data?.message || 'Şebekeler silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                onClose();
                setOpenNetworkInUseModal(true);
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                const errorMessage = e.response?.data?.message || 'Şebekeler silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseNetworkInUseModal = () => {
        setOpenNetworkInUseModal(false);
    };
    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu Şebekeleri silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        <span style={{ fontWeight: "bold" }}>{networkTitleToDelete}</span> başlıklı Şebekeleri silmek üzeresiniz.
                        Eğer silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "İşlemi iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen Şebekeleri kalıcı olarak sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteOperation}
                            autoFocus
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor....
                                </>
                            ) : (
                                'Silmek'
                            )}
                        </Button>
                    </CustomTooltip>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openNetworkInUseModal}
                onClose={handleCloseNetworkInUseModal}
                aria-labelledby="network-in-use-dialog-title"
                aria-describedby="network-in-use-dialog-description"
            >
                <DialogTitle id="network-in-use-dialog-title">
                    {"Hata: Şebeke Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="network-in-use-dialog-description">
                        Bu Şebeke şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNetworkInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteNetwork;