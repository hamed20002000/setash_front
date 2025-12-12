import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IconButton, Box, Badge, Menu, MenuItem, Avatar, Typography, Button, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent, Tooltip,
  CardActionArea, CircularProgress, List, ListItemButton, ListItemText,
} from '@mui/material';
import {
  IconBellRinging, IconTruck, IconTrash, IconArrowsExchange, IconFileInvoice, IconHome,
  IconBuilding, IconAlertTriangle, IconUserPlus, IconCalendarEvent, IconCalendarPlus,
  IconClipboardList, IconPackages, IconX, IconGavel,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import server from 'src/assets/address.json';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';

import {
  subscribe, type Noti, type NotifyType,
} from 'src/socket/notifyService';

type WarehouseType = {
  id: string; name: string; code: string; address: string; createAt: string;
  recordStatus: number; region?: { id: string; name: string };
};
type StoreType = {
  id: string; name: string; code: string; address: string; createAt: string;
  recordStatus: number; region?: { id: string; name: string };
};
type ProjectType = {
  id: string; title: string; startDate?: string; endDate?: string; predictEndDate?: string;
};

type To = string | ((n: Noti) => string);

// ---------- Routes ----------
const ROUTES: Record<string, (id: string | number) => string> = {
  'warehouse-dispatch': (id) => `/warehouse/list-warehouse-dispatch/${id}`,
  'warehouse-dispatch-destruction': (id) => `/warehouse/list-warehouse-dispatch-return-to-center/${id}`,
  'warehouse-dispatch-between-warehouse': (id) => `/warehousespatch/betweenwarehusedispatch/${id}`,
  'store-dispatch-to-project': (id) => `/store/store-dispatch/${id}`,
  'store-dispatch-to-center': (id) => `/store/list-store-dispatch-to-center/${id}`,
  'store-dispatch-destruction-to-center': (id) => `/store/list-store-dispatch-return-to-center/${id}`,
  'store-dispatch-between-store': (id) => `/store/between-store-dispatch/${id}`,
  'project-planning-date-created': () => `/project/project-planing-implementation/`,
  'request': (id) => `/store/list-requests/${id}`,
};

// ---------- TYPE META ----------
const TYPE_META: Record<
  NotifyType,
  { label: string; bg: any; icon: React.ReactNode; to: To }
> = {
  // نیازمند ID
  'warehouse-dispatch': {
    label: 'Depo Sevk', bg: 'info.main', icon: <IconTruck size={22} />,
    to: (n) => ROUTES['warehouse-dispatch'](String(n.warehouseId)),
  },
  'warehouse-dispatch-destruction': {
    label: 'Depoya İmha Sevk', bg: 'error.main', icon: <IconTrash size={22} />,
    to: (n) => ROUTES['warehouse-dispatch-destruction'](String(n.warehouseId)),
  },
  'warehouse-dispatch-between-warehouse': {
    label: 'Depolar Arası Sevk', bg: 'warning.main', icon: <IconArrowsExchange size={22} />,
    to: (n) => ROUTES['warehouse-dispatch-between-warehouse'](String(n.warehouseId)),
  },
  'store-dispatch-to-project': {
    label: 'Şantiyenin Depo Sevk', bg: 'info.main', icon: <IconHome size={22} />,
    to: (n) => ROUTES['store-dispatch-to-project'](String(n.storeId)),
  },
  'store-dispatch-to-center': {
    label: 'Merkez Depo Sevk', bg: 'info.main', icon: <IconBuilding size={22} />,
    to: (n) => ROUTES['store-dispatch-to-center'](String(n.storeId)),
  },
  'store-dispatch-destruction-to-center': {
    label: 'Merkez Depoya İmha Sevk', bg: 'error.main', icon: <IconTrash size={22} />,
    to: (n) => ROUTES['store-dispatch-destruction-to-center'](String(n.storeId)),
  },
  'store-dispatch-between-store': {
    label: 'Şantiyenin Depo Arası', bg: 'warning.main', icon: <IconArrowsExchange size={22} />,
    to: (n) => ROUTES['store-dispatch-between-store'](String(n.storeId)),
  },
  'project-planning-date-created': {
    label: 'Planlama Uygulama', bg: 'secondary.main', icon: <IconCalendarEvent size={22} />,
    to: (n) => ROUTES['project-planning-date-created'](String(n.projectId)),
  },

  // بدون نیاز به ID
  'order': { label: 'Satın Alma', bg: 'primary.main', icon: <IconPackages size={22} />, to: '/order/list-order/' },
  'invoice-to-warehouse': { label: 'Depo Faturaları', bg: 'secondary.main', icon: <IconFileInvoice size={22} />, to: '/invoice/list-invoice/' },
  'invoice-to-store': { label: 'Şantiye Faturaları', bg: 'secondary.main', icon: <IconFileInvoice size={22} />, to: '/invoice/list-store-invoice/' },
  'project-created': { label: 'Yeni Proje Kaydı', bg: 'success.main', icon: <IconClipboardList size={22} />, to: '/project/list-projects/' },
  'project-planning-created': { label: 'Proje Planlama', bg: 'success.main', icon: <IconCalendarPlus size={22} />, to: '/project/project-planing/' },
  'project-planning-implementation-created': { label: 'Proje Planlama Uygulama', bg: 'success.main', icon: <IconClipboardList size={22} />, to: '/project/project-planing-implementation/' },
  'personnel-created': { label: 'Yeni Personel Kaydı', bg: 'primary.main', icon: <IconUserPlus size={22} />, to: '/hr/personnal/' },
  'request': {
    label: 'Yeni Talep/Onay',
    bg: 'secondary.main',
    icon: <IconClipboardList size={22} />, // یا IconFileText / IconInbox
    to: `/store/list-requests/`, // مسیر کلی به صفحه لیست درخواست‌ها
  },
  'tender': {
    label: 'Yeni İhale', // متن نمایش داده شده
    bg: 'warning.main',  // رنگ پس‌زمینه آیکون
    icon: <IconGavel size={22} />, // آیکون
    to: '/tender/list-tender' // <--- مسیری که کاربر هدایت می‌شود
  },
  'leave-created': { label: 'Yeni İzin Kaydı', bg: 'warning.main', icon: <IconCalendarEvent size={22} />, to: '/hr/leaves/' },
};

// نوع‌هایی که ID لازم دارند (درصورت null بودن، نمایش نده)
const TYPES_NEED_ID: Record<NotifyType, 'warehouse' | 'store' | 'project' | null> = {
  'warehouse-dispatch': 'warehouse',
  'warehouse-dispatch-destruction': 'warehouse',
  'warehouse-dispatch-between-warehouse': 'warehouse',
  'store-dispatch-to-project': 'store',
  'store-dispatch-to-center': 'store',
  'store-dispatch-destruction-to-center': 'store',
  'store-dispatch-between-store': 'store',
  'project-planning-date-created': 'project',
  'order': null,
  'request': null,
  'invoice-to-warehouse': null,
  'invoice-to-store': null,
  'project-created': null,
  'project-planning-created': null,
  'project-planning-implementation-created': null,
  'personnel-created': null,
  'leave-created': null,
  'tender': null,
};

const DEFAULT_META = {
  label: 'Bildirim',
  bg: 'primary.main' as const,
  icon: <IconAlertTriangle size={22} />,
  to: '/notifications',
};

const Notifications = () => {
  const navigate = useNavigate();

  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const [items, setItems] = useState<Noti[]>([]);
  const [openAll, setOpenAll] = useState(false);

  // --- مودال انتخاب ---
  const [selectOpen, setSelectOpen] = useState(false);
  const [selectLoading, setSelectLoading] = useState(false);
  const [selectType, setSelectType] = useState<NotifyType | null>(null);
  const [selectEntityIds, setSelectEntityIds] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);

  const [liveUpdates, setLiveUpdates] = useState(0);


  // === Helper: فیلتر براساس نیاز به ID
  const shouldKeepByNeed = (n: { type?: string; warehouseId?: any; storeId?: any; projectId?: any }) => {
    const t = (n.type || 'order') as NotifyType;
    const need = TYPES_NEED_ID[t];
    if (!need) return true;
    if (need === 'warehouse') return !!n.warehouseId;
    if (need === 'store') return !!n.storeId;
    if (need === 'project') return !!n.projectId;
    return true;
  };

  const fetchOfflineNotifs = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const role = localStorage.getItem('activeUserRoleName') || '';
      if (!authToken || !role) return;

      const url = `${server.baseurl}${server.baseinfo}get-system-notification/${encodeURIComponent(role)}`;
      const resp = await axios.get(url, { headers: { Authorization: `Bearer ${authToken}` } });

      debugger


      if (resp.data?.httpStatusCode === 200 && Array.isArray(resp.data?.data)) {
        const mapped: Noti[] = resp.data.data
          // .filter((x: any) => Number(x.recordStatus) === 0)
          .filter(shouldKeepByNeed)
          .map((x: any): Noti => ({
            id: String(x.id),
            title: String(x.type ?? 'bildirim'),
            body: `Tanımlayıcı: ${x.id ?? ''}`,
            at: x.createdAt ? new Date(x.createdAt).toLocaleString() : undefined,
            atISO: x.createdAt ?? undefined,
            type: x.type as NotifyType | undefined,
            projectId: x.projectId ? String(x.projectId) : undefined,
            warehouseId: x.warehouseId ? String(x.warehouseId) : undefined,
            storeId: x.storeId ? String(x.storeId) : undefined,
          }));

        setItems(prev => {
          const byId = new Map<string, Noti>();
          for (const n of [...mapped, ...prev]) byId.set(String(n.id), n);
          const merged = Array.from(byId.values()).sort((a, b) => {
            const ta = a.atISO ? Date.parse(a.atISO) : 0;
            const tb = b.atISO ? Date.parse(b.atISO) : 0;
            return tb - ta;
          });
          return merged.slice(0, 200); // سقف منطقی
        });
      }
    } catch (e) {
      console.warn('fetchOfflineNotifs failed', e);
    }
  }, []);

  //   useEffect(() => {


  //     const unsub = subscribe((s) => {

  // if (s.liveUpdateCounter !== liveUpdates) {
  //           setLiveUpdates(s.liveUpdateCounter);
  //       }

  //       const list = s?.notis ?? [];
  //       // فیلتر براساس نیاز ID (برای همخوانی با رفتار آفلاین)
  //       const filtered = list.filter(shouldKeepByNeed);


  //       if (s.needsRefresh) {
  //         fetchOfflineNotifs();
  //       }

  //       setItems(prev => {
  //         // ادغام زنده + موجود
  //         const byId = new Map<string, Noti>();
  //         // for (const n of [...filtered, ...prev]) byId.set(String(n.id), n);
  //         for (const n of prev) byId.set(String(n.id), n);
  //         for (const n of filtered) byId.set(String(n.id), n);
  //         const merged = Array.from(byId.values()).sort((a, b) => {
  //           const ta = a.atISO ? Date.parse(a.atISO) : 0;
  //           const tb = b.atISO ? Date.parse(b.atISO) : 0;
  //           return tb - ta;
  //         });
  //         return merged.slice(0, 200);
  //       });
  //     });
  //     return () => { unsub(); };
  //   }, []);


  useEffect(() => {
    const unsub = subscribe((s) => {

      // 💡 اگر شمارنده سرویس تغییر کرد، وضعیت محلی را به‌روزرسانی کن
      // این خط ری‌رندر را تضمین می‌کند.
      if (s.liveUpdateCounter !== liveUpdates) {
        setLiveUpdates(s.liveUpdateCounter);
      }

      const list = s?.notis ?? [];

      // 💡 منطق واکشی آفلاین پس از اتصال مجدد یا تغییر نقش
      if (s.needsRefresh) {
        fetchOfflineNotifs();
      }

      // فیلتر براساس نیاز ID (برای همخوانی با رفتار آفلاین)
      const filtered = list.filter(shouldKeepByNeed);

      setItems(prev => {
        // ادغام و مرتب سازی
        const byId = new Map<string, Noti>();
        for (const n of prev) byId.set(String(n.id), n);
        for (const n of filtered) byId.set(String(n.id), n);
        const merged = Array.from(byId.values()).sort((a, b) => {
          const ta = a.atISO ? Date.parse(a.atISO) : 0;
          const tb = b.atISO ? Date.parse(b.atISO) : 0;
          return tb - ta;
        });
        return merged.slice(0, 200);
      });
    });

    // 💡 liveUpdates باید در وابستگی‌ها باشد تا اگر این مقدار تغییر کرد، useEffect دوباره اجرا شود 
    // و به آخرین مقدار liveUpdates دسترسی داشته باشد.
    return () => { unsub(); };
  }, [fetchOfflineNotifs, liveUpdates]);


  useEffect(() => { fetchOfflineNotifs(); }, [fetchOfflineNotifs]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'activeUserRoleName') fetchOfflineNotifs();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [fetchOfflineNotifs]);


  const getMeta = (t?: NotifyType) => (t && TYPE_META[t]) || DEFAULT_META;

  const groupedByType = useMemo(() => {
    const map = new Map<
      NotifyType,
      {
        notifIds: string[];
        entityIds: string[];
        sample: Noti | null;
        count: number;
        byEntity: Map<string, { count: number; notifIds: string[] }>;
      }
    >();

    for (const n of items) {
      const t = (n.type as NotifyType) ?? ('order' as NotifyType);
      if (!map.has(t)) {
        map.set(t, {
          notifIds: [],
          entityIds: [],
          sample: n,
          count: 0,
          byEntity: new Map(),
        });
      }
      const entry = map.get(t)!;
      entry.count += 1;

      if (n.id && !entry.notifIds.includes(String(n.id))) entry.notifIds.push(String(n.id));

      const need = TYPES_NEED_ID[t];
      const eid =
        need === 'warehouse' ? n.warehouseId
          : need === 'store' ? n.storeId
            : need === 'project' ? n.projectId
              : undefined;

      if (eid) {
        if (!entry.entityIds.includes(eid)) entry.entityIds.push(eid);
        const be = entry.byEntity.get(eid) ?? { count: 0, notifIds: [] };
        be.count += 1;
        if (n.id && !be.notifIds.includes(String(n.id))) be.notifIds.push(String(n.id));
        entry.byEntity.set(eid, be);
      }

      if (!entry.sample) entry.sample = n;
    }

    return Array.from(map.entries()).map(([type, v]) => ({
      type,
      ...v,
    }));
  }, [items]);

  const fetchWarehouses = useCallback(async () => {
    setSelectLoading(true);
    const authToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('activeUserRoleName') || '';
    if (!authToken) {
      navigate("/");
      setSelectLoading(false);
      return;
    }

    let requestParams = {};

    if (role.toLowerCase() !== 'admin') {
      requestParams = { rolename: role };
    }
    try {
      const res = await axios.get(server.baseurl + server.initialoperations + 'get-warehouses', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: requestParams
      });
      if (res.data?.httpStatusCode === 200) setWarehouses(res.data.data || []);
    } finally { setSelectLoading(false); }
  }, []);

  const fetchStores = useCallback(async () => {
    setSelectLoading(true);
    const authToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('activeUserRoleName') || '';
    if (!authToken) {
      navigate("/");
      return;
    }
    let requestParams = {};
    if (role.toLowerCase() !== 'admin') {
      requestParams = { rolename: role };
    }
    try {
      const res = await axios.get(server.baseurl + server.initialoperations + 'get-stores', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: requestParams
      });
      if (res.data?.httpStatusCode === 200) setStores(res.data.data || []);
    } finally { setSelectLoading(false); }
  }, []);

  const fetchProjects = useCallback(async () => {
    setSelectLoading(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const role = localStorage.getItem('activeUserRoleName') || '';
      if (!authToken) {
        navigate("/");
        return;
      }
      let requestParams = {};
      if (role.toLowerCase() !== 'admin') {
        requestParams = { rolename: role };
      }
      const res = await axios.get(server.baseurl + server.warehouse + 'get-project', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: requestParams
      });
      if (res.data?.httpStatusCode === 200) {
        const list: ProjectType[] = (res.data.data || []).map((p: any) => ({
          id: String(p.id),
          title: String(p.title ?? ''),
          startDate: p.startDate,
          endDate: p.endDate,
          predictEndDate: p.predictEndDate,
        }));
        setProjects(list);
      }
    } finally { setSelectLoading(false); }
  }, []);

  type MarkReadResp = { id: string; recordStatus?: number }[];

  const markNotisAsRead = async (type: NotifyType, notifIds?: string[]): Promise<string[]> => {
    const authToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('activeUserRoleName') || '';
    if (!authToken) return [];

    const base = server.baseurl + server.baseinfo;

    try {
      if (notifIds?.length) {
        const calls = notifIds.map((id) =>
          axios.put(
            `${base}set-system-notification-read/` + Number(id) + `/` + type + `/` + role,
            null, { headers: { Authorization: `Bearer ${authToken}` } }
          )
        );
        const results = await Promise.all(calls);

        const updatedIds = results
          .flatMap(r => (Array.isArray(r.data?.data) ? r.data.data : []))
          .filter((x: any) => Number(x.recordStatus) === 0)
          .map((x: any) => String(x.id));

        setItems(prev => prev.filter(n => !updatedIds.includes(String(n.id))));

        return updatedIds;
      } else {
        const resp = await axios.put(
          `${base}set-system-notification-read/` + type + `/` + role,
          null, { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const arr: MarkReadResp = Array.isArray(resp.data?.data) ? resp.data.data : [];

        const updatedIds = arr.filter(x => Number(x.recordStatus) === 0)
          .map(x => String(x.id));

        setItems(prev => prev.filter(n => !updatedIds.includes(String(n.id))));

        return updatedIds;
      }
    } catch (e) {
      console.warn('markNotisAsRead failed', e);
      return [];
    }
  };

  const goToTypeGroup = async (
    type: NotifyType,
    entityIds: string[],
    notifIds: string[],
    sample?: Noti | null
  ) => {
    const need = TYPES_NEED_ID[type];
    const meta = getMeta(type);

    if (!need) {
      const dest = typeof meta.to === 'function' ? meta.to(sample as Noti) : meta.to;
      await markNotisAsRead(type);
      navigate(dest, { state: { notifIds } });
      setAnchorEl2(null);
      setOpenAll(false);
      return;
    }

    setSelectType(type);
    setSelectEntityIds(entityIds);
    setSelectOpen(true);
    setAnchorEl2(null);

    setTimeout(() => {
      if (need === 'warehouse') fetchWarehouses();
      if (need === 'store') fetchStores();
      if (need === 'project') fetchProjects();
    }, 0);
  };

  const handleClick2 = (e: React.MouseEvent<HTMLElement>) => setAnchorEl2(e.currentTarget);
  const handleClose2 = () => setAnchorEl2(null);

  const totalCount = items.length;
  const chipText = totalCount > 0 ? `${totalCount} yeni` : 'Yeni yok';

  const filteredWarehouses = useMemo(
    () => warehouses.filter(w => selectEntityIds.includes(String(w.id))),
    [warehouses, selectEntityIds]
  );
  const filteredStores = useMemo(
    () => stores.filter(s => selectEntityIds.includes(String(s.id))),
    [stores, selectEntityIds]
  );
  const filteredProjects = useMemo(
    () => projects.filter(p => selectEntityIds.includes(String(p.id))),
    [projects, selectEntityIds]
  );

  const goFromSelection = async (entityId: string, notifIdsForEntity: string[] = []) => {
    if (!selectType) return;
    const meta = getMeta(selectType);
    const dest = typeof meta.to === 'function'
      ? meta.to({ warehouseId: entityId, storeId: entityId, projectId: entityId } as Noti)
      : meta.to;

    const group = groupedByType.find(g => g.type === selectType);
    const notifIds = group?.notifIds ?? [];

    await markNotisAsRead(selectType, notifIdsForEntity);
    if (selectType === 'project-planning-date-created') {
      navigate(`${dest}?projectId=${encodeURIComponent(entityId)}`, { state: { notifIds } });
    } else {
      navigate(dest, { state: { notifIds: notifIdsForEntity } });
    }
    setSelectOpen(false);
    setOpenAll(false);
    setAnchorEl2(null);
  };

  return (
    <Box>
      <IconButton
        id="notifications-button"
        size="large"
        aria-label="yeni bildirimleri göster"
        color="inherit"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl2) || undefined}
        aria-controls={anchorEl2 ? 'msgs-menu' : undefined}
        sx={{ color: anchorEl2 ? 'primary.main' : 'text.secondary' }}
        onClick={handleClick2}
      >
        <Badge variant={totalCount > 0 ? 'dot' : 'standard'} color="primary">
          <IconBellRinging size={21} stroke={1.5} />
        </Badge>
      </IconButton>

      {/* Dropdown */}
      <Menu
        id="msgs-menu"
        aria-labelledby="notifications-button"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{ '& .MuiMenu-paper': { width: 360 } }}
      >
        <Stack direction="row" py={2} px={4} justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Bildirim</Typography>
          <Chip label={chipText} color={totalCount > 0 ? 'primary' : 'default'} size="small" />
        </Stack>

        <Scrollbar sx={{ height: 385 }}>
          {groupedByType.length === 0 ? (
            <Box px={4} py={2}>
              <Typography variant="body2" color="text.secondary">Henüz bildirim yok.</Typography>
            </Box>
          ) : (
            groupedByType.map(({ type, entityIds, notifIds, sample, count }) => {
              const meta = getMeta(type);
              return (
                <Box key={type}>
                  <MenuItem sx={{ py: 2, px: 4 }} onClick={() => goToTypeGroup(type, entityIds, notifIds, sample)}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                      <Avatar sx={{ width: 48, height: 48, bgcolor: meta.bg }} variant="rounded">
                        {meta.icon}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Tooltip title={meta.label}>
                          <Typography variant="subtitle2" color="text.primary" fontWeight={600} noWrap sx={{ width: 240 }}>
                            {meta.label}
                          </Typography>
                        </Tooltip>
                      </Box>

                      <Chip size="small" label={count} color="default" />
                    </Stack>
                  </MenuItem>
                </Box>
              );
            })
          )}
        </Scrollbar>

        <Box p={3} pb={1}>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={() => {
              handleClose2();
              setOpenAll(true);
            }}
          >
            Tüm bildirimleri gör
          </Button>
        </Box>
      </Menu>

      {/* Modal: همهٔ گروه‌ها */}
      <Dialog open={openAll} onClose={() => setOpenAll(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Tüm Bildirimler</Typography>
          <IconButton onClick={() => setOpenAll(false)} aria-label="kapat"><IconX size={20} /></IconButton>
        </DialogTitle>

        <Box px={3} pb={1} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {groupedByType.map(g => (
            <Chip key={g.type} label={`${getMeta(g.type).label}: ${g.count}`} sx={{ bgcolor: 'background.default' }} size="small" />
          ))}
        </Box>

        <DialogContent dividers sx={{ p: 0 }}>
          <Scrollbar sx={{ height: 520, p: 1 }}>
            <Grid container spacing={2}>
              {groupedByType.map(({ type, entityIds, notifIds, sample, count }) => {
                const meta = getMeta(type);
                return (
                  <Grid item xs={12} sm={6} md={4} key={type}>
                    <Card variant="outlined" sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', '&:hover': { boxShadow: 3 } }}>
                      <Chip label={count} size="small" sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }} />
                      <CardActionArea onClick={() => goToTypeGroup(type, entityIds, notifIds, sample)}>
                        <CardContent sx={{ pt: 1 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ width: 44, height: 44, bgcolor: meta.bg }} variant="rounded">
                              {meta.icon}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Tooltip title={meta.label}>
                                <Typography variant="subtitle2" color="text.primary" fontWeight={700} noWrap>
                                  {meta.label}
                                </Typography>
                              </Tooltip>
                            </Box>
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Scrollbar>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenAll(false)} color="primary" variant="contained">Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Modal دوم: انتخاب Warehouse/Store/Project */}
      <Dialog open={selectOpen} onClose={() => setSelectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectType ? getMeta(selectType).label : 'Seçiniz'}
        </DialogTitle>
        <DialogContent dividers>
          {selectLoading ? (
            <Stack alignItems="center" py={3}><CircularProgress /></Stack>
          ) : (
            <>
              {(() => {
                const currentGroup = groupedByType.find(g => g.type === selectType);
                const byEntity = currentGroup?.byEntity ?? new Map<string, { count: number; notifIds: string[] }>();

                // --- Warehouse list ---
                if (selectType && ['warehouse-dispatch', 'warehouse-dispatch-destruction', 'warehouse-dispatch-between-warehouse'].includes(selectType)) {
                  return (
                    <List>
                      {filteredWarehouses.map((w) => {
                        const be = byEntity.get(String(w.id));
                        const cnt = be?.count ?? 0;
                        const entityNotifIds = be?.notifIds ?? [];
                        return (
                          <ListItemButton key={w.id} disableGutters sx={{ px: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                              <Box sx={{ minWidth: 0 }}>
                                <ListItemText
                                  primary={<Typography variant="subtitle2" noWrap>{`${w.name} (${w.code})`}</Typography>}
                                  secondary={w.address}
                                />
                              </Box>
                              {cnt > 0 && <Chip sx={{ ml: 1 }} size="small" color='success' label={cnt} />}
                              <Button variant="contained" size="small" onClick={() => goFromSelection(String(w.id), entityNotifIds)}>
                                Görüntüle
                              </Button>
                            </Stack>
                          </ListItemButton>
                        );
                      })}
                    </List>
                  );
                }

                // --- Store list ---
                if (selectType && ['store-dispatch-to-project', 'store-dispatch-to-center', 'store-dispatch-destruction-to-center', 'store-dispatch-between-store'].includes(selectType)) {
                  return (
                    <List>
                      {filteredStores.map((s) => {
                        const be = byEntity.get(String(s.id));
                        const cnt = be?.count ?? 0;
                        const entityNotifIds = be?.notifIds ?? [];
                        return (
                          <ListItemButton key={s.id} disableGutters sx={{ px: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                              <Box sx={{ minWidth: 0 }}>
                                <ListItemText
                                  primary={<Typography variant="subtitle2" noWrap>{`${s.name} (${s.code})`}</Typography>}
                                  secondary={s.address}
                                />
                              </Box>
                              {cnt > 0 && <Chip sx={{ ml: 1 }} size="small" color='success' label={cnt} />}
                              <Button variant="contained" size="small" onClick={() => goFromSelection(String(s.id), entityNotifIds)}>
                                Görüntüle
                              </Button>
                            </Stack>
                          </ListItemButton>
                        );
                      })}
                    </List>
                  );
                }

                // --- Project list ---
                if (selectType && ['project-planning-date-created'].includes(selectType)) {
                  return (
                    <List>
                      {filteredProjects.map((p) => {
                        const be = byEntity.get(String(p.id));
                        const cnt = be?.count ?? 0;
                        const entityNotifIds = be?.notifIds ?? [];
                        return (
                          <ListItemButton key={p.id} disableGutters sx={{ px: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                              <Box sx={{ minWidth: 0 }}>
                                <ListItemText
                                  primary={<Typography variant="subtitle2" noWrap>{p.title}</Typography>}
                                  secondary={[
                                    p.startDate ? `Başlangıç: ${new Date(p.startDate).toLocaleDateString('tr-TR')}` : '',
                                    p.endDate ? `Bitiş: ${new Date(p.endDate).toLocaleDateString('tr-TR')}` : '',
                                  ].filter(Boolean).join(' — ')}
                                />
                              </Box>
                              {cnt > 0 && <Chip sx={{ ml: 1 }} size="small" color='success' label={cnt} />}
                              <Button variant="contained" size="small" onClick={() => goFromSelection(String(p.id), entityNotifIds)}>
                                Görüntüle
                              </Button>
                            </Stack>
                          </ListItemButton>
                        );
                      })}
                    </List>
                  );
                }

                return <Typography color="text.secondary">Kayıt bulunamadı.</Typography>;
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Notifications;
