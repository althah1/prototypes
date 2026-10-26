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
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import NearMeRoundedIcon from '@mui/icons-material/NearMeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import WrongLocationRoundedIcon from '@mui/icons-material/WrongLocationRounded';

import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { haversine, formatDistance, todayISO, nowStamp, GEOFENCE_RADIUS_M } from '../../utils/helpers';

const KV = ({ label, value }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.6 }}
  >
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} component="div">{value}</Typography>
  </Stack>
);

export default function CheckInDialog({ open, onClose, outlet, task, onDone }) {
  const { user } = useAuth();
  const { db, insert, update } = useDb();
  const { toast } = useToast();

  /* Semua hooks wajib di atas early return — Rules of Hooks */
  const [result, setResult] = useState(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);
  const loggedViolationKeyRef = useRef('');

  const area = (db.areas || []).find((a) => a.id === outlet?.areaId) || {};

  /* Reset state setiap kali dialog dibuka atau berganti outlet */
  useEffect(() => {
    if (open) {
      setResult(null);
      setLocating(false);
      setBusy(false);
      setCommitted(false);
      loggedViolationKeyRef.current = '';
    }
  }, [open, outlet?.id]);

  if (!outlet) return null;

  const inRadius = Boolean(result && result.dist <= GEOFENCE_RADIUS_M);

  const resolveWith = (pos) => {
    const dist = haversine(pos.lat, pos.lng, outlet.lat, outlet.lng);
    const distArea = haversine(pos.lat, pos.lng, area.lat ?? 0, area.lng ?? 0);
    const areaOk = distArea <= (area.radiusKm || 5) * 1000;
    const nextResult = { pos, dist, distArea, areaOk };
    setResult(nextResult);

    /* BR-GPS-002: Catat flag percobaan di luar wilayah/radius ke database untuk audit Supervisor,
       TETAPI mutlak TIDAK meloloskan Check-In apabila berada di luar radius geofencing. */
    const coordKey = `${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`;
    if (loggedViolationKeyRef.current !== coordKey) {
      if (!areaOk) {
        loggedViolationKeyRef.current = coordKey;
        insert('violations', {
          date: todayISO(),
          ts: nowStamp(),
          salesId: user.salesId,
          outletId: outlet.id,
          type: 'area',
          coords: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
          distM: Math.round(distArea),
          note: 'Percobaan Check-In ditolak: posisi berada di luar batas wilayah kerja',
        });
      } else if (dist > GEOFENCE_RADIUS_M) {
        loggedViolationKeyRef.current = coordKey;
        insert('violations', {
          date: todayISO(),
          ts: nowStamp(),
          salesId: user.salesId,
          outletId: outlet.id,
          type: 'radius',
          coords: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`,
          distM: Math.round(dist),
          note: `Percobaan Check-In terkunci: jarak ${formatDistance(dist)} melebihi batas ${GEOFENCE_RADIUS_M} m`,
        });
      }
    }
  };

  const pickSim = (id) => {
    if (id === 'near') return resolveWith({ lat: outlet.lat + 0.00025, lng: outlet.lng + 0.00018 });
    if (id === 'far') return resolveWith({ lat: outlet.lat + 0.0022, lng: outlet.lng - 0.0015 });
    if (id === 'ooc') return resolveWith({ lat: (area.lat ?? -7.7) + 0.08, lng: (area.lng ?? 110.3) + 0.05 });

    if (!navigator.geolocation) {
      return toast('Geolocation API tidak tersedia di browser ini.', 'error');
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        resolveWith({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        setLocating(false);
        toast('Gagal mengambil lokasi perangkat. Periksa izin GPS Anda.', 'error');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const commitSuccess = () => {
    /* Guard ketat BR-TASK-002 & BR-GPS-002: tolak mutlak jika belum ada GPS atau di luar radius */
    if (!result || result.dist > GEOFENCE_RADIUS_M || busy || committed) return;

    setCommitted(true);
    setBusy(true);

    const { pos, dist, areaOk } = result;
    insert('checkins', {
      date: todayISO(),
      ts: nowStamp(),
      salesId: user.salesId,
      outletId: outlet.id,
      lat: +pos.lat.toFixed(6),
      lng: +pos.lng.toFixed(6),
      distM: dist,
      areaOk,
      note: '',
    });

    /* F-20: aktifkan SEMUA tugas pending outlet ini hari ini (multi-tugas per outlet) */
    (db.tasks || []).forEach((t) => {
      if (
        t.salesId === user.salesId &&
        t.outletId === outlet.id &&
        t.date === todayISO() &&
        t.status === 'pending'
      ) {
        update('tasks', t.id, { status: 'in_progress' });
      }
    });

    toast(
      `Check-In berhasil pada ${nowStamp()} WIB — jarak ${formatDistance(dist)}${task ? '. Status tugas: Berlangsung.' : '.'}`,
      'success'
    );
    setTimeout(() => {
      onClose();
      if (onDone) onDone();
    }, 1100);
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 1 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationOnRoundedIcon color="primary" /> Check-In — {outlet.name}
      </DialogTitle>

      <DialogContent dividers sx={{ overflowX: 'hidden' }}>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <KV
            label="Koordinat Outlet"
            value={
              <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                {outlet.lat}, {outlet.lng}
              </Typography>
            }
          />
          <KV label="Area Outlet" value={area.name || '-'} />
          <KV label="Radius Kehadiran" value={`maks. ${GEOFENCE_RADIUS_M} m (Haversine)`} />
        </Stack>

        {!result ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Ambil posisi GPS Anda terlebih dahulu. Tombol Check-In hanya akan aktif apabila Anda berada di dalam radius maksimal {GEOFENCE_RADIUS_M} m dari outlet:
            </Typography>

            {/* Jalur utama: GPS perangkat */}
            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<MyLocationRoundedIcon />}
              disabled={locating}
              onClick={() => pickSim('real')}
              sx={{ borderRadius: 2, mb: 2 }}
            >
              {locating ? 'Mengambil Lokasi GPS…' : 'Gunakan GPS Perangkat'}
            </Button>

            {locating && <LinearProgress sx={{ mb: 2 }} />}

            {/* Jalur demo prototype: simulasi */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Mode simulasi (untuk pengujian geofencing):
            </Typography>
            <Stack spacing={0.75}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<NearMeRoundedIcon />}
                disabled={locating}
                onClick={() => pickSim('near')}
                sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
              >
                Simulasi Dekat Outlet (± 30 m)
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DirectionsWalkRoundedIcon />}
                disabled={locating}
                onClick={() => pickSim('far')}
                sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
              >
                Simulasi Jauh (± 250 m)
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<WrongLocationRoundedIcon />}
                disabled={locating}
                onClick={() => pickSim('ooc')}
                sx={{ justifyContent: 'flex-start', borderRadius: 2 }}
              >
                Simulasi Luar Wilayah Kerja (± 10 km)
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              <KV
                label="Koordinat Anda"
                value={
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {result.pos.lat.toFixed(5)}, {result.pos.lng.toFixed(5)}
                  </Typography>
                }
              />
              <KV label="Jarak ke Outlet" value={formatDistance(result.dist)} />
              <KV label="Jarak dari Pusat Area" value={formatDistance(result.distArea)} />
            </Stack>

            {!result.areaOk && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                Anda berada di <b>LUAR BATAS WILAYAH KERJA</b> ({formatDistance(result.distArea)} dari pusat area).
                Percobaan dicatat sebagai flag pelanggaran ke database.
              </Alert>
            )}

            {committed ? (
              /* State sukses setelah tombol Check-In ditekan di dalam radius valid */
              <Stack alignItems="center" spacing={0.5} sx={{ py: 1.5 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mb: 0.5 }}>
                  <CheckCircleRoundedIcon sx={{ fontSize: 30, color: 'common.white' }} />
                </Avatar>
                <Typography variant="h6" fontWeight={800}>Check-In Berhasil</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Jarak {formatDistance(result.dist)} — valid dalam radius {GEOFENCE_RADIUS_M} m
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Status tugas: Berlangsung — menyimpan &amp; menutup otomatis…
                </Typography>
                <Box sx={{ width: '100%', mt: 1.5 }}>
                  <LinearProgress color="success" />
                </Box>
              </Stack>
            ) : inRadius ? (
              <Stack spacing={1.5}>
                <Alert severity="success">
                  Posisi Anda berada di <b>dalam radius kehadiran</b> ({formatDistance(result.dist)} dari maks. {GEOFENCE_RADIUS_M} m). Silakan tekan tombol <b>Check-In Sekarang</b> di bawah.
                </Alert>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => setResult(null)}
                  sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                >
                  Kalibrasi Ulang GPS
                </Button>
              </Stack>
            ) : (
              /* Di luar radius: Check-In TERKUNCI mutlak tanpa bypass alasan */
              <Stack spacing={1.5}>
                <Alert severity="error">
                  <b>Check-In Terkunci!</b> Jarak Anda saat ini <b>{formatDistance(result.dist)}</b> dari titik outlet (batas maksimal <b>{GEOFENCE_RADIUS_M} m</b>). Mendekatlah ke lokasi outlet terlebih dahulu lalu perbarui posisi GPS.
                </Alert>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => setResult(null)}
                  sx={{ borderRadius: 2 }}
                >
                  Perbarui Posisi GPS
                </Button>
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={busy}>
          Batal
        </Button>
        <Button
          variant="contained"
          color={inRadius ? 'success' : 'primary'}
          startIcon={inRadius ? <CheckCircleRoundedIcon /> : <LockRoundedIcon />}
          disabled={!inRadius || busy || committed}
          onClick={commitSuccess}
          sx={{ borderRadius: 2 }}
        >
          {!result
            ? 'Check-In Terkunci'
            : inRadius
              ? 'Check-In Sekarang'
              : 'Terkunci (Di Luar Radius)'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
