// import { useState, useCallback, useMemo } from 'react';
// import {
//     Box, Grid, Card, Typography, Stack, Button, Avatar, Dialog,
//     DialogTitle, DialogContent, DialogActions, CircularProgress,
//     Alert, IconButton, Divider, Paper, Fade,
//     TextField, InputAdornment, TablePagination
// } from '@mui/material';
// import {
//     IconUsers, IconLayoutBoard, IconChevronRight, IconRefresh,
//     IconId, IconArrowLeft, IconUser, IconBuildingCommunity, IconX,
//     IconSearch, IconFilterOff,
//     IconFileDownload
// } from '@tabler/icons-react';
// import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
// import axios from 'axios';
// import server from 'src/assets/address.json';

// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import { tr } from 'date-fns/locale';
// import { format } from 'date-fns';
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import { TimesNewRoman } from 'src/assets/fonts/Times';
// import { ArialFont } from 'src/assets/fonts/Arial';
// import Logo from 'src/assets/images/logos/logo.png';

// const formatDate = (dateString: string | null): string => {
//     if (!dateString) return "-";
//     try {
//         const date = new Date(dateString);
//         return format(date, 'dd MMMM yyyy', { locale: tr });
//     } catch (e) {
//         console.log("Tarih biçimlendirilirken hata oluştu:", e);
//         return "Geçersiz Tarih";
//     }
// };

// const KPIGauge = ({ value, loading }: { value: number | null, loading: boolean }) => {
//     if (loading) return <CircularProgress size={40} />;
//     const score = value || 0;
//     const absScore = Math.min(Math.abs(score), 100);
//     const data = [
//         { value: absScore, color: score >= 0 ? '#10b981' : '#f43f5e' },
//         { value: 100 - absScore, color: '#e2e8f0' },
//     ];

//     return (
//         <Box sx={{ width: '100%', height: 180, position: 'relative' }}>
//             <ResponsiveContainer width="100%" height="100%">
//                 <PieChart>
//                     <Pie data={data} cx="50%" cy="80%" startAngle={180} endAngle={0} innerRadius={70} outerRadius={90} dataKey="value" stroke="none">
//                         {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
//                     </Pie>
//                 </PieChart>
//             </ResponsiveContainer>
//             <Box sx={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
//                 <Typography variant="h3" fontWeight={900} sx={{ color: score >= 0 ? '#10b981' : '#f43f5e' }}>{score}%</Typography>
//                 <Typography variant="caption" color="textSecondary" fontWeight={800}>KPI SKORU</Typography>
//             </Box>
//         </Box>
//     );
// };

// const ListKPIList = () => {
//     const [mode, setMode] = useState<'none' | 'personnel' | 'project'>('none');
//     const [loading, setLoading] = useState(false);
//     const [dataList, setDataList] = useState<any[]>([]);
//     const [searchTerm, setSearchTerm] = useState('');

//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(6);

//     const [selectedItem, setSelectedItem] = useState<any | null>(null);
//     const [openModal, setOpenModal] = useState(false);
//     const [kpiLoading, setKpiLoading] = useState(false);
//     const [kpiValue, setKpiValue] = useState<number | null>(null);

//     const authToken = localStorage.getItem('authToken');
//     const role = localStorage.getItem('activeUserRoleName') || '';

//     const fetchData = useCallback(async (targetMode: 'personnel' | 'project') => {
//         setLoading(true);
//         setSearchTerm('');
//         setPage(0);
//         try {
//             if (targetMode === 'personnel') {
//                 const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, {
//                     headers: { Authorization: `Bearer ${authToken}` }
//                 });
//                 setDataList(res.data?.data || []);
//             } else {
//                 let requestParams = role.toLowerCase() !== 'admin' ? { rolename: role } : {};
//                 const res = await axios.get(`${server.baseurl}${server.warehouse}get-project`, {
//                     headers: { Authorization: `Bearer ${authToken}` },
//                     params: requestParams
//                 });
//                 setDataList(res.data?.data || []);
//             }
//         } catch (error) {
//             console.error("Fetch error", error);
//         } finally {
//             setLoading(false);
//         }
//     }, [authToken, role]);

//     const fetchKPI = async (id: number) => {
//         setKpiLoading(true);
//         setKpiValue(null);
//         const kpiEndpoint = mode === 'personnel'
//             ? `${server.baseurl}${server.warehouse}get-project-manager-kpi/${id}`
//             : `${server.baseurl}${server.warehouse}get-project-kpi/${id}`;
//         try {
//             const res = await axios.get(kpiEndpoint, { headers: { Authorization: `Bearer ${authToken}` } });
//             setKpiValue(res.data?.data);
//         } catch (error) { setKpiValue(0); } finally { setKpiLoading(false); }
//     };

//     const filteredData = useMemo(() => {
//         const query = searchTerm.toLowerCase().trim();
//         if (!query) return dataList;

//         return dataList.filter(item => {
//             if (mode === 'personnel') {
//                 return (
//                     item.name?.toLowerCase().includes(query) ||
//                     item.family?.toLowerCase().includes(query) ||
//                     item.identityNumber?.includes(query)
//                 );
//             } else {
//                 return (
//                     item.title?.toLowerCase().includes(query) ||
//                     item.code?.toLowerCase().includes(query)
//                 );
//             }
//         });
//     }, [dataList, searchTerm, mode]);

//     const paginatedData = useMemo(() => {
//         return filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
//     }, [filteredData, page, rowsPerPage]);

//     const handleModeChange = (newMode: 'personnel' | 'project') => {
//         setMode(newMode);
//         fetchData(newMode);
//     };

//     const handleDownloadPDF = () => {
//         if (!selectedItem) return;

//         const doc = new jsPDF();
//         const pageWidth = doc.internal.pageSize.getWidth();
//         const pageHeight = doc.internal.pageSize.getHeight();

//         try {
//             doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//             doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//             doc.addFileToVFS('Times-New-Roman.ttf', TimesNewRoman);
//             doc.addFont('Times-New-Roman.ttf', 'Times', 'normal');
//             doc.addFileToVFS('Arial.ttf', ArialFont);
//             doc.addFont('Arial.ttf', 'Arial', 'normal');

//             doc.setFont('Arial', 'bold');
//             doc.setFontSize(14);
//             doc.text('Performans Analiz Raporu', pageWidth / 2, 15, { align: 'center' });

//             doc.setFontSize(10);
//             doc.setFont('NotoSans', 'bold');
//             doc.text(`Rapor Tarihi:`, 15, 40);
//             doc.setFont('NotoSans', 'normal');
//             doc.text(`${formatDate(new Date().toISOString())}`, 40, 40);

//             doc.addImage(Logo, 'PNG', pageWidth - 50, 10, 35, 18);

//             doc.setLineWidth(0.5);
//             doc.line(15, 45, pageWidth - 15, 45);
//             const safeKpiValue = kpiValue ?? 0;

//             const kpiColor = safeKpiValue >= 0 ? [16, 185, 129] : [244, 63, 94];
//             const bodyData = [
//                 [{ content: 'GENEL BİLGİLER', colSpan: 2, styles: { halign: 'center', fillColor: [240, 240, 240], fontStyle: 'normal' } }],
//                 ['İsim / Başlık:', mode === 'personnel' ? `${selectedItem.name} ${selectedItem.family}` : selectedItem.title],
//                 ['Kod / TC:', mode === 'personnel' ? selectedItem.identityNumber : selectedItem.code],
//                 ['KPI SKORU:', { content: `%${kpiValue || 0}`, styles: { textColor: kpiColor, fontStyle: 'normal', fontSize: 12 } }],
//                 [{ content: 'DETAYLAR', colSpan: 2, styles: { halign: 'center', fillColor: [240, 240, 240], fontStyle: 'normal' } }],
//             ];

//             if (mode === 'personnel') {
//                 bodyData.push(['Pozisyon:', selectedItem.position?.title || '-']);
//                 bodyData.push(['Giriş Tarihi:', formatDate(selectedItem.workStartDate)]);
//             } else {
//                 bodyData.push(['Şantiye:', selectedItem.workhouse?.name || '-']);
//                 bodyData.push(['Başlama Tarihi:', formatDate(selectedItem.startDate)]);
//             }

//             autoTable(doc, {
//                 startY: 55,
//                 body: bodyData,
//                 theme: 'grid',
//                 styles: { font: 'Arial', fontSize: 10, cellPadding: 5 },
//                 columnStyles: { 0: { cellWidth: 50, fontStyle: 'normal' } },
//                 margin: { left: 15, right: 15 }
//             });

//             const companyInfo = [
//                 'SETAŞ SİSTEM BİLİŞİM İNŞAAT TAAHHÜT TİCARET LTD. ŞTİ.',
//                 'Mansuroğlu Mh. 283/6 Sk. No: 2 Bayraklı - İZMİR Tel: +90 (232) 347 74 74 pbx Fax: +90 (232) 347 77 11',
//                 'http://www.setasbilisim.com.tr e-mail:setas@setasbilisim.com.tr'
//             ];

//             doc.setFontSize(8);
//             doc.setFont('NotoSans', 'normal');
//             let footerY = pageHeight - 25;
//             companyInfo.forEach(line => {
//                 doc.text(line, pageWidth / 2, footerY, { align: 'center' });
//                 footerY += 4;
//             });

//             doc.text('İmza', pageWidth - 20, pageHeight - 12, { align: 'right' });
//             doc.line(pageWidth - 60, pageHeight - 10, pageWidth - 10, pageHeight - 10);
//             doc.text(`Sayfa 1 / 1`, 15, pageHeight - 10);

//             doc.save(`KPI_Raporu_${selectedItem.id}.pdf`);
//         } catch (error) {
//             console.error("PDF Error:", error);
//         }
//     };
//     return (
//         <Box p={2} sx={{ minHeight: '100vh', backgroundColor: '#f4f6f8' }}>

//             {mode !== 'none' && (
//                 <Fade in={true}>
//                     <Alert
//                         severity="info"
//                         variant="filled"
//                         icon={<IconRefresh size={22} />}
//                         action={
//                             <Button color="inherit" size="small" onClick={() => setMode('none')} startIcon={<IconArrowLeft />} sx={{ fontWeight: 800 }}>
//                                 DEĞİŞTİR
//                             </Button>
//                         }
//                         sx={{ mb: 3, borderRadius: 4, boxShadow: 3 }}
//                     >
//                         <Typography variant="body1" fontWeight={700}>
//                             Şu an {mode === 'personnel' ? 'PERSONEL' : 'PROJE'} KPI listesindesiniz.
//                         </Typography>
//                     </Alert>
//                 </Fade>
//             )}

//             {mode === 'none' && (
//                 <Grid container spacing={4} justifyContent="center" sx={{ mt: 10 }}>
//                     <Grid item xs={12} md={5}>
//                         <Card sx={{ p: 6, textAlign: 'center', cursor: 'pointer', borderRadius: 8, transition: '0.4s', '&:hover': { transform: 'translateY(-10px)', boxShadow: 15 } }} onClick={() => handleModeChange('personnel')}>
//                             <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 100, height: 100, mx: 'auto', mb: 3 }}><IconUsers size={50} /></Avatar>
//                             <Typography variant="h4" fontWeight={900}>PERSONEL KPI</Typography>
//                             <Button variant="contained" fullWidth sx={{ mt: 4, py: 1.5, borderRadius: 4 }}>SEÇ</Button>
//                         </Card>
//                     </Grid>
//                     <Grid item xs={12} md={5}>
//                         <Card sx={{ p: 6, textAlign: 'center', cursor: 'pointer', borderRadius: 8, transition: '0.4s', '&:hover': { transform: 'translateY(-10px)', boxShadow: 15 } }} onClick={() => handleModeChange('project')}>
//                             <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', width: 100, height: 100, mx: 'auto', mb: 3 }}><IconBuildingCommunity size={50} /></Avatar>
//                             <Typography variant="h4" fontWeight={900}>PROJE KPI</Typography>
//                             <Button variant="contained" color="secondary" fullWidth sx={{ mt: 4, py: 1.5, borderRadius: 4 }}>SEÇ</Button>
//                         </Card>
//                     </Grid>
//                 </Grid>
//             )}

//             {mode !== 'none' && !loading && (
//                 <Paper sx={{ p: 2, mb: 3, borderRadius: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
//                     <TextField
//                         placeholder={mode === 'personnel' ? "İsim , TC Kimlik No ile ara..." : "Proje Adı , Kodu ile ara..."}
//                         size="small"
//                         value={searchTerm}
//                         onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
//                         sx={{ minWidth: 300 }}
//                         InputProps={{
//                             startAdornment: (<InputAdornment position="start"><IconSearch size={20} /></InputAdornment>),
//                             endAdornment: searchTerm && (
//                                 <IconButton size="small" onClick={() => setSearchTerm('')}><IconX size={16} /></IconButton>
//                             )
//                         }}
//                     />
//                     <TablePagination
//                         component="div"
//                         count={filteredData.length}
//                         page={page}
//                         onPageChange={(_, newPage) => setPage(newPage)}
//                         rowsPerPage={rowsPerPage}
//                         onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
//                         rowsPerPageOptions={[6, 12, 24]}
//                         labelRowsPerPage="Sayfa başı:"
//                     />
//                 </Paper>
//             )}
//             {loading ? (
//                 <Stack alignItems="center" py={10}><CircularProgress size={50} /></Stack>
//             ) : mode !== 'none' && (
//                 <>
//                     {paginatedData.length > 0 ? (
//                         <Grid container spacing={3}>
//                             {paginatedData.map((item) => (
//                                 <Grid item xs={12} sm={6} md={4} key={item.id}>
//                                     <Card sx={{ p: 3, borderRadius: 5, transition: '0.3s', '&:hover': { boxShadow: 10 } }}>
//                                         <Stack direction="row" spacing={2} alignItems="center">
//                                             <Avatar
//                                                 src={mode === 'personnel' ? `${server.urldpwonload}${item.imageSrc}` : undefined}
//                                                 variant="rounded"
//                                                 sx={{ width: 70, height: 70, borderRadius: 3, bgcolor: 'primary.main' }}
//                                             >
//                                                 {mode === 'project' ? <IconLayoutBoard size={32} /> : <IconUser size={32} />}
//                                             </Avatar>
//                                             <Box flex={1} minWidth={0}>
//                                                 <Typography variant="h6" fontWeight={800} noWrap>
//                                                     {mode === 'personnel' ? `${item.name} ${item.family}` : item.title}
//                                                 </Typography>
//                                                 <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
//                                                     <IconId size={16} /> {mode === 'personnel' ? item.identityNumber : item.code}
//                                                 </Typography>
//                                             </Box>
//                                         </Stack>
//                                         <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
//                                         <Button
//                                             fullWidth variant="outlined"
//                                             onClick={() => { setSelectedItem(item); setOpenModal(true); fetchKPI(item.id); }}
//                                             endIcon={<IconChevronRight />}
//                                             sx={{ borderRadius: 3, fontWeight: 700 }}
//                                         >
//                                             DETAYLARI GÖR
//                                         </Button>
//                                     </Card>
//                                 </Grid>
//                             ))}
//                         </Grid>
//                     ) : (
//                         <Stack alignItems="center" py={10} color="textSecondary">
//                             <IconFilterOff size={48} />
//                             <Typography variant="h6" mt={2}>Sonuç bulunamadı.</Typography>
//                         </Stack>
//                     )}
//                 </>
//             )}
//             <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 6 } }}>
//                 <DialogTitle sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
//                     <Typography variant="h5" fontWeight={900}>Performans Analizi</Typography>
//                     <IconButton onClick={() => setOpenModal(false)}><IconX /></IconButton>
//                 </DialogTitle>
//                 <DialogContent dividers sx={{ p: 4 }}>
//                     {selectedItem && (
//                         <Stack spacing={4}>
//                             <Paper variant="outlined" sx={{ p: 2, borderRadius: 5, bgcolor: '#fff' }}>
//                                 <KPIGauge value={kpiValue} loading={kpiLoading} />
//                             </Paper>
//                             <Grid container spacing={3}>
//                                 <Grid item xs={12}><Typography variant="subtitle2" color="primary" fontWeight={900}>GENEL BİLGİLER</Typography></Grid>
//                                 <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>İSİM / BAŞLIK</Typography><Typography fontWeight={700}>{mode === 'personnel' ? `${selectedItem.name} ${selectedItem.family}` : selectedItem.title}</Typography></Grid>
//                                 <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>KOD / TC</Typography><Typography fontWeight={700}>{mode === 'personnel' ? selectedItem.identityNumber : selectedItem.code}</Typography></Grid>
//                                 <Grid item xs={12}><Divider /></Grid>
//                                 {mode === 'personnel' ? (
//                                     <>
//                                         <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>POZİSYON</Typography><Typography fontWeight={600}>{selectedItem.position?.title || '-'}</Typography></Grid>
//                                         <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>GİRİŞ TARİHİ</Typography><Typography fontWeight={600}>{selectedItem.workStartDate || '-'}</Typography></Grid>
//                                     </>
//                                 ) : (
//                                     <>
//                                         <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>ŞANTİYE</Typography><Typography fontWeight={600}>{selectedItem.workhouse?.name || '-'}</Typography></Grid>
//                                         <Grid item xs={6}><Typography variant="caption" color="textSecondary" fontWeight={700}>BAŞLAMA</Typography><Typography fontWeight={600}>{selectedItem.startDate || '-'}</Typography></Grid>
//                                     </>
//                                 )}
//                             </Grid>
//                         </Stack>
//                     )}
//                 </DialogContent>
//                 <DialogActions sx={{ p: 3, gap: 1 }}>
//                     <Button
//                         onClick={handleDownloadPDF}
//                         variant="contained"
//                         color="secondary"
//                         startIcon={<IconFileDownload />}
//                         sx={{ borderRadius: 3, fontWeight: 800, px: 4 }}
//                     >
//                         PDF OLARAK İNDİR
//                     </Button>

//                     <Button
//                         onClick={() => setOpenModal(false)}
//                         variant="outlined"
//                         sx={{ borderRadius: 3, fontWeight: 800 }}
//                     >
//                         KAPAT
//                     </Button>
//                 </DialogActions>
//             </Dialog>
//         </Box>
//     );
// };

// import { useState, useCallback, useMemo, useEffect } from 'react';
// import {
//     Box, Grid, Card, Typography, Stack, Button, Avatar, Dialog,
//     DialogTitle, DialogContent, DialogActions, CircularProgress,
//     IconButton, Divider, Paper, TextField, InputAdornment, TablePagination
// } from '@mui/material';
// import {
//     IconChevronRight, IconId, IconUser, IconX, IconSearch,
//     IconFilterOff, IconFileDownload, IconChartBar, IconFileSpreadsheet, IconFileText
// } from '@tabler/icons-react';
// import axios from 'axios';
// import server from 'src/assets/address.json';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import Excel from 'exceljs';
// import { saveAs } from 'file-saver';
// import { tr } from 'date-fns/locale';
// import { format } from 'date-fns';
// import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
// import Logo from 'src/assets/images/logos/logo.png';

// // --- KPI Skor Göstergesi (Yüzde işareti kaldırıldı) ---
// const KPIScoreBadge = ({ value, loading }: { value: number | null, loading: boolean }) => {
//     if (loading) return <CircularProgress size={30} />;
//     const score = value || 0;
//     const color = score >= 0 ? '#10b981' : '#f43f5e';

//     return (
//         <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8fafc', borderRadius: 4, border: '1px dashed #cbd5e1' }}>
//             <Typography variant="caption" color="textSecondary" fontWeight={800} display="block">
//                 GENEL KPI SKORU
//             </Typography>
//             <Typography variant="h2" fontWeight={900} sx={{ color: color }}>
//                 {score}
//             </Typography>
//         </Box>
//     );
// };

// const ListKPIList = () => {
//     const [loading, setLoading] = useState(false);
//     const [assignments, setAssignments] = useState<any[]>([]);
//     const [allPersonnels, setAllPersonnels] = useState<any[]>([]);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [page, setPage] = useState(0);
//     const [rowsPerPage, setRowsPerPage] = useState(6);

//     const [selectedItem, setSelectedItem] = useState<any | null>(null);
//     const [kpiReport, setKpiReport] = useState<any | null>(null);
//     const [openModal, setOpenModal] = useState(false);
//     const [kpiLoading, setKpiLoading] = useState(false);

//     const authToken = localStorage.getItem('authToken');

//     const formatDate = (dateString: string | null): string => {
//         if (!dateString) return "-";
//         try {
//             return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
//         } catch (e) { return "-"; }
//     };

//     // Personel listesini (Resimler için) çekme
//     const fetchPersonnels = useCallback(async () => {
//         try {
//             const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels`, {
//                 headers: { Authorization: `Bearer ${authToken}` }
//             });
//             setAllPersonnels(res.data?.data || []);
//         } catch (e) { console.error(e); }
//     }, [authToken]);

//     // Şantiye Şeflerini Çekme
//     const fetchAssignments = useCallback(async () => {
//         setLoading(true);
//         try {
//             const res = await axios.get(`${server.baseurl}${server.hr}get-all-personnels-work-places`, {
//                 headers: { Authorization: `Bearer ${authToken}` }
//             });
//             if (res.data?.httpStatusCode === 200) {
//                 const data = res.data.data as any[];
//                 // Sadece "Şantiye Şefi" olanları filtrele
//                 const filtered = data.filter(r => r.position?.title === "Şantiye Şefi");
//                 setAssignments(filtered);
//             }
//         } catch (error) { console.error(error); }
//         finally { setLoading(false); }
//     }, [authToken]);

//     useEffect(() => {
//         fetchPersonnels();
//         fetchAssignments();
//     }, [fetchAssignments, fetchPersonnels]);

//     const fetchKPIReport = async (personnelId: number) => {
//         setKpiLoading(true);
//         setKpiReport(null);
//         try {
//             const res = await axios.get(`${server.baseurl}${server.warehouse}get-project-manager-kpi-report/${personnelId}`, {
//                 headers: { Authorization: `Bearer ${authToken}` }
//             });
//             setKpiReport(res.data?.data);
//         } catch (error) { console.error(error); }
//         finally { setKpiLoading(false); }
//     };

//     const getPersonnelImage = (pId: number) => {
//         const p = allPersonnels.find(x => x.id === pId);
//         return p?.imageSrc ? `${server.urldpwonload}${p.imageSrc}` : null;
//     };

//     // --- PDF EXPORT (İndirme İşlemi) ---
//     const handleDownloadPDF = () => {
//         if (!kpiReport) return;
//         const doc = new jsPDF();
//         doc.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
//         doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
//         doc.setFont('NotoSans');

//         doc.text('PERFORMANS ANALİZ RAPORU', 105, 15, { align: 'center' });
//         doc.addImage(Logo, 'PNG', 160, 10, 30, 15);

//         autoTable(doc, {
//             startY: 30,
//             body: [
//                 ['Personel:', `${kpiReport.Manager.Name} ${kpiReport.Manager.Family}`],
//                 ['TC Kimlik:', kpiReport.Manager.IdentityNumber],
//                 ['Pozisyon:', kpiReport.Manager.PositionTitle],
//                 ['Genel KPI Skoru:', kpiReport.AverageKpi],
//                 ['Proje Sayısı:', kpiReport.ProjectCount],
//             ],
//             theme: 'striped',
//             styles: { font: 'NotoSans' }
//         });

//         doc.save(`KPI_Raporu_${kpiReport.Manager.Name}.pdf`);
//     };

//     // --- EXCEL EXPORT ---
//     const handleDownloadExcel = async () => {
//         if (!kpiReport) return;
//         const workbook = new Excel.Workbook();
//         const worksheet = workbook.addWorksheet('Performans');
//         worksheet.columns = [
//             { header: 'Proje Kodu', key: 'code' },
//             { header: 'Proje Başlığı', key: 'title' },
//             { header: 'Şantiye', key: 'workhouse' },
//             { header: 'KPI Skoru', key: 'kpi' },
//         ];
//         kpiReport.Projects.forEach((p: any) => {
//             worksheet.addRow({ code: p.ProjectCode, title: p.ProjectTitle, workhouse: p.WorkhouseName, kpi: p.ProjectKpi });
//         });
//         const buffer = await workbook.xlsx.writeBuffer();
//         saveAs(new Blob([buffer]), `KPI_Raporu_${kpiReport.Manager.Name}.xlsx`);
//     };

//     const filteredData = useMemo(() => {
//         const query = searchTerm.toLowerCase().trim();
//         return assignments.filter(item => {
//             const fullName = `${item.personnel?.name} ${item.personnel?.family}`.toLowerCase();
//             return fullName.includes(query) || item.personnel?.identityNumber?.includes(query);
//         });
//     }, [assignments, searchTerm]);

//     return (
//         <Box p={3} sx={{ backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
//             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
//                 <Typography variant="h4" fontWeight={900}>Şantiye Şefi Performans Listesi</Typography>
//                 <TextField
//                     placeholder="İsim veya TC No ile ara..."
//                     size="small"
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     InputProps={{ startAdornment: <IconSearch size={18} style={{ marginRight: 8 }} /> }}
//                     sx={{ width: 350, bgcolor: 'white', borderRadius: 2 }}
//                 />
//             </Stack>

//             {loading ? (
//                 <Stack alignItems="center" py={10}><CircularProgress /></Stack>
//             ) : (
//                 <Grid container spacing={3}>
//                     {filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((item) => (
//                         <Grid item xs={12} sm={6} md={4} key={item.id}>
//                             <Card sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
//                                 <Stack direction="row" spacing={2} alignItems="center" mb={2}>
//                                     <Avatar
//                                         src={getPersonnelImage(item.personnel?.id)}
//                                         sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'primary.main' }}
//                                     >
//                                         <IconUser />
//                                     </Avatar>
//                                     <Box>
//                                         <Typography variant="h6" fontWeight={800}>
//                                             {item.personnel?.name} {item.personnel?.family}
//                                         </Typography>
//                                         <Typography variant="body2" color="textSecondary" fontWeight={600}>
//                                             {item.placeName || 'Şantiye Atanmadı'}
//                                         </Typography>
//                                     </Box>
//                                 </Stack>
//                                 <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
//                                 <Button
//                                     fullWidth
//                                     variant="outlined"
//                                     onClick={() => {
//                                         setSelectedItem(item);
//                                         setOpenModal(true);
//                                         fetchKPIReport(item.personnel.id);
//                                     }}
//                                     startIcon={<IconChartBar size={20} />}
//                                     sx={{ borderRadius: 3, py: 1, fontWeight: 700 }}
//                                 >
//                                     ANALİZİ GÖRÜNTÜLE
//                                 </Button>
//                             </Card>
//                         </Grid>
//                     ))}
//                 </Grid>
//             )}

//             <TablePagination
//                 component="div"
//                 count={filteredData.length}
//                 page={page}
//                 onPageChange={(_, p) => setPage(p)}
//                 rowsPerPage={rowsPerPage}
//                 onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
//                 labelRowsPerPage="Sayfa başı:"
//             />

//             {/* --- DETAY MODALI --- */}
//             <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 5 } }}>
//                 <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
//                     <Typography variant="h5" fontWeight={900}>Yönetici Performans Detayı</Typography>
//                     <IconButton onClick={() => setOpenModal(false)}><IconX /></IconButton>
//                 </DialogTitle>
//                 <DialogContent dividers sx={{ p: 3 }}>
//                     {kpiLoading ? (
//                         <Stack alignItems="center" py={5}><CircularProgress /></Stack>
//                     ) : kpiReport ? (
//                         <Stack spacing={3}>
//                             <KPIScoreBadge value={kpiReport.AverageKpi} loading={false} />

//                             <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
//                                 <Grid container spacing={2}>
//                                     <Grid item xs={6}>
//                                         <Typography variant="caption" color="textSecondary" fontWeight={700}>TOPLAM PROJE</Typography>
//                                         <Typography fontWeight={800} variant="h6">{kpiReport.ProjectCount}</Typography>
//                                     </Grid>
//                                     <Grid item xs={6}>
//                                         <Typography variant="caption" color="textSecondary" fontWeight={700}>TOPLAM PUAN</Typography>
//                                         <Typography fontWeight={800} variant="h6">{kpiReport.TotalKpi}</Typography>
//                                     </Grid>
//                                 </Grid>
//                             </Paper>

//                             <Typography variant="subtitle1" fontWeight={900} color="primary">Proje Bazlı Dağılım</Typography>
//                             <Stack spacing={1}>
//                                 {kpiReport.Projects?.map((proj: any) => (
//                                     <Box key={proj.ProjectId} sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'white' }}>
//                                         <Box>
//                                             <Typography variant="body2" fontWeight={800}>{proj.ProjectTitle}</Typography>
//                                             <Typography variant="caption" color="textSecondary">{proj.WorkhouseName}</Typography>
//                                         </Box>
//                                         <Typography variant="h6" fontWeight={900} color="primary">{proj.ProjectKpi}</Typography>
//                                     </Box>
//                                 ))}
//                             </Stack>
//                         </Stack>
//                     ) : (
//                         <Typography align="center" py={3}>Veri yüklenemedi.</Typography>
//                     )}
//                 </DialogContent>

//                 {/* --- MODAL İÇİ İNDİRME BUTONLARI --- */}
//                 <DialogActions sx={{ p: 3, gap: 1, flexDirection: 'column' }}>
//                     <Stack direction="row" spacing={2} fullWidth sx={{ width: '100%' }}>
//                         <Button
//                             fullWidth
//                             variant="contained"
//                             color="error"
//                             startIcon={<IconFileText />}
//                             onClick={handleDownloadPDF}
//                             disabled={!kpiReport}
//                             sx={{ borderRadius: 3, fontWeight: 700 }}
//                         >
//                             PDF İNDİR
//                         </Button>
//                         <Button
//                             fullWidth
//                             variant="contained"
//                             color="success"
//                             startIcon={<IconFileSpreadsheet />}
//                             onClick={handleDownloadExcel}
//                             disabled={!kpiReport}
//                             sx={{ borderRadius: 3, fontWeight: 700 }}
//                         >
//                             EXCEL İNDİR
//                         </Button>
//                     </Stack>
//                     <Button onClick={() => setOpenModal(false)} fullWidth sx={{ fontWeight: 700, mt: 1 }}>
//                         KAPAT
//                     </Button>
//                 </DialogActions>
//             </Dialog>
//         </Box>
//     );
// };

// export default ListKPIList;

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
    const [rowsPerPage, setRowsPerPage] = useState(6);

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
            styles: { font: 'NotoSans', fontSize: 10 },
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
        return assignments.filter(item => {
            const fullName = `${item.personnel?.name} ${item.personnel?.family}`.toLowerCase();
            return fullName.includes(query) || item.personnel?.identityNumber?.includes(query);
        });
    }, [assignments, searchTerm]);

    return (
        <Box p={3} sx={{ backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" fontWeight={900}>Şantiye Şefi KPI Listesi</Typography>
                <TextField
                    placeholder="İsim veya TC No ile ara..."
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                    <Button fullWidth variant="contained" color="error" startIcon={<IconFileText />} onClick={handleDownloadPDF} disabled={!kpiReport} sx={{ py: 1.2, borderRadius: 3, fontWeight: 800 }}>PDF RAPOR</Button>
                    <Button fullWidth variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={handleDownloadExcel} disabled={!kpiReport} sx={{ py: 1.2, borderRadius: 3, fontWeight: 800 }}>EXCEL</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ListKPIList;