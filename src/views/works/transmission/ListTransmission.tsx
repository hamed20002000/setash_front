import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    Typography, Box, Stack, Grid, Button, CircularProgress, TextField,
    Autocomplete, RadioGroup, FormControlLabel, Radio,
    Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    IconButton, Chip,
    Menu, ListItemIcon,
    TablePagination,
    MenuItem,
    TableSortLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, DialogContentText,
    InputAdornment,
    useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import BlankCard from 'src/components/shared/BlankCard';
import { IconPlus, IconEdit, IconTrash, IconDots, IconX, IconMap, IconPencil, IconMinus, IconChartDots, IconArrowRight, IconRefresh, IconSearch } from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import MapPreviewModal from './MapPreviewModal';
import FinalCalculationModal from './FinalCalculationModal';
import DeleteTransmissionModal from './DeleteTransmissionModal';
import DeleteAllConfirmationModal from './DeleteAllConfirmationModal';
import RegisterNewNodesModal from './RegisterNewNodesModal';
import { keyframes, styled } from '@mui/system';

import { MapNode, TransmissionRow, SelectOption, AddedItem, ItemType, ProductTypesType } from './types';
import { useAuth } from 'src/context/AuthContext';

type SortableTransmissionKeys = keyof Pick<TransmissionRow, 'fromProductType' | 'toProductType' | 'distance' | 'miktarTipi' | 'formulaTitle' | 'createAt' | 'recordStatus'>;

// ... (توابع کمکی descendingComparator, getComparator, stableSort)
const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) return valA === undefined || valA === null ? 0 : -1;
    if (valA === undefined || valA === null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    if (String(valB) < String(valA)) return -1;
    if (String(valB) > String(valA)) return 1;
    return 0;
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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableTransmissionKeys): (a: TransmissionRow, b: TransmissionRow) => number => {
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

const ListTransmission = () => {
    const navigate = useNavigate();
    const { networkId } = useParams<{ networkId: string }>();
    const [searchParams] = useSearchParams();
    const workId = searchParams.get('workId');
    const tenderId = searchParams.get('tenderId');
    const { isTooltipGloballyEnabled } = useTooltip();
    const theme = useTheme();

    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [networkTitleForDisplay, setNetworkTitleForDisplay] = useState('Yükleniyor...');
    const [workTitleForDisplay, setWorkTitleForDisplay] = useState('Yükleniyor...');
    const [tenderTitleForDisplay, setTenderTitleForDisplay] = useState('Yükleniyor...');
    const [displayTitlesLoaded, setDisplayTitlesLoaded] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);

    const [fromProductType, setFromProductType] = useState<SelectOption | null>(null);
    const [toProductType, setToProductType] = useState<SelectOption | null>(null);
    const [distance, setDistance] = useState<string>('');
    const [miktarTipi, setMiktarTipi] = useState<'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG'>('Yeni YG');
    const [formulaTitle, setFormulaTitle] = useState<string>('');

    const [allProductTypes, setAllProductTypes] = useState<ProductTypesType[]>([]);
    const [channelRowsData, setChannelRowsData] = useState<any[]>([]);
    const [transmissionList, setTransmissionList] = useState<TransmissionRow[]>([]);
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [loadingFormOptions, setLoadingFormOptions] = useState<boolean>(true);
    const [loadingList, setLoadingList] = useState<boolean>(false);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [orderBy, setOrderBy] = useState<SortableTransmissionKeys>('recordStatus');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const fromProductTypeRef = useRef<HTMLInputElement>(null);
    const toProductTypeRef = useRef<HTMLInputElement>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<TransmissionRow | null>(null);
    const openMenu = Boolean(anchorEl);

    const [itemsList, setItemsList] = useState<ItemType[]>([]);
    const [availableItems, setAvailableItems] = useState<SelectOption[]>([]);
    const [selectedItem, setSelectedItem] = useState<SelectOption | null>(null);
    const [itemQuantity, setItemQuantity] = useState<string>('');
    const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
    const [editingItem, setEditingItem] = useState<AddedItem | null>(null);
    const [loadingItems, setLoadingItems] = useState<boolean>(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const [finalCalculationData, setFinalCalculationData] = useState<Map<string, Map<string, AddedItem>>>(new Map());
    const [isFinalCalcModalOpen, setIsFinalCalcModalOpen] = useState(false);
    const [transmissionIdToDelete, setTransmissionIdToDelete] = useState<string | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);

    const [openDeleteAllModal, setOpenDeleteAllModal] = useState<boolean>(false);
    const [dependentTransmissions, setDependentTransmissions] = useState<TransmissionRow[]>([]);
    const [transmissionSummary, setTransmissionSummary] = useState<any[]>([]);

    const [nodesToRegister, setNodesToRegister] = useState<MapNode[]>([]);
    const [openRegistrationModal, setOpenRegistrationModal] = useState<boolean>(false);
    const [openConfirmationModal, setOpenConfirmationModal] = useState<boolean>(false);
    const [pendingTransmissions, setPendingTransmissions] = useState<TransmissionRow[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [isInitialEntry, setIsInitialEntry] = useState(true);
    const [openSelectTrafoModal, setOpenSelectTrafoModal] = useState(false);



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


    const clearAlert = useCallback(() => {
        setAlertMessage(null);
    }, []);

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
    }, [alertMessage, clearAlert]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);

    const resetFormFields = useCallback(() => {
        setAvailableItems(prev => {
            const newAvailableItems = [...prev];
            addedItems.forEach(item => {
                newAvailableItems.push({
                    id: item.id,
                    name: item.name,
                    weight: item.weight,
                    unit: item.unit,
                    productTypeId: '',
                    label: '',
                    parent: null
                });
            });
            return newAvailableItems;
        });

        setFromProductType(null);
        setToProductType(null);
        setDistance('');
        setMiktarTipi('Yeni YG');
        setFormulaTitle('');
        setEditingRowId(null);
        setAddedItems([]);
        setSelectedItem(null);
        setItemQuantity('');
        setIsInitialEntry(transmissionList.length === 0);
        setIsFormVisible(false);
    }, [itemsList, addedItems, transmissionList]);

    const combinedProductTypeOptions = useMemo(() => {
        if (!allProductTypes.length || !channelRowsData.length) {
            return [];
        }

        const productTypeMap = new Map(allProductTypes.map(product => [String(product.id), product.name]));

        const finalOptions: SelectOption[] = [];
        for (const row of channelRowsData) {
            const productTypeId = row?.productType?.id;
            const productName = productTypeMap.get(String(productTypeId));

            if (productName) {
                finalOptions.push({
                    id: String(row.id),
                    productTypeId: String(productTypeId),
                    name: productName,
                    label: row.label,
                    parent: row.parent
                        ? { id: String(row.parent.id), label: row.parent.label }
                        : null,
                    productStatus: row.productStatus as 0 | 1 | 2,
                });
            }
        }

        return finalOptions;
    }, [allProductTypes, channelRowsData]);




    //     const combinedProductTypeOptions = useMemo(() => {
    //   if (!allProductTypes.length || !channelRowsData.length) return [];

    //   const ptMap = new Map(allProductTypes.map(p => [String(p.id), p.name]));
    //   return channelRowsData.map((row: any) => ({
    //     id: String(row.id),
    //     productTypeId: String(row?.productType?.id),
    //     name: ptMap.get(String(row?.productType?.id)) || 'Bilinmeyen',
    //     label: row.label,
    //     parent: row.parent ? { id: String(row.parent.id), label: row.parent.label } : null,
    //     // 👇 اضافه شد
    //     productStatus: row.productStatus as 0 | 1 | 2, // 0=YENİ, 1=DMM, 2=MEVCUT
    //   }));
    // }, [allProductTypes, channelRowsData]);

    const trafoOptions = useMemo(() => {
        return combinedProductTypeOptions.filter(option => option.parent === null);
    }, [combinedProductTypeOptions]);

    const availableTrafoOptions = useMemo(() => {
        const registeredTrafos = new Set(
            transmissionList.flatMap(row => [row.fromProductTypeId, row.toProductTypeId])
        );

        return trafoOptions.filter(option => !registeredTrafos.has(option.id));
    }, [trafoOptions, transmissionList]);


    const toProductTypeOptions = useMemo(() => {
        if (!fromProductType) {
            return [];
        }
        const allOptions = combinedProductTypeOptions;
        const usedNodes = transmissionList.map(row => row.toProductTypeId);

        return allOptions.filter(option => {
            if (option.id === fromProductType.id) return false;
            if (option.parent === null) return false;
            if (usedNodes.includes(option.id)) return false;
            return true;
        });
    }, [fromProductType, transmissionList, combinedProductTypeOptions]);

    const findLastNodeInChain = useCallback((startNodeId: string): SelectOption | null => {
        let currentNodeId = startNodeId;
        let nextNodeId = null;
        let lastNode = null;

        const allNodesMap = new Map(combinedProductTypeOptions.map(opt => [opt.id, opt]));

        do {
            nextNodeId = null;
            const nextRow = transmissionList.find(row => String(row.fromProductTypeId) === currentNodeId);
            if (nextRow) {
                nextNodeId = String(nextRow.toProductTypeId);
                currentNodeId = nextNodeId;
            }
        } while (nextNodeId);

        lastNode = allNodesMap.get(currentNodeId) || null;
        return lastNode;
    }, [combinedProductTypeOptions, transmissionList]);

    const handleSelectTrafo = useCallback((trafo: SelectOption) => {
        const lastNode = findLastNodeInChain(trafo.id);
        if (lastNode) {
            setFromProductType(lastNode);
        } else {
            setFromProductType(trafo);
        }
        setToProductType(null);
        setDistance('');
        setFormulaTitle('');
        setAddedItems([]);
        setOpenSelectTrafoModal(false);
        setIsInitialEntry(false);
    }, [findLastNodeInChain]);

    const fetchProductTypes = useCallback(async () => {
        setLoadingFormOptions(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu.', 'error');
            setLoadingFormOptions(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-product-types", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            debugger
            if (response.data.httpStatusCode === 200) {
                const formattedData: ProductTypesType[] = response.data.data.map((item: any) => ({
                    id: String(item.id),
                    name: item.name,
                    type: item.type,
                    parentProductType: item.parentProductType,
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    networkTrAd: item.networkTrAd,
                }));
                setAllProductTypes(formattedData);
            } else {
                showAlert(response.data.message || 'Ürün türleri listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            console.error("Error fetching product types:", e);
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Ürün türleri listesi alınırken bir hata oluştu.', 'error');
            }
        } finally {
            setLoadingFormOptions(false);
        }
    }, [navigate, showAlert]);

    const getListItem = useCallback(async () => {
        setLoadingItems(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn("Kimlik doğrulama belirteci bulunamadı, oturum açma sayfasına yönlendiriliyor.");
            navigate("/");
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            setLoadingItems(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${authToken}`
                }
            });
            if (response.data && response.data.success) {
                const processedData = response.data.data.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    weight: item.weight,
                    description: item.description,
                    abbreviation: item.abbreviation,
                    recordStatus: item.recordStatus !== undefined && item.recordStatus !== null ? item.recordStatus : 0,
                    createAt: item.createAt,
                    category: {
                        id: item.category.id,
                        name: item.category.name,
                        depth: item.category.depth,
                        createAt: item.category.createAt,
                        recordStatus: item.category.recordStatus !== undefined && item.category.recordStatus !== null ? item.category.recordStatus : 0,
                    },
                    unit: {
                        id: item.unit.id,
                        title: item.unit.title,
                        recordStatus: item.unit.recordStatus !== undefined && item.unit.recordStatus !== null ? item.unit.recordStatus : 0,
                        createAt: item.unit.createAt,
                    },
                    status: item.recordStatus === 0 ? 'Aktif' : item.recordStatus === 1 ? 'Pasif' : 'Silindi',
                }));

                setItemsList(processedData);

                setAvailableItems(processedData.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    weight: item.weight,
                    unit: item.unit,
                })));

            } else {
                console.error("Failed to fetch items:", response.data.message);
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                console.error("Error fetching items:", e);
                showAlert('Ürünler sunucudan alınamadı', 'error');
            }
        } finally {
            setLoadingItems(false);
        }
    }, [navigate, showAlert]);

    const fetchNetworkDetails = useCallback(async (id: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Oturumunuzun süresi doldu.', 'error'); navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-network-by-id/${id}`, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setNetworkTitleForDisplay(response.data.data.title);
                const allChannelRows = response.data.data.networkTrAdis.flatMap((tradi: any) => tradi.channelRows);
                setChannelRowsData(allChannelRows);
            } else {
                setNetworkTitleForDisplay('Bilinmeyen Ağ');
                showAlert(response.data.message || 'Ağ detayları alınamadı.', 'error');
            }
        } catch (e: any) {
            setNetworkTitleForDisplay('Bilinmeyen Ağ');
            console.error("Error fetching network details:", e);
            showAlert('Ağ detayları yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);

    const fetchWorkDetails = useCallback(async (id: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Oturumunuzun süresi doldu.', 'error'); navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-work-by-id/${id}`, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setWorkTitleForDisplay(response.data.data.title);
            } else {
                setWorkTitleForDisplay('Bilinmeyen İş');
                showAlert(response.data.message || 'İş detayları alınamadı.', 'error');
            }
        } catch (e: any) {
            setWorkTitleForDisplay('Bilinmeyen İş');
            console.error("Error fetching work details:", e);
            showAlert('İş detayları yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);

    const fetchTenderDetails = useCallback(async (id: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Oturumunuzun süresi doldu.', 'error'); navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + `get-tender-by-id/${id}`, {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setTenderTitleForDisplay(response.data.data.title);
            } else {
                setTenderTitleForDisplay('Bilinmeyen İhale');
                showAlert(response.data.message || 'İhale detayları alınamadı.', 'error');
            }
        } catch (e: any) {
            setTenderTitleForDisplay('Bilinmeyen İhale');
            console.error("Error fetching tender details:", e);
            showAlert('İhale detayları yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);


    const fetchTransmissionList = useCallback(async (currentNetworkId: string) => {
        setLoadingList(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            navigate("/");
            setLoadingList(false);
            return;
        }

        const statusToMiktarTipi: Record<number, 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG' | 'MEVCUT'> = {
            0: 'Yeni YG',
            1: 'Yeni AG',
            2: 'DMM YG',
            3: 'DMM AG',
            4: 'MEVCUT'
        };

        // ایجاد Map از ProductTypes برای دسترسی به فیلد 'type'
        const productTypeDetailsMap = new Map(allProductTypes.map(p => [String(p.id), p]));

        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + `get-transmission-row-by-network-id/${currentNetworkId}`,
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                const combinedOptionsMap = new Map(combinedProductTypeOptions.map(opt => [opt.id, opt.name]));
                const transmissionSummaryData = response.data.data.transmissionSummary || [];
                setTransmissionSummary(transmissionSummaryData);

                const processedData = response.data.data.transmissionRows.map((row: any) => {
                    const miktarTipi = statusToMiktarTipi[row.productStatus] || 'Bilinmeyen';

                    const fromProductTypeId = row.fromProductType?.id;
                    const toProductTypeId = row.toProductType?.id;

                    // پیدا کردن جزئیات type (1: بتن، 2: آهن)
                    const fromProductTypeDetails = productTypeDetailsMap.get(String(fromProductTypeId));
                    const toProductTypeDetails = productTypeDetailsMap.get(String(toProductTypeId));

                    const fromNodeName = combinedOptionsMap.get(String(fromProductTypeId)) || 'Bilinmeyen Ürün';
                    const toNodeName = combinedOptionsMap.get(String(toProductTypeId)) || 'Bilinmeyen Ürün';

                    const items = row.transmissionRowItmes.map((item: any) => ({
                        id: String(item.item.id),
                        name: item.item.name,
                        quantity: item.value,
                        miktarTipi: miktarTipi,
                        weight: item.item.weghit,
                        unit: item.item.unit,
                    }));

                    const distanceInMeters =
                        row.distance != null
                            ? parseFloat((Number(row.distance) / 100).toFixed(2)) // cm → m برای نمایش
                            : 0;

                    return {
                        ...row,
                        id: String(row.id),
                        fromProductTypeId: String(fromProductTypeId),
                        toProductTypeId: String(toProductTypeId),
                        miktarTipi: miktarTipi,
                        items: items,
                        fromProductType: fromNodeName,
                        toProductType: toNodeName,
                        // --- تزریق فیلد type به TransmissionRow برای MapPreviewModal ---
                        fromProductTypeCategory: fromProductTypeDetails?.type as 1 | 2 | undefined,
                        toProductTypeCategory: toProductTypeDetails?.type as 1 | 2 | undefined,
                        distance: distanceInMeters,
                    };
                });

                // debugger // این خط را حذف کنید

                setTransmissionList(processedData);
                setHasUnsavedChanges(false);
                if (processedData.length > 0) {
                    const lastNodeId = processedData[processedData.length - 1].toProductTypeId;
                    const lastNode = combinedProductTypeOptions.find(opt => opt.id === lastNodeId) || null;
                    setFromProductType(lastNode);
                    setIsInitialEntry(false);
                } else {
                    setFromProductType(null);
                    setIsInitialEntry(true);
                }

                // ... (منطق محاسبه finalCalculationData)
                setFinalCalculationData(_prev => {
                    const newMap = new Map<string, Map<string, AddedItem>>();
                    processedData.forEach((row: TransmissionRow) => {
                        if (row.items) {
                            row.items.forEach((item: AddedItem) => {
                                const currentItemMap = newMap.get(item.id) || new Map<string, AddedItem>();
                                const currentItem = currentItemMap.get(item.miktarTipi);
                                if (currentItem) {
                                    currentItemMap.set(item.miktarTipi, {
                                        ...currentItem,
                                        quantity: parseFloat(String(currentItem.quantity)) + parseFloat(String(item.quantity)),
                                    });
                                } else {
                                    currentItemMap.set(item.miktarTipi, { ...item, quantity: parseFloat(String(item.quantity)) });
                                }
                                newMap.set(item.id, currentItemMap);
                            });
                        }
                    });
                    return newMap;
                });


            } else {
                showAlert(response.data.message || 'Veri alınamadı.', 'error');
                setTransmissionList([]);
                setFinalCalculationData(new Map());
                setTransmissionSummary([]);
                setIsInitialEntry(true);
                setFromProductType(null);
            }
        } catch (e: any) {
            console.error("Error fetching transmission list:", e);
            showAlert('Sunucudan iletim listesi alınırken bir hata oluştu.', 'error');
            setTransmissionList([]);
            setFinalCalculationData(new Map());
            setTransmissionSummary([]);
            setIsInitialEntry(true);
            setFromProductType(null);
        } finally {
            setLoadingList(false);
        }
    }, [navigate, showAlert, combinedProductTypeOptions, allProductTypes]); // allProductTypes باید به وابستگی‌ها اضافه شود

    const availableTrafoOptionsForMap = useMemo(() => {
        // گزینه‌های ترافو را بر اساس منطق fromProductType فیلتر کنید
        const registeredTrafos = new Set(
            transmissionList.flatMap(row => [row.fromProductTypeId, row.toProductTypeId])
        );

        return trafoOptions.filter(option => !registeredTrafos.has(option.id));
    }, [trafoOptions, transmissionList]);

    const availableProductTypeOptionsForMap = useMemo(() => {
        const allOptions = combinedProductTypeOptions;
        const usedNodes = transmissionList.map(row => row.toProductTypeId);

        // از همان منطق فیلتر کردن toProductTypeOptions استفاده کنید
        return allOptions.filter(option => {
            // فیلتر کردن گره‌هایی که قبلاً به عنوان مقصد استفاده شده‌اند
            if (usedNodes.includes(option.id)) return false;

            // اگر می‌خواهید فقط مواردی با parent نمایش داده شوند، این خط را نگه دارید
            if (option.parent === null) return false;

            return true;
        });

    }, [combinedProductTypeOptions, transmissionList]);

    const fetchDataForModal = useCallback(async (networkId: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            navigate("/");
            setLoadingList(false);
            return;
        }
        try {
            const response = await axios.get(
                `${server.baseurl}${server.initialoperations}get-network-by-work-id/${Number(networkId)}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                setTransmissionSummary(response.data.data.transmissionSummary || []);
            } else {
                setTransmissionSummary([]);
            }
        } catch (e: any) {
            setTransmissionSummary([]);
        }
    }, [navigate, showAlert]);

    const getListProductTypes = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu.', 'error');
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-product-types", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const formattedData: ProductTypesType[] = response.data.data.map((item: any) => ({
                    id: String(item.id),
                    name: item.name,
                    type: item.type,
                    parentProductType: item.parentProductType,
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    networkTrAd: item.networkTrAd,
                }));
                setAllProductTypes(formattedData);
            }
        } catch (e) {
            console.error("Error fetching product types:", e);
        }
    }, [navigate, showAlert]);

    const handleRegisterNewTrafo = useCallback(async (name: string, type: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Oturumunuzun süresi doldu.', 'error'); navigate("/"); return; }
        try {
            const payload = {
                productTypeName: name,
                productType: type,
                parentProductTypeId: null,
            };
            const response = await axios.post(server.baseurl + server.initialoperations + "create-product-type", payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('TRAFO başarıyla kaydedildi!', 'success');
                await fetchProductTypes();
            } else {
                showAlert(response.data.message || 'TRAFO kaydedilirken bir hata oluştu.', 'error');
                throw new Error(response.data.message || 'TRAFO kaydedilirken bir hata oluştu.');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Sunucu hatası.', 'error');
            throw e;
        }
    }, [showAlert, navigate, fetchProductTypes]);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingFormOptions(true);

            const promises = [
                fetchProductTypes(),
                getListItem(),
            ];

            if (networkId) {
                promises.push(fetchNetworkDetails(networkId));
            }
            if (workId) {
                promises.push(fetchWorkDetails(workId));
            }
            if (tenderId) {
                promises.push(fetchTenderDetails(tenderId));
            }

            try {
                await Promise.all(promises);
                setDisplayTitlesLoaded(true);
            } catch (error) {
                console.error("Initial data fetch failed:", error);
                showAlert('Başlangıç verileri yüklenirken bir hata oluştu.', 'error');
                setLoadingFormOptions(false);
                setDisplayTitlesLoaded(true);
            } finally {
                setLoadingFormOptions(false);
            }
        };

        fetchData();
    }, [fetchProductTypes, getListItem, fetchNetworkDetails, fetchWorkDetails, fetchTenderDetails, networkId, workId, tenderId, showAlert]);

    useEffect(() => {
        if (networkId && !loadingFormOptions) {
            fetchTransmissionList(networkId);
        }
    }, [networkId, fetchTransmissionList, loadingFormOptions]);

    useEffect(() => {
        const checkAllLoaded = networkTitleForDisplay !== 'Yükleniyor...' &&
            workTitleForDisplay !== 'Yükleniyor...' &&
            tenderTitleForDisplay !== 'Yükleniyor...';
        if (networkId && workId && tenderId && checkAllLoaded) {
            setDisplayTitlesLoaded(true);
        } else if (!networkId && !workId && !tenderId) {
            setDisplayTitlesLoaded(true);
            setNetworkTitleForDisplay('');
            setWorkTitleForDisplay('');
            setTenderTitleForDisplay('');
        }
    }, [networkId, workId, tenderId, networkTitleForDisplay, workTitleForDisplay, tenderTitleForDisplay]);

    const handleAutocompleteOpen = useCallback((ref: React.RefObject<HTMLInputElement>) => {
        setTimeout(() => {
            if (ref.current) {
                ref.current.focus();
            }
        }, 50);
    }, []);

    const handleOpenMapModal = useCallback(() => {
        setIsMapModalOpen(true);
    }, []);

    const handleCloseMapModal = useCallback(() => {
        setIsMapModalOpen(false);
    }, []);

    const handleAddItem = useCallback(() => {
        if (!selectedItem || !itemQuantity || parseFloat(itemQuantity) <= 0) {
            showAlert('Lütfen bir Şebeke ve geçerli bir miktar seçin.', 'warning');
            return;
        }

        const itemToAdd = itemsList.find(item => item.id === selectedItem.id);

        if (addedItems.some(item => item.id === selectedItem.id)) {
            showAlert('Bu Şebeke zaten eklenmiş.', 'warning');
            return;
        }

        const newAddedItem: AddedItem = {
            id: selectedItem.id,
            name: selectedItem.name,
            quantity: parseFloat(itemQuantity),
            miktarTipi: miktarTipi,
            weight: itemToAdd?.weight,
            unit: itemToAdd?.unit,
        };

        setAddedItems(prev => [...prev, newAddedItem]);
        setAvailableItems(prev => prev.filter(item => item.id !== selectedItem.id));
        setSelectedItem(null);
        setItemQuantity('');
    }, [selectedItem, itemQuantity, showAlert, addedItems, miktarTipi, itemsList]);


    const handleDeleteAddedItem = useCallback((itemId: string) => {
        const itemToRemove = addedItems.find(item => item.id === itemId);
        if (itemToRemove) {
            setAvailableItems(prev => [...prev, { id: itemToRemove.id, name: itemToRemove.name, weight: itemToRemove.weight, unit: itemToRemove.unit, parent: null, productTypeId: '', label: '' }]);
        }
        setAddedItems(prev => prev.filter(item => item.id !== itemId));
    }, [addedItems]);

    const handleEditAddedItem = useCallback((itemToEdit: AddedItem) => {
        const fullItemDetails = itemsList.find(i => i.id === itemToEdit.id);

        setEditingItem(itemToEdit);
        setSelectedItem({
            id: itemToEdit.id,
            name: itemToEdit.name,
            weight: fullItemDetails?.weight,
            unit: fullItemDetails?.unit,
            productTypeId: "",
            label: "",
            parent: null,
        });
        setMiktarTipi(itemToEdit.miktarTipi as any);
        setItemQuantity(String(itemToEdit.quantity));
        setAddedItems(prev => prev.filter(item => item.id !== itemToEdit.id));
    }, [itemsList]);

    const handleUpdateEditedItem = useCallback(() => {
        if (!editingItem || !selectedItem || !itemQuantity || parseFloat(itemQuantity) <= 0) {
            showAlert('Lütfen geçerli bir Şebeke ve miktar girin.', 'warning');
            return;
        }

        const originalItem = itemsList.find(item => item.id === editingItem?.id);

        const updatedItem: AddedItem = {
            id: selectedItem.id,
            name: selectedItem.name,
            quantity: parseFloat(itemQuantity),
            miktarTipi: miktarTipi,
            weight: originalItem?.weight,
            unit: originalItem?.unit,
        };

        setAddedItems(prev => prev.map(item => item.id === editingItem.id ? updatedItem : item));
        setEditingItem(null);
        setSelectedItem(null);
        setItemQuantity('');
    }, [editingItem, selectedItem, itemQuantity, showAlert, miktarTipi, itemsList]);


    const handleCancelEditItem = useCallback(() => {
        if (editingItem) {
            const originalItem = itemsList.find(item => item.id === editingItem.id);
            setAddedItems(prev => [...prev, { ...editingItem, name: originalItem?.name || '' }]);
        }
        setEditingItem(null);
        setSelectedItem(null);
        setItemQuantity('');
    }, [editingItem, itemsList]);

    const isFormComplete = useMemo(() => {
        return fromProductType && toProductType && distance && addedItems.length > 0;
    }, [fromProductType, toProductType, distance, addedItems]);

    const handleAddRowToTransmissionList = useCallback(async () => {
        if (!fromProductType || !toProductType || !distance || addedItems.length === 0) {
            showAlert('Lütfen tüm gerekli alanları doldurun ve en az bir Şebeke ekleyin.', 'warning');
            return;
        }

        if (isInitialEntry && fromProductType.parent !== null) {
            showAlert('İlk iletim, bir ana düğümden (TRAFO) başlamalıdır.', 'warning');
            return;
        }

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            showAlert('Oturumunuzun süresi doldu.', 'error');
            setLoadingButton(false);
            return;
        }

        const miktarTipiToStatus = {
            'Yeni YG': 0, 'Yeni AG': 1, 'DMM YG': 2, 'DMM AG': 3,
        };

        const payload = {
            distance: Math.round(parseFloat(distance) * 100),
            formulaTitle: formulaTitle,
            fromProductTypeId: parseInt(fromProductType.id!),
            toProductTypeId: parseInt(toProductType.id!),
            productStatus: miktarTipiToStatus[miktarTipi],
            transmissionRowItmes: addedItems.map(item => ({
                value: item.quantity,
                itemId: parseInt(item.id)
            })) || []
        };
        try {
            await axios.post(server.baseurl + server.initialoperations + "create-TransmissionRow", { networkId: parseInt(networkId!), createTransmissionRows: [payload] }, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            showAlert('İletim başarıyla kaydedildi!', 'success');
            if (networkId) {
                await fetchTransmissionList(networkId);
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Kayıt gönderilirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
            resetFormFields();
        }
    }, [fromProductType, toProductType, distance, addedItems, miktarTipi, formulaTitle, networkId, showAlert, navigate, fetchTransmissionList, resetFormFields, isInitialEntry]);


    const handleBatchUpdate = useCallback(async (listToUpdate: TransmissionRow[]) => {
        setLoadingButton(true);
        debugger
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !networkId) {
            navigate('/');
            showAlert('Oturumunuzun süresi doldu veya ağ ID’si eksik.', 'error');
            setLoadingButton(false);
            return;
        }

        // نقشه‌ی وضعیت سه‌حالته از channelRows (0:YENİ, 1:DMM, 2:MEVCUT)
        const statusByChannelRowId = new Map<string, number>();
        try {
            (channelRowsData || []).forEach((row: any) => {
                if (row?.id != null) {
                    statusByChannelRowId.set(String(row.id), Number(row.productStatus ?? 0));
                }
            });
        } catch { /* ignore */ }

        const toInt = (v: any) => {
            const n = parseInt(String(v), 10);
            return Number.isFinite(n) ? n : 0;
        };

        const buildPayloadRow = (row: TransmissionRow) => {
            // توجه: این IDها باید همان channelRow.id باشند
            const fromId = toInt(row.fromProductTypeId);
            const toId = toInt(row.toProductTypeId);

            // قانون تعیین productStatus: اول مقصد، بعد مبدا، پیش‌فرض 0
            // const productStatus =
            //     statusByChannelRowId.get(String(toId)) ??
            //     statusByChannelRowId.get(String(fromId)) ??
            //     0;

            const miktarTipiToStatus: Record<string, number> = {
                'Yeni YG': 0,
                'Yeni AG': 1,
                'DMM YG': 2,
                'DMM AG': 3,
                'TR-Connection': 4
            };
            return {
                distance: Math.round(Number(row.distance ?? 0) * 100),
                formulaTitle: String(row.formulaTitle ?? ''),
                fromProductTypeId: fromId,
                toProductTypeId: toId,
                productStatus: miktarTipiToStatus[row.miktarTipi as keyof typeof miktarTipiToStatus] || 0,
                transmissionRowItmes:
                    (row.items || []).map((it: any) => ({
                        value: Number(it.quantity ?? it.value ?? 0),
                        itemId: toInt(it.id ?? it.itemId),
                    })),
            };
        };

        const updates = (listToUpdate || []).map(buildPayloadRow);

        try {
            const headers = { Authorization: `Bearer ${authToken}` };
            const payload = {
                networkId: Number(networkId),
                createTransmissionRows: updates,
            };

            // فقط و فقط UPDATE
            await axios.put(
                server.baseurl + server.initialoperations + 'update-TransmissionRow',
                payload,
                { headers }
            );

            showAlert('Değişiklikler başarıyla kaydedildi!', 'success');
            setHasUnsavedChanges(false);
            if (networkId) {
                await fetchTransmissionList(networkId);
            }
        } catch (e: any) {
            console.error('Update failed:', e);
            if (e?.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert(
                    e?.response?.data?.message || 'Kayıtlar gönderilirken bir hata oluştu.',
                    'error'
                );
            }
        } finally {
            setLoadingButton(false);
        }
    }, [networkId, navigate, showAlert, fetchTransmissionList, channelRowsData]);


    const handleDeleteAll = useCallback(() => {
        setOpenDeleteAllModal(true);
    }, []);

    const handleConfirmDeleteAll = useCallback(async () => {
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !networkId) {
            showAlert('Yetkisiz işlem.', 'error');
            setLoadingButton(false);
            return;
        }

        try {
            await axios.delete(server.baseurl + server.initialoperations + `delete-TransmissionRow/${networkId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            showAlert('Tüm kayıtlar başarıyla silindi!', 'success');

            setTransmissionList([]);
            setFinalCalculationData(new Map());
            setOpenDeleteAllModal(false);
            setIsInitialEntry(true);
            setHasUnsavedChanges(false);
            resetFormFields();

        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Kayıtlar silinirken bir hata oluştu.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    }, [networkId, showAlert, resetFormFields]);

    const handleRequestSort = useCallback((property: SortableTransmissionKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    }, [order, orderBy]);

    const handleChangePage = useCallback((_event: unknown, newPage: number) => {
        setPage(newPage);
    }, []);

    const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }, []);

    const handleClickMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>, row: TransmissionRow) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    }, []);

    const handleCloseMenu = useCallback(() => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    }, []);


    const handleEditClick = useCallback((row: TransmissionRow) => {
        setEditingRowId(row.id);
        setIsInitialEntry(false);
        const fromOption = combinedProductTypeOptions.find(opt => opt.id === row.fromProductTypeId) || null;
        const toOption = combinedProductTypeOptions.find(opt => opt.id === row.toProductTypeId) || null;

        setFromProductType(fromOption);
        setToProductType(toOption);
        setDistance(String(row.distance));
        setFormulaTitle(row.formulaTitle);
        setAddedItems(row.items || []);

        // **راه حل برای خطای TypeScript**
        // بررسی می‌کنیم که آیا مقدار row.miktarTipi در لیست مقادیر مجاز ما هست یا نه
        const validMiktarTypes = ['Yeni YG', 'Yeni AG', 'DMM YG', 'DMM AG'];
        const newMiktarTipi = validMiktarTypes.includes(row.miktarTipi as string) ? row.miktarTipi : 'Yeni YG';
        setMiktarTipi(newMiktarTipi as any);
        setIsFormVisible(true);

    }, [combinedProductTypeOptions]);


    const handleUpdateRowInTransmissionList = useCallback(() => {
        if (!editingRowId || !fromProductType || !toProductType || !distance || addedItems.length === 0) {
            showAlert('Lütfen tüm gerekli alanları doldurun ve en az bir Şebeke ekleyin.', 'warning');
            return;
        }

        const updatedRow: TransmissionRow = {
            id: editingRowId,
            fromProductType: fromProductType.name,
            toProductType: toProductType.name,
            distance: parseFloat(distance),
            miktarTipi: miktarTipi,
            formulaTitle: formulaTitle,
            items: addedItems,
            fromProductTypeId: fromProductType.id,
            toProductTypeId: toProductType.id,
            recordStatus: transmissionList.find(r => r.id === editingRowId)?.recordStatus,
            network: '',
            networkId: networkId,
        };

        setHasUnsavedChanges(true);
        setTransmissionList(prev => prev.map(row => row.id === editingRowId ? updatedRow : row));

        resetFormFields();
        showAlert('İletim başarıyla güncellendi. Kaydetmek için butona tıklayın.', 'info');

    }, [editingRowId, fromProductType, toProductType, distance, miktarTipi, formulaTitle, addedItems, showAlert, resetFormFields, transmissionList, networkId]);

    const handleDeleteClick = useCallback((row: TransmissionRow) => {
        const dependentRows = transmissionList.filter(
            item => item.fromProductTypeId === row.toProductTypeId
        );
        setDependentTransmissions(dependentRows);
        setTransmissionIdToDelete(row.id);
        setOpenDeleteModal(true);
    }, [transmissionList]);

    const handleCloseDeleteModal = useCallback(() => {
        setOpenDeleteModal(false);
        setTransmissionIdToDelete(null);
    }, []);

    const handleDeleteSuccess = useCallback(async () => {
        if (!transmissionIdToDelete) {
            setOpenDeleteModal(false);
            return;
        }

        const rowToDelete = transmissionList.find(r => r.id === transmissionIdToDelete);
        const dependentRows = transmissionList.filter(r => rowToDelete && r.fromProductTypeId === rowToDelete.toProductTypeId);
        const idsToDelete = new Set([transmissionIdToDelete, ...dependentRows.map(r => r.id)]);
        const newTransmissionList = transmissionList.filter(row => !idsToDelete.has(row.id));

        setTransmissionList(newTransmissionList);
        setHasUnsavedChanges(true);
        setOpenDeleteModal(false);

        await handleBatchUpdate(newTransmissionList);
        showAlert('Kayıt(lar) başarıyla silindi ve sunucuya kaydedildi!', 'success');
        fetchTransmissionList(networkId!);

    }, [transmissionIdToDelete, transmissionList, showAlert, handleBatchUpdate, networkId, fetchTransmissionList]);


    const handleSaveMapChanges = useCallback(async (updatedTransmissions: TransmissionRow[]) => {
        setTransmissionList(updatedTransmissions);
        await handleBatchUpdate(updatedTransmissions);
        showAlert('Harita değişiklikleri başarıyla kaydedildi!', 'success');
    }, [handleBatchUpdate, showAlert]);

    const handleConfirmRegistration = useCallback(async (confirm: boolean) => {
        setOpenConfirmationModal(false);
        if (confirm) {
            setOpenRegistrationModal(true);
        } else {
            if (pendingTransmissions.length > 0) {
                setTransmissionList(pendingTransmissions);
                await handleBatchUpdate(pendingTransmissions);
            }
            setPendingTransmissions([]);
            setNodesToRegister([]);
        }
    }, [pendingTransmissions, handleBatchUpdate]);

    const handleRegistrationSuccess = useCallback(async (registeredNodes: MapNode[]) => {
        setOpenRegistrationModal(false);

        const registeredNodesMap = new Map(registeredNodes.map(node => [node.name, node.id]));

        const finalTransmissions = pendingTransmissions.map(tr => {
            const fromNodeId = registeredNodesMap.get(tr.fromProductType) || tr.fromProductTypeId;
            const toNodeId = registeredNodesMap.get(tr.toProductType) || tr.toProductTypeId;

            return {
                ...tr,
                fromProductTypeId: fromNodeId,
                toProductTypeId: toNodeId,
            };
        });

        setTransmissionList(finalTransmissions);
        await handleBatchUpdate(finalTransmissions);

        showAlert('Tüm değişiklikler başarıyla kaydedildi!', 'success');
        getListProductTypes();
    }, [pendingTransmissions, handleBatchUpdate, showAlert, getListProductTypes]);


    const filteredTransmissionList = useMemo(() => {
        return transmissionList.filter(row => {
            const matchesSearch = searchTerm === '' ||
                row.fromProductType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.toProductType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.formulaTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(row.distance).includes(searchTerm.toLowerCase());

            return matchesSearch
        });
    }, [transmissionList, searchTerm, networkId]);

    const sortedAndFilteredTransmissionList = useMemo(() => {
        return stableSort(filteredTransmissionList, getComparator(order, orderBy));
    }, [filteredTransmissionList, order, orderBy]);

    const paginatedTransmissionList = useMemo(() => {
        return sortedAndFilteredTransmissionList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [sortedAndFilteredTransmissionList, page, rowsPerPage]);


    const handleRowToggle = useCallback((rowId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            } else {
                newSet.add(rowId);
            }
            return newSet;
        });
    }, []);

    const handleOpenFinalCalcModal = useCallback(() => {
        if (networkId) {
            fetchDataForModal(networkId);
        }
        setIsFinalCalcModalOpen(true);
    }, [networkId, fetchDataForModal]);

    const handleCloseFinalCalcModal = useCallback(() => {
        setIsFinalCalcModalOpen(false);
    }, []);


    if (loadingFormOptions || !displayTitlesLoaded) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
                <Typography variant="h6" ml={2}>
                    {networkId ? "Detaylar yükleniyor..." : "Lütfen bir ağ ID'si ile sayfaya erişin."}
                </Typography>
            </Box>
        );
    }

    const isFormDisabled = !networkId;

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between" mb={3}>
                <Grid item xs={12} sm={3} md={3}>
                    <Stack direction="column" alignItems="flex-start" flexWrap="wrap" gap={1} mb={2}>
                        <Chip
                            label={`Şebeke: ${networkTitleForDisplay}`}
                            color="primary"
                            variant="filled"
                            size="small"
                        />
                        <Chip
                            label={`İş: ${workTitleForDisplay}`}
                            color="success"
                            variant="filled"
                            size="small"
                        />
                        <Chip
                            label={`İhale: ${tenderTitleForDisplay}`}
                            color="info"
                            variant="filled"
                            size="small"
                        />
                    </Stack>
                </Grid>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni İletken İcmali Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                fullWidth={false}
                                isBlinking={isBlinking}
                            >
                                Yeni İletken İcmali Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={resetFormFields}
                                // disabled={loadingButton}
                                fullWidth={false}
                                startIcon={<IconX size={20} />}
                            >
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                    <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                        <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                            endIcon={<IconArrowRight size={20} />}>
                            Geri Dön
                        </Button>
                    </CustomTooltip>

                </Stack>

            </Grid>

            <Grid item xs={12} sm={12} md={12} sx={{ textAlign: isSmallScreen ? 'left' : 'right' }}>
                {((isFormVisible && hasCreatePermission) || (editingRowId && hasEditPermission)) && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} justifyContent="flex-end">
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => {
                                resetFormFields();
                                setIsInitialEntry(true);
                            }}
                            startIcon={<IconRefresh />}
                            disabled={loadingButton}
                            fullWidth={isSmallScreen}
                        >
                            Yeni TRAFO'dan Başla
                        </Button>
                        {transmissionList.length > 0 && (
                            <Button
                                variant="outlined"
                                color="info"
                                onClick={() => setOpenSelectTrafoModal(true)}
                                startIcon={<IconPlus />}
                                disabled={loadingButton}
                                fullWidth={isSmallScreen}
                            >
                                TRAFO Seç
                            </Button>
                        )}

                        {hasCreatePermission && (
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleOpenMapModal}
                                disabled={!networkId || loadingList || transmissionList.length === 0}
                                startIcon={<IconMap />}
                                fullWidth={isSmallScreen}
                            >
                                Haritayı Görüntüle
                            </Button>
                        )}
                    </Stack>
                )}
            </Grid>
            {((isFormVisible && hasCreatePermission) || (editingRowId && hasEditPermission)) && (
                <>

                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2} alignItems="flex-end">
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel htmlFor="from-product-type" required>
                                    Kaynak Geresi
                                </CustomFormLabel>
                                <Autocomplete
                                    id="from-product-type"
                                    options={isInitialEntry ? availableTrafoOptions : [fromProductType].filter(Boolean) as SelectOption[]}
                                    getOptionLabel={(option) => option.name}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={fromProductType}
                                    onChange={(_e, newValue) => {
                                        setFromProductType(newValue);
                                        setToProductType(null);
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Seç" variant="outlined" size="small" />}
                                    onOpen={() => handleAutocompleteOpen(fromProductTypeRef)}
                                    sx={{ '& .MuiAutocomplete-inputRoot': { py: 0.5 } }}
                                    onInputChange={(_event) => { }}
                                    disabled={isFormDisabled || loadingList || (transmissionList.length > 0 && !isInitialEntry)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel htmlFor="to-product-type" required>Hedef Ürün Tipi</CustomFormLabel>
                                <Autocomplete
                                    id="to-product-type"
                                    options={toProductTypeOptions}
                                    getOptionLabel={(option) => option.name}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={toProductType}
                                    onChange={(_e, newValue) => setToProductType(newValue)}
                                    renderInput={(params) => <TextField {...params} label="Seç" variant="outlined" size="small" />}
                                    onOpen={() => handleAutocompleteOpen(toProductTypeRef)}
                                    sx={{ '& .MuiAutocomplete-inputRoot': { py: 0.5 } }}
                                    onInputChange={(_event) => { }}
                                    disabled={isFormDisabled || !fromProductType || toProductTypeOptions.length === 0}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel htmlFor="distance" required>Mesafe</CustomFormLabel>
                                <TextField
                                    id="distance"
                                    type="number"
                                    placeholder="Mesafe"
                                    fullWidth
                                    value={distance}
                                    onChange={(e) => setDistance(e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    inputProps={{ min: 0 }}
                                    disabled={isFormDisabled}
                                />
                            </Grid>
                        </Grid>
                        <Grid container spacing={2} alignItems="flex-end" sx={{ mt: 2 }}>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel component="legend">Miktar Tipi</CustomFormLabel>
                                <RadioGroup row name="miktar-tipi" value={miktarTipi} onChange={(e) => setMiktarTipi(e.target.value as 'Yeni YG' | 'Yeni AG' | 'DMM YG' | 'DMM AG')}>
                                    <FormControlLabel value="Yeni YG" control={<Radio size="small" />} label="Yeni YG" disabled={isFormDisabled} />
                                    <FormControlLabel value="Yeni AG" control={<Radio size="small" />} label="Yeni AG" disabled={isFormDisabled} />
                                    <FormControlLabel value="DMM YG" control={<Radio size="small" />} label="DMM YG" disabled={isFormDisabled} />
                                    <FormControlLabel value="DMM AG" control={<Radio size="small" />} label="DMM AG" disabled={isFormDisabled} />
                                </RadioGroup>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel htmlFor="formula-title">Formül Başlığı</CustomFormLabel>
                                <TextField
                                    id="formula-title"
                                    placeholder="Formül Başlığı"
                                    fullWidth
                                    value={formulaTitle}
                                    onChange={(e) => setFormulaTitle(e.target.value)}
                                    variant="outlined"
                                    size="small"
                                    disabled={isFormDisabled}
                                />
                            </Grid>
                        </Grid>
                        <Box mt={3}>
                            <Typography variant="h6" gutterBottom>
                                Şebeke ve Miktar Ekle
                            </Typography>
                            <Grid container spacing={2} alignItems="center" mt={isSmallScreen ? 1 : 4} mb={2}>
                                <Grid item xs={12} sm={6} md={6}>
                                    <Autocomplete
                                        id="item-select"
                                        options={availableItems}
                                        getOptionLabel={(option) => option.name}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        value={selectedItem}
                                        onChange={(_e, newValue) => setSelectedItem(newValue)}
                                        renderInput={(params) => <TextField {...params} label="Şebeke Seçin" variant="outlined" size="small" />}
                                        sx={{ flexGrow: 1 }}
                                        disabled={loadingItems}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3} md={2}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {selectedItem && selectedItem.unit && (
                                            <Typography variant="body1" sx={{ whiteSpace: 'nowrap' }}>
                                                {selectedItem.unit.title}
                                            </Typography>
                                        )}
                                        <TextField
                                            id="item-quantity"
                                            label="Miktar"
                                            type="number"
                                            size="small"
                                            fullWidth
                                            value={itemQuantity}
                                            onChange={(e) => setItemQuantity(e.target.value)}
                                            InputProps={{ inputProps: { min: 0 } }}
                                        />
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} sm={3} md={4} sx={{ textAlign: isSmallScreen ? 'right' : 'left' }}>
                                    {editingItem ? (
                                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: '100%' }}>
                                            <Button
                                                variant="contained"
                                                color="info"
                                                onClick={handleUpdateEditedItem}
                                                disabled={!selectedItem || !itemQuantity || parseFloat(itemQuantity) <= 0}
                                                startIcon={<IconEdit size={20} />}
                                            >
                                                Güncelle
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="secondary"
                                                onClick={handleCancelEditItem}
                                                startIcon={<IconX size={20} />}
                                            >
                                                İptal
                                            </Button>
                                        </Stack>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={handleAddItem}
                                                    disabled={!selectedItem || !itemQuantity || parseFloat(itemQuantity) <= 0}
                                                    startIcon={loadingItems ? <CircularProgress size={20} color="inherit" /> : <IconPlus size={20} />}
                                                >
                                                    Ekle
                                                </Button>

                                            )}
                                        </>
                                    )}
                                </Grid>
                            </Grid>
                            <Box
                                sx={{
                                    p: 1,
                                    border: '1px solid rgba(0, 0, 0, 0.12)',
                                    borderRadius: '4px',
                                    minHeight: 40,
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 1
                                }}
                            >
                                {addedItems.map(item => (
                                    <Box
                                        key={item.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            backgroundColor: theme.palette.action.selected,
                                            border: `1px solid ${theme.palette.divider}`,
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ mr: 1, color: theme.palette.text.primary }}>
                                            {`${item.name}: ${item.quantity}`}
                                        </Typography>
                                        <IconButton
                                            onClick={() => handleEditAddedItem(item)}
                                            size="small"
                                            sx={{ color: theme.palette.info.main }}
                                            disabled={!!editingItem && editingItem.id !== item.id}
                                        >
                                            <IconPencil size={16} />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDeleteAddedItem(item.id)}
                                            size="small"
                                            sx={{ color: theme.palette.error.main }}
                                            disabled={!!editingItem && editingItem.id !== item.id}
                                        >
                                            <IconTrash size={16} />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                                {editingRowId ? (
                                    <>
                                        <Button
                                            variant="contained"
                                            color="info"
                                            onClick={handleUpdateRowInTransmissionList}
                                            disabled={loadingButton || !isFormComplete}
                                            startIcon={loadingButton ? <CircularProgress size={20} color="inherit" /> : <IconEdit />}
                                        >
                                            Güncelle
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            onClick={resetFormFields}
                                            disabled={loadingButton}
                                            startIcon={<IconX />}
                                        >
                                            İptal
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleAddRowToTransmissionList}
                                        disabled={loadingButton || !isFormComplete}
                                        startIcon={loadingButton ? <CircularProgress size={20} color="inherit" /> : <IconPlus />}
                                    >
                                        Ekle
                                    </Button>
                                )}
                            </Stack>
                        </Grid>
                    </Paper>


                </>

            )}
            <>
                <Typography variant="h5" gutterBottom mt={4}>İletim Listesi</Typography>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Şantiye Ara"
                                variant="outlined"
                                fullWidth
                                size="small"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <Stack direction={isSmallScreen ? "column" : "row"} justifyContent="flex-end" spacing={1} flexWrap="wrap" gap={1}>

                                {hasEditPermission && (<Box
                                    sx={{
                                        zIndex: 1000,
                                        animation: `${hasUnsavedChanges ? `${blinkAnimation} 1.5s infinite` : 'none'}`,
                                        '&:hover': { animation: 'none' },
                                        width: isSmallScreen ? '100%' : 'auto'
                                    }}
                                >
                                    <CustomTooltip
                                        title={isTooltipGloballyEnabled ? "Değişiklikleriniz kaydedilmedi. Son kaydetme işlemi için bu butona tıklayın." : ""}
                                        placement={isSmallScreen ? "top" : "right"}
                                    >
                                        <Button
                                            variant="contained"
                                            color="info"
                                            onClick={() => handleBatchUpdate(transmissionList)}
                                            disabled={loadingButton || !hasUnsavedChanges || isFormDisabled || transmissionList.length === 0}
                                            startIcon={loadingButton ? <CircularProgress size={20} color="inherit" /> : <IconEdit />}
                                            fullWidth={isSmallScreen}
                                        >
                                            {loadingButton ? 'Kaydediliyor...' : 'Kaydet (Tümünü Güncelle)'}
                                        </Button>
                                    </CustomTooltip>

                                </Box>)}
                                {hasDeletePermission && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={handleDeleteAll}
                                        disabled={loadingButton || isFormDisabled || transmissionList.length === 0}
                                        startIcon={<IconTrash />}
                                        fullWidth={isSmallScreen}
                                    >
                                        Hepsini Sil
                                    </Button>
                                )}
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleOpenFinalCalcModal}
                                    disabled={Array.from(finalCalculationData.values()).flatMap(m => Array.from(m.values())).length === 0}
                                    startIcon={<IconChartDots />}
                                    fullWidth={isSmallScreen}
                                >
                                    Toplam Kayıtları Görüntüle
                                </Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </>

            {alertMessage && (
                <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>
                        {alertMessage}
                    </Alert>
                </Stack>
            )}
            <BlankCard>
                <TableContainer>
                    <Table>
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <TableCell>
                                    <Typography variant="h6"></Typography>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel active={orderBy === 'fromProductType'} direction={orderBy === 'fromProductType' ? order : 'asc'} onClick={() => handleRequestSort('fromProductType')}>
                                        <Typography variant="h6">Kaynak Ürün Tipi</Typography>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel active={orderBy === 'toProductType'} direction={orderBy === 'toProductType' ? order : 'asc'} onClick={() => handleRequestSort('toProductType')}>
                                        <Typography variant="h6">Hedef Ürün Tipi</Typography>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel active={orderBy === 'distance'} direction={orderBy === 'distance' ? order : 'asc'} onClick={() => handleRequestSort('distance')}>
                                        <Typography variant="h6">Mesafe</Typography>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel active={orderBy === 'miktarTipi'} direction={orderBy === 'miktarTipi' ? order : 'asc'} onClick={() => handleRequestSort('miktarTipi')}>
                                        <Typography variant="h6">Miktar Tipi</Typography>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel active={orderBy === 'formulaTitle'} direction={orderBy === 'formulaTitle' ? order : 'asc'} onClick={() => handleRequestSort('formulaTitle')}>
                                        <Typography variant="h6">Formül Başlığı</Typography>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell style={{ color: "#171c23", width: '50px' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingList ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <CircularProgress size={20} />
                                        <Typography color="textSecondary" ml={2}>Veriler yükleniyor...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (paginatedTransmissionList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Typography color="textSecondary" py={3}>
                                            Bu ağ için henüz iletim kaydı bulunamadı.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTransmissionList.map(row => (
                                    <React.Fragment key={row.id}>
                                        <TableRow>
                                            <TableCell>
                                                <IconButton
                                                    onClick={() => handleRowToggle(row.id)}
                                                    size="small"
                                                    disabled={!row.items || row.items.length === 0}
                                                >
                                                    {expandedRows.has(row.id) ? <IconMinus /> : <IconPlus />}
                                                </IconButton>
                                            </TableCell>
                                            <TableCell>{row.fromProductType}</TableCell>
                                            <TableCell>{row.toProductType}</TableCell>
                                            <TableCell>{row.distance}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={row.miktarTipi}
                                                    size="small"
                                                    color={
                                                        row.miktarTipi.includes('Yeni') ? 'success' :
                                                            row.miktarTipi.includes('DMM') ? 'info' :
                                                                'warning'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>{row.formulaTitle}</TableCell>
                                            <TableCell sx={{ width: '50px' }}>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton
                                                        id={`basic-button-${row.id}`}
                                                        aria-controls={openMenu ? 'basic-menu' : undefined}
                                                        aria-haspopup="true"
                                                        aria-expanded={openMenu ? 'true' : undefined}
                                                        onClick={(event) => { handleClickMenu(event, row); }}
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
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu iletimi düzenle" : ""}>
                                                            <MenuItem onClick={() => { handleEditClick(selectedRowForMenu!); handleCloseMenu(); }}>
                                                                <ListItemIcon>
                                                                    <IconEdit width={18} />
                                                                </ListItemIcon>
                                                                Düzenlemek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu iletimi sil" : ""}>
                                                            <MenuItem onClick={() => { handleDeleteClick(selectedRowForMenu!); handleCloseMenu(); }}>
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
                                        {expandedRows.has(row.id) && (
                                            <TableRow>
                                                <TableCell colSpan={8}>
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 2, backgroundColor: theme.palette.action.hover }}>
                                                        {row.items && row.items.length > 0 ? (
                                                            row.items.map(item => (
                                                                <Chip
                                                                    key={item.id}
                                                                    label={`${item.name} (${item.quantity})`}
                                                                    size="small"
                                                                    sx={{
                                                                        backgroundColor: theme.palette.grey[200],
                                                                        border: '1px solid #000',
                                                                        borderRadius: '4px',
                                                                    }}
                                                                />
                                                            ))
                                                        ) : (
                                                            <Typography variant="body2" color="textSecondary">
                                                                Bu iletim için Şebeke bulunamadı.
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sortedAndFilteredTransmissionList.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Satır başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>


            <FinalCalculationModal
                open={isFinalCalcModalOpen}
                onClose={handleCloseFinalCalcModal}
                aggregatedItems={finalCalculationData}
                transmissionSummary={transmissionSummary}
                networkId={networkId}
                onDataUpdated={() => {
                    if (networkId) {
                        fetchDataForModal(networkId);
                    }
                }}
            />

            <Dialog
                open={openConfirmationModal}
                onClose={() => handleConfirmRegistration(false)}
                aria-labelledby="confirm-registration-modal-title"
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle id="confirm-registration-modal-title">
                    Kaydedilmemiş Direkler Bulundu
                </DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        Aşağıdaki direkler sisteminizde kayıtlı değil:
                    </DialogContentText>
                    <Stack spacing={1} mt={2}>
                        {nodesToRegister.map((node, index) => (
                            <Chip key={index} label={node.name} color="error" />
                        ))}
                    </Stack>
                    <DialogContentText mt={2}>
                        Değişiklikleri kaydetmeden önce bu direkleri kaydetmek ister misiniz?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => handleConfirmRegistration(false)}
                        color="error"
                    >
                        Hayır, yeni direkleri yok say
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleConfirmRegistration(true)}
                    >
                        Evet, önce kaydet
                    </Button>
                </DialogActions>
            </Dialog>

            <RegisterNewNodesModal
                open={openRegistrationModal}
                onClose={() => setOpenRegistrationModal(false)}
                nodesToRegister={nodesToRegister}
                onRegisterSuccess={handleRegistrationSuccess}
                showAlert={showAlert}
                getListProductTypes={getListProductTypes}
            />

            <MapPreviewModal
                open={isMapModalOpen}
                onClose={handleCloseMapModal}
                transmissions={transmissionList}
                networkId={networkId}
                networkTitle={networkTitleForDisplay}
                onSaveMapChanges={handleSaveMapChanges}
                allProductTypes={combinedProductTypeOptions}
                onUpdateTransmissions={() => { }}
                itemsList={itemsList}
                showAlert={showAlert}
                onRegisterNewTrafo={handleRegisterNewTrafo}
                productTypesList={allProductTypes}
                availableTrafoOptionsForMap={availableTrafoOptionsForMap}
                availableProductTypeOptionsForMap={availableProductTypeOptionsForMap}
            />

            <DeleteTransmissionModal
                openModal={openDeleteModal}
                onConfirm={handleDeleteSuccess}
                onClose={handleCloseDeleteModal}
                loading={loadingButton}
                dependentRows={dependentTransmissions}
            />
            <DeleteAllConfirmationModal
                open={openDeleteAllModal}
                onClose={() => setOpenDeleteAllModal(false)}
                onConfirm={handleConfirmDeleteAll}
                loading={loadingButton}
            />

            <Dialog
                open={openSelectTrafoModal}
                onClose={() => setOpenSelectTrafoModal(false)}
                aria-labelledby="select-trafo-modal-title"
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle id="select-trafo-modal-title">
                    Mevcut TRAFO Seç
                </DialogTitle>
                <DialogContent dividers>
                    <Autocomplete
                        options={trafoOptions}
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_e, newValue) => {
                            if (newValue) {
                                handleSelectTrafo(newValue);
                            }
                        }}
                        renderInput={(params) => <TextField {...params} label="TRAFO Seç" variant="outlined" size="small" />}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSelectTrafoModal(false)} color="error">
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListTransmission;