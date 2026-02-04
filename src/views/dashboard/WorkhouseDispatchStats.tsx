import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
    Box,
    Grid,
    Card,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Collapse,
    Stack,
    Avatar,
    ToggleButton,
    ToggleButtonGroup,
    IconButton,
    Tooltip
} from '@mui/material';
import axios from 'axios';
import { toPng } from 'html-to-image';
import {
    IconTruckDelivery,
    IconReceipt2,
    IconChevronDown,
    IconChevronUp,
    IconChartBar,
    IconLayoutGrid,
    IconDownload,
    IconDatabaseOff
} from '@tabler/icons-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer
} from 'recharts';
import server from '../../assets/address.json';

interface DispatchStatType {
    workhouse_id: string;
    workhousen_name: string;
    total_price: string;
}

const NoDataView = () => (
    <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={5}
        sx={{
            border: '2px dashed #e5eaef',
            borderRadius: 4,
            bgcolor: 'background.paper',
            textAlign: 'center'
        }}
    >
        <Avatar sx={{ width: 80, height: 80, bgcolor: '#f5f7fa', mb: 2 }}>
            <IconDatabaseOff size={40} color="#9ca3af" />
        </Avatar>
        <Typography variant="h6" fontWeight={600} color="textPrimary" gutterBottom>
            Kayıt Bulunamadı
        </Typography>
        <Typography variant="body2" color="textSecondary">
            Şu anda görüntülenecek herhangi bir sevk verisi mevcut değil.
        </Typography>
    </Box>
);

const CustomNoDataOverlay = () => (
    <Box
        sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            p: 2,
            borderRadius: 2,
            zIndex: 10,
            border: '1px solid #eee'
        }}
    >
        <Typography variant="body1" color="textSecondary" fontWeight={500}>
            Grafik için veri yok
        </Typography>
    </Box>
);

const WorkhouseDispatchStats = () => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [data, setData] = useState<DispatchStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');

    const PRIMARY_COLOR = '#49BEFF';

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(
                    server.baseurl + server.report + 'get-dashboard-workhouse-dispatch-price',
                    {
                        headers: { "Authorization": `Bearer ${authToken}` },
                        signal: controller.signal
                    }
                );

                if (response.data.httpStatusCode === 200 && response.data.data) {
                    setData(response.data.data);
                } else {
                    setData([]);
                    if (!response.data.success) setError(response.data.message || 'Veri alınamadı');
                }
            } catch (err: any) {
                if (!axios.isCancel(err)) setError('Bir hata oluştu');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        fetchData();
        return () => controller.abort();
    }, []);

    const handleDownloadChart = useCallback(async () => {
        if (chartRef.current === null) return;
        try {
            const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = 'santiye-sevk-grafigi.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('İndirme hatası:', err);
        }
    }, [chartRef]);

    const parseCurrencyToNumber = (val: string) => {
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        return isNaN(numberVal) ? 0 : numberVal;
    };

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseCurrencyToNumber(val) : val;
        return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const chartData = useMemo(() => {
        return data.map(item => ({
            name: item.workhousen_name,
            value: parseCurrencyToNumber(item.total_price)
        })).filter(item => item.value > 0);
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <Card sx={{ p: 1.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: 'none' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>{label}</Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <IconReceipt2 size={16} color={PRIMARY_COLOR} />
                        <Typography variant="body2" color="textSecondary">
                            Tutar: <span style={{ color: PRIMARY_COLOR, fontWeight: 600 }}>{formatCurrency(payload[0].value)} TL</span>
                        </Typography>
                    </Stack>
                </Card>
            );
        }
        return null;
    };

    const renderCard = (item: DispatchStatType) => (
        <Card sx={{
            p: 3, border: '1px solid #e5eaef', boxShadow: 'none', height: '100%',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: PRIMARY_COLOR },
            transition: 'all 0.3s ease'
        }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Avatar variant="rounded" sx={{ bgcolor: '#E8F7FF', color: PRIMARY_COLOR, width: 48, height: 48 }}>
                    <IconTruckDelivery size={24} />
                </Avatar>
                <Box overflow="hidden">
                    <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap>
                        {item.workhousen_name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <IconReceipt2 size={18} color={PRIMARY_COLOR} />
                        <Typography variant="h5" fontWeight={700}>
                            {formatCurrency(item.total_price)} <Typography component="span" variant="body2" color="textSecondary">TL</Typography>
                        </Typography>
                    </Stack>
                </Box>
            </Stack>
        </Card>
    );

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    const isDataEmpty = data.length === 0;
    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    return (
        <Box mt={4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" fontWeight={700}>Şantiye Sevk Tutarları</Typography>
                <Stack direction="row" spacing={2}>
                    {viewMode === 'chart' && !isDataEmpty && (
                        <Tooltip title="Grafiği İndir">
                            <IconButton onClick={handleDownloadChart} color="primary" sx={{ border: '1px solid #e5eaef' }}>
                                <IconDownload size={20} />
                            </IconButton>
                        </Tooltip>
                    )}
                    <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
                        <ToggleButton value="chart">
                            <IconChartBar size={18} style={{ marginRight: 8 }} /> Grafik
                        </ToggleButton>
                        <ToggleButton value="cards">
                            <IconLayoutGrid size={18} style={{ marginRight: 8 }} /> Liste
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </Stack>

            <Box>
                {viewMode === 'chart' ? (
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef', position: 'relative' }}>
                        <Box height="450px" width="100%" ref={chartRef} sx={{ position: 'relative' }}>
                            {isDataEmpty && <CustomNoDataOverlay />}
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={isDataEmpty ? Array(5).fill({ name: '', value: 0 }) : chartData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11, fill: '#666' }}
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    {!isDataEmpty && (
                                        <>
                                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafd' }} />
                                            <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[6, 6, 0, 0]} barSize={35} animationDuration={1000} />
                                        </>
                                    )}
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                ) : (
                    <>
                        {isDataEmpty ? <NoDataView /> : (
                            <>
                                <Grid container spacing={3}>
                                    {firstThreeItems.map((item, idx) => (
                                        <Grid item xs={12} sm={6} md={4} key={idx}>{renderCard(item)}</Grid>
                                    ))}
                                </Grid>
                                {remainingItems.length > 0 && (
                                    <>
                                        <Collapse in={expanded} timeout="auto">
                                            <Grid container spacing={3} mt={0.1}>
                                                {remainingItems.map((item, idx) => (
                                                    <Grid item xs={12} sm={6} md={4} key={idx}>{renderCard(item)}</Grid>
                                                ))}
                                            </Grid>
                                        </Collapse>
                                        <Box display="flex" justifyContent="center" mt={4}>
                                            <Button
                                                variant="outlined"
                                                onClick={() => setExpanded(!expanded)}
                                                endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
                                                sx={{ borderRadius: '20px', px: 4 }}
                                            >
                                                {expanded ? 'Daha Az' : `Daha Fazla (${remainingItems.length})`}
                                            </Button>
                                        </Box>
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default WorkhouseDispatchStats;