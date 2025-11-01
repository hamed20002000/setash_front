// // NotifyBootstrap.tsx
// import { useEffect, useRef } from 'react';
// import { useAuth } from 'src/context/AuthContext';
// import { startNotifyService, switchRoleInService, stopNotifyService } from './notifyService';

// export default function NotifyBootstrap() {
//     const { activeRoleName } = useAuth();
//     const startedRef = useRef(false);
//     const prevRole = useRef<'admin' | 'user' | null>(null);

//     useEffect(() => {
//         const role = ((activeRoleName as 'admin' | 'user') || 'admin');

//         if (!startedRef.current) {
//             startNotifyService(role);
//             startedRef.current = true;
//             prevRole.current = role;
//         } else if (prevRole.current !== role) {
//             switchRoleInService(role);
//             prevRole.current = role;
//         }

//         return () => {
//             if (startedRef.current) {
//                 stopNotifyService({ disconnect: true });
//                 startedRef.current = false;
//                 prevRole.current = null;
//             }
//         };
//     }, [activeRoleName]);

//     return null;
// }

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
