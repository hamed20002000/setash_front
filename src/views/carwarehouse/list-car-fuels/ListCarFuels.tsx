import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, Dialog, DialogTitle, DialogContent,
    DialogActions, DialogContentText, TableSortLabel, MenuItem as MuiMenuItem,
    Select, FormControl, InputLabel,
    Divider,
} from '@mui/material';

import {
    IconDots, IconTrash, IconSearch, IconFileDownload, IconX, IconEdit,
    IconFileSpreadsheet, IconFileText, IconBox, IconLink, IconGasStation,
    IconArrowRight,
    IconEye
} from '@tabler/icons-react';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { keyframes, styled } from '@mui/material/styles';

import axios from 'axios';
import server from '../../../assets/address.json';
import { useAuth } from 'src/context/AuthContext';
import DeleteCarFuels from './DeleteCarFuels';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import BlankCard from "src/components/shared/BlankCard";
import { CustomTooltip, useTooltip } from "src/context/TooltipContext";

const FUEL_TYPES = [
    { value: 'Benzin', label: 'Benzin' },
    { value: 'Dizel', label: 'Dizel' },
    { value: 'LPG', label: 'LPG' },
    { value: 'Elektrik', label: 'Elektrik' },
];


interface AttachmentType { fileUrl: string; }

interface CarFuelRecord {
    id: number | string;
    date: string;
    fuelType: string;
    amount: number;
    description: string;
    fee: number;
    totatPrice: number;
    attachment: AttachmentType[];
    consignedCarId: number | string;
    createAt: string;
}

interface CarFuelPayload {
    id?: number | string;
    date: string;
    fuelType: string;
    amount: number;
    description: string;
    fee: number;
    totatPrice: number;
    attachments: AttachmentType[];
    consignedCarId: number | string;
}
interface FuelTotals {
    [key: string]: {
        amount: number;
        fee: number;
        totalPrice: number;
    };
}

type SortableKeys = 'date' | 'amount' | 'totatPrice' | 'createAt';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
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

const FuelFileUpload: React.FC<{
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
            {error && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Lütfen dosya seçin veya hataları düzلتین.</Typography>}
        </Box>
    );
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


const exportToPdf = (data: CarFuelRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => {
    if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
    setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

    const doc = new jsPDF();
    const docAny = doc as any;

    const columns = ['Tarih', 'Yakıt Tipi', 'Miktar (Litre/kWh)', 'Birim Fiyat', 'Toplam Fiyat', 'Açıklama'];
    const body = data.map(r => [
        formatDateDisplay(r.date || null),
        FUEL_TYPES.find(f => f.value === r.fuelType)?.label || r.fuelType || '-',
        r.amount.toLocaleString() || '-',
        r.fee.toLocaleString() || '-',
        r.totatPrice.toLocaleString() || '-',
        r.description || '-',
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

        const fuelTotals: FuelTotals = {};
        FUEL_TYPES.forEach(ft => { fuelTotals[ft.value] = { amount: 0, fee: 0, totalPrice: 0 }; });
        data.forEach(record => {
            const type = record.fuelType;
            if (fuelTotals[type]) {
                fuelTotals[type].amount += record.amount;
                fuelTotals[type].fee += record.fee;
                fuelTotals[type].totalPrice += record.totatPrice;
            }
        });

        let finalY = docAny.lastAutoTable.finalY + 5;
        doc.setFontSize(11);
        doc.text("Yakıt Türüne Göre Toplam Özet:", 10, finalY);

        const summaryRows: any[] = [];
        FUEL_TYPES.forEach(ft => {
            const totals = fuelTotals[ft.value];
            if (totals && totals.totalPrice > 0) {
                summaryRows.push([
                    ft.label,
                    `${totals.amount.toLocaleString()} ${ft.value === 'ELECTRIC' ? 'kWh' : 'Litre'}`,
                    `${totals.fee.toLocaleString()} TL`,
                    `${totals.totalPrice.toLocaleString()} TL`
                ]);
            }
        });

        if (summaryRows.length > 0) {
            autoTable(docAny, {
                startY: finalY + 5,
                head: [['Yakıt Tipi', 'Toplam Miktar', 'Toplam Birim Fiyat', 'Toplam Fiyat']],
                body: summaryRows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9 },
                headStyles: { font: 'NotoSans', fillColor: [200, 200, 200], textColor: [0, 0, 0] },
                margin: { left: 10, right: 10 }
            });
        }
        const fileName = `${title.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
    } catch (error) {
        console.error("PDF dışا aktarılırken hata:", error);
        showAlert('PDF dışا aktarılırken bir hata oluştu.', 'error');
    } finally {
        setLoadingData(false);
    }
};

const exportToExcel = (data: CarFuelRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => {
    if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
    setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

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

    try {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title.substring(0, 31));

        const columns = ['Tarih', 'Yakıt Tipi', 'Miktar (Litre/kWh)', 'Birim Fiyat', 'Toplam Fiyat', 'Açıklama'];
        addExcelHeader(worksheet, title, columns.length);

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        data.forEach(r => {
            worksheet.addRow([
                formatDateDisplay(r.date || null),
                FUEL_TYPES.find(f => f.value === r.fuelType)?.label || r.fuelType || '-',
                r.amount.toLocaleString() || '-',
                r.fee.toLocaleString() || '-',
                r.totatPrice.toLocaleString() || '-',
                r.description || '-',
            ]);
        });
        const fuelTotals: FuelTotals = {};
        FUEL_TYPES.forEach(ft => { fuelTotals[ft.value] = { amount: 0, fee: 0, totalPrice: 0 }; });
        data.forEach(record => {
            const type = record.fuelType;
            if (fuelTotals[type]) {
                fuelTotals[type].amount += record.amount;
                fuelTotals[type].fee += record.fee;
                fuelTotals[type].totalPrice += record.totatPrice;
            }
        });

        let lastRowNumber = worksheet.lastRow!.number;
        worksheet.addRow([]);
        lastRowNumber++;

        const summaryTitleRow = worksheet.addRow(['Yakıt Türüne Göre Toplam Özet']);
        summaryTitleRow.font = { name: 'NotoSans', size: 12, bold: true };
        worksheet.mergeCells(`A${summaryTitleRow.number}:${String.fromCharCode(65 + columns.length - 1)}${summaryTitleRow.number}`);

        const summaryHeaders = ['Yakıt Tipi', 'Toplam Miktar', 'Toplam Birim Fiyat', 'Toplam Fiyat'];
        const summaryHeaderRow = worksheet.addRow(summaryHeaders);
        summaryHeaderRow.font = { name: 'NotoSans', bold: true };
        summaryHeaderRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        FUEL_TYPES.forEach(ft => {
            const totals = fuelTotals[ft.value];
            if (totals && totals.totalPrice > 0) {
                const dataRow = worksheet.addRow([
                    ft.label,
                    totals.amount,
                    totals.fee,
                    totals.totalPrice
                ]);
                dataRow.getCell(2).numFmt = `${ft.value === 'ELECTRIC' ? '#,##0.00 "kWh"' : '#,##0.00 "Litre"'}`;
                dataRow.getCell(3).numFmt = '#,##0.00 "TL"';
                dataRow.getCell(4).numFmt = '#,##0.00 "TL"';
            }
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

const handleDownloadPdf = (data: CarFuelRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) =>
    exportToPdf(data, title, showAlert, setLoadingData);
const handleDownloadExcel = (data: CarFuelRecord[], title: string, showAlert: (m: string, s: any) => void, setLoadingData: (l: boolean) => void) => exportToExcel(data, title, showAlert, setLoadingData);


const ListCarFuels: React.FC = () => {
    const { allowedOperations } = useAuth();

    const navigate = useNavigate();
    const { consignedCarId } = useParams<{ consignedCarId: string }>();

    const location = useLocation();
    const state = location.state as { initialFuelType?: string } | null;
    const transferredFuelType = state?.initialFuelType;

    const [fuelType, setFuelType] = useState<string>(transferredFuelType || 'GASOLINE');

    const { isTooltipGloballyEnabled } = useTooltip();


    const nameInputRef = useRef<HTMLInputElement>(null);
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "Düzenlemek"), [allowedOperations]);

    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);


    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState<number | string | null>(null);

    const [date, setDate] = useState<Date | null>(new Date());
    const [amount, setAmount] = useState<number | ''>('');
    const [fee, setFee] = useState<number | ''>('');
    const [totalPrice, setTotalPrice] = useState<number | ''>('');
    const [description, setDescription] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]);

    const [amountError, setAmountError] = useState(false);
    const [feeError, setFeeError] = useState(false);
    const [totalPriceError, setTotalPriceError] = useState(false);
    const [fuelTypeError, setFuelTypeError] = useState(false);

    const [fuelRecords, setFuelRecords] = useState<CarFuelRecord[]>([]);
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
    const [deleteId, setDeleteId] = useState<number | string | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CarFuelRecord | null>(null);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [attachmentsToView, setAttachmentsToView] = useState<AttachmentType[]>([]);


    const [isBlinking, setIsBlinking] = useState(true);


    const [searchTerm, setSearchTerm] = useState('');
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [selectedRowForDetails, setSelectedRowForDetails] = useState<CarFuelRecord | null>(null);

    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<CarFuelRecord | null>(null);



    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => { let timer: NodeJS.Timeout; if (alertMessage) timer = setTimeout(() => clearAlert(), 5000); return () => { if (timer) clearTimeout(timer); }; }, [alertMessage]);


    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        if (transferredFuelType) {
            setFuelType(transferredFuelType);
        }
    }, [transferredFuelType]);


    const fetchFuelRecords = useCallback(async () => {
        if (!consignedCarId) { setLoadingData(false); return; }
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }

        try {
            const url = `${server.baseurl}${server.warehouse}get-car-fuels/${consignedCarId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {

                const cleanedRecords = (res.data.data as any[]).map(record => ({
                    ...record,
                    fee: parseFloat(String(record.fee).replace(/[^0-9.]/g, '')),
                    totatPrice: parseFloat(String(record.totatPrice).replace(/[^0-9.]/g, '')),
                }));
                setFuelRecords(cleanedRecords as CarFuelRecord[]);
            } else { showAlert(res.data.message || 'Yakıt kayıtları yüklenemedi.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }

        finally { setLoadingData(false); }
    }, [navigate, showAlert, consignedCarId]);







    useEffect(() => {
        fetchFuelRecords();
    }, [fetchFuelRecords]);

    useEffect(() => {
        const calculatedTotal = Number(amount || 0) * Number(fee || 0);
        setTotalPrice(calculatedTotal > 0 ? calculatedTotal : '');

        if (calculatedTotal > 0) setTotalPriceError(false);
    }, [amount, fee]);


    const validateForm = (): boolean => {
        let ok = true;
        setAmountError(false); setFeeError(false); setTotalPriceError(false); setFuelTypeError(false);

        const checkPositive = (val: number | '', setError: (e: boolean) => void) => {
            if (val === '' || Number(val) <= 0) {
                setError(true);
                ok = false;
            }
        };

        if (!fuelType) { setFuelTypeError(true); ok = false; }
        checkPositive(amount, setAmountError);
        checkPositive(fee, setFeeError);
        checkPositive(totalPrice, setTotalPriceError);

        if (!ok) { showAlert('Lütfen tüm zorunlu alanları doldurun ve negatif olmayan (sıfırdan büyük) değerler girin.', 'warning'); }
        return ok;
    };

    const resetForm = useCallback(() => {
        setIsEditMode(false);
        setEditRecordId(null);
        setDate(new Date());
        setFuelType('GASOLINE');
        setAmount('');
        setFee('');
        setTotalPrice('');
        setDescription('');
        setSelectedFiles([]);
        setCurrentAttachments([]);
        setAmountError(false); setFeeError(false); setTotalPriceError(false); setFuelTypeError(false);
        setIsFormVisible(false);
    }, []);

    const handleEdit = (row: CarFuelRecord) => {
        setEditRecordId(row.id);
        setIsEditMode(true);
        setDate(new Date(row.date));
        setFuelType(row.fuelType);
        setAmount(row.amount);
        setFee(row.fee);
        setTotalPrice(row.totatPrice);
        setDescription(row.description);
        setCurrentAttachments(row.attachment);
        setSelectedFiles([]);

        setIsFormVisible(true);
        handleCloseMenu();

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);
    };

    const handleSubmit = async () => {
        if (!validateForm() || !consignedCarId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setLoadingButton(false); return; }

        let fileUrls: string[] | null = [];
        if (selectedFiles.length > 0) {
            showAlert('Dosyalar yükleniyor...', 'info');
            fileUrls = await uploadFiles(selectedFiles, authToken, showAlert);
            if (fileUrls === null) { setLoadingButton(false); return; }
        }

        const finalAttachments: AttachmentType[] = [
            ...(currentAttachments || []),
            ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])
        ];

        const isEditing = editRecordId !== null;

        const payload: CarFuelPayload = {
            id: isEditing ? Number(editRecordId) : undefined,
            date: date ? date.toISOString() : new Date().toISOString(),
            fuelType: fuelType,
            amount: Number(amount),
            description: description,
            fee: Number(fee),
            totatPrice: Number(totalPrice),
            attachments: finalAttachments,
            consignedCarId: Number(consignedCarId),
        };

        const url = isEditing
            ? `${server.baseurl}${server.warehouse}update-car-fuel`
            : `${server.baseurl}${server.warehouse}create-car-fuel`;

        const method = isEditing ? 'put' : 'post';

        try {
            const res = await axios.request({
                method,
                url,
                data: payload,
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });

            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(`Yakıt kaydı başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}!`, 'success');
                resetForm();
                fetchFuelRecords();
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CarFuelRecord) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setDeleteName(`${formatDateDisplay(selectedRowForMenu.date)} | ${selectedRowForMenu.totatPrice.toLocaleString()} TL`);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setDeleteId(null);
        setDeleteName('');
        fetchFuelRecords();
    };

    const handleOpenAttachmentsModal = (attachments: AttachmentType[]) => { setAttachmentsToView(attachments); setOpenAttachmentsModal(true); handleCloseMenu(); };
    const handleDownloadLinkClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    const filteredFuelRecords = useMemo(() => {
        const list = fuelRecords.filter(r => {
            const matchesSearch = r.fuelType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.description.toLowerCase().includes(searchTerm.toLowerCase());

            const cDate = new Date(r.date);
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) &&
                (!endFilter || (cDate && cDate <= endFilter));

            return matchesSearch && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [fuelRecords, searchTerm, startFilter, endFilter, order, orderBy]);

    const paginatedRows = useMemo(() => filteredFuelRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredFuelRecords, page, rowsPerPage]);
    const isFilterActive = useMemo(() => !!searchTerm.trim() || startFilter !== null || endFilter !== null, [searchTerm, startFilter, endFilter]);

    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleRequestSort = useCallback((property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); }, [order, orderBy]);

    const handleDownloadAllAction = (format: 'pdf' | 'excel') => {
        const title = `Tüm Yakıt Kayıtları `;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(fuelRecords, title, showAlert, setLoadingData);
        setOpenDownloadAllModal(false);
    };

    const handleDownloadFilteredAction = (format: 'pdf' | 'excel') => {
        const title = `Filtrelenmiş Yakıt Kayıtları `;
        const handler = format === 'pdf' ? handleDownloadPdf : handleDownloadExcel;
        handler(filteredFuelRecords, title, showAlert, setLoadingData);
        setOpenDownloadFilteredModal(false);
    };

    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

    const handleDownloadSingleRow = (row: CarFuelRecord, format: 'pdf' | 'excel') => {
        const title = `Yakıt Kaydı - ${formatDateDisplay(row.date)}`;
        if (format === 'pdf') {
            exportToPdf([row], title, showAlert, setLoadingData);
        } else {
            exportToExcel([row], title, showAlert, setLoadingData);
        }
    };

    const handleOpenRowDownloadMenu = (row: CarFuelRecord) => {
        setSelectedRowForDownload(row);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };

    const handleDownloadRowAction = (format: 'pdf' | 'excel') => {
        if (!selectedRowForDownload) return;

        const title = `Araç Yakıt Kaydı - ${formatDateDisplay(selectedRowForDownload.date)}`;
        const handler = format === 'pdf' ? exportToPdf : exportToExcel;

        handler([selectedRowForDownload], title, showAlert, setLoadingData);

        setOpenRowDownloadModal(false);
        setSelectedRowForDownload(null);
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
                        Yakıt Kayıtları
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <BlinkingButton
                                isBlinking={isBlinking}
                                fullWidth={false}

                                variant="contained" color="primary"
                                onClick={() => {
                                    setIsFormVisible(true);
                                    setIsEditMode(false);
                                    setEditRecordId(null);
                                }}>
                                Yeni Yakıt Kaydı Ekle
                            </BlinkingButton>
                        )}
                        {isFormVisible && (<Button variant="contained" color="error" onClick={resetForm} disabled={loadingButton} fullWidth={false} startIcon={<IconX size={20} />}>Gizle</Button>)}


                        <CustomTooltip title={isTooltipGloballyEnabled ? "Geri dön" : ""}>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => navigate(-1)}
                                endIcon={<IconArrowRight size={20} />}
                                fullWidth={false}
                            >
                                Geri Dön
                            </Button>
                        </CustomTooltip>
                    </Stack>
                </Stack>

                {isFormVisible && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{isEditMode ? 'Yakıt Kaydını Düzenle' : 'Yeni Yakıt Kayıt Formu'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Tarih</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker label="Tarih"

                                        inputRef={nameInputRef}
                                        value={date} onChange={(v) => setDate(v)} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} disabled={loadingButton} />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Yakıt Tipi</CustomFormLabel>
                                <FormControl fullWidth size="small" error={fuelTypeError}>
                                    <InputLabel>Yakıt Tipi</InputLabel>
                                    <Select
                                        label="Yakıt Tipi"
                                        value={fuelType}
                                        disabled={true}
                                        onChange={(e) => setFuelType(e.target.value as string)}
                                        sx={{
                                            "& .Mui-disabled": {
                                                WebkitTextFillColor: "#000",
                                                fontWeight: "bold",
                                                backgroundColor: "#f5f5f5"
                                            }
                                        }}
                                    >
                                        {FUEL_TYPES.map(option => (
                                            <MuiMenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MuiMenuItem>
                                        ))}
                                    </Select>
                                    <Typography variant="caption" color="textSecondary">
                                        * Araç detayına göre otomatik belirlenmiştir.
                                    </Typography>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Miktar (Litre/kWh/Kilo)</CustomFormLabel>
                                <TextField placeholder="Miktar" type="number" size="small" fullWidth value={amount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setAmount(Number(e.target.value)); setAmountError(false); }} error={amountError} helperText={amountError ? 'Pozitif değer girin.' : ''} disabled={loadingButton} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Birim Fiyatı</CustomFormLabel>
                                <TextField placeholder="Birim Fiyatı" type="number" size="small" fullWidth value={fee} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFee(Number(e.target.value)); setFeeError(false); }} error={feeError} helperText={feeError ? 'Pozitif değer girin.' : ''} disabled={loadingButton} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Toplam Fiyat</CustomFormLabel>
                                <TextField
                                    placeholder="Toplam Fiyat"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={totalPrice}
                                    disabled={true}
                                    error={totalPriceError}
                                    helperText={totalPriceError ? 'Miktar و Birim Fiyat geçerli olmalıdır.' : ''}

                                    sx={{ "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#000", fontWeight: "bold" } }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={12} md={12}>
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <TextField placeholder="Detaylı Açıklama" size="small" fullWidth value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} multiline rows={2} disabled={loadingButton} />
                            </Grid>

                            <Grid item xs={12}>
                                <CustomFormLabel>Ekler (Resim/PDF/Excel)</CustomFormLabel>
                                <FuelFileUpload files={selectedFiles} setFiles={setSelectedFiles} error={false} currentAttachments={currentAttachments} setCurrentAttachments={setCurrentAttachments} />
                            </Grid>

                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button variant="contained" color={isEditMode ? "warning" : "success"} onClick={handleSubmit} disabled={loadingButton} size="small">
                                        {loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : isEditMode ? 'Güncellemeyi Kaydet' : 'Yakıt Kaydet'}
                                    </Button>
                                    {editRecordId ? (
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
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0 }}>
                            <Stack direction="row" spacing={1}>
                                {isFilterActive && hasDownloadPermission && (
                                    <Button variant="contained" color="secondary" onClick={() => setOpenDownloadFilteredModal(true)} disabled={loadingData || !filteredFuelRecords.length} startIcon={<IconFileDownload />} size="small">Filtrelenmişi İndir</Button>
                                )}
                                {hasDownloadPermission && (
                                    <Button variant="contained" color="primary" onClick={() => setOpenDownloadAllModal(true)} disabled={loadingData || !fuelRecords.length} startIcon={<IconFileDownload />} size="small">Tümünü İndir</Button>
                                )}
                            </Stack>
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <CustomFormLabel>Ara (Tip / Açıklama)</CustomFormLabel>
                            <TextField
                                variant="outlined" fullWidth value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} size="small"
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                placeholder="Yakıt Tipi veya Açıklama"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <CustomFormLabel>Tarih Aralığı (Başlangıç)</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Kayıt Başlangıç" value={startFilter} onChange={(v) => { setStartFilter(v); setPage(0); }} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <CustomFormLabel>Tarih Aralığı (Bitiş)</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Kayıt Bitiş" value={endFilter} inputFormat="dd/MM/yyyy" minDate={startFilter || undefined} onChange={(v) => { setEndFilter(v); setPage(0); }} renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                                    <IconButton onClick={() => { setStartFilter(null); setEndFilter(null); }} aria-label="clear date filters" size="small"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>

                    </Grid>
                </Box>

                <TableContainer>
                    {loadingData ? (<Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Kayıtlar yükleniyor...</Typography>
                    </Box>) : (
                        <Table aria-label="car fuels table">
                            <TableHead sx={{ background: "#f0f0f0" }}>
                                <TableRow>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'date'} direction={orderBy === 'date' ? order : 'asc'} onClick={() => handleRequestSort('date')}><Typography variant="h6">Tarih</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Yakıt Tipi</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'amount'} direction={orderBy === 'amount' ? order : 'asc'} onClick={() => handleRequestSort('amount')}><Typography variant="h6">Miktar</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Birim Fiyat</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'totatPrice'} direction={orderBy === 'totatPrice' ? order : 'asc'} onClick={() => handleRequestSort('totatPrice')}><Typography variant="h6">Toplam Fiyat</Typography></TableSortLabel></StyledTableCell>

                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ekler</Typography></StyledTableCell>

                                    <StyledTableCell><Typography variant="h6">Detayları</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6"></Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>{formatDateDisplay(row.date)}</StyledTableCell>
                                            <StyledTableCell>
                                                <Chip label={FUEL_TYPES.find(f => f.value === row.fuelType)?.label || row.fuelType || '-'} color="info" size="small" icon={<IconGasStation size={16} />} />
                                            </StyledTableCell>
                                            <StyledTableCell>{row.amount.toLocaleString()} </StyledTableCell>
                                            <StyledTableCell>{row.fee.toLocaleString()} TL</StyledTableCell>
                                            <StyledTableCell><Chip label={row.totatPrice.toLocaleString() + ' TL'} color="success" size="small" /></StyledTableCell>
                                            <StyledTableCell sx={{ maxWidth: 150 }}>
                                                {row.description && row.description.trim().length > 0 ? (
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
                                                    <Typography variant="body2" align="center">
                                                        -
                                                    </Typography>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell><IconButton onClick={() => handleOpenAttachmentsModal(row.attachment)}><IconLink size={18} /><Chip label={row.attachment.length} color="primary" size="small"></Chip></IconButton></StyledTableCell>
                                            <StyledTableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<IconEye />}
                                                            onClick={() => {
                                                                setSelectedRowForDetails(row);
                                                                setOpenDetailsModal(true);
                                                            }}
                                                        >
                                                            Görünüm
                                                        </Button>
                                                    </CustomTooltip>
                                                </Stack>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    {hasEditPermission && (<MuiMenuItem onClick={() => handleEdit(row)}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>)}
                                                    {hasDeletePermission && (<MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>)}

                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadMenu(row)}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                            Bu satırı indir
                                                        </MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (<TableRow><StyledTableCell colSpan={7} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç yakıt kaydı bulunamadı.</Typography></StyledTableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={fuelRecords.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            <DeleteCarFuels openModal={openDeleteModal} onClose={handleCloseDeleteModal} idToDelete={deleteId} nameToDelete={deleteName} onDeleteSuccess={fetchFuelRecords} showAlert={showAlert} />
            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler ({attachmentsToView.length} adet)</DialogTitle>
                <DialogContent dividers>{attachmentsToView.length > 0 ? (<Stack spacing={1}>
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
                </Stack>) : (<DialogContentText>Bu kayda ait ek dosya bulunmamaktadır.</DialogContentText>)}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAttachmentsModal(false)} color="primary" variant="outlined">Kapat</Button></DialogActions>
            </Dialog>

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

            <Dialog
                open={openDetailsModal}
                onClose={() => setOpenDetailsModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', mb: 2 }}>
                    Kayıt Detayları
                </DialogTitle>
                <DialogContent>
                    {selectedRowForDetails && (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}><Typography variant="subtitle2">Tarih:</Typography></Grid>
                                <Grid item xs={6}><Typography>{formatDateDisplay(selectedRowForDetails.date)}</Typography></Grid>

                                <Grid item xs={6}><Typography variant="subtitle2">Yakıt Tipi:</Typography></Grid>
                                <Grid item xs={6}>
                                    <Chip
                                        label={FUEL_TYPES.find(f => f.value === selectedRowForDetails.fuelType)?.label}
                                        size="small"
                                        color="info"
                                    />
                                </Grid>

                                <Grid item xs={6}><Typography variant="subtitle2">Miktar:</Typography></Grid>
                                <Grid item xs={6}><Typography>{selectedRowForDetails.amount.toLocaleString()} Unit</Typography></Grid>

                                <Grid item xs={6}><Typography variant="subtitle2">Birim Fiyat:</Typography></Grid>
                                <Grid item xs={6}><Typography>{selectedRowForDetails.fee.toLocaleString()} TL</Typography></Grid>

                                <Grid item xs={6}><Typography variant="subtitle2" fontWeight="bold">Toplam Fiyat:</Typography></Grid>
                                <Grid item xs={6}><Typography fontWeight="bold" color="success.main">{selectedRowForDetails.totatPrice.toLocaleString()} TL</Typography></Grid>

                                <Grid item xs={12}><Typography variant="subtitle2">Açıklama:</Typography></Grid>
                                <Grid item xs={12}>
                                    <Paper variant="outlined" sx={{ p: 1, bgcolor: '#f9f9f9' }}>
                                        <Typography variant="body2">{selectedRowForDetails.description || '-'}</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="subtitle2">Raporu İndir:</Typography>
                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    fullWidth
                                    startIcon={<IconFileText />}
                                    onClick={() => handleDownloadSingleRow(selectedRowForDetails, 'pdf')}
                                >
                                    PDF İndir
                                </Button>
                                <Button
                                    variant="contained"
                                    color="success"
                                    fullWidth
                                    startIcon={<IconFileSpreadsheet />}
                                    onClick={() => handleDownloadSingleRow(selectedRowForDetails, 'excel')}
                                >
                                    Excel İndir
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} variant="outlined" color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Kayıt Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<IconFileText />}
                            onClick={() => handleDownloadRowAction('pdf')}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadRowAction('excel')}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListCarFuels;

