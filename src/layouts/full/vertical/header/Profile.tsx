// // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// // @ts-ignore
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Box, Menu, Avatar, Typography, Divider, Button, IconButton, Stack,
//   Alert,
// } from '@mui/material';
// import {
//   // IconMail,
//   IconUserShield
// } from '@tabler/icons-react';

// import ProfileImg from 'src/assets/images/profile/user-d1.svg';
// import { useAuth } from 'src/context/AuthContext';
// import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // **ایمپورت useTooltip و CustomTooltip**
// import ChangeUserRoleModal from './ChangeUserRoleModal';

// const Profile = () => {
//   const navigate = useNavigate();
//   const { username, userRoles, activeRoleName, updateActiveRole } = useAuth();
//   const { isTooltipGloballyEnabled } = useTooltip(); // **استفاده از useTooltip**

//   const [anchorEl2, setAnchorEl2] = useState(null);
//   const [openChangeRoleModal, setOpenChangeRoleModal] = useState(false);

//   const [profileAlertMessage, setProfileAlertMessage] = useState<string | null>(null);
//   const [profileAlertSeverity, setProfileAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

//   const showProfileAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//     setProfileAlertMessage(message);
//     setProfileAlertSeverity(severity);
//     setTimeout(() => setProfileAlertMessage(null), 5000);
//   };

//   const handleClick2 = (event: any) => {
//     setAnchorEl2(event.currentTarget);
//   };
//   const handleClose2 = () => {
//     setAnchorEl2(null);
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('authToken');
//     // localStorage.removeItem('activeUserRoleName');
//     // localStorage.removeItem('lastLoggedInUsername'); 
//     localStorage.removeItem('hasSeenWelcomeMessage');
//     // window.location.href = '/auth/login';
//     navigate('/auth/login');
//   };

//   const handleOpenChangeRoleModal = () => {
//     if (userRoles.length > 1) {
//       setOpenChangeRoleModal(true);
//     } else if (userRoles.length === 1) {
//       showProfileAlert("Bu kullanıcının zaten tek bir rolü var.", "info");
//     } else {
//       showProfileAlert("Bu kullanıcı için rol bulunamadı.", "warning");
//     }
//     handleClose2();
//   };

//   const handleChangeRoleModalClose = () => {
//     setOpenChangeRoleModal(false);
//   };



//   return (
//     <Box>
//       <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcı Profili" : ""}>

//         <IconButton
//           size="large"
//           aria-label="show 11 new notifications"
//           color="inherit"
//           aria-controls="msgs-menu"
//           aria-haspopup="true"
//           sx={{
//             ...(typeof anchorEl2 === 'object' && {
//               color: 'primary.main',
//             }),
//           }}
//           onClick={handleClick2}
//         >
//           <Avatar
//             src={ProfileImg}
//             alt="Profile Picture"
//             sx={{
//               width: 35,
//               height: 35,
//             }}
//           />
//         </IconButton>
//       </CustomTooltip>

//       <Menu
//         id="msgs-menu"
//         anchorEl={anchorEl2}
//         keepMounted
//         open={Boolean(anchorEl2)}
//         onClose={handleClose2}
//         anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
//         transformOrigin={{ horizontal: 'right', vertical: 'top' }}
//         sx={{
//           '& .MuiMenu-paper': {
//             width: '360px',
//             p: 4,
//           },
//         }}
//       >
//         <Typography variant="h5">Kullanıcı Profili</Typography>
//         <Stack direction="row" py={3} spacing={2} alignItems="center">
//           <Avatar src={ProfileImg} alt="Profile Picture" sx={{ width: 95, height: 95 }} />
//           <Box>
//             <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
//               {username}
//             </Typography>
//             <Typography variant="subtitle2" color="textSecondary">
//               {activeRoleName}
//             </Typography>
//           </Box>
//         </Stack>
//         <Divider />

//         {userRoles.length > 1 && (
//           <Box mt={2}>
//             <CustomTooltip placement="left"
//               title={isTooltipGloballyEnabled ? "Aktif rolünüzü değiştirin" : ""}>

//               <Button
//                 variant="outlined"
//                 color="primary"
//                 onClick={handleOpenChangeRoleModal}
//                 startIcon={<IconUserShield size={20} />}
//                 fullWidth
//               >
//                 Rolü Değiştir
//               </Button>
//             </CustomTooltip>
//           </Box>
//         )}

//         <Box mt={2}>
//           <CustomTooltip placement="left"
//             title={isTooltipGloballyEnabled ? "Hesaptan çıkış yapın" : ""}>

//             <Button variant="outlined" color="primary" onClick={handleLogout} fullWidth>
//               Çıkış Yap
//             </Button>
//           </CustomTooltip>
//         </Box>
//       </Menu>

//       <ChangeUserRoleModal
//         open={openChangeRoleModal}
//         onClose={handleChangeRoleModalClose}
//         userRoles={userRoles}
//         currentActiveRoleName={activeRoleName}
//         onRoleChange={updateActiveRole}
//         showAlert={showProfileAlert}
//       />

//       {profileAlertMessage && (
//         <Box sx={{ position: 'fixed', top: 70, right: 20, zIndex: 9999 }}>
//           <Alert severity={profileAlertSeverity} onClose={() => setProfileAlertMessage(null)}>
//             {profileAlertMessage}
//           </Alert>
//         </Box>
//       )}
//     </Box>
//   );
// };

// export default Profile;


// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // اضافه شده
import {
  Box, Menu, Avatar, Typography, Divider, Button, IconButton, Stack,
  Alert,
} from '@mui/material';
import {
  // IconMail,
  IconUserShield
} from '@tabler/icons-react';

import ProfileImg from 'src/assets/images/profile/user-d1.svg';
import { useAuth } from 'src/context/AuthContext';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import ChangeUserRoleModal from './ChangeUserRoleModal';

// فرض بر این است که فایل کانفیگ سرور در این مسیر است

import server from '../../../../assets/address.json';

// --- تعریف اینترفیس و توابع کمکی ---

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
    return ProfileImg; // اگر عکس نبود، عکس پیش‌فرض ایمپورت شده برگردد
  }
  return `${server.urldpwonload}${fileUrl}`;
};

// ------------------------------------

const Profile = () => {
  const navigate = useNavigate();
  const { username, userRoles, activeRoleName, updateActiveRole } = useAuth();
  const { isTooltipGloballyEnabled } = useTooltip();

  const [anchorEl2, setAnchorEl2] = useState(null);
  const [openChangeRoleModal, setOpenChangeRoleModal] = useState(false);

  const [profileAlertMessage, setProfileAlertMessage] = useState<string | null>(null);
  const [profileAlertSeverity, setProfileAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // استیت برای نگهداری عکس پروفایل (مقدار اولیه: عکس پیش‌فرض)
  const [profileImage, setProfileImage] = useState<string>(ProfileImg);

  // --- افکت برای گرفتن عکس کاربر ---
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
          // ساخت آدرس عکس با تابع کمکی
          const finalUrl = getFullImageUrl(foundUser.imageSrc);
          setProfileImage(finalUrl);
        }
      }
    }).catch((e) => {
      console.error("Error fetching user image profile", e);
    });
  };
  // ------------------------------------

  const showProfileAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setProfileAlertMessage(message);
    setProfileAlertSeverity(severity);
    setTimeout(() => setProfileAlertMessage(null), 5000);
  };

  const handleClick2 = (event: any) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    // localStorage.removeItem('activeUserRoleName');
    // localStorage.removeItem('lastLoggedInUsername'); 
    localStorage.removeItem('hasSeenWelcomeMessage');
    // window.location.href = '/auth/login';
    navigate('/auth/login');
  };

  const handleOpenChangeRoleModal = () => {
    if (userRoles.length > 1) {
      setOpenChangeRoleModal(true);
    } else if (userRoles.length === 1) {
      showProfileAlert("Bu kullanıcının zaten tek bir rolü var.", "info");
    } else {
      showProfileAlert("Bu kullanıcı için rol bulunamadı.", "warning");
    }
    handleClose2();
  };

  const handleChangeRoleModalClose = () => {
    setOpenChangeRoleModal(false);
  };

  return (
    <Box>
      <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcı Profili" : ""}>

        <IconButton
          size="large"
          aria-label="show 11 new notifications"
          color="inherit"
          aria-controls="msgs-menu"
          aria-haspopup="true"
          sx={{
            ...(typeof anchorEl2 === 'object' && {
              color: 'primary.main',
            }),
          }}
          onClick={handleClick2}
        >
          <Avatar
            src={profileImage} // تغییر به استیت داینامیک
            alt="Profile Picture"
            sx={{
              width: 35,
              height: 35,
            }}
            imgProps={{
              onError: (e) => {
                // در صورت خطای لود عکس، بازگشت به پیش‌فرض
                (e.target as HTMLImageElement).src = ProfileImg;
              }
            }}
          />
        </IconButton>
      </CustomTooltip>

      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{
          '& .MuiMenu-paper': {
            width: '360px',
            p: 4,
          },
        }}
      >
        <Typography variant="h5">Kullanıcı Profili</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <Avatar
            src={profileImage} // تغییر به استیت داینامیک
            alt="Profile Picture"
            sx={{ width: 95, height: 95 }}
            imgProps={{
              onError: (e) => {
                (e.target as HTMLImageElement).src = ProfileImg;
              }
            }}
          />
          <Box>
            <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
              {username}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {activeRoleName}
            </Typography>
          </Box>
        </Stack>
        <Divider />

        {userRoles.length > 1 && (
          <Box mt={2}>
            <CustomTooltip placement="left"
              title={isTooltipGloballyEnabled ? "Aktif rolünüzü değiştirin" : ""}>

              <Button
                variant="outlined"
                color="primary"
                onClick={handleOpenChangeRoleModal}
                startIcon={<IconUserShield size={20} />}
                fullWidth
              >
                Rolü Değiştir
              </Button>
            </CustomTooltip>
          </Box>
        )}

        <Box mt={2}>
          <CustomTooltip placement="left"
            title={isTooltipGloballyEnabled ? "Hesaptan çıkış yapın" : ""}>

            <Button variant="outlined" color="primary" onClick={handleLogout} fullWidth>
              Çıkış Yap
            </Button>
          </CustomTooltip>
        </Box>
      </Menu>

      <ChangeUserRoleModal
        open={openChangeRoleModal}
        onClose={handleChangeRoleModalClose}
        userRoles={userRoles}
        currentActiveRoleName={activeRoleName}
        onRoleChange={updateActiveRole}
        showAlert={showProfileAlert}
      />

      {profileAlertMessage && (
        <Box sx={{ position: 'fixed', top: 70, right: 20, zIndex: 9999 }}>
          <Alert severity={profileAlertSeverity} onClose={() => setProfileAlertMessage(null)}>
            {profileAlertMessage}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default Profile;