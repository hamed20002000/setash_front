import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from '@mui/material';
import { IconTrash } from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// Define the component props for type safety
type DeleteProps = {
    openModal: boolean;
    idToDelete: number | null;
    nameToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    // تابع نمایش هشدار که از کامپوننت والد (ListConsignments) می‌آید
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

// نام کامپوننت به DeleteConsignment تغییر یافت
export const DeleteConsignment = ({ openModal, idToDelete, nameToDelete, onClose, onDeleteSuccess, showAlert }: DeleteProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
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
            return;
        }

        setLoading(true);
        try {
            // **API Endpoint به 'delete-consignment' تغییر داده شد**
            const response = await axios.delete(
                `${server.baseurl}${server.hr}delete-consignment/${idToDelete}`,
                { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Ambar kaydı başarıyla silindi!', 'success');
                onDeleteSuccess();
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
        <Dialog open={openModal} onClose={onClose} aria-labelledby="delete-consignment-title" aria-describedby="delete-consignment-desc" maxWidth="sm" fullWidth>

            <DialogTitle id="delete-consignment-title">
                {/* عنوان دیالوگ به محموله تغییر یافت */}
                <IconTrash color="error" style={{ verticalAlign: 'middle', marginRight: 8 }} />
                "{nameToDelete}" kaydını silmek istediğinizden emin misiniz?
            </DialogTitle>

            <DialogContent>
                <DialogContentText id="delete-consignment-desc">
                    Seçtiğiniz <span style={{ fontSize: 16, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>"{nameToDelete}"</span>
                    kaydını silerseniz bu işlem geri alınamaz. Lütfen onaylayın.
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

export default DeleteConsignment;