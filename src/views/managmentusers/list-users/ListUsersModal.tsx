// ListUsersModal.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  CircularProgress,
  Box,
  DialogContent,
  DialogTitle,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import Slide from '@mui/material/Slide';
import { IconX, IconChevronDown } from '@tabler/icons-react';
import { TransitionProps } from '@mui/material/transitions';
import axios from 'axios';
import server from '../../../assets/address.json'; 

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// --- انواع (Interfaces) ---
interface OperationType {
  id: string;
  name: string;
}

interface MenuItemType {
  id: string;
  name: string;
  url?: string;
  children?: MenuItemType[];
  availableOperations: OperationType[];
}

interface RolePermissionAssignment {
  roleId: string;
  permissions: { [menuId: string]: string[] };
}

interface RoleType {
  id: string;
  name: string;
}

type Props = {
  openRoleModal: boolean;
  onClose: () => void;
  userId: string | null;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

// ==============================================================================================
// 🌟🌟🌟🌟🌟 توابع API (بدون تغییر) 🌟🌟🌟🌟🌟
// ==============================================================================================

interface MenuApiRawItem {
    id: string; name: string; url: string; depth: number; order: number; recordStatus: number;
    menuOperations: Array<{ id: string; systemOperation: { id: string; name: string; } }>;
    menus: MenuApiRawItem[];
}

const mapApiMenuToModalMenuItem = (apiMenus: MenuApiRawItem[]): MenuItemType[] => {
    return apiMenus
        .filter((item: MenuApiRawItem) => item.recordStatus === 0)
        .sort((a: MenuApiRawItem, b: MenuApiRawItem) => a.order - b.order)
        .map((item: MenuApiRawItem) => {
            const mappedItem: MenuItemType = {
                id: item.id, name: item.name, url: item.url === '#' ? undefined : item.url,
                availableOperations: item.menuOperations.map((op: any) => ({ id: op.systemOperation.id, name: op.systemOperation.name, })), // 🌟 Type `any` موقت برای op
            };
            if (item.menus && item.menus.length > 0) { mappedItem.children = mapApiMenuToModalMenuItem(item.menus); }
            return mappedItem;
        });
};

export const fetchAllMenusWithOperations = async (): Promise<MenuItemType[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { console.warn("No auth token found for all menus with operations."); return []; }
  try {
      const response = await axios.get(server.baseurl + server.baseinfo + 'get-menus', { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
      if (response.data.success && response.data.data) { return mapApiMenuToModalMenuItem(response.data.data as MenuApiRawItem[]); }
      console.warn('API response for all menus with operations was not successful or data was empty.', response.data); return [];
  } catch (error: any) { console.error('Error fetching all menus with operations:', error); if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return []; }
};

export const fetchAllRoles = async (): Promise<RoleType[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { console.warn("No auth token found for all roles."); return []; }
  try {
      const response = await axios.get(server.baseurl + server.user + "get-roles", { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
      if (response.data.httpStatusCode === 200) { 
        return response.data.data.map((item: any) => ({ id: item.id, name: item.name })) as RoleType[]; // 🌟 Type `any` موقت برای item 
      }
      console.warn('Rol listesi alınırken bir hata oluştu.', response.data); return [];
  } catch (error: any) { console.error("Error fetching all roles:", error); if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return []; }
};

export const fetchUserRolesAndPermissions = async (userId: string): Promise<RolePermissionAssignment[]> => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { console.warn("No auth token found for user roles and permissions."); return []; }
    try {
        const response = await axios.get(`${server.baseurl}${server.user}get-user-roles-and-permissions/${userId}`, {
            headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
        });
        if (response.data.success && response.data.data && response.data.data.assignedRoles) {
            return response.data.data.assignedRoles.map((assignment: any) => ({ // 🌟 Type `any` موقت برای assignment
                roleId: assignment.roleId,
                permissions: assignment.permissions || {},
            })) as RolePermissionAssignment[];
        }
        console.warn('API response for user roles and permissions was not successful or data was empty.', response.data);
        return [];
    } catch (error: any) { console.error(`Error fetching user roles and permissions for userId ${userId}:`, error); if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return []; }
};

export const saveUserRolesAndPermissions = async (userId: string, assignments: RolePermissionAssignment[]): Promise<boolean> => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { console.warn("No auth token found for saving user roles and permissions."); return false; }
    try {
        const payload = { UserId: userId, assignedRolesWithCustomPermissions: assignments };
        const response = await axios.post(`${server.baseurl}${server.user}assign-user-roles-and-permissions`, payload, {
            headers: { "Accept": "application/json", 'Content-Type': 'application/json', "Authorization": `Bearer ${authToken}` }
        });
        return response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201;
    } catch (error: any) { console.error(`Error saving user roles and permissions for userId ${userId}:`, error); if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } throw error; }
};

// ==============================================================================================


const ListUsersModal = ({ openRoleModal, onClose, userId, showAlert }: Props) => {
  const navigate = useNavigate();
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]); // 🌟 تغییر: به string[]
  const [rolePermissionsForUser, setRolePermissionsForUser] = useState<RolePermissionAssignment[]>([]);

  const [expandedRoleAccordions, setExpandedRoleAccordions] = useState<string[]>([]); // 🌟 تغییر: به string[]

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [openErrorModal, setOpenErrorModal] = useState<boolean>(false);
  const [expandedMenusForRole, setExpandedMenusForRole] = useState<{ [roleId: string]: string[] }>({}); // 🌟 تغییر: roleId به string
  const [allMenusWithOperations, setAllMenusWithOperations] = useState<MenuItemType[]>([]);

  const { isTooltipGloballyEnabled } = useTooltip();

  const VIEW_OPERATION_ID = '35'; // 🌟 حتماً مطمئن شوید این ID واقعی 'Görüntülemek' است

  // ------------------------------------------------------------------------------------------
  // ✨ Effect برای لود کردن رول‌ها، تمام منوها و دسترسی‌های اولیه کاربر
  // ------------------------------------------------------------------------------------------
  useEffect(() => {
    if (openRoleModal && userId !== null) {
      setLoading(true);
      Promise.all([
        fetchAllRoles(),
        fetchAllMenusWithOperations(),
        fetchUserRolesAndPermissions(userId)
      ])
        .then(([roles, menus, userRoleAssignments]) => {
          setAllRoles(roles);
          const initialSelectedRoleIds = userRoleAssignments.map(assignment => assignment.roleId);
          setSelectedRoleIds(initialSelectedRoleIds);
          setRolePermissionsForUser(userRoleAssignments);
          setAllMenusWithOperations(menus); // مطمئن شوید این خط بعد از setAllRoles است
          setLoading(false);

          setExpandedRoleAccordions(initialSelectedRoleIds);
        })
        .catch(err => {
          console.error("Failed to load data for modal:", err);
          showAlert('Modül verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
          setLoading(false);
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            localStorage.removeItem('authToken');
            navigate("/");
          }
        });
    } else if (!openRoleModal) {
      setAllRoles([]);
      setSelectedRoleIds([]);
      setRolePermissionsForUser([]);
      setExpandedRoleAccordions([]); 
      setLoading(false);
      setSaving(false);
      setOpenErrorModal(false);
      setExpandedMenusForRole({});
      setAllMenusWithOperations([]);
    }
  }, [openRoleModal, userId, navigate]);

  // ------------------------------------------------------------------------------------------
  // ✨ هندلرها برای انتخاب رول در ستون چپ
  // ------------------------------------------------------------------------------------------

  const handleToggleRoleSelection = (roleId: string) => () => { // 🌟 تغییر: roleId به string
    setSelectedRoleIds(prevSelectedIds => {
      const currentIndex = prevSelectedIds.indexOf(roleId);
      let newSelectedIds: string[]; // 🌟 تغییر: به string[]
      let newRolePermissionsForUser = [...rolePermissionsForUser];
      let newExpandedRoleAccordions = [...expandedRoleAccordions]; 

      if (currentIndex === -1) {
        newSelectedIds = [...prevSelectedIds, roleId];
        newRolePermissionsForUser.push({ roleId: roleId, permissions: {} });
        newExpandedRoleAccordions.push(roleId); 
      } else {
        newSelectedIds = prevSelectedIds.filter(id => id !== roleId);
        newRolePermissionsForUser = newRolePermissionsForUser.filter(assignment => assignment.roleId !== roleId);
        newExpandedRoleAccordions = newExpandedRoleAccordions.filter(id => id !== roleId); 
      }
      setRolePermissionsForUser(newRolePermissionsForUser);
      setExpandedRoleAccordions(newExpandedRoleAccordions); 
      return newSelectedIds;
    });
  };

  const handleToggleRoleAccordion = (roleId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => { // 🌟 تغییر: roleId به string
    setExpandedRoleAccordions(prev => {
          console.log(event)
        if (isExpanded) {
            return Array.from(new Set([...prev, roleId]));
        } else {
            return prev.filter(id => id !== roleId);
        }
    });
  };

    const handleListItemClick  = (roleId: string) => (event: React.MouseEvent<HTMLLIElement>) => {
        // از `event.stopPropagation()` استفاده کنید اگر نمی‌خواهید کلیک به عناصر والد منتقل شود
        // event.stopPropagation(); 
        
        setExpandedRoleAccordions(prev => {
          console.log(event)
            if (prev.includes(roleId)) {
                // اگر roleId قبلاً وجود دارد، آن را حذف کنید (یعنی "جمع شود" یا "انتخابش برداشته شود")
                return prev.filter(id => id !== roleId);
            } else {
                // اگر roleId وجود ندارد، آن را اضافه کنید (یعنی "باز شود" یا "انتخاب شود")
                return Array.from(new Set([...prev, roleId]));
            }
        });
    };

  // ------------------------------------------------------------------------------------------
  // ✨ هندلرها و توابع کمکی برای مدیریت دسترسی‌های منو و عملیات
  // ------------------------------------------------------------------------------------------

  const findMenuItemById = (menus: MenuItemType[], id: string): MenuItemType | undefined => {
    for (const menu of menus) {
      if (menu.id === id) return menu;
      if (menu.children) {
        const found = findMenuItemById(menu.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const getAllChildMenuAndOperationIds = (menu: MenuItemType): { menuIds: string[], operationIds: string[] } => {
    let menuIds: string[] = [menu.id];
    let operationIds: string[] = [];

    menu.availableOperations.forEach(op => { operationIds.push(op.id); });

    if (menu.children) {
      menu.children.forEach(child => {
        const childData = getAllChildMenuAndOperationIds(child);
        menuIds = menuIds.concat(childData.menuIds);
        operationIds = operationIds.concat(childData.operationIds);
      });
    }
    return { menuIds, operationIds: Array.from(new Set(operationIds)) };
  };


  const updateMenuPermissionsForRole = (
    currentRoleId: string, // 🌟 تغییر: currentRoleId به string
    updater: (prevMenuPerms: { [menuId: string]: string[] }) => { [menuId: string]: string[] }
  ) => {
    setRolePermissionsForUser(prevAssignments => {
      const newAssignments = prevAssignments.map(assignment => {
        if (assignment.roleId === currentRoleId) {
          return {
            ...assignment,
            permissions: updater(assignment.permissions || {}),
          };
        }
        return assignment;
      });
      return newAssignments;
    });
  };

  const handleToggleMenuAccess = (currentRoleId: string, menu: MenuItemType) => (event: React.MouseEvent<HTMLButtonElement> | React.ChangeEvent<HTMLInputElement>) => {
   
    if (event && 'stopPropagation' in event) { 
      (event as React.MouseEvent<HTMLButtonElement>).stopPropagation();
    }
    
    updateMenuPermissionsForRole(currentRoleId, prevMenuPerms => {
      const newMenuPerms = { ...prevMenuPerms };
      const isCurrentlyChecked = !!newMenuPerms[menu.id];

      if (isCurrentlyChecked) {
        delete newMenuPerms[menu.id];
        const { menuIds: childMenuIds } = getAllChildMenuAndOperationIds(menu);
        childMenuIds.forEach(id => { if (newMenuPerms[id]) { delete newMenuPerms[id]; } });
      } else {
        const { menuIds: childMenuIds } = getAllChildMenuAndOperationIds(menu);
        const viewOperation = menu.availableOperations.find(op => op.name === 'Görüntülemek');
        if (viewOperation) { newMenuPerms[menu.id] = [viewOperation.id]; } else if (!menu.children) { newMenuPerms[menu.id] = []; } else { newMenuPerms[menu.id] = []; }

        childMenuIds.forEach(id => {
            const childMenu = findMenuItemById(allMenusWithOperations, id);
            if (childMenu) {
                const childViewOperation = childMenu.availableOperations.find(op => op.name === 'Görüntülemek');
                if (childViewOperation) { newMenuPerms[childMenu.id] = [childViewOperation.id]; } else if (!childMenu.children) { newMenuPerms[childMenu.id] = []; } else { newMenuPerms[childMenu.id] = []; }
            }
        });
      }
      return newMenuPerms;
    });
  };

  const handleToggleOperation = (currentRoleId: string, menuId: string, operationId: string) => () => { // 🌟 تغییر: currentRoleId به string
    updateMenuPermissionsForRole(currentRoleId, prevMenuPerms => {
      const newMenuPerms = { ...prevMenuPerms };
      let currentOperations = newMenuPerms[menuId] ? [...newMenuPerms[menuId]] : [];

      const currentIndex = currentOperations.indexOf(operationId);

      if (currentIndex === -1) { // عملیات اضافه می‌شود
        currentOperations.push(operationId);
        
        if (operationId !== VIEW_OPERATION_ID && !currentOperations.includes(VIEW_OPERATION_ID)) {
            currentOperations.push(VIEW_OPERATION_ID);
        }
        newMenuPerms[menuId] = Array.from(new Set(currentOperations));

      } else { // عملیات حذف می‌شود
        currentOperations = currentOperations.filter(op => op !== operationId);
        
        if (operationId === VIEW_OPERATION_ID) {
            newMenuPerms[menuId] = [];
            delete newMenuPerms[menuId];
        } else {
            newMenuPerms[menuId] = currentOperations;
            
            const menu = findMenuItemById(allMenusWithOperations, menuId);
            if (newMenuPerms[menuId]?.length === 0 && !menu?.children) { // 🌟 اضافه کردن Optional Chaining برای length
                delete newMenuPerms[menuId];
            }
        }
      }
      return newMenuPerms;
    });
  };

  const handleAccordionChangeForMenu = (roleId: string, panelId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => { // 🌟 تغییر: roleId به string
    setExpandedMenusForRole(prevExpanded => {
          console.log(event)
        const newExpanded = { ...prevExpanded };
        const currentRoleExpandedMenus = newExpanded[roleId] || [];
        if (isExpanded) {
            newExpanded[roleId] = Array.from(new Set([...currentRoleExpandedMenus, panelId]));
        } else {
            newExpanded[roleId] = currentRoleExpandedMenus.filter(p => p !== panelId);
        }
        return newExpanded;
    });
  };


  const handleSelectAllPermissionsForRole = (currentRoleId: string) => () => { // 🌟 تغییر: currentRoleId به string
    updateMenuPermissionsForRole(currentRoleId, prevMenuPerms => {
      const newMenuPerms: { [menuId: string]: string[] } = {};
      
      let allOperationsTrulySelected = true;
      allMenusWithOperations.forEach(menu => {
        const { menuIds } = getAllChildMenuAndOperationIds(menu);
        menuIds.forEach(id => {
          const currentMenu = findMenuItemById(allMenusWithOperations, id);
          if (currentMenu) {
            const selectedOpsForThisMenu = prevMenuPerms[id] || [];
            const allAvailableOpsForMenu = currentMenu.availableOperations.map(op => op.id);
            if (allAvailableOpsForMenu.length !== selectedOpsForThisMenu.length ||
                !allAvailableOpsForMenu.every(opId => selectedOpsForThisMenu.includes(opId))) {
                allOperationsTrulySelected = false;
            }
          }
        });
      });

      if (allOperationsTrulySelected) {
        return {};
      } else {
        const selectAllRecursive = (menus: MenuItemType[]) => {
          menus.forEach(menu => {
            newMenuPerms[menu.id] = menu.availableOperations.map(op => op.id);
            if (menu.children && menu.children.length > 0) {
              selectAllRecursive(menu.children);
            }
          });
        };
        selectAllRecursive(allMenusWithOperations);
        return newMenuPerms;
      }
    });
  };

  const getCountOfSelectableItems = (menus: MenuItemType[]): number => {
    let count = 0;
    menus.forEach(menu => {
      count++;
      if (menu.children) {
        count += getCountOfSelectableItems(menu.children);
      }
    });
    return count;
  }
  
  const validatePermissionsForSave = (assignments: RolePermissionAssignment[], allMenus: MenuItemType[]): boolean => {
    let isValid = true;
    const errors: string[] = [];
    
    assignments.forEach(assignment => {
        const roleName = allRoles.find(r => r.id === assignment.roleId)?.name || `Role ${assignment.roleId}`;
        for (const menuId in assignment.permissions) {
            const selectedOperations = assignment.permissions[menuId];
            if (selectedOperations.length === 0) {
                const menu = findMenuItemById(allMenus, menuId);
                if (menu && !menu.children && menu.availableOperations.length > 0) {
                     errors.push(`${roleName} rolü için '${menu.name}' menüsünde en az bir operasyon seçilmelidir.`);
                     isValid = false;
                }
                continue;
            }

            const hasOtherOperations = selectedOperations.some(opId => opId !== VIEW_OPERATION_ID);
            const hasViewPermission = selectedOperations.includes(VIEW_OPERATION_ID);

            if (hasOtherOperations && !hasViewPermission) {
                const menu = findMenuItemById(allMenus, menuId);
                errors.push(`${menu?.name || 'Bir menü'} için 'Görüntülemek' izni olmadan diğer operasyonlar seçilemez.`);
                isValid = false;
            }
        }
    });

    if (!isValid) {
        console.error("Final permission validation errors:", errors);
        showAlert(errors.join('\n') || 'İzinlerde bazı hatalar var. Lütfen kontrol edin.', 'error');
    }
    return isValid;
  };


  // ------------------------------------------------------------------------------------------
  // ✨ تابع ذخیره نهایی
  // ------------------------------------------------------------------------------------------
  const handleSaveUserRolesAndPermissions = async () => {
    if (userId === null) {
      showAlert('Kullanıcı seçilmedi.', 'error');
      return;
    }
    if (selectedRoleIds.length === 0) {
      showAlert('Lütfen kullanıcı için en az bir rol seçin.', 'warning');
      setOpenErrorModal(true);
      return;
    }

    setSaving(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      setSaving(false);
      return;
    }

    const assignmentsToSend = rolePermissionsForUser.filter(assignment =>
        selectedRoleIds.includes(assignment.roleId)
    );

    if (!validatePermissionsForSave(assignmentsToSend, allMenusWithOperations)) {
        setSaving(false);
        return;
    }

    try {
      const success = await saveUserRolesAndPermissions(userId, assignmentsToSend);

      if (success) {
        showAlert('Kullanıcı rolleri ve izinleri başarıyla güncellendi!', 'success');
        onClose();
      } else {
        showAlert('Kullanıcı rolleri ve izinleri güncellenirken bir hata oluştu.', 'error');
      }
    } catch (error: any) {
      console.error("Error saving user roles and permissions:", error);
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 400) {
            setOpenErrorModal(true);
        } else if (error.response && error.response.status === 401) {
            localStorage.removeItem('authToken');
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
        } else {
            
        }
      } else {
          showAlert('Rol izinleri kaydedilirken beklenmeyen bir hata oluştu، lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };


  // ------------------------------------------------------------------------------------------
  // ✨ کامپوننت رندر کننده منوها و عملیات‌ها برای یک رول خاص
  // ------------------------------------------------------------------------------------------

  const renderMenuItemsForRole = (currentRoleId: string, menuItems: MenuItemType[], level: number = 0) => { // 🌟 تغییر: currentRoleId به string
    const currentRoleAssignment = rolePermissionsForUser.find(assignment => assignment.roleId === currentRoleId);
    const currentRoleMenuPermissions = currentRoleAssignment ? currentRoleAssignment.permissions : {};

    return (
      <List component="div" disablePadding sx={{ pl: level * 2 }}>
        {menuItems.map((menu) => {
          const isMenuChecked = !!currentRoleMenuPermissions[menu.id];
          const isParentMenu = !!menu.children && menu.children.length > 0;

          const getIndeterminateStatus = (currentMenu: MenuItemType): boolean => {
              if (!currentMenu.children || currentMenu.children.length === 0) {
                  return false;
              }
              const allChildIds = getAllChildMenuAndOperationIds(currentMenu).menuIds;
              const selectedChildCount = allChildIds.filter(id => currentRoleMenuPermissions[id]).length;

              return selectedChildCount > 0 && selectedChildCount < allChildIds.length;
          }

          const isIndeterminate = isParentMenu ? getIndeterminateStatus(menu) : false;


          return (
            <React.Fragment key={menu.id}>
              {isParentMenu ? (
                <Accordion
                  expanded={(expandedMenusForRole[currentRoleId] || []).includes(menu.id)}
                  onChange={handleAccordionChangeForMenu(currentRoleId, menu.id)}
                  sx={{
                    width: '100%', boxShadow: 'none', borderRadius: 0,
                    '&:before': { display: 'none' },
                    borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                    '&:first-of-type': { borderTop: 'none' }, margin: '0 !important',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<IconChevronDown />}
                    aria-controls={`${menu.id}-content`} id={`${menu.id}-header`}
                    sx={{
                        padding: '0 16px', minHeight: '48px !important',
                        '&.Mui-expanded': { minHeight: '48px !important', },
                        '& .MuiAccordionSummary-content': { margin: '12px 0 !important', },
                        borderBottom: (theme) => ((expandedMenusForRole[currentRoleId] || []).includes(menu.id) ? `1px solid ${theme.palette.divider}` : 'none'),
                    }}
                  >
                    <ListItem dense sx={{ width: '100%', padding: 0 }}>
                      <ListItemIcon sx={{ minWidth: 35 }}>
                        <Checkbox
                          edge="start"
                          checked={isMenuChecked}
                          indeterminate={isIndeterminate}
                          onChange={handleToggleMenuAccess(currentRoleId, menu)} // 🌟 تغییر: currentRoleId به string
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText primary={<Typography variant="subtitle1">{menu.name}</Typography>} />
                    </ListItem>
                  </AccordionSummary>
                  <AccordionDetails sx={{ padding: '8px 0 8px 16px' }}>
                    {renderMenuItemsForRole(currentRoleId, menu.children || [], level + 1)}
                  </AccordionDetails>
                </Accordion>
              ) : (
                <ListItem dense sx={{ py: 0.5, borderBottom: '1px dashed #eee' }}>
                  <ListItemIcon sx={{ minWidth: 35 }}>
                    <Checkbox
                      edge="start"
                      checked={isMenuChecked}
                      onChange={handleToggleMenuAccess(currentRoleId, menu)} // 🌟 تغییر: currentRoleId به string
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={menu.name} />
                  {/* چک‌باکس‌ها برای عملیات‌ها */}
                  <FormGroup row sx={{ ml: 2, flexWrap: 'wrap' }}>
                    {menu.availableOperations.map(op => (
                      <CustomTooltip key={`op-tooltip-${op.id}`} title={isTooltipGloballyEnabled ? op.name : ""}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={currentRoleMenuPermissions[menu.id]?.includes(op.id) || false}
                              onChange={handleToggleOperation(currentRoleId, menu.id, op.id)} // 🌟 تغییر: currentRoleId به string
                            />
                          }
                          label={<Typography variant="caption">{op.name}</Typography>}
                          sx={{ mr: 1 }}
                        />
                      </CustomTooltip>
                    ))}
                  </FormGroup>
                </ListItem>
              )}
            </React.Fragment>
          );
        })}
      </List>
    );
  };

  return (
    <>
      <Dialog fullScreen open={openRoleModal} onClose={onClose} TransitionComponent={Transition}>
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <CustomTooltip title={isTooltipGloballyEnabled ? "Kapat" : ""}>
              <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                <IconX width={24} height={24} />
              </IconButton>
            </CustomTooltip>
            <Typography ml={2} flex={1} variant="h6" component="div">
              Kullanıcı Rol ve İzinlerini Yönet
            </Typography>
            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen izinleri kaydet" : ""}>
              <span> {/* Wrapper span */}
                <Button autoFocus color="inherit" onClick={handleSaveUserRolesAndPermissions} disabled={loading || saving || selectedRoleIds.length === 0}>
                  {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
                </Button>
              </span>
            </CustomTooltip>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ p: 0, display: 'flex', height: '100%', maxHeight: 'calc(100vh - 64px)' }}>
          {/* ستون چپ: لیست رول‌ها */}
          <Box sx={{ width: '25%', flexShrink: 0, borderRight: '1px solid #e0e0e0', height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" mb={2} sx={{ p: 2, pb: 0 }}>Roller</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : (
              <List dense sx={{ py: 0 }}>
                {allRoles.length === 0 ? (
                  <Typography color="textSecondary" sx={{ p: 2 }}>Hiç rol bulunamadı.</Typography>
                ) : (
                  allRoles.map(role => (
                    <ListItem
                      key={role.id}
                      onClick={handleListItemClick(role.id)} 
                      selected={selectedRoleIds.includes(role.id)}
                      sx={{
                        borderRadius: 0,
                        '&.Mui-selected': {
                          borderRadius: 0,
                          backgroundColor: (theme) => `${theme.palette.primary.light} !important`,
                        },
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <ListItemIcon>
                          <Checkbox
                              edge="start"
                              checked={selectedRoleIds.includes(role.id)}
                              onChange={handleToggleRoleSelection(role.id)}
                              tabIndex={-1}
                              disableRipple
                              onClick={(e) => e.stopPropagation()}
                          />
                      </ListItemIcon>
                      <ListItemText primary={role.name} />
                    </ListItem>
                  ))
                )}
              </List>
            )}
          </Box>

          {/* ستون راست: دسترسی‌های منو و عملیات */}
          <Box sx={{ width: '75%', p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" mb={2}>Menü ve Operasyon İzinleri</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : selectedRoleIds.length === 0 ? (
              <Typography color="textSecondary">Lütfen izinlerini yönetmek için en az bir rol seçin.</Typography>
            ) : (
              <Box>
                {selectedRoleIds.map(roleId => {
                    const role = allRoles.find(r => r.id === roleId);
                    if (!role) return null;

                    const currentRoleAssignment = rolePermissionsForUser.find(a => a.roleId === roleId);
                    const currentRoleMenuPermissions = currentRoleAssignment ? currentRoleAssignment.permissions : {};

                    const isAllMenusSelectedForRole = (() => {
                        if (allMenusWithOperations.length === 0) return false;
                        let allOperationsAreTicked = true;
                        allMenusWithOperations.forEach(menu => {
                            const { menuIds } = getAllChildMenuAndOperationIds(menu);
                            menuIds.forEach(id => {
                                const currentMenu = findMenuItemById(allMenusWithOperations, id);
                                if (currentMenu) {
                                    const selectedOpsForThisMenu = currentRoleMenuPermissions[id] || [];
                                    const allAvailableOpsForMenu = currentMenu.availableOperations.map(op => op.id);
                                    if (selectedOpsForThisMenu.length !== allAvailableOpsForMenu.length ||
                                        !allAvailableOpsForMenu.every(opId => selectedOpsForThisMenu.includes(opId))) {
                                        allOperationsAreTicked = false;
                                    }
                                }
                            });
                        });
                        return allOperationsAreTicked && Object.keys(currentRoleMenuPermissions).length === getCountOfSelectableItems(allMenusWithOperations);
                    })();

                    const isAnyMenuSelectedForRole = Object.keys(currentRoleMenuPermissions).length > 0;

                    return (
                        <Accordion
                            key={`role-accordion-${role.id}`}
                            expanded={expandedRoleAccordions.includes(role.id)}
                            onChange={handleToggleRoleAccordion(role.id)}
                            sx={{
                                width: '100%', boxShadow: 'none', borderRadius: 0,
                                '&:before': { display: 'none' },
                                border: '1px solid rgba(0, 0, 0, 0.12)',
                                mb: 1,
                            }}
                        >
                            <AccordionSummary expandIcon={<IconChevronDown />}>
                                <Typography variant="h6">{role.name} İzinleri</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
                                <CustomTooltip title={isTooltipGloballyEnabled ? (isAllMenusSelectedForRole ? "Bu rol için tüm izinleri kaldır" : "Bu rol için tüm menü ve tüm operasyon izinlerini seç") : ""}>
                                    <ListItem
                                        button
                                        onClick={handleSelectAllPermissionsForRole(role.id)}
                                        sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)', mb: 2 }}
                                    >
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={isAllMenusSelectedForRole}
                                                indeterminate={isAnyMenuSelectedForRole && !isAllMenusSelectedForRole}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <ListItemText primary="Tümünü Seç/Kaldır" />
                                    </ListItem>
                                </CustomTooltip>

                                {renderMenuItemsForRole(role.id, allMenusWithOperations)}
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openErrorModal}
        onClose={() => setOpenErrorModal(false)}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
      >
        <DialogTitle id="error-dialog-title">{"Rol Seçim Hatası"}</DialogTitle>
        <DialogContent>
          <Typography id="error-dialog-description">
            Kullanıcı için mutlaka bir rol seçilmelidir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenErrorModal(false)} color="primary" autoFocus>
            Anladım.
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ListUsersModal;