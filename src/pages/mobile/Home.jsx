import { useEffect, useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';

import StatusChip from '../../components/mobile/StatusChipMobile';
import EmptyState from '../../components/mobile/EmptyStateMobile';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { todayISO, dateID, formatRupiah, TASK_TYPE_LABEL } from '../../utils/helpers';

const QUICK = [
  { path: '/app/order',  label: 'Entry Order', desc: 'Pesanan di outlet',   icon: ShoppingCartRoundedIcon, color: 'primary' },
  { path: '/app/quotes', label: 'Quotation',   desc: 'Penawaran PDF',       icon: DescriptionRoundedIcon,  color: 'info' },
  { path: '/app/audit',  label: 'Audit',       desc: 'Survey & stok',       icon: FactCheckRoundedIcon,    color: 'success' },
  { path: '/app/gps',    label: 'Rute GPS',    desc: 'Optimasi & check-in', icon: MapRoundedIcon,          color: 'warning' },
];

const HOME_REFS = [
  { path: '/app/catalog', label: 'Katalog Produk',    desc: 'Harga jual & stok',     icon: Inventory2RoundedIcon, color: 'secondary' },
  { path: '/app/billing', label: 'Billing Pelanggan', desc: 'Tagihan & piutang area', icon: PaymentsRoundedIcon,   color: 'error' },
];

export default function Home() {
  const { user } = useAuth();
  const { db } = useDb();
  const { notify, online, queueCount } = useSync();
  const navigate = useNavigate();
  const today = todayISO();

  const tasks = useMemo(
    () => db.tasks.filter((t) => t.salesId === user.salesId && t.date === today),
    [db.tasks, user.salesId, today]
  );
  const recentOrders = useMemo(
    () => [...db.orders].reverse().filter((o) => o.salesId === user.salesId).slice(0, 3),
    [db.orders, user.salesId]
  );

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const lastNotif = [...db.notifications.filter((n) => n.userId === user.id)].pop();
  const outletOf = (id) => db.outlets.find((o) => o.id === id) || {};

  const nextTask =
    tasks.find((t) => t.status === 'in_progress') || tasks.find((t) => t.status === 'pending');

  useEffect(() => {
    const flag = `sfa_morn_${user.id}_${today}`;
    if (!localStorage.getItem(flag) && tasks.length > 0) {
      localStorage.setItem(flag, '1');
      notify(user.id, 'Pengingat Jadwal (07:00 WIB)', `Anda memiliki ${tasks.length} kunjungan toko hari ini. Jangan lupa persiapkan katalog Anda!`);
    }
  }, []);

  return (
    <Stack spacing={1.5}>
      <Alert
        severity={online ? (queueCount > 0 ? 'info' : 'success') : 'warning'}
        icon={online ? <CheckCircleRoundedIcon fontSize="small" /> : <WifiOffRoundedIcon fontSize="small" />}
        sx={{ py: 0.6, '& .MuiAlert-message': { fontSize: 11.5 } }}
      >
        {online
          ? (queueCount > 0
            ? `${queueCount} data menunggu sinkronisasi — akan terkirim otomatis.`
            : 'Sinkronisasi berhasil — data tugas hari ini sudah terbaru.')
          : 'Mode offline aktif — transaksi tersimpan lokal dan tersinkron otomatis saat koneksi pulih.'}
      </Alert>

      {lastNotif && (
        <Box
          onClick={() => navigate('/app/notifications')}
          sx={{
            background: 'linear-gradient(120deg,#2563eb,#3b82f6)', color: '#fff',
            borderRadius: 2, p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start', cursor: 'pointer',
          }}
        >
          <NotificationsActiveRoundedIcon sx={{ fontSize: 18 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} sx={{ fontSize: 12.5 }}>{lastNotif.title}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: 10.5 }}>{lastNotif.body}</Typography>
          </Box>
        </Box>
      )}

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, fontSize: 9.5, display: 'block' }}>
                Progres hari ini • {dateID(today)}
              </Typography>
              <Typography variant="body2" fontWeight={800} sx={{ fontSize: 15, mt: 0.1 }}>
                {doneCount}/{tasks.length} tugas selesai
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress variant="determinate" value={pct} size={44} thickness={4} />
              <Box sx={{ inset: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" fontWeight={800} sx={{ fontSize: 10 }}>{pct}%</Typography>
              </Box>
            </Box>
          </Stack>

          {nextTask ? (
            <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: 10.5 }}>
                {nextTask.status === 'in_progress' ? 'Lanjutkan kunjungan' : 'Kunjungan berikutnya'}
              </Typography>
              <Typography fontWeight={700} noWrap sx={{ fontSize: 12.5 }}>{outletOf(nextTask.outletId).name || '-'}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: 10 }}>
                {TASK_TYPE_LABEL[nextTask.type]} • {outletOf(nextTask.outletId).address}
              </Typography>
              <Button
                fullWidth variant="contained" size="small"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate(`/app/tasks/${nextTask.id}`)}
                sx={{ mt: 1, borderRadius: 1.5, fontSize: 11.5, fontWeight: 700, px: 1, py: 0.75 }}
              >
                {nextTask.status === 'in_progress' ? 'Lanjutkan' : 'Mulai Kunjungan'}
              </Button>
            </Box>
          ) : tasks.length ? (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1.5 }}>
              <CheckCircleRoundedIcon fontSize="small" color="success" />
              <Typography variant="body2" fontWeight={700} color="success.main" sx={{ fontSize: 12 }}>
                Semua tugas hari ini selesai. Kerja bagus!
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, fontSize: 12 }}>
              Belum ada jadwal kunjungan hari ini.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        {QUICK.map((q) => (
          <Card key={q.path} elevation={0} onClick={() => navigate(q.path)}
            sx={{ cursor: 'pointer', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Avatar variant="rounded" sx={{ bgcolor: `${q.color}.main`, borderRadius: 1.5, width: 36, height: 36 }}>
                <q.icon sx={{ color: 'common.white' }} fontSize="small" />
              </Avatar>
              <Typography fontWeight={700} fontSize={12.5} sx={{ mt: 0.75 }}>{q.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{q.desc}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 13 }}>Informasi &amp; Referensi</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {HOME_REFS.map((r) => (
            <Card key={r.path} elevation={0} onClick={() => navigate(r.path)}
              sx={{ cursor: 'pointer', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Avatar variant="rounded" sx={{ bgcolor: `${r.color}.main`, borderRadius: 1.5, width: 36, height: 36 }}>
                  <r.icon sx={{ color: 'common.white' }} fontSize="small" />
                </Avatar>
                <Typography fontWeight={700} fontSize={12.5} sx={{ mt: 0.75 }}>{r.label}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{r.desc}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 13 }}>Tugas Hari Ini</Typography>
        <Link component={RouterLink} to="/app/tasks" variant="body2" underline="hover" sx={{ fontSize: 11.5 }}>Lihat Semua</Link>
      </Stack>
      {tasks.length ? tasks.slice(0, 3).map((t) => (
        <Card key={t.id} elevation={0} onClick={() => navigate(`/app/tasks/${t.id}`)}
          sx={{ cursor: 'pointer', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} fontSize={12.5} noWrap>{outletOf(t.outletId).name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10 }}>
                {TASK_TYPE_LABEL[t.type]} • {outletOf(t.outletId).address}
              </Typography>
            </Box>
            <StatusChip kind="task" status={t.status} />
          </CardContent>
        </Card>
      )) : <EmptyState message="Tidak ada tugas hari ini. Nikmati harimu!" />}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5, mb: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 13 }}>Aktivitas Terakhir</Typography>
        <Link component={RouterLink} to="/app/activity" variant="body2" underline="hover" sx={{ fontSize: 11.5 }}>Lihat Semua</Link>
      </Stack>
      {recentOrders.length ? recentOrders.map((o) => (
        <Card key={o.id} elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontFamily="monospace" fontWeight={700} fontSize={11} noWrap>{o.no}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: 9.5 }}>{outletOf(o.outletId).name} • {o.date}</Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap', fontSize: 11.5 }}>{formatRupiah(o.total)}</Typography>
              <StatusChip kind="order" status={o.status} />
            </Stack>
          </CardContent>
        </Card>
      )) : <EmptyState message="Belum ada order tercatat." />}
    </Stack>
  );
}
