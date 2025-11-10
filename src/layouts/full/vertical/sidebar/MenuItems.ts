

import { uniqueId } from 'lodash';
import axios from 'axios';
import {
  IconDashboard,
  IconApps,
  IconUserCircle,
  IconCircles,
  IconCategory,
  IconBuilding,
  IconPackage,
  IconGavel,
  IconPlus,
  IconChecklist,
  IconRoute,
  IconUserCog,
  IconInfoCircle,
  IconClipboardList,
  IconProgressCheck,
  IconGlobe,
  IconMap,
  IconBoxSeam, IconBuildingWarehouse, IconReceipt, IconShoppingCart, IconCar,
  IconBuildingFactory, IconFileInvoice, IconSitemap, IconHelmet, IconBuildingStore,
  IconArrowsExchange, IconFolders, IconBulb, IconTornado, IconListCheck, IconCalendar,
  IconFileDollar, IconTimeline, IconBriefcase, IconHierarchy, IconFileExport, IconFileOff,
  IconReportAnalytics, IconUsersGroup, IconCalendarTime, IconQuestionMark, IconInbox,
  IconClockHour3, IconTag, IconUserX
} from '@tabler/icons-react';
import server from '../../../../assets/address.json';

// Type Definitions
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
  IconDashboard: IconDashboard,
  IconApps: IconApps, IconUserCircle: IconUserCircle,
  IconCircles: IconCircles, IconCategory: IconCategory,
  IconBuilding: IconBuilding, IconPackage: IconPackage,
  IconGavel: IconGavel, IconChecklist: IconChecklist,
  IconRoute: IconRoute, IconUserCog: IconUserCog,
  IconInfoCircle: IconInfoCircle, IconClipboardList: IconClipboardList,
  IconProgressCheck: IconProgressCheck, IconPlus: IconPlus,
  IconGlobe: IconGlobe, IconMap: IconMap,
  IconBoxSeam: IconBoxSeam, IconBuildingWarehouse: IconBuildingWarehouse,
  IconShoppingCart: IconShoppingCart, IconReceipt: IconReceipt,
  IconCar: IconCar, IconBuildingFactory: IconBuildingFactory,
  IconFileInvoice: IconFileInvoice, IconSitemap: IconSitemap,
  IconHelmet: IconHelmet, IconBuildingStore: IconBuildingStore,
  IconArrowsExchange: IconArrowsExchange, IconFolders: IconFolders,
  IconBulb: IconBulb, IconTornado: IconTornado,
  IconListCheck: IconListCheck, IconCalendar: IconCalendar,
  IconFileDollar: IconFileDollar, IconTimeline: IconTimeline,
  IconBriefcase: IconBriefcase, IconHierarchy: IconHierarchy,
  IconFileExport: IconFileExport, IconFileOff: IconFileOff,
  IconReportAnalytics: IconReportAnalytics, IconUsersGroup: IconUsersGroup,
  IconCalendarTime: IconCalendarTime, IconQuestionMark: IconQuestionMark, IconInbox: IconInbox,
  IconClockHour3: IconClockHour3, IconTag: IconTag, IconUserX: IconUserX
};

const getIconComponent = (iconName: string): React.ElementType => {
  const cleanedIconName = iconName.trim();
  return IconComponents[cleanedIconName] || IconPlus;
};

const getRawMenusFromApi = async (): Promise<ApiMenuItem[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    console.warn("No auth token found for menu items.");
    return [];
  }
  try {
    const fullUrl = server.baseurl + server.baseinfo + 'get-menus';
    const response = await axios.get<{ success: boolean; data: ApiMenuItem[] }>(fullUrl, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching dynamic menu items:', error);
    return [];
  }
};

const mapApiDataToMenuItems = (apiData: ApiMenuItem[], allowedOperations: string[]): MenuitemsType[] => {
  if (!apiData || apiData.length === 0) {
    return [];
  }

  const filteredAndMappedMenus = apiData
    .filter(item => {
      const hasViewPermission = item.menuOperations
        .filter(op => op.recordStatus === 0)
        .some(op => op.systemOperation.name === 'Görüntülemek' && allowedOperations.includes(op.systemOperation.name));

      const hasActiveChildren = item.menus && item.menus.length > 0
        ? mapApiDataToMenuItems(item.menus, allowedOperations).length > 0
        : false;

      return item.recordStatus === 0 && (hasViewPermission || hasActiveChildren);
    })
    .sort((a, b) => a.order - b.order)
    .map(item => {
      const menuItem: MenuitemsType = {
        id: item.id || uniqueId(),
        title: item.name,
        href: item.url === '#' ? undefined : item.url,
        icon: getIconComponent(item.icon),
        chipColor: 'secondary',
      };

      if (item.menus && item.menus.length > 0) {
        const childItems = mapApiDataToMenuItems(item.menus, allowedOperations);
        if (childItems.length > 0) {
          menuItem.children = childItems;
          menuItem.href = undefined;
        }
      }
      return menuItem;
    });

  return filteredAndMappedMenus.filter(item => item.children || item.href);
};

export const getDynamicMenuItems = async (allowedOperations: string[]): Promise<MenuitemsType[]> => {
  const rawMenus = await getRawMenusFromApi();
  const mappedMenuItems = mapApiDataToMenuItems(rawMenus, allowedOperations);

  const finalMenuItems: MenuitemsType[] = [];

  // فقط در صورتی که داشبورد در بین منوهای فیلتر شده وجود داشته باشد، آن را اضافه کنید
  const dashboardItem = mappedMenuItems.find(item => item.title === 'Gösterge Paneli');
  if (dashboardItem) {
    finalMenuItems.push({
      navlabel: true,
      subheader: 'Ana Sayfa',
      id: uniqueId(),
    });
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