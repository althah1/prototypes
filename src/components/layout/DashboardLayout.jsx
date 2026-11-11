import { useEffect } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import DirectionsRunRoundedIcon from '@mui/icons-material/DirectionsRunRounded';
import DomainRoundedIcon from '@mui/icons-material/DomainRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';

import { useAuth } from '../../store/AuthContext';
import { initials, dateID, todayISO } from '../../utils/helpers';

const ALL = ['admin', 'supervisor', 'finance'];

const GROUPS = [
  { label: 'Utama', items: [
    { path: '/dashboard', label: 'Dashboard', icon: DashboardRoundedIcon, roles: ['admin', 'supervisor'] },
  ]},
  { label: 'Master Data', financeOrder: 2, items: [
    { path: '/dashboard/master/perusahaan',       label: 'Perusahaan',       icon: DomainRoundedIcon,           roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/bank',             label: 'Bank',             icon: AccountBalanceRoundedIcon,   roles: ['admin', 'supervisor', 'finance'] },
    { path: '/dashboard/master/area-kerja',       label: 'Area Kerja',       icon: MapRoundedIcon,               roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/supervisor',       label: 'Supervisor',       icon: SupervisorAccountRoundedIcon, roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/sales',            label: 'Sales',            icon: DirectionsRunRoundedIcon,     roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/outlet',           label: 'Outlet',           icon: StorefrontRoundedIcon,        roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/gudang',           label: 'Gudang',           icon: WarehouseRoundedIcon,         roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/produk',           label: 'Produk',           icon: Inventory2RoundedIcon,        roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/supplier',         label: 'Supplier',         icon: LocalShippingRoundedIcon,     roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/kategori-prospek', label: 'Kategori Prospek', icon: TrackChangesRoundedIcon,      roles: ['admin', 'supervisor'] },
    { path: '/dashboard/master/tugas',            label: 'Jenis Tugas',      icon: AssignmentRoundedIcon,        roles: ['admin', 'supervisor'] },
  ]},
  { label: 'Operasional', financeLabel: 'Referensi (Lihat)', financeOrder: 3, items: [
    { path: '/dashboard/tasks',      label: 'Otomatisasi Tugas',     icon: EventAvailableRoundedIcon, roles: ['admin', 'supervisor'] },
    { path: '/dashboard/quotations', label: 'Quotation',             icon: DescriptionRoundedIcon,    roles: ['admin', 'supervisor'] },
    { path: '/dashboard/orders',     label: 'Entry Order',           icon: ReceiptLongRoundedIcon,    roles: ['admin', 'supervisor', 'finance'] },
    { path: '/dashboard/audit',      label: 'Audit & Survey',        icon: FactCheckRoundedIcon,      roles: ['admin', 'supervisor'] },
    { path: '/dashboard/prospek',    label: 'Prospek & Klasifikasi', icon: TrackChangesRoundedIcon,   roles: ['admin', 'supervisor'] },
    { path: '/dashboard/gps',        label: 'GPS Monitoring',        icon: LocationOnRoundedIcon,     roles: ['admin', 'supervisor'] },
  ]},
  { label: 'Keuangan', financeOrder: 1, items: [
    { path: '/dashboard/billing', label: 'Billing / Invoice', icon: PaymentsRoundedIcon, roles: ALL },
  ]},
  { label: 'Lainnya', financeOrder: 4, items: [
    { path: '/dashboard/profile', label: 'Profil Pengguna', icon: PersonRoundedIcon, roles: ALL },
  ]},
];

const IDLE_MS = 60 * 60 * 1000;

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const groups = user.role === 'finance'
    ? [...GROUPS].sort((a, b) => (a.financeOrder ?? 99) - (b.financeOrder ?? 99))
    : GROUPS;

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 252,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 252,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', fontWeight: 800, width: 38, height: 38, borderRadius: 1.25 }}>
              S
            </Avatar>
            <Box>
              <Typography fontWeight={800} fontSize={15} lineHeight={1.1}>
                SFA
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Web Dashboard
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.25, py: 1 }}>
            {groups.map((g) => {
              const items = g.items.filter((i) => i.roles.includes(user.role));
              if (!items.length) return null;
              return (
                <Box key={g.label} sx={{ mb: 1 }}>
                  <Typography variant="overline" sx={{ px: 1.25, display: 'block', lineHeight: 2, color: 'text.secondary', fontWeight: 800, fontSize: '0.675rem' }}>
                    {user.role === 'finance' && g.financeLabel ? g.financeLabel : g.label}
                  </Typography>
                  <List dense disablePadding>
                    {items.map((item) => (
                      <ListItem key={item.path} disablePadding>
                        <ListItemButton
                          component={RouterLink}
                          to={item.path}
                          selected={isActive(item.path)}
                          sx={{
                            borderRadius: 1.25,
                            mb: 0.25,
                            py: 0.8,
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: '#ffffff',
                              '&:hover': { bgcolor: 'primary.dark' },
                              '& .MuiListItemIcon-root': { color: '#ffffff' },
                            },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 34, color: isActive(item.path) ? '#ffffff' : 'text.secondary' }}>
                            <item.icon fontSize="small" />
                          </ListItemIcon>
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
            <Typography variant="caption" color="text.secondary" display="block">
              SFA Prototype • Sprint 5
            </Typography>
            <Typography variant="caption" color="text.secondary">
              SMK 1 Muhammadiyah Yogyakarta
            </Typography>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" color="inherit" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 2, minHeight: '62px' }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={750} sx={{ fontSize: '0.975rem' }}>
                SFA Web Dashboard
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dateID(todayISO())}
              </Typography>
            </Box>

            <ButtonBase
              onClick={() => navigate('/dashboard/profile')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                bgcolor: 'background.default',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.25,
                px: 1.25,
                py: 0.6,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: 'action.hover', borderColor: '#cbd5e1' },
              }}
            >
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: 12, fontWeight: 800, borderRadius: 1 }}>
                {initials(user.name)}
              </Avatar>
              <Box sx={{ pr: 0.5 }}>
                <Typography variant="body2" fontWeight={700} lineHeight={1.15} fontSize={13}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.1} fontSize={11}>
                  {roleLabel}
                </Typography>
              </Box>
            </ButtonBase>

            <Tooltip title="Keluar">
              <IconButton
                onClick={() => logout('Anda telah keluar dari sistem.')}
                size="small"
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.25,
                  p: 0.75,
                  '&:hover': { bgcolor: 'action.hover', color: 'error.main' },
                }}
              >
                <LogoutRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, sm: 3 }, bgcolor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
