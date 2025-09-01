import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, FormControl, InputLabel, Select, ListItemText, Autocomplete
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown, IconPlus, IconArrowRight, IconHelmet,
    IconFileSpreadsheet, IconFileText
} from '@tabler/icons-react';
import DeleteWorkhouse from './DeleteWorkHouse';
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
// interface WorkhouseDetailItem {
//     id: number;
//     item: {
//         name: string;
//         unit: {
//             title: string;
//         };
//     };
//     quantity: number;
//     description: string;
// }

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


const ListWorkhouses = () => {
    const { workId } = useParams<{ workId: string }>();
    const navigate = useNavigate();

    const [name, setName] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
    const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null); // ✅ New state for work combo

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [worksList, setWorksList] = useState<WorkType[]>([]); // ✅ New state for works combo
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
    const [workIdError, setWorkIdError] = useState<boolean>(false); // ✅ New state for work combo validation
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [regionOptions, setRegionOptions] = useState<FlattenedRegionType[]>([]);
    const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());
    const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
    const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
    // ✅ این خط را به ابتدای کامپوننت اضافه کنید
    const [displayedWorkhouses, setDisplayedWorkhouses] = useState<WorkhouseType[]>([]);
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
                    tenderTitle: response.data.data.tender?.title || 'N/A'
                });
            } else {
                showAlert('İş bilgileri alınamadı.', 'error');
            }
        } catch (e) {
            showAlert('İş bilgileri yüklenirken bir hata oluştu.', 'error');
        }
    }, [workId, navigate]);

    // ✅ Updated fetchWorkhouses to be a generic function
    const fetchWorkhouses = useCallback(async (workIdParam?: string) => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
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
            showAlert('Şantiyeler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    // ✅ New function to get list of all works for the combo box
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
                    tenderTitle: item.tender ? item.tender.title : 'N/A',
                    createAt: item.createAt,
                    recordStatus: item.recordStatus,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setWorksList(formattedData);
            } else {
                showAlert(result.data.message || 'İş listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('İş listesi yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
            showAlert('Bölgeler yüklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        }
    }, [navigate]);

    // ✅ Main useEffect to handle both modes
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
        const filteredBySearchAndStatus = workhousesList.filter(wh => {
            const matchesSearch = wh.name.toLowerCase().includes(searchTerm.toLowerCase()) || wh.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && wh.recordStatus === 0) ||
                (statusFilter === 'inactive' && wh.recordStatus === 1);
            return matchesSearch && matchesStatus;
        });

        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
        setDisplayedWorkhouses(sortedData);
        setPage(0);
    }, [workhousesList, searchTerm, statusFilter, order, orderBy]);

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
        setSelectedWorkId(null); // ✅ Reset workId state as well
        setEditingId(null);
        setNameError(false);
        setCodeError(false);
        setAddressError(false);
        setRegionIdError(false);
        setWorkIdError(false);
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
        if (!workId && !selectedWorkId) { // ✅ New validation for the work combo
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
            showAlert(e.response?.data?.message || 'Şantiye eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
            showAlert(e.response?.data?.message || 'Şantiye güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally {
            setLoadingButton(false);
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
    const handleRequestSort = (property: SortableWorkhouseKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const paginatedWorkhouses = useMemo(() => {
        const sortedData = stableSort(displayedWorkhouses, getComparator(order, orderBy));
        return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedWorkhouses, page, rowsPerPage, order, orderBy]);

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
                    <MenuItem
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
                    </MenuItem>
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

    const handleNavigateToDetails = () => {
        if (selectedRowForMenu) {
            navigate(`/workhouse/workhousedetails/${selectedRowForMenu.id}`);
        }
        handleCloseMenu();
    };


    const exportSingleWorkhouseWithDetailsPdf = async (workhouseId: number, workhouseName: string) => {
        showAlert(`Şantiye '${workhouseName}' detayları indiriliyor...`, 'info');

        const doc = new jsPDF();
        const docAny = doc as any;
        const workhouseData = workhousesList.find(w => w.id === workhouseId);

        if (!workhouseData) {
            showAlert('Şantiye bilgisi bulunamadı.', 'error');
            return;
        }

        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        docAny.setFont('NotoSans');

        const pageWidth = docAny.internal.pageSize.getWidth();
        const pageHeight = docAny.internal.pageSize.getHeight();

        const header = () => {
            docAny.addImage(Logo, 'PNG', 10, 10, 40, 25);
            docAny.setFontSize(18);
            docAny.text(`Şantiye Detayları: ${workhouseName}`, pageWidth - 15, 20, { align: 'right' });
            docAny.setFontSize(12);
            docAny.text(`Kodu: ${workhouseData.code || '-'}`, pageWidth - 15, 27, { align: 'right' });
            docAny.text(`Bölge: ${regionMap.get(workhouseData.region?.id) || '-'}`, pageWidth - 15, 34, { align: 'right' });
            docAny.text(`Oluşturulma Tarihi: ${formatDateDisplay(workhouseData.createAt)}`, pageWidth - 15, 41, { align: 'right' });
            if (workhouseData.work) {
                docAny.text(`İş: ${workhouseData.work.title}`, pageWidth - 15, 48, { align: 'right' });
            }
        };

        const footer = () => {
            docAny.setFontSize(10);
            docAny.setTextColor(0);
            docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            const pageCount = docAny.internal.getNumberOfPages();
            docAny.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        };

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası.', 'error');
            return;
        }

        try {
            const detailsResponse = await axios.get(
                `${server.baseurl + server.initialoperations}get-workhouse-details-by-workhouse-id/${workhouseId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (detailsResponse.data.httpStatusCode === 200 && detailsResponse.data.data.length > 0) {
                const details = detailsResponse.data.data;
                const detailColumns = ["Sahibi", "Fiyat", "Başlangıç Tarihi", "Bitiş Tarihi", "Açıklama", "Abonelikler"];
                const detailRows = details.map((detail: any) => [
                    detail.owner || '-',
                    detail.price || '-',
                    formatDateDisplay(detail.rentStartDate),
                    formatDateDisplay(detail.rentEndDate),
                    detail.description || '-',
                    // ✅ منطق جدید برای فرمت‌دهی Abonelikler
                    detail.subscription?.map((sub: any) => `${sub.title}: ${sub.no} (${sub.owner})`).join(', ') || '-'
                ]);

                autoTable(docAny, {
                    startY: 60,
                    head: [detailColumns],
                    body: detailRows,
                    theme: 'grid',
                    styles: {
                        font: 'NotoSans',
                        fontSize: 10,
                        cellPadding: 2,
                        overflow: 'linebreak'
                    },
                    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                    // ✅ تنظیم عرض ستون‌ها
                    columnStyles: {
                        0: { cellWidth: 20 },      // Sahibi
                        1: { cellWidth: 20 },      // Fiyat
                        2: { cellWidth: 30 },      // Başlangıç Tarihi
                        3: { cellWidth: 30 },      // Bitiş Tarihi
                        4: { cellWidth: 40 },      // Açıklama
                        5: { cellWidth: 'auto' }   // Abonelikler
                    },
                    didDrawPage: () => {
                        header();
                        footer();
                    },
                    showHead: 'everyPage',
                    margin: { top: 55, bottom: 20, left: 10, right: 10 }
                });

                docAny.save(`${workhouseName}_Detaylari.pdf`);
                showAlert('PDF başarıyla oluşturuldu.', 'success');
            } else {
                showAlert('Bu şantiye için detay bulunamadı.', 'warning');
            }
        } catch (error) {
            showAlert('Detaylar yüklenirken bir hata oluştu.', 'error');
        }
    };

    const exportAllWorkhousesWithDetailsPdf = async () => {
        showAlert('Tüm şantiyelerin detayları indiriliyor...', 'info');
        setLoadingData(true);

        const doc = new jsPDF();
        const docAny = doc as any;
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            showAlert('Kimlik doğrulama hatası.', 'error');
            setLoadingData(false);
            return;
        }

        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        docAny.setFont('NotoSans');

        const pageWidth = docAny.internal.pageSize.getWidth();
        const pageHeight = docAny.internal.pageSize.getHeight();

        for (const [index, workhouse] of workhousesList.entries()) {
            try {
                const detailsResponse = await axios.get(
                    `${server.baseurl + server.initialoperations}get-workhouse-details-by-workhouse-id/${workhouse.id}`,
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );

                // ایجاد صفحه جدید برای هر کارگاه (به جز اولین کارگاه)
                if (index > 0) {
                    docAny.addPage();
                }

                const header = () => {
                    docAny.addImage(Logo, 'PNG', 10, 10, 40, 25);
                    docAny.setFontSize(18);
                    docAny.text(`Şantiye Detayları: ${workhouse.name}`, pageWidth - 15, 20, { align: 'right' });
                    docAny.setFontSize(12);
                    docAny.text(`Kodu: ${workhouse.code || '-'}`, pageWidth - 15, 27, { align: 'right' });
                    docAny.text(`Bölge: ${regionMap.get(workhouse.region?.id) || '-'}`, pageWidth - 15, 34, { align: 'right' });
                    docAny.text(`Oluşturulma Tarihi: ${formatDateDisplay(workhouse.createAt)}`, pageWidth - 15, 41, { align: 'right' });
                    if (workhouse.work) {
                        docAny.text(`İş: ${workhouse.work.title}`, pageWidth - 15, 48, { align: 'right' });
                    }
                };

                const footer = () => {
                    docAny.setFontSize(10);
                    docAny.setTextColor(0);
                    docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                    docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
                    const pageCount = docAny.internal.getNumberOfPages();
                    docAny.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
                };

                if (detailsResponse.data.httpStatusCode === 200 && detailsResponse.data.data.length > 0) {
                    const details = detailsResponse.data.data;
                    const detailColumns = ["Sahibi", "Fiyat", "Başlangıç Tarihi", "Bitiş Tarihi", "Açıklama", "Abonelikler"];
                    const detailRows = details.map((detail: any) => [
                        detail.owner || '-',
                        detail.price || '-',
                        formatDateDisplay(detail.rentStartDate),
                        formatDateDisplay(detail.rentEndDate),
                        detail.description || '-',
                        // ✅ منطق جدید برای فرمت‌دهی Abonelikler
                        detail.subscription?.map((sub: any) => `${sub.title}: ${sub.no} (${sub.owner})`).join(', ') || '-'
                    ]);

                    autoTable(docAny, {
                        startY: 60,
                        head: [detailColumns],
                        body: detailRows,
                        theme: 'grid',
                        styles: {
                            font: 'NotoSans',
                            fontSize: 10,
                            cellPadding: 2,
                            overflow: 'linebreak'
                        },
                        headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                        // ✅ تنظیم دقیق عرض ستون‌ها
                        columnStyles: {
                            0: { cellWidth: 20 }, // Sahibi
                            1: { cellWidth: 25 }, // Fiyat
                            2: { cellWidth: 30 }, // Başlangıç Tarihi
                            3: { cellWidth: 30 }, // Bitiş Tarihi
                            4: { cellWidth: 40 }, // Açıklama
                            5: { cellWidth: 'auto' } // Abonelikler
                        },
                        didDrawPage: () => {
                            header();
                            footer();
                        },
                        showHead: 'everyPage',
                        margin: { top: 55, bottom: 20, left: 10, right: 10 }
                    });
                } else {
                    header();
                    docAny.text('Bu şantiye için detay bulunamadı.', 15, 60);
                    footer();
                }
            } catch (error) {
                console.error(`Error fetching details for workhouse ${workhouse.id}:`, error);
                docAny.addPage();
                docAny.text(`Şantiye '${workhouse.name}' detayları yüklenirken bir hata oluştu.`, 15, 20);
            }
        }

        docAny.save('Tum_Santiyeler_Detaylari.pdf');
        showAlert('PDF başarıyla oluşturuldu.', 'success');
        setLoadingData(false);
    };

    const exportAllWorkhousesPdf = () => {
        showAlert('Tüm şantiyeler indiriliyor...', 'info');

        const doc = new jsPDF();
        const docAny = doc as any;
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        docAny.setFont('NotoSans');

        const pageWidth = docAny.internal.pageSize.getWidth();
        const pageHeight = docAny.internal.pageSize.getHeight();

        const header = () => {
            docAny.addImage(Logo, 'PNG', 10, 10, 40, 25);
            docAny.setFontSize(18);
            // ✅ موقعیت عنوان به درستی تنظیم شد
            docAny.text("Tüm Şantiyeler Raporu", pageWidth - 10, 20, { align: 'right' });
        };

        const footer = () => {
            docAny.setFontSize(10);
            docAny.setTextColor(0);
            docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            const pageCount = docAny.internal.getNumberOfPages();
            docAny.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        };

        const columns = [
            "İsim", "Kod", "Adres", "Bölge",
            ...(!workId ? ["İş"] : []),
            "Oluşturulma Tarihi"
        ];

        const rows = workhousesList.map(row => [
            row.name,
            row.code,
            row.address,
            regionMap.get(row.region?.id) || 'Bilinmiyor',
            ...(!workId ? [row.work?.title || '-'] : []),
            formatDateDisplay(row.createAt)
        ]);

        try {
            autoTable(docAny, {
                startY: 40,
                head: [columns],
                body: rows,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 10,
                    cellPadding: 2,
                    overflow: 'linebreak',
                },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                // ✅ تنظیم دستی عرض ستون‌ها برای جلوگیری از فشردگی
                columnStyles: {
                    0: { cellWidth: 30 }, // İsim
                    1: { cellWidth: 15 }, // Kod
                    2: { cellWidth: 40 }, // Adres
                    3: { cellWidth: 35 }, // Bölge
                    ...(!workId ? { 4: { cellWidth: 35 } } : {}), // İş
                    [columns.length - 1]: { cellWidth: 35 } // Oluşturulma Tarihi
                },
                didDrawPage: (_data: any) => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 35, bottom: 20, left: 10, right: 10 } // ✅ تنظیم حاشیه‌ها
            });
            docAny.save('Tum_Santiyeler.pdf');
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (error) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                {(workId && workInfo) && ( // ✅ Check for workId to decide what to show
                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip label={`İş: ${workInfo.title}`} color="primary" variant="filled" size="small" />
                            <Chip label={`İhale: ${workInfo.tenderTitle}`} color="success" variant="filled" size="small" />
                        </Stack>
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                                endIcon={<IconArrowRight size={20} />}>
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Stack>
                )}

                {(hasCreatePermission || hasEditPermission) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Şantiyeyi Düzenle' : 'Yeni Şantiye Kaydı'}</Typography>

                        {hasDownloadPermission && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button variant="outlined" startIcon={<IconFileSpreadsheet />} onClick={exportAllWorkhousesPdf}>
                                    Tümünü İndir (PDF)
                                </Button>
                                <Button variant="contained" startIcon={<IconFileSpreadsheet />} onClick={exportAllWorkhousesWithDetailsPdf}>
                                    Tümünü İndir Detaylı (PDF)
                                </Button>
                            </Box>
                        )}
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
                                            <MenuItem disabled>
                                                <CircularProgress size={20} /> Yükleniyor...
                                            </MenuItem>
                                        ) : regionTree.length > 0 ? (
                                            renderRegionTree(regionTree)
                                        ) : (
                                            <MenuItem disabled>Hiç bölge bulunamadı.</MenuItem>
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
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Şantiye Ara"
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
                                <StyledToggleButton value="all" aria-label="all workhouses">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active workhouses">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive workhouses">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Şantiyeler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="workhouse table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>

                                    {!workId && (
                                        <TableCell>
                                            <Typography variant="h6">İş</Typography>
                                        </TableCell>
                                    )}
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
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} style={{ color: "#171c23" }}><Typography variant="h6">Oluşturulma Tarihi</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedWorkhouses.length > 0 ? (
                                    paginatedWorkhouses.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            {!workId && (
                                                <TableCell><Typography variant="h6">{row.work?.title || '-'}</Typography></TableCell>
                                            )}
                                            <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.address}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{regionMap.get(row.region?.id) || 'Bilinmiyor'}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography></TableCell>
                                            <TableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                </CustomTooltip>
                                                <Menu
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={openMenu && selectedRowForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                                >
                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Detayları kaydet" : ""}>
                                                            <MenuItem onClick={handleNavigateToDetails}>
                                                                <ListItemIcon>
                                                                    <IconPlus width={18} />
                                                                </ListItemIcon>
                                                                Detayları Kaydet
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu şantiyeyi düzenle" : ""}>
                                                            <MenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                                Düzenlemek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu şantiyeyi sil" : ""}>
                                                            <MenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                                                Silmek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Detaylı bilgilerini PDF formatında indirin" : ""}>

                                                            <MenuItem onClick={() => {
                                                                if (selectedRowForMenu) {
                                                                    exportSingleWorkhouseWithDetailsPdf(selectedRowForMenu.id, selectedRowForMenu.name);
                                                                }
                                                            }}>
                                                                <ListItemIcon><IconFileText width={18} /></ListItemIcon> Detaylı PDF İndir
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Bu işe ait hiç şantiye bulunamadı.
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
                    count={displayedWorkhouses.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>
            <DeleteWorkhouse
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                workhouseIdToDelete={workhouseIdToDelete}
                workhouseNameToDelete={workhouseNameToDelete}
                showAlert={showAlert}
                onDeleteSuccess={() => fetchWorkhouses(workId)}
            />
        </>
    );
};

export default ListWorkhouses;