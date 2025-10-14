

// src/views/.../ListStoreInvoice.tsx
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    RadioGroup, FormControlLabel, Radio, Chip
} from '@mui/material';

import { styled, keyframes } from '@mui/material/styles';
import {
    IconDots, IconEye, IconEdit, IconTrash, IconCheck, IconX, IconPencil,
    IconInfoCircle, IconFileDownload, IconFile, IconFileSpreadsheet, IconSearch
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import axios from 'axios';
import server from '../../../assets/address.json';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import StoreInvoiceItemsTable from './StoreInvoiceItemsTable';
import DeleteStoreInvoiceModal from './DeleteStoreInvoice';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import { useAuth } from 'src/context/AuthContext';
import BlankCard from 'src/components/shared/BlankCard';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));

// ===== Types =====
interface ProviderType {
    id: number;
    name: string;
    phoneNumber: string;
    address: string;
    firm: any; // will coerce to boolean downstream
    recordStatus: number;
    createAt: string;
    status: string;
    region: string | null;
}
interface DriverApiResponseType { id: string; name: string; family: string; recordStatus: number; internal: boolean }
interface DriverType { id: string; name: string; family: string; recordStatus: number; status: string; internal: string }
interface UnitType { id: string; title: string; recordStatus: number; createAt: string }
interface ItemType { id: string; name: string; abbreviation: string; recordStatus: number; unit: UnitType }
interface InvoiceItem {
    id: number;
    item: string;
    unit?: UnitType;
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    description: string;
    orderDetailId?: string | null;
    providerId?: number;
    firm?: boolean;
}
interface InvoiceDetailType {
    id: number;
    item: { id: string; name: string; unit: { title: string } };
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    description: string;
    provider?: { id: string; name: string; firm: boolean } | null;
    firm?: boolean;
    orderDetail?: { id: string; quantity: string; price: string } | null;
}
interface InvoiceHeaderStatusHistory { id: string; status: number; createAt: string; recordStatus: number; description: string | null }

interface WorkhouseType {
    id: number | string;
    name: string;
    code?: string;
    address?: string;
    createAt?: string;
    recordStatus: number;
    region?: { id: string; name: string; depth?: number; createAt?: string; recordStatus?: number } | null;
    work?: { id: string; title: string; startDate?: string; endDate?: string; createAt?: string; recordStatus?: number } | null;
    status?: string; // derived
}

interface InvoiceType {
    id: number;
    invoiceNo: string | null;
    provider: { id: string; name: string; firm: boolean } | null;
    driver: { id: string; name: string; family: string } | null;
    workhouse?: { id: string; name: string; code?: string; address?: string; createAt?: string; recordStatus?: number } | null;
    docDate: string;
    totalAmount?: number;
    status: number;
    invoiceDetails: InvoiceDetailType[];
    driverVehicleId: string | null;
    driverVehicle?: { id: string; name: string; family: string; model: string; plaque: string } | null;
    invoiceHeaderStatusHistories: InvoiceHeaderStatusHistory[];
}

interface VehicleType { id: number; name: string; model: string; plaque: string; recordStatus: number; createAt: string }
interface ApiResponseVehicleType { id: string; name: string; model: number; plaque: string; recordStatus: number; createAt: string }

// ===== Utils =====
const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
    if (priceInput == null) return '₺0,00';
    const cleaned = String(priceInput).replace(/[^\d.-]/g, '');
    const n = parseFloat(cleaned);
    if (isNaN(n)) return '₺0,00';
    return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

type SortableInvoiceKeys = 'invoiceNo' | 'provider.name' | 'driver.name' | 'docDate' | 'status' | 'totalAmount' | 'driver.family';

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'pending' && selected && { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } }),
        ...(value === 'approved' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'rejected' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const descendingComparator = <T, Key extends string>(a: T, b: T, orderBy: Key): number => {
    const getNestedValue = (obj: any, path: string): any => path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
    const valA = getNestedValue(a, orderBy);
    const valB = getNestedValue(b, orderBy);

    if (orderBy === 'docDate') {
        const dA = valA ? new Date(valA).getTime() : 0;
        const dB = valB ? new Date(valB).getTime() : 0;
        return dB - dA;
    }
    if (valB == null) return valA == null ? 0 : -1;
    if (valA == null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    return 0;
};
const getComparator = (order: 'asc' | 'desc', orderBy: SortableInvoiceKeys) =>
    (a: InvoiceType, b: InvoiceType) => order === 'desc' ? descendingComparator(a, b, orderBy) : -descendingComparator(a, b, orderBy);
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => { const order = comparator(a[0], b[0]); return order !== 0 ? order : a[1] - b[1]; });
    return stabilized.map((el) => el[0]);
};
const cleanAndConvertNumber = (value: string | number | undefined | null): number => {
    if (value == null) return 0;
    const cleanedString = String(value).replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
};

const ListStoreInvoice = () => {
    const navigate = useNavigate();
    const [providers, setProviders] = useState<ProviderType[]>([]);
    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);

    const [driver, setDriver] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
    const [openVehicleModal, setOpenVehicleModal] = useState<boolean>(false);
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);
    const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);

    const [invoicesList, setInvoicesList] = useState<InvoiceType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [orderBy, setOrderBy] = useState<SortableInvoiceKeys>('docDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedInvoiceForMenu, setSelectedInvoiceForMenu] = useState<InvoiceType | null>(null);

    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<InvoiceDetailType[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<number | null>(null);
    const [invoiceProviderToDelete, setInvoiceProviderToDelete] = useState<string>('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState<1 | 2 | null>(null);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [statusError, setStatusError] = useState(false);
    const [description, setDescription] = useState('');
    const [idRow, setIdRow] = useState(0);
    const { isTooltipGloballyEnabled } = useTooltip();

    // NEW: workhouse state
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [workhouse, setWorkhouse] = useState<number | null>(null);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [isFilterActive, setIsFilterActive] = useState(false);

    const [openStatusHistoryModal, setOpenStatusHistoryModal] = useState(false);
    const [statusHistoryData, setStatusHistoryData] = useState<any[]>([]);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedInvoiceForDownload, setSelectedInvoiceForDownload] = useState<InvoiceType | null>(null);

    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);
    const hasStatusPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Onaylamak'), [allowedOperations]);

    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return 'N/A';
        try { return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr }); }
        catch { return 'Geçersiz Tarih'; }
    };

    // ===== PDF/Excel headers & helpers =====
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 50, logoHeight = 25, margin = 10, topMargin = 20, logoX = pageWidth - logoWidth - margin;
        doc.addImage(Logo, 'PNG', logoX, topMargin, logoWidth, logoHeight);
        doc.setFont('Arial', 'bold'); doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10); doc.setFont('Arial', 'bold'); doc.text(`Rapor Tarihi:`, 15, 25);
        doc.setFont('Arial', 'normal'); doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 25);
    };
    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8); doc.setFont('Arial', 'normal');
        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
        ];
        let footerY = pageHeight - 30;
        companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        const docAny = doc as any; const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };

    // ===== Alerts =====
    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
    };
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) { timer = setTimeout(() => { clearAlert(); }, 5000); }
        return () => { clearTimeout(timer); };
    }, [alertMessage]);

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => { clearTimeout(timer); };
    }, []);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    // ===== Data fetchers =====
    const fetchVehicles = useCallback(async (driverId: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); return; }
        try {
            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${driverId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const formattedData: VehicleType[] = response.data.data.map((item: ApiResponseVehicleType) => ({
                    ...item, model: String(item.model), id: Number(item.id)
                }));
                const activeVehicles = formattedData.filter(item => item.recordStatus === 0);
                setVehiclesList(activeVehicles);
                if (activeVehicles.length > 1) { setOpenVehicleModal(true); setTempSelectedVehicle(activeVehicles[0].id); }
                else if (activeVehicles.length === 1) {
                    setSelectedVehicle(activeVehicles[0].id);
                    setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
                } else { setSelectedVehicle(null); setSelectedVehicleName(null); }
            } else {
                setVehiclesList([]); setSelectedVehicle(null); setSelectedVehicleName(null);
                showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            setVehiclesList([]); setSelectedVehicle(null); setSelectedVehicleName(null);
            showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
        }
    }, []);

    const fetchProviders = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-provider", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const active = response.data.data.filter((item: any) => item.recordStatus === 0);
                const providersWithStatus = active.map((item: any) => ({
                    id: Number(item.id),
                    name: item.name || '',
                    phoneNumber: item.phone || '',
                    address: item.address || '',
                    firm: !!item.firm,
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    status: 'Aktif',
                    region: item.region
                }));
                setProviders(providersWithStatus);
            } else {
                showAlert(response.data.message || 'Sağlayıcılar yüklenirken bir hata oluştu.', 'error');
                setProviders([]);
            }
        } catch { showAlert('Sağlayıcılar yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    const fetchDrivers = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-drivers",
                { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const activeDrivers = (response.data.data as DriverApiResponseType[])
                    .filter(item => item.recordStatus === 0)
                    .map(item => ({
                        id: item.id, name: item.name || '', family: item.family || '',
                        recordStatus: item.recordStatus, status: 'Aktif', internal: item.internal ? '1' : '0'
                    }));
                setDrivers(activeDrivers);
            } else {
                showAlert(response.data.message || 'Sürücüler yüklenirken bir hata oluştu.', 'error');
                setDrivers([]);
            }
        } catch { showAlert('Sürücüler yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    const getInvoices = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-invoices",
                { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) { setInvoicesList(response.data.data as InvoiceType[]); }
            else { showAlert(response.data.message || 'Faturalar yüklenirken bir hata oluştu.', 'error'); }
        } catch { showAlert('Faturalar yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);

    const getItems = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item",
                { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data && response.data.success) {
                setItemsList(response.data.data.filter((item: ItemType) => item.recordStatus === 0));
            } else { showAlert('Ürünler yüklenmedi.', 'error'); }
        } catch { showAlert('Ürünler sunucudan alınamadı', 'error'); }
    }, [navigate]);

    // NEW: fetch workhouses (Şantiye)
    const fetchWorkhouses = useCallback(async (workIdParam?: string) => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                const allWorkhouses = response.data.data as WorkhouseType[];
                const filtered = workIdParam
                    ? allWorkhouses.filter(item => item.work && Number((item.work as any).id) === Number(workIdParam))
                    : allWorkhouses;
                const withStatus = filtered.map(item => ({
                    ...item,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setWorkhousesList(withStatus);
            } else {
                showAlert(response.data.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Şantiyeler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    useEffect(() => {
        getInvoices();
        fetchProviders();
        fetchDrivers();
        fetchWorkhouses(); // << use Şantiye instead of warehouse
        getItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== Items handlers =====
    const handleAddInvoiceItem = (newItem: InvoiceItem) => { setInvoiceItems(prev => [...prev, newItem]); setHasUnsavedChanges(true); };
    const handleUpdateInvoiceItem = (updated: InvoiceItem) => {
        setInvoiceItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    };
    const handleRemoveInvoiceItem = (id: number) => { setInvoiceItems(prev => prev.filter(i => i.id !== id)); };

    // ===== Form validate/reset/save/update =====
    const validateForm = (): boolean => {
        if (!driver || !docDate || workhouse == null || selectedVehicle == null) {
            showAlert('Lütfen tüm zorunlu alanları (Sürücü, Şantiye, Tarih ve Araç) doldurun.', 'warning');
            return false;
        }
        const hasInvalidItem = invoiceItems.some(item => !item.item || item.quantity <= 0 || item.price <= 0 || isNaN(item.quantity) || isNaN(item.price));
        if (invoiceItems.length === 0 || hasInvalidItem) {
            showAlert('Lütfen en az bir ürün ekleyin ve tüm ürün alanlarını doğru şekilde doldurun.', 'warning');
            return false;
        }
        return true;
    };

    const resetForm = () => {
        setHasUnsavedChanges(false);
        setDriver('');
        setDocDate(new Date());
        setInvoiceItems([]);
        setEditingId(null);
        setSelectedVehicle(null);
        setSelectedVehicleName(null);
        setVehiclesList([]);
        setWorkhouse(null);
        setIsFormVisible(false);
        clearAlert();
    };

    const handleSaveInvoice = async () => {
        if (!validateForm()) return;
        const invoiceData = {
            docDate: docDate?.toISOString(),
            status: 0,
            statusDescription: '',
            driverId: Number(driver),
            workhouseId: Number(workhouse),        // <<<<<< IMPORTANT
            driverVehicleId: Number(selectedVehicle),
            invoiceDetails: invoiceItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                price: Number(item.price).toFixed(2),
                discountPercent: Number(item.discountPercent).toFixed(2),
                discountAmount: Number(item.discountAmount).toFixed(2),
                description: item.description,
                orderDetailId: item.orderDetailId ? Number(item.orderDetailId) : null,
                providerId: item.providerId,
                firm: item.firm
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-invoice-for-store",
                invoiceData, { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                setHasUnsavedChanges(false);
                resetForm();
                getInvoices();
                showAlert('Fatura başarıyla kaydedildi!', 'success');
            } else { showAlert(response.data.message || 'Fatura kaydedilirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Fatura kaydedilirken bir hata oluştu.', 'error'); }
        }
    };

    const handleUpdateInvoice = async () => {
        if (!validateForm() || !editingId) return;
        const invoiceData = {
            id: Number(editingId),
            docDate: docDate?.toISOString(),
            driverId: Number(driver),
            workhouseId: Number(workhouse),        // <<<<<< IMPORTANT
            driverVehicleId: Number(selectedVehicle),
            invoiceDetails: invoiceItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                price: Number(item.price).toFixed(2),
                discountPercent: Number(item.discountPercent).toFixed(2),
                discountAmount: Number(item.discountAmount).toFixed(2),
                description: item.description,
                orderDetailId: item.orderDetailId ? Number(item.orderDetailId) : null,
                providerId: item.providerId,
                firm: item.firm
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-invoice-for-store",
                invoiceData, { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Fatura başarıyla güncellendi!', 'success');
                resetForm();
                getInvoices();
            } else { showAlert(response.data.message || 'Fatura güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            } else { showAlert('Fatura güncellenirken bir hata oluştu.', 'error'); }
        }
    };

    const handleEditClick = async (row: InvoiceType) => {
        setEditingId(row.id);
        handleCloseMenu();
        clearAlert();

        const selectedDriver = row.driver ? drivers.find(d => d.id === row.driver?.id) : null;
        if (selectedDriver && selectedDriver.id) {
            setDriver(selectedDriver.id);
            const authToken = localStorage.getItem('authToken');
            if (!authToken) { navigate("/"); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); return; }
            try {
                const response = await axios.get(
                    `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${selectedDriver.id}`,
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );
                if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                    const activeVehicles = response.data.data.map((item: any) => ({
                        ...item, model: String(item.model), id: Number(item.id)
                    })).filter((item: any) => item.recordStatus === 0);
                    let vehicleToShowId: number | null = null;
                    let vehicleToShowName: string | null = null;
                    if (row.driverVehicle) {
                        vehicleToShowId = Number(row.driverVehicle.id);
                        vehicleToShowName = `${row.driverVehicle.name} (${row.driverVehicle.plaque})`;
                    } else if (activeVehicles.length > 0) {
                        vehicleToShowId = activeVehicles[0].id;
                        vehicleToShowName = `${activeVehicles[0].name} (${activeVehicles[0].plaque})`;
                    }
                    setVehiclesList(activeVehicles);
                    setSelectedVehicle(vehicleToShowId);
                    setSelectedVehicleName(vehicleToShowName);
                } else {
                    setVehiclesList([]); setSelectedVehicle(null); setSelectedVehicleName(null);
                    showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
                }
            } catch {
                setVehiclesList([]); setSelectedVehicle(null); setSelectedVehicleName(null);
                showAlert('Araç bilgileri yüklenirken bir hata oluştu.', 'error');
            }
        } else {
            setDriver('');
            setSelectedVehicle(null);
            setSelectedVehicleName(null);
            setVehiclesList([]);
            showAlert('Faturada geçerli bir sürücü bilgisi bulunamadı.', 'warning');
        }

        // Set workhouse from row
        const selectedWorkhouse = row.workhouse ? workhousesList.find(w => Number(w.id) === Number(row.workhouse?.id)) : null;
        setWorkhouse(selectedWorkhouse ? Number(selectedWorkhouse.id) : null);
        setDocDate(new Date(row.docDate));

        const itemsToEdit = row.invoiceDetails.map(detail => {
            const fullItem = itemsList.find(item => item.id === detail.item.id);
            const detailProvider = providers.find(p => Number(p.id) === Number(detail.provider?.id));
            const orderDetailId = (detail.orderDetail && detail.orderDetail.id) ? detail.orderDetail.id : null;
            return {
                id: detail.id,
                item: fullItem ? fullItem.id : '',
                unit: fullItem?.unit,
                quantity: cleanAndConvertNumber(detail.quantity),
                price: cleanAndConvertNumber(detail.price),
                discountPercent: cleanAndConvertNumber(detail.discountPercent),
                discountAmount: cleanAndConvertNumber(detail.discountAmount),
                description: detail.description,
                orderDetailId: orderDetailId,
                providerId: detailProvider?.id,
                firm: detailProvider ? !!detailProvider.firm : undefined
            };
        });
        setIsFormVisible(true);
        setInvoiceItems(itemsToEdit);
    };

    // ===== Menu & actions =====
    const handleSelectVehicle = () => {
        const vehicle = vehiclesList.find(v => v.id === tempSelectedVehicle);
        if (vehicle) { setSelectedVehicle(vehicle.id); setSelectedVehicleName(`${vehicle.name} (${vehicle.plaque})`); }
        setOpenVehicleModal(false);
    };
    const handleOpenVehicleModal = () => setOpenVehicleModal(true);
    const handleStatusFilterChange = (_e: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'pending' | 'approved' | 'rejected' | null) => {
        if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); }
    };
    const handleChangePage = (_e: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); setPage(0); };
    const handleRequestSort = (property: SortableInvoiceKeys) => {
        const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    };
    const handleOpenModal = (details: InvoiceDetailType[], provider: { id: string; name: string; firm: boolean } | null) => {
        const detailsWithProvider = details.map(detail => ({ ...detail, provider: detail.provider || provider }));
        setModalDetails(detailsWithProvider); setOpenModal(true);
    };
    const handleCloseModal = () => setOpenModal(false);
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: InvoiceType) => { setAnchorEl(event.currentTarget); setSelectedInvoiceForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedInvoiceForMenu(null); };
    const handleClickOpenDeleteModal = (id: number, name: string) => { setInvoiceIdToDelete(id); setInvoiceProviderToDelete(name); setOpenDeleteModal(true); handleCloseMenu(); };
    const handleClickCloseDeleteModal = () => { setOpenDeleteModal(false); setInvoiceIdToDelete(null); setInvoiceProviderToDelete(''); };
    const handleClickOpenStatusModal = (id: number, action: 'approve' | 'reject') => {
        setStatusToUpdate(action === 'approve' ? 1 : 2);
        setIdRow(id); setDescription(''); setOpenStatusModal(true); handleCloseMenu();
    };
    const handleCloseStatusModal = () => { setOpenStatusModal(false); setStatusToUpdate(null); setDescription(''); setStatusError(false); };
    const handleUpdateStatus = async () => {
        if (!description.trim()) { setStatusError(true); showAlert('Lütfen bir açıklama giriniz.', 'warning'); return; }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = { id: Number(idRow), status: statusToUpdate, description: description.trim() };
            const response = await axios.put(server.baseurl + server.initialoperations + "update-invoice-status",
                payload, { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) { showAlert('Sipariş durumu başarıyla güncellendi!', 'success'); getInvoices(); }
            else { showAlert(response.data.message || 'Sipariş durumu güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Sipariş durumu güncellenirken bir hata oluştu.', 'error'); }
        } finally { handleCloseStatusModal(); getInvoices(); }
    };

    const handleOpenStatusHistoryModal = (invoice: InvoiceType) => { setStatusHistoryData(invoice.invoiceHeaderStatusHistories); setOpenStatusHistoryModal(true); };
    const handleCloseStatusHistoryModal = () => { setOpenStatusHistoryModal(false); setStatusHistoryData([]); };

    // Downloads
    const handleOpenRowDownloadModal = (invoice: InvoiceType) => { setSelectedInvoiceForDownload(invoice); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedInvoiceForDownload(null); };

    const addExcelCompanyInfo = (worksheet: Excel.Worksheet, startRow: number) => {
        const companyInfo = [
            'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
            'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
            'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
        ];
        let rowNum = startRow;
        companyInfo.forEach(line => {
            const row = worksheet.getRow(rowNum);
            row.getCell(1).value = line;
            row.getCell(1).alignment = { horizontal: 'center' };
            row.getCell(1).font = { name: 'Arial', size: 8, bold: false };
            worksheet.mergeCells(`A${rowNum}:${worksheet.columns.length > 0 ? String.fromCharCode(65 + worksheet.columns.length - 1) : 'A'}${rowNum}`);
            rowNum++;
        });
    };

    const exportToPdf = (invoice: InvoiceType) => {
        const doc = new jsPDF();
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        const rows = invoice.invoiceDetails.map(detail => [
            detail.provider?.name || invoice.provider?.name || '-',
            detail.firm ? 'Şirket İçi' : 'Şirket Dışı',
            detail.item?.name || '-',
            Number(detail.quantity).toFixed(2) || '-',
            detail.item?.unit?.title || '-',
            cleanAndFormatPrice(detail.price),
            Number(detail.discountPercent).toFixed(2) || '-',
            cleanAndFormatPrice(detail.discountAmount),
            detail.description || '-',
        ]);

        autoTable(doc, {
            startY: 80,
            head: [['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama']],
            body: rows,
            theme: 'grid',
            styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 25 }, 1: { cellWidth: 20 }, 2: { cellWidth: 30 },
                3: { cellWidth: 15 }, 4: { cellWidth: 15 }, 5: { cellWidth: 20 },
                6: { cellWidth: 20 }, 7: { cellWidth: 25 }, 8: { cellWidth: 'auto' },
            },
            didDrawPage: () => {
                addPdfHeader(doc, `Fatura Detayları`);
                doc.setFont('Arial'); doc.setFontSize(10);
                doc.text(`Fatura No: ${invoice.invoiceNo || '-'}`, 15, 47);
                const hasOrder = invoice.invoiceDetails.some(detail => detail.orderDetail);
                doc.text(`Tedarik Tipi: ${hasOrder ? 'Siparişli Fatura' : 'Siparişsiz Fatura'}`, 15, 54);
                doc.text(`Sürücü: ${invoice.driver?.name || ''} ${invoice.driver?.family || ''}`, 15, 61);
                doc.text(`Şantiye: ${invoice.workhouse?.name || '-'}`, 15, 68); // changed
                doc.text(`Tarih: ${formatDateDisplay(invoice.docDate)}`, 15, 75);
                addPdfFooter(doc);
            },
            showHead: 'everyPage',
            margin: { top: 80, bottom: 45 }
        });

        const finalY = (doc as any).lastAutoTable.finalY;
        const totalQuantities = new Map<string, number>();
        const totalPrices = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.price), 0);
        const totalDiscountAmounts = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.discountAmount), 0);

        invoice.invoiceDetails.forEach(detail => {
            if (detail.item?.unit?.title) {
                const unitTitle = detail.item.unit.title;
                const currentTotal = totalQuantities.get(unitTitle) || 0;
                totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
            }
        });

        const summaryRows: any[] = [];
        Array.from(totalQuantities.entries()).forEach(([unit, total]) => { summaryRows.push([`Toplam Miktar (${unit})`, total.toFixed(2)]); });
        if (totalPrices > 0) summaryRows.push([`Toplam Fiyat`, cleanAndFormatPrice(totalPrices)]);
        if (totalDiscountAmounts > 0) summaryRows.push([`Toplam İndirim Miktarı`, cleanAndFormatPrice(totalDiscountAmounts)]);

        if (summaryRows.length > 0) {
            autoTable(doc, {
                startY: finalY + 10,
                head: [['Tür', 'Toplam']],
                body: summaryRows,
                theme: 'grid',
                styles: { font: 'Arial', fontSize: 10, fontStyle: 'normal' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                columnStyles: { 0: { halign: 'right' } }
            });
        }

        doc.save(`Fatura_${invoice.id}.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    };

    const exportToExcel = (invoice: InvoiceType) => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(`Fatura_${invoice.id}`);
        worksheet.views = [{ rightToLeft: false }];

        worksheet.addRow(['Fatura Detayları']).font = { name: 'Arial', size: 12, bold: true };
        worksheet.mergeCells('A1:I1');
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
        worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: false };
        worksheet.getCell('A2').alignment = { horizontal: 'left' };
        worksheet.addRow([]);

        worksheet.addRow(['Fatura No', invoice.invoiceNo || '-']);
        worksheet.addRow(['Sürücü', `${invoice.driver?.name || ''} ${invoice.driver?.family || ''}`]);
        worksheet.addRow(['Şantiye', invoice.workhouse?.name || '-']); // changed
        worksheet.addRow(['Tarih', formatDateDisplay(invoice.docDate)]);
        worksheet.addRow([]);

        const tableHeaders = ['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama'];
        const headerRow = worksheet.addRow(tableHeaders);
        headerRow.font = { name: 'Arial', bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        invoice.invoiceDetails.forEach(detail => {
            worksheet.addRow([
                detail.provider?.name || invoice.provider?.name || '-',
                detail.firm ? 'Şirket İçi' : 'Şirket Dışı',
                detail.item?.name || '-',
                Number(detail.quantity),
                detail.item?.unit?.title || '-',
                cleanAndFormatPrice(detail.price),
                Number(detail.discountPercent),
                cleanAndFormatPrice(detail.discountAmount),
                detail.description || '-'
            ]).eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        worksheet.columns.forEach((column) => {
            let maxLength = 0;
            if (column && typeof (column as any).eachCell === 'function') {
                (column as any).eachCell({ includeEmpty: true }, (cell: any) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) maxLength = columnLength;
                });
            }
            (column as any).width = Math.min(Math.max(maxLength + 2, 15), 50);
        });

        const totalQuantities = new Map<string, number>();
        const totalPrices = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.price), 0);
        const totalDiscountAmounts = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.discountAmount), 0);

        if (invoice.invoiceDetails.length > 0) {
            invoice.invoiceDetails.forEach(detail => {
                if (detail.item?.unit?.title) {
                    const unitTitle = detail.item.unit.title;
                    const currentTotal = totalQuantities.get(unitTitle) || 0;
                    totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
                }
            });
            worksheet.addRow([]);
            worksheet.addRow(['Toplam Miktarlar ve Fiyatlar']).font = { name: 'Arial', size: 12, bold: true };
            const summaryHeaders = ['Tür', 'Toplam'];
            const summaryHeaderRow = worksheet.addRow(summaryHeaders);
            summaryHeaderRow.font = { name: 'Arial', bold: true };
            summaryHeaderRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            Array.from(totalQuantities.entries()).forEach(([unit, total]) => {
                worksheet.addRow([`Toplam Miktar (${unit})`, total.toFixed(2)]);
            });
            worksheet.addRow(['Toplam Fiyat', cleanAndFormatPrice(totalPrices)]);
            worksheet.addRow(['Toplam İndirim Miktarı', cleanAndFormatPrice(totalDiscountAmounts)]);
        }

        const startRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 1;
        addExcelCompanyInfo(worksheet, startRow);

        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), `Fatura_${invoice.id}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        });
    };

    const exportAllDetailedPdf = (isFiltered: boolean) => {
        const dataToExport = isFiltered ? sortedAndFilteredInvoices : invoicesList;
        if (dataToExport.length === 0) { showAlert('PDF oluşturulacak fatura bulunamadı.', 'warning'); return; }

        const doc = new jsPDF();
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        const header = (invoice: InvoiceType) => {
            addPdfHeader(doc, 'Fatura Raporu');
            const hasOrder = invoice.invoiceDetails.some(detail => detail.orderDetail);
            const supplyType = hasOrder ? 'Siparişli Fatura' : 'Siparişsiz Fatura';
            doc.setFontSize(10);
            doc.text(`Fatura No: ${invoice.invoiceNo || '-'}`, 15, 47);
            doc.text(`Tedarik Tipi: ${supplyType}`, 15, 54);
            doc.text(`Sürücü: ${invoice.driver?.name || ''} ${invoice.driver?.family || ''}`, 15, 61);
            doc.text(`Şantiye: ${invoice.workhouse?.name || '-'}`, 15, 68); // changed
            doc.text(`Tarih: ${formatDateDisplay(invoice.docDate)}`, 15, 75);
        };
        const footer = () => addPdfFooter(doc);

        try {
            dataToExport.forEach((invoice, index) => {
                if (index > 0) doc.addPage();
                const rows = invoice.invoiceDetails.map(detail => [
                    detail.provider?.name || invoice.provider?.name || '-',
                    detail.firm ? 'Şirket İçi' : 'Şirket Dışı',
                    detail.item?.name || '-',
                    Number(detail.quantity).toFixed(2) || '-',
                    detail.item?.unit?.title || '-',
                    cleanAndFormatPrice(detail.price),
                    Number(detail.discountPercent).toFixed(2) || '-',
                    cleanAndFormatPrice(detail.discountAmount),
                    detail.description || '-',
                ]);

                autoTable(doc, {
                    startY: 80,
                    head: [['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama']],
                    body: rows,
                    theme: 'grid',
                    styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                    columnStyles: {
                        0: { cellWidth: 25 }, 1: { cellWidth: 20 }, 2: { cellWidth: 30 },
                        3: { cellWidth: 15 }, 4: { cellWidth: 15 }, 5: { cellWidth: 20 },
                        6: { cellWidth: 20 }, 7: { cellWidth: 25 }, 8: { cellWidth: 'auto' },
                    },
                    didDrawPage: () => { header(invoice); footer(); },
                    showHead: 'everyPage',
                    margin: { top: 80, bottom: 45 }
                });

                const finalY = (doc as any).lastAutoTable.finalY;
                const totalQuantities = new Map<string, number>();
                const totalPrices = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.price), 0);
                const totalDiscountAmounts = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.discountAmount), 0);
                invoice.invoiceDetails.forEach(detail => {
                    if (detail.item?.unit?.title) {
                        const unitTitle = detail.item.unit.title;
                        const currentTotal = totalQuantities.get(unitTitle) || 0;
                        totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
                    }
                });

                const summaryRows: any[] = [];
                Array.from(totalQuantities.entries()).forEach(([unit, total]) => { summaryRows.push([`Toplam Miktar (${unit})`, total.toFixed(2)]); });
                if (totalPrices > 0) summaryRows.push([`Toplam Fiyat`, cleanAndFormatPrice(totalPrices)]);
                if (totalDiscountAmounts > 0) summaryRows.push([`Toplam İndirim Miktarı`, cleanAndFormatPrice(totalDiscountAmounts)]);
                if (summaryRows.length > 0) {
                    autoTable(doc, {
                        startY: finalY + 10,
                        body: summaryRows,
                        theme: 'grid',
                        styles: { font: 'Arial', fontSize: 10, fontStyle: 'normal' },
                        columnStyles: { 0: { halign: 'right' } }
                    });
                }
            });
            doc.save(isFiltered ? `Filtrelenmis_Faturalar.pdf` : `Tum_Faturalar.pdf`);
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch {
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const exportAllExcel = (isFiltered: boolean) => {
        const dataToExport = isFiltered ? sortedAndFilteredInvoices : invoicesList;
        if (dataToExport.length === 0) { showAlert('Excel oluşturulacak fatura bulunamadı.', 'warning'); return; }
        const workbook = new Excel.Workbook();

        dataToExport.forEach((invoice) => {
            const worksheet = workbook.addWorksheet(`Fatura_${invoice.id}`);
            worksheet.views = [{ rightToLeft: false }];

            worksheet.addRow(['Fatura Detayları']).font = { name: 'Arial', size: 12, bold: true };
            worksheet.mergeCells('A1:I1');
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: false };
            worksheet.getCell('A2').alignment = { horizontal: 'left' };
            worksheet.addRow([]);

            worksheet.addRow(['Fatura No', invoice.invoiceNo || '-']);
            worksheet.addRow(['Sürücü', `${invoice.driver?.name || ''} ${invoice.driver?.family || ''}`]);
            worksheet.addRow(['Şantiye', invoice.workhouse?.name || '-']); // changed
            worksheet.addRow(['Tarih', formatDateDisplay(invoice.docDate)]);
            worksheet.addRow([]);

            const tableHeaders = ['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.font = { name: 'Arial', bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            invoice.invoiceDetails.forEach(detail => {
                worksheet.addRow([
                    detail.provider?.name || invoice.provider?.name || '-',
                    detail.firm ? 'Şirket İçi' : 'Şirket Dışı',
                    detail.item?.name || '-',
                    Number(detail.quantity),
                    detail.item?.unit?.title || '-',
                    cleanAndFormatPrice(detail.price),
                    Number(detail.discountPercent),
                    cleanAndFormatPrice(detail.discountAmount),
                    detail.description || '-'
                ]).eachCell(cell => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                if (column && typeof (column as any).eachCell === 'function') {
                    (column as any).eachCell({ includeEmpty: true }, (cell: any) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) maxLength = columnLength;
                    });
                }
                (column as any).width = Math.min(Math.max(maxLength + 2, 15), 50);
            });

            const totalQuantities = new Map<string, number>();
            const totalPrices = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.price), 0);
            const totalDiscountAmounts = invoice.invoiceDetails.reduce((sum, d) => sum + cleanAndConvertNumber(d.discountAmount), 0);

            if (invoice.invoiceDetails.length > 0) {
                invoice.invoiceDetails.forEach(detail => {
                    if (detail.item?.unit?.title) {
                        const unitTitle = detail.item.unit.title;
                        const currentTotal = totalQuantities.get(unitTitle) || 0;
                        totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
                    }
                });
                worksheet.addRow([]);
                worksheet.addRow(['Toplam Miktarlar ve Fiyatlar']).font = { name: 'Arial', size: 12, bold: true };
                const summaryHeaders = ['Tür', 'Toplam'];
                const summaryHeaderRow = worksheet.addRow(summaryHeaders);
                summaryHeaderRow.font = { name: 'Arial', bold: true };
                summaryHeaderRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

                Array.from(totalQuantities.entries()).forEach(([unit, total]) => {
                    worksheet.addRow([`Toplam Miktar (${unit})`, total.toFixed(2)]);
                });
                worksheet.addRow(['Toplam Fiyat', cleanAndFormatPrice(totalPrices)]);
                worksheet.addRow(['Toplam İndirim Miktarı', cleanAndFormatPrice(totalDiscountAmounts)]);
            }

            const startRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 1;
            addExcelCompanyInfo(worksheet, startRow);
        });

        workbook.xlsx.writeBuffer().then(buffer => {
            const fileName = isFiltered ? `Filtrelenmis_Faturalar.xlsx` : `Tum_Faturalar.xlsx`;
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        });
    };

    // Download modals
    const handleOpenDownloadAllModal = () => setOpenDownloadAllModal(true);
    const handleCloseDownloadAllModal = () => setOpenDownloadAllModal(false);
    const handleOpenDownloadFilteredModal = () => setOpenDownloadFilteredModal(true);
    const handleCloseDownloadFilteredModal = () => setOpenDownloadFilteredModal(false);
    const handleRowDownload = (format: 'pdf' | 'excel') => {
        if (selectedInvoiceForDownload) {
            if (format === 'pdf') exportToPdf(selectedInvoiceForDownload);
            else exportToExcel(selectedInvoiceForDownload);
        }
        handleCloseRowDownloadModal();
    };

    // Table filtering/sorting
    const filteredInvoices = invoicesList.filter(invoice => {
        const providerName = invoice.provider?.name || '';
        const driverName = invoice.driver?.name || '';
        const invoiceNo = invoice.invoiceNo || '';
        const matchesSearch =
            providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'pending' && invoice.status === 0) ||
            (statusFilter === 'approved' && invoice.status === 1) ||
            (statusFilter === 'rejected' && invoice.status === 2);

        const createDate = new Date(invoice.docDate);
        const matchesDate =
            (!startDate || createDate >= startDate) &&
            (!endDate || createDate <= endDate);

        return matchesSearch && matchesStatus && matchesDate;
    });
    const sortedAndFilteredInvoices = stableSort(filteredInvoices, getComparator(order, orderBy));
    const paginatedInvoices = sortedAndFilteredInvoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const isFormComplete = useMemo(() => {
        const mainOk = driver && docDate && workhouse != null && selectedVehicle != null;
        const itemsOk = invoiceItems.length > 0 && !invoiceItems.some(item => !item.item || item.quantity <= 0 || item.price <= 0 || isNaN(item.quantity) || isNaN(item.price));
        return Boolean(mainOk && itemsOk);
    }, [driver, docDate, workhouse, invoiceItems, selectedVehicle]);

    const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };

    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h6" mb={2}>Fatura Detayları</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Fatura Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} fullWidth={false}>
                                Yeni Fatura Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button variant="contained" color="error" onClick={resetForm} fullWidth={false} startIcon={<IconX size={20} />}>
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Stack>

            {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <CustomFormLabel htmlFor="driver-autocomplete" required>Sürücü</CustomFormLabel>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Autocomplete<DriverType>
                                    id="driver-autocomplete"
                                    options={drivers}
                                    getOptionLabel={(option) => `${option.name} ${option.family}`}
                                    value={drivers.find(d => d.id === driver) || null}
                                    onChange={(_event, newValue) => {
                                        const newDriverId = newValue ? newValue.id : '';
                                        setDriver(newDriverId);
                                        setSelectedVehicle(null);
                                        setSelectedVehicleName(null);
                                        setVehiclesList([]);
                                        if (newDriverId) fetchVehicles(newDriverId);
                                    }}
                                    renderInput={(params) => <TextField {...params} label="Sürücü Seçin" variant="outlined" size="small" />}
                                    sx={{ flexGrow: 1 }}
                                />
                                {selectedVehicleName && (vehiclesList.length > 1) && (
                                    <IconButton onClick={handleOpenVehicleModal} size="small" aria-label="Araç değiştir">
                                        <IconPencil size={20} />
                                    </IconButton>
                                )}
                            </Stack>
                            {selectedVehicleName && (<Chip sx={{ mt: 2 }} label={selectedVehicleName} color="primary" variant="outlined" />)}
                        </Grid>

                        {/* Şantiye */}
                        <Grid item xs={12} md={4}>
                            <CustomFormLabel htmlFor="workhouse-autocomplete" required>Şantiye</CustomFormLabel>
                            <Autocomplete<WorkhouseType>
                                id="workhouse-autocomplete"
                                options={workhousesList}
                                getOptionLabel={(option) => option.name}
                                value={workhousesList.find(w => Number(w.id) === Number(workhouse)) || null}
                                onChange={(_event, newValue) => setWorkhouse(newValue ? Number(newValue.id) : null)}
                                renderInput={(params) => <TextField {...params} label="Şantiye Seçin" variant="outlined" size="small" />}
                            />
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <CustomFormLabel htmlFor="doc-date" required>Tarihi</CustomFormLabel>
                                <DatePicker
                                    value={docDate}
                                    onChange={(newValue) => setDocDate(newValue)}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => <TextField {...params} size="small" sx={{ width: "100%" }} />}
                                />
                            </LocalizationProvider>
                        </Grid>
                    </Grid>

                    <StoreInvoiceItemsTable
                        items={invoiceItems}
                        itemsList={itemsList}
                        onAddItem={handleAddInvoiceItem}
                        onRemoveItem={handleRemoveInvoiceItem}
                        onUpdateItem={handleUpdateInvoiceItem}
                        providersList={providers}
                        workhouseId={workhouse}   // <<<<<< changed prop name
                    />

                    <Box mt={3} textAlign="right">
                        {editingId ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button variant="contained" color="info" onClick={handleUpdateInvoice}>Düzenle</Button>
                                <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                            </Stack>
                        ) : (
                            <>
                                {hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled && hasUnsavedChanges ? "tüm değişiklikleri kaydetmek için buraya tıklayın" : ""} placement="right">
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleSaveInvoice}
                                            disabled={!isFormComplete}
                                            sx={{ animation: isFormComplete ? `${blinkAnimation} 1.5s infinite` : 'none' }}
                                        >
                                            Faturayı Kaydet
                                        </Button>
                                    </CustomTooltip>
                                )}
                            </>
                        )}
                    </Box>
                </Paper>
            )}

            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}

            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Fatura indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleOpenDownloadFilteredModal}
                                    isBlinking={true}
                                    disabled={loadingData}
                                    startIcon={<IconFileDownload />}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tümünü Fatura indirin" : ""}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleOpenDownloadAllModal}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Fatura Listesi</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={2}>
                            <TextField
                                label="Fatura Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={5}>
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

                        <Grid item xs={12} sm={6} md={5}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Status filter"
                                fullWidth
                            >
                                <StyledToggleButton value="all" aria-label="all invoices">Tümü</StyledToggleButton>
                                <StyledToggleButton value="pending" aria-label="pending invoices">Beklemede</StyledToggleButton>
                                <StyledToggleButton value="approved" aria-label="approved invoices">Onaylandı</StyledToggleButton>
                                <StyledToggleButton value="rejected" aria-label="rejected invoices">Reddedildi</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>

                <TableContainer component={Paper}>
                    <Table aria-label="invoice table">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'invoiceNo'} direction={orderBy === 'invoiceNo' ? order : 'asc'} onClick={() => handleRequestSort('invoiceNo')}>
                                        <Typography variant="h6">Fatura No</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'driver.name'} direction={orderBy === 'driver.name' ? order : 'asc'} onClick={() => handleRequestSort('driver.name')}>
                                        <Typography variant="h6">Sürücü</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <Typography variant="h6">Şantiye</Typography>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                        <Typography variant="h6">Tarihi</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <Typography variant="h6">Kayıt Tipi</Typography>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleRequestSort('status')}>
                                        <Typography variant="h6">Durum</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell><Typography variant="h6">Ürün Detayları</Typography></StyledTableCell>
                                <StyledTableCell align="right"><Typography variant="h6">İşlemler</Typography></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow>
                                    <StyledTableCell colSpan={8} align="center"><CircularProgress /></StyledTableCell>
                                </TableRow>
                            ) : (
                                paginatedInvoices.length > 0 ? (
                                    paginatedInvoices.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.invoiceNo || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.driver?.name || ''} {row.driver?.family || ''}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.workhouse?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Chip
                                                    label={row.invoiceDetails.some(detail => detail.orderDetail) ? "Siparişli" : "Siparişsiz"}
                                                    color={row.invoiceDetails.some(detail => detail.orderDetail) ? "success" : "default"}
                                                    size="small"
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Chip
                                                    label={row.status === 0 ? "Beklemede" : row.status === 1 ? "Onaylandı" : "Reddedildi"}
                                                    color={row.status === 0 ? "warning" : row.status === 1 ? "success" : "error"}
                                                />
                                                {row.invoiceHeaderStatusHistories && row.invoiceHeaderStatusHistories.length > 0 && (
                                                    <CustomTooltip title="Durum geçmişini gör" placement="right">
                                                        <IconButton size="small" onClick={() => handleOpenStatusHistoryModal(row)} aria-label="Durum geçmişi">
                                                            <IconInfoCircle size={18} />
                                                        </IconButton>
                                                    </CustomTooltip>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.invoiceDetails, row.provider)}>
                                                    Görünüm
                                                </Button>
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                <IconButton
                                                    id={`basic-button-${row.id}`}
                                                    aria-controls={Boolean(anchorEl) ? 'basic-menu' : undefined}
                                                    aria-haspopup="true"
                                                    aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                                                    onClick={(event) => handleClickMenu(event, row)}
                                                    aria-label="Seçenekler"
                                                >
                                                    <IconDots size={20} />
                                                </IconButton>
                                                <Menu
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={Boolean(anchorEl) && selectedInvoiceForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                                >
                                                    {hasStatusPermission && selectedInvoiceForMenu?.status === 0 && (
                                                        <>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı onaylayın" : ""}>
                                                                <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                    <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı reddedin" : ""}>
                                                                <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                    <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                        </>
                                                    )}
                                                    {hasStatusPermission && selectedInvoiceForMenu?.status === 1 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı reddedin" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasStatusPermission && selectedInvoiceForMenu?.status === 2 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı onaylayın" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı düzenleyin" : ""}>
                                                            <MuiMenuItem onClick={() => handleEditClick(row)}>
                                                                <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı silin" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenDeleteModal(row.id, row.provider?.name || '-')}>
                                                                <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Fatura dosyasını indir" : ""}>
                                                            <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
                                                                <ListItemIcon><IconFileDownload size={18} /></ListItemIcon> Bu satırı indir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={8} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç fatura bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sortedAndFilteredInvoices.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </BlankCard>

            {/* Details Modal */}
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
                <DialogTitle>Fatura Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="Fatura detayları tablosu">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Tedarikçi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Firma</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ürün Adı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Fiyat</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">İndirim %</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">İndirim Miktarı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.length > 0 ? (
                                    modalDetails.map((detail, index) => (
                                        <TableRow key={detail.id || index}>
                                            <StyledTableCell><Typography variant="body1">{detail.provider?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                {detail.provider?.firm !== undefined ? (
                                                    <Chip label={detail.provider.firm ? "Şirket İçi" : "Şirket Dışı"} color={detail.provider.firm ? "primary" : "secondary"} size="small" />
                                                ) : (<Typography variant="body1">-</Typography>)}
                                            </StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.quantity || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{cleanAndFormatPrice(detail.price) || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.discountPercent || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{cleanAndFormatPrice(detail.discountAmount) || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={9} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç detay bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Kapat</Button></DialogActions>
            </Dialog>

            {/* Vehicle Select */}
            <Dialog open={openVehicleModal} onClose={() => setOpenVehicleModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Araç Seçimi</DialogTitle>
                <DialogContent>
                    <RadioGroup
                        aria-label="vehicle-selection"
                        name="vehicle-selection"
                        value={tempSelectedVehicle}
                        onChange={(event) => setTempSelectedVehicle(Number(event.target.value))}
                    >
                        <Box sx={{ mt: 2 }}>
                            {vehiclesList.map((vehicle) => (
                                <FormControlLabel key={vehicle.id} value={vehicle.id} control={<Radio />} label={`${vehicle.name} (${vehicle.plaque})`} />
                            ))}
                        </Box>
                    </RadioGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenVehicleModal(false)} color="secondary">İptal</Button>
                    <Button onClick={handleSelectVehicle} variant="contained" disabled={tempSelectedVehicle === null}>Seç</Button>
                </DialogActions>
            </Dialog>

            {/* Status Update */}
            <Dialog open={openStatusModal} onClose={handleCloseStatusModal} maxWidth="sm" fullWidth>
                <DialogTitle>{statusToUpdate === 1 ? 'Onaylama Açıklaması' : 'Reddetme Açıklaması'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Açıklama" type="text" fullWidth multiline rows={4} variant="outlined"
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); if (statusError) setStatusError(false); }}
                        error={statusError} helperText={statusError && 'Bu alan zorunludur.'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusModal} color="secondary">İptal</Button>
                    <Button onClick={handleUpdateStatus} color="primary">Kaydet</Button>
                </DialogActions>
            </Dialog>

            {/* Status History */}
            <Dialog open={openStatusHistoryModal} onClose={handleCloseStatusHistoryModal} maxWidth="md" fullWidth>
                <DialogTitle><Typography variant="h5">Durum Geçmişi</Typography></DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="Durum geçmişi tablosu">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {statusHistoryData.length > 0 ? (
                                    statusHistoryData
                                        .sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime())
                                        .map((historyItem, index) => (
                                            <TableRow key={historyItem.id || index}>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(historyItem.createAt)}</Typography></StyledTableCell>
                                                <StyledTableCell>
                                                    <Chip
                                                        label={historyItem.status === 0 ? "Beklemede" : historyItem.status === 1 ? "Onaylandı" : "Reddedildi"}
                                                        color={historyItem.status === 0 ? "warning" : historyItem.status === 1 ? "success" : "error"}
                                                        size="small"
                                                    />
                                                </StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{historyItem.description || '-'}</Typography></StyledTableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={3} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Durum geçmişi bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseStatusHistoryModal}>Kapat</Button></DialogActions>
            </Dialog>

            {/* Delete */}
            <DeleteStoreInvoiceModal
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                invoiceIdToDelete={invoiceIdToDelete}
                invoiceProviderToDelete={invoiceProviderToDelete}
                onDeleteSuccess={getInvoices}
                showAlert={showAlert}
            />

            {/* Download All */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Faturaları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => { exportAllDetailedPdf(false); handleCloseDownloadAllModal(); }} startIcon={<IconFile />}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" onClick={() => { exportAllExcel(false); handleCloseDownloadAllModal(); }} startIcon={<IconFileSpreadsheet />}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Download Filtered */}
            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Faturaları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => { exportAllDetailedPdf(true); handleCloseDownloadFilteredModal(); }} startIcon={<IconFile />}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" onClick={() => { exportAllExcel(true); handleCloseDownloadFilteredModal(); }} startIcon={<IconFileSpreadsheet />}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadFilteredModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Download Row */}
            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => handleRowDownload('pdf')} startIcon={<IconFile />}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" onClick={() => handleRowDownload('excel')} startIcon={<IconFileSpreadsheet />}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListStoreInvoice;
