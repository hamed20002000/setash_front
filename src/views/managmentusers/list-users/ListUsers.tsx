// ListUsers.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, Checkbox, InputAdornment, TablePagination,
  TextField,
  FormControl, InputLabel, Select, OutlinedInput,
  CardMedia, FormControlLabel, ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  TableSortLabel, // ✅ اضافه شد: برای آیکون‌های مرتب‌سازی
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
  IconDots, IconEdit, IconTrash, IconEye, IconEyeOff, IconKey, IconUsersGroup, IconLock, IconSearch,
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

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

interface UserType {
  id: string;
  username: string;
  email?: string;
  status: string; // این برای نمایش وضعیت string استفاده می‌شود
  recordStatus: number; // 0 = Aktif, 1 = Etkin değil, 2 = Silindi
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

// توابع کمکی برای مرتب‌سازی (همانند فایل‌های قبلی)
// این توابع بهتر است در یک فایل utility جداگانه قرار گیرند اگر در چندین کامپوننت استفاده می‌شوند.
const descendingComparator = <T, Key extends keyof T>(
  a: T,
  b: T,
  orderBy: Key,
): number => {
  const valA = a[orderBy];
  const valB = b[orderBy];

  // Handle undefined/null values by pushing them to the end (or beginning) of the sort order
  if (valB === undefined || valB === null) {
    return valA === undefined || valA === null ? 0 : -1;
  }
  if (valA === undefined || valA === null) {
    return 1;
  }

  // Specific handling for string and number types
  if (typeof valB === 'string' && typeof valA === 'string') {
    return valB.localeCompare(valA);
  }
  if (typeof valB === 'number' && typeof valA === 'number') {
    return valB - valA;
  }
  // Fallback to string comparison for other types or mixed types
  if (String(valB) < String(valA)) {
    return -1;
  }
  if (String(valB) > String(valA)) {
    return 1;
  }
  return 0;
};

const getComparator = <Key extends keyof UserType>( // اینجا UserType را استفاده می‌کنیم
  order: 'asc' | 'desc',
  orderBy: Key,
): (a: UserType, b: UserType) => number => { // و اینجا UserType
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
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [allRoles, setAllRoles] = useState<RoleType[]>([]);
  const [profileImageBase64, setProfileImageBase64] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState<string>(DEFAULT_IMAGE_URL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserForMenu, setSelectedUserForMenu] = useState<UserType | null>(null);
  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null);

  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [userIdForRoleSelection, setUserIdForRoleSelection] = useState<string | null>(null);

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

  const { isTooltipGloballyEnabled } = useTooltip();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // ✅ اضافه شد: وضعیت برای مرتب‌سازی
  const [orderBy, setOrderBy] = useState<keyof UserType>('createAt'); // ستون پیش‌فرض برای مرتب‌سازی
  const [order, setOrder] = useState<'asc' | 'desc'>('desc'); // جهت پیش‌فرض مرتب‌سازی

  // **State های جدید برای مدیریت خطاهای ورودی**
  const [usernameError, setUsernameError] = useState<boolean>(false);
  const [usernameHelperText, setUsernameHelperText] = useState<string>('');
  const [roleError, setRoleError] = useState<boolean>(false);
  const [roleHelperText, setRoleHelperText] = useState<string>('');
  const [passwordError, setPasswordError] = useState<boolean>(false);
  const [passwordHelperText, setPasswordHelperText] = useState<string>('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(false);
  const [confirmPasswordHelperText, setConfirmPasswordHelperText] = useState<string>('');


  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => { debugger
    setAlertMessage(message);
    setAlertSeverity(severity);
  };

  const clearAlert = () => {
    setAlertMessage(null);
  };

  // useEffect برای بستن خودکار Alert
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (alertMessage) {
      timer = setTimeout(() => {
        clearAlert();
      }, 5000); // 5000 milliseconds = 5 seconds
    }
    return () => {
      clearTimeout(timer); // پاک کردن تایمر در صورت unmount شدن کامپوننت یا تغییر alertMessage
    };
  }, [alertMessage]);

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
      setUserIdToDelete(Number(selectedUserForMenu.id));
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
      setUserIdForOperationsSelection(Number(selectedUserForMenu.id));
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
    const num ='0123456789';
    let newPass = '';
    for (let i = 0; i < 10; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    for(let j=0;j<2;j++){
      newPass += num.charAt(Math.floor(Math.random() * num.length));
    }
    setPassword(newPass);
    setConfirmPassword(newPass);
  };

  const handleRandomPasswordCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGenerateRandomPassword(event.target.checked);
    if (event.target.checked) {
      generateRandomPass();
      setPasswordError(false); // Clear password error when generating random
      setPasswordHelperText('');
      setConfirmPasswordError(false); // Clear confirm password error
      setConfirmPasswordHelperText('');
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
    // clearAlert();

    // **پاک کردن وضعیت خطاها**
    setUsernameError(false);
    setUsernameHelperText('');
    setRoleError(false);
    setRoleHelperText('');
    setPasswordError(false);
    setPasswordHelperText('');
    setConfirmPasswordError(false);
    setConfirmPasswordHelperText('');

    setTimeout(() => {
      if (usernameFieldRef.current) usernameFieldRef.current.value = '';
      if (passwordFieldRef.current) passwordFieldRef.current.value = '';
      if (confirmPasswordFieldRef.current) confirmPasswordFieldRef.current.value = '';
    }, 0);
  };

  const handleEditItemClick = () => {
    if (selectedUserForMenu) {
      setUsername(selectedUserForMenu.username);
      setEditingUserId(Number(selectedUserForMenu.id));

      setProfileImageUrl(selectedUserForMenu.imageUrl || DEFAULT_IMAGE_URL);
      setProfileImageBase64('');

      // در حالت ویرایش، فیلدهای رمز عبور خالی می‌شوند و چک‌باکس تصادفی غیرفعال می‌شود
      setPassword('');
      setConfirmPassword('');
      setGenerateRandomPassword(false);

      // نقش‌های فعلی کاربر را انتخاب می‌کند
      const currentRoleIds = selectedUserForMenu.roles.map(role => role.id);
      setSelectedRoles(currentRoleIds);
    }
    handleCloseMenu();
    clearAlert();

    // **پاک کردن وضعیت خطاها هنگام ویرایش**
    setUsernameError(false);
    setUsernameHelperText('');
    setRoleError(false);
    setRoleHelperText('');
    setPasswordError(false);
    setPasswordHelperText('');
    setConfirmPasswordError(false);
    setConfirmPasswordHelperText('');


    setTimeout(() => {
      // ✅ اضافه شد: اسکرول به کادر ویرایش نام کاربری و فوکوس بر روی آن
      usernameFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      usernameFieldRef.current?.focus();

      // مطمئن شوید که فیلدهای رمز عبور خالی هستند، حتی اگر رفرنس آنها بلافاصله آماده نباشد
      if (passwordFieldRef.current) passwordFieldRef.current.value = '';
      if (confirmPasswordFieldRef.current) confirmPasswordFieldRef.current.value = '';
    }, 100); // تاخیر اندکی برای اطمینان از رندر شدن DOM
  };


  const insertUser = async () => {
    let hasValidationError = false; // ✅ تغییر: نام متغیر به جای hasError برای جلوگیری از تداخل با متغیر های خود کنترل کننده خطا

    // **اعتبارسنجی فیلد نام کاربری**
    if (!username.trim()) {
      setUsernameError(true);
      setUsernameHelperText('Kullanıcı adı boş bırakılamaz.');
      hasValidationError = true;
    } else {
      setUsernameError(false);
      setUsernameHelperText('');
    }

    if (editingUserId === null) {
      if (!password.trim()) {
        setPasswordError(true);
        setPasswordHelperText('Şifre boş bırakılamaz.');
        hasValidationError = true;
      } else {
        setPasswordError(false);
        setPasswordHelperText('');
      }

      if (!confirmPassword.trim()) {
        setConfirmPasswordError(true);
        setConfirmPasswordHelperText('Şifre tekrarı boş bırakılamaz.');
        hasValidationError = true;
      } else {
        setConfirmPasswordError(false);
        setConfirmPasswordHelperText('');
      }

      if (password !== confirmPassword) {
        setPasswordError(true);
        setConfirmPasswordError(true);
        setPasswordHelperText('Şifreler eşleşmiyor!');
        setConfirmPasswordHelperText('Şifreler eşleşmiyor!');
        hasValidationError = true; // ✅ تغییر: این را به hasValidationError اضافه کنید تا از ارسال جلوگیری شود
      } else {
        // اگر قبلاً خطا بوده و حالا مطابق شده، خطاها را پاک کنید
        if (passwordError || confirmPasswordError) {
          setPasswordError(false);
          setPasswordHelperText('');
          setConfirmPasswordError(false);
          setConfirmPasswordHelperText('');
        }
      }
    }
    if (selectedRoles.length==0) {debugger
      setRoleError(true);
      setRoleHelperText('rol seçilmelidir!');
      hasValidationError = true;
    } else {
      setRoleError(false);
      setRoleHelperText('');
    }


    if (hasValidationError) { // ✅ تغییر: بررسی hasValidationError
      showAlert('Lütfen tüm zorunlu alanları doğru şekilde doldurun!', 'warning');
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
    } catch (e: any) {debugger
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error inserting user:", e);
      showAlert((e.response?.data?.message=="Password must contain at least one lowercase letter."?"Şifre en az bir küçük harf içermelidir.":
        (e.response?.data?.message=="Password must contain at least one lowercase letter."?"Şifrede en az bir küçük harf bulunmalı.":
          (e.response?.data?.message=="username must be longer than or equal to 5 characters"?"Kullanıcı adı en az 5 karakter olmalıdır.":
            (e.response?.data?.message=="Some roles not found"?"Rol seçilmedi.":e.response?.data?.message)
          )))
       || 'Kullanıcı eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editUser = async () => {
    if (editingUserId === null) return;
    let hasValidationError = false; // ✅ تغییر: نام متغیر

    // **اعتبارسنجی فیلد نام کاربری برای ویرایش**
    if (!username.trim()) {
      setUsernameError(true);
      setUsernameHelperText('Kullanıcı adı boş olamaz!');
      hasValidationError = true;
    } else {
      setUsernameError(false);
      setUsernameHelperText('');
    }

    if (hasValidationError) { // ✅ تغییر: بررسی hasValidationError
      showAlert('Lütfen tüm zorunlu alanları doğru şekilde doldurun!', 'warning');
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
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error updating user:", e);
      showAlert((e.response?.data?.message=="Password must contain at least one lowercase letter."?"Şifre en az bir küçük harf içermelidir.":
        (e.response?.data?.message=="Password must contain at least one lowercase letter."?"Şifrede en az bir küçük harf bulunmalı.":
          (e.response?.data?.message=="username must be longer than or equal to 5 characters"?"Kullanıcı adı en az 5 karakter olmalıdır.":
            (e.response?.data?.message=="Some roles not found"?"Rol seçilmedi.":e.response?.data?.message)
          )))
       || 'Kullanıcı eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
      if (result.data.httpStatusCode === 200) {
        const formattedData = result.data.data.map((item: any) => ({
          id: item.id,
          username: item.username,
          createAt: item.createAt,
          // اطمینان از اینکه recordStatus همیشه یک عدد است.
          recordStatus: item.recordStatus !== undefined && item.recordStatus !== null ? item.recordStatus : 0,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Etkin değil' : 'Silindi',
          imageUrl: item.imageSrc || DEFAULT_IMAGE_URL,
          roles: item.roles || [],
        }));
        // حذف مرتب‌سازی اولیه از اینجا، زیرا مرتب‌سازی نهایی پایین‌تر انجام می‌شود.
        setUsersList(formattedData as UserType[]);
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
      showAlert('Roller alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    }
  };

  useEffect(() => {
    getListUsers();
    getListRoles();
  }, []);


  const handleStatusFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'active' | 'inactive' | null,
  ) => {
    if (newFilter !== null) {
      console.log(event)
      setStatusFilter(newFilter);
      setPage(0);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    console.log(event)
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

  // ✅ اضافه شد: هندلر برای تغییر مرتب‌سازی
  const handleRequestSort = (property: keyof UserType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // هنگام تغییر مرتب‌سازی، به صفحه اول برگرد
  };


  const filteredUsers = usersList.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.recordStatus === 0) ||
      (statusFilter === 'inactive' && user.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  // ✅ اعمال مرتب‌سازی بر روی داده‌های فیلتر شده
  const sortedAndFilteredUsers = stableSort(filteredUsers, getComparator(order, orderBy));

  const paginatedUsers = sortedAndFilteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setUsername(e.target.value);
                      // ✅ تغییر: اعتبار سنجی لحظه ای نام کاربری
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
                    <CustomFormLabel htmlFor="password">Şifre</CustomFormLabel>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Şifreyi girin" : ""}>
                      <CustomTextField
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Şifre"
                        fullWidth
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setPassword(e.target.value);
                          // ✅ تغییر: اعتبار سنجی لحظه ای رمز عبور
                          if (!e.target.value.trim()) {
                            setPasswordError(true);
                            setPasswordHelperText('Şifre boş bırakılamaz.');
                          } else {
                            setPasswordError(false);
                            setPasswordHelperText('');
                          }
                          // ✅ تغییر: بررسی تطابق رمز عبور به محض تغییر
                          if (e.target.value !== confirmPassword && confirmPassword.trim() !== '') {
                            setConfirmPasswordError(true);
                            setConfirmPasswordHelperText('Şifreler eşleşmiyor!');
                            setPasswordError(true); // خطا را روی فیلد پسورد هم اعمال کنید
                          } else {
                            setConfirmPasswordError(false);
                            setConfirmPasswordHelperText('');
                            if (e.target.value === confirmPassword && e.target.value.trim() !== '') { // اگر حالا مطابق شدند و خالی نیستند
                                setPasswordError(false);
                                setPasswordHelperText('');
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setConfirmPassword(e.target.value);
                          // ✅ تغییر: اعتبار سنجی لحظه ای تایید رمز عبور
                          if (!e.target.value.trim()) {
                            setConfirmPasswordError(true);
                            setConfirmPasswordHelperText('Şifre tekrarı boş bırakılamaz.');
                          } else if (e.target.value !== password) {
                            setConfirmPasswordError(true);
                            setConfirmPasswordHelperText('Şifreler eşleşmiyor!');
                            setPasswordError(true); // خطا را روی فیلد پسورد هم اعمال کنید
                            setPasswordHelperText('Şifreler eşleşmiyor!'); // و پیام را نشان دهید
                          }
                          else {
                            setConfirmPasswordError(false);
                            setConfirmPasswordHelperText('');
                            setPasswordError(false); // اگر حالا مطابق شدند، خطا را از پسورد هم بردارید
                            setPasswordHelperText('');
                          }
                        }}
                        disabled={generateRandomPassword}
                        // ✅ تغییر: error و helperText اکنون بر اساس state های جداگانه تنظیم می شوند
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
                  <Grid item xs={12} md={12}>
                    <CustomFormLabel htmlFor="select-roles">Roller</CustomFormLabel>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Kullanıcının rollerini seçin" : ""}>
                      <FormControl fullWidth 
                        error={roleError}>
                        <InputLabel id="roles-multiple-checkbox-label">Rolleri Seç</InputLabel>
                        <Select
                          labelId="roles-multiple-checkbox-label"
                          id="select-roles"
                          multiple
                          value={selectedRoles}
                          onChange={(e) => {
                            setSelectedRoles(e.target.value as number[])
                            if (roleError) { // Clear error when a unit is selected
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
                          {allRoles.map((role) => (
                            <MenuItem key={role.id} value={role.id}>
                              <Checkbox checked={selectedRoles.indexOf(role.id) > -1} />
                              <ListItemText primary={role.name} />
                            </MenuItem>
                          ))}
                        </Select>
                        {roleHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{roleHelperText}</Typography>}
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
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={8}>
              <TextField
                label="Birim Ara"
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
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Status filter"
                fullWidth
              >
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm birimleri göster" : ""}>
                  <ToggleButton
                    value="all"
                    aria-label="all units"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.primary.main + ' !important',
                        color: 'white !important',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.primary.dark + ' !important',
                        },
                      },
                      '&:not(.Mui-selected)': {
                        color: (theme) => theme.palette.text.primary,
                        borderColor: (theme) => theme.palette.divider,
                      },
                    }}
                  >
                    Tümü
                  </ToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif birimleri göster" : ""}>
                  <ToggleButton
                    value="active"
                    aria-label="active units"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.success.main + ' !important',
                        color: 'white !important',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.success.dark + ' !important',
                        },
                      },
                      '&:not(.Mui-selected)': {
                        color: (theme) => theme.palette.text.primary,
                        borderColor: (theme) => theme.palette.divider,
                      },
                    }}
                  >
                    Aktif
                  </ToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif birimleri göster" : ""}>
                  <ToggleButton
                    value="inactive"
                    aria-label="inactive units"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.error.main + ' !important',
                        color: 'white !important',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.error.dark + ' !important',
                        },
                      },
                      '&:not(.Mui-selected)': {
                        color: (theme) => theme.palette.text.primary,
                        borderColor: (theme) => theme.palette.divider,
                      },
                    }}
                  >
                    Etkin Değil
                  </ToggleButton>
                </CustomTooltip>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          <Table aria-label="user table">
            <TableHead style={{ background: "#f1f1f1" }}>
              <TableRow>
                <TableCell 
                      style={{color: "#171c23"}}>
                  <Typography variant="h6">Resim</Typography>
                </TableCell>
                <TableCell>
                  {/* ✅ اضافه شد: TableSortLabel برای ستون Kullanıcı Adı */}
                  <TableSortLabel
                    active={orderBy === 'username'}
                    direction={orderBy === 'username' ? order : 'asc'}
                    onClick={() => handleRequestSort('username')}
                      style={{color: "#171c23"}}
                  >
                    <Typography variant="h6">Kullanıcı Adı</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                      style={{color: "#171c23"}}>
                  <Typography variant="h6">Rolleri</Typography>
                </TableCell>
                <TableCell>
                  {/* ✅ اضافه شد: TableSortLabel برای ستون Oluşturulma Tarihi */}
                  <TableSortLabel
                    active={orderBy === 'createAt'}
                    direction={orderBy === 'createAt' ? order : 'asc'}
                    onClick={() => handleRequestSort('createAt')}
                      style={{color: "#171c23"}}
                  >
                    <Typography variant="h6">Oluşturulma Tarihi</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  {/* ✅ اضافه شد: TableSortLabel برای ستون Durum */}
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                      style={{color: "#171c23"}}
                  >
                    <Typography variant="h6">Durum</Typography>
                  </TableSortLabel>
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
                          sx={{
                            mr: 0.5, mb: 0.5,
                            backgroundColor: (theme) => theme.palette.error.dark,
                            color: (theme) => theme.palette.error.contrastText
                          }}
                        />
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
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Kullanıcıyı pasif yap" : ""}>
                            <MenuItem onClick={() => sendStatusUpdate(Number(selectedUserForMenu.id), 1)}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Pasif Yap
                            </MenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Kullanıcıyı aktif yap" : ""}>
                            <MenuItem onClick={() => sendStatusUpdate(Number(selectedUserForMenu!.id), 0)}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif Yap
                            </MenuItem>
                          </CustomTooltip>
                        )}

                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Kullanıcının şifresini değiştir" : ""}>
                          <MenuItem onClick={handleClickOpenChangePasswordModal}>
                            <ListItemIcon>
                              <IconKey width={18} />
                            </ListItemIcon>
                            Şifre Değiştir
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Kullanıcının rollerini yönet" : ""}>
                          <MenuItem onClick={handleClickOpenRoleModal}>
                            <ListItemIcon>
                              <IconUsersGroup width={18} />
                            </ListItemIcon>
                            Rolleri Seç
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Kullanıcının operasyonlarını yönet" : ""}>
                          <MenuItem onClick={handleClickOpenOperationsModal}>
                            <ListItemIcon>
                              <IconLock width={18} />
                            </ListItemIcon>
                            Operasyonları Seç
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Kullanıcı bilgilerini düzenle" : ""}>
                          <MenuItem onClick={handleEditItemClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MenuItem>
                        </CustomTooltip>

                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Kullanıcıyı sil" : ""}>
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
                  <TableCell colSpan={6} align="center"> {/* اینجا تعداد ستون‌ها را به 6 تغییر دادم */}
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