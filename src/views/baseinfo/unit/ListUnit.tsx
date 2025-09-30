// ListUnit.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TableContainer, Table, TableHead, TableRow, TableBody,
  Typography, Chip, Menu, IconButton, ListItemIcon, Box,
  TableCell as MuiTableCell,
  MenuItem as MuiMenuItem,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton as MuiToggleButton,
  TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress
} from '@mui/material';

import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX }
  from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteUnit from './DeleteUnit';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import { useAuth } from 'src/context/AuthContext';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';


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


const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
  animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
  transition: 'transform 0.3s ease-in-out',
}));

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


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
  fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
  // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
  fontSize: '0.8rem', // Varsayılan olarak küçük font
  [theme.breakpoints.up('md')]: {
    fontSize: '1rem', // Masaüstünde daha büyük
  },
}));
interface UnitType {
  id: number;
  name: string;
  createAt: string;
  recordStatus?: number; // 0 = Aktif, 1 = Pasif, 2 = Silindi
  status: string; // وضعیت متنی
}

const MOCK_UNITS: UnitType[] = [];
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

const getComparator = <Key extends keyof UnitType>(
  order: 'asc' | 'desc',
  orderBy: Key,
): (a: UnitType, b: UnitType) => number => {
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

  const [orderBy, setOrderBy] = useState<keyof UnitType>('createAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const unitNameInputRef = useRef<HTMLInputElement>(null);

  const [nameError, setNameError] = useState<boolean>(false);
  const [nameHelperText, setNameHelperText] = useState<string>('');
  const [openDownloadModal, setOpenDownloadModal] = useState(false);


  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);


  const [loadingData, setLoadingData] = useState<boolean>(true);

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

  const hasDownloadPermission = useMemo(() => {
    return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
  }, [allowedOperations]);

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

  // useEffect for auto-closing Alert
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

      // **Clear input validation errors when editing**
      setNameError(false);
      setNameHelperText('');

      setTimeout(() => {
        unitNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        unitNameInputRef.current?.focus();
      }, 100);
    }
    handleCloseMenu();
    clearAlert();
    setIsFormVisible(true);
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    // **Clear input validation errors**
    setNameError(false);
    setNameHelperText('');
  };

  const insertUnit = async () => {
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Ölçü adı boş olamaz!');
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
        server.baseurl + server.baseinfo + "create-item-unit",
        { title: name },
        {
          headers: {
            "Accept": "application/json",
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${authToken}`
          }
        }
      );
      if (response.data.httpStatusCode === 201) {
        showAlert('Yeni Ölçü başarıyla eklendi!', 'success');
        resetFormAndState();
        getListUnit();
      } else {
        showAlert(response.data.message || 'Yeni Ölçü eklenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      }
      console.error("Error inserting unit:", e);
      showAlert(e.response?.data?.message || 'Ölçü eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };


  const editUnit = async () => {
    if (editingId === null) return;
    if (!name.trim()) {
      setNameError(true);
      setNameHelperText('Ölçü adı boş olamaz!');
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
        server.baseurl + server.baseinfo + "update-item-unit",
        { id: Number(editingId), newTitle: name },
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data.httpStatusCode === 200) {
        showAlert('Ölçü başarıyla güncellendi!', 'success');
        setUnitsList(prevList =>
          prevList.map(op => (op.id === editingId ? { ...op, name: name } : op))
        );
        resetFormAndState();
        getListUnit();
      } else {
        showAlert(response.data.message || 'Ölçü güncellenirken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        console.error("Error updating unit:", e);
        showAlert(e.response?.data?.message || 'Ölçü güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

      }
    } finally {
      setLoadingButton(false);
    }
  }


  const sendStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    debugger
    const authToken = localStorage.getItem('authToken');

    if (!authToken) {
      showAlert('Lütfen giriş yapın.', 'warning');
      navigate("/");
      return;
    }
    try {
      const response = await axios.put(
        server.baseurl + server.baseinfo + "update-item-unit",
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
        showAlert(`Ölçü başarıyla ${statusText} olarak ayarlandı!`, 'success');
        getListUnit();
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
      sendStatusUpdate(selectedRowForMenu.id, 0); // 0 for Aktif
    }
  };

  const handleSetInactive = () => {
    if (selectedRowForMenu) {
      sendStatusUpdate(selectedRowForMenu.id, 1); // 1 for Pasif
    }
  };

  const resetFormAndState = () => {
    setName('');
    setEditingId(null);
    setOriginalName('');
    // **Clear input validation errors**
    setNameError(false);
    setNameHelperText('');
    setIsFormVisible(false);
  };


  function getListUnit() {
    const authToken = localStorage.getItem('authToken');

    setLoadingData(true);
    if (!authToken) {
      console.warn("No auth token found, redirecting to login.");
      navigate("/");
      setLoadingData(false);
      return;
    }

    axios.request({
      baseURL: server.baseurl + server.baseinfo + "get-item-units",
      method: "get",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${authToken}`
      }
    }).then((result) => {
      if (result.data.httpStatusCode === 200) {
        const formattedData = result.data.data.map((item: any) => ({
          id: item.id,
          name: item.title,
          recordStatus: item.recordStatus,
          createAt: item.createAt,
          status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
        }));
        setUnitsList(formattedData as UnitType[]);

        setLoadingData(false);
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
    getListUnit();
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBlinking(false);
    }, 5000);
    return () => {
      clearTimeout(timer);
    };
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

  const handleRequestSort = (property: keyof UnitType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const filteredUnits = unitsList.filter(unit => {
    const matchesSearch = unit.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && unit.recordStatus === 0) ||
      (statusFilter === 'inactive' && unit.recordStatus === 1);
    return matchesSearch && matchesStatus;
  });

  const sortedAndFilteredUnits = stableSort(filteredUnits, getComparator(order, orderBy));

  const paginatedUnits = sortedAndFilteredUnits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  // Updated PDF Download Function
  const handleDownloadAllUnitsPDF = () => {
    if (!sortedAndFilteredUnits || sortedAndFilteredUnits.length === 0) {
      showAlert('PDF oluşturulacak ölçü birimi bulunamadı.', 'warning');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    try {
      doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
      doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
      doc.addFileToVFS('Arial.ttf', ArialFont);
      doc.addFont('Arial.ttf', 'Arial', 'normal');
      doc.setFont('Arial');

      const rows = sortedAndFilteredUnits.map(unit => [
        unit.name,
        formatDateDisplay(unit.createAt),
        unit.status,
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['İsim', 'Oluşturulma Tarihi', 'Durum']],
        body: rows,
        theme: 'grid',
        styles: {
          font: 'Arial',
          fontStyle: 'normal',
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [242, 242, 242],
          textColor: [0, 0, 0],
          font: 'Arial',
          fontSize: 9,
        },
        didDrawPage: () => {
          // --- Header Section ---
          doc.setFont('Arial', 'bold');
          doc.setFontSize(14);
          doc.text('Tüm Ölçü Birimleri Raporu', pageWidth / 2, 15, { align: 'center' });
          doc.setFontSize(10);
          doc.setFont('Times', 'bold');
          doc.text(`Tarih:`, 15, 25);
          doc.setFont('Times', 'normal');
          doc.text(`${formatDateDisplay(new Date().toISOString())}`, 30, 25);
          doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

          // --- Footer Section ---
          doc.setFont('NotoSans', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(0);
          const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
          ];
          let footerY = pageHeight - 30;
          companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 4;
          });
          const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
          doc.setFont('NotoSans', 'normal');
          doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
          doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        },
        showHead: 'everyPage',
        margin: { top: 50, bottom: 45 },
      });

      doc.save('Tüm_Olcu_Birimleri_Raporu.pdf');
      showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    } catch (error: any) {
      console.error('PDF oluşturulurken hata:', error);
      showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
    }
  };


  // New Excel Download Function
  const handleExportExcel = async () => {
    setOpenDownloadModal(false);
    if (!sortedAndFilteredUnits || sortedAndFilteredUnits.length === 0) {
      showAlert('Dışa aktarılacak ölçü birimi bulunamadı.', 'warning');
      return;
    }

    showAlert('Excel dosyası oluşturuluyor...', 'info');

    try {
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Ölçü Birimleri Raporu', { views: [{ rightToLeft: false }] });

      // Define styles
      const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
      const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
      const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
      const headerFont = { ...font, bold: true };
      const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      const fullHeaderStyle = {
        border: border,
        alignment: centerAlignment,
        font: headerFont,
        fill: headerFill
      } as Partial<Excel.Style>;

      const bodyStyle = {
        border: border,
        alignment: leftAlignment,
        font: font
      } as Partial<Excel.Style>;

      const addCompanyInfo = (ws: Excel.Worksheet) => {
        ws.addRow([]); // Blank row for spacing
        const companyInfo = [
          'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
          'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
          'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
        ];
        companyInfo.forEach(line => {
          ws.addRow([line]);
          const lastRow = ws.lastRow;
          if (lastRow) {
            lastRow.getCell(1).alignment = { horizontal: 'center' };
            lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
            ws.mergeCells(`A${lastRow.number}:C${lastRow.number}`); // Merge cells
          }
        });
      };

      // Report Header
      worksheet.addRow(['', '', '']);
      const titleRow = worksheet.addRow(['Tüm Ölçü Birimleri Raporu']);
      if (titleRow) {
        titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
        titleRow.getCell(1).alignment = { horizontal: 'center' };
      }
      worksheet.mergeCells('A2:C2');

      worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
      const dateRow = worksheet.lastRow;
      if (dateRow) {
        dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
        dateRow.getCell(1).alignment = { horizontal: 'left' };
      }
      worksheet.addRow([]);

      // Table Headers
      const tableHeaders = ['İsim', 'Oluşturulma Tarihi', 'Durum'];
      const headerRow = worksheet.addRow(tableHeaders);
      headerRow.eachCell((cell) => {
        cell.style = fullHeaderStyle;
      });

      // Add data
      sortedAndFilteredUnits.forEach(unit => {
        const row = worksheet.addRow([
          unit.name,
          formatDateDisplay(unit.createAt),
          unit.status
        ]);
        row.eachCell((cell) => {
          cell.style = bodyStyle;
        });
      });

      // Add company info at the end
      addCompanyInfo(worksheet);

      // Adjust column widths
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        if (column.eachCell) {
          column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
        }
        column.width = Math.min(Math.max(maxLength + 2, 12), 50);
      });

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Tüm_Olcu_Birimleri_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
      saveAs(new Blob([buffer]), fileName);

      showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
    } catch (error) {
      console.error("Excel dışa aktarılırken hata:", error);
      showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
    }
  };


  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>

          <Typography variant="h5" mb={2}>{editingId ? 'Ölçü Düzenle' : 'Yeni Ölçü Kaydı'}</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems="stretch"
            flexGrow={1}
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          >
            {!isFormVisible && hasCreatePermission && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Ölçü Belgesi kaydetmek için tıklayınız" : ""}>
                <BlinkingButton
                  variant="contained"
                  color="primary"
                  onClick={() => setIsFormVisible(true)}
                  isBlinking={isBlinking}
                  fullWidth={false}
                >
                  Yeni Ölçü Kaydet
                </BlinkingButton>
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
              <CustomFormLabel htmlFor="unit-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                İsim
              </CustomFormLabel>
            </Grid>
            <Grid item xs={12} sm={7}>
              <CustomTextField
                id="unit-name"
                placeholder="Ölçü Adı"

                sx={{ width: '100%' }}
                size="small"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  if (nameError && e.target.value.trim()) {
                    setNameError(false);
                    setNameHelperText('');
                  }
                }}
                inputRef={unitNameInputRef}
                error={nameError}
                helperText={nameHelperText}
              />
            </Grid>
            <Grid item xs={12} sm={1}></Grid>
            <Grid item xs={12} sm={3}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {editingId !== null ? (
                  <>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili Ölçüi güncelleyin" : ""}>
                      <Button
                        variant="contained"
                        color="info"
                        onClick={editUnit}
                        disabled={loadingButton}
                      >
                        {loadingButton ? <>
                          <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                        </> : 'Düzenlemek'}
                      </Button>
                    </CustomTooltip>
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Ölçü moduna dön" : ""}>
                      <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                        İptal Et
                      </Button>
                    </CustomTooltip>
                  </>
                ) : (

                  <>
                    {hasCreatePermission && (
                      <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Ölçü ekle" : ""}>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={insertUnit}
                          disabled={loadingButton}
                        >
                          {loadingButton ? <>
                            <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                          </> : 'Yeni Ölçü Ekle'}
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

        <Grid item xs={12} mt={2} mr={2}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {hasDownloadPermission && (
              <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'right' }}>
                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenDownloadModal(true)} // Open modal on click
                    startIcon={<IconFileDownload />}
                  >
                    Tümünü İndir
                  </Button>
                </CustomTooltip>
              </Grid>
            )}
          </Stack>
        </Grid>
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={8}>
              <TextField
                label="Ölçü Ara"
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
                  aria-label="all units"
                >
                  Tümü
                </StyledToggleButton>
                <StyledToggleButton
                  value="active"
                  aria-label="active units"
                >
                  Aktif
                </StyledToggleButton>
                <StyledToggleButton
                  value="inactive"
                  aria-label="inactive units"
                >
                  Pasif
                </StyledToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <TableContainer>
          <Table aria-label="unit table">
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
              {loadingData ? (
                <TableRow>
                  <StyledTableCell colSpan={4} align="center">
                    <CircularProgress />
                    <Typography variant="subtitle1" color="textSecondary">
                      Ölçüler yükleniyor...
                    </Typography>
                  </StyledTableCell>
                </TableRow>
              ) : paginatedUnits.length > 0 ? (
                paginatedUnits.map((row) => (
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
                        MenuListProps={{
                          'aria-labelledby': `basic-button-${selectedRowForMenu?.id}`,
                        }}
                      >
                        {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                          <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ölçüyü pasif yap" : ""}>
                            <MuiMenuItem onClick={handleSetInactive}>
                              <ListItemIcon>
                                <DoNotDisturbOnRoundedIcon width={18} />
                              </ListItemIcon>
                              Pasif Yap
                            </MuiMenuItem>
                          </CustomTooltip>
                        )}
                        {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                          <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ölçüyü aktif yap" : ""}>
                            <MuiMenuItem onClick={handleSetActive}>
                              <ListItemIcon>
                                <DoneRoundedIcon width={18} />
                              </ListItemIcon>
                              Aktif Yap
                            </MuiMenuItem>
                          </CustomTooltip>
                        )}
                        {hasEditPermission && (
                          <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ölçüyü düzenle" : ""}>
                            <MuiMenuItem onClick={handleEditClick}>
                              <ListItemIcon>
                                <IconEdit width={18} />
                              </ListItemIcon>
                              Düzenlemek
                            </MuiMenuItem>
                          </CustomTooltip>
                        )}
                        {hasDeletePermission && (
                          <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ölçüyü sil" : ""}>
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
                      Hiç ölçü bulunamadı.
                    </Typography>
                  </StyledTableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={sortedAndFilteredUnits.length}
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
      {/* Download Modal */}
      <Dialog
        open={openDownloadModal}
        onClose={() => setOpenDownloadModal(false)}
      >
        <DialogTitle>Dosya Formatını Seçin</DialogTitle>
        <DialogContent>
          <Stack direction="column" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<IconFileDownload />}
              onClick={handleDownloadAllUnitsPDF}
            >
              PDF Olarak İndir
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<IconFileDownload />}
              onClick={handleExportExcel}
            >
              Excel Olarak İndir
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDownloadModal(false)} color="secondary">
            İptal
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ListUnit;