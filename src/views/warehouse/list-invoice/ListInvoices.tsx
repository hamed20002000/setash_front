import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    RadioGroup, FormControlLabel, Radio, Chip
} from '@mui/material';

import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { styled } from '@mui/material/styles';
import { IconDots, IconEye, IconEdit, IconTrash, IconSearch, IconFileInvoice, IconCheck, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import axios from 'axios';
import server from '../../../assets/address.json';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import InvoiceItemsTable from './InvoiceItemsTable';
import DeleteInvoiceModal from './DeleteInvoice';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Logo from 'src/assets/images/logos/logo.svg';

// Type Definitions
interface ProviderType {
    id: number;
    name: string;
    phoneNumber: string;
    address: string;
    firm: string;
    recordStatus: number;
    createAt: string;
    status: string;
    region: string | null;
}
interface DriverApiResponseType {
    id: string;
    name: string;
    recordStatus: number;
    internal: boolean;
}
interface DriverType { id: string; name: string; recordStatus: number; status: string; internal: string }
interface UnitType { id: string; title: string; recordStatus: number; createAt: string; }
interface ItemType { id: string; name: string; abbreviation: string; recordStatus: number; unit: UnitType; }
interface InvoiceItem {
    id: number;
    item: string;
    unit?: UnitType;
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    description: string;
}
interface InvoiceType {
    id: number;
    invoiceNo: string | null; // Fatura numarası
    provider: { id: string; name: string; } | null;
    driver: { id: string; name: string; } | null;
    warehouse?: { // `warehouse` nesnesini ekleyin
        id: string;
        name: string;
        code?: string;
        address?: string;
        createAt?: string;
        recordStatus?: number;
    } | null;
    docDate: string;
    totalAmount?: number;
    status: number;
    invoiceDetails: InvoiceDetailType[];
}
interface InvoiceDetailType {
    id: number;
    item: { id: string; name: string; unit: { title: string; }; };
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    description: string;
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

interface WarehouseType {
    id: number;
    name: string;
    recordStatus: number;
    description: string;
    status: string;
    createAt: string;
}

// Table Style and Functions
type SortableInvoiceKeys = 'invoiceNo' | 'provider.name' | 'driver.name' | 'docDate' | 'status' | 'totalAmount';

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
    const getNestedValue = (obj: any, path: string): any => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    const valA = getNestedValue(a, orderBy);
    const valB = getNestedValue(b, orderBy);

    if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
    if (valA === undefined || valA === null) return 1;

    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;

    return 0;
};

const getComparator = (order: 'asc' | 'desc', orderBy: SortableInvoiceKeys): (a: InvoiceType, b: InvoiceType) => number => {
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

const ListInvoices = () => {
    const navigate = useNavigate();
    const [providers, setProviders] = useState<ProviderType[]>([]);
    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);

    const [provider, setProvider] = useState<number | string | null>('');
    const [driver, setDriver] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Vehicle States
    const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
    const [openVehicleModal, setOpenVehicleModal] = useState<boolean>(false);
    const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);
    const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);

    // Table States
    const [invoicesList, setInvoicesList] = useState<InvoiceType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [orderBy, setOrderBy] = useState<SortableInvoiceKeys>('docDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedInvoiceForMenu, setSelectedInvoiceForMenu] = useState<InvoiceType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<InvoiceDetailType[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [invoiceIdToDelete, setInvoiceIdToDelete] = useState<number | null>(null);
    const [invoiceProviderToDelete, setInvoiceProviderToDelete] = useState<string>('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState<1 | 2 | null>(null);

    const [statusError, setStatusError] = useState(false);
    const [description, setDescription] = useState('');
    const [idRow, setIdRow] = useState(0);
    const { isTooltipGloballyEnabled } = useTooltip();

    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [warehouse, setWarehouse] = useState<number | null>(null);

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


    const handlePrintInvoice = (invoice: InvoiceType) => {
        if (!invoice) {
            console.error('Fatura verisi bulunamadı.');
            return;
        }

        // یک کانتینر موقت برای رندر کردن محتوای PDF ایجاد کنید
        const pdfContainer = document.createElement('div');
        pdfContainer.id = 'pdf-container';
        pdfContainer.style.width = '210mm';
        pdfContainer.style.fontFamily = 'Arial, sans-serif';
        pdfContainer.style.padding = '20mm';
        pdfContainer.style.boxSizing = 'border-box';
        pdfContainer.style.backgroundColor = 'white';

        // هدر PDF: لوگو، عنوان و اطلاعات فاکتور
        const header = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20mm;">
            <img src="${Logo}" style="height: 50px; width: auto;" />
            <div style="text-align: right;">
                <strong>Fatura No:</strong> ${invoice.invoiceNo || '-'}<br>
                <strong>Tedarikçi:</strong> ${invoice.provider?.name || '-'}<br>
                <strong>Sürücü:</strong> ${invoice.driver?.name || '-'}<br>
                <strong>Depo:</strong> ${invoice.warehouse?.name || '-'}
            </div>
        </div>
    `;

        // جدول اقلام فاکتور
        const tableHeader = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10mm;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ürün Adı</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Miktar</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Birim</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Fiyat</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">İndirim %</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">İndirim Miktarı</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Açıklama</th>
                </tr>
            </thead>
            <tbody>
    `;

        // داده‌های جدول را با ستون‌های جدید پر کنید
        const tableRows = invoice.invoiceDetails.map(detail => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${detail.item?.name || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${detail.quantity}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${detail.item?.unit?.title || '-'}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${cleanAndFormatPrice(detail.price)}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${detail.discountPercent}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${cleanAndFormatPrice(detail.discountAmount)}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${detail.description || '-'}</td>
        </tr>
    `).join('');

        const tableFooter = `
            </tbody>
        </table>
    `;

        // فوتر PDF
        const footer = `
        <div style="border-top: 1px solid black; margin-top: 50mm; padding-top: 10mm; display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="text-align: left;">
                <strong>Tarih:</strong> ${format(new Date(), 'dd MMMM yyyy', { locale: tr })}
            </div>
            <div style="text-align: right;">
                <strong>İmza</strong>
            </div>
        </div>
    `;

        // محتوا را به کانتینر موقت اضافه کنید
        pdfContainer.innerHTML = header + tableHeader + tableRows + tableFooter + footer;

        // کانتینر را به صورت موقت به بدنه صفحه اضافه کنید
        document.body.appendChild(pdfContainer);

        // html2canvas را اجرا کنید
        html2canvas(pdfContainer, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Fatura_${invoice.id}.pdf`);

            // کانتینر موقت را حذف کنید
            document.body.removeChild(pdfContainer);
        });
    };


    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };
    const clearAlert = () => { setAlertMessage(null); };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) { timer = setTimeout(() => { clearAlert(); }, 5000); }
        return () => { clearTimeout(timer); };
    }, [alertMessage]);

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

                if (activeVehicles.length === 1) {
                    setSelectedVehicle(activeVehicles[0].id);
                    setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
                } else if (activeVehicles.length > 1) {
                    setOpenVehicleModal(true);
                    setTempSelectedVehicle(activeVehicles[0].id);
                } else {
                    setSelectedVehicle(null);
                    setSelectedVehicleName(null);
                    showAlert('Bu sürücünün aktif aracı yok.', 'warning');
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
                const activeProviders = allProviders.filter((item: any) => item.recordStatus === 0);
                const providersWithStatus = activeProviders.map((item: any) => ({
                    id: Number(item.id),
                    name: item.name || '',
                    phoneNumber: item.phone || '',
                    address: item.address || '',
                    firm: item.firm ? '1' : '0',
                    recordStatus: item.recordStatus,
                    createAt: item.createAt,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    region: item.region
                }));
                setProviders(providersWithStatus);
            } else {
                showAlert(response.data.message || 'Sağlayıcılar yüklenirken bir hata oluştu.', 'error');
                setProviders([]);
            }
        } catch (e: any) {
            showAlert('Sağlayıcılar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    const fetchDrivers = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-drivers", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const allDrivers = response.data.data as DriverApiResponseType[];
                const activeDrivers = allDrivers.filter(item => item.recordStatus === 0);
                const driversWithStatus = activeDrivers.map((item) => ({
                    id: item.id,
                    name: item.name || '',
                    recordStatus: item.recordStatus,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                    internal: item.internal ? '1' : '0'
                }));
                setDrivers(driversWithStatus);
            } else {
                showAlert(response.data.message || 'Sürücüler yüklenirken bir hata oluştu.', 'error');
                setDrivers([]);
            }
        } catch (e: any) {
            showAlert('Sürücüler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    const getInvoices = useCallback(async () => {
        debugger
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-invoices", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setInvoicesList(response.data.data as InvoiceType[]);
            } else { showAlert(response.data.message || 'Faturalar yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert('Faturalar yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    const getItems = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data && response.data.success) {
                setItemsList(response.data.data.filter((item: ItemType) => item.recordStatus === 0));
            } else { showAlert('Ürünler yüklenmedi.', 'error'); }
        } catch (e) { showAlert('Ürünler sunucudan alınamadı', 'error'); }
    }, [navigate, showAlert]);

    const fetchWarehouses = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });

            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const allWarehouses = response.data.data as WarehouseType[];
                // فیلتر کردن انبارهای فعال
                const activeWarehouses = allWarehouses.filter(item => item.recordStatus === 0);

                const WarehousesWithStatus = activeWarehouses.map((item) => ({
                    ...item,
                    status: 'Aktif'
                }));
                setWarehousesList(WarehousesWithStatus);
            } else {
                showAlert(response.data.message || 'İşler yüklenirken bir hata oluştu.', 'error');
                setWarehousesList([]);
            }
        } catch (e: any) {
            showAlert('İşler yüklenirken bir hata oluştu.', 'error');
            setWarehousesList([]);
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    useEffect(() => {
        getInvoices();
        fetchProviders();
        fetchDrivers();
        fetchWarehouses();
        getItems();
    }, []);

    const handleAddInvoiceItem = (newItem: InvoiceItem) => {
        setInvoiceItems(prevItems => [...prevItems, newItem]);
    };

    const handleUpdateInvoiceItem = (updatedItem: InvoiceItem) => {
        setInvoiceItems(prevItems =>
            prevItems.map(item =>
                item.id === updatedItem.id ? updatedItem : item
            )
        );
    };

    const handleRemoveInvoiceItem = (id: number) => {
        setInvoiceItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    const validateForm = (): boolean => {
        if (!provider || !driver || !docDate || !warehouse) { // اضافه کردن !warehouse
            showAlert('Lütfen tüm zorunlu alanları (Tedarikçi, Sürücü, Depo, Tarih) doldurun.', 'warning');
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
        setProvider('');
        setDriver('');
        setDocDate(new Date());
        setInvoiceItems([]);
        setEditingId(null);
        setSelectedVehicle(null);
        setSelectedVehicleName(null);
        setVehiclesList([]);
        clearAlert();
    };

    const handleSaveInvoice = async () => {
        if (!validateForm()) return;

        const invoiceData = {
            docDate: docDate?.toISOString(),
            providerId: Number(provider),
            status: 0,
            statusDescription: '',
            driverId: Number(driver),
            warehouseId: Number(warehouse),
            driverVehicleId: Number(selectedVehicle),
            invoiceDetails: invoiceItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                price: (item.price).toFixed(2),
                discountPercent: (item.discountPercent).toFixed(2),
                discountAmount: (item.discountAmount).toFixed(2),
                description: item.description,
                orderDetailId: null
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-invoice", invoiceData,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                resetForm();
                getInvoices();
                showAlert('Fatura başarıyla kaydedildi!', 'success');
            } else { showAlert(response.data.message || 'Fatura kaydedilirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else {
                showAlert('Fatura kaydedilirken bir hata oluştu.', 'error');
            }
        }
    };

    const handleUpdateInvoice = async () => {
        if (!validateForm() || !editingId) return;

        const invoiceData = {
            docDate: docDate?.toISOString(),
            providerId: Number(provider),
            driverId: Number(driver),
            warehouseId: Number(warehouse),
            driverVehicleId: Number(selectedVehicle),
            invoiceDetails: invoiceItems.map(item => ({
                itemId: Number(item.item),
                quantity: Number(item.quantity),
                price: (item.price).toFixed(2),
                discountPercent: (item.discountPercent).toFixed(2),
                discountAmount: (item.discountAmount).toFixed(2),
                description: item.description
            }))
        }; debugger
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-invoice", invoiceData,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Fatura başarıyla güncellendi!', 'success');
                resetForm();
                getInvoices();
                showAlert('Fatura başarıyla güncellendi!', 'success');
            } else { showAlert(response.data.message || 'Fatura güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else {
                showAlert('Fatura güncellenirken bir hata oluştu.', 'error');
            }

        }
    };

    const handleEditClick = (row: InvoiceType) => {
        setEditingId(row.id);
        const providerIdAsNumber = row.provider?.id ? Number(row.provider.id) : null;
        const selectedProvider = providers.find(p => p.id === providerIdAsNumber);
        if (selectedProvider) {
            setProvider(selectedProvider.id.toString());
        } else {
            setProvider('');
        }
        const selectedDriver = row.driver ? drivers.find(d => d.id === row.driver?.id) : null;
        if (selectedDriver) setDriver(selectedDriver.id);
        else setDriver('');
        const selectedWarehouse = warehousesList.find(w => w.id === Number(row.warehouse?.id));
        if (selectedWarehouse) {
            setWarehouse(selectedWarehouse.id);
        } else {
            setWarehouse(null);
        }
        setDocDate(new Date(row.docDate));

        // تابع کمکی برای پاک کردن کاراکترهای غیرعددی
        const cleanAndConvertNumber = (value: string | number | undefined): number => {
            if (typeof value === 'string') {
                const cleanedString = value.replace(/[$,]/g, '');
                const numberValue = Number(cleanedString);
                return isNaN(numberValue) ? 0 : numberValue;
            }
            return value ?? 0;
        };

        const itemsToEdit: InvoiceItem[] = row.invoiceDetails.map(detail => {
            const fullItem = itemsList.find(item => item.id === detail.item.id);
            return {
                id: detail.id,
                item: fullItem ? fullItem.id : '',
                unit: fullItem?.unit,
                quantity: cleanAndConvertNumber(detail.quantity),
                price: cleanAndConvertNumber(detail.price),
                discountPercent: cleanAndConvertNumber(detail.discountPercent),
                discountAmount: cleanAndConvertNumber(detail.discountAmount),
                description: detail.description,
            };
        });
        setInvoiceItems(itemsToEdit);
        handleCloseMenu();
        clearAlert();
    };

    const handleSelectVehicle = () => {
        const vehicle = vehiclesList.find(v => v.id === tempSelectedVehicle);
        if (vehicle) {
            setSelectedVehicle(vehicle.id);
            setSelectedVehicleName(`${vehicle.name} (${vehicle.plaque})`);
        }
        setOpenVehicleModal(false);
    };

    // Table Handlers
    const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'pending' | 'approved' | 'rejected' | null) => {
        if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); }
    };
    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10)); setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value); setPage(0);
    };
    const handleRequestSort = (property: SortableInvoiceKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    };
    const handleOpenModal = (details: InvoiceDetailType[]) => {
        setModalDetails(details); setOpenModal(true);
    };
    const handleCloseModal = () => { setOpenModal(false); };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: InvoiceType) => {
        setAnchorEl(event.currentTarget);
        setSelectedInvoiceForMenu(row);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedInvoiceForMenu(null); };

    const handleClickOpenDeleteModal = (id: number, name: string) => {
        setInvoiceIdToDelete(id); setInvoiceProviderToDelete(name); setOpenDeleteModal(true); handleCloseMenu();
    };
    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false); setInvoiceIdToDelete(null); setInvoiceProviderToDelete('');
    };

    const handleClickOpenStatusModal = (id: number, action: 'approve' | 'reject') => {
        setStatusToUpdate(action === 'approve' ? 1 : 2);

        setIdRow(id)

        setDescription('');
        setOpenStatusModal(true);
        handleCloseMenu();
    };

    const handleCloseStatusModal = () => {
        setOpenStatusModal(false);
        setStatusToUpdate(null);
        setDescription('');
        setStatusError(false);
    };

    const handleUpdateStatus = async () => {
        if (!description.trim()) {
            setStatusError(true);
            showAlert('Lütfen bir açıklama giriniz.', 'warning');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const payload = {
                id: Number(idRow),
                status: statusToUpdate,
                description: description.trim()
            };

            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-invoice-status",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Sipariş durumu başarıyla güncellendi!', 'success');
                getInvoices();
            } else {
                showAlert(response.data.message || 'Sipariş durumu güncellenirken bir hata oluştu.', 'error');
            }

        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Sipariş durumu güncellenirken bir hata oluştu.', 'error');
            }
        } finally {
            handleCloseStatusModal();
            getInvoices();
        }
    };


    // Table filtering and sorting
    const filteredInvoices = invoicesList.filter(invoice => {
        const providerName = invoice.provider?.name || '';
        const driverName = invoice.driver?.name || '';
        const invoiceNo = invoice.invoiceNo || ''; // Filtreleme için fatura numarasını ekle
        const matchesSearch = providerName.toLowerCase().includes(searchTerm.toLowerCase()) || driverName.toLowerCase().includes(searchTerm.toLowerCase()) || invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'pending' && invoice.status === 0) ||
            (statusFilter === 'approved' && invoice.status === 1) ||
            (statusFilter === 'rejected' && invoice.status === 2);
        return matchesSearch && matchesStatus;
    });

    const sortedAndFilteredInvoices = stableSort(filteredInvoices, getComparator(order, orderBy));
    const paginatedInvoices = sortedAndFilteredInvoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
        if (priceInput === null || priceInput === undefined) {
            return '₺0.00';
        }
        const cleanedString = String(priceInput).replace(/[$,]/g, '');
        const numericValue = parseFloat(cleanedString);
        if (isNaN(numericValue)) {
            return '₺0.00';
        }
        const formattedPrice = numericValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return formattedPrice.replace('$', '₺');
    };

    return (
        <Box>
            {/* Registration Form */}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" mb={2}>Fatura Detayları</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                        <CustomFormLabel htmlFor="provider-autocomplete" required>Tedarikçi</CustomFormLabel>
                        <Autocomplete<ProviderType>
                            id="provider-autocomplete" options={providers} getOptionLabel={(option) => option.name}
                            value={providers.find(p => p.id === Number(provider)) || null}
                            onChange={(_event, newValue) => setProvider(newValue ? newValue.id.toString() : '')}
                            renderInput={(params) => <TextField {...params} label="Tedarikçi Seçin" variant="outlined" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>

                        <CustomFormLabel htmlFor="driver-autocomplete" required>Sürücü</CustomFormLabel>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Autocomplete<DriverType>
                                id="driver-autocomplete" options={drivers} getOptionLabel={(option) => option.name}
                                value={drivers.find(d => d.id === driver) || null}
                                onChange={(_event, newValue) => {
                                    const newDriverId = newValue ? newValue.id : '';
                                    setDriver(newDriverId);
                                    setSelectedVehicle(null);
                                    setSelectedVehicleName(null);
                                    setVehiclesList([]);
                                    if (newDriverId) {
                                        fetchVehicles(newDriverId);
                                    }
                                }}
                                renderInput={(params) => <TextField {...params} label="Sürücü Seçin" variant="outlined" size="small" />}
                                sx={{ flexGrow: 1 }} // Take up available space
                            />
                        </Stack>

                        {selectedVehicleName && (
                            <Chip sx={{ mt: 2 }} label={selectedVehicleName} color="primary" variant="outlined" />
                        )}
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <CustomFormLabel htmlFor="warehouse-autocomplete" required>Depo</CustomFormLabel>
                        <Autocomplete<WarehouseType>
                            id="warehouse-autocomplete"
                            options={warehousesList}
                            getOptionLabel={(option) => option.name}
                            value={warehousesList.find(w => w.id === warehouse) || null}
                            onChange={(_event, newValue) => setWarehouse(newValue ? newValue.id : null)}
                            renderInput={(params) => <TextField {...params} label="Depo Seçin" variant="outlined" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <CustomFormLabel htmlFor="doc-date" required>Tarihi</CustomFormLabel>
                            <DatePicker
                                value={docDate} onChange={(newValue) => setDocDate(newValue)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => <TextField {...params} size="small" />}
                            />
                        </LocalizationProvider>
                    </Grid>
                </Grid>

                <Typography variant="h6" mb={2} sx={{ mt: 3 }}>Ürün Detayları</Typography>
                <InvoiceItemsTable
                    items={invoiceItems}
                    itemsList={itemsList}
                    onAddItem={handleAddInvoiceItem}
                    onRemoveItem={handleRemoveInvoiceItem}
                    onUpdateItem={handleUpdateInvoiceItem}
                />

                <Box mt={3} textAlign="right">
                    {editingId ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button variant="contained" color="info" onClick={handleUpdateInvoice}>Düzenle</Button>
                            <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                        </Stack>
                    ) : (
                        <Button variant="contained" color="primary" onClick={handleSaveInvoice}>Faturayı Kaydet</Button>
                    )}
                </Box>
            </Paper>

            {/* Invoices Table */}
            <Box sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Fatura Listesi</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            label="Fatura Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <ToggleButtonGroup
                            value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth
                        >
                            <StyledToggleButton value="all" aria-label="all invoices">Tümü</StyledToggleButton>
                            <StyledToggleButton value="pending" aria-label="pending invoices">Beklemede</StyledToggleButton>
                            <StyledToggleButton value="approved" aria-label="approved invoices">Onaylandı</StyledToggleButton>
                            <StyledToggleButton value="rejected" aria-label="rejected invoices">Reddedildi</StyledToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>
            </Box>

            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <TableContainer component={Paper}>
                <Table aria-label="invoice table">
                    <TableHead>
                        <TableRow>
                            {/* Yeni eklenen fatura numarası kolonu */}
                            <TableCell>
                                <TableSortLabel active={orderBy === 'invoiceNo'} direction={orderBy === 'invoiceNo' ? order : 'asc'} onClick={() => handleRequestSort('invoiceNo')}>
                                    <Typography variant="h6">Fatura No</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'provider.name'} direction={orderBy === 'provider.name' ? order : 'asc'} onClick={() => handleRequestSort('provider.name')}>
                                    <Typography variant="h6">Tedarikçi</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'driver.name'} direction={orderBy === 'driver.name' ? order : 'asc'} onClick={() => handleRequestSort('driver.name')}>
                                    <Typography variant="h6">Sürücü</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <Typography variant="h6">Depo</Typography>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                    <Typography variant="h6">Tarihi</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleRequestSort('status')}>
                                    <Typography variant="h6">Durum</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell><Typography variant="h6">Ürün Detayları</Typography></TableCell>
                            <TableCell align="right"><Typography variant="h6">İşlemler</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loadingData ? (
                            <TableRow><TableCell colSpan={8} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : (
                            paginatedInvoices.length > 0 ? (
                                paginatedInvoices.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            <Typography variant="h6">
                                                {row.invoiceNo ? row.invoiceNo : '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell><Typography variant="h6">{row.provider?.name || '-'}</Typography></TableCell>
                                        <TableCell><Typography variant="h6">{row.driver?.name || '-'}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="h6">
                                                {row.warehouse?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                {row.status === 0 && <HourglassEmptyIcon sx={{ color: 'orange' }} fontSize="small" />}
                                                {row.status === 1 && <CheckCircleOutlineIcon color="success" fontSize="small" />}
                                                {row.status === 2 && <HighlightOffIcon color="error" fontSize="small" />}
                                                <Typography variant="h6">{row.status === 0 ? "Beklemede" : row.status === 1 ? "Onaylandı" : "Reddedildi"}</Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.invoiceDetails)}>
                                                Görünüm
                                            </Button>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined}
                                                aria-haspopup="true" aria-expanded={openMenu && selectedInvoiceForMenu?.id === row.id ? 'true' : undefined}
                                                onClick={(event) => handleClickMenu(event, row)}>
                                                <IconDots size={20} />
                                            </IconButton>
                                            <Menu
                                                id="basic-menu" anchorEl={anchorEl}
                                                open={openMenu && selectedInvoiceForMenu?.id === row.id}
                                                onClose={handleCloseMenu} MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                            >
                                                {selectedInvoiceForMenu?.status === 0 && (
                                                    <>
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı onaylayın" : ""}>
                                                            <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                <ListItemIcon><IconCheck size={18} /></ListItemIcon>
                                                                Onayla
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı reddedin" : ""}>
                                                            <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                <ListItemIcon><IconX size={18} /></ListItemIcon>
                                                                Reddet
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    </>
                                                )}
                                                {selectedInvoiceForMenu?.status === 1 && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı reddedin" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                            <ListItemIcon><IconX size={18} /></ListItemIcon>
                                                            Reddet
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {selectedInvoiceForMenu?.status === 2 && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı onaylayın" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                            <ListItemIcon><IconCheck size={18} /></ListItemIcon>
                                                            Onayla
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı düzenleyin" : ""}>
                                                    <MenuItem onClick={() => handleEditClick(row)}>
                                                        <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı silin" : ""}>
                                                    <MenuItem onClick={() => handleClickOpenDeleteModal(row.id, row.provider?.name || '-')}>
                                                        <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                    </MenuItem>
                                                </CustomTooltip>
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Faturayı Yazdırın" : ""}>
                                                    <MenuItem onClick={() => handlePrintInvoice(row)}>
                                                        <ListItemIcon><IconFileInvoice size={18} /></ListItemIcon> Yazdır
                                                    </MenuItem>
                                                </CustomTooltip>
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç fatura bulunamadı.</Typography></TableCell></TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredInvoices.length}
                rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
            />
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
                <DialogTitle>Fatura Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ürün Adı</TableCell>
                                    <TableCell>Miktar</TableCell>
                                    <TableCell>Birim</TableCell>
                                    <TableCell>Fiyat</TableCell>
                                    <TableCell>İndirim %</TableCell>
                                    <TableCell>İndirim Miktarı</TableCell>
                                    <TableCell>Açıklama</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.map((detail, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{detail.item?.name}</TableCell>
                                        <TableCell>{detail.quantity}</TableCell>
                                        <TableCell>{detail.item?.unit?.title}</TableCell>
                                        <TableCell>{cleanAndFormatPrice(detail.price)}</TableCell>
                                        <TableCell>{detail.discountPercent}</TableCell>
                                        <TableCell>{cleanAndFormatPrice(detail.discountAmount)}</TableCell>
                                        <TableCell>{detail.description}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseModal}>Kapat</Button></DialogActions>
            </Dialog>

            {/* Vehicle Selection Modal */}
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
                                <FormControlLabel
                                    key={vehicle.id}
                                    value={vehicle.id}
                                    control={<Radio />}
                                    label={`${vehicle.name} (${vehicle.plaque})`}
                                />
                            ))}
                        </Box>
                    </RadioGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenVehicleModal(false)} color="secondary">
                        İptal
                    </Button>
                    <Button onClick={handleSelectVehicle} variant="contained" disabled={tempSelectedVehicle === null}>
                        Seç
                    </Button>
                </DialogActions>
            </Dialog>


            <Dialog open={openStatusModal} onClose={handleCloseStatusModal} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {statusToUpdate === 1 ? 'Onaylama Açıklaması' : 'Reddetme Açıklaması'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Açıklama"
                        type="text"
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            if (statusError) setStatusError(false);
                        }}
                        error={statusError}
                        helperText={statusError && 'Bu alan zorunludur.'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusModal} color="secondary">
                        İptal
                    </Button>
                    <Button onClick={handleUpdateStatus} color="primary">
                        Kaydet
                    </Button>
                </DialogActions>
            </Dialog>

            <DeleteInvoiceModal
                openModal={openDeleteModal} onClose={handleClickCloseDeleteModal}
                invoiceIdToDelete={invoiceIdToDelete} invoiceProviderToDelete={invoiceProviderToDelete}
                onDeleteSuccess={getInvoices} showAlert={showAlert}
            />

        </Box>
    );
};

export default ListInvoices;