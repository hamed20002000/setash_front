
import { ReactNode } from 'react';
import { useAuth } from 'src/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

interface PermissionGuardProps {
    children: ReactNode;
    requiredOperationName: string;
}

const PermissionGuard = ({ children, requiredOperationName }: PermissionGuardProps) => {

    console.log(`PermissionGuard is running for: ${requiredOperationName}`);
    const { isAuth, allowedOperations, isAuthDataLoading } = useAuth();
    if (isAuthDataLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }
    if (!isAuth) {
        return <Navigate to="/auth/login" replace />;
    }
    const hasPermission = allowedOperations.some(op => op.systemOperationName === requiredOperationName);
    if (!hasPermission) {
        return <Navigate to="/auth/login" replace />;
    }
    return <>{children}</>;
};

export default PermissionGuard;
