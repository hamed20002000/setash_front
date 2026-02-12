// src/layouts/full/shared/sidebar/NavCollapse/NavCollapse.tsx

import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';

import { ListItemIcon, styled, ListItemText, ListItemButton, Collapse, List } from '@mui/material';
import { useSelector } from 'src/store/Store';

import NavItem from '../NavItem/NavItem';

import { IconChevronDown } from '@tabler/icons-react';
import { AppState } from 'src/store/Store';

import { MenuitemsType } from '../Menudata';

type NavGroupProps = MenuitemsType;

interface NavCollapseProps {
  menu: NavGroupProps;
  level: number;
  pathWithoutLastPart: string;
  pathDirect: string;
  hideMenu: boolean | "" | undefined;
  onClick: React.MouseEventHandler<HTMLElement> | undefined;
}

const NavCollapse = ({ menu, level, pathWithoutLastPart, pathDirect, hideMenu, onClick }: NavCollapseProps) => {
  const IconComponent = menu.icon;
  if (!IconComponent) {
    console.warn(`Icon component not found for menu: ${menu.title}. Using default fallback.`);
  }

  const theme = useTheme();
  const { pathname } = useLocation();

  const [open, setOpen] = React.useState<boolean>(() => {
    if (menu.children) {
      return menu.children.some((item: MenuitemsType) =>
        item.href && (item.href === pathname || pathname.includes(item.href))
      );
    }
    return false;
  });

  const customizer = useSelector((state: AppState) => state.customizer);

  const menuIcon =
    level > 1 ? <IconComponent stroke={1.5} size="1rem" /> : <IconComponent stroke={1.5} size="1.1rem" />;

  const menuRef = React.useRef<HTMLLIElement>(null);
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const ListItemStyled = styled(ListItemButton)(() => ({
    width: 'auto',
    padding: '5px 10px',
    position: 'relative',
    flexGrow: 'unset',
    gap: '10px',
    borderRadius: `${customizer.borderRadius}px`,
    whiteSpace: 'nowrap',

    color: (open || pathWithoutLastPart === String(menu.href) || pathDirect === String(menu.href))
      ? theme.palette.primary.main
      : theme.palette.text.secondary,

    backgroundColor: (open || pathWithoutLastPart === String(menu.href) || pathDirect === String(menu.href))
      ? theme.palette.primary.light
      : 'transparent',

    '&:hover': {
      backgroundColor: theme.palette.primary.light,
    },

    '&.Mui-selected': {
      color: 'white!important',
      backgroundColor: theme.palette.primary.main,
      '&:hover': {
        backgroundColor: theme.palette.primary.main,
        color: 'white',
      },
    },
    [`&.Mui-selected[data-level="1"]`]: {
      color: 'white!important',
      backgroundColor: theme.palette.primary.main,
    },
    [`&.Mui-selected[data-level="2"]`]: {
      color: `${theme.palette.primary.main}!important`,
      backgroundColor: 'transparent',
    },
  }));

  const subMenuContainerStyle = {
    position: 'absolute',
    top: level > 1 ? `0px` : '35px',
    left: level > 1 ? `${level * 220 + 20}px` : '0px',
    padding: '10px',
    width: '250px',
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[8],
    backgroundColor: theme.palette.background.paper,
    zIndex: theme.zIndex.appBar + 1,
  };

  const submenus = menu.children?.map((item: NavGroupProps) => {
    if (item.children && item.children.length > 0) {
      return (
        <NavCollapse
          key={item.id}
          menu={item}
          level={level + 1}
          pathWithoutLastPart={pathWithoutLastPart}
          pathDirect={pathDirect}
          hideMenu={hideMenu}
          onClick={onClick}
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
          onClick={onClick}
        />
      );
    }
  });

  return (
    <React.Fragment key={menu.id}>
      <List component="li" disablePadding key={menu.id} ref={menuRef}>
        <ListItemStyled
          onClick={() => setOpen(!open)}
          selected={pathWithoutLastPart === String(menu.href) || pathDirect === String(menu.href)}
          className={open ? 'selected' : ''}
          data-level={level}
        >
          <ListItemIcon
            sx={{
              minWidth: 'auto',
              p: '3px 0',
              color: 'inherit',
            }}
          >
            {menuIcon}
          </ListItemIcon>
          <ListItemText color="inherit" sx={{ mr: 'auto' }}>
            {menu.title}
          </ListItemText>
          <IconChevronDown
            size="1rem"
            style={{ transform: open ? 'rotate(-180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />

          <Collapse in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={subMenuContainerStyle}>
              {submenus}
            </List>
          </Collapse>
        </ListItemStyled>
      </List>
    </React.Fragment>
  );
};

export default NavCollapse;