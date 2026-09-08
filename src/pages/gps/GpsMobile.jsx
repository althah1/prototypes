import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

import LeafletMap from '../../components/map/LeafletMap';
import CheckInDialog from '../../components/gps/CheckInDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, dateID, formatDistance, GEOFENCE_RADIUS_M } from '../../utils/helpers';
import { currentPosSim, optimizeRoute, SPEED_KMH } from '../../utils/gpsUtils';

export default function GpsMobile() {
  const { user } = useAuth();
  const { db } = useDb();
  const { toast } = useToast();

  /* Semua hooks di atas */
  const [pos, setPos] = useState(() => currentPosSim(db, user.salesId));
  const [checkIn, setCheckIn] = useState(null);

  const today = todayISO();
  const sales = (db.sales || []).find((s) => s.id === user.salesId);
  const area = (db.areas || []).find((a) => a.id === sales?.areaId);

  const tasksToday = (db.tasks || []).filter(
    (t) => t.salesId === user.salesId && t.date === today && t.status !== 'failed'
  );
  const stopOutlets = [...new Set(tasksToday.map((t) => t.outletId))]
    .map((id) => (db.outlets || []).find((o) => o.id === id))
    .filter(Boolean);

  const checkins = (db.checkins || []).filter((c) => c.salesId === user.salesId && c.date === today);
  const checkedInIds = new Set(checkins.map((c) => c.outletId));
  const openStops = stopOutlets.filter((o) => !checkedInIds.has(o.id));
  const doneStops = stopOutlets.filter((o) => checkedInIds.has(o.id));

  /* #72: urutan rute = jarak terdekat (nearest-neighbor + Haversine) — instan (#79) */
  const route = openStops.length ? optimizeRoute(pos, openStops) : [];
  const totalDist = route.reduce((s, r) => s + r.dist, 0);
  const etaMin = Math.max(5, Math.round((totalDist / 1000) / SPEED_KMH * 60));

  /* #72: baca koordinat nyata dari sensor GPS perangkat (HTML5 Geolocation) */
  const useRealGps = () => {
    if (!navigator.geolocation) return toast('Geolocation API tidak tersedia di browser ini.', 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, areaName: 'Posisi GPS nyata' });
        toast('Posisi diperbarui dari GPS perangkat — rute dihitung ulang (#72).', 'success');
      },
      () => toast('Gagal mengambil lokasi. Periksa izin GPS perangkat Anda.', 'error'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const markers = [
    { lat: pos.lat, lng: pos.lng, kind: 'me', tooltip: 'Posisi Anda' },
    ...route.map((r, i) => ({
      lat: r.stop.lat, lng: r.stop.lng, kind: 'num', label: String(i + 1),
      tooltip: `${i + 1}. ${r.stop.name}`,
    })),
    ...doneStops.map((o) => ({
      lat: o.lat, lng: o.lng, kind: 'num', label: '✓', done: true,
      tooltip: `${o.name} — sudah check-in`,
    })),
  ];
  const lines = [{
    coords: [[pos.lat, pos.lng], ...route.map((r) => [r.stop.lat, r.stop.lng])],
    color: '#2563eb', weight: 3, dashArray: '7 7', tooltip: 'Rute kunjungan',
  }];
  const circles = area
    ? [{ lat: area.lat, lng: area.lng, radius: (area.radiusKm || 5) * 1000, color: '#2563eb', label: `Batas area: ${area.name}` }]
    : [];

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Rute Kunjungan Hari Ini</Typography>
        <Typography variant="caption" color="text.secondary">{dateID(today)}</Typography>
      </Stack>

      {/* Posisi */}
      <Card>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">
                <b>Posisi Anda:</b>{' '}
                <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Wilayah kerja: {area?.name || '-'} • radius {area?.radiusKm || 5} km (geofencing #75)
              </Typography>
            </Box>
            <Button size="small" variant="outlined" startIcon={<MyLocationRoundedIcon />} onClick={useRealGps}>
              GPS Nyata
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Peta */}
      <LeafletMap height={250} center={pos} markers={markers} lines={lines} circles={circles} />
      <Typography variant="caption" color="text.secondary">
        Peta: OpenStreetMap + Leaflet.js (#82). Urutan dihitung otomatis — jarak terdekat antar titik (#72/#79).
        Check-In wajib dalam radius <b>{GEOFENCE_RADIUS_M} m</b> dari outlet sebelum membuka Entry Order / Quotation / Audit (#74).
      </Typography>

      {/* Ringkasan */}
      {openStops.length > 0 && (
        <>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Chip size="small" variant="outlined" color="primary" label={`${openStops.length} tujuan`} />
            <Chip size="small" variant="outlined" label={`Total ${formatDistance(totalDist)}`} />
            <Chip size="small" variant="outlined" label={`Estimasi ± ${etaMin} menit`} />
          </Stack>

          {route.map((r, i) => {
            const task = tasksToday.find((t) => t.outletId === r.stop.id && t.status !== 'done');
            return (
              <Card key={r.stop.id}>
                <CardContent sx={{ display: 'flex', gap: 1.25, alignItems: 'center', p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', color: '#fff', fontWeight: 800, width: 34, height: 34, flexShrink: 0 }}>
                    {i + 1}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>{r.stop.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">{r.stop.address}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Jarak dari titik sebelumnya: {formatDistance(r.dist)}
                    </Typography>
                  </Box>
                  <Button size="small" variant="contained" startIcon={<StorefrontRoundedIcon />}
                    onClick={() => setCheckIn({ outlet: r.stop, task })}>
                    Check-In
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Sudah check-in */}
      {doneStops.length > 0 && (
        <>
          <Typography variant="subtitle1" fontWeight={700}>✓ Sudah Check-In ({doneStops.length})</Typography>
          {doneStops.map((o) => {
            const ck = [...checkins].reverse().find((c) => c.outletId === o.id);
            return (
              <Card key={o.id}>
                <CardContent sx={{ display: 'flex', gap: 1.25, alignItems: 'center', p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Avatar variant="rounded" sx={{ bgcolor: 'success.main', color: '#fff', width: 34, height: 34, flexShrink: 0 }}>
                    <CheckCircleRoundedIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>{o.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      Check-in {ck?.ts || '-'} • {formatDistance(ck?.distM || 0)} dari outlet
                    </Typography>
                  </Box>
                  <Chip size="small" color="success" variant="outlined" label="OK" />
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {!stopOutlets.length && <EmptyState message="Tidak ada kunjungan tersisa hari ini." />}

      {/* Dialog Check-In — validasi Haversine + wilayah + radius (dipakai ulang dari Prompt 5) */}
      <CheckInDialog
        open={!!checkIn}
        onClose={() => setCheckIn(null)}
        outlet={checkIn?.outlet}
        task={checkIn?.task}
      />
    </Stack>
  );
}