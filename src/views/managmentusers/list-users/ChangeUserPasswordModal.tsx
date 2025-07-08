// ChangeUserPasswordModal.tsx
import React, { useState } from 'react';
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
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';

type Props = {
  openModal: boolean;
  onClose: () => void;
  userId: string | null;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ChangeUserPasswordModal = ({ openModal, onClose, userId, showAlert }: Props) => {
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [generateRandomPassword, setGenerateRandomPassword] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // تابع تولید رمز عبور تصادفی
  const generateRandomPass = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let randomPass = '';
    for (let i = 0; i < 12; i++) {
      randomPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(randomPass);
    setConfirmNewPassword(randomPass);
  };

  const handleRandomPasswordCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGenerateRandomPassword(event.target.checked);
    if (event.target.checked) {
      generateRandomPass();
    } else {
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  const handleChangePassword = async () => {
    if (userId === null) return;
    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      showAlert('Lütfen yeni şifre ve tekrarını girin.', 'warning');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showAlert('Şifreler eşleşmiyor!', 'error');
      return;
    }
    if (newPassword.length < 6) { // حداقل طول رمز عبور
      showAlert('Şifre en az 6 karakter olmalıdır.', 'warning');
      return;
    }

    setSaving(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      setSaving(false);
      return;
    }
debugger
    try {
      const response = await axios.post(
        server.baseurl + server.user + "change-user-password", // آدرس API تغییر رمز عبور کاربر
        { username: userId, newPassword: newPassword , currentPassword: confirmNewPassword},
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Şifre başarıyla değiştirildi!', 'success');
        onClose(); // بستن مودال
        setNewPassword(''); // پاک کردن فیلدها
        setConfirmNewPassword('');
        setGenerateRandomPassword(false);
      } else {
        showAlert(response.data.message || 'Şifre değiştirilirken bir hata oluştu.', 'error');
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      const errorMessage = error.response?.data?.message || 'Şifre değiştirilirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={openModal} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Şifre Değiştir</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Yeni Şifre"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={generateRandomPassword}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <IconEye size={20} /> : <IconEyeOff size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Yeni Şifreyi Tekrarla"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            disabled={generateRandomPassword}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={generateRandomPassword}
                onChange={handleRandomPasswordCheckboxChange}
                name="generateRandomPassword"
                color="primary"
              />
            }
            label="Rastgele Şifre Oluştur"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error" disabled={saving}>
          İptal Et
        </Button>
        <Button onClick={handleChangePassword} color="primary" variant="contained" disabled={saving}>
          {saving ? <>
                <BoltIcon sx={{ mr: 1 }} /> Beklemek....
              </> : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeUserPasswordModal;