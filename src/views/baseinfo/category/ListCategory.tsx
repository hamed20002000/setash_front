// ListCategory.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Chip,
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  Box,
  Stack,
  Grid,
  Button,
  Alert,
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  ToggleButtonGroup,
  ToggleButton as MuiToggleButton,
  TableSortLabel,
} from '@mui/material';
import { styled } from '@mui/material/styles';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch, IconChevronRight }
  from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteCategory from './DeleteCategory';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import { useAuth } from 'src/context/AuthContext';
// --- Updated Interface for API response and internal use ---
interface ApiCategoryType {
  id: string;
  name: string;
  // code: string; // 🔴 حذف شد: فیلد code از اینترفیس ApiCategoryType
  depth: number;
  recordStatus: number;
  createAt: string;
  parentId: string | null;
  categories?: ApiCategoryType[];
}

interface CategoryType {
  id: string;
  name: string;
  // code: string; // 🔴 حذف شد: فیلد code از اینترفیس CategoryType
  createAt: string;
  recordStatus: number;
  status: string; // Derived from recordStatus
  parentId: string | null;
  depth: number;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  depth: number;
}

// **ToggleButton سفارشی با استایل‌های شرطی**
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

// --- Helper functions for sorting, reused from previous components ---
// Define a new type for the sortable keys
type SortableCategoryKeys = keyof Pick<CategoryType, 'name' | 'createAt' | 'status' | 'depth'>; // 🔴 'code' حذف شد

const descendingComparator = <T, Key extends keyof T>(
  a: T,
  b: T,
  orderBy: Key,
): number => {
  const valA = a[orderBy];
  const valB = b[orderBy];

  if (valB === undefined || valB === null) {
    return (valA === undefined || valA === null) ? 0 : -1;
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

const getComparator = (
  order: 'asc' | 'desc',
  orderBy: SortableCategoryKeys,
): (a: CategoryType, b: CategoryType) => number => {
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
// --- End of Helper functions for sorting ---


const ListCategory = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  // const [code, setCode] = useState<string>(''); // 🔴 حذف شد: State برای code
  // داده‌های اصلی و کامل از API به صورت Nested
  const [rawApiCategories, setRawApiCategories] = useState<ApiCategoryType[]>([]);
  // دسته‌بندی‌هایی که در جدول فعلی نمایش داده می‌شوند (فقط زیرمجموعه‌های مستقیم والد فعلی)
  const [displayedCategories, setDisplayedCategories] = useState<CategoryType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<CategoryType | null>(null);

  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const { isTooltipGloballyEnabled } = useTooltip();

  // دسته‌بندی والد فعلی که زیرمجموعه‌های آن نمایش داده می‌شوند
  const [currentParentCategory, setCurrentParentCategory] = useState<CategoryType | null>(null);
  // مسیر Breadcrumb
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Tüm Kategoriler', depth: -1 },
  ]);

  const MAX_BREADCRUMB_ITEMS = 4;

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // ✅ Added: State for sorting
  const [orderBy, setOrderBy] = useState<SortableCategoryKeys>('createAt'); // Default sort column
  const [order, setOrder] = useState<'asc' | 'desc'>('desc'); // Default sort direction

  // ✅ Added: Ref for the category name input field
  const categoryNameInputRef = useRef<HTMLInputElement>(null);

  // **State جدید برای مدیریت خطای ورودی نام**
  const [nameError, setNameError] = useState<boolean>(false);
  const [nameHelperText, setNameHelperText] = useState<string>('');


  const { allowedOperations } = useAuth();
  const hasCreatePermission = useMemo(() => {
    return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
  }, [allowedOperations]);

  const hasEditPermission = useMemo(() => {
    return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
  }, [allowedOperations]);

  const hasDeletePermission = useMemo(() => {
    return allowedOperations.some(op => op.systemOperationName === 'Silmek');
  }, [allowedOperations]);


  // تابع کمکی برای پیدا کردن یک دسته‌بندی بر اساس ID در ساختار Nested (بازگشتی)
  const findCategoryById = useCallback((categories: ApiCategoryType[], id: string): ApiCategoryType | undefined => {
    for (const cat of categories) {
      if (cat.id === id) {
        return cat;
      }
      if (cat.categories && cat.categories.length > 0) {
        const found = findCategoryById(cat.categories, id);
        if (found) return found;
      }
    }
    return undefined;
  }, []);


  const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
      console.log("Tarih biçimlendirilirken hata oluştu:", e);
      return "Geçersiz Tarih";
    }
  };


  // تابع کمکی برای استخراج زیرمجموعه‌های مستقیم یک دسته‌بندی خاص
  const getDirectChildrenOfParent = useCallback((categories: ApiCategoryType[], parentId: string | null): CategoryType[] => {
    let directChildren: CategoryType[] = [];
    if (parentId === null) {
      // برای دسته‌بندی‌های سطح اول (والد null)
      directChildren = categories.filter(cat => cat.parentId === null).map(cat => ({
        id: cat.id,
        name: cat.name,
        // code: cat.code, // 🔴 حذف شد
        createAt: cat.createAt,
        recordStatus: cat.recordStatus,
        status: cat.recordStatus === 0 ? 'Aktif' : cat.recordStatus === 1 ? 'Pasif' : 'Silindi',
        parentId: cat.parentId,
        depth: cat.depth,
      }));
    } else {
      // برای زیرمجموعه‌های یک والد خاص، ابتدا والد را پیدا کرده و سپس از آرایه `categories` آن استفاده می‌کنیم.
      const parent = findCategoryById(categories, parentId);
      if (parent && parent.categories) {
        directChildren = parent.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          // code: cat.code, // 🔴 حذف شد
          createAt: cat.createAt,
          recordStatus: cat.recordStatus,
          status: cat.recordStatus === 0 ? 'Aktif' : cat.recordStatus === 1 ? 'Pasif' : 'Silindi',
          parentId: cat.parentId,
          depth: cat.depth,
        }));
      }
    }
    return directChildren;
  }, [findCategoryById]);

  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CategoryType) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  };

  const handleClickOpenDeleteModal = () => {
    if (selectedRowForMenu) {
      setCategoryIdToDelete(selectedRowForMenu.id);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setCategoryIdToDelete(null);
    // پس از حذف، داده‌ها را دوباره از API واکشی کن
    fetchCategories();
  };

  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  };

  const clearAlert = () => {
    setAlertMessage(null);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (alertMessage) {
      timer = setTimeout(() => {
        clearAlert();
      }, 5000); // 5000 milliseconds = 5 seconds
    }
    return () => {
      clearTimeout(timer); // Clear the timer if the component unmounts or alertMessage changes
    };
  }, [alertMessage]);

  const handleEditClick = () => {
    if (selectedRowForMenu) {
      setName(selectedRowForMenu.name);
      // setCode(selectedRowForMenu.code); // 🔴 حذف شد: ست کردن code هنگام ویرایش

      setEditingId(selectedRowForMenu.id);
      setEditingParentId(selectedRowForMenu.parentId);

      // **پاک کردن وضعیت خطاها هنگام ویرایش**
      setNameError(false);
      setNameHelperText('');
      // setCodeError(false); // 🔴 پاک کردن خطای code
      // setCodeHelperText(''); // 🔴 پاک کردن متن کمکی code

      // ✅ Added: Scroll to the category name input and focus
      setTimeout(() => {
        categoryNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        categoryNameInputRef.current?.focus();
      }, 100); // Small delay to ensure DOM update
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    // **پاک کردن وضعیت خطاها**
    setNameError(false);
    setNameHelperText('');
    // setCodeError(false); // 🔴 پاک کردن خطای code
    // setCodeHelperText(''); // 🔴 پاک کردن متن کمکی code
  };

  // --- توابع فراخوانی API ---
  const fetchCategories = async () => {
    setLoadingData(true);
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
      navigate("/");
      showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      setLoadingData(false);
      return false;
    }

    try {
      const response = await axios.request<{ httpStatusCode: number; data: ApiCategoryType[]; message?: string }>({
        baseURL: server.baseurl + server.baseinfo + "get-categories",
        method: "get",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.data.httpStatusCode === 200) {
        setRawApiCategories(response.data.data);
        return true;
      } else {
        showAlert(response.data.message || 'Kategoriler yüklenirken bir hata oluştu.', 'error');
        return false;
      }
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Kategoriler getirilirken hata oluştu:", e);
        showAlert('Kategoriler yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
      return false;
    } finally {
      setLoadingData(false);
    }
  };


  const insertCategory = async () => {
    if (!name.trim()) {
      setNameError(true); // تنظیم وضعیت خطا به true
      setNameHelperText('Kategori adı boş bırakılamaz!'); // تنظیم پیام کمکی
      showAlert('İsim boş bırakılamaz!', 'warning');
      return;
    }
    setNameError(false); // در صورت معتبر بودن، خطا را پاک کنید
    setNameHelperText(''); // در صورت معتبر بودن، پیام کمکی را پاک کنید

    // 🔴 حذف شد: اعتبارسنجی فیلد Code
    // if (!code.trim()) {
    //   setCodeError(true);
    //   setCodeHelperText('Kategori kodu boş bırakılamaz!');
    //   showAlert('Kod boş bırakılamaz!', 'warning');
    //   return;
    // }
    // setCodeError(false);
    // setCodeHelperText('');

    clearAlert();
    setLoadingButton(true);

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
      setLoadingButton(false);
      return;
    }

    try {
      // تعیین عمق و parentId دسته‌بندی جدید
      const categoryParentId = currentParentCategory ? currentParentCategory.id : null; // ParentId should be null for top-level categories

      // داده‌هایی که باید به API ارسال شوند
      const newCategoryData = {
        name: name,
        // code: code, // 🔴 حذف شد: ارسال code به API
        // API expects `parentId` as number if it's not null, or 0 if it's null (or simply omit)
        parentId: categoryParentId ? Number(categoryParentId) : null // Ensure parentId is number or null
      };

      // فراخوانی API برای ایجاد دسته‌بندی جدید
      const response = await axios.request({
        baseURL: server.baseurl + server.baseinfo + "create-category", // آدرس API برای ایجاد دسته‌بندی
        method: "post",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json" // حتماً Content-Type را تنظیم کنید
        },
        data: newCategoryData // ارسال داده‌ها
      });

      if (response.data.httpStatusCode === 201) {
        showAlert('Yeni kategori başarıyla eklendi!', 'success');
        resetFormAndState();
        await fetchCategories(); // پس از اضافه شدن موفقیت‌آمیز، دوباره لیست کامل دسته‌بندی‌ها را واکشی می‌کنیم
      } else {
        showAlert(response.data.message || 'Kategori eklenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Kategori eklenirken hata:", e);
        showAlert('Kategori eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  };


  const editCategory = async () => {
    // بررسی خالی نبودن نام جدید
    if (!name.trim()) {
      setNameError(true); // تنظیم وضعیت خطا به true
      setNameHelperText('Kategori adı boş bırakılamaz!'); // تنظیم پیام کمکی
      showAlert('İsim boş bırakılamaz!', 'warning');
      return;
    }
    setNameError(false); // در صورت معتبر بودن، خطا را پاک کنید
    setNameHelperText(''); // در صورت معتبر بودن، پیام کمکی را پاک کنید

    // 🔴 حذف شد: اعتبارسنجی فیلد Code برای ویرایش
    // if (!code.trim()) {
    //   setCodeError(true);
    //   setCodeHelperText('Kategori kodu boş bırakılamaz!');
    //   showAlert('Kod boş bırakılamaz!', 'warning');
    //   return;
    // }
    // setCodeError(false);
    // setCodeHelperText('');

    clearAlert();

    setLoadingButton(true);
    const authToken = localStorage.getItem('authToken');

    // بررسی وجود توکن احراز هویت
    if (!authToken) {
      showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
      setLoadingButton(false);
      return;
    }

    try {
      // ساختار داده‌های مورد نیاز برای API جدید
      const updateData = {
        id: Number(editingId), // ID دسته بندی مورد نظر برای بروزرسانی
        newname: name, // نام جدید
        // code: code, // 🔴 حذف شد: ارسال code به API برای ویرایش
        parentId: editingParentId ? Number(editingParentId) : null // ParentId را به number یا null تبدیل می‌کنیم
      };

      // فراخوانی API برای بروزرسانی دسته بندی
      const response = await axios.request({
        baseURL: server.baseurl + server.baseinfo + "update-category", // آدرس API جدید
        method: "put",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        data: updateData // ارسال داده‌ها در بدنه درخواست
      });

      if (response.data.httpStatusCode === 200) {
        showAlert('Kategori başarıyla güncellendi!', 'success');
        resetFormAndState();
        await fetchCategories(); // واکشی مجدد همه دسته‌بندی‌ها برای نمایش داده‌های بروزرسانی شده
      } else {
        showAlert(response.data.message || 'Kategori güncellenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Kategori güncellenirken hata:", e);
        showAlert('Kategori güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  };

  const sendStatusUpdate = async (id: string, statusValue: number) => {
    clearAlert();
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
      return;
    }

    try {
      const updateData = {
        id: Number(id), // ID دسته بندی مورد نظر برای بروزرسانی
        recordStatus: statusValue
      };

      const response = await axios.request({
        baseURL: server.baseurl + server.baseinfo + "update-category", // endpoint جدید شما
        method: "put",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        data: updateData
      });

      if (response.data.httpStatusCode === 200) {
        const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
        showAlert(`Kategori başarıyla ${statusText} olarak ayarlandı!`, 'success');
        await fetchCategories();
      } else {
        showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Durum güncellenirken hata:", e);
        showAlert('Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      handleCloseMenu();
    }
  };

  const handleSetActive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.id, 0);
    }
  };

  const handleSetInactive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.id, 1);
    }
  };

  const resetFormAndState = () => {
    setName('');
    // setCode(''); // 🔴 حذف شد: ریست کردن code
    setEditingId(null);
    setEditingParentId(null);
    // **پاک کردن وضعیت خطاها**
    setNameError(false);
    setNameHelperText('');
    // setCodeError(false); // 🔴 پاک کردن خطای code
    // setCodeHelperText(''); // 🔴 پاک کردن متن کمکی code
  };


  // این `useEffect` فقط در زمان mount شدن کامپوننت فراخوانی اولیه را انجام می‌دهد.
  useEffect(() => {
    const initFetch = async () => {
      await fetchCategories();
    };
    initFetch();
  }, []); // بدون وابندگی برای اجرای فقط یک بار

  // این `useEffect` زمانی اجرا می‌شود که `rawApiCategories` (داده‌های اصلی) یا فیلترها تغییر کنند.
  useEffect(() => {
    // 1. Get direct children of the current parent
    const directChildren = getDirectChildrenOfParent(rawApiCategories, currentParentCategory?.id || null);

    // 2. Filter these children by search term and status
    const filteredBySearchAndStatus = directChildren.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()); // 🔴 جستجو بر اساس code حذف شد
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.recordStatus === 0) ||
        (statusFilter === 'inactive' && category.recordStatus === 1);
      return matchesSearch && matchesStatus;
    });

    // 3. Apply sorting to the filtered data
    const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));

    setDisplayedCategories(sortedData); // Set the sorted and filtered data
    setPage(0); // Reset to first page when filters or data change
  }, [rawApiCategories, currentParentCategory, searchTerm, statusFilter, getDirectChildrenOfParent, order, orderBy]);


  const handleEnterSubcategories = (category: CategoryType) => {
    setCurrentParentCategory(category);
    // بروزرسانی Breadcrumb
    const newPath = [...breadcrumbPath];
    const lastItem = newPath[newPath.length - 1];
    // اگر آخرین آیتم breadcrumb همان دسته‌بندی نیست، آن را اضافه کن.
    if (lastItem.id !== category.id) {
      newPath.push({ id: category.id, name: category.name, depth: category.depth });
    }
    setBreadcrumbPath(newPath);
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    const itemIndex = breadcrumbPath.findIndex(bc => bc.id === item.id && bc.name === item.name);
    if (itemIndex === -1) return;

    const newPath = breadcrumbPath.slice(0, itemIndex + 1);
    setBreadcrumbPath(newPath);
    // پیدا کردن شیء کامل دسته‌بندی برای تنظیم currentParentCategory
    const selectedCategory = item.id === null ? null : findCategoryById(rawApiCategories, item.id);
    setCurrentParentCategory(selectedCategory ? {
      id: selectedCategory.id,
      name: selectedCategory.name,
      // code: selectedCategory.code, // 🔴 حذف شد
      createAt: selectedCategory.createAt,
      recordStatus: selectedCategory.recordStatus,
      status: selectedCategory.recordStatus === 0 ? 'Aktif' : selectedCategory.recordStatus === 1 ? 'Pasif' : 'Silindi',
      parentId: selectedCategory.parentId,
      depth: selectedCategory.depth,
    } : null);
  };


  const handleStatusFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'active' | 'inactive' | null,
  ) => {
    console.log(event)
    if (newFilter !== null) {
      setStatusFilter(newFilter);
      setPage(0);
    }
  };

  // ✅ Added: Handler for changing sort order
  const handleRequestSort = (property: SortableCategoryKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sort changes
  };


  const handleChangePage = (
    event: unknown,
    newPage: number) => {
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

  // `paginatedCategories` now uses `displayedCategories` which are already filtered and sorted.
  const paginatedCategories = displayedCategories.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getFormattedBreadcrumbPath = () => {
    if (breadcrumbPath.length <= MAX_BREADCRUMB_ITEMS) {
      return breadcrumbPath;
    }

    const firstItem = breadcrumbPath[0];

    const middlePart = breadcrumbPath.slice(breadcrumbPath.length - (MAX_BREADCRUMB_ITEMS - 2));

    return [
      firstItem,
      { id: null, name: '...', depth: -2 }, // ... placeholder
      ...middlePart
    ];
  };

  const formattedBreadcrumb = getFormattedBreadcrumbPath();


  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        {/* Breadcrumb Box */}
        {breadcrumbPath.length > 1 && (
          <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {formattedBreadcrumb.map((item, index) => (
              <React.Fragment key={`${item.id}-${item.name}-${index}`}>
                {item.name === '...' ? (
                  <Typography variant="h6" sx={{ mx: 0.5 }}>...</Typography>
                ) : (
                  <Button
                    variant={index === formattedBreadcrumb.length - 1 ? "contained" : "text"}
                    onClick={() => handleBreadcrumbClick(item)}
                    color={index === formattedBreadcrumb.length - 1 ? "primary" : "inherit"}
                    size="small"
                    sx={{ mx: 0.5 }}
                  >
                    {item.name}
                  </Button>
                )}
                {index < formattedBreadcrumb.length - 1 && (
                  <IconChevronRight size={16} style={{ margin: '0 4px' }} />
                )}
              </React.Fragment>
            ))}
          </Paper>
        )}

        {(hasCreatePermission || hasEditPermission) && (
          <Grid container spacing={1}>
            <Grid item xs={12} sm={1} display="flex" alignItems="center">
              <CustomFormLabel htmlFor="category-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                İsim
              </CustomFormLabel>
            </Grid>
            <Grid item xs={12} sm={7}> {/* 🔴 تغییر اندازه از sm={5} به sm={8} برای اشغال فضای بیشتر */}
              <CustomTextField
                id="category-name"
                placeholder={currentParentCategory ? "Alt Kategori Adı" : "Ana Kategori Adı"}

                sx={{ width: '100%' }}
                size="small"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  if (nameError && e.target.value.trim()) {
                    setNameError(false);
                    setNameHelperText('');
                  }
                }}
                inputRef={categoryNameInputRef}
                error={nameError}
                helperText={nameHelperText}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {editingId !== null ? (
                  <>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili kategoriyi güncelleyin" : ""}>
                      <Button
                        variant="contained"
                        color="info"
                        onClick={editCategory}
                        disabled={loadingButton}
                      >
                        {loadingButton ? <>
                          <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                        </> : 'Düzenlemek'}
                      </Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni kategori moduna dön" : ""}>
                      <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                        İptal Et
                      </Button>
                    </CustomTooltip>
                  </>
                ) : (

                  <>
                    {hasCreatePermission && (
                      <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir kategori ekle" : ""}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={insertCategory}
                          disabled={loadingButton}
                        >
                          {loadingButton ? <>
                            <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                          </> : (currentParentCategory ? 'Alt Kategori Ekle' : 'Yeni Kategori Ekle')}
                        </Button>
                      </CustomTooltip>
                    )}
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
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
            <Grid item xs={12} sm={6} md={8}>
              <TextField
                label="Kategori Ara"
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
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm kategorileri göster" : ""}> */}
                <StyledToggleButton
                  value="all"
                  aria-label="all categories"
                >
                  Tümü
                </StyledToggleButton>
                {/* </CustomTooltip> */}
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif kategorileri göster" : ""}> */}
                <StyledToggleButton
                  value="active"
                  aria-label="active categories"
                >
                  Aktif
                </StyledToggleButton>
                {/* </CustomTooltip> */}
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif kategorileri göster" : ""}> */}
                <StyledToggleButton
                  value="inactive"
                  aria-label="inactive categories"
                >
                  Pasif
                </StyledToggleButton>
                {/* </CustomTooltip> */}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          {loadingData ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>Kategoriler yükleniyor...</Typography>
            </Box>
          ) : (
            <Table aria-label="category table">
              <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                <TableRow>
                  <TableCell>
                    {/* Sortable Column: İsim (Name) */}
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">İsim</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    {/* Sortable Column: Oluşturulma Tarihi (Creation Date) */}
                    <TableSortLabel
                      active={orderBy === 'createAt'}
                      direction={orderBy === 'createAt' ? order : 'asc'}
                      onClick={() => handleRequestSort('createAt')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Oluşturulma Tarihi</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    {/* Sortable Column: Durum (Status) */}
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Durum</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    style={{ color: "#171c23" }}>
                    <Typography variant="h6">Alt Kategori</Typography>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCategories.length > 0 ? (
                  paginatedCategories.map((row) => (
                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box>
                            <Typography variant="h6">{row.name}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box>
                            <Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography>
                          </Box>
                        </Stack>
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
                        <CustomTooltip title={isTooltipGloballyEnabled ? `"${row.name}" için alt kategori ekle/gör` : ""}>

                          {(findCategoryById(rawApiCategories, row.id)?.categories || []).length > 0 ? (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleEnterSubcategories(row)}
                              startIcon={<IconChevronRight size={18} />}
                            >
                              Alt Kategorileri Görüntüle
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleEnterSubcategories(row)}
                              startIcon={<IconPlus size={18} />}
                            >
                              Alt Kategori Ekle
                            </Button>
                          )}
                        </CustomTooltip>
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
                            'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`,
                          }}
                        >

                          {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu kategoriyi pasif yap" : ""}>
                              <MenuItem onClick={handleSetInactive}>
                                <ListItemIcon>
                                  <DoNotDisturbOnRoundedIcon width={18} />
                                </ListItemIcon>
                                Pasif Yap
                              </MenuItem>
                            </CustomTooltip>

                          )}
                          {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu kategoriyi aktif yap" : ""}>
                              <MenuItem onClick={handleSetActive}>
                                <ListItemIcon>
                                  <DoneRoundedIcon width={18} />
                                </ListItemIcon>
                                Aktif Yap
                              </MenuItem>
                            </CustomTooltip>
                          )}
                          {hasEditPermission && (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu kategoriyi düzenle" : ""}>
                              <MenuItem onClick={handleEditClick}>
                                <ListItemIcon>
                                  <IconEdit width={18} />
                                </ListItemIcon>
                                Düzenlemek
                              </MenuItem>
                            </CustomTooltip>
                          )}
                          {hasDeletePermission && (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu kategoriyi sil" : ""}>
                              <MenuItem onClick={handleClickOpenDeleteModal}>
                                <ListItemIcon>
                                  <IconTrash width={18} />
                                </ListItemIcon>
                                Silmek
                              </MenuItem>
                            </CustomTooltip>
                          )}
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center"> {/* 🔴 colSpan را به 5 تغییر دادم (چون ستون کد حذف شد) */}
                      <Typography variant="subtitle1" color="textSecondary">
                        Hiç kategori bulunamadı.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={displayedCategories.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteCategory
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        categoryIdToDelete={categoryIdToDelete}
        onDeleteSuccess={() => fetchCategories()}
        showAlert={showAlert}
      />
    </>
  );
};

export default ListCategory;