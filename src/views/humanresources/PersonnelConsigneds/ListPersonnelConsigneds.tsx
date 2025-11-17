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
import { keyframes, styled } from '@mui/material/styles';
import BlankCard from 'src/components/shared/BlankCard';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import {
    IconDots,
    // IconEdit,
    IconTrash, IconSearch,
    IconFileSpreadsheet, IconFileText, IconX, IconFileDownload,
    IconClipboardList, IconLink, IconDownload, IconFile
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
        // Display both date and time (using 'pp' for time)
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

// --- Custom File Upload Component (Mocked for usage) ---
// Since the user provided the upload logic, we just need a place to input files.
// For simplicity, we'll create a basic file input wrapper.
const ConsignmentFileUpload: React.FC<{ files: File[]; setFiles: (f: File[]) => void; error: boolean }> = ({ files, setFiles, error }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supportedTypes = "image/*, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
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
                    Dosya Seç ({files.length})
                </Button>
                {files.map((file, index) => (
                    <Chip key={index} label={file.name} onDelete={() => handleRemoveFile(index)} size="small" sx={{ m: 0.5 }} />
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

    // Permissions (assuming similar system as previous component)
    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    // ------------------------------------
    // States: Data Lists
    // ------------------------------------
    const [personnelConsigneds, setPersonnelConsigneds] = useState<PersonnelConsigned[]>([]);
    const [personnelList, setPersonnelList] = useState<PersonnelType[]>([]);
    const [consignmentList, setConsignmentList] = useState<ConsignmentType[]>([]);

    // ------------------------------------
    // States: Form & UI
    // ------------------------------------
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isAssignmentMode, setIsAssignmentMode] = useState<boolean>(true); // True for assignment (new/edit), False for return
    const [selectedParentConsignedId, setSelectedParentConsignedId] = useState<number | ''>(''); // Used for Return mode

    const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | ''>('');
    const [selectedConsignmentId, setSelectedConsignmentId] = useState<number | ''>('');
    const [assignmentDate, setAssignmentDate] = useState<Date | null>(new Date());
    const [returnDate, setReturnDate] = useState<Date | null>(null);
    const [description, setDescription] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
    // const [parentConsignedError, setParentConsignedError] = useState(false);
    const [attachmentError, setAttachmentError] = useState(false);

    // ------------------------------------
    // States: Table/Filter
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
    // States: Menu/Modals
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
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


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
            // Using the user-provided API logic, filtering for active personnel (workEndDate === null)
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.data.httpStatusCode === 200) {
                const list: PersonnelType[] = (res.data?.data ?? [])
                    // .filter((x: any) => !x.workEndDate) // Filter active 
                    .filter((p: any) => p.hasISG === true && (!p.workEndDate || p.workEndDate === null)) // <-- شرط workEndDate اضافه شد

                    .map((x: any) => ({
                        id: Number(x.id),
                        name: x.name,
                        family: x.family,
                        identityNumber: x.identityNumber,
                        recordStatus: Number(x.recordStatus ?? 0) as RecordStatus,
                        workEndDate: x.workEndDate ? String(x.workEndDate).slice(0, 10) : null,
                    }));
                setPersonnelList(list);
            }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || "Personel listesi alınamadı.", "error");
        }
    }, [navigate]);

    const fetchConsignmentList = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-consignments`, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                setConsignmentList(res.data.data.map((item: any) => ({
                    id: Number(item.id),
                    name: item.name,
                    code: item.code || 'KODSUZ',
                })) as ConsignmentType[]);
            } else { showAlert(res.data.message || 'Mal  listesi yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Mal  listesi yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate]);


    const fetchPersonnelConsigneds = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnel-consigneds`,
                { headers: { Authorization: `Bearer ${authToken}` } });

            if (res.data.httpStatusCode === 200) {
                const rawRows: PersonnelConsigned[] = (res.data.data as any[]).map((r) => {
                    // محاسبه فیلدهای نمایش بر اساس آبجکت‌های دریافتی
                    const personnel = r.personnel;
                    const consignment = r.consignment;

                    return {
                        id: Number(r.id),
                        assignmentDate: r.assignmentDate,
                        createAt: r.createAt,
                        description: r.description || '-',
                        returnDate: r.returnDate || null,
                        attachments: (r.attachments as any[]).map(a => ({ fileUrl: a.fileUrl })) as AttachmentType[],

                        // ⭐️ از آبجکت‌های دریافتی استفاده کنید
                        consignment: consignment,
                        personnel: personnel,

                        parentId: Number(r.parentId || 0),
                        recordStatus: Number(r.recordStatus || 0) as RecordStatus,

                        // Computed Fields - استفاده از آبجکت‌های مستقیم
                        personnelName: personnel ? `${personnel.name} ${personnel.family} (${personnel.identityNumber})` : 'Bilinmeyen Personel',
                        consignmentNameWithCode: consignment ? `${consignment.name} (${consignment.code})` : 'Bilinmeyen Ambar',
                        consignmentCode: consignment?.code || '-',
                    } as PersonnelConsigned;
                });

                setPersonnelConsigneds(rawRows);
            }
        }
        catch (e) {
            showAlert('Kayıtlar yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, personnelList, consignmentList]);


    const activeConsignedConsignmentIds = useMemo(() => {
        return personnelConsigneds
            .filter(r => r.parentId === 0 && r.returnDate === null)
            .map(r => Number(r.consignment?.id))
            .filter(id => !isNaN(id));
    }, [personnelConsigneds]);

    const availableConsignmentList = useMemo(() => {
        if (isAssignmentMode) {
            return consignmentList.filter(c =>
                !activeConsignedConsignmentIds.includes(c.id)
            );
        }
        return consignmentList;
    }, [consignmentList, isAssignmentMode, activeConsignedConsignmentIds]);

    const activeConsignedsForSelectedPersonnel = useMemo(() => {
        const personnelId = Number(selectedPersonnelId);
        if (!personnelId || !personnelConsigneds.length) return [];
        return personnelConsigneds.filter(r => {
            const matchPersonnel = Number(r.personnel?.id) === personnelId;
            const isActiveAssignment = r.parentId === 0 && r.returnDate === null;
            return matchPersonnel && isActiveAssignment;
        });
    }, [personnelConsigneds, selectedPersonnelId]);


    const consignmentOptionsForReturn = useMemo(() => {
        return activeConsignedsForSelectedPersonnel
            .filter(r => r.consignment != null) // اطمینان از وجود آبجکت مال
            .map(r => {
                const consignment = r.consignment!; // چون فیلتر کردیم، اینجا تضمین شده است
                return {
                    id: Number(consignment.id),
                    parentId: r.id,
                    name: `${consignment.name} (${consignment.code})`,
                    code: consignment.code,
                };
            });
    }, [activeConsignedsForSelectedPersonnel]); // ⚠️ `consignmentList` دیگر لازم نیست

    // **Step 1: Fetch Reference Lists**
    useEffect(() => {
        fetchPersonnelList();
        fetchConsignmentList();
    }, [fetchPersonnelList, fetchConsignmentList]);

    // **Step 2: Fetch Main List (after references are likely loaded)**
    useEffect(() => {
        if (personnelList.length > 0 && consignmentList.length > 0) {
            fetchPersonnelConsigneds();
        }
    }, [fetchPersonnelConsigneds, personnelList]); // Trigger when references load

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
        // setParentConsignedError(false); 
        setAttachmentError(false);

        if (!selectedPersonnelId) { setPersonnelError(true); ok = false; }
        if (!selectedConsignmentId) { setConsignmentError(true); ok = false; }
        if (!assignmentDate) { setAssignmentDateError(true); ok = false; }

        if (isAssignmentMode) {
            // In Assignment Mode, returnDate must be null/empty, parentId is 0
        } else {
            // In Return Mode, returnDate must be set, parentId must be selected
            if (!returnDate) { setReturnDateError(true); ok = false; }
            if (!selectedParentConsignedId) {
                // setParentConsignedError(true);
                ok = false;
            }
            // Check attachments only in return mode as per user's likely need for proof of return
            // if (selectedFiles.length === 0 && currentAttachments.length === 0) { setAttachmentError(true); ok = false; }
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

        setPersonnelError(false); setConsignmentError(false); setAssignmentDateError(false);
        setReturnDateError(false);
        //  setParentConsignedError(false);
        setAttachmentError(false);
        // setParentConsignedError(false);
        setIsFormVisible(false);
    };

    // Available assignments for a selected personnel/consignment combination (for Return Mode)
    // const availableAssignments = useMemo(() => {
    //     if (!selectedPersonnelId || !selectedConsignmentId) return [];

    //     // Find records that are assignments (parentId=0), are ACTIVE (recordStatus=0) 
    //     // and have matching personnel/consignment IDs
    //     return personnelConsigneds.filter(r =>
    //         r.parentId === 0 &&
    //         r.recordStatus === 0 &&
    //         r.personnelId === Number(selectedPersonnelId) &&
    //         r.consignmentId === Number(selectedConsignmentId)
    //     );
    // }, [personnelConsigneds, selectedPersonnelId, selectedConsignmentId]);

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

        // Combine newly uploaded files with existing attachments (for editing/return)
        const finalAttachments = [
            ...currentAttachments,
            ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])
        ];

        const isEditing = editingId !== null && isAssignmentMode; // Only allow editing of assignment records
        const isReturning = !isAssignmentMode;

        const url = isReturning
            ? `${server.baseurl}${server.hr}create-personnel-consigned` // Return is a new record with parentId
            : isEditing
                ? `${server.baseurl}${server.hr}update-personnel-consigned`
                : `${server.baseurl}${server.hr}create-personnel-consigned`;
        const method = isEditing ? 'put' : 'post';

        // Construct the payload based on mode
        const payload: PersonnelConsignedPayload = {
            // assignmentDate: assignmentDate ? assignmentDate.toISOString() : new Date().toISOString(),
            assignmentDate: assignmentDate ? format(assignmentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            description: description.trim(),
            attachments: finalAttachments,
            consignmentId: Number(selectedConsignmentId),
            personnelId: Number(selectedPersonnelId),

            parentId: isAssignmentMode ? 0 : Number(selectedParentConsignedId),
            returnDate: isAssignmentMode ? null : (returnDate ? format(returnDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
        };
        debugger
        if (isEditing) (payload as any).id = Number(editingId);
        // if (isReturning) (payload as any).recordStatus = 1; 


        try {
            const res = await axios.request({ method, url, data: payload, headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });

            const successStatus = isEditing || isReturning ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(
                    `Kayıt başarıyla ${isReturning ? 'teslim edildi' : isEditing ? 'güncellendi' : 'eklendi'}!`,
                    'success'
                );
                resetForm();
                fetchPersonnelConsigneds();
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'İşlem sırasında bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { setLoadingButton(false); }
    };

    // const handleEditClick = () => {
    //     if (!selectedRowForMenu) return;
    //     const r = selectedRowForMenu;
    //     handleCloseMenu(); // منو را ببندید

    //     // ⭐️ تعیین حالت: اگر ParentId=0 باشد (واگذاری) -> Assignment Mode. در غیر این صورت (تحویل) -> Return Mode
    //     const isAssignment = r.parentId === 0;

    //     setEditingId(r.id);
    //     setIsAssignmentMode(isAssignment); // تنظیم حالت فرم

    //     // تنظیم شناسه‌ها از آبجکت‌های دریافتی در API
    //     setSelectedPersonnelId(Number(r.personnel?.id) || '');
    //     setSelectedConsignmentId(Number(r.consignment?.id) || '');

    //     // تنظیم تاریخ‌ها
    //     setAssignmentDate(r.assignmentDate ? new Date(r.assignmentDate) : null);
    //     setReturnDate(r.returnDate ? new Date(r.returnDate) : null); // تاریخ تحویل را نیز بارگذاری کند

    //     setDescription(r.description);
    //     setCurrentAttachments(r.attachments);
    //     setSelectedFiles([]);
    //     setSelectedParentConsignedId(isAssignment ? '' : r.parentId); // اگر حالت Return است، ParentId را تنظیم کند

    //     setIsFormVisible(true);
    // };


    const handleOpenAttachmentsModal = (attachments: AttachmentType[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };

    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        // The user provided the server.urldpwonload path
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
            const isActive = r.parentId === 0 && r.recordStatus === 0; // Considered active if it's an assignment and not returned/deleted
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
            didDrawPage: (data: any) => {
                // --- Header Logic ---
                docAny.setFont('NotoSans', 'normal'); docAny.setFontSize(14);
                docAny.text(title, pageWidth / 2, 15, { align: 'center' });
                docAny.setFontSize(10); docAny.setFont('NotoSans', 'normal');
                docAny.text(`Rapor Tarih:`, 15, 25);
                docAny.setFont('NotoSans', 'normal');
                docAny.text(`${formatDateDisplay(new Date().toISOString())}`, 35, 25);
                docAny.addImage(Logo, 'PNG', pageWidth - 60, 20, 50, 25); // If you have Logo imported

                // --- Footer Logic (Company Info & Page Numbers) ---
                docAny.setFont('NotoSans', 'normal'); docAny.setFontSize(8); docAny.setTextColor(0);
                const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
                let footerY = pageHeight - 30;
                companyInfo.forEach(line => { docAny.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 4; });
                const pageNumber = data.pageNumber;
                const pageCount = docAny.internal.getNumberOfPages();
                docAny.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
                docAny.setFont('NotoSans', 'normal');
                docAny.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
                docAny.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            },
            startY: 50, showHead: 'everyPage', margin: { top: 40, bottom: 45, left: 10, right: 10 }
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

    // --- JSX Render ---
    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconClipboardList width={24} height={24} />
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
                                            setReturnDate(v === 'RETURN' ? new Date() : null);
                                            setDescription('');
                                        }
                                    }}
                                    aria-label="İşlem Modu"
                                    fullWidth
                                >
                                    <StyledToggleButton value="ASSIGN" data-value="all" sx={{ flex: 1 }}>Zimmet Ver (Yeni Kayıt)</StyledToggleButton>
                                    <StyledToggleButton value="RETURN" data-value="inactive" sx={{ flex: 1 }}>Zimmet Al (İade)</StyledToggleButton>
                                </ToggleButtonGroup>
                            </Grid>

                            {/* Personnel Selector */}
                            {/* <Grid item xs={12} sm={6} md={isAssignmentMode ? 4 : 4}>
                                <CustomFormLabel required>Personel</CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }} error={personnelError}>
                                    <InputLabel id="sel-personnel">Personel Seçin</InputLabel>
                                    <Select labelId="sel-personnel" label="Personel Seçin"
                                        value={selectedPersonnelId}
                                        //  onChange={(e) => { setSelectedPersonnelId(Number(e.target.value)); 
                                        //  if (personnelError) setPersonnelError(false); }}
                                        onChange={(e) => {
                                            const newPersonnelId = Number(e.target.value);
                                            setSelectedPersonnelId(newPersonnelId);

                                            if (!isAssignmentMode) { // فقط در حالت Iade
                                                setSelectedConsignmentId('');      // ریست کردن کمبوی مال
                                                setSelectedParentConsignedId('');  // ریست کردن Parent ID پنهان
                                            }

                                            if (personnelError) setPersonnelError(false);
                                        }}
                                    >
                                        {personnelList.map(p => <MuiMenuItem key={p.id} value={p.id}>{p.name} {p.family} ({p.identityNumber})</MuiMenuItem>)}
                                    </Select>
                                    {personnelError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Zorunlu alan!</Typography>}
                                </FormControl>
                            </Grid> */}


                            <Grid item xs={12} sm={6} md={isAssignmentMode ? 4 : 4}>
                                <CustomFormLabel required>Personel</CustomFormLabel>
                                <Autocomplete
                                    // 1. داده‌ها
                                    options={personnelList}
                                    // 2. نحوه نمایش آیتم در لیست
                                    getOptionLabel={(option) => `${option.name} ${option.family} (${option.identityNumber})`}
                                    // 3. پیدا کردن مقدار فعلی (برای ویرایش)
                                    value={personnelList.find(p => p.id === selectedPersonnelId) || null}
                                    // 4. مدیریت تغییر
                                    onChange={(_, newValue) => {
                                        const newPersonnelId = newValue ? newValue.id : '';
                                        setSelectedPersonnelId(newPersonnelId);

                                        if (!isAssignmentMode) {
                                            setSelectedConsignmentId('');
                                            setSelectedParentConsignedId('');
                                        }
                                        if (personnelError) setPersonnelError(false);
                                    }}
                                    // 5. رابط کاربری
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



                            {/* <Grid item xs={12} sm={6} md={isAssignmentMode ? 4 : 4}>
                                <CustomFormLabel required>Mal </CustomFormLabel>
                                <FormControl size="small" sx={{ width: '100%' }} error={consignmentError}>
                                    <InputLabel id="sel-consignment">Mal Kayıt İsmi</InputLabel>
                                    <Select
                                        labelId="sel-consignment"
                                        label="Mal Kayıt İsmi"
                                        value={selectedConsignmentId}
                                        onChange={(e) => {
                                            const newConsignmentId = Number(e.target.value);
                                            setSelectedConsignmentId(newConsignmentId);
                                            if (consignmentError) setConsignmentError(false);

                                            const selectedOption = consignmentOptionsForReturn.find(o => o.id === newConsignmentId);
                                            setSelectedParentConsignedId(selectedOption?.parentId || '');
                                        }}
                                        disabled={!isAssignmentMode && !selectedPersonnelId}
                                    >
                                        {isAssignmentMode ?
                                            availableConsignmentList.map(c => <MuiMenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MuiMenuItem>)
                                            :
                                            consignmentOptionsForReturn.map(o => <MuiMenuItem key={o.id} value={o.id}>{o.name}</MuiMenuItem>)
                                        }
                                    </Select>
                                    {consignmentError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Zorunlu alan!</Typography>}
                                    {!isAssignmentMode && selectedPersonnelId && consignmentOptionsForReturn.length === 0 && (
                                        <Typography variant="caption" sx={{ ml: 1.5, mt: 0.5 }} color="warning.main">Bu personelde aktif zimmet bulunamadı.</Typography>
                                    )}
                                </FormControl>
                            </Grid> */}


                            <Grid item xs={12} sm={6} md={isAssignmentMode ? 4 : 4}>
                                <CustomFormLabel required>Mal </CustomFormLabel>
                                <Autocomplete
                                    options={isAssignmentMode ? availableConsignmentList : consignmentOptionsForReturn}
                                    getOptionLabel={(option) => isAssignmentMode ? `${option.name} (${option.code})` : option.name}

                                    value={
                                        isAssignmentMode ?
                                            availableConsignmentList.find(c => c.id === selectedConsignmentId) || null :
                                            consignmentOptionsForReturn.find(c => c.id === selectedConsignmentId) || null
                                    }

                                    onChange={(_, newValue) => {
                                        const newConsignmentId = newValue ? newValue.id : '';
                                        setSelectedConsignmentId(newConsignmentId);
                                        if (consignmentError) setConsignmentError(false);

                                        if (!isAssignmentMode) {
                                            const parentId = (newValue as any)?.parentId || '';
                                            setSelectedParentConsignedId(parentId);
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
                                    noOptionsText={!isAssignmentMode && selectedPersonnelId ? "Bu personelde aktif zimmet bulunamadı." : "Seçenek yok"}
                                />
                            </Grid>


                            {/* Parent ID (Only for Return Mode) */}
                            {/* {!isAssignmentMode && (
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomFormLabel required>İade Edilen Zimmet Kaydı</CustomFormLabel>
                                    <FormControl size="small" sx={{ width: '100%' }} error={parentConsignedError}>
                                        <InputLabel id="sel-parent">Zimmet Kaydını Seçin</InputLabel>
                                        <Select labelId="sel-parent" label="Zimmet Kaydını Seçin" value={selectedParentConsignedId} onChange={(e) => { setSelectedParentConsignedId(Number(e.target.value)); if (parentConsignedError) setParentConsignedError(false); }} disabled={!selectedPersonnelId || !selectedConsignmentId}>
                                            <MuiMenuItem value={''}>--- Seçin ---</MuiMenuItem>
                                            {availableAssignments.map(r =>
                                                <MuiMenuItem key={r.id} value={r.id}>
                                                    ID: {r.id} | Tarih: {formatDateDisplay(r.assignmentDate)} | Açıklama: {r.description}
                                                </MuiMenuItem>
                                            )}
                                        </Select>
                                        {parentConsignedError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Lütfen iade edilecek kaydı seçin.</Typography>}
                                    </FormControl>
                                </Grid>
                            )} */}

                            {/* Assignment Date */}
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
                                        inputFormat="dd/MM/yyyy" // <-- فقط تاریخ
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
                                <CustomFormLabel required={!isAssignmentMode}>Ekler ({currentAttachments.length + selectedFiles.length} dosya)</CustomFormLabel>
                                <ConsignmentFileUpload files={selectedFiles} setFiles={setSelectedFiles} error={attachmentError} />
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
                            <TextField label="Ara (Personel / Ambar / Açıklama)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
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
                                            <StyledTableCell>
                                                <Typography variant="body1" noWrap title={row.description || ''}>{row.description || '-'}</Typography>

                                                {row.description != null && row.description.length > 50 && (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                        <Button variant="text" style={{ fontSize: "10px", padding: "2px 5px" }} onClick={() => {
                                                            handleOpenDescriptionModal(row.description);
                                                        }}>
                                                            Devamını Oku
                                                        </Button>
                                                    </CustomTooltip>
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
                                                    {/* {hasEditPermission && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}>
                                                            <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )} */}
                                                    {/* {hasEditPermission && row.returnDate !== null && (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu zimmeti iade al" : ""}>
                                                            <MuiMenuItem onClick={handleReturnClick} sx={{ color: 'red' }}><ListItemIcon><IconDownload width={18} /></ListItemIcon>Teslim Al (İade)</MuiMenuItem>
                                                        </CustomTooltip>
                                                    )} */}
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
                <DialogTitle>Ekler ({currentAttachments.length} adet)</DialogTitle>
                <DialogContent dividers>
                    {currentAttachments.length === 0 ? (
                        <Typography variant="body1">Bu kayıt için herhangi bir ek bulunmamaktadır.</Typography>
                    ) : (
                        currentAttachments.map((attachment, index) => (
                            <Button key={index} fullWidth variant="outlined" onClick={() => handleDownloadClick(attachment.fileUrl)} sx={{ mt: 1 }} startIcon={<IconDownload />}>
                                {attachment.fileUrl.split('/').pop()}
                            </Button>
                        ))
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