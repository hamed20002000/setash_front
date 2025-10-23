
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    TableContainer, Table, TableHead, TableRow, TableBody, TablePagination,
    Typography, Chip, Menu, IconButton, ListItemIcon, Box, Grid, Stack, Button,
    Alert, TextField, InputAdornment, ToggleButtonGroup, ToggleButton as MuiToggleButton,
    TableCell as MuiTableCell, MenuItem as MuiMenuItem, TableSortLabel, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress, Autocomplete,
    RadioGroup, FormControlLabel, Radio, FormLabel, Divider, Stepper, Step, StepLabel
} from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import BoltIcon from "@mui/icons-material/Bolt";
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import DoneRoundedIcon from '@mui/icons-material/DoneRounded';
import { IconDots, IconEdit, IconTrash, IconSearch, IconFileDownload, IconX, IconEye } from "@tabler/icons-react";
import BlankCard from "src/components/shared/BlankCard";
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "src/components/forms/theme-elements/CustomTextField";
import { useTooltip, CustomTooltip } from "src/context/TooltipContext";
import { useAuth } from "src/context/AuthContext";
import axios from "axios";
import server from "src/assets/address.json";
import { tr } from "date-fns/locale";
import { format } from "date-fns";


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

// ----- Delete Personnel -----
import DeletePersonnel from "./DeletePersonnel";

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

// ------------ Types ------------
type RecordStatus = 0 | 1 | 2; // 0=Aktif, 1=Pasif, 2=Silindi
enum EducationStatus {
    Ilkokul = 0, Ortaokul, Lise, OnLisans, Lisans, YuksekLisans, Doktora
}
interface Position {
    id: number;
    title: string;
}
export interface PersonnelType {
    id: number;
    name: string;
    family: string;
    identityNumber: string;
    position: Position;
    workStartDate: string | null; // yyyy-MM-dd
    workEndDate: string | null;   // yyyy-MM-dd
    insuranceNumber: string;
    sex: number;                 // radio
    salaryType: number;          // radio
    salaryAccrualMethod: number; // radio
    group: number;               // radio
    birthPlace: string;          // ✅ دستی (TextField)
    birthDate: string | null;    // yyyy-MM-dd
    maritalStatus: number;       // radio
    fatherName: string;
    bloodType: number;           // radio
    address: string;
    educationStatus: number;     // radio
    iban: string;
    telephone: string;
    mobile: string;
    recordStatus: RecordStatus;
    createAt: string; // ISO
    positionId?: number | null;
    statusText?: string;
}

type PositionOption = { id: number; title: string };

const statusText = (s?: number) =>
    (s === 0 ? "Aktif" : s === 1 ? "Pasif" : "Silindi");



const formatDateDisplay = (dateString: string | null): string => {
    if (!dateString) return "—";
    try {
        const [y, m, dd] = dateString.split("-").map(Number);
        const date = new Date(y, (m || 1) - 1, dd || 1);
        return format(date, "dd MMMM yyyy", { locale: tr });
    } catch {
        return "Geçersiz Tarih";
    }
};

// ------------ Sorting helpers ------------
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
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
};

// ------------ Component ------------
const ListPersonnel: React.FC = () => {
    const navigate = useNavigate();
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

    // Alerts (TR)
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] =
        useState<"success" | "error" | "warning" | "info">("info");
    useEffect(() => {
        let t: any;
        if (alertMessage) t = setTimeout(() => setAlertMessage(null), 5000);
        return () => clearTimeout(t);
    }, [alertMessage]);
    const showAlert = (m: string, s: typeof alertSeverity) => {
        setAlertMessage(m); setAlertSeverity(s);
    };

    // Top form visibility & editing
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [loadingButton, setLoadingButton] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Stepper
    const [activeStep, setActiveStep] = useState(0);
    const [showStepErrors, setShowStepErrors] = useState(false);
    const [isBlinking, setIsBlinking] = useState(true);

    // Lists & filters
    const [personnelList, setPersonnelList] = useState<PersonnelType[]>([]);
    const [positions, setPositions] = useState<PositionOption[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [orderBy, setOrderBy] = useState<keyof PersonnelType>("createAt");
    const [order, setOrder] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    // Row menu & dialogs
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedRowForMenu, setSelectedRowForMenu] = useState<PersonnelType | null>(null);
    const openMenu = Boolean(anchorEl);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [personnelIdToDelete, setPersonnelIdToDelete] = useState<number | null>(null);

    // Tek indirme butonu için kapsam: tüm liste veya tek satır
    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [downloadScope, setDownloadScope] = useState<"all" | "row">("all");
    const [rowForDownload, setRowForDownload] = useState<PersonnelType | null>(null);

    const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
    const [selectedRowForDetails, setSelectedRowForDetails] = useState<PersonnelType | null>(null);

    // --- labels
    const SEX_LABELS = ["Erkek", "Kadın"] as const;
    const SALARY_TYPE_LABELS = ["Aylık", "Günlük"] as const;
    const ACCRUAL_LABELS = ["Brüt", "Net"] as const;
    const GROUP_LABELS = ["Emekli", "Normal", "Engelli"] as const; // 0/1/2
    const MARITAL_LABELS = ["Bekâr", "Evli", "Dul"] as const;
    const BLOOD_LABELS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;


    // جایگزینِ addPdfHeader
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        // فونت‌ها
        const d: any = doc;
        d.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        d.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        d.addFileToVFS("Arial.ttf", ArialFont);
        d.addFont("Arial.ttf", "Arial", "normal");

        doc.setFont("NotoSans", "normal");
        // هرگونه فاصله‌ی کاراکتری/کلمه را صفر کن تا حروف از هم باز نشوند
        // @ts-ignore
        if ((doc as any).setCharSpace) (doc as any).setCharSpace(0);
        // @ts-ignore
        if ((doc as any).setWordSpace) (doc as any).setWordSpace(0);

        // لوگو (بزرگ‌تر از قبل، ثابت در گوشه راست)
        const logoW = 48, logoH = 30;
        const margin = 36; // ~0.5in
        doc.addImage(Logo as any, "PNG", pageWidth - margin - logoW, margin - 6, logoW, logoH);

        // عنوان وسط
        doc.setFontSize(16);
        doc.text(title, pageWidth / 2, margin + 2, { align: "center" });

        // تاریخ گزارش (در یک خطِ جدا)
        doc.setFontSize(10);
        const labelX = margin, labelY = margin + 22;
        doc.text("Rapor Tarihi:", labelX, labelY);
        doc.text(format(new Date(), "dd MMMM yyyy", { locale: tr }), labelX + 65, labelY);
    };

    // جایگزینِ addPdfFooter
    const addPdfFooter = (doc: jsPDF) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottom = 36;

        const company = [
            "SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.",
            "Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR  Tel: +90 (232) 347 74 74 pbx  Fax: +90 (232) 347 77 11",
            "http://www.setasbilisim.com.tr  e-mail:setas@setasbilisim.com.tr",
        ];

        doc.setFont("NotoSans", "normal");
        doc.setFontSize(8);

        // متن‌های بلند را قبل از چاپ خرد کن
        const lines = [
            ...doc.splitTextToSize(company[0], pageWidth - 2 * bottom),
            ...doc.splitTextToSize(company[1], pageWidth - 2 * bottom),
            ...doc.splitTextToSize(company[2], pageWidth - 2 * bottom),
        ];

        let y = pageHeight - bottom - 16;
        lines.forEach((ln) => { doc.text(ln as any, pageWidth / 2, y, { align: "center" }); y += 10; });

        // امضا
        doc.setFontSize(10);
        doc.text("İmza", pageWidth - bottom, pageHeight - 10, { align: "right" });
        doc.line(pageWidth - bottom - 50, pageHeight - 15, pageWidth - bottom, pageHeight - 15);

        // شماره صفحه
        const d: any = doc;
        const pageNo = d.internal.getCurrentPageInfo().pageNumber;
        const pageCount = d.internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNo} / ${pageCount}`, bottom, pageHeight - 10);
    };

    const toPairsForPerson = (p: PersonnelType): Array<[string, string]> => {
        debugger
        const positionTitle = positions.find(x => x.id === (Number(p.position.id) ?? -1))?.title || "—";
        return [
            ["Ad", p.name || "—"],
            ["Soyad", p.family || "—"],
            ["TC Kimlik", p.identityNumber || "—"],
            ["Başlangıç", formatDateDisplay(p.workStartDate)],
            ["Bitiş", formatDateDisplay(p.workEndDate)],
            ["Sigorta No", p.insuranceNumber || "—"],
            ["Pozisyon", positionTitle],  // تغییر به نام پوزیشن
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
            ["Eğitim", ["İlkokul", "Ortaokul", "Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora"][p.educationStatus] ?? "—"],
            ["IBAN", p.iban || "—"],
            ["Telefon", p.telephone || "—"],
            ["Mobil", p.mobile || "—"],
            ["Durum", statusText(p.recordStatus)],
            ["Oluşturulma", formatDateDisplay(p.createAt?.slice(0, 10) || null)],
        ];
    };


    // جایگزینِ pdfForRows
    const pdfForRows = (rows: PersonnelType[], filename: string) => {
        const doc = new jsPDF("p", "pt", "a4");
        // فونت پایه
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");

        const topMargin = 100;   // زیر هدر
        const sideMargin = 40;
        const bottomMargin = 70; // جا برای فوتر

        rows.forEach((p, idx) => {
            if (idx > 0) doc.addPage();
            addPdfHeader(doc, "Personel Detay Raporu");

            const pairs: Array<[string, string]> = [
                ["Ad", p.name || "—"],
                ["Soyad", p.family || "—"],
                ["TC Kimlik", p.identityNumber || "—"],
                ["Başlangıç", formatDateDisplay(p.workStartDate)],
                ["Bitiş", formatDateDisplay(p.workEndDate)],
                ["Sigorta No", p.insuranceNumber || "—"],
                ["Pozisyon", positions.find(x => x.id === (Number(p.position.id) ?? -1))?.title || "—"],  // استفاده از position.id
                ["Cinsiyet", ["Erkek", "Kadın"][p.sex] ?? "—"],
                ["Ücret Tipi", ["Aylık", "Günlük"][p.salaryType] ?? "—"],
                ["Tahakkuk", ["Brüt", "Net"][p.salaryAccrualMethod] ?? "—"],
                ["Grup", ["Emekli", "Normal", "Engelli"][p.group] ?? "—"],
                ["Doğum Yeri", p.birthPlace || "—"],
                ["Doğum Tarihi", formatDateDisplay(p.birthDate)],
                ["Medeni Durum", ["Bekâr", "Evli", "Dul"][p.maritalStatus] ?? "—"],
                ["Baba Adı", p.fatherName || "—"],
                ["Adres", p.address || "—"],
                ["Eğitim", ["İlkokul", "Ortaokul", "Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora"][p.educationStatus] ?? "—"],
                ["IBAN", p.iban || "—"],
                ["Telefon", p.telephone || "—"],
                ["Mobil", p.mobile || "—"],
                ["Durum", p.recordStatus === 0 ? "Aktif" : p.recordStatus === 1 ? "Pasif" : "Silindi"],
                ["Oluşturulma", formatDateDisplay(p.createAt?.slice(0, 10) || null)],
            ];

            autoTable(doc, {
                startY: topMargin,
                head: [["Alan", "Değer"]],
                body: pairs,
                theme: "grid",
                styles: {
                    font: "NotoSans",
                    fontStyle: "normal",
                    fontSize: 10,
                    cellPadding: 4,
                    overflow: "linebreak",   // ← wrap
                },
                headStyles: {
                    fillColor: [242, 242, 242],
                    textColor: [0, 0, 0],
                    font: "NotoSans",
                    fontStyle: "normal",
                },
                columnStyles: {
                    0: {
                        cellWidth: 150,
                        font: "NotoSans",
                        fontStyle: "normal",
                    },
                    1: { cellWidth: "auto" }, // اجازه بده تا انتهای صفحه برود و wrap شود
                },
                margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin },
                didDrawPage: () => { addPdfHeader(doc, "Personel Detay Raporu"); addPdfFooter(doc); },
                showHead: "everyPage",
            });
        });

        doc.save(filename);
    };



    const excelForRows = async (rows: PersonnelType[], filename: string) => {
        const wb = new Excel.Workbook();

        rows.forEach((p) => {
            const sheetName = `Personel_${(p.name || "")}_${(p.family || "")}`.replace(/[\\/*?:[\]]/g, "_").slice(0, 31) || `Personel_${p.id}`;
            const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });

            // Header
            const title = ws.addRow([`Personel Detay Raporu - ${(p.name || "")} ${(p.family || "")}`.trim()]);
            title.font = { name: "Times New Roman", size: 12, bold: true };
            ws.mergeCells(`A1:B1`);
            title.getCell(1).alignment = { horizontal: "center" };
            ws.mergeCells(`A2:B2`);
            ws.addRow([]);

            // Table
            const hdr = ws.addRow(["Alan", "Değer"]);
            hdr.font = { name: "NotoSans", bold: true };
            hdr.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } }));

            const pairs = toPairsForPerson(p); // استفاده از تابع اصلاح‌شده
            pairs.forEach(([k, v]) => ws.addRow([k, v ?? "—"]));

            ws.columns = [{ width: 24 }, { width: 60 }];
        });

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), filename);
    };


    // Form state
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
        birthPlace: "",             // ✅ دستی
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
    };
    const [form, setForm] = useState<PersonnelType>(initialForm);

    // Refs
    const firstRequiredRef = useRef<HTMLInputElement>(null);

    // ---------- API helpers ----------
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
                group: Number(x.group ?? 0),                 // 0/1/2
                birthPlace: String(x.birthPlace ?? ""),      // ✅ رشته‌ی دستی
                birthDate: x.birthDate ? String(x.birthDate).slice(0, 10) : null,
                maritalStatus: Number(x.maritalStatus ?? 0),
                fatherName: x.fatherName ?? "",
                bloodType: Number(x.bloodType ?? 0),         // 0..7
                address: x.address ?? "",
                educationStatus: Number(x.educationStatus ?? 0),
                iban: x.iban ?? "",
                telephone: x.telephone ?? "",
                mobile: x.mobile ?? "",
                recordStatus: Number(x.recordStatus ?? 0) as RecordStatus,
                createAt: x.createAt ?? "",
                position: x.position ?? { id: -1, title: "Pazition not available" },
                statusText: statusText(x.recordStatus),
            }));
            setPersonnelList(list);
        } catch (e: any) {
            showAlert(e?.response?.data?.message || "Personel listesi alınamadı.", "error");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { getAllPersonnels(); getAllPositions(); }, []);

    // ---------- Filters / sorting ----------
    const handleStatusFilterChange = (_: any, v: "all" | "active" | "inactive" | null) => {
        if (v) { setStatusFilter(v); setPage(0); }
    };
    const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(e.target.value, 10)); setPage(0);
    };
    const handleRequestSort = (property: keyof PersonnelType) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
        setPage(0);
    };

    const safeLower = (s?: string) => (s ?? "").toLowerCase();
    const filtered = useMemo(() => {
        const q = safeLower(searchTerm.trim());
        return personnelList.filter((p) => {
            const matches =
                !q ||
                safeLower(p.name).includes(q) ||
                safeLower(p.family).includes(q) ||
                `${safeLower(p.name)} ${safeLower(p.family)}`.includes(q) ||
                safeLower(p.identityNumber).includes(q);
            const stat =
                statusFilter === "all" ||
                (statusFilter === "active" && p.recordStatus === 0) ||
                (statusFilter === "inactive" && p.recordStatus === 1);
            return matches && stat;
        });
    }, [personnelList, searchTerm, statusFilter]);

    const sorted = useMemo(() => stableSort(filtered, getComparator(order, orderBy)), [filtered, order, orderBy]);
    const paginated = useMemo(() => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sorted, page, rowsPerPage]);

    // ---------- Row menu ----------
    const handleClickMenu = (e: React.MouseEvent<HTMLButtonElement>, row: PersonnelType) => {
        setAnchorEl(e.currentTarget);
        setSelectedRowForMenu(row);
    };
    const handleCloseMenu = () => { setAnchorEl(null); setSelectedRowForMenu(null); };

    useEffect(() => {
        const timer = setTimeout(() => setIsBlinking(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    const onEditRow = (row: PersonnelType) => {
        setForm({ ...row });  // فرم را با اطلاعات پرسنل ویرایش‌شده پر می‌کنیم
        setEditingId(row.id);  // ذخیره کردن id برای ویرایش
        setIsFormVisible(true);  // نمایش فرم
        setActiveStep(0);  // شروع از اولین مرحله فرم
        setShowStepErrors(false);  // حذف ارورهای مرحله قبلی

        // پر کردن مقدار PositionId در فرم با استفاده از منطق شما
        setForm(prevForm => ({ ...prevForm, positionId: row.position.id }));  // مقدار positionId را از رکورد به فرم می‌دهیم
        handleCloseMenu();  // بستن منو
    };




    const handleOpenDelete = () => {
        if (selectedRowForMenu) {
            setPersonnelIdToDelete(selectedRowForMenu.id);
            setOpenDeleteModal(true);
        }
        handleCloseMenu();
    };

    const handleClickDetails = (row: PersonnelType) => {
        setSelectedRowForDetails(row);
        setOpenDetailsDialog(true);
    };

    const openDownloadChooserForAll = () => {
        if (!sorted.length) { showAlert("İndirilecek veri bulunamadı.", "warning"); return; }
        setDownloadScope("all"); setRowForDownload(null); setOpenDownloadModal(true);
    };
    const openDownloadChooserForRow = () => {
        setDownloadScope("row"); setRowForDownload(selectedRowForMenu); setOpenDownloadModal(true); handleCloseMenu();
    };

    const resetFormAndState = () => {
        setForm(initialForm);
        setIsFormVisible(false);
        setEditingId(null);
        setActiveStep(0);
        setShowStepErrors(false);
    };

    // ---------- Step validation ----------
    // ---------- Step validation ----------
    const isStepValid = (step: number) => {
        switch (step) {
            case 0: // Kimlik
                return Boolean(form.name?.trim())
                    && Boolean(form.family?.trim())
                    && Boolean(form.identityNumber?.trim())
                    && form.positionId != null;            // ← Position اجباری
            case 1: // İş Bilgileri
                return Boolean(form.workStartDate);
            case 2: // Kişisel
                return Boolean(form.birthDate)           // ← تاریخ تولد اجباری
                    && Boolean(form.fatherName?.trim())    // ← نام پدر اجباری
                    && Boolean(form.address?.trim());      // ← آدرس اجباری
            case 3: // İletişim
                return Boolean(form.mobile?.trim() || form.telephone?.trim());
            default:
                return true;
        }
    };


    const handleNextStep = () => {
        if (!isStepValid(activeStep)) { setShowStepErrors(true); return; }
        setShowStepErrors(false);
        setActiveStep((s) => Math.min(3, s + 1));
    };
    const handlePrevStep = () => { setShowStepErrors(false); setActiveStep((s) => Math.max(0, s - 1)); };

    // ---------- Create / Update ----------
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
                birthPlace: form.birthPlace,   // ✅ دستی
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
            };
            const res = await axios.post(`${server.baseurl}${server.hr}create-personnel`, payload, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.data?.httpStatusCode === 201 || res.status === 201) {
                showAlert("Yeni personel kaydı oluşturuldu!", "success");
                resetFormAndState();
                getAllPersonnels();
            } else {
                showAlert(res.data?.message || "Kayıt oluşturulamadı.", "error");
            }
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
                birthPlace: form.birthPlace,   // ✅ دستی
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
        if (!authToken) {
            showAlert('Lütfen giriş yapın.', 'warning');
            navigate("/");
        }
        try {
            const response = await axios.put(
                server.baseurl + server.hr + "update-personnel",
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
                showAlert('Personel başarıyla güncellendi!', 'success');
                resetFormAndState();
                getAllPersonnels();
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

    const handleDownloadChoosePDF = () => {
        if (downloadScope === "all") {
            pdfForRows(sorted, "Personel_Detay_Raporu.pdf"); // هر نفر یک صفحه
        } else if (rowForDownload) {
            const fileSlug = `${rowForDownload.name || ""}_${rowForDownload.family || ""}`.trim().replace(/\s+/g, "_");
            pdfForRows([rowForDownload], `Personel_Detay_${fileSlug || rowForDownload.id}.pdf`);
        }
        setOpenDownloadModal(false);
    };

    const handleDownloadChoosePDFTable = () => {
        const doc = new jsPDF("landscape", "pt", "a4");  // صفحه به‌صورت لندسکیپ
        // فونت پایه
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        doc.setFont("NotoSans", "normal");

        const topMargin = 100;   // فاصله از بالای صفحه
        const sideMargin = 40;
        const bottomMargin = 70; // فاصله از پایین صفحه

        // استفاده از `paginated` یا `filtered` برای داده‌ها
        const rows = paginated; // یا `filtered` رو هم می‌توانید استفاده کنید

        // اینجا می‌خواهیم تمام داده‌ها رو در یک جدول افقی قرار بدیم
        const allData: any[] = [];

        // ایجاد یک ردیف برای عنوان‌ها
        const headerRow = [
            "Ad", "Soyad", "TC Kimlik", "Başlangıç", "Bitiş", "Sigorta No", "Pozisyon",
            "Cinsiyet", "Ücret Tipi", "Tahakkuk", "Grup", "Doğum Yeri", "Doğum Tarihi",
            "Medeni Durum", "Baba Adı", "Adres", "Eğitim", "IBAN", "Telefon", "Mobil",
            "Durum", "Oluşturulma"
        ];

        // اضافه کردن اطلاعات به جدول
        rows.forEach((p) => {
            const row = [
                p.name || "—", p.family || "—", p.identityNumber || "—", formatDateDisplay(p.workStartDate),
                formatDateDisplay(p.workEndDate), p.insuranceNumber || "—", positions.find(x => x.id === (Number(p.position.id) ?? -1))?.title || "—",
                ["Erkek", "Kadın"][p.sex] ?? "—", ["Aylık", "Günlük"][p.salaryType] ?? "—",
                ["Brüt", "Net"][p.salaryAccrualMethod] ?? "—", ["Emekli", "Normal", "Engelli"][p.group] ?? "—",
                p.birthPlace || "—", formatDateDisplay(p.birthDate), ["Bekâr", "Evli", "Dul"][p.maritalStatus] ?? "—",
                p.fatherName || "—", p.address || "—", ["İlkokul", "Ortaokul", "Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora"][p.educationStatus] ?? "—",
                p.iban || "—", p.telephone || "—", p.mobile || "—", statusText(p.recordStatus), formatDateDisplay(p.createAt?.slice(0, 10) || null)
            ];
            allData.push(row);
        });

        // ساخت جدول در PDF
        autoTable(doc, {
            startY: topMargin,
            head: [headerRow],
            body: allData,
            theme: "grid",
            styles: {
                font: "NotoSans",
                fontStyle: "normal",
                fontSize: 8,
                cellPadding: 3,
                overflow: "linebreak",   // wrap
            },
            headStyles: {
                fillColor: [242, 242, 242],
                textColor: [0, 0, 0],
                font: "NotoSans",
                fontStyle: "normal",
            },
            columnStyles: {
                0: { cellWidth: 50 },  // تنظیم عرض ستون‌ها به‌طور مناسب
                1: { cellWidth: 50 },
                2: { cellWidth: 50 },
                // ... شما می‌توانید اندازه‌های عرض ستون‌ها رو تنظیم کنید
            },
            margin: { top: topMargin, bottom: bottomMargin, left: sideMargin, right: sideMargin },
            didDrawPage: () => { addPdfHeader(doc, "Personel Detay Raporu"); addPdfFooter(doc); },
            showHead: "everyPage",
        });

        doc.save("Personel_Tablo_Raporu.pdf");
    };
    ;



    const handleDownloadChooseExcel = async () => {
        const safeDate = format(new Date(), "yyyyMMdd-HHmm");
        if (downloadScope === "all") {
            await excelForRows(sorted, `Personel_Detay_Raporu_${safeDate}.xlsx`); // یک Worksheet برای هر نفر
        } else if (rowForDownload) {
            const fileSlug = `${rowForDownload.name || ""}_${rowForDownload.family || ""}`.trim().replace(/\s+/g, "_");
            await excelForRows([rowForDownload], `Personel_Detay_${fileSlug || rowForDownload.id}_${safeDate}.xlsx`);
        }
        setOpenDownloadModal(false);
    };

    const handleDownloadChooseExcelTable = async () => {
        const wb = new Excel.Workbook();

        // استفاده از `paginated` یا `filtered` برای داده‌ها
        const rows = paginated; // یا `filtered` رو هم می‌توانید استفاده کنید

        rows.forEach((p) => {
            const sheetName = `Personel_${(p.name || "")}_${(p.family || "")}`.replace(/[\\/*?:[\]]/g, "_").slice(0, 31) || `Personel_${p.id}`;
            const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: false }] });

            // Header
            const title = ws.addRow([`Personel Detay Raporu - ${(p.name || "")} ${(p.family || "")}`.trim()]);
            title.font = { name: "Times New Roman", size: 12, bold: true };
            ws.mergeCells(`A1:B1`);
            title.getCell(1).alignment = { horizontal: "center" };
            ws.mergeCells(`A2:B2`);
            ws.addRow([]);

            // اضافه کردن ردیف‌های داده‌ها به‌صورت افقی
            const headerRow = [
                "Ad", "Soyad", "TC Kimlik", "Başlangıç", "Bitiş", "Sigorta No", "Pozisyon",
                "Cinsiyet", "Ücret Tipi", "Tahakkuk", "Grup", "Doğum Yeri", "Doğum Tarihi",
                "Medeni Durum", "Baba Adı", "Adres", "Eğitim", "IBAN", "Telefon", "Mobil",
                "Durum", "Oluşturulma"
            ];
            ws.addRow(headerRow); // ردیف عنوان‌ها

            // اضافه کردن اطلاعات به‌صورت افقی
            const rowData = [
                p.name || "—", p.family || "—", p.identityNumber || "—", formatDateDisplay(p.workStartDate),
                formatDateDisplay(p.workEndDate), p.insuranceNumber || "—", positions.find(x => x.id === (Number(p.position.id) ?? -1))?.title || "—",
                ["Erkek", "Kadın"][p.sex] ?? "—", ["Aylık", "Günlük"][p.salaryType] ?? "—",
                ["Brüt", "Net"][p.salaryAccrualMethod] ?? "—", ["Emekli", "Normal", "Engelli"][p.group] ?? "—",
                p.birthPlace || "—", formatDateDisplay(p.birthDate), ["Bekâr", "Evli", "Dul"][p.maritalStatus] ?? "—",
                p.fatherName || "—", p.address || "—", ["İlkokul", "Ortaokul", "Lise", "Ön Lisans", "Lisans", "Yüksek Lisans", "Doktora"][p.educationStatus] ?? "—",
                p.iban || "—", p.telephone || "—", p.mobile || "—", statusText(p.recordStatus), formatDateDisplay(p.createAt?.slice(0, 10) || null)
            ];
            ws.addRow(rowData); // ردیف داده‌ها

            // تنظیم عرض ستون‌ها برای نمایش بهتر
            ws.columns = [
                { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 },
                { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 },
                { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }, { width: 24 }
            ];
        });

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), "Personel_Tablo_Raporu.xlsx");
    };



    // ---------- Render: Header/Form ----------
    const renderTopBar = (
        <div style={{ borderBottom: "1px solid", margin: "10px 0 30px 0", padding: "10px 15px 30px 15px" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} mt={2} mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" mb={{ xs: 1, sm: 0 }}>{editingId ? "Personel Düzenle" : "Yeni Personel Kaydı"}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
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
                            {["Kimlik", "İş Bilgileri", "Kişisel", "İletişim"].map((label) => (
                                <Step key={label}><StepLabel>{label}</StepLabel></Step>
                            ))}
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        required error={showStepErrors && !form.name?.trim()} helperText={showStepErrors && !form.name?.trim() ? "Bu alan zorunludur" : ""}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel fullWidth sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Soyad</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomTextField size="small" fullWidth value={form.family}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, family: e.target.value }))}
                                        required error={showStepErrors && !form.family?.trim()} helperText={showStepErrors && !form.family?.trim() ? "Bu alan zorunludur" : ""}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>TC Kimlik</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <CustomTextField size="small" fullWidth value={form.identityNumber}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, identityNumber: e.target.value }))}
                                        required error={showStepErrors && !form.identityNumber?.trim()} helperText={showStepErrors && !form.identityNumber?.trim() ? "Bu alan zorunludur" : ""}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Pozisyon</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Autocomplete
                                        options={positions}
                                        size="small"
                                        value={positions.find((p) => p.id === (Number(form.positionId) ?? -1)) || null}  // پیدا کردن پوزیشن با استفاده از positionId در فرم
                                        isOptionEqualToValue={(opt, val) => opt.id === val.id}  // بررسی اینکه گزینه انتخاب‌شده با مقدار در فرم برابر باشد
                                        onChange={(_, v) => setForm((f) => ({ ...f, positionId: v?.id ?? null }))}  // وقتی کاربر انتخاب می‌کند، مقدار positionId را به فرم اضافه می‌کنیم
                                        getOptionLabel={(o) => o.title}  // نمایش عنوان پوزیشن
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                placeholder="Pozisyon seçin"
                                                required
                                                error={showStepErrors && form.positionId == null}
                                                helperText={showStepErrors && form.positionId == null ? "Bu alan zorunludur" : ""}
                                            />
                                        )}
                                    />

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

                                            onChange={(next) => setForm((f) => ({ ...f, workStartDate: next }))}
                                            inputFormat="dd/MM/yyyy"
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    size="small"
                                                    fullWidth
                                                    error={showStepErrors && !form.workStartDate}
                                                    helperText={showStepErrors ? "Başlangıç tarihi zorunludur!" : ""}
                                                />
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

                                            onChange={(next) => setForm((f) => ({ ...f, workEndDate: next }))}
                                            inputFormat="dd/MM/yyyy"
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    size="small"
                                                    fullWidth
                                                    error={showStepErrors && !form.workEndDate}
                                                    helperText={showStepErrors ? "Başlangıç tarihi zorunludur!" : ""}
                                                />
                                            )}
                                        />
                                    </LocalizationProvider>



                                </Grid>

                                <Grid item xs={12} sm={6} md={2}><CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>Sigorta No</CustomFormLabel></Grid>
                                <Grid item xs={12} sm={6} md={10}>
                                    <CustomTextField size="small" fullWidth value={form.insuranceNumber}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, insuranceNumber: e.target.value }))}
                                    />
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
                                    {/* ✅ فیلد دستی */}
                                    <CustomTextField
                                        size="small"
                                        fullWidth
                                        placeholder="Doğum yeri girin"
                                        value={form.birthPlace}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, birthPlace: e.target.value }))}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={2} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Doğum Tarihi</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>

                                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={tr}>
                                        <DatePicker
                                            label="Doğum Tarihi"
                                            value={form.birthDate}

                                            onChange={(next) => setForm((f) => ({ ...f, birthDate: next }))}
                                            inputFormat="dd/MM/yyyy"
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    size="small"
                                                    fullWidth
                                                    error={showStepErrors && !form.birthDate}
                                                    helperText={showStepErrors ? "Başlangıç tarihi zorunludur!" : ""}
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, fatherName: e.target.value }))}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Adres</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={9}>
                                    <CustomTextField size="small" fullWidth multiline minRows={2} value={form.address}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, address: e.target.value }))}
                                    />
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
                                    <CustomTextField size="small" fullWidth value={form.iban} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, iban: e.target.value }))} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}>Telefon</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <CustomTextField size="small" fullWidth value={form.telephone}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                                        error={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim())}
                                        helperText={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim()) ? "Mobil veya Telefon zorunlu" : ""}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3} display="flex" alignItems="center">
                                    <CustomFormLabel sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }} required>Mobil</CustomFormLabel>
                                </Grid>
                                <Grid item xs={12} sm={6} md={9}>
                                    <CustomTextField size="small" fullWidth value={form.mobile}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                                        error={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim())}
                                        helperText={showStepErrors && !(form.mobile?.trim() || form.telephone?.trim()) ? "Mobil veya Telefon zorunlu" : ""}
                                    />
                                </Grid>
                            </Grid>
                        )}

                        {/* Stepper actions */}
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

    // ---------- Render: Toolbar ----------
    const renderToolbar = (
        <Box sx={{ p: 2 }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={7} md={8}>
                    <TextField
                        label="Personel Ara"
                        variant="outlined"
                        fullWidth
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                        InputProps={{ startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>) }}
                    />
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

    // ---------- Render: Table ----------
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
                                <StyledTableCell>
                                    <Typography variant="h6">Detay</Typography>
                                </StyledTableCell>
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
                                                {hasEditPermission && (
                                                    <MuiMenuItem onClick={() => selectedRowForMenu && onEditRow(selectedRowForMenu)}>
                                                        <ListItemIcon><IconEdit width={18} /></ListItemIcon>
                                                        Düzenle
                                                    </MuiMenuItem>
                                                )}
                                                {hasDeletePermission && (
                                                    <MuiMenuItem onClick={handleOpenDelete}>
                                                        <ListItemIcon><IconTrash width={18} /></ListItemIcon>
                                                        Silmek
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
                                                        <ListItemIcon><IconFileDownload width={18} /></ListItemIcon>
                                                        Bu satırı indir
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

            {/* Tek seçimli İndir modalı */}
            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <DialogTitle>Dosya Formatını Seçin</DialogTitle>
                <DialogContent>
                    <Stack direction="column" spacing={2}>
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={handleDownloadChoosePDF}>
                            PDF Olarak İndir
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={handleDownloadChooseExcel}>
                            Excel Olarak İndir
                        </Button>

                        {/* دکمه‌های جدید برای دانلود به‌صورت لندسکیپ */}
                        <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={handleDownloadChoosePDFTable}>
                            PDF Olarak İndir (Tablo)
                        </Button>
                        <Button variant="contained" color="success" startIcon={<IconFileDownload />} onClick={handleDownloadChooseExcelTable}>
                            Excel Olarak İndir (Tablo)
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadModal(false)} color="secondary">İptal</Button>
                </DialogActions>
            </Dialog>

            {/* Detay modalı */}
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
                    ) : (
                        <Typography>Veri yok.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetailsDialog(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListPersonnel;
