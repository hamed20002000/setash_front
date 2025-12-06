import { useEffect, useState } from 'react';
import { Grid, Box, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import {
    IconUsers,
    IconGavel, // برای Tender (مزایده/مناقصه)
    IconBriefcase, // برای Works/Projects
    IconBuildingWarehouse, // برای Workhouses
    IconCar,
    IconPackage, // برای Consignment
    IconSchool, // برای Course
    IconTimeline // برای Projects
} from '@tabler/icons-react';
import StatCard from './StatCard'; // مسیر ایمپورت را تنظیم کنید
import server from '../../assets/address.json'; // مسیر آدرس سرور

// تعریف تایپ بر اساس JSON ارسالی شما
interface DashboardStatsType {
    active_personnel: number;
    all_personnel: number;
    accepted_tender: number; // فرض بر اینکه accepted همان active است
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
                    server.baseurl + server.report + 'get-dashboard-stats', // آدرس دقیق API را چک کنید
                    { headers: { "Authorization": `Bearer ${authToken}` } }
                );
                debugger
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
            <Grid container spacing={3}>

                {/* ردیف اول: Personnel, Workhouses, Projects, Works */}

                {/* 1. Personnel */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Personel"
                        total={stats.all_personnel}
                        active={stats.active_personnel}
                        icon={IconUsers}
                        color="#5D87FF" // آبی
                    />
                </Grid>

                {/* 2. Workhouses (Şantiyeler) */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Şantiyeler"
                        total={stats.all_workhouses}
                        active={stats.active_workhouses}
                        icon={IconBuildingWarehouse}
                        color="#49BEFF" // آبی روشن
                    />
                </Grid>

                {/* 3. Projects */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Projeler"
                        total={stats.all_projects}
                        active={stats.active_projects}
                        icon={IconTimeline}
                        color="#13DEB9" // سبز دودی
                    />
                </Grid>

                {/* 4. Works (İşler) */}
                <Grid item xs={12} sm={6} md={6}>
                    <StatCard
                        title="İşler"
                        total={stats.all_works}
                        active={stats.active_works}
                        icon={IconBriefcase}
                        color="#FFAE1F" // زرد/نارنجی
                    />
                </Grid>


                {/* ردیف دوم: Tenders, Cars, Consignments, Courses */}

                {/* 5. Tenders (İhaleler) */}
                <Grid item xs={12} sm={6} md={6}>
                    <StatCard
                        title="İhaleler"
                        total={stats.all_tender}
                        active={stats.accepted_tender} // استفاده از accepted به عنوان active
                        icon={IconGavel}
                        color="#FA896B" // قرمز/صورتی
                    />
                </Grid>

                {/* 6. Cars (Araçlar) - فقط تعداد کل */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Araçlar"
                        total={stats.car_count}
                        // active={stats.car_count} // اگر می‌خواهید همه را فعال نشان دهید این خط را باز کنید
                        icon={IconCar}
                        color="#0074BA" // سرمه‌ای
                    />
                </Grid>

                {/* 7. Consignments (Zimmetler) - فقط تعداد کل */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Zimmetler"
                        total={stats.consignment_count}
                        icon={IconPackage}
                        color="#757575" // خاکستری
                    />
                </Grid>

                {/* 8. Courses (Eğitimler) - فقط تعداد کل */}
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        title="Eğitimler"
                        total={stats.course_count}
                        icon={IconSchool}
                        color="#8E24AA" // بنفش
                    />
                </Grid>

            </Grid>
        </Box>
    );
};

export default DashboardStats;