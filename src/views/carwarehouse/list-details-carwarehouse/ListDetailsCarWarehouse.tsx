import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom"; // ⭐️ useParams حذف شد
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, MenuItem as MuiMenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    DialogContentText,
    Autocomplete, // ⭐️ کامپوننت Autocomplete اضافه شد
} from '@mui/material';

import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconX, IconFileSpreadsheet, IconFileText, IconBox,
    IconLink,
} from '@tabler/icons-react';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import axios from 'axios';
import server from '../../../assets/address.json';
// @ts-ignore
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
// @ts-ignore
import { useAuth } from 'src/context/AuthContext';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

import Logo from 'src/assets/images/logos/logo.png';
// @ts-ignore
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';

// Import components (باید به طور دستی در پروژه شما ایجاد شوند)
import DeleteDetailsCarWarehouse from './DeleteDetailsCarWarehouse';


// =====================================================================================
// === COMMON HELPERS (برای استقلال کد، اینجا تعریف شدند) ===
// =====================================================================================

// --- Interfaces ---
interface AttachmentType { fileUrl: string; }
interface CarDetail {
    id: number;
    brand: string;
    model: string; manufactureDate: string; plaque: string; description: string; carWarehouseId: number;
    attachments: AttachmentType[];
    recordStatus: 0 | 1; createAt: string;
}
// interface CarWarehouseInfo { id: number; name: string; code: string; address: string; } // ⭐️ id: number تغییر به string در API جدید
interface CarWarehouseApi { // ⭐️ اینترفیس جدید برای API لیست انبارها
    id: string; // ⭐️ از string استفاده می‌کنیم چون از API string برمی‌گردد
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: number;
    region: { id: string; name: string; depth: number; createAt: string; recordStatus: number; };
}
type SortableKeys = 'brand' | 'model' | 'plaque' | 'manufactureDate' | 'createAt';

// ... (Styles, Date & Sorting, File Helpers, ConsignmentFileUpload, uploadFiles, PDF/Excel Helpers - بدون تغییر)
// ... (توابع کمکی مشترک بالا را اینجا قرار دهید) ...
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));
// ... (StyledToggleButton) ...
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


const ConsignmentFileUpload: React.FC<{
    files: File[];
    setFiles: (f: File[]) => void;
    error: boolean;
    currentAttachments: AttachmentType[];
    setCurrentAttachments: (a: AttachmentType[]) => void;
}> = ({ files, setFiles, error, currentAttachments, setCurrentAttachments }) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    // const supportedTypes = "image/*, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xlsx";
    const supportedTypes = "image/*";
    const { isTooltipGloballyEnabled } = useTooltip();

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveNewFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleRemoveExistingAttachment = (index: number) => {
        setCurrentAttachments(currentAttachments.filter((_, i) => i !== index));
    };


    return (
        <Box mt={1} p={2} border={error ? '1px dashed red' : '1px dashed #ccc'} borderRadius={1}>
            <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={supportedTypes}
                style={{ display: 'none' }}
            />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Button size="small" variant="outlined" startIcon={<IconFileDownload />} onClick={() => fileInputRef.current?.click()}>
                    Dosya Seç (Resim)
                </Button>
            </Stack>

            {/* Display Existing Attachments */}
            {currentAttachments.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    <Typography variant="caption" sx={{ color: 'gray', width: '100%' }}>Mevcut Dosyalar ({currentAttachments.length}):</Typography>
                    {currentAttachments.map((att, index) => {
                        const fileName = att.fileUrl.split('/').pop() || 'dosya';
                        return (
                            <CustomTooltip key={`exist-${index}`} title={isTooltipGloballyEnabled ? fileName : ''}>
                                <Chip
                                    key={index}
                                    label={`Mevcut ${index + 1}`}
                                    icon={getFileIcon(fileName)}
                                    onDelete={() => handleRemoveExistingAttachment(index)}
                                    size="small"
                                    color={getFileColor(fileName)}
                                    variant="outlined"
                                    sx={{ m: 0.5, maxWidth: 150 }}
                                />
                            </CustomTooltip>
                        );
                    })}
                </Stack>
            )}

            {/* Display New Files to Upload */}
            {files.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    <Typography variant="caption" sx={{ color: 'gray', width: '100%' }}>Yüklenecek Yeni Dosyalar ({files.length}):</Typography>
                    {files.map((file, index) => (
                        <CustomTooltip key={`new-${index}`} title={isTooltipGloballyEnabled ? file.name : ''}>
                            <Chip
                                key={index}
                                label={`Yeni ${index + 1}`}
                                icon={getFileIcon(file.name)}
                                onDelete={() => handleRemoveNewFile(index)}
                                size="small"
                                color={getFileColor(file.name)}
                                sx={{ maxWidth: 150 }}
                            />
                        </CustomTooltip>
                    ))}
                </Stack>
            )}

            {error && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Lütfen dosya seçin veya hataları düzeltin.</Typography>}
        </Box>
    );
};

const uploadFiles = async (
    files: File[],
    authToken: string,
    showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void
): Promise<string[] | null> => {

    if (!files || files.length === 0) {
        return [];
    }

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

const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;
    try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); doc.setFont('NotoSans'); } catch (e) { }


    docAny.addImage(Logo, 'PNG', pageWidth - 50, 5, 40, 25);
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


// =====================================================================================
// === Main Component: ListDetailsCarWarehouse ===
// =====================================================================================

const ListDetailsCarWarehouse: React.FC = () => {
    const navigate = useNavigate();

    const nameInputRef = useRef<HTMLInputElement>(null);
    const { allowedOperations } = useAuth();
    const { isTooltipGloballyEnabled } = useTooltip();

    // Permissions
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);


    // ------------------------------------
    // States Form
    // ------------------------------------
    const [editingId, setEditingId] = useState<number | null>(null);
    const [brand, setBrand] = useState<string>('');
    const [model, setModel] = useState<string>('');
    const [manufactureDate, setManufactureDate] = useState<Date | null>(null);
    const [plaque, setPlaque] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]);
    const [attachmentError, setAttachmentError] = useState(false);

    // Form Validation States
    const [brandError, setBrandError] = useState(false);
    const [modelError, setModelError] = useState(false);
    const [plaqueError, setPlaqueError] = useState(false);
    const [dateError, setDateError] = useState(false);

    // Global States
    const [carWarehousesList, setCarWarehousesList] = useState<CarWarehouseApi[]>([]); // ⭐️ لیست انبارها
    const [selectedCarWarehouse, setSelectedCarWarehouse] = useState<CarWarehouseApi | null>(null); // ⭐️ انبار انتخاب شده
    const [warehouseError, setWarehouseError] = useState(false); // ⭐️ خطای انتخاب انبار

    const [tableCarWarehouse, setTableCarWarehouse] = useState<CarWarehouseApi | null>(null);
    // ⭐️ حذف: const [carWarehouseInfo, setCarWarehouseInfo] = useState<CarWarehouseInfo | null>(null);

    const [carDetails, setCarDetails] = useState<CarDetail[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isBlinking, setIsBlinking] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    // ------------------------------------
    // States Table/Filter/Modals
    // ------------------------------------
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CarDetail | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<CarDetail | null>(null);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [attachmentsToView, setAttachmentsToView] = useState<AttachmentType[]>([]);


    // --- Utility Functions ---
    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);

    // --- Data Mapping ---
    const mapApiDataToCarDetail = (r: any): CarDetail => ({
        id: Number(r.id),
        brand: r.brand,
        model: r.model,
        manufactureDate: r.manufactureDate,
        plaque: r.plaque,
        description: r.description || '',
        carWarehouseId: Number(r.carWarehouseId),
        attachments: (r.attachments || r.attacments || []).map((a: any) => ({ fileUrl: a.fileUrl })),
        recordStatus: Number(r.recordStatus) as 0 | 1,
        createAt: r.createAt,
    });

    // --- Data Fetching: Get Car Warehouses List ⭐️ ---
    const fetchCarWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }

        try {
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-car-warehouses`, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const activeWarehouses = response.data.data.filter((w: CarWarehouseApi) => w.recordStatus === 0);
                setCarWarehousesList(activeWarehouses);
                // ⭐️ تنظیم انبار پیش‌فرض به اولین مورد
                if (activeWarehouses.length > 0) {
                    const defaultWarehouse = activeWarehouses[0];
                    setTableCarWarehouse(defaultWarehouse);
                    // ⭐️ اضافه شده: تنظیم انبار فرم پیش‌فرض
                    setSelectedCarWarehouse(defaultWarehouse);
                }
            } else {
                showAlert('Araç Depo listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate, showAlert]);

    // --- Data Fetching: Get Car Details ⭐️ ---
    const fetchCarDetails = useCallback(async (warehouseId: string | null) => {
        if (!warehouseId) {
            setCarDetails([]);
            setLoadingData(false);
            return;
        }

        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            // API: get-car-warehouse-details-by-warehouseId/warehouseId
            const url = `${server.baseurl}${server.warehouse}get-car-warehouse-details-by-warehouseId/${warehouseId}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const rawRows = (res.data.data as any[]).map(mapApiDataToCarDetail);
                setCarDetails(rawRows);
            } else {
                showAlert(res.data.message || 'Araç detayları yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    // --- Initial Load Effect ⭐️ ---
    useEffect(() => {
        fetchCarWarehouses();
    }, [fetchCarWarehouses]);

    // --- Fetch Details on Warehouse Change Effect ⭐️ ---
    useEffect(() => {
        setPage(0);
        // ⬅️ فقط بر اساس وضعیت B (tableCarWarehouse) داده‌ها را واکشی کند.
        fetchCarDetails(tableCarWarehouse ? tableCarWarehouse.id : null);
    }, [tableCarWarehouse, fetchCarDetails]);


    // --- Form Logic ---
    const validateForm = (): boolean => {
        let ok = true;
        setBrandError(false); setModelError(false); setPlaqueError(false); setDateError(false); setWarehouseError(false); // ⭐️ خطای انبار اضافه شد

        if (!selectedCarWarehouse) { setWarehouseError(true); ok = false; } // ⭐️ اعتبارسنجی انبار
        if (!brand.trim()) { setBrandError(true); ok = false; }
        if (!model.trim()) { setModelError(true); ok = false; }
        if (!plaque.trim()) { setPlaqueError(true); ok = false; }
        if (!manufactureDate) { setDateError(true); ok = false; }

        if (!ok) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return ok;
    };

    const resetForm = useCallback(() => {
        setEditingId(null);
        setBrand('');
        setModel('');
        setManufactureDate(null);
        setAttachmentError(false);
        setPlaque('');
        setDescription('');
        setSelectedFiles([]);
        setCurrentAttachments([]);
        setBrandError(false); setModelError(false); setPlaqueError(false); setDateError(false); setWarehouseError(false); // ⭐️ خطای انبار اضافه شد
        setIsFormVisible(false);
    }, []);

    const buildPayload = (id?: number, finalAttachments: AttachmentType[] = []): { id?: number; brand: string; model: string; manufactureDate: string; plaque: string; description: string; carWarehouseId: number; attachments: AttachmentType[]; recordStatus?: 0 | 1 } => {
        // ⭐️ carWarehouseId از انبار انتخاب شده می‌آید
        const currentWarehouseId = selectedCarWarehouse ? Number(selectedCarWarehouse.id) : 0;

        const payload: { id?: number; brand: string; model: string; manufactureDate: string; plaque: string; description: string; carWarehouseId: number; attachments: AttachmentType[]; recordStatus?: 0 | 1 } = {
            brand: brand.trim(),
            model: model.trim(),
            manufactureDate: manufactureDate ? manufactureDate.toISOString() : '',
            plaque: plaque.trim(),
            description: description,
            carWarehouseId: currentWarehouseId, // ⭐️ استفاده از ID انبار انتخاب شده
            attachments: finalAttachments,
        };
        if (id) payload.id = id;
        return payload;
    };

    const handleSubmitForm = async () => {
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

        const finalAttachments: AttachmentType[] = [
            ...currentAttachments,
            ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])
        ];

        const isEditing = editingId !== null;
        const singlePayloadObject = buildPayload(editingId ?? undefined, finalAttachments);

        let finalDataToSend: any;
        const url = isEditing
            ? `${server.baseurl}${server.warehouse}update-car-warehouse-detail`
            : `${server.baseurl}${server.warehouse}create-car-warehouse-detail`;
        const method = isEditing ? 'put' : 'post';

        if (isEditing) {
            finalDataToSend = singlePayloadObject;
        } else {
            finalDataToSend = [singlePayloadObject];
        }

        try {
            const res = await axios.request({
                method,
                url,
                data: finalDataToSend,
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });
            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(`Araç detayı başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}!`, 'success');
                resetForm();
                fetchCarDetails(selectedCarWarehouse!.id); // ⭐️ واکشی مجدد داده‌های انبار انتخابی
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    useEffect(() => {
        // اگر در حالت ویرایش هستیم و لیست انبارها پر شده است
        if (editingId && carWarehousesList.length > 0) {
            // پیدا کردن رکورد فعلی که در حال ویرایش است
            const currentRecord = carDetails.find(r => r.id === editingId);

            if (currentRecord) {
                // پیدا کردن شیء انبار متناظر در لیست انبارها
                const warehouseToSelect = carWarehousesList.find(w => Number(w.id) === currentRecord.carWarehouseId);

                if (warehouseToSelect) {
                    // تنظیم انبار انتخاب شده در فرم
                    setSelectedCarWarehouse(warehouseToSelect);
                }
            }
        }
    }, [editingId, carWarehousesList, carDetails]);

    const handleEditClick = (row: CarDetail) => {
        // const warehouseToSelect = carWarehousesList.find(w => Number(w.id) === row.carWarehouseId);
        // if (warehouseToSelect) {
        //     setSelectedCarWarehouse(warehouseToSelect);
        // }

        setEditingId(row.id);
        setBrand(row.brand);
        setModel(row.model);
        setManufactureDate(row.manufactureDate ? new Date(row.manufactureDate) : null);
        setPlaque(row.plaque);
        setDescription(row.description);
        setCurrentAttachments(row.attachments);
        setSelectedFiles([]);

        setIsFormVisible(true);

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);
        handleCloseMenu();
    };

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }

        try {
            const response = await axios.put(
                `${server.baseurl}${server.warehouse}update-car-warehouse-detail`,
                { id: Number(id), recordStatus: statusValue },
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Araç detayı başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetForm();
                fetchCarDetails(selectedCarWarehouse!.id); // ⭐️ واکشی مجدد داده‌ها
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            handleCloseMenu();
        }
    };

    // --- Table/Filter/Sort Logic ---
    const filteredCarDetails = useMemo(() => {
        const list = stableSort(carDetails, getComparator(order, orderBy)).filter(r => {
            const matchesSearch = r.brand.toLowerCase().includes(searchTerm.toLowerCase()) || r.model.toLowerCase().includes(searchTerm.toLowerCase()) || r.plaque.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);
            const cDate = r.createAt ? new Date(r.createAt) : null;
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) && (!endFilter || (cDate && cDate <= endFilter));
            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [carDetails, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredCarDetails.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredCarDetails, page, rowsPerPage]);
    const isFilterActive = useMemo(() => !!searchTerm.trim() || statusFilter !== 'all' || startFilter !== null || endFilter !== null, [searchTerm, statusFilter, startFilter, endFilter]);


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CarDetail) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleStatusFilterChange = useCallback((_: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } }, []);
    const handleRequestSort = useCallback((property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); }, [order, orderBy]);
    const handleClearDateFilters = () => { setStartFilter(null); setEndFilter(null); };


    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setDeleteName(`${selectedRowForMenu.brand} (${selectedRowForMenu.plaque})`);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchCarDetails(selectedCarWarehouse!.id); }; // ⭐️ واکشی مجدد داده‌ها

    // --- Download Handlers ---
    const exportDetailsToPdf = (data: CarDetail[], title: string) => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

        // @ts-ignore
        const doc = new jsPDF();
        const docAny = doc as any;

        const columns = ['Marka', 'Model', 'Plaka', 'Üretim Tarihi', 'Açıklama', 'Kayıt Tarihi'];
        const body = data.map(r => [
            r.brand || '-', r.model || '-', r.plaque || '-',
            formatDateDisplay(r.manufactureDate || null),
            r.description,
            formatDateDisplay(r.createAt || null),
        ]);

        try {
            addPdfHeader(doc, title);

            autoTable(docAny, {
                head: [columns],
                body: body,
                startY: 35,
                theme: 'grid',
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

    const exportDetailsToExcel = (data: CarDetail[], title: string) => {
        if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet(title.substring(0, 31));

            const columns = ['Marka', 'Model', 'Plaka', 'Üretim Tarihi', 'Açıklama', 'Kayıt Tarihi'];
            addExcelHeader(worksheet, title, columns.length);

            const headerRow = worksheet.addRow(columns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            data.forEach(r => {
                worksheet.addRow([
                    r.brand || '-', r.model || '-', r.plaque || '-',
                    formatDateDisplay(r.manufactureDate || null),
                    r.description || '-',
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
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const handleDownloadAll = (format: 'pdf' | 'excel') => {
        const warehouseName = selectedCarWarehouse?.name || 'Tüm';
        const title = `Tüm Araç Detay Raporu (${warehouseName})`;
        format === 'pdf' ? exportDetailsToPdf(carDetails, title) : exportDetailsToExcel(carDetails, title);
        setOpenDownloadAllModal(false);
    };
    const handleDownloadFiltered = (format: 'pdf' | 'excel') => {
        const warehouseName = selectedCarWarehouse?.name || 'Filtrelenmiş';
        const title = `Filtrelenmiş Araç Detay Raporu (${warehouseName})`;
        format === 'pdf' ? exportDetailsToPdf(filteredCarDetails, title) : exportDetailsToExcel(filteredCarDetails, title);
        setOpenDownloadFilteredModal(false);
    };

    const handleOpenRowDownloadModal = (row: CarDetail) => { setSelectedRowForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); };

    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedRowForDownload(null); };
    const handleDownloadRow = (format: 'pdf' | 'excel') => {
        if (!selectedRowForDownload) return;
        const title = `Araç Detayları: ${selectedRowForDownload.plaque}`;
        format === 'pdf' ? exportDetailsToPdf([selectedRowForDownload], title) : exportDetailsToExcel([selectedRowForDownload], title);
        handleCloseRowDownloadModal();
    };

    const handleOpenAttachmentsModal = (row: CarDetail) => {
        setAttachmentsToView(row.attachments);
        setOpenAttachmentsModal(true);
        handleCloseMenu();
    };


    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
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

                {/* --- Header & Buttons --- */}
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    mb={3}
                    spacing={2}
                    flexWrap="wrap"
                >
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                        Araç Depo Detayları - ({selectedCarWarehouse?.name || 'Depo Seçilmedi'})
                    </Typography>

                    {/* Action Buttons */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Detay Ekle Belgesi kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni Detay Ekle
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={resetForm}
                                    disabled={loadingButton}
                                    fullWidth={false}
                                    startIcon={<IconX size={20} />}
                                >
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}


                    </Stack>
                </Stack>


                {/* --- Form Section --- */}
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{editingId ? 'Araç Detayını Düzenle' : 'Yeni Araç Detay Kaydı'}</Typography>
                        <Grid container spacing={2}>
                            {/* Car Warehouse Selection (Form) ⭐️ */}
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Araç Depo</CustomFormLabel>
                                <Autocomplete
                                    size="small"
                                    options={carWarehousesList}
                                    getOptionLabel={(option) => `${option.name} (${option.code})`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={selectedCarWarehouse}
                                    onChange={(_, newValue) => {
                                        setSelectedCarWarehouse(newValue);
                                        setWarehouseError(false);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Araç Depo Seçin"
                                            error={warehouseError}
                                            helperText={warehouseError ? 'Bu alan zorunludur!' : ''}
                                        />
                                    )}
                                    // ⭐️ در حالت ویرایش، اجازه تغییر انبار داده می‌شود
                                    disabled={loadingButton}
                                />
                            </Grid>
                            {/* Brand & Model */}
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Marka</CustomFormLabel>
                                <CustomTextField placeholder="Marka Adı" size="small"
                                    inputRef={nameInputRef}
                                    fullWidth value={brand}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setBrand(e.target.value);
                                        setBrandError(false);
                                    }} error={brandError} helperText={brandError ? 'Zorunlu alan.' : ''}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Model</CustomFormLabel>
                                <CustomTextField placeholder="Model Adı" size="small" fullWidth value={model} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setModel(e.target.value); setModelError(false); }} error={modelError} helperText={modelError ? 'Zorunlu alan.' : ''} />
                            </Grid>
                            {/* Manufacture Date & Plaque */}
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Üretim Tarihi</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        label="Üretim Tarihi"
                                        value={manufactureDate}
                                        onChange={(v) => { setManufactureDate(v); setDateError(false); }}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth error={dateError} helperText={dateError ? 'Zorunlu alan.' : params.helperText} />}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Plaka</CustomFormLabel>
                                <CustomTextField placeholder="Plaka Numarası" size="small" fullWidth value={plaque} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPlaque(e.target.value); setPlaqueError(false); }} error={plaqueError} helperText={plaqueError ? 'Zorunlu alan.' : ''} />
                            </Grid>
                            {/* Description */}
                            <Grid item xs={12}>
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <CustomTextField placeholder="Detaylı Açıklama" size="small" fullWidth value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} multiline rows={2} />
                            </Grid>
                            {/* Attachments */}
                            <Grid item xs={12}>
                                <CustomFormLabel>Ekler (Resimler)</CustomFormLabel>
                                <ConsignmentFileUpload
                                    files={selectedFiles}
                                    setFiles={setSelectedFiles}
                                    error={attachmentError}
                                    currentAttachments={currentAttachments}
                                    setCurrentAttachments={setCurrentAttachments}
                                />
                            </Grid>

                            {/* Form Actions */}
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button variant="contained" color={editingId ? "info" : "success"} onClick={handleSubmitForm} disabled={loadingButton || !selectedCarWarehouse} size="small">
                                        {loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : editingId ? 'Düzenle' : 'Yeni Kayıt Ekle'}
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={resetForm} size="small">İptal Et</Button>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>
                )}
            </div>

            {/* --- Alert --- */}
            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>
            )}

            <BlankCard>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={6}>
                            <Autocomplete
                                size="small"
                                options={carWarehousesList}
                                getOptionLabel={(option) => `${option.name} (${option.code})`}
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                value={selectedCarWarehouse}
                                onChange={(_, newValue) => {
                                    setTableCarWarehouse(newValue);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Araç Depo Seçin"
                                        error={warehouseError}
                                        helperText={warehouseError ? 'Lütfen bir depo seçin.' : ''}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>

                            <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>
                                {isFilterActive && hasDownloadPermission && (
                                    <BlinkingButton variant="contained"
                                        color="secondary" onClick={() => setOpenDownloadFilteredModal(true)}
                                        isBlinking={true} disabled={loadingData} startIcon={<IconFileDownload />} size="small">Filtrelenmişi İndir</BlinkingButton>
                                )}
                                {hasDownloadPermission && (
                                    <Button variant="contained" color="primary"
                                        onClick={() => setOpenDownloadAllModal(true)} startIcon={<IconFileDownload />}
                                        disabled={loadingData} size="small">Tümünü İndir</Button>
                                )}
                            </Stack>

                        </Grid>
                    </Grid>
                </Box>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* Warehouse Selector for Table Filtering */}


                        {/* Search & Date Filters */}
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ara (Marka / Model / Plaka)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} size="small" InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Kayıt Başlangıç" value={startFilter} onChange={(v) => { setStartFilter(v); setPage(0); }} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Kayıt Bitiş" value={endFilter} inputFormat="dd/MM/yyyy" minDate={startFilter || undefined} onChange={(v) => { setEndFilter(v); setPage(0); }} renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters" size="small"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Durum filtresi" sx={{ flexGrow: 1 }}>
                                <MuiToggleButton value="all" data-value="all" size="small">Tümü</MuiToggleButton>
                                <MuiToggleButton value="active" data-value="active" size="small">Aktif</MuiToggleButton>
                                <MuiToggleButton value="inactive" data-value="inactive" size="small">Pasif</MuiToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>


                {/* --- Table --- */}
                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Araç detayları yükleniyor... ({selectedCarWarehouse?.name || 'Lütfen depo seçin'})</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="car details table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'plaque'} direction={orderBy === 'plaque' ? order : 'asc'} onClick={() => handleRequestSort('plaque')} sx={{ color: 'inherit' }}><Typography variant="h6">Plaka</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'brand'} direction={orderBy === 'brand' ? order : 'asc'} onClick={() => handleRequestSort('brand')} sx={{ color: 'inherit' }}><Typography variant="h6">Marka</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'model'} direction={orderBy === 'model' ? order : 'asc'} onClick={() => handleRequestSort('model')} sx={{ color: 'inherit' }}><Typography variant="h6">Model</Typography></TableSortLabel></StyledTableCell>

                                    <StyledTableCell><TableSortLabel active={orderBy === 'manufactureDate'} direction={orderBy === 'manufactureDate' ? order : 'asc'} onClick={() => handleRequestSort('manufactureDate')} sx={{ color: 'inherit' }}><Typography variant="h6">Üretim Tarihi</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Ekler</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} sx={{ color: 'inherit' }}><Typography variant="h6">Kayıt Tarihi</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Durum</Typography></StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>{row.plaque || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.brand || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.model || '-'}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.manufactureDate || null)}</StyledTableCell>
                                            <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                                <Box sx={{
                                                    maxHeight: '5em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                }}>
                                                    <div dangerouslySetInnerHTML={{ __html: row.description }} />
                                                </Box>
                                                {row.description.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => { handleOpenDescriptionModal(row.description); }}>Devamını Oku</Button>
                                                    </CustomTooltip>
                                                )}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={() => handleOpenAttachmentsModal(row)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary"></Chip></IconButton>
                                            </StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.createAt || null)}</StyledTableCell>
                                            <StyledTableCell>
                                                <Chip label={row.recordStatus === 0 ? 'Aktif' : 'Pasif'} color={row.recordStatus === 0 ? 'success' : 'error'} size="small" />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    {hasEditPermission && (<MuiMenuItem onClick={() => handleEditClick(selectedRowForMenu!)}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>)}
                                                    {hasEditPermission && (
                                                        selectedRowForMenu?.recordStatus === 0 ? (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şantiyenin Depo pasif yap" : ""}>
                                                                <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 1)}><ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Pasif Yap</MuiMenuItem>
                                                            </CustomTooltip>
                                                        ) : (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şantiyenin Depo aktif yap" : ""}>
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
                                ) : (
                                    <TableRow><StyledTableCell colSpan={9} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç araç detayı bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredCarDetails.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            {/* --- Download Modals --- */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Detayları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAll('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAll('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Detayları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadFiltered('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadFiltered('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* --- Delete Modal --- */}
            <DeleteDetailsCarWarehouse
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={deleteName}
                onDeleteSuccess={() => fetchCarDetails(selectedCarWarehouse!.id)} // ⭐️ به‌روزرسانی
                showAlert={showAlert}
            />

            {/* --- Attachments Modal --- */}
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
                                        onClick={() => handleDownloadClick(attachment.fileUrl)}
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

            {/* --- Description Modal --- */}
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

        </>
    );
};

export default ListDetailsCarWarehouse;