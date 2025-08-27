import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BoltIcon from '@mui/icons-material/Bolt';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { styled, keyframes } from '@mui/system';
import axios from 'axios'; // استفاده از axios به جای fetch برای تطابق با ساختار پاسخ شما

import { loginType } from 'src/types/auth/auth';
import CustomCheckbox from '../../../components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import Logo from '../../../layouts/full/shared/logo/Logo';

import server from 'src/assets/address.json';


import { useAuth } from 'src/context/AuthContext';

// Keyframes برای افکت "جریان الکتریکی" (بدون تغییر)
const electricFlow = keyframes`
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  50% {
    transform: translateX(0%);
  }
  75% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
`;

// کامپوننت استایل شده برای افکت الکتریکی داخل دکمه (بدون تغییر)
const ElectricEffect = styled('span')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '150%',
  height: '100%',
  backgroundColor: 'rgba(255, 255, 255, 0.4)',
  borderRadius: '50%',
  opacity: 0,
  animation: `${electricFlow} 1.5s infinite linear`,
  animationDelay: '0.2s',
});


const AuthLogin = ({ title, subtext }: loginType) => {
  const navigate = useNavigate();

  const { loadAuthData } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('error');

  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleClickShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  };

  const clearAlert = () => {
    setAlertMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    clearAlert();

    try {
      const LOGIN_API_URL = server.baseurl + server.login + 'login';

      const response = await axios.post(
        LOGIN_API_URL,
        { username, password },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      // بررسی وضعیت HTTP از پاسخ axios
      // Axios به طور پیش فرض خطاهای HTTP (4xx, 5xx) را به عنوان خطا پرتاب می کند
      // پس فقط کافی است موفقیت عملیات داخلی را بررسی کنیم.
      if (response.data.success) { // بررسی فیلد 'success' در پاسخ سرور
        const token = response.data.data; // توکن در response.data.data قرار دارد
        debugger
        if (token) {
          localStorage.setItem('authToken', token); // ذخیره توکن

          loadAuthData();
          showAlert('Giriş başarılı!', 'success');

          navigate('/dashboards/dashboard'); // هدایت به صفحه اصلی یا داشبورد
        } else {
          // اگر 'success' true بود ولی 'data' (توکن) خالی بود
          throw new Error('Sunucudan geçerli bir token alınamadı.');
        }
      } else {
        // اگر 'success' false بود، پیام خطا را از سرور بگیرید
        const errorMessage = response.data.message || 'Kullanıcı adı veya şifre yanlış. Lütfen tekrar deneyin.';
        throw new Error(errorMessage);
      }

    } catch (err: any) {
      debugger

      const errorMessage = (err.response?.data?.message == "Username or Password is not corrected!" ? "Şifre veya Kullanıcı Adı yanlış!" : "")
        || (err.message == "Request failed with status code 400" ? "Kullanıcı adınızı veya şifrenizi girin." : "") || 'Giriş sırasında beklenmeyen bir hata oluştu.';
      showAlert(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{
        marginBottom: "5%",
        display: "flex",
        justifyContent: "start",
      }}>
        <Logo />
      </div>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {alertMessage && (
            <Alert severity={alertSeverity} onClose={clearAlert} sx={{ mb: 2 }}>
              {alertMessage}
            </Alert>
          )}

          <Box>
            <CustomFormLabel htmlFor="username">Kullanıcı adı</CustomFormLabel>
            <CustomTextField
              id="username"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="password">Şifre</CustomFormLabel>
            <CustomTextField
              id="password"
              type={showPassword ? 'text' : 'password'}
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              InputProps={{

                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Stack justifyContent="space-between" direction="row" alignItems="center" my={2}>
            <FormGroup>
              <FormControlLabel
                control={<CustomCheckbox defaultChecked />}
                label="Bu Cihazı Hatırla"
              />
            </FormGroup>
          </Stack>
        </Stack>
        <Box mt={3}>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={loading}
            sx={{ position: 'relative', overflow: 'hidden' }}
          >
            {loading && <ElectricEffect />}
            {loading ? (
              <>
                <BoltIcon sx={{ mr: 1 }} /> Bağlanılıyor...
              </>
            ) : (
              'Oturum aç'
            )}
          </Button>
        </Box>
      </form>
    </>
  );
};

export default AuthLogin;