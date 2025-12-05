import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    Stack, Alert, CircularProgress, Button,
    Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Grid,
    TextField,
    Pagination,
    Menu,
    ListItemIcon,
    Autocomplete,
    IconButton,
    MenuItem,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconCurrencyTaka, IconFileSpreadsheet,
    IconRuler,
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import { format } from 'date-fns';

// --- PDF & Excel Exports ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

import Logo from 'src/assets/images/logos/logo.png';


// --- TYPE DEFINITIONS ---

type RecordStatus = 0 | 1 | 2;

interface TenderType {
    id: number; title: string; recordStatus: RecordStatus; createAt: string; status: string;
    tenderStatus: number; approvedTenderText: string; approvedTenderDate: string | null;
    showApprovedIcon: boolean; showRejectedIcon: boolean; showPendingIcon: boolean;
    attachments: any[];
}

interface ItemType {
    id: number; name: string; description: string; abbreviation: string; recordStatus: RecordStatus;
    category: { id: number; name: string; depth: number; recordStatus: RecordStatus; };
    unit: { id: number; title: string; recordStatus: RecordStatus; };
    status: string;
}

interface WorkhouseType {
    id: number; name: string; code: string; address: string; createAt: string; recordStatus: number;
}

// ساختار داده‌ای ردیف گزارش (Row)
interface TenderFlowReportRowType {
    ihale_title: string; ihale_category: string;
    Demontaj: string; DemontajMontaj: string; DemontajMontajPrice: string;
    DemontajTutari: string; MontajPrice: string; item_id: string; item_name: string; unit: string; work_id: string;
    work_name: string; network_title: string; order_no: string;
    order_date: string; order_item_id: string; order_price: string | null; order_qty: string;
    invoice_no: string; invoice_date: string; invoice_itemid: string; invoice_price: string; invoice_qty: string;
    receipt_no: string; receipt_date: string; receipt_item_id: string;
    Quantity: string;
    warehouse_code: string; warehouse_name: string; warhouse_dispatch_code: string;
    warhouse_dispatch_date: string; warhouse_dispatch_item_id: string; warhouse_dispatch_qty: string;
    store_receipt_code: string; store_receipt_date: string; store_receipt_item_id: string;
    store_receipt_qty: string; store_code: string; store_name: string; workhouse_code: string;
    workhouse_name: string;
}

// ساختار داده‌ای اصلی پاسخ API (لایه بیرونی)
interface APIResponseData {
    totalCount: number;
    totalDemontaj: number;
    totalMontaj: number;
    page: number;
    pageSize: number;
    totalPages: number;
    success: boolean;
    data: TenderFlowReportRowType[]; // این آرایه‌ی ردیف‌های جدول است
}

interface FilterParams {
    tenderId: number | null;
    itemId: number | null;
    workhouseId: number | null;
    page: number;
    pageSize: number;
}

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, color: '#171c23', whiteSpace: 'nowrap',
}));


// --- UTILITY FUNCTIONS ---

const parseNumberFromString = (value: string | number | null): number => {
    if (value === null) return 0;
    if (typeof value === 'number') return value;

    const cleanedValue = String(value).replace(/[$,]/g, '').trim();
    const parsed = parseFloat(cleanedValue);

    return isNaN(parsed) ? 0 : parsed;
};

const formatPriceDisplay = (priceString: string | number | null): string => {
    const price = parseNumberFromString(priceString);
    return price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        // ابتدا سعی می‌کند به عنوان DateTime فرمت کند، در غیر این صورت فقط تاریخ
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
            format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
            format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
        return '-';
    }
};


// --- MODAL FOR SINGLE ROW DETAILS (تغییر یافته برای استفاده از لایه درونی data) ---

interface DetailViewModalProps {
    open: boolean;
    onClose: () => void;
    report: TenderFlowReportRowType | null;
    onExportExcel: (report: TenderFlowReportRowType) => Promise<void>;
    onExportPdf: (report: TenderFlowReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;

    const reportTitle = `İhale Akışı Detayları: ${report.ihale_title}`;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={3}>

                    {/* Sütun 1: İhale ve İş Bilgileri */}
                    <Grid item xs={12} md={3}>
                        <Typography variant="h6" mb={1} color="primary">İhale ve İş Bilgileri</Typography>
                        <Stack spacing={1}>
                            <TextField label="İhale Adı" size="small" fullWidth value={report.ihale_title} disabled />
                            <TextField label="İhale Kategori" size="small" fullWidth value={report.ihale_category} disabled />
                            <TextField label="İş Adı" size="small" fullWidth value={report.work_name} disabled />
                            <TextField label="Ağ Başlığı" size="small" fullWidth value={report.network_title} disabled />
                            <TextField label="İhale Kategori ID" size="small" fullWidth value={report.item_id} disabled />
                            <TextField label="İş ID" size="small" fullWidth value={report.work_id} disabled />
                        </Stack>
                    </Grid>

                    {/* Sütun 2: Miktar ve Fiyatlar */}
                    <Grid item xs={12} md={3}>
                        <Typography variant="h6" mb={1} color="warning.main">Miktar ve Fiyatlar</Typography>
                        <Stack spacing={1}>
                            <TextField label="Ürün Adı" size="small" fullWidth value={report.item_name} disabled />
                            <TextField label="Birim" size="small" fullWidth value={report.unit} disabled />
                            <TextField label="Toplam Miktar (Makbuz)" size="small" fullWidth value={parseNumberFromString(report.Quantity)} disabled />
                            <TextField label="Demontaj Miktarı (Net)" size="small" fullWidth value={parseNumberFromString(report.Demontaj)} disabled />
                            <TextField label="Demontaj+Montaj Miktarı" size="small" fullWidth value={parseNumberFromString(report.DemontajMontaj)} disabled />
                            <TextField label="Demontaj Tutarı" size="small" fullWidth value={formatPriceDisplay(report.DemontajTutari)} disabled />
                            <TextField label="Montaj Fiyatı" size="small" fullWidth value={formatPriceDisplay(report.MontajPrice)} disabled />
                            <TextField label="Demontaj+Montaj Fiyatı" size="small" fullWidth value={formatPriceDisplay(report.DemontajMontajPrice)} disabled />
                        </Stack>
                    </Grid>

                    {/* Sütun 3: Sipariş و فاکتور (Fatura) */}
                    <Grid item xs={12} md={3}>
                        <Typography variant="h6" mb={1} color="info">Sipariş ve Fatura Bilgileri</Typography>
                        <Stack spacing={1}>
                            <TextField label="Sipariş No" size="small" fullWidth value={report.order_no} disabled />
                            <TextField label="Sipariş Tarihi" size="small" fullWidth value={formatDateDisplay(report.order_date)} disabled />
                            <TextField label="Sipariş Ürün ID" size="small" fullWidth value={report.order_item_id} disabled />
                            <TextField label="Sipariş Miktarı" size="small" fullWidth value={parseNumberFromString(report.order_qty)} disabled />
                            <TextField label="Fatura No" size="small" fullWidth value={report.invoice_no} disabled />
                            <TextField label="Fatura Tarihi" size="small" fullWidth value={formatDateDisplay(report.invoice_date)} disabled />
                            <TextField label="Fatura Ürün ID" size="small" fullWidth value={report.invoice_itemid} disabled />
                            <TextField label="Fatura Fiyatı" size="small" fullWidth value={formatPriceDisplay(report.invoice_price)} disabled />
                            <TextField label="Fatura Miktarı" size="small" fullWidth value={parseNumberFromString(report.invoice_qty)} disabled />
                        </Stack>
                    </Grid>

                    {/* Sütun 4: انبار (Ambar) و Sevk Akışı */}
                    <Grid item xs={12} md={3}>
                        <Typography variant="h6" mb={1} color="success.main">Ambar ve Sevk Akışı</Typography>
                        <Stack spacing={1}>
                            <TextField label="Şantiye Adı" size="small" fullWidth value={`${report.workhouse_name} (${report.workhouse_code})`} disabled />
                            <TextField label="Ambar Adı" size="small" fullWidth value={`${report.warehouse_name} (${report.warehouse_code})`} disabled />
                            <TextField label="Ambar Sevk Kodu" size="small" fullWidth value={report.warhouse_dispatch_code} disabled />
                            <TextField label="Ambar Sevk Tarihi" size="small" fullWidth value={formatDateDisplay(report.warhouse_dispatch_date)} disabled />
                            <TextField label="Ambar Sevk Miktarı" size="small" fullWidth value={parseNumberFromString(report.warhouse_dispatch_qty)} disabled />
                            <TextField label="Ambar Makbuz Kodu" size="small" fullWidth value={report.store_receipt_code} disabled />
                            <TextField label="Ambar Makbuz Tarihi" size="small" fullWidth value={formatDateDisplay(report.store_receipt_date)} disabled />
                            <TextField label="Ambar Makbuz Miktarı" size="small" fullWidth value={parseNumberFromString(report.store_receipt_qty)} disabled />
                            <TextField label="Ambar Stok Adı" size="small" fullWidth value={`${report.store_name} (${report.store_code})`} disabled />
                        </Stack>
                    </Grid>

                    {/* Export Section */}
                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Raporu İndir</Typography>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                                onClick={() => onExportPdf(report)} fullWidth>
                                PDF Olarak İندیر (Tüm Detaylar)
                            </Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                                onClick={() => onExportExcel(report)} fullWidth>
                                Excel Olarak İندیر (Tüm Detaylar)
                            </Button>
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};


// --- MAIN COMPONENT ---
const ListTenderFlowReport = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // --- State Definitions ---
    const [searchTrigger, setSearchTrigger] = useState(0);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        tenderId: null,
        itemId: null,
        workhouseId: null,
        page: 1,
        pageSize: 10,
    });

    // اینجا باید ساختار را به APIResponseData تغییر دهیم
    const [reportData, setReportData] = useState<APIResponseData | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Dropdown States
    const [tendersList, setTendersList] = useState<TenderType[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);


    // Menu/Modal States
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<TenderFlowReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<TenderFlowReportRowType | null>(null);


    // --- Utility Callbacks ---
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);
    const clearAlert = () => { setAlertMessage(null); };

    const handleApiError = useCallback((e: any, defaultMessage: string = 'Bir hata oluştu.') => {
        if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu، lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
        else if (e.response?.status === 500) { showAlert('Sistem hatası oluştu، lütfen deneyin.', 'error'); }
        else { console.error("API Error:", e); showAlert(e.response?.data?.message || defaultMessage, 'error'); }
    }, [navigate, showAlert]);

    const handleFilterChange = (name: keyof FilterParams, value: any) => {
        setFilterParams(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handleSearchClick = () => {
        if (filterParams.page !== 1) {
            setFilterParams(prev => ({ ...prev, page: 1 }));
        }
        setSearchTrigger(prev => prev + 1);
    };

    // --- Menu/Modal Handlers ---
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: TenderFlowReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleOpenDetailViewModal = (report: TenderFlowReportRowType) => {
        setSelectedReportToDownload(report);
        setOpenDetailViewModal(true);
        handleCloseMenu();
    };
    const handleCloseDetailViewModal = () => {
        setOpenDetailViewModal(false);
        setSelectedReportToDownload(null);
    };
    // ------------------------------------

    // --- Data Fetching (Dropdowns & Main) ---

    // 1. Fetch Tenders 
    const getListTender = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const result = await axios.request({
                baseURL: server.baseurl + server.initialoperations + "get-tenders",
                method: "get",
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });

            if (result.data.httpStatusCode === 200) {
                const formattedData: TenderType[] = result.data.data.map((item: any) => {
                    let recordStatusText = item.recordStatus === 0 ? 'Aktif' : 'Pasif';
                    let approvedTenderText = '';
                    let approvedTenderDate = null;
                    let showApprovedIcon = false;
                    let showRejectedIcon = false;
                    let showPendingIcon = false;
                    if (item.status === 0) { approvedTenderText = 'Beklemede'; showPendingIcon = true; }
                    else if (item.status === 1) { approvedTenderText = 'Onaylandı'; showApprovedIcon = true; approvedTenderDate = item.statusDate; }
                    else if (item.status === 2) { approvedTenderText = 'Reddedildi'; showRejectedIcon = true; approvedTenderDate = item.statusDate; }

                    return {
                        id: item.id, title: item.title, recordStatus: item.recordStatus, createAt: item.createAt,
                        status: recordStatusText, tenderStatus: item.status, approvedTenderText: approvedTenderText,
                        approvedTenderDate: approvedTenderDate, showApprovedIcon: showApprovedIcon,
                        showRejectedIcon: showRejectedIcon, showPendingIcon: showPendingIcon, attachments: item.attachments || [],
                    };
                });
                setTendersList(formattedData.filter(t => t.recordStatus === 0));
            } else {
                showAlert(result.data.message || 'İhale listesi alınırken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            handleApiError(e, 'İhale listesi yüklenirken bir hata oluştu، lütfen tekrar deneyin.');
        }
    }, [navigate, authToken, showAlert, handleApiError]);


    // 2. Fetch Items
    const getItemsList = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", {
                headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            if (response.data && response.data.success) {
                const processedData: ItemType[] = response.data.data.filter((item: any) => item.recordStatus === 0).map((item: any) => ({
                    id: item.id, name: item.name, description: item.description, abbreviation: item.abbreviation,
                    recordStatus: item.recordStatus ?? 0,
                    category: item.category,
                    unit: item.unit,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                }));
                setItemsList(processedData);
            } else {
                showAlert('Ürünler yüklenmedi.', 'error');
            }
        } catch (e: any) {
            handleApiError(e, 'Ürünler sunucudan alınamadı');
        }
    }, [navigate, authToken, showAlert, handleApiError]);


    // 3. Fetch Workhouses
    const getWorkhousesList = useCallback(async () => {
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );
            if (response.data.httpStatusCode === 200) {
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else {
                showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
            }
        } catch (e: any) { handleApiError(e, 'Şantiye listesi alınamadı.'); }
    }, [navigate, authToken, showAlert, handleApiError]);


    const fetchTenderFlowReportData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }

        const requestParams = {
            tenderId: filterParams.tenderId || null,
            itemId: filterParams.itemId || null,
            workhouseId: filterParams.workhouseId || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize,
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-tender-flow-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.success && response.data.data) {
                // **اصلاحیه کلیدی:** ذخیره لایه درونی data که شامل totalCount و آرایه‌ی ردیف‌ها است
                setReportData(response.data.data as APIResponseData);
            } else {
                setReportData(null);
                showAlert(response.data.message || 'İhale akış raporu verileri alınamadı.', 'error');
            }
        } catch (e: any) {
            setReportData(null);
            handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.');
        } finally {
            setLoadingData(false);
        }
    }, [filterParams, navigate, authToken, showAlert, handleApiError]);


    // --- Effects for Data Loading ---

    useEffect(() => {
        getListTender();
        getItemsList();
        getWorkhousesList();
        fetchTenderFlowReportData();
    }, [getListTender, getItemsList, getWorkhousesList, fetchTenderFlowReportData]);

    useEffect(() => {
        if (searchTrigger > 0 || filterParams.page !== 1) {
            fetchTenderFlowReportData();
        }
    }, [searchTrigger, filterParams.page, fetchTenderFlowReportData]); // اضافه شدن fetchTenderFlowReportData به وابستگی


    // --- Handlers for Pagination & Export ---
    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setFilterParams(prev => ({ ...prev, page: value }));
    };

    // A new function to add a header to the PDF document
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const docAny = doc as any;

        // Add company logo at the top-right
        docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);

        // Add report title at the center
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 35, { align: 'center' });

        // Add report date at the top-left
        doc.setFontSize(10);
        doc.setFont('NotoSans', 'normal');
        doc.text(`Rapor Tarihi:`, 15, 50);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 85, 50);
    };

    // A new function to add a footer to the PDF document
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
            footerY += 10;
        });
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        const docAny = doc as any;
        const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };


    const handleExportPdfSingle = async (report: TenderFlowReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor، lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            const reportTitle = `İhale Akış Detay Raporu: ${report.item_name}`;
            addPdfHeader(doc, reportTitle); // false for Portrait

            const tableColumn = ["Alan", "Değer"];
            const tableRows = [
                ["İhale Başlığı", report.ihale_title], ["İhale Kategori", report.ihale_category],
                ["Ürün Adı", report.item_name], ["Birim", report.unit],
                ["Demontaj Miktarı", parseNumberFromString(report.Demontaj)],
                ["Demontaj + Montaj Miktarı", parseNumberFromString(report.DemontajMontaj)],
                ["Demontaj Tutarı", formatPriceDisplay(report.DemontajTutari)],
                ["Montaj Fiyatı", formatPriceDisplay(report.MontajPrice)],
                ["D+M Fiyatı", formatPriceDisplay(report.DemontajMontajPrice)],
                ["Sipariş No", report.order_no], ["Sipariş Tarihi", formatDateDisplay(report.order_date)],
                ["Sipariş Miktarı", parseNumberFromString(report.order_qty)],
                ["Fatura No", report.invoice_no], ["Fatura Tarihi", formatDateDisplay(report.invoice_date)],
                ["Fatura Fiyatı", formatPriceDisplay(report.invoice_price)],
                ["Fatura Miktarı", parseNumberFromString(report.invoice_qty)],
                ["Şantiye", report.workhouse_name], ["Ambar", report.warehouse_name],
                ["Ambar Sevk Kodu", report.warhouse_dispatch_code], ["Ambar Sevk Tarihi", formatDateDisplay(report.warhouse_dispatch_date)],
                ["Ambar Sevk Miktarı", parseNumberFromString(report.warhouse_dispatch_qty)],
                ["Ambar Makbuz Kodu", report.store_receipt_code], ["Ambar Makbuz Tarihi", formatDateDisplay(report.store_receipt_date)],
                ["Ambar Makbuz Miktarı", parseNumberFromString(report.store_receipt_qty)],
                ["Toplam Miktar (Makbuz)", parseNumberFromString(report.Quantity)],
            ];

            autoTable(doc, {
                startY: 70,
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 9, cellPadding: 5, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },

                // نمایش جمع‌بندی قیمتی در پاورقی جدول جزئیات
                foot: [
                    ['Demontaj Tutarı', formatPriceDisplay(report.DemontajTutari)],
                    ['Montaj Fiyatı', formatPriceDisplay(report.MontajPrice)],
                    ['Demontaj+Montaj Fiyatı', formatPriceDisplay(report.DemontajMontajPrice)],
                ],
                footStyles: {
                    fillColor: [240, 250, 240],
                    textColor: [0, 0, 0],
                    fontStyle: "normal",
                    fontSize: 9
                },

                didDrawPage: (_data) => {
                    addPdfFooter(doc);
                }
            });

            doc.save(`İhale_Akış_Detay_${report.item_name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };
    // 2. Export Excel Single (Detay - شامل تمام فیلدها)
    const handleExportExcelSingle = async (report: TenderFlowReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('Excel raporu hazırlanıyor، لطفاً bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('İhale Akış Detay', { views: [{ rightToLeft: false }] });

            const data = [
                ['İhale Başlığı', report.ihale_title], ['İhale Kategori', report.ihale_category],
                ['Ürün Adı', report.item_name], ['Birim', report.unit],
                ['Demontaj Miktarı', parseNumberFromString(report.Demontaj)],
                ['Demontaj + Montaj Miktarı', parseNumberFromString(report.DemontajMontaj)],
                ['Demontaj Tutarı', parseNumberFromString(report.DemontajTutari)],
                ['Montaj Fiyatı', parseNumberFromString(report.MontajPrice)],
                ['D+M Fiyatı', parseNumberFromString(report.DemontajMontajPrice)],
                ['Sipariş No', report.order_no], ['Sipariş Tarihi', formatDateDisplay(report.order_date)],
                ['Sipariş Miktarı', parseNumberFromString(report.order_qty)],
                ['Fatura No', report.invoice_no], ['Fatura Tarihi', formatDateDisplay(report.invoice_date)],
                ['Fatura Fiyatı', parseNumberFromString(report.invoice_price)],
                ['Fatura Miktarı', parseNumberFromString(report.invoice_qty)],
                ['Şantiye', report.workhouse_name], ['Ambar', report.warehouse_name],
                ['Ambar Sevk Kodu', report.warhouse_dispatch_code], ['Ambar Sevk Tarihi', formatDateDisplay(report.warhouse_dispatch_date)],
                ['Ambar Sevk Miktarı', parseNumberFromString(report.warhouse_dispatch_qty)],
                ['Ambar Makbuz Kodu', report.store_receipt_code], ['Ambar Makbuz Tarihi', formatDateDisplay(report.store_receipt_date)],
                ['Ambar Makbuz Miktarı', parseNumberFromString(report.store_receipt_qty)],
                ['Toplam Miktar (Makbuz)', parseNumberFromString(report.Quantity)],
            ];

            const titleRow = sheet.addRow([`İhale Akış Raporu Detayı: ${report.ihale_title}`]);
            titleRow.font = { name: 'Calibri', size: 14, bold: true };
            sheet.mergeCells('A1:B1'); sheet.addRow([]);

            const headerRow = sheet.addRow(['Alan', 'Değer']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                const fieldName = row[0] as string;

                if (fieldName.includes('Tutarı') || fieldName.includes('Fiyatı')) { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
                else if (fieldName.includes('Miktarı') || fieldName.includes('Miktar')) { newRow.getCell(2).numFmt = '#,##0.00'; }
            });

            sheet.columns[0].width = 30; sheet.columns[1].width = 40;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `İhale_Akış_Detay_${report.item_name}_${format(new Date(), 'yyyyMMdd')}.xlsx`);

            showAlert('Excel raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportPdfAll = () => {
        if (!reportData || reportData.data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }

        showAlert('Genel PDF raporu hazırlanıyor، lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, "İhale Akış Genel Raporu"); // true for Landscape

            const tableColumn = [
                "İhale", "Ürün", "Şantiye", "Ambar", "Sipariş Tarihi", "Toplam Miktar", "Demontaj Tutarı"
            ];

            const tableRows = reportData.data.map(row => [
                row.ihale_title,
                row.item_name,
                row.workhouse_name,
                row.warehouse_name,
                formatDateDisplay(row.order_date),
                parseNumberFromString(row.Quantity) + ` (${row.unit})`,
                formatPriceDisplay(row.DemontajTutari),
            ]);

            // تنظیمات جدول
            autoTable(doc, {
                startY: 65, // ارتفاع شروع جدول تنظیم شد (بعد از Header)
                margin: { top: 65 },
                head: [tableColumn], body: tableRows, theme: 'striped',
                styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 8, cellPadding: 5, },
                headStyles: { fillColor: [30, 100, 120], textColor: 255 },

                // نمایش جمع کل در Footer جدول
                foot: [
                    ['', '', '', '', 'TOPLAM DEMONTAJ', '', formatPriceDisplay(reportData.totalDemontaj ?? 0)],
                    ['', '', '', '', 'TOPLAM MONTAJ', '', formatPriceDisplay(reportData.totalMontaj ?? 0)],
                ],
                footStyles: {
                    fillColor: [230, 240, 245],
                    textColor: [0, 0, 0],
                    fontStyle: 'normal',
                    fontSize: 9
                },

                didDrawPage: (_data) => {
                    addPdfFooter(doc);
                }
            });

            doc.save(`İhale_Akış_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            showAlert('Genel PDF raporu başarıyla oluşturuldu و indiriliyor.', 'success');
        } catch (e) {
            handleApiError(e, 'Genel PDF raporu oluşturulurken bir hata oluştu.');
        }
    }
    // 4. Export Excel All (Genel)
    const handleExportExcelAll = async () => {
        if (!reportData || reportData.data.length === 0) {
            showAlert('Rapor indirilemedi: Tabloda veri bulunmamaktadır.', 'warning');
            return;
        }

        showAlert('Genel Excel raporu hazırlanıyor، لطفاً bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('İhale Akış Genel Raporu', { views: [{ rightToLeft: false }] });

            const data = reportData.data.map(row => [
                row.ihale_title,
                row.item_name,
                row.workhouse_name,
                row.warehouse_name,
                formatDateDisplay(row.order_date),
                parseNumberFromString(row.Quantity), // مقدار عددی برای اکسل
                parseNumberFromString(row.DemontajTutari), // مقدار عددی برای اکسل
            ]);

            const headerRowData = ["İhale", "Ürün", "Şantiye", "Ambar", "Sipariş Tarihi", `Toplam Miktar (${reportData.data[0]?.unit ?? ''})`, "Demontaj Tutarı"];

            sheet.addRow(["İhale Akış Genel Raporu"]);
            sheet.mergeCells('A1:G1'); sheet.getRow(1).font = { bold: true, size: 14 };
            sheet.addRow(["Toplam Kayıt:", reportData.totalCount, "Toplam Demontaj:", parseNumberFromString(reportData.totalDemontaj ?? 0), "Toplam Montaj:", parseNumberFromString(reportData.totalMontaj ?? 0)]);
            sheet.getRow(2).getCell(4).numFmt = '₺ #,##0.00';
            sheet.getRow(2).getCell(6).numFmt = '₺ #,##0.00';
            sheet.addRow([]);

            const headerRow = sheet.addRow(headerRowData);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0E6F0' } };
                cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach(row => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => {
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
                newRow.getCell(6).numFmt = '#,##0.00';
                newRow.getCell(7).numFmt = '₺ #,##0.00';
            });

            sheet.columns.forEach((column, index) => {
                const minWidth = (index === 0 || index === 1) ? 30 : 18;
                column.width = minWidth;
            });


            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `İhale_Akış_Genel_Rapor_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

            showAlert('Genel Excel raporu başarıyla oluşturuldu و indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'Genel Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const tableHeaders = [
        { label: 'İhale', key: 'ihale_title' },
        { label: 'Ürün', key: 'item_name' },
        { label: 'Şantiye', key: 'workhouse_name' },
        { label: 'Sipariş Tarihi', key: 'order_date' },
        { label: 'Ambar', key: 'warehouse_name' },
        { label: 'Toplam Miktar', key: 'quantity' },
        { label: 'Demontaj Tutarı', key: 'demontajTutari' },
        { label: 'İşlemler', key: 'actions' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconCurrencyTaka size={28} style={{ marginRight: 8 }} /> İhale Akış Raporu
            </Typography>

            {/* --- Alert Section --- */}
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            {/* --- Filter Section --- */}
            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>

                    {/* Tender (İhale) */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Autocomplete
                            id="tender-select"
                            options={tendersList}
                            getOptionLabel={(o) => `${o.title} (${o.approvedTenderText})`}
                            value={tendersList.find(t => t.id === filterParams.tenderId) || null}
                            onChange={(_, newValue) => handleFilterChange('tenderId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="İhale Seçiniz" fullWidth size="small" />)}
                        />
                    </Grid>

                    {/* Item (Ürün) */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Autocomplete
                            id="item-select"
                            options={itemsList}
                            getOptionLabel={(o) => `${o.name} (${o.abbreviation})`}
                            value={itemsList.find(i => i.id === filterParams.itemId) || null}
                            onChange={(_, newValue) => handleFilterChange('itemId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="Ürün Seçiniz" fullWidth size="small" />)}
                        />
                    </Grid>

                    {/* Workhouse (Şantiye) */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Autocomplete
                            id="workhouse-select"
                            options={workhousesList}
                            getOptionLabel={(o) => `${o.name} (${o.code})`}
                            value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
                            onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="Şantiye" fullWidth size="small" />)}
                        />
                    </Grid>
                </Grid>

                {/* Search Button & General Export Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
                    <Stack direction="row" spacing={2}>
                        {/* دانلود کلی */}
                        <Button variant="outlined" color="success" startIcon={<IconFileDownload />}
                            onClick={handleExportPdfAll} disabled={loadingData || !reportData?.data?.length}>
                            Genel PDF İndir
                        </Button>
                        <Button variant="outlined" color="primary" startIcon={<IconFileSpreadsheet />}
                            onClick={handleExportExcelAll} disabled={loadingData || !reportData?.data?.length}>
                            Genel Excel İndir
                        </Button>
                    </Stack>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<IconSearch size={20} />}
                        onClick={handleSearchClick}
                        disabled={loadingData}
                    >
                        Filtreyi Uygula
                    </Button>
                </Box>
            </BlankCard>
            <Box sx={{ margin: "20px 0" }}></Box>

            {/* --- Data Table --- */}
            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="tender flow report table">
                        <TableHead style={{ background: "#f0f0f0" }}>
                            {tableHeaders.map((header) => (
                                <StyledTableCell
                                    key={header.key}
                                    // **اعمال عرض 120px به ستون İşlemler**
                                    sx={header.key === 'item_name' ? { width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}}

                                >
                                    <Typography variant="h6" fontWeight="bold">
                                        {header.label}
                                    </Typography>
                                </StyledTableCell>
                            ))}
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : reportData?.data?.length ? (
                                reportData.data.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>{row.ihale_title}</StyledTableCell>
                                        <StyledTableCell sx={{ width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'normal', wordBreak: 'break-word' }}>

                                            {row.item_name}</StyledTableCell>
                                        <StyledTableCell>{row.workhouse_name}</StyledTableCell>
                                        <StyledTableCell>{formatDateDisplay(row.order_date)}</StyledTableCell>
                                        <StyledTableCell>{row.warehouse_name}</StyledTableCell>
                                        <StyledTableCell>{parseNumberFromString(row.Quantity)} ({row.unit})</StyledTableCell>
                                        <StyledTableCell>
                                            <Typography color="primary" fontWeight="bold">
                                                {formatPriceDisplay(row.DemontajTutari)}
                                            </Typography>
                                        </StyledTableCell>

                                        {/* Actions Column (Menu) */}
                                        <StyledTableCell>
                                            <Tooltip title="Detaylar ve İşlemler">
                                                <IconButton
                                                    id={`actions-button-${index}`}
                                                    onClick={(event) => handleClickMenu(event, row)}
                                                    color="secondary"
                                                    size="small"
                                                >
                                                    <IconDots width={20} />
                                                </IconButton>
                                            </Tooltip>

                                            <Menu
                                                id="actions-menu" anchorEl={anchorEl}
                                                open={openMenu && selectedRowForMenu === row}
                                                onClose={handleCloseMenu}
                                            >
                                                <MenuItem onClick={() => handleOpenDetailViewModal(row)}>
                                                    <ListItemIcon><IconRuler width={18} /></ListItemIcon>
                                                    Detayları Görüntüle
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportPdfSingle(row)}>
                                                    <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                    PDF İndir
                                                </MenuItem>
                                                <MenuItem onClick={() => handleExportExcelSingle(row)}>
                                                    <ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon>
                                                    Excel İndir
                                                </MenuItem>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun ihale akış raporu bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination and Totals */}
                <>
                    {reportData && reportData.totalPages > 1 && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Pagination
                                count={reportData.totalPages} page={filterParams.page} onChange={handlePageChange}
                                color="primary" showFirstButton showLastButton
                            />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                Toplam: {reportData.totalCount} kayıt
                            </Typography>
                        </Box>
                    )}
                    {reportData && (
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
                            <Typography variant="h6" color="secondary">
                                Toplam Demontaj: {formatPriceDisplay(reportData.totalDemontaj ?? 0)}
                            </Typography>
                            <Typography variant="h6" color="success.main">
                                Toplam Montaj: {formatPriceDisplay(reportData.totalMontaj ?? 0)}
                            </Typography>
                        </Box>
                    )}
                </>
            </BlankCard>

            {/* --- Modal --- */}
            <DetailViewModal
                open={openDetailViewModal} onClose={handleCloseDetailViewModal}
                report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle}
            />

        </Box>
    );
};

export default ListTenderFlowReport;