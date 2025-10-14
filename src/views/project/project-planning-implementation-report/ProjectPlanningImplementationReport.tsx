// src/views/project/ProjectPlanningImplementationReport.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
    Box, Stack, Grid, Paper, Typography, Button, CircularProgress,
    ToggleButtonGroup, ToggleButton, Chip, Divider, IconButton, Alert,
    TextField, Autocomplete
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { tr } from "date-fns/locale";
import { format } from "date-fns";
import {
    IconFileDownload, IconChartBar, IconTable, IconLayoutGrid,
    IconRefresh, IconDownload
} from "@tabler/icons-react";
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
import "./style.css"

// MUI date pickers
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import {
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
    AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from "recharts";

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
    KaziYapilanDirekDurumu: "Kazı Yapılan Direk", AltMontajiYapilan: "Alt Montajı Yapılan Direk",
    BetonAtilanDirekDurumu: "Beton Atılan Direk", UstMontajiOrulenDirekDurumu: "Üst Montajı Örülen Direk",
    UstMontajiKurulanDirekDurumu: "Üst Montajı Kurulan Direk", DikilenBetonDirekDurumu: "Dikilen Beton Direk",
    IletkenCekilenDirekDurumu: "İletken Çekilen Direk", AyiriciTakilanDirekDurumu: "Ayırıcı Takılan Direk",
    DikilenAydinlatmaDirekDurumu: "Dikilen Aydınlatma Direk", KabloKanaliDurumu: "Kablo Kanalı",
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
    `${format(new Date(row.StartDate), "dd MMM yyyy", { locale: tr })} - ${format(new Date(row.EndDate), "dd MMM yyyy", { locale: tr })}`;

/* ========= Component ========= */
const ProjectPlanningImplementationReport: React.FC = () => {
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

    const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

    /* ---- load projects ---- */
    const loadProjects = useCallback(async () => {
        setLoadingProjects(true);
        setErrorMsg(null);
        try {
            const res = await axios.get(`${server.baseurl}${server.warehouse}get-project`, {
                headers: { Authorization: `Bearer ${authToken}` }
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
    }, [authToken]);

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
    }, [authToken]);

    useEffect(() => { loadProjects(); }, [loadProjects]);
    useEffect(() => { selectedProject ? loadReport(selectedProject.id) : setRows([]); }, [selectedProject, loadReport]);

    /* ---- date-filtered data ---- */
    const filtered = useMemo(() => {
        if (!fromDate && !toDate) return rows;
        const fromTs = fromDate ? new Date(fromDate.setHours(0, 0, 0, 0)).getTime() : -Infinity;
        const toTs = toDate ? new Date(toDate.setHours(23, 59, 59, 999)).getTime() : Infinity;
        return rows.filter(r => {
            const s = new Date(r.StartDate).getTime();
            const e = new Date(r.EndDate).getTime();
            return e >= fromTs && s <= toTs; // period intersects window
        });
    }, [rows, fromDate, toDate]);

    const chartData = useMemo(() => filtered.map(r => ({
        date: format(new Date(r.StartDate), "dd MMM", { locale: tr }),
        percent: percentForRow(r),
        cable: n0(r.CekilenKabloMiktari),
        ...Object.fromEntries(statusFieldKeys.map(k => [k as string, n0(r[k])]))
    })), [filtered]);

    const statusAvgForRadar = useMemo(() => {
        if (!filtered.length) return [];
        const sum: Record<string, number> = {};
        statusFieldKeys.forEach(k => { sum[k] = 0; });
        filtered.forEach(r => statusFieldKeys.forEach(k => { sum[k] += n0(r[k]); }));
        return statusFieldKeys.map(k => ({ name: labelMap[k], value: Math.round(sum[k] / filtered.length) }));
    }, [filtered]);

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
        ws.columns.forEach(c => { c.width = 16; });
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
        const dataUrl = await toPng(el, { cacheBust: true, backgroundColor: "#ffffff" });
        const blob = await (await fetch(dataUrl)).blob();
        saveAs(blob, `${name}.png`);
    };

    const refComposed = useRef<HTMLDivElement>(null);
    // const refStacked = useRef<HTMLDivElement>(null);
    const refArea = useRef<HTMLDivElement>(null);
    const refRadar = useRef<HTMLDivElement>(null);

    /* ---- header ---- */
    const renderHeader = (
        <Grid container spacing={1} mt={3}>
            {/* Row 1 */}
            <Grid item xs={12} md={6} lg={4}>
                <Typography variant="h6" noWrap>Project Planning Implementation Report</Typography>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
                <Autocomplete
                    options={projects}
                    getOptionLabel={(o) => `${o.title} (${o.code})`}
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
                        inputFormat="dd/MM/yyyy"
                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                        disableMaskedInput
                    />
                </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={4} lg={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                    <DatePicker
                        label="Bitiş"
                        value={toDate}
                        onChange={(newValue) => setToDate(newValue)}
                        inputFormat="dd/MM/yyyy"
                        renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                        disableMaskedInput
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
                        {filtered.map((r, i) => (
                            <TableRow hover key={i}>
                                <TableCell align="center">{r.ProjectName}</TableCell>
                                <TableCell align="center">{dayRangeLabel(r)}</TableCell>
                                {statusFieldKeys.map(k => (
                                    <TableCell key={`${i}-${String(k)}`} align="center">
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

    const renderCards = (
        <Grid container spacing={2} sx={{ mt: 1 }}>
            {filtered.map((r, i) => (
                <Grid item xs={12} md={6} key={i}>
                    <Section>
                        <Stack spacing={1}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="subtitle1" fontWeight={700}>{r.ProjectName}</Typography>
                                <Chip label={`${percentForRow(r)}%`} color={percentForRow(r) >= 67 ? "success" : percentForRow(r) >= 34 ? "warning" : "error"} size="small" />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">{dayRangeLabel(r)}</Typography>
                            <Divider />
                            <Grid container spacing={1}>
                                {statusFieldKeys.map(k => (
                                    <Grid item xs={6} key={String(k)}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="body2">{labelMap[k]}</Typography>
                                            <Typography variant="body2" fontWeight={600}>{n0(r[k])}</Typography>
                                        </Stack>
                                    </Grid>
                                ))}
                                <Grid item xs={12}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="body2">{labelMap.CekilenKabloMiktari}</Typography>
                                        <Typography variant="body2" fontWeight={700}>{n0(r.CekilenKabloMiktari)}</Typography>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Stack>
                    </Section>
                </Grid>
            ))}
        </Grid>
    );

    const ChartCard: React.FC<{ title: string; innerRef: React.RefObject<HTMLDivElement>; children: React.ReactNode; file: string; }> =
        ({ title, innerRef, children, file }) => (
            <Section sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
                    <Button variant="outlined" size="small" startIcon={<IconDownload />} disabled={!filtered.length}
                        onClick={() => dlPng(innerRef.current, file)}>PNG indir</Button>
                </Stack>
                <Box ref={innerRef} sx={{ width: "100%", height: 360 }}>
                    {children}
                </Box>
            </Section>
        );

    const renderCharts = (
        <>
            {/* 1) Composed */}
            <ChartCard title="Performans (%) + Çekilen Kablo (m)" innerRef={refComposed} file="Grafik_Composed">
                <ResponsiveContainer>
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip /><Legend />
                        <Bar yAxisId="left" dataKey="percent" name="Yüzde" />
                        <Line yAxisId="right" type="monotone" dataKey="cable" name="Çekilen Kablo (m)" />
                    </ComposedChart>
                </ResponsiveContainer>
            </ChartCard>


            {/* 3) Area cable trend */}
            <ChartCard title="Kablo Çekimi (Area)" innerRef={refArea} file="Grafik_Area">
                <ResponsiveContainer>
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip /><Legend />
                        <Area type="monotone" dataKey="cable" name="Çekilen Kablo (m)" />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* 4) Radar (avg distribution) */}
            <ChartCard title="Durum Dağılımı - Ortalama (Radar)" innerRef={refRadar} file="Grafik_Radar">
                <ResponsiveContainer>
                    <RadarChart data={statusAvgForRadar}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" />
                        <Radar dataKey="value" name="Ortalama" />
                        <Legend />
                        <Tooltip />
                    </RadarChart>
                </ResponsiveContainer>
            </ChartCard>
        </>
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
