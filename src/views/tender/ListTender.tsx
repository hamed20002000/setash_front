// ListTender.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";

import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  TableContainer, Table, TableHead, TableRow, TableBody,
  TableCell as MuiTableCell,
  MenuItem as MuiMenuItem,
  Typography, Chip, Menu, IconButton, ListItemIcon, Box,
  Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
  ToggleButtonGroup, ToggleButton as MuiToggleButton, CircularProgress,
  TableSortLabel
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../components/shared/BlankCard';
import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch, IconPaperclip, IconDownload, IconX, IconRefresh } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteTender from './DeleteTender';
import DefineWorkModal from './DefineWorkModal';
import axios from 'axios';
import server from '../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';

import Excel from 'exceljs';
import AttachFileModal from './AttachFileModal';
import DownloadAttachmentsModal from './DownloadAttachmentsModal';

import DownloadOptionsModal from './DownloadOptionsModal';

import { saveAs } from 'file-saver';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

import { useAuth } from 'src/context/AuthContext';


const formatDateDisplay = (dateString: string | null): string => {
  if (!dateString) return "-";
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

interface TableRowData {
  itemName: string;
  quantity: number;
  unit: string;
  description: string;
  price: string;
}

interface TenderType {
  id: number;
  title: string;
  createAt: string;
  recordStatus?: number;
  status: string;
  tenderStatus?: number;
  approvedTenderText?: string;
  approvedTenderDate?: string;
  showApprovedIcon?: boolean;
  showRejectedIcon?: boolean;
  showPendingIcon?: boolean;
  attachments?: { fileUrl: string }[];
}
interface Attachment {
  fileUrl: string;
}
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

const statusToLabel = (s: string) => {
  switch (s) {
    case "Beklemede": return "Beklemede";
    case "Onaylandı": return "Onaylandı";
    case "Reddedildi": return "Reddedildi";
    default: return "-";
  }
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
const stripHtml = (html: string | null): string => {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return doc.body.textContent || "";
};
const ListTender = () => {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const idsFromState = ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
  const idsFromSingleParam = (searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
  const notifIds: number[] = (idsFromState.length ? idsFromState : (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
    .map(id => Number(id))
    .filter(id => Number.isFinite(id));
  const hasIdsFilter = notifIds.length > 0;
  const idsSet = new Set<number>(notifIds);



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

  const [openAttachModal, setOpenAttachModal] = useState<boolean>(false);
  const [tenderIdForAttachment, setTenderIdForAttachment] = useState<number | null>(null);
  const [filesForDownload, setFilesForDownload] = useState<Attachment[] | null>(null);
  const [openDownloadModal, setOpenDownloadModal] = useState<boolean>(false);
  const [openDownloadOptionsModal, setOpenDownloadOptionsModal] = useState<boolean>(false);
  const [selectedTenderForDownload, setSelectedTenderForDownload] = useState<TenderType | null>(null);


  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);


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
      op.systemOperationName === opName &&
      currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

  const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
  const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
  const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
  const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazدırmak"), [allowedOperations, currentMenuOpIds]);

  const hasStatusPermission = useMemo(() => hasPermission("Onaylamak"), [allowedOperations, currentMenuOpIds]);


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

  const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;

    doc.setFont('NotoSans', 'normal');

    const logoWidth = 40;
    const logoHeight = 25;
    const margin = 10;

    const logoX = pageWidth - logoWidth - margin;
    const logoY = 10;

    docAny.addImage(Logo, 'PNG', logoX, logoY, logoWidth, logoHeight);

    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Rapor Tarihi:`, 15, 35);
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 35);

    doc.setDrawColor(150);
    doc.line(10, 40, pageWidth - 10, 40);
  };

  const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const docAny = doc as any;

    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');

    const companyInfo = [
      'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
      'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
      'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
    ];

    doc.setDrawColor(150);
    doc.line(10, pageHeight - 45, pageWidth - 10, pageHeight - 45);

    let footerY = pageHeight - 40;
    companyInfo.forEach(line => {
      doc.text(line, pageWidth / 2, footerY, { align: 'center' });
      footerY += 4;
    });

    doc.setFontSize(10);
    doc.setFont('NotoSans', 'normal');
    const signatureY = pageHeight - 10;
    doc.text('İmza', pageWidth - 15, signatureY, { align: 'right' });
    doc.line(pageWidth - 65, signatureY - 5, pageWidth - 15, signatureY - 5);

    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, signatureY);
  };

  const addExcelHeader = (worksheet: any, title: string, columnsLength: number) => {
    worksheet.views = [{ rightToLeft: false }];

    const titleRow = worksheet.addRow([title]);
    titleRow.font = { name: 'NotoSans', size: 14, bold: false };
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
    titleRow.getCell(1).alignment = { horizontal: 'center' };

    const dateRow = worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
    dateRow.font = { name: 'NotoSans', size: 10, bold: false };
    dateRow.getCell(1).alignment = { horizontal: 'left' };
    worksheet.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);
    worksheet.addRow([]);
  };

  const addExcelCompanyInfo = (worksheet: any, startRow: number, columnsLength: number) => {
    const companyInfo = [
      'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
      'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
      'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
    ];
    let rowNum = startRow;

    companyInfo.forEach(line => {
      const row = worksheet.getRow(rowNum);
      row.getCell(1).value = line;
      row.getCell(1).alignment = { horizontal: 'center', readingOrder: 'ltr' };
      row.getCell(1).font = { name: 'NotoSans', size: 8, bold: false };
      worksheet.mergeCells(`A${rowNum}:${String.fromCharCode(65 + columnsLength - 1)}${rowNum}`);
      rowNum++;
    });
  };

  const downloadExcelForPurchase = async (tender: TenderType) => {
    const tenderId = tender.id;
    const tenderTitle = tender.title;
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showAlert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.', 'warning');
      navigate("/");
      handleCloseMenu();
      return;
    }

    showAlert('İhale verileri indiriliyor...', 'info');
    handleCloseMenu();

    try {
      const response = await axios.get(
        `${server.baseurl + server.initialoperations}get-tender-by-id/${tenderId}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`
          }
        }
      );
      if (response.data.httpStatusCode === 200 && response.data.data) {
        const tenderData = response.data.data;
        const tenderCategories = tenderData.tenderCategories || [];

        const excelData: any[] = [];
        let totalQuantity = 0;
        tenderCategories.forEach((category: any) => {
          const tenderDetails = category.tenderDetails || [];
          tenderDetails.forEach((detail: any) => {
            const quantity = parseFloat(detail.ourProcuredItemQuantities);
            if (!isNaN(quantity) && quantity > 0) {
              excelData.push({
                'Ürün': detail.item?.name || '-',
                'Ölçü': detail.item?.unit?.title || '-',
                'Miktar': quantity,
                'Açıklama': '',
                'Fiyat': ''
              });
              totalQuantity += quantity;
            }
          });
        });

        if (excelData.length === 0) {
          showAlert('Seçilen ihale için satın alma verisi bulunamadı.', 'warning');
          return;
        }

        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Satın Alma Listesi');
        const tableColumns = ['Ürün', 'Ölçü', 'Miktar', 'Açıklama', 'Fiyat'];
        const totalColumns = tableColumns.length;

        addExcelHeader(worksheet, `Satın Alma İhtiyaç Raporu - ${tenderData.title}`, totalColumns);


        worksheet.addRow([`İhale ID:`, tender.id]).font = { bold: true, name: 'NotoSans' };
        worksheet.addRow([`Tarih:`, formatDateDisplay(tenderData.createAt)]).font = { bold: true, name: 'NotoSans' };
        worksheet.addRow([`Onay Durumu:`, tender.approvedTenderText]).font = { bold: true, name: 'NotoSans' };
        worksheet.addRow([]);
        const headerRow = worksheet.addRow(tableColumns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        excelData.forEach(row => {
          const dataRow = worksheet.addRow([
            row['Ürün'],
            row['Ölçü'],
            row['Miktar'],
            row['Açıklama'],
            row['Fiyat']
          ]);
          dataRow.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });
        });

        worksheet.addRow([]);
        const totalRow = worksheet.addRow(['', 'Toplam Miktar:', totalQuantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 }), '', '']);
        totalRow.font = { name: 'NotoSans', bold: true };
        totalRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }; });

        worksheet.columns.forEach(column => { column.width = 20; });
        worksheet.getColumn(1).width = 30;
        worksheet.getColumn(4).width = 40;

        worksheet.addRow([]);
        addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 1, totalColumns);


        workbook.xlsx.writeBuffer().then(buffer => {
          saveAs(new Blob([buffer]), `${tenderTitle}-SatınAlma.xlsx`);
          showAlert('İhale verileri başarıyla indirildi!', 'success');
        });

      } else {
        showAlert(response.data.message || 'İhale verileri alınırken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("Download failed:", e);
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        showAlert('İhale verileri indirilirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    }

    setOpenDownloadOptionsModal(false);
  };

  const downloadPdfForPurchase = async (tender: TenderType) => {
    showAlert('PDF dosyası hazırlanıyor...', 'info');
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showAlert('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', 'warning');
        navigate("/");
        return;
      }

      const response = await axios.get(
        `${server.baseurl + server.initialoperations}get-tender-by-id/${tender.id}`,
        {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      if (response.data.httpStatusCode === 200 && response.data.data) {
        const tenderData = response.data.data;
        const tenderCategories = tenderData.tenderCategories || [];

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const docAny = doc as any;
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const printTenderInfo = () => {
          doc.setFontSize(14);
          doc.setFontSize(12);
          doc.text(`İhale Adı: ${tenderData.title || '-'}`, 15, 60);
          doc.text(`İhale ID: ${tender.id}`, pageWidth - 15, 60, { align: 'right' });
          doc.text(`Tarih: ${formatDateDisplay(tenderData.createAt)}`, 15, 67);
          doc.text(`Rapor Oluşturma Tarihi: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 67, { align: 'right' });
        };

        const tableData: TableRowData[] = [];
        let totalQuantity = 0;

        tenderCategories.forEach((category: any) => {
          const tenderDetails = category.tenderDetails || [];
          tenderDetails.forEach((detail: any) => {
            const quantity = parseFloat(detail.ourProcuredItemQuantities);
            if (!isNaN(quantity) && quantity > 0) {
              tableData.push({
                itemName: detail.item?.name || '-',
                quantity: quantity,
                unit: detail.item?.unit?.title || '-',
                description: stripHtml(detail.description),
                price: '',
              });
              totalQuantity += quantity;
            }
          });
        });

        if (tableData.length === 0) {
          showAlert('Seçilen ihale için satın alma verisi bulunamadı.', 'warning');
          setOpenDownloadOptionsModal(false);
          return;
        }

        const rows = tableData.map(row => [
          row.itemName,
          row.quantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
          row.unit,
          row.description,
          row.price
        ]);

        autoTable(doc, {
          startY: 75,
          head: [['Ürün Adı', 'Miktar', 'Birim', 'Açıklama', 'Fiyat']],
          body: rows,
          theme: 'grid',
          styles: {
            font: 'NotoSans',
            fontStyle: 'normal',
            fontSize: 10,
            cellPadding: 2,
            overflow: 'linebreak'
          },
          headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 50 },
            4: { cellWidth: 'auto', halign: 'right' },
          },
          foot: [
            ['', 'Toplam Miktar:', totalQuantity.toLocaleString('tr-TR', { minimumFractionDigits: 2 }), '', '']
          ],
          footStyles: {
            font: 'NotoSans',
            fillColor: [230, 230, 230],
            textColor: [0, 0, 0],
            halign: 'right',
            fontStyle: 'bold'
          },
          didDrawPage: (dataHook) => {
            addPdfHeader(doc, 'Satın Alma İhtiyaç Raporu');
            addPdfFooter(doc);
            if (dataHook.pageNumber === 1) {
              printTenderInfo();
            }
          },
          showHead: 'everyPage',
          margin: { top: 55, bottom: 45 }
        });

        doc.save(`${tenderData.title}-SatınAlma.pdf`);
        showAlert('PDF dosyası başarıyla indirildi!', 'success');

      } else {
        showAlert(response.data.message || 'İhale verileri alınırken bir hata oluştu.', 'error');
      }
    } catch (e: any) {
      console.error("PDF oluşturma başarısız oldu:", e);
      if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        navigate("/");
        showAlert('Oturum süreniz doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
      } else {
        showAlert(e.response?.data?.message || 'İhale verileri indirilirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setOpenDownloadOptionsModal(false);
    }
  };

  const handleDownloadTenderForPurchase = () => {
    if (!selectedRowForMenu) return;
    setSelectedTenderForDownload(selectedRowForMenu);
    setOpenDownloadOptionsModal(true);
    handleCloseMenu();
  };


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
    setIsFormVisible(true);
    clearAlert();
  };

  const handleCancelEdit = () => {
    resetFormAndState();
    clearAlert();
    setTitleError(false);
    setTitleHelperText('');
  };

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
      showAlert(e.response?.data?.message || 'İhale eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    } finally {
      setLoadingButton(false);
    }
  };

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
        server.baseurl + server.initialoperations + "update-tender-header",
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
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        showAlert(e.response?.data?.message || 'İhale güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

      }
    } finally {
      setLoadingButton(false);
    }
  }
  const sendRecordStatusUpdate = async (id: number, statusValue: number) => {
    clearAlert();
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showAlert('Lütfen giriş yapın.', 'warning');
        navigate("/");
        return;
      }
      const response = await axios.put(server.baseurl + server.initialoperations + "update-tender-header",
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
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

      }
    } finally {
      handleCloseMenu();
    }
  };
  const handleSetActive = () => {
    if (selectedRowForMenu) {
      sendRecordStatusUpdate(selectedRowForMenu.id, 0);
    }
  };
  const handleSetInactive = () => {
    if (selectedRowForMenu) {
      sendRecordStatusUpdate(selectedRowForMenu.id, 1);
    }
  };
  const handleSetActiveTender = () => {
    if (selectedRowForMenu) {
      handleApproveTender(selectedRowForMenu.id, 1);
    }
  };
  const handleSetInactiveTender = () => {
    if (selectedRowForMenu) {
      handleRejectTender(selectedRowForMenu.id, 2);
    }
  };

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
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      }
      else {
        showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

      }
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
      if (e.response && e.response.status === 500) {
        showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

      } else if (e.response && e.response.status === 401) {
        localStorage.removeItem('authToken');
        showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
        navigate("/");
      } else {
        showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

      }
    } finally {
      handleCloseMenu();
    }
  };

  const handleDefineWork = (tenderId: number) => {
    setSelectedTenderIdForWork(tenderId);
    setOpenDefineWorkModal(true);
    handleCloseMenu();
  };
  const handleWorkDefinedSuccess = (workId: number, tenderId: number) => {
    navigate(`/work/work-details/${workId}?tenderId=${tenderId}`);
  };

  const resetFormAndState = () => {
    setTitle('');
    setEditingId(null);
    setOriginalTitle('');
    setTitleError(false);
    setTitleHelperText('');
    setIsFormVisible(false);
  };

  const handleDownloadAttachments = useCallback(() => {
    if (selectedRowForMenu?.attachments && selectedRowForMenu.attachments.length > 0) {
      setFilesForDownload(selectedRowForMenu.attachments);
      setOpenDownloadModal(true);
    } else {
      showAlert('Bu ihale için indirilecek dosya bulunamadı.', 'warning');
    }
    handleCloseMenu();
  }, [selectedRowForMenu, showAlert, handleCloseMenu]);

  const handleDownloadAttachmentsDirect = useCallback((row: TenderType) => {
    if (row.attachments && row.attachments.length > 0) {
      setFilesForDownload(row.attachments);
      setOpenDownloadModal(true);
    } else {
      showAlert('Bu ihale için indirilecek dosya bulunamadı.', 'warning');
    }
  }, [showAlert]);

  function getListTender() {
    setLoadingData(true);
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
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
          let recordStatusText = '';
          if (item.recordStatus === 0) {
            recordStatusText = 'Aktif';
          } else if (item.recordStatus === 1) {
            recordStatusText = 'Pasif';
          }
          let approvedTenderText = '';
          let approvedTenderDate = null;
          let showApprovedIcon = false;
          let showRejectedIcon = false;
          let showPendingIcon = false;
          if (item.status === 0) {
            approvedTenderText = 'Beklemede';
            showPendingIcon = true;
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
            tenderStatus: item.status,
            approvedTenderText: approvedTenderText,
            approvedTenderDate: approvedTenderDate,
            showApprovedIcon: showApprovedIcon,
            showRejectedIcon: showRejectedIcon,
            showPendingIcon: showPendingIcon,
            attachments: item.attachments || [],
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
        showAlert('İhale listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
      }
      setLoadingData(false);
    });
  }

  useEffect(() => {
    getListTender();
  }, []);



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

  const handleRequestSort = useCallback((property: SortableTenderKeys) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  }, [orderBy, order]);

  const handleChangePage = useCallback((
    event: unknown,
    newPage: number) => {
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

  const filteredTenders = tendersList.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && tender.recordStatus === 0) ||
      (statusFilter === 'inactive' && tender.recordStatus === 1);
    const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(tender.id));
    return matchesSearch && matchesStatus && matchesNotifIds;
  });

  const handleClickOpenAttachModal = () => {
    if (selectedRowForMenu) {
      setTenderIdForAttachment(selectedRowForMenu.id);
      setOpenAttachModal(true);
    }
    handleCloseMenu();
  };

  const handleClickCloseAttachModal = () => {
    setOpenAttachModal(false);
    setTenderIdForAttachment(null);
    getListTender();
  };

  const sortedAndFilteredTenders = stableSort(filteredTenders, getComparator(order, orderBy));
  const paginatedTenders = sortedAndFilteredTenders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const handleGoToDetails = (tenderId: number | undefined, tenderTitle: string | undefined) => {
    if (tenderId && tenderTitle) {
      navigate(`/tender/tender-details/${tenderId}?title=${encodeURIComponent(tenderTitle)}`);
    } else {
      showAlert('İhale detayları için gerekli bilgiler eksik.', 'warning');
    }
  };



  const clearNotifFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('ids');
    setSearchParams(next, { replace: true });

    navigate(location.pathname, {
      replace: true,
      state: { ...(location.state as any), notifIds: [] },
    });

    setPage(0);
  };


  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>

          <Typography variant="h5" mb={2}>{editingId ? 'İhale Düzenle' : 'Yeni İhale Kaydı'}</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems="stretch"
            flexGrow={1}
            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          >
            {!isFormVisible && hasCreatePermission && (
              <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni İhale Belgesi kaydetmek için tıklayınız" : ""}>
                <BlinkingButton
                  variant="contained"
                  color="primary"
                  onClick={() => setIsFormVisible(true)}
                  isBlinking={isBlinking}
                  fullWidth={false}
                >
                  Yeni İhale Kaydet
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
              <CustomFormLabel htmlFor="tender-title" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
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
                    {hasCreatePermission && (
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
            <Grid item xs={12} sm={6} md={4}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusFilterChange}
                aria-label="Durum filtresi"
                fullWidth
              >
                <StyledToggleButton
                  value="all"
                  aria-label="Tüm ihaleler"
                >
                  Tümü
                </StyledToggleButton>
                <StyledToggleButton
                  value="active"
                  aria-label="Aktif ihaleler"
                >
                  Aktif
                </StyledToggleButton>
                <StyledToggleButton
                  value="inactive"
                  aria-label="Pasif ihaleler"
                >
                  Pasif
                </StyledToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Typography variant="h5">
            Proje Listesi

            {notifIds.length > 0 && (
              <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                <Chip
                  label={`Bildirim filtresi: ${notifIds.length}`}
                  color="error"
                  size="small"
                />
                <IconButton
                  aria-label="Bildirim filtresini temizle"
                  size="small"
                  onClick={clearNotifFilter}
                  sx={{ p: 0.5 }}
                  title="Filtreyi temizle"
                >
                  <IconRefresh size={18} />
                </IconButton>
              </Stack>
            )}
          </Typography>

        </Stack>
        <TableContainer>
          {loadingData ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>İhaleler yükleniyor...</Typography>
            </Box>
          ) : (
            <Table aria-label="ihale tablosu">
              <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                <TableRow>
                  <StyledTableCell sx={{ color: "#171c23" }}>
                    <TableSortLabel
                      active={orderBy === 'title'}
                      direction={orderBy === 'title' ? order : 'asc'}
                      onClick={() => handleRequestSort('title')}
                      sx={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Başlık</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell sx={{ color: "#171c23" }}>
                    <TableSortLabel
                      active={orderBy === 'createAt'}
                      direction={orderBy === 'createAt' ? order : 'asc'}
                      onClick={() => handleRequestSort('createAt')}
                      sx={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Oluşturulma Tarihi</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell sx={{ color: "#171c23" }}>
                    <TableSortLabel
                      active={orderBy === 'approvedTenderText'}
                      direction={orderBy === 'approvedTenderText' ? order : 'asc'}
                      onClick={() => handleRequestSort('approvedTenderText')}
                      sx={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Onaylanan İhale</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell sx={{ color: "#171c23" }}>
                    <TableSortLabel
                      active={orderBy === 'approvedTenderDate'}
                      direction={orderBy === 'approvedTenderDate' ? order : 'asc'}
                      onClick={() => handleRequestSort('approvedTenderDate')}
                      sx={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Onay/Red Tarihi</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell sx={{ color: "#171c23" }}>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                      sx={{ color: "#171c23" }}
                    >
                      <Typography variant="h6">Durum</Typography>
                    </TableSortLabel>
                  </StyledTableCell>
                  <StyledTableCell sx={{ color: "#171c23" }}>
                    <Typography variant="h6">Detaylar</Typography>
                  </StyledTableCell>
                  <StyledTableCell></StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTenders.length > 0 ? (
                  paginatedTenders.map((row) => (
                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: "pointer" }}>
                          {row.attachments && row.attachments.length > 0 && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ihale ek dosya içeriyor." : ""}>
                              <IconPaperclip
                                onClick={() => handleDownloadAttachmentsDirect(row)}
                                size={20} color="#01c4ffff" />
                            </CustomTooltip>
                          )}
                          <Typography variant="body1">{row.title}</Typography>
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {row.showApprovedIcon && <Chip label={statusToLabel(row.approvedTenderText ?? '-')} color="success" size="small" />}
                          {row.showRejectedIcon && <Chip label={statusToLabel(row.approvedTenderText ?? '-')} color="error" size="small" />}
                          {row.showPendingIcon && <Chip label={statusToLabel(row.approvedTenderText ?? '-')} color="warning" size="small" />}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="body1">{formatDateDisplay(row.approvedTenderDate || null)}</Typography>
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
                          {hasDownloadPermission && selectedRowForMenu?.attachments && selectedRowForMenu.attachments.length > 0 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ek dosyaları indir" : ""}>
                              <MuiMenuItem onClick={handleDownloadAttachments}>
                                <ListItemIcon>
                                  <IconDownload size={18} />
                                </ListItemIcon>
                                Ek Dosyaları İndir ({selectedRowForMenu.attachments.length})
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasDownloadPermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Satın alma için ihale verilerini indir" : ""}>
                              <MuiMenuItem onClick={handleDownloadTenderForPurchase}>
                                <ListItemIcon>
                                  <IconDownload size={18} />
                                </ListItemIcon>
                                Satın Alma İçin İndir
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasStatusPermission && selectedRowForMenu?.tenderStatus === 0 && (
                            <>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi onayla" : ""}>
                                <MuiMenuItem onClick={handleSetActiveTender}>
                                  <ListItemIcon>
                                    <ThumbUpAltIcon fontSize="small" />
                                  </ListItemIcon>
                                  İhaleyi Onayla
                                </MuiMenuItem>
                              </CustomTooltip>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi reddet" : ""}>
                                <MuiMenuItem onClick={handleSetInactiveTender}>
                                  <ListItemIcon>
                                    <ThumbDownAltIcon fontSize="small" />
                                  </ListItemIcon>
                                  İhaleyi Reddet
                                </MuiMenuItem>
                              </CustomTooltip>
                            </>
                          )}
                          {hasStatusPermission && selectedRowForMenu?.tenderStatus === 2 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi onayla" : ""}>
                              <MuiMenuItem onClick={handleSetActiveTender}>
                                <ListItemIcon>
                                  <ThumbUpAltIcon fontSize="small" />
                                </ListItemIcon>
                                İhaleyi Onayla
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasStatusPermission && selectedRowForMenu?.tenderStatus === 1 && (
                            <>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi reddet" : ""}>
                                <MuiMenuItem onClick={handleSetInactiveTender}>
                                  <ListItemIcon>
                                    <ThumbDownAltIcon fontSize="small" />
                                  </ListItemIcon>
                                  İhaleyi Reddet
                                </MuiMenuItem>
                              </CustomTooltip>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "İş tanımla" : ""}>
                                <MuiMenuItem onClick={() => handleDefineWork(selectedRowForMenu.id)}>
                                  <ListItemIcon>
                                    <AssignmentTurnedInIcon fontSize="small" />
                                  </ListItemIcon>
                                  İş Tanımla
                                </MuiMenuItem>
                              </CustomTooltip>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "İhaleye ek dosyalar ekle" : ""}>
                                <MuiMenuItem onClick={handleClickOpenAttachModal}>
                                  <ListItemIcon>
                                    <IconPaperclip size={18} />
                                  </ListItemIcon>
                                  Ek Dosya Ekle
                                </MuiMenuItem>
                              </CustomTooltip>
                            </>
                          )}
                          {hasEditPermission && selectedRowForMenu?.recordStatus === 0 ? (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi pasif yap" : ""}>
                              <MuiMenuItem onClick={handleSetInactive}>
                                <ListItemIcon>
                                  <DoNotDisturbOnRoundedIcon width={18} />
                                </ListItemIcon>
                                Pasif Yap
                              </MuiMenuItem>
                            </CustomTooltip>
                          ) : (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi aktif yap" : ""}>
                              <MuiMenuItem onClick={handleSetActive}>
                                <ListItemIcon>
                                  <DoneRoundedIcon width={18} />
                                </ListItemIcon>
                                Aktif Yap
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasEditPermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi düzenle" : ""}>
                              <MuiMenuItem onClick={handleEditClick}>
                                <ListItemIcon>
                                  <IconEdit width={18} />
                                </ListItemIcon>
                                Düzenlemek
                              </MuiMenuItem>
                            </CustomTooltip>
                          )}
                          {hasDeletePermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi sil" : ""}>
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
                    <StyledTableCell colSpan={7} align="center">
                      <Typography variant="subtitle1" color="textSecondary">
                        Hiç ihale bulunamadı.
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
      <DownloadAttachmentsModal
        open={openDownloadModal}
        onClose={() => {
          setOpenDownloadModal(false);
          setFilesForDownload(null);
        }}
        attachments={filesForDownload}
        showAlert={showAlert}
      />
      {openAttachModal && (
        <AttachFileModal
          open={openAttachModal}
          onClose={handleClickCloseAttachModal}
          tenderId={tenderIdForAttachment}
          showAlert={showAlert}
          onUploadSuccess={getListTender}
        />
      )}
      <DownloadOptionsModal
        open={openDownloadOptionsModal}
        onClose={() => setOpenDownloadOptionsModal(false)}
        onDownloadExcel={() => selectedTenderForDownload && downloadExcelForPurchase(selectedTenderForDownload)}
        onDownloadPdf={() => selectedTenderForDownload && downloadPdfForPurchase(selectedTenderForDownload)}
        isTooltipGloballyEnabled={isTooltipGloballyEnabled}
      />
    </>
  );
};

export default ListTender;