// src/layouts/full/shared/sidebar/NavCollapse.tsx (مسیر فایل شما)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react'; // useState دیگر اینجا استفاده نمی‌شود
import { useSelector } from 'src/store/Store';
import { useLocation } from 'react-router-dom';

// mui imports
import {
  ListItemIcon,
  ListItemButton,
  Collapse,
  styled,
  ListItemText,
  useTheme,
} from '@mui/material';

// custom imports
import NavItem from '../NavItem'; // مطمئن شوید NavItem از onClick برای بستن سایدبار استفاده می‌کند

// plugins
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'src/store/Store';

type NavGroupProps = {
  [x: string]: any;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: any;
  children?: NavGroupProps[]; // اضافه شدن children به NavGroupProps
};

interface NavCollapseProps {
  menu: NavGroupProps;
  level: number;
  pathWithoutLastPart: any;
  pathDirect: any;
  hideMenu: any;
  // onClick: (event: React.MouseEvent<HTMLElement>) => void; // <--- **این خط را حذف کنید**
  // **START: پراپ‌های جدید برای کنترل اکاردئون**
  isOpen: boolean; // از والد می‌آید، وضعیت باز بودن این منو را نشان می‌دهد
  onToggle: (id: string) => void; // تابعی که از والد می‌آید برای اطلاع‌رسانی کلیک
  // **END: پراپ‌های جدید برای کنترل اکاردئون**
}

// FC Component For Dropdown Menu
const NavCollapse = ({
  menu,
  level,
  pathWithoutLastPart,
  pathDirect,
  hideMenu,
  // onClick, // <--- **این پراپ را از اینجا حذف کنید**
  isOpen, // <--- **پراپ isOpen را دریافت کنید**
  onToggle, // <--- **پراپ onToggle را دریافت کنید**
}: NavCollapseProps) => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const Icon = menu?.icon;
  const theme = useTheme();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  // این handleClick حالا فقط باید به والد (SidebarItems) اطلاع دهد.
  const handleClick = () => {
    // onToggle را با ID منوی فعلی فراخوانی کنید تا والد وضعیت را مدیریت کند.
    onToggle(menu.id);
    // onClick اصلی را که برای بستن سایدبار موبایل بود، اینجا دیگر فراخوانی نمی‌کنیم.
    // چون مسئولیت بستن سایدبار به NavItem منتقل شده است.
  };

  // React.useEffect قبلی که 'open' را بر اساس pathname تنظیم می‌کرد،
  // دیگر نیازی به setOpen داخلی ندارد و باید حذف شود.
  // این useEffect باید حذف شود تا فقط والد کنترل کند.
  /*
  React.useEffect(() => {
       // این منطق حالا باید توسط والد مدیریت شود
     setOpen(false); // <--- این خط باید حذف شود
     menu?.children?.forEach((item: any) => {
       if (item?.href === pathname) {
         setOpen(true); // <--- این خط باید حذف شود
       }
     });
   }, [pathname, menu.children]);
   */

  const menuIcon =
    level > 1 ? <Icon stroke={1.5} size="1rem" /> : <Icon stroke={1.5} size="1.3rem" />;

  // بررسی کنید آیا هر یک از فرزندان این منو در مسیر فعلی فعال هستند
  const isAnyChildActive = menu.children
    ? menu.children.some(
      (child: any) =>
        child.href === pathname ||
        (child.children && child.children.some((grandchild: any) => grandchild.href === pathname))
    )
    : false;

  const ListItemStyled = styled(ListItemButton)(() => ({
    marginBottom: '2px',
    padding: '8px 10px',
    paddingLeft: hideMenu ? '10px' : level > 2 ? `${level * 15}px` : '10px',
    // backgroundColor و color حالا بر اساس isOpen و isAnyChildActive تنظیم می‌شوند
    backgroundColor: (isOpen || isAnyChildActive) && level < 2 ? 'rgb(93 135 255)' : 'transparent',
    whiteSpace: 'nowrap',
    '&:hover': {
      backgroundColor: (pathname.includes(menu.href) || isOpen || isAnyChildActive)
        ? theme.palette.primary.main
        : theme.palette.primary.light,
      color: (pathname.includes(menu.href) || isOpen || isAnyChildActive) ? 'black' : theme.palette.primary.main,
    },
    color:
      (isOpen || isAnyChildActive) && level < 2
        ? 'black'
        : (level > 1 && (isOpen || isAnyChildActive)
          ? theme.palette.primary.main
          : 'inherit'
        ),
    borderRadius: `${customizer.borderRadius}px`,
  }));

  // If Menu has Children
  const submenus = menu.children?.map((item: any) => {
    if (item.children) {
      return (
        <NavCollapse
          key={item?.id}
          menu={item}
          level={level + 1}
          pathWithoutLastPart={pathWithoutLastPart}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          isOpen={false} // <--- برای زیرمنوها، فعلاً isOpen را false در نظر بگیرید مگر اینکه منطق پیچیده‌تری برای آن اضافه کنید
          onToggle={onToggle} // تابع onToggle را به پایین پاس می‌دهیم
        />
      );
    } else {
      return (
        <NavItem
          key={item.id}
          item={item}
          level={level + 1}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          onClick={() => { }}
        />
      );
    }
  });

  return (
    <>
      <ListItemStyled
        onClick={handleClick} // <--- استفاده از handleClick جدید
        selected={isAnyChildActive} // فقط اگر فرزندان فعال باشند selected شود
        key={menu?.id}
      >
        <ListItemIcon
          sx={{
            minWidth: '36px',
            p: '3px 0',
            color: 'inherit',
          }}
        >
          {menuIcon}
        </ListItemIcon>
        <ListItemText color="inherit">{hideMenu ? '' : <>{t(`${menu.title}`)}</>}</ListItemText>
        {/* استفاده از پراپ `isOpen` برای نمایش آیکون صحیح */}
        {!isOpen ? <IconChevronDown size="1rem" /> : <IconChevronUp size="1rem" />}
      </ListItemStyled>
      {/* استفاده از پراپ `isOpen` برای کنترل وضعیت Collapse */}
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <div style={{ marginLeft: "10px", background: "rgb(93 135 255 / 19%)" }}>
          {submenus}
        </div>
      </Collapse>
    </>
  );
};

export default NavCollapse;