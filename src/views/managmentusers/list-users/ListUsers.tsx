
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableContainer, Table, TableHead, TableRow, TableBody,
  TableCell as MuiTableCell,
  MenuItem as MuiMenuItem,
  Typography, Chip, Menu, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, Checkbox, InputAdornment, TablePagination,
  TextField,
  FormControl, InputLabel, Select, OutlinedInput,
  CardMedia, FormControlLabel, ListItemText,
  ToggleButton as MuiToggleButton,
  ToggleButtonGroup,
  TableSortLabel,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';

import {
  keyframes, styled
} from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
  IconDots, IconEdit, IconTrash, IconEye, IconEyeOff, IconKey, IconUsersGroup, IconLock, IconSearch,
  IconCopy,
  IconX,
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import ListUsersModal from './ListUsersRolesModal';
import ListUserOperationsModal from './ListUserOperationsModal';
import ChangeUserPasswordModal from './ChangeUserPasswordModal';
import DeleteListUser from './DeleteListUser';
import axios from 'axios';
import server from '../../../assets/address.json';
import imagedefault from '../../../assets/images/profile/user-d.svg';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';


import { useAuth } from 'src/context/AuthContext';


const formatDateDisplay = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return format(date, 'dd MMMM yyyy', { locale: tr });
  } catch (e) {
    console.log("Tarih biçimlendirilirken hata oluştu:", e);
    return "Geçersiz Tarih";
  }
};


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
  fontFamily: 'NotoSans',
  fontSize: '0.8rem',
  [theme.breakpoints.up('md')]: {
    fontSize: '1rem',
  },
}));
const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
  animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
  transition: 'transform 0.3s ease-in-out',
}));
const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
  '&.Mui-selected': {
    color: 'white',
    ...(value === 'all' && selected && {
      backgroundColor: theme.palette.primary.main,
      '&:hover': { backgroundColor: theme.palette.primary.dark },
    }),
    ...(value === 'active' && selected && {
      backgroundColor: theme.palette.success.main,
      '&:hover': { backgroundColor: theme.palette.success.dark },
    }),
    ...(value === 'inactive' && selected && {
      backgroundColor: theme.palette.error.main,
      '&:hover': { backgroundColor: theme.palette.error.dark },
    }),
  },
  '&:not(.Mui-selected)': {
    color: theme.palette.text.primary,
    borderColor: theme.palette.divider,
    '&:hover': { backgroundColor: theme.palette.action.hover },
  },
}));


interface UserType {
  id: string;
  username: string;
  email?: string;
  status: string;
  recordStatus: number;
  createAt: string;
  imageUrl?: string;
  roles: {
    id: string;
    name: string;
    recordStatus?: number;
  }[];
}

interface RoleType {
  id: string;
  name: string;
  recordStatus?: number;
}

const DEFAULT_IMAGE_URL = imagedefault;

const descendingComparator = <T, Key extends keyof T>(
  a: T,
  b: T,
  orderBy: Key,
): number => {
  const valA = a[orderBy];
  const valB = b[orderBy];

  if (valB === undefined || valB === null) {
    return valA === undefined || valA === null ? 0 : -1;
  }
  if (valA === undefined || valA === null) {
    return 1;
  }

  if (typeof valB === 'string' && typeof valA === 'string') {
    return valB.localeCompare(valA);
  }
  if (typeof valB === 'number' && typeof valA === 'number') {
    return valB - valA;
  }
  if (String(valB) < String(valA)) {
    return -1;
  }
  if (String(valB) > String(valA)) {
    return 1;
  }
  return 0;
};

const getComparator = <Key extends keyof UserType>(
  order: 'asc' | 'desc',
  orderBy: Key,
): (a: UserType, b: UserType) => number => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
};


const ListUsers = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);

  const [profileRawFile, setProfileRawFile] = useState<File[]>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string>(DEFAULT_IMAGE_URL);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<UserType | null>(null);
  const openMenu = Boolean(anchorEl);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [userIdForRoleSelection, setUserIdForRoleSelection] = useState<string | null>(null);
  const [openOperationsModal, setOpenOperationsModal] = useState(false);
  const [userIdForOperationsSelection, setUserIdForOperationsSelection] = useState<string | null>(null);
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
  const { isTooltipGloballyEnabled } = useTooltip();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedRoleFilterId, setSelectedRoleFilterId] = useState<string>('all');
  const [orderBy, setOrderBy] = useState<keyof UserType>('createAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [usernameError, setUsernameError] = useState<boolean>(false);
  const [usernameHelperText, setUsernameHelperText] = useState<string>('');
  const [roleError, setRoleError] = useState<boolean>(false);
  const [roleHelperText, setRoleHelperText] = useState<string>('');
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [passwordHelperText, setPasswordHelperText] = useState<string>('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(false);
  const [confirmPasswordHelperText, setConfirmPasswordHelperText] = useState<string>('');


  const [loadingData, setLoadingData] = useState<boolean>(true);


  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);

  const { menuItems, allowedOperations } = useAuth();
  const findMenuByHref = (items: any[], path: string): any => {
    for (const item of items) {
      if (item.href === path) return item;

      if (item.children && item.children.length > 0) {
        const found = findMenuByHref(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const currentMenu = useMemo(() => {

    return findMenuByHref(menuItems, location.pathname);
  }, [menuItems, location.pathname]);

  const currentMenuOpIds = useMemo(() => {
    if (!currentMenu || !currentMenu.menuOperations) return [];

    return currentMenu.menuOperations.map((op: any) => {
      return String(op.id);
    });
  }, [currentMenu]);

  const hasPermission = (opName: string) => {
    return allowedOperations.some((op: any) =>
      op.systemOperationName === opName &&
      currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

  const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
  const hasChangeRoleOpPermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
  const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
  const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);

  const hasChangePassPermission = useMemo(() => hasPermission("Şifre Değiştirmek"), [allowedOperations, currentMenuOpIds]);

  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  }, []);
  const clearAlert = useCallback(() => {
    setAlertMessage(null);
  }, []);

  const getListUsers = useCallback(() => {
    const authToken = localStorage.getItem('authToken');

    setLoadingData(true);
    if (!authToken) {
      navigate("/");
      setLoadingData(false);
      return;
    }

    axios.get(server.baseurl + server.user + "get-users", {
      headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
    }).then((result) => {
      if (result.data.httpStatusCode === 200) {
        const formattedData = result.data.data.map((item: any) => ({
          id: String(item.id),
          username: item.username,
          email: item.email,
          createAt: item.createAt,
          recordStatus: item.recordStatus !== undefined && item.recordStatus !== null ? item.recordStatus : 0,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
          imageUrl: item.imageSrc || DEFAULT_IMAGE_URL,
          roles: (item.roles || []).map((role: any) => ({
            id: String(role.id),
            name: role.name,
            recordStatus: role.recordStatus
          })),
        }));
        setUsersList(formattedData as UserType[]);
        setLoadingData(false);
      } else {
        showAlert(result.data.message || 'Kullanıcı listesi alınırken bir hata oluştu.', 'error');
      }
    }).catch((e) => {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        showAlert('Kullanıcı listesi alınırken bir hata oluştu, lütfen tekrar deney .', 'error');
      }
    });
  }, [navigate, showAlert]);

  const getListRoles = useCallback(async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
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
        setAllRoles(response.data.data.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          recordStatus: item.recordStatus
        })) as RoleType[]);
      } else {
        showAlert(response.data.message || 'Roller alınırken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
      else if (e.response?.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
      }
      else {

        showAlert('Kullanıcı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    }
  }, [showAlert]);

  const handleClickMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>, user: UserType) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserForMenu(user);
  }, []);
  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setSelectedUserForMenu(null);
  }, []);
  const handleClickOpenDeleteModal = useCallback(() => {
    if (selectedUserForMenu) {
      setUserIdToDelete(selectedUserForMenu.id);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  }, [selectedUserForMenu, handleCloseMenu]);

  const handleClickCloseDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
    setUserIdToDelete(null);
    getListUsers();
  }, [getListUsers]);

  const handleClickOpenRoleModal = useCallback(() => {
    if (selectedUserForMenu) {
      setUserIdForRoleSelection(selectedUserForMenu.id);
      setOpenRoleModal(true);
    }
    handleCloseMenu();
  }, [selectedUserForMenu, handleCloseMenu]);

  const handleClickCloseRoleModal = useCallback(() => {
    setOpenRoleModal(false);
    setUserIdForRoleSelection(null);
    getListUsers();
  }, [getListUsers]);

  const handleClickOpenChangePasswordModal = useCallback(() => {
    if (selectedUserForMenu) {
      setUserIdForPasswordChange(selectedUserForMenu.username);
      setOpenChangePasswordModal(true);
    }
    handleCloseMenu();
  }, [selectedUserForMenu, handleCloseMenu]);

  const handleClickCloseChangePasswordModal = useCallback(() => {
    setOpenChangePasswordModal(false);
    setUserIdForPasswordChange(null);
    showAlert('Şifre değiştirme işlemi tamamlandı.', 'info');
  }, [showAlert]);

  const handleClickOpenOperationsModal = useCallback(() => {
    if (selectedUserForMenu) {
      setUserIdForOperationsSelection(selectedUserForMenu.id);
      setOpenOperationsModal(true);
    }
    handleCloseMenu();
  }, [selectedUserForMenu, handleCloseMenu]);

  const handleClickCloseOperationsModal = useCallback(() => {
    setOpenOperationsModal(false);
    setUserIdForOperationsSelection(null);
    getListUsers();
  }, [getListUsers]);

  const generateRandomPass = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    const charss = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    const num = '0123456789';
    let newPass = '';
    for (let i = 0; i < 10; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    for (let i = 0; i < 5; i++) {
      newPass += charss.charAt(Math.floor(Math.random() * charss.length));
    }
    for (let j = 0; j < 2; j++) {
      newPass += num.charAt(Math.floor(Math.random() * num.length));
    }
    setPassword(newPass);
    setConfirmPassword(newPass);
  }, []);

  const handleRandomPasswordCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setGenerateRandomPassword(event.target.checked);
    if (event.target.checked) {
      generateRandomPass();
      setPasswordError(false);
      setPasswordHelperText('');
      setConfirmPasswordError(false);
      setConfirmPasswordHelperText('');
    } else {
      setPassword('');
      setConfirmPassword('');
    }
  }, [generateRandomPass]);


  const uploadImage = async (file: File, authToken: string, showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void): Promise<string | null> => {


    if (!file) {
      showAlert('Hata: Yüklenecek ham dosya bulunamadı.', 'error');
      return null;
    }
    const formData = new FormData();

    profileRawFile.forEach(file => formData.append('files', file));
    try {
      const uploadResponse = await axios.post(
        server.baseurl + server.baseinfo + "upload-files",
        formData,
        { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }

      );

      if (uploadResponse.data.httpStatusCode === 201) {
        return uploadResponse.data.data.files[0];
      } else {
        showAlert('Resim yüklenirken sunucu hatası oluştu.', 'error');
        return null;
      }
    } catch (e) {
      showAlert('Resim yüklenirken ağ hatası oluştu.', 'error');
      return null;
    }
  };

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setProfileRawFile(prev => [...prev, ...Array.from(files)]);

      setProfileImageUrl(URL.createObjectURL(files?.[0]));
    } else {
      setProfileRawFile([]);
      setProfileImageUrl(DEFAULT_IMAGE_URL);
    }
  }, []);

  const getFullImageUrl = (fileUrl: string | undefined): string => {
    if (!fileUrl || fileUrl === "N/A" || fileUrl.startsWith('data:')) {
      return DEFAULT_IMAGE_URL;
    }
    return `${server.urldpwonload}${fileUrl}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (alertMessage) {
      timer = setTimeout(() => {
        clearAlert();
      }, 5000);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [alertMessage]);


  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBlinking(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  const resetFormAndState = useCallback(() => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setSelectedRoles([]);
    setProfileRawFile([]);
    setProfileImageUrl(DEFAULT_IMAGE_URL);
    setGenerateRandomPassword(false);
    setEditingUserId(null);
    setUsernameError(false);
    setUsernameHelperText('');
    setRoleError(false);
    setRoleHelperText('');
    setPasswordError(false);
    setPasswordHelperText('');
    setConfirmPasswordError(false);
    setIsFormVisible(false);
    setConfirmPasswordHelperText('');

    setTimeout(() => {
      if (usernameFieldRef.current) usernameFieldRef.current.value = '';
      if (passwordFieldRef.current) passwordFieldRef.current.value = '';
      if (confirmPasswordFieldRef.current) confirmPasswordFieldRef.current.value = '';
    }, 0);
  }, []);

  const handleEditItemClick = useCallback(() => {
    if (selectedUserForMenu) {
      setUsername(selectedUserForMenu.username);
      setEditingUserId(selectedUserForMenu.id);
      const fullUrl = getFullImageUrl(selectedUserForMenu.imageUrl);
      setProfileImageUrl(fullUrl);
      setProfileRawFile([]);
      setPassword('');
      setConfirmPassword('');
      setGenerateRandomPassword(false);
      const currentRoleIds = selectedUserForMenu.roles.map(role => role.id);
      setSelectedRoles(currentRoleIds);
      setIsFormVisible(true);
    }
    handleCloseMenu();
    clearAlert();
    setUsernameError(false);
    setUsernameHelperText('');
    setRoleError(false);
    setRoleHelperText('');
    setPasswordError(false);
    setPasswordHelperText('');
    setConfirmPasswordError(false);
    setConfirmPasswordHelperText('');
    setTimeout(() => {
      usernameFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      usernameFieldRef.current?.focus();
      if (passwordFieldRef.current) passwordFieldRef.current.value = '';
      if (confirmPasswordFieldRef.current) confirmPasswordFieldRef.current.value = '';
    }, 100);
  }, [selectedUserForMenu, handleCloseMenu, clearAlert]);

  const insertUser = async () => {
    let hasValidationError = false;

    if (!username.trim()) { setUsernameError(true); setUsernameHelperText('Kullanıcı adı boş bırakılamaz.'); hasValidationError = true; } else { setUsernameError(false); setUsernameHelperText(''); }
    if (editingUserId === null) {
      if (!password.trim()) { setPasswordError(true); setPasswordHelperText('Şifre boş bırakılamaz.'); hasValidationError = true; } else { setPasswordError(false); setPasswordHelperText(''); }
      if (!confirmPassword.trim()) { setConfirmPasswordError(true); setConfirmPasswordHelperText('Şifre tekrarı boş bırakılamaz.'); hasValidationError = true; } else { setConfirmPasswordError(false); setConfirmPasswordHelperText(''); }
      if (password !== confirmPassword) { setPasswordError(true); setConfirmPasswordError(true); setPasswordHelperText('Şifreler eşleşmiyor!'); setConfirmPasswordHelperText('Şifreler eşleşmiyor!'); hasValidationError = true; } else { if (passwordError || confirmPasswordError) { setPasswordError(false); setPasswordHelperText(''); setConfirmPasswordError(false); setConfirmPasswordHelperText(''); } }
    }
    if (selectedRoles.length === 0) { setRoleError(true); setRoleHelperText('rol seçilmelidir!'); hasValidationError = true; } else { setRoleError(false); setRoleHelperText(''); }

    if (hasValidationError) { showAlert('Lütfen tüm zorunlu alanları doğru şekilde doldurun!', 'warning'); return; }

    clearAlert();
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }

    let finalImageSrc = '';

    if (profileRawFile && profileRawFile.length > 0) {

      const fileToUpload = profileRawFile[0];

      if (fileToUpload) {
        const url = await uploadImage(fileToUpload, authToken, showAlert);

        if (url === null) { setLoadingButton(false); return; }
        finalImageSrc = url;
      }
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
          imageSrc: finalImageSrc,
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
    }
    catch (e: any) {
      if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
      else if (e.response?.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
      }
      else if (e.response?.data?.message == "username must be longer than or equal to 5 characters") {
        showAlert('Kullanıcı adı 5 karakterden uzun veya 5 karaktere eşit olmalıdır.', 'error');
      }
      else {

        showAlert('Kullanıcı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  };

  const editUser = async () => {
    if (editingUserId === null) return;
    let hasValidationError = false;

    if (!username.trim()) { setUsernameError(true); setUsernameHelperText('Kullanıcı adı boş olamaz!'); hasValidationError = true; } else { setUsernameError(false); setUsernameHelperText(''); }
    if (selectedRoles.length === 0) { setRoleError(true); setRoleHelperText('Lütfen en az bir rol seçin!'); hasValidationError = true; } else { setRoleError(false); setRoleHelperText(''); }

    if (hasValidationError) { showAlert('Lütfen tüm zorunlu alanları doğru şekilde doldurun!', 'warning'); return; }

    clearAlert();
    const authToken = localStorage.getItem('authToken');
    if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }

    let finalImageSrc = profileImageUrl;

    if (profileRawFile && profileRawFile.length > 0) {

      const fileToUpload = profileRawFile[0];
      if (fileToUpload) {
        const url = await uploadImage(fileToUpload, authToken, showAlert);

        if (url === null) { setLoadingButton(false); return; }
        finalImageSrc = url;
      }
    } else if (profileImageUrl === DEFAULT_IMAGE_URL) {
      finalImageSrc = "";
    }

    const updateData: {
      id: string;
      username: string;
      imageSrc?: string;
    } = {
      id: editingUserId,
      username: username,
      imageSrc: finalImageSrc,
    };

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
      if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
      else if (e.response?.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
      }
      else if (e.response?.data?.message == "username must be longer than or equal to 5 characters") {
        showAlert('Kullanıcı adı 5 karakterden uzun veya 5 karaktere eşit olmalıdır.', 'error');
      }
      else {

        showAlert('Kullanıcı güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  };

  const sendStatusUpdate = useCallback(async (userId: string, statusValue: number) => {
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
        const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
        getListUsers();
        showAlert(`Kullanıcı başarıyla ${statusText} olarak ayarlandı!`, 'success');
      } else {
        showAlert(response.data.message || 'Kullanıcı durumu güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      showAlert(e.response?.data?.message || 'Kullanıcı durumu güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      handleCloseMenu();
    }
  }, [clearAlert, showAlert, navigate, getListUsers, handleCloseMenu]);

  const handleStatusFilterChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'active' | 'inactive' | null,
  ) => {
    if (newFilter !== null) {
      console.log(event)
      setStatusFilter(newFilter);
      setPage(0);
    }
  }, []);

  const handleRoleFilterChange = useCallback((event: SelectChangeEvent<string>) => {
    const newRoleId = event.target.value;
    setSelectedRoleFilterId(newRoleId);
    setPage(0);
  }, []);

  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    console.log(event)
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  }, []);

  const handleRequestSort = useCallback((property: keyof UserType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  }, [order, orderBy]);

  const filteredUsers = useMemo(() => {
    return usersList.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.recordStatus === 0) ||
        (statusFilter === 'inactive' && user.recordStatus === 1);
      const matchesRole =
        selectedRoleFilterId === 'all' ||
        user.roles.some(role => role.id === selectedRoleFilterId && role.recordStatus === 0);
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [usersList, searchTerm, statusFilter, selectedRoleFilterId]);
  const sortedAndFilteredUsers = useMemo(() => {
    return stableSort(filteredUsers, getComparator(order, orderBy));
  }, [filteredUsers, order, orderBy]);

  const paginatedUsers = useMemo(() => {
    return sortedAndFilteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedAndFilteredUsers, page, rowsPerPage]);


  const handleCopyPassword = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(confirmPassword);
      showAlert('Şifre panoya kopyalandı!', 'success');
    } catch (err) {
      showAlert('Şifre kopyalanamadı. Lütfen manuel olarak kopyalayın.', 'error');
    }
  }, [confirmPassword, showAlert]);

  const handleRemoveProfileImage = useCallback(() => {
    setProfileRawFile([]);
    setProfileImageUrl(DEFAULT_IMAGE_URL);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    getListUsers();
    getListRoles();
  }, [getListUsers, getListRoles]);
  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>


        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Typography variant="h5" mb={2}>{editingUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Kaydı'}</Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="stretch"
            flexGrow={1}
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          >
            {!isFormVisible && hasCreatePermission && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Kullanıcı Belgesi kaydetmek için tıklayınız" : ""}>
                <BlinkingButton
                  variant="contained"
                  color="primary"
                  onClick={() => { setIsFormVisible(true); }}
                  isBlinking={isBlinking}
                  fullWidth={false}
                >
                  Yeni Kullanıcı Kaydet
                </BlinkingButton>
              </CustomTooltip>
            )}
            {isFormVisible && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={resetFormAndState}
                  fullWidth={false}
                  startIcon={<IconX size={20} />}
                >
                  Gizle
                </Button>
              </CustomTooltip>
            )}
          </Stack>
        </Stack>
        {((isFormVisible && hasCreatePermission) || (editingUserId && hasEditPermission)) && (
          <>
            <Grid container spacing={2}>

              <Grid item xs={12} sm={9}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <CustomFormLabel htmlFor="username" required>Kullanıcı Adı</CustomFormLabel>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcı adını girin" : ""}>
                      <CustomTextField
                        id="username"
                        placeholder="Kullanıcı Adı"
                        fullWidth
                        value={username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setUsername(e.target.value);
                          if (!e.target.value.trim()) {
                            setUsernameError(true);
                            setUsernameHelperText('Kullanıcı adı boş bırakılamaz.');
                          } else {
                            setUsernameError(false);
                            setUsernameHelperText('');
                          }
                        }}
                        inputProps={{ autocomplete: 'off' }}
                        inputRef={usernameFieldRef}
                        error={usernameError}
                        helperText={usernameHelperText}
                      />
                    </CustomTooltip>
                  </Grid>
                  {editingUserId === null && (
                    <>
                      <Grid item xs={12} md={6}>
                        <CustomFormLabel htmlFor="password" required>Şifre</CustomFormLabel>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Şifreyi girin" : ""}>
                          <CustomTextField
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Şifre"
                            fullWidth
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setPassword(e.target.value);
                              if (!e.target.value.trim()) {
                                setPasswordError(true);
                                setPasswordHelperText('Şifre boş bırakılamaz.');
                              } else {
                                setPasswordError(false);
                                setPasswordHelperText('');
                              }
                              if (e.target.value !== confirmPassword && confirmPassword.trim() !== '') {
                                setConfirmPasswordError(true);
                                setConfirmPasswordHelperText('Şifreler eşleşmiyor!');
                                setPasswordError(true);
                                setPasswordHelperText('Şifreler eşleşmiyor!');
                              } else {
                                if (passwordError || confirmPasswordError) {
                                  setPasswordError(false);
                                  setPasswordHelperText('');
                                  setConfirmPasswordError(false);
                                  setConfirmPasswordHelperText('');
                                }
                              }
                            }}
                            disabled={generateRandomPassword}
                            inputProps={{ autocomplete: 'new-password' }}
                            inputRef={passwordFieldRef}
                            error={passwordError}
                            helperText={passwordHelperText}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <CustomTooltip title={isTooltipGloballyEnabled ? "Şifreyi panoya kopyala" : ""}>
                                    <IconButton
                                      aria-label="copy password"
                                      onClick={handleCopyPassword}
                                      edge="end"
                                      size="small"
                                      disabled={!confirmPassword}
                                    >
                                      <IconCopy size={20} />
                                    </IconButton>
                                  </CustomTooltip>
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
                        <CustomFormLabel htmlFor="confirm-password" required>Şifreyi Tekrarla</CustomFormLabel>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Şifreyi tekrar girin" : ""}>
                          <CustomTextField
                            id="confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Şifreyi Tekrarla"
                            fullWidth
                            value={confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setConfirmPassword(e.target.value);
                              if (!e.target.value.trim()) {
                                setConfirmPasswordError(true);
                                setConfirmPasswordHelperText('Şifre tekrarı boş bırakılamaz.');
                              } else if (e.target.value !== password) {
                                setConfirmPasswordError(true);
                                setConfirmPasswordHelperText('Şifreler eşleşmiyor!');
                                setPasswordError(true);
                                setPasswordHelperText('Şifreler eşleşmiyor!');
                              }
                              else {
                                setConfirmPasswordError(false);
                                setConfirmPasswordHelperText('');
                                setPasswordError(false);
                                setPasswordHelperText('');
                              }
                            }}
                            disabled={generateRandomPassword}
                            error={confirmPasswordError}
                            helperText={confirmPasswordHelperText}
                            inputProps={{ autocomplete: 'new-password' }}
                            inputRef={confirmPasswordFieldRef}
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
                    </>
                  )}
                  {editingUserId === null && (
                    <Grid item xs={12} md={12}>
                      <CustomFormLabel htmlFor="select-roles" required>Roller</CustomFormLabel>
                      <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcının rollerini seçin" : ""}>
                        <FormControl fullWidth
                          error={roleError}>
                          <InputLabel id="roles-multiple-checkbox-label">Rolleri Seç</InputLabel>
                          <Select
                            labelId="roles-multiple-checkbox-label"
                            id="select-roles"
                            multiple
                            value={selectedRoles}
                            onChange={(e: SelectChangeEvent<string[]>) => {
                              setSelectedRoles(e.target.value as string[])
                              if (roleError) {
                                setRoleError(false);
                                setRoleHelperText('');
                              }
                            }}
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
                            {allRoles
                              .filter(role => role.recordStatus === 0)
                              .map((role) => (
                                <MuiMenuItem key={role.id} value={role.id}>
                                  <Checkbox checked={selectedRoles.indexOf(role.id) > -1} />
                                  <ListItemText primary={role.name} />
                                </MuiMenuItem>
                              ))}
                          </Select>
                          {roleHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{roleHelperText}</Typography>}
                        </FormControl>
                      </CustomTooltip>
                    </Grid>
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12} sm={3} display="flex" flexDirection="column" alignItems="center" justifyContent="center">

                <Box position="relative" sx={{ width: 200, height: 200, mb: 1 }}>
                  <CardMedia
                    component="img"
                    sx={{ width: 200, height: 200, borderRadius: '50%', objectFit: 'cover', border: '2px solid', borderColor: 'primary.main' }}
                    image={profileImageUrl}
                    alt="Profile Picture"
                  />
                  {profileImageUrl !== DEFAULT_IMAGE_URL && (
                    <CustomTooltip title="Resmi Kaldır">
                      <IconButton
                        sx={{
                          position: 'absolute',
                          bottom: 5,
                          right: 5,
                          backgroundColor: 'error.main',
                          color: 'white',
                          '&:hover': { backgroundColor: 'error.dark' },
                          p: 0.8,
                          zIndex: 10,
                        }}
                        onClick={handleRemoveProfileImage}
                        size="small"
                      >
                        <IconX size={16} />
                      </IconButton>
                    </CustomTooltip>
                  )}
                </Box>
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
                    {profileImageUrl !== DEFAULT_IMAGE_URL ? "Resmi Değiştir" : "Resim Seç"}
                  </Button>
                </CustomTooltip>
              </Grid>
            </Grid>


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
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
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
                <>
                  {hasCreatePermission && (
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir kullanıcı ekle" : ""}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={insertUser}
                        disabled={loadingButton}
                      >
                        {loadingButton ? <>
                          <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                        </> : 'Yeni Kullanıcı Ekle'}
                      </Button>
                    </CustomTooltip>
                  )}
                </>
              )}
            </Stack>
          </>
        )}
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
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={6}>
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
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel id="role-filter-label">Rol Fİltrele</InputLabel>
                <Select
                  labelId="role-filter-label"
                  id="role-filter-select"
                  value={selectedRoleFilterId}
                  label="Rol Fİltrele"
                  onChange={handleRoleFilterChange}
                >
                  <MuiMenuItem value="all">Tümü</MuiMenuItem>
                  {allRoles.filter(role => role.recordStatus === 0).map(role => (
                    <MuiMenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MuiMenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Status filter"
                fullWidth
              >
                <StyledToggleButton
                  value="all"
                  aria-label="all units"
                >
                  Tümü
                </StyledToggleButton>
                <StyledToggleButton
                  value="active"
                  aria-label="active units"
                >
                  Aktif
                </StyledToggleButton>
                <StyledToggleButton
                  value="inactive"
                  aria-label="inactive units"
                >
                  Pasif
                </StyledToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          {loadingData ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>Kullanıcılar yükleniyor...</Typography>
            </Box>
          ) : (
            <Table aria-label="user table">
              <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                <TableRow>
                  <StyledTableCell style={{ color: "#171c23" }}>
                    <Typography variant="h6">Resim</Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <TableSortLabel
                      active={orderBy === 'username'}
                      direction={orderBy === 'username' ? order : 'asc'}
                      onClick={() => handleRequestSort('username')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Kullanıcı Adı</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell style={{ color: "#171c23" }}>
                    <Typography variant="h6">Rolleri</Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <TableSortLabel
                      active={orderBy === 'createAt'}
                      direction={orderBy === 'createAt' ? order : 'asc'}
                      onClick={() => handleRequestSort('createAt')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Oluşturulma Tarihi</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Durum</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell></StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((row) => (
                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <StyledTableCell>
                        <CardMedia
                          component="img"
                          sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                          image={getFullImageUrl(row.imageUrl)}
                          alt="User Picture"
                        />
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="body1">{row.username}</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {row.roles && row.roles.length > 0 ? (
                            row.roles.map((role, index) => {
                              const isRoleInactive = role.recordStatus === 1;
                              const chipColor = isRoleInactive ? 'error' : 'success';

                              return (
                                <CustomTooltip
                                  key={role.id || index}
                                  title={isRoleInactive ? `Bu rol (${role.name}) şu anda aktif değil.` : isTooltipGloballyEnabled ? role.name : ""}
                                  disableHoverListener={!isRoleInactive && !isTooltipGloballyEnabled}
                                >
                                  <Chip
                                    label={role.name}
                                    size="small"
                                    color={chipColor}
                                    variant={isRoleInactive ? 'outlined' : 'filled'}
                                    sx={{
                                      opacity: isRoleInactive ? 0.7 : 1,
                                      borderColor: isRoleInactive ? 'error.main' : (theme) => theme.palette.success.main,
                                    }}
                                  />
                                </CustomTooltip>
                              );
                            })
                          ) : (
                            <Chip
                              label="Rol Yok"
                              size="small"
                              sx={{
                                backgroundColor: (theme) => theme.palette.grey[300],
                                color: (theme) => theme.palette.text.secondary
                              }}
                            />
                          )}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
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
                      </StyledTableCell>
                      <StyledTableCell>
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
                          MenuListProps={{ 'aria-labelledby': `basic-button-${selectedUserForMenu?.id}` }}
                        >
                          {hasEditPermission && selectedUserForMenu?.recordStatus === 0 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kullanıcıyı pasif yap" : ""}>
                              <MuiMenuItem onClick={() => sendStatusUpdate(selectedUserForMenu.id, 1)}>
                                <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon>
                                Pasif Yap
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasEditPermission && selectedUserForMenu?.recordStatus === 1 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kullanıcıyı aktif yap" : ""}>
                              <MuiMenuItem onClick={() => sendStatusUpdate(selectedUserForMenu!.id, 0)}>
                                <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon>
                                Aktif Yap
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasChangePassPermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kullanıcının şifresini değiştir" : ""}>
                              <MuiMenuItem onClick={handleClickOpenChangePasswordModal}>
                                <ListItemIcon><IconKey width={18} /></ListItemIcon>
                                Şifre Değiştir
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasChangeRoleOpPermission && (
                            <>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kullanıcının rollerini yönet" : ""}>
                                <MuiMenuItem onClick={handleClickOpenRoleModal}>
                                  <ListItemIcon><IconUsersGroup width={18} /></ListItemIcon>
                                  Rolleri Seç
                                </MuiMenuItem>
                              </CustomTooltip>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kullanıcının operasyonlarını yönet" : ""}>
                                <MuiMenuItem onClick={handleClickOpenOperationsModal}>
                                  <ListItemIcon><IconLock width={18} /></ListItemIcon>
                                  Operasyonları Seç
                                </MuiMenuItem>
                              </CustomTooltip>
                            </>
                          )}
                          {hasEditPermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kullanıcı bilgilerini düzenle" : ""}>
                              <MuiMenuItem onClick={handleEditItemClick}>
                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                Düzenlemek
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasDeletePermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kullanıcıyı sil" : ""}>
                              <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                Silmek
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                        </Menu>
                      </StyledTableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <StyledTableCell colSpan={6} align="center">
                      <Typography variant="subtitle1" color="textSecondary">
                        Hiç kullanıcı bulunamadı.
                      </Typography>
                    </StyledTableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={sortedAndFilteredUsers.length}
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