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

// نوع پراپ‌ها را اصلاح می‌کنیم
type Props = {
  openRoleModal: boolean;
  onClose: () => void;
  userId: number | null; // ID کاربر انتخاب شده
  // userRoles: number[]; // این پراپ حذف می‌شود
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ListUsersModal = ({ openRoleModal, onClose, userId, showAlert }: Props) => { // userRoles از اینجا حذف شد
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

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

  // --- تابع جدید برای دریافت رول‌های اختصاص‌یافته به کاربر خاص ---
  const fetchUserRoles = async (currentUserId: number) => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      return [];
    }
    try {
      // آدرس API شما: http://94.138.207.132:3001/api/users/get-user-with-role-and-operations/id
      const response = await axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${currentUserId}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data.httpStatusCode === 200 && response.data.data) {
        // فرض می‌کنیم response.data.data.roles آرایه‌ای از آبجکت‌هاست که هر کدام دارای 'id' (آی‌دی رول) هستند
        // یا 'roleId' اگر نام فیلد متفاوت است.
        // بر اساس پاسخ قبلی شما، ساختار ممکن است شامل یک آبجکت کاربر با یک فیلد roles باشد.
        // مثلاً: response.data.data.roles.map(role => Number(role.id))
        const assignedRoleIds = response.data.data.roles.map((role: any) => Number(role.id));
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
      // هر دو API را به صورت موازی فراخوانی کن
      Promise.all([
        fetchAllRoles(), // دریافت تمام رول‌ها
        fetchUserRoles(userId), // دریافت رول‌های کاربر خاص
      ])
        .then(([roles, userAssignedRoleIds]) => {
          setAllRoles(roles); // تمام رول‌ها را تنظیم کن
          setSelectedRoleIds(userAssignedRoleIds); // رول‌های اختصاص یافته به کاربر را تنظیم کن
        })
        .catch(err => {
          console.error("Failed to load roles for user:", err);
          showAlert('Roller yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!openRoleModal) {
      // وقتی مودال بسته شد، state ها را ریست کن
      setAllRoles([]);
      setSelectedRoleIds([]);
      setLoading(false);
      setSaving(false);
    }
  }, [openRoleModal, userId]); // userRoles از اینجا حذف شد

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
      setSelectedRoleIds(allRoles.map(role => role.id));
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

    // تبدیل selectedRoleIds (ID) به roleNames (string) برای ارسال به API
    const roleNamesToSend = allRoles
      .filter(role => selectedRoleIds.includes(role.id))
      .map(role => role.id);
debugger
    try {
      // این آدرس API باید رول‌ها را برای کاربر با ID مشخص به‌روزرسانی کند.
      // فرض می‌شود API نام رول‌ها را می‌پذیرد.
      const response = await axios.post(
        `${server.baseurl}${server.user}assign-user-roles`,
        { UserId:userId,  roleIds: roleNamesToSend }, // ارسال نام رول‌ها
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
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <IconX width={24} height={24} />
          </IconButton>
          <Typography ml={2} flex={1} variant="h6" component="div">
            Kullanıcı için Rolleri Seçin
          </Typography>
          <Button autoFocus color="inherit" onClick={handleSaveRoles} disabled={loading || saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
          </Button>
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

                {allRoles.map((role) => (
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