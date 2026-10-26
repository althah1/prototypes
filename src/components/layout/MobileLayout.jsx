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

import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
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

/* Aksi Input Baru — Murni 3 Transaksi Lapangan */
const CREATE_ACTIONS = [
  { path: '/app/order',                   label: 'Entry Order',       desc: 'Pesanan produk di outlet',        icon: ShoppingCartRoundedIcon, color: 'primary' },
  { path: '/app/quotes',                  label: 'Quotation',         desc: 'Penawaran harga resmi (PDF)',     icon: DescriptionRoundedIcon,  color: 'info' },
  { path: '/app/audit',                   label: 'Audit & Survey',    desc: 'Checklist toko, stok & foto',     icon: FactCheckRoundedIcon,    color: 'success' },
  { path: '/app/audit?tab=prospect&new=1', label: 'Prospek Baru',     desc: 'Akuisisi calon toko di lapangan', icon: AddBusinessRoundedIcon,  color: 'warning' },
];

function NavBtn({ item, active, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flexDirection: 'column',
        gap: 0.35,
        py: 1,
        width: '100%',
        borderRadius: 2,
        transition: 'all 0.18s ease-in-out',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 28,
          borderRadius: 2,
          bgcolor: active ? 'primary.light' : 'transparent',
          color: active ? 'primary.dark' : 'text.secondary',
          transition: 'all 0.2s',
        }}
      >
        <item.icon fontSize="small" />
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: active ? 750 : 600,
          fontSize: '0.675rem',
          color: active ? 'primary.main' : 'text.secondary',
          letterSpacing: '0.01em',
        }}
      >
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

  const sales = (db.sales || []).find((s) => s.id === user.salesId);
  const area = (db.areas || []).find((a) => a.id === sales?.areaId);
  const unread = (db.notifications || []).filter((n) => n.userId === user.id && !n.read).length;

  const isActive = (path) =>
    path === '/app' ? location.pathname === '/app' : location.pathname.startsWith(path);

  return (
    <Box
      sx={{
        maxWidth: 430,
        mx: 'auto',
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: { sm: '1px solid' },
        borderRight: { sm: '1px solid' },
        borderColor: 'divider',
        boxShadow: { sm: '0 8px 32px rgba(15,23,42,.06)' },
      }}
    >
      {/* Header Frosty Glass */}
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: '62px', px: 2 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ fontSize: '0.975rem', letterSpacing: '-0.01em' }}>
              Halo, {user.name.split(' ')[0]}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.725rem' }}>
              Sales Lapangan{area ? ` • ${area.name}` : ''}
            </Typography>
          </Box>

          <Badge color="warning" variant="dot" invisible={online && queueCount === 0}>
            <IconButton
              size="small"
              onClick={toggleOnline}
              title={online ? (queueCount ? `${queueCount} data menunggu sinkronisasi` : 'Koneksi Online') : 'Mode Offline'}
              sx={{ bgcolor: 'action.hover' }}
            >
              {online ? <WifiRoundedIcon fontSize="small" color="primary" /> : <WifiOffRoundedIcon fontSize="small" color="warning" />}
            </IconButton>
          </Badge>

          <Badge badgeContent={unread} color="error">
            <IconButton
              size="small"
              onClick={() => navigate('/app/notifications')}
              title="Notifikasi"
              sx={{ bgcolor: 'action.hover' }}
            >
              <NotificationsRoundedIcon fontSize="small" />
            </IconButton>
          </Badge>
        </Toolbar>
      </AppBar>

      {/* Konten Utama — Padding Horizontal Ramping ({ xs: 1.25, sm: 2 }) agar Kartu Lebih Luas di HP */}
      <Box sx={{ flexGrow: 1, px: { xs: 1.25, sm: 2 }, py: 1.75, pb: 12 }}>
        <Outlet />
      </Box>

      {/* Bottom Navigation Melayang PWA */}
      <Paper
        elevation={0}
        square
        sx={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(14px)',
          zIndex: (t) => t.zIndex.appBar + 100,
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'center', px: 0.5, py: 0.5 }}>
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavBtn key={item.path} item={item} active={isActive(item.path)} onClick={() => navigate(item.path)} />
          ))}

          {/* FAB Tambah */}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Fab
              color="primary"
              size="medium"
              onClick={() => setSheetOpen(true)}
              sx={{
                boxShadow: '0 6px 18px rgba(37,99,235,0.35)',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
              aria-label="Buat Transaksi Baru"
            >
              <AddRoundedIcon />
            </Fab>
          </Box>

          {NAV_ITEMS.slice(2).map((item) => (
            <NavBtn key={item.path} item={item} active={isActive(item.path)} onClick={() => navigate(item.path)} />
          ))}
        </Box>
      </Paper>

      {/* Action Sheet Bottom Drawer — Bersih Murni Input Transaksi */}
      <Drawer
        anchor="bottom"
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        PaperProps={{
          sx: {
            maxWidth: 430,
            mx: 'auto',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            border: '1px solid',
            borderColor: 'divider',
            px: 2,
            pt: 1.25,
            pb: 3.5,
          },
        }}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 99, bgcolor: 'divider', mx: 'auto', mb: 2 }} />
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5, fontSize: '1rem' }}>
          Input Transaksi Lapangan
        </Typography>
        <Stack spacing={1.25}>
          {CREATE_ACTIONS.map((a) => (
            <ButtonBase
              key={a.path}
              onClick={() => { setSheetOpen(false); navigate(a.path); }}
              sx={{
                width: '100%',
                textAlign: 'left',
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'all 0.18s ease-in-out',
                '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.light' },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                <Avatar variant="rounded" sx={{ bgcolor: `${a.color}.main`, borderRadius: 2, width: 42, height: 42 }}>
                  <a.icon sx={{ color: 'common.white' }} fontSize="small" />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={750} fontSize={14}>{a.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                    {a.desc}
                  </Typography>
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
