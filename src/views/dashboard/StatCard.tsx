import React from 'react';
import { Card, CardContent, Typography, Box, Stack, Divider, Avatar } from '@mui/material';


interface StatCardProps {
    title: string;
    total: number;
    active?: number; // اختیاری: چون برخی آیتم‌ها مثل ماشین فقط تعداد کل دارند
    icon: any;
    color: string; // رنگ آیکون و تم کارت
}

const StatCard: React.FC<StatCardProps> = ({ title, total, active, icon: Icon, color }) => {


    // محاسبه غیرفعال (اگر مقدار فعال وجود داشته باشد)
    const inactive = active !== undefined ? total - active : 0;
    const hasActiveData = active !== undefined;

    return (
        <Card sx={{ padding: 0, borderBottom: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
            <CardContent sx={{ p: 3, paddingBottom: '16px !important' }}>

                {/* بخش بالایی: آیکون و تعداد کل */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="subtitle1" color="textSecondary" fontWeight={600} mb={1}>
                            {title}
                        </Typography>
                        <Typography variant="h3" fontWeight={700}>
                            {total}
                        </Typography>
                    </Box>

                    <Avatar variant="rounded" sx={{ bgcolor: color, width: 48, height: 48 }}>
                        <Icon size={26} color="white" />
                    </Avatar>
                </Stack>

                {/* بخش پایینی: فعال و غیرفعال */}
                {hasActiveData && (
                    <>
                        <Divider sx={{ mb: 2 }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">

                            {/* قسمت فعال */}
                            <Box display="flex" flexDirection="column" alignItems="flex-start">
                                <Typography variant="caption" color="textSecondary">Aktif</Typography>
                                <Typography variant="subtitle1" color="success.main" fontWeight={700}>
                                    {active}
                                </Typography>
                            </Box>

                            {/* قسمت غیرفعال */}
                            <Box display="flex" flexDirection="column" alignItems="flex-end">
                                <Typography variant="caption" color="textSecondary">Pasif</Typography>
                                <Typography variant="subtitle1" color="error.main" fontWeight={700}>
                                    {inactive}
                                </Typography>
                            </Box>

                        </Stack>
                    </>
                )}

                {!hasActiveData && (
                    <Typography variant="caption" color="textSecondary">Toplam Kayıt</Typography>
                )}

            </CardContent>
        </Card>
    );
};

export default StatCard;