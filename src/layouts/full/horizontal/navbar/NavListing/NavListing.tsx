

import { useLocation } from 'react-router';
import { Box, List, Theme, useMediaQuery, CircularProgress, Typography, Stack } from '@mui/material';
import { useSelector } from 'src/store/Store';
import NavItem from '../NavItem/NavItem';
import NavCollapse from '../NavCollapse/NavCollapse';
import { AppState } from 'src/store/Store';

import { useAuth } from 'src/context/AuthContext';

const NavListing = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  const { menuItems, isAuthDataLoading } = useAuth();

  if (isAuthDataLoading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px' }}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (menuItems.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary">Henüz menü öğesi bulunamadı.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List sx={{ p: 0, display: 'flex', zIndex: '100' }}>
        {menuItems.map((item) => {
          if (item.navlabel) {
            return (
              <li key={item.id}>
                <Stack>
                  <Typography variant="subtitle2" fontWeight="500" sx={{ color: 'text.Primary', my: 2 }}>
                    {item.subheader}
                  </Typography>
                </Stack>
              </li>
            );
          }
          if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={undefined}
              />
            );
          } else {
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                onClick={undefined}
              />
            );
          }
        })}
      </List>
    </Box>
  );
};

export default NavListing;