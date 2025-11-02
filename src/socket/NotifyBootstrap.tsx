
// NotifyBootstrap.tsx
import { useEffect, useRef } from 'react';
import { useAuth } from 'src/context/AuthContext';
import { startNotifyService, switchRoleInService, stopNotifyService } from './notifyService';

export default function NotifyBootstrap() {
    const { activeRoleName } = useAuth();
    const startedRef = useRef(false);
    const prevRole = useRef<string | null>(null);

    useEffect(() => {
        if (!startedRef.current) {
            startNotifyService();       // ⬅️ نقش از localStorage
            startedRef.current = true;
            prevRole.current = activeRoleName ?? null;
        } else if (prevRole.current !== activeRoleName) {
            switchRoleInService();      // ⬅️ نقش از localStorage
            prevRole.current = activeRoleName ?? null;
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
