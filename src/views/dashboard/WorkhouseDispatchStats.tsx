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
    Avatar
} from '@mui/material';
import axios from 'axios';
import {
    IconTruckDelivery, // آیکون کامیون پخش
    IconReceipt2, // آیکون رسید/فاکتور
    IconChevronDown,
    IconChevronUp
} from '@tabler/icons-react';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی طبق JSON ارسالی
interface DispatchStatType {
    workhouse_id: string;
    workhousen_name: string; // توجه: دقیقاً طبق JSON شما (احتمالا تایپو در API است ولی ما عیناً استفاده می‌کنیم)
    total_price: string;
}

const WorkhouseDispatchStats = () => {
    const [data, setData] = useState<DispatchStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(
                    server.baseurl + server.report + 'get-dashboard-workhouse-dispatch-price',
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

    // فرمت کردن عدد پول
    const formatCurrency = (val: string) => {
        const numberVal = parseFloat(val);
        if (isNaN(numberVal)) return val;
        return numberVal.toLocaleString('us-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: '#5D87FF' }, // رنگ آبی/نیلی
            transition: 'all 0.3s ease'
        }}>
            <Stack direction="row" spacing={2} alignItems="center">
                {/* آیکون سمت چپ */}
                <Avatar variant="rounded" sx={{ bgcolor: '#E8F7FF', color: '#49BEFF', width: 48, height: 48 }}>
                    <IconTruckDelivery size={24} />
                </Avatar>

                <Box>
                    <Typography variant="subtitle2" color="textSecondary" fontWeight={600} noWrap sx={{ maxWidth: '200px' }}>
                        {item.workhousen_name}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                        <IconReceipt2 size={18} color="#49BEFF" />
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
            <Typography variant="h5" mb={3} fontWeight={700}>
                Şantiye Sevk Tutarları
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
                            sx={{
                                color: '#49BEFF', borderColor: '#49BEFF', borderRadius: '20px', px: 4,
                                '&:hover': { borderColor: '#49BEFF', bgcolor: '#E8F7FF' }
                            }}
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

export default WorkhouseDispatchStats;