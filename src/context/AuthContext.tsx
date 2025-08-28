// // AuthProvider.tsx
// import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';

// interface UserRole {
//   name: string;
// }

// interface JwtPayload {
//   username?: string;
//   role?: string | string[]; // role می تواند یک رشته یا آرایه ای از رشته ها باشد
// }

// interface AuthContextType {
//   username: string;
//   userRoles: UserRole[];
//   activeRoleName: string | null;
//   updateActiveRole: (newRoleName: string) => void;
//   loadAuthData: () => void;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// const decodeJwtToken = (token: string): JwtPayload | null => {
//   try {
//     const base64Url = token.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const jsonPayload = decodeURIComponent(
//       atob(base64)
//         .split('')
//         .map(function (c) {
//           return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//         })
//         .join(''),
//     );
//     return JSON.parse(jsonPayload);
//   } catch (e) {
//     console.error("Error decoding JWT token:", e);
//     return null;
//   }
// };

// interface AuthProviderProps {
//   children: ReactNode;
// }

// export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
//   const [username, setUsername] = useState<string>('Guest');
//   const [userRoles, setUserRoles] = useState<UserRole[]>([]);
//   const [activeRoleName, setActiveRoleName] = useState<string | null>(null);

//   const loadAuthData = useCallback(() => {
//     const authToken = localStorage.getItem('authToken');
//     const savedActiveRoleName = localStorage.getItem('activeUserRoleName');
//     const savedUsername = localStorage.getItem('lastLoggedInUsername'); // نام کاربری ذخیره شده از لاگین قبلی

//     if (authToken) {
//       const decodedToken = decodeJwtToken(authToken);

//       // مطمئن می شویم توکن دیکد شده و نام کاربری در آن وجود دارد
//       if (decodedToken && decodedToken.username) {
//         const currentUsername = decodedToken.username;
//         setUsername(currentUsername);

//         let rolesFromToken: UserRole[] = [];
//         if (Array.isArray(decodedToken.role)) {
//           rolesFromToken = decodedToken.role.map((roleName: string) => ({ name: roleName }));
//         } else if (typeof decodedToken.role === 'string') {
//           rolesFromToken = [{ name: decodedToken.role }];
//         }
//         setUserRoles(rolesFromToken);

//         let roleToActivate: string | null = null;

//         // 1. بررسی کن که آیا کاربر فعلی همان کاربر قبلی است
//         if (currentUsername === savedUsername) {debugger
//           // 2. اگر همان کاربر قبلی است، آخرین نقش انتخابی ذخیره شده را بررسی کن
//           if (savedActiveRoleName) {
//             // 3. اگر نقش ذخیره شده در لیست نقش های فعلی کاربر از توکن موجود است
//             if (rolesFromToken.some(r => r.name === savedActiveRoleName)) {
//               roleToActivate = savedActiveRoleName; // همان نقش ذخیره شده را فعال کن
//             }
//           }
//         }

//         // 4. اگر نقش فعال هنوز انتخاب نشده (یعنی کاربر جدید است یا نقش ذخیره شده معتبر نیست)
//         if (!roleToActivate && rolesFromToken.length > 0) {
//           roleToActivate = rolesFromToken[0].name; // اولین نقش موجود در توکن را فعال کن
//         }

//         // 5. اگر هیچ نقشی برای فعال شدن پیدا نشد
//         if (roleToActivate) {
//           setActiveRoleName(roleToActivate);
//           localStorage.setItem('activeUserRoleName', roleToActivate);
//         } else {
//           // هیچ نقشی برای کاربر وجود ندارد
//           setActiveRoleName('Rol Yok');
//           localStorage.removeItem('activeUserRoleName');
//         }

//         // همیشه نام کاربری فعلی را برای لاگین بعدی ذخیره کن
//         localStorage.setItem('lastLoggedInUsername', currentUsername);

//       } else {
//         // توکن نامعتبر است یا نام کاربری ندارد
//         setUsername('Guest');
//         setUserRoles([]);
//         setActiveRoleName('Rol Yok');
//         localStorage.removeItem('activeUserRoleName');
//         localStorage.removeItem('lastLoggedInUsername');
//         localStorage.removeItem('authToken');
//       }
//     } else {
//       // authToken وجود ندارد (کاربر لاگ اوت کرده)
//       setUsername('Guest');
//       setUserRoles([]);
//       setActiveRoleName('Rol Yok');
//       localStorage.removeItem('activeUserRoleName');
//       localStorage.removeItem('lastLoggedInUsername');
//     }
//   }, []);

//   useEffect(() => {
//     loadAuthData(); // بارگذاری اولیه هنگام mount

//     const handleStorageChange = (event: StorageEvent) => {
//       // گوش دادن به تغییرات key های مربوط به احراز هویت
//       if (event.key === 'authToken' || event.key === 'activeUserRoleName' || event.key === 'lastLoggedInUsername') {
//         loadAuthData(); // بارگذاری مجدد داده ها در صورت تغییر
//       }
//     };

//     window.addEventListener('storage', handleStorageChange);

//     return () => {
//       window.removeEventListener('storage', handleStorageChange); // پاکسازی شنونده
//     };
//   }, [loadAuthData]); // loadAuthData به عنوان dependency برای useEffect

//   const updateActiveRole = (newRoleName: string) => {
//     // فقط در صورتی نقش را به‌روزرسانی کن که در userRoles کاربر موجود باشد
//     if (userRoles.some(r => r.name === newRoleName)) {
//       setActiveRoleName(newRoleName);
//       localStorage.setItem('activeUserRoleName', newRoleName);
//     } else {
//       console.warn(`Attempted to set an invalid role: ${newRoleName}. Role not found in user's assigned roles.`);
//       // می‌توانید اینجا یک showAlert هم برای کاربر نمایش دهید که نقش نامعتبر است.
//     }
//   };

//   const authContextValue: AuthContextType = {
//     username,
//     userRoles,
//     activeRoleName,
//     updateActiveRole,
//     loadAuthData,
//   };

//   return (
//     <AuthContext.Provider value={authContextValue}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };
// AuthProvider.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { uniqueId } from 'lodash';
import server from 'src/assets/address.json';
import {
  IconDashboard, IconApps, IconUserCircle, IconCircles, IconCategory, IconBuilding,
  IconPackage, IconGavel, IconPlus, IconChecklist, IconRoute, IconUserCog,
  IconInfoCircle, IconClipboardList, IconProgressCheck, IconGlobe, IconMap,
  IconBoxSeam, IconBuildingWarehouse, IconReceipt, IconShoppingCart, IconCar,
  IconBuildingFactory, IconFileInvoice
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
// === Type Definitions
interface UserRole {
  id: string;
  name: string;
}

interface JwtPayload {
  username?: string;
  role?: string | string[];
}

interface MenuOperation {
  id: string;
  recordStatus: number;
  systemOperation: {
    id: string;
    name: string;
  };
}

interface RoleMenuOperationApiResponse {
  id: string;
  recordStatus: number;
  menuOperation: MenuOperation;
}

interface RoleApiResponse {
  id: string;
  name: string;
  recordStatus: number;
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

export interface MenuitemsType {
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chipColor?: string;
  [x: string]: any;
}
interface AllowedOperation {
  menuOperationId: string;
  systemOperationId: string;
  systemOperationName: string;
}
interface AuthContextType {
  username: string;
  userRoles: UserRole[];
  activeRoleName: string | null;
  activeRoleId: string | null;
  allowedOperations: AllowedOperation[];
  menuItems: MenuitemsType[];
  isAuthDataLoading: boolean;
  updateActiveRole: (newRoleName: string) => void;
  loadAuthData: () => void;
  isAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// === Utility Functions
const decodeJwtToken = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decoding JWT token:", e);
    return null;
  }
};

const IconComponents: { [key: string]: React.ElementType } = {
  IconDashboard, IconApps, IconUserCircle, IconCircles, IconCategory, IconBuilding,
  IconPackage, IconGavel, IconPlus, IconChecklist, IconRoute, IconUserCog,
  IconInfoCircle, IconClipboardList, IconProgressCheck, IconGlobe, IconMap,
  IconBoxSeam, IconBuildingWarehouse, IconReceipt, IconShoppingCart, IconCar,
  IconBuildingFactory, IconFileInvoice
};

const getIconComponent = (iconName: string): React.ElementType => IconComponents[iconName.trim()] || IconPlus;

// === AuthProvider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [username, setUsername] = useState<string>('Guest');
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [activeRoleName, setActiveRoleName] = useState<string | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [allowedOperations, setAllowedOperations] = useState<AllowedOperation[]>([]);
  const [menuItems, setMenuItems] = useState<MenuitemsType[]>([]);
  const [isAuthDataLoading, setIsAuthDataLoading] = useState(false);


  const navigate = useNavigate();
  const location = useLocation();

  const [isAuth, setIsAuth] = useState(false);
  // ✅ منطق فیلتر کردن منو بهینه شده است
  const mapApiDataToMenuItems = useCallback((apiData: ApiMenuItem[], allowedOperations: AllowedOperation[]): MenuitemsType[] => {
    if (!apiData || apiData.length === 0) return [];

    const filteredAndMappedMenus: MenuitemsType[] = [];

    apiData.filter(item => item.recordStatus === 0)
      .sort((a, b) => a.order - b.order)
      .forEach(item => {
        let children: MenuitemsType[] | undefined;
        if (item.menus && item.menus.length > 0) {
          children = mapApiDataToMenuItems(item.menus, allowedOperations);
        }

        // const hasViewPermission = item.menuOperations
        //   .filter(op => op.recordStatus === 0 && op.systemOperation.name === 'Görüntülemek')
        //   .some(op => allowedOperations.includes(op.id));

        // ✅ منطق جدید برای بررسی دسترسی نمایش
        const hasViewPermission = item.menuOperations
          .filter(op => op.recordStatus === 0 && op.systemOperation.name === 'Görüntülemek')
          .some(op => allowedOperations.some(allowedOp => allowedOp.menuOperationId === op.id));

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
  }, []);

  const getRawMenusFromApi = useCallback(async (): Promise<any[]> => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return [];
    try {
      const response = await axios.get(`${server.baseurl}${server.baseinfo}get-menus`, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching dynamic menu items:', error);
      return [];
    }
  }, []);

  // const updateMenuAndOperations = useCallback(async (roleId: string) => {
  //   setIsAuthDataLoading(true);
  //   setAllowedOperations([]);
  //   setMenuItems([]);

  //   const authToken = localStorage.getItem('authToken');
  //   if (!authToken) {
  //     setIsAuthDataLoading(false);
  //     return;
  //   }

  //   try {
  //     const operationsResponse = await axios.get<{ data: { roleMenuOperations: RoleMenuOperationApiResponse[] } }>(
  //       `${server.baseurl}${server.user}get-role-with-operations/${roleId}`,
  //       { headers: { "Authorization": `Bearer ${authToken}` } }
  //     );

  //     // ✅ اینجا به جای systemOperation.name، id عملیات را در allowedOperations ذخیره می‌کنیم
  //     const ops: AllowedOperation[] = operationsResponse.data?.data?.roleMenuOperations
  //       .filter(op => op.recordStatus === 0 && op.menuOperation?.recordStatus === 0)
  //       .map(op => ({
  //         menuOperationId: op.menuOperation.id,
  //         systemOperationId: op.menuOperation.systemOperation.id,
  //         systemOperationName: op.menuOperation.systemOperation.name
  //       })) || [];

  //     setAllowedOperations(ops); // این خط state را به درستی تنظیم می‌کند

  //     const rawMenus = await getRawMenusFromApi();
  //     // ✅ اینجا باید آرایه ops را به تابع بدهی تا نوع داده‌ها مطابقت داشته باشد
  //     const filteredMenus = mapApiDataToMenuItems(rawMenus, ops);



  //     const finalMenuItems: MenuitemsType[] = [];
  //     const dashboardItem = filteredMenus.find(item => item.title === 'Gösterge Paneli');
  //     if (dashboardItem) {
  //       finalMenuItems.push({ navlabel: true, subheader: '', id: uniqueId() });
  //       finalMenuItems.push(dashboardItem);
  //     }
  //     filteredMenus.forEach(item => {
  //       if (item.title !== 'Gösterge Paneli') {
  //         finalMenuItems.push(item);
  //       }
  //     });

  //     setMenuItems(finalMenuItems);
  //   } catch (e) {
  //     console.error("Failed to fetch menu and role data:", e);
  //     setAllowedOperations([]);
  //     setMenuItems([]);
  //   } finally {
  //     setIsAuthDataLoading(false);
  //   }
  // }, [getRawMenusFromApi, mapApiDataToMenuItems]);

  const updateMenuAndOperations = useCallback(async (roleId: string) => {
    setIsAuthDataLoading(true);
    setAllowedOperations([]);
    setMenuItems([]);

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      setIsAuthDataLoading(false);
      return { ops: [], rawMenus: [] }; // ✅ بازگرداندن مقادیر خالی
    }

    try {
      const operationsResponse = await axios.get<{ data: { roleMenuOperations: RoleMenuOperationApiResponse[] } }>(
        `${server.baseurl}${server.user}get-role-with-operations/${roleId}`,
        { headers: { "Authorization": `Bearer ${authToken}` } }
      );

      const ops: AllowedOperation[] = operationsResponse.data?.data?.roleMenuOperations
        .filter(op => op.recordStatus === 0 && op.menuOperation?.recordStatus === 0)
        .map(op => ({
          menuOperationId: op.menuOperation.id,
          systemOperationId: op.menuOperation.systemOperation.id,
          systemOperationName: op.menuOperation.systemOperation.name
        })) || [];

      const rawMenus = await getRawMenusFromApi();
      const filteredMenus = mapApiDataToMenuItems(rawMenus, ops);
      const finalMenuItems = filteredMenus.sort((a, b) => a.order - b.order);

      // ✅ وضعیت‌ها را پس از دریافت اطلاعات کامل به‌روز می‌کنیم
      setAllowedOperations(ops);
      setMenuItems(finalMenuItems);

      // ✅ اطلاعات را برمی‌گردانیم تا در تابع updateActiveRole استفاده شود
      return { ops, rawMenus };

    } catch (e) {
      console.error("Failed to fetch menu and role data:", e);
      setAllowedOperations([]);
      setMenuItems([]);
      return { ops: [], rawMenus: [] }; // ✅ در صورت خطا مقادیر خالی را بازمی‌گردانیم
    } finally {
      setIsAuthDataLoading(false);
    }
  }, [getRawMenusFromApi, mapApiDataToMenuItems]);
  const loadAuthData = useCallback(async () => {
    setIsAuthDataLoading(true); // ✅ شروع حالت بارگذاری
    const authToken = localStorage.getItem('authToken');
    debugger
    if (!authToken) {
      // اگر توکن نیست، بلافاصله وضعیت را به حالت غیرمجاز برگردانید
      setUsername('Guest');
      setUserRoles([]);
      setActiveRoleName(null);
      setActiveRoleId(null);
      setAllowedOperations([]);
      setMenuItems([]);
      setIsAuth(false);
      setIsAuthDataLoading(false); // ✅ پایان بارگذاری
      return; // مهم: اجرای تابع را متوقف کنید
    }

    try {
      // ✅ تمام عملیات‌های ناهمگام را به صورت همزمان اجرا کنید
      const [rolesResponse, decodedToken, rawMenus] = await Promise.all([
        axios.get<{ data: RoleApiResponse[] }>(`${server.baseurl}${server.user}get-roles`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        }),
        decodeJwtToken(authToken),
        getRawMenusFromApi(),
      ]);

      // ✅ پردازش داده‌ها
      const allActiveRoles = rolesResponse.data.data?.filter(role => role.recordStatus === 0) || [];
      const currentUsername = decodedToken?.username;

      // ✅ اگر داده‌های اولیه معتبر نیستند، به حالت غیرمجاز برگردید
      if (!currentUsername || allActiveRoles.length === 0) {
        throw new Error('Invalid authentication data.');
      }

      const userRoleNames = Array.isArray(decodedToken.role) ? decodedToken.role : [decodedToken.role];
      const rolesFromToken = userRoleNames
        .map(roleName => allActiveRoles.find(ar => ar.name === roleName))
        .filter((role): role is RoleApiResponse => role !== undefined)
        .map(role => ({ id: role.id, name: role.name }));

      // ✅ انتخاب نقش فعال
      const savedActiveRoleName = localStorage.getItem('activeUserRoleName');
      let roleToActivate = rolesFromToken.find(r => r.name === savedActiveRoleName);
      if (!roleToActivate && rolesFromToken.length > 0) {
        roleToActivate = rolesFromToken[0];
      }

      let ops: AllowedOperation[] = [];
      if (roleToActivate) {
        const operationsResponse = await axios.get<{ data: { roleMenuOperations: RoleMenuOperationApiResponse[] } }>(
          `${server.baseurl}${server.user}get-role-with-operations/${roleToActivate.id}`,
          { headers: { "Authorization": `Bearer ${authToken}` } }
        );
        ops = operationsResponse.data?.data?.roleMenuOperations
          .filter(op => op.recordStatus === 0 && op.menuOperation?.recordStatus === 0)
          .map(op => ({
            menuOperationId: op.menuOperation.id,
            systemOperationId: op.menuOperation.systemOperation.id,
            systemOperationName: op.menuOperation.systemOperation.name
          })) || [];
      }

      // ✅ فقط زمانی که تمام داده‌ها آماده است، وضعیت‌ها را به روز کنید
      setUsername(currentUsername);
      setUserRoles(rolesFromToken);
      setActiveRoleName(roleToActivate?.name || null);
      setActiveRoleId(roleToActivate?.id || null);
      setAllowedOperations(ops);

      const filteredMenus = mapApiDataToMenuItems(rawMenus, ops);
      const finalMenuItems = filteredMenus.sort((a, b) => a.order - b.order); // ترتیب دهی نهایی
      setMenuItems(finalMenuItems);

      setIsAuth(true);
      localStorage.setItem('lastLoggedInUsername', currentUsername);

    } catch (e) {
      console.error("Failed to load auth data:", e);
      // در صورت بروز خطا، همه چیز را به حالت اولیه برگردانید
      setUsername('Guest');
      setUserRoles([]);
      setActiveRoleName(null);
      setActiveRoleId(null);
      setAllowedOperations([]);
      setMenuItems([]);
      setIsAuth(false);
      localStorage.removeItem('authToken');

    } finally {
      setIsAuthDataLoading(false); // ✅ پایان حالت بارگذاری
    }
  }, [mapApiDataToMenuItems, getRawMenusFromApi]);

  useEffect(() => {
    loadAuthData();
    const handleStorageChange = (event: StorageEvent) => {
      if (['authToken', 'activeUserRoleName', 'activeUserRoleId', 'lastLoggedInUsername'].includes(event.key || '')) {
        loadAuthData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAuthData]);

  // const updateActiveRole = useCallback((newRoleName: string) => {
  //   const role = userRoles.find(r => r.name === newRoleName);
  //   if (role) {
  //     setActiveRoleName(role.name);
  //     setActiveRoleId(role.id);
  //     localStorage.setItem('activeUserRoleName', role.name);
  //     localStorage.setItem('activeUserRoleId', role.id);
  //     updateMenuAndOperations(role.id);
  //   } else {
  //     console.warn(`Attempted to set an invalid role: ${newRoleName}.`);
  //   }
  // }, [userRoles, updateMenuAndOperations, navigate]);


  const updateActiveRole = useCallback(async (newRoleName: string) => {
    const role = userRoles.find(r => r.name === newRoleName);
    if (role) {
      // ✅ مرحله ۱: ابتدا وضعیت نقش‌های محلی را به‌روز کنید
      setActiveRoleName(role.name);
      setActiveRoleId(role.id);
      localStorage.setItem('activeUserRoleName', role.name);
      localStorage.setItem('activeUserRoleId', role.id);

      // ✅ مرحله ۲: اطلاعات جدید را از سرور دریافت و منتظر تکمیل آن بمانید
      const { ops, rawMenus } = await updateMenuAndOperations(role.id);

      // ✅ مرحله ۳: منوهای فیلتر شده را با داده‌های جدیدی که به دست آورده‌ایم، ایجاد کنید
      const newFilteredMenus = mapApiDataToMenuItems(rawMenus, ops);

      // ✅ مرحله ۴: دسترسی به مسیر فعلی را با استفاده از منوهای جدید بررسی کنید
      const currentPath = location.pathname;
      const hasPermissionToCurrentPath = newFilteredMenus.some(item => {
        const findPath = (menu: any): boolean => {
          if (menu.href === currentPath) return true;
          if (menu.children) {
            return menu.children.some(findPath);
          }
          return false;
        };
        return findPath(item);
      });

      // ✅ مرحله ۵: اگر دسترسی وجود ندارد، کاربر را به داشبورد هدایت کنید
      if (!hasPermissionToCurrentPath) {
        navigate('/dashboards/dashboard');
      }
    } else {
      console.warn(`Attempted to set an invalid role: ${newRoleName}.`);
    }
  }, [userRoles, navigate, location, updateMenuAndOperations, mapApiDataToMenuItems]);


  const authContextValue: AuthContextType = {
    username, userRoles, activeRoleName, activeRoleId, allowedOperations,
    menuItems, isAuthDataLoading, updateActiveRole, loadAuthData, isAuth,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};