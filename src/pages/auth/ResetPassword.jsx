import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';

import AuthLayout from '../../components/layout/AuthLayout';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

const EMAIL_SESSION_KEY = 'sfa_reset_email';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});
    setSubmitting(true);

    setTimeout(() => {
      const res = resetPassword(p1, p2);
      setSubmitting(false);
      if (res.field) return setErrors({ [res.field]: res.message });
      if (res.message) return toast(res.message, 'error');

      sessionStorage.removeItem(EMAIL_SESSION_KEY);
      toast('Reset password berhasil. Silakan masuk dengan kata sandi baru.', 'success', 5000);
      navigate('/login');
    }, 400);
  };

  return (
    <AuthLayout
      title="Buat Kata Sandi Baru"
      subtitle="Minimal 8 karakter, kombinasi huruf besar, huruf kecil, dan angka (BR-A01)."
    >
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Kata Sandi Baru"
            type={show ? 'text' : 'password'}
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            error={!!errors.p1}
            helperText={errors.p1 || ' '}
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShow((s) => !s)} edge="end" size="small">
                    {show ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Konfirmasi Kata Sandi"
            type={show ? 'text' : 'password'}
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            error={!!errors.p2}
            helperText={errors.p2 || ' '}
          />
        </Stack>
        <Button type="submit" fullWidth variant="contained" size="large" disabled={submitting} sx={{ mt: 1, py: 1.2 }}>
          {submitting ? 'Menyimpan…' : 'Simpan Kata Sandi'}
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link component={RouterLink} to="/login" variant="body2" underline="hover">← Kembali ke Login</Link>
      </Box>
    </AuthLayout>
  );
}