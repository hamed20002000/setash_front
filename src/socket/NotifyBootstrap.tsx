// NotifyBootstrap.tsx
import { useEffect, useRef } from 'react';
import { useAuth } from 'src/context/AuthContext';
import { startNotifyService, switchRoleInService, stopNotifyService } from './notifyService';

export default function NotifyBootstrap() {
    const { activeRoleName } = useAuth();
    const startedRef = useRef(false);
    const prevRole = useRef<'admin' | 'user' | null>(null);

    useEffect(() => {
        const role = ((activeRoleName as 'admin' | 'user') || 'admin');

        if (!startedRef.current) {
            startNotifyService(role);
            startedRef.current = true;
            prevRole.current = role;
        } else if (prevRole.current !== role) {
            switchRoleInService(role);
            prevRole.current = role;
        }

        return () => {
            if (startedRef.current) {
                stopNotifyService({ disconnect: true });
                startedRef.current = false;
                prevRole.current = null;
            }
        };
    }, [activeRoleName]);

    return null;
}
