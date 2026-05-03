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
  TableCell as MuiTableCell,
  MenuItem as MuiMenuItem,
  TableBody,
  Typography,
  Chip,
  Menu,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch, IconChevronRight, IconFileDownload, IconX }
  from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteCategory from './DeleteCategory';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import { useAuth } from 'src/context/AuthContext';

import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import Logo from 'src/assets/images/logos/logo.png';

import Excel from 'exceljs';
import { saveAs } from 'file-saver';


const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
  animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
  transition: 'transform 0.3s ease-in-out',
}));

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
  fontFamily: 'NotoSans',
  fontSize: '0.8rem',
  [theme.breakpoints.up('md')]: {
    fontSize: '1rem',
  },
}));

interface ApiCategoryType {
  id: string;
  name: string;
  depth: number;
  recordStatus: number;
  createAt: string;
  parentId: string | null;
  categories?: ApiCategoryType[];
}

interface CategoryType {
  id: string;
  name: string;
  createAt: string;
  recordStatus: number;
  status: string;
  parentId: string | null;
  depth: number;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  depth: number;
}

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

type SortableCategoryKeys = keyof Pick<CategoryType, 'name' | 'createAt' | 'status' | 'depth'>;

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


const ListCategory = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [rawApiCategories, setRawApiCategories] = useState<ApiCategoryType[]>([]);
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


  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);


  const [openDownloadModal, setOpenDownloadModal] = useState(false);

  const [currentParentCategory, setCurrentParentCategory] = useState<CategoryType | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Tüm Kategoriler', depth: -1 },
  ]);

  const MAX_BREADCRUMB_ITEMS = 4;

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [orderBy, setOrderBy] = useState<SortableCategoryKeys>('createAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const categoryNameInputRef = useRef<HTMLInputElement>(null);

  const [nameError, setNameError] = useState<boolean>(false);
  const [nameHelperText, setNameHelperText] = useState<string>('');



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
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };
  const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
  const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
  const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
  const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazdırmak"), [allowedOperations, currentMenuOpIds]);


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


  const getDirectChildrenOfParent = useCallback((categories: ApiCategoryType[], parentId: string | null): CategoryType[] => {
    let directChildren: CategoryType[] = [];
    if (parentId === null) {
      directChildren = categories.filter(cat => cat.parentId === null).map(cat => ({
        id: cat.id,
        name: cat.name,
        createAt: cat.createAt,
        recordStatus: cat.recordStatus,
        status: cat.recordStatus === 0 ? 'Aktif' : cat.recordStatus === 1 ? 'Pasif' : 'Silindi',
        parentId: cat.parentId,
        depth: cat.depth,
      }));
    } else {

      const parent = findCategoryById(categories, parentId);
      if (parent && parent.categories) {
        directChildren = parent.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
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
    let timer: number;
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

  const handleEditClick = () => {
    if (selectedRowForMenu) {
      setName(selectedRowForMenu.name);
      setIsFormVisible(true);

      setEditingId(selectedRowForMenu.id);
      setEditingParentId(selectedRowForMenu.parentId);

      setNameError(false);
      setNameHelperText('');
      setTimeout(() => {
        categoryNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        categoryNameInputRef.current?.focus();
      }, 100);
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    setNameError(false);
    setNameHelperText('');
  };
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
      setNameError(true);
      setNameHelperText('Kategori adı boş bırakılamaz!');
      showAlert('İsim boş bırakılamaz!', 'warning');
      return;
    }
    setNameError(false);
    setNameHelperText('');

    clearAlert();
    setLoadingButton(true);

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
      setLoadingButton(false);
      return;
    }

    try {
      const categoryParentId = currentParentCategory ? currentParentCategory.id : null;
      const newCategoryData = {
        name: name,
        parentId: categoryParentId ? Number(categoryParentId) : null
      };

      const response = await axios.request({
        baseURL: server.baseurl + server.baseinfo + "create-category",
        method: "post",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        data: newCategoryData
      });

      if (response.data.httpStatusCode === 201) {
        showAlert('Yeni kategori başarıyla eklendi!', 'success');
        resetFormAndState();
        await fetchCategories();
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
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Kategori adı boş bırakılamaz!');
      showAlert('İsim boş bırakılamaz!', 'warning');
      return;
    }
    setNameError(false);
    setNameHelperText('');
    clearAlert();

    setLoadingButton(true);
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
      setLoadingButton(false);
      return;
    }

    try {
      const updateData = {
        id: Number(editingId),
        newname: name,
        parentId: editingParentId ? Number(editingParentId) : null
      };

      const response = await axios.request({
        baseURL: server.baseurl + server.baseinfo + "update-category",
        method: "put",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        data: updateData
      });

      if (response.data.httpStatusCode === 200) {
        showAlert('Kategori başarıyla güncellendi!', 'success');
        resetFormAndState();
        await fetchCategories();
      } else {
        showAlert(response.data.message || 'Kategori güncellenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
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
        id: Number(id),
        recordStatus: statusValue
      };

      const response = await axios.request({
        baseURL: server.baseurl + server.baseinfo + "update-category",
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
    setEditingId(null);
    setEditingParentId(null);
    setNameError(false);
    setNameHelperText('');

    setIsFormVisible(false);
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchCategories();
    };
    initFetch();
  }, []);
  useEffect(() => {
    const directChildren = getDirectChildrenOfParent(rawApiCategories, currentParentCategory?.id || null);

    const filteredBySearchAndStatus = directChildren.filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.recordStatus === 0) ||
        (statusFilter === 'inactive' && category.recordStatus === 1);
      return matchesSearch && matchesStatus;
    });
    const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));

    setDisplayedCategories(sortedData);
    setPage(0);
  }, [rawApiCategories, currentParentCategory, searchTerm, statusFilter, getDirectChildrenOfParent, order, orderBy]);


  const handleEnterSubcategories = (category: CategoryType) => {
    setCurrentParentCategory(category);
    const newPath = [...breadcrumbPath];
    const lastItem = newPath[newPath.length - 1];
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
    const selectedCategory = item.id === null ? null : findCategoryById(rawApiCategories, item.id);
    setCurrentParentCategory(selectedCategory ? {
      id: selectedCategory.id,
      name: selectedCategory.name,
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

  const handleRequestSort = (property: SortableCategoryKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
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

  const paginatedCategories = displayedCategories.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getFormattedBreadcrumbPath = () => {
    if (breadcrumbPath.length <= MAX_BREADCRUMB_ITEMS) {
      return breadcrumbPath;
    }

    const firstItem = breadcrumbPath[0];

    const middlePart = breadcrumbPath.slice(breadcrumbPath.length - (MAX_BREADCRUMB_ITEMS - 2));

    return [
      firstItem,
      { id: null, name: '...', depth: -2 },
      ...middlePart
    ];
  };

  const formattedBreadcrumb = getFormattedBreadcrumbPath();

  const flattenAndPrepareCategoriesForExcel = (categories: ApiCategoryType[], path: string[] = []): any[][] => {
    let rows: any[][] = [];

    categories.forEach(category => {
      const currentPath = [...path, category.name];
      const fullCategoryName = currentPath.join(' > ');

      const row = [
        fullCategoryName,
        formatDateDisplay(category.createAt),
        category.recordStatus === 0 ? 'Aktif' : 'Pasif'
      ];
      rows.push(row);

      if (category.categories && category.categories.length > 0) {
        rows = rows.concat(flattenAndPrepareCategoriesForExcel(category.categories, currentPath));
      }
    });

    return rows;
  };
  const addCompanyInfo = (worksheet: Excel.Worksheet) => {
    worksheet.addRow([]);
    const companyInfo = [
      'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
      'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
      'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
    ];
    companyInfo.forEach(line => {
      worksheet.addRow([line]);
      const lastRow = worksheet.lastRow;
      if (lastRow) {
        lastRow.getCell(1).alignment = { horizontal: 'center' };
        lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
      }
    });
  };
  const handleExportExcel = async () => {
    setOpenDownloadModal(false);
    if (!rawApiCategories || rawApiCategories.length === 0) {
      showAlert('Dışa aktarılacak kategori bulunamadı.', 'warning');
      return;
    }

    showAlert('Excel dosyası oluşturuluyor...', 'info');

    try {
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Kategoriler Raporu', {
        views: [{ rightToLeft: false }]
      });

      const thinBorder: Partial<Excel.Border> = {
        style: 'thin',
        color: { argb: 'FFD3D3D3' }
      };

      const border: Partial<Excel.Borders> = {
        top: thinBorder,
        left: thinBorder,
        bottom: thinBorder,
        right: thinBorder
      };

      const headerFill: Partial<Excel.Fill> = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };

      const font: Partial<Excel.Font> = {
        name: 'Calibri',
        size: 11,
        bold: false,
        color: { argb: 'FF000000' }
      };

      const headerFont: Partial<Excel.Font> = { ...font, bold: true };

      const centerAlignment: Partial<Excel.Alignment> = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };

      const leftAlignment: Partial<Excel.Alignment> = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true
      };

      const fullHeaderStyle = {
        border: border,
        alignment: centerAlignment,
        font: headerFont,
        fill: headerFill
      } as Partial<Excel.Style>;


      const bodyStyle = {
        border: border,
        alignment: leftAlignment,
        font: font
      } as Partial<Excel.Style>;

      worksheet.addRow(['', '', '']);
      const titleRow = worksheet.addRow(['Tüm Kategoriler Raporu']);
      if (titleRow) {
        titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
        titleRow.getCell(1).alignment = { horizontal: 'center' };
      }
      worksheet.mergeCells('A2:C2');

      worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
      const dateRow = worksheet.lastRow;
      if (dateRow) {
        dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
        dateRow.getCell(1).alignment = { horizontal: 'left' };
      }
      worksheet.addRow([]);

      const tableHeaders = ['Kategori Adı', 'Oluşturulma Tarihi', 'Durum'];
      const headerRow = worksheet.addRow(tableHeaders);
      headerRow.eachCell((cell) => {
        cell.style = fullHeaderStyle;
      });

      const rows = flattenAndPrepareCategoriesForExcel(rawApiCategories);
      rows.forEach(rowData => {
        const row = worksheet.addRow(rowData);
        row.eachCell((cell) => {
          cell.style = bodyStyle;
        });
      });

      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        if (column.eachCell) {
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
        }
        column.width = Math.min(Math.max(maxLength + 2, 12), 50);
      });
      addCompanyInfo(worksheet);
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Tüm_Kategoriler_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
      saveAs(new Blob([buffer]), fileName);

      showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
    } catch (error) {
      console.error("Excel dışa aktarılırken hata:", error);
      showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
    }
  };

  const flattenAndPrepareCategoriesForPdf = (categories: ApiCategoryType[], path: string[] = []): string[][] => {
    let rows: string[][] = [];

    categories.forEach(category => {
      const currentPath = [...path, category.name];
      const fullCategoryName = currentPath.join(' > ');

      const row = [
        fullCategoryName,
        formatDateDisplay(category.createAt),
        category.recordStatus === 0 ? 'Aktif' : 'Pasif'
      ];
      rows.push(row);

      if (category.categories && category.categories.length > 0) {
        rows = rows.concat(flattenAndPrepareCategoriesForPdf(category.categories, currentPath));
      }
    });

    return rows;
  };

  const handleDownloadAllCategoriesPDF = () => {
    if (!rawApiCategories || rawApiCategories.length === 0) {
      showAlert('PDF oluşturulacak kategori bulunamadı.', 'warning');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const reportTitle = 'Tüm Kategoriler Raporu';

    try {
      doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');

      doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
      doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');

      const addPdfHeader = (pdfDoc: jsPDF, title: string) => {
        try {
          pdfDoc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);
        } catch (e) {
          console.error("Logo yüklenemedi", e);
        }

        pdfDoc.setFont('NotoSans', 'normal');
        pdfDoc.setFontSize(14);
        pdfDoc.setTextColor(0);
        pdfDoc.text(title, pageWidth / 2, 25, { align: 'center' });

        pdfDoc.setFontSize(10);
        pdfDoc.setFont('NotoSans', 'bold');
        pdfDoc.text(`Rapor Tarihi:`, 15, 40);
        pdfDoc.setFont('NotoSans', 'normal');
        pdfDoc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

        pdfDoc.setLineWidth(0.5);
        pdfDoc.line(15, 45, pageWidth - 15, 45);
      };

      const addPdfFooter = (pdfDoc: jsPDF) => {
        pdfDoc.setFontSize(8);
        pdfDoc.setFont('NotoSans', 'normal');
        pdfDoc.setTextColor(100);

        const companyInfo = [
          'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
          'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
          'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
        ];

        let footerY = pageHeight - 20;
        companyInfo.forEach(line => {
          pdfDoc.text(line, pageWidth / 2, footerY, { align: 'center' });
          footerY += 4;
        });

        pdfDoc.setTextColor(0);
        pdfDoc.setFontSize(10);
        pdfDoc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
        pdfDoc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

        const pageNumber = (pdfDoc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (pdfDoc as any).internal.getNumberOfPages();
        pdfDoc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
      };

      const rows = flattenAndPrepareCategoriesForPdf(rawApiCategories);

      autoTable(doc, {
        startY: 55,
        head: [['Kategori Adı', 'Oluşturulma Tarihi', 'Durum']],
        body: rows,
        theme: 'grid',
        styles: {
          font: 'NotoSans',
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [66, 66, 66],
          textColor: [255, 255, 255],
          fontStyle: 'normal',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'left', cellWidth: 40 },
          2: { halign: 'left', cellWidth: 30 }
        },
        margin: { top: 55, bottom: 30 },
        didDrawPage: (_data) => {
          addPdfHeader(doc, reportTitle);
          addPdfFooter(doc);
        }
      });

      doc.save(`${reportTitle.replace(/\s+/g, '_')}.pdf`);
      showAlert('PDF başarıyla oluşturuldu.', 'success');
    } catch (error: any) {
      console.error('PDF Error:', error);
      showAlert('PDF oluşturulurken hata oluştu.', 'error');
    }
  };

  const isRestrictedItem = (item: CategoryType | null): boolean => {
    if (!item) return true;
    return item.id === "1" || item.name === "Beton";
  };

  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>

          <Typography variant="h5" mb={2}>{editingId ? 'Kategori Düzenle' : 'Yeni Kategori Kaydı'}</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems="stretch"
            flexGrow={1}
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          >
            {!isFormVisible && hasCreatePermission && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Kategori Belgesi kaydetmek için tıklayınız" : ""}>
                <BlinkingButton
                  variant="contained"
                  color="primary"
                  onClick={() => setIsFormVisible(true)}
                  isBlinking={isBlinking}
                  fullWidth={false}
                >
                  Yeni Kategori Kaydet
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
        {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
          <Grid container spacing={1}>
            <Grid item xs={12} sm={1} display="flex" alignItems="center">
              <CustomFormLabel htmlFor="category-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                İsim
              </CustomFormLabel>
            </Grid>
            <Grid item xs={12} sm={7}>
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


        <Grid item xs={12} mt={2} mr={2}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {hasDownloadPermission && (
              <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'right' }}>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenDownloadModal(true)}
                    startIcon={<IconFileDownload />}
                  >
                    Tümünü İndir
                  </Button>
                </CustomTooltip>
              </Grid>
            )}

          </Stack>
        </Grid>
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
                <StyledToggleButton
                  value="all"
                  aria-label="all categories"
                >
                  Tümü
                </StyledToggleButton>
                <StyledToggleButton
                  value="active"
                  aria-label="active categories"
                >
                  Aktif
                </StyledToggleButton>
                <StyledToggleButton
                  value="inactive"
                  aria-label="inactive categories"
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
              <Typography variant="h6" sx={{ ml: 2 }}>Kategoriler yükleniyor...</Typography>
            </Box>
          ) : (
            <Table aria-label="category table">
              <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                <TableRow>
                  <StyledTableCell>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">İsim</Typography>
                    </TableSortLabel>
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
                  <StyledTableCell style={{ color: "#171c23" }}>
                    <Typography variant="h6">Alt Kategori</Typography>
                  </StyledTableCell>
                  <StyledTableCell></StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedCategories.length > 0 ? (
                  paginatedCategories.map((row) => (
                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <StyledTableCell>
                        <Typography variant="body1">{row.name}</Typography>
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
                          MenuListProps={{
                            'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`,
                          }}
                        >
                          {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && !isRestrictedItem(selectedRowForMenu) && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kategoriyi pasif yap" : ""}>
                              <MuiMenuItem onClick={handleSetInactive}>
                                <ListItemIcon>
                                  <DoNotDisturbOnRoundedIcon width={18} />
                                </ListItemIcon>
                                Pasif Yap
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && !isRestrictedItem(selectedRowForMenu) && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kategoriyi aktif yap" : ""}>
                              <MuiMenuItem onClick={handleSetActive}>
                                <ListItemIcon>
                                  <DoneRoundedIcon width={18} />
                                </ListItemIcon>
                                Aktif Yap
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasEditPermission && !isRestrictedItem(selectedRowForMenu) && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kategoriyi düzenle" : ""}>
                              <MuiMenuItem onClick={handleEditClick}>
                                <ListItemIcon>
                                  <IconEdit width={18} />
                                </ListItemIcon>
                                Düzenlemek
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasDeletePermission && !isRestrictedItem(selectedRowForMenu) && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kategoriyi sil" : ""}>
                              <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                <ListItemIcon>
                                  <IconTrash width={18} />
                                </ListItemIcon>
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
                    <StyledTableCell colSpan={5} align="center">
                      <Typography variant="subtitle1" color="textSecondary">
                        Hiç kategori bulunamadı.
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

      <Dialog
        open={openDownloadModal}
        onClose={() => setOpenDownloadModal(false)}
      >
        <DialogTitle>Dosya Formatını Seçin</DialogTitle>
        <DialogContent>
          <Stack direction="column" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<IconFileDownload />}
              onClick={handleDownloadAllCategoriesPDF}
            >
              PDF Olarak İndir
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<IconFileDownload />}
              onClick={handleExportExcel}
            >
              Excel Olarak İndir
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDownloadModal(false)} color="secondary">
            İptal
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ListCategory;