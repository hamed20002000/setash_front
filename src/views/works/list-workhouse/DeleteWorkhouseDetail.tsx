// DeleteWorkhouseDetail.tsx
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

// تعریف interface برای آیتمی که قرار است حذف شود
interface ItemToDelete {
    id: string | number;
    owner: string;
}

type Props = {
    openModal: boolean;
    itemToDelete: ItemToDelete | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteWorkhouseDetail = ({ openModal, itemToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [openWorkhouseDetailInUseModal, setOpenWorkhouseDetailInUseModal] = useState<boolean>(false);

    const handleDeleteWorkhouseDetail = async () => {
        if (!itemToDelete || !itemToDelete.id) {
            showAlert('Silinecek şantiye detayı seçilmedi.', 'warning');
            onClose();
            return;
        }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-workhouse-detail/${itemToDelete.id}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye detayı başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Şantiye detayı silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Şantiye detayı silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseWorkhouseDetailInUseModal = () => {
        setOpenWorkhouseDetailInUseModal(false);
    };

    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {`'${itemToDelete?.owner}' adlı kaydı silmek istediğinizden emin misiniz?`}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Eğer silerseniz, geri almanın bir yolu yoktur. Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen kaydı sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteWorkhouseDetail}
                            autoFocus
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                </>
                            ) : (
                                'Silmek'
                            )}
                        </Button>
                    </CustomTooltip>
                </DialogActions>
            </Dialog>
            <Dialog
                open={openWorkhouseDetailInUseModal}
                onClose={handleCloseWorkhouseDetailInUseModal}
                aria-labelledby="workhouse-detail-in-use-dialog-title"
                aria-describedby="workhouse-detail-in-use-dialog-description"
            >
                <DialogTitle id="workhouse-detail-in-use-dialog-title">
                    {"Hata: Kayıt Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="workhouse-detail-in-use-dialog-description">
                        Bu kayıt şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWorkhouseDetailInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteWorkhouseDetail;