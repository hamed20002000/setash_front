// src/views/Warehouse/DeleteReceiptsSendedFromStore.tsx

import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from 'src/assets/address.json'; // مسیردهی متناسب با ساختار پروژه شما

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// --- Props interface ---
type Props = {
    openModal: boolean;
    // ✨ تغییر نام پراپ‌ها برای رسید
    receiptIdToDelete: string | null;
    receiptCodeToDelete: string; // برای نمایش کد رسید در پیام تایید
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

// ✨ تغییر نام کامپوننت
const DeleteReceiptsSendedFromStore = ({ openModal, receiptIdToDelete, receiptCodeToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    // این State در حذف رسید معمولاً لازم نیست مگر برای خطاهای خاص. 
    // اما برای حفظ ساختار نمونه کد و پوشش خطا نگه داشته شده است.
    const [openInUseModal, setOpenInUseModal] = useState<boolean>(false);

    // ✨ تغییر نام تابع
    const handleDeleteReceipt = async () => {
        if (receiptIdToDelete === null) {
            showAlert('Silinecek giriş belgesi seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            // navigate("/"); 
            return;
        }

        setLoading(true);
        try {
            // ✨ API جدید برای حذف رسید ارسالی به انبار
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
                // ✨ تغییر متن
                showAlert('Giriş belgesi başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                // ✨ تغییر متن
                showAlert(response.data.message || 'Giriş belgesi silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            // منطق مدیریت خطای 500 (در حال استفاده بودن رکورد)
            if (e.response && e.response.status === 500) {
                // ✨ از آنجایی که در سیستم قبلی خطا را به صورت modal جداگانه نمایش می‌دادید
                // اگرچه در DeleteWarehouse نمونه، modal استفاده شده، در اینجا پیام هشدار کفایت می‌کند.
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
            {/* Main Delete Confirmation Modal */}
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {/* ✨ تغییر متن */}
                    {"Bu şantiyeden gelen fişi belgesini silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {/* ✨ تغییر متن و استفاده از کد رسید */}
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
                            // ✨ تغییر تابع
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