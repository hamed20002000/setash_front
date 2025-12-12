// import { useEffect, useState } from 'react';
// import {
//   Box,
//   Grid,
//   CircularProgress,
//   Card,
//   CardContent,
//   Typography,
//   Avatar,
//   Chip,
//   Divider,
//   Stack,
//   Link
// } from '@mui/material';
// import {
//   Business as BusinessIcon,
//   Phone as PhoneIcon,
//   Language as LanguageIcon,
//   Person as PersonIcon,
//   CheckCircle as CheckCircleIcon,
//   Cancel as CancelIcon
// } from '@mui/icons-material';

// import PageContainer from 'src/components/container/PageContainer';
// import Welcome from 'src/layouts/full/shared/welcome/Welcome';
// import { useAuth } from 'src/context/AuthContext';

// // ایمپورت کامپوننت‌های آماری
// import DashboardStats from './DashboardStats';
// import WorkhouseBetonStats from './WorkhouseBetonStats';
// import WorkhouseSalaryStats from './WorkhouseSalaryStats';
// import WorkhouseFuelStats from './WorkhouseFuelStats';
// import WorkhouseDispatchStats from './WorkhouseDispatchStats';

// // ایمپورت لوگو
// import Logo from 'src/assets/images/logos/logo.png';

// // تعریف اینترفیس برای پیلود توکن
// interface JwtPayload {
//   username: string;
//   role: string[];
//   isActive: boolean;
//   iat: number;
//   exp: number;
// }

// // تابع Decode کردن توکن (طبق کدی که فرستادید)
// const decodeJwtToken = (token: string): JwtPayload | null => {
//   try {
//     const base64Url = token.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const jsonPayload = decodeURIComponent(
//       atob(base64)
//         .split('')
//         .map(function (c) {
//           return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         })
//         .join(''),
//     );
//     return JSON.parse(jsonPayload);
//   } catch (e) {
//     console.error("Error decoding JWT token:", e);
//     return null;
//   }
// };

// const WELCOME_MESSAGE_KEY = 'hasSeenWelcomeMessage';

// const Modern = () => {
//   const [showWelcome, setShowWelcome] = useState(false);
//   const { allowedOperations, isAuthDataLoading } = useAuth();
//   const [userInfo, setUserInfo] = useState<JwtPayload | null>(null);

//   useEffect(() => {
//     // منطق خوش‌آمدگویی
//     const hasSeen = localStorage.getItem(WELCOME_MESSAGE_KEY);
//     if (!hasSeen) {
//       setShowWelcome(true);
//       localStorage.setItem(WELCOME_MESSAGE_KEY, 'true');
//     }
//     debugger
//     // گرفتن اطلاعات کاربر از توکن برای نمایش در صفحه عدم دسترسی
//     const authToken = localStorage.getItem('authToken');
//     if (authToken) {
//       const decoded = decodeJwtToken(authToken);
//       setUserInfo(decoded);
//     }
//   }, []);

//   if (isAuthDataLoading) {
//     return (
//       <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
//         <CircularProgress />
//       </Box>
//     );
//   }

//   // بررسی دسترسی به داشبورد
//   const hasDashboardPermission = allowedOperations.some(
//     (op) => op.menuOperationId === '3'
//   );

//   // ----------------------------------------------------------------
//   // اگر دسترسی نداشت، صفحه اطلاعات شرکت و کاربر را نمایش بده
//   // ----------------------------------------------------------------
//   if (!hasDashboardPermission) {
//     return (
//       <PageContainer title="Setaş Portal" description="Access Info">
//         <Box
//           display="flex"
//           justifyContent="center"
//           alignItems="center"
//           minHeight="80vh"
//           sx={{ p: 2 }}
//         >
//           <Card
//             elevation={9}
//             sx={{
//               width: '100%',
//               borderRadius: 3,
//               textAlign: 'center',
//               overflow: 'hidden'
//             }}
//           >
//             {/* نوار رنگی بالای کارت */}
//             <Box sx={{ height: 8, bgcolor: 'primary.main' }} />

//             <CardContent sx={{ p: 4 }}>

//               {/* --- بخش لوگو و نام شرکت --- */}
//               <Box mb={4}>
//                 <Box
//                   component="img"
//                   src={Logo}
//                   alt="Setas Logo"
//                   sx={{ height: 80, mb: 2, objectFit: 'contain' }}
//                 />
//                 <Typography variant="h5" fontWeight="bold" color="textPrimary" gutterBottom>
//                   Setaş Sistem Bilişim San.Tic.A.Ş
//                 </Typography>
//               </Box>

//               <Divider sx={{ my: 3 }}>
//                 <Chip label="Kullanıcı Profili" size="small" />
//               </Divider>

//               {/* --- بخش اطلاعات کاربر --- */}
//               {userInfo ? (
//                 <Box mb={4} sx={{ bgcolor: 'primary.light', p: 3, borderRadius: 2, color: 'primary.contrastText' }}>
//                   <Stack direction="column" alignItems="center" spacing={1}>
//                     <Avatar
//                       sx={{
//                         width: 64,
//                         height: 64,
//                         bgcolor: 'white',
//                         color: 'primary.main',
//                         fontSize: '1.5rem',
//                         fontWeight: 'bold',
//                         mb: 1
//                       }}
//                     >
//                       {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : <PersonIcon />}
//                     </Avatar>

//                     <Typography variant="h4" fontWeight="600" sx={{ color: 'primary.main' }}>
//                       {userInfo.username}
//                     </Typography>

//                     <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" justifyContent="center">
//                       {userInfo.role && userInfo.role.map((r, index) => (
//                         <Chip
//                           key={index}
//                           label={r}
//                           size="small"
//                           sx={{ bgcolor: 'rgba(255,255,255,0.2)', }}
//                         />
//                       ))}
//                     </Box>

//                     <Chip
//                       icon={userInfo.isActive ? <CheckCircleIcon style={{ color: 'white' }} /> :
//                         <CancelIcon style={{ color: 'white' }} />}
//                       label={userInfo.isActive ? "Active User" : "Inactive User"}
//                       color={userInfo.isActive ? "success" : "error"}
//                       variant="filled"
//                       sx={{ mt: 1, fontWeight: 'bold' }}
//                     />
//                   </Stack>
//                 </Box>
//               ) : (
//                 <Typography color="error">Kullanıcı bilgileri yüklenemedi.</Typography>
//               )}

//               <Divider sx={{ my: 3 }}>
//                 <Chip label="İletişim Bilgileri" size="small" />
//               </Divider>

//               {/* --- بخش اطلاعات تماس --- */}
//               <Stack spacing={2} sx={{ textAlign: 'left' }}>

//                 {/* آدرس */}
//                 <Box display="flex" alignItems="flex-start" gap={2}>
//                   <BusinessIcon color="action" />
//                   <Typography variant="body2" color="textSecondary">
//                     Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR
//                   </Typography>
//                 </Box>

//                 {/* تلفن و فکس */}
//                 <Box display="flex" alignItems="flex-start" gap={2}>
//                   <PhoneIcon color="action" />
//                   <Box>
//                     <Typography variant="body2" color="textSecondary" display="block">
//                       Tel: +90 (232) 347 74 74 pbx
//                     </Typography>
//                     <Typography variant="body2" color="textSecondary" display="block">
//                       Fax: +90 (232) 347 77 11
//                     </Typography>
//                   </Box>
//                 </Box>

//                 {/* سایت و ایمیل */}
//                 <Box display="flex" alignItems="flex-start" gap={2}>
//                   <LanguageIcon color="action" />
//                   <Box>
//                     <Link href="http://www.setasbilisim.com.tr" target="_blank" underline="hover" color="primary">
//                       http://www.setasbilisim.com.tr
//                     </Link>
//                     <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
//                       e-mail: setas@setasbilisim.com.tr
//                     </Typography>
//                   </Box>
//                 </Box>

//               </Stack>
//             </CardContent>
//           </Card>
//         </Box>
//       </PageContainer>
//     );
//   }

//   // ----------------------------------------------------------------
//   // اگر دسترسی داشت، داشبورد را نمایش بده
//   // ----------------------------------------------------------------
//   return (
//     <PageContainer title="Setaş Portal" description="Dashboard">
//       <Box>
//         <Grid container spacing={3}>
//           <Grid item xs={12}><DashboardStats /></Grid>
//           <Grid item xs={12}><WorkhouseBetonStats /></Grid>
//           <Grid item xs={12}><WorkhouseSalaryStats /></Grid>
//           <Grid item xs={12}><WorkhouseFuelStats /></Grid>
//           <Grid item xs={12}><WorkhouseDispatchStats /></Grid>
//           {showWelcome && (
//             <Grid item xs={12}><Welcome /></Grid>
//           )}
//         </Grid>
//       </Box>
//     </PageContainer>
//   );
// };

// export default Modern;

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Divider,
  Stack,
  Link
} from '@mui/material';
import {
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import PageContainer from 'src/components/container/PageContainer';
import Welcome from 'src/layouts/full/shared/welcome/Welcome';
import { useAuth } from 'src/context/AuthContext';

// ایمپورت کامپوننت‌های آماری
import DashboardStats from './DashboardStats';
import WorkhouseBetonStats from './WorkhouseBetonStats';
import WorkhouseSalaryStats from './WorkhouseSalaryStats';
import WorkhouseFuelStats from './WorkhouseFuelStats';
import WorkhouseDispatchStats from './WorkhouseDispatchStats';

// ایمپورت لوگو و عکس پیش‌فرض
import Logo from 'src/assets/images/logos/logo.png';
// مسیر عکس پیش‌فرض طبق کدی که دادید
import imagedefault from 'src/assets/images/profile/user-d.svg';

// فرض بر این است که آبجکت server ایمپورت شده است

import server from '../../assets/address.json';

// تعریف ثابت عکس پیش‌فرض برای استفاده در تابع کمکی
const DEFAULT_IMAGE_URL = imagedefault;

// اینترفیس توکن (فیلد userid اضافه شد)
interface JwtPayload {
  userid: number | string;
  username: string;
  role: string[];
  isActive: boolean;
  iat: number;
  exp: number;
}

// تابع Decode توکن
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

// --- تابع کمکی ساخت آدرس عکس (طبق دستور شما) ---
const getFullImageUrl = (fileUrl: string | undefined): string => {
  if (!fileUrl || fileUrl === "N/A" || fileUrl.startsWith('data:')) {
    return DEFAULT_IMAGE_URL;
  }
  // اتصال آدرس دانلود سرور به نام فایل
  return `${server.urldpwonload}${fileUrl}`;
};

const WELCOME_MESSAGE_KEY = 'hasSeenWelcomeMessage';

const Modern = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const { allowedOperations, isAuthDataLoading } = useAuth();
  const [userInfo, setUserInfo] = useState<JwtPayload | null>(null);

  // استیت برای نگهداری آدرس نهایی عکس
  const [profileImage, setProfileImage] = useState<string>(DEFAULT_IMAGE_URL);

  useEffect(() => {
    // منطق خوش‌آمدگویی
    const hasSeen = localStorage.getItem(WELCOME_MESSAGE_KEY);
    if (!hasSeen) {
      setShowWelcome(true);
      localStorage.setItem(WELCOME_MESSAGE_KEY, 'true');
    }

    // گرفتن اطلاعات کاربر و عکس
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      const decoded = decodeJwtToken(authToken);
      setUserInfo(decoded);

      // اگر userid در توکن بود، درخواست گرفتن لیست کاربران را ارسال کن
      if (decoded && decoded.userid) {
        fetchUserImage(authToken, decoded.userid);
      }
    }
  }, []);

  // تابع دریافت لیست و پیدا کردن عکس کاربر
  const fetchUserImage = (token: string, currentUserId: string | number) => {
    // دقیقاً از همان آدرس API که دادید استفاده شده
    axios.get(server.baseurl + server.user + "get-users", {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` }
    }).then((result) => {
      if (result.data.httpStatusCode === 200 && Array.isArray(result.data.data)) {
        // پیدا کردن کاربر جاری در لیست
        const foundUser = result.data.data.find((u: any) => String(u.id) === String(currentUserId));

        if (foundUser) {
          // استفاده از تابع کمکی شما برای ساخت لینک عکس
          const finalUrl = getFullImageUrl(foundUser.imageSrc);
          setProfileImage(finalUrl);
        }
      }
    }).catch((e) => {
      console.error("Error fetching user image", e);
      // در صورت خطا همان عکس پیش‌فرض می‌ماند
    });
  };

  if (isAuthDataLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // بررسی دسترسی به داشبورد
  const hasDashboardPermission = allowedOperations.some(
    (op) => op.menuOperationId === '3'
  );

  // ----------------------------------------------------------------
  // اگر دسترسی نداشت، صفحه اطلاعات شرکت و کاربر را نمایش بده
  // ----------------------------------------------------------------
  if (!hasDashboardPermission) {
    return (
      <PageContainer title="Setaş Portal" description="Access Info">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="80vh"
          sx={{ p: 2 }}
        >
          <Card
            elevation={9}
            sx={{
              width: '100%',
              borderRadius: 3,
              textAlign: 'center',
              overflow: 'hidden'
            }}
          >
            {/* نوار رنگی بالای کارت */}
            <Box sx={{ height: 8, bgcolor: 'primary.main' }} />

            <CardContent sx={{ p: 4 }}>

              {/* --- بخش لوگو و نام شرکت --- */}
              <Box mb={4}>
                <Box
                  component="img"
                  src={Logo}
                  alt="Setas Logo"
                  sx={{ height: 80, mb: 2, objectFit: 'contain' }}
                />
                <Typography variant="h5" fontWeight="bold" color="textPrimary" gutterBottom>
                  Setaş Sistem Bilişim San.Tic.A.Ş
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }}>
                <Chip label="Kullanıcı Profili" size="small" />
              </Divider>

              {/* --- بخش اطلاعات کاربر --- */}
              {userInfo ? (
                <Box mb={4} sx={{ bgcolor: 'primary.light', p: 3, borderRadius: 2, color: 'primary.contrastText' }}>
                  <Stack direction="column" alignItems="center" spacing={1}>

                    {/* نمایش آواتار با عکس گرفته شده از سرور */}
                    <Avatar
                      src={profileImage}
                      sx={{
                        width: 80, // کمی بزرگتر کردم که بهتر دیده شود
                        height: 80,
                        bgcolor: 'white',
                        color: 'primary.main',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        mb: 1,
                        border: '2px solid white'
                      }}
                      imgProps={{
                        onError: (e) => {
                          // اگر عکس سرور لود نشد، عکس پیش‌فرض را بگذار
                          (e.target as HTMLImageElement).src = DEFAULT_IMAGE_URL;
                        }
                      }}
                    >
                      {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : <PersonIcon />}
                    </Avatar>

                    <Typography variant="h4" fontWeight="600" sx={{ color: 'primary.main' }}>
                      {userInfo.username}
                    </Typography>

                    <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" justifyContent="center">
                      {userInfo.role && userInfo.role.map((r, index) => (
                        <Chip
                          key={index}
                          label={r}
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', }}
                        />
                      ))}
                    </Box>

                    <Chip
                      icon={userInfo.isActive ? <CheckCircleIcon style={{ color: 'white' }} /> :
                        <CancelIcon style={{ color: 'white' }} />}
                      label={userInfo.isActive ? "Active User" : "Inactive User"}
                      color={userInfo.isActive ? "success" : "error"}
                      variant="filled"
                      sx={{ mt: 1, fontWeight: 'bold' }}
                    />
                  </Stack>
                </Box>
              ) : (
                <Typography color="error">Kullanıcı bilgileri yüklenemedi.</Typography>
              )}

              <Divider sx={{ my: 3 }}>
                <Chip label="İletişim Bilgileri" size="small" />
              </Divider>

              {/* --- بخش اطلاعات تماس (دست نخورده) --- */}
              <Stack spacing={2} sx={{ textAlign: 'left' }}>

                {/* آدرس */}
                <Box display="flex" alignItems="flex-start" gap={2}>
                  <BusinessIcon color="action" />
                  <Typography variant="body2" color="textSecondary">
                    Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR
                  </Typography>
                </Box>

                {/* تلفن و فکس */}
                <Box display="flex" alignItems="flex-start" gap={2}>
                  <PhoneIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="textSecondary" display="block">
                      Tel: +90 (232) 347 74 74 pbx
                    </Typography>
                    <Typography variant="body2" color="textSecondary" display="block">
                      Fax: +90 (232) 347 77 11
                    </Typography>
                  </Box>
                </Box>

                {/* سایت و ایمیل */}
                <Box display="flex" alignItems="flex-start" gap={2}>
                  <LanguageIcon color="action" />
                  <Box>
                    <Link href="http://www.setasbilisim.com.tr" target="_blank" underline="hover" color="primary">
                      http://www.setasbilisim.com.tr
                    </Link>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                      e-mail: setas@setasbilisim.com.tr
                    </Typography>
                  </Box>
                </Box>

              </Stack>
            </CardContent>
          </Card>
        </Box>
      </PageContainer>
    );
  }

  // ----------------------------------------------------------------
  // اگر دسترسی داشت، داشبورد را نمایش بده
  // ----------------------------------------------------------------
  return (
    <PageContainer title="Setaş Portal" description="Dashboard">
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}><DashboardStats /></Grid>
          <Grid item xs={12}><WorkhouseBetonStats /></Grid>
          <Grid item xs={12}><WorkhouseSalaryStats /></Grid>
          <Grid item xs={12}><WorkhouseFuelStats /></Grid>
          <Grid item xs={12}><WorkhouseDispatchStats /></Grid>
          {showWelcome && (
            <Grid item xs={12}><Welcome /></Grid>
          )}
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Modern;