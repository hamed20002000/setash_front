import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    MenuItem as MuiMenuItem,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, Dialog, DialogTitle,
    DialogContent, DialogActions,
    TableSortLabel, RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload,
    IconX, IconCheck, IconUserOff
} from '@tabler/icons-react';

import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TimePicker, LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useAuth } from 'src/context/AuthContext';
import { CustomTooltip } from 'src/context/TooltipContext';
import DeleteRollCalls from './DeleteRollCalls';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import BlankCard from "src/components/shared/BlankCard";
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";


const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    try {
        return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        return "Geçersiz Tarih";
    }
};

const parseTimeForTimePicker = (timeString: string | null): Date | null => {
    if (!timeString || timeString === "00:00:00") return null;
    try {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    } catch (e) {
        return null;
    }
}

const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: {
        fontSize: '1rem',
    },
}));

interface WorkhouseType {
    id: number;
    name: string;
    code: string;
}

interface PersonnelWorkPlace {
    id: number;
    personnel: { id: number; name: string; family: string; identityNumber: string; };
    position: { id: number; title: string } | null;
    placeId: number;
    type: 0 | 1 | 2 | 3;
    placeKind: string;
    placeName: string;
    personnelName: string;
    personnelIdentity: string;
    hasRollCallToday: boolean;
    todayAbsenceStatus?: boolean;
}

interface RollCallType {
    id: number;
    date: string;
    startTime: string | null;
    endTime: string | null;
    createAt: string;
    recordStatus: number;
    absence: boolean;
    personnelWorkPlace: {
        id: string;
        placeId: string;
        type: string;
        personnel: { id: string; name: string; family: string; identityNumber?: string; };
        position: { id: string; title: string; };
        workhouse?: { name: string };
    };
    personnelName: string;
    personnelIdentity: string;
    placeName: string;
    positionTitle: string;
    status: 'Aktif' | 'Pasif';
}

type SortableRollCallKeys = 'date' | 'startTime' | 'endTime' | 'createAt' | 'personnelName' | 'placeName';

interface DailyTimes {
    startTime: Date | null;
    endTime: Date | null;
    loading: boolean;
}


const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    const valA = a[orderBy];
    const valB = b[orderBy];
    if (valB === undefined || valB === null) {
        return (valA === undefined || valA === null) ? 0 : -1;
    }
    if (valA === undefined || valA === null) {
        return 1;
    }
    if (typeof valB === 'string' && typeof valA === 'string') {
        return valB.localeCompare(valA);
    }
    if (String(valB) < String(valA)) {
        return -1;
    }
    if (String(valB) > String(valA)) {
        return 1;
    }
    return 0;
};

const getComparator = (order: 'asc' | 'desc', orderBy: SortableRollCallKeys): (a: RollCallType, b: RollCallType) => number => {
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

const ListRollCalls = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [itemToEdit, setItemToEdit] = useState<RollCallType | null>(null);
    const [selectedStartTime, setSelectedStartTime] = useState<Date | null>(null);
    const [selectedEndTime, setSelectedEndTime] = useState<Date | null>(null);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [editValidationErrors, setEditValidationErrors] = useState<boolean>(false);
    const [editAbsence, setEditAbsence] = useState<boolean>(false);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const defaultStartTime = useMemo(() => {
        const date = new Date();
        date.setHours(8, 0, 0, 0);
        return date;
    }, []);
    const defaultEndTime = useMemo(() => {
        const date = new Date();
        date.setHours(17, 0, 0, 0);
        return date;
    }, []);
    const [dailyTimes, setDailyTimes] = useState<Record<number, DailyTimes>>({});
    const [isDailyRegisterLoading, setIsDailyRegisterLoading] = useState<Record<number, boolean>>({});

    const [dailyFilterType, setDailyFilterType] = useState<'all' | 'workhouse' | 'store'>('all');
    const [workhouses, setWorkhouses] = useState<WorkhouseType[]>([]);
    const [selectedWorkhouseId, setSelectedWorkhouseId] = useState<number | null>(null);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [loadingWorkplaces, setLoadingWorkplaces] = useState<boolean>(false);


    const [rollCallsList, setRollCallsList] = useState<RollCallType[]>([]);
    const [personnelWorkPlaces, setPersonnelWorkPlaces] = useState<PersonnelWorkPlace[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [orderBy, setOrderBy] = useState<SortableRollCallKeys>('createAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const [itemToDelete, setItemToDelete] = useState<RollCallType | null>(null);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<RollCallType | null>(null);
    const openMenu = Boolean(anchorEl);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);

    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedDailyDate, setSelectedDailyDate] = useState<Date | null>(new Date());


    const [dailySearchTerm, setDailySearchTerm] = useState('');
    const [dailyPage, setDailyPage] = useState(0);
    const [dailyRowsPerPage, setDailyRowsPerPage] = useState(10);

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
      op.systemOperationName === opName
    //  &&
    //   currentMenuOpIds.includes(String(op.menuOperationId))
    );
  };

    const hasCreatePermission = useMemo(() => hasPermission("Eklemek"), [allowedOperations, currentMenuOpIds]);
    const hasEditPermission = useMemo(() => hasPermission("Düzenlemek"), [allowedOperations, currentMenuOpIds]);
    const hasDeletePermission = useMemo(() => hasPermission("Silmek"), [allowedOperations, currentMenuOpIds]);
    const hasDownloadPermission = useMemo(() => hasPermission("İndirmek ve Yazdırmak"), [allowedOperations, currentMenuOpIds]);

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
            const res = await axios.get(
                server.baseurl + server.initialoperations + "get-workhouse",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                setWorkhouses(res.data.data.filter((w: any) => Number(w.recordStatus) === 0));
            }
        } catch (e: any) {
            console.error('Workhouses fetch error:', e);
        } finally {
            setLoadingWorkplaces(false);
        }
    }, []);



    const fetchPersonnelWorkPlaces = useCallback(async (rollCalls?: RollCallType[], dateToCheck: Date | null = new Date()) => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        let apiUrl = `${server.baseurl}${server.hr}get-all-personnels-work-places`;
        let skipFetch = false;

        if (dailyFilterType === 'workhouse') {
            if (selectedWorkhouseId === null) {
                skipFetch = true;
            } else {
                apiUrl = `${server.baseurl}${server.hr}get-all-personnels-work-places-by-workhouse/${selectedWorkhouseId}`;
            }
        }

        if (skipFetch) {
            setPersonnelWorkPlaces([]);
            setLoadingData(false);
            return;
        }

        try {
            const res = await axios.get(apiUrl, {
                headers: { Authorization: `Bearer ${authToken}` }
            });

            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const rawData = res.data.data.filter((r: any) => r.endDate === null && (Number(r.type) === 1 || Number(r.type) === 2));

                const today = format(dateToCheck || new Date(), 'yyyy-MM-dd');
                const todayRollCalls = rollCalls ? rollCalls.filter(rc => format(new Date(rc.date), 'yyyy-MM-dd') === today) : [];

                const workhouseAssignments: PersonnelWorkPlace[] = rawData.map((r: any) => {
                    const personnelWorkPlaceId = Number(r.id);
                    const existingToday = todayRollCalls.find(rc => Number(rc.personnelWorkPlace?.id) === personnelWorkPlaceId);
                    const hasRollCallToday = !!existingToday;

                    let placeName = r.workhouse?.name || r.store?.name || '-';
                    return {
                        id: personnelWorkPlaceId,
                        personnel: { id: Number(r.personnel.id), name: r.personnel.name, family: r.personnel.family, identityNumber: r.personnel.identityNumber || '' },
                        position: r.position ? { id: Number(r.position.id), title: r.position.title } : null,
                        placeId: Number(r.placeId),
                        type: Number(r.type) as 1 | 2,
                        placeKind: Number(r.type) === 1 ? 'WORKHOUSE' : 'STORE',
                        placeName: placeName,
                        personnelName: `${r.personnel?.name ?? ''} ${r.personnel?.family ?? ''}`.trim(),
                        personnelIdentity: r.personnel.identityNumber || '-',
                        hasRollCallToday: hasRollCallToday,
                        todayAbsenceStatus: existingToday?.absence
                    };
                });
                setPersonnelWorkPlaces(workhouseAssignments);

            } else {
                setPersonnelWorkPlaces([]);
                showAlert('Yoklama listesi yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            setPersonnelWorkPlaces([]);
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert, dailyFilterType, selectedWorkhouseId, selectedStoreId]);

    const fetchRollCalls = useCallback(async () => {
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
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-RollCalls`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: requestParams
            });

            if (res.data.httpStatusCode === 200 && Array.isArray(res.data.data)) {
                const mappedData: RollCallType[] = res.data.data.map((r: any) => ({
                    id: Number(r.id),
                    date: r.date,
                    startTime: r.startTime,
                    endTime: r.endTime,
                    createAt: r.createAt,
                    recordStatus: Number(r.recordStatus),
                    absence: r.absence,
                    personnelWorkPlace: r.personnelWorkPlace,
                    personnelName: `${r.personnelWorkPlace.personnel?.name ?? ''} ${r.personnelWorkPlace.personnel?.family ?? ''}`.trim(),
                    personnelIdentity: r.personnelWorkPlace.personnel?.identityNumber || '-',
                    positionTitle: r.personnelWorkPlace.position?.title || '-',
                    placeName: r.personnelWorkPlace.workhouse?.name || r.personnelWorkPlace.store?.name || '-',
                    status: Number(r.recordStatus) === 0 ? 'Aktif' : 'Pasif'
                }));
                setRollCallsList(mappedData);
                fetchPersonnelWorkPlaces(mappedData, selectedDailyDate);
            } else {
                showAlert('Yoklama listesi yüklenirken bir hata oluştu.', 'error');
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
    }, [navigate, showAlert, fetchPersonnelWorkPlaces, selectedDailyDate]);


    useEffect(() => {
        fetchRollCalls();
        fetchWorkhouses()
    }, [fetchRollCalls, fetchWorkhouses]);
    useEffect(() => {
        if (dailyFilterType !== 'all' || selectedWorkhouseId !== null || selectedStoreId !== null || selectedDailyDate) {
            fetchPersonnelWorkPlaces(rollCallsList, selectedDailyDate);
        }
    }, [dailyFilterType, selectedWorkhouseId, selectedStoreId, selectedDailyDate, fetchPersonnelWorkPlaces, rollCallsList]);

    useEffect(() => {
        if (dailyFilterType === 'store' && selectedWorkhouseId) {
        } else if (dailyFilterType === 'store' && selectedWorkhouseId === null) {
            setSelectedStoreId(null);
        }
    }, [dailyFilterType, selectedWorkhouseId]);


    const handleDailyTimeChange = useCallback((id: number, field: keyof DailyTimes, value: Date | null) => {
        setDailyTimes(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    }, []);

    const handleDailyRollCall = useCallback(async (row: PersonnelWorkPlace, isAbsent: boolean) => {
        if (!hasCreatePermission || isDailyRegisterLoading[row.id] || row.hasRollCallToday) return;

        const dailyRecord = dailyTimes[row.id] || { startTime: defaultStartTime, endTime: defaultEndTime };
        const { startTime, endTime } = dailyRecord;

        if (!isAbsent && (!startTime || !endTime || startTime >= endTime)) {
            showAlert('Başlangıç ve Bitiش saatleri doğru seçilmelidir.', 'error');
            return;
        }

        setIsDailyRegisterLoading(prev => ({ ...prev, [row.id]: true }));
        const authToken = localStorage.getItem('authToken');

        const payload = {
            date: selectedDailyDate ? format(selectedDailyDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            startTime: isAbsent ? "00:00:00" : format(startTime!, 'HH:mm:00'),
            endTime: isAbsent ? "00:00:00" : format(endTime!, 'HH:mm:00'),
            personnelWorkPlaceId: row.id,
            absence: isAbsent ? 1 : 0
        };

        try {
            const response = await axios.post(`${server.baseurl}${server.hr}create-roll-call`, payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 201) {
                showAlert(`${row.personnelName} için kayıt başarıyla onaylandı.`, 'success');
                fetchRollCalls();
            } else {
                showAlert(response.data.message || 'Kayıt eklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Hata oluştu.', 'error');
        } finally {
            setIsDailyRegisterLoading(prev => ({ ...prev, [row.id]: false }));
        }
    }, [hasCreatePermission, isDailyRegisterLoading, dailyTimes, defaultStartTime, defaultEndTime, showAlert, selectedDailyDate, fetchRollCalls]);

    const validateEditForm = () => {
        if (editAbsence) return true;
        const isTimeSelected = selectedStartTime && selectedEndTime;
        if (!isTimeSelected) {
            showAlert('Başlangıç ve Bitiş saatleri zorunludur.', 'warning');
            setEditValidationErrors(true);
            return false;
        }
        if (selectedStartTime! >= selectedEndTime!) {
            showAlert('Bitiş saati, Başlangıç saatinden sonra olmalıdır.', 'warning');
            setEditValidationErrors(true);
            return false;
        }
        setEditValidationErrors(false);
        return true;
    };


    const handleOpenEditModal = () => {
        if (!selectedRowForMenu || !hasEditPermission) return;

        const row = selectedRowForMenu;
        setItemToEdit(row);
        setEditingId(row.id);
        setEditAbsence(row.absence);

        try {
            setSelectedStartTime(parseTimeForTimePicker(row.startTime));
            setSelectedEndTime(parseTimeForTimePicker(row.endTime));
        } catch (e) {
            showAlert('Tarih/saat verileri dönüştürülürken hata oluştu.', 'error');
            return;
        }
        setOpenEditModal(true);
        handleCloseMenu();
    };

    const handleCloseEditModal = () => {
        setOpenEditModal(false);
        setItemToEdit(null);
        setEditingId(null);
        setSelectedStartTime(null);
        setSelectedEndTime(null);
        setEditValidationErrors(false);
        setLoadingButton(false);
        clearAlert();
    };


    const editRollCall = async () => {
        if (!validateEditForm() || !editingId || !hasEditPermission) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');

        try {
            const payload = {
                id: Number(editingId),
                date: itemToEdit!.date,
                startTime: editAbsence ? "00:00:00" : (selectedStartTime ? format(selectedStartTime, 'HH:mm:00') : null),
                endTime: editAbsence ? "00:00:00" : (selectedEndTime ? format(selectedEndTime, 'HH:mm:00') : null),
                personnelWorkPlaceId: Number(itemToEdit!.personnelWorkPlace.id),
                absence: editAbsence ? 1 : 0
            };

            const response = await axios.put(`${server.baseurl}${server.hr}update-roll-call`, payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" }
            });

            if (response.data.httpStatusCode === 200) {
                showAlert('Yoklama kaydı başarıyla güncellendi.', 'success');
                handleCloseEditModal();
                fetchRollCalls();
            } else {
                showAlert(response.data.message || 'Hata oluştu.', 'error');
            }
        } catch (e: any) {
            showAlert(e.response?.data?.message || 'Hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };

    const filteredPersonnelForDaily = useMemo(() => {
        const term = dailySearchTerm.toLowerCase().trim();
        if (!term) return personnelWorkPlaces;

        return personnelWorkPlaces.filter(p =>
            p.personnelName.toLowerCase().includes(term) ||
            p.personnelIdentity.includes(term)
        );
    }, [personnelWorkPlaces, dailySearchTerm]);

    const paginatedPersonnelList = useMemo(() => {
        const startIndex = dailyPage * dailyRowsPerPage;
        return filteredPersonnelForDaily.slice(startIndex, startIndex + dailyRowsPerPage);
    }, [filteredPersonnelForDaily, dailyPage, dailyRowsPerPage]);


    const displayedRollCalls = useMemo(() => {
        const startFilterDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
        const endFilterDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;

        const filteredBySearchAndStatus = rollCallsList.filter(rc => {
            const matchesSearch = searchTerm.trim() === '' ||
                rc.personnelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rc.placeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rc.positionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rc.personnelIdentity.toLowerCase().includes(searchTerm.toLowerCase());

            const rollCallDate = format(new Date(rc.date), 'yyyy-MM-dd');

            const matchesDateRange = (!startFilterDate || rollCallDate >= startFilterDate) &&
                (!endFilterDate || rollCallDate <= endFilterDate);

            return matchesSearch && matchesDateRange;
        });

        const sortedData = stableSort(filteredBySearchAndStatus, getComparator(order, orderBy));
        return sortedData;
    }, [rollCallsList, searchTerm, order, orderBy, startDate, endDate]);

    const paginatedRollCalls = useMemo(() => {
        return displayedRollCalls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [displayedRollCalls, page, rowsPerPage]);

    const handleRequestSort = (property: SortableRollCallKeys) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };

    const handleChangePage = (_event: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: RollCallType) => {
        setAnchorEl(event.currentTarget);
        setSelectedRowForMenu(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedRowForMenu(null);
    };

    const handleClickOpenDeleteModal = () => {
        if (selectedRowForMenu) {
            setItemToDelete(selectedRowForMenu);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickCloseDeleteModal = () => {
        setOpenDeleteModal(false);
        setItemToDelete(null);
        fetchRollCalls();
    };


    const exportRollCallsToPdf = async (data: RollCallType[], isFiltered: boolean) => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true);
        showAlert('Rapor oluşturuluyor...', 'info');

        const doc = new jsPDF();
        const docAny = doc as any;

        if (typeof docAny.addFileToVFS === 'function') {
            docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            docAny.setFont('NotoSans');
        } else {
            docAny.setFont('Helvetica');
        }

        const columns = [
            "Personel", "TC Kimlik", "Pozisyon", "Tarih", "Başlangıç", "Bitiش", "Durum"
        ];
        const rows = data.map(row => [
            row.personnelName,
            row.personnelIdentity,
            row.positionTitle,
            formatDateDisplay(row.date),
            row.absence ? "-" : (row.startTime || '-'),
            row.absence ? "-" : (row.endTime || '-'),
            row.absence ? "Gelmedi" : "Geldi"
        ]);

        const headerTitle = isFiltered ? "Filtrelenmiş Yoklama Raporu" : "Tüm Yoklama Raporu";

        autoTable(docAny, {
            startY: 45,
            head: [columns],
            body: rows,
            theme: 'grid',
            styles: { font: docAny.getFont().fontName, fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: (_hookData: any) => {
                addPdfHeader(doc, headerTitle);
                addPdfFooter(doc);
            },
            showHead: 'everyPage',
            margin: { top: 65, bottom: 45, left: 10, right: 10 }
        });
        docAny.save(isFiltered ? 'Filtrelenmis_Yoklamalar.pdf' : 'Tum_Yoklamalar.pdf');
        showAlert('PDF başarıyla oluşturuldu.', 'success');
        setLoadingData(false);
    };

    const exportRollCallsToExcel = async (data: RollCallType[], isFiltered: boolean) => {
        if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true);
        showAlert('Rapor oluşturuluyor...', 'info');

        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Yoklamalar');

        const columns = [
            "Personel", "TC Kimlik", "Pozisyon", "Tarih", "Başlangıç Saati", "Bitiش Saati", "Durum"
        ];
        const headerTitle = isFiltered ? "Filtrelenmiş Yoklama Raporu" : "Tüm Yoklama Raporu";
        addExcelHeader(worksheet, headerTitle, columns.length);

        const headerRow = worksheet.addRow(columns);
        headerRow.font = { name: 'NotoSans', bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        });

        data.forEach(row => {
            worksheet.addRow([
                row.personnelName,
                row.personnelIdentity,
                row.positionTitle,
                formatDateDisplay(row.date),
                row.absence ? "-" : (row.startTime || '-'),
                row.absence ? "-" : (row.endTime || '-'),
                row.absence ? "Gelmedi" : "Geldi"
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

        const fileName = isFiltered ? 'Filtrelenmis_Yoklamalar.xlsx' : 'Tum_Yoklamalar.xlsx';
        workbook.xlsx.writeBuffer().then(buffer => {
            saveAs(new Blob([buffer]), fileName);
            showAlert('Excel başarıyla oluşturuldu.', 'success');
        });
        setLoadingData(false);
    };

    const handleOpenDownloadAllModal = () => { setOpenDownloadAllModal(true); };
    const handleCloseDownloadAllModal = () => { setOpenDownloadAllModal(false); };

    const handleOpenDownloadFilteredModal = () => { setOpenDownloadFilteredModal(true); };
    const handleCloseDownloadFilteredModal = () => { setOpenDownloadFilteredModal(false); };

    const handleDownloadAll = (format: 'pdf' | 'excel', isFiltered: boolean) => {
        const dataToDownload = isFiltered ? displayedRollCalls : rollCallsList;

        if (format === 'pdf') {
            exportRollCallsToPdf(dataToDownload, isFiltered);
        } else {
            exportRollCallsToExcel(dataToDownload, isFiltered);
        }
        if (isFiltered) {
            handleCloseDownloadFilteredModal();
        } else {
            handleCloseDownloadAllModal();
        }
    };
    const handleOpenRowDownloadModal = (_rollCall: RollCallType) => {
        setOpenRowDownloadModal(true);
        handleCloseMenu();
    };
    const handleCloseRowDownloadModal = () => {
        setOpenRowDownloadModal(false);
    };

    const handleClearDateFilters = useCallback(() => {
        setStartDate(null);
        setEndDate(null);
        setPage(0);
    }, []);

    return (
        <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Grid container justifyContent="space-between" alignItems="center" mb={3}>
                    <Grid item xs={12} md={4} mb={{ xs: 2, md: 0 }}>
                        <Typography variant="h5">
                            Yoklama Onayı ({formatDateDisplay(selectedDailyDate?.toISOString())})
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" alignItems="center">
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                <DatePicker
                                    label="Kayıt Tarihi Seçین"
                                    value={selectedDailyDate}
                                    inputFormat="dd/MM/yyyy"
                                    maxDate={new Date()}
                                    onChange={(newValue) => {
                                        setSelectedDailyDate(newValue);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            size="small"
                                            sx={{ minWidth: 200 }}
                                            variant="outlined"
                                        />
                                    )}
                                />
                            </LocalizationProvider>
                        </Stack>
                    </Grid>
                </Grid>
                <Grid container spacing={2} alignItems="flex-end" mb={3}>
                    <Grid item xs={12} sm={4}>
                        <CustomFormLabel>Filtre Tipi</CustomFormLabel>
                        <TextField
                            select
                            fullWidth
                            size="small"
                            value={dailyFilterType}
                            onChange={(e) => {
                                const newFilterType = e.target.value as 'all' | 'workhouse' | 'store';
                                setDailyFilterType(newFilterType);
                                setSelectedWorkhouseId(null);
                                setSelectedStoreId(null);
                            }}
                        >
                            <MuiMenuItem value="all">Tüm Çalışanlar</MuiMenuItem>
                            <MuiMenuItem value="workhouse">Şantiye Çalışanları</MuiMenuItem>
                        </TextField>
                    </Grid>

                    {dailyFilterType === 'workhouse' && (
                        <Grid item xs={12} sm={4}>
                            <CustomFormLabel>Şantiye Seçin</CustomFormLabel>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                value={selectedWorkhouseId || ''}
                                onChange={(e) => {

                                    const newWorkhouseId = e.target.value === '' ? null : Number(e.target.value);
                                    setPersonnelWorkPlaces([]);
                                    setLoadingData(true);
                                    setSelectedWorkhouseId(newWorkhouseId);

                                }}
                                disabled={loadingWorkplaces}
                            >
                                {workhouses.map((wh) => (
                                    <MuiMenuItem key={wh.id} value={wh.id}>{wh.name}</MuiMenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}

                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            placeholder="Personel adı , T.C. Kimlik No ile ara..."
                            value={dailySearchTerm}
                            onChange={(e) => {
                                setDailySearchTerm(e.target.value);
                                setDailyPage(0);
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconSearch size={18} />
                                    </InputAdornment>
                                ),
                                endAdornment: dailySearchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setDailySearchTerm('')}>
                                            <IconX size={16} />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                </Grid>

                <>

                    {alertMessage && (
                        <Stack sx={{ width: '100%', mb: 2 }} spacing={2}>
                            <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                        </Stack>
                    )}
                </>
                <TableContainer>
                    <Table size="small">
                        <TableHead sx={{ background: theme.palette.grey[200] }}>
                            <TableRow>
                                <StyledTableCell>Personel (TC)</StyledTableCell>
                                <StyledTableCell>Pozisyon</StyledTableCell>
                                <StyledTableCell>Tarih</StyledTableCell>
                                <StyledTableCell>Başlangıç</StyledTableCell>
                                <StyledTableCell>Bitiش</StyledTableCell>
                                <StyledTableCell>Eylem</StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedPersonnelList.length > 0 ? (
                                paginatedPersonnelList.map((row) => {
                                    const isRegistered = row.hasRollCallToday;
                                    return (
                                        <TableRow key={row.id}>
                                            <StyledTableCell>
                                                <Typography variant="body2" fontWeight="bold">{row.personnelName}</Typography>
                                                <Typography variant="caption" color="textSecondary">{row.personnelIdentity}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <Typography variant="body2">{row.position?.title || '-'}</Typography>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                {formatDateDisplay(selectedDailyDate?.toISOString())}
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                                    <TimePicker
                                                        value={dailyTimes[row.id]?.startTime || defaultStartTime}
                                                        onChange={(v) => handleDailyTimeChange(row.id, 'startTime', v)}
                                                        renderInput={(params) => <TextField {...params} size="small" sx={{ width: 130 }} />}
                                                        ampm={false}
                                                        disabled={isRegistered}
                                                    />
                                                </LocalizationProvider>
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                                    <TimePicker
                                                        value={dailyTimes[row.id]?.endTime || defaultEndTime}
                                                        onChange={(v) => handleDailyTimeChange(row.id, 'endTime', v)}
                                                        renderInput={(params) => <TextField {...params} size="small" sx={{ width: 130 }} />}
                                                        ampm={false}
                                                        disabled={isRegistered}
                                                    />
                                                </LocalizationProvider>
                                            </StyledTableCell>

                                            <StyledTableCell>
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        variant={isRegistered && !row.todayAbsenceStatus ? "contained" : "outlined"}
                                                        color="success"
                                                        size="small"
                                                        onClick={() => handleDailyRollCall(row, false)}
                                                        disabled={isRegistered || isDailyRegisterLoading[row.id]}
                                                        startIcon={<IconCheck size={16} />}
                                                    >
                                                        Var
                                                    </Button>
                                                    <Button
                                                        variant={isRegistered && row.todayAbsenceStatus ? "contained" : "outlined"}
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleDailyRollCall(row, true)}
                                                        disabled={isRegistered || isDailyRegisterLoading[row.id]}
                                                        startIcon={<IconUserOff size={16} />}
                                                    >
                                                        Yok
                                                    </Button>
                                                </Stack>
                                            </StyledTableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={6} align="center">
                                        <Typography color="textSecondary">Kayıt bulunamadı.</Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={filteredPersonnelForDaily.length}
                    rowsPerPage={dailyRowsPerPage}
                    page={dailyPage}
                    onPageChange={(_, newPage) => setDailyPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setDailyRowsPerPage(parseInt(e.target.value, 10));
                        setDailyPage(0);
                    }}
                    labelRowsPerPage="Satır:"
                />
            </Paper>

            <Grid container spacing={2} alignItems="center" mb={2}>
                <Grid item xs={12} sm={7}>
                    <Typography variant="h4">Yoklama Kayıt Geçmişi</Typography>
                </Grid>
                <Grid item xs={12} sm={5}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 2, sm: 1 }}
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        justifyContent="flex-end"
                    >
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleOpenDownloadAllModal}
                            startIcon={<IconFileDownload />}
                            disabled={loadingData}
                            fullWidth={true}
                        >
                            Tümünü İndir
                        </Button>

                        {(searchTerm.trim() !== '' || startDate || endDate) && hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="info"
                                onClick={handleOpenDownloadFilteredModal}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || displayedRollCalls.length === 0}
                                fullWidth={true}
                            >
                                Filtrelenmiş İndir ({displayedRollCalls.length})
                            </Button>
                        )}
                    </Stack>
                </Grid>
            </Grid>

            <BlankCard>
                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={6}>
                            <TextField
                                label="Personel, Pozisyon veya Şantiye Ara"
                                variant="outlined"
                                fullWidth
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <DatePicker
                                        label="Başlangıç Tarihi"
                                        value={startDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(v) => { setStartDate(v); setPage(0); }}
                                        renderInput={(p) => (<TextField {...p} size="small" fullWidth />)}
                                    />
                                    <DatePicker
                                        label="Bitiş Tarihi"
                                        value={endDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(v) => { setEndDate(v); setPage(0); }}
                                        renderInput={(p) => (<TextField {...p} size="small" fullWidth />)}
                                    />
                                    <CustomTooltip title="Tarih Filtrelerini Temizle">
                                        <IconButton
                                            onClick={handleClearDateFilters}
                                            aria-label="clear date filters"
                                            disabled={!startDate && !endDate}
                                        >
                                            <IconX size={20} />
                                        </IconButton>
                                    </CustomTooltip>
                                </Stack>
                            </LocalizationProvider>
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
                        <Table aria-label="roll call table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'personnelName'} direction={orderBy === 'personnelName' ? order : 'asc'} onClick={() => handleRequestSort('personnelName')}>Personel</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>TC Kimlik</StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>Pozisyon</StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'date'} direction={orderBy === 'date' ? order : 'asc'} onClick={() => handleRequestSort('date')}>Tarih</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>Durum</StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>Başlangıç</StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>Bitiş</StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRollCalls.length > 0 ? (
                                    paginatedRollCalls.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <StyledTableCell><Typography variant="body1">{row.personnelName}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.personnelIdentity}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.positionTitle || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.date)}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <Typography color={row.absence ? "error" : "success.main"} fontWeight="bold">
                                                    {row.absence ? "Gelmedi" : "Geldi"}
                                                </Typography>
                                            </StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.absence ? "-" : (row.startTime || '-')}</Typography></StyledTableCell>
                                            <StyledTableCell><Typography variant="body1">{row.absence ? "-" : (row.endTime || '-')}</Typography></StyledTableCell>
                                            <StyledTableCell>
                                                <IconButton onClick={(event) => handleClickMenu(event, row)}>
                                                    <IconDots width={18} />
                                                </IconButton>
                                                <Menu
                                                    anchorEl={anchorEl}
                                                    open={openMenu && selectedRowForMenu?.id === row.id}
                                                    onClose={handleCloseMenu}
                                                >
                                                    {hasEditPermission && (
                                                        <MuiMenuItem onClick={handleOpenEditModal}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenle</MuiMenuItem>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
                                                    )}
                                                    {hasDownloadPermission && (
                                                        <MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon>Bu Satırı İndیر</MuiMenuItem>
                                                    )}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><StyledTableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç yoklama kaydı bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={displayedRollCalls.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına düşen:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            <Dialog open={openEditModal} onClose={handleCloseEditModal} maxWidth="xs" fullWidth>
                <DialogTitle>
                    Kayıt Düzenle: {itemToEdit?.personnelName}
                </DialogTitle>
                <DialogContent dividers>
                    <Box mb={3}>
                        <CustomFormLabel>Katılım Durumu</CustomFormLabel>
                        <RadioGroup
                            row
                            value={editAbsence ? "absent" : "present"}
                            onChange={(e) => {
                                setEditAbsence(e.target.value === "absent");
                                setEditValidationErrors(false);
                            }}
                        >
                            <FormControlLabel value="present" control={<Radio color="success" />} label="Geldi (Var)" />
                            <FormControlLabel value="absent" control={<Radio color="error" />} label="Gelmedi (Yok)" />
                        </RadioGroup>
                    </Box>

                    {!editAbsence && (
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <CustomFormLabel required>Başlangıç Saati</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                    <TimePicker
                                        value={selectedStartTime}
                                        onChange={(v) => { setSelectedStartTime(v); setEditValidationErrors(false); }}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth error={editValidationErrors} />}
                                        ampm={false}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={6}>
                                <CustomFormLabel required>Bitiş Saati</CustomFormLabel>
                                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                    <TimePicker
                                        value={selectedEndTime}
                                        onChange={(v) => { setSelectedEndTime(v); setEditValidationErrors(false); }}
                                        renderInput={(params) => <TextField {...params} size="small" fullWidth error={editValidationErrors} />}
                                        ampm={false}
                                    />
                                </LocalizationProvider>
                            </Grid>
                        </Grid>
                    )}

                    {editValidationErrors && (
                        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                            Lütfen saatleri kontrol edin. Bitiş saati başlangıçtan sonra olmalıdır.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditModal} color="secondary">İptal Et</Button>
                    <Button onClick={editRollCall} color="info" disabled={loadingButton} variant="contained">
                        {loadingButton ? 'Güncelleniyor...' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDownloadAllModal} onClose={handleCloseDownloadAllModal} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">Toplam Kayıt Sayısı: {rollCallsList.length}</Typography>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('pdf', false)}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('excel', false)}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadAllModal} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDownloadFilteredModal} onClose={handleCloseDownloadFilteredModal} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="textSecondary">Filtrelenmiş Kayıt Sayısı: {displayedRollCalls.length}</Typography>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('pdf', true)}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleDownloadAll('excel', true)}>
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDownloadFilteredModal} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openRowDownloadModal} onClose={handleCloseRowDownloadModal} maxWidth="xs">
                <DialogTitle>Satır İndirme Seçeneği</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        {selectedRowForMenu && (
                            <>
                                <Typography variant="subtitle2" color="textSecondary">
                                    {selectedRowForMenu.personnelName} kaydı için:
                                </Typography>
                                <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => exportRollCallsToPdf([selectedRowForMenu], true)}>PDF Olarak İندیر</Button>
                                <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => exportRollCallsToExcel([selectedRowForMenu], true)}>Excel Olarak İندیر</Button>
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRowDownloadModal} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <DeleteRollCalls
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                itemToDelete={itemToDelete}
                showAlert={showAlert}
                onDeleteSuccess={fetchRollCalls}
            />
        </>
    );
};

export default ListRollCalls;