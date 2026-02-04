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

import DashboardStats from './DashboardStats';
import WorkhouseBetonStats from './WorkhouseBetonStats';
import WorkhouseSalaryStats from './WorkhouseSalaryStats';
import WorkhouseFuelStats from './WorkhouseFuelStats';
import WorkhouseDispatchStats from './WorkhouseDispatchStats';
import ProjectOverallStats from './ProjectOverallStats';

import Logo from 'src/assets/images/logos/logo.png';
import imagedefault from 'src/assets/images/profile/user-d.svg';


import server from '../../assets/address.json';

const DEFAULT_IMAGE_URL = imagedefault;

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
    return DEFAULT_IMAGE_URL;
  }
  return `${server.urldpwonload}${fileUrl}`;
};

const WELCOME_MESSAGE_KEY = 'hasSeenWelcomeMessage';

const Modern = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const { allowedOperations, isAuthDataLoading } = useAuth();
  const [userInfo, setUserInfo] = useState<JwtPayload | null>(null);

  const [profileImage, setProfileImage] = useState<string>(DEFAULT_IMAGE_URL);

  useEffect(() => {
    const hasSeen = localStorage.getItem(WELCOME_MESSAGE_KEY);
    if (!hasSeen) {
      setShowWelcome(true);
      localStorage.setItem(WELCOME_MESSAGE_KEY, 'true');
    }

    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      const decoded = decodeJwtToken(authToken);
      setUserInfo(decoded);

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
        const foundUser = result.data.data.find((u: any) => String(u.id) === String(currentUserId));

        if (foundUser) {
          const finalUrl = getFullImageUrl(foundUser.imageSrc);
          setProfileImage(finalUrl);
        }
      }
    }).catch((e) => {
      console.error("Error fetching user image", e);
    });
  };

  if (isAuthDataLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const hasDashboardPermission = allowedOperations.some(
    (op) => op.menuOperationId === '3'
  );

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
            <Box sx={{ height: 8, bgcolor: 'primary.main' }} />

            <CardContent sx={{ p: 4 }}>

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

              {userInfo ? (
                <Box mb={4} sx={{ bgcolor: 'primary.light', p: 3, borderRadius: 2, color: 'primary.contrastText' }}>
                  <Stack direction="column" alignItems="center" spacing={1}>

                    <Avatar
                      src={profileImage}
                      sx={{
                        width: 80,
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

              <Stack spacing={2} sx={{ textAlign: 'left' }}>

                <Box display="flex" alignItems="flex-start" gap={2}>
                  <BusinessIcon color="action" />
                  <Typography variant="body2" color="textSecondary">
                    Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR
                  </Typography>
                </Box>

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

  return (
    <PageContainer title="Setaş Portal" description="Dashboard">
      <Box>
        <Grid container spacing={3}>
          <Grid item xs={12}><DashboardStats /></Grid>
          <Grid item xs={12}><ProjectOverallStats /></Grid>
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