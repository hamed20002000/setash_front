import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Chip, Autocomplete, Radio, RadioGroup, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
    DialogContentText
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
import ListIcon from '@mui/icons-material/List';
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

/* ---------------- Styled ---------------- */
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
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

/* ---------------- Types ---------------- */
interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}
interface WarehouseType {
    id: string; name: string; code: string; address: string; createAt: string; recordStatus: number;
}
interface BetweenWarehouseDispatchForCombo {
    id: string;
    code: string;
    docDate: string;
    recordStatus: number;
    isEnd?: boolean | null; // NEW
    warehouseDispatchDetails: {
        id: string;
        quantity: string;
        description: string;
        item: { id: string; name: string; unit: { title: string; }; };
    }[];
}
interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: { id: string; name: string; abbreviation: string; unit: { id: string; title: string; recordStatus: number; }; };
    originWarehouseDispatchDeatail: {
        id: string; quantity: string; createAt: string; recordStatus: number; description: string;
        warehouseDispatchHeaders: { id: string; code: string; docDate: string; createAt: string; recordStatus: number; status: number; statusDescription: null | string; };
    } | null;
    originWarehouseDispatchDeatailId: number | null;
}
interface BetweenReceiptType {
    id: string; code: string;
    docDate: string;
    description: string,
    createAt: string; recordStatus: number; warehouse: WarehouseType;
    receiptDetails: ReceiptDetailType[]; status?: string;
}
interface FormReceiptDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    originWarehouseDispatchDeatailId: number | null;
    item?: { name: string; unit?: { title: string; }; };
    originWarehouseDispatchDeatail?: { warehouseDispatchHeaders: { id: string } };
}
interface NewReceiptData {
    docDate: string;
    description: string,
    warehouseId: number;
    receiptDetails: { itemId: number; quantity: number; description: string; originWarehouseDispatchDeatailId: number; }[];
}
interface EditReceiptData extends NewReceiptData { id: number; code: string; }

/* ---------------- Helpers ---------------- */
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try { return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr }); } catch { return "Geçersiz Tarih"; }
};

/* ---------------- Component ---------------- */
const ListBetweenReceipt = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');
    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    /* ---- State ---- */
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


    /* ---- Download modals state (unchanged) ---- */
    const [openAllDownloadModal, setOpenAllDownloadModal] = useState(false);
    const [openFilteredDownloadModal, setOpenFilteredDownloadModal] = useState(false);
    const [openReceiptDetailsDownloadModal, setOpenReceiptDetailsDownloadModal] = useState(false);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [generalDescription, setGeneralDescription] = useState('');
    // NEW: Sevk List modal & End-confirm modal (on save)
    const [openDispatchListModal, setOpenDispatchListModal] = useState(false);
    const [openEndDispatchConfirmModal, setOpenEndDispatchConfirmModal] = useState(false);
    const [lastSelectedDispatch, setLastSelectedDispatch] = useState<{ id: string; code: string } | null>(null);

    /* ---- Utils ---- */
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    /* ---- Fetchers ---- */
    const fetchWarehouses = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const r = await axios.get<ApiResponse<WarehouseType[]>>(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (r.data.httpStatusCode === 200) {
                setWarehousesList(r.data.data.filter(w => w.recordStatus === 0));
            } else {
                showAlert(r.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Depolar yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert, authToken]);

    const fetchDispatchesForCombo = useCallback(async (warehouseId: string) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const r = await axios.get<ApiResponse<BetweenWarehouseDispatchForCombo[]>>(
                server.baseurl + server.warehouse + `get-between-warehouse-dispatches-by-destination-warehouse-id/${warehouseId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (r.data.httpStatusCode === 200) {
                // keep items; if backend sends isEnd, use it; else default false
                const normalized = (r.data.data || []).map(d => ({ ...d, isEnd: d.isEnd ?? false }));
                setDispatchesForCombo(normalized.filter(d => d.recordStatus === 0));
            } else {
                showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, authToken]);

    const fetchDispatchDetails = useCallback(async (dispatchId: string) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const r = await axios.get<ApiResponse<BetweenWarehouseDispatchForCombo>>(
                server.baseurl + server.warehouse + `get-warehouse-dispatch-by-id/${dispatchId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (r.data.httpStatusCode === 200) {
                const details: FormReceiptDetail[] = (r.data.data.warehouseDispatchDetails || []).map(d => ({
                    itemId: Number(d.item.id),
                    quantity: Number(d.quantity),
                    description: d.description,
                    originWarehouseDispatchDeatailId: Number(d.id),
                    item: { name: d.item.name, unit: { title: d.item.unit.title } }
                }));
                setReceiptDetails(details);
            } else {
                showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Sevk detayları yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, authToken]);

    const fetchBetweenReceipts = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const r = await axios.get<ApiResponse<BetweenReceiptType[]>>(
                server.baseurl + server.warehouse + "get-between-receipts",
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (r.data.httpStatusCode === 200) {
                setReceiptList(r.data.data.map(x => ({ ...x, status: x.recordStatus === 0 ? 'Aktif' : 'Pasif' })));
            } else {
                showAlert(r.data.message || 'Fişler yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Fişler yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert, authToken]);

    useEffect(() => { fetchWarehouses(); fetchBetweenReceipts(); }, [fetchWarehouses, fetchBetweenReceipts]);

    /* ---- Derived ---- */
    useEffect(() => {
        const isValid = !!selectedWarehouseId && !!selectedDispatchId && !!docDate && receiptDetails.length > 0 &&
            receiptDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(isValid);
    }, [selectedWarehouseId, selectedDispatchId, docDate, receiptDetails]);

    useEffect(() => {
        const filtered = receiptList.filter(r => {
            const matchesSearch = r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.warehouse?.name && r.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && r.recordStatus === 0) ||
                (statusFilter === 'inactive' && r.recordStatus === 1);

            const d = new Date(r.docDate);
            const start = startDate ? new Date(new Date(startDate).setHours(0, 0, 0, 0)) : null;
            const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : null;
            const matchesDate = (!start || d >= start) && (!end || d <= end);

            return matchesSearch && matchesStatus && matchesDate;
        });
        setDisplayedReceipts(filtered);
        setPage(0);
    }, [receiptList, searchTerm, statusFilter, startDate, endDate]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    useEffect(() => {
        const t = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(t);
    }, []);

    /* ---- Form helpers ---- */
    const validateForm = (): boolean => {
        let ok = true;
        if (!selectedWarehouseId) { setWarehouseIdError(true); ok = false; } else setWarehouseIdError(false);
        if (!selectedDispatchId) { setDispatchIdError(true); ok = false; } else setDispatchIdError(false);
        if (!docDate) { setDocDateError(true); ok = false; } else setDocDateError(false);
        if (!ok) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return ok;
    };
    const resetFormAndState = () => {
        setDocDate(new Date());
        setGeneralDescription('');
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
            if (field === 'quantity') {
                const num = Number(value);
                const dispatchId = selectedDispatchId;
                const selectedDispatch = dispatchesForCombo.find(d => d.id === dispatchId);
                const original = selectedDispatch?.warehouseDispatchDetails.find(d => Number(d.id) === updatedDetail.originWarehouseDispatchDeatailId);
                const maxQ = original ? Number(original.quantity) : 0;

                if (isNaN(num) || num < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz!', 'warning');
                } else {
                    // sum across rows for same origin id
                    const id = updatedDetail.originWarehouseDispatchDeatailId!;
                    const sumOther = newDetails
                        .filter((x, i) => i !== index && x.originWarehouseDispatchDeatailId === id)
                        .reduce((s, x) => s + Number(x.quantity || 0), 0);
                    if (sumOther + num > maxQ) {
                        showAlert(`Girdiğiniz toplam miktar sevk miktarını (${maxQ}) aşamaz!`, 'warning');
                        updatedDetail.quantity = Math.max(0, maxQ - sumOther);
                    } else {
                        updatedDetail.quantity = num;
                    }
                }
            } else {
                (updatedDetail as any)[field] = value;
            }
            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [showAlert, selectedDispatchId, dispatchesForCombo]);

    const handleRemoveReceiptDetail = (index: number) => {
        setReceiptDetails(prev => {
            const removedItem = prev[index];
            if (removedItem) setRemovedReceiptDetails(old => [...old, removedItem]);
            return prev.filter((_, i) => i !== index);
        });
    };
    const handleRestoreReceiptDetail = (i: number) => {
        const item = removedReceiptDetails[i];
        if (item) {
            setReceiptDetails(prev => [...prev, item]);
            setRemovedReceiptDetails(prev => prev.filter((_, k) => k !== i));
        }
    };

    /* ---- API Actions ---- */
    const insertReceipt = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const payload: NewReceiptData = {
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
            warehouseId: Number(selectedWarehouseId),
            receiptDetails: receiptDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description,
                originWarehouseDispatchDeatailId: Number(d.originWarehouseDispatchDeatailId)
            }))
        };
        try {
            const resp = await axios.post(
                server.baseurl + server.warehouse + "create-between-receipt",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (resp.data.httpStatusCode === 201) {
                showAlert('Yeni fiş başarıyla eklendi!', 'success');

                // Open End-Dispatch modal (only for Sevk)
                if (selectedDispatchId) {
                    const d = dispatchesForCombo.find(x => x.id === selectedDispatchId);
                    setLastSelectedDispatch(d ? { id: d.id, code: d.code } : { id: selectedDispatchId, code: 'N/A' });
                    setOpenEndDispatchConfirmModal(true);
                } else {
                    // fallback: just refresh lists
                    resetFormAndState();
                    fetchBetweenReceipts();
                }
            } else {
                showAlert(resp.data.message || 'Fiş eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'Fiş eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editReceipt = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const payload: EditReceiptData = {
            id: Number(editingId),
            code: editingCode!,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
            warehouseId: Number(selectedWarehouseId),
            receiptDetails: receiptDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description,
                originWarehouseDispatchDeatailId: Number(d.originWarehouseDispatchDeatailId)
            }))
        };
        try {
            const r = await axios.put(
                server.baseurl + server.warehouse + "update-between-receipt",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (r.data.httpStatusCode === 200) {
                showAlert('Fiş başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchBetweenReceipts();
            } else {
                showAlert(r.data.message || 'Fiş güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            } else if (e.response?.status === 401) {
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

    // NEW: API to end/un-end a dispatch
    const updateDispatchIsEnd = useCallback(async (id: string, isEnd: boolean) => {
        if (!authToken) { navigate("/"); return { ok: false }; }
        try {
            const r = await axios.put(
                server.baseurl + server.warehouse + "update-warehouse-dispatch-is-end",
                { id: Number(id), isEnd },
                { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (r.data?.httpStatusCode === 200) return { ok: true };
            showAlert(r.data?.message || 'İşlem tamamlanamadı.', 'error');
            return { ok: false };
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'İşlem sırasında hata oluştu.', 'error');
            return { ok: false };
        }
    }, [authToken, navigate, showAlert]);

    /* ---- Menus/Modals ---- */
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleCancelEdit = () => { resetFormAndState(); };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setReceiptIdToDelete(selectedRowForMenu.id);
            setReceiptCodeToDelete(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setReceiptIdToDelete(null); setReceiptCodeToDelete(''); };

    /* ---- PDF/Excel helpers (unchanged core) ---- */
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
        // If Logo is dataURL, use directly:
        // @ts-ignore
        doc.addImage(Logo, 'PNG', pageWidth - 60, startY, 50, 25);
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, startY + 1, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, 15, startY + 25, { align: 'left' });
        if (isFiltered) {
            let filterInfo = '';
            if (searchTerm) filterInfo += `Arama: ${searchTerm} | `;
            if (startDate || endDate) {
                const s = startDate ? format(startDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                const e = endDate ? format(endDate, 'dd.MM.yyyy') : formatDateDisplay(new Date().toISOString());
                filterInfo += `Tarih Aralığı: ${s} - ${e}`;
            }
            if (filterInfo) { doc.setFontSize(9); doc.text(filterInfo, pageWidth / 2, startY + 30, { align: 'center' }); }
        }
        return isFiltered ? startY + 45 : startY + 35;
    };
    const getPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const docAny = doc as any;
        doc.setFont('NotoSans', 'normal'); doc.setFontSize(8); doc.setTextColor(0);
        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
        ];
        let footerY = pageHeight - 30;
        companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
        const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
        const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
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
    const addCompanyInfoToExcel = (ws: Excel.Worksheet, colCount: number) => {
        ws.addRow([]);
        const info = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
        ];
        const lastCol = String.fromCharCode(65 + colCount - 1);
        info.forEach(line => {
            const row = ws.addRow([line]);
            row.getCell(1).alignment = { horizontal: 'center' as const };
            row.getCell(1).font = { name: 'Arial', size: 8, bold: false };
            ws.mergeCells(`A${row.number}:${lastCol}${row.number}`);
        });
    };
    const calculateTotalQuantity = (items: ReceiptDetailType[]): { [unit: string]: number } => {
        const totals: { [u: string]: number } = {};
        items.forEach(i => {
            const unit = i.item?.unit?.title || 'Bilinmiyor';
            const q = Number(i.quantity) || 0;
            totals[unit] = (totals[unit] || 0) + q;
        });
        return totals;
    };

    /* ---- Downloads (same as قبل) ---- */
    const handleDownloadAllOrFilteredPDF = useCallback((data: BetweenReceiptType[], isFiltered: boolean) => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning'); return; }
        const doc = new jsPDF(); getDocFonts(doc);
        data.forEach((receipt, index) => {
            if (index > 0) doc.addPage();
            let yPos = getPdfHeader(doc, isFiltered ? 'Filtrelenmiş Depolar Arası Fişler Raporu' : 'Tüm Depolar Arası Fişler Raporu', isFiltered) + 10;
            doc.setFontSize(12);
            doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos); yPos += 7;
            doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos); yPos += 7;
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos); yPos += 15;
            doc.text(`Genel Açıklama: ${receipt.description || '-'}`, 15, yPos); yPos += 23

            const rows = (receipt.receiptDetails || []).map(d => [d.item?.name || '-', d.quantity, d.item?.unit?.title || '-', d.description || '-']);
            const totals = calculateTotalQuantity(receipt.receiptDetails || []);
            const totalRows = Object.entries(totals).map(([unit, total]) => [{ content: 'Toplam:', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }, total, unit, '']);

            autoTable(doc, {
                startY: yPos,
                head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
                body: rows,
                foot: totalRows as any,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
                didDrawPage: () => { getPdfHeader(doc, isFiltered ? 'Filtrelenmiş Depolar Arası Fişler Raporu' : 'Tüm Depolar Arası Fişler Raporu', isFiltered); getPdfFooter(doc); },
                showHead: 'everyPage', margin: { top: 50, bottom: 20 }
            });
        });
        doc.save(`${isFiltered ? 'Filtrelenmis' : 'Tum'}_Depolar_Arasi_Fisler.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    }, [showAlert, searchTerm, startDate, endDate]);

    const handleDownloadSingleReceiptPDF = useCallback((receipt: BetweenReceiptType) => {
        if (!receipt) { showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning'); return; }
        const doc = new jsPDF(); getDocFonts(doc);
        let yPos = getPdfHeader(doc, `Fiş Raporu: ${receipt.code}`) + 10;
        doc.setFontSize(12);
        doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos); yPos += 7;
        doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos); yPos += 7;
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos); yPos += 15;
        doc.text(`Genel Açıklama: ${receipt.description || '-'}`, 15, yPos); yPos += 23

        const rows = (receipt.receiptDetails || []).map(d => [d.item?.name || '-', d.quantity, d.item?.unit?.title || '-', d.description || '-']);
        const totals = calculateTotalQuantity(receipt.receiptDetails || []);
        const totalRows = Object.entries(totals).map(([unit, total]) => [{ content: 'Toplam:', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }, total, unit, '']);

        autoTable(doc, {
            startY: yPos,
            head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
            body: rows,
            foot: totalRows as any,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
            didDrawPage: () => { getPdfHeader(doc, `Fiş Raporu: ${receipt.code}`); getPdfFooter(doc); },
            showHead: 'everyPage', margin: { top: 50, bottom: 20 }
        });

        doc.save(`Fis_${receipt.code}.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    }, [showAlert]);

    const handleDownloadAllOrFilteredExcel = useCallback(async (data: BetweenReceiptType[], isFiltered: boolean) => {
        showAlert('Excel dosyası oluşturuluyor...', 'info');
        if (!data || data.length === 0) { showAlert('Dışa aktarılacak fiş bulunamadı.', 'warning'); return; }
        try {
            const { fullHeaderStyle, bodyStyle } = getExcelStyles();
            const wb = new Excel.Workbook();
            const ws = wb.addWorksheet('Fiş Raporu', { views: [{ rightToLeft: false }] });
            const title = isFiltered ? 'Filtrelenmiş Depolar Arası Fiş Raporu' : 'Tüm Depolar Arası Fiş Raporu';
            const itemHeaders = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const colCount = itemHeaders.length;
            const lastCol = String.fromCharCode(65 + colCount - 1);

            ws.addRow([title]).eachCell(c => { c.font = { name: 'Times New Roman', size: 12, bold: true }; c.alignment = { horizontal: 'center' as const }; });
            ws.mergeCells(`A1:${lastCol}1`);
            ws.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            ws.mergeCells(`A2:${lastCol}2`);
            ws.addRow([]);

            data.forEach((receipt, idx) => {
                if (idx > 0) ws.addRow([]);
                const infoRow = ws.addRow([`Fiş Kodu: ${receipt.code || '-'}`,
                `Depo: ${receipt.warehouse?.name || '-'}`,
                `Tarih: ${formatDateDisplay(receipt.docDate)}`,
                `Genel Açıklama:${receipt.description || ''}`]);
                infoRow.eachCell(c => Object.assign(c.style, bodyStyle));
                ws.addRow([]);
                const hdr = ws.addRow(itemHeaders);
                hdr.eachCell(c => Object.assign(c.style, fullHeaderStyle));

                (receipt.receiptDetails || []).forEach(it => {
                    ws.addRow([it.item.name || '-', it.quantity, it.item.unit?.title || '-', it.description]).eachCell(c => Object.assign(c.style, bodyStyle));
                });

                const totals = calculateTotalQuantity(receipt.receiptDetails || []);
                Object.entries(totals).forEach(([unit, total]) => {
                    const tr = ws.addRow([]);
                    tr.getCell(2).value = 'Toplam:'; tr.getCell(2).style = { ...bodyStyle, font: { ...bodyStyle.font, bold: true }, alignment: { ...bodyStyle.alignment, horizontal: 'right' as const } };
                    tr.getCell(3).value = total; tr.getCell(3).style = bodyStyle;
                    tr.getCell(4).value = unit; tr.getCell(4).style = bodyStyle;
                    ws.mergeCells(`A${tr.number}:B${tr.number}`);
                });
            });

            addCompanyInfoToExcel(ws, colCount);
            if (ws.columns) {
                ws.columns.forEach(col => {
                    let max = 0;
                    if (col && (col as any).eachCell) (col as any).eachCell({ includeEmpty: true }, (cell: any) => {
                        const len = cell.value ? cell.value.toString().length : 10;
                        if (len > max) max = len;
                    });
                    (col as any).width = Math.min(Math.max(max + 2, 12), 50);
                });
            }

            const buffer = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${isFiltered ? 'Filtrelenmis' : 'Tum'}_Depolar_Arasi_Fisler_Raporu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (err) {
            showAlert('Excel oluşturulurken bir hata oluştu.', 'error');
        }
    }, [showAlert, searchTerm, startDate, endDate]);

    const handleDownloadSingleReceiptExcel = useCallback(async (receipt: BetweenReceiptType) => {
        showAlert('Fiş detayları Excel oluşturuluyor...', 'info');
        if (!receipt) { showAlert('Excel oluşturulacak fiş bulunamadı.', 'warning'); return; }
        try {
            const { fullHeaderStyle, bodyStyle } = getExcelStyles();
            const wb = new Excel.Workbook();
            const ws = wb.addWorksheet('Fiş Detayları', { views: [{ rightToLeft: false }] });
            const itemHeaders = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const colCount = itemHeaders.length;
            const lastCol = String.fromCharCode(65 + colCount - 1);

            const titleRow = ws.addRow([`Fiş Detay Raporu - ${receipt.code}`]);
            titleRow.font = { name: 'Times New Roman', size: 12, bold: true };
            titleRow.getCell(1).alignment = { horizontal: 'center' as const };
            ws.mergeCells(`A1:${lastCol}1`);
            ws.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            ws.mergeCells(`A2:${lastCol}2`);
            ws.addRow([]);

            const infoHeaders = ['Fiş Kodu', 'Depo', 'Tarih', 'Genel Açıklama'];
            const infoData = [receipt.code || '-', receipt.warehouse?.name || '-',
            formatDateDisplay(receipt.docDate), receipt.description || ''];
            infoHeaders.forEach((h, idx) => { ws.addRow([h, infoData[idx]]).eachCell(c => Object.assign(c.style, bodyStyle)); });
            ws.addRow([]);

            if ((receipt.receiptDetails || []).length > 0) {
                const hdr = ws.addRow(itemHeaders);
                hdr.eachCell(c => Object.assign(c.style, fullHeaderStyle));
                (receipt.receiptDetails || []).forEach(it => {
                    ws.addRow([it.item.name || '-', it.quantity, it.item.unit?.title || '-', it.description]).eachCell(c => Object.assign(c.style, bodyStyle));
                });
                const totals = calculateTotalQuantity(receipt.receiptDetails || []);
                Object.entries(totals).forEach(([unit, total]) => {
                    const tr = ws.addRow([]);
                    tr.getCell(2).value = 'Toplam:'; tr.getCell(2).style = { ...bodyStyle, font: { ...bodyStyle.font, bold: true }, alignment: { ...bodyStyle.alignment, horizontal: 'right' as const } };
                    tr.getCell(3).value = total; tr.getCell(3).style = bodyStyle;
                    tr.getCell(4).value = unit; tr.getCell(4).style = bodyStyle;
                    ws.mergeCells(`A${tr.number}:B${tr.number}`);
                });
            } else {
                ws.addRow(['Bu fişe ait ürün bilgisi bulunamadı.']).eachCell(c => Object.assign(c.style, bodyStyle));
            }

            addCompanyInfoToExcel(ws, colCount);
            if (ws.columns) {
                ws.columns.forEach(col => {
                    let max = 0;
                    if (col && (col as any).eachCell) (col as any).eachCell({ includeEmpty: true }, (cell: any) => {
                        const len = cell.value ? cell.value.toString().length : 10;
                        if (len > max) max = len;
                    });
                    (col as any).width = Math.min(Math.max(max + 2, 12), 50);
                });
            }

            const buffer = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Fiş_Detay_${receipt.code}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch {
            showAlert('Excel oluşturulurken bir hata oluştu.', 'error');
        }
    }, [showAlert]);



    const handleEditClick = useCallback(async () => {
        if (!selectedRowForMenu) return;
        setEditingId(selectedRowForMenu.id);
        setEditingCode(selectedRowForMenu.code);
        setDocDate(new Date(selectedRowForMenu.docDate));
        setGeneralDescription(selectedRowForMenu.description || '');
        setSelectedWarehouseId(selectedRowForMenu.warehouse.id);
        setIsFormVisible(true);
        handleCloseMenu();
        await fetchDispatchesForCombo(selectedRowForMenu.warehouse.id);
        const originDispatchDetail = selectedRowForMenu.receiptDetails?.[0]?.originWarehouseDispatchDeatail;
        if (originDispatchDetail?.warehouseDispatchHeaders?.id) {
            setSelectedDispatchId(originDispatchDetail.warehouseDispatchHeaders.id);
            // Optionally load details if backend requires
            // await fetchDispatchDetails(originDispatchDetail.warehouseDispatchHeaders.id);
        }
        const formattedDetails = (selectedRowForMenu.receiptDetails || []).map(d => ({
            itemId: Number(d.item.id),
            quantity: d.quantity,
            description: d.description,
            originWarehouseDispatchDeatailId: Number(d.originWarehouseDispatchDeatailId),
            item: { name: d.item.name, unit: { title: d.item.unit?.title || '' } }
        }));
        setReceiptDetails(formattedDetails);
    }, [selectedRowForMenu, fetchDispatchesForCombo]);

    /* ---- Handlers: Combos ---- */
    const onWarehouseChange = async (_: any, newValue: WarehouseType | null) => {
        setSelectedWarehouseId(newValue ? newValue.id : null);
        setSelectedDispatchId(null);
        setDispatchesForCombo([]);
        setReceiptDetails([]);
        if (newValue) await fetchDispatchesForCombo(newValue.id);
        if (warehouseIdError && newValue) setWarehouseIdError(false);
    };
    const onDispatchChange = async (_: any, newValue: BetweenWarehouseDispatchForCombo | null) => {
        setSelectedDispatchId(newValue ? newValue.id : null);
        if (newValue) await fetchDispatchDetails(newValue.id);
        else setReceiptDetails([]);
        if (dispatchIdError && newValue) setDispatchIdError(false);
    };

    /* ---- NEW: End-Dispatch confirm after insert ---- */
    const handleConfirmEndDispatch = async (shouldEnd: boolean) => {
        if (!lastSelectedDispatch) { setOpenEndDispatchConfirmModal(false); resetFormAndState(); fetchBetweenReceipts(); return; }
        if (!shouldEnd) {
            showAlert('Fiş kaydedildi.', 'success');
            setOpenEndDispatchConfirmModal(false);
            resetFormAndState();
            fetchBetweenReceipts();
            return;
        }
        const res = await updateDispatchIsEnd(lastSelectedDispatch.id, true);
        if (res.ok) {
            showAlert(`Sevk Belgesi ${lastSelectedDispatch.code} sonlandırıldı.`, 'success');
            // refresh combo list for current warehouse
            if (selectedWarehouseId) await fetchDispatchesForCombo(selectedWarehouseId);
            setOpenEndDispatchConfirmModal(false);
            resetFormAndState();
            fetchBetweenReceipts();
        }
    };

    /* ---- NEW: Dispatch List modal toggle handler ---- */
    const handleToggleDispatchRow = async (row: BetweenWarehouseDispatchForCombo, value: 'open' | 'ended') => {
        const targetIsEnd = value === 'ended';
        const res = await updateDispatchIsEnd(row.id, targetIsEnd);
        if (res.ok) {
            setDispatchesForCombo(prev => prev.map(d => d.id === row.id ? { ...d, isEnd: targetIsEnd } : d));
            showAlert(`'${row.code}' ${targetIsEnd ? 'Sonlandırıldı' : 'Açıldı'}.`, 'success');
            // if currently selected dispatch was ended, clear selection & details
            if (selectedDispatchId === row.id && targetIsEnd) {
                setSelectedDispatchId(null);
                setReceiptDetails([]);
            }
        }
    };

    /* ---- Date filters ---- */
    const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };



    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };


    return (
        <>
            <Box sx={{ p: 1 }}>
                {/* Header */}
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={3} spacing={2} flexWrap="wrap">
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>Depolar Arası Fişler</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Depolar Arası Fişler Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton variant="contained" color="primary" isBlinking={isBlinking} onClick={() => setIsFormVisible(true)} fullWidth={false}>
                                    Yeni Depolar Arası Fişleri Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button variant="contained" color="error" onClick={resetFormAndState} disabled={loadingButton} fullWidth={false} startIcon={<IconX size={20} />}>
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>

                {/* Form */}
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Depolar Arası Fiş Düzenle' : 'Yeni Depolar Arası Fiş'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Depo</CustomFormLabel>
                                <Autocomplete
                                    id="warehouse-select"
                                    options={warehousesList}
                                    getOptionLabel={(o) => o.name}
                                    value={warehousesList.find(w => w.id === selectedWarehouseId) || null}
                                    onChange={onWarehouseChange}
                                    isOptionEqualToValue={(o, v) => o.id === v.id}
                                    renderInput={(params) => (
                                        <TextField {...params} fullWidth size="small" placeholder="Depo Seçin" error={warehouseIdError} helperText={warehouseIdError ? "Depo seçimi zorunludur!" : ""} />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={4}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <CustomFormLabel required>Depolar Arası Sevk</CustomFormLabel>
                                    {/* NEW: Show list button */}

                                    <CustomTooltip title="Sevk Belgeleri listesi">
                                        <span>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<ListIcon />}
                                                onClick={() => setOpenDispatchListModal(true)}
                                            >
                                                Listeyi Göster
                                            </Button>
                                        </span>
                                    </CustomTooltip>
                                </Stack>
                                <Autocomplete
                                    id="dispatch-select"
                                    options={dispatchesForCombo.filter(d => !d.isEnd)} // hide ended ones from selection
                                    getOptionLabel={(o) => `${o.code} — ${formatDateDisplay(o.docDate)}`}
                                    value={dispatchesForCombo.find(d => d.id === selectedDispatchId) || null}
                                    onChange={onDispatchChange}
                                    isOptionEqualToValue={(o, v) => o.id === v.id}
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

                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        value={docDate}
                                        onChange={(v) => { setDocDate(v); if (docDateError && v) setDocDateError(false); }}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField {...params} fullWidth size="small" error={docDateError} helperText={docDateError ? "Tarih alanı boş bırakılamaz!" : ""} />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>



                            <Grid item xs={12}>
                                <CustomFormLabel htmlFor="invoice-general-description">Açıklama (Genel Depolar Arası Fişler)</CustomFormLabel>
                                <TextField
                                    id="invoice-general-description"
                                    label="Depolar Arası Fişler için genel açıklama giriniz"
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

                        {/* Details */}
                        <Box mt={4}>
                            <Typography variant="h6">Fiş Detayları</Typography>
                            {removedReceiptDetails.length > 0 && (
                                <Box sx={{ border: '1px dashed', borderColor: "error.main", p: 2, mt: 2, borderRadius: 1, backgroundColor: 'rgba(255, 0, 0, 0.05)' }}>
                                    <Typography variant="subtitle1" color="error" mb={1}>Silinen Ürünler</Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {removedReceiptDetails.map((detail, index) => (
                                            <Chip key={index} label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`} color="error" onDelete={() => handleRestoreReceiptDetail(index)} deleteIcon={<IconReload size={18} />} />
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
                                                <Grid item xs={12} sm={4}>
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="body1" noWrap>{displayItemName}</Typography>
                                                        <Chip label={displayUnitTitle} color="secondary" size="small" />
                                                    </Stack>
                                                </Grid>
                                                <Grid item xs={12} sm={3}>
                                                    <CustomTextField
                                                        type="number"
                                                        placeholder="Miktar"
                                                        value={detail.quantity}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'quantity', e.target.value)}
                                                        fullWidth
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={4}>
                                                    <CustomTextField
                                                        placeholder="Açıklama"
                                                        value={detail.description}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'description', e.target.value)}
                                                        fullWidth
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={1}>
                                                    <IconButton color="error" size="small" aria-label="Satırı Sil" onClick={() => handleRemoveReceiptDetail(index)}>
                                                        <IconTrash />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
                                        );
                                    })
                                ) : (
                                    <Grid item xs={12}></Grid>
                                )}
                            </Grid>
                        </Box>

                        {/* Actions */}
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
                                            <BlinkingButton variant="contained" color="success" onClick={insertReceipt} disabled={!isFormValid || loadingButton} isBlinking={isFormValid && !loadingButton}>
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Fiş Ekle'}
                                            </BlinkingButton>
                                        </span>
                                    </CustomTooltip>
                                )
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* Alerts */}
                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                    </Stack>
                )}

                {/* List + filters */}
                <BlankCard>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2} mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle fişleri indirin" : ""}>
                                <BlinkingButtondownload variant="outlined" color="primary" startIcon={<IconFileDownload />} onClick={() => setOpenFilteredDownloadModal(true)} disabled={loadingData || displayedReceipts.length === 0}>
                                    Filtrelenmiş İndir
                                </BlinkingButtondownload>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => setOpenAllDownloadModal(true)} disabled={loadingData || receiptList.length === 0}>
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
                                        <DatePicker label="Başlangıç Tarihi" value={startDate} inputFormat="dd/MM/yyyy" onChange={(v) => setStartDate(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                                        <DatePicker label="Bitiş Tarihi" value={endDate} inputFormat="dd/MM/yyyy" onChange={(v) => setEndDate(v)} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                                        <IconButton onClick={handleClearDateFilters} aria-label="Tarih filtrelerini temizle"><IconX size={20} /></IconButton>
                                    </Stack>
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <ToggleButtonGroup value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)} fullWidth>
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
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
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
                                                <StyledTableCell sx={{ maxWidth: 150 }}>
                                                    <Typography variant="body2" noWrap title={row.description || ''}>
                                                        {row.description || '-'}
                                                    </Typography>
                                                    {row.description.length > 50 && (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                            <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                                handleOpenDescriptionModal(row.description);
                                                            }}>
                                                                Devamını Oku
                                                            </Button>
                                                        </CustomTooltip>
                                                    )}
                                                </StyledTableCell>
                                                <StyledTableCell><Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} /></StyledTableCell>
                                                <StyledTableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                            <Button variant="outlined" startIcon={<IconEye />} onClick={() => { setDetailsToShow(row.receiptDetails || []); setOpenDetailsModal(true); }}>
                                                                Görünüm
                                                            </Button>
                                                        </CustomTooltip>
                                                    </Stack>
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <IconButton onClick={(e) => { setSelectedRowForMenu(row); setAnchorEl(e.currentTarget); }} aria-label="Satır menüsü">
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                        {hasDownloadPermission && (
                                                            <MuiMenuItem onClick={() => { handleCloseMenu(); setSelectedRowForMenu(row); setOpenReceiptDetailsDownloadModal(true); }}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir
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
                                                <Typography variant="subtitle1" color="textSecondary">Hiç fiş bulunamadı.</Typography>
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
                        onPageChange={(_, p) => setPage(p)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage="Satır başına:"
                    />
                </BlankCard>
            </Box>

            {/* Details Modal */}
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
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>Bu fiş için detay bulunamadı.</Typography>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Delete */}
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
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => { handleDownloadAllOrFilteredPDF(receiptList, false); setOpenAllDownloadModal(false); }}>
                            Tüm Fişler Raporu (PDF)
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => { handleDownloadAllOrFilteredExcel(receiptList, false); setOpenAllDownloadModal(false); }}>
                            Tüm Fişler Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAllDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            <Dialog
                open={openDescriptionModal}
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

            {/* Filtered Receipts Download Modal */}
            <Dialog open={openFilteredDownloadModal} onClose={() => setOpenFilteredDownloadModal(false)}>
                <DialogTitle>Filtrelenmiş Fişler İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => { handleDownloadAllOrFilteredPDF(displayedReceipts, true); setOpenFilteredDownloadModal(false); }}>
                            Filtrelenmiş Fişler Raporu (PDF)
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => { handleDownloadAllOrFilteredExcel(displayedReceipts, true); setOpenFilteredDownloadModal(false); }}>
                            Filtrelenmiş Fişler Raporu (Excel)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenFilteredDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            {/* Single Receipt Details Download Modal */}
            <Dialog open={openReceiptDetailsDownloadModal} onClose={() => setOpenReceiptDetailsDownloadModal(false)}>
                <DialogTitle>Detaylı Fiş Raporu İçin Format Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ width: '100%', minWidth: { sm: '400px' } }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                            onClick={() => { if (selectedRowForMenu) { handleDownloadSingleReceiptPDF(selectedRowForMenu); setOpenReceiptDetailsDownloadModal(false); } }}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                            onClick={() => { if (selectedRowForMenu) { handleDownloadSingleReceiptExcel(selectedRowForMenu); setOpenReceiptDetailsDownloadModal(false); } }}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenReceiptDetailsDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            {/* NEW: Sevk Listesi Modal (Radio Açık/Sonlandırılmış) */}
            <Dialog open={openDispatchListModal} onClose={() => setOpenDispatchListModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Depolar Arası Sevk Listesi</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell align="center"><Typography variant="h6">Aç/Kapat</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {dispatchesForCombo.length > 0 ? dispatchesForCombo.map(row => (
                                    <TableRow key={row.id}>
                                        <StyledTableCell>{row.code}</StyledTableCell>
                                        <StyledTableCell>{formatDateDisplay(row.docDate)}</StyledTableCell>
                                        <StyledTableCell>
                                            {row.isEnd ? <Chip size="small" label="Sonlandırılmış" color="error" /> : <Chip size="small" label="Açık" color="success" />}
                                        </StyledTableCell>
                                        <StyledTableCell align="center">
                                            <RadioGroup
                                                row
                                                value={row.isEnd ? 'ended' : 'open'}
                                                onChange={(_, val) => handleToggleDispatchRow(row, val as 'open' | 'ended')}
                                            >
                                                <FormControlLabel value="open" control={<Radio />} label="Açık" />
                                                <FormControlLabel value="ended" control={<Radio />} label="Sonlandırılmış" />
                                            </RadioGroup>
                                        </StyledTableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={4} align="center">Sevk belgesi bulunamadı.</StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDispatchListModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* NEW: Confirm End Dispatch after Insert */}
            <Dialog open={openEndDispatchConfirmModal} onClose={() => setOpenEndDispatchConfirmModal(false)}>
                <DialogTitle>Fatura Durumu Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Fişi kaydettiniz. Bu sevk belgesini Sonlandırmak (Belge No: {lastSelectedDispatch?.code || 'N/A'}) ister misiniz?
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        (Bu, bu sevk belgesine ait başka bir fiş belgesi oluşturulamayacağı anlamına gelir.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleConfirmEndDispatch(false)} color="error">Hayır (Sadece Fişi Kaydet)</Button>
                    <Button onClick={() => handleConfirmEndDispatch(true)} color="primary" variant="contained" autoFocus>Evet (Sevki Sonlandır)</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListBetweenReceipt;
