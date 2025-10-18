

// src/components/apps/projects/ListProjects.tsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment, ToggleButton as MuiToggleButton,
    CircularProgress, Paper, ToggleButtonGroup, RadioGroup, FormControlLabel, Radio,
    TableSortLabel, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions,
    Typography,
    IconButton,
    Box,
    Chip,
    Menu,
    ListItemIcon
} from '@mui/material';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch,
    IconFileDownload, IconX, IconPlus, IconFileSpreadsheet, IconFileText
} from '@tabler/icons-react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import ProjectFirmManagement from './ProjectFirmManagement';
import DeleteProject from './DeleteProject';


const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', // یا هر font adı که می‌خواهید
    // font boyutu masaüstünde 1rem (16px), mobil cihazlarda 0.75rem (12px)
    fontSize: '0.8rem', // Varsayılan olarak küçük font
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem', // Masaüstünde daha büyük
    },
}));


interface WorkhouseType {
    id: number;
    name: string;
    code: string;
    address: string;
    createAt: string;
    recordStatus: number;
}
interface FirmType {
    id: number;
    title: string;
    abbreviation: string;
    createAt: string;
    recordStatus: number;
}
interface ProjectType {
    id: number;
    title: string;
    code: string;
    type: 0 | 1 | 2;
    startDate: string;
    predictEndDate: string;
    endDate: string | null;
    workhouseId: number;
    firmId: number;
    workhouse: WorkhouseType;
    projectFirm: FirmType;
    recordStatus: number;
}
type SortableProjectKeys = keyof Pick<ProjectType, 'title' | 'code' | 'startDate' | 'predictEndDate' | 'recordStatus'>;

// === Styled Components ===
const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));
const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({
    '&.Mui-selected': {
        color: 'white',
        ...(value === 'all' && selected && { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }),
        ...(value === 1 && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 2 && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

// === Utility Functions ===
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        console.log("Tarih biçimlendirilirken hata oluştu:", e);
        return "Geçersiz Tarih";
    }
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
const getComparator = (order: 'asc' | 'desc', orderBy: SortableProjectKeys): (a: ProjectType, b: ProjectType) => number => {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
};
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
};

// =====================================================================================
// توابع کمکی برای ساختار گزارش‌دهی PDF و Excel
// =====================================================================================

const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;
    docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
    docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    doc.setFont('NotoSans');

    docAny.addImage(Logo, 'PNG', pageWidth - 50, 20, 40, 25);
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Rapor Tarihi:`, 15, 30);
    doc.text(`${formatDateDisplay(new Date().toISOString())}`, 45, 30);
};

const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('NotoSans', 'normal');
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
    ];
    let footerY = pageHeight - 30;
    companyInfo.forEach(line => {
        doc.text(line, pageWidth / 2, footerY, { align: 'center' });
        footerY += 4;
    });
    doc.setFontSize(10);
    doc.text('İmza', pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.line(pageWidth - 65, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    const docAny = doc as any;
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
    const companyInfo = [
        'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
        'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
        'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr',
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


const ListProjects = () => {
    const navigate = useNavigate();

    // States for Project Form
    const [title, setTitle] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [type, setType] = useState<0 | 1 | 2>(0);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [predictEndDate, setPredictEndDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);
    const [selectedFirmId, setSelectedFirmId] = useState<number | null>(null);

    // States for Lists
    const [projectsList, setProjectsList] = useState<ProjectType[]>([]);
    const [displayedProjects, setDisplayedProjects] = useState<ProjectType[]>([]);
    const [workhousesList, setWorkhousesList] = useState<WorkhouseType[]>([]);
    const [firmsList, setFirmsList] = useState<FirmType[]>([]);

    // UI States
    const [editingId, setEditingId] = useState<number | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    // Table States
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<SortableProjectKeys>('startDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    // Menu & Modals
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ProjectType | null>(null);
    // const openMenu = Boolean(anchorEl);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [projectIdToDelete, setProjectIdToDelete] = useState<number | null>(null);
    const [projectTitleToDelete, setProjectTitleToDelete] = useState<string>('');
    const [openFirmManagementModal, setOpenFirmManagementModal] = useState(false);

    // Error States
    const [titleError, setTitleError] = useState(false);
    const [codeError, setCodeError] = useState(false);
    const [startDateError, setStartDateError] = useState(false);
    const [predictEndDateError, setPredictEndDateError] = useState(false);
    const [workhouseIdError, setWorkhouseIdError] = useState(false);

    // ✨ NEW: State for download modals
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedProjectForDownload, setSelectedProjectForDownload] = useState<ProjectType | null>(null);


    const [isFilterActive, setIsFilterActive] = useState(false);
    // Contexts & Refs
    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();
    const titleInputRef = useRef<HTMLInputElement>(null);

    const hasCreatePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Eklemek'), [allowedOperations]);
    const hasEditPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Düzenlemek'), [allowedOperations]);
    const hasDeletePermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'Silmek'), [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations.some(op => op.systemOperationName === 'İndirmek ve Yazdırmak'), [allowedOperations]);

    const showAlert = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    };

    const clearAlert = () => {
        setAlertMessage(null);
    };
    const handleRequestSort = (property: SortableProjectKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };
    // API Calls
    const fetchProjects = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingData(false); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-project", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                const projects = response.data.data.map((item: any) => ({
                    ...item,
                    recordStatus: item.recordStatus,
                    status: item.recordStatus === 0 ? 'Aktif' : 'Pasif'
                }));
                setProjectsList(projects);
            } else {
                showAlert(response.data.message || 'Projeler yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert('Projeler yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate]);

    const fetchWorkhouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.initialoperations + "get-workhouse", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setWorkhousesList(response.data.data.filter((wh: any) => wh.recordStatus === 0));
            } else {
                showAlert(response.data.message || 'Şantiye listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Şantiye listesi yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    const fetchFirms = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); return; }
        try {
            const response = await axios.get(server.baseurl + server.warehouse + "get-project-firm", {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                setFirmsList(response.data.data.filter((firm: FirmType) => firm.recordStatus === 0));
            } else {
                showAlert(response.data.message || 'Firma listesi alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Firma listesi yüklenirken bir hata oluştu.', 'error');
        }
    }, [navigate]);

    useEffect(() => {
        fetchProjects();
        fetchWorkhouses();
        fetchFirms();
    }, [fetchProjects, fetchWorkhouses, fetchFirms]);

    // Filtering, Sorting, and Pagination Logic
    useEffect(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatusFilter = statusFilter !== 'all';
        const hasDateFilter = filterStartDate !== null || filterEndDate !== null;
        setIsFilterActive(hasSearch || hasStatusFilter || hasDateFilter);

        const filteredBySearchAndStatus = projectsList.filter(proj => {
            const matchesSearch = proj.title.toLowerCase().includes(searchTerm.toLowerCase()) || proj.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && proj.recordStatus === 0) ||
                (statusFilter === 'inactive' && proj.recordStatus === 1);

            const createDate = new Date(proj.startDate);
            const matchesDate =
                (!filterStartDate || createDate >= filterStartDate) &&
                (!filterEndDate || createDate <= filterEndDate);

            return matchesSearch && matchesStatus && matchesDate;
        });

        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
        setDisplayedProjects(sortedData);
        setPage(0);
    }, [projectsList, searchTerm, statusFilter, order, orderBy, filterStartDate, filterEndDate]);


    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);


    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertMessage) {
            timer = setTimeout(() => {
                clearAlert();
            }, 5000);
        }
        return () => {
            clearTimeout(timer);
        };
    }, [alertMessage]);
    const paginatedProjects = useMemo(() => {
        return displayedProjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedProjects, page, rowsPerPage]);

    // Form Handlers
    const validateForm = (): boolean => {
        let isValid = true;
        const isTitleValid = !!title.trim();
        const isCodeValid = !!code.trim();
        const isStartDateValid = !!startDate;
        const isPredictEndDateValid = !!predictEndDate;
        const isWorkhouseIdValid = !!selectedWorkhouseId;
        let isDateRangeValid = true;
        if (startDate && predictEndDate && predictEndDate < startDate) {
            isDateRangeValid = false;
            showAlert('Tahmini bitiş tarihi, başlangıç tarihinden önce olamaz!', 'error');
        }
        setTitleError(!isTitleValid);
        setCodeError(!isCodeValid);
        setStartDateError(!isStartDateValid);
        setPredictEndDateError(!isPredictEndDateValid);
        setWorkhouseIdError(!isWorkhouseIdValid);
        isValid = isTitleValid && isCodeValid && isStartDateValid && isPredictEndDateValid && isWorkhouseIdValid && isDateRangeValid;
        if (!isValid) {
            if (!isDateRangeValid) {
                // Do nothing, the specific error is already shown.
            } else {
                showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning');
            }
        }
        return isValid;
    };

    const resetFormAndState = () => {
        setTitle('');
        setCode('');
        setType(0);
        setStartDate(null);
        setPredictEndDate(null);
        setEndDate(null);
        setSelectedWorkhouseId(null);
        setSelectedFirmId(null);
        setEditingId(null);
        setTitleError(false);
        setCodeError(false);
        setStartDateError(false);
        setPredictEndDateError(false);
        setWorkhouseIdError(false);
        setIsFormVisible(false);
    };

    const insertProject = async () => {
        if (!validateForm()) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingButton(false); return; }

        const payload = {
            title, code, type,
            startDate: startDate?.toISOString(),
            predictEndDate: predictEndDate?.toISOString(),
            endDate: endDate == null ? null : endDate?.toISOString(),
            workhouseId: Number(selectedWorkhouseId),
            firmId: Number(selectedFirmId),
        };
        debugger
        try {
            const response = await axios.post(server.baseurl + server.warehouse + "create-project", payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 201) {
                showAlert('Yeni Proje başarıyla eklendi!', 'success');
                resetFormAndState();
                fetchProjects();
            } else {
                showAlert(response.data.message || 'Proje eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Proje eklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const editProject = async () => {
        if (!validateForm() || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingButton(false); return; }
        try {
            const payload = {
                id: Number(editingId),
                title, code, type,
                startDate: startDate?.toISOString(),
                predictEndDate: predictEndDate?.toISOString(),
                endDate: endDate == null ? null : endDate?.toISOString(),
                workhouseId: Number(selectedWorkhouseId),
                firmId: Number(selectedFirmId),
            };
            const response = await axios.put(server.baseurl + server.warehouse + "update-project", payload, {
                headers: { "Authorization": `Bearer ${authToken}` }
            });
            if (response.data.httpStatusCode === 200) {
                showAlert('Proje başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchProjects();
            } else {
                showAlert(response.data.message || 'Proje güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Proje güncellenirken bir hata oluştu.', 'error');

            }
        } finally {
            setLoadingButton(false);
        }
    };

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        clearAlert();
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
            return;
        }
        try {
            const response = await axios.put(
                server.baseurl + server.warehouse + "update-project",
                { id: Number(id), recordStatus: statusValue },
                {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Proje başarıyla güncellendi!', 'success');
                resetFormAndState();
                fetchProjects();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) {
                showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');

            } else if (e.response && e.response.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error');
                navigate("/");
            } else {
                showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');

            }
        } finally {
            handleCloseMenu();
        }
    };
    // Table Actions
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ProjectType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };
    const handleEditClick = () => {
        if (selectedRowForMenu) {
            setTitle(selectedRowForMenu.title);
            setCode(selectedRowForMenu.code);
            setType(selectedRowForMenu.type);
            setStartDate(new Date(selectedRowForMenu.startDate));
            setPredictEndDate(new Date(selectedRowForMenu.predictEndDate));
            setEndDate(selectedRowForMenu.endDate ? new Date(selectedRowForMenu.endDate) : null);
            setSelectedWorkhouseId(selectedRowForMenu.workhouse.id);
            setSelectedFirmId(selectedRowForMenu.projectFirm.id);
            setEditingId(selectedRowForMenu.id);
            setIsFormVisible(true);
            setTimeout(() => titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
        handleCloseMenu();
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setProjectIdToDelete(selectedRowForMenu.id);
            setProjectTitleToDelete(selectedRowForMenu.title);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const mapProjectTypeToString = (type: 0 | 1 | 2): string => {
        switch (type) {
            case 0:
                return 'AG';
            case 1:
                return 'OG';
            case 2:
                return 'Tesis-Ket';
            default:
                return '-';
        }
    };
    const exportProjectsToPdf = (data: ProjectType[], title: string, subtitle?: string) => {
        if (!data || data.length === 0) {
            showAlert('PDF oluşturulacak proje bulunamadı.', 'warning');
            return;
        }
        showAlert('PDF oluşturuluyor...', 'info');
        const doc = new jsPDF();
        const docAny = doc as any;

        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const columns = [
            "Başlık", "Kod", "Tip", "Başlangıç", "Tahmini Bitiş",
            "Gerçek Bitiş", "Şantiye", "Firma", "Durum"
        ];

        const rows = data.map(row => [
            row.title || '-',
            row.code || '-',
            mapProjectTypeToString(row.type),
            formatDateDisplay(row.startDate),
            formatDateDisplay(row.predictEndDate),
            formatDateDisplay(row.endDate),
            row.workhouse?.name || '-',
            row.projectFirm?.title || '-',
            row.recordStatus === 0 ? 'Aktif' : 'Pasif'
        ]);

        try {
            autoTable(docAny, {
                startY: 55,
                head: [columns],
                body: rows,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { font: 'NotoSans', fillColor: [242, 242, 242], textColor: [0, 0, 0] },
                didDrawPage: () => {
                    addPdfFooter(doc);
                    addPdfHeader(doc, title);
                    if (subtitle) {
                        doc.setFontSize(10);
                        doc.text(subtitle, 80, 47, { align: 'left' });
                    }
                },
                showHead: 'everyPage',
                margin: { top: 55, bottom: 20 }
            });
            doc.save(`${title.replace(/ /g, '_')}.pdf`);
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (error: any) {
            console.error('PDF oluşturulurken hata:', error);
            showAlert('PDF oluşturulurken bir hata oluştu: ' + error.message, 'error');
        }
    };

    // ✨ NEW: Consolidated Excel export function
    const exportProjectsToExcel = (data: ProjectType[], title: string, subtitle?: string) => {
        if (!data || data.length === 0) {
            showAlert('Excel oluşturulacak proje bulunamadı.', 'warning');
            return;
        }
        showAlert('Excel oluşturuluyor...', 'info');
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title.replace(/[\\/*?:[\]]/g, ' '));

        const columns = [
            "Başlık", "Kod", "Tip", "Başlangıç", "Tahmini Bitiş",
            "Gerçek Bitiş", "Şantiye", "Firma", "Durum"
        ];

        addExcelHeader(worksheet, title, columns.length);
        if (subtitle) {
            worksheet.addRow([`Filtre: ${subtitle}`]);
            worksheet.addRow([]);
        }

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

        data.forEach(row => {
            worksheet.addRow([
                row.title || '-',
                row.code || '-',
                mapProjectTypeToString(row.type),
                formatDateDisplay(row.startDate),
                formatDateDisplay(row.predictEndDate),
                formatDateDisplay(row.endDate),
                row.workhouse?.name || '-',
                row.projectFirm?.title || '-',
                row.recordStatus === 0 ? 'Aktif' : 'Pasif'
            ]);
        });

        worksheet.columns.forEach(column => {
            let maxLength = 0;
            if (column && typeof column.eachCell === 'function') {
                column.eachCell({ includeEmpty: true }, cell => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) maxLength = columnLength;
                });
            }
            column.width = Math.min(Math.max(maxLength + 2, 15), 50);
        });

        addExcelCompanyInfo(worksheet, worksheet.lastRow!.number + 2, columns.length);

        const fileName = `${title.replace(/ /g, '_')}.xlsx`;
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        });
    };

    // ✨ NEW: Unified download handler for all/filtered data
    const handleDownload = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedProjects : projectsList;
        const title = isFiltered ? 'Filtrelenmiş Projeler Raporu' : 'Tüm Projeler Raporu';
        const subtitle = isFiltered ? `Tarih Aralığı: ${formatDateDisplay(filterStartDate ? filterStartDate.toISOString() : null)} - ${formatDateDisplay(filterEndDate ? filterEndDate.toISOString() : null)}` : undefined;

        if (format === 'pdf') {
            exportProjectsToPdf(dataToDownload, title, subtitle);
        } else {
            exportProjectsToExcel(dataToDownload, title, subtitle);
        }
    };

    // ✨ NEW: Unified download handler for a single row
    const handleDownloadSingleProject = (format: 'pdf' | 'excel') => {
        if (!selectedProjectForDownload) return;
        const data = [selectedProjectForDownload];
        const title = `Proje Detayları: ${selectedProjectForDownload.title}`;

        if (format === 'pdf') {
            exportProjectsToPdf(data, title);
        } else {
            exportProjectsToExcel(data, title);
        }
        handleCloseRowDownloadModal();
    };

    // ✨ NEW: Modal handlers
    // const handleOpenDownloadAllModal = () => setOpenDownloadAllModal(true);
    const handleCloseDownloadAllModal = () => setOpenDownloadAllModal(false);
    // const handleOpenDownloadFilteredModal = () => setOpenDownloadFilteredModal(true);
    const handleCloseDownloadFilteredModal = () => setOpenDownloadFilteredModal(false);
    const handleOpenRowDownloadModal = (project: ProjectType) => {
        setSelectedProjectForDownload(project);
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleCloseRowDownloadModal = () => {
        setSelectedProjectForDownload(null);
        setOpenRowDownloadModal(false);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };
    const handleClearDateFilters = () => {
        setFilterStartDate(null);
        setFilterEndDate(null);
    };

    const handlePlanlamaClick = () => {
        if (selectedRowForMenu) {
            // از navigate برای رفتن به مسیر جدید با project ID استفاده می‌شود
            navigate(`/project/project-planing/${selectedRowForMenu.id}`);
        }
        handleCloseMenu();
    };

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                    <Typography variant="h5">{editingId ? 'Proje Düzenle' : 'Yeni Proje Kaydı'}</Typography>
                    <Stack direction="row" spacing={1} alignItems="stretch" flexGrow={1} justifyContent="flex-end">
                        {!isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni proje kaydetmek için tıklayınız" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking}>
                                    Yeni Proje Kaydet
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                                <Button variant="contained" color="error" onClick={resetFormAndState} startIcon={<IconX size={20} />}>
                                    Gizle
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel htmlFor="project-title" required>Proje Başlığı</CustomFormLabel>
                                <CustomTextField id="project-title" placeholder="Proje Başlığı"
                                    fullWidth size="small" value={title}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setTitle(e.target.value); if (titleError) setTitleError(false); }} inputRef={titleInputRef} error={titleError} helperText={titleError ? "Başlık alanı boş bırakılamaz!" : ""} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel htmlFor="project-code" required>Proje Kodu</CustomFormLabel>
                                <CustomTextField id="project-code" placeholder="Proje Kodu"
                                    fullWidth size="small" value={code}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCode(e.target.value); if (codeError) setCodeError(false); }} error={codeError} helperText={codeError ? "Kod alanı boş bırakılamaz!" : ""} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel htmlFor="project-type" required>Proje Tipi</CustomFormLabel>
                                <RadioGroup row value={type} onChange={(e) => setType(parseInt(e.target.value, 10) as 0 | 1 | 2)}>
                                    {/* این بخش را تغییر دهید */}
                                    <FormControlLabel value={0} control={<Radio />} label="AG" />
                                    <FormControlLabel value={1} control={<Radio />} label="OG" />
                                    {/* <FormControlLabel value={2} control={<Radio />} label="YG" /> */}
                                    <FormControlLabel value={2} control={<Radio />} label="Tesis-Ket" />
                                </RadioGroup>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel htmlFor="workhouse-selection" required>Şantiye Seçimi</CustomFormLabel>
                                <Autocomplete
                                    id="workhouse-selection"
                                    options={workhousesList}
                                    getOptionLabel={(option) => option.name}
                                    value={workhousesList.find(wh => wh.id === selectedWorkhouseId) || null}
                                    onChange={(_event, newValue) => {
                                        setSelectedWorkhouseId(newValue?.id || null);
                                        if (workhouseIdError && newValue) setWorkhouseIdError(false);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Şantiye Seçin"
                                            size="small"
                                            fullWidth
                                            error={workhouseIdError}
                                            helperText={workhouseIdError ? "Şantiye seçimi zorunludur!" : ""}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <CustomFormLabel htmlFor="firm-selection">Firma Seçimi</CustomFormLabel>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Autocomplete
                                        id="firm-selection"
                                        options={firmsList}
                                        getOptionLabel={(option) => option.title}
                                        value={firmsList.find(firm => firm.id === selectedFirmId) || null}
                                        onChange={(_event, newValue) => setSelectedFirmId(newValue?.id || null)}
                                        renderInput={(params) => <TextField {...params} label="Firma Seçin" size="small" />}
                                        fullWidth
                                    />
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Firma yönetimi için tıklayınız." : ""}>
                                        <IconButton onClick={() => setOpenFirmManagementModal(true)}><IconPlus /></IconButton>
                                    </CustomTooltip>
                                </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <CustomFormLabel htmlFor="start-date" required>Başlangıç Tarihi</CustomFormLabel>
                                    <DatePicker
                                        label="Başlangıç Tarihi"
                                        value={startDate}
                                        onChange={(newValue) => {
                                            setStartDate(newValue);
                                            if (startDateError && newValue) setStartDateError(false);
                                        }}
                                        maxDate={predictEndDate || endDate || undefined}
                                        inputFormat="dd/MM/yyyy"
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                fullWidth
                                                error={startDateError}
                                                helperText={startDateError ? "Başlangıç tarihi zorunludur!" : ""}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <CustomFormLabel htmlFor="predict-end-date" required>Tahmini Bitiş Tarihi</CustomFormLabel>
                                    <DatePicker
                                        label="Tahmini Bitiş Tarihi"
                                        value={predictEndDate}
                                        onChange={(newValue) => {
                                            setPredictEndDate(newValue);
                                            if (predictEndDateError && newValue) setPredictEndDateError(false);
                                        }}
                                        inputFormat="dd/MM/yyyy"
                                        minDate={startDate || undefined}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                fullWidth
                                                error={predictEndDateError}
                                                helperText={predictEndDateError ? "Tahmini bitiş tarihi zorunludur!" : ""}
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                    <CustomFormLabel htmlFor="end-date">Gerçek Bitiş Tarihi</CustomFormLabel>
                                    <DatePicker
                                        label="Gerçek Bitiş Tarihi"
                                        value={endDate}
                                        onChange={(newValue) => setEndDate(newValue)}
                                        inputFormat="dd/MM/yyyy"
                                        minDate={startDate || undefined}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    {editingId !== null ? (
                                        <Button variant="contained" color="info" onClick={editProject} disabled={loadingButton}>
                                            {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Düzenle'}
                                        </Button>
                                    ) : (
                                        <Button variant="contained" color="success" onClick={insertProject} disabled={loadingButton}>
                                            {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Bekleniyor...</> : 'Ekle'}
                                        </Button>
                                    )}
                                    {editingId !== null && <Button variant="outlined" color="secondary" onClick={resetFormAndState}>İptal Et</Button>}
                                </Stack>
                            </Grid>
                        </Grid>
                    </Paper>
                )}
                {alertMessage && (
                    <Stack sx={{ width: '100%', mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}
            </div>
            <BlankCard>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle projeleri indirin" : ""}>
                                <BlinkingButton
                                    variant="contained"
                                    color="secondary"
                                    onClick={() => setOpenDownloadFilteredModal(true)}
                                    startIcon={<IconFileDownload />}
                                    isBlinking={true}
                                    disabled={loadingData || displayedProjects.length === 0}
                                >
                                    Filtrelenmişi İndir
                                </BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Projeleri indirin" : ""}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => setOpenDownloadAllModal(true)}
                                    startIcon={<IconFileDownload />}
                                    disabled={loadingData || projectsList.length === 0}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>
                <Box sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">Proje Listesi</Typography>
                    </Stack>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Proje Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Başlangıç Tarihi"
                                        value={filterStartDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(newValue) => setFilterStartDate(newValue)}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <DatePicker
                                        label="Bitiş Tarihi"
                                        value={filterEndDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(newValue) => setFilterEndDate(newValue)}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                                    />
                                    <IconButton onClick={handleClearDateFilters} aria-label="clear date filters">
                                        <IconX size={20} />
                                    </IconButton>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <ToggleButtonGroup
                                value={statusFilter}
                                exclusive
                                onChange={(_event, newFilter) => newFilter && setStatusFilter(newFilter)}
                                fullWidth
                            >
                                <StyledToggleButton value="all">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                        <Typography variant="h6" sx={{ ml: 2 }}>Projeler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table aria-label="project table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'title'} direction={orderBy === 'title' ? order : 'asc'} onClick={() => handleRequestSort('title')}>
                                            <Typography variant="h6">Proje Başlığı</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')}>
                                            <Typography variant="h6">Proje Kodu</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Proje Tipi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Şantiye</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Firma</Typography></StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'startDate'} direction={orderBy === 'startDate' ? order : 'asc'} onClick={() => handleRequestSort('startDate')}>
                                            <Typography variant="h6">Başlangıç Tarihi</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Tahmini Bitiş Tarihi</Typography></StyledTableCell>
                                    <StyledTableCell><Typography variant="h6">Gerçek Bitiş Tarihi</Typography></StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')}>
                                            <Typography variant="h6">Durum</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedProjects.length > 0 ? (
                                    paginatedProjects.map((row) => (
                                        <TableRow key={row.id}>
                                            <StyledTableCell><Typography variant="body1">{row.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.code || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{mapProjectTypeToString(row.type)}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.workhouse?.name || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.projectFirm?.title || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.startDate)}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.predictEndDate)}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.endDate)}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Chip
                                                    label={row.recordStatus === 0 ? 'Aktif' : 'Pasif'}
                                                    color={row.recordStatus === 0 ? 'success' : 'error'}
                                                />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(event) => handleClickMenu(event, row)}><IconDots width={18} /></IconButton>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Proje için planlama sayfasına git" : ""}>
                                                        <MuiMenuItem onClick={handlePlanlamaClick}>
                                                            {/* می‌توانید از آیکونی مانند IconPlus یا IconEdit استفاده کنید */}
                                                            <ListItemIcon><IconPlus width={18} /></ListItemIcon>
                                                            Planlama Sayfasına Git
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                    {hasEditPermission && selectedRowForMenu?.recordStatus === 0 ? (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu projeyi pasif yap" : ""}>
                                                            <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 1)}>
                                                                <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Pasif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    ) : (
                                                        <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu projeyi aktif yap" : ""}>
                                                            <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 0)}>
                                                                <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon> Aktif Yap
                                                            </MuiMenuItem>
                                                        </CustomTooltip>
                                                    )}
                                                    {hasEditPermission && (
                                                        <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle</MuiMenuItem>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek</MuiMenuItem>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu satırı indir
                                                        </MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <StyledTableCell colSpan={10} align="center">
                                            <Typography variant="subtitle1" color="textSecondary">
                                                Hiç proje bulunamadı.
                                            </Typography>
                                        </StyledTableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={displayedProjects.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </BlankCard>

            <ProjectFirmManagement
                open={openFirmManagementModal}
                onClose={() => setOpenFirmManagementModal(false)}
                onFirmChange={fetchFirms}
            />
            <DeleteProject
                openModal={openDeleteModal}
                onClose={() => setOpenDeleteModal(false)}
                projectIdToDelete={projectIdToDelete}
                projectTitleToDelete={projectTitleToDelete}
                onDeleteSuccess={fetchProjects}
                showAlert={showAlert}
            />

            {/* ✨ NEW: Modal for all downloads */}
            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Projeleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', false); handleCloseDownloadAllModal(); }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', false); handleCloseDownloadAllModal(); }}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadAllModal} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✨ NEW: Modal for filtered downloads */}
            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Projeleri İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => { handleDownload('pdf', true); handleCloseDownloadFilteredModal(); }}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => { handleDownload('excel', true); handleCloseDownloadFilteredModal(); }}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadFilteredModal} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ✨ NEW: Modal for single row download */}
            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => handleDownloadSingleProject('pdf')}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={() => handleDownloadSingleProject('excel')}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRowDownloadModal} color="secondary">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListProjects;