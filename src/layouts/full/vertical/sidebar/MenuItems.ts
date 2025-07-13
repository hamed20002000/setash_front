import { uniqueId } from 'lodash';

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean; // This can now largely be replaced by the structure, but keep for type safety
  subheader?: string; // This property will be used differently, or effectively replaced
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}

import {
  IconDashboard,
  IconApps,
  IconUserCircle,
  IconCircles,
  IconCategory,
  IconBuilding,
  IconPackage,
  IconGavel, // Added for 'İhale' section
} from '@tabler/icons-react';

const Menuitems: MenuitemsType[] = [
  // Dashboard Section - Remains a direct item or can be a collapsible if it had children
  {
    navlabel: true, // Keeping navlabel for visual grouping, but not for collapse logic
    subheader: 'Gösterge Paneli',
  },
  {
    id: uniqueId(),
    title: 'Gösterge Paneli',
    icon: IconDashboard,
    href: '/dashboards/dashboard',
    chipColor: 'secondary',
  },

  // Kullanıcı Yönetimi - Now a Collapsible Parent Menu
  {
    id: uniqueId(), // Unique ID for the parent menu
    title: 'Kullanıcı Yönetimi', // This will be the clickable parent
    icon: IconUserCircle, // An icon for the parent menu (optional)
    children: [
      {
        id: uniqueId(),
        title: 'Operasyonlar',
        icon: IconApps, // Keep icons for children too
        chipColor: 'secondary',
        href: '/managmentusers/system-operation',
      },
      {
        id: uniqueId(),
        title: 'Roller',
        icon: IconCircles,
        chipColor: 'secondary',
        href: '/managmentusers/list-roles',
      },
      {
        id: uniqueId(),
        title: 'Kullanıcılar',
        icon: IconUserCircle,
        chipColor: 'secondary',
        href: '/managmentusers/list-users',
      },
    ],
  },

  // Temel Bilgi - Now a Collapsible Parent Menu
  {
    id: uniqueId(), // Unique ID for the parent menu
    title: 'Temel Bilgiler', // This will be the clickable parent
    icon: IconCategory, // An icon for the parent menu (optional)
    children: [
      {
        id: uniqueId(),
        title: 'Kategoriler',
        icon: IconCategory,
        chipColor: 'secondary',
        href: '/baseinfo/list-categories',
      },
      {
        id: uniqueId(),
        title: 'Ölçüler',
        icon: IconBuilding,
        chipColor: 'secondary',
        href: '/baseinfo/list-units',
      },
      {
        id: uniqueId(),
        title: 'Ürünler',
        icon: IconPackage,
        chipColor: 'secondary',
        href: '/baseinfo/list-items',
      },
    ],
  },

  // İhale - Now a Collapsible Parent Menu
  {
    id: uniqueId(), // Unique ID for the parent menu
    title: 'İhale', // This will be the clickable parent
    icon: IconGavel, // An icon for the parent menu (optional)
    children: [
      {
        id: uniqueId(),
        title: 'İhaleler',
        icon: IconCategory, // Using IconCategory as an example, you might want a more specific one
        chipColor: 'secondary',
        href: '/tender/list-tender',
      },
      // Add more 'İhale' sub-items here if needed
    ],
  },
];

export default Menuitems;