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
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    List
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { styled, keyframes } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown,
    IconFileDownload, IconBoxSeam, IconPackage,
    IconX,
    IconArrowsLeftRight,
    IconRotate2
} from '@tabler/icons-react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteWarehouse from './DeleteWarehouse';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import ViewWarehouseBalanceModal from './ViewWarehouseBalanceModal';
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
interface WarehouseType {
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

type SortableWarehouseKeys = keyof Pick<WarehouseType, 'name' | 'code' | 'address' | 'createAt' | 'recordStatus'>;

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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableWarehouseKeys): (a: WarehouseType, b: WarehouseType) => number => {
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

interface RegionTreeSelectMenuItemProps {
    node: RegionNode;
    onSelect: (regionId: number) => void;
    selectedId: number | null;
    onCloseParentSelect: () => void;
    searchQuery: string;
    setExpandedNodes: React.Dispatch<React.SetStateAction<Set<number>>>;
    expandedNodes: Set<number>;
}

const RegionTreeSelectMenuItem: React.FC<RegionTreeSelectMenuItemProps> = ({ node, onSelect, selectedId, onCloseParentSelect, searchQuery, setExpandedNodes, expandedNodes }) => {
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = useMemo(() => searchQuery !== '' || (expandedNodes.has(node.id) && hasChildren), [searchQuery, expandedNodes, node.id, hasChildren]);

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
                            onClick={handleToggleCollapse}
                            size="small"
                            sx={{ mr: 1, p: 0.5, visibility: searchQuery !== '' ? 'hidden' : 'visible' }}
                        >
                            {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 16 + 8 }} />
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
                            setExpandedNodes={setExpandedNodes}
                            expandedNodes={expandedNodes}
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
            return null;
        })
        .filter(Boolean) as RegionNode[];
};
const ListWarehouses = () => {
    const navigate = useNavigate();

    const [name, setName] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

    const [WarehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableWarehouseKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<WarehouseType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [WarehouseIdToDelete, setWarehouseIdToDelete] = useState<number | null>(null);
    const [WarehouseNameToDelete, setWarehouseNameToDelete] = useState<string>('');

    const [nameError, setNameError] = useState<boolean>(false);
    const [codeError, setCodeError] = useState<boolean>(false);
    const [addressError, setAddressError] = useState<boolean>(false);
    const [regionIdError, setRegionIdError] = useState<boolean>(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [regionOptions, setRegionOptions] = useState<FlattenedRegionType[]>([]);
    const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());

    const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
    const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    const [regionSearchQuery, setRegionSearchQuery] = useState('');

    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    const [openAddressModal, setOpenAddressModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');

    const { isTooltipGloballyEnabled } = useTooltip();
    const [openBalanceModal, setOpenBalanceModal] = useState(false);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
    const [selectedWarehouseName, setSelectedWarehouseName] = useState('');
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [openAllDownloadModal, setOpenAllDownloadModal] = useState(false);
    const [openFilteredDownloadModal, setOpenFilteredDownloadModal] = useState(false);



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
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazdırmak"), [allowedOperations, currentMenuOpIds]);

    const filteredRegionTree = useMemo(() => {
        return filterRegionTree(regionTree, regionSearchQuery);
    }, [regionTree, regionSearchQuery]);


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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchWarehouses = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }

        let requestParams = {};

        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` },
                params: requestParams
            });
            if (response.data.httpStatusCode === 200) {
                const allWarehouses = response.data.data as WarehouseType[];
                const WarehousesWithStatus = allWarehouses.map((item) => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setWarehousesList(WarehousesWithStatus);
            } else {
                showAlert(response.data.message || 'İşler yüklenirken bir hata oluştu.', 'error');
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
        fetchRegions();
        fetchWarehouses();
    }, [fetchRegions, fetchWarehouses]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

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

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: WarehouseType) => {
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

            setNameError(false);
            setCodeError(false);
            setAddressError(false);
            setRegionIdError(false);

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
            setWarehouseIdToDelete(selectedRowForMenu.id);
            setWarehouseNameToDelete(selectedRowForMenu.name);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setWarehouseIdToDelete(null);
        setWarehouseNameToDelete('');
        fetchWarehouses();
    };

    const resetFormAndState = () => {
        setName('');
        setCode('');
        setAddress('');
        setSelectedRegionId(null);
        setEditingId(null);
        setNameError(false);
        setCodeError(false);
        setAddressError(false);
        setIsFormVisible(false);
        setRegionIdError(false);
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
        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };

    const insertWarehouse = async () => {
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
                code,
                address,
                regionId: Number(selectedRegionId)
            };
            const response = await axios.post(server.baseurl + server.initialoperations + "create-Warehouse",
                payload, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni depo başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchWarehouses();
            } else {
                showAlert(response.data.message || 'depo eklenirken bir hata oluştu.', 'error');
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

    const editWarehouse = async () => {
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
                code,
                address,
                regionId: Number(selectedRegionId)
            };
            const response = await axios.put(server.baseurl + server.initialoperations + "update-Warehouse", payload, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('depo başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchWarehouses();
            } else {
                showAlert(response.data.message || 'depo güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message == "Warehouse with this code already exists!" ? "Bu koda sahip depo zaten mevcut!" :
                    'depo güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

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
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-Warehouse",
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
                showAlert(`Depo başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetFormAndState();
                fetchWarehouses();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
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
    const handleRequestSort = (property: SortableWarehouseKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const allWarehousesForReport = useMemo(() => {
        return stableSort(WarehousesList, getComparator(order, orderBy));
    }, [WarehousesList, order, orderBy]);

    const filteredAndSortedWarehousesList = useMemo(() => {
        const filteredByAllCriteria = WarehousesList.filter(wh => {
            const matchesSearch = wh.name.toLowerCase().includes(searchTerm.toLowerCase()) || wh.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && wh.recordStatus === 0) ||
                (statusFilter === 'inactive' && wh.recordStatus === 1);
            const warehouseCreateDate = new Date(wh.createAt);
            const isWithinDateRange =
                (!startDate || warehouseCreateDate >= startDate) &&
                (!endDate || warehouseCreateDate <= endDate);
            return matchesSearch && matchesStatus && isWithinDateRange;
        });
        return stableSort(filteredByAllCriteria, getComparator(order, orderBy));
    }, [WarehousesList, searchTerm, statusFilter, startDate, endDate, order, orderBy]);

    const paginatedWarehouses = filteredAndSortedWarehousesList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


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
                            <ListItemText primary={node.name} />
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
    const applyPdfLayout = (pdfDoc: jsPDF, title: string) => {
        const pageWidth = pdfDoc.internal.pageSize.getWidth();
        const pageHeight = pdfDoc.internal.pageSize.getHeight();

        try {
            pdfDoc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);
        } catch (e) {
            console.error("Logo yüklenemedi", e);
        }

        pdfDoc.setFont('NotoSans', 'normal');
        pdfDoc.setFontSize(14);
        pdfDoc.setTextColor(40);
        pdfDoc.text(title, pageWidth / 2, 25, { align: 'center' });
        pdfDoc.setFontSize(10);
        pdfDoc.setFont('NotoSans', 'bold');
        pdfDoc.text('Rapor Tarihi:', 15, 40);
        pdfDoc.setFont('NotoSans', 'normal');
        const dateText = formatDateDisplay(new Date().toISOString());
        pdfDoc.text(dateText, 40, 40);
        pdfDoc.setDrawColor(66, 66, 66);
        pdfDoc.setLineWidth(0.5);
        pdfDoc.line(15, 45, pageWidth - 15, 45);
        pdfDoc.setFontSize(8);
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

        const pageNumber = (pdfDoc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (pdfDoc as any).internal.getNumberOfPages();
        pdfDoc.setTextColor(40);
        pdfDoc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        pdfDoc.setFont('NotoSans', 'normal');
        pdfDoc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
        pdfDoc.setFont('NotoSans', 'normal');

        pdfDoc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);
    };
    const handleDownloadAllWarehousesPDF = async () => {
        if (!allWarehousesForReport || allWarehousesForReport.length === 0) {
            showAlert('PDF oluşturulacak depo bulunamadı.', 'warning');
            return;
        }
        setOpenAllDownloadModal(false);
        const doc = new jsPDF();

        try {
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');

            const rows = allWarehousesForReport.map(wh => [
                wh.name || '-',
                wh.code || '-',
                wh.address || '-',
                wh.region?.name || '-',
                formatDateDisplay(wh.createAt),
                wh.status,
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['İsim', 'Kod', 'Adres', 'Bölge', 'Tarih', 'Durum']],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [66, 66, 66], textColor: [255, 255, 255] },
                didDrawPage: () => applyPdfLayout(doc, 'Tüm Depolar Raporu')
            });

            doc.save('Tum_Depolar_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (error: any) {
            showAlert('Hata: ' + error.message, 'error');
        }
    };

    const handleDownloadFilteredPDF = async () => {
        if (!filteredAndSortedWarehousesList || filteredAndSortedWarehousesList.length === 0) {
            showAlert('Filtrelenmiş depo bulunamadı.', 'warning');
            return;
        }
        setOpenFilteredDownloadModal(false);
        const doc = new jsPDF();

        try {
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');

            const rows = filteredAndSortedWarehousesList.map(wh => [
                wh.name || '-',
                wh.code || '-',
                wh.address || '-',
                wh.region?.name || '-',
                formatDateDisplay(wh.createAt),
                wh.status,
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['İsim', 'Kod', 'Adres', 'Bölge', 'Tarih', 'Durum']],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8 },
                headStyles: { fillColor: [66, 66, 66] },
                didDrawPage: () => {
                    applyPdfLayout(doc, 'Filtrelenmiş Depolar Raporu');
                    doc.setFontSize(8);
                    doc.text(`Filtre: ${searchTerm || 'Yok'} | Durum: ${statusFilter}`, 15, 52);
                }
            });

            doc.save('Filtrelenmis_Depolar_Raporu.pdf');
        } catch (error: any) {
            showAlert('Hata: ' + error.message, 'error');
        }
    };
    const handleDownloadBalancePDF = async (warehouseName: string, balanceData: any[]) => {
        if (!balanceData || balanceData.length === 0) {
            showAlert('Envanter bulunamadı.', 'warning');
            return;
        }
        const doc = new jsPDF();

        try {
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');

            const rows = balanceData.map(item => [item.name, item.balance]);

            autoTable(doc, {
                startY: 55,
                head: [['Ürün Adı', 'Miktar']],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9 },
                headStyles: { fillColor: [66, 66, 66] },
                columnStyles: { 1: { halign: 'left' } },
                didDrawPage: () => applyPdfLayout(doc, `${warehouseName} Envanter Raporu`)
            });

            doc.save(`${warehouseName}_Envanter.pdf`);
        } catch (error: any) {
            showAlert('Hata: ' + error.message, 'error');
        }
    };


    const handleExportExcel = async (dataToExport: WarehouseType[], isFiltered: boolean) => {
        setOpenAllDownloadModal(false);
        setOpenFilteredDownloadModal(false);
        if (!dataToExport || dataToExport.length === 0) {
            showAlert('Dışa aktarılacak depo bulunamadı.', 'warning');
            return;
        }
        showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Depolar Raporu', { views: [{ rightToLeft: false }] });

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

            const titleText = isFiltered ? 'Filtrelenmiş Depolar Raporu' : 'Tüm Depolar Raporu';
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells('A1:G1');

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
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

            const tableHeaders = ['İsim', 'Kod', 'Adres', 'Bölge', 'Oluşturulma Tarihi', 'Durum'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            dataToExport.forEach(wh => {
                const row = worksheet.addRow([
                    wh.name || '-',
                    wh.code || '-',
                    wh.address || '-',
                    wh.region?.name || '-',
                    formatDateDisplay(wh.createAt),
                    wh.status,
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

            addCompanyInfo(worksheet, 6);

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
            const fileNamePrefix = isFiltered ? 'Filtrelenmis_Depolar' : 'Tüm_Depolar';
            const fileName = `${fileNamePrefix}_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    };

    const handleDownloadBalanceExcel = async (warehouseName: string, balanceData: any[]) => {
        if (!balanceData || balanceData.length === 0) {
            showAlert('Dışa aktarılacak envanter bulunamadı.', 'warning');
            return;
        }
        setOpenBalanceModal(false);

        showAlert('Envanter Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Envanter Raporu', { views: [{ rightToLeft: false }] });

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

            const titleRow = worksheet.addRow([`${warehouseName} Envanter Raporu`]);
            if (titleRow) {
                titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
                titleRow.getCell(1).alignment = { horizontal: 'center' };
            }
            worksheet.mergeCells('A1:C1');

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) {
                dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false };
                dateRow.getCell(1).alignment = { horizontal: 'left' };
            }
            worksheet.mergeCells('A2:C2');

            worksheet.addRow([]);

            const tableHeaders = ['Ürün Adı', 'Miktar'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => {
                cell.style = fullHeaderStyle;
            });

            balanceData.forEach(item => {
                const row = worksheet.addRow([
                    item.name || '-',
                    item.balance || '0'
                ]);
                row.eachCell((cell) => {
                    cell.style = bodyStyle;
                });
            });

            addCompanyInfo(worksheet, 2);

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
            const fileName = `${warehouseName}_Envanter_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Envanter Excel dosyası başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        }
    };

    const handleWarehouseTransferClick = () => {
        if (selectedRowForMenu) {
            const warehouseId = selectedRowForMenu.id;
            navigate(`/warehousespatch/betweenwarehusedispatch/${warehouseId}`);
        }
        handleCloseMenu();
    };

    const handleViewBalanceClick = () => {
        if (selectedRowForMenu) {
            setSelectedWarehouseId(selectedRowForMenu.id);
            setSelectedWarehouseName(selectedRowForMenu.name);
            setOpenBalanceModal(true);
        }
        handleCloseMenu();
    };

    const handleDispatchClick = () => {
        if (selectedRowForMenu) {
            const warehouseId = selectedRowForMenu.id;
            navigate(`/warehouse/list-warehouse-dispatch/${warehouseId}`);
        }
        handleCloseMenu();
    };

    const handleCloseBalanceModal = () => {
        setOpenBalanceModal(false);
        setSelectedWarehouseId(null);
        setSelectedWarehouseName('');
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };


    const handleDepoDispatchReturnToCenterClick = () => {
        if (selectedRowForMenu) {
            const warehouseId = selectedRowForMenu.id;
            navigate(`/warehouse/list-warehouse-dispatch-return-to-center/${warehouseId}`);
        }
        handleCloseMenu();
    };

    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Depolar</Typography>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Depolar Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni Depolar Kaydet
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
                            <CustomFormLabel htmlFor="Warehouse-name" required>İsim</CustomFormLabel>
                            <CustomTextField
                                id="Warehouse-name"
                                placeholder="Depo Adı"
                                size="small"
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setName(e.target.value);
                                    if (nameError && e.target.value.trim()) setNameError(false);
                                }}
                                inputRef={nameInputRef}
                                error={nameError}
                                helperText={nameError ? "İsim alanı boş bırakılamaz!" : ""}
                                sx={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="Warehouse-code" required>Kod</CustomFormLabel>
                            <CustomTextField
                                id="Warehouse-code"
                                placeholder="Depo Kodu"
                                size="small"
                                value={code}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setCode(e.target.value);
                                    if (codeError && e.target.value.trim()) setCodeError(false);
                                }}
                                error={codeError}
                                helperText={codeError ? "Kod alanı boş bırakılamaz!" : ""}
                                sx={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
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
                                                setExpandedNodes={setExpandedNodes}
                                                expandedNodes={expandedNodes}
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
                            <CustomFormLabel htmlFor="Warehouse-address" required>Adres</CustomFormLabel>
                            <CustomTextField
                                id="Warehouse-address"
                                placeholder="Depo Adresi"
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
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili depoyu güncelleyin" : ""}>
                                            <Button variant="contained" color="info" onClick={editWarehouse} disabled={loadingButton}>
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni depo moduna dön" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>İptal Et</Button>
                                        </CustomTooltip>
                                    </>
                                ) : (
                                    <>
                                        {hasCreatePermission && (
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir depo ekle" : ""}>
                                                <Button variant="contained" color="success" onClick={insertWarehouse} disabled={loadingButton}>
                                                    {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Depo Ekle'}
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
            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle depoları indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="info"
                                    onClick={() => setOpenFilteredDownloadModal(true)}
                                    startIcon={<IconFileDownload />}
                                    isBlinking={isFilterActive}
                                    disabled={loadingData}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri indir" : ""}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setOpenAllDownloadModal(true)}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Depo Ara"
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
                                <StyledToggleButton value="all" aria-label="all Warehouses">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active Warehouses">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive Warehouses">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Depolar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="Warehouse table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={orderBy === 'name'}
                                            direction={orderBy === 'name' ? order : 'asc'}
                                            onClick={() => handleRequestSort('name')}
                                            sx={{ color: "inherit" }}
                                        >
                                            <Typography variant="h6">İsim</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={orderBy === 'code'}
                                            direction={orderBy === 'code' ? order : 'asc'}
                                            onClick={() => handleRequestSort('code')}
                                            sx={{ color: "inherit" }}
                                        >
                                            <Typography variant="h6">Kod</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={orderBy === 'address'}
                                            direction={orderBy === 'address' ? order : 'asc'}
                                            onClick={() => handleRequestSort('address')}
                                            sx={{ color: "inherit" }}
                                        >
                                            <Typography variant="h6">Adres</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <Typography variant="h6">Bölge</Typography>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={orderBy === 'createAt'}
                                            direction={orderBy === 'createAt' ? order : 'asc'}
                                            onClick={() => handleRequestSort('createAt')}
                                            sx={{ color: "inherit" }}
                                        >
                                            <Typography variant="h6">Oluşturulma Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={orderBy === 'recordStatus'}
                                            direction={orderBy === 'recordStatus' ? order : 'asc'}
                                            onClick={() => handleRequestSort('recordStatus')}
                                            sx={{ color: "inherit" }}
                                        >
                                            <Typography variant="h6">Durum</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedWarehouses.length > 0 ? (
                                    paginatedWarehouses.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.name}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body1">{row.code}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell align="left">
                                                {row.address && row.address.trim().length > 0 ? (
                                                    <Button
                                                        variant="outlined"
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
                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Depolar arası transfer başlat" : ""}>
                                                            <MuiMenuItem onClick={handleWarehouseTransferClick}>
                                                                <ListItemIcon><IconArrowsLeftRight width={18} /></ListItemIcon>
                                                                Depolar Arası Transfer
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Depo'dan geri gönderme Sevk İşlemi" : ""}>
                                                        <MuiMenuItem onClick={handleDepoDispatchReturnToCenterClick}>
                                                            <ListItemIcon><IconRotate2 width={18} /></ListItemIcon>
                                                            İmha Edilecek Ürünleri Sevk Et
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Depo Sevk İşlemi" : ""}>
                                                            <MuiMenuItem onClick={handleDispatchClick}>
                                                                <ListItemIcon><IconBoxSeam width={18} /></ListItemIcon>
                                                                Sevk Et
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Depo envanterini görüntüle" : ""}>
                                                            <MuiMenuItem onClick={handleViewBalanceClick}>
                                                                <ListItemIcon><IconPackage width={18} /></ListItemIcon>
                                                                Envanteri Görüntüle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 ? (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Depoyu pasif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon>
                                                                Pasif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Depoyu aktif yap" : ""}>
                                                            <MuiMenuItem onClick={handleSetActive}>
                                                                <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon>
                                                                Aktif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Depoyu düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                                Düzenlemek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Depoyu sil" : ""}>
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
                                        <StyledTableCell colSpan={7} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Bu işe ait hiç depo bulunamadı.
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
                    count={filteredAndSortedWarehousesList.length}

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
            <DeleteWarehouse
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                WarehouseIdToDelete={WarehouseIdToDelete}
                WarehouseNameToDelete={WarehouseNameToDelete}
                showAlert={showAlert}
                onDeleteSuccess={fetchWarehouses}
            />
            <ViewWarehouseBalanceModal
                open={openBalanceModal}
                onClose={handleCloseBalanceModal}
                warehouseId={selectedWarehouseId}
                warehouseName={selectedWarehouseName}
                onDownloadPDF={handleDownloadBalancePDF}
                onDownloadExcel={handleDownloadBalanceExcel}
            />
            <Dialog
                open={openAllDownloadModal}
                onClose={() => setOpenAllDownloadModal(false)}
            >
                <DialogTitle>Tüm Depolar için Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconFileDownload />}
                            onClick={handleDownloadAllWarehousesPDF}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileDownload />}
                            onClick={() => handleExportExcel(WarehousesList, false)}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAllDownloadModal(false)} color="secondary">
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>
            {isFilterActive && (
                <Dialog
                    open={openFilteredDownloadModal}
                    onClose={() => setOpenFilteredDownloadModal(false)}
                >
                    <DialogTitle>Filtrelenmiş Depolar için Format Seçin</DialogTitle>
                    <DialogContent>
                        <Stack direction="column" spacing={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<IconFileDownload />}
                                onClick={handleDownloadFilteredPDF}
                            >
                                PDF Olarak İndir
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<IconFileDownload />}
                                onClick={() => handleExportExcel(filteredAndSortedWarehousesList, true)}
                            >
                                Excel Olarak İndir
                            </Button>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenFilteredDownloadModal(false)} color="secondary">
                            İptal
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default ListWarehouses;