// ListRegion.tsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Chip,
    Menu,
    MenuItem,
    IconButton,
    ListItemIcon,
    Box,
    Stack,
    Grid,
    Button,
    Alert,
    TablePagination,
    TextField,
    InputAdornment,
    CircularProgress,
    Paper,
    ToggleButtonGroup,
    ToggleButton as MuiToggleButton,
    TableSortLabel,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';

import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconPlus, IconTrash, IconSearch, IconChevronRight, IconFileDownload, IconX }
    from '@tabler/icons-react';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import DeleteRegion from './DeleteRegion';
import axios from 'axios';
import server from '../../../assets/address.json';

import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';


import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import { useAuth } from 'src/context/AuthContext';

import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

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
interface ApiRegionType {
    id: string;
    name: string;
    depth: number;
    recordStatus: number;
    createAt: string;
    parentId: string | null;
    regions?: ApiRegionType[];
}

interface RegionType {
    id: string;
    name: string;
    createAt: string;
    recordStatus: number;
    status: string;
    parentId: string | null;
    depth: number;
}

interface BreadcrumbItem {
    id: string | null;
    name: string;
    depth: number;
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

type SortableRegionKeys = keyof Pick<RegionType, 'name' | 'createAt' | 'status' | 'depth'>;

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
    orderBy: SortableRegionKeys,
): (a: RegionType, b: RegionType) => number => {
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


const ListRegion = () => {
    const navigate = useNavigate();

    const [name, setName] = useState<string>('');
    const [rawApiRegions, setRawApiRegions] = useState<ApiRegionType[]>([]);
    const [displayedRegions, setDisplayedRegions] = useState<RegionType[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingParentId, setEditingParentId] = useState<string | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<RegionType | null>(null);

    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [regionIdToDelete, setRegionIdToDelete] = useState<string | null>(null);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const { isTooltipGloballyEnabled } = useTooltip();


    const [currentParentRegion, setCurrentParentRegion] = useState<RegionType | null>(null);
    const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([
        { id: null, name: 'Tüm Bölgeler', depth: -1 },
    ]);

    const MAX_BREADCRUMB_ITEMS = 4;

    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [orderBy, setOrderBy] = useState<SortableRegionKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const regionNameInputRef = useRef<HTMLInputElement>(null);

    const [nameError, setNameError] = useState<boolean>(false);
    const [nameHelperText, setNameHelperText] = useState<string>('');


    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

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

    const findRegionById = useCallback((regions: ApiRegionType[], id: string): ApiRegionType | undefined => {
        for (const reg of regions) {
            if (reg.id === id) {
                return reg;
            }
            if (reg.regions && reg.regions.length > 0) {
                const found = findRegionById(reg.regions, id);
                if (found) return found;
            }
        }
        return undefined;
    }, []);

    const getDirectChildrenOfParent = useCallback((regions: ApiRegionType[], parentId: string | null): RegionType[] => {
        let directChildren: RegionType[] = [];
        if (parentId === null) {
            directChildren = regions.filter(reg => reg.parentId === null).map(reg => ({
                id: reg.id,
                name: reg.name,
                createAt: reg.createAt,
                recordStatus: reg.recordStatus,
                status: reg.recordStatus === 0 ? 'Aktif' : reg.recordStatus === 1 ? 'Pasif' : 'Silindi',
                parentId: reg.parentId,
                depth: reg.depth,
            }));
        } else {
            const parent = findRegionById(regions, parentId);
            if (parent && parent.regions) {
                directChildren = parent.regions.map(reg => ({
                    id: reg.id,
                    name: reg.name,
                    createAt: reg.createAt,
                    recordStatus: reg.recordStatus,
                    status: reg.recordStatus === 0 ? 'Aktif' : reg.recordStatus === 1 ? 'Pasif' : 'Silindi',
                    parentId: reg.parentId,
                    depth: reg.depth,
                }));
            }
        }
        return directChildren;
    }, [findRegionById]);

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RegionType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setRegionIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setRegionIdToDelete(null);
        fetchRegions();
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
            setEditingId(selectedRowForMenu.id);
            setEditingParentId(selectedRowForMenu.parentId);

            setNameError(false);
            setNameHelperText('');

            setTimeout(() => {
                regionNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                regionNameInputRef.current?.focus();
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

    const fetchRegions = async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingData(false);
            return false;
        }

        try {
            const response = await axios.request<{ httpStatusCode: number; data: ApiRegionType[]; message?: string }>({
                baseURL: server.baseurl + server.baseinfo + "get-regions", // ✅ تغییر آدرس API
                method: "get",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });

            if (response.data.httpStatusCode === 200) {
                setRawApiRegions(response.data.data);
                return true;
            } else {
                showAlert(response.data.message || 'Bölgeler yüklenirken bir hata oluştu.', 'error');
                return false;
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Bölgeler getirilirken hata oluştu:", e);
                showAlert('Bölgeler yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
            return false;
        } finally {
            setLoadingData(false);
        }
    };


    const insertRegion = async () => {
        if (!name.trim()) {
            setNameError(true); // تنظیم وضعیت خطا به true
            setNameHelperText('Bölge adı boş bırakılamaz!'); // تنظیم پیام کمکی
            showAlert('İsim boş bırakılamaz!', 'warning');
            return;
        }
        setNameError(false); // در صورت معتبر بودن، خطا را پاک کنید
        setNameHelperText(''); // در صورت معتبر بودن، پیام کمکی را پاک کنید


        clearAlert();
        setLoadingButton(true);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        debugger
        try {
            // تعیین عمق و parentId دسته‌بندی جدید
            const regionParentId = currentParentRegion ? currentParentRegion.id : null; // ParentId should be null for top-level regions

            // داده‌هایی که باید به API ارسال شوند
            const newRegionData = {
                name: name,
                // API expects `parentId` as number if it's not null, or 0 if it's null (or simply omit)
                parentId: regionParentId ? Number(regionParentId) : null // Ensure parentId is number or null
            };

            // فراخوانی API برای ایجاد دسته‌بندی جدید
            const response = await axios.request({
                baseURL: server.baseurl + server.baseinfo + "create-region", // ✅ تغییر آدرس API
                method: "post",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json" // حتماً Content-Type را تنظیم کنید
                },
                data: newRegionData // ارسال داده‌ها
            });

            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni bölge başarıyla eklendi!', 'success');
                resetFormAndState();
                await fetchRegions(); // پس از اضافه شدن موفقیت‌آمیز، دوباره لیست کامل دسته‌بندی‌ها را واکشی می‌کنیم
            } else {
                showAlert(response.data.message || 'Bölge eklenirken bir hata oluştu.', 'error');
            }

        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Bölge eklenirken hata:", e);
                showAlert('Bölge eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };


    const editRegion = async () => {
        if (!name.trim()) {
            setNameError(true); // تنظیم وضعیت خطا به true
            setNameHelperText('Bölge adı boş bırakılamaz!'); // تنظیم پیام کمکی
            showAlert('İsim boş bırakılamaz!', 'warning');
            return;
        }
        setNameError(false); // در صورت معتبر بودن، خطا را پاک کنید
        setNameHelperText(''); // در صورت معتبر بودن، پیام کمکی را پاک کنید


        clearAlert();

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }

        try {
            const updateData = {
                id: Number(editingId), // ID دسته بندی مورد نظر برای بروزرسانی
                newname: name, // نام جدید
                parentId: editingParentId ? Number(editingParentId) : null // ParentId را به number یا null تبدیل می‌کنیم
            };

            const response = await axios.request({
                baseURL: server.baseurl + server.baseinfo + "update-region", // ✅ تغییر آدرس API
                method: "put",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                },
                data: updateData // ارسال داده‌ها در بدنه درخواست
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Bölge başarıyla güncellendi!', 'success');
                resetFormAndState();
                await fetchRegions(); // واکشی مجدد همه دسته‌بندی‌ها برای نمایش داده‌های بروزرسانی شده
            } else {
                showAlert(response.data.message || 'Bölge güncellenirken bir hata oluştu.', 'error');
            }

        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Bölge güncellenirken hata:", e);
                showAlert('Bölge güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    const sendStatusUpdate = async (id: string, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            return;
        }
        if (!selectedRowForMenu) {
            showAlert('Bölge seçilmedi. Lütfen tekrar deneyin.', 'error');
            handleCloseMenu();
            return;
        }

        try {
            const updateData = {
                id: Number(id),
                parentId: selectedRowForMenu.parentId ? Number(selectedRowForMenu.parentId) : null,
                recordStatus: statusValue
            };

            const response = await axios.request({
                baseURL: server.baseurl + server.baseinfo + "update-region", // ✅ تغییر آدرس API
                method: "put",
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                },
                data: updateData
            });

            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Bölge başarıyla ${statusText} olarak ayarlandı!`, 'success');
                await fetchRegions();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (axios.isAxiosError(e) && e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Durum güncellenirken hata:", e);
                showAlert('Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
            }
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
        setEditingParentId(null);
        setNameError(false);
        setNameHelperText('');
        setIsFormVisible(false);
    };


    // این `useEffect` فقط در زمان mount شدن کامپوننت فراخوانی اولیه را انجام می‌دهد.
    useEffect(() => {
        const initFetch = async () => {
            await fetchRegions();
        };
        initFetch();
    }, []); // بدون وابندگی برای اجرای فقط یک بار

    // این `useEffect` زمانی اجرا می‌شود که `rawApiRegions` (داده‌های اصلی) یا فیلترها تغییر کنند.
    useEffect(() => {
        // 1. Get direct children of the current parent
        const directChildren = getDirectChildrenOfParent(rawApiRegions, currentParentRegion?.id || null);

        // 2. Filter these children by search term and status
        const filteredBySearchAndStatus = directChildren.filter(region => {
            const matchesSearch = region.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && region.recordStatus === 0) ||
                (statusFilter === 'inactive' && region.recordStatus === 1);
            return matchesSearch && matchesStatus;
        });

        // 3. Apply sorting to the filtered data
        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));

        setDisplayedRegions(sortedData); // Set the sorted and filtered data
        setPage(0); // Reset to first page when filters or data change
    }, [rawApiRegions, currentParentRegion, searchTerm, statusFilter, getDirectChildrenOfParent, order, orderBy]);


    const handleEnterSubregions = (region: RegionType) => {
        setCurrentParentRegion(region);
        // بروزرسانی Breadcrumb
        const newPath = [...breadcrumbPath];
        const lastItem = newPath[newPath.length - 1];
        // اگر آخرین آیتم breadcrumb همان دسته‌بندی نیست، آن را اضافه کن.
        if (lastItem.id !== region.id) {
            newPath.push({ id: region.id, name: region.name, depth: region.depth });
        }
        setBreadcrumbPath(newPath);
    };

    const handleBreadcrumbClick = (item: BreadcrumbItem) => {
        const itemIndex = breadcrumbPath.findIndex(bc => bc.id === item.id && bc.name === item.name);
        if (itemIndex === -1) return;

        const newPath = breadcrumbPath.slice(0, itemIndex + 1);
        setBreadcrumbPath(newPath);
        // پیدا کردن شیء کامل دسته‌بندی برای تنظیم currentParentRegion
        const selectedRegion = item.id === null ? null : findRegionById(rawApiRegions, item.id);
        setCurrentParentRegion(selectedRegion ? {
            id: selectedRegion.id,
            name: selectedRegion.name,
            createAt: selectedRegion.createAt,
            recordStatus: selectedRegion.recordStatus,
            status: selectedRegion.recordStatus === 0 ? 'Aktif' : selectedRegion.recordStatus === 1 ? 'Pasif' : 'Silindi',
            parentId: selectedRegion.parentId,
            depth: selectedRegion.depth,
        } : null);
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

    // ✅ Added: Handler for changing sort order
    const handleRequestSort = (property: SortableRegionKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0); // Reset to first page when sort changes
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

    // `paginatedRegions` now uses `displayedRegions` which are already filtered and sorted.
    const paginatedRegions = displayedRegions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const getFormattedBreadcrumbPath = () => {
        if (breadcrumbPath.length <= MAX_BREADCRUMB_ITEMS) {
            return breadcrumbPath;
        }

        const firstItem = breadcrumbPath[0];

        const middlePart = breadcrumbPath.slice(breadcrumbPath.length - (MAX_BREADCRUMB_ITEMS - 2));

        return [
            firstItem,
            { id: null, name: '...', depth: -2 }, // ... placeholder
            ...middlePart
        ];
    };

    const formattedBreadcrumb = getFormattedBreadcrumbPath();

    // Add the following function inside the `ListRegion` component, before the `return` statement.

    const flattenAndPrepareRegionsForPdf = (regions: ApiRegionType[], path: string[] = []): string[][] => {
        let rows: string[][] = [];

        regions.forEach(region => {
            const currentPath = [...path, region.name];
            const fullRegionName = currentPath.join(' > ');

            const row = [
                fullRegionName,
                String(region.depth),
                formatDateDisplay(region.createAt),
                region.recordStatus === 0 ? 'Aktif' : 'Pasif'
            ];
            rows.push(row);

            if (region.regions && region.regions.length > 0) {
                rows = rows.concat(flattenAndPrepareRegionsForPdf(region.regions, currentPath));
            }
        });

        return rows;
    };

    const handleDownloadAllRegionsPDF = () => {
        if (!rawApiRegions || rawApiRegions.length === 0) {
            showAlert('PDF oluşturulacak bölge bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Tüm Bölgeler Raporu', pageWidth - 15, 30, { align: 'right' });
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

        const rows = flattenAndPrepareRegionsForPdf(rawApiRegions);

        try {
            // @ts-ignore - autoTable does not have a type definition for 'doc' property
            autoTable(doc, {
                startY: 50,
                head: [['Bölge Adı', 'Derinlik', 'Oluşturulma Tarihi', 'Durum']],
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
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save('Tüm_Bölgeler_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
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

                    <Typography variant="h5" mb={2}>{editingId ? 'Bölge Düzenle' : 'Yeni Bölge Kaydı'}</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Bölge Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false} // در حالت موبایل بهتر است fullWidth نباشد
                                >
                                    Yeni Bölge Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    // disabled={loadingButton}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}

                    </Stack>

                </Stack>
                {breadcrumbPath.length > 1 && (
                    <Paper elevation={3} sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                        {formattedBreadcrumb.map((item, index) => (
                            <React.Fragment key={`${item.id}-${item.name}-${index}`}>
                                {item.name === '...' ? (
                                    <Typography variant="h6" sx={{ mx: 0.5 }}>...</Typography>
                                ) : (
                                    <Button
                                        variant={index === formattedBreadcrumb.length - 1 ? "contained" : "text"}
                                        onClick={() => handleBreadcrumbClick(item)}
                                        color={index === formattedBreadcrumb.length - 1 ? "primary" : "inherit"}
                                        size="small"
                                        sx={{ mx: 0.5 }}
                                    >
                                        {item.name}
                                    </Button>
                                )}
                                {index < formattedBreadcrumb.length - 1 && (
                                    <IconChevronRight size={16} style={{ margin: '0 4px' }} />
                                )}
                            </React.Fragment>
                        ))}
                    </Paper>
                )}

                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Grid container spacing={1}>
                        <Grid item xs={12} sm={1} display="flex" alignItems="center">
                            <CustomFormLabel htmlFor="region-name" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
                                İsim
                            </CustomFormLabel>
                        </Grid>
                        <Grid item xs={12} sm={7}>
                            <CustomTextField
                                id="region-name"
                                placeholder={currentParentRegion ? "Şehir Adı" : "Bölge Adı"}

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
                                inputRef={regionNameInputRef}
                                error={nameError}
                                helperText={nameHelperText}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {editingId !== null ? (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili bölgeyi güncelleyin" : ""}>
                                            <Button
                                                variant="contained"
                                                color="info"
                                                onClick={editRegion}
                                                disabled={loadingButton}
                                            >
                                                {loadingButton ? <>
                                                    <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                                </> : 'Düzenlemek'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni bölge moduna dön" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
                                                İptal Et
                                            </Button>
                                        </CustomTooltip>
                                    </>
                                ) : (

                                    <>
                                        {hasCreatePermission && (
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir bölge ekle" : ""}>
                                                <Button
                                                    variant="contained"
                                                    color="success"
                                                    onClick={insertRegion}
                                                    disabled={loadingButton}
                                                >
                                                    {loadingButton ? <>
                                                        <BoltIcon color="inherit" sx={{ mr: 1, fontSize: 20 }} /> Beklemek....
                                                    </> : (currentParentRegion ? 'Şehir Ekle' : 'Yeni Bölge Ekle')}
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
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadAllRegionsPDF}
                                    startIcon={<IconFileDownload />}
                                // You can add fullWidth if you want it to be responsive
                                >
                                    Tümünü İndir (PDF)
                                </Button>
                            </Grid>
                        )}

                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Bölge Ara"
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
                                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm kategorileri göster" : ""}> */}
                                <StyledToggleButton
                                    value="all"
                                    aria-label="all regions"
                                >
                                    Tümü
                                </StyledToggleButton>
                                {/* </CustomTooltip> */}
                                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece aktif kategorileri göster" : ""}> */}
                                <StyledToggleButton
                                    value="active"
                                    aria-label="active regions"
                                >
                                    Aktif
                                </StyledToggleButton>
                                {/* </CustomTooltip> */}
                                {/* <CustomTooltip title={isTooltipGloballyEnabled ? "Sadece pasif kategorileri göster" : ""}> */}
                                <StyledToggleButton
                                    value="inactive"
                                    aria-label="inactive regions"
                                >
                                    Pasif
                                </StyledToggleButton>
                                {/* </CustomTooltip> */}
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Bölgeler yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="region table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <TableCell>
                                        {/* Sortable Column: İsim (Name) */}
                                        <TableSortLabel
                                            active={orderBy === 'name'}
                                            direction={orderBy === 'name' ? order : 'asc'}
                                            onClick={() => handleRequestSort('name')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">İsim</Typography>
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        {/* Sortable Column: Oluşturulma Tarihi (Creation Date) */}
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
                                        {/* Sortable Column: Durum (Status) */}
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
                                        <Typography variant="h6">Şehirler</Typography>
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRegions.length > 0 ? (
                                    paginatedRegions.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={2}>
                                                    <Box>
                                                        <Typography variant="h6">{row.name}</Typography>
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
                                                <CustomTooltip title={isTooltipGloballyEnabled ? `"${row.name}" için şehir ekle/gör` : ""}>

                                                    {(findRegionById(rawApiRegions, row.id)?.regions || []).length > 0 ? ( // ✅ تغییر نام از categories به cities
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => handleEnterSubregions(row)} // ✅ تغییر نام تابع
                                                            startIcon={<IconChevronRight size={18} />}
                                                        >
                                                            Şehirleri Görüntüle
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => handleEnterSubregions(row)} // ✅ تغییر نام تابع
                                                            startIcon={<IconPlus size={18} />}
                                                        >
                                                            Şehir Ekle
                                                        </Button>
                                                    )}
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

                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu bölgeyi pasif yap" : ""}>
                                                            <MenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon>
                                                                    <DoNotDisturbOnRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Pasif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>

                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu bölgeyi aktif yap" : ""}>
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
                                                            title={isTooltipGloballyEnabled ? "Bu bölgeyi düzenle" : ""}>
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
                                                            title={isTooltipGloballyEnabled ? "Bu bölgeyi sil" : ""}>
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
                                        <TableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç bölge bulunamadı.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={displayedRegions.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            <DeleteRegion
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                regionIdToDelete={regionIdToDelete} // ✅ تغییر prop
                onDeleteSuccess={() => fetchRegions()} // ✅ تغییر نام تابع
                showAlert={showAlert}
            />
        </>
    );
};

export default ListRegion;