import { ReactNode } from 'react';
import { useAuth } from 'src/context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

interface PermissionGuardProps {
    children: ReactNode;
    requiredOperationName: string;
}

const PermissionGuard = ({ children, requiredOperationName }: PermissionGuardProps) => {

    const { isAuth, allowedOperations, isAuthDataLoading } = useAuth();
    const location = useLocation();

    if (isAuthDataLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuth) {

        const params = new URLSearchParams(location.search);
        const initialId = params.get('id');

        if (initialId) {

            const currentFullUrl = window.location.href;
            const encodedUrl = encodeURIComponent(currentFullUrl);

            const loginPathWithReturn = `/auth/login?url=${encodedUrl}`;

            return <Navigate to={loginPathWithReturn} replace />;
        }

        return <Navigate to="/auth/login" replace />;
    }

    const hasPermission = allowedOperations.some(op => op.systemOperationName === requiredOperationName);

    if (!hasPermission) {
        return <Navigate to="/auth/login" replace />;
    }

    return <>{children}</>;
};

export default PermissionGuard;