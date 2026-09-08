import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

const EMAIL_SESSION_KEY = 'sfa_reset_email'; // menyimpan email antar langkah reset

export default function ForgotPassword() {
  const { requestOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState(() => sessionStorage.getItem(EMAIL_SESSION_KEY) || '');
  const [error, setError] = useState('');
  const [limitMsg, setLimitMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setLimitMsg('');
    setSubmitting(true);

    setTimeout(() => {
      const res = requestOtp(email);
      setSubmitting(false);

      if (res.limit) return setLimitMsg(res.limit);       // Alert box di halaman (FSD 4.1.4)
      if (res.cooldown) return toast(`Tunggu ${res.cooldown} detik sebelum kirim ulang.`, 'warning');
      if (res.field) return setError(res.message);        // inline error
      sessionStorage.setItem(EMAIL_SESSION_KEY, email);
      toast('Kode OTP berhasil dikirim ke email Anda (simulasi).', 'success');
      navigate('/verify-otp');
    }, 500);
  };

  return (
    <AuthLayout
      title="Lupa Kata Sandi?"
      subtitle="Masukkan email terdaftar. Sistem akan mengirim kode OTP (6 digit) yang berlaku 5 menit."
    >
      {limitMsg && <Alert severity="error" sx={{ mb: 2 }}>{limitMsg}</Alert>}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email Terdaftar"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={!!error}
          helperText={error || ' '}
          inputProps={{ maxLength: 100 }}
          autoFocus
        />
        <Button type="submit" fullWidth variant="contained" size="large" disabled={submitting} sx={{ mt: 1, py: 1.2 }}>
          {submitting ? 'Mengirim…' : 'Kirim Kode OTP'}
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component={RouterLink} to="/login" variant="body2" underline="hover"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackRoundedIcon fontSize="small" /> Kembali ke Login
        </Link>
      </Box>
    </AuthLayout>
  );
}