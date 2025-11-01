// src/views/work/DeleteWork.tsx  (or src/components/modals/DeleteWork.tsx)
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
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type DeleteWorkProps = {
    openModal: boolean;
    workIdToDelete: number | null;
    workTitleToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteWork = ({ openModal, workIdToDelete, workTitleToDelete, onClose, onDeleteSuccess, showAlert }: DeleteWorkProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [openWorkInUseModal, setOpenWorkInUseModal] = useState<boolean>(false);
    const handleDeleteOperation = async () => {
        if (workIdToDelete === null) {
            showAlert('Silinecek iş seçilmedi.', 'warning');
            onClose();
            return;
        }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-work/${workIdToDelete}`,
                {
                    headers: {
                        "Accept": "text/plain",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );
            if (response.status === 200) {
                showAlert(`'${workTitleToDelete}' başlıklı iş başarıyla silindi!`, 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data?.message || 'İş silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'İş silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };
    const handleCloseWorkInUseModal = () => {
        setOpenWorkInUseModal(false);
    };

    return (
        <>
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
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>{workTitleToDelete}</span> başlıklı işi silmek üzeresiniz.
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
            <Dialog
                open={openWorkInUseModal}
                onClose={handleCloseWorkInUseModal}
                aria-labelledby="work-in-use-dialog-title"
                aria-describedby="work-in-use-dialog-description"
            >
                <DialogTitle id="work-in-use-dialog-title">
                    {"Hata: İş Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="work-in-use-dialog-description">
                        Bu iş şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWorkInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteWork;