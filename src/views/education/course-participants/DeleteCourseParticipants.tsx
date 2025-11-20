import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, Typography } from '@mui/material';

import axios from 'axios';
// @ts-ignore
import server from '../../../assets/address.json';
// @ts-ignore
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// Define the component props for type safety
type DeleteProps = {
    openModal: boolean;
    idToDelete: number | string | null;
    nameToDelete: string; // نام شرکت‌کننده برای نمایش در پیام تأیید
    onClose: (success: boolean) => void;
    onDeleteSuccess: () => void;
    // تابع نمایش هشدار که از کامپوننت والد می‌آید
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

// ⭐️ نام کامپوننت: DeleteCourseParticipants ⭐️
const DeleteCourseParticipants = ({ openModal, idToDelete, nameToDelete, onClose, onDeleteSuccess, showAlert }: DeleteProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (idToDelete === null) {
            showAlert('Silinecek kayıt seçilmedi.', 'warning');
            onClose(false);
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate('/');
            return;
        }

        setLoading(true);
        try {
            // ⭐️ استفاده از EndPoint حذف شرکت‌کننده: delete-course-participant/{id} ⭐️
            const url = `${server.baseurl}${server.education}delete-course-participant/${idToDelete}`;

            const response = await axios.delete(
                url,
                {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                // ⭐️ اصلاح پیام موفقیت برای حذف شرکت‌کننده ⭐️
                showAlert(`Katılımcı "${nameToDelete}" başarıyla silindi!`, 'success');
                onDeleteSuccess();
                onClose(true); // موفقیت آمیز
            } else {
                showAlert(response.data.message || 'Kayıt silinirken bir hata oluştu.', 'error');
                onClose(false); // ناموفق
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
            onClose(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={() => onClose(false)}
            aria-labelledby="delete-course-participant-title"
            aria-describedby="delete-course-participant-desc"
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle id="delete-course-participant-title" sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6">Silme Onayı</Typography>
            </DialogTitle>

            <DialogContent>
                <DialogContentText id="delete-course-participant-desc">
                    Seçtiğiniz katılımcı
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>{nameToDelete}</span>
                    kaydını silerseniz bu işlem geri alınamaz. Lütfen onaylayın.
                </DialogContentText>
            </DialogContent>

            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Silmeyi iptal et' : ''}>
                    <Button onClick={() => onClose(false)} disabled={loading} color="secondary" variant="outlined">
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

export default DeleteCourseParticipants;