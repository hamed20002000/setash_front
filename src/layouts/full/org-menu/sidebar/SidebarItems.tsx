// src/layouts/full/shared/sidebar/SidebarItems.tsx

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react'; // useEffect را اضافه کنید
// Menuitems از اینجا ایمپورت نمی‌شود، بلکه getDynamicMenuItems ایمپورت می‌شود
import { getDynamicMenuItems, MenuitemsType } from './MenuItems'; // مسیر صحیح را چک کنید
import { useLocation } from 'react-router';
import { Box, List, useMediaQuery } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';
import { AppState } from 'src/store/Store';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const hideMenu: any = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';
  const dispatch = useDispatch();

  // اضافه کردن state برای نگهداری منوهای داینامیک
  const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuitemsType[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [errorMenus, setErrorMenus] = useState<string | null>(null);

  // فراخوانی API برای دریافت منوها
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setLoadingMenus(true);
        setErrorMenus(null); // خطا را پاک کنید قبل از فراخوانی جدید
        const fetchedMenus = await getDynamicMenuItems();
        setDynamicMenuItems(fetchedMenus);
      } catch (err) {
        console.error('Failed to fetch dynamic menu items in SidebarItems:', err);
        setErrorMenus('Failed to load menu items.');
      } finally {
        setLoadingMenus(false);
      }
    };

    fetchMenus();
  }, []); // این useEffect فقط یک بار هنگام mount شدن کامپوننت اجرا می‌شود

  // **START: تغییرات برای قابلیت اکاردئون در SidebarItems**
  const [openCollapseId, setOpenCollapseId] = useState<string | null>(null);

  const handleToggleCollapse = (id: string) => {
    setOpenCollapseId((prevId) => (prevId === id ? null : id));
  };

  // این useEffect باید روی dynamicMenuItems کار کند
  React.useEffect(() => {
    let newOpenCollapseId: string | null = null;
    // از dynamicMenuItems استفاده کنید به جای Menuitems
    dynamicMenuItems.forEach(item => {
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
  }, [pathname, dynamicMenuItems]); // dynamicMenuItems را به dependencies اضافه کنید

  // **END: تغییرات برای قابلیت اکاردئون در SidebarItems**

  if (loadingMenus) {
    return (
      <Box sx={{ px: 3, py: 2 }}>
        <div>Loading menus...</div>
      </Box>
    );
  }

  if (errorMenus) {
    return (
      <Box sx={{ px: 3, py: 2 }}>
        <div>Error: {errorMenus}</div>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {/* از dynamicMenuItems برای رندر کردن استفاده کنید */}
        {dynamicMenuItems.map((item) => {
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