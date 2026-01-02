import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Chip,
    DialogContentText,
    Autocomplete,
} from '@mui/material';
import { keyframes, styled, useTheme } from '@mui/material/styles';
import BlankCard from 'src/components/shared/BlankCard';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import {
    IconDots,
    IconTrash, IconSearch,
    IconFileSpreadsheet, IconFileText, IconX, IconFileDownload,
    IconLink, IconDownload, IconFile
} from '@tabler/icons-react';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';

// Import local components and utilities (assuming these paths exist)
import DeletePersonnelConsigneds from './DeletePersonnelConsigneds';

import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';


type RecordStatus = 0 | 1;
interface PersonnelType {
    id: number; name: string; family: string; identityNumber: string; recordStatus: RecordStatus;
    workEndDate: string | null;
}
interface ConsignmentType { id: number; name: string; code: string; }



interface AttachmentType { fileUrl: string; }

interface PersonnelConsignmentPersonnel {
    id: string;
    name: string; family: string; identityNumber: string;
}

interface PersonnelConsignmentConsignment {
    id: string;
    name: string; code: string;
}

interface PersonnelConsigned {
    id: number;
    assignmentDate: string;
    createAt: string;
    description: string;
    returnDate: string | null;
    attachments: AttachmentType[];
    consignment: PersonnelConsignmentConsignment | null;
    personnel: PersonnelConsignmentPersonnel | null;
    parentId: number;
    recordStatus: RecordStatus;
    personnelName: string;
    consignmentNameWithCode: string;
    consignmentCode: string;
}

interface PersonnelConsignedPayload {
    id?: number;
    assignmentDate: string;
    description: string;
    attachments: AttachmentType[];
    consignmentId: number;
    personnelId: number;
    parentId: number | null;
    returnDate: string | null;
}

type SortableKeys = 'id' | 'assignmentDate' | 'personnelName' | 'consignmentCode' | 'createAt';


// --- Helper Functions and Styles (from previous file, keeping for context) ---
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        // Display only date
        return format(date, 'dd/MM/yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    "&.Mui-selected": { color: "white" },
    "&.Mui-selected[data-value='all']": { backgroundColor: theme.palette.primary.main, "&:hover": { backgroundColor: theme.palette.primary.dark } },
    "&.Mui-selected[data-value='active']": { backgroundColor: theme.palette.success.main, "&:hover": { backgroundColor: theme.palette.success.dark } },
    "&.Mui-selected[data-value='inactive']": { backgroundColor: theme.palette.error.main, "&:hover": { backgroundColor: theme.palette.error.dark } },
    "&:not(.Mui-selected)": { color: theme.palette.text.primary, borderColor: theme.palette.divider, "&:hover": { backgroundColor: theme.palette.action.hover } },
}));

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '0.9rem' },
}));

const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.02); box-shadow: 0 0 8px 4px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));

// --- Sorting Helpers (unchanged) ---
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

// --- Consignment File Upload Component (Simplified for brevity and focus on core logic) ---
const ConsignmentFileUpload: React.FC<{
    files: File[];
    setFiles: (f: File[]) => void;
    error: boolean;
    currentAttachments?: AttachmentType[];
    setCurrentAttachments?: (a: AttachmentType[]) => void;
}> = ({ files, setFiles, error, currentAttachments = [], setCurrentAttachments }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supportedTypes = "image/*, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleRemoveNewFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleRemoveExistingFile = (index: number) => {
        if (setCurrentAttachments) {
            setCurrentAttachments(currentAttachments.filter((_, i) => i !== index));
        }
    };

    const getFileName = (fileUrl: string, index: number) => {
        const rawFileName = fileUrl.split('/').pop() || `Dosya ${index + 1}`;
        try {
            return decodeURIComponent(rawFileName.replace(/\+/g, ' '));
        } catch (e) {
            return rawFileName;
        }
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
                <Button size="small" variant="outlined" startIcon={<IconFile />} onClick={() => fileInputRef.current?.click()}>
                    Dosya Seç ({files.length + currentAttachments.length})
                </Button>
                {/* 🆕 نمایش فایل‌های موجود */}
                {currentAttachments.map((attachment, index) => (
                    <Chip
                        key={`existing-${index}`}
                        label={getFileName(attachment.fileUrl, index)}
                        onDelete={() => handleRemoveExistingFile(index)}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ m: 0.5 }}
                    />
                ))}
                {/* نمایش فایل‌های جدید */}
                {files.map((file, index) => (
                    <Chip key={index} label={file.name} onDelete={() => handleRemoveNewFile(index)} size="small" color="primary" sx={{ m: 0.5 }} />
                ))}
            </Stack>
            {error && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Lütfen en az bir dosya seçin veya hatayı düzeltin.</Typography>}
        </Box>
    );
};

// --- Main Component ---
const ListPersonnelConsigneds: React.FC = () => {
    const navigate = useNavigate();
    const { allowedOperations } = useAuth();
    const { isTooltipGloballyEnabled } = useTooltip();
    const theme = useTheme();

    // Permissions (assuming similar system as previous component)
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // ------------------------------------
    // States: Data Lists & Main List
    // ------------------------------------
    const [personnelConsigneds, setPersonnelConsigneds] = useState<PersonnelConsigned[]>([]);
    const [personnelList, setPersonnelList] = useState<PersonnelType[]>([]);
    // 💡 تغییر: consignmentList اکنون مستقیماً کالاهای قابل واگذاری (Available) را ذخیره می‌کند
    const [consignmentList, setConsignmentList] = useState<ConsignmentType[]>([]);
    // لیست کالاهایی که پرسنل می‌تواند بازگرداند (فقط برای حالت IADE)
    const [returnableConsignmentList, setReturnableConsignmentList] = useState<ConsignmentType[]>([]);


    // ------------------------------------
    // States: Form & UI & Tracking
    // ------------------------------------
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isAssignmentMode, setIsAssignmentMode] = useState<boolean>(true);
    const [selectedParentConsignedId, setSelectedParentConsignedId] = useState<number | ''>('');

    const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | ''>('');
    const [selectedConsignmentId, setSelectedConsignmentId] = useState<number | ''>('');
    const [assignmentDate, setAssignmentDate] = useState<Date | null>(new Date());
    const [returnDate, setReturnDate] = useState<Date | null>(null);
    const [description, setDescription] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // فایل‌های جدید برای واگذاری/برگشت

    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isBlinking, setIsBlinking] = useState<boolean>(true);

    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Form Errors
    const [personnelError, setPersonnelError] = useState(false);
    const [consignmentError, setConsignmentError] = useState(false);
    const [assignmentDateError, setAssignmentDateError] = useState(false);
    const [returnDateError, setReturnDateError] = useState(false);
    const [attachmentError, setAttachmentError] = useState(false);
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]); // پیوست‌های موجود (فقط برای نمایش در فرم ویرایش)


    const [lastRecordDetail, setLastRecordDetail] = useState<PersonnelConsigned | null>(null);
    const [openLastRecordModal, setOpenLastRecordModal] = useState(false);

    const [pendingRecordDetails, setPendingRecordDetails] = useState<{ personnelId: number, consignmentId: number, isReturn: boolean } | null>(null);

    // ------------------------------------
    // States: Table/Filter (standard)
    // ------------------------------------
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableKeys>('createAt');
    const [order, setOrder] = useState<'desc' | 'asc'>('desc');
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);

    // ------------------------------------
    // States: Menu/Modals (standard)
    // ------------------------------------
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<PersonnelConsigned | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<PersonnelConsigned | null>(null);

    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [currentAttachmentsModal, setCurrentAttachmentsModal] = useState<AttachmentType[]>([]);

    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const [openAttachModal, setOpenAttachModal] = useState(false);
    const [rowToUpdateAttachments, setRowToUpdateAttachments] = useState<PersonnelConsigned | null>(null);
    const [attachFiles, setAttachFiles] = useState<File[]>([]);
    const [attachCurrentAttachments, setAttachCurrentAttachments] = useState<AttachmentType[]>([]);
    const [attachButtonLoading, setAttachButtonLoading] = useState(false);
    const [attachError, setAttachError] = useState(false);

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
    const fetchPersonnelList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        setLoadingData(true);
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.data.httpStatusCode === 200) {
                const list: PersonnelType[] = (res.data?.data ?? [])
                    // .filter((p: any) => p.hasISG === true && (!p.workEndDate || p.workEndDate === null))
                    .filter((p: any) => (!p.workEndDate || p.workEndDate === null))
                    .map((x: any) => ({
                        id: Number(x.id),
                        name: x.name,
                        family: x.family,
                        identityNumber: x.identityNumber,
                        recordStatus: Number(x.recordStatus ?? 0) as RecordStatus,
                        workEndDate: x.workEndDate ? String(x.workEndDate).slice(0, 10) : null,
                    }));
                setPersonnelList(list);

                if (list.length === 0) {
                    setLoadingData(false);
                    setPersonnelConsigneds([]); // مطمئن شویم لیست اصلی هم خالی است
                }
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Personel listesi yüklenirken bir hata oluştu.', 'error');

            setLoadingData(false);
        }
    }, [navigate]);

    // 💡 تابع جدید برای واکشی کالاهای قابل واگذاری
    const fetchAvailableConsignmentList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            // فراخوانی API جدید: get-available-consignments
            const res = await axios.get(`${server.baseurl}${server.hr}get-available-consignments`,
                { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                setConsignmentList(res.data.data.map((item: any) => ({
                    // استفاده از فیلدهای JSON نمونه با حروف بزرگ
                    id: Number(item.Id),
                    name: item.Name,
                    code: item.Code || 'KODSUZ',
                })) as ConsignmentType[]);
            } else { showAlert(res.data.message || 'Kullanılabilir Mal listesi yüklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Mal listesi yüklenirken sunucu hatası oluştu.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Kullanılabilir Mal listesi yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchReturnableConsignments = useCallback(async (personnelId: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !personnelId) {
            setReturnableConsignmentList([]);
            return;
        }
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-consignments-for-personnel-return/${personnelId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.data.httpStatusCode === 200) {
                const mappedData = res.data.data.map((item: any) => ({
                    id: Number(item.id),
                    name: item.name,
                    code: item.code || 'KODSUZ',
                })) as ConsignmentType[];

                setReturnableConsignmentList(mappedData);

            } else {
                setReturnableConsignmentList([]);
                showAlert(res.data.message || 'İade edilebilir mal listesi yüklenirken hata oluştu.', 'warning');
            }
        } catch (e: any) {
            setReturnableConsignmentList([]);
            console.error("Returnable consignments fetch error:", e);
        }
    }, [showAlert]);


    const fetchPersonnelConsigneds = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnel-consigneds`,
                { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                const rawRows: PersonnelConsigned[] = (res.data.data as any[]).map((r) => {
                    const personnel = r.personnel;
                    const consignment = r.consignment;

                    return {
                        id: Number(r.id),
                        assignmentDate: r.assignmentDate,
                        createAt: r.createAt,
                        description: r.description || '-',
                        returnDate: r.returnDate || null,
                        attachments: (r.attachments as any[]).map(a => ({ fileUrl: a.fileUrl })) as AttachmentType[],

                        consignment: consignment,
                        personnel: personnel,

                        parentId: Number(r.parentId || 0),
                        recordStatus: Number(r.recordStatus || 0) as RecordStatus,

                        personnelName: personnel ? `${personnel.name} ${personnel.family} (${personnel.identityNumber})` : 'Bilinmeyen Personel',
                        consignmentNameWithCode: consignment ? `${consignment.name} (${consignment.code})` : 'Bilinmeyen Ambar',
                        consignmentCode: consignment?.code || '-',
                    } as PersonnelConsigned;
                });

                setPersonnelConsigneds(rawRows);
            }
        }
        catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Zimmet kayıtları yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);


    const availableConsignmentList = useMemo(() => {
        // این لیست فقط برای حالت ZIMMET VER (ASSIGN) استفاده می‌شود
        if (isAssignmentMode) {
            return consignmentList;
        }
        return [];
    }, [consignmentList, isAssignmentMode]);

    // لیست کمکی برای یافتن parentId در حالت IADE (بدون تغییر)
    const activeConsignedsForReturnMapping = useMemo(() => {
        const personnelId = Number(selectedPersonnelId);
        if (!personnelId || !personnelConsigneds.length) return [];

        // فیلتر کردن رکوردهای واگذاری فعال برای پرسنل انتخاب شده
        return personnelConsigneds.filter(r => {
            const matchPersonnel = Number(r.personnel?.id) === personnelId;
            const isActiveAssignment = r.parentId === 0 && r.returnDate === null;
            return matchPersonnel && isActiveAssignment;
        });
    }, [personnelConsigneds, selectedPersonnelId]);


    // **Step 1: Fetch Reference Lists**
    useEffect(() => {
        fetchPersonnelList();
        // 💡 فراخوانی تابع جدید
        fetchAvailableConsignmentList();
    }, [fetchPersonnelList, fetchAvailableConsignmentList]);

    useEffect(() => {
        if (personnelList.length > 0) {
            fetchPersonnelConsigneds();
        } else {
            setLoadingData(false);
        }
    }, [fetchPersonnelConsigneds, personnelList]);


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
                server.baseurl + server.baseinfo + "upload-files", // 'server.baseinfo' is assumed to be the correct endpoint base
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


    const validateForm = (): boolean => {
        let ok = true;
        setPersonnelError(false); setConsignmentError(false); setAssignmentDateError(false);
        setReturnDateError(false);
        setAttachmentError(false);

        if (!selectedPersonnelId) { setPersonnelError(true); ok = false; }
        if (!selectedConsignmentId) { setConsignmentError(true); ok = false; }

        if (isAssignmentMode) {
            if (!assignmentDate) { setAssignmentDateError(true); ok = false; }
        } else {
            // In Return Mode
            if (!returnDate) { setReturnDateError(true); ok = false; }
            if (!selectedParentConsignedId) {
                // اگر parentId پیدا نشد (یعنی کالا انتخاب نشده)
                setConsignmentError(true);
                ok = false;
            }
        }

        if (!ok) showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
        return ok;
    };

    const resetForm = () => {
        setEditingId(null);
        setIsAssignmentMode(true);
        setSelectedParentConsignedId('');
        setSelectedPersonnelId('');
        setSelectedConsignmentId('');
        setAssignmentDate(new Date());
        setReturnDate(null);
        setDescription('');
        setSelectedFiles([]);
        setCurrentAttachments([]);
        setReturnableConsignmentList([]); // ریست لیست IADE

        setPersonnelError(false); setConsignmentError(false); setAssignmentDateError(false);
        setReturnDateError(false);
        setAttachmentError(false);
        setIsFormVisible(false);
    };

    // تابع برای یافتن parentId بر اساس consignmentId (فقط در حالت IADE نیاز است)
    const getParentIdForReturn = (consignmentId: number | '') => {
        if (!consignmentId) return '';

        // تطبیق consignmentId انتخاب شده با رکوردهای فعال واگذاری
        const activeRecord = activeConsignedsForReturnMapping.find(r => Number(r.consignment?.id) === Number(consignmentId));

        return activeRecord ? activeRecord.id : '';
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
            if (fileUrls === null) { setLoadingButton(false); return; } // Upload failed
        }

        const finalAttachments = [
            ...currentAttachments,
            ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])
        ];

        const isReturning = !isAssignmentMode;
        const isEditing = editingId !== null && isAssignmentMode;

        const url = isEditing
            ? `${server.baseurl}${server.hr}update-personnel-consigned`
            : `${server.baseurl}${server.hr}create-personnel-consigned`;
        const method = isEditing ? 'put' : 'post';

        // 💡 محاسبه parentId و returnDate نهایی
        const finalParentId = isReturning ? getParentIdForReturn(selectedConsignmentId) : 0;

        if (isReturning && !finalParentId) {
            showAlert('İade edilecek aktif zimmet kaydı bulunamadı.', 'error');
            setLoadingButton(false);
            return;
        }

        // 💡 تنظیم assignmentDate در حالت برگشت به تاریخ روز
        const payload: PersonnelConsignedPayload = {
            assignmentDate: isReturning ? format(new Date(), 'yyyy-MM-dd') : (assignmentDate ? format(assignmentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
            description: description.trim(),
            attachments: finalAttachments,
            consignmentId: Number(selectedConsignmentId),
            personnelId: Number(selectedPersonnelId),

            parentId: Number(finalParentId),
            returnDate: isAssignmentMode ? null : (returnDate ? format(returnDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
        };
        if (isEditing) (payload as any).id = Number(editingId);
        debugger

        try {
            const res = await axios.request({
                method, url, data: payload,
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });

            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(
                    `Kayıt başarıyla ${isReturning ? 'teslim edildi' : isEditing ? 'güncellendi' : 'eklendi'}!`,
                    'success'
                );
                const submissionDetails = {
                    personnelId: Number(selectedPersonnelId),
                    consignmentId: Number(selectedConsignmentId),
                    isReturn: isReturning,
                };

                fetchPersonnelConsigneds();
                setPendingRecordDetails(submissionDetails);
                resetForm();
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'İşlem sırasında bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    // Effect برای واکشی کالاهای قابل برگشت هنگام تغییر پرسنل در حالت IADE (بدون تغییر)
    useEffect(() => {
        if (!isAssignmentMode && selectedPersonnelId) {
            const personnelId = Number(selectedPersonnelId);
            fetchReturnableConsignments(personnelId);
        } else if (isAssignmentMode) {
            setReturnableConsignmentList([]); // ریست در حالت ASSIGN
        }
    }, [isAssignmentMode, selectedPersonnelId, fetchReturnableConsignments]);


    useEffect(() => {
        if (pendingRecordDetails && personnelConsigneds.length > 0) {
            const lastSubmittedRecord = personnelConsigneds
                .sort(getComparator('desc', 'createAt'))
                .find(r =>
                    Number(r.personnel?.id) === pendingRecordDetails.personnelId &&
                    Number(r.consignment?.id) === pendingRecordDetails.consignmentId &&
                    (pendingRecordDetails.isReturn ? r.returnDate !== null : r.returnDate === null)
                );

            if (lastSubmittedRecord) {
                setLastRecordDetail(lastSubmittedRecord);
                setOpenLastRecordModal(true);
                setPendingRecordDetails(null);
            }
        }
    }, [personnelConsigneds, pendingRecordDetails, getComparator, setLastRecordDetail]);


    const handleOpenAttachmentsModal = (attachments: AttachmentType[]) => {
        setCurrentAttachmentsModal(attachments);
        setOpenAttachmentsModal(true);
    };

    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };


    // --- Table & Filter Logic ---
    const isFilterActive = useMemo(() => !!searchTerm.trim() || statusFilter !== 'all' || startFilter !== null || endFilter !== null, [searchTerm, statusFilter, startFilter, endFilter]);

    const filteredConsigneds = useMemo(() => {
        const list = personnelConsigneds.filter(r => {
            // 1. Search Filter
            const matchesSearch = r.personnelName.toLowerCase().includes(searchTerm.toLowerCase()) || r.consignmentNameWithCode.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase());

            // 2. Status Filter: Active (assignment only), Inactive (return or deleted), All
            const isActive = r.parentId === 0 && r.returnDate === null; // Considered active if it's an assignment and not returned/deleted
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && isActive) || (statusFilter === 'inactive' && !isActive);

            // 3. Date Filter
            const cDate = r.createAt ? new Date(r.createAt) : null;
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) && (!endFilter || (cDate && cDate <= endFilter));

            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [personnelConsigneds, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredConsigneds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredConsigneds, page, rowsPerPage]);


    // Menu Handlers
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: PersonnelConsigned) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const handleClickOpenDeleteModal = () => {
        if (!selectedRowForMenu) return;
        setDeleteId(selectedRowForMenu.id);
        setDeleteName(`${selectedRowForMenu.personnelName} - ${selectedRowForMenu.consignmentNameWithCode}`);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchPersonnelConsigneds(); };

    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setPage(0); };
    const handleStatusFilterChange = (_: React.MouseEvent<HTMLElement>, newFilter: 'all' | 'active' | 'inactive' | null) => { if (newFilter !== null) { setStatusFilter(newFilter); setPage(0); } };
    const handleRequestSort = (property: SortableKeys) => { const isAsc = orderBy === property && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(property); setPage(0); };
    const handleClearDateFilters = () => { setStartFilter(null); setEndFilter(null); };


    const exportToPdf = async (rows: PersonnelConsigned[], isFiltered: boolean) => {
        if (!rows || rows.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

        // @ts-ignore
        const doc = new jsPDF();
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try { docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular); docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal'); } catch (e) { }
        docAny.setFont('NotoSans');

        const columns = ['Personel', 'Mal ', 'Açıklama', 'Veriliş Tarihi', 'Teslim Tarihi'];
        const body = rows.map(r => [
            r.personnelName,
            r.consignmentNameWithCode,
            r.description.substring(0, 30) + (r.description.length > 30 ? '...' : ''),
            formatDateDisplay(r.assignmentDate),
            r.returnDate ? formatDateDisplay(r.returnDate) : '-'
        ]);

        const title = isFiltered ? 'Filtrelenmiş Personel Zimmet Kayıtları Raporu' : 'Tüm Personel Zimmet Kayıtları Raporu';

        autoTable(docAny, {
            head: [columns],
            body: body,
            theme: 'grid',
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: 'NotoSans', fontSize: 9 },
            didDrawPage: (_data: any) => {
                // --- Header Logic ---
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

                // --- Footer Logic (Company Info & Page Numbers) ---
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

        const fileName = isFiltered ? `Filtrelenmis_ZimmetRaporu_${format(new Date(), 'yyyyMMdd')}.pdf` : `Tum_ZimmetRaporu_${format(new Date(), 'yyyyMMdd')}.pdf`;
        docAny.save(fileName);
        showAlert('PDF başarıyla oluşturuldu ve indiriliyor.', 'success');
        setLoadingData(false);
    };

    const exportToExcel = async (rows: PersonnelConsigned[], isFiltered: boolean) => {
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

            // --- Report Title and Date ---
            const titleText = isFiltered ? 'Filtrelenmiş Personel Zimmet Kayıtları Raporu' : 'Tüm Personel Zimmet Kayıtları Raporu';
            worksheet.addRow(['', '', '', '', '', '', '', '']);
            const titleRow = worksheet.addRow([titleText]);
            if (titleRow) { titleRow.font = { name: 'Times New Roman', size: 12, bold: true }; titleRow.getCell(1).alignment = { horizontal: 'center' }; }
            worksheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`); // Merge for 8 columns

            worksheet.addRow([`Tarih: ${formatDateDisplay(new Date().toISOString())}`]);
            const dateRow = worksheet.lastRow;
            if (dateRow) { dateRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: false }; dateRow.getCell(1).alignment = { horizontal: 'left' }; }
            worksheet.addRow([]);


            // --- Table Headers ---
            const tableHeaders = ['Personel', 'Mal ', 'Açıklama', 'Veriliş Tarihi', 'Teslim Tarihi'];
            const headerRow = worksheet.addRow(tableHeaders);
            headerRow.eachCell((cell) => { cell.style = fullHeaderStyle; });

            // --- Table Body ---
            rows.forEach(r => {
                const row = worksheet.addRow([

                    r.personnelName,
                    r.consignmentNameWithCode,
                    r.description,
                    formatDateDisplay(r.assignmentDate),
                    r.returnDate ? formatDateDisplay(r.returnDate) : '-'
                ]);
                row.eachCell((cell) => { cell.style = bodyStyle; });
            });

            // --- Column Sizing ---
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
                column.width = Math.min(Math.max(maxLength + 2, 15), 60);
            });

            // --- Company Info (Footer) ---
            worksheet.addRow([]);
            const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
            companyInfo.forEach(line => {
                const lastRow = worksheet.addRow([line]);
                lastRow.getCell(1).alignment = { horizontal: 'center' };
                lastRow.getCell(1).font = { name: 'Arial', size: 8, bold: false };
                worksheet.mergeCells(`A${lastRow.number}:H${lastRow.number}`);
            });


            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = isFiltered ? `Filtrelenmis_ZimmetRaporu_${format(new Date(), 'yyyyMMdd')}.xlsx` : `Tum_ZimmetRaporu_${format(new Date(), 'yyyyMMdd')}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
        } catch (error) {
            console.error("Excel dışa aktarılırken hata:", error);
            showAlert('Excel dışa aktarılırken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    };

    const createPostSubmissionReportPdf = (record: PersonnelConsigned, showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void) => {
        const title = record.returnDate ? "ZİMMET TESLİM ALMA BELGESİ" : "ZİMMET VERİLİŞ BELGESİ";

        // @ts-ignore
        const doc = new jsPDF("p", "pt", "a4"); // حفظ حالت pt و a4 کد اصلی خودت
        const docAny = doc as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try {
            docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');
        } catch (e) { }

        const sideMargin = 40;
        let finalY = 80;

        // --- چاپ متن‌های اصلی (بدون هیچ تغییری) ---
        doc.setFontSize(12);
        doc.text(`Personel: ${record.personnelName}`, sideMargin, finalY);
        finalY += 16;
        doc.text(`Mal Kaydı: ${record.consignmentNameWithCode}`, sideMargin, finalY);
        finalY += 25;

        doc.setFontSize(14);
        doc.text("İşlem Detayları", sideMargin, finalY);
        finalY += 10;

        const detailBody = [
            ["İşlem Tipi", record.returnDate ? "Teslim Alındı (İADE)" : "Teslim Edildi (EMANET)"],
            ["Veriliş Tarihi", formatDateDisplay(record.assignmentDate)],
            ["Teslim Tarihi", record.returnDate ? formatDateDisplay(record.returnDate) : "—"],
            ["Açıklama", record.description || "-"],
        ];

        autoTable(docAny, {
            startY: finalY,
            head: [["Alan", "Değer"]],
            body: detailBody,
            theme: "grid",
            styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 5, overflow: 'linebreak' },
            headStyles: { fillColor: record.returnDate ? [255, 200, 200] : [200, 255, 200], textColor: [0, 0, 0] },

            // 🔹 هدر و فوتر دقیقاً مطابق ساختار exportToPdf 🔹
            didDrawPage: (_data: any) => {
                // --- Header ---
                try {
                    docAny.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);
                } catch (e) { }

                docAny.setFont('NotoSans', 'normal');
                docAny.setFontSize(14);
                docAny.text(title, pageWidth / 2, 15, { align: 'center' });

                docAny.setFontSize(10);
                docAny.setFont('NotoSans', 'bold');
                docAny.text(`Rapor Tarihi:`, 15, 40);
                docAny.setFont('NotoSans', 'normal');
                docAny.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 40);

                docAny.setLineWidth(0.5);
                docAny.line(15, 52, pageWidth - 15, 52);

                // --- Footer ---
                docAny.setFont('NotoSans', 'normal');
                docAny.setFontSize(8);
                const companyInfo = [
                    'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                    'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                    'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
                ];
                let footerY = pageHeight - 40;
                companyInfo.forEach(line => {
                    docAny.text(line, pageWidth / 2, footerY, { align: 'center' });
                    footerY += 10;
                });

                docAny.setFontSize(10);
                docAny.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
                docAny.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

                const pageNumber = docAny.internal.getCurrentPageInfo().pageNumber;
                const pageCount = docAny.internal.getNumberOfPages();
                docAny.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
            },
            margin: { top: 60, bottom: 45, left: 10, right: 10 }
        });

        // --- بخش امضا (دقیقاً کد خودت بدون تغییر) ---
        finalY = (docAny.lastAutoTable.finalY || finalY) + 30;
        doc.setFontSize(10);
        doc.text("Personel İmzası:", sideMargin, finalY);
        doc.line(sideMargin + 100, finalY, sideMargin + 250, finalY);

        doc.text("Yetkili İmzası:", sideMargin + 300, finalY);
        doc.line(sideMargin + 390, finalY, sideMargin + 540, finalY);

        doc.save(`Zimmet_Belgesi_${record.id}_${record.consignmentCode}.pdf`);
        showAlert('PDF raporu indiriliyor.', 'info');
    };

    const handleOpenDownloadAllModal = () => setOpenDownloadAllModal(true);
    const handleCloseDownloadAllModal = () => setOpenDownloadAllModal(false);
    const handleOpenDownloadFilteredModal = () => setOpenDownloadFilteredModal(true);
    const handleCloseDownloadFilteredModal = () => setOpenDownloadFilteredModal(false);
    const handleOpenRowDownloadModal = (row: PersonnelConsigned) => { setSelectedRowForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedRowForDownload(null); };

    const handleDownloadAll = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(personnelConsigneds, false) : exportToExcel(personnelConsigneds, false); handleCloseDownloadAllModal(); };
    const handleDownloadFiltered = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportToPdf(filteredConsigneds, true) : exportToExcel(filteredConsigneds, true); handleCloseDownloadFilteredModal(); };
    const handleDownloadRow = (format: 'pdf' | 'excel') => { if (!selectedRowForDownload) return; const rows = [selectedRowForDownload]; format === 'pdf' ? exportToPdf(rows, false) : exportToExcel(rows, false); handleCloseRowDownloadModal(); };


    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };

    const handleOpenLastRecordModalFromRow = (row: PersonnelConsigned) => {
        setLastRecordDetail(row);
        setOpenLastRecordModal(true);
        handleCloseMenu();
    };

    // --- Handlers for Attachment Update Modal ---
    const handleOpenAttachModal = (row: PersonnelConsigned) => {
        setRowToUpdateAttachments(row);
        setAttachCurrentAttachments(row.attachments);
        setAttachFiles([]);
        setAttachError(false);
        setOpenAttachModal(true);
        handleCloseMenu();
    };

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
            showAlert('Yeni dosyalar yükleniyor...', 'info');
            fileUrls = await uploadFiles(attachFiles, authToken, showAlert);
            if (fileUrls === null) { setAttachButtonLoading(false); return; }
        }

        // ترکیب پیوست‌های موجود (پس از حذف‌های احتمالی) با پیوست‌های جدید آپلود شده
        const finalAttachments: AttachmentType[] = [
            ...attachCurrentAttachments,
            ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])
        ];

        // 💡 ساختار Payload برای آپدیت: شامل تمام فیلدهای اصلی رکورد + attachments جدید
        const payloadForUpdate: PersonnelConsignedPayload = {
            id: Number(rowToUpdateAttachments.id), // ID برای PUT
            assignmentDate: rowToUpdateAttachments.assignmentDate,
            description: rowToUpdateAttachments.description,
            consignmentId: Number(rowToUpdateAttachments.consignment?.id),
            personnelId: Number(rowToUpdateAttachments.personnel?.id),
            parentId: rowToUpdateAttachments.parentId,
            returnDate: rowToUpdateAttachments.returnDate,
            attachments: finalAttachments, // لیست نهایی پیوست‌ها
        };

        const updateUrl = `${server.baseurl}${server.hr}update-personnel-consigned`;

        try {
            const res = await axios.put(updateUrl, payloadForUpdate, { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                showAlert('Ekler başarıyla güncellendi.', 'success');
                fetchPersonnelConsigneds(); // رفرش جدول
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
            else showAlert(e.response?.data?.message || 'Ekler güncellenirken bir hata oluştu.', 'error');
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h5" mb={0}>Personel Zimmet Kayıtları</Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni kayıt formunu aç" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>Yeni Zimmet Ekle</BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizle" : ""}>
                                <Button variant="contained" color="error" onClick={resetForm} startIcon={<IconX size={20} />}>Gizle</Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission) || (!isAssignmentMode && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{isAssignmentMode ? (editingId ? 'Zimmet Kaydını Düzenle' : 'Yeni Zimmet (Veriliş)') : 'Zimmet Teslimi (İade)'}</Typography>
                        <Grid container spacing={2}>

                            <Grid item xs={12} sm={12} >
                                <CustomFormLabel required>İşlem Türü</CustomFormLabel>
                                <ToggleButtonGroup
                                    value={isAssignmentMode ? 'ASSIGN' : 'RETURN'}
                                    exclusive
                                    onChange={(_, v) => {
                                        if (v !== null) {
                                            setIsAssignmentMode(v === 'ASSIGN');
                                            setSelectedParentConsignedId('');
                                            setSelectedPersonnelId(''); // 👈 ریست پرسنل الزامی است تا فیلتر جدید اعمال شود
                                            setSelectedConsignmentId(''); // 👈 ریست کالا الزامی است
                                            setReturnDate(v === 'RETURN' ? new Date() : null);
                                            setDescription('');
                                            setReturnableConsignmentList([]); // 👈 ریست لیست IADE
                                        }
                                    }}
                                    aria-label="İşlem Modu"
                                    fullWidth
                                >
                                    <StyledToggleButton value="ASSIGN" data-value="all" sx={{ flex: 1 }}>Zimmet Ver (Yeni Kayıt)</StyledToggleButton>
                                    <StyledToggleButton value="RETURN" data-value="inactive" sx={{ flex: 1 }}>Zimmet Al (İade)</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid>

                            <Grid item xs={12} sm={6} md={isAssignmentMode ? 4 : 4}>
                                <CustomFormLabel required>Personel</CustomFormLabel>
                                <Autocomplete
                                    options={personnelList}
                                    getOptionLabel={(option) => `${option.name} ${option.family} (${option.identityNumber})`}
                                    value={personnelList.find(p => p.id === selectedPersonnelId) || null}
                                    onChange={(_, newValue) => {
                                        const newPersonnelId = newValue ? newValue.id : '';
                                        setSelectedPersonnelId(newPersonnelId);
                                        setSelectedConsignmentId(''); // ریست کالا
                                        setSelectedParentConsignedId(''); // ریست والد
                                        if (personnelError) setPersonnelError(false);

                                        // اگر در حالت RETURN هستیم و پرسنل انتخاب شد، لیست کالاهای قابل بازگشت را واکشی می‌کنیم
                                        if (!isAssignmentMode && newPersonnelId) {
                                            fetchReturnableConsignments(Number(newPersonnelId));
                                        } else if (!newPersonnelId) {
                                            setReturnableConsignmentList([]);
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <CustomTextField
                                            {...params}
                                            label="Personel Seçin"
                                            size="small"
                                            error={personnelError}
                                            helperText={personnelError ? 'Zorunlu alan!' : ''}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={isAssignmentMode ? 4 : 4}>
                                <CustomFormLabel required>Mal</CustomFormLabel>
                                <Autocomplete
                                    // 💡 استفاده از لیست مناسب بر اساس حالت
                                    options={isAssignmentMode ? availableConsignmentList : returnableConsignmentList}
                                    getOptionLabel={(option) => `${option.name} (${option.code})`}

                                    // 💡 یافتن مقدار فعلی از لیست مربوطه
                                    value={
                                        isAssignmentMode ?
                                            availableConsignmentList.find(c => c.id === selectedConsignmentId) || null :
                                            returnableConsignmentList.find(c => c.id === selectedConsignmentId) || null
                                    }

                                    onChange={(_, newValue) => {
                                        const newConsignmentId = newValue ? newValue.id : '';
                                        setSelectedConsignmentId(newConsignmentId);
                                        if (consignmentError) setConsignmentError(false);

                                        // پیدا کردن parentId (id رکورد واگذاری) فقط در حالت RETURN
                                        if (!isAssignmentMode) {
                                            const parentId = getParentIdForReturn(newConsignmentId);
                                            setSelectedParentConsignedId(parentId);
                                        } else {
                                            setSelectedParentConsignedId('');
                                        }
                                    }}
                                    disabled={!isAssignmentMode && !selectedPersonnelId}
                                    renderInput={(params) => (
                                        <CustomTextField
                                            {...params}
                                            label="Mal Kayıt İsmi"
                                            size="small"
                                            error={consignmentError}
                                            helperText={consignmentError ? 'Zorunlu alan!' : ''}
                                        />
                                    )}
                                    noOptionsText={!isAssignmentMode && selectedPersonnelId ? "Bu personelde iade edilebilir zimmet bulunamadı." : "Seçenek yok"}
                                />
                            </Grid>



                            <Grid item xs={12} sm={6} md={isAssignmentMode ? 4 : 4}>
                                <CustomFormLabel required>{isAssignmentMode ? 'Veriliş Tarihi' : 'İade Kayıt Tarihi'}</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        label={isAssignmentMode ? 'Veriliş Tarihi' : 'İade Tarihi'}
                                        value={isAssignmentMode ? assignmentDate : returnDate}
                                        onChange={(v) => {
                                            isAssignmentMode ? setAssignmentDate(v) : setReturnDate(v);
                                            if (assignmentDateError || returnDateError) {
                                                setAssignmentDateError(false); setReturnDateError(false);
                                            }
                                        }}
                                        renderInput={(params) =>
                                            <TextField {...params} size="small" fullWidth
                                                error={isAssignmentMode ? assignmentDateError : returnDateError}
                                                helperText={isAssignmentMode ?
                                                    (assignmentDateError ? 'Zorunlu alan!' : '') :
                                                    (returnDateError ? 'Zorunlu alan!' : '')} />
                                        }
                                        inputFormat="dd/MM/yyyy"
                                    />
                                </LocalizationProvider>
                            </Grid>


                            {/* Description */}
                            <Grid item xs={12} >
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <CustomTextField placeholder="Açıklama" size="small" fullWidth multiline rows={4} value={description}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} />
                            </Grid>

                            {/* Attachments (Required for Return mode) */}
                            <Grid item xs={12} >
                                <CustomFormLabel >Ekler ({currentAttachments.length + selectedFiles.length} dosya)</CustomFormLabel>
                                <ConsignmentFileUpload files={selectedFiles}
                                    setFiles={setSelectedFiles}
                                    error={attachmentError}
                                    currentAttachments={currentAttachments}
                                />
                                {/* Display existing attachments during edit/return */}
                                {currentAttachments.length > 0 && (
                                    <Typography variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Mevcut Ekler: {currentAttachments.length}</Typography>
                                )}
                            </Grid>


                            {/* Form Actions */}
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {editingId !== null && isAssignmentMode ? (
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili kaydı güncelle" : ""}>
                                                <Button variant="contained" color="info" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : 'Düzenle'}</Button>
                                            </CustomTooltip>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Güncellemeyi iptal et ve yeni kayıt moduna dön" : ""}>
                                                <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                                            </CustomTooltip>
                                        </>
                                    ) : !isAssignmentMode ? ( // Return mode
                                        <>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili zimmeti iade al (Yeni teslim kaydı oluşturur)" : ""}>
                                                <Button variant="contained" color="error" onClick={handleSubmitForm} disabled={loadingButton} startIcon={<IconDownload />}>{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> İade Alınıyor...</> : 'Zimmeti İade Al'}</Button>
                                            </CustomTooltip>
                                            <Button variant="outlined" color="secondary" onClick={resetForm}>İptal Et</Button>
                                        </>
                                    ) : ( // New Assignment mode
                                        <>
                                            {hasCreatePermission && (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni zimmet kaydı ekle" : ""}>
                                                    <Button variant="contained" color="success" onClick={handleSubmitForm} disabled={loadingButton}>{loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : 'Zimmet Kaydı Ekle'}</Button>
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
                    </Stack>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        {/* Filters */}
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ara (Personel  / Açıklama)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Kayıt Başlangıç" value={startFilter} onChange={(v) => { setStartFilter(v); setPage(0); }} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker label="Kayıt Bitiş" value={endFilter} minDate={startFilter || undefined} onChange={(v) => { setEndFilter(v); setPage(0); }} inputFormat="dd/MM/yyyy" renderInput={(params) => <TextField {...params} size="small" fullWidth />} />
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
                        <Table aria-label="personnel consignments table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>

                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'personnelName'} direction={orderBy === 'personnelName' ? order : 'asc'} onClick={() => handleRequestSort('personnelName')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Personel</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'consignmentCode'} direction={orderBy === 'consignmentCode' ? order : 'asc'} onClick={() => handleRequestSort('consignmentCode')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Mal İsmi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Açıklama</Typography></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'assignmentDate'} direction={orderBy === 'assignmentDate' ? order : 'asc'} onClick={() => handleRequestSort('assignmentDate')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Veriliş Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Teslim Tarihi</Typography></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">Ekler</Typography></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><Typography variant="h6">İşlem</Typography></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, backgroundColor: row.returnDate ? '#f1f1f1' : 'inherit' }}>
                                            <StyledTableCell>{row.personnelName}</StyledTableCell>
                                            <StyledTableCell>{row.consignmentNameWithCode}</StyledTableCell>
                                            {/* <StyledTableCell>
                                                <Typography variant="body1" noWrap title={row.description || ''}>{row.description || '-'}</Typography>

                                                {row.description != null && row.description.length > 50 && (
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
                                            <StyledTableCell>{formatDateDisplay(row.assignmentDate)}</StyledTableCell>
                                            <StyledTableCell>{row.returnDate ? <Chip label={formatDateDisplay(row.returnDate)} color="error" size="small" /> : '-'}</StyledTableCell>
                                            <StyledTableCell>
                                                {row.attachments && row.attachments.length > 0 ? (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                        <IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary" size="small" /></IconButton>
                                                    </CustomTooltip>
                                                ) : (<Typography variant="body2" color="textSecondary">-</Typography>)}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton onClick={(e) => handleClickMenu(e, row)}><IconDots width={18} /></IconButton>
                                                </CustomTooltip>
                                                <Menu anchorEl={anchorEl} open={openMenu}
                                                    onClose={handleCloseMenu}>
                                                    {hasCreatePermission && ( // مجوز Edit یا Create برای تغییر پیوست‌ها نیاز است
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kayda ek dosya (resim/pdf) ekle veya mevcut ekleri düzenle." : ""}>
                                                            <MuiMenuItem onClick={() => handleOpenAttachModal(selectedRowForMenu!)}>
                                                                <ListItemIcon><IconLink width={18} /></ListItemIcon>
                                                                Ekleri Düzenle
                                                            </MuiMenuItem>
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
                                                    {hasDownloadPermission && selectedRowForMenu && (
                                                        <CustomTooltip
                                                            placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu işlem raporunu indirin" : ""}
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
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kayıt bulunamadı.</Typography></StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredConsigneds.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            {/* Attachments Modal */}
            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler ({currentAttachmentsModal.length} adet)</DialogTitle>
                <DialogContent dividers>
                    {currentAttachmentsModal.length === 0 ? (
                        <Typography variant="body1">Bu kayıt için herhangi bir ek bulunmamaktadır.</Typography>
                    ) : (
                        currentAttachmentsModal.map((attachment, index) => {
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
                        })
                    )}


                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAttachmentsModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>


            {/* Download Modals (All, Filtered, Row) - Structure same as previous component */}
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

            <Dialog open={openLastRecordModal} onClose={() => setOpenLastRecordModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{
                    backgroundColor: lastRecordDetail?.returnDate === null ? theme.palette.success.main : theme.palette.warning.main,
                    color: 'white'
                }}>
                    {lastRecordDetail?.returnDate === null ?
                        'Yeni Zimmet Kaydı Başarıyla Oluşturuldu!' :
                        'Zimmet Başarıyla İade Alındı!'}
                </DialogTitle>
                <DialogContent dividers>
                    {lastRecordDetail ? (
                        <Stack spacing={2}>
                            <Typography variant="h6">İşlem Detayları:</Typography>
                            <Grid container spacing={2}>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Personel:</Typography></Grid>
                                <Grid item xs={12} sm={8}><Typography>{lastRecordDetail.personnelName}</Typography></Grid>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Mal Kaydı:</Typography></Grid>
                                <Grid item xs={12} sm={8}><Typography>{lastRecordDetail.consignmentNameWithCode}</Typography></Grid>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">Tarih:</Typography></Grid>
                                <Grid item xs={12} sm={8}>
                                    <Typography>{formatDateDisplay(lastRecordDetail.returnDate || lastRecordDetail.assignmentDate)}</Typography>
                                </Grid>

                                <Grid item xs={12} sm={4}><Typography fontWeight="bold">İşlem:</Typography></Grid>
                                <Grid item xs={12} sm={8}>
                                    <Chip
                                        label={lastRecordDetail.returnDate === null ? "Teslim Edildi (Emanet)" : "Teslim Alındı (İade)"}
                                        color={lastRecordDetail.returnDate === null ? "success" : "warning"}
                                        size="small"
                                    />
                                </Grid>
                            </Grid>
                            <Alert severity={lastRecordDetail.returnDate === null ? "success" : "warning"} sx={{ mt: 2 }}>
                                {lastRecordDetail.returnDate === null ?
                                    'Yeni zimmet kaydı başarıyla oluşturulmuştur.' :
                                    'İade işlemi tamamlanmıştır.'}
                            </Alert>
                        </Stack>
                    ) : (
                        <Box display="flex" justifyContent="center"><CircularProgress /></Box>
                    )}
                </DialogContent>
                <DialogActions>
                    {lastRecordDetail && (
                        <Button
                            onClick={() => createPostSubmissionReportPdf(lastRecordDetail, showAlert)}
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
                    Ekleri Düzenle: {rowToUpdateAttachments?.personnelName || 'Kayıt'}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        <Typography variant="body1">
                            Lütfen yeni ekleri seçin veya mevcut ekleri (X ile) kaldırın.
                        </Typography>
                        <ConsignmentFileUpload
                            files={attachFiles}
                            setFiles={setAttachFiles}
                            error={attachError}
                            currentAttachments={attachCurrentAttachments}
                            setCurrentAttachments={setAttachCurrentAttachments} // 👈 تابع حذف پیوست موجود
                        />
                        {attachError && <Alert severity="error" sx={{ mt: 1 }}>Lütfen dosya seçin یا hatayı giderin.</Alert>}
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

            {/* Delete Modal */}
            <DeletePersonnelConsigneds
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={deleteName}
                onDeleteSuccess={fetchPersonnelConsigneds}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListPersonnelConsigneds;