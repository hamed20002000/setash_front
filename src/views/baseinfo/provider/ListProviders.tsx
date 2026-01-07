import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, FormControl, InputLabel, Select, ListItemText,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel,

} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown,
    IconFileDownload,
    IconX
} from '@tabler/icons-react';
import DeleteProvider from './DeleteProvider';
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


interface ProviderType {
    id: number;
    name: string;
    phoneNumber: string;
    firm: string;
    address: string;
    recordStatus: number;
    createAt: string;
    status: string;
    region: {
        id: number;
        name: string;
        depth: number;
        createAt: string;
        recordStatus: number;
    };
}


interface RegionType {
    id: number;
    name: string;
    depth: number;
    regions?: RegionType[];
    recordStatus?: number;
}
interface RegionNode {
    id: number;
    name: string;
    label: string;
    depth: number;
    children: RegionNode[];
}
interface FlattenedRegionType {
    id: number;
    name: string;
    label: string;
    depth: number;
}


type SortableProviderKeys = keyof Pick<ProviderType, 'name' | 'phoneNumber' | 'address' | 'firm' | 'createAt' | 'recordStatus'>;

const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableProviderKeys): (a: ProviderType, b: ProviderType) => number => {
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

const flattenRegions = (regions: RegionType[], parentLabel: string = ''): FlattenedRegionType[] => {
    const flattened: FlattenedRegionType[] = [];
    regions.forEach(region => {
        if (region.recordStatus === 0) {
            const currentLabel = parentLabel ? `${parentLabel} - ${region.name}` : region.name;
            flattened.push({ id: region.id, name: region.name, label: currentLabel, depth: region.depth });
            if (region.regions && region.regions.length > 0) {
                flattened.push(...flattenRegions(region.regions, currentLabel));
            }
        }
    });
    return flattened;
};

const buildRegionTree = (regions: RegionType[] | undefined, depth: number = 0): RegionNode[] => {
    if (!regions) return [];

    const tree: RegionNode[] = [];
    regions.forEach(region => {
        if (region.recordStatus === 0) {
            const children = region.regions ? buildRegionTree(region.regions, depth + 1) : [];
            const newRegionNode: RegionNode = {
                id: region.id,
                name: region.name,
                label: region.name,
                depth: depth,
                children: children
            };
            tree.push(newRegionNode);
        }
    });
    return tree;
};


const ListProviders = () => {
    const navigate = useNavigate();

    const [name, setName] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [firm, setFirm] = useState<string>('1');
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

    const [providersList, setProvidersList] = useState<ProviderType[]>([]);
    const [displayedProviders, setDisplayedProviders] = useState<ProviderType[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableProviderKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ProviderType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [ProviderIdToDelete, setProviderIdToDelete] = useState<number | null>(null);
    const [ProviderNameToDelete, setProviderNameToDelete] = useState<string>('');

    const [nameError, setNameError] = useState<boolean>(false);
    const [phoneNumberError, setPhoneNumberError] = useState<boolean>(false);
    const [addressError, setAddressError] = useState<boolean>(false);
    const [firmError, setFirmError] = useState<boolean>(false);
    const [regionIdError, setRegionIdError] = useState<boolean>(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [regionOptions, setRegionOptions] = useState<FlattenedRegionType[]>([]);
    const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());

    const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
    const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

    const [openAddressModal, setOpenAddressModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [openDownloadModal, setOpenDownloadModal] = useState(false); // New state for download modal

    const { isTooltipGloballyEnabled } = useTooltip();

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


    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };

    const fetchRegions = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }

        try {
            const response = await axios.request<{ httpStatusCode: number; data: RegionType[]; message?: string }>({
                baseURL: server.baseurl + server.baseinfo + "get-regions",
                method: "get",
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const regionTreeData = buildRegionTree(response.data.data);
                setRegionTree(regionTreeData);
                const flattened = flattenRegions(response.data.data);
                setRegionOptions(flattened);
                const newRegionMap = new Map<number, string>();
                flattened.forEach(region => {
                    newRegionMap.set(region.id, region.label);
                });
                setRegionMap(newRegionMap);
            } else {
                showAlert(response.data.message || 'Bölgeler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Bölgeler yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        }
    }, [navigate]);

    const fetchProviders = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-provider", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const allProviders = response.data.data;
                const providersWithStatus = allProviders.map((item: any) => ({
                    id: Number(item.id),
                    name: item.name || '',
                    phoneNumber: item.phone || '',
                    address: item.address || '',
                    firm: item.firm ? '1' : '0',
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    region: item.region // این فیلد ممکن است null باشد
                }));
                setProvidersList(providersWithStatus);
            } else {
                showAlert(response.data.message || 'Sağlayıcılar yüklenirken bir hata oluştu.', 'error');
                setProvidersList([]);
            }
        } catch (e: any) {
            showAlert('Sağlayıcılar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchRegions();
        fetchProviders();
    }, [fetchRegions, fetchProviders]);


    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        const filteredBySearchAndStatus = providersList.filter(prov => {
            const matchesSearch = prov.name.toLowerCase().includes(searchTerm.toLowerCase()) || prov.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) || prov.firm.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && prov.recordStatus === 0) ||
                (statusFilter === 'inactive' && prov.recordStatus === 1);
            return matchesSearch && matchesStatus;
        });

        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
        setDisplayedProviders(sortedData);
        setPage(0);
    }, [providersList, searchTerm, statusFilter, order, orderBy]);


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

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ProviderType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setName(selectedRowForMenu.name);
            setPhoneNumber(selectedRowForMenu.phoneNumber);
            setAddress(selectedRowForMenu.address);
            if (selectedRowForMenu.firm === '1') {
                setFirm('1');
            } else if (selectedRowForMenu.firm === '0') {
                setFirm('0');
            }
            setEditingId(Number(selectedRowForMenu.id));

            if (selectedRowForMenu.region) {
                setSelectedRegionId(selectedRowForMenu.region.id);
            } else {
                setSelectedRegionId(null);
            }

            setNameError(false);
            setPhoneNumberError(false);
            setAddressError(false);
            setFirmError(false);
            setRegionIdError(false);

            setIsFormVisible(true);
            setTimeout(() => {
                nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                nameInputRef.current?.focus();
            }, 100);
        }
        handleCloseMenu();
    };

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setProviderIdToDelete(selectedRowForMenu.id);
            setProviderNameToDelete(selectedRowForMenu.name);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setProviderIdToDelete(null);
        setProviderNameToDelete('');
        fetchProviders();
    };

    const resetFormAndState = () => {
        setName('');
        setPhoneNumber('');
        setAddress('');
        setFirm('1');
        setSelectedRegionId(null);
        setEditingId(null);
        setNameError(false);
        setPhoneNumberError(false);
        setAddressError(false);
        setFirmError(false);
        setRegionIdError(false);
        setIsFormVisible(false);
    };

    const validateForm = (): boolean => {
        let isValid = true;
        if (!name.trim()) {
            setNameError(true);
            isValid = false;
        } else {
            setNameError(false);
        }
        if (!phoneNumber.trim()) {
            setPhoneNumberError(true);
            isValid = false;
        } else {
            setPhoneNumberError(false);
        }
        if (!address.trim()) {
            setAddressError(true);
            isValid = false;
        } else {
            setAddressError(false);
        }
        if (!firm.trim()) {
            setFirmError(true);
            isValid = false;
        } else {
            setFirmError(false);
        }
        if (!selectedRegionId) {
            setRegionIdError(true);
            isValid = false;
        } else {
            setRegionIdError(false);
        }
        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    const insertProvider = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const payload = {
                name,
                phone: phoneNumber,
                address,
                firm: firm == "0" ? false : true,
                regionId: Number(selectedRegionId)
            };
            debugger
            const response = await axios.post(server.baseurl + server.baseinfo + "create-provider",
                payload, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Tedarikçi başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchProviders();
            } else {
                showAlert(response.data.message || 'Tedarikçi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'Tedarikçi eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editProvider = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const payload = {
                id: Number(editingId),
                name,
                phone: phoneNumber,
                address,
                firm: firm == "0" ? false : true,
                regionId: Number(selectedRegionId)
            };
            const response = await axios.put(server.baseurl + server.baseinfo + "update-provider", payload, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('Tedarikçi başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchProviders();
            } else {
                showAlert(response.data.message || 'Tedarikçi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Tedarikçi güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };


    const sendStatusUpdate = async (id: number, statusValue: number) => {
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
                server.baseurl + server.baseinfo + "update-provider",
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
                showAlert(`Direk başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetFormAndState();
                fetchProviders();
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
    const handleRequestSort = (property: SortableProviderKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredProvidersList = providersList.filter(prov => {
        const matchesSearch = prov.name.toLowerCase().includes(searchTerm.toLowerCase()) || prov.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) || prov.firm.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && prov.recordStatus === 0) ||
            (statusFilter === 'inactive' && prov.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });
    const sortedAndFilteredProvidersList = stableSort(filteredProvidersList, getComparator(order, orderBy));
    const paginatedProviders = sortedAndFilteredProvidersList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


    const renderRegionTree = (nodes: RegionNode[], depth: number = 0) => {
        return nodes.map(node => {
            const isExpanded = expandedNodes.has(node.id);
            const hasChildren = node.children && node.children.length > 0;

            const handleSelectClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                setSelectedRegionId(node.id);
                setIsRegionSelectOpen(false);
            };

            const handleToggleCollapse = (e: React.MouseEvent) => {
                e.stopPropagation();
                setExpandedNodes(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(node.id)) {
                        newSet.delete(node.id);
                    } else {
                        newSet.add(node.id);
                    }
                    return newSet;
                });
            };

            return (
                <React.Fragment key={node.id}>
                    <MuiMenuItem
                        value={node.id}
                        onClick={handleSelectClick}
                        sx={{
                            paddingLeft: `${depth * 16 + (hasChildren ? 0 : 20)}px`,
                            backgroundColor: selectedRegionId === node.id ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                        }}
                    >
                        <Stack direction="row" alignItems="center" width="100%">
                            {hasChildren ? (
                                <IconButton size="small" onClick={handleToggleCollapse} sx={{ mr: 1, p: 0.5 }}>
                                    {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                                </IconButton>
                            ) : (
                                <Box sx={{ width: 16 + 8 }} />
                            )}
                            {hasChildren ? (
                                <ListItemText primary={node.name} />
                            )
                                : (
                                    <ListItemText sx={{ marginLeft: "-12px" }} primary={node.name} />
                                )}

                        </Stack>
                    </MuiMenuItem>
                    {isExpanded && hasChildren && renderRegionTree(node.children, depth + 1)}
                </React.Fragment>
            );
        });
    };

    const renderSelectedRegion = (selected: any) => {
        const region = regionOptions.find(r => r.id === selected);
        return region ? region.label : '';
    };

    const handleOpenRegionSelect = () => setIsRegionSelectOpen(true);
    const handleCloseRegionSelect = () => setIsRegionSelectOpen(false);



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

    // const handleDownloadAllProvidersPDF = () => {
    //     if (!sortedAndFilteredProvidersList || sortedAndFilteredProvidersList.length === 0) {
    //         showAlert('PDF oluşturulacak tedarikçi bulunamadı.', 'warning');
    //         return;
    //     }

    //     const doc = new jsPDF();
    //     const pageWidth = doc.internal.pageSize.getWidth();
    //     const pageHeight = doc.internal.pageSize.getHeight();

    //     try {
    //         // Add fonts
    //         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    //         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    //         doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
    //         doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
    //         doc.addFileToVFS('Arial.ttf', ArialFont);
    //         doc.addFont('Arial.ttf', 'Arial', 'normal');
    //         doc.setFont('Arial');

    //         // Prepare rows for the PDF table
    //         const rows = sortedAndFilteredProvidersList.map(prov => [
    //             prov.name,
    //             prov.phoneNumber,
    //             prov.address,
    //             prov.firm === '1' ? 'Şirket İçi' : 'Şirket Dışı',
    //             prov.region?.name || 'Bilinmiyor',
    //             formatDateDisplay(prov.createAt),
    //             prov.status
    //         ]);

    //         autoTable(doc, {
    //             startY: 65,
    //             head: [['İsim', 'Telefon Numarası', 'Adres', 'Firma', 'Bölge', 'Oluşturulma Tarihi', 'Durum']],
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
    //                 // --- Header Section ---
    //                 doc.setFont('Arial', 'bold');
    //                 doc.setFontSize(14);
    //                 doc.text('Tüm Tedarikçiler Raporu', pageWidth / 2, 15, { align: 'center' });
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
    //                 const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    //                 const pageCount = (doc as any).internal.getNumberOfPages();
    //                 doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    //                 doc.setFont('NotoSans', 'normal');
    //                 doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    //                 doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    //             },
    //             showHead: 'everyPage',
    //             margin: { top: 50, bottom: 45 },
    //         });

    //         doc.save('Tüm_Tedarikciler_Raporu.pdf');
    //         showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    //     } catch (error: any) {
    //         console.error('PDF oluşturulurken hata:', error);
    //         showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
    //     }
    // };


    const handleDownloadAllProvidersPDF = () => {
        if (!sortedAndFilteredProvidersList || sortedAndFilteredProvidersList.length === 0) {
            showAlert('PDF oluşturulacak tedarikçi bulunamadı.', 'warning');
            return;
        }

        // استفاده از حالت Landscape (افقی) برای جاگیری مناسب ستون‌ها
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const reportTitle = 'Tüm Tedarikçiler Raporu';

        try {
            // ۱. اضافه کردن فونت‌ها
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
            doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
            doc.setFont('NotoSans');

            // ۲. تابع هدر استاندارد پروژه
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

                // خط جداکننده خاکستری
                // pdfDoc.setDrawColor(200, 200, 200);
                pdfDoc.setLineWidth(0.5);
                pdfDoc.line(15, 45, pageWidth - 15, 45);
            };

            // ۳. تابع فوتر با مشخصات رسمی SETAŞ
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

                pdfDoc.setTextColor(0);
                pdfDoc.setFontSize(10);
                pdfDoc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
                pdfDoc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

                const pageNumber = (pdfDoc as any).internal.getCurrentPageInfo().pageNumber;
                const pageCount = (pdfDoc as any).internal.getNumberOfPages();
                pdfDoc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            };

            // ۴. آماده‌سازی داده‌ها برای جدول
            const rows = sortedAndFilteredProvidersList.map(prov => [
                prov.name || '-',
                prov.phoneNumber || '-',
                prov.address || '-',
                prov.firm === '1' ? 'Şirket İçi' : 'Şirket Dışı',
                regionMap.get(prov.region?.id) || 'Bilinmiyor',
                formatDateDisplay(prov.createAt),
                prov.status || '-'
            ]);

            // ۵. رسم جدول با رنگ‌بندی خاکستری تیره [66, 66, 66]
            autoTable(doc, {
                startY: 55,
                head: [['İsim', 'Telefon', 'Adres', 'Firma Tipi', 'Bölge', 'Oluşturulma', 'Durum']],
                body: rows,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'middle'
                },
                headStyles: {
                    fillColor: [66, 66, 66], // خاکستری تیره یکپارچه با بقیه گزارش‌ها
                    textColor: [255, 255, 255],
                    fontStyle: 'normal',
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 'auto' }, // Name
                    1: { halign: 'left', cellWidth: 25 }, // Phone
                    2: { cellWidth: 50 }, // Address
                    3: { halign: 'left', cellWidth: 20 }, // Firm Type
                    5: { halign: 'left', cellWidth: 35 }, // Date
                    6: { halign: 'left', cellWidth: 20 }  // Status
                },
                margin: { top: 55, bottom: 30 },
                didDrawPage: () => {
                    addPdfHeader(doc, reportTitle);
                    addPdfFooter(doc);
                }
            });

            doc.save(`Tum_Tedarikciler_Raporu.pdf`);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (error: any) {
            console.error('PDF error:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };



    const addCompanyInfo = (worksheet: Excel.Worksheet) => {
        worksheet.addRow([]); // یک سطر خالی برای فاصله
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
    // New Excel Download Function
    const handleExportExcel = async () => {
        setOpenDownloadModal(false);
        if (!sortedAndFilteredProvidersList || sortedAndFilteredProvidersList.length === 0) {
            showAlert('Dışa aktarılacak tedarikçi bulunamadı.', 'warning');
            return;
        }

        showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Tedarikçiler Raporu', { views: [{ rightToLeft: false }] });

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

            // Report Header
            worksheet.addRow(['', '', '']);
            const titleRow = worksheet.addRow(['Tüm Tedarikçiler Raporu']);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells('A2:G2');

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) {
                dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
                dateRow.getCell(1).alignment = { horizontal: 'left' };
            }
            worksheet.addRow([]);

            // Table Headers
            const tableHeaders = ['İsim', 'Telefon Numarası', 'Adres', 'Firma', 'Bölge', 'Oluşturulma Tarihi', 'Durum'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            // Add data
            sortedAndFilteredProvidersList.forEach(prov => {
                const row = worksheet.addRow([
                    prov.name,
                    prov.phoneNumber,
                    prov.address,
                    prov.firm === '1' ? 'Şirket İçi' : 'Şirket Dışı',
                    prov.region?.name || 'Bilinmiyor',
                    formatDateDisplay(prov.createAt),
                    prov.status,
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

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
            addCompanyInfo(worksheet);
            // Save file
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Tüm_Tedarikciler_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    };

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Tedarikçi Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false} // در حالت موبایل بهتر است fullWidth نباشد
                                >
                                    Yeni Tedarikçi Kaydet
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
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Sağlayıcıyı Düzenle' : 'Yeni Tedarikçi Kaydı'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel htmlFor="provider-name" required>İsim</CustomFormLabel>
                                <CustomTextField
                                    id="provider-name"
                                    placeholder="Tedarikçi Adı"
                                    sx={{ width: '100%' }}
                                    size="small"
                                    value={name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setName(e.target.value);
                                        if (nameError && e.target.value.trim()) setNameError(false);
                                    }}
                                    inputRef={nameInputRef}
                                    error={nameError}
                                    helperText={nameError ? "İsim alanı boş bırakılamaz!" : ""}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel htmlFor="provider-phonenumber" required>Telefon Numarası</CustomFormLabel>
                                <CustomTextField
                                    id="provider-phonenumber"
                                    placeholder="Telefon Numarası"
                                    sx={{ width: '100%' }}
                                    size="small"
                                    value={phoneNumber}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setPhoneNumber(e.target.value);
                                        if (phoneNumberError && e.target.value.trim()) setPhoneNumberError(false);
                                    }}
                                    error={phoneNumberError}
                                    helperText={phoneNumberError ? "Telefon Numarası boş bırakılamaz!" : ""}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel htmlFor="region-selection" required>Bölge Seçimi</CustomFormLabel>
                                <FormControl
                                    sx={{ width: '100%' }}
                                    size="small" error={regionIdError}>
                                    <InputLabel id="select-region-label">Bölge Seçin</InputLabel>
                                    <Select
                                        labelId="select-region-label"
                                        id="select-region"
                                        value={selectedRegionId || ''}
                                        label="Bölge Seçin"
                                        open={isRegionSelectOpen}
                                        onOpen={handleOpenRegionSelect}
                                        onClose={handleCloseRegionSelect}
                                        onChange={(event) => {
                                            const selectedId = event.target.value as number;
                                            setSelectedRegionId(selectedId);
                                            if (regionIdError && selectedId) setRegionIdError(false);
                                        }}
                                        renderValue={renderSelectedRegion}
                                        MenuProps={{ sx: { maxHeight: 400 } }}
                                    >
                                        {loadingData ? (
                                            <MuiMenuItem disabled>
                                                <CircularProgress size={20} /> Yükleniyor...
                                            </MuiMenuItem>
                                        ) : regionTree.length > 0 ? (
                                            renderRegionTree(regionTree)
                                        ) : (
                                            <MuiMenuItem disabled>Hiç bölge bulunamadı.</MuiMenuItem>
                                        )}
                                    </Select>
                                    {regionIdError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bölge seçimi zorunludur!</Typography>}
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={8}>
                                <CustomFormLabel htmlFor="provider-address">Adres</CustomFormLabel>
                                <CustomTextField
                                    id="provider-address"
                                    placeholder="Tedarikçi Adresi"
                                    fullWidth
                                    value={address}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setAddress(e.target.value);
                                        if (addressError && e.target.value.trim()) setAddressError(false);
                                    }}
                                    error={addressError}
                                    helperText={addressError ? "Adres alanı boş bırakılamaz!" : ""}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel htmlFor="firm-type" required>Setaş'tan mı? </CustomFormLabel>
                                <RadioGroup
                                    row
                                    aria-labelledby="firm-type-label"
                                    value={firm}
                                    onChange={(e) => {
                                        setFirm(e.target.value);
                                        if (firmError && e.target.value) setFirmError(false);
                                    }}
                                >
                                    <FormControlLabel value="1" control={<Radio />} label="Evet" />
                                    <FormControlLabel value="0" control={<Radio />} label="Hayır" />
                                </RadioGroup>
                                {firmError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Firma türü zorunludur!</Typography>}
                            </Grid>
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {editingId !== null ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili sağlayıcıyı güncelleyin" : ""}>
                                                <Button variant="contained" color="info" onClick={editProvider} disabled={loadingButton}>
                                                    {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                                </Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Tedarikçi moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Tedarikçi ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={insertProvider} disabled={loadingButton}>
                                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Tedarikçi Ekle'}
                                                    </Button>
                                                </CustomTooltip>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                        {alertMessage && (
                            <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                                <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                            </Stack>
                        )}
                    </Paper>
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
                                label="Tedarikçi Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
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
                                <StyledToggleButton value="all" aria-label="all Providers">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active Providers">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive Providers">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Sağlayıcılar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="Provider table">
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
                                            active={orderBy === 'phoneNumber'}
                                            direction={orderBy === 'phoneNumber' ? order : 'asc'}
                                            onClick={() => handleRequestSort('phoneNumber')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Telefon Numarası</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel
                                            active={orderBy === 'address'}
                                            direction={orderBy === 'address' ? order : 'asc'}
                                            onClick={() => handleRequestSort('address')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Adres</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel
                                            active={orderBy === 'firm'}
                                            direction={orderBy === 'firm' ? order : 'asc'}
                                            onClick={() => handleRequestSort('firm')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Firma</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Typography variant="h6">Bölge</Typography>
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
                                            active={orderBy === 'recordStatus'}
                                            direction={orderBy === 'recordStatus' ? order : 'asc'}
                                            onClick={() => handleRequestSort('recordStatus')}
                                            style={{ color: "#171c23" }}
                                        >
                                            <Typography variant="h6">Durum</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedProviders.length > 0 ? (
                                    paginatedProviders.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.name}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.phoneNumber}</Typography>
                                            </StyledTableCell>
                                            {/* <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                                <Box sx={{
                                                    maxHeight: '5em',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}>
                                                    <Typography variant="body1">{row.address}</Typography>
                                                </Box>
                                                {row.address && row.address.length > 50 && (
                                                    <Button variant="text" size="small" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                        setSelectedAddress(row.address);
                                                        setOpenAddressModal(true);
                                                    }}>
                                                        Açıklamanı Oku
                                                    </Button>
                                                )}
                                            </StyledTableCell> */}


                                            <StyledTableCell sx={{ maxWidth: 200 }} align="center">
                                                {row.address && row.address.trim().length > 0 ? (
                                                    // ✅ حالت اول: آدرس هست -> فقط دکمه نمایش بده
                                                    <Button
                                                        variant="outlined" // یا "text" یا "contained" بسته به سلیقه
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => {
                                                            setSelectedAddress(row.address);
                                                            setOpenAddressModal(true);
                                                        }}
                                                    >
                                                        Adresi Gör
                                                    </Button>
                                                ) : (
                                                    <Typography variant="body1">-</Typography>
                                                )}
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <Chip
                                                    label={row.firm === '1' ? 'Şirket İçi' : 'Şirket Dışı'}
                                                    color={row.firm === '1' ? 'primary' : 'secondary'}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{regionMap.get(row.region?.id) || 'Bilinmiyor'}</Typography>
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
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                                >
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı pasif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon>
                                                                Pasif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 1 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı aktif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetActive}>
                                                                <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon>
                                                                Aktif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                                Düzenlemek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı sil" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>
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
                                        <StyledTableCell colSpan={8} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç sağlayıcı bulunamadı.
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
                    count={displayedProviders.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            <Dialog
                open={openAddressModal}
                onClose={() => setOpenAddressModal(false)}
                aria-labelledby="address-dialog-title"
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle id="address-dialog-title">
                    Adresin Tamamı
                </DialogTitle>
                <DialogContent dividers>
                    <Typography id="address-dialog-description" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedAddress}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAddressModal(false)} color="primary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>
            <DeleteProvider
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                providerIdToDelete={ProviderIdToDelete}
                providerNameToDelete={ProviderNameToDelete}
                showAlert={showAlert}
                onDeleteSuccess={fetchProviders}
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
                            onClick={handleDownloadAllProvidersPDF} // Call the PDF download function
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileDownload />}
                            onClick={handleExportExcel} // Call the Excel download function
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

export default ListProviders;