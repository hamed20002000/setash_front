import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box,
    TableCell as MuiTableCell, MenuItem as MuiMenuItem,
    Stack, Grid, Button, Alert, TablePagination, TextField, InputAdornment,
    ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableSortLabel, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, FormControl, Autocomplete,
    DialogContentText
} from '@mui/material';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { keyframes, styled } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import BlankCard from '../../../components/shared/BlankCard';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import {
    IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX,
    IconEye
} from '@tabler/icons-react';

import "./style.css"
import DeleteSetProjectPlanningImplementation from './DeleteSetProjectPlanningImplementation';
import axios from 'axios';
import server from '../../../assets/address.json';
import { useTooltip, CustomTooltip } from 'src/context/TooltipContext';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { useAuth } from 'src/context/AuthContext';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

const blinkAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
  50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
  100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : 'none',
    transition: 'transform 0.3s ease-in-out',
}));
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: 'NotoSans',
    fontSize: '0.8rem',
    [theme.breakpoints.up('md')]: { fontSize: '1rem' },
}));
const StyledToggleButton = styled(MuiToggleButton)(({ theme, value, selected }) => ({

    fontSize: '0.75rem',
    padding: '4px 8px',

    [theme.breakpoints.up('sm')]: {
        fontSize: '0.875rem',
        padding: '6px 12px',
    },


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
const StatusToggleButton = styled(MuiToggleButton)<{ value: number, selected: boolean }>(({ theme, value, selected }) => ({
    width: '33%',
    fontSize: '0.7rem',
    padding: '4px 8px',

    [theme.breakpoints.up('sm')]: {
        fontSize: '0.875rem',
        padding: '6px 12px',
    },
    '&.Mui-selected': {
        color: 'white',
        ...(value === 0 && selected && { backgroundColor: theme.palette.success.main, '&:hover': { backgroundColor: theme.palette.success.dark } }),
        ...(value === 1 && selected && { backgroundColor: theme.palette.warning.main, '&:hover': { backgroundColor: theme.palette.warning.dark } }),
        ...(value === 2 && selected && { backgroundColor: theme.palette.error.main, '&:hover': { backgroundColor: theme.palette.error.dark } }),
    },
    '&:not(.Mui-selected)': {
        color: theme.palette.text.primary,
        borderColor: theme.palette.divider,
        '&:hover': { backgroundColor: theme.palette.action.hover },
    },
}));

const STATUS_OPTIONS = [
    { value: 0, label: 'Tamamlandı', color: 'success' as const },
    { value: 1, label: 'Mevcut', color: 'warning' as const },
    { value: 2, label: 'İptal', color: 'error' as const },
];
const getStatusLabel = (value: number) => STATUS_OPTIONS.find(o => o.value === value)?.label || 'Yok';

interface ComboOption { id: number; name: string; }
interface ChannelOption extends ComboOption { channelRowId: number; type?: number; }
interface TransmissionOption extends ComboOption { transmissionRowId: number; }

interface ApiImplementItem {
    id: string;
    createAt: string;
    recordStatus: number;
    description: string | null;

    kaziYapilanDirekDurumu: number | null;
    altMontajiYapilanDirekDurumu: number | null;
    betonAtilanDirekDurumu: number | null;
    ustMontajiOrulenDirekDurumu: number | null;
    ustMontajiKurulanDirekDurumu: number | null;
    dikilenBetonDirekDurumu: number | null;
    iletkenCekilenDirekDurumu: number | null;
    ayiriciTakilanDirekDurumu: number | null;
    dikilenAydinlatmaDirekDurumu: number | null;
    kabloKanaliDurumu?: number | null;
    cekilenKabloMiktari: number | null;
    transformatorDurumu: number | null;
    dagitimPanosuDurumu: number | null;
    sahaDagTMKutusuDurumu: number | null;
    betonKoskDurumu: number | null;
    hucreDurumu: number | null;

    channelRow: {
        id: string;
        label?: string;
        productType?: { id: string; name?: string; type?: number };
    } | null;

    transmissionRow?: {
        id?: string;
        fromProductType?: {
            id?: string;
            name?: string;
            label?: string;
            productType?: { name?: string };
            channelRows?: Array<{
                id?: string;
                label?: string;
                productType?: { name?: string };
            }>;
        };
        toProductType?: {
            id?: string;
            name?: string;
            label?: string;
            productType?: { name?: string };
        } | null;
    } | null;

    projectPlanningImplementationDate: {
        id: string;
        startDate: string;
        endDate: string;
        recordStatus: number;
        projectPlanning: {
            id: string;
            startDate: string;
            endDate: string;
            project: {
                id: string;
                title: string;
                code: string;
            };
        };
    };
}
interface ImplementRow {
    id: number;
    projectPlanningDateId: number;
    projectTitle: string;
    startDate: string;
    endDate: string;

    recordStatus: 0 | 1 | 2;
    status: string;

    channelRowId: number | null;
    channelName: string | null;
    transmissionRowId: number | null;
    transmissionName: string | null;
    cekilenKabloMiktari: number;
    description: string;
    kaziYapilanDirekDurumu: number | null;
    altMontajiYapilanDirekDurumu: number | null;
    betonAtilanDirekDurumu: number | null;
    ustMontajiOrulenDirekDurumu: number | null;
    ustMontajiKurulanDirekDurumu: number | null;
    dikilenBetonDirekDurumu: number | null;
    iletkenCekilenDirekDurumu: number | null;
    ayiriciTakilanDirekDurumu: number | null;
    dikilenAydinlatmaDirekDurumu: number | null;
    kabloKanaliDurumu: number | null;
    transformatorDurumu: number | null;
    dagitimPanosuDurumu: number | null;
    sahaDagTMKutusuDurumu: number | null;
    betonKoskDurumu: number | null;
    hucreDurumu: number | null;
}

const ALL_IMPLEMENTATION_FIELDS: { key: keyof ImplementRow, label: string }[] = [
    { key: 'kaziYapilanDirekDurumu', label: 'Kazı Yapılan Direk Durumu' },
    { key: 'altMontajiYapilanDirekDurumu', label: 'Alt Montajı Yapılan Direk Durumu' },
    { key: 'betonAtilanDirekDurumu', label: 'Beton Atılan Direk Durumu' },
    { key: 'ustMontajiOrulenDirekDurumu', label: 'Üst Montajı Örülen Direk Durumu' },
    { key: 'ustMontajiKurulanDirekDurumu', label: 'Üst Montajı Kurulan Direk Durumu' },
    { key: 'dikilenBetonDirekDurumu', label: 'Dikilen Beton Direk Durumu' },
    { key: 'iletkenCekilenDirekDurumu', label: 'İletken Çekilen Direk Durumu' },
    { key: 'ayiriciTakilanDirekDurumu', label: 'Ayırıcı Takılan Direk Durumu' },
    { key: 'dikilenAydinlatmaDirekDurumu', label: 'Dikilen Aydınlatma Direk Durumu' },
    { key: 'kabloKanaliDurumu', label: 'Kablo Kanal Durumu' },
    { key: 'transformatorDurumu', label: 'Transformatör Durumu' },
    { key: 'dagitimPanosuDurumu', label: 'Dağıtım Panosu Durumu' },
    { key: 'sahaDagTMKutusuDurumu', label: 'Saha Dağ TM Kutusu Durumu' },
    { key: 'betonKoskDurumu', label: 'Beton Köşk Durumu' },
    { key: 'hucreDurumu', label: 'Hücre Durumu' },
];

const nz = (v: number | null | undefined) => (typeof v === 'number' ? v : 0);

const getChannelName = (item: ApiImplementItem) =>
    item.channelRow?.productType?.name || item.channelRow?.label || null;

const getTransmissionName = (item: ApiImplementItem): string | null => {
    const rows = item?.transmissionRow?.fromProductType?.channelRows;
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const names = rows
        .map(r => r?.productType?.name || r?.label)
        .filter((x): x is string => Boolean(x));

    if (names.length === 0) return null;
    if (names.length === 1) return names[0];

    return `${names[0]} -> ${names[1]}`;
};

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


const mapApiItemToRow = (item: ApiImplementItem): ImplementRow => {
    const proj = item.projectPlanningImplementationDate.projectPlanning.project;
    const plan = item.projectPlanningImplementationDate;

    const projectTitle = `${proj.title} (${proj.code})`;

    const chId = item.channelRow ? Number(item.channelRow.id) : null;
    const chName = getChannelName(item);

    const trId = item.transmissionRow ? Number(item.transmissionRow.id) : null;
    const trName = getTransmissionName(item);


    const recStatus = (item.recordStatus as 0 | 1 | 2);
    const statusStr = recStatus === 0 ? 'Aktif' : recStatus === 1 ? 'Pasif' : 'Silindi';

    return {
        id: Number(item.id),
        projectPlanningDateId: Number(plan.id),
        projectTitle,
        startDate: plan.startDate,
        endDate: plan.endDate,

        recordStatus: recStatus,
        status: statusStr,

        channelRowId: chId,
        channelName: chName,
        transmissionRowId: trId,
        transmissionName: trName,

        description: item.description || '',
        kaziYapilanDirekDurumu: item.kaziYapilanDirekDurumu,
        altMontajiYapilanDirekDurumu: item.altMontajiYapilanDirekDurumu,
        betonAtilanDirekDurumu: item.betonAtilanDirekDurumu,
        ustMontajiOrulenDirekDurumu: item.ustMontajiOrulenDirekDurumu,
        ustMontajiKurulanDirekDurumu: item.ustMontajiKurulanDirekDurumu,
        dikilenBetonDirekDurumu: item.dikilenBetonDirekDurumu,
        iletkenCekilenDirekDurumu: item.iletkenCekilenDirekDurumu,
        ayiriciTakilanDirekDurumu: item.ayiriciTakilanDirekDurumu,
        dikilenAydinlatmaDirekDurumu: item.dikilenAydinlatmaDirekDurumu,
        kabloKanaliDurumu: item.kabloKanaliDurumu !== undefined ? item.kabloKanaliDurumu : null,
        transformatorDurumu: item.transformatorDurumu,
        dagitimPanosuDurumu: item.dagitimPanosuDurumu,
        sahaDagTMKutusuDurumu: item.sahaDagTMKutusuDurumu,
        betonKoskDurumu: item.betonKoskDurumu,
        hucreDurumu: item.hucreDurumu,
        cekilenKabloMiktari: nz(item.cekilenKabloMiktari),
    };
};

type ImplementSortableKeys = keyof ImplementRow | 'projectTitle' | 'status';
const descendingComparator = (a: ImplementRow, b: ImplementRow, orderBy: ImplementSortableKeys): number => {
    const valA = (a as any)[orderBy];
    const valB = (b as any)[orderBy];
    if (valB == null) return valA == null ? 0 : -1;
    if (valA == null) return 1;
    if (typeof valB === 'string' && typeof valA === 'string') return valB.localeCompare(valA);
    if (typeof valB === 'number' && typeof valA === 'number') return valB - valA;
    return String(valB) < String(valA) ? -1 : String(valB) > String(valA) ? 1 : 0;
};
const getComparator = (order: 'asc' | 'desc', orderBy: ImplementSortableKeys) =>
    order === 'desc'
        ? (a: ImplementRow, b: ImplementRow) => descendingComparator(a, b, orderBy)
        : (a: ImplementRow, b: ImplementRow) => -descendingComparator(a, b, orderBy);
const stableSort = (array: ImplementRow[], comparator: (a: ImplementRow, b: ImplementRow) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [ImplementRow, number]);
    stabilized.sort((a, b) => { const order = comparator(a[0], b[0]); return order !== 0 ? order : a[1] - b[1]; });
    return stabilized.map((el) => el[0]);
};

interface AutocompleteComboProps {
    label: string;
    options: ComboOption[];
    value: number | null;
    onChange: (id: number | null) => void;
    disabled: boolean;
}
const AutocompleteCombo: React.FC<AutocompleteComboProps> = ({ label, options, value, onChange, disabled }) => {
    const selectedOption = options.find(o => o.id === value) || null;
    return (
        <FormControl fullWidth size="small" required>
            <CustomFormLabel required sx={{ mb: 1 }}>{label}</CustomFormLabel>

            <Autocomplete
                size="small"
                disabled={disabled}
                options={options}
                getOptionLabel={(o) => o.name}
                value={selectedOption}
                isOptionEqualToValue={(o, v) => !!v && o.id === v.id}
                onChange={(_, nv) => onChange(nv ? nv.id : null)}
                renderOption={(props, option: any) => {
                    const typeLabels: Record<number, { label: string, color: any }> = {
                        0: { label: 'Trafo', color: 'secondary' },
                        1: { label: 'Demir', color: 'default' },
                        2: { label: 'Beton', color: 'primary' }
                    };
                    const typeInfo = typeLabels[option.type] || null;

                    return (
                        <li {...props}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <Typography variant="body2">{option.name}</Typography>
                                {typeInfo && (
                                    <Chip
                                        label={typeInfo.label}
                                        size="small"
                                        color={typeInfo.color}
                                        variant="outlined"
                                        sx={{ ml: 1, fontSize: '0.65rem', height: '20px' }}
                                    />
                                )}
                            </Box>
                        </li>
                    );
                }}
                renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Arama yapın..." />}
            />
        </FormControl>
    );
};
type Props = { dateId?: number };

const ListSetProjectPlanningImplementation: React.FC<Props> = ({ dateId: propDateId }) => {
    const navigate = useNavigate();
    const { dateId: paramDateId } = useParams<{ dateId: string }>();
    const projectPlanningDateId = useMemo(() => Number(propDateId ?? paramDateId), [propDateId, paramDateId]);

    const [channelOptions, setChannelOptions] = useState<ChannelOption[]>([]);
    const [transmissionOptions, setTransmissionOptions] = useState<TransmissionOption[]>([]);
    const [comboLoading, setComboLoading] = useState<boolean>(false);

    const [implementationsList, setImplementationsList] = useState<ImplementRow[]>([]);
    const [formData, setFormData] = useState<any>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [selectedCombo, setSelectedCombo] = useState<'channel' | 'transmission' | null>(null);
    const [usedChannelIds, setUsedChannelIds] = useState<Set<number>>(new Set());
    const [usedTransmissionIds, setUsedTransmissionIds] = useState<Set<number>>(new Set());
    const [isBlinking, setIsBlinking] = useState(true);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [orderBy, setOrderBy] = useState<ImplementSortableKeys>('startDate');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
    const [isFilterActive, setIsFilterActive] = useState(false);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<ImplementRow | null>(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [implementationIdToDelete, setImplementationIdToDelete] = useState<number | null>(null);
    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [openSingleDownloadModal, setOpenSingleDownloadModal] = useState(false);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [detailData, setDetailData] = useState<ImplementRow | null>(null);


    const [openDescriptionModal, setOpenDescriptionModal] = useState(false);
    const [fullDescriptionContent, setFullDescriptionContent] = useState<string>('');


    const { isTooltipGloballyEnabled } = useTooltip();


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



    const cableAmountRef = useRef<HTMLInputElement>(null);

    const handleCableAmountFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        const target = e.target;
        const currentValue = Number(target.value) || 0;

        if (currentValue === 0) {
            setTimeout(() => {
                target.select();
            }, 0);
        }
    }, []);
    const showAlert = useCallback((m: string, s: typeof alertSeverity) => { setAlertMessage(m); setAlertSeverity(s); }, []);
    const clearAlert = () => setAlertMessage(null);

    const handleFormInputChange = (key: string, value: any) => setFormData((prev: any) => ({ ...prev, [key]: value }));
    const resetFormAndState = () => { setFormData({}); setEditingId(null); setIsFormVisible(false); setSelectedCombo(null); clearAlert(); };



    const handleComboChange = useCallback((comboType: 'channel' | 'transmission', value: number | null) => {

        const isChannelUsed = value !== null && comboType === 'channel' && usedChannelIds.has(value);
        const isTransmissionUsed = value !== null && comboType === 'transmission' && usedTransmissionIds.has(value);

        const existingRow = (isChannelUsed || isTransmissionUsed)
            ? implementationsList.find(r =>
                (comboType === 'channel' && r.channelRowId === value) ||
                (comboType === 'transmission' && r.transmissionRowId === value)
            )
            : null;

        if (value !== null && existingRow) {
            setEditingId(existingRow.id);
            setIsFormVisible(true);
            setSelectedCombo(comboType);

            const base: any = { ...existingRow };
            setFormData(base);

            showAlert(`Seçilen ${comboType === 'channel' ? 'Direk' : 'İletken'} daha önce kaydedilmiş. Düzenleme moduna geçildi.`, 'info');
            return;
        }
        if (editingId !== null) setEditingId(null);

        const base: any = ALL_IMPLEMENTATION_FIELDS.reduce((acc, f) => {
            (acc as any)[f.key] = null;
            return acc;
        }, {
            description: formData.description || '',
            channelRowId: null,
            transmissionRowId: null,
            cekilenKabloMiktari: 0,
            kabloKanaliDurumu: null,
        });

        if (comboType === 'channel' && value !== null) {
            setSelectedCombo('channel');
            setFormData({ ...base, channelRowId: value, transmissionRowId: null, cekilenKabloMiktari: 0 });
        } else if (comboType === 'transmission' && value !== null) {
            setSelectedCombo('transmission');
            setFormData({ ...base, transmissionRowId: value, channelRowId: null, cekilenKabloMiktari: formData.cekilenKabloMiktari || 0 });
        } else {
            setSelectedCombo(null);
            setFormData(base);
        }
    }, [implementationsList, editingId, formData, showAlert]);


    const isCekilenKabloMiktariVisible = useMemo(() => selectedCombo === 'transmission' || selectedCombo === 'channel', [selectedCombo]);


    const getListImplementations = useCallback(async () => {
        setLoadingData(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !projectPlanningDateId) { navigate("/"); setLoadingData(false); return; }

        try {
            const res = await axios.get(
                `${server.baseurl}${server.warehouse}get-project-planning-Implementation`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            const list: ApiImplementItem[] = res.data?.data || [];
            const filtered = list.filter(it => Number(it.projectPlanningImplementationDate?.id) === projectPlanningDateId);
            const rows = filtered.map(mapApiItemToRow);
            const usedChannels = new Set(rows.map(r => r.channelRowId).filter(id => id !== null) as number[]);
            const usedTransmissions = new Set(rows.map(r => r.transmissionRowId).filter(id => id !== null) as number[]);

            setUsedChannelIds(usedChannels);
            setUsedTransmissionIds(usedTransmissions);

            setImplementationsList(rows);
        } catch (e) {
            showAlert('Uygulama verisi alınırken bir hata oluştu.', 'error');
            setImplementationsList([]);
        } finally {
            setLoadingData(false);
        }
    }, [navigate, projectPlanningDateId, showAlert]);


    const fetchComboOptions = useCallback(async () => {
        setComboLoading(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken || !projectPlanningDateId) { setComboLoading(false); return; }
        try {
            const planningResponse = await axios.get(
                `${server.baseurl}${server.warehouse}get-project-planning-implementation-dates-by-id/${projectPlanningDateId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );
            const workId = planningResponse.data?.data?.projectPlanning?.project?.workhouse?.work?.id;
            if (!workId) { setChannelOptions([]); setTransmissionOptions([]); setComboLoading(false); return; }

            const networkResponse = await axios.get(
                `${server.baseurl}${server.initialoperations}get-network-by-work-id/${workId}`,
                { headers: { "Authorization": `Bearer ${authToken}` } }
            );

            const data = networkResponse.data?.data;
            if (!data) { setChannelOptions([]); setTransmissionOptions([]); setComboLoading(false); return; }


            const ch: ChannelOption[] = [];
            (data.networkTrAdis || []).forEach((trAd: any) => {
                (trAd.channelRows || []).forEach((row: any) => {
                    if (row?.id) {
                        ch.push({
                            id: Number(row.id),
                            name: row.productType?.name || row.label || `Kanal ${row.id}`,
                            channelRowId: Number(row.id),
                            type: row.productType?.type
                        });
                    }
                });
            });
            setChannelOptions(ch);
            const idToName: Record<number, string> = ch.reduce((acc, o) => { acc[o.id] = o.name; return acc; }, {} as Record<number, string>);
            const tr: TransmissionOption[] = (data.transmissionRows || []).map((row: any) => {
                const fromId = Number(row.fromProductType?.id);
                const toId = Number(row.toProductType?.id);
                const fromName = idToName[fromId] || row.fromProductType?.name || row.fromProductType?.label || 'Bilinmeyen';
                const toName = idToName[toId] || row.toProductType?.name || row.toProductType?.label || 'Bilinmeyen';
                return { id: Number(row.id), name: `${fromName} -> ${toName}`, transmissionRowId: Number(row.id) };
            });
            setTransmissionOptions(tr);
        } catch {
            setChannelOptions([]);
            setTransmissionOptions([]);
        } finally {
            setComboLoading(false);
        }
    }, [projectPlanningDateId, server.baseurl, server.warehouse, server.initialoperations]);




    const createPayload = (isEdit = false) => {
        if (!projectPlanningDateId || !selectedCombo) {
            showAlert('Lütfen Direkler veya İletkenler seçiniz.', 'warning');
            return null;
        }

        const base: any = {
            projectPlanningDateId,
            description: formData.description || "",
            channelRowId: null,
            transmissionRowId: null,
            cekilenKabloMiktari: Number(formData.cekilenKabloMiktari) || 0,
        };

        const statusFields = ALL_IMPLEMENTATION_FIELDS.reduce((acc, f) => {
            const val = formData[f.key];

            (acc as any)[f.key] = (val === null || val === undefined) ? null : Number(val);

            return acc;
        }, {} as any);

        if (selectedCombo === 'channel') {
            base.channelRowId = formData.channelRowId;
            base.cekilenKabloMiktari = 0;
        } else {
            base.transmissionRowId = formData.transmissionRowId;
            ALL_IMPLEMENTATION_FIELDS.forEach(f => { statusFields[f.key] = null; });
        }

        const finalPayload: any = { ...statusFields, ...base };
        if (isEdit) finalPayload.id = Number(editingId);



        return finalPayload;
    };

    const insertImplementation = async () => {
        const payload = createPayload(false);
        if (!payload) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingButton(false); return; }
        try {
            const res = await axios.post(server.baseurl + server.warehouse + "create-project-planning-implementation", payload, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data?.httpStatusCode === 201) { showAlert('Yeni uygulama başarıyla eklendi!', 'success'); resetFormAndState(); getListImplementations(); }
            else { showAlert(res.data?.message || 'Yeni uygulama eklenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'Uygulama eklenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };
    const editImplementation = async () => {
        const payload = createPayload(true);
        if (!payload || !editingId) return;
        setLoadingButton(true);
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { navigate("/"); setLoadingButton(false); return; }
        try {
            const res = await axios.put(server.baseurl + server.warehouse + "update-project-planning-implementation", payload, { headers: { Authorization: `Bearer ${authToken}` } });
            if (res.data?.httpStatusCode === 200) { showAlert('Uygulama başarıyla güncellendi!', 'success'); resetFormAndState(); getListImplementations(); }
            else { showAlert(res.data?.message || 'Uygulama güncellenirken bir hata oluştu.', 'error'); }
        } catch (e: any) {
            showAlert(e?.response?.data?.message || 'Uygulama güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    const openMenu = Boolean(anchorEl);
    const handleClickMenu = (event: React.MouseEvent<HTMLButtonElement>, row: ImplementRow) => { setAnchorEl(event.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };
    const handleEditClick = () => {
        if (!selectedRowForMenu) return;
        setEditingId(selectedRowForMenu.id);
        setIsFormVisible(true);

        const comboType = selectedRowForMenu.channelRowId ? 'channel' : selectedRowForMenu.transmissionRowId ? 'transmission' : null;
        setSelectedCombo(comboType);

        const base: any = { ...selectedRowForMenu };
        setFormData(base);

        setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
        handleCloseMenu();
        clearAlert();
    };
    const handleClickOpenDeleteModal = () => { if (selectedRowForMenu) { setImplementationIdToDelete(selectedRowForMenu.id); setOpenDeleteModal(true); } handleCloseMenu(); };
    const handleClickCloseDeleteModal = () => { setOpenDeleteModal(false); setImplementationIdToDelete(null); getListImplementations(); };

    const handleDownloadPDF = (data: ImplementRow[], titlePrefix = 'Uygulama_Detay') => {
        if (!data || data.length === 0) { showAlert('PDF oluşturulacak veri bulunamadı.', 'warning'); return; }
        const doc = new (jsPDF as any)();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        (doc as any).addFileToVFS('Arial.ttf', ArialFont);
        (doc as any).addFont('Arial.ttf', 'Arial', 'normal');
        doc.setFont('Arial');

        const cardWidth = (pageWidth - 30) / 2;
        doc.setFont('Arial', 'normal').setFontSize(14).text('Proje Uygulama Detayları', pageWidth / 2, 15, { align: 'center' });



        doc.setFontSize(10);
        doc.setFont('NotoSans', 'bold');
        doc.text(`Rapor Tarihi:`, 15, 40);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 40, 40);
        doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);

        doc.setLineWidth(0.5);
        doc.line(15, 41, pageWidth - 15, 41);

        data.forEach((item, index) => {
            if (index > 0) doc.addPage();
            let currentY = 45;
            let columnIndex = 0;

            doc.setFontSize(10);
            doc.text(`Proje: ${item.projectTitle}`, 15, currentY); currentY += 5;
            doc.text(`Başlangıç: ${format(new Date(item.startDate), 'dd MMMM yyyy', { locale: tr })}`, 15, currentY);
            doc.text(`Bitiş: ${format(new Date(item.endDate), 'dd MMMM yyyy', { locale: tr })}`, 80, currentY); currentY += 5;
            doc.text(`Tür: ${item.channelRowId ? 'Direkler' : 'İletkenler'}`, 15, currentY);
            const adTxt = item.channelRowId ? (item.channelName ?? `Kanal ID: ${item.channelRowId}`) : (item.transmissionName ?? `Hat ID: ${item.transmissionRowId}`);
            doc.text(`Ad: ${adTxt}`, 50, currentY); currentY += 10;

            const fieldsToShow = ALL_IMPLEMENTATION_FIELDS.filter(f => (item as any)[f.key] > 0);
            if (item.cekilenKabloMiktari > 0) {
                fieldsToShow.unshift({ key: 'cekilenKabloMiktari' as keyof ImplementRow, label: 'Çekilen Kablo Miktarı' });
            }
            if (fieldsToShow.length === 0) {
                doc.text("Girilmiş aktif değer bulunamadı.", 15, currentY);
                currentY += 5;
            }

            fieldsToShow.forEach((field) => {
                const currentX = 15 + (columnIndex % 2) * (cardWidth + 10);
                if (columnIndex > 0 && columnIndex % 2 === 0) currentY += 35;
                if (currentY + 35 > pageHeight - 40) {
                    doc.addPage(); currentY = 20; columnIndex = 0;
                    doc.setFontSize(14).text('Proje Uygulama Detayları (Devam)', pageWidth / 2, 15, { align: 'center' });
                }
                const value = (item as any)[field.key];
                const displayValue = field.key === 'cekilenKabloMiktari' ? String(value) : getStatusLabel(value);

                autoTable((doc as any), {
                    startY: currentY + 2,
                    margin: { left: currentX, right: pageWidth - (currentX + cardWidth) },
                    head: [[field.label]],
                    body: [[displayValue]],
                    theme: 'grid',
                    styles: { font: 'NotoSans', fontStyle: 'normal', fontSize: 10, cellPadding: 2, halign: 'center', fillColor: [245, 245, 245], textColor: [0, 0, 0] },
                    headStyles: { fillColor: [200, 220, 255], textColor: [0, 0, 0], fontSize: 8 },
                    columnStyles: { 0: { cellWidth: cardWidth } }
                });
                columnIndex++;
            });

            if (item.description) {
                currentY += 40;
                doc.text(`Açıklama: ${item.description}`, 15, currentY);
            }
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFont('NotoSans', 'normal').setFontSize(8).setTextColor(0);
            const companyInfo = ['SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.', 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR', 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'];
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
        }
        doc.save(`${titlePrefix}.pdf`);
        showAlert('PDF başarıyla oluşturuldu.', 'success');
    };

    const handleExportExcel = async (data: ImplementRow[]) => {
        if (!data || data.length === 0) { showAlert('Dışa aktarılacak veri bulunamadı.', 'warning'); return; }

        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Uygulama Raporu', { views: [{ rightToLeft: false }] });

        const dynamicHeaders = ALL_IMPLEMENTATION_FIELDS.map(f => f.label);
        const headers = ['Plan Adı', 'Başlangıç', 'Bitiş', 'Tür', 'Ad', ...dynamicHeaders, 'Çekilen Kablo Miktarı', 'Açıklama', 'Durum'];
        const headerRow = worksheet.addRow(headers);

        const thinBorder: Partial<Excel.Border> = { style: 'thin', color: { argb: 'FFD3D3D3' } };
        const border: Partial<Excel.Borders> = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
        const headFill: Excel.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        const headFont = { name: 'Calibri', size: 11, bold: true };

        headerRow.eachCell(c => { c.border = border as Excel.Borders; c.fill = headFill; (c.font as any) = headFont; });

        data.forEach(item => {
            const type = item.channelRowId ? 'Direkler' : 'İletkenler';
            const name = item.channelRowId ? (item.channelName ?? `Kanal ID: ${item.channelRowId}`) : (item.transmissionName ?? `Hat ID: ${item.transmissionRowId}`);
            const rowData = [
                item.projectTitle,
                format(new Date(item.startDate), 'dd MMM yyyy', { locale: tr }),
                format(new Date(item.endDate), 'dd MMM yyyy', { locale: tr }),
                type,
                name,
                ...ALL_IMPLEMENTATION_FIELDS.map(f => getStatusLabel((item as any)[f.key])),
                item.cekilenKabloMiktari,
                item.description,
                item.status,
            ];
            const row = worksheet.addRow(rowData);
            row.eachCell(c => { c.border = border as Excel.Borders; });
        });

        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const len = cell.value ? cell.value.toString().length : 10;
                if (len > maxLength) maxLength = len;
            });
            column.width = Math.min(Math.max(maxLength + 2, 15), 50);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `Proje_Uygulama_Raporu_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        saveAs(new Blob([buffer]), fileName);
        showAlert('Excel başarıyla oluşturuldu ve indiriliyor.', 'success');
    };


    const handleSingleDownload = (fmt: 'pdf' | 'excel') => {
        if (!selectedRowForMenu) { showAlert('İndirilecek veri seçilmedi.', 'error'); return; }
        if (fmt === 'pdf') handleDownloadPDF([selectedRowForMenu], `Uygulama_${selectedRowForMenu.id}_Raporu`);
        else handleExportExcel([selectedRowForMenu]);
        setOpenSingleDownloadModal(false);
    };

    const handleClearDateFilters = () => { setFilterStartDate(null); setFilterEndDate(null); };
    const handleRequestSort = (prop: ImplementSortableKeys) => {
        const isAsc = orderBy === prop && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(prop);
    };

    const sortedAndFiltered = useMemo(() => {
        const hasSearch = searchTerm.trim() !== '';
        const hasStatus = statusFilter !== 'all';
        const hasDate = filterStartDate !== null || filterEndDate !== null;
        setIsFilterActive(hasSearch || hasStatus || hasDate);

        let filtered = implementationsList.filter(r => {
            const q = searchTerm.toLowerCase();
            const projMatch =
                r.projectTitle.toLowerCase().includes(q) ||
                (r.transmissionName ?? '').toLowerCase().includes(q) ||
                (r.channelName ?? '').toLowerCase().includes(q) ||
                (r.description ?? '').toLowerCase().includes(q);
            const statusMatch = statusFilter === 'all' || (statusFilter === 'active' && r.recordStatus === 0) || (statusFilter === 'inactive' && r.recordStatus === 1);
            let dateMatch = true;
            if (filterStartDate) {
                const d0 = new Date(filterStartDate).setHours(0, 0, 0, 0);
                if (new Date(r.startDate).getTime() < d0) dateMatch = false;
            }
            if (filterEndDate) {
                const d1 = new Date(filterEndDate).setHours(23, 59, 59, 999);
                if (new Date(r.startDate).getTime() > d1) dateMatch = false;
            }
            return projMatch && statusMatch && dateMatch;
        });
        return stableSort(filtered, getComparator(order, orderBy));
    }, [implementationsList, searchTerm, statusFilter, order, orderBy, filterStartDate, filterEndDate]);
    const pageRows = sortedAndFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);



    const handleOpenDescriptionModal = (descriptionContent: string) => {
        setFullDescriptionContent(descriptionContent);
        setOpenDescriptionModal(true);
    };

    const handleCloseDescriptionModal = () => {
        setOpenDescriptionModal(false);
        setFullDescriptionContent('');
    };


    useEffect(() => { getListImplementations(); fetchComboOptions(); }, [getListImplementations, fetchComboOptions]);
    useEffect(() => { const t = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(t); }, []);
    useEffect(() => { let t: any; if (alertMessage) t = setTimeout(() => clearAlert(), 5000); return () => clearTimeout(t); }, [alertMessage]);

    const isFormDisabled = comboLoading || loadingButton;

    return (
        <>
            <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 1px 30px 1px" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} mb={3} flexWrap="wrap" gap={2}>
                    <Chip label="Plan Uygulama" color="primary" variant="filled" size="small" />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}>
                        {!isFormVisible && hasCreatePermission && (
                            <BlinkingButton variant="contained" color="primary" onClick={() => setIsFormVisible(true)} isBlinking={isBlinking} disabled={comboLoading}>Yeni Uygulama Kaydet</BlinkingButton>
                        )}
                        {isFormVisible && (
                            <Button variant="contained" color="error" onClick={resetFormAndState} startIcon={<IconX size={20} />}>Gizle</Button>
                        )}
                    </Stack>
                </Stack>

                {(loadingData || comboLoading) ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress /><Typography sx={{ ml: 2 }} variant="subtitle1" color="textSecondary">Veriler yükleniyor...</Typography>
                    </Box>
                ) : (
                    <>
                        {((isFormVisible && hasCreatePermission) || (editingId && hasEditPermission)) && (
                            <Grid container sx={{ mt: 2 }}>
                                <Grid item xs={12}>
                                    <Typography variant="h6" fontWeight="bold" mb={2} color="primary.main">1. Uygulama Tipi ve Değer Girişi</Typography>
                                    <Grid container spacing={3} alignItems="flex-start">
                                        <Grid item xs={12} md={4}>
                                            <AutocompleteCombo
                                                label="Direkler"
                                                options={channelOptions.filter(o => editingId === null || o.id === formData.channelRowId)} // فیلتر لیست هنگام ویرایش (اگر نیاز به تغییر نوع نباشد)
                                                value={formData.channelRowId || null}
                                                onChange={(id) => handleComboChange('channel', id)}
                                                disabled={
                                                    isFormDisabled ||
                                                    editingId !== null
                                                }
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <AutocompleteCombo
                                                label="İletkenler"
                                                options={transmissionOptions.filter(o => editingId === null || o.id === formData.transmissionRowId)} // فیلتر لیست هنگام ویرایش
                                                value={formData.transmissionRowId || null}
                                                onChange={(id) => handleComboChange('transmission', id)}
                                                disabled={
                                                    isFormDisabled ||
                                                    editingId !== null
                                                }
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            {isCekilenKabloMiktariVisible && (
                                                <Box>
                                                    <CustomFormLabel required={selectedCombo === 'transmission'}>Çekilen Kablo Miktarı (m)</CustomFormLabel>
                                                    <CustomTextField
                                                        type="number"
                                                        value={formData.cekilenKabloMiktari || 0}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormInputChange('cekilenKabloMiktari', Number(e.target.value))}

                                                        onFocus={handleCableAmountFocus}

                                                        inputRef={cableAmountRef}

                                                        fullWidth size="small"
                                                        inputProps={{ min: 0 }}
                                                        disabled={selectedCombo === 'channel' || isFormDisabled}
                                                        helperText={selectedCombo === 'channel' ? "Direkler seçildi, bu değer sıfır olarak gönderilecektir." : ""}
                                                    />
                                                </Box>
                                            )}
                                        </Grid>
                                    </Grid>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" fontWeight="bold" mb={2} color="primary.main">2. Proje Uygulama Durumları</Typography>
                                    <Grid container >
                                        {selectedCombo === 'channel' ? (
                                            ALL_IMPLEMENTATION_FIELDS.map(field => {

                                                return (
                                                    <Grid item xs={12} sm={6} key={field.key} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: '8px', mb: 2 }}>
                                                        <CustomFormLabel>{field.label}</CustomFormLabel>

                                                        <ToggleButtonGroup
                                                            value={formData[field.key] ?? null}
                                                            exclusive
                                                            onChange={(_e, v) => {
                                                                if (v !== null) handleFormInputChange(field.key, Number(v));
                                                            }}
                                                            fullWidth
                                                        >
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <StatusToggleButton
                                                                    key={opt.value}
                                                                    value={opt.value}
                                                                    selected={formData[field.key] === opt.value}
                                                                    disabled={isFormDisabled}
                                                                >
                                                                    {opt.label}
                                                                </StatusToggleButton>
                                                            ))}
                                                        </ToggleButtonGroup>
                                                    </Grid>
                                                );
                                            })
                                        ) : selectedCombo === 'transmission' ? (
                                            <Grid item xs={12}><Alert severity="info">İletkenler seçildi. Çekilen Kablo Miktarı dışındaki tüm durum alanları 0 (sıfır) olarak kaydedilecektir.</Alert></Grid>
                                        ) : (
                                            <Grid item xs={12}><Alert severity="warning">Lütfen devam etmek için Direkler veya İletkenler seçiniz.</Alert></Grid>
                                        )}
                                    </Grid>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" fontWeight="bold" mb={2} color="primary.main">3. Açıklama</Typography>
                                    <CustomFormLabel htmlFor="description">Açıklama</CustomFormLabel>
                                    <CustomTextField id="description" multiline rows={4} value={formData.description || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFormInputChange('description', e.target.value)} fullWidth disabled={isFormDisabled} />
                                </Grid>

                                <Grid item xs={12}>
                                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                                        {editingId !== null ? (
                                            <>
                                                <Button variant="contained" color="info" onClick={editImplementation} disabled={isFormDisabled || !selectedCombo}>
                                                    {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Beklemek....</> : 'Düzenlemek'}
                                                </Button>
                                                <Button variant="outlined" color="secondary" onClick={resetFormAndState}>İptal Et</Button>
                                            </>
                                        ) : (
                                            hasCreatePermission && (
                                                <Button variant="contained" color="success" onClick={insertImplementation} disabled={isFormDisabled || !selectedCombo}>
                                                    {loadingButton ? <><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> Beklemek....</> : 'Yeni Uygulama Ekle'}
                                                </Button>
                                            )
                                        )}
                                    </Stack>
                                </Grid>
                            </Grid>
                        )}
                    </>
                )}

                {alertMessage && (
                    <Stack sx={{ width: '100%', mt: 2 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={clearAlert}>{alertMessage}</Alert>
                    </Stack>
                )}
            </div>

            <BlankCard>
                <Grid item xs={12} sx={{ mt: 2 }}>
                    <Stack
                        direction={{ xs: "column", sm: "row" }}

                        alignItems={{ xs: "stretch", sm: "center" }}
                        justifyContent="flex-end"
                        sx={{ mr: { sm: 2 }, textAlign: { xs: "left", sm: "right" }, p: 1 }}
                    >
                        {isFilterActive && hasDownloadPermission && (
                            <BlinkingButton
                                variant="contained"
                                color="secondary"
                                onClick={() => setOpenDownloadModal(true)}
                                startIcon={<IconFileDownload />}
                                isBlinking
                                disabled={loadingData || sortedAndFiltered.length === 0}
                                sx={{ width: { xs: "100%", sm: "auto" } }}
                            >
                                Filtrelenmişi İndir
                            </BlinkingButton>
                        )}

                        {hasDownloadPermission && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => setOpenDownloadModal(true)}
                                startIcon={<IconFileDownload />}
                                disabled={loadingData || implementationsList.length === 0}
                                sx={{ width: { xs: "100%", sm: "auto" } }}
                            >
                                Tümünü İndir
                            </Button>
                        )}
                    </Stack>
                </Grid>


                <Box sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                label="Proje / Ad / Açıklama Ara"
                                variant="outlined" fullWidth value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={6}>
                            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    alignItems={{ xs: "stretch", sm: "center" }}
                                    sx={{ width: "100%" }}
                                >
                                    <DatePicker
                                        label="Başlangıç Tarihi"
                                        value={filterStartDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(v) => setFilterStartDate(v)}
                                        renderInput={(p) => <TextField {...p} size="small" fullWidth />}
                                    />

                                    <DatePicker
                                        label="Bitiş Tarihi"
                                        value={filterEndDate}
                                        inputFormat="dd/MM/yyyy"
                                        onChange={(v) => setFilterEndDate(v)}
                                        renderInput={(p) => <TextField {...p} size="small" fullWidth />}
                                    />

                                    <Box
                                        sx={{
                                            alignSelf: { xs: "flex-start", sm: "center" },
                                            mt: { xs: 1, sm: 0 },
                                        }}
                                    >
                                        <IconButton
                                            onClick={handleClearDateFilters}
                                            aria-label="clear date filters"
                                            sx={{ ml: { sm: 1 } }}
                                        >
                                            <IconX size={20} />
                                        </IconButton>
                                    </Box>
                                </Stack>
                            </LocalizationProvider>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <ToggleButtonGroup value={statusFilter} exclusive onChange={(_e, v) => v && setStatusFilter(v)} fullWidth>
                                <StyledToggleButton value="all">Tümü</StyledToggleButton>
                                <StyledToggleButton value="active">Aktif</StyledToggleButton>
                                <StyledToggleButton value="inactive">Pasif</StyledToggleButton>
                            </ToggleButtonGroup>
                        </Grid>
                    </Grid>
                </Box>

                <TableContainer>
                    {loadingData ? (
                        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                            <CircularProgress /><Typography sx={{ ml: 2 }} variant="subtitle1" color="textSecondary">Uygulamalar yükleniyor...</Typography>
                        </Box>
                    ) : (
                        <Table aria-label="implementation table">
                            <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                                <TableRow>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'projectTitle'} direction={orderBy === 'projectTitle' ? order : 'asc'} onClick={() => handleRequestSort('projectTitle')}>Proje (Kod)</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>Tür</StyledTableCell>
                                    <StyledTableCell>Ad</StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'startDate'} direction={orderBy === 'startDate' ? order : 'asc'} onClick={() => handleRequestSort('startDate')}>Başlangıç</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'endDate'} direction={orderBy === 'endDate' ? order : 'asc'} onClick={() => handleRequestSort('endDate')}>Bitiş</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>Açıklama</StyledTableCell>
                                    <StyledTableCell>
                                        <TableSortLabel active={orderBy === 'status'} direction={orderBy === 'status' ? order : 'asc'} onClick={() => handleRequestSort('status')}>Durum</TableSortLabel>
                                    </StyledTableCell>
                                    <StyledTableCell>Detaylar</StyledTableCell>
                                    <StyledTableCell></StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pageRows.length > 0 ? pageRows.map(row => (
                                    <TableRow key={row.id}>
                                        <StyledTableCell><Typography variant="body1">{row.projectTitle}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            <Chip label={row.channelRowId ? 'Direkler' : 'İletkenler'} color={row.channelRowId ? 'primary' : 'secondary'} size="small" />
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body2">
                                                {row.channelRowId ? (row.channelName ?? `Kanal ID: ${row.channelRowId}`) : (row.transmissionName ?? `Hat ID: ${row.transmissionRowId}`)}
                                            </Typography>
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{format(new Date(row.startDate), 'dd MMMM yyyy', { locale: tr })}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{format(new Date(row.endDate), 'dd MMMM yyyy', { locale: tr })}</Typography></StyledTableCell>
                                        <StyledTableCell sx={{ maxWidth: 150 }}>
                                            {row.description && row.description.trim().length > 0 ? (
                                                <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm açıklamayı gör" : ""}>
                                                    <Button

                                                        variant="outlined"
                                                        style={{ fontSize: "10px", padding: "2px 5px" }}
                                                        onClick={() => handleOpenDescriptionModal(row.description)}
                                                    >
                                                        Açıklamayı Oku
                                                    </Button>
                                                </CustomTooltip>
                                            ) : (
                                                <Typography variant="body2" align="center">-</Typography>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Chip label={row.status} sx={{ backgroundColor: row.recordStatus === 0 ? 'success.light' : 'error.light', color: row.recordStatus === 0 ? 'success.main' : 'error.main' }} size="small" />
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Detayları Görüntüle" : ""}>
                                                <Button variant="outlined" startIcon={<IconEye />} onClick={() => { setDetailData(row); setOpenDetailModal(true); }}>Görünüm</Button>
                                            </CustomTooltip>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton id={`basic-button-${row.id}`} onClick={(e) => handleClickMenu(e, row)}><IconDots width={18} /></IconButton>
                                            </CustomTooltip>
                                            <Menu anchorEl={anchorEl} open={openMenu && selectedRowForMenu?.id === row.id} onClose={handleCloseMenu}>

                                                {hasEditPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu uygulamayı düzenle" : ""}>
                                                        <MuiMenuItem onClick={handleEditClick}><ListItemIcon><IconEdit width={18} /></ListItemIcon>Düzenlemek</MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasDeletePermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu uygulamayı sil" : ""}>
                                                        <MuiMenuItem onClick={handleClickOpenDeleteModal}><ListItemIcon><IconTrash width={18} /></ListItemIcon>Silmek</MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                                {hasDownloadPermission && (
                                                    <CustomTooltip placement="left" title={isTooltipGloballyEnabled ? "Bu uygulamayı indir" : ""}>
                                                        <MuiMenuItem onClick={() => { setOpenSingleDownloadModal(true); }}>
                                                            <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir
                                                        </MuiMenuItem>
                                                    </CustomTooltip>
                                                )}
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><StyledTableCell colSpan={9} align="center"><Typography variant="subtitle1" color="textSecondary">Hiç uygulama bulunamadı.</Typography></StyledTableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]} component="div"
                    count={sortedAndFiltered.length} rowsPerPage={rowsPerPage} page={page}
                    onPageChange={(_e, p) => setPage(p)}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    labelRowsPerPage="Satır başına:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `+${to}`}`}
                />
            </BlankCard>

            <DeleteSetProjectPlanningImplementation
                openModal={openDeleteModal}
                onClose={handleClickCloseDeleteModal}
                implementationIdToDelete={implementationIdToDelete}
                onDeleteSuccess={getListImplementations}
                showAlert={showAlert}
            />

            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Tüm / Filtrelenmiş Kaydı İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleDownloadPDF(sortedAndFiltered, 'Uygulama_Raporu')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleExportExcel(sortedAndFiltered)}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            <Dialog open={openSingleDownloadModal} onClose={() => setOpenSingleDownloadModal(false)}>
                <DialogTitle>Seçili Satırı İndir</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleSingleDownload('pdf')}>PDF Olarak İndir</Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={() => handleSingleDownload('excel')}>Excel Olarak İndir</Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenSingleDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            <Dialog open={openDetailModal} onClose={() => setOpenDetailModal(false)} fullWidth maxWidth="md">
                <DialogTitle>Uygulama Detayları</DialogTitle>
                <DialogContent dividers>
                    {detailData && (
                        <Grid container spacing={2}>
                            <Grid item xs={12}><Typography variant="subtitle1" fontWeight="bold">Proje: {detailData.projectTitle}</Typography></Grid>
                            <Grid item xs={12}><Typography variant="body2" sx={{ wordBreak: 'break-word' }}>Açıklama: {detailData.description || '-'}</Typography></Grid>

                            {detailData.channelRowId && (
                                <>
                                    <Grid item xs={12}><Typography variant="subtitle2" mt={2} color="info.main" fontWeight="bold">Direkler Durumları</Typography></Grid>
                                    {ALL_IMPLEMENTATION_FIELDS.map(field => {
                                        const statusValue = (detailData as any)[field.key];

                                        return (
                                            <Grid item xs={12} sm={6} md={4} key={String(field.key)} sx={{ p: 1 }}>
                                                <CustomFormLabel>{field.label}</CustomFormLabel>
                                                <ToggleButtonGroup
                                                    value={statusValue}
                                                    exclusive
                                                    aria-label={`${field.label} detayı`}
                                                    fullWidth
                                                    disabled
                                                >
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <StatusToggleButton
                                                            key={opt.value}
                                                            value={opt.value}
                                                            aria-label={opt.label}
                                                            selected={statusValue === opt.value}
                                                        >
                                                            {opt.label}
                                                        </StatusToggleButton>
                                                    ))}
                                                </ToggleButtonGroup>
                                            </Grid>
                                        );
                                    })}
                                </>
                            )}

                            {detailData.transmissionRowId && (
                                <>
                                    <Grid item xs={12}><Typography variant="subtitle2" mt={2} color="info.main" fontWeight="bold">İletkenler Detayı</Typography></Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="primary.main">Hat: {detailData.transmissionName ?? `Hat ID: ${detailData.transmissionRowId}`}</Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="body2" color="primary.main">Çekilen Kablo Miktarı: <Chip label={`${detailData.cekilenKabloMiktari} m`} size="small" /></Typography>
                                    </Grid>
                                </>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDetailModal(false)} color="primary">Kapat</Button></DialogActions>
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

        </>
    );
};

export default ListSetProjectPlanningImplementation;
