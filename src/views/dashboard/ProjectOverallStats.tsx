import { useEffect, useState, useMemo } from 'react';
import {
    Box, Grid, Paper, Typography, Stack, IconButton,
    CircularProgress, alpha, useTheme, Tooltip,
    Avatar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import server from 'src/assets/address.json';

import {
    IconChevronLeft, IconChevronRight, IconLayoutDashboard,
    IconHash, IconCircleCheck, IconCircleDot, IconPlayerPlay, IconPlayerPause,
    IconUser
} from '@tabler/icons-react';

interface ProjectOverall {
    ProjectId: string;
    ProjectName: string;
    ProjectCode: string;
    WorkhouseManager: string | null;
    PctOverall: string;
}

const MainCard = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(1),
    borderRadius: '32px',
    height: '100%',
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
    transition: 'all 0.5s ease-in-out',
}));

interface SideCardProps {
    isSelected?: boolean;
}

const SideCard = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'isSelected',
})<SideCardProps>(({ theme, isSelected }) => ({
    padding: theme.spacing(2),
    borderRadius: '20px',
    cursor: 'pointer',
    marginBottom: theme.spacing(1.5),
    border: `2px solid ${isSelected ? theme.palette.primary.main : 'transparent'}`,
    background: isSelected ? alpha(theme.palette.primary.main, 0.08) : theme.palette.background.paper,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: isSelected ? 'none' : 'translateX(-8px)',
        background: isSelected ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.05),
    }
}));

const ProgressCircle = ({ value }: { value: number }) => (
    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
        <CircularProgress
            variant="determinate"
            value={100}
            size={200}
            thickness={2}
            sx={{ color: 'rgba(255,255,255,0.2)' }}
        />
        <CircularProgress
            variant="determinate"
            value={value}
            size={200}
            thickness={5}
            sx={{
                color: '#fff',
                position: 'absolute',
                left: 0,
                strokeLinecap: 'round',
                transition: 'all 1s ease-in-out',
            }}
        />
        <Box sx={{
            top: 0, left: 0, bottom: 0, right: 0,
            position: 'absolute', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <Typography variant="h2" component="div" fontWeight="900">
                %{Math.round(value)}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>İlerleme</Typography>
        </Box>
    </Box>
);

const ProjectOverallStats = () => {
    const theme = useTheme();
    const [projects, setProjects] = useState<ProjectOverall[]>([]);
    const [selectedProject, setSelectedProject] = useState<ProjectOverall | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const pageSize = 4;

    useEffect(() => {
        const fetchData = async () => {
            const authToken = localStorage.getItem('authToken');
            const headers = { Authorization: `Bearer ${authToken}` };
            try {
                const res = await axios.get(`${server.baseurl}${server.warehouse}get-projects-overall-progress`,
                    { headers });
                const data = res.data.data || [];
                setProjects(data);
                if (data.length > 0) setSelectedProject(data[0]);
            } catch (error) {
                console.error("Fetch error", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let interval: any;
        if (isAutoPlay && projects.length > 1) {
            interval = setInterval(() => {
                setSelectedProject((current) => {
                    if (!current) return projects[0];
                    const currentIndex = projects.findIndex(p => p.ProjectId === current.ProjectId);
                    const nextIndex = (currentIndex + 1) % projects.length;

                    const nextPage = Math.floor(nextIndex / pageSize);
                    if (nextPage !== currentPage) {
                        setCurrentPage(nextPage);
                    }

                    return projects[nextIndex];
                });
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isAutoPlay, projects, currentPage]);

    const paginatedList = useMemo(() => {
        const start = currentPage * pageSize;
        return projects.slice(start, start + pageSize);
    }, [projects, currentPage]);

    const handleNext = () => {
        if ((currentPage + 1) * pageSize < projects.length) setCurrentPage(p => p + 1);
    };
    const handlePrev = () => {
        if (currentPage > 0) setCurrentPage(p => p - 1);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: '1400px', margin: '0 auto' }}>
            <Grid container spacing={4}>

                <Grid item xs={12} md={7}>
                    {selectedProject && (
                        <MainCard elevation={0}>
                            <ProgressCircle value={parseFloat(selectedProject.PctOverall || '0')} />

                            <Typography variant="h3" fontWeight="800" textAlign="center" gutterBottom>
                                {selectedProject.ProjectName}
                            </Typography>

                            <Stack spacing={2} alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.8 }}>
                                    <IconHash size={20} />
                                    <Typography variant="h6">Kod: {selectedProject.ProjectCode}</Typography>
                                </Stack>

                                <Box sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    padding: '8px 20px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    border: '1px solid rgba(255, 255, 255, 0.2)'
                                }}>
                                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                        <IconUser size={18} />
                                    </Avatar>
                                    <Typography variant="subtitle1" fontWeight="500">
                                        {selectedProject.WorkhouseManager || 'Atanmamış'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </MainCard>
                    )}
                </Grid>

                <Grid item xs={12} md={5}>
                    <Stack spacing={2} sx={{ height: '100%' }}>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="h5" fontWeight="700" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconLayoutDashboard color={theme.palette.primary.main} /> Proje Listesi
                            </Typography>

                            <Tooltip title={isAutoPlay ? "Otomatik Geçişi Durdur" : "Otomatik Geçişi Başlat"}>
                                <IconButton
                                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                                    color={isAutoPlay ? "primary" : "default"}
                                    sx={{
                                        bgcolor: isAutoPlay ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
                                        '&:hover': { bgcolor: isAutoPlay ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.grey[500], 0.2) }
                                    }}
                                >
                                    {isAutoPlay ? <IconPlayerPause size={22} /> : <IconPlayerPlay size={22} />}
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ flexGrow: 1, minHeight: '420px' }}>
                            {paginatedList.map((project) => {
                                const isSelected = selectedProject?.ProjectId === project.ProjectId;
                                return (
                                    <SideCard
                                        key={project.ProjectId}
                                        isSelected={isSelected}
                                        elevation={isSelected ? 0 : 1}
                                        onClick={() => {
                                            setSelectedProject(project);
                                            setIsAutoPlay(false);
                                        }}
                                    >
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Avatar sx={{
                                                bgcolor: isSelected ? 'primary.main' : alpha(theme.palette.primary.main, 0.1),
                                                color: isSelected ? '#fff' : 'primary.main',
                                                transition: '0.3s'
                                            }}>
                                                {isSelected ? <IconCircleDot size={24} /> : <IconCircleCheck size={24} />}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle1" fontWeight={isSelected ? "800" : "600"}>
                                                    {project.ProjectName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Kod: {project.ProjectCode}
                                                </Typography>
                                            </Box>
                                            <Typography variant="h6" color={isSelected ? "primary.main" : "text.primary"} fontWeight="bold">
                                                %{Math.round(parseFloat(project.PctOverall || '0'))}
                                            </Typography>
                                        </Stack>
                                    </SideCard>
                                );
                            })}
                        </Box>

                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="body2" fontWeight="600" color="text.secondary">
                                {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, projects.length)} / {projects.length} Proje
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <IconButton
                                    onClick={handlePrev}
                                    disabled={currentPage === 0}
                                    sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}
                                >
                                    <IconChevronLeft size={20} />
                                </IconButton>
                                <IconButton
                                    onClick={handleNext}
                                    disabled={(currentPage + 1) * pageSize >= projects.length}
                                    sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}
                                >
                                    <IconChevronRight size={20} />
                                </IconButton>
                            </Stack>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};
export default ProjectOverallStats;