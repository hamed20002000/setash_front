// src/layouts/full/shared/sidebar/SidebarItems.tsx (یا مسیر مشابه)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react'; // <--- **useState را اینجا import کنید**
import Menuitems from './MenuItems';
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

  // **START: تغییرات برای قابلیت اکاردئون در SidebarItems**
  // State برای نگهداری ID منوی کشویی که در حال حاضر باز است
  // اگر هیچ منویی باز نیست، مقدار آن null است.
  const [openCollapseId, setOpenCollapseId] = useState<string | null>(null);

  // تابعی که توسط NavCollapse فراخوانی می‌شود تا وضعیت باز/بسته شدن را مدیریت کند.
  const handleToggleCollapse = (id: string) => {
    // اگر منوی فعلی که کلیک شده، همان منوی باز قبلی است، آن را ببندید (null کنید).
    // در غیر این صورت، ID منوی جدید را برای باز شدن تنظیم کنید.
    setOpenCollapseId((prevId) => (prevId === id ? null : id));
  };

  // useEffect برای بستن سایر منوها هنگام تغییر مسیر
  // و باز کردن منوی والد مسیر فعلی
  React.useEffect(() => {
    let newOpenCollapseId: string | null = null;
    Menuitems.forEach(item => {
      if (item.children) {
        // بررسی کنید آیا مسیر فعلی زیرمجموعه این والد است
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
  }, [pathname]);

  // **END: تغییرات برای قابلیت اکاردئون در SidebarItems**

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {Menuitems.map((item) => {
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
                // **پراپ‌های جدید برای کنترل اکاردئون**
                // `isOpen`: به NavCollapse می‌گوید که آیا باید باز باشد یا نه.
                // اگر id این آیتم با openCollapseId یکی باشد، باید باز باشد.
                isOpen={item.id === openCollapseId}
                // `onToggle`: تابعی که NavCollapse می‌تواند فراخوانی کند تا والد را از کلیک مطلع کند.
                onToggle={handleToggleCollapse}
                // `onClick` اصلی شما را هم نگه می‌داریم، اگرچه ممکن است توسط `onToggle` مدیریت شود.
                onClick={() => dispatch(toggleMobileSidebar())}
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