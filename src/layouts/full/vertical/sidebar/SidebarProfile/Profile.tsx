// // import React, { useEffect } from 'react';
// import { Box, Avatar, Typography, IconButton, 
//   // Tooltip, 
//   useMediaQuery } from '@mui/material';
// import { useSelector } from 'src/store/Store';
// import img1 from 'src/assets/images/profile/user-d1.svg';
// import { IconPower } from '@tabler/icons-react';
// import { AppState } from 'src/store/Store';
// import { 
//   // Link, 
//   useNavigate } from 'react-router-dom'; // useNavigate اضافه شد

// import { useAuth } from 'src/context/AuthContext'; // **ایمپورت useAuth**
// import { CustomTooltip, useTooltip } from 'src/context/TooltipContext'; // **ایمپورت CustomTooltip و useTooltip**

// export const Profile = () => {
//   const customizer = useSelector((state: AppState) => state.customizer);
//   const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
//   const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

//   const navigate = useNavigate(); // هوک navigate برای ریدایرکت پس از خروج

//   // **استفاده از useAuth برای دسترسی به مقادیر Context**
//   const { username, activeRoleName
//     // ,
//     //  updateActiveRole
//      } = useAuth();
//   // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip سراسری**
//   const { isTooltipGloballyEnabled } = useTooltip();


//   // تابع خروج از سیستم
//   const handleLogout = () => {
//     localStorage.removeItem('authToken');
//     // localStorage.removeItem('activeUserRoleName'); 
//     localStorage.removeItem('hasSeenWelcomeMessage'); // پاک کردن پیام Welcome
//     navigate('/auth/login'); // هدایت به صفحه لاگین
//   };

//   return (
//     <Box
//       display={'flex'}
//       alignItems="center"
//       gap={2}
//       sx={{ m: 3, p: 2, bgcolor: `${'secondary.light'}` }}
//     >
//       {!hideMenu ? (
//         <>
//           <Avatar alt="Profile Picture" src={img1} /> 
//           <Box>
//             <Typography variant="h6">{username}</Typography> {/* نمایش نام کاربری از Context */}
//             <Typography variant="caption">{activeRoleName}</Typography> {/* نمایش رول فعال از Context */}
//           </Box>
//           <Box sx={{ ml: 'auto' }}>
//             {/* استفاده از CustomTooltip برای دکمه خروج */}
//             <CustomTooltip title={isTooltipGloballyEnabled ? "Çıkış Yap" : ""} placement="top">
//               <IconButton
//                 color="primary"
//                 onClick={handleLogout} // فراخوانی تابع handleLogout
//                 aria-label="logout"
//                 size="small"
//               >
//                 <IconPower size="20" />
//               </IconButton>
//             </CustomTooltip>
//           </Box>
//         </>
//       ) : (
//         // در حالت مخفی شدن نوار کناری، فقط آواتار و دکمه خروج نمایش داده می شود
//         <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
//           <CustomTooltip title={isTooltipGloballyEnabled ? "Çıkış Yap" : ""} placement="right"> 
//             <IconButton
//               color="primary"
//               onClick={handleLogout}
//               aria-label="logout"
//               size="small"
//             >
//               <IconPower size="20" />
//             </IconButton>
//           </CustomTooltip>
//         </Box>
//       )}
//     </Box>
//   );
// };




import { useEffect, useState } from 'react'; // useState اضافه شد
import axios from 'axios'; // axios اضافه شد
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  // Tooltip, 
  useMediaQuery
} from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-d1.svg';
import { IconPower } from '@tabler/icons-react';
import { AppState } from 'src/store/Store';
import {
  // Link, 
  useNavigate
} from 'react-router-dom';

import { useAuth } from 'src/context/AuthContext';
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';

// فرض بر این است که فایل کانفیگ در این مسیر است (اگر مسیر فرق دارد اصلاح کنید)

import server from '../../../../../assets/address.json';

// ----------------------------------------------------------------------
// تعریف اینترفیس و توابع کمکی (دقیقاً مثل کد قبلی)
// ----------------------------------------------------------------------

interface JwtPayload {
  userid: number | string;
  username: string;
  role: string[];
  isActive: boolean;
  iat: number;
  exp: number;
}

const decodeJwtToken = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decoding JWT token:", e);
    return null;
  }
};

const getFullImageUrl = (fileUrl: string | undefined): string => {
  if (!fileUrl || fileUrl === "N/A" || fileUrl.startsWith('data:')) {
    return img1; // عکس پیش‌فرض همین فایل
  }
  return `${server.urldpwonload}${fileUrl}`;
};
// ----------------------------------------------------------------------

export const Profile = () => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  const navigate = useNavigate();
  const { username, activeRoleName } = useAuth();
  const { isTooltipGloballyEnabled } = useTooltip();

  // استیت برای عکس پروفایل (پیش‌فرض: img1)
  const [profileImage, setProfileImage] = useState<string>(img1);

  // --- دریافت عکس کاربر ---
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      const decoded = decodeJwtToken(authToken);

      if (decoded && decoded.userid) {
        fetchUserImage(authToken, decoded.userid);
      }
    }
  }, []);

  const fetchUserImage = (token: string, currentUserId: string | number) => {
    axios.get(server.baseurl + server.user + "get-users", {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
    }).then((result) => {
      if (result.data.httpStatusCode === 200 && Array.isArray(result.data.data)) {
        // پیدا کردن کاربر جاری
        const foundUser = result.data.data.find((u: any) => String(u.id) === String(currentUserId));

        if (foundUser) {
          const finalUrl = getFullImageUrl(foundUser.imageSrc);
          setProfileImage(finalUrl);
        }
      }
    }).catch((e) => {
      console.error("Error fetching user image in sidebar", e);
    });
  };
  // -----------------------

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    // localStorage.removeItem('activeUserRoleName'); 
    localStorage.removeItem('hasSeenWelcomeMessage');
    navigate('/auth/login');
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
          <Avatar
            alt="Profile Picture"
            src={profileImage} // استفاده از استیت داینامیک
            imgProps={{
              onError: (e) => {
                // هندل کردن خطای لود عکس
                (e.target as HTMLImageElement).src = img1;
              }
            }}
          />
          <Box>
            <Typography variant="h6">{username}</Typography>
            <Typography variant="caption">{activeRoleName}</Typography>
          </Box>
          <Box sx={{ ml: 'auto' }}>
            <CustomTooltip title={isTooltipGloballyEnabled ? "Çıkış Yap" : ""} placement="top">
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
        </>
      ) : (
        // در حالت مخفی شدن نوار کناری
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