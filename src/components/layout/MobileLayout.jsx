import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';
import WifiRoundedIcon from '@mui/icons-material/WifiRounded';

import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';

const NAV_ITEMS = [
  { path: '/app',         label: 'Beranda', icon: HomeRoundedIcon },
  { path: '/app/tasks',   label: 'Tugas',   icon: TaskAltRoundedIcon },
  { path: '/app/gps',     label: 'Rute',    icon: MapRoundedIcon },
  { path: '/app/profile', label: 'Profil',  icon: PersonRoundedIcon },
];

const CREATE_ACTIONS = [
  { path: '/app/order',  label: 'Entry Order',    desc: 'Pesanan produk di outlet', icon: ShoppingCartRoundedIcon, color: 'primary' },
  { path: '/app/quotes', label: 'Quotation',      desc: 'Penawaran harga (PDF)',    icon: DescriptionRoundedIcon,  color: 'info' },
  { path: '/app/audit',  label: 'Audit & Survey', desc: 'Checklist + stok + foto',  icon: FactCheckRoundedIcon,    color: 'success' },
];

/* Tombol navigasi bawah — pil aktif terisi, ala aplikasi native */
function NavBtn({ item, active, onClick }) {
  return (
    <ButtonBase onClick={onClick} sx={{ flexDirection: 'column', gap: 0.25, py: 1, width: '100%' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 26, borderRadius: 99,
        bgcolor: active ? 'primary.main' : 'transparent',
        transition: 'background-color .2s',
      }}>
        <item.icon sx={{ color: active ? 'common.white' : 'text.secondary' }} fontSize="small" />
      </Box>
      <Typography variant="caption" fontWeight={700} color={active ? 'primary.main' : 'text.secondary'}>
        {item.label}
      </Typography>
    </ButtonBase>
  );
}

export default function MobileLayout() {
  const { user } = useAuth();
  const { db } = useDb();
  const { online, toggleOnline, queueCount } = useSync();
  const navigate = useNavigate();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const sales = db.sales.find((s) => s.id === user.salesId);
  const area = db.areas.find((a) => a.id === sales?.areaId);
  const unread = db.notifications.filter((n) => n.userId === user.id && !n.read).length;

  const isActive = (path) =>
    path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);

  return (
    <Box
      sx={{
        maxWidth: 430, mx: 'auto', minHeight: '100vh',
        bgcolor: 'background.default', display: 'flex', flexDirection: 'column',
        borderLeft: { sm: '1px solid' }, borderRight: { sm: '1px solid' }, borderColor: 'divider',
        boxShadow: { sm: '0 0 44px rgba(15,23,42,.08)' },
      }}
    >
      {/* ===== Header ===== */}
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1, minHeight: '60px' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              Halo, {user.name.split(' ')[0]}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Sales{area ? ` • ${area.name}` : ''}
            </Typography>
          </Box>

          {/* Status koneksi / sinkronisasi (kriteria #8) */}
          <Badge color="warning" variant="dot" invisible={online && queueCount === 0}>
            <IconButton
              size="small"
              onClick={toggleOnline}
              title={online ? (queueCount ? `${queueCount} data menunggu sinkronisasi` : 'Online') : 'Offline'}
            >
              {online ? <WifiRoundedIcon fontSize="small" /> : <WifiOffRoundedIcon fontSize="small" />}
            </IconButton>
          </Badge>

          {/* Lonceng notifikasi (kriteria #36) */}
          <Badge badgeContent={unread} color="error">
            <IconButton size="small" onClick={() => navigate('/app/notifications')} title="Notifikasi">
              <NotificationsRoundedIcon fontSize="small" />
            </IconButton>
          </Badge>
        </Toolbar>
      </AppBar>

      {/* ===== Konten ===== */}
      <Box sx={{ flexGrow: 1, p: 2, pb: 12 }}>
        <Outlet />
      </Box>

      {/* ===== Bottom Navigation (fixed) ===== */}
      <Paper
        elevation={0}
        square
        sx={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, borderTop: '1px solid', borderColor: 'divider',
          zIndex: (t) => t.zIndex.appBar + 100,
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'end', pb: 'env(safe-area-inset-bottom)' }}>
          {/* 2 item kiri */}
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavBtn key={item.path} item={item} active={isActive(item.path)} onClick={() => navigate(item.path)} />
          ))}

          {/* FAB — kolom ke-3, tepat di tengah */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Fab color="primary" onClick={() => setSheetOpen(true)} sx={{ mt: -2.5 }} aria-label="Buat baru">
              <AddRoundedIcon />
            </Fab>
          </Box>

          {/* 2 item kanan */}
          {NAV_ITEMS.slice(2).map((item) => (
            <NavBtn key={item.path} item={item} active={isActive(item.path)} onClick={() => navigate(item.path)} />
          ))}
        </Box>
      </Paper>

      {/* ===== Action Sheet — bottom sheet ala aplikasi native ===== */}
      <Drawer
        anchor="bottom"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        PaperProps={{
          sx: {
            maxWidth: 430, mx: 'auto',
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            px: 2, pt: 1, pb: 3,
          },
        }}
      >
        <Box sx={{ width: 36, height: 4, borderRadius: 99, bgcolor: 'divider', mx: 'auto', mb: 1.5 }} />
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Buat Baru</Typography>
        <Stack spacing={1.25}>
          {CREATE_ACTIONS.map((a) => (
            <ButtonBase
              key={a.path}
              onClick={() => { setSheetOpen(false); navigate(a.path); }}
              sx={{ width: '100%', textAlign: 'left', p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                <Avatar variant="rounded" sx={{ bgcolor: `${a.color}.main`, borderRadius: 2, width: 42, height: 42 }}>
                  <a.icon sx={{ color: 'common.white' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={14}>{a.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.desc}</Typography>
                </Box>
                <ArrowForwardRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </Stack>
            </ButtonBase>
          ))}
        </Stack>
      </Drawer>
    </Box>
  );
}