// src/views/workhouse/DeleteWorkhouse.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json'; // مسیر فایل address.json را تنظیم کنید

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// --- Props interface ---
type Props = {
    openModal: boolean;
    workhouseIdToDelete: number | null;
    workhouseNameToDelete: string; // برای نمایش نام کارگاه در پیام تایید
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteWorkhouse = ({ openModal, workhouseIdToDelete, workhouseNameToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    // State for Workhouse In Use modal
    const [openWorkhouseInUseModal, setOpenWorkhouseInUseModal] = useState<boolean>(false);

    const handleDeleteWorkhouse = async () => {
        if (workhouseIdToDelete === null) {
            showAlert('Silinecek şantiye seçilmedi.', 'warning');
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
                `${server.baseurl}${server.initialoperations}delete-workhouse/${workhouseIdToDelete}`, // ✅ آدرس API برای حذف کارگاه
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Şantiye silinirken bir hata oluştu.', 'error');
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
                const errorMessage = e.response?.data?.message || 'Şantiye silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseWorkhouseInUseModal = () => {
        setOpenWorkhouseInUseModal(false);
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
                    {"Bu şantiyeyi silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {workhouseNameToDelete} adlı şantiyeyi silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen şantiyeyi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteWorkhouse}
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

            {/* Dialog for Workhouse In Use */}
            <Dialog
                open={openWorkhouseInUseModal}
                onClose={handleCloseWorkhouseInUseModal}
                aria-labelledby="workhouse-in-use-dialog-title"
                aria-describedby="workhouse-in-use-dialog-description"
            >
                <DialogTitle id="workhouse-in-use-dialog-title">
                    {"Hata: Şantiye Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="workhouse-in-use-dialog-description">
                        Bu şantiye şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWorkhouseInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeleteWorkhouse;