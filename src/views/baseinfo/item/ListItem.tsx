// ListItem.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, Checkbox, InputAdornment, TablePagination,
  TextField, CircularProgress, FormControl, InputLabel, Select,
  MenuItem as MuiMenuItem,
  OutlinedInput,
  ToggleButtonGroup, ToggleButton as MuiToggleButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  List, ListItem as MuiListItem,
  ListItemText,
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
  IconDots, IconEdit, IconTrash, IconSearch, IconArrowsMaximize,
  IconCategory, IconChevronRight, IconChevronDown,
} from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteItem from './DeleteItem';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';


interface ItemType {
  id: string;
  name: string;
  description: string;
  abbreviation: string;
  recordStatus: number;
  createAt: string;
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


const ListItemComponent = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [originalName, setOriginalName] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);

  const [abbreviation, setAbbreviation] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [unitOptions, setUnitOptions] = useState<UnitOptionType[]>([]);
  const [allCategoriesFlat, setAllCategoriesFlat] = useState<FlatCategoryType[]>([]);
  const [itemsList, setItemsList] = useState<ItemType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalItemData, setOriginalItemData] = useState<ItemType | null>(null);

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


  const categoryTreeForSelect = useMemo(() => {
    return buildCategoryTreeForSelect(allCategoriesFlat, categorySearchTerm, null);
  }, [allCategoriesFlat, categorySearchTerm]);


  const handleToggleCategorySelection = useCallback((categoryId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCategoryId(categoryId);
      const selectedCat = allCategoriesFlat.find(cat => cat.id === categoryId);
      setSelectedCategoryName(selectedCat ? selectedCat.name : null);
    } else {
      setSelectedCategoryId(null);
      setSelectedCategoryName(null);
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

  const handleClickOpenDeleteModal = () => {
    if (selectedRowForMenu) {
      setItemIdToDelete(selectedRowForMenu.id);
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

  const resetFormAndState = () => {
    setName('');
    setSelectedUnitId(null);
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
    setAbbreviation('');
    setDescription('');
    setEditingId(null);
    setOriginalItemData(null);
    setUnitSearchTerm('');
    setCategorySearchTerm('');
    clearAlert();
  };

  const handleEditClick = () => {
    if (selectedRowForMenu) {
      setName(selectedRowForMenu.name);
      setOriginalName(selectedRowForMenu.name);
      setSelectedUnitId(selectedRowForMenu.unit.id);
      setSelectedCategoryId(selectedRowForMenu.category.id);
      setSelectedCategoryName(selectedRowForMenu.category.name);
      setAbbreviation(selectedRowForMenu.abbreviation);
      setDescription(selectedRowForMenu.description);
      setEditingId(selectedRowForMenu.id);
      setOriginalItemData(selectedRowForMenu);
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
  };

  const insertItem = async () => {
    if (!name.trim() || selectedUnitId === null || selectedCategoryId === null || !abbreviation.trim() || !description.trim()) {
      showAlert('Tüm zorunlu alanları doldurun!', 'warning');
      return;
    }
    if (abbreviation.length !== 4) {
      showAlert('Kısaltma 4 karakter olmalıdır!', 'warning');
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
          abbreviation,
          categoryId: Number(selectedCategoryId), // Use selectedCategoryId
          itemUnitId: Number(selectedUnitId) // Use selectedUnitId, renamed as per API spec
        },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data && response.data.success) {
        showAlert('Yeni ürün başarıyla eklendi!', 'success');
        resetFormAndState();
        getListItem(); // Refresh list after successful creation
      } else {
        showAlert(response.data.message || 'Ürün eklenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error inserting item:", e);
        showAlert('Ürün eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  };

  const editItem = async () => {
    if (!name.trim() || selectedUnitId === null || selectedCategoryId === null || !abbreviation.trim() || !description.trim()) {
      showAlert('Tüm zorunlu alanları doldurun!', 'warning');
      return;
    }
    if (abbreviation.length !== 4) {
      showAlert('Kısaltma 4 karakter olmalıdır!', 'warning');
      return;
    }
    if (name === originalName) {
        showAlert('İsimde herhangi bir değişiklik yapmadınız.', 'info');
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
          newName:name,
          description,
          abbreviation,
          categoryId: Number(selectedCategoryId), // Use selectedCategoryId
          itemUnitId: Number(selectedUnitId) // Use selectedUnitId, renamed as per API spec
        },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data && response.data.success) {
        showAlert('Yeni ürün başarıyla eklendi!', 'success');
        resetFormAndState();
        getListItem(); // Refresh list after successful creation
      } else {
        showAlert(response.data.message || 'Ürün eklenirken bir hata oluştu.', 'error');
      }

    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.log("Error inserting item:", e);
        showAlert('Ürün eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
          id:Number(id),
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
        const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
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
        setUnitOptions(response.data.data.map((unit: any) => ({
          id: unit.id,
          title: unit.title
        })));
      } else {
        console.error("Failed to fetch units:", response.data.message);
        showAlert('Birimler yüklenirken hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error fetching units:", e);
        showAlert('Birimler sunucudan alınamadı.', 'error');
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
        const flattened = flattenCategories(response.data.data);
        setAllCategoriesFlat(flattened);
      } else {
        console.error("Failed to fetch categories:", response.data.message);
        showAlert('Kategoriler yüklenirken hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
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
          recordStatus: item.recordStatus,
          createAt: item.createAt,
          category: {
            id: item.category.id,
            name: item.category.name,
            depth: item.category.depth,
            createAt: item.category.createAt,
            recordStatus: item.category.recordStatus,
          },
          unit: {
            id: item.unit.id,
            title: item.unit.title,
            recordStatus: item.unit.recordStatus,
            createAt: item.unit.createAt,
          },
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Etkin değil' : 'Silindi',
        }));
        setItemsList(processedData.sort((a: ItemType, b: ItemType) => {
          const dateA = new Date(a.createAt);
          const dateB = new Date(b.createAt);
          return dateB.getTime() - dateA.getTime();
        }));
      } else {
        console.error("Failed to fetch items:", response.data.message);
        showAlert('Ürünler yüklenmedi.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkinز yok. Lütfen tekrar giriş yapın.', 'error');
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
    if (newFilter !== null) {
      setStatusFilter(newFilter);
      setPage(0);
    }
  };

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

  const handleUnitSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUnitSearchTerm(event.target.value);
  };

  const filteredUnitOptions = unitOptions.filter(unit =>
    unit.title.toLowerCase().includes(unitSearchTerm.toLowerCase())
  );

  const handleCategorySearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategorySearchTerm(event.target.value);
  };


  const filteredAndStatusItems = itemsList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.abbreviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.recordStatus === 0) ||
      (statusFilter === 'inactive' && item.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  const paginatedItems = filteredAndStatusItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  const handleOpenDescriptionModal = (descriptionContent: string) => {
    setFullDescriptionContent(descriptionContent);
    setOpenDescriptionModal(true);
  };

  const handleCloseDescriptionModal = () => {
    setOpenDescriptionModal(false);
    setFullDescriptionContent('');
  };


  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Grid container spacing={2}>
          {/* Item Name */}
          <Grid item xs={12} md={6}>
            <CustomFormLabel htmlFor="item-name">Ürün Adı</CustomFormLabel>
            <CustomTextField
              id="item-name"
              placeholder="Ürün Adı"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>
          {/* Unit Selection (with search) */}
          <Grid item xs={12} md={6}>
            <CustomFormLabel htmlFor="select-unit">Birim</CustomFormLabel>
            {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Ürün birimini seçin" : ""}> */}
            <FormControl fullWidth>
              <InputLabel id="select-unit-label">Birim Seçin</InputLabel>
              <Select
                labelId="select-unit-label"
                id="select-unit"
                value={selectedUnitId || ''}
                label="Birim Seçin"
                onChange={(e) => setSelectedUnitId(e.target.value as string)}
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
                  placeholder="Birim Ara..."
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
            </FormControl>
            {/* </CustomTooltip> */}
          </Grid>
          {/* Category Selection (single-select tree) */}
          <Grid item xs={12} md={6}>
            <CustomFormLabel htmlFor="select-category">Kategori</CustomFormLabel>
            {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Kategorileri seçmek için tıklayın" : ""}> */}
            <FormControl fullWidth>
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
            </FormControl>
            {/* </CustomTooltip> */}
          </Grid>
          {/* Abbreviation */}
          <Grid item xs={12} md={6}>
            <CustomFormLabel htmlFor="abbreviation">Kısaltma (4 Karakter)</CustomFormLabel>
            <CustomTooltip title={isTooltipGloballyEnabled ? "Ürünün 4 karakterlik kısaltmasını girin" : ""}>
              <CustomTextField
                id="abbreviation"
                placeholder="Kısaltma"
                fullWidth
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.substring(0, 4))}
                inputProps={{ maxLength: 4 }}
              />
            </CustomTooltip>
          </Grid>
          {/* Description (text editor) */}
          <Grid item xs={12}>
            <CustomFormLabel htmlFor="description">Açıklama</CustomFormLabel>
            <ReactQuill
              theme="snow"
              value={description}
              onChange={setDescription}
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
              style={{ height: '150px', marginBottom: '40px' }}
            />
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
                        <BoltIcon size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
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
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir ürün ekle" : ""}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={insertItem}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                      </> : 'Yeni Ürün Ekle'}
                    </Button>
                  </CustomTooltip>
                </>
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm ürünleri göster" : ""}>
                  <StyledToggleButton
                    value="all"
                    aria-label="all items"
                  >
                    Tümü
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif ürünleri göster" : ""}>
                  <StyledToggleButton
                    value="active"
                    aria-label="active items"
                  >
                    Aktif
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif ürünleri göster" : ""}>
                  <StyledToggleButton
                    value="inactive"
                    aria-label="inactive items"
                  >
                    Etkin Değil
                  </StyledToggleButton>
                </CustomTooltip>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          <Table aria-label="item table">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="h6">Ürün Adı</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Birim</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Kategori</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Kısaltma</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Açıklama</Typography>
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
              {loadingItems ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                    <Typography variant="subtitle1" color="textSecondary">
                      محصولات در حال بارگیری هستند...
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
                          <Button size="small" onClick={() => handleOpenDescriptionModal(row.description)} sx={{ p: 0, minWidth: 'auto' }}>
                            Görüş
                          </Button>
                        </CustomTooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{formatDate(row.createAt)}</Typography>
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
                        {selectedRowForMenu?.recordStatus === 0 ? (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ürünü pasif yap" : ""}>
                            <MuiMenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Etkin değil
                            </MuiMenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ürünü aktif yap" : ""}>
                            <MuiMenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif
                            </MuiMenuItem>
                          </CustomTooltip>
                        )}
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ürünü düzenle" : ""}>
                          <MuiMenuItem onClick={handleEditClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MuiMenuItem>
                        </CustomTooltip>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ürünü sil" : ""}>
                          <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                            <ListItemIcon>
                              <IconTrash width={18} />
                            </ListItemIcon>
                            Silmek
                          </MuiMenuItem>
                        </CustomTooltip>
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
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
          count={filteredAndStatusItems.length}
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
    </>
  );
};

export default ListItemComponent;