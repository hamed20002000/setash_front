// ListItem.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu,
  IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, Checkbox, InputAdornment, TablePagination,
  TextField, CircularProgress, FormControl, InputLabel, Select,
  MenuItem as MuiMenuItem,
  ToggleButtonGroup, ToggleButton as MuiToggleButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List,
  ListItemText,
  TableSortLabel, // ✅ Added: For sorting icons and functionality
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
  IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown,
  IconFileDownload,
  IconX,
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteItem from './DeleteItem';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import { useAuth } from 'src/context/AuthContext';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';


// import * as XLSX from 'xlsx';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

const stripHtml = (htmlString: string) => {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  return doc.body.textContent || "";
};


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


const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
  animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
  transition: 'transform 0.3s ease-in-out',
}));

interface ItemType {
  id: string;
  name: string;
  description: string;
  abbreviation: string;
  recordStatus: number;
  createAt: string;
  weight: number | null; // ✅ اضافه شده: فیلد وزن
  category: {
    id: string;
    name: string;
    depth: number;
    createAt: string;
    recordStatus: number;
  };
  unit: {
    id: string;
    title: string;
    recordStatus: number;
    createAt: string;
  };
  status?: string;
}

interface UnitOptionType {
  id: string;
  title: string;
}

interface CategoryOptionType {
  id: string;
  name: string;
  parentId?: string | null;
  depth: number;
  categories?: CategoryOptionType[];
}

interface FlatCategoryType {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}


const flattenCategories = (nestedCategories: CategoryOptionType[]): FlatCategoryType[] => {
  const flatList: FlatCategoryType[] = [];

  const traverse = (categories: CategoryOptionType[]) => {
    categories.forEach(cat => {
      flatList.push({
        id: cat.id,
        name: cat.name,
        parentId: cat.parentId || null,
        depth: cat.depth,
      });

      if (cat.categories && cat.categories.length > 0) {
        traverse(cat.categories);
      }
    });
  };

  traverse(nestedCategories);
  return flatList;
};



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

interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  children: CategoryNode[];
}

const buildCategoryTreeForSelect = (categories: FlatCategoryType[], searchTerm: string, parentId: string | null = null): CategoryNode[] => {
  const lowerCaseSearchTerm = searchTerm.toLowerCase();

  const currentLevelCategories = categories.filter(cat =>
    cat.parentId === parentId
  ).sort((a, b) => a.name.localeCompare(b.name));

  const tree: CategoryNode[] = [];

  for (const cat of currentLevelCategories) {
    const children = buildCategoryTreeForSelect(categories, searchTerm, cat.id);

    const matchesSearch = cat.name.toLowerCase().includes(lowerCaseSearchTerm);
    const childrenMatchSearch = children.length > 0;

    if (searchTerm === '' || matchesSearch || childrenMatchSearch) {
      tree.push({
        ...cat,
        children: children,
      });
    }
  }
  return tree;
};

interface CategoryTreeSelectMenuItemProps {
  node: CategoryNode;
  onToggleSelection: (categoryId: string, isChecked: boolean) => void;
  selectedId: string | null;
  onCloseParentSelect: () => void;
}

const CategoryTreeSelectMenuItem: React.FC<CategoryTreeSelectMenuItemProps> = ({ node, onToggleSelection, selectedId, onCloseParentSelect }) => {
  const [open, setOpen] = useState(false);
  const isChecked = selectedId === node.id;

  const handleCheckboxClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const newCheckedState = event.target.checked;
    onToggleSelection(node.id, newCheckedState);
    if (newCheckedState) {
      onCloseParentSelect();
    }
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleMenuItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCheckedState = !isChecked;
    onToggleSelection(node.id, newCheckedState);
    if (newCheckedState) {
      onCloseParentSelect();
    }
  };

  return (
    <>
      <MuiMenuItem
        value={node.id}
        sx={{
          paddingLeft: `${node.depth * 16}px`,
          '&.MuiMenuItem-root': {
            paddingTop: '6px',
            paddingBottom: '6px',
            '&.Mui-selected': {
              backgroundColor: 'transparent !important',
              color: (theme) => theme.palette.text.primary,
            },
            '&:hover': {
              backgroundColor: (theme) => theme.palette.action.hover,
            },
          },
        }}
        onClick={handleMenuItemClick}
      >
        <Stack direction="row" alignItems="center" width="100%">
          {node.children.length > 0 ? (
            <IconButton onClick={handleToggleCollapse} size="small" sx={{ mr: 1, p: 0.5 }}>
              {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            </IconButton>
          ) : (
            <Box sx={{ width: 16 + 8 + 4 }} />
          )}
          <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
            <Checkbox
              edge="start"
              checked={isChecked}
              tabIndex={-1}
              disableRipple
              onChange={handleCheckboxClick}
              inputProps={{ 'aria-labelledby': `category-select-item-${node.id}` }}
            />
          </ListItemIcon>
          <ListItemText id={`category-select-item-${node.id}`} primary={node.name} />
        </Stack>
      </MuiMenuItem>
      {open && node.children.length > 0 && (
        <List component="div" disablePadding>
          {node.children.map((childNode) => (
            <CategoryTreeSelectMenuItem
              key={childNode.id}
              node={childNode}
              onToggleSelection={onToggleSelection}
              selectedId={selectedId}
              onCloseParentSelect={onCloseParentSelect}
            />
          ))}
        </List>
      )}
    </>
  );
};

type SortableItemKeys = keyof ItemType | 'category.name' | 'unit.title' | 'weight';

const descendingComparator = <T,>(
  a: T,
  b: T,
  orderBy: SortableItemKeys, // Use the new SortableItemKeys type
): number => {
  let valA: any;
  let valB: any;

  // Logic to handle nested property access
  if (orderBy === 'category.name') {
    valA = (a as ItemType).category?.name;
    valB = (b as ItemType).category?.name;
  } else if (orderBy === 'unit.title') {
    valA = (a as ItemType).unit?.title;
    valB = (b as ItemType).unit?.title;
  } else if (orderBy === 'weight') { // ✅ اضافه شده: مقایسه وزن
    valA = (a as ItemType).weight;
    valB = (b as ItemType).weight;
  } else {
    // For top-level properties, use direct access
    valA = a[orderBy as keyof T]; // Cast orderBy back to keyof T for direct access
    valB = b[orderBy as keyof T];
  }

  // Handle undefined or null values first.
  if (valB === undefined || valB === null) {
    return (valA === undefined || valA === null) ? 0 : -1;
  }
  if (valA === undefined || valA === null) {
    return 1;
  }

  // Perform comparison based on the actual type of the values.
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

// getComparator needs to be updated to use the new SortableItemKeys
const getComparator = (
  order: 'asc' | 'desc',
  orderBy: SortableItemKeys, // Use SortableItemKeys here
): (a: ItemType, b: ItemType) => number => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
};

// stableSort remains largely the same, as it's a generic utility
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1]; // Maintain stable sort for equal elements
  });
  return stabilizedThis.map((el) => el[0]);
};


const ListItemComponent = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [originalName, setOriginalName] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);

  const [abbreviation, setAbbreviation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [weight, setWeight] = useState<number | ''>('');

  const [unitOptions, setUnitOptions] = useState<UnitOptionType[]>([]);
  const [allCategoriesFlat, setAllCategoriesFlat] = useState<FlatCategoryType[]>([]);
  const [itemsList, setItemsList] = useState<ItemType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<ItemType | null>(null);

  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [itemIdToDelete, setItemIdToDelete] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);
  const [loadingUnits, setLoadingUnits] = useState<boolean>(false);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);


  const { isTooltipGloballyEnabled } = useTooltip();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
  const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  // type SortableItemKeys = keyof ItemType | 'category.name' | 'unit.title'; // This is already defined outside
  // ✅ Added: State for sorting
  const [orderBy, setOrderBy] = useState<SortableItemKeys>('createAt'); // Use the new type here
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');


  const [openDownloadModal, setOpenDownloadModal] = useState(false);

  // ✅ Added: Ref for the item name input field
  const itemNameInputRef = useRef<HTMLInputElement>(null);

  // **New states for input validation errors**
  const [nameError, setNameError] = useState<boolean>(false);
  const [nameHelperText, setNameHelperText] = useState<string>('');
  const [unitIdError, setUnitIdError] = useState<boolean>(false);
  const [unitIdHelperText, setUnitIdHelperText] = useState<string>('');
  const [categoryIdError, setCategoryIdError] = useState<boolean>(false);
  const [categoryIdHelperText, setCategoryIdHelperText] = useState<string>('');
  const [abbreviationError, setAbbreviationError] = useState<boolean>(false);
  const [abbreviationHelperText, setAbbreviationHelperText] = useState<string>('');
  const [descriptionError, setDescriptionError] = useState<boolean>(false);
  const [descriptionHelperText, setDescriptionHelperText] = useState<string>('');
  const [weightError, setWeightError] = useState<boolean>(false);
  const [weightHelperText, setWeightHelperText] = useState<string>('');




  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);

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

  const hasDownloadPermission = useMemo(() => {
    return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
  }, [allowedOperations]);

  const categoryTreeForSelect = useMemo(() => {
    return buildCategoryTreeForSelect(allCategoriesFlat, categorySearchTerm, null);
  }, [allCategoriesFlat, categorySearchTerm]);


  const handleToggleCategorySelection = useCallback((categoryId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCategoryId(categoryId);
      // Clear error when a category is selected
      setCategoryIdError(false);
      setCategoryIdHelperText('');
    } else {
      setSelectedCategoryId(null);
    }
  }, [allCategoriesFlat]);

  const handleCloseCategorySelect = () => {
    setIsCategorySelectOpen(false);
  };


  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ItemType) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBlinking(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleClickOpenDeleteModal = () => {
    if (selectedRowForMenu) {
      setItemIdToDelete(Number(selectedRowForMenu.id));
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };


  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setItemIdToDelete(null);
    getListItem();
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

  const resetFormAndState = () => {
    setName('');
    setSelectedUnitId(null);
    setSelectedCategoryId(null);
    setAbbreviation('');
    setDescription('');
    setWeight(''); // ✅ اضافه شده: ریست کردن وزن
    setEditingId(null);
    setUnitSearchTerm('');
    setCategorySearchTerm('');
    setIsFormVisible(false);
    clearAlert();

    // **Clear all validation error states**
    setNameError(false);
    setNameHelperText('');
    setUnitIdError(false);
    setUnitIdHelperText('');
    setCategoryIdError(false);
    setCategoryIdHelperText('');
    setAbbreviationError(false);
    setAbbreviationHelperText('');
    setDescriptionError(false);
    setDescriptionHelperText('');
    setWeightError(false); // ✅ اضافه شده: ریست کردن خطا
    setWeightHelperText(''); // ✅ اضافه شده: ریست کردن متن خطا
  };

  const handleEditClick = () => {
    if (selectedRowForMenu) {
      setName(selectedRowForMenu.name);
      setOriginalName(selectedRowForMenu.name);
      setSelectedUnitId(selectedRowForMenu.unit.id);
      setSelectedCategoryId(selectedRowForMenu.category.id);
      setAbbreviation(selectedRowForMenu.abbreviation);
      setDescription(selectedRowForMenu.description);
      setWeight(selectedRowForMenu.weight || ''); // ✅ اضافه شده: بارگذاری وزن
      setEditingId(selectedRowForMenu.id);

      // **Clear all validation error states when editing**
      setNameError(false);
      setNameHelperText('');
      setUnitIdError(false);
      setUnitIdHelperText('');
      setCategoryIdError(false);
      setCategoryIdHelperText('');
      setAbbreviationError(false);
      setAbbreviationHelperText('');
      setDescriptionError(false);
      setDescriptionHelperText('');
      setWeightError(false); // ✅ اضافه شده: ریست کردن خطا
      setWeightHelperText(''); // ✅ اضافه شده: ریست کردن متن خطا

      setIsFormVisible(true);

      // ✅ Added: Scroll to the item name input and focus
      setTimeout(() => {
        itemNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        itemNameInputRef.current?.focus();
      }, 100); // Small delay to ensure DOM update
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
  };

  const insertItem = async () => {
    let hasError = false;

    // Validate Name
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Ürün adı boş bırakılamaz!');
      hasError = true;
    } else {
      setNameError(false);
      setNameHelperText('');
    }

    // Validate Unit
    if (selectedUnitId === null) {
      setUnitIdError(true);
      setUnitIdHelperText('Ölçü seçilmelidir!');
      hasError = true;
    } else {
      setUnitIdError(false);
      setUnitIdHelperText('');
    }

    // Validate Category
    if (selectedCategoryId === null) {
      setCategoryIdError(true);
      setCategoryIdHelperText('Kategori seçilmelidir!');
      hasError = true;
    } else {
      setCategoryIdError(false);
      setCategoryIdHelperText('');
    }

    if (abbreviation.trim() !== '' && abbreviation.trim().length !== 4) {
      setAbbreviationError(true);
      setAbbreviationHelperText('Kısaltma 4 karakter olmalıdır.');
      hasError = true;
    } else {
      setAbbreviationError(false);
      setAbbreviationHelperText('');
    }

    if (hasError) {
      showAlert('Lütfen tüm zorunlu alanları doğru şekilde doldurun!', 'warning');
      return;
    }

    clearAlert();
    setLoadingButton(true);

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
      navigate("/");
      showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      setLoadingButton(false);
      return;
    }
    debugger
    try {
      const response = await axios.post(server.baseurl + server.baseinfo + "create-item", // API endpoint for creation
        {
          name,
          description,
          abbreviation: abbreviation === "" ? null : abbreviation,
          categoryId: Number(selectedCategoryId), // Use selectedCategoryId
          itemUnitId: Number(selectedUnitId), // Use selectedUnitId, renamed as per API spec
          weight: weight === '' ? null : Number(weight), // ✅ اضافه شده: ارسال وزن
        },
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data && response.data.success) {
        resetFormAndState();
        getListItem();
        showAlert('Yeni ürün başarıyla eklendi!', 'success');
      } else {
        showAlert(response.data.message || 'Ürün eklenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        showAlert(e.response?.data?.message == "The item already exist" ? "Bu isimle bir öğe zaten var. Aynı adla yeni bir birim kaydedemezsiniz." : 'Ürün eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  };

  const editItem = async () => {
    let hasError = false;

    // Validate Name
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Ürün adı boş bırakılamaz!');
      hasError = true;
    } else {
      setNameError(false);
      setNameHelperText('');
    }

    // Validate Unit
    if (selectedUnitId === null) {
      setUnitIdError(true);
      setUnitIdHelperText('Ölçü seçilmelidir!');
      hasError = true;
    } else {
      setUnitIdError(false);
      setUnitIdHelperText('');
    }

    // Validate Category
    if (selectedCategoryId === null) {
      setCategoryIdError(true);
      setCategoryIdHelperText('Kategori seçilmelidir!');
      hasError = true;
    } else {
      setCategoryIdError(false);
      setCategoryIdHelperText('');
    }
    if (abbreviation.trim() !== '' && abbreviation.trim().length !== 4) {
      setAbbreviationError(true);
      setAbbreviationHelperText('Kısaltma 4 karakter olmalıdır.');
      hasError = true;
    } else {
      setAbbreviationError(false);
      setAbbreviationHelperText('');
    }
    if (hasError) {
      showAlert('Lütfen tüm zorunlu alanları doğru şekilde doldurun!', 'warning');
      return;
    }

    if (name === originalName && selectedUnitId === selectedRowForMenu?.unit.id
      && selectedCategoryId === selectedRowForMenu?.category.id
      && abbreviation === selectedRowForMenu?.abbreviation && description === selectedRowForMenu?.description
      && weight === selectedRowForMenu?.weight) { // ✅ اضافه شده: بررسی تغییرات وزن
      showAlert('Herhangi bir değişiklik yapmadınız.', 'info');
      resetFormAndState();
      return;
    }

    clearAlert();
    setLoadingButton(true);

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
      navigate("/");
      showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      setLoadingButton(false);
      return;
    }
    debugger
    try {
      const response = await axios.put(server.baseurl + server.baseinfo + "update-item", // API endpoint for creation
        {
          id: Number(editingId),
          newName: name,
          description,
          abbreviation: abbreviation === "" ? null : abbreviation,
          categoryId: Number(selectedCategoryId), // Use selectedCategoryId
          itemUnitId: Number(selectedUnitId), // Use selectedUnitId, renamed as per API spec
          weight: weight === '' ? null : Number(weight), // ✅ اضافه شده: ارسال وزن
        },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data && response.data.success) {
        showAlert('Ürün başarıyla güncellendi!', 'success');
        resetFormAndState();
        getListItem();
        showAlert('Ürün başarıyla güncellendi!', 'success');
      } else {
        showAlert(response.data.message || 'Ürün güncellenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.log("Error inserting item:", e);
        showAlert(e.response?.data?.message || 'Ürün güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  };

  const sendStatusUpdate = async (id: string, statusValue: number) => {
    clearAlert();

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
      navigate("/");
      showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      return;
    }
    debugger
    try {
      // Replace with actual API call to update item status
      const response = await axios.put(server.baseurl + server.baseinfo + "update-item", // Assuming update status endpoint
        {
          id: Number(id),
          recordStatus: statusValue
        },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data && response.data.success) {
        const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
        showAlert(`Ürün başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListItem();
      } else {
        showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error updating status:", e);
        showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
  const getUnitOptions = async () => {
    setLoadingUnits(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
      navigate("/");
      showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      setLoadingUnits(false);
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.baseinfo + "get-item-units", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data && response.data.success) {
        setUnitOptions(response.data.data
          .filter((unit: any) => unit.recordStatus === 0) // 🟢 اضافه شده: فیلتر کردن واحدهای با recordStatus = 0
          .map((unit: any) => ({
            id: unit.id,
            title: unit.title
          })));
      } else {
        console.error("Failed to fetch units:", response.data.message);
        showAlert('Ölçüler yüklenirken hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) { // Changed to use axios.isAxiosError for type narrowing
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error fetching units:", e);
        showAlert('Ölçüler sunucudan alınamadı.', 'error');
      }
    } finally {
      setLoadingUnits(false);
    }
  };
  const getAllCategories = async () => {
    setLoadingCategories(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
      navigate("/");
      showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      setLoadingCategories(false);
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.baseinfo + "get-categories", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data && response.data.success) {
        // 🟢 اضافه شده: فیلتر کردن دسته‌بندی‌ها در تابع mapApiMenuToModalMenuItem یا قبل از آن
        // در اینجا فرض می‌کنیم که داده‌ها در `response.data.data` به صورت Nested هستند
        // و flattenedCategories باید ابتدا فیلتر شود
        const filteredNestedCategories = response.data.data
          .filter((cat: any) => cat.recordStatus === 0) // فیلتر کردن سطح اول
          .map((cat: any) => {
            // تابع بازگشتی برای فیلتر کردن زیردسته‌ها
            const filterChildren = (children: any[]): CategoryOptionType[] => {
              return children
                .filter((child: any) => child.recordStatus === 0)
                .map((child: any) => ({
                  id: child.id,
                  name: child.name,
                  parentId: child.parentId || null,
                  depth: child.depth,
                  categories: child.categories && child.categories.length > 0 ? filterChildren(child.categories) : undefined,
                }));
            };
            return {
              id: cat.id,
              name: cat.name,
              parentId: cat.parentId || null,
              depth: cat.depth,
              categories: cat.categories && cat.categories.length > 0 ? filterChildren(cat.categories) : undefined,
            };
          });

        const flattened = flattenCategories(filteredNestedCategories); // از داده‌های فیلتر شده استفاده کنید
        setAllCategoriesFlat(flattened);
      } else {
        console.error("Failed to fetch categories:", response.data.message);
        showAlert('Kategoriler yüklenirken hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) { // Changed to use axios.isAxiosError for type narrowing
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error fetching categories:", e);
        showAlert('Kategoriler sunucudan alınamadı.', 'error');
      }
    } finally {
      setLoadingCategories(false);
    }
  };
  const getListItem = async () => {
    setLoadingItems(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
      navigate("/");
      showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      setLoadingItems(false);
      return;
    }
    try {
      const response = await axios.get(server.baseurl + server.baseinfo + "get-item", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (response.data && response.data.success) {
        const processedData = response.data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          abbreviation: item.abbreviation,
          recordStatus: item.recordStatus !== undefined && item.recordStatus !== null ? item.recordStatus : 0, // Provide a default
          weight: item.weight !== undefined ? item.weight : null, // ✅ اضافه شده: دریافت وزن از API
          createAt: item.createAt,
          category: {
            id: item.category.id,
            name: item.category.name,
            depth: item.category.depth,
            createAt: item.category.createAt,
            // recordStatus: item.category.recordStatus,
            recordStatus: item.category.recordStatus !== undefined && item.category.recordStatus !== null ? item.category.recordStatus : 0, // Provide a default

          },
          unit: {
            id: item.unit.id,
            title: item.unit.title,
            // recordStatus: item.unit.recordStatus,
            recordStatus: item.unit.recordStatus !== undefined && item.unit.recordStatus !== null ? item.unit.recordStatus : 0, // Provide a default

            createAt: item.unit.createAt,
          },
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
        }));
        // Removed initial sorting here, as it will be handled by the new sorting logic
        setItemsList(processedData as ItemType[]);
      } else {
        console.error("Failed to fetch items:", response.data.message);
        showAlert('Ürünler yüklenmedi.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error fetching items:", e);
        showAlert('Ürünler sunucudan alınamadı', 'error');
      }
    } finally {
      setLoadingItems(false);
      setPage(0);
      setSearchTerm('');
      setStatusFilter('all');
    }
  };

  useEffect(() => {
    getUnitOptions();
    getAllCategories();
    getListItem();
  }, []);

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

  const handleUnitSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUnitSearchTerm(event.target.value);
  };

  const filteredUnitOptions = unitOptions.filter(unit =>
    unit.title.toLowerCase().includes(unitSearchTerm.toLowerCase())
  );

  const handleCategorySearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategorySearchTerm(event.target.value);
  };

  // ✅ Added: Handler for changing sort order
  const handleRequestSort = (property: keyof ItemType | 'category.name' | 'unit.title' | 'weight') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sort changes
  };


  const filteredItems = itemsList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.abbreviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.weight !== null && item.weight.toString().includes(searchTerm)); // ✅ اضافه شده: فیلتر کردن بر اساس وزن
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.recordStatus === 0) ||
      (statusFilter === 'inactive' && item.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  const sortedAndFilteredItems = stableSort(filteredItems, getComparator(order, orderBy));

  const paginatedItems = sortedAndFilteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  const handleOpenDescriptionModal = (descriptionContent: string) => {
    setFullDescriptionContent(descriptionContent);
    setOpenDescriptionModal(true);
  };

  const handleCloseDescriptionModal = () => {
    setOpenDescriptionModal(false);
    setFullDescriptionContent('');
  };

  // const handlePrintAllItems = () => {
  //   if (!sortedAndFilteredItems || sortedAndFilteredItems.length === 0) {
  //     showAlert('PDF oluşturulacak ürün bulunamadı.', 'warning');
  //     return;
  //   }

  //   const doc = new jsPDF();
  //   const pageWidth = doc.internal.pageSize.getWidth();
  //   const pageHeight = doc.internal.pageSize.getHeight();

  //   // اطمینان از تعریف تابع stripHtml
  //   const stripHtml = (htmlString: string) => { // ✅ نوع پارامتر را به string تغییر دهید
  //     const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  //     return doc.body.textContent || "";
  //   };

  //   doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
  //   doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
  //   doc.setFont('NotoSans');

  //   const rowsWithoutHtml = sortedAndFilteredItems.map(item => {
  //     const descriptionWithoutHtml = item.description ? stripHtml(item.description) : '-';
  //     return [
  //       item.name || '-',
  //       item.unit?.title || '-',
  //       item.category?.name || '-',
  //       item.abbreviation || '-',
  //       item.weight !== null ? String(item.weight) : '-',
  //       descriptionWithoutHtml.length > 50 ? `${descriptionWithoutHtml.substring(0, 50)}...` : descriptionWithoutHtml,
  //       formatDateDisplay(item.createAt) || '-',
  //       item.status || '-',
  //     ];
  //   });

  //   try {
  //     autoTable(doc, {
  //       startY: 50,
  //       head: [['Ürün Adı', 'Ölçü', 'Kategori', 'Kısaltma', 'Ağırlık', 'Açıklama', 'Oluşturulma Tarihi', 'Durum']],
  //       body: rowsWithoutHtml,
  //       theme: 'grid',
  //       styles: {
  //         font: 'NotoSans',
  //         fontStyle: 'normal',
  //         fontSize: 8,
  //         cellPadding: 2,
  //         overflow: 'linebreak'
  //       },
  //       headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
  //       // این قلاب به صورت خودکار در هر صفحه جدید فراخوانی می‌شود
  //       didDrawPage: (_data) => {
  //         // هدر
  //         doc.addImage(Logo, 'PNG', 10, 10, 50, 25);
  //         doc.setFontSize(18);
  //         doc.text('Tüm Ürünler Raporu', pageWidth - 15, 30, { align: 'right' });
  //         doc.setFontSize(12);
  //         doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });

  //         // فوتر
  //         doc.setFontSize(10);
  //         doc.setTextColor(0);
  //         doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
  //         doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  //         const docAny = doc as any;
  //         const pageCount = docAny.internal.getNumberOfPages();
  //         doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
  //       },
  //       // تنظیمات اضافی برای تکرار هدر جدول در صفحات جدید
  //       showHead: 'everyPage',
  //       margin: { top: 50, bottom: 20 }, // فاصله از بالا برای هدر و از پایین برای فوتر
  //     });
  //     doc.save('Tüm_Ürünler_Raporu.pdf');
  //     showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
  //   } catch (error) {
  //     console.error('PDF oluşturulurken hata:', error);
  //     showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
  //   }
  // };

  const handlePrintAllItems = () => {
    if (!sortedAndFilteredItems || sortedAndFilteredItems.length === 0) {
      showAlert('PDF oluşturulacak ürün bulunamadı.', 'warning');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const stripHtml = (htmlString: string) => {
      const doc = new DOMParser().parseFromString(htmlString, 'text/html');
      return doc.body.textContent || "";
    };

    try {
      // افزودن فونت‌ها
      doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');

      // Add Times New Roman for headers and Arial for the table
      // فرض می‌کنیم این متغیرها حاوی داده Base64 فونت‌ها هستند
      doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
      doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');

      doc.addFileToVFS('Arial.ttf', ArialFont);
      doc.addFont('Arial.ttf', 'Arial', 'normal');

      const rowsWithoutHtml = sortedAndFilteredItems.map(item => {
        const descriptionWithoutHtml = item.description ? stripHtml(item.description) : '-';
        return [
          item.name || '-',
          item.unit?.title || '-',
          item.category?.name || '-',
          item.abbreviation || '-',
          item.weight !== null ? String(item.weight) : '-',
          descriptionWithoutHtml.length > 50 ? `${descriptionWithoutHtml.substring(0, 50)}...` : descriptionWithoutHtml,
          formatDateDisplay(item.createAt) || '-',
          item.status || '-',
        ];
      });

      autoTable(doc, {
        startY: 65, // Start table lower to make space for the new header layout
        head: [['Ürün Adı', 'Ölçü', 'Kategori', 'Kısaltma', 'Ağırlık', 'Açıklama', 'Oluşturulma Tarihi', 'Durum']],
        body: rowsWithoutHtml,
        theme: 'grid',
        styles: {
          font: 'Arial',
          fontStyle: 'normal',
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [242, 242, 242],
          textColor: [0, 0, 0],
          font: 'Arial',
          fontSize: 9,
        },
        didDrawPage: () => {
          // --- بخش جدید هدر ---
          // 1. عنوان در سطر اول و وسط
          doc.setFont('Arial', 'bold');
          doc.setFontSize(14);
          doc.text('Tüm Ürünler Raporu', pageWidth / 2, 15, { align: 'center' });

          // 2. تاریخ در سطر دوم و سمت چپ
          doc.setFontSize(10);
          doc.setFont('Times', 'bold');
          doc.text(`Tarih:`, 15, 25);

          doc.setFont('Times', 'normal');
          doc.text(`${formatDateDisplay(new Date().toISOString())}`, 30, 25);

          // 3. لوگو در سطر دوم و سمت راست
          doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

          // --- پایان بخش جدید هدر ---

          // --- بخش جدید فوتر ---
          // 1. اطلاعات شرکت در مرکز و با فونت 8
          doc.setFont('NotoSans', 'normal'); // فونت NotoSans را برای این متن‌ها تنظیم کنید
          doc.setFontSize(8);
          doc.setTextColor(0);
          const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx  Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
          ];

          let footerY = pageHeight - 30;
          companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 4;
          });

          // 2. شماره صفحه در سمت چپ
          const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);

          // 3. امضا در سمت راست
          doc.setFont('NotoSans', 'normal'); // فونت NotoSans را برای کلمه "İmza" تنظیم کنید
          doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
          doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15); // اضافه کردن خط امضا

        },
        margin: { top: 50, bottom: 45 }, // Adjusted margins for new header and footer layout
      });

      // ... بخش محاسبه و اضافه کردن جدول جمع وزن‌ها
      const totalWeightMap = new Map<string, number>();
      sortedAndFilteredItems.forEach(item => {
        if (item.weight !== null && !isNaN(Number(item.weight))) {
          const unitTitle = item.unit?.title || 'Bilinmeyen Birim';
          const currentWeight = totalWeightMap.get(unitTitle) || 0;
          const totalWeight = currentWeight + Number(item.weight);
          totalWeightMap.set(unitTitle, totalWeight);
        }
      });

      if (totalWeightMap.size > 0) {
        doc.addPage();
        doc.setFont('NotoSans');
        doc.setFontSize(14);
        doc.text('Ağırlık Toplamları', 15, 20);

        const summaryRows = Array.from(totalWeightMap.entries()).map(([unit, totalWeight]) => [
          unit,
          totalWeight.toFixed(2)
        ]);

        autoTable(doc, {
          startY: 30,
          head: [['Ölçü', 'Toplam Ağırlık']],
          body: summaryRows,
          theme: 'grid',
          styles: {
            font: 'NotoSans',
            fontSize: 8,
          },
          headStyles: {
            fillColor: [242, 242, 242],
            textColor: [0, 0, 0],
            font: 'NotoSans',
            fontSize: 9,
          },
        });
      }

      doc.save('Tüm_Ürünler_Raporu.pdf');
      showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');

    } catch (error) {
      console.error('PDF oluşturulurken hata:', error);
      showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
    }
  };
  const addCompanyInfo = (worksheet: Excel.Worksheet) => {
    worksheet.addRow([]); // یک سطر خالی برای فاصله
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
    setOpenDownloadModal(false); // بستن مودال بعد از انتخاب
    if (!sortedAndFilteredItems || sortedAndFilteredItems.length === 0) {
      showAlert('Dışa aktarılacak ürün bulunamadı.', 'warning');
      return;
    }

    showAlert('Excel dosyası oluşturuluyor...', 'info');

    try {
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Ürünler Raporu', {
        views: [{ rightToLeft: false }]
      });

      // --- استایل‌های مشترک (می‌توانید از نمونه کد خود کپی کنید) ---
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
        horizontal: 'center', // این مقدار به صورت یک لیترال تایپ 'center' شناخته می‌شود
        wrapText: true
      };

      const leftAlignment: Partial<Excel.Alignment> = {
        vertical: 'middle',
        horizontal: 'left', // این مقدار به صورت یک لیترال تایپ 'left' شناخته می‌شود
        wrapText: true
      };

      const rightAlignment: Partial<Excel.Alignment> = {
        vertical: 'middle',
        horizontal: 'right', // این مقدار به صورت یک لیترال تایپ 'right' شناخته می‌شود
        wrapText: true
      };


      // تعریف fullHeaderStyle با Type Assertion
      const fullHeaderStyle = {
        border: border,
        alignment: centerAlignment,
        font: headerFont,
        fill: headerFill
      } as Partial<Excel.Style>;


      // تعریف bodyStyle
      const bodyStyle = {
        border: border,
        alignment: leftAlignment, // از leftAlignment که یک شیء است استفاده کنید
        font: font
      } as Partial<Excel.Style>;
      // --------------------------------------------------------

      // --- هدر گزارش (اطلاعات کلی) ---
      worksheet.addRow(['', '', '']);
      worksheet.addRow(['Tüm Ürünler Raporu']).font = { name: 'Times New Roman', size: 12, bold: true };
      const lastRow = worksheet.lastRow;
      if (lastRow) {
        lastRow.getCell(1).alignment = { horizontal: 'center' };
      }
      worksheet.mergeCells('A2:H2');

      worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
      // worksheet.lastRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };

      const dateRow = worksheet.lastRow;
      if (dateRow) { // ✅ بررسی وجود سطر تاریخ
        dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
        dateRow.getCell(1).alignment = { horizontal: 'left' };
      }

      worksheet.addRow([]); // یک سطر خالی برای فاصله

      // --- هدر جدول اصلی ---
      const tableHeaders = ['Ürün Adı', 'Ölçü', 'Kategori', 'Kısaltma', 'Ağırlık', 'Açıklama', 'Oluşturulma Tarihi', 'Durum'];
      const headerRow = worksheet.addRow(tableHeaders);
      headerRow.eachCell((cell) => {
        cell.style = fullHeaderStyle;
      });

      // --- اضافه کردن داده‌ها ---
      sortedAndFilteredItems.forEach(item => {
        const descriptionWithoutHtml = item.description ? stripHtml(item.description) : '-';
        const row = worksheet.addRow([
          item.name || '-',
          item.unit?.title || '-',
          item.category?.name || '-',
          item.abbreviation || '-',
          item.weight !== null ? String(item.weight) : '-',
          descriptionWithoutHtml,
          formatDateDisplay(item.createAt) || '-',
          item.status || '-'
        ]);
        row.eachCell((cell) => {
          cell.style = bodyStyle;
        });
      });

      // --- اضافه کردن جدول جمع کل وزن ---
      const totalWeightMap = new Map<string, number>();
      sortedAndFilteredItems.forEach(item => {
        if (item.weight !== null && !isNaN(Number(item.weight))) {
          const unitTitle = item.unit?.title || 'Bilinmeyen Birim';
          const currentWeight = totalWeightMap.get(unitTitle) || 0;
          const totalWeight = currentWeight + Number(item.weight);
          totalWeightMap.set(unitTitle, totalWeight);
        }
      });

      if (totalWeightMap.size > 0) {
        worksheet.addRow([]);
        worksheet.addRow(['Ağırlık Toplamları']);
        // worksheet.lastRow.getCell(1).font = { name: 'Times New Roman', size: 12, bold: true };

        if (lastRow) {
          lastRow.getCell(1).font = { name: 'Times New Roman', size: 12, bold: true };
        }
        const summaryHeaders = ['Ölçü', 'Toplam Ağırlık'];
        worksheet.addRow(summaryHeaders).eachCell((cell) => cell.style = fullHeaderStyle);

        Array.from(totalWeightMap.entries()).forEach(([unit, totalWeight]) => {
          const row = worksheet.addRow([unit, totalWeight.toFixed(2)]);
          row.eachCell((cell, colNumber) => {
            cell.style = bodyStyle;
            if (colNumber === 2) {
              cell.alignment = rightAlignment;
              cell.numFmt = '#,##0.00';
            }
          });
        });
      }
      addCompanyInfo(worksheet);
      // --- تنظیم عرض ستون‌ها ---
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        if (column.eachCell) { // ✅ Add a check for the existence of the method
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
        }
        column.width = Math.min(Math.max(maxLength + 2, 12), 50);
      });

      // --- ذخیره فایل ---
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Tüm_Ürünler_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
      saveAs(new Blob([buffer]), fileName);

      showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
    } catch (error) {
      console.error("Excel dışa aktarılırken hata:", error);
      showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
    }
  };

  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>


        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>

          <Typography variant="h5" mb={2}>{editingId ? 'Ürün Düzenle' : 'Yeni Ürün Kaydı'}</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="stretch"
            flexGrow={1}
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          >
            {!isFormVisible && hasCreatePermission && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Ürün Belgesi kaydetmek için tıklayınız" : ""}>
                <BlinkingButton
                  variant="contained"
                  color="primary"
                  onClick={() => setIsFormVisible(true)}
                  isBlinking={isBlinking}
                  fullWidth={false} // در حالت موبایل بهتر است fullWidth نباشد
                >
                  Yeni Ürün Kaydet
                </BlinkingButton>
              </CustomTooltip>
            )}
            {isFormVisible && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={resetFormAndState}

                  // disabled={loadingButton}
                  fullWidth={false}
                  startIcon={<IconX size={20} />}
                >
                  Gizle
                </Button>
              </CustomTooltip>
            )}
          </Stack>
        </Stack>

        {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
          <Grid container spacing={2}>
            {/* Item Name */}
            <Grid item xs={12} md={6}>
              <CustomFormLabel htmlFor="item-name" required>Ürün Adı</CustomFormLabel>
              <CustomTextField
                id="item-name"
                placeholder="Ürün Adı"
                fullWidth
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  if (nameError && e.target.value.trim()) { // If there was a previous error and user starts typing
                    setNameError(false); // Clear the error
                    setNameHelperText(''); // Clear the helper text
                  }
                }}
                inputRef={itemNameInputRef}
                error={nameError}
                helperText={nameHelperText}
              />
            </Grid>
            {/* Unit Selection (with search) */}
            <Grid item xs={12} md={6}>
              <CustomFormLabel htmlFor="select-unit" required>Ölçü</CustomFormLabel>
              {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Ürün birimini seçin" : ""}> */}
              <FormControl fullWidth error={unitIdError}>
                <InputLabel id="select-unit-label">Ölçü Seçin</InputLabel>
                <Select
                  labelId="select-unit-label"
                  id="select-unit"
                  value={selectedUnitId || ''}
                  label="Ölçü Seçin"
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value as string);
                    if (unitIdError) { // Clear error when a unit is selected
                      setUnitIdError(false);
                      setUnitIdHelperText('');
                    }
                  }}
                  MenuProps={{
                    sx: { maxHeight: 300 },
                  }}
                  renderValue={(selected: any) => {
                    const unit = unitOptions.find(u => u.id === selected);
                    return unit ? unit.title : '';
                  }}
                  onClose={() => setUnitSearchTerm('')}
                >
                  <TextField
                    autoFocus
                    fullWidth
                    placeholder="Ölçü Ara..."
                    value={unitSearchTerm}
                    onChange={handleUnitSearchChange}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconSearch size={20} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {loadingUnits ? (
                    <MuiMenuItem disabled>
                      <CircularProgress size={20} /> Yükleniyor...
                    </MuiMenuItem>
                  ) : filteredUnitOptions.length > 0 ? (
                    filteredUnitOptions.map((unit) => (
                      <MuiMenuItem key={unit.id} value={unit.id}>
                        {unit.title}
                      </MuiMenuItem>
                    ))
                  ) : (
                    <MuiMenuItem disabled>Hiç birim bulunamadı.</MuiMenuItem>
                  )}
                </Select>
                {unitIdHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{unitIdHelperText}</Typography>} {/* **Display helper text** */}
              </FormControl>
              {/* </CustomTooltip> */}
            </Grid>
            {/* Category Selection (single-select tree) */}
            <Grid item xs={12} md={6}>
              <CustomFormLabel htmlFor="select-category" required>Kategori</CustomFormLabel>
              {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Kategorileri seçmek için tıklayın" : ""}> */}
              <FormControl fullWidth error={categoryIdError}> {/* **Added error prop to FormControl** */}
                <InputLabel id="select-category-label">Kategori Seçin</InputLabel>
                <Select
                  labelId="select-category-label"
                  id="select-category"
                  value={selectedCategoryId || ''}
                  open={isCategorySelectOpen}
                  onOpen={() => setIsCategorySelectOpen(true)}
                  onClose={handleCloseCategorySelect}
                  onChange={(event) => {
                    const newValue = event.target.value as string;
                    handleToggleCategorySelection(newValue, true);
                    // Error clearing for category is handled inside handleToggleCategorySelection via useCallback
                  }}
                  renderValue={(selected: any) => {
                    const category = allCategoriesFlat.find(cat => cat.id === selected);
                    return category ? category.name : '';
                  }}
                  MenuProps={{
                    sx: { maxHeight: 400 },
                    onClose: () => {
                      setCategorySearchTerm('');
                      setIsCategorySelectOpen(false);
                    },
                  }}
                >
                  {/* Search field for categories */}
                  <TextField
                    autoFocus
                    fullWidth
                    placeholder="Kategori Ara..."
                    value={categorySearchTerm}
                    onChange={handleCategorySearchChange}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <IconSearch size={20} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Display category tree */}
                  {loadingCategories ? (
                    <MuiMenuItem disabled>
                      <CircularProgress size={20} /> Yükleniyor...
                    </MuiMenuItem>
                  ) : categoryTreeForSelect.length > 0 ? (
                    categoryTreeForSelect.map((node) => (
                      <CategoryTreeSelectMenuItem
                        key={node.id}
                        node={node}
                        onToggleSelection={handleToggleCategorySelection}
                        selectedId={selectedCategoryId}
                        onCloseParentSelect={handleCloseCategorySelect}
                      />
                    ))
                  ) : (
                    <MuiMenuItem disabled>Hiç kategori bulunamadı.</MuiMenuItem>
                  )}
                </Select>
                {categoryIdHelperText && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{categoryIdHelperText}</Typography>} {/* **Display helper text** */}
              </FormControl>
              {/* </CustomTooltip> */}
            </Grid>
            {/* Abbreviation */}
            <Grid item xs={12} md={3}>
              <CustomFormLabel htmlFor="abbreviation">Kısaltma (4 Karakter)</CustomFormLabel>
              <CustomTooltip title={isTooltipGloballyEnabled ? "Ürünün 4 karakterlik kısaltmasını girin" : ""}>
                <CustomTextField
                  id="abbreviation"
                  placeholder="Kısaltma"
                  fullWidth
                  value={abbreviation}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setAbbreviation(e.target.value.substring(0, 4));
                    if (abbreviationError && e.target.value.trim() && e.target.value.length === 4) {
                      setAbbreviationError(false);
                      setAbbreviationHelperText('');
                    }
                  }}
                  inputProps={{ maxLength: 4 }}
                  error={abbreviationError}
                  helperText={abbreviationHelperText}
                />
              </CustomTooltip>
            </Grid>
            {/* ✅ اضافه شده: Weight */}
            <Grid item xs={12} md={3}>
              <CustomFormLabel htmlFor="weight">Ürün Birim Ağırlığı</CustomFormLabel>
              <CustomTextField
                id="weight"
                placeholder="Ağırlık"
                fullWidth
                type="number"
                value={weight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  if (value === '' || !isNaN(Number(value))) {
                    setWeight(value === '' ? '' : Number(value));
                  }
                  if (weightError && value.trim()) {
                    setWeightError(false);
                    setWeightHelperText('');
                  }
                }}
                inputProps={{ min: 0, step: "0.01" }}
                error={weightError}
                helperText={weightHelperText}
              />
            </Grid>
            {/* Description (text editor) */}
            <Grid item xs={12}>
              <CustomFormLabel htmlFor="description">Açıklama</CustomFormLabel>
              <ReactQuill
                theme="snow"
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  if (descriptionError && value.trim() && value !== '<p><br></p>') {
                    setDescriptionError(false);
                    setDescriptionHelperText('');
                  }
                }}
                placeholder="Ürün açıklamasını girin..."
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                  ],
                }}
                formats={[
                  'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
                  'list', 'bullet', 'link', 'image'
                ]}
                style={{ height: '150px', marginBottom: '40px', border: descriptionError ? '1px solid red' : undefined }} // **Apply red border for description error**
              />
              {descriptionError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>{descriptionHelperText}</Typography>} {/* **Display helper text** */}

            </Grid>

            {/* Form Buttons */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                {editingId !== null ? (
                  <>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçilen ürünü güncelleyin" : ""}>
                      <Button
                        variant="contained"
                        color="info"
                        onClick={editItem}
                        disabled={loadingButton}
                      >
                        {loadingButton ? <>
                          <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                        </> : 'Düzenlemek'}
                      </Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni ürün moduna dön" : ""}>
                      <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                        İptal Et
                      </Button>
                    </CustomTooltip>
                  </>
                ) : (

                  <>
                    {hasCreatePermission && (
                      <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir ürün ekle" : ""}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={insertItem}
                          disabled={loadingButton}
                        >
                          {loadingButton ? <>
                            <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                          </> : 'Yeni Ürün Ekle'}
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
                {/* <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePrintAllItems}
                  startIcon={<IconFileDownload />}
                >
                  Tümünü İndir (PDF)
                </Button> */}
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenDownloadModal(true)} // تغییر اکشن دکمه
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
                label="Ürün Ara"
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
            {/* Status Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Status filter"
                fullWidth
              >
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm ürünleri göster" : ""}> */}
                <StyledToggleButton
                  value="all"
                  aria-label="all items"
                >
                  Tümü
                </StyledToggleButton>
                {/* </CustomTooltip> */}
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif ürünleri göster" : ""}> */}
                <StyledToggleButton
                  value="active"
                  aria-label="active items"
                >
                  Aktif
                </StyledToggleButton>
                {/* </CustomTooltip> */}
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif ürünleri göster" : ""}> */}
                <StyledToggleButton
                  value="inactive"
                  aria-label="inactive items"
                >
                  Pasif
                </StyledToggleButton>
                {/* </CustomTooltip> */}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          <Table aria-label="item table">
            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
              <TableRow>
                <TableCell >
                  {/* Sortable Column: Ürün Adı */}
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                    style={{ color: "#171c23" }}
                  >
                    <Typography variant="h6">Ürün Adı</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  {/* Sortable Column: Ölçü */}
                  <TableSortLabel
                    active={orderBy === 'unit.title'} // Sorting by nested property 'unit.title'
                    direction={orderBy === 'unit.title' ? order : 'asc'}
                    onClick={() => handleRequestSort('unit.title')}
                    style={{ color: "#171c23" }}
                  >
                    <Typography variant="h6">Ölçü</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  {/* Sortable Column: Kategori */}
                  <TableSortLabel
                    active={orderBy === 'category.name'} // Sorting by nested property 'category.name'
                    direction={orderBy === 'category.name' ? order : 'asc'}
                    onClick={() => handleRequestSort('category.name')}
                    style={{ color: "#171c23" }}
                  >
                    <Typography variant="h6">Kategori</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  {/* Sortable Column: Kısaltma */}
                  <TableSortLabel
                    active={orderBy === 'abbreviation'}
                    direction={orderBy === 'abbreviation' ? order : 'asc'}
                    onClick={() => handleRequestSort('abbreviation')}
                    style={{ color: "#171c23" }}
                  >
                    <Typography variant="h6">Kısaltma</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  {/* ✅ اضافه شده: ستون وزن */}
                  <TableSortLabel
                    active={orderBy === 'weight'}
                    direction={orderBy === 'weight' ? order : 'asc'}
                    onClick={() => handleRequestSort('weight')}
                    style={{ color: "#171c23" }}
                  >
                    <Typography variant="h6">Ağırlık</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  style={{ color: "#171c23" }}>
                  <Typography variant="h6">Açıklama</Typography> {/* Description is not easily sortable */}
                </TableCell>
                <TableCell>
                  {/* Sortable Column: Oluşturulma Tarihi */}
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
                  {/* Sortable Column: Durum */}
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                    style={{ color: "#171c23" }}
                  >
                    <Typography variant="h6">Durum</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingItems ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                    <Typography variant="subtitle1" color="textSecondary">
                      Ürünler yükleniyor...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((row) => (
                  <TableRow key={row.id} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="h6">{row.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{row.unit.title}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{row.category.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{row.abbreviation}</Typography>
                    </TableCell>
                    {/* ✅ اضافه شده: نمایش وزن */}
                    <TableCell>
                      <Typography variant="body1">
                        {row.weight || ''}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                      <Box sx={{
                        maxHeight: '5em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        <div dangerouslySetInnerHTML={{ __html: row.description }} />
                      </Box>
                      {row.description.length > 50 && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>

                          <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                            handleOpenDescriptionModal(row.description);

                          }}>
                            Devamını Oku
                          </Button>
                        </CustomTooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography>
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
                          'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`,
                        }}
                      >

                        {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ürünü pasif yap" : ""}>
                            <MuiMenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Pasif Yap
                            </MuiMenuItem>
                          </CustomTooltip>

                        )}
                        {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ürünü aktif yap" : ""}>
                            <MuiMenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif Yap
                            </MuiMenuItem>
                          </CustomTooltip>
                        )}
                        {hasEditPermission && (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ürünü düzenle" : ""}>
                            <MuiMenuItem onClick={handleEditClick}>
                              <ListItemIcon>
                                <IconEdit width={18} />
                              </ListItemIcon>
                              Düzenlemek
                            </MuiMenuItem>
                          </CustomTooltip>
                        )}
                        {hasDeletePermission && (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ürünü sil" : ""}>
                            <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                              <ListItemIcon>
                                <IconTrash width={18} />
                              </ListItemIcon>
                              Silmek
                            </MuiMenuItem>
                          </CustomTooltip>
                        )}
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="subtitle1" color="textSecondary">
                      Hiç ürün bulunamadı.
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
          count={sortedAndFilteredItems.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteItem
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        itemIdToDelete={itemIdToDelete}
        onDeleteSuccess={getListItem}
        showAlert={showAlert}
      />

      {/* Full Description Modal */}
      <Dialog
        open={openDescriptionModal}
        onClose={handleCloseDescriptionModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Açıklamanın Tamamı</DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDescriptionModal} color="primary">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

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
              onClick={handlePrintAllItems} // تابع دانلود PDF
            >
              PDF Olarak İndir
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<IconFileDownload />}
              onClick={handleExportExcel} // تابع دانلود Excel
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

export default ListItemComponent;