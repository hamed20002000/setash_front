import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,

    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    useMediaQuery,
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { keyframes, styled, useTheme } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconPlus, IconFileDownload, IconX, IconFileDescription } from '@tabler/icons-react';
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
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
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
    fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
    // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
    fontSize: '0.8rem', // Varsayılan olarak küçük font
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem', // Masaüstünde daha büyük
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

interface VehicleData {
    id: number;
    name: string;
    model: number;
    plaque: string;
    recordStatus: number;
    brand?: string;
}

interface DriverWithVehicles {
    driverVehicles: VehicleData[];
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
}

interface DriverData {
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

type SortableDriverKeys = keyof Pick<DriverData, 'name' | 'family' | 'identityNo' | 'createAt' | 'recordStatus'>;

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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableDriverKeys): (a: DriverData, b: DriverData) => number => {
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

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthdate, setBirthDate] = useState<Date | null>(new Date());
    const [fatherName, setFatherName] = useState('');
    const [identityNo, setNationalCode] = useState('');
    const [internal, setDriverType] = useState<string>('1');
    const [editingId, setEditingId] = useState<number | null>(null);

    const [firstNameError, setFirstNameError] = useState(false);
    const [lastNameError, setLastNameError] = useState(false);
    const [birthDateError, setBirthDateError] = useState(false);
    const [fatherNameError, setFatherNameError] = useState(false);
    const [nationalCodeError, setNationalCodeError] = useState(false);

    const [driversList, setDriversList] = useState<DriverData[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableDriverKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<DriverData | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState<DriverData | null>(null);
    const { isTooltipGloballyEnabled } = useTooltip();
    const firstNameInputRef = useRef<HTMLInputElement>(null);

    const [openCarDetailsModal, setOpenCarDetailsModal] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<DriverData | null>(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [openAllDownloadModal, setOpenAllDownloadModal] = useState(false);
    const [openFilteredDownloadModal, setOpenFilteredDownloadModal] = useState(false);
    const [openDriverDetailsDownloadModal, setOpenDriverDetailsDownloadModal] = useState(false);


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
                const allDrivers = response.data.data as DriverData[];
                const driversWithStatus = allDrivers.map((item) => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    internal: item.internal ? '1' : '0'
                }));
                setDriversList(driversWithStatus);
            } else {
                showAlert(response.data.message || 'Şoförler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDrivers();
    }, [fetchDrivers]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

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
        setIsFormVisible(false);
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


    // const insertDriver = async () => {
    //     if (!validateForm()) return;
    //     setLoadingButton(true);

    //     const authToken = localStorage.getItem('authToken');
    //     if (!authToken) {
    //         navigate("/");
    //         return;
    //     }
    //     const payload = {
    //         name: firstName,
    //         family: lastName,
    //         birthdate: birthdate ? birthdate.toISOString() : null,
    //         fatherName,
    //         identityNo,
    //         internal: internal == "0" ? false : true
    //     };
    //     try {
    //         const response = await axios.post(
    //             server.baseurl + server.warehouse + "create-driver",
    //             payload,
    //             {
    //                 headers: {
    //                     "Accept": "application/json",
    //                     'Content-Type': 'application/json',
    //                     "Authorization": `Bearer ${authToken}`
    //                 }
    //             }
    //         );
    //         if (response.data.httpStatusCode === 201) {
    //             showAlert(`Sürücü başarıyla eklendi!`, 'success');
    //             resetFormAndState();
    //             fetchDrivers();
    //         } else {
    //             showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
    //         }
    //     } catch (e: any) {
    //         if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
    //         else if (e.response?.status === 401) {
    //             localStorage.removeItem('authToken');
    //             showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
    //         }
    //         else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
    //     } finally {
    //         setLoadingButton(false);
    //     }
    // };


    const insertDriver = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }

        // داده‌های فرم
        const payload = {
            name: firstName,
            family: lastName,
            birthdate: birthdate ? birthdate.toISOString() : null,
            fatherName,
            identityNo, // از این برای پیدا کردن راننده استفاده می‌کنیم اگر سرور ID نداد
            internal: internal == "0" ? false : true
        };

        try {
            // 1. درخواست ثبت راننده
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
                showAlert(`Sürücü başarıyla eklendi! Şimdi araç ekleyebilirsiniz.`, 'success');

                // 👇👇👇 منطق جدید و هوشمند برای باز کردن مودال 👇👇👇

                let newDriverData = response.data.data;
                let newDriverId = newDriverData?.id;

                // 🚨 اگر سرور ID را نفرستاد، خودمان پیدایش می‌کنیم:
                if (!newDriverId) {
                    console.warn("Server ID göndermedi, manuel aranıyor...");
                    try {
                        // گرفتن لیست راننده‌ها
                        const listResponse = await axios.get(
                            server.baseurl + server.warehouse + "get-drivers",
                            { headers: { "Authorization": `Bearer ${authToken}` } }
                        );

                        if (listResponse.data.data && Array.isArray(listResponse.data.data)) {
                            // پیدا کردن راننده‌ای که همین الان با این کد ملی ثبت کردیم
                            const foundDriver = listResponse.data.data.find(
                                (d: any) => d.identityNo === identityNo
                            );
                            if (foundDriver) {
                                newDriverData = foundDriver;
                                newDriverId = foundDriver.id;
                            }
                        }
                    } catch (err) {
                        console.error("ID bulma hatası:", err);
                    }
                }

                // اگر بلاخره ID پیدا شد، مودال را باز کن
                if (newDriverId) {
                    const driverObj: DriverData = {
                        id: newDriverId,
                        name: firstName,
                        family: lastName,
                        birthdate: birthdate ? birthdate.toISOString() : '',
                        fatherName: fatherName,
                        identityNo: identityNo,
                        internal: internal,
                        recordStatus: 0,
                        createAt: new Date().toISOString(),
                        status: 'Aktif'
                    };

                    // ست کردن راننده و باز کردن مودال
                    setSelectedDriver(driverObj);
                    setOpenCarDetailsModal(true);
                } else {
                    showAlert("Sürücü eklendi ancak ID alınamadığı için araç ekranı açılamadı.", "warning");
                }

                // 👆👆👆 پایان تغییرات 👆👆👆

                resetFormAndState(); // بستن فرم ثبت راننده
                fetchDrivers(); // آپدیت لیست اصلی
            } else {
                showAlert(response.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Sunucu hatası (500).', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Bir hata oluştu.', 'error');
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
            setLoadingButton(false);
        }
    }

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: DriverData) => {
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
        setIsFormVisible(true);
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

    const handleClickOpenCarDetailsModal = (driver: DriverData) => {
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
            const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.family.toLowerCase().includes(searchTerm.toLowerCase()) || d.identityNo.includes(searchTerm);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && d.recordStatus === 0) ||
                (statusFilter === 'inactive' && d.recordStatus === 1);

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

    // 👇 Refined PDF download functions
    const generatePDF = (data: DriverData[], isFiltered: boolean) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');

        const header = () => {
            doc.setFont('Arial', 'normal');
            doc.setFontSize(14);
            const title = isFiltered ? 'Filtrelenmiş Şoförler Raporu' : 'Tüm Şoförler Raporu';
            doc.text(title, pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('Times', 'normal');
            doc.text(`Rapor Tarih:`, 15, 25);
            doc.setFont('Times', 'normal');
            doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 25);
            doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

            if (isFiltered) {
                let filterInfo = '';
                if (searchTerm) filterInfo += `Arama: ${searchTerm} | `;
                if (statusFilter !== 'all') filterInfo += `Durum: ${statusFilter === 'active' ? 'Aktif' : 'Pasif'} | `;
                if (startDate || endDate) {
                    const startStr = startDate ? format(startDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                    const endStr = endDate ? format(endDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                    filterInfo += `Tarih Aralığı: ${startStr} - ${endStr}`;
                }
                if (filterInfo) {
                    doc.setFont('Arial', 'normal');
                    doc.setFontSize(9);
                    doc.text(filterInfo, pageWidth / 2, 47, { align: 'center' });
                }
            }
        };

        const footer = () => {
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
        };

        const rows = data.map(driver => [
            `${driver.name} ${driver.family}`,
            formatDateDisplay(driver.birthdate),
            driver.fatherName,
            driver.identityNo,
            driver.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı',
            driver.recordStatus === 0 ? 'Aktif' : 'Pasif',
        ]);

        autoTable(doc, {
            startY: isFiltered ? 55 : 45,
            head: [['Adı Soyadı', 'Doğum Tarihi', 'Baba Adı', 'TC Kimlik No', 'Sürücü Tipi', 'Durum']],
            body: rows,
            theme: 'grid',
            styles: {
                font: 'NotoSans',
                fontStyle: 'normal',
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [242, 242, 242],
                textColor: [0, 0, 0],
                font: 'NotoSans',
                fontSize: 9,
            },
            didDrawPage: () => {
                header();
                footer();
            },
            showHead: 'everyPage',
            margin: { top: 50, bottom: 45 },
        });

        doc.save(`${isFiltered ? 'Filtrelenmiş' : 'Tüm'}_Şoförler_Raporu.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    };

    const handleDownloadAllDriversPDF = () => {
        setOpenAllDownloadModal(false);
        if (!driversList || driversList.length === 0) {
            showAlert('PDF oluşturulacak sürücü bulunamadı.', 'warning');
            return;
        }
        generatePDF(driversList, false);
    };

    const handleDownloadFilteredDriversPDF = () => {
        setOpenFilteredDownloadModal(false);
        if (!sortedAndFilteredDrivers || sortedAndFilteredDrivers.length === 0) {
            showAlert('PDF oluşturulacak sürücü bulunamadı.', 'warning');
            return;
        }
        generatePDF(sortedAndFilteredDrivers, true);
    };

    const handleExportExcel = async (dataToExport: DriverData[], isFiltered: boolean) => {
        setOpenAllDownloadModal(false);
        setOpenFilteredDownloadModal(false);
        if (!dataToExport || dataToExport.length === 0) {
            showAlert('Dışa aktarılacak sürücü bulunamadı.', 'warning');
            return;
        }
        showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Şoförler Raporu', { views: [{ rightToLeft: false }] });

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

            const addCompanyInfo = (ws: Excel.Worksheet, columnCount: number) => {
                ws.addRow([]);
                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                    'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
                ];
                const mergeRangeEndColumn = String.fromCharCode(65 + columnCount - 1);
                companyInfo.forEach(line => {
                    const row = ws.addRow([line]);
                    row.getCell(1).alignment = { horizontal: 'center' };
                    row.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                    ws.mergeCells(`A${row.number}:${mergeRangeEndColumn}${row.number}`);
                });
            };

            const titleText = isFiltered ? 'Filtrelenmiş Şoförler Raporu' : 'Tüm Şoförler Raporu';
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells('A1:G1');

            worksheet.addRow([`Rapor Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) {
                dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
                dateRow.getCell(1).alignment = { horizontal: 'left' };
            }
            worksheet.mergeCells('A2:G2');

            let filterInfo = '';
            if (isFiltered) {
                if (searchTerm) filterInfo += `Arama: ${searchTerm} | `;
                if (statusFilter !== 'all') filterInfo += `Durum: ${statusFilter === 'active' ? 'Aktif' : 'Pasif'} | `;
                if (startDate || endDate) {
                    const startStr = startDate ? format(startDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                    const endStr = endDate ? format(endDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                    filterInfo += `Tarih Aralığı: ${startStr} - ${endStr}`;
                }
            }
            if (filterInfo) {
                worksheet.addRow([filterInfo]);
                const filterInfoRow = worksheet.lastRow;
                if (filterInfoRow) {
                    filterInfoRow.getCell(1).alignment = { horizontal: 'center' };
                    filterInfoRow.getCell(1).font = { name: 'Arial', size: 9, bold: false };
                }
                worksheet.mergeCells('A3:G3');
            }
            worksheet.addRow([]);

            const tableHeaders = ['Adı Soyadı', 'Doğum Tarihi', 'Baba Adı', 'TC Kimlik No', 'Sürücü Tipi', 'Durum'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            dataToExport.forEach(driver => {
                const row = worksheet.addRow([
                    `${driver.name} ${driver.family}`,
                    formatDateDisplay(driver.birthdate),
                    driver.fatherName,
                    driver.identityNo,
                    driver.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı',
                    driver.recordStatus === 0 ? 'Aktif' : 'Pasif',
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

            addCompanyInfo(worksheet, tableHeaders.length);

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
            const fileNamePrefix = isFiltered ? 'Filtrelenmiş_Sürücüler' : 'Tüm_Sürücüler';
            const fileName = `${fileNamePrefix}_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    };

    const handleDownloadDriversWithCarsPDF = async (isFiltered: boolean) => {
        showAlert('Araçlı sürücü bilgileri alınıyor, lütfen bekleyin...', 'info');
        setOpenAllDownloadModal(false);
        setOpenFilteredDownloadModal(false);
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

            const allDriversWithCars = response.data.data as DriverWithVehicles[];
            const dataToExport = isFiltered ? allDriversWithCars.filter((driver: DriverWithVehicles) => {
                const matchesDate =
                    (!startDate || new Date(driver.birthdate) >= startDate) &&
                    (!endDate || new Date(driver.birthdate) <= endDate);
                const matchesSearch =
                    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.identityNo.includes(searchTerm);
                const matchesStatus =
                    statusFilter === 'all' ||
                    (statusFilter === 'active' && driver.recordStatus === 0) ||
                    (statusFilter === 'inactive' && driver.recordStatus === 1);
                return matchesDate && matchesSearch && matchesStatus;
            }) : allDriversWithCars;

            if (dataToExport.length === 0) {
                showAlert('Rapor oluşturulacak araçlı sürücü bulunamadı.', 'warning');
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
            doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
            doc.addFileToVFS('Arial.ttf', ArialFont);
            doc.addFont('Arial.ttf', 'Arial', 'normal');
            doc.setFont('Arial');

            const header = () => {
                doc.setFont('Arial', 'normal');
                doc.setFontSize(14);
                const title = isFiltered ? 'Filtrelenmiş Araçlı Şoförler Raporu' : 'Araçlı Şoförler Raporu';
                doc.text(title, pageWidth / 2, 15, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('Times', 'normal');
                doc.text(`Rapor Tarih:`, 15, 25);
                doc.setFont('Times', 'normal');
                doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 25);
                doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);

                if (isFiltered) {
                    let filterInfo = '';
                    if (searchTerm) filterInfo += `Arama: ${searchTerm} | `;
                    if (statusFilter !== 'all') filterInfo += `Durum: ${statusFilter === 'active' ? 'Aktif' : 'Pasif'} | `;
                    if (startDate || endDate) {
                        const startStr = startDate ? format(startDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                        const endStr = endDate ? format(endDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                        filterInfo += `Tarih Aralığı: ${startStr} - ${endStr}`;
                    }
                    if (filterInfo) {
                        doc.setFont('Arial', 'normal');
                        doc.setFontSize(9);
                        doc.text(filterInfo, pageWidth / 2, 47, { align: 'center' });
                    }
                }
            };
            const footer = () => {
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
            };

            const tableBody: (string[] | { content: string; colSpan: number; styles: object }[])[] = [];

            dataToExport.forEach((driver: DriverWithVehicles) => {
                tableBody.push([
                    {
                        content: `Sürücü: ${driver.name} ${driver.family} (${driver.identityNo})`,
                        colSpan: 4,
                        styles: {
                            fontStyle: 'normal',
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

                if (driver !== dataToExport[dataToExport.length - 1]) {
                    tableBody.push([{ content: '', colSpan: 4, styles: { fillColor: [255, 255, 255], minCellHeight: 5 } }]);
                }
            });

            autoTable(doc, {
                startY: isFiltered ? 55 : 50,
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

            doc.save(`${isFiltered ? 'Filtrelenmiş' : 'Tüm'}_Araçlı_Şoförler_Raporu.pdf`);
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleDownloadDriversWithCarsExcel = async (isFiltered: boolean) => {
        setOpenAllDownloadModal(false);
        setOpenFilteredDownloadModal(false);
        showAlert('Araçlı sürücü Excel dosyası oluşturuluyor...', 'info');

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

            const allDriversWithCars = response.data.data as DriverWithVehicles[];
            const dataToExport = isFiltered ? allDriversWithCars.filter((driver: DriverWithVehicles) => {
                const matchesDate =
                    (!startDate || new Date(driver.birthdate) >= startDate) &&
                    (!endDate || new Date(driver.birthdate) <= endDate);
                const matchesSearch =
                    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.identityNo.includes(searchTerm);
                const matchesStatus =
                    statusFilter === 'all' ||
                    (statusFilter === 'active' && driver.recordStatus === 0) ||
                    (statusFilter === 'inactive' && driver.recordStatus === 1);
                return matchesDate && matchesSearch && matchesStatus;
            }) : allDriversWithCars;

            if (dataToExport.length === 0) {
                showAlert('Dışa aktarılacak araçlı sürücü bulunamadı.', 'warning');
                return;
            }

            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Araçlı Şoförler Raporu', { views: [{ rightToLeft: false }] });
            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
            const headerFont = { ...font, bold: true };
            const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            const fullHeaderStyle = { border: border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>;
            const bodyStyle = { border: border, alignment: leftAlignment, font: font } as Partial<Excel.Style>;

            const addCompanyInfo = (ws: Excel.Worksheet, columnCount: number) => {
                ws.addRow([]);
                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                    'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
                ];
                const mergeRangeEndColumn = String.fromCharCode(65 + columnCount - 1);
                companyInfo.forEach(line => {
                    const row = ws.addRow([line]);
                    row.getCell(1).alignment = { horizontal: 'center' };
                    row.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                    ws.mergeCells(`A${row.number}:${mergeRangeEndColumn}${row.number}`);
                });
            };

            const titleText = isFiltered ? 'Filtrelenmiş Araçlı Şoförler Raporu' : 'Tüm Araçlı Şoförler Raporu';
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells('A1:D1');

            worksheet.addRow([`Rapor Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) {
                dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
                dateRow.getCell(1).alignment = { horizontal: 'left' };
            }
            worksheet.mergeCells('A2:D2');

            let filterInfo = '';
            if (isFiltered) {
                if (searchTerm) filterInfo += `Arama: ${searchTerm} | `;
                if (statusFilter !== 'all') filterInfo += `Durum: ${statusFilter === 'active' ? 'Aktif' : 'Pasif'} | `;
                if (startDate || endDate) {
                    const startStr = startDate ? format(startDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                    const endStr = endDate ? format(endDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                    filterInfo += `Tarih Aralığı: ${startStr} - ${endStr}`;
                }
            }
            if (filterInfo) {
                worksheet.addRow([filterInfo]);
                const filterInfoRow = worksheet.lastRow;
                if (filterInfoRow) {
                    filterInfoRow.getCell(1).alignment = { horizontal: 'center' };
                    filterInfoRow.getCell(1).font = { name: 'Arial', size: 9, bold: false };
                }
                worksheet.mergeCells('A3:D3');
            }
            worksheet.addRow([]);

            const tableHeaders = ['Araç Adı', 'Model', 'Plaka', 'Durum'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            dataToExport.forEach(driver => {
                const driverInfoRow = worksheet.addRow([`Sürücü: ${driver.name} ${driver.family} (${driver.identityNo})`]);
                driverInfoRow.getCell(1).style = { ...bodyStyle, font: { ...bodyStyle.font, bold: true } };
                worksheet.mergeCells(`A${driverInfoRow.number}:D${driverInfoRow.number}`);

                driver.driverVehicles.forEach(car => {
                    worksheet.addRow([
                        car.name || '-',
                        car.model || '-',
                        car.plaque || '-',
                        car.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    ]).eachCell(cell => { cell.style = bodyStyle; });
                });

                worksheet.addRow([]); // Blank row for separation
            });

            addCompanyInfo(worksheet, 4);

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
            const fileNamePrefix = isFiltered ? 'Filtrelenmiş_Araçlı_Şoförler' : 'Tüm_Araçlı_Şoförler';
            const fileName = `${fileNamePrefix}_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');

        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    };


    const handleDownloadDriverDetailsPDF = async (driver: DriverData) => {
        if (!driver) {
            showAlert('Sürücü verisi bulunamadı.', 'warning');
            return;
        }

        showAlert('Sürücü detayları PDF oluşturuluyor, lütfen bekleyin...', 'info');
        setOpenDriverDetailsDownloadModal(false);

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
            doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
            doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
            doc.addFileToVFS('Arial.ttf', ArialFont);
            doc.addFont('Arial.ttf', 'Arial', 'normal');
            doc.setFont('Arial');

            const header = () => {
                doc.setFont('Arial', 'normal');
                doc.setFontSize(14);
                doc.text('Sürücü Detay Raporu', pageWidth / 2, 15, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('Times', 'normal');
                doc.text(`Rapor Tarih:`, 15, 25);
                doc.setFont('Times', 'normal');
                doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 25);
                doc.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25);
            };

            const footer = () => {
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
            };

            header();

            let currentY = 50;

            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(12);
            doc.text('Sürücü Bilgileri:', 15, currentY);
            currentY += 8;
            doc.setFont('NotoSans', 'normal');
            doc.setFontSize(10);
            doc.text(`Adı Soyadı: ${driver.name} ${driver.family}`, 15, currentY);
            currentY += 6;
            doc.text(`Baba Adı: ${driver.fatherName}`, 15, currentY);
            currentY += 6;
            doc.text(`Doğum Tarihi: ${formatDateDisplay(driver.birthdate)}`, 15, currentY);
            currentY += 6;
            doc.text(`TC Kimlik No: ${driver.identityNo}`, 15, currentY);
            currentY += 6;
            doc.text(`Sürücü Tipi: ${driver.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı'}`, 15, currentY);
            currentY += 10;

            if (vehicles.length > 0) {
                doc.setFont('NotoSans', 'normal');
                doc.setFontSize(12);
                doc.text('Araç Bilgileri:', 15, currentY);
                currentY += 5;

                autoTable(doc, {
                    startY: currentY,
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
                    didDrawPage: (_data) => {
                        header();
                        footer();
                    },
                    showHead: 'everyPage',
                    margin: { top: 50, bottom: 45 },
                });
            } else {
                doc.text('Bu sürücüye ait araç bilgisi bulunamadı.', 15, currentY + 10);
            }

            footer();
            doc.save(`Sürücü_Detay_${driver.id}.pdf`);
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) {
            console.error("Detay PDF oluşturulurken hata:", e);
            showAlert('Detay PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleDownloadDriverDetailsExcel = async (driver: DriverData) => {
        if (!driver) {
            showAlert('Sürücü verisi bulunamadı.', 'warning');
            return;
        }

        showAlert('Sürücü detayları Excel oluşturuluyor, lütfen bekleyin...', 'info');
        setOpenDriverDetailsDownloadModal(false);

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

            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Sürücü Detayları', { views: [{ rightToLeft: false }] });

            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
            const headerFont = { ...font, bold: true };
            const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            const fullHeaderStyle = { border: border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>;
            const bodyStyle = { border: border, alignment: leftAlignment, font: font } as Partial<Excel.Style>;

            const addCompanyInfo = (ws: Excel.Worksheet, columnCount: number) => {
                ws.addRow([]);
                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                    'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
                ];
                const mergeRangeEndColumn = String.fromCharCode(65 + columnCount - 1);
                companyInfo.forEach(line => {
                    const row = ws.addRow([line]);
                    row.getCell(1).alignment = { horizontal: 'center' };
                    row.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                    ws.mergeCells(`A${row.number}:${mergeRangeEndColumn}${row.number}`);
                });
            };

            // Header (Title and Date)
            const titleRow = worksheet.addRow([`Sürücü Detay Raporu - ${driver.name} ${driver.family}`]);
            titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
            titleRow.getCell(1).alignment = { horizontal: 'center' };
            worksheet.mergeCells('A1:B1');

            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells('A2:B2');
            worksheet.addRow([]);

            // Driver Info Header
            const driverInfoHeader = worksheet.addRow(['Sürücü Bilgileri']);

            const driverInfoHeaderCell = driverInfoHeader.getCell(1);
            driverInfoHeaderCell.style = {
                ...fullHeaderStyle,
                alignment: { ...fullHeaderStyle.alignment, horizontal: 'left' }
            };
            worksheet.mergeCells(`A${driverInfoHeader.number}:B${driverInfoHeader.number}`);

            // Driver Info Rows
            worksheet.addRow(['Adı Soyadı', `${driver.name} ${driver.family}`]).eachCell(c => Object.assign(c.style, bodyStyle));
            worksheet.addRow(['Baba Adı', driver.fatherName]).eachCell(c => Object.assign(c.style, bodyStyle));
            worksheet.addRow(['Doğum Tarihi', formatDateDisplay(driver.birthdate)]).eachCell(c => Object.assign(c.style, bodyStyle));
            worksheet.addRow(['TC Kimlik No', driver.identityNo]).eachCell(c => Object.assign(c.style, bodyStyle));
            worksheet.addRow(['Sürücü Tipi', driver.internal === '1' ? 'Şirket İçi' : 'Şirket Dışı']).eachCell(c => Object.assign(c.style, bodyStyle));
            worksheet.addRow([]);

            // Vehicle Info Section
            if (vehicles.length > 0) {
                // Vehicle Info Header
                const vehicleInfoHeader = worksheet.addRow(['Araç Bilgileri']);

                const vehicleInfoHeaderCell = vehicleInfoHeader.getCell(1);
                vehicleInfoHeaderCell.style = {
                    ...fullHeaderStyle,
                    alignment: { ...fullHeaderStyle.alignment, horizontal: 'left' }
                };

                worksheet.mergeCells(`A${vehicleInfoHeader.number}:D${vehicleInfoHeader.number}`);

                // Vehicle Table Headers
                const vehicleHeaders = ['Araç Adı', 'Model', 'Plaka', 'Durum'];
                const vehicleHeaderRow = worksheet.addRow(vehicleHeaders);
                vehicleHeaderRow.eachCell(c => Object.assign(c.style, fullHeaderStyle));

                // Vehicle Data Rows
                vehicles.forEach((car: VehicleData) => {
                    worksheet.addRow([
                        car.name || '-',
                        car.model || '-',
                        car.plaque || '-',
                        car.recordStatus === 0 ? 'Aktif' : 'Pasif'
                    ]).eachCell(c => Object.assign(c.style, bodyStyle));
                });
            } else {
                worksheet.addRow(['Bu sürücüye ait araç bilgisi bulunamadı.']).eachCell(c => Object.assign(c.style, bodyStyle));
            }

            // Company Info Footer
            addCompanyInfo(worksheet, 4);

            // Column Widths
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
            const fileName = `Sürücü_Detay_${driver.id}_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel dosyası başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) {
            console.error("Detay Excel oluşturulurken hata:", e);
            showAlert('Detay Excel oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" mb={2}>{editingId ? 'Sürücüyü Düzenle' : 'Yeni Şoförler Kaydı'}</Typography>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şoförler Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni Şoförler Kaydet
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
                <Box sx={{ p: 3 }}>
                    <Paper elevation={3} sx={{ p: isSmallScreen ? 2 : 3, mb: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel htmlFor="driver-firstName" required>Adı</CustomFormLabel>
                                <CustomTextField
                                    id="driver-firstName"
                                    fullWidth
                                    placeholder="Adı"
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
                                    placeholder="Soyadı"
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
                                    placeholder="Baba Adı"
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
                                    placeholder="TC"
                                    value={identityNo}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNationalCode(e.target.value); if (nationalCodeError) setNationalCodeError(false); }}
                                    error={nationalCodeError}
                                    helperText={nationalCodeError ? "TC boş bırakılamaz!" : ""}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Setaş Şöförü mü?</CustomFormLabel>
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
            )}

            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <BlankCard>

                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        {isFilterActive && hasDownloadPermission && (
                            <>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle sürücüleri indirin" : ""}>
                                    <BlinkingButton
                                        variant="contained"
                                        color="info"
                                        onClick={() => setOpenFilteredDownloadModal(true)}
                                        startIcon={<IconFileDownload />}
                                        isBlinking={true}
                                        disabled={loadingData}
                                    >
                                        Filtrelenmişi İndir
                                    </BlinkingButton>
                                </CustomTooltip>
                            </>
                        )}
                        {hasDownloadPermission && (
                            <Stack direction={isSmallScreen ? "column" : "row"} spacing={2} flexWrap="wrap" gap={1}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setOpenAllDownloadModal(true)}
                                    startIcon={<IconFileDownload />}
                                    fullWidth={isSmallScreen}
                                >
                                    Tümünü İndir
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </Grid>

                <Box sx={{ p: isSmallScreen ? 2 : 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Şoförler Ara"
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
                                <StyledToggleButton value="all" aria-label="Tüm Şoförler">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="Aktif Şoförler">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="Pasif Şoförler">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Şoförler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="Sürücü tablosu">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} sx={{ color: "#171c23" }}>
                                            <Typography variant="h6">Adı</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'family'} direction={orderBy === 'family' ? order : 'asc'} onClick={() => handleRequestSort('family')} sx={{ color: "#171c23" }}>
                                            <Typography variant="h6">Soyadı</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    {!isSmallScreen && <StyledTableCell><Typography variant="h6">Doğum Tarihi</Typography></StyledTableCell>}
                                    {!isSmallScreen && <StyledTableCell><Typography variant="h6">Baba Adı</Typography></StyledTableCell>}
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'identityNo'} direction={orderBy === 'identityNo' ? order : 'asc'} onClick={() => handleRequestSort('identityNo')} sx={{ color: "#171c23" }}>
                                            <Typography variant="h6">TC</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    {!isMediumScreen && <StyledTableCell><Typography variant="h6">Şoförler Tipi</Typography></StyledTableCell>}
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')} sx={{ color: "#171c23" }}>
                                            <Typography variant="h6">Durum</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedDrivers.length > 0 ? (
                                    paginatedDrivers.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.name}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.family}</Typography></StyledTableCell>
                                            {!isSmallScreen && <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.birthdate)}</Typography></StyledTableCell>}
                                            {!isSmallScreen && <StyledTableCell><Typography variant="body1">{row.fatherName}</Typography></StyledTableCell>}
                                            <StyledTableCell><Typography variant="body1">{row.identityNo}</Typography></StyledTableCell>
                                            {!isMediumScreen && (
                                                <StyledTableCell>
                                                    <Chip label={row.internal === '1' ? 'Şirket İçi (Setaş)' : 'Şirket Dışı'} color={row.internal === '1' ? 'primary' : 'secondary'} />
                                                </StyledTableCell>
                                            )}
                                            <StyledTableCell>
                                                <Chip
                                                    label={row.status}
                                                    sx={{ backgroundColor: row.recordStatus === 0 ? 'success.light' : 'error.light', color: row.recordStatus === 0 ? 'success.main' : 'error.main' }}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton
                                                        id={`basic-button-${row.id}`}
                                                        aria-controls={Boolean(anchorEl) ? 'basic-menu' : undefined}
                                                        aria-haspopup="true"
                                                        aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                                                        onClick={(event) => handleClickMenu(event, row)}
                                                    >
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
                                                            <MuiMenuItem onClick={() => { handleClickOpenCarDetailsModal(selectedRowForMenu!); handleCloseMenu(); }}>
                                                                <ListItemIcon><IconPlus width={18} /></ListItemIcon>Ayrıntıları Kaydet
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => { setSelectedDriver(selectedRowForMenu); setOpenDriverDetailsDownloadModal(true); handleCloseMenu(); }}>
                                                            <ListItemIcon><IconFileDescription width={18} /></ListItemIcon>
                                                            Detayları İndir
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü sil" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü pasif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon>Pasif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sürücüyü aktif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetActive}>
                                                                <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon>Aktif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={isSmallScreen ? 5 : isMediumScreen ? 7 : 8} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç sürücü bulunamadı.</Typography>
                                        </StyledTableCell>
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

            {/* Download Modal for a single driver's details */}
            <Dialog
                open={openDriverDetailsDownloadModal}
                onClose={() => setOpenDriverDetailsDownloadModal(false)}
            >
                <DialogTitle>Sürücü Detayları için Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleDownloadDriverDetailsPDF(selectedDriver!)}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleDownloadDriverDetailsExcel(selectedDriver!)}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDriverDetailsDownloadModal(false)} color="secondary">
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Download Modal for ALL data */}
            <Dialog
                open={openAllDownloadModal}
                onClose={() => setOpenAllDownloadModal(false)}
            >
                <DialogTitle>Tüm Şoförler için Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconFileDownload />}
                            onClick={handleDownloadAllDriversPDF}
                        >
                            Tüm Şoförler Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleExportExcel(driversList, false)}
                        >
                            Tüm Şoförler Raporu (Excel)
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleDownloadDriversWithCarsPDF(false)}
                        >
                            Araçlı Şoförler Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained"
                            color="warning"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleDownloadDriversWithCarsExcel(false)}
                        >
                            Araçlı Şoförler Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAllDownloadModal(false)} color="secondary">
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Download Modal for FILTERED data */}
            <Dialog
                open={openFilteredDownloadModal}
                onClose={() => setOpenFilteredDownloadModal(false)}
            >
                <DialogTitle>Filtrelenmiş Şoförler için Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconFileDownload />}
                            onClick={handleDownloadFilteredDriversPDF}
                        >
                            Filtrelenmiş Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleExportExcel(sortedAndFilteredDrivers, true)}
                        >
                            Filtrelenmiş Raporu (Excel)
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleDownloadDriversWithCarsPDF(true)}
                        >
                            Filtrelenmiş Araçlı Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained"
                            color="warning"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleDownloadDriversWithCarsExcel(true)}
                        >
                            Filtrelenmiş Araçlı Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenFilteredDownloadModal(false)} color="secondary">
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListDrivers;