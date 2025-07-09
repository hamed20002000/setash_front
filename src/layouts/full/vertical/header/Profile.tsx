// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Menu, Avatar, Typography, Divider, Button, IconButton, Stack,
  Alert,
} from '@mui/material';
import { IconMail, IconUserShield } from '@tabler/icons-react';

import ProfileImg from 'src/assets/images/profile/user-d1.svg';
import { useAuth } from 'src/context/AuthContext';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // **ایمپورت useTooltip و CustomTooltip**
import ChangeUserRoleModal from './ChangeUserRoleModal';

const Profile = () => {
  const { username, userRoles, activeRoleName, updateActiveRole } = useAuth();
  const { isTooltipGloballyEnabled } = useTooltip(); // **استفاده از useTooltip**

  const [anchorEl2, setAnchorEl2] = useState(null);
  const [openChangeRoleModal, setOpenChangeRoleModal] = useState(false);

  const [profileAlertMessage, setProfileAlertMessage] = useState<string | null>(null);
  const [profileAlertSeverity, setProfileAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

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
    localStorage.removeItem('activeUserRoleName');
    localStorage.removeItem('hasSeenWelcomeMessage');
    window.location.href = '/auth/login';
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

  // useEffect که قبلا رول ها رو از توکن میخوند، حالا از AuthContext لود میشن.
  // const [username, setUsername] = useState<string>('Guest');
  // const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  // const [activeRoleName, setActiveRoleName] = useState<string>('Yükleniyor...');
  // useEffect(() => { ... }, []); این useEffect حذف شده است.


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
            src={ProfileImg}
            alt="Profile Picture"
            sx={{
              width: 35,
              height: 35,
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
          <Avatar src={ProfileImg} alt="Profile Picture" sx={{ width: 95, height: 95 }} />
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
            <CustomTooltip title={isTooltipGloballyEnabled ? "Aktif rolünüzü değiştirin" : ""}> 
              
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
          <CustomTooltip title={isTooltipGloballyEnabled ? "Hesaptan çıkış yapın" : ""}> 
            
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