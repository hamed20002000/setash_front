// ListCategory.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  CircularProgress, Paper,
  ToggleButtonGroup, ToggleButton as MuiToggleButton, // نام MuiToggleButton را برای ToggleButton اصلی تغییر دادم
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles'; // **استایل‌شده کامپوننت‌ها نیاز به styled و useTheme دارند**

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

interface CategoryType {
  id: number;
  name: string;
  createAt: string;
  recordStatus?: number;
  status: string;
  parentId?: number | null;
  depth: number;
}

interface BreadcrumbItem {
  id: number | null;
  name: string;
  depth: number;
}

// **داده‌های ساختگی گسترش یافته تا عمق 7**
const MOCK_CATEGORIES: CategoryType[] = [
  // ریشه (depth 0)
  { id: 1, name: 'Elektronik', createAt: '2024-01-15T10:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: null, depth: 0 },
  { id: 2, name: 'Giyim', createAt: '2024-02-20T11:30:00.000Z', recordStatus: 0, status: 'Aktif', parentId: null, depth: 0 },
  { id: 3, name: 'Ev ve Yaşam', createAt: '2024-03-01T14:00:00.000Z', recordStatus: 1, status: 'Etkin değil', parentId: null, depth: 0 },

  // زیردسته‌های Elektronik (depth 1, parentId: 1)
  { id: 101, name: 'Cep Telefonları', createAt: '2024-04-05T09:15:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 1, depth: 1 },
  { id: 102, name: 'Bilgisayarlar', createAt: '2024-04-10T10:30:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 1, depth: 1 },

  // زیردسته‌های Cep Telefonları (depth 2, parentId: 101)
  { id: 1011, name: 'Akıllı Telefonlar', createAt: '2024-05-01T08:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 101, depth: 2 },
  { id: 1012, name: 'Tuşlu Telefonlar', createAt: '2024-05-03T09:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 101, depth: 2 },

  // زیردسته‌های Akıllı Telefonlar (depth 3, parentId: 1011)
  { id: 10111, name: 'Android Telefonlar', createAt: '2024-06-01T10:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 1011, depth: 3 },
  { id: 10112, name: 'iOS Telefonlar', createAt: '2024-06-05T11:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 1011, depth: 3 },

  // زیردسته‌های Android Telefonlar (depth 4, parentId: 10111)
  { id: 101111, name: 'Samsung Android', createAt: '2024-07-01T10:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 10111, depth: 4 },
  { id: 101112, name: 'Xiaomi Android', createAt: '2024-07-05T11:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 10111, depth: 4 },
  { id: 101113, name: 'Google Pixel', createAt: '2024-07-08T12:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 10111, depth: 4 },

  // زیردسته‌های Samsung Android (depth 5, parentId: 101111)
  { id: 1011111, name: 'Galaxy S Series', createAt: '2024-08-01T10:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 101111, depth: 5 },
  { id: 1011112, name: 'Galaxy A Series', createAt: '2024-08-05T11:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 101111, depth: 5 },

  // زیردسته‌های Galaxy S Series (depth 6, parentId: 1011111)
  { id: 10111111, name: 'Galaxy S25', createAt: '2024-09-01T10:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 1011111, depth: 6 },
  { id: 10111112, name: 'Galaxy S25 Ultra', createAt: '2024-09-05T11:00:00.000Z', recordStatus: 0, status: 'Aktif', parentId: 1011111, depth: 6 },
];

// **ToggleButton سفارشی با استایل‌های شرطی**
const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
  '&.Mui-selected': {
    color: 'white', // متن سفید برای دکمه انتخاب شده
    // رنگ‌ها بر اساس value و selected تعیین می‌شوند
    ...(value === 'all' && selected && {
      backgroundColor: theme.palette.primary.main,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    }),
    ...(value === 'active' && selected && {
      backgroundColor: theme.palette.success.main,
      '&:hover': {
        backgroundColor: theme.palette.success.dark,
      },
    }),
    ...(value === 'inactive' && selected && {
      backgroundColor: theme.palette.error.main,
      '&:hover': {
        backgroundColor: theme.palette.error.dark,
      },
    }),
  },
  '&:not(.Mui-selected)': {
    color: theme.palette.text.primary, // رنگ متن پیش‌فرض برای دکمه‌های غیرانتخاب
    borderColor: theme.palette.divider, // رنگ border پیش‌فرض برای دکمه‌های غیرانتخاب
    '&:hover': {
        backgroundColor: theme.palette.action.hover, // رنگ هاور پیش‌فرض برای حالت غیرانتخاب
    },
  },
}));


const ListCategory = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [categoriesList, setCategoriesList] = useState<CategoryType[]>(MOCK_CATEGORIES);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalName, setOriginalName] = useState<string>('');

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<CategoryType | null>(null);

  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);

  const { isTooltipGloballyEnabled } = useTooltip();

  const [currentParentCategory, setCurrentParentCategory] = useState<CategoryType | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Tüm Kategoriler', depth: -1 },
  ]);

  const MAX_BREADCRUMB_ITEMS = 4;

  // --- State جدید برای فیلتر وضعیت ---
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all'); // 'all', 'active', 'inactive'


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
    filterAndSortCategories(currentParentCategory?.id || null);
  };

  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  };

  const clearAlert = () => {
    setAlertMessage(null);
  };

  const handleEditClick = () => {
    if (selectedRowForMenu) {
      setName(selectedRowForMenu.name);
      setOriginalName(selectedRowForMenu.name);
      setEditingId(selectedRowForMenu.id);
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
  };

  const insertCategory = async () => {
    if (!name.trim()) {
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    clearAlert();
    setLoadingButton(true);

    try {
      const categoryDepth = currentParentCategory ? currentParentCategory.depth + 1 : 0;
      const categoryParentId = currentParentCategory ? currentParentCategory.id : null;

      const newCategoryId = MOCK_CATEGORIES.length > 0 ? Math.max(...MOCK_CATEGORIES.map(c => c.id)) + 1 : 1;
      const newCategory: CategoryType = {
        id: newCategoryId,
        name: name,
        createAt: new Date().toISOString(),
        recordStatus: 0,
        status: 'Aktif',
        parentId: categoryParentId,
        depth: categoryDepth,
      };

      MOCK_CATEGORIES.push(newCategory);

      showAlert('Yeni kategori başarıyla eklendi!', 'success');
      resetFormAndState();
      filterAndSortCategories(currentParentCategory?.id || null);
    } catch (e: any) {
      console.error("Error inserting category:", e);
      showAlert('Kategori eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editCategory = async () => {
    if (editingId === null) return;
    if (!name.trim()) {
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    clearAlert();

    if (name === originalName) {
      showAlert('İsimde herhangi bir değişiklik yapmadınız.', 'info');
      resetFormAndState();
      return;
    }

    setLoadingButton(true);
    try {
      const index = MOCK_CATEGORIES.findIndex(cat => cat.id === editingId);
      if (index !== -1) {
        MOCK_CATEGORIES[index] = { ...MOCK_CATEGORIES[index], name: name };
      }
      showAlert('Kategori başarıyla güncellendi!', 'success');
      resetFormAndState();
      filterAndSortCategories(currentParentCategory?.id || null);
    } catch (e: any) {
      console.error("Error updating category:", e);
      showAlert('Kategori güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  }

  const sendStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    try {
      const index = MOCK_CATEGORIES.findIndex(cat => cat.id === id);
      if (index !== -1) {
        const newStatusText = statusValue === 0 ? 'Aktif' : statusValue === 1 ? 'Etkin değil' : 'Silindi';
        MOCK_CATEGORIES[index] = { ...MOCK_CATEGORIES[index], recordStatus: statusValue, status: newStatusText };
      }
      const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
      showAlert(`Kategori başarıyla ${statusText} olarak ayarlandı!`, 'success');
      filterAndSortCategories(currentParentCategory?.id || null);
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

  const resetFormAndState = () => {
    setName('');
    setEditingId(null);
    setOriginalName('');
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

  const filterAndSortCategories = (parentId: number | null) => {
    const currentLevelCategories = MOCK_CATEGORIES.filter(cat => cat.parentId === parentId);
    
    const sortedData = [...currentLevelCategories].sort((a, b) => {
      const dateA = new Date(a.createAt);
      const dateB = new Date(b.createAt);
      return dateB.getTime() - dateA.getTime();
    });
    setCategoriesList(sortedData);
    setPage(0);
  };

  function getListCategory(parentId: number | null) {
    filterAndSortCategories(parentId);
  }

  const handleEnterSubcategories = (category: CategoryType) => {
    setCurrentParentCategory(category);
    setBreadcrumbPath(prevPath => [
      ...prevPath,
      { id: category.id, name: category.name, depth: category.depth },
    ]);
    getListCategory(category.id);
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    const itemIndex = breadcrumbPath.indexOf(item);
    if (itemIndex === -1) return;

    const newPath = breadcrumbPath.slice(0, itemIndex + 1);
    setBreadcrumbPath(newPath);
    setCurrentParentCategory(item.id === null ? null : (MOCK_CATEGORIES.find(cat => cat.id === item.id) || null));
    getListCategory(item.id);
  };


  useEffect(() => {
    getListCategory(null);
  }, []);

  // --- هندلر تغییر فیلتر وضعیت ---
  const handleStatusFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'active' | 'inactive' | null,
  ) => {
    if (newFilter !== null) {
      setStatusFilter(newFilter);
      setPage(0); // با تغییر فیلتر، به صفحه اول برگرد
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

  // فیلتر کردن دسته‌بندی‌ها بر اساس جستجو و وضعیت
  const filteredAndStatusCategories = categoriesList.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && category.recordStatus === 0) ||
      (statusFilter === 'inactive' && category.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  const paginatedCategories = filteredAndStatusCategories.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getFormattedBreadcrumbPath = () => {
    if (breadcrumbPath.length <= MAX_BREADCRUMB_ITEMS) {
      return breadcrumbPath;
    }

    const firstItem = breadcrumbPath[0];
    const lastItem = breadcrumbPath[breadcrumbPath.length - 1];
    
    const middlePart = breadcrumbPath.slice(breadcrumbPath.length - (MAX_BREADCRUMB_ITEMS - 2));

    // این یک منطق ساده برای نمایش ... است. می توانید آن را پیچیده تر کنید.
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
          {currentParentCategory && (
            <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
              Alt kategori ekleniyor: "{currentParentCategory.name}" ({currentParentCategory.depth + 1}. Seviye)
            </Typography>
          )}
        </Paper>

        <Grid container spacing={1}>
          <Grid item xs={12} sm={1} display="flex" alignItems="center">
            <CustomFormLabel htmlFor="category-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
              İsim
            </CustomFormLabel>
          </Grid>
          <Grid item xs={12} sm={7}>
            <CustomTextField
              id="category-name"
              placeholder={currentParentCategory ? "Alt Kategori Adı" : "Ana Kategori Adı"}
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={1}></Grid>
          <Grid item xs={12} sm={3}>
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
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
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
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir kategori ekle" : ""}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={insertCategory}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                      </> : (currentParentCategory ? 'Alt Kategori Ekle' : 'Yeni Kategori Ekle')}
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
            {/* --- فیلتر وضعیت --- */}
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Status filter"
                fullWidth
              >
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm kategorileri göster" : ""}>
                  <StyledToggleButton
                    value="all"
                    aria-label="all categories"
                  >
                    Tümü
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif kategorileri göster" : ""}>
                  <StyledToggleButton
                    value="active"
                    aria-label="active categories"
                  >
                    Aktif
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif kategorileri göster" : ""}>
                  <StyledToggleButton
                    value="inactive"
                    aria-label="inactive categories"
                  >
                    Etkin Değil
                  </StyledToggleButton>
                </CustomTooltip>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          <Table aria-label="category table">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="h6">İsim</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Oluşturulma Tarihi</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h6">Durum</Typography>
                </TableCell>
                <TableCell>
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
                          <Typography variant="h6">{formatDate(row.createAt)}</Typography>
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
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleEnterSubcategories(row)}
                            startIcon={<IconPlus size={18} />}
                          >
                            Alt Kategori Ekle
                          </Button>
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
                        {selectedRowForMenu?.recordStatus === 0 ? (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu kategoriyi pasif yap" : ""}>
                            <MenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Etkin değil
                            </MenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu kategoriyi aktif yap" : ""}>
                            <MenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif
                            </MenuItem>
                          </CustomTooltip>
                        )}
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu kategoriyi düzenle" : ""}>
                          <MenuItem onClick={handleEditClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MenuItem>
                        </CustomTooltip>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu kategoriyi sil" : ""}>
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
                      Hiç kategori bulunamadı.
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
          count={filteredAndStatusCategories.length}
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
        onDeleteSuccess={() => getListCategory(currentParentCategory?.id || null)}
        showAlert={showAlert}
      />
    </>
  );
};

export default ListCategory;