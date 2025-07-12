// ChangeUserPasswordModal.tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  InputAdornment,
  CircularProgress,
  Typography,
  Box, 
} from '@mui/material';
import { IconCopy, IconBrandWhatsapp } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; 

type Props = {
  openModal: boolean;
  onClose: () => void;
  userId: string | null; // در اینجا نام کاربری (username) دریافت می شود
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ChangeUserPasswordModal = ({ openModal, onClose, userId, showAlert }: Props) => {
  const [step, setStep] = useState<'confirm' | 'generate'>('confirm'); // مرحله فعلی مودال
  const [generatedPassword, setGeneratedPassword] = useState<string>(''); // رمز عبور تولید شده
  const [loading, setLoading] = useState<boolean>(false); // برای لودینگ دکمه‌ها
  const [copySuccess, setCopySuccess] = useState<boolean>(false); // برای پیغام کپی موفقیت آمیز

  const { isTooltipGloballyEnabled } = useTooltip(); // برای Tooltip سراسری

  // ریست کردن state هنگام باز شدن مودال
  useEffect(() => {
    if (openModal) {
      setStep('confirm');
      setGeneratedPassword('');
      setLoading(false);
      setCopySuccess(false);
    }
  }, [openModal]);


  // --- مرحله تأیید ---
  const handleConfirmReset = async () => {
    if (userId === null) {
      showAlert('Kullanıcı seçilmedi!', 'error');
      onClose();
      return;
    }

    setLoading(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      setLoading(false);
      return;
    }

    try {
      // ارسال درخواست به API reset-user-password
      const response = await axios.post(
        server.baseurl + server.user + "reset-user-password",
        { username: userId }, // ارسال نام کاربری
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201) {debugger
        // اگر سرور پسورد جدید رو برمی‌گردونه، از اون استفاده کن
        // در غیر این صورت، ما خودمان یک پسورد تصادفی تولید می‌کنیم.
        const newRandomPassword = response.data.data;
        setGeneratedPassword(newRandomPassword);
        setStep('generate'); // به مرحله تولید و نمایش پسورد برو
        showAlert('Şifre sıfırlama talebi gönderildi.', 'info'); // پیغام اولیه
      } else {
        showAlert(response.data.message || 'Şifre sıfırlanırken bir hata oluştu.', 'error');
        onClose();
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      const errorMessage = error.response?.data?.message || 'Şifre sıfırlanırken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };


  // --- مرحله تولید و نمایش پسورد ---
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword)
      .then(() => {
        setCopySuccess(true);
        showAlert('Şifre panoya kopyalandı!', 'success');
        setTimeout(() => setCopySuccess(false), 2000); // پیغام بعد از 2 ثانیه محو شود
      })
      .catch(err => {
        console.error('Şifre kopyalanamadı:', err);
        showAlert('Şifre kopyalanamadı. Lütfen manuel olarak kopyalayın.', 'error');
      });
  };

  const handleShareOnWhatsApp = () => {
    const message = `Merhaba ${userId},\nYeni şifreniz: ${generatedPassword}\nLütfen güvenli bir yerde saklayın.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    // `wa.me/PHONE_NUMBER?text=` اگر شماره تلفن کاربر را دارید
    // `wa.me/?text=` برای باز کردن واتساپ بدون شماره و اجازه انتخاب مخاطب به کاربر

    window.open(whatsappUrl, '_blank');
    showAlert('Şifre WhatsApp üzerinden paylaşılmaya hazır.', 'info');
  };


  return (
    <Dialog open={openModal} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Şifre Değiştir</DialogTitle>
      <DialogContent dividers>
        {step === 'confirm' ? (
          <Box>
            <Typography>
              `{userId}` adlı kullanıcının şifresini sıfırlamak ve yeni bir şifre oluşturmak istediğinizden emin misiniz?
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" mb={1}>
              Yeni oluşturulan şifre:
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={generatedPassword}
              InputProps={{
                readOnly: true, // فقط خواندنی
                endAdornment: (
                  <InputAdornment position="end">
                    <CustomTooltip title={isTooltipGloballyEnabled ? (copySuccess ? "Kopyalandı!" : "Panoya Kopyala") : ""}>
                      <IconButton onClick={handleCopyPassword} edge="end" disabled={loading}>
                        <IconCopy size={20} />
                      </IconButton>
                    </CustomTooltip>
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
              <CustomTooltip title={isTooltipGloballyEnabled ? "WhatsApp üzerinden şifreyi paylaş" : ""}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleShareOnWhatsApp}
                  startIcon={<IconBrandWhatsapp size={20} />}
                  disabled={loading}
                >
                  WhatsApp ile Paylaş
                </Button>
              </CustomTooltip>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {step === 'confirm' ? (
          <>
            <CustomTooltip title={isTooltipGloballyEnabled ? "Şifre sıfırlamayı iptal et" : ""}>
              <Button onClick={onClose} color="error" disabled={loading}>
                İptal Et
              </Button>
            </CustomTooltip>
            <CustomTooltip title={isTooltipGloballyEnabled ? "Şifreyi sıfırlayıp yeni bir şifre oluştur" : ""}>
              <Button onClick={handleConfirmReset} color="primary" variant="contained" disabled={loading}>
                {loading ? <>
                <CircularProgress sx={{ mr: 1 }} /> Beklemek....
              </>: 'Evet, Sıfırla'}
              </Button>
            </CustomTooltip>
          </>
        ) : (
          // بعد از تولید پسورد، دکمه بستن نهایی
          <CustomTooltip title={isTooltipGloballyEnabled ? "Modali kapat" : ""}>
            <Button onClick={onClose} color="primary" variant="contained">
              Kapat
            </Button>
          </CustomTooltip>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ChangeUserPasswordModal;