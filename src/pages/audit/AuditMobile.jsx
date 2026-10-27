import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';

import AuditDetailDialog from '../../components/audit/AuditDetailDialog';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, nowStamp } from '../../utils/helpers';
import {
  CHECK_OPTIONS,
  auditScore,
  buildChecklistSnapshot,
  findSubmittedAudit,
  getActiveAuditTemplate,
  getOutletProductRefStock,
  getOutletStockHealth,
  formatStockMovement,
} from '../../utils/auditUtils';
import { readFileAsDataURL } from '../../utils/files';
import { addWatermark } from '../../utils/watermark';
import { completeTaskAuto } from '../../utils/taskUtils';

const scoreColor = (s) => (s >= 75 ? 'success' : s >= 50 ? 'warning' : 'error');

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

function SubmitBar({ ready, actionLabel, statusText, onClick, loading }) {
  return (
    <Box onClick={ready && !loading ? onClick : undefined} sx={{
      position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: 398,
      bgcolor: ready ? 'primary.main' : 'action.disabledBackground',
      color: ready ? '#fff' : 'text.disabled',
      borderRadius: 2.5, px: 2, py: 1.25,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      cursor: ready && !loading ? 'pointer' : 'default', zIndex: 1150, boxShadow: 4,
    }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography fontWeight={800} fontSize={14} noWrap>{loading ? 'Mengirim…' : actionLabel}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }} noWrap>{statusText}</Typography>
      </Box>
      {!loading && <ArrowForwardRoundedIcon fontSize="small" />}
    </Box>
  );
}

const emptyLeadForm = (defaultAreaId = '', defaultCatId = '') => ({
  name: '',
  owner: '',
  phone: '',
  address: '',
  areaId: defaultAreaId ? String(defaultAreaId) : '',
  categoryId: defaultCatId ? String(defaultCatId) : '',
  lat: '',
  lng: '',
  photos: [],
  note: '',
});

export default function AuditMobile() {
  const { user } = useAuth();
  const { db, insert, mutate } = useDb();
  const { online, enqueue, notify } = useSync();
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const salesProfile = (db.sales || []).find((s) => s.id === user.salesId);
  const activeCategories = (db.prospectCategories || []).filter((c) => (c.status || 'active') === 'active');
  const activeAreas = (db.areas || []).filter((a) => (a.status || 'active') === 'active');
  const activeTemplate = getActiveAuditTemplate(db);
  const questions = activeTemplate.questions || [];

  /* ===== SEMUA HOOKS DI PALING ATAS ===== */
  const [homeTab, setHomeTab] = useState(() => (
    searchParams.get('tab') === 'prospect' ? 'prospect' : 'audit'
  ));
  const [draft, setDraft] = useState(() => {
    if (location.state?.outletId) {
      return { step: 'form', outletId: location.state.outletId, answers: {}, stocks: {}, photos: [], note: '' };
    }
    if (searchParams.get('new') === '1' && searchParams.get('tab') === 'prospect') {
      return { step: 'new_lead' };
    }
    return null;
  });

  const [leadForm, setLeadForm] = useState(() =>
    emptyLeadForm(salesProfile?.areaId || activeAreas[0]?.id, activeCategories[0]?.id)
  );
  const [leadErr, setLeadErr] = useState({});
  const [locLoading, setLocLoading] = useState(false);

  const [outletSearch, setOutletSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraErr, setCameraErr] = useState('');

  /* Sinkronisasi bila user menekan shortcut "+ Akuisisi Prospek" saat sudah berada di /app/audit */
  useEffect(() => {
    const tParam = searchParams.get('tab');
    const newParam = searchParams.get('new');
    if (tParam === 'prospect') {
      setHomeTab('prospect');
      if (newParam === '1') {
        setLeadForm(emptyLeadForm(salesProfile?.areaId || activeAreas[0]?.id, activeCategories[0]?.id));
        setLeadErr({});
        setDraft({ step: 'new_lead' });
        setSearchParams({ tab: 'prospect' }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const outlet = (db.outlets || []).find((o) => o.id === draft?.outletId);
  const step = draft ? (draft.step === 'form' && !outlet ? 'outlet' : draft.step) : null;

  const outlets = (db.outlets || []).filter((o) => {
    const q = outletSearch.trim().toLowerCase();
    return o.status === 'active' && (!q || o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q));
  });
  const ckOutlets = new Set(
    (db.checkins || [])
      .filter((c) => c.salesId === user.salesId && c.date === todayISO())
      .map((c) => c.outletId)
  );
  const products = (db.products || []).filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return p.status === 'active' && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  });

  const myAudits = (db.audits || []).filter((a) => a.salesId === user.salesId).slice().reverse();
  const queuedLeads = (db.syncQueue || [])
    .filter((q) => q.kind === 'prospect' && q.payload?.salesId === user.salesId)
    .map((q) => ({ ...q.payload, id: `q_${q.id}`, _queued: true }));
  const myProspects = [
    ...queuedLeads,
    ...(db.prospects || []).filter((p) => p.salesId === user.salesId).slice().reverse(),
  ];

  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const areaName = (id) => (db.areas || []).find((a) => a.id === Number(id))?.name || '-';
  const catOf = (id) => (db.prospectCategories || []).find((c) => c.id === Number(id));

  /* Validasi kelengkapan kuesioner dinamis */
  const isQuestionAnswered = (q, idx) => {
    const val = draft?.answers?.[q.id || String(idx)];
    if (q.type === 'text') return String(val ?? '').trim().length > 0;
    return val !== undefined && val !== null && val !== '';
  };

  const requiredQuestions = questions.filter((q) => q.required !== false);
  const answeredRequiredCount = requiredQuestions.filter((q) => {
    const idx = questions.indexOf(q);
    return isQuestionAnswered(q, idx);
  }).length;
  const totalAnsweredCount = questions.filter((q, idx) => isQuestionAnswered(q, idx)).length;

  const stockCount = Object.keys(draft?.stocks || {}).length;
  const liveChecklist = buildChecklistSnapshot(questions, draft?.answers || {});
  const liveScore = auditScore(liveChecklist);
  const canSubmit = answeredRequiredCount === requiredQuestions.length && stockCount > 0 && !submitting;

  const removePhoto = (idx) => setDraft((d) => ({ ...d, photos: d.photos.filter((_, i) => i !== idx) }));

  /* Foto kamera langsung + watermark untuk Audit Outlet */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataURL(file, async (url, err) => {
      if (err || !url) { setCameraErr(err || 'Gagal membaca berkas.'); return; }
      setCameraErr('');
      const lastCk = [...(db.checkins || [])].reverse().find(
        (c) => c.salesId === user.salesId && c.outletId === draft.outletId && c.date === todayISO()
      );
      const coords = lastCk ? `${lastCk.lat.toFixed(5)}, ${lastCk.lng.toFixed(5)}` : `${outlet.lat}, ${outlet.lng}`;
      const marked = await addWatermark(url, [
        `Sales: ${user.name}`,
        `Outlet: ${outlet.name}`,
        `Waktu: ${nowStamp()} WIB`,
        `GPS: ${coords}`,
      ]);
      setDraft((d) => ({ ...d, photos: [...d.photos, marked].slice(0, 3) }));
    });
    e.target.value = '';
  };

  /* Submit Audit dengan snapshot versi template dinamis */
  const submitAudit = () => {
    if (!canSubmit) return;
    if (findSubmittedAudit(db, draft.outletId)) {
      toast('Audit outlet ini sudah terkirim hari ini — form terkunci.', 'warning');
      return;
    }
    setSubmitting(true);

    const checklist = buildChecklistSnapshot(questions, draft.answers || {});
    const score = auditScore(checklist);
    const stocks = Object.entries(draft.stocks).map(([pid, actual]) => {
      const p = (db.products || []).find((x) => x.id === Number(pid));
      if (!p) return null;
      const refStock = getOutletProductRefStock(db, draft.outletId, p.id);
      const actualNum = Number(actual);
      const health = getOutletStockHealth(actualNum);
      return {
        productId: p.id,
        name: p.name,
        systemStock: refStock,
        actualStock: actualNum,
        diff: refStock === null ? 0 : actualNum - refStock,
        stockStatus: health.key,
      };
    }).filter(Boolean);

    const t = todayISO();
    const payload = {
      no: `AUD-${t.replace(/-/g, '')}-${String(
        (db.audits || []).length + 1 + (db.syncQueue || []).filter((x) => x.kind === 'audit').length
      ).padStart(3, '0')}`,
      date: t,
      salesId: user.salesId,
      outletId: draft.outletId,
      templateId: activeTemplate.id,
      templateCode: activeTemplate.code || 'TPL-AUD-001',
      templateName: activeTemplate.name,
      templateVersion: activeTemplate.version || 1,
      checklist,
      score,
      stocks,
      photos: draft.photos,
      note: draft.note.trim(),
      status: 'submitted',
    };

    if (!online) {
      enqueue('audit', payload);
      toast('Anda sedang offline. Data & foto audit disimpan di perangkat dan tersinkron otomatis saat koneksi pulih.', 'warning', 5500);
      setDraft(null);
      setSubmitting(false);
      return;
    }

    setTimeout(() => {
      const rec = insert('audits', payload);
      completeTaskAuto(db, mutate, { outletId: draft.outletId, type: 'audit', salesId: user.salesId });
      toast(`Audit ${rec.no} (Form v${payload.templateVersion}) tersimpan — skor ${score}/100.`, 'success');
      setSubmitting(false);
      setDraft(null);
      setDetailId(rec.id);
    }, 400);
  };

  /* ===== Logika Akuisisi Prospek Baru (New Lead — BR-MD-LEAD-002 & Bab 4.6) ===== */
  const openNewLeadForm = () => {
    setCameraErr('');
    setLeadErr({});
    setLeadForm(emptyLeadForm(salesProfile?.areaId || activeAreas[0]?.id, activeCategories[0]?.id));
    setDraft({ step: 'new_lead' });
  };

  const captureLeadGps = () => {
    if (!navigator.geolocation) {
      toast('Perangkat/browser tidak mendukung Geolocation GPS.', 'warning');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLeadForm((f) => ({ ...f, lat: String(lat), lng: String(lng) }));
        setLeadErr((e) => ({ ...e, coords: '' }));

        /* Reverse Geocoding Nominatim otomatis jika online */
        if (online) {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`
            );
            if (res.ok) {
              const data = await res.json();
              if (data?.display_name) {
                setLeadForm((f) => ({
                  ...f,
                  address: f.address.trim() ? f.address : data.display_name.slice(0, 200),
                }));
              }
            }
          } catch {
            /* Abaikan jika jaringan lambat; koordinat tetap tersimpan */
          }
        }
        setLocLoading(false);
        toast('Titik koordinat GPS toko prospek berhasil dikunci.', 'success');
      },
      () => {
        /* Fallback ke titik tengah Area Kerja Sales jika izin GPS ditolak pada mode demo */
        const fallbackArea = (db.areas || []).find((a) => a.id === Number(leadForm.areaId || salesProfile?.areaId));
        if (fallbackArea?.lat && fallbackArea?.lng) {
          setLeadForm((f) => ({
            ...f,
            lat: String(fallbackArea.lat),
            lng: String(fallbackArea.lng),
          }));
          toast('Izin GPS browser ditolak — menggunakan koordinat referensi Area Kerja.', 'info');
        } else {
          toast('Gagal mengambil lokasi GPS. Pastikan izin lokasi diaktifkan.', 'warning');
        }
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleLeadPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataURL(file, async (url, err) => {
      if (err || !url) { setCameraErr(err || 'Gagal membaca foto.'); return; }
      setCameraErr('');
      const coords = leadForm.lat && leadForm.lng ? `${leadForm.lat}, ${leadForm.lng}` : 'Belum dikunci';
      const marked = await addWatermark(url, [
        `Prospek Baru: ${leadForm.name.trim() || 'Toko Lapangan'}`,
        `Sales: ${user.name}`,
        `Waktu: ${nowStamp()} WIB`,
        `GPS: ${coords}`,
      ]);
      setLeadForm((f) => ({ ...f, photos: [...f.photos, marked].slice(0, 2) }));
    });
    e.target.value = '';
  };

  const submitNewLead = () => {
    const errs = {};
    const cleanPhone = leadForm.phone.replace(/\D/g, '');
    if (!leadForm.name.trim()) errs.name = 'Nama toko prospek wajib diisi.';
    if (!leadForm.categoryId) errs.cd = 'Kategori prospek wajib dipilih dari Master Data.';
    if (!leadForm.owner.trim()) errs.owner = 'Nama pemilik / PIC toko wajib diisi.';
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
      errs.phone = 'Nomor telepon wajib berupa 10–15 digit angka.';
    }
    if (!leadForm.areaId) errs.areaId = 'Area kerja wajib dipilih.';
    if (!leadForm.address.trim()) errs.address = 'Alamat lengkap toko prospek wajib diisi.';

    /* Cek duplikasi nama prospek di area yang sama */
    const dup = (db.prospects || []).find(
      (p) =>
        p.name.trim().toLowerCase() === leadForm.name.trim().toLowerCase() &&
        Number(p.areaId) === Number(leadForm.areaId)
    );
    if (dup) errs.name = 'Toko prospek dengan nama ini sudah terdaftar di area kerja tersebut.';

    setLeadErr(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const latNum = leadForm.lat !== '' ? Number(leadForm.lat) : null;
    const lngNum = leadForm.lng !== '' ? Number(leadForm.lng) : null;

    const payload = {
      name: leadForm.name.trim(),
      owner: leadForm.owner.trim(),
      phone: cleanPhone,
      address: leadForm.address.trim(),
      areaId: Number(leadForm.areaId),
      salesId: user.salesId,
      categoryId: Number(leadForm.categoryId),
      status: 'Prospek',
      source: 'mobile_sales',
      date: todayISO(),
      lat: Number.isFinite(latNum) ? latNum : null,
      lng: Number.isFinite(lngNum) ? lngNum : null,
      photos: leadForm.photos,
      note: leadForm.note.trim(),
    };

    if (!online) {
      enqueue('prospect', payload);
      toast('Offline: Prospek baru disimpan di perangkat & otomatis terkirim saat koneksi pulih.', 'warning', 5000);
      setSubmitting(false);
      setHomeTab('prospect');
      setDraft(null);
      return;
    }

    setTimeout(() => {
      insert('prospects', payload);
      /* Kirim notifikasi ke Supervisor atasan Sales */
      if (salesProfile?.supervisorId) {
        const spvMaster = (db.supervisors || []).find((s) => s.id === salesProfile.supervisorId);
        const spvUser = spvMaster ? (db.users || []).find((u) => u.email === spvMaster.email) : null;
        if (spvUser) {
          const catLabel = catOf(payload.categoryId)?.name || 'Prospek';
          notify(
            spvUser.id,
            'Akuisisi Prospek Baru Lapangan',
            `${user.name} mendaftarkan prospek baru "${payload.name}" (${catLabel}).`
          );
        }
      }
      toast(`Toko prospek "${payload.name}" berhasil didaftarkan.`, 'success');
      setSubmitting(false);
      setHomeTab('prospect');
      setDraft(null);
    }, 350);
  };

  /* ===================== VIEW 1: FORM AKUISISI PROSPEK BARU (NEW LEAD) ===================== */
  if (step === 'new_lead') {
    const selectedCat = catOf(leadForm.categoryId);
    const leadReady = Boolean(
      leadForm.name.trim() &&
      leadForm.categoryId &&
      leadForm.owner.trim() &&
      leadForm.phone.trim() &&
      leadForm.areaId &&
      leadForm.address.trim()
    ) && !submitting;

    return (
      <Stack spacing={1.5} sx={{ pb: 8 }}>
        <PageHeaderBack
          title="Akuisisi Prospek Baru"
          caption="Pendaftaran calon pelanggan baru di lapangan (BR-MD-LEAD-002)"
          onBack={() => setDraft(null)}
        />

        {!online && (
          <Alert severity="warning" icon={<WifiOffRoundedIcon fontSize="small" />}>
            Mode <b>Offline</b> — data prospek baru akan disimpan di antrean lokal dan disinkronkan saat online.
          </Alert>
        )}

        {/* 1. Identitas & Kategori Prospek */}
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardHeader title="1 · Identitas & Klasifikasi Awal" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.75}>
              <TextField
                size="small"
                label="Nama Toko / Prospek Baru *"
                placeholder="mis. Toko Berkah Mandiri"
                value={leadForm.name}
                onChange={(e) => { setLeadForm((f) => ({ ...f, name: e.target.value })); setLeadErr((p) => ({ ...p, name: '' })); }}
                error={!!leadErr.name}
                helperText={leadErr.name || ''}
                inputProps={{ maxLength: 100 }}
                fullWidth
              />

              <TextField
                select
                size="small"
                label="Kategori Prospek (Master Data) *"
                value={leadForm.categoryId}
                onChange={(e) => { setLeadForm((f) => ({ ...f, categoryId: e.target.value })); setLeadErr((p) => ({ ...p, categoryId: '' })); }}
                error={!!leadErr.categoryId}
                helperText={leadErr.categoryId || (selectedCat?.desc ? `${selectedCat.desc}` : 'Pilih tingkat potensi toko prospek')}
                fullWidth
              >
                {activeCategories.length ? activeCategories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}{c.priority ? ` — Prioritas ${c.priority}` : ''}
                  </MenuItem>
                )) : (
                  <MenuItem value="" disabled>Master Kategori Prospek belum tersedia</MenuItem>
                )}
              </TextField>

              <TextField
                size="small"
                label="Nama Pemilik / PIC Toko *"
                placeholder="mis. Bpk. Hendra"
                value={leadForm.owner}
                onChange={(e) => { setLeadForm((f) => ({ ...f, owner: e.target.value })); setLeadErr((p) => ({ ...p, owner: '' })); }}
                error={!!leadErr.owner}
                helperText={leadErr.owner || ''}
                inputProps={{ maxLength: 100 }}
                fullWidth
              />

              <TextField
                size="small"
                label="No. Telepon / WhatsApp *"
                placeholder="0812xxxxxxxx"
                value={leadForm.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d+]/g, '');
                  setLeadForm((f) => ({ ...f, phone: digits }));
                  setLeadErr((p) => ({ ...p, phone: '' }));
                }}
                error={!!leadErr.phone}
                helperText={leadErr.phone || '10–15 digit angka aktif'}
                inputProps={{ maxLength: 15, inputMode: 'tel' }}
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>

        {/* 2. Lokasi Area & GPS Lapangan */}
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardHeader title="2 · Lokasi & Titik GPS Toko" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              <TextField
                select
                size="small"
                label="Area Kerja *"
                value={leadForm.areaId}
                onChange={(e) => { setLeadForm((f) => ({ ...f, areaId: e.target.value })); setLeadErr((p) => ({ ...p, areaId: '' })); }}
                error={!!leadErr.areaId}
                helperText={leadErr.areaId || ''}
                fullWidth
              >
                {activeAreas.map((a) => (
                  <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>
                ))}
              </TextField>

              <Button
                variant="outlined"
                onClick={captureLeadGps}
                disabled={locLoading}
                startIcon={locLoading ? <CircularProgress size={16} /> : <MyLocationRoundedIcon />}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 700 }}
              >
                {locLoading
                  ? 'Mengambil titik GPS & alamat…'
                  : (leadForm.lat && leadForm.lng
                    ? `GPS Terkunci (${leadForm.lat}, ${leadForm.lng}) — Perbarui`
                    : 'Ambil Titik GPS & Isi Alamat Otomatis')}
              </Button>

              <TextField
                size="small"
                label="Alamat Lengkap Toko *"
                placeholder="Nama jalan, nomor ruko/toko, kelurahan…"
                multiline
                minRows={2}
                value={leadForm.address}
                onChange={(e) => { setLeadForm((f) => ({ ...f, address: e.target.value })); setLeadErr((p) => ({ ...p, address: '' })); }}
                error={!!leadErr.address}
                helperText={leadErr.address || ''}
                inputProps={{ maxLength: 200 }}
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>

        {/* 3. Foto Toko & Catatan Potensi */}
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardHeader title={`3 · Foto Depan Toko & Catatan (${leadForm.photos.length}/2)`} titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={1.5}>
              <Box>
                <input hidden id="lead-cam" type="file" accept="image/*" capture="environment" onChange={handleLeadPhoto} />
                <label htmlFor="lead-cam">
                  <Button component="span" size="small" variant="outlined" startIcon={<PhotoCameraRoundedIcon />} disabled={leadForm.photos.length >= 2}>
                    Foto Tampak Depan Toko
                  </Button>
                </label>
                {cameraErr && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{cameraErr}</Typography>}
              </Box>

              {leadForm.photos.length > 0 && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  {leadForm.photos.map((ph, i) => (
                    <Box key={i} sx={{ position: 'relative', aspectRatio: '4/3', borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton
                        size="small"
                        onClick={() => setLeadForm((f) => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(15,23,42,0.65)', color: '#fff' }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              <TextField
                size="small"
                label="Catatan Potensi / Minat Produk"
                placeholder="mis. Berminat paket minuman kemasan & sembako, minta dikunjungi pekan depan"
                multiline
                minRows={2}
                value={leadForm.note}
                onChange={(e) => setLeadForm((f) => ({ ...f, note: e.target.value }))}
                inputProps={{ maxLength: 255 }}
                fullWidth
              />
            </Stack>
          </CardContent>
        </Card>

        <SubmitBar
          ready={leadReady}
          loading={submitting}
          actionLabel="Daftarkan Prospek Baru"
          statusText={selectedCat ? `Kategori: ${selectedCat.name} • PIC: ${user.name}` : 'Lengkapi kolom bertanda *'}
          onClick={submitNewLead}
        />
      </Stack>
    );
  }

  /* ===================== VIEW 2: DAFTAR AUDIT & DAFTAR PROSPEK SALES ===================== */
  if (!step) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={800}>Audit &amp; Prospek</Typography>
          {homeTab === 'audit' ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<FactCheckRoundedIcon />}
              onClick={() => setDraft({ step: 'outlet', answers: {}, stocks: {}, photos: [], note: '' })}
            >
              Mulai Audit
            </Button>
          ) : (
            <Button
              variant="contained"
              size="small"
              color="primary"
              startIcon={<AddBusinessRoundedIcon />}
              onClick={openNewLeadForm}
            >
              Prospek Baru
            </Button>
          )}
        </Stack>

        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={homeTab}
            onChange={(_, v) => setHomeTab(v)}
            variant="fullWidth"
            sx={{ minHeight: 42 }}
          >
            <Tab
              value="audit"
              icon={<FactCheckRoundedIcon fontSize="small" />}
              iconPosition="start"
              label={`Audit Toko (${myAudits.length})`}
              sx={{ minHeight: 42, textTransform: 'none', fontWeight: 700, fontSize: 13 }}
            />
            <Tab
              value="prospect"
              icon={<TrackChangesRoundedIcon fontSize="small" />}
              iconPosition="start"
              label={`Prospek Baru (${myProspects.length})`}
              sx={{ minHeight: 42, textTransform: 'none', fontWeight: 700, fontSize: 13 }}
            />
          </Tabs>
        </Card>

        {homeTab === 'audit' ? (
          <>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={800} color="primary.main">
                    Template Aktif: {activeTemplate.name}
                  </Typography>
                  <Chip size="small" color="primary" variant="outlined" label={`v${activeTemplate.version}`} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
                </Stack>
                <Typography variant="body2" color="text.secondary" fontSize={12.5}>
                  {questions.length} pertanyaan kuesioner aktif, stock-take aktual, dan foto bukti ber-watermark. Satu submit per outlet per kunjungan.
                </Typography>
              </CardContent>
            </Card>

            {myAudits.length ? myAudits.map((a) => (
              <Card
                key={a.id}
                elevation={0}
                onClick={() => setDetailId(a.id)}
                sx={{ cursor: 'pointer', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              >
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700} fontSize={14}>{outletName(a.outletId)}</Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip size="small" variant="outlined" label={`v${a.templateVersion || 1}`} sx={{ height: 22, fontSize: 11 }} />
                      <Chip size="small" color={scoreColor(a.score)} variant="outlined" label={`${a.score}/100`} />
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {a.no} • {a.date} • {a.photos?.length || 0} foto
                  </Typography>
                </CardContent>
              </Card>
            )) : <EmptyState message="Belum ada laporan audit." />}
          </>
        ) : (
          <>
            <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Typography variant="body2" color="text.secondary" fontSize={12.5}>
                  Temukan toko potensial yang belum terdaftar saat kunjungan lapangan? Daftarkan sebagai <b>Prospek Baru (New Lead)</b> beserta kategori potensi untuk ditindaklanjuti bersama Supervisor.
                </Typography>
              </CardContent>
            </Card>

            {myProspects.length ? myProspects.map((p) => {
              const cat = catOf(p.categoryId);
              return (
                <Card key={p.id} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} fontSize={14} noWrap>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          {p.owner || '-'} • {p.phone || '-'} • {areaName(p.areaId)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        {p._queued && <Chip size="small" color="warning" label="Antrean Offline" sx={{ height: 22, fontSize: 11 }} />}
                        {cat && <Chip size="small" color="primary" variant="outlined" label={cat.name} sx={{ height: 22, fontSize: 11 }} />}
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {p.address || '-'}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
                      <Chip size="small" label={p.status || 'Prospek'} sx={{ height: 20, fontSize: 11 }} />
                      {p.lat && p.lng && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                          GPS: {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            }) : (
              <EmptyState message="Belum ada toko prospek yang Anda daftarkan." />
            )}
          </>
        )}

        <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} />
      </Stack>
    );
  }

  /* ===================== VIEW 3: PILIH OUTLET AUDIT ===================== */
  if (step === 'outlet') {
    return (
      <Stack spacing={1.5}>
        <PageHeaderBack
          title="Pilih Outlet Audit"
          caption={`Form Aktif: v${activeTemplate.version} • ${activeTemplate.name}`}
          onBack={() => setDraft(null)}
        />
        <TextField
          label="Cari outlet…"
          value={outletSearch}
          onChange={(e) => setOutletSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }}
        />
        {outlets.length ? outlets.map((o) => {
          const done = findSubmittedAudit(db, o.id);
          return (
            <Card
              key={o.id}
              elevation={0}
              onClick={() => (
                done
                  ? setDetailId(done.id)
                  : (ckOutlets.has(o.id)
                    ? setDraft({ step: 'form', outletId: o.id, answers: {}, stocks: {}, photos: [], note: '' })
                    : toast('Outlet belum check-in hari ini — buka halaman Rute (menu bawah) untuk check-in terlebih dahulu.', 'warning'))
              )}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                opacity: done ? 0.75 : 1,
              }}
            >
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40, borderRadius: 2 }}>
                  <StorefrontRoundedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={14} noWrap>{o.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">{o.address}</Typography>
                </Box>
                {done && <Chip size="small" color="success" icon={<LockRoundedIcon />} label="Sudah diaudit" />}
                {!done && !ckOutlets.has(o.id) && <Chip size="small" color="warning" variant="outlined" label="Belum Check-In" />}
              </CardContent>
            </Card>
          );
        }) : <EmptyState message="Outlet tidak ditemukan." />}

        <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} />
      </Stack>
    );
  }

  /* ===================== VIEW 4: FORM AUDIT KUESIONER DINAMIS ===================== */
  const locked = findSubmittedAudit(db, outlet.id);

  if (locked) {
    return (
      <Stack spacing={2}>
        <PageHeaderBack title="Audit Terkunci" caption={outlet.name} onBack={() => setDraft(null)} />
        <Alert
          severity="warning"
          icon={<LockRoundedIcon fontSize="small" />}
          action={<Button size="small" onClick={() => setDetailId(locked.id)}>Lihat Hasil</Button>}
        >
          Outlet <b>{outlet.name}</b> sudah diaudit hari ini — form <b>terkunci</b> untuk mencegah data ganda.
        </Alert>
        <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} />
      </Stack>
    );
  }

  const setAnswer = (key, val) => {
    setDraft((d) => ({ ...d, answers: { ...(d.answers || {}), [key]: val } }));
  };

  return (
    <Stack spacing={1.5} sx={{ pb: 7 }}>
      <PageHeaderBack
        title="Audit — Form Kunjungan"
        caption={`${outlet.name} • Form v${activeTemplate.version}`}
        onBack={() => setDraft(null)}
        right={<Chip size="small" color={scoreColor(liveScore)} variant="outlined" label={`Skor ${liveScore}/100`} />}
      />

      {!online && (
        <Alert severity="warning" icon={<WifiOffRoundedIcon fontSize="small" />}>
          Anda sedang <b>offline</b> — data &amp; foto akan disimpan lokal di perangkat dan tersinkron otomatis saat koneksi pulih.
        </Alert>
      )}

      {/* 1 — Kuesioner Dinamis dari Template Aktif */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardHeader
          title={`1 · ${activeTemplate.name} (v${activeTemplate.version}) — ${totalAnsweredCount}/${questions.length}`}
          subheader={activeTemplate.description || undefined}
          titleTypographyProps={{ fontSize: 14, fontWeight: 700 }}
          subheaderTypographyProps={{ fontSize: 12 }}
        />
        <CardContent sx={{ pt: 0 }}>
          {questions.map((q, i) => {
            const qKey = q.id || String(i);
            const curVal = draft.answers?.[qKey] ?? null;
            const type = q.type || 'scale_3';

            return (
              <Box key={qKey} sx={{ mb: 1.75 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.6 }}>
                  {i + 1}. {q.label}
                  {q.required !== false && <Box component="span" sx={{ color: 'error.main' }}> *</Box>}
                  {Number(q.weight) > 1 && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                      (Bobot {q.weight}x)
                    </Typography>
                  )}
                </Typography>

                {type === 'scale_3' && (
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={curVal}
                    onChange={(_, v) => v != null && setAnswer(qKey, v)}
                  >
                    {CHECK_OPTIONS.map((o) => (
                      <ToggleButton key={o.v} value={o.v} sx={{ py: 0.5 }}>{o.l}</ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}

                {type === 'yes_no' && (
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={curVal}
                    onChange={(_, v) => v != null && setAnswer(qKey, v)}
                  >
                    <ToggleButton value="yes" sx={{ py: 0.5 }}>Ya (Sesuai)</ToggleButton>
                    <ToggleButton value="no" sx={{ py: 0.5 }}>Tidak</ToggleButton>
                  </ToggleButtonGroup>
                )}

                {type === 'scale_5' && (
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={curVal}
                    onChange={(_, v) => v != null && setAnswer(qKey, v)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <ToggleButton key={n} value={n} sx={{ py: 0.5 }}>{n}</ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}

                {type === 'text' && (
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Tulis hasil pengamatan singkat…"
                    value={curVal || ''}
                    onChange={(e) => setAnswer(qKey, e.target.value)}
                    inputProps={{ maxLength: 200 }}
                  />
                )}
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* 2 — Stock take */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardHeader title="2 · Stock-Take (Stok Aktual di Toko)" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
        <CardContent sx={{ pt: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Hitung fisik sisa produk kita di rak/etalase toko ini (dalam pcs). Wajib isi minimal 1 produk. Terisi: {stockCount} produk.
          </Typography>
          <TextField
            label="Cari produk / SKU…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            sx={{ mb: 1 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }}
          />
          {products.length ? products.map((p) => {
            const actual = draft.stocks[p.id] ?? '';
            const refStock = getOutletProductRefStock(db, draft.outletId, p.id);
            const actualNum = actual === '' ? null : Number(actual);
            const health = actualNum !== null ? getOutletStockHealth(actualNum) : null;
            return (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {refStock !== null ? `Riwayat toko: ${refStock} pcs` : 'Riwayat toko: Belum ada (Stok Awal)'} • Gudang kita: {p.stock} pcs{p.pcsPerUnit > 1 ? ` • 1 ${p.unit} = ${p.pcsPerUnit} pcs` : ''}
                  </Typography>
                </Box>
                <TextField
                  type="number"
                  placeholder="Aktual"
                  value={actual}
                  sx={{ width: 96 }}
                  onChange={(e) => setDraft((d) => {
                    const stocks = { ...d.stocks };
                    if (e.target.value === '') delete stocks[p.id];
                    else stocks[p.id] = Math.max(0, Math.floor(Number(e.target.value) || 0));
                    return { ...d, stocks };
                  })}
                  inputProps={{ min: 0, style: { textAlign: 'center' } }}
                />
                {actualNum !== null && health && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, alignItems: 'flex-end' }}>
                    <Chip size="small" color={health.color} variant={health.key === 'ok' ? 'outlined' : 'filled'} label={health.label} />
                    {refStock !== null && <Typography variant="caption" color="text.secondary" fontSize={11} sx={{ textAlign: 'right' }}>{formatStockMovement({ systemStock: refStock, actualStock: actualNum })}</Typography>}
                  </Box>
                )}
              </Box>
            );
          }) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 1 }}>
              Produk tidak ditemukan.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 3 — Foto bukti */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardHeader title={`3 · Foto Bukti Kunjungan — ${draft.photos.length}/3`} titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
        <CardContent sx={{ pt: 0 }}>
          <input hidden id="audit-cam" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
          <label htmlFor="audit-cam">
            <Button component="span" variant="outlined" startIcon={<PhotoCameraRoundedIcon />} disabled={draft.photos.length >= 3}>
              Ambil Foto (Kamera Langsung)
            </Button>
          </label>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1 }}>
            Wajib kamera langsung — galeri/Camera Roll ditolak. Watermark waktu + GPS otomatis diterapkan. Maks 3 × 2MB.
          </Typography>
          {cameraErr && <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>{cameraErr}</Typography>}
          {draft.photos.length > 0 && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {draft.photos.map((ph, i) => (
                <Box key={i} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton
                    size="small"
                    onClick={() => removePhoto(i)}
                    sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(15,23,42,0.6)', color: '#fff' }}
                  >
                    <CloseRoundedIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 4 — Catatan */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardHeader title="4 · Catatan Kendala (maks 500)" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
        <CardContent sx={{ pt: 0 }}>
          <TextField
            label="mis. toko tutup sementara / POSM usai"
            multiline
            minRows={2}
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            inputProps={{ maxLength: 500 }}
          />
        </CardContent>
      </Card>

      <SubmitBar
        ready={canSubmit}
        loading={submitting}
        actionLabel="Kirim Hasil Audit"
        statusText={canSubmit
          ? `Skor ${liveScore}/100 • Form v${activeTemplate.version}`
          : `Wajib ${answeredRequiredCount}/${requiredQuestions.length} • stok: ${stockCount} produk`}
        onClick={submitAudit}
      />

      <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} />
    </Stack>
  );
}
