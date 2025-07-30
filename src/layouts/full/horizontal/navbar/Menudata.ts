// src/layouts/full/shared/sidebar/MenuItems.ts

import { uniqueId } from 'lodash';
import axios from 'axios';
import {
  // 1. آیکون‌های پایه که همیشه استفاده می‌شوند
  IconDashboard, IconApps, IconUserCircle, IconCircles,
  IconCategory, IconBuilding, IconPackage,
  // 2. آیکون‌های جدیدی که برای منوهای والد پیشنهاد دادیم و ممکن است از API بیایند
  IconUsers, // برای Kullanıcı Yönetimi
  IconInfoCircle, // برای Temel Bilgiler
  IconGavel, // برای İhale
  IconBriefcase, // برای İşler
  IconClipboardText, // گزینه دوم برای İşler
  // 3. هر آیکون دیگری که ممکن است از API با نام خاصی برگردد
  IconChecklist, IconRoute, IconUserCog, IconClipboardList, IconProgressCheck,
  IconPlus // آیکون پیش‌فرض / fallback
} from '@tabler/icons-react';

// مسیر صحیح به فایل JSON آدرس دهی شما
import server from '../../../../assets/address.json';

// تعریف اینترفیس برای ساختار منو (تغییری نکرده است)
export interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any; // Component type for the icon
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}

// ✅ مپینگ آیکون‌ها: هم بر اساس نام دقیق کامپوننت Tabler و هم بر اساس نام منو (اگر API فقط نام منو را برگرداند)
const IconComponents: { [key: string]: React.ElementType } = {
  // مپینگ مستقیم نام کامپوننت Tabler
  'IconDashboard': IconDashboard,
  'IconApps': IconApps,
  'IconUserCircle': IconUserCircle,
  'IconCircles': IconCircles,
  'IconCategory': IconCategory,
  'IconBuilding': IconBuilding,
  'IconPackage': IconPackage,
  'IconUsers': IconUsers,
  'IconInfoCircle': IconInfoCircle,
  'IconGavel': IconGavel,
  'IconBriefcase': IconBriefcase,
  'IconClipboardText': IconClipboardText,
  'IconChecklist': IconChecklist,
  'IconRoute': IconRoute,
  'IconUserCog': IconUserCog,
  'IconClipboardList': IconClipboardList,
  'IconProgressCheck': IconProgressCheck,
  'IconPlus': IconPlus, // آیکون پیش‌فرض در صورت نیاز

  // ✅ مپینگ نام منو به آیکون (اگر API نام آیکون را ندهد و فقط نام منو را بدهد)
  // این بخش را بر اساس نام‌های دقیق منوهایی که از API دریافت می‌کنید، تنظیم کنید.
  'Gösterge Paneli': IconDashboard,
  'Kullanıcı Yönetimi': IconUsers,
  'temel bilgi': IconInfoCircle, // با توجه به کد ثابت شما "temel bilgi" بود
  'İhale': IconGavel,
  'İşler': IconBriefcase, // یا می توانید IconClipboardText را انتخاب کنید
  'Sistemin Çalışması': IconApps, // مثال برای زیر منو
  'Rolleri Listele': IconCircles, // مثال برای زیر منو
  'Kullanıcıları Listele': IconUserCircle, // مثال برای زیر منو
  'Kategori Listele': IconCategory, // مثال برای زیر منو
  'Birim Listele': IconBuilding, // مثال برای زیر منو
  'Ürün Listele': IconPackage, // مثال برای زیر منو
  'İhale Listele': IconGavel, // مثال برای زیر منو

  // اضافه کردن سایر مپینگ‌ها برای زیرمنوهای شما
  // "Direkler": IconCategory, // اگر دارید
  // "Şebekeler": IconRoute, // اگر دارید
};


const getIconComponent = (iconIdentifier: string | undefined): React.ElementType => {
  if (!iconIdentifier) {
    return IconPlus; // Default icon if identifier is null or undefined
  }
  const cleanedIdentifier = iconIdentifier.trim();
  // Try to find by direct component name (e.g., "IconUsers")
  if (IconComponents[cleanedIdentifier]) {
    return IconComponents[cleanedIdentifier];
  }
  // If not found, try to find by menu title name (e.g., "Kullanıcı Yönetimi")
  // This assumes your API might send the menu title as the icon identifier sometimes.
  const mappedByTitle = IconComponents[cleanedIdentifier];
  if (mappedByTitle) {
    return mappedByTitle;
  }

  console.warn(`Icon for identifier "${cleanedIdentifier}" not found. Using default IconPlus.`);
  return IconPlus; // Fallback to a default icon
};


// تابع mapApiDataToMenuItems برای تبدیل پاسخ API به ساختار MenuitemsType
const mapApiDataToMenuItems = (apiData: any[]): MenuitemsType[] => {
  if (!apiData || apiData.length === 0) {
    return [];
  }

  return apiData
    .filter((item) => item.recordStatus === 0) // فقط آیتم های فعال را فیلتر کنید
    .sort((a, b) => a.order - b.order) // بر اساس فیلد 'order' مرتب سازی کنید
    .map((item) => {
      const menuItem: MenuitemsType = {
        id: item.id || uniqueId(), // استفاده از ID از API یا تولید یک ID جدید
        title: item.name, // فرض بر این است که API فیلد 'name' برای عنوان دارد
        href: item.url === '#' ? undefined : item.url, // اگر URL '#' است، href را حذف کنید
        icon: getIconComponent(item.icon || item.name), // استفاده از فیلد 'icon' یا 'name' از API برای انتخاب آیکون
        chipColor: 'secondary', // رنگ Chip (اگر استفاده می شود)
      };

      // اگر آیتم دارای زیرمنو باشد، به صورت بازگشتی map کنید
      if (item.menus && item.menus.length > 0) {
        menuItem.children = mapApiDataToMenuItems(item.menus);
        // اگر آیتم والد دارای children است، href را حذف کنید تا فقط sub-menus باز شود
        // اگر می خواهید والد نیز قابل کلیک باشد، این خط را کامنت کنید:
        menuItem.href = undefined;
      }
      return menuItem;
    });
};


// تابع اصلی برای دریافت منوهای داینامیک از API
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

      // افزودن آیتم "Gösterge Paneli" (داشبورد) به ابتدای لیست با ساب‌هدر (اختیاری)
      // فرض می‌کنیم که "Gösterge Paneli" در response.data.data وجود دارد
      const dashboardItem = mappedMenuItems.find(item => item.title === 'Gösterge Paneli');
      if (dashboardItem) {
        finalMenuItems.push({
          navlabel: true,
          // subheader: 'Ana Sayfa', // یا هر ساب‌هدر دیگری
          id: uniqueId(),
        });
        finalMenuItems.push(dashboardItem);
      }

      // اضافه کردن سایر آیتم‌های اصلی (به جز داشبورد اگر قبلاً اضافه شده باشد)
      // این اطمینان می‌دهد که ترتیب منوهای اصلی مطابق با API حفظ می‌شود، مگر اینکه داشبورد را جداگانه مدیریت کنید.
      response.data.data // از داده‌های خام API استفاده کنید تا ترتیب اصلی منوهای اصلی حفظ شود
        .filter((item: any) => item.recordStatus === 0 && item.id && !item.parentId) // آیتم‌های والد فعال
        .sort((a: any, b: any) => a.order - b.order) // مجدداً بر اساس order مرتب کنید
        .forEach((apiItem: any) => {
          if (apiItem.name !== 'Gösterge Paneli') { // اگر داشبورد را قبلا اضافه کرده اید
            const mappedItem = mappedMenuItems.find(m => m.id === apiItem.id);
            if (mappedItem) {
              finalMenuItems.push(mappedItem);
            }
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
        // در اینجا، بهتر است از React Router useNavigate() استفاده شود
        // اما از آنجا که این یک فایل utility است، می‌توانید یک رویداد سفارشی را
        // در اینجا فعال کنید و در کامپوننت ریشه آن را گوش کنید.
        // یا صرفاً فرض کنید کامپوننت‌های UI سطح بالاتر این وضعیت را مدیریت می‌کنند.
        // window.location.href = '/'; // این یک ریدایرکت سخت است، در صورت لزوم.
      }
    }
    return [];
  }
};

// این 'Menuitems' ثابت، اکنون فقط برای هدف مستندسازی یا به عنوان یک Fallback/مثال باقی می‌ماند.
// در برنامه واقعی، شما باید 'getDynamicMenuItems' را فراخوانی کنید.
const Menuitems: MenuitemsType[] = [
  // {
  //     id: uniqueId(),
  //     title: 'Gösterge Paneli',
  //     icon: IconDashboard,
  //     href: '/dashboards/', // برای داشبورد والد
  //     children: [
  //         {
  //             id: uniqueId(),
  //             title: 'Gösterge Paneli',
  //             icon: IconDashboard,
  //             href: '/dashboards/dashboard',
  //             chipColor: 'secondary',
  //         },
  //     ],
  // },
  // {
  //     id: uniqueId(),
  //     title: 'Kullanıcı Yönetimi',
  //     icon: IconApps, // این icon باید به IconUsers تغییر کند
  //     href: '/managmentusers/',
  //     children: [
  //         {
  //             id: uniqueId(),
  //             title: 'Sistemin Çalışması',
  //             icon: IconApps,
  //             chipColor: 'secondary',
  //             href: '/managmentusers/system-operation',
  //         },
  //         {
  //             id: uniqueId(),
  //             title: 'Rolleri Listele',
  //             icon: IconCircles,
  //             chipColor: 'secondary',
  //             href: '/managmentusers/list-roles',
  //         },
  //         {
  //             id: uniqueId(),
  //             title: 'Kullanıcıları Listele',
  //             icon: IconUserCircle,
  //             chipColor: 'secondary',
  //             href: '/managmentusers/list-users',
  //         },
  //     ],
  // },
  // {
  //     id: uniqueId(),
  //     title: 'temel bilgi',
  //     icon: IconApps, // این icon باید به IconInfoCircle تغییر کند
  //     href: '/baseinfo/',
  //     children: [
  //         {
  //             id: uniqueId(),
  //             title: 'Kategori Listele',
  //             icon: IconCategory,
  //             chipColor: 'secondary',
  //             href: '/baseinfo/list-categories',
  //         },
  //         {
  //             id: uniqueId(),
  //             title: 'Birim Listele',
  //             icon: IconBuilding,
  //             chipColor: 'secondary',
  //             href: '/baseinfo/list-units',
  //         },
  //         {
  //             id: uniqueId(),
  //             title: 'Ürün Listele',
  //             icon: IconPackage,
  //             chipColor: 'secondary',
  //             href: '/baseinfo/list-items',
  //         },
  //     ],
  // },
  // {
  //     id: uniqueId(),
  //     title: 'İhale',
  //     icon: IconApps, // این icon باید به IconGavel تغییر کند
  //     href: '/tender/',
  //     children: [
  //         {
  //             id: uniqueId(),
  //             title: 'İhale Listele',
  //             icon: IconCategory, // این icon باید به IconGavel یا IconClipboardList تغییر کند
  //             chipColor: 'secondary',
  //             href: '/tender/list-tender',
  //         }
  //     ],
  // },
  // {
  //     id: uniqueId(),
  //     title: 'İşler', // اگر این منو را هم اضافه می کنید
  //     icon: IconApps, // این icon باید به IconBriefcase تغییر کند
  //     href: '/works/',
  //     children: [
  //         {
  //             id: uniqueId(),
  //             title: 'İşleri Listele',
  //             icon: IconClipboardText, // یا IconProgressCheck
  //             chipColor: 'secondary',
  //             href: '/works/list-works',
  //         },
  //     ],
  // },
];

export default Menuitems; // این خط را می‌توانید حذف کنید اگر دیگر به آن نیازی ندارید و فقط getDynamicMenuItems را export می‌کنید.