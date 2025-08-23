import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
    IconUpload, IconFileSpreadsheet, IconSearch, IconDots, IconEye, IconEdit, IconTrash,
    IconCheck, IconX, IconFile,
    IconDownload, IconListDetails
} from '@tabler/icons-react';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
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
interface OrderType { id: number; network: { id: string; title: string; }; docDate: string; status: number; orderDetails: OrderDetailType[]; }
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
type SortableOrderKeys = 'network.title' | 'docDate' | 'status';

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

const ExcelImportComponent = () => {
    const navigate = useNavigate();
    const [network, setNetwork] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
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
    const [orderBy, setOrderBy] = useState<SortableOrderKeys>('docDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderForMenu, setSelectedOrderForMenu] = useState<OrderType | null>(null);
    const openMenu = Boolean(anchorEl);
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


    const { isTooltipGloballyEnabled } = useTooltip();

    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState<1 | 2 | null>(null);
    const [description, setDescription] = useState('');
    const [statusError, setStatusError] = useState(false);
    const [idRow, setIdRow] = useState(0);

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

    const exportToExcel = (orderData: OrderType) => {
        // 1. ساخت ورک‌بوک و ورک‌شیت جدید
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet([]);

        // 2. تنظیم هدرهای ثابت (Şebeke و Tarih)
        XLSX.utils.sheet_add_aoa(worksheet, [['Şebeke', orderData.network.title]], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['Tarih', formatDateDisplay(orderData.docDate)]], { origin: 'C1' });

        // 3. تنظیم هدرهای جدول اصلی
        const tableHeaders = ['Ürün', 'ÖLÇÜ', 'Miktar', 'Açıklama', 'Fiyat'];
        XLSX.utils.sheet_add_aoa(worksheet, [tableHeaders], { origin: 'A3' });

        // 4. اضافه کردن داده‌های آیتم‌های سفارش
        const tableData = orderData.orderDetails.map(detail => [
            detail.item.name,
            detail.item.unit.title,
            detail.quantity,
            stripHtml(detail.description),
            '' // فیلد خالی برای قیمت
        ]);
        XLSX.utils.sheet_add_aoa(worksheet, tableData, { origin: 'A4' });

        // 5. اضافه کردن ورک‌شیت به ورک‌بوک و دانلود
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sipariş Detayları');
        XLSX.writeFile(workbook, `Sipariş_${orderData.id}_Detayları.xlsx`);
    };

    const exportToPdf = (orderData: OrderType) => {
        // ایجاد یک کانتینر موقت
        const pdfContainer = document.createElement('div');
        pdfContainer.style.width = '100%';
        pdfContainer.style.padding = '20px';
        pdfContainer.style.backgroundColor = 'white';

        // افزودن عنوان و اطلاعات سفارش به کانتینر
        const title = document.createElement('h3');
        title.innerText = `Sipariş #${orderData.id} Detayları`;
        pdfContainer.appendChild(title);

        const info = document.createElement('p');
        info.innerHTML = `<strong>Şebeke:</strong> ${orderData.network.title}<br><strong>Tarih:</strong> ${formatDateDisplay(orderData.docDate)}`;
        pdfContainer.appendChild(info);

        // ساخت جدول HTML از داده‌های سفارش
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
        <thead>
            <tr>
                <th style="border: 1px solid black; padding: 8px;">Ürün Adı</th>
                <th style="border: 1px solid black; padding: 8px;">Miktar</th>
                <th style="border: 1px solid black; padding: 8px;">Birim</th>
                <th style="border: 1px solid black; padding: 8px;">Açıklama</th>
                <th style="border: 1px solid black; padding: 8px;">Fiyat</th>
            </tr>
        </thead>
        <tbody>
            ${orderData.orderDetails.map(detail => `
                <tr>
                    <td style="border: 1px solid black; padding: 8px;">${detail.item.name}</td>
                    <td style="border: 1px solid black; padding: 8px;">${detail.quantity}</td>
                    <td style="border: 1px solid black; padding: 8px;">${detail.item.unit.title}</td>
                    <td style="border: 1px solid black; padding: 8px;">${stripHtml(detail.description)}</td>
                    <td style="border: 1px solid black; padding: 8px;"></td>
                </tr>
            `).join('')}
        </tbody>
    `;
        pdfContainer.appendChild(table);

        // افزودن کانتینر به بدنه صفحه به صورت موقت
        document.body.appendChild(pdfContainer);

        // گرفتن اسکرین‌شات از کانتینر و تبدیل به PDF
        html2canvas(pdfContainer).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Sipariş_${orderData.id}_Detayları.pdf`);

            // حذف کانتینر موقت
            document.body.removeChild(pdfContainer);
        });
    };

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

    useEffect(() => { getNetworks(); getListItem(); getListOrders(); fetchTenders() }, []);

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
    const resetForm = () => { setNetwork(''); setDocDate(new Date()); setOrderItems([]); setSelectedWork(null); setNetworkError(false); setDocDateError(false); setOrderItemsError(false); setFile(null); };

    const handleSaveOrder = async () => {
        debugger
        if (!validateForm()) return;
        const orderData = {
            docDate: docDate?.toISOString(),
            networkId: network == "" ? null : Number(network),
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
            networkId: network == "" ? null : Number(network),
            orderDetails: orderItems.map(item => ({
                itemId: Number(item.item),
                quantity: parseFloat(String(item.quantity)),
                price: String(item.price) == "" || item.price == undefined ? "0.00" : parseFloat(String(item.price)).toFixed(2),
                description: item.description
            }))
        };
        debugger
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
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Sipariş güncellenirken bir hata oluştu.', 'error'); }
        }
    };

    const formatDateDisplay = (dateString: string | null): string => { if (!dateString) return "N/A"; try { const date = new Date(dateString); return format(date, 'dd MMMM yyyy', { locale: tr }); } catch (e) { console.log("Tarih biçimlendirilirken hata oluştu:", e); return "Geçersiz Tarih"; } };
    const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'pending' | 'approved' | 'rejected' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } };
    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); setPage(0); };
    const handleRequestSort = (property: 'network.title' | 'docDate' | 'status') => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); };
    const handleOpenModal = (details: OrderDetailType[]) => { setModalDetails(details); setOpenModal(true); };
    const handleCloseModal = () => { setOpenModal(false); };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: OrderType) => { setAnchorEl(event.currentTarget); setSelectedOrderForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedOrderForMenu(null); };
    // const handleAction = async (action: 'approve' | 'reject' | 'edit' | 'delete') => { alert(`Sipariş #${selectedOrderForMenu?.id} için "${action}" işlemi yapıldı.`); handleCloseMenu(); };

    const onDeleteSuccess = () => { getListOrders(); };

    const handleClickOpenDeleteModal = (id: number, title: string) => { setOrderIdToDelete(id); setOrderTitleToDelete(title); setOpenDeleteModal(true); handleCloseMenu(); };
    const handleClickCloseDeleteModal = () => { setOpenDeleteModal(false); setOrderIdToDelete(null); setOrderTitleToDelete(''); };
    const stripHtml = (htmlString: string): string => { const doc = new DOMParser().parseFromString(htmlString, 'text/html'); return doc.body.textContent || ""; };


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

        setDocDate(new Date(row.docDate));
        const itemsToEdit: OrderItem[] = row.orderDetails.map(detail => {
            const fullItem = itemsList.find(item => item.id === detail.item.id);
            const priceValue = detail.price !== null && !isNaN(Number(detail.price)) ? Number(detail.price) : 0;

            return {
                id: detail.id,
                item: fullItem ? fullItem.id : '',
                quantity: detail.quantity,
                description: detail.description,
                isEditing: false, // ✅ این باید true باشد تا امکان ویرایش فراهم شود
                unit: fullItem ? fullItem.unit : undefined,
                isRegistered: true,
                price: priceValue
            };
        });
        setOrderItems(itemsToEdit);
        handleCloseMenu();
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
        debugger
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
        debugger
        return orderItems.some(item => !item.isRegistered);
    }, [orderItems]);

    const filteredOrders = ordersList.filter(order => {
        // ابتدا بررسی کنید که network وجود داشته باشد.
        const networkTitle = order.network ? order.network.title : '';
        const matchesSearch = networkTitle.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'pending' && order.status === 0) ||
            (statusFilter === 'approved' && order.status === 1) ||
            (statusFilter === 'rejected' && order.status === 2);

        return matchesSearch && matchesStatus;
    });
    const sortedAndFilteredOrders = stableSort(filteredOrders, getComparator(order, orderBy));
    const paginatedOrders = sortedAndFilteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                </Stack>
            )}
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" mb={2}>Sipariş Detayları</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <CustomFormLabel htmlFor="network-autocomplete" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }}>
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
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <CustomFormLabel htmlFor="doc-date" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
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
                            sx={{ flexGrow: 1 }} // ✅ از flexGrow به جای fullWidth استفاده کنید
                        >
                            Dosya Seç
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
                            sx={{ flexGrow: 1 }} // ✅ از flexGrow به جای fullWidth استفاده کنید
                        >
                            Şablonu İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleOpenSelectTenderModal}
                            startIcon={<IconListDetails />}
                            sx={{ flexGrow: 1 }} // ✅ از flexGrow به جای fullWidth استفاده کنید
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
                    {/* منطق شرطی برای نمایش دکمه‌ها بر اساس وضعیت ویرایش */}
                    {editingId ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {/* دکمه "Düzenle" برای ویرایش سفارش */}
                            <Button
                                variant="contained"
                                color="info"
                                onClick={handleUpdateOrder} // ✅ تابعی برای به روز رسانی سفارش
                            >
                                Düzenle
                            </Button>
                            {/* دکمه "İptal Et" برای لغو ویرایش */}
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={resetForm} // ✅ از تابع resetForm برای لغو استفاده کنید
                            >
                                İptal Et
                            </Button>
                        </Stack>
                    ) : (
                        < Button
                            variant="contained"
                            color="primary"
                            onClick={handleSaveOrder}
                            disabled={hasUnregisteredItems || orderItems.length === 0}
                        >
                            Siparişi Kaydet
                        </Button>
                    )}
                </Box>
            </Paper >

            <Box sx={{ p: 2 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Sipariş Listesi</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            label="Sipariş Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
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
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'network.title'} direction={orderBy === 'network.title' ? order : 'asc'} onClick={() => handleRequestSort('network.title')}>
                                    <Typography variant="h6">Şebeke Adı</Typography>
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>
                                <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
                                    <Typography variant="h6">Tarih</Typography>
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
                            <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
                        ) : (
                            paginatedOrders.length > 0 ? (
                                paginatedOrders.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell><Typography variant="h6">{row.network ? row.network.title : "-"}</Typography></TableCell>
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
                                            <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.orderDetails)}>
                                                Görünüm
                                            </Button>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined}
                                                aria-haspopup="true" aria-expanded={openMenu && selectedOrderForMenu?.id === row.id ? 'true' : undefined}
                                                onClick={(event) => handleClickMenu(event, row)}>
                                                <IconDots size={20} />
                                            </IconButton>

                                            <Menu
                                                id="basic-menu"
                                                anchorEl={anchorEl}
                                                open={openMenu && selectedOrderForMenu?.id === row.id}
                                                onClose={handleCloseMenu}
                                                MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}
                                            >
                                                {/* Menü öğeleri, sipariş durumu 0 için */}
                                                {selectedOrderForMenu?.status === 0 && (
                                                    <>
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi onaylayın" : ""}>
                                                            <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                <ListItemIcon><IconCheck size={18} /></ListItemIcon>
                                                                Onayla
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi reddedin" : ""}>
                                                            <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                <ListItemIcon><IconX size={18} /></ListItemIcon>
                                                                Reddet
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    </>
                                                )}

                                                {/* Menü öğesi, sipariş durumu 1 için */}
                                                {selectedOrderForMenu?.status === 1 && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi reddedin" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                            <ListItemIcon><IconX size={18} /></ListItemIcon>
                                                            Reddet
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}

                                                {/* Menü öğesi, sipariş durumu 2 için */}
                                                {selectedOrderForMenu?.status === 2 && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi onaylayın" : ""}>
                                                        <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                            <ListItemIcon><IconCheck size={18} /></ListItemIcon>
                                                            Onayla
                                                        </MenuItem>
                                                    </CustomTooltip>
                                                )}

                                                {/* Düzenleme öğesi */}
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi düzenleyin" : ""}>
                                                    <MenuItem onClick={() => handleEditClick(row)}>
                                                        <ListItemIcon><IconEdit size={18} /></ListItemIcon>
                                                        Düzenle
                                                    </MenuItem>
                                                </CustomTooltip>

                                                {/* Silme öğesi */}
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi silin" : ""}>
                                                    <MenuItem onClick={() => handleClickOpenDeleteModal(row.id, row.network.title)}>
                                                        <ListItemIcon><IconTrash size={18} /></ListItemIcon>
                                                        Silmek
                                                    </MenuItem>
                                                </CustomTooltip>

                                                {/* Excel İndir öğesi */}
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Sipariş bilgilerini Excel formatında indirin" : ""}>
                                                    <MenuItem onClick={() => {
                                                        if (selectedOrderForMenu) {
                                                            exportToExcel(selectedOrderForMenu);
                                                            handleCloseMenu();
                                                        }
                                                    }}>
                                                        <ListItemIcon><IconFileSpreadsheet size={18} /></ListItemIcon> Excel İndir
                                                    </MenuItem>
                                                </CustomTooltip>

                                                {/* PDF İndir öğesi */}
                                                <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Sipariş bilgilerini PDF formatında indirin" : ""}>
                                                    <MenuItem onClick={() => {
                                                        if (selectedOrderForMenu) {
                                                            exportToPdf(selectedOrderForMenu);
                                                            handleCloseMenu();
                                                        }
                                                    }}>
                                                        <ListItemIcon><IconFile size={18} /></ListItemIcon> PDF İndir
                                                    </MenuItem>
                                                </CustomTooltip>
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç sipariş bulunamadı.</Typography></TableCell></TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredOrders.length}
                rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
            />

            {/* Modals */}
            <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
                <DialogTitle>Ürün Detayları</DialogTitle>
                <DialogContent dividers>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ürün Adı</TableCell>
                                    <TableCell>Miktar</TableCell>
                                    <TableCell>Birim</TableCell>
                                    <TableCell>Açıklama</TableCell>
                                    <TableCell>Fiyat</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {modalDetails.map((detail, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{detail.item.name}</TableCell>
                                        <TableCell>{detail.quantity}</TableCell>
                                        <TableCell>{detail.item.unit.title}</TableCell>
                                        <TableCell> <Typography>{stripHtml(detail.description)}</Typography></TableCell>
                                        <TableCell>{cleanAndFormatPrice(detail.price)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
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

        </Box >
    );
};

export default ExcelImportComponent;