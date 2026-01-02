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
    IconArrowRight, IconEye, IconX, IconReload, IconFileText, IconFileSpreadsheet, IconCheck, IconInfoCircle,
    IconRefresh,
    IconPlus
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

import Excel from 'exceljs';
import { saveAs } from 'file-saver';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));
interface BaseItemType {
    id: string; // یا Number، بسته به API
    name: string;
    abbreviation: string;
    unit?: {
        id: string;
        title: string;
    };
}
// === Type Definitions ===
interface DispatchDetailType {
    id: string;
    itemId: number;
    quantity: number;
    description: string;
    item?: BaseItemType;
}

interface BetweenWarehouseDispatchType {
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
    description: string,
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


interface FormDispatchDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    item?: BaseItemType;
    balance?: number;
}

interface ItemBalanceType {
    itemId: string;
    code: string | null;
    name: string;
    balance: string;
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

// const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {
//     const pageWidth = doc.internal.pageSize.getWidth();
//     const docAny = doc as any;
//     docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//     docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//     doc.setFont('NotoSans');

//     docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
//     doc.setFontSize(14);
//     doc.text(title, pageWidth / 2, 35, { align: 'center' });

//     doc.setFontSize(10);
//     doc.text(`Rapor Tarihi:`, 15, 45);
//     doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 45);

//     if (subtitle) {
//         doc.text(subtitle, pageWidth - 15, 47, { align: 'right' });
//     }
// };


const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');

    // تنظیم فونت و بارگذاری (مطمئن شوید NotoSansBold هم اگر دارید اضافه کنید، 
    // در غیر این صورت jsPDF سعی می‌کند شبیه‌سازی کند)
    doc.setFont('NotoSans', 'normal');

    // ۱. افزودن لوگو (سمت راست)
    try {
        doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);
    } catch (e) {
        console.error("Logo yüklenemedi", e);
    }

    // ۲. عنوان اصلی (وسط)
    doc.setFontSize(14);
    doc.setTextColor(40); // خاکستری تیره
    doc.text(title, pageWidth / 2, 25, { align: 'center' });

    // ۳. تاریخ گزارش (سمت چپ - کلمه Rapor Tarihi بولد شده)
    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.text(`Rapor Tarihi:`, 15, 40);

    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

    // ۴. زیرعنوان (در صورت وجود - مثلاً بازه تاریخی فیلتر شده)
    if (subtitle) {
        doc.setFontSize(9);
        doc.setFont('NotoSans', 'normal');
        doc.setTextColor(100);
        doc.text(subtitle, 15, 45);
    }

    // ۵. خط جداکننده هدر (مشابه طرح قبلی)
    doc.setDrawColor(66, 66, 66);
    doc.setLineWidth(0.5);
    doc.line(15, 48, pageWidth - 15, 48);
};

const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ۱. اطلاعات شرکت (مرکز پایین)
    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
    doc.setTextColor(100);
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞاAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
        'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
    ];

    let footerY = pageHeight - 20;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 4;
    });

    // ۲. بخش امضا (سمت راست)
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.setFont('NotoSans', 'normal');
    doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
    doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    // ۳. شماره صفحه (سمت چپ)
    const docAny = doc as any;
    const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.setFont('NotoSans', 'normal');
    doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
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

    const authToken = localStorage.getItem('authToken');

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [selectedDestinationWarehouseId, setSelectedDestinationWarehouseId] = useState<number | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

    const [generalDescription, setGeneralDescription] = useState('');
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

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [driverIdError, setDriverIdError] = useState<boolean>(false);
    const [destinationWarehouseIdError, setDestinationWarehouseIdError] = useState<boolean>(false);
    // const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

    const [initialDispatchDetails, setInitialDispatchDetails] = useState<FormDispatchDetail[]>([]);

    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
    const [warehouseItems, setWarehouseItems] = useState<ItemBalanceType[]>([]);

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

    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusData, setStatusData] = useState<{ id: string | null; status: number | null; description: string }>({
        id: null,
        status: null,
        description: ''
    });
    const [openStatusDescriptionModal, setOpenStatusDescriptionModal] = useState(false);
    const [readOnlyDescription, setReadOnlyDescription] = useState<string>('');

    const [removedDispatchDetails, setRemovedDispatchDetails] = useState<any[]>([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);


    const [viewedDispatch, setViewedDispatch] = useState<BetweenWarehouseDispatchType | null>(null);

    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedDispatchForDownload, setSelectedDispatchForDownload] = useState<BetweenWarehouseDispatchType | null>(null);

    const [newItem, setNewItem] = useState<FormDispatchDetail | null>(null);


    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [showAlert, authToken]);

    const fetchWarehouseItems = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-warehouse-all-items-balance/${Number(warehouseId)}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                setWarehouseItems(response.data.data);
            } else {
                setWarehouseItems([]);
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate, warehouseId, showAlert, authToken]);

    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }

        let requestParams = {};

        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }

        try {
            const [driversRes, warehousesRes, betweenDispatchesRes] = await Promise.all([
                axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<WarehouseType[]>>(server.baseurl + server.initialoperations + "get-warehouses",
                    {
                        headers: { "Authorization": `Bearer ${authToken}` },
                        params: requestParams
                    }),
                axios.get<ApiResponse<BetweenWarehouseDispatchType[]>>(server.baseurl + server.warehouse + `get-between-warehouse-dispatches/${Number(warehouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);

            setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
            setWarehouses(warehousesRes.data?.data?.filter(w => w.recordStatus === 0).map(w => ({ ...w, id: Number(w.id) })) || []);

            if (betweenDispatchesRes.data?.httpStatusCode === 200) {
                const allDispatches = betweenDispatchesRes.data.data;
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
                showAlert(betweenDispatchesRes.data?.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, warehouseId, showAlert, authToken]);

    useEffect(() => {
        fetchInitialData();
        fetchWarehouseItems();
    }, [fetchInitialData, fetchWarehouseItems]);

    useEffect(() => {
        let filteredDispatches = dispatchList.filter(d => {
            const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.destinationWarehouse?.name && d.destinationWarehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
        if (dispatchDetails.length === 0 || dispatchDetails.some(d => !d.itemId || !d.quantity)) {
            // setDispatchDetailsError(true);
            isValid = false;
        } else {
            // setDispatchDetailsError(false);
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
        setInitialDispatchDetails([]);
        setIsFormVisible(false);
        setEditingId(null);
        setDocDateError(false);
        setDriverIdError(false);
        setDestinationWarehouseIdError(false);
        // setDispatchDetailsError(false);
        setSelectedVehicleId(null);
        setSelectedVehicleName(null);
    };

    const insertDispatch = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const payload: NewDispatchData = {
            docDate: docDate?.toISOString() || new Date().toISOString(),
            description: generalDescription,
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
            description: generalDescription,
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
        debugger
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

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setEditingId(selectedRowForMenu.id);
            setDocDate(new Date(selectedRowForMenu.docDate));
            setGeneralDescription(selectedRowForMenu.description || '');
            setEditingCode(selectedRowForMenu.code);
            setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
            setSelectedDestinationWarehouseId(Number(selectedRowForMenu.destinationWarehouse?.id));
            if (selectedRowForMenu.driverVehicle) {
                setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
                setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
            }

            const formattedDetails: FormDispatchDetail[] = (selectedRowForMenu.warehouseDispatchDetails || []).map(d => {

                const itemData = d.item;
                if (!itemData) {
                    // اگر داده محصول موجود نیست، یک هشدار نشان داده و یک آبجکت موقت برگردان
                    console.warn("Sevk detayında ürün verisi eksik:", d);
                    return {
                        itemId: null,
                        quantity: d.quantity,
                        description: d.description,
                        item: undefined,
                        balance: d.quantity,
                    } as FormDispatchDetail; // از as FormDispatchDetail برای اطمینان از تایپ خروجی استفاده می‌شود
                }

                return {
                    // itemId: باید Number باشد
                    itemId: Number(itemData.id),

                    quantity: d.quantity,
                    description: d.description,

                    // item: باید BaseItemType باشد (itemData مطمئناً BaseItemType است)
                    item: {
                        id: String(itemData.id), // ID محصول در شیء item باید string باشد
                        name: itemData.name,
                        abbreviation: itemData.abbreviation,
                        unit: itemData.unit,
                    },
                    balance: d.quantity,
                };
            });
            setDispatchDetails(formattedDetails);
            setInitialDispatchDetails(formattedDetails);
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

                const selectedItem = warehouseItems.find(item => Number(item.itemId) === updatedDetail.itemId);
                const totalWarehouseBalance = Number(selectedItem?.balance || 0);

                // محاسبه مجموع مقادیر سایر ردیف‌ها به جز ردیف فعلی
                const quantityInOtherRows = newDetails
                    // فیلتر کردن ردیف فعلی
                    .filter((_, i) => i !== index)
                    // فیلتر کردن بر اساس آیتم یکسان
                    .filter(d => d.itemId === updatedDetail.itemId)
                    // جمع کردن مقادیر با تبدیل صریح به عدد
                    .reduce((sum: number, d) => sum + Number(d.quantity), 0);

                // موجودی قابل ویرایش (Total Balance - Other Quantities)
                // مقدار فعلی ردیف باید از Total Balance کم نشود چون جزئی از موجودی نیست.
                const maxEditableQuantity = totalWarehouseBalance - quantityInOtherRows;

                // جلوگیری از مقادیر منفی در بالانس نمایشی
                const safeMaxEditableQuantity = Math.max(0, maxEditableQuantity);

                if (isNaN(numValue) || numValue < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updatedDetail.quantity = 0;
                } else if (numValue > safeMaxEditableQuantity) {
                    showAlert(`Girdiğiniz miktar stoktan fazla! Maksimum: ${safeMaxEditableQuantity}`, 'warning');
                    updatedDetail.quantity = safeMaxEditableQuantity;
                } else {
                    updatedDetail.quantity = numValue; // استفاده از numValue برای حفظ دقت
                }
            } else {
                (updatedDetail as any)[field] = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [showAlert, warehouseItems]);

    const handleEditVehicleSelection = () => {
        if (vehiclesList.length > 1) {
            setOpenVehicleModal(true);
            setTempSelectedVehicle(selectedVehicle);
        } else {
            showAlert('Bu şoförün tek bir aracı bulunmaktadır.', 'info');
        }
    };

    // const exportDispatchesToPdf = (data: BetweenWarehouseDispatchType[], title: string, _subtitle?: string) => {
    //     if (!data || data.length === 0) {
    //         showAlert('PDF oluşturulacak sevk belgesi bulunamadı.', 'warning');
    //         return;
    //     }

    //     showAlert('PDF oluşturuluyor...', 'info');

    //     const doc = new jsPDF();
    //     const docAny = doc as any;
    //     let yPos = 55;

    //     data.forEach((dispatch, index) => {
    //         if (index > 0) {
    //             doc.addPage();
    //             yPos = 55;
    //         }

    //         const pageTitle = `${title} - ${dispatch.code}`;
    //         addPdfHeader(doc, pageTitle);

    //         doc.setFontSize(10);
    //         doc.text(`Kaynak Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
    //         doc.text(`Hedef Depo: ${dispatch.destinationWarehouse?.name || '-'}`, 15, yPos + 5);
    //         doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos + 10);
    //         doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`, 15, yPos + 15);
    //         doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)})`, 15, yPos + 20);

    //         doc.text(`Genel Açıklama: ${dispatch.description || '-'}`, 15, yPos + 25);
    //         yPos += 30;

    //         const detailsRows = (dispatch.warehouseDispatchDetails || []).map(d => [
    //             d.item?.name || '-',
    //             d.quantity,
    //             d.item?.unit?.title || '-',
    //             d.description || '-'
    //         ]);

    //         const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
    //         const totalQuantity = (dispatch.warehouseDispatchDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);

    //         autoTable(docAny, {
    //             startY: yPos,
    //             head: [columns],
    //             body: detailsRows,
    //             theme: 'grid',
    //             styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
    //             headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
    //             didDrawPage: () => {
    //                 addPdfFooter(doc);
    //             }
    //         });

    //         const finalY = docAny.lastAutoTable.finalY || yPos;
    //         doc.setFontSize(10);
    //         doc.text(`Toplam Miktar: ${totalQuantity}`, 15, finalY + 5);

    //         yPos = finalY + 10;
    //     });

    //     doc.save(`${title.replace(/ /g, '_')}.pdf`);
    //     showAlert('PDF başarıyla oluşturuldu.', 'success');
    // };

    // const exportDispatchesToExcel = (data: BetweenWarehouseDispatchType[], title: string) => {
    //     if (!data || data.length === 0) {
    //         showAlert('Excel oluşturulacak sevk belgesi bulunamadı.', 'warning');
    //         return;
    //     }
    //     showAlert('Excel oluşturuluyor...', 'info');
    //     const workbook = new Excel.Workbook();

    //     data.forEach(dispatch => {
    //         const worksheetTitle = `Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_');
    //         const worksheet = workbook.addWorksheet(worksheetTitle);

    //         const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
    //         const totalColumns = detailsColumns.length;

    //         addExcelHeader(worksheet, title, totalColumns);

    //         worksheet.addRow([`Sevk Belgesi Kodu:`, dispatch.code]);
    //         worksheet.addRow([`Kaynak Depo:`, dispatch.warehouse?.name || '-']);
    //         worksheet.addRow([`Hedef Depo:`, dispatch.destinationWarehouse?.name || '-']);
    //         worksheet.addRow([`Şoför:`, `${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`]);
    //         worksheet.addRow([`Araç:`, `${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`]);
    //         worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);
    //         worksheet.addRow([`Durum:`, dispatch.statusText || '-']);
    //         worksheet.addRow([`Açıklama:`, dispatch.description || '-']);
    //         worksheet.addRow([]);

    //         const headerRow = worksheet.addRow(detailsColumns);
    //         headerRow.font = { name: 'NotoSans', bold: true };
    //         headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

    //         (dispatch.warehouseDispatchDetails || []).forEach(d => {
    //             worksheet.addRow([
    //                 d.item?.name || '-',
    //                 d.quantity,
    //                 d.item?.unit?.title || '-',
    //                 d.description || '-'
    //             ]);
    //         });

    //         const totalQuantity = (dispatch.warehouseDispatchDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
    //         const totalRow = worksheet.addRow([`Toplam Miktar`, totalQuantity, '', '']);
    //         totalRow.font = { name: 'NotoSans', bold: true };
    //         totalRow.getCell(2).numFmt = '0';

    //         worksheet.addRow([]);
    //         addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);
    //     });

    //     const fileName = `${title.replace(/ /g, '_')}.xlsx`;
    //     workbook.xlsx.writeBuffer().then(buffer => {
    //         saveAs(new Blob([buffer]), fileName);
    //         showAlert('Excel başarıyla oluşturuldu.', 'success');
    //     });
    // };


    // ۱. تابع کمکی جدید (اضافه شود)
    const getTotalsByUnit = (details: any[]) => {
        const totals: Record<string, number> = {};
        details.forEach(d => {
            const unit = d.item?.unit?.title || 'Bilinmiyor';
            const qty = Number(d.quantity) || 0;
            totals[unit] = (totals[unit] || 0) + qty;
        });
        return totals;
    };

    // ۲. آپدیت تابع PDF
    const exportDispatchesToPdf = (data: BetweenWarehouseDispatchType[], title: string, subtitle?: string) => {
        if (!data || data.length === 0) throw new Error('PDF oluşturulacak veri bulunamadı.');

        const doc = new jsPDF();
        const docAny = doc as any;

        data.forEach((dispatch, index) => {
            let yPos = 55;
            if (index > 0) doc.addPage();

            addPdfHeader(doc, title, subtitle);

            doc.setFontSize(10);
            doc.text(`Kaynak Depo: ${dispatch.warehouse?.name || '-'}`, 15, yPos);
            doc.text(`Hedef Depo: ${dispatch.destinationWarehouse?.name || '-'}`, 15, yPos + 5);
            doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos + 10);
            doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)}`, 15, yPos + 15);
            doc.text(`Genel Açıklama: ${dispatch.description || '-'}`, 15, yPos + 20);
            yPos += 25;

            const head = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const body = (dispatch.warehouseDispatchDetails || []).map(d => [
                d.item?.name || '-',
                Number(d.quantity).toLocaleString('tr-TR'),
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);

            // محاسبه فوتر
            const totals = getTotalsByUnit(dispatch.warehouseDispatchDetails || []);
            const footRows = Object.entries(totals).map(([unit, qty]) => [
                'Toplam:',
                qty.toLocaleString('tr-TR'),
                unit,
                ''
            ]);

            autoTable(docAny, {
                startY: yPos,
                head: [head],
                body: body,
                foot: footRows, // فوتر اضافه شد
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                footStyles: { font: 'NotoSans', fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'normal' },
                didDrawPage: () => { addPdfFooter(doc); }
            });
        });

        doc.save(`${title.replace(/ /g, '_')}.pdf`);
    };

    // ۳. آپدیت تابع Excel
    const exportDispatchesToExcel = async (data: BetweenWarehouseDispatchType[], title: string) => {
        if (!data || data.length === 0) throw new Error('Excel oluşturulacak veri bulunamadı.');

        const workbook = new Excel.Workbook();
        data.forEach(dispatch => {
            const ws = workbook.addWorksheet(`Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_').substring(0, 30));
            const head = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];

            addExcelHeader(ws, title, head.length);

            ws.addRow([`Sevk Kodu:`, dispatch.code]);
            ws.addRow([`Kaynak Depo:`, dispatch.warehouse?.name || '-']);
            ws.addRow([`Hedef Depo:`, dispatch.destinationWarehouse?.name || '-']);
            ws.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);
            ws.addRow(['Genel Açıklama', dispatch.description || '-']);
            ws.addRow([]);

            const hr = ws.addRow(head);
            hr.font = { name: 'NotoSans', bold: true };
            hr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            (dispatch.warehouseDispatchDetails || []).forEach(d => {
                ws.addRow([
                    d.item?.name || '-',
                    Number(d.quantity),
                    d.item?.unit?.title || '-',
                    d.description || '-'
                ]);
            });

            // اضافه کردن جمع کل به تفکیک واحد
            ws.addRow([]);
            const summaryTitle = ws.addRow(["Birim Bazlı Toplamlar"]);
            summaryTitle.font = { name: 'NotoSans', bold: true, underline: true };

            const totals = getTotalsByUnit(dispatch.warehouseDispatchDetails || []);
            Object.entries(totals).forEach(([unit, total]) => {
                const tr = ws.addRow(['Toplam:', total, unit]);
                tr.getCell(1).font = { name: 'NotoSans', bold: true };
                tr.getCell(1).alignment = { horizontal: 'right' };
                tr.getCell(2).font = { name: 'NotoSans', bold: true };
                tr.getCell(2).numFmt = '#,##0.##';
                tr.getCell(3).font = { name: 'NotoSans', bold: true };
            });

            ws.addRow([]);
            addExcelCompanyInfo(ws, ws.lastRow!.number + 2, head.length);

            ws.getColumn(1).width = 30;
            ws.getColumn(2).width = 15;
            ws.getColumn(3).width = 15;
            ws.getColumn(4).width = 40;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}.xlsx`);
    };

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

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const handleOpenRowDownloadModal = (dispatch: BetweenWarehouseDispatchType) => {
        setSelectedDispatchForDownload(dispatch);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleCloseRowDownloadModal = () => {
        setSelectedDispatchForDownload(null);
        setOpenRowDownloadModal(false);
    };

    // const handleAddAllItemsToDispatch = () => {
    //     const itemsToForm = warehouseItems.map(item => ({
    //         itemId: Number(item.itemId),
    //         quantity: Number(item.balance),
    //         description: '',
    //         item: {
    //             id: item.itemId,
    //             name: item.name,
    //             abbreviation: item.code || '',
    //             unit: {
    //                 id: '1',
    //                 title: 'Adet',
    //             },
    //         },
    //         balance: Number(item.balance)
    //     }));
    //     setDispatchDetails(itemsToForm);
    // };

    const handleOpenStatusModal = (id: string, status: number) => {
        setStatusData({ id, status, description: '' });
        setOpenStatusModal(true);
        handleCloseMenu();
    };

    const handleOpenReadOnlyDescriptionModal = (description: string) => {
        setReadOnlyDescription(description);
        setOpenStatusDescriptionModal(true);
        handleCloseMenu();
    };

    const updateDispatchStatus = async () => {
        setLoadingButton(true);
        if (!authToken || !statusData.id || statusData.status === null) {
            showAlert('Geçersiz işlem veya oturum sona erdi.', 'error');
            setLoadingButton(false);
            return;
        }

        try {
            const payload = {
                id: Number(statusData.id),
                status: statusData.status,
                description: statusData.description,
            };

            const response = await axios.put(server.baseurl + server.warehouse + "update-between-warehouse-dispatch-status", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });

            if (response.data.httpStatusCode === 200) {
                showAlert('Sevk belgesi durumu başarıyla güncellendi.', 'success');
                setOpenStatusModal(false);
                fetchInitialData();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };


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


    // تابع باز کردن پنل افزودن تکی
    const handleAddNewRow = () => {
        // اگر لیست قبلاً با دکمه "یکجا" پر شده، آن را پاک کن
        if (dispatchDetails.length === warehouseItems.length && warehouseItems.length > 0) {
            setDispatchDetails([]);
            setRemovedDispatchDetails([]);
        }
        setNewItem({
            itemId: null,
            quantity: '',
            description: '',
            balance: 0
        });
    };

    // تایید و اضافه کردن آیتم تکی به لیست نهایی
    const confirmNewItem = () => {
        if (newItem && newItem.itemId && Number(newItem.quantity) > 0) {
            const exists = dispatchDetails.some(d => d.itemId === newItem.itemId);
            if (exists) {
                showAlert("Bu ürün zaten listede mevcut!", "warning");
                return;
            }
            setDispatchDetails(prev => [...prev, newItem]);
            // ریست فرم برای آیتم بعدی بدون بستن پنل ورودی
            setNewItem({ itemId: null, quantity: '', description: '', balance: 0 });
        } else {
            showAlert("Lütfen geçerli bir ürün ve miktar girin.", "warning");
        }
    };

    // تابع افزودن یا حذف یکجای تمام آیتم‌ها از استوک انبار
    const handleToggleAllItems = () => {
        if (dispatchDetails.length > 0) {
            setDispatchDetails([]);
            setRemovedDispatchDetails([]); // پاک کردن آرشیو هنگام حذف یکجا ✨
        } else {
            setNewItem(null); // بستن پنل تکی در صورت باز بودن
            const allItems = warehouseItems.map(item => ({
                itemId: Number(item.itemId),
                quantity: Number(item.balance),
                description: '',
                item: {
                    id: item.itemId,
                    name: item.name,
                    abbreviation: item.code || '',
                },
                balance: Number(item.balance)
            }));
            setDispatchDetails(allItems);
            setRemovedDispatchDetails([]);
        }
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
                                <CustomFormLabel htmlFor="invoice-general-description">Açıklama</CustomFormLabel>
                                <TextField
                                    id="invoice-general-description"
                                    label="Depolar Arası Sevk için genel açıklama giriniz"
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
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={handleAddNewRow}
                                        startIcon={<IconPlus />}
                                        disabled={newItem !== null}
                                    >
                                        Tek Tek Ekle
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color={dispatchDetails.length > 0 ? "error" : "secondary"}
                                        onClick={handleToggleAllItems}
                                        startIcon={dispatchDetails.length > 0 ? <IconTrash /> : <BoltIcon />}
                                        disabled={warehouseItems.length === 0}
                                    >
                                        {dispatchDetails.length > 0 ? "Tümünü Kaldır" : "Tümünü Ekle (Stoktan)"}
                                    </Button>
                                </Stack>
                            </Stack>

                            <Grid container spacing={2}>
                                {/* پنل ورودی برای افزودن تکی */}
                                {newItem && (
                                    <Grid item xs={12} sx={{ bgcolor: 'rgba(0,0,0,0.03)', p: 2, borderRadius: 1, border: '1px dashed #ccc', mb: 2 }}>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} sm={4}>
                                                <Autocomplete
                                                    options={warehouseItems.filter(item => !dispatchDetails.some(d => Number(d.itemId) === Number(item.itemId)))}
                                                    getOptionLabel={(option) => `${option.name} (${option.balance})`}
                                                    value={warehouseItems.find(i => Number(i.itemId) === newItem?.itemId) || null}
                                                    onChange={(_, val) => {
                                                        if (val) {
                                                            setNewItem({
                                                                ...newItem,
                                                                itemId: Number(val.itemId),
                                                                balance: Number(val.balance),
                                                                item: { id: val.itemId, name: val.name, abbreviation: val.code || '' }
                                                            });
                                                        }
                                                    }}
                                                    renderInput={(params) => <TextField {...params} label="Malzeme Seç" size="small" />}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <TextField
                                                    label={`Miktar (Stok: ${newItem.balance || 0})`}
                                                    type="number"
                                                    size="small"
                                                    fullWidth
                                                    value={newItem.quantity}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val > (newItem.balance || 0)) {
                                                            setNewItem({ ...newItem, quantity: newItem.balance || 0 });
                                                            showAlert(`Stok miktarını aşamazsınız!`, "warning");
                                                        } else {
                                                            setNewItem({ ...newItem, quantity: e.target.value });
                                                        }
                                                    }}
                                                />
                                            </Grid>
                                            <Grid item xs={6} sm={4}>
                                                <TextField
                                                    label="Açıklama"
                                                    size="small"
                                                    fullWidth
                                                    value={newItem.description}
                                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}>
                                                <IconButton color="success" onClick={confirmNewItem}><IconCheck /></IconButton>
                                                <IconButton color="error" onClick={() => setNewItem(null)}><IconX /></IconButton>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                )}

                                {/* لیست ردیف‌های اضافه شده */}
                                {dispatchDetails.map((detail, index) => {
                                    const selectedItem = warehouseItems.find(item => Number(item.itemId) === Number(detail.itemId));
                                    const warehouseBalance = Number(selectedItem?.balance || 0);

                                    // محاسبه سقف مجاز (موجودی فعلی + مقدار قبلی در صورت ویرایش)
                                    const originalQty = editingId ? Number(initialDispatchDetails.find(d => d.itemId === detail.itemId)?.quantity || 0) : 0;
                                    const maxAllowed = warehouseBalance + originalQty;

                                    return (
                                        <Grid item xs={12} key={index}>
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ borderBottom: '1px solid #eee', pb: 1 }}>
                                                <Box sx={{ flexGrow: 1, minWidth: '200px' }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                        {detail.item?.name || 'Ürün Adı'}
                                                    </Typography>
                                                </Box>
                                                <CustomTextField
                                                    type="number"
                                                    label={`Miktar (Stok: ${maxAllowed})`}
                                                    value={detail.quantity}
                                                    onChange={(e: any) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                    sx={{ width: { xs: '100%', sm: '150px' } }}
                                                />
                                                <CustomTextField
                                                    placeholder="Açıklama"
                                                    value={detail.description}
                                                    onChange={(e: any) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                    sx={{ flexGrow: 1 }}
                                                />
                                                <IconButton color="error" onClick={() => handleRemoveDispatchDetail(index)}>
                                                    <IconTrash />
                                                </IconButton>
                                            </Stack>
                                        </Grid>
                                    );
                                })}
                            </Grid>
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
                    <Box sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                            <Typography variant="h5">
                                Depolar Arası Sevk Listesi

                                {notifIds.length > 0 && (
                                    <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                                        <Chip
                                            label={`Bildirim filtresi: ${notifIds.length}`}
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
                            </Typography>

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
                            <Typography variant="h6" sx={{ ml: 2 }}>Depolar arası sevk belgeleri yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table aria-label="Sevk belgesi tablosu">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Kaynak Depo</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Hedef Depo</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Şoför</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Araç</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Sevk Detayları</Typography></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedDispatches.length > 0 ? (
                                        displayedDispatches.map(row => (
                                            <TableRow key={row.id}>
                                                <StyledTableCell><Typography variant="body1">{row.code}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.warehouse?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.destinationWarehouse?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{`${row.driver?.name || ''} ${row.driver?.family || ''}`}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{`${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                                <StyledTableCell sx={{ maxWidth: 150 }}>
                                                    {row.description && row.description.trim().length > 0 ? (
                                                        // حالت اول: اگر توضیحات وجود داشت (خالی نبود)
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                            <Button

                                                                variant="outlined"
                                                                style={{ fontSize: "10px", padding: "2px 5px" }}
                                                                onClick={() => handleOpenDescriptionModal(row.description)}
                                                            >
                                                                Açıklamayı Oku
                                                            </Button>
                                                        </CustomTooltip>
                                                    ) : (
                                                        // حالت دوم: اگر توضیحات نال یا خالی بود
                                                        <Typography variant="body2" align="center">
                                                            -
                                                        </Typography>
                                                    )}
                                                </StyledTableCell>
                                                <StyledTableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Chip label={row.statusText} color={row.statusColor} />
                                                        {row.statusDescription && (row.status === 1 || row.status === 2) && (
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
                                                                    setViewedDispatch(row); // ✅ اضافه شده
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
                                                        {selectedRowForMenu?.status === 0 && (
                                                            <>
                                                                <MuiMenuItem onClick={() => handleOpenStatusModal(selectedRowForMenu!.id, 1)}>
                                                                    <ListItemIcon><IconCheck width={18} /></ListItemIcon>Onayla
                                                                </MuiMenuItem>
                                                                <MuiMenuItem onClick={() => handleOpenStatusModal(selectedRowForMenu!.id, 2)}>
                                                                    <ListItemIcon><IconX width={18} /></ListItemIcon>Reddet
                                                                </MuiMenuItem>
                                                            </>
                                                        )}
                                                        {selectedRowForMenu?.status === 1 && (
                                                            <MuiMenuItem onClick={() => handleOpenStatusModal(selectedRowForMenu!.id, 2)}>
                                                                <ListItemIcon><IconX width={18} /></ListItemIcon>Reddet
                                                            </MuiMenuItem>
                                                        )}
                                                        {selectedRowForMenu?.status === 2 && (
                                                            <MuiMenuItem onClick={() => handleOpenStatusModal(selectedRowForMenu!.id, 1)}>
                                                                <ListItemIcon><IconCheck width={18} /></ListItemIcon>Onayla
                                                            </MuiMenuItem>
                                                        )}
                                                        {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                        {hasDeletePermission && (
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}>
                                                                <ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek
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
                                                    Hiç sevk belgesi bulunamadı.
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

            {/* Details Modal - به همراه جدول جمع کل و دکمه‌های دانلود */}
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Sevk Detayları
                    {viewedDispatch && (
                        <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>
                            ({viewedDispatch.code})
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent dividers>
                    {detailsToShow.length > 0 ? (
                        <>
                            <TableContainer component={Paper}>
                                <Table aria-label="Sevk detayları tablosu" size="small">
                                    <TableHead sx={{ backgroundColor: 'rgb(149 147 125 / 65%)' }}>
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
                                                <StyledTableCell><Typography variant="body1">{Number(detail.quantity).toLocaleString()}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* ✅ جدول خلاصه جمع‌ها */}
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <TableContainer component={Paper} variant="outlined" sx={{ width: 'auto', minWidth: '300px' }}>
                                    <Table size="small">
                                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                            <TableRow>
                                                <StyledTableCell align="center" colSpan={2}>
                                                    <Typography variant="subtitle2" fontWeight="bold">Birim Bazlı Toplamlar</Typography>
                                                </StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {/* استفاده از تابع getTotalsByUnit */}
                                            {Object.entries(getTotalsByUnit(detailsToShow)).map(([unit, total]) => (
                                                <TableRow key={unit}>
                                                    <StyledTableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                                        Toplam {unit}:
                                                    </StyledTableCell>
                                                    <StyledTableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                                                        {total.toLocaleString()}
                                                    </StyledTableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Bu sevk belgesi için detay bulunamadı.
                        </Typography>
                    )}
                </DialogContent>

                {/* ✅ دکمه‌های دانلود */}
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} // در موبایل ستونی، در دسکتاپ ردیفی
                        spacing={2} // فاصله یکسان بین تمام دکمه‌ها
                        sx={{ width: '100%' }} // اشغال تمام عرض کادر
                    >
                        <Button
                            variant="contained"
                            color="error"
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }}
                            startIcon={<IconFileText />}
                            disabled={!viewedDispatch}
                            onClick={() => {
                                if (viewedDispatch) {
                                    showAlert('PDF oluşturuluyor...', 'info');
                                    exportDispatchesToPdf([viewedDispatch], `Sevk Belgesi Detayları: ${viewedDispatch.code}`);
                                    showAlert('PDF indiriliyor.', 'success');
                                }
                            }}
                        >
                            PDF İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }}
                            startIcon={<IconFileSpreadsheet />}
                            disabled={!viewedDispatch}
                            onClick={async () => {
                                if (viewedDispatch) {
                                    showAlert('Excel oluşturuluyor...', 'info');
                                    await exportDispatchesToExcel([viewedDispatch], `Sevk Belgesi Detayları: ${viewedDispatch.code}`);
                                    showAlert('Excel indiriliyor.', 'success');
                                }
                            }}
                        >
                            Excel İndir
                        </Button>
                        <Button onClick={() => setOpenDetailsModal(false)} color="secondary" variant="outlined"
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }} >Kapat</Button>

                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={openStatusModal} onClose={() => setOpenStatusModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Sevk Belgesi Durumunu Güncelle</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ my: 2 }}>
                        Bu sevk belgesini {statusData.status === 1 ? 'onaylamak' : 'reddetmek'} üzeresiniz.
                    </Typography>
                    <CustomFormLabel>Açıklama (isteğe bağlı)</CustomFormLabel>
                    <CustomTextField
                        fullWidth
                        multiline
                        rows={4}
                        value={statusData.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Açıklamanızı buraya girin..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusModal(false)} color="secondary">
                        İptal
                    </Button>
                    <Button onClick={updateDispatchStatus} color={statusData.status === 1 ? 'success' : 'error'} variant="contained" disabled={loadingButton}>
                        {loadingButton ? 'Bekleniyor...' : 'Güncelle'}
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

            <DeleteBetweenwarehouseDispatch
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                dispatchIdToDelete={dispatchIdToDelete}
                dispatchCodeToDelete={dispatchCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />

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