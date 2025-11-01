// DeleteForceMajor.tsx
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

type Props = {
    openModal: boolean;
    forceMajorIdToDelete: number | null; // ID فورس‌ماژور برای حذف
    onClose: () => void;
    onDeleteSuccess: () => void; // تابعی برای رفرش کردن لیست اصلی
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteForceMajor = ({ openModal, forceMajorIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    // New state for the "Force Major In Use" modal
    const [openForceMajorInUseModal, setOpenForceMajorInUseModal] = useState<boolean>(false);

    const handleDeleteForceMajor = async () => {
        if (forceMajorIdToDelete === null) {
            showAlert('Silinecek Forsa major belgesi seçilmedi.', 'warning');
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
                `${server.baseurl}${server.warehouse}delete-force-major/${forceMajorIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Forsa major belgesi başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose(); // Close the main delete confirmation modal
            } else {
                // If your API returns 200 but with an error message in data.message
                showAlert(response.data.message || 'Forsa major belgesi silinirken bir hata oluştu.', 'error');
                onClose(); // Close the modal even if it's a business error
            }
        } catch (e: any) {
            console.error("Error deleting force major:", e);

            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                // General error handling for other network or API errors
                const errorMessage = e.response?.data?.message || 'Forsa major belgesi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose(); // Close the modal for general errors too
            }
        } finally {
            setLoading(false);
        }
    };

    // Handler to close the "Force Major In Use" modal
    const handleCloseForceMajorInUseModal = () => {
        setOpenForceMajorInUseModal(false);
    };

    return (
        <>
            {/* Main Delete Confirmation Dialog */}
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu mücbir sebep belgesini silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Eğer silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen Forsa major belgesini sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteForceMajor}
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

            {/* New Dialog for "Force Major In Use" */}
            <Dialog
                open={openForceMajorInUseModal}
                onClose={handleCloseForceMajorInUseModal}
                aria-labelledby="force-major-in-use-dialog-title"
                aria-describedby="force-major-in-use-dialog-description"
            >
                <DialogTitle id="force-major-in-use-dialog-title">
                    {"Hata: Forsa major belgesi Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="force-major-in-use-dialog-description">
                        Bu Forsa major belgesi şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseForceMajorInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteForceMajor;