import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { styled, keyframes } from '@mui/material/styles';
import { IconDots, IconEye, IconEdit, IconTrash, IconSearch, IconFileInvoice, IconCheck, IconX, IconPencil, IconInfoCircle } from '@tabler/icons-react';
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
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import { useAuth } from 'src/context/AuthContext';

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
    orderDetailId?: string | null;
    providerId?: number;
    firm?: boolean;
}
interface InvoiceHeaderStatusHistory {
    id: string;
    status: number;
    createAt: string;
    recordStatus: number;
    description: string | null;
}
interface InvoiceType {
    id: number;
    invoiceNo: string | null;
    provider: { id: string; name: string; firm: boolean; } | null;
    driver: { id: string; name: string; } | null;
    warehouse?: {
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
    driverVehicleId: string | null;
    driverVehicle?: {
        id: string;
        name: string;
        model: string;
        plaque: string;
    } | null;
    invoiceHeaderStatusHistories: InvoiceHeaderStatusHistory[];
}
interface InvoiceDetailType {
    id: number;
    item: { id: string; name: string; unit: { title: string; }; };
    quantity: number;
    price: number;
    discountPercent: number;
    discountAmount: number;
    description: string;
    provider?: { id: string; name: string; firm: boolean; } | null;
    firm?: boolean;
    orderDetail?: { id: string; quantity: string; price: string; } | null;
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

const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;

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

// تابع کمکی برای پاکسازی و تبدیل رشته به عدد
const cleanAndConvertNumber = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) {
        return 0;
    }
    const cleanedString = String(value).replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
};

const ListInvoices = () => {
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
    const openMenu = Boolean(anchorEl);
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

    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [warehouse, setWarehouse] = useState<number | null>(null);

    const [openStatusHistoryModal, setOpenStatusHistoryModal] = useState(false);
    const [statusHistoryData, setStatusHistoryData] = useState<any[]>([]);

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

    const hasStatusPermission = useMemo(() => {
        return allowedOperations.some(op => op.systemOperationName === 'Onaylamak');
    }, [allowedOperations]);


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
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const logoImg = new Image();
        logoImg.src = Logo;

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(logoImg, 'PNG', 25, 25, 25, 25);

            doc.setFontSize(18);
            doc.text('Fatura Detayları', pageWidth - 15, 30, { align: 'right' });

            doc.setFontSize(12);
            doc.text(`Fatura No: ${invoice.invoiceNo || '-'}`, pageWidth - 15, 40, { align: 'right' });

            const hasOrder = invoice.invoiceDetails.some(detail => detail.orderDetail);
            if (hasOrder) {
                doc.text('Tedarik Tipi: Siparişli Fatura', pageWidth - 15, 47, { align: 'right' });
            } else {
                doc.text('Tedarik Tipi: Siparişsiz Fatura', pageWidth - 15, 47, { align: 'right' });
            }

            doc.text(`Sürücü: ${invoice.driver?.name || '-'}`, pageWidth - 15, 54, { align: 'right' });
            doc.text(`Depo: ${invoice.warehouse?.name || '-'}`, pageWidth - 15, 61, { align: 'right' });
            doc.text(`Tarih: ${formatDateDisplay(invoice.docDate)}`, pageWidth - 15, 68, { align: 'right' });
        };

        const footer = () => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        };

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

        try {
            autoTable(doc, {
                startY: 80,
                head: [['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama']],
                body: rows,
                // **این خط را اصلاح کنید:**
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
                    0: { cellWidth: 25 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 15 },
                    4: { cellWidth: 15 },
                    5: { cellWidth: 20 },
                    6: { cellWidth: 20 },
                    7: { cellWidth: 25 },
                    8: { cellWidth: 'auto' },
                },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });

            doc.save(`Fatura_${invoice.id}.pdf`);
        } catch (error) {
            console.error("PDF oluşturulurken bir hata oluştu: ", error);
            // showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };

    const handleOpenStatusHistoryModal = (invoice: InvoiceType) => {
        setStatusHistoryData(invoice.invoiceHeaderStatusHistories);
        setOpenStatusHistoryModal(true);
    };

    const handleCloseStatusHistoryModal = () => {
        setOpenStatusHistoryModal(false);
        setStatusHistoryData([]);
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

                // اگر بیش از یک خودرو داشت، مودال را باز کن
                if (activeVehicles.length > 1) {
                    setOpenVehicleModal(true);
                    setTempSelectedVehicle(activeVehicles[0].id); // اولین مورد را به صورت موقت انتخاب کن
                } else if (activeVehicles.length === 1) {
                    setSelectedVehicle(activeVehicles[0].id);
                    setSelectedVehicleName(`${activeVehicles[0].name} (${activeVehicles[0].plaque})`);
                } else {
                    setSelectedVehicle(null);
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
        setHasUnsavedChanges(true);
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
        if (!driver || !docDate || !warehouse || !selectedVehicle) {
            showAlert('Lütfen tüm zorunlu alanları (Sürücü, Depo, Tarih ve Araç) doldurun.', 'warning');
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
        setWarehouse(null);
        clearAlert();
    };

    const handleSaveInvoice = async () => {
        if (!validateForm()) return;

        const invoiceData = {
            docDate: docDate?.toISOString(),
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
                orderDetailId: item.orderDetailId ? Number(item.orderDetailId) : null,
                providerId: item.providerId,
                firm: item.firm
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
                setHasUnsavedChanges(false);
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
            id: Number(editingId),
            docDate: docDate?.toISOString(),
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
                orderDetailId: item.orderDetailId ? Number(item.orderDetailId) : null,
                providerId: item.providerId,
                firm: item.firm
            }))
        };
        debugger
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
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken'); navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            else if (e.response?.status === 500) {
                showAlert('Bu fatura düzenlenemez, çünkü kullanılmıştır.', 'error');
            }
            else {
                showAlert('Fatura güncellenirken bir hata oluştu.', 'error');
            }

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
            if (!authToken) {
                navigate("/");
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                return;
            }

            try {
                // دریافت لیست کامل خودروهای راننده
                const response = await axios.get(
                    `${server.baseurl}${server.warehouse}get-driver-vehicle-by-driver-id/${selectedDriver.id}`,
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );

                if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                    const activeVehicles = response.data.data.map((item: any) => ({
                        ...item,
                        model: String(item.model),
                        id: Number(item.id)
                    })).filter((item: any) => item.recordStatus === 0);

                    // **منطق اصلی: ابتدا نام خودروی فاکتور را نمایش بده**
                    let vehicleToShowId = null;
                    let vehicleToShowName = null;

                    if (row.driverVehicle) {
                        vehicleToShowId = Number(row.driverVehicle.id);
                        vehicleToShowName = `${row.driverVehicle.name} (${row.driverVehicle.plaque})`;
                    } else if (activeVehicles.length > 0) {
                        // اگر فاکتور خودرو نداشت، اولین خودروی راننده را به صورت پیش‌فرض نمایش بده
                        vehicleToShowId = activeVehicles[0].id;
                        vehicleToShowName = `${activeVehicles[0].name} (${activeVehicles[0].plaque})`;
                    }

                    setVehiclesList(activeVehicles);
                    setSelectedVehicle(vehicleToShowId);
                    setSelectedVehicleName(vehicleToShowName);

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
            }
        } else {
            setDriver('');
            setSelectedVehicle(null);
            setSelectedVehicleName(null);
            setVehiclesList([]);
            showAlert('Faturada geçerli bir sürücü bilgisi bulunamadı.', 'warning');
        }

        // ادامه منطق برای سایر فیلدهای فرم (انبار، تاریخ و آیتم‌ها)
        const selectedWarehouse = warehousesList.find(w => Number(w.id) === Number(row.warehouse?.id));
        setWarehouse(selectedWarehouse ? selectedWarehouse.id : null);
        setDocDate(new Date(row.docDate));

        const itemsToEdit = row.invoiceDetails.map(detail => {
            const fullItem = itemsList.find(item => item.id === detail.item.id);
            const detailProvider = providers.find(p => Number(p.id) === Number(detail.provider?.id));
            const orderDetailId = (detail.orderDetail && detail.orderDetail.id) ? detail.orderDetail.id : null;
            debugger

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
                firm: detailProvider?.firm === '1'
            };
        });
        setInvoiceItems(itemsToEdit);
    };
    const handleSelectVehicle = () => {
        const vehicle = vehiclesList.find(v => v.id === tempSelectedVehicle);
        if (vehicle) {
            setSelectedVehicle(vehicle.id);
            setSelectedVehicleName(`${vehicle.name} (${vehicle.plaque})`);
        }
        setOpenVehicleModal(false);
    };

    const handleOpenVehicleModal = () => {
        setOpenVehicleModal(true);
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
    const handleOpenModal = (details: InvoiceDetailType[], provider: { id: string; name: string; firm: boolean; } | null) => {
        const detailsWithProvider = details.map(detail => ({
            ...detail,
            provider: detail.provider || provider
        }));
        setModalDetails(detailsWithProvider);
        setOpenModal(true);
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
        const invoiceNo = invoice.invoiceNo || '';
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

    // Memoized value to check if the form is complete
    const isFormComplete = useMemo(() => {
        const isMainFormComplete = driver && docDate && warehouse && selectedVehicle;
        const hasValidItems = invoiceItems.length > 0 && !invoiceItems.some(item => !item.item || item.quantity <= 0 || item.price <= 0 || isNaN(item.quantity) || isNaN(item.price));
        return isMainFormComplete && hasValidItems;
    }, [driver, docDate, warehouse, invoiceItems, selectedVehicle]);


    return (
        <Box>

            {(hasCreatePermission || hasEditPermission) && (
                <>

                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>Fatura Detayları</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
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
                                        sx={{ flexGrow: 1 }}
                                    />
                                    {selectedVehicleName && (vehiclesList.length > 1) && (
                                        <IconButton onClick={handleOpenVehicleModal} size="small">
                                            <IconPencil size={20} />
                                        </IconButton>
                                    )}
                                </Stack>
                                {selectedVehicleName && (
                                    <Chip sx={{ mt: 2 }} label={selectedVehicleName} color="primary" variant="outlined" />
                                )}
                            </Grid>
                            <Grid item xs={12} md={4}>
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
                            <Grid item xs={12} md={4}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <CustomFormLabel htmlFor="doc-date" required>Tarihi</CustomFormLabel>
                                    <DatePicker
                                        value={docDate} onChange={(newValue) => setDocDate(newValue)}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => <TextField {...params} size="small" sx={{ width: "100%" }} />}
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
                            providersList={providers}
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
                                        <CustomTooltip
                                            title={isTooltipGloballyEnabled && hasUnsavedChanges ? "tüm değişiklikleri kaydetmek için buraya tıklayın" : ""}
                                            placement="right"
                                        >
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleSaveInvoice}
                                                disabled={!isFormComplete}
                                                sx={{
                                                    animation: isFormComplete ? `${blinkAnimation} 1.5s infinite` : 'none',
                                                }}
                                            >
                                                Faturayı Kaydet
                                            </Button>
                                        </CustomTooltip>
                                    )}
                                </>
                            )}
                        </Box>
                    </Paper>

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

                </>
            )}
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <TableContainer component={Paper}>
                <Table aria-label="invoice table">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'invoiceNo'} direction={orderBy === 'invoiceNo' ? order : 'asc'} onClick={() => handleRequestSort('invoiceNo')}>
                                    <Typography variant="h6">Fatura No</Typography>
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
                                <Typography variant="h6">Kayıt Tipi </Typography>
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
                                        <TableCell><Typography variant="h6">{row.driver?.name || '-'}</Typography></TableCell>
                                        <TableCell>
                                            <Typography variant="h6">
                                                {row.warehouse?.name || '-'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
                                        <TableCell>
                                            {row.invoiceDetails.some(detail => detail.orderDetail) ? (
                                                <Chip label=" Siparişli" color="success" size="small" />
                                            ) : (
                                                <Chip label=" Siparişsiz" color="default" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                {row.status === 0 && <HourglassEmptyIcon sx={{ color: 'orange' }} fontSize="small" />}
                                                {row.status === 1 && <CheckCircleOutlineIcon color="success" fontSize="small" />}
                                                {row.status === 2 && <HighlightOffIcon color="error" fontSize="small" />}
                                                <Typography variant="h6">{row.status === 0 ? "Beklemede" : row.status === 1 ? "Onaylandı" : "Reddedildi"}</Typography>
                                                {row.invoiceHeaderStatusHistories && row.invoiceHeaderStatusHistories.length > 0 && (
                                                    <CustomTooltip title="Durum geçmişini gör" placement="right">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenStatusHistoryModal(row)}
                                                        >
                                                            <IconInfoCircle size={18} />
                                                        </IconButton>
                                                    </CustomTooltip>
                                                )}
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.invoiceDetails, row.provider)}>
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
                                                {hasStatusPermission && selectedInvoiceForMenu?.status === 0 && (
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
                                                {hasStatusPermission && selectedInvoiceForMenu?.status === 1 && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı reddedin" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                            <ListItemIcon><IconX size={18} /></ListItemIcon>
                                                            Reddet
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasStatusPermission && selectedInvoiceForMenu?.status === 2 && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı onaylayın" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                            <ListItemIcon><IconCheck size={18} /></ListItemIcon>
                                                            Onayla
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı düzenleyin" : ""}>
                                                        <MenuItem onClick={() => handleEditClick(row)}>
                                                            <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasDeletePermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu faturayı silin" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenDeleteModal(row.id, row.provider?.name || '-')}>
                                                            <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasDownloadPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Faturayı Yazdırın" : ""}>
                                                        <MenuItem onClick={() => handlePrintInvoice(row)}>
                                                            <ListItemIcon><IconFileInvoice size={18} /></ListItemIcon> Yazdır
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}
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
                                    <TableCell>Tedarikçi</TableCell>
                                    <TableCell>Firm</TableCell>
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
                                        <TableCell>{detail.provider?.name || '-'}</TableCell>
                                        <TableCell>
                                            {detail.provider?.firm !== undefined ? (
                                                <Chip
                                                    label={detail.provider.firm ? "Şirket İçi" : "Şirket Dışı"}
                                                    color={detail.provider.firm ? "primary" : "secondary"}
                                                    size="small"
                                                />
                                            ) : '-'}
                                        </TableCell>
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

            <Dialog open={openStatusHistoryModal} onClose={handleCloseStatusHistoryModal} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Typography variant="h5">Durum Geçmişi</Typography>
                </DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><Typography variant="h6">Tarih</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                    <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {statusHistoryData.length > 0 ? (
                                    statusHistoryData
                                        // مرتب‌سازی بر اساس تاریخ، از جدید به قدیم
                                        .sort((a, b) => new Date(b.createAt).getTime() - new Date(a.createAt).getTime())
                                        .map((historyItem, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {formatDateDisplay(historyItem.createAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={historyItem.status === 0 ? "Beklemede" : historyItem.status === 1 ? "Onaylandı" : "Reddedildi"}
                                                        color={historyItem.status === 0 ? "warning" : historyItem.status === 1 ? "success" : "error"}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography>{historyItem.description || '-'}</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Durum geçmişi bulunamadı.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusHistoryModal}>Kapat</Button>
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