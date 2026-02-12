
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  useMediaQuery
} from '@mui/material';
import { useSelector } from 'src/store/Store';
import img1 from 'src/assets/images/profile/user-d1.svg';
import { IconPower } from '@tabler/icons-react';
import { AppState } from 'src/store/Store';
import {
  useNavigate
} from 'react-router-dom';

import { useAuth } from 'src/context/AuthContext';
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';


import server from '../../../../../assets/address.json';


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
    return img1;
  }
  return `${server.urldpwonload}${fileUrl}`;
};

export const Profile = () => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  const navigate = useNavigate();
  const { username, activeRoleName } = useAuth();
  const { isTooltipGloballyEnabled } = useTooltip();

  const [profileImage, setProfileImage] = useState<string>(img1);

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

  const handleLogout = () => {
    localStorage.removeItem('authToken');
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
            src={profileImage}
            imgProps={{
              onError: (e) => {
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