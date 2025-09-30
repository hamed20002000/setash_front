// DeleteItem.tsx
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
  itemIdToDelete: number | null; // ID آیتم برای حذف
  onClose: () => void;
  onDeleteSuccess: () => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteItem = ({ openModal, itemIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const { isTooltipGloballyEnabled } = useTooltip();

  // New state for the "Item In Use" modal
  const [openItemInUseModal, setOpenItemInUseModal] = useState<boolean>(false); // 🟢 New State

  const handleDeleteItem = async () => {
    if (itemIdToDelete === null) {
      showAlert('Silinecek ürün seçilmedi.', 'warning');
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
      // **نکته:** آدرس API حذف آیتم و نحوه ارسال ID
      // فرض می‌کنیم حذف با ID در URL انجام می‌شود (DELETE /delete-item/{id})
      const response = await axios.delete(
        `${server.baseurl}${server.baseinfo}delete-item/${itemIdToDelete}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Ürün başarıyla silindi!', 'success');
        onDeleteSuccess();
        onClose(); // Close the main delete confirmation modal
      } else {
        showAlert(response.data.message || 'Ürün silinirken bir hata oluştu.', 'error');
        onClose(); // Close the modal even if it's a business error
      }
    } catch (e: any) {
      console.error("Error deleting item:", e);

      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        const errorMessage = e.response?.data?.message || 'Ürün silinirken bir hata oluştu, lütfen tekrar deneyin.';
        showAlert(errorMessage, 'error');
        onClose(); // Close the modal for general errors too
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler to close the "Item In Use" modal
  const handleCloseItemInUseModal = () => { // 🟢 New Handler
    setOpenItemInUseModal(false);
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
          {"Bu ürünü silmek istediğinizden emin misiniz?"}
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
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen ürünü sil" : ""}>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteItem}
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

      {/* 🟢 New Dialog for "Item In Use" */}
      <Dialog
        open={openItemInUseModal}
        onClose={handleCloseItemInUseModal}
        aria-labelledby="item-in-use-dialog-title"
        aria-describedby="item-in-use-dialog-description"
      >
        <DialogTitle id="item-in-use-dialog-title">
          {"Hata: Ürün Silinemez!"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="item-in-use-dialog-description">
            Bu ürün şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseItemInUseModal} autoFocus>
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeleteItem;