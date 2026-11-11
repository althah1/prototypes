import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

export default function OtpVerification() {
  const { getOtpState, verifyOtp, requestOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const initial = getOtpState();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!initial.meta) return <Navigate to="/forgot-password" replace />;

  const { code, meta } = getOtpState();
  const cooldownSec = Math.max(0, Math.ceil((meta.resendAt - now) / 1000));
  const remainSec = Math.max(0, Math.ceil((meta.expiresAt - now) / 1000));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const res = verifyOtp(otp);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast('Kode OTP terverifikasi. Silakan buat kata sandi baru.', 'success');
    navigate('/reset-password');
  };

  const handleResend = () => {
    const res = requestOtp(meta.email);
    if (res.ok) {
      setError('');
      setOtp('');
      toast(`Kode OTP baru dikirim: ${res.code}`, 'info', 6000);
    }
  };

  return (
    <AuthLayout
      title="Verifikasi Kode OTP"
      subtitle={`Masukkan 6 digit kode OTP yang dikirim ke ${meta.email}.`}
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <Alert severity="info">
            Demo OTP aktif: <b>{code}</b> (berlaku {Math.floor(remainSec / 60)}:{String(remainSec % 60).padStart(2, '0')})
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Kode OTP (6 Digit)"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputProps={{ maxLength: 6, style: { letterSpacing: '0.35em', fontWeight: 700, textAlign: 'center' } }}
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={otp.length !== 6} sx={{ py: 1 }}>
            Verifikasi OTP
          </Button>
          <Button variant="outlined" color="inherit" disabled={cooldownSec > 0} onClick={handleResend} sx={{ py: 0.85 }}>
            {cooldownSec > 0 ? `Kirim Ulang OTP (${cooldownSec} dtk)` : 'Kirim Ulang OTP'}
          </Button>
          <Typography variant="body2" textAlign="center" sx={{ pt: 0.5 }}>
            <Link component={RouterLink} to="/login" underline="hover" fontWeight={650} fontSize={13}>
              Batal &amp; Kembali ke Login
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
