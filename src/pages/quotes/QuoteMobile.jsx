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
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import QuoteDetailDialog from '../../components/quotes/QuoteDetailDialog';
import EmptyState from '../../components/ui/EmptyState';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, formatRupiah, TAX_RATE, QUOTE_DISCOUNT_LIMIT } from '../../utils/helpers';
import { expireQuotes } from '../../utils/quoteUtils';

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
  { v: 'all', l: 'Semua' }, { v: 'draft', l: 'Draft' },
  { v: 'pending_approval', l: 'Menunggu Approval' }, { v: 'sent', l: 'Terkirim' },
  { v: 'approved', l: 'Disetujui' }, { v: 'rejected', l: 'Ditolak' },
  { v: 'expired', l: 'Kadaluarsa' }, { v: 'converted', l: 'Jadi Order' },
];

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.6 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

/* ===== Header langkah (pola sama dengan OrderMobile) ===== */
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
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>Langkah {step + 1} dari 3</Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

/* ===== Bar aksi bawah (sticky) ===== */
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
        <Typography variant="caption" sx={{ opacity: 0.9 }}>{formatRupiah(total)}</Typography>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography fontWeight={700} fontSize={14}>{loading ? 'Menyimpan…' : actionLabel}</Typography>
        {!loading && <ArrowForwardRoundedIcon fontSize="small" />}
      </Stack>
    </Box>
  );
}

export default function QuoteMobile() {
  const { user } = useAuth();
  const { db, insert, mutate } = useDb();
  const { notify } = useSync();
  const { toast } = useToast();
  const location = useLocation();
  const today = todayISO();

  /* ===== SEMUA HOOKS DI PALING ATAS ===== */
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState(() => {
    /* #49: diteruskan dari Order — outlet & item ter-prefill, diskon diatur ulang */
    const fromId = location.state?.fromOrder;
    if (fromId) {
      const ord = (db.orders || []).find((o) => o.id === fromId);
      if (ord) {
        return {
          step: 'items', outletId: ord.outletId, fromOrderNo: ord.no,
          items: ord.items.map((it) => ({ productId: it.productId, qty: it.qty, disc: 0 })),
        };
      }
    }
    return null;
  });
  const [outletSearch, setOutletSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [validUntil, setValidUntil] = useState(() => addDays(todayISO(), 14)); /* #57: default 14 hari */
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successQuote, setSuccessQuote] = useState(null);
  const [detailId, setDetailId] = useState(null);

  /* #54: auto-expire saat halaman dibuka (sekali) */
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireQuotes(db, mutate);
    if (n) toast(`${n} quotation kedaluwarsa otomatis ditandai Kadaluarsa (#54).`, 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Derived ===== */
  const outlet = (db.outlets || []).find((o) => o.id === draft?.outletId);
  const step = draft
    ? (((draft.step === 'items' || draft.step === 'review') && !outlet) ? 'outlet' : draft.step)
    : null;

  const outlets = (db.outlets || []).filter((o) => {
    const q = outletSearch.trim().toLowerCase();
    return o.status === 'active' && (!q || o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q));
  });
  const products = (db.products || []).filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return p.status === 'active' && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  });

  const myQuotes = (db.quotations || []).filter((q) => q.salesId === user.salesId).slice().reverse();
  const quoteList = filter === 'all' ? myQuotes : myQuotes.filter((q) => q.status === filter);
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';

  const qtyOf = (pid) => draft?.items.find((i) => i.productId === pid)?.qty || 0;
  const discOf = (pid) => draft?.items.find((i) => i.productId === pid)?.disc || 0;
  const itemCount = draft?.items.reduce((s, i) => s + i.qty, 0) || 0;
  const draftMaxDisc = draft?.items.length ? Math.max(...draft.items.map((i) => i.disc || 0)) : 0;
  const totals = (() => {
    let gross = 0, after = 0;
    (draft?.items || []).forEach((i) => {
      const p = (db.products || []).find((x) => x.id === i.productId);
      if (!p) return;
      const g = p.price * i.qty;
      gross += g;
      after += Math.round(g * (1 - (i.disc || 0) / 100));
    });
    const tax = Math.round(after * TAX_RATE);
    return { subtotal: gross, discTotal: gross - after, after, tax, total: after + tax };
  })();

  /* ===== Helpers ===== */
  const setQty = (productId, qty) => {
    const val = Math.max(0, Math.floor(Number(qty) || 0));
    setDraft((d) => {
      if (!d) return d;
      const items = d.items.filter((i) => i.productId !== productId);
      if (val > 0) items.push({ productId, qty: val, disc: discOf(productId) });
      return { ...d, items };
    });
  };

  const setDisc = (productId, disc) => {
    let val = Math.floor(Number(disc));
    if (Number.isNaN(val) || val < 0) val = 0;
    if (val > 100) val = 100; /* diskon 0–100% */
    setDraft((d) => d && ({ ...d, items: d.items.map((i) => (i.productId === productId ? { ...i, disc: val } : i)) }));
  };

  const resetDraft = () => {
    setDraft(null); setNote(''); setValidUntil(addDays(todayISO(), 14));
  };

  const genQuoteNo = () => {
    const t = todayISO();
    const count = (db.quotations || []).filter((q) => q.date === t).length;
    return `QT-${t.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;
  };
  const genVerCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  const submitQuote = () => {
    if (submitting || !draft?.items.length || !validUntil) return;
    setSubmitting(true);
    setTimeout(() => { /* simulasi latency API */
      /* Snapshot harga master saat disimpan — price freeze (#55/#61) */
      const items = draft.items.map((i) => {
        const p = (db.products || []).find((x) => x.id === i.productId);
        return {
          productId: p.id, sku: p.sku, name: p.name, unit: p.unit, qty: i.qty,
          price: p.price, disc: i.disc || 0,
          line: Math.round(p.price * i.qty * (1 - (i.disc || 0) / 100)),
          pcsPerUnit: p.pcsPerUnit || 1,
        };
      });
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const after = items.reduce((s, i) => s + i.line, 0);
      const discTotal = subtotal - after;
      const tax = Math.round(after * TAX_RATE);
      const maxDisc = Math.max(...items.map((i) => i.disc || 0));
      const status = maxDisc > QUOTE_DISCOUNT_LIMIT ? 'pending_approval' : 'draft'; /* #53 */

      const rec = insert('quotations', {
        no: genQuoteNo(), date: todayISO(), salesId: user.salesId, outletId: draft.outletId,
        items, subtotal, discTotal, totalAfterDisc: after, taxRate: TAX_RATE, tax,
        total: after + tax, status, validUntil, verCode: genVerCode(), note: note.trim(),
      });

      /* #53: diskon melebihi wewenang → notifikasi Supervisor */
      if (status === 'pending_approval') {
        const sales = (db.sales || []).find((s) => s.id === user.salesId);
        const spv = (db.supervisors || []).find((s) => s.id === sales?.supervisorId);
        const spvUser = (db.users || []).find((u) => u.email === spv?.email);
        if (spvUser) notify(spvUser.id, 'Approval Diskon Quotation',
          `${rec.no} — diskon ${maxDisc}% melebihi wewenang ${QUOTE_DISCOUNT_LIMIT}%, menunggu keputusan Anda (#53).`);
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
          <Typography variant="h6" fontWeight={800}>Quotation</Typography>
          <Button variant="contained" size="small" startIcon={<AddRoundedIcon />}
            onClick={() => setDraft({ step: 'outlet', items: [] })}>
            Buat Baru
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

        {quoteList.length ? quoteList.map((q) => {
          const md = q.items.length ? Math.max(...q.items.map((i) => i.disc || 0)) : 0;
          return (
            <Card key={q.id} elevation={0} onClick={() => setDetailId(q.id)}
              sx={{ cursor: 'pointer', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontFamily="monospace" fontWeight={700} fontSize={14}>{q.no}</Typography>
                  <StatusChip kind="quote" status={q.status} />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  {outletName(q.outletId)} • berlaku s.d {q.validUntil}
                  {md > 0 ? ` • disc maks ${md}%` : ''}
                </Typography>
                <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                  <Typography variant="body2" fontWeight={700}>{formatRupiah(q.total)}</Typography>
                </Stack>
              </CardContent>
            </Card>
          );
        }) : <EmptyState message="Belum ada quotation pada filter ini." />}

        <QuoteDetailDialog open={!!detailId} quoteId={detailId} onClose={() => setDetailId(null)} salesActions />

        {/* Dialog sukses */}
        <Dialog open={!!successQuote} onClose={() => setSuccessQuote(null)} maxWidth="xs" fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle>Quotation Tersimpan</DialogTitle>
          <DialogContent dividers>
            <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mb: 0.5 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: 30, color: 'common.white' }} />
              </Avatar>
              <Typography fontFamily="monospace" fontWeight={800} fontSize={20}>{successQuote?.no}</Typography>
              <StatusChip kind="quote" status={successQuote?.status} />
              <Typography variant="body2">Total: <b>{formatRupiah(successQuote?.total || 0)}</b></Typography>
              <Typography variant="caption" color="text.secondary" align="center">
                {successQuote?.status === 'pending_approval'
                  ? <>Diskon melebihi wewenang — menunggu <b>approval Supervisor</b> sebelum dapat dikirim/diunduh (#53).</>
                  : <>Berlaku s.d {successQuote?.validUntil}. Buka detail untuk mengirim / mencetak PDF dan berbagi WhatsApp (#56/#58).</>}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuccessQuote(null)}>Tutup</Button>
            <Button variant="contained" startIcon={<DescriptionRoundedIcon />}
              onClick={() => { const id = successQuote?.id; setSuccessQuote(null); setDetailId(id); }}>
              Lihat Detail
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  /* ===================== LANGKAH 1: PILIH OUTLET ===================== */
  if (step === 'outlet') {
    return (
      <Stack spacing={1.5}>
        <StepHeader title="Pilih Outlet" onBack={resetDraft} step={0} />
        <TextField label="Cari outlet…" value={outletSearch} onChange={(e) => setOutletSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
        {outlets.length ? outlets.map((o) => (
          <Card key={o.id} elevation={0} onClick={() => setDraft({ step: 'items', outletId: o.id, items: [] })}
            sx={{ cursor: 'pointer', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40, borderRadius: 2 }}>
                <StorefrontRoundedIcon fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={14} noWrap>{o.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{o.address}</Typography>
              </Box>
            </CardContent>
          </Card>
        )) : <EmptyState message="Outlet tidak ditemukan." />}
      </Stack>
    );
  }

  /* ===================== LANGKAH 2: PRODUK & DISKON ===================== */
  if (step === 'items') {
    return (
      <Stack spacing={1.5} sx={{ pb: 7 }}>
        <StepHeader title="Pilih Produk & Diskon" onBack={() => setDraft({ step: 'outlet', items: [] })} step={1} />

        {draft.fromOrderNo && (
          <Alert severity="info" icon={<DescriptionRoundedIcon fontSize="small" />}>
            Draft diteruskan dari Order <b>{draft.fromOrderNo}</b> (#49) — periksa kembali qty &amp; atur diskon sebelum menyimpan.
          </Alert>
        )}

        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
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
              Harga <b>terkunci dari Master Data</b> — snapshot saat disimpan (price freeze #55), hanya diskon yang bisa diatur (#61).
            </Alert>
          </CardContent>
        </Card>

        <TextField label="Cari produk / SKU…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />

        {products.length ? products.map((p) => {
          const qty = qtyOf(p.id);
          const disc = discOf(p.id);
          return (
            <Card key={p.id} elevation={0}
              sx={{ borderRadius: 3, border: '1px solid', borderColor: qty > 0 ? 'primary.main' : 'divider' }}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>{p.sku} • {p.category} • {p.unit}</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatRupiah(p.price)} <span style={{ color: '#64748b', fontWeight: 400 }}>/ {p.unit}</span>
                    </Typography>
                    {disc > 0 && (
                      <Typography variant="caption" color="success.main" fontWeight={700} display="block">
                        Nego: {formatRupiah(Math.round(p.price * (1 - disc / 100)))} / {p.unit}
                      </Typography>
                    )}
                  </Box>
                  <Stack spacing={0.75} alignItems="flex-end" sx={{ flexShrink: 0 }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton size="small" disabled={qty === 0} onClick={() => setQty(p.id, qty - 1)}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                        <RemoveRoundedIcon fontSize="small" />
                      </IconButton>
                      <TextField size="small" type="number" value={qty} onChange={(e) => setQty(p.id, e.target.value)}
                        sx={{ width: 64 }} inputProps={{ min: 0, style: { textAlign: 'center' } }} />
                      <IconButton size="small" onClick={() => setQty(p.id, qty + 1)}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                        <AddRoundedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    {qty > 0 && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">Disc</Typography>
                        <TextField size="small" type="number" value={disc} onChange={(e) => setDisc(p.id, e.target.value)}
                          sx={{ width: 76 }} inputProps={{ min: 0, max: 100, style: { textAlign: 'center' } }}
                          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
                      </Stack>
                    )}
                  </Stack>
                </Stack>
                {disc > QUOTE_DISCOUNT_LIMIT && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<WarningAmberRoundedIcon fontSize="small" />}>
                    Diskon melebihi wewenang {QUOTE_DISCOUNT_LIMIT}% — dokumen akan menunggu <b>approval Supervisor</b> (#53).
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        }) : <EmptyState message="Produk tidak ditemukan." />}

        {itemCount > 0 && (
          <BottomBar itemCount={itemCount} total={totals.total} actionLabel="Lanjut ke Review"
            onClick={() => setDraft((d) => ({ ...d, step: 'review' }))} />
        )}
      </Stack>
    );
  }

  /* ===================== LANGKAH 3: REVIEW & SIMPAN ===================== */
  return (
    <Stack spacing={1.5} sx={{ pb: 7 }}>
      <StepHeader title="Review Quotation" onBack={() => setDraft((d) => ({ ...d, step: 'items' }))} step={2} />

      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Typography fontWeight={700} fontSize={15}>{outlet.name}</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{outlet.address}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produk</TableCell><TableCell align="right">Qty</TableCell>
                <TableCell align="right">Harga</TableCell><TableCell align="center">Disc</TableCell>
                <TableCell align="right">Jumlah</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.items.map((i) => {
                const p = (db.products || []).find((x) => x.id === i.productId);
                const line = Math.round(p.price * i.qty * (1 - (i.disc || 0) / 100));
                return (
                  <TableRow key={i.productId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatRupiah(p.price)} / {p.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">{i.qty} {p.unit}</TableCell>
                    <TableCell align="right">{formatRupiah(p.price)}</TableCell>
                    <TableCell align="center">{i.disc || 0}%</TableCell>
                    <TableCell align="right"><b>{formatRupiah(line)}</b></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Stack spacing={0.5} sx={{ mt: 1.5 }}>
            <KV label="Subtotal" value={formatRupiah(totals.subtotal)} />
            <KV label="Diskon" value={`− ${formatRupiah(totals.discTotal)}`} />
            <KV label={`PPN ${Math.round(TAX_RATE * 100)}%`} value={formatRupiah(totals.tax)} />
            <KV label="TOTAL" value={<Typography color="primary" fontWeight={800}>{formatRupiah(totals.total)}</Typography>} />
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Stack spacing={2}>
            <TextField type="date" label="Berlaku Hingga *" value={validUntil}
              InputLabelProps={{ shrink: true }}
              onChange={(e) => setValidUntil(e.target.value)}
              inputProps={{ min: addDays(today, 1), max: addDays(today, 30) }}
              helperText={`Default 14 hari, maksimal 30 hari dari hari ini (#57).`}
            />
            <TextField label="Catatan (opsional, maks 255)" multiline minRows={2} value={note}
              onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 255 }} />
          </Stack>
        </CardContent>
      </Card>

      {draftMaxDisc > QUOTE_DISCOUNT_LIMIT ? (
        <Alert severity="warning" icon={<WarningAmberRoundedIcon fontSize="small" />}>
          Diskon maks <b>{draftMaxDisc}%</b> melebihi wewenang {QUOTE_DISCOUNT_LIMIT}% — quotation akan berstatus
          <b> Menunggu Approval Supervisor</b> dan tidak dapat dikirim/diunduh sebelum disetujui (#53).
        </Alert>
      ) : (
        <Alert severity="info" icon={<LockRoundedIcon fontSize="small" />}>
          Harga merupakan <b>snapshot</b> saat dokumen disimpan (price freeze #55) — perubahan Master Data
          tidak mengubah dokumen (#61).
        </Alert>
      )}

      <BottomBar itemCount={itemCount} total={totals.total} actionLabel="Simpan Quotation"
        onClick={submitQuote} disabled={!itemCount || !validUntil} loading={submitting} />
    </Stack>
  );
}