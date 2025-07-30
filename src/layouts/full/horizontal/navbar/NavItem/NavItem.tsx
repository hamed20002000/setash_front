import React from 'react'; // ✅ حذف ts-ignore
import { NavLink } from 'react-router-dom';
import { IconCircle } from '@tabler/icons-react';
// mui imports
import { ListItemIcon, ListItem, List, styled, ListItemText, useTheme } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { AppState } from 'src/store/Store';

// ✅ نوع NavGroup را با MenuitemsType از MenuItems.ts همگام‌سازی کنید
// بهتر است اینترفیس اصلی MenuitemsType را از MenuItems.ts ایمپورت کنید تا از تکرار جلوگیری شود.
// اگر اینترفیس MenuitemsType در MenuItems.ts به درستی تعریف شده، می‌توانید این را حذف کرده و آن را ایمپورت کنید.
// import { MenuitemsType } from '../MenuItems'; // مثال: اگر MenuItems.ts در همان فولدر است

type NavGroup = {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: React.ElementType; // ✅ تغییر نوع icon به React.ElementType
  href?: string;
  children?: NavGroup[];
  chip?: string;
  chipColor?: any;
  variant?: string | any;
  external?: boolean;
  level?: number;
  disabled?: boolean; // ✅ اضافه شدن disabled prop که در ListItemStyled2 استفاده می‌شود
};

interface ItemType {
  item: NavGroup;
  onClick: React.MouseEventHandler<HTMLElement> | undefined;
  hideMenu: any; // اگر hideMenu استفاده نمی شود، می توانید آن را حذف کنید
  level?: number | any;
  pathDirect: string;
}

const NavItem = ({ item, level, pathDirect, onClick }: ItemType) => {
  const customizer = useSelector((state: AppState) => state.customizer);

  // ✅ اطمینان حاصل کنید که item.icon یک کامپوننت معتبر است.
  // اگر item.icon وجود نداشت، یک آیکون پیش‌فرض (مثلاً IconCircle) نمایش داده شود تا خطا ندهد.
  // این فقط یک fallback اضافی است، زیرا getIconComponent در MenuItems.ts قبلا IconPlus را به عنوان پیش‌فرض تنظیم کرده است.

  const IconComponent: React.ElementType = item.icon || IconCircle;
  if (!IconComponent) {
    console.warn(`Icon component not found for item: ${item.title}. Using default fallback.`);
    // می توانید یک آیکون fallback اینجا ایمپورت کنید و استفاده کنید
    // import { IconCircle } from '@tabler/icons-react';
    // IconComponent = IconCircle;
  }

  const theme = useTheme();

  const itemIcon =
    level && level > 1 ? <IconComponent stroke={1.5} size="1rem" /> : <IconComponent stroke={1.5} size="1.1rem" />;

  const ListItemStyled2 = styled(ListItem)(() => ({
    padding: '5px 10px',
    gap: '10px',
    borderRadius: `${customizer.borderRadius}px`,
    marginBottom: level && level > 1 ? '3px' : '0px',
    color:
      level && level > 1 && pathDirect === item.href ? `${theme.palette.primary.main}!important` : theme.palette.text.secondary,

    '&:hover': {
      backgroundColor: theme.palette.primary.light,
    },
    '&.Mui-selected': {
      color: level && level > 1 ? theme.palette.primary.main : 'white!important',
      backgroundColor: level && level > 1 ? 'transparent' : theme.palette.primary.main,
      '&:hover': {
        backgroundColor: level && level > 1 ? '' : theme.palette.primary.main,
        color: 'white',
      },
    },
  }));

  const listItemProps: {
    component: any;
    href?: string;
    target?: string; // ✅ Type changed from 'any' to 'string' for target
    to?: string; // ✅ Type changed from 'any' to 'string' for to (NavLink expects string)
  } = {
    component: item?.external ? 'a' : NavLink,
    to: item?.href || '', // ✅ Ensure 'to' is always a string for NavLink
    href: item?.external ? item?.href : '',
    target: item?.external ? '_blank' : '',
  };

  return (
    <List component="li" disablePadding key={item.id}>
      <ListItemStyled2
        {...listItemProps}
        disabled={item.disabled} // ✅ استفاده از prop disabled
        selected={pathDirect === item.href}
        onClick={onClick}
      >
        <ListItemIcon
          sx={{
            minWidth: 'auto',
            p: '3px 0',
            color: 'inherit',
          }}
        >
          {itemIcon}
        </ListItemIcon>
        <ListItemText>{item.title}</ListItemText>
      </ListItemStyled2>
    </List>
  );
};

export default NavItem;