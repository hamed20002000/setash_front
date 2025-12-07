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
    Chip,
    Divider,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import axios from 'axios';
import {
    IconGasStation,
    IconDroplet,
    IconCoin,
    IconChevronDown,
    IconChevronUp,
    IconChartArea, // آیکون نمودار ناحیه‌ای
    IconLayoutGrid
} from '@tabler/icons-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی
interface FuelStatType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    fuel_type: string;
    total_fuel_amount: string;
    total_price: string;
}

const WorkhouseFuelStats = () => {
    const [data, setData] = useState<FuelStatType[]>([]);
    const [loading, setLoading] = useState(true);

    // حالت نمایش: 'chart' یا 'cards'
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');

    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // رنگ اصلی تم (نارنجی)
    const PRIMARY_COLOR = '#FA896B';

    useEffect(() => {
        const controller = new AbortController();
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(
                    server.baseurl + server.report + 'get-dashboard-workhouse-fuel-stats',
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

    // --- توابع کمکی اصلاح شده ---
    const parseCurrencyToNumber = (val: any) => {
        if (!val) return 0;
        // تبدیل به استرینگ برای جلوگیری از خطای replace روی اعداد
        const strVal = String(val);
        const cleanVal = strVal.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        return isNaN(numberVal) ? 0 : numberVal;
    };

    const formatCurrency = (val: string | number | null | undefined) => {
        const num = parseCurrencyToNumber(val);
        return num.toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatAmount = (val: string | number | null | undefined) => {
        if (val === null || val === undefined || val === '') return '0';
        const numberVal = parseFloat(String(val));
        if (isNaN(numberVal)) return String(val);
        return numberVal.toLocaleString('tr-TR');
    };

    // آماده‌سازی داده‌ها برای نمودار (Memoized)
    const chartData = useMemo(() => {
        return data.map(item => ({
            name: item.workhouse_name,
            price: parseCurrencyToNumber(item.total_price),
            amount: parseCurrencyToNumber(item.total_fuel_amount),
            originalPrice: item.total_price // نگه داشتن مقدار اصلی برای تولتیپ
        })).filter(item => item.price > 0);
    }, [data]);

    const handleViewChange = (
        _event: React.MouseEvent<HTMLElement>,
        newView: 'chart' | 'cards' | null,
    ) => {
        if (newView !== null) setViewMode(newView);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <Card sx={{ p: 1.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: 'none' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>{label}</Typography>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <IconCoin size={16} color={PRIMARY_COLOR} />
                        <Typography variant="body2" color="textSecondary">
                            Tutar: <span style={{ color: PRIMARY_COLOR, fontWeight: 600 }}>{formatCurrency(payload[0].value as number)} TL</span>
                        </Typography>
                    </Box>
                    {/* اگر خواستید مقدار لیتر را هم در تولتیپ نشان دهید، خط زیر را آنکامنت کنید */}
                    {/* <Box display="flex" alignItems="center" gap={1}>
                        <IconDroplet size={16} color="#444" />
                        <Typography variant="body2" color="textSecondary">
                            Miktar: {formatAmount(payload[0].payload.amount.toString())} Lt
                        </Typography>
                    </Box> */}
                </Card>
            );
        }
        return null;
    };

    // رندر کارت تکی
    const renderCard = (item: FuelStatType) => (
        <Card sx={{
            p: 0,
            border: '1px solid #e5eaef',
            boxShadow: 'none',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: PRIMARY_COLOR },
            transition: 'all 0.3s ease'
        }}>
            <Box p={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: PRIMARY_COLOR, color: 'white', width: 48, height: 48 }}>
                        <IconGasStation size={24} />
                    </Avatar>

                    <Box flexGrow={1} overflow="hidden">
                        <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap title={item.workhouse_name}>
                            {item.workhouse_name}
                        </Typography>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
                            <Chip
                                label={item.fuel_type}
                                size="small"
                                sx={{
                                    fontSize: '0.7rem',
                                    height: 20,
                                    bgcolor: `${PRIMARY_COLOR}20`,
                                    color: PRIMARY_COLOR,
                                    fontWeight: 700
                                }}
                            />
                            <Typography variant="caption" color="textSecondary">Kod: {item.workhouse_code}</Typography>
                        </Stack>
                    </Box>
                </Stack>
            </Box>

            <Divider />

            <Box p={2} bgcolor={`${PRIMARY_COLOR}08`}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconDroplet size={18} color={PRIMARY_COLOR} />
                        <Box>
                            <Typography variant="caption" color="textSecondary" display="block">Miktar</Typography>
                            <Typography variant="subtitle1" fontWeight={700}>
                                {formatAmount(item.total_fuel_amount)} <Typography component="span" variant="caption">Lt</Typography>
                            </Typography>
                        </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} textAlign="right">
                        <Box>
                            <Typography variant="caption" color="textSecondary" display="block">Tutar</Typography>
                            <Typography variant="subtitle1" fontWeight={700} color={PRIMARY_COLOR}>
                                {formatCurrency(item.total_price)} <Typography component="span" variant="caption">TL</Typography>
                            </Typography>
                        </Box>
                        <IconCoin size={18} color={PRIMARY_COLOR} />
                    </Box>
                </Stack>
            </Box>
        </Card>
    );

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (data.length === 0) return <Alert severity="info">Yakıt verisi bulunamadı</Alert>;

    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    return (
        <Box mt={4}>
            {/* Header + Toggle Buttons */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" fontWeight={700}>
                    Şantiye Yakıt Tüketimleri
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
                            <IconChartArea size={18} />
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
                    // --- بخش نمودار AreaChart ---
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef' }}>
                        <Box height="400px" width="100%">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={chartData}
                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 12, fill: '#666' }}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#666' }}
                                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} // نمایش اعداد بزرگ به صورت k
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke={PRIMARY_COLOR}
                                            fillOpacity={1}
                                            fill="url(#colorPrice)"
                                            strokeWidth={3}
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
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
                                            '&:hover': { borderColor: PRIMARY_COLOR, bgcolor: `${PRIMARY_COLOR}10` }
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

export default WorkhouseFuelStats;