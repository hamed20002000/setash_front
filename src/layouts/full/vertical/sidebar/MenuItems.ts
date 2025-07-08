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
  IconCircles
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
    // chip: '2',
    chipColor: 'secondary',
    href: '/managmentusers/list-roles',
  },
  {
    id: uniqueId(),
    title: 'Kullanıcıları Listele',
    icon: IconUserCircle,
    // chip: '2',
    chipColor: 'secondary',
    href: '/managmentusers/list-users',
  },

];

export default Menuitems;
