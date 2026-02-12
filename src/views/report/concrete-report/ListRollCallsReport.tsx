import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Box,
    TableCell as MuiTableCell,
    Stack, Alert, CircularProgress, Button,
    Tooltip, Grid, TextField, IconButton, InputAdornment,
    Autocomplete,
    TableFooter,
    TableSortLabel,
    TablePagination,
    Chip,
    Menu, MenuItem, ListItemIcon,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider,
    TableCell,
    ToggleButtonGroup,
    ToggleButton as MuiToggleButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    IconSearch, IconFileDownload,
    IconFileSpreadsheet,
    IconClock,
    IconDots,
    IconRuler,
    IconEye,
    IconX
} from '@tabler/icons-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import server from '../../../assets/address.json';

import BlankCard from '../../../components/shared/BlankCard';
import { format, startOfYear, endOfYear, parseISO } from 'date-fns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';

import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '0.9rem', },
    whiteSpace: 'nowrap',
}));
interface WorkhouseType { id: number; name: string; code: string; address: string; createAt: string; recordStatus: number; }

interface RollCallRowType {
    workhouseId: string;
    workhouse: string;
    personnel_name: string;
    personnel_family: string;
    personnel_father_name: string;
    personnel_identity_number: string;
    personnel_job_start_date: string;
    personnel_job_end_date: string | null;
    rollcall_date: string;
    rollcall_start_time: string;
    rollcall_end_time: string;
    rollcall_absence: boolean;
}

interface FilterParams {
    fromDate: string;
    toDate: string;
    workhouseId: number | null;
}

type Order = 'asc' | 'desc';

const addPdfHeader = (doc: jsPDF, title: string) => {
    const docAny = doc as any;
    if (!docAny.vfs || !docAny.vfs['NotoSans-Regular.ttf']) {
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    }

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
    doc.setFont('NotoSans', 'normal');
    doc.text(`Rapor Tarihi:`, 15, 35);
    doc.setFont('NotoSans', 'normal');
    doc.text(`${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 80, 35);

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


const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'present' && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'absent' && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));
interface DetailModalProps {
    open: boolean;
    onClose: () => void;
    data: RollCallRowType | null;
    onExportExcel: (row: RollCallRowType) => void;
    onExportPdf: (row: RollCallRowType) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ open, onClose, data, onExportExcel, onExportPdf }) => {
    if (!data) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconEye size={24} /> Yoklama Detayı
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>Personel Bilgileri</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="Adı Soyadı" fullWidth size="small" value={`${data.personnel_name} ${data.personnel_family}`} InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="TC Kimlik No" fullWidth size="small" value={data.personnel_identity_number} InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="Baba Adı" fullWidth size="small" value={data.personnel_father_name} InputProps={{ readOnly: true }} />
                    </Grid>

                    <Grid item xs={12} mt={1}>
                        <Typography variant="subtitle2" color="secondary" gutterBottom>Şantiye ve Tarih</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Şantiye" fullWidth size="small" value={data.workhouse} InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="Tarih" fullWidth size="small" value={format(parseISO(data.rollcall_date), 'dd/MM/yyyy')} InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Durum"
                            fullWidth
                            size="small"
                            value={data.rollcall_absence ? "Gelmedi (YOK)" : "Geldi (VAR)"}
                            InputProps={{ readOnly: true, style: { color: data.rollcall_absence ? 'red' : 'green', fontWeight: 'bold' } }}
                        />
                    </Grid>

                    <Grid item xs={12} mt={1}>
                        <Typography variant="subtitle2" color="info.main" gutterBottom>Saat Bilgileri</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="Giriş Saati" fullWidth size="small" value={data.rollcall_start_time} InputProps={{ readOnly: true }} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="Çıkış Saati" fullWidth size="small" value={data.rollcall_end_time} InputProps={{ readOnly: true }} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" color="success" size="small" startIcon={<IconFileSpreadsheet />} onClick={() => onExportExcel(data)}>Excel</Button>
                    <Button variant="outlined" color="error" size="small" startIcon={<IconFileDownload />} onClick={() => onExportPdf(data)}>PDF</Button>
                </Stack>
                <Button onClick={onClose} color="inherit">Kapat</Button>
            </DialogActions>
        </Dialog>
    );
};

const ListRollCallsReport = () => {
    const navigate = useNavigate();
    const currentYearStart = startOfYear(new Date());
    const currentYearEnd = endOfYear(new Date());

    const [startDate, setStartDate] = useState<Date | null>(currentYearStart);
    const [endDate, setEndDate] = useState<Date | null>(currentYearEnd);
    const [searchTerm, setSearchTerm] = useState('');

    const [filterParams, setFilterParams] = useState<FilterParams>({
        fromDate: format(currentYearStart, 'yyyy-MM-dd'),
        toDate: format(currentYearEnd, 'yyyy-MM-dd'),
        workhouseId: null,
    });

    const [reportData, setReportData] = useState<RollCallRowType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowMenu, setSelectedRowMenu] = useState<RollCallRowType | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedRowDetail, setSelectedRowDetail] = useState<RollCallRowType | null>(null);

    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof RollCallRowType>('rollcall_date');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent'>('all');

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message); setAlertSeverity(severity);
        setTimeout(() => setAlertMessage(null), 5000);
    }, []);

    const handleApiError = useCallback((e: any) => {
        if (e.response?.status === 401) {
            localStorage.removeItem('authToken');
            navigate("/");
        } else {
            showAlert('Bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);

    const getWorkhousesList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;
        try {
            const role = localStorage.getItem('activeUserRoleName') || '';
            let params = role.toLowerCase() !== 'admin' ? { rolename: role } : {};
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", {
                headers: { "Authorization": `Bearer ${authToken}` }, params
            });
            if (response.data.httpStatusCode === 200) {
                setWorkhousesList(response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0));
            }
        } catch (e) { console.error(e); }
    }, []);

    const fetchRollCallData = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }

        setLoadingData(true);
        try {
            const params = {
                fromDate: filterParams.fromDate,
                toDate: filterParams.toDate,
                workhouseId: filterParams.workhouseId
            };
            const response = await axios.get(server.baseurl + server.report + `rollcalls`, {
                headers: { "Authorization": `Bearer ${authToken}` }, params
            });

            if (response.data.success && response.data.data) {
                setReportData(response.data.data);
            } else {
                setReportData([]);
                showAlert('Veri bulunamadı.', 'warning');
            }
        } catch (e: any) {
            setReportData([]);
            handleApiError(e);
        } finally {
            setLoadingData(false);
        }
    }, [filterParams, navigate, showAlert, handleApiError]);

    useEffect(() => { getWorkhousesList(); }, [getWorkhousesList]);
    useEffect(() => { if (startDate) setFilterParams(prev => ({ ...prev, fromDate: format(startDate, 'yyyy-MM-dd') })); }, [startDate]);
    useEffect(() => { if (endDate) setFilterParams(prev => ({ ...prev, toDate: format(endDate, 'yyyy-MM-dd') })); }, [endDate]);
    useEffect(() => { fetchRollCallData(); }, [fetchRollCallData]);

    function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
        if (orderBy === 'rollcall_date') {
            return new Date(a[orderBy] as any).getTime() < new Date(b[orderBy] as any).getTime() ? 1 : -1;
        }
        if (b[orderBy] < a[orderBy]) return -1;
        if (b[orderBy] > a[orderBy]) return 1;
        return 0;
    }

    const processedData = useMemo(() => {
        let data = [...reportData];

        if (attendanceFilter === 'present') {
            data = data.filter(row => row.rollcall_absence === false);
        } else if (attendanceFilter === 'absent') {
            data = data.filter(row => row.rollcall_absence === true);
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(row =>
                (row.personnel_name + ' ' + row.personnel_family).toLowerCase().includes(lowerTerm) ||
                row.workhouse.toLowerCase().includes(lowerTerm) ||
                row.personnel_identity_number.includes(lowerTerm)
            );
        }

        if (orderBy) {
            data.sort(order === 'desc'
                ? (a, b) => descendingComparator(a, b, orderBy)
                : (a, b) => -descendingComparator(a, b, orderBy)
            );
        }
        return data;
    }, [reportData, searchTerm, order, orderBy, attendanceFilter]);

    const visibleRows = useMemo(() => processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [processedData, page, rowsPerPage]);

    const handleExportExcelAll = async () => {
        if (processedData.length === 0) return showAlert('Veri yok.', 'warning');
        showAlert('Tüm liste Excel olarak hazırlanıyor...', 'info');
        try {
            const Excel = (await import('exceljs')).default;
            const { saveAs } = await import('file-saver');
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Yoklama Listesi');

            const headers = ["Şantiye", "Personel Adı", "TC No", "Tarih", "Giriş", "Çıkış", "Durum"];
            const headerRow = sheet.addRow(headers);
            headerRow.font = { bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            });
            processedData.forEach(row => {
                const newRow = sheet.addRow([
                    row.workhouse,
                    `${row.personnel_name} ${row.personnel_family}`,
                    row.personnel_identity_number,
                    format(parseISO(row.rollcall_date), 'dd/MM/yyyy'),
                    row.rollcall_start_time,
                    row.rollcall_end_time,
                    row.rollcall_absence ? 'YOK' : 'VAR'
                ]);
                const statusCell = newRow.getCell(7);
                statusCell.font = { color: { argb: row.rollcall_absence ? 'FFFF0000' : 'FF008000' }, bold: true };
            });

            sheet.columns.forEach(col => { col.width = 20; });
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Yoklama_Listesi_${format(new Date(), 'yyyyMMdd')}.xlsx`);
            showAlert('Excel indirildi.', 'success');
        } catch (e) { showAlert('Hata oluştu.', 'error'); }
    };

    const handleExportPdfAll = async () => {
        if (processedData.length === 0) return showAlert('Veri yok.', 'warning');
        showAlert('Tüm liste PDF olarak hazırlanıyor...', 'info');
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF('landscape', 'pt', 'a4');
            addPdfHeader(doc, "Yoklama Raporu Listesi");
            const body = processedData.map(row => [
                row.workhouse,
                `${row.personnel_name} ${row.personnel_family}`,
                row.personnel_identity_number,
                format(parseISO(row.rollcall_date), 'dd/MM/yyyy'),
                row.rollcall_start_time,
                row.rollcall_end_time,
                row.rollcall_absence ? 'YOK' : 'VAR'
            ]);

            autoTable(doc, {
                head: [["Şantiye", "Personel", "TC No", "Tarih", "Giriş", "Çıkış", "Durum"]],
                body: body,
                startY: 50,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9 },
                headStyles: { fillColor: [60, 141, 188], textColor: 255 },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 6) {
                        data.cell.styles.textColor = data.cell.raw === 'YOK' ? [255, 0, 0] : [0, 128, 0];
                        data.cell.styles.fontStyle = 'normal';
                    }
                },
                didDrawPage: (_data) => {
                    addPdfFooter(doc);
                }
            });

            doc.save(`Yoklama_Listesi_${format(new Date(), 'yyyyMMdd')}.pdf`);
            showAlert('PDF indirildi.', 'success');
        } catch (e) {
            console.error(e);
            showAlert('Hata oluştu.', 'error');
        }
    };

    const handleExportExcelSingle = async (row: RollCallRowType) => {
        try {
            const Excel = (await import('exceljs')).default;
            const { saveAs } = await import('file-saver');
            const workbook = new Excel.Workbook();
            const sheet = workbook.addWorksheet('Detay');

            const dataRows = [
                ['Şantiye', row.workhouse],
                ['Personel', `${row.personnel_name} ${row.personnel_family}`],
                ['TC Kimlik', row.personnel_identity_number],
                ['Tarih', format(parseISO(row.rollcall_date), 'dd/MM/yyyy')],
                ['Giriş Saati', row.rollcall_start_time],
                ['Çıkış Saati', row.rollcall_end_time],
                ['Durum', row.rollcall_absence ? 'YOK' : 'VAR']
            ];

            sheet.addRows(dataRows);
            sheet.columns[0].width = 20;
            sheet.columns[1].width = 30;

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Yoklama_${row.personnel_name}.xlsx`);
            showAlert('Excel indirildi.', 'success');
        } catch (e) { showAlert('Hata oluştu.', 'error'); }
    };

    const handleExportPdfSingle = async (row: RollCallRowType) => {
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF('p', 'pt', 'a4');
            addPdfHeader(doc, `Yoklama Detayı: ${row.personnel_name} ${row.personnel_family}`);

            const body = [
                ['Şantiye', row.workhouse],
                ['Personel', `${row.personnel_name} ${row.personnel_family}`],
                ['TC No', row.personnel_identity_number],
                ['Tarih', format(parseISO(row.rollcall_date), 'dd/MM/yyyy')],
                ['Giriş', row.rollcall_start_time],
                ['Çıkış', row.rollcall_end_time],
                ['Durum', row.rollcall_absence ? 'GELMEDİ (YOK)' : 'GELDİ (VAR)']
            ];

            autoTable(doc, {
                body: body,
                startY: 60,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10 },
                columnStyles: { 0: { fontStyle: 'normal', fillColor: [240, 240, 240], cellWidth: 100 } },
                didDrawPage: (_data) => {
                    addPdfFooter(doc);
                }
            });

            doc.save(`Yoklama_${row.personnel_name}.pdf`);
            showAlert('PDF indirildi.', 'success');
        } catch (e) { showAlert('Hata oluştu.', 'error'); }
    };
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, row: RollCallRowType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowMenu(row);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedRowMenu(null);
    };
    const handleOpenDetail = (row: RollCallRowType) => {
        setSelectedRowDetail(row);
        setDetailModalOpen(true);
        handleMenuClose();
    };


    return (
        <Box>
            <Typography variant="h4" mb={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconClock size={28} style={{ marginRight: 8 }} /> Yoklama Raporları
            </Typography>

            {alertMessage && (<Alert severity={alertSeverity} onClose={() => setAlertMessage(null)} sx={{ mb: 2 }}>{alertMessage}</Alert>)}

            <BlankCard sx={{ mb: 5, p: 3 }}>
                <Typography variant="h6" mb={2} p={2}>Filtreleme</Typography>
                <Grid container spacing={3} p={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            id="workhouse-select"
                            options={workhousesList}
                            getOptionLabel={(o) => `${o.name} (${o.code})`}
                            value={workhousesList.find(wh => wh.id === filterParams.workhouseId) || null}
                            onChange={(_, v) => setFilterParams(prev => ({ ...prev, workhouseId: v?.id || null }))}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            renderInput={(params) => (<TextField {...params} label="Şantiye" fullWidth size="small" />)}
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
                        <Grid item xs={12} sm={3} md={3}>
                            <TextField
                                label="Ara (Proje Adı/Kodu, Şantiye Adı, İş Tipi)"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>)
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4} md={4} display="flex" alignItems="center">
                            <ToggleButtonGroup
                                value={attendanceFilter}
                                exclusive
                                onChange={(_, newValue) => newValue && setAttendanceFilter(newValue)}
                                size="small"
                                color="primary"
                            >
                                <StyledToggleButton value="all" sx={{ px: 3 }}>
                                    Tümü
                                </StyledToggleButton>
                                <StyledToggleButton value="present">
                                    Gelenler
                                </StyledToggleButton>
                                <StyledToggleButton value="absent">
                                    Gelmeyenler
                                </StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>

                        <Grid item xs={12} sm={5} md={5} spacing={2} display={'flex'} justifyContent={'space-evenly'}>
                            <Button
                                variant="outlined"
                                color="success"
                                startIcon={<IconFileSpreadsheet size={20} />}
                                onClick={() => handleExportExcelAll()}
                                disabled={loadingData || processedData.length === 0}
                            >
                                Tüm Veriyi Excel İndir
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<IconFileDownload size={20} />}
                                onClick={() => handleExportPdfAll()}
                                disabled={loadingData || processedData.length === 0}
                            >
                                Tüm Veriyi PDF İndir
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </BlankCard>

            <Box sx={{ margin: "20px 0" }}></Box>


            <BlankCard>
                <TableContainer>
                    <Table>
                        <TableHead sx={{ background: "#f4f6f8" }}>
                            <TableRow>
                                <StyledTableCell><TableSortLabel active={orderBy === 'workhouse'} direction={orderBy === 'workhouse' ? order : 'asc'} onClick={() => { setOrder(order === 'asc' ? 'desc' : 'asc'); setOrderBy('workhouse'); }}>Şantiye</TableSortLabel></StyledTableCell>
                                <StyledTableCell><TableSortLabel active={orderBy === 'personnel_name'} direction={orderBy === 'personnel_name' ? order : 'asc'} onClick={() => { setOrder(order === 'asc' ? 'desc' : 'asc'); setOrderBy('personnel_name'); }}>Personel</TableSortLabel></StyledTableCell>
                                <StyledTableCell>TC No</StyledTableCell>
                                <StyledTableCell><TableSortLabel active={orderBy === 'rollcall_date'} direction={orderBy === 'rollcall_date' ? order : 'asc'} onClick={() => { setOrder(order === 'asc' ? 'desc' : 'asc'); setOrderBy('rollcall_date'); }}>Tarih</TableSortLabel></StyledTableCell>
                                <StyledTableCell>Saatler</StyledTableCell>
                                <StyledTableCell align="center">Durum</StyledTableCell>
                                <StyledTableCell align="center">İşlemler</StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow><TableCell colSpan={7} align="center"><CircularProgress sx={{ my: 3 }} /></TableCell></TableRow>
                            ) : visibleRows.length > 0 ? (
                                visibleRows.map((row, index) => (
                                    <TableRow key={index} hover>
                                        <StyledTableCell>{row.workhouse}</StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body2" fontWeight="600">{row.personnel_name} {row.personnel_family}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>{row.personnel_identity_number}</StyledTableCell>
                                        <StyledTableCell>{format(parseISO(row.rollcall_date), 'dd/MM/yyyy')}</StyledTableCell>
                                        <StyledTableCell>{row.rollcall_start_time} - {row.rollcall_end_time}</StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Chip
                                                label={row.rollcall_absence ? "Gelmedi" : "Geldi"}
                                                color={row.rollcall_absence ? "error" : "success"}
                                                size="small" variant="filled"
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell align="center">
                                            <Tooltip title="İşlemler">
                                                <IconButton size="small" onClick={(e) => handleMenuClick(e, row)}>
                                                    <IconDots size={18} />
                                                </IconButton>
                                            </Tooltip>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} align="center">Veri bulunamadı.</TableCell></TableRow>
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TablePagination
                                    rowsPerPageOptions={[10, 25, 50, 100]}
                                    count={processedData.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={(_, p) => setPage(p)}
                                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                                    labelRowsPerPage="Satır:"
                                />
                            </TableRow>
                        </TableFooter>
                    </Table>
                </TableContainer>
            </BlankCard>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => selectedRowMenu && handleOpenDetail(selectedRowMenu)}>
                    <ListItemIcon><IconRuler size={18} /></ListItemIcon> Detaylar
                </MenuItem>
                <MenuItem onClick={() => { if (selectedRowMenu) handleExportPdfSingle(selectedRowMenu); handleMenuClose(); }}>
                    <ListItemIcon><IconFileDownload size={18} /></ListItemIcon> PDF İndir (Tekli)
                </MenuItem>
                <MenuItem onClick={() => { if (selectedRowMenu) handleExportExcelSingle(selectedRowMenu); handleMenuClose(); }}>
                    <ListItemIcon><IconFileSpreadsheet size={18} /></ListItemIcon> Excel İndir (Tekli)
                </MenuItem>
            </Menu>

            <DetailModal
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                data={selectedRowDetail}
                onExportExcel={handleExportExcelSingle}
                onExportPdf={handleExportPdfSingle}
            />

        </Box>
    );
};

export default ListRollCallsReport;