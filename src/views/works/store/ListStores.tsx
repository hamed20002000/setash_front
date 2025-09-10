import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem as MuiMenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, FormControl, InputLabel, Select, ListItemText, Autocomplete,
    List,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown, IconFileDownload,
    IconArrowRight,
    IconReceipt,
    IconX
} from '@tabler/icons-react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteStore from './DeleteStore';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import { useAuth } from 'src/context/AuthContext';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";


export const formatDateDisplay = (dateString: string | null): string => {
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

interface StoreType {
    id: number;
    name: string;
    code: string;
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
    workhouse: {
        id: number;
        name: string;
        code: string;
        address: string;
        createAt: string;
        recordStatus: number;
    } | null;
}

interface WorkhouseType {
    id: number;
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: number;
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

type SortableStoreKeys = keyof Pick<StoreType, 'name' | 'code' | 'address' | 'createAt' | 'recordStatus'>;

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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableStoreKeys): (a: StoreType, b: StoreType) => number => {
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


// ✅ New component for rendering the tree menu items
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
                }}
            >
                <Stack direction="row" alignItems="center" width="100%">
                    {hasChildren ? (
                        <IconButton
                            onClick={(e) => e.stopPropagation()}
                            size="small"
                            sx={{ mr: 1, p: 0.5, visibility: searchQuery !== '' ? 'hidden' : 'visible' }}
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

// ✅ New filter function for the tree structure with auto-expansion logic
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
            return null;
        })
        .filter(Boolean) as RegionNode[];
};


const ListStores = () => {
    const navigate = useNavigate();
    const { workhouseId } = useParams<{ workhouseId: string }>();

    console.log('Workhouse ID:', workhouseId);
    console.log('Is Workhouse ID present?', !!workhouseId);

    const [name, setName] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);

    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [displayedStores, setDisplayedStores] = useState<StoreType[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableStoreKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<StoreType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [storeIdToDelete, setStoreIdToDelete] = useState<number | null>(null);
    const [storeNameToDelete, setStoreNameToDelete] = useState<string>('');

    const [nameError, setNameError] = useState<boolean>(false);
    const [codeError, setCodeError] = useState<boolean>(false);
    const [addressError, setAddressError] = useState<boolean>(false);
    const [regionIdError, setRegionIdError] = useState<boolean>(false);
    const [workhouseIdError, setWorkhouseIdError] = useState<boolean>(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [regionOptions, setRegionOptions] = useState<FlattenedRegionType[]>([]);
    const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());
    const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
    const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    const [regionSearchQuery, setRegionSearchQuery] = useState('');

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [workhouseInfo, setWorkhouseInfo] = useState<WorkhouseType | null>(null);

    const [openAddressModal, setOpenAddressModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');

    const [isFilterActive, setIsFilterActive] = useState(false);



    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

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

    const fetchWorkhouseInfo = useCallback(async () => {
        if (!workhouseId) return;
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-workhouse-by-id/${workhouseId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setWorkhouseInfo(response.data.data);
            } else {
                showAlert('Şantiye bilgileri alınamadı.', 'error');
            }
        } catch (e) {
            showAlert('Şantiye bilgileri yüklenirken bir hata oluştu.', 'error');
        }
    }, [workhouseId, navigate]);

    const getWorkhousesList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                debugger
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else {
                showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Şantiye listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        }
    }, [navigate]);

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

    const fetchStores = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-stores", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                let allStores = response.data.data as StoreType[];
                debugger
                if (workhouseId) {
                    allStores = allStores.filter((store) => Number(store.workhouse?.id) === Number(workhouseId));
                }

                const StoresWithStatus = allStores.map((item) => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setStoresList(StoresWithStatus);
            } else {
                showAlert(response.data.message || 'Mağazalar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Mağazalar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [workhouseId, navigate]);


    useEffect(() => {
        fetchRegions();
        fetchStores();
        if (workhouseId) {
            fetchWorkhouseInfo();
        } else {
            getWorkhousesList();
        }
    }, [fetchRegions, fetchStores, workhouseId, fetchWorkhouseInfo, getWorkhousesList]);


    useEffect(() => {
        const filteredBySearchAndStatus = storesList.filter(wh => {
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
        setDisplayedStores(sortedData);
        setPage(0);
    }, [storesList, searchTerm, statusFilter, order, orderBy, startDate, endDate]); // 👈 وابستگی‌های جدید


    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    const paginatedStores = useMemo(() => {
        return displayedStores.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedStores, page, rowsPerPage]);

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

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: StoreType) => {
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

            if (!workhouseId && selectedRowForMenu.workhouse) {
                setSelectedWorkhouseId(selectedRowForMenu.workhouse.id);
            }

            setNameError(false);
            setCodeError(false);
            setAddressError(false);
            setRegionIdError(false);
            setWorkhouseIdError(false);

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
            setStoreIdToDelete(selectedRowForMenu.id);
            setStoreNameToDelete(selectedRowForMenu.name);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setStoreIdToDelete(null);
        setStoreNameToDelete('');
        fetchStores();
    };

    const resetFormAndState = () => {
        setName('');
        setCode('');
        setAddress('');
        setSelectedRegionId(null);
        setSelectedWorkhouseId(null);
        setEditingId(null);
        setNameError(false);
        setCodeError(false);
        setAddressError(false);
        setRegionIdError(false);
        setWorkhouseIdError(false);
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
        if (!workhouseId && !selectedWorkhouseId) {
            setWorkhouseIdError(true);
            isValid = false;
        } else {
            setWorkhouseIdError(false);
        }
        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    const insertStore = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                name,
                code,
                address,
                regionId: Number(selectedRegionId),
                workhouseId: workhouseId ? Number(workhouseId) : Number(selectedWorkhouseId),
            };
            const response = await axios.post(server.baseurl + server.initialoperations + "create-store",
                payload, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Şantiye başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchStores();
            } else {
                showAlert(response.data.message || 'Şantiye eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Şantiye eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editStore = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                id: Number(editingId),
                name,
                code,
                address,
                regionId: Number(selectedRegionId),
                workhouseId: workhouseId ? Number(workhouseId) : Number(selectedWorkhouseId),
            };
            const response = await axios.put(server.baseurl + server.initialoperations + "update-store", payload, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchStores();
            } else {
                showAlert(response.data.message || 'Şantiye güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Şantiye güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-store",
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
                showAlert(`Şantiye başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetFormAndState();
                fetchStores();
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
    const handleRequestSort = (property: SortableStoreKeys) => {
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

    const handleDownloadAllStoresPDF = () => {
        // Use the full, unfiltered storesList
        if (!storesList || storesList.length === 0) {
            showAlert('PDF oluşturulacak mağaza bulunamadı.', 'warning');
            return;
        }

        showAlert('Tüm mağazalar indiriliyor...', 'info');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Add font for Turkish characters
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Tüm Mağazalar Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);

            // This report is unfiltered, so we can't display filter dates.
            doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
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

        const columns = [
            "İsim", "Kod", "Adres", "Bölge",
            ...(!workhouseId ? ["Şantiye"] : []),
            "Oluşturulma Tarihi",
            "Durum"
        ];

        // Use the unfiltered storesList for the table rows
        const rows = storesList.map(row => [
            row.name || '-',
            row.code || '-',
            row.address || '-',
            row.region?.name || '-',
            ...(!workhouseId ? [row.workhouse?.name || '-'] : []),
            formatDateDisplay(row.createAt),
            row.status,
        ]);

        try {
            autoTable(doc, {
                startY: 50,
                head: [columns],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 30 },
                    ...(!workhouseId ? { 4: { cellWidth: 30 } } : {}),
                    [columns.length - 2]: { cellWidth: 25 },
                    [columns.length - 1]: { cellWidth: 15 },
                },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });
            doc.save('Tum_Şantiye_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };
    const handleDownloadFilteredStoresPDF = () => {
        // 🚀 استفاده از displayedStores که از قبل فیلتر شده است
        if (!displayedStores || displayedStores.length === 0) {
            showAlert('PDF oluşturulacak Şantiye bulunamadı.', 'warning');
            return;
        }
        showAlert('Tüm Mağazalar indiriliyor...', 'info');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Tüm Mağazalar Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);

            // 🚀 نمایش تاریخ فیلتر شده در هدر
            doc.text(`Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}`, pageWidth - 15, 40, { align: 'right' });
            doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 47, { align: 'right' });
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

        const columns = [
            "İsim", "Kod", "Adres", "Bölge",
            ...(!workhouseId ? ["Şantiye"] : []),
            "Oluşturulma Tarihi",
            "Durum"
        ];

        // 🚀 استفاده از displayedStores برای ایجاد سطرها
        const rows = displayedStores.map(row => [
            row.name || '-',
            row.code || '-',
            row.address || '-',
            row.region?.name || '-',
            ...(!workhouseId ? [row.workhouse?.name || '-'] : []),
            formatDateDisplay(row.createAt),
            row.status,
        ]);

        try {
            autoTable(doc, {
                startY: 50,
                head: [columns],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 30 },
                    ...(!workhouseId ? { 4: { cellWidth: 30 } } : {}),
                    [columns.length - 2]: { cellWidth: 25 },
                    [columns.length - 1]: { cellWidth: 15 },
                },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });
            doc.save('Filtrelenmis_Tum_Şantiye_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                {workhouseId && workhouseInfo && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip label={`Şantiye: ${workhouseInfo.name}`} color="primary" variant="filled" size="small" />
                            <Chip label={`Kod: ${workhouseInfo.code}`} color="success" variant="filled" size="small" />
                        </Stack>
                        <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                            endIcon={<IconArrowRight size={20} />}>
                            Geri Dön
                        </Button>
                    </Stack>
                )}
                {(hasCreatePermission || hasEditPermission) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Şantiye Düzenle' : 'Şantiyenin Depo Kaydı'}</Typography>

                        <Grid container spacing={2}>
                            {!workhouseId && (
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel htmlFor="workhouse-selection" required>Şantiye Seçimi</CustomFormLabel>
                                    <Autocomplete
                                        id="workhouse-selection"
                                        options={workhousesList}
                                        getOptionLabel={(option) => option.name}
                                        value={workhousesList.find(wh => wh.id === selectedWorkhouseId) || null}
                                        onChange={(_event, newValue) => {
                                            setSelectedWorkhouseId(newValue ? newValue.id : null);
                                            if (workhouseIdError && newValue) setWorkhouseIdError(false);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Şantiye Seçin"
                                                size="small"
                                                error={workhouseIdError}
                                                helperText={workhouseIdError ? "Bu alan zorunludur!" : ""}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}

                            <Grid item xs={12} sm={workhouseId ? 4 : 6}>
                                <CustomFormLabel htmlFor="store-name" required>İsim</CustomFormLabel>
                                <CustomTextField
                                    id="store-name"
                                    placeholder="Şantiye Adı"
                                    fullWidth
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
                            <Grid item xs={12} sm={workhouseId ? 4 : 6}>
                                <CustomFormLabel htmlFor="store-code" required>Kod</CustomFormLabel>
                                <CustomTextField
                                    id="store-code"
                                    placeholder="Şantiye Kodu"
                                    fullWidth
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
                            <Grid item xs={12} sm={workhouseId ? 4 : 6}>
                                <CustomFormLabel htmlFor="region-selection" required>Bölge Seçimi</CustomFormLabel>
                                <FormControl size="small" error={regionIdError} fullWidth>
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
                                <CustomFormLabel htmlFor="store-address" required>Adres</CustomFormLabel>
                                <CustomTextField
                                    id="store-address"
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
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili mağazayı güncelleyin" : ""}>
                                                <Button variant="contained" color="info" onClick={editStore} disabled={loadingButton}>
                                                    {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                                </Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni Şantiye moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir Şantiye ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={insertStore} disabled={loadingButton}>
                                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Şantiyenin Deposunu Ekle'}
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
                    <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}
            </div>


            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Şantiye indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadFilteredStoresPDF}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData}
                                >
                                    Filtrelenmişi Şantiye Detaylı İndir (PDF)
                                </BlinkingButton>
                            </CustomTooltip>

                        )}
                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleDownloadAllStoresPDF}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || storesList.length === 0}
                            >
                                Tüm Şantiye Detaylı İndir (PDF)
                            </Button>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">Şantiye Detaylı  Listesi</Typography>

                    </Stack>

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
                                <StyledToggleButton value="all" aria-label="all Stores">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active Stores">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive Stores">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Şantiye yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="store table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} style={{ color: "#171c23" }}><Typography variant="h6">İsim</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')} style={{ color: "#171c23" }}><Typography variant="h6">Kod</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'address'} direction={orderBy === 'address' ? order : 'asc'} onClick={() => handleRequestSort('address')} style={{ color: "#171c23" }}><Typography variant="h6">Adres</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="h6">Bölge</Typography>
                                    </TableCell>
                                    {!workhouseId && (
                                        <TableCell>
                                            <Typography variant="h6">Şantiye</Typography>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} style={{ color: "#171c23" }}><Typography variant="h6">Oluşturulma Tarihi</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')} style={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedStores.length > 0 ? (
                                    paginatedStores.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
                                            <TableCell>
                                                <Typography variant="h6" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {row.address.length > 50 ? `${row.address.substring(0, 50)}...` : row.address}
                                                </Typography>
                                                {row.address.length > 50 && (
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            setSelectedAddress(row.address);
                                                            setOpenAddressModal(true);
                                                        }}
                                                    >
                                                        Devamını Oku
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell><Typography variant="h6">{regionMap.get(row.region?.id) || 'Bilinmiyor'}</Typography></TableCell>
                                            {!workhouseId && (
                                                <TableCell><Typography variant="h6">{row.workhouse?.name || '-'}</Typography></TableCell>
                                            )}
                                            <TableCell><Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography></TableCell>
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
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <Menu
                                                    id={`basic-menu-${row.id}`}
                                                    anchorEl={anchorEl}
                                                    open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                                >

                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu mağazanın fişlerine git" : ""}>
                                                        <MuiMenuItem onClick={() => {
                                                            if (selectedRowForMenu) {
                                                                navigate(`/store/list-store-receipt/${selectedRowForMenu.id}`);
                                                                handleCloseMenu();
                                                            }
                                                        }}>
                                                            <ListItemIcon>
                                                                <IconReceipt width={18} />
                                                            </ListItemIcon>
                                                            Şantiye Fişleri
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 ? (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu mağazayı pasif yap" : ""}>
                                                            <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 1)}>
                                                                <ListItemIcon>
                                                                    <DoNotDisturbOnRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Pasif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu mağazayı aktif yap" : ""}>
                                                            <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 0)}>
                                                                <ListItemIcon>
                                                                    <DoneRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Aktif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu mağazayı düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                                Düzenle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu mağazayı sil" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                                                Silmek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç Şantiye bulunamadı.
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
                    count={displayedStores.length}
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

            <DeleteStore
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                storeIdToDelete={storeIdToDelete}
                storeNameToDelete={storeNameToDelete}
                showAlert={showAlert}
                onDeleteSuccess={fetchStores}
            />
        </>
    );
};

export default ListStores;