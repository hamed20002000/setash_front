import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Grid, Box, Typography, Stack, Avatar,
    Autocomplete, TextField, Skeleton, Button, Paper,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import axios from 'axios';
import server from 'src/assets/address.json';
import { format } from 'date-fns';

import {
    IconFileDownload, IconFileSpreadsheet, IconDropletFilled,
    IconCurrencyLira, IconTools, IconUsers, IconGasStation,
    IconBuildingBridge, IconArrowRightBar, IconChartBar,
} from '@tabler/icons-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NotoSansRegular } from 'src/assets/fonts/NotoSans-Regular';
import Logo from 'src/assets/images/logos/logo.png';
import Excel from 'exceljs';
import { saveAs } from 'file-saver';

interface TenderType {
    id: string;
    title: string;
}

interface WorkType {
    id: string;
    title: string;
    tender: { id: string };
}

interface WorkhouseType {
    id: string;
    name: string;
    work: { id: string };
}

interface ProjectType {
    id: string;
    title: string;
    workhouse: { id: string };
}

interface Selections {
    tender: TenderType | null;
    work: WorkType | null;
    workhouse: WorkhouseType | null;
    project: ProjectType | null;
}

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
    backgroundColor: alpha(theme.palette[color || 'primary'].main, 0.12),
    color: theme.palette[color || 'primary'].main,
    width: 54, height: 54, borderRadius: '16px', marginBottom: theme.spacing(2),
}));

const ListFinancialState = () => {
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

    const formatDateDisplay = (dateString: string): string => {
        try {
            return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
        } catch { return '-'; }
    };

    const filteredWorks = useMemo(() => {
        if (!selections.tender) return [];
        return dataLists.works.filter(item => String(item.tender?.id) === String(selections.tender?.id));
    }, [selections.tender, dataLists.works]);

    const filteredWorkhouses = useMemo(() => {
        if (!selections.work) return [];
        return dataLists.workhouses.filter(item => String(item.work?.id) === String(selections.work?.id));
    }, [selections.work, dataLists.workhouses]);

    const filteredProjects = useMemo(() => {
        if (!selections.workhouse) return [];
        return dataLists.projects.filter(item => String(item.workhouse?.id) === String(selections.workhouse?.id));
    }, [selections.workhouse, dataLists.projects]);

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
            try {
                const [tenders, works, workhouses, projects] = await Promise.all([
                    axios.get(`${server.baseurl}${server.initialoperations}get-tenders`, { headers }),
                    axios.get(`${server.baseurl}${server.initialoperations}get-works`, { headers }),
                    axios.get(`${server.baseurl}${server.initialoperations}get-workhouse`, { headers }),
                    axios.get(`${server.baseurl}${server.warehouse}get-project`, { headers })
                ]);
                setDataLists({
                    tenders: tenders.data.data || [],
                    works: works.data.data || [],
                    workhouses: workhouses.data.data || [],
                    projects: projects.data.data || []
                });
            } catch (e) { console.error(e); } finally { }
        };
        init();
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const exportPDF = () => {
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
            doc.text("Genel Finansal Rapor", pageWidth / 2, 25, { align: 'center' });
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

        const tableBody = [
            ["Beton Miktarı", `${(stats?.totalBetonQuantity || 0).toLocaleString('tr-TR')} m3`],
            ["Beton Bedeli", `${(stats?.totalBetonPrice || 0).toLocaleString('tr-TR')} TL`],
            ["Malzeme Bedeli", `${(stats?.totalUsedItemsPrice || 0).toLocaleString('tr-TR')} TL`],
            ["Yakıt Bedeli", `${(stats?.totalFuelPrice || 0).toLocaleString('tr-TR')} TL`],
            ["Maaşlar", `${(stats?.totalPaidSalary || 0).toLocaleString('tr-TR')} TL`],
            ["Montaj/Demontaj", `${(stats?.totalDemontajMontaj || 0).toLocaleString('tr-TR')} TL`]
        ];

        addHeader(doc);
        autoTable(doc, {
            startY: 50,
            head: [["Açıklama", "Değer"]],
            body: tableBody,
            styles: { font: 'NotoSans', fontSize: 10 },
            headStyles: { fillColor: [33, 150, 243] },
            didDrawPage: () => addFooter(doc)
        });

        doc.save(`Finansal_Rapor_${format(new Date(), 'yyyyMMdd')}.pdf`);
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
                    <Typography variant="h3" fontWeight="900">Genel Finansal Durum</Typography>
                    <Typography variant="body1" color="text.secondary">Filtrelere göre anlık maliyet analizi</Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button variant="contained" startIcon={<IconFileDownload />} onClick={exportPDF}>PDF</Button>
                    <Button variant="contained" color="success" startIcon={<IconFileSpreadsheet />} onClick={exportExcel}>Excel</Button>
                </Stack>
            </Stack>

            <Paper sx={{ p: 3, mb: 4, borderRadius: '24px' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            options={dataLists.tenders}
                            getOptionLabel={(o) => o.title || ""}
                            value={selections.tender}
                            onChange={(_, v) => setSelections({ tender: v, work: null, workhouse: null, project: null })}
                            renderInput={(p) => <TextField {...p} label="İhale" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            options={filteredWorks}
                            getOptionLabel={(o) => o.title || ""}
                            value={selections.work}
                            disabled={!selections.tender}
                            onChange={(_, v) => setSelections(p => ({ ...p, work: v, workhouse: null, project: null }))}
                            renderInput={(p) => <TextField {...p} label="İş" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            options={filteredWorkhouses}
                            getOptionLabel={(o) => o.name || ""}
                            value={selections.workhouse}
                            disabled={!selections.work}
                            onChange={(_, v) => setSelections(p => ({ ...p, workhouse: v, project: null }))}
                            renderInput={(p) => <TextField {...p} label="Şantiye" size="small" />}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            options={filteredProjects}
                            getOptionLabel={(o) => o.title || ""}
                            value={selections.project}
                            disabled={!selections.workhouse}
                            onChange={(_, v) => setSelections(p => ({ ...p, project: v }))}
                            renderInput={(p) => <TextField {...p} label="Proje" size="small" />}
                        />
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