// SystemOperation.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from "react"; // useRef را اضافه کنید
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  // CircularProgress,
  ToggleButtonGroup,
  // ToggleButton as MuiToggleButton,
  ToggleButton, // اضافه شد: برای فیلتر وضعیت
  TableSortLabel, // ✅ اضافه شد: برای آیکون‌های مرتب‌سازی
} from '@mui/material';
// import { styled } from '@mui/material/styles';

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
  recordStatus?: number; // 0 = Aktif, 1 = Pasif, 2 = Silindi
  createAt: string;
}

const initialRows: RowType[] = [];

// **ToggleButton سفارشی با استایل‌های شرطی (کپی از ListUnit.tsx)**
// const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
//     '&.Mui-selected': {
// //      color: 'white',
// //      ...(value === 'all' && selected && {
// //        backgroundColor: theme.palette.primary.main,
// //        '&:hover': {
// //          backgroundColor: theme.palette.primary.dark,
// //        },
// //      }),
// //      ...(value === 'active' && selected && {
// //        backgroundColor: theme.palette.success.main,
// //        '&:hover': {
// //          backgroundColor: theme.palette.success.dark,
// //        },
// //      }),
// //      ...(value === 'inactive' && selected && {
// //        backgroundColor: theme.palette.error.main,
// //        '&:hover': {
// //          backgroundColor: theme.palette.error.dark,
// //        },
// //      }),
// //    },
// //    '&:not(.Mui-selected)': {
// //      color: theme.palette.text.primary,
// //      borderColor: theme.palette.divider,
// //      '&:hover': {
// //          backgroundColor: theme.palette.action.hover,
// //      },
// //    },
// }));


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

  // ✅ اضافه شد: وضعیت برای مرتب‌سازی
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
      }, 5000); // 5000 milliseconds = 5 seconds
    }
    return () => {
      clearTimeout(timer); // Clear the timer if the component unmounts or alertMessage changes
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
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    setNameError(false); // پاک کردن خطای ورودی
    setNameHelperText(''); // پاک کردن پیام کمکی
  };

  const insertOperation = async () => {
    if (!name.trim()) {
      setNameError(true); // تنظیم وضعیت خطا به true
      setNameHelperText('Operasyon ismi boş bırakılamaz.'); // تنظیم پیام کمکی
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
      console.error("Error inserting operation:", e);
      showAlert(e.response?.data?.message || 'İşlem eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  const editOperation = async () => {
    if (editingId === null) return;
    if (!name.trim()) {
      setNameError(true); // تنظیم وضعیت خطا به true
      setNameHelperText('Operasyon ismi boş bırakılamaz.'); // تنظیم پیام کمکی
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
          recordStatus: item.recordStatus !== undefined && item.recordStatus !== null ? item.recordStatus : 0,
          createAt: item.createAt,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi', // 'Silindi' به جای 'askıda olması'
        }));
        // ✅ حذف مرتب‌سازی اولیه از اینجا، زیرا مرتب‌سازی نهایی پایین‌تر انجام می‌شود.
        // const sortedData = formattedData.sort((a: RowType, b: RowType) => {
        //    const dateA = new Date(a.createAt);
        //    const dateB = new Date(b.createAt);
        //    return dateB.getTime() - dateA.getTime();
        // });
        setOperationsList(formattedData as RowType[]); // ✅ داده‌ها را بدون مرتب‌سازی اولیه ذخیره می‌کنیم
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

  // ✅ اضافه شد: هندلر برای تغییر مرتب‌سازی
  const handleRequestSort = (property: keyof RowType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // هنگام تغییر مرتب‌سازی، به صفحه اول برگرد
  };

  // ✅ اضافه شد: تابع کمکی برای مرتب‌سازی
  const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  // ✅ اضافه شد: تابع برای مقایسه عناصر برای مرتب‌سازی
  const getComparator = <Key extends keyof RowType>( // Key را به keyof RowType محدود کنید
    order: 'asc' | 'desc',
    orderBy: Key,
  ): (a: RowType, b: RowType) => number => { // پارامترها و بازگشتی تابع را به RowType تغییر دهید
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  // ✅ اضافه شد: تابع کمکی برای مرتب‌سازی نزولی
  const descendingComparator = <T, Key extends keyof T>(
    a: T,
    b: T,
    orderBy: Key,
  ): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];

    // برای مقایسه امن، مقادیر undefined/null را به یک مقدار قابل مقایسه تبدیل می‌کنیم.
    // برای رشته‌ها، می‌توانید از یک رشته خالی یا 'zzz' استفاده کنید.
    // برای اعداد، از 0 یا یک عدد خیلی بزرگ/کوچک استفاده کنید.
    // در اینجا، ما یک رویکرد کلی را در نظر می‌گیریم:
    // اگر یکی از مقادیر undefined/null باشد، آن را به سمت انتهایی (یا ابتدایی) ترتیب هل می‌دهیم.

    if (valB === undefined || valB === null) {
      return valA === undefined || valA === null ? 0 : -1; // اگر B تعریف نشده باشد، A بزرگتر است (در نزولی جلوتر می‌آید)
    }
    if (valA === undefined || valA === null) {
      return 1; // اگر A تعریف نشده باشد، B بزرگتر است (در نزولی جلوتر می‌آید)
    }

    // مقایسه بر اساس نوع (فرض بر این است که رشته یا عدد هستند)
    if (typeof valB === 'string' && typeof valA === 'string') {
      return valB.localeCompare(valA); // برای رشته‌ها
    }
    if (typeof valB === 'number' && typeof valA === 'number') {
      return valB - valA; // برای اعداد
    }
    // بازگشت به حالت پیش‌فرض برای انواع دیگر یا در صورت عدم موفقیت مقایسه
    // این یک تبدیل ضمنی به رشته است که ممکن است همیشه ایده‌آل نباشد اما خطا را رفع می‌کند.
    if (String(valB) < String(valA)) {
      return -1;
    }
    if (String(valB) > String(valA)) {
      return 1;
    }
    return 0;
  };



  // فیلتر کردن عملیات‌ها بر اساس جستجو و وضعیت
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
                    Pasif
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
                  {/* ✅ اضافه شد: TableSortLabel برای ستون نام */}
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
                  {/* ✅ اضافه شد: TableSortLabel برای ستون تاریخ ایجاد */}
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
                  {/* ✅ اضافه شد: TableSortLabel برای ستون وضعیت */}
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
          count={sortedAndFilteredOperations.length} // اینجا از filteredOperations استفاده کنید تا مرتب‌سازی در تعداد کلی تاثیر نگذارد
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