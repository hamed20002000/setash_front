import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, Typography } from '@mui/material';

import axios from 'axios';
// @ts-ignore
import server from '../../../assets/address.json'; // فرض می‌کنیم آدرس صحیح است
// @ts-ignore
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // فرض می‌کنیم Context وجود دارد

// Define the component props for type safety
type DeleteProps = {
    openModal: boolean;
    idToDelete: number | string | null; // ID می‌تواند string یا number باشد
    nameToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    // تابع نمایش هشدار که از کامپوننت والد می‌آید
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteCarFuels = ({ openModal, idToDelete, nameToDelete, onClose, onDeleteSuccess, showAlert }: DeleteProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    // 💡 توجه: اگر 'useTooltip' نیاز به تعریف در این فایل دارد، باید واردات آن را بررسی کنید.
    // در این نمونه، فرض می‌کنیم 'useTooltip' به درستی در دسترس است.
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (idToDelete === null) {
            showAlert('Silinecek kayıt seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            // در صورت نبود توکن، بهتر است به صفحه لاگین هدایت شود
            navigate('/');
            return;
        }

        setLoading(true);
        try {
            const url = `${server.baseurl}${server.warehouse}delete-car-fuel/${idToDelete}`;

            const response = await axios.delete(
                url,
                { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                // ⭐️ اصلاح پیام موفقیت ⭐️
                showAlert('Yakıt Kaydı başarıyla silindi!', 'success');
                onDeleteSuccess(); // فراخوانی تابع واکشی مجدد داده‌ها در والد
                onClose();
            } else {
                showAlert(response.data.message || 'Kayıt silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            // مدیریت خطاهای رایج
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt başka bir işlemde kullanıldığı için silinemez.', 'error');
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate('/');
            } else {
                showAlert(e.response?.data?.message || 'Kayıt silinirken beklenmeyen bir hata oluştu.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="delete-car-fuel-title"
            aria-describedby="delete-car-fuel-desc"
            maxWidth="sm"
            fullWidth
        >

            <DialogTitle id="delete-car-fuel-title" sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6">Silme Onayı</Typography>
            </DialogTitle>

            <DialogContent>
                <DialogContentText id="delete-car-fuel-desc">
                    Seçtiğiniz
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>{nameToDelete}</span>
                    yakıt kaydını silerseniz bu işlem geri alınamaz. Lütfen onaylayın.
                </DialogContentText>
            </DialogContent>

            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Silmeyi iptal et' : ''}>
                    <Button onClick={onClose} disabled={loading} color="secondary" variant="outlined">
                        İptal et
                    </Button>
                </CustomTooltip>

                <CustomTooltip title={isTooltipGloballyEnabled ? 'Seçilen kaydı kalıcı olarak sil' : ''}>
                    <Button color="error" variant="contained" onClick={handleDelete} autoFocus disabled={loading}>
                        {loading ? (<><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</>) : ('Silmek')}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteCarFuels;