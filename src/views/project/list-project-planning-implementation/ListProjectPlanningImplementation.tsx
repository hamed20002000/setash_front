
// ListProjectPlanningImplementation.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Autocomplete, Chip, Checkbox, FormControlLabel,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconPlus, IconX, IconFileSpreadsheet, IconFileText, IconSettings
} from '@tabler/icons-react';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from 'src/components/shared/BlankCard';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useAuth } from 'src/context/AuthContext';
import { tr } from 'date-fns/locale';
import { format, max as dateMax } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import DeleteProjectPlanningImplementation from "./DeleteProjectPlanningImplementation";

/* ===== Interfaces ===== */
interface ProjectType { id: string; title: string; code: string; }
interface ProjectPlanningType { id: string; startDate: string; endDate: string; project: ProjectType; recordStatus: number; }
interface ForceMajorType { id: string; title: string; recordStatus: number; }

interface ImplementationDateType {
    id: string;
    projectPlanningId: number;
    forceMajorId: number | null;
    startDate: string;
    endDate: string;
    recordStatus: number;
    status: 'Aktif' | 'Pasif';
    projectPlanning?: ProjectPlanningType;
    forceMajor?: ForceMajorType;
}

interface NewImplementationDateData {
    projectPlanningId: number;
    forceMajorId: number | null;
    startDate: string;
    endDate: string;
}
interface EditImplementationDateData extends NewImplementationDateData { id: number; }

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

/* پاسخ get-project-planning-by-id/{id} — فقط فیلدهای لازم */
interface PlanningById {
    id: string;
    startDate: string;
    endDate: string;
    project: { id: string; title: string; code: string; };
}

const INITIAL_IMPLEMENTATION_DATE_STATE = {
    projectPlanningId: null as number | null,
    forceMajorId: null as number | null,
    startDate: null as Date | null,
    endDate: null as Date | null,
};

/* ===== Styles ===== */
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));

const StyledToggleButton = styled(MuiToggleButton)<{ value: 'all' | 'active' | 'inactive' }>(({ theme, value }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 'active' && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 'inactive' && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
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

/* ===== Utils ===== */
const isValidDate = (d: Date) => !isNaN(d.getTime());
const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a?: Date | null, b?: Date | null) => !!a && !!b && toDateOnly(a).getTime() === toDateOnly(b).getTime();

/* خواندن id پلنینگ از ردیف چه projectPlanningId باشد چه projectPlanning.id */
const getPlanningIdFromRow = (row: ImplementationDateType): number | null => {
    const a = (row as any).projectPlanningId;
    const b = (row as any).projectPlanning?.id;
    const idStr = a ?? b ?? null;
    return idStr != null ? Number(idStr) : null;
};

const formatDateDisplay = (dateValue: Date | string | null): string => {
    if (!dateValue) return "N/A";
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (!isValidDate(date)) return "Geçersiz Tarih";
    try { return format(date, 'dd MMMM yyyy', { locale: tr }); } catch { return "Geçersiz Tarih"; }
};

/* ===== PDF / Excel Helpers ===== */
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
    doc.text(`${formatDateDisplay(new Date())}`, 45, 45);
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
    companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};

const exportImplementationDatesToPdf = (data: ImplementationDateType[], title: string, subtitle?: string) => {
    if (!data || data.length === 0) throw new Error('PDF oluşturulacak kayıt bulunamadı.');
    const doc = new jsPDF();
    const docAny = doc as any;

    addPdfHeader(doc, title);
    if (subtitle) { doc.setFontSize(10); doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 52, { align: 'center' }); }

    const tableHeaders = ['Proje Adı (Kod)', 'Mücbir Sebep', 'Tarih'];
    const tableBody = data.map(item => [
        `${item.projectPlanning?.project?.title || '-'} (${item.projectPlanning?.project?.code || item.projectPlanningId})`,
        item.forceMajor?.title || '-',
        formatDateDisplay(item.startDate), // تاریخ ثبت = startDate
    ]);

    autoTable(docAny, {
        startY: 60,
        head: [tableHeaders],
        body: tableBody,
        theme: 'grid',
        styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
        didDrawPage: () => { addPdfFooter(doc); },
        margin: { top: 55, bottom: 40 }
    });

    doc.save(`${title.replace(/ /g, '_')}_Liste.pdf`);
};

const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
    worksheet.views = [{ rightToLeft: false }];
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { name: 'NotoSans', size: 14, bold: true };
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    const dateRow = worksheet.addRow([`Rapor Tarihi: ${formatDateDisplay(new Date())}`]);
    dateRow.font = { name: 'NotoSans', size: 10, bold: false };
    worksheet.mergeCells(dateRow.number, 1, dateRow.number, columnsLength);
    worksheet.addRow([]);
};

const addExcelCompanyInfo = (worksheet: Excel.Worksheet, startRow: number, columnsLength: number) => {
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİم İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
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

const exportImplementationDatesToExcel = async (data: ImplementationDateType[], title: string) => {
    if (!data || data.length === 0) throw new Error('Excel oluşturulacak kayıt bulunamadı.');
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet(title.replace(/ /g, '_').substring(0, 31));

    const tableHeaders = ['Proje Adı (Kod)', 'Mücbir Sebep', 'Tarih'];
    const totalColumns = tableHeaders.length;

    addExcelHeader(worksheet, title, totalColumns);

    const headerRow = worksheet.addRow(tableHeaders);
    headerRow.font = { name: 'NotoSans', bold: true };
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    data.forEach(item => {
        worksheet.addRow([
            `${item.projectPlanning?.project?.title || '-'} (${item.projectPlanning?.project?.code || item.projectPlanningId})`,
            item.forceMajor?.title || '-',
            formatDateDisplay(item.startDate),
        ]);
    });

    worksheet.columns.forEach(column => { column.width = 22; });
    worksheet.addRow([]);
    addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 1, totalColumns);

    const fileName = `${title.replace(/ /g, '_')}_Liste.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
};

/* ===== Component ===== */
const ListProjectPlanningImplementation = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem('authToken');

    // Form
    const [formData, setFormData] = useState<typeof INITIAL_IMPLEMENTATION_DATE_STATE>(INITIAL_IMPLEMENTATION_DATE_STATE);
    const [isForceMajorRequired, setIsForceMajorRequired] = useState(false);

    // Lists / UI
    const [implementationDateList, setImplementationDateList] = useState<ImplementationDateType[]>([]);
    const [displayedImplementationDates, setDisplayedImplementationDates] = useState<ImplementationDateType[]>([]);
    const [projectPlannings, setProjectPlannings] = useState<ProjectPlanningType[]>([]);
    const [forceMajors, setForceMajors] = useState<ForceMajorType[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadingButton, setLoadingButton] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Table/Filter/Menu
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ImplementationDateType | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
    const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openDownloadSingleModal, setOpenDownloadSingleModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<ImplementationDateType | null>(null);

    const [selectedPlanningInfo, setSelectedPlanningInfo] = useState<PlanningById | null>(null);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() => allowedOperations?.some(op => op.systemOperationName === 'Eklemek') ?? false, [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations?.some(op => op.systemOperationName === 'Düzenlemek') ?? false, [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations?.some(op => op.systemOperationName === 'Silmek') ?? false, [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations?.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak') ?? false, [allowedOperations]);

    /* Alerts */
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
        setTimeout(() => { setAlertMessage(null); }, 5000);
    }, []);

    const resetFormAndState = () => {
        setFormData(INITIAL_IMPLEMENTATION_DATE_STATE);
        setEditingId(null);
        setIsFormVisible(false);
        setIsForceMajorRequired(false);
        setSelectedPlanningInfo(null);
    };

    const handleClearDateFilters = () => { setStartDateFilter(null); setEndDateFilter(null); };

    /* Fetch data */
    const fetchDropdownData = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        setLoadingData(true);
        try {
            const [planningsRes, forceMajorsRes] = await Promise.all([
                axios.get<ApiResponse<ProjectPlanningType[]>>(server.baseurl + server.warehouse + "get-project-plannings", { headers: { "Authorization": `Bearer ${authToken}` } }),
                axios.get<ApiResponse<ForceMajorType[]>>(server.baseurl + server.warehouse + "get-force-majors", { headers: { "Authorization": `Bearer ${authToken}` } }),
            ]);
            if (planningsRes.data?.httpStatusCode === 200) setProjectPlannings(planningsRes.data.data.filter(p => p.recordStatus === 0) || []);
            if (forceMajorsRes.data?.httpStatusCode === 200) setForceMajors(forceMajorsRes.data.data.filter(f => f.recordStatus === 0) || []);
        } catch {
            showAlert('Gerekli veriler yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert, authToken]);

    const fetchImplementationDates = useCallback(async () => {
        setLoadingData(true);
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get<ApiResponse<ImplementationDateType[]>>(
                server.baseurl + server.warehouse + "get-project-planning-implementation-dates",
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            if (response.data.httpStatusCode === 200) {
                const formatted = response.data.data.map(i => ({ ...i, status: (i.recordStatus === 0 ? 'Aktif' : 'Pasif') as 'Aktif' | 'Pasif' }));
                setImplementationDateList(formatted);
            } else {
                showAlert(response.data.message || 'Uygulama tarihi kayıtları yüklenirken bir hata oluştu.', 'error');
            }
        } catch {
            showAlert('Uygulama tarihi kayıtları yüklenirken bir hata oluştu.', 'error');
        } finally { setLoadingData(false); }
    }, [navigate, showAlert, authToken]);

    useEffect(() => { fetchImplementationDates(); fetchDropdownData(); }, [fetchImplementationDates, fetchDropdownData]);

    /* حداقل تاریخ مجاز برای ثبت: max( startDate پلنینگ , آخرین تاریخ ثبت شده برای همان پلنینگ ) */
    const minSelectableDate: Date | null = useMemo(() => {
        if (!formData.projectPlanningId) return null;

        const planId = Number(formData.projectPlanningId);
        const baseStart = selectedPlanningInfo?.startDate ? toDateOnly(new Date(selectedPlanningInfo.startDate)) : null;

        const records = implementationDateList.filter(r => getPlanningIdFromRow(r) === planId);
        const lastRecorded = records.length
            ? records
                .map(r => toDateOnly(new Date(r.startDate))) // تاریخ ثبت = startDate
                .filter(isValidDate)
                .sort((a, b) => a.getTime() - b.getTime())
                .at(-1)!
            : null;

        if (baseStart && lastRecorded) {
            return dateMax([baseStart, lastRecorded]);
        }
        return lastRecorded ?? baseStart ?? null;
    }, [formData.projectPlanningId, selectedPlanningInfo, implementationDateList]);

    /* Validation */
    const validateForm = useCallback((): boolean => {
        if (!formData.projectPlanningId) { showAlert('Proje Planı seçimi zorunludur.', 'warning'); return false; }
        if (isForceMajorRequired && !formData.forceMajorId) { showAlert('Mücbir Sebep zorunludur.', 'warning'); return false; }
        if (!formData.startDate) { showAlert('Tarih zorunludur.', 'warning'); return false; }

        // قاعده: تاریخ انتخابی نباید قبل از minSelectableDate باشد
        if (minSelectableDate && toDateOnly(formData.startDate).getTime() < toDateOnly(minSelectableDate).getTime()) {
            showAlert(`Tarih en az ${formatDateDisplay(minSelectableDate)} olabilir.`, 'error');
            return false;
        }
        // endDate باید برابر startDate باشد
        if (!sameDay(formData.startDate, formData.endDate)) {
            showAlert('Bitiş tarihi, başlangıç tarihi ile aynı olmalıdır.', 'error');
            return false;
        }
        return true;
    }, [formData, isForceMajorRequired, minSelectableDate, showAlert]);

    useEffect(() => {
        const baseRequiredOk =
            !!formData.projectPlanningId &&
            !!formData.startDate &&
            (!isForceMajorRequired || !!formData.forceMajorId);

        const ruleOk =
            (!!formData.startDate && !!formData.endDate && sameDay(formData.startDate, formData.endDate)) &&
            (!!minSelectableDate ? toDateOnly(formData.startDate!).getTime() >= toDateOnly(minSelectableDate).getTime() : false);

        // در حالت ادیت هم همان چک‌ها را نگه می‌داریم، چون تاریخ قفل است عملاً true می‌ماند
        setIsFormValid(baseRequiredOk && ruleOk);
    }, [formData, isForceMajorRequired, minSelectableDate]);

    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

    /* Filter table (overlap) — بدون تغییر ساختار فیلترها */
    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = startDateFilter !== null || endDateFilter !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);

        const from = startDateFilter ? toDateOnly(startDateFilter) : new Date(-8640000000000000);
        const to = endDateFilter ? toDateOnly(endDateFilter) : new Date(8640000000000000);

        const filtered = implementationDateList.filter(i => {
            const title = i.projectPlanning?.project?.title?.toLowerCase() ?? '';
            const code = i.projectPlanning?.project?.code?.toLowerCase() ?? '';
            const fm = i.forceMajor?.title?.toLowerCase() ?? '';
            const q = searchTerm.toLowerCase();

            const matchesSearch = title.includes(q) || code.includes(q) || fm.includes(q);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && i.recordStatus === 0) ||
                (statusFilter === 'inactive' && i.recordStatus === 1);

            const recDate = toDateOnly(new Date(i.startDate));
            const matchesDate = recDate >= from && recDate <= to;

            return matchesSearch && matchesStatus && matchesDate;
        });

        setDisplayedImplementationDates(filtered);
        setPage(0);
    }, [implementationDateList, searchTerm, statusFilter, startDateFilter, endDateFilter]);

    /* CRUD */
    const insertImplementationDate = async () => {
        if (!validateForm()) return;
        if (!authToken) { navigate("/"); return; }

        // جلوگیری از رکورد تکراری (همان روز)
        const planId = Number(formData.projectPlanningId);
        const day = toDateOnly(formData.startDate!);
        const dup = implementationDateList.some(r => {
            const rid = getPlanningIdFromRow(r);
            return rid === planId && sameDay(new Date(r.startDate), day);
        });
        if (dup) {
            showAlert('Bu planlama için bu tarihte kayıt zaten var.', 'warning');
            return;
        }

        setLoadingButton(true);
        const finalForceMajorId = isForceMajorRequired ? (Number(formData.forceMajorId) || 0) : null;

        const payload: NewImplementationDateData = {
            projectPlanningId: planId,
            forceMajorId: finalForceMajorId,
            startDate: day.toISOString(),
            endDate: day.toISOString(), // == startDate
        };

        try {
            const response = await axios.post(
                server.baseurl + server.warehouse + "create-project-planning-implementation-date",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni uygulama tarihi kaydı başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchImplementationDates();
            } else {
                showAlert(response.data.message || 'Uygulama tarihi kaydı eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Uygulama tarihi kaydı eklenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    const editImplementationDate = async () => {
        if (!editingId || !validateForm()) return;
        setLoadingButton(true);
        if (!authToken) { navigate("/"); return; }

        const day = toDateOnly(formData.startDate!);
        const finalForceMajorId = isForceMajorRequired ? Number(formData.forceMajorId) : null;

        const payload: EditImplementationDateData = {
            id: Number(editingId),
            projectPlanningId: Number(formData.projectPlanningId),
            forceMajorId: finalForceMajorId,
            startDate: day.toISOString(),
            endDate: day.toISOString(), // == startDate
        };

        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-project-planning-implementation-dates",
                payload, { headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Uygulama tarihi kaydı başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchImplementationDates();
            } else {
                showAlert(response.data.message || 'Uygulama tarihi kaydı güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Uygulama tarihi kaydı güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    /* انتخاب پلنینگ: فچ و ست مقدارهای اولیه */
    const handleSelectPlanning = async (newValue: ProjectPlanningType | null) => {
        const idNum = newValue ? Number(newValue.id) : null;

        setFormData(prev => ({ ...prev, projectPlanningId: idNum, startDate: null, endDate: null }));
        setSelectedPlanningInfo(null);
        if (!idNum) return;
        if (!authToken) { navigate('/'); return; }

        try {
            const res = await axios.get<ApiResponse<PlanningById>>(
                server.baseurl + server.warehouse + "get-project-planning-by-id/" + idNum,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            if (res.data?.httpStatusCode === 200 && res.data.data) {
                setSelectedPlanningInfo(res.data.data);

                // محاسبه minSelectableDate اولیه با داده‌های فعلی
                const records = implementationDateList.filter(r => getPlanningIdFromRow(r) === idNum);
                const baseStart = toDateOnly(new Date(res.data.data.startDate));
                const lastRecorded = records.length
                    ? records.map(r => toDateOnly(new Date(r.startDate))).filter(isValidDate).sort((a, b) => a.getTime() - b.getTime()).at(-1)!
                    : null;

                const initialMin = lastRecorded ? dateMax([baseStart, lastRecorded]) : baseStart;

                // مقداردهی فرم با حداقل تاریخ مجاز (قابل تغییر توسط کاربر به تاریخ‌های بعد از آن)
                setFormData(prev => ({
                    ...prev,
                    startDate: initialMin,
                    endDate: initialMin, // == start
                }));
            } else {
                showAlert(res.data?.message || 'Proje planı bilgisi alınamadı.', 'error');
            }
        } catch {
            showAlert('Proje planı bilgisi alınırken bir hata oluştu.', 'error');
        }
    };

    /* Menu handlers */
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        handleCloseMenu();

        const row = selectedRowForMenu;
        setEditingId(row.id);

        const initialForceMajorRequired = row.forceMajorId !== null && row.forceMajorId !== 0;
        setIsForceMajorRequired(initialForceMajorRequired);

        const planId = getPlanningIdFromRow(row);

        setFormData({
            projectPlanningId: planId ?? null,
            forceMajorId: row.forceMajorId,
            startDate: row.startDate ? new Date(row.startDate) : null,
            endDate: row.endDate ? new Date(row.endDate) : null,
        });

        setIsFormVisible(true);
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) { setIdToDelete(selectedRowForMenu.id); setOpenDeleteModal(true); }
        handleCloseMenu();
    };

    /* Download */
    const handleDownload = async (format: 'pdf' | 'excel', dataToUse: ImplementationDateType[], isFiltered: boolean = false) => {
        if (dataToUse.length === 0) { showAlert('İndirilecek kayıt bulunamadı.', 'warning'); return; }

        const title = 'Proje Planlama Uygulama Tarihleri Raporu';
        let subtitle: string | undefined;
        if (dataToUse.length === 1 && !isFiltered) subtitle = '';
        else if (isFiltered) subtitle = `Filtreler: Aranılan: "${searchTerm}", Durum: ${statusFilter}, Tarih: ${formatDateDisplay(startDateFilter)} - ${formatDateDisplay(endDateFilter)}`;
        else subtitle = 'Tüm Kayıtlar';

        showAlert('Rapor oluşturuluyor...', 'info');
        try {
            if (format === 'pdf') exportImplementationDatesToPdf(dataToUse, title, subtitle);
            else await exportImplementationDatesToExcel(dataToUse, title);
        } catch (e: any) {
            showAlert(e.message || 'Rapor oluşturulurken bir hata oluştu.', 'error'); return;
        }

        setOpenDownloadAllModal(false);
        setOpenDownloadFilteredModal(false);
        setOpenDownloadSingleModal(false);
        setSelectedRowForDownload(null);
    };

    /* Form fields */
    const renderMainFormFields = () => {
        const projectRequiredError = isFormVisible && !formData.projectPlanningId;

        return (
            <Grid container spacing={2}>
                {/* Project Planning */}
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel required>Proje Planı</CustomFormLabel>
                    <Autocomplete
                        options={projectPlannings}
                        getOptionLabel={(option) => `${option.project.title} (${formatDateDisplay(option.startDate)} - ${formatDateDisplay(option.endDate)})`}
                        value={projectPlannings.find(p => Number(p.id) === formData.projectPlanningId) || null}
                        onChange={(_, newValue) => handleSelectPlanning(newValue)}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                size="small"
                                placeholder="Proje Planı Seçin"
                                error={projectRequiredError}
                                helperText={projectRequiredError ? 'Bu alan zorunludur' : ''}
                            />
                        )}
                        disabled={!!editingId}
                    />
                </Grid>

                {/* Force Major */}
                <Grid item xs={12} sm={6} container direction="row" alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={isForceMajorRequired ? 4 : 12}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isForceMajorRequired}
                                    onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setIsForceMajorRequired(isChecked);
                                        if (!isChecked) setFormData(prev => ({ ...prev, forceMajorId: null }));
                                    }}
                                    color="primary"
                                />
                            }
                            label="Mücbir Sebep Ekle?"
                        />
                    </Grid>
                    {isForceMajorRequired && (
                        <Grid item xs={12} sm={8}>
                            <CustomFormLabel required>Mücbir Sebep Seçin</CustomFormLabel>
                            <Autocomplete
                                options={forceMajors}
                                getOptionLabel={(option) => option.title}
                                value={forceMajors.find(f => Number(f.id) === formData.forceMajorId) || null}
                                onChange={(_, newValue) =>
                                    setFormData(prev => ({ ...prev, forceMajorId: newValue ? Number(newValue.id) : null }))
                                }
                                isOptionEqualToValue={(option, value) => option.id === value?.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        fullWidth
                                        size="small"
                                        placeholder="Mücbir Sebep"
                                        error={isForceMajorRequired && isFormVisible && !formData.forceMajorId}
                                        helperText={isForceMajorRequired && isFormVisible && !formData.forceMajorId ? 'Bu alan zorunludur' : ''}
                                    />
                                )}
                            />
                        </Grid>
                    )}
                </Grid>

                {/* Single Date Picker: تاریخ ثبت (startDate) */}
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel required>Tarih</CustomFormLabel>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                        <DatePicker
                            label="Tarih Seçin"
                            value={formData.startDate}
                            onChange={(newValue) => {
                                const day = newValue ? toDateOnly(newValue) : null;
                                // اگر day قبل از minSelectableDate بود، اسنپ به minSelectableDate
                                const finalDay =
                                    day && minSelectableDate && day.getTime() < toDateOnly(minSelectableDate).getTime()
                                        ? toDateOnly(minSelectableDate)
                                        : day;

                                setFormData(prev => ({
                                    ...prev,
                                    startDate: finalDay,
                                    endDate: finalDay, // end == start
                                }));
                            }}
                            inputFormat="dd/MM/yyyy"
                            minDate={minSelectableDate ?? undefined}
                            disabled={!!editingId}
                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                        />
                    </LocalizationProvider>
                    {/* نکته: endDate نمایش داده نمی‌شود؛ برابر startDate است */}
                </Grid>

                {/* نمایش read-only برای اطمینان کاربر (اختیاری) */}
                <Grid item xs={12} sm={6}>
                    <CustomFormLabel>Bitiş Tarihi (Otomatik)</CustomFormLabel>
                    <TextField
                        value={formData.endDate ? formatDateDisplay(formData.endDate) : ''}
                        size="small"
                        fullWidth
                        InputProps={{ readOnly: true }}
                        placeholder="Başlangıç tarihi ile aynı"
                    />
                </Grid>
            </Grid>
        );
    };

    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                    <Typography variant="h5">Proje Planlama Uygulama Tarihleri Kayıtları</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni uygulama tarihi kaydı oluşturmak için tıklayınız" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} startIcon={<IconPlus />}>
                                    Yeni Kayıt Ekle
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button variant="contained" color="error" onClick={resetFormAndState} startIcon={<IconX size={20} />}>Gizle</Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>

                {/* Form */}
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" mb={2}>{editingId ? 'Uygulama Tarihini Düzenle' : 'Yeni Uygulama Tarihi Kaydı Oluştur'}</Typography>
                        {renderMainFormFields()}
                        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={3}>
                            {editingId ? (
                                <>
                                    <Button
                                        variant="contained"
                                        color="info"
                                        onClick={editImplementationDate}
                                        disabled={loadingButton || !isFormValid}
                                    >
                                        {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={resetFormAndState} disabled={loadingButton}>
                                        İptal Et
                                    </Button>
                                </>
                            ) : (
                                hasCreatePermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm zorunlu alanları doldurarak kaydı yapın." : ""}>
                                        <span>
                                            <BlinkingButton
                                                variant="contained" color="success"
                                                onClick={insertImplementationDate}
                                                disabled={!isFormValid || loadingButton}
                                                isBlinking={isFormValid && !loadingButton}
                                            >
                                                {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Yeni Kayıt Ekle'}
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
                    <Box sx={{ p: 2 }}>
                        <Grid item xs={12} mb={2} mr={2}>
                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                {isFilterActive && hasDownloadPermission && (
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle projeleri indirin" : ""}>
                                        <BlinkingButton
                                            variant="contained" color="secondary"
                                            onClick={() => setOpenDownloadFilteredModal(true)}
                                            startIcon={<IconFileDownload />}
                                            isBlinking
                                            disabled={loadingData || displayedImplementationDates.length === 0}
                                        >
                                            Filtrelenmişi İndir
                                        </BlinkingButton>
                                    </CustomTooltip>
                                )}
                                {hasDownloadPermission && (
                                    <Grid item xs={12} sm={6} md={4} sx={{ textAlign: 'right' }}>
                                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                                            <Button variant="contained" color="primary" onClick={() => setOpenDownloadAllModal(true)} startIcon={<IconFileDownload />}>
                                                Tümünü İndir
                                            </Button>
                                        </CustomTooltip>
                                    </Grid>
                                )}
                            </Stack>
                        </Grid>

                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    label="Proje/Sebep Ara"
                                    variant="outlined"
                                    fullWidth
                                    size="small"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                />
                            </Grid>
                            {/* فیلتر تاریخ‌ها به همان روال گذشته باقی می‌ماند */}
                            <Grid item xs={12} sm={6} md={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <DatePicker
                                            label="Başlangıç Tarihi"
                                            value={startDateFilter}
                                            inputFormat="dd/MM/yyyy"
                                            onChange={(newValue) => setStartDateFilter(newValue)}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        />
                                        <DatePicker
                                            label="Bitiş Tarihi"
                                            value={endDateFilter}
                                            inputFormat="dd/MM/yyyy"
                                            onChange={(newValue) => setEndDateFilter(newValue)}
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                        />
                                        <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
                                    </Stack>
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <ToggleButtonGroup value={statusFilter} exclusive onChange={(_, v) => v && setStatusFilter(v)} fullWidth size="small">
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
                            <Typography variant="h6" sx={{ ml: 2 }}>Kayıtlar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table aria-label="implementation date table">
                                <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                    <TableRow>
                                        <StyledTableCell><Typography variant="h6">Proje Adı (Kod)</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Mücbir Sebep</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Tarih</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                        <StyledTableCell></StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {displayedImplementationDates.length > 0 ? (
                                        displayedImplementationDates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(row => (
                                            <TableRow key={row.id}>
                                                <StyledTableCell>
                                                    <Typography variant="body1">
                                                        {row.projectPlanning?.project?.title || '-'} ({row.projectPlanning?.project?.code || getPlanningIdFromRow(row) || '-'})
                                                    </Typography>
                                                </StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{row.forceMajor?.title || '-'}</Typography></StyledTableCell>
                                                <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.startDate)}</Typography></StyledTableCell>
                                                <StyledTableCell><Chip label={row.status} color={row.recordStatus === 0 ? 'success' : 'error'} size="small" /></StyledTableCell>
                                                <StyledTableCell>
                                                    <IconButton onClick={(e) => { setSelectedRowForMenu(row); setAnchorEl(e.currentTarget); }}>
                                                        <IconDots width={18} />
                                                    </IconButton>
                                                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                        <MuiMenuItem onClick={() => { handleCloseMenu(); navigate(`/project/set-project-planing-implementation/${row.id}`); }}>
                                                            <ListItemIcon><IconSettings width={18} /></ListItemIcon>Detay Sayfasına Git
                                                        </MuiMenuItem>
                                                        {hasEditPermission && <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>}
                                                        {hasDeletePermission && <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>}
                                                        {hasDownloadPermission && (
                                                            <MuiMenuItem
                                                                onClick={() => {
                                                                    const rowSel = selectedRowForMenu; // قبل از بستن منو نگه‌دار
                                                                    handleCloseMenu();
                                                                    if (rowSel) {
                                                                        setSelectedRowForDownload(rowSel);
                                                                        setOpenDownloadSingleModal(true);
                                                                    }
                                                                }}
                                                            >
                                                                <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir
                                                            </MuiMenuItem>
                                                        )}
                                                    </Menu>
                                                </StyledTableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <StyledTableCell colSpan={5} align="center">
                                                <Typography variant="subtitle1" color="textSecondary">Hiç uygulama tarihi kaydı bulunamadı.</Typography>
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
                        count={displayedImplementationDates.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        labelRowsPerPage="Satır başına:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                    />
                </BlankCard>
            </Box>

            {/* Delete Modal */}
            <DeleteProjectPlanningImplementation
                openModal={openDeleteModal}
                onClose={() => { setOpenDeleteModal(false); setIdToDelete(null); fetchImplementationDates(); }}
                implementationDateIdToDelete={idToDelete}
                onDeleteSuccess={() => fetchImplementationDates()}
                showAlert={showAlert}
            />

            {/* Download Modals */}
            <Dialog open={openDownloadSingleModal} onClose={() => setOpenDownloadSingleModal(false)} maxWidth="xs">
                <DialogTitle>Seçili Kaydı İndir</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        <b>{selectedRowForDownload?.projectPlanning?.project?.title || 'Seçili kayıt'}</b> için formatı seçin.
                    </Typography>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownload('pdf', selectedRowForDownload ? [selectedRowForDownload] : [])}
                            disabled={!selectedRowForDownload || loadingButton}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownload('excel', selectedRowForDownload ? [selectedRowForDownload] : [])}
                            disabled={!selectedRowForDownload || loadingButton}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadSingleModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>Tüm uygulama tarihi kayıtları indirilecektir.</Typography>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownload('pdf', implementationDateList)}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownload('excel', implementationDateList)}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>Uygulanan filtreler ile indirilecektir. ({displayedImplementationDates.length} kayıt)</Typography>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownload('pdf', displayedImplementationDates, true)}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownload('excel', displayedImplementationDates, true)}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
        </>
    );
};

export default ListProjectPlanningImplementation;

