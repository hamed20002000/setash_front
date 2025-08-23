import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, FormControl, InputLabel, Select, ListItemText
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown, IconPlus, IconArrowRight } from '@tabler/icons-react';
import DeleteWorkhouse from './DeleteWorkHouse';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';

import { tr } from 'date-fns/locale';
import { format } from 'date-fns';


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
// interface RegionTreeSelectMenuItemProps {
//     node: RegionNode;
//     selectedId: number | null;
//     onSelect: (nodeId: number | null, nodeName: string) => void;
//     onCloseParentSelect: () => void;
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
    // ✅ فقط id منطقه انتخاب شده را ذخیره می‌کنیم
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [displayedWorkhouses, setDisplayedWorkhouses] = useState<WorkhouseType[]>([]);
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
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [regionOptions, setRegionOptions] = useState<FlattenedRegionType[]>([]);
    const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());

    // const [regionsListNested, setRegionsListNested] = useState<RegionType[]>([]);
    const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
    const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

    const { isTooltipGloballyEnabled } = useTooltip();

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
                // setRegionsListNested(response.data.data);
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

    const fetchWorkhouses = useCallback(async () => {
        if (!workId) return;
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
                const filteredWorkhouses = allWorkhouses.filter(item => item.work && Number(item.work.id) === Number(workId));
                const workhousesWithStatus = filteredWorkhouses.map((item) => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setWorkhousesList(workhousesWithStatus);
            } else {
                showAlert(response.data.message || 'İşler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('İşler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [workId, navigate]);

    useEffect(() => {
        if (workId) {
            fetchWorkInfo();
            fetchRegions();
        }
    }, [workId, fetchWorkInfo, fetchRegions]);

    useEffect(() => {
        if (workId) {
            fetchWorkhouses();
        }
    }, [workId, fetchWorkhouses]);

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

            // ✅ به جای شیء کامل، فقط id را به state می‌دهیم
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
        fetchWorkhouses();
    };

    const resetFormAndState = () => {
        setName('');
        setCode('');
        setAddress('');
        setSelectedRegionId(null); // ✅ state جدید
        setEditingId(null);
        setNameError(false);
        setCodeError(false);
        setAddressError(false);
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
        // ✅ از state جدید برای بررسی استفاده می‌کنیم
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

    const insertWorkhouse = async () => {
        if (!validateForm() || !workId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
            setLoadingButton(false);
            return;
        }
        try {
            const payload = {
                workId: Number(workId),
                name,
                code,
                address,
                regionId: Number(selectedRegionId) // ✅ از state جدید استفاده می‌کنیم
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
                fetchWorkhouses();
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
        if (!validateForm() || !editingId || !workId) return;
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
                workId: Number(workId),
                name,
                code,
                address,
                regionId: Number(selectedRegionId) // ✅ از state جدید استفاده می‌کنیم
            };
            const response = await axios.put(server.baseurl + server.initialoperations + "update-workhouse", payload, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('Şantiye başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchWorkhouses();
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

    // ✅ توابع جدید برای مدیریت Select درختی
    // const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    // const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

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

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                {workInfo && (
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
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" mb={2}>{editingId ? 'Şantiyeyi Düzenle' : 'Yeni Şantiye Kaydı'}</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
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
                        <Grid item xs={12} sm={4}>
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
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel htmlFor="region-selection" required>Bölge Seçimi</CustomFormLabel>
                            <FormControl
                                sx={{ width: '100%' }}
                                size="small" error={regionIdError}>
                                <InputLabel id="select-region-label">Bölge Seçin</InputLabel>
                                <Select
                                    labelId="select-region-label"
                                    id="select-region"
                                    value={selectedRegionId || ''} // ✅ از state جدید استفاده می‌کنیم
                                    label="Bölge Seçin"
                                    open={isRegionSelectOpen}
                                    onOpen={handleOpenRegionSelect}
                                    onClose={handleCloseRegionSelect}
                                    onChange={(event) => {
                                        const selectedId = event.target.value as number;
                                        setSelectedRegionId(selectedId); // ✅ state جدید
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
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                            </Button>
                                        </CustomTooltip>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni şantiye moduna dön" : ""}>
                                            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>İptal Et</Button>
                                        </CustomTooltip>
                                    </>
                                ) : (
                                    <>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni bir şantiye ekle" : ""}>
                                            <Button variant="contained" color="success" onClick={insertWorkhouse} disabled={loadingButton}>
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Şantiye Ekle'}
                                            </Button>
                                        </CustomTooltip>
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
                                    {/* <TableCell>
                                        <TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')} style={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></TableSortLabel>
                                    </TableCell> */}
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedWorkhouses.length > 0 ? (
                                    paginatedWorkhouses.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.address}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{regionMap.get(row.region?.id) || 'Bilinmiyor'}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{formatDateDisplay(row.createAt)}</Typography></TableCell>
                                            {/* <TableCell>
                                                <Chip
                                                    label={row.recordStatus === 0 ? 'Aktif' : 'Pasif'}
                                                    sx={{
                                                        backgroundColor: row.recordStatus === 0 ? (theme) => theme.palette.success.light : (theme) => theme.palette.error.light,
                                                        color: row.recordStatus === 0 ? (theme) => theme.palette.success.main : (theme) => theme.palette.error.main,
                                                    }}
                                                />
                                            </TableCell> */}
                                            <TableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={openMenu ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}>
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
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Detayları kaydet" : ""}>
                                                        <MenuItem onClick={handleNavigateToDetails}>
                                                            <ListItemIcon>
                                                                <IconPlus width={18} />
                                                            </ListItemIcon>
                                                            Detayları Kaydet
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu şantiyeyi düzenle" : ""}>
                                                        <MenuItem onClick={handleEditClick}>
                                                            <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                            Düzenlemek
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu şantiyeyi sil" : ""}>
                                                        <MenuItem onClick={handleClickOpenDeleteModal}>
                                                            <ListItemIcon><IconTrash width={18} /></ListItemIcon>
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
                onDeleteSuccess={fetchWorkhouses}
            />
        </>
    );
};

export default ListWorkhouses;