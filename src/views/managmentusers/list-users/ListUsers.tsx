// ListUsers.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, Checkbox, InputAdornment, TablePagination,
  TextField, CircularProgress, FormControl, InputLabel, Select, OutlinedInput,
  CardMedia, FormControlLabel, ListItemText,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
  IconDots, IconEdit, IconPlus, IconTrash, IconEye, IconEyeOff, IconKey,
  IconUserCheck, IconUsersGroup, IconLock, IconSearch,
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import ListUsersModal from './ListUsersModal';
import ListUserOperationsModal from './ListUserOperationsModal';
import ChangeUserPasswordModal from './ChangeUserPasswordModal';
import DeleteListUser from './DeleteListUser';
import axios from 'axios';
import server from '../../../assets/address.json';
import imagedefault from '../../../assets/images/profile/user-d.svg';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext'; // **ایمپورت useTooltip و CustomTooltip**

interface UserType {
  id: number;
  username: string;
  email?: string;
  status: string;
  recordStatus: number;
  createAt: string;
  imageUrl?: string;
  roles: { id: number; name: string }[];
}

interface RoleType {
  id: number;
  name: string;
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Geçersiz Tarih";
  }
};

const DEFAULT_IMAGE_URL = imagedefault;

const ListUsers = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [profileImageBase64, setProfileImageBase64] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState<string>(DEFAULT_IMAGE_URL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [originalUsername, setOriginalUsername] = useState<string>('');

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<UserType | null>(null);
  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null);
  // const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);

  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [userIdForRoleSelection, setUserIdForRoleSelection] = useState<number | null>(null);
  const [userRolesForModal, setUserRolesForModal] = useState<number[]>([]);

  const [openOperationsModal, setOpenOperationsModal] = useState(false);
  const [userIdForOperationsSelection, setUserIdForOperationsSelection] = useState<number | null>(null);

  const [openChangePasswordModal, setOpenChangePasswordModal] = useState(false);
  const [userIdForPasswordChange, setUserIdForPasswordChange] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [generateRandomPassword, setGenerateRandomPassword] = useState<boolean>(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);

  const usernameFieldRef = useRef<HTMLInputElement>(null);
  const passwordFieldRef = useRef<HTMLInputElement>(null);
  const confirmPasswordFieldRef = useRef<HTMLInputElement>(null);

  // **استفاده از useTooltip برای دسترسی به وضعیت Tooltip**
  const { isTooltipGloballyEnabled } = useTooltip();


  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  };

  const clearAlert = () => {
    setAlertMessage(null);
  };

  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, user: UserType) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserForMenu(user);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedUserForMenu(null);
  };

  const handleClickOpenDeleteModal = () => {
    if (selectedUserForMenu) {
      setUserIdToDelete(selectedUserForMenu.id);
      // setUserIdToDelete(selectedUserForMenu.username);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setUserIdToDelete(null);
    getListUsers();
  };

  const handleClickOpenRoleModal = () => {
    if (selectedUserForMenu) {
      setUserIdForRoleSelection(selectedUserForMenu.id);
      setOpenRoleModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseRoleModal = () => {
    setOpenRoleModal(false);
    setUserIdForRoleSelection(null);
    setUserRolesForModal([]);
    getListUsers();
  };

  const handleClickOpenChangePasswordModal = () => {
    if (selectedUserForMenu) {
      setUserIdForPasswordChange(selectedUserForMenu.username);
      setOpenChangePasswordModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseChangePasswordModal = () => {
    setOpenChangePasswordModal(false);
    setUserIdForPasswordChange(null);
    showAlert('Şifre değiştirme işlemi tamamlandı.', 'info');
  };

  const handleClickOpenOperationsModal = () => {
    if (selectedUserForMenu) {
      setUserIdForOperationsSelection(selectedUserForMenu.id);
      setOpenOperationsModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseOperationsModal = () => {
    setOpenOperationsModal(false);
    setUserIdForOperationsSelection(null);
  };

  const generateRandomPass = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let newPass = '';
    for (let i = 0; i < 12; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPass);
    setConfirmPassword(newPass);
  };

  const handleRandomPasswordCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGenerateRandomPassword(event.target.checked);
    if (event.target.checked) {
      generateRandomPass();
    } else {
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileImageBase64(base64String);
        setProfileImageUrl(base64String);
      };
      reader.readAsDataURL(file);
    } else {
      setProfileImageBase64('');
      setProfileImageUrl(DEFAULT_IMAGE_URL);
    }
  };

  const resetFormAndState = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setSelectedRoles([]);
    setProfileImageBase64('');
    setProfileImageUrl(DEFAULT_IMAGE_URL);
    setGenerateRandomPassword(false);
    setEditingUserId(null);
    setOriginalUsername('');
    clearAlert();

    setTimeout(() => {
      if (usernameFieldRef.current) usernameFieldRef.current.value = '';
      if (passwordFieldRef.current) passwordFieldRef.current.value = '';
      if (confirmPasswordFieldRef.current) confirmPasswordFieldRef.current.value = '';
    }, 0);
  };

  const handleEditItemClick = () => {
    if (selectedUserForMenu) {
      setUsername(selectedUserForMenu.username);
      setOriginalUsername(selectedUserForMenu.username);
      setEditingUserId(selectedUserForMenu.id);

      setProfileImageUrl(selectedUserForMenu.imageUrl || DEFAULT_IMAGE_URL);
      setProfileImageBase64('');

      setPassword('');
      setConfirmPassword('');
      setGenerateRandomPassword(false);
      setSelectedRoles([]);
    }
    handleCloseMenu();
    clearAlert();

    setTimeout(() => {
      if (passwordFieldRef.current) passwordFieldRef.current.value = '';
      if (confirmPasswordFieldRef.current) confirmPasswordFieldRef.current.value = '';
    }, 0);
  };


  const insertUser = async () => {
    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      showAlert('Tüm zorunlu alanları doldurun!', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Şifreler eşleşmiyor!', 'error');
      return;
    }
    clearAlert();

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      navigate("/");
      return;
    }

    const roleNamesToSend = allRoles
      .filter(role => selectedRoles.includes(role.id))
      .map(role => role.name);

    setLoadingButton(true);
    try {
      const response = await axios.post(
        server.baseurl + server.user + "create-user",
        {
          username: username,
          password: password,
          rePassword: confirmPassword,
          imageSrc: profileImageBase64,
          roleNames: roleNamesToSend,
        },
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );
      if (response.data.httpStatusCode === 201) {
        showAlert('Yeni kullanıcı başarıyla eklendi!', 'success');
        resetFormAndState();
        getListUsers();
      } else {
        showAlert(response.data.message || 'Yeni kullanıcı eklenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error inserting user:", e);
      showAlert(e.response?.data?.message || 'Kullanıcı eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editUser = async () => {
    if (editingUserId === null) return;
    if (!username.trim()) {
      showAlert('Kullanıcı adı boş olamaz!', 'warning');
      return;
    }
    clearAlert();

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      navigate("/");
      return;
    }

    const updateData: {
      id: number;
      username: string;
      imageSrc?: string;
    } = {
      id: editingUserId,
      username: username,
    };

    if (profileImageBase64) {
      updateData.imageSrc = profileImageBase64;
    } else if (profileImageUrl === DEFAULT_IMAGE_URL && selectedUserForMenu?.imageUrl !== DEFAULT_IMAGE_URL) {
      updateData.imageSrc = "";
    }


    setLoadingButton(true);
    try {
      const response = await axios.put(
        server.baseurl + server.user + "update-user",
        updateData,
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        showAlert('Kullanıcı başarıyla güncellendi!', 'success');
        resetFormAndState();
        getListUsers();
      } else {
        showAlert(response.data.message || 'Kullanıcı güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error updating user:", e);
      showAlert(e.response?.data?.message || 'Kullanıcı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const sendStatusUpdate = async (userId: number, statusValue: number) => {
    clearAlert();
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      navigate("/");
      return;
    }
    try {
      const response = await axios.put(
        server.baseurl + server.user + "update-user",
        { id: userId, recordStatus: statusValue },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.httpStatusCode === 200) {
        const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
        showAlert(`Kullanıcı başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListUsers();
      } else {
        showAlert(response.data.message || 'Kullanıcı durumu güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error updating user status:", e);
      showAlert(e.response?.data?.message || 'Kullanıcı durumu güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      handleCloseMenu();
    }
  };

  function getListUsers() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      return;
    }

    axios.get(server.baseurl + server.user + "get-users", {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    }).then((result) => {
      if (result.data.httpStatusCode === 200) {debugger
        const formattedData = result.data.data.map((item: any) => ({
          id: item.id,
          username: item.username,
          createAt: item.createAt,
          recordStatus: item.recordStatus,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Etkin değil' : 'Silindi',
          imageUrl: item.imageSrc || DEFAULT_IMAGE_URL,
          roles: item.roles || [],
        }));
        const sortedData = formattedData.sort((a: UserType, b: UserType) => {
          const dateA = new Date(a.createAt);
          const dateB = new Date(b.createAt);
          return dateB.getTime() - dateA.getTime();
        });
        setUsersList(sortedData as UserType[]);
      } else {
        showAlert(result.data.message || 'Kullanıcı listesi alınırken bir hata oluştu.', 'error');
      }
    }).catch((e) => {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error fetching users list:", e);
        showAlert('Kullanıcı listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    });
  }

  const getListRoles = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("No auth token found, cannot fetch roles.");
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.user + "get-roles", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data.httpStatusCode === 200) {
        setAllRoles(response.data.data.map((item: any) => ({ id: Number(item.id), name: item.name })) as RoleType[]);
      } else {
        showAlert(response.data.message || 'Roller alınırken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error fetching roles:", e);
      showAlert('Roller alınırken bir hata oluştu, lütfen tekrar deneyین.', 'error');
    }
  };

  useEffect(() => {
    getListUsers();
    getListRoles();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const filteredUsers = usersList.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Grid container spacing={2}>

          <Grid item xs={12} sm={9}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <CustomFormLabel htmlFor="username">Kullanıcı Adı</CustomFormLabel>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcı adını girin" : ""}>
                  <CustomTextField
                    id="username"
                    placeholder="Kullanıcı Adı"
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    inputProps={{ autocomplete: 'off' }}
                    ref={usernameFieldRef}
                  />
                </CustomTooltip>
              </Grid>

              {editingUserId === null && (
                <>
                  <Grid item xs={12} md={6}>
                    <CustomFormLabel htmlFor="password">Şifre</CustomFormLabel>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Şifreyi girin" : ""}>
                      <CustomTextField
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Şifre"
                        fullWidth
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={generateRandomPassword}
                        inputProps={{ autocomplete: 'new-password' }}
                        ref={passwordFieldRef}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <CustomTooltip title={isTooltipGloballyEnabled ? (showPassword ? "Şifreyi gizle" : "Şifreyi göster") : ""}>
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  edge="end"
                                  size="small"
                                >
                                  {showPassword ? <IconEye size={20} /> : <IconEyeOff size={20} />}
                                </IconButton>
                              </CustomTooltip>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </CustomTooltip>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <CustomFormLabel htmlFor="confirm-password">Şifreyi Tekrarla</CustomFormLabel>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Şifreyi tekrar girin" : ""}>
                      <CustomTextField
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Şifreyi Tekrarla"
                        fullWidth
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={generateRandomPassword}
                        error={password !== confirmPassword && confirmPassword !== ''}
                        helperText={password !== confirmPassword && confirmPassword !== '' ? 'Şifreler eşleşmiyor!' : ''}
                        inputProps={{ autocomplete: 'new-password' }}
                        ref={confirmPasswordFieldRef}
                      />
                    </CustomTooltip>
                  </Grid>
                  <Grid item xs={12} md={6} display="flex" alignItems="center">
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Sistem tarafından rastgele bir şifre oluşturun" : ""}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={generateRandomPassword}
                            onChange={handleRandomPasswordCheckboxChange}
                            name="generateRandomPassword"
                            color="primary"
                          />
                        }
                        label="Rastgele Şifre Oluştur"
                        sx={{ mt: 3 }}
                      />
                    </CustomTooltip>
                  </Grid>
                  <Grid item xs={12} md={12}>
                    <CustomFormLabel htmlFor="select-roles">Roller</CustomFormLabel>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcının rollerini seçin" : ""}>
                      <FormControl fullWidth>
                        <InputLabel id="roles-multiple-checkbox-label">Rolleri Seç</InputLabel>
                        <Select
                          labelId="roles-multiple-checkbox-label"
                          id="select-roles"
                          multiple
                          value={selectedRoles}
                          onChange={(e) => setSelectedRoles(e.target.value as number[])}
                          input={<OutlinedInput id="select-multiple-chip" label="Rolleri Seç" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => {
                                const role = allRoles.find(r => r.id === value);
                                return <Chip key={value} label={role ? role.name : ''} />;
                              })}
                            </Box>
                          )}
                          sx={{ width: '100%' }}
                        >
                          {allRoles.map((role) => (
                            <MenuItem key={role.id} value={role.id}>
                              <Checkbox checked={selectedRoles.indexOf(role.id) > -1} />
                              <ListItemText primary={role.name} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </CustomTooltip>
                  </Grid>
                </>
              )}
            </Grid>
          </Grid>

          {/* بخش آپلود و نمایش عکس */}
          <Grid item xs={12} sm={3} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            <CardMedia
              component="img"
              sx={{ width: 200, height: 200, borderRadius: '50%', objectFit: 'cover', mb: 1 }}
              image={profileImageUrl}
              alt="Profile Picture"
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcının profil resmini seçin" : ""}>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                size="small"
              >
                Resim Seç
              </Button>
            </CustomTooltip>
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} justifyContent="flex-start" mt={2}>
              {editingUserId !== null ? (
                <>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen kullanıcıyı güncelleyin" : ""}>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={editUser}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                      </> : 'Kullanıcıyı Güncelle'}
                    </Button>
                  </CustomTooltip>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni kullanıcı moduna dön" : ""}>
                    <Button variant="outlined" color="secondary" onClick={resetFormAndState}>
                      İptal Et
                    </Button>
                  </CustomTooltip>
                </>
              ) : (
                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir kullanıcı ekle" : ""}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={insertUser}
                    disabled={loadingButton}
                  >
                    {loadingButton ? <>
                      <BoltIcon sx={{ mr: 1 }} /> Beklemek....
                    </> : 'Yeni Kullanıcı Ekle'}
                  </Button>
                </CustomTooltip>
              )}
            </Stack>
          </Grid>
        </Grid>
        {alertMessage && (
          <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
            <Alert severity={alertSeverity} onClose={clearAlert}>
              {alertMessage}
            </Alert>
          </Stack>
        )}
      </div>

      <BlankCard>
        <Box sx={{ p: 2 }}>
          <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcı adına göre ara" : ""}>
            <TextField
              label="Kullanıcı Ara"
              variant="outlined"
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={20} />
                  </InputAdornment>
                ),
              }}
            />
          </CustomTooltip>
        </Box>
        <TableContainer>
          <Table aria-label="user table">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="h6">Resim</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Kullanıcı Adı</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Rolleri Listele</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Oluşturulma Tarihi</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Durum</Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((row) => (
                  <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <CardMedia
                        component="img"
                        sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                        image={row.imageUrl || DEFAULT_IMAGE_URL}
                        alt="User Picture"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6">{row.username}</Typography>
                    </TableCell>
                    <TableCell>
                     

                      {row.roles && row.roles.length > 0 ? (
                          row.roles.map((role, index) => (
                            <Chip
                              key={role.id || index} 
                              label={role.name}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))
                        ) : (
                           <Chip
                              label="Rol Yok"
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5,
                                backgroundColor:(theme) => theme.palette.error.dark,
                                color:(theme) => theme.palette.error.contrastText
                               }}
                            />
                          // <Typography variant="h6" color="textSecondary">Rol Yok</Typography>
                      )}
              
                    </TableCell>
                    <TableCell>
                      <Typography variant="h6">{formatDate(row.createAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        sx={{
                          backgroundColor:
                            row.recordStatus === 2
                              ? (theme) => theme.palette.primary.light
                              : row.recordStatus === 1
                                ? (theme) => theme.palette.error.light
                                : (theme) => theme.palette.success.light,
                          color:
                            row.recordStatus === 2
                              ? (theme) => theme.palette.primary.main
                              : row.recordStatus === 1
                                ? (theme) => theme.palette.error.main
                                : (theme) => theme.palette.success.main,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {/* Tooltip برای IconButton منوی سطر */}
                      <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                        <IconButton
                          id={`basic-button-${row.id}`}
                          aria-controls={openMenu ? 'basic-menu' : undefined}
                          aria-haspopup="true"
                          aria-expanded={openMenu ? 'true' : undefined}
                          onClick={(event) => handleClickMenu(event, row)}
                        >
                          <IconDots width={18} />
                        </IconButton>
                      </CustomTooltip>
                      <Menu
                        id="basic-menu"
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleCloseMenu}
                        MenuListProps={{
                          'aria-labelledby': `basic-button-${selectedUserForMenu?.id}`,
                        }}
                      >
                        {selectedUserForMenu?.recordStatus === 0 ? (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcıyı pasif yap" : ""}>
                            <MenuItem onClick={() => sendStatusUpdate(selectedUserForMenu.id, 1)}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Pasif Yap
                            </MenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcıyı aktif yap" : ""}>
                            <MenuItem onClick={() => sendStatusUpdate(selectedUserForMenu!.id, 0)}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif Yap
                            </MenuItem>
                          </CustomTooltip>
                        )}

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcının şifresini değiştir" : ""}>
                          <MenuItem onClick={handleClickOpenChangePasswordModal}>
                            <ListItemIcon>
                              <IconKey width={18} />
                            </ListItemIcon>
                            Şifre Değiştir
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcının rollerini yönet" : ""}>
                          <MenuItem onClick={handleClickOpenRoleModal}>
                            <ListItemIcon>
                              <IconUsersGroup width={18} />
                            </ListItemIcon>
                            Rolleri Seç
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcının operasyonlarını yönet" : ""}>
                          <MenuItem onClick={handleClickOpenOperationsModal}>
                            <ListItemIcon>
                              <IconLock width={18} />
                            </ListItemIcon>
                            Operasyonları Seç
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcı bilgilerini düzenle" : ""}>
                          <MenuItem onClick={handleEditItemClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcıyı sil" : ""}>
                          <MenuItem onClick={handleClickOpenDeleteModal}>
                            <ListItemIcon>
                              <IconTrash width={18} />
                            </ListItemIcon>
                            Silmek
                          </MenuItem>
                        </CustomTooltip>
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="subtitle1" color="textSecondary">
                      Hiç kullanıcı bulunamadı.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteListUser
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        userIdToDelete={userIdToDelete}
        onDeleteSuccess={getListUsers}
        showAlert={showAlert}
      />

      <ListUsersModal
        openRoleModal={openRoleModal}
        onClose={handleClickCloseRoleModal}
        userId={userIdForRoleSelection}
        showAlert={showAlert}
      />

      <ChangeUserPasswordModal
        openModal={openChangePasswordModal}
        onClose={handleClickCloseChangePasswordModal}
        userId={userIdForPasswordChange}
        showAlert={showAlert}
      />

      <ListUserOperationsModal
        openOperationsModal={openOperationsModal}
        onClose={handleClickCloseOperationsModal}
        userId={userIdForOperationsSelection}
        showAlert={showAlert}
      />
    </>
  );
};

export default ListUsers;