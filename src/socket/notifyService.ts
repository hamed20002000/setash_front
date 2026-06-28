
import { getSocket, connectIfNeeded, switchRole as switchSocketRole } from './Socket';

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
    | 'project-planning-date-created'
    | 'request'
    | 'tender';

export type Noti = {
    id: string;
    title: string;
    body: string;
    at?: string;
    atISO?: string;
    type?: NotifyType;
    projectId?: string;
    warehouseId?: string;
    storeId?: string;
};

export type Role = 'admin' | 'user' | (string & {});

function toStrictRole(role: Role | undefined): 'admin' | 'user' {
    return role === 'admin' ? 'admin' : role === 'user' ? 'user' : 'admin';
}
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
    request: Noti[];
    tender: Noti[];
};

type State = {
    connected: boolean;
    role: Role;
    notis: Noti[];
    needsRefresh: boolean;
    liveUpdateCounter: number;
} & Buckets;


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
    request: [],
    tender: [],
});

const state: State = {
    connected: false,
    role: ((): Role => {
        const r = readRoleFromStorage();
        return (r === 'admin' || r === 'user') ? r : 'admin';
    })(),
    notis: [],
    needsRefresh: false,
    liveUpdateCounter: 0,
    ...emptyBuckets(),
};

type Listener = (s: Readonly<State>) => void;
const listeners = new Set<Listener>();

const MAX_ITEMS = 500;

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
        request: [...state.request],
        tender: [...state.tender],
    });


const emit = () => {
    const s = snapshot();
    state.needsRefresh = false;
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

let started = false;
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
        case 'request': state.request = cap(state.request); break;
        case 'tender': state.tender = cap(state.tender); break;
    }
}


function onNotifyEvent(eventName: NotifyType, payload: any) {
    console.log(payload, 'onNotifyEvent', eventName );
    if (!payload?.type) {
        payload.type = eventName;
    }

    if (Number(payload.recordStatus) !== 0) {
        return;
    }

    const n = toNoti(payload);

    push(payload.type as NotifyType, n);

    state.liveUpdateCounter++;

    emit();
}

function onConnect() {
    console.log('[socket] connected', {
        id: socket?.id,
        role: state.role,
        at: new Date().toISOString(),
    });
    state.connected = true;
    state.needsRefresh = true;
    emit();
}
function onDisconnect() { state.connected = false; emit(); }
function onConnectError(err: any) { console.log('connect_error', err?.message, err); }

const NOTIFY_EVENTS: NotifyType[] = [
    'order', 'invoice-to-warehouse', 'warehouse-dispatch', 'warehouse-dispatch-destruction',
    'warehouse-dispatch-between-warehouse', 'invoice-to-store', 'store-dispatch-to-project',
    'store-dispatch-to-center', 'store-dispatch-destruction-to-center', 'store-dispatch-between-store',
    'project-created', 'project-planning-created', 'project-planning-implementation-created',
    'personnel-created', 'leave-created', 'project-planning-date-created', 'request', 'tender'
];
const SERVER_NOTIFY_EVENT = 'new-notify';

function bind() {
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(SERVER_NOTIFY_EVENT, onNotifyEvent.bind(null, SERVER_NOTIFY_EVENT as NotifyType));

    NOTIFY_EVENTS.forEach(event => {
        socket.on(event, onNotifyEvent.bind(null, event));
    });
}

function unbind() {
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('connect_error', onConnectError);
    (socket as any).removeAllListeners(SERVER_NOTIFY_EVENT);

    NOTIFY_EVENTS.forEach(event => {
        (socket as any).removeAllListeners(event);
    });
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

    const roleChanged = toStrictRole(state.role) !== strict;

    if (roleChanged) {
        state.role = strict;
    }

    if (clearLists || roleChanged) {
        state.notis = [];
        Object.assign(state, emptyBuckets());
    }

    state.needsRefresh = true;
    emit();

    switchSocketRole();
}
