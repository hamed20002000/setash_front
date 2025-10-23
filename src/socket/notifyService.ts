// src/socket/notifyService.ts
import { getSocket, connectIfNeeded, switchRole as switchSocketRole } from './Socket';

// --- انواع ---
export type NotifyType =
    | 'order'
    | 'invoice-to-warehouse'
    | 'warehouse-dispatch'
    | 'warehouse-dispatch-destruction'
    | 'warehouse-dispatch-between-warehouse'
    | 'invoice-to-store'
    | 'store-dispatch-to-project'
    | 'store-dispatch-to-center'
    | 'store-dispatch-destruction-to-center'
    | 'store-dispatch-between-store'
    | 'project-created'
    | 'project-planning-created'
    | 'project-planning-implementation-created'
    | 'personnel-created'
    | 'leave-created'
    | 'project-planning-date-created';

export type Noti = {
    id: string;
    title: string;
    body: string;
    at?: string;
    atISO?: string;
    project?: string;
    type?: NotifyType;
};

// اگر جایی ممکنه role چیز دیگری باشد، این تایپ را باز نگه داریم:
export type Role = 'admin' | 'user' | (string & {});

// ---- type guard برای اطمینان قبل از اتصال سوکت ----
function toStrictRole(role: Role | undefined): 'admin' | 'user' {
    return role === 'admin' ? 'admin' : role === 'user' ? 'user' : 'admin';
}


// --- State ---
type State = {
    connected: boolean;
    role: Role;
    notis: Noti[];
    order: Noti[];
    invoiceToWarehouse: Noti[];
    warehouseDispatch: Noti[];
    warehouseDispatchDestruction: Noti[];
    warehouseDispatchBetweenWarehouse: Noti[];
    invoiceToStore: Noti[];
    storeDispatchToProject: Noti[];
    storeDispatchToCenter: Noti[];
    storeDispatchDestructionToCenter: Noti[];
    storeDispatchBetweenStore: Noti[];
    projectCreated: Noti[];
    projectPlanningCreated: Noti[];
    projectPlanningImplementationCreated: Noti[];
    personnelCreated: Noti[];
    leaveCreated: Noti[];
    projectPlanningDateCreated: Noti[];
};

const MAX_ITEMS = 500;

const state: State = {
    connected: false,
    role: 'admin',
    notis: [],
    order: [],
    invoiceToWarehouse: [],
    warehouseDispatch: [],
    warehouseDispatchDestruction: [],
    warehouseDispatchBetweenWarehouse: [],
    invoiceToStore: [],
    storeDispatchToProject: [],
    storeDispatchToCenter: [],
    storeDispatchDestructionToCenter: [],
    storeDispatchBetweenStore: [],
    projectCreated: [],
    projectPlanningCreated: [],
    projectPlanningImplementationCreated: [],
    personnelCreated: [],
    leaveCreated: [],
    projectPlanningDateCreated: [],
};

// Pub/Sub
type Listener = (s: Readonly<State>) => void;
const listeners = new Set<Listener>();
const snapshot = (): Readonly<State> =>
    Object.freeze({
        ...state,
        notis: [...state.notis],
        order: [...state.order],
        invoiceToWarehouse: [...state.invoiceToWarehouse],
        warehouseDispatch: [...state.warehouseDispatch],
        warehouseDispatchDestruction: [...state.warehouseDispatchDestruction],
        warehouseDispatchBetweenWarehouse: [...state.warehouseDispatchBetweenWarehouse],
        invoiceToStore: [...state.invoiceToStore],
        storeDispatchToProject: [...state.storeDispatchToProject],
        storeDispatchToCenter: [...state.storeDispatchToCenter],
        storeDispatchDestructionToCenter: [...state.storeDispatchDestructionToCenter],
        storeDispatchBetweenStore: [...state.storeDispatchBetweenStore],
        projectCreated: [...state.projectCreated],
        projectPlanningCreated: [...state.projectPlanningCreated],
        projectPlanningImplementationCreated: [...state.projectPlanningImplementationCreated],
        personnelCreated: [...state.personnelCreated],
        leaveCreated: [...state.leaveCreated],
        projectPlanningDateCreated: [...state.projectPlanningDateCreated],
    });
const emit = () => { const s = snapshot(); listeners.forEach(l => l(s)); };

export const subscribe = (l: Listener): (() => void) => {
    listeners.add(l);
    l(snapshot());
    return () => { listeners.delete(l); }; // cleanup باید void باشد
};

export const getState = () => snapshot();

// Socket wiring
let started = false;
let socket = getSocket('admin'); // autoConnect=false

const toNoti = (payload: any): Noti => ({
    id: payload?.id ?? (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    title: String(payload?.type ?? 'bildirim'),
    body: `Tanımlayıcı: ${payload?.id ?? 'belirtilmemiş'}`,
    at: new Date().toLocaleString(),
    atISO: new Date().toISOString(),
    project: payload?.projectName,
    type: payload?.type,
});

function push(type: NotifyType, n: Noti) {
    state.notis = [n, ...state.notis].slice(0, MAX_ITEMS);
    switch (type) {
        case 'order': state.order = [n, ...state.order].slice(0, MAX_ITEMS); break;
        case 'invoice-to-warehouse': state.invoiceToWarehouse = [n, ...state.invoiceToWarehouse].slice(0, MAX_ITEMS); break;
        case 'warehouse-dispatch': state.warehouseDispatch = [n, ...state.warehouseDispatch].slice(0, MAX_ITEMS); break;
        case 'warehouse-dispatch-destruction': state.warehouseDispatchDestruction = [n, ...state.warehouseDispatchDestruction].slice(0, MAX_ITEMS); break;
        case 'warehouse-dispatch-between-warehouse': state.warehouseDispatchBetweenWarehouse = [n, ...state.warehouseDispatchBetweenWarehouse].slice(0, MAX_ITEMS); break;
        case 'invoice-to-store': state.invoiceToStore = [n, ...state.invoiceToStore].slice(0, MAX_ITEMS); break;
        case 'store-dispatch-to-project': state.storeDispatchToProject = [n, ...state.storeDispatchToProject].slice(0, MAX_ITEMS); break;
        case 'store-dispatch-to-center': state.storeDispatchToCenter = [n, ...state.storeDispatchToCenter].slice(0, MAX_ITEMS); break;
        case 'store-dispatch-destruction-to-center': state.storeDispatchDestructionToCenter = [n, ...state.storeDispatchDestructionToCenter].slice(0, MAX_ITEMS); break;
        case 'store-dispatch-between-store': state.storeDispatchBetweenStore = [n, ...state.storeDispatchBetweenStore].slice(0, MAX_ITEMS); break;
        case 'project-created': state.projectCreated = [n, ...state.projectCreated].slice(0, MAX_ITEMS); break;
        case 'project-planning-created': state.projectPlanningCreated = [n, ...state.projectPlanningCreated].slice(0, MAX_ITEMS); break;
        case 'project-planning-implementation-created': state.projectPlanningImplementationCreated = [n, ...state.projectPlanningImplementationCreated].slice(0, MAX_ITEMS); break;
        case 'personnel-created': state.personnelCreated = [n, ...state.personnelCreated].slice(0, MAX_ITEMS); break;
        case 'leave-created': state.leaveCreated = [n, ...state.leaveCreated].slice(0, MAX_ITEMS); break;
        case 'project-planning-date-created': state.projectPlanningDateCreated = [n, ...state.projectPlanningDateCreated].slice(0, MAX_ITEMS); break;
    }
}

// handlers
function onConnect() { state.connected = true; emit(); }
function onDisconnect() { state.connected = false; emit(); }
function onConnectError(err: any) { console.log('connect_error', err?.message, err); }
function onNewNotify(payload: any) {
    if (!payload?.type) return;
    const n = toNoti(payload);
    push(payload.type as NotifyType, n);
    emit();
}

function bind() {
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('new-notify', onNewNotify);
}
function unbind() {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('connect_error', onConnectError);
    socket.off('new-notify', onNewNotify);
}

// ===== API =====
export function startNotifyService(role: Role = 'admin') {
    if (started) return;
    started = true;

    const strict = toStrictRole(role);
    state.role = strict;

    socket = getSocket(strict);     // ✅ الان تایپ با socket.ts هم‌خوان است
    switchSocketRole(strict);       // query را ست می‌کند و در صورت نیاز reconnect

    bind();
    connectIfNeeded();
}

export function stopNotifyService({ disconnect = true }: { disconnect?: boolean } = {}) {
    if (!started) return;
    started = false;
    unbind();
    if (disconnect) socket.disconnect();
}

export function switchRoleInService(role: Role, { clearLists = false }: { clearLists?: boolean } = {}) {
    const strict = toStrictRole(role);
    if (toStrictRole(state.role) === strict) return;

    state.role = strict;

    if (clearLists) {
        state.notis = [];
        state.order = [];
        state.invoiceToWarehouse = [];
        state.warehouseDispatch = [];
        state.warehouseDispatchDestruction = [];
        state.warehouseDispatchBetweenWarehouse = [];
        state.invoiceToStore = [];
        state.storeDispatchToProject = [];
        state.storeDispatchToCenter = [];
        state.storeDispatchDestructionToCenter = [];
        state.storeDispatchBetweenStore = [];
        state.projectCreated = [];
        state.projectPlanningCreated = [];
        state.projectPlanningImplementationCreated = [];
        state.personnelCreated = [];
        state.leaveCreated = [];
        state.projectPlanningDateCreated = [];
    }
    emit();

    switchSocketRole(strict); // ✅ فقط admin/user به socket.ts می‌رسد
}
