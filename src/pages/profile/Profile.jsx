import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

import DetailGrid, { CardSectionHeader } from '../../components/ui/DetailGrid';
import PageHeader from '../../components/ui/PageHeader';
import StatusChip from '../../components/ui/StatusChip';
import { passwordPolicy, useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { initials } from '../../utils/helpers';

const ROLE_LABELS = {
  admin: 'Administrator',
  supervisor: 'Supervisor',
  sales: 'Sales Lapangan',
  finance: 'Finance',
};

export default function Profile() {
  const { user, logout, changePassword } = useAuth();
  const { db } = useDb();
  const { toast } = useToast();

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const salesRec = user?.salesId ? (db.sales || []).find((s) => s.id === user.salesId) : null;
  const areaRec = salesRec ? (db.areas || []).find((a) => a.id === salesRec.areaId) : null;

  const handleSavePass = (e) => {
    e.preventDefault();
    setErr('');
    if (!curPass) {
      setErr('Kata sandi saat ini wajib diisi.');
      return;
    }
    const pErr = passwordPolicy(newPass);
    if (pErr) {
      setErr(pErr);
      return;
    }
    if (newPass !== confPass) {
      setErr('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    setSaving(true);
    const res = changePassword(curPass, newPass);
    setSaving(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setCurPass('');
    setNewPass('');
    setConfPass('');
    toast('Kata sandi berhasil diperbarui.', 'success');
  };

  if (!user) return null;

  const profileItems = [
    { label: 'Nama Lengkap', value: user.name },
    { label: 'Peran Akun', value: ROLE_LABELS[user.role] || user.role },
    { label: 'Status Akun', customNode: <StatusChip kind="active" status={user.status || 'active'} /> },
    { label: 'Email Login', value: user.email },
    { label: 'No. Telepon', value: user.phone || salesRec?.phone || '-' },
    ...(areaRec ? [{ label: 'Area Kerja', value: `${areaRec.code} — ${areaRec.name}` }] : []),
    { label: 'Waktu Login Terakhir', value: user.loginAt || '-' },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: { xs: 440, md: 1040 }, mx: 'auto' }}>
      <PageHeader
        title="Profil Pengguna"
        subtitle="Informasi akun aktif dan pengaturan keamanan kata sandi."
      />

      {/* Grid 2 Kolom Desktop: Kiri = Info Akun, Kanan = Keamanan */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {/* Kolom 1: Informasi Akun */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <CardSectionHeader
            title="Informasi Akun"
            subtitle="Kredensial dan hak akses yang tercatat di sistem"
          />
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
              <Avatar
                sx={{
                  width: 58,
                  height: 58,
                  bgcolor: 'primary.main',
                  fontWeight: 800,
                  fontSize: 20,
                  borderRadius: 1.25,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                }}
              >
                {initials(user.name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                  {user.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {ROLE_LABELS[user.role] || user.role}
                  </Typography>
                  <StatusChip kind="active" status={user.status || 'active'} />
                </Stack>
              </Box>
            </Stack>

            <DetailGrid items={profileItems} columns={1} />

            {/* Tombol Logout khusus Sales Mobile */}
            {user.role === 'sales' && (
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<LogoutRoundedIcon />}
                onClick={() => logout('Anda telah keluar dari sistem.')}
                sx={{ mt: 2.5, py: 1, borderRadius: 1.25, fontWeight: 650 }}
              >
                Keluar dari Akun
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Kolom 2: Keamanan / Ubah Kata Sandi */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <CardSectionHeader
            title="Keamanan Kata Sandi"
            subtitle="Perbarui kata sandi akun secara berkala"
          />
          <CardContent component="form" onSubmit={handleSavePass} noValidate sx={{ p: 2.5 }}>
            <Stack spacing={2}>
              {err && <Alert severity="error">{err}</Alert>}

              <TextField
                label="Kata Sandi Saat Ini"
                type="password"
                value={curPass}
                onChange={(e) => { setCurPass(e.target.value); setErr(''); }}
                autoComplete="current-password"
                required
              />

              <Box sx={{ pt: 0.5 }}>
                <TextField
                  label="Kata Sandi Baru"
                  type="password"
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setErr(''); }}
                  helperText="Minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka."
                  autoComplete="new-password"
                  required
                />
              </Box>

              <TextField
                label="Konfirmasi Kata Sandi Baru"
                type="password"
                value={confPass}
                onChange={(e) => { setConfPass(e.target.value); setErr(''); }}
                autoComplete="new-password"
                required
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={<LockResetRoundedIcon />}
                  sx={{ py: 0.9, px: 2.5, borderRadius: 1.25, fontWeight: 650 }}
                >
                  {saving ? 'Menyimpan…' : 'Simpan Kata Sandi'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
