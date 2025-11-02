import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
    Box, Stack, Grid, Paper, Typography, Button, Alert, Chip,
    TextField, Checkbox, Autocomplete, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction, Tabs, Tab,
    IconButton
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { IconCheck, IconX, IconReportAnalytics, IconFileText, IconFileSpreadsheet, IconRefresh } from "@tabler/icons-react";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { tr } from "date-fns/locale";
import { format, addDays, isBefore, isAfter, isSameDay } from "date-fns";
import axios from "axios";
import server from "src/assets/address.json";
import { useTooltip, CustomTooltip } from "src/context/TooltipContext";
import { useAuth } from "src/context/AuthContext";
import BlankCard from "src/components/shared/BlankCard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NotoSansRegular } from "src/assets/fonts/NotoSans-Regular";
import Logo from "src/assets/images/logos/logo.png";
import Excel from "exceljs";
import { saveAs } from "file-saver";

import ListSetProjectPlanningImplementation from "../list-set-project-planning-implementation/ListSetProjectPlanningImplementation";

interface Project {
    id: string;
    title: string;
    code: string;
    startDate: string;
    endDate: string;
    recordStatus: number;
}

interface ForceMajorType { id: string; title: string; recordStatus: number; }

interface ProjectPlanning {
    id: string;
    startDate: string;
    endDate: string;
    recordStatus: number;
    project: { id: string; title: string; code: string };
}

interface ImplDate {
    id: string;
    startDate: string;
    endDate: string;
    recordStatus: number;
    forceMajorId?: number | null;
    forceMajor?: ForceMajorType | null;
    projectPlanning?: ProjectPlanning;
}

interface ApiResponse<T> {
    success: boolean;
    httpStatusCode: number;
    message: string;
    data: T;
}

/* ====== Utils ====== */
const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseISO = (s: string) => new Date(s);
const fmt = (d: Date | string) => {
    const date = typeof d === "string" ? parseISO(d) : d;
    return isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy", { locale: tr });
};

const dayRangeInclusive = (startISO: string, endISO: string): Date[] => {
    const start = toDateOnly(parseISO(startISO));
    const end = toDateOnly(parseISO(endISO));
    const days: Date[] = [];
    for (let d = start; !isAfter(d, end); d = addDays(d, 1)) days.push(d);
    return days;
};

/* ====== PDF/Excel helpers ====== */
const addPdfHeader = (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const docAny = doc as any;
    docAny.addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
    docAny.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.setFont("NotoSans");
    docAny.addImage(Logo, "PNG", pageWidth - 50, 30, 40, 25);
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, 35, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Rapor Tarihi: ${fmt(new Date())}`, 15, 45);
};
const addPdfFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.text(
        "SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.",
        pageWidth / 2, pageHeight - 30, { align: "center" }
    );
    doc.text(
        "Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11",
        pageWidth / 2, pageHeight - 26, { align: "center" }
    );
    doc.text(
        "http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr",
        pageWidth / 2, pageHeight - 22, { align: "center" }
    );
    const docAny = doc as any;
    const pageCount = docAny.internal.getNumberOfPages();
    doc.setFontSize(10);
    doc.text(`Sayfa ${docAny.internal.getCurrentPageInfo().pageNumber} / ${pageCount}`, 15, pageHeight - 10);
};

const exportPlanReportPdf = (
    project: Project | null,
    planning: ProjectPlanning | null,
    rows: { date: Date; status: "normal" | "force" | "none" }[],
    subtitle?: string
) => {
    const doc = new jsPDF();
    const docAny = doc as any;
    addPdfHeader(doc, "Proje – Planlama Uygulama Raporu");
    if (subtitle) { doc.setFontSize(10); doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 52, { align: "center" }); }

    const head = [["Proje", "Plan (Başlangıç–Bitiş)", "Tarih", "Durum"]];
    const body = rows.map(r => [
        project ? `${project.title} (${project.code})` : "-",
        planning ? `${fmt(planning.startDate)} – ${fmt(planning.endDate)}` : "-",
        fmt(r.date),
        r.status === "normal" ? "Kayıtlı" : r.status === "force" ? "Mücbir Sebep" : "—"
    ]);

    autoTable(docAny, {
        startY: 60,
        head,
        body,
        theme: "grid",
        styles: { font: "NotoSans", fontStyle: "normal", fontSize: 10, cellPadding: 2, overflow: "linebreak" },
        headStyles: { font: "NotoSans", fillColor: [242, 242, 242], textColor: [0, 0, 0] },
        didDrawPage: () => addPdfFooter(doc),
        margin: { top: 55, bottom: 40 }
    });

    doc.save(`Proje_${project?.code || "Rapor"}_Plan.pdf`);
};

const exportPlanReportExcel = async (
    project: Project | null,
    planning: ProjectPlanning | null,
    rows: { date: Date; status: "normal" | "force" | "none" }[]
) => {
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet("Plan Rapor");

    const title = `Proje – Planlama Uygulama Raporu`;
    const titleRow = ws.addRow([title]);
    titleRow.font = { name: "NotoSans", bold: true, size: 14 };
    ws.mergeCells(titleRow.number, 1, titleRow.number, 4);
    ws.addRow([`Rapor Tarihi: ${fmt(new Date())}`]);
    ws.addRow([]);

    ws.addRow(["Proje", project ? `${project.title} (${project.code})` : "-"]);
    ws.addRow(["Plan", planning ? `${fmt(planning.startDate)} – ${fmt(planning.endDate)}` : "-"]);
    ws.addRow([]);

    const header = ws.addRow(["Tarih", "Durum"]);
    header.font = { name: "NotoSans", bold: true };
    header.eachCell(c => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } }));

    rows.forEach(r => ws.addRow([fmt(r.date), r.status === "normal" ? "Kayıtlı" : r.status === "force" ? "Mücbir Sebep" : "—"]));
    ws.columns.forEach(col => (col.width = 24));

    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `Proje_${project?.code || "Rapor"}_Plan.xlsx`);
};

/* ====== Styles ====== */
const LeftTabs = styled(Tabs)(() => ({
    borderRight: 'none',
    minWidth: 120,
    paddingRight: 0,
    position: 'relative',
    '& .MuiTabs-indicator': {
        right: 0,          // اندیکاتور سمت راست
        left: 'auto',
        width: 3,          // ضخامت خط
        borderRadius: 0,
    },
}));

const DateChip = styled(Chip)(({ theme }) => ({
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1)
}));

/* ====== Component ====== */
type DayStatus = "none" | "normal" | "force";
type DayRow = { date: Date; status: DayStatus; id?: number | null };

const ListProjectPlanningImplementation = () => {
    const navigate = useNavigate();
    const authToken = localStorage.getItem("authToken");


    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const idsFromState =
        ((location.state as { notifIds?: string[] } | undefined)?.notifIds) ?? [];
    const idsFromSingleParam = (searchParams.get('ids') ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const idsFromRepeatedParams = searchParams.getAll('ids').filter(Boolean);
    const notifIds: number[] = (idsFromState.length ? idsFromState :
        (idsFromSingleParam.length ? idsFromSingleParam : idsFromRepeatedParams))
        .map(id => Number(id))
        .filter(id => Number.isFinite(id));
    // const hasIdsFilter = notifIds.length > 0;
    // const idsSet = new Set<number>(notifIds);


    const { isTooltipGloballyEnabled } = useTooltip();
    const { allowedOperations } = useAuth();
    const hasCreatePermission = useMemo(() => allowedOperations?.some(op => op.systemOperationName === "Eklemek") ?? false, [allowedOperations]);
    const hasDownloadPermission = useMemo(() => allowedOperations?.some(op => op.systemOperationName === "İndirmek ve Yazdırmak") ?? false, [allowedOperations]);

    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertSeverity, setAlertSeverity] = useState<"success" | "error" | "warning" | "info">("info");
    const alertTimer = useRef<number | null>(null);
    useEffect(() => () => { if (alertTimer.current) window.clearTimeout(alertTimer.current); }, []);
    const showAlert = useCallback((msg: string, sev: typeof alertSeverity) => {
        setAlertMessage(msg); setAlertSeverity(sev);
        if (alertTimer.current) window.clearTimeout(alertTimer.current);
        alertTimer.current = window.setTimeout(() => setAlertMessage(null), 5000);
    }, []);

    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const [forceMajors, setForceMajors] = useState<ForceMajorType[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const [plannings, setPlannings] = useState<ProjectPlanning[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const activePlanning: ProjectPlanning | null = plannings[activeTab] ?? null;

    const [dayRows, setDayRows] = useState<DayRow[]>([]);

    const [isForceMajor, setIsForceMajor] = useState(false);
    const [forceMajorId, setForceMajorId] = useState<number | null>(null);

    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const [filterFrom, setFilterFrom] = useState<Date | null>(null);
    const [filterTo, setFilterTo] = useState<Date | null>(null);

    const [openDownloadModal, setOpenDownloadModal] = useState(false);

    const [detailDateId, setDetailDateId] = useState<number | null>(null);

    const fetchProjects = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        setLoading(true);
        try {
            const res = await axios.get<ApiResponse<any[]>>(server.baseurl + server.warehouse + "get-project", {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.data?.httpStatusCode === 200) {
                const list: Project[] = (res.data.data || [])
                    .filter((p: any) => p.recordStatus === 0)
                    .map((p: any) => ({
                        id: String(p.id),
                        title: String(p.title),
                        code: String(p.code ?? ""),
                        startDate: String(p.startDate),
                        endDate: String(p.endDate),
                        recordStatus: Number(p.recordStatus)
                    }));
                setProjects(list);
            } else showAlert(res.data?.message || "Projeler alınamadı.", "error");
        } catch {
            showAlert("Projeler alınırken hata oluştu.", "error");
        } finally { setLoading(false); }
    }, [authToken, navigate, showAlert]);

    const fetchForceMajors = useCallback(async () => {
        if (!authToken) { navigate("/"); return; }
        try {
            const res = await axios.get<ApiResponse<ForceMajorType[]>>(server.baseurl + server.warehouse + "get-force-majors", {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.data?.httpStatusCode === 200) {
                setForceMajors((res.data.data || []).filter(f => f.recordStatus === 0));
            }
        } catch {
            // optional
        }
    }, [authToken, navigate]);

    const fetchPlanningsByProject = useCallback(async (projectId: string) => {
        if (!authToken) { navigate("/"); return; }
        setLoading(true);
        try {
            const res = await axios.get<ApiResponse<any[]>>(
                server.baseurl + server.warehouse + `get-project-planning-by-project-id/${projectId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            if (res.data?.httpStatusCode === 200) {
                const list: ProjectPlanning[] = (res.data.data || [])
                    .filter((x: any) => x.recordStatus === 0)
                    .map((x: any) => ({
                        id: String(x.id),
                        startDate: String(x.startDate),
                        endDate: String(x.endDate),
                        recordStatus: Number(x.recordStatus),
                        project: {
                            id: String(x.project?.id ?? projectId),
                            title: String(x.project?.title ?? selectedProject?.title ?? ""),
                            code: String(x.project?.code ?? selectedProject?.code ?? "")
                        }
                    }));
                setPlannings(list);
                setActiveTab(0);
            } else {
                setPlannings([]);
                showAlert(res.data?.message || "Planlar bulunamadı.", "warning");
            }
        } catch {
            setPlannings([]);
            showAlert("Planlar alınırken hata oluştu.", "error");
        } finally { setLoading(false); }
    }, [authToken, navigate, showAlert, selectedProject]);

    // دریافت وضعیت ثبت روزهای یک پلنینگ (با id هر روز)
    const fetchImplementationByPlanning = useCallback(async (planningId: string, startISO: string, endISO: string) => {
        if (!authToken) { navigate("/"); return; }
        setLoading(true);
        try {
            const url = server.baseurl + server.warehouse + `get-project-planning-implementation-dates-by-project-planning-id/${planningId}`;
            const res = await axios.get<ApiResponse<any>>(url, { headers: { Authorization: `Bearer ${authToken}` } });

            const days = dayRangeInclusive(startISO, endISO);

            const data = res.data?.data;
            const list: ImplDate[] = Array.isArray(data) ? data : (data ? [data] : []);

            const byTime = new Map<number, ImplDate>();
            list.forEach(x => {
                const t = toDateOnly(parseISO(x.startDate)).getTime();
                byTime.set(t, x);
            });

            const rows: DayRow[] = days.map(d => {
                const t = toDateOnly(d).getTime();
                const rec = byTime.get(t);
                const status: DayStatus = rec ? (rec.forceMajor ? "force" : "normal") : "none";
                return { date: d, status, id: rec ? Number(rec.id) : null };
            });

            setDayRows(rows);

            // پیشنهاد تاریخ باز
            const firstOpen = rows.find((r, idx) => r.status !== "normal" && rows.slice(0, idx).every(x => x.status === "normal"));
            setSelectedDay(firstOpen?.date ?? null);

            // نمایش خودکار آخرین روز normal هنگام بازشدن تب
            const lastNormal = [...rows].filter(r => r.status === "normal" && r.id).pop();
            setDetailDateId(lastNormal?.id ?? null);

        } catch {
            const days = dayRangeInclusive(startISO, endISO);
            setDayRows(days.map(d => ({ date: d, status: "none", id: null })));
            setSelectedDay(days[0] ?? null);
            setDetailDateId(null);
        } finally { setLoading(false); }
    }, [authToken, navigate]);

    /* ====== Effects ====== */
    useEffect(() => { fetchProjects(); fetchForceMajors(); }, [fetchProjects, fetchForceMajors]);

    // 1) projectId از query
    const projectIdFromQuery = searchParams.get('projectId') || null;

    // 2) گزینه‌های کمبو
    const projectOptions = useMemo(() => {
        if (!projects || projects.length === 0) return [];
        if (projectIdFromQuery) {
            // فقط همان پروژه‌ای که از نوتیف آمده
            return projects.filter(p => String(p.id) === String(projectIdFromQuery));
        }
        // در غیر این صورت، همه پروژه‌ها
        return projects;
    }, [projects, projectIdFromQuery]);

    // 3) انتخاب خودکار وقتی فقط یک گزینه داریم یا وقتی projectId آمده
    useEffect(() => {
        if (!projects.length) return;

        if (projectIdFromQuery) {
            const found = projects.find(p => String(p.id) === String(projectIdFromQuery));
            if (found) {
                setSelectedProject(found);
                return;
            }
        }

        // اگر هنوز انتخابی نداری و دقیقاً یک گزینه در کمبوست، همان را انتخاب کن (کیفی/اختیاری)
        if (!selectedProject && projectOptions.length === 1) {
            setSelectedProject(projectOptions[0]);
        }
    }, [projects, projectIdFromQuery, projectOptions, selectedProject]);

    // 4) اگر انتخاب فعلی دیگر در گزینه‌ها نیست (به‌خاطر فیلتر)، خالی‌اش کن
    useEffect(() => {
        if (selectedProject && !projectOptions.some(p => p.id === selectedProject.id)) {
            setSelectedProject(null);
        }
    }, [projectOptions, selectedProject]);






    // وقتی پروژه انتخاب شد، پلنینگ‌ها را بیاور
    useEffect(() => {
        if (selectedProject) {
            fetchPlanningsByProject(String(selectedProject.id));
        } else {
            setPlannings([]);
            setDayRows([]);
            setSelectedDay(null);
            setDetailDateId(null);
        }
    }, [selectedProject, fetchPlanningsByProject]);

    // وقتی تب پلنینگ عوض شد، وضعیت روزها را بیاور
    useEffect(() => {
        if (activePlanning) {
            fetchImplementationByPlanning(activePlanning.id, activePlanning.startDate, activePlanning.endDate);
        } else {
            setDayRows([]);
            setSelectedDay(null);
            setDetailDateId(null);
        }
        // reset force
        setIsForceMajor(false);
        setForceMajorId(null);
    }, [activePlanning, fetchImplementationByPlanning]);



    /* ====== Actions ====== */
    const canSubmitForDate = (d: Date) => {
        // تا همه روزهای قبلی "normal" نشوند، نمی‌توان ثبت کرد
        const idx = dayRows.findIndex(r => isSameDay(r.date, d));
        if (idx < 0) return false;
        const prevAllNormal = dayRows.slice(0, idx).every(r => r.status === "normal");
        return prevAllNormal;
    };

    // در بالای کامپوننت ListProjectPlanningImplementation
    const selectedRow = useMemo(() => {
        if (!selectedDay) return null;
        return dayRows.find(r => isSameDay(r.date, selectedDay)) || null;
    }, [selectedDay, dayRows]);

    const isForceCheckboxDisabled = useMemo(() => {
        // وقتی پلن نداریم یا تاریخ انتخاب نشده ⇒ غیرفعال
        if (!activePlanning || !selectedDay) return true;
        // اگر تاریخ انتخابی قبلاً normal شده ⇒ کلاً غیرفعال
        if (selectedRow?.status === "normal") return true;
        // اگر هنوز اجازه‌ی ثبت برای این تاریخ رو نداریم (روزهای قبل normal نیستند)
        if (!canSubmitForDate(selectedDay)) return true;
        // در بقیه حالت‌ها فعال
        return false;
    }, [activePlanning, selectedDay, selectedRow, canSubmitForDate]);


    const handleTabChange = useCallback((_: any, nextIndex: number) => {
        const firstRow = dayRows[0];
        const firstIsNormal = firstRow?.status === "normal";
        if (nextIndex > activeTab && !firstIsNormal) {
            showAlert("Önce bu planın ilk tarihini kaydetmelisiniz.", "warning");
            return;
        }
        setActiveTab(nextIndex);
    }, [activeTab, dayRows, showAlert]);

    const handleSubmit = async (mode: "normal" | "force") => {
        if (!activePlanning || !selectedDay) {
            showAlert("Plan veya tarih seçili değil.", "warning");
            return;
        }
        if (!authToken) { navigate("/"); return; }

        if (!canSubmitForDate(selectedDay)) {
            showAlert("Önce önceki gün(ler) için kayıt oluşturmalısınız.", "warning");
            return;
        }

        const fmId = mode === "force" ? (forceMajorId ?? 0) : null;
        if (mode === "force" && !fmId) {
            showAlert("Mücbir sebep seçiniz.", "warning");
            return;
        }

        try {
            // ارسال روز به صورت ISO از نیمه‌شب کلاینت (فعلاً بر اساس قرارداد فعلی)
            const start = toDateOnly(selectedDay);
            const payload = {
                projectPlanningId: Number(activePlanning.id),
                forceMajorId: fmId,
                startDate: start.toISOString(),
                endDate: start.toISOString()
            };
            const res = await axios.post(
                server.baseurl + server.warehouse + "create-project-planning-implementation-date",
                payload, { headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" } }
            );
            if (res.data?.httpStatusCode === 201) {
                showAlert("Kayıt oluşturuldu.", "success");
                // تازه‌سازی
                await fetchImplementationByPlanning(activePlanning.id, activePlanning.startDate, activePlanning.endDate);

                // اگر normal ثبت شد ⇒ جزئیات را همین‌جا نشان بده
                if (mode === "normal") {
                    setIsForceMajor(false);
                    setForceMajorId(null);
                    const newDateId = res.data?.data?.id || res.data?.data?.projectPlanningDateId || null;
                    if (newDateId) setDetailDateId(Number(newDateId));
                }
            } else {
                showAlert(res.data?.message || "Kayıt oluşturulamadı.", "error");
            }
        } catch (e: any) {
            if (e.response?.status === 401) { localStorage.removeItem("authToken"); navigate("/"); }
            showAlert(e.response?.data?.message || "Kayıt oluşturulurken hata oluştu.", "error");
        }
    };

    /* ====== Derived ====== */
    const filteredRows = useMemo(() => {
        if (!filterFrom && !filterTo) return dayRows;
        return dayRows.filter(r => {
            const d = toDateOnly(r.date);
            if (filterFrom && isBefore(d, toDateOnly(filterFrom))) return false;
            if (filterTo && isAfter(d, toDateOnly(filterTo))) return false;
            return true;
        });
    }, [dayRows, filterFrom, filterTo]);

    const todayRow = useMemo(() => {
        const t = toDateOnly(new Date());
        return dayRows.find(r => isSameDay(r.date, t)) || null;
    }, [dayRows]);

    const clearNotifFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('ids');
        next.delete('projectId');       // مهم
        setSearchParams(next, { replace: true });

        navigate(location.pathname, {
            replace: true,
            state: { ...(location.state as any), notifIds: [], projectId: undefined },
        });

        setSelectedProject(null);
    };


    /* ====== UI ====== */
    return (
        <>
            <Box sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>


                    <Stack direction="row" justifyContent="start" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                        <Typography variant="h5">Proje – Planlama Uygulama</Typography>
                        {notifIds.length > 0 && (
                            <Stack component="span" direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
                                <Chip
                                    label={`Bildirim filtresi: ${notifIds.length} id`}
                                    color="error"
                                    size="small"
                                />
                                <IconButton
                                    aria-label="Bildirim filtresini temizle"
                                    size="small"
                                    onClick={clearNotifFilter}
                                    sx={{ p: 0.5 }}
                                    title="Filtreyi temizle"
                                >
                                    <IconRefresh size={18} />
                                </IconButton>
                            </Stack>
                        )}

                    </Stack>

                    {/* Project + filters + report */}
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="stretch" flexGrow={1} justifyContent="flex-start">
                        <Autocomplete<Project>
                            options={projectOptions}
                            getOptionLabel={(o) => `${o.title} (${fmt(o.startDate)} – ${fmt(o.endDate)})`}
                            value={selectedProject}
                            onChange={(_, nv) => setSelectedProject(nv)}
                            isOptionEqualToValue={(a, b) => a.id === b?.id}
                            renderInput={(p) => (
                                <TextField
                                    {...p} size="small" label="Proje"
                                    placeholder="Proje seçin"
                                />
                            )}
                            sx={{ minWidth: 320 }}
                        />

                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                            <DatePicker
                                label="Başlangıç Filtre"
                                value={filterFrom}
                                inputFormat="dd/MM/yyyy"
                                onChange={(v) => setFilterFrom(v)}
                                renderInput={(params) => <TextField {...params} size="small" />}
                            />
                            <DatePicker
                                label="Bitiş Filtre"
                                value={filterTo}
                                inputFormat="dd/MM/yyyy"
                                onChange={(v) => setFilterTo(v)}
                                renderInput={(params) => <TextField {...params} size="small" />}
                            />
                        </LocalizationProvider>

                        {hasDownloadPermission && (
                            <CustomTooltip title={isTooltipGloballyEnabled ? "Seçili proje/plan için rapor indir" : ""}>
                                <span>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<IconReportAnalytics />}
                                        onClick={() => setOpenDownloadModal(true)}
                                        disabled={!selectedProject || !activePlanning}
                                    >
                                        Rapor
                                    </Button>
                                </span>
                            </CustomTooltip>
                        )}
                    </Stack>
                </Stack>

                {alertMessage && (
                    <Stack sx={{ width: "100%", mb: 3 }} spacing={2}>
                        <Alert severity={alertSeverity} onClose={() => setAlertMessage(null)}>{alertMessage}</Alert>
                    </Stack>
                )}

                <BlankCard>
                    <Box sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                            {/* Left: vertical tabs (plannings) */}
                            <Grid item xs={12} md={2}>
                                <Paper variant="outlined" sx={{ height: "100%", minHeight: 420 }}>
                                    <Typography variant="subtitle2" sx={{ px: 2, py: 1.5, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                                        Planlar
                                    </Typography>
                                    {loading && plannings.length === 0 ? (
                                        <Box display="flex" alignItems="center" justifyContent="center" height={360}>
                                            <CircularProgress size={20} />
                                            <Typography sx={{ ml: 1 }}>Yükleniyor...</Typography>
                                        </Box>
                                    ) : plannings.length > 0 ? (
                                        <LeftTabs
                                            orientation="vertical"
                                            value={activeTab}
                                            onChange={handleTabChange}
                                            variant="scrollable"
                                        >
                                            {plannings.map((p, idx) => (
                                                <Tab
                                                    key={p.id}
                                                    label={
                                                        <Box textAlign="left">
                                                            <Typography fontWeight={600} variant="body2">#{idx + 1}</Typography>
                                                            <Typography variant="caption">{fmt(p.startDate)}</Typography>
                                                        </Box>
                                                    }
                                                    sx={{ alignItems: "flex-start" }}
                                                />
                                            ))}
                                        </LeftTabs>
                                    ) : (
                                        <Box p={2}><Typography variant="body2" color="text.secondary">Önce bir proje seçiniz.</Typography></Box>
                                    )}
                                </Paper>
                            </Grid>

                            {/* Right: dates column and actions */}
                            <Grid item xs={12} md={10}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
                                        <Box>
                                            <Typography variant="h6">
                                                {selectedProject ? `${selectedProject.title} (Kod:${selectedProject.code})` : "Proje Seçilmedi"}
                                            </Typography>
                                            <Typography variant="body2" mt={1} color="text.secondary">
                                                {activePlanning ? (
                                                    <>
                                                        Plan: {fmt(activePlanning.startDate)}
                                                        | Bugün:{" "}
                                                        <Box component="span" sx={{ color: todayRow?.status === "force" ? "error.main" : "inherit", fontWeight: 600 }}>
                                                            {fmt(new Date())}
                                                        </Box>
                                                    </>
                                                ) : "Plan seçiniz"}
                                            </Typography>
                                        </Box>

                                        {/* Force major controls */}
                                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                                            <Checkbox
                                                checked={isForceMajor}
                                                onChange={e => {
                                                    setIsForceMajor(e.target.checked);
                                                    if (!e.target.checked) setForceMajorId(null);
                                                }}
                                                disabled={isForceCheckboxDisabled}
                                            />
                                            <Typography variant="body2">Mücbir Sebep?</Typography>

                                            {isForceMajor && (
                                                <Autocomplete<ForceMajorType>
                                                    options={forceMajors}
                                                    getOptionLabel={(o) => o.title}
                                                    value={forceMajors.find(f => Number(f.id) === forceMajorId) || null}
                                                    onChange={(_, nv) => setForceMajorId(nv ? Number(nv.id) : null)}
                                                    renderInput={(p) => <TextField {...p} size="small" placeholder="Mücbir sebep seçin" sx={{ minWidth: 220 }} />}
                                                    isOptionEqualToValue={(a, b) => a.id === b?.id}
                                                    disabled={isForceCheckboxDisabled}
                                                />
                                            )}

                                            <Button
                                                variant="contained"
                                                color={isForceMajor ? "error" : "success"}
                                                startIcon={<IconCheck />}
                                                disabled={
                                                    !activePlanning ||
                                                    !selectedDay ||
                                                    !hasCreatePermission ||
                                                    (isForceMajor && isForceCheckboxDisabled) // دکمه Force هم غیرفعال شود
                                                }
                                                onClick={() => handleSubmit(isForceMajor ? "force" : "normal")}
                                            >
                                                {isForceMajor ? "Mücbir Sebep Kaydet" : "Kaydet"}
                                            </Button>
                                        </Stack>
                                    </Stack>

                                    {/* Dates list */}
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            maxHeight: { xs: 420, md: "unset" },
                                            overflow: { xs: "auto", md: "visible" },
                                        }}
                                    >
                                        {activePlanning ? (
                                            <List dense>
                                                {filteredRows.map((r, idx) => {
                                                    const disabled = r.status === "normal" || !canSubmitForDate(r.date);
                                                    const selected = selectedDay && isSameDay(selectedDay, r.date);
                                                    const color =
                                                        r.status === "normal" ? "success" : r.status === "force" ? "error" : "default";

                                                    return (
                                                        <ListItem
                                                            key={idx}
                                                            sx={{
                                                                borderBottom: "1px dashed rgba(0,0,0,0.06)",
                                                                opacity: disabled ? 0.5 : 1,
                                                                cursor: disabled ? "not-allowed" : "pointer",
                                                                bgcolor: selected ? "action.hover" : "transparent",
                                                                borderRadius: 1,
                                                                // فضا برای اکشن‌های absolute در ≥sm
                                                                pr: { xs: 0, sm: 14 },
                                                                alignItems: "flex-start",
                                                            }}
                                                            onClick={() => {
                                                                if (r.status === "normal" && r.id) { setDetailDateId(Number(r.id)); return; }
                                                                if (!disabled) setSelectedDay(r.date);
                                                            }}
                                                        >
                                                            <ListItemText
                                                                primary={
                                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap" }}>
                                                                        <DateChip
                                                                            label={fmt(r.date)}
                                                                            color={color as any}
                                                                            variant={r.status === "none" ? "outlined" : "filled"}
                                                                            size="small"
                                                                            style={{ margin: "0" }}
                                                                        />
                                                                        {r.status === "force" && (
                                                                            <Chip label="Mücbir Sebep" color="error" size="small" variant="filled" />
                                                                        )}
                                                                    </Stack>
                                                                }
                                                                secondary={disabled && r.status !== "normal" ? "Önceki günler kaydedilmelidir." : ""}
                                                                // کمی فاصله از اکشن‌ها در ≥sm
                                                                sx={{ mr: { sm: 2 } }}
                                                            />

                                                            {/* اکشن‌ها: موبایل زیر آیتم، دسکتاپ سمت راست */}
                                                            <ListItemSecondaryAction
                                                                sx={{
                                                                    position: { xs: "static", sm: "absolute" },
                                                                    right: { sm: 16 },
                                                                    top: { sm: "50%" },
                                                                    transform: { sm: "translateY(-50%)" },
                                                                    width: { xs: "100%", sm: "auto" },
                                                                    mt: { xs: 4, sm: 0 },
                                                                }}
                                                            >
                                                                <Stack
                                                                    direction={{ xs: "column", sm: "row" }}
                                                                    spacing={1}
                                                                    sx={{ width: { xs: "100%", sm: "auto" } }}
                                                                >
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="success"
                                                                        disabled={disabled || r.status === "normal"}
                                                                        onClick={() => { setSelectedDay(r.date); setIsForceMajor(false); handleSubmit("normal"); }}
                                                                        fullWidth
                                                                        sx={{ width: { xs: "100%", sm: "auto" } }}
                                                                    >
                                                                        Kaydet
                                                                    </Button>
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="error"
                                                                        disabled={disabled || r.status === "normal"}
                                                                        onClick={() => { setSelectedDay(r.date); setIsForceMajor(true); }}
                                                                        fullWidth
                                                                        sx={{ width: { xs: "100%", sm: "auto" } }}
                                                                    >
                                                                        Mücbir Sebep
                                                                    </Button>
                                                                </Stack>
                                                            </ListItemSecondaryAction>
                                                        </ListItem>
                                                    );
                                                })}
                                            </List>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                Sol taraftan bir plan seçiniz.
                                            </Typography>
                                        )}
                                    </Paper>


                                    {/* جزئیات زیر همین صفحه */}
                                    {detailDateId && (
                                        <Box mt={2}>
                                            <BlankCard>
                                                <Box sx={{ p: { xs: 1, md: 2 } }}>
                                                    <ListSetProjectPlanningImplementation dateId={detailDateId} />
                                                </Box>
                                            </BlankCard>
                                        </Box>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                </BlankCard>
            </Box>

            {/* Download Modal */}
            <Dialog open={openDownloadModal} onClose={() => setOpenDownloadModal(false)} maxWidth="xs">
                <DialogTitle>Rapor İndir</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" mb={2}>
                        {selectedProject ? `${selectedProject.title} (${selectedProject.code})` : "Proje"} – {activePlanning ? `${fmt(activePlanning.startDate)} – ${fmt(activePlanning.endDate)}` : "Plan seçilmedi"}
                    </Typography>
                    <Stack direction="column" spacing={2} sx={{ mt: 2 }}>
                        <Button
                            variant="contained" color="primary" startIcon={<IconFileText />}
                            onClick={() => {
                                exportPlanReportPdf(
                                    selectedProject,
                                    activePlanning,
                                    filteredRows,
                                    selectedProject ? `Proje: ${selectedProject.title} (${selectedProject.code})` : undefined
                                );
                                setOpenDownloadModal(false);
                            }}
                            disabled={!selectedProject || !activePlanning}
                        >
                            PDF Olarak İndir
                        </Button>
                        <Button
                            variant="contained" color="success" startIcon={<IconFileSpreadsheet />}
                            onClick={async () => {
                                await exportPlanReportExcel(selectedProject, activePlanning, filteredRows);
                                setOpenDownloadModal(false);
                            }}
                            disabled={!selectedProject || !activePlanning}
                        >
                            Excel Olarak İndir
                        </Button>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDownloadModal(false)} color="secondary" startIcon={<IconX />}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ListProjectPlanningImplementation;
