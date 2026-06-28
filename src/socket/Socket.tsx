

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

type JwtPayload = {
    userid?: string;
    userId?: string;
    id?: string;
};

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

function readUserIdFromStorage(): string {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return '';

        const payload = token.split('.')[1];
        if (!payload) return '';

        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(base64)) as JwtPayload;
        return decoded.userid || decoded.userId || decoded.id || '';
    } catch {
        return '';
    }
}

function getSocketQuery() {
    const role = readRoleFromStorage();
    const userId = readUserIdFromStorage();
    currentRole = role as any;

    return {
        role,
        userId,
    };
}

export function getSocket(): Socket {
    
    if (socket) return socket;

    const url = joinBaseAndNs(BASE_URL, NAMESPACE);
    socket = io(url, {
        ...defaultOpts,
        query: getSocketQuery(),
    });

    return socket;
}

export function connectIfNeeded() {
    const s = getSocket();
    if (!s.connected) s.connect();
    return s;
}

export function switchRole() {
    if (!socket) {
        socket = getSocket();
    }

    const opts = (socket!.io.opts as any) || {};
    opts.query = { ...(opts.query || {}), ...getSocketQuery() };

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




export function reEstablishConnection() {
    const s = getSocket();

    const opts = (s.io.opts as any) || {};
    opts.query = { ...(opts.query || {}), ...getSocketQuery() };

    if (s.connected) s.disconnect();
    s.connect();
}
