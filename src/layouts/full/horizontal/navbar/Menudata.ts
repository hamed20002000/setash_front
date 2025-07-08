import {
  IconHome,
  IconPoint,
  IconApps,
  IconClipboard,
  IconFileDescription,
  IconBorderAll,
  IconZoomCode,
  IconRotate,
  IconUserPlus,
  IconLogin,
  IconAlertCircle,
  IconSettings,
  IconDashboard,
    IconUserCircle,
    IconCircles
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';

const Menuitems = [
  {
    id: uniqueId(),
    title: 'Gösterge Paneli',
    icon: IconHome,
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

];
export default Menuitems;
