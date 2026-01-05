import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, FormControl, InputLabel, Select,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Chip,
    DialogContentText,
    Autocomplete,
    TableCell,
    Tab,
    Tabs,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch,
    IconFileSpreadsheet, IconFileText, IconX, IconFileDownload,
    IconBox,
    IconQrcode, IconDownload,
    IconArrowRight,
    IconArrowLeft,
    IconLink
} from '@tabler/icons-react';
import { QRCodeCanvas } from "qrcode.react";

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';
import DeleteConsignment from './DeleteConsignment';

import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';


// --- Helper Functions and Styles (Türkçe metinler korundu) ---
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString.length === 10 ? dateString : String(dateString));
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    "&.Mui-selected": { color: "white" },
    "&.Mui-selected[data-value='all']": {
        backgroundColor: theme.palette.primary.main,
        "&:hover": { backgroundColor: theme.palette.primary.dark },
    },
    "&.Mui-selected[data-value='active']": {
        backgroundColor: theme.palette.success.main,
        "&:hover": { backgroundColor: theme.palette.success.dark },
    },
    "&.Mui-selected[data-value='inactive']": {
        backgroundColor: theme.palette.error.main,
        "&:hover": { backgroundColor: theme.palette.error.dark },
    },
    "&:not(.Mui-selected)": {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        "&:hover": { backgroundColor: theme.palette.action.hover },
    },
}));

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



// --- 1. Styled Component for Hover Effect ---
const StyledHoverBox = styled(Box)(({ theme }) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.3s ease-in-out',
    borderRadius: theme.shape.borderRadius,
    '&:hover': { opacity: 1 },
}));

// --- 2. Custom Image Slider Component (for better encapsulation) ---
interface ImageSlideAndHoverDownloadProps {
    attachments: AttachmentType[];
    currentSlideIndex: number;
    handlePrevSlide: () => void;
    handleNextSlide: () => void;
    handleDownloadClick: (url: string) => void;
}

const ImageSlideAndHoverDownload: React.FC<ImageSlideAndHoverDownloadProps> = ({
    attachments,
    currentSlideIndex,
    handlePrevSlide,
    handleNextSlide,
    handleDownloadClick
}) => {
    const currentAttachment = attachments[currentSlideIndex];

    return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>

            <IconButton onClick={handlePrevSlide} disabled={attachments.length <= 1} size="large" sx={{ ml: 1 }}>
                <IconArrowLeft size={30} />
            </IconButton>

            {/* Viewer Box */}
            <Box sx={{
                flexGrow: 1,
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}>
                {/* Image & Hover Effect Container */}
                <Box
                    sx={{
                        width: '100%',
                        maxHeight: 'calc(100% - 40px)', // Leave space for counter
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                    }}
                >
                    <img
                        src={`${server.urldpwonload}${currentAttachment.fileUrl}`}
                        alt={`Ek ${currentSlideIndex + 1}`}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: 6,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                    />
                    {/* Hover Overlay for Download Button */}
                    <StyledHoverBox>
                        <Button
                            variant="contained"
                            color="info"
                            size="large"
                            startIcon={<IconDownload size={24} />}
                            onClick={() => handleDownloadClick(currentAttachment.fileUrl)}
                        >
                            Resmi İndir
                        </Button>
                    </StyledHoverBox>
                </Box>

                {/* Counter */}
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {currentSlideIndex + 1} / {attachments.length}
                </Typography>
            </Box>

            <IconButton onClick={handleNextSlide} disabled={attachments.length <= 1} size="large" sx={{ mr: 1 }}>
                <IconArrowRight size={30} />
            </IconButton>
        </Stack>
    );
};


// --- Data Interfaces (Consignment) ---
interface WarehouseType { id: number; name: string; }
interface WorkhouseType { id: number; name: string; }
interface CarWarehouseType { id: number; name: string; }
interface StoreType { id: number; name: string; workhouse?: { id: number; name: string } }
interface AttachmentType { fileUrl: string; }

type PlaceKind = 'WAREHOUSE' | 'WORKHOUSE' | 'WORKHOUSE_STORE' | 'FILO' | 'CENTER' | 'UNKNOWN';

interface ConsignmentPayload {
    name: string;
    placeId: number;
    description: string;
    placeType: 0 | 1 | 2 | 3 | 4;
    attachments: AttachmentType[];
}

interface Consignment {
    id: number;
    name: string;
    code: string;
    placeId: number;
    type: 0 | 1 | 2 | 3 | 4;
    description: string;
    recordStatus?: number;
    createAt?: string;
    attachments: AttachmentType[];

    placeKind: PlaceKind;
    placeName: string;
}

interface QrDataType {
    id: number;
    code: string;
    name: string;
    url: string; // این فیلد جدید، آدرس کامل است
}

type SortableKeys = 'id' | 'name' | 'code' | 'placeName' | 'createAt';

// --- Sorting Helpers (Unchanged) ---
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

// --- Custom File Upload Component ---
const ConsignmentFileUpload: React.FC<{ files: File[]; setFiles: (f: File[]) => void; error: boolean; currentAttachments: AttachmentType[]; setCurrentAttachments: (a: AttachmentType[]) => void; }> = ({ files, setFiles, error, currentAttachments, setCurrentAttachments }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supportedTypes = "image/*";
    const { isTooltipGloballyEnabled } = useTooltip();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles([...files, ...Array.from(e.target.files)]);
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
                <Button size="small" variant="outlined" startIcon={<IconBox />} onClick={() => fileInputRef.current?.click()}>
                    Resim Seç
                </Button>
            </Stack>
            {/* Display Existing Attachments */}
            {currentAttachments.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    <Typography variant="caption" sx={{ color: 'gray' }}>Mevcut ({currentAttachments.length}):</Typography>
                    {currentAttachments.map((att, index) => (
                        <CustomTooltip key={`exist-${index}`}
                            title={isTooltipGloballyEnabled ? att.fileUrl.split('/').pop() : ''}>
                            <Chip
                                key={index}
                                label={`Mevcut ${index + 1}`}
                                onDelete={() => handleRemoveExistingAttachment(index)}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ m: 0.5, maxWidth: 120 }}
                            />
                        </CustomTooltip>

                    ))}
                </Stack>
            )}

            {/* Display New Files to Upload */}
            {files.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    {files.map((file, index) => (
                        <CustomTooltip key={`new-${index}`} title={isTooltipGloballyEnabled ? file.name : ''}>
                            <Chip
                                key={index}
                                label={`Yeni ${index + 1}`}
                                onDelete={() => handleRemoveNewFile(index)}
                                size="small"
                                color="success"
                                sx={{ maxWidth: 120 }}
                            />
                        </CustomTooltip>
                    ))}
                </Stack>
            )}

            {error && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Lütfen en az bir resim seçin.</Typography>}
        </Box>
    );
};

// تابع آپلود فایل
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

    debugger

    try {
        const uploadResponse = await axios.post(
            server.baseurl + server.baseinfo + "upload-files",
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${authToken}`
                }
            }
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


// const resizeImageBase64 = (base64String: string, maxWidth: number = 600, maxHeight: number = 600, quality: number = 0.7): Promise<string> => {
//     return new Promise((resolve) => {
//         const img = new Image();

//         img.onload = () => {
//             let width = img.width;
//             let height = img.height;

//             // محاسبه ابعاد جدید با حفظ نسبت
//             if (width > height) {
//                 if (width > maxWidth) {
//                     height *= maxWidth / width;
//                     width = maxWidth;
//                 }
//             } else {
//                 if (height > maxHeight) {
//                     width *= maxHeight / height;
//                     height = maxHeight;
//                 }
//             }

//             // اگر تصویر کوچک بود، ابعاد اصلی را حفظ می‌کند
//             if (width < 1 || height < 1) {
//                 resolve(base64String);
//                 return;
//             }

//             const canvas = document.createElement('canvas');
//             canvas.width = width;
//             canvas.height = height;
//             const ctx = canvas.getContext('2d');

//             if (ctx) {
//                 // پر کردن پس‌زمینه با سفید (برای جلوگیری از پس‌زمینه سیاه در صورت شفافیت)
//                 ctx.fillStyle = 'white';
//                 ctx.fillRect(0, 0, width, height);
//                 ctx.drawImage(img, 0, 0, width, height);

//                 // تبدیل مجدد به Base64 با کیفیت پایین‌تر (JPEG برای فشرده‌سازی بهتر)
//                 resolve(canvas.toDataURL('image/jpeg', quality));
//             } else {
//                 // اگر Canvas در دسترس نباشد، Base64 اصلی را برمی‌گرداند
//                 resolve(base64String);
//             }
//         };

//         img.onerror = () => {
//             console.error("Image loading failed for Base64 resizing.");
//             resolve(base64String); // در صورت خطا Base64 اصلی را برمی‌گرداند
//         };

//         // شروع بارگذاری تصویر
//         img.src = base64String;
//     });
// };

// const urlToBase64 = async (url: string, _mimeType: string, authToken: string): Promise<string | null> => {
//     try {
//         const fullUrl = url.startsWith('http') ? url : `${server.urldpwonload}${url}`;

//         const response =
//             await fetch(fullUrl, {
//                 method: 'GET',
//                 headers: {
//                     'Authorization': `Bearer ${authToken}`
//                 }
//             });

//         if (!response.ok) {
//             console.error(`Fetch error: ${response.status} ${response.statusText}`);
//             return null;
//         }

//         const blob = await response.blob();
//         const base64Result = await new Promise<string>((resolve, reject) => {
//             const reader = new FileReader();
//             reader.onloadend = () => resolve(reader.result as string);
//             reader.onerror = () => reject(new Error("FileReader failed to convert blob to Base64."));
//             reader.readAsDataURL(blob);
//         });

//         const optimizedBase64 = await resizeImageBase64(base64Result);

//         return optimizedBase64;

//     } catch (e: any) {
//         console.error("Error converting and optimizing image for PDF (Fetch API):", e?.message || e);
//         return null;
//     }
// };


const useQueryParams = () => {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
};

const ListConsignments: React.FC = () => {
    const navigate = useNavigate();
    const { allowedOperations } = useAuth();

    // Permissions
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const { isTooltipGloballyEnabled } = useTooltip();


    const nameInputRef = useRef<HTMLInputElement>(null);

    // ------------------------------------
    // States Form
    // ------------------------------------
    const [editingId, setEditingId] = useState<number | null>(null);
    const [consignmentName, setConsignmentName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [placeKind, setPlaceKind] = useState<PlaceKind>('CENTER');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | ''>('');
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | ''>('');
    const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
    const [selectedCarWarehouseId, setSelectedCarWarehouseId] = useState<number | ''>('');

    // State های مربوط به فایل‌ها 
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]);
    const [attachmentError, setAttachmentError] = useState(false);

    // لیست‌های مرجع
    const [warehousesList, setWarehousesList] = useState<WarehouseType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [carWarehousesList, setCarWarehousesList] = useState<CarWarehouseType[]>([]);
    const [storesList, setStoresList] = useState<StoreType[]>([]);
    const [consignments, setConsignments] = useState<Consignment[]>([]);

    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isBlinking, setIsBlinking] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // ------------------------------------
    // States Table/Filter
    // ------------------------------------
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    // Date Filters for 'createAt'
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);


    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<Consignment | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<Consignment | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');


    const [nameError, setNameError] = useState(false);
    const [placeError, setPlaceError] = useState(false);

    const [openQrModal, setOpenQrModal] = useState(false);
    const [qrData, setQrData] = useState<QrDataType | null>(null);
    const [downloadLoading, setDownloadLoading] = useState(false);

    // State های مودال پیوست ها
    const [rowForAttachments, setRowForAttachments] = useState<Consignment | null>(null);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [attachmentsToView, setAttachmentsToView] = useState<AttachmentType[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const [openStatusModal, setOpenStatusModal] = useState(false);
    const [statusTab, setStatusTab] = useState(0);
    const [inUsedConsignments, setInUsedConsignments] = useState<any[]>([]);
    const [availableConsignments, setAvailableConsignments] = useState<any[]>([]);
    const [loadingStatus, setLoadingStatus] = useState(false);

    const query = useQueryParams();
    const initialId = query.get('id');
    const initialCode = query.get('code');

    // --- Alert & Initialization Logic ---
    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);




    // --- Data Fetching: Reference Lists ---
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
            const response = await axios.get(server.baseurl + server.initialoperations + "get-warehouses",
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                    params: requestParams
                });
            if (response.data.httpStatusCode === 200) {
                setWarehousesList(response.data.data.map((item: any) => ({ id: Number(item.id), name: item.name })) as WarehouseType[]);
            } else { showAlert(response.data.message || 'Depolar yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchWorkhouses = useCallback(async () => {
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
            const response = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
            if (response.data.httpStatusCode === 200) {
                setWorkhousesList(response.data.data.map((item: any) => ({ id: Number(item.id), name: item.name })) as WorkhouseType[]);
            } else { showAlert(response.data.message || 'Şantiyeler yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchCarWarehouses = useCallback(async () => {
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
            // API: get-car-warehouses
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-car-warehouses`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                    params: requestParams
                });
            if (response.data.httpStatusCode === 200) {
                const all = response.data.data as any[];
                const mapped = all
                    .filter((item: any) => item.recordStatus === 0) // فقط رکوردهای فعال
                    .map((item: any) => ({
                        id: Number(item.id),
                        name: `${item.name} (${item.code})`, // نمایش نام و کد
                    })) as CarWarehouseType[];
                setCarWarehousesList(mapped);
            } else { showAlert(response.data.message || 'Filo listesi alınamadı.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchStoresByWorkhouseId = useCallback(async (workhouseId: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(`${server.baseurl}${server.initialoperations}get-stores-by-workhouse-id/${workhouseId}`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                setStoresList(response.data.data.map((item: any) =>
                ({
                    id: Number(item.id),
                    name: item.name,
                    workhouse: item.workhouse
                })) as StoreType[]);

            } else { showAlert(response.data.message || 'Şantiye depoları yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    // در کنار fetchWorkhouses و fetchWarehouses
    const fetchAllStores = useCallback(async () => {
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
            const response = await axios.get(
                `${server.baseurl}${server.initialoperations}get-stores`,
                {
                    headers: { Authorization: `Bearer ${authToken}` },
                    params: requestParams
                }
            );

            if (response.data.httpStatusCode === 200) {
                setStoresList(response.data.data.map((item: any) =>
                    ({ id: Number(item.id), name: item.name, workhouse: item.workhouse })) as StoreType[]);
            } else {
                showAlert(response.data.message || 'Tüm şantiye depoları yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);


    const fetchConsignments = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-consignments`, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                const rawRows = (res.data.data as any[]).map((r) => {
                    return mapApiDataToConsignment(
                        r,
                        warehousesList,
                        workhousesList,
                        storesList,
                        carWarehousesList
                    );
                }) as Consignment[];

                setConsignments(rawRows);
            } else {
                showAlert(res.data.message || 'Kayıtlar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, warehousesList, workhousesList, storesList, carWarehousesList]);


    const fetchSingleConsignment = useCallback(async (id: number, authToken: string): Promise<Consignment | null> => {
        try {
            setLoadingData(true);
            showAlert(`Kayıt ID: ${id} yükleniyor...`, 'info');

            const res = await axios.get(`${server.baseurl}${server.hr}get-consignments-by-id/${id}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (res.data.httpStatusCode === 200 && res.data.data) {
                const rawData = res.data.data;

                const mappedConsignment: Consignment = mapApiDataToConsignment(
                    rawData,
                    warehousesList,
                    workhousesList,
                    storesList,
                    carWarehousesList
                );

                return mappedConsignment;
            }
            return null;
        } catch (e) {
            showAlert('Tek kayıt yüklenirken hata oluştu.', 'error');
            console.error('Fetch Single Consignment Error:', e);
            return null;
        } finally {
            setLoadingData(false);
        }
    }, [
        warehousesList,
        workhousesList,
        storesList
    ]);


    const handleOpenStatusModal = async () => {
        setLoadingStatus(true);
        setOpenStatusModal(true);
        setStatusTab(0);
        const authToken = localStorage.getItem('authToken');

        try {
            const [resInUsed, resAvailable] = await Promise.all([
                axios.get(`${server.baseurl}${server.hr}get-in-used-consignments`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                }),
                axios.get(`${server.baseurl}${server.hr}get-available-consignments`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                })
            ]);

            if (resInUsed.data.httpStatusCode === 200) {
                setInUsedConsignments(resInUsed.data.data);
            }
            if (resAvailable.data.httpStatusCode === 200) {
                setAvailableConsignments(resAvailable.data.data);
            }
        } catch (e) {
            showAlert('Veriler yüklenirken hata oluştu.', 'error');
        } finally {
            setLoadingStatus(false);
        }
    };

    // useEffect(() => {
    //     fetchWarehouses();
    //     fetchWorkhouses();
    //     fetchCarWarehouses();
    // }, [fetchWarehouses, fetchWorkhouses, fetchCarWarehouses]);

    useEffect(() => {
        fetchWarehouses();
        fetchWorkhouses();
        fetchCarWarehouses();
        // ⭐️ اضافه کردن واکشی تمام Stores
        fetchAllStores();
    }, [fetchWarehouses, fetchWorkhouses, fetchCarWarehouses, fetchAllStores]);

    const handleOpenAttachmentsModal = (row: Consignment) => {
        setRowForAttachments(row);

        setAttachmentsToView(row.attachments);
        setCurrentSlideIndex(0);
        setOpenAttachmentsModal(true);
    };

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const idToFetch = Number(initialId);

        if (authToken && initialId && idToFetch) {

            const isReferenceDataLoaded =
                warehousesList.length >= 0
                && workhousesList.length >= 0
                && carWarehousesList.length >= 0;

            if (isReferenceDataLoaded) {

                fetchSingleConsignment(idToFetch, authToken)
                    .then(consignment => {
                        if (consignment) {
                            handleOpenAttachmentsModal(consignment);
                            showAlert(`Kod: ${initialCode} kaydı başarıyla yüklendi.`, 'success');

                            // ⭐️ مهم: پارامترها را از آدرس پاک کن
                            window.history.replaceState({}, document.title, window.location.pathname);
                        } else {
                            showAlert(`Mal kaydı bulunamadı (ID: ${initialId}).`, 'warning');
                        }
                    })
                    .catch(_e => {
                        showAlert('Kayıt yüklenirken خطا oluştu.', 'error');
                    });
            }
        }
    }, [
        warehousesList,
        workhousesList,
        carWarehousesList
    ]);

    useEffect(() => {

        if (warehousesList.length > 0 || workhousesList.length > 0 || carWarehousesList.length > 0 || !loadingData) {
            fetchConsignments();
        }

    }, [fetchConsignments, warehousesList, workhousesList, carWarehousesList, storesList]);


    // --- Form Logic (Cont.) ---
    useEffect(() => {
        // Mantık, önceki kontrolde olduğu gibi kaldı
        if (placeKind === 'WORKHOUSE_STORE') {
            setSelectedWarehouseId(''); setSelectedCarWarehouseId('');
            if (selectedWorkhouseId && typeof selectedWorkhouseId === 'number') {
                fetchStoresByWorkhouseId(selectedWorkhouseId);
            } else {
                setStoresList([]);
                setSelectedStoreId('');
            }
        } else {
            setSelectedStoreId('');
        }
        if (placeKind === 'WAREHOUSE') { setSelectedWorkhouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId(''); }
        if (placeKind === 'WORKHOUSE') { setSelectedWarehouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId(''); }
        if (placeKind === 'FILO') { setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId(''); }
    }, [placeKind, selectedWorkhouseId, fetchStoresByWorkhouseId]);


    const mapApiDataToConsignment = (
        r: any,
        warehousesList: WarehouseType[],
        workhousesList: WorkhouseType[],
        storesList: StoreType[],
        carWarehousesList: CarWarehouseType[]
    ): Consignment => {
        let name = '-';
        const placeIdNum = Number(r.placeId);
        const typeNum = Number(r.placeType);
        const idNum = Number(r.id);
        const recordStatusNum = Number(r.recordStatus);

        const kind: PlaceKind =
            typeNum === 0 ? 'WAREHOUSE' :
                typeNum === 1 ? 'WORKHOUSE' :
                    typeNum === 2 ? 'WORKHOUSE_STORE' :
                        typeNum === 3 ? 'FILO' :
                            typeNum === 4 ? 'CENTER' :
                                'UNKNOWN';

        debugger

        if (typeNum === 0) {
            name = warehousesList.find(w => w.id === placeIdNum)?.name || 'Depo   ';
        } else if (typeNum === 1) {
            name = workhousesList.find(w => w.id === placeIdNum)?.name || 'Şantiye   ';
        } else if (typeNum === 2) {
            name = storesList.find(s => s.id === placeIdNum)?.name || `Şantiye Deposu (${placeIdNum})`;
        } else if (typeNum === 3) {
            name = carWarehousesList.find(w => w.id === placeIdNum)?.name || 'Filo   ';
        } else if (typeNum === 4) {
            name = 'Merkez';
        }

        const attachments = (r.attachments && Array.isArray(r.attachments)) ? r.attachments.map((a: any) => ({ fileUrl: a.fileUrl })) : [];

        return {
            id: idNum,
            name: r.name,
            code: r.code || '-',
            placeId: placeIdNum,
            type: typeNum as Consignment['type'],
            description: r.description || '',
            recordStatus: recordStatusNum,
            createAt: r.createAt,
            attachments: attachments as AttachmentType[],
            placeKind: kind,
            placeName: name,
        };
    };


    const QR_BASE_URL = "https://setasportal.com/hr/list-consignments";
    // --- QR Code Logic (for New Record) ---
    const fetchLastConsignmentAndOpenQRModal = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-consignments`,
                { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200 && res.data.data.length > 0) {
                const rawRows = res.data.data as any[];

                // find the latest record based on createAt
                const latestRecord = rawRows.sort((a, b) =>
                    new Date(b.createAt).getTime() - new Date(a.createAt).getTime())[0];

                if (latestRecord && latestRecord.code && latestRecord.name) {
                    // const fullUrl = `${QR_BASE_URL}${latestRecord.code}`;
                    const fullUrl = `${QR_BASE_URL}?id=${latestRecord.id}&code=${latestRecord.code}`;
                    // setQrData({ code: latestRecord.code, name: latestRecord.name, url: fullUrl }); // افزودن url
                    setQrData({
                        id: Number(latestRecord.id), // 👈 اینجا id را تنظیم می‌کنیم
                        code: latestRecord.code,
                        name: latestRecord.name,
                        url: fullUrl
                    });
                    setOpenQrModal(true);
                } else {
                    showAlert('Yeni kayıt verileri (Kod ve Ad) eksik.', 'warning');
                }
            } else {
                showAlert('Son kayıt alınamadı. Lütfen manuel kontrol edin.', 'warning');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    }, [showAlert]);

    const validateForm = (): boolean => {
        let ok = true;

        if (!consignmentName.trim()) {
            setNameError(true);
            ok = false;
        } else {
            setNameError(false);
        }

        setPlaceError(false);

        if (placeKind !== 'CENTER') {
            const computedPlaceId =
                placeKind === 'WAREHOUSE' ? selectedWarehouseId :
                    placeKind === 'WORKHOUSE' ? selectedWorkhouseId :
                        placeKind === 'WORKHOUSE_STORE' ? selectedStoreId :
                            placeKind === 'FILO' ? selectedCarWarehouseId : null;

            if (!computedPlaceId) {
                setPlaceError(true);
                ok = false;
            }
        }
        setAttachmentError(false);

        if (!ok) {
            showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        }

        return ok;
    };
    const resetForm = () => {
        setEditingId(null);
        setConsignmentName('');
        setDescription(''); // ✨ تغییر: ریست کردن توضیحات
        setPlaceKind('CENTER');
        setSelectedWarehouseId('');
        setSelectedWorkhouseId('');
        setSelectedStoreId('');
        setSelectedCarWarehouseId('');
        setSelectedFiles([]);
        setCurrentAttachments([]);

        setNameError(false); setPlaceError(false); setAttachmentError(false);
        setIsFormVisible(false);
    };

    const buildPayload = (id?: number, attachments: AttachmentType[] = []): ConsignmentPayload & { id?: number } => {
        let placeIdToSend: number | null = null;
        let typeToSend: ConsignmentPayload['placeType'] = 4;

        if (placeKind === 'WAREHOUSE') {
            placeIdToSend = Number(selectedWarehouseId); typeToSend = 0;
        } else if (placeKind === 'WORKHOUSE') {
            placeIdToSend = Number(selectedWorkhouseId); typeToSend = 1;
        } else if (placeKind === 'WORKHOUSE_STORE') {
            placeIdToSend = Number(selectedStoreId); typeToSend = 2;
        } else if (placeKind === 'FILO') {
            placeIdToSend = Number(selectedCarWarehouseId); typeToSend = 3;
        } else if (placeKind === 'CENTER') {
            placeIdToSend = null;
            typeToSend = 4;
        }

        const payload: ConsignmentPayload & { id?: number } = {
            name: consignmentName.trim(),
            description: description,
            placeId: Number(placeIdToSend),
            placeType: typeToSend,
            attachments: attachments,
        };

        if (id) payload.id = id;
        return payload;
    };


    const handleSubmitForm = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error'); setLoadingButton(false); return; }

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
        const payload = buildPayload(editingId ?? undefined, finalAttachments);

        const url = isEditing
            ? `${server.baseurl}${server.hr}update-consignment`
            : `${server.baseurl}${server.hr}create-consignment`;
        const method = isEditing ? 'put' : 'post';

        try {
            const res = await axios.request({ method, url, data: payload, headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(`Ambar kaydı başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}!`, 'success');
                resetForm();
                if (!isEditing) {
                    await fetchLastConsignmentAndOpenQRModal();
                }
                fetchConsignments();
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

    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        const r = selectedRowForMenu;

        setEditingId(r.id);
        setConsignmentName(r.name);
        setPlaceKind(r.placeKind);
        setDescription(r.description || '');
        setCurrentAttachments(r.attachments);
        setSelectedFiles([]);

        // Set Place ID based on type
        if (r.type === 0) {
            setSelectedWarehouseId(r.placeId); setSelectedWorkhouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        } else if (r.type === 1) {
            setSelectedWorkhouseId(r.placeId); setSelectedWarehouseId(''); setSelectedStoreId(''); setSelectedCarWarehouseId('');
        } else if (r.type === 2) {
            setSelectedStoreId(r.placeId); setSelectedWarehouseId(''); setSelectedCarWarehouseId('');

            const store = storesList.find(s => s.id === r.placeId);
            const workhouseId = store?.workhouse?.id ?? '';
            setSelectedWorkhouseId(workhouseId);

            if (workhouseId && typeof workhouseId === 'number') {
                fetchStoresByWorkhouseId(workhouseId);
            }
        } else if (r.type === 3) {
            setSelectedCarWarehouseId(r.placeId); setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId('');
        } else if (r.type === 4) {
            setSelectedCarWarehouseId(''); setSelectedWarehouseId(''); setSelectedWorkhouseId(''); setSelectedStoreId('');

        }

        setIsFormVisible(true);

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);

        handleCloseMenu();
    };


    const isFilterActive = useMemo(() => !!searchTerm.trim() || statusFilter !== 'all' || startFilter !== null || endFilter !== null, [searchTerm, statusFilter, startFilter, endFilter]);

    const getPlaceKindText = (kind: PlaceKind) => {
        return kind === 'WAREHOUSE' ? 'Depo' :
            kind === 'WORKHOUSE' ? 'Şantiye' :
                kind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' :
                    kind === 'FILO' ? 'Filo' : 'Bilinmeyen';
    }

    const filteredConsignments = useMemo(() => {
        const list = consignments.filter(r => {
            // 1. Search Filter
            const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.placeName.toLowerCase().includes(searchTerm.toLowerCase()) || r.code.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. Status Filter
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);

            // 3. Date Filter
            const cDate = r.createAt ? new Date(r.createAt) : null;
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) && (!endFilter || (cDate && cDate <= endFilter));


            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [consignments, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredConsignments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredConsignments, page, rowsPerPage]);

    // Menu Handlers
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: Consignment) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setDeleteName(selectedRowForMenu.name.trim());
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchConsignments(); };

    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } };
    const handleRequestSort = (property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); };
    const handleClearDateFilters = () => { setStartFilter(null); setEndFilter(null); };



    const handleNextSlide = useCallback(() => {
        if (attachmentsToView.length > 0) {
            setCurrentSlideIndex(prev => (prev + 1) % attachmentsToView.length);
        }
    }, [attachmentsToView.length]);

    const handlePrevSlide = useCallback(() => {
        if (attachmentsToView.length > 0) {
            setCurrentSlideIndex(prev => (prev - 1 + attachmentsToView.length) % attachmentsToView.length);
        }
    }, [attachmentsToView.length]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        const intervalDuration = 5000;

        if (openAttachmentsModal && attachmentsToView.length > 1) {
            intervalId = setInterval(() => {
                handleNextSlide();
            }, intervalDuration);
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [openAttachmentsModal, attachmentsToView.length, handleNextSlide]);


    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };

    // --- Export Functions (PDF/Excel) ---
    const exportToPdf = async (rows: Consignment[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

        // @ts-ignore
        const doc = new jsPDF();
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); } catch (e) { }
        docAny.setFont('NotoSans');

        const columns = ['Mal Adı', 'Kod', 'Yer Türü', 'Yer', 'Kayıt Tarihi'];
        const body = rows.map(r => [
            r.name || '-',
            r.code || '-',
            getPlaceKindText(r.placeKind),
            r.placeName || '-',
            formatDateDisplay(r.createAt || null),
        ]);

        const title = isFiltered ? 'Filtrelenmiş Mal Kayıtları Raporu' : 'Tüm Mal Kayıtları Raporu';

        autoTable(docAny, {
            head: [columns],
            body: body,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: 'NotoSans', fontSize: 9 },
            didDrawPage: (_data: any) => {
                try {
                    docAny.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);
                } catch (e) {
                    console.error("Logo yüklenemedi", e);
                }
                docAny.setFont('NotoSans', 'normal'); docAny.setFontSize(14);
                docAny.text(title, pageWidth / 2, 15, { align: 'center' });

                docAny.setFontSize(10);
                docAny.setFont('NotoSans', 'bold');
                docAny.text(`Rapor Tarihi:`, 15, 40);
                docAny.setFont('NotoSans', 'normal');
                docAny.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);

                docAny.setLineWidth(0.5);
                docAny.line(15, 48, pageWidth - 15, 48);

                docAny.setFont('NotoSans', 'normal'); docAny.setFontSize(8); docAny.setTextColor(0);
                const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
                let footerY = pageHeight - 20;
                companyInfo.forEach(line => {
                    docAny.text(line, pageWidth / 2, footerY, { align: 'center' });
                    footerY += 4;
                });

                docAny.setTextColor(0);
                docAny.setFontSize(10);
                docAny.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
                docAny.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

                const pageNumber = (docAny as any).internal.getCurrentPageInfo().pageNumber;
                const pageCount = (docAny as any).internal.getNumberOfPages();
                docAny.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            },
            startY: 55, showHead: 'everyPage', margin: { top: 40, bottom: 45, left: 10, right: 10 }
        });

        const fileName = isFiltered ? `Filtrelenmis_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf` : `Tum_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        setLoadingData(false);
    };

    const exportToExcel = async (rows: Consignment[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('Dışa aktarılacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const sheetName = isFiltered ? 'Filtrelenmiş Kayıtlar' : 'Tüm Kayıtlar';
            const worksheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });

            const thinBorder = { style: 'thin', color: { argb: 'FFD3D3D3' } };
            const border = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
            const font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };
            const headerFont = { ...font, bold: true };
            const centerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            const leftAlignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            const fullHeaderStyle = { border: border, alignment: centerAlignment, font: headerFont, fill: headerFill } as Partial<Excel.Style>;
            const bodyStyle = { border: border, alignment: leftAlignment, font: font } as Partial<Excel.Style>;

            const addCompanyInfo = (ws: Excel.Worksheet) => {
                ws.addRow([]);
                const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
                companyInfo.forEach(line => {
                    ws.addRow([line]);
                    const lastRow = ws.lastRow;
                    if (lastRow) {
                        lastRow.getCell(1).alignment = { horizontal: 'center' };
                        lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                        ws.mergeCells(`A${lastRow.number}:F${lastRow.number}`);
                    }
                });
            };

            const titleText = isFiltered ? 'Filtrelenmiş Mal Kayıtları Raporu' : 'Tüm Mal Kayıtları Raporu';
            worksheet.addRow(['', '', '', '', '', '']);
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) { titleRow.font = { name: 'Times New Roman', size: 12, bold: true }; titleRow.getCell(1).alignment = { horizontal: 'center' }; }
            worksheet.mergeCells(`A${titleRow.number}:F${titleRow.number}`);

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) { dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false }; dateRow.getCell(1).alignment = { horizontal: 'left' }; }
            worksheet.addRow([]);

            const tableHeaders = ['Mal Adı', 'Kod', 'Yer Türü', 'Yer', 'Kayıt Tarihi'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => { cell.style = fullHeaderStyle; });

            rows.forEach(r => {
                const row = worksheet.addRow([
                    r.name || '-',
                    r.code || '-',
                    getPlaceKindText(r.placeKind),
                    r.placeName || '-',
                    formatDateDisplay(r.createAt || null),
                ]);
                row.eachCell((cell) => { cell.style = bodyStyle; });
            });

            addCompanyInfo(worksheet);

            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                // @ts-ignore
                if (column.eachCell) {
                    // @ts-ignore
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) { maxLength = columnLength; }
                    });
                }
                column.width = Math.min(Math.max(maxLength + 2, 12), 50);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = isFiltered ? `Filtrelenmis_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx` : `Tum_Ambarkaytlari_Raporu_${format(new Date(), 'yyyyMMdd')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu. Lütfen konsolu kontrol edin.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    // const exportRowWithImagesToPdf = async (row: Consignment) => {
    //     if (!row) return;
    //     setLoadingData(true);
    //     showAlert('Malzeme ve resimler PDF olarak hazırlanıyor...', 'info');

    //     const authToken = localStorage.getItem('authToken');
    //     if (!authToken) {
    //         showAlert('Kimlik doğrulama hatası: Lütfen tekrar giriş yapın.', 'error');
    //         setLoadingData(false);
    //         return;
    //     }

    //     // @ts-ignore
    //     const doc = new jsPDF();
    //     const docAny = doc as any;
    //     const pageWidth = doc.internal.pageSize.getWidth();
    //     const pageHeight = doc.internal.pageSize.getHeight();
    //     const margin = 10;
    //     let currentY = 15;

    //     try {
    //         // ... (تنظیمات فونت و هدر و جدول مشخصات - بدون تغییر) ...
    //         try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); } catch (e) { }
    //         docAny.setFont('NotoSans');
    //         docAny.setFontSize(14);
    //         docAny.text('Malzeme Kayıt Detayı ve Resim Raporu', pageWidth / 2, currentY, { align: 'center' });
    //         currentY += 10;

    //         const mainColumns = [['Alan', 'Değer']];
    //         const mainBody = [
    //             ['Mal Adı:', row.name || '-'],
    //             ['Kod:', row.code || '-'],
    //             ['Yer Türü:', getPlaceKindText(row.placeKind)],
    //             ['Yer Adı:', row.placeName || '-'],
    //             ['Kayıt Tarihi:', formatDateDisplay(row.createAt || null)],
    //         ];

    //         // فرض می‌کنیم autoTable قبلاً تعریف شده
    //         autoTable(docAny, {
    //             head: mainColumns,
    //             body: mainBody,
    //             startY: currentY,
    //             theme: 'grid',
    //             styles: { font: 'NotoSans', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
    //             headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] },
    //             margin: { top: 15, left: margin, right: margin }
    //         });
    //         currentY = docAny.lastAutoTable.finalY + 10;

    //         // 3. بخش عکس‌ها (منطق جدید برای مدیریت MimeType)
    //         if (row.attachments && row.attachments.length > 0) {
    //             docAny.setFontSize(12);
    //             docAny.text(`Ekli Resimler (${row.attachments.length} adet):`, margin, currentY);
    //             currentY += 5;

    //             // تبدیل URL عکس‌ها به Base64 و استخراج MimeType
    //             const imagesBase64Promises = row.attachments.map(att => {
    //                 const fileName = att.fileUrl.split('/').pop()?.toLowerCase() || '';
    //                 // تخمین MimeType بر اساس پسوند (می‌تواند از سرور دقیق‌تر باشد)
    //                 const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    //                 // واکشی Base64
    //                 return urlToBase64(att.fileUrl, mimeType, authToken).then(base64 => ({ base64, mimeType, fileUrl: att.fileUrl }));
    //             });

    //             // دریافت Base64 و MimeType های موفقیت‌آمیز
    //             const imageResults = (await Promise.all(imagesBase64Promises)).filter(img => img.base64 !== null) as { base64: string; mimeType: string; fileUrl: string }[];

    //             if (imageResults.length === 0) {
    //                 showAlert('Resimler yüklenirken bir sorun oluştu (Kimlik doğrulama veya sunucu hatası).', 'error');
    //                 setLoadingData(false);
    //                 return;
    //             }

    //             const imgWidth = 55;
    //             const imgHeight = 40;
    //             const padding = 5;
    //             const imagesPerRow = Math.floor((pageWidth - 2 * margin) / (imgWidth + padding));
    //             let x = margin;

    //             for (let i = 0; i < imageResults.length; i++) {
    //                 const { base64, mimeType, fileUrl } = imageResults[i];

    //                 // 💡 مهم: استخراج فرمت تصویر (JPEG, PNG,...) برای آرگومان دوم addImage
    //                 const imageType = mimeType.toUpperCase().split('/')[1] || 'JPEG';

    //                 // بررسی صفحه‌بندی
    //                 if (currentY + imgHeight + padding > pageHeight - margin) {
    //                     docAny.addPage();
    //                     currentY = margin;
    //                     x = margin;
    //                 }

    //                 // بررسی اتمام ردیف
    //                 if ((i > 0 && i % imagesPerRow === 0)) {
    //                     currentY += imgHeight + 10;
    //                     x = margin;
    //                 }

    //                 // افزودن عکس به PDF با استفاده از imageType صحیح
    //                 docAny.addImage(base64, imageType, x, currentY, imgWidth, imgHeight);

    //                 // افزودن نام فایل زیر عکس
    //                 docAny.setFontSize(7);
    //                 docAny.text(fileUrl.split('/').pop() || 'Dosya Adı', x, currentY + imgHeight + 3);

    //                 x += imgWidth + padding;
    //             }
    //         } else {
    //             docAny.setFontSize(10);
    //             docAny.text('Bu kayıt için ekli resim bulunmamaktadır.', margin, currentY);
    //         }

    //         const fileName = `Mal_Raporu_ve_Resimler_${row.code}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    //         docAny.save(fileName);
    //         showAlert('Malzeme ve Resimler PDF olarak başarıyla indirildi.', 'success');
    //     } catch (e) {
    //         showAlert('Resimli PDF oluşturulurken kritik bir hata oluştu.', 'error');
    //         console.error("Resimli PDF Hatası:", e);
    //     } finally {
    //         setLoadingData(false);
    //     }
    // };

    // const handleDownloadRowWithImages = () => {
    //     if (selectedRowForMenu) {
    //         exportRowWithImagesToPdf(selectedRowForMenu);
    //         handleCloseMenu();
    //     }
    // };

    const handleOpenDownloadAllModal = () => setOpenDownloadAllModal(true);
    const handleCloseDownloadAllModal = () => setOpenDownloadAllModal(false);
    const handleOpenDownloadFilteredModal = () => setOpenDownloadFilteredModal(true);
    const handleCloseDownloadFilteredModal = () => setOpenDownloadFilteredModal(false);
    const handleOpenRowDownloadModal = (row: Consignment) => { setSelectedRowForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedRowForDownload(null); };

    const handleDownloadAll = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(consignments, false) : exportToExcel(consignments, false); handleCloseDownloadAllModal(); };
    const handleDownloadFiltered = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(filteredConsignments, true) : exportToExcel(filteredConsignments, true); handleCloseDownloadFilteredModal(); };
    const handleDownloadRow = (format: 'pdf' | 'excel') => { if (!selectedRowForDownload) return; const rows = [selectedRowForDownload]; format === 'pdf' ? exportToPdf(rows, false) : exportToExcel(rows, false); handleCloseRowDownloadModal(); };

    // --- QR Code Logic (Download) ---
    const downloadQRCodeAsPNG = (elementId: string, filename: string) => {
        const canvas = document.getElementById(elementId) as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    const downloadQRCodeAsPDF = async (code: string, name: string) => {
        setDownloadLoading(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const docAny = doc as any;

        try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); } catch (e) { }
        docAny.setFont('NotoSans');

        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
        const qrImage = canvas ? canvas.toDataURL('image/png') : null;

        docAny.setFontSize(12);
        docAny.text(`Mal Adı: ${name}`, 10, 15);
        docAny.text(`Kod: ${code}`, 10, 25);

        if (qrImage) {
            docAny.addImage(qrImage, 'PNG', 10, 35, 60, 60);
        } else {
            docAny.text('QR Kod görseli bulunamadı.', 10, 50);
        }

        docAny.save(`QRCode_${code}.pdf`);
        setDownloadLoading(false);
    };


    const handleOpenQrModal = (row: Consignment) => {
        if (row.code && row.name) {
            // const fullUrl = `${QR_BASE_URL}${row.code}`; // ساخت آدرس
            const fullUrl = `${QR_BASE_URL}?id=${row.id}&code=${row.code}`;

            // setQrData({ code: row.code, name: row.name, url: fullUrl }); // افزودن url
            setQrData({
                id: row.id, // 👈 اینجا id را تنظیم می‌کنیم
                code: row.code,
                name: row.name,
                url: fullUrl
            });
            setOpenQrModal(true);
        } else {
            showAlert('QR Kod oluşturmak için Kod ve Ad bilgisi eksik.', 'warning');
        }
        handleCloseMenu();
    };

    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconBox width={24} height={24} />
                        <Typography variant="h5" mb={0}>{editingId ? 'Mal Kaydını Düzenle' : 'Yeni Mal Kaydı'}</Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni kayıt formunu aç" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>Yeni Kayıt Ekle</BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizle" : ""}>
                                <Button variant="contained" color="error" onClick={resetForm} startIcon={<IconX size={20} />}>Gizle</Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2}>

                            {/* Consignment Name */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Mal Kayıt İsmi</CustomFormLabel>
                                <CustomTextField placeholder="Adı Girin" size="small" fullWidth value={consignmentName}

                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        setConsignmentName(e.target.value);
                                        if (nameError) setNameError(false);
                                    }}
                                    inputRef={nameInputRef} error={nameError}
                                    helperText={nameError ? 'Bu alan zorunludur!' : ''}

                                />
                            </Grid>

                            {/* Place Kind Selector */}
                            <Grid item xs={12} sm={4}>
                                <CustomFormLabel required>Yer Türü</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }}>
                                    <InputLabel id="sel-placekind">Yer Türü Seçin</InputLabel>
                                    <Select labelId="sel-placekind" label="Yer Türü Seçin" value={placeKind}
                                        onChange={(e) => setPlaceKind(e.target.value as PlaceKind)}>
                                        <MuiMenuItem value="CENTER">Merkez</MuiMenuItem>
                                        <MuiMenuItem value="WAREHOUSE">Depo</MuiMenuItem>
                                        <MuiMenuItem value="WORKHOUSE">Şantiye</MuiMenuItem>
                                        <MuiMenuItem value="WORKHOUSE_STORE">Şantiyenin Deposu</MuiMenuItem>
                                        <MuiMenuItem value="FILO">Filo</MuiMenuItem>
                                    </Select>

                                </FormControl>
                            </Grid>

                            {/* Dynamic Place Selectors (Depo) */}
                            {/* کد جایگزین با Autocomplete: */}
                            {placeKind === 'WAREHOUSE' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Depo</CustomFormLabel>
                                    <Autocomplete
                                        // 1. لیست گزینه‌ها
                                        options={warehousesList}
                                        // 2. تنظیمات کلیدی
                                        getOptionLabel={(option) => option.name}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        // 3. مقدار فعلی
                                        value={warehousesList.find(w => w.id === selectedWarehouseId) || null}
                                        // 4. تغییر مقدار
                                        onChange={(_, newValue) => {
                                            const newId = newValue ? newValue.id : '';
                                            setSelectedWarehouseId(newId);
                                            if (placeError) setPlaceError(false);
                                        }}
                                        // 5. نمایش TextField
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Depo Seçin"
                                                size="small"
                                                fullWidth
                                                // 💡 حالت خطا برای اعتبارسنجی
                                                error={placeError}
                                                helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}

                            {/* Dynamic Place Selectors (Şantiye) */}
                            {placeKind === 'WORKHOUSE' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Şantiye</CustomFormLabel>
                                    <Autocomplete
                                        options={workhousesList}
                                        size="small"
                                        // یافتن مقدار فعلی بر اساس ID ذخیره شده در State
                                        value={workhousesList.find(w => w.id === selectedWorkhouseId) || null}
                                        getOptionLabel={(option) => option.name}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}
                                        onChange={(_, newValue) => {
                                            const newId = newValue ? newValue.id : '';
                                            setSelectedWorkhouseId(newId);
                                            if (placeError) setPlaceError(false);
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Şantiye Seçin"
                                                error={placeError}
                                                helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}

                            {/* Dynamic Place Selectors (Şantiyenin Deposu) */}
                            {placeKind === 'WORKHOUSE_STORE' && (
                                <>
                                    {/* Şantiye (İlişkili) - این فیلد باید Autocomplete باشد تا به راحتی انتخاب شود */}
                                    <Grid item xs={12} sm={4}>
                                        <CustomFormLabel required>Şantiye (İlişkili)</CustomFormLabel>
                                        <Autocomplete
                                            options={workhousesList}
                                            size="small"
                                            value={workhousesList.find(w => w.id === selectedWorkhouseId) || null}
                                            getOptionLabel={(option) => option.name}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                            onChange={(_, newValue) => {
                                                const newId = newValue ? newValue.id : '';
                                                setSelectedWorkhouseId(newId);
                                                // 💡 با تغییر شانتيه، Depo باید ریست شود
                                                setSelectedStoreId('');
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Şantiye Seçin" />
                                            )}
                                        />
                                    </Grid>

                                    {/* Şantiyenin Deposu (Stores) - این فیلد وابسته به انتخاب شانتيه است */}
                                    <Grid item xs={12} sm={4}>
                                        <CustomFormLabel required>Şantiyenin Deposu</CustomFormLabel>
                                        <Autocomplete
                                            options={storesList}
                                            size="small"
                                            // 💡 در حالت ویرایش، اگر storesList هنوز لود نشده باشد، آیتم موجود را نشان می‌دهد
                                            value={storesList.find(s => s.id === selectedStoreId) || null}
                                            getOptionLabel={(option) => option.name}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                            onChange={(_, newValue) => {
                                                const newId = newValue ? newValue.id : '';
                                                setSelectedStoreId(newId);
                                                if (placeError) setPlaceError(false);
                                            }}
                                            disabled={!selectedWorkhouseId || storesList.length === 0}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Depo Seçin"
                                                    error={placeError}
                                                    helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                                />
                                            )}
                                        />
                                        {selectedWorkhouseId && storesList.length === 0 && (
                                            <Typography variant="caption" sx={{ ml: 1.5, mt: 0.5 }} color="warning.main">Seçili şantiyeye ait depo bulunamadı.</Typography>
                                        )}
                                    </Grid>
                                </>
                            )}

                            {placeKind === 'FILO' && (
                                <Grid item xs={12} sm={4}>
                                    <CustomFormLabel required>Filo Depo</CustomFormLabel>
                                    <Autocomplete
                                        options={carWarehousesList}
                                        size="small"
                                        getOptionLabel={(option) => `${option.name}`}
                                        value={carWarehousesList.find(w => w.id === selectedCarWarehouseId) || null}
                                        isOptionEqualToValue={(option, value) => option.id === value.id}

                                        onChange={(_, newValue) => {
                                            // 💡 ID ذخیره شده در State شما number است
                                            const newId = newValue ? newValue.id : '';
                                            setSelectedCarWarehouseId(newId);
                                            if (placeError) setPlaceError(false);
                                        }}

                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Filo Depo Seçin"
                                                error={placeError}
                                                helperText={placeError ? 'Bu alan zorunludur!' : ''}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}
                            <Grid item xs={12} sm={12}>
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <CustomTextField placeholder="Açıklama Girin" size="small"
                                    fullWidth value={description}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                                    multiline rows={4}
                                />
                            </Grid>
                            {/* Attachments (for Images only) */}
                            <Grid item xs={12} >
                                <CustomFormLabel>Ekler (Sadece Resim)</CustomFormLabel>
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
                                    {editingId !== null ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili kaydı güncelle" : ""}>
                                                <Button variant="contained" color="info" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : 'Düzenle'}</Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni kayıt moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : (
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni kayıt ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : 'Yeni Kayıt Ekle'}</Button>
                                                </CustomTooltip>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>
                )}
            </div>
            <BlankCard>
                <>
                    {alertMessage && (
                        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                            <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                        </Stack>
                    )}
                </>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <BlinkingButton variant="contained" color="secondary" onClick={handleOpenDownloadFilteredModal} isBlinking={true} disabled={loadingData} startIcon={<IconFileDownload />}>Filtrelenmişi İndir</BlinkingButton>
                        )}
                        {hasDownloadPermission && (
                            <Button variant="contained" color="primary" onClick={handleOpenDownloadAllModal} startIcon={<IconFileDownload />} disabled={loadingData}>Tümünü İndir</Button>
                        )}
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleOpenStatusModal}
                            startIcon={<IconBox />}
                            size="small"
                        >
                            Mal Durumlarını Görüntüle
                        </Button>
                    </Stack>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ara (Ad / Kod / Yer)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>

                        {/* NEW: Date Filters (Start Date) */}
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Kayıt Başlangıç"
                                    value={startFilter}
                                    onChange={(v) => { setStartFilter(v); setPage(0); }}
                                    inputFormat="dd/MM/yyyy"
                                    renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                />
                            </LocalizationProvider>
                        </Grid>

                        {/* NEW: Date Filters (End Date) */}
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Kayıt Bitiş"
                                        value={endFilter}
                                        inputFormat="dd/MM/yyyy"
                                        minDate={startFilter || undefined} // Min date should be the start date
                                        onChange={(v) => { setEndFilter(v); setPage(0); }}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters"><IconX size={20} /></IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} aria-label="Durum filtresi" sx={{ flexGrow: 1 }}>
                                <StyledToggleButton value="all" data-value="all">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active" data-value="active">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive" data-value="inactive">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>

                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress />
                            <Typography variant="h6" sx={{ ml: 2 }}>Kayıtlar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="consignments table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>

                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Kod</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Mal Adı</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>

                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Yer Türü</Typography></StyledTableCell>

                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'placeName'} direction={orderBy === 'placeName' ? order : 'asc'} onClick={() => handleRequestSort('placeName')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Yer</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Kayıt Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>


                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Ekler</Typography></StyledTableCell>

                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>{row.code || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.name || '-'}</StyledTableCell>
                                            <StyledTableCell>
                                                {row.placeKind === 'WAREHOUSE' ? 'Depo' :
                                                    row.placeKind === 'WORKHOUSE' ? 'Şantiye' :
                                                        row.placeKind === 'WORKHOUSE_STORE' ? 'Şantiyenin Deposu' :
                                                            row.placeKind === 'FILO' ? 'Filo' :
                                                                row.placeKind === 'CENTER' ? 'Merkaz' : '-'}
                                            </StyledTableCell>
                                            <StyledTableCell>{row.placeName}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.createAt || null)}</StyledTableCell>
                                            {/* <StyledTableCell sx={{ maxWidth: 200, verticalAlign: 'top' }}>
                                                <Box sx={{
                                                    maxHeight: '5em',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                }}>
                                                    <div dangerouslySetInnerHTML={{ __html: row.description }} />
                                                </Box>
                                                {row.description.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                            handleOpenDescriptionModal(row.description);
                                                        }}>
                                                            Açıklamanı Oku
                                                        </Button>
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
                                            <StyledTableCell>
                                                {row.attachments && row.attachments.length > 0 ? (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                        <IconButton onClick={() => handleOpenAttachmentsModal(row)} size="small">
                                                            <IconLink size={18} /><Chip label={row.attachments.length} color="primary" size="small" sx={{ ml: 1 }} />
                                                        </IconButton>
                                                    </CustomTooltip>
                                                ) : (<Typography variant="body2" color="textSecondary">-</Typography>)}
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton onClick={(e) => handleClickMenu(e, row)}><IconDots width={18} /></IconButton>
                                                </CustomTooltip>
                                                <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>

                                                    {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasDeletePermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}>
                                                            <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kaydı indir" : ""}>
                                                            <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {(selectedRowForMenu?.code && hasDownloadPermission) && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydın QR Kodunu indir" : ""}>

                                                            <MuiMenuItem onClick={() => handleOpenQrModal(selectedRowForMenu as Consignment)}>
                                                                <ListItemIcon>
                                                                    <IconQrcode width={18} />
                                                                </ListItemIcon>
                                                                QR Kod İndir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {/* {(
                                                        selectedRowForMenu?.attachments.length || 0) > 0 &&
                                                         hasDownloadPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Malzeme bilgilerini ve resimleri PDF olarak indir" : ""}>
                                                            <MuiMenuItem onClick={handleDownloadRowWithImages}>
                                                                <ListItemIcon><IconFileText width={18} /></ListItemIcon>
                                                                Mal ve Resim PDF İndir
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )} */}
                                                    {(selectedRowForMenu) && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kayıt detaylarını ve eklerini görüntüle" : ""}>
                                                            <MuiMenuItem onClick={() => handleOpenAttachmentsModal(selectedRowForMenu!)}>
                                                                <ListItemIcon><IconDownload width={18} /></ListItemIcon>
                                                                Detayları ve Ekleri Görüntüle ({selectedRowForMenu.attachments.length})
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={7} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kayıt bulunamadı.</Typography></StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredConsignments.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>



            {/* Download Modals */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAll('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAll('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadFiltered('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadFiltered('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseDownloadFilteredModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openQrModal} onClose={() => { setOpenQrModal(false); setQrData(null); }} maxWidth="sm" fullWidth>
                <DialogTitle>🎉 Yeni Kayıt Başarıyla Eklendi!</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                    {qrData && (
                        <>
                            <Typography variant="h6" gutterBottom>Mal Kayıt İsmi: {qrData.name}</Typography>
                            <Typography variant="body1" color="textSecondary" mb={2}>Kod: {qrData.code}</Typography>

                            <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 2, mb: 3 }}>
                                <QRCodeCanvas
                                    id="qr-code-canvas"
                                    value={qrData.url} // 👈 استفاده از آدرس کامل
                                    size={200}
                                    level="H"
                                />
                            </Box>

                            <Stack direction="row" spacing={2} justifyContent="center" width="100%">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<IconFileText />}
                                    onClick={() => downloadQRCodeAsPDF(qrData.code, qrData.name)}
                                    disabled={downloadLoading}
                                >
                                    {downloadLoading ? <CircularProgress size={20} color="inherit" /> : 'PDF İndir'}
                                </Button>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    startIcon={<IconFileDownload />}
                                    onClick={() => downloadQRCodeAsPNG('qr-code-canvas', `QRCode_${qrData.code}.png`)}
                                    disabled={downloadLoading}
                                >
                                    PNG İndir
                                </Button>
                            </Stack>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenQrModal(false); setQrData(null); }} color="error" variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>




            <Dialog
                open={openDescriptionModal}
                onClose={handleCloseDescriptionModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText>
                        <div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} />
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDescriptionModal} color="primary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>


            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="lg" fullWidth>

                {/* ⭐️ عنوان کلی مودال ⭐️ */}
                <DialogTitle sx={{ bgcolor: 'primary.light', color: 'primary.main', py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconBox />
                        <Typography variant="h6">Mal Kayıt Detayları ve Ekler</Typography>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0, height: { xs: 'auto', md: 700 }, overflowX: 'hidden' }}>

                    <Grid container spacing={0} sx={{ height: { xs: 'auto', md: '100%' } }}>

                        {/* ⭐️⭐️ ستون سمت چپ: اطلاعات کامل (5/12) ⭐️⭐️ */}
                        <Grid item
                            xs={12}
                            md={5}
                            sx={{
                                borderRight: { xs: 'none', md: '1px solid #eee' },
                                bgcolor: '#fcfcfc',
                                overflowY: 'auto'
                            }}
                        >
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h5" mb={3} color="primary.dark">Genel Bilgiler</Typography>

                                {/* ⭐️ اطلاعات یکجا شده در ستون چپ ⭐️ */}
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Mal Adı:</Typography>
                                        <Typography variant="subtitle1" gutterBottom>{rowForAttachments?.name || '-'}</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Kod:</Typography>
                                        <Chip label={rowForAttachments?.code || '-'} color="secondary" size="medium" sx={{ mb: 1 }} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Yer:</Typography>
                                        <Typography variant="body2">{rowForAttachments?.placeName} ({getPlaceKindText(rowForAttachments?.placeKind || 'UNKNOWN')})</Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Kayıt Tarihi:</Typography>
                                        <Typography variant="body2">{formatDateDisplay(rowForAttachments?.createAt || null)}</Typography>
                                    </Grid>
                                </Grid>

                                {/* Açıklama */}
                                <Box mt={3} p={2} sx={{ bgcolor: '#eee', borderRadius: 1 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Açıklama:</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{rowForAttachments?.description || 'Açıklama yok'}</Typography>
                                </Box>

                            </Box>
                        </Grid>

                        {/* ⭐️⭐️ ستون سمت راست: اسلایدر (7/12) ⭐️⭐️ */}
                        <Grid item xs={12} md={7} sx={{ height: { xs: 400, md: '100%' } }}>

                            {attachmentsToView.length > 0 ? (
                                <ImageSlideAndHoverDownload
                                    attachments={attachmentsToView}
                                    currentSlideIndex={currentSlideIndex}
                                    handlePrevSlide={handlePrevSlide}
                                    handleNextSlide={handleNextSlide}
                                    handleDownloadClick={handleDownloadClick}
                                />
                            ) : (
                                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: '#fafafa' }}>
                                    <Typography variant="h6" color="textSecondary">Bu kayıt için ekli resim bulunmamaktadır.</Typography>
                                </Box>
                            )}
                        </Grid>

                    </Grid>

                </DialogContent>

                <DialogActions>
                    <Button onClick={() => setOpenAttachmentsModal(false)} color="error" variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openStatusModal} onClose={() => setOpenStatusModal(false)} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', p: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" px={3} py={1.5}>
                        <Typography variant="h6">Malzeme Durum Takibi</Typography>
                        <IconButton onClick={() => setOpenStatusModal(false)} sx={{ color: 'white' }}><IconX /></IconButton>
                    </Stack>
                    <Tabs
                        value={statusTab}
                        onChange={(_, nv) => setStatusTab(nv)}
                        textColor="inherit"
                        indicatorColor="secondary"
                        variant="fullWidth"
                        sx={{ bgcolor: 'primary.dark' }}
                    >
                        <Tab label="Emanetteki Mallar (Kullanımda)" />
                        <Tab label="Mevcut Mallar (Boşta)" />
                    </Tabs>
                </DialogTitle>

                <DialogContent dividers>
                    {loadingStatus ? (
                        <Box display="flex" flexDirection="column" alignItems="center" p={5}>
                            <CircularProgress size={40} />
                            <Typography sx={{ mt: 2 }}>Veriler yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Box sx={{ mt: 2 }}>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: statusTab === 0 ? '#fff5f5' : '#f5fff5' }}>
                                        <TableRow>
                                            <TableCell>Kod</TableCell>
                                            <TableCell>Mal Adı</TableCell>
                                            <TableCell>Açıklama</TableCell>
                                            <TableCell>Durum</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(statusTab === 0 ? inUsedConsignments : availableConsignments).map((item) => (
                                            <TableRow key={item.Id} hover>
                                                <TableCell><Chip label={item.Code} size="small" variant="outlined" /></TableCell>
                                                <TableCell><b>{item.Name}</b></TableCell>
                                                <TableCell>{item.Description || '-'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={statusTab === 0 ? "Emanette" : "Mevcut"}
                                                        color={statusTab === 0 ? "error" : "success"}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(statusTab === 0 ? inUsedConsignments : availableConsignments).length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">
                                                    <Typography sx={{ py: 2 }} color="textSecondary">Kayıt bulunamadı.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusModal(false)} color="inherit" variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>


            {/* Delete Modal */}
            <DeleteConsignment
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={deleteName}
                onDeleteSuccess={fetchConsignments}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListConsignments;