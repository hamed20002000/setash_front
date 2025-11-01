// src/views/warehouses/ListStoreDispatchReturnToCenter.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Chip, Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    FormControl,
    RadioGroup,
    FormControlLabel,
    Radio,
    DialogActions,
    DialogContentText
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconArrowRight, IconEye, IconX, IconReload, IconPlus, IconInfoCircle,
    IconFileSpreadsheet,
    IconFileText,
    IconRefresh,
} from '@tabler/icons-react';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from 'src/components/shared/BlankCard';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useAuth } from 'src/context/AuthContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

import DeleteStoreDispatchReturnToCenter from "./DeleteStoreDispatchReturnToCenter";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

// === Type Definitions (Unchanged) ===
interface ItemUnitType {
    id: string;
    title: string;
    recordStatus: number;
    createAt: string;
}

interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    unit?: ItemUnitType;
    recordStatus?: number;
}

interface DispatchDetailType {
    id: string;
    quantity: string;
    description: string;
    item?: ItemType;
    itemId?: number;
    name?: string;
    balance?: string;
}

interface StoreType {
    id: string;
    name: string;
    recordStatus: number;
}
interface DriverType {
    id: string;
    name: string;
    family: string;
    recordStatus?: number;
}
interface VehicleType {
    id: string;
    name: string;
    plaque: string;
    model: number | string;
    recordStatus: number;
}

interface StoreDispatchReturnToCenterType {
    id: string;
    code: string;
    docDate: string;
    description: string,
    createAt: string;
    recordStatus: number;
    destruction: boolean | null;
    status: 0 | 1 | 2;
    statusDescription: string | null;
    store: StoreType;
    destinationWarehouse: StoreType | null;
    driver?: DriverType;
    driverVehicle?: VehicleType;
    storeDispatchDetails: DispatchDetailType[];
}

interface NewDispatchData {
    destruction: boolean;
    docDate: string;
    description: string,
    storeId: number;
    driverId: number;
    driverVehicleId: number;
    destinationWarehouseId: number;
    dispatchDetails: {
        itemId: number;
        quantity: number;
        description: string;
    }[];
}

interface EditDispatchData extends NewDispatchData {
    id: number;
    code: string;
}

interface ItemBalanceType {
    itemId: string;
    code: string | null;
    name: string;
    balance: string;
    unit: ItemUnitType;
}

interface FormDispatchDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    item?: string;          // تغییر ItemType به string
    balance?: number;
    unit?: string;
}

// === Utility Functions (Unchanged) ===
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const getStatusTextAndColor = (status: 0 | 1 | 2): { text: string, color: 'default' | 'success' | 'error' | 'warning' | 'info' } => {
    switch (status) {
        case 0:
            return { text: 'Beklemede', color: 'warning' };
        case 1:
            return { text: 'Onaylandı', color: 'success' };
        case 2:
            return { text: 'Reddedildi', color: 'error' };
        default:
            return { text: 'Bilinmiyor', color: 'info' };
    }
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
const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));


const ListStoreDispatchReturnToCenter = () => {
    const { storeId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');


    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const idsFromState =
        ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState :
        (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
    const hasIdsFilter = notifIds.length > 0;
    const idsSet = new Set<number>(notifIds);

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [selectedDestinationWarehouseId, setSelectedDestinationWarehouseId] = useState<number | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);

    const [dispatchDetails, setDispatchDetails] = useState<FormDispatchDetail[]>([]);
    const [dispatchList, setDispatchList] = useState<StoreDispatchReturnToCenterType[]>([]);
    const [displayedDispatches, setDisplayedDispatches] = useState<StoreDispatchReturnToCenterType[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<StoreDispatchReturnToCenterType | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [driverIdError, setDriverIdError] = useState<boolean>(false);
    const [destinationWarehouseIdError, setDestinationWarehouseIdError] = useState<boolean>(false);
    const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [warehouses, setWarehouses] = useState<StoreType[]>([]);
    const [storeItems, setStoreItems] = useState<ItemBalanceType[]>([]);

    const [generalDescription, setGeneralDescription] = useState('');
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [dispatchIdToAct, setDispatchIdToAct] = useState<string | null>(null);
    const [dispatchCodeToAct, setDispatchCodeToAct] = useState<string>('');

    const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
    const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);
    const [openVehicleModal, setOpenVehicleModal] = useState(false);

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [detailsToShow, setDetailsToShow] = useState<DispatchDetailType[]>([]);
    const [totalQuantityInDetailsModal, setTotalQuantityInDetailsModal] = useState<number>(0);

    // Status Description Modal States
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [currentStatusDescription, setCurrentStatusDescription] = useState<string | null>(null);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [removedDispatchDetails, setRemovedDispatchDetails] = useState<any[]>([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(false);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedDispatchForDownload, setSelectedDispatchForDownload] = useState<StoreDispatchReturnToCenterType | null>(null);

    const [initialDispatchDetails, setInitialDispatchDetails] = useState<FormDispatchDetail[]>([]);


    const [openDescriptionModalT, setOpenDescriptionModalT] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    // === Permissions ===
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);


    // === Form Handlers ===
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    const fetchVehicles = useCallback(async (driverId: string) => {
        setLoadingData(true);
        if (!authToken) {
            showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
            setLoadingData(false);
            return;
        }

        try {
            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${driverId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const formattedData: VehicleType[] = response.data.data.map((item: any) => ({
                    ...item,
                    model: String(item.model),
                    id: String(item.id)
                }));
                const activeVehicles = formattedData.filter(item => item.recordStatus === 0);
                setVehiclesList(activeVehicles);

                if (activeVehicles.length > 1) {
                    setOpenVehicleModal(true);
                    setTempSelectedVehicle(Number(activeVehicles[0].id));
                } else if (activeVehicles.length === 1) {
                    setSelectedVehicleId(Number(activeVehicles[0].id));
                    setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
                } else {
                    setSelectedVehicleId(null);
                    setSelectedVehicleName(null);
                }
            } else {
                setVehiclesList([]);
                setSelectedVehicleId(null);
                setSelectedVehicleName(null);
            }
        } catch (e: any) {
            setVehiclesList([]);
            setSelectedVehicleId(null);
            setSelectedVehicleName(null);
            showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [showAlert, authToken]);

    // Fetch items by destination warehouse ID for the create form
    const fetchDispatchItemsByDestination = useCallback(async () => {
        if (!authToken || !selectedDestinationWarehouseId) return;

        setLoadingButton(true);
        try {
            const response = await axios.get<any>(
                `${server.baseurl}${server.warehouse}get-store-all-items-balance/${Number(storeId)}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                // const itemDetails: DispatchDetailType[] = response.data.data || [];
                const itemBalances: ItemBalanceType[] = response.data.data || [];


                const formattedDetails: FormDispatchDetail[] = itemBalances.map((d: ItemBalanceType) => {
                    const itemBalance = storeItems.find(item => Number(item.itemId) === Number(d.itemId));

                    return {
                        itemId: Number(d.itemId),
                        quantity: Number(d.balance) > 0 ? Number(d.balance) : 0,
                        description: '',
                        item: d.name as any,
                        balance: itemBalance ? Number(itemBalance.balance) : 0,
                        unit: '' as any,
                    };
                });

                setDispatchDetails(formattedDetails);
                showAlert('Sevk detayları başarıyla yüklendi. Lütfen miktarları stok durumuna göre kontrol ediniz.', 'success');
            } else {
                setDispatchDetails([]);
                showAlert('Bu merkez için önceden tanımlanmış iade detayı bulunamadı', 'warning');
            }
        } catch (e: any) {
            showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    }, [authToken, selectedDestinationWarehouseId, showAlert, storeItems]);

    // Fetch all store items balance
    const fetchStoreItems = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<any>(
                `${server.baseurl}${server.warehouse}get-store-all-items-balance/${Number(storeId)}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                setStoreItems(response.data.data);
                return response.data.data as ItemBalanceType[];
            } else {
                setStoreItems([]);
                return [];
            }
        } catch (e: any) {
            setStoreItems([]);
            showAlert('Mevcut stok bilgileri yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, storeId, showAlert, authToken]);

    const fetchDispatches = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        try {
            const [driversRes, storesRes, dispatchesRes] = await Promise.all([
                axios.get<any>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<any>(server.baseurl + server.initialoperations + "get-warehouses", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<any>(server.baseurl + server.warehouse + `get-Store-dispatches-return-to-center/${Number(storeId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);

            setDrivers(driversRes.data?.data?.filter((d: any) => d.recordStatus === 0).map((d: any) => ({ ...d, id: String(d.id) })) || []);
            setWarehouses(storesRes.data?.data?.filter((w: any) => w.recordStatus === 0).map((w: any) => ({ ...w, id: String(w.id) })) || []);

            if (dispatchesRes.data?.httpStatusCode === 200) {
                debugger
                const allDispatches: StoreDispatchReturnToCenterType[] = dispatchesRes.data.data;
                setDispatchList(allDispatches);
            } else {
                showAlert(dispatchesRes.data?.message || 'İade sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, storeId, showAlert, authToken]);

    useEffect(() => {
        fetchDispatches();
        fetchStoreItems();
    }, [fetchDispatches, fetchStoreItems]);

    useEffect(() => {
        let filteredDispatches = dispatchList.filter(d => {
            const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.destinationWarehouse?.name && d.destinationWarehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && d.recordStatus === 0) ||
                (statusFilter === 'inactive' && d.recordStatus === 1);

            const docDate = new Date(d.docDate);
            const startCheck = !startDate || docDate >= startDate;
            const endCheck = !endDate || docDate <= endDate;


            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(d.id));

            return matchesSearch && matchesStatus && startCheck && endCheck && matchesNotifIds;
        });
        setDisplayedDispatches(filteredDispatches);
        setPage(0);
    }, [dispatchList, searchTerm, statusFilter, startDate, endDate, notifIds]);


    useEffect(() => {
        const isValid = !!selectedDriverId && !!selectedDestinationWarehouseId &&
            !!docDate && dispatchDetails.length > 0 &&
            dispatchDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(isValid);
    }, [selectedDriverId, selectedDestinationWarehouseId, docDate, dispatchDetails]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);


    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);


    const validateForm = (): boolean => {
        let isValid = true;

        if (!selectedDriverId) { setDriverIdError(true); isValid = false; } else { setDriverIdError(false); }
        if (!selectedDestinationWarehouseId) { setDestinationWarehouseIdError(true); isValid = false; } else { setDestinationWarehouseIdError(false); }
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }

        if (dispatchDetails.length === 0) {
            setDispatchDetailsError(true);
            isValid = false;
        } else {
            const isDetailsValid = dispatchDetails.every((detail) => {
                const numQuantity = Number(detail.quantity);
                if (isNaN(numQuantity) || numQuantity <= 0) return false;

                const currentItemBalance = storeItems.find(item => Number(item.itemId) === Number(detail.itemId));
                const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;
                let maxAllowedQuantity = currentStockBalance;

                if (editingId) {
                    const initialDetail = initialDispatchDetails.find(d => d.itemId === detail.itemId);
                    if (initialDetail && Number(initialDetail.itemId) === Number(detail.itemId)) {
                        const initialQuantity = Number(initialDetail.quantity);
                        maxAllowedQuantity += initialQuantity;
                    }
                }

                if (numQuantity > maxAllowedQuantity) return false;
                return true;
            });

            if (!isDetailsValid) { setDispatchDetailsError(true); isValid = false; } else { setDispatchDetailsError(false); }
        }

        if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return isValid;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setGeneralDescription('');
        setSelectedDriverId(null);
        setSelectedDestinationWarehouseId(null);
        setDispatchDetails([]);
        setIsFormVisible(false);
        setEditingId(null);
        setEditingCode(null);
        setDocDateError(false);
        setDriverIdError(false);
        setDestinationWarehouseIdError(false);
        setDispatchDetailsError(false);
        setSelectedVehicleId(null);
        setSelectedVehicleName(null);
        setRemovedDispatchDetails([]);
        setInitialDispatchDetails([]);
        setIsBlinking(false);
    };

    // **CREATE**: Insert Dispatch Return
    const insertDispatch = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const payload: NewDispatchData = {
            destruction: true,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
            storeId: Number(storeId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            destinationWarehouseId: Number(selectedDestinationWarehouseId),
            dispatchDetails: dispatchDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description || ''
            }))
        };
        debugger
        try {
            const response = await axios.post(server.baseurl + server.warehouse + "create-store-dispatch-return-to-center", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni iade sevk belgesi başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchDispatches();
            } else {
                showAlert(response.data.message || 'İade sevk belgesi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'İade sevk belgesi eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // **EDIT**: Edit Dispatch Return
    const editDispatch = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const payload: EditDispatchData = {
            id: Number(editingId),
            code: editingCode!,
            destruction: true, // Always true as requested
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
            storeId: Number(storeId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            destinationWarehouseId: Number(selectedDestinationWarehouseId),
            dispatchDetails: dispatchDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description || ''
            }))
        };

        try {
            const response = await axios.put(server.baseurl + server.warehouse + "update-store-dispatch-return-to-center", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 200) {
                showAlert('İade sevk belgesi başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchDispatches();
            } else {
                showAlert(response.data.message || 'İade sevk belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'İade sevk belgesi güncellenirken bir hata oluştu.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };

    // **FIXED**: Function to close the action menu
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    // const handleEditClick = async () => {
    //     if (selectedRowForMenu) {
    //         setLoadingData(true);
    //         handleCloseMenu();
    //         await fetchStoreItems();

    //         const formattedDetails: FormDispatchDetail[] = (selectedRowForMenu.storeDispatchDetails || []).map(d => {
    //             const itemBalance = storeItems.find(item => Number(item.itemId) === Number(d.itemId));
    //             return {
    //                 itemId: Number(d.itemId),
    //                 quantity: Number(d.balance) > 0 ? Number(d.balance) : 0,
    //                 description: '',
    //                 item: d.name,
    //                 balance: itemBalance ? Number(itemBalance.balance) : 0,
    //                 unit: '',
    //             };
    //         });

    //         setDispatchDetails(formattedDetails);
    //         setInitialDispatchDetails(formattedDetails);

    //         setEditingId(selectedRowForMenu.id);
    //         setEditingCode(selectedRowForMenu.code);
    //         setDocDate(new Date(selectedRowForMenu.docDate));
    //         setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
    //         setSelectedDestinationWarehouseId(Number(selectedRowForMenu.destinationWarehouse?.id));

    //         if (selectedRowForMenu.driverVehicle) {
    //             setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
    //             setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
    //         } else {
    //             setSelectedVehicleId(null);
    //             setSelectedVehicleName(null);
    //         }

    //         setIsFormVisible(true);
    //         setLoadingData(false);
    //     }
    // };

    // در ListStoreDispatchReturnToCenter.tsx

    const handleEditClick = async () => {
        if (selectedRowForMenu) {
            setLoadingData(true);
            handleCloseMenu();
            const latestStoreItems = await fetchStoreItems();
            const formattedDetails: FormDispatchDetail[] = (selectedRowForMenu.storeDispatchDetails || []).map(d => {
                const itemId = Number(d.item?.id) || Number(d.itemId);

                const itemBalance = latestStoreItems!.find(item =>
                    Number(item.itemId) === Number(d.item?.id)
                );

                const currentStockBalance = itemBalance ? Number(itemBalance.balance) : 0;

                const initialQuantity = Number(d.quantity) || 0;

                return {
                    itemId: itemId,
                    quantity: initialQuantity,
                    description: d.description || '',

                    item: d.item?.name || '',

                    balance: currentStockBalance,
                    unit: d.item?.unit?.title || '',
                };
            });

            setDispatchDetails(formattedDetails);
            setInitialDispatchDetails(formattedDetails);


            setEditingId(selectedRowForMenu.id);
            setEditingCode(selectedRowForMenu.code);
            setDocDate(new Date(selectedRowForMenu.docDate));
            setGeneralDescription(selectedRowForMenu.description || '');
            setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
            setSelectedDestinationWarehouseId(Number(selectedRowForMenu.destinationWarehouse?.id));

            if (selectedRowForMenu.driverVehicle) {
                setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
                setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
            } else {
                setSelectedVehicleId(null);
                setSelectedVehicleName(null);
            }

            setIsFormVisible(true);
            setLoadingData(false);
        }
    };

    const handleCancelEdit = () => {
        resetFormAndState();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setDispatchIdToAct(selectedRowForMenu.id);
            setDispatchCodeToAct(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleRestoreDispatchDetail = (indexToRestore: number) => {
        const itemToRestore = removedDispatchDetails[indexToRestore];
        if (itemToRestore) {
            setDispatchDetails(prev => [...prev, itemToRestore]);
            setRemovedDispatchDetails(prev => prev.filter((_, i) => i !== indexToRestore));
            showAlert(`Ürün başarıyla geri eklendi: ${itemToRestore.item?.name || ''}`, 'info');
        }
    };

    const handleRemoveDispatchDetail = (index: number) => {
        setDispatchDetails(prev => {
            const newDetails = prev.filter((_, i) => i !== index);
            const removedItem = prev[index];
            if (removedItem) {
                setRemovedDispatchDetails(oldRemoved => [...oldRemoved, removedItem]);

                const itemName = removedItem.item || '';

                showAlert(`Ürün silindi: ${itemName}. Geri almak için silinen ürünler listesine tıklayın.`, 'warning');
            }
            return newDetails;
        });
    };

    // **FIXED**: Function to handle change in dispatch details
    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormDispatchDetail, value: any) => {
        setDispatchDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };

            const originalDetail = initialDispatchDetails.find(d => d.itemId === updatedDetail.itemId);
            const originalQuantity = originalDetail ? Number(originalDetail.quantity) : 0;

            const currentItemBalance = storeItems.find(item => Number(item.itemId) === Number(updatedDetail.itemId));
            const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;

            const maxAllowedQuantity = currentStockBalance + (editingId ? originalQuantity : 0);

            if (field === 'quantity') {
                const numValue = Number(value);

                if (isNaN(numValue) || numValue < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updatedDetail.quantity = 0;
                } else if (numValue > maxAllowedQuantity) {
                    showAlert(`Girdiğiniz miktar stoktan fazla! Maksimum: ${maxAllowedQuantity}`, 'warning');
                    updatedDetail.quantity = maxAllowedQuantity;
                } else {
                    updatedDetail.quantity = numValue;
                }
            } else {
                (updatedDetail as any)[field] = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [showAlert, storeItems, initialDispatchDetails, editingId]);

    const handleOpenDescriptionModal = (description: string) => {
        setCurrentStatusDescription(description);
        setOpenDescriptionModal(true);
    };

    const handleOpenDetailsModal = (details: DispatchDetailType[]) => {
        setDetailsToShow(details);
        const total = details.reduce((sum, detail) => sum + Number(detail.quantity || 0), 0);
        setTotalQuantityInDetailsModal(total);
        setOpenDetailsModal(true);
    };

    // === PDF/Excel Export Logic (Unchanged but needed) ===
    const exportDispatchesToPdf = (data: StoreDispatchReturnToCenterType[], title: string, subtitle?: string) => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning'); return; }

        showAlert('PDF oluşturuluyor...', 'info');
        const doc = new jsPDF();
        const docAny = doc as any;

        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const addPdfHeader = () => {
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
            doc.setFontSize(14);
            doc.text(title, pageWidth / 2, 35, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Rapor Tarihi:`, 15, 45);
            doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 45);
            if (subtitle) { doc.text(subtitle, 75, 50); }
        };
        const addPdfFooter = () => {
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
            const pageCount = docAny.internal.getNumberOfPages();
            doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        };

        data.forEach((dispatch, index) => {
            if (index > 0) { doc.addPage(); }
            let yPos = 55;
            addPdfHeader();


            doc.setFontSize(10);
            doc.text(`Kaynak Şantiyenin Depo: ${dispatch.store?.name || '-'}`, 15, yPos); yPos += 7;
            doc.text(`Hedef Merkez Depo: ${dispatch.destinationWarehouse?.name || '-'}`, 15, yPos); yPos += 7;
            doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos); yPos += 7;
            doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || '-'})`, 15, yPos); yPos += 7;
            doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos); yPos += 7;

            doc.text(`Genel Açıklama: ${dispatch.description || '-'}`, 15, yPos); yPos += 15;

            const detailsRows = (dispatch.storeDispatchDetails || []).map(d => [
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);

            autoTable(docAny, {
                startY: yPos,
                head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
                body: detailsRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: (hookData) => {
                    if (hookData.cursor && hookData.settings.startY === hookData.cursor.y) {
                        addPdfHeader();
                    }
                    addPdfFooter();
                }
            });

            const finalY = docAny.lastAutoTable.finalY || yPos;
            doc.setFontSize(10);
            const totalQuantity = (dispatch.storeDispatchDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
            doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);
        });

        doc.save(`${title.replace(/ /g, '_')}.pdf`);
        showAlert('PDF başarıyla oluşturuldu.', 'success');
    };

    const exportDispatchesToExcel = (data: StoreDispatchReturnToCenterType[], title: string) => {
        if (!data || data.length === 0) { showAlert('Excel oluşturulacak sevk belgesi bulunamadı.', 'warning'); return; }

        showAlert('Excel oluşturuluyor...', 'info');
        const workbook = new Excel.Workbook();

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

        data.forEach(dispatch => {
            const worksheetTitle = `İade_Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_');
            const worksheet = workbook.addWorksheet(worksheetTitle);

            const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const totalColumns = detailsColumns.length;

            addExcelHeader(worksheet, title, totalColumns);

            worksheet.addRow([`Sevk Belgesi Kodu:`, dispatch.code]);
            worksheet.addRow([`Kaynak Şantiyenin Depo:`, dispatch.store?.name || '-']);
            worksheet.addRow([`Hedef Merkez Depo:`, dispatch.destinationWarehouse?.name || '-']);
            worksheet.addRow([`Şoför:`, `${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`]);
            worksheet.addRow([`Araç:`, `${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`]);
            worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);

            worksheet.addRow(['Genel Açıklama', dispatch.description || '-']);
            worksheet.addRow([]);

            const headerRow = worksheet.addRow(detailsColumns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            (dispatch.storeDispatchDetails || []).forEach(d => {
                worksheet.addRow([
                    d.item?.name || '-',
                    Number(d.quantity),
                    d.item?.unit?.title || '-',
                    d.description || '-'
                ]);
            });

            const totalQuantity = (dispatch.storeDispatchDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
            const totalRow = worksheet.addRow([`Toplam Miktar`, totalQuantity, '', '']);
            totalRow.font = { name: 'NotoSans', bold: true };
            totalRow.getCell(2).numFmt = '0';

            worksheet.addRow([]);
            addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);
        });

        const fileName = `${title.replace(/ /g, '_')}.xlsx`;
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        });
    };

    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedDispatches : dispatchList;
        const title = isFiltered ? 'Filtrelenmiş Merkez İade Sevk Raporu' : 'Tüm Merkez İade Sevk Raporu';
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : new Date().toISOString())}` : undefined;

        if (format === 'pdf') {
            exportDispatchesToPdf(dataToDownload, title, subtitle);
        } else {
            exportDispatchesToExcel(dataToDownload, title);
        }
    };

    const handleOpenRowDownloadModal = (dispatch: StoreDispatchReturnToCenterType) => {
        setSelectedDispatchForDownload(dispatch);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    const handleDownloadSingleDispatch = (format: 'pdf' | 'excel') => {
        if (!selectedDispatchForDownload) return;
        const data = [selectedDispatchForDownload];
        const title = `İade Sevk Belgesi Detayları: ${selectedDispatchForDownload.code}`;

        if (format === 'pdf') {
            exportDispatchesToPdf(data, title);
        } else {
            exportDispatchesToExcel(data, title);
        }
        setOpenRowDownloadModal(false);
    };

    const paginatedDispatches = useMemo(() => {
        return displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedDispatches, page, rowsPerPage]);


    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('ids');
        setSearchParams(next, { replace: true });

        navigate(location.pathname, {
            replace: true,
            state: { ...(location.state as any), notifIds: [] },
        });

        setPage(0);
    };


    const handleOpenDescriptionModalT = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModalT(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModalT(false);
        setFullDescriptionContent('');
    };


    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    mb={3}
                    spacing={2}
                    flexWrap="wrap"
                >
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                        Merkez Depoya İmha Edilecek Ürünlerin Sevk İşlemleri
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Merkez Depoya İmha Edilecek Ürünlerin Sevk İşlemleri kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => { resetFormAndState(); setIsFormVisible(true); setEditingId(null); }}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni İade Sevk
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    disabled={loadingButton}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}

                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => navigate(-1)}
                                endIcon={<IconArrowRight size={20} />}
                                fullWidth={false}
                            >
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Stack>
                </Stack>
                {((isFormVisible && !editingId && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'İade Sevk Belgesini Düzenle' : 'Yeni İade Sevk Belgesi'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Şoför</CustomFormLabel>
                                <Autocomplete
                                    id="driver-select"
                                    options={drivers}
                                    getOptionLabel={(option) => `${option.name} ${option.family}`}
                                    value={drivers.find(d => Number(d.id) === selectedDriverId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedDriverId(newValue ? Number(newValue.id) : null);
                                        if (newValue) {
                                            fetchVehicles(newValue.id);
                                        } else {
                                            setSelectedVehicleId(null);
                                            setSelectedVehicleName(null);
                                            setVehiclesList([]);
                                        }
                                        if (driverIdError && newValue) setDriverIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Şoför Seçin"
                                            error={driverIdError}
                                            helperText={driverIdError ? "Şoför seçimi zorunludur!" : ""}
                                        />
                                    )}
                                />
                                {selectedVehicleName && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                                        <Chip label={`Seçilen Araç: ${selectedVehicleName}`} color="info" />
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Aracı değiştir" : ""}>
                                            <IconButton onClick={() => setOpenVehicleModal(true)} size="small">
                                                <IconEdit size={18} />
                                            </IconButton>
                                        </CustomTooltip>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Hedef Merkez Depo</CustomFormLabel>
                                <Autocomplete
                                    id="destination-store-select"
                                    options={warehouses.map(w => ({ ...w, id: Number(w.id) }))}
                                    getOptionLabel={(option) => option.name}
                                    value={
                                        warehouses.map(w => ({ ...w, id: Number(w.id) }))
                                            .find(s => s.id === selectedDestinationWarehouseId)
                                        || null
                                    }
                                    onChange={(_, newValue) => {
                                        setSelectedDestinationWarehouseId(newValue ? Number(newValue.id) : null);
                                        if (!editingId) setDispatchDetails([]);
                                        if (destinationWarehouseIdError && newValue) setDestinationWarehouseIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Hedef Merkez Depo Seçin"
                                            error={destinationWarehouseIdError}
                                            helperText={destinationWarehouseIdError ? "Hedef Merkez Depo seçimi zorunludur!" : ""}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        label=""
                                        value={docDate}
                                        onChange={(newValue) => {
                                            setDocDate(newValue);
                                            if (docDateError && newValue) setDocDateError(false);
                                        }}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                fullWidth
                                                size="small"
                                                error={docDateError}
                                                helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>


                            <Grid item xs={12}>
                                <CustomFormLabel htmlFor="invoice-general-description">Açıklama (Genel Merkez Depoya İmha Edilecek)</CustomFormLabel>
                                <TextField
                                    id="invoice-general-description"
                                    label="Merkez Depoya İmha Edilecek için genel açıklama giriniz"
                                    type="text"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    variant="outlined"
                                    value={generalDescription} // ⬅️ استفاده از نام جدید
                                    onChange={(e) => setGeneralDescription(e.target.value)} // ⬅️ استفاده از نام جدید
                                />
                            </Grid>
                        </Grid>
                        {/* === Silinen Ürünler (Restore Logic) === */}
                        {removedDispatchDetails.length > 0 && (
                            <Box sx={{
                                border: '1px dashed',
                                borderColor: "error.main",
                                p: 2,
                                mb: 2,
                                mt: 2,
                                borderRadius: 1,
                                backgroundColor: 'rgba(255, 0, 0, 0.05)'
                            }}>
                                <Typography variant="subtitle1" color="error" mb={1}>
                                    Silinen Ürünler (Geri Almak İçin Tıklayın <IconReload size={18} style={{ verticalAlign: 'middle' }} />)
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {removedDispatchDetails.map((detail, index) => (
                                        <CustomTooltip
                                            key={index}
                                            title={isTooltipGloballyEnabled ? "Ürünü tekrar sevk detaylarına ekle" : ""}
                                        >
                                            <Chip
                                                label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
                                                color="error"
                                                onClick={() => handleRestoreDispatchDetail(index)}
                                                icon={<IconReload size={18} />}
                                                onDelete={() => setRemovedDispatchDetails(prev => prev.filter((_, i) => i !== index))}
                                                deleteIcon={<IconX size={18} />}
                                                sx={{ cursor: 'pointer' }}
                                            />
                                        </CustomTooltip>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        {/* === پایان Silinen Ürünler === */}
                        <Box mt={4}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Sevk Detayları</Typography>
                                {!editingId && (
                                    <CustomTooltip title="İade edilecek ürünleri merkez deposundan önceden tanımlanmış listeye göre yükleyin.">
                                        <Button
                                            variant="outlined"
                                            onClick={fetchDispatchItemsByDestination}
                                            startIcon={<IconPlus />}
                                            disabled={loadingButton || !selectedDestinationWarehouseId}
                                        >
                                            Detayları Yükle
                                        </Button>
                                    </CustomTooltip>
                                )}
                            </Stack>
                            <Grid container spacing={2}>
                                {dispatchDetails.map((detail, index) => {
                                    const selectedItem = storeItems.find(item => Number(item.itemId) === Number(detail.itemId));
                                    const currentStockBalance = selectedItem ? Number(selectedItem.balance) : 0;
                                    const originalQuantity = editingId && initialDispatchDetails.find(d => d.itemId === detail.itemId) ? Number(initialDispatchDetails.find(d => d.itemId === detail.itemId)?.quantity) : 0;
                                    const maxAllowedQuantity = currentStockBalance + (editingId ? originalQuantity : 0);
                                    const displayBalance = `(Stok: ${currentStockBalance}${editingId ? ` | Maks: ${maxAllowedQuantity}` : ''})`;

                                    const isQuantityInvalid = Number(detail.quantity) < 0 || Number(detail.quantity) > maxAllowedQuantity;

                                    return (
                                        <Grid item xs={12} key={index}>
                                            <Stack
                                                direction={{ xs: 'column', sm: 'row' }}
                                                spacing={1}
                                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                sx={{ borderBottom: '1px solid #eee', pb: 1 }}
                                            >
                                                <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: '200px' } }}>
                                                    <Typography variant="body1" component="span" sx={{ fontWeight: 'bold' }}>
                                                        {selectedItem?.name || 'Ürün Adı Bulunamadı'}
                                                    </Typography>
                                                </Box>

                                                <Stack
                                                    direction={{ xs: 'column', md: 'row' }}
                                                    spacing={1}
                                                    alignItems="stretch"
                                                    sx={{ flexGrow: 2, width: { xs: '100%', sm: 'auto' } }}
                                                >
                                                    <Box sx={{ width: { xs: '100%', md: '300px' } }}>
                                                        <CustomTextField
                                                            type="number"
                                                            placeholder="Miktar"
                                                            value={detail.quantity}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                            fullWidth
                                                            InputProps={{
                                                                endAdornment: <InputAdornment position="end">{displayBalance}</InputAdornment>
                                                            }}
                                                            error={dispatchDetailsError && isQuantityInvalid}
                                                            helperText={dispatchDetailsError && isQuantityInvalid ? `Geçerli bir miktar girin! (0 - ${maxAllowedQuantity})` : ""}
                                                        />
                                                    </Box>

                                                    <Box sx={{ width: { xs: '100%', md: '300px' } }}>
                                                        <CustomTextField
                                                            placeholder="Açıklama"
                                                            value={detail.description}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                            fullWidth
                                                        />
                                                    </Box>
                                                </Stack>

                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleRemoveDispatchDetail(index)}
                                                    sx={{ flexShrink: 0, alignSelf: { xs: 'flex-end', sm: 'center' } }} // در موبایل به راست می‌چسبد
                                                >
                                                    <IconTrash />
                                                </IconButton>
                                            </Stack>
                                        </Grid>
                                    )
                                })}
                            </Grid>
                            {dispatchDetailsError && <Typography color="error" variant="caption" sx={{ mt: 1.5, ml: 1.5 }}>En az bir sevk detayı eklemek zorunludur!</Typography>}
                        </Box>
                        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                            {editingId ? (
                                <>
                                    <Button variant="contained" color="info" onClick={editDispatch} disabled={loadingButton || !isFormValid}>
                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
                                </>
                            ) : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak sevk belgesini kaydedین." : ""}>
                                        <span>
                                            <BlinkingButton
                                                variant="contained"
                                                color="success"
                                                onClick={insertDispatch}
                                                disabled={!isFormValid || loadingButton}
                                                isBlinking={isFormValid && !loadingButton}
                                            >
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Sevk Belgesi Ekle'}
                                            </BlinkingButton>
                                        </span>
                                    </CustomTooltip>
                                )
                            )}
                        </Stack>
                    </Paper>
                )}

                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                    </Stack>
                )}
                <BlankCard>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2} mb={2} mr={2}>
                        {hasDownloadPermission && isFilterActive && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle sevkleri indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)}
                                    startIcon={<IconFileDownload />}
                                    isBlinking={false}
                                    disabled={loadingData || displayedDispatches.length === 0}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setOpenDownloadAllModal(true)}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || dispatchList.length === 0}
                            >
                                Tümünü İndir
                            </Button>
                        )}
                    </Stack>
                    <Box sx={{ p: 2 }}>

                        <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                            <Typography variant="h5">
                                Merkez Depoya İmha Sevk Listesi

                            </Typography>
                            {notifIds.length > 0 && (
                                <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                                    <Chip
                                        label={`Bildirim filtresi: ${notifIds.length} id`}
                                        color="error"
                                        size="small"
                                    />
                                    <IconButton
                                        aria-label="Bildirim filtresini temizle"
                                        size="small"
                                        onClick={clearNotifFilter}
                                        sx={{ p: 0.5 }}
                                        title="Filtreyi temizle"
                                    >
                                        <IconRefresh size={18} />
                                    </IconButton>
                                </Stack>
                            )}

                        </Stack>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="Sevk Belgesi Ara"
                                    variant="outlined"
                                    fullWidth
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
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
                                        <IconButton onClick={() => { setStartDate(null); setEndDate(null); }} aria-label="clear date filters">
                                            <IconX size={20} />
                                        </IconButton>
                                    </Stack>
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <ToggleButtonGroup
                                    value={statusFilter}
                                    exclusive
                                    onChange={(_, newFilter) => newFilter && setStatusFilter(newFilter)}
                                    fullWidth
                                >
                                    <StyledToggleButton value="all">Tümü</StyledToggleButton>
                                    <StyledToggleButton value="active">Aktif</StyledToggleButton>
                                    <StyledToggleButton value="inactive">Pasif</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid>
                        </Grid>
                    </Box>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Merkez iade sevk belgeleri yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table aria-label="store dispatch to center table">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Kaynak Depo</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Hedef Merkez</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Şoför</Typography></StyledTableCell>
                                        {/* <StyledTableCell><Typography variant="h6">Araç</Typography></StyledTableCell> */}
                                        <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Sevk Detayları</Typography></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedDispatches.length > 0 ? (
                                        paginatedDispatches.map(row => {
                                            const statusInfo = getStatusTextAndColor(row.status);
                                            return (
                                                <TableRow key={row.id}>
                                                    <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{row.store?.name || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{row.destinationWarehouse?.name || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{`${row.driver?.name || ''} ${row.driver?.family || ''} - ${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></StyledTableCell>
                                                    {/* <StyledTableCell><Typography variant="body1">{``}</Typography></StyledTableCell> */}
                                                    <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                                    <StyledTableCell sx={{ maxWidth: 150 }}>
                                                        <Typography variant="body2" noWrap title={row.description || ''}>
                                                            {row.description || '-'}
                                                        </Typography>
                                                        {row.description.length > 50 && (
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                                <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                                    handleOpenDescriptionModalT(row.description);
                                                                }}>
                                                                    Devamını Oku
                                                                </Button>
                                                            </CustomTooltip>
                                                        )}
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Chip
                                                                label={statusInfo.text}
                                                                color={statusInfo.color}
                                                            />
                                                            {/* آیکون Info برای نمایش توضیحات وضعیت در Modal */}
                                                            {row.statusDescription && (
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenDescriptionModal(row.statusDescription!)}
                                                                >
                                                                    <IconInfoCircle
                                                                        size={20}
                                                                        color="#1e88e5"
                                                                    />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                                <Button
                                                                    variant="outlined"
                                                                    startIcon={<IconEye />}
                                                                    onClick={() => handleOpenDetailsModal(row.storeDispatchDetails || [])}
                                                                >
                                                                    Görünüm
                                                                </Button>
                                                            </CustomTooltip>
                                                        </Stack>
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <IconButton
                                                            onClick={(e) => {
                                                                setSelectedRowForMenu(row);
                                                                setAnchorEl(e.currentTarget);
                                                            }}
                                                        >
                                                            <IconDots width={18} />
                                                        </IconButton>
                                                        <Menu
                                                            anchorEl={anchorEl}
                                                            open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
                                                            onClose={handleCloseMenu}
                                                        >
                                                            {hasDownloadPermission && (
                                                                <MuiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
                                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                                    Bu satırı indir
                                                                </MuiMenuItem>
                                                            )}
                                                            {hasEditPermission && (
                                                                <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>
                                                            )}
                                                            {hasDeletePermission && row.recordStatus === 0 && (
                                                                <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
                                                            )}
                                                        </Menu>
                                                    </StyledTableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={9} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">
                                                    Hiç iade sevk belgesi bulunamadı.
                                                </Typography>
                                            </StyledTableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={displayedDispatches.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage="Satır başına:"
                    />
                </BlankCard>
            </Box>

            {/* Vehicle Selection Modal (Unchanged) */}
            <Dialog open={openVehicleModal} onClose={() => setOpenVehicleModal(false)}>
                <DialogTitle>Araç Seçین</DialogTitle>
                <DialogContent>
                    <FormControl component="fieldset">
                        <RadioGroup
                            aria-label="vehicle"
                            name="vehicle-radio-group"
                            value={tempSelectedVehicle}
                            onChange={(event) => setTempSelectedVehicle(Number(event.target.value))}
                        >
                            {vehiclesList.map((vehicle) => (
                                <FormControlLabel
                                    key={vehicle.id}
                                    value={Number(vehicle.id)}
                                    control={<Radio />}
                                    label={`${vehicle.name} (${vehicle.plaque})`}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        const selected = vehiclesList.find(v => Number(v.id) === tempSelectedVehicle);
                        if (selected) {
                            setSelectedVehicleId(Number(selected.id));
                            setSelectedVehicleName(`${selected.name} (${selected.plaque})`);
                        }
                        setOpenVehicleModal(false);
                    }} color="primary" variant="contained">
                        Seç
                    </Button>
                    <Button onClick={() => setOpenVehicleModal(false)} color="secondary">
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Status Description Modal */}
            <Dialog open={openDescriptionModal} onClose={() => setOpenDescriptionModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Durum Açıklaması</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body1">
                        {currentStatusDescription || 'Açıklama bulunmamaktadır.'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDescriptionModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>


            {/* Details Modal (Modified to show Total Quantity) */}
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sevk Detayları</DialogTitle>
                <DialogContent>
                    {detailsToShow.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table aria-label="Ürün detayları tablosu">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailsToShow.map((detail, index) => (
                                        <TableRow key={detail.id || index}>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.quantity || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Bu sevk belgesi için detay bulunamadı.
                        </Typography>
                    )}
                    {/* نمایش جمع کل مقادیر */}
                    {detailsToShow.length > 0 && (
                        <Box sx={{ mt: 2, p: 1, borderTop: '1px solid #eee' }}>
                            <Typography variant="h6" align="right">
                                Toplam Miktar: {totalQuantityInDetailsModal.toFixed(2)}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* Download Modals (Unchanged) */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Sevk Belgelerini İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', false); setOpenDownloadAllModal(false); }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', false); setOpenDownloadAllModal(false); }}
                        >
                            Excel Olarak İندir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Sevk Belgelerini İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', true); setOpenDownloadFilteredModal(false); }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', true); setOpenDownloadFilteredModal(false); }}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadSingleDispatch('pdf')}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadSingleDispatch('excel')}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDescriptionModalT}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <DeleteStoreDispatchReturnToCenter
                openModal={openDeleteModal}
                onClose={() => {
                    setOpenDeleteModal(false);
                    setDispatchIdToAct(null);
                    setDispatchCodeToAct('');
                }}
                dispatchIdToDelete={dispatchIdToAct}
                dispatchCodeToDelete={dispatchCodeToAct}
                onDeleteSuccess={fetchDispatches}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListStoreDispatchReturnToCenter;