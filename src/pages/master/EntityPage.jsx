import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import DomainRoundedIcon from '@mui/icons-material/DomainRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

import { MASTER_CONFIG } from './masterConfig';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatusChip from '../../components/ui/StatusChip';
import { formatRupiah, TASK_TYPE_LABEL } from '../../utils/helpers';
import { readFileAsDataURL } from '../../utils/files';
import { allocMapOf, allocTotal, ensureGudangDetails, syncAllocation } from '../../utils/gudangUtils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Detail: label di atas, nilai di bawah — membungkus (word-wrap) mengikuti lebar
   dialog. Tidak pernah scroll kiri/kanan walau teks panjang tanpa spasi. */
const KVRow = ({ label, value }) => (
  <Stack sx={{ py: 0.5 }}>
    <Typography variant="caption" color="text.secondary"
      sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10.5, mb: 0.4 }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}
      sx={{ bgcolor: 'action.hover', borderRadius: 1.5, px: 1.25, py: 0.85, overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>
      {value}
    </Typography>
  </Stack>
);

function resolveOptions(f, db) {
  if (f.options) return f.options;
  if (!f.optionsFrom) return [];
  const { table, label = 'name', onlyActive = false } = f.optionsFrom;
  if (table === 'categories') return (db.categories || []).map((c) => ({ v: c, l: c }));
  let list = db[table] || [];
  if (onlyActive) list = list.filter((r) => !r.status || r.status === 'active');
  return list.map((r) => ({ v: r.id, l: r[label] ?? r.name }));
}

/* Saran kode berikutnya dengan format PREFIX-YYYY-NNN (urut naik per tahun).
   Dipakai openCreate untuk PREFILL field kode (cfg.codeGen) — nilainya tetap
   bisa dihapus / diketik ulang oleh user (bukan auto-number yang terkunci). */
function suggestCode(rows, prefix) {
  const year = new Date().getFullYear();
  const head = `${prefix}-${year}-`;
  const max = (rows || []).reduce((m, r) => {
    const c = String(r.code || '');
    if (c.startsWith(head)) {
      const n = parseInt(c.slice(head.length), 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }
    return m;
  }, 0);
  return `${head}${String(max + 1).padStart(3, '0')}`;
}

export default function EntityPage({ slug }) {
  const cfg = MASTER_CONFIG[slug];
  const { db, insert, update, mutate, remove } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ===== Semua hooks di paling atas — Rules of Hooks ===== */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* Migrasi sekali untuk tabel alokasi stok (dipakai form Produk & GudangDetail) */
  const allocRef = useRef(false);
  useEffect(() => {
    if (cfg.table !== 'products' || allocRef.current) return;
    allocRef.current = true;
    ensureGudangDetails(db, mutate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = db[cfg.table] || [];
  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter === 'active') list = list.filter((r) => (r.status || 'active') === 'active');
    if (statusFilter === 'inactive') list = list.filter((r) => r.status === 'inactive');
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => (cfg.search || []).some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    return list;
  }, [rows, search, statusFilter, cfg.search]);

  /* ---------- Helper ---------- */
  const labelOf = (r) => r?.name || r?.code || r?.nik || r?.sku || 'Data';
  const allocField = cfg.fields.find((f) => f.type === 'gudangAlloc');

  const openCreate = () => {
    const init = {};
    cfg.fields.forEach((f) => {
      init[f.k] = f.type === 'gudangAlloc' ? {} : (f.default != null ? String(f.default) : '');
    });
    /* Prefill saran kode otomatis (mis. OUT-2026-011) — editable. */
    if (cfg.codeGen) init[cfg.codeGen.field] = suggestCode(rows, cfg.codeGen.prefix);
    setValues(init); setErrors({}); setEditing(null); setFormOpen(true);
  };

  const openEdit = (rec) => {
    const init = {};
    cfg.fields.forEach((f) => {
      init[f.k] = f.type === 'gudangAlloc'
        ? allocMapOf(db, rec.id)
        : f.type === 'multiSelect'
          ? [...(Array.isArray(rec[f.k]) ? rec[f.k] : [])]
          : (rec[f.k] == null ? '' : String(rec[f.k]));
    });
    setValues(init); setErrors({}); setEditing(rec); setFormOpen(true);
  };

  const setVal = (k, v) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  /* ---------- Referensi & kaskade ---------- */
  const refStats = (rec) => {
    if (!rec) return { total: 0, list: [] };
    const list = [];
    (cfg.refs || []).forEach(({ table, field, label, matchSelf }) => {
      const want = matchSelf ? rec[field] : rec.id;
      const n = (db[table] || []).filter((x) => x[field] === want).length;
      if (n) list.push({ label, n });
    });
    (cfg.refsItems || []).forEach(({ table, field, label }) => {
      const n = (db[table] || []).filter((r) => (r[field] || []).some((it) => it.productId === rec.id)).length;
      if (n) list.push({ label, n });
    });
    /* Referensi berupa ARRAY ID POLOS di tabel lain (mis. supplier.productIds → produk) */
    (cfg.refsArrays || []).forEach(({ table, field, label }) => {
      const n = (db[table] || []).filter((x) => Array.isArray(x[field]) && x[field].includes(rec.id)).length;
      if (n) list.push({ label, n });
    });
    return { total: list.reduce((s, x) => s + x.n, 0), list };
  };

  const cascadeIds = (rec) =>
    (cfg.cascade || []).map(({ table, field }) => ({
      table,
      ids: (db[table] || []).filter((x) => x[field] === rec.id).map((x) => x.id),
    }));

  const setStatusCascade = (rec, to) => {
    const casc = cascadeIds(rec);
    mutate((d) => {
      const me = (d[cfg.table] || []).find((r) => r.id === rec.id);
      if (me) me.status = to;
      casc.forEach(({ table, ids }) => {
        ids.forEach((cid) => {
          const row = (d[table] || []).find((r) => r.id === cid);
          if (row) row.status = to;
        });
      });
    });
    return casc.reduce((s, c) => s + c.ids.length, 0);
  };

  /* ---------- Validasi ---------- */
  const validateAll = () => {
    const errs = {};
    cfg.fields.forEach((f) => {
      if (f.type === 'multiSelect') {
        if (f.required && !(values[f.k] || []).length) errs[f.k] = 'Pilih minimal satu item.';
        return;
      }
      if (f.type === 'gudangAlloc') {
        const bad = Object.entries(values[f.k] || {}).some(
          ([, v]) => v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)
        );
        if (bad) errs[f.k] = 'Penempatan stok harus berupa angka ≥ 0.';
        return;
      }
      let v = values[f.k];
      if (f.type === 'number') v = v === '' ? '' : Number(v);
      else v = String(v ?? '').trim();

      if (f.required && (v === '' || v == null)) { errs[f.k] = 'Kolom ini wajib diisi.'; return; }
      if (v === '' || v == null) return;

      if (f.type === 'number') {
        if (f.min != null && v < f.min) errs[f.k] = `Nilai minimal ${f.min}.`;
        if (f.max != null && v > f.max) errs[f.k] = `Nilai maksimal ${f.max}.`;
        if (f.notZero && v === 0) errs[f.k] = 'Nilai 0 tidak valid.';
      } else {
        if (f.max && String(v).length > f.max) errs[f.k] = `Maksimal ${f.max} karakter.`;
        if (f.pattern && !f.pattern.test(v)) errs[f.k] = f.patternMsg || 'Format tidak sesuai.';
        if (f.email && !EMAIL_RE.test(v)) errs[f.k] = 'Format email tidak valid.';
      }
    });

    (cfg.uniques || []).forEach((k) => {
      if (errs[k]) return;
      const f = cfg.fields.find((x) => x.k === k);
      const v = String(values[k] ?? '').trim().toLowerCase();
      if (!v) return;
      const dup = (db[cfg.table] || []).find(
        (r) => String(r[k] ?? '').toLowerCase() === v && (!editing || r.id !== editing.id)
      );
      if (dup) errs[k] = `${f ? f.l : k} sudah terdaftar.`;
    });

    if (cfg.validate) {
      Object.entries(cfg.validate(values) || {}).forEach(([k, msg]) => { if (msg) errs[k] = msg; });
    }
    return errs;
  };

  /* ---------- Simpan (andAgain = mode "Tambah Lagi") ---------- */
  const handleSubmit = (andAgain = false) => {
    const errs = validateAll();
    setErrors(errs);
    if (Object.keys(errs).length) return toast('Periksa kembali isian formulir.', 'warning');

    setSaving(true);
    setTimeout(() => { /* simulasi latency API */
      const payload = {};
      cfg.fields.forEach((f) => {
        let v = values[f.k];
        if (f.type === 'gudangAlloc') v = allocTotal(values[f.k]);
        else if (f.type === 'multiSelect') v = values[f.k] || [];
        else if (f.type === 'number') v = v === '' ? (f.default ?? 0) : Number(v);
        else if (f.optionsFrom && f.optionsFrom.table !== 'categories') v = v === '' ? '' : Number(v);
        else v = String(v ?? '').trim();
        payload[f.k] = v;
      });

      if (editing) {
        update(cfg.table, editing.id, payload);
        if (allocField) syncAllocation(mutate, editing.id, values[allocField.k]);
        toast('Data berhasil diperbarui.', 'success');
      } else {
        payload.status = 'active';
        const rec = insert(cfg.table, payload);
        if (allocField) syncAllocation(mutate, rec.id, values[allocField.k]);
        toast('Data baru berhasil disimpan.', 'success');
      }
      setSaving(false);
      if (andAgain) openCreate(); else setFormOpen(false);
    }, 400);
  };

  /* ---------- Soft delete / aktifkan ---------- */
  const toggleStatus = (rec) => {
    const to = rec.status === 'active' ? 'inactive' : 'active';
    const n = setStatusCascade(rec, to);
    toast(
      to === 'active'
        ? `"${labelOf(rec)}" diaktifkan kembali${n ? ` (+ ${n} data bawahan)` : ''}.`
        : `"${labelOf(rec)}" dinonaktifkan (soft delete)${n ? ` — ${n} data bawahan ikut nonaktif sementara` : ''} — riwayat transaksi tetap aman (FSD 3.3).`,
      to === 'active' ? 'success' : 'info'
    );
  };

  /* ---------- Hapus (opsi C + FSD 3.3) ---------- */
  const delStats = confirmDelete ? refStats(confirmDelete) : { total: 0, list: [] };
  const delCascCount = confirmDelete
    ? cascadeIds(confirmDelete).reduce((s, c) => s + c.ids.length, 0)
    : 0;

  const executeDelete = (mode) => {
    const rec = confirmDelete;
    if (!rec) return;
    if (mode === 'hard' && cfg.hardDelete) {
      cfg.hardDelete(rec, { mutate, db });
      toast(`"${labelOf(rec)}" dihapus permanen beserta relasi & alokasi stoknya.`, 'success', 5500);
      setConfirmDelete(null);
      return;
    }
    if (delStats.total > 0) {
      const n = setStatusCascade(rec, 'inactive');
      toast(
        `"${labelOf(rec)}" dipakai ${delStats.total} transaksi/relasi — dinonaktifkan (soft delete), BUKAN dihapus permanen (FSD 3.3)${n ? `. ${n} data bawahan ikut nonaktif.` : ''}`,
        'info', 5500
      );
    } else {
      remove(cfg.table, rec.id);
      toast(`"${labelOf(rec)}" dihapus permanen — data belum pernah dipakai transaksi mana pun.`, 'success');
    }
    setConfirmDelete(null);
  };

  /* ---------- Upload logo ---------- */
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataURL(file, (url, err) => {
      if (err || !url) { setErrors((p) => ({ ...p, logo: err || 'Gagal membaca berkas.' })); return; }
      setVal('logo', url);
    });
  };

  /* ---------- Render sel tabel ---------- */
  const renderCell = (r, c) => {
    if (c.render) return c.render(r, db);
    const v = r[c.k];
    switch (c.fmt) {
      case 'rupiah': return formatRupiah(v);
      case 'status': return <StatusChip kind="active" status={r.status || 'active'} />;
      case 'coords':
        return <Typography sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{(+r.lat).toFixed(5)}, {(+r.lng).toFixed(5)}</Typography>;
      case 'tasktype': return TASK_TYPE_LABEL[v] || v;
      case 'km': return `${v} km`;
      default:
        if (Array.isArray(v)) return v.join(', ');
        return v ?? '-';
    }
  };

  /* ---------- Nilai field untuk dialog detail ---------- */
  const renderDetailValue = (f, rec) => {
    const v = rec?.[f.k];
    if (f.type === 'gudangAlloc') {
      const list = (db.gudangDetails || []).filter((r) => r.productId === rec.id);
      if (!list.length) return 'Belum ditempatkan';
      return list.map((r) => {
        const w = (db.warehouses || []).find((x) => x.id === r.gudangId);
        return `${w ? w.code : r.gudangId}: ${r.stokTercatat}`;
      }).join(' • ');
    }
    if (f.type === 'multiSelect') {
      const ids = rec?.[f.k] || [];
      if (!ids.length) return 'Belum ada item terpilih';
      return ids.map((id) => {
        const r2 = (db[f.optionsFrom?.table] || []).find((x) => String(x.id) === String(id));
        return r2 ? `${r2.sku ? `${r2.sku} — ` : ''}${r2.name}` : `#${id}`;
      }).join(' • ');
    }
    if (v == null || v === '') return '-';
    if (f.type === 'file') {
      return <Avatar src={v} variant="rounded" sx={{ width: 56, height: 56, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />;
    }
    if (f.type === 'select') {
      /* Lookup langsung (abaikan status) — nama tetap tampil walau referensi sudah nonaktif */
      if (f.optionsFrom && f.optionsFrom.table !== 'categories') {
        const ref = (db[f.optionsFrom.table] || []).find((x) => String(x.id) === String(v));
        if (ref) return ref[f.optionsFrom.label || 'name'] ?? ref.name ?? String(v);
      }
      const o = resolveOptions(f, db).find((x) => String(x.v) === String(v));
      return o ? o.l : String(v);
    }
    if (f.fmt === 'rupiah') return formatRupiah(Number(v));
    return String(v);
  };

  /* ---------- Render field form ---------- */
  const fieldProps = (f) => ({
    label: `${f.l}${f.required ? ' *' : ''}`,
    value: values[f.k] ?? '',
    onChange: (e) => setVal(f.k, e.target.value),
    error: !!errors[f.k],
    helperText: errors[f.k] || f.hint || ' ',
  });

  const renderField = (f) => {
    /* --- Khusus: penempatan stok per gudang (Produk) --- */
    if (f.type === 'gudangAlloc') {
      const activeG = (db.warehouses || []).filter((w) => w.status === 'active');
      const map = values[f.k] || {};
      const inactivePlaced = (db.warehouses || []).filter(
        (w) => w.status !== 'active' && Number(map[w.id]) > 0
      );
      const rowsW = [...activeG, ...inactivePlaced];
      return (
        <Box key={f.k}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {f.l} — stok total produk = penjumlahan penempatan (pcs)
          </Typography>
          {rowsW.length ? (
            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
              {rowsW.map((w) => {
                const off = w.status !== 'active';
                return (
                  <Stack key={w.id} direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" noWrap
                      sx={{ flex: 1, minWidth: 0, color: off ? 'text.secondary' : undefined }}>
                      {w.code} — {w.name}{off ? ' (Nonaktif)' : ''}
                    </Typography>
                    <TextField size="small" type="number" placeholder="0" sx={{ width: 110 }}
                      disabled={off}
                      value={map[w.id] ?? ''}
                      onChange={(e) => setVal(f.k, {
                        ...map,
                        [w.id]: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }} />
                  </Stack>
                );
              })}
              <Stack direction="row" justifyContent="space-between"
                sx={{ pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="body2" fontWeight={700}>Total stok produk</Typography>
                <Typography variant="body2" fontWeight={800} color="primary.main">{allocTotal(map)} pcs</Typography>
              </Stack>
            </Stack>
          ) : null}
          {activeG.length === 0 && (
            <Alert severity="info">Belum ada gudang aktif — tambahkan gudang terlebih dahulu di Master Data → Gudang.</Alert>
          )}
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>{errors[f.k]}</Typography>
        </Box>
      );
    }

    /* --- Khusus: pilih banyak item dari tabel lain (multiSelect) — daftar
         CHECKBOX + pencarian + dapat digulir. Dipakai Produk Dipasok Supplier.
         Kata kunci pencarian disimpan di values[`${f.k}__q`] (internal,
         tidak pernah tersimpan ke database — bukan bagian cfg.fields). --- */
    if (f.type === 'multiSelect') {
      const { table, onlyActive = false } = f.optionsFrom || {};
      const all = db[table] || [];
      const cur = values[f.k] || [];
      const q = String(values[`${f.k}__q`] ?? '').trim().toLowerCase();
      const isOn = (id) => cur.some((x) => String(x) === String(id));
      /* Item aktif dulu; item yang SUDAH DIPILIH tapi nonaktif tetap tampil
         (bertanda) supaya bisa dilepas — tidak hilang diam-diam. */
      const list = onlyActive
        ? [
            ...all.filter((r) => !r.status || r.status === 'active'),
            ...all.filter((r) => r.status === 'inactive' && isOn(r.id)),
          ]
        : all;
      const shown = q
        ? list.filter((r) => `${r.sku || ''} ${r.name}`.toLowerCase().includes(q))
        : list;
      const toggle = (id) => setVal(f.k,
        isOn(id) ? cur.filter((x) => String(x) !== String(id)) : [...cur, Number(id)]
      );
      return (
        <Box key={f.k}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {f.l}{f.required ? ' *' : ''} — {cur.length} item dipilih
          </Typography>
          <TextField size="small" fullWidth placeholder="Cari item (SKU / nama)…"
            value={String(values[`${f.k}__q`] ?? '')}
            onChange={(e) => setVal(`${f.k}__q`, e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }}
            sx={{ mb: 1 }} />
          <Stack spacing={0.25}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0.75, maxHeight: 240, overflowY: 'auto' }}>
            {shown.length ? shown.map((r) => (
              <Stack key={r.id} direction="row" alignItems="center" spacing={0.75}
                onClick={() => toggle(r.id)}
                sx={{ cursor: 'pointer', borderRadius: 1, py: 0.25, px: 0.5, '&:hover': { bgcolor: 'action.hover' } }}>
                <Checkbox size="small" checked={isOn(r.id)} tabIndex={-1} disableRipple />
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, color: r.status === 'inactive' ? 'text.secondary' : undefined }}>
                  {r.sku ? `${r.sku} — ` : ''}{r.name}{r.status === 'inactive' ? ' (Nonaktif)' : ''}
                </Typography>
              </Stack>
            )) : (
              <Typography variant="caption" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                {q ? 'Tidak ada item yang cocok dengan pencarian.' : 'Belum ada data untuk dipilih.'}
              </Typography>
            )}
          </Stack>
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>{errors[f.k]}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {f.hint || 'Centang untuk memilih — daftar dapat digulir dan dicari.'}
          </Typography>
        </Box>
      );
    }

    if (f.type === 'select') {
      let opts = resolveOptions(f, db);
      const cur = values[f.k];
      if (f.optionsFrom && f.optionsFrom.table !== 'categories' && cur !== '' && cur != null
        && !opts.some((o) => String(o.v) === String(cur))) {
        const rec = (db[f.optionsFrom.table] || []).find((x) => String(x.id) === String(cur));
        if (rec) opts = [{ v: cur, l: `${rec.name || cur}${rec.status && rec.status !== 'active' ? ' (Nonaktif)' : ''}` }, ...opts];
      }
      return (
        <TextField key={f.k} select {...fieldProps(f)}>
          {opts.map((o) => (
            <MenuItem key={String(o.v)} value={String(o.v)}>{o.l}</MenuItem>
          ))}
        </TextField>
      );
    }
    if (f.type === 'textarea') {
      return <TextField key={f.k} multiline minRows={2} {...fieldProps(f)} inputProps={{ maxLength: f.max }} />;
    }
    if (f.type === 'number') {
      return (
        <TextField key={f.k} type="number" {...fieldProps(f)}
          inputProps={{ min: f.min, max: f.max, step: f.step || 1 }} />
      );
    }
    if (f.type === 'file') {
      return (
        <Box key={f.k}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {f.l}{f.required ? ' *' : ''}
          </Typography>
          <input hidden id={`file-${f.k}`} type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} />
          <label htmlFor={`file-${f.k}`}>
            <Button component="span" variant="outlined" startIcon={<UploadFileRoundedIcon />}>Pilih Berkas</Button>
          </label>
          {values[f.k] ? (
            <Avatar src={values[f.k]} variant="rounded" sx={{ mt: 1, width: 72, height: 72, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Belum ada berkas — maksimal 2 MB.</Typography>
          )}
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>{errors[f.k]}</Typography>
        </Box>
      );
    }
    return <TextField key={f.k} {...fieldProps(f)} inputProps={{ maxLength: f.max }} />;
  };

  /* ---------- Dialog form (3 tombol saat mode tambah) ---------- */
  const formDialog = (
    <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? `Ubah — ${cfg.title}` : `Tambah — ${cfg.title}`}</DialogTitle>
      <DialogContent dividers>
        {errors._form && <Alert severity="error" sx={{ mb: 2 }}>{errors._form}</Alert>}
        <Stack spacing={2}>{cfg.fields.map(renderField)}</Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setFormOpen(false)}>Batal</Button>
        {!editing && (
          <Button onClick={() => handleSubmit(true)} disabled={saving}>Simpan &amp; Tambah Lagi</Button>
        )}
        <Button variant="contained" onClick={() => handleSubmit(false)} disabled={saving}>
          {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  /* ---------- Dialog nonaktifkan / aktifkan ---------- */
  const toggleCascCount = confirmToggle
    ? cascadeIds(confirmToggle).reduce((s, c) => s + c.ids.length, 0)
    : 0;

  const confirmDialog = (
    <ConfirmDialog
      open={!!confirmToggle}
      onClose={() => setConfirmToggle(null)}
      onConfirm={() => { toggleStatus(confirmToggle); setConfirmToggle(null); }}
      title={confirmToggle?.status === 'active' ? 'Nonaktifkan Data' : 'Aktifkan Kembali'}
      message={confirmToggle?.status === 'active'
        ? `Nonaktifkan "${labelOf(confirmToggle)}"?${toggleCascCount ? ` ${toggleCascCount} data bawahan akan ikut nonaktif sementara.` : ''} Data tidak dihapus permanen (soft delete / FSD 3.3) dan dapat diaktifkan kembali.`
        : `Aktifkan kembali "${labelOf(confirmToggle)}"?${toggleCascCount ? ` ${toggleCascCount} data bawahan akan ikut diaktifkan.` : ''}`}
      confirmLabel={confirmToggle?.status === 'active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
      confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'primary'}
    />
  );

  /* ---------- Dialog DETAIL ---------- */
  const detailStats = detailRow ? refStats(detailRow) : { total: 0, list: [] };

  const detailDialog = (
    <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
        Detail {cfg.addLabel} — {detailRow ? labelOf(detailRow) : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden' }}>
        {detailRow && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <StatusChip kind="active" status={detailRow.status || 'active'} />
              <Stack direction="row" spacing={0.75}>
                {detailRow.createdAt && <Chip size="small" variant="outlined" label={`Dibuat ${detailRow.createdAt}`} />}
                {detailRow.updatedAt && <Chip size="small" variant="outlined" label={`Diubah ${detailRow.updatedAt}`} />}
              </Stack>
            </Stack>
            <Stack spacing={0.5}>
              {cfg.fields.map((f) => (
                <KVRow key={f.k} label={f.l} value={renderDetailValue(f, detailRow)} />
              ))}
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>Penggunaan Data</Typography>
              {detailStats.total > 0 ? (
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                  {detailStats.list.map((s) => (
                    <Chip key={s.label} size="small" color="primary" variant="outlined" label={`${s.n} ${s.label}`} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Belum dipakai transaksi/relasi mana pun — aman untuk dihapus permanen.
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDetailRow(null)}>Tutup</Button>
        {detailRow && (
          <Button variant="contained" startIcon={<EditRoundedIcon />}
            onClick={() => { const rec = detailRow; setDetailRow(null); openEdit(rec); }}>
            Ubah Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  /* ---------- Dialog HAPUS ---------- */
  const deleteDialog = (
    <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
        Hapus {cfg.addLabel} — {confirmDelete ? labelOf(confirmDelete) : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden' }}>
        {confirmDelete && (delStats.total > 0 ? (
          <>
            <Alert severity="error" sx={{ mb: 1.5 }}>
              <b>PERINGATAN:</b> data ini sudah dipakai oleh <b>{delStats.total}</b> transaksi/relasi.
              {cfg.hardDelete ? (
                <>Opsi teraman adalah <b>Nonaktifkan</b> — riwayat tetap tersimpan (FSD 3.3).</>
              ) : (
                <>Sesuai FSD 3.3 (Soft Deletes), data master yang pernah dipakai transaksi
                <b> tidak boleh dihapus permanen</b> agar riwayat Order/Audit lama tidak rusak.</>
              )}
            </Alert>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, mb: delCascCount ? 1.5 : 0 }}>
              {delStats.list.map((s) => (
                <Chip key={s.label} size="small" color="error" variant="outlined" label={`${s.n} ${s.label}`} />
              ))}
            </Stack>
            {delCascCount > 0 && (
              <Alert severity="warning">
                Nonaktifkan juga <b>{delCascCount} data bawahan</b> yang mengikuti {cfg.addLabel} ini (cascade sementara).
              </Alert>
            )}
            {cfg.hardDelete && (
              <Alert severity="error" sx={{ mt: 1.5 }}>
                <b>Opsi Hapus Permanen (pengecualian FSD 3.3):</b> {cfg.hardDeleteNote}
              </Alert>
            )}
          </>
        ) : (
          <Alert severity="warning">
            Data ini <b>belum dipakai</b> transaksi/relasi mana pun dan dapat dihapus permanen.
            <b> Tindakan ini tidak dapat dibatalkan.</b>
          </Alert>
        ))}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={() => setConfirmDelete(null)}>Batal</Button>
        {delStats.total > 0 ? (
          <>
            <Button variant="contained" color="warning" onClick={() => executeDelete('soft')}>Nonaktifkan (Soft Delete)</Button>
            {cfg.hardDelete && (
              <Button variant="contained" color="error" onClick={() => executeDelete('hard')}>Hapus Permanen</Button>
            )}
          </>
        ) : (
          <Button variant="contained" color="error" onClick={() => executeDelete()}>Hapus Permanen</Button>
        )}
      </DialogActions>
    </Dialog>
  );

  /* ===== Tampilan khusus: profil tunggal PERUSAHAAN ===== */
  if (cfg.single) {
    const rec = rows[0];
    return (
      <Box>
        <PageHeader
          title={cfg.title}
          subtitle={cfg.sub}
          action={rec && (
            <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={() => openEdit(rec)}>
              Ubah Profil
            </Button>
          )}
        />
        {!rec ? (
          <EmptyState message="Profil perusahaan belum diisi." />
        ) : (
          <Card elevation={0} sx={{ maxWidth: 640, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
                {rec.logo ? (
                  <Avatar variant="rounded" src={rec.logo} sx={{ width: 64, height: 64, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                ) : (
                  <Avatar variant="rounded" sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'primary.main' }}><DomainRoundedIcon /></Avatar>
                )}
                <Box>
                  <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{rec.name}</Typography>
                  <Chip size="small" variant="outlined" color="primary" label="Identitas resmi dokumen" />
                </Box>
              </Stack>
              <List dense disablePadding>
                {[
                  { icon: <BadgeRoundedIcon fontSize="small" />, label: 'NPWP', value: rec.npwp || '-' },
                  { icon: <MapRoundedIcon fontSize="small" />, label: 'Alamat', value: rec.address || '-' },
                  { icon: <PhoneRoundedIcon fontSize="small" />, label: 'Kontak', value: rec.phone || '-' },
                  { icon: <MailRoundedIcon fontSize="small" />, label: 'Email', value: rec.email || '-' },
                  { icon: <AccountBalanceRoundedIcon fontSize="small" />, label: 'Rekening (Invoice)',
                    value: [rec.bankName, rec.bankAccount, rec.bankHolder].filter(Boolean).join(' — ') || '-' },
                ].map((r) => (
                  <ListItem key={r.label} disableGutters sx={{ py: 0.9, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{r.icon}</ListItemIcon>
                    <ListItemText
                      primary={r.label} secondary={r.value}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere' }}
                    />
                  </ListItem>
                ))}
              </List>
              <Alert severity="info" sx={{ mt: 2 }} icon={<InfoRoundedIcon fontSize="small" />}>
                Identitas ini otomatis dipakai pada <b>kop dokumen Quotation &amp; Invoice</b>.
              </Alert>
            </CardContent>
          </Card>
        )}
        {formDialog}
      </Box>
    );
  }

  /* ===== Tampilan standar: tabel CRUD ===== */
  return (
    <Box>
      <PageHeader
        title={cfg.title}
        subtitle={cfg.sub}
        action={(
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
            Tambah {cfg.addLabel}
          </Button>
        )}
      />

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
            <FilterListRoundedIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
          </Stack>
          <TextField size="small" placeholder="Cari data…" value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200, maxWidth: 340 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
          <TextField size="small" select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="active">Aktif</MenuItem>
            <MenuItem value="inactive">Nonaktif</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {filtered.length} dari {rows.length} data
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {cfg.columns.map((c) => <TableCell key={c.k}>{c.l}</TableCell>)}
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.map((r) => (
              <TableRow key={r.id} sx={{ opacity: r.status === 'inactive' ? 0.55 : 1 }}>
                {cfg.columns.map((c) => (
                  <TableCell key={c.k}>
                    <Box title={typeof r[c.k] === 'string' ? r[c.k] : undefined}
                      sx={{ maxWidth: c.maxW || 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {renderCell(r, c)}
                    </Box>
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title={cfg.detailPage ? 'Detail (halaman khusus)' : 'Detail data'}>
                      <IconButton size="small"
                        onClick={() => (cfg.detailPage ? navigate(`${cfg.detailPage}/${r.id}`) : setDetailRow(r))}>
                        <VisibilityRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ubah data">
                      <IconButton size="small" onClick={() => openEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={r.status === 'active' ? 'Nonaktifkan (soft delete)' : 'Aktifkan kembali'}>
                      <IconButton size="small" color={r.status === 'active' ? 'warning' : 'success'} onClick={() => setConfirmToggle(r)}>
                        {r.status === 'active' ? <LockRoundedIcon fontSize="small" /> : <LockOpenRoundedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Hapus">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(r)}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={cfg.columns.length + 1}><EmptyState message="Data tidak ditemukan." /></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 1.5 }} icon={<InfoRoundedIcon fontSize="small" />}>
        <b>Hapus</b>: data yang <b>belum dipakai</b> transaksi dihapus permanen; yang <b>sudah dipakai</b> otomatis
        dibatasi ke <b>soft delete</b>/nonaktif (FSD 3.3). Data bawahan mengikuti status induknya (cascade sementara).
      </Alert>

      {formDialog}
      {confirmDialog}
      {detailDialog}
      {deleteDialog}
    </Box>
  );
}