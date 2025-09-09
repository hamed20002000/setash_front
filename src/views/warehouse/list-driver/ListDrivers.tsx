import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Chip,
    useMediaQuery,
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { keyframes, styled, useTheme } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconPlus, IconFileDownload, IconFileText, IconX } from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { RadioGroup, FormControlLabel, Radio } from '@mui/material';
import DeleteDriver from "./DeleteDriver";
import CarDetailsModal from "./CarDetailsModal";
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

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


const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)(({ }) => ({
    animation: `${blinkAnimation} 1s linear infinite`,
}));

interface VehicleData {
    id: number;
    name: string;
    model: number;
    plaque: string;
    recordStatus: number;
    brand?: string; // Add brand field for better reporting
}

interface DriverWithVehicles extends internal {
    driverVehicles: VehicleData[];
}

interface internal {
    id: number;
    name: string;
    family: string;
    birthdate: string;
    fatherName: string;
    identityNo: string;
    internal: string;
    recordStatus: number;
    createAt: string;
    status: string;
    driverVehicles?: VehicleData[];
}

type SortableDriverKeys = keyof Pick<internal, 'name' | 'family' | 'identityNo' | 'createAt' | 'recordStatus'>;

const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) { return (valA === undefined || valA === null) ? 0 : -1; }
    if (valA === undefined || valA === null) { return 1; }
    if (typeof valB === 'string' && typeof valA === 'string') { return valB.localeCompare(valA); }
    if (typeof valB === 'number' && typeof valA === 'number') { return valB - valA; }
    if (String(valB) < String(valA)) { return -1; }
    if (String(valB) > String(valA)) { return 1; }
    return 0;
};

const getComparator = (order: 'asc' | 'desc', orderBy: SortableDriverKeys): (a: internal, b: internal) => number => {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
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

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const ListDrivers = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));

    // Form States
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthdate, setBirthDate] = useState<Date | null>(new Date());
    const [fatherName, setFatherName] = useState('');
    const [identityNo, setNationalCode] = useState('');
    const [internal, setDriverType] = useState<string>('1');
    const [editingId, setEditingId] = useState<number | null>(null);

    // Validation States
    const [firstNameError, setFirstNameError] = useState(false);
    const [lastNameError, setLastNameError] = useState(false);
    const [birthDateError, setBirthDateError] = useState(false);
    const [fatherNameError, setFatherNameError] = useState(false);
    const [nationalCodeError, setNationalCodeError] = useState(false);

    // Data and UI States
    const [driversList, setDriversList] = useState<internal[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Table States
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableDriverKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<internal | null>(null);

    // Dialog/Modal States
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState<internal | null>(null);
    const { isTooltipGloballyEnabled } = useTooltip();
    const firstNameInputRef = useRef<HTMLInputElement>(null);

    const [openCarDetailsModal, setOpenCarDetailsModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<internal | null>(null);


    const [isFilterActive, setIsFilterActive] = useState(false);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

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
        return () => { clearTimeout(timer); };
    }, [alertMessage]);

    const fetchDrivers = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-drivers", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const allDrivers = response.data.data as internal[];
                const driversWithStatus = allDrivers.map((item) => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    internal: item.internal ? '1' : '0'
                }));
                setDriversList(driversWithStatus);
            } else {
                showAlert(response.data.message || 'Sürücüler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Sürücüler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDrivers();
    }, [fetchDrivers]);


    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    const resetFormAndState = () => {
        setFirstName('');
        setLastName('');
        setBirthDate(new Date());
        setFatherName('');
        setNationalCode('');
        setDriverType('1');
        setEditingId(null);
        setFirstNameError(false);
        setLastNameError(false);
        setBirthDateError(false);
        setFatherNameError(false);
        setNationalCodeError(false);
    };

    const validateForm = (): boolean => {
        let isValid = true;
        if (!firstName.trim()) { setFirstNameError(true); isValid = false; } else { setFirstNameError(false); }
        if (!lastName.trim()) { setLastNameError(true); isValid = false; } else { setLastNameError(false); }
        if (!birthdate) { setBirthDateError(true); isValid = false; } else { setBirthDateError(false); }
        if (!fatherName.trim()) { setFatherNameError(true); isValid = false; } else { setFatherNameError(false); }
        if (!identityNo.trim()) { setNationalCodeError(true); isValid = false; } else { setNationalCodeError(false); }

        if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return isValid;
    };


    const insertDriver = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        const payload = {
            name: firstName,
            family: lastName,
            birthdate: birthdate ? birthdate.toISOString() : null,
            fatherName,
            identityNo,
            internal: internal == "0" ? false : true
        };
        try {
            const response = await axios.post(
                server.baseurl + server.warehouse + "create-driver",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        'Content-Type': 'application/json',
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert(`Sürücü başarıyla eklendi!`, 'success');
                resetFormAndState();
                fetchDrivers();
            } else {
                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'İşlem sırasında bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const editDriver = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        const payload = {
            id: Number(editingId),
            name: firstName,
            family: lastName,
            birthdate: birthdate ? birthdate.toISOString() : null,
            fatherName,
            identityNo,
            internal: internal == "0" ? false : true
        };
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-driver",
                payload,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Direk başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchDrivers();
            } else {
                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    }

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: internal) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setFirstName(selectedRowForMenu.name);
            setLastName(selectedRowForMenu.family);
            setBirthDate(selectedRowForMenu.birthdate ? new Date(selectedRowForMenu.birthdate) : null);
            setFatherName(selectedRowForMenu.fatherName);
            setNationalCode(selectedRowForMenu.identityNo);
            setDriverType(selectedRowForMenu.internal);
            setEditingId(selectedRowForMenu.id);
            setTimeout(() => {
                firstNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstNameInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setDriverToDelete(selectedRowForMenu);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setDriverToDelete(null);
        fetchDrivers();
    };

    const handleClickOpenCarDetailsModal = (driver: internal) => {
        setSelectedDriver(driver);
        setOpenCarDetailsModal(true);
    };

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-driver",
                { id: Number(id), recordStatus: statusValue },
                { headers: { "Authorization": `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Sürücü başarıyla ${statusText} olarak ayarlandı!`, 'success');
                fetchDrivers();
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
    const handleSetActive = () => { if (selectedRowForMenu) sendStatusUpdate(selectedRowForMenu.id, 0); };
    const handleSetInactive = () => { if (selectedRowForMenu) sendStatusUpdate(selectedRowForMenu.id, 1); };

    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => {
        if (newFilter !== null) {
            setStatusFilter(newFilter);
            setPage(0);
        }
    };
    const handleRequestSort = (property: SortableDriverKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredDrivers = useMemo(() => {
        return driversList.filter(d => {
            // فیلتر بر اساس جستجو و وضعیت
            const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.family.toLowerCase().includes(searchTerm.toLowerCase()) || d.identityNo.includes(searchTerm);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && d.recordStatus === 0) ||
                (statusFilter === 'inactive' && d.recordStatus === 1);

            // ** اضافه کردن فیلتر بر اساس تاریخ تولد **
            const birthdate = new Date(d.birthdate);
            const matchesDate =
                (!startDate || birthdate >= startDate) &&
                (!endDate || birthdate <= endDate);

            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [driversList, searchTerm, statusFilter, startDate, endDate]);

    const sortedAndFilteredDrivers = useMemo(() => {
        return stableSort(filteredDrivers, getComparator(order, orderBy));
    }, [filteredDrivers, order, orderBy]);

    const paginatedDrivers = sortedAndFilteredDrivers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const handleDownloadAllDriversPDF = async () => {
        if (!driversList || driversList.length === 0) {
            showAlert('PDF oluşturulacak sürücü bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {

            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Tüm Sürücüler Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
        };

        const footer = () => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 15, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            doc.line(pageWidth - 65, doc.internal.pageSize.getHeight() - 15, pageWidth - 15, doc.internal.pageSize.getHeight() - 15);
            const docAny = doc as any;
            const pageCount = docAny.internal.getNumberOfPages();
            doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, doc.internal.pageSize.getHeight() - 10);
        };

        const rows = driversList.map(driver => [
            `${driver.name} ${driver.family}`,
            formatDateDisplay(driver.birthdate),
            driver.fatherName,
            driver.identityNo,
            driver.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı',
            driver.recordStatus === 0 ? 'Aktif' : 'Pasif',
        ]);

        try {
            autoTable(doc, {
                startY: 50,
                head: [['Adı Soyadı', 'Doğum Tarihi', 'Baba Adı', 'TC Kimlik No', 'Sürücü Tipi', 'Durum']],
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
                    0: { cellWidth: 35 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 'auto' },
                },
                didDrawPage: (_data) => {
                    header();
                    footer();
                },
                // ✅ اضافه شده: برای اطمینان از قرارگیری صحیح محتوا در صفحات جدید
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save('Tüm_Sürücüler_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };


    const handleDownloadFilteredAllDriversPDF = async () => {
        // از filteredDrivers که از قبل بر اساس فیلترهای UI محاسبه شده، استفاده کنید.
        if (!filteredDrivers || filteredDrivers.length === 0) {
            showAlert('PDF oluşturulacak sürücü bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // افزودن فونت NotoSans برای پشتیبانی از حروف ترکی
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Tüm Sürücüler Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12); doc.text(`Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}`, pageWidth - 15, 40, { align: 'right' });
            doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 47, { align: 'right' });
        };

        const footer = () => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 15, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
            doc.line(pageWidth - 65, doc.internal.pageSize.getHeight() - 15, pageWidth - 15, doc.internal.pageSize.getHeight() - 15);
            const docAny = doc as any;
            const pageCount = docAny.internal.getNumberOfPages();
            doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, doc.internal.pageSize.getHeight() - 10);
        };

        // ایجاد سطرها از داده‌های فیلتر شده
        const rows = filteredDrivers.map(driver => [
            `${driver.name} ${driver.family}`,
            formatDateDisplay(driver.birthdate),
            driver.fatherName,
            driver.identityNo,
            driver.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı',
            driver.recordStatus === 0 ? 'Aktif' : 'Pasif',
        ]);

        try {
            autoTable(doc, {
                startY: 50,
                head: [['Adı Soyadı', 'Doğum Tarihi', 'Baba Adı', 'TC Kimlik No', 'Sürücü Tipi', 'Durum']],
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
                    0: { cellWidth: 35 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 'auto' },
                },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save('Filtrelenmiş_Sürücüler_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleDownloadDriversWithCarsPDF = async () => {
        showAlert('Araçlı sürücü bilgileri alınıyor, lütfen bekleyin...', 'info');
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                return;
            }

            const response = await axios.get(`${server.baseurl}${server.warehouse}get-drivers-with-vehicle`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode !== 200 || !response.data.data) {
                showAlert(response.data.message || 'Araçlı sürücü verileri alınamadı.', 'error');
                return;
            }

            const driversWithCars = response.data.data;
            if (driversWithCars.length === 0) {
                showAlert('Araçlı sürücü bulunamadı.', 'warning');
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');

            // تعریف توابع هدر و فوتر به صورت مستقل برای استفاده در قلاب didDrawPage
            const header = () => {
                doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
                doc.setFontSize(18);
                doc.text('Araçlı Sürücüler Raporu', pageWidth - 15, 30, { align: 'right' });
                doc.setFontSize(12);
                doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
            };
            const footer = () => {
                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
                const docAny = doc as any;
                const pageCount = docAny.internal.getNumberOfPages();
                doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            };

            const tableBody: (string[] | { content: string; colSpan: number; styles: object }[])[] = [];

            driversWithCars.forEach((driver: DriverWithVehicles) => {
                // اضافه کردن اطلاعات راننده به عنوان یک ردیف در جدول
                tableBody.push([
                    {
                        content: `Sürücü: ${driver.name} ${driver.family} (${driver.identityNo})`,
                        colSpan: 4,
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [230, 230, 230],
                            halign: 'center'
                        }
                    }
                ]);

                // اضافه کردن اطلاعات خودروهای این راننده
                const vehicleRows = driver.driverVehicles.map(car => [
                    car.name || '-',
                    String(car.model) || '-', // تبدیل عدد به رشته
                    car.plaque || '-',
                    car.recordStatus === 0 ? 'Aktif' : 'Pasif',
                ]);
                tableBody.push(...vehicleRows);

                // اضافه کردن یک خط جداکننده برای خوانایی بهتر بین رانندگان
                if (driver !== driversWithCars[driversWithCars.length - 1]) {
                    tableBody.push([{ content: '', colSpan: 4, styles: { fillColor: [255, 255, 255], minCellHeight: 5 } }]);
                }
            });

            // فراخوانی نهایی autoTable برای رسم کل محتوا
            autoTable(doc, {
                startY: 50, // شروع محتوای جدول بعد از هدر صفحه اول
                head: [['Araç Adı', 'Model', 'Plaka', 'Durum']],
                body: tableBody,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 10,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: (_data) => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save('Araçlı_Sürücüler_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleDownloadFilteredWithCarsPDF = async () => {
        showAlert('Araçlı sürücü bilgileri alınıyor, lütfen bekleyin...', 'info');

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                return;
            }

            // قدم اول: گرفتن تمام رانندگان به همراه خودروهایشان
            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-drivers-with-vehicle`, {
                headers: { "Authorization": `Bearer ${authToken}` },
            }
            );

            if (response.data.httpStatusCode !== 200 || !response.data.data) {
                showAlert(response.data.message || 'Araçlı sürücü verileri alınamadı.', 'error');
                return;
            }

            const allDriversWithCars = response.data.data;

            // قدم دوم: اعمال فیلترها بر روی داده‌های دریافتی از سرور
            const filteredDriversWithCars = allDriversWithCars.filter((driver: DriverWithVehicles) => {
                // فیلتر بر اساس تاریخ
                const matchesDate =
                    (!startDate || new Date(driver.birthdate) >= startDate) &&
                    (!endDate || new Date(driver.birthdate) <= endDate);

                // فیلتر بر اساس جستجو و وضعیت
                const matchesSearch =
                    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.identityNo.includes(searchTerm);

                const matchesStatus =
                    statusFilter === 'all' ||
                    (statusFilter === 'active' && driver.recordStatus === 0) ||
                    (statusFilter === 'inactive' && driver.recordStatus === 1);

                return matchesDate && matchesSearch && matchesStatus;
            });

            if (filteredDriversWithCars.length === 0) {
                showAlert('Filtrelenmiş kriterlere uygun araçlı sürücü bulunamadı.', 'warning');
                return;
            }

            // بقیه کد PDF سازی با استفاده از filteredDriversWithCars
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');

            const header = () => {
                doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
                doc.setFontSize(18);
                doc.text('Araçlı Sürücüler Raporu', pageWidth - 15, 30, { align: 'right' });
                doc.setFontSize(12);
                doc.text(`Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}`, pageWidth - 15, 40, { align: 'right' });
                doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 47, { align: 'right' });
            };
            const footer = () => {
                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
                const docAny = doc as any;
                const pageCount = docAny.internal.getNumberOfPages();
                doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            };

            const tableBody: (string[] | { content: string; colSpan: number; styles: object }[])[] = [];

            filteredDriversWithCars.forEach((driver: DriverWithVehicles) => {
                tableBody.push([
                    {
                        content: `Sürücü: ${driver.name} ${driver.family} (${driver.identityNo})`,
                        colSpan: 4,
                        styles: {
                            fontStyle: 'bold',
                            fillColor: [230, 230, 230],
                            halign: 'center'
                        }
                    }
                ]);
                const vehicleRows = driver.driverVehicles.map(car => [
                    car.name || '-',
                    String(car.model) || '-',
                    car.plaque || '-',
                    car.recordStatus === 0 ? 'Aktif' : 'Pasif',
                ]);
                tableBody.push(...vehicleRows);
                if (driver !== filteredDriversWithCars[filteredDriversWithCars.length - 1]) {
                    tableBody.push([{ content: '', colSpan: 4, styles: { fillColor: [255, 255, 255], minCellHeight: 5 } }]);
                }
            });

            autoTable(doc, {
                startY: 50,
                head: [['Araç Adı', 'Model', 'Plaka', 'Durum']],
                body: tableBody,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 10,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save('Filtrelenmiş_Araçlı_Sürücüler_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };
    const handleDownloadDriverDetailsPDF = async (driver: internal) => {
        if (!driver) {
            showAlert('Sürücü verisi bulunamadı.', 'warning');
            return;
        }

        showAlert('Araç bilgileri alınıyor, lütfen bekleyin...', 'info');

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                return;
            }

            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${driver.id}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            const vehicles = response.data.data.map((item: any) => ({
                name: item.name,
                model: item.model,
                plaque: item.plaque,
                recordStatus: item.recordStatus,
            }));

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');

            // تعریف هدر و فوتر به عنوان توابع
            const header = () => {

                doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
                doc.setFontSize(18);
                doc.text('Sürücü Detay Raporu', pageWidth - 15, 35, { align: 'right' });
            };
            const footer = () => {
                doc.setFontSize(10);
                doc.setTextColor(0);
                doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
                const docAny = doc as any;
                const pageCount = docAny.internal.getNumberOfPages();
                doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            };

            // رسم هدر و اطلاعات راننده
            header();
            doc.setFontSize(12);
            doc.text(`Adı Soyadı: ${driver.name} ${driver.family}`, 15, 65);
            doc.text(`TC Kimlik No: ${driver.identityNo}`, 15, 72);
            doc.text(`Baba Adı: ${driver.fatherName}`, 15, 79);
            doc.text(`Doğum Tarihi: ${formatDateDisplay(driver.birthdate)}`, 15, 86);
            doc.text(`Sürücü Tipi: ${driver.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı'}`, 15, 93);
            doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 65, { align: 'right' });

            // رسم جدول خودروها
            autoTable(doc, {
                startY: 105,
                head: [['Araç Adı', 'Model', 'Plaka', 'Durum']],
                body: vehicles.map((car: any) => [
                    car.name || '-',
                    car.model || '-',
                    car.plaque || '-',
                    car.recordStatus === 0 ? 'Aktif' : 'Pasif',
                ]),
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 10,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                margin: { left: 15, right: 15 },
                // ✅ اصلاح شده: این قلاب برای افزودن هدر و فوتر به صفحات بعدی است
                didDrawPage: (_data) => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
            });

            // رسم فوتر
            footer();

            doc.save(`Sürücü_Detay_${driver.id}.pdf`);
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) {
            console.error("Detay PDF oluşturulurken hata:", e);
            showAlert('Detay PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };


    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <>
            <Box sx={{ p: 3 }}>

                {(hasCreatePermission || hasEditPermission) && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">Sürücüler</Typography>

                        {hasDownloadPermission && (
                            <Stack direction={isSmallScreen ? "column" : "row"} spacing={2} flexWrap="wrap" gap={1}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadAllDriversPDF}
                                    startIcon={<IconFileDownload />}
                                    fullWidth={isSmallScreen}
                                >
                                    Tüm Sürücüleri İndir (PDF)
                                </Button>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleDownloadDriversWithCarsPDF}
                                    startIcon={<IconFileDownload />}
                                    fullWidth={isSmallScreen}
                                >
                                    Araçlı Sürücüleri İndir (PDF)
                                </Button>
                            </Stack>
                        )}
                    </Stack>

                )}
                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}
                <Paper elevation={3} sx={{ p: isSmallScreen ? 2 : 3, mb: 3 }}>
                    <Typography variant="h5" mb={2}>{editingId ? 'Sürücüyü Düzenle' : 'Yeni Sürücü Kaydı'}</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <CustomFormLabel htmlFor="driver-firstName" required>Adı</CustomFormLabel>
                            <CustomTextField
                                id="driver-firstName"
                                fullWidth
                                value={firstName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFirstName(e.target.value); if (firstNameError) setFirstNameError(false); }}
                                inputRef={firstNameInputRef}
                                error={firstNameError}
                                helperText={firstNameError ? "Adı alanı boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <CustomFormLabel htmlFor="driver-lastName" required>Soyadı</CustomFormLabel>
                            <CustomTextField
                                id="driver-lastName"
                                fullWidth
                                value={lastName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setLastName(e.target.value); if (lastNameError) setLastNameError(false); }}
                                error={lastNameError}
                                helperText={lastNameError ? "Soyadı alanı boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <CustomFormLabel htmlFor="start-date" required>Doğum Tarihi</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    label=""
                                    value={birthdate}
                                    onChange={(newValue) => {
                                        setBirthDate(newValue);
                                        if (birthDateError && newValue) setBirthDateError(false);
                                    }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            error={birthDateError}
                                            helperText={birthDateError ? "Başlangıç tarihi boş olamaz!" : ""}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <CustomFormLabel htmlFor="driver-fatherName" required>Baba Adı</CustomFormLabel>
                            <CustomTextField
                                id="driver-fatherName"
                                fullWidth
                                value={fatherName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFatherName(e.target.value); if (fatherNameError) setFatherNameError(false); }}
                                error={fatherNameError}
                                helperText={fatherNameError ? "Baba adı alanı boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <CustomFormLabel htmlFor="driver-identityNo" required>TC</CustomFormLabel>
                            <CustomTextField
                                id="driver-identityNo"
                                fullWidth
                                value={identityNo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNationalCode(e.target.value); if (nationalCodeError) setNationalCodeError(false); }}
                                error={nationalCodeError}
                                helperText={nationalCodeError ? "TC boş bırakılamaz!" : ""}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <CustomFormLabel required>Setaş Sürücüsü mü?</CustomFormLabel>
                            <RadioGroup
                                row
                                value={internal}
                                onChange={(e) => setDriverType(e.target.value)}
                            >
                                <FormControlLabel value="1" control={<Radio />} label="Evet" />
                                <FormControlLabel value="0" control={<Radio />} label="Hayır" />
                            </RadioGroup>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                                {editingId !== null ? (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili sürücüyü güncelleyin" : ""}>
                                            <Button variant="contained" color="info" onClick={editDriver} disabled={loadingButton} fullWidth={isSmallScreen}>
                                                {loadingButton ? <><CircularProgress size={20} /><Box component="span" ml={1}>Bekleniyor...</Box></> : 'Düzenle'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit} fullWidth={isSmallScreen}>İptal Et</Button>
                                        </CustomTooltip>
                                    </>
                                ) : (

                                    <>
                                        {hasCreatePermission && (
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir sürücü ekle" : ""}>
                                                <Button variant="contained" color="success" onClick={insertDriver} disabled={loadingButton} fullWidth={isSmallScreen}>
                                                    {loadingButton ? <><CircularProgress size={20} /><Box component="span" ml={1}>Bekleniyor...</Box></> : 'Yeni Sürücü Ekle'}
                                                </Button>
                                            </CustomTooltip>

                                        )}
                                    </>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>


            <BlankCard>


                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isFilterActive && (
                            <>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Araçlı Sürücüleri indirin" : ""}>
                                    <BlinkingButton
                                        variant="contained"
                                        color="primary"
                                        onClick={handleDownloadFilteredWithCarsPDF}
                                        startIcon={<IconFileDownload />}
                                        disabled={loadingData}
                                    >
                                        Filtrelenmişi Araçlı Sürücüleri İndir
                                    </BlinkingButton>
                                </CustomTooltip>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Tüm Sürücüleri indirin" : ""}>
                                    <BlinkingButton
                                        variant="contained"
                                        color="primary"
                                        onClick={handleDownloadFilteredAllDriversPDF}
                                        startIcon={<IconFileDownload />}
                                        disabled={loadingData}
                                    >
                                        Filtrelenmişi Tüm Sürücüleri İndir
                                    </BlinkingButton>
                                </CustomTooltip>
                            </>
                        )}

                    </Stack>
                </Grid>

                <Box sx={{ p: isSmallScreen ? 2 : 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Sürücü Ara"
                                variant="outlined"
                                fullWidth
                                size={isSmallScreen ? "small" : "medium"}
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>


                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Başlangıç Tarihi"
                                        value={startDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(newValue) => setStartDate(newValue)}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <DatePicker
                                        label="Bitiş Tarihi"
                                        value={endDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(newValue) => setEndDate(newValue)}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
                                        <IconX size={20} />
                                    </IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
                                <StyledToggleButton value="all" aria-label="Tüm Sürücüler">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="Aktif Sürücüler">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="Pasif Sürücüler">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Sürücüler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="Sürücü tablosu">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <TableCell><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} style={{ color: "#171c23" }}><Typography variant="h6">Adı</Typography></TableSortLabel></TableCell>
                                    <TableCell><TableSortLabel active={orderBy === 'family'} direction={orderBy === 'family' ? order : 'asc'} onClick={() => handleRequestSort('family')} style={{ color: "#171c23" }}><Typography variant="h6">Soyadı</Typography></TableSortLabel></TableCell>
                                    {!isSmallScreen && <TableCell><Typography variant="h6">Doğum Tarihi</Typography></TableCell>}
                                    {!isSmallScreen && <TableCell><Typography variant="h6">Baba Adı</Typography></TableCell>}
                                    <TableCell><TableSortLabel active={orderBy === 'identityNo'} direction={orderBy === 'identityNo' ? order : 'asc'} onClick={() => handleRequestSort('identityNo')} style={{ color: "#171c23" }}><Typography variant="h6">TC</Typography></TableSortLabel></TableCell>
                                    {!isMediumScreen && <TableCell><Typography variant="h6">Sürücü Tipi</Typography></TableCell>}
                                    <TableCell><TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')} style={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></TableSortLabel></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedDrivers.length > 0 ? (
                                    paginatedDrivers.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.family}</Typography></TableCell>
                                            {!isSmallScreen && <TableCell><Typography variant="h6">{formatDateDisplay(row.birthdate)}</Typography></TableCell>}
                                            {!isSmallScreen && <TableCell><Typography variant="h6">{row.fatherName}</Typography></TableCell>}
                                            <TableCell><Typography variant="h6">{row.identityNo}</Typography></TableCell>
                                            {!isMediumScreen && <TableCell>
                                                <Chip
                                                    label={row.internal === '1' ? 'Şirket İçi(Setaş)' : 'Şirket Dışı'}
                                                    color={row.internal === '1' ? 'primary' : 'secondary'}
                                                />
                                            </TableCell>}
                                            <TableCell>
                                                <Chip
                                                    label={row.status}
                                                    sx={{ backgroundColor: row.recordStatus === 0 ? 'success.light' : 'error.light', color: row.recordStatus === 0 ? 'success.main' : 'error.main' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton id={`basic-button-${row.id}`} aria-controls={Boolean(anchorEl) ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(anchorEl) ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <Menu
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                                >

                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Sürücü için araç detaylarını kaydet" : ""}>
                                                            <MenuItem onClick={() => {
                                                                handleClickOpenCarDetailsModal(selectedRowForMenu!);
                                                                handleCloseMenu();
                                                            }}>
                                                                <ListItemIcon><IconPlus width={18} /></ListItemIcon>Ayrıntıları Kaydet
                                                            </MenuItem>
                                                        </CustomTooltip>

                                                    )}

                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Sürücü detaylarını PDF olarak indir" : ""}>
                                                            <MenuItem onClick={() => {
                                                                handleDownloadDriverDetailsPDF(selectedRowForMenu!);
                                                                handleCloseMenu();
                                                            }}>
                                                                <ListItemIcon><IconFileText width={18} /></ListItemIcon>
                                                                Sürücü Detayları PDF İndir
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü pasif yap" : ""}>
                                                            <MenuItem onClick={handleSetInactive}><ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon>Pasif Yap</MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü aktif yap" : ""}>
                                                            <MenuItem onClick={handleSetActive}><ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon>Aktif Yap</MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü düzenle" : ""}>
                                                            <MenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü sil" : ""}>
                                                            <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={isSmallScreen ? 5 : isMediumScreen ? 7 : 8} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç sürücü bulunamadı.</Typography>
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
                    count={filteredDrivers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>
            {driverToDelete && (
                <DeleteDriver
                    openModal={openDeleteModal}
                    driverIdToDelete={Number(driverToDelete.id)}
                    driverNameToDelete={`${driverToDelete.name} ${driverToDelete.family}`}
                    onClose={handleCloseDeleteModal}
                    onDeleteSuccess={fetchDrivers}
                    showAlert={showAlert}
                />
            )}
            <CarDetailsModal
                open={openCarDetailsModal}
                onClose={() => setOpenCarDetailsModal(false)}
                driverId={selectedDriver?.id || null}
                driverName={selectedDriver?.name ? `${selectedDriver.name} ${selectedDriver.family}` : ''}
            />
        </>
    );
};

export default ListDrivers;