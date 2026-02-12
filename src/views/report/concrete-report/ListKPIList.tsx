import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Box, Grid, Card, Typography, Stack, Button, Avatar, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress,
    IconButton, Paper, TextField, TablePagination
} from '@mui/material';
import {
    IconId, IconUser, IconX, IconSearch,
    IconFileSpreadsheet, IconFileText, IconNumbers
} from '@tabler/icons-react';
import axios from 'axios';
import server from 'src/assets/address.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';

const ListKPIList = () => {
    const [loading, setLoading] = useState(false);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [allPersonnels, setAllPersonnels] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(9);

    const [kpiReport, setKpiReport] = useState<any | null>(null);
    const [openModal, setOpenModal] = useState(false);
    const [kpiLoading, setKpiLoading] = useState(false);

    const authToken = localStorage.getItem('authToken');

    const formatDateDisplay = (dateString: string | null): string => {
        if (!dateString) return "-";
        try {
            return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
        } catch (e) { return "-"; }
    };

    const fetchPersonnels = useCallback(async () => {
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            setAllPersonnels(res.data?.data || []);
        } catch (e) { console.error(e); }
    }, [authToken]);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels-work-places`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            if (res.data?.httpStatusCode === 200) {
                const data = res.data.data as any[];
                const filtered = data.filter(r => r.position?.title === "Şantiye Şefi");
                setAssignments(filtered);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, [authToken]);

    useEffect(() => {
        fetchPersonnels();
        fetchAssignments();
    }, [fetchAssignments, fetchPersonnels]);

    const fetchKPIReport = async (personnelId: number) => {
        setKpiLoading(true);
        setKpiReport(null);
        try {
            const res = await axios.get(`${server.baseurl}${server.warehouse}get-project-manager-kpi-report/${personnelId}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            setKpiReport(res.data?.data);
        } catch (error) { console.error(error); }
        finally { setKpiLoading(false); }
    };

    const getPersonnelImage = (pId: number) => {
        const p = allPersonnels.find(x => x.id === pId);
        return p?.imageSrc ? `${server.urldpwonload}${p.imageSrc}` : undefined;
    };

    const handleDownloadPDF = () => {
        if (!kpiReport) return;
        const doc = new jsPDF('p', 'pt', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const addHeader = (doc: jsPDF) => {
            const docAny = doc as any;
            docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.setFont('NotoSans');
            doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);
            doc.setFontSize(14);
            doc.text("Yönetici Performans Raporu", pageWidth / 2, 25, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Rapor Tarihi: ${formatDateDisplay(new Date().toISOString())}`, 15, 35);
            doc.line(15, 40, pageWidth - 15, 40);
        };

        const addFooter = (doc: jsPDF) => {
            doc.setFontSize(8);
            doc.setTextColor(100);
            const companyInfo = [
                'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR | Tel: +90 (232) 347 74 74',
                'http://www.setasbilisim.com.tr | e-mail:setas@setasbilisim.com.tr'
            ];
            let footerY = pageHeight - 40;
            companyInfo.forEach(line => { doc.text(line, pageWidth / 2, footerY, { align: 'center' }); footerY += 10; });
            doc.setTextColor(0);
            doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
            doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);
        };

        const managerInfo = [
            ["Ad Soyad", `${kpiReport.Manager.Name} ${kpiReport.Manager.Family}`],
            ["TC Kimlik No", kpiReport.Manager.IdentityNumber || "-"],
            ["Pozisyon", kpiReport.Manager.PositionTitle],
            ["Toplam Proje Sayısı", kpiReport.ProjectCount.toString()],
            ["Genel KPI Skoru", kpiReport.AverageKpi.toString()]
        ];

        const projectBody = kpiReport.Projects.map((p: any) => [
            p.ProjectCode,
            p.ProjectTitle,
            p.WorkhouseName,
            p.ProjectKpi.toString()
        ]);

        addHeader(doc);
        autoTable(doc, {
            startY: 50,
            head: [["Açıklama", "Detay Bilgi"]],
            body: managerInfo,
            styles: { font: 'NotoSans', fontStyle: "normal", fontSize: 10 },
            headStyles: { fillColor: [33, 150, 243] },
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [["Proje Kodu", "Proje Adı", "Şantiye", "KPI"]],
            body: projectBody,
            styles: { font: 'NotoSans', fontSize: 9 },
            headStyles: { fillColor: [75, 85, 99] },
            didDrawPage: () => addFooter(doc)
        });

        doc.save(`KPI_Rapor_${kpiReport.Manager.Name}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    const handleDownloadExcel = async () => {
        if (!kpiReport) return;
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Performans Raporu');
        worksheet.addRow(['Yönetici Performans Raporu']).font = { bold: true, size: 14 };
        worksheet.addRow(['Ad Soyad', `${kpiReport.Manager.Name} ${kpiReport.Manager.Family}`]);
        worksheet.addRow(['TC Kimlik No', kpiReport.Manager.IdentityNumber]);
        worksheet.addRow(['Proje Sayısı', kpiReport.ProjectCount]);
        worksheet.addRow(['Genel Skor', kpiReport.AverageKpi]);
        worksheet.addRow([]);
        const headerRow = worksheet.addRow(['Proje Kodu', 'Proje Başlığı', 'Şantiye', 'KPI Skoru']);
        headerRow.font = { bold: true };
        kpiReport.Projects.forEach((p: any) => {
            worksheet.addRow([p.ProjectCode, p.ProjectTitle, p.WorkhouseName, p.ProjectKpi]);
        });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `KPI_Excel_${kpiReport.Manager.Name}.xlsx`);
    };
    const filteredData = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();

        const searched = assignments.filter(item => {
            const fullName = `${item.personnel?.name} ${item.personnel?.family}`.toLowerCase();
            return fullName.includes(query) || item.personnel?.identityNumber?.includes(query);
        });

        const uniqueMap = new Map();

        searched.forEach(item => {
            const pId = item.personnel?.id;
            if (pId && !uniqueMap.has(pId)) {
                uniqueMap.set(pId, item);
            }
        });

        return Array.from(uniqueMap.values());
    }, [assignments, searchTerm]);
    return (
        <Box p={3} sx={{ backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight={900}>Şantiye Şefi KPI Listesi</Typography>
                <TextField
                    placeholder="İsim veya TC No ile ara..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(0);
                    }}
                    InputProps={{ startAdornment: <IconSearch size={18} style={{ marginRight: 8 }} /> }}
                    sx={{ width: 350, bgcolor: 'white' }}
                />
            </Stack>

            {loading ? (
                <Stack alignItems="center" py={10}><CircularProgress /></Stack>
            ) : (
                <Grid container spacing={3}>
                    {filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((item) => (
                        <Grid item xs={12} sm={6} md={4} key={item.id}>
                            <Card sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                                    <Avatar src={getPersonnelImage(item.personnel?.id)} sx={{ width: 60, height: 60, borderRadius: 2 }}>
                                        <IconUser />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" fontWeight={800}>{item.personnel?.name} {item.personnel?.family}</Typography>
                                        <Typography variant="body2" color="primary" fontWeight={700}>Şantiye Şefi</Typography>
                                    </Box>
                                </Stack>
                                <Button
                                    fullWidth variant="outlined"
                                    onClick={() => { setOpenModal(true); fetchKPIReport(item.personnel.id); }}
                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                >
                                    PERFORMANS DETAYI
                                </Button>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <TablePagination component="div" count={filteredData.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))} />

            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <Typography variant="h5" fontWeight={900}>Yönetici Analiz Raporu</Typography>
                    <IconButton onClick={() => setOpenModal(false)}><IconX /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ bgcolor: '#fafafa' }}>
                    {kpiLoading ? (
                        <Stack alignItems="center" py={5}><CircularProgress /></Stack>
                    ) : kpiReport ? (
                        <Stack spacing={3}>
                            <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#ffffff', borderRadius: 4, border: '2px solid #e0e7ff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                                <Typography variant="caption" color="textSecondary" fontWeight={800} sx={{ letterSpacing: 1.5 }}>ORTALAMA KPI SKORU</Typography>
                                <Typography variant="h2" fontWeight={900} color="primary" sx={{ mt: 1 }}>{kpiReport.AverageKpi}</Typography>
                            </Box>

                            <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid #eee' }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <IconUser size={18} color="#6366f1" />
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>AD SOYAD:</Typography>
                                            <Typography variant="body2" fontWeight={800}>{kpiReport.Manager.Name} {kpiReport.Manager.Family}</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <IconId size={18} color="#6366f1" />
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>TC KİMLİK:</Typography>
                                            <Typography variant="body2" fontWeight={800}>{kpiReport.Manager.IdentityNumber || "-"}</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <IconNumbers size={18} color="#6366f1" />
                                            <Typography variant="caption" color="textSecondary" fontWeight={700}>PROJE SAYISI:</Typography>
                                            <Typography variant="body2" fontWeight={800}>{kpiReport.ProjectCount}</Typography>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Typography variant="subtitle2" fontWeight={900} color="textSecondary" sx={{ ml: 1 }}>PROJE BAZLI DETAYLAR</Typography>
                            <Stack spacing={1.5}>
                                {kpiReport.Projects?.map((proj: any) => (
                                    <Box key={proj.ProjectId} sx={{ p: 2, bgcolor: 'white', border: '1px solid #f0f0f0', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s', '&:hover': { borderColor: '#6366f1' } }}>
                                        <Box>
                                            <Typography variant="body2" fontWeight={800}>{proj.ProjectTitle}</Typography>
                                            <Typography variant="caption" color="textSecondary">{proj.WorkhouseName}</Typography>
                                        </Box>
                                        <Typography variant="h6" fontWeight={900} color="primary">{proj.ProjectKpi}</Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </Stack>
                    ) : <Typography align="center">Veri yüklenemedi.</Typography>}
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1.5 }}>
                    <Button fullWidth variant="contained" color="error" startIcon={<IconFileText />} onClick={handleDownloadPDF} disabled={!kpiReport} sx={{ py: 1.2, borderRadius: 3, fontWeight: 800 }}>PDF</Button>
                    <Button fullWidth variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={handleDownloadExcel} disabled={!kpiReport} sx={{ py: 1.2, borderRadius: 3, fontWeight: 800 }}>EXCEL</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListKPIList;