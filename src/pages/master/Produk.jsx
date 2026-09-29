import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { nowStamp, formatRupiah } from '../../utils/helpers';

const ALNUM = /^[A-Za-z0-9-]+$/;
const CELL = { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/* Baris nilai detail — gaya wadah, sama dengan dialog detail EntityPage */
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

/*
 * Master Data — Produk (halaman kustom).
 * Baris tabel = 1 produk × 1 gudang (sumber: gudangDetails + produk):
 * 1 produk muncul beberapa baris sesuai jumlah gudang penampungnya;
 * produk tanpa penempatan tampil satu baris "Belum ditempatkan".
 * Menambah produk dengan SKU yang sudah ada = memperbarui produk +
 * menambah/memperbarui penempatan (gudang sama → 1 baris, stok diperbarui).
 */
export default function ProdukPage() {
  const { db, insert, update, mutate, remove } = useDb();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [gudangFilter, setGudangFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); /* null | { productId } | { productId, gudangId } */
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [skuExists, setSkuExists] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  const products = db.products || [];
  const gudangs = db.warehouses || [];
  const placements = db.gudangDetails || [];

  /* ===== Baris = produk × gudang ===== */
  const rows = useMemo(() => {
    const out = [];
    products.forEach((p) => {
      const mine = placements.filter((r) => r.productId === p.id);
      if (mine.length) {
        mine.forEach((r) => {
          const w = gudangs.find((x) => x.id === r.gudangId);
          out.push({
            key: `${p.id}-${r.gudangId}`, placed: true,
            productId: p.id, sku: p.sku, name: p.name, category: p.category,
            unit: p.unit, hargaJual: p.hargaJual, hargaBeli: p.hargaBeli,
            pcsPerUnit: p.pcsPerUnit, desc: p.desc, status: p.status, stock: p.stock,
            gudangId: r.gudangId, gudangCode: w ? w.code : `#${r.gudangId}`,
            gudangName: w ? w.name : '-', stok: r.stokTercatat,
          });
        });
      } else {
        out.push({
          key: `u-${p.id}`, placed: false,
          productId: p.id, sku: p.sku, name: p.name, category: p.category,
          unit: p.unit, hargaJual: p.hargaJual, hargaBeli: p.hargaBeli,
          pcsPerUnit: p.pcsPerUnit, desc: p.desc, status: p.status, stock: p.stock,
          gudangId: null, gudangCode: null, gudangName: null, stok: 0,
        });
      }
    });
    return out;
  }, [products, gudangs, placements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === 'active' && (r.status || 'active') !== 'active') return false;
      if (statusFilter === 'inactive' && r.status !== 'inactive') return false;
      if (gudangFilter === 'none' && r.placed) return false;
      if (gudangFilter !== 'all' && gudangFilter !== 'none' && String(r.gudangId) !== gudangFilter) return false;
      if (!q) return true;
      return r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
        || (r.gudangCode || '').toLowerCase().includes(q) || (r.gudangName || '').toLowerCase().includes(q);
    });
  }, [rows, search, gudangFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  const totalStok = placements.reduce((s, r) => s + (Number(r.stokTercatat) || 0), 0);
  const unplacedCount = products.filter((p) => !placements.some((r) => r.productId === p.id)).length;

  /* ===== Helper ===== */
  const productRefs = (row) => {
    const list = [];
    const push = (n, label) => { if (n) list.push({ n, label }); };
    push((db.orders || []).filter((o) => (o.items || []).some((it) => it.productId === row.productId)).length, 'order');
    push((db.quotations || []).filter((q) => (q.items || []).some((it) => it.productId === row.productId)).length, 'quotation');
    push((db.audits || []).filter((a) => (a.stocks || []).some((it) => it.productId === row.productId)).length, 'audit (stock-take)');
    push((db.suppliers || []).filter((s) => (s.productIds || []).includes(row.productId)).length, 'supplier yang memasok');
    return { total: list.reduce((s, x) => s + x.n, 0), list };
  };

  /* Upsert penempatan (gudang × produk): stok 0 = hapus penempatan.
     Selalu sinkronkan products.stock = jumlah seluruh penempatan. */
  const upsertPlacement = (productId, gudangId, stok) => mutate((d) => {
    if (!Array.isArray(d.gudangDetails)) d.gudangDetails = [];
    d.gudangDetails = d.gudangDetails.filter((r) => !(r.productId === productId && r.gudangId === gudangId));
    if (stok > 0) {
      d.gudangDetails.push({
        gudangId, productId, stokTercatat: stok,
        stokMinimum: 10, sumberStok: 'Manual SFA', statusSync: 'Tidak Digunakan',
        createdAt: nowStamp(), updatedAt: nowStamp(),
      });
    }
    const p = (d.products || []).find((x) => x.id === productId);
    if (p) p.stock = d.gudangDetails.filter((r) => r.productId === productId)
      .reduce((s, r) => s + (Number(r.stokTercatat) || 0), 0);
  });

  const setVal = (k, v) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  /* ===== Form ===== */
  const openCreate = () => {
    setValues({ sku: '', name: '', category: '', unit: 'pcs', hargaJual: '', hargaBeli: '', pcsPerUnit: '1', gudangId: '', stok: '', desc: '' });
    setErrors({}); setSkuExists(false); setEditing(null); setFormOpen(true);
  };

  const openEditRow = (r) => {
    setValues({
      sku: r.sku, name: r.name, category: r.category, unit: r.unit,
      hargaJual: String(r.hargaJual ?? ''), hargaBeli: String(r.hargaBeli ?? ''),
      pcsPerUnit: String(r.pcsPerUnit ?? 1),
      gudangId: r.placed ? String(r.gudangId) : '',
      stok: r.placed ? String(r.stok) : '',
      desc: r.desc || '',
    });
    setErrors({}); setSkuExists(true);
    setEditing(r.placed ? { productId: r.productId, gudangId: r.gudangId } : { productId: r.productId });
    setFormOpen(true);
  };

  /* SKU yang sudah terdaftar → prefill data produk (jalur "tambah penempatan") */
  const onSkuChange = (v) => {
    setVal('sku', v);
    if (editing) return;
    const found = v.trim() ? products.find((p) => p.sku.toLowerCase() === v.trim().toLowerCase()) : null;
    setSkuExists(!!found);
    if (found) {
      setValues((prev) => ({
        ...prev,
        name: found.name, category: found.category, unit: found.unit,
        hargaJual: String(found.hargaJual ?? ''), hargaBeli: String(found.hargaBeli ?? ''),
        pcsPerUnit: String(found.pcsPerUnit ?? 1), desc: found.desc || '',
      }));
    }
  };

  const validate = () => {
    const v = values;
    const errs = {};
    if (!v.sku || !v.sku.trim()) errs.sku = 'Kolom ini wajib diisi.';
    else if (!ALNUM.test(v.sku.trim())) errs.sku = 'Alfanumerik tanpa spasi.';
    else if (v.sku.trim().length > 30) errs.sku = 'Maksimal 30 karakter.';
    if (!v.name || !v.name.trim()) errs.name = 'Kolom ini wajib diisi.';
    else if (v.name.trim().length > 100) errs.name = 'Maksimal 100 karakter.';
    if (!v.category) errs.category = 'Kolom ini wajib diisi.';
    if (!v.unit) errs.unit = 'Kolom ini wajib diisi.';
    const hj = v.hargaJual === '' ? '' : Number(v.hargaJual);
    if (hj === '' || hj == null) errs.hargaJual = 'Kolom ini wajib diisi.';
    else if (Number.isNaN(hj) || hj < 1) errs.hargaJual = 'Nilai minimal 1 (integer).';
    if (v.hargaBeli !== '' && v.hargaBeli != null) {
      const hb = Number(v.hargaBeli);
      if (Number.isNaN(hb) || hb < 0) errs.hargaBeli = 'Nilai minimal 0.';
    }
    const ppu = v.pcsPerUnit === '' ? '' : Number(v.pcsPerUnit);
    if (ppu === '' || Number.isNaN(ppu) || ppu < 1) errs.pcsPerUnit = 'Nilai minimal 1.';
    if (v.gudangId !== '') {
      const st = v.stok === '' ? 0 : Number(v.stok);
      if (Number.isNaN(st) || st < 0) errs.stok = 'Penempatan stok harus berupa angka ≥ 0.';
    }
    if (v.desc && v.desc.length > 200) errs.desc = 'Maksimal 200 karakter.';
    return errs;
  };

  const submit = (andAgain = false) => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return toast('Periksa kembali isian formulir.', 'warning');
    setSaving(true);
    setTimeout(() => {
      const prodPayload = {
        sku: values.sku.trim(), name: values.name.trim(), category: values.category,
        unit: values.unit,
        hargaJual: Number(values.hargaJual) || 0,
        hargaBeli: values.hargaBeli === '' ? 0 : (Number(values.hargaBeli) || 0),
        pcsPerUnit: Number(values.pcsPerUnit) || 1,
        desc: (values.desc || '').trim(),
      };
      const gid = values.gudangId === '' ? null : Number(values.gudangId);
      const stok = values.stok === '' ? 0 : Math.max(0, Math.floor(Number(values.stok) || 0));

      let productId;
      let msg;
      if (editing) {
        productId = editing.productId;
        update('products', productId, prodPayload);
        if (editing.gudangId != null && gid !== editing.gudangId) {
          upsertPlacement(productId, editing.gudangId, 0); /* pindah gudang: lepas penempatan lama */
        }
        msg = 'Data produk berhasil diperbarui.';
      } else {
        const existing = products.find((p) => p.sku.toLowerCase() === prodPayload.sku.toLowerCase());
        if (existing) {
          productId = existing.id;
          update('products', productId, prodPayload);
          msg = 'SKU sudah terdaftar — data produk diperbarui & penempatan stok disimpan.';
        } else {
          const rec = insert('products', { ...prodPayload, status: 'active', stock: 0 });
          productId = rec.id;
          msg = 'Produk baru berhasil disimpan.';
        }
      }
      if (gid != null) upsertPlacement(productId, gid, stok);
      else upsertPlacement(productId, -1, 0); /* resync total tanpa mengubah penempatan */
      toast(msg, 'success');
      setSaving(false);
      if (andAgain) openCreate(); else setFormOpen(false);
    }, 400);
  };

  /* ===== Hapus ===== */
  const delRow = confirmDelete;
  const delRefs = delRow && !delRow.placed ? productRefs(delRow) : { total: 0, list: [] };

  const executeDelete = () => {
    const r = confirmDelete;
    if (!r) return;
    if (r.placed) {
      upsertPlacement(r.productId, r.gudangId, 0);
      toast(`Penempatan ${r.sku} di ${r.gudangCode} dihapus — ${r.stok} pcs dikeluarkan. Produk tetap tersimpan.`, 'success');
    } else if (delRefs.total > 0) {
      update('products', r.productId, { status: 'inactive' });
      toast(`"${r.name}" dipakai ${delRefs.total} transaksi/relasi — dinonaktifkan (soft delete, FSD 3.3).`, 'info', 5500);
    } else {
      remove('products', r.productId);
      toast(`"${r.name}" dihapus permanen — belum dipakai transaksi mana pun.`, 'success');
    }
    setConfirmDelete(null);
  };

  const doToggle = () => {
    const r = confirmToggle;
    if (!r) return;
    const to = (r.status || 'active') === 'active' ? 'inactive' : 'active';
    update('products', r.productId, { status: to });
    toast(to === 'active'
      ? `Produk "${r.name}" diaktifkan kembali — berlaku untuk semua baris penempatannya.`
      : `Produk "${r.name}" dinonaktifkan (soft delete, FSD 3.3) — berlaku untuk semua baris penempatannya.`,
      to === 'active' ? 'success' : 'info');
    setConfirmToggle(null);
  };

  /* ===== Detail ===== */
  const detailRefs = detailRow ? productRefs(detailRow) : { total: 0, list: [] };
  const detailProd = detailRow ? products.find((p) => p.id === detailRow.productId) : null;
  const detailPlacements = detailRow
    ? placements.filter((r) => r.productId === detailRow.productId)
      .map((r) => {
        const w = gudangs.find((x) => x.id === r.gudangId);
        return `${w ? w.code : r.gudangId}: ${r.stokTercatat}`;
      }).join(' • ')
    : '';

  const fieldProps = (k, l, extra = {}) => ({
    label: l, value: values[k] ?? '', onChange: (e) => setVal(k, e.target.value),
    error: !!errors[k], helperText: errors[k] || ' ', ...extra,
  });

  return (
    <Box>
      <PageHeader
        title="Master Data — Produk"
        subtitle="Katalog produk & penempatan stok per gudang — 1 produk dapat menempati beberapa gudang."
        action={(
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
            Tambah Produk
          </Button>
        )}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<Inventory2RoundedIcon />} value={products.length} label="Total produk" />
        <StatCard icon={<WarehouseRoundedIcon />} value={totalStok} label="Total stok (pcs)" color="success" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={unplacedCount} label="Belum ditempatkan" color="warning" />
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
            <FilterListRoundedIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
          </Stack>
          <TextField size="small" placeholder="Cari produk / SKU / gudang…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
          <TextField size="small" select label="Gudang" value={gudangFilter}
            onChange={(e) => { setGudangFilter(e.target.value); setPage(0); }} sx={{ width: 190 }}>
            <MenuItem value="all">Semua Gudang</MenuItem>
            <MenuItem value="none">Belum Ditempatkan</MenuItem>
            {gudangs.filter((w) => (w.status || 'active') === 'active').map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>{w.code} — {w.name}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" select label="Status" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ width: 150 }}>
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="active">Aktif</MenuItem>
            <MenuItem value="inactive">Nonaktif</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {filtered.length} dari {rows.length} baris
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell><TableCell>Nama Produk</TableCell><TableCell>Kategori</TableCell>
              <TableCell>Satuan</TableCell><TableCell align="right">Harga Jual</TableCell>
              <TableCell align="right">Harga Beli</TableCell><TableCell>Gudang</TableCell>
              <TableCell align="right">Stok</TableCell><TableCell>Status</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? paginated.map((r) => (
              <TableRow key={r.key} sx={{ opacity: r.status === 'inactive' ? 0.55 : 1 }}>
                <TableCell><Box title={r.sku} sx={{ ...CELL, fontFamily: 'monospace', fontSize: 13 }}>{r.sku}</Box></TableCell>
                <TableCell><Box title={r.name} sx={CELL}><Typography variant="body2" fontWeight={600}>{r.name}</Typography></Box></TableCell>
                <TableCell><Box title={r.category} sx={CELL}>{r.category || '-'}</Box></TableCell>
                <TableCell>{r.unit}</TableCell>
                <TableCell align="right">{formatRupiah(r.hargaJual)}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>{formatRupiah(r.hargaBeli)}</TableCell>
                <TableCell>
                  {r.placed ? (
                    <Box title={`${r.gudangCode} — ${r.gudangName}`} sx={CELL}>{r.gudangCode} — {r.gudangName}</Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">— Belum ditempatkan</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  {r.placed
                    ? <Typography variant="body2" fontWeight={700}>{r.stok}</Typography>
                    : <Typography variant="caption" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell><StatusChip kind="active" status={r.status || 'active'} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Detail data">
                      <IconButton size="small" onClick={() => setDetailRow(r)}><VisibilityRoundedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Ubah data">
                      <IconButton size="small" onClick={() => openEditRow(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={(r.status || 'active') === 'active' ? 'Nonaktifkan produk (semua baris)' : 'Aktifkan kembali produk'}>
                      <IconButton size="small" color={(r.status || 'active') === 'active' ? 'warning' : 'success'}
                        onClick={() => setConfirmToggle({ productId: r.productId, name: r.name, status: r.status })}>
                        {(r.status || 'active') === 'active' ? <LockRoundedIcon fontSize="small" /> : <LockOpenRoundedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={r.placed ? 'Hapus penempatan di gudang ini' : 'Hapus produk'}>
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(r)}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={10}><EmptyState message="Data tidak ditemukan." /></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filtered.length} page={curPage}
          onPageChange={(e, v) => setPage(v)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Baris per halaman"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }} />
      </TableContainer>

      <Alert severity="info" sx={{ mt: 1.5 }} icon={<InfoRoundedIcon fontSize="small" />}>
        <b>Baris = penempatan</b>: 1 produk dapat menempati beberapa gudang. <b>Hapus</b> pada baris ber-gudang
        hanya mengeluarkan stok dari gudang itu (produk tetap tersimpan); produk tanpa penempatan dihapus
        sesuai FSD 3.3 (dipakai transaksi → soft delete).
      </Alert>

      {/* ===== Dialog Form ===== */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? `Ubah — ${values.sku || 'Produk'}` : 'Tambah — Produk'}</DialogTitle>
        <DialogContent dividers>
          {skuExists && (
            <Alert severity="info" sx={{ mb: 2 }}>
              SKU <b>sudah terdaftar</b> — data produk akan <b>diperbarui</b>. Pilih gudang untuk
              menambah penempatan baru; <b>gudang yang sama → 1 baris</b>, stok diperbarui menjadi nilai baru.
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField {...fieldProps('sku', 'Kode SKU *')} onChange={(e) => onSkuChange(e.target.value)}
              inputProps={{ maxLength: 30 }} disabled={!!editing} />
            <TextField {...fieldProps('name', 'Nama Produk *')} inputProps={{ maxLength: 100 }} />
            <TextField select {...fieldProps('category', 'Kategori *')}>
              {(db.categories || []).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField select {...fieldProps('unit', 'Satuan *')}>
              <MenuItem value="pcs">Pcs</MenuItem>
              <MenuItem value="box">Box</MenuItem>
            </TextField>
            <TextField {...fieldProps('hargaJual', 'Harga Jual (Rp) *')} type="number"
              inputProps={{ min: 1 }} hint="Dipakai transaksi Order & Quotation." />
            <TextField {...fieldProps('hargaBeli', 'Harga Beli (Rp)')} type="number"
              inputProps={{ min: 0 }} hint="Harga perolehan dari supplier (opsional)." />
            <TextField {...fieldProps('pcsPerUnit', 'Konversi ke Pcs *')} type="number"
              inputProps={{ min: 1 }} hint="Mis. 1 box = 12 pcs (#47)." />
            <TextField select {...fieldProps('gudangId', 'Gudang Penempatan')}>
              <MenuItem value="">— Tanpa penempatan (stok 0) —</MenuItem>
              {gudangs.filter((w) => (w.status || 'active') === 'active'
                || (editing?.gudangId != null && w.id === editing.gudangId)).map((w) => (
                <MenuItem key={w.id} value={String(w.id)}>
                  {w.code} — {w.name}{(w.status || 'active') !== 'active' ? ' (Nonaktif)' : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField {...fieldProps('stok', 'Stok di gudang terpilih (pcs)')} type="number"
              disabled={values.gudangId === ''} inputProps={{ min: 0 }}
              hint={values.gudangId === '' ? 'Pilih gudang dulu untuk mengisi stok.' : 'Gudang yang sama → stok diperbarui jadi nilai ini.'} />
            <TextField {...fieldProps('desc', 'Deskripsi')} multiline minRows={2} inputProps={{ maxLength: 200 }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Batal</Button>
          {!editing && (
            <Button onClick={() => submit(true)} disabled={saving}>Simpan &amp; Tambah Lagi</Button>
          )}
          <Button variant="contained" onClick={() => submit(false)} disabled={saving}>
            {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Dialog Detail ===== */}
      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
          Detail Produk — {detailRow ? detailRow.name : ''}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          {detailRow && (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <StatusChip kind="active" status={detailRow.status || 'active'} />
                <Stack direction="row" spacing={0.75}>
                  <Chip size="small" variant="outlined" label={`SKU ${detailRow.sku}`} />
                  {detailProd?.createdAt && <Chip size="small" variant="outlined" label={`Dibuat ${detailProd.createdAt}`} />}
                </Stack>
              </Stack>
              <Stack spacing={0.5}>
                <KVRow label="Nama Produk" value={detailRow.name} />
                <KVRow label="Kategori" value={detailRow.category || '-'} />
                <KVRow label="Satuan" value={detailRow.unit} />
                <KVRow label="Harga Jual" value={formatRupiah(detailRow.hargaJual)} />
                <KVRow label="Harga Beli" value={formatRupiah(detailRow.hargaBeli)} />
                <KVRow label="Konversi" value={`1 ${detailRow.unit} = ${detailRow.pcsPerUnit ?? 1} pcs (#47)`} />
                <KVRow label="Penempatan (gudang)" value={detailPlacements || 'Belum ditempatkan'} />
                <KVRow label="Total Stok" value={`${detailProd?.stock ?? 0} pcs (jumlah semua gudang)`} />
                {detailRow.desc && <KVRow label="Deskripsi" value={detailRow.desc} />}
              </Stack>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>Penggunaan Data</Typography>
                {detailRefs.total > 0 ? (
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                    {detailRefs.list.map((s) => (
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
              onClick={() => { const r = detailRow; setDetailRow(null); openEditRow(r); }}>
              Ubah Data
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ===== Dialog Hapus ===== */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
          Hapus — {delRow ? (delRow.placed ? `Penempatan ${delRow.sku} di ${delRow.gudangCode}` : `Produk ${delRow.sku}`) : ''}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          {delRow && (delRow.placed ? (
            <Alert severity="warning">
              Mengeluarkan <b>{delRow.stok} pcs</b> {delRow.name} dari gudang <b>{delRow.gudangCode} — {delRow.gudangName}</b>.
              Produk tetap tersimpan{delRow.stock - delRow.stok > 0 ? ` (sisa stok total ${delRow.stock - delRow.stok} pcs di gudang lain)` : ' — akan menjadi "Belum ditempatkan"'}.
              Tindakan ini tidak dapat dibatalkan.
            </Alert>
          ) : delRefs.total > 0 ? (
            <>
              <Alert severity="error" sx={{ mb: 1.5 }}>
                <b>PERINGATAN:</b> produk ini sudah dipakai oleh <b>{delRefs.total}</b> transaksi/relasi.
                Sesuai FSD 3.3 (Soft Deletes), produk yang pernah dipakai transaksi
                <b> tidak boleh dihapus permanen</b> agar riwayat Order/Quotation/Audit lama tidak rusak.
              </Alert>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                {delRefs.list.map((s) => (
                  <Chip key={s.label} size="small" color="error" variant="outlined" label={`${s.n} ${s.label}`} />
                ))}
              </Stack>
            </>
          ) : (
            <Alert severity="warning">
              Produk ini <b>belum dipakai</b> transaksi/relasi mana pun dan dapat dihapus permanen.
              <b> Tindakan ini tidak dapat dibatalkan.</b>
            </Alert>
          ))}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setConfirmDelete(null)}>Batal</Button>
          {delRow && delRow.placed ? (
            <Button variant="contained" color="error" onClick={executeDelete}>Hapus Penempatan</Button>
          ) : delRefs.total > 0 ? (
            <Button variant="contained" color="warning" onClick={executeDelete}>Nonaktifkan (Soft Delete)</Button>
          ) : (
            <Button variant="contained" color="error" onClick={executeDelete}>Hapus Permanen</Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={doToggle}
        title={confirmToggle?.status === 'active' ? 'Nonaktifkan Produk' : 'Aktifkan Kembali Produk'}
        message={confirmToggle?.status === 'active'
          ? `Nonaktifkan produk "${confirmToggle?.name}"? Berlaku untuk SEMUA baris penempatannya. Data tidak dihapus permanen (soft delete / FSD 3.3) dan dapat diaktifkan kembali.`
          : `Aktifkan kembali produk "${confirmToggle?.name}"? Semua baris penempatannya ikut aktif.`}
        confirmLabel={confirmToggle?.status === 'active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
        confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'primary'}
      />
    </Box>
  );
}