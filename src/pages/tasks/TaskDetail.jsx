import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

import CheckInDialog from '../../components/gps/CheckInDialog';
import EmptyState from '../../components/ui/EmptyState';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { TASK_TYPE_LABEL, dateID, todayISO, nowStamp, GEOFENCE_RADIUS_M } from '../../utils/helpers';
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
  const { db, update } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ===== SEMUA HOOKS DI PALING ATAS ===== */
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [camErr, setCamErr] = useState('');

  const task = (db.tasks || []).find((t) => t.id === Number(id));

  /* Reset foto saat berganti tugas */
  useEffect(() => { setPhotos([]); setCamErr(''); }, [id]);

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
  const lastCk = [...(db.checkins || [])].reverse()
    .find((c) => c.salesId === user.salesId && c.outletId === task.outletId && c.date === today);
  const nextTask = (db.tasks || []).find(
    (t) => t.salesId === user.salesId && t.date === today
      && (t.status === 'pending' || t.status === 'in_progress')
  );

  /* ===== Aksi ===== */

  /* Buka halaman aktivitas dengan outlet tugas ini terisi otomatis */
  const openActivity = (path) => navigate(path, { state: { outletId: task.outletId } });

  /* Foto display: kamera langsung + watermark (pola sama dengan modul Audit) */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataURL(file, async (url, err) => {
      if (err || !url) { setCamErr(err || 'Gagal membaca berkas.'); return; }
      setCamErr('');
      const ck = [...(db.checkins || [])].reverse()
        .find((c) => c.salesId === user.salesId && c.outletId === task.outletId && c.date === today);
      const coords = ck ? `${ck.lat.toFixed(5)}, ${ck.lng.toFixed(5)}` : `${outlet?.lat}, ${outlet?.lng}`;
      const marked = await addWatermark(url, [
        `Sales: ${user.name}`,
        `Outlet: ${outlet?.name || '-'}`,
        `Waktu: ${nowStamp()} WIB`,
        `GPS: ${coords}`,
      ]);
      setPhotos((p) => [...p, marked].slice(0, 3));
    });
  };

  const finishDisplay = () => {
    if (!photos.length) return;
    update('tasks', task.id, { status: 'done', completedAt: nowStamp(), photos });
    toast(`Tugas selesai — ${photos.length} foto display tersimpan.`, 'success');
  };

  const finishBilling = () => {
    update('tasks', task.id, { status: 'done', completedAt: nowStamp() });
    toast('Tugas penagihan ditandai selesai.', 'success');
  };

  return (
    <Stack spacing={2}>
      <PageHeaderBack
        title={outlet?.name || 'Detail Tugas'}
        caption={`${TASK_TYPE_LABEL[task.type] || 'Tugas'} • ${dateID(task.date)}`}
        onBack={() => navigate('/app/tasks')}
        right={<StatusChip kind="task" status={task.status} />}
      />

      {/* ===== Kartu outlet ===== */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar variant="rounded" sx={{ bgcolor: `${meta.color}.main`, color: 'common.white', width: 42, height: 42, borderRadius: 2, flexShrink: 0 }}>
              <Icon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} fontSize={15} noWrap>{outlet?.name || 'Outlet tidak ditemukan'}</Typography>
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
            <Button fullWidth size="large" variant="contained" startIcon={<StorefrontRoundedIcon />}
              onClick={() => setCheckInOpen(true)} sx={{ borderRadius: 2 }}>
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

            {task.type === 'order' && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Catat pesanan produk untuk outlet ini — tugas otomatis selesai saat order tersimpan.
                </Typography>
                <Button fullWidth size="large" variant="contained" startIcon={<ShoppingCartRoundedIcon />}
                  onClick={() => openActivity('/app/order')} sx={{ borderRadius: 2 }}>
                  Entry Order untuk Outlet Ini
                </Button>
              </>
            )}

            {task.type === 'audit' && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Audit kondisi toko, stock-take, dan foto bukti — tugas otomatis selesai saat audit terkirim.
                </Typography>
                <Button fullWidth size="large" variant="contained" startIcon={<FactCheckRoundedIcon />}
                  onClick={() => openActivity('/app/audit')} sx={{ borderRadius: 2 }}>
                  Audit & Survey Outlet Ini
                </Button>
              </>
            )}

            {task.type === 'display' && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Dokumentasi pajangan produk — kamera langsung, watermark waktu & GPS otomatis. Maksimal 3 foto.
                </Typography>
                <input hidden id="display-cam" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
                <label htmlFor="display-cam">
                  <Button component="span" fullWidth variant="outlined" startIcon={<PhotoCameraRoundedIcon />}
                    disabled={photos.length >= 3} sx={{ borderRadius: 2 }}>
                    Ambil Foto ({photos.length}/3)
                  </Button>
                </label>
                {camErr && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>{camErr}</Typography>
                )}
                {photos.length > 0 && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1.5 }}>
                    {photos.map((ph, i) => (
                      <Box key={i} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                        <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <IconButton size="small" onClick={() => setPhotos((p) => p.filter((_, x) => x !== i))}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(15,23,42,0.6)', color: '#fff' }}>
                          <CloseRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                <Button fullWidth size="large" variant="contained" color="success" sx={{ mt: 1.5, borderRadius: 2 }}
                  disabled={!photos.length} onClick={finishDisplay}>
                  Selesai & Kirim Foto Display
                </Button>
              </>
            )}

            {task.type === 'billing' && (
              <>
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  Pencatatan pembayaran tagihan ditangani modul Billing (sprint berikutnya).
                  Setelah penagihan selesai dilakukan di lapangan, tandai tugas ini selesai.
                </Alert>
                <Button fullWidth size="large" variant="contained" startIcon={<PaymentsRoundedIcon />}
                  onClick={finishBilling} sx={{ borderRadius: 2 }}>
                  Tandai Penagihan Selesai
                </Button>
              </>
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
            </Stack>
            {task.photos?.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 1.5 }}>
                {task.photos.map((ph, i) => (
                  <Box key={i} sx={{ aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
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
                <Button fullWidth variant="contained" endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate(`/app/tasks/${nextTask.id}`)} sx={{ borderRadius: 2 }}>
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
