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
    IconBuilding, // آیکون شانتيه
    IconCube, // آیکون نماد بتن (مکعب)
    IconChevronDown,
    IconChevronUp
} from '@tabler/icons-react';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی
interface BetonStatType {
    workhouse_id: string;
    workhousen_name: string;
    total_quantity: string;
}

const WorkhouseBetonStats = () => {
    const [data, setData] = useState<BetonStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false); // وضعیت باز/بسته بودن لیست
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

    // تابع کمکی برای رندر کردن کارت تکی
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
                {/* آیکون سمت چپ */}
                <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 48, height: 48 }}>
                    <IconBuilding size={24} />
                </Avatar>

                <Box>
                    <Typography variant="subtitle2" color="textSecondary" fontWeight={600}>
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

    // تقسیم داده‌ها به ۳ تای اول و بقیه
    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    return (
        <Box>
            <Typography variant="h5" mb={3} fontWeight={700}>
                Şantiye Beton Miktarları
            </Typography>

            <Grid container spacing={3}>
                {/* نمایش ۳ آیتم اول همیشه */}
                {firstThreeItems.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || index}>
                        {renderCard(item)}
                    </Grid>
                ))}
            </Grid>

            {/* اگر داده‌ها بیشتر از ۳ تا بود، بقیه را داخل Collapse می‌گذاریم */}
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

                    {/* دکمه نمایش بیشتر / کمتر */}
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
        </Box>
    );
};

export default WorkhouseBetonStats;