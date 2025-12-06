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
    Chip
} from '@mui/material';
import axios from 'axios';
import {
    IconBuildingStore, // آیکون ساختمان/کارگاه
    IconWallet, // آیکون کیف پول
    IconChevronDown,
    IconChevronUp
} from '@tabler/icons-react';
import server from '../../assets/address.json';

// تعریف تایپ داده‌های دریافتی
interface SalaryStatType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    total_salary: string;
}

const WorkhouseSalaryStats = () => {
    const [data, setData] = useState<SalaryStatType[]>([]);
    const [loading, setLoading] = useState(true);
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

    // تابع تمیز کردن و فرمت کردن عدد پول
    const formatCurrency = (val: string) => {
        // حذف هر چیزی که عدد، نقطه یا منفی نیست (مثل $)
        const cleanVal = val.replace(/[^\d.-]/g, '');
        const numberVal = parseFloat(cleanVal);

        if (isNaN(numberVal)) return val; // اگر عدد نبود، همان رشته اصلی را برگردان

        // فرمت کردن به صورت پول (مثلا: 1.250,00 TL)
        return numberVal.toLocaleString('us-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
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
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: 'success.main' }, // هاور سبز
            transition: 'all 0.3s ease'
        }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
                {/* آیکون سمت چپ */}
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
                        <IconWallet size={20} color="#13DEB9" /> {/* رنگ سبز */}
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

    // لاجیک نمایش بیشتر
    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    return (
        <Box mt={4}> {/* فاصله از کامپوننت بالایی */}
            <Typography variant="h5" mb={3} fontWeight={700}>
                Şantiye Toplam Maaşlar
            </Typography>

            <Grid container spacing={3}>
                {/* نمایش ۳ آیتم اول */}
                {firstThreeItems.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || index}>
                        {renderCard(item)}
                    </Grid>
                ))}
            </Grid>

            {/* بخش Collapsible برای بیشتر از ۳ آیتم */}
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
                            color="success" // رنگ دکمه سبز برای هماهنگی با موضوع پول
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

export default WorkhouseSalaryStats;