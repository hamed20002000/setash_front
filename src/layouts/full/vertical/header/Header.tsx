import React from 'react'; // useState و useEffect دیگر مستقیم در اینجا لازم نیستند
import {
  IconButton, Box, AppBar, useMediaQuery, Toolbar, styled, Stack,
  Button,
  FormControlLabel, Switch,
  Alert,
} from '@mui/material';

import { useSelector, useDispatch } from 'src/store/Store';
import { toggleSidebar, toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import { IconMenu2, IconUserShield, IconInfoSquare } from '@tabler/icons-react';
import Profile from './Profile';
import Search from './Search';
import { AppState } from 'src/store/Store';

import { useAuth } from '../../../../context/AuthContext';
import { useTooltip, CustomTooltip } from '../../../../context/TooltipContext'; // **ایمپورت useTooltip و CustomTooltip**
import ChangeUserRoleModal from './ChangeUserRoleModal';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));

  const customizer = useSelector((state: AppState) => state.customizer);
  const dispatch = useDispatch();

  const { userRoles, activeRoleName, updateActiveRole } = useAuth();
  const { isTooltipGloballyEnabled, toggleTooltipGlobal } = useTooltip(); // **استفاده از useTooltip**

  const [openRoleSelectionModal, setOpenRoleSelectionModal] = React.useState(false); // از React.useState استفاده کنید
  // const [isTooltipGloballyEnabled, setIsTooltipGloballyEnabled] = useState(true); // این state حذف می‌شود

  const [headerAlertMessage, setHeaderAlertMessage] = React.useState<string | null>(null);
  const [headerAlertSeverity, setHeaderAlertSeverity] = React.useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showHeaderAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setHeaderAlertMessage(message);
    setHeaderAlertSeverity(severity);
    setTimeout(() => setHeaderAlertMessage(null), 5000);
  };

  // useEffect که قبلاً وضعیت Tooltip را از localStorage می‌خواند، حالا توسط TooltipProvider مدیریت می‌شود.
  // const [isTooltipGloballyEnabled, setIsTooltipGloballyEnabled] = useState(true); // این دیگر لازم نیست

  const handleOpenRoleSelectionModal = () => {
    if (userRoles.length > 1) {
      setOpenRoleSelectionModal(true);
    } else if (userRoles.length === 1) {
      showHeaderAlert("Bu kullanıcının zaten tek bir rolü var.", "info");
    } else {
      showHeaderAlert("Bu kullanıcı için rol bulunamadı.", "warning");
    }
  };

  const handleCloseRoleSelectionModal = () => {
    setOpenRoleSelectionModal(false);
  };

  const handleTooltipToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    toggleTooltipGlobal(event.target.checked); // **فراخوانی تابع از Context**
  };


  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: customizer.TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={lgUp ? () => dispatch(toggleSidebar()) : () => dispatch(toggleMobileSidebar())}
        >
          <IconMenu2 size="20" />
        </IconButton>

        <Search />
        {lgUp ? (
          <>
            {/* <Navigation /> */}
          </>
        ) : null}

        <Box flexGrow={1} />

        <Stack spacing={1} direction="row" alignItems="center">
          {userRoles.length > 1 && (
            <CustomTooltip title="Aktif Rolü Seçin"> 
              <Button
                variant="outlined"
                color="primary"
                onClick={handleOpenRoleSelectionModal}
                startIcon={<IconUserShield size={20} />}
                size="small"
              >
                {activeRoleName || "Rol Seç"}
              </Button>
            </CustomTooltip>
          )}

          {/* <CustomTooltip title="Araç İpuçlarını Etkinleştir/Devre Dışı Bırak"> 
            <FormControlLabel
              control={
                <Switch
                  checked={isTooltipGloballyEnabled}
                  onChange={handleTooltipToggle}
                  name="tooltip-toggle"
                  color="primary"
                />
              }
              label={
                <IconButton color="inherit" size="small">
                  <IconInfoSquare size={20} />
                </IconButton>
              }
              labelPlacement="start"
            />
          </CustomTooltip> */}

          <Profile />
        </Stack>
      </ToolbarStyled>

      {headerAlertMessage && (
        <Box sx={{ width: '100%', position: 'absolute', top: 64, left: 0, zIndex: 1200 }}>
          <Alert severity={headerAlertSeverity} onClose={() => setHeaderAlertMessage(null)}>
            {headerAlertMessage}
          </Alert>
        </Box>
      )}

      <ChangeUserRoleModal
        open={openRoleSelectionModal}
        onClose={handleCloseRoleSelectionModal}
        userRoles={userRoles}
        currentActiveRoleName={activeRoleName}
        onRoleChange={updateActiveRole}
        showAlert={showHeaderAlert}
      />
    </AppBarStyled>
  );
};

export default Header;