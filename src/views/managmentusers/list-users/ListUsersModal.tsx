// ListUsersModal.tsx
import React, { useEffect, useState, useCallback } from 'react';
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
// 🌟🌟🌟🌟🌟 توابع API (تغییر در fetchUserRolesAndPermissions) 🌟🌟🌟🌟🌟
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
        availableOperations: item.menuOperations.map((op: any) => ({ id: op.systemOperation.id, name: op.systemOperation.name, })),
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
      // 🟢 تغییر در اینجا: فیلتر کردن بر اساس recordStatus === 0
      return response.data.data
        .filter((item: any) => item.recordStatus === 0) // <--- این خط اضافه شد
        .map((item: any) => ({ id: item.id, name: item.name })) as RoleType[];
    }
    console.warn('Rol listesi alınırken bir hata oluştu.', response.data); return [];
  } catch (error: any) { console.error("Error fetching all roles:", error); if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return []; }
};

// 🔴 تغییر: این تابع حالا از API `get-user-with-role-and-operations/{userId}` استفاده می‌کند
// و نقش‌های اختصاص یافته و دسترسی‌های پیش‌فرض آن‌ها را برای نمایش برمی‌گرداند.
export const fetchUserRolesAndPermissions = async (userId: string): Promise<{
  assignedRoleIds: string[],
  rolePermissions: RolePermissionAssignment[]
}> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { console.warn("No auth token found for user roles and operations."); return { assignedRoleIds: [], rolePermissions: [] }; }
  try {
    const response = await axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${userId}`, {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    });
    if (response.data.success && response.data.data) {
      const userRoles = response.data.data.userRoles || []; // آرایه نقش‌های کاربر
      const assignedRoleIds = userRoles.map((ur: any) => ur.role.id) as string[]; // ID نقش‌ها

      // اگر API دسترسی‌های منو/عملیات پیش‌فرض هر نقش را در اینجا برمی‌گرداند (مثلاً در userRoles[i].role.permissions)
      // باید آن را نیز نگاشت کنید. فعلاً فرض می‌کنیم این اطلاعات از API `get-user-roles-and-permissions` می‌آمد
      // و این API (get-user-with-role-and-operations) فقط نقش‌ها را می‌دهد.
      // اگر userMenuOperations دسترسی‌های خاص کاربر را نمایش می‌دهد، می‌توانید از آن استفاده کنید.
      // برای هدف "فقط نمایش دسترسی‌های پیش‌فرض رول"، این بخش را ساده نگه می‌داریم.
      const rolePermissions: RolePermissionAssignment[] = userRoles.map((ur: any) => ({
        roleId: ur.role.id,
        // فرض می‌کنیم دسترسی‌های پیش‌فرض رول از جای دیگری واکشی شده یا در اینجا موجود نیست.
        // در غیر این صورت، این اطلاعات باید از یک API دیگر برای هر رول واکشی شود.
        // برای این کامپوننت که فقط نمایش می‌دهد، این قسمت را فعلاً با آبجکت خالی پر می‌کنیم
        // تا زمانی که یک API برای 'default_permissions_for_role_X' داشته باشیم.
        permissions: ur.role.defaultMenuOperations || {} // اگر بک‌اند شما defaultMenuOperations را برمی‌گرداند
      }));

      return { assignedRoleIds, rolePermissions };
    }
    console.warn('API response for user roles and operations was not successful or data was empty.', response.data);
    return { assignedRoleIds: [], rolePermissions: [] };
  } catch (error: any) { console.error(`Error fetching user roles and operations for userId ${userId}:`, error); if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return { assignedRoleIds: [], rolePermissions: [] }; }
};


export const saveUserRolesAndPermissions = async (userId: string, selectedRoleIds: string[]): Promise<boolean> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { console.warn("No auth token found for saving user roles."); return false; }
  try {
    const roleIdsAsNumbers = selectedRoleIds.map(id => Number(id));
    debugger
    const payload = { UserId: userId, roleIds: roleIdsAsNumbers };
    const response = await axios.post(`${server.baseurl}${server.user}assign-user-roles`, payload, {
      headers: { "Accept": "application/json", 'Content-Type': 'application/json', "Authorization": `Bearer ${authToken}` }
    });
    return response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201;
  } catch (error: any) { console.error(`Error saving user roles for userId ${userId}:`, error); if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } throw error; }
};

// ==============================================================================================


const ListUsersModal = ({ openRoleModal, onClose, userId, showAlert }: Props) => {
  const navigate = useNavigate();
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [rolePermissionsForUser, setRolePermissionsForUser] = useState<RolePermissionAssignment[]>([]);

  const [expandedRoleAccordions, setExpandedRoleAccordions] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [openErrorModal, setOpenErrorModal] = useState<boolean>(false);
  const [expandedMenusForRole, setExpandedMenusForRole] = useState<{ [roleId: string]: string[] }>({});
  const [allMenusWithOperations, setAllMenusWithOperations] = useState<MenuItemType[]>([]);

  const { isTooltipGloballyEnabled } = useTooltip();

  // const VIEW_OPERATION_ID = '35';

  // ------------------------------------------------------------------------------------------
  // ✨ Effect برای لود کردن رول‌ها، تمام منوها و دسترسی‌های اولیه کاربر
  // ------------------------------------------------------------------------------------------
  useEffect(() => {
    if (openRoleModal && userId !== null) {
      setLoading(true);
      Promise.all([
        fetchAllRoles(),
        fetchAllMenusWithOperations(),
        // 🔴 از تابع API به‌روز شده استفاده کنید
        fetchUserRolesAndPermissions(userId)
      ])
        .then(([roles, menus, { assignedRoleIds, rolePermissions }]) => { // 🔴 تغییر در اینجا برای گرفتن assignedRoleIds و rolePermissions
          setAllRoles(roles);
          setSelectedRoleIds(assignedRoleIds); // 🔴 از assignedRoleIds جدید استفاده کنید
          setRolePermissionsForUser(rolePermissions); // 🔴 دسترسی‌های پیش‌فرض رول را برای نمایش تنظیم کنید
          setAllMenusWithOperations(menus);
          setLoading(false);

          setExpandedRoleAccordions(assignedRoleIds); // 🔴 باز کردن آکاردئون رول‌های اختصاص یافته
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
  }, [openRoleModal, userId, navigate, showAlert]);

  // ------------------------------------------------------------------------------------------
  // ✨ هندلرها برای انتخاب رول در ستون چپ (این بخش فعال باقی می‌ماند)
  // ------------------------------------------------------------------------------------------

  const handleToggleRoleSelection = useCallback((roleId: string) => () => {
    setSelectedRoleIds(prevSelectedIds => {
      const currentIndex = prevSelectedIds.indexOf(roleId);
      let newSelectedIds: string[];

      if (currentIndex === -1) {
        newSelectedIds = [...prevSelectedIds, roleId];
        // 🔴 اگر در اینجا نیاز به بارگذاری دسترسی‌های پیش‌فرض یک رول جدید انتخاب شده دارید،
        // باید یک فراخوانی API جداگانه برای `get-role-with-operations/{roleId}` انجام دهید
        // و نتیجه را به `rolePermissionsForUser` اضافه کنید.
        // اما چون این کامپوننت فقط "نمایشی" است، فعلاً این کار را نمی‌کنیم.
      } else {
        newSelectedIds = prevSelectedIds.filter(id => id !== roleId);
        // 🔴 هنگام حذف رول، دسترسی‌های آن را از `rolePermissionsForUser` نیز حذف کنید
        // تا در نمایش سمت راست حذف شوند.
        setRolePermissionsForUser(prevPerms => prevPerms.filter(p => p.roleId !== roleId));
      }
      return newSelectedIds;
    });
  }, []);

  const handleToggleRoleAccordion = useCallback((roleId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    // از event.stopPropagation() استفاده کنید اگر نمی‌خواهید کلیک به عناصر والد منتقل شود
    event.stopPropagation(); // جلوگیری از انتشار کلیک به آیتم لیست والد
    setExpandedRoleAccordions(prev => {
      if (isExpanded) {
        return Array.from(new Set([...prev, roleId]));
      } else {
        return prev.filter(id => id !== roleId);
      }
    });
  }, []);


  const handleListItemClick = useCallback((roleId: string) => (event: React.MouseEvent<HTMLLIElement>) => {
    setExpandedRoleAccordions(prev => {
      console.log(event)
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        return Array.from(new Set([...prev, roleId]));
      }
    });
  }, []);

  // ------------------------------------------------------------------------------------------
  // ✨ توابع کمکی برای نمایش منوها و عملیات‌ها (فقط برای نمایش، بدون منطق تغییر)
  // ------------------------------------------------------------------------------------------

  const findMenuItemById = useCallback((menus: MenuItemType[], id: string): MenuItemType | undefined => {
    for (const menu of menus) {
      if (menu.id === id) return menu;
      if (menu.children) {
        const found = findMenuItemById(menu.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }, []);

  const getAllChildMenuAndOperationIds = useCallback((menu: MenuItemType): { menuIds: string[], operationIds: string[] } => {
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
  }, []);

  const handleAccordionChangeForMenu = useCallback((currentRoleId: string, menuId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    event.stopPropagation(); // جلوگیری از انتشار کلیک به Summary آکاردئون والد
    setExpandedMenusForRole(prevExpanded => {
      const newExpanded = { ...prevExpanded };
      const currentRoleExpandedMenus = newExpanded[currentRoleId] || []; // از currentRoleId استفاده کن
      if (isExpanded) {
        newExpanded[currentRoleId] = Array.from(new Set([...currentRoleExpandedMenus, menuId])); // از menuId استفاده کن
      } else {
        newExpanded[currentRoleId] = currentRoleExpandedMenus.filter(p => p !== menuId); // از menuId استفاده کن
      }
      return newExpanded;
    });
  }, []);


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

    try {
      const success = await saveUserRolesAndPermissions(userId, selectedRoleIds);

      if (success) {
        showAlert('Kullanıcı rolleri başarıyla güncellendi!', 'success');
        onClose();
      } else {
        showAlert('Kullanıcı rolleri güncellenirken bir hata oluştu.', 'error');
      }
    } catch (error: any) {
      console.error("Error saving user roles:", error);
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 400) {
          setOpenErrorModal(true);
        } else if (error.response && error.response.status === 401) {
          localStorage.removeItem('authToken');
          navigate("/");
          showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
        } else {
          showAlert('Roller kaydedilirken beklenmeyen bir hata oluştu، lütfen tekrar deneyin.', 'error');
        }
      } else {
        showAlert('Roller kaydedilirken beklenmeyen bir hata oluştu، lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------------------------------
  // ✨ کامپوننت رندر کننده منوها و عملیات‌ها برای یک رول خاص (فقط نمایشی)
  // ------------------------------------------------------------------------------------------

  const renderMenuItemsForRole = (currentRoleId: string, menuItems: MenuItemType[], level: number = 0) => {
    const currentRoleAssignment = rolePermissionsForUser.find(assignment => assignment.roleId === currentRoleId);
    const currentRoleMenuPermissions = currentRoleAssignment ? currentRoleAssignment.permissions : {};

    return (
      <List component="div" disablePadding sx={{ pl: level * 2 }}>
        {menuItems.map((menu) => {
          const isMenuChecked = !!currentRoleMenuPermissions[menu.id];
          const isParentMenu = !!menu.children && menu.children.length > 0;

          const getIndeterminateStatus = (currentMenu: MenuItemType): boolean => {
            if (!currentMenu.children || currentMenu.children.length === 0) return false;

            let allChildMenusSelected = true;
            let anyChildMenuSelected = false;

            currentMenu.children.forEach(child => {
              const childHasPermission = !!currentRoleMenuPermissions[child.id];
              if (childHasPermission) {
                anyChildMenuSelected = true;
              } else {
                allChildMenusSelected = false;
              }
              if (getIndeterminateStatus(child)) {
                anyChildMenuSelected = true;
              }
            });

            return anyChildMenuSelected && !allChildMenusSelected;
          };

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
                          tabIndex={-1}
                          disableRipple
                          disabled // 🔴 غیرفعال شده: فقط نمایشی
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
                      tabIndex={-1}
                      disableRipple
                      disabled // 🔴 غیرفعال شده: فقط نمایشی
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
                              disabled // 🔴 غیرفعال شده: فقط نمایشی
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
            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen rolleri kaydet" : ""}>
              <span>
                <Button autoFocus color="inherit" onClick={handleSaveUserRolesAndPermissions} disabled={loading || saving || selectedRoleIds.length === 0}>
                  {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
                </Button>
              </span>
            </CustomTooltip>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ p: 0, display: 'flex', height: '100%', maxHeight: 'calc(100vh - 64px)' }}>
          {/* ستون چپ: لیست رول‌ها (انتخابی) */}
          <Box sx={{ width: { xs: '100%', sm: '35%', md: '25%' }, flexShrink: 0, borderRight: '1px solid #e0e0e0', height: '100%', overflowY: 'auto' }}>
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

          {/* ستون راست: دسترسی‌های منو و عملیات (فقط نمایشی) */}
          <Box sx={{ width: { xs: '100%', sm: '65%', md: '75%' }, p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" mb={2}>Menü ve Operasyon İzinleri (Sadece Görüntülenebilir)</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : selectedRoleIds.length === 0 ? (
              <Typography color="textSecondary">Lütfen izinlerini görüntülemek için soldan bir rol seçin.</Typography>
            ) : (
              <Box>
                {selectedRoleIds.map(roleId => {
                  const role = allRoles.find(r => r.id === roleId);
                  if (!role) return null;

                  // const currentRoleAssignment = rolePermissionsForUser.find(a => a.roleId === roleId);
                  // const currentRoleMenuPermissions = currentRoleAssignment ? currentRoleAssignment.permissions : {};

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