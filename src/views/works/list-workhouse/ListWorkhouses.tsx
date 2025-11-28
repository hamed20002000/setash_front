import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, FormControl, InputLabel, Select,
    List, ListItemText, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown, IconPlus, IconArrowRight, IconHelmet,
    IconFileSpreadsheet, IconFileText,
    IconBoxSeam,
    IconX,
    IconFileDownload
} from '@tabler/icons-react';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteWorkhouse from './DeleteWorkHouse';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { useAuth } from 'src/context/AuthContext';


import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import { TimesNewRoman } from 'src/assets/fonts/Times';
// import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";


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

interface WorkType {
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    tenderId: number;
    tenderTitle: string;
    createAt: string;
    recordStatus: number;
    status: string;
}

interface WorkhouseType {
    id: number;
    name: string;
    code: string;
    address: string;
    recordStatus: number;
    createAt: string;
    endDate: string | null;
    region: {
        id: number;
        name: string;
        depth: number;
        createAt: string;
        recordStatus: number;
    };
    work: {
        id: number;
        title: string;
        startDate: string;
        endDate: string;
        createAt: string;
        recordStatus: number;
    } | null;
}

interface WorkInfoType {
    title: string;
    tenderTitle: string;
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
interface WorkhouseDetailType {
    id: number;
    workhouseId: number;
    owner: string;
    price: number;
    rentStartDate: string;
    rentEndDate: string;
    description: string;
    subscription: { title: string; no: string; owner: string }[];
}

type SortableWorkhouseKeys = keyof Pick<WorkhouseType, 'name' | 'code' | 'address' | 'createAt' | 'recordStatus'>;

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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableWorkhouseKeys): (a: WorkhouseType, b: WorkhouseType) => number => {
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

const buildRegionTree = (regions: RegionType[] | undefined, _parentId: number | null = null, depth: number = 0): RegionNode[] => {
    if (!regions) return [];

    const tree: RegionNode[] = [];
    regions.forEach(region => {
        if (region.recordStatus === 0) {
            const children = region.regions ? buildRegionTree(region.regions, region.id, depth + 1) : [];
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


interface RegionTreeSelectMenuItemProps {
    node: RegionNode;
    onSelect: (regionId: number) => void;
    selectedId: number | null;
    onCloseParentSelect: () => void;
    searchQuery: string;
}

// ✅ Updated component for rendering the tree menu items
interface RegionTreeSelectMenuItemProps {
    node: RegionNode;
    onSelect: (regionId: number) => void;
    selectedId: number | null;
    onCloseParentSelect: () => void;
    searchQuery: string;
}

const RegionTreeSelectMenuItem: React.FC<RegionTreeSelectMenuItemProps> = ({ node, onSelect, selectedId, onCloseParentSelect, searchQuery }) => {
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    // ✅ Logic to keep nodes open during search
    const isOpen = searchQuery !== '' || (node.children && node.children.length > 0);

    const handleItemClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node.id);
        onCloseParentSelect();
    };

    return (
        <React.Fragment>
            <MuiMenuItem
                value={node.id}
                onClick={handleItemClick}
                sx={{
                    paddingLeft: `${node.depth * 16 + (hasChildren ? 0 : 20)}px`,
                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                    '&.MuiMenuItem-root': {
                        paddingTop: '6px',
                        paddingBottom: '6px',
                    },
                }}
            >
                <Stack direction="row" alignItems="center" width="100%">
                    {hasChildren ? (
                        <IconButton
                            onClick={(e) => e.stopPropagation()} // Keep the menu open
                            size="small"
                            sx={{ mr: 1, p: 0.5, visibility: searchQuery !== '' ? 'hidden' : 'visible' }} // Hide icon during search
                        >
                            {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 16 + 8 + 4 }} />
                    )}
                    <ListItemText primary={node.name} />
                </Stack>
            </MuiMenuItem>
            {isOpen && hasChildren && (
                <List component="div" disablePadding>
                    {node.children.map((childNode) => (
                        <RegionTreeSelectMenuItem
                            key={childNode.id}
                            node={childNode}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            onCloseParentSelect={onCloseParentSelect}
                            searchQuery={searchQuery}
                        />
                    ))}
                </List>
            )}
        </React.Fragment>
    );
};

const filterRegionTree = (nodes: RegionNode[], query: string): RegionNode[] => {
    if (!query) return nodes;
    const lowerCaseQuery = query.toLowerCase();

    return nodes
        .map(node => {
            const matches = node.name.toLowerCase().includes(lowerCaseQuery);

            const filteredChildren = filterRegionTree(node.children, query);
            const hasMatchingChildren = filteredChildren.length > 0;

            if (matches || hasMatchingChildren) {
                return {
                    ...node,
                    children: hasMatchingChildren ? filteredChildren : []
                };
            }
        })
        .filter(Boolean) as RegionNode[];
};

const ListWorkhouses = () => {
    const { workId } = useParams<{ workId: string }>();
    const navigate = useNavigate();

    const [name, setName] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
    const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [worksList, setWorksList] = useState<WorkType[]>([]);
    const [workInfo, setWorkInfo] = useState<WorkInfoType | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableWorkhouseKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<WorkhouseType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [workhouseIdToDelete, setWorkhouseIdToDelete] = useState<number | null>(null);
    const [workhouseNameToDelete, setWorkhouseNameToDelete] = useState<string>('');

    const [nameError, setNameError] = useState<boolean>(false);
    const [codeError, setCodeError] = useState<boolean>(false);
    const [addressError, setAddressError] = useState<boolean>(false);
    const [regionIdError, setRegionIdError] = useState<boolean>(false);
    const [workIdError, setWorkIdError] = useState<boolean>(false);
    const nameInputRef = useRef<HTMLInputElement>(null);


    const [openAddressModal, setOpenAddressModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');

    const [regionOptions, setRegionOptions] = useState<FlattenedRegionType[]>([]);
    const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());
    const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
    const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    const [regionSearchQuery, setRegionSearchQuery] = useState('');

    const [openCloseWorkhouseModal, setOpenCloseWorkhouseModal] = useState(false);
    const [workhouseToClose, setWorkhouseToClose] = useState<WorkhouseType | null>(null);

    const [closureDate, setClosureDate] = useState<Date | null>(null);
    const [isClosingButtonLoading, setIsClosingButtonLoading] = useState<boolean>(false);


    // const [isFormVisible, setIsFormVisible] = useState(false);
    // const [isBlinking, setIsBlinking] = useState(true);

    const [isFormVisible, setIsFormVisible] = useState(workId !== undefined); // اگر workId در آدرس باشد، true شود
    const [isBlinking, setIsBlinking] = useState(workId === undefined);

    const [isFilterActive, setIsFilterActive] = useState(false);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // ✅ NEW: State for download modals
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedWorkhouseForDownload, setSelectedWorkhouseForDownload] = useState<WorkhouseType | null>(null);


    const { isTooltipGloballyEnabled } = useTooltip();

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

    const fetchWorkInfo = useCallback(async () => {
        if (!workId) return;
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-work-by-id/${workId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setWorkInfo({
                    title: response.data.data.title,
                    tenderTitle: response.data.data.tender?.title || '-'
                });
            } else {
                showAlert('İş bilgileri alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [workId, navigate]);

    // const fetchWorkhouses = useCallback(async (workIdParam?: string) => {
    //     setLoadingData(true);
    //     const authToken = localStorage.getItem('authToken');
    //     if (!authToken) {
    //         navigate("/");
    //         setLoadingData(false);
    //         return;
    //     }
    //     try {
    //         const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", {
    //             headers: { "Authorization": `Bearer ${authToken}` }
    //         });
    //         if (response.data.httpStatusCode === 200) {
    //             const allWorkhouses = response.data.data as WorkhouseType[];
    //             const filteredWorkhouses = workIdParam
    //                 ? allWorkhouses.filter(item => item.work && Number(item.work.id) === Number(workIdParam))
    //                 : allWorkhouses;
    //             const workhousesWithStatus = filteredWorkhouses.map((item) => ({
    //                 ...item,
    //                 status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
    //             }));
    //             setWorkhousesList(workhousesWithStatus);
    //         } else {
    //             showAlert(response.data.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error');
    //         }
    //     } catch (e: any) {
    //         if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
    //         else if (e.response?.status === 401) {
    //             localStorage.removeItem('authToken');
    //             showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
    //         }
    //         else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
    //     } finally {
    //         setLoadingData(false);
    //     }
    // }, [navigate]);
    const fetchWorkhouses = useCallback(async (workIdParam?: string) => {
        setLoadingData(true);

        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        let requestParams = {};

        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams // اضافه کردن پارامترها
                }
            );

            if (response.data.httpStatusCode === 200) {
                const allWorkhouses = response.data.data as WorkhouseType[];
                const filteredWorkhouses = workIdParam
                    ? allWorkhouses.filter(item => item.work && Number(item.work.id) === Number(workIdParam))
                    : allWorkhouses;
                const workhousesWithStatus = filteredWorkhouses.map((item) => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setWorkhousesList(workhousesWithStatus);
            } else {
                showAlert(response.data.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error');
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



    const getWorksList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const result = await axios.get(server.baseurl + server.initialoperations + "get-works", {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (result.data.httpStatusCode === 200) {
                const rawData = result.data.data;
                const formattedData: WorkType[] = rawData.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    tenderId: item.tender ? Number(item.tender.id) : 0,
                    tenderTitle: item.tender ? item.tender.title : '-',
                    createAt: item.createAt,
                    recordStatus: item.recordStatus,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setWorksList(formattedData);
            } else {
                showAlert(result.data.message || 'İş listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchRegions = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-regions", {
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    useEffect(() => {
        fetchRegions();
        if (workId) {
            fetchWorkInfo();
            fetchWorkhouses(workId);
        } else {
            fetchWorkhouses();
            getWorksList();
        }
    }, [workId, fetchRegions, fetchWorkInfo, fetchWorkhouses, getWorksList]);


    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    const displayedWorkhouses = useMemo(() => {
        const filteredBySearchAndStatus = workhousesList.filter(wh => {
            const matchesSearch = wh.name.toLowerCase().includes(searchTerm.toLowerCase()) || wh.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && wh.recordStatus === 0) ||
                (statusFilter === 'inactive' && wh.recordStatus === 1);

            // 🚀 اضافه شدن فیلتر تاریخ بر اساس createAt
            const createDate = new Date(wh.createAt);
            const matchesDate =
                (!startDate || createDate >= startDate) &&
                (!endDate || createDate <= endDate);

            return matchesSearch && matchesStatus && matchesDate;
        });

        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
        return sortedData;
    }, [workhousesList, searchTerm, statusFilter, order, orderBy, startDate, endDate]); // 👈 وابستگی‌های جدید

    const paginatedWorkhouses = useMemo(() => {
        return displayedWorkhouses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedWorkhouses, page, rowsPerPage]);

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


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: WorkhouseType) => {
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
            setCode(selectedRowForMenu.code);
            setAddress(selectedRowForMenu.address);
            setEditingId(Number(selectedRowForMenu.id));
            if (selectedRowForMenu.region) {
                setSelectedRegionId(selectedRowForMenu.region.id);
            } else {
                setSelectedRegionId(null);
            }
            if (!workId && selectedRowForMenu.work) {
                setSelectedWorkId(selectedRowForMenu.work.id);
            }
            setNameError(false);
            setCodeError(false);
            setAddressError(false);
            setRegionIdError(false);
            setWorkIdError(false);

            setTimeout(() => {
                nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                nameInputRef.current?.focus();
            }, 100);
        }
        setIsFormVisible(true);
        handleCloseMenu();
    };

    const handleCancelEdit = () => {
        resetFormAndState();
        clearAlert();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setWorkhouseIdToDelete(selectedRowForMenu.id);
            setWorkhouseNameToDelete(selectedRowForMenu.name);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setWorkhouseIdToDelete(null);
        setWorkhouseNameToDelete('');
        fetchWorkhouses(workId);
    };

    const resetFormAndState = () => {
        setName('');
        setCode('');
        setAddress('');
        setSelectedRegionId(null);
        setSelectedWorkId(null);
        setEditingId(null);
        setNameError(false);
        setCodeError(false);
        setAddressError(false);
        setRegionIdError(false);
        setWorkIdError(false);
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
        if (!code.trim()) {
            setCodeError(true);
            isValid = false;
        } else {
            setCodeError(false);
        }
        if (!address.trim()) {
            setAddressError(true);
            isValid = false;
        } else {
            setAddressError(false);
        }
        if (!selectedRegionId) {
            setRegionIdError(true);
            isValid = false;
        } else {
            setRegionIdError(false);
        }
        if (!workId && !selectedWorkId) {
            setWorkIdError(true);
            isValid = false;
        } else {
            setWorkIdError(false);
        }
        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    const insertWorkhouse = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                workId: workId ? Number(workId) : Number(selectedWorkId),
                name,
                code,
                address,
                regionId: Number(selectedRegionId)
            };
            const response = await axios.post(server.baseurl + server.initialoperations + "create-workhouse",
                payload, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni şantiye başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchWorkhouses(workId);
            } else {
                showAlert(response.data.message || 'Şantiye eklenirken bir hata oluştu.', 'error');
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

    const editWorkhouse = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                id: Number(editingId),
                workId: workId ? Number(workId) : Number(selectedWorkId),
                name,
                code,
                address,
                regionId: Number(selectedRegionId)
            };
            const response = await axios.put(server.baseurl + server.initialoperations + "update-workhouse", payload, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchWorkhouses(workId);
            } else {
                showAlert(response.data.message || 'Şantiye güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Şantiye güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };

    const closeWorkhouse = async () => {
        if (!workhouseToClose) return;
        if (!closureDate) {
            showAlert('Lütfen şantiye kapatma tarihini seçin.', 'warning');
            return;
        }

        setIsClosingButtonLoading(true);
        const authToken = localStorage.getItem('authToken');

        try {
            const payload = {
                id: Number(workhouseToClose.id),
                workId: Number(workhouseToClose.work?.id),
                name: workhouseToClose.name,
                code: workhouseToClose.code,
                address: workhouseToClose.address,
                regionId: Number(workhouseToClose.region?.id),
                endDate: closureDate.toISOString(),
            };

            const response = await axios.put(`${server.baseurl}${server.initialoperations}update-workhouse`, payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert(`Şantiye '${workhouseToClose.name}' başarıyla kapatıldı!`, 'success');
                handleCloseWorkhouseModal();
                fetchWorkhouses(workId); // رفرش لیست
            } else {
                showAlert(response.data.message || 'Şantiye kapatılırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Şantiye kapatılırken bir hata oluştu.', 'error');
        } finally {
            setIsClosingButtonLoading(false);
        }
    };

    // 🚀 به‌روزرسانی هندلر بستن مودال برای پاک کردن وضعیت
    const handleCloseWorkhouseModal = () => {
        setOpenCloseWorkhouseModal(false);
        setWorkhouseToClose(null);
        setClosureDate(null); // 👈 پاک کردن تاریخ
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
    const handleRequestSort = (property: SortableWorkhouseKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredRegionTree = useMemo(() => {
        return filterRegionTree(regionTree, regionSearchQuery);
    }, [regionTree, regionSearchQuery]);


    const renderSelectedRegion = (selected: any) => {
        const region = regionOptions.find(r => r.id === selected);
        return region ? region.label : '';
    };

    const handleOpenRegionSelect = () => setIsRegionSelectOpen(true);
    const handleCloseRegionSelect = () => {
        setIsRegionSelectOpen(false);
        setRegionSearchQuery('');
    };

    const handleNavigateToDetails = () => {
        debugger
        if (selectedRowForMenu) {
            navigate(`/workhouse/workhousedetails/${selectedRowForMenu.id}`);
        }
        handleCloseMenu();
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    // A new function to add a header to the PDF document
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const docAny = doc as any;

        // Add company logo at the top-right
        docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);

        // Add report title at the center
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 35, { align: 'center' });

        // Add report date at the top-left
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(`Rapor Tarihi:`, 15, 45);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 45);
    };

    // A new function to add a footer to the PDF document
    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setFont('NotoSans', 'normal');
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
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        const docAny = doc as any;
        const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };

    const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
        worksheet.views = [{ rightToLeft: false }];

        const titleRow = worksheet.addRow([title]);
        titleRow.font = { name: 'NotoSans', size: 14, bold: true };
        worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
        titleRow.getCell(1).alignment = { horizontal: 'center' };

        const dateRow = worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
        dateRow.font = { name: 'NotoSans', size: 10, bold: false };
        dateRow.getCell(1).alignment = { horizontal: 'left' };
        worksheet.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);

        worksheet.addRow([]);
    };

    const addExcelCompanyInfo = (worksheet: Excel.Worksheet, startRow: number, columnsLength: number) => {
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

    // یک تابع جدید و هوشمند برای تبدیل قیمت‌های با فرمت‌های مختلف به عدد
    const parseTurkishNumber = (value: string | number | null | undefined): number => {
        if (typeof value === 'number') {
            return value;
        }
        if (!value || typeof value !== 'string') {
            return 0;
        }

        // ابتدا تمام کاراکترهای غیر عددی به جز نقطه و کاما را حذف می‌کنیم
        const cleanedValue = value.replace(/[^\d.,]/g, '');

        // اگر رشته دارای کاما برای اعشار بود، آن را به نقطه تبدیل می‌کنیم
        // و جداکننده های هزارگان (نقطه) را حذف می‌کنیم
        const isTurkishFormat = cleanedValue.includes(',');
        if (isTurkishFormat) {
            return parseFloat(cleanedValue.replace(/\./g, '').replace(',', '.'));
        }

        // اگر فرمت آمریکایی بود (نقطه برای اعشار)، مستقیماً تبدیل می‌کنیم
        return parseFloat(cleanedValue);
    };

    const exportWorkhousesToPdf = async (data: WorkhouseType[], isDetailed: boolean, isFiltered: boolean) => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak şantiye bulunamadı.', 'warning');
            return;
        }
        setLoadingData(true);
        showAlert('Rapor oluşturuluyor...', 'info');

        const doc = new jsPDF();
        const docAny = doc as any;
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        docAny.setFont('NotoSans');

        if (isDetailed) {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showAlert('Kimlik doğrulama hatası.', 'error');
                setLoadingData(false);
                return;
            }
            let isFirstPage = true;
            for (const workhouse of data) {
                if (!isFirstPage) doc.addPage();
                isFirstPage = false;

                const headerTitle = `Şantiye Detayları: ${workhouse.name}`;
                const tableStartY = 70; // Adjusted startY to prevent overlap

                // Using the updated header function
                addPdfHeader(doc, headerTitle);

                try {
                    const detailsResponse = await axios.get(
                        `${server.baseurl + server.initialoperations}get-workhouse-details-by-workhouse-id/${workhouse.id}`,
                        { headers: { "Authorization": `Bearer ${authToken}` } }
                    );

                    if (detailsResponse.data.httpStatusCode === 200 && detailsResponse.data.data.length > 0) {
                        const details = detailsResponse.data.data as WorkhouseDetailType[];
                        const detailColumns = ["Sahibi", "Fiyat", "Başlangıç Tarihi", "Bitiş Tarihi", "Açıklama", "Abonelikler"];

                        const formatter = new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: 'TRY',
                        });

                        const detailRows = details.map(detail => [
                            detail.owner || '-',
                            formatter.format(parseTurkishNumber(detail.price)), // ✨ اعمال فرمت روی هر سطر
                            formatDateDisplay(detail.rentStartDate),
                            formatDateDisplay(detail.rentEndDate),
                            detail.description || '-',
                            detail.subscription?.map(sub => `${sub.title}: ${sub.no} (${sub.owner})`).join(', ') || '-'
                        ]);

                        const totalPrice = details.reduce((sum, detail) => sum + parseTurkishNumber(detail.price), 0);

                        autoTable(docAny, {
                            startY: tableStartY,
                            head: [detailColumns],
                            body: detailRows,
                            theme: 'grid',
                            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                            didDrawPage: () => {
                                addPdfHeader(doc, headerTitle);
                                addPdfFooter(doc);
                            },
                            showHead: 'everyPage',
                            margin: { top: 65, bottom: 45, left: 10, right: 10 }
                        });

                        const finalY = (docAny as any).lastAutoTable.finalY;
                        docAny.setFontSize(12);
                        docAny.text(`Toplam Fiyat: ${formatter.format(totalPrice)}`, 15, finalY + 10);

                    } else {
                        docAny.text('Bu şantiye için detay bulunamadı.', 15, tableStartY);
                        addPdfFooter(doc);
                    }
                } catch (error) {
                    console.error(`Error fetching details for workhouse ${workhouse.id}:`, error);
                    docAny.addPage();
                    addPdfHeader(doc, headerTitle);
                    docAny.text(`Şantiye '${workhouse.name}' detayları yüklenirken bir hata oluştu.`, 15, tableStartY);
                    addPdfFooter(doc);
                }
            }
            docAny.save(isFiltered ? 'Filtrelenmis_Santiyeler_Detayli.pdf' : 'Tum_Santiyeler_Detayli.pdf');
            showAlert('PDF başarıyla oluşturuldu.', 'success');
            setLoadingData(false);
        } else {
            // Simple PDF
            const columns = [
                "İsim", "Kod", "Adres", "Bölge",
                ...(!workId ? ["İş"] : []),
                "Oluşturulma Tarihi"
            ];
            const rows = data.map(row => [
                row.name,
                row.code,
                row.address,
                regionMap.get(row.region?.id) || 'Bilinmiyor',
                ...(!workId ? [row.work?.title || '-'] : []),
                formatDateDisplay(row.createAt)
            ]);
            const headerTitle = isFiltered ? "Filtrelenmiş Şantiyeler Raporu" : "Tüm Şantiyeler Raporu";

            autoTable(docAny, {
                startY: 65,
                head: [columns],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: () => { addPdfHeader(doc, headerTitle); addPdfFooter(doc); },
                showHead: 'everyPage',
                margin: { top: 65, bottom: 45, left: 10, right: 10 }
            });
            docAny.save(isFiltered ? 'Filtrelenmis_Santiyeler.pdf' : 'Tum_Santiyeler.pdf');
            showAlert('PDF başarıyla oluşturuldu.', 'success');
            setLoadingData(false);
        }
    };

    const exportWorkhousesToExcel = async (data: WorkhouseType[], isDetailed: boolean, isFiltered: boolean) => {
        if (!data || data.length === 0) {
            showAlert('Excel oluşturulacak şantiye bulunamadı.', 'warning');
            return;
        }
        setLoadingData(true);
        showAlert('Rapor oluşturuluyor...', 'info');

        const workbook = new Excel.Workbook();

        if (isDetailed) {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showAlert('Kimlik doğrulama hatası.', 'error');
                setLoadingData(false);
                return;
            }
            for (const workhouse of data) {
                const worksheet = workbook.addWorksheet(`Şantiye_${workhouse.id}`);
                const headerTitle = `Şantiye Detayları: ${workhouse.name}`;
                const detailColumns = ["Sahibi", "Fiyat", "Başlangıç Tarihi", "Bitiş Tarihi", "Açıklama", "Abonelikler"];

                addExcelHeader(worksheet, headerTitle, detailColumns.length);

                worksheet.addRow([`Kodu:`, workhouse.code || '-']);
                worksheet.addRow([`Bölge:`, regionMap.get(workhouse.region?.id) || '-']);
                worksheet.addRow([`Oluşturulma Tarihi:`, formatDateDisplay(workhouse.createAt)]);
                if (workhouse.work) {
                    worksheet.addRow([`İş:`, workhouse.work.title]);
                }
                worksheet.addRow([]);

                try {
                    const detailsResponse = await axios.get(
                        `${server.baseurl + server.initialoperations}get-workhouse-details-by-workhouse-id/${workhouse.id}`,
                        { headers: { "Authorization": `Bearer ${authToken}` } }
                    );

                    if (detailsResponse.data.httpStatusCode === 200 && detailsResponse.data.data.length > 0) {
                        const details = detailsResponse.data.data as WorkhouseDetailType[];
                        const headerRow = worksheet.addRow(detailColumns);
                        headerRow.font = { name: 'NotoSans', bold: true };
                        headerRow.eachCell(cell => {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                        });

                        let totalPrice = 0;
                        const priceRowIndices: number[] = [];

                        details.forEach(detail => {
                            const numericPrice = parseTurkishNumber(detail.price);
                            totalPrice += numericPrice;
                            const row = worksheet.addRow([
                                detail.owner || '-',
                                numericPrice, // ✨ ارسال مقدار عددی به سلول
                                formatDateDisplay(detail.rentStartDate),
                                formatDateDisplay(detail.rentEndDate),
                                detail.description || '-',
                                detail.subscription?.map(sub => `${sub.title}: ${sub.no} (${sub.owner})`).join(', ') || '-'
                            ]);
                            priceRowIndices.push(row.number);
                        });

                        priceRowIndices.forEach(rowNum => {
                            worksheet.getCell(`B${rowNum}`).numFmt = '"₺"#,##0.00';
                        });

                        const totalRow = worksheet.addRow(['Toplam Fiyat', totalPrice]);
                        totalRow.font = { name: 'NotoSans', bold: false };
                        totalRow.getCell(2).numFmt = '"₺"#,##0.00'; // ✨ فرمت‌دهی جمع کل

                        worksheet.columns.forEach(column => {
                            let maxLength = 0;
                            if (column && typeof column.eachCell === 'function') {
                                column.eachCell({ includeEmpty: true }, cell => {
                                    const columnLength = cell.value ? cell.value.toString().length : 10;
                                    if (columnLength > maxLength) maxLength = columnLength;
                                });
                            }
                            column.width = Math.min(Math.max(maxLength + 2, 15), 50);
                        });
                    } else {
                        worksheet.addRow([`Bu şantiye için detay bulunamadı.`]);
                    }
                } catch (error) {
                    console.error(`Error fetching details for workhouse ${workhouse.id}:`, error);
                    worksheet.addRow([`Detaylar yüklenirken bir hata oluştu.`]);
                }
                addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, detailColumns.length);
            }
            const fileName = isFiltered ? 'Filtrelenmis_Santiyeler_Detayli.xlsx' : 'Tum_Santiyeler_Detayli.xlsx';
            workbook.xlsx.writeBuffer().then(buffer => {
                saveAs(new Blob([buffer]), fileName);
                showAlert('Excel başarıyla oluşturuldu.', 'success');
            });
            setLoadingData(false);
        } else {
            // Simple Excel
            const worksheet = workbook.addWorksheet('Şantiyeler');
            const columns = [
                "İsim", "Kod", "Adres", "Bölge",
                ...(!workId ? ["İş"] : []),
                "Oluşturulma Tarihi"
            ];
            const headerTitle = isFiltered ? "Filtrelenmiş Şantiyeler Raporu" : "Tüm Şantiyeler Raporu";
            addExcelHeader(worksheet, headerTitle, columns.length);

            const rows = data.map(row => [
                row.name,
                row.code,
                row.address,
                regionMap.get(row.region?.id) || 'Bilinmiyor',
                ...(!workId ? [row.work?.title || '-'] : []),
                formatDateDisplay(row.createAt)
            ]);

            const headerRow = worksheet.addRow(columns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            });

            rows.forEach(row => {
                worksheet.addRow(row);
            });

            worksheet.columns.forEach(column => {
                let maxLength = 0;
                if (column && typeof column.eachCell === 'function') {
                    column.eachCell({ includeEmpty: true }, cell => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) maxLength = columnLength;
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 15), 50);
            });

            addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, columns.length);

            const fileName = isFiltered ? 'Filtrelenmis_Santiyeler.xlsx' : 'Tum_Santiyeler.xlsx';
            workbook.xlsx.writeBuffer().then(buffer => {
                saveAs(new Blob([buffer]), fileName);
                showAlert('Excel başarıyla oluşturuldu.', 'success');
            });
            setLoadingData(false);
        }
    };
    // Download Modal Handlers
    const handleOpenDownloadAllModal = () => { setOpenDownloadAllModal(true); };
    const handleCloseDownloadAllModal = () => { setOpenDownloadAllModal(false); };

    const handleOpenDownloadFilteredModal = () => { setOpenDownloadFilteredModal(true); };
    const handleCloseDownloadFilteredModal = () => { setOpenDownloadFilteredModal(false); };

    const handleOpenRowDownloadModal = (workhouse: WorkhouseType) => {
        setSelectedWorkhouseForDownload(workhouse);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleCloseRowDownloadModal = () => {
        setOpenRowDownloadModal(false);
        setSelectedWorkhouseForDownload(null);
    };
    const handleInsertStoresClick = () => {
        if (selectedRowForMenu) {
            const workId = selectedRowForMenu.id;
            if (workId) {
                navigate(`/store/list-stores/${workId}`);
            } else {
                showAlert('Bu atölye bir projeye atanmamıştır.', 'warning');
            }
        }
        handleCloseMenu();
    };

    const handleDownloadAll = (format: 'pdf' | 'excel', isDetailed: boolean) => {
        if (format === 'pdf') {
            exportWorkhousesToPdf(workhousesList, isDetailed, false);
        } else {
            exportWorkhousesToExcel(workhousesList, isDetailed, false);
        }
        handleCloseDownloadAllModal();
    };

    const handleDownloadFiltered = (format: 'pdf' | 'excel', isDetailed: boolean) => {
        if (format === 'pdf') {
            exportWorkhousesToPdf(displayedWorkhouses, isDetailed, true);
        } else {
            exportWorkhousesToExcel(displayedWorkhouses, isDetailed, true);
        }
        handleCloseDownloadFilteredModal();
    };

    const handleDownloadRow = (format: 'pdf' | 'excel', isDetailed: boolean) => {
        if (selectedWorkhouseForDownload) {
            if (format === 'pdf') {
                exportWorkhousesToPdf([selectedWorkhouseForDownload], isDetailed, false);
            } else {
                exportWorkhousesToExcel([selectedWorkhouseForDownload], isDetailed, false);
            }
        }
        handleCloseRowDownloadModal();
    };

    // NEW: Handlers for Workhouse Closure Modal
    const handleOpenCloseWorkhouseModal = () => {
        if (!selectedRowForMenu) return;
        setWorkhouseToClose(selectedRowForMenu);
        setOpenCloseWorkhouseModal(true);
        handleCloseMenu(); // بستن منوی عملیات
    };

    const handleAssignPersonnel = () => {
        if (selectedRowForMenu) {
            const workhouseId = selectedRowForMenu.id;
            navigate(`/hr/personnel-work-places-by-workhouse/${workhouseId}`);
        }
        handleCloseMenu();
    };


    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                {(workId && workInfo) && (
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        spacing={{ xs: 2, sm: 1 }}
                        mb={4}
                    >
                        {/* 1. گروه اطلاعات (چیپ‌ها) - بدون تغییر */}
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {/* فرض می‌کنیم workInfo تعریف شده است */}
                            {workInfo && <Chip label={`İş: ${workInfo.title}`} color="primary" variant="filled" size="small" />}
                            {workInfo && <Chip label={`İhale: ${workInfo.tenderTitle}`} color="success" variant="filled" size="small" />}
                        </Stack>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems="stretch"
                            width={{ xs: '100%', sm: '30%' }}
                            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                        >
                            {/* دکمه "Yeni Şantiyeyi Kaydet" */}
                            {!isFormVisible && hasCreatePermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şantiyeyi Belgesi kaydetmek için tıklayınız" : ""}>
                                    <BlinkingButton
                                        variant="contained"
                                        color="primary"
                                        onClick={() => setIsFormVisible(true)}
                                        isBlinking={isBlinking}
                                        fullWidth={true} // 👈 در موبایل تمام عرض
                                    >
                                        Yeni Şantiyeyi Kaydet
                                    </BlinkingButton>
                                </CustomTooltip>
                            )}

                            {/* دکمه "Gizle" */}
                            {isFormVisible && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={resetFormAndState}
                                        fullWidth={true} // 👈 در موبایل تمام عرض
                                        startIcon={<IconX size={20} />}
                                    >
                                        Gizle
                                    </Button>
                                </CustomTooltip>
                            )}

                            {/* دکمه "Geri Dön" */}
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => navigate(-1)}
                                    fullWidth={true} // 👈 در موبایل تمام عرض
                                    endIcon={<IconArrowRight size={20} />}
                                >
                                    Geri Dön
                                </Button>
                            </CustomTooltip>
                        </Stack>
                    </Stack>
                )}
                {(!workId) && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems="stretch"
                            flexGrow={1}
                            justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                        >
                            {!isFormVisible && hasCreatePermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şantiyeyi Belgesi kaydetmek için tıklayınız" : ""}>
                                    <BlinkingButton
                                        variant="contained"
                                        color="primary"
                                        onClick={() => setIsFormVisible(true)}
                                        isBlinking={isBlinking}
                                        fullWidth={false}
                                    >
                                        Yeni Şantiyeyi Kaydet
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
                )}

                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Şantiyeyi Düzenle' : 'Yeni Şantiye Kaydı'}</Typography>


                        <Grid container spacing={2}>
                            {!workId && (
                                <Grid item xs={12} sm={3}>
                                    <CustomFormLabel htmlFor="work-selection" required>İş Seçimi</CustomFormLabel>
                                    <Autocomplete
                                        id="work-selection"
                                        options={worksList}
                                        getOptionLabel={(option) => option.title}
                                        value={worksList.find(w => w.id === selectedWorkId) || null}
                                        onChange={(_event, newValue) => {
                                            setSelectedWorkId(newValue ? newValue.id : null);
                                            if (workIdError && newValue) setWorkIdError(false);
                                        }}
                                        size="small"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="İş Seçin"
                                                error={workIdError}
                                                helperText={workIdError ? "Bu alan zorunludur!" : ""}
                                            />
                                        )}
                                        sx={{ width: '100%' }}
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12} sm={workId == undefined ? 3 : 4}>
                                <CustomFormLabel htmlFor="workhouse-name" required>İsim</CustomFormLabel>
                                <CustomTextField
                                    id="workhouse-name"
                                    placeholder="Şantiye Adı"
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
                            <Grid item xs={12} sm={workId == undefined ? 3 : 4}>
                                <CustomFormLabel htmlFor="workhouse-code" required>Kod</CustomFormLabel>
                                <CustomTextField
                                    id="workhouse-code"
                                    placeholder="Şantiye Kodu"
                                    sx={{ width: '100%' }}
                                    size="small"
                                    value={code}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setCode(e.target.value);
                                        if (codeError && e.target.value.trim()) setCodeError(false);
                                    }}
                                    error={codeError}
                                    helperText={codeError ? "Kod alanı boş bırakılamaz!" : ""}
                                />
                            </Grid>
                            <Grid item xs={12} sm={workId == undefined ? 3 : 4}>
                                <CustomFormLabel htmlFor="region-selection" required>Bölge Seçimi</CustomFormLabel>
                                <FormControl
                                    size="small" error={regionIdError}
                                    sx={{ width: '100%' }}>
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
                                        MenuProps={{
                                            sx: { maxHeight: 400 },
                                            PaperProps: {
                                                sx: { p: 1 }
                                            },
                                        }}
                                    >
                                        <TextField
                                            autoFocus
                                            fullWidth
                                            size="small"
                                            placeholder="Bölge Ara..."
                                            value={regionSearchQuery}
                                            onChange={(e) => setRegionSearchQuery(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                                            InputProps={{
                                                startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>),
                                            }}
                                        />
                                        {loadingData ? (
                                            <MuiMenuItem disabled>
                                                <CircularProgress size={20} /> Yükleniyor...
                                            </MuiMenuItem>
                                        ) : filteredRegionTree.length > 0 ? (
                                            filteredRegionTree.map(node => (
                                                <RegionTreeSelectMenuItem
                                                    key={node.id}
                                                    node={node}
                                                    onSelect={(id) => { setSelectedRegionId(id); handleCloseRegionSelect(); }}
                                                    selectedId={selectedRegionId}
                                                    onCloseParentSelect={handleCloseRegionSelect}
                                                    searchQuery={regionSearchQuery}
                                                />
                                            ))
                                        ) : (
                                            <MuiMenuItem disabled>Hiç bölge bulunamadı.</MuiMenuItem>
                                        )}
                                    </Select>
                                    {regionIdError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bölge seçimi zorunludur!</Typography>}
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={12}>
                                <CustomFormLabel htmlFor="workhouse-address" required>Adres</CustomFormLabel>
                                <CustomTextField
                                    id="workhouse-address"
                                    placeholder="Şantiye Adresi"
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

                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {editingId !== null ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili şantiyeyi güncelleyin" : ""}>
                                                <Button variant="contained" color="info" onClick={editWorkhouse} disabled={loadingButton}>
                                                    {loadingButton ? <><IconHelmet fontSize={20} /> Bekleniyor...</> : 'Düzenle'}
                                                </Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni şantiye moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir şantiye ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={insertWorkhouse} disabled={loadingButton}>
                                                        {loadingButton ? <><IconHelmet fontSize={20} /> Bekleniyor...</> : 'Yeni Şantiye Ekle'}
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
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <BlinkingButton
                                variant="contained"
                                color="secondary"
                                onClick={handleOpenDownloadFilteredModal}
                                isBlinking={true}
                                disabled={loadingData}
                                startIcon={<IconFileDownload />}
                            >
                                Filtrelenmişi İndir
                            </BlinkingButton>
                        )}
                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleOpenDownloadAllModal}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData}
                            >
                                Tümünü İndir
                            </Button>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Şantiye Ara"
                                variant="outlined"
                                fullWidth
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
                        <Grid item xs={12} sm={6} md={3}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
                                <StyledToggleButton value="all" aria-label="all workhouses">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active workhouses">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive workhouses">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Şantiyeler yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="workhouse table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    {/* Sütun Başlıkları */}
                                    {!workId && (
                                        <StyledTableCell sx={{ color: "#171c23" }}>
                                            <Typography variant="h6">İş</Typography>
                                        </StyledTableCell>
                                    )}
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} sx={{ color: "inherit" }}>
                                            <Typography variant="h6">İsim</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')} sx={{ color: "inherit" }}>
                                            <Typography variant="h6">Kod</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'address'} direction={orderBy === 'address' ? order : 'asc'} onClick={() => handleRequestSort('address')} sx={{ color: "inherit" }}>
                                            <Typography variant="h6">Adres</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <Typography variant="h6">Bölge</Typography>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} sx={{ color: "inherit" }}>
                                            <Typography variant="h6">Oluşturulma Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedWorkhouses.length > 0 ? (
                                    paginatedWorkhouses.map((row) => (
                                        <TableRow key={row.id}
                                            sx={{
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                ...(row.endDate
                                                    ? { backgroundColor: '#ffa7a76e' } // رنگ Hex مستقیم + Opacity
                                                    : {}
                                                )
                                            }}>
                                            {!workId && (
                                                <StyledTableCell>
                                                    <Typography variant="body1">{row.work?.title || '-'}</Typography>
                                                </StyledTableCell>
                                            )}
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.name}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.code}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                                <Box sx={{
                                                    maxHeight: '5em',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                }}>
                                                    <Typography variant="body1">{row.address}</Typography>
                                                </Box>
                                                {row.address.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm adresi gör" : ""}>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            sx={{ fontSize: "10px", padding: "2px 5px" }}
                                                            onClick={() => {
                                                                setSelectedAddress(row.address);
                                                                setOpenAddressModal(true);
                                                            }}
                                                        >
                                                            Devamını Oku
                                                        </Button>
                                                    </CustomTooltip>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{regionMap.get(row.region?.id) || 'Bilinmiyor'}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{formatDateDisplay(row.createAt)}</Typography>
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
                                                    {hasCreatePermission && (
                                                        <>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Detayları kaydet" : ""}>
                                                                <MuiMenuItem onClick={handleNavigateToDetails}>
                                                                    <ListItemIcon><IconPlus width={18} /></ListItemIcon>
                                                                    Detayları Kaydet
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Depoyu bu projeye ekle" : ""}>
                                                                <MuiMenuItem onClick={handleInsertStoresClick}>
                                                                    <ListItemIcon><IconBoxSeam width={18} /></ListItemIcon>
                                                                    Şantiye Deposu Ekle
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                        </>
                                                    )}
                                                    {hasCreatePermission && selectedRowForMenu && selectedRowForMenu.endDate === null && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Çalışan atama sayfasına git" : ""}>
                                                            <MuiMenuItem onClick={handleAssignPersonnel}>
                                                                <ListItemIcon><IconHelmet width={18} /></ListItemIcon>
                                                                Çalışan Atama
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasEditPermission && selectedRowForMenu && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu şantiyeyi kapat (Pasif yap)" : ""}>
                                                            <MuiMenuItem onClick={handleOpenCloseWorkhouseModal}>
                                                                <ListItemIcon><IconX width={18} /></ListItemIcon>
                                                                Şantiye Kapatma
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu şantiyeyi düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                                Düzenlemek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu şantiyeyi sil" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                                                Silmek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Şantiyeyi indir" : ""}>
                                                            <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                                Bu satırı indir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={workId === undefined ? 7 : 6} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Bu işe ait hiç şantiye bulunamadı.
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
                    count={displayedWorkhouses.length}
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
            <DeleteWorkhouse
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                workhouseIdToDelete={workhouseIdToDelete}
                workhouseNameToDelete={workhouseNameToDelete}
                showAlert={showAlert}
                onDeleteSuccess={() => fetchWorkhouses(workId)}
            />
            {/* Modal for all downloads */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Şantiyeleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadAll('pdf', false)}
                        >
                            Satırı PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadAll('excel', false)}
                        >
                            Satırı Excel Olarak İndir
                        </Button>
                        <Button variant="outlined" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadAll('pdf', true)}
                        >
                            Detaylı PDF Olarak İndir
                        </Button>
                        <Button variant="outlined" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadAll('excel', true)}
                        >
                            Detaylı Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadAllModal} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal for filtered downloads */}
            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Şantiyeleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadFiltered('pdf', false)}
                        >
                            Basit PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadFiltered('excel', false)}
                        >
                            Basit Excel Olarak İndir
                        </Button>
                        <Button variant="outlined" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadFiltered('pdf', true)}
                        >
                            Detaylı PDF Olarak İndir
                        </Button>
                        <Button variant="outlined" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadFiltered('excel', true)}
                        >
                            Detaylı Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadFilteredModal} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal for downloading a single row */}
            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadRow('pdf', false)}
                        >
                            Basit PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadRow('excel', false)}
                        >
                            Basit Excel Olarak İndir
                        </Button>
                        <Button variant="outlined" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadRow('pdf', true)}
                        >
                            Detaylı PDF Olarak İndir
                        </Button>
                        <Button variant="outlined" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadRow('excel', true)}
                        >
                            Detaylı Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRowDownloadModal} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openCloseWorkhouseModal}
                onClose={handleCloseWorkhouseModal}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ color: 'error.main' }}>Şantiye Kapatma Onayı</DialogTitle>
                <DialogContent>
                    <Typography mb={2}>
                        {workhouseToClose?.name} adlı şantiyeyi kapatmak için bitiş tarihini
                        seçin. Bu işlem, şantiyeyi pasif duruma getirecektir.
                    </Typography>
                    {/* 🚀 افزودن DatePicker */}
                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                        <DatePicker
                            label="Bitiş Tarihi"
                            value={closureDate}
                            inputFormat="dd/MM/yyyy"
                            onChange={(newValue) => setClosureDate(newValue)}
                            renderInput={(params) => <TextField {...params} size="small" fullWidth error={!closureDate && isClosingButtonLoading} />}
                        />
                    </LocalizationProvider>
                    {/* پایان DatePicker */}

                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWorkhouseModal} color="secondary">
                        İptal Et
                    </Button>
                    <Button
                        onClick={closeWorkhouse}
                        color="error"
                        disabled={isClosingButtonLoading || !closureDate}
                        variant="contained"
                    >
                        {isClosingButtonLoading ? 'Kapatılıyor...' : 'Evet, Kapat'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListWorkhouses;
