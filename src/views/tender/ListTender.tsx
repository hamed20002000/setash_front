// ListTender.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton as MuiToggleButton, CircularProgress,
  TableSortLabel
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

import DefineWorkModal from './DefineWorkModal';
import axios from 'axios';
import server from '../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';


// İhale tipi tanımı
interface TenderType {
  id: number;
  title: string;
  createAt: string;
  recordStatus?: number; // 0 = Aktif, 1 = Pasif, 2 = Silindi
  status: string; // Metinsel durum (recordStatus için)
  tenderStatus?: number; // 0 = Beklemede, 1 = Onaylandı, 2 = Reddedildi (API'den gelen status için)
  approvedTenderText?: string; // "Onaylanan İhale" sütunu için metin
  approvedTenderDate?: string; // Onay/Red tarihi
  showApprovedIcon?: boolean; // Onay ikonu için
  showRejectedIcon?: boolean; // Red ikonu için
}

// StyledToggleButton (SystemRole.tsx'ten kopyalandı)
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

// Sıralama için yardımcı fonksiyonlar
type SortableTenderKeys = keyof Pick<TenderType, 'id' | 'title' | 'createAt' | 'status' | 'approvedTenderText' | 'approvedTenderDate'>;

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


const ListTender = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState<string>('');
  const [tendersList, setTendersList] = useState<TenderType[]>([]);
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
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const { isTooltipGloballyEnabled } = useTooltip();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [orderBy, setOrderBy] = useState<SortableTenderKeys>('createAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const tenderTitleInputRef = useRef<HTMLInputElement>(null);

  const [titleError, setTitleError] = useState<boolean>(false);
  const [titleHelperText, setTitleHelperText] = useState<string>('');
  const [openDefineWorkModal, setOpenDefineWorkModal] = useState<boolean>(false);
  const [selectedTenderIdForWork, setSelectedTenderIdForWork] = useState<number | null>(null);


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
    getListTender();
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
      setTitle(selectedRowForMenu.title);
      setOriginalTitle(selectedRowForMenu.title);
      setEditingId(selectedRowForMenu.id);

      setTitleError(false);
      setTitleHelperText('');

      setTimeout(() => {
        tenderTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tenderTitleInputRef.current?.focus();
      }, 100);
    }
    handleCloseMenu();
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    setTitleError(false);
    setTitleHelperText('');
  };

  // Yeni ihale oluşturma
  const insertTender = async () => {
    if (!title.trim()) {
      setTitleError(true);
      setTitleHelperText('Başlık boş olamaz!');
      showAlert('Başlık boş olamaz!', 'warning');
      return;
    }
    setTitleError(false);
    setTitleHelperText('');

    clearAlert();
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, giriş sayfasına yönlendiriliyor.");
      navigate("/");
      return;
    }

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
      console.error("İhale eklenirken hata oluştu:", e);
      showAlert(e.response?.data?.message || 'İhale eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

  // İhale düzenleme
  const editTender = async () => {
    if (editingId === null) return;
    if (!title.trim()) {
      setTitleError(true);
      setTitleHelperText('Başlık boş olamaz!');
      showAlert('Başlık boş olamaz!', 'warning');
      return;
    }
    setTitleError(false);
    setTitleHelperText('');

    clearAlert();

    if (title === originalTitle) {
      showAlert('Başlıkta herhangi bir değişiklik yapmadınız.', 'info');
      resetFormAndState();
      return;
    }

    setLoadingButton(true);
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showAlert('Lütfen giriş yapın.', 'warning');
        navigate("/");
        return;
      }

      const response = await axios.put(
        server.baseurl + server.initialoperations + "update-tender",
        { id: Number(editingId), title: title }, {
        headers: {
          "Accept": "application/json",
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.data.httpStatusCode === 200) {
        showAlert('İhale başarıyla güncellendi!', 'success');
        resetFormAndState();
        getListTender();
      } else {
        showAlert(response.data.message || 'İhale güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("İhale güncellenirken hata oluştu:", e);
      showAlert(e.response?.data?.message || 'İhale güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  }

  // İhale durumunu güncelleme (aktif/pasif)
  const sendRecordStatusUpdate = async (id: number, statusValue: number) => {
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
        const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
        showAlert(`İhale başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListTender();
      } else {
        showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Durum güncellenirken hata oluştu:", e);
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      handleCloseMenu();
    }
  };

  const handleSetActive = () => {
    if (selectedRowForMenu) {
      sendRecordStatusUpdate(selectedRowForMenu.id, 0); // 0 for Aktif
    }
  };

  const handleSetInactive = () => {
    if (selectedRowForMenu) {
      sendRecordStatusUpdate(selectedRowForMenu.id, 1); // 1 for Pasif
    }
  };

  const handleSetActiveTender = () => {
    if (selectedRowForMenu) {
      handleApproveTender(selectedRowForMenu.id, 1); // 0 for Aktif
    }
  };

  const handleSetInactiveTender = () => {
    if (selectedRowForMenu) {
      handleRejectTender(selectedRowForMenu.id, 2); // 1 for Pasif
    }
  };

  // Yeni fonksiyonlar: İhale Onayla, İhale Reddet, İş Tanımla
  const handleApproveTender = async (tenderId: number, statusValue: number) => {
    clearAlert();
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showAlert('Lütfen giriş yapın.', 'warning');
        navigate("/");
        return;
      }

      const response = await axios.put(server.baseurl + server.initialoperations + "update-tender-status",
        { id: Number(tenderId), status: statusValue }, {
        headers: {
          "Accept": "application/json",
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.data.httpStatusCode === 200) {
        const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
        showAlert(`İhale başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListTender();
      } else {
        showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Durum güncellenirken hata oluştu:", e);
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      handleCloseMenu();
    }
  };

  const handleRejectTender = async (tenderId: number, statusValue: number) => {
    clearAlert();
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showAlert('Lütfen giriş yapın.', 'warning');
        navigate("/");
        return;
      }

      const response = await axios.put(server.baseurl + server.initialoperations + "update-tender-status",
        { id: Number(tenderId), status: statusValue }, {
        headers: {
          "Accept": "application/json",
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.data.httpStatusCode === 200) {
        const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
        showAlert(`İhale başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListTender();
      } else {
        showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Durum güncellenirken hata oluştu:", e);
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      handleCloseMenu();
    }
  };

  const handleDefineWork = (tenderId: number) => {
    setSelectedTenderIdForWork(tenderId);
    setOpenDefineWorkModal(true);
    handleCloseMenu(); // Menüyü kapatmayı unutmayın
  };
  const handleWorkDefinedSuccess = (workId: number, tenderId: number) => {
    // Burada kullanıcıya sorma mantığını DefineWorkModal içine taşıdık
    // Direkt olarak work detay sayfasına yönlendirme yapabiliriz veya
    // DefineWorkModal zaten sormuş olacağı için, burada sadece navigasyon yapabiliriz.
    // Eğer modalda sormak istemiyorsanız, confirm logic'i buraya taşıyabilirsiniz.
    navigate(`/work/work-details/${workId}?tenderId=${tenderId}`); // İş detay sayfanızın URL yapısına göre güncelleyin
  };


  const resetFormAndState = () => {
    setTitle('');
    setEditingId(null);
    setOriginalTitle('');
    setTitleError(false);
    setTitleHelperText('');
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A"; // Eğer tarih string'i yoksa "N/A" döndür

    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Ayı iki haneli yap (01-12)
      const day = String(date.getDate()).padStart(2, '0');     // Günü iki haneli yap (01-31)
      return `${year}-${month}-${day}`; // YYYY-MM-DD formatı
    } catch (e) {
      console.error("Tarih biçimlendirilirken hata oluştu:", e);
      return "Geçersiz Tarih";
    }
  };

  // İhale listesini API'den alma
  function getListTender() {
    setLoadingData(true);
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      console.warn("Kimlik doğrulama belirteci bulunamadı, giriş sayfasına yönlendiriliyor.");
      navigate("/");
      setLoadingData(false);
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
        const formattedData: TenderType[] = result.data.data.map((item: any) => {
          // recordStatus için metin durumu
          let recordStatusText = '';
          if (item.recordStatus === 0) {
            recordStatusText = 'Aktif';
          } else if (item.recordStatus === 1) {
            recordStatusText = 'Pasif';
          } else {
            recordStatusText = 'Silindi';
          }

          // item.status'a göre "Onaylanan İhale" ve "Onay/Red Tarihi" mantığı
          let approvedTenderText = '';
          let approvedTenderDate = null;
          let showApprovedIcon = false;
          let showRejectedIcon = false;

          if (item.status === 0) {
            approvedTenderText = 'Beklemede';
          } else if (item.status === 1) {
            approvedTenderText = 'Onaylandı';
            showApprovedIcon = true;
            approvedTenderDate = item.statusDate;
          } else if (item.status === 2) {
            approvedTenderText = 'Reddedildi';
            showRejectedIcon = true;
            approvedTenderDate = item.statusDate;
          }

          return {
            id: item.id,
            title: item.title,
            recordStatus: item.recordStatus,
            createAt: item.createAt,
            status: recordStatusText,
            tenderStatus: item.status, // Menü öğeleri için ham durum
            approvedTenderText: approvedTenderText,
            approvedTenderDate: approvedTenderDate,
            showApprovedIcon: showApprovedIcon,
            showRejectedIcon: showRejectedIcon,
          };
        });

        setTendersList(formattedData);
        setLoadingData(false);
      } else {
        showAlert(result.data.message || 'İhale listesi alınırken bir hata oluştu.', 'error');
        setLoadingData(false);
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
      setLoadingData(false);
    });
  }


  useEffect(() => {
    getListTender();
  }, []);

  // Durum filtresi değiştirme
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

  // Sıralama yönünü değiştirme
  const handleRequestSort = (property: SortableTenderKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
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

  // Arama ve duruma göre ihaleleri filtrele
  const filteredTenders = tendersList.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && tender.recordStatus === 0) ||
      (statusFilter === 'inactive' && tender.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  // Filtrelenmiş veriye sıralamayı uygula
  const sortedAndFilteredTenders = stableSort(filteredTenders, getComparator(order, orderBy));

  const paginatedTenders = sortedAndFilteredTenders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  // İhale detay sayfasına gitme
  const handleGoToDetails = (tenderId: number | undefined, tenderTitle: string | undefined) => {
    if (tenderId && tenderTitle) {
      navigate(`/tender/tender-details/${tenderId}?title=${encodeURIComponent(tenderTitle)}`);
    } else {
      showAlert('İhale detayları için gerekli bilgiler eksik.', 'warning');
    }
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
                if (titleError && e.target.value.trim()) {
                  setTitleError(false);
                  setTitleHelperText('');
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
                  <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili ihaleyi güncelleyin" : ""}>
                    <Button
                      variant="contained"
                      color="info"
                      onClick={editTender}
                      disabled={loadingButton}
                    >
                      {loadingButton ? <>
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                      </> : 'Düzenle'}
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
                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
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
            {/* Durum Filtresi */}
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Durum filtresi"
                fullWidth
              >
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm ihaleleri göster" : ""}>
                  <StyledToggleButton
                    value="all"
                    aria-label="Tüm ihaleler"
                  >
                    Tümü
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif ihaleleri göster" : ""}>
                  <StyledToggleButton
                    value="active"
                    aria-label="Aktif ihaleler"
                  >
                    Aktif
                  </StyledToggleButton>
                </CustomTooltip>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif ihaleleri göster" : ""}>
                  <StyledToggleButton
                    value="inactive"
                    aria-label="Pasif ihaleler"
                  >
                    Pasif
                  </StyledToggleButton>
                </CustomTooltip>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        {loadingData ? (
          <Stack sx={{ width: '100%', height: '300px', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>Yükleniyor...</Typography>
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="ihale tablosu">
              <TableHead style={{ background: "#f1f1f1" }}>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'title'}
                      direction={orderBy === 'title' ? order : 'asc'}
                      onClick={() => handleRequestSort('title')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Başlık</Typography>
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
                      active={orderBy === 'approvedTenderText'}
                      direction={orderBy === 'approvedTenderText' ? order : 'asc'}
                      onClick={() => handleRequestSort('approvedTenderText')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Onaylanan İhale</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'approvedTenderDate'}
                      direction={orderBy === 'approvedTenderDate' ? order : 'asc'}
                      onClick={() => handleRequestSort('approvedTenderDate')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Onay/Red Tarihi</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Durum (Kayıt)</Typography>
                    </TableSortLabel>
                  </TableCell>
                  <TableCell
                    style={{ color: "#171c23" }}>
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
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {row.showApprovedIcon && <CheckCircleOutlineIcon color="success" fontSize="small" />}
                          {row.showRejectedIcon && <HighlightOffIcon color="error" fontSize="small" />}
                          <Typography variant="h6">{row.approvedTenderText}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6">{formatDate(row.approvedTenderDate || null)}</Typography>
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
                          {selectedRowForMenu?.tenderStatus === 0 && (
                            <>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi onayla" : ""}>
                                <MenuItem onClick={handleSetActiveTender}>
                                  <ListItemIcon>
                                    <ThumbUpAltIcon fontSize="small" />
                                  </ListItemIcon>
                                  İhaleyi Onayla
                                </MenuItem>
                              </CustomTooltip>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi reddet" : ""}>
                                <MenuItem onClick={handleSetInactiveTender}>
                                  <ListItemIcon>
                                    <ThumbDownAltIcon fontSize="small" />
                                  </ListItemIcon>
                                  İhaleyi Reddet
                                </MenuItem>
                              </CustomTooltip>
                            </>
                          )}

                          {selectedRowForMenu?.tenderStatus === 1 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "İş tanımla" : ""}>
                              <MenuItem onClick={() => handleDefineWork(selectedRowForMenu.id)}>
                                <ListItemIcon>
                                  <AssignmentTurnedInIcon fontSize="small" />
                                </ListItemIcon>
                                İş Tanımla
                              </MenuItem>
                            </CustomTooltip>
                          )}

                          {selectedRowForMenu?.recordStatus === 0 ? (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu ihaleyi pasif yap" : ""}>
                              <MenuItem onClick={handleSetInactive}>
                                <ListItemIcon>
                                  <DoNotDisturbOnRoundedIcon width={18} />
                                </ListItemIcon>
                                Pasif Yap
                              </MenuItem>
                            </CustomTooltip>
                          ) : (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu ihaleyi aktif yap" : ""}>
                              <MenuItem onClick={handleSetActive}>
                                <ListItemIcon>
                                  <DoneRoundedIcon width={18} />
                                </ListItemIcon>
                                Aktif Yap
                              </MenuItem>
                            </CustomTooltip>
                          )}

                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ihaleyi düzenle" : ""}>
                            <MenuItem onClick={handleEditClick}>
                              <ListItemIcon>
                                <IconEdit width={18} />
                              </ListItemIcon>
                              Düzenlemek
                            </MenuItem>
                          </CustomTooltip>
                          <CustomTooltip placement="left"
                            title={isTooltipGloballyEnabled ? "Bu ihaleyi sil" : ""}>
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
                    <TableCell colSpan={7} align="center">
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
          labelRowsPerPage="Sayfa başına satır sayısı:"
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

      <DefineWorkModal
        open={openDefineWorkModal}
        onClose={() => setOpenDefineWorkModal(false)}
        tenderId={selectedTenderIdForWork}
        showAlert={showAlert}
        onWorkDefinedSuccess={handleWorkDefinedSuccess}
      />
    </>
  );
};

export default ListTender;