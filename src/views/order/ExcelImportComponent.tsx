import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete,
    DialogContentText,
    Divider
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
    IconUpload, IconFileSpreadsheet, IconSearch, IconDots, IconEye, IconEdit, IconTrash,
    IconCheck, IconX, IconFile,
    IconDownload, IconListDetails,
    IconFileDownload,
    IconRefresh,
    IconInfoCircle
} from '@tabler/icons-react';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import OrderItemsTable from './OrderItemsTable';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import server from '../../assets/address.json';
import axios from 'axios';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import DeleteOrderModal from './DeleteOrderModal';
import RegisterUnregisteredItemModal from '../tender/RegisterUnregisteredItemModal';
import SelectTenderItemsModal from './SelectTenderItemsModal';
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';
import BlankCard from 'src/components/shared/BlankCard';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
    // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
    fontSize: '0.8rem', // Varsayılan olarak küçük font
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem', // Masaüstünde daha büyük
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


// Type Definitions
interface Work { id: string; title: string; startDate: string; endDate: string; createAt: string; recordStatus: number; }
interface Network { id: string; createAt: string; recordStatus: number; title: string; description: string; work: Work; }
interface UnitType { id: string; title: string; recordStatus: number; createAt: string; }
interface ItemType { id: string; name: string; description: string; abbreviation: string; recordStatus: number; weight: number | null; createAt: string; unit: UnitType; status: string; }
interface OrderItem {
    id: number;
    item: string;
    quantity: number;
    description: string;
    isEditing: boolean;
    unit?: UnitType;
    isRegistered?: boolean;
    price?: number;
}
interface RequestComboItem {
    id: number;
    subject: string; // برای نمایش در کمبو
}
// در کنار سایر رابط‌ها (Interfaces)
interface User {
    username: string;
    // ... سایر فیلدهای لازم کاربر
}

interface OrderStatusHistory {
    id: string;
    status: 0 | 1 | 2;
    description: string | null;
    createAt: string;
    user: User; // کاربری که عملیات را انجام داده است
}
interface RequestInfo { // Yeni bir arayüz tanımlayalım
    id: string; // API'de string geliyor
    subject: string;
}
interface WorkhouseType {
    id: number;
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: number;
}
interface OrderType {
    id: number;
    network: { id: string; title: string; };
    docDate: string;
    requestId?: number | null;
    description: string,
    status: number;
    orderDetails: OrderDetailType[];
    orderHeaderStatusHistories?: OrderStatusHistory[];
    request: RequestInfo | null;
    workhouse: WorkhouseType | null;
}
interface OrderDetailType {
    id: number;
    item: { id: string; name: string; unit: { title: string; }; };
    quantity: number;
    description: string;
    price: number
}

interface TenderType { id: string; title: string; recordStatus: number; createAt: string; }
// اینترفیس مورد نیاز برای مودال شما
export interface RegisterItemInitialData {
    description?: string;
    olcuBrimi?: string;
    originalRowId?: number;
}

// Table Style and Functions
// type SortableOrderKeys = 'network.title' | 'docDate' | 'status';
type SortableOrderKeys = 'id' | 'network.title' | 'docDate' | 'status' | 'createAt';

const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': { color: 'white', ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }), ...(value === 'pending' && selected && { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } }), ...(value === 'approved' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }), ...(value === 'rejected' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }), },
    '&:not(.Mui-selected)': { color: theme.palette.text.primary, borderColor: theme.palette.divider, '&:hover': { backgroundColor: theme.palette.action.hover }, },
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
const getComparator = (order: 'asc' | 'desc', orderBy: SortableOrderKeys): (a: OrderType, b: OrderType) => number => { return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy); };
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => { const stabilizedThis = array.map((el, index) => [el, index] as [T, number]); stabilizedThis.sort((a, b) => { const order = comparator(a[0], b[0]); if (order !== 0) return order; return a[1] - b[1]; }); return stabilizedThis.map((el) => el[0]); };



const statusToColor = (s: number): 'warning' | 'success' | 'error' | 'primary' | 'default' => {
    switch (s) {
        case 0: return "warning";
        case 1: return "success";
        case 2: return "error";
        default: return "primary";
    }
};
const statusToLabel = (s: number): 'Beklemede' | 'Onaylandı' | 'Reddedildi' | 'primary' | 'default' => {
    switch (s) {
        case 0: return "Beklemede";
        case 1: return "Onaylandı";
        case 2: return "Reddedildi";
        default: return "primary";
    }
};

const ExcelImportComponent = () => {
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

    const [network, setNetwork] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [workhouse, setWorkhouse] = useState<string | number>(''); // ذخیره ID شانتیه انتخاب شده
    const [selectedWork, setSelectedWork] = useState<Work | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [networkError, setNetworkError] = useState(false);
    const [docDateError, setDocDateError] = useState(false);
    const [orderItemsError, setOrderItemsError] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [ordersList, setOrdersList] = useState<OrderType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [orderBy, setOrderBy] = useState<SortableOrderKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderForMenu, setSelectedOrderForMenu] = useState<OrderType | null>(null);
    // const openMenu = Boolean(anchorEl);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<OrderDetailType[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState<number | null>(null);
    const [orderTitleToDelete, setOrderTitleToDelete] = useState<string>('');
    const [openRegisterModal, setOpenRegisterModal] = useState(false);
    const [unregisteredItemData, setUnregisteredItemData] = useState<RegisterItemInitialData | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [openSelectTenderModal, setOpenSelectTenderModal] = useState(false);
    const [tendersList, setTendersList] = useState<TenderType[]>([]);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<OrderStatusHistory[]>([]);


    const [requestId, setRequestId] = useState<number | null>(null);
    const [requestsList, setRequestsList] = useState<RequestComboItem[]>([]);

    const [generalDescription, setGeneralDescription] = useState('');

    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const { isTooltipGloballyEnabled } = useTooltip();

    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState<1 | 2 | null>(null);
    const [description, setDescription] = useState('');
    const [statusError, setStatusError] = useState(false);
    const [idRow, setIdRow] = useState(0);

    const [openDownloadSingleModal, setOpenDownloadSingleModal] = useState(false);
    const [isFilterActive, setIsFilterActive] = useState(false);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);

    // const { allowedOperations } = useAuth();
    // const hasCreatePermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
    // }, [allowedOperations]);

    // const hasEditPermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
    // }, [allowedOperations]);

    // const hasDeletePermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'Silmek');
    // }, [allowedOperations]);

    // const hasDownloadPermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
    // }, [allowedOperations]);

    // const hasStatusPermission = useMemo(() => {
    //     return allowedOperations.some(op => op.systemOperationName === 'Onaylamak');
    // }, [allowedOperations]);


    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            // اگر خود آیتم تطبیق داشت
            if (item.href === path) return item;

            // اگر آیتم فرزند داشت، داخل فرزندان جستجو کن
            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    // ۲. استفاده از تابع برای پیدا کردن منوی فعلی
    const currentMenu = useMemo(() => {
        debugger
        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    // ۳. استخراج ID عملیات‌ها (با اطمینان از وجود id)
    const currentMenuOpIds = useMemo(() => {
        // اگر منو یا عملیات‌های آن وجود نداشت، آرایه خالی برگردان
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            // با توجه به دیتای API شما، ID اصلی عملیات در این سطح است
            return String(op.id);
        });
    }, [currentMenu]);

    // ۴. تابع نهایی بررسی دسترسی
    const hasPermission = (opName: string) => {
        return allowedOperations.some((op: any) =>
            op.systemOperationName === opName &&
            currentMenuOpIds.includes(String(op.menuOperationId))
        );
    };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazدırmak"), [allowedOperations, currentMenuOpIds]);

    const hasStatusPermission = useMemo(() => hasPermission("Onaylamak"), [allowedOperations, currentMenuOpIds]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            handleImportExcel(selectedFile);
        }
    };

    const handleImportExcel = (selectedFile: File) => {
        if (!selectedFile) {
            showAlert('Lütfen önce bir Excel dosyası seçin.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // داده‌ها را از سطر اول به عنوان هدر و از سطر دوم به بعد به عنوان داده بخوانید
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                // هدرها در سطر اول (index 0) قرار دارند.
                const headersRow = jsonData[0] as string[];

                // داده‌ها از سطر دوم (index 1) شروع می‌شوند.
                const dataRows = jsonData.slice(1);

                const trimmedHeaders = headersRow.map(header => (header as string)?.trim().toLowerCase());

                // تعریف نام‌های ستون‌ها
                // ✅ از نام‌های جستجو شده در آرایه trimmedHeaders استفاده کنید
                const nameColIndex = trimmedHeaders.indexOf('ürün');
                const unitColIndex = trimmedHeaders.indexOf('ölçü');
                const quantityColIndex = trimmedHeaders.indexOf('miktar');
                const descriptionColIndex = trimmedHeaders.indexOf('açıklama');
                const priceColIndex = trimmedHeaders.indexOf('fiyat');
                debugger
                // بررسی وجود ستون‌های ضروری
                if (nameColIndex === -1 || unitColIndex === -1 || quantityColIndex === -1) {
                    showAlert('Gerekli sütunlar (Ürün, ÖLÇÜ, Miktar) bulunamadı.', 'error');
                    return;
                }

                const parsedItems: OrderItem[] = [];
                dataRows.forEach((row, index) => {
                    const quantityValue = row[quantityColIndex];

                    // بررسی مقدار Miktar
                    if (quantityValue && Number(quantityValue) > 0) {
                        const itemName = row[nameColIndex];
                        const itemUnitTitle = row[unitColIndex];
                        const excelDescription = descriptionColIndex !== -1 ? row[descriptionColIndex] : '';
                        const excelPrice = priceColIndex !== -1 ? row[priceColIndex] : null;

                        const fullItem = itemsList.find(i => i.name === itemName);

                        parsedItems.push({
                            // یک id موقت برای آیتم‌های جدید
                            id: Date.now() + index,
                            // اگر آیتم در لیست اصلی وجود داشت، id آن را استفاده کن، در غیر این صورت نام آن را.
                            item: fullItem ? fullItem.id : itemName,
                            quantity: Number(quantityValue),
                            description: excelDescription || '',
                            isEditing: false,
                            unit: fullItem ? fullItem.unit : { id: '', title: itemUnitTitle, recordStatus: 0, createAt: '' },
                            isRegistered: !!fullItem,
                            price: excelPrice,
                        });
                    }
                });

                // آیتم‌های جدید را به لیست فعلی اضافه کنید
                setOrderItems(prevItems => [...prevItems, ...parsedItems]);
                showAlert('Excel dosyası başarıyla içe aktarıldı.', 'success');

            } catch (error) {
                console.error(error);
                showAlert('Excel dosyasını okurken bir hata oluştu.', 'error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

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
    const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
        if (priceInput === null || priceInput === undefined) {
            return '₺0.00';
        }
        // حذف هر کاراکتری که عدد، نقطه یا منفی نیست (برای اطمینان بیشتر)
        const cleanedString = String(priceInput).replace(/[^0-9.-]/g, '');
        const numericValue = parseFloat(cleanedString);

        if (isNaN(numericValue)) {
            return '₺0.00';
        }

        // تغییر tr-TR به en-US برای استفاده از نقطه به عنوان اعشار
        const formattedPrice = numericValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        return formattedPrice;
    };
    const stripHtml = (htmlString: string): string => {
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        return doc.body.textContent || "";
    };


    const addPdfHeader = (doc: jsPDF, title: string) => {
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
        doc.text(`Rapor Tarihi:`, 15, 40);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

        // اضافه کردن خط جداکننده خاکستری طبق استاندارد جدید
        // doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(15, 45, pageWidth - 15, 45);
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


    const exportToPdf = (orderData: OrderType) => {
        debugger
        const doc = new jsPDF();
        // بارگذاری فونت‌ها
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        // داده‌های جدول اصلی
        const rows = orderData.orderDetails.map(detail => [
            detail.item.name || '-',
            Number(detail.quantity).toFixed(2) || '-',
            detail.item.unit.title || '-',
            stripHtml(detail.description) || '-',
            cleanAndFormatPrice(detail.price),
        ]);

        // رسم جدول اصلی
        autoTable(doc, {
            startY: 105,
            head: [['Ürün Adı', 'Miktar', 'Birim', 'Açıklama', 'Fiyat']],
            body: rows,
            theme: 'grid',
            styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: (data) => {
                if (data.pageNumber === 1) {
                    addPdfHeader(doc, `Sipariş Detayları`);
                    doc.setFont('Arial');
                    doc.setFontSize(10);
                    doc.text(`Sipariş No: ${orderData.id}`, 15, 54);
                    doc.text(`Şebeke: ${orderData.network ? orderData.network.title : '-'}`, 15, 60);
                    doc.text(`Şantiye: ${orderData.workhouse ? orderData.workhouse.name : '-'}`, 15, 67); // تغییر Y coordinate بقیه
                    doc.text(`Tarih: ${formatDateDisplay(orderData.docDate)}`, 15, 75); // Y += 7
                    doc.text(`İlişkili Talep No: ${orderData.request ? '#' + orderData.request.id + orderData.request.subject : '-'}`, 15, 82); // Y += 7
                    doc.text(`Genel Açıklama: ${orderData.description || '-'}`, 15, 90);
                }
                addPdfFooter(doc);
            },
            showHead: 'everyPage',
            margin: { top: 65, bottom: 45 },
        });

        const finalY = (doc as any).lastAutoTable.finalY;

        // --- محاسبات جدول خلاصه ---
        const summaryData = new Map<string, { totalQty: number, totalPrice: number }>();
        let grandTotalPrice = 0;

        orderData.orderDetails.forEach(detail => {
            const unitTitle = detail.item.unit.title;
            const qty = Number(detail.quantity);

            // تمیز کردن قیمت
            const rawPriceString = String(detail.price).replace(/[$,]/g, '');
            const unitPrice = parseFloat(rawPriceString) || 0;

            const lineTotal = qty * unitPrice; // قیمت کل این ردیف

            const currentData = summaryData.get(unitTitle) || { totalQty: 0, totalPrice: 0 };
            summaryData.set(unitTitle, {
                totalQty: currentData.totalQty + qty,
                totalPrice: currentData.totalPrice + lineTotal
            });

            grandTotalPrice += lineTotal;
        });

        // رسم جدول خلاصه
        if (summaryData.size > 0) {
            const summaryRows = Array.from(summaryData.entries()).map(([unit, data]) => [
                unit,
                data.totalQty.toFixed(2),
                cleanAndFormatPrice(data.totalPrice) // جمع قیمت واحد
            ]);

            autoTable(doc, {
                startY: finalY + 10,
                head: [['Birim', 'Toplam Miktar', 'Toplam Tutar']], // ستون سوم اضافه شد
                body: summaryRows,
                theme: 'grid',
                styles: { font: 'Arial', fontSize: 10 },
                headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
            });

            // نمایش جمع کل نهایی
            const priceSummaryY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setFont('Arial', 'normal');
            if (grandTotalPrice > 0) {
                doc.text(`Genel Toplam: ${cleanAndFormatPrice(grandTotalPrice)}`, 15, priceSummaryY);
            }
        }

        doc.save(`Sipariş_${orderData.id}_Detayları.pdf`);
    };


    const exportDetailedPdf = (filtered: boolean) => {
        const dataToExport = filtered ? sortedAndFilteredOrders : ordersList;
        if (dataToExport.length === 0) {
            showAlert('PDF oluşturulacak sipariş bulunamadı.', 'warning');
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

        dataToExport.forEach((order, index) => {
            if (index > 0) doc.addPage();

            const title = filtered ? 'Filtrelenmiş Sipariş Raporu' : 'Tüm Siparişler Raporu';
            addPdfHeader(doc, title);
            doc.setFontSize(10);
            doc.text(`Sipariş No: ${order.id}`, 15, 54);
            doc.text(`Şebeke: ${order.network ? order.network.title : '-'}`, 15, 60);
            doc.text(`Şantiye: ${order.workhouse ? order.workhouse.name : '-'}`, 15, 66); // تغییر Y coordinate بقیه
            doc.text(`Tarih: ${formatDateDisplay(order.docDate)}`, 15, 75); // Y += 7
            doc.text(`İlişkili Talep No: ${order.request ? '#' + order.request.id + order.request.subject : '-'}`, 15, 82); // Y += 7
            doc.text(`Genel Açıklama: ${order.description || '-'}`, 15, 90);

            const rows = order.orderDetails.map(detail => [
                detail.item.name || '-',
                Number(detail.quantity).toFixed(2) || '-',
                detail.item.unit.title || '-',
                stripHtml(detail.description) || '-',
                cleanAndFormatPrice(detail.price),
            ]);

            autoTable(doc, {
                startY: 105,
                head: [['Ürün Adı', 'Miktar', 'Birim', 'Açıklama', 'Fiyat']],
                body: rows,
                theme: 'grid',
                styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: () => {
                    addPdfFooter(doc);
                },
                showHead: 'everyPage',
                margin: { top: 60, bottom: 45 },
            });

            const finalY = (doc as any).lastAutoTable.finalY;

            // --- محاسبات جدول خلاصه ---
            const summaryData = new Map<string, { totalQty: number, totalPrice: number }>();
            let grandTotalPrice = 0;

            order.orderDetails.forEach(detail => {
                const unitTitle = detail.item.unit.title;
                const qty = Number(detail.quantity);

                const rawPriceString = String(detail.price).replace(/[$,]/g, '');
                const unitPrice = parseFloat(rawPriceString) || 0;
                const lineTotal = qty * unitPrice;

                const currentData = summaryData.get(unitTitle) || { totalQty: 0, totalPrice: 0 };
                summaryData.set(unitTitle, {
                    totalQty: currentData.totalQty + qty,
                    totalPrice: currentData.totalPrice + lineTotal
                });

                grandTotalPrice += lineTotal;
            });

            if (summaryData.size > 0) {
                const summaryRows = Array.from(summaryData.entries()).map(([unit, data]) => [
                    unit,
                    data.totalQty.toFixed(2),
                    cleanAndFormatPrice(data.totalPrice)
                ]);

                autoTable(doc, {
                    startY: finalY + 10,
                    head: [['Birim', 'Toplam Miktar', 'Toplam Tutar']],
                    body: summaryRows,
                    theme: 'grid',
                    styles: { font: 'Arial', fontSize: 10 },
                    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
                });

                const priceSummaryY = (doc as any).lastAutoTable.finalY + 10;
                doc.setFontSize(12);
                doc.setFont('Arial', 'normal');
                if (grandTotalPrice > 0) {
                    doc.text(`Genel Toplam: ${cleanAndFormatPrice(grandTotalPrice)}`, 15, priceSummaryY);
                }
            }
        });

        const fileName = filtered ? 'Filtrelenmis_Siparisler.pdf' : 'Tum_Siparisler.pdf';
        doc.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');

        setOpenDownloadAllModal(false);
        setOpenDownloadFilteredModal(false);
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

    const exportToExcel = (orderData: OrderType) => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Sipariş Detayları');

        worksheet.views = [{ rightToLeft: false }];

        worksheet.addRow(['Sipariş Detayları']).font = { name: 'Arial', size: 12, bold: true };
        worksheet.mergeCells('A1:E1');
        worksheet.getCell('A1').alignment = { horizontal: 'center' };
        worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
        worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: false };
        worksheet.getCell('A2').alignment = { horizontal: 'left' };
        worksheet.addRow([]);

        worksheet.addRow(['Sipariş No', orderData.id]);
        worksheet.addRow(['Şebeke', orderData.network ? orderData.network.title : '-']);
        worksheet.addRow(['Şantiye', orderData.workhouse ? orderData.workhouse.name : '-']);
        worksheet.addRow(['Tarih', formatDateDisplay(orderData.docDate)]);
        worksheet.addRow(['İlişkili Talep No', orderData.request ? '#' + orderData.request.id + orderData.request.subject : '-']);

        worksheet.addRow(['Genel Açıklama', orderData.description || '-']);
        worksheet.addRow([]);

        const tableHeaders = ['Ürün', 'ÖLÇÜ', 'Miktar', 'Açıklama', 'Fiyat'];
        const headerRow = worksheet.addRow(tableHeaders);
        headerRow.font = { name: 'Arial', bold: true };
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD9E1F2' }
            };
        });

        orderData.orderDetails.forEach(detail => {
            worksheet.addRow([
                detail.item.name,
                detail.item.unit.title,
                detail.quantity,
                stripHtml(detail.description),
                cleanAndFormatPrice(detail.price)
            ]);
        });

        // تنظیم عرض ستون‌ها
        worksheet.columns.forEach((column) => {
            let maxLength = 0;
            if (column && typeof column.eachCell === 'function') {
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
            }
            column.width = Math.min(Math.max(maxLength + 2, 15), 50);
        });

        // --- محاسبات جدول خلاصه ---
        const summaryData = new Map<string, { totalQty: number, totalPrice: number }>();
        let grandTotalPrice = 0;

        orderData.orderDetails.forEach(detail => {
            const unitTitle = detail.item.unit.title;
            const qty = Number(detail.quantity);

            const rawPriceString = String(detail.price).replace(/[$,]/g, '');
            const unitPrice = parseFloat(rawPriceString) || 0;
            const lineTotal = qty * unitPrice;

            const currentData = summaryData.get(unitTitle) || { totalQty: 0, totalPrice: 0 };
            summaryData.set(unitTitle, {
                totalQty: currentData.totalQty + qty,
                totalPrice: currentData.totalPrice + lineTotal
            });

            grandTotalPrice += lineTotal;
        });

        if (summaryData.size > 0) {
            worksheet.addRow([]);
            worksheet.addRow(['Birim Bazlı Toplamlar']).font = { name: 'Arial', size: 12, bold: true };

            const summaryHeaders = ['Birim', 'Toplam Miktar', 'Toplam Tutar'];
            const summaryHeaderRow = worksheet.addRow(summaryHeaders);
            summaryHeaderRow.font = { name: 'Arial', bold: true };
            summaryHeaderRow.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD9E1F2' }
                };
            });

            Array.from(summaryData.entries()).forEach(([unit, data]) => {
                worksheet.addRow([
                    unit,
                    data.totalQty.toFixed(2),
                    cleanAndFormatPrice(data.totalPrice)
                ]);
            });
        }

        if (grandTotalPrice > 0) {
            worksheet.addRow([]);
            const grandTotalRow = worksheet.addRow(['Genel Toplam', '', cleanAndFormatPrice(grandTotalPrice)]);
            grandTotalRow.font = { name: 'Arial', bold: true, size: 11 };
        }

        const startRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 1;
        addExcelCompanyInfo(worksheet, startRow);

        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), `Sipariş_${orderData.id}_Detayları.xlsx`);
        });
    };

    const exportAllExcel = (filtered: boolean) => {
        const dataToExport = filtered ? sortedAndFilteredOrders : ordersList;
        if (dataToExport.length === 0) {
            showAlert('Excel oluşturulacak sipariş bulunamadı.', 'warning');
            return;
        }

        const workbook = new Excel.Workbook();

        dataToExport.forEach((order) => {
            const worksheet = workbook.addWorksheet(`Sipariş_${order.id}`);
            worksheet.views = [{ rightToLeft: false }];

            // هدر گزارش
            worksheet.addRow([`Sipariş Detayları`]).font = { name: 'Arial', size: 12, bold: true };
            worksheet.mergeCells('A1:E1');
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: false };
            worksheet.getCell('A2').alignment = { horizontal: 'left' };
            worksheet.addRow([]);

            // جزئیات سفارش
            worksheet.addRow(['Sipariş No', order.id]);
            worksheet.addRow(['Şebeke', order.network ? order.network.title : '-']);
            worksheet.addRow(['Şantiye', order.workhouse ? order.workhouse.name : '-']);
            worksheet.addRow(['Tarih', formatDateDisplay(order.docDate)]);
            worksheet.addRow(['İlişkili Talep No', order.request ? '#' + order.request.id + order.request.subject : '-']);
            worksheet.addRow(['Genel Açıklama', order.description || '-']);
            worksheet.addRow([]);

            // هدرهای جدول
            const tableHeaders = ['Ürün', 'ÖLÇÜ', 'Miktar', 'Açıklama', 'Fiyat'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.font = { name: 'Arial', bold: true };
            headerRow.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD9E1F2' }
                };
            });

            // اقلام سفارش
            order.orderDetails.forEach(detail => {
                worksheet.addRow([
                    detail.item.name,
                    detail.item.unit.title,
                    detail.quantity,
                    stripHtml(detail.description),
                    cleanAndFormatPrice(detail.price)
                ]);
            });

            // تنظیم عرض ستون‌ها
            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                if (column && typeof column.eachCell === 'function') {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 15), 50);
            });

            // --- محاسبات جدول خلاصه ---
            const summaryData = new Map<string, { totalQty: number, totalPrice: number }>();
            let grandTotalPrice = 0;

            order.orderDetails.forEach(detail => {
                const unitTitle = detail.item.unit.title;
                const qty = Number(detail.quantity);

                const rawPriceString = String(detail.price).replace(/[$,]/g, '');
                const unitPrice = parseFloat(rawPriceString) || 0;
                const lineTotal = qty * unitPrice;

                const currentData = summaryData.get(unitTitle) || { totalQty: 0, totalPrice: 0 };
                summaryData.set(unitTitle, {
                    totalQty: currentData.totalQty + qty,
                    totalPrice: currentData.totalPrice + lineTotal
                });

                grandTotalPrice += lineTotal;
            });

            if (summaryData.size > 0) {
                worksheet.addRow([]);
                worksheet.addRow(['Birim Bazlı Toplamlar']).font = { name: 'Arial', size: 12, bold: true };

                const summaryHeaders = ['Birim', 'Toplam Miktar', 'Toplam Tutar'];
                const summaryHeaderRow = worksheet.addRow(summaryHeaders);
                summaryHeaderRow.font = { name: 'Arial', bold: true };
                summaryHeaderRow.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFD9E1F2' }
                    };
                });

                Array.from(summaryData.entries()).forEach(([unit, data]) => {
                    worksheet.addRow([
                        unit,
                        data.totalQty.toFixed(2),
                        cleanAndFormatPrice(data.totalPrice)
                    ]);
                });
            }

            if (grandTotalPrice > 0) {
                worksheet.addRow([]);
                const grandTotalRow = worksheet.addRow(['Genel Toplam', '', cleanAndFormatPrice(grandTotalPrice)]);
                grandTotalRow.font = { name: 'Arial', bold: true, size: 11 };
            }

            const startRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 1;
            addExcelCompanyInfo(worksheet, startRow);
        });

        workbook.xlsx.writeBuffer().then(buffer => {
            const fileName = filtered ? 'Filtrelenmis_Siparisler.xlsx' : 'Tum_Siparisler.xlsx';
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        });

        setOpenDownloadAllModal(false);
        setOpenDownloadFilteredModal(false);
    };
    // ------------------ End of New Export Functions ------------------
    const handleItemChange = (id: number, field: string, value: any) => {
        // پیدا کردن آیتم در حال تغییر
        const itemToUpdate = orderItems.find(item => item.id === id);
        if (!itemToUpdate) return;

        // ایجاد یک کپی از آیتم برای به‌روزرسانی
        const updatedItem = { ...itemToUpdate };

        // اگر فیلد item تغییر کرد (یعنی محصول از کامبو باکس انتخاب شد)
        if (field === 'item') {
            const selectedItem = itemsList.find(i => i.id === value);
            updatedItem.item = value;
            updatedItem.unit = selectedItem?.unit;
            updatedItem.isRegistered = !!selectedItem;
            // ✅ مقدار Miktar را به 0 یا مقدار فعلی تنظیم کنید، آن را دست‌نخورده نگه دارید.
            //updatedItem.quantity = 0;
        }
        // اگر فیلد quantity تغییر کرد
        else if (field === 'quantity') {
            const numericValue = parseFloat(value);
            updatedItem.quantity = isNaN(numericValue) ? 0 : numericValue;
        } else if (field === 'price') {
            const numericValue = parseFloat(value);
            updatedItem.price = isNaN(numericValue) ? 0 : numericValue; // ✅ اگر NaN بود، 0 را ذخیره کن
        }
        // اگر فیلد دیگری تغییر کرد
        else {
            (updatedItem as any)[field] = value;
        }

        // به‌روزرسانی نهایی آرایه وضعیت (state)
        const updatedOrderItems = orderItems.map(item =>
            item.id === id ? updatedItem : item
        );
        setOrderItems(updatedOrderItems);
    };
    const handleOpenSelectTenderModal = () => {
        setOpenSelectTenderModal(true);
    };

    const handleCloseSelectTenderModal = () => {
        setOpenSelectTenderModal(false);
    };
    const handleSelectItemsFromTender = (items: OrderItem[]) => {
        // آیتم‌های جدید را به لیست فعلی اضافه کنید
        setOrderItems(prevItems => [...prevItems, ...items]);
        showAlert('Ürünler başarıyla eklendi!', 'success');
        handleCloseSelectTenderModal();
    };
    const handleRemoveItem = (id: number) => { setOrderItems(prevItems => prevItems.filter(item => item.id !== id)); };
    const selectedItemIds = orderItems.filter(item => !item.isEditing).map(item => item.item);
    const availableItemsList = itemsList.filter(item => !selectedItemIds.includes(item.id));
    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => { setAlertMessage(message); setAlertSeverity(severity); };
    const clearAlert = () => { setAlertMessage(null); };
    useEffect(() => { let timer: NodeJS.Timeout; if (alertMessage) { timer = setTimeout(() => { clearAlert(); }, 5000); } return () => { clearTimeout(timer); }; }, [alertMessage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    const fetchTenders = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-tenders", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const activeTenders = response.data.data.filter((tender: TenderType) => tender.recordStatus === 0);
                setTendersList(activeTenders);
            } else {
                showAlert(response.data.message || 'İhale listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('İhale listesi yüklenirken bir hata oluştu.', 'error'); }
        }
    }, [navigate]);


    const getNetworks = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/"); return;
        }
        try {
            const result = await axios.request({
                baseURL: server.baseurl + server.initialoperations + "get-networks",
                method: "get",
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const activeNetworks = result.data.data.filter((net: Network) => net.recordStatus === 0);
                setNetworks(activeNetworks);
            } else {
                showAlert(result.data.message || 'Şebeke listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            } else {
                showAlert('Şebeke listesi alınırken bir hata oluştu.', 'error');
            }
        }
    };

    const getListItem = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item",
                {
                    headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
                });
            if (response.data && response.data.success) {
                const activeItems = response.data.data.filter((item: ItemType) => item.recordStatus === 0);
                setItemsList(activeItems);
            } else {
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            else {
                showAlert('Ürünler sunucudan alınamadı', 'error');
            }
        }
    };

    const getListOrders = async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate("/");
            setLoadingData(false);
            return;
        }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-orders",
                { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setOrdersList(response.data.data as OrderType[]);
            } else {
                showAlert(response.data.message || 'Siparişler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Siparişler yüklenirken bir hata oluştu.', 'error');
        }
        finally { setLoadingData(false); }
    };

    // در کنار سایر توابع واکشی (getNetworks, getListItem, getListOrders)
    const fetchRequestsList = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        try {
            const response = await axios.get(
                server.baseurl + server.hr + "get-all-requests", // ⬅️ API درخواستی شما
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {
                const activeRequests = (response.data.data as any[])
                    .filter(req => req.status === 1) // فیلتر کردن فقط درخواست‌های "Beklemede" یا "Aktif"
                    .map(req => ({ id: Number(req.id), subject: req.subject }));
                setRequestsList(activeRequests);
            } else {
                showAlert(response.data.message || 'Talep listesi alınamadı.', 'error');
            }
        } catch (e) {
            console.error("Failed to fetch requests:", e);
        }
    };

    const getWorkhousesList = useCallback(async () => {
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
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
            if (response.data.httpStatusCode === 200) {
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else {
                showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Şantiye listesi alınırken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    useEffect(() => {
        getNetworks();
        getListItem();
        getListOrders();
        fetchTenders();
        fetchRequestsList();
        getWorkhousesList(); // <--- اینجا اضافه کنید
    }, []);
    const validateForm = (): boolean => {
        let isValid = true;
        //  if (!network) {
        //     setNetworkError(true); isValid = false;
        // } else { setNetworkError(false); } 
        if (!docDate) {
            setDocDateError(true); isValid = false;

        } else { setDocDateError(false); }
        const hasEmptyItem = orderItems.some(item => !item.item || item.quantity <= 0);
        if (orderItems.length === 0 || hasEmptyItem) {
            setOrderItemsError(true); isValid = false;
        }
        else { setOrderItemsError(false); }
        if (!isValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }
        return isValid;
    };
    const resetForm = () => {
        setNetwork('');
        setDocDate(new Date());
        setGeneralDescription('');
        setWorkhouse('');
        setOrderItems([]);
        setRequestId(null);
        setSelectedWork(null);
        setNetworkError(false);
        setDocDateError(false);
        setOrderItemsError(false);
        setFile(null);
        setIsFormVisible(false);
    };

    const handleSaveOrder = async () => {
        if (!validateForm()) return;
        const orderData = {
            docDate: docDate?.toISOString(),
            description: generalDescription,
            networkId: network == "" ? null : Number(network),
            workhouseId: workhouse ? Number(workhouse) : null,
            requestId: requestId,
            status: 0,
            orderDetails: orderItems.map(item => ({
                itemId: Number(item.item),
                quantity: parseFloat(String((item.quantity).toFixed(2))),
                price: String(item.price) == "" || item.price == undefined ? "0.00" : parseFloat(String(item.price)).toFixed(2),
                description: item.description
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await
                axios.post(server.baseurl + server.initialoperations + "create-order",
                    orderData,
                    { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 201) {
                showAlert('Sipariş başarıyla kaydedildi!', 'success');
                resetForm();
                getListOrders();
            }
            else {
                showAlert(response.data.message || 'Sipariş kaydedilirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate("/");
                showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
            }
            else { showAlert('Sipariş kaydedilirken bir hata oluştu.', 'error'); }
        }
    };
    const handleUpdateOrder = async () => {
        if (!validateForm() || !editingId) return;
        const orderData = {
            id: Number(editingId),
            docDate: docDate?.toISOString(),
            description: generalDescription,
            networkId: network == "" ? null : Number(network),
            workhouseId: workhouse ? Number(workhouse) : null,
            requestId: requestId,
            orderDetails: orderItems.map(item => ({
                itemId: Number(item.item),
                quantity: parseFloat(String(item.quantity)),
                price: String(item.price) == "" || item.price == undefined ? "0.00" : parseFloat(String(item.price)).toFixed(2),
                description: item.description
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.put(
                server.baseurl + server.initialoperations + "update-order", orderData,
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Sipariş başarıyla güncellendi!', 'success');
                resetForm();
                getListOrders();
            } else { showAlert(response.data.message || 'Sipariş güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            }
            else { showAlert('Sipariş güncellenirken bir hata oluştu.', 'error'); }
        }
    };

    const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'pending' | 'approved' | 'rejected' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } };
    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); setPage(0); };
    const handleRequestSort = (property: 'id' | 'network.title' | 'docDate' | 'status') => {
        const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property); setPage(0);
    };
    const handleOpenModal = (details: OrderDetailType[]) => { setModalDetails(details); setOpenModal(true); };
    const handleCloseModal = () => { setOpenModal(false); };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: OrderType) => { setAnchorEl(event.currentTarget); setSelectedOrderForMenu(row); };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        // setSelectedOrderForMenu(null); 
    };
    // const handleAction = async (action: 'approve' | 'reject' | 'edit' | 'delete') => { alert(`Sipariş #${selectedOrderForMenu?.id} için "${action}" işlemi yapıldı.`); handleCloseMenu(); };

    const onDeleteSuccess = () => { getListOrders(); };

    const handleClickOpenDeleteModal = (id: number, title: string) => { setOrderIdToDelete(id); setOrderTitleToDelete(title); setOpenDeleteModal(true); handleCloseMenu(); };
    const handleClickCloseDeleteModal = () => { setOpenDeleteModal(false); setOrderIdToDelete(null); setOrderTitleToDelete(''); };


    const handleEditClick = (row: OrderType) => {
        setEditingId(row.id);

        // ✅ بررسی وجود row.network قبل از دسترسی به ویژگی‌های آن
        if (row.network) {
            const selectedNetwork = networks.find(net => net.title === row.network.title);
            if (selectedNetwork) {
                setNetwork(selectedNetwork.id);
                setSelectedWork(selectedNetwork.work);
            }
        } else {
            // ✅ در صورتی که network وجود ندارد، وضعیت‌ها را به حالت پیش‌فرض برگردانید یا مطابق نیاز مدیریت کنید
            setNetwork('');
            setSelectedWork(null);
        }
        setWorkhouse(row.workhouse ? row.workhouse.id : '');
        const reqId = row.requestId ? Number(row.requestId) : (row.request?.id ? Number(row.request.id) : null);
        setRequestId(reqId);
        setDocDate(new Date(row.docDate));
        setGeneralDescription(row.description || '');
        const itemsToEdit: OrderItem[] = row.orderDetails.map(detail => {
            const fullItem = itemsList.find(item => item.id === detail.item.id);

            // پاکسازی قیمت
            let priceValue = 0;
            if (detail.price !== null && detail.price !== undefined) {
                // حذف $ و , و تبدیل به عدد
                const cleanString = String(detail.price).replace(/[$,]/g, '');
                const parsed = parseFloat(cleanString);
                // اگر نتیجه NaN نبود، مقدار را استفاده کن
                priceValue = isNaN(parsed) ? 0 : parsed;
            }

            return {
                id: detail.id,
                item: fullItem ? fullItem.id : '',
                quantity: detail.quantity,
                description: detail.description,
                isEditing: false,
                unit: fullItem ? fullItem.unit : undefined,
                isRegistered: true,
                price: priceValue // مقدار اصلاح شده
            };
        });
        setOrderItems(itemsToEdit);
        handleCloseMenu();
        setIsFormVisible(true);
        clearAlert();
    };
    const handleRegisterItemSuccess = (registeredItem: any) => { // ✅ onRegisterSuccess handler
        getListItem();
        const updatedItems = orderItems.map(item => {
            if (item.item === registeredItem.name) {
                return {
                    ...item,
                    item: registeredItem.id,
                    unit: registeredItem.unit,
                    isRegistered: true,
                };
            }
            return item;
        });
        setOrderItems(updatedItems);
        showAlert('Ürün başarıyla kaydedildi ve sipariş tablosu güncellendi.', 'success');
        setOpenRegisterModal(false);
    };

    const handleOpenRegisterModal = (item: { name: string; unit: string; }) => {
        setUnregisteredItemData({
            description: item.name,
            olcuBrimi: item.unit,
        });
        setOpenRegisterModal(true);
    };
    const handleAddItem = () => {
        setOrderItems(prevItems => prevItems.map(item => ({ ...item, isEditing: false })));
        setOrderItems(prevItems => [...prevItems, {
            id: Date.now(), item: '', quantity: 0,
            description: '', isEditing: true, price: 0
        }]);
    };
    const handleToggleEdit = (id: number) => {
        setOrderItems(prevItems =>
            prevItems.map(item => ({ ...item, isEditing: item.id === id ? !item.isEditing : false }))
        );
    };

    const handleClickOpenStatusModal = (id: number, action: 'approve' | 'reject') => {
        setStatusToUpdate(action === 'approve' ? 1 : 2);
        // setSelectedOrderForMenu(ordersList.find(o => o.id === id) || null); 
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
        // if (!description.trim()) {
        //     setStatusError(true);
        //     showAlert('Lütfen bir açıklama giriniz.', 'warning');
        //     return;
        // }

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
                server.baseurl + server.initialoperations + "update-order-status",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Sipariş durumu başarıyla güncellendi!', 'success');
                getListOrders(); // Sipariş listesini güncelle
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
            getListOrders();
        }
    };

    const hasUnregisteredItems = useMemo(() => {
        return orderItems.some(item => !item.isRegistered);
    }, [orderItems]);

    const filteredOrders = ordersList.filter(order => {
        const networkTitle = order.network ? order.network.title : '';
        const matchesSearch = networkTitle.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'pending' && order.status === 0) ||
            (statusFilter === 'approved' && order.status === 1) ||
            (statusFilter === 'rejected' && order.status === 2);

        const docDate = new Date(order.docDate);
        const isWithinDateRange =
            (!startDate || docDate >= startDate) &&
            (!endDate || docDate <= endDate);

        const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(order.id));


        return matchesSearch && matchesStatus && isWithinDateRange && matchesNotifIds;
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

    const handleOpenHistoryModal = (row: OrderType) => {
        // گرفتن کپی از آرایه و مرتب‌سازی آن بر اساس تاریخ (نزولی)
        const sortedHistory = row.orderHeaderStatusHistories
            ? [...row.orderHeaderStatusHistories].sort((a, b) =>
                new Date(b.createAt).getTime() - new Date(a.createAt).getTime()
            )
            : [];

        setHistoryData(sortedHistory);
        setOpenHistoryModal(true);
    };

    const handleCloseHistoryModal = () => {
        setOpenHistoryModal(false);
        setHistoryData([]);
    };


    const sortedAndFilteredOrders = stableSort(filteredOrders, getComparator(order, orderBy));
    const paginatedOrders = sortedAndFilteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };


    // محاسبه جمع کل بر اساس واحد برای مودال جزئیات
    const modalSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        let grandTotal = 0;

        modalDetails.forEach((detail) => {
            const unitTitle = detail.item?.unit?.title || "Diğer";
            const qty = Number(detail.quantity) || 0;

            // راه حل خطا: تبدیل اجباری به رشته و سپس تمیزسازی
            // این خط هم برای عدد کار می‌کند و هم برای رشته‌های دارای علامت مثل $
            const rawPrice = String(detail.price);
            const cleanPrice = rawPrice.replace(/[^0-9.-]/g, '');
            const priceVal = parseFloat(cleanPrice) || 0;

            const lineTotal = qty * priceVal;

            // اضافه کردن به جمع واحد مربوطه
            summary[unitTitle] = (summary[unitTitle] || 0) + lineTotal;
            grandTotal += lineTotal;
        });

        return { summary, grandTotal };
    }, [modalDetails]);

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems="stretch"
                    flexGrow={1}
                    justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                >
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Satın Alma Belgesi kaydetmek için tıklayınız" : ""}>
                            <BlinkingButton
                                variant="contained"
                                color="primary"
                                onClick={() => setIsFormVisible(true)}
                                isBlinking={isBlinking}
                                fullWidth={false}
                            >
                                Yeni Satın Alma Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={resetForm}
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
                    <Typography variant="h6" mb={2}>Sipariş Detayları</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <CustomFormLabel htmlFor="network-autocomplete" sx={{ mt: 0, mb: { xs: 0, sm: 0 } }}>
                                Şebeke
                            </CustomFormLabel>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Autocomplete<Network>
                                    id="network-autocomplete" options={networks} getOptionLabel={(option) => option.title}
                                    value={networks.find(net => net.id === network) || null}
                                    onChange={(_event, newValue) => {
                                        setNetwork(newValue ? newValue.id : ''); setSelectedWork(newValue ? newValue.work : null);
                                        if (networkError && newValue) setNetworkError(false);
                                    }} renderInput={(params) => (
                                        <TextField {...params} label="Şebeke Seçin" variant="outlined" size="small" error={networkError} helperText={networkError ? "Bu alan zorunludur!" : ""}
                                        />
                                    )} sx={{ flexGrow: 1 }}
                                />
                                {selectedWork && (<Chip label={selectedWork.title} color="primary" variant="outlined" />)}
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <CustomFormLabel htmlFor="workhouse-autocomplete" sx={{ mt: 0, mb: { xs: 0, sm: 0 } }}>
                                Şantiye (Opsiyonel)
                            </CustomFormLabel>
                            <Autocomplete<WorkhouseType>
                                id="workhouse-autocomplete"
                                options={workhousesList}
                                getOptionLabel={(option) => option.name}
                                value={workhousesList.find(wh => wh.id === Number(workhouse)) || null}
                                onChange={(_event, newValue) => setWorkhouse(newValue ? newValue.id : '')}
                                renderInput={(params) => (
                                    <TextField {...params} label="Şantiye Seçin" variant="outlined" size="small" />
                                )}
                                sx={{ flexGrow: 1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <CustomFormLabel htmlFor="request-autocomplete" sx={{ mt: 0, mb: { xs: 0, sm: 0 } }}>İlişkili Talep (Opsiyonel)</CustomFormLabel>
                            <Autocomplete<RequestComboItem>
                                id="request-autocomplete"
                                options={requestsList}
                                getOptionLabel={(option) => `#${option.id} - ${option.subject}`}
                                value={requestsList.find(req => req.id === requestId) || null}
                                onChange={(_event, newValue) => setRequestId(newValue ? newValue.id : null)}
                                renderInput={(params) => (
                                    <TextField {...params} label="Talep Seçin" variant="outlined" size="small" />
                                )}
                                sx={{ flexGrow: 1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <CustomFormLabel htmlFor="doc-date" sx={{ mt: 0, mb: { xs: 0, sm: 0 } }} required>
                                    Tarihi
                                </CustomFormLabel>
                                <DatePicker
                                    value={docDate}
                                    onChange={(newValue) => {
                                        setDocDate(newValue);
                                        if (docDateError && newValue) setDocDateError(false);
                                    }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => (
                                        <TextField {...params}
                                            size="small" error={docDateError}
                                            helperText={docDateError ? "Başlangıç tarihi boş olamaz!" : ""} />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>


                        <Grid item xs={12}>
                            <CustomFormLabel htmlFor="order-general-description">Açıklama (Genel Satın Alma)</CustomFormLabel>
                            <TextField
                                id="order-general-description"
                                label="Satın Alma için genel açıklama giriniz"
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
                    <Typography variant="h6" mb={2} sx={{ mt: 3 }}>Ürün Detayları</Typography>
                    <Box sx={{ mb: 2 }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems="stretch"
                            flexWrap="wrap"
                        >
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<IconUpload />}
                                sx={{ flexGrow: 1 }}
                            >
                                Excel İçe Aktar
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".xlsx, .xls"
                                    style={{ display: 'none' }}
                                />
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                href="/Siparis_Sablonu.xlsx"
                                download="Siparis_Sablonu.xlsx"
                                startIcon={<IconDownload />}
                                sx={{ flexGrow: 1 }}
                            >
                                Şablonu İndir
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleOpenSelectTenderModal}
                                startIcon={<IconListDetails />}
                                sx={{ flexGrow: 1 }}
                            >
                                İhalden Ürün Seç
                            </Button>
                        </Stack>
                        {file && <Typography variant="body2" sx={{ mt: 1 }}>Dosya Seçildi: {file.name}</Typography>}
                    </Box>
                    <OrderItemsTable
                        items={orderItems} itemsList={itemsList} onItemChange={handleItemChange} onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem} onToggleEdit={handleToggleEdit} availableItemsList={availableItemsList}
                        onOpenRegisterModal={handleOpenRegisterModal}
                    />
                    {orderItemsError && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>Sipariş en az bir ürün içermeli ve tüm ürün alanları dolu olmalıdır!</Typography>
                    )}
                    <Box mt={3} textAlign="right">
                        {editingId ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color="info"
                                    onClick={handleUpdateOrder}
                                >
                                    Düzenle
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={resetForm}
                                >
                                    İptal Et
                                </Button>
                            </Stack>
                        ) : (
                            <>
                                {hasCreatePermission && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleSaveOrder}
                                        disabled={hasUnregisteredItems || orderItems.length === 0}
                                    >
                                        Siparişi Kaydet
                                    </Button>
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
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        {hasDownloadPermission && isFilterActive && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Satın Alma indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)}
                                    isBlinking={true}
                                    disabled={loadingData}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Satın Alma Siparişlerini indirin" : ""}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setOpenDownloadAllModal(true)}
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
                    <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                        Sipariş Listesi
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
                                label="Sipariş Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
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
                                value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth
                            >
                                <StyledToggleButton value="all" aria-label="all orders">Tümü</StyledToggleButton>
                                <StyledToggleButton value="pending" aria-label="pending orders">Beklemede</StyledToggleButton>
                                <StyledToggleButton value="approved" aria-label="approved orders">Onaylandı</StyledToggleButton>
                                <StyledToggleButton value="rejected" aria-label="rejected orders">Reddedildi</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                <TableContainer component={Paper}>
                    <Table aria-label="order table">
                        <TableHead sx={{ backgroundColor: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === 'id'}
                                        direction={orderBy === 'id' ? order : 'asc'}
                                        onClick={() => handleRequestSort('id')}
                                    >
                                        <Typography variant="h6">Kod</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'network.title'} direction={orderBy === 'network.title' ? order : 'asc'} onClick={() => handleRequestSort('network.title')}>
                                        <Typography variant="h6">Şebeke Adı</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell><Typography variant="h6">Şantiye</Typography></StyledTableCell>
                                <StyledTableCell><Typography variant="h6">İlişkili Talep</Typography></StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                        <Typography variant="h6">Tarih</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>

                                <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleRequestSort('status')}>
                                        <Typography variant="h6">Durum</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell><Typography variant="h6">Ürün Detayları</Typography></StyledTableCell>
                                <StyledTableCell align="right"><Typography variant="h6"></Typography></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow>
                                    <StyledTableCell colSpan={5} align="center">
                                        <CircularProgress />
                                    </StyledTableCell>
                                </TableRow>
                            ) : (
                                paginatedOrders.length > 0 ? (
                                    paginatedOrders.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>
                                                <Typography variant="body1">#{row.id}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.network ? row.network.title : "-"}</Typography></StyledTableCell>

                                            <StyledTableCell><Typography variant="body1">{row.workhouse ? row.workhouse.name : "-"}</Typography></StyledTableCell>
                                            <StyledTableCell sx={{ maxWidth: 150 }}>
                                                <Typography variant="body1">
                                                    {row.request ? `#${row.request.id} - ${row.request.subject}` : '-'}
                                                </Typography>
                                            </StyledTableCell>
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

                                            <StyledTableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip
                                                        label={statusToLabel(row.status)}
                                                        color={statusToColor(row.status)}
                                                        size="small"
                                                        onClick={() => handleOpenHistoryModal(row)}
                                                    />
                                                    {(row.orderHeaderStatusHistories && row.orderHeaderStatusHistories.length > 0) ? (
                                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Durum Geçmişini Gör" : ""}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenHistoryModal(row)}
                                                            >
                                                                <IconInfoCircle size={18} />
                                                            </IconButton>
                                                        </CustomTooltip>
                                                    ) : null}
                                                </Stack>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.orderDetails)}>
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
                                                >
                                                    <IconDots size={20} />
                                                </IconButton>
                                                <Menu
                                                    id="basic-menu"
                                                    anchorEl={anchorEl}
                                                    open={Boolean(anchorEl) && selectedOrderForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                                >
                                                    {hasStatusPermission && selectedOrderForMenu?.status === 0 && (
                                                        <>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi onaylayın" : ""}>
                                                                <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                    <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi reddedin" : ""}>
                                                                <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                    <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                        </>
                                                    )}
                                                    {hasStatusPermission && selectedOrderForMenu?.status === 1 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi reddedin" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasStatusPermission && selectedOrderForMenu?.status === 2 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi onaylayın" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && selectedOrderForMenu?.status === 0 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi düzenleyin" : ""}>
                                                            <MuiMenuItem onClick={() => handleEditClick(row)}>
                                                                <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && selectedOrderForMenu?.status === 0 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi silin" : ""}>
                                                            <MuiMenuItem onClick={() => handleClickOpenDeleteModal(row.id, row.network.title)}>
                                                                <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Sipariş raporunu indirin" : ""}>
                                                            <MuiMenuItem onClick={() => {
                                                                if (selectedOrderForMenu) {
                                                                    setOpenDownloadSingleModal(true);
                                                                }
                                                            }}>
                                                                <ListItemIcon><IconFileDownload size={18} /></ListItemIcon> Rapor İndir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">Hiç sipariş bulunamadı.</Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredOrders.length}
                    rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </BlankCard>
            {/* ⬅️ HISTORY MODAL (تاریخچه وضعیت) */}
            <Dialog open={openHistoryModal} onClose={handleCloseHistoryModal} maxWidth="md" fullWidth>
                <DialogTitle>Sipariş Durum Geçmişi</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {historyData.length > 0 ? (
                            historyData.map((h, index) => (
                                <Paper key={index} elevation={1} sx={{ p: 2, borderLeft: `5px solid ${statusToColor(h.status)}` }}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Chip label={statusToLabel(h.status)} color={statusToColor(h.status)} size="small" />
                                        <Typography variant="caption" color="textSecondary">
                                            {new Date(h.createAt).toLocaleString('tr-TR')}
                                        </Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                                        Açıklama: {h.description || '—'}
                                    </Typography>
                                    {h.user?.username && (
                                        <Typography variant="body2">
                                            İşlem Yapan: {h.user.username}
                                        </Typography>
                                    )}
                                </Paper>
                            ))
                        ) : (
                            <Typography>Henüz durum geçmişi yok.</Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseHistoryModal}>Kapat</Button>
                </DialogActions>
            </Dialog>
            {/* Modals */}
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
                <DialogTitle>Ürün Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer component={Paper}>
                        <Table size="small" aria-label="Ürün detayları tablosu">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><Typography variant="h6">Ürün Adı</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Fiyat</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.length > 0 ? (
                                    modalDetails.map((detail, index) => (
                                        <TableRow key={detail.id || index}>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.quantity || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{stripHtml(detail.description) || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{cleanAndFormatPrice(detail.price) || '-'}</Typography></StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={5} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç ürün detayı bulunamadı.
                                            </Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
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
                                                <StyledTableCell sx={{ fontWeight: 'bold' }}>Birim</StyledTableCell>
                                                <StyledTableCell align="right" sx={{ fontWeight: 'bold' }}>Toplam Tutar</StyledTableCell>
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
                                            {/* نمایش جمع کل نهایی (اختیاری) */}
                                            <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                                                <StyledTableCell sx={{ fontWeight: 'bold' }}>GENEL TOPLAM</StyledTableCell>
                                                <StyledTableCell align="right" sx={{ fontWeight: 'bold' }}>
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
                <DialogActions><Button onClick={handleCloseModal}>Kapat</Button></DialogActions>
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

            <DeleteOrderModal
                openModal={openDeleteModal} onClose={handleClickCloseDeleteModal}
                orderIdToDelete={orderIdToDelete} orderTitleToDelete={orderTitleToDelete}
                onDeleteSuccess={onDeleteSuccess} showAlert={showAlert}
            />

            <RegisterUnregisteredItemModal
                open={openRegisterModal} onClose={() => setOpenRegisterModal(false)}
                initialData={unregisteredItemData}
                onRegisterSuccess={handleRegisterItemSuccess} showAlert={showAlert}
            />

            <SelectTenderItemsModal
                open={openSelectTenderModal}
                onClose={handleCloseSelectTenderModal}
                onSelectItems={handleSelectItemsFromTender}
                tendersList={tendersList}
                itemsList={itemsList}
                showAlert={showAlert}
            />
            {/* New Download Modals */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Siparişleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => exportDetailedPdf(false)} startIcon={<IconFile />}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" onClick={() => exportAllExcel(false)} startIcon={<IconFileSpreadsheet />}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Siparişleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => exportDetailedPdf(true)} startIcon={<IconFile />}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" onClick={() => exportAllExcel(true)} startIcon={<IconFileSpreadsheet />}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={openDownloadSingleModal} onClose={() => setOpenDownloadSingleModal(false)} maxWidth="xs">
                <DialogTitle>Sipariş Raporu </DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                                if (selectedOrderForMenu) {
                                    exportToPdf(selectedOrderForMenu);
                                }
                                setOpenDownloadSingleModal(false);
                                handleCloseMenu();
                            }}
                            startIcon={<IconFile />}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                                if (selectedOrderForMenu) {
                                    exportToExcel(selectedOrderForMenu);
                                }
                                setOpenDownloadSingleModal(false);
                                handleCloseMenu();
                            }}
                            startIcon={<IconFileSpreadsheet />}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadSingleModal(false)} color="secondary">Kapat</Button>
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

export default ExcelImportComponent;