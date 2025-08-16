// src/layouts/full/shared/sidebar/MenuItems.ts (یا مسیر مشابه)

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
  IconBoxSeam, IconBuildingWarehouse, IconReceipt, IconShoppingCart
  // IconTopologyBus,
  // IconTopologyRing
} from '@tabler/icons-react';

// مسیر صحیح به فایل JSON آدرس دهی شما
import server from '../../../../assets/address.json'; // مسیر را بر اساس مکان MenuItems.ts تنظیم کنید

export interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any; // The icon property can be a React component type
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}

// ✅ رویکرد جدید: استفاده از یک آبجکت برای مپینگ نام آیکون به کامپوننت آیکون
const IconComponents: { [key: string]: React.ElementType } = {
  IconDashboard: IconDashboard,
  IconApps: IconApps,
  IconUserCircle: IconUserCircle,
  IconCircles: IconCircles,
  IconCategory: IconCategory,
  IconBuilding: IconBuilding,
  IconPackage: IconPackage,
  IconGavel: IconGavel,
  IconChecklist: IconChecklist,
  IconRoute: IconRoute,
  IconUserCog: IconUserCog,
  IconInfoCircle: IconInfoCircle,
  IconClipboardList: IconClipboardList,
  IconProgressCheck: IconProgressCheck,
  IconPlus: IconPlus,
  IconGlobe: IconGlobe,
  IconMap: IconMap,
  IconBoxSeam: IconBoxSeam,
  IconBuildingWarehouse: IconBuildingWarehouse,
  IconShoppingCart: IconShoppingCart,
  IconReceipt: IconReceipt
  // IconTopologyBus: IconTopologyBus,
  // IconTopologyRing: IconTopologyRing
};

const getIconComponent = (iconName: string): React.ElementType => {
  const cleanedIconName = iconName.trim();
  return IconComponents[cleanedIconName] || IconPlus;
};

const mapApiDataToMenuItems = (apiData: any[]): MenuitemsType[] => {
  if (!apiData || apiData.length === 0) {
    return [];
  }

  return apiData
    .filter((item) => item.recordStatus === 0)
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const menuItem: MenuitemsType = {
        id: item.id || uniqueId(),
        title: item.name,
        href: item.url === '#' ? undefined : item.url,
        icon: getIconComponent(item.icon || item.name),
        chipColor: 'secondary',
      };

      if (item.menus && item.menus.length > 0) {
        menuItem.children = mapApiDataToMenuItems(item.menus);
        menuItem.href = undefined;
      }
      return menuItem;
    });
};

export const getDynamicMenuItems = async (): Promise<MenuitemsType[]> => {
  console.log('getDynamicMenuItems is being called.');

  const authToken = localStorage.getItem('authToken');

  if (!authToken) {
    console.warn("No auth token found for menu items, returning empty array.");
    return [];
  }

  try {
    const fullUrl = server.baseurl + server.baseinfo + 'get-menus';
    console.log('Attempting to fetch from URL:', fullUrl);

    const response = await axios.get(fullUrl, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    });
    console.log('API Response received for menus:', response.data);

    if (response.data.success && response.data.data) {
      const mappedMenuItems = mapApiDataToMenuItems(response.data.data);

      const finalMenuItems: MenuitemsType[] = [];

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

      console.log('Final mapped menu items for sidebar:', finalMenuItems);
      return finalMenuItems;
    }
    console.log('API response success was false or data was empty for menus.');
    return [];
  } catch (error) {
    console.error('Error fetching dynamic menu items in getDynamicMenuItems:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details for menus:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
      }
    }
    return [];
  }
};
const Menuitems: MenuitemsType[] = [];
export default Menuitems;