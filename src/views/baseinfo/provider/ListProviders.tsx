import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, FormControl, InputLabel, Select, ListItemText,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown,
    IconFileDownload
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
                    // تغییر از 'phone' به 'phoneNumber'
                    phoneNumber: item.phone || '',
                    address: item.address || '',
                    // firm از boolean به string تبدیل می‌شود
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
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            showAlert(e.response?.data?.message || 'Tedarikçi güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
                            {hasChildren ? (
                                <ListItemText primary={node.name} />
                            )
                                : (
                                    <ListItemText sx={{ marginLeft: "-12px" }} primary={node.name} />
                                )}

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

    const handleDownloadAllProvidersPDF = () => {
        if (!providersList || providersList.length === 0) {
            showAlert('PDF oluşturulacak tedarikçi bulunamadı.', 'warning');
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
            doc.text('Tüm Tedarikçiler Raporu', pageWidth - 15, 30, { align: 'right' });
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

        // آماده کردن داده‌ها برای جدول PDF
        const rows = providersList.map(prov => [
            prov.name,
            prov.phoneNumber,
            prov.address,
            prov.firm === '1' ? 'Şirket İçi' : 'Şirket Dışı',
            prov.region?.name || 'Bilinmiyor',
            formatDateDisplay(prov.createAt),
            prov.status
        ]);

        try {
            autoTable(doc, {
                startY: 50,
                head: [['İsim', 'Telefon', 'Adres', 'Firma', 'Bölge', 'Oluşturulma Tarihi', 'Durum']],
                body: rows,
                theme: 'grid',
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 8,
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

            doc.save('Tüm_Tedarikciler_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>

                {(hasCreatePermission || hasEditPermission) && (
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
                                <CustomFormLabel htmlFor="firm-type" required>Setaş'tan mı?  </CustomFormLabel>
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
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadAllProvidersPDF}
                                    startIcon={<IconFileDownload />}
                                // You can add fullWidth if you want it to be responsive
                                >
                                    Tüm Tedarikçileri İndir (PDF)
                                </Button>
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
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Sağlayıcılar yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="Provider table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} style={{ color: "#171c23" }}><Typography variant="h6">İsim</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'phoneNumber'} direction={orderBy === 'phoneNumber' ? order : 'asc'} onClick={() => handleRequestSort('phoneNumber')} style={{ color: "#171c23" }}><Typography variant="h6">Telefon Numarası</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'address'} direction={orderBy === 'address' ? order : 'asc'} onClick={() => handleRequestSort('address')} style={{ color: "#171c23" }}><Typography variant="h6">Adres</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'firm'} direction={orderBy === 'firm' ? order : 'asc'} onClick={() => handleRequestSort('firm')} style={{ color: "#171c23" }}><Typography variant="h6">Firma</Typography></TableSortLabel>
                                    </TableCell>

                                    <TableCell>
                                        <Typography variant="h6">Bölge</Typography>
                                    </TableCell>
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
                                {paginatedProviders.length > 0 ? (
                                    paginatedProviders.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.phoneNumber}</Typography></TableCell>
                                            <TableCell>
                                                <Typography variant="h6" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {row.address.length > 50 ? `${row.address.substring(0, 50)}...` : row.address}
                                                </Typography>
                                                {row.address.length > 50 && (
                                                    <Button variant="text" size="small" onClick={() => {
                                                        setSelectedAddress(row.address);
                                                        setOpenAddressModal(true);
                                                    }}>
                                                        Devamını Oku
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell><Chip
                                                label={row.firm === '1' ? 'Şirket İçi' : 'Şirket Dışı'}
                                                color={row.firm === '1' ? 'primary' : 'secondary'}
                                            /></TableCell>

                                            <TableCell><Typography variant="h6">{regionMap.get(row.region?.id) || 'Bilinmiyor'}</Typography></TableCell>
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
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={openMenu}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                                >

                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı pasif yap" : ""}>
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
                                                            title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı aktif yap" : ""}>
                                                            <MenuItem onClick={handleSetActive}>
                                                                <ListItemIcon>
                                                                    <DoneRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Aktif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı düzenle" : ""}>
                                                            <MenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                                Düzenlemek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu sağlayıcıyı sil" : ""}>
                                                            <MenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>
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
                                        <TableCell colSpan={8} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Bu işe ait hiç Tedarikçi bulunamadı.
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
        </>
    );
};

export default ListProviders;