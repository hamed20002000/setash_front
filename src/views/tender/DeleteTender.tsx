// DeleteTender.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
  // CircularProgress,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
  openModal: boolean;
  tenderIdToDelete: number | null; // ID مزایده برای حذف
  onClose: () => void;
  onDeleteSuccess: () => void; // تابعی برای رفرش کردن لیست اصلی
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteTender = ({ openModal, tenderIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const { isTooltipGloballyEnabled } = useTooltip();

  // New state for the "Tender In Use" modal
  const [openTenderInUseModal, setOpenTenderInUseModal] = useState<boolean>(false); // 🟢 New State

  const handleDeleteTender = async () => {
    if (tenderIdToDelete === null) {
      showAlert('Silinecek ihale seçilmedi.', 'warning');
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
      // **نکته:** آدرس API حذف مزایده و نحوه ارسال ID
      // فرض می‌کنیم حذف با ID در URL انجام می‌شود (DELETE /delete-tender/{id})
      const response = await axios.delete(
        `${server.baseurl}${server.initialoperations}delete-tender/${tenderIdToDelete}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Müzayede başarıyla silindi!', 'success');
        onDeleteSuccess();
        onClose(); // Close the main delete confirmation modal
      } else {
        showAlert(response.data.message || 'Müzayede silinirken bir hata oluştu.', 'error');
        onClose(); // Close the modal even if it's a business error
      }
    } catch (e: any) {
      console.error("Error deleting tender:", e);

      // Check for 500 status code (Tender in Use scenario)
      if (e.response && e.response.status === 500) { // 🟢 Check for 500 status
        onClose(); // Close the main delete confirmation modal
        setOpenTenderInUseModal(true); // Open the specific "tender in use" modal
      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        const errorMessage = e.response?.data?.message || 'Müzayede silinirken bir hata oluştu, lütfen tekrar deneyin.';
        showAlert(errorMessage, 'error');
        onClose(); // Close the modal for general errors too
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler to close the "Tender In Use" modal
  const handleCloseTenderInUseModal = () => { // 🟢 New Handler
    setOpenTenderInUseModal(false);
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
          {"Bu ihaleyi silmek istediğinizden emin misiniz?"}
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
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen ihaleyi sil" : ""}>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteTender}
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

      {/* 🟢 New Dialog for "Tender In Use" */}
      <Dialog
        open={openTenderInUseModal}
        onClose={handleCloseTenderInUseModal}
        aria-labelledby="tender-in-use-dialog-title"
        aria-describedby="tender-in-use-dialog-description"
      >
        <DialogTitle id="tender-in-use-dialog-title">
          {"Hata: İhale Silinemez!"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="tender-in-use-dialog-description">
            Bu ihale şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTenderInUseModal} autoFocus>
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeleteTender;