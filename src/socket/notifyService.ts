
// // src/socket/notifyService.ts
// import { getSocket, connectIfNeeded, switchRole as switchSocketRole } from './Socket';

// // --- انواع ---
// export type NotifyType =
//     | 'order'
//     | 'invoice-to-warehouse'
//     | 'warehouse-dispatch'
//     | 'warehouse-dispatch-destruction'
//     | 'warehouse-dispatch-between-warehouse'
//     | 'invoice-to-store'
//     | 'store-dispatch-to-project'
//     | 'store-dispatch-to-center'
//     | 'store-dispatch-destruction-to-center'
//     | 'store-dispatch-between-store'
//     | 'project-created'
//     | 'project-planning-created'
//     | 'project-planning-implementation-created'
//     | 'personnel-created'
//     | 'leave-created'
//     | 'project-planning-date-created';

// export type Noti = {
//     id: string;
//     title: string;
//     body: string;
//     at?: string;
//     atISO?: string;
//     type?: NotifyType;
//     // IDs برای ناوبری
//     projectId?: string;
//     warehouseId?: string;
//     storeId?: string;
//     // نمایش
//     projectTitle?: string;
//     // وضعیت خوانده/نخوانده
//     read?: boolean;
// };

// export type Role = 'admin' | 'user' | (string & {});

// function toStrictRole(role: Role | undefined): 'admin' | 'user' {
//     return role === 'admin' ? 'admin' : role === 'user' ? 'user' : 'admin';
// }

// type Buckets = {
//     order: Noti[];
//     invoiceToWarehouse: Noti[];
//     warehouseDispatch: Noti[];
//     warehouseDispatchDestruction: Noti[];
//     warehouseDispatchBetweenWarehouse: Noti[];
//     invoiceToStore: Noti[];
//     storeDispatchToProject: Noti[];
//     storeDispatchToCenter: Noti[];
//     storeDispatchDestructionToCenter: Noti[];
//     storeDispatchBetweenStore: Noti[];
//     projectCreated: Noti[];
//     projectPlanningCreated: Noti[];
//     projectPlanningImplementationCreated: Noti[];
//     personnelCreated: Noti[];
//     leaveCreated: Noti[];
//     projectPlanningDateCreated: Noti[];
// };

// type State = {
//     connected: boolean;
//     role: Role;
//     notis: Noti[];
// } & Buckets;

// const MAX_ITEMS = 500;
// const STORAGE_KEY = 'notify_state_v2';

// const emptyBuckets = (): Buckets => ({
//     order: [],
//     invoiceToWarehouse: [],
//     warehouseDispatch: [],
//     warehouseDispatchDestruction: [],
//     warehouseDispatchBetweenWarehouse: [],
//     invoiceToStore: [],
//     storeDispatchToProject: [],
//     storeDispatchToCenter: [],
//     storeDispatchDestructionToCenter: [],
//     storeDispatchBetweenStore: [],
//     projectCreated: [],
//     projectPlanningCreated: [],
//     projectPlanningImplementationCreated: [],
//     personnelCreated: [],
//     leaveCreated: [],
//     projectPlanningDateCreated: [],
// });

// const state: State = {
//     connected: false,
//     role: 'admin',
//     notis: [],
//     ...emptyBuckets(),
// };

// // ---------- Persist/Hydrate ----------
// function loadFromStorage() {
//     try {
//         const raw = localStorage.getItem(STORAGE_KEY);
//         if (!raw) return;
//         const parsed = JSON.parse(raw);
//         if (!parsed || typeof parsed !== 'object') return;
//         // حداقل فیلدها
//         state.notis = Array.isArray(parsed.notis) ? parsed.notis : [];
//         const buckets = emptyBuckets();
//         (Object.keys(buckets) as (keyof Buckets)[]).forEach((k) => {
//             (state as any)[k] = Array.isArray(parsed[k]) ? parsed[k] : [];
//         });
//     } catch { }
// }

// function saveToStorage() {
//     try {
//         const snapshot = {
//             notis: state.notis,
//             order: state.order,
//             invoiceToWarehouse: state.invoiceToWarehouse,
//             warehouseDispatch: state.warehouseDispatch,
//             warehouseDispatchDestruction: state.warehouseDispatchDestruction,
//             warehouseDispatchBetweenWarehouse: state.warehouseDispatchBetweenWarehouse,
//             invoiceToStore: state.invoiceToStore,
//             storeDispatchToProject: state.storeDispatchToProject,
//             storeDispatchToCenter: state.storeDispatchToCenter,
//             storeDispatchDestructionToCenter: state.storeDispatchDestructionToCenter,
//             storeDispatchBetweenStore: state.storeDispatchBetweenStore,
//             projectCreated: state.projectCreated,
//             projectPlanningCreated: state.projectPlanningCreated,
//             projectPlanningImplementationCreated: state.projectPlanningImplementationCreated,
//             personnelCreated: state.personnelCreated,
//             leaveCreated: state.leaveCreated,
//             projectPlanningDateCreated: state.projectPlanningDateCreated,
//         };
//         localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
//     } catch { }
// }

// // Pub/Sub
// type Listener = (s: Readonly<State>) => void;
// const listeners = new Set<Listener>();
// const snapshot = (): Readonly<State> =>
//     Object.freeze({
//         ...state,
//         notis: [...state.notis],
//         order: [...state.order],
//         invoiceToWarehouse: [...state.invoiceToWarehouse],
//         warehouseDispatch: [...state.warehouseDispatch],
//         warehouseDispatchDestruction: [...state.warehouseDispatchDestruction],
//         warehouseDispatchBetweenWarehouse: [...state.warehouseDispatchBetweenWarehouse],
//         invoiceToStore: [...state.invoiceToStore],
//         storeDispatchToProject: [...state.storeDispatchToProject],
//         storeDispatchToCenter: [...state.storeDispatchToCenter],
//         storeDispatchDestructionToCenter: [...state.storeDispatchDestructionToCenter],
//         storeDispatchBetweenStore: [...state.storeDispatchBetweenStore],
//         projectCreated: [...state.projectCreated],
//         projectPlanningCreated: [...state.projectPlanningCreated],
//         projectPlanningImplementationCreated: [...state.projectPlanningImplementationCreated],
//         personnelCreated: [...state.personnelCreated],
//         leaveCreated: [...state.leaveCreated],
//         projectPlanningDateCreated: [...state.projectPlanningDateCreated],
//     });
// const emit = () => {
//     const s = snapshot();
//     saveToStorage();
//     listeners.forEach((l) => l(s));
// };

// export const subscribe = (l: Listener): (() => void) => {
//     listeners.add(l);
//     l(snapshot());
//     return () => {
//         listeners.delete(l);
//     };
// };

// export const getState = () => snapshot();

// // --- init from storage before socket wiring
// loadFromStorage();

// let started = false;
// let socket = getSocket('admin');

// const toStr = (v: unknown) =>
//     v === undefined || v === null ? undefined : String(v);

// const toNoti = (payload: any): Noti => {
//     const pId = payload?.projectId ?? payload?.projectID ?? payload?.project?.id;
//     const pTitle = payload?.projectTitle ?? payload?.project?.title ?? payload?.projectName;
//     const wId = payload?.warehouseId ?? payload?.warhouseId ?? payload?.warehouseID;
//     const sId = payload?.storeId ?? payload?.storeID;

//     return {
//         id: payload?.id ?? (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
//         title: String(payload?.type ?? 'bildirim'),
//         body: `Tanımlayıcı: ${payload?.id ?? 'belirtilmemiş'}`,
//         at: new Date().toLocaleString(),
//         atISO: new Date().toISOString(),
//         type: payload?.type as NotifyType | undefined,
//         projectId: toStr(pId),
//         projectTitle: toStr(pTitle),
//         warehouseId: toStr(wId),
//         storeId: toStr(sId),
//         read: false,
//     };
// };

// function push(type: NotifyType, n: Noti) {
//     const cap = (arr: Noti[]) => [n, ...arr].slice(0, MAX_ITEMS);
//     state.notis = cap(state.notis);
//     switch (type) {
//         case 'order': state.order = cap(state.order); break;
//         case 'invoice-to-warehouse': state.invoiceToWarehouse = cap(state.invoiceToWarehouse); break;
//         case 'warehouse-dispatch': state.warehouseDispatch = cap(state.warehouseDispatch); break;
//         case 'warehouse-dispatch-destruction': state.warehouseDispatchDestruction = cap(state.warehouseDispatchDestruction); break;
//         case 'warehouse-dispatch-between-warehouse': state.warehouseDispatchBetweenWarehouse = cap(state.warehouseDispatchBetweenWarehouse); break;
//         case 'invoice-to-store': state.invoiceToStore = cap(state.invoiceToStore); break;
//         case 'store-dispatch-to-project': state.storeDispatchToProject = cap(state.storeDispatchToProject); break;
//         case 'store-dispatch-to-center': state.storeDispatchToCenter = cap(state.storeDispatchToCenter); break;
//         case 'store-dispatch-destruction-to-center': state.storeDispatchDestructionToCenter = cap(state.storeDispatchDestructionToCenter); break;
//         case 'store-dispatch-between-store': state.storeDispatchBetweenStore = cap(state.storeDispatchBetweenStore); break;
//         case 'project-created': state.projectCreated = cap(state.projectCreated); break;
//         case 'project-planning-created': state.projectPlanningCreated = cap(state.projectPlanningCreated); break;
//         case 'project-planning-implementation-created': state.projectPlanningImplementationCreated = cap(state.projectPlanningImplementationCreated); break;
//         case 'personnel-created': state.personnelCreated = cap(state.personnelCreated); break;
//         case 'leave-created': state.leaveCreated = cap(state.leaveCreated); break;
//         case 'project-planning-date-created': state.projectPlanningDateCreated = cap(state.projectPlanningDateCreated); break;
//     }
// }

// function onConnect() { state.connected = true; emit(); }
// function onDisconnect() { state.connected = false; emit(); }
// function onConnectError(err: any) { console.log('connect_error', err?.message, err); }
// function onNewNotify(payload: any) {
//     if (!payload?.type) return;
//     const n = toNoti(payload);
//     push(payload.type as NotifyType, n);
//     emit();
// }

// function bind() {
//     socket.on('connect', onConnect);
//     socket.on('disconnect', onDisconnect);
//     socket.on('connect_error', onConnectError);
//     socket.on('new-notify', onNewNotify);
// }
// function unbind() {
//     socket.off('connect', onConnect);
//     socket.off('disconnect', onDisconnect);
//     socket.off('connect_error', onConnectError);
//     socket.off('new-notify', onNewNotify);
// }

// export function startNotifyService(role: Role = 'admin') {
//     if (started) return;
//     started = true;

//     const strict = toStrictRole(role);
//     state.role = strict;

//     socket = getSocket(strict);
//     switchSocketRole(strict);

//     bind();
//     connectIfNeeded();
// }

// export function stopNotifyService({ disconnect = true }: { disconnect?: boolean } = {}) {
//     if (!started) return;
//     started = false;
//     unbind();
//     if (disconnect) socket.disconnect();
// }

// export function switchRoleInService(role: Role, { clearLists = false }: { clearLists?: boolean } = {}) {
//     const strict = toStrictRole(role);
//     if (toStrictRole(state.role) === strict) return;

//     state.role = strict;

//     if (clearLists) {
//         state.notis = [];
//         Object.assign(state, emptyBuckets());
//     }
//     emit();
//     switchSocketRole(strict);
// }

// // ---------- Helpers: mark as read ----------
// export function markAsReadByNotifIds(ids: string[]) {
//     if (!ids?.length) return;
//     const set = new Set(ids.map(String));
//     const mark = (arr: Noti[]) => arr.map(n => set.has(String(n.id)) ? { ...n, read: true } : n);
//     state.notis = mark(state.notis);
//     (Object.keys(emptyBuckets()) as (keyof Buckets)[]).forEach((k) => {
//         (state as any)[k] = mark((state as any)[k]);
//     });
//     emit();
// }

// /** علامت‌گذاری یک گروه (نوع خاص) به‌عنوان خوانده؛ اگر entityIds بدهید فقط همان‌ها خوانده می‌شوند. */
// export function markGroupAsRead(type: NotifyType, entityIds?: string[]) {
//     const bucketKey = (() => {
//         switch (type) {
//             case 'order': return 'order';
//             case 'invoice-to-warehouse': return 'invoiceToWarehouse';
//             case 'warehouse-dispatch': return 'warehouseDispatch';
//             case 'warehouse-dispatch-destruction': return 'warehouseDispatchDestruction';
//             case 'warehouse-dispatch-between-warehouse': return 'warehouseDispatchBetweenWarehouse';
//             case 'invoice-to-store': return 'invoiceToStore';
//             case 'store-dispatch-to-project': return 'storeDispatchToProject';
//             case 'store-dispatch-to-center': return 'storeDispatchToCenter';
//             case 'store-dispatch-destruction-to-center': return 'storeDispatchDestructionToCenter';
//             case 'store-dispatch-between-store': return 'storeDispatchBetweenStore';
//             case 'project-created': return 'projectCreated';
//             case 'project-planning-created': return 'projectPlanningCreated';
//             case 'project-planning-implementation-created': return 'projectPlanningImplementationCreated';
//             case 'personnel-created': return 'personnelCreated';
//             case 'leave-created': return 'leaveCreated';
//             case 'project-planning-date-created': return 'projectPlanningDateCreated';
//         }
//     })() as keyof Buckets;

//     const idsSet = new Set((entityIds ?? []).map(String));

//     const isMatch = (n: Noti) => {
//         switch (type) {
//             case 'warehouse-dispatch':
//             case 'warehouse-dispatch-destruction':
//             case 'warehouse-dispatch-between-warehouse':
//                 return !idsSet.size || (n.warehouseId && idsSet.has(String(n.warehouseId)));
//             case 'store-dispatch-to-project':
//             case 'store-dispatch-to-center':
//             case 'store-dispatch-destruction-to-center':
//             case 'store-dispatch-between-store':
//                 return !idsSet.size || (n.storeId && idsSet.has(String(n.storeId)));
//             case 'project-planning-date-created':
//                 return !idsSet.size || (n.projectId && idsSet.has(String(n.projectId)));
//             default:
//                 return true;
//         }
//     };

//     // در باکت
//     (state as any)[bucketKey] = (state as any)[bucketKey].map((n: Noti) => isMatch(n) ? { ...n, read: true } : n);
//     // در notis
//     state.notis = state.notis.map(n => (n.type === type && isMatch(n)) ? { ...n, read: true } : n);

//     emit();
// }


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
    type?: NotifyType;
    // IDs برای ناوبری
    projectId?: string;
    warehouseId?: string;
    storeId?: string;
};

export type Role = 'admin' | 'user' | (string & {});

function toStrictRole(role: Role | undefined): 'admin' | 'user' {
    return role === 'admin' ? 'admin' : role === 'user' ? 'user' : 'admin';
}

// role فقط از localStorage خوانده می‌شود (منبع حقیقت)
function readRoleFromStorage(): 'admin' | 'user' | '' {
    try {
        return (localStorage.getItem('activeUserRoleName') || '') as any;
    } catch {
        return '';
    }
}

type Buckets = {
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

type State = {
    connected: boolean;
    role: Role;
    notis: Noti[];
} & Buckets;

const MAX_ITEMS = 500;
const STORAGE_KEY = 'notify_state_v2';

const emptyBuckets = (): Buckets => ({
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
});

const state: State = {
    connected: false,
    // مقداردهی اولیه نقش از storage برای هماهنگی با سوکت
    role: ((): Role => {
        const r = readRoleFromStorage();
        return (r === 'admin' || r === 'user') ? r : 'admin';
    })(),
    notis: [],
    ...emptyBuckets(),
};

// ---------- Persist/Hydrate ----------
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        // حداقل فیلدها
        state.notis = Array.isArray(parsed.notis) ? parsed.notis : [];
        const buckets = emptyBuckets();
        (Object.keys(buckets) as (keyof Buckets)[]).forEach((k) => {
            (state as any)[k] = Array.isArray(parsed[k]) ? parsed[k] : [];
        });
    } catch { }
}

function saveToStorage() {
    try {
        const snapshot = {
            notis: state.notis,
            order: state.order,
            invoiceToWarehouse: state.invoiceToWarehouse,
            warehouseDispatch: state.warehouseDispatch,
            warehouseDispatchDestruction: state.warehouseDispatchDestruction,
            warehouseDispatchBetweenWarehouse: state.warehouseDispatchBetweenWarehouse,
            invoiceToStore: state.invoiceToStore,
            storeDispatchToProject: state.storeDispatchToProject,
            storeDispatchToCenter: state.storeDispatchToCenter,
            storeDispatchDestructionToCenter: state.storeDispatchDestructionToCenter,
            storeDispatchBetweenStore: state.storeDispatchBetweenStore,
            projectCreated: state.projectCreated,
            projectPlanningCreated: state.projectPlanningCreated,
            projectPlanningImplementationCreated: state.projectPlanningImplementationCreated,
            personnelCreated: state.personnelCreated,
            leaveCreated: state.leaveCreated,
            projectPlanningDateCreated: state.projectPlanningDateCreated,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch { }
}

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
const emit = () => {
    const s = snapshot();
    saveToStorage();
    listeners.forEach((l) => l(s));
};

export const subscribe = (l: Listener): (() => void) => {
    listeners.add(l);
    l(snapshot());
    return () => {
        listeners.delete(l);
    };
};

export const getState = () => snapshot();

// --- init from storage before socket wiring
loadFromStorage();

let started = false;
// getSocket دیگر پارامتر role نمی‌گیرد؛ خودش از storage می‌خواند
let socket = getSocket();

const toStr = (v: unknown) => (v === undefined || v === null ? undefined : String(v));

const toNoti = (payload: any): Noti => {
    const pId = payload?.projectId ?? payload?.projectID ?? payload?.project?.id;
    const wId = payload?.warehouseId ?? payload?.warhouseId ?? payload?.warehouseID;
    const sId = payload?.storeId ?? payload?.storeID;

    return {
        id: payload?.id ?? (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        title: String(payload?.type ?? 'bildirim'),
        body: `Tanımlayıcı: ${payload?.id ?? 'belirtilmemiş'}`,
        at: new Date().toLocaleString(),
        atISO: new Date().toISOString(),
        type: payload?.type as NotifyType | undefined,
        projectId: toStr(pId),
        warehouseId: toStr(wId),
        storeId: toStr(sId),
    };
};

function push(type: NotifyType, n: Noti) {
    const cap = (arr: Noti[]) => [n, ...arr].slice(0, MAX_ITEMS);
    state.notis = cap(state.notis);
    switch (type) {
        case 'order': state.order = cap(state.order); break;
        case 'invoice-to-warehouse': state.invoiceToWarehouse = cap(state.invoiceToWarehouse); break;
        case 'warehouse-dispatch': state.warehouseDispatch = cap(state.warehouseDispatch); break;
        case 'warehouse-dispatch-destruction': state.warehouseDispatchDestruction = cap(state.warehouseDispatchDestruction); break;
        case 'warehouse-dispatch-between-warehouse': state.warehouseDispatchBetweenWarehouse = cap(state.warehouseDispatchBetweenWarehouse); break;
        case 'invoice-to-store': state.invoiceToStore = cap(state.invoiceToStore); break;
        case 'store-dispatch-to-project': state.storeDispatchToProject = cap(state.storeDispatchToProject); break;
        case 'store-dispatch-to-center': state.storeDispatchToCenter = cap(state.storeDispatchToCenter); break;
        case 'store-dispatch-destruction-to-center': state.storeDispatchDestructionToCenter = cap(state.storeDispatchDestructionToCenter); break;
        case 'store-dispatch-between-store': state.storeDispatchBetweenStore = cap(state.storeDispatchBetweenStore); break;
        case 'project-created': state.projectCreated = cap(state.projectCreated); break;
        case 'project-planning-created': state.projectPlanningCreated = cap(state.projectPlanningCreated); break;
        case 'project-planning-implementation-created': state.projectPlanningImplementationCreated = cap(state.projectPlanningImplementationCreated); break;
        case 'personnel-created': state.personnelCreated = cap(state.personnelCreated); break;
        case 'leave-created': state.leaveCreated = cap(state.leaveCreated); break;
        case 'project-planning-date-created': state.projectPlanningDateCreated = cap(state.projectPlanningDateCreated); break;
    }
}

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

export function startNotifyService(_role?: Role) {
    if (started) return;
    started = true;

    const strict = toStrictRole(readRoleFromStorage());
    state.role = strict;

    socket = getSocket();
    switchSocketRole();

    bind();
    connectIfNeeded();
}

export function stopNotifyService({ disconnect = true }: { disconnect?: boolean } = {}) {
    if (!started) return;
    started = false;
    unbind();
    if (disconnect) socket.disconnect();
}

export function switchRoleInService(_role?: Role, { clearLists = false }: { clearLists?: boolean } = {}) {
    const strict = toStrictRole(readRoleFromStorage());
    if (toStrictRole(state.role) === strict) return;

    state.role = strict;

    if (clearLists) {
        state.notis = [];
        Object.assign(state, emptyBuckets());
    }
    emit();
    switchSocketRole();
}

