// src/views/hr/Requests/DeleteWorkhouseRent.tsx (مسیر پیشنهادی)

import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    CircularProgress,
} from '@mui/material';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

interface WorkhouseRentRequestItem {
    id: number | string;
    title: string;
}

type Props = {
    openModal: boolean;
    itemToDelete: WorkhouseRentRequestItem | null;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteWorkhouseRent: React.FC<Props> = ({ openModal, itemToDelete, onClose, onDeleteSuccess, showAlert }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const rentalRequestTitleToDelete = itemToDelete?.title || 'Seçili Kiralama Talebi';
    const rentalRequestIdToDelete = itemToDelete?.id || null;

    const handleDeleteRentalRequest = async () => {
        if (rentalRequestIdToDelete === null) {
            showAlert('Silinecek kiralama talebi seçilmedi.', 'warning');
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
                `${server.baseurl}${server.initialoperations}delete-workhouse-rent/${rentalRequestIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Kiralama talebi başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Kiralama talebi silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez.', 'error');
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Kiralama talebi silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
            }
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="alert-dialog-title-rental"
            aria-describedby="alert-dialog-description-rental">
            <DialogTitle id="alert-dialog-title-rental">
                {"Bu kiralama talebini silmek istediğinizden emin misiniz? ⚠️"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description-rental">
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>{rentalRequestTitleToDelete}</span> adlı kiralama kaydını silerseniz, geri almanın bir yolu yoktur.
                    Kaydı silmek istediğinizden eminseniz,
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                    <Button onClick={onClose} disabled={loading}>İptal et</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen kiralama talebini sil" : ""}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteRentalRequest}
                        autoFocus
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...
                            </>
                        ) : (
                            'Silmek'
                        )}
                    </Button>
                </CustomTooltip>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteWorkhouseRent;