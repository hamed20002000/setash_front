// DeleteRegion.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    // CircularProgress // اگر استفاده نمی‌کنید، می‌توانید حذف کنید
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    regionIdToDelete: string | null; // ✅ تغییر نام: ID منطقه برای حذف
    onClose: () => void;
    onDeleteSuccess: () => void; // تابعی برای رفرش کردن لیست اصلی
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteRegion = ({ openModal, regionIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => { // ✅ تغییر نام کامپوننت و props
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    // ✅ NEW STATE FOR REGION IN USE MODAL
    const [openRegionInUseModal, setOpenRegionInUseModal] = useState<boolean>(false); // ✅ تغییر نام state

    const handleDeleteRegion = async () => { // ✅ تغییر نام تابع
        if (regionIdToDelete === null) { // ✅ تغییر نام prop
            showAlert('Silinecek bölge seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            // navigate("/"); // ممکن است بخواهید به صفحه ورود هدایت کنید
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.baseinfo}delete-region/${Number(regionIdToDelete)}`, // ✅ تغییر آدرس API
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Bölge başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose(); // مودال اصلی حذف بسته شود
            } else {
                // اگر API شما برای خطای بیزینسی کد 200 برگرداند ولی در Message وضعیت خطا باشد
                showAlert(response.data.message || 'Bölge silinirken bir hata oluştu.', 'error');
                onClose(); // در این حالت هم مودال بسته شود
            }
        } catch (e: any) {
            console.error("Error deleting region:", e);

            // ✅ CHECK FOR 500 STATUS CODE
            if (e.response && e.response.status === 500) {
                onClose(); // Close the current delete confirmation modal
                setOpenRegionInUseModal(true); // ✅ تغییر نام modal
            } else if (e.response && e.response.status === 401) {
                // Handle unauthorized
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/"); // Redirect to login
            } else {
                // General error handling for other network or API errors
                const errorMessage = e.response?.data?.message || 'Bölge silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose(); // Close the modal for general errors too
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseRegionInUseModal = () => { // ✅ تغییر نام تابع
        setOpenRegionInUseModal(false);
    };

    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu bölgeyi silmek istediğinizden emin misiniz?"}
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
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen bölgeyi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteRegion}
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

            {/* ✅ NEW Dialog for Region In Use */}
            <Dialog
                open={openRegionInUseModal}
                onClose={handleCloseRegionInUseModal}
                aria-labelledby="region-in-use-dialog-title" // ✅ تغییر id
                aria-describedby="region-in-use-dialog-description" // ✅ تغییر id
            >
                <DialogTitle id="region-in-use-dialog-title">
                    {"Hata: Bölge Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="region-in-use-dialog-description">
                        Bu bölge şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRegionInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteRegion; // ✅ تغییر نام کامپوننت