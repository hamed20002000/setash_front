// DeleteUnit.tsx
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
  openModal: boolean;
  unitIdToDelete: number | null; // ID واحد برای حذف
  onClose: () => void;
  onDeleteSuccess: () => void; // تابعی برای رفرش کردن لیست اصلی
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteUnit = ({ openModal, unitIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const { isTooltipGloballyEnabled } = useTooltip();

  const handleDeleteUnit = async () => {
    if (unitIdToDelete === null) {
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
      // **نکته:** آدرس API حذف واحد و نحوه ارسال ID
      // فرض می‌کنیم حذف با ID در URL انجام می‌شود (DELETE /delete-unit/{id})
      const response = await axios.delete(
        `${server.baseurl}${server.user}delete-unit/${unitIdToDelete}`,
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
        onClose();
      } else {
        showAlert(response.data.message || 'Birim silinirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error deleting unit:", e);
      const errorMessage = e.response?.data?.message || 'Birim silinirken bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
            Kaydı silmek istediğinizden eminseniz, **Silmek** düğmesine tıklayın.
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
              onClick={handleDeleteUnit}
              autoFocus
              disabled={loading}
            >
              {loading ? (
                <>
                  <BoltIcon size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                </>
              ) : (
                'Silmek'
              )}
            </Button>
          </CustomTooltip>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeleteUnit;