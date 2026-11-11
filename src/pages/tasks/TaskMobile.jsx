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
import CloudSyncRoundedIcon from '@mui/icons-material/CloudSyncRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';

import StatusChip from '../../components/mobile/StatusChipMobile';
import EmptyState from '../../components/mobile/EmptyStateMobile';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, dateID, TASK_TYPE_LABEL } from '../../utils/helpers';
import { expireTasks } from '../../utils/taskUtils';

const TYPE_META = {
  order:   { icon: ShoppingCartRoundedIcon, color: 'primary' },
  audit:   { icon: FactCheckRoundedIcon,    color: 'success' },
  display: { icon: PhotoCameraRoundedIcon,  color: 'warning' },
  billing: { icon: PaymentsRoundedIcon,     color: 'info' },
};

function TaskCard({ t, outlet, isQueuedOffline, onOpen }) {
  const meta = TYPE_META[t.type] || TYPE_META.order;
  const Icon = meta.icon;
  return (
    <Card
      elevation={0}
      onClick={onOpen}
      sx={{ cursor: 'pointer', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
    >
      <CardContent sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Avatar
          variant="rounded"
          sx={{
            bgcolor: `${meta.color}.main`,
            color: 'common.white',
            width: 38,
            height: 38,
            borderRadius: 1,
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.5}>
            <Typography fontWeight={700} fontSize={11.5} noWrap>{outlet.name || '-'}</Typography>
            {isQueuedOffline ? (
              <Chip
                size="small"
                color="warning"
                icon={<CloudSyncRoundedIcon />}
                label="Antrean Offline"
                sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
              />
            ) : (
              <StatusChip kind="task" status={t.status} />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: 9.5 }}>
            {TASK_TYPE_LABEL[t.type]} • {outlet.address || ''}
          </Typography>
          {t.note && (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.2 }}>
              <NoteRoundedIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10 }}>{t.note}</Typography>
            </Stack>
          )}
        </Box>
        <ChevronRightRoundedIcon color="action" sx={{ fontSize: 14 }} />
      </CardContent>
    </Card>
  );
}

function Section({ title, count, color, list, outletOf, queuedTaskIds, onOpen }) {
  if (!list.length) return null;
  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: 12 }}>{title}</Typography>
        <Chip size="small" label={count} color={color} variant="outlined" sx={{ fontSize: '0.65rem' }} />
      </Stack>
      <Stack spacing={0.75}>
        {list.map((t) => (
          <TaskCard
            key={t.id}
            t={t}
            outlet={outletOf(t.outletId)}
            isQueuedOffline={queuedTaskIds.has(t.id)}
            onOpen={() => onOpen(t.id)}
          />
        ))}
      </Stack>
    </Box>
  );
}

export default function TaskMobile() {
  const { user } = useAuth();
  const { db, mutate } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();
  const today = todayISO();

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireTasks(db, mutate);
    if (n) toast(`${n} tugas kemarin yang belum selesai ditandai Gagal (hangus di akhir hari).`, 'info');
  }, []);

  const mine = useMemo(
    () => (db.tasks || []).filter((t) => t.salesId === user.salesId && t.date === today),
    [db.tasks, user.salesId, today]
  );

  const queuedTaskIds = useMemo(() => {
    const ids = new Set();
    (db.syncQueue || []).forEach((q) => {
      if ((q.kind === 'display_photo' || q.kind === 'billing_collection') && q.payload?.taskId) {
        ids.add(q.payload.taskId);
      }
    });
    return ids;
  }, [db.syncQueue]);

  const openTasks = mine.filter((t) => ['pending', 'in_progress'].includes(t.status));
  const doneTasks = mine.filter((t) => t.status === 'done');
  const closedTasks = mine.filter((t) => ['failed', 'cancelled'].includes(t.status));
  const doneCount = doneTasks.length;
  const pct = mine.length ? Math.round((doneCount / mine.length) * 100) : 0;
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};
  const openTask = (id) => navigate(`/app/tasks/${id}`);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" fontWeight={800} sx={{ fontSize: 15 }}>Tugas Hari Ini</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{dateID(today)}</Typography>
      </Stack>

      {mine.length > 0 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>{doneCount} dari {mine.length} tugas selesai</Typography>
            <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: 12 }}>{pct}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 99 }} />
        </Box>
      )}

      {!mine.length ? (
        <EmptyState message="Belum ada jadwal tugas hari ini yang didistribusikan oleh Supervisor." />
      ) : (
        <>
          <Section
            title="Belum Selesai"
            count={openTasks.length}
            color="warning"
            list={openTasks}
            outletOf={outletOf}
            queuedTaskIds={queuedTaskIds}
            onOpen={openTask}
          />
          <Section
            title="Selesai"
            count={doneTasks.length}
            color="success"
            list={doneTasks}
            outletOf={outletOf}
            queuedTaskIds={queuedTaskIds}
            onOpen={openTask}
          />
          <Section
            title="Gagal / Dibatalkan"
            count={closedTasks.length}
            color="default"
            list={closedTasks}
            outletOf={outletOf}
            queuedTaskIds={queuedTaskIds}
            onOpen={openTask}
          />
        </>
      )}
    </Stack>
  );
}
