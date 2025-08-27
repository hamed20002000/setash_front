// src/components/PermissionGuard.tsx

import { ReactNode } from 'react';
import { useAuth } from 'src/context/AuthContext';
// ✅ استفاده از کامپوننت Navigate به جای useNavigate هوک
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

interface PermissionGuardProps {
    children: ReactNode;
    requiredOperationName: string;
}

const PermissionGuard = ({ children, requiredOperationName }: PermissionGuardProps) => {
    const { isAuth, allowedOperations, isAuthDataLoading } = useAuth();
    // مرحله ۱: اگر اطلاعات در حال بارگذاری است، یک لودر نمایش دهید
    if (isAuthDataLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }
    debugger
    // مرحله ۲: بعد از بارگذاری، ابتدا وضعیت احراز هویت را بررسی کنید
    if (!isAuth) {
        // اگر کاربر احراز هویت نشده، او را به صفحه ورود هدایت کنید
        return <Navigate to="/auth/login" replace />;
    }
    debugger
    // مرحله ۳: سپس دسترسی خاص به عملیات را بررسی کنید
    const hasPermission = allowedOperations.some(op => op.systemOperationName === requiredOperationName);
    if (!hasPermission) {
        // اگر کاربر دسترسی ندارد، او را به صفحه ورود یا یک صفحه خطای دسترسی هدایت کنید
        // اگر می‌خواهید به صفحه "دسترسی غیرمجاز" هدایت کنید، آدرس آن را اینجا قرار دهید
        return <Navigate to="/auth/login" replace />;
    }

    // مرحله ۴: اگر همه بررسی‌ها موفق بودند، محتوای صفحه را نمایش دهید
    return <>{children}</>;
};

export default PermissionGuard;