import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    TableFooter,
    Stack, Alert, CircularProgress, Button,
    Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, MenuItem, TextField, IconButton, InputAdornment,
    Menu,
    ListItemIcon,
    Autocomplete,
    TableSortLabel,
    TablePagination
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconRuler, IconClipboardList, IconFileSpreadsheet,
    IconX,
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { format, startOfYear, endOfYear } from 'date-fns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';

import "./style.css"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import Logo from 'src/assets/images/logos/logo.png';

const visuallyHiddenStyle = {
    border: 0, clip: 'rect(0 0 0 0)', height: '1px', margin: -1,
    overflow: 'hidden', padding: 0, position: 'absolute',
    whiteSpace: 'nowrap', width: '1px',
};

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', },
    whiteSpace: 'nowrap',
}));

interface WorkhouseType { id: number; name: string; code: string; address: string; createAt: string; recordStatus: number; }

interface ReportRowType {
    workhouse_id: string; workhouse_code: string; workhousen_name: string;
    tarih: string; proje_kodu: string; bolge_adi: string; ekip_adi: string; il: string | null;
    ilce: string; proje_adi: string; is_turu: string; itemcode: string | null;
    itemname: string; unit: string; quantity: string; price: string | null; discount: string | null;
    total: string | null;
    invoice_no: string | null;
    discount_percent: string | null;

}
interface FirmType {
    id: number;
    title: string;
    abbreviation: string;
    createAt: string;
    recordStatus: number;
}
interface ProjectType {
    id: number;
    title: string;
    code: string;
    type: 0 | 1 | 2;
    startDate: string;
    predictEndDate: string;
    endDate: string | null;
    workhouseId: number;
    firmId: number;
    workhouse: WorkhouseType;
    projectFirm: FirmType;
    recordStatus: number;
}

interface ReportResponseType {
    totalCount: number; totalPrice: number; page: number; pageSize: number; totalPages: number; data: ReportRowType[];
}

interface FilterParams {
    fromDate: string; toDate: string; projectId: number | null; workhouseId: number | null;
    maxQuantity: number | null; minQuantity: number | null; page: number; pageSize: number;
    storeId: number | null; dispatchId: string | null; itemId: number | null;
}

type Order = 'asc' | 'desc';



const cleanNumber = (value: string | number | undefined | null): number => {
    if (value === null || value === undefined) return 0;
    const cleanedString = String(value).replace(/[^\d.-]/g, '');
    const numericValue = parseFloat(cleanedString);
    return isNaN(numericValue) ? 0 : numericValue;
};


const cleanCurrency = (value: string | null): string => {
    if (!value) return '0.00';
    return value.replace(/[$,]/g, "");
};
function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    let aValue: any = a[orderBy];
    let bValue: any = b[orderBy];

    if (['quantity', 'price', 'total', 'discount'].includes(orderBy as string)) {
        aValue = cleanNumber(aValue);
        bValue = cleanNumber(bValue);
    }
    else if (orderBy === 'tarih') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
    }
    else {
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


interface DetailViewModalProps {
    open: boolean; onClose: () => void; report: ReportRowType | null;
    onExportExcel: (report: ReportRowType) => Promise<void>; onExportPdf: (report: ReportRowType) => Promise<void>;
}
const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;
    const reportTitle = report.itemname ? `Ürün Raporu Detayları: ${report.itemname}` : `Rapor Detayları: ${report.proje_adi}`;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="h6" mb={1} color="primary">Genel Bilgiler</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Fatura No" size="small" fullWidth value={report.invoice_no || '-'} disabled />
                            <CustomTextField label="Proje Adı" size="small" fullWidth value={report.proje_adi} disabled />
                            <CustomTextField label="Proje Kodu" size="small" fullWidth value={report.proje_kodu} disabled />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mt={1} mb={1} color="info.main">Malzeme Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Malzeme Adı" size="small" fullWidth value={report.itemname} disabled />
                            <CustomTextField label="Malzeme Kodu" size="small" fullWidth value={report.itemcode || '-'} disabled />
                            <CustomTextField label="Birim" size="small" fullWidth value={report.unit} disabled />
                            <CustomTextField label="Tarih" size="small" fullWidth value={format(new Date(report.tarih), 'dd/MM/yyyy')} disabled />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mt={1} mb={1} color="success.main">Miktar ve Maliyet</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Miktar" size="small" fullWidth value={report.quantity} disabled />
                            <CustomTextField label="Birim Fiyat" size="small" fullWidth value={cleanNumber(report.price).toLocaleString('us-US') + " TL"} disabled />
                            <CustomTextField label="İndirim Tutarı" size="small" fullWidth value={cleanNumber(report.discount).toLocaleString('us-US') + " TL"} disabled />
                            <CustomTextField label="Toplam Tutar" size="small" fullWidth
                                value={cleanNumber(report.total).toLocaleString('us-US', { minimumFractionDigits: 2 }) + " TL"}
                                sx={{ "& .MuiInputBase-input": { fontWeight: 'bold', color: 'primary.main' } }}
                                disabled
                            />
                        </Stack>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h6" mt={1} mb={1} color="secondary">Konum ve Şantiye</Typography>
                        <Stack direction="row" spacing={1}>
                            <CustomTextField label="Şantiye" size="small" fullWidth value={report.workhousen_name} disabled />
                            <CustomTextField label="İl / İlçe" size="small" fullWidth value={`${report.il || '-'} / ${report.ilce}`} disabled />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} mt={2}>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => onExportPdf(report)} fullWidth>PDF</Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => onExportExcel(report)} fullWidth>Excel</Button>
                        </Stack>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};

const ListItemReport = () => {
    const navigate = useNavigate();
    const currentYearStart = startOfYear(new Date());
    const currentYearEnd = endOfYear(new Date());

    const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
    const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);
    const [searchTerm, setSearchTerm] = useState('');

    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof ReportRowType>('tarih');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);


    const [projectsList, setProjectsList] = useState<ProjectType[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<ReportRowType | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        projectId: null, workhouseId: null,
        maxQuantity: null, minQuantity: null,
        page: 1,
        pageSize: 1000,
        storeId: null, dispatchId: null, itemId: null,
    });

    const [reportData, setReportData] = useState<ReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);

    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
                format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
                format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch (e) { return '-'; }
    };

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
    const getWorkhousesList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') { requestParams = { rolename: role }; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });
            if (response.data.httpStatusCode === 200) {
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else { showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error'); }
        } catch (e: any) { handleApiError(e, 'Şantiye listesi alınamadı.'); }
    }, [navigate, showAlert, handleApiError]);

    const getProjectsList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        setLoadingProjects(true);
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-project", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const activeProjects = response.data.data.filter((p: ProjectType) => p.recordStatus === 0);
                setProjectsList(activeProjects);
            }
        } catch (e: any) {
            handleApiError(e, 'Proje listesi alınamadı.');
        } finally {
            setLoadingProjects(false);
        }
    }, [handleApiError]);

    useEffect(() => {
        getProjectsList();
    }, [getProjectsList]);

    const fetchListItemReportData = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        const requestParams = {
            fromDate: filterParams.fromDate || null, toDate: filterParams.toDate || null,
            projectId: Number(filterParams.projectId) || null, workhouseId: Number(filterParams.workhouseId) || null,
            maxQuantity: filterParams.maxQuantity || null, minQuantity: filterParams.minQuantity || null,
            page: filterParams.page, pageSize: filterParams.pageSize,
        };
        setLoadingData(true);
        try {
            const response = await axios.get(server.baseurl + server.report + `get-other-items-filtered-report-data`, {
                headers: { "Authorization": `Bearer ${authToken}` },
                params: requestParams,
                timeout: 20000
            });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setReportData(response.data.data as ReportResponseType);
            } else {
                setReportData(null); showAlert(response.data.message || 'Ürün rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) { setReportData(null); handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.'); }
        finally { setLoadingData(false); }
    }, [filterParams, navigate, showAlert, handleApiError]);

    useEffect(() => { getWorkhousesList(); }, [getWorkhousesList]);
    useEffect(() => { if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd')); }, [startDate]);
    useEffect(() => { if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd')); }, [endDate]);
    useEffect(() => {
        fetchListItemReportData();
    }, [
        filterParams.fromDate, filterParams.toDate, filterParams.projectId,
        filterParams.workhouseId, filterParams.maxQuantity, filterParams.minQuantity
    ]);

    const handleRequestSort = (property: keyof ReportRowType) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const processedData = useMemo(() => {
        if (!reportData?.data) return [];
        let data = [...reportData.data];

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
            data = data.filter(row => {
                const columnsToSearch = [row.itemname, row.workhousen_name, row.proje_adi, row.proje_kodu, row.itemcode];
                return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
            });
        }
        if (orderBy) {
            data.sort(getComparator(order, orderBy));
        }
        return data;
    }, [reportData, searchTerm, order, orderBy]);

    useEffect(() => {
        setPage(0);
    }, [searchTerm, filterParams, reportData]);

    const visibleRows = useMemo(() => {
        return processedData.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
        );
    }, [processedData, page, rowsPerPage]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ReportRowType) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleOpenDetailViewModal = (report: ReportRowType) => { setSelectedReportToDownload(report); setOpenDetailViewModal(true); handleCloseMenu(); };
    const handleCloseDetailViewModal = () => { setOpenDetailViewModal(false); setSelectedReportToDownload(null); };

    const addPdfHeader = (doc: jsPDF, title: string) => {

        const docAny = doc as any;
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 35;
        const logoHeight = 18;
        const margin = 15;
        const logoX = pageWidth - logoWidth - margin;

        try {
            doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
        } catch (e) {
            console.error("Logo yüklenemedi", e);
        }

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('NotoSans', 'bold');
        doc.text(`Rapor Tarihi:`, 15, 35);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 35);

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

        let footerY = pageHeight - 40;
        companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 10;
        });

        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
        doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };


    const handleExportPdfSingle = async (report: ReportRowType) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor...', 'info');
        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, `Ürün Raporu Detayı: ${report.itemname}`);

            const tableRows = [
                ["Fatura No", report.invoice_no || '-'],
                ["Malzeme Adı", report.itemname],
                ["Malzeme Kodu", report.itemcode || '-'],
                ["Proje Adı", report.proje_adi],
                ["Şantiye Adı", report.workhousen_name],
                ["Tarih", format(new Date(report.tarih), 'dd/MM/yyyy')],
                ["Miktar", report.quantity],
                ["Birim", report.unit],
                ["Birim Fiyat", cleanCurrency(report.price)],
                ["İndirim", cleanCurrency(report.discount)],
                ["Toplam Tutar", cleanCurrency(report.total) + " TL"],
            ];

            autoTable(doc, {
                startY: 70,
                head: [["Alan (Field)", "Değer (Value)"]],
                body: tableRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 6 },
                headStyles: { fillColor: [60, 141, 188] },
                didDrawPage: () => { addPdfFooter(doc); }
            });

            doc.save(`Urun_Detay_${report.invoice_no || 'No'}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'PDF hatası.'); }
    };

    const handleExportExcelSingle = async (report: ReportRowType) => {
        showAlert('Excel hazırlanıyor...', 'info');
        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Ürün Detay');

            const titleRow = sheet.addRow(['Ürün Raporu Detayı']);
            titleRow.font = { bold: true, size: 14 };
            sheet.mergeCells('A1:B1');
            sheet.addRow([]);

            const headerRow = sheet.addRow(['Alan (Field)', 'Değer (Value)']);
            headerRow.eachCell(cell => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            const rows = [
                ['Fatura No', report.invoice_no || '-'],
                ['Malzeme Adı', report.itemname],
                ['Proje Adı', report.proje_adi],
                ['Tarih', format(new Date(report.tarih), 'dd/MM/yyyy')],
                ['Miktar', cleanNumber(report.quantity)],
                ['Birim Fiyat', cleanNumber(report.price)],
                ['İndirim', cleanNumber(report.discount)],
                ['Toplam Tutar', cleanNumber(report.total)],
            ];

            rows.forEach(row => {
                const newRow = sheet.addRow(row);
                if (typeof row[1] === 'number' && row[0] !== 'Miktar') newRow.getCell(2).numFmt = '#,##0.00';
            });

            sheet.columns = [{ width: 25 }, { width: 35 }];
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Urun_Detay_${report.invoice_no || 'No'}.xlsx`);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'Excel hatası.'); }
    };

    const handleExportPdfAll = (data: ReportRowType[]) => {
        if (!data || data.length === 0) { showAlert('Veri yok.', 'warning'); return; }
        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, `Ürün Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);

            const headers = ["Fatura No", "Malzeme", "Şantiye", "Tarih", "Miktar", "Fiyat", "İndirim", "Toplam (TL)"];
            const body = data.map(row => [
                row.invoice_no || '-',
                row.itemname,
                row.workhousen_name,
                format(new Date(row.tarih), 'dd/MM/yyyy'),
                row.quantity,
                cleanCurrency(row.price),
                cleanCurrency(row.discount),
                cleanCurrency(row.total)
            ]);

            const totalPrice = data.reduce((sum, r) => sum + cleanNumber(r.total), 0);

            autoTable(doc, {
                startY: 70,
                head: [headers],
                body: body,
                theme: 'grid',
                styles: { font: 'NotoSans', fontSize: 8 },
                headStyles: { fillColor: [60, 141, 188] },
                foot: [['', '', '', '', '', '', 'GENEL TOPLAM:', totalPrice.toLocaleString('us-US') + ' TL']],
                didDrawPage: () => { addPdfFooter(doc); }
            });

            doc.save(`Urun_Raporu_Tumu.pdf`);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'PDF hatası.'); }
    };

    const handleExportExcelAll = async (data: ReportRowType[]) => {
        if (!data || data.length === 0) { showAlert('Veri yok.', 'warning'); return; }
        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Ürün Raporu');

            const headers = ["Fatura No", "Malzeme Adı", "Şantiye", "Tarih", "Miktar", "Birim", "Fiyat", "İndirim", "Toplam"];
            const headerRow = sheet.addRow(headers);
            headerRow.eachCell(cell => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            data.forEach(row => {
                const newRow = sheet.addRow([
                    row.invoice_no || '-',
                    row.itemname,
                    row.workhousen_name,
                    format(new Date(row.tarih), 'dd/MM/yyyy'),
                    cleanNumber(row.quantity),
                    row.unit,
                    cleanNumber(row.price),
                    cleanNumber(row.discount),
                    cleanNumber(row.total)
                ]);
                [7, 8, 9].forEach(i => newRow.getCell(i).numFmt = '#,##0.00');
            });

            sheet.columns.forEach(col => col.width = 18);
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Urun_Raporu_Tumu.xlsx`);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        } catch (e: any) { handleApiError(e, 'Excel hatası.'); }
    };

    const fetchFullReportData = useCallback(async (exportType: 'pdf' | 'excel') => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        const requestParams = {
            fromDate: filterParams.fromDate || null, toDate: filterParams.toDate || null,
            projectId: Number(filterParams.projectId) || null, workhouseId: Number(filterParams.workhouseId) || null,
            maxQuantity: filterParams.maxQuantity || null, minQuantity: filterParams.minQuantity || null,

        };
        const exportMessage = `Tüm rapor verileri için ${exportType.toUpperCase()} hazırlanıyor, lütfen bekleyin...`;
        showAlert(exportMessage, 'info');

        try {
            const response = await axios.get(server.baseurl + server.report +
                `get-other-items-filtered-report-data`, { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams });

            if (response.data.httpStatusCode === 200 && response.data.data?.data) {
                let allData = response.data.data.data as ReportRowType[];

                if (searchTerm) {
                    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
                    allData = allData.filter(row => {
                        const columnsToSearch = [row.itemname, row.workhousen_name, row.proje_adi, row.proje_kodu, row.itemcode];
                        return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
                    });
                }

                if (orderBy) {
                    allData.sort(getComparator(order, orderBy));
                }

                if (exportType === 'pdf') { handleExportPdfAll(allData); } else { handleExportExcelAll(allData); }
            } else { showAlert('İndirilecek rapor verisi bulunamadı.', 'error'); }
        } catch (e: any) { handleApiError(e, `Tüm raporu indirirken bir sorun oluştu.`); }
    }, [filterParams, showAlert, handleApiError, handleExportPdfAll, handleExportExcelAll, searchTerm, order, orderBy]);

    const calculatedFilteredTotalPrice = useMemo(() => {
        if (!processedData) return 0;
        return processedData.reduce((acc, row) => {
            const val = cleanNumber(row.total);
            return acc + val;
        }, 0);
    }, [processedData]);

    const tableHeaders: { label: string; key: keyof ReportRowType }[] = [
        { label: 'Fatura No', key: 'invoice_no' },
        { label: 'Malzeme Adı', key: 'itemname' },
        { label: 'Şantiye Adı', key: 'workhousen_name' },
        { label: 'Proje Adı', key: 'proje_adi' },
        { label: 'Tarih', key: 'tarih' },
        { label: 'Miktar', key: 'quantity' },
        { label: 'Birim', key: 'unit' },
        { label: 'Birim Fiyat', key: 'price' },
        { label: 'İndirim', key: 'discount' },
        { label: 'Toplam Tutar (TL)', key: 'total' },
    ];

    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}><IconClipboardList size={28} style={{ marginRight: 8 }} /> Ürün (Stok) Raporları</Typography>
            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>

                    <Grid item xs={12} sm={6} md={3}><Autocomplete id="workhouse-select" options={workhousesList} getOptionLabel={(o) => `${o.name} (${o.code})`} value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null} onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)} isOptionEqualToValue={(o, v) => o.id === v.id} renderInput={(params) => (<TextField {...params} label="Şantiye" fullWidth size="small" />)} /></Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            id="project-select"
                            options={projectsList}
                            loading={loadingProjects}
                            getOptionLabel={(o) => `${o.title} (${o.code})`}
                            value={projectsList.find(p => p.id === filterParams.projectId) || null}
                            onChange={(_, newValue) => handleFilterChange('projectId', newValue?.id || null)}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Proje"
                                    fullWidth
                                    size="small"
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {loadingProjects ? <CircularProgress color="inherit" size={20} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Başlangıç Tarihi"
                                value={startDate}
                                onChange={(v) => setStartDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        onKeyDown={(e) => e.preventDefault()}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStartDate(currentYearStart);
                                                        }}
                                                        sx={{ marginRight: -1 }}
                                                    >
                                                        <IconX size={16} />
                                                    </IconButton>
                                                    {params.InputProps?.endAdornment}
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                            <DatePicker
                                label="Bitiş Tarihi"
                                value={endDate}
                                onChange={(v) => setEndDate(v)}
                                inputFormat="dd/MM/yyyy"
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        onKeyDown={(e) => e.preventDefault()}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEndDate(currentYearEnd);
                                                        }}
                                                        sx={{ marginRight: -1 }}
                                                    >
                                                        <IconX size={16} />
                                                    </IconButton>
                                                    {params.InputProps?.endAdornment}
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Grid>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={7} md={7}>
                            <TextField label="Tabloda Ara (Malzeme Adı/Kodu, Proje Adı, Şantiye Adı)" variant="outlined" fullWidth value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} size="small" InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>
                        <Grid item xs={12} sm={5} md={5} spacing={2} display={'flex'} justifyContent={'space-evenly'}>
                            <Button variant="outlined" color="success"
                                startIcon={<IconFileSpreadsheet size={20} />} onClick={() => fetchFullReportData('excel')}
                                disabled={loadingData}>Tüm Veriyi Excel İndir</Button>
                            <Button variant="outlined" color="error"
                                startIcon={<IconFileDownload size={20} />} onClick={() => fetchFullReportData('pdf')}
                                disabled={loadingData}>Tüm Veriyi PDF İndir</Button>
                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>
            <Box sx={{ margin: "20px 0" }}></Box>

            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="item report table">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <StyledTableCell key={header.key} sx={header.key === 'itemname' ? { width: '120px', minWidth: '120px', maxWidth: '120px', whiteSpace: 'normal', wordBreak: 'break-word' } : {}}>
                                        <TableSortLabel active={orderBy === header.key} direction={orderBy === header.key ? order : 'asc'} onClick={() => handleRequestSort(header.key)}>
                                            <Typography variant="h6" fontWeight="bold">{header.label}</Typography>
                                            {orderBy === header.key ? (<Box component="span" sx={visuallyHiddenStyle}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box>) : null}
                                        </TableSortLabel>
                                    </StyledTableCell>
                                ))}
                                <StyledTableCell><Typography variant="h6" fontWeight="bold">İşlemler</Typography></StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : visibleRows.length ? (
                                visibleRows.map((row, index) => (
                                    <TableRow key={`${row.tarih}-${row.itemcode}-${index}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>{row.invoice_no || '-'}</StyledTableCell>
                                        <StyledTableCell sx={{ width: '140px', minWidth: '140px', maxWidth: '140px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {row.itemname}
                                        </StyledTableCell>
                                        <StyledTableCell>{row.workhousen_name}</StyledTableCell>
                                        <StyledTableCell>{row.proje_adi}</StyledTableCell>
                                        <StyledTableCell>{format(new Date(row.tarih), 'dd/MM/yyyy')}</StyledTableCell>
                                        <StyledTableCell><Typography fontWeight="bold">{row.quantity}</Typography></StyledTableCell>
                                        <StyledTableCell>{row.unit}</StyledTableCell>
                                        <StyledTableCell>{cleanCurrency(row.price)}</StyledTableCell>
                                        <StyledTableCell>{cleanCurrency(row.discount)}</StyledTableCell>

                                        <StyledTableCell>
                                            <Typography color="primary" fontWeight="bold">
                                                {cleanNumber(row.total).toLocaleString('us-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })} TL
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Tooltip title="Detaylar ve İşlemler">
                                                <IconButton id={`actions-button-${index}`} onClick={(event) => handleClickMenu(event, row)} color="secondary" size="small"><IconDots width={20} /></IconButton></Tooltip>
                                            <Menu id="actions-menu" anchorEl={anchorEl} open={openMenu && selectedRowForMenu === row} onClose={handleCloseMenu}>
                                                <MenuItem onClick={() => handleOpenDetailViewModal(row)}><ListItemIcon><IconRuler width={18} /></ListItemIcon> Detayları Görüntüle</MenuItem>
                                                <MenuItem onClick={() => handleExportPdfSingle(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> PDF İndir</MenuItem>
                                                <MenuItem onClick={() => handleExportExcelSingle(row)}><ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon> Excel İndir</MenuItem>
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (<TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun ürün raporu bulunamadı.</Typography></StyledTableCell></TableRow>)}
                        </TableBody>
                        {reportData && reportData.data?.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    <StyledTableCell colSpan={9} align="right" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            {searchTerm ? 'Toplam (Filtrelenmiş):' : 'Genel Toplam (Tüm Veriler):'}
                                        </Typography>
                                    </StyledTableCell>
                                    <StyledTableCell align="left" sx={{ borderTop: '2px solid #ddd', padding: 2 }}>
                                        <Typography variant="h5" color="primary" fontWeight="bold">
                                            {calculatedFilteredTotalPrice.toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL
                                        </Typography>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ borderTop: '2px solid #ddd' }}></StyledTableCell>
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
                            count={processedData.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
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

export default ListItemReport;

