import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogActions, Table,
    TableHead, TableBody, TableRow, TableCell, CircularProgress, Box, Stack, Grid,
    IconButton, Menu, MenuItem, Typography, Autocomplete, TextField,
    TablePagination, Chip, ListItemIcon, TableContainer,
    TableSortLabel, Alert, Tabs, Tab
} from '@mui/material';
import axios from 'axios';
import { IconDots, IconEdit, IconTrash, IconX, IconFileText, IconFileSpreadsheet, IconFileDownload } from '@tabler/icons-react';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';

import { tr } from 'date-fns/locale';
import { format } from "date-fns";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

import server from '../../../assets/address.json';
import DeleteCourseParticipants from './DeleteCourseParticipants';
import { useNavigate } from 'react-router';


interface CourseDateTimeOption {
    id: string;
    startDateTime: string;
    endDateTime: string;
    label: string;
}
interface PersonnelApi {
    id: string;
    name: string;
    family: string;
    identityNumber: string;
    workEndDate: string | null;
}

interface CourseParticipant {
    id: string;
    courseDateTimeId: string;
    personnelId: string;
    courseId: number;
    isParticipated: boolean;
    personnel: { id: string, name: string, identityNumber: string, family: string };
    courseDateTime: { id: string, startDateTime: string, endDateTime: string };
}
type SortableKeys = 'id' | 'courseDateTimeId' | 'personnelId';


const formatDateTimeDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy HH:mm', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
};



const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
};


const formatDateDisplaySimple = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
};

const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
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
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order; return a[1] - b[1];
    });
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

const addExcelHeader = (worksheet: Excel.Worksheet, title: string, columnsLength: number) => {
    worksheet.views = [{ rightToLeft: false }];
    const titleRow = worksheet.addRow([title]);
    titleRow.font = { name: 'NotoSans', size: 14, bold: true };
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnsLength);
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    const dateRow = worksheet.addRow([`Rapor Tarihi: ${formatDateDisplaySimple(new Date().toISOString())}`]);
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
const exportDetailsToPdf = (data: CourseParticipant[], title: string, showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void) => {
    if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }

    const doc = new jsPDF("p", "pt", "a4");
    const docAny = doc as any;

    try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); doc.setFont('NotoSans'); } catch (e) { }

    const columns = ['Personel Adı Soyadı', 'TC Kimlik', 'Kurs Zamanı Başlangıç', 'Kurs Zamanı Bitiş', 'Durum'];
    const body = data.map(r => [
        `${r.personnel.name} ${r.personnel.family}`,
        r.personnel.identityNumber,
        formatDateTimeDisplay(r.courseDateTime.startDateTime),
        formatDateTimeDisplay(r.courseDateTime.endDateTime),
        r.isParticipated ? 'Katıldı' : 'Katılmadı',
    ]);

    try {
        addPdfHeader(doc, title);
        autoTable(docAny, {
            head: [columns],
            body: body,
            startY: 70,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0], fontSize: 9 },
            didDrawPage: (_data: any) => { addPdfHeader(doc, title); addPdfFooter(doc); },
            margin: { top: 60, bottom: 35, left: 10, right: 10 }
        });

        const fileName = `${title.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    } catch (error) {
        showAlert('PDF dışا aktarılırken bir hata oluştu.', 'error');
    }
};

const exportDetailsToExcel = async (data: CourseParticipant[], title: string, showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void) => {
    if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }

    try {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title.substring(0, 31));

        const columns = ['Personel Adı Soyadı', 'TC Kimlik', 'Kurs Başlangıç (Tarih/Saat)', 'Kurs Bitiş (Tarih/Saat)', 'Durum'];
        addExcelHeader(worksheet, title, columns.length);

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        data.forEach(r => {
            worksheet.addRow([
                `${r.personnel.name} ${r.personnel.family}`,
                r.personnel.identityNumber,
                formatDateTimeDisplay(r.courseDateTime.startDateTime),
                formatDateTimeDisplay(r.courseDateTime.endDateTime),
                r.isParticipated ? 'Katıldı' : 'Katılmadı',
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
        showAlert('Excel dışا aktarılırken bir hata oluştu.', 'error');
    }
};

const ListCourseParticipants: React.FC<{ open: boolean, courseId: number | null, courseTitle: string, onClose: () => void, showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void; }> = (props) => {

    const navigate = useNavigate();
    const { open, courseId, courseTitle, onClose, showAlert } = props;
    const [participants, setParticipants] = useState<CourseParticipant[]>([]);
    const [dateTimesOptions, setDateTimesOptions] = useState<CourseDateTimeOption[]>([]);
    const [personnelList, setPersonnelList] = useState<PersonnelApi[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingButton, setLoadingButton] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [tabValue, setTabValue] = useState<'single' | 'multi'>('single');
    const [selectedPersonnelMulti, setSelectedPersonnelMulti] = useState<PersonnelApi[]>([]);
    const [personnelMultiError, setPersonnelMultiError] = useState(false);

    const [selectedDateTime, setSelectedDateTime] = useState<CourseDateTimeOption | null>(null);
    const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelApi | null>(null);
    const [dateTimeError, setDateTimeError] = useState(false);
    const [personnelError, setPersonnelError] = useState(false);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [orderBy, setOrderBy] = useState<SortableKeys>('id');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CourseParticipant | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');

    const [openDownloadModal, setOpenDownloadModal] = useState(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const authToken = localStorage.getItem('authToken');

    const internalShowAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: number;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);

    const fetchDateTimesOptions = useCallback(async () => {
        if (!courseId || !authToken) return;
        try {
            const url = `${server.baseurl}${server.education}get-course-datetimes-by-course-id/${courseId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                if (res.data.data.length === 0) {
                    showAlert('Bu kurs için henüz tarih tanımlanmamış. Lütfen önce tarihleri ekleyin.', 'warning');
                    onClose();
                    return;
                }
                const options = res.data.data.map((r: any) => ({
                    id: String(r.id),
                    startDateTime: r.startDateTime,
                    endDateTime: r.endDateTime,
                    label: `${formatDateTimeDisplay(r.startDateTime)} - ${formatDateTimeDisplay(r.endDateTime)}`
                }));
                setDateTimesOptions(options);
                if (options.length > 0) {
                    setSelectedDateTime(options[0]);
                }
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [courseId, authToken, showAlert, onClose]);

    const fetchPersonnel = useCallback(async () => {
        if (!authToken) return;
        try {
            const url = `${server.baseurl}${server.hr}get-all-personnels`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const activePersonnel: PersonnelApi[] = (res.data.data as any[])
                    .filter((p: any) => p.recordStatus === 0 && p.workEndDate === null)
                    .map(p => ({ ...p, id: String(p.id) }));
                setPersonnelList(activePersonnel);
            }
        } catch (e) {
            showAlert('Personel listesi alınamadı.', 'error');
        }
    }, [authToken, showAlert]);

    const fetchParticipants = useCallback(async () => {
        if (!courseId || !authToken) {
            setParticipants([]);
            return;
        }
        setLoading(true);

        try {
            const url = `${server.baseurl}${server.education}get-course-participants-by-course-id/${courseId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const mappedData: CourseParticipant[] = res.data.data.map((r: any) => ({
                    ...r,
                    id: String(r.id),
                    courseDateTimeId: String(r.courseDateTime?.id || r.courseDateTimeId),
                    personnelId: String(r.personnel?.id || r.personnelId),
                    courseId: Number(r.courseId),
                    personnel: { ...r.personnel, id: String(r.personnel?.id) },
                    courseDateTime: { ...r.courseDateTime, id: String(r.courseDateTime?.id) }
                }));
                setParticipants(mappedData);
            } else {
                showAlert(res.data.message || 'Katılımcılar yüklenemedi.', 'error');
            }
        } catch (e) {
            showAlert('Katılımcıları yüklerken bir hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    }, [courseId, showAlert, authToken]);

    useEffect(() => {
        if (open) {
            fetchDateTimesOptions();
            fetchPersonnel();
            fetchParticipants();
            resetForm();
            setTabValue('single');
        }
    }, [open, fetchDateTimesOptions, fetchPersonnel, fetchParticipants]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: 'single' | 'multi') => {
        if (editingId) return;
        setTabValue(newValue);
        resetForm();
        setSelectedPersonnelMulti([]);
        setPersonnelMultiError(false);
    };

    const validateFormSingle = (): boolean => {
        let ok = true;
        setDateTimeError(false); setPersonnelError(false);

        if (!selectedDateTime) { setDateTimeError(true); ok = false; }
        if (!selectedPersonnel) { setPersonnelError(true); ok = false; }

        const isDuplicate = participants.some(p =>
            p.personnelId === selectedPersonnel?.id &&
            p.courseDateTimeId === selectedDateTime?.id &&
            p.id !== editingId
        );

        if (isDuplicate) {
            showAlert('Bu personel zaten seçili tarih aralığı için kayıtlı.', 'warning');
            setPersonnelError(true);
            ok = false;
        }

        if (!ok) { internalShowAlert('Lütfen tüm zorunlu alanları doldurun.', 'warning'); }
        return ok;
    };

    const validateFormMulti = (): boolean => {
        let ok = true;
        setDateTimeError(false); setPersonnelMultiError(false);

        if (!selectedDateTime) { setDateTimeError(true); ok = false; }
        if (selectedPersonnelMulti.length === 0) { setPersonnelMultiError(true); ok = false; }

        if (!ok) {
            internalShowAlert('Lütfen kurs zamanını seçin ve en az یک personel ekleyin.', 'warning');
        }
        return ok;
    };

    const resetForm = useCallback(() => {
        setEditingId(null);
        if (tabValue === 'single') {
            setSelectedDateTime(dateTimesOptions.length > 0 ? dateTimesOptions[0] : null);
        }
        setSelectedPersonnel(null);
        setSelectedPersonnelMulti([]);
        setDateTimeError(false);
        setPersonnelError(false);
        setPersonnelMultiError(false);
    }, [dateTimesOptions, tabValue]);

    const handleSubmit = async () => {
        if (tabValue === 'single' && !validateFormSingle()) return;
        if (tabValue === 'multi' && !validateFormMulti()) return;
        if (!courseId || !authToken) return;

        setLoadingButton(true);
        const isEditing = editingId !== null;

        const urlCreate = `${server.baseurl}${server.education}create-course-participants`;
        const urlUpdate = `${server.baseurl}${server.education}update-course-participant`;

        let finalDataToSend: any;
        let finalUrl: string;
        let finalMethod: 'post' | 'put';

        if (isEditing) {
            finalUrl = urlUpdate;
            finalMethod = 'put';
            finalDataToSend = {
                id: editingId,
                isParticipated: true,
                courseDateTimeId: selectedDateTime!.id,
                personnelId: selectedPersonnel!.id
            };
        } else if (tabValue === 'multi') {
            finalUrl = urlCreate;
            finalMethod = 'post';
            finalDataToSend = selectedPersonnelMulti.map(personnel => ({
                isParticipated: true,
                courseDateTimeId: selectedDateTime!.id,
                personnelId: personnel.id
            }));

            const existingPersonnelIds = participants
                .filter(p => p.courseDateTimeId === selectedDateTime!.id)
                .map(p => p.personnelId);

            finalDataToSend = finalDataToSend.filter((payload: any) =>
                !existingPersonnelIds.includes(payload.personnelId)
            );

            if (finalDataToSend.length === 0) {
                showAlert('Seçilen tüm personel için belirtilen tarih/saatte zaten kayıt yapılmıştır.', 'warning');
                setLoadingButton(false);
                return;
            }

        } else {
            finalUrl = urlCreate;
            finalMethod = 'post';
            finalDataToSend = [{
                isParticipated: true,
                courseDateTimeId: selectedDateTime!.id,
                personnelId: selectedPersonnel!.id
            }];
        }

        try {
            const res = await axios.request({ method: finalMethod, url: finalUrl, data: finalDataToSend, headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            if (res.data.httpStatusCode === 200 || res.data.httpStatusCode === 201) {
                const message = isEditing ? 'güncellendi' : 'eklendi';
                showAlert(`Katılımcı başarıyla ${message}.`, 'success');
                resetForm();
                fetchParticipants();
            } else {
                showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'İşlem sırasında bir ağ hatası oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const handleEditClick = (row: CourseParticipant) => {
        setEditingId(row.id);
        setTabValue('single');

        const dtOption = dateTimesOptions.find(opt => opt.id === row.courseDateTimeId);
        setSelectedDateTime(dtOption || null);

        const personnelToSelect = personnelList.find(p => p.id === row.personnelId);
        setSelectedPersonnel(personnelToSelect || null);

        if (!dtOption || !personnelToSelect) {
            internalShowAlert("Hata: Kayıtlı Katılımcı bilgileri eksik veya pasif. Lütfen kontrol edin.", 'warning');
        }

        handleCloseMenu();
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CourseParticipant) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleRequestSort = useCallback((property: SortableKeys) => {
        const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0);
    }, [order, orderBy]);

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setDeleteName(`${selectedRowForMenu.personnel.name} ${selectedRowForMenu.personnel.family} (${selectedRowForMenu.personnel.identityNumber})`);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = (success: boolean) => {
        setOpenDeleteModal(false);
        setDeleteId(null);
        setDeleteName('');
        if (success) {
            fetchParticipants();
            resetForm();
        }
    };

    const handleDownloadAll = (format: 'pdf' | 'excel') => {
        if (participants.length === 0) {
            showAlert('İndirilecek kayıt bulunmamaktadır.', 'warning');
            return;
        }

        const title = `Kurs Katılımcıları Raporu: ${courseTitle}`;

        if (format === 'pdf') {
            exportDetailsToPdf(participants, title, showAlert);
        } else {
            exportDetailsToExcel(participants, title, showAlert);
        }
        setOpenDownloadModal(false);
    };


    const sortedParticipants = useMemo(() => stableSort(participants, getComparator(order, orderBy) as any), [participants, order, orderBy]);
    const paginatedRows = useMemo(() => sortedParticipants.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sortedParticipants, page, rowsPerPage]);


    return (
        <Dialog open={open} onClose={loadingButton ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Kurs Katılımcıları Yönetimi: {courseTitle}</Typography>
                <IconButton onClick={onClose} disabled={loadingButton}><IconX /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 2 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>
                )}

                <Stack direction="row" spacing={1} justifyContent="flex-end" mb={3}>
                    <Button variant="contained" color="primary"
                        onClick={() => setOpenDownloadModal(true)}
                        disabled={loading || participants.length === 0}
                        startIcon={<IconFileDownload />}>
                        Tüm Kayıtları İndir ({participants.length})
                    </Button>
                </Stack>

                <Box mb={3} border={1} borderColor="divider" borderRadius={2} >
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabValue} onChange={handleTabChange}>
                            <Tab label="Tek Kayıt Ekle" value="single" disabled={editingId !== null} />
                            <Tab label="Çoklu Kayıt Ekle" value="multi" disabled={editingId !== null} />
                        </Tabs>
                    </Box>

                    <Box component={Stack} p={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel required>Kurs Zamanı</CustomFormLabel>
                                <Autocomplete
                                    size="small" options={dateTimesOptions} getOptionLabel={(option) => option.label}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={selectedDateTime}
                                    onChange={(_, newValue) => { setSelectedDateTime(newValue); setDateTimeError(false); }}
                                    renderInput={(params) => <TextField {...params} label="Tarih Aralığı Seçin" error={dateTimeError} helperText={dateTimeError ? 'Zorunlu alan.' : ''} />}

                                />
                            </Grid>

                            {tabValue === 'single' && !editingId && (
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel required>Personel</CustomFormLabel>
                                    <Autocomplete
                                        size="small" options={personnelList}
                                        getOptionLabel={(option) => `${option.name} ${option.family} (${option.identityNumber})`}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        value={selectedPersonnel}
                                        onChange={(_, newValue) => { setSelectedPersonnel(newValue); setPersonnelError(false); }}
                                        renderInput={(params) => <TextField {...params} label="Personel Seçin" error={personnelError} helperText={personnelError ? 'Zorunlu alan.' : ''} />}
                                    />
                                </Grid>
                            )}

                            {tabValue === 'multi' && !editingId && (
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel required>Personeller (Çoklu Seçim)</CustomFormLabel>
                                    <Autocomplete
                                        multiple
                                        size="small" options={personnelList}
                                        disableCloseOnSelect
                                        getOptionLabel={(option) => `${option.name} ${option.family} (${option.identityNumber})`}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        value={selectedPersonnelMulti}
                                        onChange={(_, newValue) => { setSelectedPersonnelMulti(newValue); setPersonnelMultiError(false); }}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Personel Seçin" error={personnelMultiError} helperText={personnelMultiError ? 'En az bir personel seçin.' : ''} />
                                        )}
                                    />
                                </Grid>
                            )}

                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button
                                        variant="contained"
                                        color={editingId ? "info" : "success"}
                                        onClick={handleSubmit}
                                        disabled={loadingButton || !courseId}
                                        size="small"
                                    >
                                        {loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : editingId ? 'Düzenle' : 'Katılımcı Ekle'}
                                    </Button>
                                    {editingId && <Button variant="outlined" color="secondary" onClick={resetForm} size="small">İptal Et</Button>}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>

                <TableContainer component={Box} mt={3}>
                    {loading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="150px"><CircularProgress /></Box>
                    ) : (
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ background: "#f5f5f5" }}>
                                    <TableCell><TableSortLabel active={orderBy === 'personnelId'}
                                        direction={orderBy === 'personnelId' ? order : 'asc'}
                                        onClick={() => handleRequestSort('personnelId')}>Personel</TableSortLabel>
                                    </TableCell>
                                    <TableCell><TableSortLabel active={orderBy === 'courseDateTimeId'}
                                        direction={orderBy === 'courseDateTimeId' ? order : 'asc'}
                                        onClick={() => handleRequestSort('courseDateTimeId')}>Kurs Zamanı</TableSortLabel>
                                    </TableCell>
                                    <TableCell align="center">Durum</TableCell>
                                    <TableCell align="right"></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>{`${row.personnel.name} ${row.personnel.family} (${row.personnel.identityNumber})`}</TableCell>
                                            <TableCell>
                                                {row.courseDateTime ?
                                                    `${formatDateTimeDisplay(row.courseDateTime.startDateTime)} - ${formatDateTimeDisplay(row.courseDateTime.endDateTime)}`
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell align="center"><Chip label={row.isParticipated ? 'Katıldı' : 'Katılmadı'} color="success" size="small" /></TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    <MenuItem onClick={() => handleEditClick(selectedRowForMenu!)}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MenuItem>
                                                    <MenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MenuItem>
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={4} align="center"><Typography variant="subtitle2" color="textSecondary">Henüz katılımcı kaydı bulunmamaktadır.</Typography></TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
                <TablePagination rowsPerPageOptions={[5, 10]} component="div" count={participants.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={loadingButton}>Kapat</Button>
            </DialogActions>

            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Katılımcıları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAll('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAll('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <DeleteCourseParticipants
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={deleteName}
                onDeleteSuccess={() => handleCloseDeleteModal(true)}
                showAlert={showAlert}
            />
        </Dialog>
    );
};

export default ListCourseParticipants;