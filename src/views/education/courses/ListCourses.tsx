import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    Typography, Chip, Menu, IconButton, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, MenuItem as MuiMenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    DialogContentText,
    Autocomplete,
    ListItemIcon,
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
    IconUsersGroup,
    IconCalendarTime,
} from '@tabler/icons-react';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';

import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import Logo from 'src/assets/images/logos/logo.png';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import DeleteCourses from './DeleteCourses';
import ListCourseDateTimes from '../course-date-times/ListCourseDateTimes';
import ListCourseParticipants from '../course-participants/ListCourseParticipants';

interface AttachmentType { fileUrl: string; }
interface TeacherApi { id: string; name: string; surname: string; field: string; recordStatus: 0 | 1; createAt: string; }

interface UserDetail {
    id: string; username: string; imageSrc: string | null; userId: string;
}
interface WorkhouseDetail {
    id: string; name: string;
}
interface WorkhouseType {
    id: string | number;
    name: string;
    recordStatus: number;
}

interface CourseDetail {
    id: number;
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string | null;
    attachments: AttachmentType[];
    teacherId: number;
    recordStatus: 0 | 1;
    createAt: string;
    workhouseId: number;
    teacher: TeacherApi;
    user: UserDetail;
    workhouse: WorkhouseDetail | null;
    hours: number;
    ISG: boolean;
}
type SortableKeys = 'title' | 'startDateTime' | 'endDateTime' | 'createAt';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));
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

const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <IconFileText size={20} />;
    if (ext === 'xlsx' || ext === 'xls') return <IconFileSpreadsheet size={20} />;
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <IconBox size={20} />;
    return <IconFileDownload size={20} />;
};

const getFileColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'error';
    if (ext === 'xlsx' || ext === 'xls') return 'success';
    return 'primary';
};

const uploadFiles = async (
    files: File[],
    authToken: string,
    showAlert: (m: string, s: 'success' | 'error' | 'warning' | 'info') => void
): Promise<string[] | null> => {

    if (!files || files.length === 0) { return []; }

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
const ConsignmentFileUpload: React.FC<{
    files: File[];
    setFiles: (f: File[]) => void;
    error: boolean;
    currentAttachments: AttachmentType[];
    setCurrentAttachments: (a: AttachmentType[]) => void;
}> = ({ files, setFiles, error, currentAttachments, setCurrentAttachments }) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const supportedTypes = "image/*, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xlsx";

    const { isTooltipGloballyEnabled } = useTooltip();

    const iconGetter = getFileIcon;
    const colorGetter = getFileColor;

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
                    Dosya Seç (Resim/pdf/excel)
                </Button>
            </Stack>

            {currentAttachments.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    <Typography variant="caption" sx={{ color: 'gray', width: '100%' }}>Mevcut Dosyalar ({currentAttachments.length}):</Typography>
                    {currentAttachments.map((att, index) => {
                        const fileName = att.fileUrl.split('/').pop() || 'dosya';
                        return (
                            <CustomTooltip key={`exist-${index}`} title={isTooltipGloballyEnabled ? fileName : ''}>
                                <Chip
                                    label={`Mevcut ${index + 1}`}
                                    icon={iconGetter(fileName)}
                                    onDelete={() => handleRemoveExistingAttachment(index)}
                                    size="small"
                                    color={colorGetter(fileName)}
                                    variant="outlined"
                                    sx={{ m: 0.5, maxWidth: 150 }}
                                />
                            </CustomTooltip>
                        );
                    })}
                </Stack>
            )}

            {files.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                    <Typography variant="caption" sx={{ color: 'gray', width: '100%' }}>Yüklenecek Yeni Dosyalar ({files.length}):</Typography>
                    {files.map((file, index) => (
                        <CustomTooltip key={`new-${index}`} title={isTooltipGloballyEnabled ? file.name : ''}>
                            <Chip
                                label={`Yeni ${index + 1}`}
                                icon={iconGetter(file.name)}
                                onDelete={() => handleRemoveNewFile(index)}
                                size="small"
                                color={colorGetter(file.name)}
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


const ListCourses: React.FC = () => {
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();


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
            op.systemOperationName === opName &&
            currentMenuOpIds.includes(String(op.menuOperationId))
        );
    };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazدırmak"), [allowedOperations, currentMenuOpIds]);


    const [editingId, setEditingId] = useState<number | null>(null);
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [startDateTime, setStartDateTime] = useState<Date | null>(null);

    const [hours, setHours] = useState<number | ''>('');
    const [hoursError, setHoursError] = useState(false);

    const [ISG, setISG] = useState(false);

    const [teachersList, setTeachersList] = useState<TeacherApi[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherApi | null>(null);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [currentAttachments, setCurrentAttachments] = useState<AttachmentType[]>([]);
    const [attachmentError, setAttachmentError] = useState(false);

    const [titleError, setTitleError] = useState(false);
    const [teacherError, setTeacherError] = useState(false);
    const [startDateTimeError, setStartDateTimeError] = useState(false);

    const [courses, setCourses] = useState<CourseDetail[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isBlinking, setIsBlinking] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [startFilter, setStartFilter] = useState<Date | null>(null);
    const [endFilter, setEndFilter] = useState<Date | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CourseDetail | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<CourseDetail | null>(null);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [attachmentsToView, setAttachmentsToView] = useState<AttachmentType[]>([]);
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');

    const [openDateTimesModal, setOpenDateTimesModal] = useState(false);
    const [courseIdForModal, setCourseIdForModal] = useState<number | null>(null);
    const [courseTitleForModal, setCourseTitleForModal] = useState('');

    const [courseStartForModal, setCourseStartForModal] = useState<string | null>(null);
    const [courseEndForModal, setCourseEndForModal] = useState<string | null>(null);

    const [openParticipantsModal, setOpenParticipantsModal] = useState(false);

    const [openEndCourseModal, setOpenEndCourseModal] = useState(false);
    const [rowForEndCourse, setRowForEndCourse] = useState<CourseDetail | null>(null);
    const [endCourseDate, setEndCourseDate] = useState<Date | null>(null);
    const [endCourseError, setEndCourseError] = useState(false);


    const [workhousesList, setWorkhousesList] = useState<WorkhouseDetail[]>([]);
    const [selectedWorkhouse, setSelectedWorkhouse] = useState<WorkhouseDetail | null>(null);
    const [workhouseError, setWorkhouseError] = useState(false);


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


    const mapApiDataToCourseDetail = (r: any): CourseDetail => ({
        id: Number(r.id),
        title: r.title,
        description: r.description || '',
        startDateTime: r.startDateTime,
        endDateTime: r.endDateTime || null,
        attachments: (r.attachments || r.attacments || []).map((a: any) => ({ fileUrl: a.fileUrl })),
        teacherId: Number(r.teacher?.id),
        workhouseId: Number(r.workhouse?.id),
        recordStatus: Number(r.recordStatus) as 0 | 1,
        createAt: r.createAt,
        teacher: r.teacher as TeacherApi,
        user: r.user as UserDetail,
        workhouse: r.workhouse || null,
        hours: r.hours,
        ISG: r.ISG ?? false,
    });

    const fetchTeachers = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }

        try {
            const url = `${server.baseurl}${server.education}get-all-teachers/`;
            const response = await axios.get(url, { headers: { "Authorization": `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200 && Array.isArray(response.data.data)) {
                const activeTeachers = response.data.data
                    .filter((t: any) => t.recordStatus === 0)
                    .map((t: any) => ({ ...t, id: String(t.id) } as TeacherApi));

                setTeachersList(activeTeachers);
            } else {
                showAlert('Öğretmen listesi alınamadı.', 'error');
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

    const fetchCourses = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const url = `${server.baseurl}${server.education}get-all-courses`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {

                const rawRows = (res.data.data as any[]).map(mapApiDataToCourseDetail);
                setCourses(rawRows);
            } else {
                showAlert(res.data.message || 'Kurs detayları yüklenirken bir hata oluştu.', 'error');
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
    }, [navigate, showAlert]);


    const getWorkhousesList = useCallback(async () => {
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
    }, [navigate]);

    useEffect(() => {
        fetchTeachers();
        fetchCourses();
        getWorkhousesList();
    }, [fetchTeachers, fetchCourses, getWorkhousesList]);


    const validateForm = (): boolean => {
        let ok = true;
        setTitleError(false); setTeacherError(false); setStartDateTimeError(false);

        if (!title.trim()) { setTitleError(true); ok = false; }
        if (!selectedTeacher) { setTeacherError(true); ok = false; }
        if (!startDateTime) { setStartDateTimeError(true); ok = false; }

        if (hours === '' || Number(hours) <= 0 || isNaN(Number(hours))) {
            setHoursError(true);
            ok = false;
        }

        if (!ok) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return ok;
    };

    const resetForm = useCallback(() => {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setStartDateTime(null);
        setSelectedTeacher(null);
        setSelectedWorkhouse(null);
        setWorkhouseError(false);
        setHours('');
        setISG(false);
        setSelectedFiles([]);
        setCurrentAttachments([]);
        setTitleError(false); setTeacherError(false); setStartDateTimeError(false);
        setHoursError(false);
        setIsFormVisible(false);
    }, []);

    const buildPayload = (id?: number, finalAttachments: AttachmentType[] = [], _currentStatus?: 0 | 1): any => {

        const payload: any = {
            title: title.trim(),
            description: description,
            startDateTime: startDateTime?.toISOString(),
            endDateTime: null,
            teacherId: selectedTeacher ? Number(selectedTeacher.id) : 0,
            workhouseId: selectedWorkhouse ? Number(selectedWorkhouse.id) : null,
            attachments: finalAttachments,
            hours: Number(hours),
            ISG: ISG
        };
        if (id) {
            payload.id = id;
            const existingCourse = courses.find(c => c.id === id);
            payload.endDateTime = existingCourse?.endDateTime ?? null;
        }

        return payload;
    };

    const handleSubmitForm = async () => {

        if (!validateForm() || !selectedTeacher) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setLoadingButton(false); return; }

        let fileUrls: string[] | null = [];
        setAttachmentError(false);
        if (selectedFiles.length > 0) {
            showAlert('Dosyalar yükleniyor...', 'info');
            fileUrls = await uploadFiles(selectedFiles, authToken, showAlert);
            if (fileUrls === null) {
                setAttachmentError(true);
                setLoadingButton(false);
                return;
            }
        }

        const finalAttachments: AttachmentType[] = [
            ...currentAttachments,
            ...(fileUrls?.map(url => ({ fileUrl: url })) ?? [])
        ];

        const isEditing = editingId !== null;
        const currentStatus = isEditing ? courses.find(c => c.id === editingId)?.recordStatus : 0; // 0 for new records

        const finalPayloadObject = buildPayload(editingId ?? undefined, finalAttachments, currentStatus);

        const url = isEditing
            ? `${server.baseurl}${server.education}update-course`
            : `${server.baseurl}${server.education}create-course`;
        const method = isEditing ? 'put' : 'post';

        try {
            const res = await axios.request({
                method, url, data: finalPayloadObject,
                headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
            });
            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(`Kurs başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}!`, 'success');
                resetForm();
                fetchCourses();
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


    const handleEditClick = (row: CourseDetail) => {
        const teacherToSelect = teachersList.find(t =>
            t.id === row.teacher.id
        );

        if (teacherToSelect) {
            setSelectedTeacher(teacherToSelect);
        } else {
            setSelectedTeacher(null);
        }

        if (row.workhouse) {
            setSelectedWorkhouse(row.workhouse);
        } else {
            setSelectedWorkhouse(null);
        }

        setEditingId(row.id);
        setTitle(row.title);
        setDescription(row.description);
        setStartDateTime(row.startDateTime ? new Date(row.startDateTime) : null);
        setHours(row.hours || '');
        setISG(row.ISG ?? false);

        setCurrentAttachments(row.attachments);
        setSelectedFiles([]);

        setIsFormVisible(true);

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);
        handleCloseMenu();
    };

    const submitEndCourse = async () => {
        if (!rowForEndCourse || !endCourseDate) {
            setEndCourseError(true);
            return;
        }

        const startDate = new Date(rowForEndCourse.startDateTime);
        if (endCourseDate < startDate) {
            setEndCourseError(true);
            showAlert('Bitiş tarihi, başlangıç tarihinden (' + formatDateDisplay(rowForEndCourse.startDateTime) + ') daha erken olamaz.', 'warning');
            return;
        }

        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');

        try {
            const payload = {
                id: rowForEndCourse.id,
                endDateTime: new Date(endCourseDate).toISOString(),
            };

            const res = await axios.put(
                `${server.baseurl}${server.education}set-course-isend`,
                payload,
                { headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );

            if (res.data.httpStatusCode === 200) {
                showAlert('Kurs başarıyla sonlandırıldı!', 'success');
                setOpenEndCourseModal(false);
                fetchCourses();
            } else {
                showAlert(res.data.message || 'Kurs sonlandırılamadı.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Sunucu hatası.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'İşlem sırasında bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
            setEndCourseError(false);
        }
    };

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); return; }

        try {
            const response = await axios.put(
                `${server.baseurl}${server.education}update-course`,
                { id: Number(id), recordStatus: statusValue },
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.httpStatusCode === 200) {
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Kurs başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetForm();
                fetchCourses();
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

    const filteredCourses = useMemo(() => {
        const list = courses.filter(r => {
            const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase())
                || r.description.toLowerCase().includes(searchTerm.toLowerCase())
                || r.teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
                || r.teacher.surname.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);
            const cDate = r.createAt ? new Date(r.createAt) : null;
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) && (!endFilter || (cDate && cDate <= endFilter));
            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [courses, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredCourses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredCourses, page, rowsPerPage]);
    const isFilterActive = useMemo(() => !!searchTerm.trim() || statusFilter !== 'all' || startFilter !== null || endFilter !== null, [searchTerm, statusFilter, startFilter, endFilter]);


    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CourseDetail) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
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
        setDeleteName(`${selectedRowForMenu.title}`);
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchCourses(); };


    const exportDetailsToPdf = (data: CourseDetail[], title: string) => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

        const doc = new jsPDF();
        const docAny = doc as any;

        const columns = ['Başlık', 'Şantiye', 'Öğretmen', 'Başlangıç', 'Bitiş', 'Saat', 'ISG', 'Açıklama', 'Kayıt Tarihi'];
        const body = data.map(r => [
            r.title || '-',
            r.workhouse?.name || '-',
            `${r.teacher.name || ''} ${r.teacher.surname || ''}` || '-',
            formatDateDisplay(r.startDateTime || null),
            formatDateDisplay(r.endDateTime || null),
            r.hours ? `${r.hours} Saat` : '-',
            r.ISG ? 'Evet' : 'Hayır',
            r.description,
            formatDateDisplay(r.createAt || null),
        ]);

        try {
            addPdfHeader(doc, title);

            autoTable(docAny, {
                head: [columns],
                body: body,
                startY: 50,
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

    const exportDetailsToExcel = (data: CourseDetail[], title: string) => {
        if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet(title.substring(0, 31));

            const columns = ['Başlık', 'Şantiye', 'Öğretmen', 'Başlangıç', 'Bitiş', 'Saat', 'ISG', 'Açıklama', 'Kayıt Tarihi'];
            addExcelHeader(worksheet, title, columns.length); // 💡 Columns length = 8

            const headerRow = worksheet.addRow(columns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            data.forEach(r => {
                worksheet.addRow([
                    r.title || '-',
                    r.workhouse?.name || '-',
                    `${r.teacher.name || ''} ${r.teacher.surname || ''}` || '-',
                    formatDateDisplay(r.startDateTime || null),
                    formatDateDisplay(r.endDateTime || null),
                    r.hours || '-',
                    r.ISG ? 'Evet' : 'Hayır',
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
        const title = `Tüm Kurslar Raporu`;
        format === 'pdf' ? exportDetailsToPdf(courses, title) : exportDetailsToExcel(courses, title);
        setOpenDownloadAllModal(false);
    };
    const handleDownloadFiltered = (format: 'pdf' | 'excel') => {
        const title = `Filtrelenmiş Kurslar Raporu`;
        format === 'pdf' ? exportDetailsToPdf(filteredCourses, title) : exportDetailsToExcel(filteredCourses, title);
        setOpenDownloadFilteredModal(false);
    };

    const handleOpenRowDownloadModal = (row: CourseDetail) => { setSelectedRowForDownload(row); setOpenRowDownloadModal(true); handleCloseMenu(); };
    const handleCloseRowDownloadModal = () => { setOpenRowDownloadModal(false); setSelectedRowForDownload(null); };
    const handleDownloadRow = (format: 'pdf' | 'excel') => {
        if (!selectedRowForDownload) return;
        const title = `Kurs Detayları: ${selectedRowForDownload.title}`;
        format === 'pdf' ? exportDetailsToPdf([selectedRowForDownload], title) : exportDetailsToExcel([selectedRowForDownload], title);
        handleCloseRowDownloadModal();
    };

    const handleOpenAttachmentsModal = (row: CourseDetail) => {
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


    const handleOpenDateTimesModal = (row: CourseDetail) => {
        setCourseStartForModal(row.startDateTime);
        setCourseEndForModal(row.endDateTime);
        setCourseIdForModal(row.id);
        setCourseTitleForModal(row.title);
        setOpenDateTimesModal(true);
        handleCloseMenu();
    };

    const handleCloseDateTimesModal = () => {
        setOpenDateTimesModal(false);
        setCourseIdForModal(null);
        setCourseTitleForModal('');
        setCourseStartForModal(null);
        setCourseEndForModal(null);
    };

    const handleOpenParticipantsModal = async (row: CourseDetail) => {

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Oturum süreniz doldu.', 'error'); return; }

        try {
            const url = `${server.baseurl}${server.education}get-course-datetimes-by-course-id/${row.id}`;
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });
            const count = res.data.data?.length || 0;

            if (count === 0) {
                showAlert('Katılımcıları eklemeden önce bu kursa ait en az bir tarih kaydı oluşturun.', 'warning');
                return;
            }

            setCourseIdForModal(row.id);
            setCourseTitleForModal(row.title);
            setOpenParticipantsModal(true);
            handleCloseMenu();

        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        }
    };

    const handleCloseParticipantsModal = () => {
        setOpenParticipantsModal(false);
        setCourseIdForModal(null);
        setCourseTitleForModal('');
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

                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    mb={3}
                    spacing={2}
                    flexWrap="wrap"
                >
                    <Typography variant="h5" sx={{ mb: { xs: 2, md: 0 } }}>
                        Kurs Yönetimi
                    </Typography>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems="stretch"
                        flexGrow={1}
                        justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni Kurs Ekle" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setIsFormVisible(true)}
                                    isBlinking={isBlinking}
                                    fullWidth={false}
                                >
                                    Yeni Kurs Ekle
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

                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" mb={2}>{editingId ? 'Kurs Düzenle' : 'Yeni Kurs Kaydı'}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel>Şantiye</CustomFormLabel>
                                <Autocomplete
                                    size="small"
                                    options={workhousesList}
                                    getOptionLabel={(option) => option.name}
                                    value={selectedWorkhouse}
                                    onChange={(_, newValue) => {
                                        setSelectedWorkhouse(newValue);
                                        setWorkhouseError(false);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Şantiye Seçin"
                                            error={workhouseError}
                                            helperText={workhouseError ? 'Zorunlu alan.' : ''}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Kurs Adı</CustomFormLabel>
                                <CustomTextField placeholder="Kurs Başlığı"
                                    inputRef={nameInputRef}
                                    size="small" fullWidth value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setTitle(e.target.value); setTitleError(false); }} error={titleError} helperText={titleError ? 'Zorunlu alan.' : ''} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Öğretmen Seçimi</CustomFormLabel>
                                <Autocomplete
                                    size="small"
                                    options={teachersList}
                                    getOptionLabel={(option) => `${option.name} ${option.surname} (${option.field})`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={selectedTeacher}
                                    onChange={(_, newValue) => { setSelectedTeacher(newValue); setTeacherError(false); }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Öğretmen Seçin"
                                            error={teacherError}
                                            helperText={teacherError ? 'Bu alan zorunludur!' : ''}
                                        />
                                    )}
                                    disabled={loadingButton}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Başlangıç Tarihi/Saati</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <DatePicker
                                        label="Başlangıç"
                                        value={startDateTime}
                                        onChange={(v) => { setStartDateTime(v); setStartDateTimeError(false); }}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth error={startDateTimeError} helperText={startDateTimeError ? 'Zorunlu alan.' : params.helperText} />}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Saat</CustomFormLabel>
                                <CustomTextField
                                    placeholder="Eğitim Saati (Örn: 40)"
                                    size="small"
                                    fullWidth
                                    type="number"
                                    value={hours}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = e.target.value === '' ? '' : Number(e.target.value);
                                        if (e.target.value === '' || Number(e.target.value) >= 0) {
                                            setHours(value);
                                            setHoursError(false);
                                        } else {
                                            setHoursError(true);
                                        }
                                    }}
                                    error={hoursError}
                                    helperText={hoursError ? 'Zorunlu alan, pozitif bir sayı olmalı.' : ''}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel>ISG Eğitimi mi?</CustomFormLabel>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                    <Chip
                                        label={ISG ? "Evet (ISG)" : "Hayır"}
                                        color={ISG ? "info" : "default"}
                                        variant="outlined"
                                        onClick={() => setISG(!ISG)}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                    <Typography variant="caption" color="textSecondary">
                                        (Bu işaretlenirse kurs ISG olarak kayıt edilir)
                                    </Typography>
                                </Stack>
                            </Grid>

                            <Grid item xs={12}>
                                <CustomFormLabel>Açıklama</CustomFormLabel>
                                <CustomTextField placeholder="Detaylı Açıklama" size="small" fullWidth value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} multiline rows={2} />
                            </Grid>
                            <Grid item xs={12}>
                                <CustomFormLabel>Ekler (Resim/pdf/excel)</CustomFormLabel>
                                <ConsignmentFileUpload
                                    files={selectedFiles}
                                    setFiles={setSelectedFiles}
                                    error={attachmentError}
                                    currentAttachments={currentAttachments}
                                    setCurrentAttachments={setCurrentAttachments}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button variant="contained" color={editingId ? "info" : "success"} onClick={handleSubmitForm} disabled={loadingButton || !selectedTeacher || !startDateTime || hoursError || hours === ''} size="small">
                                        {loadingButton ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> Bekleniyor...</> : editingId ? 'Düzenle' : 'Yeni Kayıt Ekle'}
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

            {alertMessage && (
                <Stack sx={{ width: '100%', mb: 3 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>
            )}

            <BlankCard>
                <Box sx={{ p: 2 }}>

                    <Grid item xs={12} mb={2}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end" mr={1}>
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
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ara (Başlık / Öğretmen)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} size="small" InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
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
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Kurslar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="courses table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'title'} direction={orderBy === 'title' ? order : 'asc'} onClick={() => handleRequestSort('title')} sx={{ color: 'inherit' }}><Typography variant="h6">Başlık</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Öğretmen</Typography></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'startDateTime'} direction={orderBy === 'startDateTime' ? order : 'asc'} onClick={() => handleRequestSort('startDateTime')} sx={{ color: 'inherit' }}><Typography variant="h6">Başlangıç</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><TableSortLabel active={orderBy === 'endDateTime'} direction={orderBy === 'endDateTime' ? order : 'asc'} onClick={() => handleRequestSort('endDateTime')} sx={{ color: 'inherit' }}><Typography variant="h6">Bitiş</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Saat</Typography></StyledTableCell>

                                    <StyledTableCell><Typography variant="h6">ISG</Typography></StyledTableCell>
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
                                        <TableRow
                                            key={row.id}
                                            sx={{
                                                '&:last-child td, &:last-child th': { border: 0 },
                                                ...(row.endDateTime ? { backgroundColor: '#ffa7a76e' } : {})
                                            }}
                                        >
                                            <StyledTableCell>{row.title || '-'}</StyledTableCell>
                                            <StyledTableCell>{`${row.teacher.name || ''} ${row.teacher.surname || ''}` || 'Bilinmiyor'}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.startDateTime || null)}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.endDateTime || null)}</StyledTableCell>
                                            <StyledTableCell>{row.hours ? `${row.hours} Saat` : '-'}</StyledTableCell>
                                            <StyledTableCell>
                                                <Chip
                                                    label={row.ISG ? 'Evet' : 'Hayır'}
                                                    color={row.ISG ? 'info' : 'default'}
                                                    size="small"
                                                />
                                            </StyledTableCell>
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
                                            <StyledTableCell>
                                                <IconButton onClick={() => handleOpenAttachmentsModal(row)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary" size="small"></Chip></IconButton>
                                            </StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.createAt || null)}</StyledTableCell>
                                            <StyledTableCell>
                                                <Chip label={row.recordStatus === 0 ? 'Aktif' : 'Pasif'} color={row.recordStatus === 0 ? 'success' : 'error'} size="small" />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    <CustomTooltip
                                                        placement="left"
                                                        title={isTooltipGloballyEnabled ? "Kurs için tanımlanan tarih ve saatleri yönetin" : ""}
                                                    >
                                                        <MuiMenuItem onClick={() => handleOpenDateTimesModal(selectedRowForMenu!)}>
                                                            <ListItemIcon><IconCalendarTime width={18} /></ListItemIcon> Kurs Tarih/Saatleri
                                                        </MuiMenuItem>
                                                    </CustomTooltip>

                                                    <CustomTooltip
                                                        placement="left"
                                                        title={isTooltipGloballyEnabled ? "Bu kursa kayıtlı katılımcıları yönetin" : ""}
                                                    >
                                                        <MuiMenuItem onClick={() => handleOpenParticipantsModal(selectedRowForMenu!)}>
                                                            <ListItemIcon><IconUsersGroup width={18} /></ListItemIcon> Kurs Katılımcıları
                                                        </MuiMenuItem>
                                                    </CustomTooltip>

                                                    {hasEditPermission && selectedRowForMenu && (
                                                        <CustomTooltip
                                                            placement="left"
                                                            title={isTooltipGloballyEnabled ? "Bu kursu tamamlanmış olarak işaretle" : ""}
                                                        >
                                                            <MuiMenuItem onClick={() => {
                                                                setRowForEndCourse(selectedRowForMenu);
                                                                setEndCourseDate(null);
                                                                setEndCourseError(false);
                                                                setOpenEndCourseModal(true);
                                                                handleCloseMenu();
                                                            }}>
                                                                <ListItemIcon><IconX width={18} /></ListItemIcon> Kursu Sonlandır
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}

                                                    {hasEditPermission && (<MuiMenuItem onClick={() => handleEditClick(selectedRowForMenu!)}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>)}
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
                                ) : (
                                    <TableRow><StyledTableCell colSpan={11} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kurs kaydı bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredCourses.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Kursları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAll('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAll('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kursları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadFiltered('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadFiltered('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openEndCourseModal} onClose={() => setOpenEndCourseModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Kursu Sonlandır</DialogTitle>
                <DialogContent>
                    {rowForEndCourse && (
                        <Stack spacing={2}>
                            <Typography variant="body1">Kurs Başlığı: {rowForEndCourse.title}</Typography>
                            <Typography variant="body2" color="textSecondary">Başlangıç Tarihi: {formatDateDisplay(rowForEndCourse.startDateTime)}</Typography>

                            <CustomFormLabel required>Bitiş Tarihi Seçin</CustomFormLabel>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker label="Bitiş Tarihi"
                                    value={endCourseDate}
                                    inputFormat="dd/MM/yyyy"
                                    minDate={new Date(rowForEndCourse.startDateTime)}
                                    onChange={(v) => { setEndCourseDate(v); setEndCourseError(false); }}
                                    renderInput={(params) =>
                                        <TextField {...params} size="small" fullWidth
                                            error={endCourseError}
                                            helperText={endCourseError ? 'Bitiş tarihi zorunludur ve başlangıçtan önce olamaz!' : ''}
                                        />
                                    }
                                />
                            </LocalizationProvider>
                            <Alert severity="warning">Bu işlem, kursun tamamlandığı tarihini kalıcı olarak kaydedecektir.</Alert>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEndCourseModal(false)} color="secondary" disabled={loadingButton}>İptal</Button>
                    <Button onClick={submitEndCourse} color="error" disabled={loadingButton || !endCourseDate}>
                        {loadingButton ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : "Sonlandır"}</Button>
                </DialogActions>
            </Dialog>

            <DeleteCourses
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={deleteName}
                onDeleteSuccess={fetchCourses}
                showAlert={showAlert}
            />

            <ListCourseDateTimes
                open={openDateTimesModal}
                courseId={courseIdForModal}
                courseTitle={courseTitleForModal}
                onClose={handleCloseDateTimesModal}
                showAlert={showAlert}
                courseStart={courseStartForModal}
                courseEnd={courseEndForModal}
            />

            <ListCourseParticipants
                open={openParticipantsModal}
                courseId={courseIdForModal}
                courseTitle={courseTitleForModal}
                onClose={handleCloseParticipantsModal}
                showAlert={showAlert}
            />

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

export default ListCourses;