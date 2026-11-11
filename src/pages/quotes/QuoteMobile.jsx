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

import QuoteDetailDialog from '../../components/mobile/QuoteDetailDialogMobile';
import EmptyState from '../../components/mobile/EmptyStateMobile';
import StatusChip from '../../components/mobile/StatusChipMobile';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, formatRupiah, TAX_RATE, QUOTE_DISCOUNT_LIMIT } from '../../utils/helpers';
import { expireQuotes, quoteStatusForDiscount, maxDiscountOf } from '../../utils/quoteUtils';
import { resolveQuoteTarget } from '../../utils/quotePdf';

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

function StepHeader({ title, onBack, step }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton onClick={onBack} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={800} noWrap sx={{ fontSize: 14 }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.2 }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ width: 16, height: 3, borderRadius: 99, bgcolor: i <= step ? 'primary.main' : 'divider' }} />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontSize: 9.5 }}>
            Langkah {step + 1} dari 3
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

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
        borderRadius: 1,
        px: 1.5,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: disabled || loading ? 'default' : 'pointer',
        zIndex: 1150,
        boxShadow: 4,
      }}
    >
      <Box>
        <Typography fontWeight={800} fontSize={12}>
          {itemCount} item
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9, whiteSpace: 'nowrap', fontSize: 10.5 }}>
          {formatRupiah(total)}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography fontWeight={700} fontSize={12}>
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

  const fromOrd =
    location.state?.fromOrder != null
      ? (db.orders || []).find((o) => o.id === location.state.fromOrder) || null
      : null;

  const [filter, setFilter] = useState('all');
  const [targetTab, setTargetTab] = useState('outlet');
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
  const [validUntil, setValidUntil] = useState(() => addDays(todayISO(), 14));
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

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireQuotes(db, mutate);
    if (n) toast(`${n} quotation kedaluwarsa otomatis ditandai Kadaluarsa.`, 'info');
  }, []);

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
      if (!p) return;
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

      if (isProspectDraft && selectedProspect && selectedProspect.status === 'Prospek') {
        update('prospects', selectedProspect.id, { status: 'Negosiasi' });
      }

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

  if (!step) {
    return (
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" fontWeight={800} sx={{ fontSize: 14 }} noWrap>Quotation</Typography>
          <Stack direction="row" spacing={0.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ReceiptLongRoundedIcon fontSize="small" />}
              onClick={() => setDraft({ step: 'order', items: [] })} sx={{ fontSize: 11 }}>
              Dari Entry Order
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon fontSize="small" />}
              onClick={() => {
                setTargetTab('outlet');
                setOutletSearch('');
                setDraft({ step: 'outlet', targetType: 'outlet', items: [] });
              }} sx={{ fontSize: 11 }}>
              Buat Baru
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f.v}
              label={f.l}
              size="small"
              clickable
              color={filter === f.v ? 'primary' : 'default'}
              variant={filter === f.v ? 'filled' : 'outlined'}
              onClick={() => setFilter(f.v)}
              sx={{ fontSize: '0.65rem', borderRadius: 1 }}
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
                sx={{ cursor: 'pointer', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
              >
                <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontFamily="monospace" fontWeight={700} fontSize={10.5} noWrap>
                      {q.no}
                    </Typography>
                    <StatusChip kind="quote" status={q.status} />
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.2 }}>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 9.5 }}>
                      {target.name} • {payShort(q)} • berlaku s.d {q.validUntil}
                      {md > 0 ? ` • disc maks ${md}%` : ''}
                    </Typography>
                    {target.isProspect && (
                      <Chip
                        size="small"
                        color="info"
                        variant="outlined"
                        label="Prospek"
                        sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, flexShrink: 0, borderRadius: 1 }}
                      />
                    )}
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      Total
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
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

        <Dialog
          open={!!successQuote}
          onClose={() => setSuccessQuote(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, fontSize: 13 }}>Quotation Tersimpan</DialogTitle>
          <DialogContent dividers sx={{ overflowX: 'hidden', px: 1.5, py: 1 }}>
            <Stack alignItems="center" spacing={0.75} sx={{ py: 0.75 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48, mb: 0.25 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 24, color: 'common.white' }} />
              </Avatar>
              <Typography fontFamily="monospace" fontWeight={800} fontSize={16}>
                {successQuote?.no}
              </Typography>
              <StatusChip kind="quote" status={successQuote?.status} />
              <Typography variant="body2" sx={{ fontSize: 11 }}>
                Total: <b>{formatRupiah(successQuote?.total || 0)}</b>
              </Typography>
              <Typography variant="caption" color="text.secondary" align="center" sx={{ fontSize: 10 }}>
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
          <DialogActions sx={{ px: 1.5, py: 1, gap: 0.75 }}>
            <Button onClick={() => setSuccessQuote(null)} sx={{ fontSize: 11 }}>Tutup</Button>
            <Button
              variant="contained"
              startIcon={<DescriptionRoundedIcon fontSize="small" />}
              onClick={() => {
                const id = successQuote?.id;
                setSuccessQuote(null);
                setDetailId(id);
              }} sx={{ fontSize: 11, fontWeight: 700 }}>
              Lihat Detail
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  if (step === 'outlet') {
    return (
      <Stack spacing={1.25}>
        <StepHeader title="Pilih Tujuan Penawaran" onBack={resetDraft} step={0} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0.75,
            p: 0.5,
            bgcolor: 'action.hover',
            borderRadius: 1,
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
            sx={{ borderRadius: 1, fontWeight: 700, textTransform: 'none', boxShadow: 'none', fontSize: 11 }}
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
            sx={{ borderRadius: 1, fontWeight: 700, textTransform: 'none', boxShadow: 'none', fontSize: 11 }}
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
          size="small"
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
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent
                  sx={{
                    p: 1.25,
                    '&:last-child': { pb: 1.25 },
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  <Avatar
                    variant="rounded"
                    sx={{
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  >
                    <StorefrontRoundedIcon fontSize="small" />
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} fontSize={12} noWrap>
                      {o.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: 9.5 }}>
                      {o.address}
                    </Typography>
                    {!ckOutlets.has(o.id) && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label="Belum Check-In"
                        sx={{ mt: 0.3, height: 18, fontSize: '0.625rem', fontWeight: 700 }}
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
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent
                sx={{
                  p: 1.25,
                  '&:last-child': { pb: 1.25 },
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                }}
              >
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: 'info.light',
                    color: 'info.dark',
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                >
                  <PersonSearchRoundedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography fontWeight={700} fontSize={12} noWrap sx={{ flex: 1 }}>
                      {p.name}
                    </Typography>
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label={prospectCategoryName(p.categoryId)}
                      sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700, flexShrink: 0 }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: 9.5 }}>
                    {p.owner ? `${p.owner} • ` : ''}
                    {p.address || '-'}
                  </Typography>
                  <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ fontSize: 10 }}>
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

  if (step === 'order') {
    const tplOrders = (db.orders || [])
      .filter((o) => o.salesId === user.salesId && !['rejected', 'cancelled'].includes(o.status))
      .slice()
      .reverse();
    const outletNameOf = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
    return (
      <Stack spacing={1.25}>
        <StepHeader title="Pilih Entry Order" onBack={() => setDraft(null)} step={0} />
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
          Quotation terisi otomatis mengikuti order terpilih — outlet, produk, dan metode pembayaran
          yang sudah dipilih saat order dibuat.
        </Typography>
        {tplOrders.length ? (
          tplOrders.map((o) => (
            <Card
              key={o.id}
              elevation={0}
              onClick={() => applyFromOrder(o)}
              sx={{ cursor: 'pointer', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
            >
              <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontFamily="monospace" fontWeight={700} fontSize={10.5} noWrap>
                    {o.no}
                  </Typography>
                  <StatusChip kind="order" status={o.status} />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: 9.5 }}>
                  {outletNameOf(o.outletId)} • {o.items.length} produk • {payShort(o)} • {o.date}
                </Typography>
                <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>
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

  if (step === 'items') {
    return (
      <Stack spacing={1.25} sx={{ pb: 6 }}>
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

        <Card elevation={0} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: isProspectDraft ? 'info.light' : 'primary.light',
                  color: isProspectDraft ? 'info.dark' : 'primary.dark',
                  width: 36,
                  height: 36,
                  borderRadius: 1,
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
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography fontWeight={700} fontSize={13} noWrap>
                    {selectedTarget.name}
                  </Typography>
                  {isProspectDraft && (
                    <Chip
                      size="small"
                      color="info"
                      label="Prospek"
                      sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ fontSize: 9.5 }}>
                  {selectedTarget.address || '-'}
                </Typography>
              </Box>
            </Stack>
            <Alert severity="info" sx={{ mt: 0.75, py: 0.4 }} icon={<LockRoundedIcon fontSize="small" />}>
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
          size="small"
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
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: (qtyErr || discErr) ? 'error.main' : (calc.validQty > 0 ? 'primary.main' : 'divider'),
                }}
              >
                <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.75}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={700} fontSize={12} noWrap>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: 9.5 }}>
                        {p.sku} • {p.category} • {p.unit}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: 11 }}>
                        {formatRupiah(calc.uom.price)}{' '}
                        <Typography component="span" variant="caption" color="text.secondary" fontWeight={500} sx={{ fontSize: 9.5 }}>
                          / {calc.uom.value}
                        </Typography>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 9.5 }}>
                        Stok gudang: {p.stock} pcs
                        {calc.uom.pcsPerUnit > 1 ? ` • 1 ${calc.uom.value} = ${calc.uom.pcsPerUnit} pcs` : ''}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0, pt: 0.25 }}>
                      <IconButton
                        size="small"
                        disabled={!item || calc.validQty === 0}
                        onClick={() => handleQtyStep(p, -1)}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                      >
                        <RemoveRoundedIcon fontSize="small" />
                      </IconButton>
                      <TextField
                        size="small"
                        type="number"
                        value={displayQty}
                        error={Boolean(qtyErr)}
                        onChange={(e) => handleQtyInput(p, e.target.value)}
                        sx={{ width: 60 }}
                        inputProps={{ min: 0, style: { textAlign: 'center', fontWeight: 700, fontSize: 11 } }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleQtyStep(p, 1)}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
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
                    <Typography variant="caption" color="error" fontWeight={600} display="block" sx={{ mt: 0.6, fontSize: 10 }}>
                      {qtyErr}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
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
                            <PercentRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Stack>

                  {discErr && (
                    <Typography variant="caption" color="error" fontWeight={600} display="block" sx={{ mt: 0.4, fontSize: 10 }}>
                      {discErr}
                    </Typography>
                  )}

                  {item && !qtyErr && calc.validQty >= 1 && (
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        mt: 0.75,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: 9.5 }}>
                        Kuantitas dasar (baseQty): <b>{calc.baseQty} pcs</b>
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        {calc.validDisc > 0 && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ textDecoration: 'line-through', mr: 0.5, fontSize: 9.5 }}
                          >
                            {formatRupiah(calc.gross)}
                          </Typography>
                        )}
                        <Typography component="span" variant="caption" fontWeight={800} color="primary.main" sx={{ fontSize: 10.5 }}>
                          {formatRupiah(calc.line)}
                        </Typography>
                      </Box>
                    </Stack>
                  )}

                  {overDisc && (
                    <Alert severity="warning" sx={{ mt: 0.75, py: 0.4 }} icon={<WarningAmberRoundedIcon fontSize="small" />}>
                      Diskon melebihi wewenang {QUOTE_DISCOUNT_LIMIT}% — dokumen akan menunggu{' '}
                      <b>persetujuan Supervisor</b>.
                    </Alert>
                  )}

                  {short && (
                    <Alert severity="warning" sx={{ mt: 0.75, py: 0.4 }} icon={<WarningAmberRoundedIcon fontSize="small" />}>
                      Estimasi stok gudang tidak mencukupi (dibutuhkan <b>{calc.baseQty} pcs</b>, tersedia <b>{p.stock} pcs</b>). Pesanan <b>tetap dapat diajukan</b> — peringatan lunak.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState message="Produk tidak ditemukan." />
        )}

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

  return null;
}
