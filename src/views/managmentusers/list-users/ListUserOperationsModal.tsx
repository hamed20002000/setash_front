// ListUserOperationsModal.tsx
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

interface OperationType {
  id: number;
  name: string;
}

type Props = {
  openOperationsModal: boolean; // نام پراپ
  onClose: () => void;
  userId: number | null; // ID کاربر انتخاب شده
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ListUserOperationsModal = ({ openOperationsModal, onClose, userId, showAlert }: Props) => {
  const [allOperations, setAllOperations] = useState<OperationType[]>([]);
  const [selectedOperationIds, setSelectedOperationIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchAllOperations = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      return [];
    }
    try {
      const response = await axios.get(server.baseurl + server.user + "get-system-operations", { // API دریافت تمام عملیات‌ها
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data.httpStatusCode === 200) {
        return response.data.data.map((item: any) => ({
          id: Number(item.id),
          name: item.name
        })) as OperationType[];
      } else {
        showAlert(response.data.message || 'Operasyon listesi alınırken bir hata oluştu.', 'error');
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching all operations:", error);
      showAlert('Operasyon listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      return [];
    }
  };

  const fetchUserOperations = async (currentUserId: number) => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      return [];
    }
    try {
      // این آدرس API برای گرفتن عملیات‌های یک کاربر خاص است. (جدید)
      const response = await axios.get(`${server.baseurl}${server.user}get-user-with-role-and-operations/${currentUserId}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data.httpStatusCode === 200) {debugger
        // فرض می‌شود پاسخ شامل آرایه‌ای از آبجکت‌هاست که هر کدام دارای `id` عملیات هستند
        const assignedOps = response.data.data.systemOperations.map((item: any) => Number(item.id));
        return assignedOps;
      } else {
        showAlert(response.data.message || 'Kullanıcı operasyonları alınırken bir hata oluştu.', 'error');
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching user operations:", error);
      showAlert('Kullanıcı operasyonları alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      return [];
    }
  };

  useEffect(() => {
    if (openOperationsModal && userId !== null) {
      setLoading(true);
      Promise.all([
        fetchAllOperations(),
        fetchUserOperations(userId),
      ])
        .then(([operations, assignedOps]) => {
          setAllOperations(operations);
          setSelectedOperationIds(assignedOps);
        })
        .catch(err => {
          console.error("Failed to load user operations:", err);
          showAlert('Kullanıcı operasyonları yüklenirken bir hata oluştu.', 'error');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!openOperationsModal) {
      setAllOperations([]);
      setSelectedOperationIds([]);
      setLoading(false);
      setSaving(false);
    }
  }, [openOperationsModal, userId]);

  const handleToggle = (operationId: number) => () => {
    const currentIndex = selectedOperationIds.indexOf(operationId);
    const newChecked = [...selectedOperationIds];

    if (currentIndex === -1) {
      newChecked.push(operationId);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setSelectedOperationIds(newChecked);
  };

  const handleSelectAllToggle = () => {
    if (selectedOperationIds.length === allOperations.length && allOperations.length > 0) {
      setSelectedOperationIds([]);
    } else {
      setSelectedOperationIds(allOperations.map(op => Number(op.id)));
    }
  };

  const handleSaveOperations = async () => {
    if (userId === null) return;
    setSaving(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      setSaving(false);
      return;
    }

    try {
      // این آدرس API برای ذخیره/به‌روزرسانی عملیات‌های اختصاص‌یافته به کاربر است. (جدید)
      const response = await axios.post(
        `${server.baseurl}${server.user}assign-user-operations`,
        { UserId:userId ,operationIds: selectedOperationIds },
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201) {
        showAlert('Kullanıcı operasyonları başarıyla güncellendi!', 'success');
        onClose();
      } else {
        showAlert(response.data.message || 'Kullanıcı operasyonları güncellenirken bir hata oluştu.', 'error');
      }
    } catch (error: any) {
      console.error("Error saving user operations:", error);
      const errorMessage = error.response?.data?.message || 'Kullanıcı operasyonları kaydedilirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isAllSelected = allOperations.length > 0 && selectedOperationIds.length === allOperations.length;
  const isIndeterminate = selectedOperationIds.length > 0 && selectedOperationIds.length < allOperations.length;

  return (
    <Dialog fullScreen open={openOperationsModal} onClose={onClose} TransitionComponent={Transition}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <IconX width={24} height={24} />
          </IconButton>
          <Typography ml={2} flex={1} variant="h6" component="div">
            Kullanıcı için Operasyonları Seçin
          </Typography>
          <Button autoFocus color="inherit" onClick={handleSaveOperations} disabled={loading || saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
          </Button>
        </Toolbar>
      </AppBar>
      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
            <Typography ml={2}>Operasyonlar yükleniyor...</Typography>
          </Box>
        ) : (
          <List dense component="div" role="list">
            {allOperations.length > 0 ? (
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

                {allOperations.map((operation) => (
                  <ListItem
                    key={operation.id}
                    onClick={handleToggle(operation.id)}
                    role="checkbox"
                    sx={{ py: 0.5 }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedOperationIds.indexOf(operation.id) !== -1}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText primary={operation.name} />
                  </ListItem>
                ))}
              </>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <Typography color="textSecondary">Hiç operasyon bulunamadı.</Typography>
              </Box>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ListUserOperationsModal;