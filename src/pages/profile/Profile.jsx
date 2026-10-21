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

import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { initials, formatRupiah } from '../../utils/helpers';

export default function Profile() {
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
    <Stack spacing={2} sx={{ maxWidth: 640, width: '100%', mx: 0, pb: 4, alignItems: 'stretch' }}>
      <Typography variant="h6" fontWeight={800}>
        Profil Saya
      </Typography>

      {/* Kartu Profil Utama — Mengikuti Standar Master Perusahaan */}
      <Card elevation={0} sx={{ maxWidth: 640, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2,
                bgcolor: 'primary.main',
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {initials(user.name)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }} noWrap>
                {user.name}
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                color="primary"
                label={roleLabel}
                sx={{ mt: 0.5, fontWeight: 650 }}
              />
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
                  secondaryTypographyProps={{
                    sx: { fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere', wordBreak: 'break-word' },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Kartu Menu Riwayat Aktivitas (Khusus Mobile Sales) */}
      {isMobile && (
        <Card
          elevation={0}
          onClick={() => navigate('/app/activity')}
          sx={{
            maxWidth: 640,
            borderRadius: 2,
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
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: '#eff6ff',
                  color: '#1d4ed8',
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  border: '1px solid #bfdbfe',
                }}
              >
                <HistoryRoundedIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={750} fontSize={14}>
                  Riwayat Aktivitas
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Timeline kunjungan toko, pesanan &amp; audit lapangan
                </Typography>
              </Box>
              <ArrowForwardRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Tombol Logout & Reset Data */}
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          color="error"
          size="medium"
          startIcon={<LogoutRoundedIcon />}
          onClick={() => logout('Anda telah keluar dari sistem.')}
          sx={{ borderRadius: 1.5, py: 1, fontWeight: 650, textTransform: 'none' }}
        >
          Keluar (Logout)
        </Button>

        <Button
          variant="text"
          size="small"
          startIcon={<RestartAltRoundedIcon />}
          onClick={() => setOpenReset(true)}
          sx={{ color: 'text.secondary', fontSize: '0.75rem', textTransform: 'none' }}
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
