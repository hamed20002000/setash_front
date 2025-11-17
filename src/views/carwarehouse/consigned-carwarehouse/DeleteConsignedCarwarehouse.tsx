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
    idToDelete: number | null;
    nameToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    // تابع نمایش هشدار که از کامپوننت والد می‌آید
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteConsignedCarwarehouse = ({ openModal, idToDelete, nameToDelete, onClose, onDeleteSuccess, showAlert }: DeleteProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    // @ts-ignore
    const { isTooltipGloballyEnabled } = useTooltip(); // استفاده از Context Tooltip

    const handleDelete = async () => {
        if (idToDelete === null) {
            showAlert('Silinecek kayıt seçilmedi.', 'warning');
            onClose();
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
            // ⭐️ API Endpoint: server.baseurl + server.warehouse + "delete-consigned-car"
            const url = `${server.baseurl}${server.warehouse}delete-consigned-car`;

            // ⭐️ ارسال ID در بدنه درخواست (Body) برای متد DELETE
            const response = await axios.delete(
                url,
                {
                    headers: {
                        'Content-Type': 'application/json', // تنظیم نوع محتوا برای ارسال JSON
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    data: { id: idToDelete } // ⬅️ ID مورد نظر برای حذف
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Emanet araç kaydı başarıyla silindi!', 'success');
                onDeleteSuccess(); // فراخوانی تابع واکشی مجدد داده‌ها در والد
                onClose();
            } else {
                showAlert(response.data.message || 'Kayıt silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            // مدیریت خطاهای رایج (شامل خطای 500 برای وابستگی و 401 برای احراز هویت)
            if (e.response && e.response.status === 500) {
                // اگر API پیام دقیق‌تری ندارد، پیام عمومی وابستگی را نمایش می‌دهیم.
                showAlert(e.response?.data?.message || 'Bu kayıt başka bir işlemde kullanıldığı için silinemeyebilir.', 'error');
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
        <Dialog open={openModal} onClose={onClose} aria-labelledby="delete-consigned-car-title" aria-describedby="delete-consigned-car-desc" maxWidth="sm" fullWidth>

            <DialogTitle id="delete-consigned-car-title" sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6">Emanet Kaydı Silme Onayı</Typography>
            </DialogTitle>

            <DialogContent>
                <DialogContentText id="delete-consignment-desc">
                    Seçtiğiniz <span style={{ fontSize: 16, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>{nameToDelete}</span>
                    emanet kaydını silerseniz bu işlem geri alınamaz. Lütfen onaylayın.
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

export default DeleteConsignedCarwarehouse;