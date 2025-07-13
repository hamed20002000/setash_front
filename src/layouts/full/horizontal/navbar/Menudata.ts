import {
  IconDashboard,
  IconApps,
  IconUserCircle,
  IconCircles,
  IconCategory,
  IconBuilding, 
  IconPackage,  
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';

const Menuitems = [
  {
    id: uniqueId(),
    title: 'Gösterge Paneli',
    icon: IconDashboard,
    href: '/dashboards/',
    children: [
      {
        id: uniqueId(),
        title: 'Gösterge Paneli',
        icon: IconDashboard,
        href: '/dashboards/dashboard',
        chipColor: 'secondary',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Kullanıcı Yönetimi',
    icon: IconApps,
    href: '/managmentusers/',
    children: [
      {
        id: uniqueId(),
        title: 'Sistemin Çalışması',
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
    ],
  },
  {
    id: uniqueId(),
    title: 'temel bilgi',
    icon: IconApps,
    href: '/baseinfo/',
    children: [
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
    ],
  },
  {
    id: uniqueId(),
    title: 'İhale',
    icon: IconApps,
    href: '/tender/',
    children: [
      {
        id: uniqueId(),
        title: 'İhale Listele',
        icon: IconCategory,
        chipColor: 'secondary',
        href: '/tender/list-tender',
      }
    ],
  },

];
export default Menuitems;
