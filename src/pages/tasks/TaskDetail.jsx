import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudSyncRoundedIcon from '@mui/icons-material/CloudSyncRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';

import CheckInDialog from '../../components/gps/CheckInDialog';
import EmptyState from '../../components/ui/EmptyState';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import {
  TASK_TYPE_LABEL,
  dateID,
  todayISO,
  nowStamp,
  formatRupiah,
  GEOFENCE_RADIUS_M,
} from '../../utils/helpers';
import {
  calcInvoicePaid,
  applyBillingPaymentInDraft,
  completeTaskAuto,
} from '../../utils/taskUtils';
import { readFileAsDataURL } from '../../utils/files';
import { addWatermark } from '../../utils/watermark';

/* Ikon + warna per jenis tugas — konsisten dengan daftar tugas */
const TYPE_META = {
  order:   { icon: ShoppingCartRoundedIcon, color: 'primary' },
  audit:   { icon: FactCheckRoundedIcon,    color: 'success' },
  display: { icon: PhotoCameraRoundedIcon,  color: 'warning' },
  billing: { icon: PaymentsRoundedIcon,     color: 'info' },
};

/* ===== Header halaman: tombol kembali + judul + status ===== */
function PageHeaderBack({ title, caption, onBack, right }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton onClick={onBack} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" fontWeight={800} noWrap>{title}</Typography>
        {caption && <Typography variant="caption" color="text.secondary" noWrap display="block">{caption}</Typography>}
      </Box>
      {right}
    </Stack>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { db, update, mutate } = useDb();
  const { online, enqueue, notify } = useSync();
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ===== SEMUA HOOKS WAJIB DI PALING ATAS (Rules of Hooks) ===== */
  const [checkInOpen, setCheckInOpen] = useState(false);

  /* State tugas Foto Display */
  const [photos, setPhotos] = useState([]);
  const [camErr, setCamErr] = useState('');

  /* State tugas Transaksi Penagihan (BR-TASK-003) */
  const [selectedInvId, setSelectedInvId] = useState('');
  const [payMethod, setPayMethod] = useState('Tunai');
  const [payAmount, setPayAmount] = useState('');
  const [selectedInstKe, setSelectedInstKe] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payProof, setPayProof] = useState('');
  const [payErr, setPayErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const task = (db.tasks || []).find((t) => t.id === Number(id));

  /* Daftar invoice belum lunas milik outlet tugas ini */
  const outletInvoices = useMemo(
    () =>
      (db.invoices || []).filter(
        (inv) => task && inv.outletId === task.outletId && inv.status === 'belum_lunas'
      ),
    [db.invoices, task]
  );

  const selectedInvoice = useMemo(
    () => outletInvoices.find((inv) => String(inv.id) === String(selectedInvId)) || null,
    [outletInvoices, selectedInvId]
  );

  /* Reset state saat berpindah ID tugas */
  useEffect(() => {
    setPhotos([]);
    setCamErr('');
    setSelectedInvId('');
    setPayMethod('Tunai');
    setPayAmount('');
    setSelectedInstKe('');
    setPayNote('');
    setPayProof('');
    setPayErr('');
    setSubmitting(false);
  }, [id]);

  /* Auto-pilih invoice tertagih pertama & isi nominal default */
  useEffect(() => {
    if (!outletInvoices.length) {
      setSelectedInvId('');
      return;
    }
    const currentValid = outletInvoices.some((inv) => String(inv.id) === String(selectedInvId));
    const targetInv = currentValid
      ? outletInvoices.find((inv) => String(inv.id) === String(selectedInvId))
      : outletInvoices[0];

    if (!currentValid && targetInv) {
      setSelectedInvId(String(targetInv.id));
    }

    if (targetInv) {
      setPayMethod(targetInv.metodePembayaran === 'transfer' ? 'Transfer Bank' : 'Tunai');
      if (targetInv.metodePembayaran === 'cicilan' && Array.isArray(targetInv.installments)) {
        const nextInst = targetInv.installments.find((a) => a.status !== 'lunas');
        setSelectedInstKe(nextInst ? String(nextInst.ke) : '');
        setPayAmount(nextInst ? String(nextInst.nominal) : '0');
      } else {
        const sisa = Math.max(0, targetInv.total - calcInvoicePaid(targetInv));
        setSelectedInstKe('');
        setPayAmount(String(sisa));
      }
      setPayErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletInvoices.length, selectedInvId]);

  if (!task) {
    return (
      <Stack spacing={2}>
        <PageHeaderBack title="Detail Tugas" caption="Tugas tidak ditemukan" onBack={() => navigate('/app/tasks')} />
        <EmptyState message="Tugas tidak ditemukan — mungkin sudah dihapus dari sistem." />
      </Stack>
    );
  }

  const outlet = (db.outlets || []).find((o) => o.id === task.outletId) || null;
  const meta = TYPE_META[task.type] || TYPE_META.order;
  const Icon = meta.icon;
  const today = todayISO();

  const lastCk = [...(db.checkins || [])]
    .reverse()
    .find((c) => c.salesId === user.salesId && c.outletId === task.outletId && c.date === today);

  /* Cek apakah tugas ini sudah masuk antrean offline (BR-TASK-006) */
  const queuedDisplay = (db.syncQueue || []).find(
    (q) => q.kind === 'display_photo' && q.payload?.taskId === task.id
  );
  const queuedBilling = (db.syncQueue || []).find(
    (q) => q.kind === 'billing_collection' && q.payload?.taskId === task.id
  );

  const nextTask = (db.tasks || []).find(
    (t) =>
      t.id !== task.id &&
      t.salesId === user.salesId &&
      t.date === today &&
      (t.status === 'pending' || t.status === 'in_progress') &&
      !(db.syncQueue || []).some((q) => q.payload?.taskId === t.id)
  );

  /* ===== Aksi ===== */
  const openActivity = (path) => navigate(path, { state: { outletId: task.outletId } });

  const buildWatermarkedPhoto = (file, onSuccess) => {
    readFileAsDataURL(file, async (url, err) => {
      if (err || !url) {
        setCamErr(err || 'Gagal membaca berkas foto.');
        return;
      }
      setCamErr('');
      const capturedAt = nowStamp();
      const ck = [...(db.checkins || [])]
        .reverse()
        .find((c) => c.salesId === user.salesId && c.outletId === task.outletId && c.date === today);
      const coords = ck ? `${ck.lat.toFixed(5)}, ${ck.lng.toFixed(5)}` : `${outlet?.lat}, ${outlet?.lng}`;
      const marked = await addWatermark(url, [
        `Sales: ${user.name}`,
        `Outlet: ${outlet?.name || '-'}`,
        `Waktu: ${capturedAt} WIB`,
        `GPS: ${coords}`,
      ]);
      onSuccess(marked);
    });
  };

  /* Kamera Foto Display */
  const handleDisplayPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    buildWatermarkedPhoto(file, (marked) => {
      setPhotos((p) => [...p, marked].slice(0, 3));
    });
    e.target.value = '';
  };

  /* Kamera Bukti Penagihan */
  const handleBillingProof = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    buildWatermarkedPhoto(file, (marked) => {
      setPayProof(marked);
    });
    e.target.value = '';
  };

  /* BR-TASK-006: Pengiriman Foto Display (mendukung antrean offline + timestamp asli pengerjaan) */
  const finishDisplay = () => {
    if (!photos.length || submitting || queuedDisplay) return;
    setSubmitting(true);
    const executedAt = nowStamp();

    if (!online) {
      enqueue('display_photo', {
        taskId: task.id,
        salesId: user.salesId,
        outletId: task.outletId,
        date: task.date,
        photos,
        completedAt: executedAt,
        createdAt: executedAt,
      });
      toast(
        `Anda sedang offline. ${photos.length} foto display disimpan ke antrean perangkat (waktu asli ${executedAt} WIB) dan akan otomatis tersinkron saat koneksi pulih.`,
        'warning',
        5500
      );
      setPhotos([]);
      setSubmitting(false);
      return;
    }

    update('tasks', task.id, {
      status: 'done',
      completedAt: executedAt,
      syncedAt: executedAt,
      photos,
    });
    toast(`Tugas selesai — ${photos.length} foto display tersimpan (${executedAt} WIB).`, 'success');
    setSubmitting(false);
  };

  /* BR-TASK-003 & BR-TASK-006: Penyelesaian Otomatis Tugas Billing dari Transaksi Penagihan */
  const submitBillingCollection = () => {
    if (!selectedInvoice || submitting || queuedBilling) return;
    const isCicilan =
      selectedInvoice.metodePembayaran === 'cicilan' && Array.isArray(selectedInvoice.installments);
    const sisaTagihan = Math.max(0, selectedInvoice.total - calcInvoicePaid(selectedInvoice));

    let nominalBayar = Number(payAmount) || 0;
    if (isCicilan) {
      const inst = selectedInvoice.installments.find((a) => String(a.ke) === String(selectedInstKe));
      if (!inst || inst.status === 'lunas') {
        setPayErr('Pilih jadwal angsuran yang belum lunas.');
        return;
      }
      nominalBayar = Number(inst.nominal) || 0;
    } else {
      if (nominalBayar <= 0) {
        setPayErr('Nominal pembayaran yang diterima wajib lebih dari Rp 0.');
        return;
      }
      if (nominalBayar > sisaTagihan) {
        setPayErr(`Nominal tidak boleh melebihi sisa tagihan (${formatRupiah(sisaTagihan)}).`);
        return;
      }
    }

    setPayErr('');
    setSubmitting(true);
    const executedAt = nowStamp();

    const payload = {
      taskId: task.id,
      invoiceId: selectedInvoice.id,
      invoiceNo: selectedInvoice.no,
      salesId: user.salesId,
      outletId: task.outletId,
      date: task.date,
      metode: payMethod,
      nominal: nominalBayar,
      installmentKe: isCicilan ? Number(selectedInstKe) : null,
      note: payNote.trim(),
      proofPhoto: payProof,
      completedAt: executedAt,
      createdAt: executedAt,
    };

    if (!online) {
      enqueue('billing_collection', payload);
      toast(
        `Mode Offline: Transaksi penagihan ${selectedInvoice.no} (${formatRupiah(nominalBayar)}) disimpan ke antrean lokal (${executedAt} WIB) & otomatis menyelesaikan tugas saat online.`,
        'warning',
        5500
      );
      setSubmitting(false);
      return;
    }

    let isLunas = false;
    mutate((d) => {
      const updated = applyBillingPaymentInDraft(d, payload);
      if (updated && updated.status === 'lunas') isLunas = true;
    });

    /* BR-TASK-003: Tugas Penagihan otomatis selesai dari transaksi penagihan */
    completeTaskAuto(db, mutate, {
      outletId: task.outletId,
      type: 'billing',
      salesId: user.salesId,
      date: task.date,
      completedAt: executedAt,
      extra: {
        billingRef: {
          invoiceNo: selectedInvoice.no,
          nominal: nominalBayar,
          metode: payMethod,
        },
        ...(payProof ? { photos: [payProof] } : {}),
      },
    });

    /* Kirim notifikasi ke tim Finance */
    (db.users || [])
      .filter((u) => u.role === 'finance' && u.status === 'active')
      .forEach((fin) => {
        notify(
          fin.id,
          'Setoran Penagihan Sales',
          `${user.name} mencatat penagihan ${selectedInvoice.no} sebesar ${formatRupiah(nominalBayar)} (${payMethod})${isLunas ? ' — LUNAS' : ''}.`
        );
      });

    toast(
      `Pembayaran ${selectedInvoice.no} sebesar ${formatRupiah(nominalBayar)} tercatat — tugas penagihan otomatis Selesai.`,
      'success'
    );
    setSubmitting(false);
  };

  return (
    <Stack spacing={2}>
      <PageHeaderBack
        title={outlet?.name || 'Detail Tugas'}
        caption={`${TASK_TYPE_LABEL[task.type] || 'Tugas'} • ${dateID(task.date)}`}
        onBack={() => navigate('/app/tasks')}
        right={
          queuedDisplay || queuedBilling ? (
            <Chip
              size="small"
              color="warning"
              icon={<CloudSyncRoundedIcon />}
              label="Antrean Offline"
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <StatusChip kind="task" status={task.status} />
          )
        }
      />

      {!online && (
        <Alert severity="warning" icon={<WifiOffRoundedIcon fontSize="small" />}>
          Mode Offline aktif — hasil pengerjaan tugas akan disimpan ke antrean lokal beserta waktu pengerjaan asli dan dikirim otomatis saat sinyal kembali.
        </Alert>
      )}

      {/* ===== Kartu outlet ===== */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: `${meta.color}.main`,
                color: 'common.white',
                width: 42,
                height: 42,
                borderRadius: 2,
                flexShrink: 0,
              }}
            >
              <Icon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} fontSize={15} noWrap>
                {outlet?.name || 'Outlet tidak ditemukan'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {outlet ? `${outlet.address} • ${outlet.owner || '-'}` : 'Outlet sudah dihapus dari Master Data'}
              </Typography>
            </Box>
          </Stack>
          {outlet?.phone && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Telepon outlet: {outlet.phone}
            </Typography>
          )}
        </CardContent>
      </Card>

      {task.note && <Alert severity="info">Catatan tugas: {task.note}</Alert>}

      {!outlet && (task.status === 'pending' || task.status === 'in_progress') && (
        <Alert severity="error">
          Outlet tugas ini tidak ditemukan — check-in dan aktivitas tidak dapat dimulai.
        </Alert>
      )}

      {/* ===== PENDING: mulai kunjungan ===== */}
      {task.status === 'pending' && outlet && (
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography fontWeight={700} fontSize={14} sx={{ mb: 0.5 }}>Kunjungan Belum Dimulai</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Lakukan check-in GPS di lokasi outlet untuk memulai — wajib berada dalam
              radius {GEOFENCE_RADIUS_M} m dari outlet.
            </Typography>
            <Button
              fullWidth
              size="large"
              variant="contained"
              startIcon={<StorefrontRoundedIcon />}
              onClick={() => setCheckInOpen(true)}
              sx={{ borderRadius: 2 }}
            >
              Mulai Kunjungan (Check-In GPS)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ===== BERLANGSUNG: aktivitas sesuai jenis tugas ===== */}
      {task.status === 'in_progress' && outlet && (
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'primary.main' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <CheckCircleRoundedIcon color="info" fontSize="small" />
              <Typography fontWeight={700} fontSize={14}>Kunjungan Berlangsung</Typography>
            </Stack>
            {lastCk && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Check-in tercatat {lastCk.ts} WIB — jarak {Math.round(lastCk.distM)} m dari outlet.
              </Typography>
            )}

            {/* 1. ENTRY ORDER */}
            {task.type === 'order' && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Catat pesanan produk untuk outlet ini — tugas otomatis selesai saat order tersimpan.
                </Typography>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={<ShoppingCartRoundedIcon />}
                  onClick={() => openActivity('/app/order')}
                  sx={{ borderRadius: 2 }}
                >
                  Entry Order untuk Outlet Ini
                </Button>
              </>
            )}

            {/* 2. AUDIT */}
            {task.type === 'audit' && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Audit kondisi toko, stock-take, dan foto bukti — tugas otomatis selesai saat audit terkirim.
                </Typography>
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={<FactCheckRoundedIcon />}
                  onClick={() => openActivity('/app/audit')}
                  sx={{ borderRadius: 2 }}
                >
                  Audit &amp; Survey Outlet Ini
                </Button>
              </>
            )}

            {/* 3. FOTO DISPLAY (BR-TASK-006: Offline SyncQueue + Timestamp Asli) */}
            {task.type === 'display' && (
              queuedDisplay ? (
                <Stack spacing={1.5}>
                  <Alert severity="warning" icon={<CloudSyncRoundedIcon fontSize="small" />}>
                    <b>Tersimpan di Antrean Offline!</b> {queuedDisplay.payload?.photos?.length || 0} foto display telah dikunci dengan timestamp asli pengerjaan <b>{queuedDisplay.payload?.completedAt} WIB</b> dan akan terkirim otomatis saat perangkat kembali Online.
                  </Alert>
                  {queuedDisplay.payload?.photos?.length > 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                      {queuedDisplay.payload.photos.map((ph, i) => (
                        <Box
                          key={i}
                          sx={{
                            aspectRatio: '1',
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      ))}
                    </Box>
                  )}
                </Stack>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Dokumentasi pajangan produk — kamera langsung, watermark waktu &amp; GPS otomatis. Maksimal 3 foto.
                  </Typography>
                  <input
                    hidden
                    id="display-cam"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleDisplayPhoto}
                  />
                  <label htmlFor="display-cam">
                    <Button
                      component="span"
                      fullWidth
                      variant="outlined"
                      startIcon={<PhotoCameraRoundedIcon />}
                      disabled={photos.length >= 3}
                      sx={{ borderRadius: 2 }}
                    >
                      Ambil Foto ({photos.length}/3)
                    </Button>
                  </label>
                  {camErr && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                      {camErr}
                    </Typography>
                  )}
                  {photos.length > 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1.5 }}>
                      {photos.map((ph, i) => (
                        <Box
                          key={i}
                          sx={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <IconButton
                            size="small"
                            onClick={() => setPhotos((p) => p.filter((_, x) => x !== i))}
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(15,23,42,0.6)', color: '#fff' }}
                          >
                            <CloseRoundedIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    color={online ? 'success' : 'warning'}
                    sx={{ mt: 1.5, borderRadius: 2 }}
                    disabled={!photos.length || submitting}
                    onClick={finishDisplay}
                  >
                    {online ? 'Selesai & Kirim Foto Display' : 'Simpan Foto Display ke Antrean Offline'}
                  </Button>
                </>
              )
            )}

            {/* 4. PENAGIHAN / BILLING (BR-TASK-003: Wajib Otomatis dari Transaksi Penagihan) */}
            {task.type === 'billing' && (
              queuedBilling ? (
                <Alert severity="warning" icon={<CloudSyncRoundedIcon fontSize="small" />}>
                  <b>Transaksi Penagihan di Antrean Offline!</b> Pembayaran <b>{queuedBilling.payload?.invoiceNo}</b> sebesar <b>{formatRupiah(queuedBilling.payload?.nominal || 0)}</b> telah dicatat pada <b>{queuedBilling.payload?.completedAt} WIB</b> dan akan menyelesaikan tugas secara otomatis begitu koneksi pulih.
                </Alert>
              ) : outletInvoices.length === 0 ? (
                <Alert severity="warning">
                  Tidak ditemukan invoice berstatus <b>Belum Lunas</b> pada outlet ini. Sesuai aturan <b>BR-TASK-003</b>, tugas Penagihan hanya dapat selesai secara otomatis melalui pencatatan transaksi pembayaran tagihan aktif (tidak dapat ditandai selesai secara manual).
                </Alert>
              ) : (
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    Catat penerimaan pembayaran tagihan outlet di bawah ini — status tugas otomatis berubah menjadi <b>Selesai</b> saat transaksi penagihan tersimpan.
                  </Typography>

                  <TextField
                    select
                    size="small"
                    label="Pilih Invoice Belum Lunas *"
                    value={selectedInvId}
                    onChange={(e) => setSelectedInvId(e.target.value)}
                    fullWidth
                  >
                    {outletInvoices.map((inv) => {
                      const sisa = Math.max(0, inv.total - calcInvoicePaid(inv));
                      return (
                        <MenuItem key={inv.id} value={String(inv.id)}>
                          {inv.no} — Sisa {formatRupiah(sisa)}
                        </MenuItem>
                      );
                    })}
                  </TextField>

                  {selectedInvoice && (
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        bgcolor: 'action.hover',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Total Invoice</Typography>
                        <Typography variant="caption" fontWeight={700}>{formatRupiah(selectedInvoice.total)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Sudah Dibayar</Typography>
                        <Typography variant="caption" fontWeight={700} color="success.main">
                          {formatRupiah(calcInvoicePaid(selectedInvoice))}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Sisa Tagihan</Typography>
                        <Typography variant="caption" fontWeight={800} color="error.main">
                          {formatRupiah(Math.max(0, selectedInvoice.total - calcInvoicePaid(selectedInvoice)))}
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  {selectedInvoice?.metodePembayaran === 'cicilan' && Array.isArray(selectedInvoice.installments) ? (
                    <TextField
                      select
                      size="small"
                      label="Pilih Jadwal Angsuran *"
                      value={selectedInstKe}
                      onChange={(e) => {
                        const ke = e.target.value;
                        setSelectedInstKe(ke);
                        const inst = selectedInvoice.installments.find((a) => String(a.ke) === String(ke));
                        setPayAmount(inst ? String(inst.nominal) : '0');
                        setPayErr('');
                      }}
                      fullWidth
                    >
                      {selectedInvoice.installments
                        .filter((a) => a.status !== 'lunas')
                        .map((a) => (
                          <MenuItem key={a.ke} value={String(a.ke)}>
                            Angsuran ke-{a.ke} — {formatRupiah(a.nominal)} (JT: {a.jatuhTempo})
                          </MenuItem>
                        ))}
                    </TextField>
                  ) : (
                    <TextField
                      size="small"
                      type="number"
                      label="Nominal Diterima (Rp) *"
                      value={payAmount}
                      onChange={(e) => {
                        setPayAmount(e.target.value);
                        setPayErr('');
                      }}
                      error={Boolean(payErr)}
                      helperText={payErr || 'Dapat berupa pelunasan penuh atau pembayaran sebagian (parsial).'}
                      inputProps={{ min: 1 }}
                      fullWidth
                    />
                  )}

                  <TextField
                    select
                    size="small"
                    label="Metode Penerimaan *"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="Tunai">Tunai</MenuItem>
                    <MenuItem value="Transfer Bank">Transfer Bank</MenuItem>
                  </TextField>

                  <TextField
                    size="small"
                    label="Catatan Penagihan (opsional)"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    inputProps={{ maxLength: 150 }}
                    fullWidth
                  />

                  <Box>
                    <input
                      hidden
                      id="billing-proof-cam"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleBillingProof}
                    />
                    <label htmlFor="billing-proof-cam">
                      <Button
                        component="span"
                        size="small"
                        variant="outlined"
                        startIcon={<PhotoCameraRoundedIcon />}
                        sx={{ borderRadius: 2 }}
                      >
                        {payProof ? 'Ganti Foto Bukti Pembayaran' : 'Foto Bukti Setor / Transfer (Opsional)'}
                      </Button>
                    </label>
                    {camErr && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                        {camErr}
                      </Typography>
                    )}
                    {payProof && (
                      <Box
                        sx={{
                          position: 'relative',
                          width: 96,
                          height: 96,
                          mt: 1,
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box component="img" src={payProof} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <IconButton
                          size="small"
                          onClick={() => setPayProof('')}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(15,23,42,0.6)', color: '#fff' }}
                        >
                          <CloseRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  {payErr && selectedInvoice?.metodePembayaran === 'cicilan' && (
                    <Alert severity="error">{payErr}</Alert>
                  )}

                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    color={online ? 'success' : 'warning'}
                    startIcon={<PaymentsRoundedIcon />}
                    disabled={submitting || !selectedInvoice}
                    onClick={submitBillingCollection}
                    sx={{ borderRadius: 2 }}
                  >
                    {online ? 'Simpan Pembayaran & Selesaikan Tugas' : 'Simpan Penagihan ke Antrean Offline'}
                  </Button>
                </Stack>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== SELESAI ===== */}
      {task.status === 'done' && (
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack alignItems="center" spacing={0.75} sx={{ py: 1 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mb: 0.5 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 30, color: 'common.white' }} />
              </Avatar>
              <Typography variant="h6" fontWeight={800}>Tugas Selesai</Typography>
              <Typography variant="caption" color="text.secondary">
                Diselesaikan {task.completedAt || '-'} WIB
              </Typography>
              {task.syncedAt && task.syncedAt !== task.completedAt && (
                <Typography variant="caption" color="text.disabled">
                  Disinkronkan ke server: {task.syncedAt} WIB
                </Typography>
              )}
              {task.billingRef && (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  label={`${task.billingRef.invoiceNo} • ${formatRupiah(task.billingRef.nominal)} (${task.billingRef.metode})`}
                />
              )}
            </Stack>
            {task.photos?.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1.5 }}>
                {task.photos.map((ph, i) => (
                  <Box
                    key={i}
                    sx={{
                      aspectRatio: '1',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                ))}
              </Box>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button fullWidth variant="outlined" onClick={() => navigate('/app/tasks')} sx={{ borderRadius: 2 }}>
                Daftar Tugas
              </Button>
              {nextTask && (
                <Button
                  fullWidth
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate(`/app/tasks/${nextTask.id}`)}
                  sx={{ borderRadius: 2 }}
                >
                  Tugas Berikutnya
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ===== GAGAL / DIBATALKAN ===== */}
      {(task.status === 'failed' || task.status === 'cancelled') && (
        <Alert severity={task.status === 'failed' ? 'error' : 'warning'}>
          {task.status === 'failed'
            ? 'Tugas ini tidak selesai di hari penugasan dan otomatis ditandai Gagal — tidak dapat dikerjakan lagi.'
            : 'Tugas ini telah dibatalkan — tidak dapat dikerjakan lagi.'}
        </Alert>
      )}

      {/* Dialog Check-In — membawa task: status otomatis menjadi Berlangsung */}
      <CheckInDialog
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        outlet={outlet}
        task={task}
      />
    </Stack>
  );
}
