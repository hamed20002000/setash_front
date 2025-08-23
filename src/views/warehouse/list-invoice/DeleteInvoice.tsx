// src/views/Warehouse/DeleteInvoiceModal.tsx
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress
} from '@mui/material';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useNavigate } from 'react-router-dom';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// --- Props interface ---
interface DeleteInvoiceModalProps {
    openModal: boolean;
    onClose: () => void;
    invoiceIdToDelete: number | null;
    invoiceProviderToDelete: string;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const DeleteInvoiceModal: React.FC<DeleteInvoiceModalProps> = ({
    openModal,
    onClose,
    invoiceIdToDelete,
    invoiceProviderToDelete,
    onDeleteSuccess,
    showAlert
}) => {
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [openDeletionErrorModal, setOpenDeletionErrorModal] = React.useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDelete = async () => {
        if (!invoiceIdToDelete) {
            showAlert('Silinecek fatura seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            onClose();
            return;
        }

        setIsDeleting(true);
        try {
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-invoice/${invoiceIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Fatura başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Fatura silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            console.error("Error deleting invoice:", e);
            if (e.response && e.response.status === 500) {
                setOpenDeletionErrorModal(true);
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Fatura silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCloseDeletionErrorModal = () => {
        setOpenDeletionErrorModal(false);
        onClose();
    };

    return (
        <>
            {/* Main Delete Confirmation Modal */}
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="delete-invoice-dialog-title"
                aria-describedby="delete-invoice-dialog-description"
            >
                <DialogTitle id="delete-invoice-dialog-title">
                    {"Bu faturayı silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-invoice-dialog-description">
                        {invoiceProviderToDelete} adlı tedarikçinin faturasını silerseniz, bu işlem geri alınamaz.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#d32f2f", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={isDeleting}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen faturayı sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDelete}
                            autoFocus
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
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

            {/* Dialog for Deletion Error (e.g., status 500) */}
            <Dialog
                open={openDeletionErrorModal}
                onClose={handleCloseDeletionErrorModal}
                aria-labelledby="deletion-error-dialog-title"
                aria-describedby="deletion-error-dialog-description"
            >
                <DialogTitle id="deletion-error-dialog-title">
                    {"Hata: Fatura Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="deletion-error-dialog-description">
                        Bu fatura şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeletionErrorModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeleteInvoiceModal;