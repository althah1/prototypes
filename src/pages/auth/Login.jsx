import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import LockClockRoundedIcon from '@mui/icons-material/LockClockRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import DirectionsRunRoundedIcon from '@mui/icons-material/DirectionsRunRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

const DEMO_ACCOUNTS = [
  { label: 'Admin',      email: 'admin@sfa.co.id',      password: 'Admin123',   icon: <AdminPanelSettingsRoundedIcon fontSize="small" /> },
  { label: 'Supervisor', email: 'supervisor@sfa.co.id', password: 'Super123',   icon: <SupervisorAccountRoundedIcon fontSize="small" /> },
  { label: 'Sales',      email: 'sales@sfa.co.id',      password: 'Sales123',   icon: <DirectionsRunRoundedIcon fontSize="small" /> },
  { label: 'Finance',    email: 'finance@sfa.co.id',    password: 'Finance123', icon: <PaymentsRoundedIcon fontSize="small" /> },
];

export default function Login() {
  const { login, homePath, consumeLogoutReason } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [lockout, setLockout] = useState(null); // { minutes }

  /* Tampilkan alasan logout (manual / timeout sesi) sebagai toast */
  useEffect(() => {
    const reason = consumeLogoutReason();
    if (reason) toast(reason, 'info', 4500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});
    setSubmitting(true);

    /* Simulasi latency request API (sistem nyata: POST /api/login) */
    setTimeout(() => {
      const res = login(email, password);
      setSubmitting(false);

      if (res.blocked) return setLockout({ minutes: res.minutes });   // BR-A02
      if (res.field) return setErrors({ [res.field]: res.message });  // inline error
      if (res.message) {
        toast(res.message, 'error');
        setPassword('');
        return;
      }
      /* Berhasil → routing berdasarkan role (BR-AUTH-007) */
      toast(`Selamat datang, ${res.user.name}!`, 'success');
      navigate(homePath(res.user.role), { replace: true });
    }, 500);
  };

  return (
    <AuthLayout title="Masuk ke akun Anda" subtitle="Gunakan email dan kata sandi terdaftar.">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
            helperText={errors.email || ' '}
            inputProps={{ maxLength: 100 }}
            autoFocus
          />
          <TextField
            label="Kata Sandi"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errors.password}
            helperText={errors.password || ' '}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                    {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        <Stack direction="row" justifyContent="flex-end" sx={{ my: 1 }}>
          <Link component={RouterLink} to="/forgot-password" variant="body2" underline="hover">
            Lupa Kata Sandi?
          </Link>
        </Stack>

        <Button type="submit" fullWidth variant="contained" size="large" disabled={submitting} sx={{ mt: 1, py: 1.2 }}>
          {submitting ? 'Memverifikasi…' : 'Masuk'}
        </Button>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary">AKUN DEMO — KLIK UNTUK ISI OTOMATIS</Typography>
        </Divider>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, justifyContent: 'center' }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <Chip key={acc.email} icon={acc.icon} label={acc.label} variant="outlined" onClick={() => fillDemo(acc)} />
          ))}
        </Stack>

        <Alert severity="info" icon={<InfoRoundedIcon fontSize="small" />} sx={{ mt: 3 }}>
          Sales diarahkan ke <b>Web Mobile</b>, peran lain ke <b>Web Dashboard</b> (BR-AUTH-007).
          Prototype — data tersimpan lokal di browser.
        </Alert>
      </Box>

      {/* Modal pembekuan akun (BR-A02: 5x gagal → 15 menit) */}
      <Dialog open={!!lockout} onClose={() => setLockout(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockClockRoundedIcon color="error" /> Akun Dibekukan Sementara
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Akun dibekukan sementara karena terlalu banyak percobaan gagal.
            Silakan coba lagi dalam <b>{lockout?.minutes} menit</b>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setLockout(null)}>Mengerti</Button>
        </DialogActions>
      </Dialog>
    </AuthLayout>
  );
}