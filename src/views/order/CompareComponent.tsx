// import React, { useEffect, useState, useCallback, useMemo } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//     TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
//     Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
//     Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
//     ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
//     DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete
// } from '@mui/material';
// import { keyframes, styled } from '@mui/material/styles';
// import { IconDots, IconEye, IconEdit, IconTrash, IconSearch, IconCheck, IconX, IconExchange, IconFile, IconFileSpreadsheet, IconFileDownload } from '@tabler/icons-react';
// import { format } from 'date-fns';
// import { tr } from 'date-fns/locale';
// import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
// import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
// import HighlightOffIcon from '@mui/icons-material/HighlightOff';
// import axios from 'axios';
// import server from '../../assets/address.json';
// import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
// import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import OrderItemsTable from './OrderItemsTable';
// import DeleteOrderModal from './DeleteOrderModal';
// import { useAuth } from 'src/context/AuthContext';
// import jsPDF from 'jspdf';
// import { autoTable } from 'jspdf-autotable';
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import Logo from 'src/assets/images/logos/logo.png';
// import * as XLSX from 'xlsx';
// import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';
// import BlankCard from 'src/components/shared/BlankCard';


// const blinkAnimation = keyframes`
//     0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
//     50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
//     100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
// `;
// const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
//     animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
//     transition: 'transform 0.3s ease-in-out',
// }));


// // Type Definitions
// interface Work { id: string; title: string; startDate: string; endDate: string; createAt: string; recordStatus: number; }
// interface Network { id: string; createAt: string; recordStatus: number; title: string; description: string; work: Work; }
// interface UnitType { id: string; title: string; recordStatus: number; createAt: string; }
// interface ItemType { id: string; name: string; description: string; abbreviation: string; recordStatus: number; weight: number | null; createAt: string; unit: UnitType; status: string; }
// interface OrderItem {
//     id: number;
//     item: string;
//     quantity: number;
//     description: string;
//     isEditing: boolean;
//     unit?: UnitType;
//     isRegistered?: boolean;
//     price: number;
//     statusColor?: 'green' | 'red';
// }
// interface OrderType { id: number; network: { id: string; title: string; }; docDate: string; status: number; orderDetails: OrderDetailType[]; }
// interface OrderDetailType {
//     id: number;
//     item: { id: string; name: string; unit: { title: string; }; };
//     quantity: number;
//     description: string;
//     price: number
// }
// interface WarehouseType { id: string; name: string; code: number; recordStatus: number; createAt: string; }
// interface TenderType { id: string; title: string; recordStatus: number; createAt: string; }

// // Table Style and Functions
// // type SortableOrderKeys = 'network.title' | 'docDate' | 'status';
// type SortableOrderKeys = 'network.title' | 'docDate' | 'status' | 'createAt';

// const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
//     '&.Mui-selected': {
//         color: 'white',
//         ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
//         ...(value === 'pending' && selected && { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } }),
//         ...(value === 'approved' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
//         ...(value === 'rejected' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
//     },
//     '&:not(.Mui-selected)': {
//         color: theme.palette.text.primary,
//         borderColor: theme.palette.divider,
//         '&:hover': { backgroundColor: theme.palette.action.hover },
//     },
// }));

// const descendingComparator = <T, Key extends string>(a: T, b: T, orderBy: Key): number => {
//     const getNestedValue = (obj: any, path: string): any => path.split('.').reduce((acc, part) => acc && acc[part], obj);
//     const valA = getNestedValue(a, orderBy);
//     const valB = getNestedValue(b, orderBy);

//     if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
//     if (valA === undefined || valA === null) return 1;

//     if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
//     if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;

//     return 0;
// };

// const getComparator = (order: 'asc' | 'desc', orderBy: SortableOrderKeys): (a: OrderType, b: OrderType) => number => {
//     return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
// };

// const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
//     const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
//     stabilizedThis.sort((a, b) => {
//         const order = comparator(a[0], b[0]);
//         if (order !== 0) return order;
//         return a[1] - b[1];
//     });
//     return stabilizedThis.map((el) => el[0]);
// };

// const CompareComponent = () => {
//     const navigate = useNavigate();

//     // States from previous form
//     const [network, setNetwork] = useState('');
//     const [docDate, setDocDate] = useState<Date | null>(new Date());
//     const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
//     const [itemsList, setItemsList] = useState<ItemType[]>([]);
//     const [networks, setNetworks] = useState<Network[]>([]);
//     const [selectedWork, setSelectedWork] = useState<Work | null>(null);
//     const [loadingData, setLoadingData] = useState<boolean>(true);
//     const [alertMessage, setAlertMessage] = useState<string | null>(null);
//     const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
//     const [networkError, setNetworkError] = useState(false);
//     const [docDateError, setDocDateError] = useState(false);
//     const [orderItemsError, setOrderItemsError] = useState(false);

//     // States for comparison form
//     const [warehouse, setWarehouse] = useState<WarehouseType | null>(null);
//     const [tender, setTender] = useState<TenderType | null>(null);
//     const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
//     const [tendersList, setTendersList] = useState<TenderType[]>([]);
//     const [warehouseError, setWarehouseError] = useState(false);
//     const [tenderError, setTenderError] = useState(false);
//     // const [warehouseItems, setWarehouseItems] = useState<any[]>([]);
//     const [tenderItems, setTenderItems] = useState<any[]>([]);
//     const [comparisonResults, setComparisonResults] = useState<OrderItem[]>([]);
//     const [openComparisonModal, setOpenComparisonModal] = useState(false);
//     const [isComparing, setIsComparing] = useState(false); // ✅ Added state for loading indicator

//     // Table States
//     const [ordersList, setOrdersList] = useState<OrderType[]>([]);
//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(5);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
//     const [orderBy, setOrderBy] = useState<SortableOrderKeys>('createAt');
//     const [order, setOrder] = useState<'asc' | 'desc'>('desc');
//     const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//     const [selectedOrderForMenu, setSelectedOrderForMenu] = useState<OrderType | null>(null);
//     const openMenu = Boolean(anchorEl);
//     const [openModal, setOpenModal] = useState(false);
//     const [modalDetails, setModalDetails] = useState<OrderDetailType[]>([]);
//     const [openDeleteModal, setOpenDeleteModal] = useState(false);
//     const [orderIdToDelete, setOrderIdToDelete] = useState<number | null>(null);
//     const [orderTitleToDelete, setOrderTitleToDelete] = useState<string>('');
//     const [editingId, setEditingId] = useState<number | null>(null);

//     const { isTooltipGloballyEnabled } = useTooltip();
//     const [openStatusModal, setOpenStatusModal] = useState(false);
//     const [statusToUpdate, setStatusToUpdate] = useState<1 | 2 | null>(null);
//     const [description, setDescription] = useState('');
//     const [statusError, setStatusError] = useState(false);
//     const [idRow, setIdRow] = useState(0);


//     const [isFormVisible, setIsFormVisible] = useState(false);
//     const [isBlinking, setIsBlinking] = useState(true);
//     const [isFilterActive, setIsFilterActive] = useState(false);

//     const [startDate, setStartDate] = useState<Date | null>(null);
//     const [endDate, setEndDate] = useState<Date | null>(null);

//     const { allowedOperations } = useAuth();
//     const hasCreatePermission = useMemo(() => {
//         return allowedOperations.some(op => op.systemOperationName === 'Eklemek');
//     }, [allowedOperations]);

//     const hasEditPermission = useMemo(() => {
//         return allowedOperations.some(op => op.systemOperationName === 'Düzenlemek');
//     }, [allowedOperations]);

//     const hasDeletePermission = useMemo(() => {
//         return allowedOperations.some(op => op.systemOperationName === 'Silmek');
//     }, [allowedOperations]);

//     const hasDownloadPermission = useMemo(() => {
//         return allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak');
//     }, [allowedOperations]);

//     const hasStatusPermission = useMemo(() => {
//         return allowedOperations.some(op => op.systemOperationName === 'Onaylamak');
//     }, [allowedOperations]);

//     const formatDateDisplay = (dateString: string | null): string => {
//         if (!dateString) return "N/A";
//         try {
//             const date = new Date(dateString);
//             return format(date, 'dd MMMM yyyy', { locale: tr });
//         } catch (e) {
//             console.log("Tarih biçimlendirilirken hata oluştu:", e);
//             return "Geçersiz Tarih";
//         }
//     };

//     const handleItemChange = (id: number, field: string, value: any) => {
//         const itemToUpdate = orderItems.find(item => item.id === id);
//         if (!itemToUpdate) return;
//         const updatedItem = { ...itemToUpdate };
//         if (field === 'item') {
//             const selectedItem = itemsList.find(i => i.id === value);
//             updatedItem.item = value;
//             updatedItem.unit = selectedItem?.unit;
//             updatedItem.isRegistered = !!selectedItem;
//         } else if (field === 'quantity') {
//             const numericValue = parseFloat(value);
//             updatedItem.quantity = isNaN(numericValue) ? 0 : numericValue;
//         } else if (field === 'price') {
//             const numericValue = parseFloat(value);
//             updatedItem.price = isNaN(numericValue) ? 0 : numericValue;
//         } else {
//             (updatedItem as any)[field] = value;
//         }
//         const updatedOrderItems = orderItems.map(item =>
//             item.id === id ? updatedItem : item
//         );
//         setOrderItems(updatedOrderItems);
//     };

//     const selectedItemIds = useMemo(() => orderItems.filter(item => !item.isEditing).map(item => item.item), [orderItems]);
//     const availableItemsList = useMemo(() => itemsList.filter(item => !selectedItemIds.includes(item.id)), [itemsList, selectedItemIds]);

//     const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
//         setAlertMessage(message);
//         setAlertSeverity(severity);
//     };
//     const clearAlert = () => { setAlertMessage(null); };

//     useEffect(() => {
//         let timer: NodeJS.Timeout;
//         if (alertMessage) { timer = setTimeout(() => { clearAlert(); }, 5000); }
//         return () => { clearTimeout(timer); };
//     }, [alertMessage]);

//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setIsBlinking(false);
//         }, 5000);
//         return () => {
//             clearTimeout(timer);
//         };
//     }, []);

//     const getNetworks = async () => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const result = await axios.request({ baseURL: server.baseurl + server.initialoperations + "get-networks", method: "get", headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
//             if (result.data.httpStatusCode === 200 && result.data.data) {
//                 const activeNetworks = result.data.data.filter((net: Network) => net.recordStatus === 0);
//                 setNetworks(activeNetworks);
//             } else {
//                 showAlert(result.data.message || 'Şebeke listesi alınamadı.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
//             else { showAlert('Şebeke listesi alınırken bir hata oluştu.', 'error'); }
//         }
//     };

//     const getListItem = async () => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.get(server.baseurl + server.baseinfo + "get-item", { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
//             if (response.data && response.data.success) {
//                 const activeItems = response.data.data.filter((item: ItemType) => item.recordStatus === 0);
//                 setItemsList(activeItems);
//             } else {
//                 showAlert('Ürünler yüklenmedi.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
//             else { showAlert('Ürünler sunucudan alınamadı', 'error'); }
//         }
//     };

//     const fetchWarehouses = useCallback(async () => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
//                 headers: { "Authorization": `Bearer ${authToken}` }
//             });
//             if (response.data.httpStatusCode === 200) {
//                 const activeWarehouses = response.data.data.filter((wh: WarehouseType) => wh.recordStatus === 0);
//                 setWarehousesList(activeWarehouses);
//             } else {
//                 showAlert(response.data.message || 'Depo listesi alınamadı.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
//             else { showAlert('Depo listesi yüklenirken bir hata oluştu.', 'error'); }
//         }
//     }, [navigate]);

//     const fetchTenders = useCallback(async () => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.get(server.baseurl + server.initialoperations + "get-tenders", {
//                 headers: { "Authorization": `Bearer ${authToken}` }
//             });
//             if (response.data.httpStatusCode === 200) {
//                 const activeTenders = response.data.data.filter((tender: TenderType) => tender.recordStatus === 0);
//                 setTendersList(activeTenders);
//             } else {
//                 showAlert(response.data.message || 'İhale listesi alınamadı.', 'error');
//             }
//         } catch (e: any) {
//             if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
//             else { showAlert('İhale listesi yüklenirken bir hata oluştu.', 'error'); }
//         }
//     }, [navigate]);

//     const getListOrders = async () => {
//         setLoadingData(true);
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); setLoadingData(false); return; }
//         try {
//             const response = await axios.get(server.baseurl + server.initialoperations + "get-orders", { headers: { "Authorization": `Bearer ${authToken}` } });
//             if (response.data.httpStatusCode === 200) {
//                 setOrdersList(response.data.data as OrderType[]);
//             } else { showAlert(response.data.message || 'Siparişler yüklenirken bir hata oluştu.', 'error'); }
//         } catch (e: any) {
//             showAlert('Siparişler yüklenirken bir hata oluştu.', 'error');
//         } finally { setLoadingData(false); }
//     };

//     const fetchTenderItems = async (tenderId: string) => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) {
//             showAlert('Oturumunuzun süresi doldu veya yetkiniz yok.', 'error');
//             return [];
//         }
//         try {
//             const response = await axios.get(`${server.baseurl + server.initialoperations}get-tender-by-id/${tenderId}`, {
//                 headers: { 'Authorization': `Bearer ${authToken}` }
//             });
//             if (response.data.httpStatusCode === 200 && response.data.data) {
//                 const allTenderDetails = response.data.data.tenderCategories.flatMap((category: any) => category.tenderDetails);

//                 // ✅ اضافه کردن منطق گروه‌بندی و جمع مقادیر
//                 const tenderItemsMap = new Map<string, any>();
//                 allTenderDetails.forEach((detail: any) => {
//                     const itemId = String(detail.item.id);
//                     if (tenderItemsMap.has(itemId)) {
//                         // اگر آیتم قبلاً وجود داشت، مقدار جدید را به مقدار فعلی اضافه کن
//                         const existingItem = tenderItemsMap.get(itemId);
//                         existingItem.quantity += Number(detail.ourProcuredItemQuantities);
//                     } else {
//                         // اگر آیتم جدید بود، آن را به Map اضافه کن
//                         tenderItemsMap.set(itemId, {
//                             id: detail.id,
//                             itemId: itemId,
//                             name: detail.item.name,
//                             quantity: Number(detail.ourProcuredItemQuantities),
//                             unit: detail.item.unit,
//                         });
//                     }
//                 });

//                 const parsedItems = Array.from(tenderItemsMap.values());
//                 return parsedItems;
//             } else {
//                 showAlert('İhale ürünleri yüklenirken bir hata oluştu.', 'error');
//                 return [];
//             }
//         } catch (e: any) {
//             showAlert('İhale ürünleri yüklenirken bir hata oluştu.', 'error');
//             return [];
//         }
//     };

//     const fetchWarehouseItems = async (warehouseId: string) => {
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { showAlert('Oturumunuzun süresi doldu veya yetkiniz yok.', 'error'); return []; }
//         try {
//             const response = await axios.get(`${server.baseurl + server.warehouse}get-warehouse-all-items-balance/${warehouseId}`, {
//                 headers: { 'Authorization': `Bearer ${authToken}` }
//             });
//             if (response.data.httpStatusCode === 200 && response.data.data) {
//                 return response.data.data;
//             } else {
//                 showAlert('Depo ürünleri yüklenirken bir hata oluştu.', 'error');
//                 return [];
//             }
//         } catch (e: any) {
//             showAlert('Depo ürünleri yüklenirken bir hata oluştu.', 'error');
//             return [];
//         }
//     };

//     // کد فعلی شما
//     useEffect(() => {
//         getNetworks();
//         getListItem();
//         fetchWarehouses();
//         fetchTenders();
//         getListOrders();
//     }, [fetchWarehouses, fetchTenders]);

//     // ✅ کد پیشنهادی: وابستگی‌های غیرضروری را حذف کنید و مطمئن شوید که خطاها باعث توقف اجرای برنامه نمی‌شوند.
//     useEffect(() => {
//         // فراخوانی توابع اصلی بارگیری داده‌ها
//         const loadInitialData = async () => {
//             await getNetworks();
//             await getListItem();
//             await fetchWarehouses();
//             await fetchTenders();
//             await getListOrders();
//         };

//         loadInitialData();
//     }, []);


//     useEffect(() => {
//         const hasSearch = searchTerm.trim() !== '';
//         const hasStatusFilter = statusFilter !== 'all';
//         const hasDateFilter = startDate !== null || endDate !== null;
//         setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
//     }, [searchTerm, statusFilter, startDate, endDate]);

//     // ✅ Reset function for comparison states
//     const resetComparisonStates = () => {
//         // setWarehouseItems([]);
//         setTenderItems([]);
//         setComparisonResults([]);
//         setOpenComparisonModal(false);
//     };


//     const handleCompare = async () => {
//         if (!warehouse) setWarehouseError(true); else setWarehouseError(false);
//         if (!tender) setTenderError(true); else setTenderError(false);

//         if (!warehouse || !tender) {
//             showAlert('Lütfen hem depo hem de ihale seçin.', 'warning');
//             return;
//         }

//         setIsComparing(true);
//         // ✅ Sequential API calls with await
//         const tenderData = await fetchTenderItems(tender.id);
//         const warehouseData = await fetchWarehouseItems(warehouse.id);
//         setIsComparing(false);

//         if (!tenderData || !warehouseData) return;

//         setTenderItems(tenderData);
//         // setWarehouseItems(warehouseData);

//         const results: OrderItem[] = tenderData.map((tenderItem: any) => {
//             const matchingWarehouseItem = warehouseData.find((whItem: any) => whItem.itemId === tenderItem.itemId);
//             const itemFromList = itemsList.find(i => String(i.id) === tenderItem.itemId);

//             return {
//                 id: Date.now() + Math.random(),
//                 item: itemFromList ? itemFromList.id : tenderItem.itemId,
//                 quantity: matchingWarehouseItem?.balance || 0,
//                 description: '',
//                 isEditing: false,
//                 isRegistered: !!itemFromList,
//                 unit: itemFromList?.unit || tenderItem.unit, // Use unit from item list or tender
//                 price: 0,
//                 statusColor: matchingWarehouseItem?.balance > 0 ? 'green' : 'red' // ✅ Check if balance is greater than 0
//             };
//         });

//         setComparisonResults(results);
//         setOpenComparisonModal(true);
//     };

//     const handleApplyComparison = () => {
//         // 1. Filter and calculate the needed quantity from comparisonResults
//         const neededItems = comparisonResults
//             .map(item => {
//                 const tenderItem = tenderItems.find(ti => ti.itemId === item.item);
//                 const tenderQuantity = tenderItem ? tenderItem.quantity : 0;

//                 const warehouseBalance = item.quantity; // This is the balance from the warehouse

//                 const neededQuantity = tenderQuantity - warehouseBalance;

//                 // 2. Only return the item if there is a deficit
//                 if (neededQuantity > 0) {
//                     return {
//                         ...item,
//                         quantity: neededQuantity, // Set quantity to the calculated needed amount
//                         isEditing: true // Ensure it's editable
//                     };
//                 }
//                 return null; // Return null if there is no deficit
//             })
//             .filter(item => item !== null) as OrderItem[]; // 3. Remove null items

//         if (neededItems.length === 0) {
//             showAlert('Seçilen ürünlerden herhangi birinde eksik miktar bulunamadı.', 'info');
//             resetComparisonStates();
//             return;
//         }

//         // 4. Set the main order items with the filtered list
//         setOrderItems(neededItems);
//         resetComparisonStates();
//         showAlert('İhtiyaç duyulan ürünler sipariş listesine başarıyla eklendi. Lütfen fiyat ve miktarı kontrol edin.', 'success');
//     };


//     const handleAddItem = () => {
//         setOrderItems(prevItems => [...prevItems, { id: Date.now(), item: '', quantity: 0, description: '', price: 0, isEditing: true }]);
//     };
//     const handleRemoveItem = (id: number) => { setOrderItems(prevItems => prevItems.filter(item => item.id !== id)); };
//     const handleToggleEdit = (id: number) => { setOrderItems(prevItems => prevItems.map(item => ({ ...item, isEditing: item.id === id ? !item.isEditing : item.isEditing }))); };
//     const validateForm = (): boolean => {
//         let isValid = true;
//         if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }
//         const hasEmptyItem = orderItems.some(item => !item.item || item.quantity <= 0);
//         if (orderItems.length === 0 || hasEmptyItem) { setOrderItemsError(true); isValid = false; } else { setOrderItemsError(false); }
//         if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
//         return isValid;
//     };
//     const resetForm = () => {
//         setNetwork(''); setDocDate(new Date()); setOrderItems([]);
//         setSelectedWork(null); setEditingId(null); setNetworkError(false); setDocDateError(false); setOrderItemsError(false);
//         setWarehouse(null); setTender(null); setWarehouseError(false); setTenderError(false);
//         setIsFormVisible(false);
//     };
//     const handleSaveOrder = async () => {
//         if (!validateForm()) return;
//         const orderData = {
//             docDate: docDate?.toISOString(),
//             networkId: network == "" ? null : Number(network),
//             status: 0,
//             orderDetails: orderItems.map(item => ({
//                 itemId: Number(item.item),
//                 quantity: parseFloat(String((item.quantity))),
//                 price: (item.price).toFixed(2),
//                 description: item.description
//             }))
//         };
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.post(server.baseurl + server.initialoperations + "create-order", orderData,
//                 { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } }
//             );
//             if (response.data.httpStatusCode === 201) {
//                 showAlert('Sipariş başarıyla kaydedildi!', 'success');
//                 resetForm();
//                 getListOrders();
//             } else { showAlert(response.data.message || 'Sipariş kaydedilirken bir hata oluştu.', 'error'); }
//         } catch (e: any) {
//             if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
//             else { showAlert('Sipariş kaydedilirken bir hata oluştu.', 'error'); }
//         }
//     };

//     const handleUpdateOrder = async () => {
//         if (!validateForm() || !editingId) return;
//         const orderData = {
//             id: Number(editingId),
//             docDate: docDate?.toISOString(),
//             networkId: network == "" ? null : Number(network),
//             orderDetails: orderItems.map(item => ({
//                 itemId: Number(item.item),
//                 quantity: parseFloat(String(item.quantity)),
//                 price: (item.price).toFixed(2),
//                 description: item.description
//             }))
//         };
//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) { navigate("/"); return; }
//         try {
//             const response = await axios.put(
//                 server.baseurl + server.initialoperations + "update-order", orderData,
//                 { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } }
//             );
//             if (response.data.httpStatusCode === 200) {
//                 showAlert('Sipariş başarıyla güncellendi!', 'success');
//                 resetForm();
//                 getListOrders();
//             } else { showAlert(response.data.message || 'Sipariş güncellenirken bir hata oluştu.', 'error'); }
//         } catch (e: any) {
//             if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
//             else { showAlert('Sipariş güncellenirken bir hata oluştu.', 'error'); }
//         }
//     };

//     const handleEditClick = (row: OrderType) => {
//         setEditingId(row.id);
//         if (row.network) {
//             const selectedNetwork = networks.find(net => net.title === row.network.title);
//             if (selectedNetwork) {
//                 setNetwork(selectedNetwork.id);
//                 setSelectedWork(selectedNetwork.work);
//             }
//         } else {
//             // ✅ در صورتی که network وجود ندارد، وضعیت‌ها را به حالت پیش‌فرض برگردانید یا مطابق نیاز مدیریت کنید
//             setNetwork('');
//             setSelectedWork(null);
//         }

//         setDocDate(new Date(row.docDate));
//         const itemsToEdit: OrderItem[] = row.orderDetails.map(detail => {
//             const fullItem = itemsList.find(item => item.id === detail.item.id);
//             const priceValue = detail.price !== null && !isNaN(Number(detail.price)) ? Number(detail.price) : 0;

//             return {

//                 id: detail.id,
//                 item: fullItem ? fullItem.id : '',
//                 quantity: detail.quantity,
//                 description: detail.description,
//                 price: priceValue,
//                 isEditing: false,
//                 unit: fullItem ? fullItem.unit : undefined,
//                 isRegistered: true,
//             };
//         });
//         setOrderItems(itemsToEdit);
//         handleCloseMenu();
//         setIsFormVisible(true);
//         clearAlert();
//     };

//     const handleStatusFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'pending' | 'approved' | 'rejected' | null) => {
//         if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); }
//     };
//     const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
//     const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
//         setRowsPerPage(parseInt(event.target.value, 10)); setPage(0);
//     };
//     const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//         setSearchTerm(event.target.value); setPage(0);
//     };
//     const handleRequestSort = (property: SortableOrderKeys) => {
//         const isAsc = orderBy === property && order === 'asc';
//         setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
//     };
//     const handleOpenModal = (details: OrderDetailType[]) => { setModalDetails(details); setOpenModal(true); };
//     const handleCloseModal = () => { setOpenModal(false); };
//     const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: OrderType) => { setAnchorEl(event.currentTarget); setSelectedOrderForMenu(row); };
//     const handleCloseMenu = () => { setAnchorEl(null); setSelectedOrderForMenu(null); };
//     const handleClickOpenDeleteModal = (id: number, title: string) => { setOrderIdToDelete(id); setOrderTitleToDelete(title); setOpenDeleteModal(true); handleCloseMenu(); };
//     const handleClickCloseDeleteModal = () => { setOpenDeleteModal(false); setOrderIdToDelete(null); setOrderTitleToDelete(''); };
//     const stripHtml = (htmlString: string): string => {
//         const doc = new DOMParser().parseFromString(htmlString, 'text/html');
//         return doc.body.textContent || "";
//     };
//     const handleOpenRegisterModal = (_item: { name: string; unit: string; }) => { };

//     const handleClickOpenStatusModal = (id: number, action: 'approve' | 'reject') => {
//         setStatusToUpdate(action === 'approve' ? 1 : 2);
//         setIdRow(id)
//         setDescription('');
//         setOpenStatusModal(true);
//         handleCloseMenu();
//     };

//     const handleCloseStatusModal = () => {
//         setOpenStatusModal(false);
//         setStatusToUpdate(null);
//         setDescription('');
//         setStatusError(false);
//     };
//     const handleUpdateStatus = async () => {
//         if (!description.trim()) {
//             setStatusError(true);
//             showAlert('Lütfen bir açıklama giriniz.', 'warning');
//             return;
//         }

//         const authToken = localStorage.getItem('authToken');
//         if (!authToken) {
//             navigate("/");
//             return;
//         }
//         try {
//             const payload = {
//                 id: Number(idRow),
//                 status: statusToUpdate,
//                 description: description.trim()
//             };

//             const response = await axios.put(
//                 server.baseurl + server.initialoperations + "update-order-status",
//                 payload,
//                 { headers: { "Authorization": `Bearer ${authToken}` } }
//             );

//             if (response.data.httpStatusCode === 200) {
//                 showAlert('Sipariş durumu başarıyla güncellendi!', 'success');
//                 getListOrders();
//             } else {
//                 showAlert(response.data.message || 'Sipariş durumu güncellenirken bir hata oluştu.', 'error');
//             }

//         } catch (e: any) {
//             if (e.response?.status === 401) {
//                 localStorage.removeItem('authToken');
//                 navigate("/");
//                 showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error');
//             } else {
//                 showAlert('Sipariş durumu güncellenirken bir hata oluştu.', 'error');
//             }
//         } finally {
//             handleCloseStatusModal();
//             getListOrders();
//         }
//     };
//     const exportToExcel = (orderData: OrderType) => {
//         const workbook = XLSX.utils.book_new();
//         const worksheet = XLSX.utils.json_to_sheet([]);
//         const networkTitle = orderData.network ? orderData.network.title : '-';
//         XLSX.utils.sheet_add_aoa(worksheet, [['Şebeke', networkTitle]], { origin: 'A1' });

//         // XLSX.utils.sheet_add_aoa(worksheet, [['Şebeke', orderData.network.title]], { origin: 'A1' });
//         XLSX.utils.sheet_add_aoa(worksheet, [['Tarih', formatDateDisplay(orderData.docDate)]], { origin: 'C1' });
//         const tableHeaders = ['Ürün', 'ÖLÇÜ', 'Miktar', 'Açıklama', 'Fiyat'];
//         XLSX.utils.sheet_add_aoa(worksheet, [tableHeaders], { origin: 'A3' });
//         const tableData = orderData.orderDetails.map(detail => [
//             detail.item.name,
//             detail.item.unit.title,
//             detail.quantity,
//             stripHtml(detail.description),
//             ''
//         ]);
//         XLSX.utils.sheet_add_aoa(worksheet, tableData, { origin: 'A4' });
//         XLSX.utils.book_append_sheet(workbook, worksheet, 'Sipariş Detayları');
//         XLSX.writeFile(workbook, `Sipariş_${orderData.id}_Detayları.xlsx`);
//     };

//     const exportToPdf = (orderData: OrderType) => {
//         const doc = new jsPDF();
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();
//         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//         doc.setFont('NotoSans');
//         const header = () => {
//             doc.addImage(Logo, 'PNG', 10, 10, 50, 25);
//             doc.setFontSize(18);
//             doc.text(`Sipariş Detayları`, pageWidth - 15, 30, { align: 'right' });
//             doc.setFontSize(12);
//             doc.text(`Sipariş No: ${orderData.id}`, pageWidth - 15, 40, { align: 'right' });
//             // doc.text(`Şebeke: ${orderData.network.title || '-'}`, pageWidth - 15, 47, { align: 'right' });
//             const networkTitle = orderData.network ? orderData.network.title : '-';
//             doc.text(`Şebeke: ${networkTitle}`, pageWidth - 15, 47, { align: 'right' });

//             doc.text(`Tarih: ${formatDateDisplay(orderData.docDate)}`, pageWidth - 15, 54, { align: 'right' });
//         };
//         const footer = () => {
//             doc.setFontSize(10);
//             doc.setTextColor(0);
//             doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//             doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//             const docAny = doc as any;
//             const pageCount = docAny.internal.getNumberOfPages();
//             doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//         };
//         const rows = orderData.orderDetails.map(detail => [
//             detail.item.name || '-',
//             Number(detail.quantity).toFixed(2) || '-',
//             detail.item.unit.title || '-',
//             stripHtml(detail.description) || '-',
//             cleanAndFormatPrice(detail.price),
//         ]);
//         try {
//             autoTable(doc, {
//                 startY: 70,
//                 head: [['Ürün Adı', 'Miktar', 'Birim', 'Açıklama', 'Fiyat']],
//                 body: rows,
//                 theme: 'grid',
//                 styles: {
//                     font: 'NotoSans',
//                     fontStyle: 'normal',
//                     fontSize: 10,
//                     cellPadding: 2,
//                     overflow: 'linebreak'
//                 },
//                 headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//                 columnStyles: {
//                     0: { cellWidth: 50 },
//                     1: { cellWidth: 20 },
//                     2: { cellWidth: 20 },
//                     3: { cellWidth: 50 },
//                     4: { cellWidth: 'auto' },
//                 },
//                 didDrawPage: () => {
//                     header();
//                     footer();
//                 },
//                 showHead: 'everyPage',
//                 margin: { top: 50, bottom: 20 }
//             });
//             doc.save(`Sipariş_${orderData.id}_Detayları.pdf`);
//         } catch (error: any) {
//             console.error('PDF oluşturulurken hata:', error);
//             showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
//         }
//     };

//     const exportAllPdf = () => {
//         // از آرایه اصلی ordersList استفاده کنید، نه آرایه فیلترشده
//         if (ordersList.length === 0) {
//             showAlert('PDF oluşturulacak sipariş bulunamadı.', 'warning');
//             return;
//         }

//         const doc = new jsPDF();
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();

//         // افزودن فونت برای پشتیبانی از کاراکترهای ترکی
//         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//         doc.setFont('NotoSans');

//         // تابع کمکی برای ایجاد هدر (سربرگ)
//         const createHeader = (doc: jsPDF, orderData: OrderType) => {
//             doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
//             doc.setFontSize(18);
//             doc.text(`Sipariş Detayları`, pageWidth - 15, 30, { align: 'right' });
//             doc.setFontSize(12);
//             const networkTitle = orderData.network ? orderData.network.title : '-';
//             doc.text(`Şebeke: ${networkTitle}`, pageWidth - 15, 40, { align: 'right' });
//             doc.text(`Tarih: ${formatDateDisplay(orderData.docDate)}`, pageWidth - 15, 47, { align: 'right' });
//             doc.text(`Sipariş No: ${orderData.id}`, pageWidth - 15, 54, { align: 'right' });
//         };

//         // تابع کمکی برای ایجاد فوتر (پاورقی)
//         const createFooter = (doc: jsPDF) => {
//             doc.setFontSize(10);
//             doc.setTextColor(0);
//             doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//             doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//             const docAny = doc as any;
//             const pageCount = docAny.internal.getNumberOfPages();
//             doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//         };

//         try {
//             // حلقه بر روی هر سفارش در لیست اصلی
//             ordersList.forEach((order, index) => {
//                 // اگر اولین صفحه نیست، یک صفحه جدید اضافه کنید
//                 if (index > 0) {
//                     doc.addPage();
//                 }

//                 // آماده‌سازی داده‌های جدول برای این سفارش
//                 const rows = order.orderDetails.map(detail => [
//                     detail.item.name || '-',
//                     Number(detail.quantity).toFixed(2) || '-',
//                     detail.item.unit.title || '-',
//                     stripHtml(detail.description) || '-',
//                     cleanAndFormatPrice(detail.price),
//                 ]);

//                 // ساخت جدول
//                 autoTable(doc, {
//                     startY: 60, // مکان شروع جدول
//                     head: [['Ürün Adı', 'Miktar', 'Birim', 'Açıklama', 'Fiyat']],
//                     body: rows,
//                     theme: 'grid',
//                     styles: {
//                         font: 'NotoSans',
//                         fontStyle: 'normal',
//                         fontSize: 10,
//                         cellPadding: 2,
//                         overflow: 'linebreak'
//                     },
//                     headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//                     columnStyles: {
//                         0: { cellWidth: 50 },
//                         1: { cellWidth: 20 },
//                         2: { cellWidth: 20 },
//                         3: { cellWidth: 50 },
//                         4: { cellWidth: 'auto' },
//                     },
//                     didDrawPage: () => {
//                         createHeader(doc, order);
//                         createFooter(doc);
//                     },
//                     showHead: 'everyPage',
//                     margin: { top: 50, bottom: 20 }
//                 });
//             });

//             doc.save(`Tum_Siparislerin_Detaylari.pdf`);
//             showAlert('PDF başarıyla oluşturuldu.', 'success');
//         } catch (error: any) {
//             console.error('PDF oluşturulurken hata:', error);
//             showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
//         }
//     };


//     const exportAllFilteredToPdf = () => {
//         if (filteredOrders.length === 0) {
//             showAlert('PDF oluşturulacak filtrelenmiş sipariş bulunamadı.', 'warning');
//             return;
//         }

//         const doc = new jsPDF();
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();

//         // تنظیم فونت
//         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//         doc.setFont('NotoSans');

//         // تابع کمکی برای ایجاد هدر
//         const createHeader = (orderData: any) => {
//             doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
//             doc.setFontSize(18);
//             doc.text(`Sipariş Detayları`, pageWidth - 15, 30, { align: 'right' });
//             doc.setFontSize(12);
//             const networkTitle = orderData.network ? orderData.network.title : '-';
//             doc.text(`Şebeke: ${networkTitle}`, pageWidth - 15, 40, { align: 'right' });
//             doc.text(`Tarih: ${formatDateDisplay(orderData.docDate)}`, pageWidth - 15, 47, { align: 'right' });
//             doc.text(`Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : '-')} - ${formatDateDisplay(endDate ? endDate.toISOString() : '-')}`, pageWidth - 15, 54, { align: 'right' });
//             doc.text(`Sipariş No: ${orderData.id}`, pageWidth - 15, 61, { align: 'right' });
//         };

//         // تابع کمکی برای ایجاد فوتر
//         const createFooter = () => {
//             doc.setFontSize(10);
//             doc.setTextColor(0);
//             doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
//             doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
//             const docAny = doc as any;
//             const pageCount = docAny.internal.getNumberOfPages();
//             doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
//         };

//         try {
//             // حلقه بر روی هر سفارش فیلترشده
//             filteredOrders.forEach((order, index) => {
//                 // اگر اولین صفحه نیست، یک صفحه جدید اضافه کنید
//                 if (index > 0) {
//                     doc.addPage();
//                 }

//                 // آماده‌سازی داده‌های جدول برای این سفارش
//                 const rows = order.orderDetails.map(detail => [
//                     detail.item.name || '-',
//                     Number(detail.quantity).toFixed(2) || '-',
//                     detail.item.unit.title || '-',
//                     stripHtml(detail.description) || '-',
//                     cleanAndFormatPrice(detail.price),
//                 ]);

//                 // ساخت جدول
//                 autoTable(doc, {
//                     startY: 70,
//                     head: [['Ürün Adı', 'Miktar', 'Birim', 'Açıklama', 'Fiyat']],
//                     body: rows,
//                     theme: 'grid',
//                     styles: {
//                         font: 'NotoSans',
//                         fontStyle: 'normal',
//                         fontSize: 10,
//                         cellPadding: 2,
//                         overflow: 'linebreak'
//                     },
//                     headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
//                     columnStyles: {
//                         0: { cellWidth: 50 },
//                         1: { cellWidth: 20 },
//                         2: { cellWidth: 20 },
//                         3: { cellWidth: 50 },
//                         4: { cellWidth: 'auto' },
//                     },
//                     didDrawPage: () => {
//                         createHeader(order);
//                         createFooter();
//                     },
//                     showHead: 'everyPage',
//                     margin: { top: 60, bottom: 20 }
//                 });
//             });

//             doc.save(`Filtrelenmis_Siparis_Detaylari.pdf`);
//             showAlert('PDF başarıyla oluşturuldu.', 'success');

//         } catch (error) {
//             console.error('PDF oluşturulurken hata:', error);
//             showAlert('PDF oluşturulurken bir hata oluştu: ' + error, 'error');
//         }
//     };

//     const filteredOrders = ordersList.filter(order => {
//         // ابتدا بررسی کنید که network وجود داشته باشد.
//         const networkTitle = order.network ? order.network.title : '';
//         const matchesSearch = networkTitle.toLowerCase().includes(searchTerm.toLowerCase());

//         const matchesStatus =
//             statusFilter === 'all' ||
//             (statusFilter === 'pending' && order.status === 0) ||
//             (statusFilter === 'approved' && order.status === 1) ||
//             (statusFilter === 'rejected' && order.status === 2);

//         const docDate = new Date(order.docDate);
//         const isWithinDateRange =
//             (!startDate || docDate >= startDate) &&
//             (!endDate || docDate <= endDate);

//         return matchesSearch && matchesStatus && isWithinDateRange;
//     });


//     const sortedAndFilteredOrders = stableSort(filteredOrders, getComparator(order, orderBy));
//     const paginatedOrders = sortedAndFilteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

//     const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
//         if (priceInput === null || priceInput === undefined) {
//             return '₺0.00';
//         }
//         const cleanedString = String(priceInput).replace(/[$,]/g, '');
//         const numericValue = parseFloat(cleanedString);
//         if (isNaN(numericValue)) {
//             return '₺0.00';
//         }
//         const formattedPrice = numericValue.toLocaleString('en-US', {
//             style: 'currency',
//             currency: 'USD',
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2
//         });
//         return formattedPrice.replace('$', '₺');
//     };
//     const handleClearDateFilters = () => {
//         setStartDate(null);
//         setEndDate(null);
//     };
//     return (
//         <Box>
//             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
//                 <Stack
//                     direction={{ xs: 'column', sm: 'row' }}
//                     spacing={2}
//                     alignItems="stretch"
//                     flexGrow={1}
//                     justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
//                 >
//                     {!isFormVisible && hasCreatePermission && (
//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Satın Alma Belgesi kaydetmek için tıklayınız" : ""}>
//                             <BlinkingButton
//                                 variant="contained"
//                                 color="primary"
//                                 onClick={() => setIsFormVisible(true)}
//                                 isBlinking={isBlinking}
//                                 fullWidth={false} // در حالت موبایل بهتر است fullWidth نباشد
//                             >
//                                 Yeni Satın Alma Kaydet
//                             </BlinkingButton>
//                         </CustomTooltip>
//                     )}
//                     {isFormVisible && (
//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
//                             <Button
//                                 variant="contained"
//                                 color="error"
//                                 onClick={resetForm}
//                                 // disabled={loadingButton}
//                                 fullWidth={false}
//                                 startIcon={<IconX size={20} />}
//                             >
//                                 Gizle
//                             </Button>
//                         </CustomTooltip>
//                     )}
//                 </Stack>
//             </Stack>
//             {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
//                 <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
//                     <Typography variant="h6" mb={2}>Depo/İhale Karşılaştırması</Typography>

//                     <Grid container spacing={2}>
//                         <Grid item xs={12} md={8}>
//                             <CustomFormLabel htmlFor="network-autocomplete" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} >
//                                 Şebeke
//                             </CustomFormLabel>
//                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//                                 <Autocomplete<Network>
//                                     id="network-autocomplete" options={networks} getOptionLabel={(option) => option.title}
//                                     value={networks.find(net => net.id === network) || null}
//                                     onChange={(_event, newValue) => {
//                                         setNetwork(newValue ? newValue.id : ''); setSelectedWork(newValue ? newValue.work : null);
//                                         if (networkError && newValue) setNetworkError(false);
//                                     }} renderInput={(params) => (
//                                         <TextField {...params} label="Şebeke Seçin" variant="outlined" size="small" error={networkError} helperText={networkError ? "Bu alan zorunludur!" : ""}
//                                         />
//                                     )} sx={{ flexGrow: 1 }}
//                                 />
//                                 {selectedWork && (<Chip label={selectedWork.title} color="primary" variant="outlined" />)}
//                             </Box>
//                         </Grid>
//                         <Grid item xs={12} md={4}>
//                             <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                 <CustomFormLabel htmlFor="doc-date" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} required>
//                                     Tarihi
//                                 </CustomFormLabel>
//                                 <DatePicker
//                                     value={docDate}
//                                     onChange={(newValue) => {
//                                         setDocDate(newValue);
//                                         if (docDateError && newValue) setDocDateError(false);
//                                     }}
//                                     inputFormat="dd/MM/yyyy"
//                                     renderInput={(params) => (
//                                         <TextField {...params}
//                                             size="small" error={docDateError}
//                                             helperText={docDateError ? "Bu alan zorunludur!" : ""} />
//                                     )}
//                                 />
//                             </LocalizationProvider>
//                         </Grid>
//                     </Grid>

//                     <Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
//                         <Grid item xs={12} md={5}>
//                             <Autocomplete<WarehouseType>
//                                 id="warehouse-autocomplete"
//                                 options={warehousesList}
//                                 getOptionLabel={(option) => option.name}
//                                 value={warehouse}
//                                 onChange={(_event, newValue) => {
//                                     setWarehouse(newValue);
//                                     if (warehouseError && newValue) setWarehouseError(false);
//                                 }}
//                                 renderInput={(params) => (
//                                     <TextField
//                                         {...params}
//                                         label="Depo Seçin"
//                                         variant="outlined"
//                                         sx={{ width: '100%' }}
//                                         size="small"
//                                         error={warehouseError}
//                                         helperText={warehouseError ? "Bu alan zorunludur!" : ""}
//                                     />
//                                 )}
//                             />
//                         </Grid>
//                         <Grid item xs={12} md={5}>
//                             <Autocomplete<TenderType>
//                                 id="tender-autocomplete"
//                                 options={tendersList}
//                                 getOptionLabel={(option) => option.title}
//                                 value={tender}
//                                 onChange={(_event, newValue) => {
//                                     setTender(newValue);
//                                     if (tenderError && newValue) setTenderError(false);
//                                 }}
//                                 renderInput={(params) => (
//                                     <TextField
//                                         {...params}
//                                         label="İhale Seçin"
//                                         variant="outlined"
//                                         sx={{ width: '100%' }}
//                                         size="small"
//                                         error={tenderError}
//                                         helperText={tenderError ? "Bu alan zorunludur!" : ""}
//                                     />
//                                 )}
//                             />
//                         </Grid>
//                         <Grid item xs={12} md={2}>
//                             <Box textAlign="right">
//                                 <Button
//                                     variant="contained"
//                                     color="primary"
//                                     startIcon={<IconExchange />}
//                                     onClick={handleCompare}
//                                     fullWidth
//                                     disabled={isComparing}
//                                 >
//                                     {isComparing ? <CircularProgress size={24} color="inherit" /> : 'Karşılaştır'}
//                                 </Button>
//                             </Box>
//                         </Grid>
//                     </Grid>

//                     <Typography variant="h6" mb={2} sx={{ mt: 3 }}>Ürün Detayları</Typography>
//                     <OrderItemsTable
//                         items={orderItems} itemsList={itemsList} onItemChange={handleItemChange} onAddItem={handleAddItem}
//                         onRemoveItem={handleRemoveItem} onToggleEdit={handleToggleEdit} availableItemsList={availableItemsList}
//                         onOpenRegisterModal={handleOpenRegisterModal}
//                     />
//                     {orderItemsError && (
//                         <Typography variant="body2" color="error" sx={{ mt: 1 }}>Sipariş en az bir ürün içermeli ve tüm ürün alanları dolu olmalıdır!</Typography>
//                     )}
//                     <Box mt={3} textAlign="right">
//                         {editingId ? (
//                             <Stack direction="row" spacing={1} justifyContent="flex-end">
//                                 <Button variant="contained" color="info" onClick={handleUpdateOrder}>Düzenle</Button>
//                                 <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
//                             </Stack>
//                         ) : (
//                             <>
//                                 {hasCreatePermission && (
//                                     <Button variant="contained" color="primary" onClick={handleSaveOrder}>
//                                         Siparişi Kaydet</Button>
//                                 )}
//                             </>
//                         )}
//                     </Box>
//                 </Paper>
//             )}

//             {alertMessage && (
//                 <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
//                     <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
//                 </Stack>
//             )}
//             <BlankCard>
//                 <Grid item xs={12} mt={2} mr={2}>
//                     <Stack direction="row" spacing={2} justifyContent="flex-end">
//                         {isFilterActive && (
//                             <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle depoları indirin" : ""}>
//                                 <BlinkingButton
//                                     variant="contained"
//                                     color="primary"
//                                     onClick={exportAllFilteredToPdf}
//                                     startIcon={<IconFileDownload />}
//                                     isBlinking={true}
//                                     disabled={loadingData}
//                                 >
//                                     Filtrelenmişi  İndir (PDF)
//                                 </BlinkingButton>
//                             </CustomTooltip>
//                         )}

//                         <CustomTooltip title={isTooltipGloballyEnabled ? "Satın Alma Sipariş indirin" : ""}>
//                             <Button
//                                 variant="contained"
//                                 color="primary"
//                                 onClick={exportAllPdf}
//                                 startIcon={<IconFileDownload />}
//                                 disabled={loadingData}
//                             >
//                                 Tümünü İndir (PDF)
//                             </Button>
//                         </CustomTooltip>
//                     </Stack>
//                 </Grid>
//                 <Box sx={{ p: 2 }}>
//                     <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Sipariş Listesi</Typography>
//                     <Grid container spacing={2} alignItems="center">
//                         <Grid item xs={12} sm={6} md={2}>
//                             <TextField
//                                 label="Sipariş Ara" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange}
//                                 InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
//                             />
//                         </Grid>


//                         <Grid item xs={12} sm={6} md={5}>
//                             <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
//                                 <Stack direction="row" spacing={1} alignItems="center">
//                                     <DatePicker
//                                         label="Başlangıç Tarihi"
//                                         value={startDate}
//                                         inputFormat="dd/MM/yyyy"
//                                         onChange={(newValue) => setStartDate(newValue)}
//                                         renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                     />
//                                     <DatePicker
//                                         label="Bitiş Tarihi"
//                                         value={endDate}
//                                         inputFormat="dd/MM/yyyy"
//                                         onChange={(newValue) => setEndDate(newValue)}
//                                         renderInput={(params) => <TextField {...params} size="small" fullWidth />}
//                                     />
//                                     <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
//                                         <IconX size={20} />
//                                     </IconButton>
//                                 </Stack>
//                             </LocalizationProvider>
//                         </Grid>
//                         <Grid item xs={12} sm={6} md={5}>
//                             <ToggleButtonGroup
//                                 value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Status filter" fullWidth
//                             >
//                                 <StyledToggleButton value="all" aria-label="all orders">Tümü</StyledToggleButton>
//                                 <StyledToggleButton value="pending" aria-label="pending orders">Beklemede</StyledToggleButton>
//                                 <StyledToggleButton value="approved" aria-label="approved orders">Onaylandı</StyledToggleButton>
//                                 <StyledToggleButton value="rejected" aria-label="rejected orders">Reddedildi</StyledToggleButton>
//                             </ToggleButtonGroup>
//                         </Grid>
//                     </Grid>
//                 </Box>

//                 <TableContainer component={Paper}>
//                     <Table aria-label="order table">
//                         <TableHead>
//                             <TableRow>
//                                 <TableCell>
//                                     <TableSortLabel active={orderBy === 'network.title'} direction={orderBy === 'network.title' ? order : 'asc'} onClick={() => handleRequestSort('network.title')}>
//                                         <Typography variant="h6">Şebeke Adı</Typography>
//                                     </TableSortLabel>
//                                 </TableCell>
//                                 <TableCell>
//                                     <TableSortLabel active={orderBy === 'docDate'} direction={orderBy === 'docDate' ? order : 'asc'} onClick={() => handleRequestSort('docDate')}>
//                                         <Typography variant="h6">Tarih</Typography>
//                                     </TableSortLabel>
//                                 </TableCell>
//                                 <TableCell>
//                                     <TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleRequestSort('status')}>
//                                         <Typography variant="h6">Durum</Typography>
//                                     </TableSortLabel>
//                                 </TableCell>
//                                 <TableCell><Typography variant="h6">Ürün Detayları</Typography></TableCell>
//                                 <TableCell align="right"><Typography variant="h6">İşlemler</Typography></TableCell>
//                             </TableRow>
//                         </TableHead>
//                         <TableBody>
//                             {loadingData ? (
//                                 <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
//                             ) : (
//                                 paginatedOrders.length > 0 ? (
//                                     paginatedOrders.map((row) => (
//                                         <TableRow key={row.id}>
//                                             <TableCell><Typography variant="h6">{row.network ? row.network.title : "-"}</Typography></TableCell>
//                                             <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
//                                             <TableCell>
//                                                 <Stack direction="row" alignItems="center" spacing={1}>
//                                                     {row.status === 0 && <HourglassEmptyIcon sx={{ color: 'orange' }} fontSize="small" />}
//                                                     {row.status === 1 && <CheckCircleOutlineIcon color="success" fontSize="small" />}
//                                                     {row.status === 2 && <HighlightOffIcon color="error" fontSize="small" />}
//                                                     <Typography variant="h6">{row.status === 0 ? "Beklemede" : row.status === 1 ? "Onaylandı" : "Reddedildi"}</Typography>
//                                                 </Stack>
//                                             </TableCell>
//                                             <TableCell>
//                                                 <Button variant="outlined" startIcon={<IconEye />} onClick={() => handleOpenModal(row.orderDetails)}>
//                                                     Görünüm
//                                                 </Button>
//                                             </TableCell>
//                                             <TableCell align="right">
//                                                 <IconButton id={`basic-button-${row.id}`} aria-controls={openMenu ? 'basic-menu' : undefined}
//                                                     aria-haspopup="true" aria-expanded={openMenu && selectedOrderForMenu?.id === row.id ? 'true' : undefined}
//                                                     onClick={(event) => handleClickMenu(event, row)}>
//                                                     <IconDots size={20} />
//                                                 </IconButton>
//                                                 <Menu id="basic-menu" anchorEl={anchorEl} open={openMenu && selectedOrderForMenu?.id === row.id} onClose={handleCloseMenu}
//                                                     MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}>

//                                                     {hasStatusPermission && selectedOrderForMenu?.status === 0 && (
//                                                         <>
//                                                             <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
//                                                                 <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
//                                                             </MenuItem>
//                                                             <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
//                                                                 <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
//                                                             </MenuItem>
//                                                         </>
//                                                     )}
//                                                     {hasStatusPermission && selectedOrderForMenu?.status === 1 && (
//                                                         <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
//                                                             <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
//                                                         </MenuItem>
//                                                     )}
//                                                     {hasStatusPermission && selectedOrderForMenu?.status === 2 && (
//                                                         <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
//                                                             <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
//                                                         </MenuItem>
//                                                     )}
//                                                     {hasEditPermission && (
//                                                         <MenuItem onClick={() => handleEditClick(row)}>
//                                                             <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
//                                                         </MenuItem>
//                                                     )}
//                                                     {hasDeletePermission && (
//                                                         <MenuItem onClick={() =>
//                                                             handleClickOpenDeleteModal(row.id, row.network.title)}>
//                                                             <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
//                                                         </MenuItem>
//                                                     )}
//                                                     {hasDownloadPermission && (
//                                                         <>
//                                                             <MenuItem onClick={() => {
//                                                                 if (selectedOrderForMenu) {
//                                                                     exportToExcel(selectedOrderForMenu);
//                                                                     handleCloseMenu();
//                                                                 }
//                                                             }}>
//                                                                 <ListItemIcon><IconFileSpreadsheet size={18} /></ListItemIcon> Excel İndir
//                                                             </MenuItem>
//                                                             <MenuItem onClick={() => {
//                                                                 if (selectedOrderForMenu) {
//                                                                     exportToPdf(selectedOrderForMenu);
//                                                                     handleCloseMenu();
//                                                                 }
//                                                             }}>
//                                                                 <ListItemIcon><IconFile size={18} /></ListItemIcon> PDF İndir
//                                                             </MenuItem>
//                                                         </>
//                                                     )}
//                                                 </Menu>
//                                             </TableCell>
//                                         </TableRow>
//                                     ))
//                                 ) : (
//                                     <TableRow><TableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç sipariş bulunamadı.</Typography></TableCell></TableRow>
//                                 )
//                             )}
//                         </TableBody>
//                     </Table>
//                 </TableContainer>
//                 <TablePagination
//                     rowsPerPageOptions={[5, 10, 25]} component="div" count={sortedAndFilteredOrders.length}
//                     rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage}
//                 />
//             </BlankCard>
//             <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
//                 <DialogTitle>Ürün Detayları</DialogTitle>
//                 <DialogContent dividers>
//                     <TableContainer>
//                         <Table size="small">
//                             <TableHead>
//                                 <TableRow>
//                                     <TableCell>Ürün Adı</TableCell>
//                                     <TableCell>Miktar</TableCell>
//                                     <TableCell>Birim</TableCell>
//                                     <TableCell>Açıklama</TableCell>
//                                     <TableCell>Fiyat</TableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {modalDetails.map((detail, index) => (
//                                     <TableRow key={index}>
//                                         <TableCell>{detail.item.name}</TableCell>
//                                         <TableCell>{detail.quantity}</TableCell>
//                                         <TableCell>{detail.item.unit.title}</TableCell>
//                                         <TableCell> <Typography>{stripHtml(detail.description)}</Typography></TableCell>
//                                         <TableCell>{cleanAndFormatPrice(detail.price)}</TableCell>
//                                     </TableRow>
//                                 ))}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                 </DialogContent>
//                 <DialogActions><Button onClick={handleCloseModal}>Kapat</Button></DialogActions>
//             </Dialog>

//             <Dialog open={openComparisonModal} onClose={resetComparisonStates} maxWidth="lg" fullWidth>
//                 <DialogTitle>Karşılaştırma Sonuçları</DialogTitle>
//                 <DialogContent>
//                     <TableContainer component={Paper}>
//                         <Table>
//                             <TableHead>
//                                 <TableRow>
//                                     <TableCell>Ürün Adı</TableCell>
//                                     <TableCell>İhale Miktarı</TableCell>
//                                     <TableCell>Depo Miktarı</TableCell>
//                                     <TableCell>Durum</TableCell>
//                                     <TableCell>Birim</TableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {comparisonResults.map((result) => (
//                                     <TableRow key={result.id} sx={{ backgroundColor: result.statusColor === 'red' ? '#ffebee' : 'transparent' }}>
//                                         <TableCell>{itemsList.find(i => i.id === result.item)?.name}</TableCell>
//                                         <TableCell>{tenderItems.find(ti => ti.itemId === result.item)?.quantity || 0}</TableCell>
//                                         <TableCell>{result.quantity}</TableCell>
//                                         <TableCell>
//                                             <Chip
//                                                 label={result.statusColor === 'green' ? 'Mevcut' : 'Mevcut Değil'}
//                                                 color={result.statusColor === 'green' ? 'success' : 'error'}
//                                             />
//                                         </TableCell>
//                                         <TableCell>{result.unit?.title || '-'}</TableCell>
//                                     </TableRow>
//                                 ))}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleApplyComparison} color="primary">
//                         Siparişe Ekle ve Düzenle
//                     </Button>
//                     <Button onClick={resetComparisonStates}>İptal</Button>
//                 </DialogActions>
//             </Dialog>

//             <Dialog open={openStatusModal} onClose={handleCloseStatusModal} maxWidth="sm" fullWidth>
//                 <DialogTitle>
//                     {statusToUpdate === 1 ? 'Onaylama Açıklaması' : 'Reddetme Açıklaması'}
//                 </DialogTitle>
//                 <DialogContent>
//                     <TextField
//                         autoFocus
//                         margin="dense"
//                         label="Açıklama"
//                         type="text"
//                         fullWidth
//                         multiline
//                         rows={4}
//                         variant="outlined"
//                         value={description}
//                         onChange={(e) => {
//                             setDescription(e.target.value);
//                             if (statusError) setStatusError(false);
//                         }}
//                         error={statusError}
//                         helperText={statusError && 'Bu alan zorunludur.'}
//                     />
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleCloseStatusModal} color="secondary">
//                         İptal
//                     </Button>
//                     <Button onClick={handleUpdateStatus} color="primary">
//                         Kaydet
//                     </Button>
//                 </DialogActions>
//             </Dialog>

//             <DeleteOrderModal
//                 openModal={openDeleteModal} onClose={handleClickCloseDeleteModal}
//                 orderIdToDelete={orderIdToDelete} orderTitleToDelete={orderTitleToDelete}
//                 onDeleteSuccess={getListOrders} showAlert={showAlert}
//             />
//         </Box>
//     );
// };

// export default CompareComponent;

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Chip, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Paper, CircularProgress, Autocomplete
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { IconDots, IconEye, IconEdit, IconTrash, IconSearch, IconExchange, IconFile, IconFileSpreadsheet, IconFileDownload, IconX, IconCheck } from '@tabler/icons-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import axios from 'axios';
import server from '../../assets/address.json';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import OrderItemsTable from './OrderItemsTable';
import DeleteOrderModal from './DeleteOrderModal';
import { useAuth } from 'src/context/AuthContext';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { CustomTooltip, useTooltip } from 'src/context/TooltipContext';
import BlankCard from 'src/components/shared/BlankCard';


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
    price: number;
    statusColor?: 'green' | 'red';
}
interface OrderType { id: number; network: { id: string; title: string; }; docDate: string; status: number; orderDetails: OrderDetailType[]; }
interface OrderDetailType {
    id: number;
    item: { id: string; name: string; unit: { title: string; }; };
    quantity: number;
    description: string;
    price: number
}
interface WarehouseType { id: string; name: string; code: number; recordStatus: number; createAt: string; }
interface TenderType { id: string; title: string; recordStatus: number; createAt: string; }

// Table Style and Functions
type SortableOrderKeys = 'network.title' | 'docDate' | 'status' | 'createAt';

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

const getComparator = (order: 'asc' | 'desc', orderBy: SortableOrderKeys): (a: OrderType, b: OrderType) => number => {
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

const CompareComponent = () => {
    const navigate = useNavigate();

    // States from previous form
    const [network, setNetwork] = useState('');
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
    const [selectedWork, setSelectedWork] = useState<Work | null>(null);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [networkError, setNetworkError] = useState(false);
    const [docDateError, setDocDateError] = useState(false);
    const [orderItemsError, setOrderItemsError] = useState(false);

    // States for comparison form
    const [warehouse, setWarehouse] = useState<WarehouseType | null>(null);
    const [tender, setTender] = useState<TenderType | null>(null);
    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [tendersList, setTendersList] = useState<TenderType[]>([]);
    const [warehouseError, setWarehouseError] = useState(false);
    const [tenderError, setTenderError] = useState(false);
    const [tenderItems, setTenderItems] = useState<any[]>([]);
    const [comparisonResults, setComparisonResults] = useState<OrderItem[]>([]);
    const [openComparisonModal, setOpenComparisonModal] = useState(false);
    const [isComparing, setIsComparing] = useState(false);

    // Table States
    const [ordersList, setOrdersList] = useState<OrderType[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [orderBy, setOrderBy] = useState<SortableOrderKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedOrderForMenu, setSelectedOrderForMenu] = useState<OrderType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openModal, setOpenModal] = useState(false);
    const [modalDetails, setModalDetails] = useState<OrderDetailType[]>([]);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState<number | null>(null);
    const [orderTitleToDelete, setOrderTitleToDelete] = useState<string>('');
    const [editingId, setEditingId] = useState<number | null>(null);

    const { isTooltipGloballyEnabled } = useTooltip();
    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusToUpdate, setStatusToUpdate] = useState<1 | 2 | null>(null);
    const [description, setDescription] = useState('');
    const [statusError, setStatusError] = useState(false);
    const [idRow, setIdRow] = useState(0);


    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);
    const [isFilterActive, setIsFilterActive] = useState(false);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);

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
    const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
        if (priceInput === null || priceInput === undefined) {
            return '₺0.00';
        }
        const cleanedString = String(priceInput).replace(/[$,]/g, '');
        const numericValue = parseFloat(cleanedString);
        if (isNaN(numericValue)) {
            return '₺0.00';
        }
        const formattedPrice = numericValue.toLocaleString('tr-TR', {
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

    // ------------------ New Export Functions ------------------
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 50;
        const logoHeight = 25;
        const margin = 10;
        const topMargin = 20;
        const logoX = pageWidth - logoWidth - margin;

        doc.addImage(Logo, 'PNG', logoX, topMargin, logoWidth, logoHeight);

        doc.setFont('Arial', 'bold');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('Arial', 'bold');
        doc.text(`Tarih:`, 15, 25);
        doc.setFont('Arial', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 30, 25);
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

    const exportToPdf = (orderData: OrderType) => {
        const doc = new jsPDF();
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
        doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
        doc.addFileToVFS('Arial.ttf', ArialFont);
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        const rows = orderData.orderDetails.map(detail => [
            detail.item.name || '-',
            Number(detail.quantity).toFixed(2) || '-',
            detail.item.unit.title || '-',
            stripHtml(detail.description) || '-',
            cleanAndFormatPrice(detail.price),
        ]);

        autoTable(doc, {
            startY: 70,
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
                    doc.text(`Sipariş No: ${orderData.id}`, 15, 47);
                    doc.text(`Şebeke: ${orderData.network ? orderData.network.title : '-'}`, 15, 54);
                    doc.text(`Tarih: ${formatDateDisplay(orderData.docDate)}`, 15, 61);
                }
                addPdfFooter(doc);
            },
            showHead: 'everyPage',
            margin: { top: 65, bottom: 45 },
        });
        const finalY = (doc as any).lastAutoTable.finalY;
        const totalQuantities = new Map<string, number>();
        orderData.orderDetails.forEach(detail => {
            const unitTitle = detail.item.unit.title;
            const currentTotal = totalQuantities.get(unitTitle) || 0;
            totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
        });

        if (totalQuantities.size > 0) {
            const summaryRows = Array.from(totalQuantities.entries()).map(([unit, total]) => [unit, total.toFixed(2)]);
            autoTable(doc, {
                startY: finalY + 10,
                head: [['Birim', 'Toplam Miktar']],
                body: summaryRows,
                theme: 'grid',
                styles: { font: 'Arial', fontSize: 10 },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            });
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
            doc.text(`Sipariş No: ${order.id}`, 15, 47);
            doc.text(`Şebeke: ${order.network ? order.network.title : '-'}`, 15, 54);
            doc.text(`Tarih: ${formatDateDisplay(order.docDate)}`, 15, 61);
            const rows = order.orderDetails.map(detail => [
                detail.item.name || '-',
                Number(detail.quantity).toFixed(2) || '-',
                detail.item.unit.title || '-',
                stripHtml(detail.description) || '-',
                cleanAndFormatPrice(detail.price),
            ]);

            autoTable(doc, {
                startY: 65,
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
            const totalQuantities = new Map<string, number>();
            order.orderDetails.forEach(detail => {
                const unitTitle = detail.item.unit.title;
                const currentTotal = totalQuantities.get(unitTitle) || 0;
                totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
            });

            if (totalQuantities.size > 0) {
                const summaryRows = Array.from(totalQuantities.entries()).map(([unit, total]) => [unit, total.toFixed(2)]);
                autoTable(doc, {
                    startY: finalY + 10,
                    head: [['Birim', 'Toplam Miktar']],
                    body: summaryRows,
                    theme: 'grid',
                    styles: { font: 'Arial', fontSize: 10 },
                    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                });
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
        worksheet.addRow(['Tarih', formatDateDisplay(orderData.docDate)]);
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

        const totalQuantities = new Map<string, number>();
        orderData.orderDetails.forEach(detail => {
            const unitTitle = detail.item.unit.title;
            const currentTotal = totalQuantities.get(unitTitle) || 0;
            totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
        });

        if (totalQuantities.size > 0) {
            worksheet.addRow([]);
            worksheet.addRow(['Toplam Miktarlar']).font = { name: 'Arial', size: 12, bold: true };
            const summaryHeaders = ['Birim', 'Toplam Miktar'];
            const summaryHeaderRow = worksheet.addRow(summaryHeaders);
            summaryHeaderRow.font = { name: 'Arial', bold: true };
            summaryHeaderRow.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD9E1F2' }
                };
            });
            Array.from(totalQuantities.entries()).forEach(([unit, total]) => {
                worksheet.addRow([unit, total.toFixed(2)]);
            });
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

            worksheet.addRow([`Sipariş Detayları`]).font = { name: 'Arial', size: 12, bold: true };
            worksheet.mergeCells('A1:E1');
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: false };
            worksheet.getCell('A2').alignment = { horizontal: 'left' };
            worksheet.addRow([]);

            worksheet.addRow(['Sipariş No', order.id]);
            worksheet.addRow(['Şebeke', order.network ? order.network.title : '-']);
            worksheet.addRow(['Tarih', formatDateDisplay(order.docDate)]);
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

            order.orderDetails.forEach(detail => {
                worksheet.addRow([
                    detail.item.name,
                    detail.item.unit.title,
                    detail.quantity,
                    stripHtml(detail.description),
                    cleanAndFormatPrice(detail.price)
                ]);
            });

            const totalQuantities = new Map<string, number>();
            order.orderDetails.forEach(detail => {
                const unitTitle = detail.item.unit.title;
                const currentTotal = totalQuantities.get(unitTitle) || 0;
                totalQuantities.set(unitTitle, currentTotal + Number(detail.quantity));
            });

            if (totalQuantities.size > 0) {
                worksheet.addRow([]);
                worksheet.addRow(['Toplam Miktarlar']).font = { name: 'Arial', size: 12, bold: true };
                const summaryHeaders = ['Birim', 'Toplam Miktar'];
                const summaryHeaderRow = worksheet.addRow(summaryHeaders);
                summaryHeaderRow.font = { name: 'Arial', bold: true };
                summaryHeaderRow.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFD9E1F2' }
                    };
                });
                Array.from(totalQuantities.entries()).forEach(([unit, total]) => {
                    worksheet.addRow([unit, total.toFixed(2)]);
                });
            }

            const startRow = worksheet.lastRow ? worksheet.lastRow.number + 2 : 1;
            addExcelCompanyInfo(worksheet, startRow);

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
        const itemToUpdate = orderItems.find(item => item.id === id);
        if (!itemToUpdate) return;
        const updatedItem = { ...itemToUpdate };
        if (field === 'item') {
            const selectedItem = itemsList.find(i => i.id === value);
            updatedItem.item = value;
            updatedItem.unit = selectedItem?.unit;
            updatedItem.isRegistered = !!selectedItem;
        } else if (field === 'quantity') {
            const numericValue = parseFloat(value);
            updatedItem.quantity = isNaN(numericValue) ? 0 : numericValue;
        } else if (field === 'price') {
            const numericValue = parseFloat(value);
            updatedItem.price = isNaN(numericValue) ? 0 : numericValue;
        } else {
            (updatedItem as any)[field] = value;
        }
        const updatedOrderItems = orderItems.map(item =>
            item.id === id ? updatedItem : item
        );
        setOrderItems(updatedOrderItems);
    };

    const selectedItemIds = useMemo(() => orderItems.filter(item => !item.isEditing).map(item => item.item), [orderItems]);
    const availableItemsList = useMemo(() => itemsList.filter(item => !selectedItemIds.includes(item.id)), [itemsList, selectedItemIds]);

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

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    const getNetworks = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const result = await axios.request({ baseURL: server.baseurl + server.initialoperations + "get-networks", method: "get", headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200 && result.data.data) {
                const activeNetworks = result.data.data.filter((net: Network) => net.recordStatus === 0);
                setNetworks(activeNetworks);
            } else {
                showAlert(result.data.message || 'Şebeke listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Şebeke listesi alınırken bir hata oluştu.', 'error'); }
        }
    };

    const getListItem = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } });
            if (response.data && response.data.success) {
                const activeItems = response.data.data.filter((item: ItemType) => item.recordStatus === 0);
                setItemsList(activeItems);
            } else {
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Ürünler sunucudan alınamadı', 'error'); }
        }
    };

    const fetchWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const activeWarehouses = response.data.data.filter((wh: WarehouseType) => wh.recordStatus === 0);
                setWarehousesList(activeWarehouses);
            } else {
                showAlert(response.data.message || 'Depo listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Depo listesi yüklenirken bir hata oluştu.', 'error'); }
        }
    }, [navigate]);

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

    const getListOrders = async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-orders", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setOrdersList(response.data.data as OrderType[]);
            } else { showAlert(response.data.message || 'Siparişler yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert('Siparişler yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    };

    const fetchTenderItems = async (tenderId: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Oturumunuzun süresi doldu veya yetkiniz yok.', 'error');
            return [];
        }
        try {
            const response = await axios.get(`${server.baseurl + server.initialoperations}get-tender-by-id/${tenderId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                const allTenderDetails = response.data.data.tenderCategories.flatMap((category: any) => category.tenderDetails);

                const tenderItemsMap = new Map<string, any>();
                allTenderDetails.forEach((detail: any) => {
                    const itemId = String(detail.item.id);
                    if (tenderItemsMap.has(itemId)) {
                        const existingItem = tenderItemsMap.get(itemId);
                        existingItem.quantity += Number(detail.ourProcuredItemQuantities);
                    } else {
                        tenderItemsMap.set(itemId, {
                            id: detail.id,
                            itemId: itemId,
                            name: detail.item.name,
                            quantity: Number(detail.ourProcuredItemQuantities),
                            unit: detail.item.unit,
                        });
                    }
                });

                const parsedItems = Array.from(tenderItemsMap.values());
                return parsedItems;
            } else {
                showAlert('İhale ürünleri yüklenirken bir hata oluştu.', 'error');
                return [];
            }
        } catch (e: any) {
            showAlert('İhale ürünleri yüklenirken bir hata oluştu.', 'error');
            return [];
        }
    };

    const fetchWarehouseItems = async (warehouseId: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Oturumunuzun süresi doldu veya yetkiniz yok.', 'error'); return []; }
        try {
            const response = await axios.get(`${server.baseurl + server.warehouse}get-warehouse-all-items-balance/${warehouseId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                return response.data.data;
            } else {
                showAlert('Depo ürünleri yüklenirken bir hata oluştu.', 'error');
                return [];
            }
        } catch (e: any) {
            showAlert('Depo ürünleri yüklenirken bir hata oluştu.', 'error');
            return [];
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            await getNetworks();
            await getListItem();
            await fetchWarehouses();
            await fetchTenders();
            await getListOrders();
        };
        loadInitialData();
    }, []);


    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);
    }, [searchTerm, statusFilter, startDate, endDate]);

    const resetComparisonStates = () => {
        setTenderItems([]);
        setComparisonResults([]);
        setOpenComparisonModal(false);
    };


    const handleCompare = async () => {
        if (!warehouse) setWarehouseError(true); else setWarehouseError(false);
        if (!tender) setTenderError(true); else setTenderError(false);

        if (!warehouse || !tender) {
            showAlert('Lütfen hem depo hem de ihale seçin.', 'warning');
            return;
        }

        setIsComparing(true);
        const tenderData = await fetchTenderItems(tender.id);
        const warehouseData = await fetchWarehouseItems(warehouse.id);
        setIsComparing(false);

        if (!tenderData || !warehouseData) return;

        setTenderItems(tenderData);

        const results: OrderItem[] = tenderData.map((tenderItem: any) => {
            const matchingWarehouseItem = warehouseData.find((whItem: any) => whItem.itemId === tenderItem.itemId);
            const itemFromList = itemsList.find(i => String(i.id) === tenderItem.itemId);

            return {
                id: Date.now() + Math.random(),
                item: itemFromList ? itemFromList.id : tenderItem.itemId,
                quantity: matchingWarehouseItem?.balance || 0,
                description: '',
                isEditing: false,
                isRegistered: !!itemFromList,
                unit: itemFromList?.unit || tenderItem.unit,
                price: 0,
                statusColor: matchingWarehouseItem?.balance > 0 ? 'green' : 'red'
            };
        });

        setComparisonResults(results);
        setOpenComparisonModal(true);
    };

    const handleApplyComparison = () => {
        const neededItems = comparisonResults
            .map(item => {
                const tenderItem = tenderItems.find(ti => ti.itemId === item.item);
                const tenderQuantity = tenderItem ? tenderItem.quantity : 0;
                const warehouseBalance = item.quantity;
                const neededQuantity = tenderQuantity - warehouseBalance;

                if (neededQuantity > 0) {
                    return {
                        ...item,
                        quantity: neededQuantity,
                        isEditing: true
                    };
                }
                return null;
            })
            .filter(item => item !== null) as OrderItem[];

        if (neededItems.length === 0) {
            showAlert('Seçilen ürünlerden herhangi birinde eksik miktar bulunamadı.', 'info');
            resetComparisonStates();
            return;
        }

        setOrderItems(neededItems);
        resetComparisonStates();
        showAlert('İhtiyaç duyulan ürünler sipariş listesine başarıyla eklendi. Lütfen fiyat ve miktarı kontrol edin.', 'success');
    };


    const handleAddItem = () => {
        setOrderItems(prevItems => [...prevItems, { id: Date.now(), item: '', quantity: 0, description: '', price: 0, isEditing: true }]);
    };
    const handleRemoveItem = (id: number) => { setOrderItems(prevItems => prevItems.filter(item => item.id !== id)); };
    const handleToggleEdit = (id: number) => { setOrderItems(prevItems => prevItems.map(item => ({ ...item, isEditing: item.id === id ? !item.isEditing : item.isEditing }))); };
    const validateForm = (): boolean => {
        let isValid = true;
        if (!docDate) { setDocDateError(true); isValid = false; } else { setDocDateError(false); }
        const hasEmptyItem = orderItems.some(item => !item.item || item.quantity <= 0);
        if (orderItems.length === 0 || hasEmptyItem) { setOrderItemsError(true); isValid = false; } else { setOrderItemsError(false); }
        if (!isValid) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return isValid;
    };
    const resetForm = () => {
        setNetwork(''); setDocDate(new Date()); setOrderItems([]);
        setSelectedWork(null); setEditingId(null); setNetworkError(false); setDocDateError(false); setOrderItemsError(false);
        setWarehouse(null); setTender(null); setWarehouseError(false); setTenderError(false);
        setIsFormVisible(false);
    };
    const handleSaveOrder = async () => {
        if (!validateForm()) return;
        const orderData = {
            docDate: docDate?.toISOString(),
            networkId: network == "" ? null : Number(network),
            status: 0,
            orderDetails: orderItems.map(item => ({
                itemId: Number(item.item),
                quantity: parseFloat(String((item.quantity))),
                price: (item.price).toFixed(2),
                description: item.description
            }))
        };
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.post(server.baseurl + server.initialoperations + "create-order", orderData,
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Sipariş başarıyla kaydedildi!', 'success');
                resetForm();
                getListOrders();
            } else { showAlert(response.data.message || 'Sipariş kaydedilirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
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
                price: (item.price).toFixed(2),
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
            if (e.response?.status === 401) { localStorage.removeItem('authToken'); navigate("/"); showAlert('Oturumunuzun süresi doldu veya yetkiniz yok. Lütfen tekrar giriş yapın.', 'error'); }
            else { showAlert('Sipariş güncellenirken bir hata oluştu.', 'error'); }
        }
    };

    const handleEditClick = (row: OrderType) => {
        setEditingId(row.id);
        if (row.network) {
            const selectedNetwork = networks.find(net => net.title === row.network.title);
            if (selectedNetwork) {
                setNetwork(selectedNetwork.id);
                setSelectedWork(selectedNetwork.work);
            }
        } else {
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
                price: priceValue,
                isEditing: false,
                unit: fullItem ? fullItem.unit : undefined,
                isRegistered: true,
            };
        });
        setOrderItems(itemsToEdit);
        handleCloseMenu();
        setIsFormVisible(true);
        clearAlert();
    };

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
    const handleRequestSort = (property: SortableOrderKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    };
    const handleOpenModal = (details: OrderDetailType[]) => { setModalDetails(details); setOpenModal(true); };
    const handleCloseModal = () => { setOpenModal(false); };
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: OrderType) => { setAnchorEl(event.currentTarget); setSelectedOrderForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedOrderForMenu(null); };
    const handleClickOpenDeleteModal = (id: number, title: string) => { setOrderIdToDelete(id); setOrderTitleToDelete(title); setOpenDeleteModal(true); handleCloseMenu(); };
    const handleClickCloseDeleteModal = () => { setOpenDeleteModal(false); setOrderIdToDelete(null); setOrderTitleToDelete(''); };

    // const handleOpenRegisterModal = (_item: { name: string; unit: string; }) => { };

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
                server.baseurl + server.initialoperations + "update-order-status",
                payload,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (response.data.httpStatusCode === 200) {
                showAlert('Sipariş durumu başarıyla güncellendi!', 'success');
                getListOrders();
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

        return matchesSearch && matchesStatus && isWithinDateRange;
    });

    const sortedAndFilteredOrders = stableSort(filteredOrders, getComparator(order, orderBy));
    const paginatedOrders = sortedAndFilteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

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
                                fullWidth={false} // در حالت موبایل بهتر است fullWidth نباشد
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
                                // disabled={loadingButton}
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
                    <Typography variant="h6" mb={2}>Depo/İhale Karşılaştırması</Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                            <CustomFormLabel htmlFor="network-autocomplete" sx={{ mt: 0, mb: { xs: '-10px', sm: 0 } }} >
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
                                            helperText={docDateError ? "Bu alan zorunludur!" : ""} />
                                    )}
                                />
                            </LocalizationProvider>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
                        <Grid item xs={12} md={5}>
                            <Autocomplete<WarehouseType>
                                id="warehouse-autocomplete"
                                options={warehousesList}
                                getOptionLabel={(option) => option.name}
                                value={warehouse}
                                onChange={(_event, newValue) => {
                                    setWarehouse(newValue);
                                    if (warehouseError && newValue) setWarehouseError(false);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Depo Seçin"
                                        variant="outlined"
                                        sx={{ width: '100%' }}
                                        size="small"
                                        error={warehouseError}
                                        helperText={warehouseError ? "Bu alan zorunludur!" : ""}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Autocomplete<TenderType>
                                id="tender-autocomplete"
                                options={tendersList}
                                getOptionLabel={(option) => option.title}
                                value={tender}
                                onChange={(_event, newValue) => {
                                    setTender(newValue);
                                    if (tenderError && newValue) setTenderError(false);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="İhale Seçin"
                                        variant="outlined"
                                        sx={{ width: '100%' }}
                                        size="small"
                                        error={tenderError}
                                        helperText={tenderError ? "Bu alan zorunludur!" : ""}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Box textAlign="right">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<IconExchange />}
                                    onClick={handleCompare}
                                    fullWidth
                                    disabled={isComparing}
                                >
                                    {isComparing ? <CircularProgress size={24} color="inherit" /> : 'Karşılaştır'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Typography variant="h6" mb={2} sx={{ mt: 3 }}>Ürün Detayları</Typography>
                    <OrderItemsTable
                        items={orderItems} itemsList={itemsList} onItemChange={handleItemChange} onAddItem={handleAddItem}
                        onRemoveItem={handleRemoveItem} onToggleEdit={handleToggleEdit} availableItemsList={availableItemsList}
                        onOpenRegisterModal={() => { }}
                    />
                    {orderItemsError && (
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>Sipariş en az bir ürün içermeli ve tüm ürün alanları dolu olmalıdır!</Typography>
                    )}
                    <Box mt={3} textAlign="right">
                        {editingId ? (
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button variant="contained" color="info" onClick={handleUpdateOrder}>Düzenle</Button>
                                <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                            </Stack>
                        ) : (
                            <>
                                {hasCreatePermission && (
                                    <Button variant="contained" color="primary" onClick={handleSaveOrder}>
                                        Siparişi Kaydet</Button>
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
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle siparişleri indirin" : ""}>
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
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm siparişleri indirin" : ""}>
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
                    <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Sipariş Listesi</Typography>
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
                                                <Menu id="basic-menu" anchorEl={anchorEl} open={openMenu && selectedOrderForMenu?.id === row.id} onClose={handleCloseMenu}
                                                    MenuListProps={{ 'aria-labelledby': `basic-button-${row.id}` }}>

                                                    {hasStatusPermission && selectedOrderForMenu?.status === 0 && (
                                                        <>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi onaylayın" : ""}>
                                                                <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                    <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
                                                                </MenuItem>
                                                            </CustomTooltip>
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi reddedin" : ""}>
                                                                <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                    <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
                                                                </MenuItem>
                                                            </CustomTooltip>
                                                        </>
                                                    )}
                                                    {hasStatusPermission && selectedOrderForMenu?.status === 1 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi reddedin" : ""}>
                                                            <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'reject')}>
                                                                <ListItemIcon><IconX size={18} /></ListItemIcon> Reddet
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasStatusPermission && selectedOrderForMenu?.status === 2 && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi onaylayın" : ""}>
                                                            <MenuItem onClick={() => handleClickOpenStatusModal(row.id, 'approve')}>
                                                                <ListItemIcon><IconCheck size={18} /></ListItemIcon> Onayla
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi düzenleyin" : ""}>
                                                            <MenuItem onClick={() => handleEditClick(row)}>
                                                                <ListItemIcon><IconEdit size={18} /></ListItemIcon> Düzenle
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu siparişi silin" : ""}>
                                                            <MenuItem onClick={() =>
                                                                handleClickOpenDeleteModal(row.id, row.network.title)}>
                                                                <ListItemIcon><IconTrash size={18} /></ListItemIcon> Silmek
                                                            </MenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <>
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
                                                        </>
                                                    )}
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
            </BlankCard>

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

            <Dialog open={openComparisonModal} onClose={resetComparisonStates} maxWidth="lg" fullWidth>
                <DialogTitle>Karşılaştırma Sonuçları</DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ürün Adı</TableCell>
                                    <TableCell>İhale Miktarı</TableCell>
                                    <TableCell>Depo Miktarı</TableCell>
                                    <TableCell>Durum</TableCell>
                                    <TableCell>Birim</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {comparisonResults.map((result) => (
                                    <TableRow key={result.id} sx={{ backgroundColor: result.statusColor === 'red' ? '#ffebee' : 'transparent' }}>
                                        <TableCell>{itemsList.find(i => i.id === result.item)?.name}</TableCell>
                                        <TableCell>{tenderItems.find(ti => ti.itemId === result.item)?.quantity || 0}</TableCell>
                                        <TableCell>{result.quantity}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={result.statusColor === 'green' ? 'Mevcut' : 'Mevcut Değil'}
                                                color={result.statusColor === 'green' ? 'success' : 'error'}
                                            />
                                        </TableCell>
                                        <TableCell>{result.unit?.title || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleApplyComparison} color="primary">
                        Siparişe Ekle ve Düzenle
                    </Button>
                    <Button onClick={resetComparisonStates}>İptal</Button>
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

            <DeleteOrderModal
                openModal={openDeleteModal} onClose={handleClickCloseDeleteModal}
                orderIdToDelete={orderIdToDelete} orderTitleToDelete={orderTitleToDelete}
                onDeleteSuccess={getListOrders} showAlert={showAlert}
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
        </Box>
    );
};

export default CompareComponent;