// src/views/warehouses/ ListWarehouseDispatchReturnToCenter.tsx
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
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconArrowRight, IconEye, IconX, IconCheck, IconInfoCircle,
    IconFileSpreadsheet, IconFileText,
    IconRefresh
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
import DeleteWarehouseDispatchReturnToCenter from "./DeleteWarehouseDispatchReturnToCenter";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// ✨ NEW imports for Excel
import Excel from 'exceljs';
import { saveAs } from 'file-saver';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
    // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
    fontSize: '0.8rem', // Varsayılan olarak küçük font
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem', // Masaüstünde daha büyük
    },
}));

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
    description: string,
    createAt: string;
    recordStatus: number;
    status: number;
    statusDescription: string | null;
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
    destructionStatus: boolean,
    docDate: string;
    description: string,
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

interface ItemWithBalanceType {
    itemId: string;
    name: string;
    code: string | null;
    balance: string;
    unit?: {
        title: string;
    };
}

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


const addPdfHeader = (doc: jsPDF, title: string) => {
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


// === Main Component ===
const ListWarehouseDispatchReturnToCenter = () => {
    const { warehouseId } = useParams<{ warehouseId: string }>();
    const navigate = useNavigate();


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
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

    const [generalDescription, setGeneralDescription] = useState('');
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
    // const openMenu = Boolean(anchorEl);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [driverIdError, setDriverIdError] = useState<boolean>(false);
    const [workhouseIdError, setWorkhouseIdError] = useState<boolean>(false);
    const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [workhouses, setWorkhouses] = useState<WorkhouseType[]>([]);
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

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // === New State for Status Update Modal ===
    const [openStatusUpdateModal, setOpenStatusUpdateModal] = useState(false);
    const [updateModalData, setUpdateModalData] = useState<{ id: string | null; status: number; description: string }>({ id: null, status: 0, description: '' });

    // === New State for Status Description Modal (Read-only) ===
    const [openStatusDescriptionModal, setOpenStatusDescriptionModal] = useState(false);
    const [readOnlyDescription, setReadOnlyDescription] = useState<string>('');

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    // ✨ NEW: State for download modals
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedDispatchForDownload, setSelectedDispatchForDownload] = useState<DispatchType | null>(null);

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
            const [driversRes, workhousesRes, dispatchesRes, itemsBalanceRes] = await Promise.all([
                axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<WorkhouseType[]>>(server.baseurl + server.initialoperations + "get-workhouse", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<DispatchType[]>>(server.baseurl + server.warehouse + `get-warehouse-dispatches-destruction/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<ItemWithBalanceType[]>>(server.baseurl + server.warehouse + `get-warehouse-all-items-balance/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);

            setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
            setWorkhouses(workhousesRes.data?.data?.filter(w => w.recordStatus === 0).map(w => ({ ...w, id: Number(w.id) })) || []);

            if (itemsBalanceRes.data?.httpStatusCode === 200) {
                setItemsWithBalance(itemsBalanceRes.data.data);
            } else {
                showAlert('Stok bilgileri yüklenirken bir hata oluştu.', 'error');
            }

            if (dispatchesRes.data?.httpStatusCode === 200) {
                const allDispatches = dispatchesRes.data.data;
                const formattedDispatches = allDispatches.map(d => {
                    let statusText = 'Bilinmiyor';
                    let statusColor: 'success' | 'error' | 'warning' | 'info' = 'info';

                    switch (d.status) {
                        case 0:
                            statusText = 'Beklemede';
                            statusColor = 'warning';
                            break;
                        case 1:
                            statusText = 'Onaylandı';
                            statusColor = 'success';
                            break;
                        case 2:
                            statusText = 'Reddedildi';
                            statusColor = 'error';
                            break;
                    }

                    return {
                        ...d,
                        statusText: statusText,
                        statusColor: statusColor
                    };
                });
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
        let filteredDispatches = dispatchList.filter(d => {
            const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.warehouse?.name && d.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && d.status === 1) ||
                (statusFilter === 'inactive' && d.status === 2);

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
        const isValid = !!selectedDriverId && !!selectedWorkhouseId &&
            !!docDate && dispatchDetails.length > 0 &&
            dispatchDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(isValid);
    }, [selectedDriverId, selectedWorkhouseId, docDate, dispatchDetails]);

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

    useEffect(() => {
        let blinkInterval: NodeJS.Timeout | null = null;
        if (isFormValid && !loadingButton) {
            blinkInterval = setInterval(() => { }, 500);
        } else {
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
        setSelectedWorkhouseId(null);
        setDispatchDetails([]);
        setEditingId(null);
        setDocDateError(false);
        setDriverIdError(false);
        setWorkhouseIdError(false);
        setDispatchDetailsError(false);
        setSelectedVehicleId(null);
        setSelectedVehicleName(null);
        setIsFormVisible(false);
    };

    // === API Actions ===
    const insertDispatch = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const payload: NewDispatchData = {
                destructionStatus: true,
                docDate: docDate?.toISOString() || new Date().toISOString(),
                description: generalDescription,
                warehouseId: Number(warehouseId),
                driverId: Number(selectedDriverId),
                driverVehicleId: Number(selectedVehicleId),
                workhouseId: Number(selectedWorkhouseId),
                dispatchDetails: dispatchDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description }))
            };
            const response = await axios.post(server.baseurl + server.warehouse + "create-warehouse-dispatch-destruction",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
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
            destructionStatus: true,
            code: editingCode!,
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
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
            const response = await axios.put(server.baseurl + server.warehouse + "update-warehouse-dispatch-destruction", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
            if (response.data.httpStatusCode === 200) {
                showAlert('Sevk belgesi başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Sevk belgesi güncellenirken bir hata oluştu.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };

    const updateDispatchStatus = async () => {
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                id: Number(updateModalData.id),
                status: updateModalData.status,
                description: updateModalData.description
            };
            const url = `${server.baseurl}${server.warehouse}update-warehouse-dispatch-destruction-status`;
            const response = await axios.put(url, payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                showAlert('Sevk belgesi durumu başarıyla güncellendi.', 'success');
                fetchInitialData();
                setOpenStatusUpdateModal(false);
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } finally {
            setLoadingButton(false);
        }
    };

    const handleOpenStatusUpdateModal = (status: number) => {
        if (selectedRowForMenu) {
            setUpdateModalData({
                id: selectedRowForMenu.id,
                status: status,
                description: selectedRowForMenu.statusDescription || ''
            });
            setOpenStatusUpdateModal(true);
            handleCloseMenu();
        }
    };

    const handleOpenReadOnlyDescriptionModal = (description: string) => {
        setReadOnlyDescription(description);
        setOpenStatusDescriptionModal(true);
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
            setGeneralDescription(selectedRowForMenu.description || '');
            setEditingCode(selectedRowForMenu.code);
            setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
            setSelectedWorkhouseId(Number(selectedRowForMenu.workhouse?.id));
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
                    updatedDetail.quantity = 0;
                } else if (numValue > maxBalance) {
                    showAlert(`Girdiğiniz miktar stoktan fazla! Maksimum: ${maxBalance}`, 'warning');
                    updatedDetail.quantity = maxBalance;
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

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    // ✨ NEW: Consolidated PDF export function
    const exportDispatchesToPdf = (data: DispatchType[], title: string, subtitle?: string) => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning');
            return;
        }
        showAlert('PDF oluşturuluyor...', 'info');
        const doc = new jsPDF();
        const docAny = doc as any;
        let yPos = 60; // Initial Y position for content

        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');


        data.forEach((dispatch, index) => {
            if (index > 0) {
                doc.addPage();
                yPos = 60;
            }

            const pageTitle = `${title}`;
            addPdfHeader(doc, pageTitle);

            if (subtitle) {
                doc.setFontSize(10);
                doc.text(subtitle, 15, 50, { align: 'left' });
            }

            // Add main dispatch information
            doc.setFontSize(12);
            doc.text(`Sevk Kodu: ${dispatch.code}`, 15, yPos);
            doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });

            yPos += 7;
            doc.text(`Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
            doc.text(`Şantiye: ${dispatch.workhouse?.name || '-'}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });

            yPos += 7;
            doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos);
            doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || '-'})`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });

            yPos += 7;
            doc.text(`Durum: ${dispatch.statusText}`, 15, yPos);
            // if (dispatch.statusDescription) {
            doc.text(`Açıklama: ${dispatch.description}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });
            // }

            yPos += 15; // Space before the details table

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
                    addPdfFooter(doc);
                }
            });

            const finalY = docAny.lastAutoTable.finalY || yPos;
            doc.setFontSize(10);
            doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);

            yPos = finalY + 10;
        });

        doc.save(`${title.replace(/ /g, '_')}.pdf`);
        showAlert('PDF başarıyla oluşturuldu.', 'success');
    };

    // ✨ NEW: Consolidated Excel export function
    const exportDispatchesToExcel = (data: DispatchType[], title: string) => {
        if (!data || data.length === 0) {
            showAlert('Excel oluşturulacak sevk belgesi bulunamadı.', 'warning');
            return;
        }
        showAlert('Excel oluşturuluyor...', 'info');
        const workbook = new Excel.Workbook();

        data.forEach(dispatch => {
            const worksheetTitle = `Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_');
            const worksheet = workbook.addWorksheet(worksheetTitle);

            const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const totalColumns = detailsColumns.length;

            addExcelHeader(worksheet, title, totalColumns);

            // Add dispatch information
            worksheet.addRow([`Sevk Kodu:`, dispatch.code]);
            worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);
            worksheet.addRow([`Depo:`, dispatch.warehouse?.name || '-']);
            worksheet.addRow([`Şantiye:`, dispatch.workhouse?.name || '-']);
            worksheet.addRow([`Şoför:`, `${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`]);
            worksheet.addRow([`Araç:`, `${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`]);
            worksheet.addRow([`Durum:`, dispatch.statusText || '-']);
            worksheet.addRow([`Açıklama:`, dispatch.description || '-']);
            worksheet.addRow([]);

            // Add details table
            const headerRow = worksheet.addRow(detailsColumns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

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
            totalRow.getCell(2).numFmt = '0';

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
        const title = isFiltered ? 'Filtrelenmiş Sevk Belgeleri Raporu' : 'Tüm Sevk Belgeleri Raporu';
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}` : undefined;

        if (format === 'pdf') {
            exportDispatchesToPdf(dataToDownload, title, subtitle);
        } else {
            exportDispatchesToExcel(dataToDownload, title);
        }

    };
    const handleOpenRowDownloadModal = (dispatch: DispatchType) => {
        setSelectedDispatchForDownload(dispatch);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    const handleCloseRowDownloadModal = () => {
        setSelectedDispatchForDownload(null);
        setOpenRowDownloadModal(false);
    };
    // ✨ NEW: Unified download handler for a single row
    const handleDownloadSingleDispatch = (format: 'pdf' | 'excel') => {
        if (!selectedDispatchForDownload) return;
        const data = [selectedDispatchForDownload];
        const title = `Sevk Belgesi Detayları: ${selectedDispatchForDownload.code}`;

        if (format === 'pdf') {
            exportDispatchesToPdf(data, title);
        } else {
            exportDispatchesToExcel(data, title);
        }
        handleCloseRowDownloadModal();
    };

    const paginatedDispatches = useMemo(() => {
        return displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedDispatches, page, rowsPerPage]);


    const selectedItemIds = useMemo(() => dispatchDetails.map(d => d.itemId).filter(id => id !== null), [dispatchDetails]);



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


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

    // === UI ===
    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">İmha Edilecek Ürünleri Sevk Et</Typography>

                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Sevk Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni İmha Edilecek Ürünleri Sevk Kaydet
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
                        <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                            endIcon={<IconArrowRight size={20} />}>
                            Geri Dön
                        </Button>
                    </CustomTooltip>
                </Stack>
            </Stack>
            {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h5" mb={2}>{editingId ? 'İmha Edilecek Ürünleri Sevk Düzenle' : 'Yeni İmha Edilecek Ürünleri Sevk'}</Typography>
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


                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="invoice-general-description">Açıklama</CustomFormLabel>
                            <TextField
                                id="invoice-general-description"
                                label="İmha Edilecek Ürünleri Sev için genel açıklama giriniz"
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
                    {/* Sevk Detayları */}
                    <Box mt={4}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Sevk Detayları</Typography>
                            <Button variant="outlined" startIcon={<IconPlus />} onClick={handleAddDispatchDetail}>Detay Ekle</Button>
                        </Stack>
                        <Grid container spacing={2}>
                            {dispatchDetails.map((detail, index) => {
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
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak İmha Edilecek Ürünleri Sevk kaydedin." : ""}>
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
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "filtrelerle İmha Edilecek Ürünleri Sevk indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)}
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
                                onClick={() => setOpenDownloadAllModal(true)}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || dispatchList.length === 0}
                            >
                                Tümünü İndir
                            </Button>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>

                    <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">
                            İmha Edilecek Ürünleri Sevk Listesi

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
                        <Typography variant="h6" sx={{ ml: 2 }}>Sevk Belgeleri yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer>
                        <Table aria-label="Sevk belgesi tablosu">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Depo</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Şoför</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Araç</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Şantiye</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>

                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Sevk Detayları</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {displayedDispatches.length > 0 ? (
                                    paginatedDispatches.map(row => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.code}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.warehouse?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{`${row.driver?.name || ''} ${row.driver?.family || ''}`}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{`${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.workhouse?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                            <StyledTableCell >
                                                <Typography variant="body2" noWrap title={row.description || ''}>
                                                    {row.description || '-'}
                                                </Typography>
                                                {row.description != null && row.description.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                            handleOpenDescriptionModal(row.description);
                                                        }}>
                                                            Devamını Oku
                                                        </Button>
                                                    </CustomTooltip>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip label={row.statusText} color={row.statusColor} />
                                                    {row.statusDescription && (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Durum Açıklamasını Görüntüle" : ""}>
                                                            <IconButton onClick={() => handleOpenReadOnlyDescriptionModal(row.statusDescription!)}>
                                                                <IconInfoCircle size={18} />
                                                            </IconButton>
                                                        </CustomTooltip>
                                                    )}
                                                </Stack>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<IconEye />}
                                                            onClick={() => {
                                                                setDetailsToShow(row.warehouseDispatchDetails || []);
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
                                                    open={Boolean(anchorEl)}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${selectedRowForMenu?.id}` }}
                                                >
                                                    {hasEditPermission && (
                                                        <MuiMenuItem onClick={handleEditClick}>
                                                            <ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                            <ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek
                                                        </MuiMenuItem>
                                                    )}
                                                    {(selectedRowForMenu?.status === 0 || selectedRowForMenu?.status === 2) && (
                                                        <MuiMenuItem onClick={() => handleOpenStatusUpdateModal(1)}>
                                                            <ListItemIcon><IconCheck width={18} /></ListItemIcon>Onayla
                                                        </MuiMenuItem>
                                                    )}
                                                    {(selectedRowForMenu?.status === 0 || selectedRowForMenu?.status === 1) && (
                                                        <MuiMenuItem onClick={() => handleOpenStatusUpdateModal(2)}>
                                                            <ListItemIcon><IconX width={18} /></ListItemIcon>Reddet
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                            Bu satırı indir
                                                        </MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={9} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç İmha Edilecek Ürünleri Sevk bulunamadı.
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
                            <Table aria-label="Sevk detayları tablosu">
                                <TableHead sx={{ backgroundColor: 'rgb(149 147 125 / 65%)' }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailsToShow.length > 0 ? (
                                        <>
                                            {detailsToShow.map((detail, index) => (
                                                <TableRow key={detail.id || index}>
                                                    <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{detail.quantity}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow sx={{ backgroundColor: 'rgb(240, 240, 240)' }}>
                                                <StyledTableCell sx={{ fontWeight: 'bold' }} colSpan={1}>Toplam Miktar:</StyledTableCell>
                                                <StyledTableCell sx={{ fontWeight: 'bold' }}>
                                                    {detailsToShow.reduce((sum, detail) => sum + Number(detail.quantity), 0)}
                                                </StyledTableCell>
                                                <StyledTableCell></StyledTableCell>
                                                <StyledTableCell></StyledTableCell>
                                            </TableRow>
                                        </>
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={4} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">
                                                    Bu sevk belgesi için hiç detay bulunamadı.
                                                </Typography>
                                            </StyledTableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Bu İmha Edilecek Ürünleri Sevk için detay bulunamadı.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openStatusUpdateModal} onClose={() => setOpenStatusUpdateModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {updateModalData.status === 1 ? 'İmha Edilecek Ürünleri Sevk Onayla' : 'İmha Edilecek Ürünleri Sevk Reddet'}
                </DialogTitle>
                <DialogContent>
                    <CustomFormLabel>Açıklama</CustomFormLabel>
                    <CustomTextField
                        fullWidth
                        multiline
                        rows={4}
                        value={updateModalData.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpdateModalData({ ...updateModalData, description: e.target.value })}
                        placeholder="Durum için bir açıklama girin..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusUpdateModal(false)} color="secondary">
                        İptal Et
                    </Button>
                    <Button onClick={updateDispatchStatus} color="primary" variant="contained" disabled={loadingButton}>
                        {loadingButton ? <CircularProgress size={24} /> : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openStatusDescriptionModal} onClose={() => setOpenStatusDescriptionModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Durum Açıklaması</DialogTitle>
                <DialogContent>
                    <Typography>{readOnlyDescription || 'Açıklama bulunamadı.'}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusDescriptionModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <DeleteWarehouseDispatchReturnToCenter
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                dispatchIdToDelete={dispatchIdToDelete}
                dispatchCodeToDelete={dispatchCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />

            {/* ✨ NEW: Modal for all downloads */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm İmha Edilecek Ürünleri Sevk İndir</DialogTitle>
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
                <DialogTitle>Filtrelenmiş İmha Edilecek Ürünleri Sevk İndir</DialogTitle>
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
        </Box>
    );
};

export default ListWarehouseDispatchReturnToCenter;