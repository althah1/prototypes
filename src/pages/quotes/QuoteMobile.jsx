import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PercentRoundedIcon from '@mui/icons-material/PercentRounded';

import QuoteDetailDialog from '../../components/quotes/QuoteDetailDialog';
import EmptyState from '../../components/ui/EmptyState';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, formatRupiah, TAX_RATE, QUOTE_DISCOUNT_LIMIT } from '../../utils/helpers';
import { expireQuotes, quoteStatusForDiscount, maxDiscountOf } from '../../utils/quoteUtils';
import { resolveQuoteTarget } from '../../utils/quotePdf';

/* Tanggal + N hari (perhitungan lokal, aman timezone) */
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const FILTERS = [
  { v: 'all', l: 'Semua' },
  { v: 'draft', l: 'Draft' },
  { v: 'pending_approval', l: 'Menunggu Approval' },
  { v: 'sent', l: 'Terkirim' },
  { v: 'approved', l: 'Disetujui' },
  { v: 'rejected', l: 'Ditolak' },
  { v: 'expired', l: 'Kadaluarsa' },
  { v: 'converted', l: 'Jadi Order' },
];

const METODE_BAYAR = [
  { v: 'tunai', l: 'Tunai (COD)' },
  { v: 'transfer', l: 'Transfer Bank' },
  { v: 'termin', l: 'Termin (Tempo)' },
  { v: 'cicilan', l: 'Cicilan' },
  { v: 'konsinyasi', l: 'Konsinyasi (bayar sesuai terjual)' },
];
const TERMIN_OPTS = [7, 14, 30];

const payShort = (q) => {
  if (q.metodePembayaran === 'termin') return `Termin ${q.terminHari || 14} hr`;
  return (
    { tunai: 'Tunai', transfer: 'Transfer', cicilan: 'Cicilan', konsinyasi: 'Konsinyasi' }[
      q.metodePembayaran
    ] || 'Tunai'
  );
};

const QTY_ZERO_ERR = 'Jumlah pesanan tidak valid. Kuantitas minimal adalah 1.';
const DISC_RANGE_ERR = 'Diskon harus bernilai antara 0% hingga 100%.';

/* ===== Konfigurasi Multi-UoM per Produk (mirip OrderMobile) =====
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

/* Header langkah */
function StepHeader({ title, onBack, step }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton onClick={onBack} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" fontWeight={800} noWrap>
          {title}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 18,
                height: 4,
                borderRadius: 99,
                bgcolor: i <= step ? 'primary.main' : 'divider',
              }}
            />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            Langkah {step + 1} dari 3
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

/* Bar aksi bawah (sticky) */
function BottomBar({ itemCount, total, actionLabel, onClick, disabled, loading }) {
  return (
    <Box
      onClick={disabled || loading ? undefined : onClick}
      sx={{
        position: 'fixed',
        bottom: 84,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 398,
        bgcolor: disabled ? 'action.disabledBackground' : 'primary.main',
        color: disabled ? 'text.disabled' : '#fff',
        borderRadius: 2.5,
        px: 2,
        py: 1.25,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: disabled || loading ? 'default' : 'pointer',
        zIndex: 1150,
        boxShadow: 4,
      }}
    >
      <Box>
        <Typography fontWeight={800} fontSize={14}>
          {itemCount} item
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9, whiteSpace: 'nowrap' }}>
          {formatRupiah(total)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography fontWeight={700} fontSize={14}>
          {loading ? 'Menyimpan…' : actionLabel}
        </Typography>
        {!loading && <ArrowForwardRoundedIcon fontSize="small" />}
      </Stack>
    </Box>
  );
}

export default function QuoteMobile() {
  const { user } = useAuth();
  const { db, insert, update, mutate } = useDb();
  const { notify, online } = useSync();
  const { toast } = useToast();
  const location = useLocation();
  const today = todayISO();
  const maxAllowedDate = addDays(today, 30);

  /* Order asal (draft diteruskan dari Order) — untuk prefill metode pembayaran */
  const fromOrd =
    location.state?.fromOrder != null
      ? (db.orders || []).find((o) => o.id === location.state.fromOrder) || null
      : null;

  /* ===== SEMUA HOOKS DI PALING ATAS ===== */
  const [filter, setFilter] = useState('all');
  const [targetTab, setTargetTab] = useState('outlet'); /* 'outlet' | 'prospect' */
  const [draft, setDraft] = useState(() =>
    fromOrd
      ? {
          step: 'items',
          targetType: 'outlet',
          outletId: fromOrd.outletId,
          prospectId: null,
          fromOrderNo: fromOrd.no,
          items: (fromOrd.items || []).map((it) => {
            const p = (db.products || []).find((x) => x.id === it.productId);
            const unit = (it.unit || (p?.unit || 'pcs')).toLowerCase();
            return {
              productId: it.productId,
              unit,
              qty: it.qty,
              rawQty: String(it.qty),
              disc: it.disc || 0,
              rawDisc: String(it.disc || 0),
            };
          }),
        }
      : null
  );
  const [outletSearch, setOutletSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [unitPrefs, setUnitPrefs] = useState({});
  const [validUntil, setValidUntil] = useState(() => addDays(todayISO(), 14)); /* default 14 hari */
  const [note, setNote] = useState('');
  const [syarat, setSyarat] = useState('');
  const [metode, setMetode] = useState(fromOrd?.metodePembayaran || 'tunai');
  const [bankId, setBankId] = useState(
    fromOrd?.metodePembayaran === 'transfer' && fromOrd.bankId != null ? String(fromOrd.bankId) : ''
  );
  const [terminHari, setTerminHari] = useState(
    fromOrd?.terminHari != null ? String(fromOrd.terminHari) : '14'
  );
  const [submitting, setSubmitting] = useState(false);
  const [successQuote, setSuccessQuote] = useState(null);
  const [detailId, setDetailId] = useState(null);

  /* Auto-expire saat halaman dibuka (sekali) */
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireQuotes(db, mutate);
    if (n) toast(`${n} quotation kedaluwarsa otomatis ditandai Kadaluarsa.`, 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Derived: Target Pelanggan (Outlet Terdaftar vs Calon Mitra Prospek) ===== */
  const isProspectDraft = draft?.targetType === 'prospect';
  const selectedOutlet = !isProspectDraft
    ? (db.outlets || []).find((o) => o.id === draft?.outletId)
    : null;
  const selectedProspect = isProspectDraft
    ? (db.prospects || []).find((p) => p.id === draft?.prospectId)
    : null;
  const selectedTarget = isProspectDraft ? selectedProspect : selectedOutlet;

  const step = draft
    ? (draft.step === 'items' || draft.step === 'review') && !selectedTarget
      ? 'outlet'
      : draft.step
    : null;

  const mySalesProfile = (db.sales || []).find((s) => s.id === user.salesId);

  const outlets = (db.outlets || []).filter((o) => {
    const q = outletSearch.trim().toLowerCase();
    return (
      o.status === 'active' &&
      (!q ||
        o.name.toLowerCase().includes(q) ||
        (o.address || '').toLowerCase().includes(q) ||
        (o.owner || '').toLowerCase().includes(q))
    );
  });

  /* Daftar Prospek relevan untuk Sales lapangan (tidak berstatus Ditolak) */
  const prospects = (db.prospects || []).filter((p) => {
    if (p.status === 'Ditolak') return false;
    const allowedForSales =
      !p.salesId ||
      p.salesId === user.salesId ||
      (mySalesProfile?.areaId && p.areaId === mySalesProfile.areaId);
    if (!allowedForSales) return false;
    const q = outletSearch.trim().toLowerCase();
    return (
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q) ||
      (p.owner || '').toLowerCase().includes(q)
    );
  });

  const prospectCategoryName = (cid) =>
    (db.prospectCategories || []).find((c) => c.id === cid)?.name || 'Prospek';

  /* F-23: gerbang check-in khusus Outlet Terdaftar */
  const ckOutlets = new Set(
    (db.checkins || [])
      .filter((c) => c.salesId === user.salesId && c.date === todayISO())
      .map((c) => c.outletId)
  );

  const products = (db.products || []).filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return (
      p.status === 'active' &&
      (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    );
  });

  /* Hanya tampilkan rekening perusahaan untuk pembayaran dari pelanggan (kompatibel dengan kategori rekening BR-MD-BNK-002) */
  const banks = (db.banks || []).filter(
    (b) =>
      (b.status || 'active') === 'active' &&
      (!b.kategori || b.kategori === 'perusahaan' || b.kategori === 'Rekening Perusahaan')
  );

  const myQuotes = (db.quotations || [])
    .filter((q) => q.salesId === user.salesId)
    .slice()
    .reverse();
  const quoteList = filter === 'all' ? myQuotes : myQuotes.filter((q) => q.status === filter);

  /* Validasi Tanggal Berlaku (Bab 4.5.2, Tabel 23 & Tabel 24): mulai hari ini s.d. 30 hari ke depan */
  const validUntilError = (() => {
    if (!validUntil) return 'Tanggal masa berlaku penawaran wajib diisi.';
    if (validUntil < today) return 'Tanggal masa berlaku tidak boleh kurang dari hari ini.';
    if (validUntil > maxAllowedDate) return 'Masa berlaku maksimal 30 hari ke depan dari hari ini.';
    return '';
  })();

  const findDraftItem = (pid) => (draft?.items || []).find((i) => i.productId === pid) || null;

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

  /* Input qty 0 tetap mempertahankan baris & memunculkan error inline merah */
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

  const draftSummary = (() => {
    let validItemCount = 0;
    let totalUnits = 0;
    let totalBasePcs = 0;
    let grossSubtotal = 0;
    let discTotal = 0;
    let subtotal = 0;
    let tax = 0;
    let maxDisc = 0;
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
        maxDisc = Math.max(maxDisc, calc.validDisc);
      }
    });

    tax = Math.round(subtotal * TAX_RATE);
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
      maxDisc,
    };
  })();

  const resetDraft = () => {
    setDraft(null);
    setOutletSearch('');
    setProductSearch('');
    setNote('');
    setSyarat('');
    setValidUntil(addDays(todayISO(), 14));
    setMetode('tunai');
    setBankId('');
    setTerminHari('14');
  };

  /* Template dari Entry Order */
  const applyFromOrder = (o) => {
    setDraft({
      step: 'items',
      targetType: 'outlet',
      outletId: o.outletId,
      prospectId: null,
      fromOrderNo: o.no,
      items: (o.items || []).map((it) => {
        const p = (db.products || []).find((x) => x.id === it.productId);
        const unit = (it.unit || (p?.unit || 'pcs')).toLowerCase();
        return {
          productId: it.productId,
          unit,
          qty: it.qty,
          rawQty: String(it.qty),
          disc: it.disc || 0,
          rawDisc: String(it.disc || 0),
        };
      }),
    });
    setMetode(o.metodePembayaran || 'tunai');
    setBankId(o.metodePembayaran === 'transfer' && o.bankId != null ? String(o.bankId) : '');
    setTerminHari(o.terminHari != null ? String(o.terminHari) : '14');
    toast(`Template dimuat dari order ${o.no} — periksa kembali item, satuan & diskon sebelum menyimpan.`, 'info');
  };

  const genQuoteNo = () => {
    const t = todayISO();
    const count = (db.quotations || []).filter(
      (q) => q.date === t && q.salesId === user.salesId
    ).length;
    const kodeSales = user.salesId ? `SAL-${String(user.salesId).padStart(3, '0')}` : 'SFA';
    return `QUO-${t.replace(/-/g, '')}-${kodeSales}-${String(count + 1).padStart(3, '0')}`;
  };
  const genVerCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  const submitQuote = () => {
    if (submitting || !draft?.items.length || draftSummary.hasError || Boolean(validUntilError)) return;
    if (metode === 'transfer' && !bankId) {
      toast('Pilih rekening bank tujuan untuk pembayaran transfer.', 'warning');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const items = draft.items
        .filter((i) => (db.products || []).some((x) => x.id === i.productId))
        .map((i) => {
          const p = (db.products || []).find((x) => x.id === i.productId);
          if (!p) return null;
          const calc = resolveItemCalc(i, p);
          if (calc.qtyError || calc.discError || calc.validQty < 1) return null;
          return {
            productId: p.id,
            sku: p.sku,
            name: p.name,
            unit: calc.uom.value,
            uom: calc.uom.value,
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
        toast('Produk penawaran sudah tidak tersedia di Master Data — buat ulang quotation.', 'warning');
        return;
      }

      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const after = items.reduce((s, i) => s + i.line, 0);
      const discTotal = subtotal - after;
      const tax = Math.round(after * TAX_RATE);
      const maxDisc = maxDiscountOf(items);
      const status = quoteStatusForDiscount(items);

      const rec = insert('quotations', {
        no: genQuoteNo(),
        date: todayISO(),
        salesId: user.salesId,
        targetType: isProspectDraft ? 'prospect' : 'outlet',
        outletId: isProspectDraft ? null : draft.outletId,
        prospectId: isProspectDraft ? draft.prospectId : null,
        customerName: selectedTarget?.name || '',
        customerOwner: selectedTarget?.owner || '',
        customerPhone: selectedTarget?.phone || '',
        customerAddress: selectedTarget?.address || '',
        customerEmail: selectedTarget?.email || '',
        items,
        subtotal,
        discTotal,
        totalAfterDisc: after,
        taxRate: TAX_RATE,
        tax,
        total: after + tax,
        status,
        validUntil,
        verCode: genVerCode(),
        note: note.trim(),
        catatanSyarat: syarat.trim(),
        metodePembayaran: metode,
        bankId: metode === 'transfer' ? Number(bankId) : null,
        terminHari: metode === 'termin' ? Number(terminHari) : null,
      });

      /* Bila dibuat untuk Prospek yang masih berstatus awal, perbarui progres ke Negosiasi */
      if (isProspectDraft && selectedProspect && selectedProspect.status === 'Prospek') {
        update('prospects', selectedProspect.id, { status: 'Negosiasi' });
      }

      /* Diskon melebihi wewenang → notifikasi Supervisor */
      if (status === 'pending_approval') {
        const sales = (db.sales || []).find((s) => s.id === user.salesId);
        const spv = (db.supervisors || []).find((s) => s.id === sales?.supervisorId);
        const spvUser = (db.users || []).find((u) => u.email === spv?.email);
        if (spvUser) {
          notify(
            spvUser.id,
            'Approval Diskon Quotation',
            `${rec.no} — diskon ${maxDisc}% melebihi wewenang ${QUOTE_DISCOUNT_LIMIT}%, menunggu keputusan Anda.`
          );
        }
      }

      setSubmitting(false);
      resetDraft();
      setSuccessQuote(rec);
    }, 500);
  };

  /* ===================== VIEW: DAFTAR QUOTATION ===================== */
  if (!step) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={800}>
            Quotation
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ReceiptLongRoundedIcon />}
              onClick={() => setDraft({ step: 'order', items: [] })}
            >
              Dari Entry Order
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={() => {
                setTargetTab('outlet');
                setOutletSearch('');
                setDraft({ step: 'outlet', targetType: 'outlet', items: [] });
              }}
            >
              Buat Baru
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.v}
              label={f.l}
              size="small"
              clickable
              color={filter === f.v ? 'primary' : 'default'}
              variant={filter === f.v ? 'filled' : 'outlined'}
              onClick={() => setFilter(f.v)}
            />
          ))}
        </Stack>

        {quoteList.length ? (
          quoteList.map((q) => {
            const md = q.items.length ? Math.max(...q.items.map((i) => i.disc || 0)) : 0;
            const target = resolveQuoteTarget(q, db);
            return (
              <Card
                key={q.id}
                elevation={0}
                onClick={() => setDetailId(q.id)}
                sx={{ cursor: 'pointer', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              >
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontFamily="monospace" fontWeight={700} fontSize={12} noWrap>
                      {q.no}
                    </Typography>
                    <StatusChip kind="quote" status={q.status} />
                  </Stack>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {target.name} • {payShort(q)} • berlaku s.d {q.validUntil}
                      {md > 0 ? ` • disc maks ${md}%` : ''}
                    </Typography>
                    {target.isProspect && (
                      <Chip
                        size="small"
                        color="info"
                        variant="outlined"
                        label="Prospek"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}
                      />
                    )}
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                      {formatRupiah(q.total)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState message="Belum ada quotation pada filter ini." />
        )}

        <QuoteDetailDialog
          open={!!detailId}
          quoteId={detailId}
          onClose={() => setDetailId(null)}
          salesActions
        />

        {/* Dialog sukses */}
        <Dialog
          open={!!successQuote}
          onClose={() => setSuccessQuote(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1 } }}
        >
          <DialogTitle>Quotation Tersimpan</DialogTitle>
          <DialogContent dividers sx={{ overflowX: 'hidden' }}>
            <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mb: 0.5 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 30, color: 'common.white' }} />
              </Avatar>
              <Typography fontFamily="monospace" fontWeight={800} fontSize={20}>
                {successQuote?.no}
              </Typography>
              <StatusChip kind="quote" status={successQuote?.status} />
              <Typography variant="body2">
                Total: <b>{formatRupiah(successQuote?.total || 0)}</b>
              </Typography>
              <Typography variant="caption" color="text.secondary" align="center">
                {successQuote?.status === 'pending_approval' ? (
                  <>
                    Diskon melebihi wewenang — menunggu <b>persetujuan Supervisor</b> sebelum dapat
                    dikirim/diunduh.
                  </>
                ) : (
                  <>
                    Berlaku s.d {successQuote?.validUntil}. Buka detail untuk mengajukan, mencetak
                    PDF, berbagi Web Share/WhatsApp, atau mengirim Email.
                  </>
                )}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuccessQuote(null)}>Tutup</Button>
            <Button
              variant="contained"
              startIcon={<DescriptionRoundedIcon fontSize="small" />}
              onClick={() => {
                const id = successQuote?.id;
                setSuccessQuote(null);
                setDetailId(id);
              }}
            >
              Lihat Detail
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  /* ===================== LANGKAH 1: PILIH TUJUAN PENAWARAN (OUTLET / PROSPEK) ===================== */
  if (step === 'outlet') {
    return (
      <Stack spacing={1.5}>
        <StepHeader title="Pilih Tujuan Penawaran" onBack={resetDraft} step={0} />

        {/* Tab Pemilih Kategori Pelanggan: Outlet Terdaftar vs Calon Mitra (Prospek) (Bab 4.5 & Tabel 23) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            p: 0.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
          }}
        >
          <Button
            size="small"
            variant={targetTab === 'outlet' ? 'contained' : 'text'}
            startIcon={<StorefrontRoundedIcon fontSize="small" />}
            onClick={() => {
              setTargetTab('outlet');
              setOutletSearch('');
            }}
            sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
          >
            Outlet Terdaftar
          </Button>
          <Button
            size="small"
            variant={targetTab === 'prospect' ? 'contained' : 'text'}
            startIcon={<PersonSearchRoundedIcon fontSize="small" />}
            onClick={() => {
              setTargetTab('prospect');
              setOutletSearch('');
            }}
            sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
          >
            Calon Mitra (Prospek)
          </Button>
        </Box>

        <TextField
          label={
            targetTab === 'outlet'
              ? 'Cari outlet terdaftar / alamat…'
              : 'Cari nama toko prospek / pemilik…'
          }
          value={outletSearch}
          onChange={(e) => setOutletSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {targetTab === 'outlet' ? (
          outlets.length ? (
            outlets.map((o) => (
              <Card
                key={o.id}
                elevation={0}
                onClick={() =>
                  ckOutlets.has(o.id)
                    ? setDraft({
                        step: 'items',
                        targetType: 'outlet',
                        outletId: o.id,
                        prospectId: null,
                        items: [],
                      })
                    : toast(
                        'Outlet belum check-in hari ini — buka halaman Rute (menu bawah) untuk check-in terlebih dahulu.',
                        'warning'
                      )
                }
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent
                  sx={{
                    p: 1.75,
                    '&:last-child': { pb: 1.75 },
                    display: 'flex',
                    gap: 1.25,
                    alignItems: 'center',
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      flexShrink: 0,
                    }}
                  >
                    <StorefrontRoundedIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>
                      {o.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {o.address}
                    </Typography>
                    {!ckOutlets.has(o.id) && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label="Belum Check-In"
                        sx={{ mt: 0.5, height: 20, fontSize: '0.675rem' }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState message="Outlet terdaftar tidak ditemukan." />
          )
        ) : prospects.length ? (
          prospects.map((p) => (
            <Card
              key={p.id}
              elevation={0}
              onClick={() =>
                setDraft({
                  step: 'items',
                  targetType: 'prospect',
                  outletId: null,
                  prospectId: p.id,
                  items: [],
                })
              }
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent
                sx={{
                  p: 1.75,
                  '&:last-child': { pb: 1.75 },
                  display: 'flex',
                  gap: 1.25,
                  alignItems: 'center',
                }}
              >
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: 'info.light',
                    color: 'info.dark',
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  <PersonSearchRoundedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography fontWeight={700} fontSize={14} noWrap sx={{ flex: 1 }}>
                      {p.name}
                    </Typography>
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label={prospectCategoryName(p.categoryId)}
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {p.owner ? `${p.owner} • ` : ''}
                    {p.address || '-'}
                  </Typography>
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    Status: {p.status || 'Prospek'}
                    {p.phone ? ` • ${p.phone}` : ''}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState message="Belum ada data calon mitra (prospek) yang sesuai pencarian." />
        )}
      </Stack>
    );
  }

  /* ===================== LANGKAH 1B: PILIH ENTRY ORDER (template) ===================== */
  if (step === 'order') {
    const tplOrders = (db.orders || [])
      .filter((o) => o.salesId === user.salesId && !['rejected', 'cancelled'].includes(o.status))
      .slice()
      .reverse();
    const outletNameOf = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
    return (
      <Stack spacing={1.5}>
        <StepHeader title="Pilih Entry Order" onBack={() => setDraft(null)} step={0} />
        <Typography variant="body2" color="text.secondary">
          Quotation terisi otomatis mengikuti order terpilih — outlet, produk, dan metode pembayaran
          yang sudah dipilih saat order dibuat.
        </Typography>
        {tplOrders.length ? (
          tplOrders.map((o) => (
            <Card
              key={o.id}
              elevation={0}
              onClick={() => applyFromOrder(o)}
              sx={{ cursor: 'pointer', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
            >
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontFamily="monospace" fontWeight={700} fontSize={12} noWrap>
                    {o.no}
                  </Typography>
                  <StatusChip kind="order" status={o.status} />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                  {outletNameOf(o.outletId)} • {o.items.length} produk • {payShort(o)} • {o.date}
                </Typography>
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                    {formatRupiah(o.total)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState message="Belum ada entry order yang bisa dijadikan template." />
        )}
      </Stack>
    );
  }

  /* ===================== LANGKAH 2: PRODUK & DISKON ===================== */
  if (step === 'items') {
    return (
      <Stack spacing={1.5} sx={{ pb: 7 }}>
        <StepHeader
          title="Pilih Produk & Diskon"
          onBack={() =>
            setDraft({
              step: 'outlet',
              targetType: isProspectDraft ? 'prospect' : 'outlet',
              items: [],
            })
          }
          step={1}
        />

        {draft.fromOrderNo && (
          <Alert severity="info" icon={<DescriptionRoundedIcon fontSize="small" />}>
            Draft diteruskan dari Order <b>{draft.fromOrderNo}</b> — periksa kembali qty &amp; atur
            diskon sebelum menyimpan.
          </Alert>
        )}

        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: isProspectDraft ? 'info.light' : 'primary.light',
                  color: isProspectDraft ? 'info.dark' : 'primary.dark',
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                {isProspectDraft ? (
                  <PersonSearchRoundedIcon fontSize="small" />
                ) : (
                  <StorefrontRoundedIcon fontSize="small" />
                )}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography fontWeight={700} fontSize={15} noWrap>
                    {selectedTarget.name}
                  </Typography>
                  {isProspectDraft && (
                    <Chip
                      size="small"
                      color="info"
                      label="Prospek"
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {selectedTarget.address || '-'}
                </Typography>
              </Box>
            </Stack>
            <Alert severity="info" sx={{ mt: 1, py: 0.5 }} icon={<LockRoundedIcon fontSize="small" />}>
              Harga <b>terkunci dari Master Data</b> — tersimpan otomatis saat dokumen dibuat; hanya
              diskon yang bisa diatur.
            </Alert>
          </CardContent>
        </Card>

        <TextField
          label="Cari produk / SKU…"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {products.length ? (
          products.map((p) => {
            const item = findDraftItem(p.id);
            const previewUnit = item?.unit || unitPrefs[p.id] || (p.unit || 'pcs').toLowerCase();
            const calc = resolveItemCalc(item || { unit: previewUnit, qty: 0, rawQty: '0', disc: 0, rawDisc: '0' }, p);
            const qtyErr = item ? calc.qtyError : '';
            const discErr = item ? calc.discError : '';
            const displayQty = item ? calc.rawQty : 0;
            const short = item && calc.validQty > 0 && calc.baseQty > p.stock;
            const overDisc = item && calc.validQty > 0 && calc.validDisc > QUOTE_DISCOUNT_LIMIT;

            return (
              <Card
                key={p.id}
                elevation={0}
                sx={{
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: (qtyErr || discErr) ? 'error.main' : (calc.validQty > 0 ? 'primary.main' : 'divider'),
                }}
              >
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={700} fontSize={14} noWrap>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                        {p.sku} • {p.category} • {p.unit}
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
                        <Tooltip title="Hapus item dari penawaran">
                          <IconButton size="small" color="error" onClick={() => removeDraftItem(p.id)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>

                  {qtyErr && (
                    <Typography variant="caption" color="error" fontWeight={600} display="block" sx={{ mt: 0.75 }}>
                      {qtyErr}
                    </Typography>
                  )}

                  {/* Pemilihan Satuan Jual (UoM) & Diskon Manual per Item */}
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

                  {overDisc && (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<WarningAmberRoundedIcon fontSize="small" />}>
                      Diskon melebihi wewenang {QUOTE_DISCOUNT_LIMIT}% — dokumen akan menunggu{' '}
                      <b>persetujuan Supervisor</b>.
                    </Alert>
                  )}

                  {short && (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<WarningAmberRoundedIcon fontSize="small" />}>
                      Estimasi stok gudang saat ini {p.stock} pcs (kebutuhan {calc.baseQty} pcs). Penawaran tetap dapat dibuat — stok gudang baru dipotong saat Quotation dikonversi menjadi Entry Order.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState message="Produk tidak ditemukan." />
        )}

        {draftSummary.validItemCount > 0 && (
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

  /* ===================== LANGKAH 3: REVIEW & SIMPAN ===================== */
  return (
    <Stack spacing={1.5} sx={{ pb: 7 }}>
      <StepHeader
        title="Review Quotation"
        onBack={() => setDraft((d) => ({ ...d, step: 'items' }))}
        step={2}
      />

      {!online && (
        <Alert severity="info">
          Anda sedang offline — dokumen quotation tetap dapat dibuat: seluruh data tersimpan lokal di
          perangkat.
        </Alert>
      )}

      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography fontWeight={700} fontSize={15}>
              {selectedTarget.name}
            </Typography>
            {isProspectDraft && (
              <Chip
                size="small"
                color="info"
                label="Calon Mitra (Prospek)"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {selectedTarget.owner ? `${selectedTarget.owner} • ` : ''}
            {selectedTarget.address || '-'}
          </Typography>

          {/* Rincian item — menampilkan UoM, baseQty (pcs), dan diskon manual */}
          <Stack spacing={1}>
            {draft.items.map((i) => {
              const p = (db.products || []).find((x) => x.id === i.productId);
              if (!p) return null;
              const calc = resolveItemCalc(i, p);
              if (calc.validQty < 1) return null;
              return (
                <Box
                  key={i.productId}
                  sx={{
                    borderBottom: '1px dashed',
                    borderColor: 'divider',
                    pb: 1,
                    '&:last-child': { borderBottom: 0, pb: 0 },
                  }}
                >
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
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
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
                  <Typography variant="body2" color="text.secondary">
                    Subtotal Kotor
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    {formatRupiah(draftSummary.grossSubtotal)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="warning.dark">
                    Total Diskon Item
                  </Typography>
                  <Typography variant="body2" color="warning.dark" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                    −{formatRupiah(draftSummary.discTotal)}
                  </Typography>
                </Stack>
              </>
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Subtotal Bersih
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                {formatRupiah(draftSummary.subtotal)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                PPN {Math.round(TAX_RATE * 100)}%
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                {formatRupiah(draftSummary.tax)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={800}>
                TOTAL
              </Typography>
              <Typography variant="body2" fontWeight={800} color="primary" sx={{ whiteSpace: 'nowrap' }}>
                {formatRupiah(draftSummary.total)}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* ===== Syarat Pembayaran ===== */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack spacing={2}>
            <TextField
              select
              label="Metode Pembayaran *"
              value={metode}
              onChange={(e) => setMetode(e.target.value)}
            >
              {METODE_BAYAR.map((m) => (
                <MenuItem key={m.v} value={m.v}>
                  {m.l}
                </MenuItem>
              ))}
            </TextField>
            {metode === 'transfer' &&
              (banks.length ? (
                <TextField
                  select
                  label="Rekening Tujuan *"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  helperText="Rekening perusahaan — pihak pembeli transfer ke sini."
                  MenuProps={{ PaperProps: { sx: { maxHeight: 250 } } }}
                >
                  {banks.map((b) => (
                    <MenuItem key={b.id} value={String(b.id)}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {b.nama}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {b.noRekening}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Alert severity="warning">
                  Belum ada rekening bank perusahaan aktif — minta Admin menambahkannya di Master Data
                  → Bank, atau pilih metode pembayaran lain.
                </Alert>
              ))}
            {metode === 'termin' && (
              <TextField
                select
                label="Jatuh Tempo (Termin) *"
                value={terminHari}
                onChange={(e) => setTerminHari(e.target.value)}
              >
                {TERMIN_OPTS.map((d) => (
                  <MenuItem key={d} value={String(d)}>
                    Termin {d} hari
                  </MenuItem>
                ))}
              </TextField>
            )}
            {metode === 'cicilan' && (
              <Alert severity="info">
                Tulis rincian cicilan (DP, jumlah angsuran) di kolom <b>Syarat &amp; Ketentuan khusus</b>{' '}
                di bawah.
              </Alert>
            )}
            {metode === 'konsinyasi' && (
              <Alert severity="info">
                Konsinyasi: barang titipan — penagihan mengikuti hasil stock-take (jumlah barang yang
                terjual).
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ===== Masa Berlaku & Catatan (Bab 4.5.2, Tabel 23 & Tabel 24) ===== */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack spacing={2}>
            <TextField
              type="date"
              label="Berlaku Hingga *"
              value={validUntil}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setValidUntil(e.target.value)}
              inputProps={{ min: today, max: maxAllowedDate }}
              error={Boolean(validUntilError)}
              helperText={
                validUntilError ||
                'Mulai hari ini hingga maksimal 30 hari ke depan (default 14 hari).'
              }
            />
            <TextField
              label="Syarat & Ketentuan khusus (tercetak di PDF, maks 500)"
              multiline
              minRows={2}
              value={syarat}
              onChange={(e) => setSyarat(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText="Opsional — mis. rincian cicilan/DP atau syarat pengiriman."
            />
            <TextField
              label="Catatan (opsional, maks 255)"
              multiline
              minRows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              inputProps={{ maxLength: 255 }}
            />
          </Stack>
        </CardContent>
      </Card>

      {draftSummary.maxDisc > QUOTE_DISCOUNT_LIMIT ? (
        <Alert severity="warning" icon={<WarningAmberRoundedIcon fontSize="small" />}>
          Diskon maks <b>{draftSummary.maxDisc}%</b> melebihi wewenang {QUOTE_DISCOUNT_LIMIT}% — quotation akan
          berstatus <b>Menunggu Persetujuan Supervisor</b> dan tidak dapat dikirim/diunduh sebelum
          disetujui.
        </Alert>
      ) : (
        <Alert severity="info" icon={<LockRoundedIcon fontSize="small" />}>
          Harga merupakan <b>snapshot</b> saat dokumen disimpan — perubahan Master Data tidak mengubah
          dokumen.
        </Alert>
      )}

      <BottomBar
        itemCount={draftSummary.totalUnits}
        total={draftSummary.total}
        actionLabel="Simpan Quotation"
        onClick={submitQuote}
        disabled={!draftSummary.validItemCount || draftSummary.hasError || Boolean(validUntilError)}
        loading={submitting}
      />
    </Stack>
  );
}
