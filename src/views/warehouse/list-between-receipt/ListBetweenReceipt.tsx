// src/views/warehouses/ListBetweenReceipt.tsx

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Chip, Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconArrowRight, IconEye, IconX, IconReload
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
import DeleteBetweenReceipt from "./DeleteBetweenReceipt";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// === Type Definitions ===

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
    // این ویژگی جدید را اضافه کنید
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
    originWarehouseDispatchDeatailId: number | null; // این رو هم نگه دارید
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
    const openMenu = Boolean(anchorEl);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [warehouseIdError, setWarehouseIdError] = useState<boolean>(false);
    const [dispatchIdError, setDispatchIdError] = useState<boolean>(false);
    // const [receiptDetailsError, setReceiptDetailsError] = useState<boolean>(false);

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
        // if (receiptDetails.length === 0 || receiptDetails.some(d => !d.itemId || !d.quantity)) {
        //     setReceiptDetailsError(true); isValid = false;
        // } else {
        //     setReceiptDetailsError(false);
        // }
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
        // setReceiptDetailsError(false);
        setRemovedReceiptDetails([]);
    };

    const handleReceiptDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
        setReceiptDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };
            (updatedDetail as any)[field] = value;
            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, []);

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

    // const fetchDispatchesForCombo = useCallback(async (warehouseId: string) => {
    //     if (!authToken) { navigate("/"); return; }
    //     try {
    //         const response = await axios.get<ApiResponse<BetweenWarehouseDispatchForCombo[]>>(server.baseurl + server.warehouse + `get-between-warehouse-dispatches-by-destination-warehouse-id/${warehouseId}`, {
    //             headers: { "Authorization": `Bearer ${authToken}` }
    //         });
    //         if (response.data.httpStatusCode === 200) {
    //             setDispatchesForCombo(response.data.data.filter(d => d.recordStatus === 0));
    //         } else {
    //             showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
    //         }
    //     } catch (e: any) {
    //         showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
    //     }
    // }, [navigate, showAlert, authToken]);

    const fetchDispatchesForCombo = useCallback(async (warehouseId: string) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<ApiResponse<BetweenWarehouseDispatchForCombo[]>>(server.baseurl + server.warehouse + `get-between-warehouse-dispatches-by-destination-warehouse-id/${warehouseId}`, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                // 👇 این بخش را تغییر دهید تا از id جزئیات استفاده شود
                const formattedDispatches = response.data.data
                    .filter(d => d.recordStatus === 0)
                    .map(d => ({
                        ...d,
                        // id اصلی را به id جزئیات تغییر دهید
                        id: d.warehouseDispatchDetails?.[0]?.id || d.id
                    }));
                setDispatchesForCombo(formattedDispatches);
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
            const response = await axios.get<ApiResponse<BetweenWarehouseDispatchForCombo>>(server.baseurl + server.warehouse + `get-warehouse-dispatch-by-id/${dispatchId}`, {
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
            const response = await axios.get<ApiResponse<BetweenReceiptType[]>>(server.baseurl + server.warehouse + "get-between-receipts", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                debugger
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
        const originDispatchDetailsId = selectedDispatchId
            ? Number(selectedDispatchId)
            : null;

        if (!originDispatchDetailsId) {
            showAlert('Lütfen geçerli bir sevk belgesi seçin.', 'error');
            setLoadingButton(false);
            return;
        }
        debugger
        const payload: EditReceiptData = {
            id: Number(editingId),
            code: editingCode!,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            warehouseId: Number(selectedWarehouseId),
            receiptDetails: receiptDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description,
                // Use the dispatch ID from the selected combo box item
                originWarehouseDispatchDeatailId: originDispatchDetailsId
            }))
        };
        debugger
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
            showAlert(e.response?.data?.message || 'Fiş güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    // === UI Handlers ===
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = async () => {
        if (selectedRowForMenu) {
            setEditingId(selectedRowForMenu.id);
            setEditingCode(selectedRowForMenu.code);
            setDocDate(new Date(selectedRowForMenu.docDate));

            const selectedWarehouse = selectedRowForMenu.warehouse;
            setSelectedWarehouseId(selectedWarehouse.id);

            // Fetch the dispatches for the selected warehouse to populate the combo box
            await fetchDispatchesForCombo(selectedWarehouse.id);

            const originDispatchDetailId = selectedRowForMenu.receiptDetails?.[0]?.originWarehouseDispatchDeatail?.id;

            if (originDispatchDetailId) {
                setSelectedDispatchId(originDispatchDetailId);
            }

            // Use the existing receipt details for the form table
            const formattedDetails: FormReceiptDetail[] = (selectedRowForMenu.receiptDetails || []).map(d => ({
                itemId: Number(d.item.id),
                quantity: d.quantity,
                description: d.description,
                originWarehouseDispatchDeatailId: d.originWarehouseDispatchDeatailId,
                item: {
                    name: d.item.name,
                    unit: {
                        title: d.item.unit?.title || ''
                    }
                }
            }));
            setReceiptDetails(formattedDetails);

            setIsFormVisible(true);
            handleCloseMenu();
        }
    };

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

    // === PDF Generation ===
    const handleDownloadAllReceiptsPDF = useCallback(() => {
        if (!receiptList || receiptList.length === 0) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 50;

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Tüm Depolar Arası Fişler Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
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

        receiptList.forEach((receipt) => {
            if (yPos + 50 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                yPos = 50;
            }
            // Add a title for each receipt entry in the PDF
            doc.setFontSize(14);
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

            autoTable(doc, {
                startY: yPos,
                head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
                body: detailsRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                pageBreak: 'auto',
                didDrawCell: (data: any) => { if (data.cell.section === 'body') yPos = (data.cell.y + data.cell.height); },
                didDrawPage: () => { header(); footer(); },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });
            yPos += 15; // Spacer for the next receipt
        });

        doc.save('Tum_Depolar_Arasi_Fisler.pdf');
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    }, [receiptList, showAlert]);

    const handleDownloadFilteredReceiptsPDF = useCallback(() => {
        if (!displayedReceipts || displayedReceipts.length === 0) {
            showAlert('Filtrelenmiş fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 50;

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Filtrelenmiş Depolar Arası Fişler Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}`, pageWidth - 15, 40, { align: 'right' });
            doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 47, { align: 'right' });
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

        displayedReceipts.forEach((receipt) => {
            if (yPos + 50 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                yPos = 50;
            }

            doc.setFontSize(14);
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

            autoTable(doc, {
                startY: yPos,
                head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
                body: detailsRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                pageBreak: 'auto',
                didDrawCell: (data: any) => { if (data.cell.section === 'body') yPos = (data.cell.y + data.cell.height); },
                didDrawPage: () => { header(); footer(); },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });
            yPos += 15;
        });

        doc.save('Filtrelenmis_Depolar_Arasi_Fisler.pdf');
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    }, [displayedReceipts, showAlert, startDate, endDate]);

    const handleDownloadSingleReceiptPDF = useCallback((receipt: BetweenReceiptType) => {
        if (!receipt) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 50;

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text(`Fiş Raporu: ${receipt.code}`, pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
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

        header();
        footer();

        doc.setFontSize(14);
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

        autoTable(doc, {
            startY: yPos,
            head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
            body: detailsRows,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            pageBreak: 'auto',
            didDrawPage: () => { header(); footer(); },
            showHead: 'everyPage',
            margin: { top: 50, bottom: 20 }
        });

        doc.save(`Fis_${receipt.code}.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    }, [showAlert]);

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
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                        Depolar Arası Fişler
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Depolar Arası Fişler Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButtondownload
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    fullWidth={false} // در حالت موبایل بهتر است fullWidth نباشد
                                >
                                    Yeni Depolar Arası Fişler
                                </BlinkingButtondownload>
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
                                    // onChange={(_, newValue) => {
                                    //     setSelectedDispatchId(newValue ? newValue.id : null);
                                    //     if (newValue) {
                                    //         fetchDispatchDetails(newValue.id);
                                    //     } else {
                                    //         setReceiptDetails([]);
                                    //     }
                                    //     if (dispatchIdError && newValue) setDispatchIdError(false);
                                    // }}
                                    onChange={(_, newValue) => {
                                        const dispatchDetailId = newValue?.warehouseDispatchDetails?.[0]?.id || null;
                                        setSelectedDispatchId(dispatchDetailId);
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
                            <Grid container spacing={2}>
                                {receiptDetails.length > 0 ? (
                                    receiptDetails.map((detail, index) => {
                                        const displayItemName = detail.item?.name || 'Item not found';
                                        const displayUnitTitle = detail.item?.unit?.title || '';
                                        return (
                                            <Grid item xs={12} key={index}>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="body1" noWrap>{displayItemName}</Typography>
                                                        {displayUnitTitle && <Chip label={displayUnitTitle} color="secondary" variant="outlined" sx={{ ml: 1 }} />}
                                                    </Box>
                                                    <CustomTextField
                                                        type="number"
                                                        placeholder="Miktar"
                                                        value={detail.quantity}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'quantity', e.target.value)}
                                                        fullWidth
                                                    />
                                                    <CustomTextField placeholder="Açıklama" value={detail.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'description', e.target.value)} fullWidth />
                                                    <IconButton color="error" onClick={() => handleRemoveReceiptDetail(index)}><IconTrash /></IconButton>
                                                </Stack>
                                            </Grid>
                                        );
                                    })
                                ) : (
                                    <Grid item xs={12}>
                                        <Typography color="error" sx={{ mt: 1.5, ml: 1.5 }}>Lütfen bir sevk belgesi seçerek detayları doldurun.</Typography>
                                    </Grid>
                                )}
                            </Grid>
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
                                    variant="outlined"
                                    color="primary"
                                    onClick={handleDownloadFilteredReceiptsPDF}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData || displayedReceipts.length === 0}
                                >
                                    Filtrelenmiş İndir (PDF)
                                </BlinkingButtondownload>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleDownloadAllReceiptsPDF}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || receiptList.length === 0}
                            >
                                Tümünü İndir (PDF)
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
                            <Table>
                                <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <TableCell><Typography variant="h6">Kod</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Depo</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Belge Tarihi</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Fiş Detayları</Typography></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedReceipts.length > 0 ? (
                                        displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{row.warehouse?.name || '-'}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
                                                <TableCell>
                                                    <Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} />
                                                </TableCell>
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                            <Button variant="outlined" startIcon={<IconEye />}
                                                                onClick={() => {
                                                                    setDetailsToShow(row.receiptDetails || []);
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
                                                            <MenuItem onClick={() => {
                                                                handleDownloadSingleReceiptPDF(selectedRowForMenu!);
                                                                handleCloseMenu();
                                                            }}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                                Bu satırı indir(PDF)
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
                                        <TableRow><TableCell colSpan={6} align="center"><Typography>Hiç fiş bulunamadı.</Typography></TableCell></TableRow>
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
        </>
    );
};

export default ListBetweenReceipt;