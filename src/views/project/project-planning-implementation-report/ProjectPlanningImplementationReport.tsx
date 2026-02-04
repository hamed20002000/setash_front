import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
    Box, Stack, Grid, Paper, Typography, Button, CircularProgress,
    ToggleButtonGroup, ToggleButton, Chip, IconButton, Alert,
    TextField, Autocomplete, LinearProgress, Avatar,
    Divider, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Collapse
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { tr } from "date-fns/locale";
import { format } from "date-fns";
import {
    IconFileDownload, IconChartBar, IconTable, IconLayoutGrid,
    IconRefresh, IconDownload, IconTrendingUp
} from "@tabler/icons-react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import axios from "axios";
import server from "src/assets/address.json";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NotoSansRegular } from "src/assets/fonts/NotoSans-Regular";
import Logo from "src/assets/images/logos/logo.png";
import Excel from "exceljs";
import { saveAs } from "file-saver";
import { toPng } from "html-to-image";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import {
    ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from "recharts";

import { blue, green, orange, red } from "@mui/material/colors";
import { useNavigate } from "react-router";
type ProjectItem = { id: string; title: string; code: string; };
type ReportRow = {
    ProjectId: string; ProjectName: string; StartDate: string; EndDate: string;
    KaziYapilanDirekDurumu: number | null; AltMontajiYapilan: number | null; BetonAtilanDirekDurumu: number | null;
    UstMontajiOrulenDirekDurumu: number | null; UstMontajiKurulanDirekDurumu: number | null; DikilenBetonDirekDurumu: number | null;
    IletkenCekilenDirekDurumu: number | null; AyiriciTakilanDirekDurumu: number | null; DikilenAydinlatmaDirekDurumu: number | null;
    KabloKanaliDurumu: number | null; TransformatorDurumu: number | null; DagitimPanosuDurumu: number | null;
    SahaDagitimKutusuDurumu: number | null; BetonKoskDurumu: number | null; HucreDurumu: number | null;
    CekilenKabloMiktari: number | null;
};

type ProgressItem = {
    ProjectId: string;
    Day: string;
    PctOverall: string;
    PctDaily: string;
};

type ViewMode = "card" | "table" | "chart";

const Section = styled(Paper)(({ theme }) => ({ padding: theme.spacing(2), borderRadius: 12 }));

const FancyCard = styled(Section)(({ theme }) => ({
    position: "relative",
    overflow: "hidden",
    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
}));

const statusFieldKeys: Array<keyof Omit<ReportRow, 'ProjectId' | 'ProjectName' | 'StartDate' | 'EndDate'>> = [
    "KaziYapilanDirekDurumu", "AltMontajiYapilan", "BetonAtilanDirekDurumu",
    "UstMontajiOrulenDirekDurumu", "UstMontajiKurulanDirekDurumu", "DikilenBetonDirekDurumu",
    "IletkenCekilenDirekDurumu", "AyiriciTakilanDirekDurumu", "DikilenAydinlatmaDirekDurumu",
    "KabloKanaliDurumu", "TransformatorDurumu", "DagitimPanosuDurumu",
    "SahaDagitimKutusuDurumu", "BetonKoskDurumu", "HucreDurumu",
];

const labelMap: Record<string, string> = {
    ProjectId: "Proje ID", ProjectName: "Proje", StartDate: "Başlangıç", EndDate: "Bitiş",
    KaziYapilanDirekDurumu: "Kazı Yapılan Direk", AltMontajiYapilan: "Alt Montaj",
    BetonAtilanDirekDurumu: "Beton Atılan Direk", UstMontajiOrulenDirekDurumu: "Üst Montaj Örülen",
    UstMontajiKurulanDirekDurumu: "Üst Montaj Kurulan", DikilenBetonDirekDurumu: "Dikilen Beton Direk",
    IletkenCekilenDirekDurumu: "İletken Çekilen", AyiriciTakilanDirekDurumu: "Ayırıcı Takılan",
    DikilenAydinlatmaDirekDurumu: "Dikilen Aydınlatma", KabloKanaliDurumu: "Kablo Kanalı",
    TransformatorDurumu: "Transformatör", DagitimPanosuDurumu: "Dağıtım Panosu", SahaDagitimKutusuDurumu: "Saha Dağıtım Kutusu",
    BetonKoskDurumu: "Beton Köşk", HucreDurumu: "Hücre", CekilenKabloMiktari: "Çekilen Kablo (m)"
};

const n0 = (v: any) => (v == null ? 0 : v);

const getStatusColor = (pct: number) => {
    if (pct < 35) return red[600];
    if (pct >= 35 && pct < 70) return orange[600];
    return green[600];
};

const formatDateDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
        const d = new Date(dateString);
        return format(d, 'dd/MM/yyyy HH:mm').includes('NaN') ? format(new Date(dateString.substring(0, 10)), 'dd/MM/yyyy') : format(d, 'dd/MM/yyyy HH:mm');
    } catch { return '-'; }
};

const dayRangeLabel = (date: string) => format(new Date(date), "dd MMM yyyy", { locale: tr });

const ProjectPlanningImplementationReport: React.FC = () => {
    const navigate = useNavigate();
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [progressData, setProgressData] = useState<ProgressItem[]>([]);
    const [overallProjectProgress, setOverallProjectProgress] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [view, setView] = useState<ViewMode>("card");
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
    const refBar = useRef<HTMLDivElement>(null);

    const toggleCard = (key: string) => setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));

    const getProgressForDate = (row: ReportRow) => {
        const hasActivity = statusFieldKeys.some(k => n0(row[k]) > 0) || n0(row.CekilenKabloMiktari) > 0;

        const target = row.StartDate.substring(0, 10);
        const d = progressData.find(p => p.Day.substring(0, 10) === target);

        return {
            daily: !hasActivity ? 0 : (d ? parseFloat(d.PctDaily) : 0),
            overall: d ? parseFloat(d.PctOverall) : 0
        };
    };

    const loadProjects = useCallback(async () => {
        setLoadingProjects(true);
        const authToken = localStorage.getItem('authToken');
        const role = localStorage.getItem('activeUserRoleName') || '';
        if (!authToken) { navigate("/"); return; }
        try {
            const res = await axios.get(`${server.baseurl}${server.warehouse}get-project`, {
                headers: { Authorization: `Bearer ${authToken}` },
                params: role.toLowerCase() !== 'admin' ? { rolename: role } : {}
            });
            setProjects(res.data?.data?.map((p: any) => ({ id: String(p.id), title: p.title, code: p.code })) || []);
        } catch { setErrorMsg("Proje listesi alınamadı."); } finally { setLoadingProjects(false); }
    }, [navigate]);

    const loadData = useCallback(async (projectId: string) => {
        setLoadingReport(true);
        setErrorMsg(null);
        const authToken = localStorage.getItem('authToken');
        const headers = { Authorization: `Bearer ${authToken}` };
        try {
            const [reportRes, progressRes] = await Promise.all([
                axios.get(`${server.baseurl}${server.warehouse}get-project-planning-Implementation-report/${projectId}`, { headers }),
                axios.get(`${server.baseurl}${server.warehouse}get-project-progress/${projectId}`, { headers })
            ]);
            setRows(reportRes.data?.data || []);
            const pData = progressRes.data?.data || [];
            setProgressData(pData);
            if (pData.length > 0) setOverallProjectProgress(parseFloat(pData[pData.length - 1].PctOverall));
            else setOverallProjectProgress(0);
        } catch { setErrorMsg("Rapor verileri alınamadı."); } finally { setLoadingReport(false); }
    }, []);

    useEffect(() => { loadProjects(); }, [loadProjects]);
    useEffect(() => { if (selectedProject) loadData(selectedProject.id); else { setRows([]); setProgressData([]); setOverallProjectProgress(0); } }, [selectedProject, loadData]);

    const filtered = useMemo(() => {
        if (!fromDate && !toDate) return rows;
        const fTs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : -Infinity;
        const tTs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
        return rows.filter(r => new Date(r.EndDate).getTime() >= fTs && new Date(r.StartDate).getTime() <= tTs);
    }, [rows, fromDate, toDate]);

    const addPdfHeader = (doc: jsPDF, title: string) => {
        (doc as any).addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        (doc as any).addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');
        const pageWidth = doc.internal.pageSize.getWidth();
        try { doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18); } catch { }
        doc.setFontSize(14).text(title, pageWidth / 2, 25, { align: 'center' });
        doc.setFontSize(10).text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, 15, 35);
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
            footerY += 10;
        });

        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
        doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);

        const pageNumber = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(`Sayfa ${pageNumber} / ${pageCount}`, 15, pageHeight - 10);
    };


    const exportTableExcel = async () => {
        const wb = new Excel.Workbook();
        const ws = wb.addWorksheet("Rapor");
        ws.addRow(["Proje", "Dönem", ...statusFieldKeys.map(k => labelMap[k]), "Günlük %", "Genel %"]);
        filtered
            .filter(r => getProgressForDate(r).daily > 0)
            .forEach(r => {
                const p = getProgressForDate(r);
                ws.addRow([
                    r.ProjectName,
                    dayRangeLabel(r.StartDate),
                    ...statusFieldKeys.map(k => n0(r[k])),
                    p.daily.toFixed(2),
                    p.overall.toFixed(2)
                ]);
            });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), "Tablo_Raporu.xlsx");
    };

    const exportTablePDF = (data: ReportRow[]) => {
        const doc = new jsPDF("l", "pt", "a4");
        addPdfHeader(doc, "Proje Uygulama Planlama Tablo Raporu");
        const headers = ["Dönem", ...statusFieldKeys.map(k => labelMap[k]), "Günlük %", "Genel %"];
        const body = data
            .filter(r => getProgressForDate(r).daily > 0)
            .map(r => {
                const p = getProgressForDate(r);
                return [
                    dayRangeLabel(r.StartDate),
                    ...statusFieldKeys.map(k => n0(r[k])),
                    `${p.daily.toFixed(1)}%`,
                    `${p.overall.toFixed(1)}%`
                ];
            });
        autoTable(doc, {
            startY: 60, head: [headers], body, theme: 'grid',
            styles: { font: "NotoSans", fontSize: 6, halign: 'center' },
            headStyles: { fillColor: [41, 128, 185] },
            didDrawPage: () => addPdfFooter(doc)
        });
        doc.save(`Tablo_Raporu.pdf`);
    };

    const exportCardsPDF = (data: ReportRow[]) => {
        const doc = new jsPDF("p", "pt", "a4");

        const activeData = data.filter(r => getProgressForDate(r).daily > 0);

        activeData.forEach((r, i) => {
            if (i > 0) doc.addPage();
            const p = getProgressForDate(r);

            addPdfHeader(doc, `Proje Raporu: ${r.ProjectName}`);
            doc.text(`Dönem: ${dayRangeLabel(r.StartDate)}`, 40, 70);
            doc.text(`Günlük: %${p.daily.toFixed(2)} | Genel: %${p.overall.toFixed(2)}`, 40, 85);

            autoTable(doc, {
                startY: 100,
                head: [["Aktivite", "Miktar"]],
                body: statusFieldKeys
                    .filter(k => n0(r[k]) > 0)
                    .map(k => [labelMap[k], n0(r[k])]),
                styles: { font: "NotoSans" }
            });
            addPdfFooter(doc);
        });

        if (activeData.length > 0) {
            doc.save("Kart_Raporu.pdf");
        } else {
            alert("Gösterilecek aktif veri bulunamadı.");
        }
    };

    const exportChartPDF = async () => {
        if (!refBar.current) return;
        const dataUrl = await toPng(refBar.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
        const doc = new jsPDF("l", "pt", "a4");
        addPdfHeader(doc, "İlerleme Grafiği");
        doc.addImage(dataUrl, 'PNG', 40, 70, 760, 350);
        addPdfFooter(doc);
        doc.save("Grafik_Raporu.pdf");
    };

    const handleMainDownload = (fmt: 'pdf' | 'excel') => {
        if (view === "card") exportCardsPDF(filtered);
        else if (view === "table") fmt === 'pdf' ? exportTablePDF(filtered) : exportTableExcel();
        else if (view === "chart") exportChartPDF();
    };

    const StatPill = ({ label, value }: { label: string; value: number | null }) => (
        <Box sx={{ px: 1, py: 0.5, borderRadius: 2, bgcolor: "rgba(0,0,0,0.04)", border: "1px dashed #ccc", display: "inline-flex", alignItems: "center", gap: 1, width: '100%' }}>
            <Typography variant="caption" sx={{ flexGrow: 1, fontSize: '0.65rem' }}>{label}</Typography>
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>{n0(value)}</Typography>
        </Box>
    );

    return (
        <Box sx={{ p: 2 }}>
            <Section>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <Autocomplete
                            options={projects} loading={loadingProjects}
                            getOptionLabel={(o) => `${o.title} (${o.code})`}
                            value={selectedProject} onChange={(_, v) => setSelectedProject(v)}
                            renderInput={(p) => <TextField {...p} label="Proje Seç" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small" fullWidth>
                            <ToggleButton value="card"><IconLayoutGrid size={18} /> Kart</ToggleButton>
                            <ToggleButton value="table"><IconTable size={18} /> Tablo</ToggleButton>
                            <ToggleButton value="chart"><IconChartBar size={18} /> Grafik</ToggleButton>
                        </ToggleButtonGroup>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Paper variant="outlined" sx={{ p: 0.5, textAlign: 'center', borderColor: blue[200], bgcolor: blue[50] }}>
                            <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                                <IconTrendingUp size={16} color={blue[700]} />
                                <Typography variant="caption" fontWeight="bold">Genel İlerleme</Typography>
                            </Stack>
                            <Typography variant="h6" fontWeight="bold" color={blue[900]}>%{overallProjectProgress.toFixed(2)}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button variant="contained" color="primary" startIcon={<IconFileDownload />} onClick={() => handleMainDownload('pdf')}>
                                {view === "chart" ? "Grafik PDF" : "PDF"}
                            </Button>
                            {view === "table" && <Button variant="contained" color="success" onClick={() => handleMainDownload('excel')}>Excel</Button>}
                            <IconButton onClick={() => selectedProject && loadData(selectedProject.id)}><IconRefresh size={20} /></IconButton>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={3} mt={1}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                            <DatePicker label="Başlangıç" value={fromDate} onChange={setFromDate} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} md={3} mt={1}>
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                            <DatePicker label="Bitiş" value={toDate} onChange={setToDate} renderInput={(p) => <TextField {...p} size="small" fullWidth />} />
                        </LocalizationProvider>
                    </Grid>
                </Grid>
            </Section>

            {errorMsg && <Box sx={{ mt: 2 }}><Alert severity="error">{errorMsg}</Alert></Box>}

            {loadingReport ? <CircularProgress sx={{ display: 'block', m: '50px auto' }} /> : selectedProject ? (
                <Box sx={{ mt: 3 }}>
                    {view === "card" && (
                        <Grid container spacing={2}>
                            {filtered.filter(r => getProgressForDate(r).daily > 0).map((r, index) => {
                                const prog = getProgressForDate(r);
                                const key = `${r.ProjectId}-${r.StartDate}-${index}`;
                                const isOpen = !!expandedCards[key];
                                return (
                                    <Grid item xs={12} md={6} key={key}>
                                        <FancyCard>
                                            <Stack spacing={2}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="subtitle2" fontWeight={700}>{r.ProjectName}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{dayRangeLabel(r.StartDate)}</Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={1}>
                                                        <Box sx={{ textAlign: 'center' }}>
                                                            <Typography sx={{ fontSize: '0.6rem' }}>GÜNLÜK</Typography>
                                                            <Avatar sx={{ bgcolor: orange[500], width: 38, height: 38, fontSize: '0.7rem' }}>%{prog.daily.toFixed(0)}</Avatar>
                                                        </Box>
                                                        <Box sx={{ textAlign: 'center' }}>
                                                            <Typography sx={{ fontSize: '0.6rem' }}>GENEL</Typography>
                                                            <Avatar sx={{ bgcolor: getStatusColor(prog.overall), width: 38, height: 38, fontSize: '0.7rem' }}>%{prog.overall.toFixed(0)}</Avatar>
                                                        </Box>
                                                    </Stack>
                                                </Stack>
                                                <LinearProgress variant="determinate" value={prog.overall} sx={{ height: 6, borderRadius: 5, "& .MuiLinearProgress-bar": { bgcolor: getStatusColor(prog.overall) } }} />
                                                <Grid container spacing={1}>
                                                    <Grid item xs={6}><StatPill label="Kazı" value={r.KaziYapilanDirekDurumu} /></Grid>
                                                    <Grid item xs={6}><StatPill label="Kablo" value={r.CekilenKabloMiktari} /></Grid>
                                                </Grid>
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <IconButton color="primary" onClick={() => exportCardsPDF([r])}><IconDownload size={18} /></IconButton>
                                                    <Button size="small" endIcon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={() => toggleCard(key)} sx={{ fontSize: '0.65rem' }}>
                                                        {isOpen ? "Gizle" : "Detaylar"}
                                                    </Button>
                                                </Box>
                                                <Collapse in={isOpen}>
                                                    <Divider sx={{ my: 1 }} />
                                                    <Grid container spacing={1}>
                                                        {statusFieldKeys.map(k => (
                                                            <Grid item xs={12} sm={6} md={4} key={String(k)}><StatPill label={labelMap[k]} value={r[k]} /></Grid>
                                                        ))}
                                                    </Grid>
                                                </Collapse>
                                            </Stack>
                                        </FancyCard>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}

                    {view === "table" && (
                        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Dönem</TableCell>
                                        {statusFieldKeys.map(k => <TableCell key={String(k)}>{labelMap[k]}</TableCell>)}
                                        <TableCell>Günlük %</TableCell>
                                        <TableCell>Genel %</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filtered.filter(r => getProgressForDate(r).daily > 0).map((r, idx) => {
                                        const p = getProgressForDate(r);
                                        return (
                                            <TableRow key={idx} hover>
                                                <TableCell sx={{ fontSize: '0.7rem' }}>{dayRangeLabel(r.StartDate)}</TableCell>
                                                {statusFieldKeys.map(k => <TableCell key={String(k)} sx={{ fontSize: '0.7rem' }}>{n0(r[k])}</TableCell>)}
                                                <TableCell><Chip label={`${p.daily.toFixed(1)}%`} size="small" /></TableCell>
                                                <TableCell><Chip label={`${p.overall.toFixed(1)}%`} size="small" sx={{ bgcolor: getStatusColor(p.overall), color: '#fff' }} /></TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {view === "chart" && (
                        <Section ref={refBar} sx={{ height: 480 }}>
                            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                                İlerleme Grafiği
                            </Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <ComposedChart
                                    data={filtered.filter(r => getProgressForDate(r).daily > 0).map(r => {
                                        const prog = getProgressForDate(r);
                                        return {
                                            name: dayRangeLabel(r.StartDate),
                                            daily: prog.daily,
                                            overall: prog.overall
                                        };
                                    })}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="daily" fill={orange[400]} name="Günlük %" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="overall" fill={blue[500]} name="Genel %" radius={[4, 4, 0, 0]} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Section>
                    )}
                </Box>
            ) : <Alert severity="info" sx={{ mt: 2 }}>Lütfen bir proje seçiniz.</Alert>}
        </Box>
    );
};

export default ProjectPlanningImplementationReport;