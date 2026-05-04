// src/views/work/ListWorks.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useRef, SyntheticEvent, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Chip, Menu, IconButton, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, TableSortLabel, Autocomplete,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    ListItemIcon,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconPlus, IconX } from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteWork from './DeleteWork';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

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

interface WorkType {
    id: number;
    title: string;
    startDate: string;
    endDate: string | null;
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
    const [endDate, setEndDate] = useState<Date | null>(null);
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
    const [tenderIdError, setTenderIdError] = useState<boolean>(false);
    const [formErrors, setFormErrors] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');


    const [openEndWorkModal, setOpenEndWorkModal] = useState(false);
    const [workForEnd, setWorkForEnd] = useState<WorkType | null>(null);
    const [endWorkDate, setEndWorkDate] = useState<Date | null>(null);
    const [endWorkError, setEndWorkError] = useState(false);



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
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tenderIdFromUrl = params.get('tenderId');
        if (tenderIdFromUrl) {
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
    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setWorkIdToDelete(selectedRowForMenu.id);
            setWorkTitleToDelete(selectedRowForMenu.title);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setWorkIdToDelete(null);
        setWorkTitleToDelete('');
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
            setTitle(selectedRowForMenu.title);
            setStartDate(new Date(selectedRowForMenu.startDate));
            const foundTender = tenderOptions.find(t => Number(t.id) === selectedRowForMenu.tenderId);
            setSelectedTenderOption(foundTender || null);
            setOriginalTitle(selectedRowForMenu.title);
            setOriginalStartDate(new Date(selectedRowForMenu.startDate));
            setOriginalSelectedTenderOption(foundTender || null);
            setEditingId(selectedRowForMenu.id);
            setTitleError(false);
            setStartDateError(false);
            setTenderIdError(false);
            setFormErrors(null);
            setTimeout(() => {
                workTitleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                workTitleInputRef.current?.focus();
            }, 100);
        }

        setIsFormVisible(true);
        handleCloseMenu();
        clearAlert();
    };
    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
        setTitleError(false);
        setStartDateError(false);
        setTenderIdError(false);
        setFormErrors(null);
    };
    const validateForm = (): boolean => {
        let isValid = true;
        setFormErrors(null);
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
            navigate("/");
            return;
        }
        setLoadingButton(true);
        try {
            const payload = {
                title: title,
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                endDate: null,
                tenderId: selectedTenderOption ? Number(selectedTenderOption.id) : 0,
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
    const editWork = async () => {
        if (editingId === null) return;
        if (!validateForm()) return;
        clearAlert();
        const isChanged = title !== originalTitle ||
            (startDate && originalStartDate && format(startDate, 'yyyy-MM-dd') !== format(originalStartDate, 'yyyy-MM-dd')) ||
            (endDate && originalEndDate && format(endDate, 'yyyy-MM-dd') !== format(originalEndDate, 'yyyy-MM-dd')) ||
            false;

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
                endDate: selectedRowForMenu?.endDate || null,
                tenderId: originalSelectedTenderOption ? Number(originalSelectedTenderOption.id) : 0,
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
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'İş güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

            }
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
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`İş başarıyla ${statusText} olarak ayarlandı!`, 'success');
                getListWork();
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

    const submitEndWork = async () => {
        if (!workForEnd || !endWorkDate) {
            setEndWorkError(true);
            showAlert('Lütfen bitiş tarihini seçin.', 'warning');
            return;
        }

        const startDate = new Date(workForEnd.startDate);
        if (endWorkDate < startDate) {
            setEndWorkError(true);
            showAlert('Bitiş tarihi başlangıç tarihinden önce olamaz!', 'error');
            return;
        }

        setEndWorkError(false);
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');

        try {
            const payload = {
                id: Number(workForEnd.id),
                endDate: format(endWorkDate, 'yyyy-MM-dd')
            };

            const response = await axios.put(server.baseurl + server.initialoperations + "update-work", payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('İş başarıyla sonlandırıldı ve güncellendi!', 'success');
                setOpenEndWorkModal(false);
                getListWork();
            } else {
                showAlert(response.data.message || 'İş sonlandırılırken bir hata oluştu.', 'error');
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
        setEndDate(null);
        setSelectedTenderOption(null);
        setEditingId(null);
        setOriginalTitle('');
        setOriginalStartDate(null);
        setOriginalEndDate(null);
        setOriginalSelectedTenderOption(null);
        setTitleError(false);
        setStartDateError(false);
        setTenderIdError(false);
        setFormErrors(null);
        setStatusFilter('all');

        setIsFormVisible(false);
    };
    function getListWork() {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
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
                    }
                    return {
                        id: item.id,
                        title: item.title,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        tenderId: item.tender ? Number(item.tender.id) : 0,
                        tenderTitle: item.tender ? item.tender.title : '',
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
                showAlert('İş listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
            setLoadingData(false);
        });


    }
    const getTenderOptions = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
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
                const activeTenders = response.data.data
                    .filter((item: any) => item.recordStatus === 0)
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
    const handleGoToNetworks = (workId: number, tenderId: number) => {
        if (workId && tenderId) {
            navigate(`/work/${workId}/networks?tenderId=${tenderId}`);
        } else {
            showAlert('Şebekeler görüntülemek için gerekli bilgiler eksik (iş ID\'si veya ihale ID\'si).', 'warning');
        }
    };


    const handleGoToWorkhouses = () => {
        if (selectedRowForMenu) {
            const workId = selectedRowForMenu.id;
            navigate(`/workhouse/list-workhouse/${workId}`);
        }
        handleCloseMenu();
    };

    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                <Typography variant="h5" mb={2}>
                    {editingId ? 'İşi Düzenle' : 'Yeni İş Kaydı'}
                </Typography>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni İş Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni İş Kaydet
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
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="tender-selection" required>
                                İhale Seç
                            </CustomFormLabel>
                            {editingId !== null ? (
                                <Typography variant="body1" sx={{
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '6px 14px',
                                    backgroundColor: '#f5f5f5',
                                    color: 'text.secondary',
                                    width: '100%',
                                    boxSizing: 'border-box'

                                }}

                                >
                                    {selectedTenderOption ? selectedTenderOption.title : 'İhale Seçilmedi'}
                                </Typography>
                            ) : (
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

                                    size="small"
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
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="work-title" required>
                                İş Başlığı
                            </CustomFormLabel>
                            <CustomTextField
                                id="work-title"
                                placeholder="İş Başlığı"
                                sx={{ width: '100%' }}

                                size="small"
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

                        <Grid item xs={12} sm={4}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <CustomFormLabel htmlFor="start-date" required>
                                    Başlangıç Tarihi
                                </CustomFormLabel>
                                <DatePicker
                                    label=""
                                    value={startDate}
                                    onChange={(newValue) => {
                                        setStartDate(newValue);
                                        if (startDateError && newValue) setStartDateError(false);
                                        if (endDate && newValue && newValue > endDate) {
                                            setFormErrors("Bitiş tarihi başlangıç tarihinden önce olamaz!");
                                        } else {
                                            setFormErrors(null);
                                        }
                                    }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            sx={{ width: '100%' }}

                                            size="small"
                                            error={startDateError}
                                            helperText={startDateError ? "Başlangıç tarihi boş olamaz!" : ""}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sx={{ mt: { xs: 2, sm: 0 } }}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
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
                                        {hasCreatePermission && (
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

                                        )}
                                    </>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>
                </Paper>

            )}
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
                                <StyledToggleButton
                                    value="all"
                                    aria-label="all works"
                                >
                                    Tümü
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="active"
                                    aria-label="active works"
                                >
                                    Aktif
                                </StyledToggleButton>
                                <StyledToggleButton
                                    value="inactive"
                                    aria-label="inactive works"
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
                            <Typography variant="h6" sx={{ ml: 2 }}>İşler yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="iş tablosu">
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
                                            active={orderBy === 'tenderId'}
                                            direction={orderBy === 'tenderId' ? order : 'asc'}
                                            onClick={() => handleRequestSort('tenderId')}
                                            sx={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">İhale</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={orderBy === 'startDate'}
                                            direction={orderBy === 'startDate' ? order : 'asc'}
                                            onClick={() => handleRequestSort('startDate')}
                                            sx={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Başlangıç Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={orderBy === 'endDate'}
                                            direction={orderBy === 'endDate' ? order : 'asc'}
                                            onClick={() => handleRequestSort('endDate')}
                                            sx={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Bitiş Tarihi</Typography>
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
                                        <Typography variant="h6">Şebekeler</Typography>
                                    </StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedWorks.length > 0 ? (
                                    paginatedWorks.map((row) => (
                                        <TableRow key={row.id}
                                            sx={{
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                ...(row.endDate && row.endDate !== "N/A"
                                                    ? { backgroundColor: '#ffa7a76e' }
                                                    : {}
                                                )
                                            }}>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.title}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">
                                                    {row.tenderTitle || `ID: ${row.tenderId}`}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{formatDateDisplay(row.startDate)}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{formatDateDisplay(row.endDate)}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
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
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? `"${row.title}" Şebekeleri gör` : ""}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => handleGoToNetworks(row.id, row.tenderId)}
                                                        startIcon={<BoltIcon color="inherit" sx={{ fontSize: 20 }} />}
                                                    >
                                                        Şebekeleri Görüntüle
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
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                                                        <MuiMenuItem
                                                            onClick={() => {
                                                                setWorkForEnd(selectedRowForMenu);
                                                                setEndWorkDate(null);
                                                                setOpenEndWorkModal(true);
                                                                handleCloseMenu();
                                                            }}
                                                        >
                                                            <ListItemIcon>
                                                                <IconX width={18} />
                                                            </ListItemIcon>
                                                            İşi Sonlandır
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu iş için yeni bir şantiye kaydı oluştur" : ""}>
                                                            <MuiMenuItem onClick={handleGoToWorkhouses}>
                                                                <ListItemIcon>
                                                                    <IconPlus width={18} />
                                                                </ListItemIcon>
                                                                Şantiye Ekle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? `Bu işi ${selectedRowForMenu?.recordStatus === 0 ? 'pasif' : 'aktif'} yap` : ""}>
                                                            <MuiMenuItem onClick={selectedRowForMenu?.recordStatus === 0 ? handleSetInactive : handleSetActive}>
                                                                <ListItemIcon>
                                                                    {selectedRowForMenu?.recordStatus === 0 ? <DoNotDisturbOnRoundedIcon width={18} /> : <DoneRoundedIcon width={18} />}
                                                                </ListItemIcon>
                                                                {selectedRowForMenu?.recordStatus === 0 ? 'Pasif Yap' : 'Aktif Yap'}
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu işi düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}>
                                                                <ListItemIcon>
                                                                    <IconEdit width={18} />
                                                                </ListItemIcon>
                                                                Düzenlemek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu işi sil" : ""}>
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
                                                Hiç iş bulunamadı.
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
                    count={sortedAndFilteredWorks.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına satır sayısı:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>


            <Dialog open={openEndWorkModal} onClose={() => setOpenEndWorkModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>İşi Sonlandır</DialogTitle>
                <DialogContent>
                    {workForEnd && (
                        <Stack spacing={2}>
                            <Typography variant="h6">İş Başlığı: {workForEnd.title}</Typography>
                            <Typography variant="body2">İhale: {workForEnd.tenderTitle || `ID: ${workForEnd.tenderId}`}</Typography>
                            <Typography variant="body2">Başlangıç Tarihi: {formatDateDisplay(workForEnd.startDate)}</Typography>

                            <CustomFormLabel required>Bitiş Tarihi Seçin</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    label="Bitiş Tarihi"
                                    value={endWorkDate}
                                    onChange={(v) => { setEndWorkDate(v); setEndWorkError(false); }}
                                    inputFormat="dd/MM/yyyy"
                                    minDate={new Date(workForEnd.startDate)}
                                    renderInput={(params) => (
                                        <TextField {...params} size="small" fullWidth
                                            error={endWorkError}
                                            helperText={endWorkError ? 'Tarih zorunludur ve başlangıç tarihinden küçük olamaz.' : ''}
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEndWorkModal(false)} color="secondary" disabled={loadingButton}>
                        İptal
                    </Button>
                    <Button onClick={submitEndWork} color="error" disabled={loadingButton || !endWorkDate}>
                        {loadingButton ? 'Kaydediliyor...' : 'Sonlandır'}
                    </Button>
                </DialogActions>
            </Dialog>

            <DeleteWork
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                workIdToDelete={workIdToDelete}
                workTitleToDelete={workTitleToDelete}
                showAlert={showAlert}
                onDeleteSuccess={getListWork}
            />
        </Box>
    );
};

export default ListWorks;