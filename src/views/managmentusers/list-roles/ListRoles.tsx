// SystemRole.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from "react"; // useRef را اضافه کنید
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  TableSortLabel, // برای آیکون‌های مرتب‌سازی
} from '@mui/material';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteListRole from './DeleteListRole';
import ListSystemOperationModal from './ListSystemOperationModal';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';


interface RowType {
  id: number;
  status: string;
  name: string;
  recordStatus?: number; // 0 = Aktif, 1 = Etkin değil, 2 = Silindi
  createAt: string;
}

const initialRows: RowType[] = [];

// Helper functions for sorting - placed outside the component for reusability
// توابع کمکی برای مرتب‌سازی - خارج از کامپوننت برای قابلیت استفاده مجدد
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
  // Fallback for other types or mixed types
  if (String(valB) < String(valA)) {
    return -1;
  }
  if (String(valB) > String(valA)) {
    return 1;
  }
  return 0;
};

const getComparator = <Key extends keyof RowType>(
  order: 'asc' | 'desc',
  orderBy: Key,
): (a: RowType, b: RowType) => number => {
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


const SystemRole = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [rolesList, setRolesList] = useState<RowType[]>(initialRows);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalName, setOriginalName] = useState<string>('');

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<RowType | null>(null);

  const [roleIdForOperations, setRoleIdForOperations] = useState<number | null>(null);

  const openMenu = Boolean(anchorEl);
  const [openOperationModal, setOpenOperationModal] = useState(false);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [rowIdToDelete, setRowIdToDelete] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);

  const { isTooltipGloballyEnabled } = useTooltip();

  // State برای فیلتر وضعیت
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // State برای مرتب‌سازی
  const [orderBy, setOrderBy] = useState<keyof RowType>('createAt'); // ستون پیش‌فرض برای مرتب‌سازی
  const [order, setOrder] = useState<'asc' | 'desc'>('desc'); // جهت پیش‌فرض مرتب‌سازی

  // ✅ اضافه شد: Ref برای کادر ویرایش
  const editFieldRef = useRef<HTMLInputElement>(null);

  // **State جدید برای مدیریت خطای ورودی**
  const [nameError, setNameError] = useState<boolean>(false);
  const [nameHelperText, setNameHelperText] = useState<string>('');

  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RowType) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  };

  const handleClickOpenDeleteModal = () => {
    if (selectedRowForMenu) {
      setRowIdToDelete(selectedRowForMenu.name);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setRowIdToDelete(null);
    getListRole();
  };

  const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
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

  const handleEditClick = () => {
    if (selectedRowForMenu) {
      setName(selectedRowForMenu.name);
      setOriginalName(selectedRowForMenu.name);
      setEditingId(selectedRowForMenu.id);
      // ✅ اضافه شد: اسکرول به کادر ویرایش
      // از setTimeout استفاده می‌کنیم تا مطمئن شویم DOM قبل از اسکرول به‌روز شده است
      setTimeout(() => {
        editFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        editFieldRef.current?.focus(); // فوکوس روی فیلد
      }, 100);
    }
    handleCloseMenu();
    clearAlert();
    setNameError(false); // پاک کردن خطای ورودی هنگام ویرایش
    setNameHelperText(''); // پاک کردن پیام کمکی هنگام ویرایش
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    setNameError(false); // پاک کردن خطای ورودی
    setNameHelperText(''); // پاک کردن پیام کمکی
  };

  const insertRole = async () => {
    if (!name.trim()) {
      setNameError(true); // تنظیم وضعیت خطا به true
      setNameHelperText('Rol ismi boş bırakılamaz.'); // تنظیم پیام کمکی
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    setNameError(false); // در صورت معتبر بودن، خطا را پاک کنید
    setNameHelperText(''); // در صورت معتبر بودن، پیام کمکی را پاک کنید

    clearAlert();
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      return;
    }

    setLoadingButton(true);
    try {
      const response = await axios.post(
        server.baseurl + server.user + "create-role",
        { name },
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );
      if (response.data.httpStatusCode === 201) {
        showAlert('Yeni rol başarıyla eklendi!', 'success');
        resetFormAndState();
        getListRole();
      } else {
        showAlert(response.data.message || 'Yeni rol eklenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error inserting Role:", e);
      showAlert(e.response?.data?.message || 'Rol eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editRole = async () => {
    if (editingId === null) return;
    if (!name.trim()) {
      setNameError(true); // تنظیم وضعیت خطا به true
      setNameHelperText('Rol ismi boş bırakılamaz.'); // تنظیم پیام کمکی
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    setNameError(false); // در صورت معتبر بودن، خطا را پاک کنید
    setNameHelperText(''); // در صورت معتبر بودن، پیام کمکی را پاک کنید
    
    clearAlert();

    if (name === originalName) {
      showAlert('İsimde herhangi bir değişiklik yapmadınız.', 'info');
      resetFormAndState();
      return;
    }

    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      navigate("/");
      return;
    }

    setLoadingButton(true);
    try {
      const response = await axios.put(
        server.baseurl + server.user + "update-role",
        { name: originalName, newname: name },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data.httpStatusCode === 200) {
        showAlert('Rol başarıyla güncellendi!', 'success');
        setRolesList(prevList =>
          prevList.map(op => (op.id === editingId ? { ...op, name: name } : op))
        );
        resetFormAndState();
        getListRole();
      } else {
        showAlert(response.data.message || 'Rol güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error updating Role:", e);
      showAlert(e.response?.data?.message || 'Rol güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  }

  const sendStatusUpdate = async (currentName: string, statusValue: number) => {
    clearAlert();

    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      navigate("/");
      return;
    }
    try {
      const response = await axios.put(
        server.baseurl + server.user + "update-role",
        { name: currentName, recordStatus: statusValue },
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
        showAlert(`Rol başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListRole();
        resetFormAndState();
      } else {
        showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error updating status:", e);
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      handleCloseMenu();
    }
  };

  const handleSetActive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.name, 0);
    }
  };

  const handleSetInactive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.name, 1);
    }
  };

  const resetFormAndState = () => {
    setName('');
    setEditingId(null);
    setOriginalName('');
    setNameError(false); // پاک کردن خطای ورودی
    setNameHelperText(''); // پاک کردن پیام کمکی
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

  const handleClickOpenOperationModal = () => {
    if (selectedRowForMenu) {
      setRoleIdForOperations(selectedRowForMenu.id);
      setOpenOperationModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseOperationModal = () => {
    setOpenOperationModal(false);
    setRoleIdForOperations(null);
  };


  function getListRole() {
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      return;
    }

    axios.request({
      baseURL: server.baseurl + server.user + "get-roles",
      method: "get",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    }).then((result) => {
      if (result.data.httpStatusCode === 200) {
        const formattedData = result.data.data.map((item: any) => ({
          id: item.id,
          name: item.name,
          // اطمینان از اینکه recordStatus همیشه یک عدد است.
          recordStatus: item.recordStatus !== undefined && item.recordStatus !== null ? item.recordStatus : 0,
          createAt: item.createAt,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Etkin değil' : 'Silindi',
        }));
        // مرتب‌سازی اولیه از اینجا حذف شد، زیرا مرتب‌سازی نهایی پایین‌تر انجام می‌شود.
        setRolesList(formattedData as RowType[]);
      } else {
        showAlert(result.data.message || 'Rol listesi alınırken bir hata oluştu.', 'error');
      }
    }).catch((e) => {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error fetching Roles list:", e);
        showAlert('Rol listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    });
  }

  useEffect(() => {
    getListRole();
  }, []);

  // هندلر تغییر فیلتر وضعیت
  const handleStatusFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'active' | 'inactive' | null,
  ) => {
    if (newFilter !== null) {
      console.log(event)
      setStatusFilter(newFilter);
      setPage(0); // با تغییر فیلتر، به صفحه اول برگرد
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

  // هندلر برای تغییر مرتب‌سازی
  const handleRequestSort = (property: keyof RowType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // هنگام تغییر مرتب‌سازی، به صفحه اول برگرد
  };


  // فیلتر کردن رول‌ها بر اساس جستجو و وضعیت
  const filteredRoles = rolesList.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && role.recordStatus === 0) ||
      (statusFilter === 'inactive' && role.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  // اعمال مرتب‌سازی بر روی داده‌های فیلتر شده
  const sortedAndFilteredRoles = stableSort(filteredRoles, getComparator(order, orderBy));

  const paginatedRoles = sortedAndFilteredRoles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={1} display="flex" alignItems="center">
            <CustomFormLabel htmlFor="bl-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
              İsim
            </CustomFormLabel>
          </Grid>
          <Grid item xs={12} sm={7}>
            <CustomTextField
              id="name"
              placeholder="Rol İsim"
              fullWidth
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setName(e.target.value);
                if (nameError && e.target.value.trim()) { // اگر قبلاً خطا وجود داشته و کاربر شروع به تایپ کرده است
                  setNameError(false); // خطا را پاک کنید
                  setNameHelperText(''); // پیام کمکی را پاک کنید
                }
              }}
              inputRef={editFieldRef}
              error={nameError} 
              helperText={nameHelperText} 
            />
          </Grid>
          <Grid item xs={12} sm={1}></Grid>
          <Grid item xs={12} sm={3}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {editingId !== null ? (
                <>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili rolü güncelleyin" : ""}>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={editRole}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                      </> : 'Düzenlemek'}
                    </Button>
                  </CustomTooltip>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni rol moduna dön" : ""}>
                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                      İptal Et
                    </Button>
                  </CustomTooltip>
                </>
              ) : (
                <>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir rol ekle" : ""}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={insertRole}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                      </> : 'Yeni Rol Ekle'}
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
                label="Rol Ara"
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
            {/* فیلتر وضعیت */}
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Status filter"
                fullWidth
              >
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm rolleri göster" : ""}>
                  <ToggleButton
                    value="all"
                    aria-label="all roles"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.primary.main,
                        color: 'white',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.primary.dark,
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif rolleri göster" : ""}>
                  <ToggleButton
                    value="active"
                    aria-label="active roles"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.success.main,
                        color: 'white',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.success.dark,
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif rolleri göster" : ""}>
                  <ToggleButton
                    value="inactive"
                    aria-label="inactive roles"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.error.main,
                        color: 'white',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.error.dark,
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
          <Table aria-label="simple table">
            <TableHead style={{ background: "#f1f1f1" }}>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                      style={{color: "#171c23"}}
                  >
                    <Typography variant="h6">İsim</Typography>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
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
              {paginatedRoles.length > 0 ? (
                paginatedRoles.map((row) => (
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
                            row.status === 'Silindi'
                              ? (theme) => theme.palette.primary.light
                              : row.status === 'Etkin değil'
                                ? (theme) => theme.palette.error.light
                                : (theme) => theme.palette.success.light,
                          color:
                            row.status === 'Silindi'
                              ? (theme) => theme.palette.primary.main
                              : row.status === 'Etkin değil'
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
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu rolü pasif yap" : ""}>
                            <MenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Etkin değil
                            </MenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu rolü aktif yap" : ""}>
                            <MenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif
                            </MenuItem>
                          </CustomTooltip>
                        )}

                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Bu rolün operasyonlarını seçin" : ""}>
                          <MenuItem onClick={handleClickOpenOperationModal}>
                            <ListItemIcon>
                              <IconPlus width={18} />
                            </ListItemIcon>
                            Operasyon Seçin
                          </MenuItem>
                        </CustomTooltip>
                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Bu rolü düzenle" : ""}>
                          <MenuItem onClick={handleEditClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MenuItem>
                        </CustomTooltip>
                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Bu rolü sil" : ""}>
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
                  <TableCell colSpan={4} align="center">
                    <Typography variant="subtitle1" color="textSecondary">
                      Hiç rol bulunamadı.
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
          count={sortedAndFilteredRoles.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteListRole
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        rowIdToDelete={rowIdToDelete}
        onDeleteSuccess={getListRole}
        showAlert={showAlert}
      />

      <ListSystemOperationModal
        openOperationModal={openOperationModal}
        onClose={handleClickCloseOperationModal}
        roleId={roleIdForOperations}
        showAlert={showAlert}
      />
    </>
  );
};

export default SystemRole;