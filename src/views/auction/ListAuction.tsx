// ListAuction.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton as MuiToggleButton,CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../components/shared/BlankCard';
import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteAuction from './DeleteAuction';

// --- Imports for API Call ---
import axios from 'axios';
import server from '../../assets/address.json';
// --- End Imports for API Call ---

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// تعریف نوع برای مزایده (Auction)
interface AuctionType {
  id: number;
  title: string; // نام یا عنوان مزایده
  createAt: string;
  recordStatus?: number; // 0 = Aktif, 1 = Etkin değil, 2 = Silindi
  status: string; // وضعیت متنی
}

// جدید: تعریف رابط برای پاسخ API get-tenders
// interface GetTendersApiResponse {
//   httpStatusCode: number;
//   data: AuctionType[]; 
//   message?: string;
// }

// **StyledToggleButton از SystemRole.tsx کپی شده است**
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


const ListAuction = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState<string>(''); // نام یا عنوان مزایده
  const [auctionsList, setAuctionsList] = useState<AuctionType[]>([]); // تغییر به آرایه خالی برای داده‌های واقعی
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalTitle, setOriginalTitle] = useState<string>('');

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<AuctionType | null>(null);

  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [auctionIdToDelete, setAuctionIdToDelete] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true); // اضافه شده برای نمایش لودینگ کلی

  const { isTooltipGloballyEnabled } = useTooltip();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');


  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: AuctionType) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  };

  const handleClickOpenDeleteModal = () => {
    if (selectedRowForMenu) {
      setAuctionIdToDelete(selectedRowForMenu.id);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setAuctionIdToDelete(null);
    getListAuction(); // رفرش لیست مزایده‌ها بعد از حذف
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
      setTitle(selectedRowForMenu.title);
      setOriginalTitle(selectedRowForMenu.title);
      setEditingId(selectedRowForMenu.id);
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
  };

  // --- تابع ایجاد مزایده جدید (با mock data - باید به API متصل شود) ---
  
 const insertAuction = async () => {
    if (!title.trim()) {
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
        server.baseurl + server.initialoperations + "create-tender",
        { title,details:[] },
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
        getListAuction();
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
  // --- تابع ویرایش مزایده (با mock data - باید به API متصل شود) ---
  const editAuction = async () => {
    if (editingId === null) return;
    if (!title.trim()) {
      showAlert('Başlık boş olamaz!', 'warning');
      return;
    }
    clearAlert();

    if (title === originalTitle) {
      showAlert('Başlıkta herhangi bir değişiklik yapmadınız.', 'info');
      resetFormAndState();
      return;
    }

    setLoadingButton(true);
    try {
      // این بخش باید با فراخوانی API واقعی جایگزین شود
      // مثال:
      // const response = await axios.put(server.baseurl + server.initialoperations + `update-tender/${editingId}`, { title }, {
      //   headers: { "Authorization": `Bearer ${localStorage.getItem('authToken')}` }
      // });
      // if (response.data.httpStatusCode === 200) { ... }

      setAuctionsList(prev => prev.map(a => 
        a.id === editingId ? { ...a, title: title } : a
      ));

      showAlert('ihale başarıyla güncellendi!', 'success');
      resetFormAndState();
      // getListAuction(); // در صورت استفاده از API واقعی، بعد از موفقیت فراخوانی شود
    } catch (e: any) {
      console.error("Error updating auction:", e);
      showAlert(e.response?.data?.message || 'ihale güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  }

  // --- تابع تغییر وضعیت مزایده (فعال/غیرفعال) (با mock data - باید به API متصل شود) ---
  const sendStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    try {
      // این بخش باید با فراخوانی API واقعی جایگزین شود
      // مثال:
      // const response = await axios.put(server.baseurl + server.initialoperations + `update-tender-status/${id}`, { status: statusValue }, {
      //   headers: { "Authorization": `Bearer ${localStorage.getItem('authToken')}` }
      // });
      // if (response.data.httpStatusCode === 200) { ... }

      setAuctionsList(prev => prev.map(a => {
        if (a.id === id) {
          const newStatusText = statusValue === 0 ? 'Aktif' : statusValue === 1 ? 'Etkin değil' : 'Silindi';
          return { ...a, recordStatus: statusValue, status: newStatusText };
        }
        return a;
      }));

      const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
      showAlert(`ihale başarıyla ${statusText} olarak ayarlandı!`, 'success');
      // getListAuction(); // در صورت استفاده از API واقعی، بعد از موفقیت فراخوانی شود
    } catch (e: any) {
      console.error("Error updating status:", e);
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
    setTitle('');
    setEditingId(null);
    setOriginalTitle('');
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

  // --- تابع اصلی دریافت لیست مزایده‌ها از API واقعی ---
 
function getListAuction() {
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      return;
    }

    axios.request({
      baseURL: server.baseurl + server.initialoperations + "get-tenders",
      method: "get",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    }).then((result) => {
      if (result.data.httpStatusCode === 200) {
        const formattedData = result.data.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          recordStatus: item.recordStatus,
          createAt: item.createAt,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Etkin değil' : 'Silindi', // 'Silindi' به جای 'askıda olması'
        }));
        const sortedData = formattedData.sort((a: AuctionType, b: AuctionType) => {
          const dateA = new Date(a.createAt);
          const dateB = new Date(b.createAt);
          return dateB.getTime() - dateA.getTime();
        });
        setAuctionsList(sortedData as AuctionType[]);
        setLoadingData(false)
      } else {
        showAlert(result.data.message || 'Operasyon listesi alınırken bir hata oluştu.', 'error');
        setLoadingData(false)
      }
    }).catch((e) => {
     
       if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        console.error("İhale listesi getirilirken hata oluştu:", e);
        showAlert('İhale listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    });
  }


  useEffect(() => {
    getListAuction(); // در ابتدا، لیست مزایده‌ها را لود کن
  }, []);

  // --- هندلر تغییر فیلتر وضعیت ---
  const handleStatusFilterChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: 'all' | 'active' | 'inactive' | null,
  ) => {
     console.log(event) // حذف شد چون در production به این log نیازی نیست
    if (newFilter !== null) {
      setStatusFilter(newFilter);
      setPage(0); // با تغییر فیلتر، به صفحه اول برگرد
    }
  };

  const handleChangePage = (
    event: unknown,
    newPage: number) => {
     console.log(event) // حذف شد
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

  // فیلتر کردن مزایده‌ها بر اساس جستجو و وضعیت
  const filteredAndStatusAuctions = auctionsList.filter(auction => {
    const matchesSearch = auction.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && auction.recordStatus === 0) ||
      (statusFilter === 'inactive' && auction.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  const paginatedAuctions = filteredAndStatusAuctions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  // --- تابع برای رفتن به صفحه جزئیات مزایده ---
  const handleGoToDetails = (auctionId: number) => {
    navigate(`/auction/auction-details/${auctionId}`);
  };


  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={1} display="flex" alignItems="center">
            <CustomFormLabel htmlFor="auction-title" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
              Başlık
            </CustomFormLabel>
          </Grid>
          <Grid item xs={12} sm={7}>
            <CustomTextField
              id="auction-title"
              placeholder="İhale Başlığı"
              fullWidth
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={1}></Grid>
          <Grid item xs={12} sm={3}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {editingId !== null ? (
                <>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili ihale güncelleyin" : ""}>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={editAuction}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                         <BoltIcon color="inherit" sx={{ mr: 1,fontSize:20 }} /> Beklemek....
                      </> : 'Düzenlemek'}
                    </Button>
                  </CustomTooltip>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni ihale moduna dön" : ""}>
                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                      İptal Et
                    </Button>
                  </CustomTooltip>
                </>
              ) : (
                <>
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir ihale ekle" : ""}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={insertAuction}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                         <BoltIcon color="inherit" sx={{ mr: 1,fontSize:20 }} /> Beklemek....
                      </> : 'Yeni İhale Ekle'}
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
                label="İhale Ara"
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
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm ihaler göster" : ""}>
                  <StyledToggleButton
                    value="all"
                    aria-label="all auctions"
                  >
                    Tümü
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif ihaler göster" : ""}>
                  <StyledToggleButton
                    value="active"
                    aria-label="active auctions"
                  >
                    Aktif
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif ihaler göster" : ""}>
                  <StyledToggleButton
                    value="inactive"
                    aria-label="inactive auctions"
                  >
                    Etkin Değil
                  </StyledToggleButton>
                </CustomTooltip>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        {loadingData ? ( // نمایش لودینگ کلی
          <Stack sx={{ width: '100%', height: '300px', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>Yükleniyor...</Typography>
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="auction table">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography variant="h6">Başlık</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6">Oluşturulma Tarihi</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6">Durum</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6">Detaylar</Typography>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAuctions.length > 0 ? (
                  paginatedAuctions.map((row) => (
                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box>
                            <Typography variant="h6">{row.title}</Typography>
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
                      {/* ستون "ثبت جزئیات" */}
                      <TableCell>
                        <CustomTooltip title={isTooltipGloballyEnabled ? `"${row.title}" detaylarını kaydet/gör` : ""}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleGoToDetails(row.id)}
                            startIcon={<IconPlus size={18} />}
                          >
                            Detaylar
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
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ihale pasif yap" : ""}>
                              <MenuItem onClick={handleSetInactive}>
                                <ListItemIcon>
                                  <DoNotDisturbOnRoundedIcon width={18} />
                                </ListItemIcon>
                                Etkin değil
                              </MenuItem>
                            </CustomTooltip>
                          ) : (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ihale aktif yap" : ""}>
                              <MenuItem onClick={handleSetActive}>
                                <ListItemIcon>
                                  <DoneRoundedIcon width={18} />
                                </ListItemIcon>
                                Aktif
                              </MenuItem>
                            </CustomTooltip>
                          )}
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ihale düzenle" : ""}>
                            <MenuItem onClick={handleEditClick}>
                              <ListItemIcon>
                                <IconEdit width={18} />
                              </ListItemIcon>
                              Düzenlemek
                            </MenuItem>
                          </CustomTooltip>
                          <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ihale sil" : ""}>
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
                        Hiç ihale bulunamadı.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredAndStatusAuctions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteAuction
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        auctionIdToDelete={auctionIdToDelete}
        onDeleteSuccess={getListAuction}
        showAlert={showAlert}
      />
    </>
  );
};

export default ListAuction;