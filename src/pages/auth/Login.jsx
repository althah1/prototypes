import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../store/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@sfa.co.id', pass: 'Admin123' },
  { label: 'Supervisor', email: 'supervisor@sfa.co.id', pass: 'Super123' },
  { label: 'Sales', email: 'sales@sfa.co.id', pass: 'Sales123' },
  { label: 'Finance', email: 'finance@sfa.co.id', pass: 'Finance123' },
];

export default function Login() {
  const { login, homePath, consumeLogoutReason } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');

  useEffect(() => {
    const reason = consumeLogoutReason();
    if (reason) setBanner(reason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    setBanner('');
    const res = login(email, password);
    if (res.ok) {
      navigate(homePath(res.user.role), { replace: true });
      return;
    }
    if (res.locked || res.field === 'form') {
      setBanner(res.message);
      return;
    }
    if (res.field) {
      setErrors({ [res.field]: res.message });
    }
  };

  return (
    <AuthLayout
      title="Masuk ke Akun SFA"
      subtitle="Gunakan kredensial sesuai peran Anda untuk mengakses sistem."
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          {banner && <Alert severity="warning">{banner}</Alert>}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
            error={!!errors.email}
            helperText={errors.email || undefined}
            placeholder="nama@sfa.co.id"
            autoComplete="email"
          />

          <TextField
            label="Kata Sandi"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
            error={!!errors.password}
            helperText={errors.password || undefined}
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPass((s) => !s)} edge="end" aria-label="Tampilkan kata sandi">
                    {showPass ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2" underline="hover" fontWeight={650} fontSize={13}>
              Lupa Kata Sandi?
            </Link>
          </Box>

          <Button type="submit" variant="contained" size="large" startIcon={<LoginRoundedIcon />} fullWidth sx={{ py: 1 }}>
            Masuk
          </Button>

          <Divider sx={{ my: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Akun Demo Cepat
            </Typography>
          </Divider>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <Button
                key={acc.label}
                variant="outlined"
                color="inherit"
                size="small"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(acc.pass);
                  setErrors({});
                  setBanner('');
                }}
                sx={{ borderRadius: 1, py: 0.75, fontWeight: 600, fontSize: '0.8rem' }}
              >
                {acc.label}
              </Button>
            ))}
          </Box>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
