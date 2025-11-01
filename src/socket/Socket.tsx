// // src/socket.ts
// import { io, Socket, type ManagerOptions, type SocketOptions } from 'socket.io-client';
// import raw from '../assets/address.json';

// const BASE_URL =
//     (raw as any).socketurl ??
//     '';
// debugger

// const PATH = '/socket.io';
// const NAMESPACE = '/';

// function joinBaseAndNs(base: string, ns: string) {
//     const u = base.replace(/\/+$/, '');
//     const n = ns.startsWith('/') ? ns : `/${ns}`;
//     return `${u}${n}`;
// }

// let socket: Socket | null = null;
// let currentRole: 'admin' | 'user' = 'admin';

// const defaultOpts = {
//     path: PATH,
//     transports: ['websocket', 'polling'] as string[],
//     autoConnect: false,
//     reconnection: true,
//     reconnectionAttempts: Infinity,
//     reconnectionDelay: 500,
//     reconnectionDelayMax: 5000,
//     timeout: 20000,
//     forceNew: false,
// } satisfies Partial<ManagerOptions & SocketOptions>;

// export function getSocket(role: 'admin' | 'user' = currentRole): Socket {
//     currentRole = role;
//     if (socket) return socket;

//     const url = joinBaseAndNs(BASE_URL, NAMESPACE);
//     socket = io(url, {
//         ...defaultOpts,
//         query: { role: currentRole },
//     });

//     return socket;
// }

// export function connectIfNeeded() {
//     const s = getSocket(currentRole);
//     if (!s.connected) s.connect();
//     return s;
// }

// export function switchRole(role: 'admin' | 'user') {
//     currentRole = role;
//     if (!socket) {
//         socket = getSocket(role);
//     }

//     const opts = socket!.io.opts as any;
//     opts.query = { ...(opts.query || {}), role };

//     if (socket!.connected) socket!.disconnect();
//     socket!.connect();
// }

// export function on(event: string, handler: (...args: any[]) => void) {
//     connectIfNeeded().on(event, handler);
// }
// export function off(event: string, handler: (...args: any[]) => void) {
//     socket?.off(event, handler);
// }

// export function disconnect() {
//     socket?.disconnect();
// }

// export function getCurrentRole() {
//     return currentRole;
// }


// src/socket.ts
import { io, Socket, type ManagerOptions, type SocketOptions } from 'socket.io-client';
import raw from '../assets/address.json';

const BASE_URL = (raw as any).socketurl ?? '';
const PATH = '/socket.io';
const NAMESPACE = '/';

function joinBaseAndNs(base: string, ns: string) {
    const u = base.replace(/\/+$/, '');
    const n = ns.startsWith('/') ? ns : `/${ns}`;
    return `${u}${n}`;
}

let socket: Socket | null = null;
let currentRole: 'admin' | 'user' | '' = '';

const defaultOpts = {
    path: PATH,
    transports: ['websocket', 'polling'] as string[],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: false,
} satisfies Partial<ManagerOptions & SocketOptions>;

// —— فقط این هلسپر اضافه شد
function readRoleFromStorage(): 'admin' | 'user' | '' {
    try {
        return (localStorage.getItem('activeUserRoleName') || '') as any;
    } catch {
        return '';
    }
}

export function getSocket(): Socket {
    if (socket) return socket;

    // —— نقش از localStorage
    const role = readRoleFromStorage();
    currentRole = role as any;

    const url = joinBaseAndNs(BASE_URL, NAMESPACE);
    socket = io(url, {
        ...defaultOpts,
        query: { role }, // بک‌اند از query می‌خونه
    });

    return socket;
}

export function connectIfNeeded() {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
}

export function switchRole() {
    // —— هر بار سوئیچ، نقش تازه از localStorage
    const role = readRoleFromStorage();
    currentRole = role as any;

    if (!socket) {
        socket = getSocket();
    }

    const opts = (socket!.io.opts as any) || {};
    opts.query = { ...(opts.query || {}), role };

    if (socket!.connected) socket!.disconnect();
    socket!.connect();
}

export function on(event: string, handler: (...args: any[]) => void) {
    connectIfNeeded().on(event, handler);
}
export function off(event: string, handler: (...args: any[]) => void) {
    socket?.off(event, handler);
}

export function disconnect() {
    socket?.disconnect();
}

export function getCurrentRole() {
    // —— مطمئن شیم آخرین مقدار رو برمی‌گردونیم
    currentRole = readRoleFromStorage() as any;
    return currentRole;
}
