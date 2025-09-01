// src/views/warehouses/ListWarehouseDispatch.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
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
    DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconArrowRight, IconEye } from '@tabler/icons-react';
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
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import DeleteDispatch from "./DeleteDispatch";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// === Type Definitions ===
interface DispatchDetailType {
    id: string;
    itemId: number;
    quantity: number;
    description: string;
    item?: {
        id: string;
        name: string;
        abbreviation: string;
        unit: {
            title: string;
        };
    };
}

interface DispatchType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    status: string;
    warehouse?: {
        id: string;
        name: string;
    };
    driver?: {
        id: string;
        name: string;
        family: string;
    };
    workhouse?: {
        id: string;
        name: string;
    };
    warehouseDispatchDetails: DispatchDetailType[];
}

interface NewDispatchData {
    docDate: string;
    warehouseId: number;
    driverId: number;
    workhouseId: number;
    driverVehicleId: number;
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

interface DriverType {
    id: number;
    name: string;
    family: string;
    recordStatus?: number;
}
interface WorkhouseType {
    id: number;
    name: string;
    recordStatus?: number;
}

interface ItemType {
    id: number;
    name: string;
    abbreviation: string;
    unit?: {
        title: string;
    };
    recordStatus?: number;
}

// === NEW TYPE FOR ITEM WITH BALANCE ===
interface ItemWithBalanceType {
    itemId: string;
    name: string;
    code: string | null;
    balance: string;
    unit?: {
        title: string;
    };
}

// === NEW TYPE FOR FORM DETAILS ===
interface FormDispatchDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
}

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

interface VehicleType {
    id: number;
    name: string;
    model: string;
    plaque: string;
    recordStatus: number;
    createAt: string;
}

interface ApiResponseVehicleType {
    id: string;
    name: string;
    model: number;
    plaque: string;
    recordStatus: number;
    createAt: string;
}

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

// === Styled Components ===
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

// === Main Component ===
const ListWarehouseDispatch = () => {
    const { warehouseId } = useParams<{ warehouseId: string }>();
    const navigate = useNavigate();

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null); // اضافه کردن این خط

    // Using the new FormDispatchDetail type
    const [dispatchDetails, setDispatchDetails] = useState<FormDispatchDetail[]>([]);

    const [dispatchList, setDispatchList] = useState<DispatchType[]>([]);
    const [displayedDispatches, setDisplayedDispatches] = useState<DispatchType[]>([]);
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
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<DispatchType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [driverIdError, setDriverIdError] = useState<boolean>(false);
    const [workhouseIdError, setWorkhouseIdError] = useState<boolean>(false);
    const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [workhouses, setWorkhouses] = useState<WorkhouseType[]>([]);
    // const [items, setItems] = useState<ItemType[]>([]);

    // === NEW STATE FOR ITEM BALANCES ===
    const [itemsWithBalance, setItemsWithBalance] = useState<ItemWithBalanceType[]>([]);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [dispatchIdToDelete, setDispatchIdToDelete] = useState<string | null>(null);
    const [dispatchCodeToDelete, setDispatchCodeToDelete] = useState<string>('');

    const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);
    const [openVehicleModal, setOpenVehicleModal] = useState(false);
    const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [detailsToShow, setDetailsToShow] = useState<DispatchDetailType[]>([]);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

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
        const authToken = localStorage.getItem('authToken');

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
                const formattedData: VehicleType[] = response.data.data.map((item: ApiResponseVehicleType) => ({
                    ...item,
                    model: String(item.model),
                    id: Number(item.id)
                }));
                const activeVehicles = formattedData.filter(item => item.recordStatus === 0);
                setVehiclesList(activeVehicles);

                if (activeVehicles.length > 1) {
                    setOpenVehicleModal(true);
                    setTempSelectedVehicle(activeVehicles[0].id);
                } else if (activeVehicles.length === 1) {
                    setSelectedVehicleId(activeVehicles[0].id); // تغییر از setSelectedVehicle به setSelectedVehicleId
                    setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
                } else {
                    setSelectedVehicleId(null); // تغییر از setSelectedVehicle به setSelectedVehicleId
                    setSelectedVehicleName(null);
                }
            } else {
                setVehiclesList([]);
                setSelectedVehicle(null);
                setSelectedVehicleName(null);
                showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            console.error("Failed to fetch vehicles:", e);
            setVehiclesList([]);
            setSelectedVehicle(null);
            setSelectedVehicleName(null);
            showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [showAlert]);

    // === API Calls ===
    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        try {
            // === MODIFIED: ADDED API CALL FOR ITEM BALANCES ===
            const [driversRes, workhousesRes, _itemsRes, dispatchesRes, itemsBalanceRes] = await Promise.all([
                axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<WorkhouseType[]>>(server.baseurl + server.initialoperations + "get-workhouse", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<ItemType[]>>(server.baseurl + server.baseinfo + "get-item", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<DispatchType[]>>(server.baseurl + server.warehouse + `get-warehouse-dispatches/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<ItemWithBalanceType[]>>(server.baseurl + server.warehouse + `get-warehouse-all-items-balance/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);

            setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
            setWorkhouses(workhousesRes.data?.data?.filter(w => w.recordStatus === 0).map(w => ({ ...w, id: Number(w.id) })) || []);
            // setItems(itemsRes.data?.data?.filter(i => i.recordStatus === 0).map(i => ({ ...i, id: Number(i.id) })) || []);

            // === NEW: SET ITEM BALANCES ===
            if (itemsBalanceRes.data?.httpStatusCode === 200) {
                setItemsWithBalance(itemsBalanceRes.data.data);
            } else {
                showAlert('Stok bilgileri yüklenirken bir hata oluştu.', 'error');
            }

            if (dispatchesRes.data?.httpStatusCode === 200) {
                const allDispatches = dispatchesRes.data.data;
                const formattedDispatches = allDispatches.map(d => ({
                    ...d,
                    status: d.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setDispatchList(formattedDispatches);
            } else {
                showAlert(dispatchesRes.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, warehouseId, showAlert]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const filteredBySearchAndStatus = dispatchList.filter(d => {
            const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.warehouse?.name && d.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && d.recordStatus === 0) ||
                (statusFilter === 'inactive' && d.recordStatus === 1);

            return matchesSearch && matchesStatus;
        });
        setDisplayedDispatches(filteredBySearchAndStatus);
        setPage(0);
    }, [dispatchList, searchTerm, statusFilter]);
    useEffect(() => {
        const isValid = !!selectedDriverId && !!selectedWorkhouseId &&
            !!docDate && dispatchDetails.length > 0 &&
            // تبدیل d.quantity به عدد قبل از مقایسه
            dispatchDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(isValid);
    }, [selectedDriverId, selectedWorkhouseId, docDate, dispatchDetails]);

    useEffect(() => {
        let blinkInterval: NodeJS.Timeout | null = null;
        if (isFormValid && !loadingButton) {
            blinkInterval = setInterval(() => {
                // setIsButtonBlinking(prev => !prev);
            }, 500);
        } else {
            // setIsButtonBlinking(false);
            if (blinkInterval) {
                clearInterval(blinkInterval);
            }
        }
        return () => {
            if (blinkInterval) {
                clearInterval(blinkInterval);
            }
        };
    }, [isFormValid, loadingButton]);

    const validateForm = (): boolean => {
        let isValid = true;
        if (!selectedDriverId) { setDriverIdError(true); isValid = false; } else { setDriverIdError(false); }
        if (!selectedWorkhouseId) { setWorkhouseIdError(true); isValid = false; } else { setWorkhouseIdError(false); }
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }
        if (dispatchDetails.length === 0 || dispatchDetails.some(d => !d.itemId || !d.quantity)) {
            setDispatchDetailsError(true); isValid = false;
        } else {
            setDispatchDetailsError(false);
        }
        if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return isValid;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setSelectedDriverId(null);
        setSelectedVehicleId(null)
        setSelectedWorkhouseId(null);
        setDispatchDetails([]);
        setEditingId(null);
        setDocDateError(false);
        setDriverIdError(false);
        setWorkhouseIdError(false);
        setDispatchDetailsError(false);
    };

    // === API Actions ===
    const insertDispatch = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const payload: NewDispatchData = {
                docDate: docDate?.toISOString() || new Date().toISOString(),
                warehouseId: Number(warehouseId),
                driverId: Number(selectedDriverId),
                driverVehicleId: Number(selectedVehicleId), // اضافه کردن این خط
                workhouseId: Number(selectedWorkhouseId),
                dispatchDetails: dispatchDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description }))
            };
            const response = await axios.post(server.baseurl + server.warehouse + "create-warehouse-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni sevk belgesi başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Sevk belgesi eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Sevk belgesi eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editDispatch = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        const payload: EditDispatchData = {
            id: Number(editingId),
            code: editingCode!,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            warehouseId: Number(warehouseId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            workhouseId: Number(selectedWorkhouseId),
            dispatchDetails: dispatchDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description
            }))
        };
        try {
            const response = await axios.put(server.baseurl + server.warehouse + "update-warehouse-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 200) {
                showAlert('Sevk belgesi başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    // === UI Handlers ===
    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setEditingId(selectedRowForMenu.id);
            setDocDate(new Date(selectedRowForMenu.docDate));
            setEditingCode(selectedRowForMenu.code);
            setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
            setSelectedWorkhouseId(Number(selectedRowForMenu.workhouse?.id));

            const formattedDetails: FormDispatchDetail[] = (selectedRowForMenu.warehouseDispatchDetails || []).map(d => ({
                itemId: Number(d.item?.id),
                quantity: d.quantity,
                description: d.description,
            }));
            setDispatchDetails(formattedDetails);
            handleCloseMenu();
        }
    };
    const handleCancelEdit = () => {
        resetFormAndState();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setDispatchIdToDelete(selectedRowForMenu.id);
            setDispatchCodeToDelete(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleAddDispatchDetail = () => {
        if (dispatchDetails.length > 0) {
            const lastDetail = dispatchDetails[dispatchDetails.length - 1];
            if (!lastDetail.itemId || !lastDetail.quantity) {
                showAlert('Lütfen mevcut detayları önce doldurun.', 'warning');
                return;
            }
        }
        setDispatchDetails(prev => [...prev, { itemId: null, quantity: '', description: '' }]);
    };
    const handleRemoveDispatchDetail = (index: number) => {
        setDispatchDetails(prev => prev.filter((_, i) => i !== index));
    };

    // === MODIFIED: QUANTITY VALIDATION ADDED ===
    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormDispatchDetail, value: any) => {
        setDispatchDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };

            if (field === 'quantity') {
                const numValue = Number(value);
                const selectedItem = itemsWithBalance.find(item => Number(item.itemId) === Number(updatedDetail.itemId));
                const maxBalance = selectedItem ? Math.max(0, Number(selectedItem.balance)) : Infinity;

                if (numValue < 0) {
                    showAlert('Miktar negatif olamaz!', 'warning');
                    updatedDetail.quantity = 0; // Set to 0 to prevent negative input
                } else if (numValue > maxBalance) {
                    showAlert(`Girdiğiniz miktar stoktan fazla! Maksimum: ${maxBalance}`, 'warning');
                    updatedDetail.quantity = maxBalance; // Set to max balance to prevent over-allocation
                } else {
                    updatedDetail.quantity = value;
                }
            } else {
                (updatedDetail as any)[field] = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [itemsWithBalance, showAlert]);


    const handleEditVehicleSelection = () => {
        if (vehiclesList.length > 1) {
            setOpenVehicleModal(true);
            setTempSelectedVehicle(selectedVehicle);
        } else {
            showAlert('Bu şoförün tek bir aracı bulunmaktadır.', 'info');
        }
    };

    const handleDownloadAllDispatchesPDF = () => {
        if (!dispatchList || dispatchList.length === 0) {
            showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 50; // Başlangıç pozisyonu

        (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Sevk Belgeleri Raporu', pageWidth - 15, 30, { align: 'right' });
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

        dispatchList.forEach((dispatch) => {
            if (yPos + 50 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                yPos = 50;
            }

            doc.setFontSize(14);
            doc.text(`Sevk Belgesi Kodu: ${dispatch.code}`, 15, yPos);
            yPos += 7;
            doc.text(`Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
            yPos += 7;
            doc.text(`Şantiye: ${dispatch.workhouse?.name || '-'}`, 15, yPos);
            yPos += 7;
            doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos);
            yPos += 7;
            doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos);
            yPos += 15;

            const detailsRows = (dispatch.warehouseDispatchDetails || []).map(d => [
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
                body: detailsRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },

                pageBreak: 'auto',
                didDrawCell: (data: any) => {
                    if (data.cell.section === 'body') {
                        yPos = (data.cell.y + data.cell.height);
                    }
                },

                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });
            yPos += 15;
        });

        doc.save('Sevk_Belgeleri_Detayli_Rapor.pdf');
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    };

    const selectedItemIds = useMemo(() => dispatchDetails.map(d => d.itemId).filter(id => id !== null), [dispatchDetails]);

    // === UI ===
    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                    <Typography variant="h5">Sevk İşlemleri</Typography>
                    <Grid spacing={2}>
                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleDownloadAllDispatchesPDF}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || dispatchList.length === 0}
                            >
                                Tüm Sevkleri İndir (PDF)
                            </Button>
                        )}
                        <CustomTooltip style={{ marginLeft: "2px" }} title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                                endIcon={<IconArrowRight size={20} />}>
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Grid>
                </Stack>
                {/* Form Kayıt/Düzenleme */}
                {(hasCreatePermission || hasEditPermission) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Sevk Belgesini Düzenle' : 'Yeni Sevk Belgesi'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Şoför</CustomFormLabel>
                                <Autocomplete
                                    id="driver-select"
                                    options={drivers}
                                    getOptionLabel={(option) => `${option.name} ${option.family}`}
                                    value={drivers.find(d => d.id === selectedDriverId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedDriverId(newValue ? newValue.id : null);
                                        if (newValue) {
                                            fetchVehicles(String(newValue.id));
                                        } else {
                                            setSelectedVehicle(null);
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
                                        <Chip
                                            label={`Seçilen Araç: ${selectedVehicleName}`}
                                            color="info"
                                        />
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Aracı değiştir" : ""}>
                                            <IconButton onClick={handleEditVehicleSelection} size="small">
                                                <IconEdit size={18} />
                                            </IconButton>
                                        </CustomTooltip>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Şantiye</CustomFormLabel>
                                <Autocomplete
                                    id="workhouse-select"
                                    options={workhouses}
                                    getOptionLabel={(option) => option.name}
                                    value={workhouses.find(w => w.id === selectedWorkhouseId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedWorkhouseId(newValue ? newValue.id : null);
                                        if (workhouseIdError && newValue) setWorkhouseIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Şantiye Seçin"
                                            error={workhouseIdError}
                                            helperText={workhouseIdError ? "Şantiye seçimi zorunludur!" : ""}
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
                        </Grid>
                        {/* Sevk Detayları */}
                        <Box mt={4}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Sevk Detayları</Typography>
                                <Button variant="outlined" startIcon={<IconPlus />} onClick={handleAddDispatchDetail}>Detay Ekle</Button>
                            </Stack>
                            <Grid container spacing={2}>
                                {dispatchDetails.map((detail, index) => {
                                    // === MODIFIED: USE itemsWithBalance HERE ===
                                    const availableItems = itemsWithBalance.filter(item =>
                                        !selectedItemIds.includes(Number(item.itemId)) || Number(item.itemId) === Number(detail.itemId)
                                    );
                                    const currentSelectedItem = itemsWithBalance.find(item => Number(item.itemId) === Number(detail.itemId));
                                    const balance = currentSelectedItem ? Math.max(0, Number(currentSelectedItem.balance)) : 0;
                                    const displayBalance = currentSelectedItem ? `(Bakiye: ${balance})` : '';

                                    return (
                                        <Grid item xs={12} key={index}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Autocomplete
                                                    fullWidth
                                                    size="small"
                                                    options={availableItems}
                                                    getOptionLabel={(option) => `${option.name} ${option.itemId ? displayBalance : ''}`}
                                                    value={currentSelectedItem || null}
                                                    onChange={(_, newValue) => {
                                                        const newQuantity = newValue ? Math.max(0, Number(itemsWithBalance.find(i => i.itemId === newValue.itemId)?.balance || 0)) : '';
                                                        handleDispatchDetailChange(index, 'itemId', newValue ? Number(newValue.itemId) : null);
                                                        handleDispatchDetailChange(index, 'quantity', newQuantity);
                                                    }}
                                                    isOptionEqualToValue={(option, value) => option.itemId === value.itemId}
                                                    renderInput={(params) => <TextField {...params} label="Malzeme Seçin" />}
                                                />
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {currentSelectedItem?.unit?.title && (
                                                        <Chip label={currentSelectedItem.unit.title} color="secondary" variant="outlined" />
                                                    )}
                                                </Box>
                                                <CustomTextField
                                                    type="number"
                                                    placeholder="Miktar"
                                                    value={detail.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                    fullWidth
                                                />
                                                <CustomTextField placeholder="Açıklama" value={detail.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)} fullWidth />
                                                <IconButton color="error" onClick={() => handleRemoveDispatchDetail(index)}><IconTrash /></IconButton>
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
                                    <Button variant="contained" color="info" onClick={editDispatch} disabled={loadingButton}>
                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
                                </>
                            ) : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak sevk belgesini kaydedin." : ""}>
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
                {/* Tablo */}
                <BlankCard>
                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={8}>
                                <TextField
                                    label="Sevk Belgesi Ara"
                                    variant="outlined"
                                    fullWidth
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
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
                            <Typography variant="h6" sx={{ ml: 2 }}>Sevk Belgeleri yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <TableCell><Typography variant="h6">Kod</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Depo</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Şoför</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Şantiye</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Belge Tarihi</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Sevk Detayları</Typography></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedDispatches.length > 0 ? (
                                        displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{row.warehouse?.name || '-'}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{`${row.driver?.name || ''} ${row.driver?.family || ''}`}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{row.workhouse?.name || '-'}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
                                                <TableCell>
                                                    <Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} />
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                            <Button variant="outlined" startIcon={<IconEye />}
                                                                onClick={() => {
                                                                    setDetailsToShow(row.warehouseDispatchDetails || []);
                                                                    setOpenDetailsModal(true);
                                                                }}
                                                            >
                                                                Görünüm
                                                            </Button>
                                                        </CustomTooltip>
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton onClick={(e) => {
                                                        setSelectedRowForMenu(row);
                                                        setAnchorEl(e.currentTarget);
                                                    }}><IconDots width={18} /></IconButton>
                                                    <Menu anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                        {hasEditPermission && <MenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>}
                                                        {hasDeletePermission && <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>}
                                                    </Menu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={7} align="center"><Typography>Hiç sevk belgesi bulunamadı.</Typography></TableCell></TableRow>
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
            <Dialog open={openVehicleModal} onClose={() => setOpenVehicleModal(false)}>
                <DialogTitle>Araç Seçin</DialogTitle>
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
                                    value={vehicle.id}
                                    control={<Radio />}
                                    label={`${vehicle.name} (${vehicle.plaque})`}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        const selected = vehiclesList.find(v => v.id === tempSelectedVehicle);
                        if (selected) {
                            setSelectedVehicleId(selected.id); // تغییر از setSelectedVehicle به setSelectedVehicleId
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

            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Sevk Detayları</DialogTitle>
                <DialogContent>
                    {detailsToShow.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><Typography variant="h6">Malzeme</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Miktar</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Birim</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailsToShow.map((detail, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{detail.item?.name || '-'}</TableCell>
                                            <TableCell>{detail.quantity}</TableCell>
                                            <TableCell>{detail.item?.unit?.title}</TableCell>
                                            <TableCell>{detail.description || '-'}</TableCell>
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <DeleteDispatch
                openModal={openDeleteModal}
                onClose={handleCloseMenu}
                dispatchIdToDelete={dispatchIdToDelete}
                dispatchCodeToDelete={dispatchCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListWarehouseDispatch;