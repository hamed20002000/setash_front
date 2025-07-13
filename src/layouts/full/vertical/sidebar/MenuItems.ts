import { uniqueId } from 'lodash';

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
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
} from '@tabler/icons-react';

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: 'Gösterge Paneli',
  },

  {
    id: uniqueId(),
    title: 'Gösterge Paneli',
    icon: IconDashboard,
    href: '/dashboards/dashboard',
    chipColor: 'secondary',
  },
  {
    navlabel: true,
    subheader: 'Kullanıcı Yönetimi',
  },
  {
    id: uniqueId(),
    title: 'Operasyonları Listele',
    icon: IconApps,
    chipColor: 'secondary',
    href: '/managmentusers/system-operation',
  },
  {
    id: uniqueId(),
    title: 'Rolleri Listele',
    icon: IconCircles,
    chipColor: 'secondary',
    href: '/managmentusers/list-roles',
  },
  {
    id: uniqueId(),
    title: 'Kullanıcıları Listele',
    icon: IconUserCircle,
    chipColor: 'secondary',
    href: '/managmentusers/list-users',
  },
  {
    navlabel: true,
    subheader: 'temel bilgi',
  },
  {
    id: uniqueId(),
    title: 'Kategori Listele',
    icon: IconCategory,
    chipColor: 'secondary',
    href: '/baseinfo/list-categories',
  },
  {
    id: uniqueId(),
    title: 'Birim Listele',
    icon: IconBuilding,
    chipColor: 'secondary',
    href: '/baseinfo/list-units',
  },
  {
    id: uniqueId(),
    title: 'Ürün Listele',
    icon: IconPackage,
    chipColor: 'secondary',
    href: '/baseinfo/list-items',    
  },
  {
    navlabel: true,
    subheader: 'İhale',
  },
  {
    id: uniqueId(),
    title: 'İhale Listele',
    icon: IconCategory,
    chipColor: 'secondary',
    href: '/tender/list-tender',
  },

];

export default Menuitems;