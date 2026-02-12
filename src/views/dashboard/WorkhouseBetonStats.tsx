import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
    Box, Grid, Card, Typography, CircularProgress, Alert,
    Button, Collapse, Stack, Avatar, ToggleButton,
    ToggleButtonGroup, useTheme, IconButton,
    Paper
} from '@mui/material';
import axios from 'axios';
import { toPng } from 'html-to-image';
import {
    IconBuilding, IconCube, IconChevronDown, IconChevronUp,
    IconChartBar, IconLayoutGrid, IconDownload, IconDatabaseOff,
    IconCoin
} from '@tabler/icons-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import server from '../../assets/address.json';

interface BetonStatType {
    workhouse_id: string;
    workhousen_name: string;
    total_quantity: string;
    total_price: string;
}

interface StatCardProps {
    item: BetonStatType;
}

const StatCard: React.FC<StatCardProps> = ({ item }) => (
    <Card sx={{
        p: 2,
        border: '1px solid #e5eaef',
        boxShadow: 'none',
        height: '100%',
        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: 'primary.main' },
        transition: 'all 0.3s ease'
    }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 40, height: 40 }}>
                <IconBuilding size={20} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" color="textSecondary" fontWeight={600} gutterBottom>
                    {item.workhousen_name}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconCube size={16} color="#5D87FF" />
                    <Typography variant="h6" fontWeight={700}>
                        {Number(item.total_quantity).toLocaleString('tr-TR')} m³
                    </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                    <IconCoin size={16} color="#13DEB9" />
                    <Typography variant="body2" fontWeight={600} color="success.main">
                        {Number(item.total_price).toLocaleString('tr-TR')} TL
                    </Typography>
                </Stack>
            </Box>
        </Stack>
    </Card>
);

const NoDataView = () => (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={5} sx={{ border: '2px dashed #e5eaef', borderRadius: 4, textAlign: 'center' }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: '#f5f7fa', mb: 2 }}>
            <IconDatabaseOff size={40} color="#9ca3af" />
        </Avatar>
        <Typography variant="h6" fontWeight={600}>Kayıt Bulunamadı</Typography>
    </Box>
);

const WorkhouseBetonStats = () => {
    const theme = useTheme();
    const chartRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<BetonStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const url = `${server.baseurl}${server.report}get-dashboard-workhouse-beton-quantity`;
                const response = await axios.get(url, { headers: { "Authorization": `Bearer ${authToken}` } });
                if (response.data.httpStatusCode === 200 && response.data.data) {
                    const sorted = response.data.data.sort((a: any, b: any) => parseFloat(b.total_quantity) - parseFloat(a.total_quantity));
                    setData(sorted);
                } else {
                    setData([]);
                }
            } catch (err) {
                setError('Veri alınırken bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleDownloadChart = useCallback(async () => {
        if (!chartRef.current) return;
        try {
            const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = 'beton-istatistik-grafik.png';
            link.href = dataUrl;
            link.click();
        } catch (err) { console.error(err); }
    }, []);

    const chartData = useMemo(() => {
        return data.map(item => ({
            name: item.workhousen_name,
            quantity: parseFloat(item.total_quantity) || 0,
            price: parseFloat(item.total_price) || 0
        }));
    }, [data]);

    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    const isDataEmpty = data.length === 0;

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={700}>Şantiye Beton Analizi</Typography>
                <Stack direction="row" spacing={1}>
                    {viewMode === 'chart' && !isDataEmpty && (
                        <IconButton onClick={handleDownloadChart} color="primary" sx={{ border: '1px solid #e5eaef' }}>
                            <IconDownload size={20} />
                        </IconButton>
                    )}
                    <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
                        <ToggleButton value="chart">

                            <Stack direction="row" spacing={1} alignItems="center">

                                <IconChartBar size={18} />
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
                <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef' }}>
                    <Box height="400px" width="100%" ref={chartRef}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 11 }} />
                                <YAxis />

                                <RechartsTooltip
                                    formatter={(value: any, name: any, _props: any) => {
                                        if (name === "quantity") {
                                            return [
                                                `${value.toLocaleString('us-US')} m³`,
                                                `Miktar`
                                            ];
                                        }
                                        return [value, name];
                                    }}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <Paper sx={{ p: 1.5, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                                                    <Typography variant="subtitle2" mb={1}>{label}</Typography>
                                                    <Typography variant="body2" color="primary.main" fontWeight={700}>
                                                        Miktar: {payload[0].value.toLocaleString('us-US')} m³
                                                    </Typography>
                                                    <Typography variant="body2" color="success.main" fontWeight={700}>
                                                        Tutar: {payload[0].payload.price.toLocaleString('us-US')} TL
                                                    </Typography>
                                                </Paper>
                                            );
                                        }
                                        return null;
                                    }}
                                />

                                <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                                    {chartData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? theme.palette.primary.main : theme.palette.primary.dark} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Card>
            ) : (
                <Box>
                    {isDataEmpty ? <NoDataView /> : (
                        <>
                            <Grid container spacing={2}>
                                {firstThreeItems.map((item) => (
                                    <Grid item xs={12} sm={6} md={4} key={item.workhouse_id}>
                                        <StatCard item={item} />
                                    </Grid>
                                ))}
                            </Grid>
                            <Collapse in={expanded} timeout="auto" unmountOnExit>
                                <Grid container spacing={2} mt={0.5}>
                                    {remainingItems.map((item) => (
                                        <Grid item xs={12} sm={6} md={4} key={item.workhouse_id}>
                                            <StatCard item={item} />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Collapse>
                            {remainingItems.length > 0 && (
                                <Box display="flex" justifyContent="center" mt={3}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setExpanded(!expanded)}
                                        endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
                                    >
                                        {expanded ? 'Daha Az' : `Daha Fazla (${remainingItems.length})`}
                                    </Button>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default WorkhouseBetonStats;