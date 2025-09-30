// src/views/warehouses/ListBetweenReceipt.tsx

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,

    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Chip, Autocomplete,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconEye, IconX, IconReload
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
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import DeleteBetweenReceipt from "./DeleteBetweenReceipt";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
    // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
    fontSize: '0.8rem', // Varsayılan olarak küçük font
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem', // Masaüstünde daha büyük
    },
}));

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

interface WarehouseType {
    id: string;
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: number;
}

interface BetweenWarehouseDispatchForCombo {
    id: string;
    code: string;
    docDate: string;
    recordStatus: number;
    warehouseDispatchDetails: {
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
    }[];
}

interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: {
        id: string;
        name: string;
        abbreviation: string;
        unit: {
            id: string;
            title: string;
            recordStatus: number;
        };
    };
    originWarehouseDispatchDeatail: {
        id: string;
        quantity: string;
        createAt: string;
        recordStatus: number;
        description: string;
        warehouseDispatchHeaders: {
            id: string;
            code: string;
            docDate: string;
            createAt: string;
            recordStatus: number;
            status: number;
            statusDescription: null | string;
        };
    } | null;
    originWarehouseDispatchDeatailId: number | null;
}

interface BetweenReceiptType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    warehouse: WarehouseType;
    receiptDetails: ReceiptDetailType[];
    status?: string;
}

interface FormReceiptDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    originWarehouseDispatchDeatailId: number | null;
    item?: {
        name: string;
        unit?: {
            title: string;
        };
    };
    originWarehouseDispatchDeatail?: {
        warehouseDispatchHeaders: {
            id: string;
        }
    };
}

interface NewReceiptData {
    docDate: string;
    warehouseId: number;
    receiptDetails: {
        itemId: number;
        quantity: number;
        description: string;
        originWarehouseDispatchDeatailId: number;
    }[];
}

interface EditReceiptData extends NewReceiptData {
    id: number;
    code: string;
}

// === Styling and Helpers ===

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

const BlinkingButtondownload = styled(Button)(() => ({
    animation: `${blinkAnimation} 1s linear infinite`,
}));

// === Main Component ===
const ListBetweenReceipt = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
    const [removedReceiptDetails, setRemovedReceiptDetails] = useState<FormReceiptDetail[]>([]);

    const [receiptList, setReceiptList] = useState<BetweenReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<BetweenReceiptType[]>([]);
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
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<BetweenReceiptType | null>(null);
    // const openMenu = Boolean(anchorEl);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [warehouseIdError, setWarehouseIdError] = useState<boolean>(false);
    const [dispatchIdError, setDispatchIdError] = useState<boolean>(false);

    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [dispatchesForCombo, setDispatchesForCombo] = useState<BetweenWarehouseDispatchForCombo[]>([]);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<string | null>(null);
    const [receiptCodeToDelete, setReceiptCodeToDelete] = useState<string>('');

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [detailsToShow, setDetailsToShow] = useState<ReceiptDetailType[]>([]);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const [openAllDownloadModal, setOpenAllDownloadModal] = useState(false);
    const [openFilteredDownloadModal, setOpenFilteredDownloadModal] = useState(false);
    const [openReceiptDetailsDownloadModal, setOpenReceiptDetailsDownloadModal] = useState(false);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // === Form Handlers and State Updates ===
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    const validateForm = (): boolean => {
        let isValid = true;
        if (!selectedWarehouseId) { setWarehouseIdError(true); isValid = false; } else { setWarehouseIdError(false); }
        if (!selectedDispatchId) { setDispatchIdError(true); isValid = false; } else { setDispatchIdError(false); }
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }
        if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return isValid;
    };

    const resetFormAndState = () => {
        setDocDate(new Date());
        setSelectedWarehouseId(null);
        setSelectedDispatchId(null);
        setReceiptDetails([]);
        setIsFormVisible(false);
        setEditingId(null);
        setEditingCode(null);
        setDocDateError(false);
        setWarehouseIdError(false);
        setDispatchIdError(false);
        setRemovedReceiptDetails([]);
    };

    const handleReceiptDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
        setReceiptDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };

            // Convert value to number for quantity validation
            const numValue = Number(value);

            // Apply validation only to the 'quantity' field
            if (field === 'quantity') {
                // Find the dispatch detail from the original dispatch document
                const dispatchId = selectedDispatchId;
                const selectedDispatch = dispatchesForCombo.find(d => d.id === dispatchId);
                const originalDispatchDetail = selectedDispatch?.warehouseDispatchDetails.find(d => Number(d.id) === updatedDetail.originWarehouseDispatchDeatailId);

                const maxQuantity = originalDispatchDetail ? Number(originalDispatchDetail.quantity) : 0;

                if (numValue < 0 || isNaN(numValue)) {
                    // Prevent negative or invalid values
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updatedDetail.quantity = updatedDetail.quantity; // Keep the old value
                } else if (numValue > maxQuantity) {
                    // Prevent entering a value greater than the dispatch quantity
                    showAlert(`Girdiğiniz miktar sevk belgesindeki miktardan fazla! Maksimum: ${maxQuantity}`, 'warning');
                    updatedDetail.quantity = maxQuantity; // Set the value to the max allowed
                } else {
                    // Value is valid
                    updatedDetail.quantity = numValue;
                }
            } else {
                // For other fields like 'description'
                (updatedDetail as any)[field] = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [showAlert, selectedDispatchId, dispatchesForCombo]);

    const handleRemoveReceiptDetail = (index: number) => {
        setReceiptDetails(prev => {
            const removedItem = prev[index];
            if (removedItem) {
                setRemovedReceiptDetails(oldRemoved => [...oldRemoved, removedItem]);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleRestoreReceiptDetail = (indexToRestore: number) => {
        const itemToRestore = removedReceiptDetails[indexToRestore];
        if (itemToRestore) {
            setReceiptDetails(prev => [...prev, itemToRestore]);
            setRemovedReceiptDetails(prev => prev.filter((_, i) => i !== indexToRestore));
        }
    };

    // === API Calls ===

    const fetchWarehouses = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<ApiResponse<WarehouseType[]>>(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setWarehousesList(response.data.data.filter(w => w.recordStatus === 0));
            } else {
                showAlert(response.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Depolar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert, authToken]);

    const fetchDispatchesForCombo = useCallback(async (warehouseId: string) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<ApiResponse<BetweenWarehouseDispatchForCombo[]>>(server.baseurl + server.warehouse + `get-between-warehouse-dispatches-by-destination-warehouse-id/${warehouseId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setDispatchesForCombo(response.data.data.filter(d => d.recordStatus === 0));
            } else {
                showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, authToken]);

    const fetchDispatchDetails = useCallback(async (dispatchId: string) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<ApiResponse<BetweenWarehouseDispatchForCombo>>
                (server.baseurl + server.warehouse + `get-warehouse-dispatch-by-id/${dispatchId}`, {
                    headers: { "Authorization": `Bearer ${authToken}` }
                });

            if (response.data.httpStatusCode === 200) {
                const details: FormReceiptDetail[] = (response.data.data.warehouseDispatchDetails || []).map(d => ({
                    itemId: Number(d.item.id),
                    quantity: Number(d.quantity),
                    description: d.description,
                    originWarehouseDispatchDeatailId: Number(d.id),
                    item: {
                        name: d.item.name,
                        unit: {
                            title: d.item.unit.title
                        }
                    }
                }));
                setReceiptDetails(details);
            } else {
                showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, authToken]);

    const fetchBetweenReceipts = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<ApiResponse<BetweenReceiptType[]>>
                (server.baseurl + server.warehouse + "get-between-receipts", {
                    headers: { "Authorization": `Bearer ${authToken}` }
                });
            if (response.data.httpStatusCode === 200) {
                const formattedReceipts = response.data.data.map(r => ({
                    ...r,
                    status: r.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setReceiptList(formattedReceipts);
            } else {
                showAlert(response.data.message || 'Fişler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Fişler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert, authToken]);

    useEffect(() => {
        fetchWarehouses();
        fetchBetweenReceipts();
    }, [fetchWarehouses, fetchBetweenReceipts]);

    useEffect(() => {
        const isValid = !!selectedWarehouseId && !!selectedDispatchId && !!docDate && receiptDetails.length > 0 &&
            receiptDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(isValid);
    }, [selectedWarehouseId, selectedDispatchId, docDate, receiptDetails]);

    useEffect(() => {
        const filteredBySearchAndStatus = receiptList.filter(r => {
            const matchesSearch = r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.warehouse?.name && r.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && r.recordStatus === 0) ||
                (statusFilter === 'inactive' && r.recordStatus === 1);
            const matchesDate = (startDate && new Date(r.docDate) < startDate) || (endDate && new Date(r.docDate) > endDate) ? false : true;

            return matchesSearch && matchesStatus && matchesDate;
        });
        setDisplayedReceipts(filteredBySearchAndStatus);
        setPage(0);
    }, [receiptList, searchTerm, statusFilter, startDate, endDate]);

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

    // === API Actions ===
    const insertReceipt = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        const payload: NewReceiptData = {
            docDate: docDate?.toISOString() || new Date().toISOString(),
            warehouseId: Number(selectedWarehouseId),
            receiptDetails: receiptDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description,
                originWarehouseDispatchDeatailId: Number(d.originWarehouseDispatchDeatailId)
            }))
        };
        try {
            const response = await axios.post(server.baseurl + server.warehouse + "create-between-receipt", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni fiş başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchBetweenReceipts();
            } else {
                showAlert(response.data.message || 'Fiş eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Fiş eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editReceipt = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        // Fetch the dispatch details to get the correct original ID
        const selectedDispatch = dispatchesForCombo.find(d => d.id === selectedDispatchId);
        if (!selectedDispatch) {
            showAlert('Geçerli bir sevk belgesi bulunamadı.', 'error');
            setLoadingButton(false);
            return;
        }

        const payload: EditReceiptData = {
            id: Number(editingId),
            code: editingCode!,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            warehouseId: Number(selectedWarehouseId),
            receiptDetails: receiptDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description,
                originWarehouseDispatchDeatailId: Number(d.originWarehouseDispatchDeatailId)
            }))
        };
        try {
            const response = await axios.put(server.baseurl + server.warehouse + "update-between-receipt", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 200) {
                showAlert('Fiş başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchBetweenReceipts();
            } else {
                showAlert(response.data.message || 'Fiş güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Fiş güncellenirken bir hata oluştu.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };


    // === UI Handlers ===
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    // const handleEditClick = async () => {
    //     if (selectedRowForMenu) {
    //         setEditingId(selectedRowForMenu.id);
    //         setEditingCode(selectedRowForMenu.code);
    //         setDocDate(new Date(selectedRowForMenu.docDate));
    //         setSelectedWarehouseId(selectedRowForMenu.warehouse.id);

    //         await fetchDispatchesForCombo(selectedRowForMenu.warehouse.id);

    //         // const originDispatchDetailId = selectedRowForMenu.receiptDetails?.[0]?.originWarehouseDispatchDeatailId?.toString();
    //         // if (originDispatchDetailId) {
    //         //     setSelectedDispatchId(originDispatchDetailId);
    //         // }
    //         const originDispatchDetailId = selectedRowForMenu.receiptDetails?.[0]?.originWarehouseDispatchDeatailId?.toString();
    //         if (originDispatchDetailId) {
    //             // 1. fetch dispatch details
    //             await fetchDispatchDetails(originDispatchDetailId);
    //             // 2. then set the dispatch ID
    //             setSelectedDispatchId(originDispatchDetailId);
    //         }

    //         // const formattedDetails: FormReceiptDetail[] = (selectedRowForMenu.receiptDetails || []).map(d => ({
    //         //     itemId: Number(d.item.id),
    //         //     quantity: d.quantity,
    //         //     description: d.description,
    //         //     originWarehouseDispatchDeatailId: d.originWarehouseDispatchDeatailId,
    //         //     item: {
    //         //         name: d.item.name,
    //         //         unit: {
    //         //             title: d.item.unit?.title || ''
    //         //         }
    //         //     }
    //         // }));
    //         const formattedDetails: FormReceiptDetail[] = (selectedRowForMenu.receiptDetails || []).map(d => ({
    //             itemId: Number(d.item.id),
    //             quantity: d.quantity,
    //             description: d.description,
    //             originWarehouseDispatchDeatailId: d.originWarehouseDispatchDeatailId,
    //             item: {
    //                 name: d.item.name,
    //                 unit: {
    //                     title: d.item.unit?.title || ''
    //                 }
    //             }
    //         }));
    //         setReceiptDetails(formattedDetails);

    //         setIsFormVisible(true);
    //         handleCloseMenu();
    //     }
    // };

    const handleEditClick = useCallback(async () => {
        if (!selectedRowForMenu) return;

        // Set the state for editing
        setEditingId(selectedRowForMenu.id);
        setEditingCode(selectedRowForMenu.code);
        setDocDate(new Date(selectedRowForMenu.docDate));
        setSelectedWarehouseId(selectedRowForMenu.warehouse.id);
        setIsFormVisible(true);
        handleCloseMenu();

        // Asynchronously fetch dispatch list based on the selected warehouse
        await fetchDispatchesForCombo(selectedRowForMenu.warehouse.id);

        // After the dispatch list is loaded, find the dispatch detail
        const originDispatchDetail = selectedRowForMenu.receiptDetails?.[0]?.originWarehouseDispatchDeatail;

        // Now that the dispatchesForCombo state is populated, we can safely set the selected ID
        if (originDispatchDetail?.warehouseDispatchHeaders?.id) {
            setSelectedDispatchId(originDispatchDetail.warehouseDispatchHeaders.id);
        }

        // Now, format the receipt details for the form
        const formattedDetails = (selectedRowForMenu.receiptDetails || []).map(d => ({
            itemId: Number(d.item.id),
            quantity: d.quantity,
            description: d.description,
            originWarehouseDispatchDeatailId: Number(d.originWarehouseDispatchDeatailId),
            item: {
                name: d.item.name,
                unit: {
                    title: d.item.unit?.title || ''
                }
            }
        }));
        setReceiptDetails(formattedDetails);

    }, [selectedRowForMenu, fetchDispatchesForCombo, handleCloseMenu]);


    const handleCancelEdit = () => {
        resetFormAndState();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setReceiptIdToDelete(selectedRowForMenu.id);
            setReceiptCodeToDelete(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setReceiptIdToDelete(null);
        setReceiptCodeToDelete('');
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    // === PDF/Excel Helpers ===
    const getDocFonts = (doc: jsPDF) => {
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
    };

    const getPdfHeader = (doc: jsPDF, title: string, isFiltered: boolean = false) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const startY = 15;
        const logoImg = new Image();
        logoImg.src = Logo;
        doc.addImage(logoImg, 'PNG', pageWidth - 60, startY, 50, 25);
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, startY + 1, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, 15, startY + 25, { align: 'left' });
        if (isFiltered) {
            let filterInfo = '';
            if (searchTerm) filterInfo += `Arama: ${searchTerm} | `;
            if (startDate || endDate) {
                const startStr = startDate ? format(startDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                const endStr = endDate ? format(endDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                filterInfo += `Tarih Aralığı: ${startStr} - ${endStr}`;
            }
            if (filterInfo) {
                doc.setFontSize(9);
                doc.text(filterInfo, pageWidth / 2, startY + 30, { align: 'center' });
            }
        }
        return isFiltered ? startY + 45 : startY + 35;
    };

    const getPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const docAny = doc as any;

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0);
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

        const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
        const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        doc.setFont('NotoSans', 'normal');
        doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    };

    const getExcelStyles = () => {
        const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
        const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
        const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
        const headerFont = { ...font, bold: true };
        const centerAlignment = { vertical: 'middle', horizontal: 'center' as const, wrapText: true };
        const leftAlignment = { vertical: 'middle', horizontal: 'left' as const, wrapText: true };
        const fullHeaderStyle = { border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>;
        const bodyStyle = { border, alignment: leftAlignment, font } as Partial<Excel.Style>;
        return { fullHeaderStyle, bodyStyle, thinBorder, border, headerFill, font, headerFont, centerAlignment, leftAlignment };
    };

    const addCompanyInfoToExcel = (ws: Excel.Worksheet, columnCount: number) => {
        ws.addRow([]);
        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
        ];
        const mergeRangeEndColumn = String.fromCharCode(65 + columnCount - 1);
        companyInfo.forEach(line => {
            const row = ws.addRow([line]);
            row.getCell(1).alignment = { horizontal: 'center' as const };
            row.getCell(1).font = { name: 'Arial', size: 8, bold: false };
            ws.mergeCells(`A${row.number}:${mergeRangeEndColumn}${row.number}`);
        });
    };

    const calculateTotalQuantity = (items: ReceiptDetailType[]): { [unit: string]: number } => {
        const totals: { [unit: string]: number } = {};
        items.forEach(item => {
            const unit = item.item?.unit?.title || 'Bilinmiyor';
            const quantity = Number(item.quantity) || 0;
            totals[unit] = (totals[unit] || 0) + quantity;
        });
        return totals;
    };


    // === PDF/Excel Download Functions ===

    const handleDownloadAllOrFilteredPDF = useCallback((data: BetweenReceiptType[], isFiltered: boolean) => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        getDocFonts(doc);

        data.forEach((receipt, index) => {
            if (index > 0) doc.addPage();
            let yPos = getPdfHeader(doc, isFiltered ? 'Filtrelenmiş Depolar Arası Fişler Raporu' : 'Tüm Depolar Arası Fişler Raporu', isFiltered) + 10;

            doc.setFontSize(12);
            doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos);
            yPos += 7;
            doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
            yPos += 7;
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos);
            yPos += 15;

            const detailsRows = (receipt.receiptDetails || []).map(d => [
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);
            const totals = calculateTotalQuantity(receipt.receiptDetails || []);
            const totalRows = Object.entries(totals).map(([unit, total]) => [
                { content: 'Toplam:', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
                total,
                unit,
                ''
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
                body: detailsRows,
                foot: totalRows as any,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
                didDrawPage: () => { getPdfHeader(doc, isFiltered ? 'Filtrelenmiş Depolar Arası Fişler Raporu' : 'Tüm Depolar Arası Fişler Raporu', isFiltered); getPdfFooter(doc); },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });
        });

        const fileNamePrefix = isFiltered ? 'Filtrelenmis_Depolar_Arasi_Fisler' : 'Tum_Depolar_Arasi_Fisler';
        doc.save(`${fileNamePrefix}.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    }, [showAlert, searchTerm, startDate, endDate]);

    const handleDownloadSingleReceiptPDF = useCallback((receipt: BetweenReceiptType) => {
        if (!receipt) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        getDocFonts(doc);
        let yPos = getPdfHeader(doc, `Fiş Raporu: ${receipt.code}`) + 10;

        doc.setFontSize(12);
        doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos);
        yPos += 7;
        doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
        yPos += 7;
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos);
        yPos += 15;

        const detailsRows = (receipt.receiptDetails || []).map(d => [
            d.item?.name || '-',
            d.quantity,
            d.item?.unit?.title || '-',
            d.description || '-'
        ]);
        const totals = calculateTotalQuantity(receipt.receiptDetails || []);
        const totalRows = Object.entries(totals).map(([unit, total]) => [
            { content: 'Toplam:', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
            total,
            unit,
            ''
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
            body: detailsRows,
            foot: totalRows as any,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
            didDrawPage: () => { getPdfHeader(doc, `Fiş Raporu: ${receipt.code}`); getPdfFooter(doc); },
            showHead: 'everyPage',
            margin: { top: 50, bottom: 20 }
        });

        doc.save(`Fis_${receipt.code}.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    }, [showAlert]);

    const handleDownloadAllOrFilteredExcel = useCallback(async (data: BetweenReceiptType[], isFiltered: boolean) => {
        showAlert('Excel dosyası oluşturuluyor...', 'info');
        if (!data || data.length === 0) {
            showAlert('Dışa aktarılacak fiş bulunamadı.', 'warning');
            return;
        }
        try {
            const { fullHeaderStyle, bodyStyle } = getExcelStyles();
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Fiş Raporu', { views: [{ rightToLeft: false }] });
            const titleText = isFiltered ? 'Filtrelenmiş Depolar Arası Fiş Raporu' : 'Tüm Depolar Arası Fiş Raporu';
            worksheet.addRow([titleText]).eachCell(c => {
                c.font = { name: 'Times New Roman', size: 12, bold: true };
                c.alignment = { horizontal: 'center' as const };
            });
            worksheet.mergeCells('A1:B1');
            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells('A2:B2');
            worksheet.addRow([]);

            const itemHeaders = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const columnCount = itemHeaders.length;

            data.forEach((receipt, index) => {
                if (index > 0) worksheet.addRow([]);

                const receiptInfoRow = worksheet.addRow([`Fiş Kodu: ${receipt.code || '-'}`, `Depo: ${receipt.warehouse?.name || '-'}`, `Tarih: ${formatDateDisplay(receipt.docDate)}`]);
                receiptInfoRow.eachCell(c => Object.assign(c.style, bodyStyle));

                worksheet.addRow([]);
                const itemHeaderRow = worksheet.addRow(itemHeaders);
                itemHeaderRow.eachCell(c => Object.assign(c.style, fullHeaderStyle));

                receipt.receiptDetails.forEach(item => {
                    worksheet.addRow([
                        item.item.name || '-',
                        item.quantity,
                        item.item.unit?.title || '-',
                        item.description
                    ]).eachCell(c => Object.assign(c.style, bodyStyle));
                });

                const totals = calculateTotalQuantity(receipt.receiptDetails);
                Object.entries(totals).forEach(([unit, total]) => {
                    const totalRow = worksheet.addRow([]);
                    totalRow.getCell(2).value = 'Toplam:';
                    totalRow.getCell(2).style = { ...bodyStyle, font: { ...bodyStyle.font, bold: true }, alignment: { ...bodyStyle.alignment, horizontal: 'right' as const } };
                    totalRow.getCell(3).value = total;
                    totalRow.getCell(3).style = bodyStyle;
                    totalRow.getCell(4).value = unit;
                    totalRow.getCell(4).style = bodyStyle;
                    worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);
                });
            });

            addCompanyInfoToExcel(worksheet, columnCount);
            if (worksheet.columns) {
                worksheet.columns.forEach(column => {
                    let maxLength = 0;
                    if (column && column.eachCell) {
                        column.eachCell({ includeEmpty: true }, cell => {
                            const columnLength = cell.value ? cell.value.toString().length : 10;
                            if (columnLength > maxLength) maxLength = columnLength;
                        });
                    }
                    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const fileNamePrefix = isFiltered ? 'Filtrelenmis_Depolar_Arasi_Fisler' : 'Tum_Depolar_Arasi_Fisler';
            saveAs(new Blob([buffer]), `${fileNamePrefix}_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error("Excel oluşturulurken hata:", error);
            showAlert('Excel oluşturulurken bir hata oluştu.', 'error');
        }
    }, [showAlert, searchTerm, startDate, endDate]);

    const handleDownloadSingleReceiptExcel = useCallback(async (receipt: BetweenReceiptType) => {
        showAlert('Fiş detayları Excel oluşturuluyor...', 'info');
        if (!receipt) {
            showAlert('Excel oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }
        try {
            const { fullHeaderStyle, bodyStyle } = getExcelStyles();
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet('Fiş Detayları', { views: [{ rightToLeft: false }] });

            const titleRow = worksheet.addRow([`Fiş Detay Raporu - ${receipt.code}`]);
            titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
            titleRow.getCell(1).alignment = { horizontal: 'center' as const };
            worksheet.mergeCells('A1:B1');
            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.mergeCells('A2:B2');
            worksheet.addRow([]);

            const infoHeaders = ['Fiş Kodu', 'Depo', 'Tarih'];
            const infoData = [receipt.code || '-', receipt.warehouse?.name || '-', formatDateDisplay(receipt.docDate)];
            infoHeaders.forEach((header, index) => {
                worksheet.addRow([header, infoData[index]]).eachCell(c => Object.assign(c.style, bodyStyle));
            });
            worksheet.addRow([]);

            const itemHeaders = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const columnCount = itemHeaders.length;

            if (receipt.receiptDetails.length > 0) {
                const itemHeaderRow = worksheet.addRow(itemHeaders);
                itemHeaderRow.eachCell(c => Object.assign(c.style, fullHeaderStyle));

                receipt.receiptDetails.forEach(item => {
                    worksheet.addRow([
                        item.item.name || '-',
                        item.quantity,
                        item.item.unit?.title || '-',
                        item.description
                    ]).eachCell(c => Object.assign(c.style, bodyStyle));
                });
                const totals = calculateTotalQuantity(receipt.receiptDetails);
                Object.entries(totals).forEach(([unit, total]) => {
                    const totalRow = worksheet.addRow([]);
                    totalRow.getCell(2).value = 'Toplam:';
                    totalRow.getCell(2).style = { ...bodyStyle, font: { ...bodyStyle.font, bold: true }, alignment: { ...bodyStyle.alignment, horizontal: 'right' as const } };
                    totalRow.getCell(3).value = total;
                    totalRow.getCell(3).style = bodyStyle;
                    totalRow.getCell(4).value = unit;
                    totalRow.getCell(4).style = bodyStyle;
                    worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);
                });
            } else {
                worksheet.addRow(['Bu fişe ait ürün bilgisi bulunamadı.']).eachCell(c => Object.assign(c.style, bodyStyle));
            }

            addCompanyInfoToExcel(worksheet, columnCount);
            if (worksheet.columns) {
                worksheet.columns.forEach(column => {
                    let maxLength = 0;
                    if (column && column.eachCell) {
                        column.eachCell({ includeEmpty: true }, cell => {
                            const columnLength = cell.value ? cell.value.toString().length : 10;
                            if (columnLength > maxLength) maxLength = columnLength;
                        });
                    }
                    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Fiş_Detay_${receipt.code}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error: any) {
            console.error("Excel oluşturulurken hata:", error);
            showAlert('Excel oluşturulurken bir hata oluştu.', 'error');
        }
    }, [showAlert]);

    // === Modal Handlers ===
    const handleDownloadAllClicked = () => {
        setOpenAllDownloadModal(true);
    };

    const handleDownloadFilteredClicked = () => {
        setOpenFilteredDownloadModal(true);
    };

    const handleDownloadSingleReceiptClicked = (receipt: BetweenReceiptType) => {
        setSelectedRowForMenu(receipt);
        setOpenReceiptDetailsDownloadModal(true);
    };

    return (
        <>
            <Box sx={{ p: 1 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    mb={3}
                    spacing={2}
                    flexWrap="wrap"
                >
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>Depolar Arası Fişler</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Depolar Arası Fişler Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    isBlinking={isBlinking}
                                    onClick={() => setIsFormVisible(true)}
                                    fullWidth={false}
                                >
                                    Yeni Depolar Arası Fişleri Kaydet
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
                    </Stack>
                </Stack>
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Depolar Arası Fiş Düzenle' : 'Yeni Depolar Arası Fiş'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel required>Depo</CustomFormLabel>
                                <Autocomplete
                                    id="warehouse-select"
                                    options={warehousesList}
                                    getOptionLabel={(option) => option.name}
                                    value={warehousesList.find(w => w.id === selectedWarehouseId) || null}
                                    onChange={(_, newValue) => {
                                        setSelectedWarehouseId(newValue ? newValue.id : null);
                                        setSelectedDispatchId(null);
                                        setDispatchesForCombo([]);
                                        setReceiptDetails([]);
                                        if (newValue) {
                                            fetchDispatchesForCombo(newValue.id);
                                        }
                                        if (warehouseIdError && newValue) setWarehouseIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Depo Seçin"
                                            error={warehouseIdError}
                                            helperText={warehouseIdError ? "Depo seçimi zorunludur!" : ""}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel required>Depolar Arası Sevk</CustomFormLabel>
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
                                            setReceiptDetails([]);
                                        }
                                        if (dispatchIdError && newValue) setDispatchIdError(false);
                                    }}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            fullWidth
                                            size="small"
                                            placeholder="Depolar Arası Sevk Seçin"
                                            error={dispatchIdError}
                                            helperText={dispatchIdError ? "Sevk belgesi seçimi zorunludur!" : ""}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
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
                        <Box mt={4}>
                            <Typography variant="h6">Fiş Detayları</Typography>

                            {removedReceiptDetails.length > 0 && (
                                <Box sx={{
                                    border: '1px dashed',
                                    borderColor: "error.main",
                                    p: 2,
                                    mt: 2,
                                    borderRadius: 1,
                                    backgroundColor: 'rgba(255, 0, 0, 0.05)'
                                }}>
                                    <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {removedReceiptDetails.map((detail, index) => (
                                            <Chip
                                                key={index}
                                                label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
                                                color="error"
                                                onDelete={() => handleRestoreReceiptDetail(index)}
                                                deleteIcon={<IconReload size={18} />}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                            <Grid container spacing={2} mt={2}>
                                {receiptDetails.length > 0 ? (
                                    receiptDetails.map((detail, index) => {
                                        const displayItemName = detail.item?.name || 'Item not found';
                                        const displayUnitTitle = detail.item?.unit?.title || '';
                                        return (
                                            <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 2 }}>
                                                {/* Item Name and Unit */}
                                                <Grid item xs={12} sm={4}>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="body1" noWrap>{displayItemName}</Typography>
                                                        <Chip label={displayUnitTitle} color="secondary" size="small" />
                                                    </Stack>
                                                </Grid>

                                                {/* Quantity Input */}
                                                <Grid item xs={12} sm={3}>
                                                    <CustomTextField
                                                        type="number"
                                                        placeholder="Miktar"
                                                        value={detail.quantity}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'quantity', e.target.value)}
                                                        fullWidth
                                                    />
                                                </Grid>

                                                {/* Description Input */}
                                                <Grid item xs={12} sm={4}>
                                                    <CustomTextField
                                                        placeholder="Açıklama"
                                                        value={detail.description}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'description', e.target.value)}
                                                        fullWidth
                                                    />
                                                </Grid>

                                                {/* Delete Button */}
                                                <Grid item xs={12} sm={1}>
                                                    <IconButton color="error" onClick={() => handleRemoveReceiptDetail(index)}>
                                                        <IconTrash />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
                                        );
                                    })
                                ) : (
                                    <Grid item xs={12}>
                                        {/* <Typography color="error" sx={{ mt: 1.5, ml: 1.5 }}>Lütfen bir sevk belgesi seçerek detayları doldurun.</Typography> */}
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                            {editingId ? (
                                <>
                                    <Button variant="contained" color="info" onClick={editReceipt} disabled={loadingButton}>
                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
                                </>
                            ) : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak fişi kaydedin." : ""}>
                                        <span>
                                            <BlinkingButton
                                                variant="contained"
                                                color="success"
                                                onClick={insertReceipt}
                                                disabled={!isFormValid || loadingButton}
                                                isBlinking={isFormValid && !loadingButton}
                                            >
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Fiş Ekle'}
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
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle fişleri indirin" : ""}>
                                <BlinkingButtondownload
                                    variant="outlined" color="primary" startIcon={<IconFileDownload />}
                                    onClick={handleDownloadFilteredClicked}
                                    disabled={loadingData || displayedReceipts.length === 0}
                                >
                                    Filtrelenmiş İndir
                                </BlinkingButtondownload>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <Button
                                variant="contained" color="primary" startIcon={<IconFileDownload />}
                                onClick={handleDownloadAllClicked}
                                disabled={loadingData || receiptList.length === 0}
                            >
                                Tümünü İndir
                            </Button>
                        )}
                    </Stack>
                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="Fiş Ara"
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
                            <Typography variant="h6" sx={{ ml: 2 }}>Depolar arası fişler yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table aria-label="receipt table">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Depo</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Fiş Detayları</Typography></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedReceipts.length > 0 ? (
                                        displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                            <TableRow key={row.id}>
                                                <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.warehouse?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                                <StyledTableCell>
                                                    <Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} />
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                            <Button
                                                                variant="outlined"
                                                                startIcon={<IconEye />}
                                                                onClick={() => {
                                                                    setDetailsToShow(row.receiptDetails || []);
                                                                    setOpenDetailsModal(true);
                                                                }}
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
                                                            <MuiMenuItem onClick={() => { handleCloseMenu(); handleDownloadSingleReceiptClicked(selectedRowForMenu!); }}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                                Bu satırı indir
                                                            </MuiMenuItem>
                                                        )}
                                                        {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                        {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}
                                                    </Menu>
                                                </StyledTableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={6} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">
                                                    Hiç fiş bulunamadı.
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
                        count={displayedReceipts.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage="Satır başına:"
                    />
                </BlankCard>
            </Box>
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Fiş Detayları</DialogTitle>
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
                                    {detailsToShow.length > 0 ? (
                                        detailsToShow.map((detail, index) => (
                                            <TableRow key={detail.id || index}>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.quantity || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={4} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">
                                                    Hiç detay bulunamadı.
                                                </Typography>
                                            </StyledTableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Bu fiş için detay bulunamadı.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>
            <DeleteBetweenReceipt
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchBetweenReceipts()}
                showAlert={showAlert}
            />

            {/* All Receipts Download Modal */}
            <Dialog open={openAllDownloadModal} onClose={() => setOpenAllDownloadModal(false)}>
                <DialogTitle>Tüm Fişler İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button
                            variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredPDF(receiptList, false);
                                setOpenAllDownloadModal(false);
                            }}
                        >
                            Tüm Fişler Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredExcel(receiptList, false);
                                setOpenAllDownloadModal(false);
                            }}
                        >
                            Tüm Fişler Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAllDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>

            {/* Filtered Receipts Download Modal */}
            <Dialog open={openFilteredDownloadModal} onClose={() => setOpenFilteredDownloadModal(false)}>
                <DialogTitle>Filtrelenmiş Fişler İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button
                            variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredPDF(displayedReceipts, true);
                                setOpenFilteredDownloadModal(false);
                            }}
                        >
                            Filtrelenmiş Fişler Raporu (PDF)
                        </Button>
                        <Button
                            variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => {
                                handleDownloadAllOrFilteredExcel(displayedReceipts, true);
                                setOpenFilteredDownloadModal(false);
                            }}
                        >
                            Filtrelenmiş Fişler Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenFilteredDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>

            {/* Single Receipt Details Download Modal */}
            <Dialog open={openReceiptDetailsDownloadModal} onClose={() => setOpenReceiptDetailsDownloadModal(false)}>
                <DialogTitle>Detaylı Fiş Raporu İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button
                            variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => {
                                if (selectedRowForMenu) {
                                    handleDownloadSingleReceiptPDF(selectedRowForMenu);
                                    setOpenReceiptDetailsDownloadModal(false);
                                }
                            }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => {
                                if (selectedRowForMenu) {
                                    handleDownloadSingleReceiptExcel(selectedRowForMenu);
                                    setOpenReceiptDetailsDownloadModal(false);
                                }
                            }}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReceiptDetailsDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListBetweenReceipt;