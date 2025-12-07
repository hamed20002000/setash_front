// import { useEffect, useState } from 'react';
// import {
//     Box,
//     Grid,
//     Card,
//     Typography,
//     CircularProgress,
//     Alert,
//     Button,
//     Collapse,
//     Stack,
//     Avatar
// } from '@mui/material';
// import axios from 'axios';
// import {
//     IconBuilding, // آیکون شانتيه
//     IconCube, // آیکون نماد بتن (مکعب)
//     IconChevronDown,
//     IconChevronUp
// } from '@tabler/icons-react';
// import server from '../../assets/address.json';

// // تعریف تایپ داده‌های دریافتی
// interface BetonStatType {
//     workhouse_id: string;
//     workhousen_name: string;
//     total_quantity: string;
// }

// const WorkhouseBetonStats = () => {
//     const [data, setData] = useState<BetonStatType[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [expanded, setExpanded] = useState(false); // وضعیت باز/بسته بودن لیست
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         const fetchData = async () => {
//             const authToken = localStorage.getItem('authToken');
//             try {
//                 const response = await axios.get(
//                     server.baseurl + server.report + 'get-dashboard-workhouse-beton-quantity',
//                     { headers: { "Authorization": `Bearer ${authToken}` } }
//                 );

//                 if (response.data.httpStatusCode === 200 && response.data.data) {
//                     setData(response.data.data);
//                 } else {
//                     setError(response.data.message || 'Veri alınamadı');
//                 }
//             } catch (err) {
//                 console.error(err);
//                 setError('Bir hata oluştu');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchData();
//     }, []);

//     // تابع کمکی برای رندر کردن کارت تکی
//     const renderCard = (item: BetonStatType) => (
//         <Card sx={{
//             p: 3,
//             border: '1px solid #e5eaef',
//             boxShadow: 'none',
//             height: '100%',
//             position: 'relative',
//             overflow: 'hidden',
//             '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: 'primary.main' },
//             transition: 'all 0.3s ease'
//         }}>
//             <Stack direction="row" spacing={2} alignItems="center">
//                 {/* آیکون سمت چپ */}
//                 <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
//                     <IconBuilding size={24} />
//                 </Avatar>

//                 <Box>
//                     <Typography variant="subtitle2" color="textSecondary" fontWeight={600}>
//                         {item.workhousen_name}
//                     </Typography>
//                     <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
//                         <IconCube size={18} color="#5D87FF" />
//                         <Typography variant="h5" fontWeight={700}>
//                             {Number(item.total_quantity).toLocaleString('tr-TR')} m³
//                         </Typography>
//                     </Stack>
//                 </Box>
//             </Stack>
//         </Card>
//     );

//     if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
//     if (error) return <Alert severity="error">{error}</Alert>;
//     if (data.length === 0) return <Alert severity="info">Kayıt bulunamadı</Alert>;

//     // تقسیم داده‌ها به ۳ تای اول و بقیه
//     const firstThreeItems = data.slice(0, 3);
//     const remainingItems = data.slice(3);

//     return (
//         <Box>
//             <Typography variant="h5" mb={3} fontWeight={700}>
//                 Şantiye Beton Miktarları
//             </Typography>

//             <Grid container spacing={3}>
//                 {/* نمایش ۳ آیتم اول همیشه */}
//                 {firstThreeItems.map((item, index) => (
//                     <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || index}>
//                         {renderCard(item)}
//                     </Grid>
//                 ))}
//             </Grid>

//             {/* اگر داده‌ها بیشتر از ۳ تا بود، بقیه را داخل Collapse می‌گذاریم */}
//             {remainingItems.length > 0 && (
//                 <>
//                     <Collapse in={expanded} timeout="auto" unmountOnExit>
//                         <Box mt={3}>
//                             <Grid container spacing={3}>
//                                 {remainingItems.map((item, index) => (
//                                     <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || `more-${index}`}>
//                                         {renderCard(item)}
//                                     </Grid>
//                                 ))}
//                             </Grid>
//                         </Box>
//                     </Collapse>

//                     {/* دکمه نمایش بیشتر / کمتر */}
//                     <Box display="flex" justifyContent="center" mt={3}>
//                         <Button
//                             variant="outlined"
//                             color="primary"
//                             onClick={() => setExpanded(!expanded)}
//                             endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
//                             sx={{ borderRadius: '20px', px: 4 }}
//                         >
//                             {expanded ? 'Daha Az Göster' : `Daha Fazla Göster (${remainingItems.length} kayıt)`}
//                         </Button>
//                     </Box>
//                 </>
//             )}
//         </Box>
//     );
// };

// export default WorkhouseBetonStats;

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
    ToggleButton,
    ToggleButtonGroup,
    useTheme
} from '@mui/material';
import axios from 'axios';
import {
    IconBuilding,
    IconCube,
    IconChevronDown,
    IconChevronUp,
    IconChartBar,   // آیکون برای حالت نمودار
    IconLayoutGrid  // آیکون برای حالت کارت
} from '@tabler/icons-react';
// اضافه کردن کامپوننت‌های نمودار 
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی
interface BetonStatType {
    workhouse_id: string;
    workhousen_name: string;
    total_quantity: string;
}

const WorkhouseBetonStats = () => {
    const theme = useTheme();
    const [data, setData] = useState<BetonStatType[]>([]);
    const [loading, setLoading] = useState(true);

    // State برای مدیریت حالت نمایش (پیش‌فرض: گرافیکی)
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');

    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(
                    server.baseurl + server.report + 'get-dashboard-workhouse-beton-quantity',
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

    // هندلر تغییر حالت نمایش
    const handleViewChange = (
        _event: React.MouseEvent<HTMLElement>,
        newView: 'chart' | 'cards' | null,
    ) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

    // آماده‌سازی داده‌ها برای نمودار (تبدیل رشته به عدد)
    const chartData = data.map(item => ({
        name: item.workhousen_name,
        quantity: parseFloat(item.total_quantity) || 0
    }));

    // رندر کارت تکی
    const renderCard = (item: BetonStatType) => (
        <Card sx={{
            p: 3,
            border: '1px solid #e5eaef',
            boxShadow: 'none',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: 'primary.main' },
            transition: 'all 0.3s ease'
        }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                    <IconBuilding size={24} />
                </Avatar>

                <Box>
                    <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap sx={{ maxWidth: '150px' }}>
                        {item.workhousen_name}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <IconCube size={18} color="#5D87FF" />
                        <Typography variant="h5" fontWeight={700}>
                            {Number(item.total_quantity).toLocaleString('tr-TR')} m³
                        </Typography>
                    </Stack>
                </Box>
            </Stack>
        </Card>
    );

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (data.length === 0) return <Alert severity="info">Kayıt bulunamadı</Alert>;

    // تقسیم داده‌ها برای حالت کارتی
    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    return (
        <Box>
            {/* هدر: شامل تایتل و دکمه‌های سوئیچ */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={700}>
                    Şantiye Beton Miktarları
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
                            <IconChartBar size={18} />
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

            {/* محتوا بر اساس حالت انتخاب شده */}
            <Box>
                {viewMode === 'chart' ? (
                    // --- حالت نموداری ---
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef' }}>
                        <Box height="400px" width="100%">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }} // bottom زیاد شد برای لیبل‌های طولانی
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={60}
                                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                                    />
                                    <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                                    <Tooltip
                                        formatter={(value: number) => [value.toLocaleString('tr-TR') + ' m³', 'Miktar']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="quantity" name="Beton Miktarı" radius={[4, 4, 0, 0]}>
                                        {chartData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#5D87FF' : '#49BEFF'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                ) : (
                    // --- حالت کارتی (کد قبلی) ---
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
                                        color="primary"
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

export default WorkhouseBetonStats;