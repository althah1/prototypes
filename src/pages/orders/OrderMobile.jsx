import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import OrderDetailDialog from '../../components/orders/OrderDetailDialog';
import StatusChip from '../../components/ui/StatusChip';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, formatRupiah, TAX_RATE } from '../../utils/helpers';
import { completeTaskAuto } from '../../utils/taskUtils';
import { reduceStockByOrder } from '../../utils/gudangUtils';

const FILTERS = [
  { v: 'all', l: 'Semua' }, { v: 'submitted', l: 'Diajukan' }, { v: 'approved', l: 'Disetujui' },
  { v: 'processing', l: 'Diproses' }, { v: 'shipped', l: 'Dikirim' }, { v: 'completed', l: 'Selesai' },
  { v: 'rejected', l: 'Ditolak' }, { v: 'cancelled', l: 'Dibatalkan' },
];

const QTY_ZERO_ERR = 'Jumlah pesanan tidak valid. Kuantitas minimal adalah 1.';
const DISC_RANGE_ERR = 'Diskon harus bernilai antara 0% hingga 100%.';

/* ===== Konfigurasi Multi-UoM per Produk (BR-ORD-007 & BR-ORD-002) =====
 * Harga dasar tetap ditarik & terkunci dari Master Produk (p.hargaJual).
 * Satuan jual dapat dipilih antara Pcs vs Box / Karton dengan konversi otomatis ke baseQty (pcs).
 */
function getUomOptions(p) {
  if (!p) return [];
  const masterUnit = (p.unit || 'pcs').toLowerCase();
  const masterFactor = Math.max(1, Number(p.pcsPerUnit) || 1);

  if (masterUnit === 'box') {
    const boxFactor = masterFactor > 1 ? masterFactor : 12;
    const pcsPrice = Math.max(1, Math.round((Number(p.hargaJual) || 0) / boxFactor));
    const kartonFactor = Number(p.pcsPerKarton) || boxFactor * 2;
    return [
      { value: 'pcs', label: 'Pcs (1 pcs)', pcsPerUnit: 1, price: pcsPrice },
      { value: 'box', label: `Box (${boxFactor} pcs)`, pcsPerUnit: boxFactor, price: Number(p.hargaJual) || 0 },
      { value: 'karton', label: `Karton (${kartonFactor} pcs)`, pcsPerUnit: kartonFactor, price: Math.round(((Number(p.hargaJual) || 0) / boxFactor) * kartonFactor) },
    ];
  }

  if (masterUnit === 'karton') {
    const kartonFactor = masterFactor > 1 ? masterFactor : 24;
    const pcsPrice = Math.max(1, Math.round((Number(p.hargaJual) || 0) / kartonFactor));
    const boxFactor = Number(p.pcsPerBox) || Math.max(1, Math.round(kartonFactor / 2));
    return [
      { value: 'pcs', label: 'Pcs (1 pcs)', pcsPerUnit: 1, price: pcsPrice },
      { value: 'box', label: `Box (${boxFactor} pcs)`, pcsPerUnit: boxFactor, price: pcsPrice * boxFactor },
      { value: 'karton', label: `Karton (${kartonFactor} pcs)`, pcsPerUnit: kartonFactor, price: Number(p.hargaJual) || 0 },
    ];
  }

  /* Default: masterUnit === 'pcs' */
  const pcsPrice = Number(p.hargaJual) || 0;
  const boxFactor = Math.max(2, Number(p.pcsPerBox) || (masterFactor > 1 ? masterFactor : 12));
  const kartonFactor = Math.max(boxFactor, Number(p.pcsPerKarton) || boxFactor * 2);
  return [
    { value: 'pcs', label: 'Pcs (1 pcs)', pcsPerUnit: 1, price: pcsPrice },
    { value: 'box', label: `Box (${boxFactor} pcs)`, pcsPerUnit: boxFactor, price: pcsPrice * boxFactor },
    { value: 'karton', label: `Karton (${kartonFactor} pcs)`, pcsPerUnit: kartonFactor, price: pcsPrice * kartonFactor },
  ];
}

function resolveItemCalc(item, product) {
  const opts = getUomOptions(product);
  const selectedUnit = item?.unit || (product?.unit || 'pcs').toLowerCase();
  const uom = opts.find((o) => o.value === selectedUnit) || opts[0] || {
    value: 'pcs', label: 'Pcs (1 pcs)', pcsPerUnit: 1, price: Number(product?.hargaJual) || 0,
  };

  const rawQty = item ? String(item.rawQty ?? item.qty ?? '') : '';
  const parsedQty = rawQty === '' ? NaN : Number(rawQty);
  const qtyInvalid = Boolean(item) && (rawQty.trim() === '' || Number.isNaN(parsedQty) || !Number.isInteger(parsedQty) || parsedQty < 1);
  const validQty = qtyInvalid || !item ? 0 : parsedQty;

  const rawDisc = item ? String(item.rawDisc ?? item.disc ?? '0') : '0';
  const parsedDisc = rawDisc.trim() === '' ? 0 : Number(rawDisc);
  const discInvalid = Boolean(item) && (Number.isNaN(parsedDisc) || parsedDisc < 0 || parsedDisc > 100);
  const validDisc = discInvalid ? 0 : parsedDisc;

  const baseQty = validQty * uom.pcsPerUnit;
  const gross = uom.price * validQty;
  const discAmount = Math.round(gross * (validDisc / 100));
  const line = Math.max(0, gross - discAmount);

  return {
    uom,
    opts,
    rawQty,
    validQty,
    qtyError: qtyInvalid ? QTY_ZERO_ERR : '',
    rawDisc,
    validDisc,
    discError: discInvalid ? DISC_RANGE_ERR : '',
    baseQty,
    gross,
    discAmount,
    line,
  };
}

/* ===== Header langkah: tombol kembali + judul + indikator progres ===== */
function StepHeader({ title, onBack, step }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton onClick={onBack} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" fontWeight={800} noWrap>{title}</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ width: 18, height: 4, borderRadius: 99, bgcolor: i <= step ? 'primary.main' : 'divider' }} />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            Langkah {step + 1} dari 3
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

/* ===== Bar aksi bawah (sticky) — jumlah item + total + CTA ===== */
function BottomBar({ itemCount, total, actionLabel, onClick, disabled, loading }) {
  return (
    <Box onClick={disabled || loading ? undefined : onClick} sx={{
      position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: 398,
      bgcolor: disabled ? 'action.disabledBackground' : 'primary.main',
      color: disabled ? 'text.disabled' : '#fff',
      borderRadius: 2.5, px: 2, py: 1.25,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      cursor: disabled || loading ? 'default' : 'pointer', zIndex: 1150, boxShadow: 4,
    }}>
      <Box>
        <Typography fontWeight={800} fontSize={14}>{itemCount} item</Typography>
        <Typography variant="caption" sx={{ opacity: 0.9, whiteSpace: 'nowrap' }}>{formatRupiah(total)}</Typography>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography fontWeight={700} fontSize={14}>{loading ? 'Menyimpan…' : actionLabel}</Typography>
        {!loading && <ArrowForwardRoundedIcon fontSize="small" />}
      </Stack>
    </Box>
  );
}

export default function OrderMobile() {
  const { user } = useAuth();
  const { db, insert, mutate } = useDb();
  const { online, enqueue, notify } = useSync();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  /* ===== SEMUA HOOKS DI PALING ATAS (pola anti error hooks) ===== */
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState(() => (
    location.state?.outletId
      ? { step: 'items', outletId: location.state.outletId, items: [] }
      : null
  ));
  const [outletSearch, setOutletSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [unitPrefs, setUnitPrefs] = useState({});
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [detailId, setDetailId] = useState(null);

  /* ===== Derived data ===== */
  const outlet = (db.outlets || []).find((o) => o.id === draft?.outletId);
  const step = draft
    ? (((draft.step === 'items' || draft.step === 'review') && !outlet) ? 'outlet' : draft.step)
    : null;

  const products = (db.products || []).filter((p) => p.status === 'active');
  const prodFiltered = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });
  const outlets = (db.outlets || []).filter((o) => {
    const q = outletSearch.trim().toLowerCase();
    return o.status === 'active' && (!q || o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q));
  });

  const findDraftItem = (pid) => (draft?.items || []).find((i) => i.productId === pid) || null;

  const draftSummary = (() => {
    let validItemCount = 0;
    let totalUnits = 0;
    let totalBasePcs = 0;
    let grossSubtotal = 0;
    let discTotal = 0;
    let subtotal = 0;
    let hasError = false;

    (draft?.items || []).forEach((it) => {
      const p = (db.products || []).find((x) => x.id === it.productId);
      if (!p) return; /* F-34: produk dihapus dari Master saat draft aktif — lewati aman */
      const calc = resolveItemCalc(it, p);
      if (calc.qtyError || calc.discError) {
        hasError = true;
        return;
      }
      if (calc.validQty >= 1) {
        validItemCount += 1;
        totalUnits += calc.validQty;
        totalBasePcs += calc.baseQty;
        grossSubtotal += calc.gross;
        discTotal += calc.discAmount;
        subtotal += calc.line;
      }
    });

    const tax = Math.round(subtotal * TAX_RATE);
    return {
      validItemCount,
      totalUnits,
      totalBasePcs,
      grossSubtotal,
      discTotal,
      subtotal,
      tax,
      total: subtotal + tax,
      hasError,
    };
  })();

  const ckOutlets = new Set(
    (db.checkins || [])
      .filter((c) => c.salesId === user.salesId && c.date === todayISO())
      .map((c) => c.outletId)
  );
  const myOrders = (db.orders || []).filter((o) => o.salesId === user.salesId).slice().reverse();
  const orderList = filter === 'all' ? myOrders : myOrders.filter((o) => o.status === filter);
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';

  /* ===== Helpers Mutasi Draft Item ===== */
  const upsertDraftItem = (product, patch) => {
    setDraft((d) => {
      if (!d) return d;
      const existing = d.items.find((i) => i.productId === product.id);
      const defaultUnit = unitPrefs[product.id] || (product.unit || 'pcs').toLowerCase();
      const baseItem = existing || {
        productId: product.id,
        unit: defaultUnit,
        qty: 0,
        rawQty: '0',
        disc: 0,
        rawDisc: '0',
      };
      const updated = { ...baseItem, ...patch };
      const items = existing
        ? d.items.map((i) => (i.productId === product.id ? updated : i))
        : [...d.items, updated];
      return { ...d, items };
    });
  };

  /* Tabel 21: input qty 0 tetap mempertahankan baris & memunculkan error inline merah */
  const handleQtyInput = (product, rawValue) => {
    const cleaned = String(rawValue);
    const parsed = cleaned.trim() === '' ? 0 : Math.floor(Number(cleaned));
    upsertDraftItem(product, {
      rawQty: cleaned,
      qty: Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  const handleQtyStep = (product, delta) => {
    const existing = findDraftItem(product.id);
    const current = existing ? (Math.floor(Number(existing.rawQty ?? existing.qty)) || 0) : 0;
    const next = Math.max(0, current + delta);
    upsertDraftItem(product, {
      rawQty: String(next),
      qty: next,
    });
  };

  const handleUnitChange = (product, nextUnit) => {
    setUnitPrefs((prev) => ({ ...prev, [product.id]: nextUnit }));
    const existing = findDraftItem(product.id);
    if (existing) {
      upsertDraftItem(product, { unit: nextUnit });
    }
  };

  const handleDiscInput = (product, rawValue) => {
    const cleaned = String(rawValue);
    const parsed = cleaned.trim() === '' ? 0 : Number(cleaned);
    upsertDraftItem(product, {
      rawDisc: cleaned,
      disc: Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  const removeDraftItem = (productId) => {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, items: d.items.filter((i) => i.productId !== productId) };
    });
  };

  /* Nomor unik otomatis — ikut menghitung antrean offline agar tidak duplikat */
  const genOrderNo = () => {
    const t = todayISO();
    const kodeSales = user.salesId ? `SAL-${String(user.salesId).padStart(3, '0')}` : 'SFA';
    const count = (db.orders || []).filter((o) => o.date === t && o.salesId === user.salesId).length
      + (db.syncQueue || []).filter((x) => x.kind === 'order' && x.payload?.salesId === user.salesId && x.payload?.date === t).length;
    return `ORD-${t.replace(/-/g, '')}-${kodeSales}-${String(count + 1).padStart(3, '0')}`;
  };

  const submitOrder = () => {
    if (submitting || draftSummary.hasError || !draftSummary.validItemCount) return;
    setSubmitting(true);

    const items = (draft?.items || [])
      .map((i) => {
        const p = (db.products || []).find((x) => x.id === i.productId);
        if (!p) return null; /* F-34: produk dihapus dari Master — lewati aman */
        const calc = resolveItemCalc(i, p);
        if (calc.qtyError || calc.discError || calc.validQty < 1) return null;
        return {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          unit: calc.uom.value,
          qty: calc.validQty,
          pcsPerUnit: calc.uom.pcsPerUnit,
          baseQty: calc.baseQty,
          price: calc.uom.price,
          disc: calc.validDisc,
          discAmount: calc.discAmount,
          line: calc.line,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      setSubmitting(false);
      return toast('Produk pesanan sudah tidak tersedia atau belum valid — periksa kembali pesanan.', 'warning');
    }

    const grossSubtotal = items.reduce((s, x) => s + (x.price * x.qty), 0);
    const discTotal = items.reduce((s, x) => s + (x.discAmount || 0), 0);
    const subtotal = items.reduce((s, x) => s + x.line, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    const total = subtotal + tax;

    const order = {
      no: genOrderNo(),
      date: todayISO(),
      salesId: user.salesId,
      outletId: draft.outletId,
      items,
      grossSubtotal,
      discTotal,
      subtotal,
      taxRate: TAX_RATE,
      tax,
      total,
      status: 'submitted',
      note: note.trim(),
      paid: false,
    };

    /* Mode luring: simpan lokal → kirim ulang otomatis saat online, tanpa input ulang */
    if (!online) {
      enqueue('order', order);
      toast('Anda sedang offline. Order disimpan sementara di perangkat dan akan dikirim otomatis saat koneksi pulih — tanpa input ulang.', 'warning', 5500);
      setDraft(null);
      setNote('');
      setSubmitting(false);
      return;
    }

    setTimeout(() => {
      const rec = insert('orders', order);

      reduceStockByOrder(mutate, order.items);

      /* Auto-complete tugas order terkait (BR-TASK-003) */
      completeTaskAuto(db, mutate, { outletId: draft.outletId, type: 'order', salesId: user.salesId });

      /* Notifikasi ke supervisor */
      const sales = (db.sales || []).find((s) => s.id === user.salesId);
      const spv = (db.supervisors || []).find((s) => s.id === sales?.supervisorId);
      const spvUser = (db.users || []).find((u) => u.email === spv?.email);
      if (spvUser) notify(spvUser.id, 'Order Baru Menunggu Approval', `${order.no} dari ${user.name} — ${formatRupiah(order.total)}.`);

      setSubmitting(false);
      setDraft(null);
      setNote('');
      setSuccessOrder(rec);
    }, 500);
  };

  /* ===================== VIEW: DAFTAR ORDER ===================== */
  if (!step) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={800}>Entry Order</Typography>
          <Button variant="contained" size="small" startIcon={<AddRoundedIcon />}
            onClick={() => setDraft({ step: 'outlet', items: [] })}>
            Pesanan Baru
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {FILTERS.map((f) => (
            <Chip key={f.v} label={f.l} size="small" clickable
              color={filter === f.v ? 'primary' : 'default'}
              variant={filter === f.v ? 'filled' : 'outlined'}
              onClick={() => setFilter(f.v)} />
          ))}
        </Stack>

        {orderList.length ? orderList.map((o) => (
          <Card key={o.id} elevation={0} onClick={() => setDetailId(o.id)}
            sx={{ cursor: 'pointer', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontFamily="monospace" fontWeight={700} fontSize={12} noWrap>{o.no}</Typography>
                <StatusChip kind="order" status={o.status} />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                {outletName(o.outletId)} • {o.items.length} produk • {o.date}
              </Typography>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Total</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{formatRupiah(o.total)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        )) : <EmptyState message="Belum ada pesanan pada filter ini." />}

        <OrderDetailDialog open={!!detailId} orderId={detailId} onClose={() => setDetailId(null)} />

        {/* Dialog sukses (#49: teruskan draft ke Quotation) */}
        <Dialog open={!!successOrder} onClose={() => setSuccessOrder(null)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 1 } }}>
          <DialogTitle>Pesanan Tersimpan</DialogTitle>
          <DialogContent dividers sx={{ overflowX: 'hidden' }}>
            <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mb: 0.5 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 30, color: 'common.white' }} />
              </Avatar>
              <Typography fontFamily="monospace" fontWeight={800} fontSize={20}>{successOrder?.no}</Typography>
              <StatusChip kind="order" status="submitted" />
              <Typography variant="body2">Total: <b>{formatRupiah(successOrder?.total || 0)}</b></Typography>
              <Typography variant="caption" color="text.secondary" align="center">
                Status <b>Diajukan</b> — menunggu persetujuan Supervisor. Draft bukti pesanan dapat
                diteruskan ke Modul Quotation.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuccessOrder(null)}>Selesai</Button>
            <Button variant="contained" startIcon={<ReceiptLongRoundedIcon />} onClick={() => {
              const id = successOrder?.id;
              setSuccessOrder(null);
              navigate('/app/quotes', { state: { fromOrder: id } });
            }}>
              Buat Quotation dari Order Ini
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  /* ===================== VIEW LANGKAH 1: PILIH OUTLET ===================== */
  if (step === 'outlet') {
    return (
      <Stack spacing={1.5}>
        <StepHeader title="Pilih Outlet" onBack={() => setDraft(null)} step={0} />

        <TextField label="Cari outlet…" value={outletSearch} onChange={(e) => setOutletSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />

        {outlets.length ? outlets.map((o) => (
          <Card key={o.id} elevation={0} onClick={() => ckOutlets.has(o.id) ? setDraft({ step: 'items', outletId: o.id, items: [] }) : toast('Outlet belum check-in hari ini — buka halaman Rute (menu bawah) untuk check-in terlebih dahulu.', 'warning')}
            sx={{ cursor: 'pointer', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40, borderRadius: 2 }}>
                <StorefrontRoundedIcon fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={14} noWrap>{o.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{o.address}</Typography>
                {!ckOutlets.has(o.id) && <Chip size="small" color="warning" variant="outlined" label="Belum Check-In" sx={{ flexShrink: 0, mt: 0.5 }} />}
              </Box>
            </CardContent>
          </Card>
        )) : <EmptyState message="Outlet tidak ditemukan." />}
      </Stack>
    );
  }

  /* ===================== VIEW LANGKAH 2: KATALOG PRODUK ===================== */
  if (step === 'items') {
    return (
      <Stack spacing={1.5} sx={{ pb: 9 }}>
        <StepHeader title="Pilih Produk" onBack={() => setDraft({ step: 'outlet', items: [] })} step={1} />

        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40, borderRadius: 2, flexShrink: 0 }}>
                <StorefrontRoundedIcon fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={15} noWrap>{outlet.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{outlet.address}</Typography>
              </Box>
            </Stack>
            <Alert severity="info" sx={{ mt: 1, py: 0.5 }} icon={<LockRoundedIcon fontSize="small" />}>
              Harga dasar <b>terkunci</b> dari Master Data. Pilih satuan jual (<b>Pcs / Box / Karton</b>) atau isi diskon manual (<b>0–100%</b>).
            </Alert>
          </CardContent>
        </Card>

        <TextField label="Cari produk / SKU…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
        {prodFiltered.length ? prodFiltered.map((p) => {
          const item = findDraftItem(p.id);
          const previewUnit = item?.unit || unitPrefs[p.id] || (p.unit || 'pcs').toLowerCase();
          const calc = resolveItemCalc(item || { unit: previewUnit, qty: 0, rawQty: '0', disc: 0, rawDisc: '0' }, p);
          const qtyErr = item ? calc.qtyError : '';
          const discErr = item ? calc.discError : '';
          const displayQty = item ? calc.rawQty : 0;
          const short = calc.validQty > 0 && calc.baseQty > p.stock; /* soft warning BR-ORD-004 */

          return (
            <Card key={p.id} elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: (qtyErr || discErr) ? 'error.main' : (calc.validQty > 0 ? 'primary.main' : 'divider'),
              }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {p.sku} • {p.category}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatRupiah(calc.uom.price)}{' '}
                      <Typography component="span" variant="caption" color="text.secondary" fontWeight={500}>
                        / {calc.uom.value}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Stok gudang: {p.stock} pcs
                      {calc.uom.pcsPerUnit > 1 ? ` • 1 ${calc.uom.value} = ${calc.uom.pcsPerUnit} pcs` : ''}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0, pt: 0.25 }}>
                    <IconButton
                      size="small"
                      disabled={!item || calc.validQty === 0}
                      onClick={() => handleQtyStep(p, -1)}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                    >
                      <RemoveRoundedIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      size="small"
                      type="number"
                      value={displayQty}
                      error={Boolean(qtyErr)}
                      onChange={(e) => handleQtyInput(p, e.target.value)}
                      sx={{ width: 66 }}
                      inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 700 } }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleQtyStep(p, 1)}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                    >
                      <AddRoundedIcon fontSize="small" />
                    </IconButton>
                    {item && (
                      <Tooltip title="Hapus item dari pesanan">
                        <IconButton size="small" color="error" onClick={() => removeDraftItem(p.id)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>

                {/* Pesan Inline Merah Kuantitas Nol / Tidak Valid (Tabel 21) */}
                {qtyErr && (
                  <Typography variant="caption" color="error" fontWeight={600} display="block" sx={{ mt: 0.75 }}>
                    {qtyErr}
                  </Typography>
                )}

                {/* Pemilihan Satuan Jual (UoM) & Diskon Manual per Item (BR-ORD-003 & BR-ORD-007) */}
                <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                  <TextField
                    select
                    size="small"
                    label="Satuan Jual (UoM)"
                    value={calc.uom.value}
                    onChange={(e) => handleUnitChange(p, e.target.value)}
                    sx={{ flex: 1.25 }}
                  >
                    {calc.opts.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    type="number"
                    label="Diskon Manual"
                    value={item ? calc.rawDisc : '0'}
                    disabled={!item}
                    error={Boolean(discErr)}
                    onChange={(e) => handleDiscInput(p, e.target.value)}
                    sx={{ flex: 0.95 }}
                    inputProps={{ min: 0, max: 100, step: 'any' }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <PercentRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>

                {discErr && (
                  <Typography variant="caption" color="error" fontWeight={600} display="block" sx={{ mt: 0.5 }}>
                    {discErr}
                  </Typography>
                )}

                {/* Ringkasan Konversi Kuantitas Dasar (baseQty) & Subtotal Bersih Item */}
                {item && !qtyErr && calc.validQty >= 1 && (
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      mt: 1,
                      px: 1,
                      py: 0.6,
                      borderRadius: 1.25,
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Kuantitas dasar (baseQty): <b>{calc.baseQty} pcs</b>
                    </Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      {calc.validDisc > 0 && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textDecoration: 'line-through', mr: 0.75 }}
                        >
                          {formatRupiah(calc.gross)}
                        </Typography>
                      )}
                      <Typography component="span" variant="caption" fontWeight={800} color="primary.main">
                        {formatRupiah(calc.line)}
                      </Typography>
                    </Box>
                  </Stack>
                )}

                {short && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<WarningAmberRoundedIcon fontSize="small" />}>
                    Estimasi stok gudang tidak mencukupi (dibutuhkan <b>{calc.baseQty} pcs</b>, tersedia <b>{p.stock} pcs</b>). Pesanan <b>tetap dapat diajukan</b> — peringatan lunak.
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        }) : <EmptyState message="Produk tidak ditemukan." />}

        {(draft?.items?.length || 0) > 0 && (
          <BottomBar
            itemCount={draftSummary.totalUnits}
            total={draftSummary.total}
            actionLabel={draftSummary.hasError ? 'Perbaiki Isian Item' : 'Lanjut ke Review'}
            disabled={draftSummary.hasError || draftSummary.validItemCount === 0}
            onClick={() => setDraft((d) => ({ ...d, step: 'review' }))}
          />
        )}
      </Stack>
    );
  }

  /* ===================== VIEW LANGKAH 3: REVIEW & SUBMIT ===================== */
  return (
    <Stack spacing={1.5} sx={{ pb: 9 }}>
      <StepHeader title="Review Pesanan" onBack={() => setDraft((d) => ({ ...d, step: 'items' }))} step={2} />

      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Typography fontWeight={700} fontSize={15}>{outlet.name}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {outlet.address}
          </Typography>

          {/* Rincian item — menampilkan UoM, baseQty (pcs), dan diskon manual */}
          <Stack spacing={1}>
            {(draft?.items || []).map((i) => {
              const p = (db.products || []).find((x) => x.id === i.productId);
              if (!p) return null;
              const calc = resolveItemCalc(i, p);
              if (calc.validQty < 1) return null;
              return (
                <Box key={i.productId} sx={{ borderBottom: '1px dashed', borderColor: 'divider', pb: 1, '&:last-child': { borderBottom: 0, pb: 0 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography fontWeight={700} fontSize={13} noWrap sx={{ mb: 0.25, flex: 1 }}>
                      {p.name}
                    </Typography>
                    {calc.validDisc > 0 && (
                      <Chip
                        size="small"
                        color="warning"
                        label={`Disc ${calc.validDisc}%`}
                        sx={{ height: 20, fontSize: '0.675rem', fontWeight: 700 }}
                      />
                    )}
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {calc.validQty} {calc.uom.value} × {formatRupiah(calc.uom.price)}
                      {calc.uom.pcsPerUnit > 1 ? ` (baseQty: ${calc.baseQty} pcs)` : ` (${calc.baseQty} pcs)`}
                    </Typography>
                    <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {calc.validDisc > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through', mr: 0.75 }}>
                          {formatRupiah(calc.gross)}
                        </Typography>
                      )}
                      <Typography component="span" variant="body2" fontWeight={700}>
                        {formatRupiah(calc.line)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>

          <Stack spacing={0.5} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            {draftSummary.discTotal > 0 && (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">Subtotal Kotor</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatRupiah(draftSummary.grossSubtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="warning.dark">Total Diskon Item</Typography>
                  <Typography variant="body2" color="warning.dark" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                    -{formatRupiah(draftSummary.discTotal)}
                  </Typography>
                </Stack>
              </>
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">Subtotal Bersih</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatRupiah(draftSummary.subtotal)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">PPN {Math.round(TAX_RATE * 100)}%</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatRupiah(draftSummary.tax)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={800}>TOTAL</Typography>
              <Typography variant="body2" fontWeight={800} color="primary" sx={{ whiteSpace: 'nowrap' }}>
                {formatRupiah(draftSummary.total)}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <TextField label="Catatan (opsional, maks 255)" multiline minRows={2} value={note}
            onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 255 }} />
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary" align="center">
        Nomor order unik digenerate otomatis oleh sistem. Tombol terkunci saat penyimpanan — mencegah order ganda.
      </Typography>

      <BottomBar
        itemCount={draftSummary.totalUnits}
        total={draftSummary.total}
        actionLabel="Simpan & Ajukan"
        onClick={submitOrder}
        disabled={!draftSummary.validItemCount || draftSummary.hasError}
        loading={submitting}
      />
    </Stack>
  );
}
