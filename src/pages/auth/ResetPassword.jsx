import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import AuthLayout from '../../components/layout/AuthLayout';
import { passwordPolicy, useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

export default function ResetPassword() {
  const { getOtpState, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { meta } = getOtpState();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  if (!meta || !meta.verified) return <Navigate to="/forgot-password" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const pErr = passwordPolicy(password);
    if (pErr) {
      setError(pErr);
      return;
    }
    if (password !== confirm) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    const res = resetPassword(password);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast('Kata sandi berhasil diperbarui. Silakan login kembali.', 'success');
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout
      title="Atur Ulang Kata Sandi"
      subtitle="Minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, dan angka."
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Kata Sandi Baru"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            autoComplete="new-password"
          />
          <TextField
            label="Konfirmasi Kata Sandi Baru"
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(''); }}
            autoComplete="new-password"
          />
          <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1 }}>
            Simpan Kata Sandi Baru
          </Button>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
