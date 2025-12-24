import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    RadioGroup, FormControlLabel, Radio, Chip,
    DialogContentText,
    Slide,
    AppBar,
    Toolbar
} from '@mui/material';

import { styled, keyframes } from '@mui/material/styles';
import { IconDots, IconEye, IconEdit, IconTrash, IconCheck, IconX, IconPencil, IconInfoCircle, IconFileDownload, IconFile, IconFileSpreadsheet, IconSearch, IconRefresh, IconPlus } from '@tabler/icons-react';
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
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import { useAuth } from 'src/context/AuthContext';
import BlankCard from 'src/components/shared/BlankCard';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';

import ListDrivers from '../list-driver/ListDrivers';
import { TransitionProps } from '@mui/material/transitions';

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

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
    family: string;
    recordStatus: number;
    internal: boolean;
}
interface DriverType { id: string; name: string; family: string; recordStatus: number; status: string; internal: string }
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
interface User {
    id: string; // یا number، بر اساس API
    username: string; // ⬅️ این فیلد برای نمایش نام لازم است
    // اگر فیلد دیگری از کاربر را می‌خواهید، اینجا اضافه کنید
}
interface InvoiceHeaderStatusHistory {
    id: string;
    status: number;
    createAt: string;
    recordStatus: number;
    description: string | null;
    user?: User;
}
interface InvoiceType {
    id: number;
    invoiceNo: string | null;
    provider: { id: string; name: string; firm: boolean; } | null;
    driver: { id: string; name: string; family: string; } | null;
    warehouse?: {
        id: string;
        name: string;
        code?: string;
        address?: string;
        createAt?: string;
        recordStatus?: number;
    } | null;
    workhouse?: {
        id: string;
        name: string;
        code?: string;
        address?: string;
        createAt?: string;
        recordStatus?: number;
    } | null;
    docDate: string;
    description: string,
    totalAmount?: number;
    status: number;
    invoiceDetails: InvoiceDetailType[];
    driverVehicleId: string | null;
    driverVehicle?: {
        id: string;
        name: string;
        family: string;
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
    const n = Number(String(priceInput ?? '').replace(/[^\d.-]/g, ''));
    if (isNaN(n)) return '₺0,00';
    return n.toLocaleString('us-US', { style: 'currency', currency: 'TRY' });
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
    const getNestedValue = (obj: any, path: string): any => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    const valA = getNestedValue(a, orderBy);
    const valB = getNestedValue(b, orderBy);
    if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
    if (valA === undefined || valA === null) return 1;
    if (orderBy === 'docDate') {
        return new Date(valB as string).getTime() - new Date(valA as string).getTime();
    }
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
const cleanAndConvertNumber = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) return 0;
    const cleanedString = String(value).replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
};

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const ListInvoices = () => {
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

    const [providers, setProviders] = useState<ProviderType[]>([]);
    const [drivers, setDrivers] = useState<DriverType[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);

    const [openDriverModal, setOpenDriverModal] = useState(false);

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
    const [generalDescription, setGeneralDescription] = useState('');
    const [idRow, setIdRow] = useState(0);
    const { isTooltipGloballyEnabled } = useTooltip();

    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [warehouse, setWarehouse] = useState<number | null>(null);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [isFilterActive, setIsFilterActive] = useState(false);

    const [openStatusHistoryModal, setOpenStatusHistoryModal] = useState(false);
    const [statusHistoryData, setStatusHistoryData] = useState<any[]>([]);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

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

    // ************* NEW: Order-End Modal states *************
    const [openIsEndModal, setOpenIsEndModal] = useState(false);
    const [selectedOrderIdFromChild, setSelectedOrderIdFromChild] = useState<number | null>(null);
    const [selectedOrderNoFromChild, setSelectedOrderNoFromChild] = useState<string | null>(null);


    const [viewedInvoice, setViewedInvoice] = useState<InvoiceType | null>(null);

    // const [ordersRefreshTick, setOrdersRefreshTick] = useState(0);
    // ********************************************************

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

    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 50;
        const logoHeight = 25;
        const margin = 10;
        const topMargin = 20;
        const logoX = pageWidth - logoWidth - margin;

        doc.addImage(Logo, 'PNG', logoX, topMargin, logoWidth, logoHeight);
        doc.setFont('Arial', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('Arial', 'normal');
        doc.text(`Rapor Tarihi:`, 15, 25);
        doc.setFont('Arial', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 25);
    };

    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setFont('Arial', 'normal');
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

    const exportToPdf = (invoice: InvoiceType) => {
        // const doc = new jsPDF();
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        // const rows = invoice.invoiceDetails.map(detail => [
        //     detail.provider?.name || invoice.provider?.name || '-',
        //     detail.firm ? 'Şirket İçi' : 'Şirket Dışı',
        //     detail.item?.name || '-',
        //     Number(detail.quantity).toFixed(2) || '-',
        //     detail.item?.unit?.title || '-',
        //     cleanAndFormatPrice(detail.price),
        //     Number(detail.discountPercent).toFixed(2) || '-',
        //     cleanAndFormatPrice(detail.discountAmount),
        //     detail.description || '-',
        // ]);

        const rows = invoice.invoiceDetails.map(detail => {
            const qty = cleanAndConvertNumber(detail.quantity);
            const price = cleanAndConvertNumber(detail.price);
            const discAmount = cleanAndConvertNumber(detail.discountAmount);

            const indirimsizFiyat = qty * price;
            const toplamIndirim = qty * discAmount;
            const lineTotal = indirimsizFiyat - toplamIndirim;

            return [
                detail.provider?.name || invoice.provider?.name || '-',
                detail.item?.name || '-',
                qty.toFixed(2),
                detail.item?.unit?.title || '-',
                cleanAndFormatPrice(price),
                cleanAndFormatPrice(indirimsizFiyat), // ستون جدید
                Number(detail.discountPercent).toFixed(2) || '-',
                cleanAndFormatPrice(discAmount),
                cleanAndFormatPrice(toplamIndirim), // ستون جدید
                cleanAndFormatPrice(lineTotal),    // ستون جدید (Toplam Fiyat)
                detail.description || '-',
            ];
        });
        autoTable(doc, {
            startY: 90,
            // head: [['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama']],
            head: [['Tedarikçi', 'Ürün', 'Miktar', 'Birim', 'Fiyat', 'Indirimsiz', 'İndirim %', 'İnd. Miktarı', 'Top. İndirim', 'Top. Fiyat', 'Açıklama']],
            body: rows,
            theme: 'grid',
            styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 25 }, 1: { cellWidth: 20 }, 2: { cellWidth: 25 },
                3: { cellWidth: 15 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 },
                6: { cellWidth: 25 }, 7: { cellWidth: 25 }, 8: { cellWidth: 25 },
                9: { cellWidth: 25 }, 10: { cellWidth: 'auto' },
            },
            didDrawPage: () => {
                addPdfHeader(doc, `Fatura Detayları`);
                doc.setFont('Arial');
                doc.setFontSize(10);
                doc.text(`Fatura No: ${invoice.invoiceNo || '-'}`, 15, 47);
                const hasOrder = invoice.invoiceDetails.some(detail => detail.orderDetail);
                const supplyType = hasOrder ? 'Siparişli Fatura' : 'Siparişsiz Fatura';
                doc.text(`Tedarik Tipi: ${supplyType}`, 15, 54);
                doc.text(`Sürücü: ${invoice.driver?.name || ''} ${invoice.driver?.family || ''}`, 15, 61);
                doc.text(`Depo: ${invoice.warehouse?.name || '-'}`, 15, 68);
                doc.text(`Tarih: ${formatDateDisplay(invoice.docDate)}`, 15, 75);
                doc.text(`Genel Açıklama: ${invoice.description || '-'}`, 15, 82);
                addPdfFooter(doc);
            },
            showHead: 'everyPage',
            margin: { top: 80, bottom: 45 }
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // محاسبه مقادیر برای PDF
        const summaryData = new Map<string, number>();
        let grandTotalPdf = 0;

        // توجه: در تابع exportAllDetailedPdf به جای invoice از حلقه استفاده کنید
        invoice.invoiceDetails.forEach(detail => {
            const unitTitle = detail.item?.unit?.title || "Diğer";

            const qty = cleanAndConvertNumber(detail.quantity);
            const price = cleanAndConvertNumber(detail.price);
            const discount = cleanAndConvertNumber(detail.discountAmount);

            // فرمول: (تعداد * قیمت) - تخفیف
            const lineTotal = (qty * price) - discount;

            const currentTotal = summaryData.get(unitTitle) || 0;
            summaryData.set(unitTitle, currentTotal + lineTotal);

            grandTotalPdf += lineTotal;
        });

        // رسم جدول خلاصه در PDF
        if (summaryData.size > 0) {
            const summaryRows: any[] = [];

            Array.from(summaryData.entries()).forEach(([unit, total]) => {
                summaryRows.push([unit, cleanAndFormatPrice(total)]);
            });

            // اضافه کردن جمع کل
            summaryRows.push(['GENEL TOPLAM', cleanAndFormatPrice(grandTotalPdf)]);

            autoTable(doc, {
                startY: finalY + 5,
                head: [['Birim', 'Toplam Tutar ((Miktar x Fiyat) - İndirim)']],
                body: summaryRows,
                theme: 'grid',
                styles: { font: 'Arial', fontSize: 10, fontStyle: 'normal' },
                headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
                columnStyles: {
                    0: { cellWidth: 100 },
                    1: { cellWidth: 'auto', halign: 'right' }
                },
                // پررنگ کردن سطر آخر (Genel Toplam)
                didParseCell: (data) => {
                    if (data.row.index === summaryRows.length - 1) {
                        data.cell.styles.fontStyle = 'normal';
                        data.cell.styles.textColor = [0, 0, 0]; // Black
                    }
                }
            });
        }

        doc.save(`Fatura_${invoice.id}.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    };

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

    const exportToExcel = (invoice: InvoiceType) => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(`Fatura_${invoice.id}`);
        worksheet.views = [{ rightToLeft: false }];

        // --- Header ---
        worksheet.addRow(['Fatura Detayları']).font = { name: 'Arial', size: 12, bold: true };
        worksheet.mergeCells('A1:I1');
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
        worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: false };
        worksheet.getCell('A2').alignment = { horizontal: 'left' };
        worksheet.addRow([]);

        // --- Invoice Info ---
        worksheet.addRow(['Fatura No', invoice.invoiceNo || '-']);
        worksheet.addRow(['Sürücü', `${invoice.driver?.name || ''} ${invoice.driver?.family || ''}`]);
        worksheet.addRow(['Depo', invoice.warehouse?.name || '-']);
        worksheet.addRow(['Tarih', formatDateDisplay(invoice.docDate)]);
        worksheet.addRow(['Genel Açıklama', invoice.description || '-']);
        worksheet.addRow([]);

        // --- Table Headers ---
        // const tableHeaders = ['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama'];
        const tableHeaders = ['Tedarikçi', 'Ürün Adı', 'Miktar', 'Birim', 'Birim Fiyat', 'Indirimsiz Fiyat', 'İndirim %', 'İndirim Miktarı', 'Toplam İndirim', 'Toplam Fiyat', 'Açıklama'];

        const headerRow = worksheet.addRow(tableHeaders);
        headerRow.font = { name: 'Arial', bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // --- Table Data ---
        // invoice.invoiceDetails.forEach(detail => {
        //     worksheet.addRow([
        //         detail.provider?.name || invoice.provider?.name || '-',
        //         detail.firm ? 'Şirket İçi' : 'Şirket Dışı',
        //         detail.item?.name || '-',
        //         Number(detail.quantity),
        //         detail.item?.unit?.title || '-',
        //         cleanAndFormatPrice(detail.price),
        //         Number(detail.discountPercent),
        //         cleanAndFormatPrice(detail.discountAmount),
        //         detail.description || '-'
        //     ]).eachCell(cell => {
        //         cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        //     });
        // });

        invoice.invoiceDetails.forEach(detail => {
            const qty = cleanAndConvertNumber(detail.quantity);
            const price = cleanAndConvertNumber(detail.price);
            const discAmount = cleanAndConvertNumber(detail.discountAmount);

            worksheet.addRow([
                detail.provider?.name || '-',
                detail.item?.name || '-',
                qty,
                detail.item?.unit?.title || '-',
                price,
                qty * price,        // Indirimsiz Fiyat
                Number(detail.discountPercent),
                discAmount,
                qty * discAmount,   // Toplam İndirim
                (qty * price) - (qty * discAmount), // Toplam Fiyat
                detail.description || '-'
            ]);
        });
        // --- Column Auto Width ---
        worksheet.columns.forEach((column: any) => {
            let maxLength = 0;
            if (column && typeof column.eachCell === 'function') {
                column.eachCell({ includeEmpty: true }, (cell: any) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
            }
            column.width = Math.min(Math.max(maxLength + 2, 15), 50);
        });

        // --- Calculations (Grouping by Unit) ---
        // فرمول جدید: (تعداد * قیمت) - تخفیف
        const summaryMap = new Map<string, number>();
        let grandTotalExcel = 0;

        invoice.invoiceDetails.forEach(detail => {
            const unitTitle = detail.item?.unit?.title || "Diğer";

            const qty = cleanAndConvertNumber(detail.quantity);
            const price = cleanAndConvertNumber(detail.price);
            const discount = cleanAndConvertNumber(detail.discountAmount);

            // محاسبه خطی طبق فرمول
            const lineTotal = (qty * price) - discount;

            // اضافه کردن به Map
            const currentTotal = summaryMap.get(unitTitle) || 0;
            summaryMap.set(unitTitle, currentTotal + lineTotal);

            grandTotalExcel += lineTotal;
        });

        // --- Summary Table ---
        if (summaryMap.size > 0) {
            worksheet.addRow([]);
            worksheet.addRow(['Birim Bazlı Toplamlar ((Miktar x Fiyat) - İndirim)']).font = { name: 'Arial', size: 12, bold: true };

            const summaryHeaderRow = worksheet.addRow(['Birim', 'Toplam Tutar']);
            summaryHeaderRow.font = { name: 'Arial', bold: true };
            summaryHeaderRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                cell.border = { bottom: { style: 'thin' } };
            });

            // نمایش سطرهای واحدها
            Array.from(summaryMap.entries()).forEach(([unit, total]) => {
                worksheet.addRow([unit, cleanAndFormatPrice(total)]);
            });

            // نمایش جمع کل نهایی
            const grandTotalRow = worksheet.addRow(['GENEL TOPLAM', cleanAndFormatPrice(grandTotalExcel)]);
            grandTotalRow.font = { name: 'Arial', bold: true, size: 11 };
            grandTotalRow.getCell(2).alignment = { horizontal: 'right' };
        }

        // --- Footer ---
        const startRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 1;
        addExcelCompanyInfo(worksheet, startRow);

        // --- Save ---
        workbook.xlsx.writeBuffer().then((buffer: any) => {
            saveAs(new Blob([buffer]), `Fatura_${invoice.id}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        });
    };

    const exportAllDetailedPdf = (isFiltered: boolean) => {
        const dataToExport = isFiltered ? sortedAndFilteredInvoices : invoicesList;
        if (dataToExport.length === 0) {
            showAlert('PDF oluşturulacak fatura bulunamadı.', 'warning');
            return;
        }

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
            doc.text(`Depo: ${invoice.warehouse?.name || '-'}`, 15, 68);
            doc.text(`Tarih: ${formatDateDisplay(invoice.docDate)}`, 15, 75);
            doc.text(`Genel Açıklama: ${invoice.description || '-'}`, 15, 82);
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
                    startY: 90,
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

                // محاسبه مقادیر برای PDF
                const summaryData = new Map<string, number>();
                let grandTotalPdf = 0;

                // توجه: در تابع exportAllDetailedPdf به جای invoice از حلقه استفاده کنید
                invoice.invoiceDetails.forEach(detail => {
                    const unitTitle = detail.item?.unit?.title || "Diğer";

                    const qty = cleanAndConvertNumber(detail.quantity);
                    const price = cleanAndConvertNumber(detail.price);
                    const discount = cleanAndConvertNumber(detail.discountAmount);

                    // فرمول: (تعداد * قیمت) - تخفیف
                    const lineTotal = (qty * price) - discount;

                    const currentTotal = summaryData.get(unitTitle) || 0;
                    summaryData.set(unitTitle, currentTotal + lineTotal);

                    grandTotalPdf += lineTotal;
                });

                // رسم جدول خلاصه در PDF
                if (summaryData.size > 0) {
                    const summaryRows: any[] = [];

                    Array.from(summaryData.entries()).forEach(([unit, total]) => {
                        summaryRows.push([unit, cleanAndFormatPrice(total)]);
                    });

                    // اضافه کردن جمع کل
                    summaryRows.push(['GENEL TOPLAM', cleanAndFormatPrice(grandTotalPdf)]);

                    autoTable(doc, {
                        startY: finalY + 10,
                        head: [['Birim', 'Toplam Tutar ((Miktar x Fiyat) - İndirim)']],
                        body: summaryRows,
                        theme: 'grid',
                        styles: { font: 'Arial', fontSize: 10, fontStyle: 'normal' },
                        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
                        columnStyles: {
                            0: { cellWidth: 100 },
                            1: { cellWidth: 'auto', halign: 'right' }
                        },
                        // پررنگ کردن سطر آخر (Genel Toplam)
                        didParseCell: (data) => {
                            if (data.row.index === summaryRows.length - 1) {
                                data.cell.styles.fontStyle = 'normal';
                                data.cell.styles.textColor = [0, 0, 0]; // Black
                            }
                        }
                    });
                }
            });
            doc.save(isFiltered ? `Filtrelenmis_Faturalar.pdf` : `Tum_Faturalar.pdf`);
            showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("PDF oluşturulurken bir hata oluştu: ", error);
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const exportAllExcel = (isFiltered: boolean) => {
        const dataToExport = isFiltered ? sortedAndFilteredInvoices : invoicesList;
        if (dataToExport.length === 0) {
            showAlert('Excel oluşturulacak fatura bulunamadı.', 'warning');
            return;
        }

        const workbook = new Excel.Workbook();

        dataToExport.forEach((invoice) => {
            // ایجاد یک شیت برای هر فاکتور
            const worksheet = workbook.addWorksheet(`Fatura_${invoice.id}`);
            worksheet.views = [{ rightToLeft: false }];

            // --- Header ---
            worksheet.addRow(['Fatura Detayları']).font = { name: 'Arial', size: 12, bold: true };
            worksheet.mergeCells('A1:I1');
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: false };
            worksheet.getCell('A2').alignment = { horizontal: 'left' };
            worksheet.addRow([]);

            // --- Invoice Info ---
            worksheet.addRow(['Fatura No', invoice.invoiceNo || '-']);
            worksheet.addRow(['Sürücü', `${invoice.driver?.name || ''} ${invoice.driver?.family || ''}`]);
            worksheet.addRow(['Depo', invoice.warehouse?.name || '-']);
            worksheet.addRow(['Tarih', formatDateDisplay(invoice.docDate)]);
            worksheet.addRow(['Genel Açıklama', invoice.description || '-']);
            worksheet.addRow([]);

            // --- Table Headers ---
            const tableHeaders = ['Tedarikçi', 'Firm', 'Ürün Adı', 'Miktar', 'Birim', 'Fiyat', 'İndirim %', 'İndirim Miktarı', 'Açıklama'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.font = { name: 'Arial', bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            // --- Table Data ---
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

            // --- Column Auto Width ---
            worksheet.columns.forEach((column: any) => {
                let maxLength = 0;
                if (column && typeof column.eachCell === 'function') {
                    column.eachCell({ includeEmpty: true }, (cell: any) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 15), 50);
            });

            // --- Calculations (Grouping by Unit) ---
            // فرمول جدید: (تعداد * قیمت) - تخفیف
            const summaryMap = new Map<string, number>();
            let grandTotalExcel = 0;

            invoice.invoiceDetails.forEach(detail => {
                const unitTitle = detail.item?.unit?.title || "Diğer";

                const qty = cleanAndConvertNumber(detail.quantity);
                const price = cleanAndConvertNumber(detail.price);
                const discount = cleanAndConvertNumber(detail.discountAmount);

                const lineTotal = (qty * price) - discount;

                const currentTotal = summaryMap.get(unitTitle) || 0;
                summaryMap.set(unitTitle, currentTotal + lineTotal);

                grandTotalExcel += lineTotal;
            });

            // --- Summary Table ---
            if (summaryMap.size > 0) {
                worksheet.addRow([]);
                worksheet.addRow(['Birim Bazlı Toplamlar ((Miktar x Fiyat) - İndirim)']).font = { name: 'Arial', size: 12, bold: true };

                const summaryHeaderRow = worksheet.addRow(['Birim', 'Toplam Tutar']);
                summaryHeaderRow.font = { name: 'Arial', bold: true };
                summaryHeaderRow.eachCell(cell => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
                    cell.border = { bottom: { style: 'thin' } };
                });

                Array.from(summaryMap.entries()).forEach(([unit, total]) => {
                    worksheet.addRow([unit, cleanAndFormatPrice(total)]);
                });

                const grandTotalRow = worksheet.addRow(['GENEL TOPLAM', cleanAndFormatPrice(grandTotalExcel)]);
                grandTotalRow.font = { name: 'Arial', bold: true, size: 11 };
                grandTotalRow.getCell(2).alignment = { horizontal: 'right' };
            }

            // --- Footer ---
            const startRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 1;
            addExcelCompanyInfo(worksheet, startRow);
        });

        // --- Save ---
        workbook.xlsx.writeBuffer().then((buffer: any) => {
            const fileName = isFiltered ? `Filtrelenmis_Faturalar.xlsx` : `Tum_Faturalar.xlsx`;
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        });
    };
    const handleCloseDriverModal = () => {
        setOpenDriverModal(false);
        fetchDrivers(); // 🔄 لیست راننده‌ها را رفرش می‌کند تا راننده جدید در کمبو دیده شود
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
        let timer: ReturnType<typeof setTimeout>;
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, []);

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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

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
                    family: item.family || '',
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

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

                const fetchedInvoices = (response.data.data as InvoiceType[]) || [];

                const filtered = fetchedInvoices.filter(inv => inv?.warehouse !== null && inv?.workhouse === null);

                setInvoicesList(filtered);
            } else { showAlert(response.data.message || 'Faturalar yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate]);

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
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchWarehouses = useCallback(async () => {
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
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` },
                params: requestParams
            });

            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const allWarehouses = response.data.data as WarehouseType[];
                const activeWarehouses = allWarehouses.filter(item => item.recordStatus === 0);
                const WarehousesWithStatus = activeWarehouses.map((item) => ({ ...item, status: 'Aktif' }));
                setWarehousesList(WarehousesWithStatus);
            } else {
                showAlert(response.data.message || 'İşler yüklenirken bir hata oluştu.', 'error');
                setWarehousesList([]);
            }
        }
        catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
            setWarehousesList([]);
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    useEffect(() => {
        getInvoices();
        fetchProviders();
        fetchDrivers();
        fetchWarehouses();
        getItems();
    }, []); // eslint-disable-line

    const handleAddInvoiceItem = (newItem: InvoiceItem) => {
        setInvoiceItems(prevItems => [...prevItems, newItem]);
        setHasUnsavedChanges(true);
    };
    const handleUpdateInvoiceItem = (updatedItem: InvoiceItem) => {
        setInvoiceItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
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
        setGeneralDescription('');
        setDocDate(new Date());
        setInvoiceItems([]);
        setEditingId(null);
        setSelectedVehicle(null);
        setSelectedVehicleName(null);
        setVehiclesList([]);
        setWarehouse(null);
        setIsFormVisible(false);
        clearAlert();
    };

    // ************* NEW: API call for ending order after save *************
    const handleFinalSaveReceipt = async (shouldEnd: boolean) => {
        if (!shouldEnd) { setOpenIsEndModal(false); return; }
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) { navigate("/"); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); return; }
            if (!selectedOrderIdFromChild || isNaN(Number(selectedOrderIdFromChild))) { setOpenIsEndModal(false); return; }

            await axios.put(
                server.baseurl + server.initialoperations + "update-order-is-end",
                { id: Number(selectedOrderIdFromChild), isEnd: true },
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            showAlert('Sipariş başarıyla sonlandırıldı.', 'success');
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setOpenIsEndModal(false);
            // getInvoices(); // ihtiyaç varsa aç
        }
    };
    // *********************************************************************

    const handleSaveInvoice = async () => {
        if (!validateForm()) return;
        const invoiceData = {
            docDate: docDate?.toISOString(),
            description: generalDescription,
            status: 0,
            statusDescription: '',
            driverId: Number(driver),
            warehouseId: Number(warehouse),
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
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.post(
                server.baseurl + server.initialoperations + "create-invoice", invoiceData,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                setHasUnsavedChanges(false);

                // ************* NEW: open modal asking to end the ORDER (Sipariş) *************
                if (selectedOrderIdFromChild) {
                    setOpenIsEndModal(true);
                }
                // ***************************************************************************

                resetForm();
                getInvoices();
                showAlert('Fatura başarıyla kaydedildi!', 'success');
            } else { showAlert(response.data.message || 'Fatura kaydedilirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    };

    const handleUpdateInvoice = async () => {
        if (!validateForm() || !editingId) return;

        const invoiceData = {
            id: Number(editingId),
            docDate: docDate?.toISOString(),
            description: generalDescription,
            driverId: Number(driver),
            warehouseId: Number(warehouse),
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
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
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

        const selectedWarehouse = warehousesList.find(w => Number(w.id) === Number(row.warehouse?.id));
        setWarehouse(selectedWarehouse ? selectedWarehouse.id : null);
        setDocDate(new Date(row.docDate));
        setGeneralDescription(row.description || '');
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
                firm: detailProvider?.firm === '1'
            };
        });

        setIsFormVisible(true);
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
    const handleOpenVehicleModal = () => setOpenVehicleModal(true);

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
    // const handleOpenModal = (details: InvoiceDetailType[], provider: { id: string; name: string; firm: boolean; } | null) => {
    //     const detailsWithProvider = details.map(detail => ({ ...detail, provider: detail.provider || provider }));
    //     setModalDetails(detailsWithProvider);
    //     setOpenModal(true);
    // };
    const handleOpenModal = (invoice: InvoiceType) => {
        setViewedInvoice(invoice); // ذخیره کل آبجکت فاکتور برای دانلود
        setModalDetails(invoice.invoiceDetails); // ذخیره جزئیات برای نمایش در جدول
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
        setIdRow(id);
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
        // if (!description.trim()) {
        //     setStatusError(true);
        //     showAlert('Lütfen bir açıklama giriniz.', 'warning');
        //     return;
        // }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = { id: Number(idRow), status: statusToUpdate, description: description.trim() };
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            handleCloseStatusModal();
            getInvoices();
        }
    };

    const handleOpenDownloadAllModal = () => setOpenDownloadAllModal(true);
    const handleCloseDownloadAllModal = () => setOpenDownloadAllModal(false);
    const handleOpenDownloadFilteredModal = () => setOpenDownloadFilteredModal(true);
    const handleCloseDownloadFilteredModal = () => setOpenDownloadFilteredModal(false);
    const handleOpenRowDownloadModal = (invoice: InvoiceType) => { setSelectedInvoiceForDownload(invoice); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedInvoiceForDownload(null); };
    const handleRowDownload = (format: 'pdf' | 'excel') => {
        if (selectedInvoiceForDownload) {
            if (format === 'pdf') exportToPdf(selectedInvoiceForDownload);
            else exportToExcel(selectedInvoiceForDownload);
        }
        handleCloseRowDownloadModal();
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

        const createDate = new Date(invoice.docDate);
        const matchesDate =
            (!startDate || createDate >= startDate) &&
            (!endDate || createDate <= endDate);

        const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(invoice.id));


        return matchesSearch && matchesStatus && matchesDate && matchesNotifIds;
    });


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


    const sortedAndFilteredInvoices = stableSort(filteredInvoices, getComparator(order, orderBy));
    const paginatedInvoices = sortedAndFilteredInvoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


    const isFormComplete = useMemo(() => {
        const isMainFormComplete = Boolean(driver && docDate && warehouse && selectedVehicle);

        const hasValidItems = invoiceItems.length > 0 && invoiceItems.every(item => {
            const qty = cleanAndConvertNumber(item.quantity);
            const prc = cleanAndConvertNumber(item.price);

            return item.item && qty > 0 && prc > 0;
        });

        return isMainFormComplete && hasValidItems;
    }, [driver, docDate, warehouse, invoiceItems, selectedVehicle]);

    const handleClearDateFilters = () => { setStartDate(null); setEndDate(null); };


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };


    // const modalSummary = useMemo(() => {
    //     const summary: Record<string, number> = {};
    //     let grandTotal = 0;

    //     modalDetails.forEach((detail) => {
    //         const unitTitle = detail.item?.unit?.title || "Diğer";

    //         const qty = cleanAndConvertNumber(detail.quantity);
    //         const price = cleanAndConvertNumber(detail.price);
    //         const discount = cleanAndConvertNumber(detail.discountAmount);

    //         // فرمول اصلی: (تعداد * قیمت) - مبلغ تخفیف
    //         const lineTotal = (qty * price) - discount;

    //         // اضافه کردن به جمع واحد مربوطه
    //         summary[unitTitle] = (summary[unitTitle] || 0) + lineTotal;
    //         grandTotal += lineTotal;
    //     });

    //     return { summary, grandTotal };
    // }, [modalDetails]);


    const modalSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        let grandTotal = 0;

        modalDetails.forEach((detail) => {
            const unitTitle = detail.item?.unit?.title || "Diğer";
            const qty = cleanAndConvertNumber(detail.quantity);
            const price = cleanAndConvertNumber(detail.price);
            const discAmount = cleanAndConvertNumber(detail.discountAmount);

            // فرمول جدید شما برای جمع کل هر سطر
            const lineTotal = (qty * price) - (qty * discAmount);

            summary[unitTitle] = (summary[unitTitle] || 0) + lineTotal;
            grandTotal += lineTotal;
        });

        return { summary, grandTotal };
    }, [modalDetails]);

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
                <>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                                <CustomFormLabel htmlFor="driver-autocomplete" required>Sürücü</CustomFormLabel>
                                <Stack direction="row" alignItems="center" spacing={1}>
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
                                            if (newDriverId) { fetchVehicles(newDriverId); }
                                        }}
                                        renderInput={(params) => <TextField {...params} label="Sürücü Seçin" variant="outlined" size="small" />}
                                        sx={{ flexGrow: 1 }}
                                    />

                                    {/* 👇 دکمه جدید پلاس برای باز کردن مودال 👇 */}
                                    <CustomTooltip title="Sürücü Listesi / Ekle">
                                        <IconButton
                                            color="primary"
                                            onClick={() => setOpenDriverModal(true)}
                                            sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 1 }}
                                        >
                                            <IconPlus size={20} />
                                        </IconButton>
                                    </CustomTooltip>

                                    {/* دکمه ویرایش خودرو که قبلاً وجود داشت */}
                                    {selectedVehicleName && (vehiclesList.length > 1) && (
                                        <IconButton onClick={handleOpenVehicleModal} size="small"><IconPencil size={20} /></IconButton>
                                    )}
                                </Stack>
                                {selectedVehicleName && (<Chip sx={{ mt: 2 }} label={selectedVehicleName} color="primary" variant="outlined" />)}
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
                                        value={docDate}
                                        onChange={(newValue) => setDocDate(newValue)}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField {...params} size="small" sx={{ width: '100%' }} />
                                        )}
                                    />
                                </LocalizationProvider>

                            </Grid>

                            <Grid item xs={12}>
                                <CustomFormLabel htmlFor="invoice-general-description">Açıklama</CustomFormLabel>
                                <TextField
                                    id="invoice-general-description"
                                    label="Fatura için genel açıklama giriniz"
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

                        <InvoiceItemsTable
                            items={invoiceItems}
                            itemsList={itemsList}
                            onAddItem={handleAddInvoiceItem}
                            onRemoveItem={handleRemoveInvoiceItem}
                            onUpdateItem={handleUpdateInvoiceItem}
                            providersList={providers}
                            // NEW:
                            // refreshSignal={ordersRefreshTick}
                            onOrderSelect={(order) => {
                                setSelectedOrderIdFromChild(order ? Number(order.id) : null);     // 👈 حتماً این
                                setSelectedOrderNoFromChild(order ? String(order.id) : null);     // 👈 اگر می‌خوای تو مودال نشان بدهی
                                // اگر تاریخ هم لازم داری، یک state هم برای تاریخ بساز:
                                // setSelectedOrderDateFromChild(order ? order.docDate : null);
                            }}

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
                </>
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
                                <Button variant="contained" color="primary" onClick={handleOpenDownloadAllModal} startIcon={<IconFileDownload />} disabled={loadingData}>
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                        Fatura Listesi
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
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={2}>
                            <TextField
                                label="Fatura Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={5}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Başlangıç Tarihi"
                                        value={startDate}
                                        onChange={(newValue) => setStartDate(newValue)}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField {...params} size="small" fullWidth />
                                        )}
                                    />

                                    <DatePicker
                                        label="Bitiş Tarihi"
                                        value={endDate}
                                        onChange={(newValue) => setEndDate(newValue)}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField {...params} size="small" fullWidth />
                                        )}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
                                        <IconX size={20} />
                                    </IconButton>
                                </Stack>
                            </LocalizationProvider>

                        </Grid>

                        <Grid item xs={12} sm={6} md={5}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth>
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
                                <StyledTableCell><Typography variant="h6">Depo</Typography></StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                        <Typography variant="h6">Tarihi</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>

                                <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                {/* <StyledTableCell><Typography variant="h6">Kayıt Tipi</Typography></StyledTableCell> */}
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
                                <TableRow><StyledTableCell colSpan={8} align="center"><CircularProgress /></StyledTableCell></TableRow>
                            ) : (
                                paginatedInvoices.length > 0 ? (
                                    paginatedInvoices.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.invoiceNo || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.driver?.name || ''} {row.driver?.family || ''}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.warehouse?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                            <StyledTableCell sx={{ maxWidth: 150 }}>
                                                {row.description && row.description.trim().length > 0 ? (
                                                    // حالت اول: اگر توضیحات وجود داشت (خالی نبود)
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button

                                                            variant="outlined"
                                                            style={{ fontSize: "10px", }}
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
                                            {/* <StyledTableCell >
                                                <Chip
                                                    label={row.invoiceDetails.some(detail => detail.orderDetail) ? "Siparişli" : "Siparişsiz"}
                                                    color={row.invoiceDetails.some(detail => detail.orderDetail) ? "success" : "default"}
                                                    size="small"
                                                />
                                            </StyledTableCell> */}
                                            <StyledTableCell>

                                                <Stack direction="row" spacing={1} alignItems="center">

                                                    <Chip
                                                        label={row.status === 0 ? "Beklemede" : row.status === 1 ? "Onaylandı" : "Reddedildi"}
                                                        color={row.status === 0 ? "warning" : row.status === 1 ? "success" : "error"}
                                                    />
                                                    {row.invoiceHeaderStatusHistories && row.invoiceHeaderStatusHistories.length > 0 && (
                                                        <CustomTooltip title="Durum geçmişini gör" placement="right">
                                                            <IconButton size="small" onClick={() => handleOpenStatusHistoryModal(row)}><IconInfoCircle size={18} /></IconButton>
                                                        </CustomTooltip>
                                                    )}
                                                </Stack>

                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Button variant="outlined" startIcon={<IconEye />}
                                                    onClick={() => handleOpenModal(row)}>Görünüm</Button>
                                            </StyledTableCell>
                                            <StyledTableCell align="right">
                                                <IconButton id={`basic-button-${row.id}`} aria-controls={Boolean(anchorEl) ? 'basic-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(anchorEl) ? 'true' : undefined} onClick={(event) => handleClickMenu(event, row)}>
                                                    <IconDots size={20} />
                                                </IconButton>
                                                <Menu id="basic-menu" anchorEl={anchorEl} open={Boolean(anchorEl) && selectedInvoiceForMenu?.id === row.id} onClose={handleCloseMenu} MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}>
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
                                                            <MuiMenuItem onClick={() => handleClickOpenDeleteModal(row.id, row.invoiceNo || '-')}>
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
                                    <TableRow><StyledTableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç fatura bulunamadı.</Typography></StyledTableCell></TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredInvoices.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
            </BlankCard>

            {/* Details Modal */}
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="xl" fullWidth>
                <DialogTitle>Fatura Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="Fatura detayları tablosu">
                            {/* <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
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
                                    <TableRow><StyledTableCell colSpan={9} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç detay bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody> */}
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Tedarikçi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Firma</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ürün Adı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Birim Fiyat</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Indirimsiz Fiyat</Typography></StyledTableCell> {/* جدید */}

                                    <StyledTableCell><Typography variant="h6">İndirim %</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">İndirim Miktarı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Toplam İndirim</Typography></StyledTableCell> {/* جدید */}
                                    <StyledTableCell><Typography variant="h6">Toplam Fiyat</Typography></StyledTableCell> {/* جدید */}
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.map((detail, index) => {
                                    const qty = cleanAndConvertNumber(detail.quantity);
                                    const price = cleanAndConvertNumber(detail.price);
                                    const discAmount = cleanAndConvertNumber(detail.discountAmount);

                                    const indirimsizFiyat = qty * price;
                                    const toplamIndirim = qty * discAmount;
                                    const lineTotal = indirimsizFiyat - toplamIndirim;

                                    return (
                                        <TableRow key={detail.id || index}>
                                            <StyledTableCell>{detail.provider?.name || '-'}</StyledTableCell>
                                            <StyledTableCell>{/* Chip logic for Firm */}</StyledTableCell>
                                            <StyledTableCell>{detail.item?.name || '-'}</StyledTableCell>
                                            <StyledTableCell>{qty}</StyledTableCell>
                                            <StyledTableCell>{detail.item?.unit?.title || '-'}</StyledTableCell>
                                            <StyledTableCell>{cleanAndFormatPrice(price)}</StyledTableCell>
                                            <StyledTableCell>{cleanAndFormatPrice(indirimsizFiyat)}</StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.discountPercent || '-'}</Typography></StyledTableCell>

                                            <StyledTableCell>{cleanAndFormatPrice(discAmount)}</StyledTableCell>
                                            <StyledTableCell>{cleanAndFormatPrice(toplamIndirim)}</StyledTableCell>
                                            <StyledTableCell sx={{ fontWeight: 'bold' }}>{cleanAndFormatPrice(lineTotal)}</StyledTableCell>
                                            <StyledTableCell>{detail.description || '-'}</StyledTableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <>
                        {modalDetails.length > 0 && (

                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>

                                <TableContainer component={Paper} variant="outlined" sx={{ width: 'auto', minWidth: '300px' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <StyledTableCell sx={{ fontWeight: 'bold', color: '#555' }}>Birim</StyledTableCell>
                                                <StyledTableCell align="right" sx={{ fontWeight: 'bold', color: '#555' }}>Toplam Tutar (TL)</StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {Object.entries(modalSummary.summary).map(([unit, total]) => (
                                                <TableRow key={unit}>
                                                    <StyledTableCell>{unit}</StyledTableCell>
                                                    <StyledTableCell align="right">
                                                        {cleanAndFormatPrice(total)}
                                                    </StyledTableCell>
                                                </TableRow>
                                            ))}
                                            {/* خط جداکننده */}
                                            <TableRow>
                                                <StyledTableCell colSpan={2} sx={{ p: 0, border: 'none' }}>
                                                    <Box sx={{ borderBottom: '2px dashed #ccc', my: 1 }} />
                                                </StyledTableCell>
                                            </TableRow>
                                            {/* جمع کل نهایی */}
                                            <TableRow sx={{ '& td': { borderBottom: 'none' } }}>
                                                <StyledTableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'primary.main' }}>
                                                    GENEL TOPLAM
                                                </StyledTableCell>
                                                <StyledTableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'primary.main' }}>
                                                    {cleanAndFormatPrice(modalSummary.grandTotal)}
                                                </StyledTableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    {/* سمت چپ: دکمه‌های دانلود */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }} // در موبایل ستونی، در دسکتاپ ردیفی
                        spacing={2} // فاصله یکسان بین تمام دکمه‌ها
                        sx={{ width: '100%' }} // اشغال تمام عرض کادر
                    >
                        <Button
                            variant="contained"
                            color="error" // رنگ قرمز برای PDF
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }}
                            startIcon={<IconFile />}
                            onClick={() => viewedInvoice && exportToPdf(viewedInvoice)}
                            disabled={!viewedInvoice}
                        >
                            PDF İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success" // رنگ سبز برای Excel
                            fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }}
                            startIcon={<IconFileSpreadsheet />}
                            onClick={() => viewedInvoice && exportToExcel(viewedInvoice)}
                            disabled={!viewedInvoice}
                        >
                            Excel İndir
                        </Button>
                        <Button onClick={handleCloseModal} color="secondary" variant="outlined" fullWidth // باعث می‌شود در حالت ستونی تمام عرض را بگیرد
                            sx={{ flex: 1 }} >
                            Kapat
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={openVehicleModal} onClose={() => setOpenVehicleModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Araç Seçimi</DialogTitle>
                <DialogContent>
                    <RadioGroup aria-label="vehicle-selection" name="vehicle-selection" value={tempSelectedVehicle} onChange={(event) => setTempSelectedVehicle(Number(event.target.value))}>
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

            {/* Status change */}
            <Dialog open={openStatusModal} onClose={handleCloseStatusModal} maxWidth="sm" fullWidth>
                <DialogTitle>{statusToUpdate === 1 ? 'Onaylama Açıklaması' : 'Reddetme Açıklaması'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus margin="dense" label="Açıklama" type="text" fullWidth multiline rows={4} variant="outlined"
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); if (statusError) setStatusError(false); }}
                        error={statusError}
                        helperText={statusError && 'Bu alan zorunludur.'}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatusModal} color="secondary">İptal</Button>
                    <Button onClick={handleUpdateStatus} color="primary">Kaydet</Button>
                </DialogActions>
            </Dialog>

            {/* Status history */}
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
                                        .map((historyItem: any, index: number) => (
                                            <TableRow key={historyItem.id || index}>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(historyItem.createAt)}</Typography></StyledTableCell>
                                                <StyledTableCell>
                                                    <Chip
                                                        label={historyItem.status === 0 ? "Beklemede" : historyItem.status === 1 ? "Onaylandı" : "Reddedildi"}
                                                        color={historyItem.status === 0 ? "warning" : historyItem.status === 1 ? "success" : "error"}
                                                        size="small"
                                                    />
                                                </StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{historyItem.description || '-'}</Typography>
                                                    {historyItem.user?.username && (
                                                        <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                                            İşlem Yapan: {historyItem.user.username}
                                                        </Typography>
                                                    )}
                                                </StyledTableCell>
                                            </TableRow>
                                        ))
                                ) : (
                                    <TableRow><StyledTableCell colSpan={3} align="center"><Typography variant="subtitle1" color="textSecondary">Durum geçmişi bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseStatusHistoryModal}>Kapat</Button></DialogActions>
            </Dialog>

            <DeleteInvoiceModal
                openModal={openDeleteModal} onClose={handleClickCloseDeleteModal}
                invoiceIdToDelete={invoiceIdToDelete} invoiceProviderToDelete={invoiceProviderToDelete}
                onDeleteSuccess={getInvoices} showAlert={showAlert}
            />

            {/* Download all */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Faturaları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => { exportAllDetailedPdf(false); handleCloseDownloadAllModal(); }} startIcon={<IconFile />}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" onClick={() => { exportAllExcel(false); handleCloseDownloadAllModal(); }} startIcon={<IconFileSpreadsheet />}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Download filtered */}
            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Faturaları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => { exportAllDetailedPdf(true); handleCloseDownloadFilteredModal(); }} startIcon={<IconFile />}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" onClick={() => { exportAllExcel(true); handleCloseDownloadFilteredModal(); }} startIcon={<IconFileSpreadsheet />}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadFilteredModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Download row */}
            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => handleRowDownload('pdf')} startIcon={<IconFile />}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" onClick={() => handleRowDownload('excel')} startIcon={<IconFileSpreadsheet />}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* ************* NEW: Sipariş Durumu Onayı Modal ************* */}
            <Dialog open={openIsEndModal} onClose={() => setOpenIsEndModal(false)}>
                <DialogTitle>Sipariş Durumu Onayı</DialogTitle>
                <DialogContent>
                    <Typography>
                        Fişi kaydettikten sonra, bu <b>sipariş</b>in Fişini Sonlandırmak
                        (Sipariş No: {selectedOrderNoFromChild || 'N/A'}) ister misiniz?
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        (Bu, bu siparişe ait başka bir fiş belgesi oluşturulamayacağı anlamına gelir.)
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleFinalSaveReceipt(false)} color="error">Hayır (Sadece Fişi Kaydet)</Button>
                    <Button onClick={() => handleFinalSaveReceipt(true)} color="primary" variant="contained" autoFocus>
                        Evet (Kaydet ve Fişi Sonlandır)
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

            {/* مودال تمام صفحه لیست رانندگان */}
            <Dialog
                fullScreen
                open={openDriverModal}
                onClose={handleCloseDriverModal}
                TransitionComponent={Transition}
            >
                <AppBar sx={{ position: 'relative' }}>
                    <Toolbar>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={handleCloseDriverModal}
                            aria-label="close"
                        >
                            <IconX />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            Sürücü Listesi ve Yönetimi
                        </Typography>
                        <Button autoFocus color="inherit" onClick={handleCloseDriverModal}>
                            Kapat
                        </Button>
                    </Toolbar>
                </AppBar>
                <DialogContent>
                    {/* نمایش کامپوننت لیست راننده‌ها */}
                    <ListDrivers />
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default ListInvoices;
