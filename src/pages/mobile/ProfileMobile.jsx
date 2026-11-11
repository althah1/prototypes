import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';

import ConfirmDialog from '../../components/mobile/ConfirmDialogMobile';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { initials, formatRupiah } from '../../utils/helpers';

export default function ProfileMobile() {
  const { user, logout } = useAuth();
  const { db, reset } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useLocation().pathname.startsWith('/app');
  const [openReset, setOpenReset] = useState(false);

  const sales = user.salesId ? db.sales.find((s) => s.id === user.salesId) : null;
  const area = sales ? db.areas.find((a) => a.id === sales.areaId) : null;
  const supervisor = sales ? db.supervisors.find((s) => s.id === sales.supervisorId) : null;
  const roleLabel = { admin: 'Administrator', supervisor: 'Supervisor', sales: 'Sales Lapangan', finance: 'Finance' }[user.role] || user.role;

  const rows = [
    { icon: <MailRoundedIcon fontSize="small" />, label: 'Email Resmi', value: user.email },
    { icon: <PhoneRoundedIcon fontSize="small" />, label: 'Nomor Telepon', value: user.phone || '-' },
    { icon: <ScheduleRoundedIcon fontSize="small" />, label: 'Sesi Login Terakhir', value: `${user.loginAt || '-'} WIB` },
  ];
  if (sales) {
    rows.push(
      { icon: <BadgeRoundedIcon fontSize="small" />, label: 'NIK Karyawan', value: sales.nik },
      { icon: <SupervisorAccountRoundedIcon fontSize="small" />, label: 'Supervisor Pembina', value: supervisor?.name || '-' },
      { icon: <MapRoundedIcon fontSize="small" />, label: 'Area Distribusi', value: area?.name || '-' },
      { icon: <PaymentsRoundedIcon fontSize="small" />, label: 'Target Penjualan', value: formatRupiah(sales.target) },
    );
  }

  return (
    <Stack spacing={1.5} sx={{ maxWidth: 640, width: '100%', mx: 0, pb: 3, alignItems: 'stretch' }}>
      <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
        Profil Saya
      </Typography>

      <Card elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1,
                bgcolor: 'primary.main',
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {initials(user.name)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, overflowWrap: 'anywhere', fontSize: 15 }} noWrap>
                {user.name}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                color="primary"
                label={roleLabel}
                sx={{ mt: 0.3, fontWeight: 650, fontSize: '0.65rem', borderRadius: 1 }}
              />
            </Box>
          </Stack>

          <List dense disablePadding>
            {rows.map((r) => (
              <ListItem key={r.label} disableGutters sx={{ py: 0.8, borderBottom: '1px dashed', borderColor: 'divider' }}>
                <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{r.icon}</ListItemIcon>
                <ListItemText
                  primary={r.label}
                  secondary={r.value}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary', sx: { fontSize: 10.5, fontWeight: 700 } }}
                  secondaryTypographyProps={{
                    sx: { fontWeight: 600, fontSize: 11.5, overflowWrap: 'anywhere', wordBreak: 'break-word' },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {isMobile && (
        <Card
          elevation={0}
          onClick={() => navigate('/app/activity')}
          sx={{
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'primary.main',
            },
          }}
        >
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: '#eff6ff',
                  color: '#1d4ed8',
                  width: 38,
                  height: 38,
                  borderRadius: 1,
                  border: '1px solid #bfdbfe',
                }}
              >
                <HistoryRoundedIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={750} fontSize={13}>
                  Riwayat Aktivitas
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, fontSize: 10 }}>
                  Timeline kunjungan toko, pesanan &amp; audit lapangan
                </Typography>
              </Box>
              <ArrowForwardRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack spacing={1} sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          color="error"
          size="medium"
          startIcon={<LogoutRoundedIcon />}
          onClick={() => logout('Anda telah keluar dari sistem.')}
          sx={{ borderRadius: 1, py: 0.8, fontWeight: 650, textTransform: 'none', fontSize: 12 }}
        >
          Keluar (Logout)
        </Button>

        <Button
          variant="text"
          size="small"
          startIcon={<RestartAltRoundedIcon />}
          onClick={() => setOpenReset(true)}
          sx={{ color: 'text.secondary', fontSize: '0.7rem', textTransform: 'none' }}
        >
          Reset Data Prototype
        </Button>
      </Stack>

      <ConfirmDialog
        open={openReset}
        onClose={() => setOpenReset(false)}
        onConfirm={() => {
          Object.keys(localStorage)
            .filter((k) => k.startsWith('sfa_morn_') || k.startsWith('sfa_ensure_'))
            .forEach((k) => localStorage.removeItem(k));
          reset();
          setOpenReset(false);
          toast('Data prototype dimuat ulang dari seed awal.', 'success');
        }}
        title="Reset Data Prototype?"
        message="Semua transaksi, pesanan, dan perubahan stok yang dibuat pada sesi ini akan dikembalikan ke data awal demo."
        confirmText="Reset Sekarang"
        confirmColor="warning"
      />
    </Stack>
  );
}
