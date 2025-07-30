// src/layouts/full/shared/sidebar/NavCollapse/NavCollapse.tsx

import React from 'react'; // ✅ Import useRef
import { useTheme } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';

// mui imports
import { ListItemIcon, styled, ListItemText, ListItemButton, Collapse, List } from '@mui/material';
import { useSelector } from 'src/store/Store';

// custom imports
import NavItem from '../NavItem/NavItem';

// plugins
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

  // ✅ NEW: useRef to reference the menu element for click outside detection
  const menuRef = React.useRef<HTMLLIElement>(null); // ✅ Type it correctly

  // ✅ NEW: handleClickOutside function
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  // ✅ NEW: useEffect for adding/removing click event listener
  React.useEffect(() => {
    // Add event listener when menu is open
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      // Clean up event listener when menu is closed or unmounted
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup function: this runs when the component unmounts or when 'open' changes to false
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]); // Re-run effect when 'open' state changes

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

  // const listItemProps: {
  //   component: string;
  //   onClick?: React.MouseEventHandler<HTMLElement>;
  // } = {
  //   component: 'li',
  // };

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
          onClick={onClick} // This onClick could be used to close the whole sidebar (e.g., on mobile)
        />
      );
    }
  });

  return (
    <React.Fragment key={menu.id}>
      {/* ✅ NEW: Attach menuRef to the main container element for this menu item */}
      {/* We are attaching it to the List component that wraps ListItemStyled to capture clicks within the whole menu item */}
      <List component="li" disablePadding key={menu.id} ref={menuRef}> {/* ✅ menuRef attached here */}
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
            {/* The List inside Collapse doesn't need a separate ref, as its parent 'List' has the ref */}
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