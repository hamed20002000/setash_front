// src/views/work/DeleteWork.tsx  (یا src/components/modals/DeleteWork.tsx)
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
            if (response.status === 200) { // axios به صورت خودکار response.data.httpStatusCode را نمی‌دهد، بلکه status خود HTTP را برمی‌گرداند.
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
            let errorMessage = 'İş silinirken bir hata oluştu, lütfen tekrar deneyin.';
            if (e.response) {
                if (e.response.status === 401) {
                    localStorage.removeItem('authToken');
                    navigate("/");
                    showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
                    return;
                } else if (e.response.data && e.response.data.message) {
                    errorMessage = e.response.data.message;
                }
            }
            showAlert(errorMessage, 'error');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
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
    );
}

export default DeleteWork;