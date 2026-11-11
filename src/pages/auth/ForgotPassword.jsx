import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

export default function ForgotPassword() {
  const { requestOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const res = requestOtp(email);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast(`Simulakirim ke ${res.meta.email}: ${res.code}`, 'info', 6000);
    navigate('/verify-otp');
  };

  return (
    <AuthLayout
      title="Lupa Kata Sandi"
      subtitle="Masukkan alamat email terdaftar untuk menerima kode verifikasi OTP 6 digit."
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email Terdaftar"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="nama@sfa.co.id"
            autoComplete="email"
          />
          <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1 }}>
            Kirim Kode OTP
          </Button>
          <Box sx={{ textAlign: 'center', pt: 0.5 }}>
            <Link component={RouterLink} to="/login" variant="body2" underline="hover" fontWeight={650} fontSize={13}>
              Kembali ke Halaman Login
            </Link>
          </Box>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
