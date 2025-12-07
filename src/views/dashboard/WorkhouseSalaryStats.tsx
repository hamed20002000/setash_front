
import { useEffect, useState } from 'react';
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
    ToggleButton,
    ToggleButtonGroup,
    // useTheme
} from '@mui/material';
import axios from 'axios';
import {
    IconBuildingStore,
    IconWallet,
    IconChevronDown,
    IconChevronUp,
    IconChartPie,   // آیکون برای حالت نمودار دایره‌ای
    IconLayoutGrid
} from '@tabler/icons-react';
// اضافه کردن کامپوننت‌های نمودار
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی
interface SalaryStatType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    total_salary: string;
}

// رنگ‌های نمودار دایره‌ای
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

const WorkhouseSalaryStats = () => {
    // const theme = useTheme();
    const [data, setData] = useState<SalaryStatType[]>([]);
    const [loading, setLoading] = useState(true);

    // State حالت نمایش (پیش‌فرض: گرافیکی)
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');

    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(
                    server.baseurl + server.report + 'get-dashboard-workhouse-total-salary',
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );

                if (response.data.httpStatusCode === 200 && response.data.data) {
                    setData(response.data.data);
                } else {
                    setError(response.data.message || 'Veri alınamadı');
                }
            } catch (err) {
                console.error(err);
                setError('Bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // تابع تمیز کردن و فرمت کردن عدد پول (برای نمایش متن)
    const formatCurrency = (val: string) => {
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        if (isNaN(numberVal)) return val;
        return numberVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // تابع پارس کردن عدد برای نمودار (خروجی عدد خالص)
    const parseCurrencyToNumber = (val: string) => {
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        return isNaN(numberVal) ? 0 : numberVal;
    };

    // آماده‌سازی داده‌ها برای نمودار
    const chartData = data.map(item => ({
        name: item.workhouse_name,
        value: parseCurrencyToNumber(item.total_salary)
    })).filter(item => item.value > 0); // فقط مقادیر مثبت را در نمودار نشان می‌دهیم

    // هندلر تغییر حالت نمایش
    const handleViewChange = (
        _event: React.MouseEvent<HTMLElement>,
        newView: 'chart' | 'cards' | null,
    ) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

    // رندر کردن کارت تکی
    const renderCard = (item: SalaryStatType) => (
        <Card sx={{
            p: 3,
            border: '1px solid #e5eaef',
            boxShadow: 'none',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: 'success.main' },
            transition: 'all 0.3s ease'
        }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar variant="rounded" sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
                    <IconBuildingStore size={24} />
                </Avatar>
                <Box width="100%">
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>
                            {item.workhouse_name}
                        </Typography>
                        <Chip label={`Kod: ${item.workhouse_code}`} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1} mt={1}>
                        <IconWallet size={20} color="#13DEB9" />
                        <Typography variant="h5" fontWeight={700} color="success.main">
                            {formatCurrency(item.total_salary)} <Typography component="span" variant="body2" color="textSecondary">TL</Typography>
                        </Typography>
                    </Stack>
                </Box>
            </Stack>
        </Card>
    );

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (data.length === 0) return <Alert severity="info">Maaş verisi bulunamadı</Alert>;

    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    return (
        <Box mt={4}>
            {/* هدر: تایتل و دکمه‌های سوئیچ */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={700}>
                    Şantiye Toplam Maaşlar
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
                            <IconChartPie size={18} />
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
                    // --- حالت نموداری (Pie Chart) ---
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef' }}>
                        <Box height="400px" width="100%">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // لیبل اختیاری روی نمودار
                                            outerRadius={150}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                        >
                                            {chartData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => [value.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL', 'Tutar']}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                                    <Typography color="textSecondary">Grafik için veri bulunamadı (Tüm değerler 0 olabilir)</Typography>
                                </Box>
                            )}
                        </Box>
                    </Card>
                ) : (
                    // --- حالت کارتی (قدیمی) ---
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
                                        color="success"
                                        onClick={() => setExpanded(!expanded)}
                                        endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
                                        sx={{ borderRadius: '20px', px: 4 }}
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

export default WorkhouseSalaryStats;