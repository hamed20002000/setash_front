// src/layouts/full/shared/sidebar/NavCollapse.tsx (مسیر فایل شما)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useSelector } from 'src/store/Store';
import { useLocation } from 'react-router-dom';

import {
  ListItemIcon,
  ListItemButton,
  Collapse,
  styled,
  ListItemText,
  useTheme,
} from '@mui/material';

import NavItem from '../NavItem';

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
  children?: NavGroupProps[];
};

interface NavCollapseProps {
  menu: NavGroupProps;
  level: number;
  pathWithoutLastPart: any;
  pathDirect: any;
  hideMenu: any;
  isOpen: boolean;
  onToggle: (id: string) => void;
}

const NavCollapse = ({
  menu,
  level,
  pathWithoutLastPart,
  pathDirect,
  hideMenu,
  isOpen,
  onToggle,
}: NavCollapseProps) => {
  const customizer = useSelector((state: AppState) => state.customizer);
  const Icon = menu?.icon;
  const theme = useTheme();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const handleClick = () => {
    onToggle(menu.id);
  };
  const menuIcon =
    level > 1 ? <Icon stroke={1.5} size="1rem" /> : <Icon stroke={1.5} size="1.3rem" />;

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
          isOpen={false}
          onToggle={onToggle}
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
        onClick={handleClick}
        selected={isAnyChildActive}
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
        {!isOpen ? <IconChevronDown size="1rem" /> : <IconChevronUp size="1rem" />}
      </ListItemStyled>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <div style={{ marginLeft: "10px", background: "rgb(93 135 255 / 19%)" }}>
          {submenus}
        </div>
      </Collapse>
    </>
  );
};

export default NavCollapse;