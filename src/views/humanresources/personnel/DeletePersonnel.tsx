// src/views/hr/Personnel/DeletePersonnel.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    personnelIdToDelete: number | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeletePersonnel = ({
    openModal,
    personnelIdToDelete,
    onClose,
    onDeleteSuccess,
    showAlert,
}: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    // در صورت استفاده شدن رکورد
    const [openInUseModal, setOpenInUseModal] = useState(false);

    const handleDeletePersonnel = async () => {
        if (personnelIdToDelete === null) {
            showAlert('Silinecek personel seçilmedi.', 'warning');
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
            const response = await axios.delete(
                `${server.baseurl}${server.hr}delete-personnel/${personnelIdToDelete}`,
                {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                }
            );

            if (response.data?.httpStatusCode === 200) {
                showAlert('Personel başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data?.message || 'Personel silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e?.response?.status === 500) {
                // رکورد در حال استفاده است
                setOpenInUseModal(true);
            } else if (e?.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate('/');
            } else {
                const msg =
                    e?.response?.data?.message ||
                    'Personel silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(msg, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Confirm dialog */}
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="delete-personnel-title"
                aria-describedby="delete-personnel-description"
            >
                <DialogTitle id="delete-personnel-title">
                    {'Bu personeli silmek istediğinizden emin misiniz?'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-personnel-description">
                        Eğer silerseniz geri dönüş yoktur. Silmekten eminseniz
                        <span
                            style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#FA896B',
                                margin: '0 5px',
                            }}
                        >
                            Silmek
                        </span>
                        düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? 'Silme işlemini iptal et' : ''}>
                        <Button onClick={onClose} disabled={loading}>
                            İptal et
                        </Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? 'Seçilen personeli sil' : ''}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeletePersonnel}
                            autoFocus
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                </>
                            ) : (
                                'Silmek'
                            )}
                        </Button>
                    </CustomTooltip>
                </DialogActions>
            </Dialog>

            {/* In-use dialog */}
            <Dialog
                open={openInUseModal}
                onClose={() => setOpenInUseModal(false)}
                aria-labelledby="personnel-in-use-title"
                aria-describedby="personnel-in-use-description"
            >
                <DialogTitle id="personnel-in-use-title">{'Hata: Personel Silinemez!'}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="personnel-in-use-description">
                        Bu personel şu anda başka bir kayıtta kullanılıyor. Lütfen önce ilgili kayıtları
                        düzenleyin veya kaldırın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setOpenInUseModal(false);
                            onClose();
                        }}
                        autoFocus
                    >
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeletePersonnel;
