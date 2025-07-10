// DeleteListUser.tsx
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Tooltip, // ایمپورت Tooltip
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // ایمپورت useTooltip و CustomTooltip

type Props = {
  openModal: boolean;
  userIdToDelete: number | null;
  onClose: () => void;
  onDeleteSuccess: () => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteListUser = ({ openModal, userIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const [loading, setLoading] = useState<boolean>(false);

  // استفاده از useTooltip برای دسترسی به وضعیت Tooltip
  const { isTooltipGloballyEnabled } = useTooltip();

  const handleDeleteUser = async () => {
    if (userIdToDelete === null) {
      showAlert('Silinecek kullanıcı seçilmedi.', 'warning');
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
        `${server.baseurl}${server.user}delete-user/${userIdToDelete}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Kullanıcı başarıyla silindi!', 'success');
        onDeleteSuccess();
        onClose();
      } else {
        showAlert(response.data.message || 'Kullanıcı silinirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error deleting user:", e);
      const errorMessage = e.response?.data?.message || 'Kullanıcı silinirken bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        // در اینجا می‌توانید یک ریدایرکت سراسری به صفحه لاگین داشته باشید.
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
          {"Bu kullanıcıyı silmek istediğinizden emin misiniz?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Eğer silerseniz, geri almanın bir yolu yoktur.
            Kayıtı silmek istediğinizden eminseniz, **Silmek** düğmesine tıklayın.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {/* **Tooltip برای دکمه "İptal Et"** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "Silme işlemini iptal et" : ""}>
            <Button onClick={onClose} disabled={loading}>İptal Et</Button>
          </CustomTooltip>
          {/* **Tooltip برای دکمه "Silmek"** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen kullanıcıyı sil" : ""}>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteUser}
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

export default DeleteListUser;