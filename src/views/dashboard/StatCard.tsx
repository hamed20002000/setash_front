
import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Divider, Avatar } from '@mui/material';

interface StatCardProps {
    title: string;
    total: number;
    active?: number;
    icon: any;
    color: string;
    activeLabel?: string;
    inactiveLabel?: string;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    total,
    active,
    icon: Icon,
    color,
    activeLabel = "Aktif",
    inactiveLabel = "Pasif"
}) => {

    const inactive = active !== undefined ? total - active : 0;
    const hasActiveData = active !== undefined;

    return (
        <Card sx={{
            padding: 0,
            borderBottom: `4px solid ${color}`,
            position: 'relative',
            overflow: 'hidden',
            height: '100%',

            cursor: 'pointer', // تغییر نشانگر موس به حالت کلیک

            boxShadow: '0 2px 10px rgba(0,0,0,0.05)', // سایه پیش‌فرض (اختیاری)

            '&:hover': {
                boxShadow: `0 10px 25px -5px ${color}40`,

                border: `1px solid ${color}`,
            },
            transition: 'all 0.5s ease'
        }}>
            <CardContent sx={{ p: 3, paddingBottom: '16px !important' }}>

                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={hasActiveData ? 3 : 0}>
                    <Box>
                        <Typography variant="subtitle1" color="textSecondary" fontWeight={600} mb={1}>
                            {title}
                        </Typography>
                        <Typography variant="h3" fontWeight={700}>
                            {total.toLocaleString('tr-TR')} {/* اعداد سه رقم سه رقم جدا می‌شوند */}
                        </Typography>
                    </Box>

                    {/* آیکون هم در هاور کمی بزرگ شود (اختیاری) */}
                    <Avatar variant="rounded" sx={{
                        bgcolor: color,
                        width: 48,
                        height: 48,
                        transition: 'transform 0.3s',
                        '.MuiCard-root:hover &': { transform: 'scale(1.1)' } // وقتی کارت هاور شد، آیکون بزرگ شود
                    }}>
                        <Icon size={26} color="white" />
                    </Avatar>
                </Stack>

                {hasActiveData && (
                    <>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box display="flex" flexDirection="column" alignItems="flex-start">
                                <Typography variant="caption" color="textSecondary">{activeLabel}</Typography>
                                <Typography variant="subtitle1" color="success.main" fontWeight={700}>
                                    {active}
                                </Typography>
                            </Box>
                            <Box display="flex" flexDirection="column" alignItems="flex-end">
                                <Typography variant="caption" color="textSecondary">{inactiveLabel}</Typography>
                                <Typography variant="subtitle1" color="error.main" fontWeight={700}>
                                    {inactive}
                                </Typography>
                            </Box>
                        </Stack>
                    </>
                )}

                {!hasActiveData && (
                    <Box mt={2}>
                        <Typography variant="caption" color="textSecondary">Toplam Kayıt</Typography>
                    </Box>
                )}

            </CardContent>
        </Card>
    );
};

export default StatCard;