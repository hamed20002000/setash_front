// src/views/work/ListWorks.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, TableSortLabel, Autocomplete,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    ListItemIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format } from 'date-fns';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../components/shared/BlankCard';
import CustomFormLabel from '../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';

import axios from 'axios';
import server from '../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

// ✅ ایمپورت کردن کامپوننت مودال حذف جدید
import DeleteWork from './DeleteWork'; // مسیر رو بر اساس جایی که DeleteWork.tsx رو ذخیره کردی تنظیم کن

interface WorkType {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    tenderId: number;
    tenderTitle?: string;
    createAt: string;
    recordStatus?: number;
    status: string;
}

interface TenderOption {
    id: number;
    title: string;
    status?: number;
}

type SortableWorkKeys = keyof Pick<WorkType, 'id' | 'title' | 'startDate' | 'endDate' | 'createAt' | 'status' | 'tenderId'>;

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
    orderBy: SortableWorkKeys,
): (a: WorkType, b: WorkType) => number => {
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


const ListWorks = () => {
    const navigate = useNavigate();

    const [title, setTitle] = useState<string>('');
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [selectedTenderOption, setSelectedTenderOption] = useState<TenderOption | null>(null);
    const [tenderOptions, setTenderOptions] = useState<TenderOption[]>([]);
    const [worksList, setWorksList] = useState<WorkType[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [originalTitle, setOriginalTitle] = useState<string>('');
    const [originalStartDate, setOriginalStartDate] = useState<Date | null>(null);
    const [originalEndDate, setOriginalEndDate] = useState<Date | null>(null);
    const [originalSelectedTenderOption, setOriginalSelectedTenderOption] = useState<TenderOption | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<WorkType | null>(null);
    const openMenu = Boolean(anchorEl);

    // ✅ State های جدید برای مودال حذف
    const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
    const [workIdToDelete, setWorkIdToDelete] = useState<number | null>(null);
    const [workTitleToDelete, setWorkTitleToDelete] = useState<string>('');


    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const { isTooltipGloballyEnabled } = useTooltip();

    const [orderBy, setOrderBy] = useState<SortableWorkKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const workTitleInputRef = useRef<HTMLInputElement>(null);

    const [titleError, setTitleError] = useState<boolean>(false);
    const [startDateError, setStartDateError] = useState<boolean>(false);
    const [endDateError, setEndDateError] = useState<boolean>(false);
    const [tenderIdError, setTenderIdError] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');


    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tenderIdFromUrl = params.get('tenderId');
        if (tenderIdFromUrl) {
            // Logic to set selectedTenderOption if it comes from URL
        }
        getListWork();
        getTenderOptions();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tenderIdFromUrl = params.get('tenderId');
        if (tenderIdFromUrl && tenderOptions.length > 0) {
            const foundTender = tenderOptions.find(t => t.id === Number(tenderIdFromUrl));
            if (foundTender) {
                setSelectedTenderOption(foundTender);
            }
        }
    }, [tenderOptions, location.search]);


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: WorkType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    // ✅ توابع جدید برای مدیریت مودال حذف
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setWorkIdToDelete(selectedRowForMenu.id);
            setWorkTitleToDelete(selectedRowForMenu.title); // عنوان را برای نمایش در مودال تنظیم می‌کنیم
            setOpenDeleteModal(true);
        }
        handleCloseMenu(); // منوی سه نقطه را ببند
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setWorkIdToDelete(null); // بعد از بستن مودال، ID را ریست می‌کنیم
        setWorkTitleToDelete(''); // عنوان را هم ریست می‌کنیم
        // اگر لازم است بعد از بستن مودال لیست را رفرش کنید:
        getListWork();
    };

    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };

    const clearAlert = () => {
        let timer: NodeJS.Timeout;
        if (alertMessage) {
            timer = setTimeout(() => {
                setAlertMessage(null);
            }, 5000);
        }
        return () => {
            clearTimeout(timer);
        };
    };

    useEffect(() => {
        clearAlert();
    }, [alertMessage]);

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setTitle(selectedRowForMenu.title);
            setStartDate(new Date(selectedRowForMenu.startDate));
            setEndDate(new Date(selectedRowForMenu.endDate));

            const foundTender = tenderOptions.find(t => t.id === selectedRowForMenu.tenderId);
            setSelectedTenderOption(foundTender || null);

            setOriginalTitle(selectedRowForMenu.title);
            setOriginalStartDate(new Date(selectedRowForMenu.startDate));
            setOriginalEndDate(new Date(selectedRowForMenu.endDate));
            setOriginalSelectedTenderOption(foundTender || null);

            setEditingId(selectedRowForMenu.id);

            setTitleError(false);
            setStartDateError(false);
            setEndDateError(false);
            setTenderIdError(false);
            setFormErrors(null);

            setTimeout(() => {
                workTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                workTitleInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
        clearAlert();
    };

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
        setTitleError(false);
        setStartDateError(false);
        setEndDateError(false);
        setTenderIdError(false);
        setFormErrors(null);
    };

    const validateForm = (): boolean => {
        let isValid = true;
        if (!title.trim()) {
            setTitleError(true);
            isValid = false;
        } else {
            setTitleError(false);
        }

        if (!startDate) {
            setStartDateError(true);
            isValid = false;
        } else {
            setStartDateError(false);
        }

        if (!endDate) {
            setEndDateError(true);
            isValid = false;
        } else {
            setEndDateError(false);
        }

        if (startDate && endDate && startDate > endDate) {
            setEndDateError(true);
            setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
            isValid = false;
        } else {
            if (!endDateError) setFormErrors(null);
        }

        // فقط زمانی که در حالت اضافه کردن هستیم (یعنی editingId === null)، Autocomplete نیاز به اعتبار سنجی دارد
        if (editingId === null && (!selectedTenderOption || selectedTenderOption.id === 0)) {
            setTenderIdError(true);
            isValid = false;
        } else {
            setTenderIdError(false);
        }

        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    const insertWork = async () => {
        if (!validateForm()) return;

        clearAlert();
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.warn("Kimlik doğrulama belirteci bulunamadı, giriş sayfasına yönlendiriliyor.");
            navigate("/");
            return;
        }

        setLoadingButton(true);
        try {
            const payload = {
                title: title,
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
                tenderId: selectedTenderOption ? selectedTenderOption.id : 0,
            };

            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-work",
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
                showAlert('Yeni iş başarıyla eklendi!', 'success');
                resetFormAndState();
                getListWork();
            } else {
                showAlert(response.data.message || 'Yeni iş eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("İş eklenirken hata oluştu:", e);
            showAlert(e.response?.data?.message || 'İş eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editWork = async () => {
        if (editingId === null) return;
        if (!validateForm()) return;

        clearAlert();

        // const currentTenderId = selectedTenderOption ? selectedTenderOption.id : null;
        // const originalTenderIdValue = originalSelectedTenderOption ? originalSelectedTenderOption.id : null;

        const isChanged = title !== originalTitle ||
            (startDate && originalStartDate && format(startDate, 'yyyy-MM-dd') !== format(originalStartDate, 'yyyy-MM-dd')) ||
            (endDate && originalEndDate && format(endDate, 'yyyy-MM-dd') !== format(originalEndDate, 'yyyy-MM-dd')) ||
            // tenderId در حالت ویرایش نیازی به بررسی تغییر ندارد زیرا در مودال ویرایش ثابت است
            // اگر کاربر بتواند tenderId را در حالت ویرایش تغییر دهد، این خط را فعال کنید
            // currentTenderId !== originalTenderIdValue;
            false; // فرض می‌کنیم tenderId در حالت ویرایش ثابت است

        if (!isChanged) {
            showAlert('İş bilgilerinde herhangi bir değişiklik yapmadınız.', 'info');
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

            const payload = {
                id: Number(editingId),
                title: title,
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
                // tenderId در حالت ویرایش باید همان مقدار اصلی را ارسال کند
                tenderId: originalSelectedTenderOption ? originalSelectedTenderOption.id : 0,
            };

            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-work",
                payload, {
                headers: {
                    "Accept": "application/json",
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${authToken}`
                }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('İş başarıyla güncellendi!', 'success');
                resetFormAndState();
                getListWork();
            } else {
                showAlert(response.data.message || 'İş güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            console.error("İş güncellenirken hata oluştu:", e);
            showAlert(e.response?.data?.message || 'İş güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    }

    const sendRecordStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        debugger
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-work",
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
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif'; // فقط Aktif و Pasif
                showAlert(`İş başarıyla ${statusText} olarak ayarlandı!`, 'success');
                getListWork();
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
            console.error("Durum güncellenirken hata oluştu:", e);
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


    const resetFormAndState = () => {
        setTitle('');
        setStartDate(new Date());
        setEndDate(new Date());
        setSelectedTenderOption(null);
        setEditingId(null);
        setOriginalTitle('');
        setOriginalStartDate(null);
        setOriginalEndDate(null);
        setOriginalSelectedTenderOption(null);
        setTitleError(false);
        setStartDateError(false);
        setEndDateError(false);
        setTenderIdError(false);
        setFormErrors(null);
        setStatusFilter('all');
    };

    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return format(date, 'yyyy/MM/dd');
        } catch (e) {
            console.error("Tarih biçimlendirilirken hata oluştu:", e);
            return "Geçersiz Tarih";
        }
    };


    function getListWork() {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.warn("Kimlik doğrulama belirteci bulunamadı, giriş sayfasına yönlendiriliyor.");
            navigate("/");
            setLoadingData(false);
            return;
        }

        axios.request({
            baseURL: server.baseurl + server.initialoperations + "get-works",
            method: "get",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${authToken}`
            }
        }).then((result) => {
            if (result.data.httpStatusCode === 200) {
                const rawData = result.data.data;
                const formattedData: WorkType[] = rawData.map((item: any) => {
                    let recordStatusText = '';
                    if (item.recordStatus === 0) {
                        recordStatusText = 'Aktif';
                    } else if (item.recordStatus === 1) {
                        recordStatusText = 'Pasif';
                    } else if (item.recordStatus === 2) {
                        recordStatusText = 'Silindi';
                    }
                    return {
                        id: item.id,
                        title: item.title,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        tenderId: item.tender ? Number(item.tender.id) : 0,
                        tenderTitle: item.tender ? item.tender.title : 'N/A',
                        createAt: item.createAt,
                        recordStatus: item.recordStatus,
                        status: recordStatusText,
                    };
                });

                setWorksList(formattedData);
                setLoadingData(false);
                setStatusFilter('all');
            } else {
                showAlert(result.data.message || 'İş listesi alınırken bir hata oluştu.', 'error');
                setLoadingData(false);
            }
        }).catch((e) => {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("İş listesi getirilirken hata oluştu:", e);
                showAlert('İş listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
            setLoadingData(false);
        });
    }

    // const getTenderOptions = async () => {
    //     const authToken = localStorage.getItem('authToken');
    //     if (!authToken) return;

    //     try {
    //         const response = await axios.get(
    //             server.baseurl + server.initialoperations + "get-tenders",
    //             {
    //                 headers: {
    //                     "Accept": "application/json",
    //                     "Authorization": `Bearer ${authToken}`
    //                 }
    //             }
    //         );
    //         if (response.data.httpStatusCode === 200) {
    //             const approvedTenders = response.data.data
    //                 .filter((item: any) => item.status === 1)
    //                 .map((item: any) => ({
    //                     id: item.id,
    //                     title: item.title,
    //                     status: item.status
    //                 }));
    //             setTenderOptions(approvedTenders);
    //         } else {
    //             showAlert(response.data.message || 'İhale seçenekleri yüklenirken bir hata oluştu.', 'error');
    //         }
    //     } catch (e: any) {
    //         if (e.response && e.response.status === 401) {
    //             localStorage.removeItem('authToken');
    //             navigate("/");
    //             showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
    //         } else {
    //             console.error("İhale seçenekleri getirilirken hata oluştu:", e);
    //             showAlert('İhale seçenekleri yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
    //         }
    //     }
    // };

    const getTenderOptions = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
            // showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); // اگر می‌خواهید پیام نمایش داده شود
            navigate("/");
            return;
        }

        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-tenders",
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                // 🟢 تغییر در اینجا: فیلتر کردن بر اساس recordStatus === 0
                const activeTenders = response.data.data
                    .filter((item: any) => item.recordStatus === 0) // <--- این خط اضافه شد
                    .map((item: any) => ({
                        id: item.id,
                        title: item.title,
                        status: item.status
                    }));
                setTenderOptions(activeTenders);
            } else {
                showAlert(response.data.message || 'İhale seçenekleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("İhale seçenekleri getirilirken hata oluştu:", e);
                showAlert(e.response?.data?.message || 'İhale seçenekleri yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        }
    };
    useEffect(() => {
        getListWork();
        getTenderOptions();
    }, []);

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

    const handleStatusFilterChange = (
        event: React.MouseEvent<HTMLElement>,
        newFilter: 'all' | 'active' | 'inactive' | null,
    ) => {
        console.log(event)
        if (newFilter !== null) {
            setStatusFilter(newFilter);
            setPage(0);
        }
    };

    const handleRequestSort = (property: SortableWorkKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredWorks = worksList.filter(work => {
        const matchesSearch = work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (work.tenderTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (work.createAt ? formatDateDisplay(work.createAt) : '').includes(searchTerm);

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && work.recordStatus === 0) ||
            (statusFilter === 'inactive' && work.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });

    const sortedAndFilteredWorks = stableSort(filteredWorks, getComparator(order, orderBy));

    const paginatedWorks = sortedAndFilteredWorks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    // ✅ تغییر در اینجا: ناوبری به ListNetwork با ارسال workId و tenderId
    const handleGoToNetworks = (workId: number, tenderId: number) => {
        if (workId && tenderId) {
            navigate(`/work/${workId}/networks?tenderId=${tenderId}`);
        } else {
            showAlert('Şebekeler görüntülemek için gerekli bilgiler eksik (iş ID\'si veya ihale ID\'si).', 'warning');
        }
    };

    return (
        <>
            <div style={{
                borderBottom: "1px solid",
                margin: "10px 0 30px 0",
                padding: "10px 15px 30px 15px"
            }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="tender-selection" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
                            İhale Seç
                        </CustomFormLabel>
                        {editingId !== null ? ( // اگر در حال ویرایش باشیم
                            <Typography variant="body1" sx={{
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                padding: '12px 14px',
                                backgroundColor: '#f5f5f5',
                                color: 'text.secondary',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}>
                                {selectedTenderOption ? selectedTenderOption.title : 'İhale Seçilmedi'}
                            </Typography>
                        ) : ( // اگر در حال افزودن جدید باشیم
                            <Autocomplete
                                id="tender-autocomplete"
                                options={tenderOptions}
                                getOptionLabel={(option) => option.title}
                                value={selectedTenderOption}
                                onChange={(event: SyntheticEvent, newValue: TenderOption | null) => {
                                    console.log(event);
                                    setSelectedTenderOption(newValue);
                                    if (tenderIdError && newValue) {
                                        setTenderIdError(false);
                                    }
                                }}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="İhale Ara"
                                        error={tenderIdError}
                                        helperText={tenderIdError ? "İhale seçimi zorunludur!" : ""}
                                    />
                                )}
                                sx={{ width: '100%' }}
                            />
                        )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <CustomFormLabel htmlFor="work-title" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
                            İş Başlığı
                        </CustomFormLabel>
                        <CustomTextField
                            id="work-title"
                            placeholder="İş Başlığı"
                            fullWidth
                            value={title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setTitle(e.target.value);
                                if (titleError && e.target.value.trim()) {
                                    setTitleError(false);
                                }
                            }}
                            inputRef={workTitleInputRef}
                            error={titleError}
                            helperText={titleError ? "İş başlığı boş olamaz!" : ""}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <CustomFormLabel htmlFor="start-date" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
                                Başlangıç Tarihi
                            </CustomFormLabel>
                            <DatePicker
                                label=""
                                value={startDate}
                                onChange={(newValue) => {
                                    setStartDate(newValue);
                                    if (startDateError && newValue) setStartDateError(false);
                                    if (endDate && newValue && newValue > endDate) {
                                        setEndDateError(true);
                                        setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
                                    } else {
                                        setEndDateError(false);
                                        setFormErrors(null);
                                    }
                                }}
                                // @ts-ignore
                                inputFormat="yyyy/MM/dd"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        error={startDateError}
                                        helperText={startDateError ? "Başlangıç tarihi boş olamaz!" : ""}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <CustomFormLabel htmlFor="end-date" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
                                Bitiş Tarihi
                            </CustomFormLabel>
                            <DatePicker
                                label=""
                                value={endDate}
                                onChange={(newValue) => {
                                    setEndDate(newValue);
                                    if (endDateError && newValue) setEndDateError(false);
                                    if (startDate && newValue && newValue < startDate) {
                                        setEndDateError(true);
                                        setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
                                    } else {
                                        setEndDateError(false);
                                        setFormErrors(null);
                                    }
                                }}
                                // @ts-ignore
                                inputFormat="yyyy/MM/dd"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        error={endDateError}
                                        helperText={endDateError ? formErrors || "Bitiş tarihi boş olamaz!" : ""}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} display="flex" justifyContent="flex-end">
                        <Stack direction="row" spacing={1}>
                            {editingId !== null ? (
                                <>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili işi güncelleyin" : ""}>
                                        <Button
                                            variant="contained"
                                            color="info"
                                            onClick={editWork}
                                            disabled={loadingButton}
                                        >
                                            {loadingButton ? <>
                                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                                            </> : 'Düzenle'}
                                        </Button>
                                    </CustomTooltip>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni iş moduna dön" : ""}>
                                        <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                            İptal Et
                                        </Button>
                                    </CustomTooltip>
                                </>
                            ) : (
                                <>
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir iş ekle" : ""}>
                                        <Button
                                            variant="contained"
                                            color="success"
                                            onClick={insertWork}
                                            disabled={loadingButton}
                                        >
                                            {loadingButton ? <>
                                                <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...
                                            </> : 'Yeni İş Ekle'}
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
                {formErrors && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity="error">
                            {formErrors}
                        </Alert>
                    </Stack>
                )}
            </div>

            <BlankCard>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="İş Ara"
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
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm İşleri göster" : ""}>
                                    <StyledToggleButton
                                        value="all"
                                        aria-label="all works"
                                    >
                                        Tümü
                                    </StyledToggleButton>
                                </CustomTooltip>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif İşleri göster" : ""}>
                                    <StyledToggleButton
                                        value="active"
                                        aria-label="active works"
                                    >
                                        Aktif
                                    </StyledToggleButton>
                                </CustomTooltip>
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif İşleri göster" : ""}>
                                    <StyledToggleButton
                                        value="inactive"
                                        aria-label="inactive works"
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
                        <Table aria-label="iş tablosu">
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
                                            active={orderBy === 'tenderId'}
                                            direction={orderBy === 'tenderId' ? order : 'asc'}
                                            onClick={() => handleRequestSort('tenderId')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">İhale</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'startDate'}
                                            direction={orderBy === 'startDate' ? order : 'asc'}
                                            onClick={() => handleRequestSort('startDate')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Başlangıç Tarihi</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'endDate'}
                                            direction={orderBy === 'endDate' ? order : 'asc'}
                                            onClick={() => handleRequestSort('endDate')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Bitiş Tarihi</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === 'status'}
                                            direction={orderBy === 'status' ? order : 'asc'}
                                            onClick={() => handleRequestSort('status')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Durum</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell
                                        style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Şebekeler</Typography> {/* ✅ تغییر عنوان ستون */}
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedWorks.length > 0 ? (
                                    paginatedWorks.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={2}>
                                                    <Box>
                                                        <Typography variant="h6">{row.title}</Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="h6">
                                                    {row.tenderTitle || `ID: ${row.tenderId}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="h6">{formatDateDisplay(row.startDate)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="h6">{formatDateDisplay(row.endDate)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.status}
                                                    sx={{
                                                        backgroundColor:
                                                            row.recordStatus === 2
                                                                ? (theme) => theme.palette.warning.light
                                                                : row.recordStatus === 1
                                                                    ? (theme) => theme.palette.error.light
                                                                    : (theme) => theme.palette.success.light,
                                                        color:
                                                            row.recordStatus === 2
                                                                ? (theme) => theme.palette.warning.main
                                                                : row.recordStatus === 1
                                                                    ? (theme) => theme.palette.error.main
                                                                    : (theme) => theme.palette.success.main,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? `"${row.title}" Şebekeleri gör` : ""}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        // ✅ تغییر در اینجا: فراخوانی تابع جدید برای ناوبری به ListNetwork
                                                        onClick={() => handleGoToNetworks(row.id, row.tenderId)}
                                                        startIcon={<BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} />} // آیکون را تغییر دادم برای نمایش شبکه
                                                    >
                                                        Şebekeleri Görüntüle
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
                                                    {selectedRowForMenu?.recordStatus === 0 ? (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu işi pasif yap" : ""}>
                                                            <MenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon>
                                                                    <DoNotDisturbOnRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Pasif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu işi aktif yap" : ""}>
                                                            <MenuItem onClick={handleSetActive}>
                                                                <ListItemIcon>
                                                                    <DoneRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Aktif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu işi düzenle" : ""}>
                                                        <MenuItem onClick={handleEditClick}>
                                                            <ListItemIcon>
                                                                <IconEdit width={18} />
                                                            </ListItemIcon>
                                                            Düzenlemek
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu işi sil" : ""}>
                                                        <MenuItem onClick={handleClickOpenDeleteModal}> {/* ✅ تغییر اینجا: فراخوانی مودال حذف جدید */}
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
                                                Hiç iş bulunamadı.
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
                    count={sortedAndFilteredWorks.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına satır sayısı:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            {/* ✅ افزودن کامپوننت مودال حذف جدید در اینجا */}
            <DeleteWork
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                workIdToDelete={workIdToDelete}
                workTitleToDelete={workTitleToDelete} // ارسال عنوان کار به مودال
                showAlert={showAlert}
                onDeleteSuccess={getListWork} // اگر بعد از حذف موفق لیست باید رفرش شود
            />
        </>
    );
};

export default ListWorks;