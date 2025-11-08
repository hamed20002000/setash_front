// DeleteRollCalls.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from '@mui/material';
import { IconTrash } from '@tabler/icons-react'; // استفاده از آیکون‌های Tabler
import axios from 'axios';
import server from 'src/assets/address.json'; // ⬅️ مسیر دهی مناسب
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// ⬅️ واسط (Interface) برای داده‌های مورد نیاز
interface RollCallRecord {
    id: number | string;
    personnelName: string;
    placeName: string;
    // ... سایر فیلدهای رکورد
}

type DeleteProps = {
    openModal: boolean;
    // ⬅️ به جای idToDelete و nameToDelete جداگانه، کل آبجکت رکورد را می‌پذیریم
    itemToDelete: RollCallRecord | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteRollCalls: React.FC<DeleteProps> = ({ openModal, itemToDelete, onClose, onDeleteSuccess, showAlert }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        // ⬅️ بررسی idToDelete
        if (itemToDelete === null || itemToDelete.id === undefined || itemToDelete.id === null) {
            showAlert('Silinecek kayıt seçilmedi.', 'warning');
            onClose();
            return;
        }

        const idToDelete = itemToDelete.id;
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            return;
        }

        setLoading(true);

        try {
            // ⬅️ استفاده از API صحیح: delete-roll-call/{id}
            const response = await axios.delete(`${server.baseurl}${server.hr}delete-roll-call/${idToDelete}`, {
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Kayıt başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Kayıt silinirken bir hata oluştu.', 'error');
                onClose();
            }

        } catch (e: any) {
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

    // ترکیب نام پرسنل و محل کار برای نمایش در Modal
    const nameToDisplay = itemToDelete
        ? `${itemToDelete.personnelName} `
        : 'Seçili Kayıt';

    return (
        <Dialog open={openModal} onClose={onClose} aria-labelledby="delete-rollcall-title" aria-describedby="delete-rollcall-desc">
            <DialogTitle id="delete-rollcall-title">Bu kaydı silmek istediğinizden emin misiniz?</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-rollcall-desc">
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '5px 5px', display: 'inline-block' }}>{nameToDisplay}</span>
                    kaydını silerseniz geri alamazsınız. Silmek için
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>Silmek</span> butonuna tıklayın.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Silmeyi iptal et' : ''}>
                    <Button onClick={onClose} disabled={loading}>İptal et</Button>
                </CustomTooltip>

                <CustomTooltip title={isTooltipGloballyEnabled ? 'Seçilen kaydı sil' : ''}>
                    <Button color="error" variant="contained" onClick={handleDelete} autoFocus disabled={loading}>
                        {loading ? (<><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</>) : (
                            <>
                                <IconTrash size={20} style={{ marginRight: 8 }} /> Silmek
                            </>
                        )}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteRollCalls;