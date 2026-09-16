import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import StopCircleRoundedIcon from '@mui/icons-material/StopCircleRounded';
import WhereToVoteRoundedIcon from '@mui/icons-material/WhereToVoteRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';

import LeafletMap from '../../components/map/LeafletMap';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, formatDistance } from '../../utils/helpers';
import { currentPosSim, optimizeRoute, checkinTrail } from '../../utils/gpsUtils';

/* RBAC #5: GPS Route Planning — Admin & Supervisor Full, Finance tanpa akses */
export default function GpsDesktop() {
  const { user } = useAuth();
  if (!['supervisor', 'admin'].includes(user.role)) {
    return (
      <Alert severity="error">
        Akses ditolak — modul <b>GPS Route Planning</b> hanya untuk <b>Supervisor &amp; Admin</b> (matriks RBAC #5).
      </Alert>
    );
  }
  return <GpsMonitor />;
}

function GpsMonitor() {
  const { db } = useDb();
  const { toast } = useToast();

  /* Semua hooks di atas */
  const [salesId, setSalesId] = useState(() => (db.sales || []).find((s) => s.status === 'active')?.id || 1);
  const [date, setDate] = useState(todayISO());
  const [liveOn, setLiveOn] = useState(false);
  const [liveIdx, setLiveIdx] = useState(0);

  const salesList = (db.sales || []).filter((s) => s.status === 'active');
  const sales = salesList.find((s) => s.id === salesId) || salesList[0];

  const tasksForDate = (db.tasks || []).filter(
    (t) => t.salesId === sales?.id && t.date === date && t.status !== 'failed'
  );
  const stopOutlets = [...new Set(tasksForDate.map((t) => t.outletId))]
    .map((id) => (db.outlets || []).find((o) => o.id === id))
    .filter(Boolean);

  const checkins = checkinTrail(db, sales?.id, date); /* #77/#78: track history */
  const checkedInIds = new Set(checkins.map((c) => c.outletId));
  const openStops = stopOutlets.filter((o) => !checkedInIds.has(o.id));
  const doneStops = stopOutlets.filter((o) => checkedInIds.has(o.id));

  const lastCk = checkins[checkins.length - 1];
  const basePos = lastCk
    ? { lat: lastCk.lat, lng: lastCk.lng, label: `Check-in terakhir ${lastCk.ts}` }
    : { ...currentPosSim(db, sales?.id), label: 'Posisi simulasi (belum ada check-in)' };

  const route = openStops.length ? optimizeRoute(basePos, openStops) : [];
  const routeCoords = [[basePos.lat, basePos.lng], ...route.map((r) => [r.stop.lat, r.stop.lng])];
  const trailCoords = checkins.map((c) => [c.lat, c.lng]);
  const livePath = routeCoords.length > 1
    ? routeCoords
    : (trailCoords.length > 1 ? trailCoords : [[basePos.lat, basePos.lng]]);

  /* #77: simulasi live tracking — marker bergerak menyusuri rute */
  useEffect(() => {
    if (!liveOn) return undefined;
    if (liveIdx >= livePath.length - 1) {
      setLiveOn(false);
      toast('Simulasi live: sales telah menyelesaikan seluruh rute hari ini.', 'info');
      return undefined;
    }
    const t = setTimeout(() => setLiveIdx((i) => i + 1), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveOn, liveIdx]);

  useEffect(() => { setLiveOn(false); setLiveIdx(0); }, [salesId, date]);

  const livePos = liveOn && livePath[liveIdx]
    ? { lat: livePath[liveIdx][0], lng: livePath[liveIdx][1] }
    : basePos;

  const violations = (db.violations || []).filter((v) => v.salesId === sales?.id).slice().reverse();
  const doneTasks = tasksForDate.filter((t) => t.status === 'done').length;

  const circles = (db.areas || []).map((a) => ({
    lat: a.lat, lng: a.lng, radius: (a.radiusKm || 5) * 1000,
    color: a.id === sales?.areaId ? '#2563eb' : '#16a34a',
    label: `Area: ${a.name} (radius ${a.radiusKm} km)`,
  }));
  const markers = [
    { lat: livePos.lat, lng: livePos.lng, kind: 'me', tooltip: `${sales?.name || 'Sales'} — ${liveOn ? 'LIVE' : basePos.label}` },
    ...(db.outlets || []).filter((o) => o.status === 'active').map((o) => ({
      lat: o.lat, lng: o.lng, kind: 'outlet', tooltip: o.name,
    })),
    ...route.map((r, i) => ({
      lat: r.stop.lat, lng: r.stop.lng, kind: 'num', label: String(i + 1),
      tooltip: `${i + 1}. ${r.stop.name}`,
    })),
    ...doneStops.map((o) => ({
      lat: o.lat, lng: o.lng, kind: 'num', label: '✓', done: true,
      tooltip: `${o.name} — sudah check-in`,
    })),
  ];
  const lines = [
    ...(routeCoords.length > 1
      ? [{ coords: routeCoords, color: '#2563eb', weight: 3, dashArray: '7 7', tooltip: 'Rute terencana (#72)' }]
      : []),
    ...(trailCoords.length > 1
      ? [{ coords: trailCoords, color: '#64748b', weight: 2, tooltip: 'Riwayat perjalanan / check-in (#77)' }]
      : []),
  ];

  return (
    <Box>
      <PageHeader
        title="GPS Route Planning — Live Monitoring"
        subtitle="Pemantauan tim sales: penyebaran outlet, batas area geofencing, rute & riwayat perjalanan, indikator status kunjungan (#73)."
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<TaskAltRoundedIcon />} value={`${doneTasks}/${tasksForDate.length}`} label={`Tugas selesai (${date})`} color="success" />
        <StatCard icon={<WhereToVoteRoundedIcon />} value={checkins.length} label="Check-in tercatat" color="info" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={violations.length} label="Pelanggaran (wilayah/radius)" color="error" />
      </Box>

      {/* ============ Toolbar: Sales + Tanggal + Simulasi Live ============ */}
<Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
      <FilterListRoundedIcon fontSize="small" />
      <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
    </Stack>

    <TextField
      size="small"
      select
      label="Sales (#78)"
      value={String(salesId)}
      onChange={(e) => setSalesId(Number(e.target.value))}
      sx={{ width: 210 }}
    >
      {salesList.map((s) => (
        <MenuItem key={s.id} value={String(s.id)}>{s.name} — {(db.areas || []).find((a) => a.id === s.areaId)?.name || ''}</MenuItem>
      ))}
    </TextField>

    <TextField
      size="small"
      type="date"
      label="Tanggal"
      value={date}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => setDate(e.target.value || todayISO())}
      sx={{ width: 170 }}
    />

    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
      {stopOutlets.length} outlet terjadwal • {checkins.length} check-in
    </Typography>

    <Button
      variant={liveOn ? 'outlined' : 'contained'}
      color={liveOn ? 'error' : 'primary'}
      startIcon={liveOn ? <StopCircleRoundedIcon /> : <PlayArrowRoundedIcon />}
      onClick={() => { setLiveIdx(0); setLiveOn((v) => !v); }}
      disabled={livePath.length < 2}
    >
      {liveOn ? 'Hentikan Simulasi' : 'Mulai Simulasi Live (#77)'}
    </Button>
  </Stack>
</Paper>

      <LeafletMap height={380} center={basePos} markers={markers} lines={lines} circles={circles} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 2 }}>
        Posisi: <span style={{ fontFamily: 'monospace' }}>{livePos.lat.toFixed(5)}, {livePos.lng.toFixed(5)}</span> •
        sumber: {liveOn ? 'simulasi live' : basePos.label}. Peta OpenStreetMap + Leaflet.js (#82).
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { lg: '1.3fr 1fr' }, gap: 2 }}>
        {/* Status kunjungan */}
        <Card>
          <CardHeader title={`Status Kunjungan — ${sales?.name || '-'} (${date})`} titleTypographyProps={{ fontSize: 15, fontWeight: 700 }} />
          <CardContent>
            {route.map((r, i) => {
              const t = tasksForDate.find((x) => x.outletId === r.stop.id);
              return (
                <Stack key={r.stop.id} direction="row" spacing={1.25} alignItems="center"
                  sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: 13, fontWeight: 800 }}>{i + 1}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{r.stop.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Belum check-in • jarak {formatDistance(r.dist)}
                    </Typography>
                  </Box>
                  <StatusChip kind="task" status={t?.status || 'pending'} />
                </Stack>
              );
            })}
            {doneStops.map((o) => {
              const ck = checkins.filter((c) => c.outletId === o.id).pop();
              const t = tasksForDate.find((x) => x.outletId === o.id);
              return (
                <Stack key={o.id} direction="row" spacing={1.25} alignItems="center"
                  sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Avatar sx={{ bgcolor: 'success.main', width: 28, height: 28 }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{o.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Check-in {ck?.ts || '-'} • {formatDistance(ck?.distM || 0)}
                    </Typography>
                  </Box>
                  <StatusChip kind="task" status={t?.status || 'done'} />
                </Stack>
              );
            })}
            {!stopOutlets.length && <EmptyState message="Tidak ada rute pada tanggal ini." />}
          </CardContent>
        </Card>

        {/* Pelanggaran (#75) */}
        <Card>
          <CardHeader
          avatar={<Avatar sx={{ bgcolor: 'error.main', width: 32, height: 32 }}><WarningAmberRoundedIcon sx={{ fontSize: 18 }} /></Avatar>} title="Pelanggaran Wilayah / Radius" titleTypographyProps={{ fontSize: 15, fontWeight: 700 }}/>
          <CardContent sx={{ p: 0 }}>
            {violations.length ? (
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Waktu</TableCell><TableCell>Outlet</TableCell><TableCell>Jenis</TableCell>
                      <TableCell align="right">Jarak</TableCell><TableCell>Catatan</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {violations.slice(0, 10).map((v) => (
                      <TableRow key={v.id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{v.date} {v.ts?.slice(11) || ''}</TableCell>
                        <TableCell>{(db.outlets || []).find((o) => o.id === v.outletId)?.name || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" color={v.type === 'area' ? 'error' : 'warning'}
                            label={v.type === 'area' ? 'Luar Wilayah' : 'Luar Radius'} />
                        </TableCell>
                        <TableCell align="right">{formatDistance(v.distM || 0)}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{v.note || '-'}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : <EmptyState message="Tidak ada pelanggaran tercatat." />}
          </CardContent>
        </Card>
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        Posisi sales dikirim berkala selama jam kerja untuk live tracking &amp; riwayat perjalanan (#77);
        Supervisor dapat memilih tim &amp; tanggal untuk melihat plot historis (#78). Check-in di luar batas Area Kerja /
        radius outlet otomatis dicatat sebagai <b>flag pelanggaran</b> ke database (#75). Deteksi Fake GPS (#76) pada
        browser web bersifat terbatas — validasi mock-location definitif dilakukan di sisi backend/OS.
      </Alert>
    </Box>
  );
}