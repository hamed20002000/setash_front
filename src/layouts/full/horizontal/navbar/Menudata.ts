

import { uniqueId } from 'lodash';
import axios from 'axios';
import {
  IconDashboard, IconApps, IconUserCircle, IconCircles,
  IconCategory, IconBuilding, IconPackage,
  IconUsers,
  IconInfoCircle,
  IconGavel,
  IconBriefcase,
  IconClipboardText,
  IconChecklist, IconRoute, IconUserCog, IconClipboardList, IconProgressCheck,
  IconPlus,
  IconGlobe,
  IconMap, IconBoxSeam, IconBuildingWarehouse, IconReceipt, IconShoppingCart, IconCar,
  IconBuildingFactory, IconFileInvoice, IconNetwork, IconHelmet, IconBuildingStore,
  IconArrowsExchange, IconFolders, IconBulb, IconTornado, IconListCheck, IconCalendar,
  IconFileDollar, IconTimeline, IconHierarchy, IconFileExport, IconFileOff, IconReportAnalytics,
  IconUsersGroup, IconCalendarTime, IconQuestionMark, IconInbox
} from '@tabler/icons-react';

import server from '../../../../assets/address.json';

export interface MenuitemsType {
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

interface ApiMenuItem {
  id: string;
  name: string;
  url: string;
  icon: string;
  order: number;
  recordStatus: number;
  menus?: ApiMenuItem[];
  menuOperations: Array<{
    id: string;
    recordStatus: number;
    systemOperation: {
      id: string;
      name: string;
      recordStatus: number;
    };
  }>;
}

const IconComponents: { [key: string]: React.ElementType } = {
  'IconDashboard': IconDashboard, 'IconApps': IconApps,
  'IconUserCircle': IconUserCircle, 'IconCircles': IconCircles,
  'IconCategory': IconCategory, 'IconBuilding': IconBuilding,
  'IconPackage': IconPackage, 'IconUsers': IconUsers,
  'IconInfoCircle': IconInfoCircle, 'IconGavel': IconGavel,
  'IconBriefcase': IconBriefcase, 'IconClipboardText': IconClipboardText,
  'IconChecklist': IconChecklist, 'IconRoute': IconRoute,
  'IconUserCog': IconUserCog, 'IconClipboardList': IconClipboardList,
  'IconProgressCheck': IconProgressCheck, 'IconPlus': IconPlus,
  'IconGlobe': IconGlobe, 'IconMap': IconMap,
  'IconBoxSeam': IconBoxSeam, 'IconBuildingWarehouse': IconBuildingWarehouse,
  'IconShoppingCart': IconShoppingCart, 'IconReceipt': IconReceipt,
  'IconCar': IconCar, 'IconBuildingFactory': IconBuildingFactory,
  'IconFileInvoice': IconFileInvoice, 'IconNetwork': IconNetwork,
  'IconHelmet': IconHelmet, 'IconBuildingStore': IconBuildingStore,
  'IconArrowsExchange': IconArrowsExchange, 'IconFolders': IconFolders,
  'IconBulb': IconBulb, 'IconTornado': IconTornado,
  'IconListCheck0': IconListCheck, 'IconCalendar': IconCalendar,
  'IconFileDollar': IconFileDollar, 'IconTimeline': IconTimeline,
  'IconHierarchy': IconHierarchy, 'IconFileExport': IconFileExport,
  'IconFileOff': IconFileOff, 'IconReportAnalytics': IconReportAnalytics,
  'IconUsersGroup': IconUsersGroup, 'IconCalendarTime': IconCalendarTime,
  'IconQuestionMark': IconQuestionMark, 'IconInbox': IconInbox
};

const getIconComponent = (iconIdentifier: string | undefined): React.ElementType => {
  if (!iconIdentifier) {
    return IconPlus;
  }
  const cleanedIdentifier = iconIdentifier.trim();
  return IconComponents[cleanedIdentifier] || IconPlus;
};

// ✅ تابع اصلی فیلتر کردن منوها بر اساس عملیات مجاز
export const mapApiDataToMenuItems = (apiData: ApiMenuItem[], allowedOperations: string[]): MenuitemsType[] => {
  if (!apiData || apiData.length === 0) return [];

  const filteredAndMappedMenus: MenuitemsType[] = [];

  apiData
    .filter(item => item.recordStatus === 0)
    .sort((a, b) => a.order - b.order)
    .forEach(item => {
      // ابتدا فرزندان منو را به صورت بازگشتی فیلتر می‌کنیم
      let children: MenuitemsType[] | undefined;
      if (item.menus && item.menus.length > 0) {
        children = mapApiDataToMenuItems(item.menus, allowedOperations);
      }

      // بررسی دسترسی مشاهده برای منوی فعلی
      const hasViewPermission = item.menuOperations
        .filter(op => op.recordStatus === 0)
        .some(op => op.systemOperation.name === 'Görüntülemek' && allowedOperations.includes(op.id));
      // اگر منو دسترسی مشاهده دارد یا فرزندان مجاز دارد، آن را در لیست نهایی قرار می‌دهیم
      if (hasViewPermission || (children && children.length > 0)) {
        const menuItem: MenuitemsType = {
          id: item.id || uniqueId(),
          title: item.name,
          href: item.url === '#' ? undefined : item.url,
          icon: getIconComponent(item.icon),
          chipColor: 'secondary',
          children: children,
        };
        filteredAndMappedMenus.push(menuItem);
      }
    });

  return filteredAndMappedMenus;
};

// ✅ تابع دریافت منوهای خام از سرور (بدون تغییر)
const getRawMenusFromApi = async (): Promise<any[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    return [];
  }
  try {
    const fullUrl = server.baseurl + server.baseinfo + 'get-menus';
    const response = await axios.get(fullUrl, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    });
    return response.data.success && response.data.data ? response.data.data : [];
  } catch (error) {
    console.error('Error fetching dynamic menu items in getRawMenusFromApi:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('authToken');
    }
    return [];
  }
};

// ✅ تابع اصلی که از AuthProvider فراخوانی می‌شود
export const getDynamicMenuItems = async (allowedOperations: string[]): Promise<MenuitemsType[]> => {
  const rawMenus = await getRawMenusFromApi();
  const mappedMenuItems = mapApiDataToMenuItems(rawMenus, allowedOperations);

  const finalMenuItems: MenuitemsType[] = [];
  const dashboardItem = mappedMenuItems.find(item => item.title === 'Gösterge Paneli');
  if (dashboardItem) {
    finalMenuItems.push({ navlabel: true, subheader: 'Ana Sayfa', id: uniqueId() });
    finalMenuItems.push(dashboardItem);
  }
  mappedMenuItems.forEach(item => {
    if (item.title !== 'Gösterge Paneli') {
      finalMenuItems.push(item);
    }
  });

  return finalMenuItems;
};

const Menuitems: MenuitemsType[] = [];
export default Menuitems;