import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    TableCell as MuiTableCell,
    Typography, Menu, IconButton, ListItemIcon, Box,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    CircularProgress, Paper, FormControl, InputLabel, Select,
    TableSortLabel, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    Dialog, DialogTitle, DialogContent, DialogActions, ListItemText, List, MenuItem as MuiMenuItem,
    Chip,
} from '@mui/material';
import { keyframes, styled } from '@mui/material/styles';
import {
    IconTruck, // ایکون برای انبار خودرو
    IconDots, IconEdit, IconTrash, IconSearch,
    IconFileSpreadsheet, IconFileText, IconX, IconFileDownload,
    IconChevronRight, IconChevronDown,
} from '@tabler/icons-react';

import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import axios from 'axios';
import server from '../../../assets/address.json';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { useAuth } from 'src/context/AuthContext';
import DeleteCarWarehouse from './DeleteCareWarehouse'; // فرض می‌کنیم کامپوننت حذف وجود دارد
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import BlankCard from "src/components/shared/BlankCard";


// --- Data Interfaces ---
interface RegionType { id: number; name: string; depth: number; regions?: RegionType[]; recordStatus?: number; }
interface FlattenedRegionType { id: number; name: string; label: string; depth: number; }
interface RegionNode { id: number; name: string; label: string; depth: number; children: RegionNode[]; }
interface CarWarehouseApiData { id: string; name: string; code: string; address: string; createAt: string; recordStatus: 0 | 1; region: { id: string; name: string; }; }
interface CarWarehouse { id: number; name: string; code: string; address: string; createAt: string; recordStatus: 0 | 1; regionName: string; regionId: number; }

// ⭐️ Type Mismatch Fix: اضافه کردن کلیدهای داخلی برای مرتب‌سازی
type SortableKeys = 'id' | 'name' | 'code' | 'address' | 'createAt' | 'regionName' | 'recordStatus';


// --- Helper Functions and Styles (از ListStores گرفته شده) ---
const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString.length === 10 ? dateString : String(dateString));
        if (isNaN(date.getTime())) return "Geçersiz Tarih";
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) { return "Geçersiz Tarih"; }
};

const descendingComparator = <T, Key extends keyof T>(a: T, b: T, orderBy: Key): number => {
    // ⭐️ مدیریت مرتب‌سازی برای 'regionName'
    if (orderBy === ('regionName' as any)) {
        const regionA = (a as unknown as CarWarehouse).regionName || '';
        const regionB = (b as unknown as CarWarehouse).regionName || '';
        return regionB.localeCompare(regionA);
    }

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

// --- PDF Helpers ---
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

// --- Excel Helpers ---
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

// --- Region Tree Helpers ---
const buildRegionTree = (regions: RegionType[] | undefined, depth: number = 0): RegionNode[] => {
    if (!regions) return [];
    return regions.filter(r => r.recordStatus === 0).map(region => ({
        id: region.id,
        name: region.name,
        label: region.name,
        depth: depth,
        children: buildRegionTree(region.regions, depth + 1)
    }));
};
const flattenRegions = (regions: RegionType[], parentLabel: string = ''): FlattenedRegionType[] => {
    const flattened: FlattenedRegionType[] = [];
    regions.filter(r => r.recordStatus === 0).forEach(region => {
        const currentLabel = parentLabel ? `${parentLabel} - ${region.name}` : region.name;
        flattened.push({ id: region.id, name: region.name, label: currentLabel, depth: region.depth });
        if (region.regions && region.regions.length > 0) {
            flattened.push(...flattenRegions(region.regions, currentLabel));
        }
    });
    return flattened;
};
const filterRegionTree = (nodes: RegionNode[], query: string): RegionNode[] => {
    if (!query) return nodes;
    const lowerCaseQuery = query.toLowerCase();
    return nodes
        .map(node => {
            const matches = node.name.toLowerCase().includes(lowerCaseQuery);
            const filteredChildren = filterRegionTree(node.children, query);
            const hasMatchingChildren = filteredChildren.length > 0;
            if (matches || hasMatchingChildren) {
                return {
                    ...node,
                    children: hasMatchingChildren ? filteredChildren : []
                };
            }
            return null;
        })
        .filter(Boolean) as RegionNode[];
};

// --- Region Select Item Component ---
interface RegionTreeSelectMenuItemProps {
    node: RegionNode;
    onSelect: (regionId: number) => void;
    selectedId: number | null;
    onCloseParentSelect: () => void;
    searchQuery: string;
}
const RegionTreeSelectMenuItem: React.FC<RegionTreeSelectMenuItemProps> = ({ node, onSelect, selectedId, onCloseParentSelect, searchQuery }) => {
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = searchQuery !== '' || hasChildren; // همیشه در حالت جستجو باز باشد

    const handleItemClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node.id);
        onCloseParentSelect(); // بستن Select اصلی پس از انتخاب
    };

    // اگر در حالت جستجو بود و Node مطابقت نداشت اما فرزندانش مطابقت داشتند، آن را نمایش می‌دهیم
    const displayNode = searchQuery === '' || node.name.toLowerCase().includes(searchQuery.toLowerCase()) || node.children.length > 0;
    if (!displayNode && !hasChildren) return null;


    return (
        <React.Fragment>
            <MuiMenuItem
                value={node.id}
                onClick={handleItemClick}
                sx={{
                    paddingLeft: `${node.depth * 16 + (hasChildren ? 0 : 20)}px`,
                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                    '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                }}
            >
                <Stack direction="row" alignItems="center" width="100%">
                    {hasChildren ? (
                        <IconButton
                            onClick={(e) => e.stopPropagation()}
                            size="small"
                            sx={{ mr: 1, p: 0.5, visibility: searchQuery !== '' ? 'hidden' : 'visible' }}
                        >
                            {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 16 + 8 + 4 }} />
                    )}
                    <ListItemText primary={node.name} />
                </Stack>
            </MuiMenuItem>
            {isOpen && hasChildren && (
                <List component="div" disablePadding>
                    {node.children.map((childNode) => (
                        <RegionTreeSelectMenuItem
                            key={childNode.id}
                            node={childNode}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            onCloseParentSelect={onCloseParentSelect}
                            searchQuery={searchQuery}
                        />
                    ))}
                </List>
            )}
        </React.Fragment>
    );
};


// --- Styles ---
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
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({ fontFamily: 'NotoSans', fontSize: '0.8rem', [theme.breakpoints.up('md')]: { fontSize: '1rem' }, }));
const blinkAnimation = keyframes`
    0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
    100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({ animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none', transition: 'transform 0.3s ease-in-out', }));


// =====================================================================================
// === Main Component: ListCarWarehouse ===
// =====================================================================================

const ListCarWarehouse: React.FC = () => {
    const navigate = useNavigate();
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
    const [name, setName] = useState<string>('');
    const [code, setCode] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null); // ⭐️ تغییر نوع داده

    // Form Validation States
    const [nameError, setNameError] = useState(false);
    const [codeError, setCodeError] = useState(false);
    const [addressError, setAddressError] = useState(false);
    const [regionError, setRegionError] = useState(false);

    // Global States
    const [carWarehouses, setCarWarehouses] = useState<CarWarehouse[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
    const [isBlinking, setIsBlinking] = useState<boolean>(true);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

    // Region States (برای Select درختی) 
    const [regionTree, setRegionTree] = useState<RegionNode[]>([]);
    // const [regionOptions, setRegionOptions] = useState<FlattenedRegionType[]>([]);
    const [isRegionSelectOpen, setIsRegionSelectOpen] = useState(false);
    const [regionSearchQuery, setRegionSearchQuery] = useState('');
    const [regionMap, setRegionMap] = useState<Map<number, string>>(new Map());

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
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<CarWarehouse | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteName, setDeleteName] = useState<string>('');
    const [openDownloadAllModal, setOpenDownloadAllModal] = useState(false);
    const [openDownloadFilteredModal, setOpenDownloadFilteredModal] = useState(false);
    const [openRowDownloadModal, setOpenRowDownloadModal] = useState(false);
    const [selectedRowForDownload, setSelectedRowForDownload] = useState<CarWarehouse | null>(null);

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
    const mapApiDataToCarWarehouse = (r: CarWarehouseApiData): CarWarehouse => ({
        id: Number(r.id),
        name: r.name,
        code: r.code,
        address: r.address,
        createAt: r.createAt,
        recordStatus: r.recordStatus,
        regionName: r.region?.name || '-',
        regionId: r.region?.id ? Number(r.region.id) : 0,
    });


    // --- Data Fetching: Regions (Hierarchical) ---
    const fetchRegions = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate('/'); return; }
        try {
            const response = await axios.get(server.baseurl + server.baseinfo + "get-regions", { headers: { Authorization: `Bearer ${authToken}` } });
            if (response.data.httpStatusCode === 200) {
                const regions: RegionType[] = response.data.data;
                const regionTreeData = buildRegionTree(regions);
                const flattened = flattenRegions(regions);

                setRegionTree(regionTreeData);
                // setRegionOptions(flattened);

                const newRegionMap = new Map<number, string>();
                flattened.forEach(region => {
                    newRegionMap.set(region.id, region.label);
                });
                setRegionMap(newRegionMap);
            } else { showAlert(response.data.message || 'Bölgeler yüklenirken bir hata oluştu.', 'error'); }
        } catch (e) { showAlert('Bölgeler yüklenirken bir hata oluştu.', 'error'); }
    }, [navigate, showAlert]);


    // --- Data Fetching: Car Warehouses ---
    const fetchCarWarehouses = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        setLoadingData(true);
        if (!authToken) { navigate('/'); setLoadingData(false); return; }

        try {
            const res = await axios.get(`${server.baseurl}${server.initialoperations}get-car-warehouses`,
                { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data.httpStatusCode === 200) {
                const rawRows = (res.data.data as CarWarehouseApiData[]).map(mapApiDataToCarWarehouse);
                setCarWarehouses(rawRows);
            } else {
                showAlert(res.data.message || 'Kayıtlar yüklenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [navigate, showAlert]);

    useEffect(() => {
        fetchRegions();
        fetchCarWarehouses();
    }, [fetchRegions, fetchCarWarehouses]);

    // --- Form Logic ---
    const validateForm = (): boolean => {
        let ok = true;
        setNameError(false); setCodeError(false); setAddressError(false); setRegionError(false);

        if (!name.trim()) { setNameError(true); ok = false; }
        if (!code.trim()) { setCodeError(true); ok = false; }
        if (!address.trim()) { setAddressError(true); ok = false; }
        if (!selectedRegionId) { setRegionError(true); ok = false; } // ⭐️ تغییر در چک کردن ID

        if (!ok) { showAlert('Lütfen tüm zorunlu alanları doldurun ve hataları düzeltin.', 'warning'); }
        return ok;
    };

    const resetForm = useCallback(() => {
        setEditingId(null);
        setName('');
        setCode('');
        setAddress('');
        setSelectedRegionId(null);
        setNameError(false); setCodeError(false); setAddressError(false); setRegionError(false);
        setIsFormVisible(false);
    }, []);

    const handleSubmitForm = async () => {
        if (!validateForm() || !selectedRegionId) return; // ⭐️ چک کردن ID
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Kimlik doğrulama hatası.', 'error'); setLoadingButton(false); return; }

        const isEditing = editingId !== null;
        const payload = {
            id: isEditing ? editingId : undefined,
            name: name.trim(),
            code: code.trim(),
            address: address.trim(),
            regionId: Number(selectedRegionId), // ⭐️ ارسال ID
        };

        const url = isEditing
            ? `${server.baseurl}${server.initialoperations}update-car-warehouse`
            : `${server.baseurl}${server.initialoperations}create-car-warehouse`;
        const method = isEditing ? 'put' : 'post';

        try {
            const res = await axios.request({ method, url, data: payload, headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' } });
            const successStatus = isEditing ? 200 : 201;

            if (res.data.httpStatusCode === successStatus || res.data.httpStatusCode === 200) {
                showAlert(`Araç Depo kaydı başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}!`, 'success');
                resetForm();
                fetchCarWarehouses();
            } else { showAlert(res.data.message || 'İşlem sırasında bir hata oluştu.', 'error'); }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    const handleEditClick = (row: CarWarehouse) => {
        setEditingId(row.id);
        setName(row.name);
        setCode(row.code);
        setAddress(row.address);

        setSelectedRegionId(row.regionId); // ⭐️ تنظیم ID

        setIsFormVisible(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        handleCloseMenu();
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
                `${server.baseurl}${server.initialoperations}update-car-warehouse`,
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
                const statusText = statusValue === 0 ? 'Aktif' : 'Pasif';
                showAlert(`Şantiye başarıyla ${statusText} olarak ayarlandı!`, 'success');
                resetForm();
                fetchCarWarehouses();
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

    // --- Table/Filter Logic ---
    const filteredCarWarehouses = useMemo(() => {
        const list = carWarehouses.filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.code.toLowerCase().includes(searchTerm.toLowerCase()) || r.address.toLowerCase().includes(searchTerm.toLowerCase()) || r.regionName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);
            const cDate = r.createAt ? new Date(r.createAt) : null;
            const inRange = (!startFilter || (cDate && cDate >= startFilter)) && (!endFilter || (cDate && cDate <= endFilter));

            return matchesSearch && matchesStatus && inRange;
        });
        return stableSort(list, getComparator(order, orderBy));
    }, [carWarehouses, searchTerm, statusFilter, order, orderBy, startFilter, endFilter]);

    const paginatedRows = useMemo(() => filteredCarWarehouses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [filteredCarWarehouses, page, rowsPerPage]);
    const isFilterActive = useMemo(() => !!searchTerm.trim() || statusFilter !== 'all' || startFilter !== null || endFilter !== null, [searchTerm, statusFilter, startFilter, endFilter]);

    // --- Table Handlers ---
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: CarWarehouse) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
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
        setDeleteName(selectedRowForMenu.name.trim());
        setOpenDeleteModal(true);
        handleCloseMenu();
    };
    const handleCloseDeleteModal = () => { setOpenDeleteModal(false); setDeleteId(null); setDeleteName(''); fetchCarWarehouses(); };

    // --- Region Select Handlers ---
    const handleCloseRegionSelect = () => { setIsRegionSelectOpen(false); setRegionSearchQuery(''); };
    const renderSelectedRegion = (selectedId: any) => {
        return regionMap.get(selectedId as number) || '';
    };
    const filteredRegionTree = useMemo(() => {
        return filterRegionTree(regionTree, regionSearchQuery);
    }, [regionTree, regionSearchQuery]);


    // --- Export Functions (PDF/Excel) ---
    const exportStoresToPdf = (data: CarWarehouse[], title: string) => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Rapor oluşturuluyor...', 'info');

        // @ts-ignore
        const doc = new jsPDF();
        const docAny = doc as any;

        const columns = ['Ad', 'Kod', 'Adres', 'Bölge', 'Kayıt Tarihi'];
        const body = data.map(r => [
            r.name || '-',
            r.code || '-',
            r.address || '-',
            r.regionName || '-',
            formatDateDisplay(r.createAt || null),
        ]);

        try {
            autoTable(docAny, {
                head: [columns],
                body: body,
                startY: 35,
                theme: 'grid',
                styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { font: 'NotoSans', fontStyle: 'normal', fillColor: [242, 242, 242], textColor: [0, 0, 0], fontSize: 10 },
                didDrawPage: (_data: any) => { addPdfHeader(doc, title); addPdfFooter(doc); },
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

    const exportStoresToExcel = (data: CarWarehouse[], title: string) => {
        if (!data || data.length === 0) { showAlert('Excel oluşturulacak kayıt bulunamadı.', 'warning'); return; }
        setLoadingData(true); showAlert('Excel dosyası oluşturuluyor...', 'info');

        try {
            const workbook = new Excel.Workbook();
            const worksheet = workbook.addWorksheet(title.substring(0, 31));

            const columns = ['Ad', 'Kod', 'Adres', 'Bölge', 'Kayıt Tarihi'];
            addExcelHeader(worksheet, title, columns.length);

            const headerRow = worksheet.addRow(columns);
            headerRow.font = { name: 'NotoSans', bold: true };
            headerRow.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }; });

            data.forEach(r => {
                worksheet.addRow([r.name || '-', r.code || '-', r.address || '-', r.regionName || '-', formatDateDisplay(r.createAt || null)]);
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

    const handleDownloadAll = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportStoresToPdf(carWarehouses, 'Tüm Araç Depo Kayıtları Raporu') : exportStoresToExcel(carWarehouses, 'Tüm Araç Depo Kayıtları Raporu'); setOpenDownloadAllModal(false); };
    const handleDownloadFiltered = (format: 'pdf' | 'excel') => { format === 'pdf' ? exportStoresToPdf(filteredCarWarehouses, 'Filtrelenmiş Araç Depo Kayıtları Raporu') : exportStoresToExcel(filteredCarWarehouses, 'Filtrelenmiş Araç Depo Kayıtları Raporu'); setOpenDownloadFilteredModal(false); };
    const handleDownloadRow = (format: 'pdf' | 'excel') => { if (!selectedRowForDownload) return; const title = `Araç Depo Detayları: ${selectedRowForDownload.name}`; format === 'pdf' ? exportStoresToPdf([selectedRowForDownload], title) : exportStoresToExcel([selectedRowForDownload], title); setOpenRowDownloadModal(false); };

    const handleOpenRowDownloadModal = useCallback((row: CarWarehouse) => {
        setSelectedRowForDownload(row);
        setOpenRowDownloadModal(true);
        // اگر از منوی ردیف (Menu) فراخوانی می‌شود، بهتر است منو بسته شود
        if (selectedRowForMenu) {
            handleCloseMenu();
        }
    }, [handleCloseMenu]);


    // const handleRegisterDetailsClick = () => {
    //     if (selectedRowForMenu) {
    //         const carWarehouseId = selectedRowForMenu.id;
    //         // ⭐️ آدرس مورد نظر شما به همراه ID انبار خودرو
    //         navigate(`/car-warehouse/list-details-car-warehouse/${carWarehouseId}`);
    //     }
    //     handleCloseMenu();
    // };

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={4}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconTruck width={24} height={24} />
                        <Typography variant="h5" mb={0}>{editingId ? 'Araç Depo Kaydını Düzenle' : 'Yeni Araç Depo Kaydı'}</Typography>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni kayıt formunu aç" : ""}>
                                <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} size="small" fullWidth={false}>Yeni Kayıt Ekle</BlinkingButton>
                            </CustomTooltip>
                        )}
                        {isFormVisible && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Kayıt formunu gizle" : ""}>
                                <Button variant="contained" color="error" onClick={resetForm} startIcon={<IconX size={20} />} size="small" fullWidth={false}>Gizle</Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>

                {/* --- Form Section --- */}
                {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2}>
                            {/* Name */}
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Ad</CustomFormLabel>
                                <CustomTextField placeholder="Adı Girin" size="small" fullWidth value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setNameError(false); }} error={nameError} helperText={nameError ? 'Bu alan zorunludur!' : ''} />
                            </Grid>
                            {/* Code */}
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Kod</CustomFormLabel>
                                <CustomTextField placeholder="Kodu Girin" size="small" fullWidth value={code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setCode(e.target.value); setCodeError(false); }} error={codeError} helperText={codeError ? 'Bu alan zorunludur!' : ''} />
                            </Grid>
                            {/* Region (Hierarchical Select) ⭐️ پیاده‌سازی Select درختی */}
                            <Grid item xs={12} sm={6} md={4}>
                                <CustomFormLabel required>Bölge Seçimi</CustomFormLabel>
                                <FormControl size="small" error={regionError} fullWidth>
                                    <InputLabel id="select-region-label">Bölge Seçin</InputLabel>
                                    <Select
                                        labelId="select-region-label"
                                        id="select-region"
                                        value={selectedRegionId || ''}
                                        label="Bölge Seçin"
                                        open={isRegionSelectOpen}
                                        onOpen={() => setIsRegionSelectOpen(true)}
                                        onClose={handleCloseRegionSelect}
                                        onChange={(event) => {
                                            setSelectedRegionId(event.target.value as number);
                                            setRegionError(false);
                                        }}
                                        renderValue={renderSelectedRegion}
                                        MenuProps={{ sx: { maxHeight: 400 }, PaperProps: { sx: { p: 1 } } }}
                                    >
                                        <TextField
                                            autoFocus
                                            fullWidth
                                            size="small"
                                            placeholder="Bölge Ara..."
                                            value={regionSearchQuery}
                                            onChange={(e) => setRegionSearchQuery(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            sx={{ p: 1, pb: 0, '& .MuiInputBase-root': { pr: '8px !important' } }}
                                            InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                                        />

                                        {loadingData ? (
                                            <MuiMenuItem disabled><CircularProgress size={20} /> Yükleniyor...</MuiMenuItem>
                                        ) : filteredRegionTree.length > 0 ? (
                                            filteredRegionTree.map(node => (
                                                <RegionTreeSelectMenuItem
                                                    key={node.id}
                                                    node={node}
                                                    onSelect={(id) => { setSelectedRegionId(id); setIsRegionSelectOpen(false); }}
                                                    selectedId={selectedRegionId}
                                                    onCloseParentSelect={handleCloseRegionSelect}
                                                    searchQuery={regionSearchQuery}
                                                />
                                            ))
                                        ) : (
                                            <MuiMenuItem disabled>Hiç bölge bulunamadı.</MuiMenuItem>
                                        )}
                                    </Select>
                                    {regionError && <Typography color="error" variant="caption" sx={{ ml: 1.5, mt: 0.5 }}>Bu alan zorunludur!</Typography>}
                                </FormControl>
                            </Grid>
                            {/* Address */}
                            <Grid item xs={12} sm={12} md={12}>
                                <CustomFormLabel required>Adres</CustomFormLabel>
                                <CustomTextField placeholder="Adresi Girin" size="small" fullWidth value={address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setAddress(e.target.value); setAddressError(false); }} error={addressError} helperText={addressError ? 'Bu alan zorunludur!' : ''} />
                            </Grid>

                            {/* Form Actions */}
                            <Grid item xs={12}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Button variant="contained" color={editingId ? "info" : "success"} onClick={handleSubmitForm} disabled={loadingButton} size="small">
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

            {/* --- Table Section --- */}
            <BlankCard>
                <>
                    {alertMessage && (
                        <Stack sx={{ width: '100%', mt: 2 }} spacing={2}><Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert></Stack>
                    )}
                </>


                <Grid item xs={12} mt={2} mr={2}>
                    <Stack direction="row" spacing={3} justifyContent="flex-end" mb={2} mr={2}>
                        {isFilterActive && hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Uygulanan filtrelerle Araç Depo indirin" : ""}>
                                <BlinkingButton variant="contained" color="secondary" onClick={() => setOpenDownloadFilteredModal(true)} isBlinking={true} disabled={loadingData} startIcon={<IconFileDownload />} size="small">Filtrelenmişi İndir</BlinkingButton>
                            </CustomTooltip>
                        )}
                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm Araç Depo indirin" : ""}>
                                <Button variant="contained" color="primary" onClick={() => setOpenDownloadAllModal(true)} startIcon={<IconFileDownload />} disabled={loadingData} size="small">Tümünü İndir</Button>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Grid>

                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField label="Ara (Ad / Kod / Adres / Bölge)" variant="outlined" fullWidth value={searchTerm} onChange={handleSearchChange} size="small" InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
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
                            <CircularProgress /><Typography variant="h6" sx={{ ml: 2 }}>Kayıtlar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="car warehouses table">
                            <TableHead sx={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell sx={{ color: "#171c23" }}><TableSortLabel active={orderBy === 'code'} direction={orderBy === 'code' ? order : 'asc'} onClick={() => handleRequestSort('code')} sx={{ color: 'inherit' }}><Typography variant="h6">Kod</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')} sx={{ color: 'inherit' }}><Typography variant="h6">Ad</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><TableSortLabel active={orderBy === 'address'} direction={orderBy === 'address' ? order : 'asc'} onClick={() => handleRequestSort('address')} sx={{ color: 'inherit' }}><Typography variant="h6">Adres</Typography></TableSortLabel></StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}>
                                        <TableSortLabel active={orderBy === 'regionName'} direction={orderBy === 'regionName' ? order : 'asc'} onClick={() => handleRequestSort('regionName')} sx={{ color: 'inherit' }}>
                                            <Typography variant="h6">Bölge</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ color: "#171c23" }}><TableSortLabel active={orderBy === 'createAt'} direction={orderBy === 'createAt' ? order : 'asc'} onClick={() => handleRequestSort('createAt')} sx={{ color: 'inherit' }}><Typography variant="h6">Kayıt Tarihi</Typography></TableSortLabel></StyledTableCell>

                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'recordStatus'} direction={orderBy === 'recordStatus' ? order : 'asc'} onClick={() => handleRequestSort('recordStatus')} sx={{ color: "#171c23" }}>
                                            <Typography variant="h6">Durum</Typography>
                                        </TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedRows.length > 0 ? (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <StyledTableCell>{row.code || '-'}</StyledTableCell>
                                            <StyledTableCell>{row.name || '-'}</StyledTableCell>
                                            <StyledTableCell><Typography variant="body1" noWrap title={row.address || ''}>{row.address || '-'}</Typography></StyledTableCell>
                                            <StyledTableCell>{row.regionName || '-'}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(row.createAt || null)}</StyledTableCell>
                                            <StyledTableCell>
                                                <Chip label={row.recordStatus === 0 ? 'Aktif' : 'Pasif'} color={row.recordStatus === 0 ? 'success' : 'error'} size="small" />
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                    <IconButton onClick={(e) => handleClickMenu(e, row)} size="small"><IconDots width={18} /></IconButton>
                                                </CustomTooltip>
                                                <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>
                                                    {/* <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu depo için detay kayıt sayfasına git" : ""}>
                                                        <MuiMenuItem onClick={handleRegisterDetailsClick}>
                                                            <ListItemIcon><IconFileText width={18} /></ListItemIcon>
                                                            Detayları Kaydet
                                                        </MuiMenuItem>
                                                    </CustomTooltip> */}
                                                    {hasEditPermission && (<CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı düzenle" : ""}><MuiMenuItem onClick={() => handleEditClick(selectedRowForMenu!)}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem></CustomTooltip>)}
                                                    {hasEditPermission && (
                                                        selectedRowForMenu?.recordStatus === 0 ? (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şantiyenin Depo pasif yap" : ""}>
                                                                <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 1)}>
                                                                    <ListItemIcon><DoNotDisturbOnRoundedIcon width={18} /></ListItemIcon> Pasif Yap
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                        ) : (
                                                            <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu Şantiyenin Depo aktif yap" : ""}>
                                                                <MuiMenuItem onClick={() => sendStatusUpdate(row.id, 0)}>
                                                                    <ListItemIcon><DoneRoundedIcon width={18} /></ListItemIcon> Aktif Yap
                                                                </MuiMenuItem>
                                                            </CustomTooltip>
                                                        )
                                                    )}
                                                    {hasDeletePermission && (<CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu kaydı sil" : ""}><MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem></CustomTooltip>)}
                                                    {hasDownloadPermission && (<CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Kaydı indir" : ""}><MuiMenuItem onClick={() => handleOpenRowDownloadModal(row)}><ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir</MuiMenuItem></CustomTooltip>)}
                                                </Menu>
                                            </StyledTableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><StyledTableCell colSpan={6} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç kayıt bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredCarWarehouses.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} labelRowsPerPage="Satır başına düşen:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`} />
            </BlankCard>

            {/* Download Modals */}
            <Dialog open={openDownloadAllModal} onClose={() => setOpenDownloadAllModal(false)} maxWidth="xs">
                <DialogTitle>Tüm Kayıtları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadAll('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadAll('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadAllModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openDownloadFilteredModal} onClose={() => setOpenDownloadFilteredModal(false)} maxWidth="xs">
                <DialogTitle>Filtrelenmiş Kayıtları İndir</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadFiltered('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadFiltered('excel')}>Excel Olarak İlarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadFilteredModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>
            <Dialog open={openRowDownloadModal} onClose={() => setOpenRowDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent><Stack direction="column" spacing={2} sx={{ mt: 2 }}><Button variant="contained" color="primary" startIcon={<IconFileText />} onClick={() => handleDownloadRow('pdf')}>PDF Olarak İndir</Button><Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={() => handleDownloadRow('excel')}>Excel Olarak İndir</Button></Stack></DialogContent>
                <DialogActions><Button onClick={() => setOpenRowDownloadModal(false)} color="secondary">Kapat</Button></DialogActions>
            </Dialog>

            {/* Delete Modal */}
            <DeleteCarWarehouse
                openModal={openDeleteModal}
                onClose={handleCloseDeleteModal}
                idToDelete={deleteId}
                nameToDelete={deleteName}
                onDeleteSuccess={fetchCarWarehouses}
                showAlert={showAlert}
            />
        </>
    );
};

export default ListCarWarehouse;