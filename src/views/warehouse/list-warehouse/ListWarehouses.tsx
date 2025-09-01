import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, FormControl, InputLabel, Select, ListItemText,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { IconDots, IconEdit, IconTrash, IconSearch, IconChevronRight, IconChevronDown, IconFileDownload, IconBoxSeam, IconPackage } from '@tabler/icons-react';
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

import ViewWarehouseBalanceModal from './ViewWarehouseBalanceModal'
import { useAuth } from 'src/context/AuthContext';

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


const ListWarehouses = () => {
    const navigate = useNavigate();

    const [name, setName] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

    const [WarehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [displayedWarehouses, setDisplayedWarehouses] = useState<WarehouseType[]>([]);
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
    const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

    const [openAddressModal, setOpenAddressModal] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');

    const { isTooltipGloballyEnabled } = useTooltip();
    const [openBalanceModal, setOpenBalanceModal] = useState(false);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
    const [selectedWarehouseName, setSelectedWarehouseName] = useState('');



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

    const fetchWarehouses = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` }
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
            showAlert('İşler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchRegions();
        fetchWarehouses();
    }, [fetchRegions, fetchWarehouses]);



    useEffect(() => {
        const filteredBySearchAndStatus = WarehousesList.filter(wh => {
            const matchesSearch = wh.name.toLowerCase().includes(searchTerm.toLowerCase()) || wh.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && wh.recordStatus === 0) ||
                (statusFilter === 'inactive' && wh.recordStatus === 1);
            return matchesSearch && matchesStatus;
        });

        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
        setDisplayedWarehouses(sortedData);
        setPage(0);
    }, [WarehousesList, searchTerm, statusFilter, order, orderBy]);

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
            showAlert(e.response?.data?.message == "Warehouse with this code already exists!" ? "Bu koda sahip depo zaten mevcut!" :
                'depo eklenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
            showAlert(e.response?.data?.message == "Warehouse with this code already exists!" ? "Bu koda sahip depo zaten mevcut!" :
                'depo güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
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
                showAlert(`Direk başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetFormAndState();
                fetchWarehouses();
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
    const handleRequestSort = (property: SortableWarehouseKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const filteredWarehousesList = WarehousesList.filter(wh => {
        const matchesSearch = wh.name.toLowerCase().includes(searchTerm.toLowerCase()) || wh.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && wh.recordStatus === 0) ||
            (statusFilter === 'inactive' && wh.recordStatus === 1);
        return matchesSearch && matchesStatus;
    });
    const sortedAndFilteredWarehousesList = stableSort(filteredWarehousesList, getComparator(order, orderBy));
    const paginatedWarehouses = sortedAndFilteredWarehousesList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


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

    const handleDownloadAllWarehousesPDF = async () => {
        if (!WarehousesList || WarehousesList.length === 0) {
            showAlert('PDF oluşturulacak depo bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // افزودن فونت برای پشتیبانی از کاراکترهای ترکی
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {

            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Tüm Depolar Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
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

        const rows = WarehousesList.map(wh => [
            wh.name || '-',
            wh.code || '-',
            wh.address || '-',
            wh.region?.name || '-',
            formatDateDisplay(wh.createAt),
            wh.status,
        ]);

        try {
            autoTable(doc, {
                startY: 50,
                head: [['İsim', 'Kod', 'Adres', 'Bölge', 'Oluşturulma Tarihi', 'Durum']],
                body: rows,
                theme: 'grid', // تغییر تم به 'grid' برای اضافه کردن border
                styles: {
                    font: 'NotoSans',
                    fontStyle: 'normal',
                    fontSize: 10,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 'auto' },
                },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save('Tüm_Depolar_Raporu.pdf');
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };

    const handleDownloadBalancePDF = async (_warehouseId: number, warehouseName: string, balanceData: any[]) => {
        if (!balanceData || balanceData.length === 0) {
            showAlert('PDF oluşturulacak envanter bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // افزودن فونت برای پشتیبانی از کاراکترهای ترکی
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text(`${warehouseName} Envanter Raporu`, pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
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

        // داده‌های جدول را از موجودی انبار خاص ایجاد کنید
        const rows = balanceData.map(item => [
            item.name,
            item.balance,
            item.code == null ? '-' : item.code
        ]);

        try {
            autoTable(doc, {
                startY: 50,
                head: [['Ürün Adı', 'Miktar', 'Kod']],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save(`${warehouseName}_Envanter_Raporu.pdf`);
            showAlert('Envanter PDF dosyası başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };



    const handleViewBalanceClick = () => {
        debugger
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
        handleCloseMenu(); // منو را ببندید
    };


    const handleCloseBalanceModal = () => {
        setOpenBalanceModal(false);
        setSelectedWarehouseId(null);
        setSelectedWarehouseName('');
    };
    return (
        <>

            {(hasCreatePermission || hasEditPermission) && (
                <Box sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">Depolar</Typography>

                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleDownloadAllWarehousesPDF}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || WarehousesList.length === 0}
                            >
                                Tüm Depoları İndir (PDF)
                            </Button>
                        )}
                    </Stack>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Depoyu Düzenle' : 'Yeni Depo Kaydı'}</Typography>
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
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili depoyi güncelleyin" : ""}>
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
                </Box>

            )}
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <BlankCard>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={8}>
                            <TextField
                                label="Depo Ara"
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
                                <StyledToggleButton value="all" aria-label="all Warehouses">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" aria-label="active Warehouses">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" aria-label="inactive Warehouses">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Depolar yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="Warehouse table">
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
                                    <TableCell>
                                        <TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')} style={{ color: "#171c23" }}><Typography variant="h6">Durum</Typography></TableSortLabel>
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedWarehouses.length > 0 ? (
                                    paginatedWarehouses.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell><Typography variant="h6">{row.name}</Typography></TableCell>
                                            <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
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
                                                    id={`basic-menu-${row.id}`} // استفاده از id منحصر به فرد
                                                    anchorEl={anchorEl}
                                                    // شرط باز شدن منو رو به درستی چک کنید
                                                    open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                                >
                                                    {/* آیتم قدیمی برای هدایت به صفحه Sevk Et */}
                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Depo Sevk İşlemi" : ""}>
                                                            <MenuItem onClick={handleDispatchClick}>
                                                                <ListItemIcon>
                                                                    <IconBoxSeam width={18} />
                                                                </ListItemIcon>
                                                                Sevk Et
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {/* آیتم جدید برای نمایش موجودی */}
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Depo envanterini görüntüle" : ""}>
                                                        <MenuItem onClick={handleViewBalanceClick}>
                                                            <ListItemIcon>
                                                                <IconPackage width={18} />
                                                            </ListItemIcon>
                                                            Envanteri Görüntüle
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 ? (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu Depoyu pasif yap" : ""}>
                                                            <MenuItem onClick={handleSetInactive}>
                                                                <ListItemIcon>
                                                                    <DoNotDisturbOnRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Pasif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <CustomTooltip placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu Depoyu aktif yap" : ""}>
                                                            <MenuItem onClick={handleSetActive}>
                                                                <ListItemIcon>
                                                                    <DoneRoundedIcon width={18} />
                                                                </ListItemIcon>
                                                                Aktif Yap
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Depoyu düzenle" : ""}>
                                                            <MenuItem onClick={handleEditClick}>
                                                                <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                                Düzenlemek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Depoyu sil" : ""}>
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
                                        <TableCell colSpan={7} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Bu işe ait hiç depo bulunamadı.
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
                    count={displayedWarehouses.length}
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
            />
        </>
    );
};

export default ListWarehouses;