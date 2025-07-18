// src/layouts/full/shared/sidebar/SidebarItems.tsx (یا مسیر مشابه)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
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
  const [openCollapseId, setOpenCollapseId] = useState<string | null>(null);

  const handleToggleCollapse = (id: string) => {
    setOpenCollapseId((prevId) => (prevId === id ? null : id));
  };

  React.useEffect(() => {
    let newOpenCollapseId: string | null = null;
    Menuitems.forEach(item => {
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
                // `isOpen`: به NavCollapse می‌گوید که آیا باید باز باشد یا نه.
                // اگر id این آیتم با openCollapseId یکی باشد، باید باز باشد.
                isOpen={item.id === openCollapseId}
                // `onToggle`: تابعی که NavCollapse می‌تواند فراخوانی کند تا والد را از کلیک مطلع کند.
                onToggle={handleToggleCollapse}
                // **این خط را حذف یا کامنت کنید**
                // onClick={() => dispatch(toggleMobileSidebar())}
              />
            );
          } else {
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                // این `onClick` را اینجا نگه دارید تا پس از کلیک روی آیتم نهایی، سایدبار بسته شود.
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