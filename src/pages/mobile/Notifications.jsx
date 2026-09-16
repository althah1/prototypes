import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';

import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';

export default function Notifications() {
  const { user } = useAuth();
  const { db, mutate } = useDb();
  const navigate = useNavigate();

  /* Snapshot ID notifikasi yang belum terbaca SAAT HALAMAN DIBUKA —
     penanda visual "BARU" bertahan selama kunjungan ini,
     meski status terbaca di database sudah diperbarui. */
  const [newIds] = useState(() => new Set(
    (db.notifications || []).filter((n) => n.userId === user.id && !n.read).map((n) => n.id)
  ));

  const list = (db.notifications || []).filter((n) => n.userId === user.id).slice().reverse();
  const newCount = list.filter((n) => newIds.has(n.id)).length;

  /* Tandai semua notifikasi sebagai terbaca saat halaman dibuka (badge lonceng ikut bersih) */
  useEffect(() => {
    if ((db.notifications || []).some((n) => n.userId === user.id && !n.read)) {
      mutate((d) => {
        (d.notifications || []).forEach((n) => { if (n.userId === user.id) n.read = true; });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate('/app')} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800}>Notifikasi</Typography>
          <Typography variant="caption" color="text.secondary">
            {newCount > 0 ? `${newCount} notifikasi baru` : 'Semua sudah terbaca'}
          </Typography>
        </Box>
      </Stack>

      {list.length ? list.map((n) => {
        const isNew = newIds.has(n.id);
        return (
          <Card key={n.id} elevation={0}
            sx={{
              borderRadius: 3, border: '1px solid', borderColor: 'divider',
              borderLeft: isNew ? '3px solid' : '1px solid',
              borderLeftColor: isNew ? 'primary.main' : 'divider',
            }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="body2" fontWeight={700}>{n.title}</Typography>
                {isNew && (
                  <Chip size="small" color="primary" label="BARU"
                    sx={{ height: 20, flexShrink: 0, '& .MuiChip-label': { fontSize: 10, fontWeight: 800, px: 0.75 } }} />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">{n.body}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{n.createdAt}</Typography>
            </CardContent>
          </Card>
        );
      }) : <EmptyState message="Tidak ada notifikasi." icon={NotificationsRoundedIcon} />}
    </Stack>
  );
}