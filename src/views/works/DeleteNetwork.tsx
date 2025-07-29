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
            let errorMessage = 'Şebekeler silinirken bir hata oluştu, lütfen tekrar deneyin.';
            if (e.response) {
                if (e.response.status === 401) {
                    localStorage.removeItem('authToken');
                    navigate("/");
                    showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
                    return; // 401 durumunda doğrudan yönlendirme sonrası fonksiyonu durdur
                } else if (e.response.data && e.response.data.message) {
                    errorMessage = e.response.data.message;
                }
            }
            showAlert(errorMessage, 'error');
            onClose(); // Hata durumunda modali kapat
        } finally {
            setLoading(false); // Yükleme durumunu sıfırla
        }
    };

    return (
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
    );
}

export default DeleteNetwork;