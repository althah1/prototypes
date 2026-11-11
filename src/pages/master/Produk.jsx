import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
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
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import FilterToolbar from '../../components/ui/FilterToolbar';
import DetailGrid, { FormSection, ModalHeader } from '../../components/ui/DetailGrid';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { formatRupiah, nowStamp } from '../../utils/helpers';
import { ensureGudangDetails } from '../../utils/gudangUtils';

const ALNUM = /^[A-Za-z0-9-]+$/;
const CELL = { maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export default function Produk() {
  const { user } = useAuth();
  const readOnly = user?.role === 'finance';
  const { db, insert, update, mutate, remove } = useDb();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [gudangFilter, setGudangFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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
  const [skuExists, setSkuExists] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureGudangDetails(db, mutate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const products = db.products || [];
  const gudangs = db.warehouses || [];
  const placements = db.gudangDetails || [];

  const rows = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      const gList = placements.filter((r) => r.productId === p.id);
      if (gList.length) {
        gList.forEach((pl) => {
          const w = gudangs.find((x) => x.id === pl.gudangId);
          list.push({
            key: `${p.id}-${pl.gudangId}`,
            productId: p.id,
            gudangId: pl.gudangId,
            sku: p.sku,
            name: p.name,
            category: p.category,
            unit: p.unit,
            hargaJual: p.hargaJual,
            hargaBeli: p.hargaBeli ?? 0,
            pcsPerUnit: p.pcsPerUnit ?? 1,
            desc: p.desc,
            status: p.status || 'active',
            gudangName: w?.name || '-',
            gudangCode: w?.code || `#${pl.gudangId}`,
            gudangStatus: w?.status || 'active',
            stok: pl.stokTercatat,
            placed: true,
          });
        });
      } else {
        list.push({
          key: `${p.id}-none`,
          productId: p.id,
          gudangId: null,
          sku: p.sku,
          name: p.name,
          category: p.category,
          unit: p.unit,
          hargaJual: p.hargaJual,
          hargaBeli: p.hargaBeli ?? 0,
          pcsPerUnit: p.pcsPerUnit ?? 1,
          desc: p.desc,
          status: p.status || 'active',
          gudangName: '-',
          gudangCode: '-',
          gudangStatus: 'none',
          stok: 0,
          placed: false,
        });
      }
    });
    return list;
  }, [products, gudangs, placements]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter === 'active') list = list.filter((r) => (r.status || 'active') === 'active');
    if (statusFilter === 'inactive') list = list.filter((r) => r.status === 'inactive');
    if (gudangFilter === 'none') list = list.filter((r) => !r.placed);
    else if (gudangFilter !== 'all') list = list.filter((r) => String(r.gudangId) === String(gudangFilter));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.gudangName.toLowerCase().includes(q) ||
          r.gudangCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, gudangFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  const totalStok = placements.reduce((s, r) => s + (Number(r.stokTercatat) || 0), 0);
  const unplacedCount = products.filter((p) => !placements.some((r) => r.productId === p.id)).length;

  const productRefs = (row) => {
    const list = [];
    const push = (n, label) => { if (n) list.push({ n, label }); };
    push((db.orders || []).filter((o) => (o.items || []).some((it) => it.productId === row.productId)).length, 'order');
    push((db.quotations || []).filter((q) => (q.items || []).some((it) => it.productId === row.productId)).length, 'quotation');
    push((db.audits || []).filter((a) => (a.stocks || []).some((it) => it.productId === row.productId)).length, 'audit (stock-take)');
    push((db.supplie || []).filter((s) => (s.productIds || []).includes(row.productId)).length, 'supplier yang memasok');
    return { total: list.reduce((s, x) => s + x.n, 0), list };
  };

  const upsertPlacement = (productId, gudangId, stok) => mutate((d) => {
    if (!Array.isArray(d.gudangDetails)) d.gudangDetails = [];
    d.gudangDetails = d.gudangDetails.filter((r) => !(r.productId === productId && r.gudangId === gudangId));
    if (stok > 0) {
      d.gudangDetails.push({
        gudangId,
        productId,
        stokTercatat: stok,
        stokMinimum: 10,
        sumberStok: 'Manual SFA',
        statusSync: 'Tidak Digunakan',
        createdAt: nowStamp(),
        updatedAt: nowStamp(),
      });
    }
    const p = (d.products || []).find((x) => x.id === productId);
    if (p) {
      p.stock = d.gudangDetails
        .filter((r) => r.productId === productId)
        .reduce((s, r) => s + (Number(r.stokTercatat) || 0), 0);
    }
  });

  const setVal = (k, v) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const resetCreateState = () => {
    setValues({
      sku: '',
      name: '',
      category: '',
      unit: 'pcs',
      hargaJual: '',
      hargaBeli: '',
      pcsPerUnit: '1',
      gudangId: '',
      stok: '',
      desc: '',
    });
    setErrors({});
    setSkuExists(false);
    setEditing(null);
  };

  const openCreate = () => {
    captureScrollPos();
    resetCreateState();
    setFormOpen(true);
  };

  const openEditRow = (r) => {
    captureScrollPos();
    setValues({
      sku: r.sku,
      name: r.name,
      category: r.category,
      unit: r.unit,
      hargaJual: String(r.hargaJual ?? ''),
      hargaBeli: String(r.hargaBeli ?? ''),
      pcsPerUnit: String(r.pcsPerUnit ?? 1),
      gudangId: r.placed ? String(r.gudangId) : '',
      stok: r.placed ? String(r.stok) : '',
      desc: r.desc || '',
    });
    setErrors({});
    setSkuExists(true);
    setEditing(r.placed ? { productId: r.productId, gudangId: r.gudangId } : { productId: r.productId });
    setFormOpen(true);
  };

  const onSkuChange = (val) => {
    setVal('sku', val);
    if (editing) return;
    const hit = products.find((p) => p.sku.toLowerCase() === val.trim().toLowerCase());
    if (hit) {
      setSkuExists(true);
      setValues((p) => ({
        ...p,
        name: hit.name,
        category: hit.category,
        unit: hit.unit,
        hargaJual: String(hit.hargaJual ?? ''),
        hargaBeli: String(hit.hargaBeli ?? ''),
        pcsPerUnit: String(hit.pcsPerUnit ?? 1),
        desc: hit.desc || '',
      }));
    } else {
      setSkuExists(false);
    }
  };

  const validate = () => {
    const v = values;
    const errs = {};
    if (!v.sku || !v.sku.trim()) errs.sku = 'Kode SKU wajib diisi.';
    else if (!ALNUM.test(v.sku.trim())) errs.sku = 'Kode SKU harus alfanumerik tanpa spasi.';
    else if (v.sku.trim().length > 30) errs.sku = 'Kode SKU maksimal 30 karakter.';

    if (!v.name || !v.name.trim()) errs.name = 'Nama Produk wajib diisi.';
    else if (v.name.trim().length > 100) errs.name = 'Nama Produk maksimal 100 karakter.';

    if (!v.category) errs.category = 'Kategori wajib dipilih.';
    if (!v.unit) errs.unit = 'Satuan Jual wajib dipilih.';

    if (v.unit === 'box') {
      const ppu = v.pcsPerUnit === '' ? '' : Number(v.pcsPerUnit);
      if (ppu === '' || Number.isNaN(ppu) || ppu < 1) errs.pcsPerUnit = 'Isi per Box harus berupa angka minimal 1.';
    }

    const hb = v.hargaBeli === '' ? 0 : Number(v.hargaBeli);
    if (v.hargaBeli !== '' && (Number.isNaN(hb) || hb < 0)) errs.hargaBeli = 'Harga Beli tidak boleh kurang dari 0.';

    const hj = v.hargaJual === '' ? '' : Number(v.hargaJual);
    if (hj === '' || hj == null) errs.hargaJual = 'Harga Jual wajib diisi.';
    else if (Number.isNaN(hj) || hj < 1) errs.hargaJual = 'Harga Jual harus berupa angka bulat minimal 1.';

    if (v.gudangId !== '') {
      const st = v.stok === '' ? 0 : Number(v.stok);
      if (Number.isNaN(st) || st < 0) errs.stok = 'Stok di gudang harus berupa angka minimal 0.';
    }

    if (v.desc && v.desc.length > 200) errs.desc = 'Deskripsi maksimal 200 karakter.';
    return errs;
  };

  const submit = (andAgain = false) => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return toast('Periksa kembali isian formulir.', 'warning');

    setSaving(true);
    setTimeout(() => {
      const prodPayload = {
        sku: values.sku.trim(),
        name: values.name.trim(),
        category: values.category,
        unit: values.unit,
        hargaJual: Number(values.hargaJual) || 0,
        hargaBeli: values.hargaBeli === '' ? 0 : Number(values.hargaBeli) || 0,
        pcsPerUnit: values.unit === 'box' ? Number(values.pcsPerUnit) || 1 : 1,
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
          upsertPlacement(productId, editing.gudangId, 0);
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
      else upsertPlacement(productId, -1, 0);

      toast(msg, 'success');
      setSaving(false);
      if (andAgain) resetCreateState();
      else handleCloseForm();
    }, 350);
  };

  const delRow = confirmDelete;
  const delRefs = delRow && !delRow.placed ? productRefs(delRow) : { total: 0, list: [] };

  const executeDelete = () => {
    const r = confirmDelete;
    if (!r) return;
    if (r.placed) {
      upsertPlacement(r.productId, r.gudangId, 0);
      toast(`Penempatan ${r.sku} di ${r.gudangCode} dihapus — stok dikeluarkan. Produk tetap tersimpan.`, 'success');
    } else if (delRefs.total > 0) {
      update('products', r.productId, { status: 'inactive' });
      toast(`"${r.name}" dipakai transaksi — dinonaktifkan agar riwayat tetap tersimpan.`, 'info', 5000);
    } else {
      remove('products', r.productId);
      toast(`"${r.name}" dihapus permanen.`, 'success');
    }
    setConfirmDelete(null);
  };

  const doToggle = () => {
    const r = confirmToggle;
    if (!r) return;
    const to = (r.status || 'active') === 'active' ? 'inactive' : 'active';
    update('products', r.productId, { status: to });
    toast(
      to === 'active'
        ? `Produk "${r.name}" diaktifkan kembali untuk semua penempatannya.`
        : `Produk "${r.name}" dinonaktifkan untuk semua penempatannya.`,
      to === 'active' ? 'success' : 'info'
    );
    setConfirmToggle(null);
  };

  const detailPlacementList = detailRow
    ? placements.filter((r) => r.productId === detailRow.productId)
    : [];
  const detailTotalStok = detailPlacementList.reduce((sum, item) => sum + (Number(item.stokTercatat) || 0), 0);

  const renderAlokasiGudangDetail = () => {
    if (!detailPlacementList.length) {
      return (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Belum ditempatkan di gudang mana pun
        </Typography>
      );
    }
    return (
      <Box sx={{ width: '100%', mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>Gudang</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>Kode</TableCell>
              <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>Stok Fisik</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detailPlacementList.map((pl) => {
              const w = gudangs.find((x) => x.id === pl.gudangId);
              return (
                <TableRow key={pl.id || pl.gudangId}>
                  <TableCell sx={{ fontSize: 12.5, py: 0.75, px: 1.5, fontWeight: 600 }}>
                    {w?.name || '-'}
                    {w?.status === 'inactive' ? ' (Nonaktif)' : ''}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, py: 0.75, px: 1.5, color: 'text.secondary', fontFamily: 'monospace' }}>
                    {w?.code || `#${pl.gudangId}`}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: 12.5, py: 0.75, px: 1.5 }}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.25,
                        borderRadius: '4px',
                        bgcolor: 'action.hover',
                        border: '1px solid',
                        borderColor: 'divider',
                        fontWeight: 700,
                        fontSize: 12,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {pl.stokTercatat} pcs
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell colSpan={2} sx={{ fontSize: 12, fontWeight: 750, py: 0.75, px: 1.5 }}>
                Total Akumulasi Stok
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 800, py: 0.75, px: 1.5, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                {detailTotalStok} pcs
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    );
  };

  const detailFields = detailRow
    ? [
        { label: 'Kode SKU', value: detailRow.sku, mono: true },
        { label: 'Nama Produk', value: detailRow.name },
        { label: 'Kategori', value: detailRow.category || '-' },
        {
          label: 'Satuan Jual',
          value: detailRow.unit === 'box' ? 'Box' : detailRow.unit === 'pcs' ? 'Pcs' : (detailRow.unit || '-'),
        },
        ...((detailRow.unit === 'box' || (detailRow.pcsPerUnit ?? 1) > 1)
          ? [{ label: 'Konversi Satuan', value: `1 ${detailRow.unit} = ${detailRow.pcsPerUnit ?? 1} pcs` }]
          : []),
        { label: 'Harga Beli (Modal)', value: formatRupiah(detailRow.hargaBeli), tabular: true },
        { label: 'Harga Jual', value: formatRupiah(detailRow.hargaJual), tabular: true },
        { label: 'Alokasi Stok Gudang', isLong: true, customNode: renderAlokasiGudangDetail() },
        { label: 'Deskripsi', value: detailRow.desc || '-', isLong: true },
      ]
    : [];

  const gudangOpts = useMemo(() => {
    return gudangs.filter((w) => (w.status || 'active') === 'active' || String(w.id) === String(values.gudangId));
  }, [gudangs, values.gudangId]);

  const gudangValue = gudangOpts.find((w) => String(w.id) === String(values.gudangId)) || null;

  return (
    <Box>
      <PageHeader
        title="Master Data — Produk"
        subtitle="Daftar produk, penempatan stok per gudang, dan sinkronisasi harga."
        action={
          !readOnly && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ borderRadius: 1.25 }}>
              Tambah Produk
            </Button>
          )
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<Inventory2RoundedIcon />} value={products.length} label="Total produk" />
        <StatCard icon={<WarehouseRoundedIcon />} value={totalStok} label="Total stok (pcs)" color="success" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={unplacedCount} label="Belum ditempatkan" color="warning" />
      </Box>

      <FilterToolbar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder="Cari nama, SKU, atau gudang…"
        shownCount={filtered.length}
        totalCount={rows.length}
        unitLabel="baris penempatan"
        hasActiveFilter={search !== '' || gudangFilter !== 'all' || statusFilter !== 'all'}
        onReset={() => { setSearch(''); setGudangFilter('all'); setStatusFilter('all'); setPage(0); }}
      >
        <TextField
          size="small"
          select
          label="Gudang"
          value={gudangFilter}
          onChange={(e) => { setGudangFilter(e.target.value); setPage(0); }}
          sx={{ width: 190 }}
        >
          <MenuItem value="all">Semua Gudang</MenuItem>
          <MenuItem value="none">Belum Ditempatkan</MenuItem>
          {gudangs
            .filter((w) => (w.status || 'active') === 'active')
            .map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>
                {w.code} — {w.name}
              </MenuItem>
            ))}
        </TextField>

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
              <TableCell>SKU</TableCell>
              <TableCell>Nama Produk</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell>Satuan</TableCell>
              <TableCell align="right">Harga Beli</TableCell>
              <TableCell align="right">Harga Jual</TableCell>
              <TableCell>Gudang</TableCell>
              <TableCell align="right">Stok</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? (
              paginated.map((r) => (
                <TableRow
                  key={r.key}
                  hover
                  sx={{
                    opacity: r.status === 'inactive' ? 0.6 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell>
                    <Box title={r.sku} sx={{ ...CELL, fontFamily: 'monospace', fontSize: 13, fontWeight: 650 }}>
                      {r.sku}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box title={r.name} sx={CELL}>
                      <Typography variant="body2" fontWeight={650}>
                        {r.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box title={r.category} sx={CELL}>
                      {r.category || '-'}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'uppercase', fontSize: 12 }}>{r.unit}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(r.hargaBeli)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(r.hargaJual)}
                  </TableCell>
                  <TableCell>
                    {r.placed ? (
                      <Box title={`${r.gudangCode} — ${r.gudangName}`} sx={CELL}>
                        {r.gudangCode} — {r.gudangName}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        — Belum ditempatkan
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.placed ? (
                      <Typography variant="body2" fontWeight={750}>
                        {r.stok}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusChip kind="active" status={r.status || 'active'} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Detail Data">
                        <IconButton
                          size="small"
                          onClick={() => setDetailRow(r)}
                          sx={{ '&:hover': { color: 'primary.main' } }}
                        >
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!readOnly && (
                        <>
                          <Tooltip title="Ubah Data">
                            <IconButton size="small" onClick={() => openEditRow(r)} sx={{ '&:hover': { color: 'primary.main' } }}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={(r.status || 'active') === 'active' ? 'Nonaktifkan Produk' : 'Aktifkan Kembali Produk'}>
                            <IconButton
                              size="small"
                              color={(r.status || 'active') === 'active' ? 'warning' : 'success'}
                              onClick={() => setConfirmToggle({ productId: r.productId, name: r.name, status: r.status })}
                            >
                              {(r.status || 'active') === 'active' ? <LockRoundedIcon fontSize="small" /> : <LockOpenRoundedIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={r.placed ? 'Hapus Penempatan di Gudang Ini' : 'Hapus Produk'}>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setConfirmDelete(r)}
                            >
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
                <TableCell colSpan={10}>
                  <EmptyState message="Tidak ada produk yang sesuai dengan filter." />
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

      {/* Modal Form Tambah / Ubah Produk */}
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
          title={editing ? `Ubah Produk — ${values.sku || 'Data'}` : 'Tambah Produk Baru'}
          subtitle="Isi spesifikasi produk, harga resmi, dan alokasi gudang awal"
          onClose={saving ? undefined : handleUserDismiss}
        />
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
          {skuExists && (
            <Alert severity="info" sx={{ mb: 2.5 }}>
              SKU <b>sudah terdaftar</b> — data produk akan diperbarui. Pilih gudang untuk menambah penempatan baru; jika gudang sudah ada, nilai stok akan diperbarui.
            </Alert>
          )}

          <Stack spacing={2.5}>
            <Box>
              <FormSection title="Identitas Produk" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Kode SKU *"
                  value={values.sku}
                  onChange={(e) => onSkuChange(e.target.value)}
                  error={Boolean(errors.sku)}
                  helperText={errors.sku || 'Alfanumerik tanpa spasi (maks 30)'}
                  inputProps={{ maxLength: 30 }}
                  disabled={Boolean(editing)}
                />
                <TextField
                  label="Nama Produk *"
                  value={values.name}
                  onChange={(e) => setVal('name', e.target.value)}
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                  inputProps={{ maxLength: 100 }}
                />
              </Box>
            </Box>

            <Box>
              <FormSection title="Klasifikasi &amp; Satuan" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: values.unit === 'box' ? '1fr 1fr 1fr' : '1fr 1fr' }, gap: 2 }}>
                <TextField
                  select
                  label="Kategori *"
                  value={values.category}
                  onChange={(e) => setVal('category', e.target.value)}
                  error={Boolean(errors.category)}
                  helperText={errors.category}
                >
                  {(db.categories || []).map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Satuan Jual *"
                  value={values.unit}
                  onChange={(e) => setVal('unit', e.target.value)}
                  error={Boolean(errors.unit)}
                  helperText={errors.unit}
                >
                  <MenuItem value="pcs">Pcs</MenuItem>
                  <MenuItem value="box">Box</MenuItem>
                </TextField>
                {values.unit === 'box' && (
                  <TextField
                    type="number"
                    label="Isi per Box (pcs) *"
                    value={values.pcsPerUnit}
                    onChange={(e) => setVal('pcsPerUnit', e.target.value)}
                    error={Boolean(errors.pcsPerUnit)}
                    helperText={errors.pcsPerUnit || '1 box = ... pcs'}
                    inputProps={{ min: 1 }}
                  />
                )}
              </Box>
            </Box>

            <Box>
              <FormSection title="Struktur Harga" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  type="number"
                  label="Harga Beli (Modal) (Rp)"
                  value={values.hargaBeli}
                  onChange={(e) => setVal('hargaBeli', e.target.value)}
                  error={Boolean(errors.hargaBeli)}
                  helperText={errors.hargaBeli || 'Harga dari pemasok (opsional)'}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  type="number"
                  label="Harga Jual *"
                  value={values.hargaJual}
                  onChange={(e) => setVal('hargaJual', e.target.value)}
                  error={Boolean(errors.hargaJual)}
                  helperText={errors.hargaJual || 'Harga dasar transaksi order & penawaran'}
                  inputProps={{ min: 1 }}
                />
              </Box>
            </Box>

            <Box>
              <FormSection title="Penempatan Stok Awal" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr' }, gap: 2 }}>
                <Autocomplete
                  options={gudangOpts}
                  getOptionLabel={(w) => `${w.code} — ${w.name}`}
                  isOptionEqualToValue={(w, v) => w.id === v.id}
                  value={gudangValue}
                  onChange={(e, v) => setVal('gudangId', v ? String(v.id) : '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Gudang Penempatan"
                      placeholder="Pilih lokasi gudang…"
                      helperText="Kosongkan jika produk belum ditempatkan"
                    />
                  )}
                />
                <TextField
                  type="number"
                  label="Stok Fisik (pcs)"
                  value={values.stok}
                  onChange={(e) => setVal('stok', e.target.value)}
                  disabled={values.gudangId === ''}
                  error={Boolean(errors.stok)}
                  helperText={errors.stok || (values.gudangId === '' ? 'Pilih gudang terlebih dahulu' : 'Jumlah stok awal')}
                  inputProps={{ min: 0 }}
                />
              </Box>
            </Box>

            <Box>
              <FormSection title="Keterangan Tambahan" />
              <TextField
                multiline
                minRows={2.5}
                label="Deskripsi Produk"
                value={values.desc}
                onChange={(e) => setVal('desc', e.target.value)}
                error={Boolean(errors.desc)}
                helperText={errors.desc}
                inputProps={{ maxLength: 200 }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, justifyContent: 'flex-end', gap: 1.25 }}>
          <Button onClick={handleUserDismiss} disabled={saving} variant="outlined" color="inherit" sx={{ borderRadius: 1, fontWeight: 600 }}>
            Batal
          </Button>
          {!editing && (
            <Button
              onClick={() => submit(true)}
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
            onClick={() => submit(false)}
            disabled={saving}
            sx={{ borderRadius: 1, fontWeight: 650, px: 2.5 }}
          >
            {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Detail Produk */}
      <Dialog
        open={Boolean(detailRow)}
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
          title={`Detail Produk — ${detailRow ? detailRow.name : ''}`}
          subtitle="Informasi spesifikasi barang dan rincian alokasi stok per gudang"
          onClose={() => setDetailRow(null)}
        />
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
          {detailRow && (
            <Stack spacing={2.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                <StatusChip kind="active" status={detailRow.status || 'active'} />
                <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  ID Produk: #{detailRow.productId}
                </Typography>
              </Stack>

              <DetailGrid items={detailFields} columns={2} />
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
              onClick={() => {
                const rec = detailRow;
                setDetailRow(null);
                openEditRow(rec);
              }}
              sx={{ borderRadius: 1, fontWeight: 650, px: 2.5 }}
            >
              Ubah Data
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal Konfirmasi Aktif / Nonaktif */}
      <ConfirmDialog
        open={Boolean(confirmToggle)}
        onClose={() => setConfirmToggle(null)}
        onConfirm={doToggle}
        title={confirmToggle?.status === 'active' ? 'Nonaktifkan Produk' : 'Aktifkan Kembali Produk'}
        message={
          confirmToggle?.status === 'active'
            ? `Nonaktifkan produk "${confirmToggle?.name}"? Tindakan ini berlaku untuk seluruh baris penempatannya di gudang.`
            : `Aktifkan kembali produk "${confirmToggle?.name}"?`
        }
        confirmLabel={confirmToggle?.status === 'active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
        confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'primary'}
      />

      {/* Modal Hapus */}
      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1.25 } }}
      >
        <ModalHeader
          title={delRow?.placed ? 'Hapus Penempatan Gudang' : 'Hapus Produk'}
          subtitle={`Konfirmasi penghapusan ${delRow?.name || ''}`}
          onClose={() => setConfirmDelete(null)}
        />
        <DialogContent dividers sx={{ overflowX: 'hidden', py: 2.5 }}>
          {delRow?.placed ? (
            <Alert severity="warning">
              Keluarkan produk <b>{delRow.sku}</b> dari gudang <b>{delRow.gudangCode}</b>? Stok tercatat ({delRow.stok} pcs) akan dinolkan. Produk induk tetap tersimpan.
            </Alert>
          ) : delRefs.total > 0 ? (
            <Alert severity="warning">
              Produk ini tercatat dalam <b>{delRefs.total}</b> transaksi. Produk akan <b>dinonaktifkan</b> agar riwayat masa lalu tetap aman.
            </Alert>
          ) : (
            <Alert severity="error">
              Produk ini belum dipakai transaksi mana pun dan akan <b>dihapus permanen</b>. Tindakan ini tidak dapat dibatalkan.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
          <Button onClick={() => setConfirmDelete(null)} variant="outlined" color="inherit" sx={{ borderRadius: 1 }}>
            Batal
          </Button>
          {delRow?.placed ? (
            <Button variant="contained" color="warning" onClick={executeDelete} sx={{ borderRadius: 1 }}>
              Keluarkan dari Gudang
            </Button>
          ) : delRefs.total > 0 ? (
            <Button variant="contained" color="warning" onClick={executeDelete} sx={{ borderRadius: 1 }}>
              Nonaktifkan Produk
            </Button>
          ) : (
            <Button variant="contained" color="error" onClick={executeDelete} sx={{ borderRadius: 1 }}>
              Hapus Permanen
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
