// ListUnit.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  CircularProgress,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch }
  from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteUnit from './DeleteUnit';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

interface UnitType {
  id: number;
  name: string;
  createAt: string;
  recordStatus?: number; // 0 = Aktif, 1 = Etkin değil, 2 = Silindi
  status: string; // وضعیت متنی
}

const MOCK_UNITS: UnitType[] = [
  { id: 1, name: 'Adet', createAt: '2024-01-01T10:00:00.000Z', recordStatus: 0, status: 'Aktif' },
  { id: 2, name: 'Kilogram', createAt: '2024-01-05T11:30:00.000Z', recordStatus: 0, status: 'Aktif' },
  { id: 3, name: 'Litre', createAt: '2024-01-10T14:00:00.000Z', recordStatus: 1, status: 'Etkin değil' },
  { id: 4, name: 'Metre', createAt: '2024-01-12T09:00:00.000Z', recordStatus: 0, status: 'Aktif' },
  { id: 5, name: 'Kutu', createAt: '2024-01-18T16:00:00.000Z', recordStatus: 0, status: 'Aktif' },
];

const ListUnit = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [unitsList, setUnitsList] = useState<UnitType[]>(MOCK_UNITS);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalName, setOriginalName] = useState<string>('');

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<UnitType | null>(null);

  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [unitIdToDelete, setUnitIdToDelete] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);

  const { isTooltipGloballyEnabled } = useTooltip();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');


  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: UnitType) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  };

  const handleClickOpenDeleteModal = () => {
    if (selectedRowForMenu) {
      setUnitIdToDelete(selectedRowForMenu.id);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setUnitIdToDelete(null);
    getListUnit();
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

  const insertUnit = async () => {
    if (!name.trim()) {
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    clearAlert();
    setLoadingButton(true);

    try {
      const newUnitId = MOCK_UNITS.length > 0 ? Math.max(...MOCK_UNITS.map(u => u.id)) + 1 : 1;
      const newUnit: UnitType = {
        id: newUnitId,
        name: name,
        createAt: new Date().toISOString(),
        recordStatus: 0,
        status: 'Aktif',
      };

      MOCK_UNITS.push(newUnit);

      showAlert('Yeni birim başarıyla eklendi!', 'success');
      resetFormAndState();
      getListUnit();
    } catch (e: any) {
      console.error("Error inserting unit:", e);
      showAlert('Birim eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editUnit = async () => {
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
      const index = MOCK_UNITS.findIndex(u => u.id === editingId);
      if (index !== -1) {
        MOCK_UNITS[index] = { ...MOCK_UNITS[index], name: name };
      }
      showAlert('Birim başarıyla güncellendi!', 'success');
      resetFormAndState();
      getListUnit();
    } catch (e: any) {
      console.error("Error updating unit:", e);
      showAlert('Birim güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  }

  const sendStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    try {
      const index = MOCK_UNITS.findIndex(u => u.id === id);
      if (index !== -1) {
        const newStatusText = statusValue === 0 ? 'Aktif' : statusValue === 1 ? 'Etkin değil' : 'Silindi';
        MOCK_UNITS[index] = { ...MOCK_UNITS[index], recordStatus: statusValue, status: newStatusText };
      }
      const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
      showAlert(`Birim başarıyla ${statusText} olarak ayarlandı!`, 'success');
      getListUnit();
    } catch (e: any) {
      console.error("Error updating status:", e);
      showAlert('Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      handleCloseMenu();
    }
  };

  const handleSetActive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.id, 0); // 0 برای Aktif
    }
  };

  const handleSetInactive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.id, 1); // 1 برای Etkin değil
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

  function getListUnit() {
    const sortedData = [...MOCK_UNITS].sort((a, b) => {
      const dateA = new Date(a.createAt);
      const dateB = new Date(b.createAt);
      return dateB.getTime() - dateA.getTime();
    });
    setUnitsList(sortedData);
    setPage(0);
    setSearchTerm('');
  }


  useEffect(() => {
    getListUnit();
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

  const filteredAndStatusUnits = unitsList.filter(unit => {
    const matchesSearch = unit.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && unit.recordStatus === 0) ||
      (statusFilter === 'inactive' && unit.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  const paginatedUnits = filteredAndStatusUnits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={1} display="flex" alignItems="center">
            <CustomFormLabel htmlFor="unit-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
              İsim
            </CustomFormLabel>
          </Grid>
          <Grid item xs={12} sm={7}>
            <CustomTextField
              id="unit-name"
              placeholder="Birim Adı"
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
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili birimi güncelleyin" : ""}>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={editUnit}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                      </> : 'Düzenlemek'}
                    </Button>
                  </CustomTooltip>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni birim moduna dön" : ""}>
                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                      İptal Et
                    </Button>
                  </CustomTooltip>
                </>
              ) : (
                <>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir birim ekle" : ""}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={insertUnit}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Beklemek....
                      </> : 'Yeni Birim Ekle'}
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
                label="Birim Ara"
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
                aria-label="Status filter" // aria-label را بهبود دادم
                fullWidth
              >
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm birimleri göster" : ""}>
                  <ToggleButton
                    value="all"
                    aria-label="all units"
                    sx={{
                      '&.Mui-selected': { // استایل برای حالت انتخاب شده
                        backgroundColor: (theme) => theme.palette.primary.main + ' !important', // رنگ آبی برای All
                        color: 'white !important',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.primary.dark + ' !important',
                        },
                      },
                      '&:not(.Mui-selected)': { // استایل برای حالت انتخاب نشده
                        color: (theme) => theme.palette.text.primary,
                        borderColor: (theme) => theme.palette.divider,
                      },
                    }}
                  >
                    Tümü
                  </ToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif birimleri göster" : ""}>
                  <ToggleButton
                    value="active"
                    aria-label="active units"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.success.main + ' !important', // رنگ سبز برای Aktif
                        color: 'white !important',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.success.dark + ' !important',
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif birimleri göster" : ""}>
                  <ToggleButton
                    value="inactive"
                    aria-label="inactive units"
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: (theme) => theme.palette.error.main + ' !important', // رنگ قرمز برای Etkin Değil
                        color: 'white !important',
                        '&:hover': {
                          backgroundColor: (theme) => theme.palette.error.dark + ' !important',
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
          <Table aria-label="unit table">
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
              {paginatedUnits.length > 0 ? (
                paginatedUnits.map((row) => (
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
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu birimi pasif yap" : ""}>
                            <MenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Etkin değil
                            </MenuItem>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu birimi aktif yap" : ""}>
                            <MenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif
                            </MenuItem>
                          </CustomTooltip>
                        )}
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu birimi düzenle" : ""}>
                          <MenuItem onClick={handleEditClick}>
                            <ListItemIcon>
                              <IconEdit width={18} />
                            </ListItemIcon>
                            Düzenlemek
                          </MenuItem>
                        </CustomTooltip>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Bu birimi sil" : ""}>
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
                      Hiç birim bulunamadı.
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
          count={filteredAndStatusUnits.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteUnit
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        unitIdToDelete={unitIdToDelete}
        onDeleteSuccess={getListUnit}
        showAlert={showAlert}
      />
    </>
  );
};

export default ListUnit;