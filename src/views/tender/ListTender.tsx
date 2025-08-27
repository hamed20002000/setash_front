// ListTender.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch, IconPaperclip, IconDownload } from '@tabler/icons-react';
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
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import * as XLSX from 'xlsx';
import AttachFileModal from './AttachFileModal';
import DownloadAttachmentsModal from './DownloadAttachmentsModal';

import DownloadOptionsModal from './DownloadOptionsModal';

import { saveAs } from 'file-saver';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular'; // مطمئن شوید مسیر فایل فونت صحیح است
import Logo from 'src/assets/images/logos/logo.png';
// import html2canvas from 'html2canvas';


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

  const hasStatusPermission = useMemo(() => {
    return allowedOperations.some(op => op.systemOperationName === 'Onaylamak');
  }, [allowedOperations]);


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

  // ... داخل کامپوننت ListTender

  const downloadExcelForPurchase = async (tender: TenderType) => {
    debugger
    // if (!selectedRowForMenu) return;

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
      debugger
      if (response.data.httpStatusCode === 200 && response.data.data) {
        const tenderData = response.data.data;
        const tenderCategories = tenderData.tenderCategories || [];

        // ایجاد یک آرایه برای نگهداری داده‌های اکسل
        const excelData: any[] = [];
        debugger
        // پردازش و فیلتر کردن داده‌ها
        tenderCategories.forEach((category: any) => {
          const tenderDetails = category.tenderDetails || [];
          tenderDetails.forEach((detail: any) => {
            // فیلتر بر اساس ourProcuredItemQuantities
            const quantity = parseFloat(detail.ourProcuredItemQuantities);
            if (!isNaN(quantity) && quantity > 0) {
              excelData.push({
                'Ürün': detail.item?.name || '-',
                'Ölçü': detail.item?.unit?.title || '-',
                'Miktar': quantity,
                'Açıklama': '', // توضیحات خالی
                'Fiyat': ''    // قیمت خالی
              });
            }
          });
        });

        // بررسی اینکه آیا داده‌ای برای اکسل وجود دارد یا خیر
        if (excelData.length === 0) {
          showAlert('Seçilen ihale için satın alma verisi bulunamadı.', 'warning');
          return;
        }

        // ساخت و دانلود فایل اکسل
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Satın Alma Listesi');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `${tenderTitle}-SatınAlma.xlsx`);

        showAlert('İhale verileri başarıyla indirildi!', 'success');

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

  // const downloadPdfForPurchase = async (tender: TenderType) => {
  //   showAlert('PDF dosyası hazırlanıyor...', 'info');
  //   try {
  //     const authToken = localStorage.getItem('authToken');
  //     if (!authToken) {
  //       showAlert('Oturum süreniz doldu. Lütfen tekrar giriş yapın.', 'warning');
  //       navigate("/");
  //       return;
  //     }

  //     // API'den ihale detaylarını alın
  //     const response = await axios.get(
  //       `${server.baseurl + server.initialoperations}get-tender-by-id/${tender.id}`,
  //       {
  //         headers: {
  //           "Accept": "application/json",
  //           "Authorization": `Bearer ${authToken}`
  //         }
  //       }
  //     );

  //     if (response.data.httpStatusCode === 200 && response.data.data) {
  //       const tenderData = response.data.data;
  //       const tenderCategories = tenderData.tenderCategories || [];

  //       // Geçici bir HTML konteyneri oluşturun
  //       const pdfContainer = document.createElement('div');
  //       pdfContainer.style.width = '100%';
  //       pdfContainer.style.padding = '20px';
  //       pdfContainer.style.backgroundColor = 'white';

  //       // Başlık ve genel bilgileri ekleyin
  //       const title = document.createElement('h3');
  //       title.innerText = `İhale Detayları - ${tenderData.title}`;
  //       pdfContainer.appendChild(title);

  //       const info = document.createElement('p');
  //       info.innerHTML = `<strong>Tarih:</strong> ${formatDateDisplay(tenderData.createAt)}`;
  //       pdfContainer.appendChild(info);

  //       // Tüm kategoriler için verileri toplayın
  //       const tableData: TableRowData[] = [];
  //       tenderCategories.forEach((category: any) => {
  //         const tenderDetails = category.tenderDetails || [];
  //         tenderDetails.forEach((detail: any) => {
  //           const quantity = parseFloat(detail.ourProcuredItemQuantities);
  //           if (!isNaN(quantity) && quantity > 0) {
  //             tableData.push({
  //               itemName: detail.item?.name || '-',
  //               quantity: quantity,
  //               unit: detail.item?.unit?.title || '-',
  //               description: stripHtml(detail.description),
  //               price: '',
  //             });
  //           }
  //         });
  //       });

  //       if (tableData.length === 0) {
  //         showAlert('Seçilen ihale için satın alma verisi bulunamadı.', 'warning');
  //         setOpenDownloadOptionsModal(false);
  //         return;
  //       }

  //       // HTML tablosunu oluşturun
  //       const table = document.createElement('table');
  //       table.style.width = '100%';
  //       table.style.borderCollapse = 'collapse';

  //       // Tablo başlıklarını ekleyin
  //       table.innerHTML = `
  //               <thead>
  //                   <tr>
  //                       <th style="border: 1px solid black; padding: 8px;">Ürün Adı</th>
  //                       <th style="border: 1px solid black; padding: 8px;">Miktar</th>
  //                       <th style="border: 1px solid black; padding: 8px;">Birim</th>
  //                       <th style="border: 1px solid black; padding: 8px;">Açıklama</th>
  //                       <th style="border: 1px solid black; padding: 8px;">Fiyat</th>
  //                   </tr>
  //               </thead>
  //               <tbody>
  //                   ${tableData.map(row => `
  //                       <tr>
  //                           <td style="border: 1px solid black; padding: 8px;">${row.itemName}</td>
  //                           <td style="border: 1px solid black; padding: 8px;">${row.quantity}</td>
  //                           <td style="border: 1px solid black; padding: 8px;">${row.unit}</td>
  //                           <td style="border: 1px solid black; padding: 8px;">${row.description}</td>
  //                           <td style="border: 1px solid black; padding: 8px;">${row.price}</td>
  //                       </tr>
  //                   `).join('')}
  //               </tbody>
  //           `;

  //       pdfContainer.appendChild(table);

  //       // Geçici konteyneri DOM'a ekleyin
  //       document.body.appendChild(pdfContainer);

  //       // Konteyneri PDF'e dönüştürün
  //       html2canvas(pdfContainer, { scale: 2 }).then(canvas => {
  //         const imgData = canvas.toDataURL('image/png');
  //         const pdf = new jsPDF('p', 'mm', 'a4');
  //         const imgProps = pdf.getImageProperties(imgData);
  //         const pdfWidth = pdf.internal.pageSize.getWidth();
  //         const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  //         pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  //         pdf.save(`${tender.title}-SatınAlma.pdf`);

  //         // Geçici konteyneri DOM'dan kaldırın
  //         document.body.removeChild(pdfContainer);
  //         showAlert('PDF dosyası başarıyla indirildi!', 'success');
  //       });
  //     } else {
  //       showAlert(response.data.message || 'İhale verileri alınırken bir hata oluştu.', 'error');
  //     }
  //   } catch (e: any) {
  //     console.error("PDF oluşturma başarısız oldu:", e);
  //     if (e.response && e.response.status === 401) {
  //       localStorage.removeItem('authToken');
  //       navigate("/");
  //       showAlert('Oturum süreniz doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
  //     } else {
  //       showAlert(e.response?.data?.message || 'İhale verileri indirilirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
  //     }
  //   } finally {
  //     setOpenDownloadOptionsModal(false);
  //   }
  // };;

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
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
          doc.addImage(Logo, 'PNG', 15, 15, 30, 30);
          doc.setFontSize(18);
          doc.text(`İhale Detayları`, pageWidth - 15, 30, { align: 'right' });
          doc.setFontSize(12);
          doc.text(`İhale Adı: ${tenderData.title || '-'}`, pageWidth - 15, 40, { align: 'right' });
          doc.text(`Tarih: ${formatDateDisplay(tenderData.createAt)}`, pageWidth - 15, 47, { align: 'right' });
        };

        const footer = () => {
          doc.setFontSize(10);
          doc.setTextColor(0);
          doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
          doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        };

        const tableData: TableRowData[] = [];
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
          row.quantity,
          row.unit,
          row.description,
          row.price
        ]);

        autoTable(doc, {
          startY: 60,
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
            1: { cellWidth: 20 },
            2: { cellWidth: 20 },
            3: { cellWidth: 50 },
            4: { cellWidth: 'auto' },
          },
          didDrawPage: () => {
            header();
            footer();
          },
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
      showAlert(e.response?.data?.message || 'İhale güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
      showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
  };

  const handleDownloadAttachments = useCallback(() => {
    if (selectedRowForMenu?.attachments && selectedRowForMenu.attachments.length > 0) {
      setFilesForDownload(selectedRowForMenu.attachments);
      setOpenDownloadModal(true); // ✅ Open the download modal
    } else {
      showAlert('Bu ihale için indirilecek dosya bulunamadı.', 'warning');
    }
    handleCloseMenu();
  }, [selectedRowForMenu, showAlert, handleCloseMenu]);

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
          } else {
            recordStatusText = 'Silindi';
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
          debugger
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
    return matchesSearch && matchesStatus;
  });

  const handleClickOpenAttachModal = () => {
    if (selectedRowForMenu) {
      setTenderIdForAttachment(selectedRowForMenu.id);
      setOpenAttachModal(true);
    }
    handleCloseMenu(); // Close the menu after clicking
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
  return (
    <>
      <div style={{
        borderBottom: "1px solid",
        margin: "10px 0 30px 0",
        padding: "10px 15px 30px 15px"
      }}>

        {(hasCreatePermission || hasEditPermission) && (
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
        {loadingData ? (
          <Stack sx={{ width: '100%', height: '300px', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>Yükleniyor...</Typography>
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="ihale tablosu">
              <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
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
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            {row.attachments && row.attachments.length > 0 && (
                              <CustomTooltip title={isTooltipGloballyEnabled ? "Bu ihale ek dosya içeriyor." : ""}>
                                <IconPaperclip size={20} color="#01c4ffff" />
                              </CustomTooltip>
                            )}
                            <Typography variant="h6" sx={{ paddingLeft: "5px" }}>
                              {row.title}
                            </Typography>
                          </Box>

                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box>
                            <Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {row.showApprovedIcon && <CheckCircleOutlineIcon color="success" fontSize="small" />}
                          {row.showRejectedIcon && <HighlightOffIcon color="error" fontSize="small" />}
                          {row.showPendingIcon && <HourglassEmptyIcon sx={{ color: 'orange' }} fontSize="small" />}
                          <Typography variant="h6">{row.approvedTenderText}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="h6">{formatDateDisplay(row.approvedTenderDate || null)}</Typography>
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
                          {hasDownloadPermission && selectedRowForMenu?.attachments && selectedRowForMenu.attachments.length > 0 && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Ek dosyaları indir" : ""}>
                              <MenuItem onClick={handleDownloadAttachments}>
                                <ListItemIcon>
                                  <IconDownload size={18} />
                                </ListItemIcon>
                                Ek Dosyaları İndir ({selectedRowForMenu.attachments.length})
                              </MenuItem>
                            </CustomTooltip>
                          )}
                          {hasDownloadPermission && (
                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Satın alma için ihale verilerini indir" : ""}>
                              <MenuItem onClick={handleDownloadTenderForPurchase}>
                                <ListItemIcon>
                                  <IconDownload size={18} /> {/* از آیکون مناسب استفاده کن */}
                                </ListItemIcon>
                                Satın Alma İçin İndir
                              </MenuItem>
                            </CustomTooltip>
                          )}
                          {hasStatusPermission && selectedRowForMenu?.tenderStatus === 0 && (
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

                          {hasStatusPermission && selectedRowForMenu?.tenderStatus === 2 && (
                            <>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi onayla" : ""}>
                                <MenuItem onClick={handleSetActiveTender}>
                                  <ListItemIcon>
                                    <ThumbUpAltIcon fontSize="small" />
                                  </ListItemIcon>
                                  İhaleyi Onayla
                                </MenuItem>
                              </CustomTooltip>
                            </>

                          )}

                          {hasStatusPermission && selectedRowForMenu?.tenderStatus === 1 && (
                            <>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ihaleyi reddet" : ""}>
                                <MenuItem onClick={handleSetInactiveTender}>
                                  <ListItemIcon>
                                    <ThumbDownAltIcon fontSize="small" />
                                  </ListItemIcon>
                                  İhaleyi Reddet
                                </MenuItem>
                              </CustomTooltip>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "İş tanımla" : ""}>
                                <MenuItem onClick={() => handleDefineWork(selectedRowForMenu.id)}>
                                  <ListItemIcon>
                                    <AssignmentTurnedInIcon fontSize="small" />
                                  </ListItemIcon>
                                  İş Tanımla
                                </MenuItem>
                              </CustomTooltip>
                              <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "İhaleye ek dosyalar ekle" : ""}>
                                <MenuItem onClick={handleClickOpenAttachModal}>
                                  <ListItemIcon>
                                    <IconPaperclip size={18} />
                                  </ListItemIcon>
                                  Ek Dosya Ekle
                                </MenuItem>
                              </CustomTooltip>
                            </>
                          )}

                          {hasEditPermission && selectedRowForMenu?.recordStatus === 0 ? (
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
                          {hasEditPermission && (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu ihaleyi düzenle" : ""}>
                              <MenuItem onClick={handleEditClick}>
                                <ListItemIcon>
                                  <IconEdit width={18} />
                                </ListItemIcon>
                                Düzenlemek
                              </MenuItem>
                            </CustomTooltip>

                          )}
                          {hasDeletePermission && (
                            <CustomTooltip placement="left"
                              title={isTooltipGloballyEnabled ? "Bu ihaleyi sil" : ""}>
                              <MenuItem onClick={handleClickOpenDeleteModal}>
                                <ListItemIcon>
                                  <IconTrash width={18} />
                                </ListItemIcon>
                                Silmek
                              </MenuItem>
                            </CustomTooltip>
                          )}
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