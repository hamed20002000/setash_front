

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

function readRoleFromStorage(): 'admin' | 'user' | '' {
    try {
        return (localStorage.getItem('activeUserRoleName') || '') as any;
    } catch {
        return '';
    }
}

export function getSocket(): Socket {
    if (socket) return socket;

    const role = readRoleFromStorage();
    currentRole = role as any;

    const url = joinBaseAndNs(BASE_URL, NAMESPACE);
    socket = io(url, {
        ...defaultOpts,
        query: { role },
    });

    return socket;
}

export function connectIfNeeded() {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
}

export function switchRole() {
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
    currentRole = readRoleFromStorage() as any;
    return currentRole;
}
