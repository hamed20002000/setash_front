
import { useEffect, useState, useMemo } from 'react';
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
    ToggleButtonGroup
} from '@mui/material';
import axios from 'axios';
import {
    IconTruckDelivery,
    IconReceipt2,
    IconChevronDown,
    IconChevronUp,
    IconChartLine, // آیکون نمودار خطی
    IconLayoutGrid
} from '@tabler/icons-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی
interface DispatchStatType {
    workhouse_id: string;
    workhousen_name: string;
    total_price: string;
}

const WorkhouseDispatchStats = () => {
    const [data, setData] = useState<DispatchStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // حالت نمایش: 'chart' یا 'cards'
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');

    // رنگ اصلی تم (آبی آسمانی)
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
                    setError(response.data.message || 'Veri alınamadı');
                }
            } catch (err: any) {
                if (!axios.isCancel(err)) {
                    console.error(err);
                    setError('Bir hata oluştu');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, []);

    // --- توابع کمکی ---
    const parseCurrencyToNumber = (val: string) => {
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        return isNaN(numberVal) ? 0 : numberVal;
    };

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseCurrencyToNumber(val) : val;
        return num.toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // آماده‌سازی داده‌ها برای نمودار
    const chartData = useMemo(() => {
        return data.map(item => ({
            name: item.workhousen_name,
            value: parseCurrencyToNumber(item.total_price),
            originalPrice: item.total_price
        })).filter(item => item.value > 0);
    }, [data]);

    const handleViewChange = (
        _event: React.MouseEvent<HTMLElement>,
        newView: 'chart' | 'cards' | null,
    ) => {
        if (newView !== null) setViewMode(newView);
    };

    // تولتیپ سفارشی برای نمودار
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <Card sx={{ p: 1.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: 'none' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>{label}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconReceipt2 size={16} color={PRIMARY_COLOR} />
                        <Typography variant="body2" color="textSecondary">
                            Tutar: <span style={{ color: PRIMARY_COLOR, fontWeight: 600 }}>{formatCurrency(payload[0].value)} TL</span>
                        </Typography>
                    </Box>
                </Card>
            );
        }
        return null;
    };

    // رندر کارت تکی
    const renderCard = (item: DispatchStatType) => (
        <Card sx={{
            p: 3,
            border: '1px solid #e5eaef',
            boxShadow: 'none',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: '#5D87FF' },
            transition: 'all 0.3s ease'
        }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Avatar variant="rounded" sx={{ bgcolor: '#E8F7FF', color: PRIMARY_COLOR, width: 48, height: 48 }}>
                    <IconTruckDelivery size={24} />
                </Avatar>

                <Box overflow="hidden">
                    <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap title={item.workhousen_name}>
                        {item.workhousen_name}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <IconReceipt2 size={18} color={PRIMARY_COLOR} />
                        <Typography variant="h5" fontWeight={700} color="textPrimary">
                            {formatCurrency(item.total_price)} <Typography component="span" variant="body2" color="textSecondary">TL</Typography>
                        </Typography>
                    </Stack>
                </Box>
            </Stack>
        </Card>
    );

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (data.length === 0) return <Alert severity="info">Sevk verisi bulunamadı</Alert>;

    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    return (
        <Box mt={4}>
            {/* Header + Toggle Buttons */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" fontWeight={700}>
                    Şantiye Sevk Tutarları
                </Typography>

                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={handleViewChange}
                    aria-label="view mode"
                    size="small"
                    sx={{ bgcolor: 'background.paper' }}
                >
                    <ToggleButton value="chart" aria-label="chart view">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconChartLine size={18} />
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Grafik</Typography>
                        </Stack>
                    </ToggleButton>
                    <ToggleButton value="cards" aria-label="cards view">
                        <Stack direction="row" spacing={1} alignItems="center">
                            <IconLayoutGrid size={18} />
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Liste</Typography>
                        </Stack>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <Box>
                {viewMode === 'chart' ? (
                    // --- بخش نمودار خطی ---
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef' }}>
                        <Box height="400px" width="100%">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 12, fill: '#666' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#666' }}
                                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e0e0e0', strokeWidth: 2 }} />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke={PRIMARY_COLOR}
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: PRIMARY_COLOR, strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                            animationDuration={1500}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                                    <Typography color="textSecondary">Grafik için uygun veri bulunamadı.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Card>
                ) : (
                    // --- بخش لیست کارت‌ها ---
                    <>
                        <Grid container spacing={3}>
                            {firstThreeItems.map((item, index) => (
                                <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || index}>
                                    {renderCard(item)}
                                </Grid>
                            ))}
                        </Grid>

                        {remainingItems.length > 0 && (
                            <>
                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                    <Box mt={3}>
                                        <Grid container spacing={3}>
                                            {remainingItems.map((item, index) => (
                                                <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || `more-${index}`}>
                                                    {renderCard(item)}
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                </Collapse>

                                <Box display="flex" justifyContent="center" mt={3}>
                                    <Button
                                        variant="outlined"
                                        sx={{
                                            color: PRIMARY_COLOR,
                                            borderColor: PRIMARY_COLOR,
                                            borderRadius: '20px',
                                            px: 4,
                                            '&:hover': { borderColor: PRIMARY_COLOR, bgcolor: '#E8F7FF' }
                                        }}
                                        onClick={() => setExpanded(!expanded)}
                                        endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
                                    >
                                        {expanded ? 'Daha Az Göster' : `Daha Fazla Göster (${remainingItems.length} kayıt)`}
                                    </Button>
                                </Box>
                            </>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default WorkhouseDispatchStats;