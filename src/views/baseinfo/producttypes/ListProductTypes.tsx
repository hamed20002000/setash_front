// ListProductTypes.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,

    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Radio, RadioGroup, FormControlLabel, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteProductTypes from './DeleteProductType';
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
// import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
    // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
    fontSize: '0.8rem', // Varsayılan olarak küçük font
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem', // Masaüstünde daha büyük
    },
}));


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

interface ProductTypesType {
    id: number;
    name: string;
    createAt: string;
    recordStatus?: number;
    status: string;
    type: number;
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

const MOCK_UNITS: ProductTypesType[] = [];
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
const getComparator = <Key extends keyof ProductTypesType>(
    order: 'asc' | 'desc',
    orderBy: Key,
): (a: ProductTypesType, b: ProductTypesType) => number => {
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
const ListProductTypes = () => {
    const navigate = useNavigate();
    const [name, setName] = useState<string>('');
    const [productType, setProductType] = useState<number>(0);
    const [ProductTypesList, setProductTypesList] = useState<ProductTypesType[]>(MOCK_UNITS);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [originalName, setOriginalName] = useState<string>('');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ProductTypesType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [ProductTypesIdToDelete, setProductTypesIdToDelete] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const { isTooltipGloballyEnabled } = useTooltip();
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<keyof ProductTypesType>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const ProductTypesNameInputRef = useRef<HTMLInputElement>(null);
    const [nameError, setNameError] = useState<boolean>(false);
    const [nameHelperText, setNameHelperText] = useState<string>('');
    const [openDownloadModal, setOpenDownloadModal] = useState(false);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    // const { allowedOperations } = useAuth();
    // const hasCreatePermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
    // }, [allowedOperations]);

    // const hasEditPermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
    // }, [allowedOperations]);

    // const hasDeletePermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'Silmek');
    // }, [allowedOperations]);

    // const hasDownloadPermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
    // }, [allowedOperations]);


    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            // اگر خود آیتم تطبیق داشت
            if (item.href === path) return item;

            // اگر آیتم فرزند داشت، داخل فرزندان جستجو کن
            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    // ۲. استفاده از تابع برای پیدا کردن منوی فعلی
    const currentMenu = useMemo(() => {
        debugger
        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    // ۳. استخراج ID عملیات‌ها (با اطمینان از وجود id)
    const currentMenuOpIds = useMemo(() => {
        // اگر منو یا عملیات‌های آن وجود نداشت، آرایه خالی برگردان
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            // با توجه به دیتای API شما، ID اصلی عملیات در این سطح است
            return String(op.id);
        });
    }, [currentMenu]);

    // ۴. تابع نهایی بررسی دسترسی
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


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ProductTypesType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setProductTypesIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setProductTypesIdToDelete(null);
        getListProductTypes();
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


    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setName(selectedRowForMenu.name);
            setOriginalName(selectedRowForMenu.name);
            setEditingId(selectedRowForMenu.id);
            setProductType(selectedRowForMenu.type);
            setNameError(false);
            setNameHelperText('');
            setTimeout(() => {
                ProductTypesNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ProductTypesNameInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
        setIsFormVisible(true);
        clearAlert();
    };
    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
        setNameError(false);
        setNameHelperText('');
    };
    const insertProductTypes = async () => {
        if (!name.trim()) {
            setNameError(true);
            setNameHelperText('İsim boş olamaz!');
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        const isNameDuplicate = ProductTypesList.some(
            (type) => type.name.trim().toLowerCase() === name.trim().toLowerCase() && type.type === productType
        );

        if (isNameDuplicate) {
            setNameError(true);
            setNameHelperText('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.');
            showAlert('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.', 'warning');
            return;
        }
        setNameError(false);
        setNameHelperText('');
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        setLoadingButton(true);
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-product-type",
                { name: name, type: productType },
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni ürün türü başarıyla eklendi!', 'success');
                resetFormAndState();
                getListProductTypes();
            } else {
                showAlert(response.data.message || 'Yeni ürün türü eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'Ürün türü eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const editProductTypes = async () => {
        if (editingId === null) return;
        if (!name.trim()) {
            setNameError(true);
            setNameHelperText('İsim boş olamaz!');
            showAlert('İsim boş olamaz!', 'warning');
            return;
        }
        const isNameDuplicate = ProductTypesList.some(
            (type) => type.name.trim().toLowerCase() === name.trim().toLowerCase() && type.id !== editingId && type.type === productType
        );

        if (isNameDuplicate) {
            setNameError(true);
            setNameHelperText('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.');
            showAlert('Bu isimde bir tür zaten var. Lütfen farklı bir ad girin.', 'warning');
            return;
        }
        setNameError(false);
        setNameHelperText('');
        clearAlert();
        const currentProductType = ProductTypesList.find(pt => pt.id === editingId)?.type;
        if (name === originalName && productType === currentProductType) {
            showAlert('İsim ve tipte herhangi bir değişiklik yapmadınız.', 'info');
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
                server.baseurl + server.initialoperations + "update-product-type",
                { id: Number(editingId), name: name, type: productType },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Ürün türü başarıyla güncellendi!', 'success');
                setProductTypesList(prevList =>
                    prevList.map(op => (op.id === editingId ? { ...op, name: name, type: productType } : op))
                );
                resetFormAndState();
                getListProductTypes();
            } else {
                showAlert(response.data.message || 'Ürün türü güncellenirken bir hata oluştu.', 'error');
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
                showAlert(e.response?.data?.message || 'Ürün türü güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

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
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-product-type",
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
                showAlert(`Ürün türü başarıyla ${statusText} olarak ayarlandı!`, 'success');
                getListProductTypes();
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
        setProductType(0);
        setNameError(false);
        setNameHelperText('');
        setIsFormVisible(false);
    };

    function getListProductTypes() {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        axios.request({
            baseURL: server.baseurl + server.initialoperations + "get-product-types",
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
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    type: item.type,
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                }));
                setProductTypesList(formattedData as ProductTypesType[]);
                setLoadingData(false);
            } else {
                showAlert(result.data.message || 'Ürün türleri listesi alınamadı.', 'error');
                setLoadingData(false);
            }
        }).catch((e) => {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Ürün türleri listesi alınırken bir hata oluştu.', 'error');
            }
            setLoadingData(false);
        });
    }
    useEffect(() => {
        getListProductTypes();
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

    const handleRequestSort = (property: keyof ProductTypesType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };


    // const handleDownloadAllProductTypesPDF = () => {
    //     if (!sortedAndFilteredProductTypes || sortedAndFilteredProductTypes.length === 0) {
    //         showAlert('PDF oluşturulacak ürün tipi bulunamadı.', 'warning');
    //         return;
    //     }

    //     const doc = new jsPDF();
    //     const pageWidth = doc.internal.pageSize.getWidth();
    //     const pageHeight = doc.internal.pageSize.getHeight();

    //     try {
    //         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    //         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    //         doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
    //         doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
    //         doc.addFileToVFS('Arial.ttf', ArialFont);
    //         doc.addFont('Arial.ttf', 'Arial', 'normal');

    //         const rows = sortedAndFilteredProductTypes.map(type => [
    //             type.name,
    //             type.type === 0 ? 'Trafo' : type.type === 1 ? 'Direk (Beton)' : 'Direk (Demir)',
    //             formatDateDisplay(type.createAt),
    //             type.status
    //         ]);

    //         autoTable(doc, {
    //             startY: 65,
    //             head: [['İsim', 'Tür', 'Oluşturulma Tarihi', 'Durum']],
    //             body: rows,
    //             theme: 'grid',
    //             styles: {
    //                 font: 'Arial',
    //                 fontStyle: 'normal',
    //                 fontSize: 8,
    //                 cellPadding: 2,
    //                 overflow: 'linebreak'
    //             },
    //             headStyles: {
    //                 fillColor: [242, 242, 242],
    //                 textColor: [0, 0, 0],
    //                 font: 'Arial',
    //                 fontSize: 9,
    //             },
    //             didDrawPage: () => {
    //                 const docAny = doc as any;
    //                 // --- Header Section ---
    //                 doc.setFont('Arial', 'bold');
    //                 doc.setFontSize(14);
    //                 doc.text('Tüm Ürün Tipleri Raporu', pageWidth / 2, 15, { align: 'center' });
    //                 doc.setFontSize(10);
    //                 doc.setFont('Times', 'bold');
    //                 doc.text(`Tarih:`, 15, 25);
    //                 doc.setFont('Times', 'normal');
    //                 doc.text(`${formatDateDisplay(new Date().toISOString())}`, 30, 25);
    //                 doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

    //                 // --- Footer Section ---
    //                 doc.setFont('NotoSans', 'normal');
    //                 doc.setFontSize(8);
    //                 doc.setTextColor(0);
    //                 const companyInfo = [
    //                     'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
    //                     'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
    //                     'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
    //                 ];
    //                 let footerY = pageHeight - 30;
    //                 companyInfo.forEach(line => {
    //                     doc.text(line, pageWidth / 2, footerY, { align: 'center' });
    //                     footerY += 4;
    //                 });
    //                 const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
    //                 const pageCount = docAny.internal.getNumberOfPages();
    //                 doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    //                 doc.setFont('NotoSans', 'normal');
    //                 doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    //                 doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    //             },
    //             showHead: 'everyPage',
    //             margin: { top: 50, bottom: 45 },
    //         });

    //         doc.save('Tüm_Urun_Tipleri_Raporu.pdf');
    //         showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    //     } catch (error: any) {
    //         console.error('PDF oluşturulurken hata:', error);
    //         showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
    //     }
    // };


    const handleDownloadAllProductTypesPDF = () => {
        if (!sortedAndFilteredProductTypes || sortedAndFilteredProductTypes.length === 0) {
            showAlert('PDF oluşturulacak ürün tipi bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const reportTitle = 'Tüm Ürün Tipleri Raporu';

        try {
            // ۱. بارگذاری فونت‌ها
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
            doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
            doc.setFont('NotoSans');

            // ۲. تعریف تابع هدر استاندارد
            const addPdfHeader = (pdfDoc: jsPDF, title: string) => {
                try {
                    pdfDoc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);
                } catch (e) {
                    console.error("Logo yüklenemedi", e);
                }
                pdfDoc.setFont('NotoSans', 'normal');
                pdfDoc.setFontSize(14);
                pdfDoc.setTextColor(0);
                pdfDoc.text(title, pageWidth / 2, 25, { align: 'center' });

                pdfDoc.setFontSize(10);
                pdfDoc.setFont('NotoSans', 'bold');
                pdfDoc.text(`Rapor Tarihi:`, 15, 40);
                pdfDoc.setFont('NotoSans', 'normal');
                pdfDoc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

                // خط جداکننده خاکستری زیر هدر
                // pdfDoc.setDrawColor(200, 200, 200);
                pdfDoc.setLineWidth(0.5);
                pdfDoc.line(15, 45, pageWidth - 15, 45);
            };

            // ۳. تعریف تابع فوتر با اطلاعات SETAŞ
            const addPdfFooter = (pdfDoc: jsPDF) => {
                pdfDoc.setFontSize(8);
                pdfDoc.setFont('NotoSans', 'normal');
                pdfDoc.setTextColor(100);

                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
                    'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
                ];

                let footerY = pageHeight - 20;
                companyInfo.forEach(line => {
                    pdfDoc.text(line, pageWidth / 2, footerY, { align: 'center' });
                    footerY += 4;
                });

                // بخش امضا و شماره صفحه
                pdfDoc.setTextColor(0);
                pdfDoc.setFontSize(10);
                pdfDoc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
                pdfDoc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

                const pageNumber = (pdfDoc as any).internal.getCurrentPageInfo().pageNumber;
                const pageCount = (pdfDoc as any).internal.getNumberOfPages();
                pdfDoc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            };

            // ۴. آماده‌سازی داده‌ها
            const rows = sortedAndFilteredProductTypes.map(type => [
                type.name,
                type.type === 0 ? 'Trafo' : type.type === 1 ? 'Direk (Beton)' : 'Direk (Demir)',
                formatDateDisplay(type.createAt),
                type.status
            ]);

            // ۵. رسم جدول با تم رنگی [66, 66, 66]
            autoTable(doc, {
                startY: 55,
                head: [['İsim', 'Tür', 'Oluşturulma Tarihi', 'Durum']],
                body: rows,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontSize: 9,
                    cellPadding: 3,
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [66, 66, 66], // خاکستری تیره مشابه دکمه‌های نقشه
                    textColor: [255, 255, 255],
                    fontStyle: 'normal',
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { halign: 'left', cellWidth: 40 },
                    2: { halign: 'left', cellWidth: 45 },
                    3: { halign: 'left', cellWidth: 30 }
                },
                margin: { top: 55, bottom: 30 },
                didDrawPage: () => {
                    addPdfHeader(doc, reportTitle);
                    addPdfFooter(doc);
                }
            });

            doc.save(`Tum_Urun_Tipleri_Raporu.pdf`);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (error: any) {
            console.error('PDF error:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const addCompanyInfo = (worksheet: Excel.Worksheet) => {
        worksheet.addRow([]);
        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
        ];
        companyInfo.forEach(line => {
            worksheet.addRow([line]);
            const lastRow = worksheet.lastRow;
            if (lastRow) {
                lastRow.getCell(1).alignment = { horizontal: 'center' };
                lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
            }
        });
    };
    const handleExportExcel = async () => {
        setOpenDownloadModal(false);
        if (!sortedAndFilteredProductTypes || sortedAndFilteredProductTypes.length === 0) {
            showAlert('Dışa aktarılacak ürün türü bulunamadı.', 'warning');
            return;
        }

        showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Ürün Tipleri Raporu', {
                views: [{ rightToLeft: false }]
            });

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

            worksheet.addRow(['', '', '']);
            const titleRow = worksheet.addRow(['Tüm Ürün Tipleri Raporu']);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells('A2:D2');

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) {
                dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
                dateRow.getCell(1).alignment = { horizontal: 'left' };
            }
            worksheet.addRow([]);

            const tableHeaders = ['İsim', 'Tür', 'Oluşturulma Tarihi', 'Durum'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            sortedAndFilteredProductTypes.forEach(type => {
                const row = worksheet.addRow([
                    type.name,
                    type.type === 0 ? 'Trafo' : type.type === 1 ? 'Direk (Beton)' : 'Direk (Demir)',
                    formatDateDisplay(type.createAt),
                    type.status
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

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
            addCompanyInfo(worksheet);
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Tüm_Urun_Tipleri_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    };


    const filteredProductTypes = ProductTypesList.filter(ProductTypes => {
        const matchesSearch = ProductTypes.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && ProductTypes.recordStatus === 0) ||
            (statusFilter === 'inactive' && ProductTypes.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });
    const sortedAndFilteredProductTypes = stableSort(filteredProductTypes, getComparator(order, orderBy));
    const paginatedProductTypes = sortedAndFilteredProductTypes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <>
            <div style={{
                borderBottom: "1px solid",
                margin: "10px 0 30px 0",
                padding: "10px 15px 30px 15px"
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>

                    <Typography variant="h5" mb={2}>{editingId ? 'Direk veya Trafo Düzenle' : 'Yeni Direk veya Trafo Kaydı'}</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Direk veya Trafo Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni Direk veya Trafo Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    disabled={loadingButton}
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
                            <CustomFormLabel htmlFor="ProductTypes-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                                İsim
                            </CustomFormLabel>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <CustomTextField
                                id="ProductTypes-name"
                                placeholder="Direk veya Trafo ismi"
                                fullWidth
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setName(e.target.value);
                                    if (nameError && e.target.value.trim()) {
                                        setNameError(false);
                                        setNameHelperText('');
                                    }
                                }}
                                inputRef={ProductTypesNameInputRef}
                                error={nameError}
                                helperText={nameHelperText}
                            />
                        </Grid>
                        <Grid item xs={12} sm={5} display="flex" alignItems="center" justifyContent="center">
                            <CustomFormLabel htmlFor="product-type-radio-group" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                                Tür
                            </CustomFormLabel>
                            <RadioGroup
                                aria-labelledby="product-type-radio-group"
                                name="product-type-group"
                                value={String(productType)}
                                onChange={(e) => setProductType(parseInt(e.target.value))}
                                row
                                style={{ marginLeft: "10px" }}
                            >
                                <FormControlLabel value="0" control={<Radio />} label="Trafo" />
                                <FormControlLabel value="1" control={<Radio />} label="Direk (Beton)" />
                                <FormControlLabel value="2" control={<Radio />} label="Direk (Demir)" />
                            </RadioGroup>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {editingId !== null ? (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili Direki güncelleyin" : ""}>
                                            <Button
                                                variant="contained"
                                                color="info"
                                                onClick={editProductTypes}
                                                disabled={loadingButton}
                                            >
                                                {loadingButton ? <>
                                                    <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                                                </> : 'Düzenle'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Direk moduna dön" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                                İptal Et
                                            </Button>
                                        </CustomTooltip>
                                    </>
                                ) : (
                                    <>
                                        {hasCreatePermission && (
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Direk ekle" : ""}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={insertProductTypes}
                                                    disabled={loadingButton}
                                                >
                                                    {loadingButton ? <>
                                                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                                                    </> : 'Yeni Direk Ekle'}
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
                            <TextField
                                label="Direk veya Trafo Ara"
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
                                    aria-label="all ProductTypes"
                                >
                                    Tümü
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="active"
                                    aria-label="active ProductTypes"
                                >
                                    Aktif
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="inactive"
                                    aria-label="inactive ProductTypes"
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
                            <Typography variant="h6" sx={{ ml: 2 }}>Ürün Tipleri yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="ProductTypes table">
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
                                            active={orderBy === 'type'}
                                            direction={orderBy === 'type' ? order : 'asc'}
                                            onClick={() => handleRequestSort('type')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Tür</Typography>
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
                                {paginatedProductTypes.length > 0 ? (
                                    paginatedProductTypes.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.name}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">
                                                    {row.type === 0 ? 'Trafo' : row.type === 1 ? 'Direk (Beton)' : 'Direk (Demir)'}
                                                </Typography>
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
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ürün tipini pasif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon>
                                                                    <DoNotDisturbOnRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Pasif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ürün tipini aktif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetActive}>
                                                                <ListItemIcon>
                                                                    <DoneRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Aktif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ürün tipini düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}>
                                                                <ListItemIcon>
                                                                    <IconEdit width={18} />
                                                                </ListItemIcon>
                                                                Düzenlemek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu ürün tipini sil" : ""}>
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
                                        <StyledTableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç ürün tipi bulunamadı.
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
                    count={sortedAndFilteredProductTypes.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına satır sayısı:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard >

            <DeleteProductTypes
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                ProductTypesIdToDelete={ProductTypesIdToDelete}
                onDeleteSuccess={getListProductTypes}
                showAlert={showAlert}
            />

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
                            onClick={handleDownloadAllProductTypesPDF}
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

export default ListProductTypes;