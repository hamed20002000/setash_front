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

import BoltIcon from 'assets/images/profile/user-d.svg';
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
  id: number;
  name: string;
  unitId: number;
  unitName?: string;
  categoryId: number;
  categoryName?: string;
  abbreviation: string;
  description: string;
  createAt: string;
  recordStatus?: number;
  status: string;
}

interface UnitOptionType {
  id: number;
  name: string;
}

interface CategoryOptionType {
  id: number;
  name: string;
  parentId?: number | null;
  depth: number;
}

const MOCK_ITEMS: ItemType[] = [
  { id: 1, name: 'Akıllı Telefon X', unitId: 1, unitName: 'Adet', categoryId: 101111, categoryName: 'Samsung Android', abbreviation: 'SPHX', description: '<p>Bu, en yeni akıllı telefon modelidir. Harika özelliklere sahiptir. Uzun açıklama deneme amacıyla yazılmıştır ve iki satırdan uzun olacaktır. Bu metin, içeriğin kesilip üç nokta ile gösterilip daha sonra tam olarak gösterilebilmesi için yeterince uzun olmalıdır.</p><p>Devamı burada...</p><p>Daha fazla bilgi.</p>', createAt: '2024-06-15T10:00:00.000Z', recordStatus: 0, status: 'Aktif' },
  { id: 2, name: 'T-Shirt (Pamuk)', unitId: 1, unitName: 'Adet', categoryId: 201, categoryName: 'Erkek Giyim', abbreviation: 'TSRT', description: '<p>Yüksek kaliteli pamuklu tişört. Her mevsim giyilebilir.</p>', createAt: '2024-06-10T11:30:00.000Z', recordStatus: 0, status: 'Aktif' },
  { id: 3, name: '1 Lt Süt', unitId: 3, unitName: 'Litre', categoryId: 3, categoryName: 'Ev ve Yaşam', abbreviation: 'MILK', description: '<p>Taze ve doğal süt.</p>', createAt: '2024-06-05T14:00:00.000Z', recordStatus: 1, status: 'Etkin değil' },
];

const MOCK_UNIT_OPTIONS: UnitOptionType[] = [
  { id: 1, name: 'Adet' },
  { id: 2, name: 'Kilogram' },
  { id: 3, name: 'Litre' },
  { id: 4, name: 'Metre' },
  { id: 5, name: 'Kutu' },
  { id: 6, name: 'Mililitre' },
  { id: 7, name: 'Gram' },
  { id: 8, name: 'Ton' },
  { id: 9, name: 'Paket' },
  { id: 10, name: 'Düzine' },
];

const MOCK_ALL_CATEGORIES: CategoryOptionType[] = [
  { id: 1, name: 'Elektronik', depth: 0, parentId: null },
  { id: 2, name: 'Giyim', depth: 0, parentId: null },
  { id: 3, name: 'Ev ve Yaşam', depth: 0, parentId: null },

  { id: 101, name: 'Cep Telefonları', depth: 1, parentId: 1 },
  { id: 102, name: 'Bilgisayarlar', depth: 1, parentId: 1 },
  { id: 103, name: 'Televizyonlar', depth: 1, parentId: 1 },

  { id: 1011, name: 'Akıllı Telefonlar', depth: 2, parentId: 101 },
  { id: 1012, name: 'Tuşlu Telefonlar', depth: 2, parentId: 101 },

  { id: 10111, name: 'Android Telefonlar', depth: 3, parentId: 1011 },
  { id: 10112, name: 'iOS Telefonlar', depth: 3, parentId: 1011 },

  { id: 101111, name: 'Samsung Android', depth: 4, parentId: 10111 },
  { id: 101112, name: 'Xiaomi Android', depth: 4, parentId: 10111 },
  { id: 101113, name: 'Google Pixel', depth: 4, parentId: 10111 },

  { id: 1011111, name: 'Galaxy S Series', depth: 5, parentId: 101111 },
  { id: 1011112, name: 'Galaxy A Series', depth: 5, parentId: 101111 },

  { id: 10111111, name: 'Galaxy S25', depth: 6, parentId: 1011111 },
  { id: 10111112, name: 'Galaxy S25 Ultra', depth: 6, parentId: 1011111 },
  { id: 101111111, name: 'Galaxy S25 5G', depth: 7, parentId: 10111111 },
];


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
  id: number;
  name: string;
  parentId: number | null;
  depth: number;
  children: CategoryNode[];
}

const buildCategoryTreeForSelect = (categories: CategoryOptionType[], searchTerm: string, parentId: number | null = null): CategoryNode[] => {
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
  onToggleSelection: (categoryId: number, isChecked: boolean) => void;
  selectedId: number | null;
  onCloseParentSelect: () => void;
}

const CategoryTreeSelectMenuItem: React.FC<CategoryTreeSelectMenuItemProps> = ({ node, onToggleSelection, selectedId, onCloseParentSelect }) => {
  const [open, setOpen] = useState(false);
  const isChecked = selectedId === node.id;

  const handleCheckboxClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const newCheckedState = event.target.checked;
    onToggleSelection(node.id, newCheckedState);
    if (newCheckedState) { // Only close if the item is being selected
      onCloseParentSelect();
    }
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleMenuItemClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle selection when MenuItem itself is clicked
    const newCheckedState = !isChecked;
    onToggleSelection(node.id, newCheckedState);
    if (newCheckedState) { // Only close if the item is being selected
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
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false); // New state to control Select open/close

  const [abbreviation, setAbbreviation] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [unitOptions, setUnitOptions] = useState<UnitOptionType[]>(MOCK_UNIT_OPTIONS);
  const [itemsList, setItemsList] = useState<ItemType[]>(MOCK_ITEMS);
  const [editingId, setEditingId] = useState<number | null>(null);
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

  const { isTooltipGloballyEnabled } = useTooltip();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
  const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [allCategoriesFlat] = useState<CategoryOptionType[]>(MOCK_ALL_CATEGORIES);


  const categoryTreeForSelect = useMemo(() => {
    return buildCategoryTreeForSelect(allCategoriesFlat, categorySearchTerm, null);
  }, [allCategoriesFlat, categorySearchTerm]);


  const handleToggleCategorySelection = useCallback((categoryId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedCategoryIds([categoryId]);
    } else {
      setSelectedCategoryIds([]);
    }
    const newSelectedName = MOCK_ALL_CATEGORIES.find(cat => cat.id === categoryId)?.name || '';
    setSelectedCategoryNames(isChecked ? [newSelectedName] : []);
  }, []);

  // Function to close the Select Category
  const handleCloseCategorySelect = () => {
    setIsCategorySelectOpen(false); // Set the state to close the Select
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
    setSelectedCategoryIds([]);
    setSelectedCategoryNames([]);
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
      setSelectedUnitId(selectedRowForMenu.unitId);
      setSelectedCategoryIds([selectedRowForMenu.categoryId]);
      setSelectedCategoryNames([selectedRowForMenu.categoryName || '']);

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
    if (!name.trim() || selectedUnitId === null || selectedCategoryIds.length === 0 || !abbreviation.trim() || !description.trim()) {
      showAlert('Tüm zorunlu alanları doldurun!', 'warning');
      return;
    }
    if (abbreviation.length !== 4) {
      showAlert('Kısaltma 4 karakter olmalıdır!', 'warning');
      return;
    }
    clearAlert();
    setLoadingButton(true);

    try {
      const newItemId = MOCK_ITEMS.length > 0 ? Math.max(...MOCK_ITEMS.map(i => i.id)) + 1 : 1;
      const newUnitName = unitOptions.find(u => u.id === selectedUnitId)?.name || 'Bilinmiyor';
      const newCategoryName = MOCK_ALL_CATEGORIES.find(c => c.id === selectedCategoryIds[0])?.name || 'Bilinmiyor';

      const newItem: ItemType = {
        id: newItemId,
        name: name,
        unitId: selectedUnitId,
        unitName: newUnitName,
        categoryId: selectedCategoryIds[0],
        categoryName: newCategoryName,
        abbreviation: abbreviation,
        description: description,
        createAt: new Date().toISOString(),
        recordStatus: 0,
        status: 'Aktif',
      };

      MOCK_ITEMS.push(newItem);
      showAlert('Yeni ürün başarıyla eklendi!', 'success');
      resetFormAndState();
      getListItem();
    } catch (e: any) {
      console.error("Error inserting item:", e);
      showAlert('Ürün eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editItem = async () => {
    if (editingId === null || originalItemData === null) return;
    if (!name.trim() || selectedUnitId === null || selectedCategoryIds.length === 0 || !abbreviation.trim() || !description.trim()) {
      showAlert('Tüm zorunlu alanları doldurun!', 'warning');
      return;
    }
    if (abbreviation.length !== 4) {
      showAlert('Kısaltma 4 karakter olmalıdır!', 'warning');
      return;
    }
    clearAlert();

    const isChanged = (
      name !== originalItemData.name ||
      selectedUnitId !== originalItemData.unitId ||
      selectedCategoryIds[0] !== originalItemData.categoryId ||
      abbreviation !== originalItemData.abbreviation ||
      description !== originalItemData.description
    );

    if (!isChanged) {
      showAlert('Herhangi bir değişiklik yapmadınız.', 'info');
      resetFormAndState();
      return;
    }

    setLoadingButton(true);
    try {
      const index = MOCK_ITEMS.findIndex(i => i.id === editingId);
      if (index !== -1) {
        const updatedUnitName = unitOptions.find(u => u.id === selectedUnitId)?.name || 'Bilinmiyor';
        const updatedCategoryName = MOCK_ALL_CATEGORIES.find(c => c.id === selectedCategoryIds[0])?.name || 'Bilinmiyor';

        MOCK_ITEMS[index] = {
          ...MOCK_ITEMS[index],
          name: name,
          unitId: selectedUnitId,
          unitName: updatedUnitName,
          categoryId: selectedCategoryIds[0],
          categoryName: updatedCategoryName,
          abbreviation: abbreviation,
          description: description,
        };
      }
      showAlert('Ürün başarıyla güncellendi!', 'success');
      resetFormAndState();
      getListItem();
    } catch (e: any) {
      console.error("Error updating item:", e);
      showAlert('Ürün güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const sendStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    try {
      const index = MOCK_ITEMS.findIndex(i => i.id === id);
      if (index !== -1) {
        const newStatusText = statusValue === 0 ? 'Aktif' : statusValue === 1 ? 'Etkin değil' : 'Silindi';
        MOCK_ITEMS[index] = { ...MOCK_ITEMS[index], recordStatus: statusValue, status: newStatusText };
      }
      const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
      showAlert(`Ürün başarıyla ${statusText} olarak ayarlandı!`, 'success');
      getListItem();
    } catch (e: any) {
      console.error("Error updating status:", e);
      showAlert('Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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

  const getListItem = () => {
    const sortedData = [...MOCK_ITEMS].sort((a, b) => {
      const dateA = new Date(a.createAt);
      const dateB = new Date(b.createAt);
      return dateB.getTime() - dateA.getTime();
    });
    setItemsList(sortedData);
    setPage(0);
    setSearchTerm('');
    setStatusFilter('all');
  };

  useEffect(() => {
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
    unit.name.toLowerCase().includes(unitSearchTerm.toLowerCase())
  );

  const handleCategorySearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCategorySearchTerm(event.target.value);
  };


  const filteredAndStatusItems = itemsList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.abbreviation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (item.categoryName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
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
                onChange={(e) => setSelectedUnitId(Number(e.target.value))}
                MenuProps={{
                  sx: { maxHeight: 300 },
                }}
                renderValue={(selected: any) => {
                  const unit = unitOptions.find(u => u.id === selected);
                  return unit ? unit.name : '';
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
                {filteredUnitOptions.length > 0 ? (
                  filteredUnitOptions.map((unit) => (
                    <MuiMenuItem key={unit.id} value={unit.id}>
                      {unit.name}
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
                value={selectedCategoryIds[0] || ''}
                open={isCategorySelectOpen} // Control open state
                onOpen={() => setIsCategorySelectOpen(true)}
                onClose={handleCloseCategorySelect} // Close handler
                onChange={(event) => {
                  const newValue = Number(event.target.value);
                  handleToggleCategorySelection(newValue, true);
                  // The Select component will close itself because its value has effectively changed
                  // and we are also manually closing it via state.
                }}
                renderValue={(selected: any) => {
                  const category = MOCK_ALL_CATEGORIES.find(cat => cat.id === selected);
                  return category ? category.name : '';
                }}
                MenuProps={{
                  sx: { maxHeight: 400 },
                  onClose: () => {
                    setCategorySearchTerm('');
                    setIsCategorySelectOpen(false); // Ensure select closes on menu close
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
                {categoryTreeForSelect.length > 0 ? (
                  categoryTreeForSelect.map((node) => (
                    <CategoryTreeSelectMenuItem
                      key={node.id}
                      node={node}
                      onToggleSelection={handleToggleCategorySelection}
                      selectedId={selectedCategoryIds[0] || null}
                      onCloseParentSelect={handleCloseCategorySelect} // Pass close function to children
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
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
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
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
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
              {paginatedItems.length > 0 ? (
                paginatedItems.map((row) => (
                  <TableRow key={row.id} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="h6">{row.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{row.unitName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{row.categoryName}</Typography>
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