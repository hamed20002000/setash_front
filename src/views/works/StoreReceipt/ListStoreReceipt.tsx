// src/views/warehouses/ListStoreReceipts.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Typography, Menu, MenuItem, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Autocomplete, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconPlus, IconArrowRight, IconEye, IconReload, IconX } from '@tabler/icons-react';
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
    warehouseDispatchHeaders: {
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
    const openMenu = Boolean(anchorEl);

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

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const isStoreHidden = useMemo(() => !!routeStoreId, [routeStoreId]);

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

    const fetchDispatchesByWorkhouseId = useCallback(async (workhouseId: string) => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + `get-warehouse-dispatches-by-workhouse-id/${Number(workhouseId)}`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setDispatchesList(response.data.data.filter((d: DispatchType) => d.recordStatus === 0));
            } else {
                showAlert(response.data.message || 'Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e) {
            showAlert('Sevk belgeleri yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert, authToken]);


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

    useEffect(() => {
        const filteredBySearchAndStatus = receiptsList.filter(r => {
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
        setDisplayedReceipts(filteredBySearchAndStatus);
        setPage(0);
    }, [receiptsList, searchTerm, statusFilter, startDate, endDate]);

    useEffect(() => {
        const isDetailsValid = receiptDetails.length > 0 &&
            receiptDetails.every(d => !!d.itemId && Number(d.quantity) > 0);
        setIsFormValid(!!docDate && !!selectedStore && !!selectedDispatch && isDetailsValid);
    }, [docDate, selectedStore, selectedDispatch, receiptDetails]);

    // Form and UI Handlers
    const resetFormAndState = () => {
        setDocDate(new Date());
        setSelectedStore(null);
        setSelectedDispatch(null);
        setReceiptDetails([]);
        setRemovedReceiptDetails([]);
        setEditingId(null);
        setEditingCode(null);
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

        try {
            setEditingId(selectedRowForMenu.id);
            setEditingCode(selectedRowForMenu.code);
            setDocDate(new Date(selectedRowForMenu.docDate));
            setSelectedStore(selectedRowForMenu.store || null);

            if (selectedRowForMenu.store && selectedRowForMenu.store.workhouse?.id) {
                const dispatchRes = await axios.get(
                    server.baseurl + server.warehouse + `get-warehouse-dispatches-by-workhouse-id/${Number(selectedRowForMenu.store.workhouse.id)}`,
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );
                if (dispatchRes.data.httpStatusCode === 200) {
                    const dispatches = dispatchRes.data.data.filter((d: DispatchType) => d.recordStatus === 0);
                    setDispatchesList(dispatches);
                    const foundDispatch = dispatches.find(
                        (d: DispatchType) => d.id === selectedRowForMenu.warehouseDispatchHeaders?.id
                    );
                    setSelectedDispatch(foundDispatch || null);
                }
            }

            const formattedDetails: FormReceiptDetail[] = (selectedRowForMenu.storeReceiptDetails || []).map(d => ({
                itemId: Number(d.item?.id),
                quantity: d.quantity,
                description: d.description,
                warehouseDispatchDetailId: Number(d.warehouseDispatchDetail?.id),
                item: d.item,
            }));
            setReceiptDetails(formattedDetails);
            setRemovedReceiptDetails([]);

        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Veri yüklenirken bir hata oluştu.', 'error');
        }
        handleCloseMenu();
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
    };

    const handleDownloadAllReceiptsPDF = () => {
        if (!receiptsList || receiptsList.length === 0) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 50;

        (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Şantiye Fişleri Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
        };
        const footer = () => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            const docAny = doc as any;
            const pageCount = docAny.internal.getNumberOfPages();
            doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        };

        receiptsList.forEach((receipt) => {
            if (yPos + 50 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                yPos = 50;
            }
            doc.setFontSize(14);
            doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos);
            yPos += 7;
            doc.text(`Sevk Kodu: ${receipt.warehouseDispatchHeaders?.code || '-'}`, 15, yPos);
            yPos += 7;
            doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos);
            yPos += 15;

            const detailsRows = (receipt.storeReceiptDetails || []).map(d => [
                d.item?.name || '-',
                d.quantity,
                d.item?.unit?.title || '-',
                d.description || '-'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
                body: detailsRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                pageBreak: 'auto',
                didDrawCell: (data: any) => {
                    if (data.cell.section === 'body') {
                        yPos = (data.cell.y + data.cell.height);
                    }
                },
                didDrawPage: () => {
                    header();
                    footer();
                },
                showHead: 'everyPage',
                margin: { top: 50, bottom: 20 }
            });
            yPos += 15;
        });

        doc.save('Tum_Şantiye_Fisleri.pdf');
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    };

    const handleDownloadSingleReceiptPDF = (receipt: StoreReceiptType) => {
        if (!receipt) {
            showAlert('PDF oluşturulacak fiş bulunamadı.', 'warning');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 50;

        (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const header = () => {
            doc.addImage(Logo, 'PNG', 10, 10, 40, 25);
            doc.setFontSize(18);
            doc.text('Şantiye Fiş Raporu', pageWidth - 15, 30, { align: 'right' });
            doc.setFontSize(12);
            doc.text(`Tarih: ${formatDateDisplay(new Date().toISOString())}`, pageWidth - 15, 40, { align: 'right' });
        };
        const footer = () => {
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
            doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            const docAny = doc as any;
            const pageCount = docAny.internal.getNumberOfPages();
            doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
        };

        header();
        footer();

        doc.setFontSize(14);
        doc.text(`Fiş Kodu: ${receipt.code}`, 15, yPos);
        yPos += 7;
        doc.text(`Sevk Kodu: ${receipt.warehouseDispatchHeaders?.code || '-'}`, 15, yPos);
        yPos += 7;
        doc.text(`Belge Tarihi: ${formatDateDisplay(receipt.docDate)}`, 15, yPos);
        yPos += 15;

        const detailsRows = (receipt.storeReceiptDetails || []).map(d => [
            d.item?.name || '-',
            d.quantity,
            d.item?.unit?.title || '-',
            d.description || '-'
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Malzeme', 'Miktar', 'Birim', 'Açıklama']],
            body: detailsRows,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            pageBreak: 'auto',
            didDrawPage: () => {
                header();
                footer();
            },
            showHead: 'everyPage',
            margin: { top: 50, bottom: 20 }
        });

        doc.save(`Fis_${receipt.code}.pdf`);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
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
        if (!isFormValid || !editingId) {
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
            showAlert(e.response?.data?.message || 'Fiş güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleClearDateFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };
    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                    <Typography variant="h5">Şantiye Fişleri</Typography>
                    <Grid spacing={2}>
                        <CustomTooltip style={{ marginLeft: "2px" }} title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button variant="outlined" color="error" onClick={() => navigate(-1)} endIcon={<IconArrowRight size={20} />}>
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Grid>
                </Stack>
                {/* Form Kayıt/Düzenleme */}
                {(hasCreatePermission || hasEditPermission) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Fiş Düzenle' : 'Yeni Fiş Oluştur'}</Typography>
                        <Grid container spacing={2}>
                            {!isStoreHidden && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Şantiye</CustomFormLabel>
                                    <Autocomplete
                                        options={storesList}
                                        getOptionLabel={(option) => option.name}
                                        value={selectedStore}
                                        onChange={(_, newValue) => {
                                            setSelectedStore(newValue);
                                            if (newValue && newValue.workhouse?.id) {
                                                fetchDispatchesByWorkhouseId(newValue.workhouse.id);
                                            } else {
                                                setDispatchesList([]);
                                            }
                                        }}
                                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                                        renderInput={(params) => <TextField {...params} fullWidth size="small" placeholder="Şantiye Seçin" />}
                                        disabled={false}
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12} sm={4}>
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
                            <Grid item xs={12} sm={4}>
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
                                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: '200px' }}>
                                                    <Typography variant="body1" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {relatedDispatchDetail?.item?.name || 'Aradığınız şey bulunamadı.'}
                                                    </Typography>
                                                    {relatedDispatchDetail?.item?.unit?.title && (
                                                        <Chip label={relatedDispatchDetail.item.unit.title} color="secondary" variant="outlined" sx={{ ml: 1 }} />
                                                    )}
                                                </Box>

                                                <CustomTextField
                                                    type="number"
                                                    placeholder="Miktar"
                                                    value={detail.quantity}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'quantity', e.target.value)}
                                                    fullWidth
                                                    InputProps={{
                                                        endAdornment: <InputAdornment position="end">{displayBalance}</InputAdornment>
                                                    }}
                                                />
                                                <CustomTextField
                                                    placeholder="Açıklama"
                                                    value={detail.description}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleReceiptDetailChange(index, 'description', e.target.value)}
                                                    fullWidth
                                                />

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
                            {hasDownloadPermission && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleDownloadAllReceiptsPDF}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData || receiptsList.length === 0}
                                >
                                    Tüm Şantiye Fişleri İndir (PDF)
                                </Button>
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
                            <Typography variant="h6" sx={{ ml: 2 }}>Fişler yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <TableCell><Typography variant="h6">Kod</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Sevk Kodu</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Belge Tarihi</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Durum</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Detaylar</Typography></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedReceipts.length > 0 ? (
                                        displayedReceipts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell><Typography variant="h6">{row.code}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{row.warehouseDispatchHeaders?.code || '-'}</Typography></TableCell>
                                                <TableCell><Typography variant="h6">{formatDateDisplay(row.docDate)}</Typography></TableCell>
                                                <TableCell>
                                                    <Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} />
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="outlined" startIcon={<IconEye />}
                                                        onClick={() => {
                                                            setDetailsToShow(row.storeReceiptDetails || []);
                                                            setOpenDetailsModal(true);
                                                        }}
                                                    >
                                                        Görünüm
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton onClick={(e) => {
                                                        setSelectedRowForMenu(row);
                                                        setAnchorEl(e.currentTarget);
                                                    }}><IconDots width={18} /></IconButton>
                                                    <Menu anchorEl={anchorEl}
                                                        open={openMenu && selectedRowForMenu?.id === row.id}
                                                        onClose={handleCloseMenu}>
                                                        {hasDownloadPermission && (
                                                            <MenuItem onClick={() => {
                                                                handleDownloadSingleReceiptPDF(selectedRowForMenu!);
                                                                handleCloseMenu();
                                                            }}>
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                                PDF'yi İndir
                                                            </MenuItem>
                                                        )}
                                                        {hasEditPermission && <MenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>}
                                                        {hasDeletePermission &&
                                                            <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>}
                                                    </Menu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={6} align="center"><Typography>Hiç fiş bulunamadı.</Typography></TableCell></TableRow>
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
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell><Typography variant="h6">Malzeme</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Miktar</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Birim</Typography></TableCell>
                                        <TableCell><Typography variant="h6">Açıklama</Typography></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {detailsToShow.map((detail, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{detail.item?.name || '-'}</TableCell>
                                            <TableCell>{detail.quantity}</TableCell>
                                            <TableCell>{detail.item?.unit?.title}</TableCell>
                                            <TableCell>{detail.description || '-'}</TableCell>
                                        </TableRow>
                                    ))}
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
        </>
    );
};

export default ListStoreReceipts;