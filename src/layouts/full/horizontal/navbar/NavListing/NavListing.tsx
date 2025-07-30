// src/layouts/full/shared/sidebar/NavListing.tsx

import { useState, useEffect } from 'react'; // ✅ وارد کردن useState و useEffect
import { useLocation } from 'react-router';
import { Box, List, Theme, useMediaQuery, CircularProgress, Typography, Stack } from '@mui/material'; // ✅ وارد کردن CircularProgress, Typography, Stack
import { useSelector } from 'src/store/Store';
import NavItem from '../NavItem/NavItem';
import NavCollapse from '../NavCollapse/NavCollapse';
import { AppState } from 'src/store/Store';

// ✅ وارد کردن تابع getDynamicMenuItems و اینترفیس MenuitemsType
import { getDynamicMenuItems, MenuitemsType } from '../Menudata'; // مسیر را بر اساس ساختار پروژه خود تنظیم کنید

const NavListing = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  // ✅ State جدید برای نگهداری منوهای داینامیک و وضعیت بارگذاری
  const [menuItems, setMenuItems] = useState<MenuitemsType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // برای مدیریت خطاها

  // ✅ useEffect برای واکشی منوها هنگام mount شدن کامپوننت
  useEffect(() => {
    const fetchMenus = async () => {
      setLoading(true);
      setError(null); // هر خطای قبلی را پاک کن
      try {
        const items = await getDynamicMenuItems();
        setMenuItems(items);
      } catch (err) {
        console.error("Failed to fetch dynamic menu items:", err);
        setError("Menüler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.");
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, []); // آرایه وابستگی خالی برای اطمینان از اینکه فقط یک بار اجرا می‌شود

  // ✅ نمایش وضعیت بارگذاری یا خطا
  if (loading) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px' }}>
        <CircularProgress size={30} />
        {/* <Typography variant="caption" sx={{ ml: 1 }}>Menüler yükleniyor...</Typography> */}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error" variant="body2">{error}</Typography>
      </Box>
    );
  }

  // اگر منو آیتم‌ها خالی باشند (مثلاً کاربر لاگین نکرده)
  if (menuItems.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="textSecondary">Henüz menü öğesi bulunamadı.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* توجه: Menudata ثابت را با menuItems داینامیک جایگزین کنید.
        اگر Menudata هنوز یک آرایه خالی یا برای مقاصد دیگر استفاده می‌شود،
        می‌توانید Menudata را حذف یا نام آن را تغییر دهید.
      */}
      <List sx={{ p: 0, display: 'flex', zIndex: '100' }}>
        {menuItems.map((item) => { // ✅ استفاده از menuItems
          // اگر آیتم یک subheader است (navlabel: true)
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

          // اگر آیتم فرزندان (children) دارد، NavCollapse را رندر کن
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
            // اگر آیتم فرزندان ندارد، NavItem را رندر کن
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