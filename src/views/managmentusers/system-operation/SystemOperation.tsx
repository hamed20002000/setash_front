// SystemOperation.tsx
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
  TableSortLabel,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteSystemOperation from './DeleteSystemOperation';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

interface RowType {
  id: number;
  status: string;
  name: string;
  recordStatus?: number;
  createAt: string;
}

const initialRows: RowType[] = [];

const SystemOperation = () => {
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [operationsList, setOperationsList] = useState<RowType[]>(initialRows);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalName, setOriginalName] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<RowType | null>(null);
  const openMenu = Boolean(anchorEl);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [rowIdToDelete, setRowIdToDelete] = useState<number | null>(null);
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
      setRowIdToDelete(selectedRowForMenu.id);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };
  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setRowIdToDelete(null);
    getListOperation();
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
      }, 5000);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [alertMessage]);
  const handleEditClick = () => {
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
  };
  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    setNameError(false);
    setNameHelperText('');
  };
  const insertOperation = async () => {
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Operasyon ismi boş bırakılamaz.');
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    setNameError(false);
    setNameHelperText('');
    clearAlert();
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      return;
    }
    setLoadingButton(true);
    try {
      const response = await axios.post(
        server.baseurl + server.user + "create-system-operation",
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
        showAlert('Yeni işlem başarıyla eklendi!', 'success');
        resetFormAndState();
        getListOperation();
      } else {
        showAlert(response.data.message || 'Yeni işlem eklenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      showAlert(e.response?.data?.message || 'İşlem eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };
  const editOperation = async () => {
    if (editingId === null) return;
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Operasyon ismi boş bırakılamaz.');
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
        server.baseurl + server.user + "update-system-operation",
        { id: Number(editingId), newname: name },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data.httpStatusCode === 200) {
        showAlert('İşlem başarıyla güncellendi!', 'success');
        setOperationsList(prevList =>
          prevList.map(op => (op.id === editingId ? { ...op, name: name } : op))
        );
        resetFormAndState();
        getListOperation();
      } else {
        showAlert(response.data.message || 'İşlem güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      showAlert(e.response?.data?.message || 'İşlem güncellenirken bir hata oluştu, lütfen tekrar deneyین.', 'error');
    } finally {
      setLoadingButton(false);
    }
  }
  const sendStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      navigate("/");
      return;
    }
    try {
      const response = await axios.put(
        server.baseurl + server.user + "update-system-operation",
        { id: Number(id), recordStatus: statusValue },
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
        showAlert(`İşlem başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListOperation();
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
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
    setNameError(false);
    setNameHelperText('');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.log("Error formatting date:", e);
      return "Geçersiz Tarih";
    }
  };


  function getListOperation() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      navigate("/");
      return;
    }
    axios.request({
      baseURL: server.baseurl + server.user + "get-system-operations",
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
        setOperationsList(formattedData as RowType[]);
      } else {
        showAlert(result.data.message || 'Operasyon listesi alınırken bir hata oluştu.', 'error');
      }
    }).catch((e) => {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        showAlert('Operasyon listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    });
  }
  useEffect(() => {
    getListOperation();
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
  const handleRequestSort = (property: keyof RowType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
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
  const getComparator = <Key extends keyof RowType>(
    order: 'asc' | 'desc',
    orderBy: Key,
  ): (a: RowType, b: RowType) => number => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };
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
  const filteredOperations = operationsList.filter(operation => {
    const matchesSearch = operation.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && operation.recordStatus === 0) ||
      (statusFilter === 'inactive' && operation.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });
  const sortedAndFilteredOperations = stableSort(filteredOperations, getComparator(order, orderBy));
  const paginatedOperations = sortedAndFilteredOperations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
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
              placeholder="Operasyon İsmi"
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
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili operasyonu güncelle" : ""}>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={editOperation}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                      </> : 'Düzenlemek'}
                    </Button>
                  </CustomTooltip>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni işlem moduna dön" : ""}>
                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                      İptal Et
                    </Button>
                  </CustomTooltip>
                </>
              ) : (
                <>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir operasyon ekle" : ""}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={insertOperation}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                      </> : 'Yeni Operasyon Ekle'}
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
                label="Operasyon Ara"
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm operasyonları göster" : ""}>
                  <ToggleButton
                    value="all"
                    aria-label="all operations"
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif operasyonları göster" : ""}>
                  <ToggleButton
                    value="active"
                    aria-label="active operations"
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif operasyonları göster" : ""}>
                  <ToggleButton
                    value="inactive"
                    aria-label="inactive operations"
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
                    Pasif
                  </ToggleButton>
                </CustomTooltip>
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
              {paginatedOperations.length > 0 ? (
                paginatedOperations.map((row) => (
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
                        {selectedRowForMenu?.recordStatus === 0 ? (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu operasyonu pasif yap" : ""}>
                            <MenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Pasif Yap
                            </MenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu operasyonu aktif yap" : ""}>
                            <MenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif Yap
                            </MenuItem>
                          </CustomTooltip>
                        )}
                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Bu operasyonu düzenle" : ""}>
                          <MenuItem onClick={handleEditClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MenuItem>
                        </CustomTooltip>
                        <CustomTooltip placement="left"
                          title={isTooltipGloballyEnabled ? "Bu operasyonu sil" : ""}>
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
                      Hiç operasyon bulunamadı.
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
          count={sortedAndFilteredOperations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteSystemOperation
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        rowIdToDelete={rowIdToDelete}
        onDeleteSuccess={getListOperation}
        showAlert={showAlert}
      />
    </>
  );
};

export default SystemOperation;