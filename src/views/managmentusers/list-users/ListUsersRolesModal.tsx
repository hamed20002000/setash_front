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
  CircularProgress,
  Box,
  DialogContent,
  DialogTitle,
  DialogActions,
  Chip,
  Stack,
  Checkbox
} from '@mui/material';
import Slide from '@mui/material/Slide';
import { IconX } from '@tabler/icons-react';
import { TransitionProps } from '@mui/material/transitions';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';

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
  id: string;
  name: string;
  url: string;
  depth: number;
  order: number;
  recordStatus: number;
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
      if (item.menus && item.menus.length > 0) {
        mappedItem.children = mapApiMenuToModalMenuItem(item.menus);
      }
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
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); }
    return [];
  }
};

export const fetchAllMenusRaw = async (): Promise<MenuApiRawItem[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) { return []; }
  try {
    const response = await axios.get(server.baseurl + server.baseinfo + 'get-menus', { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
    if (response.data.success && response.data.data) { return response.data.data as MenuApiRawItem[]; }
    return [];
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); }
    return [];
  }
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
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); }
    return [];
  }
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
    if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); }
    return [];
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
            }
          }
        });
      }
      return permissionsMap;
    }
    return null;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); }
    return null;
  }
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
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) { localStorage.removeItem('authToken'); }
    throw error;
  }
};

const ListUsersModal = ({ openRoleModal, onClose, userId, showAlert }: Props) => {
  const navigate = useNavigate();
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loadedRolePermissions, setLoadedRolePermissions] = useState<{ [roleId: string]: RolePermissionsData }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [openErrorModal, setOpenErrorModal] = useState<boolean>(false);
  const [allMenusRaw, setAllMenusRaw] = useState<MenuApiRawItem[]>([]);
  const [allMenusMapped, setAllMenusMapped] = useState<MenuItemType[]>([]);
  const { isTooltipGloballyEnabled } = useTooltip();
  const [activeDisplayRoleId, setActiveDisplayRoleId] = useState<string | null>(null);

  const fetchAllData = useCallback(async (currentUserId: string) => {
    setLoading(true);
    try {
      const [roles, rawMenus, assignedRoleIds] = await Promise.all([
        fetchAllRoles(),
        fetchAllMenusRaw(),
        fetchUserAssignedRoles(currentUserId)
      ]);
      setAllRoles(roles);
      setAllMenusRaw(rawMenus);
      setAllMenusMapped(mapApiMenuToModalMenuItem(rawMenus));
      setSelectedRoleIds(assignedRoleIds);
      const permissionsPromises = assignedRoleIds.map(roleId => fetchRolePermissions(roleId, rawMenus));
      const permissionsResults = await Promise.all(permissionsPromises);
      const permissionsMap = permissionsResults.reduce((acc, curr, index) => {
        if (curr) {
          acc[assignedRoleIds[index]] = curr;
        }
        return acc;
      }, {} as { [roleId: string]: RolePermissionsData });
      setLoadedRolePermissions(permissionsMap);
      if (assignedRoleIds.length > 0) {
        setActiveDisplayRoleId(assignedRoleIds[0]);
      } else {
        setActiveDisplayRoleId(null);
      }
    } catch (err: any) {
      console.log("Failed to load data for modal:", err);
      showAlert('Modül verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    if (openRoleModal && userId) {
      fetchAllData(userId);
    } else if (!openRoleModal) {
      setAllRoles([]);
      setSelectedRoleIds([]);
      setLoadedRolePermissions({});
      setLoading(false);
      setSaving(false);
      setOpenErrorModal(false);
      setAllMenusRaw([]);
      setAllMenusMapped([]);
      setActiveDisplayRoleId(null);
    }
  }, [openRoleModal, userId, fetchAllData]);

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
      }
      if (activeDisplayRoleId === roleId) {
        setActiveDisplayRoleId(newSelectedIds.length > 0 ? newSelectedIds[0] : null);
      } else if (activeDisplayRoleId === null && newSelectedIds.length > 0) {
        setActiveDisplayRoleId(newSelectedIds[0]);
      }
      return newSelectedIds;
    });
  }, [allMenusRaw, activeDisplayRoleId]);

  const handleSaveUserRolesAndPermissions = async () => {
    if (!userId) {
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
          showAlert('Roller kaydedilirken beklenmeyen bir hata oluştu، lütfen tekrar deneyin.', 'error');
        }
      } else {
        showAlert('Roller kaydedilirken beklenmeyen bir hata oluştu، lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderPermissionsForActiveRole = (activeRoleId: string | null) => {
    if (!activeRoleId) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography color="textSecondary">Lütfen izinlerini görüntülemek için soldan bir rol seçin.</Typography>
        </Box>
      );
    }

    const currentRoleMenuOperationsMap = loadedRolePermissions[activeRoleId];
    const isLoadingPermissions = currentRoleMenuOperationsMap === undefined;

    if (isLoadingPermissions) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    if (!currentRoleMenuOperationsMap || Object.keys(currentRoleMenuOperationsMap).length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <Typography variant="body2" color="textSecondary">Bu rol için henüz izin atanmamış.</Typography>
        </Box>
      );
    }

    const renderOperations = (operations: MenuOperation[], menuOperationsForThisMenu: string[]) => (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {operations.map(op => {
          const isOperationChecked = menuOperationsForThisMenu.includes(op.id);
          return (
            <Chip
              key={`op-${op.id}`}
              label={op.systemOperation.name}
              icon={isOperationChecked ? <DoneIcon /> : <CloseIcon />}
              color={isOperationChecked ? "success" : "error"}
              variant="outlined"
              size="small"
            />
          );
        })}
      </Stack>
    );

    const renderMenuTree = (menuItems: MenuItemType[], level: number = 0) => {
      return (
        <List component="div" disablePadding>
          {menuItems.map((menu) => {
            const menuOperationsForThisMenu = currentRoleMenuOperationsMap[menu.id] || [];
            const isParentMenu = !!menu.children && menu.children.length > 0;
            const hasOperations = menu.availableOperations.length > 0;

            return (
              <React.Fragment key={menu.id}>
                <ListItem
                  dense
                  sx={{
                    py: 1,
                    pr: 2,
                    pl: `calc(16px + ${level * 16}px)`,
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" color="text.primary">
                        {menu.name}
                      </Typography>
                    }
                    sx={{ flexShrink: 0 }}
                  />
                  {hasOperations && (
                    <Box sx={{ flexShrink: 1, ml: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      {renderOperations(menu.availableOperations, menuOperationsForThisMenu)}
                    </Box>
                  )}
                </ListItem>
                {isParentMenu && renderMenuTree(menu.children || [], level + 1)}
              </React.Fragment>
            );
          })}
        </List>
      );
    };
    return renderMenuTree(allMenusMapped);
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
                      onClick={() => setActiveDisplayRoleId(role.id)}
                      selected={activeDisplayRoleId === role.id}
                      sx={{
                        borderRadius: 0,
                        '&.Mui-selected': {
                          backgroundColor: (theme) => `${theme.palette.primary.light} !important`,
                          borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
                        },
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Checkbox
                          edge="start"
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={handleToggleRoleSelection(role.id)}
                          tabIndex={-1}
                          disableRipple
                          onClick={(e) => e.stopPropagation()}
                        />
                        <ListItemText primary={role.name} />
                      </Box>
                    </ListItem>
                  ))
                )}
              </List>
            )}
          </Box>

          <Box sx={{ width: { xs: '100%', sm: '65%', md: '75%' }, p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" mb={2}>
              {activeDisplayRoleId
                ? `'${allRoles.find(r => r.id === activeDisplayRoleId)?.name || 'Bu rol'}' için İzinler`
                : 'İzin Görüntüleme Paneli'}
            </Typography>
            <Box sx={{ mb: 2 }}>
              {selectedRoleIds.map(roleId => {
                const role = allRoles.find(r => r.id === roleId);
                if (!role) return null;
                return (
                  <Chip
                    key={roleId}
                    label={role.name}
                    variant={activeDisplayRoleId === roleId ? 'filled' : 'outlined'}
                    color={activeDisplayRoleId === roleId ? 'primary' : 'default'}
                    onClick={() => setActiveDisplayRoleId(roleId)}
                    sx={{ mr: 1, mb: 1, cursor: 'pointer' }}
                  />
                );
              })}
            </Box>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
              </Box>
            ) : (
              renderPermissionsForActiveRole(activeDisplayRoleId)
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