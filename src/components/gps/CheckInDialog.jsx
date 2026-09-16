import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import WrongLocationRoundedIcon from '@mui/icons-material/WrongLocationRounded';

import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { haversine, formatDistance, todayISO, nowStamp, GEOFENCE_RADIUS_M } from '../../utils/helpers';

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.6 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value}</Typography>
  </Stack>
);

export default function CheckInDialog({ open, onClose, outlet, task, onDone }) {
  const { user } = useAuth();
  const { db, insert, update } = useDb();
  const { toast } = useToast();

  /* Semua hooks di atas — Rules of Hooks */
  const [result, setResult] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [busy, setBusy] = useState(false);
  const committedRef = useRef(false);

  const area = (db.areas || []).find((a) => a.id === outlet?.areaId) || {};

  /* Reset setiap kali dialog dibuka / ganti outlet */
  useEffect(() => {
    if (open) {
      setResult(null); setReason(''); setReasonErr('');
      setBusy(false); committedRef.current = false;
    }
  }, [open, outlet?.id]);

  /* Auto-commit saat posisi berada dalam radius (kriteria #74) */
  useEffect(() => {
    if (result && result.dist <= GEOFENCE_RADIUS_M && !committedRef.current) {
      committedRef.current = true;
      commitSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!outlet) return null;

  const resolveWith = (pos) => {
    const dist = haversine(pos.lat, pos.lng, outlet.lat, outlet.lng);
    const distArea = haversine(pos.lat, pos.lng, area.lat ?? 0, area.lng ?? 0);
    const areaOk = distArea <= (area.radiusKm || 5) * 1000;
    setResult({ pos, dist, distArea, areaOk });
  };

  const pickSim = (id) => {
    if (id === 'near') return resolveWith({ lat: outlet.lat + 0.00025, lng: outlet.lng + 0.00018 });
    if (id === 'far') return resolveWith({ lat: outlet.lat + 0.0022, lng: outlet.lng - 0.0015 });
    if (id === 'ooc') return resolveWith({ lat: (area.lat ?? -7.7) + 0.02, lng: (area.lng ?? 110.3) + 0.012 });
    if (!navigator.geolocation) return toast('Geolocation API tidak tersedia di browser ini.', 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => resolveWith({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast('Gagal mengambil lokasi perangkat. Periksa izin GPS Anda.', 'error'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const recordCheckIn = (note = '') => {
    const { pos, dist, areaOk, distArea } = result;
    insert('checkins', {
      date: todayISO(), ts: nowStamp(), salesId: user.salesId, outletId: outlet.id,
      lat: +pos.lat.toFixed(6), lng: +pos.lng.toFixed(6), distM: dist, areaOk, note,
    });
    /* Pelanggaran wilayah → flag ke database (kriteria #75) */
    if (!areaOk) {
      insert('violations', {
        date: todayISO(), ts: nowStamp(), salesId: user.salesId, outletId: outlet.id,
        type: 'area', coords: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
        distM: Math.round(distArea), note: 'Check-in di luar batas wilayah kerja',
      });
    }
    if (task && task.status === 'pending') update('tasks', task.id, { status: 'in_progress' });
  };

  const commitSuccess = () => {
    setBusy(true);
    recordCheckIn('');
    toast(`Check-In berhasil pada ${nowStamp()} WIB — jarak ${formatDistance(result.dist)}. Status tugas: Berlangsung.`, 'success');
    setTimeout(() => { onClose(); onDone && onDone(); }, 1300);
  };

  const commitWithReason = () => {
    const v = reason.trim();
    if (!v) { setReasonErr('Alasan kunjungan di luar radius wajib diisi.'); return; }
    setBusy(true);
    insert('violations', {
      date: todayISO(), ts: nowStamp(), salesId: user.salesId, outletId: outlet.id,
      type: 'radius', coords: `${result.pos.lat.toFixed(5)}, ${result.pos.lng.toFixed(5)}`,
      distM: result.dist, note: v,
    });
    recordCheckIn(v);
    toast('Check-In dicatat dengan alasan — flag pelanggaran radius tersimpan ke database.', 'warning');
    onClose(); onDone && onDone();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOnRoundedIcon color="primary" /> Check-In — {outlet.name}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <KV label="Koordinat Outlet" value={<Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{outlet.lat}, {outlet.lng}</Typography>} />
          <KV label="Area Outlet" value={area.name || '-'} />
          <KV label="Radius Kehadiran" value={`maks. ${GEOFENCE_RADIUS_M} m (Haversine)`} />
        </Stack>

        {!result ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Ambil posisi GPS Anda untuk memulai check-in:
            </Typography>

            {/* Jalur utama: GPS perangkat */}
            <Button
              fullWidth size="large" variant="contained"
              startIcon={<MyLocationRoundedIcon />}
              onClick={() => pickSim('real')}
              sx={{ borderRadius: 2, mb: 2 }}
            >
              Gunakan GPS Perangkat
            </Button>

            {/* Jalur demo prototype: simulasi */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Mode simulasi (untuk demo prototype):
            </Typography>
            <Stack spacing={0.75}>
              <Button size="small" variant="outlined" startIcon={<NearMeRoundedIcon />}
                onClick={() => pickSim('near')}
                sx={{ justifyContent: 'flex-start', borderRadius: 2 }}>
                Simulasi Dekat Outlet (± 30 m)
              </Button>
              <Button size="small" variant="outlined" startIcon={<DirectionsWalkRoundedIcon />}
                onClick={() => pickSim('far')}
                sx={{ justifyContent: 'flex-start', borderRadius: 2 }}>
                Simulasi Jauh (± 250 m)
              </Button>
              <Button size="small" variant="outlined" startIcon={<WrongLocationRoundedIcon />}
                onClick={() => pickSim('ooc')}
                sx={{ justifyContent: 'flex-start', borderRadius: 2 }}>
                Simulasi Luar Wilayah Kerja (± 2 km)
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              <KV label="Koordinat Anda" value={<Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{result.pos.lat.toFixed(5)}, {result.pos.lng.toFixed(5)}</Typography>} />
              <KV label="Jarak ke Outlet" value={formatDistance(result.dist)} />
              <KV label="Jarak dari Pusat Area" value={formatDistance(result.distArea)} />
            </Stack>

            {!result.areaOk && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                Anda berada di <b>LUAR BATAS WILAYAH KERJA</b> ({formatDistance(result.distArea)} dari pusat area).
                Pelanggaran dicatat sebagai flag ke database.
              </Alert>
            )}

            {result.dist <= GEOFENCE_RADIUS_M ? (
              /* Sukses — momen kunci driver: visual besar + progres penutupan otomatis */
              <Stack alignItems="center" spacing={0.5} sx={{ py: 1.5 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mb: 0.5 }}>
                  <CheckCircleRoundedIcon sx={{ fontSize: 30, color: 'common.white' }} />
                </Avatar>
                <Typography variant="h6" fontWeight={800}>Check-In Berhasil</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Jarak {formatDistance(result.dist)} — dalam radius {GEOFENCE_RADIUS_M} m
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Status tugas: Berlangsung — menyimpan &amp; menutup otomatis…
                </Typography>
                <Box sx={{ width: '100%', mt: 1.5 }}>
                  <LinearProgress />
                </Box>
              </Stack>
            ) : (
              <>
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  Radius terlalu jauh — {formatDistance(result.dist)} dari outlet (maksimal {GEOFENCE_RADIUS_M} m).
                </Alert>
                <TextField
                  label="Alasan kunjungan di luar radius (wajib)"
                  multiline minRows={2}
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setReasonErr(''); }}
                  error={!!reasonErr}
                  helperText={reasonErr || ' '}
                  inputProps={{ maxLength: 255 }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                  <Button variant="outlined" startIcon={<RefreshRoundedIcon />}
                    onClick={() => { setResult(null); setReason(''); setReasonErr(''); }}
                    sx={{ borderRadius: 2 }}>
                    Sesuaikan Posisi
                  </Button>
                  <Button variant="contained" color="error" onClick={commitWithReason} disabled={busy}
                    sx={{ borderRadius: 2 }}>
                    Catat Check-In + Alasan
                  </Button>
                </Stack>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Tutup</Button>
      </DialogActions>
    </Dialog>
  );
}