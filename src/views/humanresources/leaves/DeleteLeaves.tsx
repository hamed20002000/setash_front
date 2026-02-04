// src/views/hr/Leaves/DeleteLeaves.tsx
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
    leaveIdToDelete: number | string | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteLeaves = ({
    openModal,
    leaveIdToDelete,
    onClose,
    onDeleteSuccess,
    showAlert,
}: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const [openInUseModal, setOpenInUseModal] = useState(false);

    const handleDeleteLeave = async () => {
        if (leaveIdToDelete === null || leaveIdToDelete === undefined) {
            showAlert('Silinecek izin seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            onClose();
            navigate('/');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.hr}delete-leave/${Number(leaveIdToDelete)}`,
                {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                },
            );

            if (response.data?.httpStatusCode === 200) {
                showAlert('İzin kaydı başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data?.message || 'İzin silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e?.response?.status === 500) {
                setOpenInUseModal(true);
            } else if (e?.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate('/');
            } else {
                const msg =
                    e?.response?.data?.message ||
                    'İzin silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(msg, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="delete-leave-title"
                aria-describedby="delete-leave-description"
            >
                <DialogTitle id="delete-leave-title">
                    {'Bu izin kaydını silmek istediğinizden emin misiniz?'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-leave-description">
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
                    <CustomTooltip title={isTooltipGloballyEnabled ? 'Seçilen izin kaydını sil' : ''}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteLeave}
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

            <Dialog
                open={openInUseModal}
                onClose={() => setOpenInUseModal(false)}
                aria-labelledby="leave-in-use-title"
                aria-describedby="leave-in-use-description"
            >
                <DialogTitle id="leave-in-use-title">{'Hata: İzin Kaydı Silinemez!'}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="leave-in-use-description">
                        Bu izin kaydı şu anda başka bir işlemde kullanılıyor. Lütfen önce ilgili kayıtları
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

export default DeleteLeaves;
