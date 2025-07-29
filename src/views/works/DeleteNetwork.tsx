// src/views/networks/DeleteNetwork.tsx
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
import BoltIcon from '@mui/icons-material/Bolt'; // Aynı icon kullanılıyor
import server from '../../assets/address.json'; // Sunucu adres dosyanızın yolu

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // Tooltip'i import edin

type DeleteNetworkProps = {
    openModal: boolean;
    networkIdToDelete: string | null; // Network ID string olmalı
    networkTitleToDelete: string; // Şebekeler başlığı
    onClose: () => void;
    onDeleteSuccess: () => void; // Başarılı silme sonrası çağrılacak fonksiyon
    showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void; // Uyarı gösterme fonksiyonu
};

const DeleteNetwork = ({ openModal, networkIdToDelete, networkTitleToDelete, onClose, onDeleteSuccess, showAlert }: DeleteNetworkProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);

    const { isTooltipGloballyEnabled } = useTooltip();

    // 🟢 NEW STATE for the "Network In Use" modal
    const [openNetworkInUseModal, setOpenNetworkInUseModal] = useState<boolean>(false);

    const handleDeleteOperation = async () => {
        if (networkIdToDelete === null) {
            showAlert('Silinecek Şebekeler seçilmedi.', 'warning');
            onClose();
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn("Kimlik doğrulama belirteci bulunamadı, giriş sayfasına yönlendiriliyor.");
            navigate("/");
            return;
        }

        setLoading(true);
        try {
            // ✅ DELETE API çağrısı, networkIdToDelete'i kullanıyor
            const response = await axios.delete(
                `${server.baseurl}${server.initialoperations}delete-network/${networkIdToDelete}`, // API endpointini kontrol edin
                {
                    headers: {
                        "Accept": "text/plain", // API yanıt türüne göre ayarlanabilir
                        "Authorization": `Bearer ${authToken}`,
                    }
                }
            );

            // API yanıtının HTTP durum kodunu kontrol edin
            if (response.status === 200) {
                showAlert(`'${networkTitleToDelete}' başlıklı Şebekeler başarıyla silindi!`, 'success');
                onDeleteSuccess(); // Başarılı silme sonrası parent component'in listeyi yenilemesini sağlar
                onClose(); // Modalı kapat
            } else {
                // Eğer API'niz mesajı response.data içinde gönderiyorsa
                showAlert(response.data?.message || 'Şebekeler silinirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            console.error("Ağ silinirken hata oluştu:", e);

            // 🟢 Check for 500 status code (Network in Use scenario)
            if (e.response && e.response.status === 500) {
                onClose(); // Close the current delete confirmation modal
                setOpenNetworkInUseModal(true); // Open the specific "network in use" modal
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                // General error handling for other network or API errors
                const errorMessage = e.response?.data?.message || 'Şebekeler silinirken bir hata oluştu, lütfen tekrar deneyin.';
                showAlert(errorMessage, 'error');
                onClose(); // Close the modal for general errors too
            }
        } finally {
            setLoading(false); // Yükleme durumunu sıfırla
        }
    };

    // 🟢 Handler to close the "Network In Use" modal
    const handleCloseNetworkInUseModal = () => {
        setOpenNetworkInUseModal(false);
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
                    {"Bu Şebekeleri silmek istediğinizden emin misiniz?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        <span style={{ fontWeight: "bold" }}>"{networkTitleToDelete}"</span> başlıklı Şebekeleri silmek üzeresiniz.
                        Eğer silerseniz, geri almanın bir yolu yoktur.
                        Kaydı silmek istediğinizden eminseniz,
                        <span style={{ fontSize: "18px", fontWeight: "bold", color: "#FA896B", margin: "0 5px" }}>Silmek</span> düğmesine tıklayın.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "İşlemi iptal et" : ""}>
                        <Button onClick={onClose} disabled={loading}>İptal et</Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen Şebekeleri kalıcı olarak sil" : ""}>
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

            {/* 🟢 NEW Dialog for "Network In Use" */}
            <Dialog
                open={openNetworkInUseModal}
                onClose={handleCloseNetworkInUseModal}
                aria-labelledby="network-in-use-dialog-title"
                aria-describedby="network-in-use-dialog-description"
            >
                <DialogTitle id="network-in-use-dialog-title">
                    {"Hata: Şebeke Silinemez!"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="network-in-use-dialog-description">
                        Bu Şebeke şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseNetworkInUseModal} autoFocus>
                        Tamam
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default DeleteNetwork;