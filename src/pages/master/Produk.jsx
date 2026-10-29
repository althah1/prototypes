import { useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
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
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { nowStamp, formatRupiah } from '../../utils/helpers';

const ALNUM = /^[A-Za-z0-9-]+$/;
const CELL = { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/* Label seksi form — menegaskan alur input dari atas ke bawah */
const SectionLabel = ({ children }) => (
  <Typography variant="caption" color="text.secondary"
    sx={{ fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10.5, display: 'block', pt: 0.5 }}>
    {children}
  </Typography>
);

/*
 * Master Data — Produk (halaman kustom).
 * Baris tabel = 1 produk × 1 gudang. Form mengikuti alur input kerja nyata:
 * identitas → klasifikasi & satuan (konversi hanya muncul jika satuan Box) →
 * harga (beli → jual) → penempatan stok (gudang dengan pencarian + stok) →
 * deskripsi. SKU yang sudah ada → produk diperbarui + penempatan upsert
 * (gudang sama → 1 baris, stok diperbarui).
 */
export default function ProdukPage() {
  const { user } = useAuth();
  const readOnly = user?.role === 'finance'; /* Finance: lihat saja */
  const { db, insert, update, mutate, remove } = useDb();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [gudangFilter, setGudangFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [detailRow, setDetailRow] = useState(null);

  /* ---------- Scroll Restoration & Dialog Lifecycle (selaras EntityPage) ---------- */
  const scrollPosRef = useRef(null);
  const closingSnapshotRef = useRef(null);
  const autoFilledSkuRef = useRef(null);

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

  const resetCreateState = () => {
    setValues({ sku: '', name: '', category: '', unit: 'pcs', hargaJual: '', hargaBeli: '', pcsPerUnit: '1', gudangId: '', stok: '', desc: '' });
    setErrors({}); setEditing(null);
    autoFilledSkuRef.current = null;
  };

  const products = db.products || [];
  const gudangs = db.warehouses || [];
  const placements = db.gudangDetails || [];

  /* Produk yang identitasnya (SKU) sudah terdaftar di db.products — hanya relevan mode Tambah (!editing) */
  const matchedProduct = useMemo(() => {
    if (editing) return null;
    const trimmed = (values.sku || '').trim().toLowerCase();
    if (!trimmed) return null;
    return products.find((p) => (p.sku || '').trim().toLowerCase() === trimmed) || null;
  }, [editing, values.sku, products]);

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

  const fieldProps = (k, l, hint) => ({
    label: l, value: values[k] ?? '', onChange: (e) => setVal(k, e.target.value),
    error: !!errors[k], helperText: errors[k] || hint || ' ',
  });

  /* ===== Form ===== */
  const openCreate = () => {
    captureScrollPos();
    resetCreateState();
    setFormOpen(true);
  };

  const openEditRow = (r) => {
    captureScrollPos();
    setValues({
      sku: r.sku, name: r.name, category: r.category, unit: r.unit,
      hargaJual: String(r.hargaJual ?? ''), hargaBeli: String(r.hargaBeli ?? ''),
      pcsPerUnit: String(r.pcsPerUnit ?? 1),
      gudangId: r.placed ? String(r.gudangId) : '',
      stok: r.placed ? String(r.stok) : '',
      desc: r.desc || '',
    });
    setErrors({});
    setEditing(r.placed ? { productId: r.productId, gudangId: r.gudangId } : { productId: r.productId });
    autoFilledSkuRef.current = null;
    setFormOpen(true);
  };

  /* Buka form tambah penempatan gudang baru untuk produk yang sudah ada (SKU tidak bisa diubah) */
  const openAddPlacement = (productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    captureScrollPos();
    setValues({
      sku: p.sku, name: p.name, category: p.category, unit: p.unit,
      hargaJual: String(p.hargaJual ?? ''), hargaBeli: String(p.hargaBeli ?? ''),
      pcsPerUnit: String(p.pcsPerUnit ?? 1),
      gudangId: '', stok: '',
      desc: p.desc || '',
    });
    setErrors({});
    setEditing({ productId, gudangId: null });
    setFormOpen(true);
  };

  /* SKU yang sudah terdaftar → auto-fill identitas produk agar Admin bisa tambah penempatan gudang baru,
     tapi blokir jika produk berbeda, atau produk sama tapi gudang yang sama/belum dipilih. */
  const onSkuChange = (v) => {
    setVal('sku', v);
    if (editing) return;
    const found = v.trim() ? products.find((p) => (p.sku || '').trim().toLowerCase() === v.trim().toLowerCase()) : null;
    if (found) {
      const manuallyTypedName = values.name.trim() !== '' && autoFilledSkuRef.current == null
        && values.name.trim().toLowerCase() !== (found.name || '').trim().toLowerCase();
      if (manuallyTypedName) {
        setErrors((prev) => ({ ...prev, sku: 'Kode SKU sudah terdaftar.' }));
        return;
      }
      autoFilledSkuRef.current = found.id;
      setValues((prev) => ({
        ...prev,
        sku: v,
        name: found.name,
        category: found.category,
        unit: found.unit,
        hargaJual: String(found.hargaJual ?? ''),
        hargaBeli: String(found.hargaBeli ?? ''),
        pcsPerUnit: String(found.pcsPerUnit ?? 1),
        desc: found.desc || '',
      }));
      if (values.gudangId !== '') {
        const already = placements.some((pl) => pl.productId === found.id && Number(pl.gudangId) === Number(values.gudangId));
        if (already) {
          setErrors((prev) => ({
            ...prev,
            sku: 'Kode SKU sudah terdaftar.',
            gudangId: 'Produk ini sudah terdaftar di gudang tersebut. Pilih gudang berbeda.',
          }));
        } else {
          setErrors((prev) => ({ ...prev, sku: undefined, gudangId: undefined }));
        }
      }
    } else {
      autoFilledSkuRef.current = null;
    }
  };

  const onNameChange = (val) => {
    setVal('name', val);
    if (!editing && matchedProduct && autoFilledSkuRef.current != null) {
      const sameName = val.trim().toLowerCase() === (matchedProduct.name || '').trim().toLowerCase();
      if (!sameName) {
        setErrors((prev) => ({ ...prev, sku: 'Kode SKU sudah terdaftar.' }));
      } else {
        const gid = values.gudangId === '' ? null : Number(values.gudangId);
        if (gid != null) {
          const already = placements.some((pl) => pl.productId === matchedProduct.id && Number(pl.gudangId) === gid);
          if (already) {
            setErrors((prev) => ({
              ...prev,
              sku: 'Kode SKU sudah terdaftar.',
              gudangId: 'Produk ini sudah terdaftar di gudang tersebut. Pilih gudang berbeda.',
            }));
          } else {
            setErrors((prev) => ({ ...prev, sku: undefined, gudangId: undefined }));
          }
        } else {
          setErrors((prev) => ({ ...prev, sku: undefined }));
        }
      }
    }
  };

  const onGudangChange = (e, v) => {
    const gidStr = v ? String(v.id) : '';
    setVal('gudangId', gidStr);
    setErrors((prev) => ({ ...prev, gudangId: '' }));
    if (!editing && matchedProduct) {
      const gidNum = gidStr === '' ? null : Number(gidStr);
      const already = gidNum != null && placements.some((pl) => pl.productId === matchedProduct.id && Number(pl.gudangId) === gidNum);
      if (already) {
        setErrors((prev) => ({
          ...prev,
          sku: 'Kode SKU sudah terdaftar.',
          gudangId: 'Produk ini sudah terdaftar di gudang tersebut. Pilih gudang berbeda.',
        }));
      } else {
        const sameName = (values.name || '').trim().toLowerCase() === (matchedProduct.name || '').trim().toLowerCase();
        if (sameName) {
          setErrors((prev) => ({ ...prev, sku: undefined, gudangId: undefined }));
        }
      }
    }
  };

  const validate = () => {
    const v = values;
    const errs = {};
    if (!v.sku || !v.sku.trim()) errs.sku = 'Kode SKU wajib diisi.';
    else if (!ALNUM.test(v.sku.trim())) errs.sku = 'Hanya huruf, angka, dan tanda hubung (-).';
    else if (v.sku.trim().length > 30) errs.sku = 'Maksimal 30 karakter.';
    else {
      /* BR-MD-PRD-001: hanya aktif di mode Tambah (!editing). 1 Kode SKU = 1 identitas produk.
         Produk sama + gudang berbeda diizinkan (tambah alokasi stok); sisanya diblokir. */
      if (!editing) {
        const existingBySku = v.sku && v.sku.trim()
          ? products.find((p) => (p.sku || '').trim().toLowerCase() === v.sku.trim().toLowerCase())
          : null;
        if (existingBySku) {
          const sameProductName = (v.name || '').trim().toLowerCase() === (existingBySku.name || '').trim().toLowerCase();
          if (!sameProductName) {
            errs.sku = 'Kode SKU sudah terdaftar.';
          } else if (v.gudangId === '') {
            errs.sku = 'Kode SKU sudah terdaftar.';
            errs.gudangId = 'Pilih gudang penempatan baru untuk produk yang sudah terdaftar ini.';
          } else {
            const alreadyInGudang = placements.some(
              (pl) => pl.productId === existingBySku.id && Number(pl.gudangId) === Number(v.gudangId),
            );
            if (alreadyInGudang) {
              errs.sku = 'Kode SKU sudah terdaftar.';
              errs.gudangId = 'Produk ini sudah terdaftar di gudang tersebut. Pilih gudang berbeda.';
            } else {
              const st = v.stok === '' ? NaN : Number(v.stok);
              if (Number.isNaN(st) || st < 1) {
                errs.stok = 'Stok awal untuk penempatan di gudang baru minimal 1 pcs.';
              }
            }
          }
        }
      }
    }
    if (!v.name || !v.name.trim()) errs.name = 'Nama Produk wajib diisi.';
    else if (v.name.trim().length > 100) errs.name = 'Nama Produk maksimal 100 karakter.';
    if (!v.category) errs.category = 'Kategori wajib dipilih.';
    if (!v.unit) errs.unit = 'Satuan Jual wajib dipilih.';
    /* Konversi hanya divalidasi bila satuan Box */
    if (v.unit === 'box') {
      const ppu = v.pcsPerUnit === '' ? '' : Number(v.pcsPerUnit);
      if (ppu === '' || Number.isNaN(ppu) || ppu < 1) errs.pcsPerUnit = 'Isi per Box harus berupa angka minimal 1.';
    }
    const hb = v.hargaBeli === '' ? 0 : Number(v.hargaBeli);
    if (v.hargaBeli !== '' && (Number.isNaN(hb) || hb < 0)) errs.hargaBeli = 'Harga Beli tidak boleh kurang dari 0.';
    const hj = v.hargaJual === '' ? '' : Number(v.hargaJual);
    if (hj === '' || hj == null) errs.hargaJual = 'Harga Jual wajib diisi.';
    else if (Number.isNaN(hj) || hj < 1) errs.hargaJual = 'Harga Jual harus berupa angka bulat, minimal 1.';
    if (v.gudangId !== '') {
      const st = v.stok === '' ? 0 : Number(v.stok);
      if (Number.isNaN(st) || st < 0) errs.stok = 'Stok di gudang harus berupa angka, minimal 0.';
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
        sku: values.sku.trim(), name: values.name.trim(), category: values.category,
        unit: values.unit,
        hargaJual: Number(values.hargaJual) || 0,
        hargaBeli: values.hargaBeli === '' ? 0 : (Number(values.hargaBeli) || 0),
        pcsPerUnit: values.unit === 'box' ? (Number(values.pcsPerUnit) || 1) : 1,
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
        const existing = products.find((p) => (p.sku || '').trim().toLowerCase() === prodPayload.sku.toLowerCase());
        if (existing) {
          const sameProductName = (prodPayload.name || '').trim().toLowerCase() === (existing.name || '').trim().toLowerCase();
          const alreadyInGudang = gid != null && placements.some(
            (pl) => pl.productId === existing.id && Number(pl.gudangId) === gid,
          );
          if (!sameProductName || gid == null || alreadyInGudang) {
            setErrors((prev) => ({ ...prev, sku: 'Kode SKU sudah terdaftar.' }));
            setSaving(false);
            return;
          }
          /* JANGAN memanggil update('products', existing.id, prodPayload) — data master produk lama tidak boleh ditimpa */
          productId = existing.id;
          msg = 'Penempatan produk di gudang baru berhasil disimpan.';
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
      if (andAgain) resetCreateState(); else handleCloseForm();
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
      toast(`"${r.name}" dipakai ${delRefs.total} transaksi/relasi — dinonaktifkan, bukan dihapus. Riwayat tetap tersimpan.`, 'info', 5500);
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
      : `Produk "${r.name}" dinonaktifkan — berlaku untuk semua baris penempatannya. Riwayat tetap tersimpan.`,
      to === 'active' ? 'success' : 'info');
    setConfirmToggle(null);
  };

  /* ===== Detail (seragam dengan desain baru EntityPage) ===== */
  const detailRefs = detailRow ? productRefs(detailRow) : { total: 0, list: [] };
  const detailProd = detailRow ? products.find((p) => p.id === detailRow.productId) : null;
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

  const detailSupplierList = detailRow
    ? (db.suppliers || []).filter((s) => (s.productIds || []).some((id) => String(id) === String(detailRow.productId)))
    : [];

  const renderSupplierPemasokDetail = () => {
    if (!detailSupplierList.length) {
      return (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Belum terhubung dengan supplier pemasok mana pun
        </Typography>
      );
    }
    return (
      <Box sx={{ width: '100%', mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary', width: 105 }}>Kode</TableCell>
              <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>Nama Supplier</TableCell>
              <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary', width: 100 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detailSupplierList.map((s) => (
              <TableRow key={s.id}>
                <TableCell sx={{ fontSize: 12, py: 0.75, px: 1.5, color: 'text.secondary', fontFamily: 'monospace' }}>
                  {s.code}
                </TableCell>
                <TableCell sx={{ fontSize: 12.5, py: 0.75, px: 1.5, fontWeight: 600, overflowWrap: 'anywhere' }}>
                  {s.name}
                </TableCell>
                <TableCell align="right" sx={{ py: 0.75, px: 1.5 }}>
                  <StatusChip kind="active" status={s.status || 'active'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const detailFields = detailRow
    ? [
        { k: 'sku', l: 'Kode SKU', v: detailRow.sku, mono: true },
        { k: 'name', l: 'Nama Produk', v: detailRow.name },
        { k: 'category', l: 'Kategori', v: detailRow.category || '-' },
        {
          k: 'unit',
          l: 'Satuan Jual',
          v: detailRow.unit === 'box' ? 'Box' : detailRow.unit === 'pcs' ? 'Pcs' : (detailRow.unit || '-'),
        },
        ...((detailRow.unit === 'box' || (detailRow.pcsPerUnit ?? 1) > 1)
          ? [{ k: 'konversi', l: 'Konversi Satuan', v: `1 ${detailRow.unit} = ${detailRow.pcsPerUnit ?? 1} pcs` }]
          : []),
        { k: 'hargaBeli', l: 'Harga Beli', v: formatRupiah(detailRow.hargaBeli), tabular: true },
        { k: 'hargaJual', l: 'Harga Jual', v: formatRupiah(detailRow.hargaJual), tabular: true },
        { k: 'alokasi', l: 'Alokasi Stok Gudang', isLong: true, customNode: renderAlokasiGudangDetail() },
        { k: 'suppliers', l: 'Daftar Supplier Pemasok', isLong: true, customNode: renderSupplierPemasokDetail() },
        { k: 'desc', l: 'Deskripsi', v: detailRow.desc || '-', isLong: true },
      ]
    : [];

  /* Opsi gudang untuk form: aktif + gudang penempatan saat ini (walau nonaktif) */
  const gudangOpts = gudangs.filter((w) => (w.status || 'active') === 'active'
    || (editing?.gudangId != null && w.id === editing.gudangId));
  const gudangValue = values.gudangId === '' || values.gudangId == null
    ? null
    : (gudangOpts.find((w) => String(w.id) === String(values.gudangId)) || null);

  return (
    <Box>
      <PageHeader
        title="Master Data — Produk"
        subtitle="Katalog produk & penempatan stok per gudang — 1 produk dapat menempati beberapa gudang."
        action={!readOnly && (
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

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell><TableCell>Nama Produk</TableCell><TableCell>Kategori</TableCell>
              <TableCell>Satuan</TableCell><TableCell align="right">Harga Beli</TableCell>
              <TableCell align="right">Harga Jual</TableCell><TableCell>Gudang</TableCell>
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
                <TableCell align="right" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(r.hargaBeli)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatRupiah(r.hargaJual)}
                </TableCell>
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
                    {!readOnly && (<>
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
                    </>)}
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
        hanya mengeluarkan stok dari gudang itu (produk tetap tersimpan); produk tanpa penempatan bisa dihapus
        permanen selama belum pernah dipakai transaksi.
      </Alert>

      {/* ===== Dialog Form — alur input kerja nyata (desain seragam EntityPage) ===== */}
      <Dialog
        open={formOpen}
        onClose={handleUserDismiss}
        TransitionProps={{ onExited: handleFormExited }}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 16px 48px rgba(15,23,42,0.12)',
            m: { xs: 1, sm: 2 },
            width: { xs: 'calc(100% - 16px)', sm: '100%' },
            maxWidth: { xs: '100%', sm: 700 },
          },
        }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3.5 }, pt: 2.5, pb: 1.5, fontWeight: 800, fontSize: 16.5 }}>
          {editing ? `Ubah — ${values.sku || 'Produk'}` : 'Tambah — Produk'}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', px: { xs: 2, sm: 3.5 }, py: 2.5 }}>
          <Stack spacing={2}>
            <SectionLabel>1 • Identitas Produk</SectionLabel>
            <TextField {...fieldProps('sku', 'Kode SKU *', 'Alfanumerik + tanda hubung, maks 30 karakter.')}
              onChange={(e) => onSkuChange(e.target.value)} inputProps={{ maxLength: 30 }} disabled={!!editing} />
            <TextField
              {...fieldProps('name', 'Nama Produk *', 'Maksimal 100 karakter.')}
              inputProps={{ maxLength: 100 }}
              onChange={(e) => onNameChange(e.target.value)}
            />

            {(!editing && matchedProduct && (values.name || '').trim().toLowerCase() === (matchedProduct.name || '').trim().toLowerCase()) && (
              <Alert severity="info" sx={{ mb: 1, borderRadius: 1.5 }}>
                SKU {matchedProduct.sku} terdaftar untuk produk <b>"{matchedProduct.name}"</b>. Pilih gudang yang belum ditempati untuk menambahkan alokasi stok di gudang berbeda.
              </Alert>
            )}

            <SectionLabel>2 • Klasifikasi &amp; Satuan</SectionLabel>
            <TextField select {...fieldProps('category', 'Kategori *')}>
              {(db.categories || []).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField select {...fieldProps('unit', 'Satuan Jual *')}>
              <MenuItem value="pcs">Pcs</MenuItem>
              <MenuItem value="box">Box</MenuItem>
            </TextField>
            {values.unit === 'box' && (
              <TextField {...fieldProps('pcsPerUnit', 'Isi per Box (pcs) *', 'Contoh: 1 box = 10 pcs.')}
                type="number" inputProps={{ min: 1 }} />
            )}

            <SectionLabel>3 • Harga</SectionLabel>
            <TextField {...fieldProps('hargaBeli', 'Harga Beli (Rp)', 'Harga perolehan dari supplier — opsional.')}
              type="number" inputProps={{ min: 0 }} />
            <TextField {...fieldProps('hargaJual', 'Harga Jual (Rp) *', 'Dipakai transaksi Order & Quotation — angka bulat, minimal 1.')}
              type="number" inputProps={{ min: 1 }} />

            <SectionLabel>4 • Alokasi Stok Awal</SectionLabel>
            <Autocomplete
              options={gudangOpts}
              getOptionLabel={(w) => {
                const already = !editing && matchedProduct && placements.some(
                  (pl) => pl.productId === matchedProduct.id && Number(pl.gudangId) === Number(w.id),
                );
                return `${w.code} — ${w.name}${already ? ' (Sudah terdaftar)' : ''}`;
              }}
              isOptionEqualToValue={(w, v) => w.id === v.id}
              value={gudangValue}
              onChange={(e, v) => onGudangChange(e, v)}
              renderInput={(params) => (
                <TextField {...params} label="Gudang Penempatan" placeholder="Cari gudang (kode / nama)…"
                  error={Boolean(errors.gudangId)} helperText={errors.gudangId || 'Kosongkan (ikon ✕) untuk produk tanpa penempatan dulu.'} />
              )}
            />
            <TextField {...fieldProps('stok', 'Stok Awal (pcs)',
              values.gudangId === '' ? 'Pilih gudang penempatan terlebih dahulu.' : 'Jumlah stok fisik awal.')}
              type="number" disabled={values.gudangId === ''} inputProps={{ min: 0 }} />

            <SectionLabel>5 • Lainnya</SectionLabel>
            <TextField {...fieldProps('desc', 'Deskripsi', 'Maksimal 200 karakter.')} multiline minRows={2} inputProps={{ maxLength: 200 }} />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3.5 },
            py: 2,
            flexWrap: 'wrap',
            gap: 1.25,
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            '& > button': {
              flex: { xs: '1 1 auto', sm: 'none' },
            },
          }}
        >
          <Button onClick={handleUserDismiss} disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Batal
          </Button>
          {!editing && (
            <Button onClick={() => submit(true)} disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Simpan &amp; Tambah Lagi
            </Button>
          )}
          <Button variant="contained" onClick={() => submit(false)} disabled={saving} sx={{ textTransform: 'none', fontWeight: 650 }}>
            {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Dialog Detail (Baris Daftar Bergaris Tipis Halus — Seragam EntityPage) ===== */}
      <Dialog
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 16px 48px rgba(15,23,42,0.12)',
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16, px: { xs: 2, sm: 3 }, py: 2, overflowWrap: 'anywhere' }}>
          Detail Produk — {detailRow ? detailRow.name : ''}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', px: { xs: 2, sm: 3 }, py: 2 }}>
          {detailRow && (
            <>
              {/* Header Status & Waktu */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <StatusChip kind="active" status={detailRow.status || 'active'} />
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                  {detailProd?.createdAt && (
                    <Box
                      component="span"
                      sx={{
                        px: 0.8,
                        py: 0.3,
                        borderRadius: '4px',
                        bgcolor: 'action.hover',
                        border: '1px solid',
                        borderColor: 'divider',
                        fontSize: '0.725rem',
                        color: 'text.secondary',
                      }}
                    >
                      Dibuat {detailProd.createdAt}
                    </Box>
                  )}
                  {detailProd?.updatedAt && (
                    <Box
                      component="span"
                      sx={{
                        px: 0.8,
                        py: 0.3,
                        borderRadius: '4px',
                        bgcolor: 'action.hover',
                        border: '1px solid',
                        borderColor: 'divider',
                        fontSize: '0.725rem',
                        color: 'text.secondary',
                      }}
                    >
                      Diubah {detailProd.updatedAt}
                    </Box>
                  )}
                </Stack>
              </Stack>

              {/* Daftar Informasi: Baris Horizontal Bergaris Tipis Halus (Tanpa Kotak Abu) */}
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden', mb: 2 }}>
                {detailFields.map((f, idx) => (
                  <Box
                    key={f.k}
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderBottom: idx === detailFields.length - 1 ? 'none' : '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: f.isLong ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: f.isLong ? 'flex-start' : 'center',
                      gap: f.isLong ? 0.5 : 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" fontSize={13} sx={{ minWidth: 140, flexShrink: 0 }}>
                      {f.l}
                    </Typography>
                    {f.customNode ? (
                      <Box sx={{ width: '100%' }}>
                        {f.customNode}
                      </Box>
                    ) : (
                      <Typography
                        variant="body2"
                        fontWeight={650}
                        fontSize={13.5}
                        color="text.primary"
                        textAlign={f.isLong ? 'left' : 'right'}
                        sx={{
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          width: f.isLong ? '100%' : 'auto',
                          fontFamily: f.mono ? 'monospace' : undefined,
                          fontVariantNumeric: f.tabular ? 'tabular-nums' : undefined,
                        }}
                      >
                        {f.v}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>

              {/* Seksi Penggunaan Data */}
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.75 }}
                >
                  Penggunaan Data
                </Typography>
                {detailRefs.total > 0 ? (
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                    {detailRefs.list.map((s) => (
                      <Box
                        key={s.label}
                        component="span"
                        sx={{
                          px: 1,
                          py: 0.35,
                          borderRadius: '4px',
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
                  <Typography variant="caption" color="text.secondary" display="block">
                    Belum dipakai transaksi/relasi mana pun — aman untuk dihapus permanen.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, justifyContent: 'flex-end', gap: 1.25 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setDetailRow(null)}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Tutup
          </Button>
          {detailRow && !readOnly && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditRoundedIcon fontSize="small" />}
                onClick={() => { const r = detailRow; setDetailRow(null); openEditRow(r); }}
                sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 650 }}
              >
                Ubah Data
              </Button>
              <Button
                variant="outlined"
                onClick={() => { setDetailRow(null); openAddPlacement(detailRow.productId); }}
                sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
              >
                Tambah Penempatan Gudang
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ===== Dialog Hapus ===== */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        maxWidth="xs"
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
                Supaya riwayat transaksi lama tetap lengkap, produk ini hanya bisa <b>dinonaktifkan</b>,
                bukan dihapus permanen.
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
          ? `Nonaktifkan produk "${confirmToggle?.name}"? Berlaku untuk SEMUA baris penempatannya. Data tidak dihapus — hanya berhenti aktif, dan bisa diaktifkan kembali.`
          : `Aktifkan kembali produk "${confirmToggle?.name}"? Semua baris penempatannya ikut aktif.`}
        confirmLabel={confirmToggle?.status === 'active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
        confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'primary'}
      />
    </Box>
  );
}