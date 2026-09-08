import { useEffect } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DomainRoundedIcon from '@mui/icons-material/DomainRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import DirectionsRunRoundedIcon from '@mui/icons-material/DirectionsRunRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

import { useAuth } from '../../store/AuthContext';
import { initials, dateID, todayISO } from '../../utils/helpers';

const ALL = ['admin', 'supervisor', 'finance'];

/* Sidebar mengikuti matriks RBAC (kriteria #5) + urutan master data BARU */
const GROUPS = [
  { label: 'Utama', items: [
    { path: '/dashboard', label: 'Dashboard', icon: DashboardRoundedIcon, roles: ALL },
  ]},
  { label: 'Master Data', items: [
    { path: '/dashboard/master/perusahaan',      label: 'Perusahaan',      icon: DomainRoundedIcon,           roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/gudang',          label: 'Gudang',          icon: WarehouseRoundedIcon,         roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/supplier',        label: 'Supplier',        icon: LocalShippingRoundedIcon,     roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/area-kerja',      label: 'Area Kerja',      icon: MapRoundedIcon,               roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/sales',           label: 'Sales',           icon: DirectionsRunRoundedIcon,     roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/supervisor',      label: 'Supervisor',      icon: SupervisorAccountRoundedIcon, roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/outlet',          label: 'Outlet',          icon: StorefrontRoundedIcon,        roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/kategori-prospek',label: 'Kategori Prospek',icon: TrackChangesRoundedIcon,      roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/tugas',           label: 'Jenis Tugas',     icon: AssignmentRoundedIcon,        roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/produk',          label: 'Produk',          icon: Inventory2RoundedIcon,        roles: ['admin', 'supervisor'] },
  ]},
  { label: 'Operasional', items: [
    { path: '/dashboard/tasks',       label: 'Otomatisasi Tugas',   icon: EventAvailableRoundedIcon,   roles: ['supervisor', 'finance'] },
    { path: '/dashboard/orders',      label: 'Entry Order',         icon: ReceiptLongRoundedIcon,      roles: ['supervisor', 'admin', 'finance'] },
    { path: '/dashboard/quotations',  label: 'Quotation',           icon: DescriptionRoundedIcon,      roles: ['supervisor', 'admin'] },
    { path: '/dashboard/audit',       label: 'Audit & Survey',      icon: FactCheckRoundedIcon,        roles: ['supervisor'] },
    { path: '/dashboard/prospek',     label: 'Prospek & Klasifikasi', icon: TrackChangesRoundedIcon,   roles: ['supervisor'] },
    { path: '/dashboard/gps',         label: 'GPS Monitoring',      icon: LocationOnRoundedIcon,       roles: ['supervisor', 'admin'] },
  ]},
  { label: 'Keuangan', items: [
    { path: '/dashboard/billing', label: 'Billing', icon: PaymentsRoundedIcon, roles: ALL },
  ]},
  { label: 'Lainnya', items: [
    { path: '/dashboard/profile', label: 'Profil Pengguna', icon: PersonRoundedIcon, roles: ALL },
  ]},
];

const IDLE_MS = 60 * 60 * 1000; /* BR-A03: sesi dashboard berakhir setelah 60 menit idle */

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  /* Idle timeout — reset timer pada setiap aktivitas (mouse/keyboard/klik/scroll) */
  useEffect(() => {
    let t;
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => logout('Sesi Anda berakhir karena tidak ada aktivitas selama 60 menit.'), IDLE_MS);
    };
    const evs = ['mousemove', 'keydown', 'click', 'scroll'];
    evs.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(t);
      evs.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [logout]);

  const isActive = (path) =>
    path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(path);

  const roleLabel = { admin: 'Administrator', supervisor: 'Supervisor', finance: 'Finance' }[user.role] || user.role;

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ===== Sidebar ===== */}
      <Drawer
        variant="permanent"
        sx={{
          width: 252, flexShrink: 0,
          '& .MuiDrawer-paper': { width: 252, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', fontWeight: 800, width: 38, height: 38 }}>S</Avatar>
            <Box>
              <Typography fontWeight={800} fontSize={15} lineHeight={1.1}>SFA</Typography>
              <Typography variant="caption" color="text.secondary">Web Dashboard</Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.25, py: 1 }}>
            {GROUPS.map((g) => {
              const items = g.items.filter((i) => i.roles.includes(user.role));
              if (!items.length) return null;
              return (
                <Box key={g.label} sx={{ mb: 1 }}>
                  <Typography variant="overline" sx={{ px: 1.25, display: 'block', lineHeight: 2, color: 'text.secondary', fontWeight: 800 }}>
                    {g.label}
                  </Typography>
                  <List dense disablePadding>
                    {items.map((item) => (
                      <ListItem key={item.path} disablePadding>
                        <ListItemButton
                          component={RouterLink}
                          to={item.path}
                          selected={isActive(item.path)}
                          sx={{
                            borderRadius: 1.5, mb: 0.25, py: 0.8,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main', color: '#fff',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: '#fff' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 34 }}><item.icon fontSize="small" /></ListItemIcon>
                          <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ p: 1.75, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" display="block">SFA Prototype • Sprint 5</Typography>
            <Typography variant="caption" color="text.secondary">SMK 1 Muhammadiyah Yogyakarta</Typography>
          </Box>
        </Box>
      </Drawer>

      {/* ===== Area utama ===== */}
      <Box sx={{ flexGrow: 1, minWidth: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" color="inherit" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>SFA Web Dashboard</Typography>
              <Typography variant="caption" color="text.secondary">{dateID(todayISO())}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 99, px: 1.25, py: 0.5 }}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 12, fontWeight: 800 }}>{initials(user.name)}</Avatar>
              <Box>
                <Typography variant="body2" fontWeight={700} lineHeight={1.1}>{user.name}</Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.1}>{roleLabel}</Typography>
              </Box>
            </Box>
            <IconButton onClick={() => logout('Anda telah keluar dari sistem.')} title="Keluar">
              <LogoutRoundedIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, overflowY: 'auto', p: 3, bgcolor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}