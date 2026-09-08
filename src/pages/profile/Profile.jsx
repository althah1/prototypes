import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';

import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { initials, formatRupiah } from '../../utils/helpers';

export default function Profile() {
  const { user, logout } = useAuth();
  const { db, reset } = useDb();
  const { toast } = useToast();
  const isMobile = useLocation().pathname.startsWith('/app');
  const [openReset, setOpenReset] = useState(false);

  const sales = user.salesId ? db.sales.find((s) => s.id === user.salesId) : null;
  const area = sales ? db.areas.find((a) => a.id === sales.areaId) : null;
  const supervisor = sales ? db.supervisors.find((s) => s.id === sales.supervisorId) : null;
  const roleLabel = { admin: 'Administrator', supervisor: 'Supervisor', sales: 'Sales Lapangan', finance: 'Finance' }[user.role];

  const rows = [
    { icon: <MailRoundedIcon fontSize="small" />, label: 'Email', value: user.email },
    { icon: <PhoneRoundedIcon fontSize="small" />, label: 'Telepon', value: user.phone || '-' },
    { icon: <ScheduleRoundedIcon fontSize="small" />, label: 'Login Terakhir', value: `${user.loginAt || '-'} WIB` },
  ];
  if (sales) {
    rows.push(
      { icon: <BadgeRoundedIcon fontSize="small" />, label: 'NIK', value: sales.nik },
      { icon: <SupervisorAccountRoundedIcon fontSize="small" />, label: 'Supervisor', value: supervisor?.name || '-' },
      { icon: <MapRoundedIcon fontSize="small" />, label: 'Area Kerja', value: area?.name || '-' },
      { icon: <PaymentsRoundedIcon fontSize="small" />, label: 'Target Bulanan', value: formatRupiah(sales.target) },
    );
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: isMobile ? 'none' : 560 }}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: 24, fontWeight: 800 }}>
              {initials(user.name)}
            </Avatar>
            <Box>
              <Typography variant="h6">{user.name}</Typography>
              <Chip label={roleLabel} color="primary" size="small" variant="outlined" />
            </Box>
          </Stack>

          <List dense disablePadding>
            {rows.map((r) => (
              <ListItem key={r.label} disableGutters sx={{ py: 0.9, borderBottom: '1px dashed', borderColor: 'divider' }}>
                <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{r.icon}</ListItemIcon>
                <ListItemText
                  primary={r.label}
                  secondary={r.value}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Button
        variant="outlined" color="error" size="large"
        startIcon={<LogoutRoundedIcon />}
        onClick={() => logout('Anda telah keluar dari sistem.')}
      >
        Keluar (Logout)
      </Button>

      <Button variant="text" size="small" startIcon={<RestartAltRoundedIcon />} onClick={() => setOpenReset(true)}>
        Reset Data Prototype
      </Button>

      <ConfirmDialog
        open={openReset}
        onClose={() => setOpenReset(false)}
        onConfirm={() => { reset(); setOpenReset(false); toast('Data prototype dimuat ulang dari seed awal.', 'success'); }}
        title="Reset Data Prototype"
        message="Seluruh data akan dikembalikan ke kondisi awal (seed). Sesi login Anda tetap aktif. Lanjutkan?"
        confirmLabel="Ya, Reset"
        confirmColor="warning"
      />
    </Stack>
  );
}