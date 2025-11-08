
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type DeleteProps = {
    openModal: boolean;
    idToDelete: number | null;
    nameToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

export const DeletePersonnelWorkPlaces = ({ openModal, idToDelete, nameToDelete, onClose, onDeleteSuccess, showAlert }: DeleteProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (idToDelete === null) { showAlert('Silinecek kayıt seçilmedi.', 'warning'); onClose(); return; }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        setLoading(true);
        try {
            const response = await axios.delete(`${server.baseurl}${server.hr}delete-personnel-work-place/${idToDelete}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) { showAlert('Kayıt başarıyla silindi!', 'success'); onDeleteSuccess(); onClose(); }
            else { showAlert(response.data.message || 'Kayıt silinirken bir hata oluştu.', 'error'); onClose(); }
        } catch (e: any) {
            if (e.response && e.response.status === 500) { showAlert('Bu kayıt başka bir işlemde kullanıldığı için silinemez.', 'error'); }
            else if (e.response && e.response.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate('/'); }
            else { showAlert(e.response?.data?.message || 'Kayıt silinirken beklenmeyen bir hata oluştu.', 'error'); }
        } finally { setLoading(false); }
    };

    return (
        <Dialog open={openModal} onClose={onClose} aria-labelledby="delete-pwp-title" aria-describedby="delete-pwp-desc">
            <DialogTitle id="delete-pwp-title">Bu görevlendirmeyi silmek istediğinizden emin misiniz?</DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-pwp-desc">
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>{nameToDelete}</span>  kaydını silerseniz geri alamazsınız. Silmek için
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#FA896B', margin: '0 5px' }}>Silmek</span>
                    butonuna tıklayın.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Silmeyi iptal et' : ''}><Button onClick={onClose} disabled={loading}>İptal et</Button></CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? 'Seçilen kaydı sil' : ''}>
                    <Button color="error" variant="contained" onClick={handleDelete} autoFocus disabled={loading}>
                        {loading ? (<><BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</>) : ('Silmek')}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeletePersonnelWorkPlaces;
