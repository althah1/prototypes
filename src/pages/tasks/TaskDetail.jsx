import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';

import CheckInDialog from '../../components/gps/CheckInDialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, nowStamp, GEOFENCE_RADIUS_M, TASK_TYPE_LABEL } from '../../utils/helpers';
import { completeTaskAuto } from '../../utils/taskUtils';
import { readFileAsDataURL } from '../../utils/files';
import { addWatermark } from '../../utils/watermark';

const REQ_TEXT = {
  order: 'Entry Order tersimpan & diajukan',
  audit: 'Form audit + foto bukti terkirim',
  display: 'Foto display terunggah (kamera langsung)',
  billing: 'Data penagihan tercatat',
};

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.7 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

/* ============ Dialog Foto Display (BR-TASK-005 + watermark) ============ */
function PhotoDialog({ open, onClose, task, outlet, salesId }) {
  const { user } = useAuth();
  const { db, insert, mutate } = useDb();
  const { toast } = useToast();
  const [image, setImage] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useState(() => 0); /* placeholder agar pola hooks konsisten */
  if (open && image === '' && err === '' && saving === false && typeof window.__photoReset === 'undefined') {
    window.__photoReset = true;
  }

  const reset = () => { setImage(''); setErr(''); setSaving(false); };
  /* reset saat dibuka */
  useState(() => { return null; });

  const lastCk = [...(db.checkins || [])].reverse().find((c) => c.outletId === outlet?.id && c.date === todayISO());
  const coords = lastCk ? `${lastCk.lat.toFixed(5)}, ${lastCk.lng.toFixed(5)}` : `${outlet?.lat}, ${outlet?.lng}`;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataURL(file, (url, error) => {
      if (error || !url) { setErr(error || 'Gagal membaca berkas.'); return; }
      setErr(''); setImage(url);
    });
  };

  const submit = async () => {
    if (!image) { setErr('Foto wajib diambil dari kamera langsung (BR-TASK-005).'); return; }
    setSaving(true);
    const marked = await addWatermark(image, [
      `Sales: ${user.name}`,
      `Outlet: ${outlet.name}`,
      `Waktu: ${nowStamp()} WIB`,
      `GPS: ${coords}`,
    ]);
    insert('photos', { taskId: task.id, outletId: outlet.id, salesId, image: marked, ts: nowStamp() });
    const done = completeTaskAuto(db, mutate, { outletId: outlet.id, type: 'display', salesId });
    toast(done ? 'Foto tersimpan — tugas otomatis Selesai (Auto-Complete BR-TASK-003).' : 'Foto tersimpan.', 'success');
    setSaving(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="xs" fullWidth>
      <DialogTitle>Foto Display — {outlet?.name}</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Wajib kamera langsung — galeri/Camera Roll <b>tidak diizinkan</b> (BR-TASK-005). Maks 2 MB. Watermark waktu + GPS otomatis diterapkan.
        </Alert>
        <input hidden id="display-cam" type="file" accept="image/*" capture="environment" onChange={handleFile} />
        <label htmlFor="display-cam">
          <Button component="span" variant="outlined" startIcon={<PhotoCameraRoundedIcon />}>Ambil Foto (Kamera)</Button>
        </label>
        {image && (
          <Box component="img" src={image} sx={{ width: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider', mt: 1.5 }} />
        )}
        {err && <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>{err}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Batal</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !image}>
          {saving ? 'Menyimpan…' : 'Unggah Bukti'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============ Dialog Penagihan ============ */
function BillingDialog({ open, onClose, task, outlet, salesId }) {
  const { db, insert, mutate } = useDb();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr('Nominal tagihan wajib diisi (lebih dari 0).'); return; }
    insert('billings', { taskId: task.id, outletId: outlet.id, salesId, amount: amt, note: note.trim(), ts: nowStamp() });
    const done = completeTaskAuto(db, mutate, { outletId: outlet.id, type: 'billing', salesId });
    toast(done ? 'Penagihan tercatat — tugas otomatis Selesai (Auto-Complete).' : 'Penagihan tercatat.', 'success');
    setAmount(''); setNote(''); setErr('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Catat Hasil Penagihan — {outlet?.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField type="number" label="Nominal Tagihan Terbayar (Rp) *" value={amount}
            onChange={(e) => { setAmount(e.target.value); setErr(''); }}
            error={!!err} helperText={err || ' '} inputProps={{ min: 0 }} />
          <TextField label="Catatan (maks 500)" multiline minRows={2} value={note}
            onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 500 }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Batal</Button>
        <Button variant="contained" onClick={submit}>Simpan</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============ Halaman Detail Tugas ============ */
export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { db, update } = useDb();
  const { toast } = useToast();

  /* Semua hooks SEBELUM early return — Rules of Hooks */
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErr, setCancelErr] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);

  const task = (db.tasks || []).find((t) => t.id === Number(id));
  const outlet = task ? (db.outlets || []).find((o) => o.id === task.outletId) : null;
  const area = outlet ? (db.areas || []).find((a) => a.id === outlet.areaId) : null;

  if (!task || !outlet) {
    return (
      <Stack spacing={2}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/app/tasks')} sx={{ alignSelf: 'flex-start' }}>
          Daftar Tugas
        </Button>
        <EmptyState message="Tugas tidak ditemukan." />
      </Stack>
    );
  }

  const submitCancel = () => {
    const v = cancelReason.trim();
    if (!v) { setCancelErr('Alasan pembatalan wajib diisi.'); return; }
    update('tasks', task.id, { status: 'cancelled', cancelReason: v, cancelledAt: nowStamp() });
    toast('Tugas dibatalkan.', 'warning');
    setCancelOpen(false); setCancelReason(''); setCancelErr('');
  };

  const markDone = () => {
    update('tasks', task.id, { status: 'done', completedAt: nowStamp(), doneManually: true });
    setConfirmDone(false);
    toast('Tugas ditandai Selesai (manual).', 'success');
  };

  const typeCta =
    task.type === 'order' ? (
      <Button variant="contained" size="large" startIcon={<ShoppingCartRoundedIcon />}
        onClick={() => navigate('/app/order', { state: { outletId: outlet.id } })}>
        Buka Form Entry Order
      </Button>
    ) : task.type === 'audit' ? (
      <Button variant="contained" size="large" startIcon={<FactCheckRoundedIcon />}
        onClick={() => navigate('/app/audit', { state: { outletId: outlet.id } })}>
        Buka Form Audit
      </Button>
    ) : task.type === 'display' ? (
      <Button variant="contained" size="large" startIcon={<PhotoCameraRoundedIcon />} onClick={() => setPhotoOpen(true)}>
        Ambil Foto Display (Kamera Langsung)
      </Button>
    ) : (
      <Button variant="contained" size="large" startIcon={<PaymentsRoundedIcon />} onClick={() => setBillingOpen(true)}>
        Catat Hasil Penagihan
      </Button>
    );

  return (
    <Stack spacing={2}>
      <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/app/tasks')} sx={{ alignSelf: 'flex-start' }}>
        Daftar Tugas
      </Button>

      {/* Info outlet & tugas */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">{outlet.name}</Typography>
            <StatusChip kind="task" status={task.status} />
          </Stack>
          <KV label="Alamat" value={outlet.address || '-'} />
          <KV label="Area" value={area?.name || '-'} />
          <KV label="Koordinat" value={<Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{outlet.lat}, {outlet.lng}</Typography>} />
          <KV label="Tanggal" value={task.date} />
          <KV label="Jenis" value={TASK_TYPE_LABEL[task.type] || task.type} />
          {task.note && <KV label="Catatan SPV" value={task.note} />}
          {task.completedAt && <KV label="Selesai Pada" value={`${task.completedAt}${task.doneManually ? ' (manual)' : ' (auto)'}`} />}
        </CardContent>
      </Card>

      {/* Syarat auto-complete */}
      <Card>
        <CardHeader title="Syarat Penyelesaian Otomatis (BR-TASK-003)" titleTypographyProps={{ fontSize: 15, fontWeight: 700 }} />
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {task.status === 'done' ? <CheckCircleRoundedIcon color="success" /> : <RadioButtonUncheckedRoundedIcon color="action" />}
            <Typography variant="body2">{REQ_TEXT[task.type]}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Status menjadi <b>Selesai otomatis</b> saat seluruh aktivitas tersimpan — tombol manual di bawah hanya untuk kondisi khusus.
          </Typography>
        </CardContent>
      </Card>

      {/* Aksi status */}
      <Card>
        <CardHeader title="Aksi Status Tugas" titleTypographyProps={{ fontSize: 15, fontWeight: 700 }} />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {task.status === 'pending' && (
            <>
              <Button variant="contained" size="large" startIcon={<LocationOnRoundedIcon />} onClick={() => setCheckInOpen(true)}>
                Check-In &amp; Mulai (Dalam Proses)
              </Button>
              <Typography variant="caption" color="text.secondary">
                Check-In divalidasi geofencing — diblokir bila jarak &gt; {GEOFENCE_RADIUS_M} m dari outlet (BR-TASK-002, Haversine).
              </Typography>
              <Button variant="outlined" color="error" startIcon={<CancelRoundedIcon />} onClick={() => setCancelOpen(true)}>
                Batalkan Tugas
              </Button>
            </>
          )}
          {task.status === 'in_progress' && (
            <>
              {typeCta}
              <Button variant="outlined" color="success" startIcon={<CheckCircleRoundedIcon />} onClick={() => setConfirmDone(true)}>
                Tandai Selesai (Manual)
              </Button>
              <Button variant="outlined" color="error" startIcon={<CancelRoundedIcon />} onClick={() => setCancelOpen(true)}>
                Batalkan Tugas
              </Button>
            </>
          )}
          {task.status === 'done' && (
            <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
              Tugas selesai{task.doneManually ? ' (manual)' : ' secara otomatis'} pada {task.completedAt}.
            </Alert>
          )}
          {task.status === 'failed' && (
            <Alert severity="error">Tugas hangus/kedaluwarsa (BR-TASK-004) — terkunci dan tidak dapat dikerjakan lagi.</Alert>
          )}
          {task.status === 'cancelled' && (
            <Alert severity="warning">Tugas dibatalkan. Alasan: {task.cancelReason}</Alert>
          )}
        </CardContent>
      </Card>

      {/* Dialog Check-In (geofencing) */}
      <CheckInDialog open={checkInOpen} onClose={() => setCheckInOpen(false)} outlet={outlet} task={task} />

      {/* Dialog Pembatalan — wajib alasan */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Batalkan Tugas</DialogTitle>
        <DialogContent dividers>
          <TextField label="Alasan Pembatalan (wajib)" multiline minRows={2} value={cancelReason}
            onChange={(e) => { setCancelReason(e.target.value); setCancelErr(''); }}
            error={!!cancelErr} helperText={cancelErr || ' '}
            inputProps={{ maxLength: 255 }} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={submitCancel}>Batalkan Tugas</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDone}
        onClose={() => setConfirmDone(false)}
        onConfirm={markDone}
        title="Tandai Selesai"
        message="Tandai tugas ini sebagai Selesai secara manual? (Normalnya tugas selesai otomatis saat aktivitas tersimpan.)"
        confirmLabel="Ya, Tandai Selesai"
        confirmColor="success"
      />

      <PhotoDialog open={photoOpen} onClose={() => setPhotoOpen(false)} task={task} outlet={outlet} salesId={user.salesId} />
      <BillingDialog open={billingOpen} onClose={() => setBillingOpen(false)} task={task} outlet={outlet} salesId={user.salesId} />
    </Stack>
  );
}