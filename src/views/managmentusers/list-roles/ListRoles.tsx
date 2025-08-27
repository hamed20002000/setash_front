// SystemRole.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"; // useCallback را اضافه کنید
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton as MuiToggleButton,
  TableSortLabel,
} from '@mui/material';

import { styled } from '@mui/material/styles';
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

interface RowType {
  id: number;
  status: string;
  name: string;
  recordStatus?: number; // 0 = Aktif, 1 = Pasif, 2 = Silindi
  createAt: string;
}

const initialRows: RowType[] = [];


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


// Helper functions for sorting - placed outside the component for reusability
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

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [orderBy, setOrderBy] = useState<keyof RowType>('createAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const editFieldRef = useRef<HTMLInputElement>(null);

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

  const hasChangeOpPermission = useMemo(() => {
    return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
  }, [allowedOperations]);

  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  }, []); // [] به این معنی است که این تابع فقط یک بار در طول عمر کامپوننت ساخته می‌شود.

  // تابع clearAlert هم با useCallback
  const clearAlert = useCallback(() => {
    setAlertMessage(null);
  }, []);
  const getListRole = useCallback(() => {
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
          recordStatus: item.recordStatus !== undefined && item.recordStatus !== null ? item.recordStatus : 0,
          createAt: item.createAt,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
        }));
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
  }, [navigate, showAlert]); // وابسته به navigate و showAlert

  // تابع بستن مودال عملیات با useCallback
  const handleClickCloseOperationModal = useCallback(() => {
    setOpenOperationModal(false);
    setRoleIdForOperations(null); // ریست کردن roleIdForOperations
    getListRole(); // ممکن است نیاز باشد لیست رول‌ها را رفرش کنید (اگر مودال تغییراتی در نقش‌ها ایجاد می‌کند)
  }, [getListRole]); // وابسته به getListRole

  // تابع getListRole هم باید useCallback شود چون در handleClickCloseOperationModal استفاده می‌شود و در useEffect اصلی

  // -----------------------------------------------------
  // سایر توابع هندلر (برخی از قبل useCallback شده بودند، برخی را اضافه کردم)
  // -----------------------------------------------------

  const handleClickMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>, row: RowType) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(row);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  }, []);

  const handleClickOpenDeleteModal = useCallback(() => {
    if (selectedRowForMenu) {
      setRowIdToDelete(selectedRowForMenu.name);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  }, [selectedRowForMenu, handleCloseMenu]);

  const handleClickCloseDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
    setRowIdToDelete(null);
    getListRole(); // مطمئن شوید getListRole در اینجا فراخوانی می‌شود
  }, [getListRole]);


  // useEffect برای بستن خودکار Alert (وابسته به alertMessage و clearAlert)
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
  }, [alertMessage, clearAlert]);


  const resetFormAndState = useCallback(() => {
    setName('');
    setEditingId(null);
    setOriginalName('');
    setNameError(false);
    setNameHelperText('');
  }, []);

  const handleEditClick = useCallback(() => {
    if (selectedRowForMenu) {
      setName(selectedRowForMenu.name);
      setOriginalName(selectedRowForMenu.name);
      setEditingId(selectedRowForMenu.id);
      setTimeout(() => {
        editFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        editFieldRef.current?.focus();
      }, 100);
    }
    handleCloseMenu();
    clearAlert();
    setNameError(false);
    setNameHelperText('');
  }, [selectedRowForMenu, handleCloseMenu, clearAlert]);

  const handleCancelEdit = useCallback(() => {
    resetFormAndState();
    clearAlert();
    setNameError(false);
    setNameHelperText('');
  }, [resetFormAndState, clearAlert]);

  const insertRole = async () => { /* ... کد قبلی ... */
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Rol ismi boş bırakılamaz.');
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    setNameError(false);
    setNameHelperText('');

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

  const editRole = async () => { /* ... کد قبلی ... */
    if (editingId === null) return;
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Rol ismi boş bırakılamaz.');
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    setNameError(false);
    setNameHelperText('');

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

  const sendStatusUpdate = useCallback(async (currentName: string, statusValue: number) => { // اضافه شدن useCallback
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
        const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
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
  }, [clearAlert, showAlert, navigate, getListRole, resetFormAndState, handleCloseMenu]); // اضافه شدن dependencies

  const handleSetActive = useCallback(() => { // اضافه شدن useCallback
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.name, 0);
    }
  }, [selectedRowForMenu, sendStatusUpdate]); // وابسته به selectedRowForMenu و sendStatusUpdate

  const handleSetInactive = useCallback(() => { // اضافه شدن useCallback
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.name, 1);
    }
  }, [selectedRowForMenu, sendStatusUpdate]); // وابسته به selectedRowForMenu و sendStatusUpdate


  const handleClickOpenOperationModal = useCallback(() => {
    if (selectedRowForMenu) {
      setRoleIdForOperations(selectedRowForMenu.id);
      setOpenOperationModal(true);
    }
    handleCloseMenu();
  }, [selectedRowForMenu, handleCloseMenu]);

  // -----------------------------------------------------
  // useEffect اصلی برای واکشی لیست رول‌ها
  // -----------------------------------------------------
  useEffect(() => {
    getListRole();
  }, [getListRole]); // وابسته به getListRole (تضمین می‌کند فقط یک بار در mount اجرا شود)

  // -----------------------------------------------------
  // سایر توابع مربوط به فیلتر و مرتب‌سازی
  // -----------------------------------------------------
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

  const handleRequestSort = useCallback((property: keyof RowType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  }, [order, orderBy]);


  const filteredRoles = useMemo(() => {
    return rolesList.filter(role => {
      const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && role.recordStatus === 0) ||
        (statusFilter === 'inactive' && role.recordStatus === 1);
      return matchesSearch && matchesStatus;
    });
  }, [rolesList, searchTerm, statusFilter]);

  const sortedAndFilteredRoles = useMemo(() => {
    return stableSort(filteredRoles, getComparator(order, orderBy));
  }, [filteredRoles, order, orderBy]);

  const paginatedRoles = useMemo(() => {
    return sortedAndFilteredRoles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedAndFilteredRoles, page, rowsPerPage]);



  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>

        {(hasCreatePermission || hasEditPermission) && (
          <Grid container spacing={1}>
            <Grid item xs={12} sm={1} display="flex" alignItems="center">
              <CustomFormLabel htmlFor="bl-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
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
                  if (nameError && e.target.value.trim()) {
                    setNameError(false);
                    setNameHelperText('');
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
                    {hasCreatePermission && (
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
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Status filter"
                fullWidth
              >
                {/* ✅ تغییر: استفاده از StyledToggleButton به جای ToggleButton معمولی */}
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm rolleri göster" : ""}> */}
                <StyledToggleButton // ✅ اینجا
                  value="all"
                  aria-label="all roles"
                >
                  Tümü
                </StyledToggleButton>
                {/* </CustomTooltip> */}
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif rolleri göster" : ""}> */}
                <StyledToggleButton // ✅ اینجا
                  value="active"
                  aria-label="active roles"
                >
                  Aktif
                </StyledToggleButton>
                {/* </CustomTooltip> */}
                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif rolleri göster" : ""}> */}
                <StyledToggleButton // ✅ اینجا
                  value="inactive"
                  aria-label="inactive roles"
                >
                  Pasif
                </StyledToggleButton>
                {/* </CustomTooltip> */}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          <Table aria-label="simple table">
            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
              <TableRow>
                <TableCell>
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
                          <Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography>
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
                              : row.status === 'Pasif'
                                ? (theme) => theme.palette.error.light
                                : (theme) => theme.palette.success.light,
                          color:
                            row.status === 'Silindi'
                              ? (theme) => theme.palette.primary.main
                              : row.status === 'Pasif'
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
                            title={isTooltipGloballyEnabled ? "Bu rolü pasif yap" : ""}>
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
                            title={isTooltipGloballyEnabled ? "Bu rolü aktif yap" : ""}>
                            <MenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif Yap
                            </MenuItem>
                          </CustomTooltip>
                        )}

                        {hasChangeOpPermission && (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu rolün operasyonlarını seçin" : ""}>
                            <MenuItem onClick={handleClickOpenOperationModal}>
                              <ListItemIcon>
                                <IconPlus width={18} />
                              </ListItemIcon>
                              Operasyon Seçin
                            </MenuItem>
                          </CustomTooltip>
                        )}

                        {hasEditPermission && (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu rolü düzenle" : ""}>
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
                            title={isTooltipGloballyEnabled ? "Bu rolü sil" : ""}>
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
        showAlert={showAlert} // showAlert به درستی به اینجا ارسال می‌شود
      />

      {/* ListSystemOperationModal که باید رفرش نشود */}
      <ListSystemOperationModal
        openOperationModal={openOperationModal}
        onClose={handleClickCloseOperationModal}
        roleId={roleIdForOperations?.toString() || null}
        showAlert={showAlert}
      />
    </>
  );
};

export default SystemRole;