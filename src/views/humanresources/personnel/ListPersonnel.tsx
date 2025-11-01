// ListPersonnel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    TableContainer, Table, TableHead, TableRow, TableBody, TablePagination,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box, Grid, Stack, Button,
    Alert, TextField, InputAdornment, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableCell as MuiTableCell, MenuItem as MuiMenuItem, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress, Autocomplete,
    RadioGroup, FormControlLabel, Radio, FormLabel, Divider, Stepper, Step, StepLabel,
    Backdrop,
    CardMedia
} from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import BoltIcon from "@mui/icons-material/Bolt";
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX, IconEye, IconRefresh, IconUpload } from "@tabler/icons-react";
import BlankCard from "src/components/shared/BlankCard";
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "src/components/forms/theme-elements/CustomTextField";
import { useTooltip, CustomTooltip } from "src/context/TooltipContext";
import { useAuth } from "src/context/AuthContext";
import axios from "axios";
import server from "src/assets/address.json";
import { tr } from "date-fns/locale";
import { format, parseISO, isValid as isValidDate } from "date-fns";

// ----- MUI v5 date pickers -----
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// ----- Exporting -----
import jsPDF from "jspdf";
// @ts-ignore
import { autoTable } from "jspdf-autotable";
import { NotoSansRegular } from "src/assets/fonts/NotoSans-Regular";
import { ArialFont } from "src/assets/fonts/Arial";
import Logo from "src/assets/images/logos/logo.png";
import Excel from "exceljs";
import { saveAs } from "file-saver";


import imagedefault from '../../../assets/images/profile/user-d.svg';

// ----- Delete Personnel -----
import DeletePersonnel from "./DeletePersonnel";

/* ---------------- styles ---------------- */
const StyledTableCell = styled(MuiTableCell)(({ theme }) => ({
    fontFamily: "NotoSans",
    fontSize: "0.8rem",
    [theme.breakpoints.up("md")]: { fontSize: "1rem" },
}));

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

const blinkAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
  50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(103, 58, 183, 0.7); }
  100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(103, 58, 183, 0.7); }
`;
const BlinkingButton = styled(Button)<{ isBlinking: boolean }>(({ isBlinking }) => ({
    animation: isBlinking ? `${blinkAnimation} 1.5s infinite` : "none",
    transition: "transform 0.3s ease-in-out",
}));

/* ---------------- types ---------------- */
type RecordStatus = 0 | 1 | 2; // 0=Aktif, 1=Pasif, 2=Silindi
enum EducationStatus { Ilkokul = 0, Ortaokul, Lise, OnLisans, Lisans, YuksekLisans, Doktora }
interface Position { id: number; title: string; }
export interface PersonnelType {
    id: number;
    name: string;
    family: string;
    identityNumber: string;
    position: Position;
    workStartDate: string | null;
    workEndDate: string | null;
    insuranceNumber: string;
    sex: number;
    salaryType: number;
    salaryAccrualMethod: number;
    group: number;
    birthPlace: string;
    birthDate: string | null;
    maritalStatus: number;
    fatherName: string;
    bloodType: number;
    address: string;
    educationStatus: number;
    iban: string;
    telephone: string;
    mobile: string;
    recordStatus: RecordStatus;
    createAt: string;
    positionId?: number | null;
    statusText?: string;
    imageSrc?: string;
}
type PositionOption = { id: number; title: string };

const SEX_LABELS = ["Erkek", "Kadın"] as const;
const SALARY_TYPE_LABELS = ["Aylık", "Günlük"] as const;
const ACCRUAL_LABELS = ["Brüt", "Net"] as const;
const GROUP_LABELS = ["Emekli", "Normal", "Engelli"] as const;
const MARITAL_LABELS = ["Bekâr", "Evli", "Dul"] as const;
const BLOOD_LABELS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const EDU_LABELS = ["İlkokul", "Ortaokul", "Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora"] as const;

const statusText = (s?: number) => (s === 0 ? "Aktif" : s === 1 ? "Pasif" : "Silindi");
// جایگزین normalizeTr قبلی کن
const normalizeTr = (s: string) => (
    s
        .toLowerCase()
        // توجه: i̇ (i با نقطه ترکیبی) را هم به i ساده برمی‌گردانیم
        .replace(/i̇/g, "i")
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ç/g, "c")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ü/g, "u")
        .trim()
);

const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "—";
    try {
        const d = parseISO(dateString.length === 10 ? dateString : String(dateString));
        return isValidDate(d) ? format(d, "dd MMMM yyyy", { locale: tr }) : "Geçersiz Tarih";
    } catch { return "Geçersiz Tarih"; }
};

const descendingComparator = <T, K extends keyof T>(a: T, b: T, orderBy: K) => {
    const va = a[orderBy] as any;
    const vb = b[orderBy] as any;
    if (vb == null) return va == null ? 0 : -1;
    if (va == null) return 1;
    if (typeof vb === "string" && typeof va === "string") return vb.localeCompare(va);
    if (typeof vb === "number" && typeof va === "number") return vb - va;
    if (String(vb) < String(va)) return -1;
    if (String(vb) > String(va)) return 1;
    return 0;
};
const getComparator = <K extends keyof PersonnelType>(order: "asc" | "desc", orderBy: K) =>
    order === "desc"
        ? (a: PersonnelType, b: PersonnelType) => descendingComparator(a, b, orderBy)
        : (a: PersonnelType, b: PersonnelType) => -descendingComparator(a, b, orderBy);
const stableSort = <T,>(array: T[], comparator: (a: T, b: T) => number) => {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
        const order = comparator(a[0], b[0]); if (order !== 0) return order; return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
};

const TEMPLATE_HEADERS = [
    "Ad",
    "Soyad",
    "TC Kimlik",
    "Pozisyon",
    "Başlangıç (yyyy-MM-dd)",
    "Bitiş (yyyy-MM-dd)",
    "Sigorta No",
    "Cinsiyet (Erkek|Kadın|0|1)",
    "Ücret Tipi (Aylık|Günlük|0|1)",
    "Tahakkuk (Brüt|Net|0|1)",
    "Grup (Emekli|Normal|Engelli|0|1|2)",
    "Doğum Yeri",
    "Doğum Tarihi (yyyy-MM-dd)",
    "Medeni (Bekâr|Evli|Dul|0|1|2)",
    "Kan Grubu (A+|A-|B+|B-|AB+|AB-|O+|O-|0..7)",
    "Baba Adı",
    "Adres",
    "Eğitim (İlkokul|Ortaokul|Lise|Ön Lisans|Lisans|Yüksek Lisans|Doktora|0..6)",
    "IBAN",
    "Telefon",
    "Mobil",
] as const;

type ImportedRow = {
    _rowIndex: number;
    name: string;
    family: string;
    identityNumber: string;
    positionText: string;
    positionId: number | null;
    workStartDate: string | null;
    workEndDate: string | null;
    insuranceNumber: string;
    sex: number;
    salaryType: number;
    salaryAccrualMethod: number;
    group: number;
    birthPlace: string;
    birthDate: string | null;
    maritalStatus: number;
    bloodType: number;
    fatherName: string;
    address: string;
    educationStatus: number;
    iban: string;
    telephone: string;
    mobile: string;

    /* validation flags */
    errors: {
        identityDuplicate: boolean;
        positionMissing: boolean;
        requiredMissing: string[]; // names of missing columns
        invalidDate: string[];     // which date fields invalid
    };
};

const ListPersonnel: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const idsFromState = ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '').split(',').map(s => s.trim()).filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState : (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
    const hasIdsFilter = notifIds.length > 0;
    const idsSet = new Set<number>(notifIds);

    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();

    const hasCreatePermission = useMemo(() =>
        allowedOperations.some((op) => op.systemOperationName === "Eklemek"), [allowedOperations]);
    const hasEditPermission = useMemo(() =>
        allowedOperations.some((op) => op.systemOperationName === "Düzenlemek"), [allowedOperations]);
    const hasDeletePermission = useMemo(() =>
        allowedOperations.some((op) => op.systemOperationName === "Silmek"), [allowedOperations]);
    const hasDownloadPermission = useMemo(() =>
        allowedOperations.some((op) => op.systemOperationName === "İndirmek ve Yazdırmak"), [allowedOperations]);

    /* alerts */
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] =
        useState<"success" | "error" | "warning" | "info">("info");
    useEffect(() => {
        let t: any;
        if (alertMessage) t = setTimeout(() => setAlertMessage(null), 5000);
        return () => clearTimeout(t);
    }, [alertMessage]);
    const showAlert = (m: string, s: typeof alertSeverity) => { setAlertMessage(m); setAlertSeverity(s); };

    /* top form */
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [loadingButton, setLoadingButton] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    /* stepper */
    const [activeStep, setActiveStep] = useState(0);
    const [showStepErrors, setShowStepErrors] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    /* lists & filters */
    const [personnelList, setPersonnelList] = useState<PersonnelType[]>([]);
    const [positions, setPositions] = useState<PositionOption[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [orderBy, setOrderBy] = useState<keyof PersonnelType>("createAt");
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    /* menus & dialogs */
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<PersonnelType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [personnelIdToDelete, setPersonnelIdToDelete] = useState<number | null>(null);

    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [downloadScope, setDownloadScope] = useState<"all" | "row">("all");
    const [rowForDownload, setRowForDownload] = useState<PersonnelType | null>(null);

    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [selectedRowForDetails, setSelectedRowForDetails] = useState<PersonnelType | null>(null);

    /* -------- IMPORT state -------- */
    const [isProcessingImport, setIsProcessingImport] = useState(false);
    const [validRows, setValidRows] = useState<ImportedRow[]>([]);
    const [invalidRows, setInvalidRows] = useState<ImportedRow[]>([]);
    const [invalidIndex, setInvalidIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [openAnnualLeaveModal, setOpenAnnualLeaveModal] = useState(false);
    const [annualLeaveData, setAnnualLeaveData] = useState<any>(null);
    const [loadingAnnualLeave, setLoadingAnnualLeave] = useState(false);

    const DEFAULT_PERSONNEL_IMAGE_URL = imagedefault;
    const [profileImageBase64, setProfileImageBase64] = useState<string>('');
    const [profileImageUrl, setProfileImageUrl] = useState<string>(DEFAULT_PERSONNEL_IMAGE_URL);

    const initialForm: PersonnelType = {
        id: 0,
        name: "",
        family: "",
        position: { id: -1, title: "—" },
        identityNumber: "",
        workStartDate: null,
        workEndDate: null,
        insuranceNumber: "",
        sex: 0,
        salaryType: 0,
        salaryAccrualMethod: 0,
        group: 0,
        birthPlace: "",
        birthDate: null,
        maritalStatus: 0,
        fatherName: "",
        bloodType: 0,
        address: "",
        educationStatus: EducationStatus.Ilkokul,
        iban: "",
        telephone: "",
        mobile: "",
        recordStatus: 0,
        createAt: "",
        positionId: null,
        statusText: undefined,
        imageSrc: undefined,
    };
    const [form, setForm] = useState<PersonnelType>(initialForm);
    const firstRequiredRef = useRef<HTMLInputElement>(null);

    /* -------- API helpers -------- */
    const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    const getAllPositions = async () => {
        if (!authToken) return;
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-positions`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = (res.data?.data ?? []).map((p: any) => ({ id: Number(p.id), title: p.title })) as PositionOption[];
            setPositions(data);
        } catch {
            showAlert("Pozisyon listesi alınamadı.", "warning");
        }
    };

    const getAllPersonnels = async () => {
        if (!authToken) { navigate("/"); return; }
        setLoadingData(true);
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const list: PersonnelType[] = (res.data?.data ?? []).map((x: any) => ({
                id: Number(x.id),
                name: x.name,
                family: x.family,
                identityNumber: x.identityNumber,
                workStartDate: x.workStartDate ? String(x.workStartDate).slice(0, 10) : null,
                workEndDate: x.workEndDate ? String(x.workEndDate).slice(0, 10) : null,
                insuranceNumber: x.insuranceNumber,
                sex: Number(x.sex ?? 0),
                salaryType: Number(x.salaryType ?? 0),
                salaryAccrualMethod: Number(x.salaryAccrualMethod ?? 0),
                group: Number(x.group ?? 0),
                birthPlace: String(x.birthPlace ?? ""),
                birthDate: x.birthDate ? String(x.birthDate).slice(0, 10) : null,
                maritalStatus: Number(x.maritalStatus ?? 0),
                fatherName: x.fatherName ?? "",
                bloodType: Number(x.bloodType ?? 0),
                address: x.address ?? "",
                educationStatus: Number(x.educationStatus ?? 0),
                iban: x.iban ?? "",
                telephone: x.telephone ?? "",
                mobile: x.mobile ?? "",
                recordStatus: Number(x.recordStatus ?? 0) as RecordStatus,
                createAt: x.createAt ?? "",
                position: x.position ?? { id: -1, title: "Pozisyon yok" },
                statusText: statusText(x.recordStatus),
            }));
            setPersonnelList(list);
        } catch (e: any) {
            showAlert(e?.response?.data?.message || "Personel listesi alınamadı.", "error");
        } finally {
            setLoadingData(false);
        }
    };

    // در کنار سایر توابع useCallback
    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setProfileImageBase64(base64String); // ذخیره Base64 برای ارسال به API
                setProfileImageUrl(base64String); // نمایش تصویر جدید
            };
            reader.readAsDataURL(file);
        } else {
            setProfileImageBase64('');
            setProfileImageUrl(DEFAULT_PERSONNEL_IMAGE_URL);
        }
    }, []);


    const handleAnnualLeaveClick = async (row: PersonnelType) => {
        debugger
        setLoadingAnnualLeave(true);
        try {
            const response = await axios.get(`${server.baseurl}${server.hr}get-remaining-leave-by-personnelId/${row.id}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (response.data.success) {
                setAnnualLeaveData(response.data.data);
                setOpenAnnualLeaveModal(true);
                handleCloseMenu();
            } else {
                showAlert("Veri alınırken bir hata oluştu.", "error");
            }
        } catch (error) {
            showAlert("Veri alınırken bir hata oluştu.", "error");
        } finally {
            setLoadingAnnualLeave(false);
        }
    };

    useEffect(() => { getAllPersonnels(); getAllPositions(); }, []);

    /* -------- Filters / sorting -------- */
    const handleStatusFilterChange = (_: any, v: "all" | "active" | "inactive" | null) => { if (v) { setStatusFilter(v); setPage(0); } };
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); };
    const handleRequestSort = (property: keyof PersonnelType) => {
        const isAsc = orderBy === property && order === "asc"; setOrder(isAsc ? "desc" : "asc"); setOrderBy(property); setPage(0);
    };

    const filtered = useMemo(() => {
        const q = (searchTerm.trim().toLowerCase());
        return personnelList.filter((p) => {
            const matchesSearch =
                !q ||
                (p.name ?? "").toLowerCase().includes(q) ||
                (p.family ?? "").toLowerCase().includes(q) ||
                `${(p.name ?? "").toLowerCase()} ${(p.family ?? "").toLowerCase()}`.includes(q) ||
                (p.identityNumber ?? "").toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && p.recordStatus === 0) ||
                (statusFilter === "inactive" && p.recordStatus === 1);
            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(p.id));
            return matchesSearch && matchesStatus && matchesNotifIds;
        });
    }, [personnelList, searchTerm, statusFilter, hasIdsFilter, notifIds]);

    const sorted = useMemo(() => stableSort(filtered, getComparator(order, orderBy)), [filtered, order, orderBy]);
    const paginated = useMemo(() => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sorted, page, rowsPerPage]);

    useEffect(() => { const timer = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(timer); }, []);

    /* -------- edit / delete / details -------- */
    const handleClickMenu = (e: React.MouseEvent<HTMLButtonElement>, row: PersonnelType) => { setAnchorEl(e.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const onEditRow = (row: PersonnelType) => {
        debugger
        setForm({ ...row });
        setEditingId(row.id);
        setIsFormVisible(true);
        setActiveStep(0);
        setShowStepErrors(false);
        setForm(prevForm => ({ ...prevForm, positionId: row.position?.id ?? null }));
        setProfileImageBase64('');
        handleCloseMenu();
    };

    const handleOpenDelete = () => {
        if (selectedRowForMenu) { setPersonnelIdToDelete(selectedRowForMenu.id); setOpenDeleteModal(true); }
        handleCloseMenu();
    };

    const handleClickDetails = (row: PersonnelType) => { setSelectedRowForDetails(row); setOpenDetailsDialog(true); };

    const resetFormAndState = () => {
        setForm(initialForm); setIsFormVisible(false);
        setEditingId(null); setActiveStep(0); setShowStepErrors(false);
        setProfileImageUrl(DEFAULT_PERSONNEL_IMAGE_URL);
    };
    const isStepValid = (step: number) => {
        switch (step) {
            case 0: return Boolean(form.name?.trim()) && Boolean(form.family?.trim()) && Boolean(form.identityNumber?.trim()) && form.positionId != null;
            case 1: return Boolean(form.workStartDate);
            case 2: return Boolean(form.birthDate) && Boolean(form.fatherName?.trim()) && Boolean(form.address?.trim());
            case 3: return Boolean(form.mobile?.trim() || form.telephone?.trim());
            default: return true;
        }
    };

    const handleNextStep = () => { if (!isStepValid(activeStep)) { setShowStepErrors(true); return; } setShowStepErrors(false); setActiveStep((s) => Math.min(3, s + 1)); };
    const handlePrevStep = () => { setShowStepErrors(false); setActiveStep((s) => Math.max(0, s - 1)); };

    const submitCreate = async () => {
        if (!isStepValid(3)) { setShowStepErrors(true); return; }
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);
        try {
            const payload = {
                name: form.name,
                family: form.family,
                identityNumber: form.identityNumber,
                workStartDate: form.workStartDate,
                workEndDate: form.workEndDate,
                insuranceNumber: form.insuranceNumber,
                sex: form.sex,
                salaryType: form.salaryType,
                salaryAccrualMethod: form.salaryAccrualMethod,
                group: form.group,
                birthPlace: form.birthPlace,
                birthDate: form.birthDate,
                maritalStatus: form.maritalStatus,
                fatherName: form.fatherName,
                bloodType: form.bloodType,
                address: form.address,
                educationStatus: form.educationStatus,
                iban: form.iban,
                telephone: form.telephone,
                mobile: form.mobile,
                positionId: form.positionId ?? null,
                imageSrc: profileImageBase64,
            };
            const res = await axios.post(`${server.baseurl}${server.hr}create-personnel`, payload, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 201 || res.status === 201) {
                showAlert("Yeni personel kaydı oluşturuldu!", "success");
                resetFormAndState();
                getAllPersonnels();
            } else { showAlert(res.data?.message || "Kayıt oluşturulamadı.", "error"); }
        } catch (e: any) {
            if (e?.response?.status === 401) { localStorage.removeItem("authToken"); navigate("/"); }
            showAlert(e?.response?.data?.message || "Bir hata oluştu.", "error");
        } finally { setLoadingButton(false); }
    };

    const submitUpdate = async () => {
        if (editingId == null) return;
        if (!isStepValid(3)) { setShowStepErrors(true); return; }
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);
        try {
            const payload = {
                id: editingId,
                name: form.name,
                family: form.family,
                identityNumber: form.identityNumber,
                workStartDate: form.workStartDate,
                workEndDate: form.workEndDate,
                insuranceNumber: form.insuranceNumber,
                sex: form.sex,
                salaryType: form.salaryType,
                salaryAccrualMethod: form.salaryAccrualMethod,
                group: form.group,
                birthPlace: form.birthPlace,
                birthDate: form.birthDate,
                maritalStatus: form.maritalStatus,
                fatherName: form.fatherName,
                bloodType: form.bloodType,
                address: form.address,
                educationStatus: form.educationStatus,
                iban: form.iban,
                telephone: form.telephone,
                mobile: form.mobile,
                positionId: form.positionId ?? null,
                imageSrc: profileImageBase64 || (profileImageUrl !== DEFAULT_PERSONNEL_IMAGE_URL ? profileImageUrl : ''),
            };
            const res = await axios.put(`${server.baseurl}${server.hr}update-personnel`, payload, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 200) {
                showAlert("Personel kaydı güncellendi!", "success");
                resetFormAndState();
                getAllPersonnels();
            } else {
                showAlert(res.data?.message || "Güncelleme başarısız.", "error");
            }
        } catch (e: any) {
            if (e?.response?.status === 401) { localStorage.removeItem("authToken"); navigate("/"); }
            showAlert(e?.response?.data?.message || "Bir hata oluştu.", "error");
        } finally { setLoadingButton(false); }
    };

    const sendStatusUpdate = async (id: number, statusValue: number) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert('Lütfen giriş yapın.', 'warning'); navigate("/"); }
        try {
            const response = await axios.put(
                server.baseurl + server.hr + "update-personnel",
                { id: Number(id), recordStatus: statusValue },
                { headers: { "Accept": "application/json", "Authorization": `Bearer ${authToken}`, 'Content-Type': 'application/json' } }
            );
            if (response.data.httpStatusCode === 200) {
                showAlert('Personel başarıyla güncellendi!', 'success');
                resetFormAndState();
                getAllPersonnels();
            } else {
                showAlert(response.data.message || 'Durum güncellenirken bir hata oluştu.', 'error');
            }
        } catch (e: any) {
            if (e.response && e.response.status === 500) showAlert('Bu kayıt, başka bir işlemde kullanıldığı için silinemez veya düzenlenemez.', 'error');
            else if (e.response && e.response.status === 401) { localStorage.removeItem('authToken'); showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/"); }
            else showAlert(e.response?.data?.message || 'Durum güncellenirken bir hata oluştu, lütfen tekrar deneyin.', 'error');
        } finally { handleCloseMenu(); }
    };

    /* ---------------- PDF helpers (unchanged UI) ---------------- */
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const d: any = doc;
        d.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        d.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        d.addFileToVFS("Arial.ttf", ArialFont);
        d.addFont("Arial.ttf", "Arial", "normal");
        doc.setFont("NotoSans", "normal");
        if ((doc as any).setCharSpace) (doc as any).setCharSpace(0);
        if ((doc as any).setWordSpace) (doc as any).setWordSpace(0);

        const logoW = 48, logoH = 30;
        const margin = 36;
        doc.addImage(Logo as any, "PNG", pageWidth - margin - logoW, margin - 6, logoW, logoH);

        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, margin + 2, { align: "center" });

        doc.setFontSize(10);
        const labelX = margin, labelY = margin + 22;
        doc.text("Rapor Tarihi:", labelX, labelY);
        doc.text(format(new Date(), "dd MMMM yyyy", { locale: tr }), labelX + 65, labelY);
    };
    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottom = 36;
        doc.setFont("NotoSans", "normal"); doc.setFontSize(8);
        // const y = pageHeight - bottom - 16;
        doc.setFontSize(10);
        doc.text("İmza", pageWidth - bottom, pageHeight - 10, { align: "right" });
        doc.line(pageWidth - bottom - 50, pageHeight - 15, pageWidth - bottom, pageHeight - 15);
        const d: any = doc;
        const pageNo = d.internal.getCurrentPageInfo().pageNumber;
        const pageCount = d.internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNo} / ${pageCount}`, bottom, pageHeight - 10);
    };
    const toPairsForPerson = (p: PersonnelType): Array<[string, string]> => {
        const positionTitle = positions.find(x => x.id === (Number(p.position?.id) ?? -1))?.title || "—";
        return [
            ["Ad", p.name || "—"],
            ["Soyad", p.family || "—"],
            ["TC Kimlik", p.identityNumber || "—"],
            ["Başlangıç", formatDateDisplay(p.workStartDate)],
            ["Bitiş", formatDateDisplay(p.workEndDate)],
            ["Sigorta No", p.insuranceNumber || "—"],
            ["Pozisyon", positionTitle],
            ["Cinsiyet", SEX_LABELS[p.sex] ?? "—"],
            ["Ücret Tipi", SALARY_TYPE_LABELS[p.salaryType] ?? "—"],
            ["Tahakkuk", ACCRUAL_LABELS[p.salaryAccrualMethod] ?? "—"],
            ["Grup", GROUP_LABELS[p.group] ?? "—"],
            ["Doğum Yeri", p.birthPlace || "—"],
            ["Doğum Tarihi", formatDateDisplay(p.birthDate)],
            ["Medeni Durum", MARITAL_LABELS[p.maritalStatus] ?? "—"],
            ["Baba Adı", p.fatherName || "—"],
            ["Kan Grubu", BLOOD_LABELS[p.bloodType] ?? "—"],
            ["Adres", p.address || "—"],
            ["Eğitim", EDU_LABELS[p.educationStatus] ?? "—"],
            ["IBAN", p.iban || "—"],
            ["Telefon", p.telephone || "—"],
            ["Mobil", p.mobile || "—"],
            ["Durum", statusText(p.recordStatus)],
            ["Oluşturulma", formatDateDisplay(p.createAt?.slice(0, 10) || null)],
        ];
    };
    const pdfForRows = (rows: PersonnelType[], filename: string) => {
        const doc = new jsPDF("p", "pt", "a4");
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");

        const topMargin = 100, sideMargin = 40, bottomMargin = 70;
        rows.forEach((p, idx) => {
            if (idx > 0) doc.addPage();
            addPdfHeader(doc, "Personel Detay Raporu");
            const pairs = toPairsForPerson(p);
            autoTable(doc, {
                startY: topMargin,
                head: [["Alan", "Değer"]],
                body: pairs,
                theme: "grid",
                styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 4, overflow: "linebreak" },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: "NotoSans", fontStyle: "normal" },
                columnStyles: { 0: { cellWidth: 150, font: "NotoSans", fontStyle: "normal" }, 1: { cellWidth: "auto" } },
                margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin },
                didDrawPage: () => { addPdfHeader(doc, "Personel Detay Raporu"); addPdfFooter(doc); },
                showHead: "everyPage",
            });
        });
        doc.save(filename);
    };

    /* ---------------- Excel (table) export existing UI kept) ---------------- */
    const handleDownloadChoosePDF = () => {
        if (downloadScope === "all") {
            pdfForRows(sorted, "Personel_Detay_Raporu.pdf");
        } else if (rowForDownload) {
            const fileSlug = `${rowForDownload.name || ""}_${rowForDownload.family || ""}`.trim().replace(/\s+/g, "_");
            pdfForRows([rowForDownload], `Personel_Detay_${fileSlug || rowForDownload.id}.pdf`);
        }
        setOpenDownloadModal(false);
    };

    const handleDownloadChoosePDFTable = () => {
        const doc = new jsPDF("landscape", "pt", "a4");
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");
        const topMargin = 100, sideMargin = 40, bottomMargin = 70;
        const rows = paginated;
        const headerRow = [
            "Ad", "Soyad", "TC Kimlik", "Başlangıç", "Bitiş", "Pozisyon",
            "Cinsiyet", "Ücret Tipi", "Tahakkuk", "Grup", "Doğum Tarihi",
            "Medeni Durum", "Baba Adı", "Eğitim", "Telefon", "Mobil"
        ];
        const allData: any[] = [];
        rows.forEach((p) => {
            const row = [
                p.name || "—", p.family || "—", p.identityNumber || "—", formatDateDisplay(p.workStartDate),
                formatDateDisplay(p.workEndDate), positions.find(x => x.id === (Number(p.position.id) ?? -1))?.title || "—",
                SEX_LABELS[p.sex] ?? "—", SALARY_TYPE_LABELS[p.salaryType] ?? "—",
                ACCRUAL_LABELS[p.salaryAccrualMethod] ?? "—", GROUP_LABELS[p.group] ?? "—",
                formatDateDisplay(p.birthDate), MARITAL_LABELS[p.maritalStatus] ?? "—",
                p.fatherName || "—", EDU_LABELS[p.educationStatus] ?? "—",
                p.telephone || "—", p.mobile || "—"
            ];
            allData.push(row);
        });
        autoTable(doc, {
            startY: topMargin,
            head: [headerRow],
            body: allData,
            theme: "grid",
            styles: { font: "NotoSans", fontStyle: "normal", fontSize: 8, cellPadding: 3, overflow: "linebreak" },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: "NotoSans", fontStyle: "normal" },
            margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin },
            didDrawPage: () => { addPdfHeader(doc, "Personel Detay Raporu"); addPdfFooter(doc); },
            showHead: "everyPage",
        });
        doc.save("Personel_Tablo_Raporu.pdf");
    };

    /* ---------------- Excel Template (LTR, no footer) ---------------- */
    const handleDownloadTemplate = async () => {
        const wb = new Excel.Workbook();
        const ws = wb.addWorksheet("Personel_Sablonu", { views: [{ rightToLeft: false }] }); // LTR
        ws.addRow([...TEMPLATE_HEADERS]);
        ws.getRow(1).font = { name: "NotoSans", bold: true };
        ws.columns = [
            { width: 18 }, { width: 18 }, { width: 16 }, { width: 24 },
            { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
            { width: 16 }, { width: 12 }, { width: 16 }, { width: 16 },
            { width: 16 }, { width: 18 }, { width: 16 }, { width: 16 },
            { width: 28 }, { width: 18 }, { width: 22 }, { width: 16 },
            { width: 16 },
        ];
        ws.addRow([
            "Ali",
            "Yılmaz",
            "12345678901",
            "Yazılım Uzmanı",
            "2023-01-10",
            "",
            "SGK-0001",
            "Erkek",
            "Aylık",
            "Brüt",
            "Normal",
            "İzmir",
            "1992-05-15",
            "Evli",
            "A+",
            "Mehmet",
            "İzmir/…",
            "Lisans",
            "TR00 0000 0000 0000 0000 0000 00",
            "0232...",
            "05.."
        ]);
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), "Personel_Sablonu.xlsx");
    };

    /* ---------------- Import Excel ---------------- */
    const getByTitle = (row: Excel.Row, map: Map<string, number>, title: string) => String(row.getCell(map.get(title) ?? 0).value ?? "").trim();
    const tryMapRadioFromText = (raw: any, labels: readonly string[], def: number): number => {
        if (raw == null) return def;
        const s = String(raw).trim();
        if (/^\d+$/.test(s)) {
            const n = Number(s); if (n >= 0 && n < labels.length) return n;
        }
        const i = labels.findIndex((x) => normalizeTr(x) === normalizeTr(s));
        return i >= 0 ? i : def;
    };
    const parseIso = (s: string): string | null => {
        if (!s) return null;
        const d = new Date(s);
        const good = !isNaN(d.getTime());
        if (!good) return null;
        const yyyy = d.getFullYear();
        const mm = `${d.getMonth() + 1}`.padStart(2, "0");
        const dd = `${d.getDate()}`.padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // reset for re-select
        if (!file) return;

        setIsProcessingImport(true);
        try {
            const wb = new Excel.Workbook();
            const buf = await file.arrayBuffer();
            await wb.xlsx.load(buf);
            const ws = wb.worksheets[0];
            if (!ws) throw new Error("Şablon bulunamadı.");
            // header mapping
            const headerRow = ws.getRow(1);
            const headerMap = new Map<string, number>();
            headerRow.eachCell((cell, colNumber) => {
                headerMap.set(String(cell.value ?? "").trim(), colNumber);
            });
            // validate headers exist
            for (const h of TEMPLATE_HEADERS) {
                if (!headerMap.has(h)) { throw new Error("Şablon başlıkları uyumsuz. Lütfen yeni şablonu indirin."); }
            }

            // existing identity numbers (DB list)
            const existingTC = new Set(personnelList.map(p => (p.identityNumber ?? "").trim()));

            // Build rows
            const tmpValid: ImportedRow[] = [];
            const tmpInvalid: ImportedRow[] = [];
            const seenTC = new Set<string>(); // duplicates inside file

            ws.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // header
                const name = getByTitle(row, headerMap, TEMPLATE_HEADERS[0]);
                const family = getByTitle(row, headerMap, TEMPLATE_HEADERS[1]);
                const identityNumber = getByTitle(row, headerMap, TEMPLATE_HEADERS[2]);
                const positionText = getByTitle(row, headerMap, TEMPLATE_HEADERS[3]);

                const workStartDate = parseIso(getByTitle(row, headerMap, TEMPLATE_HEADERS[4]));
                const workEndDate = parseIso(getByTitle(row, headerMap, TEMPLATE_HEADERS[5]));
                const insuranceNumber = getByTitle(row, headerMap, TEMPLATE_HEADERS[6]);
                const sex = tryMapRadioFromText(getByTitle(row, headerMap, TEMPLATE_HEADERS[7]), SEX_LABELS as unknown as string[], 0);
                const salaryType = tryMapRadioFromText(getByTitle(row, headerMap, TEMPLATE_HEADERS[8]), SALARY_TYPE_LABELS as unknown as string[], 0);
                const salaryAccrualMethod = tryMapRadioFromText(getByTitle(row, headerMap, TEMPLATE_HEADERS[9]), ACCRUAL_LABELS as unknown as string[], 0);
                const group = tryMapRadioFromText(getByTitle(row, headerMap, TEMPLATE_HEADERS[10]), GROUP_LABELS as unknown as string[], 1);
                const birthPlace = getByTitle(row, headerMap, TEMPLATE_HEADERS[11]);
                const birthDate = parseIso(getByTitle(row, headerMap, TEMPLATE_HEADERS[12]));
                const maritalStatus = tryMapRadioFromText(getByTitle(row, headerMap, TEMPLATE_HEADERS[13]), MARITAL_LABELS as unknown as string[], 0);
                const bloodType = tryMapRadioFromText(getByTitle(row, headerMap, TEMPLATE_HEADERS[14]), BLOOD_LABELS as unknown as string[], 0);
                const fatherName = getByTitle(row, headerMap, TEMPLATE_HEADERS[15]);
                const address = getByTitle(row, headerMap, TEMPLATE_HEADERS[16]);
                const educationStatus = tryMapRadioFromText(getByTitle(row, headerMap, TEMPLATE_HEADERS[17]), EDU_LABELS as unknown as string[], 4);
                const iban = getByTitle(row, headerMap, TEMPLATE_HEADERS[18]);
                const telephone = getByTitle(row, headerMap, TEMPLATE_HEADERS[19]);
                const mobile = getByTitle(row, headerMap, TEMPLATE_HEADERS[20]);

                // position map
                const foundPos = positions.find(p => normalizeTr(p.title) === normalizeTr(positionText));
                const positionId = foundPos?.id ?? null;

                // required fields
                const requiredMissing: string[] = [];
                if (!name) requiredMissing.push("Ad");
                if (!family) requiredMissing.push("Soyad");
                if (!identityNumber) requiredMissing.push("TC Kimlik");
                if (!workStartDate) requiredMissing.push("Başlangıç (yyyy-MM-dd)");
                if (!birthDate) requiredMissing.push("Doğum Tarihi (yyyy-MM-dd)");
                if (!fatherName) requiredMissing.push("Baba Adı");
                if (!address) requiredMissing.push("Adres");
                if (!(mobile || telephone)) requiredMissing.push("Mobil/Telefon");

                const invalidDate: string[] = [];
                if (getByTitle(row, headerMap, TEMPLATE_HEADERS[4]) && !workStartDate) invalidDate.push("Başlangıç");
                if (getByTitle(row, headerMap, TEMPLATE_HEADERS[12]) && !birthDate) invalidDate.push("Doğum Tarihi");

                // TC duplicates: in-file or existing DB list
                const tcDup = !identityNumber
                    ? false
                    : (seenTC.has(identityNumber) || existingTC.has(identityNumber));

                if (identityNumber) seenTC.add(identityNumber);

                const r: ImportedRow = {
                    _rowIndex: rowNumber,
                    name, family, identityNumber,
                    positionText, positionId,
                    workStartDate, workEndDate, insuranceNumber,
                    sex, salaryType, salaryAccrualMethod, group,
                    birthPlace, birthDate, maritalStatus, bloodType,
                    fatherName, address, educationStatus, iban, telephone, mobile,
                    errors: {
                        identityDuplicate: tcDup,
                        positionMissing: positionId == null,
                        requiredMissing,
                        invalidDate
                    }
                };

                const hasError = r.errors.identityDuplicate || r.errors.positionMissing || r.errors.requiredMissing.length > 0 || r.errors.invalidDate.length > 0;
                if (hasError) tmpInvalid.push(r); else tmpValid.push(r);
            });

            // 1) auto-create valid rows
            let okCount = 0, failCount = 0;
            if (tmpValid.length) {
                for (const r of tmpValid) {
                    try {
                        await createImportedRow(r);
                        okCount++;
                    } catch {
                        failCount++;
                        // if failed at API, push to invalid for correction
                        tmpInvalid.push({
                            ...r,
                            errors: { ...r.errors, requiredMissing: [...r.errors.requiredMissing], identityDuplicate: true }
                        });
                    }
                }
            }

            // 2) open modal for invalids
            setValidRows(tmpValid);
            setInvalidRows(tmpInvalid);
            setInvalidIndex(0);

            if (okCount > 0) showAlert(`${okCount} kayıt otomatik eklendi.`, "success");
            if (failCount > 0) showAlert(`${failCount} kayıt eklenemedi ve düzenlemeye taşındı.`, "warning");
            if (tmpInvalid.length === 0) showAlert(`Tüm kayıtlar başarıyla eklendi.`, "success");

        } catch (err: any) {
            showAlert(err?.message || "Excel işlenemedi.", "error");
        } finally {
            setIsProcessingImport(false);
        }
    };

    const createImportedRow = async (r: ImportedRow) => {
        if (!authToken) { navigate("/"); throw new Error("auth"); }
        const payload = {
            name: r.name,
            family: r.family,
            identityNumber: r.identityNumber,
            workStartDate: r.workStartDate,
            workEndDate: r.workEndDate,
            insuranceNumber: r.insuranceNumber,
            sex: r.sex,
            salaryType: r.salaryType,
            salaryAccrualMethod: r.salaryAccrualMethod,
            group: r.group,
            birthPlace: r.birthPlace,
            birthDate: r.birthDate,
            maritalStatus: r.maritalStatus,
            fatherName: r.fatherName,
            bloodType: r.bloodType,
            address: r.address,
            educationStatus: r.educationStatus,
            iban: r.iban,
            telephone: r.telephone,
            mobile: r.mobile,
            positionId: r.positionId
        };
        const res = await axios.post(`${server.baseurl}${server.hr}create-personnel`, payload, {
            headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!(res.data?.httpStatusCode === 201 || res.status === 201)) throw new Error(res.data?.message || "create failed");
    };

    const openDownloadChooserForAll = () => {
        if (!sorted.length) { showAlert("İndirilecek veri bulunamadı.", "warning"); return; }
        setDownloadScope("all"); setRowForDownload(null); setOpenDownloadModal(true);
    };
    const openDownloadChooserForRow = () => {
        setDownloadScope("row"); setRowForDownload(selectedRowForMenu); setOpenDownloadModal(true); handleCloseMenu();
    };

    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams); next.delete('ids'); setSearchParams(next, { replace: true });
        navigate(location.pathname, { replace: true, state: { ...(location.state as any), notifIds: [] } });
        setPage(0);
    };

    /* -------------------- RENDER -------------------- */
    const renderTopBar = (
        <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} mt={2} mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" mb={{ xs: 1, sm: 0 }}>{editingId ? "Personel Düzenle" : "Yeni Personel Kaydı"}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
                    {/* Template & Import */}
                    <Button variant="outlined" startIcon={<IconFileDownload />} onClick={handleDownloadTemplate}>
                        Şablonu İndir
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".xlsx" hidden onChange={handleExcelFileChange} />
                    <Button variant="outlined" color="secondary" startIcon={<IconUpload />} onClick={() => fileInputRef.current?.click()}>
                        Excel İçe Aktar
                    </Button>

                    {/* Yeni Personel */}
                    {!isFormVisible && hasCreatePermission && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Yeni personel ekle" : ""}>
                            <BlinkingButton variant="contained" color="primary" isBlinking={isBlinking} onClick={() => { setIsFormVisible(true); setActiveStep(0); }}>
                                Yeni Personel
                            </BlinkingButton>
                        </CustomTooltip>
                    )}
                    {isFormVisible && (
                        <CustomTooltip title={isTooltipGloballyEnabled ? "Formu gizle" : ""}>
                            <Button variant="contained" color="error" onClick={resetFormAndState} startIcon={<IconX size={20} />}>Gizle</Button>
                        </CustomTooltip>
                    )}
                </Stack>
            </Stack>

            {/* Multi-step form */}
            {isFormVisible && (
                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                    <Stack spacing={2}>
                        <Stepper activeStep={activeStep} alternativeLabel>
                            {["Kimlik", "İş Bilgileri", "Kişisel", "İletişim"].map((label) => (<Step key={label}><StepLabel>{label}</StepLabel></Step>))}
                        </Stepper>

                        {showStepErrors && <Alert severity="warning">Lütfen bu adımın zorunlu alanlarını doldurun.</Alert>}

                        {/* Step 0: Kimlik */}
                        {activeStep === 0 && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Ad</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomTextField size="small" fullWidth value={form.name} inputRef={firstRequiredRef}
                                        placeholder="Ad"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        required error={showStepErrors && !form.name?.trim()} helperText={showStepErrors && !form.name?.trim() ? "Bu alan zorunludur" : ""} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel fullWidth sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Soyad</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomTextField size="small" fullWidth value={form.family}
                                        placeholder="Soyad"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, family: e.target.value }))}
                                        required error={showStepErrors && !form.family?.trim()} helperText={showStepErrors && !form.family?.trim() ? "Bu alan zorunludur" : ""} />
                                </Grid>

                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>TC Kimlik</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomTextField size="small" fullWidth value={form.identityNumber}
                                        placeholder="TC Kimlik"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, identityNumber: e.target.value }))}
                                        required error={showStepErrors && !form.identityNumber?.trim()} helperText={showStepErrors && !form.identityNumber?.trim() ? "Bu alan zorunludur" : ""} />
                                </Grid>

                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Pozisyon</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Autocomplete
                                        options={positions}
                                        size="small"
                                        value={positions.find((p) => p.id === (Number(form.positionId) ?? -1)) || null}
                                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                        onChange={(_, v) => setForm((f) => ({ ...f, positionId: v?.id ?? null }))}
                                        getOptionLabel={(o) => o.title}
                                        renderInput={(params) => (
                                            <TextField {...params} placeholder="Pozisyon seçin" required
                                                error={showStepErrors && form.positionId == null}
                                                helperText={showStepErrors && form.positionId == null ? "Bu alan zorunludur" : ""} />
                                        )}
                                    />
                                </Grid>


                                <Grid item xs={12} sm={3} display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start">
                                    <CardMedia
                                        component="img"
                                        sx={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', mb: 1, border: '1px solid #ccc' }}
                                        image={profileImageUrl}
                                        alt="Personel Fotoğrafı"
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleImageChange}
                                    />
                                    <CustomTooltip title={isTooltipGloballyEnabled ? "Personelin profil resmini seçin" : ""}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => fileInputRef.current?.click()}
                                            size="small"
                                        >
                                            Resim Seç
                                        </Button>
                                    </CustomTooltip>
                                </Grid>

                            </Grid>


                        )}

                        {/* Step 1: İş Bilgileri */}
                        {activeStep === 1 && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Başlangıç</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                        <DatePicker
                                            label="Başlangıç"
                                            value={form.workStartDate}
                                            onChange={(next: any) => setForm((f) => ({ ...f, workStartDate: next ? format(next, "yyyy-MM-dd") : null }))}
                                            renderInput={(params: any) => (
                                                <TextField {...params} size="small" fullWidth error={showStepErrors && !form.workStartDate} helperText={showStepErrors ? "Başlangıç tarihi zorunludur!" : ""} />
                                            )}
                                        />
                                    </LocalizationProvider>
                                </Grid>

                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>Bitiş</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                        <DatePicker
                                            label="Bitiş"
                                            value={form.workEndDate}
                                            onChange={(next: any) => setForm((f) => ({ ...f, workEndDate: next ? format(next, "yyyy-MM-dd") : null }))}
                                            renderInput={(params: any) => (<TextField {...params} size="small" fullWidth />)}
                                        />
                                    </LocalizationProvider>
                                </Grid>

                                <Grid item xs={12} sm={6} md={2}><CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>Sigorta No</CustomFormLabel></Grid>
                                <Grid item xs={12} sm={6} md={10}>
                                    <CustomTextField size="small" fullWidth value={form.insuranceNumber}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, insuranceNumber: e.target.value }))} />
                                </Grid>

                                <Grid item xs={12}><Divider /></Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel>Cinsiyet</FormLabel>
                                    <RadioGroup row value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: Number(e.target.value) }))}>
                                        <FormControlLabel value={0} control={<Radio />} label="Erkek" />
                                        <FormControlLabel value={1} control={<Radio />} label="Kadın" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel>Ücret Tipi</FormLabel>
                                    <RadioGroup row value={form.salaryType} onChange={(e) => setForm((f) => ({ ...f, salaryType: Number(e.target.value) }))}>
                                        <FormControlLabel value={0} control={<Radio />} label="Aylık" />
                                        <FormControlLabel value={1} control={<Radio />} label="Günlük" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel>Tahakkuk</FormLabel>
                                    <RadioGroup row value={form.salaryAccrualMethod} onChange={(e) => setForm((f) => ({ ...f, salaryAccrualMethod: Number(e.target.value) }))}>
                                        <FormControlLabel value={0} control={<Radio />} label="Brüt" />
                                        <FormControlLabel value={1} control={<Radio />} label="Net" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} sm={6} md={6}>
                                    <FormLabel>Grup</FormLabel>
                                    <RadioGroup row value={form.group} onChange={(e) => setForm((f) => ({ ...f, group: Number(e.target.value) }))}>
                                        <FormControlLabel value={0} control={<Radio />} label="Emekli" />
                                        <FormControlLabel value={1} control={<Radio />} label="Normal" />
                                        <FormControlLabel value={2} control={<Radio />} label="Engelli" />
                                    </RadioGroup>
                                </Grid>
                            </Grid>
                        )}

                        {/* Step 2: Kişisel */}
                        {activeStep === 2 && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>Doğum Yeri</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomTextField size="small" fullWidth placeholder="Doğum yeri girin" value={form.birthPlace}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, birthPlace: e.target.value }))} />
                                </Grid>

                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Doğum Tarihi</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                        <DatePicker
                                            label="Doğum Tarihi"
                                            value={form.birthDate}
                                            onChange={(next: any) => setForm((f) => ({ ...f, birthDate: next ? format(next, "yyyy-MM-dd") : null }))}
                                            renderInput={(params: any) => (
                                                <TextField {...params} size="small" fullWidth error={showStepErrors && !form.birthDate} helperText={showStepErrors ? "Doğum tarihi zorunludur!" : ""} />
                                            )}
                                        />
                                    </LocalizationProvider>
                                </Grid>

                                <Grid item xs={12} sm={6} md={4}>
                                    <FormLabel>Medeni Durum</FormLabel>
                                    <RadioGroup row value={form.maritalStatus} onChange={(e) => setForm((f) => ({ ...f, maritalStatus: Number(e.target.value) }))}>
                                        <FormControlLabel value={0} control={<Radio />} label="Bekâr" />
                                        <FormControlLabel value={1} control={<Radio />} label="Evli" />
                                        <FormControlLabel value={2} control={<Radio />} label="Dul" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} sm={6} md={8}>
                                    <FormLabel>Kan Grubu</FormLabel>
                                    <RadioGroup row value={form.bloodType} onChange={(e) => setForm((f) => ({ ...f, bloodType: Number(e.target.value) }))}>
                                        <FormControlLabel value={0} control={<Radio />} label="A+" />
                                        <FormControlLabel value={1} control={<Radio />} label="A-" />
                                        <FormControlLabel value={2} control={<Radio />} label="B+" />
                                        <FormControlLabel value={3} control={<Radio />} label="B-" />
                                        <FormControlLabel value={4} control={<Radio />} label="AB+" />
                                        <FormControlLabel value={5} control={<Radio />} label="AB-" />
                                        <FormControlLabel value={6} control={<Radio />} label="O+" />
                                        <FormControlLabel value={7} control={<Radio />} label="O-" />
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12}>
                                    <FormLabel>Eğitim Durumu</FormLabel>
                                    <RadioGroup row value={form.educationStatus} onChange={(e) => setForm((f) => ({ ...f, educationStatus: Number(e.target.value) }))}>
                                        <FormControlLabel value={0} control={<Radio />} label="İlkokul" />
                                        <FormControlLabel value={1} control={<Radio />} label="Ortaokul" />
                                        <FormControlLabel value={2} control={<Radio />} label="Lise" />
                                        <FormControlLabel value={3} control={<Radio />} label="Ön Lisans" />
                                        <FormControlLabel value={4} control={<Radio />} label="Lisans" />
                                        <FormControlLabel value={5} control={<Radio />} label="Yüksek Lisans" />
                                        <FormControlLabel value={6} control={<Radio />} label="Doktora" />
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Baba Adı</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={9}>
                                    <CustomTextField size="small" fullWidth value={form.fatherName}
                                        placeholder="Baba Adı"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, fatherName: e.target.value }))} />
                                </Grid>

                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Adres</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={9}>
                                    <CustomTextField size="small" fullWidth multiline minRows={2} value={form.address}
                                        placeholder="Adres"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, address: e.target.value }))} />
                                </Grid>
                            </Grid>
                        )}

                        {/* Step 3: İletişim */}
                        {activeStep === 3 && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>IBAN</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <CustomTextField size="small" fullWidth value={form.iban}
                                        placeholder="IBAN"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, iban: e.target.value }))} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>Telefon</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <CustomTextField size="small" fullWidth value={form.telephone}
                                        placeholder="Telefon"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                                        error={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim())}
                                        helperText={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim()) ? "Mobil veya Telefon zorunlu" : ""} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Mobil</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={9}>
                                    <CustomTextField size="small" fullWidth value={form.mobile}
                                        placeholder="Mobil"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                                        error={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim())}
                                        helperText={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim()) ? "Mobil veya Telefon zorunlu" : ""} />
                                </Grid>
                            </Grid>
                        )}

                        {/* actions */}
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                            <Button variant="outlined" disabled={activeStep === 0} onClick={handlePrevStep}>Geri</Button>
                            {activeStep < 3 ? (
                                <Button variant="contained" onClick={handleNextStep}>İleri</Button>
                            ) : (
                                <Stack direction="row" spacing={1}>
                                    {editingId ? (
                                        <>
                                            <Button variant="contained" color="info" onClick={submitUpdate} disabled={loadingButton}>
                                                {loadingButton ? (<><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> İşlem yapılıyor...</>) : "Güncelle"}
                                            </Button>
                                            <Button variant="outlined" color="secondary" onClick={resetFormAndState}>İptal</Button>
                                        </>
                                    ) : (
                                        <Button variant="contained" color="success" onClick={submitCreate} disabled={loadingButton}>
                                            {loadingButton ? (<><BoltIcon sx={{ mr: 1, fontSize: 20 }} /> İşlem yapılıyor...</>) : "Kaydet"}
                                        </Button>
                                    )}
                                </Stack>
                            )}
                        </Stack>
                    </Stack>
                </LocalizationProvider>
            )}

            {alertMessage && (
                <Stack sx={{ width: "100%", mt: 2 }} spacing={2}>
                    <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                </Stack>
            )}
        </div>
    );

    const renderToolbar = (
        <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5">Personel  Listesi</Typography>
                {notifIds.length > 0 && (
                    <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                        <Chip label={`Bildirim filtresi: ${notifIds.length} id`} color="error" size="small" />
                        <IconButton aria-label="Bildirim filtresini temizle" size="small" onClick={clearNotifFilter} sx={{ p: 0.5 }} title="Filtreyi temizle">
                            <IconRefresh size={18} />
                        </IconButton>
                    </Stack>
                )}
            </Stack>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={7} md={8}>
                    <TextField label="Personel Ara" variant="outlined" fullWidth value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                        InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }} />
                </Grid>
                <Grid item xs={12} sm={5} md={4}>
                    <ToggleButtonGroup value={statusFilter} exclusive onChange={handleStatusFilterChange} fullWidth>
                        <StyledToggleButton value="all" data-value="all">Tümü</StyledToggleButton>
                        <StyledToggleButton value="active" data-value="active">Aktif</StyledToggleButton>
                        <StyledToggleButton value="inactive" data-value="inactive">Pasif</StyledToggleButton>
                    </ToggleButtonGroup>
                </Grid>
            </Grid>
        </Box>
    );

    /* -------------------- JSX -------------------- */
    return (
        <>
            {renderTopBar}

            <BlankCard>
                <Stack direction="row" spacing={2} mt={2} mr={2} justifyContent="flex-end">
                    {hasDownloadPermission && (
                        <Grid item xs={12} sm={6} md={4} sx={{ textAlign: "right" }}>
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Tüm verileri farklı formatlarda indir" : ""}>
                                <Button variant="contained" color="primary" onClick={openDownloadChooserForAll} startIcon={<IconFileDownload />}>
                                    Tümünü İndir
                                </Button>
                            </CustomTooltip>
                        </Grid>
                    )}
                </Stack>

                {renderToolbar}

                <TableContainer>
                    <Table aria-label="personnel table">
                        <TableHead style={{ background: "rgb(149 147 125 / 65%)" }}>
                            <TableRow>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "name"} direction={orderBy === "name" ? order : "asc"} onClick={() => handleRequestSort("name")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Ad Soyad</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "identityNumber"} direction={orderBy === "identityNumber" ? order : "asc"} onClick={() => handleRequestSort("identityNumber")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">TC Kimlik</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "workStartDate"} direction={orderBy === "workStartDate" ? order : "asc"} onClick={() => handleRequestSort("workStartDate")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Başlangıç</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "workEndDate"} direction={orderBy === "workEndDate" ? order : "asc"} onClick={() => handleRequestSort("workEndDate")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Bitiş</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "recordStatus"} direction={orderBy === "recordStatus" ? order : "asc"} onClick={() => handleRequestSort("recordStatus")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Durum</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell><Typography variant="h6">Detay</Typography></StyledTableCell>
                                <StyledTableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingData ? (
                                <TableRow>
                                    <StyledTableCell colSpan={7} align="center">
                                        <CircularProgress />
                                        <Typography variant="subtitle1" color="textSecondary">Personeller yükleniyor...</Typography>
                                    </StyledTableCell>
                                </TableRow>
                            ) : paginated.length > 0 ? (
                                paginated.map((row) => (
                                    <TableRow key={row.id} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                                        <StyledTableCell><Typography variant="body1">{row.name} {row.family}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{row.identityNumber}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.workStartDate)}</Typography></StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{formatDateDisplay(row.workEndDate)}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            <Chip
                                                label={statusText(row.recordStatus)}
                                                sx={{
                                                    backgroundColor:
                                                        row.recordStatus === 2 ? (t) => t.palette.primary.light :
                                                            row.recordStatus === 1 ? (t) => t.palette.error.light :
                                                                (t) => t.palette.success.light,
                                                    color:
                                                        row.recordStatus === 2 ? (t) => t.palette.primary.main :
                                                            row.recordStatus === 1 ? (t) => t.palette.error.main :
                                                                (t) => t.palette.success.main,
                                                }}
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <Button variant="outlined" size="small" startIcon={<IconEye size={16} />} onClick={() => handleClickDetails(row)}>
                                                Detay
                                            </Button>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton id={`menu-${row.id}`} aria-controls={openMenu ? "menu" : undefined} aria-haspopup="true" aria-expanded={openMenu ? "true" : undefined} onClick={(event) => handleClickMenu(event, row)}>
                                                    <IconDots width={18} />
                                                </IconButton>
                                            </CustomTooltip>
                                            <Menu id="menu" anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu} MenuListProps={{ "aria-labelledby": `menu-${selectedRowForMenu?.id}` }}>

                                                <StyledTableCell>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<IconEye size={16} />}
                                                        onClick={() => selectedRowForMenu && handleAnnualLeaveClick(selectedRowForMenu)}
                                                    >
                                                        Yıllık İzin Hesapla
                                                    </Button>
                                                </StyledTableCell>

                                                {hasEditPermission && (
                                                    <MuiMenuItem onClick={() => selectedRowForMenu && onEditRow(selectedRowForMenu)}>
                                                        <ListItemIcon><IconEdit width={18} /></ListItemIcon> Düzenle
                                                    </MuiMenuItem>
                                                )}
                                                {hasDeletePermission && (
                                                    <MuiMenuItem onClick={handleOpenDelete}>
                                                        <ListItemIcon><IconTrash width={18} /></ListItemIcon> Silmek
                                                    </MuiMenuItem>
                                                )}
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
                                                {hasDownloadPermission && (
                                                    <MuiMenuItem onClick={openDownloadChooserForRow}>
                                                        <ListItemIcon><IconFileDownload width={18} /></ListItemIcon> Bu satırı indir
                                                    </MuiMenuItem>
                                                )}
                                            </Menu>
                                        </StyledTableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <StyledTableCell colSpan={7} align="center">
                                        <Typography variant="subtitle1" color="textSecondary">Kayıt bulunamadı.</Typography>
                                    </StyledTableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={sorted.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Sayfa başına satır:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                />
            </BlankCard>

            {/* Delete Personnel */}
            <DeletePersonnel
                openModal={openDeleteModal}
                onClose={() => { setOpenDeleteModal(false); setPersonnelIdToDelete(null); getAllPersonnels(); }}
                personnelIdToDelete={personnelIdToDelete}
                onDeleteSuccess={getAllPersonnels}
                showAlert={showAlert}
            />

            {/* Download chooser */}
            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={handleDownloadChoosePDF}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={async () => {
                            // reuse existing excel export if needed; omitted for brevity
                            showAlert("Excel tablo exportu üstteki seçeneklerle mevcut.", "info");
                        }}>
                            Excel Olarak İndir
                        </Button>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={handleDownloadChoosePDFTable}>
                            PDF Olarak İndir (Tablo)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button></DialogActions>
            </Dialog>

            {/* Details dialog */}
            <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="md" fullWidth scroll="body" PaperProps={{ sx: { maxHeight: "none" } }}>
                <DialogTitle>Personel Detayı</DialogTitle>
                <DialogContent dividers sx={{ overflow: "visible" }}>
                    {selectedRowForDetails ? (
                        <Grid container spacing={2}>
                            {toPairsForPerson(selectedRowForDetails).map(([label, val], idx) => (
                                <React.Fragment key={idx}>
                                    <Grid item xs={12} sm={4}><Typography fontWeight={600}>{label}</Typography></Grid>
                                    <Grid item xs={12} sm={8}><Typography>{String(val ?? "—")}</Typography></Grid>
                                </React.Fragment>
                            ))}
                        </Grid>
                    ) : <Typography>Veri yok.</Typography>}
                </DialogContent>
                <DialogActions><Button onClick={() => setOpenDetailsDialog(false)}>Kapat</Button></DialogActions>
            </Dialog>

            {/* ------- Import Fix Modal (invalid rows only) ------- */}
            <Dialog open={invalidRows.length > 0} maxWidth="md" fullWidth>
                <DialogTitle>İçe Aktarım — Düzeltme ({invalidIndex + 1}/{invalidRows.length})</DialogTitle>
                <DialogContent dividers>
                    {invalidRows.length > 0 && (() => {
                        const r = invalidRows[invalidIndex];
                        const setR = (patch: Partial<ImportedRow>) => {
                            setInvalidRows(list => {
                                const copy = [...list];
                                copy[invalidIndex] = { ...copy[invalidIndex], ...patch };
                                return copy;
                            });
                        };
                        const errorStyle = (cond: boolean) => cond ? { borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid', borderRadius: 1 } : {};
                        const reqMissing = (n: string) => r.errors.requiredMissing.includes(n);

                        return (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Ad" value={r.name}
                                        onChange={(e) => setR({ name: e.target.value })}
                                        error={reqMissing("Ad")} helperText={reqMissing("Ad") ? "Zorunlu" : ""} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Soyad" value={r.family}
                                        onChange={(e) => setR({ family: e.target.value })}
                                        error={reqMissing("Soyad")} helperText={reqMissing("Soyad") ? "Zorunlu" : ""} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="TC Kimlik" value={r.identityNumber}
                                        onChange={(e) => setR({ identityNumber: e.target.value, errors: { ...r.errors, identityDuplicate: false } })}
                                        error={r.errors.identityDuplicate || reqMissing("TC Kimlik")}
                                        helperText={r.errors.identityDuplicate ? "TC Kimlik tekrarlı — benzersiz olmalı" : (reqMissing("TC Kimlik") ? "Zorunlu" : "")}
                                        sx={errorStyle(r.errors.identityDuplicate)} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Autocomplete
                                        options={positions}
                                        size="small"
                                        value={positions.find(p => p.id === r.positionId) ?? null}
                                        isOptionEqualToValue={(a, b) => a.id === b.id}
                                        onChange={(_, v) => setR({ positionId: v?.id ?? null, errors: { ...r.errors, positionMissing: v == null } })}
                                        getOptionLabel={(o) => o.title}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Pozisyon" placeholder="Pozisyon seçin" error={r.errors.positionMissing}
                                                helperText={r.errors.positionMissing ? "Listede yok — önce pozisyon ekleyin" : ""} />
                                        )}
                                        sx={errorStyle(r.errors.positionMissing)}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Başlangıç (yyyy-MM-dd)" value={r.workStartDate ?? ""}
                                        onChange={(e) => setR({ workStartDate: e.target.value })}
                                        error={reqMissing("Başlangıç (yyyy-MM-dd)")}
                                        helperText={reqMissing("Başlangıç (yyyy-MM-dd)") ? "Zorunlu" : ""} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Bitiş (yyyy-MM-dd)" value={r.workEndDate ?? ""} onChange={(e) => setR({ workEndDate: e.target.value })} />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Sigorta No" value={r.insuranceNumber} onChange={(e) => setR({ insuranceNumber: e.target.value })} />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormLabel>Cinsiyet</FormLabel>
                                    <RadioGroup row value={r.sex} onChange={(e) => setR({ sex: Number(e.target.value) })}>
                                        <FormControlLabel value={0} control={<Radio />} label="Erkek" />
                                        <FormControlLabel value={1} control={<Radio />} label="Kadın" />
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormLabel>Ücret Tipi</FormLabel>
                                    <RadioGroup row value={r.salaryType} onChange={(e) => setR({ salaryType: Number(e.target.value) })}>
                                        <FormControlLabel value={0} control={<Radio />} label="Aylık" />
                                        <FormControlLabel value={1} control={<Radio />} label="Günlük" />
                                    </RadioGroup>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormLabel>Tahakkuk</FormLabel>
                                    <RadioGroup row value={r.salaryAccrualMethod} onChange={(e) => setR({ salaryAccrualMethod: Number(e.target.value) })}>
                                        <FormControlLabel value={0} control={<Radio />} label="Brüt" />
                                        <FormControlLabel value={1} control={<Radio />} label="Net" />
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12} sm={12}>
                                    <FormLabel>Grup</FormLabel>
                                    <RadioGroup row value={r.group} onChange={(e) => setR({ group: Number(e.target.value) })}>
                                        <FormControlLabel value={0} control={<Radio />} label="Emekli" />
                                        <FormControlLabel value={1} control={<Radio />} label="Normal" />
                                        <FormControlLabel value={2} control={<Radio />} label="Engelli" />
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Doğum Yeri" value={r.birthPlace} onChange={(e) => setR({ birthPlace: e.target.value })} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Doğum Tarihi (yyyy-MM-dd)" value={r.birthDate ?? ""}
                                        onChange={(e) => setR({ birthDate: e.target.value })}
                                        error={reqMissing("Doğum Tarihi (yyyy-MM-dd)")}
                                        helperText={reqMissing("Doğum Tarihi (yyyy-MM-dd)") ? "Zorunlu" : ""} />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormLabel>Medeni</FormLabel>
                                    <RadioGroup row value={r.maritalStatus} onChange={(e) => setR({ maritalStatus: Number(e.target.value) })}>
                                        <FormControlLabel value={0} control={<Radio />} label="Bekâr" />
                                        <FormControlLabel value={1} control={<Radio />} label="Evli" />
                                        <FormControlLabel value={2} control={<Radio />} label="Dul" />
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormLabel>Kan Grubu</FormLabel>
                                    <RadioGroup row value={r.bloodType} onChange={(e) => setR({ bloodType: Number(e.target.value) })}>
                                        <FormControlLabel value={0} control={<Radio />} label="A+" />
                                        <FormControlLabel value={1} control={<Radio />} label="A-" />
                                        <FormControlLabel value={2} control={<Radio />} label="B+" />
                                        <FormControlLabel value={3} control={<Radio />} label="B-" />
                                        <FormControlLabel value={4} control={<Radio />} label="AB+" />
                                        <FormControlLabel value={5} control={<Radio />} label="AB-" />
                                        <FormControlLabel value={6} control={<Radio />} label="O+" />
                                        <FormControlLabel value={7} control={<Radio />} label="O-" />
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Baba Adı" value={r.fatherName}
                                        onChange={(e) => setR({ fatherName: e.target.value })}
                                        error={reqMissing("Baba Adı")} helperText={reqMissing("Baba Adı") ? "Zorunlu" : ""} />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField fullWidth size="small" label="Adres" value={r.address}
                                        onChange={(e) => setR({ address: e.target.value })}
                                        error={reqMissing("Adres")} helperText={reqMissing("Adres") ? "Zorunlu" : ""} multiline minRows={2} />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormLabel>Eğitim</FormLabel>
                                    <RadioGroup row value={r.educationStatus} onChange={(e) => setR({ educationStatus: Number(e.target.value) })}>
                                        {EDU_LABELS.map((lbl, idx) => <FormControlLabel key={idx} value={idx} control={<Radio />} label={lbl} />)}
                                    </RadioGroup>
                                </Grid>

                                <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="IBAN" value={r.iban} onChange={(e) => setR({ iban: e.target.value })} /></Grid>
                                <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Telefon" value={r.telephone} onChange={(e) => setR({ telephone: e.target.value })} /></Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Mobil" value={r.mobile}
                                        onChange={(e) => setR({ mobile: e.target.value })}
                                        error={r.errors.requiredMissing.includes("Mobil/Telefon")}
                                        helperText={r.errors.requiredMissing.includes("Mobil/Telefon") ? "Mobil veya Telefon zorunlu" : ""} />
                                </Grid>
                            </Grid>
                        );
                    })()}
                </DialogContent>
                <DialogActions sx={{ justifyContent: "space-between" }}>
                    <Button disabled={invalidIndex === 0} onClick={() => setInvalidIndex(i => Math.max(0, i - 1))}>Önceki</Button>
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" color="secondary" onClick={() => { setInvalidRows([]); getAllPersonnels(); }}>Kapat</Button>
                        <Button variant="contained" color="success" onClick={async () => {
                            const r = invalidRows[invalidIndex];
                            // recompute errors minimal
                            const req: string[] = [];
                            if (!r.name) req.push("Ad");
                            if (!r.family) req.push("Soyad");
                            if (!r.identityNumber) req.push("TC Kimlik");
                            if (!r.workStartDate) req.push("Başlangıç (yyyy-MM-dd)");
                            if (!r.birthDate) req.push("Doğum Tarihi (yyyy-MM-dd)");
                            if (!r.fatherName) req.push("Baba Adı");
                            if (!r.address) req.push("Adres");
                            if (!(r.mobile || r.telephone)) req.push("Mobil/Telefon");

                            const identityDuplicate =
                                !r.identityNumber ? false :
                                    (personnelList.some(x => x.identityNumber === r.identityNumber) ||
                                        validRows.some(v => v.identityNumber === r.identityNumber) ||
                                        invalidRows.some((iv, idx) => idx !== invalidIndex && iv.identityNumber === r.identityNumber));

                            const positionMissing = r.positionId == null;

                            if (identityDuplicate || positionMissing || req.length > 0) {
                                setInvalidRows(list => {
                                    const copy = [...list];
                                    copy[invalidIndex] = { ...r, errors: { ...r.errors, identityDuplicate, positionMissing, requiredMissing: req } };
                                    return copy;
                                });
                                showAlert("Lütfen zorunlu alanları ve hataları düzeltin.", "warning");
                                return;
                            }

                            // submit
                            try {
                                await createImportedRow(r);
                                const after = [...invalidRows];
                                after.splice(invalidIndex, 1);
                                setInvalidRows(after);
                                if (after.length === 0) {
                                    showAlert("Tüm kayıtlar başarıyla işlendi.", "success");
                                    getAllPersonnels();
                                } else {
                                    setInvalidIndex(i => Math.min(i, after.length - 1));
                                    showAlert("Kayıt eklendi, sıradaki kayda geçildi.", "success");
                                }
                            } catch (e: any) {
                                showAlert("Kayıt eklenemedi. TC tekrar mı?", "error");
                                setInvalidRows(list => {
                                    const copy = [...list];
                                    copy[invalidIndex] = { ...r, errors: { ...r.errors, identityDuplicate: true } };
                                    return copy;
                                });
                            }
                        }}>Kaydet & Sonraki</Button>
                    </Stack>
                </DialogActions>
            </Dialog>

            <Dialog open={openAnnualLeaveModal} onClose={() => setOpenAnnualLeaveModal(false)}>
                <DialogTitle>Yıllık İzin Bilgileri</DialogTitle>
                <DialogContent>
                    {loadingAnnualLeave ? (
                        <CircularProgress />
                    ) : (
                        annualLeaveData && (
                            <Stack spacing={2}>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h6">İzin Hakkı</Typography>
                                    <Chip label={annualLeaveData.official} color="primary" />
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h6">Kalan İzin</Typography>
                                    <Chip label={annualLeaveData.remaining} color="success" />
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h6">Yaş</Typography>
                                    <Chip label={annualLeaveData.age} color="info" />
                                </Box>
                                <Box display="flex" justifyContent="space-between">
                                    <Typography variant="h6">Çalışma Yılı</Typography>
                                    <Chip label={annualLeaveData.yearOfWork} color="secondary" />
                                </Box>
                            </Stack>
                        )
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAnnualLeaveModal(false)} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>


            {/* Processing loader */}
            <Backdrop open={isProcessingImport} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1000 }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress color="inherit" />
                    <Typography>İçe aktarım işleniyor, lütfen bekleyin...</Typography>
                </Stack>
            </Backdrop>
        </>
    );
};

export default ListPersonnel;
