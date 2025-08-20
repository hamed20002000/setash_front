// ChangeUserRoleModal.tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; 


interface UserRole {
  name: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  userRoles: UserRole[];
  currentActiveRoleName: string | null;
  onRoleChange: (newRoleName: string) => void;
  showAlert: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
};

const ChangeUserRoleModal = ({ open, onClose, userRoles, currentActiveRoleName, onRoleChange, showAlert }: Props) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(currentActiveRoleName);
  const [saving, setSaving] = useState(false);

  // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip**
  const { isTooltipGloballyEnabled } = useTooltip();

  useEffect(() => {
    setSelectedRole(currentActiveRoleName);
  }, [currentActiveRoleName]);

  const handleSelectChange = (event: any) => {
    setSelectedRole(event.target.value as string);
  };

  const handleSave = async () => {
    if (selectedRole === null) {
      showAlert('Lütfen bir rol seçin.', 'warning');
      return;
    }
    if (selectedRole === currentActiveRoleName) {
      showAlert('Seçilen rol zaten aktif rolünüzdür.', 'info');
      onClose();
      return;
    }

    setSaving(true);
    try {
      onRoleChange(selectedRole);
      showAlert(`Aktif rolünüz "${selectedRole}" olarak değiştirildi.`, 'success');
      onClose();
    } catch (error) {
      console.error("Error changing active role:", error);
      showAlert('Aktif rol değiştirilirken bir hata oluştu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Aktif Rolü Değiştir</DialogTitle>
      <DialogContent dividers>
        {userRoles.length > 0 ? (
          <CustomTooltip title={isTooltipGloballyEnabled ? "Aktif rolünüzü seçmek için tıklayın" : ""}>
            <FormControl fullWidth>
              <InputLabel id="active-role-select-label">Rolü Seçin</InputLabel>
              <Select
                labelId="active-role-select-label"
                id="active-role-select"
                value={selectedRole || ''}
                label="Rolü Seçin"
                onChange={handleSelectChange}
              >
                {userRoles.map((role) => (
                  <MenuItem key={role.name} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CustomTooltip>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
            <Typography color="textSecondary">Hiç rol bulunamadı.</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <CustomTooltip title={isTooltipGloballyEnabled ? "Rol değiştirme işlemini iptal et" : ""}>
          <Button onClick={onClose} color="error" disabled={saving}>
            İptal Et
          </Button>
        </CustomTooltip>
        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen rolü kaydet" : ""}>
          <Button onClick={handleSave} color="primary" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Kaydet'}
          </Button>
        </CustomTooltip>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeUserRoleModal;