

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { uniqueId } from 'lodash';
import server from 'src/assets/address.json';
import {
  IconDashboard, IconApps, IconUserCircle, IconCircles, IconCategory, IconBuilding,
  IconPackage, IconGavel, IconPlus, IconChecklist, IconRoute, IconUserCog,
  IconInfoCircle, IconClipboardList, IconProgressCheck, IconGlobe, IconMap,
  IconBoxSeam, IconBuildingWarehouse, IconReceipt, IconShoppingCart, IconCar,
  IconBuildingFactory, IconFileInvoice, IconSitemap, IconHelmet, IconBuildingStore,
  IconArrowsExchange, IconFolders, IconBulb, IconTornado, IconListCheck, IconCalendar,
  IconFileDollar, IconTimeline, IconBriefcase, IconHierarchy, IconFileExport,
  IconFileOff, IconReportAnalytics, IconUsersGroup, IconCalendarTime, IconQuestionMark,
  IconInbox, IconClockHour3, IconTag, IconUserX, IconBarcode, IconTruck, IconParking, IconHandGrab,
  IconSchool, IconNotebook, IconBooks, IconFileCertificate, IconFileImport, IconCrown, IconFileReport,
  IconFileText, IconListDetails, IconCarOff, IconFileSpreadsheet, IconClipboardData, IconCurrencyTaka,
  IconLayoutDashboard, IconChartInfographic
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
interface UserRole {
  id: string;
  name: string;
}

interface JwtPayload {
  username?: string;
  role?: string | string[];
  userid?: string;
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
interface UserMenuOperationApiResponse {
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
    return null;
  }
};

const IconComponents: { [key: string]: React.ElementType } = {
  IconDashboard, IconApps, IconUserCircle, IconCircles, IconCategory, IconBuilding,
  IconPackage, IconGavel, IconPlus, IconChecklist, IconRoute, IconUserCog,
  IconInfoCircle, IconClipboardList, IconProgressCheck, IconGlobe, IconMap,
  IconBoxSeam, IconBuildingWarehouse, IconReceipt, IconShoppingCart, IconCar,
  IconBuildingFactory, IconFileInvoice, IconBriefcase, IconFileExport,
  IconSitemap: IconSitemap, IconFileDollar, IconHierarchy,
  IconHelmet: IconHelmet, IconBuildingStore: IconBuildingStore, IconArrowsExchange,
  IconFolders, IconBulb, IconTornado, IconListCheck, IconCalendar, IconTimeline,
  IconFileOff, IconReportAnalytics, IconUsersGroup, IconCalendarTime, IconQuestionMark,
  IconInbox, IconClockHour3, IconTag, IconUserX, IconBarcode, IconTruck, IconParking, IconHandGrab,
  IconSchool, IconNotebook, IconBooks, IconFileCertificate, IconFileImport, IconCrown, IconFileReport,
  IconFileText, IconListDetails, IconCarOff, IconFileSpreadsheet, IconClipboardData, IconCurrencyTaka,
  IconLayoutDashboard, IconChartInfographic
};

const getIconComponent = (iconName: string): React.ElementType => IconComponents[iconName.trim()] || IconPlus;

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
  const [isAuth, setIsAuth] = useState(false);



  const navigate = useNavigate();
  const location = useLocation();

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
            menuOperations: item.menuOperations,
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
      return [];
    }
  }, []);



  const updateMenuAndOperations = useCallback(async (roleId: string) => {

    setIsAuthDataLoading(true);
    setAllowedOperations([]);
    setMenuItems([]);

    const authToken = localStorage.getItem('authToken');
    const decoded = authToken ? decodeJwtToken(authToken) : null;
    const userId = decoded?.userid;

    if (!authToken) {
      setIsAuthDataLoading(false);
      return { ops: [], rawMenus: [] };
    }

    try {
      const [roleOpsRes, userOpsRes, rawMenus] = await Promise.all([
        axios.get<{ data: { roleMenuOperations: RoleMenuOperationApiResponse[] } }>(
          `${server.baseurl}${server.user}get-role-with-operations/${roleId}`,
          { headers: { "Authorization": `Bearer ${authToken}` } }
        ),
        userId ? axios.get<{ data: { userMenuOperations: UserMenuOperationApiResponse[] } }>(
          `${server.baseurl}${server.user}get-user-with-role-and-operations/${userId}`,
          { headers: { "Authorization": `Bearer ${authToken}` } }
        ) : Promise.resolve({ data: { data: { userMenuOperations: [] } } }),
        getRawMenusFromApi()
      ]);

      const roleOps = roleOpsRes.data?.data?.roleMenuOperations || [];

      const userOps = userOpsRes.data?.data?.userMenuOperations || [];

      const allOpsMap = new Map<string, AllowedOperation>();

      roleOps
        .filter(op => op.recordStatus === 0 && op.menuOperation?.recordStatus === 0)
        .forEach(op => {
          allOpsMap.set(op.menuOperation.id, {
            menuOperationId: op.menuOperation.id,
            systemOperationId: op.menuOperation.systemOperation.id,
            systemOperationName: op.menuOperation.systemOperation.name
          });
        });

      userOps
        .filter(op => op.recordStatus === 0 && op.menuOperation?.recordStatus === 0)
        .forEach(op => {
          if (!allOpsMap.has(op.menuOperation.id)) {
            allOpsMap.set(op.menuOperation.id, {
              menuOperationId: op.menuOperation.id,
              systemOperationId: op.menuOperation.systemOperation.id,
              systemOperationName: op.menuOperation.systemOperation.name
            });
          }
        });

      const finalOps = Array.from(allOpsMap.values());

      const filteredMenus = mapApiDataToMenuItems(rawMenus, finalOps);
      const finalMenuItems = filteredMenus.sort((a, b) => (a.order || 0) - (b.order || 0));

      setAllowedOperations(finalOps);
      setMenuItems(finalMenuItems);

      return { ops: finalOps, rawMenus };

    } catch (e) {
      console.error("Auth Data Merge Error:", e);
      setAllowedOperations([]);
      setMenuItems([]);
      return { ops: [], rawMenus: [] };
    } finally {
      setIsAuthDataLoading(false);
    }
  }, [getRawMenusFromApi, mapApiDataToMenuItems]);



  function pickAndPersistActiveRole(roles: UserRole[], savedName?: string | null) {

    const saved = savedName ? roles.find(r => r.name === savedName) : undefined;
    if (saved) {
      localStorage.setItem('activeUserRoleName', saved.name);
      localStorage.setItem('activeUserRoleId', saved.id);
      return saved;
    }

    const chosen = roles[0];
    localStorage.setItem('activeUserRoleName', chosen.name);
    localStorage.setItem('activeUserRoleId', chosen.id);
    return chosen;
  }



  const loadAuthData = useCallback(async () => {
    setIsAuthDataLoading(true);
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      setUsername('Guest');
      setUserRoles([]);
      setActiveRoleName(null);
      setActiveRoleId(null);
      setAllowedOperations([]);
      setMenuItems([]);
      setIsAuth(false);
      setIsAuthDataLoading(false);
      return;
    }

    try {
      const [rolesResponse, decodedToken, rawMenus] = await Promise.all([
        axios.get<{ data: RoleApiResponse[] }>(`${server.baseurl}${server.user}get-roles`, {
          headers: { "Authorization": `Bearer ${authToken}` }
        }),
        decodeJwtToken(authToken),
        getRawMenusFromApi(),
      ]);

      const allActiveRoles = rolesResponse.data.data?.filter(role => role.recordStatus === 0) || [];
      const currentUsername = decodedToken?.username;

      if (!currentUsername || allActiveRoles.length === 0) {
        throw new Error('Invalid authentication data.');
      }

      const userRoleNames = Array.isArray(decodedToken.role) ? decodedToken.role : [decodedToken.role];
      const rolesFromToken = userRoleNames
        .map(roleName => allActiveRoles.find(ar => ar.name === roleName))
        .filter((role): role is RoleApiResponse => role !== undefined)
        .map(role => ({ id: role.id, name: role.name }));

      const savedActiveRoleName = localStorage.getItem('activeUserRoleName');
      if (rolesFromToken.length === 0) throw new Error('No roles resolved for user');

      const roleToActivate = pickAndPersistActiveRole(rolesFromToken, savedActiveRoleName);

      let ops: AllowedOperation[] = [];
      if (roleToActivate) {
        const userId = decodedToken?.userid;

        const [roleOpsRes, userOpsRes] = await Promise.all([
          axios.get(`${server.baseurl}${server.user}get-role-with-operations/${roleToActivate.id}`,
            { headers: { "Authorization": `Bearer ${authToken}` } }),
          userId ? axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${userId}`,
            { headers: { "Authorization": `Bearer ${authToken}` } }) : Promise.resolve({ data: { data: { userMenuOperations: [] } } })
        ]);

        const allOpsMap = new Map<string, AllowedOperation>();

        (roleOpsRes.data?.data?.roleMenuOperations || [])
          .filter((op: any) => op.recordStatus === 0 && op.menuOperation?.recordStatus === 0)
          .forEach((op: any) => {
            allOpsMap.set(op.menuOperation.id, {
              menuOperationId: op.menuOperation.id,
              systemOperationId: op.menuOperation.systemOperation.id,
              systemOperationName: op.menuOperation.systemOperation.name
            });
          });

        (userOpsRes.data?.data?.userMenuOperations || [])
          .filter((op: any) => op.recordStatus === 0 && op.menuOperation?.recordStatus === 0)
          .forEach((op: any) => {
            allOpsMap.set(op.menuOperation.id, {
              menuOperationId: op.menuOperation.id,
              systemOperationId: op.menuOperation.systemOperation.id,
              systemOperationName: op.menuOperation.systemOperation.name
            });
          });

        ops = Array.from(allOpsMap.values());
      }
      setUsername(currentUsername);
      setUserRoles(rolesFromToken);
      setActiveRoleName(roleToActivate?.name || null);
      setActiveRoleId(roleToActivate?.id || null);
      setAllowedOperations(ops);

      const filteredMenus = mapApiDataToMenuItems(rawMenus, ops);
      const finalMenuItems = filteredMenus.sort((a, b) => a.order - b.order);
      setMenuItems(finalMenuItems);

      setIsAuth(true);
      localStorage.setItem('lastLoggedInUsername', currentUsername);

    } catch (e) {
      setUsername('Guest');
      setUserRoles([]);
      setActiveRoleName(null);
      setActiveRoleId(null);
      setAllowedOperations([]);
      setMenuItems([]);
      setIsAuth(false);
      localStorage.removeItem('authToken');

    } finally {
      setIsAuthDataLoading(false);
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


  const updateActiveRole = useCallback(async (newRoleName: string) => {
    const role = userRoles.find(r => r.name === newRoleName);
    if (role) {
      setActiveRoleName(role.name);
      setActiveRoleId(role.id);
      localStorage.setItem('activeUserRoleName', role.name);
      localStorage.setItem('activeUserRoleId', role.id);

      const { ops, rawMenus } = await updateMenuAndOperations(role.id);

      const newFilteredMenus = mapApiDataToMenuItems(rawMenus, ops);

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

      if (!hasPermissionToCurrentPath) {
        navigate('/dashboards/dashboard');
      }
    } else {
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