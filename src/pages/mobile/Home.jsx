import { useEffect, useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';

import StatusChip from '../../components/ui/StatusChip';
import EmptyState from '../../components/ui/EmptyState';
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

export default function Home() {
  const { user } = useAuth();
  const { db } = useDb();
  const { notify } = useSync();
  const navigate = useNavigate();
  const today = todayISO();

  /* Keringanan: daftar besar hanya dihitung ulang jika tabel terkait berubah */
  const tasks = useMemo(
    () => db.tasks.filter((t) => t.salesId === user.salesId && t.date === today),
    [db.tasks, user.salesId, today]
  );
  const ordersToday = useMemo(
    () => db.orders.filter((o) => o.salesId === user.salesId && o.date === today),
    [db.orders, user.salesId, today]
  );
  const recentOrders = useMemo(
    () => [...db.orders].reverse().filter((o) => o.salesId === user.salesId).slice(0, 3),
    [db.orders, user.salesId]
  );

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const lastNotif = [...db.notifications.filter((n) => n.userId === user.id)].pop();
  const outletOf = (id) => db.outlets.find((o) => o.id === id) || {};

  /* Kunjungan berikutnya: yang sedang berjalan didahulukan, lalu yang belum mulai */
  const nextTask =
    tasks.find((t) => t.status === 'in_progress') || tasks.find((t) => t.status === 'pending');

  /* Simulasi notifikasi pagi otomatis 07:00 (cron — kriteria #36), sekali per hari */
  useEffect(() => {
    const flag = `sfa_morn_${user.id}_${today}`;
    if (!localStorage.getItem(flag) && tasks.length > 0) {
      localStorage.setItem(flag, '1');
      notify(user.id, 'Pengingat Jadwal (07:00 WIB)', `Anda memiliki ${tasks.length} kunjungan toko hari ini. Jangan lupa persiapkan katalog Anda!`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack spacing={2}>
      {/* Banner notifikasi terbaru */}
      {lastNotif && (
        <Box
          onClick={() => navigate('/app/notifications')}
          sx={{
            background: 'linear-gradient(120deg,#2563eb,#3b82f6)', color: '#fff',
            borderRadius: 2.5, p: 2, display: 'flex', gap: 1.25, alignItems: 'flex-start', cursor: 'pointer',
          }}
        >
          <NotificationsActiveRoundedIcon />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700}>{lastNotif.title}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>{lastNotif.body}</Typography>
          </Box>
        </Box>
      )}

      {/* ===== Kartu progres hari ini (hero) ===== */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, fontSize: 10.5, display: 'block' }}>
                Progres hari ini • {dateID(today)}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
                {doneCount}/{tasks.length} tugas selesai
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress variant="determinate" value={pct} size={56} thickness={5} />
              <Box sx={{ inset: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" fontWeight={800}>{pct}%</Typography>
              </Box>
            </Box>
          </Stack>

          {nextTask ? (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {nextTask.status === 'in_progress' ? 'Lanjutkan kunjungan' : 'Kunjungan berikutnya'}
              </Typography>
              <Typography fontWeight={700} noWrap>{outletOf(nextTask.outletId).name || '-'}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {TASK_TYPE_LABEL[nextTask.type]} • {outletOf(nextTask.outletId).address}
              </Typography>
              <Button
                fullWidth variant="contained" size="large"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={() => navigate(`/app/tasks/${nextTask.id}`)}
                sx={{ mt: 1.25, borderRadius: 2 }}
              >
                {nextTask.status === 'in_progress' ? 'Lanjutkan' : 'Mulai Kunjungan'}
              </Button>
            </Box>
          ) : tasks.length ? (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 2 }}>
              <CheckCircleRoundedIcon fontSize="small" color="success" />
              <Typography variant="body2" fontWeight={700} color="success.main">
                Semua tugas hari ini selesai. Kerja bagus!
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Belum ada jadwal kunjungan hari ini.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ===== Aksi cepat ===== */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        {QUICK.map((q) => (
          <Card key={q.path} elevation={0} onClick={() => navigate(q.path)}
            sx={{ cursor: 'pointer', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Avatar variant="rounded" sx={{ bgcolor: `${q.color}.main`, borderRadius: 2, width: 40, height: 40 }}>
                <q.icon sx={{ color: 'common.white' }} fontSize="small" />
              </Avatar>
              <Typography fontWeight={700} fontSize={14} sx={{ mt: 1 }}>{q.label}</Typography>
              <Typography variant="caption" color="text.secondary">{q.desc}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ===== Tugas Hari Ini ===== */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>Tugas Hari Ini</Typography>
        <Link component={RouterLink} to="/app/tasks" variant="body2" underline="hover">Lihat Semua</Link>
      </Stack>
      {tasks.length ? tasks.slice(0, 3).map((t) => (
        <Card key={t.id} elevation={0} onClick={() => navigate(`/app/tasks/${t.id}`)}
          sx={{ cursor: 'pointer', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} fontSize={14} noWrap>{outletOf(t.outletId).name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {TASK_TYPE_LABEL[t.type]} • {outletOf(t.outletId).address}
              </Typography>
            </Box>
            <StatusChip kind="task" status={t.status} />
          </CardContent>
        </Card>
      )) : <EmptyState message="Tidak ada tugas hari ini. Nikmati harimu!" />}

      {/* ===== Aktivitas Terakhir ===== */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>Aktivitas Terakhir</Typography>
        <Chip size="small" variant="outlined" label={`${ordersToday.length} order hari ini`} />
      </Stack>
      {recentOrders.length ? recentOrders.map((o) => (
        <Card key={o.id} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box>
              <Typography fontFamily="monospace" fontWeight={700} fontSize={14}>{o.no}</Typography>
              <Typography variant="caption" color="text.secondary">{outletOf(o.outletId).name} • {o.date}</Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={700}>{formatRupiah(o.total)}</Typography>
              <StatusChip kind="order" status={o.status} />
            </Stack>
          </CardContent>
        </Card>
      )) : <EmptyState message="Belum ada order tercatat." />}
    </Stack>
  );
}