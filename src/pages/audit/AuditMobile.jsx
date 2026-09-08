import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

import AuditDetailDialog from '../../components/audit/AuditDetailDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, nowStamp } from '../../utils/helpers';
import { CHECKLIST_ITEMS, CHECK_OPTIONS, auditScore, findSubmittedAudit } from '../../utils/auditUtils';
import { readFileAsDataURL } from '../../utils/files';
import { addWatermark } from '../../utils/watermark';
import { completeTaskAuto } from '../../utils/taskUtils';

const scoreColor = (s) => (s >= 75 ? 'success' : s >= 50 ? 'warning' : 'error');

export default function AuditMobile() {
  const { user } = useAuth();
  const { db, insert, mutate } = useDb();
  const { online, enqueue } = useSync();
  const { toast } = useToast();
  const location = useLocation();

  /* ===== SEMUA HOOKS DI PALING ATAS ===== */
  const [draft, setDraft] = useState(() => (
    location.state?.outletId
      ? { step: 'form', outletId: location.state.outletId, scores: {}, stocks: {}, photos: [], note: '' }
      : null
  ));
  const [outletSearch, setOutletSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraErr, setCameraErr] = useState('');

  const outlet = (db.outlets || []).find((o) => o.id === draft?.outletId);
  const step = draft ? (draft.step === 'form' && !outlet ? 'outlet' : draft.step) : null;

  const outlets = (db.outlets || []).filter((o) => {
    const q = outletSearch.trim().toLowerCase();
    return o.status === 'active' && (!q || o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q));
  });
  const products = (db.products || []).filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return p.status === 'active' && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  });

  const myAudits = (db.audits || []).filter((a) => a.salesId === user.salesId).slice().reverse();
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';

  const answeredCount = Object.keys(draft?.scores || {}).length;
  const stockCount = Object.keys(draft?.stocks || {}).length;
  const liveScore = auditScore(CHECKLIST_ITEMS.map((item, i) => ({ item, score: draft?.scores?.[i] || 0 })));
  const canSubmit = answeredCount === CHECKLIST_ITEMS.length && stockCount > 0 && !submitting; /* #65 */

  const removePhoto = (idx) => setDraft((d) => ({ ...d, photos: d.photos.filter((_, i) => i !== idx) }));

  /* #64 + #37: foto kamera langsung + watermark waktu & GPS otomatis */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataURL(file, async (url, err) => {
      if (err || !url) { setCameraErr(err || 'Gagal membaca berkas.'); return; }
      setCameraErr('');
      const lastCk = [...(db.checkins || [])].reverse().find((c) => c.outletId === draft.outletId && c.date === todayISO());
      const coords = lastCk ? `${lastCk.lat.toFixed(5)}, ${lastCk.lng.toFixed(5)}` : `${outlet.lat}, ${outlet.lng}`;
      const marked = await addWatermark(url, [
        `Sales: ${user.name}`,
        `Outlet: ${outlet.name}`,
        `Waktu: ${nowStamp()} WIB`,
        `GPS: ${coords}`,
      ]);
      setDraft((d) => ({ ...d, photos: [...d.photos, marked].slice(0, 3) }));
    });
  };

  const submitAudit = () => {
    if (!canSubmit) return;
    if (findSubmittedAudit(db, draft.outletId)) {
      toast('Audit outlet ini sudah terkirim hari ini — form terkunci (#66).', 'warning');
      return;
    }
    setSubmitting(true);

    const checklist = CHECKLIST_ITEMS.map((item, i) => ({ item, score: draft.scores[i] }));
    const score = auditScore(checklist);
    const stocks = Object.entries(draft.stocks).map(([pid, actual]) => {
      const p = (db.products || []).find((x) => x.id === Number(pid));
      return { productId: p.id, name: p.name, systemStock: p.stock, actualStock: actual, diff: actual - p.stock };
    });
    const t = todayISO();
    const payload = {
      no: `AUD-${t.replace(/-/g, '')}-${String(
        (db.audits || []).length + 1 + (db.syncQueue || []).filter((x) => x.kind === 'audit').length
      ).padStart(3, '0')}`,
      date: t, salesId: user.salesId, outletId: draft.outletId,
      checklist, score, stocks, photos: draft.photos, note: draft.note.trim(),
      status: 'submitted',
    };

    /* #68: offline → simpan lokal, sinkron otomatis saat pulih */
    if (!online) {
      enqueue('audit', payload);
      toast('Anda sedang offline. Data & foto audit disimpan sementara di perangkat dan tersinkron otomatis saat koneksi pulih (#68).', 'warning', 5500);
      setDraft(null); setSubmitting(false);
      return;
    }

    setTimeout(() => {
      const rec = insert('audits', payload);
      completeTaskAuto(db, mutate, { outletId: draft.outletId, type: 'audit', salesId: user.salesId }); /* BR-TASK-003 */
      toast(`Audit ${rec.no} tersimpan — skor ${score}/100. Form terkunci untuk kunjungan ini (#66).`, 'success');
      setSubmitting(false);
      setDraft(null);
      setDetailId(rec.id);
    }, 500);
  };

  /* ===================== VIEW: DAFTAR ===================== */
  if (!step) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Audit &amp; Survey</Typography>
          <Button variant="contained" size="small" startIcon={<FactCheckRoundedIcon />}
            onClick={() => setDraft({ step: 'outlet', scores: {}, stocks: {}, photos: [], note: '' })}>
            Mulai Audit
          </Button>
        </Stack>
        <Card>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="body2" color="text.secondary">
              Formulir digital: checklist kondisi toko, stock-take aktual, dan foto bukti (kamera langsung).
              Satu submit per outlet per kunjungan (#66).
            </Typography>
          </CardContent>
        </Card>
        {myAudits.length ? myAudits.map((a) => (
          <Card key={a.id} onClick={() => setDetailId(a.id)} sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={700} fontSize={14}>{outletName(a.outletId)}</Typography>
                <Chip size="small" color={scoreColor(a.score)} variant="outlined" label={`${a.score}/100`} />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block">
                {a.no} • {a.date} • {a.photos?.length || 0} foto
              </Typography>
            </CardContent>
          </Card>
        )) : <EmptyState message="Belum ada laporan audit." />}

        <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} />
      </Stack>
    );
  }

  /* ===================== VIEW: PILIH OUTLET ===================== */
  if (step === 'outlet') {
    return (
      <Stack spacing={1.5}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => setDraft(null)} sx={{ alignSelf: 'flex-start' }}>
          Batal
        </Button>
        <Card>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'center' }}>
            <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}><FactCheckRoundedIcon /></Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={15}>Pilih Outlet untuk Audit</Typography>
              <Typography variant="caption" color="text.secondary">Nama outlet ditarik dari Master Data (#62).</Typography>
            </Box>
          </CardContent>
        </Card>
        <TextField label="Cari outlet…" value={outletSearch} onChange={(e) => setOutletSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
        {outlets.map((o) => {
          const done = findSubmittedAudit(db, o.id); /* #66 */
          return (
            <Card key={o.id}
              onClick={() => (done ? setDetailId(done.id) : setDraft({ step: 'form', outletId: o.id, scores: {}, stocks: {}, photos: [], note: '' }))}
              sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40 }}>
                  <StorefrontRoundedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={14} noWrap>{o.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">{o.address}</Typography>
                </Box>
                {done && <Chip size="small" color="success" icon={<LockRoundedIcon />} label="Sudah diaudit" />}
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  }

  /* ===================== VIEW: FORM AUDIT ===================== */
  const locked = findSubmittedAudit(db, outlet.id); /* #66 */

  if (locked) {
    return (
      <Stack spacing={2}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => setDraft(null)} sx={{ alignSelf: 'flex-start' }}>
          Kembali
        </Button>
        <Alert severity="warning" icon={<LockRoundedIcon fontSize="small" />}
          action={<Button size="small" onClick={() => setDetailId(locked.id)}>Lihat Hasil</Button>}>
          Outlet <b>{outlet.name}</b> sudah diaudit hari ini — form <b>terkunci</b> untuk mencegah data ganda (#66).
        </Alert>
        <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => setDraft(null)} sx={{ alignSelf: 'flex-start' }}>
        Batal Audit
      </Button>

      <Card>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography fontWeight={700} fontSize={15}>Audit — {outlet.name}</Typography>
              <Typography variant="caption" color="text.secondary">{outlet.address}</Typography>
            </Box>
            <Chip size="small" color={scoreColor(liveScore)} variant="outlined" label={`Skor ${liveScore}/100`} />
          </Stack>
        </CardContent>
      </Card>

      {/* 1 — Checklist */}
      <Card>
        <CardHeader title="1 · Checklist Kondisi & Kebersihan (#62)" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
        <CardContent sx={{ pt: 0 }}>
          {CHECKLIST_ITEMS.map((item, i) => (
            <Box key={item} sx={{ mb: 1.5 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>{item}</Typography>
              <ToggleButtonGroup
                exclusive size="small"
                value={draft.scores[i] ?? null}
                onChange={(e, v) => v != null && setDraft((d) => ({ ...d, scores: { ...d.scores, [i]: v } }))}
              >
                {CHECK_OPTIONS.map((o) => (
                  <ToggleButton key={o.v} value={o.v} sx={{ py: 0.25, px: 2.5 }}>{o.l}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* 2 — Stock take */}
      <Card>
        <CardHeader title="2 · Stock-Take (Stok Aktual di Toko — #63)" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Bandingkan dengan data gudang/master. Wajib isi minimal 1 produk (#65).
          </Typography>
          <TextField label="Cari produk…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
            sx={{ mb: 1 }} />
          {products.map((p) => {
            const actual = draft.stocks[p.id] ?? '';
            const diff = actual === '' ? null : Number(actual) - p.stock;
            return (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sistem (gudang): {p.stock} pcs{p.pcsPerUnit > 1 ? ` • 1 ${p.unit} = ${p.pcsPerUnit} pcs` : ''}
                  </Typography>
                </Box>
                <TextField type="number" placeholder="Aktual" value={actual} sx={{ width: 96 }}
                  onChange={(e) => setDraft((d) => {
                    const stocks = { ...d.stocks };
                    if (e.target.value === '') delete stocks[p.id];
                    else stocks[p.id] = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    return { ...d, stocks };
                  })}
                  inputProps={{ min: 0, style: { textAlign: 'center' } }} />
                {diff !== null && (diff === 0
                  ? <Chip size="small" color="success" variant="outlined" label="sesuai" />
                  : <Chip size="small" color="error" label={`${diff > 0 ? '+' : ''}${diff}`} />)}
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* 3 — Foto bukti */}
      <Card>
        <CardHeader title="3 · Foto Bukti Kunjungan (maks 3 × 2MB)" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
        <CardContent sx={{ pt: 0 }}>
          <input hidden id="audit-cam" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
          <label htmlFor="audit-cam">
            <Button component="span" variant="outlined" startIcon={<PhotoCameraRoundedIcon />} disabled={draft.photos.length >= 3}>
              Ambil Foto (Kamera Langsung)
            </Button>
          </label>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1 }}>
            Wajib kamera langsung — galeri/Camera Roll ditolak (#64). Watermark waktu + GPS otomatis diterapkan.
          </Typography>
          {cameraErr && <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>{cameraErr}</Typography>}
          {draft.photos.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {draft.photos.map((ph, i) => (
                <Box key={i} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" onClick={() => removePhoto(i)}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(15,23,42,0.6)', color: '#fff' }}>
                    <CloseRoundedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 4 — Catatan */}
      <Card>
        <CardHeader title="4 · Catatan Kendala (maks 500)" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
        <CardContent sx={{ pt: 0 }}>
          <TextField label="mis. toko tutup sementara / POSM usai" multiline minRows={2}
            value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            inputProps={{ maxLength: 500 }} />
        </CardContent>
      </Card>

      <Button variant="contained" size="large" disabled={!canSubmit} onClick={submitAudit}>
        {submitting ? 'Mengirim…' : 'Kirim Hasil Audit'}
      </Button>
      <Typography variant="caption" color="text.secondary" align="center">
        Tombol kirim baru aktif setelah seluruh isian wajib terisi: 5 checklist + minimal 1 stok aktual (#65).
        {online ? '' : ' Saat offline, data tersimpan lokal & tersinkron otomatis (#68).'}
      </Typography>

      <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} />
    </Stack>
  );
}