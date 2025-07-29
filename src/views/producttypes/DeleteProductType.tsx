// DeleteProductType.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    // CircularProgress,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
    openModal: boolean;
    ProductTypesIdToDelete: number | null; // ID واحد برای حذف
    onClose: () => void;
    onDeleteSuccess: () => void; // تابعی برای رفرش کردن لیست اصلی
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteProductType = ({ openModal, ProductTypesIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const { isTooltipGloballyEnabled } = useTooltip();

    // New state for the "Product Type In Use" modal
    const [openProductTypeInUseModal, setOpenProductTypeInUseModal] = useState<boolean>(false); // 🟢 New State

    const handleDeleteProductType = async () => {
        if (ProductTypesIdToDelete === null) {
            showAlert('Silinecek birim seçilmedi.', 'warning');
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
                `${server.baseurl}${server.initialoperations}delete-product-type/${ProductTypesIdToDelete}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Birim başarıyla silindi!', 'success');
                onDeleteSuccess();
                onClose(); // Close the main delete confirmation modal
            } else {
                showAlert(response.data.message || 'Birim silinirken bir hata oluşo.', 'error');
                onClose(); // Close the modal even if it's a business error
            }
        } catch (e: any) {
            console.error("Error deleting ProductType:", e);

            // Check for 500 status code (Product Type in Use scenario)
            if (e.response && e.response.status === 500) { // 🟢 Check for 500 status
                onClose(); // Close the main delete confirmation modal
                setOpenProductTypeInUseModal(true); // Open the specific "product type in use" modal
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                const errorMessage = e.response?.data?.message || 'Birim silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose(); // Close the modal for general errors too
            }
        } finally {
            setLoading(false);
        }
    };

    // Handler to close the "Product Type In Use" modal
    const handleCloseProductTypeInUseModal = () => { // 🟢 New Handler
        setOpenProductTypeInUseModal(false);
    };

    return (
        <>
            {/* Main Delete Confirmation Dialog */}
            <Dialog
                open={openModal}
                onClose={onClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description">
                <DialogTitle id="alert-dialog-title">
                    {"Bu birimi silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Eğer silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen birimi sil" : ""}>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteProductType}
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

            {/* 🟢 New Dialog for "Product Type In Use" */}
            <Dialog
                open={openProductTypeInUseModal}
                onClose={handleCloseProductTypeInUseModal}
                aria-labelledby="product-type-in-use-dialog-title"
                aria-describedby="product-type-in-use-dialog-description"
            >
                <DialogTitle id="product-type-in-use-dialog-title">
                    {"Hata: Ürün Tipi Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="product-type-in-use-dialog-description">
                        Bu ürün tipi şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseProductTypeInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteProductType;