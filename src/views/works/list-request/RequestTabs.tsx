import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    Typography, Box, Stack, Grid, Button, Alert,
    CircularProgress, Paper, Chip, IconButton,
    TableContainer, Table, TableHead, TableRow, TableBody,
    TablePagination,
    TableCell as MuiTableCell,
    Dialog, DialogTitle, DialogActions, DialogContent, DialogContentText,
    Divider, TextField, InputAdornment, ToggleButtonGroup, FormControl,
    ToggleButton as MuiToggleButton, TableSortLabel, Tab, Autocomplete,
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconFileText, IconPlus, IconLink, IconX,
    IconInfoCircle, IconSearch, IconFileDownload
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import DeleteRequest from './DeleteRequest';
import DeleteWorkhouseRent from './DeleteWorkhouseRent';
import { useAuth } from "src/context/AuthContext";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { ArialFont } from 'src/assets/fonts/Arial';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Logo from 'src/assets/images/logos/logo.png';
import MaterialRequestForm from "./MaterialRequestForm";
import RentalRequestForm from "./RentalRequestForm";
import ActionMenu from "./ActionMenu";

interface Attachment { fileUrl: string; }
interface User { username: string; }
interface RequestStatusHistory {
    status: 0 | 1 | 2; statusDescription: string; createAt: string; user: User;
}
export interface MaterialRequestType {
    id: number | string; subject: string; description: string; status: 0 | 1 | 2;
    createAt: string; attachments: Attachment[]; statusDescription?: string | null;
    requestStatusHistories?: RequestStatusHistory[];
    workhouse?: {
        id: string;
        name: string;
        code: string;
        address?: string;
    };
}
export interface Workhouse { id: string; name: string; code: string; }
interface APIWorkhouse { id: string; name: string; code: string; }
export interface WorkhouseRentRequest {
    id: number | string; title: string; description: string; driverInfo: string;
    price: string; company: string; rentStartDate: string; rentEndDate: string;
    status: 0 | 1 | 2; createAt: string; attachments: Attachment[]; workhouse: APIWorkhouse;
    workhouseId?: number; workhouseName?: string;
}
type MaterialOrder = 'asc' | 'desc';
type MaterialOrderBy = keyof MaterialRequestType | 'id' | 'subject' | 'status' | 'createAt';

const StyledToggleButton = styled(MuiToggleButton)(({ theme }) => ({
    fontSize: '0.7rem', padding: '10px 4px', lineHeight: 1.2,
    [theme.breakpoints.up('md')]: { fontSize: '0.75rem', padding: '14px 12px', },
    '&.Mui-selected': { color: 'white' },
    '&.Mui-selected[data-value="all"]': { backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } },
    '&.Mui-selected[data-value="0"]': { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } },
    '&.Mui-selected[data-value="1"]': { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } },
    '&.Mui-selected[data-value="2"]': { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } },
}));
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans', fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem', },
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

const borderBlink = keyframes`
  0% { border-color: rgba(0, 0, 0, 0.23); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0); }
  50% { border-color: #673ab7; box-shadow: 0 0 8px 2px rgba(103, 58, 183, 0.5); }
  100% { border-color: rgba(0, 0, 0, 0.23); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0); }
`;

const descendingComparator = <T, K extends keyof T>(a: T, b: T, orderBy: K) => {
    const va = a[orderBy] as any;
    const vb = b[orderBy] as any;
    if (vb == null) return va == null ? 0 : -1;
    if (va == null) return 1;
    if (typeof vb === "string" && typeof va === "string") return vb.localeCompare(va);
    if (typeof vb === "number" && typeof va === "number") return vb - va;
    if (orderBy === 'createAt' || orderBy === 'rentStartDate' || orderBy === 'rentEndDate') {
        const dateA = Date.parse(String(va));
        const dateB = Date.parse(String(vb));
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return 0;
    }
    if (String(vb) < String(va)) return -1;
    if (String(vb) > String(va)) return 1;
    return 0;
};
const getComparator = <K extends keyof any>(order: MaterialOrder, orderBy: K) =>
    order === "desc"
        ? (a: any, b: any) => descendingComparator(a, b, orderBy)
        : (a: any, b: any) => -descendingComparator(a, b, orderBy);
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
};

const statusToLabel = (s: number) => {
    switch (s) { case 0: return "Beklemede"; case 1: return "Onaylandı"; case 2: return "Reddedildi"; default: return "-"; }
};
const statusToColor = (s: number): 'warning' | 'success' | 'error' | 'primary' => {
    switch (s) { case 0: return "warning"; case 1: return "success"; case 2: return "error"; default: return "primary"; }
};
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try { const date = new Date(dateString); return format(date, 'dd MMMM yyyy', { locale: tr }); } catch (e) { return "Geçersiz Tarih"; }
};
const stripHtml = (htmlString: string): string => {
    if (!htmlString) return '';
    if (typeof window === 'undefined') return htmlString;
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
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



const RequestTabs: React.FC = () => {
    const navigate = useNavigate();
    const { isTooltipGloballyEnabled } = useTooltip();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const [currentTab, setCurrentTab] = useState('material');
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [requestsList, setRequestsList] = useState<MaterialRequestType[]>([]);
    const [rentalRequestsList, setRentalRequestsList] = useState<WorkhouseRentRequest[]>([]);
    const [workhouses, setWorkhouses] = useState<Workhouse[]>([]);
    const [materialSelectedRowForMenu, setMaterialSelectedRowForMenu] = useState<MaterialRequestType | null>(null);
    const [rentalSelectedRowForMenu, setRentalSelectedRowForMenu] = useState<WorkhouseRentRequest | null>(null);
    const [materialItemToEdit, setMaterialItemToEdit] = useState<MaterialRequestType | null>(null);
    const [rentalItemToEdit, setRentalItemToEdit] = useState<WorkhouseRentRequest | null>(null);

    const [openDeleteMaterialModal, setOpenDeleteMaterialModal] = useState(false);
    const [openDeleteRentalModal, setOpenDeleteRentalModal] = useState(false);
    const [openDownloadSingleModal, setOpenDownloadSingleModal] = useState(false);
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false);
    const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState<RequestStatusHistory[]>([]);


    const [materialSearchTerm, setMaterialSearchTerm] = useState('');
    const [materialStatusFilter, setMaterialStatusFilter] = useState<'all' | 0 | 1 | 2>('all');
    const [materialOrderBy, setMaterialOrderBy] = useState<MaterialOrderBy>('createAt');
    const [materialOrder, setMaterialOrder] = useState<MaterialOrder>('desc');
    const [materialPage, setMaterialPage] = useState(0);
    const [materialRowsPerPage, setMaterialRowsPerPage] = useState(5);

    const [rentalSearchTerm, setRentalSearchTerm] = useState('');
    const [rentalStatusFilter, setRentalStatusFilter] = useState<'all' | 0 | 1 | 2>('all');
    const [selectedRentalWorkhouseId, setSelectedRentalWorkhouseId] = useState<string | number>('');
    const [rentalOrderBy, setRentalOrderBy] = useState<keyof WorkhouseRentRequest>('createAt');
    const [rentalOrder, setRentalOrder] = useState<MaterialOrder>('desc');
    const [rentalPage, setRentalPage] = useState(0);
    const [rentalRowsPerPage, setRentalRowsPerPage] = useState(5);


    const [isBlinking, setIsBlinking] = useState(true);

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

    const idsFromState = ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState : (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id)).filter(id => Number.isFinite(id));
    const hasIdsFilter = notifIds.length > 0;
    const idsSet = new Set<number>(notifIds);

    const [openDetailsModal, setOpenDetailsModal] = useState(false);
    const [viewingRow, setViewingRow] = useState<MaterialRequestType | WorkhouseRentRequest | null>(null);

    const handleOpenDetails = (row: MaterialRequestType | WorkhouseRentRequest) => {
        setViewingRow(row);
        setOpenDetailsModal(true);
    };

    const showAlert = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
        setAlertMessage(message);
        setAlertSeverity(severity);
    }, []);
    const clearAlert = () => setAlertMessage(null);
    useEffect(() => {
        let timer: number;
        if (alertMessage) timer = setTimeout(() => clearAlert(), 5000);
        return () => { if (timer) clearTimeout(timer); };
    }, [alertMessage]);

    const handleOpenAttachmentsModal = (attachments: Attachment[]) => {
        setCurrentAttachments(attachments);
        setOpenAttachmentsModal(true);
    };
    const handleDownloadClick = (fileUrl: string) => {
        if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
        const url = `${server.urldpwonload}${fileUrl}`;
        window.open(url, '_blank');
        showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
    };
    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('ids');
        setSearchParams(next, { replace: true });
        navigate(location.pathname, { replace: true, state: { ...(location.state as any), notifIds: [] } });
        setMaterialPage(0);
    };

    const fetchMaterialRequests = useCallback(async () => {
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
            const response = await axios.get(
                server.baseurl + server.hr + "get-all-requests",
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                }
            );
            if (response.data.httpStatusCode === 200 && response.data.data) {

                setRequestsList(response.data.data);
            } else {
                showAlert(response.data.message || 'Malzeme talepleri alınamadı.', 'error');
            }
        } catch (e: any) {
            showAlert('Malzeme talepleri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

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
            if (response.data.httpStatusCode === 200 && response.data.data) {
                setWorkhouses(response.data.data.map((w: any) => ({ id: w.id, name: w.name, code: w.code })));
            }
        } catch (e) {
        }
    }, []);

    const getWorkhouseNameFromRow = (row: MaterialRequestType) => {
        if (row.workhouse && row.workhouse.name) {
            return row.workhouse.name;
        }

        const whId = (row as any).workhouseId;
        if (whId) {
            const found = workhouses.find(w => String(w.id) === String(whId));
            return found ? found.name : "-";
        }

        return "-";
    };

    const fetchRentalRequests = useCallback(async (workhouseId: string | number) => {
        if (!workhouseId) { setRentalRequestsList([]); setLoadingData(false); return; }
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
            const url = `${server.baseurl}${server.initialoperations}get-workhouse-rent-by-workhouse-id/${workhouseId}`;
            const response = await axios.get(url,
                {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    params: requestParams
                });
            if (response.data.httpStatusCode === 200 && response.data.data) {
                const mappedData: WorkhouseRentRequest[] = response.data.data.map((r: any) => ({
                    ...r,
                    workhouseId: Number(r.workhouse?.id) || 0,
                    workhouseName: r.workhouse?.name || 'Bilinmiyor',
                }));
                setRentalRequestsList(mappedData);
            } else {
                setRentalRequestsList([]);
                showAlert(response.data.message || 'Kiralama talepleri alınamadı.', 'error');
            }
        } catch (e: any) {
            setRentalRequestsList([]);
            showAlert('Kiralama talepleri yüklenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    useEffect(() => {
        if (currentTab === 'material') {
            fetchMaterialRequests();
        } else if (currentTab === 'rental') {
            fetchWorkhouses();
            const workhouseParam = searchParams.get('rentalWorkhouseId');
            if (workhouseParam) {
                setSelectedRentalWorkhouseId(workhouseParam);
                fetchRentalRequests(workhouseParam);
            } else {
                setLoadingData(false);
            }
        }
    }, [currentTab, searchParams, fetchMaterialRequests, fetchWorkhouses, fetchRentalRequests]);



    const exportRequestPdf = (requestData: MaterialRequestType | WorkhouseRentRequest, title: string) => {
        const doc = new jsPDF();

        // @ts-ignore
        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        // @ts-ignore
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        // @ts-ignore
        doc.addFileToVFS('Arial.ttf', ArialFont);
        // @ts-ignore
        doc.addFont('Arial.ttf', 'Arial', 'normal');
        // @ts-ignore
        doc.setFont('Arial');

        const isMaterial = (requestData as MaterialRequestType).subject !== undefined;
        const tableData = [
            ['Başlık', isMaterial ? (requestData as MaterialRequestType).subject : (requestData as WorkhouseRentRequest).title],
            ['Durum', statusToLabel(requestData.status)],
            ['Tarih', new Date(requestData.createAt).toLocaleDateString('tr-TR')],
            ['Açıklama', stripHtml(requestData.description) || '-'],
            ...(!isMaterial ? [
                ['Şoför Bilgisi', (requestData as WorkhouseRentRequest).driverInfo || '-'],
                ['Kiralandığı Şirket', (requestData as WorkhouseRentRequest).company || '-'],
                ['Fiyat', (requestData as WorkhouseRentRequest).price + ' TL' || '-'],
                ['Şantiye', (requestData as WorkhouseRentRequest).workhouseName || 'Bilinmiyor'],
                ['Başlangıç', formatDateDisplay((requestData as WorkhouseRentRequest).rentStartDate)],
                ['Bitiş', formatDateDisplay((requestData as WorkhouseRentRequest).rentEndDate)],
            ] : []),
        ];

        autoTable(doc, {
            startY: 50,
            head: [['Özellik', 'Değer']],
            body: tableData,
            theme: 'grid',
            // @ts-ignore
            styles: { font: 'Arial', fontStyle: 'normal', fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            didDrawPage: (_data: any) => {
                addPdfHeader(doc, title);
                addPdfFooter(doc);
                doc.setFontSize(10);
                // @ts-ignore
                doc.setFont('Arial', 'normal');
            },
            margin: { top: 40, bottom: 45 },
        });
        doc.save(`${title.replace(/ /g, '_')}_Raporu_${requestData.id}.pdf`);
    };

    const exportRequestExcel = async (requestData: MaterialRequestType | WorkhouseRentRequest, title: string) => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title);
        worksheet.views = [{ rightToLeft: false }];

        worksheet.addRow(['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.']).font = { bold: true, size: 12 };
        worksheet.addRow(['Rapor Başlığı:', title]).font = { bold: true };
        worksheet.addRow(['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')]);
        worksheet.addRow([]);
        worksheet.addRow([]);

        worksheet.columns = [
            { header: 'Özellik', key: 'key', width: 25 },
            { header: 'Değer', key: 'value', width: 60 }
        ];

        const isMaterial = (requestData as MaterialRequestType).subject !== undefined;
        worksheet.addRow({ key: 'Talep ID', value: requestData.id });
        worksheet.addRow({ key: 'Konu', value: isMaterial ? (requestData as MaterialRequestType).subject : (requestData as WorkhouseRentRequest).title });
        worksheet.addRow({ key: 'Durum', value: statusToLabel(requestData.status) });
        worksheet.addRow({ key: 'Oluşturulma Tarihi', value: new Date(requestData.createAt).toLocaleDateString('tr-TR') });
        worksheet.addRow({ key: 'Açıklama', value: stripHtml(requestData.description) || '-' });

        if (!isMaterial) {
            const rentalData = requestData as WorkhouseRentRequest;
            worksheet.addRow({ key: 'Şantiye', value: rentalData.workhouseName || 'Bilinmiyor' });
            worksheet.addRow({ key: 'Şoför Bilgisi', value: rentalData.driverInfo || '-' });
            worksheet.addRow({ key: 'Kiralandığı Şirket', value: rentalData.company || '-' });
            worksheet.addRow({ key: 'Fiyat', value: rentalData.price + ' TL' });
            worksheet.addRow({ key: 'Kira Başlangıç', value: formatDateDisplay(rentalData.rentStartDate) });
            worksheet.addRow({ key: 'Kira Bitiş', value: formatDateDisplay(rentalData.rentEndDate) });
        }

        worksheet.addRow([]);
        worksheet.addRow(['Ekler']).font = { bold: true, size: 12 };
        // @ts-ignore
        worksheet.mergeCells(`A${worksheet.lastRow?.number}:B${worksheet.lastRow?.number}`);

        if (requestData.attachments && requestData.attachments.length > 0) {
            worksheet.addRow(['Dosya Adı', 'URL']).font = { bold: true };
            requestData.attachments.forEach(att => { worksheet.addRow([att.fileUrl.split('/').pop() || '-', att.fileUrl]); });
        } else {
            worksheet.addRow(['Piyes bulunamadı']);
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}_Raporu_${requestData.id}.xlsx`);
    };

    const exportAllRequestsPdf = (dataList: (MaterialRequestType | WorkhouseRentRequest)[], title: string, isMaterial: boolean) => {
        const doc = new jsPDF('l');

        doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        // @ts-ignore
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        // @ts-ignore
        doc.setFont('Arial');

        const materialColumns = ['ID', 'Başlık', 'Şantiye', 'Durum', 'Tarih', 'Açıklama'];
        const rentalColumns = ['ID', 'Başlık', 'Şantiye', 'Başlangıç', 'Bitiş', 'Fiyat', 'Durum', 'Kiralandığı Şirket'];

        const head = [isMaterial ? materialColumns : rentalColumns];

        const body = dataList.map((row) => {
            if (isMaterial) {
                const mRow = row as MaterialRequestType;
                return [
                    mRow.id,
                    mRow.subject,
                    getWorkhouseNameFromRow(mRow),
                    statusToLabel(mRow.status),
                    new Date(mRow.createAt).toLocaleDateString('tr-TR'),
                    stripHtml(mRow.description).substring(0, 50) + '...',
                ];
            } else {
                const rRow = row as WorkhouseRentRequest;
                const priceString = String(rRow.price || 0).replace(/[^0-9.]/g, '');
                const numericPrice = parseFloat(priceString);
                const formattedPrice = isNaN(numericPrice) ? rRow.price || '-' : new Intl.NumberFormat('tr-TR', { currency: 'TRY', minimumFractionDigits: 2 }).format(numericPrice);

                return [
                    rRow.id,
                    rRow.workhouseName || '-',
                    formatDateDisplay(rRow.rentStartDate),
                    formatDateDisplay(rRow.rentEndDate),
                    formattedPrice,
                    statusToLabel(rRow.status),
                    rRow.company || '-',
                ];
            }
        });

        autoTable(doc, {
            head: head,
            body: body,
            startY: 50,
            theme: 'striped',
            // @ts-ignore
            styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 8, cellPadding: 1, overflow: 'linebreak' },
            headStyles: { fillColor: [149, 147, 125], textColor: [255, 255, 255] },

            didDrawPage: (_data: any) => {
                addPdfHeader(doc, title);
                addPdfFooter(doc);
                // @ts-ignore
                doc.setFont('NotoSans', 'normal');
                doc.setFontSize(10);
                doc.text('', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
            },
        });

        doc.save(`${title.replace(/ /g, '_')}_Tüm_Raporlar_${new Date().toISOString().substring(0, 10)}.pdf`);
    };

    const exportAllRequestsExcel = async (dataList: (MaterialRequestType | WorkhouseRentRequest)[], title: string, isMaterial: boolean) => {
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet(title);
        worksheet.views = [{ rightToLeft: false }];

        worksheet.addRow(['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.']).font = { bold: true, size: 12 };
        worksheet.addRow(['Rapor Başlığı:', title]).font = { bold: true };
        worksheet.addRow(['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR')]);
        worksheet.addRow([]);
        worksheet.addRow([]);

        if (isMaterial) {
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Başlık', key: 'subject', width: 30 },
                { header: 'Durum', key: 'status', width: 15 },
                { header: 'Tarih', key: 'createAt', width: 18 },
                { header: 'Açıklama', key: 'description', width: 50 },
            ];
            worksheet.addRows(dataList.map(r => ({
                id: r.id,
                subject: (r as MaterialRequestType).subject,
                status: statusToLabel(r.status),
                createAt: new Date(r.createAt).toLocaleDateString('tr-TR'),
                description: stripHtml(r.description || ''),
            })));
        } else {
            worksheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Başlık', key: 'title', width: 25 },
                { header: 'Şantiye', key: 'workhouseName', width: 25 },
                { header: 'Başlangıç', key: 'rentStartDate', width: 18 },
                { header: 'Bitiş', key: 'rentEndDate', width: 18 },
                { header: 'Fiyat (TL)', key: 'price', width: 15 },
                { header: 'Durum', key: 'status', width: 15 },
                { header: 'Kiralandığı Şirket', key: 'company', width: 20 },
            ];
            worksheet.addRows(dataList.map(r => ({
                id: r.id,
                title: (r as WorkhouseRentRequest).title,
                workhouseName: (r as WorkhouseRentRequest).workhouseName || '-',
                rentStartDate: formatDateDisplay((r as WorkhouseRentRequest).rentStartDate),
                rentEndDate: formatDateDisplay((r as WorkhouseRentRequest).rentEndDate),
                price: String((r as WorkhouseRentRequest).price) + ' TL',
                status: statusToLabel(r.status),
                company: (r as WorkhouseRentRequest).company || '-',
            })));
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `${title.replace(/ /g, '_')}_Tüm_Raporlar_${new Date().toISOString().substring(0, 10)}.xlsx`);
    };


    const filteredMaterialRequests = useMemo(() => {
        const q = materialSearchTerm.trim().toLowerCase();
        return requestsList.filter((r) => {
            const matchesSearch = !q || (String(r.id) ?? "").includes(q) || (r.subject ?? "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
            const matchesStatus = materialStatusFilter === 'all' || r.status === materialStatusFilter;
            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(r.id));
            return matchesSearch && matchesStatus && matchesNotifIds;
        });
    }, [requestsList, materialSearchTerm, materialStatusFilter, hasIdsFilter, idsSet]);

    const sortedMaterialRequests = useMemo(() => {
        const validOrderBy = materialOrderBy as keyof MaterialRequestType;
        // @ts-ignore
        return stableSort(filteredMaterialRequests, getComparator(materialOrder, validOrderBy));
    }, [filteredMaterialRequests, materialOrder, materialOrderBy]);

    const paginatedMaterialRequestsList = useMemo(() =>
        sortedMaterialRequests.slice(materialPage * materialRowsPerPage, materialPage * materialRowsPerPage + materialRowsPerPage)
        , [sortedMaterialRequests, materialPage, materialRowsPerPage]);


    const filteredRentalRequests = useMemo(() => {
        const q = rentalSearchTerm.trim().toLowerCase();
        return rentalRequestsList.filter((r) => {
            const matchesSearch = !q || (String(r.id) ?? "").includes(q) || (r.title ?? "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q) || (r.driverInfo ?? "").toLowerCase().includes(q) || (r.company ?? "").toLowerCase().includes(q);
            const matchesStatus = rentalStatusFilter === 'all' || r.status === rentalStatusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [rentalRequestsList, rentalSearchTerm, rentalStatusFilter]);


    const sortedRentalRequests = useMemo(() => {
        const validOrderBy = rentalOrderBy as keyof WorkhouseRentRequest;
        // @ts-ignore
        return stableSort(filteredRentalRequests, getComparator(rentalOrder, validOrderBy));
    }, [filteredRentalRequests, rentalOrder, rentalOrderBy]);

    const paginatedRentalRequestsList = useMemo(() =>
        sortedRentalRequests.slice(rentalPage * rentalRowsPerPage, rentalPage * rentalRowsPerPage + rentalRowsPerPage)
        , [sortedRentalRequests, rentalPage, rentalRowsPerPage]);


    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
        setIsFormVisible(false);
        setLoadingData(true);
        clearAlert();
    };

    const handleMaterialEditClick = (row: MaterialRequestType) => {
        setIsEditing(true);
        setMaterialItemToEdit(row);
        setRentalItemToEdit(null);
        setIsFormVisible(true);
    };
    const handleRentalEditClick = (row: WorkhouseRentRequest) => {
        setIsEditing(true);
        setRentalItemToEdit(row);
        setMaterialItemToEdit(null);
        setIsFormVisible(true);
    };

    const handleClickOpenDeleteModal = (row: MaterialRequestType | WorkhouseRentRequest) => {
        if (currentTab === 'material') {
            setMaterialSelectedRowForMenu(row as MaterialRequestType);
            setOpenDeleteMaterialModal(true);
        } else {
            setRentalSelectedRowForMenu(row as WorkhouseRentRequest);
            setOpenDeleteRentalModal(true);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBlinking(false);
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, []);


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

    const MaterialTable = () => (
        <>

            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>

                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm filtrelenmiş kayıtları indir" : ""}>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => setOpenDownloadSingleModal(true)}
                                    startIcon={<IconFileDownload size={20} />}
                                >
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>
                <Grid container spacing={2} alignItems="center">
                    {hasIdsFilter && (
                        <Grid item xs={12}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={`Bildirim filtresi: ${notifIds.length} `} color="primary" size="small" />
                                <IconButton aria-label="Filtreyi temizle" size="small" onClick={clearNotifFilter} title="Filtreyi temizle"><IconX size={18} /></IconButton>
                            </Stack>
                        </Grid>
                    )}
                    <Grid item xs={12} sm={6} md={8}>
                        <TextField
                            label="Talep Ara (Başlık/Açıklama/ID)" variant="outlined" fullWidth size="small"
                            value={materialSearchTerm}
                            onChange={(e) => { setMaterialSearchTerm(e.target.value); setMaterialPage(0); }}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <ToggleButtonGroup
                            value={materialStatusFilter} exclusive fullWidth size="small"
                            onChange={(_: any, v: 'all' | 0 | 1 | 2 | null) => { if (v !== null) { setMaterialStatusFilter(v); setMaterialPage(0); } }}
                        >
                            <StyledToggleButton value="all" data-value="all">Tümü</StyledToggleButton>
                            <StyledToggleButton value={0} data-value="0">Beklemede</StyledToggleButton>
                            <StyledToggleButton value={1} data-value="1">Onaylandı</StyledToggleButton>
                            <StyledToggleButton value={2} data-value="2">Reddedildi</StyledToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>
            </Box>
            <TableContainer component={Paper} sx={{ mt: 3 }}>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Talepler yükleniyor...</Typography></Box>
                ) : (
                    <Table aria-label="Malzeme Talepleri tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {(['Başlık', 'Şantiye', 'Açıklama', 'Durum', 'Tarih', 'Ekler', 'Detay', ''] as const).map((head, index) => (
                                    <StyledTableCell key={index} sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={materialOrderBy === (head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt')}
                                            direction={materialOrderBy === (head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt') ? materialOrder : "asc"}
                                            onClick={() => {
                                                const property = head === 'Başlık' ? 'subject' : head === 'Durum' ? 'status' : 'createAt';
                                                const isAsc = materialOrderBy === property && materialOrder === "asc";
                                                setMaterialOrder(isAsc ? "desc" : "asc");
                                                setMaterialOrderBy(property);
                                                setMaterialPage(0);
                                            }}
                                        >
                                            <Typography variant="h6">{head}</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedMaterialRequestsList.length > 0 ? (
                                paginatedMaterialRequestsList.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>
                                            <Typography variant="body1">
                                                <span style={{ color: '#9e9e9e', marginRight: '8px' }}>#{row.id}</span>
                                                {row.subject}
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">
                                                {getWorkhouseNameFromRow(row)}
                                            </Typography>
                                            {row.workhouse?.code && (
                                                <Typography variant="caption" color="textSecondary" display="block">
                                                    Kod: {row.workhouse.code}
                                                </Typography>
                                            )}
                                        </StyledTableCell>

                                        <StyledTableCell sx={{ maxWidth: 150 }}>
                                            {row.description && row.description.trim().length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                    <Button

                                                        variant="outlined"
                                                        style={{ fontSize: "10px", padding: "2px 5px" }}
                                                        onClick={() => {
                                                            setFullDescriptionContent(row.description);
                                                            setOpenDescriptionModal(true);
                                                        }}
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
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={1}
                                            >
                                                <Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" />
                                                {(row.requestStatusHistories && row.requestStatusHistories.length > 0) ? (
                                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Durum Geçmişini Gör" : ""}>
                                                        <IconButton size="small" onClick={() => { setHistoryData(row.requestStatusHistories!); setOpenHistoryModal(true); }}><IconInfoCircle size={18} /></IconButton>
                                                    </CustomTooltip>
                                                ) : null}
                                            </Stack>
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{new Date(row.createAt).toLocaleDateString('tr-TR')}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            {row.attachments && row.attachments.length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                    <IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary"></Chip></IconButton>
                                                </CustomTooltip>
                                            ) : (<Typography variant="body2" color="textSecondary">-</Typography>)}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="info"
                                                onClick={() => handleOpenDetails(row)}
                                                startIcon={<IconInfoCircle size={16} />}
                                                sx={{ fontSize: '10px' }}
                                            >
                                                Detay
                                            </Button>
                                        </StyledTableCell>

                                        <StyledTableCell>
                                            <ActionMenu
                                                row={row}
                                                type="material"
                                                permissions={{ hasEdit: hasEditPermission, hasDelete: hasDeletePermission, hasDownload: hasDownloadPermission }}
                                                handlers={{
                                                    onEdit: handleMaterialEditClick,
                                                    onDelete: handleClickOpenDeleteModal,
                                                    onDownload: (r) => { setMaterialSelectedRowForMenu(r as MaterialRequestType); setOpenDownloadSingleModal(true); }
                                                }}
                                            />
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={6} align="center"><Typography variant="subtitle1" color="textSecondary">Henüz kayıtlı bir talep bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]} component="div"
                count={filteredMaterialRequests.length} rowsPerPage={materialRowsPerPage} page={materialPage}
                onPageChange={(_event: unknown, newPage: number) => setMaterialPage(newPage)}
                onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => { setMaterialRowsPerPage(parseInt(event.target.value, 10)); setMaterialPage(0); }}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
        </>
    );

    const RentalTable = () => (
        <>


            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>  <Grid item xs={12} mt={2} mr={2}>
                <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>

                    {hasDownloadPermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm filtrelenmiş kayıtları indir" : ""}>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => setOpenDownloadSingleModal(true)}
                                startIcon={<IconFileDownload size={20} />}
                            >
                                Tümünü İndir
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Grid>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <FormControl fullWidth size="small">
                                <Autocomplete
                                    id="table-workhouse-filter"
                                    options={workhouses}
                                    size="small"
                                    getOptionLabel={(option) => option.name ? `${option.name} (Kod:${option.code})` : 'Tüm İşyerleri'}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={workhouses.find(w => w.id === selectedRentalWorkhouseId) || null}
                                    onChange={(_event, newValue) => {
                                        const newWorkhouseId = newValue ? newValue.id : '';
                                        setSelectedRentalWorkhouseId(newWorkhouseId);
                                        setRentalPage(0);
                                        const next = new URLSearchParams(searchParams);
                                        if (newWorkhouseId) { next.set('rentalWorkhouseId', newWorkhouseId); } else { next.delete('rentalWorkhouseId'); }
                                        setSearchParams(next, { replace: true });
                                        fetchRentalRequests(newWorkhouseId);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Şantiye Seçiniz"
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    animation: !selectedRentalWorkhouseId
                                                        ? `${borderBlink} 2s infinite ease-in-out`
                                                        : 'none',
                                                    transition: 'all 0.3s ease'
                                                }
                                            }}
                                        />
                                    )}
                                />
                            </FormControl>
                            <CustomTooltip
                                title={isTooltipGloballyEnabled ? "Tablo verilerini görüntülemek için lütfen listeden bir şantiye seçiniz." : ""}
                            >
                                <IconButton size="small" color="primary">
                                    <IconInfoCircle size={22} />
                                </IconButton>
                            </CustomTooltip>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Kiralama Ara (Başlık/Şirket/Şoför)" variant="outlined" fullWidth size="small"
                            value={rentalSearchTerm}
                            onChange={(e) => { setRentalSearchTerm(e.target.value); setRentalPage(0); }}
                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <ToggleButtonGroup
                            value={rentalStatusFilter} exclusive fullWidth size="small"
                            onChange={(_: any, v: 'all' | 0 | 1 | 2 | null) => { if (v !== null) { setRentalStatusFilter(v); setRentalPage(0); } }}
                        >
                            <StyledToggleButton value="all" data-value="all">Tümü</StyledToggleButton>
                            <StyledToggleButton value={0} data-value="0">Beklemede</StyledToggleButton>
                            <StyledToggleButton value={1} data-value="1">Onaylandı</StyledToggleButton>
                            <StyledToggleButton value={2} data-value="2">Reddedildi</StyledToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                </Grid>
            </Box>

            <TableContainer component={Paper} sx={{ mt: 3 }}>
                {loadingData ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Kiralama talepleri yükleniyor...</Typography></Box>
                ) : !selectedRentalWorkhouseId ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px"><Typography variant="subtitle1" color="textSecondary">Lütfen tabloyu görmek için yukarıdan bir Şantiye seçiniz.</Typography></Box>
                ) : (
                    <Table aria-label="Kiralama Talepleri tablosu">
                        <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                {(['Başlık', 'Şantiye', 'Başlangıç', 'Bitiş', 'Fiyat (TL)', 'Durum', 'Ekler', 'Detay', ''] as const).map((head, index) => (
                                    <StyledTableCell key={index} sx={{ color: "#171c23" }}>
                                        <TableSortLabel
                                            active={rentalOrderBy === (head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt')}
                                            direction={rentalOrderBy === (head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt') ? rentalOrder : "asc"}
                                            onClick={() => {
                                                const property = head === 'Başlık' ? 'title' : head === 'Başlangıç' ? 'rentStartDate' : head === 'Bitiş' ? 'rentEndDate' : head === 'Fiyat (TL)' ? 'price' : head === 'Durum' ? 'status' : 'createAt';
                                                const isAsc = rentalOrderBy === property && rentalOrder === "asc";
                                                setRentalOrder(isAsc ? "desc" : "asc");
                                                setRentalOrderBy(property);
                                                setRentalPage(0);
                                            }}
                                        >
                                            <Typography variant="h6">{head}</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedRentalRequestsList.length > 0 ? (
                                paginatedRentalRequestsList.map((row) => (
                                    <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <StyledTableCell>
                                            <Typography variant="body1">
                                                <span style={{ color: '#9e9e9e', marginRight: '8px' }}>#{row.id}</span>
                                                {row.title}
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{row.workhouseName || '-'}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.rentStartDate)}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.rentEndDate)}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">
                                                {(() => {
                                                    const priceString = String(row.price || 0).replace(/[^0-9.]/g, '');
                                                    const numericPrice = parseFloat(priceString);
                                                    if (isNaN(numericPrice)) return row.price || '-';
                                                    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(numericPrice);
                                                })()}
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell><Chip label={statusToLabel(row.status)} color={statusToColor(row.status)} size="small" /></StyledTableCell>
                                        <StyledTableCell>
                                            {row.attachments && row.attachments.length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Ekleri görüntüle ve indir" : ""}>
                                                    <IconButton onClick={() => handleOpenAttachmentsModal(row.attachments)}><IconLink size={18} /><Chip label={row.attachments.length} color="primary"></Chip></IconButton>
                                                </CustomTooltip>
                                            ) : (<Typography variant="body2" color="textSecondary">-</Typography>)}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                color="info"
                                                onClick={() => handleOpenDetails(row)}
                                                startIcon={<IconInfoCircle size={16} />}
                                                sx={{ fontSize: '10px' }}
                                            >
                                                Detay
                                            </Button>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <ActionMenu
                                                row={row}
                                                type="rental"
                                                permissions={{ hasEdit: hasEditPermission, hasDelete: hasDeletePermission, hasDownload: hasDownloadPermission }}
                                                handlers={{
                                                    onEdit: handleRentalEditClick,
                                                    onDelete: handleClickOpenDeleteModal,
                                                    onDownload: (r) => { setRentalSelectedRowForMenu(r as WorkhouseRentRequest); setOpenDownloadSingleModal(true); }
                                                }}
                                            />
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><StyledTableCell colSpan={8} align="center"><Typography variant="subtitle1" color="textSecondary">Seçili işyerinde kayıtlı kiralama talebi bulunamadı.</Typography></StyledTableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]} component="div"
                count={filteredRentalRequests.length} rowsPerPage={rentalRowsPerPage} page={rentalPage}
                onPageChange={(_event: unknown, newPage: number) => setRentalPage(newPage)}
                onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => { setRentalRowsPerPage(parseInt(event.target.value, 10)); setRentalPage(0); }}
                labelRowsPerPage="Satır başına düşen:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
            />
        </>
    );


    return (
        <Box sx={{ p: 3, position: 'relative' }}>
            <TabContext value={currentTab}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap">
                    <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}><IconFileText style={{ marginRight: 8 }} /> Talep Yönetimi</Typography>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: { xs: 2, sm: 0 } }}>
                        <TabList onChange={handleTabChange} aria-label="Talep Türleri">
                            <Tab label="Malzeme Talepleri" value="material" />
                            <Tab label="Kiralama Talepleri" value="rental" />
                        </TabList>
                    </Box>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" justifyContent="flex-end" mb={2}>

                    {!isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Oluştur/Düzenle formunu açın." : ""}>
                            <BlinkingButton
                                variant="contained" color="primary"
                                onClick={() => { setIsFormVisible(true); setIsEditing(false); setMaterialItemToEdit(null); setRentalItemToEdit(null); }}
                                isBlinking={isBlinking}
                                fullWidth={false} startIcon={<IconPlus size={20} />}
                                disabled={!hasCreatePermission}
                            >
                                Yeni {currentTab === 'material' ? 'Malzeme' : 'Kiralama'} Talep Kaydet
                            </BlinkingButton>
                        </CustomTooltip>
                    )
                    }
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizlemek için tıklayınız." : ""}>
                            <Button
                                variant="contained" color="error"
                                onClick={() => { setIsFormVisible(false); setIsEditing(false); setMaterialItemToEdit(null); setRentalItemToEdit(null); }}
                                fullWidth={false} startIcon={<IconX size={20} />}
                            >
                                Gizle
                            </Button>
                        </CustomTooltip>
                    )}
                </Stack>

                <Box>
                    {(isFormVisible && currentTab === 'material') && (
                        <MaterialRequestForm
                            isEditing={isEditing}
                            itemToEdit={materialItemToEdit}
                            showAlert={showAlert}
                            onSuccess={() => { setIsFormVisible(false); setIsEditing(false); fetchMaterialRequests(); }}
                            onCancel={() => { setIsFormVisible(false); setIsEditing(false); setMaterialItemToEdit(null); }}
                        />
                    )}
                    {(isFormVisible && currentTab === 'rental') && (
                        <RentalRequestForm
                            isEditing={isEditing}
                            itemToEdit={rentalItemToEdit}
                            workhouses={workhouses}
                            showAlert={showAlert}
                            onSuccess={() => { setIsFormVisible(false); setIsEditing(false); fetchRentalRequests(selectedRentalWorkhouseId); }}
                            onCancel={() => { setIsFormVisible(false); setIsEditing(false); setRentalItemToEdit(null); }}
                        />
                    )}
                </Box>

                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}

                <TabPanel value="material" sx={{ p: 0 }}><MaterialTable /></TabPanel>
                <TabPanel value="rental" sx={{ p: 0 }}><RentalTable /></TabPanel>
            </TabContext>

            <Dialog open={openDownloadSingleModal} onClose={() => setOpenDownloadSingleModal(false)} maxWidth="xs">
                <DialogTitle>
                    {materialSelectedRowForMenu || rentalSelectedRowForMenu
                        ? (currentTab === 'material' ? 'Malzeme Talep Raporunu İndir' : 'Kiralama Talep Raporunu İndir')
                        : (currentTab === 'material' ? 'Tüm Malzeme Taleplerini İndir' : 'Tüm Kiralama Taleplerini İndir')
                    }
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        {materialSelectedRowForMenu || rentalSelectedRowForMenu
                            ? "Seçilen kaydın detaylı raporunu indirin."
                            : "Tablodaki tüm filtrelenmiş kayıtların toplu raporunu indirin."
                        }
                    </DialogContentText>
                    <Stack direction="column" spacing={2} sx={{ mt: 1 }}>
                        <Button
                            variant="contained" color="primary"
                            onClick={() => {
                                const row = materialSelectedRowForMenu || rentalSelectedRowForMenu;
                                if (row) {
                                    exportRequestPdf(row, currentTab === 'material' ? 'Malzeme Talep Detay Raporu' : 'Kiralama Talep Detay Raporu');
                                } else if (currentTab === 'material') {
                                    exportAllRequestsPdf(filteredMaterialRequests, 'Tüm Malzeme Talepleri Raporu', true);
                                } else {
                                    exportAllRequestsPdf(filteredRentalRequests, 'Tüm Kiralama Talepleri Raporu', false);
                                }
                                setOpenDownloadSingleModal(false);
                                setMaterialSelectedRowForMenu(null);
                                setRentalSelectedRowForMenu(null);
                            }}
                            startIcon={<IconFileDownload />}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained" color="success"
                            onClick={() => {
                                const row = materialSelectedRowForMenu || rentalSelectedRowForMenu;
                                if (row) {
                                    exportRequestExcel(row, currentTab === 'material' ? 'Malzeme Talep Detayları' : 'Kiralama Talep Detayları');
                                } else if (currentTab === 'material') {
                                    exportAllRequestsExcel(filteredMaterialRequests, 'Tüm Malzeme Talepleri Detayları', true);
                                } else {
                                    exportAllRequestsExcel(filteredRentalRequests, 'Tüm Kiralama Talepleri Detayları', false);
                                }
                                setOpenDownloadSingleModal(false);
                                setMaterialSelectedRowForMenu(null);
                                setRentalSelectedRowForMenu(null);
                            }}
                            startIcon={<IconFileDownload />}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => { setOpenDownloadSingleModal(false); setMaterialSelectedRowForMenu(null); setRentalSelectedRowForMenu(null); }} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openHistoryModal} onClose={() => setOpenHistoryModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Talep Durum Geçmişi</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {historyData.length > 0 ? (
                            historyData.map((h, index) => (
                                <Paper key={index} elevation={1} sx={{ p: 2, borderLeft: `5px solid ${statusToColor(h.status)}` }}>
                                    <Box display="flex" justifyContent="space-between">
                                        <Chip label={statusToLabel(h.status)} color={statusToColor(h.status)} size="small" />
                                        <Typography variant="caption" color="textSecondary">{new Date(h.createAt).toLocaleString('tr-TR')}</Typography>
                                    </Box>
                                    <Divider sx={{ my: 1 }} />
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>Açıklama: {h.statusDescription || '—'}</Typography>
                                    <Typography variant="body2">İşlem Yapan: {h.user?.username || 'Bilinmiyor'}</Typography>
                                </Paper>
                            ))
                        ) : (<Typography>Henüz durum geçmişi yok.</Typography>)}
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenHistoryModal(false)}>Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openDescriptionModal} onClose={() => setOpenDescriptionModal(false)} maxWidth="md" fullWidth>
                <DialogTitle>Açıklamanın Tamamı</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText><div dangerouslySetInnerHTML={{ __html: fullDescriptionContent }} /></DialogContentText>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDescriptionModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>

            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ekler</DialogTitle>
                <DialogContent dividers>


                    {currentAttachments.map((attachment, index) => {
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
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenAttachmentsModal(false)} color="primary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: 'info.main', color: 'white' }}>
                    Talep Detay Bilgileri
                </DialogTitle>
                <DialogContent dividers>
                    {viewingRow && (
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            <Box display="flex" justifyContent="space-between">
                                <Typography fontWeight="bold">Başlık:</Typography>
                                <Typography>{(viewingRow as MaterialRequestType).subject || (viewingRow as WorkhouseRentRequest).title}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between">
                                <Typography fontWeight="bold">Şantiye:</Typography>
                                <Typography>{getWorkhouseNameFromRow(viewingRow as MaterialRequestType)}</Typography>
                            </Box>
                            {currentTab === 'rental' && (
                                <>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography fontWeight="bold">İşyeri:</Typography>
                                        <Typography>{(viewingRow as WorkhouseRentRequest).workhouseName || '-'}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography fontWeight="bold">Kira Aralığı:</Typography>
                                        <Typography>
                                            {formatDateDisplay((viewingRow as WorkhouseRentRequest).rentStartDate)} - {formatDateDisplay((viewingRow as WorkhouseRentRequest).rentEndDate)}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography fontWeight="bold">Şirket / Şoför:</Typography>
                                        <Typography>
                                            {(viewingRow as WorkhouseRentRequest).company || '-'} / {(viewingRow as WorkhouseRentRequest).driverInfo || '-'}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography fontWeight="bold">Fiyat:</Typography>
                                        <Typography color="primary.main" fontWeight="bold">
                                            {(viewingRow as WorkhouseRentRequest).price} TL
                                        </Typography>
                                    </Box>
                                </>
                            )}

                            <Divider />

                            <Typography fontWeight="bold">Açıklama:</Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                                <div dangerouslySetInnerHTML={{ __html: viewingRow.description || 'Açıklama belirtilmemiş.' }} />
                            </Paper>

                            <Divider sx={{ my: 2 }} />

                            <Stack direction="row" spacing={2} justifyContent="center">
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<IconFileDownload />}
                                    onClick={() => exportRequestPdf(viewingRow, currentTab === 'material' ? 'Malzeme Talep Raporu' : 'Kiralama Talep Raporu')}
                                >
                                    PDF
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="success"
                                    startIcon={<IconFileDownload />}
                                    onClick={() => exportRequestExcel(viewingRow, currentTab === 'material' ? 'Malzeme Talep Detayları' : 'Kiralama Talep Detayları')}
                                >
                                    Excel
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsModal(false)} variant="contained" color="inherit">Kapat</Button>
                </DialogActions>
            </Dialog>

            <DeleteRequest
                openModal={openDeleteMaterialModal} itemToDelete={materialSelectedRowForMenu}
                onClose={() => setOpenDeleteMaterialModal(false)} onDeleteSuccess={fetchMaterialRequests} showAlert={showAlert}
            />
            <DeleteWorkhouseRent
                openModal={openDeleteRentalModal} itemToDelete={rentalSelectedRowForMenu}
                onClose={() => setOpenDeleteRentalModal(false)} onDeleteSuccess={() => fetchRentalRequests(selectedRentalWorkhouseId)} showAlert={showAlert}
            />
        </Box>
    );
};

export default RequestTabs;