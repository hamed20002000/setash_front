

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Autocomplete, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconArrowRight, IconEye, IconReload, IconX, IconFileSpreadsheet, IconFileText } from '@tabler/icons-react';
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
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteReceipt from "./DeleteStoreReceipt";

// ✨ NEW imports for Excel
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
interface StoreType {
    id: string;
    name: string;
    code: string;
    recordStatus: number;
    workhouse?: {
        id: string;
        name: string;
    }
}

interface WarehouseType {
    id: string;
    name: string;
    code: string;
    recordStatus: number;
}

interface ItemType {
    id: string;
    name: string;
    abbreviation: string;
    unit?: {
        id: string;
        title: string;
    };
    recordStatus?: number;
}

interface DispatchItemType {
    id: string;
    quantity: string;
    createAt: string;
    recordStatus: number;
    description: string;
    item: ItemType;
}

interface DispatchType {
    id: string;
    code: string;
    docDate: string;
    recordStatus: number;
    warehouseDispatchDetails: DispatchItemType[];
    warehouse?: {
        id: string;
        name: string;
    }
}

interface ReceiptDetailType {
    id: string;
    quantity: string;
    description: string;
    item: ItemType;
    warehouseDispatchDetail: {
        id: string;
        quantity: string;
        warehouseDispatchHeaders: {
            id: string;
            code: string;
        };
    }
}

interface StoreReceiptType {
    id: string;
    code: string;
    docDate: string;
    createAt: string;
    recordStatus: number;
    status: string;
    storeReceiptDetails: ReceiptDetailType[];
    store: StoreType;
    warehouse: WarehouseType;
    warehouseDispatchHeaders?: {
        id: string;
        code: string;
    };
}

interface FormReceiptDetail {
    itemId: number | null;
    quantity: number | string;
    description: string;
    warehouseDispatchDetailId: number | null;
    item?: ItemType;
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


// =====================================================================================
// توابع کمکی برای ساختار گزارش‌دهی PDF و Excel
// =====================================================================================

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


const ListStoreReceipts = () => {
    const { storeId: routeStoreId } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // === State Variables ===
    const [docDate, setDocDate] = useState<Date | null>(new Date());
    const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
    const [selectedDispatch, setSelectedDispatch] = useState<DispatchType | null>(null);
    const [receiptDetails, setReceiptDetails] = useState<FormReceiptDetail[]>([]);
    const [removedReceiptDetails, setRemovedReceiptDetails] = useState<FormReceiptDetail[]>([]);

    const [receiptsList, setReceiptsList] = useState<StoreReceiptType[]>([]);
    const [displayedReceipts, setDisplayedReceipts] = useState<StoreReceiptType[]>([]);
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
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<StoreReceiptType | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [dispatchesList, setDispatchesList] = useState<DispatchType[]>([]);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [receiptIdToDelete, setReceiptIdToDelete] = useState<string | null>(null);
    const [receiptCodeToDelete, setReceiptCodeToDelete] = useState<string>('');

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [detailsToShow, setDetailsToShow] = useState<ReceiptDetailType[]>([]);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [isFilterActive, setIsFilterActive] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const isStoreHidden = useMemo(() => !!routeStoreId, [routeStoreId]);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedReceiptForDownload, setSelectedReceiptForDownload] = useState<StoreReceiptType | null>(null);


    // Form Handlers
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    // API Calls
    const fetchStores = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-stores", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setStoresList(response.data.data.filter((d: StoreType) => d.recordStatus === 0));
            } else {
                showAlert(response.data.message || 'Şantiyelar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            showAlert('Şantiyelar yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, authToken]);

    // Fetches dispatches related to a specific workhouse (store's parent)
    const fetchDispatchesByWorkhouseId = useCallback(async (workhouseId: string) => {
        if (!authToken) return [];
        try {
            const response = await axios.get(server.baseurl + server.warehouse + `get-warehouse-dispatches-by-workhouse-id/${Number(workhouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const activeDispatches = response.data.data.filter((d: DispatchType) => d.recordStatus === 0);
                setDispatchesList(activeDispatches);
                return activeDispatches; // Return the list for immediate use in edit mode
            } else {
                showAlert(response.data.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
                setDispatchesList([]);
                return [];
            }
        } catch (e) {
            showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            setDispatchesList([]);
            return [];
        }
    }, [showAlert, authToken]);


    const fetchReceipts = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); return; }
        try {
            let url = server.baseurl + server.warehouse + "get-store-receipts";
            if (routeStoreId) {
                url = server.baseurl + server.warehouse + `get-store-receipt-by-storeid/${routeStoreId}`;
            }
            const response = await axios.get(url, { headers: { "Authorization": `Bearer ${authToken}` } });

            if (response.data.httpStatusCode === 200) {
                const formattedReceipts = response.data.data.map((r: any) => ({
                    ...r,
                    status: r.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setReceiptsList(formattedReceipts);
            } else {
                showAlert(response.data.message || 'Fişler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            showAlert('Fişler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [routeStoreId, navigate, showAlert, authToken]);

    useEffect(() => {
        fetchReceipts();
        if (routeStoreId) {
            if (!authToken) { navigate("/"); return; }
            axios.get(server.baseurl + server.initialoperations + `get-store-by-id/${routeStoreId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }).then(res => {
                    const store = res.data.data;
                    if (store) {
                        setSelectedStore(store);
                        if (store.workhouse?.id) {
                            fetchDispatchesByWorkhouseId(store.workhouse.id);
                        }
                    }
                }).catch(_e => {
                    showAlert('Mağaza bilgileri yüklenirken bir hata oluştu.', 'error');
                });
        } else {
            fetchStores();
        }
    }, [fetchReceipts, fetchStores, fetchDispatchesByWorkhouseId, routeStoreId, navigate, showAlert, authToken]);

    const paginatedReceipts = useMemo(() => {
        return displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedReceipts, page, rowsPerPage]);

    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDate !== null || endDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);

        const filteredByAllCriteria = receiptsList.filter(r => {
            const matchesSearch = r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.store?.name && r.store.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (r.warehouse?.name && r.warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && r.recordStatus === 0) ||
                (statusFilter === 'inactive' && r.recordStatus === 1);

            const docDate = new Date(r.docDate);
            const matchesDate =
                (!startDate || docDate >= startDate) &&
                (!endDate || docDate <= endDate);

            return matchesSearch && matchesStatus && matchesDate;
        });
        setDisplayedReceipts(filteredByAllCriteria);
        setPage(0);
    }, [receiptsList, searchTerm, statusFilter, startDate, endDate]);

    useEffect(() => {
        const isDetailsValid = receiptDetails.length > 0 &&
            receiptDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(!!docDate && !!selectedStore && !!selectedDispatch && isDetailsValid);
    }, [docDate, selectedStore, selectedDispatch, receiptDetails]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    const resetFormAndState = () => {
        setDocDate(new Date());
        setSelectedStore(null);
        setSelectedDispatch(null);
        setReceiptDetails([]);
        setRemovedReceiptDetails([]);
        setEditingId(null);
        setEditingCode(null);
        setIsFormVisible(false);
    };

    const handleAddReceiptDetail = () => {
        if (receiptDetails.length > 0) {
            const lastDetail = receiptDetails[receiptDetails.length - 1];
            if (!lastDetail.itemId || !lastDetail.quantity || !lastDetail.warehouseDispatchDetailId) {
                showAlert('Lütfen mevcut detayları önce doldurun.', 'warning');
                return;
            }
        }
        setReceiptDetails(prev => [...prev, { itemId: null, quantity: '', description: '', warehouseDispatchDetailId: null }]);
    };

    const handleRemoveReceiptDetail = (index: number) => {
        setReceiptDetails(prev => {
            const removed = prev[index];
            if (removed && selectedDispatch) {
                const itemFromDispatch = selectedDispatch.warehouseDispatchDetails.find(
                    d => Number(d.id) === Number(removed.warehouseDispatchDetailId)
                )?.item;
                const fullRemovedDetail = { ...removed, item: itemFromDispatch };
                setRemovedReceiptDetails(p => [...p, fullRemovedDetail]);
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleRestoreLastRemoved = (indexToRestore: number) => {
        const itemToRestore = removedReceiptDetails[indexToRestore];
        if (itemToRestore) {
            setReceiptDetails(prev => [...prev, itemToRestore]);
            setRemovedReceiptDetails(prev => prev.filter((_, i) => i !== indexToRestore));
        }
    };

    const handleReceiptDetailChange = useCallback((index: number, field: keyof FormReceiptDetail, value: any) => {
        setReceiptDetails(prev => {
            const newDetails = [...prev];
            const updatedDetail = { ...newDetails[index] };
            if (field === 'quantity') {
                const numValue = Number(value);
                const relatedDispatchDetail = selectedDispatch?.warehouseDispatchDetails.find(d => Number(d.id) === Number(updatedDetail.warehouseDispatchDetailId));
                const maxQuantity = relatedDispatchDetail ? Number(relatedDispatchDetail.quantity) : Infinity;
                if (numValue < 0) {
                    showAlert('Miktar negatif olamaz!', 'warning');
                    updatedDetail.quantity = 0;
                } else if (numValue > maxQuantity) {
                    showAlert(`Girdiğiniz miktar sevk miktarından fazla! Maksimum: ${maxQuantity}`, 'warning');
                    updatedDetail.quantity = maxQuantity;
                } else {
                    updatedDetail.quantity = value;
                }
            } else {
                (updatedDetail as any)[field] = value;
            }
            newDetails[index] = updatedDetail;
            return newDetails;
        });
    }, [selectedDispatch, showAlert]);

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleEditClick = async () => {
        if (!selectedRowForMenu) return;
        handleCloseMenu();
        setLoadingData(true);

        try {
            const receipt = selectedRowForMenu;
            const storeIdToFetch = receipt.store?.id || routeStoreId; // ID شانتایه
            if (!storeIdToFetch) {
                showAlert('Düzenlenecek mağaza bilgisi eksik.', 'error');
                return;
            }

            setEditingId(receipt.id);
            setEditingCode(receipt.code);
            setDocDate(new Date(receipt.docDate));

            // ✨ گام جدید ۱: دریافت اطلاعات کامل شانتایه برای اطمینان از workhouse.id
            const storeResponse = await axios.get(
                server.baseurl + server.initialoperations + `get-store-by-id/${storeIdToFetch}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            const completeStore = storeResponse.data.data;
            debugger
            // ۱. تنظیم شانتای (Store)
            setSelectedStore(completeStore || null);

            let dispatches: DispatchType[] = [];

            // ۲. فراخوانی API و دریافت لیست دیسپچ‌ها (از اطلاعات کامل شده استفاده می‌شود)
            if (completeStore && completeStore.workhouse?.id) {
                // با await، منتظر می‌مانیم تا لیست لود و در dispatchesList ذخیره شود.
                dispatches = await fetchDispatchesByWorkhouseId(completeStore.workhouse.id) || [];
            } else {
                showAlert('Şantiyenin bağlı olduğu işyeri (Workhouse) bilgisi eksik. Sevkler yüklenemedi.', 'warning');
            }

            // ۳. تنظیم Sevk Belgesi (Dispatch)
            const sevkIdFromReceipt = receipt.storeReceiptDetails?.[0]?.warehouseDispatchDetail?.warehouseDispatchHeaders?.id || receipt.warehouseDispatchHeaders?.id;

            let foundDispatch: DispatchType | null = null;
            if (sevkIdFromReceipt) {
                // Dispatch را از لیست "جدید لود شده" (متغیر محلی dispatches) پیدا کنید
                foundDispatch = dispatches.find((d: DispatchType) => d.id === sevkIdFromReceipt) || null;
            }
            setSelectedDispatch(foundDispatch);

            // ۴. تنظیم جزئیات فیش
            const formattedDetails = (receipt.storeReceiptDetails || []).map(d => ({
                itemId: Number(d.item?.id),
                quantity: d.quantity,
                description: d.description,
                warehouseDispatchDetailId: Number(d.warehouseDispatchDetail?.id),
                item: d.item,
            }));
            setReceiptDetails(formattedDetails);
            setRemovedReceiptDetails([]);

        } catch (e: any) {
            // ... (Error handling remains the same)
            showAlert(e.response?.data?.message || 'Veri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
        setIsFormVisible(true);
    };


    const handleCancelEdit = () => {
        resetFormAndState();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setReceiptIdToDelete(selectedRowForMenu.id);
            setReceiptCodeToDelete(selectedRowForMenu.code);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setReceiptIdToDelete(null);
        setReceiptCodeToDelete('');
        fetchReceipts();
    };

    const insertReceipt = async () => {
        if (!isFormValid) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
            return;
        }
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                docDate: docDate?.toISOString(),
                storeId: Number(routeStoreId || selectedStore?.id),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    warehouseDispatchDetailId: d.warehouseDispatchDetailId,
                }))
            };
            const response = await axios.post(server.baseurl + server.warehouse + "create-store-receipt", payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni fiş başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchReceipts();
            } else {
                showAlert(response.data.message || 'Fiş eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Fiş eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };
    const editReceipt = async () => {
        if (!editingId) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
            return;
        }
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const payload = {
                id: Number(editingId),
                code: editingCode,
                docDate: docDate?.toISOString(),
                storeId: Number(routeStoreId || selectedStore?.id),
                receiptDetails: receiptDetails.map(d => ({
                    itemId: d.itemId,
                    quantity: Number(d.quantity),
                    description: d.description,
                    warehouseDispatchDetailId: d.warehouseDispatchDetailId,
                }))
            };
            const response = await axios.put(server.baseurl + server.warehouse + "update-store-receipt", payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('Fiş başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchReceipts();
            } else {
                showAlert(response.data.message || 'Fiş güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Fiş güncellenirken bir hata oluştu.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };

    // Consolidated PDF export function
    const exportReceiptsToPdf = (data: StoreReceiptType[], title: string, subtitle?: string) => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }
        showAlert('PDF oluşturuluyor...', 'info');
        const doc = new jsPDF();
        const docAny = doc as any;
        let yPos = 60;

        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        data.forEach((receipt, index) => {
            if (index > 0) {
                doc.addPage();
                yPos = 60;
            }

            // Calculate total quantity for header info
            const totalQuantity = (receipt.storeReceiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);

            addPdfHeader(doc, title);

            if (subtitle) {
                doc.setFontSize(10);
                doc.text(subtitle, doc.internal.pageSize.getWidth() - 15, 47, { align: 'right' });
            }

            // Add main receipt information
            doc.setFontSize(12);
            doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos);
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });

            yPos += 7;
            const sevkKodu = receipt.storeReceiptDetails?.[0]?.warehouseDispatchDetail?.warehouseDispatchHeaders?.code || '-';
            doc.text(`Şantiye: ${receipt.store?.name || '-'}`, 15, yPos);
            doc.text(`Sevk Kodu: ${sevkKodu}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });

            yPos += 7;
            doc.text(`Depo: ${receipt.warehouse?.name || '-'}`, 15, yPos);
            // doc.text(`Toplam Miktar: ${totalQuantity}`, doc.internal.pageSize.getWidth() - 15, yPos, { align: 'right' });

            yPos += 15;

            const detailsRows = (receipt.storeReceiptDetails || []).map(d => [
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);

            const columns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];

            autoTable(doc, {
                startY: yPos,
                head: [columns],
                body: detailsRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: (dataHook) => {
                    addPdfFooter(doc);
                    // Eğer son sayfaysa ve tablonun altındaysa toplamı göster
                    if (dataHook.pageNumber === docAny.internal.getNumberOfPages()) {
                        const finalY = dataHook.cursor?.y || 0;
                        doc.setFontSize(10);
                        doc.setFont('NotoSans', 'bold');
                        doc.text(`Toplam Miktar: ${totalQuantity.toLocaleString()}`, doc.internal.pageSize.getWidth() - 15, finalY + 5, { align: 'right' });
                        doc.setFont('NotoSans', 'normal');
                    }
                },
                // 🎉 جایگزین DidDrawPage برای ردیف‌های خلاصه
                foot: [
                    ['', 'Toplam Miktar:', totalQuantity.toLocaleString(), ''] // Boş hücreleri doldur
                ],
                footStyles: {
                    font: 'NotoSans',
                    fillColor: [230, 230, 230],
                    textColor: [0, 0, 0],
                    halign: 'right', // Metinleri sağa hizala
                    cellPadding: 2
                },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'center' }, // Miktar ortada olabilir
                    2: { halign: 'center' },
                    3: { halign: 'left' }
                }
            });

            yPos = (docAny.lastAutoTable.finalY || yPos) + 10;
        });

        doc.save(`${title.replace(/ /g, '_')}.pdf`);
        showAlert('PDF başarıyla oluşturuldu.', 'success');
    };

    // Consolidated Excel export function
    const exportReceiptsToExcel = (data: StoreReceiptType[], title: string) => {
        if (!data || data.length === 0) {
            showAlert('Excel oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }
        showAlert('Excel oluşturuluyor...', 'info');
        const workbook = new Excel.Workbook();

        data.forEach(receipt => {
            const worksheetTitle = `Fiş_${receipt.code}`.replace(/[\\/*?:[\]]/g, '_');
            const worksheet = workbook.addWorksheet(worksheetTitle);

            const detailsColumns = ['Malzeme', 'Miktar', 'Birim', 'Açıklama'];
            const totalColumns = detailsColumns.length;

            addExcelHeader(worksheet, title, totalColumns);

            // Add main receipt information
            const totalQuantity = (receipt.storeReceiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);
            const sevkKodu = receipt.storeReceiptDetails?.[0]?.warehouseDispatchDetail?.warehouseDispatchHeaders?.code || '-';

            worksheet.addRow([`Fiş Kodu:`, receipt.code]);
            worksheet.addRow([`Şantiye:`, receipt.store?.name || '-']);
            worksheet.addRow([`Belge Tarihi:`, formatDateDisplay(receipt.docDate)]);
            worksheet.addRow([`Depo:`, receipt.warehouse?.name || '-']);
            worksheet.addRow([`Sevk Kodu:`, sevkKodu]);
            worksheet.addRow([`Durum:`, receipt.status || '-']);
            // worksheet.addRow([`Toplam Miktar:`, totalQuantity]);
            worksheet.addRow([]);

            // Add details table
            const headerRow = worksheet.addRow(detailsColumns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            (receipt.storeReceiptDetails || []).forEach(d => {
                worksheet.addRow([
                    d.item?.name || '-',
                    d.quantity,
                    d.item?.unit?.title || '-',
                    d.description || '-'
                ]);
            });

            worksheet.addRow([]); // Satır boşluğu
            const totalRow = worksheet.addRow(['', 'Toplam Miktar:', totalQuantity.toLocaleString(), '']);

            // Hücreleri birleştirme (Opsiyonel: "Toplam Miktar:" yazısını sola kaydırmak için)
            // Burada B15:B15 (Miktar kolonu) ile C15:C15 (Birim kolonu) birleştirilebilir
            // veya sadece A:B birleştirilebilir. En basit çözüm:
            totalRow.getCell(2).font = { name: 'NotoSans', bold: true };
            totalRow.getCell(3).font = { name: 'NotoSans', bold: true };
            totalRow.getCell(3).alignment = { horizontal: 'left' };

            worksheet.addRow([]);
            addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, totalColumns);

        });

        const fileName = `${title.replace(/ /g, '_')}.xlsx`;
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        });
    };

    // Unified download handler for all/filtered data
    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedReceipts : receiptsList;
        const title = isFiltered ? 'Filtrelenmiş Fişler Raporu' : 'Tüm Fişler Raporu';
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(startDate ? startDate.toISOString() : null)} - ${formatDateDisplay(endDate ? endDate.toISOString() : null)}` : undefined;

        if (format === 'pdf') {
            exportReceiptsToPdf(dataToDownload, title, subtitle);
        } else {
            exportReceiptsToExcel(dataToDownload, title);
        }
    };

    // Unified download handler for a single row
    const handleDownloadSingleReceipt = (format: 'pdf' | 'excel') => {
        if (!selectedReceiptForDownload) return;
        const data = [selectedReceiptForDownload];
        const title = `Fiş Detayları: ${selectedReceiptForDownload.code}`;

        if (format === 'pdf') {
            exportReceiptsToPdf(data, title);
        } else {
            exportReceiptsToExcel(data, title);
        }
        handleCloseRowDownloadModal();
    };
    const handleOpenRowDownloadModal = (receipt: StoreReceiptType) => {
        setSelectedReceiptForDownload(receipt);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleCloseRowDownloadModal = () => {
        setSelectedReceiptForDownload(null);
        setOpenRowDownloadModal(false);
    };

    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                    <Typography variant="h5">Şantiye Fişleri</Typography>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {/* New/Hide Button Logic */}
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Şantiye Fişleri Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    fullWidth={false}
                                    isBlinking={isBlinking}
                                >
                                    Yeni Fiş Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetFormAndState}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}
                        {isStoreHidden && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                                <Button variant="outlined" color="error" onClick={() => navigate(-1)}
                                    endIcon={<IconArrowRight size={20} />}>
                                    Geri Dön
                                </Button>
                            </CustomTooltip>
                        )}

                    </Stack>
                </Stack>
                {/* Form Kayıt/Düzenleme */}
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? `Fiş Düzenle (${editingCode})` : 'Yeni Fiş Oluştur'}</Typography>
                        <Grid container spacing={2}>
                            {/* Şantiye Seçimi */}
                            {!isStoreHidden && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Şantiye</CustomFormLabel>
                                    <Autocomplete
                                        options={storesList}
                                        getOptionLabel={(option) => option.name}
                                        value={selectedStore}
                                        onChange={(_, newValue) => {
                                            setSelectedStore(newValue);
                                            setSelectedDispatch(null);
                                            setReceiptDetails([]);
                                            if (newValue && newValue.workhouse?.id) {
                                                fetchDispatchesByWorkhouseId(newValue.workhouse.id);
                                            } else {
                                                setDispatchesList([]);
                                            }
                                        }}
                                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                                        renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Şantiye Seçin" />}
                                        disabled={!!editingId}
                                    />
                                </Grid>
                            )}
                            {/* Belge Tarihi */}
                            <Grid item xs={12} sm={!isStoreHidden ? 4 : 6}>
                                <CustomFormLabel required>Belge Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        label=""
                                        inputFormat="dd/MM/yyyy"
                                        value={docDate}
                                        onChange={(newValue) => setDocDate(newValue)}
                                        renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            {/* Sevk Belgesi */}
                            <Grid item xs={12} sm={!isStoreHidden ? 4 : 6}>
                                <CustomFormLabel required>Sevk Belgesi</CustomFormLabel>
                                <Autocomplete
                                    options={dispatchesList}
                                    getOptionLabel={(option) => option.code}
                                    value={selectedDispatch}
                                    onChange={(_, newValue) => {
                                        setSelectedDispatch(newValue);
                                        setReceiptDetails([]);

                                        if (newValue && newValue.warehouseDispatchDetails) {
                                            const newDetails = newValue.warehouseDispatchDetails.map(detail => ({
                                                itemId: Number(detail.item.id),
                                                quantity: detail.quantity,
                                                description: detail.description || '',
                                                warehouseDispatchDetailId: Number(detail.id),
                                            }));
                                            setReceiptDetails(newDetails);
                                        }
                                    }}
                                    // ✨ FIX: Critical - Ensure Autocomplete correctly identifies the selected object
                                    isOptionEqualToValue={(option, value) => option.id === value?.id}
                                    renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Sevk Belgesi Seçin" />}
                                    disabled={!selectedStore || !!editingId}
                                />
                            </Grid>
                        </Grid>
                        {/* Receipt Details */}
                        <Box mt={4}>
                            {removedReceiptDetails.length > 0 && (
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
                                        {removedReceiptDetails.map((detail, index) => (
                                            <Chip
                                                key={index}
                                                label={`${detail?.item?.name || 'Undefined'} (${detail.quantity})`}
                                                color="error"
                                                onDelete={() => handleRestoreLastRemoved(index)}
                                                deleteIcon={<IconReload size={18} />}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">Fiş Detayları</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button variant="outlined" startIcon={<IconPlus />} onClick={handleAddReceiptDetail} disabled={!selectedDispatch}>Detay Ekle</Button>
                                </Stack>
                            </Stack>
                            <Grid container spacing={2}>
                                {receiptDetails.map((detail, index) => {
                                    const relatedDispatchDetail = selectedDispatch?.warehouseDispatchDetails.find(d => Number(d.id) === Number(detail.warehouseDispatchDetailId));
                                    const maxQuantity = relatedDispatchDetail ? Number(relatedDispatchDetail.quantity) : 0;
                                    const displayBalance = relatedDispatchDetail ? `(Sevk Miktarı: ${maxQuantity})` : '';

                                    return (
                                        <Grid item xs={12} key={index}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                {/* Malzeme Adı ve Birimi */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', width: '30%', minWidth: '150px' }}>
                                                    <Typography variant="body1" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {relatedDispatchDetail?.item?.name || 'Aradığınız şey bulunamadı.'}
                                                    </Typography>
                                                    {relatedDispatchDetail?.item?.unit?.title && (
                                                        <Chip label={relatedDispatchDetail.item.unit.title} color="secondary" variant="outlined" sx={{ ml: 1 }} />
                                                    )}
                                                </Box>

                                                {/* Miktar */}
                                                <CustomTextField
                                                    type="number"
                                                    placeholder="Miktar"
                                                    value={detail.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'quantity', e.target.value)}
                                                    fullWidth
                                                    sx={{ width: '35%' }}
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">{displayBalance}</InputAdornment>
                                                    }}
                                                />
                                                {/* Açıklama */}
                                                <CustomTextField
                                                    placeholder="Açıklama"
                                                    value={detail.description}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'description', e.target.value)}
                                                    fullWidth
                                                    sx={{ width: '25%' }}
                                                />

                                                {/* Silme Butonu */}
                                                <IconButton color="error" onClick={() => handleRemoveReceiptDetail(index)}>
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
                                    <Button variant="contained" color="info" onClick={editReceipt} disabled={loadingButton}>
                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={handleCancelEdit} disabled={loadingButton}>İptal Et</Button>
                                </>
                            ) : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm alanları doldurarak fişi kaydedin." : ""}>
                                        <span>
                                            <BlinkingButton
                                                variant="contained"
                                                color="success"
                                                onClick={insertReceipt}
                                                disabled={!isFormValid || loadingButton}
                                                isBlinking={isFormValid && !loadingButton}
                                            >
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Fiş Ekle'}
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
                {/* Table */}
                <BlankCard>

                    <Grid item xs={12} mt={2} mr={2}>
                        <Stack direction="row" spacing={2} justifyContent="flex-end" mb={2} mr={2}>
                            {/* Download Filtered Button */}
                            {isFilterActive && hasDownloadPermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Fişler indirin" : ""}>
                                    <BlinkingButton
                                        variant="contained"
                                        color="secondary"
                                        onClick={() => setOpenDownloadFilteredModal(true)}
                                        startIcon={<IconFileDownload />}
                                        isBlinking={true}
                                        disabled={loadingData || displayedReceipts.length === 0}
                                    >
                                        Filtrelenmişi İndir
                                    </BlinkingButton>
                                </CustomTooltip>
                            )}
                            {/* Download All Button */}
                            {hasDownloadPermission && (
                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Şantiye Fişleri indirin" : ""}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={() => setOpenDownloadAllModal(true)}
                                        startIcon={<IconFileDownload />}
                                        disabled={loadingData || receiptsList.length === 0}
                                    >
                                        Tümünü İndir
                                    </Button>
                                </CustomTooltip>
                            )}

                        </Stack>
                    </Grid>
                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="Fiş Ara"
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
                                            onChange={(newValue) => setStartDate(newValue)}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        />
                                        <DatePicker
                                            label="Bitiş Tarihi"
                                            value={endDate}
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
                            <Typography variant="h6" sx={{ ml: 2 }}>Fişler yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table aria-label="receipt table">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Fiş Kodu</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Şantiye Adı</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Belge Tarihi</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Toplam Miktar</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Detaylar</Typography></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedReceipts.length > 0 ? (
                                        paginatedReceipts.map(row => {
                                            // Hesaplama: Toplam Miktar
                                            const totalQuantity = (row.storeReceiptDetails || []).reduce((sum, detail) => sum + Number(detail.quantity), 0);

                                            return (
                                                <TableRow key={row.id}>
                                                    <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{row.store?.name || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.docDate)}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1" fontWeight="bold">{totalQuantity.toLocaleString()}</Typography></StyledTableCell>
                                                    <StyledTableCell>
                                                        <Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} />
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <Button variant="outlined" startIcon={<IconEye />} onClick={() => {
                                                            setDetailsToShow(row.storeReceiptDetails || []);
                                                            setOpenDetailsModal(true);
                                                        }}>
                                                            Görünüm
                                                        </Button>
                                                    </StyledTableCell>
                                                    <StyledTableCell>
                                                        <IconButton onClick={(e) => {
                                                            setSelectedRowForMenu(row);
                                                            setAnchorEl(e.currentTarget);
                                                        }}>
                                                            <IconDots width={18} />
                                                        </IconButton>
                                                        <Menu
                                                            anchorEl={anchorEl}
                                                            open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id}
                                                            onClose={handleCloseMenu}
                                                        >
                                                            {hasDownloadPermission && (
                                                                <MuiMenuItem onClick={() => handleOpenRowDownloadModal(selectedRowForMenu!)}>
                                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir
                                                                </MuiMenuItem>
                                                            )}
                                                            {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                            {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}
                                                        </Menu>
                                                    </StyledTableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={7} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">Hiç fiş bulunamadı.</Typography>
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
                        count={displayedReceipts.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage="Satır başına:"
                    />
                </BlankCard>
            </Box >
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Fiş Detayları</DialogTitle>
                <DialogContent>
                    {detailsToShow.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table aria-label="Ürün detayları tablosu">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Malzeme</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Miktar</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Birim</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailsToShow.length > 0 && (
                                        <>
                                            {detailsToShow.map((detail, index) => (
                                                <TableRow key={detail.id || index}>
                                                    <StyledTableCell><Typography variant="body1">{detail.item?.name || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{detail.quantity || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{detail.item?.unit?.title || '-'}</Typography></StyledTableCell>
                                                    <StyledTableCell><Typography variant="body1">{detail.description || '-'}</Typography></StyledTableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow sx={{ backgroundColor: 'rgb(240, 240, 240)' }}>
                                                <StyledTableCell sx={{ fontWeight: 'bold' }}>Toplam Miktar:</StyledTableCell>
                                                <StyledTableCell sx={{ fontWeight: 'bold' }}>
                                                    {detailsToShow.reduce((sum, detail) => sum + Number(detail.quantity), 0)}
                                                </StyledTableCell>
                                                <StyledTableCell></StyledTableCell>
                                                <StyledTableCell></StyledTableCell>
                                            </TableRow>
                                        </>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Bu fiş için detay bulunamadı.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <DeleteReceipt
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                receiptIdToDelete={receiptIdToDelete}
                receiptCodeToDelete={receiptCodeToDelete}
                onDeleteSuccess={() => fetchReceipts()}
                showAlert={showAlert}
            />

            {/* Download Modals */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Fişleri İndir</DialogTitle>
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
                <DialogTitle>Filtrelenmiş Fişleri İndir</DialogTitle>
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
                            onClick={() => handleDownloadSingleReceipt('pdf')}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadSingleReceipt('excel')}
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

export default ListStoreReceipts;