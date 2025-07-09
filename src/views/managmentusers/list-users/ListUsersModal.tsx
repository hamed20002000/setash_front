// ListUsersModal.tsx
import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import Slide from '@mui/material/Slide';
import { IconX } from '@tabler/icons-react';
import { TransitionProps } from '@mui/material/transitions';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // **ایمپورت useTooltip و CustomTooltip**

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface RoleType {
  id: number;
  name: string;
}

type Props = {
  openRoleModal: boolean;
  onClose: () => void;
  userId: number | null;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ListUsersModal = ({ openRoleModal, onClose, userId, showAlert }: Props) => {
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip**
  const { isTooltipGloballyEnabled } = useTooltip();

  const fetchAllRoles = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      return [];
    }
    try {
      const response = await axios.get(server.baseurl + server.user + "get-roles", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data.httpStatusCode === 200) {
        return response.data.data.map((item: any) => ({
          id: Number(item.id),
          name: item.name
        })) as RoleType[];
      } else {
        showAlert(response.data.message || 'Rol listesi alınırken bir hata oluştu.', 'error');
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching all roles:", error);
      showAlert('Rol listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      return [];
    }
  };

  const fetchUserRoles = async (currentUserId: number) => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      return [];
    }
    try {
      const response = await axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${currentUserId}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data.httpStatusCode === 200 && response.data.data) {
        const assignedRoleIds = response.data.data.roles.map((item: any) => Number(item.id));
        return assignedRoleIds;
      } else {
        showAlert(response.data.message || 'Kullanıcı rolleri alınırken bir hata oluştu.', 'error');
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching user roles:", error);
      showAlert('Kullanıcı rolleri alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      return [];
    }
  };

  useEffect(() => {
    if (openRoleModal && userId !== null) {
      setLoading(true);
      Promise.all([
        fetchAllRoles(),
        fetchUserRoles(userId),
      ])
        .then(([roles, userAssignedRoleIds]) => {
          setAllRoles(roles);
          setSelectedRoleIds(userAssignedRoleIds);
        })
        .catch(err => {
          console.error("Failed to load roles for user:", err);
          showAlert('Roller yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!openRoleModal) {
      setAllRoles([]);
      setSelectedRoleIds([]);
      setLoading(false);
      setSaving(false);
    }
  }, [openRoleModal, userId]);

  const handleToggle = (roleId: number) => () => {
    const currentIndex = selectedRoleIds.indexOf(roleId);
    const newChecked = [...selectedRoleIds];

    if (currentIndex === -1) {
      newChecked.push(roleId);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setSelectedRoleIds(newChecked);
  };

  const handleSelectAllToggle = () => {
    if (selectedRoleIds.length === allRoles.length && allRoles.length > 0) {
      setSelectedRoleIds([]);
    } else {
      setSelectedRoleIds(allRoles.map(role => Number(role.id)));
    }
  };

  const handleSaveRoles = async () => {
    if (userId === null) return;
    setSaving(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      setSaving(false);
      return;
    }

    const roleIdsToSend = allRoles
      .filter(role => selectedRoleIds.includes(role.id))
      .map(role => role.id); // ارسال ID رول‌ها (اگر API نام می‌خواست، اینجا به نام تبدیل کنید)

    try {
      const response = await axios.post(
        `${server.baseurl}${server.user}assign-user-roles`, // آدرس API اختصاص رول به کاربر
        { UserId: userId, roleIds: roleIdsToSend }, // UserId و roleIds را ارسال کن
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201) {
        showAlert('Roller başarıyla güncellendi!', 'success');
        onClose();
      } else {
        showAlert(response.data.message || 'Roller güncellenirken bir hata oluştu.', 'error');
      }
    } catch (error: any) {
      console.error("Error saving roles:", error);
      const errorMessage = error.response?.data?.message || 'Roller kaydedilirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isAllSelected = allRoles.length > 0 && selectedRoleIds.length === allRoles.length;
  const isIndeterminate = selectedRoleIds.length > 0 && selectedRoleIds.length < allRoles.length;

  return (
    <Dialog fullScreen open={openRoleModal} onClose={onClose} TransitionComponent={Transition}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          {/* **Tooltip برای دکمه بستن (IconX)** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "Kapat" : ""}>
            <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
              <IconX width={24} height={24} />
            </IconButton>
          </CustomTooltip>
          <Typography ml={2} flex={1} variant="h6" component="div">
            Kullanıcı için Rolleri Seçin
          </Typography>
          {/* **Tooltip برای دکمه ذخیره (Kaydet)** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen rolleri kaydet" : ""}>
            <Button autoFocus color="inherit" onClick={handleSaveRoles} disabled={loading || saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
            </Button>
          </CustomTooltip>
        </Toolbar>
      </AppBar>
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
            <Typography ml={2}>Roller yükleniyor...</Typography>
          </Box>
        ) : (
          <List dense component="div" role="list">
            {allRoles.length > 0 ? (
              <>
                {/* آیتم "انتخاب همه" */}
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm rolleri seç/seçimi kaldır" : ""}>
                  <ListItem
                    onClick={handleSelectAllToggle}
                    role="checkbox"
                    sx={{ py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isAllSelected}
                        indeterminate={isIndeterminate}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText primary="Tümünü Seç / Seçimi Kaldır" />
                  </ListItem>
                </CustomTooltip>

                {/* لیست رول‌ها */}
                {allRoles.map((role) => (
                  <CustomTooltip key={`role-tooltip-${role.id}`} title={isTooltipGloballyEnabled ? role.name : ""}>
                    <ListItem
                      key={role.id}
                      onClick={handleToggle(role.id)}
                      role="checkbox"
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedRoleIds.indexOf(role.id) !== -1}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText primary={role.name} />
                    </ListItem>
                  </CustomTooltip>
                ))}
              </>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Typography color="textSecondary">Hiç rol bulunamadı.</Typography>
              </Box>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ListUsersModal;