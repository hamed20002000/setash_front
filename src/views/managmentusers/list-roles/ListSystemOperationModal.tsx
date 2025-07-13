// ListSystemOperationModal.tsx
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

// Transition برای انیمیشن مودال
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// تعریف نوع برای عملیات
interface OperationType {
  id: number;
  name: string;
}

// تعریف نوع پراپ‌ها برای مودال
type Props = {
  openOperationModal: boolean;
  onClose: () => void;
  roleId: number | null; // ID رول انتخاب شده برای مدیریت عملیات‌ها
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void; // برای نمایش Alert در SystemRole
};

const ListSystemOperationModal = ({ openOperationModal, onClose, roleId, showAlert }: Props) => {
  const [allOperations, setAllOperations] = useState<OperationType[]>([]);
  const [selectedOperationIds, setSelectedOperationIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip**
  const { isTooltipGloballyEnabled } = useTooltip();

  // تابع برای دریافت لیست تمام عملیات‌ها
  const fetchAllOperations = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      return [];
    }
    try {
      const response = await axios.get(server.baseurl + server.user + "get-system-operations", {
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

  // تابع برای دریافت عملیات‌های اختصاص‌یافته به رول فعلی
  const fetchRoleOperations = async (currentRoleId: number) => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      return [];
    }
    try {
      const response = await axios.get(`${server.baseurl}${server.user}get-role-with-operations/${currentRoleId}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data.httpStatusCode === 200) {
        const assignedOps = response.data.data.systemOperations.map((item: any) => Number(item.id));
        return assignedOps;
      } else {
        showAlert(response.data.message || 'Rol operasyonları alınırken bir hata oluştu.', 'error');
        return [];
      }
    } catch (error: any) {
      console.error("Error fetching role operations:", error);
      showAlert('Rol operasyonları alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      return [];
    }
  };

  useEffect(() => {
    if (openOperationModal && roleId !== null) {
      setLoading(true);
      Promise.all([
        fetchAllOperations(),
        fetchRoleOperations(roleId),
      ])
        .then(([operations, assignedOps]) => {
          setAllOperations(operations);
          setSelectedOperationIds(assignedOps);
        })
        .catch(err => {
          console.error("Failed to load operations:", err);
          showAlert('Operasyonlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!openOperationModal) {
      setAllOperations([]);
      setSelectedOperationIds([]);
      setLoading(false);
      setSaving(false);
    }
  }, [openOperationModal, roleId]);

  // هندلر برای انتخاب/عدم انتخاب یک عملیات
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

  // هندلر برای دکمه "انتخاب همه"
  const handleSelectAllToggle = () => {
    if (selectedOperationIds.length === allOperations.length && allOperations.length > 0) {
      setSelectedOperationIds([]);
    } else {
      setSelectedOperationIds(allOperations.map(op => Number(op.id)));
    }
  };

  const handleSaveOperations = async () => {
    if (roleId === null) return;
    setSaving(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      setSaving(false);
      return;
    }

    try {
      const response = await axios.post(
        `${server.baseurl}${server.user}assign-role-operations`,
        { roleId: Number(roleId), operationIds: selectedOperationIds },
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200 || response.data.httpStatusCode === 201) {
        showAlert('Operasyonlar başarıyla güncellendi!', 'success');
        onClose();
      } else {
        showAlert(response.data.message || 'Operasyonlar güncellenirken bir hata oluştu.', 'error');
      }
    } catch (error: any) {
      console.error("Error saving operations:", error);
      const errorMessage = error.response?.data?.message || 'Operasyonlar kaydedilirken beklenmeyen bir hata oluştu, lütfen tekrar deneyin.';
      showAlert(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isAllSelected = allOperations.length > 0 && selectedOperationIds.length === allOperations.length;
  const isIndeterminate = selectedOperationIds.length > 0 && selectedOperationIds.length < allOperations.length;

  return (
    <Dialog fullScreen open={openOperationModal} onClose={onClose} TransitionComponent={Transition}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          {/* **Tooltip برای دکمه بستن (IconX)** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "Kapat" : ""}>
            <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
              <IconX width={24} height={24} />
            </IconButton>
          </CustomTooltip>
          <Typography ml={2} flex={1} variant="h6" component="div">
            Rol için Operasyonları Seçin
          </Typography>
          {/* **Tooltip برای دکمه ذخیره (Kaydet)** */}
          <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen operasyonları kaydet" : ""}>
            <Button autoFocus color="inherit" onClick={handleSaveOperations} disabled={loading || saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
            </Button>
          </CustomTooltip>
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
                {/* آیتم "انتخاب همه" */}
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm operasyonları seç/seçimi kaldır" : ""}>
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

                {/* لیست عملیات‌ها */}
                {allOperations.map((operation) => (
                  <CustomTooltip key={`op-tooltip-${operation.id}`} title={isTooltipGloballyEnabled ? operation.name : ""}>
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
                  </CustomTooltip>
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

export default ListSystemOperationModal;