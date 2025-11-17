import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, Autocomplete, Dialog, DialogTitle, DialogContent,
    DialogActions, DialogContentText, TableSortLabel, MenuItem as MuiMenuItem,
} from '@mui/material';

import {
    IconDots, IconTrash, IconSearch, IconFileDownload, IconX,
    IconFileSpreadsheet, IconFileText, IconBox, IconLink
} from '@tabler/icons-react';
import DirectionsCarFilledRoundedIcon from '@mui/icons-material/DirectionsCarFilledRounded';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { styled, keyframes } from '@mui/material/styles';

import axios from 'axios';
// @ts-ignore
import server from '../../../assets/address.json';
// @ts-ignore
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
// @ts-ignore
import { useAuth } from 'src/context/AuthContext';
// @ts-ignore
import DeleteConsignedCarwarehouse from './DeleteConsignedCarwarehouse';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
// @ts-ignore
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import BlankCard from "src/components/shared/BlankCard";


// --- Interfaces ---
type RecordStatus = 0 | 1;
interface AttachmentType { fileUrl: string; }
interface CarWarehouseApi { id: string; name: string; code: string; recordStatus: number; }
interface CarDetail {
    id: number;
    brand: string;
    model: string; // 👈 مطمئن شوید این فیلدها وجود دارند
    plaque: string; // 👈 مطمئن شوید این فیلدها وجود دارند
    available: boolean;
    recordStatus: RecordStatus;
}
interface PersonnelType { id: number; name: string; family: string; identityNumber: string; workEndDate: string | null; }

interface ConsignedCarPayload { date: string; attachments: { fileUrl: string }[]; description: string; kilometer: number; carWarhouseDetailId: number; personnelId: number; consigned: boolean; }
interface ConsignedCarRecord {
    id: number; date: string; description: string; kilometer: number; consigned: boolean;
    carWarhouseDetailId: number; personnelId: number;
    carWarhouseDetail: CarDetail;
    personnel: PersonnelType;
    attachments: AttachmentType[];
    createAt: string;
}
type SortableKeys = 'date' | 'kilometer' | 'consigned' | 'createAt';


// --- Styles ---
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


// --- توابع کمکی: تاریخ، مرتب‌سازی ---
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

// --- توابع فایل (Icon/Color/Upload) ---
const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <IconFileText size={18} />;
    if (ext === 'xlsx' || ext === 'xls') return <IconFileSpreadsheet size={18} />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <IconBox size={18} />;
    return <IconFileDownload size={18} />;
};
const getFileColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'error';
    if (ext === 'xlsx' || ext === 'xls') return 'success';
    return 'primary';
};
const uploadFiles = async (
    files: File[], authToken: string, showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void
): Promise<string[] | null> => {
    if (!files || files.length === 0) return [];
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    try {
        const uploadResponse = await axios.post(
            server.baseurl + server.baseinfo + "upload-files",
            formData,
            { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
        );
        if (uploadResponse.data.httpStatusCode === 201) {
            return uploadResponse.data.data.files as string[];
        } else {
            showAlert(uploadResponse.data?.message || 'Dosya yüklenirken sunucu hatası oluştu.', 'error');
            return null;
        }
    } catch (e: any) {
        showAlert(e?.response?.data?.message || 'Dosya yüklenirken ağ hatası oluştu.', 'error');
        return null;
    }
};

const ConsignmentFileUpload: React.FC<{
    files: File[]; setFiles: (f: File[]) => void; error: boolean; currentAttachments: AttachmentType[]; setCurrentAttachments: (a: AttachmentType[]) => void;
}> = ({ files, setFiles, error, currentAttachments, setCurrentAttachments }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supportedTypes = "image/*, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xlsx";
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const handleRemoveNewFile = (index: number) => setFiles(files.filter((_, i) => i !== index));
    const handleRemoveExistingAttachment = (index: number) => setCurrentAttachments(currentAttachments.filter((_, i) => i !== index));

    return (
        <Box mt={1} p={2} border={error ? '1px dashed red' : '1px dashed #ccc'} borderRadius={1}>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} accept={supportedTypes} style={{ display: 'none' }} />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Button size="small" variant="outlined" startIcon={<IconFileDownload />} onClick={() => fileInputRef.current?.click()}>Dosya Seç (Resim/PDF/Excel)</Button>
            </Stack>
            {currentAttachments.length > 0 && (<Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                <Typography variant="caption" sx={{ color: 'gray', width: '100%' }}>Mevcut Dosyalar ({currentAttachments.length}):</Typography>
                {currentAttachments.map((att, index) => { const fileName = att.fileUrl.split('/').pop() || 'dosya'; return (<Chip key={`exist-${index}`} label={`Mevcut ${index + 1}`} icon={getFileIcon(fileName)} onDelete={() => handleRemoveExistingAttachment(index)} size="small" color={getFileColor(fileName)} variant="outlined" sx={{ m: 0.5, maxWidth: 150 }} />); })}
            </Stack>)}
            {files.length > 0 && (<Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                <Typography variant="caption" sx={{ color: 'gray', width: '100%' }}>Yüklenecek Yeni Dosyalar ({files.length}):</Typography>
                {files.map((file, index) => (<Chip key={`new-${index}`} label={`Yeni ${index + 1}`} icon={getFileIcon(file.name)} onDelete={() => handleRemoveNewFile(index)} size="small" color={getFileColor(file.name)} sx={{ maxWidth: 150 }} />))}
            </Stack>)}
            {error && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Lütfen dosya seçin veya hataları düzeltin.</Typography>}
        </Box>
    );
};

// --- توابع کامل دانلود PDF/Excel ---

const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;
    try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); doc.setFont('NotoSans'); } catch (e) { }

    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, 15, 25);
};

const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const docAny = doc as any;

    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
    const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR'];
    let footerY = pageHeight - 30;
    companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });

    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);

    const pageCount = docAny.internal.getNumberOfPages();
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};

const exportToPdf = (data: ConsignedCarRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => {
    if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
    setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

    // @ts-ignore
    const doc = new jsPDF();
    const docAny = doc as any;

    const columns = ['Tarih', 'Plaka', 'Personel', 'Kilometre', 'Durum'];
    const body = data.map(r => [
        formatDateDisplay(r.date || null),
        r.carWarhouseDetail.plaque || '-',
        `${r.personnel.name} ${r.personnel.family}` || '-',
        r.kilometer.toLocaleString() || '-',
        r.consigned ? 'Emanette' : 'Geri Alındı',
    ]);

    try {
        addPdfHeader(doc, title);

        autoTable(docAny, {
            head: [columns], body: body, startY: 35, theme: 'grid',
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
        showAlert('PDF dışa aktarılırken bir hata oluştu.', 'error');
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
    const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR'];
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

const exportToExcel = (data: ConsignedCarRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => {
    if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
    setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

    try {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title.substring(0, 31));

        const columns = ['Tarih', 'Plaka', 'Marka', 'Model', 'Personel', 'Kilometre', 'Durum', 'Açıklama'];
        addExcelHeader(worksheet, title, columns.length);

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        data.forEach(r => {
            worksheet.addRow([
                formatDateDisplay(r.date || null),
                r.carWarhouseDetail.plaque || '-',
                r.carWarhouseDetail.brand || '-',
                r.carWarhouseDetail.model || '-',
                `${r.personnel.name} ${r.personnel.family}` || '-',
                r.kilometer.toLocaleString() || '-',
                r.consigned ? 'Emanette' : 'Geri Alındı',
                r.description || '-',
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
        console.error("Excel dışa aktarılırken hata:", error);
        showAlert('Excel dışa aktarılırken bir hata oluştu.', 'error');
    } finally {
        setLoadingData(false);
    }
};

const handleDownloadPdf = (data: ConsignedCarRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => exportToPdf(data, title, showAlert, setLoadingData);
const handleDownloadExcel = (data: ConsignedCarRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => exportToExcel(data, title, showAlert, setLoadingData);


const ListConsignedCarwarehouse: React.FC = () => {
    const navigate = useNavigate();
    const { allowedOperations } = useAuth();

    // Permissions (مجوزها)
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // ------------------------------------
    // Form States (امانت/برگشت)
    // ------------------------------------
    const [isReturnMode, setIsReturnMode] = useState(false); // حالت برگشت فعال است؟
    const [originalRecord, setOriginalRecord] = useState<ConsignedCarRecord | null>(null); // رکورد اصلی برای حالت برگشت

    // Form Inputs
    const [date, setDate] = useState<Date | null>(new Date());
    const [kilometer, setKilometer] = useState<number | ''>('');
    const [description, setDescription] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]);

    // Form Combos
    const [warehousesList, setWarehousesList] = useState<CarWarehouseApi[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<CarWarehouseApi | null>(null); // کمبوی ۱: انبار
    const [carDetailsList, setCarDetailsList] = useState<CarDetail[]>([]);
    const [selectedCarDetail, setSelectedCarDetail] = useState<CarDetail | null>(null); // کمبوی ۲: جزئیات خودرو
    const [personnelList, setPersonnelList] = useState<PersonnelType[]>([]);
    const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelType | null>(null); // کمبوی ۳: پرسنل

    // Validation States
    const [warehouseError, setWarehouseError] = useState(false);
    const [carDetailError, setCarDetailError] = useState(false);
    const [personnelError, setPersonnelError] = useState(false);
    const [kilometerError, setKilometerError] = useState(false);

    // ------------------------------------
    // Table States (فیلتر و نمایش)
    // ------------------------------------
    const [filterWarehousesList, setFilterWarehousesList] = useState<CarWarehouseApi[]>([]);
    const [selectedFilterWarehouse, setSelectedFilterWarehouse] = useState<CarWarehouseApi | null>(null); // فیلتر ۱: انبار
    const [filterCarDetailsList, setFilterCarDetailsList] = useState<CarDetail[]>([]);
    const [selectedFilterCarDetail, setSelectedFilterCarDetail] = useState<CarDetail | null>(null); // فیلتر ۲: جزئیات خودرو

    const [consignedCars, setConsignedCars] = useState<ConsignedCarRecord[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<SortableKeys>('date');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ConsignedCarRecord | null>(null);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [attachmentsToView, setAttachmentsToView] = useState<AttachmentType[]>([]);
    const [isBlinking, setIsBlinking] = useState<boolean>(true); // برای دکمه 'Yeni Emanet Kaydı Ekle'


    const [searchTerm, setSearchTerm] = useState(''); // ⬅️ جستجو
    const [startFilter, setStartFilter] = useState<Date | null>(null); // ⬅️ فیلتر تاریخ شروع
    const [endFilter, setEndFilter] = useState<Date | null>(null);


    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<ConsignedCarRecord | null>(null);


    // --- Utility Functions ---
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);
    useEffect(() => { let timer: NodeJS.Timeout; if (alertMessage) timer = setTimeout(() => clearAlert(), 5000); return () => { if (timer) clearTimeout(timer); }; }, [alertMessage]);

    // ------------------------------------
    // Data Fetching Logic (واکشی داده)
    // ------------------------------------

    const fetchPersonnelList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const list: PersonnelType[] = (res.data?.data ?? [])
                    .filter((p: any) => p.hasISG === true && (!p.workEndDate || p.workEndDate === null))
                    .map((x: any) => ({
                        id: Number(x.id), name: x.name, family: x.family, identityNumber: x.identityNumber,
                        workEndDate: x.workEndDate ? String(x.workEndDate).slice(0, 10) : null,
                    }));
                setPersonnelList(list);
            }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || "Personel listesi alınamadı.", "error");
        }
    }, [navigate, showAlert]);

    const fetchWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-car-warehouses`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const activeWarehouses = response.data.data.filter((w: CarWarehouseApi) => w.recordStatus === 0);
                setWarehousesList(activeWarehouses);
                setFilterWarehousesList(activeWarehouses);

                if (activeWarehouses.length > 0) {
                    setSelectedWarehouse(activeWarehouses[0]);
                    setSelectedFilterWarehouse(activeWarehouses[0]);
                }
            } else { showAlert('Araç Depo listesi alınamadı.', 'error'); }
        } catch (e) { showAlert('Araç Depo listesi yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate, showAlert]);

    const fetchCarDetailsForForm = useCallback(async (warehouseId: string | null) => {
        if (!warehouseId) { setCarDetailsList([]); return; }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        try {
            const url = `${server.baseurl}${server.warehouse}get-car-warehouse-details-by-warehouseId/${warehouseId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const filteredList = (res.data.data as any[])
                    .filter((car: any) => Number(car.recordStatus) === 0 && car.available === true)
                    .map((car: any): CarDetail => ({ // 👈 اطمینان از نوع خروجی map
                        id: Number(car.id),
                        brand: String(car.brand),
                        model: String(car.model),   // 👈 اضافه کردن فیلدهای گمشده
                        plaque: String(car.plaque), // 👈 اضافه کردن فیلدهای گمشده
                        available: Boolean(car.available), // تبدیل به boolean

                        recordStatus: (Number(car.recordStatus) === 0 ? 0 : 1) as RecordStatus,
                    }));

                setCarDetailsList(filteredList);
            }
        } catch (e) {
            showAlert('Araç detayları yüklenemedi.', 'error');
        }
    }, [showAlert]);

    const fetchCarDetailsForFilter = useCallback(async (warehouseId: string | null) => {
        if (!warehouseId) { setFilterCarDetailsList([]); return; }
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        try {
            const url = `${server.baseurl}${server.warehouse}get-car-warehouse-details-by-warehouseId/${warehouseId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const rawList = (res.data.data as any[]);
                const filteredList = rawList
                    .filter((car: any) => Number(car.recordStatus) === 0)
                    .map((car: any): CarDetail => ({ // 👈 اطمینان از نوع خروجی map
                        id: Number(car.id),
                        brand: String(car.brand),
                        model: String(car.model),   // 👈 اضافه کردن فیلدهای گمشده
                        plaque: String(car.plaque), // 👈 اضافه کردن فیلدهای گمشده
                        available: Boolean(car.available), // تبدیل به boolean

                        // 👈 تبدیل صریح به RecordStatus
                        recordStatus: (Number(car.recordStatus) === 0 ? 0 : 1) as RecordStatus,
                    }));
                setFilterCarDetailsList(filteredList);
            }
        } catch (e) { /* Hata yönetimi */ }
    }, []);

    const fetchConsignedCars = useCallback(async (carDetailId: number | null) => {
        if (!carDetailId) { setConsignedCars([]); setLoadingData(false); return; }
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            const url = `${server.baseurl}${server.warehouse}get-consigned-cars-with-car-warehouseDetailId/${carDetailId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                setConsignedCars(res.data.data as ConsignedCarRecord[]);
            } else { showAlert(res.data.message || 'Araç kayıtları yüklenemedi.', 'error'); }
        } catch (e) { showAlert('Araç kayıtları yüklenirken bir hata oluştu.', 'error'); } finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    // ------------------------------------
    // useEffect Hooks (زنجیره واکشی)
    // ------------------------------------
    useEffect(() => { fetchWarehouses(); fetchPersonnelList(); }, [fetchWarehouses, fetchPersonnelList]);
    useEffect(() => { fetchCarDetailsForForm(selectedWarehouse?.id || null); setSelectedCarDetail(null); }, [selectedWarehouse, fetchCarDetailsForForm]);
    useEffect(() => { fetchCarDetailsForFilter(selectedFilterWarehouse?.id || null); setSelectedFilterCarDetail(null); }, [selectedFilterWarehouse, fetchCarDetailsForFilter]);
    useEffect(() => { fetchConsignedCars(selectedFilterCarDetail?.id || null); }, [selectedFilterCarDetail, fetchConsignedCars]);

    // ------------------------------------
    // Form & Action Handlers (ثبت و برگشت)
    // ------------------------------------

    const validateForm = (): boolean => {
        let ok = true;
        setWarehouseError(false); setCarDetailError(false); setPersonnelError(false); setKilometerError(false);

        if (!selectedWarehouse) { setWarehouseError(true); ok = false; }
        if (!selectedCarDetail) { setCarDetailError(true); ok = false; }
        if (!selectedPersonnel && !isReturnMode) { setPersonnelError(true); ok = false; }
        if (kilometer === '' || Number(kilometer) <= 0) { setKilometerError(true); ok = false; }

        if (!ok) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return ok;
    };

    const resetForm = useCallback(() => {
        setIsReturnMode(false);
        setOriginalRecord(null);

        if (warehousesList.length > 0) { setSelectedWarehouse(warehousesList[0]); }
        setSelectedCarDetail(null);
        setSelectedPersonnel(null);

        setDate(new Date());
        setKilometer('');
        setDescription('');
        setSelectedFiles([]);
        setCurrentAttachments([]);
        setWarehouseError(false); setCarDetailError(false); setPersonnelError(false); setKilometerError(false);
        setIsFormVisible(false);
    }, [warehousesList]);

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setLoadingButton(false); return; }

        let fileUrls: string[] | null = [];
        if (selectedFiles.length > 0) {
            showAlert('Dosyalar yükleniyor...', 'info');
            fileUrls = await uploadFiles(selectedFiles, authToken, showAlert);
            if (fileUrls === null) { setLoadingButton(false); return; }
        }

        const finalAttachments: AttachmentType[] = [...currentAttachments, ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])];

        const consignedStatus = !isReturnMode;
        const personnelToSend = isReturnMode ? originalRecord!.personnelId : selectedPersonnel!.id;

        const payload: ConsignedCarPayload = {
            date: date ? date.toISOString() : new Date().toISOString(),
            attachments: finalAttachments,
            description: description,
            kilometer: Number(kilometer),
            carWarhouseDetailId: selectedCarDetail!.id,
            personnelId: personnelToSend,
            consigned: consignedStatus,
        };

        debugger
        const url = `${server.baseurl}${server.warehouse}create-consigned-car`;

        try {
            const res = await axios.post(url, payload, { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            if (res.data.httpStatusCode === 201) {
                showAlert(`Araç başarıyla ${consignedStatus ? 'emanet edildi' : 'geri alındı'}!`, 'success');
                resetForm();
                fetchConsignedCars(selectedFilterCarDetail?.id || null);
                fetchCarDetailsForForm(selectedWarehouse?.id || null);
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'İşlem sırasında bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    // ------------------------------------
    // Table Action Handlers
    // ------------------------------------

    const handleReturnCar = (row: ConsignedCarRecord) => {
        setOriginalRecord(row);
        setIsReturnMode(true);

        const currentWarehouse = warehousesList.find(w => w.id === String(row.carWarhouseDetailId)) || null;

        setSelectedWarehouse(currentWarehouse);
        setSelectedCarDetail(row.carWarhouseDetail);
        setSelectedPersonnel(row.personnel);

        setDate(new Date());
        setKilometer('');
        setDescription(row.description);
        setCurrentAttachments(row.attachments);

        setIsFormVisible(true);
        handleCloseMenu();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ConsignedCarRecord) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const filteredConsignedCars = useMemo(() => {
        const list = consignedCars.filter(r => {
            // 1. فیلتر جستجو (پلاک یا نام پرسنل)
            const matchesSearch = r.carWarhouseDetail.plaque.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.personnel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.personnel.family.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. فیلتر تاریخ
            const cDate = new Date(r.date);
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) &&
                (!endFilter || (cDate && cDate <= endFilter));

            return matchesSearch && inRange;
        });
        // 3. اعمال مرتب سازی و بازگرداندن
        return stableSort(list, getComparator(order, orderBy));
    }, [consignedCars, searchTerm, startFilter, endFilter, order, orderBy]);

    const paginatedRows = useMemo(() => filteredConsignedCars.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredConsignedCars, page, rowsPerPage]);
    const isFilterActive = useMemo(() => !!searchTerm.trim() || startFilter !== null || endFilter !== null, [searchTerm, startFilter, endFilter]);
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleRequestSort = useCallback((property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); }, [order, orderBy]);
    const handleClickOpenDeleteModal = () => { if (!selectedRowForMenu) return; setDeleteId(selectedRowForMenu.id); setDeleteName(`${selectedRowForMenu.carWarhouseDetail.plaque} / ${selectedRowForMenu.personnel.name} ${selectedRowForMenu.personnel.family}`); setOpenDeleteModal(true); handleCloseMenu(); };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchConsignedCars(selectedFilterCarDetail?.id || null); };
    const handleOpenAttachmentsModal = (attachments: AttachmentType[]) => { setAttachmentsToView(attachments); setOpenAttachmentsModal(true); handleCloseMenu(); };
    const handleDownloadLinkClick = (fileUrl: string) => { if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; } const url = `${server.urldpwonload}${fileUrl}`; window.open(url, '_blank'); showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info'); };


    // باز کردن مودال ردیف
    const handleOpenRowDownloadModal = (row: ConsignedCarRecord) => {
        setSelectedRowForDownload(row);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    // اجرای دانلود ردیف
    const handleDownloadRow = (format: 'pdf' | 'excel') => {
        if (!selectedRowForDownload) return;
        const title = `Araç Emanet Kaydı: ${selectedRowForDownload.carWarhouseDetail.plaque}`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler([selectedRowForDownload], title, showAlert, setLoadingData);
        setOpenRowDownloadModal(false);
        setSelectedRowForDownload(null);
    };

    // اجرای دانلود کل لیست
    const handleDownloadAllAction = (format: 'pdf' | 'excel') => {
        const title = `Tüm Emanet Araç Kayıtları`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(consignedCars, title, showAlert, setLoadingData);
        setOpenDownloadAllModal(false);
    };

    // اجرای دانلود لیست فیلتر شده
    const handleDownloadFilteredAction = (format: 'pdf' | 'excel') => {
        const title = `Filtrelenmiş Emanet Araç Kayıtları`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(filteredConsignedCars, title, showAlert, setLoadingData);
        setOpenDownloadFilteredModal(false);
    };

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={3} spacing={2} flexWrap="wrap">
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                        {isReturnMode ? 'Araç Geri Alma Kaydı' : 'Araç Emanet Kayıtları'}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (<BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} fullWidth={false} startIcon={<DirectionsCarFilledRoundedIcon fontSize="small" />}>Yeni Emanet Kaydı Ekle</BlinkingButton>)}
                        {isFormVisible && (<Button variant="contained" color="error" onClick={resetForm} disabled={loadingButton} fullWidth={false} startIcon={<IconX size={20} />}>İptal Et</Button>)}
                    </Stack>
                </Stack>
                {isFormVisible && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{isReturnMode ? 'Araç Geri Alma Formu (Yeni Kayıt)' : 'Yeni Araç Emanet Formu'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}><CustomFormLabel required>Araç Depo</CustomFormLabel><Autocomplete size="small" options={warehousesList} getOptionLabel={(option) => `${option.name} (${option.code})`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedWarehouse} onChange={(_, newValue) => { setSelectedWarehouse(newValue); setWarehouseError(false); }} renderInput={(params) => (<TextField {...params} label="Araç Depo Seçin" error={warehouseError} helperText={warehouseError ? 'Zorunlu alan.' : ''} />)} disabled={isReturnMode || loadingButton} /></Grid>
                            <Grid item xs={12} sm={6} md={4}><CustomFormLabel required>Emanet Edilecek Araç</CustomFormLabel><Autocomplete size="small" options={carDetailsList} getOptionLabel={(option) => `${option.brand} - ${option.plaque}`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedCarDetail} onChange={(_, newValue) => { setSelectedCarDetail(newValue); setCarDetailError(false); }} renderInput={(params) => (<TextField {...params} label="Araç Seçin" error={carDetailError} helperText={carDetailError ? 'Zorunlu alan.' : ''} />)} disabled={!selectedWarehouse || loadingButton || isReturnMode} /></Grid>
                            <Grid item xs={12} sm={6} md={4}><CustomFormLabel required>{isReturnMode ? 'Geri Alan Personel' : 'Emanet Alan Personel'}</CustomFormLabel><Autocomplete size="small" options={personnelList} getOptionLabel={(option) => `${option.name} ${option.family}`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedPersonnel} onChange={(_, newValue) => { setSelectedPersonnel(newValue); setPersonnelError(false); }} renderInput={(params) => (<TextField {...params} label="Personel Seçin" error={personnelError} helperText={personnelError ? 'Zorunlu alan.' : ''} />)} disabled={loadingButton || isReturnMode} /></Grid>
                            <Grid item xs={12} sm={6} md={4}><CustomFormLabel required>Tarih</CustomFormLabel><LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}><DatePicker label="Tarih" value={date} onChange={(v) => setDate(v)} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} disabled={loadingButton} /></LocalizationProvider></Grid>
                            <Grid item xs={12} sm={6} md={4}><CustomFormLabel required>Kilometre</CustomFormLabel><TextField placeholder="Kilometre" type="number" size="small" fullWidth value={kilometer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setKilometer(Number(e.target.value)); setKilometerError(false); }} error={kilometerError} helperText={kilometerError ? 'Zorunlu alan.' : ''} disabled={loadingButton} /></Grid>
                            <Grid item xs={12} sm={12} md={12}><CustomFormLabel>Açıklama</CustomFormLabel><TextField placeholder="Detaylı Açıklama" size="small" fullWidth value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} multiline rows={2} disabled={loadingButton} /></Grid>
                            <Grid item xs={12}><CustomFormLabel>Ekler (Resim/PDF/Excel)</CustomFormLabel><ConsignmentFileUpload files={selectedFiles} setFiles={setSelectedFiles} error={false} currentAttachments={currentAttachments} setCurrentAttachments={setCurrentAttachments} /></Grid>
                            <Grid item xs={12}><Stack direction="row" spacing={1} justifyContent="flex-end"><Button variant="contained" color={isReturnMode ? "warning" : "success"} onClick={handleSubmit} disabled={loadingButton || !selectedCarDetail || (isReturnMode && !originalRecord)} size="small">{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : isReturnMode ? 'Geri Almayı Kaydet (Consigned: False)' : 'Emanet Kaydet (Consigned: True)'}</Button><Button variant="outlined" color="secondary" onClick={resetForm} size="small">İptal Et</Button></Stack></Grid>
                        </Grid>
                    </Paper>
                )}
            </div>

            {alertMessage && (<Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>)}

            <BlankCard>
                {/* --- Filters (فیلترهای جدول) --- */}
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* 1. Filtre Araç Depo */}
                        <Grid item xs={12} sm={6} md={3}>
                            <CustomFormLabel required>Filtre Araç Depo</CustomFormLabel>
                            <Autocomplete size="small" options={filterWarehousesList} getOptionLabel={(option) => `${option.name} (${option.code})`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedFilterWarehouse} onChange={(_, newValue) => { setSelectedFilterWarehouse(newValue); }} renderInput={(params) => (<TextField {...params} label="Depo Seçin" />)} />
                        </Grid>

                        {/* 2. Filtre Araç Plakası */}
                        <Grid item xs={12} sm={6} md={3}>
                            <CustomFormLabel required>Filtre Araç Plakası</CustomFormLabel>
                            <Autocomplete size="small" options={filterCarDetailsList} getOptionLabel={(option) => `${option.brand} - ${option.plaque}`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedFilterCarDetail} onChange={(_, newValue) => { setSelectedFilterCarDetail(newValue); }} renderInput={(params) => (<TextField {...params} label="Plaka Seçin" />)} disabled={!selectedFilterWarehouse} />
                        </Grid>



                        {/* 7. دکمه‌های دانلود (متصل به مودال) */}
                        <Grid item xs={12} md={6}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                                {isFilterActive && hasDownloadPermission && (
                                    <Button variant="contained" color="secondary" onClick={() => setOpenDownloadFilteredModal(true)} disabled={loadingData || !filteredConsignedCars.length} startIcon={<IconFileDownload />} size="small">Filtrelenmişi İndir</Button>
                                )}
                                {hasDownloadPermission && (
                                    <Button variant="contained" color="primary" onClick={() => setOpenDownloadAllModal(true)} disabled={loadingData || !consignedCars.length} startIcon={<IconFileDownload />} size="small">Tümünü İndir</Button>
                                )}
                            </Stack>
                        </Grid>
                    </Grid>

                    <Grid container spacing={2} alignItems="center">
                        {/* 3. Arama (جستجوی متنی) ⭐️ */}
                        <Grid item xs={12} sm={6} md={6}>
                            <CustomFormLabel>Ara (Plaka / Personel)</CustomFormLabel>
                            <TextField
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                size="small"
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                placeholder="Plaka veya Personel Adı"
                            />
                        </Grid>

                        {/* 4. Tarih Başlangıç (فیلتر تاریخ شروع) ⭐️ */}
                        <Grid item xs={12} sm={6} md={3}>
                            <CustomFormLabel>Tarih Aralığı (Başlangıç)</CustomFormLabel>
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

                        {/* 5. Tarih Bitiş (فیلتر تاریخ پایان) ⭐️ */}
                        <Grid item xs={12} sm={6} md={3}>
                            <CustomFormLabel>Tarih Aralığı (Bitiş)</CustomFormLabel>
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
                                    <IconButton onClick={() => { setStartFilter(null); setEndFilter(null); }} aria-label="clear date filters" size="small"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>


                    </Grid>
                </Box>

                {/* --- Table --- */}
                <TableContainer>
                    {loadingData || !selectedFilterCarDetail ? (<Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        {loadingData && <CircularProgress />}<Typography variant="h6" sx={{ ml: 2 }}>{loadingData ? 'Kayıtlar yükleniyor...' : 'Lütfen filtrelemek için bir araç plakası seçin.'}</Typography>
                    </Box>) : (
                        <Table aria-label="consigned cars table">
                            <TableHead sx={{ background: "#f0f0f0" }}>
                                <TableRow>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'date'} direction={orderBy === 'date' ? order : 'asc'} onClick={() => handleRequestSort('date')}><Typography variant="h6">Tarih</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Plaka</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Personel</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'kilometer'} direction={orderBy === 'kilometer' ? order : 'asc'} onClick={() => handleRequestSort('kilometer')}><Typography variant="h6">Kilometre</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ekler</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'consigned'} direction={orderBy === 'consigned' ? order : 'asc'} onClick={() => handleRequestSort('consigned')}><Typography variant="h6">Durum</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">İşlem</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>{formatDateDisplay(row.date)}</StyledTableCell>
                                            <StyledTableCell>{row.carWarhouseDetail.plaque || '-'}</StyledTableCell>
                                            <StyledTableCell>{`${row.personnel.name} ${row.personnel.family}` || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.kilometer.toLocaleString() || '-'}</StyledTableCell>
                                            <StyledTableCell><IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary" size="small"></Chip></IconButton></StyledTableCell>
                                            <StyledTableCell><Chip label={row.consigned ? 'Emanette' : 'Geri Alındı'} color={row.consigned ? 'error' : 'success'} size="small" /></StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    {row.consigned && hasCreatePermission && (<MuiMenuItem onClick={() => handleReturnCar(row)}><ListItemIcon><DirectionsCarFilledRoundedIcon fontSize="small" /></ListItemIcon> Geri Al</MuiMenuItem>)}
                                                    {hasDeletePermission && (<MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>)}

                                                    {hasDownloadPermission && (<MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir</MuiMenuItem>)}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (<TableRow><StyledTableCell colSpan={7} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kayıt bulunamadı.</Typography></StyledTableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={consignedCars.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            <DeleteConsignedCarwarehouse openModal={openDeleteModal} onClose={handleCloseDeleteModal} idToDelete={deleteId} nameToDelete={deleteName} onDeleteSuccess={() => fetchConsignedCars(selectedFilterCarDetail?.id || null)} showAlert={showAlert} />
            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler ({attachmentsToView.length} adet)</DialogTitle>
                <DialogContent dividers>{attachmentsToView.length > 0 ? (<Stack spacing={1}>
                    {attachmentsToView.map((attachment, index) => {
                        const fileName = attachment.fileUrl.split('/').pop() || `Dosya ${index + 1}`;
                        return (<Button key={index} fullWidth variant="outlined" onClick={() => handleDownloadLinkClick(attachment.fileUrl)} sx={{ mt: 1 }}>{fileName}</Button>);
                    })}
                </Stack>) : (<DialogContentText>Bu kayda ait ek dosya bulunmamaktadır.</DialogContentText>)}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAttachmentsModal(false)} color="primary" variant="outlined">Kapat</Button></DialogActions>
            </Dialog>

            {/* --- Modals --- */}

            {/* 1. Modalı Download All */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAllAction('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAllAction('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* 2. Modalı Download Filtered */}
            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadFilteredAction('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadFilteredAction('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* 3. Modalı Download Row */}
            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
        </>
    );
};

export default ListConsignedCarwarehouse;