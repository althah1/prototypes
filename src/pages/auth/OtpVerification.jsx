import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

const EMAIL_SESSION_KEY = 'sfa_reset_email';
const OTP_KEY = 'sfa_react_otp';        // sama dengan AuthContext — untuk menampilkan kode demo
const RESEND_SECONDS = 60;              // BR-A06: cooldown kirim ulang 60 detik

/* Mode prototype: tampilkan kode OTP (sistem nyata: dikirim via email gateway) */
function readDemoCode() {
  try {
    const otp = JSON.parse(localStorage.getItem(OTP_KEY));
    if (otp && Date.now() < otp.expiresAt) return otp.code;
  } catch { /* abaikan */ }
  return null;
}

export default function OtpVerification() {
  const { verifyOtp, requestOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState(() => sessionStorage.getItem(EMAIL_SESSION_KEY) || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [demoCode, setDemoCode] = useState(readDemoCode);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  /* Wajib melewati langkah 1 — jika tidak ada email reset, kembalikan */
  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
  }, [email, navigate]);

  /* Countdown tombol kirim ulang */
  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resend = () => {
    const res = requestOtp(email);
    if (res.limit) return toast(res.limit, 'error', 5000);
    if (res.cooldown) return toast(`Kirim ulang tersedia dalam ${res.cooldown} detik.`, 'warning');
    if (res.field) return toast(res.message, 'error');
    setDemoCode(res.code);
    setSeconds(RESEND_SECONDS);
    toast('Kode OTP baru telah dikirim (simulasi).', 'success');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (code.length !== 6) return setError('Kode OTP wajib tepat 6 digit angka.');

    setSubmitting(true);
    setTimeout(() => {
      const res = verifyOtp(code);
      setSubmitting(false);
      if (res.message) {
        setError(res.message);
        setCode('');
        return;
      }
      toast('OTP terverifikasi. Silakan buat kata sandi baru.', 'success');
      navigate('/reset-password');
    }, 400);
  };

  return (
    <AuthLayout
      title="Verifikasi OTP"
      subtitle={email ? <>Kode 6 digit telah dikirim ke <b>{email}</b>. Berlaku 5 menit.</> : undefined}
    >
      {demoCode && (
        <Alert severity="info" icon={<MailRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
          Mode Prototype — Kode OTP Anda: <b style={{ letterSpacing: 3, fontSize: 16 }}>{demoCode}</b>
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Kode OTP"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          error={!!error}
          helperText={error || ' '}
          inputProps={{
            inputMode: 'numeric',
            maxLength: 6,
            style: { textAlign: 'center', fontSize: 24, letterSpacing: 10, fontWeight: 700 },
          }}
          autoFocus
        />
        <Button type="submit" fullWidth variant="contained" size="large" disabled={submitting} sx={{ mt: 1, py: 1.2 }}>
          {submitting ? 'Memverifikasi…' : 'Verifikasi'}
        </Button>
      </Box>

      <Stack alignItems="center" spacing={1} sx={{ mt: 2 }}>
        {seconds > 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TimerRoundedIcon fontSize="small" /> Kirim ulang dalam {seconds}s
          </Typography>
        ) : (
          <Button size="small" variant="text" onClick={resend} startIcon={<RefreshRoundedIcon />}>
            Kirim Ulang Kode
          </Button>
        )}
        <Link
          component={RouterLink} to="/login" variant="body2" underline="hover"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackRoundedIcon fontSize="small" /> Kembali ke Login
        </Link>
      </Stack>
    </AuthLayout>
  );
}