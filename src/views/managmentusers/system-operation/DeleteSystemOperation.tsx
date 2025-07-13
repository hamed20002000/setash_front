// DeleteSystemOperation.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  // CircularProgress
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // **ایمپورت useTooltip و CustomTooltip**

type Props = {
  openModal: boolean;
  rowIdToDelete: number | null;
  onClose: () => void;
  onDeleteSuccess: () => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteSystemOperation = ({ openModal, rowIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);

  // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip**
  const { isTooltipGloballyEnabled } = useTooltip();

  const handleDeleteOperation = async () => {
    if (rowIdToDelete === null) {
      showAlert('Silinecek kayıt seçilmedi.', 'warning');
      onClose();
      return;
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      return;
    }
debugger
    setLoading(true);
    try {
      const response = await axios.delete(
        `${server.baseurl}${server.user}delete-system-operation/${rowIdToDelete}`,
        {
          headers: {
            "Accept": "text/plain",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Kayıt başarıyla silindi!', 'success');
        onDeleteSuccess();
        onClose();
      } else {
        showAlert(response.data.message || 'Kayıt silinirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error deleting operation:", e);
      const errorMessage = e.response?.data?.message || 'Kayıt silinirken bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
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
          {"Bu kaydı silmek istediğinizden emin misiniz?"}
        </DialogTitle>
        <DialogContent>
           <DialogContentText id="alert-dialog-description">
            Eğer silerseniz, geri almanın bir yolu yoktur.
            Kaydı silmek istediğinizden eminseniz, 
            <span style={{fontSize:"18px",fontWeight:"bold",color:"#FA896B",margin: "0 5px"}}>Silmek</span> düğmesine tıklayın.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {/* **Tooltip برای دکمه "İptal et"** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "İşlemi iptal et" : ""}>
            <Button onClick={onClose} disabled={loading}>İptal et</Button>
          </CustomTooltip>
          {/* **Tooltip برای دکمه "Silmek"** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen kaydı sil" : ""}>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteOperation}
              autoFocus
              disabled={loading}
            >
              {loading ? (
                <>
                   <BoltIcon color="inherit" sx={{ mr: 1,fontSize:20 }} /> Beklemek....
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

export default DeleteSystemOperation;