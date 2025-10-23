import React, { useEffect, useMemo, useState } from 'react';
import {
  IconButton, Box, Badge, Menu, MenuItem, Avatar, Typography, Button, Chip, Stack,
} from '@mui/material';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { Link } from 'react-router-dom';
import {
  IconBellRinging, IconTruck, IconTrash, IconArrowsExchange, IconFileInvoice, IconHome,
  IconBuilding, IconAlertTriangle, IconUserPlus, IconCalendarEvent, IconCalendarPlus,
  IconClipboardList, IconPackages,
} from '@tabler/icons-react';

// سرویس نوتیف
import { subscribe, type Noti, type NotifyType } from '../../../../socket/notifyService';

const TYPE_META: Record<
  NotifyType,
  {
    label: string;
    bg: 'primary.main' | 'secondary.main' | 'success.main' | 'warning.main' | 'error.main' | 'info.main';
    icon: React.ReactNode;
  }
> = {
  'order': { label: 'Order', bg: 'primary.main', icon: <IconPackages size={22} /> },
  'invoice-to-warehouse': { label: 'Invoice → Warehouse', bg: 'secondary.main', icon: <IconFileInvoice size={22} /> },
  'warehouse-dispatch': { label: 'Warehouse Dispatch', bg: 'info.main', icon: <IconTruck size={22} /> },
  'warehouse-dispatch-destruction': { label: 'Warehouse Destruction', bg: 'error.main', icon: <IconTrash size={22} /> },
  'warehouse-dispatch-between-warehouse': { label: 'Warehouse ↔ Warehouse', bg: 'warning.main', icon: <IconArrowsExchange size={22} /> },
  'invoice-to-store': { label: 'Invoice → Store', bg: 'secondary.main', icon: <IconFileInvoice size={22} /> },
  'store-dispatch-to-project': { label: 'Store → Project', bg: 'info.main', icon: <IconHome size={22} /> },
  'store-dispatch-to-center': { label: 'Store → Center', bg: 'info.main', icon: <IconBuilding size={22} /> },
  'store-dispatch-destruction-to-center': { label: 'Store Destruction → Center', bg: 'error.main', icon: <IconTrash size={22} /> },
  'store-dispatch-between-store': { label: 'Store ↔ Store', bg: 'warning.main', icon: <IconArrowsExchange size={22} /> },
  'project-created': { label: 'Project Created', bg: 'success.main', icon: <IconClipboardList size={22} /> },
  'project-planning-created': { label: 'Planning Created', bg: 'success.main', icon: <IconCalendarPlus size={22} /> },
  'project-planning-implementation-created': { label: 'Planning Implementation', bg: 'success.main', icon: <IconClipboardList size={22} /> },
  'personnel-created': { label: 'Personnel Created', bg: 'primary.main', icon: <IconUserPlus size={22} /> },
  'leave-created': { label: 'Leave Created', bg: 'warning.main', icon: <IconCalendarEvent size={22} /> },
  'project-planning-date-created': { label: 'Planning Date Created', bg: 'secondary.main', icon: <IconCalendarEvent size={22} /> },
};

const DEFAULT_META = {
  label: 'Bildirim',
  bg: 'primary.main' as const,
  icon: <IconAlertTriangle size={22} />,
};

const Notifications = () => {
  const [anchorEl2, setAnchorEl2] = useState<null | HTMLElement>(null);
  const [items, setItems] = useState<Noti[]>([]);

  useEffect(() => {
    const unsub = subscribe((s: any) => {
      const list = (s?.notis ?? s?.all ?? []) as Noti[];
      setItems(Array.isArray(list) ? list : []);
    });

    return () => { unsub(); }; // ⬅️ نتیجه‌ی unsub را برنگردان؛ فقط صداش بزن
  }, []);


  const handleClick2 = (event: any) => setAnchorEl2(event.currentTarget);
  const handleClose2 = () => setAnchorEl2(null);

  const count = items?.length ?? 0;
  const chipText = useMemo(() => (count > 0 ? `${count} new` : 'No new'), [count]);

  return (
    <Box>
      <IconButton
        size="large"
        aria-label="yeni bildirimleri göster"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{ color: anchorEl2 ? 'primary.main' : 'text.secondary' }}
        onClick={handleClick2}
      >
        <Badge variant={count > 0 ? 'dot' : 'standard'} color="primary">
          <IconBellRinging size="21" stroke="1.5" />
        </Badge>
      </IconButton>

      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{ '& .MuiMenu-paper': { width: '360px' } }}
      >
        <Stack direction="row" py={2} px={4} justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Bildirim</Typography>
          <Chip label={chipText} color={count > 0 ? 'primary' : 'default'} size="small" />
        </Stack>

        <Scrollbar sx={{ height: '385px' }}>
          {count === 0 ? (
            <Box px={4} py={2}>
              <Typography variant="body2" color="text.secondary">
                Henüz bildirim yok.
              </Typography>

            </Box>
          ) : (
            items.map((n, index) => {
              const meta = (n.type && TYPE_META[n.type]) || DEFAULT_META;

              // زمان: at یا atISO
              const timeText =
                (n as any).at ??
                ((n as any).atISO ? new Date((n as any).atISO).toLocaleString() : '');

              return (
                <Box key={n.id ?? index}>
                  <MenuItem sx={{ py: 2, px: 4 }}>
                    <Stack direction="row" spacing={2}>
                      <Avatar
                        sx={{ width: 48, height: 48, bgcolor: meta.bg }}
                        variant="rounded"
                      >
                        {meta.icon}
                      </Avatar>

                      <Box>
                        <Typography
                          variant="subtitle2"
                          color="textPrimary"
                          fontWeight={600}
                          noWrap
                          sx={{ width: '240px' }}
                          title={meta.label}
                        >
                          {meta.label}
                          {n.project ? ` — ${n.project}` : ''}
                        </Typography>

                        <Typography
                          color="textSecondary"
                          variant="subtitle2"
                          noWrap
                          sx={{ width: '240px' }}
                          title={n.body}
                        >
                          {n.body}
                        </Typography>

                        <Typography
                          color="text.disabled"
                          variant="caption"
                          sx={{ display: 'block', mt: 0.5 }}
                          title={timeText}
                        >
                          {timeText}
                        </Typography>
                      </Box>
                    </Stack>
                  </MenuItem>
                </Box>
              );
            })
          )}
        </Scrollbar>

        <Box p={3} pb={1}>
          <Button to="/apps/email" variant="outlined" component={Link} color="primary" fullWidth>
            Tüm bildirimleri gör
          </Button>

        </Box>
      </Menu>
    </Box>
  );
};

export default Notifications;

// import React, { useEffect, useState } from 'react';
// import {
//   IconButton, Box, Avatar, Typography, Button, Tooltip, Menu
// } from '@mui/material';
// import { IconTruck, IconFileInvoice, IconAlertTriangle, IconPackages, IconHome, IconBuilding, IconTrash, IconArrowsExchange, IconUserPlus, IconCalendarEvent, IconClipboardList } from '@tabler/icons-react';
// import { subscribe, type Noti, type NotifyType } from '../../../../socket/notifyService';

// const TYPE_META: Record<
//   NotifyType,
//   {
//     label: string;
//     bg: 'primary.main' | 'secondary.main' | 'success.main' | 'warning.main' | 'error.main' | 'info.main';
//     icon: React.ReactNode;
//   }
// > = {
//   'order': { label: 'Order', bg: 'primary.main', icon: <IconPackages size={22} /> },
//   'invoice-to-warehouse': { label: 'Invoice → Warehouse', bg: 'secondary.main', icon: <IconFileInvoice size={22} /> },
//   'warehouse-dispatch': { label: 'Warehouse Dispatch', bg: 'info.main', icon: <IconTruck size={22} /> },
//   'warehouse-dispatch-destruction': { label: 'Warehouse Destruction', bg: 'error.main', icon: <IconTrash size={22} /> },
//   'warehouse-dispatch-between-warehouse': { label: 'Warehouse ↔ Warehouse', bg: 'warning.main', icon: <IconArrowsExchange size={22} /> },
//   'invoice-to-store': { label: 'Invoice → Store', bg: 'secondary.main', icon: <IconFileInvoice size={22} /> },
//   'store-dispatch-to-project': { label: 'Store → Project', bg: 'info.main', icon: <IconHome size={22} /> },
//   'store-dispatch-to-center': { label: 'Store → Center', bg: 'info.main', icon: <IconBuilding size={22} /> },
//   'store-dispatch-destruction-to-center': { label: 'Store Destruction → Center', bg: 'error.main', icon: <IconTrash size={22} /> },
//   'store-dispatch-between-store': { label: 'Store ↔ Store', bg: 'warning.main', icon: <IconArrowsExchange size={22} /> },
//   'project-created': { label: 'Project Created', bg: 'success.main', icon: <IconClipboardList size={22} /> },
//   'project-planning-created': { label: 'Planning Created', bg: 'success.main', icon: <IconCalendarEvent size={22} /> },
//   'project-planning-implementation-created': { label: 'Planning Implementation', bg: 'success.main', icon: <IconClipboardList size={22} /> },
//   'personnel-created': { label: 'Personnel Created', bg: 'primary.main', icon: <IconUserPlus size={22} /> },
//   'leave-created': { label: 'Leave Created', bg: 'warning.main', icon: <IconCalendarEvent size={22} /> },
//   'project-planning-date-created': { label: 'Planning Date Created', bg: 'secondary.main', icon: <IconCalendarEvent size={22} /> },
// };

// const DEFAULT_META = {
//   label: 'Bildirim',
//   bg: 'primary.main' as const,
//   icon: <IconAlertTriangle size={22} />,
// };

// const Notifications = () => {
//   const [items, setItems] = useState<Noti[]>([]);
//   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // کنترل نمایش منو نوتیفیکیشن‌ها

//   useEffect(() => {
//     const unsub = subscribe((s: any) => {
//       const list = (s?.notis ?? s?.all ?? []) as Noti[];
//       setItems(Array.isArray(list) ? list : []);
//     });

//     return () => { unsub(); }; // پاک کردن اشتراک
//   }, []);

//   const handleClick = (event: React.MouseEvent<HTMLElement>, _id: number) => {
//     setAnchorEl((prevAnchorEl) => (prevAnchorEl ? null : event.currentTarget));
//   };

//   const handleClose = () => setAnchorEl(null);

//   return (
//     <Box sx={{ display: 'flex', gap: 2 }}>
//       {items.length === 0 ? (
//         <Typography variant="body2" color="text.secondary">
//           No new notifications.
//         </Typography>
//       ) : (
//         items.map((n, index) => {
//           const meta = (n.type && TYPE_META[n.type]) || DEFAULT_META;
//           const timeText = (n as any).at ?? ((n as any).atISO ? new Date((n as any).atISO).toLocaleString() : '');

//           return (
//             <Box key={n.id ?? index}>
//               <Tooltip title={meta.label} placement="top">
//                 <IconButton onClick={(event) => handleClick(event, Number(n.id ?? index))} sx={{ padding: 0 }}>
//                   <Avatar sx={{ bgcolor: 'transparent', color: meta.bg, width: 48, height: 48 }} variant="rounded">
//                     {meta.icon}
//                   </Avatar>
//                 </IconButton>
//               </Tooltip>

//               <Menu
//                 anchorEl={anchorEl}
//                 open={Boolean(anchorEl)}
//                 onClose={handleClose}
//                 anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
//                 transformOrigin={{ horizontal: 'right', vertical: 'top' }}
//                 sx={{ '& .MuiMenu-paper': { width: '300px' } }}
//               >
//                 <Box sx={{ padding: 2 }}>
//                   <Typography variant="subtitle2" color="textPrimary" fontWeight={600}>
//                     {meta.label} {n.project ? `— ${n.project}` : ''}
//                   </Typography>
//                   <Typography color="textSecondary" variant="body2" sx={{ marginBottom: 1 }}>
//                     {n.body}
//                   </Typography>
//                   <Typography color="text.disabled" variant="caption" sx={{ display: 'block', marginTop: 0.5 }}>
//                     {timeText}
//                   </Typography>
//                   <Button variant="contained" color="secondary" size="small" sx={{ marginTop: 1 }}>
//                     Action
//                   </Button>
//                 </Box>
//               </Menu>
//             </Box>
//           );
//         })
//       )}
//     </Box>
//   );
// };

// export default Notifications;
