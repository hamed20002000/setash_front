import { useEffect, useState } from 'react';
import { Grid, Box, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import {
    IconUsers,
    IconGavel,
    IconBriefcase,
    IconBuildingWarehouse,
    IconCar,
    IconPackage,
    IconSchool,
    IconTimeline,
    IconBuildingStore,
    IconBasket,
    IconClipboardCheck
} from '@tabler/icons-react';
import StatCard from './StatCard';
import server from '../../assets/address.json';

interface DashboardStatsType {
    active_personnel: number;
    all_personnel: number;
    accepted_tender: number;
    all_tender: number;
    active_works: number;
    all_works: number;
    active_projects: number;
    all_projects: number;
    active_workhouses: number;
    all_workhouses: number;
    car_count: number;
    consignment_count: number;
    course_count: number;
    warhouse_items_count: number;
    store_items_count: number;
    kabullar_count: number;
}

const DashboardStats = () => {
    const [stats, setStats] = useState<DashboardStatsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            const authToken = localStorage.getItem('authToken');
            try {
                const response = await axios.get(
                    server.baseurl + server.report + 'get-dashboard-stats',
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );

                if (response.data.httpStatusCode === 200 && response.data.data) {
                    setStats(response.data.data);
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

        fetchStats();
    }, []);

    if (loading) return <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!stats) return null;

    return (
        <Box>
            {/* Grid Calculation:
               Row 1 (5 items): md={2.4}
               Row 2 (3 items): md={4}
               Row 3 (3 items): md={4}
            */}

            {/* --- ردیف اول: 5 کارت --- */}
            <Grid container spacing={3} mb={3}>

                {/* 1. Personnel */}
                <Grid item xs={12} sm={6} md={2.4}>
                    <StatCard
                        title="Personel"
                        total={stats.all_personnel}
                        active={stats.active_personnel}
                        activeLabel="Çalışanlar"
                        inactiveLabel="Ayrılanlar"
                        icon={IconUsers}
                        color="#5D87FF"

                    />
                </Grid>

                {/* 2. Workhouses */}
                <Grid item xs={12} sm={6} md={2.4}>
                    <StatCard
                        title="Şantiyeler"
                        total={stats.all_workhouses}
                        active={stats.active_workhouses}
                        activeLabel="Aktivler"
                        inactiveLabel="Kapananlar"
                        icon={IconBuildingWarehouse}
                        color="#49BEFF"
                    />
                </Grid>

                {/* 3. Projects */}
                <Grid item xs={12} sm={6} md={2.4}>
                    <StatCard
                        title="Projeler"
                        total={stats.all_projects}
                        active={stats.active_projects}
                        activeLabel="Aktivler"
                        inactiveLabel="Bitenler"
                        icon={IconTimeline}
                        color="#13DEB9"
                    />
                </Grid>

                {/* 4. Works */}
                <Grid item xs={12} sm={6} md={2.4}>
                    <StatCard
                        title="İşler"
                        total={stats.all_works}
                        active={stats.active_works}
                        activeLabel="Aktivler"
                        inactiveLabel="Bitenler"
                        icon={IconBriefcase}
                        color="#FFAE1F"
                    />
                </Grid>

                {/* 5. Tenders */}
                <Grid item xs={12} sm={6} md={2.4}>
                    <StatCard
                        title="İhaleler"
                        total={stats.all_tender}
                        active={stats.accepted_tender}
                        activeLabel="Aktivler"
                        inactiveLabel="Reddedilenler"
                        icon={IconGavel}
                        color="#FA896B"
                    />
                </Grid>
            </Grid>

            {/* --- ردیف دوم: 3 کارت --- */}
            <Grid container spacing={3} mb={3}>

                {/* 1. Cars */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Araçlar"
                        total={stats.car_count}
                        icon={IconCar}
                        color="#0074BA"
                    />
                </Grid>

                {/* 2. Consignments */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Demirbaş Sayısı"
                        total={stats.consignment_count}
                        icon={IconPackage}
                        color="#757575"
                    />
                </Grid>

                {/* 3. Courses */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Eğitimler"
                        total={stats.course_count}
                        icon={IconSchool}
                        color="#8E24AA"
                    />
                </Grid>
            </Grid>

            {/* --- ردیف سوم: 3 کارت --- */}
            <Grid container spacing={3}>

                {/* 1. Warehouse Items */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Depo Ürünleri"
                        total={stats.warhouse_items_count}
                        icon={IconBuildingStore}
                        color="#2E7D32"
                    />
                </Grid>

                {/* 2. Store Items */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Şantiye Ürünleri"
                        total={stats.store_items_count}
                        icon={IconBasket}
                        color="#D84315"
                    />
                </Grid>

                {/* 3. Kabullar */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Kabullar"
                        total={stats.kabullar_count}
                        icon={IconClipboardCheck}
                        color="#00695C"
                    />
                </Grid>

            </Grid>
        </Box>
    );
};

export default DashboardStats;