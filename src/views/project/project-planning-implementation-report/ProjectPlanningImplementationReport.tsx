
// src/views/project/ProjectPlanningImplementationReport.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
    Box, Stack, Grid, Paper, Typography, Button, CircularProgress,
    ToggleButtonGroup, ToggleButton, Chip, IconButton, Alert,
    TextField, Autocomplete, LinearProgress, Avatar,
    Divider
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { tr } from "date-fns/locale";
import { format } from "date-fns";
import {
    IconFileDownload, IconChartBar, IconTable, IconLayoutGrid,
    IconRefresh, IconDownload
} from "@tabler/icons-react";
import { Collapse } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import axios from "axios";
import server from "src/assets/address.json";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody
} from "@mui/material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NotoSansRegular } from "src/assets/fonts/NotoSans-Regular";
import { ArialFont } from "src/assets/fonts/Arial";
import Logo from "src/assets/images/logos/logo.png";
import Excel from "exceljs";
import { saveAs } from "file-saver";
import { toPng } from "html-to-image";
import "./style.css";

// MUI date pickers
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// recharts
import {
    ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from "recharts";

import { blue, green, grey } from "@mui/material/colors";
import { useNavigate } from "react-router";

/* ========= Types ========= */
type ProjectItem = { id: string; title: string; code: string; startDate?: string; endDate?: string; };
type ReportRow = {
    ProjectId: string; ProjectName: string; StartDate: string; EndDate: string;
    KaziYapilanDirekDurumu: number | null; AltMontajiYapilan: number | null; BetonAtilanDirekDurumu: number | null;
    UstMontajiOrulenDirekDurumu: number | null; UstMontajiKurulanDirekDurumu: number | null; DikilenBetonDirekDurumu: number | null;
    IletkenCekilenDirekDurumu: number | null; AyiriciTakilanDirekDurumu: number | null; DikilenAydinlatmaDirekDurumu: number | null;
    KabloKanaliDurumu: number | null; TransformatorDurumu: number | null; DagitimPanosuDurumu: number | null;
    SahaDagitimKutusuDurumu: number | null; BetonKoskDurumu: number | null; HucreDurumu: number | null;
    CekilenKabloMiktari: number | null;
};
type ViewMode = "table" | "card" | "chart";

/* ========= UI helpers ========= */
const Section = styled(Paper)(({ theme }) => ({ padding: theme.spacing(2), borderRadius: 12 }));

// Fancy Card styles
const FancyCard = styled(Section)(({ theme }) => ({
    position: "relative",
    overflow: "hidden",
    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    transition: "transform .2s ease, box-shadow .2s ease",
    "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
    },
    "&:before": {
        content: '""',
        position: "absolute",
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        background: `radial-gradient(${blue[100]}, transparent 60%)`,
        opacity: 0.6,
        filter: "blur(8px)",
    },
}));

type NumericKeys = {
    [K in keyof ReportRow]-?: ReportRow[K] extends number | null | undefined ? K : never
}[keyof ReportRow];

const statusFieldKeys: Readonly<NumericKeys[]> = [
    "KaziYapilanDirekDurumu",
    "AltMontajiYapilan",
    "BetonAtilanDirekDurumu",
    "UstMontajiOrulenDirekDurumu",
    "UstMontajiKurulanDirekDurumu",
    "DikilenBetonDirekDurumu",
    "IletkenCekilenDirekDurumu",
    "AyiriciTakilanDirekDurumu",
    "DikilenAydinlatmaDirekDurumu",
    "KabloKanaliDurumu",
    "TransformatorDurumu",
    "DagitimPanosuDurumu",
    "SahaDagitimKutusuDurumu",
    "BetonKoskDurumu",
    "HucreDurumu",
] as const;

const labelMap: Record<keyof ReportRow, string> = {
    ProjectId: "Proje ID", ProjectName: "Proje", StartDate: "Başlangıç", EndDate: "Bitiş",
    KaziYapilanDirekDurumu: "Kazı Yapılan Direk  Sayısı", AltMontajiYapilan: "Alt Montajı Yapılan Direk  Sayısı",
    BetonAtilanDirekDurumu: "Beton Atılan Direk  Sayısı", UstMontajiOrulenDirekDurumu: "Üst Montajı Örülen Direk  Sayısı",
    UstMontajiKurulanDirekDurumu: "Üst Montajı Kurulan Direk  Sayısı", DikilenBetonDirekDurumu: "Dikilen Beton Direk  Sayısı",
    IletkenCekilenDirekDurumu: "İletken Çekilen Direk  Sayısı", AyiriciTakilanDirekDurumu: "Ayırıcı Takılan Direk  Sayısı",
    DikilenAydinlatmaDirekDurumu: "Dikilen Aydınlatma Direk  Sayısı", KabloKanaliDurumu: "Kablo Kanalı",
    TransformatorDurumu: "Transformatör", DagitimPanosuDurumu: "Dağıtım Panosu", SahaDagitimKutusuDurumu: "Saha Dağıtım Kutusu",
    BetonKoskDurumu: "Beton Köşk", HucreDurumu: "Hücre", CekilenKabloMiktari: "Çekilen Kablo (m)"
};

/* ========= Utils ========= */
const n0 = (v: number | null | undefined) => (v == null ? 0 : v);
const percentForRow = (row: ReportRow) => {
    const doneCount = statusFieldKeys.reduce((acc, k) => acc + (n0(row[k]) > 0 ? 1 : 0), 0);
    return Math.round((doneCount / statusFieldKeys.length) * 100);
};
const dayRangeLabel = (row: ReportRow) =>
    `${format(new Date(row.StartDate), "dd MMM yyyy", { locale: tr })} `;

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

/* ========= Component ========= */
const ProjectPlanningImplementationReport: React.FC = () => {

    const navigate = useNavigate();
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

    const [loadingReport, setLoadingReport] = useState(false);
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [view, setView] = useState<ViewMode>("table");

    // date filters (Date | null)
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);

    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
    const toggleCard = (key: string) => setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));


    const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    const authHeaders = useMemo(
        () => (authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        [authToken]
    );

    /* ---- load projects ---- */
    const loadProjects = useCallback(async () => {
        setLoadingProjects(true);
        setErrorMsg(null);
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
            const res = await axios.get(`${server.baseurl}${server.warehouse}get-project`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: requestParams
            });
            const data = (res.data?.data ?? []) as any[];
            const mapped: ProjectItem[] = data.map(p => ({
                id: String(p.id), title: p.title, code: p.code, startDate: p.startDate, endDate: p.endDate
            }));
            setProjects(mapped);
        } catch (e: any) {
            setErrorMsg(e?.response?.data?.message ?? "Proje listesi alınamadı.");
            setProjects([]);
        } finally { setLoadingProjects(false); }
    }, [authHeaders]);

    /* ---- load report ---- */
    const loadReport = useCallback(async (projectId: string) => {
        if (!projectId) return;
        setLoadingReport(true); setErrorMsg(null);
        try {
            const res = await axios.get(
                `${server.baseurl}${server.warehouse}get-project-planning-Implementation-report/${projectId}`,
                { headers: { Authorization: `Bearer ${authToken}` } }
            );
            const data: ReportRow[] = (res.data?.data ?? []).map((r: any) => ({
                ...r,
                KaziYapilanDirekDurumu: n0(r.KaziYapilanDirekDurumu), AltMontajiYapilan: n0(r.AltMontajiYapilan),
                BetonAtilanDirekDurumu: n0(r.BetonAtilanDirekDurumu), UstMontajiOrulenDirekDurumu: n0(r.UstMontajiOrulenDirekDurumu),
                UstMontajiKurulanDirekDurumu: n0(r.UstMontajiKurulanDirekDurumu), DikilenBetonDirekDurumu: n0(r.DikilenBetonDirekDurumu),
                IletkenCekilenDirekDurumu: n0(r.IletkenCekilenDirekDurumu), AyiriciTakilanDirekDurumu: n0(r.AyiriciTakilanDirekDurumu),
                DikilenAydinlatmaDirekDurumu: n0(r.DikilenAydinlatmaDirekDurumu), KabloKanaliDurumu: n0(r.KabloKanaliDurumu),
                TransformatorDurumu: n0(r.TransformatorDurumu), DagitimPanosuDurumu: n0(r.DagitimPanosuDurumu),
                SahaDagitimKutusuDurumu: n0(r.SahaDagitimKutusuDurumu), BetonKoskDurumu: n0(r.BetonKoskDurumu),
                HucreDurumu: n0(r.HucreDurumu), CekilenKabloMiktari: n0(r.CekilenKabloMiktari)
            }));
            setRows(data);
        } catch (e: any) {
            setErrorMsg(e?.response?.data?.message ?? "Rapor verisi alınamadı.");
            setRows([]);
        } finally { setLoadingReport(false); }
    }, [authHeaders]);

    useEffect(() => { loadProjects(); }, [loadProjects]);
    useEffect(() => { selectedProject ? loadReport(selectedProject.id) : setRows([]); }, [selectedProject, loadReport]);

    /* ---- date-filtered data (بدون mutate کردن state) ---- */
    const filtered = useMemo(() => {
        if (!fromDate && !toDate) return rows;
        const fromTs = fromDate ? startOfDay(fromDate).getTime() : -Infinity;
        const toTs = toDate ? endOfDay(toDate).getTime() : Infinity;
        return rows.filter(r => {
            const s = new Date(r.StartDate).getTime();
            const e = new Date(r.EndDate).getTime();
            return e >= fromTs && s <= toTs; // period intersects window
        });
    }, [rows, fromDate, toDate]);

    /* ---- downloads (Excel / PDF) ---- */
    const handleExportExcel = async () => {
        if (!filtered.length) return;
        const wb = new Excel.Workbook();
        const ws = wb.addWorksheet("Rapor");
        const header = ["Proje", "Dönem", ...statusFieldKeys.map(k => labelMap[k]), labelMap.CekilenKabloMiktari, "Yüzde(%)"];
        ws.addRow(header); ws.getRow(1).font = { bold: true };
        filtered.forEach(r => {
            ws.addRow([
                r.ProjectName, dayRangeLabel(r),
                ...statusFieldKeys.map(k => n0(r[k])), n0(r.CekilenKabloMiktari), percentForRow(r)
            ]);
        });
        ws.columns.forEach((c: any) => { c.width = 16; });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `Rapor_${selectedProject?.title ?? "Proje"}.xlsx`);
    };

    const handleExportPDF = () => {
        if (!filtered.length) return;
        const doc = new (jsPDF as any)("l", "pt", "a4");
        (doc as any).addFileToVFS("NotoSans-Regular.ttf", NotoSansRegular);
        (doc as any).addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
        (doc as any).addFileToVFS("Arial.ttf", ArialFont);
        (doc as any).addFont("Arial.ttf", "Arial", "normal");
        doc.setFont("Arial");
        const pw = doc.internal.pageSize.getWidth();
        doc.setFontSize(14).text(`Proje Uygulama Raporu - ${selectedProject?.title ?? ""}`, pw / 2, 40, { align: "center" });
        try { doc.addImage(Logo, "PNG", pw - 120, 20, 90, 30); } catch { }
        const head = [["Proje", "Dönem", ...statusFieldKeys.map(k => labelMap[k]), labelMap.CekilenKabloMiktari, "Yüzde(%)"]];
        const body = filtered.map(r => [
            r.ProjectName, dayRangeLabel(r), ...statusFieldKeys.map(k => n0(r[k])), n0(r.CekilenKabloMiktari), percentForRow(r)
        ]);
        autoTable((doc as any), {
            startY: 70, head, body,
            styles: { font: "NotoSans", fontStyle: 'normal', fontSize: 8, cellPadding: 3, halign: "center" },
            headStyles: { fillColor: [217, 225, 242], textColor: 0 }
        });
        const pc = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pc; i++) {
            doc.setPage(i); doc.setFontSize(8);
            doc.text(`Sayfa ${i}/${pc}`, pw - 60, doc.internal.pageSize.getHeight() - 10);
        }
        doc.save(`Rapor_${selectedProject?.title ?? "Proje"}.pdf`);
    };

    /* ---- chart png download helper ---- */
    const dlPng = async (el: HTMLDivElement | null, name: string) => {
        if (!el) return;
        // @ts-ignore
        if ((document as any)?.fonts?.ready) { try { await (document as any).fonts.ready; } catch { } }
        const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: "#ffffff" });
        const blob = await (await fetch(dataUrl)).blob();
        saveAs(blob, `${name}.png`);
    };

    const refBar = useRef<HTMLDivElement>(null);

    /* ---- header ---- */
    const renderHeader = (
        <Grid container spacing={1} mt={3}>
            {/* Row 1 */}
            <Grid item xs={12} md={6} lg={4}>
                <Typography variant="h6" noWrap>Proje Planlaması Uygulama Raporu</Typography>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
                <Autocomplete
                    options={projects}
                    getOptionLabel={(o) => `${o.title} (Kod:${o.code})`}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    loading={loadingProjects}
                    value={selectedProject}
                    onChange={(_, v) => setSelectedProject(v)}
                    renderInput={(p) => <TextField {...p} label="Proje Seç" size="small" />}
                />
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
                <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small" fullWidth>
                    <ToggleButton value="table"><IconTable size={18} /> Tablo</ToggleButton>
                    <ToggleButton value="card"><IconLayoutGrid size={18} /> Kart</ToggleButton>
                    <ToggleButton value="chart"><IconChartBar size={18} /> Grafik</ToggleButton>
                </ToggleButtonGroup>
            </Grid>

            {/* Row 2 */}
            <Grid item xs={12} md={4} lg={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                    <DatePicker
                        label="Başlangıç"
                        value={fromDate}
                        onChange={(newValue) => setFromDate(newValue)}
                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                    />
                </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={4} lg={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                    <DatePicker
                        label="Bitiş"
                        value={toDate}
                        onChange={(newValue) => setToDate(newValue)}
                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                        minDate={fromDate || undefined}
                    />
                </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={4} lg={3}>
                <IconButton onClick={loadProjects} title="Yenile"><IconRefresh size={20} /></IconButton>
                {selectedProject && <Chip label={`Proje: ${selectedProject.title} (${selectedProject.code})`} color="primary" />}
            </Grid>

            <Grid item xs={12} md={6} lg={3}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="contained" size="small" color="primary" startIcon={<IconFileDownload />} disabled={!filtered.length} onClick={handleExportPDF}>PDF</Button>
                    <Button variant="contained" size="small" color="success" startIcon={<IconFileDownload />} disabled={!filtered.length} onClick={handleExportExcel}>Excel</Button>
                </Stack>
            </Grid>
        </Grid>
    );

    /* ---- pieces ---- */
    const renderLoading = (
        <Box display="flex" justifyContent="center" alignItems="center" height={240}>
            <CircularProgress /><Typography sx={{ ml: 2 }}>Yükleniyor…</Typography>
        </Box>
    );

    const renderEmpty = <Alert severity="info">Bir proje seçiniz.</Alert>;

    const renderTable = (
        <Section sx={{ mt: 2, p: 0 }}>
            <TableContainer
                sx={{
                    maxHeight: "calc(100vh - 280px)",
                    borderRadius: 2,
                    width: "100%"
                }}
            >
                <Table stickyHeader size="small" aria-label="rapor tablosu">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>Proje</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>Dönem</TableCell>
                            {statusFieldKeys.map(k => (
                                <TableCell key={k as string} align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                                    {labelMap[k]}
                                </TableCell>
                            ))}
                            <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                                {labelMap.CekilenKabloMiktari}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>Yüzde(%)</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {filtered.map((r) => (
                            <TableRow hover key={`${r.ProjectId}-${r.StartDate}`}>
                                <TableCell align="center">{r.ProjectName}</TableCell>
                                <TableCell align="center">{dayRangeLabel(r)}</TableCell>
                                {statusFieldKeys.map(k => (
                                    <TableCell key={`${r.ProjectId}-${String(k)}`} align="center">
                                        {n0(r[k])}
                                    </TableCell>
                                ))}
                                <TableCell align="center">{n0(r.CekilenKabloMiktari)}</TableCell>
                                <TableCell align="center">
                                    <Chip
                                        label={`${percentForRow(r)}%`}
                                        color={percentForRow(r) >= 67 ? "success" : percentForRow(r) >= 34 ? "warning" : "error"}
                                        size="small"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Section>
    );

    // Stat pill component used in cards
    const StatPill: React.FC<{ label: string; value: number | null }> = ({ label, value }) => (
        <Box
            sx={{
                px: 1.2, py: 0.5, borderRadius: 999,
                bgcolor: "rgba(0,0,0,0.04)",
                border: theme => `1px dashed ${theme.palette.divider}`,
                display: "inline-flex", alignItems: "center", gap: .75,
            }}
        >
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: grey[500] }} />
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="caption" fontWeight={700}>{n0(value)}</Typography>
        </Box>
    );

    const renderCards = (
        <Grid container spacing={2} sx={{ mt: 1 }}>
            {filtered.map((r) => {
                const pct = percentForRow(r);
                const cardKey = `${r.ProjectId}-${r.StartDate}`;
                const isOpen = !!expandedCards[cardKey];

                // چند شاخص برای نمایش خلاصه
                const summaryPills: Array<[string, number | null]> = [
                    ["Kablo", r.CekilenKabloMiktari],
                    ["Kazı", r.KaziYapilanDirekDurumu],
                    ["Alt Montaj", r.AltMontajiYapilan],
                    ["Beton", r.BetonAtilanDirekDurumu],
                    ["Üst Montaj", r.UstMontajiKurulanDirekDurumu],
                ];

                return (
                    <Grid item xs={12} md={6} key={cardKey}>
                        <FancyCard>
                            <Stack spacing={1.25}>
                                {/* Header */}
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Stack direction="row" spacing={1.25} alignItems="center">
                                        <Avatar
                                            sx={{
                                                width: 36, height: 36,
                                                bgcolor: pct >= 67 ? green[500] : pct >= 34 ? "#f5a623" : "#e53935",
                                                fontSize: 14, color: "#fff",
                                                boxShadow: "0 6px 16px rgba(0,0,0,.12)"
                                            }}
                                        >
                                            {pct}%
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={700} noWrap>{r.ProjectName}</Typography>
                                            <Typography variant="body2" color="text.secondary">{dayRangeLabel(r)}</Typography>
                                        </Box>
                                    </Stack>
                                    <Chip
                                        label={pct >= 67 ? "İyi" : pct >= 34 ? "Orta" : "Düşük"}
                                        color={pct >= 67 ? "success" : pct >= 34 ? "warning" : "error"}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Stack>

                                {/* Progress */}
                                <Box sx={{ mt: .5 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={pct}
                                        sx={{
                                            height: 10, borderRadius: 6,
                                            [`& .MuiLinearProgress-bar`]: { borderRadius: 6 }
                                        }}
                                    />
                                    <Stack direction="row" justifyContent="space-between" sx={{ mt: .5 }}>
                                        <Typography variant="caption" color="text.secondary">Genel İlerleme</Typography>
                                        <Typography variant="caption" fontWeight={700}>{pct}%</Typography>
                                    </Stack>
                                </Box>

                                {/* خلاصهٔ فیلدها */}
                                <Grid container spacing={1} sx={{ mt: .75 }}>
                                    {summaryPills.map(([lbl, val]) => (
                                        <Grid item key={lbl}>
                                            <StatPill label={String(lbl)} value={val as number | null} />
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* دکمهٔ باز/بسته */}
                                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                    <Button
                                        size="small"
                                        variant="text"
                                        endIcon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        onClick={() => toggleCard(cardKey)}
                                    >
                                        {isOpen ? "Detayları Gizle" : "Detayları Göster"}

                                    </Button>
                                </Box>

                                {/* جزئیات کامل – همهٔ آبجکت‌ها */}
                                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                    <Divider sx={{ my: 1 }} />
                                    <Grid container spacing={1}>
                                        {statusFieldKeys.map((k) => (
                                            <Grid item xs={12} sm={6} md={6} lg={4} key={String(k)}>
                                                <StatPill label={labelMap[k]} value={r[k]} />
                                            </Grid>
                                        ))}
                                        <Grid item xs={12} sm={6} md={6} lg={4}>
                                            <StatPill label={labelMap.CekilenKabloMiktari} value={r.CekilenKabloMiktari} />
                                        </Grid>
                                    </Grid>
                                </Collapse>
                            </Stack>
                        </FancyCard>
                    </Grid>
                );
            })}
        </Grid>
    );

    // Single Bar Chart for overall progress
    const renderCharts = (
        <Section sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>İlerleme – Bar Chart</Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconDownload />}
                    disabled={!filtered.length}
                    onClick={() => dlPng(refBar.current, "Grafik_Ilerleme")}
                >
                    PNG indir
                </Button>
            </Stack>

            <Box ref={refBar} sx={{ width: "100%", height: 360 }}>
                <ResponsiveContainer>
                    <ComposedChart
                        data={filtered.map(r => ({
                            date: format(new Date(r.StartDate), "dd MMM", { locale: tr }),
                            percent: percentForRow(r),
                        }))}
                        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} tickCount={6} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="percent" name="Yüzde" />
                    </ComposedChart>
                </ResponsiveContainer>
            </Box>
        </Section>
    );

    return (
        <Box sx={{ width: "100%", overflow: "hidden" }}>
            {renderHeader}
            {errorMsg && <Box sx={{ mt: 2 }}><Alert severity="error">{errorMsg}</Alert></Box>}

            {loadingReport
                ? <Section sx={{ mt: 2 }}>{renderLoading}</Section>
                : (!selectedProject
                    ? <Box sx={{ mt: 2 }}>{renderEmpty}</Box>
                    : view === "table" ? renderTable : view === "card" ? renderCards : renderCharts)}
        </Box>
    );
};

export default ProjectPlanningImplementationReport;
