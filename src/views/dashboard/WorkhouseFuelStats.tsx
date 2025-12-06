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
    Divider
} from '@mui/material';
import axios from 'axios';
import {
    IconGasStation, // آیکون پمپ بنزین
    IconDroplet, // آیکون قطره (برای لیتر)
    IconCoin, // آیکون سکه/پول
    IconChevronDown,
    IconChevronUp
} from '@tabler/icons-react';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی طبق JSON شما
interface FuelStatType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    fuel_type: string; // e.g., "GASOLINE"
    total_fuel_amount: string; // e.g., "533"
    total_price: string; // e.g., "$34,347,434.00"
}

const WorkhouseFuelStats = () => {
    const [data, setData] = useState<FuelStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(
                    server.baseurl + server.report + 'get-dashboard-workhouse-fuel-stats',
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

    // توابع فرمت‌دهی
    const formatCurrency = (val: string) => {
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);
        if (isNaN(numberVal)) return val;
        return numberVal.toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatAmount = (val: string) => {
        const numberVal = parseFloat(val);
        if (isNaN(numberVal)) return val;
        return numberVal.toLocaleString('tr-TR');
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
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: '#FA896B' }, // رنگ نارنجی
            transition: 'all 0.3s ease'
        }}>
            <Box p={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar variant="rounded" sx={{ bgcolor: '#FA896B', color: 'white', width: 48, height: 48 }}>
                        <IconGasStation size={24} />
                    </Avatar>

                    <Box flexGrow={1}>
                        <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap>
                            {item.workhouse_name}
                        </Typography>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={0.5}>
                            <Chip
                                label={item.fuel_type}
                                size="small"
                                sx={{
                                    fontSize: '0.7rem',
                                    height: 20,
                                    bgcolor: '#FA896B20',
                                    color: '#FA896B',
                                    fontWeight: 700
                                }}
                            />
                            <Typography variant="caption" color="textSecondary">Kod: {item.workhouse_code}</Typography>
                        </Stack>
                    </Box>
                </Stack>
            </Box>

            <Divider />

            <Box p={2} bgcolor="#FA896B08">
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    {/* مقدار مصرف */}
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconDroplet size={18} color="#FA896B" />
                        <Box>
                            <Typography variant="caption" color="textSecondary" display="block">Miktar</Typography>
                            <Typography variant="subtitle1" fontWeight={700}>
                                {formatAmount(item.total_fuel_amount)} <Typography component="span" variant="caption">Lt</Typography>
                            </Typography>
                        </Box>
                    </Box>

                    {/* هزینه کل */}
                    <Box display="flex" alignItems="center" gap={1} textAlign="right">
                        <Box>
                            <Typography variant="caption" color="textSecondary" display="block">Tutar</Typography>
                            <Typography variant="subtitle1" fontWeight={700} color="#FA896B">
                                {formatCurrency(item.total_price)} <Typography component="span" variant="caption">TL</Typography>
                            </Typography>
                        </Box>
                        <IconCoin size={18} color="#FA896B" />
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
            <Typography variant="h5" mb={3} fontWeight={700}>
                Şantiye Yakıt Tüketimleri
            </Typography>

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
                            sx={{ color: '#FA896B', borderColor: '#FA896B', borderRadius: '20px', px: 4, '&:hover': { borderColor: '#FA896B', bgcolor: '#FA896B10' } }}
                            onClick={() => setExpanded(!expanded)}
                            endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
                        >
                            {expanded ? 'Daha Az Göster' : `Daha Fazla Göster (${remainingItems.length} kayıt)`}
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default WorkhouseFuelStats;