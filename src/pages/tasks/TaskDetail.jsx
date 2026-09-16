import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';

import StatusChip from '../../components/ui/StatusChip';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, dateID, TASK_TYPE_LABEL } from '../../utils/helpers';
import { expireTasks, ensureTodayTasks } from '../../utils/taskUtils';

/* Ikon + warna per jenis tugas — memudahkan scan visual */
const TYPE_META = {
  order:   { icon: ShoppingCartRoundedIcon, color: 'primary' },
  audit:   { icon: FactCheckRoundedIcon,    color: 'success' },
  display: { icon: PhotoCameraRoundedIcon,  color: 'warning' },
  billing: { icon: PaymentsRoundedIcon,     color: 'info' },
};

/* Kartu tugas — didefinisikan DI LUAR komponen agar tidak dibuat ulang tiap render */
function TaskCard({ t, outlet, onOpen }) {
  const meta = TYPE_META[t.type] || TYPE_META.order;
  const Icon = meta.icon;
  return (
    <Card elevation={0} onClick={onOpen}
      sx={{ cursor: 'pointer', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ display: 'flex', gap: 1.25, alignItems: 'center', p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Avatar variant="rounded"
          sx={{ bgcolor: `${meta.color}.main`, color: 'common.white', width: 42, height: 42, borderRadius: 2, flexShrink: 0 }}>
          <Icon fontSize="small" />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography fontWeight={700} fontSize={14} noWrap>{outlet.name || '-'}</Typography>
            <StatusChip kind="task" status={t.status} />
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {TASK_TYPE_LABEL[t.type]} • {outlet.address || ''}
          </Typography>
          {t.note && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
              <NoteRoundedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" noWrap>{t.note}</Typography>
            </Stack>
          )}
        </Box>
        <ChevronRightRoundedIcon color="action" />
      </CardContent>
    </Card>
  );
}

function Section({ title, count, color, list, outletOf, onOpen }) {
  if (!list.length) return null;
  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        <Chip size="small" label={count} color={color} variant="outlined" />
      </Stack>
      <Stack spacing={1.25}>
        {list.map((t) => (
          <TaskCard key={t.id} t={t} outlet={outletOf(t.outletId)} onOpen={() => onOpen(t.id)} />
        ))}
      </Stack>
    </Box>
  );
}

export default function TaskMobile() {
  const { user } = useAuth();
  const { db, insert, mutate } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();
  const today = todayISO();

  /* Kedaluwarsa harian + sinkronisasi jadwal pagi (sekali) */
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireTasks(db, mutate);
    if (n) toast(`${n} tugas lama ditandai Gagal (kedaluwarsa harian BR-TASK-004).`, 'info');
    if (ensureTodayTasks(db, insert, user.salesId)) {
      toast('Jadwal tugas hari ini telah tersinkronisasi.', 'info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Keringanan: filter hanya dihitung ulang saat tabel tasks berubah */
  const mine = useMemo(
    () => (db.tasks || []).filter((t) => t.salesId === user.salesId && t.date === today),
    [db.tasks, user.salesId, today]
  );
  const openTasks = mine.filter((t) => ['pending', 'in_progress'].includes(t.status));
  const doneTasks = mine.filter((t) => t.status === 'done');
  const closedTasks = mine.filter((t) => ['failed', 'cancelled'].includes(t.status));
  const doneCount = doneTasks.length;
  const pct = mine.length ? Math.round((doneCount / mine.length) * 100) : 0;
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};
  const openTask = (id) => navigate(`/app/tasks/${id}`);

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={800}>Tugas Hari Ini</Typography>
        <Typography variant="caption" color="text.secondary">{dateID(today)}</Typography>
      </Stack>

      {/* Progres hari ini */}
      {mine.length > 0 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{doneCount} dari {mine.length} tugas selesai</Typography>
            <Typography variant="body2" fontWeight={700} color="primary.main">{pct}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 99 }} />
        </Box>
      )}

      {!mine.length ? (
        <EmptyState message="Tidak ada tugas hari ini. Nikmati harimu!" />
      ) : (
        <>
          <Section title="Belum Selesai" count={openTasks.length} color="warning" list={openTasks} outletOf={outletOf} onOpen={openTask} />
          <Section title="Selesai" count={doneTasks.length} color="success" list={doneTasks} outletOf={outletOf} onOpen={openTask} />
          <Section title="Gagal / Dibatalkan" count={closedTasks.length} color="default" list={closedTasks} outletOf={outletOf} onOpen={openTask} />
        </>
      )}
    </Stack>
  );
}