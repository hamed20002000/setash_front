// src/layouts/full/shared/sidebar/MenuItems.ts (یا مسیر مشابه)
// این فایل حاوی منطق دریافت و تبدیل منوهاست

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
  IconRoute
} from '@tabler/icons-react';

// مسیر صحیح به فایل JSON آدرس دهی شما
import server from '../../../../assets/address.json'; // مسیر را بر اساس مکان MenuItems.ts تنظیم کنید

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

const getIconComponent = (iconName: string): any => {
  switch (iconName) {
    case 'IconDashboard': return IconDashboard;
    case 'IconApps': return IconApps;
    case 'IconUserCircle': return IconUserCircle;
    case 'IconCircles': return IconCircles;
    case 'IconCategory': return IconCategory;
    case 'IconBuilding': return IconBuilding;
    case 'IconPackage': return IconPackage;
    case 'IconGavel': return IconGavel;
    case 'IconChecklist': return IconChecklist;
    case 'IconRoute ': return IconRoute;
    case 'IconPlus': return IconPlus;
    default: return IconPlus; // آیکون پیش‌فرض
  }
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
        icon: getIconComponent(item.icon || item.name), // فرض بر این است که API فیلد iconName را دارد
        chipColor: 'secondary',
      };

      if (item.menus && item.menus.length > 0) {
        menuItem.children = mapApiDataToMenuItems(item.menus);
        menuItem.href = undefined; // اگر آیتم والد است، href را حذف کنید
      }
      return menuItem;
    });
};


export const getDynamicMenuItems = async (): Promise<MenuitemsType[]> => {
  console.log('getDynamicMenuItems is being called.');

  // ** START: اضافه کردن منطق توکن **
  const authToken = localStorage.getItem('authToken');

  if (!authToken) {
    console.warn("No auth token found for menu items, returning empty array.");
    // در اینجا، به جای ریدایرکت، فقط یک آرایه خالی برمی‌گردانیم
    // چون منوها باید بدون انتظار برای لاگین نمایش داده شوند (مثلاً در صفحه لاگین نباشیم)
    // اما اگر منوها فقط بعد از لاگین قابل مشاهده هستند، می‌توانید یک ریدایرکت به صفحه لاگین اضافه کنید.
    // اما معمولاً منطق ریدایرکت در کامپوننت‌های سطح بالاتر (مثل روت‌ها) مدیریت می‌شود.
    return [];
  }
  // ** END: اضافه کردن منطق توکن **

  try {
    const fullUrl = server.baseurl + server.baseinfo + 'get-menus';
    console.log('Attempting to fetch from URL:', fullUrl);

    const response = await axios.get(fullUrl, { // توکن را در اینجا اضافه کنید
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    });
    console.log('API Response received:', response.data);

    if (response.data.success && response.data.data) {
      const mappedMenuItems = mapApiDataToMenuItems(response.data.data);

      const finalMenuItems: MenuitemsType[] = [];

      const dashboardItem = mappedMenuItems.find(item => item.title === 'Gösterge Paneli');
      if (dashboardItem) {
        finalMenuItems.push({
          navlabel: true,
          subheader: 'Gösterge Paneli',
          id: uniqueId(),
        });
        finalMenuItems.push(dashboardItem);
      }

      mappedMenuItems.forEach(item => {
        if (item.title !== 'Gösterge Paneli') {
          finalMenuItems.push(item);
        }
      });
      console.log('Final mapped menu items:', finalMenuItems);
      return finalMenuItems;
    }
    console.log('API response success was false or data was empty.');
    return [];
  } catch (error) {
    console.error('Error fetching dynamic menu items in getDynamicMenuItems:', error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.status, error.response?.data);
      // اگر خطای 401 Unauthorized بود، می‌توانید کاربر را به صفحه لاگین هدایت کنید.
      // اما بهتر است این منطق در یک اینترسپتور Axios یا در کامپوننت والد مدیریت شود.
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        // اگر navigate در این فایل در دسترس نیست، می‌توانید یک رویداد کاستوم صادر کنید
        // یا این مدیریت را به کامپوننت SidebarItems بسپارید.
        // window.location.href = '/'; // این یک راه سریع برای ریدایرکت است، اما React Router بهتر است.
      }
    }
    return [];
  }
};

// Menuitems دیگر به صورت پیش‌فرض export نمی‌شود
// اما برای حفظ نوع (type safety) می‌توانید آن را نگه دارید، فقط محتوایش در اینجا خالی است.
const Menuitems: MenuitemsType[] = [];
export default Menuitems; // می‌توانید این خط را حذف کنید اگر دیگر به آن نیازی ندارید.