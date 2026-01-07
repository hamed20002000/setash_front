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
    IconFileSpreadsheet, IconFileText, IconBox, IconLink, IconGasStation
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
import Logo from 'src/assets/images/logos/logo.png';
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import BlankCard from "src/components/shared/BlankCard";


// --- Interfaces (با اعمال اصلاحات لازم برای سازگاری با JSON جدید) ---
type RecordStatus = 0 | 1;

interface RegionType { id: string; name: string; depth: number; createAt: string; recordStatus: RecordStatus; }

interface CarWarehouse {
    id: string;
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: RecordStatus;
    region: RegionType;
}

interface AttachmentType { fileUrl: string; }
interface CarWarehouseApi { id: string; name: string; code: string; recordStatus: number; }

interface CarDetail {
    id: number | string;
    brand: string;
    model: string;
    plaque: string;
    available: boolean;
    recordStatus: RecordStatus;
    fuelType: string | null;

    // فیلدهای جدید/تکمیلی از JSON
    manufactureDate: string;
    description: string;
    attacments: AttachmentType[];
    createAt: string;
    carWarehouse: CarWarehouse;
}

interface PersonnelType { id: number; name: string; family: string; identityNumber: string; workEndDate: string | null; }

// interface ConsignedCarPayload {
//     date: string; attachments: { fileUrl: string }[]; description: string; kilometer: number; carWarhouseDetailId: number | string;
//     personnelId: number; consigned: boolean;
// }

interface WorkhouseType {
    id: number;
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: number;
}
interface ConsignedCarPayload {
    date: string; attachments: { fileUrl: string }[]; description: string; kilometer: number; carWarhouseDetailId: number | string;
    personnelId: number; consigned: boolean;
    // ⭐ NEW FIELD ⭐
    // workhouseId: number | string;
    workhouseId?: string | number | null;
}

interface ConsignedCarRecord {
    id: number | string;
    date: string;
    description: string;
    kilometer: number;
    consigned: boolean;
    workhouse: WorkhouseType;

    carWarhouseDetail: CarDetail;
    carWarehouseDetail: CarDetail;
    // 💡 فرض می‌کنیم فیلد Personnel در پاسخ اصلی وجود دارد 💡
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

    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 35; // کمی کوچک‌تر برای ظرافت بیشتر
    const logoHeight = 18;
    const margin = 15;
    const logoX = pageWidth - logoWidth - margin; // لوگو سمت راست

    try {
        doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
    } catch (e) {
        console.error("Logo yüklenemedi", e);
    }

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 25, { align: 'center' }); // عنوان وسط

    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.text(`Rapor Tarihi:`, 15, 35);
    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 35);

    // اضافه کردن خط جداکننده خاکستری طبق استاندارد جدید
    // doc.setDrawColor(200, 200, 200);
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


const addPdfHeaders = (doc: jsPDF, title: string) => {

    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 35; // کمی کوچک‌تر برای ظرافت بیشتر
    const logoHeight = 18;
    const margin = 15;
    const logoX = pageWidth - logoWidth - margin; // لوگو سمت راست

    try {
        doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
    } catch (e) {
        console.error("Logo yüklenemedi", e);
    }

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 25, { align: 'center' }); // عنوان وسط

    doc.setFontSize(10);
    doc.setFont('NotoSans', 'bold');
    doc.text(`Rapor Tarihi:`, 15, 35);
    doc.setFont('NotoSans', 'normal');
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 35);

    // اضافه کردن خط جداکننده خاکستری طبق استاندارد جدید
    // doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, 40, pageWidth - 15, 40);
};

const addPdfFooters = (doc: jsPDF) => {
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


const exportToPdf = (data: ConsignedCarRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => {
    if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
    setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

    // @ts-ignore
    const doc = new jsPDF();
    const docAny = doc as any;

    const columns = ['Tarih', 'Plaka', 'Personel', 'Kilometre', 'Açıklama', 'Durum'];
    const body = data.map(r => [
        formatDateDisplay(r.date || null),
        r.carWarehouseDetail.plaque || '-',
        `${r.personnel.name} ${r.personnel.family}` || '-',
        r.kilometer.toLocaleString() || '-',
        r.description || '-',
        r.consigned ? 'Emanette' : 'Geri Alındı',
    ]);

    try {
        addPdfHeader(doc, title);

        autoTable(docAny, {
            head: [columns], body: body, startY: 45, theme: 'grid',
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
    // const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR'];
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
                r.carWarehouseDetail.plaque || '-',
                r.carWarehouseDetail.brand || '-',
                r.carWarehouseDetail.model || '-',
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
    // const { allowedOperations } = useAuth();


    const { isTooltipGloballyEnabled } = useTooltip();

    // const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    // const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    // const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);


    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            // اگر خود آیتم تطبیق داشت
            if (item.href === path) return item;

            // اگر آیتم فرزند داشت، داخل فرزندان جستجو کن
            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    // ۲. استفاده از تابع برای پیدا کردن منوی فعلی
    const currentMenu = useMemo(() => {
        debugger
        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    // ۳. استخراج ID عملیات‌ها (با اطمینان از وجود id)
    const currentMenuOpIds = useMemo(() => {
        // اگر منو یا عملیات‌های آن وجود نداشت، آرایه خالی برگردان
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            // با توجه به دیتای API شما، ID اصلی عملیات در این سطح است
            return String(op.id);
        });
    }, [currentMenu]);

    // ۴. تابع نهایی بررسی دسترسی
    const hasPermission = (opName: string) => {
        return allowedOperations.some((op: any) =>
            op.systemOperationName === opName &&
            currentMenuOpIds.includes(String(op.menuOperationId))
        );
    };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    //   const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazدırmak"), [allowedOperations, currentMenuOpIds]);


    const [isReturnMode, setIsReturnMode] = useState(false); // حالت برگشت فعال است؟
    const [originalRecord, setOriginalRecord] = useState<ConsignedCarRecord | null>(null); // رکورد اصلی برای حالت برگشت

    // Form Inputs
    const [date, setDate] = useState<Date | null>(new Date());
    const [kilometer, setKilometer] = useState<number | ''>('');
    const [description, setDescription] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]);

    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [selectedWorkhouse, setSelectedWorkhouse] = useState<WorkhouseType | null>(null);
    const [workhouseError, setWorkhouseError] = useState(false);

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
    const [orderBy, setOrderBy] = useState<SortableKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ConsignedCarRecord | null>(null);


    const [openReturnModal, setOpenReturnModal] = useState(false);
    const [rowToReturn, setRowToReturn] = useState<ConsignedCarRecord | null>(null);
    const [returnKilometer, setReturnKilometer] = useState<number | ''>('');
    const [returnDescription, setReturnDescription] = useState<string>('');
    const [returnDate, setReturnDate] = useState<Date | null>(new Date());
    const [returnFiles, setReturnFiles] = useState<File[]>([]);
    const [returnAttachments, setReturnAttachments] = useState<AttachmentType[]>([]);
    const [returnKilometerError, setReturnKilometerError] = useState(false);
    const [returnButtonLoading, setReturnButtonLoading] = useState(false);

    const [openAttachModal, setOpenAttachModal] = useState(false);
    const [rowToUpdateAttachments, setRowToUpdateAttachments] = useState<ConsignedCarRecord | null>(null);
    const [attachFiles, setAttachFiles] = useState<File[]>([]); // فایل‌های جدید برای آپلود
    const [attachCurrentAttachments, setAttachCurrentAttachments] = useState<AttachmentType[]>([]); // پیوست‌های موجود
    const [attachButtonLoading, setAttachButtonLoading] = useState(false);
    const [attachError, setAttachError] = useState(false);




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


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const [lastSubmittedPayload, setLastSubmittedPayload] = useState<ConsignedCarPayload | null>(null);
    const [lastRecordDetail, setLastRecordDetail] = useState<ConsignedCarRecord | null>(null);
    const [openLastRecordModal, setOpenLastRecordModal] = useState(false);

    const [isListReadyToSearch, setIsListReadyToSearch] = useState(false);



    // --- Utility Functions ---
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);
    useEffect(() => { let timer: NodeJS.Timeout; if (alertMessage) timer = setTimeout(() => clearAlert(), 5000); return () => { if (timer) clearTimeout(timer); }; }, [alertMessage]);

    const fetchPersonnelList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const list: PersonnelType[] = (res.data?.data ?? [])
                    .filter((p: any) => (!p.workEndDate || p.workEndDate === null))
                    .map((x: any) => ({
                        id: Number(x.id), name: x.name, family: x.family, identityNumber: x.identityNumber,
                        workEndDate: x.workEndDate ? String(x.workEndDate).slice(0, 10) : null,
                    }));
                setPersonnelList(list);
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);

    const fetchWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }

        let requestParams = {};

        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-car-warehouses`,
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const activeWarehouses = response.data.data.filter((w: CarWarehouseApi) => w.recordStatus === 0);
                setWarehousesList(activeWarehouses);
                setFilterWarehousesList(activeWarehouses);

                if (activeWarehouses.length > 0) {
                    setSelectedWarehouse(activeWarehouses[0]);
                    setSelectedFilterWarehouse(activeWarehouses[0]);
                }
            } else { showAlert('Araç Depo listesi alınamadı.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
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
                        model: String(car.model),
                        plaque: String(car.plaque),
                        available: Boolean(car.available),
                        fuelType: String(car.fuelType),
                        recordStatus: (Number(car.recordStatus) === 0 ? 0 : 1) as RecordStatus,

                        // فیلدهای جدید/تکمیلی
                        manufactureDate: String(car.manufactureDate),
                        description: String(car.description),
                        attacments: car.attacments || [], // فرض می‌کنیم این لیست است
                        createAt: String(car.createAt),
                        carWarehouse: car.carWarehouse, // فرض می‌کنیم آبجکت کامل ارسال می‌شود
                    }));

                setCarDetailsList(filteredList);
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
                        model: String(car.model),
                        plaque: String(car.plaque),
                        available: Boolean(car.available),

                        fuelType: String(car.fuelType),
                        recordStatus: (Number(car.recordStatus) === 0 ? 0 : 1) as RecordStatus,
                        // فیلدهای جدید/تکمیلی
                        manufactureDate: String(car.manufactureDate),
                        description: String(car.description),
                        attacments: car.attacments || [], // فرض می‌کنیم این لیست است
                        createAt: String(car.createAt),
                        carWarehouse: car.carWarehouse, // فرض می‌کنیم آبجکت کامل ارسال می‌شود
                    }));
                setFilterCarDetailsList(filteredList);
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, []);

    const fetchConsignedCars = useCallback(async (carDetailId: number | string | null) => {
        if (!carDetailId) { setConsignedCars([]); setLoadingData(false); return; }
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) {
            navigate("/");
            return;
        }
        let requestParams = {};
        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const url = `${server.baseurl}${server.warehouse}get-consigned-cars-with-car-warehouseDetailId/${carDetailId}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: requestParams
            });

            if (res.data.httpStatusCode === 200) {
                // فرض می‌کنیم داده‌های personnel در این پاسخ وجود دارند.
                setConsignedCars(res.data.data as ConsignedCarRecord[]);
            } else { showAlert(res.data.message || 'Araç kayıtları yüklenemedi.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }

        finally { setLoadingData(false); }
    }, [navigate, showAlert]);

    const getWorkhousesList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }

        let requestParams = {};
        if (role.toLowerCase() !== 'admin') {
            requestParams = { rolename: role };
        }
        try {
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
            if (response.data.httpStatusCode === 200) {
                const activeWorkhouses = response.data.data.filter((wh: WorkhouseType) => wh.recordStatus === 0);
                setWorkhousesList(activeWorkhouses);
            } else {
                showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);

    // useEffect(() => { fetchWarehouses(); fetchPersonnelList(); }, [fetchWarehouses, fetchPersonnelList]);
    useEffect(() => {
        fetchWarehouses();
        fetchPersonnelList();
        getWorkhousesList();
    }, [fetchWarehouses, fetchPersonnelList, getWorkhousesList]);
    useEffect(() => { fetchCarDetailsForForm(selectedWarehouse?.id || null); setSelectedCarDetail(null); }, [selectedWarehouse, fetchCarDetailsForForm]);
    useEffect(() => { fetchCarDetailsForFilter(selectedFilterWarehouse?.id || null); setSelectedFilterCarDetail(null); }, [selectedFilterWarehouse, fetchCarDetailsForFilter]);
    useEffect(() => { fetchConsignedCars(selectedFilterCarDetail?.id || null); }, [selectedFilterCarDetail, fetchConsignedCars]);

    const validateForm = (): boolean => {
        let ok = true;
        setWarehouseError(false); setCarDetailError(false); setPersonnelError(false); setKilometerError(false);
        setWorkhouseError(false);
        if (!selectedWarehouse) { setWarehouseError(true); ok = false; }
        if (!selectedCarDetail) { setCarDetailError(true); ok = false; }
        // if (!selectedWorkhouse && !isReturnMode) { setWorkhouseError(true); ok = false; }
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
        setSelectedWorkhouse(null);

        setDate(new Date());
        setKilometer('');
        setDescription('');
        setSelectedFiles([]);
        setCurrentAttachments([]);
        setWarehouseError(false); setCarDetailError(false); setPersonnelError(false); setKilometerError(false);
        setWorkhouseError(false);
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

        const personnelToSend = isReturnMode ? originalRecord!.personnel.id : selectedPersonnel!.id;
        const workhouseToSend = isReturnMode ? originalRecord!.workhouse.id : selectedWorkhouse!.id;
        const payload: ConsignedCarPayload = {
            date: date ? date.toISOString() : new Date().toISOString(),
            attachments: finalAttachments,
            description: description,
            kilometer: Number(kilometer),
            carWarhouseDetailId: Number(selectedCarDetail!.id),
            personnelId: Number(personnelToSend),
            // workhouseId: Number(workhouseToSend),
            workhouseId: workhouseToSend ? Number(workhouseToSend) : null,
            consigned: consignedStatus,
        };


        const url = `${server.baseurl}${server.warehouse}create-consigned-car`;

        try {
            const res = await axios.post(url, payload, { headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            if (res.data.httpStatusCode === 201) {
                showAlert(`Araç başarıyla emanet edildi!`, 'success');

                setLastSubmittedPayload(payload);

                setSelectedFilterWarehouse(selectedWarehouse);
                setSelectedFilterCarDetail(selectedCarDetail);

                fetchConsignedCars(selectedFilterCarDetail?.id || null);
                fetchCarDetailsForForm(selectedWarehouse?.id || null);


                setIsListReadyToSearch(true);


                resetForm();
                setIsFormVisible(false);

            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
        finally { setLoadingButton(false); }
    };


    useEffect(() => {
        // اگر دیتای جدیدی ثبت کردیم و لیست جدول آپدیت شده و لودینگ تمام شده
        if (lastSubmittedPayload && !loadingData) {

            const found = consignedCars.find(r =>
                String(r.carWarehouseDetail?.id) === String(lastSubmittedPayload.carWarhouseDetailId) &&
                Number(r.kilometer) === Number(lastSubmittedPayload.kilometer)
            );

            if (found) {
                setSelectedRowForDownload(found); // رکورد را انتخاب کن
                setOpenRowDownloadModal(true);    // مودال دانلود ردیف را باز کن
                setLastSubmittedPayload(null);    // عملیات تمام شد، ریست کن
            }
        }
    }, [consignedCars, loadingData, lastSubmittedPayload]);

    const handleReturnCar = (row: ConsignedCarRecord) => {
        setRowToReturn(row);
        setReturnKilometer(''); // پر کردن کیلومتر قبلی به عنوان مقدار اولیه
        setReturnDescription('');
        setReturnAttachments([]); // پیوست‌های قبلی را بیاورید
        setReturnFiles([]); // فایل‌های جدید را ریست کنید
        setReturnDate(new Date()); // تاریخ را به امروز تنظیم کنید
        setReturnKilometerError(false);

        setOpenReturnModal(true);
        handleCloseMenu();
    };



    useEffect(() => {
        if (lastSubmittedPayload && isListReadyToSearch && consignedCars.length > 0) {

            const targetConsignedStatus = lastSubmittedPayload.consigned;
            // پیدا کردن رکورد جدید (بر اساس تطابق کامل Payload)
            const newRecord = consignedCars.find(r =>
                String(r.carWarehouseDetail.id) === String(lastSubmittedPayload.carWarhouseDetailId) &&
                String(r.personnel.id) === String(lastSubmittedPayload.personnelId) &&
                r.kilometer === lastSubmittedPayload.kilometer &&
                r.consigned === targetConsignedStatus // ✅ تطابق بر اساس وضعیت مورد انتظار
            );

            if (newRecord) {
                setLastRecordDetail(newRecord);
                setOpenLastRecordModal(true);

                // ✅ پاکسازی Flagها
                setLastSubmittedPayload(null);
                setIsListReadyToSearch(false);
            } else {
                // در صورت عدم یافتن (ممکن است بخواهید یک پیغام خطا بدهید یا دوباره صبر کنید)
                console.warn("New record not found in the refreshed list. Waiting for next sync or API delay.");
                // بهتر است Flag را در اینجا پاک نکنیم تا اگر API بعداً Sync شد، مجدداً چک شود.
            }
        } else if (isListReadyToSearch && !loadingData) {
            // اگر جستجو کامل شد و رکورد پیدا نشد و loading تمام شد، Flag را پاک کنیم.
            setIsListReadyToSearch(false);
        }
    }, [consignedCars, lastSubmittedPayload, isListReadyToSearch, loadingData]); // وابستگی‌ها

    const handleReturnSubmit = async () => {
        if (!rowToReturn || returnKilometer === '' || Number(returnKilometer) <= 0) {
            setReturnKilometerError(true);
            showAlert('Lütfen kilometre bilgisini doğru girin.', 'warning');
            return;
        }

        setReturnButtonLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setReturnButtonLoading(false); return; }

        let fileUrls: string[] | null = [];
        if (returnFiles.length > 0) {
            showAlert('Dosyalar yükleniyor...', 'info');
            // 💡 استفاده از تابع آپلود فایل موجود
            fileUrls = await uploadFiles(returnFiles, authToken, showAlert);
            if (fileUrls === null) { setReturnButtonLoading(false); return; }
        }

        // پیوست‌های موجود + پیوست‌های جدید آپلود شده
        const finalAttachments: AttachmentType[] = [...returnAttachments, ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])];

        const payload: ConsignedCarPayload = {
            date: returnDate ? returnDate.toISOString() : new Date().toISOString(),
            attachments: finalAttachments,
            description: returnDescription,
            kilometer: Number(returnKilometer),
            carWarhouseDetailId: Number(rowToReturn.carWarhouseDetail.id),
            personnelId: Number(rowToReturn.personnel.id),
            workhouseId: rowToReturn?.workhouse?.id ? Number(rowToReturn.workhouse.id) : null,
            consigned: false,
        };

        const url = `${server.baseurl}${server.warehouse}create-consigned-car`;

        try {
            const res = await axios.post(url, payload, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 201) {
                showAlert(`Araç başarıyla geri alındı! (Consigned: False)`, 'success');
                setLastSubmittedPayload(payload);
                // ✅ فعال‌سازی Flag جستجو
                setIsListReadyToSearch(true);

                handleCloseReturnModal(); // بستن Modal بازپس‌گیری اصلی
                fetchConsignedCars(selectedFilterCarDetail?.id || null);
                // fetchCarDetailsForForm(rowToReturn.carWarhouseDetail.carWarehouse.id || null); // به‌روزرسانی لیست موجودی برای فرم امانت
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde  için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
        finally { setReturnButtonLoading(false); }
    };

    const handleCloseReturnModal = () => {
        setOpenReturnModal(false);
        setRowToReturn(null);
        setReturnKilometerError(false);
        setReturnButtonLoading(false);
    };

    // const handleRegisterFuel = (row: ConsignedCarRecord) => {
    //     debugger

    //     const route = `/car-warehouse/list-car-fuels/${row.id}`;
    //     navigate(route);
    //     handleCloseMenu();
    // };

    const handleRegisterFuel = (row: ConsignedCarRecord) => {
        const route = `/car-warehouse/list-car-fuels/${row.id}`;

        // ارسال داده از طریق state به صفحه مقصد
        navigate(route, {
            state: {
                initialFuelType: row.carWarehouseDetail?.fuelType
            }
        });

        handleCloseMenu();
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ConsignedCarRecord) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };


    // const filteredConsignedCars = useMemo(() => {
    //     const list = consignedCars.filter(r => {
    //         const matchesSearch = r.carWarhouseDetail.plaque.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //             r.personnel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //             r.personnel.family.toLowerCase().includes(searchTerm.toLowerCase());
    //         const cDate = new Date(r.date);
    //         const inRange = (!startFilter || (cDate && cDate >= startFilter)) &&
    //             (!endFilter || (cDate && cDate <= endFilter));

    //         return matchesSearch && inRange;
    //     });
    //     return stableSort(list, getComparator(order, orderBy));
    // }, [consignedCars, searchTerm, startFilter, endFilter, order, orderBy]);

    const filteredConsignedCars = useMemo(() => {
        if (!consignedCars) return [];

        const list = consignedCars.filter(r => {
            if (!r) return false;

            // اصلاح نام: carWarehouseDetail
            // استفاده از ?. برای جلوگیری از خطا اگر workhouse نال بود
            const plaque = r.carWarehouseDetail?.plaque || "";
            const pName = r.personnel?.name || "";
            const pFamily = r.personnel?.family || "";

            const sTerm = searchTerm ? searchTerm.toLowerCase() : "";

            const matchesSearch =
                plaque.toLowerCase().includes(sTerm) ||
                pName.toLowerCase().includes(sTerm) ||
                pFamily.toLowerCase().includes(sTerm);

            let inRange = true;
            if (r.date) {
                const cDate = new Date(r.date);
                inRange = (!startFilter || (cDate && cDate >= startFilter)) &&
                    (!endFilter || (cDate && cDate <= endFilter));
            }

            return matchesSearch && inRange;
        });

        return stableSort(list, getComparator(order, orderBy));
    }, [consignedCars, searchTerm, startFilter, endFilter, order, orderBy]);


    const paginatedRows = useMemo(() => filteredConsignedCars.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredConsignedCars, page, rowsPerPage]);
    const isFilterActive = useMemo(() => !!searchTerm.trim() || startFilter !== null || endFilter !== null, [searchTerm, startFilter, endFilter]);
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleRequestSort = useCallback((property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); }, [order, orderBy]);
    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(Number(selectedRowForMenu.id));
        setDeleteName(`${selectedRowForMenu.carWarehouseDetail.plaque}
            
             `);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchConsignedCars(selectedFilterCarDetail?.id || null); };
    const handleOpenAttachmentsModal = (attachments: AttachmentType[]) => { setAttachmentsToView(attachments); setOpenAttachmentsModal(true); handleCloseMenu(); };
    const handleDownloadLinkClick = (fileUrl: string) => { if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; } const url = `${server.urldpwonload}${fileUrl}`; window.open(url, '_blank'); showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info'); };


    // باز کردن مودال ردیف
    const handleOpenRowDownloadModal = (row: ConsignedCarRecord) => {
        setSelectedRowForDownload(row);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    const handleDownloadRow = (format: 'pdf' | 'excel') => {
        if (!selectedRowForDownload) return;
        const title = `Araç Emanet Kaydı: ${selectedRowForDownload.carWarehouseDetail.plaque}`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler([selectedRowForDownload], title, showAlert, setLoadingData);
        setOpenRowDownloadModal(false);
        setSelectedRowForDownload(null);
    };

    const handleDownloadAllAction = (format: 'pdf' | 'excel') => {
        const title = `Tüm Emanet Araç Kayıtları`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(consignedCars, title, showAlert, setLoadingData);
        setOpenDownloadAllModal(false);
    };

    const handleDownloadFilteredAction = (format: 'pdf' | 'excel') => {
        const title = `Filtrelenmiş Emanet Araç Kayıtları`;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(filteredConsignedCars, title, showAlert, setLoadingData);
        setOpenDownloadFilteredModal(false);
    };
    const createSingleConsignmentPdf = (record: ConsignedCarRecord,
        showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void) => {

        const title = "ARAÇ EMANET KAYDI RAPORU";
        const doc = new jsPDF("p", "pt", "a4");
        const docAny = doc as any;

        try {
            docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');
        } catch (e) {
            showAlert('PDF font hatası! Rapor düzgün görünmeyebilir.', 'error');
        }

        const sideMargin = 20;
        let finalY = 70; // شروع محتوای اصلی بعد از هدر

        // 2. افزودن هدر
        addPdfHeaders(doc, title);

        // 3. اطلاعات پرسنل و خودرو (متن)
        // 3. اطلاعات پرسنل و خودرو (متن)
        const labelFontSize = 11; // سایز فونت عنوان
        const valueFontSize = 9;  // سایز فونت جواب

        // --- ردیف پرسنل ---
        doc.setFontSize(labelFontSize).setFont('NotoSans', 'bold');
        doc.text("Emanet Alan: ", sideMargin, finalY);

        doc.setFontSize(valueFontSize).setFont('NotoSans', 'normal');
        // جلو بردن X به اندازه تقریبی متن عنوان (حدود 70 واحد)
        doc.text(`${record.personnel.name} ${record.personnel.family} (${record.personnel.identityNumber})`, sideMargin + 75, finalY);
        finalY += 16;

        // --- ردیف پلاک ---
        doc.setFontSize(labelFontSize).setFont('NotoSans', 'bold');
        doc.text("Plaka: ", sideMargin, finalY);

        doc.setFontSize(valueFontSize).setFont('NotoSans', 'normal');
        doc.text(`${record.carWarehouseDetail.plaque}`, sideMargin + 75, finalY);
        finalY += 16;

        // --- ردیف برند و مدل ---
        doc.setFontSize(labelFontSize).setFont('NotoSans', 'bold');
        doc.text("Marka/Model: ", sideMargin, finalY);

        doc.setFontSize(valueFontSize).setFont('NotoSans', 'normal');
        doc.text(`${record.carWarehouseDetail.brand} / ${record.carWarehouseDetail.model}`, sideMargin + 75, finalY);
        finalY += 25;

        // 4. جدول جزئیات رکورد
        doc.setFontSize(14).setFont('NotoSans', 'normal');
        doc.text("Emanet İşlem Detayları", sideMargin, finalY);
        finalY += 10;

        const detailBody = [
            ["İşlem Tipi", record.consigned ? "ARAÇ EMANETİ (VERME)" : "ARAÇ GERİ ALMA"],
            ["İşlem Tarihi", formatDateDisplay(record.date)],
            ["Kilometre", record.kilometer.toLocaleString() + ' km'],
            ["Durum", record.consigned ? "Emanette" : "Geri Alındı"],
            ["Açıklama", record.description || "-"],
        ];

        autoTable((doc as any), {
            startY: finalY,
            head: [["Alan", "Değer"]],
            body: detailBody,
            theme: "grid",
            styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 5, overflow: 'linebreak' },
            headStyles: { fillColor: [200, 220, 250], textColor: [0, 0, 0] },
            columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 'auto' } },
            margin: { left: sideMargin, right: sideMargin },
            didDrawPage: (_data: any) => {
                addPdfFooters(doc);
            },
        });

        finalY = (docAny.lastAutoTable.finalY || finalY) + 30;

        // 5. کادر امضا (قبول/تحویل)
        doc.setFontSize(10);

        // خط اول امضا
        doc.text("Personel İmzası:", sideMargin, finalY);
        doc.line(sideMargin + 100, finalY, sideMargin + 250, finalY);

        // خط دوم امضا (کنترلر/انبار)
        doc.text("Yetkili / Depo Sorumlusu İmzası:", sideMargin + 300, finalY);
        doc.line(sideMargin + 450, finalY, sideMargin + 600, finalY);


        // 6. ذخیره فایل
        const fileName = `Emanet_Rapor_${record.carWarehouseDetail.plaque}_${formatDateDisplay(record.date)}.pdf`;
        doc.save(fileName);
        showAlert('Emanet raporu başarıyla oluşturuldu ve indiriliyor.', 'info');
    };


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

    const handleOpenLastRecordModalFromRow = (row: ConsignedCarRecord) => {
        setLastRecordDetail(row);
        setOpenLastRecordModal(true);
        handleCloseMenu();
    };

    const handleOpenAttachModal = (row: ConsignedCarRecord) => {
        setRowToUpdateAttachments(row);
        setAttachCurrentAttachments(row.attachments); // بارگذاری پیوست‌های فعلی
        setAttachFiles([]); // ریست کردن فایل‌های جدید
        setAttachError(false);
        setOpenAttachModal(true);
        handleCloseMenu();
    };

    // تابع Handler برای بستن مودال
    const handleCloseAttachModal = () => {
        setOpenAttachModal(false);
        setRowToUpdateAttachments(null);
        setAttachCurrentAttachments([]);
        setAttachFiles([]);
        setAttachError(false);
    };

    const handleAttachmentUpdate = async () => {
        if (!rowToUpdateAttachments) return;
        setAttachButtonLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setAttachButtonLoading(false); return; }

        let fileUrls: string[] | null = [];
        if (attachFiles.length > 0) {
            showAlert('Dosyalar yükleniyor...', 'info');
            fileUrls = await uploadFiles(attachFiles, authToken, showAlert);
            if (fileUrls === null) { setAttachButtonLoading(false); return; }
        }

        const finalAttachments: AttachmentType[] = [
            ...attachCurrentAttachments,
            ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])
        ];

        if (finalAttachments.length === 0 && attachFiles.length === 0 && rowToUpdateAttachments.attachments.length > 0) {
            setAttachError(true);
            showAlert('En az bir ek dosya bırakın veya yeni dosya ekleyin.', 'warning');
            setAttachButtonLoading(false);
            return;
        }

        const payloadForUpdate = {
            id: Number(rowToUpdateAttachments.id),
            date: rowToUpdateAttachments.date,
            description: rowToUpdateAttachments.description,
            kilometer: rowToUpdateAttachments.kilometer,
            attachments: finalAttachments,

        };
        const updateUrl = `${server.baseurl}${server.warehouse}update-consigned-car`;

        try {
            const res = await axios.put(updateUrl, payloadForUpdate, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                showAlert('Ekler başarıyla güncellendi.', 'success');
                fetchConsignedCars(selectedFilterCarDetail?.id || null); // رفرش جدول
                handleCloseAttachModal();
            } else {
                showAlert(res.data.message || 'Ekler güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setAttachButtonLoading(false);
        }
    };

    const decodeLatin1ToUtf8 = (encodedString: string): string => {
        try {
            const bytes = new Uint8Array(encodedString.length);
            for (let i = 0; i < encodedString.length; i++) {
                bytes[i] = encodedString.charCodeAt(i);
            }
            const decoder = new TextDecoder('utf-8');
            return decoder.decode(bytes);

        } catch (e) {
            console.error("Decoding error:", e);
            return encodedString;
        }
    };

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={3} spacing={2} flexWrap="wrap">
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                        {isReturnMode ? 'Araç Geri Alma Kaydı' : 'Araç Emanet Kayıtları'}
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission &&
                            (<BlinkingButton variant="contained" color="primary"
                                onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} fullWidth={false}
                            >
                                Yeni Emanet Kaydı Ekle</BlinkingButton>)}
                        {isFormVisible && (<Button variant="contained" color="error" onClick={resetForm}
                            disabled={loadingButton} fullWidth={false} startIcon={<IconX size={20} />}>Gizle</Button>)}
                    </Stack>
                </Stack>
                {isFormVisible && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{isReturnMode ? 'Araç Geri Alma Formu (Yeni Kayıt)' : 'Yeni Araç Emanet Formu'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel>Şantiye</CustomFormLabel>
                                <Autocomplete
                                    size="small"
                                    options={workhousesList}
                                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={selectedWorkhouse}
                                    onChange={(_, newValue) => { setSelectedWorkhouse(newValue); setWorkhouseError(false); }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Şantiye Seçin"
                                            error={workhouseError}
                                            helperText={workhouseError ? 'Zorunlu alan.' : ''}
                                        />
                                    )}
                                    disabled={isReturnMode || loadingButton}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Araç Depo</CustomFormLabel>
                                <Autocomplete size="small"
                                    options={warehousesList} getOptionLabel={(option) => `${option.name} (${option.code})`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedWarehouse} onChange={(_, newValue) => { setSelectedWarehouse(newValue); setWarehouseError(false); }} renderInput={(params) => (<TextField {...params} label="Araç Depo Seçin" error={warehouseError} helperText={warehouseError ? 'Zorunlu alan.' : ''} />)} disabled={isReturnMode || loadingButton} /></Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Emanet Edilecek Araç</CustomFormLabel>
                                <Autocomplete size="small" options={carDetailsList} getOptionLabel={(option) => `${option.brand} - ${option.plaque}`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedCarDetail} onChange={(_, newValue) => { setSelectedCarDetail(newValue); setCarDetailError(false); }} renderInput={(params) => (<TextField {...params} label="Araç Seçin" error={carDetailError} helperText={carDetailError ? 'Zorunlu alan.' : ''} />)} disabled={!selectedWarehouse || loadingButton || isReturnMode} /></Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>{isReturnMode ? 'Geri Alan Personel' : 'Emanet Alan Personel'}</CustomFormLabel>
                                <Autocomplete size="small" options={personnelList} getOptionLabel={(option) => `${option.name} ${option.family}`} isOptionEqualToValue={(option, value) => option.id === value.id} value={selectedPersonnel} onChange={(_, newValue) => { setSelectedPersonnel(newValue); setPersonnelError(false); }} renderInput={(params) => (<TextField {...params} label="Personel Seçin" error={personnelError} helperText={personnelError ? 'Zorunlu alan.' : ''} />)} disabled={loadingButton || isReturnMode} /></Grid>
                            <Grid item xs={12} sm={6} md={4}><CustomFormLabel required>Tarih</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker label="Tarih" value={date} onChange={(v) => setDate(v)} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} disabled={loadingButton} /></LocalizationProvider></Grid>
                            <Grid item xs={12} sm={6} md={4}><CustomFormLabel required>Kilometre</CustomFormLabel><TextField placeholder="Kilometre" type="number" size="small" fullWidth value={kilometer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setKilometer(Number(e.target.value)); setKilometerError(false); }} error={kilometerError} helperText={kilometerError ? 'Zorunlu alan.' : ''} disabled={loadingButton} /></Grid>
                            <Grid item xs={12} sm={12} md={12}><CustomFormLabel>Açıklama</CustomFormLabel><TextField placeholder="Detaylı Açıklama" size="small" fullWidth value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} multiline rows={2} disabled={loadingButton} /></Grid>
                            <Grid item xs={12}><CustomFormLabel>Ekler (Resim/PDF/Excel)</CustomFormLabel><ConsignmentFileUpload files={selectedFiles} setFiles={setSelectedFiles} error={false} currentAttachments={currentAttachments} setCurrentAttachments={setCurrentAttachments} /></Grid>
                            <Grid item xs={12}><Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button variant="contained" color={isReturnMode ? "warning" : "success"}
                                    onClick={handleSubmit}
                                    disabled={loadingButton || !selectedCarDetail || (isReturnMode && !originalRecord)}
                                    size="small">{loadingButton ? <><CircularProgress size={20}
                                        color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> :
                                        isReturnMode ? 'Geri Almayı Kaydet' : 'Emanet Kaydet '}</Button>

                                <Button variant="outlined" color="secondary"
                                    onClick={resetForm} size="small">İptal Et</Button></Stack></Grid>
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

                        {/* 4. Tarih Başلنگ (فیلتر تاریخ شروع) ⭐️ */}
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
                                    <StyledTableCell><Typography variant="h6">Şantiye</Typography></StyledTableCell> {/* ⭐ NEW COLUMN HEADER ⭐ */}
                                    <StyledTableCell><Typography variant="h6">Personel</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'kilometer'} direction={orderBy === 'kilometer' ? order : 'asc'} onClick={() => handleRequestSort('kilometer')}><Typography variant="h6">Kilometre</Typography></TableSortLabel></StyledTableCell>

                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ekler</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'consigned'} direction={orderBy === 'consigned' ? order : 'asc'} onClick={() => handleRequestSort('consigned')}><Typography variant="h6">Durum</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6"></Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>{formatDateDisplay(row.date)}</StyledTableCell>
                                            {/* <StyledTableCell>{row.carWarhouseDetail.plaque || '-'}</StyledTableCell> */}
                                            <StyledTableCell>{row.carWarehouseDetail?.plaque || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.workhouse?.name || '-'}</StyledTableCell>

                                            <StyledTableCell>{`${row.personnel.name} ${row.personnel.family}` || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.kilometer.toLocaleString() || '-'}</StyledTableCell>
                                            {/* <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                                <Box sx={{
                                                    maxHeight: '5em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                }}>
                                                    <div dangerouslySetInnerHTML={{ __html: row.description }} />
                                                </Box>
                                                {row.description.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }}
                                                            onClick={() => { handleOpenDescriptionModal(row.description); }}>Açıklamanı Oku</Button>
                                                    </CustomTooltip>
                                                )}
                                            </StyledTableCell> */}
                                            <StyledTableCell sx={{ maxWidth: 150 }}>
                                                {row.description && row.description.trim().length > 0 ? (
                                                    // حالت اول: اگر توضیحات وجود داشت (خالی نبود)
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button
                                                            variant="text"
                                                            style={{ fontSize: "10px", padding: "2px 5px" }}
                                                            onClick={() => handleOpenDescriptionModal(row.description)}
                                                        >
                                                            Açıklamanı Oku
                                                        </Button>
                                                    </CustomTooltip>
                                                ) : (
                                                    // حالت دوم: اگر توضیحات نال یا خالی بود
                                                    <Typography variant="body2" align="center">
                                                        -
                                                    </Typography>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell><IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary" size="small"></Chip></IconButton></StyledTableCell>
                                            <StyledTableCell><Chip label={row.consigned ? 'Emanette' : 'Geri Alındı'} color={row.consigned ? 'error' : 'success'} size="small" /></StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    {row.consigned && hasCreatePermission && (<MuiMenuItem onClick={() => handleReturnCar(row)}><ListItemIcon><DirectionsCarFilledRoundedIcon fontSize="small" /></ListItemIcon> Geri Al</MuiMenuItem>)}

                                                    {hasCreatePermission && (
                                                        <MuiMenuItem onClick={() => handleRegisterFuel(row)}>
                                                            <ListItemIcon><IconGasStation fontSize="small" /></ListItemIcon>
                                                            Araç Yakıtları Kayıt Et
                                                        </MuiMenuItem>
                                                    )}
                                                    {hasCreatePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kayıt eklerini (Resim/PDF/Excel) ekleyin veya güncelleyin." : ""}>
                                                            <MuiMenuItem onClick={() => handleOpenAttachModal(selectedRowForMenu!)}>
                                                                <ListItemIcon><IconBox width={18} /></ListItemIcon>
                                                                Ek Ekle/Düzenle
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasDeletePermission && (<MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>)}

                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
                                                            <ListItemIcon><IconFileDownload width={18} />
                                                            </ListItemIcon>Bu satırı indir</MuiMenuItem>
                                                    )}
                                                    {hasDownloadPermission && selectedRowForMenu && (
                                                        <CustomTooltip
                                                            placement="left"
                                                            // عنوان Tooltip را برای وضوح بیشتر اصلاح می‌کنیم
                                                            title={isTooltipGloballyEnabled ? "İşlem detaylarını gör ve PDF raporunu indir" : ""}
                                                        >
                                                            <MuiMenuItem onClick={() => handleOpenLastRecordModalFromRow(selectedRowForMenu)}>
                                                                <ListItemIcon><IconFileText width={18} /></ListItemIcon>
                                                                İşlem Raporu (PDF)
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
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
                <DialogContent dividers>
                    {attachmentsToView.length > 0 ? (
                        <Stack spacing={1}>
                            {attachmentsToView.map((attachment, index) => {
                                const rawFileName = attachment.fileUrl.split('/').pop() || `Dosya ${index + 1}`;
                                let finalFileName = rawFileName;
                                try {
                                    finalFileName = decodeURIComponent(finalFileName);
                                } catch (e) {
                                }
                                finalFileName = decodeLatin1ToUtf8(finalFileName);
                                finalFileName = finalFileName.replace(/%20/g, ' ');
                                return (
                                    <Button
                                        key={index}
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => handleDownloadLinkClick(attachment.fileUrl)}
                                        sx={{ mt: 1 }}
                                    >
                                        {finalFileName || `Dosya ${index + 1}`}
                                    </Button>
                                );
                            })}
                        </Stack>
                    ) : (
                        <DialogContentText>Bu kayda ait ek dosya bulunmamaktadır.</DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAttachmentsModal(false)} color="primary" variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>

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

            <Dialog open={openDescriptionModal} onClose={handleCloseDescriptionModal} maxWidth="md" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* --- NEW: Modal for Returning Car (Geri Al) --- */}
            <Dialog open={openReturnModal} onClose={handleCloseReturnModal} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'warning.light', color: 'warning.dark' }}>
                    Araç Geri Alma Onayı (Geri Al)
                </DialogTitle>
                <DialogContent dividers>
                    {rowToReturn && (
                        <Stack spacing={2}>
                            <Alert severity="info">
                                {rowToReturn.carWarehouseDetail.plaque} plakalı araç {rowToReturn.personnel.name} {rowToReturn.personnel.family} adına emanetten geri alınacaktır.
                            </Alert>

                            <Grid container spacing={1}>
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel required>Geri Alma Tarihi</CustomFormLabel>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                        <DatePicker
                                            label="Tarih"
                                            value={returnDate}
                                            onChange={(v) => setReturnDate(v)}
                                            inputFormat="dd/MM/yyyy"
                                            renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                            disabled={returnButtonLoading}
                                        />
                                    </LocalizationProvider>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <CustomFormLabel required>Kilometre (Mevcut)</CustomFormLabel>
                                    <TextField
                                        placeholder={`Önceki: ${rowToReturn.kilometer.toLocaleString()}`}
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={returnKilometer}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setReturnKilometer(Number(e.target.value));
                                            setReturnKilometerError(false);
                                        }}
                                        error={returnKilometerError}
                                        helperText={returnKilometerError ? 'Kilometre zorunludur ve 0\'dan büyük olmalıdır.' : ''}
                                        disabled={returnButtonLoading}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <CustomFormLabel>Açıklama</CustomFormLabel>
                                    <TextField
                                        placeholder="Geri alma ile ilgili açıklama"
                                        size="small"
                                        fullWidth
                                        value={returnDescription}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnDescription(e.target.value)}
                                        multiline rows={2}
                                        disabled={returnButtonLoading}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <CustomFormLabel>Ekler (Resim/PDF/Excel)</CustomFormLabel>
                                    <ConsignmentFileUpload
                                        files={returnFiles}
                                        setFiles={setReturnFiles}
                                        error={false}
                                        currentAttachments={returnAttachments}
                                        setCurrentAttachments={setReturnAttachments}
                                    />
                                </Grid>
                            </Grid>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseReturnModal} color="secondary" disabled={returnButtonLoading}>İptal</Button>
                    <Button
                        onClick={handleReturnSubmit}
                        color="warning"
                        variant="contained"
                        disabled={returnButtonLoading || !returnDate || !returnKilometer || Number(returnKilometer) <= 0}
                    >
                        {returnButtonLoading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : "Geri Almayı Kaydet"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- Modal 4: Son Kayıt Detayları (Yeni Emanet/Geri Alma) --- */}
            <Dialog open={openLastRecordModal} onClose={() => setOpenLastRecordModal(false)} maxWidth="md" fullWidth>
                {/* 💡 عنوان و رنگ Modal بر اساس وضعیت رکورد */}
                <DialogTitle sx={{
                    backgroundColor: lastRecordDetail?.consigned === false ? 'warning.main' : 'success.main',
                    color: 'white'
                }}>
                    {lastRecordDetail?.consigned === false ?
                        'Araç Geri Alma Kaydı Başarıyla Oluşturuldu!' :
                        'Yeni Araç Emanet Kaydı Başarıyla Oluşturuldu!'}
                </DialogTitle>
                <DialogContent dividers>
                    {lastRecordDetail ? (
                        <Stack spacing={2}>
                            {/* ... (نمایش جزئیات رکورد) ... */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Plaka:</Typography></Grid>
                                <Grid item xs={12} sm={8}><Typography>{lastRecordDetail.carWarehouseDetail.plaque}</Typography></Grid>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Personel:</Typography></Grid>
                                <Grid item xs={12} sm={8}><Typography>{lastRecordDetail.personnel.name} {lastRecordDetail.personnel.family}</Typography></Grid>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Kilometre:</Typography></Grid>
                                <Grid item xs={12} sm={8}><Typography>{lastRecordDetail.kilometer.toLocaleString()}</Typography></Grid>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Tarih:</Typography></Grid>
                                <Grid item xs={12} sm={8}><Typography>{formatDateDisplay(lastRecordDetail.date)}</Typography></Grid>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Durum:</Typography></Grid>
                                <Grid item xs={12} sm={8}>
                                    <Chip
                                        label={lastRecordDetail.consigned ? "Emanette (Yeni Kayıt)" : "Geri Alındı"}
                                        color={lastRecordDetail.consigned ? "success" : "warning"}
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                            <Alert severity={lastRecordDetail.consigned ? "success" : "warning"} sx={{ mt: 2 }}>
                                {lastRecordDetail.consigned ?
                                    'Emanet işlemi tamamlanmıştır.' :
                                    'Araç başarıyla envantere geri alınmıştır.'}
                            </Alert>
                        </Stack>
                    ) : (
                        <Box display="flex" justifyContent="center"><CircularProgress /></Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {lastRecordDetail && (
                        <Button
                            // ✅ دکمه دانلود در کنار دکمه بستن
                            onClick={() => createSingleConsignmentPdf(lastRecordDetail, showAlert)}
                            color="primary"
                            variant="contained"
                            startIcon={<IconFileDownload />}
                            sx={{ mr: 1 }}
                        >
                            Raporu İndir
                        </Button>
                    )}
                    <Button onClick={() => setOpenLastRecordModal(false)} color="secondary" variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* --- NEW: Attachment Edit Modal --- */}
            <Dialog open={openAttachModal} onClose={attachButtonLoading ? undefined : handleCloseAttachModal} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Ek Ekle/Düzenle: {rowToUpdateAttachments?.carWarehouseDetail?.plaque || 'Kayıt'}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Typography variant="body1">
                            Lütfen bu kayda ait yeni ekleri seçin veya mevcut ekleri yönetin.
                        </Typography>
                        <ConsignmentFileUpload
                            files={attachFiles}
                            setFiles={setAttachFiles}
                            error={attachError}
                            currentAttachments={attachCurrentAttachments}
                            setCurrentAttachments={setAttachCurrentAttachments}
                        />
                        {attachError && <Alert severity="error">Lütfen en az bir ek dosya ekleyin veya hatayı giderin.</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAttachModal} color="secondary" disabled={attachButtonLoading}>İptal</Button>
                    <Button
                        onClick={handleAttachmentUpdate}
                        color="primary"
                        variant="contained"
                        disabled={attachButtonLoading}
                        startIcon={attachButtonLoading ? <CircularProgress size={20} color="inherit" /> : <IconFileDownload />}
                    >
                        {attachButtonLoading ? 'Güncelleniyor...' : 'Ekleri Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListConsignedCarwarehouse;