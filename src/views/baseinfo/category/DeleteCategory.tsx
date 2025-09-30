// DeleteCategory.tsx
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  // CircularProgress // اگر استفاده نمی‌کنید، می‌توانید حذف کنید
} from '@mui/material';
import axios from 'axios';
import BoltIcon from '@mui/icons-material/Bolt';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

type Props = {
  openModal: boolean;
  categoryIdToDelete: string | null; // ID دسته‌بندی برای حذف
  onClose: () => void;
  onDeleteSuccess: () => void; // تابعی برای رفرش کردن لیست اصلی
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const DeleteCategory = ({ openModal, categoryIdToDelete, onClose, onDeleteSuccess, showAlert }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const { isTooltipGloballyEnabled } = useTooltip();

  // ✅ NEW STATE FOR CATEGORY IN USE MODAL
  const [openCategoryInUseModal, setOpenCategoryInUseModal] = useState<boolean>(false);

  const handleDeleteCategory = async () => {
    if (categoryIdToDelete === null) {
      showAlert('Silinecek kategori seçilmedi.', 'warning');
      onClose();
      return;
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      // navigate("/"); // ممکن است بخواهید به صفحه ورود هدایت کنید
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(
        `${server.baseurl}${server.baseinfo}delete-category/${Number(categoryIdToDelete)}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Kategori başarıyla silindi!', 'success');
        onDeleteSuccess();
        onClose(); // مودال اصلی حذف بسته شود
      } else {
        // اگر API شما برای خطای بیزینسی کد 200 برگرداند ولی در Message وضعیت خطا باشد
        showAlert(response.data.message || 'Kategori silinirken bir hata oluştu.', 'error');
        onClose(); // در این حالت هم مودال بسته شود
      }
    } catch (e: any) {
      console.error("Error deleting category:", e);

      // ✅ CHECK FOR 500 STATUS CODE
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        // General error handling for other network or API errors
        const errorMessage = e.response?.data?.message || 'Kategori silinirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
        showAlert(errorMessage, 'error');
        onClose(); // Close the modal for general errors too
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCategoryInUseModal = () => {
    setOpenCategoryInUseModal(false);
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
          {"Bu kategoriyi silmek istediğinizden emin misiniz?"}
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
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen kategoriyi sil" : ""}>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeleteCategory}
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

      {/* ✅ NEW Dialog for Category In Use */}
      <Dialog
        open={openCategoryInUseModal}
        onClose={handleCloseCategoryInUseModal}
        aria-labelledby="category-in-use-dialog-title"
        aria-describedby="category-in-use-dialog-description"
      >
        <DialogTitle id="category-in-use-dialog-title">
          {"Hata: Kategori Silinemez!"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="category-in-use-dialog-description">
            Bu kategori şu anda başka bir yerde kullanıldığı için silinemez. Lütfen önce ilgili kayıtları düzenleyin veya silin.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryInUseModal} autoFocus>
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default DeleteCategory;