import { useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';

import StatusChip from '../../components/ui/StatusChip';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { todayISO, dateID, formatRupiah, TASK_TYPE_LABEL } from '../../utils/helpers';

const QUICK = [
  { path: '/app/order',  label: 'Entry Order', desc: 'Pesanan di outlet',   icon: ShoppingCartRoundedIcon },
  { path: '/app/quotes', label: 'Quotation',   desc: 'Penawaran PDF',       icon: DescriptionRoundedIcon },
  { path: '/app/audit',  label: 'Audit',       desc: 'Survey & stok',       icon: FactCheckRoundedIcon },
  { path: '/app/gps',    label: 'Rute GPS',    desc: 'Optimasi & check-in', icon: MapRoundedIcon },
];

export default function Home() {
  const { user } = useAuth();
  const { db } = useDb();
  const { notify } = useSync();
  const navigate = useNavigate();
  const today = todayISO();

  const tasks = db.tasks.filter((t) => t.salesId === user.salesId && t.date === today);
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const ordersToday = db.orders.filter((o) => o.salesId === user.salesId && o.date === today);
  const lastNotif = [...db.notifications.filter((n) => n.userId === user.id)].pop();
  const outletOf = (id) => db.outlets.find((o) => o.id === id) || {};

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

      {/* Ringkasan hari */}
      <Box>
        <Typography variant="h6">{dateID(today)}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
          <Chip icon={<TaskAltRoundedIcon />} label={`${tasks.length} Tugas`} size="small" variant="outlined" color="primary" />
          <Chip label={`Selesai ${doneCount}`} size="small" variant="outlined" color="success" />
          <Chip label={`${ordersToday.length} Order`} size="small" variant="outlined" />
        </Stack>
      </Box>

      {/* Aksi cepat */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        {QUICK.map((q) => (
          <Card key={q.path} onClick={() => navigate(q.path)} sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <q.icon color="primary" />
              <Typography fontWeight={700} fontSize={14} sx={{ mt: 0.5 }}>{q.label}</Typography>
              <Typography variant="caption" color="text.secondary">{q.desc}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Tugas hari ini */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>Tugas Hari Ini</Typography>
        <Link component={RouterLink} to="/app/tasks" variant="body2" underline="hover">Lihat Semua</Link>
      </Stack>
      {tasks.length ? tasks.slice(0, 3).map((t) => (
        <Card key={t.id} onClick={() => navigate('/app/tasks')} sx={{ cursor: 'pointer' }}>
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

      {/* Aktivitas terakhir */}
      <Typography variant="subtitle1" fontWeight={700}>Aktivitas Terakhir</Typography>
      {[...db.orders].reverse().filter((o) => o.salesId === user.salesId).slice(0, 3).map((o) => (
        <Card key={o.id}>
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
      ))}
    </Stack>
  );
}