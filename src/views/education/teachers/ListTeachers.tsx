import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, TableSortLabel, MenuItem as MuiMenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
} from '@mui/material';

import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX,
    IconFileSpreadsheet, IconFileText
} from '@tabler/icons-react';

import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { styled, keyframes } from '@mui/material/styles';

import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';

import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import BlankCard from "src/components/shared/BlankCard";

import DeleteTeachers from './DeleteTeachers';


type RecordStatus = 0 | 1;

interface TeacherPayload {
    name: string;
    surname: string;
    field: string;
    id?: number;
}

interface TeacherRecord {
    id: number;
    name: string;
    surname: string;
    field: string;
    recordStatus: RecordStatus;
    createAt: string;
}

type SortableKeys = 'id' | 'name' | 'surname' | 'field' | 'createAt';


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
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));
const blinkAnimation = keyframes` 0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); } 50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); } 100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); } `;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString.length === 10 ? dateString : String(dateString));
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
};

const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy]; const valB = b[orderBy];
    if (valB === undefined || valB === null) return (valA === undefined || valA === null) ? 0 : -1;
    if (valA === undefined || valA === null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    if (String(valB) < String(valA)) return -1;
    if (String(valB) > String(valA)) return 1;
    return 0;
};
const getComparator = (order: 'asc' | 'desc', orderBy: SortableKeys) => {
    return order === 'desc'
        ? (a: any, b: any) => descendingComparator(a, b, orderBy as any)
        : (a: any, b: any) => -descendingComparator(a, b, orderBy as any);
};
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => { const order = comparator(a[0], b[0]); if (order !== 0) return order; return a[1] - b[1]; });
    return stabilizedThis.map((el) => el[0]);
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
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 35);
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

    let footerY = pageHeight - 20;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 4;
    });

    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
    doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

    const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};


const exportToPdf = (data: TeacherRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => {
    if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
    setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

    const doc = new jsPDF();
    const docAny = doc as any;

    const columns = ['Adı', 'Soyadı', 'Alan', 'Durum', 'Kayıt Tarihi'];
    const body = data.map(r => [
        r.name || '-',
        r.surname || '-',
        r.field || '-',
        r.recordStatus === 0 ? 'Aktif' : 'Pasif',
        formatDateDisplay(r.createAt || null),
    ]);

    try {
        addPdfHeader(doc, title);

        autoTable(docAny, {
            head: [columns], body: body, startY: 48, theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0], fontSize: 10 },
            didDrawPage: (_data: any) => { addPdfFooter(doc); },
            margin: { top: 30, bottom: 35, left: 10, right: 10 }
        });

        const fileName = `${title.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    } catch (error) {
        console.error("PDF dışa aktarılırken hata:", error);
        showAlert('PDF dışا aktarılırken bir hata oluştu.', 'error');
    } finally {
        setLoadingData(false);
    }
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

const exportToExcel = (data: TeacherRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => {
    if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
    setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

    try {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title.substring(0, 31));

        const columns = ['ID', 'Adı', 'Soyadı', 'Alan', 'Durum', 'Kayıt Tarihi'];
        addExcelHeader(worksheet, title, columns.length);

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        data.forEach(r => {
            worksheet.addRow([
                r.id,
                r.name || '-',
                r.surname || '-',
                r.field || '-',
                r.recordStatus === 0 ? 'Aktif' : 'Pasif',
                formatDateDisplay(r.createAt || null),
            ]);
        });

        worksheet.columns.forEach((column) => {
            let maxLength = 0;
            // @ts-ignore
            column.eachCell({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) { maxLength = columnLength; }
            });
            column.width = Math.min(Math.max(maxLength + 2, 12), 50);
        });

        addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, columns.length);

        const fileName = `${title.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        });
    } catch (error) {
        console.error("Excel dışا aktarılırken hata:", error);
        showAlert('Excel dışا aktarılırken bir hata oluştu.', 'error');
    } finally {
        setLoadingData(false);
    }
};

const handleDownloadPdf = (data: TeacherRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => exportToPdf(data, title, showAlert, setLoadingData);
const handleDownloadExcel = (data: TeacherRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => exportToExcel(data, title, showAlert, setLoadingData);


const ListTeachers: React.FC = () => {
    const navigate = useNavigate();
    const nameInputRef = useRef<HTMLInputElement>(null);

    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            if (item.href === path) return item;

            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    const currentMenu = useMemo(() => {

        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    const currentMenuOpIds = useMemo(() => {
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            return String(op.id);
        });
    }, [currentMenu]);

     const hasPermission = (opName: string) => {   
    return allowedOperations.some((op: any) =>
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazdırmak"), [allowedOperations, currentMenuOpIds]);


    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState<string>('');
    const [surname, setSurname] = useState<string>('');
    const [field, setField] = useState<string>('');

    const [nameError, setNameError] = useState(false);
    const [surnameError, setSurnameError] = useState(false);
    const [fieldError, setFieldError] = useState(false);

    const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isBlinking, setIsBlinking] = useState<boolean>(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<SortableKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<TeacherRecord | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<TeacherRecord | null>(null);


    const { isTooltipGloballyEnabled } = useTooltip();


    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);
    useEffect(() => { let timer: number; if (alertMessage) timer = setTimeout(() => clearAlert(), 5000); return () => { if (timer) clearTimeout(timer); }; }, [alertMessage]);



    const fetchTeachers = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            const url = `${server.baseurl}${server.education}get-all-teachers/`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                setTeachers(res.data.data as TeacherRecord[]);
            } else { showAlert(res.data.message || 'Öğretmen kayıtları yüklenemedi.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
        finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    useEffect(() => { fetchTeachers(); }, [fetchTeachers]);


    const validateForm = (): boolean => {
        let ok = true;
        setNameError(false); setSurnameError(false); setFieldError(false);

        if (!name.trim()) { setNameError(true); ok = false; }
        if (!surname.trim()) { setSurnameError(true); ok = false; }
        if (!field.trim()) { setFieldError(true); ok = false; }

        if (!ok) { showAlert('Lütfen tüm zorunlu alanları doldurun.', 'warning'); }
        return ok;
    };

    const resetForm = useCallback(() => {
        setEditingId(null);
        setName('');
        setSurname('');
        setField('');
        setNameError(false); setSurnameError(false); setFieldError(false);
        setIsFormVisible(false);
    }, []);

    const handleEditClick = (row: TeacherRecord) => {
        setEditingId(row.id);
        setName(row.name);
        setSurname(row.surname);
        setField(row.field);
        setIsFormVisible(true);
        handleCloseMenu();

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setLoadingButton(false); return; }

        const isEditing = editingId !== null;

        const payload: TeacherPayload = {
            name: name.trim(),
            surname: surname.trim(),
            field: field.trim(),
            ...(isEditing && { id: Number(editingId) }),
        };

        const url = isEditing
            ? `${server.baseurl}${server.education}update-teacher`
            : `${server.baseurl}${server.education}create-teacher`;
        const method = isEditing ? 'put' : 'post';

        try {
            const res = await axios.request({ method, url, data: payload, headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(`Öğretmen kaydı başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}!`, 'success');
                resetForm();
                fetchTeachers();
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };


    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }

        try {
            const response = await axios.put(
                `${server.baseurl}${server.education}update-teacher`,
                { id: Number(id), recordStatus: statusValue },
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Kurs başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetForm();
                fetchTeachers();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            handleCloseMenu();
        }
    };

    const filteredTeachers = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const list = teachers.filter(r => {
            const matchesSearch = !q || (r.name.toLowerCase().includes(q) || r.surname.toLowerCase().includes(q) || r.field.toLowerCase().includes(q));

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && r.recordStatus === 0) ||
                (statusFilter === 'inactive' && r.recordStatus === 1);

            const cDate = r.createAt ? new Date(r.createAt) : null;
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) &&
                (!endFilter || (cDate && cDate <= endFilter));

            return matchesSearch && matchesStatus && inRange;
        });

        return stableSort(list, getComparator(order, orderBy));
    }, [teachers, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredTeachers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredTeachers, page, rowsPerPage]);
    const isFilterActive = useMemo(() => !!searchTerm.trim() || startFilter !== null || endFilter !== null || statusFilter !== 'all', [searchTerm, startFilter, endFilter, statusFilter]);

    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleStatusFilterChange = useCallback((_: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } }, []);
    const handleRequestSort = useCallback((property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); }, [order, orderBy]);
    const handleClearDateFilters = () => { setStartFilter(null); setEndFilter(null); };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: TeacherRecord) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setDeleteName(`${selectedRowForMenu.name} ${selectedRowForMenu.surname} (${selectedRowForMenu.field})`);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchTeachers(); };


    const handleOpenDownloadAllModal = () => setOpenDownloadAllModal(true);
    const handleDownloadAllAction = (format: 'pdf' | 'excel') => {
        const title = `Tüm Öğretmen Kayıtları`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(teachers, title, showAlert, setLoadingData);
        setOpenDownloadAllModal(false);
    };
    const handleDownloadFilteredAction = (format: 'pdf' | 'excel') => {
        const title = `Filtrelenmiş Öğretmen Kayıtları`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(filteredTeachers, title, showAlert, setLoadingData);
        setOpenDownloadFilteredModal(false);
    };
    const handleOpenRowDownloadModal = (row: TeacherRecord) => {
        setSelectedRowForDownload(row);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleDownloadRow = (format: 'pdf' | 'excel') => {
        if (!selectedRowForDownload) return;
        const title = `Öğretmen Detay: ${selectedRowForDownload.name} ${selectedRowForDownload.surname}`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler([selectedRowForDownload], title, showAlert, setLoadingData);
        setOpenRowDownloadModal(false);
        setSelectedRowForDownload(null);
    };


    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={3} spacing={2} flexWrap="wrap">
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                            {editingId ? 'Öğretmen Kaydını Düzenle' : 'Öğretmen Yönetimi'}
                        </Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} fullWidth={false} startIcon={<IconEdit size={20} />}>
                                Yeni Öğretmen Ekle
                            </BlinkingButton>
                        )}
                        {isFormVisible && (
                            <Button variant="contained" color="error" onClick={resetForm} disabled={loadingButton} fullWidth={false} startIcon={<IconX size={20} />}>
                                Gizle
                            </Button>
                        )}
                    </Stack>
                </Stack>

                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{editingId ? 'Öğretmen Düzenleme Formu' : 'Yeni Öğretmen Kayıt Formu'}</Typography>
                        <Grid container spacing={2}>

                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Adı</CustomFormLabel>
                                <TextField placeholder="Adı" size="small" fullWidth value={name}

                                    inputRef={nameInputRef}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setNameError(false); }}
                                    error={nameError} helperText={nameError ? 'Zorunlu alan.' : ''} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Soyadı</CustomFormLabel>
                                <TextField placeholder="Soyadı" size="small" fullWidth value={surname}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSurname(e.target.value); setSurnameError(false); }}
                                    error={surnameError} helperText={surnameError ? 'Zorunlu alan.' : ''} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Alan</CustomFormLabel>
                                <TextField placeholder="Öğretilen Alan" size="small" fullWidth value={field}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setField(e.target.value); setFieldError(false); }}
                                    error={fieldError} helperText={fieldError ? 'Zorunlu alan.' : ''} />
                            </Grid>

                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button variant="contained" color={editingId ? "info" : "success"} onClick={handleSubmit} disabled={loadingButton} size="small">
                                        {loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : editingId ? 'Güncelle' : 'Kaydet'}
                                    </Button>
                                    {editingId ? (
                                        <Button variant="outlined" color="secondary" onClick={resetForm} size="small">İptal Et</Button>

                                    ) : (
                                        <></>
                                    )
                                    }
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>
                )}
            </div>

            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            <BlankCard>

                <Box sx={{ p: 2 }}>
                    <Grid item xs={12} md={12} mb={2}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            {isFilterActive && hasDownloadPermission && (
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)}
                                    disabled={loadingData || !filteredTeachers.length}
                                    startIcon={<IconFileDownload />}
                                    size="small"
                                >
                                    Filtrelenmişi İndir
                                </Button>
                            )}
                            {hasDownloadPermission && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleOpenDownloadAllModal}
                                    disabled={loadingData || !teachers.length}
                                    startIcon={<IconFileDownload />}
                                    size="small"
                                >
                                    Tümünü İndir
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Ara (Ad / Soyad / Alan)"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                size="small"
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    label="Kayıt Başlangıç"
                                    value={startFilter}
                                    onChange={(v) => { setStartFilter(v); setPage(0); }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Kayıt Bitiş"
                                        value={endFilter}
                                        inputFormat="dd/MM/yyyy"
                                        minDate={startFilter || undefined}
                                        onChange={(v) => { setEndFilter(v); setPage(0); }}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters" size="small">
                                        <IconX size={20} />
                                    </IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={handleStatusFilterChange}
                                aria-label="Durum filtresi"
                                sx={{ flexGrow: 1 }}
                            >
                                <StyledToggleButton value="all" data-value="all" size="small">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" data-value="active" size="small">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" data-value="inactive" size="small">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>

                <TableContainer>
                    {loadingData ? (<Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Kayıtlar yükleniyor...</Typography>
                    </Box>) : (
                        <Table aria-label="teachers table">
                            <TableHead sx={{ background: "#f0f0f0" }}>
                                <TableRow>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')}><Typography variant="h6">Adı Soyadı</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'field'} direction={orderBy === 'field' ? order : 'asc'} onClick={() => handleRequestSort('field')}><Typography variant="h6">Alan</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')}><Typography variant="h6">Kayıt Tarihi</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6"></Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>{`${row.name} ${row.surname}` || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.field || '-'}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.createAt || null)}</StyledTableCell>
                                            <StyledTableCell>
                                                <Chip label={row.recordStatus === 0 ? 'Aktif' : 'Pasif'} color={row.recordStatus === 0 ? 'success' : 'error'} size="small" />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    {hasEditPermission && (<MuiMenuItem onClick={() => handleEditClick(row)}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>)}
                                                    {hasEditPermission && (
                                                        selectedRowForMenu?.recordStatus === 0 ? (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kursu pasif yap" : ""}>
                                                                <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 1)}><ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Pasif Yap</MuiMenuItem>
                                                            </CustomTooltip>
                                                        ) : (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kursu aktif yap" : ""}>
                                                                <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 0)}><ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon> Aktif Yap</MuiMenuItem>
                                                            </CustomTooltip>
                                                        )
                                                    )}
                                                    {hasDeletePermission && (<MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>)}
                                                    {hasDownloadPermission && (<MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir</MuiMenuItem>)}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (<TableRow><StyledTableCell colSpan={5} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kayıt bulunamadı.</Typography></StyledTableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredTeachers.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAllAction('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAllAction('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadFilteredAction('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadFilteredAction('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>


            <DeleteTeachers openModal={openDeleteModal} onClose={handleCloseDeleteModal} idToDelete={deleteId} nameToDelete={deleteName} onDeleteSuccess={fetchTeachers} showAlert={showAlert} />

        </>
    );
};

export default ListTeachers;