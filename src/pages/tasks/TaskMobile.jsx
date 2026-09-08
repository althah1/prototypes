import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
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

const TYPE_ICON = {
  order: ShoppingCartRoundedIcon,
  audit: FactCheckRoundedIcon,
  display: PhotoCameraRoundedIcon,
  billing: PaymentsRoundedIcon,
};

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

  const mine = (db.tasks || []).filter((t) => t.salesId === user.salesId && t.date === today);
  const openTasks = mine.filter((t) => ['pending', 'in_progress'].includes(t.status));
  const doneTasks = mine.filter((t) => t.status === 'done');
  const closedTasks = mine.filter((t) => ['failed', 'cancelled'].includes(t.status));
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};

  const TaskCard = ({ t }) => {
    const Icon = TYPE_ICON[t.type] || ShoppingCartRoundedIcon;
    const o = outletOf(t.outletId);
    return (
      <Card onClick={() => navigate(`/app/tasks/${t.id}`)} sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
        <CardContent sx={{ display: 'flex', gap: 1.25, alignItems: 'center', p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40, flexShrink: 0 }}>
            <Icon fontSize="small" />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography fontWeight={700} fontSize={14} noWrap>{o.name || '-'}</Typography>
              <StatusChip kind="task" status={t.status} />
            </Stack>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {TASK_TYPE_LABEL[t.type]} • {o.address || ''}
            </Typography>
            {t.note && <Typography variant="caption" color="text.secondary" noWrap display="block">📝 {t.note}</Typography>}
          </Box>
          <ChevronRightRoundedIcon color="action" />
        </CardContent>
      </Card>
    );
  };

  const Section = ({ title, list }) => !list.length ? null : (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{title} ({list.length})</Typography>
      <Stack spacing={1.25}>{list.map((t) => <TaskCard key={t.id} t={t} />)}</Stack>
    </Box>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Tugas Hari Ini</Typography>
        <Typography variant="caption" color="text.secondary">{dateID(today)}</Typography>
      </Stack>

      {!mine.length ? (
        <EmptyState message="Tidak ada tugas hari ini. Nikmati harimu!" />
      ) : (
        <>
          <Section title="Belum Selesai" list={openTasks} />
          <Section title="Selesai" list={doneTasks} />
          <Section title="Gagal / Dibatalkan" list={closedTasks} />
        </>
      )}
    </Stack>
  );
}