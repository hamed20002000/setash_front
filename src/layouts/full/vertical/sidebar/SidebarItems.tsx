
// import React, { useState, useEffect } from 'react'; 
// import { getDynamicMenuItems, MenuitemsType } from './MenuItems'; 
// import { useLocation } from 'react-router';
// import { Box, List, useMediaQuery } from '@mui/material';
// import { useSelector, useDispatch } from 'src/store/Store';
// import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
// import NavItem from './NavItem';
// import NavCollapse from './NavCollapse';
// import NavGroup from './NavGroup/NavGroup';
// import { AppState } from 'src/store/Store';

// const SidebarItems = () => {
//   const { pathname } = useLocation();
//   const pathDirect = pathname;
//   const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
//   const customizer = useSelector((state: AppState) => state.customizer);
//   const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
//   const hideMenu: any = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';
//   const dispatch = useDispatch();

//   const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuitemsType[]>([]);
//   const [loadingMenus, setLoadingMenus] = useState(true);
//   const [errorMenus, setErrorMenus] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchMenus = async () => {
//       try {
//         setLoadingMenus(true);
//         setErrorMenus(null); 
//         const fetchedMenus = await getDynamicMenuItems();
//         setDynamicMenuItems(fetchedMenus);
//       } catch (err) {
//         console.error('Failed to fetch dynamic menu items in SidebarItems:', err);
//         setErrorMenus('Failed to load menu items.');
//       } finally {
//         setLoadingMenus(false);
//       }
//     };

//     fetchMenus();
//   }, []); 

//   const [openCollapseId, setOpenCollapseId] = useState<string | null>(null);

//   const handleToggleCollapse = (id: string) => {
//     setOpenCollapseId((prevId) => (prevId === id ? null : id));
//   };

//   React.useEffect(() => {
//     let newOpenCollapseId: string | null = null;
//     dynamicMenuItems.forEach(item => {
//       if (item.children) {
//         const isActiveParent = item.children.some((child: any) =>
//           child.href === pathname ||
//           (child.children && child.children.some((grandchild: any) => grandchild.href === pathname))
//         );
//         if (isActiveParent && item.id) {
//           newOpenCollapseId = item.id;
//         }
//       }
//     });
//     setOpenCollapseId(newOpenCollapseId);
//   }, [pathname, dynamicMenuItems]); 

//   if (loadingMenus) {
//     return (
//       <Box sx={{ px: 3, py: 2 }}>
//         <div>Loading menus...</div>
//       </Box>
//     );
//   }

//   if (errorMenus) {
//     return (
//       <Box sx={{ px: 3, py: 2 }}>
//         <div>Error: {errorMenus}</div>
//       </Box>
//     );
//   }

//   return (
//     <Box sx={{ px: 3 }}>
//       <List sx={{ pt: 0 }} className="sidebarNav">
//         {dynamicMenuItems.map((item) => {
//           if (item.subheader) {
//             return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;
//           } else if (item.children) {
//             return (
//               <NavCollapse
//                 menu={item}
//                 pathDirect={pathDirect}
//                 hideMenu={hideMenu}
//                 pathWithoutLastPart={pathWithoutLastPart}
//                 level={1}
//                 key={item.id}
//                 isOpen={item.id === openCollapseId}
//                 onToggle={handleToggleCollapse}
//               />
//             );
//           } else {
//             return (
//               <NavItem
//                 item={item}
//                 key={item.id}
//                 pathDirect={pathDirect}
//                 hideMenu={hideMenu}
//                 onClick={() => dispatch(toggleMobileSidebar())}
//               />
//             );
//           }
//         })}
//       </List>
//     </Box>
//   );
// };

// export default SidebarItems;

// src/layouts/full/shared/sidebar/SidebarItems.tsx
import React from 'react';
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery, CircularProgress, Typography } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';
import { AppState } from 'src/store/Store';
import { useAuth } from 'src/context/AuthContext';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';
  const dispatch = useDispatch();

  // ✅ دریافت منوها و وضعیت بارگذاری به صورت مستقیم از Context
  const { menuItems, isAuthDataLoading } = useAuth();

  const [openCollapseId, setOpenCollapseId] = React.useState<string | null>(null);

  const handleToggleCollapse = (id: string) => {
    setOpenCollapseId((prevId) => (prevId === id ? null : id));
  };

  React.useEffect(() => {
    let newOpenCollapseId: string | null = null;
    menuItems.forEach(item => {
      if (item.children) {
        const isActiveParent = item.children.some((child: any) =>
          child.href === pathname ||
          (child.children && child.children.some((grandchild: any) => grandchild.href === pathname))
        );
        if (isActiveParent && item.id) {
          newOpenCollapseId = item.id;
        }
      }
    });
    setOpenCollapseId(newOpenCollapseId);
  }, [pathname, menuItems]); // ✅ وابستگی به menuItems به جای dynamicMenuItems

  if (isAuthDataLoading) {
    return (
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={20} />
        <Typography variant="body1" sx={{ ml: 2 }}>Menüler yükleniyor...</Typography>
      </Box>
    );
  }

  // ✅ حذف if (loadingMenus || errorMenus) چون این وضعیت حالا در AuthProvider مدیریت می‌شود

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {menuItems.map((item) => {
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                isOpen={item.id === openCollapseId}
                onToggle={handleToggleCollapse}
              />
            );
          } else {
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                onClick={() => dispatch(toggleMobileSidebar())}
              />
            );
          }
        })}
      </List>
    </Box>
  );
};

export default SidebarItems;