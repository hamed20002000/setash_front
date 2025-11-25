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
// فرض بر این است که کامپوننت DeletePosition وجود دارد
import DeletePosition from './DeletePosition';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import { useAuth } from 'src/context/AuthContext';
// واردات برای گزارش‌گیری
import jsPDF from 'jspdf';
// @ts-ignore
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
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));



interface PositionType {
    id: number;
    title: string;
    createAt: string;
    recordStatus?: number; // 0 = Aktif, 1 = Pasif, 2 = Silindi
    status: string; // وضعیت متنی
}

const MOCK_POSITIONS: PositionType[] = [];

// توابع مرتب‌سازی بدون تغییر باقی می‌مانند
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

const getComparator = <Key extends keyof PositionType>(
    order: 'asc' | 'desc',
    orderBy: Key,
): (a: PositionType, b: PositionType) => number => {
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


const ListPosition = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState<string>('');
    const [positionsList, setPositionsList] = useState<PositionType[]>(MOCK_POSITIONS);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [originalTitle, setOriginalTitle] = useState<string>('');

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<PositionType | null>(null);

    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [positionIdToDelete, setPositionIdToDelete] = useState<number | null>(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    const [loadingButton, setLoadingButton] = useState<boolean>(false);

    const { isTooltipGloballyEnabled } = useTooltip();

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [orderBy, setOrderBy] = useState<keyof PositionType>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const positionTitleInputRef = useRef<HTMLInputElement>(null);

    const [titleError, setTitleError] = useState<boolean>(false);
    const [titleHelperText, setTitleHelperText] = useState<string>('');
    const [openDownloadModal, setOpenDownloadModal] = useState(false);


    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);


    const [loadingData, setLoadingData] = useState<boolean>(true);

    const { allowedOperations } = useAuth();
    // مجوزها بر اساس نام عملیات در بک‌اند
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

    // توابع کمکی منو و هشدارها
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: PositionType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setPositionIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setPositionIdToDelete(null);
        getListPositions(); // رفرش لیست بعد از حذف
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
                positionTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                positionTitleInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
        clearAlert();
        setIsFormVisible(true);
    };

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
        setTitleError(false);
        setTitleHelperText('');
    };

    const insertPosition = async () => {
        if (!title.trim()) {
            setTitleError(true);
            setTitleHelperText('İsim boş olamaz!');
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        setTitleError(false);
        setTitleHelperText('');
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
                server.baseurl + server.hr + "create-position", // **API جدید**
                { title: title },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni سمت başarıyla eklendi!', 'success');
                resetFormAndState();
                getListPositions();
            } else {
                showAlert(response.data.message || 'Yeni سمت eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const editPosition = async () => {
        if (editingId === null) return;
        if (Number(editingId) === 1 || Number(editingId) === 2) {
            showAlert('Bu pozisyonların adı (Şantiye Çalışanı & Şefi) değiştirilemez.', 'error');
            resetFormAndState();
            return;
        }
        if (!title.trim()) {
            setTitleError(true);
            setTitleHelperText('İsim boş olamaz!');
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        setTitleError(false);
        setTitleHelperText('');
        clearAlert();

        if (title === originalTitle) {
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
                server.baseurl + server.hr + "update-position",
                { id: Number(editingId), title: title },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Pozisyon başarıyla güncellendi!', 'success');
                setPositionsList(prevList =>
                    prevList.map(op => (op.id === editingId ? { ...op, title: title } : op))
                );
                resetFormAndState();
                getListPositions();
            } else {
                showAlert(response.data.message || 'Pozisyon güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {

                console.log("Error inserting position:", e);
                showAlert(e.response?.data?.message == "The Position already exists!" ? "Bu pozisyon daha önce kaydedilmiştir." : 'Yeni eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

            }
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

        if (Number(id) === 1 || Number(id) === 2) {
            debugger
            showAlert('Bu pozisyonlar (Şantiye Çalışanı & Şefi) sistem kaydı olduğu için durumu değiştirilemez.', 'error');
            handleCloseMenu(); // منو را ببندید
            return; // جلوگیری از اجرای درخواست API
        }
        try {
            const response = await axios.put(
                server.baseurl + server.hr + "update-position", // **API جدید**
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
                showAlert(`Pozisyon başarıyla ${statusText} olarak ayarlandı!`, 'success');
                getListPositions();
                resetFormAndState();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
        setTitle('');
        setEditingId(null);
        setOriginalTitle('');
        setTitleError(false);
        setTitleHelperText('');
        setIsFormVisible(false);
    };

    function getListPositions() {
        const authToken = localStorage.getItem('authToken');

        setLoadingData(true);
        if (!authToken) {
            console.warn("No auth token found, redirecting to login.");
            navigate("/");
            setLoadingData(false);
            return;
        }

        axios.request({
            baseURL: server.baseurl + server.hr + "get-all-positions", // **API جدید**
            method: "get",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                debugger
                const formattedData = result.data.data.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                }));
                setPositionsList(formattedData as PositionType[]);
                setLoadingData(false);
            } else {
                showAlert(result.data.message || 'Pozisyon listesi alınırken bir hata oluştu.', 'error');
            }
        }).catch((e) => {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Error fetching positions list:", e);
                showAlert('Pozisyon listesi alınırken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        });
    }

    useEffect(() => {
        getListPositions();
    }, []);


    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    // توابع فیلترینگ و مرتب‌سازی
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

    const handleRequestSort = (property: keyof PositionType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredPositions = positionsList.filter(position => {
        const matchesSearch = position.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && position.recordStatus === 0) ||
            (statusFilter === 'inactive' && position.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });

    const sortedAndFilteredPositions = stableSort(filteredPositions, getComparator(order, orderBy));

    const paginatedPositions = sortedAndFilteredPositions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const handleDownloadAllPositionsPDF = () => {
        if (!sortedAndFilteredPositions || sortedAndFilteredPositions.length === 0) {
            showAlert('PDF oluşturulacak pozisyon bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try {
            // ... (تنظیمات فونت و ... بدون تغییر)
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
            doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
            doc.addFileToVFS('Arial.ttf', ArialFont);
            doc.addFont('Arial.ttf', 'Arial', 'normal');
            doc.setFont('Arial');

            const rows = sortedAndFilteredPositions.map(position => [
                position.title,
                formatDateDisplay(position.createAt),
                position.status,
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
                    doc.setFont('Arial', 'bold');
                    doc.setFontSize(14);
                    // تغییر عنوان
                    doc.text('Tüm Pozisyon Raporu', pageWidth / 2, 15, { align: 'center' });
                    doc.setFontSize(10);
                    doc.setFont('Times', 'bold');
                    doc.text(`Rapor Tarih:`, 15, 25);
                    doc.setFont('Times', 'normal');
                    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 30, 25);
                    doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

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

            // تغییر نام فایل
            doc.save('Tüm_Pozisyon_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };


    const handleExportExcel = async () => {
        setOpenDownloadModal(false);
        if (!sortedAndFilteredPositions || sortedAndFilteredPositions.length === 0) {
            showAlert('Dışa aktarılacak pozisyon bulunamadı.', 'warning');
            return;
        }

        showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            // تغییر نام شیت
            const worksheet = workbook.addWorksheet('Pozisyon Raporu', { views: [{ rightToLeft: false }] });

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
                ws.addRow([]);
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
                        ws.mergeCells(`A${lastRow.number}:C${lastRow.number}`);
                    }
                });
            };

            worksheet.addRow(['', '', '']);
            // تغییر عنوان
            const titleRow = worksheet.addRow(['Tüm Pozisyon Raporu']);
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

            const tableHeaders = ['İsim', 'Oluşturulma Tarihi', 'Durum'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            sortedAndFilteredPositions.forEach(position => {
                const row = worksheet.addRow([
                    position.title,
                    formatDateDisplay(position.createAt),
                    position.status
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

            addCompanyInfo(worksheet);

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

            const buffer = await workbook.xlsx.writeBuffer();
            // تغییر نام فایل
            const fileName = `Tüm_Pozisyon_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
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

                    {/* تغییر متن عنوان */}
                    <Typography variant="h5" mb={2}>{editingId ? 'Pozisyon Düzenle' : 'Yeni Pozisyon Kaydı'}</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Pozisyon kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni Pozisyon Kaydet
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
                            <CustomFormLabel htmlFor="position-title"
                                sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                                İsim
                            </CustomFormLabel>
                        </Grid>
                        <Grid item xs={12} sm={7}>
                            <CustomTextField
                                id="position-title"
                                placeholder="Pozisyon Adı"
                                sx={{ width: '100%' }}
                                size="small"
                                value={title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setTitle(e.target.value);
                                    if (titleError && e.target.value.trim()) {
                                        setTitleError(false);
                                        setTitleHelperText('');
                                    }
                                }}
                                inputRef={positionTitleInputRef}
                                error={titleError}
                                helperText={titleHelperText}
                            />
                        </Grid>
                        <Grid item xs={12} sm={1}></Grid>
                        <Grid item xs={12} sm={3}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {editingId !== null ? (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili Pozisyonu güncelleyin" : ""}>
                                            <Button
                                                variant="contained"
                                                color="info"
                                                onClick={editPosition}
                                                disabled={loadingButton}
                                            >
                                                {loadingButton ? <>
                                                    <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                                </> : 'Düzenlemek'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Pozisyon moduna dön" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                                İptal Et
                                            </Button>
                                        </CustomTooltip>
                                    </>
                                ) : (

                                    <>
                                        {hasCreatePermission && (
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Pozisyon ekle" : ""}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={insertPosition}
                                                    disabled={loadingButton}
                                                >
                                                    {loadingButton ? <>
                                                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                                    </> : 'Yeni Pozisyon Ekle'}
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
                                        onClick={() => setOpenDownloadModal(true)}
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
                            {/* تغییر لیبل جستجو */}
                            <TextField
                                label="Pozisyon Ara"
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
                                    aria-label="all positions"
                                >
                                    Tümü
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="active"
                                    aria-label="active positions"
                                >
                                    Aktif
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="inactive"
                                    aria-label="inactive positions"
                                >
                                    Pasif
                                </StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    <Table aria-label="position table">
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === 'title'}
                                        direction={orderBy === 'title' ? order : 'asc'}
                                        onClick={() => handleRequestSort('title')}
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
                                        {/* تغییر متن بارگذاری */}
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Pozisyonlar yükleniyor...
                                        </Typography>
                                    </StyledTableCell>
                                </TableRow>
                            ) : paginatedPositions.length > 0 ? (
                                paginatedPositions.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>
                                            <Typography variant="body1">{row.title}</Typography>
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
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Pozisyonu pasif yap" : ""}>
                                                        <MuiMenuItem onClick={handleSetInactive}>
                                                            <ListItemIcon>
                                                                <DoNotDisturbOnRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Pasif Yap
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Pozisyonu aktif yap" : ""}>
                                                        <MuiMenuItem onClick={handleSetActive}>
                                                            <ListItemIcon>
                                                                <DoneRoundedIcon width={18} />
                                                            </ListItemIcon>
                                                            Aktif Yap
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Pozisyonu düzenle" : ""}>
                                                        <MuiMenuItem onClick={handleEditClick}>
                                                            <ListItemIcon>
                                                                <IconEdit width={18} />
                                                            </ListItemIcon>
                                                            Düzenlemek
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {(Number(selectedRowForMenu?.id) !== 1 && Number(selectedRowForMenu?.id) !== 2) && hasDeletePermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Pozisyonu sil" : ""}>
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
                                        {/* تغییر متن پیدا نشدن */}
                                        <Typography variant="subtitle1" color="textSecondary">
                                            Hiç Pozisyon bulunamadı.
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
                    count={sortedAndFilteredPositions.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            {/* ************************************** */}
            {/* ** تغییر: فراخوانی DeletePosition ** */}
            {/* ************************************** */}
            <DeletePosition
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                positionIdToDelete={positionIdToDelete} // تغییر نام props
                onDeleteSuccess={getListPositions}
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
                            onClick={handleDownloadAllPositionsPDF}
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

export default ListPosition;