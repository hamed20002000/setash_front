
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
    TablePagination,
    TableFooter
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload, IconDots,
    IconCar, IconFileSpreadsheet,
    IconRuler,
    IconX
} from '@tabler/icons-react';
import axios from 'axios';
import server from '../../../assets/address.json';
import BlankCard from '../../../components/shared/BlankCard';
import { format, startOfYear, endOfYear } from 'date-fns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import Logo from 'src/assets/images/logos/logo.png';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';

const visuallyHiddenStyle = {
    border: 0, clip: 'rect(0 0 0 0)', height: '1px', margin: -1,
    overflow: 'hidden', padding: 0, position: 'absolute',
    whiteSpace: 'nowrap', width: '1px',
};

interface WorkhouseType {
    id: number; name: string; code: string; address: string; createAt: string; recordStatus: number;
}

interface CarReportRowType {
    work_id: number | null;
    work_title: string | null;
    workhouse_id: number | null;
    workhouse_code: string | null;
    workhouse_name: string | null;
    personnel_id: string | null;
    personnel_name: string | null;
    personnel_family: string | null;
    brand: string;
    model: string;
    manufacture_date: string;
    plaque: string;
    fuel_type: 'GASOLINE' | 'DIESEL' | 'LPG' | 'ELECTRIC';
    fuel_date: string;
    fuel_fee: string;
    fuel_amount: number;
    total_price: string;
}

interface CarReportResponseType {
    totalCount: number;
    totalPrice: number | null;
    page: number;
    pageSize: number;
    totalPages: number;
    data: CarReportRowType[];
}

interface FilterParams {
    fromDate: string;
    toDate: string;
    workhouseId: number | null;
    storeId: number | null;
    dispatchId: string | null;
    page: number;
    pageSize: number;
    workId: number | null;
    personnelId: number | null;
    brand: string;
    model: string;
}

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontStyle: 'normal', fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '0.9rem', }, whiteSpace: 'nowrap',
}));

const parseCurrencyToNumber = (currencyString: string | number): number => {
    if (typeof currencyString === 'number') return currencyString;
    if (!currencyString) return 0;
    let clean = currencyString.toString().replace(/[^\d.,-]/g, '');
    const hasCommaDecimal = clean.includes(',') && !clean.includes('.');
    const hasDotThousand = clean.includes('.') && clean.includes(',');
    if (hasDotThousand || hasCommaDecimal) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
        clean = clean.replace(/,/g, '');
    }
    return parseFloat(clean) || 0;
};

type Order = 'asc' | 'desc';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T | string) {
    let aValue: any;
    let bValue: any;

    if (orderBy === 'brand_model') {
        aValue = `${(a as any).brand} ${(a as any).model}`.toLowerCase();
        bValue = `${(b as any).brand} ${(b as any).model}`.toLowerCase();
    } else {
        aValue = (a as any)[orderBy];
        bValue = (b as any)[orderBy];

        if (['fuel_amount', 'fuel_fee', 'total_price'].includes(orderBy as string)) {
            aValue = parseCurrencyToNumber(aValue);
            bValue = parseCurrencyToNumber(bValue);
        }
        else if (['fuel_date', 'manufacture_date'].includes(orderBy as string)) {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }
        else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue ? bValue.toLowerCase() : '';
        }
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
    open: boolean;
    onClose: () => void;
    report: CarReportRowType | null;
    onExportExcel: (report: CarReportRowType) => Promise<void>;
    onExportPdf: (report: CarReportRowType) => Promise<void>;
}

const DetailViewModal: React.FC<DetailViewModalProps> = ({ open, onClose, report, onExportExcel, onExportPdf }) => {
    if (!report) return null;

    const reportTitle = report.plaque ? `Yakıt Kaydı Detayları: ${report.plaque}` : `Kayıt Detayları`;
    const personnelFullName = `${report.personnel_name || ''} ${report.personnel_family || ''}`.trim() || '-';
    const totalCostNumber = parseCurrencyToNumber(report.total_price);
    const fuelFeeNumber = parseCurrencyToNumber(report.fuel_fee);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="primary">Araç ve Kullanım Bilgileri</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Plaka" size="small" fullWidth value={report.plaque} disabled />
                            <CustomTextField label="Marka / Model" size="small" fullWidth value={`${report.brand} / ${report.model}`} disabled />
                            <CustomTextField label="Şantiye" size="small" fullWidth value={report.workhouse_name || '-'} disabled />
                            <CustomTextField label="Proje / İş" size="small" fullWidth value={report.work_title || '-'} disabled />
                            <CustomTextField label="Personel Adı" size="small" fullWidth value={personnelFullName} disabled />
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" mb={1} color="success.main">Yakıt Detayları</Typography>
                        <Stack spacing={1}>
                            <CustomTextField label="Yakıt Tipi" size="small" fullWidth value={report.fuel_type} disabled />
                            <CustomTextField label="Yakıt Tarihi" size="small" fullWidth value={format(new Date(report.fuel_date), 'dd/MM/yyyy HH:mm')} disabled />
                            <CustomTextField label="Miktar (Litre)" size="small" fullWidth value={`${report.fuel_amount}`} disabled />
                            <CustomTextField label="Birim Fiyat" size="small" fullWidth value={`${fuelFeeNumber.toLocaleString('us-US', { style: 'currency', currency: 'TRY' })}`} disabled />
                            <CustomTextField label="Toplam Maliyet" size="small" fullWidth value={`${totalCostNumber.toLocaleString('us-US', { style: 'currency', currency: 'TRY' })}`} disabled />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} mt={3}>
                        <Typography variant="h6" mb={1} color="secondary">📥 Kaydı İndir</Typography>
                        <Stack direction="row" spacing={2}>
                            <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                                onClick={() => onExportPdf(report)} fullWidth>
                                PDF Olarak İndir
                            </Button>
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />}
                                onClick={() => onExportExcel(report)} fullWidth>
                                Excel Olarak İndir
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

const ListCarwarehouseReport = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    const currentYearStart = startOfYear(new Date());
    const currentYearEnd = endOfYear(new Date());

    const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
    const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);
    const [searchTerm, setSearchTerm] = useState('');

    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof CarReportRowType | string>('fuel_date');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [filterParams, setFilterParams] = useState<FilterParams>({
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        workhouseId: null,
        storeId: null,
        dispatchId: null,
        page: 1,
        pageSize: 1000,
        workId: null,
        personnelId: null,
        brand: '',
        model: '',
    });

    const [reportData, setReportData] = useState<CarReportResponseType | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CarReportRowType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDetailViewModal, setOpenDetailViewModal] = useState(false);
    const [selectedReportToDownload, setSelectedReportToDownload] = useState<CarReportRowType | null>(null);


    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm').includes('NaN') ?
                format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') :
                format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            return '-';
        }
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

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CarReportRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleOpenDetailViewModal = (report: CarReportRowType) => {
        setSelectedReportToDownload(report);
        setOpenDetailViewModal(true);
        handleCloseMenu();
    };
    const handleCloseDetailViewModal = () => {
        setOpenDetailViewModal(false);
        setSelectedReportToDownload(null);
    };

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

                const noWorkhouseOption: WorkhouseType = {
                    id: -1,
                    name: "Şantiyesiz (Boş)",
                    code: "",
                    address: "",
                    createAt: "",
                    recordStatus: 0
                };

                setWorkhousesList([noWorkhouseOption, ...activeWorkhouses]);
            } else {
                showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
            }
        } catch (e: any) { handleApiError(e, 'Şantiye listesi alınamadı.'); }
    }, [navigate, showAlert, handleApiError, authToken]);

    const fetchCarwarehouseReportData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        const workhouseIdToSend = filterParams.workhouseId === -1 ? null : filterParams.workhouseId;

        const requestParams = {
            workhouseId: workhouseIdToSend,
            workId: Number(filterParams.workId) || null,
            personnelId: filterParams.personnelId || null,
            brand: filterParams.brand || null,
            model: filterParams.model || null,
            fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
            toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
            page: filterParams.page,
            pageSize: filterParams.pageSize,
        };

        setLoadingData(true);
        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-car-fuel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                setReportData(response.data.data as CarReportResponseType);
            } else {
                setReportData(null);
                showAlert(response.data.message || 'Araç depo rapor verileri alınamadı.', 'error');
            }
        } catch (e: any) {
            setReportData(null);
            handleApiError(e, 'Rapor verileri alınırken bir sorun oluştu.');
        } finally {
            setLoadingData(false);
        }
    }, [filterParams, navigate, authToken, showAlert, handleApiError]);

    useEffect(() => {
        getWorkhousesList();
    }, [getWorkhousesList]);

    useEffect(() => {
        if (startDate) handleFilterChange('fromDate', format(startDate, 'yyyy-MM-dd'));
        else handleFilterChange('fromDate', '');
    }, [startDate]);

    useEffect(() => {
        if (endDate) handleFilterChange('toDate', format(endDate, 'yyyy-MM-dd'));
        else handleFilterChange('toDate', '');
    }, [endDate]);

    useEffect(() => {
        fetchCarwarehouseReportData();
    }, [
        filterParams.fromDate,
        filterParams.toDate,
        filterParams.workhouseId,
        filterParams.workId,
    ]);

    const handleRequestSort = (property: keyof CarReportRowType | string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const processedData = useMemo(() => {
        if (!reportData?.data) return [];
        let data = [...reportData.data];
        if (filterParams.workhouseId === -1) {
            data = data.filter(row => !row.workhouse_id || row.workhouse_id === null);
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
            data = data.filter(row => {
                const columnsToSearch = [
                    row.plaque, row.brand, row.model, row.workhouse_name,
                    row.work_title, row.personnel_name, row.personnel_family, row.fuel_type
                ];
                return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
            });
        }

        if (orderBy) {
            data.sort(getComparator(order, orderBy));
        }

        return data;
    }, [reportData, searchTerm, order, orderBy, filterParams.workhouseId]);

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



    const handleExportPdfSingle = async (report: CarReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const doc = new jsPDF('portrait', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            const personnelFullName = `${report.personnel_name || ''} ${report.personnel_family || ''}`.trim() || '-';
            const totalCostNumber = parseCurrencyToNumber(report.total_price);
            const fuelFeeNumber = parseCurrencyToNumber(report.fuel_fee);

            addPdfHeader(doc, `Yakıt Kaydı Detayı: ${report.plaque}`);

            const tableColumn = ["Alan (Field)", "Değer (Value)"];
            const tableRows = [
                ["Plaka", report.plaque], ["Marka / Model", `${report.brand} / ${report.model}`],
                ["Şantiye", report.workhouse_name || '-'], ["Proje / İş", report.work_title || '-'],
                ["Personel", personnelFullName],
                ["Yakıt Tipi", report.fuel_type],
                ["Yakıt Tarihi", format(new Date(report.fuel_date), 'dd/MM/yyyy HH:mm')],
                ["Miktar (Litre)", report.fuel_amount],
                ["Birim Fiyat", fuelFeeNumber.toLocaleString('us-US', { style: 'currency', currency: 'TRY' })],
                ["Toplam Maliyet", totalCostNumber.toLocaleString('us-US', { style: 'currency', currency: 'TRY' })],
            ];

            autoTable(doc, {
                startY: 70,
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 6, },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                didDrawPage: (_data) => { addPdfFooter(doc); }
            });

            doc.save(`Yakıt_Detay_${report.plaque}_${format(new Date(), 'yyyyMMddHHmm')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');

        } catch (e: any) { handleApiError(e, 'PDF raporu oluşturulurken bir hata oluştu.'); }
    };

    const fetchAllFilteredData = useCallback(async () => {
        if (!authToken) { navigate("/"); return null; }

        const workhouseIdToSend = filterParams.workhouseId === -1 ? null : filterParams.workhouseId;

        const requestParams = {
            workhouseId: workhouseIdToSend,
            workId: Number(filterParams.workId) || null,
            fromDate: format(new Date(filterParams.fromDate), 'yyyy-MM-dd') || null,
            toDate: format(new Date(filterParams.toDate), 'yyyy-MM-dd') || null,
            page: 1,
            pageSize: 10000,
        };

        try {
            const response = await axios.get(
                server.baseurl + server.report + `get-car-fuel-report-data`,
                { headers: { "Authorization": `Bearer ${authToken}` }, params: requestParams }
            );

            if (response.data.httpStatusCode === 200 && response.data.data) {
                let allData = response.data.data.data as CarReportRowType[];

                if (filterParams.workhouseId === -1) {
                    allData = allData.filter(row => !row.workhouse_id || row.workhouse_id === null);
                }
                if (searchTerm) {
                    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
                    allData = allData.filter(row => {
                        const columnsToSearch = [
                            row.plaque, row.brand, row.model, row.workhouse_name,
                            row.work_title, row.personnel_name, row.personnel_family, row.fuel_type
                        ];
                        return columnsToSearch.some(col => col && col.toLowerCase().includes(lowerCaseSearchTerm));
                    });
                }

                if (orderBy) {
                    allData.sort(getComparator(order, orderBy));
                }

                return allData;
            }
            showAlert(response.data.message || 'Tüm rapor verileri alınamadı.', 'error');
            return null;
        } catch (e: any) {
            handleApiError(e, 'Tüm rapor verileri alınırken bir sorun oluştu.');
            return null;
        }
    }, [filterParams, navigate, authToken, showAlert, handleApiError, searchTerm, order, orderBy]);


    const handleExportPdfAll = async () => {
        showAlert('Tüm verilerin PDF raporu hazırlanıyor, lütfen bekleyin...', 'info');

        const allData = await fetchAllFilteredData();
        if (!allData || allData.length === 0) {
            showAlert('Dışa aktarılacak veri bulunamadı.', 'warning');
            return;
        }

        try {
            const doc = new jsPDF('landscape', 'pt', 'a4');
            (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
            (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
            doc.setFont("NotoSans", "normal");

            addPdfHeader(doc, `Araç Yakıt Genel Raporu (${format(new Date(), 'dd/MM/yyyy')})`);

            const tableColumn = [
                "Plaka", "Marka/Model", "Şantiye", "Personel",
                "Yakıt Tipi", "Yakıt Tarihi", "Miktar (L)", "Birim Fiyat", "Toplam Maliyet"
            ];

            const tableRows = allData.map(row => {
                const personnelFullName = `${row.personnel_name || ''} ${row.personnel_family || ''}`.trim() || '-';
                const totalCostNumber = parseCurrencyToNumber(row.total_price);
                const fuelFeeNumber = parseCurrencyToNumber(row.fuel_fee);

                return [
                    row.plaque, `${row.brand} / ${row.model}`, row.workhouse_name || '-', personnelFullName,
                    row.fuel_type, format(new Date(row.fuel_date), 'dd/MM/yyyy HH:mm'), row.fuel_amount.toString(),
                    fuelFeeNumber.toLocaleString('us-US', { minimumFractionDigits: 2 }),
                    totalCostNumber.toLocaleString('us-US', { minimumFractionDigits: 2 }),
                ];
            });

            const calculatedTotalPrice = allData.reduce((sum, row) => sum + parseCurrencyToNumber(row.total_price), 0);
            const totalDisplay = calculatedTotalPrice.toLocaleString('us-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 });

            autoTable(doc, {
                startY: 70,
                head: [tableColumn], body: tableRows, theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 5 },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                foot: [['', '', '', '', '', '', 'Toplam Maliyet:', totalDisplay, '']],
                footStyles: { fillColor: [230, 240, 245], textColor: [192, 0, 0], fontStyle: 'normal', fontSize: 9 },
                columnStyles: { 7: { fontStyle: 'bold', halign: 'right' }, 8: { fontStyle: 'bold', halign: 'right' }, },
                didDrawPage: (_data) => { addPdfFooter(doc); }
            });

            doc.save(`Tum_Yakıt_Raporu_${format(new Date(), 'yyyyMMddHHmm')}.pdf`);
            showAlert('PDF raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'Toplu PDF raporu oluşturulurken bir hata oluştu.'); }
    };


    const handleExportExcelSingle = async (report: CarReportRowType) => {
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); return; }
        showAlert('Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Yakıt Kaydı Detay', { views: [{ rightToLeft: false }] });

            const personnelFullName = `${report.personnel_name || ''} ${report.personnel_family || ''}`.trim() || '-';
            const totalCostNumber = parseCurrencyToNumber(report.total_price);
            const fuelFeeNumber = parseCurrencyToNumber(report.fuel_fee);

            const data = [
                ['Plaka', report.plaque], ['Marka / Model', `${report.brand} / ${report.model}`],
                ['Şantiye', report.workhouse_name || '-'], ['Proje / İş', report.work_title || '-'],
                ['Personel', personnelFullName],
                ['Yakıt Tipi', report.fuel_type],
                ['Yakıt Tarihi', format(new Date(report.fuel_date), 'dd/MM/yyyy HH:mm')],
                ['Miktar (Litre)', report.fuel_amount],
                ['Birim Fiyat', fuelFeeNumber],
                ['Toplam Maliyet', totalCostNumber],
            ];

            const titleRow = sheet.addRow(['Araç Yakıt Kaydı Detayı']);
            titleRow.font = { name: 'Calibri', size: 14, bold: true };
            sheet.mergeCells('A1:B1'); sheet.addRow([]);

            const headerRow = sheet.addRow(['Alan (Field)', 'Değer (Value)']);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            data.forEach((row, _index) => {
                const newRow = sheet.addRow(row);
                newRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
                const fieldName = row[0] as string;
                if (fieldName.includes('Maliyet') || fieldName.includes('Birim Fiyat')) { newRow.getCell(2).numFmt = '₺ #,##0.00'; }
            });

            sheet.columns[0].width = 25; sheet.columns[1].width = 35;
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Yakıt_Detay_${report.plaque}_${format(new Date(), 'yyyyMMddHHmm')}.xlsx`);
            showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'Excel raporu oluşturulurken bir hata oluştu.'); }
    };


    const handleExportExcelAll = async () => {
        showAlert('Tüm verilerin Excel raporu hazırlanıyor, lütfen bekleyin...', 'info');

        const allData = await fetchAllFilteredData();
        if (!allData || allData.length === 0) {
            showAlert('Dışa aktarılacak veri bulunamadı.', 'warning');
            return;
        }

        try {
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Tüm Yakıt Kayıtları', { views: [{ rightToLeft: false }] });

            const tableColumn = [
                "Plaka", "Marka", "Model", "Şantiye Adı", "Şantiye Kodu", "Proje Adı", "Personel Adı", "Personel Soyadı",
                "Yakıt Tipi", "Yakıt Tarihi", "Miktar (L)", "Birim Fiyat (TL)", "Toplam Maliyet (TL)"
            ];

            const headerRow = sheet.addRow(tableColumn);
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; cell.font = { bold: true };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            allData.forEach(row => {
                const totalCostNumber = parseCurrencyToNumber(row.total_price);
                const fuelFeeNumber = parseCurrencyToNumber(row.fuel_fee);

                sheet.addRow([
                    row.plaque, row.brand, row.model, row.workhouse_name || '-', row.workhouse_code || '-',
                    row.work_title || '-', row.personnel_name || '-', row.personnel_family || '-',
                    row.fuel_type, format(new Date(row.fuel_date), 'dd/MM/yyyy HH:mm'),
                    row.fuel_amount, fuelFeeNumber, totalCostNumber,
                ]);
            });

            sheet.columns.forEach((column, index) => {
                const header = tableColumn[index];
                column.width = header.length < 15 ? 15 : header.length * 1.2;
                if (header.includes('(TL)')) { column.numFmt = '₺ #,##0.00'; }
                else if (header.includes('(L)')) { column.numFmt = '#,##0.00'; }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Tum_Yakıt_Raporu_${format(new Date(), 'yyyyMMddHHmm')}.xlsx`);
            showAlert('Excel raporu başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (e: any) { handleApiError(e, 'Toplu Excel raporu oluşturulurken bir hata oluştu.'); }
    };

    const calculatedFilteredTotalPrice = useMemo(() => {
        if (!processedData) return 0;
        return processedData.reduce((acc, row) => {
            const val = parseCurrencyToNumber(row.total_price);
            return acc + val;
        }, 0);
    }, [processedData]);


    const tableHeaders = [
        { label: 'Plaka', key: 'plaque' },
        { label: 'Marka / Model', key: 'brand_model' },
        { label: 'Şantiye', key: 'workhouse_name' },
        { label: 'Yakıt Tipi', key: 'fuel_type' },
        { label: 'Miktar', key: 'fuel_amount' },
        { label: 'Birim Fiyat', key: 'fuel_fee' },
        { label: 'Toplam', key: 'total_price' },
        { label: '', key: 'actions' },
    ];


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconCar size={28} style={{ marginRight: 8 }} /> Araç Yakıt Raporları
            </Typography>

            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>
                    <Grid item xs={12} sm={4} md={3}>
                        <Autocomplete
                            id="workhouse-select" options={workhousesList} getOptionLabel={(o) => `${o.name} (${o.code})`}
                            value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
                            onChange={(_, newValue) => handleFilterChange('workhouseId', newValue?.id || null)}
                            renderInput={(params) => (<TextField {...params} label="Şantiye" fullWidth size="small" />)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
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

                    <Grid item xs={12} sm={4} md={3}>
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
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tabloda Ara (Plaka, Marka, Şantiye, Personel...)"
                                variant="outlined" fullWidth size="small"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6} display="flex" justifyContent="flex-end" gap={1}>
                            <Button variant="outlined" color="success" startIcon={<IconFileSpreadsheet />} onClick={handleExportExcelAll} disabled={loadingData || !reportData?.data?.length}>
                                Tüm Veriyi Excel İndir
                            </Button>
                            <Button variant="outlined" color="error" startIcon={<IconFileDownload />} onClick={handleExportPdfAll} disabled={loadingData || !reportData?.data?.length}>
                                Tüm Veriyi PDF İndir
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>
            <BlankCard>
                <TableContainer sx={{ overflowX: 'auto', mt: "3" }}>
                    <Table aria-label="car report table">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {tableHeaders.map((header) => (
                                    <StyledTableCell key={header.key}>
                                        <TableSortLabel
                                            active={orderBy === header.key}
                                            direction={orderBy === header.key ? order : 'asc'}
                                            onClick={() => handleRequestSort(header.key)}
                                        >
                                            <Typography variant="h6" fontWeight="bold">
                                                {header.label}
                                            </Typography>
                                            {orderBy === header.key ? (
                                                <Box component="span" sx={visuallyHiddenStyle}>
                                                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                                </Box>
                                            ) : null}
                                        </TableSortLabel>
                                    </StyledTableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><CircularProgress size={20} sx={{ my: 3 }} /></StyledTableCell></TableRow>
                            ) : visibleRows.length ? (
                                visibleRows.map((row, index) => {
                                    const totalCostNumber = parseCurrencyToNumber(row.total_price);
                                    const fuelFeeNumber = parseCurrencyToNumber(row.fuel_fee);

                                    return (
                                        <TableRow key={`${row.plaque}-${row.fuel_date}-${index}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>{row.plaque}</StyledTableCell>
                                            <StyledTableCell>{`${row.brand} / ${row.model}`}</StyledTableCell>
                                            <StyledTableCell>{row.workhouse_name || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.fuel_type}</StyledTableCell>
                                            <StyledTableCell>{row.fuel_amount}</StyledTableCell>
                                            <StyledTableCell>{fuelFeeNumber.toLocaleString('us-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}</StyledTableCell>
                                            <StyledTableCell><Typography color="primary">{totalCostNumber.toLocaleString('us-US', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 })}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Tooltip title="Detaylar ve İşlemler">
                                                    <IconButton
                                                        id={`actions-button-${index}`}
                                                        onClick={(event) => handleClickMenu(event, row)}
                                                        color="secondary" size="small"
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
                                                        <ListItemIcon><IconRuler width={18} /></ListItemIcon> Detayları Görüntüle
                                                    </MenuItem>
                                                    <MenuItem onClick={() => handleExportPdfSingle(row)}>
                                                        <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> PDF İndir
                                                    </MenuItem>
                                                    <MenuItem onClick={() => handleExportExcelSingle(row)}>
                                                        <ListItemIcon><IconFileSpreadsheet width={18} /></ListItemIcon> Excel İndir
                                                    </MenuItem>
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><StyledTableCell colSpan={tableHeaders.length + 1} align="center"><Typography variant="subtitle1" color="textSecondary" sx={{ my: 2 }}>Filtrelenen kritere uygun yakıt kaydı bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                        <>
                            {reportData && (
                                <TableFooter>
                                    <TableRow>
                                        <StyledTableCell colSpan={9} align="right" sx={{ p: 2, background: '#fafafa', borderTop: '1px solid #ddd' }}>
                                            <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2}>
                                                <Typography variant="h6" fontWeight="bold" color="error.main">
                                                    {searchTerm ? 'FİLTRELENMİŞ TOPLAM:' : 'TOPLAM RAPOR MALİYETİ:'}
                                                </Typography>
                                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                                    {calculatedFilteredTotalPrice.toLocaleString('us-US', {
                                                        style: 'currency',
                                                        currency: 'TRY',
                                                        minimumFractionDigits: 2
                                                    })}
                                                </Typography>
                                            </Stack>
                                        </StyledTableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </>
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

            <DetailViewModal
                open={openDetailViewModal} onClose={handleCloseDetailViewModal}
                report={selectedReportToDownload}
                onExportExcel={handleExportExcelSingle}
                onExportPdf={handleExportPdfSingle}
            />
        </Box>
    );
};

export default ListCarwarehouseReport;