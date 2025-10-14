// DeleteSetProjectPlanningImplementation.tsx
import { useState } from 'react';
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

type Props = {
    openModal: boolean;
    // Değişiklik: implementationIdToDelete olarak yeniden adlandırıldı
    implementationIdToDelete: number | null;
    onClose: () => void;
    onDeleteSuccess: () => void; // Tabii ki listeyi yenilemek için
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteSetProjectPlanningImplementation = ({
    openModal,
    implementationIdToDelete,
    onClose,
    onDeleteSuccess,
    showAlert
}: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleDeleteImplementation = async () => {
        // Kontrol: Silinecek ID'nin varlığı
        if (implementationIdToDelete === null) {
            showAlert('Silinecek uygulama kaydı seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.delete(
                // Değişiklik: Yeni API endpoint'i kullanıldı
                `${server.baseurl}${server.warehouse}delete-project-planning-implementation/${implementationIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Uygulama kaydı başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Uygulama silinirken bir hata oluştu.', 'error');
                onClose();
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Uygulama silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={openModal}
            onClose={onClose}
            aria-labelledby="delete-implementation-title"
            aria-describedby="delete-implementation-description">
            <DialogTitle id="delete-implementation-title">
                {"Bu uygulama kaydını silmek istediğinizden emin misiniz?"}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-implementation-description">
                    Eğer silerseniz, bu uygulama kaydına ait verileri geri almanın bir yolu yoktur.
                    Kaydı silmek istediğinizden eminseniz,
                    <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                    <Button onClick={onClose} disabled={loading}>İptal et</Button>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen uygulama kaydını sil" : ""}>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteImplementation}
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
    );
}

export default DeleteSetProjectPlanningImplementation;