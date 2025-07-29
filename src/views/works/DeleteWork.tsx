// src/views/work/DeleteWork.tsx  (or src/components/modals/DeleteWork.tsx)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
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
import server from '../../assets/address.json'; // مطمئن شو مسیر درسته

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type DeleteWorkProps = {
    openModal: boolean;
    workIdToDelete: number | null;
    workTitleToDelete: string; // برای نمایش عنوان کار در پیام حذف
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteWork = ({ openModal, workIdToDelete, workTitleToDelete, onClose, onDeleteSuccess, showAlert }: DeleteWorkProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);

    const { isTooltipGloballyEnabled } = useTooltip();

    // 🟢 NEW STATE for the "Work In Use" modal
    const [openWorkInUseModal, setOpenWorkInUseModal] = useState<boolean>(false);

    const handleDeleteOperation = async () => {
        if (workIdToDelete === null) {
            showAlert('Silinecek iş seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn("Kimlik doğrulama belirteci bulunamadı, giriş sayfasına yönlendiriliyor.");
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            // ✅ استفاده از API DELETE که شما مشخص کرده بودید
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-work/${workIdToDelete}`,
                {
                    headers: {
                        "Accept": "text/plain", // یا application/json بر اساس نوع پاسخ API شما
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            // بررسی وضعیت HTTP
            if (response.status === 200) {
                // اگر API شما httpStatusCode را در data برمی‌گرداند، می‌توانید از response.data.httpStatusCode نیز استفاده کنید.
                showAlert(`'${workTitleToDelete}' başlıklı iş başarıyla silindi!`, 'success');
                onDeleteSuccess();
                onClose();
            } else {
                // اگر API شما پیام خطا را در response.data.message برمی‌گرداند
                showAlert(response.data?.message || 'İş silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            console.error("İş silinirken hata oluştu:", e);

            // 🟢 Check for 500 status code (Work in Use scenario)
            if (e.response && e.response.status === 500) {
                onClose(); // Close the current delete confirmation modal
                setOpenWorkInUseModal(true); // Open the specific "work in use" modal
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                // General error handling for other network or API errors
                const errorMessage = e.response?.data?.message || 'İş silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose(); // Close the modal for general errors too
            }
        } finally {
            setLoading(false);
        }
    };

    // 🟢 Handler to close the "Work In Use" modal
    const handleCloseWorkInUseModal = () => {
        setOpenWorkInUseModal(false);
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
                    {"Bu işi silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        <span style={{ fontWeight: "bold" }}>"{workTitleToDelete}"</span> başlıklı işi silmek üzeresiniz.
                        Eğer silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "İşlemi iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen işi kalıcı olarak sil" : ""}>
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

            {/* 🟢 NEW Dialog for "Work In Use" */}
            <Dialog
                open={openWorkInUseModal}
                onClose={handleCloseWorkInUseModal}
                aria-labelledby="work-in-use-dialog-title"
                aria-describedby="work-in-use-dialog-description"
            >
                <DialogTitle id="work-in-use-dialog-title">
                    {"Hata: İş Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="work-in-use-dialog-description">
                        Bu iş şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWorkInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteWork;