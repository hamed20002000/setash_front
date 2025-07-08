// DeleteSystemRole.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react'; // useState اضافه شد
import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress } from '@mui/material'; // CircularProgress اضافه شد
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';

type Props = {
  openModal: boolean;
  rowIdToDelete: string | null; // ID ردیفی که قرار است حذف شود (نام رول)
  onClose: () => void;
  onDeleteSuccess: () => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteSystemRole = ({ openModal, rowIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false); // State جدید برای لودینگ دکمه

  const handleDeleteRole = async () => { // تابع را async کردیم
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

    setLoading(true); // شروع لودینگ
    try {
      // استفاده از axios.delete به جای axios.request با method: "delete"
      // با این تفاوت که اینجا برای حذف، name را در body ارسال می‌کنید.
      const response = await axios.delete(
        server.baseurl + server.user + "delete-role", // آدرس API حذف رول
        {
          headers: {
            "Accept": "text/plain", // یا "application/json" اگر سرور JSON برمی‌گرداند
            "Authorization": `Bearer ${authToken}`,
            'Content-Type': 'application/json' // برای ارسال data در DELETE، Content-Type لازم است
          },
          data: { // ارسال داده در بدنه درخواست برای متد DELETE
            "name": rowIdToDelete // نام رول برای حذف
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
      console.error("Error deleting role:", e);
      const errorMessage = e.response?.data?.message || 'Kayıt silinirken bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
    } finally {
      setLoading(false); // پایان لودینگ
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
            Kaydı silmek istediğinizden eminseniz, **Silmek** düğmesine tıklayın.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {/* دکمه "İptal et" را هم غیرفعال کن وقتی لودینگ است */}
          <Button onClick={onClose} disabled={loading}>İptal et</Button>
          <Button
            color="error"
            variant="contained" // معمولاً دکمه‌های اصلی اکشن Contained هستند
            onClick={handleDeleteRole}
            autoFocus
            disabled={loading} // دکمه حذف را هنگام لودینگ غیرفعال کن
          >
            {loading ? <>
                <BoltIcon sx={{ mr: 1 }} /> Beklemek....
              </> : 'Silmek'} {/* نمایش لودینگ یا متن */}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeleteSystemRole;