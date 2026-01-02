// src/views/warehouses/ListStoreDispatch.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
    IconFileSpreadsheet, IconFileText, IconReload,
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
import DeleteStoreDispatch from "./DeleteStoreDispatch";
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
    store?: {
        id: string;
        name: string;
    };
    driver?: {
        id: string;
        name: string;
        family: string;
    };
    project?: {
        id: string;
        title: string;
        code: string;
    };
    driverVehicle?: {
        id: string;
        name: string;
        plaque: string;
    };
    storeDispatchDetails: DispatchDetailType[];
    statusText?: string;
    statusColor?: 'success' | 'error' | 'warning' | 'info';
}

interface NewDispatchData {
    docDate: string;
    description: string,
    storeId: number;
    driverId: number;
    projectId: number;
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
interface ProjectType {
    id: number;
    title: string;
    code: string;
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
    item?: ItemWithBalanceType;
    balance?: number;
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

// --- Helper: محاسبه جمع‌ها بر اساس واحد ---
const calculateDispatchSummaries = (details: any[]) => {
    const summary: Record<string, number> = {};
    details.forEach(d => {
        const unitTitle = d.item?.unit?.title || "Diğer";
        const qty = Number(d.quantity) || 0;
        summary[unitTitle] = (summary[unitTitle] || 0) + qty;
    });
    return summary;
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


// PDF helpers
const addPdfHeader = (doc: jsPDF, title: string, subtitle?: string) => {

    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 35; // کمی کوچک‌تر برای ظرافت بیشتر
    const logoHeight = 18;
    const margin = 15;
    const logoX = pageWidth - logoWidth - margin; // لوگو سمت راست

    try {
        doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
    } catch (e) {
        console.error("Logo yüklenemedi", e);
    }

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 25, { align: 'center' }); // عنوان وسط

    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.text(`Rapor Tarihi:`, 15, 35);
    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 35);
    if (subtitle) doc.text(subtitle, 70, 52);

    // اضافه کردن خط جداکننده خاکستری طبق استاندارد جدید
    // doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);
};

const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
    doc.setTextColor(100);

    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
        'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
    ];

    let footerY = pageHeight - 20;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 4;
    });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
    doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};


const exportDispatchesToPdf = (data: DispatchType[], title: string, subtitle?: string) => {
    if (!data || data.length === 0) {
        console.warn('PDF oluşturulacak sevk belgesi bulunamadı.');
        return;
    }

    const doc = new jsPDF();
    const docAny = doc as any;
    let yPos = 55;

    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');

    data.forEach((dispatch, index) => {
        if (index > 0) {
            doc.addPage();
            yPos = 55;
        }

        const pageTitle = `${title}`;
        addPdfHeader(doc, pageTitle, subtitle);

        doc.setFontSize(10);
        doc.text(`Şantiyenin Depo: ${dispatch.store?.name || '-'}`, 15, yPos);
        doc.text(`Proje: ${dispatch.project?.title || '-'}`, 15, yPos + 5);
        doc.text(`Şoför: ${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`, 15, yPos + 10);
        doc.text(`Araç: ${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`, 15, yPos + 15);
        doc.text(`Belge Tarihi: ${formatDateDisplay(dispatch.docDate)})`, 15, yPos + 20);

        doc.text(`Genel Açıklama: ${dispatch.description || '-'}`, 15, yPos + 25);
        yPos += 30;

        const detailsRows = (dispatch.storeDispatchDetails || []).map(d => [
            d.item?.name || '-',
            Number(d.quantity).toLocaleString('tr-TR'),
            d.item?.unit?.title || '-',
            d.description || '-'
        ]);

        const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];

        // محاسبه جمع‌ها برای فوتر
        const summaries = calculateDispatchSummaries(dispatch.storeDispatchDetails || []);
        const summaryRows = Object.entries(summaries).map(([unit, total]) => [
            "TOPLAM:",
            total.toLocaleString('tr-TR'),
            unit,
            ""
        ]);

        autoTable(docAny, {
            startY: yPos,
            head: [columns],
            body: detailsRows,
            foot: summaryRows, // ✅ فوتر جمع‌ها
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            footStyles: { font: 'NotoSans', fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
            didDrawPage: (hookData: any) => {
                if (hookData.pageNumber > 1) {
                    addPdfHeader(doc, pageTitle, subtitle);
                }
                addPdfFooter(doc);
            }
        });

        const finalY = docAny.lastAutoTable.finalY || yPos;
        yPos = finalY + 10;
    });

    doc.save(`${title.replace(/ /g, '_')}.pdf`);
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

const exportDispatchesToExcel = (data: DispatchType[], title: string) => {
    if (!data || data.length === 0) {
        console.warn('Excel oluşturulacak sevk belgesi bulunamadı.');
        return;
    }

    const workbook = new Excel.Workbook();

    data.forEach(dispatch => {
        const worksheetTitle = `Sevk_${dispatch.code}`.replace(/[\\/*?:[\]]/g, '_').substring(0, 30);
        const worksheet = workbook.addWorksheet(worksheetTitle);

        const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
        const totalColumns = detailsColumns.length;

        addExcelHeader(worksheet, title, totalColumns);

        worksheet.addRow([`Sevk Belgesi Kodu:`, dispatch.code]);
        worksheet.addRow([`Şantiyenin Depo:`, dispatch.store?.name || '-']);
        worksheet.addRow([`Proje:`, dispatch.project?.title || '-']);
        worksheet.addRow([`Şoför:`, `${dispatch.driver?.name || ''} ${dispatch.driver?.family || ''}`]);
        worksheet.addRow([`Araç:`, `${dispatch.driverVehicle?.name || '-'} (${dispatch.driverVehicle?.plaque || ''})`]);
        worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(dispatch.docDate)]);

        worksheet.addRow([`Açıklama:`, dispatch.description || '-']);
        worksheet.addRow([]);

        const headerRow = worksheet.addRow(detailsColumns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        (dispatch.storeDispatchDetails || []).forEach(d => {
            worksheet.addRow([
                d.item?.name || '-',
                Number(d.quantity),
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);
        });

        // ✅ بخش خلاصه جمع‌ها در اکسل
        worksheet.addRow([]);
        const summaryTitle = worksheet.addRow(["Birim Bazlı Toplamlar"]);
        summaryTitle.font = { bold: true, underline: true };

        const summaries = calculateDispatchSummaries(dispatch.storeDispatchDetails || []);
        Object.entries(summaries).forEach(([unit, total]) => {
            const r = worksheet.addRow(["TOPLAM:", total, unit]);
            r.getCell(1).font = { bold: true };
            r.getCell(1).alignment = { horizontal: 'right' };
            r.getCell(2).font = { bold: true };
        });

        worksheet.addRow([]);
        addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);

        worksheet.getColumn(1).width = 30;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 40;
    });

    const fileName = `${title.replace(/ /g, '_')}.xlsx`;
    workbook.xlsx.writeBuffer().then(buffer => {
        saveAs(new Blob([buffer]), fileName);
    });
};


// === Main Component ===
const ListStoreDispatch = () => {
    const { storeId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');


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


    const nameInputRef = useRef<HTMLInputElement>(null);

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

    const [dispatchDetails, setDispatchDetails] = useState<FormDispatchDetail[]>([]);
    const [initialDispatchDetails, setInitialDispatchDetails] = useState<FormDispatchDetail[]>([]);
    const [removedDispatchDetails, setRemovedDispatchDetails] = useState<any[]>([]);

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

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [docDateError, setDocDateError] = useState<boolean>(false);
    const [driverIdError, setDriverIdError] = useState<boolean>(false);
    const [projectIdError, setProjectIdError] = useState<boolean>(false);
    const [dispatchDetailsError, setDispatchDetailsError] = useState<boolean>(false);

    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [projects, setProjects] = useState<ProjectType[]>([]);
    const [itemsWithBalance, setItemsWithBalance] = useState<ItemWithBalanceType[]>([]);

    const [generalDescription, setGeneralDescription] = useState('');
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [dispatchIdToDelete, setDispatchIdToDelete] = useState<string | null>(null);
    const [dispatchCodeToDelete, setDispatchCodeToDelete] = useState<string>('');

    const [vehiclesList, setVehiclesList] = useState<VehicleType[]>([]);
    const [selectedVehicleName, setSelectedVehicleName] = useState<string | null>(null);
    const [openVehicleModal, setOpenVehicleModal] = useState(false);
    const [tempSelectedVehicle, setTempSelectedVehicle] = useState<number | null>(null);

    // 🔄 تغییر State مودال به کل آبجکت برای نمایش در مودال جزئیات
    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [viewedDispatch, setViewedDispatch] = useState<DispatchType | null>(null);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [openStatusUpdateModal, setOpenStatusUpdateModal] = useState(false);
    const [updateModalData, setUpdateModalData] = useState<{ id: string | null; status: number; description: string }>({ id: null, status: 0, description: '' });

    const [openStatusDescriptionModal, setOpenStatusDescriptionModal] = useState(false);
    const [readOnlyDescription, setReadOnlyDescription] = useState<string>('');

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedDispatchForDownload, setSelectedDispatchForDownload] = useState<DispatchType | null>(null);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

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
                // setSelectedVehicle(null);
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
    }, [showAlert, authToken, navigate]);


    const fetchStoreItems = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(
                `${server.baseurl}${server.warehouse}get-store-all-items-balance/${Number(storeId)}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                setItemsWithBalance(response.data.data);
            } else {
                setItemsWithBalance([]);
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate, storeId, showAlert, authToken]);

    // API Calls
    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }

        try {
            const [driversRes, projectsRes, dispatchesRes, itemsBalanceRes] = await Promise.all([
                axios.get<ApiResponse<DriverType[]>>(server.baseurl + server.warehouse + "get-drivers", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<ProjectType[]>>(server.baseurl + server.warehouse + "get-project", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<DispatchType[]>>(server.baseurl + server.warehouse + `get-store-dispatches/${Number(storeId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<ItemWithBalanceType[]>>(server.baseurl + server.warehouse + `get-store-all-items-balance/${Number(storeId)}`, { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);

            setDrivers(driversRes.data?.data?.filter(d => d.recordStatus === 0).map(d => ({ ...d, id: Number(d.id) })) || []);
            setProjects(projectsRes.data?.data?.filter(p => p.recordStatus === 0).map(p => ({ ...p, id: Number(p.id) })) || []);

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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, storeId, showAlert, authToken]);

    useEffect(() => {
        fetchInitialData();
        fetchStoreItems();
    }, [fetchInitialData, fetchStoreItems]);

    useEffect(() => {
        let filteredDispatches = dispatchList.filter(d => {
            const matchesSearch = d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (d.driver?.name && d.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.driver?.family && d.driver.family.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (d.project?.title && d.project.title.toLowerCase().includes(searchTerm.toLowerCase()));

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
        const isValid = !!selectedDriverId && !!selectedProjectId &&
            !!docDate && dispatchDetails.length > 0 &&
            dispatchDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(isValid);
    }, [selectedDriverId, selectedProjectId, docDate, dispatchDetails]);

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

    // ✨ NEW: Updated validation logic to consider edit mode
    const validateForm = (): boolean => {
        let isValid = true;
        if (!selectedDriverId) { setDriverIdError(true); isValid = false; } else { setDriverIdError(false); }
        if (!selectedProjectId) { setProjectIdError(true); isValid = false; } else { setProjectIdError(false); }
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }
        if (dispatchDetails.length === 0) {
            setDispatchDetailsError(true);
            isValid = false;
        } else {
            const isDetailsValid = dispatchDetails.every((detail) => {
                const numQuantity = Number(detail.quantity);

                if (isNaN(numQuantity) || numQuantity <= 0) {
                    return false;
                }

                const currentItemBalance = itemsWithBalance.find(item => Number(item.itemId) === Number(detail.itemId));
                const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;

                let maxAllowedQuantity = currentStockBalance;

                if (editingId) {
                    const originalDetail = initialDispatchDetails.find(d => Number(d.itemId) === Number(detail.itemId));
                    const originalQuantity = originalDetail ? Number(originalDetail.quantity) : 0;
                    maxAllowedQuantity = currentStockBalance + originalQuantity;
                }

                if (numQuantity > maxAllowedQuantity) {
                    return false;
                }

                return true;
            });

            if (!isDetailsValid) {
                setDispatchDetailsError(true);
                isValid = false;
            } else {
                setDispatchDetailsError(false);
            }
        }
        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };


    const resetFormAndState = () => {
        setDocDate(new Date());
        setGeneralDescription('');
        setSelectedDriverId(null);
        setSelectedProjectId(null);
        setDispatchDetails([]);
        setInitialDispatchDetails([]);
        setRemovedDispatchDetails([]);
        setEditingId(null);
        setDocDateError(false);
        setDriverIdError(false);
        setProjectIdError(false);
        setDispatchDetailsError(false);
        setSelectedVehicleId(null);
        setSelectedVehicleName(null);
        setIsFormVisible(false);
    };

    // === API Actions ===
    const insertDispatch = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); }
        try {
            const payload: NewDispatchData = {
                docDate: docDate?.toISOString() || new Date().toISOString(),
                description: generalDescription,
                storeId: Number(storeId),
                driverId: Number(selectedDriverId),
                driverVehicleId: Number(selectedVehicleId),
                projectId: Number(selectedProjectId),
                dispatchDetails: dispatchDetails.map(d => ({ itemId: Number(d.itemId), quantity: Number(d.quantity), description: d.description }))
            };
            const response = await axios.post(server.baseurl + server.warehouse + "create-store-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
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
            storeId: Number(storeId),
            driverId: Number(selectedDriverId),
            driverVehicleId: Number(selectedVehicleId),
            projectId: Number(selectedProjectId),
            dispatchDetails: dispatchDetails.map(d => ({
                itemId: Number(d.itemId),
                quantity: Number(d.quantity),
                description: d.description
            }))
        };
        try {
            const response = await axios.put(server.baseurl + server.warehouse + "update-store-dispatch", payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } });
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
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                id: Number(updateModalData.id),
                status: updateModalData.status,
                description: updateModalData.description
            };
            const url = `${server.baseurl}${server.warehouse}update-store-dispatch-status`;
            const response = await axios.put(url, payload, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                showAlert('Sevk belgesi durumu başarıyla güncellendi.', 'success');
                fetchInitialData();
                setOpenStatusUpdateModal(false);
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu.', 'error');
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
        handleCloseMenu();
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setLoadingData(true);
            fetchStoreItems().then(() => {
                const formattedDetails: FormDispatchDetail[] = (selectedRowForMenu.storeDispatchDetails || []).map(d => {
                    const itemBalance = itemsWithBalance.find(item => Number(item.itemId) === Number(d.item?.id));

                    return {
                        itemId: Number(d.item?.id),
                        quantity: d.quantity,
                        description: d.description,
                        // اطمینان از اینکه شی item با نوع ItemWithBalanceType مطابقت دارد
                        item: d.item ? {
                            itemId: d.item.id,
                            name: d.item.name,
                            code: d.item.abbreviation,
                            balance: itemBalance?.balance || '0', // از موجودی فعلی استفاده شود
                            unit: d.item.unit
                        } : undefined,
                        balance: itemBalance ? Number(itemBalance.balance) : 0,
                    };
                });

                setDispatchDetails(formattedDetails);
                setInitialDispatchDetails(formattedDetails);  // Store original data for validation

                setEditingId(selectedRowForMenu.id);
                setDocDate(new Date(selectedRowForMenu.docDate));
                setGeneralDescription(selectedRowForMenu.description || '');
                setEditingCode(selectedRowForMenu.code);
                setSelectedDriverId(Number(selectedRowForMenu.driver?.id));
                setSelectedProjectId(Number(selectedRowForMenu.project?.id));
                if (selectedRowForMenu.driverVehicle) {
                    setSelectedVehicleId(Number(selectedRowForMenu.driverVehicle.id));
                    setSelectedVehicleName(`${selectedRowForMenu.driverVehicle.name} (${selectedRowForMenu.driverVehicle.plaque})`);
                }

                setTimeout(() => {
                    nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    nameInputRef.current?.focus();
                }, 100);
                setIsFormVisible(true);
                handleCloseMenu();
                setLoadingData(false);
            });
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

    // ✨ NEW: Handle adding new empty item row
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

    // ✨ NEW: Handle removing an item row
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


    // ✨ NEW: Handle item change and validation
    const handleDispatchDetailChange = useCallback((index: number, field: keyof FormDispatchDetail, value: any) => {
        setDispatchDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };

            if (field === 'itemId') {
                const selectedItem = itemsWithBalance.find(item => Number(item.itemId) === value);
                updatedDetail.itemId = value;
                if (selectedItem) {
                    updatedDetail.item = selectedItem as any;
                    updatedDetail.balance = Number(selectedItem.balance);
                }
            } else if (field === 'quantity') {
                const numValue = Number(value);

                const currentItemBalance = itemsWithBalance.find(item => Number(item.itemId) === Number(updatedDetail.itemId));
                const currentStockBalance = currentItemBalance ? Number(currentItemBalance.balance) : 0;

                let maxAllowedQuantity = currentStockBalance;

                if (editingId) {
                    const originalDetail = initialDispatchDetails.find(d => Number(d.itemId) === Number(updatedDetail.itemId));
                    const originalQuantity = originalDetail ? Number(originalDetail.quantity) : 0;
                    maxAllowedQuantity = currentStockBalance + originalQuantity;
                }

                if (isNaN(numValue) || numValue < 0) {
                    showAlert('Miktar negatif olamaz veya geçersiz bir değer içeremez!', 'warning');
                    updatedDetail.quantity = 0;
                } else if (numValue > maxAllowedQuantity) {
                    showAlert(`Girdiğiniz miktar stoktan fazla! Maksimum: ${maxAllowedQuantity}`, 'warning');
                    updatedDetail.quantity = maxAllowedQuantity;
                } else {
                    updatedDetail.quantity = numValue;
                }
            } else {
                (updatedDetail as any)[field] = value;
            }

            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [itemsWithBalance, showAlert, editingId, initialDispatchDetails]);


    const handleEditVehicleSelection = () => {
        if (vehiclesList.length === 0 && selectedDriverId) {
            fetchVehicles(String(selectedDriverId)).then(() => {
                if (vehiclesList.length > 1) {
                    setOpenVehicleModal(true);
                    setTempSelectedVehicle(selectedVehicleId || vehiclesList[0].id);
                } else {
                    showAlert('Bu şoförün birden fazla aracı bulunmamaktadır.', 'info');
                }
            });
            return;
        }

        if (vehiclesList.length > 1) {
            setOpenVehicleModal(true);
            setTempSelectedVehicle(selectedVehicleId || vehiclesList[0].id);
        } else if (vehiclesList.length === 1) {
            showAlert('Bu şoförün tek bir aracı bulunmaktadır.', 'info');
        } else {
            showAlert('Bu şoför için kayıtlı araç bulunamadı.', 'warning');
        }
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedDispatches : dispatchList;
        const title = isFiltered ? 'Filtrelenmiş Şantiyenin Depo Sevk Raporu' : 'Tüm Şantiyenin Depo Sevk Raporu';
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : new Date().toISOString())}` : undefined;

        if (format === 'pdf') {
            exportDispatchesToPdf(dataToDownload, title, subtitle);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } else {
            exportDispatchesToExcel(dataToDownload, title);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        }
    };

    const handleOpenRowDownloadModal = (dispatch: DispatchType) => {
        setSelectedDispatchForDownload(dispatch);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    // const handleCloseRowDownloadModal = () => {
    //     setSelectedDispatchForDownload(null);
    //     setOpenRowDownloadModal(false);
    // };

    const handleDownloadSingleDispatch = (format: 'pdf' | 'excel') => {
        if (!selectedDispatchForDownload) return;
        const data = [selectedDispatchForDownload];
        const title = `Sevk Belgesi Detayları: ${selectedDispatchForDownload.code}`;

        if (format === 'pdf') {
            exportDispatchesToPdf(data, title);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } else {
            exportDispatchesToExcel(data, title);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        }
        setOpenRowDownloadModal(false);
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

    // === UI ===
    return (
        <Box mt={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Şantiyenin Depo Sevk İşlemleri</Typography>

                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
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
                                Yeni Sevk Kaydet
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
                    <Typography variant="h5" mb={2}>{editingId ? 'Şantiyenin Depo Sevk Belgesini Düzenle' : 'Yeni Şantiyenin Depo Sevk Belgesi'}</Typography>
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
                                        // setSelectedVehicle(null);
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
                            <CustomFormLabel required>Proje</CustomFormLabel>
                            <Autocomplete
                                id="project-select"
                                options={projects}
                                getOptionLabel={(option) => option.title}
                                value={projects.find(p => p.id === selectedProjectId) || null}
                                onChange={(_, newValue) => {
                                    setSelectedProjectId(newValue ? newValue.id : null);
                                    if (projectIdError && newValue) setProjectIdError(false);
                                }}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        placeholder="Proje Seçin"
                                        error={projectIdError}
                                        helperText={projectIdError ? "Proje seçimi zorunludur!" : ""}
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
                                    inputRef={nameInputRef}
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
                                label="Şantiyenin Depo Sevk için genel açıklama giriniz"
                                type="text"
                                fullWidth
                                multiline
                                rows={3}
                                variant="outlined"
                                value={generalDescription}
                                onChange={(e) => setGeneralDescription(e.target.value)}
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
                            <Button variant="outlined" startIcon={<IconPlus />} onClick={handleAddDispatchDetail}>Detay Ekle</Button>
                        </Stack>
                        <Grid container spacing={2}>
                            {dispatchDetails.map((detail, index) => {
                                const currentSelectedItem = itemsWithBalance.find(item => Number(item.itemId) === Number(detail.itemId));

                                // Calculate Max Allowed Quantity
                                const currentStockBalance = currentSelectedItem ? Number(currentSelectedItem.balance) : 0;
                                let maxAllowedQuantity = currentStockBalance;
                                if (editingId) {
                                    const originalDetail = initialDispatchDetails.find(d => Number(d.itemId) === Number(detail.itemId));
                                    const originalQuantity = originalDetail ? Number(originalDetail.quantity) : 0;
                                    maxAllowedQuantity = currentStockBalance + originalQuantity;
                                }

                                const displayBalance = currentSelectedItem ? `(Maksimum: ${maxAllowedQuantity})` : '';

                                return (
                                    <Grid item xs={12} key={index}>

                                        <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">

                                            <Grid item xs={12} sm={4} md={4}>
                                                <Autocomplete
                                                    fullWidth
                                                    size="small"
                                                    options={itemsWithBalance}
                                                    getOptionLabel={(option) => `${option.name}`}
                                                    value={currentSelectedItem || null}
                                                    onChange={(_, newValue) => {
                                                        const newQuantity = newValue ? Number(newValue.balance) : '';
                                                        handleDispatchDetailChange(index, 'itemId', newValue ? Number(newValue.itemId) : null);
                                                        handleDispatchDetailChange(index, 'quantity', newQuantity);
                                                    }}
                                                    isOptionEqualToValue={(option, value) => option.itemId === value.itemId}
                                                    renderInput={(params) => <TextField {...params} label="Malzeme Seçin" />}
                                                />
                                            </Grid>

                                            <Grid item xs={6} sm={3} md={3}>
                                                <CustomTextField
                                                    type="number"
                                                    label={`Miktar ${displayBalance}`}
                                                    placeholder="Miktar"
                                                    value={detail.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'quantity', e.target.value)}
                                                    fullWidth
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end" >
                                                                {displayBalance}
                                                            </InputAdornment>
                                                        ),
                                                        inputProps: { min: 0 } // اطمینان از مقدار مثبت
                                                    }}
                                                    size="small"
                                                    error={dispatchDetailsError && (Number(detail.quantity) < 0 || Number(detail.quantity) > (detail.balance || 0))}
                                                    helperText={dispatchDetailsError && (Number(detail.quantity) < 0 || Number(detail.quantity) > (detail.balance || 0)) ? `Maks: ${detail.balance || 0}` : ""}
                                                />
                                            </Grid>

                                            <Grid item xs={6} sm={4} md={4}>
                                                <CustomTextField
                                                    label="Açıklama"
                                                    placeholder="Açıklama"
                                                    value={detail.description}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDispatchDetailChange(index, 'description', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={1} md={1} sx={{ textAlign: { xs: 'right', sm: 'center' } }}>

                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleRemoveDispatchDetail(index)}
                                                    aria-label="Sil"
                                                    size="large"
                                                >
                                                    <IconTrash />
                                                </IconButton>
                                            </Grid>
                                        </Grid>
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
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={2} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Sevkleri indirin" : ""}>
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
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Şantiye Sevkleri indirin" : ""}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setOpenDownloadAllModal(true)}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData || dispatchList.length === 0}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>

                    <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">
                            Şantiyenin Depo Sevk Listesi

                        </Typography>
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
                        <Typography variant="h6" sx={{ ml: 2 }}>Şantiyenin Depo sevk belgeleri yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="Sevk belgesi tablosu">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Kod</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Şantiyenin Depo</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Şoför</Typography></StyledTableCell>
                                    {/* <StyledTableCell><Typography variant="h6">Araç</Typography></StyledTableCell> */}
                                    <StyledTableCell><Typography variant="h6">Proje</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Sevk Detayları</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {displayedDispatches.length > 0 ? (
                                    displayedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.store?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{`${row.driver?.name || ''} ${row.driver?.family || ''} - ${row.driverVehicle?.name || '-'} (${row.driverVehicle?.plaque || ''})`}</Typography></StyledTableCell>
                                            {/* <StyledTableCell><Typography variant="body1">{``}</Typography></StyledTableCell> */}
                                            <StyledTableCell><Typography variant="body1">{row.project?.title || '-'}</Typography></StyledTableCell>
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
                                                                setViewedDispatch(row); // 🔄 ذخیره کل آبجکت در state جدید
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
                                                    {hasEditPermission && selectedRowForMenu?.status === 0 && (
                                                        <>
                                                            <MuiMenuItem onClick={() => handleOpenStatusUpdateModal(1)}><ListItemIcon><IconCheck width={18} /></ListItemIcon>Onayla</MuiMenuItem>
                                                            <MuiMenuItem onClick={() => handleOpenStatusUpdateModal(2)}><ListItemIcon><IconX width={18} /></ListItemIcon>Reddet</MuiMenuItem>
                                                        </>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.status === 1 && (
                                                        <MuiMenuItem onClick={() => handleOpenStatusUpdateModal(2)}><ListItemIcon><IconX width={18} /></ListItemIcon>Reddet</MuiMenuItem>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.status === 2 && (
                                                        <MuiMenuItem onClick={() => handleOpenStatusUpdateModal(1)}><ListItemIcon><IconCheck width={18} /></ListItemIcon>Onayla</MuiMenuItem>
                                                    )}
                                                    {hasEditPermission && selectedRowForMenu?.status === 0 && (
                                                        <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>
                                                    )}
                                                    {hasDeletePermission && selectedRowForMenu?.status === 0 && (
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
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

            {/* ✅ Details Modal (Updated) */}
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Sevk Detayları
                    {viewedDispatch && <Typography component="span" variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>({viewedDispatch.code})</Typography>}
                </DialogTitle>
                <DialogContent dividers>
                    {viewedDispatch && viewedDispatch.storeDispatchDetails.length > 0 ? (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table aria-label="Ürün detayları tablosu" size="small">
                                    <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                        <TableRow>
                                            <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {viewedDispatch.storeDispatchDetails.map((detail, index) => (
                                            <TableRow key={detail.id || index} hover>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{Number(detail.quantity).toLocaleString() || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* ✅ جدول خلاصه جمع‌ها */}
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
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
                                            {Object.entries(calculateDispatchSummaries(viewedDispatch.storeDispatchDetails)).map(([unit, total]) => (
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
                {/* ✅ دکمه‌های دانلود داخل مودال */}
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
                            onClick={() => { if (viewedDispatch) exportDispatchesToPdf([viewedDispatch], `Sevk_${viewedDispatch.code}`); }}
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
                            onClick={() => { if (viewedDispatch) exportDispatchesToExcel([viewedDispatch], `Sevk_${viewedDispatch.code}`); }}
                        >
                            Excel İndir
                        </Button>
                        <Button onClick={() => setOpenDetailsModal(false)} color="secondary" variant="outlined"
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }} >
                            Kapat
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            {/* Download All Modal */}
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

            {/* Download Filtered Modal */}
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

            {/* Download Single Row Modal */}
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

            <Dialog open={openStatusUpdateModal} onClose={() => setOpenStatusUpdateModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {updateModalData.status === 1 ? 'Sevk Belgesini Onayla' : 'Sevk Belgesini Reddet'}
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

            <DeleteStoreDispatch
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                dispatchIdToDelete={dispatchIdToDelete}
                dispatchCodeToDelete={dispatchCodeToDelete}
                onDeleteSuccess={() => fetchInitialData()}
                showAlert={showAlert}
            />
        </Box>
    );
};

export default ListStoreDispatch;