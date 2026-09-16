import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
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

import { MASTER_CONFIG } from './masterConfig';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatusChip from '../../components/ui/StatusChip';
import { formatRupiah, TASK_TYPE_LABEL } from '../../utils/helpers';
import { readFileAsDataURL } from '../../utils/files';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Opsi dropdown: statis (f.options) atau dinamis dari database (f.optionsFrom) */
function resolveOptions(f, db) {
  if (f.options) return f.options;
  if (!f.optionsFrom) return [];
  const { table, label = 'name', onlyActive = false } = f.optionsFrom;
  if (table === 'categories') return (db.categories || []).map((c) => ({ v: c, l: c }));
  let list = db[table] || [];
  if (onlyActive) list = list.filter((r) => !r.status || r.status === 'active');
  return list.map((r) => ({ v: r.id, l: r[label] ?? r.name }));
}

export default function EntityPage({ slug }) {
  const cfg = MASTER_CONFIG[slug];
  const { db, insert, update } = useDb();
  const { toast } = useToast();

  /* ===== Semua hooks di paling atas — Rules of Hooks (jangan pindahkan!) ===== */
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const rows = db[cfg.table] || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (cfg.search || []).some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, search, cfg.search]);

  /* ---------- Helper ---------- */
  const labelOf = (r) => r?.name || r?.code || r?.nik || r?.sku || 'Data';

  const openCreate = () => {
    const init = {};
    cfg.fields.forEach((f) => { init[f.k] = f.default != null ? String(f.default) : ''; });
    setValues(init); setErrors({}); setEditing(null); setFormOpen(true);
  };

  const openEdit = (rec) => {
    const init = {};
    cfg.fields.forEach((f) => { init[f.k] = rec[f.k] == null ? '' : String(rec[f.k]); });
    setValues(init); setErrors({}); setEditing(rec); setFormOpen(true);
  };

  const setVal = (k, v) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  /* ---------- Validasi (inline + unique + custom) ---------- */
  const validateAll = () => {
    const errs = {};
    cfg.fields.forEach((f) => {
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

    /* Keunikan data (HTTP 422 simulasi) */
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

    /* Validasi kustom (mis. koordinat 0,0 outlet) */
    if (cfg.validate) {
      Object.entries(cfg.validate(values) || {}).forEach(([k, msg]) => { if (msg) errs[k] = msg; });
    }
    return errs;
  };

  /* ---------- Simpan ---------- */
  const handleSubmit = () => {
    const errs = validateAll();
    setErrors(errs);
    if (Object.keys(errs).length) return toast('Periksa kembali isian formulir.', 'warning');

    setSaving(true);
    setTimeout(() => { /* simulasi latency API */
      const payload = {};
      cfg.fields.forEach((f) => {
        let v = values[f.k];
        if (f.type === 'number') v = v === '' ? (f.default ?? 0) : Number(v);
        else if (f.optionsFrom && f.optionsFrom.table !== 'categories') v = v === '' ? '' : Number(v);
        else v = String(v ?? '').trim();
        payload[f.k] = v;
      });
      if (editing) {
        update(cfg.table, editing.id, payload);
        toast('Data berhasil diperbarui.', 'success');
      } else {
        payload.status = 'active';
        insert(cfg.table, payload);
        toast('Data baru berhasil disimpan.', 'success');
      }
      setSaving(false);
      setFormOpen(false);
    }, 400);
  };

  /* ---------- Soft delete / aktifkan ---------- */
  const toggleStatus = (rec) => {
    const to = rec.status === 'active' ? 'inactive' : 'active';
    update(cfg.table, rec.id, { status: to });
    toast(
      `"${labelOf(rec)}" ${to === 'active' ? 'diaktifkan kembali' : 'dinonaktifkan (soft delete — riwayat transaksi tetap aman)'}.`,
      to === 'active' ? 'success' : 'info'
    );
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

  /* ---------- Render field form ---------- */
  const fieldProps = (f) => ({
    label: `${f.l}${f.required ? ' *' : ''}`,
    value: values[f.k] ?? '',
    onChange: (e) => setVal(f.k, e.target.value),
    error: !!errors[f.k],
    helperText: errors[f.k] || f.hint || ' ',
  });

  const renderField = (f) => {
    if (f.type === 'select') {
      const opts = resolveOptions(f, db);
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
        <TextField
          key={f.k} type="number" {...fieldProps(f)}
          inputProps={{ min: f.min, max: f.max, step: f.step || 1 }}
        />
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

  /* ---------- Dialog form (dipakai semua entitas) ---------- */
  const formDialog = (
    <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? `Ubah — ${cfg.title}` : `Tambah — ${cfg.title}`}</DialogTitle>
      <DialogContent dividers>
        {errors._form && <Alert severity="error" sx={{ mb: 2 }}>{errors._form}</Alert>}
        <Stack spacing={2}>{cfg.fields.map(renderField)}</Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setFormOpen(false)}>Batal</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const confirmDialog = (
    <ConfirmDialog
      open={!!confirmToggle}
      onClose={() => setConfirmToggle(null)}
      onConfirm={() => { toggleStatus(confirmToggle); setConfirmToggle(null); }}
      title={confirmToggle?.status === 'active' ? 'Nonaktifkan Data' : 'Aktifkan Kembali'}
      message={confirmToggle?.status === 'active'
        ? `Nonaktifkan "${labelOf(confirmToggle)}"? Data tidak dihapus permanen (soft delete / BR-MD-002) dan dapat diaktifkan kembali.`
        : `Aktifkan kembali "${labelOf(confirmToggle)}"?`}
      confirmLabel={confirmToggle?.status === 'active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
      confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'primary'}
    />
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
          <Card sx={{ maxWidth: 640 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
                {rec.logo ? (
                  <Avatar variant="rounded" src={rec.logo} sx={{ width: 64, height: 64, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                ) : (
                  <Avatar variant="rounded" sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'primary.main' }}><DomainRoundedIcon /></Avatar>
                )}
                <Box>
                  <Typography variant="h6">{rec.name}</Typography>
                  <Chip size="small" variant="outlined" color="primary" label="Identitas resmi dokumen" />
                </Box>
              </Stack>
              <List dense disablePadding>
                {[
                  { icon: <BadgeRoundedIcon fontSize="small" />, label: 'NPWP', value: rec.npwp || '-' },
                  { icon: <MapRoundedIcon fontSize="small" />, label: 'Alamat', value: rec.address || '-' },
                  { icon: <PhoneRoundedIcon fontSize="small" />, label: 'Kontak', value: rec.phone || '-' },
                  { icon: <MailRoundedIcon fontSize="small" />, label: 'Email', value: rec.email || '-' },
                ].map((r) => (
                  <ListItem key={r.label} disableGutters sx={{ py: 0.9, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{r.icon}</ListItemIcon>
                    <ListItemText
                      primary={r.label} secondary={r.value}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
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

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Cari data…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 340 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>
            ),
          }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Chip size="small" variant="outlined" label={`Total ${filtered.length} data`} />
      </Stack>

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
                {cfg.columns.map((c) => <TableCell key={c.k}>{renderCell(r, c)}</TableCell>)}
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Ubah data">
                      <IconButton size="small" onClick={() => openEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={r.status === 'active' ? 'Nonaktifkan (soft delete)' : 'Aktifkan kembali'}>
                      <IconButton
                        size="small"
                        color={r.status === 'active' ? 'warning' : 'success'}
                        onClick={() => setConfirmToggle(r)}
                      >
                        {r.status === 'active' ? <LockRoundedIcon fontSize="small" /> : <LockOpenRoundedIcon fontSize="small" />}
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
        Penghapusan memakai <b>soft delete</b> (BR-MD-002): data master yang pernah dipakai transaksi cukup dinonaktifkan — riwayat tetap aman &amp; tersimpan.
      </Alert>

      {formDialog}
      {confirmDialog}
    </Box>
  );
}