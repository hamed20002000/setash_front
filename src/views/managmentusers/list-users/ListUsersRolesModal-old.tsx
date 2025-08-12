// src/views/users/ListUsersModal.tsx

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
interface SystemOperation {
  id: string;
  name: string;
  recordStatus: number;
}

interface MenuOperation {
  id: string;
  recordStatus: number;
  systemOperation: SystemOperation;
}
interface MenuApiRawItem {
  id: string; name: string; url: string; depth: number; order: number; recordStatus: number;
  menuOperations: MenuOperation[];
  menus: MenuApiRawItem[];
  parent?: any;
}
interface MenuItemType {
  id: string;
  name: string;
  url?: string;
  children?: MenuItemType[];
  availableOperations: MenuOperation[];
}

interface RolePermissionsData {
  [menuId: string]: string[];
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

const mapApiMenuToModalMenuItem = (apiMenus: MenuApiRawItem[]): MenuItemType[] => {
  return apiMenus
    .filter((item: MenuApiRawItem) => item.recordStatus === 0)
    .sort((a: MenuApiRawItem, b: MenuApiRawItem) => a.order - b.order)
    .map((item: MenuApiRawItem) => {
      const mappedItem: MenuItemType = {
        id: String(item.id),
        name: item.name,
        url: item.url === '#' ? undefined : item.url,
        availableOperations: item.menuOperations.filter(mo => mo.recordStatus === 0 && mo.systemOperation?.recordStatus === 0),
      };
      if (item.menus && item.menus.length > 0) { mappedItem.children = mapApiMenuToModalMenuItem(item.menus); }
      return mappedItem;
    });
};

export const fetchAllMenusAsMappedItems = async (): Promise<MenuItemType[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { return []; }
  try {
    const response = await axios.get(server.baseurl + server.baseinfo + 'get-menus', { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
    if (response.data.success && response.data.data) { return mapApiMenuToModalMenuItem(response.data.data as MenuApiRawItem[]); }
    return [];
  } catch (error: any) { if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return []; }
};

export const fetchAllMenusRaw = async (): Promise<MenuApiRawItem[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { return []; }
  try {
    const response = await axios.get(server.baseurl + server.baseinfo + 'get-menus', { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
    if (response.data.success && response.data.data) { return response.data.data as MenuApiRawItem[]; }
    return [];
  } catch (error: any) { if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return []; }
};


export const fetchAllRoles = async (): Promise<RoleType[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { return []; }
  try {
    const response = await axios.get(server.baseurl + server.user + "get-roles", { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
    if (response.data.httpStatusCode === 200) {
      return response.data.data
        .filter((item: any) => item.recordStatus === 0)
        .map((item: any) => ({ id: String(item.id), name: item.name })) as RoleType[];
    }
    return [];
  } catch (error: any) { if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return []; }
};

export const fetchUserAssignedRoles = async (userId: string): Promise<string[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { return []; }
  try {
    const response = await axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${userId}`, {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    });
    if (response.data.success && response.data.data) {
      const userRoles = response.data.data.userRoles || [];
      return userRoles.map((ur: any) => String(ur.role.id)) as string[];
    }
    return [];
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return [];
  }
};
export const fetchRolePermissions = async (roleId: string, rawMenus: MenuApiRawItem[]): Promise<RolePermissionsData | null> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { return null; }
  try {
    const response = await axios.get(`${server.baseurl}${server.user}get-role-with-operations/${roleId}`, {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    });

    if (response.data.httpStatusCode === 200 && response.data.data && response.data.data.roleMenuOperations) {
      const roleData = response.data.data;
      const permissionsMap: RolePermissionsData = {};
      const findMenuIdByMenuOperationIdLocal = (
        menusToSearch: MenuApiRawItem[],
        targetMenuOpId: string
      ): string | null => {
        for (const m of menusToSearch) {
          if (m.menuOperations.some(op => String(op.id) === targetMenuOpId && op.recordStatus === 0)) {
            return String(m.id);
          }
          if (m.menus && m.menus.length > 0) {
            const foundInChild = findMenuIdByMenuOperationIdLocal(m.menus, targetMenuOpId);
            if (foundInChild) return foundInChild;
          }
        }
        return null;
      };

      if (Array.isArray(roleData.roleMenuOperations)) {
        roleData.roleMenuOperations.forEach((roleMenuOpItem: any) => {
          if (roleMenuOpItem.recordStatus === 0 && roleMenuOpItem.menuOperation && roleMenuOpItem.menuOperation.recordStatus === 0) {
            const menuOpId = String(roleMenuOpItem.menuOperation.id);
            const menuIdForOperation = findMenuIdByMenuOperationIdLocal(rawMenus, menuOpId);
            if (menuIdForOperation) {
              if (!permissionsMap[menuIdForOperation]) {
                permissionsMap[menuIdForOperation] = [];
              }
              permissionsMap[menuIdForOperation].push(menuOpId);
            } else {
            }
          }
        });
      }
      return permissionsMap;

    }
    return null;
  } catch (error: any) { if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } return null; }
};


export const saveUserRolesAndPermissions = async (userId: string, selectedRoleIds: string[]): Promise<boolean> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { return false; }
  try {
    const roleIdsAsNumbers = selectedRoleIds.map(id => Number(id));
    const payload = { UserId: userId, roleIds: roleIdsAsNumbers };
    const response = await axios.post(`${server.baseurl}${server.user}assign-user-roles`, payload, {
      headers: { "Accept": "application/json", 'Content-Type': 'application/json', "Authorization": `Bearer ${authToken}` }
    });
    return response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201;
  } catch (error: any) { if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); } throw error; }
};
const ListUsersModal = ({ openRoleModal, onClose, userId, showAlert }: Props) => {
  const navigate = useNavigate();
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loadedRolePermissions, setLoadedRolePermissions] = useState<{ [roleId: string]: RolePermissionsData }>({});
  const [expandedRoleAccordions, setExpandedRoleAccordions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [openErrorModal, setOpenErrorModal] = useState<boolean>(false);
  const [expandedMenusForRole, setExpandedMenusForRole] = useState<{ [roleId: string]: string[] }>({});
  const [allMenusRaw, setAllMenusRaw] = useState<MenuApiRawItem[]>([]);
  const [allMenusMapped, setAllMenusMapped] = useState<MenuItemType[]>([]);
  const { isTooltipGloballyEnabled } = useTooltip();
  const findMenuInRawTreePure = useCallback((menus: MenuApiRawItem[], menuId: string): MenuApiRawItem | undefined => {
    for (const menu of menus) {
      if (String(menu.id) === menuId) {
        return menu;
      }
      if (menu.menus && menu.menus.length > 0) {
        const found = findMenuInRawTreePure(menu.menus, menuId);
        if (found) return found;
      }
    }
    return undefined;
  }, []);


  useEffect(() => {
    if (openRoleModal && userId !== null) {
      setLoading(true);
      Promise.all([
        fetchAllRoles(),
        fetchAllMenusRaw(),
        fetchUserAssignedRoles(userId)
      ])
        .then(async ([roles, rawMenus, assignedRoleIds]) => {
          setAllMenusRaw(rawMenus);
          setAllMenusMapped(mapApiMenuToModalMenuItem(rawMenus));
          setAllRoles(roles);
          setSelectedRoleIds(assignedRoleIds);
          setLoading(false);
          setExpandedRoleAccordions(assignedRoleIds);
          for (const roleId of assignedRoleIds) {
            const permissions = await fetchRolePermissions(roleId, rawMenus);
            if (permissions) {
              setLoadedRolePermissions(prev => ({ ...prev, [roleId]: permissions }));
            }
          }
        })
        .catch(err => {
          console.log("Failed to load data for modal:", err);
          showAlert('Modül verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyین.', 'error');
          setLoading(false);
        });
    } else if (!openRoleModal) {
      setAllRoles([]);
      setSelectedRoleIds([]);
      setLoadedRolePermissions({});
      setExpandedRoleAccordions([]);
      setLoading(false);
      setSaving(false);
      setOpenErrorModal(false);
      setExpandedMenusForRole({});
      setAllMenusRaw([]);
      setAllMenusMapped([]);
    }
  }, [openRoleModal, userId, navigate, showAlert]);

  const handleToggleRoleSelection = useCallback((roleId: string) => () => {
    setSelectedRoleIds(prevSelectedIds => {
      const currentIndex = prevSelectedIds.indexOf(roleId);
      let newSelectedIds: string[];

      if (currentIndex === -1) {
        newSelectedIds = [...prevSelectedIds, roleId];
        fetchRolePermissions(roleId, allMenusRaw).then(permissions => {
          if (permissions) {
            setLoadedRolePermissions(prev => ({ ...prev, [roleId]: permissions }));
          }
        });
      } else {
        newSelectedIds = prevSelectedIds.filter(id => id !== roleId);
        setLoadedRolePermissions(prev => {
          const newState = { ...prev };
          delete newState[roleId];
          return newState;
        });
        setExpandedRoleAccordions(prev => prev.filter(id => id !== roleId));
      }
      return newSelectedIds;
    });
  }, [allMenusRaw]);
  const handleToggleRoleAccordion = useCallback((roleId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    event.stopPropagation();
    setExpandedRoleAccordions(prev => {
      if (isExpanded) {
        if (!loadedRolePermissions[roleId]) {
          fetchRolePermissions(roleId, allMenusRaw).then(permissions => {
            if (permissions) {
              setLoadedRolePermissions(prevPerms => ({ ...prevPerms, [roleId]: permissions }));
            } else {
              showAlert(`'${allRoles.find(r => r.id === roleId)?.name || 'Bu rol'}' için izinler yüklenemedi.`, 'warning');
            }
          });
        }
        return Array.from(new Set([...prev, roleId]));
      } else {
        return prev.filter(id => id !== roleId);
      }
    });
  }, [loadedRolePermissions, showAlert, allRoles, allMenusRaw]);

  const handleListItemClick = useCallback((roleId: string) => (event: React.MouseEvent<HTMLLIElement>) => {
    console.log(event)
    setExpandedRoleAccordions(prev => {
      const isCurrentlyExpanded = prev.includes(roleId);
      if (isCurrentlyExpanded) {
        return prev.filter(id => id !== roleId);
      } else {
        if (!loadedRolePermissions[roleId]) {
          fetchRolePermissions(roleId, allMenusRaw).then(permissions => { // Pass allMenusRaw
            if (permissions) {
              setLoadedRolePermissions(prevPerms => ({ ...prevPerms, [roleId]: permissions }));
            } else {
              showAlert(`'${allRoles.find(r => r.id === roleId)?.name || 'Bu rol'}' için izinler yüklenemedi.`, 'warning');
            }
          });
        }
        return Array.from(new Set([...prev, roleId]));
      }
    });
  }, [loadedRolePermissions, showAlert, allRoles, allMenusRaw]);
  const handleAccordionChangeForMenu = useCallback((currentRoleId: string, menuId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    event.stopPropagation();
    setExpandedMenusForRole(prevExpanded => {
      const newExpanded = { ...prevExpanded };
      const currentRoleExpandedMenus = newExpanded[currentRoleId] || [];
      if (isExpanded) {
        newExpanded[currentRoleId] = Array.from(new Set([...currentRoleExpandedMenus, menuId]));
      } else {
        newExpanded[currentRoleId] = currentRoleExpandedMenus.filter(p => p !== menuId);
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
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 400) {
          setOpenErrorModal(true);
        } else if (error.response && error.response.status === 401) {
          localStorage.removeItem('authToken');
          navigate("/");
          showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
        } else {
          showAlert('Roller kaydedilirken beklenmeyen bir hata oluştu، lütfen tekrar deneyین.', 'error');
        }
      } else {
        showAlert('Roller kaydedilirken beklenmeyen bir hata oluştu، lütfen tekrar deneyین.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };
  const renderMenuItemsForRole = (currentRoleId: string, menuItems: MenuItemType[], level: number = 0) => {
    const currentRoleMenuOperationsMap = loadedRolePermissions[currentRoleId];
    const isLoadingPermissions = currentRoleMenuOperationsMap === undefined;
    if (isLoadingPermissions) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" py={2}>
          <CircularProgress size={20} sx={{ mr: 1 }} /> <Typography variant="body2">İzinler yükleniyor...</Typography>
        </Box>
      );
    }
    if (!currentRoleMenuOperationsMap || Object.keys(currentRoleMenuOperationsMap).length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" py={2}>
          <Typography variant="body2" color="textSecondary">Bu rol için henüz izin atanmamış.</Typography>
        </Box>
      );
    }
    return (
      <List component="div" disablePadding sx={{ pl: level * 2 }}>
        {menuItems.map((menu) => {
          const menuOperationsForThisMenu = currentRoleMenuOperationsMap[menu.id] || [];
          const isMenuChecked = menuOperationsForThisMenu.length > 0;
          const isParentMenu = !!menu.children && menu.children.length > 0;
          const getIndeterminateStatus = (currentMenu: MenuItemType): boolean => {
            if (!currentMenu.children || currentMenu.children.length === 0) return false;
            let allChildMenusSelected = true;
            let anyChildMenuSelected = false;
            currentMenu.children.forEach(child => {
              const childMenuOperations = currentRoleMenuOperationsMap[child.id] || [];
              const childMenuHasAnyOperationChecked = childMenuOperations.length > 0;
              if (childMenuHasAnyOperationChecked) {
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
                          disabled
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
                      disabled
                    />
                  </ListItemIcon>
                  <ListItemText primary={menu.name} />
                  <FormGroup row sx={{ ml: 2, flexWrap: 'wrap' }}>
                    {menu.availableOperations.map(op => {
                      const isOperationChecked = menuOperationsForThisMenu.includes(op.id);
                      return (
                        <CustomTooltip
                          key={`op-tooltip-${op.id}`}
                          title={isTooltipGloballyEnabled ? op.systemOperation.name : ""}
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={isOperationChecked}
                                disabled
                              />
                            }
                            label={<Typography variant="caption">{op.systemOperation.name}</Typography>}
                            sx={{ mr: 1 }}
                          />
                        </CustomTooltip>
                      );
                    })}
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
                        {renderMenuItemsForRole(role.id, allMenusMapped)}
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