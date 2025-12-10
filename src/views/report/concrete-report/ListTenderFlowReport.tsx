import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
    Menu,
    ListItemIcon,
    Autocomplete,
    IconButton,
    MenuItem,
    InputAdornment,
    TableSortLabel,
    TablePagination, // ✅ اضافه شده
    TableFooter // ✅ اضافه شده
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

import "./style.css"
// --- PDF & Excel Exports ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import Logo from 'src/assets/images/logos/logo.png';


// --- STYLES ---
const visuallyHiddenStyle = {
    border: 0, clip: 'rect(0 0 0 0)', height: '1px', margin: -1,
    overflow: 'hidden', padding: 0, position: 'absolute',
    whiteSpace: 'nowrap', width: '1px',
};


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontStyle: 'normal', fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, whiteSpace: 'nowrap',
}));


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

interface TenderFlowReportRowType {
    ihale_title: string;
    ihale_category: string;
    Demontaj: string;
    DemontajMontaj: string;
    DemontajMontajPrice: string;
    DemontajTutari: string;
    MontajPrice: string;
    DemontajPrice: string;
    item_id: string;
    item_name: string;
    unit: string;
    work_id: string;
    work_name: string;
    network_title: string;
    order_no: string;
    order_date: string;
    order_item_id: string;
    order_price: string | null;
    order_qty: string;
    invoice_no: string;
    invoice_date: string;
    invoice_itemid: string;
    invoice_price: string;
    invoice_qty: string;
    receipt_no: string;
    receipt_date: string;
    receipt_item_id: string;
    Quantity: string;
    warehouse_code: string;
    warehouse_name: string;
    warhouse_dispatch_code: string;
    warhouse_dispatch_date: string;
    warhouse_dispatch_item_id: string;
    warhouse_dispatch_qty: string;
    store_receipt_code: string;
    store_receipt_date: string;
    store_receipt_item_id: string;
    store_receipt_qty: string;
    store_code: string;
    store_name: string;
    workhouse_code: string;
    workhouse_name: string;
}

interface APIResponseData {
    totalCount: number;
    totalDemontaj: number;
    totalMontaj: number;
    totalDemontajMontaj: number; // Sum 3
    page: number;
    pageSize: number;
    totalPages: number;
    success: boolean;
    data: TenderFlowReportRowType[];
}

interface FilterParams {
    tenderId: number | null;
    itemId: number | null;
    workhouseId: number | null;
    page: number;
    pageSize: number;
}

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
    return price.toLocaleString('us-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
            format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
            format(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
        return '-';
    }
};

// --- SORTING HELPERS ---
type Order = 'asc' | 'desc';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    let aValue: any = a[orderBy];
    let bValue: any = b[orderBy];

    const numericFields = [
        'Quantity', 'Demontaj', 'DemontajMontaj',
        'DemontajMontajPrice', 'DemontajTutari', 'MontajPrice', 'DemontajPrice'
    ];

    if (numericFields.includes(orderBy as string)) {
        aValue = parseNumberFromString(aValue);
        bValue = parseNumberFromString(bValue);
    } else {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
    }

    if (bValue < aValue) return -1;
    if (bValue > aValue) return 1;
    return 0;
}

function getComparator<Key extends keyof any>(
    order: Order,
    orderBy: Key,
): (a: { [key in Key]: any }, b: { [key in Key]: any }) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}


// --- MODAL ---
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

                    {/* Sütun 4: انبار ( Depo) و Sevk Akışı */}
                    <Grid item xs={12} md={3}>
                        <Typography variant="h6" mb={1} color="success.main"> Depo ve Sevk Akışı</Typography>
                        <Stack spacing={1}>
                            <TextField label="Şantiye Adı" size="small" fullWidth value={`${report.workhouse_name} (${report.workhouse_code})`} disabled />
                            <TextField label=" Depo Adı" size="small" fullWidth value={`${report.warehouse_name} (${report.warehouse_code})`} disabled />
                            <TextField label=" Depo Sevk Kodu" size="small" fullWidth value={report.warhouse_dispatch_code} disabled />
                            <TextField label=" Depo Sevk Tarihi" size="small" fullWidth value={formatDateDisplay(report.warhouse_dispatch_date)} disabled />
                            <TextField label=" Depo Sevk Miktarı" size="small" fullWidth value={parseNumberFromString(report.warhouse_dispatch_qty)} disabled />
                            <TextField label=" Depo Makbuz Kodu" size="small" fullWidth value={report.store_receipt_code} disabled />
                            <TextField label=" Depo Makbuz Tarihi" size="small" fullWidth value={formatDateDisplay(report.store_receipt_date)} disabled />
                            <TextField label=" Depo Makbuz Miktarı" size="small" fullWidth value={parseNumberFromString(report.store_receipt_qty)} disabled />
                            <TextField label=" Depo Stok Adı" size="small" fullWidth value={`${report.store_name} (${report.store_code})`} disabled />
                        </Stack>
                    </Grid>

                    {/* Export Section */}
                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Raporu İndir</Typography>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                                onClick={() => onExportPdf(report)} fullWidth>
                                PDF Olarak İndir (Tüm Detaylar)
                            </Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                                onClick={() => onExportExcel(report)} fullWidth>
                                Excel Olarak İndir (Tüm Detaylar)
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

    const [searchTerm, setSearchTerm] = useState('');
    const [order, setOrder] = useState<Order>('asc');
    const [orderBy, setOrderBy] = useState<keyof TenderFlowReportRowType>('ihale_title');

    // ✅ Client Side Pagination States
    const [page, setPage] = useState(0); // MUI TablePagination starts at 0
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        tenderId: null, itemId: null, workhouseId: null, page: 1, pageSize: 1000, // ✅ دریافت 1000 تایی
    });

    const [reportData, setReportData] = useState<APIResponseData | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [tendersList, setTendersList] = useState<TenderType[]>([]);
    const [itemsList, setItemsList] = useState<ItemType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<TenderFlowReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<TenderFlowReportRowType | null>(null);


    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);
    const clearAlert = () => { setAlertMessage(null); };

    const handleApiError = useCallback((e: any, defaultMessage: string = 'Bir hata oluştu.') => {
        if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
        else if (e.response?.status === 500) { showAlert('Sistem hatası oluştu, lütfen deneyin.', 'error'); }
        else { console.error("API Error:", e); showAlert(e.response?.data?.message || defaultMessage, 'error'); }
    }, [navigate, showAlert]);

    const handleFilterChange = (name: keyof FilterParams, value: any) => {
        setFilterParams(prev => ({ ...prev, [name]: value, page: 1 }));
    };

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

    const getListTender = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const result = await axios.get(server.baseurl + server.initialoperations + "get-tenders", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (result.data.httpStatusCode === 200) {
                const formattedData: TenderType[] = result.data.data.map((item: any) => ({
                    id: item.id, title: item.title, recordStatus: item.recordStatus, createAt: item.createAt,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif', tenderStatus: item.status,
                    approvedTenderText: item.status === 1 ? 'Onaylandı' : 'Beklemede',
                    approvedTenderDate: item.statusDate, showApprovedIcon: item.status === 1,
                    showRejectedIcon: item.status === 2, showPendingIcon: item.status === 0, attachments: item.attachments || [],
                }));
                setTendersList(formattedData.filter(t => t.recordStatus === 0));
            }
        } catch (e: any) { handleApiError(e, 'İhale listesi yüklenirken hata oluştu.'); }
    }, [navigate, authToken, handleApiError]);

    const getItemsList = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-item", { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data && response.data.success) {
                const processedData: ItemType[] = response.data.data.filter((item: any) => item.recordStatus === 0).map((item: any) => ({
                    id: item.id, name: item.name, description: item.description, abbreviation: item.abbreviation,
                    recordStatus: item.recordStatus ?? 0, category: item.category, unit: item.unit, status: item.recordStatus === 0 ? 'Aktif' : 'Pasif',
                }));
                setItemsList(processedData);
            }
        } catch (e: any) { handleApiError(e, 'Ürünler sunucudan alınamadı'); }
    }, [navigate, authToken, handleApiError]);

    const getWorkhousesList = useCallback(async () => {
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });
            if (response.data.httpStatusCode === 200) {
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            }
        } catch (e: any) { handleApiError(e, 'Şantiye listesi alınamadı.'); }
    }, [navigate, authToken, handleApiError]);


    const fetchTenderFlowReportData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        const requestParams = {
            tenderId: filterParams.tenderId || null,
            itemId: filterParams.itemId || null,
            workhouseId: filterParams.workhouseId || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize, // 1000
        };
        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-tender-flow-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );
            if (response.data.success && response.data.data) {
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


    useEffect(() => { getListTender(); getItemsList(); getWorkhousesList(); }, [getListTender, getItemsList, getWorkhousesList]);
    useEffect(() => { fetchTenderFlowReportData(); }, [filterParams.tenderId, filterParams.itemId, filterParams.workhouseId]);


    // --- Client Side Handlers ---
    const handlePageChange = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleRequestSort = (property: keyof TenderFlowReportRowType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // --- Filter & Sort Logic ---
    const filteredReportData = useMemo(() => {
        if (!reportData?.data) return [];
        let data = [...reportData.data];
        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
            data = data.filter(row => {
                const columnsToSearch = [row.ihale_title, row.workhouse_name, row.item_name];
                return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
            });
        }
        if (orderBy) {
            data.sort(getComparator(order, orderBy));
        }
        return data;
    }, [reportData, searchTerm, order, orderBy]);

    // --- Reset page on search ---
    useEffect(() => {
        setPage(0);
    }, [searchTerm, filterParams, reportData]);

    // --- Visible Rows for Client Side Pagination ---
    const visibleRows = useMemo(() => {
        return filteredReportData.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
        );
    }, [filteredReportData, page, rowsPerPage]);


    // ✅✅✅ Calculate Totals (Dynamic based on Filter) ✅✅✅
    const calculatedTotals = useMemo(() => {
        if (!filteredReportData) return { totalDemontaj: 0, totalMontaj: 0, totalDemontajMontaj: 0 };

        return filteredReportData.reduce((acc, row) => {
            // طبق خواسته شما:
            // totalDemontaj = جمع DemontajPrice
            acc.totalDemontaj += parseNumberFromString(row.DemontajPrice);

            // totalMontaj = جمع MontajPrice
            acc.totalMontaj += parseNumberFromString(row.MontajPrice);

            // totalDemontajMontaj = جمع DemontajMontajPrice
            acc.totalDemontajMontaj += parseNumberFromString(row.DemontajMontajPrice);

            return acc;
        }, { totalDemontaj: 0, totalMontaj: 0, totalDemontajMontaj: 0 });
    }, [filteredReportData]);


    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth(); const docAny = doc as any;
        docAny.addImage(Logo, 'PNG', pageWidth - 50, 30, 40, 25);
        doc.setFont('NotoSans', 'normal'); doc.setFontSize(14); doc.text(title, pageWidth / 2, 35, { align: 'center' });
        doc.setFontSize(10); doc.setFont('NotoSans', 'normal'); doc.text(`Rapor Tarihi:`, 15, 50);
        doc.setFont('NotoSans', 'normal'); doc.text(`${formatDateDisplay(new Date().toISOString())}`, 85, 50);
    };

    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8); doc.setFont('NotoSans', 'normal');
        const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
        let footerY = pageHeight - 30;
        companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 10; });
        doc.setFontSize(10); doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        const docAny = doc as any; const pageCount = docAny.internal.getNumberOfPages();
        doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };

    const handleExportPdfSingle = async (report: TenderFlowReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');
        try {
            const doc = new jsPDF('portrait', 'pt', 'a4'); (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans", "normal");
            const reportTitle = `İhale Akış Detay Raporu: ${report.ihale_title}`; addPdfHeader(doc, reportTitle);
            const tableColumn = ["Alan", "Değer"];
            const tableRows = [
                ["İhale Başlığı", report.ihale_title], ["Şantiye", report.workhouse_name],
                ["Toplam Miktar", `${parseNumberFromString(report.Quantity)} (${report.unit})`],
                ["Demontaj", parseNumberFromString(report.Demontaj)], ["DemontajMontaj", parseNumberFromString(report.DemontajMontaj)],
                ["DemontajMontajPrice", formatPriceDisplay(report.DemontajMontajPrice)], ["DemontajTutari", formatPriceDisplay(report.DemontajTutari)],
                ["MontajPrice", formatPriceDisplay(report.MontajPrice)], ["DemontajPrice", formatPriceDisplay(report.DemontajPrice)],
            ];
            autoTable(doc, { startY: 70, head: [tableColumn], body: tableRows, theme: 'grid', styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 9, cellPadding: 5, }, headStyles: { fillColor: [60, 141, 188], textColor: 255 }, didDrawPage: (_data) => { addPdfFooter(doc); } });
            doc.save(`İhale_Detay_${report.item_name}_${format(new Date(), 'yyyyMMdd')}.pdf`); showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportExcelSingle = async (report: TenderFlowReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');
        try {
            const workbook = new Excel.Workbook(); const sheet = workbook.addWorksheet('İhale Detay', { views: [{ rightToLeft: false }] });
            const data = [['İhale', report.ihale_title], ['Şantiye', report.workhouse_name], ['Toplam Miktar', parseNumberFromString(report.Quantity)], ['Demontaj', parseNumberFromString(report.Demontaj)], ['DemontajMontaj', parseNumberFromString(report.DemontajMontaj)], ['DemontajMontajPrice', parseNumberFromString(report.DemontajMontajPrice)], ['DemontajTutari', parseNumberFromString(report.DemontajTutari)], ['MontajPrice', parseNumberFromString(report.MontajPrice)], ['DemontajPrice', parseNumberFromString(report.DemontajPrice)],];
            const titleRow = sheet.addRow([`İhale Akış Raporu Detayı: ${report.ihale_title}`]); titleRow.font = { name: 'Calibri', size: 14, bold: true }; sheet.mergeCells('A1:B1'); sheet.addRow([]);
            const headerRow = sheet.addRow(['Alan', 'Değer']); headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            data.forEach(row => { const newRow = sheet.addRow(row); newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; }); const fieldName = row[0] as string; if (fieldName.includes('Price') || fieldName.includes('Tutari')) { newRow.getCell(2).numFmt = '$ #,##0.00'; } });
            sheet.columns[0].width = 30; sheet.columns[1].width = 40;
            const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `İhale_Detay_${report.item_name}_${format(new Date(), 'yyyyMMdd')}.xlsx`); showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };

    const fetchAllFilteredData = useCallback(async () => {
        if (!authToken) { navigate("/"); return null; }
        const requestParams = { tenderId: filterParams.tenderId || null, itemId: filterParams.itemId || null, workhouseId: filterParams.workhouseId || null, page: 1, pageSize: 10000, };
        try {
            const response = await axios.get(server.baseurl + server.report + `get-tender-flow-report-data`, { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });
            if (response.data.success && response.data.data) {
                let allData = response.data.data.data as TenderFlowReportRowType[];
                const totals = { totalDemontaj: response.data.data.totalDemontaj, totalMontaj: response.data.data.totalMontaj, totalDemontajMontaj: response.data.data.totalDemontajMontaj };
                if (searchTerm) {
                    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
                    allData = allData.filter(row => {
                        const columnsToSearch = [row.ihale_title, row.workhouse_name];
                        return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
                    });
                }
                if (orderBy) { allData.sort(getComparator(order, orderBy)); }
                return { data: allData, ...totals };
            }
            showAlert('Dışa aktarılacak veri bulunamadı.', 'error'); return null;
        } catch (e: any) { handleApiError(e, 'Veri alınırken hata oluştu.'); return null; }
    }, [filterParams, navigate, authToken, searchTerm, order, orderBy, showAlert, handleApiError]);


    const handleExportPdfAll = async () => {
        showAlert('Genel PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');
        const result = await fetchAllFilteredData();
        if (!result || result.data.length === 0) { showAlert('Rapor indirilemedi: Veri bulunmamaktadır.', 'warning'); return; }
        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular); (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal"); doc.setFont("NotoSans", "normal");
            addPdfHeader(doc, "İhale Akış Genel Raporu");
            const tableColumn = ["İhale", "Şantiye", "Top. Miktar", "Demontaj", "Dem/Mon", "D+M Fiyat", "Dem Tutarı", "Mon Fiyat", "Dem Fiyat"];
            const tableRows = result.data.map(row => [
                row.ihale_title, row.workhouse_name,
                parseNumberFromString(row.Quantity), parseNumberFromString(row.Demontaj), parseNumberFromString(row.DemontajMontaj),
                formatPriceDisplay(row.DemontajMontajPrice), formatPriceDisplay(row.DemontajTutari),
                formatPriceDisplay(row.MontajPrice), formatPriceDisplay(row.DemontajPrice),
            ]);
            autoTable(doc, {
                startY: 65, margin: { top: 65 }, head: [tableColumn], body: tableRows, theme: 'striped',
                styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 7, cellPadding: 3, },
                headStyles: { fillColor: [30, 100, 120], textColor: 255 },
                foot: [['TOPLAM:', '', '', parseNumberFromString(result.totalDemontaj ?? 0).toLocaleString(), parseNumberFromString(result.totalDemontajMontaj ?? 0).toLocaleString(), '', '', parseNumberFromString(result.totalMontaj ?? 0).toLocaleString(), '']],
                footStyles: { fillColor: [230, 240, 245], textColor: [192, 0, 0], fontStyle: 'bold', fontSize: 8 },
                didDrawPage: (_data) => { addPdfFooter(doc); }
            });
            doc.save(`İhale_Akış_Genel_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`); showAlert('Genel PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e) { handleApiError(e, 'Genel PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const handleExportExcelAll = async () => {
        showAlert('Genel Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');
        const result = await fetchAllFilteredData();
        if (!result || result.data.length === 0) { showAlert('Rapor indirilemedi: Veri bulunmamaktadır.', 'warning'); return; }
        try {
            const workbook = new Excel.Workbook(); const sheet = workbook.addWorksheet('İhale Akış Genel Raporu', { views: [{ rightToLeft: false }] });
            const headerRowData = ["İhale", "Şantiye", "Toplam Miktar", "Demontaj", "DemontajMontaj", "DemontajMontajPrice", "DemontajTutari", "MontajPrice", "DemontajPrice"];
            sheet.addRow(["İhale Akış Genel Raporu"]); sheet.mergeCells('A1:I1'); sheet.getRow(1).font = { bold: true, size: 14 };
            sheet.addRow([`Toplam Kayıt: ${result.data.length}`, "", `Top. Demontaj: ${parseNumberFromString(result.totalDemontaj ?? 0).toLocaleString()}`, `Top. Dem+Mon: ${parseNumberFromString(result.totalDemontajMontaj ?? 0).toLocaleString()}`, "", "", "", `Top. Montaj: ${parseNumberFromString(result.totalMontaj ?? 0).toLocaleString()}`]);
            sheet.getRow(2).font = { bold: true, color: { argb: 'FFBF00' } }; sheet.addRow([]);
            const headerRow = sheet.addRow(headerRowData); headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0E6F0' } }; cell.font = { bold: true }; cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            result.data.forEach(row => {
                const newRow = sheet.addRow([row.ihale_title, row.workhouse_name, parseNumberFromString(row.Quantity), parseNumberFromString(row.Demontaj), parseNumberFromString(row.DemontajMontaj), parseNumberFromString(row.DemontajMontajPrice), parseNumberFromString(row.DemontajTutari), parseNumberFromString(row.MontajPrice), parseNumberFromString(row.DemontajPrice),]);
                [3, 4, 5].forEach(idx => newRow.getCell(idx).numFmt = '#,##0.00');[6, 7, 8, 9].forEach(idx => newRow.getCell(idx).numFmt = '$ #,##0.00');
                newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
            });
            sheet.columns.forEach((column, index) => { column.width = index < 2 ? 30 : 15; });
            const buffer = await workbook.xlsx.writeBuffer(); saveAs(new Blob([buffer]), `İhale_Akış_Genel_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`); showAlert('Genel Excel raporu başarıyla oluşturuldu و indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'Genel Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const tableHeaders: { label: string; key: keyof TenderFlowReportRowType | 'actions' }[] = [
        { label: 'İhale Başlığı', key: 'ihale_title' },          // عنوان مناقصه
        { label: 'Şantiye Adı', key: 'workhouse_name' },         // نام کارگاه/سایت
        { label: 'Top. Miktar', key: 'Quantity' },               // مقدار کل
        { label: 'Demontaj Miktarı', key: 'Demontaj' },          // مقدار دمونتاژ
        { label: 'D+M Miktarı', key: 'DemontajMontaj' },         // مقدار دمونتاژ + مونتاژ (مخفف D+M)
        { label: 'D+M Tutarı', key: 'DemontajMontajPrice' },     // مبلغ دمونتاژ + مونتاژ
        { label: 'Demontaj Tutarı', key: 'DemontajTutari' },     // مبلغ دمونتاژ
        { label: 'Montaj Tutarı', key: 'MontajPrice' },          // مبلغ مونتاژ
        { label: 'Demontaj Fiyatı', key: 'DemontajPrice' },      // قیمت واحد دمونتاژ
        { label: 'İşlemler', key: 'actions' },                   // عملیات
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconCurrencyTaka size={28} style={{ marginRight: 8 }} /> İhale Akış Raporu
            </Typography>

            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>

                    <Grid item xs={12} sm={6} md={4}><Autocomplete id="tender-select" options={tendersList} getOptionLabel={(o) => `${o.title} (${o.approvedTenderText})`} value={tendersList.find(t => t.id === filterParams.tenderId) || null} onChange={(_, newValue) => handleFilterChange('tenderId', newValue?.id || null)} renderInput={(params) => (<TextField {...params} label="İhale Seçiniz" fullWidth size="small" />)} /></Grid>
                    <Grid item xs={12} sm={6} md={4}><Autocomplete id="workhouse-select" options={workhousesList} getOptionLabel={(o) => `${o.name} (${o.code})`} value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null} onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)} renderInput={(params) => (<TextField {...params} label="Şantiye" fullWidth size="small" />)} /></Grid>

                    <Grid item xs={12} sm={6} md={4}><Autocomplete id="item-select" options={itemsList} getOptionLabel={(o) => `${o.name} (${o.abbreviation})`} value={itemsList.find(i => i.id === filterParams.itemId) || null} onChange={(_, newValue) => handleFilterChange('itemId', newValue?.id || null)} renderInput={(params) => (<TextField {...params} label="Ürün Seçiniz" fullWidth size="small" />)} /></Grid>
                </Grid>
                <Box sx={{ p: 2, mt: 1 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}><TextField label="Tabloda Ara (İhale, Şantiye...)" variant="outlined" fullWidth size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} /></Grid>
                        <Grid item xs={12} md={6} display="flex" justifyContent="flex-end" gap={1}>
                            <Button variant="outlined" color="success" startIcon={<IconFileSpreadsheet />}
                                onClick={handleExportExcelAll}
                                disabled={loadingData || !reportData?.data?.length}>Tüm Veriyi Excel İndir</Button>
                            <Button variant="outlined" color="error" startIcon={<IconFileDownload />}
                                onClick={handleExportPdfAll}
                                disabled={loadingData || !reportData?.data?.length}>Tüm Veriyi PDF İndir</Button>
                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>

            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="tender flow report table">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <StyledTableCell key={header.key}>
                                        {header.key !== 'actions' ? (
                                            <TableSortLabel active={orderBy === header.key} direction={orderBy === header.key ? order : 'asc'} onClick={() => handleRequestSort(header.key as keyof TenderFlowReportRowType)}>
                                                <Typography variant="h6" fontWeight="bold">{header.label}</Typography>
                                                {orderBy === header.key ? (<Box component="span" sx={visuallyHiddenStyle}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box>) : null}
                                            </TableSortLabel>
                                        ) : (<Typography variant="h6" fontWeight="bold">{header.label}</Typography>)}
                                    </StyledTableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (<TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>) : visibleRows.length ? (
                                // ✅ فقط ردیف‌های برش خورده نمایش داده شوند
                                visibleRows.map((row, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>{row.ihale_title}</StyledTableCell> <StyledTableCell>{row.workhouse_name}</StyledTableCell>
                                        <StyledTableCell>{parseNumberFromString(row.Quantity)}</StyledTableCell> <StyledTableCell>{parseNumberFromString(row.Demontaj)}</StyledTableCell>
                                        <StyledTableCell>{parseNumberFromString(row.DemontajMontaj)}</StyledTableCell> <StyledTableCell>{formatPriceDisplay(row.DemontajMontajPrice)}</StyledTableCell>
                                        <StyledTableCell>{formatPriceDisplay(row.DemontajTutari)}</StyledTableCell> <StyledTableCell>{formatPriceDisplay(row.MontajPrice)}</StyledTableCell>
                                        <StyledTableCell>{formatPriceDisplay(row.DemontajPrice)}</StyledTableCell>
                                        <StyledTableCell>
                                            <Tooltip title="Detaylar ve İşlemler"><IconButton id={`actions-button-${index}`} onClick={(event) => handleClickMenu(event, row)} color="secondary" size="small"><IconDots width={20} /></IconButton></Tooltip>
                                            <Menu id="actions-menu" anchorEl={anchorEl} open={openMenu && selectedRowForMenu === row} onClose={handleCloseMenu}>
                                                <MenuItem onClick={() => handleOpenDetailViewModal(row)}><ListItemIcon><IconRuler width={18} /></ListItemIcon> Detayları Görüntüle</MenuItem>
                                                <MenuItem onClick={() => handleExportPdfSingle(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> PDF İndir</MenuItem>
                                                <MenuItem onClick={() => handleExportExcelSingle(row)}><ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon> Excel İndir</MenuItem>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (<TableRow><StyledTableCell colSpan={tableHeaders.length} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun ihale akış raporu bulunamadı.</Typography></StyledTableCell></TableRow>)}
                        </TableBody>

                        {/* ✅ Footer با مقادیر محاسبه شده داینامیک */}
                        {reportData && (
                            <TableFooter>
                                <TableRow>
                                    <StyledTableCell colSpan={10} align="right" sx={{ p: 2, background: '#fafafa', borderTop: '1px solid #ddd' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                                            <Typography variant="h6" color="secondary">
                                                Toplam Demontaj : {calculatedTotals.totalDemontaj.toLocaleString('us-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}
                                            </Typography>
                                            <Typography variant="h6" color="success.main">
                                                Toplam Montaj : {calculatedTotals.totalMontaj.toLocaleString('us-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}
                                            </Typography>
                                            <Typography variant="h6" color="warning.main">
                                                Toplam Dem+Mon : {calculatedTotals.totalDemontajMontaj.toLocaleString('us-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}
                                            </Typography>
                                        </Box>
                                    </StyledTableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </TableContainer>
                <>

                    {reportData && reportData.data?.length > 0 && (
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50, 100]}
                            component="div"
                            count={filteredReportData.length} // تعداد کل دیتای فیلتر/جستجو شده
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handlePageChange}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            labelRowsPerPage="Satır sayısı:"
                            labelDisplayedRows={({ from, to, count }) =>
                                `${from}–${to} / ${count !== -1 ? count : `> ${to}`}`
                            }
                        />
                    )}
                </>

            </BlankCard>
            <DetailViewModal open={openDetailViewModal} onClose={handleCloseDetailViewModal} report={selectedReportToDownload} onExportExcel={handleExportExcelSingle} onExportPdf={handleExportPdfSingle} />
        </Box>
    );
};

export default ListTenderFlowReport;