// import React, { useEffect } from 'react';
import { Box, Avatar, Typography, IconButton, 
  // Tooltip, 
  useMediaQuery } from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-d1.svg';
import { IconPower } from '@tabler/icons-react';
import { AppState } from 'src/store/Store';
import { 
  // Link, 
  useNavigate } from 'react-router-dom'; // useNavigate اضافه شد

import { useAuth } from 'src/context/AuthContext'; // **ایمپورت useAuth**
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext'; // **ایمپورت CustomTooltip و useTooltip**

export const Profile = () => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  const navigate = useNavigate(); // هوک navigate برای ریدایرکت پس از خروج

  // **استفاده از useAuth برای دسترسی به مقادیر Context**
  const { username, activeRoleName
    // ,
    //  updateActiveRole
     } = useAuth();
  // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip سراسری**
  const { isTooltipGloballyEnabled } = useTooltip();


  // تابع خروج از سیستم
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    // localStorage.removeItem('activeUserRoleName'); 
    localStorage.removeItem('hasSeenWelcomeMessage'); // پاک کردن پیام Welcome
    navigate('/auth/login'); // هدایت به صفحه لاگین
  };

  return (
    <Box
      display={'flex'}
      alignItems="center"
      gap={2}
      sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
    >
      {!hideMenu ? (
        <>
          <Avatar alt="Profile Picture" src={img1} /> {/* اگر imageUrl از توکن بود، می توانید اینجا استفاده کنید */}

          <Box>
            <Typography variant="h6">{username}</Typography> {/* نمایش نام کاربری از Context */}
            <Typography variant="caption">{activeRoleName}</Typography> {/* نمایش رول فعال از Context */}
          </Box>
          <Box sx={{ ml: 'auto' }}>
            {/* استفاده از CustomTooltip برای دکمه خروج */}
            <CustomTooltip title={isTooltipGloballyEnabled ? "Çıkış Yap" : ""} placement="top">
              <IconButton
                color="primary"
                onClick={handleLogout} // فراخوانی تابع handleLogout
                aria-label="logout"
                size="small"
              >
                <IconPower size="20" />
              </IconButton>
            </CustomTooltip>
          </Box>
        </>
      ) : (
        // در حالت مخفی شدن نوار کناری، فقط آواتار و دکمه خروج نمایش داده می شود
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <CustomTooltip title={isTooltipGloballyEnabled ? "Çıkış Yap" : ""} placement="right"> 
            <IconButton
              color="primary"
              onClick={handleLogout}
              aria-label="logout"
              size="small"
            >
              <IconPower size="20" />
            </IconButton>
          </CustomTooltip>
        </Box>
      )}
    </Box>
  );
};