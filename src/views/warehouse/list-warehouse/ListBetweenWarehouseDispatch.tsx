// // src/views/warehouses/ListBetweenWarehouseDispatch.tsx
// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//     TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
//     Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
//     Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
//     CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
//     Chip, Autocomplete,
//     Dialog,
//     DialogTitle,
//     DialogContent,
//     FormControl,
//     RadioGroup,
//     FormControlLabel,
//     Radio,
//     DialogActions
// } from '@mui/material';
// import { keyframes, styled } from '@mui/material/styles';
// import {
//     IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
//     IconArrowRight, IconEye, IconX, IconReload
// } from '@tabler/icons-react';
// import BoltIcon from '@mui/icons-material/Bolt';
// import BlankCard from 'src/components/shared/BlankCard';
// import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
// import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
// import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
// import axios from 'axios';
// import server from 'src/assets/address.json';
// import { useAuth } from 'src/context/AuthContext';
// import { tr } from 'date-fns/locale';
// import { format } from 'date-fns';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import Logo from 'src/assets/images/logos/logo.png';
// import DeleteBetweenwarehouseDispatch from "./DeleteBetweenwarehouseDispatch";
// import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// // === Type Definitions ===
// interface DispatchDetailType {
//     id: string;
//     itemId: number;
//     quantity: number;
//     description: string;
//     item?: {
//         id: string;
//         name: string;
//         abbreviation: string;
//         unit: {
//             title: string;
//         };
//     };
// }

// interface WarehouseDispatchDetailsType {
//     id: string;
//     quantity: string;
//     description: string;
//     item: {
//         id: string;
//         name: string;
//         unit: {
//             title: string;
//         };
//     };
// }

// interface WarehouseDispatchByIdType {
//     id: string;
//     code: string;
//     docDate: string;
//     warehouseDispatchDetails: WarehouseDispatchDetailsType[];
// }


// interface BetweenWarehouseDispatchType {
//     id: string;
//     code: string;
//     docDate: string;
//     createAt: string;
//     recordStatus: number;
//     status: string;
//     statusDescription: string | null;
//     warehouse?: {
//         id: string;
//         name: string;
//     };
//     destinationWarehouse?: {
//         id: string;
//         name: string;
//     };
//     driver?: {
//         id: string;
//         name: string;
//         family: string;
//     };
//     driverVehicle?: {
//         id: string;
//         name: string;
//         plaque: string;
//     };
//     warehouseDispatchDetails: DispatchDetailType[];
//     statusText?: string;
//     statusColor?: 'success' | 'error' | 'warning' | 'info';
// }

// interface NewDispatchData {
//     docDate: string;
//     warehouseId: number;
//     driverId: number;
//     driverVehicleId: number;
//     destinationWarehouseId: number;
//     dispatchDetails: {
//         itemId: number;
//         quantity: number;
//         description: string;
//     }[];
// }

// interface EditDispatchData extends NewDispatchData {
//     id: number;
//     code: string;
// }

// interface DriverType {
//     id: number;
//     name: string;
//     family: string;
//     recordStatus?: number;
// }
// interface WarehouseType {
//     id: number;
//     name: string;
//     recordStatus?: number;
// }

// interface ItemType {
//     id: string;
//     name: string;
//     abbreviation: string;
//     unit?: {
//         id: string;
//         title: string;
//     };
//     recordStatus?: number;
// }
// interface FormDispatchDetail {
//     itemId: number | null;
//     quantity: number | string;
//     description: string;
//     item?: ItemType;
// }

// interface ApiResponse<T> {
//     success: boolean;
//     httpStatusCode: number;
//     message: string;
//     data: T;
// }

// interface VehicleType {
//     id: number;
//     name: string;
//     model: string;
//     plaque: string;
//     recordStatus: number;
//     createAt: string;
// }

// interface ApiResponseVehicleType {
//     id: string;
//     name: string;
//     model: number;
//     plaque: string;
//     recordStatus: number;
//     createAt: string;
// }

// const formatDateDisplay = (dateString: string | null): string => {
//     if (!dateString) return "N/A";
//     try {
//         const date = new Date(dateString);
//         return format(date, 'dd MMMM yyyy', { locale: tr });
//     } catch (e) {
//         return "Geçersiz Tarih";
//     }
// };

// const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
//     '&.Mui-selected': {
//         color: 'white',
//         ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
//         ...(value === 'active' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
//         ...(value === 'inactive' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
//     },
//     '&:not(.Mui-selected)': {
//         color: theme.palette.text.primary,
//         borderColor: theme.palette.divider,
//         '&:hover': { backgroundColor: theme.palette.action.hover },
//     },
// }));
// const blinkAnimation = keyframes`
//     0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
//     50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
//     100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
// `;
// const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
//     animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
//     transition: 'transform 0.3s ease-in-out',
// }));


// const ListBetweenWarehouseDispatch = () => {
//     const { warehouseId } = useParams<{ warehouseId: string }>();
//     const navigate = useNavigate();
//     const authToken = localStorage.getItem('authToken');

//     // === State Variables ===
//     const [docDate, setDocDate] = useState<Date | null>(new Date());
//     const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
//     const [selectedDestinationWarehouseId, setSelectedDestinationWarehouseId] = useState<number | null>(null);
//     const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
//     const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);

//     const [dispatchDetails, setDispatchDetails] = useState<FormDispatchDetail[]>([]);
//     const [dispatchList, setDispatchList] = useState<BetweenWarehouseDispatchType[]>([]);
//     const [displayedDispatches, setDisplayedDispatches] = useState<BetweenWarehouseDispatchType[]>([]);
//     const [loadingData, setLoadingData] = useState(true);
//     const [loadingButton, setLoadingButton] = useState(false);
//     const [isFormValid, setIsFormValid] = useState(false);

//     const [alertMessage, setAlertMessage] = useState<string | null>(null);
//     const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(5);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

//     const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//     const [selectedRowForMenu, setSelectedRowForMenu] = useState<BetweenWarehouseDispatchType | null>(null);
//     const openMenu = Boolean(anchorEl);

//     const [editingId, setEditingId] = useState<string | null>(null);
//     const [editingCode, setEditingCode] = useState<string | null>(null);

//     const [docDateError, setDocDateError] = useState<boolean>(false);
//     const [driverIdError, setDriverIdError] = useState<boolean>(false);
//     const [destinationWarehouseIdError, setDestinationWarehouseIdError] = useState<boolean>(false);
//     const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

//     const [drivers, setDrivers] = useState<DriverType[]>([]);
//     const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
//     const [dispatchesForCombo, setDispatchesForCombo] = useState<WarehouseDispatchByIdType[]>([]);

//     const [openDeleteModal, setOpenDeleteModal] = useState(false);
//     const [dispatchIdToDelete, setDispatchIdToDelete] = useState<string | null>(null);
//     const [dispatchCodeToDelete, setDispatchCodeToDelete] = useState<string>('');

//     const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
//     const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
//     const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);
//     const [openVehicleModal, setOpenVehicleModal] = useState(false);
//     const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);

//     const [openDetailsModal, setOpenDetailsModal] = useState(false);
//     const [detailsToShow, setDetailsToShow] = useState<DispatchDetailType[]>([]);

//     const [isFilterActive, setIsFilterActive] = useState(false);
//     const [startDate, setStartDate] = useState<Date | null>(null);
//     const [endDate, setEndDate] = useState<Date | null>(null);

//     const [removedDispatchDetails, setRemovedDispatchDetails] = useState<any[]>([]);
//     const [isFormVisible, setIsFormVisible] = useState(false);
//     const [isBlinking, setIsBlinking] = useState(true);

//     const { isTooltipGloballyEnabled } = useTooltip();
//     const { allowedOperations } = useAuth();

//     const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
//     const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
//     const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
//     const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

//     // === Form Handlers ===
//     const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//         setAlertMessage(message);
//         setAlertSeverity(severity);
//         setTimeout(() => { setAlertMessage(null); }, 5000);
//     }, []);

//     const fetchVehicles = useCallback(async (driverId: string) => {
//         setLoadingData(true);
//         if (!authToken) {
//             showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
//             setLoadingData(false);
//             return;
//         }

//         try {
//             const response = await axios.get(
//                 `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${driverId}`, {
//                 headers: { Authorization: `Bearer ${authToken}` }
//             });

//             if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
//                 const formattedData: VehicleType[] = response.data.data.map((item: ApiResponseVehicleType) => ({
//                     ...item,
//                     model: String(item.model),
//                     id: Number(item.id)
//                 }));
//                 const activeVehicles = formattedData.filter(item => item.recordStatus === 0);
//                 setVehiclesList(activeVehicles);

//                 if (activeVehicles.length > 1) {
//                     setOpenVehicleModal(true);
//                     setTempSelectedVehicle(activeVehicles[0].id);
//                 } else if (activeVehicles.length === 1) {
//                     setSelectedVehicleId(activeVehicles[0].id);
//                     setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
//                 } else {
//                     setSelectedVehicleId(null);
//                     setSelectedVehicleName(null);
//                 }
//             } else {
//                 setVehiclesList([]);
//                 setSelectedVehicle(null);
//                 setSelectedVehicleName(null);
//                 showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             console.error("Failed to fetch vehicles:", e);
//             setVehiclesList([]);
//             setSelectedVehicle(null);
//             setSelectedVehicleName(null);
//             showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingData(false);
//         }
//     }, [showAlert, authToken]);


//     const fetchDispatchesForCombo = useCallback(async () => {
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.get(server.baseurl + server.warehouse + `get-warehouse-dispatches/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } });
//             if (response.data.httpStatusCode === 200) {
//                 setDispatchesForCombo(response.data.data.filter((d: any) => d.recordStatus === 0));
//             } else {
//                 showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
//         }
//     }, [navigate, warehouseId, showAlert, authToken]);

//     const fetchDispatchDetails = useCallback(async (dispatchId: string) => {
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.get(server.baseurl + server.warehouse + `get-warehouse-dispatch-by-id/${dispatchId}`, { headers: { "Authorization": `Bearer ${authToken}` } });
//             if (response.data.httpStatusCode === 200) {
//                 const details = response.data.data.warehouseDispatchDetails.map((detail: any) => ({
//                     itemId: Number(detail.item.id),
//                     quantity: detail.quantity,
//                     description: detail.description,
//                     item: detail.item,
//                 }));
//                 setDispatchDetails(details);
//             } else {
//                 showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
//         }
//     }, [navigate, showAlert, authToken]);


//     // API Calls
//     const fetchInitialData = useCallback(async () => {
//         setLoadingData(true);
//         if (!authToken) {
//             navigate("/");
//             setLoadingData(false);
//             return;
//         }

//         try {
//             const [driversRes, warehousesRes, betweenDispatchesRes] = await Promise.all([
//                 axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
//                 axios.get<ApiResponse<WarehouseType[]>>(server.baseurl + server.initialoperations + "get-warehouses", { headers: { "Authorization": `Bearer ${authToken}` } }),
//                 axios.get<ApiResponse<BetweenWarehouseDispatchType[]>>(server.baseurl + server.warehouse + `get-between-warehouse-dispatches/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
//                 fetchDispatchesForCombo(), // fetch dispatches for the combo box
//             ]);

//             setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
//             setWarehouses(warehousesRes.data?.data?.filter(w => w.recordStatus === 0).map(w => ({ ...w, id: Number(w.id) })) || []);

//             if (betweenDispatchesRes.data?.httpStatusCode === 200) {
//                 const allDispatches = betweenDispatchesRes.data.data;
//                 const formattedDispatches = allDispatches.map(d => ({
//                     ...d,
//                     status: d.recordStatus === 0 ? 'Aktif' : 'Pasif'
//                 }));
//                 setDispatchList(formattedDispatches);
//             } else {
//                 showAlert(betweenDispatchesRes.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingData(false);
//         }
//     }, [navigate, warehouseId, showAlert, authToken, fetchDispatchesForCombo]);

//     useEffect(() => {
//         fetchInitialData();
//     }, [fetchInitialData]);

//     useEffect(() => {
//         const filteredBySearchAndStatus = dispatchList.filter(d => {
//             const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                 (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
//                 (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
//                 (d.destinationWarehouse?.name && d.destinationWarehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

//             const matchesStatus = statusFilter === 'all' ||
//                 (statusFilter === 'active' && d.recordStatus === 0) ||
//                 (statusFilter === 'inactive' && d.recordStatus === 1);

//             return matchesSearch && matchesStatus;
//         });
//         setDisplayedDispatches(filteredBySearchAndStatus);
//         setPage(0);
//     }, [dispatchList, searchTerm, statusFilter]);

//     useEffect(() => {
//         const isValid = !!selectedDriverId && !!selectedDestinationWarehouseId && !!docDate && dispatchDetails.length > 0 &&
//             dispatchDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
//         setIsFormValid(isValid);
//     }, [selectedDriverId, selectedDestinationWarehouseId, docDate, dispatchDetails]);

//     useEffect(() => {
//         const hasSearch = searchTerm.trim() !== '';
//         const hasStatusFilter = statusFilter !== 'all';
//         const hasDateFilter = startDate !== null || endDate !== null;
//         setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
//     }, [searchTerm, statusFilter, startDate, endDate]);

//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setIsBlinking(false);
//         }, 5000);
//         return () => {
//             clearTimeout(timer);
//         };
//     }, []);

//     const validateForm = (): boolean => {
//         let isValid = true;
//         if (!selectedDriverId) { setDriverIdError(true); isValid = false; } else { setDriverIdError(false); }
//         if (!selectedDestinationWarehouseId) { setDestinationWarehouseIdError(true); isValid = false; } else { setDestinationWarehouseIdError(false); }
//         if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }
//         if (dispatchDetails.length === 0 || dispatchDetails.some(d => !d.itemId || !d.quantity)) {
//             setDispatchDetailsError(true); isValid = false;
//         } else {
//             setDispatchDetailsError(false);
//         }
//         if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
//         return isValid;
//     };

//     const resetFormAndState = () => {
//         setDocDate(new Date());
//         setSelectedDriverId(null);
//         setSelectedDestinationWarehouseId(null);
//         setDispatchDetails([]);
//         setIsFormVisible(false);
//         setEditingId(null);
//         setDocDateError(false);
//         setDriverIdError(false);
//         setDestinationWarehouseIdError(false);
//         setDispatchDetailsError(false);
//         setSelectedVehicleId(null);
//         setSelectedVehicleName(null);
//         setSelectedDispatchId(null);
//     };

//     // === API Actions ===
//     const insertDispatch = async () => {
//         if (!validateForm()) return;
//         setLoadingButton(true);
//         if (!authToken) { navigate("/"); return; }

//         const payload: NewDispatchData = {
//             docDate: docDate?.toISOString() || new Date().toISOString(),
//             warehouseId: Number(warehouseId),
//             driverId: Number(selectedDriverId),
//             driverVehicleId: Number(selectedVehicleId),
//             destinationWarehouseId: Number(selectedDestinationWarehouseId),
//             dispatchDetails: dispatchDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description }))
//         };
//         debugger
//         try {
//             const response = await axios.post(server.baseurl + server.warehouse + "create-between-warehouse-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
//             if (response.data.httpStatusCode === 201) {
//                 showAlert('Yeni sevk belgesi başarıyla eklendi!', 'success');
//                 resetFormAndState();
//                 fetchInitialData();
//             } else {
//                 showAlert(response.data.message || 'Sevk belgesi eklenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Sevk belgesi eklenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const editDispatch = async () => {
//         if (!validateForm() || !editingId) return;
//         setLoadingButton(true);
//         if (!authToken) { navigate("/"); return; }
//         const payload: EditDispatchData = {
//             id: Number(editingId),
//             code: editingCode!,
//             docDate: docDate?.toISOString() || new Date().toISOString(),
//             warehouseId: Number(warehouseId),
//             driverId: Number(selectedDriverId),
//             driverVehicleId: Number(selectedVehicleId),
//             destinationWarehouseId: Number(selectedDestinationWarehouseId),
//             dispatchDetails: dispatchDetails.map(d => ({
//                 itemId: Number(d.itemId),
//                 quantity: Number(d.quantity),
//                 description: d.description
//             }))
//         };
//         try {
//             const response = await axios.put(server.baseurl + server.warehouse + "update-between-warehouse-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
//             if (response.data.httpStatusCode === 200) {
//                 showAlert('Sevk belgesi başarıyla güncellendi!', 'success');
//                 resetFormAndState();
//                 fetchInitialData();
//             } else {
//                 showAlert(response.data.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
//             }
//         } catch (e: any) {
//             showAlert(e.response?.data?.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
//         } finally {
//             setLoadingButton(false);
//         }
//     };

//     const handleCloseMenu = () => {
//         setAnchorEl(null);
//         setSelectedRowForMenu(null);
//     };

//     const handleEditClick = () => {
//         if (selectedRowForMenu) {
//             setEditingId(selectedRowForMenu.id);
//             setDocDate(new Date(selectedRowForMenu.docDate));
//             setEditingCode(selectedRowForMenu.code);
//             setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
//             setSelectedDestinationWarehouseId(Number(selectedRowForMenu.destinationWarehouse?.id));
//             if (selectedRowForMenu.driverVehicle) {
//                 setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
//                 setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
//             }
//             const formattedDetails: FormDispatchDetail[] = (selectedRowForMenu.warehouseDispatchDetails || []).map(d => ({
//                 itemId: Number(d.item?.id),
//                 quantity: d.quantity,
//                 description: d.description,
//             }));
//             setDispatchDetails(formattedDetails);
//             setIsFormVisible(true);
//             handleCloseMenu();
//         }
//     };
//     const handleCancelEdit = () => {
//         resetFormAndState();
//     };

//     const handleClickOpenDeleteModal = () => {
//         if (selectedRowForMenu) {
//             setDispatchIdToDelete(selectedRowForMenu.id);
//             setDispatchCodeToDelete(selectedRowForMenu.code);
//             setOpenDeleteModal(true);
//         }
//         handleCloseMenu();
//     };

//     const handleCloseDeleteModal = () => {
//         setOpenDeleteModal(false);
//         setDispatchIdToDelete(null);
//         setDispatchCodeToDelete('');
//     };

//     const handleRemoveDispatchDetail = (index: number) => {
//         setDispatchDetails(prev => {
//             const removedItem = prev[index];
//             if (removedItem) {
//                 // اضافه کردن آیتم حذف شده به لیست موقت
//                 setRemovedDispatchDetails(oldRemoved => [...oldRemoved, removedItem]);
//             }
//             return prev.filter((_, i) => i !== index);
//         });
//     };

//     const handleRestoreDispatchDetail = (indexToRestore: number) => {
//         const itemToRestore = removedDispatchDetails[indexToRestore];
//         if (itemToRestore) {
//             setDispatchDetails(prev => [...prev, itemToRestore]);
//             setRemovedDispatchDetails(prev => prev.filter((_, i) => i !== indexToRestore));
//         }
//     };
//     const handleDispatchDetailChange = useCallback((index: number, field: keyof FormDispatchDetail, value: any) => {
//         setDispatchDetails(prev => {
//             const newDetails = [...prev];
//             const updatedDetail = { ...newDetails[index] };

//             if (field === 'quantity') {
//                 const numValue = Number(value);
//                 const selectedDispatchDetails = dispatchesForCombo.find(d => d.id === selectedDispatchId)?.warehouseDispatchDetails;
//                 const selectedItemDetails = selectedDispatchDetails?.find(item => Number(item.item.id) === Number(updatedDetail.itemId));
//                 const maxQuantity = selectedItemDetails ? Number(selectedItemDetails.quantity) : Infinity;

//                 if (numValue < 0) {
//                     showAlert('Miktar negatif olamaz!', 'warning');
//                     updatedDetail.quantity = 0;
//                 } else if (numValue > maxQuantity) {
//                     showAlert(`Girdiğiniz miktar sevk miktarından fazla! Maksimum: ${maxQuantity}`, 'warning');
//                     updatedDetail.quantity = maxQuantity;
//                 } else {
//                     updatedDetail.quantity = value;
//                 }
//             } else {
//                 (updatedDetail as any)[field] = value;
//             }

//             newDetails[index] = updatedDetail;
//             return newDetails;
//         });
//     }, [dispatchesForCombo, selectedDispatchId, showAlert]);

//     const handleEditVehicleSelection = () => {
//         if (vehiclesList.length > 1) {
//             setOpenVehicleModal(true);
//             setTempSelectedVehicle(selectedVehicle);
//         } else {
//             showAlert('Bu şoförün tek bir aracı bulunmaktadır.', 'info');
//         }
//     };

//     const handleDownloadAllDispatchesPDF = () => {
//         if (!dispatchList || dispatchList.length === 0) {
//             showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning');
//             return;
//         }

//         const doc = new jsPDF();
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();
//         let yPos = 50;

//         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//         doc.setFont('NotoSans');

//         const header = () => {
//             doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
//             doc.setFontSize(18);
//             doc.text('Depolar Arası Sevk Raporu', pageWidth - 15, 30, { align: 'right' });
//             doc.setFontSize(12);
//             doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
//         };

//         const footer = () => {
//             doc.setFontSize(10);
//             doc.setTextColor(0);
//             doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//             doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//             const docAny = doc as any;
//             const pageCount = docAny.internal.getNumberOfPages();
//             doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//         };

//         dispatchList.forEach((dispatch) => {
//             if (yPos + 50 > doc.internal.pageSize.getHeight()) {
//                 doc.addPage();
//                 yPos = 50;
//             }

//             doc.setFontSize(14);
//             doc.text(`Sevk Belgesi Kodu: ${dispatch.code}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Kaynak Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Hedef Depo: ${dispatch.destinationWarehouse?.name || '-'}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || '-'})`, 15, yPos);
//             yPos += 7;
//             doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos);
//             yPos += 15;

//             const detailsRows = (dispatch.warehouseDispatchDetails || []).map(d => [
//                 d.item?.name || '-',
//                 d.quantity,
//                 d.item?.unit?.title || '-',
//                 d.description || '-'
//             ]);

//             autoTable(doc, {
//                 startY: yPos,
//                 head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
//                 body: detailsRows,
//                 theme: 'grid',
//                 styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
//                 headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//                 pageBreak: 'auto',
//                 didDrawCell: (data: any) => {
//                     if (data.cell.section === 'body') {
//                         yPos = (data.cell.y + data.cell.height);
//                     }
//                 },
//                 didDrawPage: () => {
//                     header();
//                     footer();
//                 },
//                 showHead: 'everyPage',
//                 margin: { top: 50, bottom: 20 }
//             });
//             yPos += 15;
//         });

//         doc.save('Depolar_Arasi_Transfer_Rapor.pdf');
//         showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
//     };

//     const handleDownloadFilteredAllPDF = () => {
//         if (!displayedDispatches || displayedDispatches.length === 0) {
//             showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning');
//             return;
//         }

//         const doc = new jsPDF();
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();
//         let yPos = 50;

//         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//         doc.setFont('NotoSans');

//         const header = () => {
//             doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
//             doc.setFontSize(18);
//             doc.text('Depolar Arası Sevk Raporu', pageWidth - 15, 30, { align: 'right' });
//             doc.setFontSize(12);
//             doc.text(`Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}`, pageWidth - 15, 40, { align: 'right' });
//             doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 47, { align: 'right' });
//         };

//         const footer = () => {
//             doc.setFontSize(10);
//             doc.setTextColor(0);
//             doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//             doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//             const docAny = doc as any;
//             const pageCount = docAny.internal.getNumberOfPages();
//             doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//         };

//         displayedDispatches.forEach((dispatch) => {
//             if (yPos + 50 > doc.internal.pageSize.getHeight()) {
//                 doc.addPage();
//                 yPos = 50;
//             }

//             doc.setFontSize(14);
//             doc.text(`Sevk Belgesi Kodu: ${dispatch.code}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Kaynak Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Hedef Depo: ${dispatch.destinationWarehouse?.name || '-'}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos);
//             yPos += 7;
//             doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || '-'})`, 15, yPos);
//             yPos += 7;
//             doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos);
//             yPos += 15;

//             const detailsRows = (dispatch.warehouseDispatchDetails || []).map(d => [
//                 d.item?.name || '-',
//                 d.quantity,
//                 d.item?.unit?.title || '-',
//                 d.description || '-'
//             ]);

//             autoTable(doc, {
//                 startY: yPos,
//                 head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
//                 body: detailsRows,
//                 theme: 'grid',
//                 styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
//                 headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//                 pageBreak: 'auto',
//                 didDrawCell: (data: any) => {
//                     if (data.cell.section === 'body') {
//                         yPos = (data.cell.y + data.cell.height);
//                     }
//                 },
//                 didDrawPage: () => {
//                     header();
//                     footer();
//                 },
//                 showHead: 'everyPage',
//                 margin: { top: 50, bottom: 20 }
//             });
//             yPos += 15;
//         });

//         doc.save('Depolar_Arasi_Transfer_Filtre_Rapor.pdf');
//         showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
//     };

//     const handleDownloadSingleDispatchPDF = (dispatch: BetweenWarehouseDispatchType) => {
//         if (!dispatch) {
//             showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning');
//             return;
//         }

//         const doc = new jsPDF();
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();
//         let yPos = 50;

//         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//         doc.setFont('NotoSans');

//         const header = () => {
//             doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
//             doc.setFontSize(18);
//             doc.text('Depolar Arası Sevk Raporu', pageWidth - 15, 30, { align: 'right' });
//             doc.setFontSize(12);
//             doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
//         };

//         const footer = () => {
//             doc.setFontSize(10);
//             doc.setTextColor(0);
//             doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//             doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//             const docAny = doc as any;
//             const pageCount = docAny.internal.getNumberOfPages();
//             doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//         };

//         header();
//         footer();

//         doc.setFontSize(14);
//         doc.text(`Sevk Belgesi Kodu: ${dispatch.code}`, 15, yPos);
//         yPos += 7;
//         doc.text(`Kaynak Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
//         yPos += 7;
//         doc.text(`Hedef Depo: ${dispatch.destinationWarehouse?.name || '-'}`, 15, yPos);
//         yPos += 7;
//         doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos);
//         yPos += 7;
//         doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || '-'})`, 15, yPos);
//         yPos += 7;
//         doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos);
//         yPos += 15;

//         const detailsRows = (dispatch.warehouseDispatchDetails || []).map(d => [
//             d.item?.name || '-',
//             d.quantity,
//             d.item?.unit?.title || '-',
//             d.description || '-'
//         ]);

//         autoTable(doc, {
//             startY: yPos,
//             head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
//             body: detailsRows,
//             theme: 'grid',
//             styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
//             headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//             pageBreak: 'auto',
//             didDrawPage: () => {
//                 header();
//                 footer();
//             },
//             showHead: 'everyPage',
//             margin: { top: 50, bottom: 20 }
//         });

//         doc.save(`Sevk_Belgesi_${dispatch.code}.pdf`);
//         showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
//     };
//     // const selectedItemIds = useMemo(() => dispatchDetails.map(d => d.itemId).filter(id => id !== null), [dispatchDetails]);

//     const handleClearDateFilters = () => {
//         setStartDate(null);
//         setEndDate(null);
//     };

//     return (
//         <>
//             <Box sx={{ p: 3 }}>
//                 <Stack
//                     direction={{ xs: 'column', md: 'row' }}
//                     justifyContent="space-between"
//                     alignItems={{ xs: 'stretch', md: 'center' }}
//                     mb={3}
//                     spacing={2}
//                     flexWrap="wrap"
//                 >
//                     <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
//                         Depolar Arası Sevk İşlemleri
//                     </Typography>

//                     <Stack
//                         direction={{ xs: 'column', sm: 'row' }}
//                         spacing={1}
//                         alignItems="stretch"
//                         flexGrow={1}
//                         justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
//                     >
//                         {!isFormVisible && hasCreatePermission && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Depolar Arası Sevk Belgesi kaydetmek için tıklayınız" : ""}>
//                                 <BlinkingButton
//                                     variant="contained"
//                                     color="primary"
//                                     onClick={() => setIsFormVisible(true)}
//                                     isBlinking={isBlinking}
//                                     fullWidth={false} // در حالت موبایل بهتر است fullWidth نباشد
//                                 >
//                                     Yeni Depolar Arası Sevk
//                                 </BlinkingButton>
//                             </CustomTooltip>
//                         )}
//                         {isFormVisible && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
//                                 <Button
//                                     variant="contained"
//                                     color="error"
//                                     onClick={resetFormAndState}
//                                     disabled={loadingButton}
//                                     fullWidth={false}
//                                     startIcon={<IconX size={20} />}
//                                 >
//                                     Gizle
//                                 </Button>
//                             </CustomTooltip>
//                         )}

//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
//                             <Button
//                                 variant="outlined"
//                                 color="error"
//                                 onClick={() => navigate(-1)}
//                                 endIcon={<IconArrowRight size={20} />}
//                                 fullWidth={false}
//                             >
//                                 Geri Dön
//                             </Button>
//                         </CustomTooltip>
//                     </Stack>
//                 </Stack>
//                 {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
//                     <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
//                         <Typography variant="h5" mb={2}>{editingId ? 'Depo Sevk Belgesini Düzenle' : 'Yeni Depo Sevk Belgesi'}</Typography>
//                         <Grid container spacing={2}>
//                             <Grid item xs={12} sm={4}>
//                                 <CustomFormLabel required>Şoför</CustomFormLabel>
//                                 <Autocomplete
//                                     id="driver-select"
//                                     options={drivers}
//                                     getOptionLabel={(option) => `${option.name} ${option.family}`}
//                                     value={drivers.find(d => d.id === selectedDriverId) || null}
//                                     onChange={(_, newValue) => {
//                                         setSelectedDriverId(newValue ? newValue.id : null);
//                                         if (newValue) {
//                                             fetchVehicles(String(newValue.id));
//                                         } else {
//                                             setSelectedVehicle(null);
//                                             setSelectedVehicleName(null);
//                                             setVehiclesList([]);
//                                         }
//                                         if (driverIdError && newValue) setDriverIdError(false);
//                                     }}
//                                     isOptionEqualToValue={(option, value) => option.id === value.id}
//                                     renderInput={(params) => (
//                                         <TextField
//                                             {...params}
//                                             fullWidth
//                                             size="small"
//                                             placeholder="Şoför Seçin"
//                                             error={driverIdError}
//                                             helperText={driverIdError ? "Şoför seçimi zorunludur!" : ""}
//                                         />
//                                     )}
//                                 />
//                                 {selectedVehicleName && (
//                                     <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
//                                         <Chip label={`Seçilen Araç: ${selectedVehicleName}`} color="info" />
//                                         <CustomTooltip title={isTooltipGloballyEnabled ? "Aracı değiştir" : ""}>
//                                             <IconButton onClick={handleEditVehicleSelection} size="small">
//                                                 <IconEdit size={18} />
//                                             </IconButton>
//                                         </CustomTooltip>
//                                     </Box>
//                                 )}
//                             </Grid>
//                             <Grid item xs={12} sm={4}>
//                                 <CustomFormLabel required>Hedef Depo</CustomFormLabel>
//                                 <Autocomplete
//                                     id="destination-warehouse-select"
//                                     options={warehouses.filter(w => Number(w.id) !== Number(warehouseId))}
//                                     getOptionLabel={(option) => option.name}
//                                     value={warehouses.find(w => w.id === selectedDestinationWarehouseId) || null}
//                                     onChange={(_, newValue) => {
//                                         setSelectedDestinationWarehouseId(newValue ? newValue.id : null);
//                                         if (destinationWarehouseIdError && newValue) setDestinationWarehouseIdError(false);
//                                     }}
//                                     isOptionEqualToValue={(option, value) => option.id === value.id}
//                                     renderInput={(params) => (
//                                         <TextField
//                                             {...params}
//                                             fullWidth
//                                             size="small"
//                                             placeholder="Hedef Depo Seçin"
//                                             error={destinationWarehouseIdError}
//                                             helperText={destinationWarehouseIdError ? "Hedef depo seçimi zorunludur!" : ""}
//                                         />
//                                     )}
//                                 />
//                             </Grid>
//                             <Grid item xs={12} sm={4}>
//                                 <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
//                                 <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                     <DatePicker
//                                         label=""
//                                         value={docDate}
//                                         onChange={(newValue) => {
//                                             setDocDate(newValue);
//                                             if (docDateError && newValue) setDocDateError(false);
//                                         }}
//                                         inputFormat="dd/MM/yyyy"
//                                         renderInput={(params) => (
//                                             <TextField
//                                                 {...params}
//                                                 fullWidth
//                                                 size="small"
//                                                 error={docDateError}
//                                                 helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""}
//                                             />
//                                         )}
//                                     />
//                                 </LocalizationProvider>
//                             </Grid>
//                             <Grid item xs={12}>
//                                 <CustomFormLabel required>Sevk Belgesi</CustomFormLabel>
//                                 <Autocomplete
//                                     id="dispatch-select"
//                                     options={dispatchesForCombo}
//                                     getOptionLabel={(option) => option.code}
//                                     value={dispatchesForCombo.find(d => d.id === selectedDispatchId) || null}
//                                     onChange={(_, newValue) => {
//                                         setSelectedDispatchId(newValue ? newValue.id : null);
//                                         if (newValue) {
//                                             fetchDispatchDetails(newValue.id);
//                                         } else {
//                                             setDispatchDetails([]);
//                                         }
//                                     }}
//                                     isOptionEqualToValue={(option, value) => option.id === value.id}
//                                     renderInput={(params) => (
//                                         <TextField
//                                             {...params}
//                                             fullWidth
//                                             size="small"
//                                             placeholder="Sevk Belgesi Seçin"
//                                         />
//                                     )}
//                                 />
//                             </Grid>
//                         </Grid>
//                         {removedDispatchDetails.length > 0 && (
//                             <Box sx={{
//                                 border: '1px dashed',
//                                 borderColor: "error.main",
//                                 p: 2,
//                                 mb: 2,
//                                 mt: 2,
//                                 borderRadius: 1,
//                                 backgroundColor: 'rgba(255, 0, 0, 0.05)'
//                             }}>
//                                 <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler</Typography>
//                                 <Stack direction="row" spacing={1} flexWrap="wrap">
//                                     {removedDispatchDetails.map((detail, index) => (
//                                         <Chip
//                                             key={index}
//                                             label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
//                                             color="error"
//                                             onDelete={() => handleRestoreDispatchDetail(index)} // 👈 فراخوانی تابع جدید برای بازگرداندن
//                                             deleteIcon={<IconReload size={18} />}
//                                         />
//                                     ))}
//                                 </Stack>
//                             </Box>
//                         )}
//                         <Box mt={4}>
//                             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
//                                 <Typography variant="h6">Sevk Detayları</Typography>
//                                 {/* <Button variant="outlined" startIcon={<IconPlus />} onClick={handleAddDispatchDetail}>Detay Ekle</Button> */}
//                             </Stack>
//                             <Grid container spacing={2}>
//                                 {dispatchDetails.map((detail, index) => {
//                                     const selectedDispatchItem = dispatchesForCombo.find(d => d.id === selectedDispatchId)?.warehouseDispatchDetails.find(item => Number(item.item.id) === Number(detail.itemId));
//                                     const maxQuantity = selectedDispatchItem ? Number(selectedDispatchItem.quantity) : 0;
//                                     const displayBalance = selectedDispatchItem ? `(Sevk Miktarı: ${maxQuantity})` : '';

//                                     return (
//                                         <Grid item xs={12} key={index}>
//                                             <Stack direction="row" spacing={2} alignItems="center">
//                                                 <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
//                                                     <Typography variant="body1" noWrap sx={{ flexGrow: 1 }}>
//                                                         {detail?.item?.name || 'Aradığınız şey bulunamadı.'}
//                                                     </Typography>
//                                                     {detail?.item?.unit?.title && (
//                                                         <Chip label={detail.item.unit.title} color="secondary" variant="outlined" sx={{ ml: 1 }} />
//                                                     )}
//                                                 </Box>
//                                                 <CustomTextField
//                                                     type="number"
//                                                     placeholder="Miktar"
//                                                     value={detail.quantity}
//                                                     onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
//                                                     fullWidth
//                                                     InputProps={{
//                                                         endAdornment: <InputAdornment position="end">{displayBalance}</InputAdornment>
//                                                     }}
//                                                 />
//                                                 <CustomTextField placeholder="Açıklama" value={detail.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)} fullWidth />
//                                                 <IconButton color="error" onClick={() => handleRemoveDispatchDetail(index)}><IconTrash /></IconButton>
//                                             </Stack>
//                                         </Grid>
//                                     )
//                                 })}
//                             </Grid>
//                             {dispatchDetailsError && <Typography color="error" variant="caption" sx={{ mt: 1.5, ml: 1.5 }}>En az bir sevk detayı eklemek zorunludur!</Typography>}
//                         </Box>
//                         <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
//                             {editingId ? (
//                                 <>
//                                     <Button variant="contained" color="info" onClick={editDispatch} disabled={loadingButton}>
//                                         {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
//                                     </Button>
//                                     <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
//                                 </>
//                             ) : (
//                                 hasCreatePermission && (
//                                     <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak sevk belgesini kaydedin." : ""}>
//                                         <span>
//                                             <BlinkingButton
//                                                 variant="contained"
//                                                 color="success"
//                                                 onClick={insertDispatch}
//                                                 disabled={!isFormValid || loadingButton}
//                                                 isBlinking={isFormValid && !loadingButton}
//                                             >
//                                                 {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Sevk Belgesi Ekle'}
//                                             </BlinkingButton>
//                                         </span>
//                                     </CustomTooltip>
//                                 )
//                             )}
//                         </Stack>
//                     </Paper>
//                 )}

//                 {alertMessage && (
//                     <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
//                         <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
//                     </Stack>
//                 )}
//                 <BlankCard>
//                     <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2} mb={2} mr={2}>
//                         {isFilterActive && hasDownloadPermission && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle sevkleri indirin" : ""}>
//                                 <BlinkingButton
//                                     variant="contained"
//                                     color="secondary"
//                                     onClick={handleDownloadFilteredAllPDF} // اینجا تابع فراخوانی می‌شود
//                                     startIcon={<IconFileDownload />}
//                                     isBlinking={true}
//                                     disabled={loadingData || displayedDispatches.length === 0}
//                                 >
//                                     Filtrelenmişi İndir (PDF)
//                                 </BlinkingButton>
//                             </CustomTooltip>
//                         )}
//                         {hasDownloadPermission && (
//                             <Button
//                                 variant="contained"
//                                 color="primary"
//                                 onClick={handleDownloadAllDispatchesPDF} // اینجا تابع فراخوانی می‌شود
//                                 startIcon={<IconFileDownload />}
//                                 disabled={loadingData || dispatchList.length === 0}
//                             >
//                                 Tümünü İndir (PDF)
//                             </Button>
//                         )}
//                     </Stack>
//                     <Box sx={{ p: 2 }}>
//                         <Grid container spacing={2} alignItems="center">
//                             <Grid item xs={12} sm={6} md={3}>
//                                 <TextField
//                                     label="Sevk Belgesi Ara"
//                                     variant="outlined"
//                                     fullWidth
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                     InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
//                                 />
//                             </Grid>
//                             <Grid item xs={12} sm={6} md={6}>
//                                 <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                     <Stack direction="row" spacing={1} alignItems="center">
//                                         <DatePicker
//                                             label="Başlangıç Tarihi"
//                                             value={startDate}
//                                             inputFormat="dd/MM/yyyy"
//                                             onChange={(newValue) => setStartDate(newValue)}
//                                             renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                         />
//                                         <DatePicker
//                                             label="Bitiş Tarihi"
//                                             value={endDate}
//                                             inputFormat="dd/MM/yyyy"
//                                             onChange={(newValue) => setEndDate(newValue)}
//                                             renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                         />
//                                         <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
//                                             <IconX size={20} />
//                                         </IconButton>
//                                     </Stack>
//                                 </LocalizationProvider>
//                             </Grid>
//                             <Grid item xs={12} sm={6} md={3}>
//                                 <ToggleButtonGroup
//                                     value={statusFilter}
//                                     exclusive
//                                     onChange={(_, newFilter) => newFilter && setStatusFilter(newFilter)}
//                                     fullWidth
//                                 >
//                                     <StyledToggleButton value="all">Tümü</StyledToggleButton>
//                                     <StyledToggleButton value="active">Aktif</StyledToggleButton>
//                                     <StyledToggleButton value="inactive">Pasif</StyledToggleButton>
//                                 </ToggleButtonGroup>
//                             </Grid>
//                         </Grid>
//                     </Box>
//                     {loadingData ? (
//                         <Box display="flex" justifyContent="center" alignItems="center" height="200px">
//                             <CircularProgress />
//                             <Typography variant="h6" sx={{ ml: 2 }}>Depolar arası sevk belgeleri yükleniyor...</Typography>
//                         </Box>
//                     ) : (
//                         <TableContainer>
//                             <Table>
//                                 <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
//                                     <TableRow>
//                                         <TableCell><Typography variant="h6">Kod</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Kaynak Depo</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Hedef Depo</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Şoför</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Araç</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Belge Tarihi</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Durum</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Sevk Detayları</Typography></TableCell>
//                                         <TableCell></TableCell>
//                                     </TableRow>
//                                 </TableHead>
//                                 <TableBody>
//                                     {displayedDispatches.length > 0 ? (
//                                         displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
//                                             <TableRow key={row.id}>
//                                                 <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
//                                                 <TableCell><Typography variant="h6">{row.warehouse?.name || '-'}</Typography></TableCell>
//                                                 <TableCell><Typography variant="h6">{row.destinationWarehouse?.name || '-'}</Typography></TableCell>
//                                                 <TableCell><Typography variant="h6">{`${row.driver?.name || ''} ${row.driver?.family || ''}`}</Typography></TableCell>
//                                                 <TableCell><Typography variant="h6">{`${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></TableCell>
//                                                 <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
//                                                 <TableCell>
//                                                     <Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} />
//                                                 </TableCell>
//                                                 <TableCell>
//                                                     <Stack direction="row" spacing={1} alignItems="center">
//                                                         <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
//                                                             <Button variant="outlined" startIcon={<IconEye />}
//                                                                 onClick={() => {
//                                                                     setDetailsToShow(row.warehouseDispatchDetails || []);
//                                                                     setOpenDetailsModal(true);
//                                                                 }}
//                                                             >
//                                                                 Görünüm
//                                                             </Button>
//                                                         </CustomTooltip>
//                                                     </Stack>
//                                                 </TableCell>
//                                                 <TableCell>
//                                                     <IconButton onClick={(e) => {
//                                                         setSelectedRowForMenu(row);
//                                                         setAnchorEl(e.currentTarget);
//                                                     }}><IconDots width={18} /></IconButton>
//                                                     <Menu anchorEl={anchorEl}
//                                                         open={openMenu && selectedRowForMenu?.id === row.id}
//                                                         onClose={handleCloseMenu}>
//                                                         {hasDownloadPermission && (
//                                                             <MenuItem onClick={() => {
//                                                                 handleDownloadSingleDispatchPDF(selectedRowForMenu!);
//                                                                 handleCloseMenu();
//                                                             }}>
//                                                                 <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
//                                                                 Bu satırı indir(PDF)
//                                                             </MenuItem>
//                                                         )}
//                                                         {hasEditPermission && <MenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>}
//                                                         {hasDeletePermission &&
//                                                             <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>}
//                                                     </Menu>
//                                                 </TableCell>
//                                             </TableRow>
//                                         ))
//                                     ) : (
//                                         <TableRow><TableCell colSpan={9} align="center"><Typography>Hiç sevk belgesi bulunamadı.</Typography></TableCell></TableRow>
//                                     )}
//                                 </TableBody>
//                             </Table>
//                         </TableContainer>
//                     )}
//                     <TablePagination
//                         rowsPerPageOptions={[5, 10, 25]}
//                         component="div"
//                         count={displayedDispatches.length}
//                         rowsPerPage={rowsPerPage}
//                         page={page}
//                         onPageChange={(_, newPage) => setPage(newPage)}
//                         onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
//                         labelRowsPerPage="Satır başına:"
//                     />
//                 </BlankCard>
//             </Box>
//             <Dialog open={openVehicleModal} onClose={() => setOpenVehicleModal(false)}>
//                 <DialogTitle>Araç Seçin</DialogTitle>
//                 <DialogContent>
//                     <FormControl component="fieldset">
//                         <RadioGroup
//                             aria-label="vehicle"
//                             name="vehicle-radio-group"
//                             value={tempSelectedVehicle}
//                             onChange={(event) => setTempSelectedVehicle(Number(event.target.value))}
//                         >
//                             {vehiclesList.map((vehicle) => (
//                                 <FormControlLabel
//                                     key={vehicle.id}
//                                     value={vehicle.id}
//                                     control={<Radio />}
//                                     label={`${vehicle.name} (${vehicle.plaque})`}
//                                 />
//                             ))}
//                         </RadioGroup>
//                     </FormControl>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => {
//                         const selected = vehiclesList.find(v => v.id === tempSelectedVehicle);
//                         if (selected) {
//                             setSelectedVehicleId(selected.id);
//                             setSelectedVehicleName(`${selected.name} (${selected.plaque})`);
//                         }
//                         setOpenVehicleModal(false);
//                     }} color="primary" variant="contained">
//                         Seç
//                     </Button>
//                     <Button onClick={() => setOpenVehicleModal(false)} color="secondary">
//                         İptal
//                     </Button>
//                 </DialogActions>
//             </Dialog>

//             <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
//                 <DialogTitle>Sevk Detayları</DialogTitle>
//                 <DialogContent>
//                     {detailsToShow.length > 0 ? (
//                         <TableContainer component={Paper}>
//                             <Table>
//                                 <TableHead>
//                                     <TableRow>
//                                         <TableCell><Typography variant="h6">Malzeme</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Miktar</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Birim</Typography></TableCell>
//                                         <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
//                                     </TableRow>
//                                 </TableHead>
//                                 <TableBody>
//                                     {detailsToShow.map((detail, index) => (
//                                         <TableRow key={index}>
//                                             <TableCell>{detail.item?.name || '-'}</TableCell>
//                                             <TableCell>{detail.quantity}</TableCell>
//                                             <TableCell>{detail.item?.unit?.title}</TableCell>
//                                             <TableCell>{detail.description || '-'}</TableCell>
//                                         </TableRow>
//                                     ))}
//                                 </TableBody>
//                             </Table>
//                         </TableContainer>
//                     ) : (
//                         <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
//                             Bu sevk belgesi için detay bulunamadı.
//                         </Typography>
//                     )}
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
//                 </DialogActions>
//             </Dialog>

//             <DeleteBetweenwarehouseDispatch
//                 openModal={openDeleteModal}
//                 onClose={handleCloseDeleteModal}
//                 dispatchIdToDelete={dispatchIdToDelete}
//                 dispatchCodeToDelete={dispatchCodeToDelete}
//                 onDeleteSuccess={() => fetchInitialData()}
//                 showAlert={showAlert}
//             />
//         </>
//     );
// };

// export default ListBetweenWarehouseDispatch;

// src/views/warehouses/ListBetweenWarehouseDispatch.tsx
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
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconArrowRight, IconEye, IconX, IconReload, IconFileText, IconFileSpreadsheet
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
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import DeleteBetweenwarehouseDispatch from "./DeleteBetweenwarehouseDispatch";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// ✨ NEW imports for Excel
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

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

interface WarehouseDispatchDetailsType {
    id: string;
    quantity: string;
    description: string;
    item: {
        id: string;
        name: string;
        unit: {
            title: string;
        };
    };
}

interface WarehouseDispatchByIdType {
    id: string;
    code: string;
    docDate: string;
    warehouseDispatchDetails: WarehouseDispatchDetailsType[];
}


interface BetweenWarehouseDispatchType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    status: string;
    statusDescription: string | null;
    warehouse?: {
        id: string;
        name: string;
    };
    destinationWarehouse?: {
        id: string;
        name: string;
    };
    driver?: {
        id: string;
        name: string;
        family: string;
    };
    driverVehicle?: {
        id: string;
        name: string;
        plaque: string;
    };
    warehouseDispatchDetails: DispatchDetailType[];
    statusText?: string;
    statusColor?: 'success' | 'error' | 'warning' | 'info';
}

interface NewDispatchData {
    docDate: string;
    warehouseId: number;
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

interface DriverType {
    id: number;
    name: string;
    family: string;
    recordStatus?: number;
}
interface WarehouseType {
    id: number;
    name: string;
    recordStatus?: number;
}

interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    unit?: {
        id: string;
        title: string;
    };
    recordStatus?: number;
}
interface FormDispatchDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    item?: ItemType;
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


// =====================================================================================
// توابع کمکی برای ساختار گزارش‌دهی PDF و Excel (مشابه کد قبلی شما)
// =====================================================================================

const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');

    docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Rapor Tarihi:`, 15, 45);
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 45);

    if (subtitle) {
        doc.text(subtitle, pageWidth - 15, 47, { align: 'right' });
    }
};

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


const ListBetweenWarehouseDispatch = () => {
    const { warehouseId } = useParams<{ warehouseId: string }>();
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [selectedDestinationWarehouseId, setSelectedDestinationWarehouseId] = useState<number | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
    const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);

    const [dispatchDetails, setDispatchDetails] = useState<FormDispatchDetail[]>([]);
    const [dispatchList, setDispatchList] = useState<BetweenWarehouseDispatchType[]>([]);
    const [displayedDispatches, setDisplayedDispatches] = useState<BetweenWarehouseDispatchType[]>([]);
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
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<BetweenWarehouseDispatchType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [driverIdError, setDriverIdError] = useState<boolean>(false);
    const [destinationWarehouseIdError, setDestinationWarehouseIdError] = useState<boolean>(false);
    const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
    const [dispatchesForCombo, setDispatchesForCombo] = useState<WarehouseDispatchByIdType[]>([]);

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

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [removedDispatchDetails, setRemovedDispatchDetails] = useState<any[]>([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    // ✨ NEW: State for download modals
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedDispatchForDownload, setSelectedDispatchForDownload] = useState<BetweenWarehouseDispatchType | null>(null);


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
                    setSelectedVehicleId(activeVehicles[0].id);
                    setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
                } else {
                    setSelectedVehicleId(null);
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
    }, [showAlert, authToken]);


    const fetchDispatchesForCombo = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + `get-warehouse-dispatches/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setDispatchesForCombo(response.data.data.filter((d: any) => d.recordStatus === 0));
            } else {
                showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, warehouseId, showAlert, authToken]);

    const fetchDispatchDetails = useCallback(async (dispatchId: string) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + `get-warehouse-dispatch-by-id/${dispatchId}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const details = response.data.data.warehouseDispatchDetails.map((detail: any) => ({
                    itemId: Number(detail.item.id),
                    quantity: detail.quantity,
                    description: detail.description,
                    item: detail.item,
                }));
                setDispatchDetails(details);
            } else {
                showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, authToken]);


    // API Calls
    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        try {
            const [driversRes, warehousesRes, betweenDispatchesRes] = await Promise.all([
                axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<WarehouseType[]>>(server.baseurl + server.initialoperations + "get-warehouses", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<BetweenWarehouseDispatchType[]>>(server.baseurl + server.warehouse + `get-between-warehouse-dispatches/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
                fetchDispatchesForCombo(), // fetch dispatches for the combo box
            ]);

            setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
            setWarehouses(warehousesRes.data?.data?.filter(w => w.recordStatus === 0).map(w => ({ ...w, id: Number(w.id) })) || []);

            if (betweenDispatchesRes.data?.httpStatusCode === 200) {
                const allDispatches = betweenDispatchesRes.data.data;
                const formattedDispatches = allDispatches.map(d => ({
                    ...d,
                    status: d.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setDispatchList(formattedDispatches);
            } else {
                showAlert(betweenDispatchesRes.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, warehouseId, showAlert, authToken, fetchDispatchesForCombo]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const filteredBySearchAndStatus = dispatchList.filter(d => {
            const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.destinationWarehouse?.name && d.destinationWarehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && d.recordStatus === 0) ||
                (statusFilter === 'inactive' && d.recordStatus === 1);

            return matchesSearch && matchesStatus;
        });
        setDisplayedDispatches(filteredBySearchAndStatus);
        setPage(0);
    }, [dispatchList, searchTerm, statusFilter]);

    useEffect(() => {
        const isValid = !!selectedDriverId && !!selectedDestinationWarehouseId && !!docDate && dispatchDetails.length > 0 &&
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
        setSelectedDestinationWarehouseId(null);
        setDispatchDetails([]);
        setIsFormVisible(false);
        setEditingId(null);
        setDocDateError(false);
        setDriverIdError(false);
        setDestinationWarehouseIdError(false);
        setDispatchDetailsError(false);
        setSelectedVehicleId(null);
        setSelectedVehicleName(null);
        setSelectedDispatchId(null);
    };

    // === API Actions ===
    const insertDispatch = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const payload: NewDispatchData = {
            docDate: docDate?.toISOString() || new Date().toISOString(),
            warehouseId: Number(warehouseId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            destinationWarehouseId: Number(selectedDestinationWarehouseId),
            dispatchDetails: dispatchDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description }))
        };
        try {
            const response = await axios.post(server.baseurl + server.warehouse + "create-between-warehouse-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
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
        if (!authToken) { navigate("/"); return; }
        const payload: EditDispatchData = {
            id: Number(editingId),
            code: editingCode!,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            warehouseId: Number(warehouseId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            destinationWarehouseId: Number(selectedDestinationWarehouseId),
            dispatchDetails: dispatchDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description
            }))
        };
        try {
            const response = await axios.put(server.baseurl + server.warehouse + "update-between-warehouse-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
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

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setEditingId(selectedRowForMenu.id);
            setDocDate(new Date(selectedRowForMenu.docDate));
            setEditingCode(selectedRowForMenu.code);
            setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
            setSelectedDestinationWarehouseId(Number(selectedRowForMenu.destinationWarehouse?.id));
            if (selectedRowForMenu.driverVehicle) {
                setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
                setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
            }
            const formattedDetails: FormDispatchDetail[] = (selectedRowForMenu.warehouseDispatchDetails || []).map(d => ({
                itemId: Number(d.item?.id),
                quantity: d.quantity,
                description: d.description,
            }));
            setDispatchDetails(formattedDetails);
            setIsFormVisible(true);
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

    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setDispatchIdToDelete(null);
        setDispatchCodeToDelete('');
        fetchInitialData();
    };

    const handleRemoveDispatchDetail = (index: number) => {
        setDispatchDetails(prev => {
            const removedItem = prev[index];
            if (removedItem) {
                setRemovedDispatchDetails(oldRemoved => [...oldRemoved, removedItem]);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleRestoreDispatchDetail = (indexToRestore: number) => {
        const itemToRestore = removedDispatchDetails[indexToRestore];
        if (itemToRestore) {
            setDispatchDetails(prev => [...prev, itemToRestore]);
            setRemovedDispatchDetails(prev => prev.filter((_, i) => i !== indexToRestore));
        }
    };
    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormDispatchDetail, value: any) => {
        setDispatchDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };

            if (field === 'quantity') {
                const numValue = Number(value);
                const selectedDispatchDetails = dispatchesForCombo.find(d => d.id === selectedDispatchId)?.warehouseDispatchDetails;
                const selectedItemDetails = selectedDispatchDetails?.find(item => Number(item.item.id) === Number(updatedDetail.itemId));
                const maxQuantity = selectedItemDetails ? Number(selectedItemDetails.quantity) : Infinity;

                if (numValue < 0) {
                    showAlert('Miktar negatif olamaz!', 'warning');
                    updatedDetail.quantity = 0;
                } else if (numValue > maxQuantity) {
                    showAlert(`Girdiğiniz miktar sevk miktarından fazla! Maksimum: ${maxQuantity}`, 'warning');
                    updatedDetail.quantity = maxQuantity;
                } else {
                    updatedDetail.quantity = value;
                }
            } else {
                (updatedDetail as any)[field] = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [dispatchesForCombo, selectedDispatchId, showAlert]);

    const handleEditVehicleSelection = () => {
        if (vehiclesList.length > 1) {
            setOpenVehicleModal(true);
            setTempSelectedVehicle(selectedVehicle);
        } else {
            showAlert('Bu şoförün tek bir aracı bulunmaktadır.', 'info');
        }
    };

    const paginatedDispatches = useMemo(() => {
        return displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedDispatches, page, rowsPerPage]);

    // ✨ NEW: Generic PDF export function that calculates and displays totals
    const exportDispatchesToPdf = (data: BetweenWarehouseDispatchType[], title: string, _subtitle?: string) => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning');
            return;
        }

        showAlert('PDF oluşturuluyor...', 'info');

        const doc = new jsPDF();
        const docAny = doc as any;
        let yPos = 55; // startY for the first table

        data.forEach((dispatch, index) => {
            if (index > 0) {
                doc.addPage();
                yPos = 55;
            }

            const pageTitle = `${title} - ${dispatch.code}`;
            addPdfHeader(doc, pageTitle);

            // Add dispatch information above the table
            doc.setFontSize(10);
            doc.text(`Kaynak Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
            doc.text(`Hedef Depo: ${dispatch.destinationWarehouse?.name || '-'}`, 15, yPos + 5);
            doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos + 10);
            doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`, 15, yPos + 15);
            doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)})`, 15, yPos + 20);

            yPos += 25;

            const detailsRows = (dispatch.warehouseDispatchDetails || []).map(d => [
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);

            const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const totalQuantity = (dispatch.warehouseDispatchDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);

            autoTable(docAny, {
                startY: yPos,
                head: [columns],
                body: detailsRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: () => {
                    addPdfFooter(doc); // Add footer to each page
                }
            });

            // Get the final Y position after the table to add the total
            const finalY = docAny.lastAutoTable.finalY || yPos;
            doc.setFontSize(10);
            doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);

            yPos = finalY + 10;
        });

        doc.save(`${title.replace(/ /g, '_')}.pdf`);
        showAlert('PDF başarıyla oluşturuldu.', 'success');
    };

    // ✨ NEW: Generic Excel export function that calculates and displays totals
    const exportDispatchesToExcel = (data: BetweenWarehouseDispatchType[], title: string) => {
        if (!data || data.length === 0) {
            showAlert('Excel oluşturulacak sevk belgesi bulunamadı.', 'warning');
            return;
        }
        showAlert('Excel oluşturuluyor...', 'info');
        const workbook = new Excel.Workbook();

        data.forEach(dispatch => {
            // Clean up the name to avoid illegal characters for worksheet titles
            const worksheetTitle = `Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_');
            const worksheet = workbook.addWorksheet(worksheetTitle);

            const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const totalColumns = detailsColumns.length;

            addExcelHeader(worksheet, title, totalColumns);

            // Add dispatch information
            worksheet.addRow([`Sevk Belgesi Kodu:`, dispatch.code]);
            worksheet.addRow([`Kaynak Depo:`, dispatch.warehouse?.name || '-']);
            worksheet.addRow([`Hedef Depo:`, dispatch.destinationWarehouse?.name || '-']);
            worksheet.addRow([`Şoför:`, `${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`]);
            worksheet.addRow([`Araç:`, `${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`]);
            worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);
            worksheet.addRow([]);

            // Add details table
            const headerRow = worksheet.addRow(detailsColumns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            // let startOfDetailsRow = headerRow.number + 1;
            (dispatch.warehouseDispatchDetails || []).forEach(d => {
                worksheet.addRow([
                    d.item?.name || '-',
                    d.quantity,
                    d.item?.unit?.title || '-',
                    d.description || '-'
                ]);
            });

            // Calculate and display total quantity
            const totalQuantity = (dispatch.warehouseDispatchDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
            const totalRow = worksheet.addRow([`Toplam Miktar`, totalQuantity, '', '']);
            totalRow.font = { name: 'NotoSans', bold: true };
            totalRow.getCell(2).numFmt = '0'; // Format total quantity as a number

            worksheet.addRow([]); // Add a blank line for spacing
            addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);
        });

        const fileName = `${title.replace(/ /g, '_')}.xlsx`;
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        });
    };

    // ✨ NEW: Unified download handler for all/filtered data
    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedDispatches : dispatchList;
        const title = isFiltered ? 'Filtrelenmiş Depolar Arası Sevk Raporu' : 'Tüm Depolar Arası Sevk Raporu';
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}` : undefined;

        if (format === 'pdf') {
            exportDispatchesToPdf(dataToDownload, title, subtitle);
        } else {
            exportDispatchesToExcel(dataToDownload, title);
        }
    };

    // ✨ NEW: Unified download handler for a single row
    const handleDownloadSingleDispatch = (format: 'pdf' | 'excel') => {
        if (!selectedDispatchForDownload) return;
        const data = [selectedDispatchForDownload];
        const title = `Sevk Belgesi Detayları:`;

        if (format === 'pdf') {
            exportDispatchesToPdf(data, title);
        } else {
            exportDispatchesToExcel(data, title);
        }
        handleCloseRowDownloadModal();
    };

    // const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    // const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     setRowsPerPage(parseInt(event.target.value, 10));
    //     setPage(0);
    // };
    // const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    //     setSearchTerm(event.target.value);
    //     setPage(0);
    // };
    // const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => {
    //     if (newFilter !== null) {
    //         setStatusFilter(newFilter);
    //         setPage(0);
    //     }
    // };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    // ✨ NEW: Modal Handlers
    // const handleOpenDownloadAllModal = () => { setOpenDownloadAllModal(true); };
    // const handleCloseDownloadAllModal = () => { setOpenDownloadAllModal(false); };
    // const handleOpenDownloadFilteredModal = () => { setOpenDownloadFilteredModal(true); };
    // const handleCloseDownloadFilteredModal = () => { setOpenDownloadFilteredModal(false); };
    const handleOpenRowDownloadModal = (dispatch: BetweenWarehouseDispatchType) => {
        setSelectedDispatchForDownload(dispatch);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleCloseRowDownloadModal = () => {
        setSelectedDispatchForDownload(null);
        setOpenRowDownloadModal(false);
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
                        Depolar Arası Sevk İşlemleri
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Depolar Arası Sevk Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni Depolar Arası Sevk
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
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Depo Sevk Belgesini Düzenle' : 'Yeni Depo Sevk Belgesi'}</Typography>
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
                                        <Chip label={`Seçilen Araç: ${selectedVehicleName}`} color="info" />
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Aracı değiştir" : ""}>
                                            <IconButton onClick={handleEditVehicleSelection} size="small">
                                                <IconEdit size={18} />
                                            </IconButton>
                                        </CustomTooltip>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Hedef Depo</CustomFormLabel>
                                <Autocomplete
                                    id="destination-warehouse-select"
                                    options={warehouses.filter(w => Number(w.id) !== Number(warehouseId))}
                                    getOptionLabel={(option) => option.name}
                                    value={warehouses.find(w => w.id === selectedDestinationWarehouseId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedDestinationWarehouseId(newValue ? newValue.id : null);
                                        if (destinationWarehouseIdError && newValue) setDestinationWarehouseIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Hedef Depo Seçin"
                                            error={destinationWarehouseIdError}
                                            helperText={destinationWarehouseIdError ? "Hedef depo seçimi zorunludur!" : ""}
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
                                <CustomFormLabel required>Sevk Belgesi</CustomFormLabel>
                                <Autocomplete
                                    id="dispatch-select"
                                    options={dispatchesForCombo}
                                    getOptionLabel={(option) => option.code}
                                    value={dispatchesForCombo.find(d => d.id === selectedDispatchId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedDispatchId(newValue ? newValue.id : null);
                                        if (newValue) {
                                            fetchDispatchDetails(newValue.id);
                                        } else {
                                            setDispatchDetails([]);
                                        }
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Sevk Belgesi Seçin"
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
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
                                <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler</Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {removedDispatchDetails.map((detail, index) => (
                                        <Chip
                                            key={index}
                                            label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
                                            color="error"
                                            onDelete={() => handleRestoreDispatchDetail(index)}
                                            deleteIcon={<IconReload size={18} />}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        <Box mt={4}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Sevk Detayları</Typography>
                            </Stack>
                            <Grid container spacing={2}>
                                {dispatchDetails.map((detail, index) => {
                                    const selectedDispatchItem = dispatchesForCombo.find(d => d.id === selectedDispatchId)?.warehouseDispatchDetails.find(item => Number(item.item.id) === Number(detail.itemId));
                                    const maxQuantity = selectedDispatchItem ? Number(selectedDispatchItem.quantity) : 0;
                                    const displayBalance = selectedDispatchItem ? `(Sevk Miktarı: ${maxQuantity})` : '';

                                    return (
                                        <Grid item xs={12} key={index}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                                                    <Typography variant="body1" noWrap sx={{ flexGrow: 1 }}>
                                                        {detail?.item?.name || 'Aradığınız şey bulunamadı.'}
                                                    </Typography>
                                                    {detail?.item?.unit?.title && (
                                                        <Chip label={detail.item.unit.title} color="secondary" variant="outlined" sx={{ ml: 1 }} />
                                                    )}
                                                </Box>
                                                <CustomTextField
                                                    type="number"
                                                    placeholder="Miktar"
                                                    value={detail.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                    fullWidth
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">{displayBalance}</InputAdornment>
                                                    }}
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
                <BlankCard>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2} mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle sevkleri indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)} // ✨ Open the modal
                                    startIcon={<IconFileDownload />}
                                    isBlinking={true}
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
                                onClick={() => setOpenDownloadAllModal(true)} // ✨ Open the modal
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || dispatchList.length === 0}
                            >
                                Tümünü İndir
                            </Button>
                        )}
                    </Stack>
                    <Box sx={{ p: 2 }}>
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
                                            onChange={(newValue) => setStartDate(newValue)}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        />
                                        <DatePicker
                                            label="Bitiş Tarihi"
                                            value={endDate}
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
                            <Typography variant="h6" sx={{ ml: 2 }}>Depolar arası sevk belgeleri yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <TableCell><Typography variant="h6">Kod</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Kaynak Depo</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Hedef Depo</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Şoför</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Araç</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Belge Tarihi</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Sevk Detayları</Typography></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedDispatches.length > 0 ? (
                                        paginatedDispatches.map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{row.warehouse?.name || '-'}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{row.destinationWarehouse?.name || '-'}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{`${row.driver?.name || ''} ${row.driver?.family || ''}`}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{`${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></TableCell>
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
                                                    <Menu anchorEl={anchorEl}
                                                        open={openMenu && selectedRowForMenu?.id === row.id}
                                                        onClose={handleCloseMenu}>
                                                        {hasDownloadPermission && (
                                                            <MenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                                Bu satırı indir
                                                            </MenuItem>
                                                        )}
                                                        {hasEditPermission && <MenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>}
                                                        {hasDeletePermission &&
                                                            <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>}
                                                    </Menu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={9} align="center"><Typography>Hiç sevk belgesi bulunamadı.</Typography></TableCell></TableRow>
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
                            setSelectedVehicleId(selected.id);
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
                                    {/* ✨ NEW: Display total quantity in the details table */}
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Toplam Miktar:</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>
                                            {detailsToShow.reduce((sum, detail) => sum + Number(detail.quantity), 0)}
                                        </TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
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

            <DeleteBetweenwarehouseDispatch
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                dispatchIdToDelete={dispatchIdToDelete}
                dispatchCodeToDelete={dispatchCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />

            {/* ✨ NEW: Modal for all downloads */}
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
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✨ NEW: Modal for filtered downloads */}
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
                    <Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✨ NEW: Modal for single row download */}
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
                    <Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListBetweenWarehouseDispatch;