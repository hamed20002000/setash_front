import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
    useTheme,
    IconButton,
    Tooltip
} from '@mui/material';
import axios from 'axios';
// اضافه کردن متد toPng
import { toPng } from 'html-to-image';
import {
    IconBuilding,
    IconCube,
    IconChevronDown,
    IconChevronUp,
    IconChartBar,
    IconLayoutGrid,
    IconDownload // آیکون دانلود
} from '@tabler/icons-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import server from '../../assets/address.json';

interface BetonStatType {
    workhouse_id: string;
    workhousen_name: string;
    total_quantity: string;
}

// کامپوننت کارت (بدون تغییر)
interface StatCardProps {
    item: BetonStatType;
}

const StatCard: React.FC<StatCardProps> = ({ item }) => (
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

const WorkhouseBetonStats = () => {
    const theme = useTheme();
    // 1. تعریف Ref برای نمودار
    const chartRef = useRef<HTMLDivElement>(null);

    const [data, setData] = useState<BetonStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const url = `${server.baseurl}${server.report}get-dashboard-workhouse-beton-quantity`;
                const response = await axios.get(url, {
                    headers: { "Authorization": `Bearer ${authToken}` }
                });

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

    const handleViewChange = (
        _event: React.MouseEvent<HTMLElement>,
        newView: 'chart' | 'cards' | null,
    ) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

    // 2. تابع دانلود نمودار
    const handleDownloadChart = useCallback(async () => {
        if (chartRef.current === null) {
            return;
        }

        try {
            // تولید عکس از روی Ref
            // خاصیت backgroundColor مهم است تا در تم‌های مختلف پس‌زمینه شفاف یا سیاه نشود
            const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });

            // ایجاد لینک موقت برای دانلود
            const link = document.createElement('a');
            link.download = 'beton-miktarlari-grafik.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Grafik indirilemedi:', err);
        }
    }, [chartRef]);

    const chartData = useMemo(() => {
        return data.map(item => ({
            name: item.workhousen_name,
            quantity: parseFloat(item.total_quantity) || 0
        }));
    }, [data]);

    const { firstThreeItems, remainingItems } = useMemo(() => {
        return {
            firstThreeItems: data.slice(0, 3),
            remainingItems: data.slice(3)
        };
    }, [data]);

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (data.length === 0) return <Alert severity="info">Kayıt bulunamadı</Alert>;

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={700}>
                    Şantiye Beton Miktarları
                </Typography>

                <Stack direction="row" spacing={2}>
                    {/* دکمه دانلود فقط وقتی نمایش داده می‌شود که در حالت نمودار باشیم */}
                    {viewMode === 'chart' && (
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
            </Stack>

            <Box>
                {viewMode === 'chart' ? (
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef' }}>
                        {/* 3. اتصال Ref به کانتینری که شامل نمودار است */}
                        <Box height="400px" width="100%" ref={chartRef} sx={{ bgcolor: 'background.paper' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
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
                                    <RechartsTooltip
                                        formatter={(value: number) => [value.toLocaleString('tr-TR') + ' m³', 'Miktar']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    />
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
                    // بخش نمایش کارتی (بدون تغییر)
                    <>
                        <Grid container spacing={3}>
                            {firstThreeItems.map((item, index) => (
                                <Grid item xs={12} sm={6} md={4} key={item.workhouse_id || index}>
                                    <StatCard item={item} />
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
                                                    <StatCard item={item} />
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