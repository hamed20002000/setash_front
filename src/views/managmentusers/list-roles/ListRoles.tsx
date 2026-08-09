// SystemRole.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableBody,
  TableCell as MuiTableCell,
  MenuItem as MuiMenuItem,
  Typography, Chip, Menu, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton as MuiToggleButton,
  TableSortLabel,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch, IconX } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteListRole from './DeleteListRole';
import ListSystemOperationModal from './ListSystemOperationModal';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';

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


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
  fontFamily: 'NotoSans',
  fontSize: '0.8rem',
  [theme.breakpoints.up('md')]: {
    fontSize: '1rem',
  },
}));

const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
  animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
  transition: 'transform 0.3s ease-in-out',
}));

interface RowType {
  id: number;
  status: string;
  name: string;
  recordStatus?: number;
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

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);

  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Voice Modal States
  const [openVoiceModal, setOpenVoiceModal] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);


  const { menuItems, allowedOperations } = useAuth();
  const findMenuByHref = (items: any[], path: string): any => {
    for (const item of items) {
      if (item.href === path) return item;
      if (item.children && item.children.length > 0) {
        const found = findMenuByHref(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };
  const currentMenu = useMemo(() => {

    return findMenuByHref(menuItems, location.pathname);
  }, [menuItems, location.pathname]);

  const currentMenuOpIds = useMemo(() => {
    if (!currentMenu || !currentMenu.menuOperations) return [];

    return currentMenu.menuOperations.map((op: any) => {
      return String(op.id);
    });
  }, [currentMenu]);

   const hasPermission = (opName: string) => {   
    return allowedOperations.some((op: any) =>
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

  const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
  const hasChangeOpPermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
  const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
  const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);


  const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setAlertMessage(message);
    setAlertSeverity(severity);
  }, []);
  const clearAlert = useCallback(() => {
    setAlertMessage(null);
  }, []);
  const getListRole = useCallback(() => {
    const authToken = localStorage.getItem('authToken');

    setLoadingData(true);
    if (!authToken) {
      navigate("/");
      setLoadingData(false);
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
        setLoadingData(false);
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
  }, [navigate, showAlert]);

  const handleClickCloseOperationModal = useCallback(() => {
    setOpenOperationModal(false);
    setRoleIdForOperations(null);
    getListRole();
  }, [getListRole]);
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
    getListRole();
  }, [getListRole]);

  // Voice Modal Handlers
  const handleOpenVoiceModal = useCallback(() => {
    setOpenVoiceModal(true);
    setVoiceInput('');
  }, []);

  const handleCloseVoiceModal = useCallback(() => {
    setOpenVoiceModal(false);
    setIsRecording(false);
    
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current.abort();
    }
    
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showAlert('مرورگر شما از تشخیص صوت پشتیبانی نمی‌کند', 'error');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'fa-IR'; // Persian language
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update textarea with combined text
        if (finalTranscript) {
          setVoiceInput(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        showAlert('خطا در تشخیص صوت: ' + event.error, 'error');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      
      // Create media recorder (optional, for audio backup)
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      // Start speech recognition
      recognition.start();

    } catch (error) {
      console.error('Error accessing microphone:', error);
      showAlert('خطا در دسترسی به میکروفن', 'error');
      setIsRecording(false);
    }
  }, [showAlert]);

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
  }, []);

  const handleSendVoiceMessage = useCallback(async () => {
    if (!voiceInput.trim()) {
      showAlert('لطفاً متنی را وارد کنید', 'warning');
      return;
    }

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('لطفاً ابتدا وارد شوید', 'warning');
      navigate('/');
      return;
    }

    try {
      setLoadingButton(true);
      const response = await axios.post(
        'http://localhost:3001/api/baseinfo/agent',
        { text: voiceInput },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200 || response.status === 201) {
        setVoiceInput(response.data|| '');
        showAlert('پیام با موفقیت ارسال شد', 'success');

         setTimeout(() => {
              handleCloseVoiceModal();
          },5000)
        
      } else {
        showAlert(response.data.message || 'خطایی در ارسال پیام رخ داد', 'error');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        navigate('/');
        showAlert('نشست شما پایان یافت. لطفاً دوباره وارد شوید', 'error');
      } else {
        showAlert(error.response?.data?.message || 'خطا در ارسال پیام', 'error');
      }
    } finally {
      setLoadingButton(false);
    }
  }, [voiceInput, showAlert, handleCloseVoiceModal, navigate]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
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
    setIsFormVisible(false);
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
    setIsFormVisible(true);
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

  const insertRole = async () => {
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

  const editRole = async () => {
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
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        console.error("Error updating Role:", e);
        showAlert(e.response?.data?.message || 'Rol güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

      }
    } finally {
      setLoadingButton(false);
    }
  }

  const sendStatusUpdate = useCallback(async (currentName: string, statusValue: number) => {
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
  }, [clearAlert, showAlert, navigate, getListRole, resetFormAndState, handleCloseMenu]);

  const handleSetActive = useCallback(() => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.name, 0);
    }
  }, [selectedRowForMenu, sendStatusUpdate]);

  const handleSetInactive = useCallback(() => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.name, 1);
    }
  }, [selectedRowForMenu, sendStatusUpdate]);


  const handleClickOpenOperationModal = useCallback(() => {
    if (selectedRowForMenu) {
      setRoleIdForOperations(selectedRowForMenu.id);
      setOpenOperationModal(true);
    }
    handleCloseMenu();
  }, [selectedRowForMenu, handleCloseMenu]);

  useEffect(() => {
    getListRole();
  }, [getListRole]);




  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBlinking(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

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
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>

          <Typography variant="h5" mb={2}>{editingId ? 'Rol Düzenle' : 'Yeni Rol Kaydı'}</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems="stretch"
            flexGrow={1}
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          >
            {!isFormVisible && hasCreatePermission && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Rol Belgesi kaydetmek için tıklayınız" : ""}>
                <>
                <BlinkingButton
                  variant="contained"
                  color="primary"
                  onClick={() => setIsFormVisible(true)}
                  isBlinking={isBlinking}
                  fullWidth={false}
                >
                  Yeni Rol Kaydet
                </BlinkingButton>

                <BlinkingButton
                  variant="contained"
                  color="secondary"
                  onClick={handleOpenVoiceModal}
                  isBlinking={isBlinking}
                  fullWidth={false}
                  className="blink-button"
                  startIcon={<MicIcon />}
                >
                  صوتی پیام
                </BlinkingButton>
                </>


              </CustomTooltip>
            )}
            {isFormVisible && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={resetFormAndState}
                  fullWidth={false}
                  startIcon={<IconX size={20} />}
                >
                  Gizle
                </Button>
              </CustomTooltip>
            )}

          </Stack>

        </Stack>
        {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
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
                <StyledToggleButton
                  value="all"
                  aria-label="all roles"
                >
                  Tümü
                </StyledToggleButton>
                <StyledToggleButton
                  value="active"
                  aria-label="active roles"
                >
                  Aktif
                </StyledToggleButton>
                <StyledToggleButton
                  value="inactive"
                  aria-label="inactive roles"
                >
                  Pasif
                </StyledToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          {loadingData ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>Roller yükleniyor...</Typography>
            </Box>
          ) : (
            <Table aria-label="simple table">
              <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                <TableRow>
                  <StyledTableCell>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">İsim</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell>
                    <TableSortLabel
                      active={orderBy === 'createAt'}
                      direction={orderBy === 'createAt' ? order : 'asc'}
                      onClick={() => handleRequestSort('createAt')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Oluşturulma Tarihi</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                      style={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Durum</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell></StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRoles.length > 0 ? (
                  paginatedRoles.map((row) => (
                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <StyledTableCell>
                        <Typography variant="body1">{row.name}</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
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
                      </StyledTableCell>
                      <StyledTableCell>
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
                          MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                        >
                          {Number(selectedRowForMenu?.id) !== 1 &&hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu rolü pasif yap" : ""}>
                              <MuiMenuItem onClick={handleSetInactive}>
                                <ListItemIcon>
                                  <DoNotDisturbOnRoundedIcon width={18} />
                                </ListItemIcon>
                                Pasif Yap
                              </MuiMenuItem>
                            </CustomTooltip> 
                          )}
                          {Number(selectedRowForMenu?.id) !== 1 &&hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu rolü aktif yap" : ""}>
                              <MuiMenuItem onClick={handleSetActive}>
                                <ListItemIcon>
                                  <DoneRoundedIcon width={18} />
                                </ListItemIcon>
                                Aktif Yap
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {Number(selectedRowForMenu?.id) !== 1 && hasChangeOpPermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu rolün operasyonlarını seçin" : ""}>
                              <MuiMenuItem onClick={handleClickOpenOperationModal}>
                                <ListItemIcon>
                                  <IconPlus width={18} />
                                </ListItemIcon>
                                Operasyon Seçin
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {Number(selectedRowForMenu?.id) !== 1 &&hasEditPermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu rolü düzenle" : ""}>
                              <MuiMenuItem onClick={handleEditClick}>
                                <ListItemIcon>
                                  <IconEdit width={18} />
                                </ListItemIcon>
                                Düzenlemek
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {Number(selectedRowForMenu?.id) !== 1 &&hasDeletePermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu rolü sil" : ""}>
                              <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                <ListItemIcon>
                                  <IconTrash width={18} />
                                </ListItemIcon>
                                Silmek
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                        </Menu>
                      </StyledTableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <StyledTableCell colSpan={4} align="center">
                      <Typography variant="subtitle1" color="textSecondary">
                        Hiç rol bulunamadı.
                      </Typography>
                    </StyledTableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
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
        roleId={roleIdForOperations?.toString() || null}
        showAlert={showAlert}
      />

      {/* Voice Message Modal */}
      <Dialog 
        open={openVoiceModal} 
        onClose={handleCloseVoiceModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="span">
            ارسال پیام صوتی
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                متن پیام
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="متنی را اینجا وارد کنید یا از میکروفن استفاده کنید..."
                value={voiceInput}
                onChange={(e) => setVoiceInput(e.target.value)}
                variant="outlined"
              />
            </Box>
            
            <Box display="flex" justifyContent="center" gap={2}>
              <Button
                variant={isRecording ? "contained" : "outlined"}
                color={isRecording ? "error" : "primary"}
                startIcon={<MicIcon />}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
              >
                {isRecording ? 'ضبط را متوقف کنید' : 'شروع ضبط'}
              </Button>
            </Box>

            {isRecording && (
              <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="primary">
                  در حال ضبط...
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleCloseVoiceModal}
            variant="outlined"
            disabled={loadingButton}
          >
            بستن
          </Button>
          <Button 
            onClick={handleSendVoiceMessage}
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            disabled={loadingButton}
          >
            {loadingButton ? (
              <>
                <BoltIcon sx={{ mr: 1, fontSize: 20 }} /> در حال ارسال...
              </>
            ) : (
              'ارسال'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SystemRole;