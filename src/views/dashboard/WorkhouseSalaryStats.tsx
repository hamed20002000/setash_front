// import React, { useEffect, useState, useRef, useCallback } from 'react';
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
//     Avatar,
//     Chip,
//     ToggleButton,
//     ToggleButtonGroup,
//     IconButton,
//     Tooltip
// } from '@mui/material';
// import axios from 'axios';
// // 1. اضافه کردن متد تبدیل به عکس
// import { toPng } from 'html-to-image';
// import {
//     IconBuildingStore,
//     IconWallet,
//     IconChevronDown,
//     IconChevronUp,
//     IconChartPie,
//     IconLayoutGrid,
//     IconDownload // 2. آیکون دانلود
// } from '@tabler/icons-react';
// import {
//     PieChart,
//     Pie,
//     Cell,
//     Tooltip as RechartsTooltip, // تغییر نام برای جلوگیری از تداخل با Tooltip متریال
//     Legend,
//     ResponsiveContainer
// } from 'recharts';
// import server from '../../assets/address.json';

// // تعریف تایپ داده‌های دریافتی
// interface SalaryStatType {
//     workhouse_id: string;
//     workhouse_code: string;
//     workhouse_name: string;
//     total_salary: string;
// }

// // رنگ‌های نمودار دایره‌ای
// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

// const WorkhouseSalaryStats = () => {
//     // 3. تعریف Ref برای نمودار
//     const chartRef = useRef<HTMLDivElement>(null);

//     const [data, setData] = useState<SalaryStatType[]>([]);
//     const [loading, setLoading] = useState(true);

//     // State حالت نمایش (پیش‌فرض: گرافیکی)
//     const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');

//     const [expanded, setExpanded] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         const fetchData = async () => {
//             const authToken = localStorage.getItem('authToken');
//             try {
//                 const response = await axios.get(
//                     server.baseurl + server.report + 'get-dashboard-workhouse-total-salary',
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

//     // 4. تابع دانلود نمودار
//     const handleDownloadChart = useCallback(async () => {
//         if (chartRef.current === null) {
//             return;
//         }

//         try {
//             const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
//             const link = document.createElement('a');
//             link.download = 'salary-stats-chart.png';
//             link.href = dataUrl;
//             link.click();
//         } catch (err) {
//             console.error('Grafik indirilemedi:', err);
//         }
//     }, [chartRef]);

//     // تابع تمیز کردن و فرمت کردن عدد پول (برای نمایش متن)
//     const formatCurrency = (val: string) => {
//         const cleanVal = val.replace(/[^\d.-]/g, '');
//         const numberVal = parseFloat(cleanVal);
//         if (isNaN(numberVal)) return val;
//         return numberVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//     };

//     // تابع پارس کردن عدد برای نمودار (خروجی عدد خالص)
//     const parseCurrencyToNumber = (val: string) => {
//         const cleanVal = val.replace(/[^\d.-]/g, '');
//         const numberVal = parseFloat(cleanVal);
//         return isNaN(numberVal) ? 0 : numberVal;
//     };

//     // آماده‌سازی داده‌ها برای نمودار
//     const chartData = data.map(item => ({
//         name: item.workhouse_name,
//         value: parseCurrencyToNumber(item.total_salary)
//     })).filter(item => item.value > 0);

//     // هندلر تغییر حالت نمایش
//     const handleViewChange = (
//         _event: React.MouseEvent<HTMLElement>,
//         newView: 'chart' | 'cards' | null,
//     ) => {
//         if (newView !== null) {
//             setViewMode(newView);
//         }
//     };

//     // رندر کردن کارت تکی
//     const renderCard = (item: SalaryStatType) => (
//         <Card sx={{
//             p: 3,
//             border: '1px solid #e5eaef',
//             boxShadow: 'none',
//             height: '100%',
//             position: 'relative',
//             overflow: 'hidden',
//             '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: 'success.main' },
//             transition: 'all 0.3s ease'
//         }}>
//             <Stack direction="row" spacing={2} alignItems="flex-start">
//                 <Avatar variant="rounded" sx={{ bgcolor: 'success.light', color: 'success.main', width: 48, height: 48 }}>
//                     <IconBuildingStore size={24} />
//                 </Avatar>
//                 <Box width="100%">
//                     <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
//                         <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap sx={{ maxWidth: '70%' }}>
//                             {item.workhouse_name}
//                         </Typography>
//                         <Chip label={`Kod: ${item.workhouse_code}`} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
//                     </Stack>
//                     <Stack direction="row" alignItems="center" spacing={1} mt={1}>
//                         <IconWallet size={20} color="#13DEB9" />
//                         <Typography variant="h5" fontWeight={700} color="success.main">
//                             {formatCurrency(item.total_salary)} <Typography component="span" variant="body2" color="textSecondary">TL</Typography>
//                         </Typography>
//                     </Stack>
//                 </Box>
//             </Stack>
//         </Card>
//     );

//     if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
//     if (error) return <Alert severity="error">{error}</Alert>;
//     if (data.length === 0) return <Alert severity="info">Maaş verisi bulunamadı</Alert>;

//     const firstThreeItems = data.slice(0, 3);
//     const remainingItems = data.slice(3);

//     return (
//         <Box mt={4}>
//             {/* هدر: تایتل و دکمه‌های سوئیچ */}
//             <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
//                 <Typography variant="h5" fontWeight={700}>
//                     Şantiye Toplam Maaşlar
//                 </Typography>

//                 <Stack direction="row" spacing={2}>
//                     {/* 5. دکمه دانلود (فقط در حالت نمودار) */}
//                     {viewMode === 'chart' && (
//                         <Tooltip title="Grafiği İndir">
//                             <IconButton
//                                 onClick={handleDownloadChart}
//                                 color="primary"
//                                 sx={{ border: '1px solid #e5eaef' }}
//                             >
//                                 <IconDownload size={20} />
//                             </IconButton>
//                         </Tooltip>
//                     )}

//                     <ToggleButtonGroup
//                         value={viewMode}
//                         exclusive
//                         onChange={handleViewChange}
//                         aria-label="view mode"
//                         size="small"
//                         sx={{ bgcolor: 'background.paper' }}
//                     >
//                         <ToggleButton value="chart" aria-label="chart view">
//                             <Stack direction="row" spacing={1} alignItems="center">
//                                 <IconChartPie size={18} />
//                                 <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Grafik</Typography>
//                             </Stack>
//                         </ToggleButton>
//                         <ToggleButton value="cards" aria-label="cards view">
//                             <Stack direction="row" spacing={1} alignItems="center">
//                                 <IconLayoutGrid size={18} />
//                                 <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>Liste</Typography>
//                             </Stack>
//                         </ToggleButton>
//                     </ToggleButtonGroup>
//                 </Stack>
//             </Stack>

//             <Box>
//                 {viewMode === 'chart' ? (
//                     // --- حالت نموداری (Pie Chart) ---
//                     <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef' }}>
//                         {/* 6. اتصال Ref به کانتینر نمودار */}
//                         <Box height="400px" width="100%" ref={chartRef} sx={{ bgcolor: 'background.paper' }}>
//                             {chartData.length > 0 ? (
//                                 <ResponsiveContainer width="100%" height="100%">
//                                     <PieChart>
//                                         <Pie
//                                             data={chartData}
//                                             cx="50%"
//                                             cy="50%"
//                                             labelLine={false}
//                                             outerRadius={150}
//                                             fill="#8884d8"
//                                             dataKey="value"
//                                             nameKey="name"
//                                         >
//                                             {chartData.map((_entry, index) => (
//                                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                                             ))}
//                                         </Pie>
//                                         <RechartsTooltip
//                                             formatter={(value: number, name: string) => [
//                                                 value.toLocaleString('us-US', { minimumFractionDigits: 2 }) + ' TL',
//                                                 name
//                                             ]}
//                                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
//                                             itemStyle={{ color: '#333', fontWeight: 600 }}
//                                         />
//                                         <Legend verticalAlign="bottom" height={36} />
//                                     </PieChart>
//                                 </ResponsiveContainer>
//                             ) : (
//                                 <Box display="flex" alignItems="center" justifyContent="center" height="100%">
//                                     <Typography color="textSecondary">Grafik için veri bulunamadı (Tüm değerler 0 olabilir)</Typography>
//                                 </Box>
//                             )}
//                         </Box>
//                     </Card>
//                 ) : (
//                     // --- حالت کارتی (بدون تغییر) ---
//                     <>
//                         <Grid container spacing={3}>
//                             {firstThreeItems.map((item, index) => (
//                                 <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || index}>
//                                     {renderCard(item)}
//                                 </Grid>
//                             ))}
//                         </Grid>

//                         {remainingItems.length > 0 && (
//                             <>
//                                 <Collapse in={expanded} timeout="auto" unmountOnExit>
//                                     <Box mt={3}>
//                                         <Grid container spacing={3}>
//                                             {remainingItems.map((item, index) => (
//                                                 <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || `more-${index}`}>
//                                                     {renderCard(item)}
//                                                 </Grid>
//                                             ))}
//                                         </Grid>
//                                     </Box>
//                                 </Collapse>

//                                 <Box display="flex" justifyContent="center" mt={3}>
//                                     <Button
//                                         variant="outlined"
//                                         color="success"
//                                         onClick={() => setExpanded(!expanded)}
//                                         endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
//                                         sx={{ borderRadius: '20px', px: 4 }}
//                                     >
//                                         {expanded ? 'Daha Az Göster' : `Daha Fazla Göster (${remainingItems.length} kayıt)`}
//                                     </Button>
//                                 </Box>
//                             </>
//                         )}
//                     </>
//                 )}
//             </Box>
//         </Box>
//     );
// };

// export default WorkhouseSalaryStats;


import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    IconButton,
    Tooltip
} from '@mui/material';
import axios from 'axios';
import { toPng } from 'html-to-image';
import {
    IconBuildingStore,
    IconWallet,
    IconChevronDown,
    IconChevronUp,
    IconChartPie,
    IconLayoutGrid,
    IconDownload,
    IconDatabaseOff // ✅ آیکون جدید
} from '@tabler/icons-react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import server from '../../assets/address.json';

interface SalaryStatType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    total_salary: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

// ✅ 1. کامپوننت پیام "بدون دیتا" برای حالت لیست
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
        <Avatar
            sx={{
                width: 80,
                height: 80,
                bgcolor: '#f5f7fa',
                mb: 2
            }}
        >
            <IconDatabaseOff size={40} color="#9ca3af" />
        </Avatar>
        <Typography variant="h6" fontWeight={600} color="textPrimary" gutterBottom>
            Kayıt Bulunamadı
        </Typography>
        <Typography variant="body2" color="textSecondary">
            Şu anda görüntülenecek herhangi bir maaş verisi bulunamadı.
        </Typography>
    </Box>
);

// ✅ 2. کامپوننت پیام روی نمودار خالی
const CustomNoDataOverlay = () => (
    <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: '10px 20px',
        borderRadius: '8px',
        zIndex: 10,
        border: '1px solid #eee'
    }}>
        <Typography variant="body1" color="textSecondary" fontWeight={500}>
            Grafik için veri yok
        </Typography>
    </div>
);

const WorkhouseSalaryStats = () => {
    const chartRef = useRef<HTMLDivElement>(null);

    const [data, setData] = useState<SalaryStatType[]>([]);
    const [loading, setLoading] = useState(true);
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
                    setData([]); // اگر دیتا نبود، آرایه خالی ست شود
                    if (!response.data.success) {
                        setError(response.data.message || 'Veri alınamadı');
                    }
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

    const handleDownloadChart = useCallback(async () => {
        if (chartRef.current === null) {
            return;
        }

        try {
            const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = 'salary-stats-chart.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Grafik indirilemedi:', err);
        }
    }, [chartRef]);

    const formatCurrency = (val: string) => {
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        if (isNaN(numberVal)) return val;
        return numberVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const parseCurrencyToNumber = (val: string) => {
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        return isNaN(numberVal) ? 0 : numberVal;
    };

    const chartData = data.map(item => ({
        name: item.workhouse_name,
        value: parseCurrencyToNumber(item.total_salary)
    })).filter(item => item.value > 0);

    const handleViewChange = (
        _event: React.MouseEvent<HTMLElement>,
        newView: 'chart' | 'cards' | null,
    ) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

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

    // ❌ حذف شد تا هدر نمایش داده شود
    // if (data.length === 0) return <Alert severity="info">Maaş verisi bulunamadı</Alert>;

    const isDataEmpty = data.length === 0;
    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    // دیتای خالی برای رسم دایره خالی
    const emptyChartData = [{ name: 'Veri Yok', value: 1 }];

    return (
        <Box mt={4}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" fontWeight={700}>
                    Şantiye Toplam Maaşlar
                </Typography>

                <Stack direction="row" spacing={2}>
                    {/* دکمه دانلود فقط وقتی دیتا هست */}
                    {viewMode === 'chart' && !isDataEmpty && (
                        <Tooltip title="Grafiği İndir">
                            <IconButton
                                onClick={handleDownloadChart}
                                color="primary"
                                sx={{ border: '1px solid #e5eaef' }}
                            >
                                <IconDownload size={20} />
                            </IconButton>
                        </Tooltip>
                    )}

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
            </Stack>

            <Box>
                {viewMode === 'chart' ? (
                    // --- CHART VIEW ---
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef', position: 'relative' }}>
                        <Box height="400px" width="100%" ref={chartRef} sx={{ bgcolor: 'background.paper', position: 'relative' }}>
                            {/* اگر دیتا خالی بود، پیام وسط نمودار نمایش داده شود */}
                            {isDataEmpty && <CustomNoDataOverlay />}

                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        // اگر دیتا خالیه، دایره خالی خاکستری رسم میکنیم
                                        data={isDataEmpty ? emptyChartData : chartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={150}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                        stroke="none"
                                    >
                                        {isDataEmpty ? (
                                            <Cell key="cell-empty" fill="#f0f0f0" />
                                        ) : (
                                            chartData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))
                                        )}
                                    </Pie>
                                    {/* فقط وقتی دیتا هست تولتیپ و لجند نمایش داده شوند */}
                                    {!isDataEmpty && (
                                        <>
                                            <RechartsTooltip
                                                formatter={(value: number, name: string) => [
                                                    value.toLocaleString('us-US', { minimumFractionDigits: 2 }) + ' TL',
                                                    name
                                                ]}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                                itemStyle={{ color: '#333', fontWeight: 600 }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </>
                                    )}
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                ) : (
                    // --- LIST VIEW ---
                    <>
                        {isDataEmpty ? (
                            // ✅ نمایش کامپوننت "بدون دیتا"
                            <NoDataView />
                        ) : (
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
                    </>
                )}
            </Box>
        </Box>
    );
};

export default WorkhouseSalaryStats;