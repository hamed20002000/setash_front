import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import {
    Box, Grid, Card, Typography, CircularProgress,
    Stack, Avatar, ToggleButton, ToggleButtonGroup, IconButton,
} from '@mui/material';
import axios from 'axios';
import { toPng } from 'html-to-image';
import {
    IconTruckDelivery,
    IconChartBar, IconLayoutGrid, IconDownload,
} from '@tabler/icons-react';
import {
    ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import server from '../../assets/address.json';

interface DispatchStatType {
    workhouse_id: string;
    workhousen_name: string;
    total_price: string;
}

const StatCard = memo(({ item, formatCurrency, color }: any) => (
    <Card sx={{
        p: 3, border: '1px solid #eef2f6', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        '&:hover': { boxShadow: '0 10px 20px rgba(0,0,0,0.05)', borderColor: color, transform: 'translateY(-4px)' },
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: 4
    }}>
        <Stack direction="row" spacing={2} alignItems="center">
            <Avatar variant="rounded" sx={{ bgcolor: `${color}15`, color: color, width: 54, height: 54 }}>
                <IconTruckDelivery size={28} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="textSecondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {item.workhousen_name}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                    {formatCurrency(item.total_price)} <Typography component="span" variant="body2" color="textSecondary">TL</Typography>
                </Typography>
            </Box>
        </Stack>
    </Card>
));

const WorkhouseDispatchStats = () => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<DispatchStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');

    const COLORS = {
        primary: '#007FFF',
        secondary: '#00D1FF',
        line: '#FF4560',
        area: '#007FFF10'
    };

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(server.baseurl + server.report + 'get-dashboard-workhouse-dispatch-price', {
                    headers: { "Authorization": `Bearer ${authToken}` },
                    signal: controller.signal
                });
                if (response.data.httpStatusCode === 200) setData(response.data.data || []);
                else '';
            } catch (err: any) {
                if (!axios.isCancel(err)) '';
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        return () => controller.abort();
    }, []);

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val.replace(/[^\d.-]/g, '')) : val;
        return new Intl.NumberFormat('us-US', { minimumFractionDigits: 0 }).format(num || 0);
    };

    const chartData = useMemo(() => {
        const mapped = data.map(item => ({
            name: item.workhousen_name,
            Tutar: parseFloat(item.total_price.replace(/[^\d.-]/g, '')) || 0,
        })).filter(i => i.Tutar > 0);

        const avg = mapped.reduce((acc, curr) => acc + curr.Tutar, 0) / mapped.length;
        return mapped.map(i => ({ ...i, Ortalama: parseFloat(avg.toFixed(2)) }));
    }, [data]);

    const handleDownload = useCallback(async () => {
        if (!chartRef.current) return;
        const dataUrl = await toPng(chartRef.current, { backgroundColor: '#fff', style: { padding: '20px' } });
        const link = document.createElement('a');
        link.download = 'stats-report.png';
        link.href = dataUrl;
        link.click();
    }, []);

    if (loading) return <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>;

    return (
        <Box >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#1e293b">Şantiye Sevk Tutarları</Typography>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <IconButton onClick={handleDownload} color="primary" sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                        <IconDownload size={20} /></IconButton>
                    <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ bgcolor: '#fff' }}>
                        <ToggleButton value="chart">

                            <Stack direction="row" spacing={1} alignItems="center">

                                <IconChartBar size={20} />
                                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Grafik</Typography>

                            </Stack>
                        </ToggleButton>
                        <ToggleButton value="cards">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconLayoutGrid size={18} />
                                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Liste</Typography>
                            </Stack></ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </Stack>

            {viewMode === 'chart' ? (
                <Card sx={{ p: 4, boxShadow: 'none', border: '1px solid #e5eaef' }}>
                    <Box height={500} ref={chartRef}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b' }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any, name: string) => [`${formatCurrency(value)} TL`, name]}
                                />
                                <Legend verticalAlign="top" height={36} />
                                <Area
                                    type="monotone"
                                    dataKey="Tutar"
                                    fill="url(#barGradient)"
                                    stroke="none"
                                    legendType="none"
                                    tooltipType="none"
                                />

                                <Bar name="Tutar" dataKey="Tutar" barSize={40} fill="url(#barGradient)" radius={[8, 8, 0, 0]} />

                                <Line name="Ortalama" type="monotone" dataKey="Ortalama" stroke={COLORS.line} strokeWidth={3} dot={{ r: 4 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Box>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {data.map((item, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || idx}>
                            <StatCard item={item} formatCurrency={formatCurrency} color={COLORS.primary} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default WorkhouseDispatchStats;