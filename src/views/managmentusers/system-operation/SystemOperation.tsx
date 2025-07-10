// SystemOperation.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  CircularProgress,
  ToggleButtonGroup, ToggleButton as MuiToggleButton,
  ToggleButton, // اضافه شد: برای فیلتر وضعیت
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles'; // **برای StyledToggleButton**

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
  recordStatus?: number; // 0 = Aktif, 1 = Etkin değil, 2 = Silindi
  createAt: string;
}

const initialRows: RowType[] = [];

// **ToggleButton سفارشی با استایل‌های شرطی (کپی از ListUnit.tsx)**
const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
  '&.Mui-selected': {
    color: 'white',
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
    color: theme.palette.text.primary,
    borderColor: theme.palette.divider,
    '&:hover': {
        backgroundColor: theme.palette.action.hover,
    },
  },
}));


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

  // --- State جدید برای فیلتر وضعیت ---
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all'); // 'all', 'active', 'inactive'


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

  const insertOperation = async () => {
    if (!name.trim()) {
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
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
      console.error("Error inserting operation:", e);
      showAlert(e.response?.data?.message || 'İşlem eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editOperation = async () => {
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
      console.error("Error updating operation:", e);
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
        const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
        showAlert(`İşlem başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListOperation();
        resetFormAndState();
      } else {
        showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Error updating status:", e);
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


  function getListOperation() {
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
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
          recordStatus: item.recordStatus,
          createAt: item.createAt,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Etkin değil' : 'Silindi', // 'Silindi' به جای 'askıda olması'
        }));
        const sortedData = formattedData.sort((a: RowType, b: RowType) => {
          const dateA = new Date(a.createAt);
          const dateB = new Date(b.createAt);
          return dateB.getTime() - dateA.getTime();
        });
        setOperationsList(sortedData as RowType[]);
      } else {
        showAlert(result.data.message || 'Operasyon listesi alınırken bir hata oluştu.', 'error');
      }
    }).catch((e) => {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("Error fetching operations list:", e);
        showAlert('Operasyon listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    });
  }

  useEffect(() => {
    getListOperation();
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

  // فیلتر کردن عملیات‌ها بر اساس جستجو و وضعیت
  const filteredAndStatusOperations = operationsList.filter(operation => {
    const matchesSearch = operation.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || // اگر فیلتر 'all' بود، همه را نشان بده
      (statusFilter === 'active' && operation.recordStatus === 0) || // اگر 'active' بود، فقط recordStatus 0 را نشان بده
      (statusFilter === 'inactive' && operation.recordStatus === 1); // اگر 'inactive' بود، فقط recordStatus 1 را نشان بده
    return matchesSearch && matchesStatus; // هر دو شرط باید برقرار باشند
  });

  const paginatedOperations = filteredAndStatusOperations.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


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
              placeholder="İsim İşlemi"
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
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili operasyonu güncelle" : ""}>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={editOperation}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
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
                        <BoltIcon size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                      </> : 'Yeni İşlem Ekle'}
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
          <Grid container spacing={2} alignItems="center"> {/* **Grid container برای جستجو و فیلتر** */}
            <Grid item xs={12} sm={6} md={8}> {/* **فضای بیشتر برای TextField جستجو** */}
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
            {/* --- فیلتر وضعیت --- */}
            <Grid item xs={12} sm={6} md={4}> {/* **فضای برای ToggleButtonGroup** */}
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
                    sx={{ // **استایل دهی برای نمایش رنگ آبی در حالت انتخاب شده**
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
                    sx={{ // **استایل دهی برای نمایش رنگ سبز در حالت انتخاب شده**
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
                    sx={{ // **استایل دهی برای نمایش رنگ قرمز در حالت انتخاب شده**
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
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu operasyonu pasif yap" : ""}>
                            <MenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Etkin değil
                            </MenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu operasyonu aktif yap" : ""}>
                            <MenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif
                            </MenuItem>
                          </CustomTooltip>
                        )}
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu operasyonu düzenle" : ""}>
                          <MenuItem onClick={handleEditClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MenuItem>
                        </CustomTooltip>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu operasyonu sil" : ""}>
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
          count={filteredAndStatusOperations.length}
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