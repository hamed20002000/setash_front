import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
    Box, Grid, Card, Typography, CircularProgress, Alert, Button,
    Collapse, Stack, Avatar, Chip, Divider, ToggleButton, ToggleButtonGroup,
    IconButton, Tooltip
} from '@mui/material';
import axios from 'axios';
import { toPng } from 'html-to-image';
import {
    IconGasStation, IconDroplet, IconCoin, IconChevronDown,
    IconChevronUp, IconChartArea, IconLayoutGrid, IconBuildingWarehouse,
    IconDownload,
    IconDatabaseOff
} from '@tabler/icons-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import server from '../../assets/address.json';

interface FuelStatType {
    workhouse_id: string;
    workhouse_code: string;
    workhouse_name: string;
    fuel_type: string;
    total_fuel_amount: number;
    total_price: number;
    isOther?: boolean;
}

const PRIMARY_COLOR = '#FA896B';
const SECONDARY_COLOR = '#49BEFF';

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
            Şu anda görüntülenecek herhangi bir yakıt harcaması bulunamadı.
        </Typography>
    </Box>
);

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

const WorkhouseFuelStats = () => {
    const chartRef = useRef<HTMLDivElement>(null);

    const [data, setData] = useState<FuelStatType[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'chart' | 'cards'>('chart');
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parseNumber = (val: string | number | null): number => {
        if (!val) return 0;
        const strVal = String(val);
        const cleanVal = strVal.replace(/[^\d.-]/g, '');
        const num = parseFloat(cleanVal);
        return isNaN(num) ? 0 : num;
    };

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            const headers = { "Authorization": `Bearer ${authToken}` };

            try {
                const [workhouseRes, otherRes] = await Promise.all([
                    axios.get(
                        server.baseurl + server.report + 'get-dashboard-workhouse-fuel-stats',
                        { headers, signal: controller.signal }
                    ),
                    axios.get(
                        server.baseurl + server.report + 'get-dashboard-other-fuel-stats',
                        { headers, signal: controller.signal }
                    )
                ]);

                let combinedData: FuelStatType[] = [];

                if (workhouseRes.data.httpStatusCode === 200 && workhouseRes.data.data) {
                    const workhouseData = workhouseRes.data.data.map((item: any) => ({
                        workhouse_id: item.workhouse_id,
                        workhouse_code: item.workhouse_code,
                        workhouse_name: item.workhouse_name,
                        fuel_type: item.fuel_type,
                        total_fuel_amount: parseNumber(item.total_fuel_amount),
                        total_price: parseNumber(item.total_price),
                        isOther: false
                    }));
                    combinedData = [...combinedData, ...workhouseData];
                }

                if (otherRes.data.httpStatusCode === 200 && otherRes.data.data && otherRes.data.data.length > 0) {
                    const otherItemRaw = otherRes.data.data[0];
                    const otherData: FuelStatType = {
                        workhouse_id: 'other-stats-id',
                        workhouse_code: '-',
                        workhouse_name: 'Şantiye Dışı ',
                        fuel_type: 'Diğer',
                        total_fuel_amount: 0,
                        total_price: parseNumber(otherItemRaw.total_price),
                        isOther: true
                    };

                    if (otherData.total_price > 0) {
                        combinedData.push(otherData);
                    }
                }

                setData(combinedData);

            } catch (err: any) {
                if (!axios.isCancel(err)) {
                    console.error(err);
                    setError('Veriler yüklenirken bir hata oluştu');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, []);

    const handleDownloadChart = useCallback(async () => {
        if (chartRef.current === null) {
            return;
        }

        try {
            const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = 'fuel-stats-chart.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Grafik indirilemedi:', err);
        }
    }, [chartRef]);

    const formatTR = useCallback((val: number) => {
        return new Intl.NumberFormat('us-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val);
    }, []);

    const chartData = useMemo(() => {
        return data
            .map(item => ({
                name: item.workhouse_name,
                price: item.total_price,
                amount: item.total_fuel_amount,
                isOther: item.isOther
            }))
            .filter(item => item.price > 0);
    }, [data]);

    const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newView: 'chart' | 'cards' | null) => {
        if (newView !== null) setViewMode(newView);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const value = payload[0].value;
            const color = dataPoint.isOther ? SECONDARY_COLOR : PRIMARY_COLOR;

            return (
                <Card sx={{ p: 1.5, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: 'none' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>{label}</Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconCoin size={16} color={color} />
                        <Typography variant="body2" color="textSecondary">
                            Tutar: <span style={{ color: color, fontWeight: 600 }}>{formatTR(value)} TL</span>
                        </Typography>
                    </Box>
                </Card>
            );
        }
        return null;
    };

    const renderCard = (item: FuelStatType) => {
        const itemColor = item.isOther ? SECONDARY_COLOR : PRIMARY_COLOR;

        return (
            <Card sx={{
                p: 0,
                border: '1px solid #e5eaef',
                boxShadow: 'none',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderColor: itemColor },
                transition: 'all 0.3s ease'
            }}>
                {item.isOther && <Box sx={{ height: 4, bgcolor: itemColor, width: '100%' }} />}

                <Box p={3}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar variant="rounded" sx={{ bgcolor: itemColor, color: 'white', width: 48, height: 48 }}>
                            {item.isOther ? <IconBuildingWarehouse size={24} /> : <IconGasStation size={24} />}
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
                                        fontSize: '0.7rem', height: 20, bgcolor: `${itemColor}20`,
                                        color: itemColor, fontWeight: 700
                                    }}
                                />
                                <Typography variant="caption" color="textSecondary">
                                    {item.workhouse_code !== '-' ? `Kod: ${item.workhouse_code}` : ''}
                                </Typography>
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
                <Divider />
                <Box p={2} bgcolor={`${itemColor}08`}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        {item.total_fuel_amount > 0 ? (
                            <Box display="flex" alignItems="center" gap={1}>
                                <IconDroplet size={18} color={itemColor} />
                                <Box>
                                    <Typography variant="caption" color="textSecondary" display="block">Miktar</Typography>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        {formatTR(item.total_fuel_amount)} <Typography component="span" variant="caption">Lt</Typography>
                                    </Typography>
                                </Box>
                            </Box>
                        ) : (
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="caption" color="textSecondary">-</Typography>
                            </Box>
                        )}

                        <Box display="flex" alignItems="center" gap={1} textAlign="right" ml="auto">
                            <Box>
                                <Typography variant="caption" color="textSecondary" display="block">Tutar</Typography>
                                <Typography variant="subtitle1" fontWeight={700} color={itemColor}>
                                    {formatTR(item.total_price)} <Typography component="span" variant="caption">TL</Typography>
                                </Typography>
                            </Box>
                            <IconCoin size={18} color={itemColor} />
                        </Box>
                    </Stack>
                </Box>
            </Card>
        );
    };

    if (loading) return <Box p={3} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;


    const isDataEmpty = data.length === 0;
    const firstThreeItems = data.slice(0, 3);
    const remainingItems = data.slice(3);

    const emptyChartData = Array(5).fill({ name: '', price: 0 });

    return (
        <Box mt={4}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" fontWeight={700}>Tüm Yakıt Harcamaları</Typography>

                <Stack direction="row" spacing={2}>
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
            </Stack>

            <Box>
                {viewMode === 'chart' ? (
                    <Card sx={{ p: 2, boxShadow: 'none', border: '1px solid #e5eaef', position: 'relative' }}>
                        <Box height="400px" width="100%" ref={chartRef} sx={{ bgcolor: 'background.paper', position: 'relative' }}>
                            {isDataEmpty && <CustomNoDataOverlay />}

                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={isDataEmpty ? emptyChartData : chartData}
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
                                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                                    />
                                    {!isDataEmpty && (
                                        <>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="price"
                                                stroke={PRIMARY_COLOR}
                                                fillOpacity={1}
                                                fill="url(#colorPrice)"
                                                strokeWidth={3}
                                            />
                                        </>
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                ) : (
                    <>
                        {isDataEmpty ? (
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
                                                sx={{ color: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, borderRadius: '20px', px: 4 }}
                                                onClick={() => setExpanded(!expanded)}
                                                endIcon={expanded ? <IconChevronUp /> : <IconChevronDown />}
                                            >
                                                {expanded ? 'Daha Az Göster' : `Daha Fazla Göster (${remainingItems.length})`}
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

export default WorkhouseFuelStats;