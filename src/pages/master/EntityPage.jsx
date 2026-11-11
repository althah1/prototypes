import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import DomainRoundedIcon from '@mui/icons-material/DomainRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
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
import ProdukPage from './Produk';
import PerusahaanPage from './Perusahaan';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatusChip from '../../components/ui/StatusChip';
import FilterToolbar from '../../components/ui/FilterToolbar';
import DetailGrid, { CardSectionHeader, ModalHeader } from '../../components/ui/DetailGrid';
import { formatRupiah, TASK_TYPE_LABEL } from '../../utils/helpers';
import { readFileAsDataURL } from '../../utils/files';
import { allocMapOf, allocTotal, ensureGudangDetails } from '../../utils/gudangUtils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveOptions(f, db) {
  if (f.options) return f.options;
  if (!f.optionsFrom) return [];
  const { table, label = 'name', onlyActive = false } = f.optionsFrom;
  if (table === 'categories') return (db.categories || []).map((c) => ({ v: c, l: c }));
  let list = db[table] || [];
  if (onlyActive) list = list.filter((r) => !r.status || r.status === 'active');
  return list.map((r) => ({ v: r.id, l: r[label] ?? r.name }));
}

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

function nextAutoCode(rows, field, prefix) {
  let max = 0;
  (rows || []).forEach((r) => {
    const m = String(r[field] || '').match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export default function EntityPage({ slug }) {
  if (slug === 'produk') return <ProdukPage />;
  if (slug === 'perusahaan') return <PerusahaanPage />;
  return <EntityPageInner slug={slug} />;
}

function EntityPageInner({ slug }) {
  const cfg = MASTER_CONFIG[slug];
  const { user } = useAuth();

  /* =========================================================================
     MATRIKS HAK AKSES MASTER DATA SESUAI FSD:
     - Admin: Full CRUD seluruh entitas Master Data.
     - Supervisor: Full CRUD entitas operasional (area, outlet, gudang, produk,
       supplier, kategori prospek, tugas). Khusus data legal/SDM perusahaan
       (perusahaan, bank, sales, supervisor) HANYA BISA MELIHAT (Read-Only).
     - Finance: Seluruh Master Data = Lihat Saja (Read-Only).
     ========================================================================= */
  const ADMIN_ONLY_MASTER_SLUGS = ['perusahaan', 'bank', 'sales', 'supervisor'];
  const isFinance = user?.role === 'finance';
  const isSupervisor = user?.role === 'supervisor';
  const isRestrictedSupervisor = isSupervisor && ADMIN_ONLY_MASTER_SLUGS.includes(slug);
  const readOnly = isFinance || isRestrictedSupervisor;

  const { db, insert, update, mutate, remove } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refFilters, setRefFilters] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);

  const scrollPosRef = useRef(null);
  const closingSnapshotRef = useRef(null);

  const captureScrollPos = () => {
    closingSnapshotRef.current = null;
    const mainEl = document.querySelector('main');
    scrollPosRef.current = {
      x: window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
      y: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
      mainX: mainEl ? mainEl.scrollLeft : 0,
      mainY: mainEl ? mainEl.scrollTop : 0,
    };
  };

  const handleCloseForm = () => {
    if (scrollPosRef.current) {
      closingSnapshotRef.current = scrollPosRef.current;
      scrollPosRef.current = null;
    }
    setFormOpen(false);
  };

  const handleUserDismiss = () => {
    if (saving) return;
    handleCloseForm();
  };

  const handleFormExited = () => {
    if (formOpen) return;
    const toRestore = closingSnapshotRef.current;
    closingSnapshotRef.current = null;
    if (!toRestore) return;

    window.scrollTo(toRestore.x, toRestore.y);
    if (document.documentElement) {
      document.documentElement.scrollLeft = toRestore.x;
      document.documentElement.scrollTop = toRestore.y;
    }
    if (document.body) {
      document.body.scrollLeft = toRestore.x;
      document.body.scrollTop = toRestore.y;
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollLeft = toRestore.mainX;
      mainEl.scrollTop = toRestore.mainY;
    }
  };

  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
    (cfg.filterRefs || []).forEach(({ field }) => {
      const val = refFilters[field];
      if (val && val !== 'all') {
        list = list.filter((r) => String(r[field]) === String(val));
      }
    });
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => (cfg.search || []).some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    return list;
  }, [rows, search, statusFilter, refFilters, cfg.search, cfg.filterRefs]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  const labelOf = (r) => r?.name || r?.code || r?.nik || r?.sku || 'Data';

  const resetForm = () => {
    const init = {};
    cfg.fields.forEach((f) => {
      init[f.k] = f.type === 'gudangAlloc' ? {} : (f.default != null ? String(f.default) : '');
    });
    if (cfg.codeGen) init[cfg.codeGen.field] = suggestCode(rows, cfg.codeGen.prefix);
    setValues(init);
    setErrors({});
    setEditing(null);
  };

  const openCreate = () => {
    captureScrollPos();
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (rec) => {
    captureScrollPos();
    const init = {};
    cfg.fields.forEach((f) => {
      if (f.type === 'gudangAlloc') {
        init[f.k] = allocMapOf(db, rec.id);
      } else if (f.type === 'multiSelect') {
        init[f.k] = rec[f.k] ? [...rec[f.k]] : [];
      } else {
        init[f.k] = rec[f.k] != null ? String(rec[f.k]) : '';
      }
    });
    setValues(init);
    setErrors({});
    setEditing(rec);
    setFormOpen(true);
  };

  const setVal = (k, v) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: undefined, _form: undefined }));
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataURL(file, 2 * 1024 * 1024);
      setVal('logo', dataUrl);
      toast('Berkas logo berhasil dipilih.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const validateForm = () => {
    const errs = {};
    cfg.fields.forEach((f) => {
      const raw = values[f.k];
      const val = typeof raw === 'string' ? raw.trim() : raw;
      if (f.required) {
        if (f.type === 'multiSelect') {
          if (!Array.isArray(val) || !val.length) errs[f.k] = `${f.l} wajib dipilih.`;
        } else if (val === '' || val == null) {
          errs[f.k] = `${f.l} wajib diisi.`;
        }
      }
      if (val !== '' && val != null) {
        if (f.max && typeof val === 'string' && val.length > f.max) {
          errs[f.k] = `${f.l} maksimal ${f.max} karakter.`;
        }
        if (f.pattern && !f.pattern.test(String(val))) {
          errs[f.k] = f.patternMsg || `${f.l} format tidak sesuai.`;
        }
        if (f.email && !EMAIL_RE.test(String(val))) {
          errs[f.k] = 'Format email tidak valid (contoh: nama@domain.com).';
        }
        if (f.type === 'number') {
          const n = Number(val);
          if (Number.isNaN(n)) errs[f.k] = `${f.l} harus berupa angka.`;
          else {
            if (f.min != null && n < f.min) errs[f.k] = `${f.l} minimal ${f.min}.`;
            if (f.max != null && n > f.max) errs[f.k] = `${f.l} maksimal ${f.max}.`;
            if (f.notZero && n === 0) errs[f.k] = `${f.l} tidak boleh 0.`;
          }
        }
      }
    });

    (cfg.uniques || []).forEach((field) => {
      const v = String(values[field] ?? '').trim();
      if (!v) return;
      const dup = rows.find(
        (r) => String(r[field] ?? '').toLowerCase() === v.toLowerCase() &&
          (!editing || r.id !== editing.id)
      );
      if (dup) {
        const fMeta = cfg.fields.find((f) => f.k === field);
        errs[field] = `${fMeta?.l || field} "${v}" sudah digunakan.`;
      }
    });

    if (cfg.validate) {
      const customErrs = cfg.validate(values, { editing, rows, db });
      if (customErrs) Object.assign(errs, customErrs);
    }
    return errs;
  };

  const handleSubmit = (andAgain = false) => {
    const errs = validateForm();
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast('Periksa isian formulir — perbaiki kesalahan yang tertera.', 'warning');
      return;
    }

    setSaving(true);
    setTimeout(() => {
      const payload = {};
      cfg.fields.forEach((f) => {
        if (f.type === 'gudangAlloc') return;
        const v = values[f.k];
        if (f.type === 'number') payload[f.k] = v === '' ? null : Number(v);
        else if (f.type === 'multiSelect') payload[f.k] = Array.isArray(v) ? v : [];
        else payload[f.k] = typeof v === 'string' ? v.trim() : v;
      });

      if (cfg.autoGen && !editing) {
        payload[cfg.autoGen.field] = nextAutoCode(rows, cfg.autoGen.field, cfg.autoGen.prefix);
      }

      if (editing) {
        update(cfg.table, editing.id, payload);
        toast(`Data ${cfg.addLabel} berhasil diperbarui.`, 'success');
      } else {
        if (!payload.status) payload.status = 'active';
        insert(cfg.table, payload);
        toast(`Data ${cfg.addLabel} baru berhasil disimpan.`, 'success');
      }

      setSaving(false);
      if (andAgain) {
        resetForm();
      } else {
        handleCloseForm();
      }
    }, 350);
  };

  const cascadeIds = (rec) => {
    const out = [];
    (cfg.cascade || []).forEach(({ table, field }) => {
      const subList = db[table] || [];
      const ids = subList.filter((r) => String(r[field]) === String(rec.id)).map((r) => r.id);
      if (ids.length) out.push({ table, ids });
    });
    return out;
  };

  const toggleStatus = (rec) => {
    const nextStatus = (rec.status || 'active') === 'active' ? 'inactive' : 'active';
    update(cfg.table, rec.id, { status: nextStatus });
    const casc = cascadeIds(rec);
    casc.forEach(({ table, ids }) => {
      ids.forEach((id) => update(table, id, { status: nextStatus }));
    });
    toast(
      nextStatus === 'active'
        ? `"${labelOf(rec)}" diaktifkan kembali.${casc.length ? ' Data bawahan ikut aktif.' : ''}`
        : `"${labelOf(rec)}" dinonaktifkan.${casc.length ? ' Data bawahan ikut dinonaktifkan.' : ''}`,
      nextStatus === 'active' ? 'success' : 'info'
    );
  };

  const refStats = (rec) => {
    let total = 0;
    const list = [];
    (cfg.refs || []).forEach(({ table, field, label, matchSelf }) => {
      const subList = db[table] || [];
      const matchVal = matchSelf ? rec[field] : rec.id;
      const count = subList.filter((r) => String(r[field]) === String(matchVal)).length;
      if (count > 0) {
        total += count;
        list.push({ label, n: count });
      }
    });
    return { total, list };
  };

  const delStats = confirmDelete ? refStats(confirmDelete) : { total: 0, list: [] };
  const delCascCount = confirmDelete
    ? cascadeIds(confirmDelete).reduce((s, c) => s + c.ids.length, 0)
    : 0;

  const executeDelete = () => {
    const rec = confirmDelete;
    if (!rec) return;
    if (delStats.total > 0) {
      update(cfg.table, rec.id, { status: 'inactive' });
      const casc = cascadeIds(rec);
      casc.forEach(({ table, ids }) => {
        ids.forEach((id) => update(table, id, { status: 'inactive' }));
      });
      toast(`"${labelOf(rec)}" dipakai transaksi/relasi — status diubah ke Nonaktif (riwayat aman).`, 'info', 5000);
    } else {
      remove(cfg.table, rec.id);
      toast(`"${labelOf(rec)}" berhasil dihapus permanen.`, 'success');
    }
    setConfirmDelete(null);
  };

  const renderCell = (r, c) => {
    if (c.render) return c.render(r, db);
    const v = r[c.k];
    if (c.fmt === 'status') return <StatusChip kind="active" status={v || 'active'} />;
    if (c.fmt === 'rupiah') return formatRupiah(Number(v) || 0);
    if (c.fmt === 'km') return `${v || 0} km`;
    if (c.fmt === 'coords') return `${r.lat ?? '-'}, ${r.lng ?? '-'}`;
    if (c.fmt === 'tasktype') return TASK_TYPE_LABEL[v] || v || '-';
    return v != null && v !== '' ? String(v) : '-';
  };

  const renderDetailValue = (f, r) => {
    const v = r[f.k];
    if (v == null || v === '') return '-';
    if (f.type === 'select') {
      const opts = resolveOptions(f, db);
      const hit = opts.find((o) => String(o.v) === String(v));
      return hit ? hit.l : String(v);
    }
    if (f.type === 'multiSelect') {
      const all = db[f.optionsFrom?.table] || [];
      const ids = Array.isArray(v) ? v : [];
      if (!ids.length) return 'Belum ada produk dipilih';
      const items = ids.map((id) => all.find((x) => x.id === id)).filter(Boolean);
      return (
        <Box sx={{ width: '100%', mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
          <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {items.map((it, idx) => (
              <Box
                key={it.id}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderBottom: idx === items.length - 1 ? 'none' : '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: 12.5,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    px: 0.75,
                    py: 0.2,
                    borderRadius: '4px',
                    bgcolor: 'action.hover',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {it.sku || `#${it.id}`}
                </Box>
                <Typography variant="body2" fontSize={13} noWrap>
                  {it.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      );
    }
    if (f.fmt === 'rupiah') return formatRupiah(Number(v) || 0);
    return String(v);
  };

  const isFullSpanField = (f) =>
    f.type === 'textarea' ||
    f.type === 'multiSelect' ||
    f.type === 'gudangAlloc' ||
    f.type === 'file' ||
    Boolean(f.fullWidth);

  const renderFormField = (f) => {
    const fullSpan = isFullSpanField(f);
    const boxSx = {
      gridColumn: fullSpan ? { xs: '1 / -1', sm: '1 / -1' } : 'auto',
    };

    if (f.type === 'multiSelect') {
      const { table, onlyActive = false } = f.optionsFrom || {};
      const all = db[table] || [];
      const cur = values[f.k] || [];
      const q = String(values[`${f.k}__q`] ?? '').trim().toLowerCase();
      const isOn = (id) => cur.some((x) => String(x) === String(id));
      const list = onlyActive
        ? [
            ...all.filter((r) => !r.status || r.status === 'active'),
            ...all.filter((r) => r.status === 'inactive' && isOn(r.id)),
          ]
        : all;
      const shown = q
        ? list.filter((r) => `${r.sku || ''} ${r.name}`.toLowerCase().includes(q))
        : list;
      const toggle = (id) =>
        setVal(f.k, isOn(id) ? cur.filter((x) => String(x) !== String(id)) : [...cur, Number(id)]);

      return (
        <Box key={f.k} sx={boxSx}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75, color: 'text.secondary' }}>
            {f.l}{f.required ? ' *' : ''} — {cur.length} produk dipilih
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Cari produk (SKU / nama)…"
            value={String(values[`${f.k}__q`] ?? '')}
            onChange={(e) => setVal(`${f.k}__q`, e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 1 }}
          />
          <Box
            sx={{
              border: '1px solid',
              borderColor: errors[f.k] ? 'error.main' : 'divider',
              borderRadius: 1.25,
              maxHeight: 210,
              overflowY: 'auto',
              p: 0.5,
              bgcolor: 'background.paper',
            }}
          >
            {shown.length ? (
              shown.map((r) => (
                <Stack
                  key={r.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => toggle(r.id)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    py: 0.5,
                    px: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Checkbox size="small" checked={isOn(r.id)} tabIndex={-1} disableRipple sx={{ p: 0.5 }} />
                  <Typography variant="body2" noWrap sx={{ flex: 1, fontSize: 13 }}>
                    {r.sku ? <b>{r.sku} — </b> : ''}
                    {r.name}
                    {r.status === 'inactive' ? ' (Nonaktif)' : ''}
                  </Typography>
                </Stack>
              ))
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ py: 2, textAlign: 'center', display: 'block' }}>
                {q ? 'Tidak ada produk yang sesuai dengan pencarian.' : 'Belum ada produk untuk dipilih.'}
              </Typography>
            )}
          </Box>
          {errors[f.k] && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 500 }}>
              {errors[f.k]}
            </Typography>
          )}
        </Box>
      );
    }

    if (f.type === 'file') {
      return (
        <Box key={f.k} sx={boxSx}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75, color: 'text.secondary' }}>
            {f.l}{f.required ? ' *' : ''}
          </Typography>
          <input hidden id={`file-${f.k}`} type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} />
          <label htmlFor={`file-${f.k}`}>
            <Button component="span" variant="outlined" color="inherit" startIcon={<UploadFileRoundedIcon />} sx={{ borderRadius: 1 }}>
              Pilih Berkas Logo
            </Button>
          </label>
          {values[f.k] ? (
            <Avatar src={values[f.k]} variant="rounded" sx={{ mt: 1.5, width: 72, height: 72, borderRadius: 1.25, border: '1px solid', borderColor: 'divider' }} />
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Format .PNG / .JPG, maksimal 2 MB.
            </Typography>
          )}
          {errors[f.k] && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {errors[f.k]}
            </Typography>
          )}
        </Box>
      );
    }

    const fieldLabel = `${f.l}${f.required ? ' *' : ''}`;
    const fieldError = Boolean(errors[f.k]);
    const fieldHelper = errors[f.k] || f.hint || undefined;

    if (f.type === 'select') {
      let opts = resolveOptions(f, db);
      const cur = values[f.k];
      if (
        f.optionsFrom &&
        f.optionsFrom.table !== 'categories' &&
        cur !== '' &&
        cur != null &&
        !opts.some((o) => String(o.v) === String(cur))
      ) {
        const rec = (db[f.optionsFrom.table] || []).find((x) => String(x.id) === String(cur));
        if (rec) opts = [{ v: cur, l: `${rec.name || cur}${rec.status && rec.status !== 'active' ? ' (Nonaktif)' : ''}` }, ...opts];
      }

      return (
        <Box key={f.k} sx={boxSx}>
          <TextField
            select
            label={fieldLabel}
            value={values[f.k] ?? ''}
            onChange={(e) => setVal(f.k, e.target.value)}
            error={fieldError}
            helperText={fieldHelper}
          >
            {opts.map((o) => (
              <MenuItem key={String(o.v)} value={String(o.v)}>
                {o.l}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      );
    }

    if (f.type === 'textarea') {
      return (
        <Box key={f.k} sx={boxSx}>
          <TextField
            multiline
            minRows={2.5}
            label={fieldLabel}
            value={values[f.k] ?? ''}
            onChange={(e) => setVal(f.k, e.target.value)}
            error={fieldError}
            helperText={fieldHelper}
            inputProps={{ maxLength: f.max }}
          />
        </Box>
      );
    }

    return (
      <Box key={f.k} sx={boxSx}>
        <TextField
          type={f.type === 'number' ? 'number' : 'text'}
          label={fieldLabel}
          value={values[f.k] ?? ''}
          onChange={(e) => setVal(f.k, e.target.value)}
          error={fieldError}
          helperText={fieldHelper}
          inputProps={{
            min: f.min,
            max: f.max,
            step: f.step || (f.type === 'number' ? 1 : undefined),
            maxLength: f.type !== 'number' ? f.max : undefined,
          }}
        />
      </Box>
    );
  };

  /* Modal Form Tambah / Ubah */
  const formDialog = (
    <Dialog
      open={formOpen}
      onClose={handleUserDismiss}
      TransitionProps={{ onExited: handleFormExited }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 48px rgba(15,23,42,0.12)',
        },
      }}
    >
      <ModalHeader
        title={editing ? `Ubah ${cfg.addLabel} — ${labelOf(editing)}` : `Tambah ${cfg.addLabel} Baru`}
        subtitle={`Isi data ${cfg.addLabel.toLowerCase()} secara lengkap dan valid`}
        onClose={saving ? undefined : handleUserDismiss}
      />
      <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
        {errors._form && <Alert severity="error" sx={{ mb: 2.5 }}>{errors._form}</Alert>}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          {cfg.fields.map(renderFormField)}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={handleUserDismiss} disabled={saving} variant="outlined" color="inherit" sx={{ borderRadius: 1, fontWeight: 600 }}>
          Batal
        </Button>
        {!editing && (
          <Button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            variant="outlined"
            color="primary"
            sx={{ borderRadius: 1, fontWeight: 600 }}
          >
            Simpan &amp; Tambah Lagi
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => handleSubmit(false)}
          disabled={saving}
          sx={{ borderRadius: 1, fontWeight: 650, px: 2.5 }}
        >
          {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  /* Modal Konfirmasi Aktif / Nonaktif */
  const confirmDialog = (
    <ConfirmDialog
      open={!!confirmToggle}
      onClose={() => setConfirmToggle(null)}
      onConfirm={() => { toggleStatus(confirmToggle); setConfirmToggle(null); }}
      title={confirmToggle?.status === 'active' ? 'Nonaktifkan Data' : 'Aktifkan Kembali'}
      message={
        confirmToggle?.status === 'active'
          ? `Nonaktifkan "${labelOf(confirmToggle)}"? Data tidak dihapus permanen dan dapat diaktifkan kembali sewaktu-waktu.`
          : `Aktifkan kembali "${labelOf(confirmToggle)}"?`
      }
      confirmLabel={confirmToggle?.status === 'active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
      confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'primary'}
    />
  );

  /* Modal Detail Data */
  const detailItems = detailRow
    ? cfg.fields.map((f) => ({
        key: f.k,
        label: f.l,
        value: typeof renderDetailValue(f, detailRow) === 'string' ? renderDetailValue(f, detailRow) : undefined,
        customNode: typeof renderDetailValue(f, detailRow) !== 'string' ? renderDetailValue(f, detailRow) : undefined,
        isLong: isFullSpanField(f),
      }))
    : [];

  const detailDialog = (
    <Dialog
      open={!!detailRow}
      onClose={() => setDetailRow(null)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 48px rgba(15,23,42,0.12)',
        },
      }}
    >
      <ModalHeader
        title={`Detail ${cfg.addLabel} — ${detailRow ? labelOf(detailRow) : ''}`}
        subtitle={`Informasi lengkap master data ${cfg.addLabel.toLowerCase()}`}
        onClose={() => setDetailRow(null)}
      />
      <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
        {detailRow && (
          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <StatusChip kind="active" status={detailRow.status || 'active'} />
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                ID Data: #{detailRow.id}
              </Typography>
            </Stack>

            <DetailGrid items={detailItems} columns={2} />

            <Box sx={{ pt: 1 }}>
              <Typography variant="caption" fontWeight={750} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 1 }}>
                Status Penggunaan Data
              </Typography>
              {refStats(detailRow).total > 0 ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  {refStats(detailRow).list.map((s) => (
                    <Box
                      key={s.label}
                      sx={{
                        px: 1.25,
                        py: 0.4,
                        borderRadius: '6px',
                        bgcolor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                      }}
                    >
                      {s.n} {s.label}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Belum digunakan pada transaksi mana pun — aman untuk diubah atau dihapus permanen.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, justifyContent: 'flex-end', gap: 1.25 }}>
        <Button variant="outlined" color="inherit" onClick={() => setDetailRow(null)} sx={{ borderRadius: 1, fontWeight: 600 }}>
          Tutup
        </Button>
        {detailRow && !readOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditRoundedIcon fontSize="small" />}
            onClick={() => { const rec = detailRow; setDetailRow(null); openEdit(rec); }}
            sx={{ borderRadius: 1, fontWeight: 650, px: 2.5 }}
          >
            Ubah Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  /* Modal Hapus */
  const deleteDialog = (
    <Dialog
      open={!!confirmDelete}
      onClose={() => setConfirmDelete(null)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 1.25 } }}
    >
      <ModalHeader
        title={`Hapus ${cfg.addLabel}`}
        subtitle={`Konfirmasi penghapusan data ${confirmDelete ? labelOf(confirmDelete) : ''}`}
        onClose={() => setConfirmDelete(null)}
      />
      <DialogContent dividers sx={{ overflowX: 'hidden', py: 2.5 }}>
        {confirmDelete && (delStats.total > 0 ? (
          <Stack spacing={1.5}>
            <Alert severity="warning">
              Data ini sudah dipakai dalam <b>{delStats.total}</b> relasi transaksi. Data tidak dapat dihapus permanen untuk menjaga keutuhan riwayat, melainkan akan <b>dinonaktifkan</b>.
            </Alert>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
              {delStats.list.map((s) => (
                <Chip key={s.label} size="small" color="warning" variant="outlined" label={`${s.n} ${s.label}`} />
              ))}
            </Stack>
          </Stack>
        ) : (
          <Alert severity="error">
            Data ini belum digunakan dan akan <b>dihapus permanen</b> dari database. Tindakan ini tidak dapat dibatalkan.
          </Alert>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
        <Button onClick={() => setConfirmDelete(null)} variant="outlined" color="inherit" sx={{ borderRadius: 1 }}>
          Batal
        </Button>
        {delStats.total > 0 ? (
          <Button variant="contained" color="warning" onClick={executeDelete} sx={{ borderRadius: 1 }}>
            Nonaktifkan Data
          </Button>
        ) : (
          <Button variant="contained" color="error" onClick={executeDelete} sx={{ borderRadius: 1 }}>
            Hapus Permanen
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  /* Tampilan Tunggal Profil Perusahaan (cfg.single) */
  if (cfg.single) {
    const rec = (rows && rows.length > 0) ? rows[0] : null;
    const subText = isRestrictedSupervisor
      ? `${cfg.sub} (Mode Lihat Saja — perubahan identitas legal dikelola oleh Administrator)`
      : cfg.sub;

    return (
      <Box sx={{ width: '100%' }}>
        <PageHeader
          title={cfg.title}
          subtitle={subText}
          action={
            !readOnly && (
              rec ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => openEdit(rec)}
                  sx={{ borderRadius: 1, fontWeight: 700, textTransform: 'none' }}
                >
                  Ubah Profil Perusahaan
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddRoundedIcon />}
                  onClick={openCreate}
                  sx={{ borderRadius: 1, fontWeight: 700, textTransform: 'none' }}
                >
                  Tambah Profil Perusahaan
                </Button>
              )
            )
          }
        />
        {!rec ? (
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
              Profil legal perusahaan belum diatur. Silakan klik tombol di kanan atas untuk membuat profil resmi.
            </Typography>
            {!readOnly && (
              <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ borderRadius: 1 }}>
                Isi Data Perusahaan Sekarang
              </Button>
            )}
          </Card>
        ) : (
          <Card elevation={0} sx={{ width: '100%', maxWidth: 760, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
                {rec.logo ? (
                  <Avatar variant="rounded" src={rec.logo} sx={{ width: 72, height: 72, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
                ) : (
                  <Avatar variant="rounded" sx={{ width: 72, height: 72, borderRadius: 1.5, bgcolor: 'primary.main', color: '#fff' }}>
                    <DomainRoundedIcon fontSize="large" />
                  </Avatar>
                )}
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{rec.name}</Typography>
                  <Chip size="small" variant="outlined" color="primary" label="Identitas Resmi Dokumen SFA" sx={{ borderRadius: '6px', mt: 0.5, fontWeight: 600 }} />
                </Box>
              </Stack>
              <List dense disablePadding>
                {[
                  { icon: <BadgeRoundedIcon fontSize="small" />, label: 'Nomor Pokok Wajib Pajak (NPWP)', value: rec.npwp || '-' },
                  { icon: <MapRoundedIcon fontSize="small" />, label: 'Alamat Kantor Pusat', value: rec.address || '-' },
                  { icon: <PhoneRoundedIcon fontSize="small" />, label: 'Nomor Telepon / Kontak', value: rec.phone || '-' },
                  { icon: <MailRoundedIcon fontSize="small" />, label: 'Email Resmi Perusahaan', value: rec.email || '-' },
                ].map((r) => (
                  <ListItem key={r.label} disableGutters sx={{ py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{r.icon}</ListItemIcon>
                    <ListItemText
                      primary={r.label}
                      secondary={r.value}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary', fontWeight: 600 }}
                      secondaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', mt: 0.25 } }}
                    />
                  </ListItem>
                ))}
              </List>
              <Alert severity="info" sx={{ mt: 3, borderRadius: 1 }} icon={<InfoRoundedIcon fontSize="small" />}>
                Identitas ini otomatis dipakai pada <strong>kop dokumen resmi Quotation &amp; Invoice</strong>. Rekening bank pembayaran dikelola pada modul <strong>Master Data → Bank</strong>.
              </Alert>
            </CardContent>
          </Card>
        )}
        {formDialog}
      </Box>
    );
  }

  /* Tampilan Tabel CRUD Standar */
  const tableSubText = isRestrictedSupervisor
    ? `${cfg.sub} (Mode Lihat Saja — perubahan data karyawan & akun bank dikelola oleh Administrator)`
    : (isFinance ? `${cfg.sub} (Mode Referensi — Lihat Saja)` : cfg.sub);

  return (
    <Box>
      <PageHeader
        title={cfg.title}
        subtitle={tableSubText}
        action={!readOnly && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ borderRadius: 1.25 }}>
            Tambah {cfg.addLabel}
          </Button>
        )}
      />

      <FilterToolbar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder={`Cari ${cfg.addLabel.toLowerCase()}…`}
        shownCount={filtered.length}
        totalCount={rows.length}
        unitLabel="data"
        hasActiveFilter={search !== '' || statusFilter !== 'all' || Object.values(refFilters).some((v) => v && v !== 'all')}
        onReset={() => { setSearch(''); setStatusFilter('all'); setRefFilters({}); setPage(0); }}
      >
        <TextField
          size="small"
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ width: 145 }}
        >
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="active">Aktif</MenuItem>
          <MenuItem value="inactive">Nonaktif</MenuItem>
        </TextField>

        {(cfg.filterRefs || []).map(({ table, field, label }) => (
          <TextField
            key={field}
            size="small"
            select
            label={label}
            value={refFilters[field] || 'all'}
            onChange={(e) => {
              setRefFilters((p) => ({ ...p, [field]: e.target.value }));
              setPage(0);
            }}
            sx={{ width: 170 }}
          >
            <MenuItem value="all">Semua {label}</MenuItem>
            {(db[table] || []).map((r) => (
              <MenuItem key={r.id} value={String(r.id)}>
                {r.name}{r.status === 'inactive' ? ' (Nonaktif)' : ''}
              </MenuItem>
            ))}
          </TextField>
        ))}
      </FilterToolbar>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.25,
          overflowX: 'auto',
          bgcolor: 'background.paper',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              {cfg.columns.map((c) => (
                <TableCell key={c.k}>{c.l}</TableCell>
              ))}
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? (
              paginated.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{
                    opacity: r.status === 'inactive' ? 0.6 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {cfg.columns.map((c) => (
                    <TableCell key={c.k}>
                      <Box
                        title={typeof r[c.k] === 'string' ? r[c.k] : undefined}
                        sx={{
                          maxWidth: c.maxW || 240,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {renderCell(r, c)}
                      </Box>
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title={cfg.detailPage ? 'Lihat Inventaris Gudang' : 'Detail Data'}>
                        <IconButton
                          size="small"
                          onClick={() => (cfg.detailPage ? navigate(`${cfg.detailPage}/${r.id}`) : setDetailRow(r))}
                          sx={{ '&:hover': { color: 'primary.main' } }}
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!readOnly && (
                        <>
                          <Tooltip title="Ubah Data">
                            <IconButton size="small" onClick={() => openEdit(r)} sx={{ '&:hover': { color: 'primary.main' } }}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={r.status === 'active' ? 'Nonaktifkan' : 'Aktifkan Kembali'}>
                            <IconButton
                              size="small"
                              color={r.status === 'active' ? 'warning' : 'success'}
                              onClick={() => setConfirmToggle(r)}
                            >
                              {r.status === 'active' ? <LockRoundedIcon fontSize="small" /> : <LockOpenRoundedIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus">
                            <IconButton size="small" color="error" onClick={() => setConfirmDelete(r)}>
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={cfg.columns.length + 1}>
                  <EmptyState message="Tidak ada data master yang sesuai dengan filter." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={curPage}
          onPageChange={(e, v) => setPage(v)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Baris per halaman"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </TableContainer>

      {formDialog}
      {confirmDialog}
      {detailDialog}
      {deleteDialog}
    </Box>
  );
}
