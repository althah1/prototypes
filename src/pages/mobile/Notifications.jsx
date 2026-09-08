import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
  const list = db.notifications.filter((n) => n.userId === user.id).slice().reverse();

  /* Tandai semua notifikasi sebagai terbaca saat halaman dibuka */
  useEffect(() => {
    if (db.notifications.some((n) => n.userId === user.id && !n.read)) {
      mutate((d) => {
        d.notifications.forEach((n) => { if (n.userId === user.id) n.read = true; });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => navigate('/app')}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Typography variant="h6">Notifikasi</Typography>
      </Stack>

      {list.length ? list.map((n) => (
        <Card key={n.id} sx={{ borderLeft: n.read ? '1px solid' : '3px solid', borderColor: 'primary.main', opacity: n.read ? 0.65 : 1 }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="body2" fontWeight={700}>{n.title}</Typography>
            <Typography variant="body2" color="text.secondary">{n.body}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{n.createdAt}</Typography>
          </CardContent>
        </Card>
      )) : <EmptyState message="Tidak ada notifikasi." icon={NotificationsRoundedIcon} />}
    </Stack>
  );
}