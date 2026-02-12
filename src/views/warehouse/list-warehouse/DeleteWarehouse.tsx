// src/views/Warehouse/DeleteWarehouse.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    WarehouseIdToDelete: number | null;
    WarehouseNameToDelete: string;
    onClose: () => void;
    onDeleteSuccess: () => void;
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteWarehouse = ({ openModal, WarehouseIdToDelete, WarehouseNameToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    const [openWarehouseInUseModal, setOpenWarehouseInUseModal] = useState<boolean>(false);

    const handleDeleteWarehouse = async () => {
        if (WarehouseIdToDelete === null) {
            showAlert('Silinecek şantiye seçilmedi.', 'warning');
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
                `${server.baseurl}${server.initialoperations}delete-Warehouse/${WarehouseIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose();
            } else {
                showAlert(response.data.message || 'Şantiye silinirken bir hata oluştu.', 'error');
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
                const errorMessage = e.response?.data?.message || 'Şantiye silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseWarehouseInUseModal = () => {
        setOpenWarehouseInUseModal(false);
    };

    return (
        <>
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu depoyu silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {WarehouseNameToDelete} adlı depoyu silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen şantiyeyi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteWarehouse}
                            autoFocus
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                                </>
                            ) : (
                                'Silmek'
                            )}
                        </Button>
                    </CustomTooltip>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openWarehouseInUseModal}
                onClose={handleCloseWarehouseInUseModal}
                aria-labelledby="Warehouse-in-use-dialog-title"
                aria-describedby="Warehouse-in-use-dialog-description"
            >
                <DialogTitle id="Warehouse-in-use-dialog-title">
                    {"Hata: Şantiye Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="Warehouse-in-use-dialog-description">
                        Bu şantiye şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWarehouseInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeleteWarehouse;