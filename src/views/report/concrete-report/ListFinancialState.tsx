import { useEffect, useState, useCallback } from 'react';
import {
    Grid, Box, Typography, Stack, Avatar,
    Autocomplete, TextField, Skeleton, Button, Paper,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import axios from 'axios';
import server from 'src/assets/address.json';
import { format } from 'date-fns';

// Icons
import {
    IconFileDownload, IconFileSpreadsheet, IconDropletFilled,
    IconCurrencyLira, IconTools, IconUsers, IconGasStation,
    IconBuildingBridge, IconArrowRightBar, IconChartBar,
} from '@tabler/icons-react';

// Export Libraries
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

/* ========= Types (حل مشکل خطایnever) ========= */
interface BaseType { id: number; title?: string; name?: string; }
interface TenderType extends BaseType { title: string; }
interface WorkType extends BaseType { title: string; }
interface WorkhouseType extends BaseType { name: string; }
interface ProjectType extends BaseType { title: string; }

interface Selections {
    tender: TenderType | null;
    work: WorkType | null;
    workhouse: WorkhouseType | null;
    project: ProjectType | null;
}

/* ========= Styled Components ========= */
const DashboardCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    borderRadius: '24px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    background: theme.palette.background.paper,
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: '0 4px 24px 0 rgba(0,0,0,0.03)',
    transition: 'all 0.3s ease',
    '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 12px 40px 0 rgba(0,0,0,0.08)' }
}));

const IconWrapper = styled(Avatar)(({ theme, color }: any) => ({
    backgroundColor: alpha(theme.palette[color].main, 0.12),
    color: theme.palette[color].main,
    width: 54, height: 54, borderRadius: '16px', marginBottom: theme.spacing(2),
}));

/* ========= Main Component ========= */
const ListFinancialState = () => {

    // مقداردهی اولیه استیت با تایپ مشخص برای رفع خطای تصویر
    const [selections, setSelections] = useState<Selections>({
        tender: null, work: null, workhouse: null, project: null
    });

    const [dataLists, setDataLists] = useState({
        tenders: [] as TenderType[],
        works: [] as WorkType[],
        workhouses: [] as WorkhouseType[],
        projects: [] as ProjectType[]
    });

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const authToken = localStorage.getItem('authToken');
    const headers = { Authorization: `Bearer ${authToken}` };

    // تابع کمکی فرمت تاریخ
    const formatDateDisplay = (dateString: string): string => {
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch { return '-'; }
    };

    /* ========= PDF Header & Footer (دقیقاً طبق نمونه شما) ========= */
    const addPdfHeader = (doc: jsPDF, title: string) => {
        const docAny = doc as any;
        docAny.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegular);
        docAny.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        doc.setFont('NotoSans');

        const pageWidth = doc.internal.pageSize.getWidth();
        const logoWidth = 35;
        const logoHeight = 18;
        const margin = 15;
        const logoX = pageWidth - logoWidth - margin;

        try {
            doc.addImage(Logo, 'PNG', logoX, 10, logoWidth, logoHeight);
        } catch (e) { console.error("Logo yüklenemedi", e); }

        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(14);
        doc.text(title, pageWidth / 2, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('NotoSans', 'bold');
        doc.text(`Rapor Tarihi:`, 15, 35);
        doc.setFont('NotoSans', 'normal');
        doc.text(`${formatDateDisplay(new Date().toISOString())}`, 80, 35);

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

    /* ========= API Calls ========= */
    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                tenderId: selections.tender?.id,
                workId: selections.work?.id,
                workhouseId: selections.workhouse?.id,
                projectId: selections.project?.id,
            };
            const res = await axios.get(`${server.baseurl}${server.report}get-dashboard-financial-stats`, { headers, params });
            setStats(res.data.data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    }, [selections]);

    useEffect(() => {
        const init = async () => {
            const res = await axios.get(`${server.baseurl}${server.initialoperations}get-tenders`, { headers });
            setDataLists(prev => ({ ...prev, tenders: res.data.data || [] }));
        };
        init();
        fetchStats();
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // Cascading Handlers
    const handleTenderChange = async (val: any) => {
        setSelections({ tender: val, work: null, workhouse: null, project: null });
        if (val) {
            const res = await axios.get(`${server.baseurl}${server.initialoperations}get-works`, { headers, params: { tenderId: val.id } });
            setDataLists(prev => ({ ...prev, works: res.data.data || [] }));
        }
    };

    const handleWorkChange = async (val: any) => {
        setSelections(prev => ({ ...prev, work: val, workhouse: null, project: null }));
        if (val) {
            const res = await axios.get(`${server.baseurl}${server.initialoperations}get-workhouse`, { headers, params: { workId: val.id } });
            setDataLists(prev => ({ ...prev, workhouses: res.data.data || [] }));
        }
    };

    const handleWorkhouseChange = async (val: any) => {
        setSelections(prev => ({ ...prev, workhouse: val, project: null }));
        if (val) {
            const res = await axios.get(`${server.baseurl}${server.warehouse}get-project`, { headers, params: { workhouseId: val.id } });
            setDataLists(prev => ({ ...prev, projects: res.data.data || [] }));
        }
    };

    /* ========= Export Actions ========= */
    const exportPDF = () => {
        const doc = new jsPDF('p', 'pt', 'a4');
        addPdfHeader(doc, "Genel Raporu");

        const tableBody = [
            ["Beton Miktarı", `${Number(stats?.totalBetonQuantity || 0).toLocaleString('tr-TR')} m3`],
            ["Beton Bedeli", `${Number(stats?.totalBetonPrice || 0).toLocaleString('tr-TR')} TL`],
            ["Malzeme Bedeli", `${Number(stats?.totalUsedItemsPrice || 0).toLocaleString('tr-TR')} TL`],
            ["Yakıt Bedeli", `${Number(stats?.totalFuelPrice || 0).toLocaleString('tr-TR')} TL`],
            ["Ödenen Maaşlar", `${Number(stats?.totalPaidSalary || 0).toLocaleString('tr-TR')} TL`],
            ["Montaj Toplam", `${Number(stats?.totalMontaj || 0).toLocaleString('tr-TR')} TL`],
            ["Demontaj Toplam", `${Number(stats?.totalDemontaj || 0).toLocaleString('tr-TR')} TL`]
        ];

        autoTable(doc, {
            startY: 50,
            head: [["Açıklama", "Tutar / Miktar"]],
            body: tableBody,
            styles: { font: 'NotoSans', fontSize: 10 },
            headStyles: { fillColor: [33, 150, 243] },
            didDrawPage: () => addPdfFooter(doc)
        });

        doc.save(`Finansal_Durum_${format(new Date(), 'yyyyMMdd')}.pdf`);
    };

    const exportExcel = async () => {
        const workbook = new Excel.Workbook();
        const sheet = workbook.addWorksheet('Finansal Rapor');
        sheet.addRow(['Açıklama', 'Değer']);
        sheet.addRows([
            ['Beton Miktarı', stats?.totalBetonQuantity],
            ['Beton Bedeli', stats?.totalBetonPrice],
            ['Malzeme Bedeli', stats?.totalUsedItemsPrice],
            ['Yakıt Bedeli', stats?.totalFuelPrice],
            ['Maaşlar', stats?.totalPaidSalary]
        ]);
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Finansal_Rapor.xlsx');
    };

    const StatItem = ({ title, value, icon, color, isCurrency = true }: any) => (
        <Grid item xs={12} sm={6} md={4}>
            <DashboardCard>
                <IconWrapper color={color}>{icon}</IconWrapper>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>{title}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {loading ? <Skeleton width="70%" /> :
                        isCurrency ? `${Number(value || 0).toLocaleString('us-US')} ₺` : Number(value || 0).toLocaleString('tr-TR')}
                </Typography>
            </DashboardCard>
        </Grid>
    );

    return (
        <Box sx={{ p: { xs: 2, md: 4 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" mb={4} spacing={2}>
                <Box>
                    <Typography variant="h3" fontWeight="900">Genel Raporu</Typography>
                    <Typography variant="body1" color="text.secondary">Proje bazlı maliyet </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button variant="contained" startIcon={<IconFileDownload />} onClick={exportPDF}>PDF</Button>
                    <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={exportExcel}>Excel</Button>
                </Stack>
            </Stack>

            <Paper sx={{ p: 3, mb: 4, borderRadius: '24px' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete options={dataLists.tenders} getOptionLabel={(o: any) => o.title} value={selections.tender}
                            onChange={(_, v) => handleTenderChange(v)} renderInput={(p) => <TextField {...p} label="İhale" size="small" />} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete options={dataLists.works} getOptionLabel={(o: any) => o.title} value={selections.work}
                            disabled={!selections.tender} onChange={(_, v) => handleWorkChange(v)} renderInput={(p) => <TextField {...p} label="İş" size="small" />} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete options={dataLists.workhouses} getOptionLabel={(o: any) => o.name} value={selections.workhouse}
                            disabled={!selections.work} onChange={(_, v) => handleWorkhouseChange(v)} renderInput={(p) => <TextField {...p} label="Şantiye" size="small" />} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete options={dataLists.projects} getOptionLabel={(o: any) => o.title} value={selections.project}
                            disabled={!selections.workhouse} onChange={(_, v) => setSelections(p => ({ ...p, project: v }))} renderInput={(p) => <TextField {...p} label="Proje" size="small" />} />
                    </Grid>
                </Grid>
            </Paper>

            <Grid container spacing={3}>
                <StatItem title="Beton Miktarı" value={stats?.totalBetonQuantity} icon={<IconDropletFilled />} color="primary" isCurrency={false} />
                <StatItem title="Beton Bedeli" value={stats?.totalBetonPrice} icon={<IconCurrencyLira />} color="success" />
                <StatItem title="Malzeme Bedeli" value={stats?.totalUsedItemsPrice} icon={<IconTools />} color="warning" />
                <StatItem title="Yakıt Bedeli" value={stats?.totalFuelPrice} icon={<IconGasStation />} color="error" />
                <StatItem title="Ödenen Maaş" value={stats?.totalPaidSalary} icon={<IconUsers />} color="info" />
                <StatItem title="Montaj" value={stats?.totalMontaj} icon={<IconChartBar />} color="secondary" />
                <StatItem title="Demontaj" value={stats?.totalDemontaj} icon={<IconArrowRightBar />} color="warning" />
                <StatItem title="D+M Toplam" value={stats?.totalDemontajMontaj} icon={<IconBuildingBridge />} color="success" />
            </Grid>
        </Box>
    );
};

export default ListFinancialState;