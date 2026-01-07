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
    CardMedia,
    Paper,
    DialogContentText
} from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import BoltIcon from "@mui/icons-material/Bolt";
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
// IconFile برای نمایش مدارک جدید اضافه شد
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX, IconRefresh, IconUpload, IconFile, IconCurrencyDollar } from "@tabler/icons-react";
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
// import { ArialFont } from "src/assets/fonts/Arial";
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
    "&.Mui-selected[data-value='all']": { backgroundColor: theme.palette.primary.main, "&:hover": { backgroundColor: theme.palette.primary.dark } },
    "&.Mui-selected[data-value='active']": { backgroundColor: theme.palette.success.main, "&:hover": { backgroundColor: theme.palette.success.dark } },
    "&.Mui-selected[data-value='inactive']": { backgroundColor: theme.palette.error.main, "&:hover": { backgroundColor: theme.palette.error.dark } },
    "&:not(.Mui-selected)": { color: theme.palette.text.primary, borderColor: theme.palette.divider, "&:hover": { backgroundColor: theme.palette.action.hover } },
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
export interface Attachment { fileUrl: string; } // NEW
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
    salary: number | null;
    recordStatus: RecordStatus;
    createAt: string;
    positionId?: number | null;
    statusText?: string;
    imageSrc?: string; // URL of the image
    hasISG?: boolean; // NEW: İş Güvenliği Sertifikası
    attachments?: Attachment[]; // NEW: Ek Belgeler
}
type PositionOption = { id: number; title: string };


export interface CarConsignment {
    id: string; // شناسه امانت خودرو
    carWarhouseDetailId: number;
    plaque: string; // پلاک خودرو
    model: string;
    brand: string;
    description: string;
    attachments: Attachment[];
}


const SEX_LABELS = ["Erkek", "Kadın"] as const;
const SALARY_TYPE_LABELS = ["Aylık", "Günlük"] as const;
const ACCRUAL_LABELS = ["Brüt", "Net"] as const;
const GROUP_LABELS = ["Emekli", "Normal", "Engelli"] as const;
const MARITAL_LABELS = ["Bekâr", "Evli", "Dul"] as const;
const BLOOD_LABELS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const EDU_LABELS = ["İlkokul", "Ortaokul", "Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora"] as const;

const statusText = (s?: number) => (s === 0 ? "Aktif" : s === 1 ? "Pasif" : "Silindi");

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
    "Ad", "Soyad", "TC Kimlik", "Pozisyon",
    "Başlangıç (yyyy-MM-dd)",
    "Sigorta No", "Cinsiyet (Erkek|Kadın|0|1)", "Ücret Tipi (Aylık|Günlük|0|1)",
    "Tahakkuk (Brüt|Net|0|1)", "Grup (Emekli|Normal|Engelli|0|1|2)", "Doğum Yeri",
    "Doğum Tarihi (yyyy-MM-dd)", "Medeni (Bekâr|Evli|Dul|0|1|2)", "Kan Grubu (A+|A-|B+|B-|AB+|AB-|O+|O-|0..7)",
    "Baba Adı", "Adres", "Eğitim (İlkokul|Ortaokul|Lise|Ön Lisans|Lisans|Yüksek Lisans|Doktora|0..6)",
    "Maaş (Sadece Sayısal)", // ✅ جدید: ستون حقوق اضافه شد
    "IBAN", "Telefon", "Cep Telefon",
    "ISG (Var|Yok|True|False|0|1)", // YENİ
] as const;

type ImportedRow = {
    _rowIndex: number;
    name: string; family: string; identityNumber: string;
    positionText: string; positionId: number | null;
    workStartDate: string | null; workEndDate: string | null; insuranceNumber: string;
    sex: number; salaryType: number; salaryAccrualMethod: number; group: number;
    birthPlace: string; birthDate: string | null; maritalStatus: number; bloodType: number;
    fatherName: string; address: string; educationStatus: number; iban: string; telephone: string; mobile: string;
    hasISG: boolean; salary: number | null;


    errors: {
        identityDuplicate: boolean; positionMissing: boolean;
        requiredMissing: string[]; invalidDate: string[];
    };
};

const DEFAULT_IMAGE_URL = imagedefault;

const getFullImageUrl = (fileUrl: string | undefined): string => {
    if (!fileUrl || fileUrl === "N/A" || fileUrl.startsWith('data:')) {
        return DEFAULT_IMAGE_URL;
    }
    return `${server.urldpwonload}${fileUrl}`;
};

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

const convertUrlToBase64 = async (imageUrl: string, authToken: string): Promise<string | null> => {
    try {
        if (!imageUrl || imageUrl === DEFAULT_IMAGE_URL) return null;
        const apiUrl = `${server.baseurl}${server.baseinfo}to-base64`;

        const response = await axios.get(apiUrl, {
            params: { url: imageUrl }, // ارسال URL به عنوان پارامتر کوئری
            headers: { Authorization: `Bearer ${authToken}` },
        });
        if (response.data && response.data.data && response.data.data.base64) {
            return response.data.data.base64.startsWith('data:')
                ? response.data.data.base64
                : `data:image/jpeg;base64,${response.data.data.base64}`;
        }
        return null;
    } catch (error) {
        console.error("Base64 conversion failed:", error);
        return null;
    }
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
    // const { allowedOperations } = useAuth();

    // const hasCreatePermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "Eklemek"), [allowedOperations]);
    // const hasEditPermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "Düzenlemek"), [allowedOperations]);
    // const hasDeletePermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "Silmek"), [allowedOperations]);
    // const hasDownloadPermission = useMemo(() => allowedOperations.some((op) => op.systemOperationName === "İndirmek ve Yazdırmak"), [allowedOperations]);


    const { menuItems, allowedOperations } = useAuth();
    const findMenuByHref = (items: any[], path: string): any => {
        for (const item of items) {
            // اگر خود آیتم تطبیق داشت
            if (item.href === path) return item;

            // اگر آیتم فرزند داشت، داخل فرزندان جستجو کن
            if (item.children && item.children.length > 0) {
                const found = findMenuByHref(item.children, path);
                if (found) return found;
            }
        }
        return null;
    };

    // ۲. استفاده از تابع برای پیدا کردن منوی فعلی
    const currentMenu = useMemo(() => {
        debugger
        return findMenuByHref(menuItems, location.pathname);
    }, [menuItems, location.pathname]);

    // ۳. استخراج ID عملیات‌ها (با اطمینان از وجود id)
    const currentMenuOpIds = useMemo(() => {
        // اگر منو یا عملیات‌های آن وجود نداشت، آرایه خالی برگردان
        if (!currentMenu || !currentMenu.menuOperations) return [];

        return currentMenu.menuOperations.map((op: any) => {
            // با توجه به دیتای API شما، ID اصلی عملیات در این سطح است
            return String(op.id);
        });
    }, [currentMenu]);

    // ۴. تابع نهایی بررسی دسترسی
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


    /* alerts */
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");
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
    const [openAttachmentsModal, setOpenAttachmentsModal] = useState(false); // NEW
    const [attachmentsToView, setAttachmentsToView] = useState<Attachment[]>([]);
    // const [rowForAttachments, setRowForAttachments] = useState<PersonnelType | null>(null); // NEW

    const [openPersonnelFilesModal, setOpenPersonnelFilesModal] = useState(false);
    const [personnelFilesToDownload, setPersonnelFilesToDownload] = useState<Attachment[]>([]);
    const [selectedPersonnelForFiles, setSelectedPersonnelForFiles] = useState<PersonnelType | null>(null);

    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [selectedRowForDetails, setSelectedRowForDetails] = useState<PersonnelType | null>(null);
    const [openEndCooperationModal, setOpenEndCooperationModal] = useState(false); // NEW
    const [personnelToEndCooperation, setPersonnelToEndCooperation] = useState<PersonnelType | null>(null); // NEW
    const [endDate, setEndDate] = useState<string | null>(null); // NEW

    /* -------- IMPORT state -------- */
    const [isProcessingImport, setIsProcessingImport] = useState(false);
    const [validRows, setValidRows] = useState<ImportedRow[]>([]);
    const [invalidRows, setInvalidRows] = useState<ImportedRow[]>([]);
    const [invalidIndex, setInvalidIndex] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null); // for excel import

    const [openAnnualLeaveModal, setOpenAnnualLeaveModal] = useState(false);
    const [annualLeaveData, setAnnualLeaveData] = useState<any>(null);
    const [loadingAnnualLeave, setLoadingAnnualLeave] = useState(false);

    const [personnelForAnnualLeave, setPersonnelForAnnualLeave] = useState<PersonnelType | null>(null); // NEW/UPDATED State

    /* -------- IMAGE & ATTACHMENTS state -------- */
    const profileImageInputRef = useRef<HTMLInputElement>(null); // NEW: for profile picture
    const attachmentsInputRef = useRef<HTMLInputElement>(null); // NEW: for attachments
    const [profileRawFile, setProfileRawFile] = useState<File | null>(null); // NEW: raw file for upload
    const [attachmentsRawFiles, setAttachmentsRawFiles] = useState<File[]>([]); // NEW: raw files for upload
    const [profileImageUrl, setProfileImageUrl] = useState<string>(DEFAULT_IMAGE_URL); // for display


    const [openActiveConsignmentsModal, setOpenActiveConsignmentsModal] = useState(false); // NEW
    const [activeConsignments, setActiveConsignments] = useState<any[]>([]);
    const [activeCarConsignment, setActiveCarConsignment] = useState<any[]>([]);;


    const nameInputRef = useRef<HTMLInputElement>(null);

    const [activeConsignmentImageUrls, setActiveConsignmentImageUrls] = useState<string[]>([]);
    const [openImageSlider, setOpenImageSlider] = useState(false);


    const [openSalaryEditModal, setOpenSalaryEditModal] = useState(false);
    const [personnelToUpdateSalary, setPersonnelToUpdateSalary] = useState<PersonnelType | null>(null);
    const [newSalary, setNewSalary] = useState<number | null>(null);
    const [loadingSalaryUpdate, setLoadingSalaryUpdate] = useState(false);


    const initialForm: PersonnelType = {
        id: 0, name: "", family: "", position: { id: -1, title: "—" }, identityNumber: "",
        workStartDate: null, workEndDate: null, insuranceNumber: "", sex: 0,
        salaryType: 0, salaryAccrualMethod: 0, group: 0, birthPlace: "", birthDate: null,
        maritalStatus: 0, fatherName: "", bloodType: 0, address: "",
        educationStatus: EducationStatus.Ilkokul, iban: "", telephone: "", mobile: "",
        salary: null,
        recordStatus: 0, createAt: "", positionId: null, statusText: undefined,
        imageSrc: undefined, // NEW
        hasISG: false, // NEW
        attachments: [], // NEW
    };
    const [form, setForm] = useState<PersonnelType>(initialForm);

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
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
                id: Number(x.id), name: x.name, family: x.family, identityNumber: x.identityNumber,
                workStartDate: x.workStartDate ? String(x.workStartDate).slice(0, 10) : null,
                workEndDate: x.workEndDate ? String(x.workEndDate).slice(0, 10) : null,
                insuranceNumber: x.insuranceNumber, sex: Number(x.sex ?? 0),
                salaryType: Number(x.salaryType ?? 0), salaryAccrualMethod: Number(x.salaryAccrualMethod ?? 0),
                group: Number(x.group ?? 0), birthPlace: String(x.birthPlace ?? ""),
                birthDate: x.birthDate ? String(x.birthDate).slice(0, 10) : null,
                maritalStatus: Number(x.maritalStatus ?? 0), fatherName: x.fatherName ?? "",
                bloodType: Number(x.bloodType ?? 0), address: x.address ?? "",
                educationStatus: Number(x.educationStatus ?? 0), iban: x.iban ?? "",
                telephone: x.telephone ?? "", mobile: x.mobile ?? "",
                recordStatus: Number(x.recordStatus ?? 0) as RecordStatus,
                createAt: x.createAt ?? "", position: x.position ?? { id: -1, title: "Pozisyon yok" },
                statusText: statusText(x.recordStatus),
                imageSrc: x.imageSrc ?? undefined, // NEW
                hasISG: x.hasISG ?? false, // NEW
                salary: x.salary ?? null,
                attachments: x.attachments ?? [], // NEW
            }));
            setPersonnelList(list);
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
    };
    useEffect(() => { getAllPersonnels(); getAllPositions(); }, []);


    // NEW: Handle Image Change for Profile (sets raw file)
    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setProfileRawFile(file || null);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setProfileImageUrl(DEFAULT_IMAGE_URL);
        }
    }, []);

    // NEW: Handle Attachments Change (sets raw files)
    const handleAttachmentsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAttachmentsRawFiles(files);
    }, []);


    const handleAnnualLeaveClick = async (row: PersonnelType) => {
        // 1. ذخیره اطلاعات هویتی قبل از فراخوانی API
        setPersonnelForAnnualLeave(row);
        handleCloseMenu(); // منو را می‌بندد و selectedRowForMenu را پاک می‌کند

        setLoadingAnnualLeave(true);
        setAnnualLeaveData(null); // پاک کردن داده‌های قبلی

        try {
            const response = await axios.get(`${server.baseurl}${server.hr}get-remaining-leave-by-personnelId/${row.id}`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });

            if (response.data.success) {
                setAnnualLeaveData(response.data.data);
                setOpenAnnualLeaveModal(true);
            } else {
                showAlert("Veri alınırken bir hata oluştu.", "error");
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingAnnualLeave(false);
        }
    };

    // تابع بستن Modal:
    const handleCloseAnnualLeaveModal = () => {
        setOpenAnnualLeaveModal(false);
        setPersonnelForAnnualLeave(null); // پاکسازی State موقت
        setAnnualLeaveData(null);
    }

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
                !q || (p.name ?? "").toLowerCase().includes(q) || (p.family ?? "").toLowerCase().includes(q) ||
                `${(p.name ?? "").toLowerCase()} ${(p.family ?? "").toLowerCase()}`.includes(q) ||
                (p.identityNumber ?? "").toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && p.recordStatus === 0) ||
                (statusFilter === "inactive" && p.recordStatus === 1);
            const matchesNotifIds = !hasIdsFilter || idsSet.has(Number(p.id));
            return matchesSearch && matchesStatus && matchesNotifIds;
        });
    }, [personnelList, searchTerm, statusFilter, hasIdsFilter, idsSet]);

    const sorted = useMemo(() => stableSort(filtered, getComparator(order, orderBy)), [filtered, order, orderBy]);
    const paginated = useMemo(() => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sorted, page, rowsPerPage]);

    useEffect(() => { const timer = setTimeout(() => setIsBlinking(false), 5000); return () => clearTimeout(timer); }, []);

    /* -------- edit / delete / details -------- */
    const handleClickMenu = (e: React.MouseEvent<HTMLButtonElement>, row: PersonnelType) => { setAnchorEl(e.currentTarget); setSelectedRowForMenu(row); };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    const onEditRow = (row: PersonnelType) => {
        setForm({ ...row });
        setEditingId(row.id);
        setIsFormVisible(true);
        setActiveStep(0);
        setShowStepErrors(false);
        setForm(prevForm => ({ ...prevForm, positionId: row.position?.id ?? null }));

        // Resim/dosya state'lerini sıfırla/doldur
        setProfileRawFile(null);
        setProfileImageUrl(getFullImageUrl(row.imageSrc));
        setAttachmentsRawFiles([]);

        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
        }, 100);
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
        setProfileImageUrl(DEFAULT_IMAGE_URL);
        setProfileRawFile(null);
        setAttachmentsRawFiles([]);
    };

    // isStepValid: WorkEndDate kaldırıldı
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

    // NEW: File Upload Logic integrated into submitCreate/submitUpdate
    const submitCreate = async () => {
        if (!isStepValid(3)) { setShowStepErrors(true); return; }
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        // 1. Upload Profile Image
        let profileImageUrlToSend: string | undefined = undefined;
        if (profileRawFile) {
            const uploadedUrls = await uploadFiles([profileRawFile], authToken, showAlert);
            if (!uploadedUrls) { setLoadingButton(false); return; }
            profileImageUrlToSend = uploadedUrls[0];
        }

        // 2. Upload Attachments
        let attachmentPayload: Attachment[] = [];
        if (attachmentsRawFiles.length > 0) {
            const uploadedUrls = await uploadFiles(attachmentsRawFiles, authToken, showAlert);
            if (!uploadedUrls) { setLoadingButton(false); return; }
            attachmentPayload = uploadedUrls.map(url => ({ fileUrl: url }));
        }

        try {
            const payload = {
                name: form.name, family: form.family, identityNumber: form.identityNumber,
                workStartDate: form.workStartDate,
                workEndDate: null, // YENİ KURAL: Her zaman null gönderilir
                insuranceNumber: form.insuranceNumber, sex: form.sex,
                salaryType: form.salaryType, salaryAccrualMethod: form.salaryAccrualMethod,
                group: form.group, birthPlace: form.birthPlace, birthDate: form.birthDate,
                maritalStatus: form.maritalStatus, fatherName: form.fatherName,
                bloodType: form.bloodType, address: form.address, educationStatus: form.educationStatus,
                iban: form.iban, telephone: form.telephone, mobile: form.mobile,
                positionId: Number(form.positionId) ?? null,
                imageSrc: profileImageUrlToSend, // NEW
                hasISG: form.hasISG ?? false, // NEW
                attachments: attachmentPayload, // NEW
                salary: form.salary ? Number(form.salary) : null,
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { setLoadingButton(false); }
    };

    const submitUpdate = async () => {
        if (editingId == null) return;
        if (!isStepValid(3)) { setShowStepErrors(true); return; }
        if (!authToken) { navigate("/"); return; }
        setLoadingButton(true);

        // 1. Upload Profile Image (if raw file exists)
        let profileImageUrlToSend: string | undefined = undefined;
        if (profileRawFile) {
            const uploadedUrls = await uploadFiles([profileRawFile], authToken, showAlert);
            if (!uploadedUrls) { setLoadingButton(false); return; }
            profileImageUrlToSend = uploadedUrls[0];
        } else {
            // Keep existing image URL if not changed and not the default placeholder
            profileImageUrlToSend = (profileImageUrl !== DEFAULT_IMAGE_URL ? form.imageSrc : undefined);
        }

        // 2. Upload Attachments (new files)
        let attachmentPayload: Attachment[] = form.attachments ?? [];
        if (attachmentsRawFiles.length > 0) {
            const uploadedUrls = await uploadFiles(attachmentsRawFiles, authToken, showAlert);
            if (!uploadedUrls) { setLoadingButton(false); return; }
            // Yeni yüklenen dosyalar, mevcut dosyalara eklenmelidir veya onları değiştirmelidir.
            // Bu örnekte, yeni yüklenenler mevcut olanların YERİNE geçer varsayılır (API davranışına bağlı olarak değişebilir)
            attachmentPayload = uploadedUrls.map(url => ({ fileUrl: url }));
        }
        debugger
        try {
            const payload = {
                id: editingId,
                name: form.name, family: form.family, identityNumber: form.identityNumber,
                workStartDate: form.workStartDate,
                workEndDate: form.workEndDate, // WorkEndDate mevcutsa veya sonlandırmada set edilmişse gönderilir
                insuranceNumber: form.insuranceNumber, sex: form.sex,
                salaryType: form.salaryType, salaryAccrualMethod: form.salaryAccrualMethod,
                group: form.group, birthPlace: form.birthPlace, birthDate: form.birthDate,
                maritalStatus: form.maritalStatus, fatherName: form.fatherName,
                bloodType: form.bloodType, address: form.address, educationStatus: form.educationStatus,
                iban: form.iban, telephone: form.telephone, mobile: form.mobile,
                positionId: Number(form.positionId) ?? null,
                imageSrc: profileImageUrlToSend, // NEW LOGIC
                hasISG: form.hasISG ?? false, // NEW
                attachments: attachmentPayload, // NEW
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
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
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally { handleCloseMenu(); }
    };

    // NEW: Submit End Cooperation
    const submitEndCooperation = async () => {
        if (!personnelToEndCooperation || !endDate) return;
        if (!authToken) { navigate("/"); return; }

        setLoadingButton(true);
        debugger

        try {
            const payload = {
                id: personnelToEndCooperation.id,
                workEndDate: endDate,
            };
            const res = await axios.put(`${server.baseurl}${server.hr}update-personnel`, payload, {
                headers: { Authorization: `Bearer ${authToken}` },
            });

            if (res.data?.httpStatusCode === 200) {
                showAlert("İş birliği başarıyla sonlandırıldı.", "success");
                setOpenEndCooperationModal(false);
                getAllPersonnels();
            } else {
                showAlert(res.data?.message || "İş birliği sonlandırılamadı.", "error");
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Bu kayıt, başka bir işlemde için silinemez veya düzenlenemez.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Giriş belgesi güncellenirken bir hata oluştu.', 'error');
        } finally {
            setLoadingButton(false);
        }
    };


    const addPdfHeader = (doc: jsPDF, title: string) => {

        const docAny = doc as any;
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 35; // کمی کوچک‌تر برای ظرافت بیشتر
        const logoHeight = 18;
        const margin = 15;
        const logoX = pageWidth - logoWidth - margin; // لوگو سمت راست

        try {
            doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
        } catch (e) {
            console.error("Logo yüklenemedi", e);
        }

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 25, { align: 'center' }); // عنوان وسط

        doc.setFontSize(10);
        doc.setFont('NotoSans', 'bold');
        doc.text(`Rapor Tarihi:`, 15, 35);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 35);

        // اضافه کردن خط جداکننده خاکستری طبق استاندارد جدید
        // doc.setDrawColor(200, 200, 200);
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

        let footerY = pageHeight - 40;
        companyInfo.forEach(line => {
            doc.text(line, pageWidth / 2, footerY, { align: 'center' });
            footerY += 12;
        });

        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
        doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };

    // const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
    //     if (priceInput === null || priceInput === undefined) {
    //         return '₺0';
    //     }
    //     const cleanedString = String(priceInput).replace(/[$,]/g, '');
    //     const numericValue = parseFloat(cleanedString);
    //     if (isNaN(numericValue)) {
    //         return '₺0';
    //     }
    //     const formattedPrice = numericValue.toLocaleString('tr-TR', {
    //         style: 'currency',
    //         currency: 'TRY',
    //         minimumFractionDigits: 0,
    //         maximumFractionDigits: 0
    //     });
    //     return formattedPrice;
    // };
    const cleanAndFormatPrice = (priceInput: string | number | null | undefined): string => {
        if (priceInput === null || priceInput === undefined) {
            return '₺0'; // تغییر از $0 به ₺0
        }
        const cleanedString = String(priceInput).replace(/[₺$,]/g, ''); // حذف علامت لیر قدیمی یا دلار
        const numericValue = parseFloat(cleanedString);
        if (isNaN(numericValue)) {
            return '₺0';
        }
        const formattedPrice = numericValue.toLocaleString('tr-TR', {
            style: 'currency',
            currency: 'TRY', // تنظیم روی لیر ترکیه
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        return formattedPrice;
    };
    const toPairsForPerson = (p: PersonnelType): Array<[string, string]> => {
        const positionTitle = positions.find(x => x.id === (Number(p.position?.id) ?? -1))?.title || "—";

        return [
            ["Ad", p.name || "—"],
            ["Soyad", p.family || "—"],
            ["TC Kimlik", p.identityNumber || "—"],
            ["Pozisyon", positionTitle],
            ["İş Güvenliği (ISG)", p.hasISG ? "Var" : "Yok"], // NEW
            ["Başlangıç", formatDateDisplay(p.workStartDate)],
            ["Bitiş", formatDateDisplay(p.workEndDate)], // Bitiş tarihi raporda gösterilir
            ["Maaş", cleanAndFormatPrice(p.salary)],
            ["Sigorta No", p.insuranceNumber || "—"],
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
            ["Cep Telefon", p.mobile || "—"],
            ["Durum", statusText(p.recordStatus)],
            ["Oluşturulma", formatDateDisplay(p.createAt?.slice(0, 10) || null)],
        ];
    };

    // const pdfForRows = (rows: PersonnelType[], filename: string) => {
    //     const doc = new jsPDF("p", "pt", "a4");
    //     (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
    //     (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    //     doc.setFont("NotoSans", "normal");

    //     const headerSpace = 100; // فضای رزرو شده برای هدر (100pt)
    //     const sideMargin = 40;
    //     const bottomMargin = 70; // فضای رزرو شده برای فوتر (70pt)
    //     const imageSize = 100;    // اندازه تصویر (عرض و ارتفاع)
    //     const imageStartX = sideMargin;
    //     const imageStartY = headerSpace + 10;

    //     rows.forEach((p, idx) => {
    //         if (idx > 0) doc.addPage();

    //         const pairs = toPairsForPerson(p);
    //         const img = getFullImageUrl(p.imageSrc);
    //         let startY = headerSpace;
    //         if (img && img !== DEFAULT_IMAGE_URL && img.startsWith('data:')) {
    //             try {
    //                 doc.addImage(img, 'PNG', imageStartX, imageStartY, imageSize, imageSize, undefined, 'FAST');
    //                 startY = imageStartY + imageSize + 20;
    //             } catch (error) {
    //                 startY = headerSpace;
    //             }
    //         } else {
    //             startY = imageStartY + 10;
    //         }

    //         autoTable((doc as any), {
    //             startY: startY,
    //             head: [["Alan", "Değer"]],
    //             body: pairs,
    //             theme: "grid",
    //             styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 4, overflow: "linebreak" },
    //             headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: "NotoSans", fontStyle: "normal" },
    //             columnStyles: { 0: { cellWidth: 150, font: "NotoSans", fontStyle: "normal" }, 1: { cellWidth: "auto" } },
    //             margin: { top: headerSpace, bottom: bottomMargin, left: sideMargin, right: sideMargin },

    //             didDrawPage: (_data: any) => {
    //                 addPdfHeader(doc, "Personel Detay Raporu");
    //                 addPdfFooter(doc);
    //             },
    //             showHead: "everyPage",
    //         });
    //     });

    //     doc.save(filename);
    // };

    const pdfForRows = async (rows: PersonnelType[], filename: string) => {
        // 1. تنظیمات اولیه PDF
        const doc = new jsPDF("p", "pt", "a4");

        // تنظیمات فونت (مطابق با کدهای قبلی شما)
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");

        const headerSpace = 100;
        const sideMargin = 40;
        const bottomMargin = 70;
        const imageSize = 100; // قطر دایره
        const radius = imageSize / 2; // شعاع
        const pageWidth = doc.internal.pageSize.getWidth();
        const imageX = (pageWidth / 2) - radius; // محاسبه وسط صفحه
        const imageY = 70;
        const token = authToken || "";

        // پیمایش روی ردیف‌ها (پرسنل)
        for (const [idx, p] of rows.entries()) {
            if (idx > 0) doc.addPage();

            const pairs = toPairsForPerson(p); // جزئیات پرسنل
            const rawImageUrl = getFullImageUrl(p.imageSrc);
            let base64Image = null;
            let startY = headerSpace;

            if (rawImageUrl !== DEFAULT_IMAGE_URL) {
                if (rawImageUrl.startsWith('data:')) {
                    base64Image = rawImageUrl;
                } else {
                    base64Image = await convertUrlToBase64(rawImageUrl, token);
                }
            }
            if (base64Image) {
                try {
                    doc.addImage(base64Image, 'PNG', imageX, imageY, imageSize, imageSize, undefined, 'FAST');
                    startY = imageY + imageSize + 20;
                } catch (error) {
                    console.error("PDF Image add error:", error);
                    startY = imageY + 10;
                }
            } else {
                // اگر تصویری وجود نداشت یا Base64 نشد
                startY = imageY + 10;
            }

            // 3. افزودن جدول جزئیات
            autoTable((doc as any), {
                startY: startY,
                head: [["Alan", "Değer"]],
                body: pairs,
                theme: "grid",
                styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 4, overflow: "linebreak" },
                headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: "NotoSans", fontStyle: "normal" },
                columnStyles: { 0: { cellWidth: 150, font: "NotoSans", fontStyle: "normal" }, 1: { cellWidth: "auto" } },
                margin: { top: headerSpace, bottom: bottomMargin, left: sideMargin, right: sideMargin },

                // هوک برای رسم هدر و فوتر در هر صفحه
                didDrawPage: (_data: any) => {
                    addPdfHeader(doc, "Personel Detay Raporu");
                    addPdfFooter(doc);
                },
                showHead: "everyPage",
            });
        }

        doc.save(filename);
    };


    const handleDownloadChoosePDF = async () => {
        setOpenDownloadModal(false);
        try {
            if (downloadScope === "all") {
                await pdfForRows(sorted, "Personel_Detay_Raporu.pdf");
            } else if (rowForDownload) {
                const fileSlug = `${rowForDownload.name || ""}_${rowForDownload.family || ""}`.trim().replace(/\s+/g, "_");
                await pdfForRows([rowForDownload], `Personel_Detay_${fileSlug || rowForDownload.id}.pdf`);
            }
            showAlert('PDF başarıyla oluşturuldu.', 'success');
        } catch (e) {
            showAlert('PDF oluşturulurken bir hata oluştu.', 'error');
            console.error("PDF generation error:", e);
        }
    };


    const handleDownloadChoosePDFTable = () => {
        const doc = new jsPDF("landscape", "pt", "a4");

        // (Aynı font ayarları)
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");

        const topMargin = 100, sideMargin = 40, bottomMargin = 70;
        const rows = paginated;

        // 1. ISG başlığı eklendi
        const headerRow = [
            "Ad", "Soyad", "TC Kimlik", "Başlangıç", "Bitiş", "Pozisyon",
            "Cinsiyet", "Ücret Tipi", "Tahakkuk", "Grup", "Doğum Tarihi",
            "Medeni Durum", "Baba Adı", "Eğitim", "ISG", // <--- NEW: ISG eklendi
            "Telefon", "Cep Telefon"
        ];

        const allData: any[] = [];
        rows.forEach((p) => {
            const row = [
                p.name || "—",
                p.family || "—",
                p.identityNumber || "—",
                formatDateDisplay(p.workStartDate),
                formatDateDisplay(p.workEndDate),
                positions.find(x => x.id === (Number(p.position.id) ?? -1))?.title || "—",
                SEX_LABELS[p.sex] ?? "—",
                SALARY_TYPE_LABELS[p.salaryType] ?? "—",
                ACCRUAL_LABELS[p.salaryAccrualMethod] ?? "—",
                GROUP_LABELS[p.group] ?? "—",
                formatDateDisplay(p.birthDate),
                MARITAL_LABELS[p.maritalStatus] ?? "—",
                p.fatherName || "—",
                EDU_LABELS[p.educationStatus] ?? "—",
                p.hasISG ? "Var" : "Yok", // <--- NEW: ISG değeri eklendi
                p.telephone || "—",
                p.mobile || "—"
            ];
            allData.push(row);
        });

        // AutoTable oluşturma
        autoTable(doc, {
            startY: topMargin,
            head: [headerRow],
            body: allData,
            theme: "grid",
            styles: { font: "NotoSans", fontStyle: "normal", fontSize: 8, cellPadding: 3, overflow: "linebreak" },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], font: "NotoSans", fontStyle: "normal" },
            margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin },
            // didDrawPage hook'u ile her sayfaya başlık ve altbilgi eklenir.
            didDrawPage: () => { addPdfHeader(doc, "Personel Detay Raporu"); addPdfFooter(doc); },
            showHead: "everyPage",
        });

        doc.save("Personel_Tablo_Raporu.pdf");
    };

    const handleDownloadTemplate = async () => {
        const wb = new Excel.Workbook();
        const ws = wb.addWorksheet("Personel_Sablonu", { views: [{ rightToLeft: false }] });
        ws.addRow([...TEMPLATE_HEADERS]);
        ws.getRow(1).font = { name: "NotoSans", bold: true };
        ws.columns = [
            { width: 18 }, { width: 18 }, { width: 16 }, { width: 24 },
            { width: 16 }, { width: 16 }, { width: 16 }, { width: 12 },
            { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 },
            { width: 16 }, { width: 16 }, { width: 28 }, { width: 18 },
            { width: 16 }, // ✅ عرض ستون Maaş
            { width: 22 }, { width: 16 }, { width: 16 }, { width: 16 }, // IBAN, Telefon, Mobil, ISG (عرض‌ها کمی تغییر کرد)
        ];
        ws.addRow([
            "Ali", "Yılmaz", "12345678901", "Yazılım Uzmanı",
            "2023-01-10",
            "SGK-0001", "Erkek", "Aylık", "Brüt", "Normal", "İzmir",
            "1992-05-15", "Evli", "A+", "Mehmet", "İzmir/...", "Lisans",
            // ✅ نمونه داده برای Maaş
            "15000",
            "TR00 0000 0000 0000 0000 0000 00", "0232...", "05..",
            "Var"
        ]);
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), "Personel_Sablonu.xlsx");
    };

    const pdfForAnnualLeave = (p: PersonnelType, leaveData: any, filename: string) => {
        const doc = new jsPDF("p", "pt", "a4");

        // تنظیمات فونت
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");

        addPdfHeader(doc, "Yıllık İzin Detay Raporu");

        // آماده‌سازی رشته Çalışma Yılı
        const workDurationText = leaveData.personnelWorkYearsAndMonths
            ? `${leaveData.personnelWorkYearsAndMonths.years} Yıl, ${leaveData.personnelWorkYearsAndMonths.months} Ay, ${leaveData.personnelWorkYearsAndMonths.days} Gün`
            : `${leaveData.yearOfWork || 0} Yıl`;

        const leavePairs: Array<[string, string]> = [
            ["Adı Soyadı", `${p.name || "—"} ${p.family || "—"}`],
            ["Başlangıç Tarihi", formatDateDisplay(p.workStartDate)],
            ["Bitiش Tarihi", formatDateDisplay(p.workEndDate)],
            ["Yaş", leaveData.age ? String(leaveData.age) : "—"],
            ["Çalışma Süresi", workDurationText], // تغییر نام به Çalışma Süresi برای دقت بیشتر یا همان Çalışma Yılı
            ["Resmi İzin Hakkı", leaveData.official ? `${leaveData.official} Gün` : "—"],
            ["Kalan İzin Günü", leaveData.remaining ? `${leaveData.remaining} Gün` : "—"],
        ];

        autoTable((doc as any), {
            startY: 120,
            head: [["Alan", "Değer"]],
            body: leavePairs,
            theme: "grid",
            styles: { font: "NotoSans", fontSize: 10, cellPadding: 8 },
            headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0] },
            columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: "auto" } },
            didDrawPage: () => {
                addPdfFooter(doc);
            },
        });

        doc.save(filename);
    };
    /* ---------------- Import Excel (updated for new fields) ---------------- */
    const getByTitle = (row: Excel.Row, map: Map<string, number>, title: string) => String(row.getCell(map.get(title) ?? 0).value ?? "").trim();
    const normalizeTr = (s: string) => (
        s
            .toLowerCase()
            .replace(/i̇/g, "i")
            .replace(/ı/g, "i")
            .replace(/ğ/g, "g")
            .replace(/ç/g, "c")
            .replace(/ş/g, "s")
            .replace(/ö/g, "o")
            .replace(/ü/g, "u")
            .trim()
    );

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
        // Date object'in Excel تاریخ‌ها را به عنوان عدد برمی‌گرداند.
        let d;
        if (typeof s === 'number') {
            // Excel date handling (if needed, adjust based on your ExcelJS usage context)
            d = new Date(Math.round((s - 25569) * 86400 * 1000));
        } else {
            d = new Date(s);
        }

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

                // Get Fields (Index mapping is critical here after removing 'Bitiş')
                const map = headerMap; // using existing map for brevity
                const name = getByTitle(row, map, "Ad");
                const family = getByTitle(row, map, "Soyad");
                const identityNumber = getByTitle(row, map, "TC Kimlik");
                const positionText = getByTitle(row, map, "Pozisyon");
                const workStartDate = parseIso(getByTitle(row, map, "Başlangıç (yyyy-MM-dd)"));
                const insuranceNumber = getByTitle(row, map, "Sigorta No");
                const sex = tryMapRadioFromText(getByTitle(row, map, "Cinsiyet (Erkek|Kadın|0|1)"), SEX_LABELS as unknown as string[], 0);
                const salaryType = tryMapRadioFromText(getByTitle(row, map, "Ücret Tipi (Aylık|Günlük|0|1)"), SALARY_TYPE_LABELS as unknown as string[], 0);
                const salaryAccrualMethod = tryMapRadioFromText(getByTitle(row, map, "Tahakkuk (Brüt|Net|0|1)"), ACCRUAL_LABELS as unknown as string[], 0);
                const group = tryMapRadioFromText(getByTitle(row, map, "Grup (Emekli|Normal|Engelli|0|1|2)"), GROUP_LABELS as unknown as string[], 1);
                const birthPlace = getByTitle(row, map, "Doğum Yeri");
                const birthDate = parseIso(getByTitle(row, map, "Doğum Tarihi (yyyy-MM-dd)"));
                const maritalStatus = tryMapRadioFromText(getByTitle(row, map, "Medeni (Bekâr|Evli|Dul|0|1|2)"), MARITAL_LABELS as unknown as string[], 0);
                const bloodType = tryMapRadioFromText(getByTitle(row, map, "Kan Grubu (A+|A-|B+|B-|AB+|AB-|O+|O-|0..7)"), BLOOD_LABELS as unknown as string[], 0);
                const fatherName = getByTitle(row, map, "Baba Adı");
                const address = getByTitle(row, map, "Adres");
                const educationStatus = tryMapRadioFromText(getByTitle(row, map, "Eğitim (İlkokul|Ortaokul|Lise|Ön Lisans|Lisans|Yüksek Lisans|Doktora|0..6)"), EDU_LABELS as unknown as string[], 4);
                const iban = getByTitle(row, map, "IBAN");
                const telephone = getByTitle(row, map, "Telefon");
                const mobile = getByTitle(row, map, "Cep Telefon");
                const salaryRaw = getByTitle(row, map, "Maaş (Sadece Sayısal)");
                const salary = salaryRaw === "" ? null : Number(salaryRaw);
                const hasISGText = getByTitle(row, map, "ISG (Var|Yok|True|False|0|1)"); // NEW
                const hasISG = normalizeTr(hasISGText) === normalizeTr("Var") || normalizeTr(hasISGText) === normalizeTr("True") || Number(hasISGText) === 1;

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
                if (!(mobile || telephone)) requiredMissing.push("Cep Telefon");

                const invalidDate: string[] = [];
                if (getByTitle(row, map, "Başlangıç (yyyy-MM-dd)") && !workStartDate) invalidDate.push("Başlangıç");
                if (getByTitle(row, map, "Doğum Tarihi (yyyy-MM-dd)") && !birthDate) invalidDate.push("Doğum Tarihi");

                // TC duplicates: in-file or existing DB list
                const tcDup = !identityNumber ? false : (seenTC.has(identityNumber) || existingTC.has(identityNumber));
                if (identityNumber) seenTC.add(identityNumber);

                const r: ImportedRow = {
                    _rowIndex: rowNumber,
                    name, family, identityNumber,
                    positionText, positionId,
                    workStartDate, workEndDate: null, insuranceNumber, // workEndDate: null yapıldı
                    sex, salaryType, salaryAccrualMethod, group,
                    birthPlace, birthDate, maritalStatus, bloodType,
                    fatherName, address, educationStatus, iban, telephone, mobile,
                    hasISG, salary: salary, // NEW
                    errors: {
                        identityDuplicate: tcDup, positionMissing: positionId == null,
                        requiredMissing, invalidDate
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
            name: r.name, family: r.family, identityNumber: r.identityNumber,
            workStartDate: r.workStartDate,
            workEndDate: null, // SAKLANDI
            insuranceNumber: r.insuranceNumber, sex: r.sex,
            salaryType: r.salaryType, salaryAccrualMethod: r.salaryAccrualMethod,
            group: r.group, birthPlace: r.birthPlace, birthDate: r.birthDate,
            maritalStatus: r.maritalStatus, fatherName: r.fatherName,
            bloodType: r.bloodType, address: r.address, educationStatus: r.educationStatus,
            iban: r.iban, telephone: r.telephone, mobile: r.mobile,
            positionId: r.positionId,
            salary: r.salary ? Number(r.salary) : null,
            hasISG: r.hasISG, // NEW

        };
        const res = await axios.post(`${server.baseurl}${server.hr}create-personnel`, payload, {
            headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!(res.data?.httpStatusCode === 201 || res.status === 201)) throw new Error(res.data?.message || "create failed");
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


    const exportToExcelDetailConsolidated = async (rows: PersonnelType[], filename: string) => {
        const wb = new Excel.Workbook();
        const ws = wb.addWorksheet("Personel Detaylari", { views: [{ rightToLeft: false }] });

        const columnsLength = 2; // همیشه دو ستون: "Alan" و "Değer"

        // 1. NEW: افزودن هدر گزارش
        addExcelHeader(ws, "PERSONEL DETAYLI RAPORU", columnsLength);

        let currentRow = ws.lastRow?.number ?? 1;

        rows.forEach((p, index) => {
            currentRow++;

            // عنوان پرسنل
            const titleRow = ws.getRow(currentRow);
            titleRow.getCell(1).value = `--- PERSONEL ${index + 1}: ${p.name || "—"} ${p.family || "—"} (${p.identityNumber || "—"}) ---`;
            titleRow.getCell(1).font = { bold: true, color: { argb: 'FF0000FF' } };
            ws.mergeCells(`A${currentRow}:B${currentRow}`);

            currentRow++;

            // افزودن سربرگ جدول کوچک (Alan / Değer)
            const headers = ws.getRow(currentRow);
            headers.getCell(1).value = "Alan";
            headers.getCell(2).value = "Değer";
            headers.font = { bold: true };
            headers.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
            currentRow++;

            // افزودن جزئیات ستونی (Pairs)
            const pairs = toPairsForPerson(p);
            pairs.forEach(([label, value]) => {
                const dataRow = ws.getRow(currentRow);
                dataRow.getCell(1).value = label;
                dataRow.getCell(2).value = value;
                currentRow++;
            });

            // افزودن سطر خالی برای جداسازی
            currentRow++;
        });

        // تنظیم عرض ستون‌ها
        ws.columns[0].width = 30; // Alan
        ws.columns[1].width = 50; // Değer

        // 2. NEW: افزودن اطلاعات شرکت (فوتر) در انتهای داده‌ها
        addExcelCompanyInfo(ws, currentRow + 2, columnsLength);

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), filename);
    };

    const exportToExcelDetail = async (p: PersonnelType, filename: string) => {
        const wb = new Excel.Workbook();
        // RTL (sağdan sola) görünüm isterseniz: { views: [{ rightToLeft: true }] }
        const ws = wb.addWorksheet("Personel Detay", { views: [{ rightToLeft: false }] });

        // Sütun başlıkları ve genişlikleri
        ws.columns = [
            { header: "Alan", key: "label", width: 30 },
            { header: "Değer", key: "value", width: 50 },
        ];

        // Tüm alanları toPairsForPerson'dan alır
        const pairs = toPairsForPerson(p);
        const data = pairs.map(([label, value]) => ({ label, value }));

        ws.addRows(data);

        // Estetik: Başlık satırı
        ws.getRow(1).font = { bold: true };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), filename);
    };


    const exportToExcelTable = async (rows: PersonnelType[], filename: string) => {
        const wb = new Excel.Workbook();
        const ws = wb.addWorksheet("Personel Tablo", { views: [{ rightToLeft: false }] });

        // تعریف سربرگ‌ها و عرض ستون‌ها
        const headerRowTitles = [
            "Ad", "Soyad", "TC Kimlik", "Pozisyon", "Başlangıç", "Bitiş", "Maaş",
            "Sigorta No", "Cinsiyet", "Ücret Tipi", "Tahakkuk", "Grup", "Doğum Yeri",
            "Doğum Tarihi", "Medeni Durum", "Baba Adı", "Kan Grubu", "Adres",
            "Eğitim", "IBAN", "Telefon", "Cep Telefon", "ISG", "Durum"
        ];
        const columnsLength = headerRowTitles.length;

        // 1. NEW: افزودن هدر گزارش
        addExcelHeader(ws, "PERSONEL TABLO RAPORU", columnsLength);
        let currentRow = ws.lastRow?.number ?? 0;

        // افزودن عنوان ستون‌ها
        const headers = ws.getRow(currentRow + 1);
        headers.values = headerRowTitles;
        headers.font = { bold: true };
        headers.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        // افزودن داده‌ها
        const allData: any[] = [];
        rows.forEach((p) => {
            const positionTitle = positions.find(x => x.id === (Number(p.position.id) ?? -1))?.title || "—";
            const salaryDisplay = p.salary !== null && p.salary !== undefined
                ? `${p.salary.toLocaleString('tr-TR')} TL`
                : "—";
            const rowData = [
                p.name || "—", p.family || "—", p.identityNumber || "—", positionTitle,
                formatDateDisplay(p.workStartDate), formatDateDisplay(p.workEndDate),
                salaryDisplay,
                p.insuranceNumber || "—", SEX_LABELS[p.sex] ?? "—",
                SALARY_TYPE_LABELS[p.salaryType] ?? "—", ACCRUAL_LABELS[p.salaryAccrualMethod] ?? "—",
                GROUP_LABELS[p.group] ?? "—", p.birthPlace || "—",
                formatDateDisplay(p.birthDate), MARITAL_LABELS[p.maritalStatus] ?? "—",
                p.fatherName || "—", BLOOD_LABELS[p.bloodType] ?? "—", p.address || "—",
                EDU_LABELS[p.educationStatus] ?? "—", p.iban || "—",
                p.telephone || "—", p.mobile || "—", p.hasISG ? "Var" : "Yok",
                statusText(p.recordStatus),
            ];
            allData.push(rowData);
        });

        ws.addRows(allData);

        // تنظیم عرض ستون‌ها
        ws.columns.forEach((column, index) => {
            column.width = headerRowTitles[index].length < 15 ? 15 : headerRowTitles[index].length + 5;
        });

        // 2. NEW: افزودن اطلاعات شرکت (فوتر) در انتهای داده‌ها
        const startRowCompanyInfo = ws.lastRow?.number ? ws.lastRow.number + 2 : 1;
        addExcelCompanyInfo(ws, startRowCompanyInfo, columnsLength);

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), filename);
    };


    const handleDownloadChooseExcel = (isDetailExport: boolean) => {
        // اگر کاربر 'İndir (Detay)' را زده باشد
        if (isDetailExport) {
            if (downloadScope === "row" && rowForDownload) {
                // حالت: دانلود جزئیات فقط برای یک ردیف انتخاب شده از منو
                const fileSlug = `${rowForDownload.name || ""}_${rowForDownload.family || ""}`.trim().replace(/\s+/g, "_");
                exportToExcelDetail(rowForDownload, `Personel_Detay_${fileSlug || rowForDownload.id}.xlsx`);
            } else {
                exportToExcelDetailConsolidated(sorted, "Personel_Detay_Consolidated.xlsx");
            }
        } else {
            // حالت Tablo (برای تمام لیست فیلتر شده)
            exportToExcelTable(sorted, "Personel_Tablo_Raporu.xlsx");
        }
        setOpenDownloadModal(false);
    };


    const handleDownloadConsignmentPDF = () => {
        // 1. اعتبارسنجی داده‌ها
        const personnel = personnelToEndCooperation;
        const generalConsignments = activeConsignments;
        const carConsignments = activeCarConsignment;

        if (!personnel) {
            showAlert("Personel bilgileri eksik.", "error");
            return;
        }

        const doc = new jsPDF("p", "pt", "a4");

        // تنظیمات فونت (مطابق با کدهای قبلی شما)
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc.addFont as any)("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");

        const headerSpace = 100;
        const sideMargin = 40;
        let finalY = headerSpace + 20; // شروع محتوا

        // 2. هدر گزارش
        addPdfHeader(doc, "PERSONEL İLİŞİK KESME / ZİMMET TESLİM RAPORU");

        // 3. اطلاعات پرسنل (بالای صفحه)
        doc.setFontSize(12);
        doc.text(`Personel Adı Soyadı: ${personnel.name} ${personnel.family}`, sideMargin, finalY);
        finalY += 16;
        doc.text(`TC Kimlik Numarası: ${personnel.identityNumber || '—'}`, sideMargin, finalY);
        finalY += 16;
        doc.text(`İşe Başlama Tarihi: ${formatDateDisplay(personnel.workStartDate)}`, sideMargin, finalY);
        finalY += 25;

        doc.setFontSize(14);
        doc.text("1. Genel Zimmet Kayıtları", sideMargin, finalY);
        finalY += 10;

        if (generalConsignments.length === 0) {
            finalY += 15;
            doc.setFontSize(10);
            doc.text("Personelin teslim etmediği aktif genel zimmet kaydı bulunmamaktadır.", sideMargin + 10, finalY);
            finalY += 25;
        } else {
            const generalBody = generalConsignments.map((item) => [
                `${item.name} (${item.code})`,
                formatDateDisplay(item.assignmentDate),
                item.description || '—',
                "□",
            ]);

            autoTable((doc as any), {
                startY: finalY,
                head: [["Mal İsmi (Kod)", "Veriliş Tarihi", "Açıklama", "Teslim Edildi"]],
                body: generalBody,
                theme: "grid",
                styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 5 },
                headStyles: { fillColor: [200, 220, 250], textColor: [0, 0, 0] },
                columnStyles: { 3: { cellWidth: 80, halign: 'center' } },
                margin: { left: sideMargin, right: sideMargin },
                didDrawPage: (_data: any) => {
                    addPdfHeader(doc, "PERSONEL İLİŞİK KESME / ZİMMET TESLİM RAPORU");
                    addPdfFooter(doc);
                },
            });

            finalY = (doc as any).lastAutoTable.finalY + 15;

            doc.setFontSize(10);
            doc.text("Açıklama (Genel Zimmet):", sideMargin, finalY);
            finalY += 35;
        }

        doc.setFontSize(14);
        doc.text("2. Araç Zimmet Kayıtları", sideMargin, finalY);
        finalY += 10;

        if (carConsignments.length === 0) {
            finalY += 15;
            doc.setFontSize(10);
            doc.text("Personelin teslim etmediği aktif araç zimmet kaydı bulunmamaktadır.", sideMargin + 10, finalY);
            finalY += 25;
        } else {
            const carBody = carConsignments.map((item) => [
                `${item.name}`,
                `${item.code}`,
                formatDateDisplay(item.assignmentDate),
                "□",
            ]);

            autoTable((doc as any), {
                startY: finalY,
                head: [["Plaka (Marka)", "Model", "Veriliş Tarihi", "Teslim Edildi"]],
                body: carBody,
                theme: "grid",
                styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 5 },
                headStyles: { fillColor: [255, 240, 200], textColor: [0, 0, 0] },
                columnStyles: { 3: { cellWidth: 80, halign: 'center' } }, // وسط‌چین کردن چک‌باکس
                margin: { left: sideMargin, right: sideMargin },
                didDrawPage: (_data: any) => {
                    addPdfHeader(doc, "PERSONEL İLİŞİK KESME / ZİMMET TESLİM RAPORU");
                    addPdfFooter(doc); // ✅ فوتر اضافه شد
                },
            });

            finalY = (doc as any).lastAutoTable.finalY + 15;

            // سطر توضیحات اموال خودرو
            doc.setFontSize(10);
            doc.text("Açıklama (Araç Zimmet):", sideMargin, finalY);
            // doc.rect(sideMargin + 140, finalY - 10, 430, 15, 'S'); // فیلد متنی بزرگ
            finalY += 35;
        }

        // 6. کادر نهایی تسویه‌حساب (در پایین)
        doc.setFontSize(14);
        doc.text("İlişik Kesme Onayı", sideMargin, finalY + 10);
        finalY += 20;

        doc.setFontSize(10);
        const approvalText = "Yukarıdaki zimmet listesinin eksiksiz teslim alındığı onaylanır.";
        doc.text(approvalText, sideMargin, finalY + 10);

        // خطوط امضا
        doc.text("Personel İmzası:", sideMargin, finalY + 40);
        doc.line(sideMargin + 100, finalY + 40, sideMargin + 250, finalY + 40);

        doc.text("HR/Yönetici İmzası:", sideMargin + 300, finalY + 40);
        doc.line(sideMargin + 400, finalY + 40, sideMargin + 530, finalY + 40);

        doc.save(`İlişik_Kesme_${personnel.name}_${personnel.family}.pdf`);
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


    const handleEndCooperationCheck = async (personnel: PersonnelType) => {
        handleCloseMenu();
        setPersonnelToEndCooperation(personnel);

        const authToken = localStorage.getItem('authToken');
        if (!authToken) { showAlert("Lütfen giriş yapın.", "warning"); navigate("/"); return; }

        showAlert("Zimmet ve Araç kayıtları kontrol ediliyor...", "info");
        setLoadingButton(true);

        // ⭐️ ریست کردن Stateهای مربوط به اموال ⭐️
        setActiveCarConsignment([]);
        setActiveConsignments([]);

        try {
            // --- 1. اموال عمومی (Genel Zimmet) ---
            // 💡 استفاده از API جدید: get-consignments-for-personnel-return/{personnelId}
            const consignmentRes = await axios.get(
                `${server.baseurl}${server.hr}get-consignments-for-personnel-return/${personnel.id}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );

            const activeGeneralConsignments = (consignmentRes.data?.httpStatusCode === 200 && consignmentRes.data?.data)
                ? (consignmentRes.data.data as any[])
                    .map(item => ({
                        // 💡 نگاشت داده‌ها بر اساس ساختار API جدید
                        type: 'Zimmet (Genel)',
                        assignmentDate: item.createAt, // تاریخ واگذاری در این API به عنوان createAt فرض شده است.
                        description: item.description,
                        attachments: item.attachments || [],
                        name: item.name || 'Bilinmiyor',
                        code: item.code || '-',
                        // placeId, placeType, etc., اگر لازم هستند
                    }))
                : [];

            setActiveConsignments(activeGeneralConsignments);

            // --- 2. اموال خودرو (Car Consignments) ---
            // (این بخش بدون تغییر از کد اصلی شما باقی می‌ماند.)
            // ... (API مربوط به personnel-current-car/{personnel.id} و منطق نگاشت آن)

            // --- 3. تصمیم‌گیری برای نمایش ---
            const totalActiveCarCount = activeCarConsignment.length;
            const totalActiveCount = activeGeneralConsignments.length + totalActiveCarCount;

            // ... (ادامه منطق نمایش Modal)
            if (totalActiveCount > 0) {
                setOpenActiveConsignmentsModal(true);
                showAlert(`Personelin ${totalActiveCount} adet teslim etmediği zimmeti bulunmaktadır! (Genel: ${activeGeneralConsignments.length}, Araç: ${totalActiveCarCount})`, "error");
            } else {
                setEndDate(null);
                setOpenEndCooperationModal(true);
                showAlert("Zimmet kontrolü başarılı. İşten ayrılma tarihi belirlenebilir.", "success");
            }

        } catch (e: any) {
            // ...
            showAlert(e?.response?.data?.message || "Sunucuya bağlanılamadı veya zimmet kontrolü başarısız oldu.", "error");
        } finally {
            setLoadingButton(false);
        }
    };


    const handleOpenPersonnelFilesModal = (row: PersonnelType) => {
        // 1. ذخیره فایل‌های پیوست و اطلاعات پرسنل در Stateهای جدید
        setPersonnelFilesToDownload(row.attachments || []);
        setSelectedPersonnelForFiles(row);

        // 2. باز کردن Modal جدید
        setOpenPersonnelFilesModal(true);
        handleCloseMenu();
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
    const handleRemoveProfileImage = useCallback(() => {
        setProfileRawFile(null);
        setProfileImageUrl(DEFAULT_IMAGE_URL);
        if (editingId) {
            setForm(f => ({ ...f, imageSrc: undefined }));
        }
        if (profileImageInputRef.current) {
            profileImageInputRef.current.value = "";
        }
    }, [editingId]);

    // در نزدیکی توابع submitCreate و submitUpdate اضافه کنید
    const submitSalaryUpdate = async () => {
        if (!personnelToUpdateSalary || newSalary === null || newSalary < 0) {
            showAlert("Lütfen geçerli bir maaş değeri girin.", "warning");
            return;
        }
        if (!authToken) { navigate("/"); return; }

        setLoadingSalaryUpdate(true);

        try {
            const payload = {
                personnelId: Number(personnelToUpdateSalary.id),
                salary: newSalary
            };

            const res = await axios.put(`${server.baseurl}${server.hr}update-personnel-salary`, payload, {
                headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
            });

            if (res.data?.httpStatusCode === 200) {
                showAlert(`${personnelToUpdateSalary.name} ${personnelToUpdateSalary.family} personelinin maaşı başarıyla güncellendi.`, "success");

                // 💡 به‌روزرسانی لیست پرسنل و بستن Modal
                getAllPersonnels();
                handleCloseSalaryEditModal();

            } else {
                showAlert(res.data?.message || "Maaş güncellenirken bir hata oluştu.", "error");
            }
        } catch (e: any) {
            if (e.response?.status === 500) showAlert('Sunucu hatası: Güncelleme başarısız.', 'error');
            else if (e.response?.status === 401) {
                localStorage.removeItem('authToken');
                showAlert('Oturum süreniz doldu, lütfen tekrar giriş yapın.', 'error'); navigate("/");
            }
            else showAlert(e.response?.data?.message || 'Maaş güncellenirken beklenmedik bir hata oluştu.', 'error');
        } finally {
            setLoadingSalaryUpdate(false);
        }
    };

    const handleOpenSalaryEditModal = () => {
        if (!selectedRowForMenu || !hasEditPermission) return;

        // 1. ذخیره اطلاعات پرسنل فعلی
        setPersonnelToUpdateSalary(selectedRowForMenu);

        // 2. تنظیم حقوق فعلی به عنوان مقدار اولیه (اگر وجود داشته باشد)
        setNewSalary(selectedRowForMenu.salary ?? null);

        // 3. باز کردن Modal
        setOpenSalaryEditModal(true);
        handleCloseMenu();
    };

    const handleCloseSalaryEditModal = () => {
        setOpenSalaryEditModal(false);
        setPersonnelToUpdateSalary(null);
        setNewSalary(null);
        setLoadingSalaryUpdate(false);
        // showAlert'ı burada clear etmeyin, işlem sonucu alert'i Modal'da gösterelim
    };

    const handleDownloadLinkClick = (fileUrl: string) => { if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; } const url = `${server.urldpwonload}${fileUrl}`; window.open(url, '_blank'); showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info'); };


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

            {isFormVisible && (
                <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                    <Stack spacing={2}>
                        <Stepper activeStep={activeStep} alternativeLabel>
                            {["Kimlik", "İş Bilgileri", "Kişisel", "İletişim"].map((label) => (<Step key={label}><StepLabel>{label}</StepLabel></Step>))}
                        </Stepper>

                        {showStepErrors && <Alert severity="warning">Lütfen bu adımın zorunlu alanlarını doldurun.</Alert>}

                        {/* Step 0: Kimlik - Profile Image Logic Changed */}
                        {/* Step 0: Kimlik - ساختار Grid اصلاح شده و آیکون حذف اضافه شد */}
                        {activeStep === 0 && (
                            <Grid container spacing={3}>

                                {/* === ستون اصلی ورودی‌ها (Ad, Soyad, TC, Pozisyon) - 8 واحد === */}
                                <Grid item xs={12} md={8}>
                                    <Grid container spacing={2} alignItems="center">
                                        {/* Ad */}
                                        <Grid item xs={12} sm={4} display="flex" alignItems="center">
                                            <CustomFormLabel sx={{ mt: 0 }} required>Ad</CustomFormLabel>
                                        </Grid>
                                        <Grid item xs={12} sm={8}>
                                            <CustomTextField size="small" fullWidth value={form.name}
                                                placeholder="Ad"
                                                inputRef={nameInputRef}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))}
                                                required
                                                error={showStepErrors && !form.name?.trim()}
                                                helperText={showStepErrors && !form.name?.trim() ? "Bu alan zorunludur" : ""} />
                                        </Grid>

                                        {/* Soyad */}
                                        <Grid item xs={12} sm={4} display="flex" alignItems="center">
                                            <CustomFormLabel sx={{ mt: 0 }} required>Soyad</CustomFormLabel>
                                        </Grid>
                                        <Grid item xs={12} sm={8}>
                                            <CustomTextField size="small" fullWidth value={form.family}
                                                placeholder="Soyad"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, family: e.target.value }))}
                                                required
                                                error={showStepErrors && !form.family?.trim()}
                                                helperText={showStepErrors && !form.family?.trim() ? "Bu alan zorunludur" : ""} />
                                        </Grid>

                                        {/* TC Kimlik */}
                                        <Grid item xs={12} sm={4} display="flex" alignItems="center">
                                            <CustomFormLabel sx={{ mt: 0 }} required>TC Kimlik</CustomFormLabel>
                                        </Grid>
                                        <Grid item xs={12} sm={8}>
                                            <CustomTextField size="small" fullWidth value={form.identityNumber}
                                                placeholder="TC Kimlik"
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, identityNumber: e.target.value }))}
                                                required
                                                error={showStepErrors && !form.identityNumber?.trim()}
                                                helperText={showStepErrors && !form.identityNumber?.trim() ? "Bu alan zorunludur" : ""} />
                                        </Grid>

                                        {/* Pozisyon */}
                                        <Grid item xs={12} sm={4} display="flex" alignItems="center">
                                            <CustomFormLabel sx={{ mt: 0 }} required>Pozisyon</CustomFormLabel>
                                        </Grid>
                                        <Grid item xs={12} sm={8}>
                                            <Autocomplete
                                                options={positions} size="small"
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
                                    </Grid>
                                </Grid>

                                {/* === ستون عکس پروفایل - 4 واحد === */}
                                <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center" justifyContent="flex-start">
                                    <Box position="relative" sx={{ width: 150, height: 150, mb: 2 }}>
                                        {/* نمایش عکس */}
                                        <CardMedia
                                            component="img"
                                            sx={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', border: '2px solid', borderColor: 'primary.main' }}
                                            image={profileImageUrl}
                                            alt="Personel Fotoğrafı"
                                        />

                                        {/* دکمه حذف (اگر عکس پیش فرض نباشد) */}
                                        {profileImageUrl !== DEFAULT_IMAGE_URL && (
                                            <CustomTooltip title="Resmi Kaldır">
                                                <IconButton
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: 0, // قرارگیری در پایین و راست
                                                        right: 0,
                                                        backgroundColor: 'error.main',
                                                        color: 'white',
                                                        '&:hover': { backgroundColor: 'error.dark' },
                                                        p: 0.8,
                                                        zIndex: 10,
                                                    }}
                                                    onClick={handleRemoveProfileImage}
                                                    size="small"
                                                >
                                                    <IconX size={16} />
                                                </IconButton>
                                            </CustomTooltip>
                                        )}
                                    </Box>

                                    {/* دکمه انتخاب عکس */}
                                    <input
                                        type="file" accept="image/*"
                                        ref={profileImageInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleImageChange}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={() => profileImageInputRef.current?.click()}
                                        size="medium"
                                        startIcon={<IconUpload size={20} />}
                                    >
                                        {profileImageUrl !== DEFAULT_IMAGE_URL ? "Resmi Değiştir" : "Resim Seç"}
                                    </Button>
                                </Grid>

                            </Grid>
                        )}

                        {/* Step 1: İş Bilgileri - Bitiş kaldırıldı, hasISG ve Attachments eklendi */}
                        {activeStep === 1 && (
                            <Grid container spacing={2}>
                                {/* Başlangıç */}
                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Başlangıç</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                        <DatePicker
                                            label="Başlangıç"
                                            inputFormat="dd/MM/yyyy"
                                            value={form.workStartDate ? parseISO(form.workStartDate) : null}
                                            onChange={(next) => setForm((f) => ({
                                                ...f,
                                                workStartDate: next && isValidDate(next) ? format(next, "yyyy-MM-dd") : null
                                            }))}
                                            renderInput={(params: any) => (
                                                <TextField
                                                    {...params}
                                                    size="small"
                                                    fullWidth
                                                    inputProps={{ ...params.inputProps, placeholder: "GG/AA/YYYY" }}
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>
                                </Grid>

                                {/* Bitiş KALDIRILDI */}
                                <Grid item xs={12} sm={6} md={2}><CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>Sigorta No</CustomFormLabel></Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomTextField size="small" fullWidth value={form.insuranceNumber}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, insuranceNumber: e.target.value }))} />
                                </Grid>

                                <Grid item xs={12}><Divider /></Grid>

                                {/* NEW: hasISG Radio Button */}
                                <Grid item xs={12} sm={6} md={3}>
                                    <FormLabel>İSG var mı?</FormLabel>
                                    <RadioGroup row value={form.hasISG === true ? "true" : "false"}
                                        onChange={(e) => setForm((f) => ({ ...f, hasISG: e.target.value === "true" }))}>
                                        <FormControlLabel value="true" control={<Radio />} label="Var (Evet)" />
                                        <FormControlLabel value="false" control={<Radio />} label="Yok (Hayır)" />
                                    </RadioGroup>
                                </Grid>

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

                                <Grid item xs={12}><Divider /></Grid>

                                {/* NEW: Attachments Upload */}
                                <Grid item xs={12}>
                                    <CustomFormLabel>Ek Belgeler (PDF, Excel, Resim)</CustomFormLabel>
                                    <input
                                        type="file" accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                                        multiple ref={attachmentsInputRef}
                                        style={{ display: 'none' }}
                                        onChange={handleAttachmentsChange}
                                    />
                                    <Button variant="outlined" startIcon={<IconUpload />} onClick={() => attachmentsInputRef.current?.click()}>
                                        Dosya Seç ({attachmentsRawFiles.length} Yeni)
                                    </Button>
                                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                                        Mevcut kayıtlı belge sayısı: {form.attachments?.length || 0}
                                        {attachmentsRawFiles.length > 0 && <span> | {attachmentsRawFiles.length} adet dosya yüklenecek.</span>}
                                    </Typography>
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
                                            //     inputFormat="dd/MM/yyyy"
                                            //     value={form.birthDate}
                                            //     onChange={(next: any) => setForm((f) => ({ ...f, birthDate: next ? format(next, "yyyy-MM-dd") : null }))}
                                            //     renderInput={(params: any) => (
                                            //         <TextField {...params} size="small" fullWidth 
                                            //         error={showStepErrors && !form.birthDate}
                                            //          helperText={showStepErrors ? "Doğum tarihi zorunludur!" : ""} />
                                            //     )}
                                            // />


                                            inputFormat="dd/MM/yyyy"
                                            value={form.birthDate ? parseISO(form.birthDate) : null}
                                            onChange={(next) => setForm((f) => ({
                                                ...f,
                                                birthDate: next && isValidDate(next) ? format(next, "yyyy-MM-dd") : null
                                            }))}
                                            renderInput={(params: any) => (
                                                <TextField
                                                    {...params}
                                                    size="small"
                                                    fullWidth
                                                    error={showStepErrors && !form.birthDate}
                                                    inputProps={{ ...params.inputProps, placeholder: "GG/AA/YYYY" }}
                                                />
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
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Maaş</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <CustomTextField
                                        size="small"
                                        fullWidth
                                        value={form.salary ?? ''}
                                        disabled={Boolean(editingId)}
                                        type="text" // ⬅️ تغییر از number به text برای کنترل دقیق‌تر
                                        placeholder="Maaş (Sadece sayı)"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            const value = e.target.value;
                                            // ⬅️ فقط اعداد را اجازه می‌دهد (Regex)
                                            if (value === '' || /^\d+$/.test(value)) {
                                                setForm((f) => ({
                                                    ...f,
                                                    salary: value === '' ? null : Number(value)
                                                }));
                                            }
                                        }}
                                        // ⬅️ جلوگیری از وارد کردن کاراکترهای غیر عددی در لحظه فشردن کلید
                                        onKeyDown={(e: React.KeyboardEvent) => {
                                            if (["e", "E", "+", "-", ",", "."].includes(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                    />
                                    {/* پیام کمکی برای محدودیت ویرایش */}
                                    {Boolean(editingId) && (
                                        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                                            Maaş düzenleme modunda değiştirilemez.
                                        </Typography>
                                    )}
                                </Grid>


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
                                        helperText={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim()) ? "Cep Telefon veya Telefon zorunlu" : ""} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Cep Telefon</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <CustomTextField size="small" fullWidth value={form.mobile}
                                        placeholder="Cep Telefon"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                                        error={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim())}
                                        helperText={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim()) ? "Cep Telefon veya Telefon zorunlu" : ""} />
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
                <Typography variant="h5">Personel Listesi</Typography>
                {notifIds.length > 0 && (
                    <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                        <Chip label={`Bildirim filtresi: ${notifIds.length} `} color="error" size="small" />
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
                                {/* NEW: Photo Column */}
                                <StyledTableCell><Typography variant="h6">Fotoğraf</Typography></StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "name"} direction={orderBy === "name" ? order : "asc"} onClick={() => handleRequestSort("name")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">Ad Soyad</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "position"} direction={orderBy === "position" ? order : "asc"} onClick={() => handleRequestSort("position")}>
                                        <Typography variant="h6">Pozisyon</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel active={orderBy === "identityNumber"} direction={orderBy === "identityNumber" ? order : "asc"} onClick={() => handleRequestSort("identityNumber")} style={{ color: "#171c23" }}>
                                        <Typography variant="h6">TC Kimlik</Typography>
                                    </TableSortLabel>
                                </StyledTableCell>
                                <StyledTableCell>
                                    <TableSortLabel
                                        active={orderBy === "hasISG"}
                                        direction={orderBy === "hasISG" ? order : "asc"}
                                        onClick={() => handleRequestSort("hasISG")}
                                    >
                                        <Typography variant="h6">ISG</Typography>
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
                                    <StyledTableCell colSpan={8} align="center">
                                        <CircularProgress />
                                        <Typography variant="subtitle1" color="textSecondary">Personeller yükleniyor...</Typography>
                                    </StyledTableCell>
                                </TableRow>
                            ) : paginated.length > 0 ? (
                                paginated.map((row) => (
                                    <TableRow key={row.id}
                                        sx={{
                                            '&:last-child td, &:last-child th': { border: 0 },
                                            ...(row.workEndDate && row.workEndDate !== "N/A"
                                                ? { backgroundColor: '#ffa7a76e' } // رنگ Hex مستقیم + Opacity
                                                : {}
                                            )
                                        }}>
                                        <StyledTableCell>
                                            <CardMedia
                                                component="img"
                                                sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                                                image={getFullImageUrl(row.imageSrc)}
                                                alt="Personel Fotoğrafı"
                                            />
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{row.name} {row.family}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            <Typography variant="body1">{row.position?.title || "Pozisyon yok"}</Typography>
                                        </StyledTableCell>
                                        <StyledTableCell><Typography variant="body1">{row.identityNumber}</Typography></StyledTableCell>
                                        <StyledTableCell>
                                            {row.hasISG ? (
                                                <Chip
                                                    label="Var"
                                                    size="small"
                                                    color="success"
                                                    variant="filled" // یا "outlined"
                                                    icon={<DoneRoundedIcon style={{ fontSize: '16px' }} />}
                                                />
                                            ) : (
                                                <Chip
                                                    label="Yok"
                                                    size="small"
                                                    color="error"
                                                    variant="outlined"
                                                    icon={<IconX size={16} />}
                                                />
                                            )}
                                        </StyledTableCell>
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
                                            <Button variant="outlined" size="small" onClick={() => handleClickDetails(row)}>
                                                Detay
                                            </Button>
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            <CustomTooltip title={isTooltipGloballyEnabled ? "Daha fazla seçenek" : ""}>
                                                <IconButton id={`menu-${row.id}`} onClick={(event) => handleClickMenu(event, row)}>
                                                    <IconDots width={18} />
                                                </IconButton>
                                            </CustomTooltip>
                                            <Menu id="menu" anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu} MenuListProps={{ "aria-labelledby": `menu-${selectedRowForMenu?.id}` }}>

                                                {/* Yıllık İzin Hesapلا (Using correct MenuItem structure) */}
                                                <MuiMenuItem onClick={() => selectedRowForMenu && handleAnnualLeaveClick(selectedRowForMenu)}>
                                                    <ListItemIcon><BoltIcon width={18} /></ListItemIcon> Yıllık İzin Hesapla
                                                </MuiMenuItem>

                                                {/* NEW: İş Birliği Sonlandırma */}

                                                {/* {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && selectedRowForMenu && (
                                                    <MuiMenuItem onClick={() => { setPersonnelToEndCooperation(selectedRowForMenu); setEndDate(null); setOpenEndCooperationModal(true); handleCloseMenu(); }}>
                                                        <ListItemIcon><IconX width={18} /></ListItemIcon> İşten Ayrılma (Sonlandırma)
                                                    </MuiMenuItem>
                                                )} */}

                                                {hasEditPermission && selectedRowForMenu?.recordStatus === 0 && selectedRowForMenu && (
                                                    <MuiMenuItem onClick={() => handleEndCooperationCheck(selectedRowForMenu)}>
                                                        <ListItemIcon><IconX width={18} /></ListItemIcon> İşten Ayrılma (Sonlandırma)
                                                    </MuiMenuItem>
                                                )}

                                                {hasEditPermission && selectedRowForMenu && (
                                                    <MuiMenuItem onClick={handleOpenSalaryEditModal}>
                                                        <ListItemIcon><IconCurrencyDollar width={18} /></ListItemIcon> Maaş Düzenle
                                                    </MuiMenuItem>
                                                )}

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

                                                {/* NEW: Belgeleri İndir */}
                                                {/* {selectedRowForMenu?.attachments && selectedRowForMenu.attachments.length > 0 && (
                                                    <MuiMenuItem onClick={() => { setRowForAttachments(selectedRowForMenu); setOpenAttachmentsModal(true); handleCloseMenu(); }}>
                                                        <ListItemIcon><IconFile width={18} /></ListItemIcon> Belgeleri İndir ({selectedRowForMenu.attachments.length})
                                                    </MuiMenuItem>
                                                )} */}

                                                {selectedRowForMenu?.attachments && selectedRowForMenu.attachments.length > 0 && (
                                                    <MuiMenuItem onClick={() => selectedRowForMenu && handleOpenPersonnelFilesModal(selectedRowForMenu)}>
                                                        <ListItemIcon><IconFile width={18} /></ListItemIcon> Belge/Dosyaları İndir ({selectedRowForMenu.attachments.length})
                                                    </MuiMenuItem>
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
                                    <StyledTableCell colSpan={8} align="center">
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

            {/* Delete Personnel - unchanged */}
            <DeletePersonnel
                openModal={openDeleteModal}
                onClose={() => { setOpenDeleteModal(false); setPersonnelIdToDelete(null); getAllPersonnels(); }}
                personnelIdToDelete={personnelIdToDelete}
                onDeleteSuccess={getAllPersonnels}
                showAlert={showAlert}
            />

            {/* Download Chooser Modal - unchanged */}
            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>

                        {/* 1. PDF - Detay (Single Row Detail) */}
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={handleDownloadChoosePDF}>
                            PDF İndir (Detay)
                        </Button>

                        {/* 2. PDF - Tablo (List Table) */}
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={handleDownloadChoosePDFTable}>
                            PDF İndir (Tablo)
                        </Button>

                        <Divider />

                        {/* 3. Excel - Detay (Single Row Detail) */}
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                            // اگر دکمه "Bu satırı indir" را زده باشد، این حالت جزئیات را دانلود می‌کند
                            onClick={() => {
                                handleDownloadChooseExcel(true); // true = Detay/Columnar Export
                                setOpenDownloadModal(false);
                            }}
                        >
                            Excel İndir (Detay)
                        </Button>

                        {/* 4. Excel - Tablo (List Table) */}
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />}
                            // اگر دکمه "Tümünü İndir" را زده باشد، این حالت جدول را دانلود می‌کند
                            onClick={() => {
                                handleDownloadChooseExcel(false); // false = Table Export
                                setOpenDownloadModal(false);
                            }}
                        >
                            Excel İndir (Tablo)
                        </Button>

                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>
            {/* Details Modal - unchanged */}
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

            {/* Import Error/Correction Modal - unchanged */}
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
                                        options={positions} size="small"
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
                                    <TextField fullWidth size="small" label="Bitiş (yyyy-MM-dd) - Kaldırıldı" value={r.workEndDate ?? ""} disabled />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth size="small" label="Sigorta No" value={r.insuranceNumber} onChange={(e) => setR({ insuranceNumber: e.target.value })} />
                                </Grid>

                                {/* NEW: ISG for Import Correction */}
                                <Grid item xs={12} sm={6}>
                                    <FormLabel>İş Güvenliği (ISG)</FormLabel>
                                    <RadioGroup row value={r.hasISG ? "true" : "false"}
                                        onChange={(e) => setR({ hasISG: e.target.value === "true" })}>
                                        <FormControlLabel value="true" control={<Radio />} label="Var (Evet)" />
                                        <FormControlLabel value="false" control={<Radio />} label="Yok (Hayır)" />
                                    </RadioGroup>
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
                                    <TextField fullWidth size="small" label="Cep Telefon" value={r.mobile}
                                        onChange={(e) => setR({ mobile: e.target.value })}
                                        error={r.errors.requiredMissing.includes("Cep Telefon")}
                                        helperText={r.errors.requiredMissing.includes("Cep Telefon") ? "Cep Telefon veya Telefon zorunlu" : ""} />
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
                            const req: string[] = [];
                            if (!r.name) req.push("Ad");
                            if (!r.family) req.push("Soyad");
                            if (!r.identityNumber) req.push("TC Kimlik");
                            if (!r.workStartDate) req.push("Başlangıç (yyyy-MM-dd)");
                            if (!r.birthDate) req.push("Doğum Tarihi (yyyy-MM-dd)");
                            if (!r.fatherName) req.push("Baba Adı");
                            if (!r.address) req.push("Adres");
                            if (!(r.mobile || r.telephone)) req.push("Cep Telefon");

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


            <Dialog
                fullWidth={true}
                open={openAnnualLeaveModal} onClose={handleCloseAnnualLeaveModal}>
                <DialogTitle>Yıllık İzin Bilgileri</DialogTitle>
                <DialogContent>
                    {loadingAnnualLeave ? (
                        <CircularProgress />
                    ) : (
                        annualLeaveData && personnelForAnnualLeave && ( // استفاده از State موقت جدید
                            <Stack spacing={2}>
                                <Typography variant="h5" fontWeight={600}>
                                    {personnelForAnnualLeave.name} {personnelForAnnualLeave.family}
                                </Typography>
                                <Typography variant="body2">
                                    Başlangıç: {formatDateDisplay(personnelForAnnualLeave.workStartDate)}
                                </Typography>
                                <Typography variant="body2">
                                    Bitiş: {formatDateDisplay(personnelForAnnualLeave.workEndDate)}
                                </Typography>

                                <Divider sx={{ my: 1 }} />

                                <Box display="flex" justifyContent="space-between"><Typography variant="h6">İzin Hakkı</Typography><Chip label={annualLeaveData.official} color="primary" /></Box>
                                <Box display="flex" justifyContent="space-between"><Typography variant="h6">Kalan İzin</Typography><Chip label={annualLeaveData.remaining} color="success" /></Box>
                                <Box display="flex" justifyContent="space-between"><Typography variant="h6">Yaş</Typography><Chip label={annualLeaveData.age} color="info" /></Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6">Çalışma Yılı</Typography>
                                    <Chip
                                        label={
                                            annualLeaveData.personnelWorkYearsAndMonths
                                                ? `${annualLeaveData.personnelWorkYearsAndMonths.years} Yıl, ${annualLeaveData.personnelWorkYearsAndMonths.months} Ay, ${annualLeaveData.personnelWorkYearsAndMonths.days} Gün`
                                                : `${annualLeaveData.yearOfWork} Yıl`
                                        }
                                        color="secondary"
                                    />
                                </Box>

                                <Divider sx={{ my: 1 }} />
                                <Typography variant="h6">Rapor İndir</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<IconFileDownload />}
                                    onClick={() =>
                                        personnelForAnnualLeave && annualLeaveData &&
                                        pdfForAnnualLeave(
                                            personnelForAnnualLeave,
                                            annualLeaveData,
                                            `İzin_Raporu_${personnelForAnnualLeave.name}_${personnelForAnnualLeave.family}.pdf`
                                        )
                                    }>
                                    PDF İndir (Detay)
                                </Button>
                            </Stack>
                        )
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAnnualLeaveModal} color="secondary">Kapat</Button>
                </DialogActions>
            </Dialog>

            {/* NEW: İş Birliği Sonlandırma Modal */}
            <Dialog open={openEndCooperationModal} onClose={() => setOpenEndCooperationModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>İş Birliği Sonlandırma</DialogTitle>
                <DialogContent>
                    {personnelToEndCooperation && (
                        <Stack spacing={2}>
                            <Typography>Personel: {personnelToEndCooperation.name} {personnelToEndCooperation.family}</Typography>
                            <Typography>Başlangıç Tarihi:{formatDateDisplay(personnelToEndCooperation.workStartDate)}</Typography>

                            <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                <DatePicker
                                    label="Bitiş Tarihi Seçin"
                                    value={endDate}
                                    inputFormat="dd/MM/yyyy"
                                    minDate={personnelToEndCooperation.workStartDate ? parseISO(personnelToEndCooperation.workStartDate) : undefined}
                                    onChange={(next: any) => setEndDate(next ? format(next, "yyyy-MM-dd") : null)}
                                    renderInput={(params: any) => (<TextField {...params} size="small" fullWidth />)}
                                />
                            </LocalizationProvider>
                            {/* <Alert severity="warning">Seçilen tarih, personelin son çalışma tarihi olacaktır.</Alert> */}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEndCooperationModal(false)} color="secondary">İptal</Button>
                    <Button onClick={submitEndCooperation} color="error" disabled={!endDate}>Sonlandır</Button>
                </DialogActions>
            </Dialog>

            {/* NEW: Attachments Download Modal */}
            {/* <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ek Belgeler</DialogTitle>
                <DialogContent dividers>
                    {rowForAttachments?.attachments && rowForAttachments.attachments.length > 0 ? (
                        rowForAttachments.attachments.map((att, index) => (
                            <Box key={index} display="flex" justifyContent="space-between" alignItems="center" my={1} p={1} sx={{ borderBottom: '1px solid #eee' }}>
                                <Typography>{att.fileUrl.split('/').pop() || `Dosya ${index + 1}`}</Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    href={`${server.urldpwonload}${att.fileUrl}`}
                                    target="_blank"
                                    download
                                >
                                    İndir
                                </Button>
                            </Box>
                        ))
                    ) : (
                        <Typography>Bu personel için ek belge bulunmamaktadır.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAttachmentsModal(false)}>Kapat</Button>
                </DialogActions>
            </Dialog> */}


            <Dialog open={openActiveConsignmentsModal} onClose={() => setOpenActiveConsignmentsModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ backgroundColor: 'error.main', color: 'white' }}>
                    Personelin Teslim Edilmemiş Zimmetleri Bulunmaktadır!
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle1" gutterBottom>
                        Aşağıdaki zimmet kayıtları henüz iade edilmemiştir. İş birliğini sonlandırmadan önce iade alınması <span>gerekmektedir</span>.
                    </Typography>

                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>1. Genel Zimmet Kayıtları ({activeConsignments.length})</Typography>

                    {activeConsignments.length > 0 ? (
                        <TableContainer component={Paper} sx={{ mb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Mal İsmi (Kod)</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Veriliş Tarihi</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Açıklama</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Ekler</StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {activeConsignments.map((item, index) => (
                                        <TableRow key={index}>
                                            <StyledTableCell>{item.name} ({item.code})</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(item.assignmentDate)}</StyledTableCell>
                                            <StyledTableCell sx={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.description || '-'}
                                            </StyledTableCell>
                                            <StyledTableCell>
                                                {item.attachments?.length > 0 ? (
                                                    <Button
                                                        size="small" variant="contained" color="secondary" startIcon={<IconFile width={16} />}
                                                        onClick={() => {
                                                            const urls = item.attachments.map((a: Attachment) => getFullImageUrl(a.fileUrl));
                                                            setActiveConsignmentImageUrls(urls);
                                                            setOpenImageSlider(true);
                                                        }}
                                                    >
                                                        {item.attachments.length} Ek
                                                    </Button>
                                                ) : ('-')}
                                            </StyledTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Alert severity="info" sx={{ mb: 3 }}>Aktif genel zimmet kaydı bulunmamaktadır.</Alert>
                    )}

                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>2. Araç Zimmet Kayıtları ({activeCarConsignment.length}) </Typography>


                    {activeCarConsignment.length > 0 ? (
                        <TableContainer component={Paper} sx={{ mb: 3 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f0f8ff' }}>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Plaka (Marka)</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Model</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Veriliş Tarihi</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Açıklama</StyledTableCell>
                                        <StyledTableCell sx={{ fontWeight: 'bold' }}>Ekler</StyledTableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {/* ⭐️ حلقه زدن بر روی لیست خودروها ⭐️ */}
                                    {activeCarConsignment.map((item, index) => (
                                        <TableRow key={index}>
                                            <StyledTableCell>{item.name}</StyledTableCell>
                                            <StyledTableCell>{item.code}</StyledTableCell>
                                            <StyledTableCell>{formatDateDisplay(item.assignmentDate)}</StyledTableCell>
                                            <StyledTableCell>{item.description || '-'}</StyledTableCell>
                                            <StyledTableCell>
                                                {item.attachments?.length > 0 ? (
                                                    <Button
                                                        size="small" variant="contained" color="warning" startIcon={<IconFileDownload width={16} />}
                                                        onClick={() => {
                                                            setAttachmentsToView(item.attachments);
                                                            setOpenAttachmentsModal(true);
                                                        }}>
                                                        {item.attachments.length} Ek İndir
                                                    </Button>
                                                ) : ('-')}
                                            </StyledTableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Alert severity="success" sx={{ mb: 3 }}>Aktif araç zimmeti bulunmamaktadır.</Alert>
                    )}


                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={handleDownloadConsignmentPDF}
                        color="primary"
                        variant="contained"
                        startIcon={<IconFileDownload />}
                    >
                        İlişik Kesme PDF İndir
                    </Button>
                    <Button onClick={() => setOpenActiveConsignmentsModal(false)} color="secondary" variant="outlined">
                        Kapat
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openImageSlider} onClose={() => setOpenImageSlider(false)} maxWidth="md" fullWidth>
                <DialogTitle>Zimmet Ek Belgeleri ({activeConsignmentImageUrls.length} Adet)</DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {activeConsignmentImageUrls.length > 0 ? (
                            activeConsignmentImageUrls.map((fullUrl, index) => {
                                const fileName = fullUrl.split('/').pop();
                                const isImage = fullUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i); // 💡 تشخیص بهتر فرمت عکس
                                return (
                                    <Box key={index} sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
                                        {isImage ? (
                                            // 💡 پیش‌نمایش عکس
                                            <CardMedia component="img" image={fullUrl} sx={{ maxHeight: 300, objectFit: 'contain', mt: 1, mb: 1 }} alt={fileName} />
                                        ) : (
                                            // 💡 اگر عکس نبود، فقط آیکون و هشدار
                                            <Typography variant="caption" color="textSecondary" display="block">Önizleme mevcut değil. İndirmek için tıklayınız.</Typography>
                                        )}
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            href={fullUrl}
                                            target="_blank"
                                            // 💡 اضافه کردن attribute download برای دانلود مستقیم
                                            download={fileName}
                                            startIcon={<IconFileDownload />}
                                            size="small"
                                            sx={{ mt: 1 }}
                                        >
                                            İndir
                                        </Button>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography>Seçili kayıtta dosya bulunmamaktadır.</Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>

                    <Button onClick={() => setOpenImageSlider(false)} color="primary">Kapat</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openAttachmentsModal} onClose={() => setOpenAttachmentsModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Ek Belgeleri İndir ({attachmentsToView.length} adet)</DialogTitle>
                <DialogContent dividers>
                    {attachmentsToView.length > 0 ? (
                        <Stack spacing={1}>
                            {/* {attachmentsToView.map((attachment, index) => {
                                const fileName = attachment.fileUrl.split('/').pop() || `Dosya ${index + 1}`;
                                const handleDownloadLinkClick = (fileUrl: string) => {
                                    if (!fileUrl) { showAlert('Dosya adresi geçersiz.', 'error'); return; }
                                    const url = `${server.urldpwonload}${fileUrl}`;
                                    window.open(url, '_blank');
                                    showAlert(`"${fileUrl.split('/').pop()}" dosyası indiriliyor.`, 'info');
                                };

                                return (
                                    <Button
                                        key={index}
                                        fullWidth variant="outlined"
                                        onClick={() => handleDownloadLinkClick(attachment.fileUrl)}
                                        sx={{ mt: 1 }}
                                        startIcon={<IconFileDownload />}
                                    >
                                        {fileName}
                                    </Button>
                                );
                            })} */}

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
                                        onClick={() => handleDownloadLinkClick(attachment.fileUrl)}
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

            {/* EXCLUSIVE NEW: Belgeleri İndir Modal (Personnel Files) */}
            <Dialog open={openPersonnelFilesModal} onClose={() => setOpenPersonnelFilesModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Personel Belgeleri ({selectedPersonnelForFiles?.name} {selectedPersonnelForFiles?.family})
                </DialogTitle>
                <DialogContent dividers>
                    {personnelFilesToDownload.length > 0 ? (
                        <Stack spacing={1}>
                            {/* {personnelFilesToDownload.map((attachment, index) => {
                                const fileName = attachment.fileUrl.split('/').pop() || `Dosya ${index + 1}`;
                                const downloadUrl = `${server.urldpwonload}${attachment.fileUrl}`;

                                return (
                                    <Button
                                        key={index}
                                        fullWidth
                                        variant="outlined"
                                        href={downloadUrl}
                                        target="_blank"
                                        download={fileName}
                                        sx={{ mt: 1 }}
                                        startIcon={<IconFileDownload />}
                                    >
                                        {fileName}
                                    </Button>
                                );
                            })} */}

                            {personnelFilesToDownload.map((attachment, index) => {
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
                                        onClick={() => handleDownloadLinkClick(attachment.fileUrl)}
                                        sx={{ mt: 1 }}
                                    >
                                        {finalFileName || `Dosya ${index + 1}`}
                                    </Button>
                                );
                            })}
                        </Stack>
                    ) : (
                        <Typography>Bu personel için kayıtlı ek dosya bulunmamaktadır.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPersonnelFilesModal(false)} color="primary" variant="outlined">Kapat</Button>
                </DialogActions>
            </Dialog>


            {/* 🆕 NEW: Maaş Düzenleme Modal */}
            <Dialog open={openSalaryEditModal} onClose={handleCloseSalaryEditModal} maxWidth="xs" fullWidth>
                <DialogTitle>Personel Maaşını Düzenle</DialogTitle>
                <DialogContent dividers>
                    {personnelToUpdateSalary ? (
                        <Stack spacing={2}>
                            <Typography variant="subtitle1">
                                Personel:   {personnelToUpdateSalary.name} {personnelToUpdateSalary.family}
                            </Typography>
                            <Typography variant="body2">
                                TC Kimlik:   {personnelToUpdateSalary.identityNumber}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Mevcut Maaş:   {personnelToUpdateSalary.salary !== null ?
                                    cleanAndFormatPrice(personnelToUpdateSalary.salary) : '—'} TL

                            </Typography>

                            <CustomFormLabel required>Yeni Maaş (TL)</CustomFormLabel>
                            <CustomTextField
                                type="text"
                                size="small"
                                fullWidth
                                placeholder="Yeni maaşı girin"
                                // مقدار را فرمت شده نمایش بده، اگر null بود رشته خالی
                                value={newSalary !== null ? cleanAndFormatPrice(newSalary) : ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const rawValue = e.target.value.replace(/\D/g, '');
                                    setNewSalary(rawValue === '' ? null : Number(rawValue));
                                }}
                                // onKeyDown اینجا اختیاری است چون در onChange همه غیرعددی‌ها را فیلتر می‌کنیم
                                inputProps={{
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*'
                                }}
                            />
                        </Stack>
                    ) : (
                        <Typography color="error">Personel bilgileri yüklenemedi.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSalaryEditModal} color="secondary">İptal</Button>
                    <Button
                        onClick={submitSalaryUpdate}
                        color="info"
                        variant="contained"
                        disabled={loadingSalaryUpdate || newSalary === null || newSalary <= 0}
                    >
                        {loadingSalaryUpdate ? 'Güncelleniyor...' : 'Maaşı Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Backdrop - unchanged */}
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