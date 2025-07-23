// ListTender.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from "react"; // Added useRef here
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton as MuiToggleButton, CircularProgress,
  TableSortLabel // ✅ Added: For sorting icons and functionality
} from '@mui/material';
import { styled } from '@mui/material/styles';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../components/shared/BlankCard';
import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteTender from './DeleteTender';

// --- Imports for API Call ---
import axios from 'axios';
import server from '../../assets/address.json';
// --- End Imports for API Call ---

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// تعریف نوع برای مزایده (Tender)
interface TenderType {
  id: number;
  title: string; // نام یا عنوان مزایده
  createAt: string;
  recordStatus?: number; // 0 = Aktif, 1 = Etkin değil, 2 = Silindi
  status: string; // وضعیت متنی
}

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

// --- Helper functions for sorting (reused from previous components) ---
type SortableTenderKeys = keyof TenderType; // In this case, all direct properties are sortable

const descendingComparator = <T, Key extends keyof T>(
  a: T,
  b: T,
  orderBy: Key,
): number => {
  const valA = a[orderBy];
  const valB = b[orderBy];

  if (valB === undefined || valB === null) {
    return (valA === undefined || valA === null) ? 0 : -1;
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

const getComparator = (
  order: 'asc' | 'desc',
  orderBy: SortableTenderKeys,
): (a: TenderType, b: TenderType) => number => {
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
// --- End of Helper functions for sorting ---


const ListTender = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState<string>(''); // نام یا عنوان مزایده
  const [tendersList, setTendersList] = useState<TenderType[]>([]); // تغییر به آرایه خالی برای داده‌های واقعی
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalTitle, setOriginalTitle] = useState<string>('');

  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState<TenderType | null>(null);

  const openMenu = Boolean(anchorEl);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [tenderIdToDelete, setTenderIdToDelete] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');

  const [loadingButton, setLoadingButton] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true); // اضافه شده برای نمایش لودینگ کلی

  const { isTooltipGloballyEnabled } = useTooltip();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // ✅ Added: State for sorting
  const [orderBy, setOrderBy] = useState<SortableTenderKeys>('createAt'); // Default sort column
  const [order, setOrder] = useState<'asc' | 'desc'>('desc'); // Default sort direction

  // ✅ Added: Ref for the tender title input field
  const tenderTitleInputRef = useRef<HTMLInputElement>(null);

  // **New states for input validation error**
  const [titleError, setTitleError] = useState<boolean>(false);
  const [titleHelperText, setTitleHelperText] = useState<string>('');


  const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: TenderType) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  };

  const handleClickOpenDeleteModal = () => {
    if (selectedRowForMenu) {
      setTenderIdToDelete(selectedRowForMenu.id);
      setOpenDeleteModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseDeleteModal = () => {
    setOpenDeleteModal(false);
    setTenderIdToDelete(null);
    getListTender(); // رفرش لیست مزایده‌ها بعد از حذف
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

  const handleEditClick = () => {
    if (selectedRowForMenu) {
      setTitle(selectedRowForMenu.title);
      setOriginalTitle(selectedRowForMenu.title);
      setEditingId(selectedRowForMenu.id);

      // **Clear input validation errors when editing**
      setTitleError(false);
      setTitleHelperText('');

      // ✅ Added: Scroll to the tender title input and focus
      setTimeout(() => {
        tenderTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tenderTitleInputRef.current?.focus();
      }, 100); // Small delay to ensure DOM update
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    // **Clear input validation errors**
    setTitleError(false);
    setTitleHelperText('');
  };

  // --- تابع ایجاد مزایده جدید ---
  const insertTender = async () => {
    if (!title.trim()) {
      setTitleError(true); // Set error state to true
      setTitleHelperText('Başlık boş olamaz!'); // Set helper text
      showAlert('İsim boş olamaz!', 'warning');
      return;
    }
    setTitleError(false); // Clear error if valid
    setTitleHelperText(''); // Clear helper text if valid

    clearAlert();
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      return;
    }
debugger
    setLoadingButton(true);
    try {
      const response = await axios.post(
        server.baseurl + server.initialoperations + "create-tender",
        { title, tenderCategories: [] },
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );
      if (response.data.httpStatusCode === 201) {
        showAlert('Yeni ihale başarıyla eklendi!', 'success');
        resetFormAndState();
        getListTender();
      } else {
        showAlert(response.data.message || 'Yeni ihale eklenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error inserting tender:", e);
      showAlert(e.response?.data?.message || 'İhale eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  // --- تابع ویرایش مزایده ---
  const editTender = async () => {
    if (editingId === null) return;
    if (!title.trim()) {
      setTitleError(true); // Set error state to true
      setTitleHelperText('Başlık boş olamaz!'); // Set helper text
      showAlert('Başlık boş olamaz!', 'warning');
      return;
    }
    setTitleError(false); // Clear error if valid
    setTitleHelperText(''); // Clear helper text if valid

    clearAlert();

    if (title === originalTitle) {
      showAlert('Başlıkta herhangi bir değişiklik yapmadınız.', 'info');
      resetFormAndState();
      return;
    }

    setLoadingButton(true);
    try {
      // Replace with actual API call
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showAlert('Lütfen giriş yapın.', 'warning');
        navigate("/");
        return;
      }
      debugger
      const response = await axios.put(
        server.baseurl + server.initialoperations + "update-tender",
        { id: Number(editingId), title: title}, {
        headers: {
          "Accept": "application/json",
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.data.httpStatusCode === 200) {
        showAlert('İhale başarıyla güncellendi!', 'success');
        resetFormAndState();
        getListTender(); // Refresh list after actual API success
      } else {
        showAlert(response.data.message || 'İhale güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error updating tender:", e);
      showAlert(e.response?.data?.message || 'İhale güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  }

  // --- تابع تغییر وضعیت مزایده (فعال/غیرفعال) ---
  const sendStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showAlert('Lütfen giriş yapın.', 'warning');
        navigate("/");
        return;
      }

      const response = await axios.put(server.baseurl + server.initialoperations + "update-tender",
        { id: Number(id), recordStatus: statusValue }, {
        headers: {
          "Accept": "application/json",
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.data.httpStatusCode === 200) {
        const statusText = statusValue === 0 ? 'Aktif' : 'Etkin değil';
        showAlert(`İhale başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListTender(); // Refresh list after actual API success
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
      sendStatusUpdate(selectedRowForMenu.id, 0); // 0 for Aktif
    }
  };

  const handleSetInactive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.id, 1); // 1 for Etkin değil
    }
  };

  const resetFormAndState = () => {
    setTitle('');
    setEditingId(null);
    setOriginalTitle('');
    // **Clear input validation errors**
    setTitleError(false);
    setTitleHelperText('');
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
  function getListTender() {
    setLoadingData(true); // Start loading
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      setLoadingData(false); // Stop loading if no token
      return;
    }
debugger
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
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Etkin değil' : 'Silindi',
        }));
        // Removed initial sorting here, as it will be handled by the new sorting logic
        setTendersList(formattedData as TenderType[]);
        setLoadingData(false)
      } else {
        showAlert(result.data.message || 'İhale listesi alınırken bir hata oluştu.', 'error');
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
      setLoadingData(false); // Stop loading on error
    });
  }


  useEffect(() => {
    getListTender(); // در ابتدا، لیست مزایده‌ها را لود کن
  }, []);

  // --- هندلر تغییر فیلتر وضعیت ---
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

  // ✅ Added: Handler for changing sort order
  const handleRequestSort = (property: SortableTenderKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sort changes
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

  // Filter tenders based on search and status
  const filteredTenders = tendersList.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && tender.recordStatus === 0) ||
      (statusFilter === 'inactive' && tender.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  // ✅ Apply sorting to filtered data
  const sortedAndFilteredTenders = stableSort(filteredTenders, getComparator(order, orderBy));

  const paginatedTenders = sortedAndFilteredTenders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  // --- تابع برای رفتن به صفحه جزئیات مزایده ---
// const handleGoToDetails = (tenderId: number, tenderTitle: string) => {
//   navigate(`/tender/tender-details/${tenderId}?title=${encodeURIComponent(tenderTitle)}`);
// };

const handleGoToDetails = (tenderId: number = 15, tenderTitle: string = 'test') => {
  navigate(`/tender/tender-details/${tenderId}?title=${encodeURIComponent(tenderTitle)}`);
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
            <CustomFormLabel htmlFor="tender-title" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
              Başlık
            </CustomFormLabel>
          </Grid>
          <Grid item xs={12} sm={7}>
            <CustomTextField
              id="tender-title"
              placeholder="İhale Başlığı"
              fullWidth
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setTitle(e.target.value);
                if (titleError && e.target.value.trim()) { // If there was a previous error and user starts typing
                  setTitleError(false); // Clear the error
                  setTitleHelperText(''); // Clear the helper text
                }
              }}
              inputRef={tenderTitleInputRef}
              error={titleError} 
              helperText={titleHelperText} 
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
                      onClick={editTender}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
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
                      onClick={insertTender}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
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
            {/* Status Filter */}
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
                    aria-label="all tenders"
                  >
                    Tümü
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif ihaler göster" : ""}>
                  <StyledToggleButton
                    value="active"
                    aria-label="active tenders"
                  >
                    Aktif
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif ihaler göster" : ""}>
                  <StyledToggleButton
                    value="inactive"
                    aria-label="inactive tenders"
                  >
                    Pasif
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
            <Table aria-label="tender table">
              <TableHead style={{ background: "#f1f1f1" }}>
                <TableRow>
                  <TableCell>
                    {/* Sortable Column: Başlık (Title) */}
                    <TableSortLabel
                      active={orderBy === 'title'}
                      direction={orderBy === 'title' ? order : 'asc'}
                      onClick={() => handleRequestSort('title')}
                      style={{color: "#171c23"}}
                    >
                      <Typography variant="h6">Başlık</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    {/* Sortable Column: Oluşturulma Tarihi (Creation Date) */}
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
                    {/* Sortable Column: Durum (Status) */}
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                      style={{color: "#171c23"}}
                    >
                      <Typography variant="h6">Durum</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell 
                      style={{color: "#171c23"}}>
                    <Typography variant="h6">Detaylar</Typography>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTenders.length > 0 ? (
                  paginatedTenders.map((row) => (
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
                            onClick={() => handleGoToDetails(row.id, row.title)}
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
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu ihale pasif yap" : ""}>
                              <MenuItem onClick={handleSetInactive}>
                                <ListItemIcon>
                                  <DoNotDisturbOnRoundedIcon width={18} />
                                </ListItemIcon>
                               Pasif Yap
                              </MenuItem>
                            </CustomTooltip>
                          ) : (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu ihale aktif yap" : ""}>
                              <MenuItem onClick={handleSetActive}>
                                <ListItemIcon>
                                  <DoneRoundedIcon width={18} />
                                </ListItemIcon>
                                Aktif Yap
                              </MenuItem>
                            </CustomTooltip>
                          )}
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ihale düzenle" : ""}>
                            <MenuItem onClick={handleEditClick}>
                              <ListItemIcon>
                                <IconEdit width={18} />
                              </ListItemIcon>
                              Düzenlemek
                            </MenuItem>
                          </CustomTooltip>
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ihale sil" : ""}>
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
          count={sortedAndFilteredTenders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Satır başına düşen:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
        />
      </BlankCard>

      <DeleteTender
        openModal={openDeleteModal}
        onClose={handleClickCloseDeleteModal}
        tenderIdToDelete={tenderIdToDelete}
        onDeleteSuccess={getListTender}
        showAlert={showAlert}
      />
    </>
  );
};



export default ListTender;