// DeleteSystemOperation.tsx
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
  rowIdToDelete: number | null;
  onClose: () => void;
  onDeleteSuccess: () => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteSystemOperation = ({ openModal, rowIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false); // State جدید برای لودینگ دکمه

  const handleDeleteOperation = async () => { // تابع را async کردیم
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
      // این روش تمیزتر و استانداردتر است.
      const response = await axios.delete(
        `${server.baseurl}${server.user}delete-system-operation/${rowIdToDelete}`,
        {
          headers: {
            "Accept": "text/plain", // یا "application/json" اگر سرور JSON برمی‌گرداند
            "Authorization": `Bearer ${authToken}`,
            // 'Content-Type': 'application/json' // برای DELETE با URL نیازی نیست مگر اینکه بدنه داشته باشد
          }
        }
      );

      // فرض می‌کنیم httpStatusCode در result.data.httpStatusCode است (بر اساس ساختار پاسخ‌های قبلی شما)
      if (response.data.httpStatusCode === 200) {
        showAlert('Kayıt başarıyla silindi!', 'success');
        onDeleteSuccess();
        onClose();
      } else {
        // در صورت statusCode غیر 200، پیام خطا را از سرور بگیر
        showAlert(response.data.message || 'Kayıt silinirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error deleting operation:", e);
      // پیام خطای دقیق‌تر از سرور اگر موجود باشد
      const errorMessage = e.response?.data?.message || 'Kayıt silinirken bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      // اگر خطا 401 بود، به صفحه لاگین هدایت کن
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
    } finally {
      setLoading(false); // پایان لودینگ (هم در موفقیت و هم در خطا)
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
            onClick={handleDeleteOperation}
            autoFocus
            disabled={loading} // دکمه حذف را هنگام لودینگ غیرفعال کن
          >
            {loading ? <>
                            <BoltIcon sx={{ mr: 1 }} /> Beklemek....
                          </>  : 'Silmek'} {/* نمایش لودینگ یا متن */}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeleteSystemOperation;