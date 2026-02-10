import { useState, useCallback, useMemo } from 'react';
import {
    Box, Grid, Card, Typography, Stack, Button, Avatar, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress,
    Alert, IconButton, Divider, Paper, Fade,
    TextField, InputAdornment, TablePagination
} from '@mui/material';
import {
    IconUsers, IconLayoutBoard, IconChevronRight, IconRefresh,
    IconId, IconArrowLeft, IconUser, IconBuildingCommunity, IconX,
    IconSearch, IconFilterOff,
    IconFileDownload
} from '@tabler/icons-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import server from 'src/assets/address.json';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import { TimesNewRoman } from 'src/assets/fonts/Times';
import { ArialFont } from 'src/assets/fonts/Arial';
import Logo from 'src/assets/images/logos/logo.png';

const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy', { locale: tr });
    } catch (e) {
        console.log("Tarih biçimlendirilirken hata oluştu:", e);
        return "Geçersiz Tarih";
    }
};

const KPIGauge = ({ value, loading }: { value: number | null, loading: boolean }) => {
    if (loading) return <CircularProgress size={40} />;
    const score = value || 0;
    const absScore = Math.min(Math.abs(score), 100);
    const data = [
        { value: absScore, color: score >= 0 ? '#10b981' : '#f43f5e' },
        { value: 100 - absScore, color: '#e2e8f0' },
    ];

    return (
        <Box sx={{ width: '100%', height: 180, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} cx="50%" cy="80%" startAngle={180} endAngle={0} innerRadius={70} outerRadius={90} dataKey="value" stroke="none">
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <Box sx={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: score >= 0 ? '#10b981' : '#f43f5e' }}>{score}%</Typography>
                <Typography variant="caption" color="textSecondary" fontWeight={800}>KPI SKORU</Typography>
            </Box>
        </Box>
    );
};

const ListKPIList = () => {
    const [mode, setMode] = useState<'none' | 'personnel' | 'project'>('none');
    const [loading, setLoading] = useState(false);
    const [dataList, setDataList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(6);

    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [openModal, setOpenModal] = useState(false);
    const [kpiLoading, setKpiLoading] = useState(false);
    const [kpiValue, setKpiValue] = useState<number | null>(null);

    const authToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('activeUserRoleName') || '';

    const fetchData = useCallback(async (targetMode: 'personnel' | 'project') => {
        setLoading(true);
        setSearchTerm('');
        setPage(0);
        try {
            if (targetMode === 'personnel') {
                const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                setDataList(res.data?.data || []);
            } else {
                let requestParams = role.toLowerCase() !== 'admin' ? { rolename: role } : {};
                const res = await axios.get(`${server.baseurl}${server.warehouse}get-project`, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    params: requestParams
                });
                setDataList(res.data?.data || []);
            }
        } catch (error) {
            console.error("Fetch error", error);
        } finally {
            setLoading(false);
        }
    }, [authToken, role]);

    const fetchKPI = async (id: number) => {
        setKpiLoading(true);
        setKpiValue(null);
        const kpiEndpoint = mode === 'personnel'
            ? `${server.baseurl}${server.warehouse}get-project-manager-kpi/${id}`
            : `${server.baseurl}${server.warehouse}get-project-kpi/${id}`;
        try {
            const res = await axios.get(kpiEndpoint, { headers: { Authorization: `Bearer ${authToken}` } });
            setKpiValue(res.data?.data);
        } catch (error) { setKpiValue(0); } finally { setKpiLoading(false); }
    };

    const filteredData = useMemo(() => {
        const query = searchTerm.toLowerCase().trim();
        if (!query) return dataList;

        return dataList.filter(item => {
            if (mode === 'personnel') {
                return (
                    item.name?.toLowerCase().includes(query) ||
                    item.family?.toLowerCase().includes(query) ||
                    item.identityNumber?.includes(query)
                );
            } else {
                return (
                    item.title?.toLowerCase().includes(query) ||
                    item.code?.toLowerCase().includes(query)
                );
            }
        });
    }, [dataList, searchTerm, mode]);

    const paginatedData = useMemo(() => {
        return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const handleModeChange = (newMode: 'personnel' | 'project') => {
        setMode(newMode);
        fetchData(newMode);
    };

    const handleDownloadPDF = () => {
        if (!selectedItem) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try {
            doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
            doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
            doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
            doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
            doc.addFileToVFS('Arial.ttf', ArialFont);
            doc.addFont('Arial.ttf', 'Arial', 'normal');

            doc.setFont('Arial', 'bold');
            doc.setFontSize(14);
            doc.text('Performans Analiz Raporu', pageWidth / 2, 15, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('NotoSans', 'bold');
            doc.text(`Rapor Tarihi:`, 15, 40);
            doc.setFont('NotoSans', 'normal');
            doc.text(`${formatDate(new Date().toISOString())}`, 40, 40);

            doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);

            doc.setLineWidth(0.5);
            doc.line(15, 45, pageWidth - 15, 45);
            const safeKpiValue = kpiValue ?? 0;

            const kpiColor = safeKpiValue >= 0 ? [16, 185, 129] : [244, 63, 94];
            const bodyData = [
                [{ content: 'GENEL BİLGİLER', colSpan: 2, styles: { halign: 'center', fillColor: [240, 240, 240], fontStyle: 'normal' } }],
                ['İsim / Başlık:', mode === 'personnel' ? `${selectedItem.name} ${selectedItem.family}` : selectedItem.title],
                ['Kod / TC:', mode === 'personnel' ? selectedItem.identityNumber : selectedItem.code],
                ['KPI SKORU:', { content: `%${kpiValue || 0}`, styles: { textColor: kpiColor, fontStyle: 'normal', fontSize: 12 } }],
                [{ content: 'DETAYLAR', colSpan: 2, styles: { halign: 'center', fillColor: [240, 240, 240], fontStyle: 'normal' } }],
            ];

            if (mode === 'personnel') {
                bodyData.push(['Pozisyon:', selectedItem.position?.title || '-']);
                bodyData.push(['Giriş Tarihi:', formatDate(selectedItem.workStartDate)]);
            } else {
                bodyData.push(['Şantiye:', selectedItem.workhouse?.name || '-']);
                bodyData.push(['Başlama Tarihi:', formatDate(selectedItem.startDate)]);
            }

            autoTable(doc, {
                startY: 55,
                body: bodyData,
                theme: 'grid',
                styles: { font: 'Arial', fontSize: 10, cellPadding: 5 },
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'normal' } },
                margin: { left: 15, right: 15 }
            });

            const companyInfo = [
                'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
                'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
                'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
            ];

            doc.setFontSize(8);
            doc.setFont('NotoSans', 'normal');
            let footerY = pageHeight - 25;
            companyInfo.forEach(line => {
                doc.text(line, pageWidth / 2, footerY, { align: 'center' });
                footerY += 4;
            });

            doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
            doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);
            doc.text(`Sayfa 1 / 1`, 15, pageHeight - 10);

            doc.save(`KPI_Raporu_${selectedItem.id}.pdf`);
        } catch (error) {
            console.error("PDF Error:", error);
        }
    };
    return (
        <Box p={2} sx={{ minHeight: '100vh', backgroundColor: '#f4f6f8' }}>

            {mode !== 'none' && (
                <Fade in={true}>
                    <Alert
                        severity="info"
                        variant="filled"
                        icon={<IconRefresh size={22} />}
                        action={
                            <Button color="inherit" size="small" onClick={() => setMode('none')} startIcon={<IconArrowLeft />} sx={{ fontWeight: 800 }}>
                                DEĞİŞTİR
                            </Button>
                        }
                        sx={{ mb: 3, borderRadius: 4, boxShadow: 3 }}
                    >
                        <Typography variant="body1" fontWeight={700}>
                            Şu an {mode === 'personnel' ? 'PERSONEL' : 'PROJE'} KPI listesindesiniz.
                        </Typography>
                    </Alert>
                </Fade>
            )}

            {mode === 'none' && (
                <Grid container spacing={4} justifyContent="center" sx={{ mt: 10 }}>
                    <Grid item xs={12} md={5}>
                        <Card sx={{ p: 6, textAlign: 'center', cursor: 'pointer', borderRadius: 8, transition: '0.4s', '&:hover': { transform: 'translateY(-10px)', boxShadow: 15 } }} onClick={() => handleModeChange('personnel')}>
                            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 100, height: 100, mx: 'auto', mb: 3 }}><IconUsers size={50} /></Avatar>
                            <Typography variant="h4" fontWeight={900}>PERSONEL KPI</Typography>
                            <Button variant="contained" fullWidth sx={{ mt: 4, py: 1.5, borderRadius: 4 }}>SEÇ</Button>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Card sx={{ p: 6, textAlign: 'center', cursor: 'pointer', borderRadius: 8, transition: '0.4s', '&:hover': { transform: 'translateY(-10px)', boxShadow: 15 } }} onClick={() => handleModeChange('project')}>
                            <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', width: 100, height: 100, mx: 'auto', mb: 3 }}><IconBuildingCommunity size={50} /></Avatar>
                            <Typography variant="h4" fontWeight={900}>PROJE KPI</Typography>
                            <Button variant="contained" color="secondary" fullWidth sx={{ mt: 4, py: 1.5, borderRadius: 4 }}>SEÇ</Button>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {mode !== 'none' && !loading && (
                <Paper sx={{ p: 2, mb: 3, borderRadius: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                    <TextField
                        placeholder={mode === 'personnel' ? "İsim , TC Kimlik No ile ara..." : "Proje Adı , Kodu ile ara..."}
                        size="small"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                        sx={{ minWidth: 300 }}
                        InputProps={{
                            startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>),
                            endAdornment: searchTerm && (
                                <IconButton size="small" onClick={() => setSearchTerm('')}><IconX size={16} /></IconButton>
                            )
                        }}
                    />
                    <TablePagination
                        component="div"
                        count={filteredData.length}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                        rowsPerPageOptions={[6, 12, 24]}
                        labelRowsPerPage="Sayfa başı:"
                    />
                </Paper>
            )}
            {loading ? (
                <Stack alignItems="center" py={10}><CircularProgress size={50} /></Stack>
            ) : mode !== 'none' && (
                <>
                    {paginatedData.length > 0 ? (
                        <Grid container spacing={3}>
                            {paginatedData.map((item) => (
                                <Grid item xs={12} sm={6} md={4} key={item.id}>
                                    <Card sx={{ p: 3, borderRadius: 5, transition: '0.3s', '&:hover': { boxShadow: 10 } }}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar
                                                src={mode === 'personnel' ? `${server.urldpwonload}${item.imageSrc}` : undefined}
                                                variant="rounded"
                                                sx={{ width: 70, height: 70, borderRadius: 3, bgcolor: 'primary.main' }}
                                            >
                                                {mode === 'project' ? <IconLayoutBoard size={32} /> : <IconUser size={32} />}
                                            </Avatar>
                                            <Box flex={1} minWidth={0}>
                                                <Typography variant="h6" fontWeight={800} noWrap>
                                                    {mode === 'personnel' ? `${item.name} ${item.family}` : item.title}
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <IconId size={16} /> {mode === 'personnel' ? item.identityNumber : item.code}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                                        <Button
                                            fullWidth variant="outlined"
                                            onClick={() => { setSelectedItem(item); setOpenModal(true); fetchKPI(item.id); }}
                                            endIcon={<IconChevronRight />}
                                            sx={{ borderRadius: 3, fontWeight: 700 }}
                                        >
                                            DETAYLARI GÖR
                                        </Button>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Stack alignItems="center" py={10} color="textSecondary">
                            <IconFilterOff size={48} />
                            <Typography variant="h6" mt={2}>Sonuç bulunamadı.</Typography>
                        </Stack>
                    )}
                </>
            )}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 6 } }}>
                <DialogTitle sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
                    <Typography variant="h5" fontWeight={900}>Performans Analizi</Typography>
                    <IconButton onClick={() => setOpenModal(false)}><IconX /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 4 }}>
                    {selectedItem && (
                        <Stack spacing={4}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 5, bgcolor: '#fff' }}>
                                <KPIGauge value={kpiValue} loading={kpiLoading} />
                            </Paper>
                            <Grid container spacing={3}>
                                <Grid item xs={12}><Typography variant="subtitle2" color="primary" fontWeight={900}>GENEL BİLGİLER</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>İSİM / BAŞLIK</Typography><Typography fontWeight={700}>{mode === 'personnel' ? `${selectedItem.name} ${selectedItem.family}` : selectedItem.title}</Typography></Grid>
                                <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>KOD / TC</Typography><Typography fontWeight={700}>{mode === 'personnel' ? selectedItem.identityNumber : selectedItem.code}</Typography></Grid>
                                <Grid item xs={12}><Divider /></Grid>
                                {mode === 'personnel' ? (
                                    <>
                                        <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>POZİSYON</Typography><Typography fontWeight={600}>{selectedItem.position?.title || '-'}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>GİRİŞ TARİHİ</Typography><Typography fontWeight={600}>{selectedItem.workStartDate || '-'}</Typography></Grid>
                                    </>
                                ) : (
                                    <>
                                        <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>ŞANTİYE</Typography><Typography fontWeight={600}>{selectedItem.workhouse?.name || '-'}</Typography></Grid>
                                        <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>BAŞLAMA</Typography><Typography fontWeight={600}>{selectedItem.startDate || '-'}</Typography></Grid>
                                    </>
                                )}
                            </Grid>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button
                        onClick={handleDownloadPDF}
                        variant="contained"
                        color="secondary"
                        startIcon={<IconFileDownload />}
                        sx={{ borderRadius: 3, fontWeight: 800, px: 4 }}
                    >
                        PDF OLARAK İNDİR
                    </Button>

                    <Button
                        onClick={() => setOpenModal(false)}
                        variant="outlined"
                        sx={{ borderRadius: 3, fontWeight: 800 }}
                    >
                        KAPAT
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListKPIList;
