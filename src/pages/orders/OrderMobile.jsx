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
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
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

const FILTERS = [
  { v: 'all', l: 'Semua' }, { v: 'submitted', l: 'Diajukan' }, { v: 'approved', l: 'Disetujui' },
  { v: 'processing', l: 'Diproses' }, { v: 'shipped', l: 'Dikirim' }, { v: 'completed', l: 'Selesai' },
  { v: 'rejected', l: 'Ditolak' }, { v: 'cancelled', l: 'Dibatalkan' },
];

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.6 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value}</Typography>
  </Stack>
);

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
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [detailId, setDetailId] = useState(null);

  /* ===== Derived data ===== */
  const outlet = (db.outlets || []).find((o) => o.id === draft?.outletId);
  const step = draft ? (draft.step === 'items' && !outlet ? 'outlet' : draft.step) : null;

  const products = (db.products || []).filter((p) => p.status === 'active');
  const prodFiltered = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });
  const outlets = (db.outlets || []).filter((o) => {
    const q = outletSearch.trim().toLowerCase();
    return o.status === 'active' && (!q || o.name.toLowerCase().includes(q) || (o.address || '').toLowerCase().includes(q));
  });

  const qtyOf = (pid) => draft?.items.find((i) => i.productId === pid)?.qty || 0;
  const itemCount = draft?.items.reduce((s, i) => s + i.qty, 0) || 0;
  const draftTotals = (() => {
    const subtotal = (draft?.items || []).reduce((s, i) => {
      const p = (db.products || []).find((x) => x.id === i.productId);
      return s + (p ? p.price * i.qty : 0);
    }, 0);
    const tax = Math.round(subtotal * TAX_RATE);
    return { subtotal, tax, total: subtotal + tax };
  })();

  const myOrders = (db.orders || []).filter((o) => o.salesId === user.salesId).slice().reverse();
  const orderList = filter === 'all' ? myOrders : myOrders.filter((o) => o.status === filter);
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';

  /* ===== Helpers ===== */
  const setQty = (productId, qty) => {
    const val = Math.max(0, Math.floor(Number(qty) || 0));
    setDraft((d) => {
      if (!d) return d;
      const items = d.items.filter((i) => i.productId !== productId);
      if (val > 0) items.push({ productId, qty: val });
      return { ...d, items };
    });
  };

  /* Nomor unik otomatis (#42) — ikut memhitung antrean offline agar tidak duplikat (#48) */
  const genOrderNo = () => {
    const t = todayISO();
    const count = (db.orders || []).filter((o) => o.date === t).length
      + (db.syncQueue || []).filter((x) => x.kind === 'order' && x.payload?.date === t).length;
    return `ORD-${t.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;
  };

  const submitOrder = () => {
    if (submitting || !draft?.items.length) return; /* anti-duplikat klik ganda (#48) */
    setSubmitting(true);

    const items = draft.items.map((i) => {
      const p = (db.products || []).find((x) => x.id === i.productId);
      return {
        productId: p.id, sku: p.sku, name: p.name, unit: p.unit, qty: i.qty,
        price: p.price, disc: 0, line: p.price * i.qty, pcsPerUnit: p.pcsPerUnit || 1,
      };
    });
    const order = {
      no: genOrderNo(), date: todayISO(), salesId: user.salesId, outletId: draft.outletId,
      items, subtotal: draftTotals.subtotal, taxRate: TAX_RATE, tax: draftTotals.tax,
      total: draftTotals.total, status: 'submitted', note: note.trim(), paid: false,
    };

    /* Mode luring (#48): simpan lokal → kirim ulang otomatis saat online, tanpa input ulang */
    if (!online) {
      enqueue('order', order);
      toast('Anda sedang offline. Order disimpan sementara di perangkat dan akan dikirim otomatis saat koneksi pulih — tanpa input ulang.', 'warning', 5500);
      setDraft(null); setNote(''); setSubmitting(false);
      return;
    }

    setTimeout(() => { /* simulasi latency API */
      const rec = insert('orders', order);

      /* Pengurangan stok gudang — dikonversi ke satuan dasar pcs (#47), nilai order asli tetap */
      mutate((d) => {
        order.items.forEach((it) => {
          const p = d.products.find((x) => x.id === it.productId);
          if (p) p.stock = Math.max(0, p.stock - it.qty * (p.pcsPerUnit || 1));
        });
      });

      /* Auto-complete tugas order terkait (BR-TASK-003) */
      completeTaskAuto(db, mutate, { outletId: draft.outletId, type: 'order', salesId: user.salesId });

      /* Notifikasi ke supervisor */
      const sales = (db.sales || []).find((s) => s.id === user.salesId);
      const spv = (db.supervisors || []).find((s) => s.id === sales?.supervisorId);
      const spvUser = (db.users || []).find((u) => u.email === spv?.email);
      if (spvUser) notify(spvUser.id, 'Order Baru Menunggu Approval', `${order.no} dari ${user.name} — ${formatRupiah(order.total)}.`);

      setSubmitting(false);
      setDraft(null); setNote('');
      setSuccessOrder(rec);
    }, 500);
  };

  /* ===================== VIEW: DAFTAR ORDER ===================== */
  if (!step) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Entry Order</Typography>
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
          <Card key={o.id} onClick={() => setDetailId(o.id)} sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontFamily="monospace" fontWeight={700} fontSize={14}>{o.no}</Typography>
                <StatusChip kind="order" status={o.status} />
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block">
                {outletName(o.outletId)} • {o.items.length} produk • {o.date}
              </Typography>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Total</Typography>
                <Typography variant="body2" fontWeight={700}>{formatRupiah(o.total)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        )) : <EmptyState message="Belum ada pesanan pada filter ini." />}

        <OrderDetailDialog open={!!detailId} orderId={detailId} onClose={() => setDetailId(null)} />

        {/* Dialog sukses (#49: teruskan draft ke Quotation) */}
        <Dialog open={!!successOrder} onClose={() => setSuccessOrder(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Pesanan Tersimpan</DialogTitle>
          <DialogContent dividers>
            <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
              <CheckCircleRoundedIcon color="success" sx={{ fontSize: 46 }} />
              <Typography fontFamily="monospace" fontWeight={800} fontSize={20}>{successOrder?.no}</Typography>
              <StatusChip kind="order" status="submitted" />
              <Typography variant="body2">Total: <b>{formatRupiah(successOrder?.total || 0)}</b></Typography>
              <Typography variant="caption" color="text.secondary" align="center">
                Status <b>Diajukan</b> — menunggu persetujuan Supervisor. Draft bukti pesanan dapat
                diteruskan ke Modul Quotation (kriteria #49).
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

  /* ===================== VIEW: PILIH OUTLET ===================== */
  if (step === 'outlet') {
    return (
      <Stack spacing={1.5}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => setDraft(null)} sx={{ alignSelf: 'flex-start' }}>
          Batal
        </Button>
        <Card>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'center' }}>
            <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}><StorefrontRoundedIcon /></Avatar>
            <Box>
              <Typography fontWeight={700} fontSize={15}>Pilih Outlet Kunjungan</Typography>
              <Typography variant="caption" color="text.secondary">Data outlet ditarik real-time dari Master Data.</Typography>
            </Box>
          </CardContent>
        </Card>
        <TextField label="Cari outlet…" value={outletSearch} onChange={(e) => setOutletSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
        {outlets.map((o) => (
          <Card key={o.id} onClick={() => setDraft({ step: 'items', outletId: o.id, items: [] })}
            sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40 }}>
                <StorefrontRoundedIcon fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={14} noWrap>{o.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">{o.address}</Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  /* ===================== VIEW: KATALOG PRODUK ===================== */
  if (step === 'items') {
    return (
      <Stack spacing={1.5} sx={{ pb: 5 }}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => setDraft({ step: 'outlet', items: [] })} sx={{ alignSelf: 'flex-start' }}>
          Ganti Outlet
        </Button>

        <Card>
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography fontWeight={700} fontSize={15}>{outlet.name}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">{outlet.address}</Typography>
            <Alert severity="info" sx={{ mt: 1, py: 0.5 }} icon={<LockRoundedIcon fontSize="small" />}>
              Harga satuan <b>terkunci</b> — ditarik otomatis dari Master Data, tidak dapat diubah Sales (#39).
            </Alert>
          </CardContent>
        </Card>

        <TextField label="Cari produk / SKU…" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />

        {prodFiltered.map((p) => {
          const qty = qtyOf(p.id);
          const baseQty = qty * (p.pcsPerUnit || 1);
          const short = qty > 0 && baseQty > p.stock; /* soft warning #41 */
          return (
            <Card key={p.id}>
              <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>{p.sku} • {p.category} • {p.unit}</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatRupiah(p.price)} <span style={{ color: '#64748b', fontWeight: 400 }}>/ {p.unit}</span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Stok gudang: {p.stock} pcs{p.pcsPerUnit > 1 ? ` (1 ${p.unit} = ${p.pcsPerUnit} pcs)` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <IconButton size="small" onClick={() => setQty(p.id, qty - 1)}><RemoveRoundedIcon fontSize="small" /></IconButton>
                    <TextField type="number" value={qty} onChange={(e) => setQty(p.id, e.target.value)} sx={{ width: 72 }}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }} />
                    <IconButton size="small" onClick={() => setQty(p.id, qty + 1)}><AddRoundedIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
                {short && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<WarningAmberRoundedIcon fontSize="small" />}>
                    Estimasi stok gudang tidak mencukupi (tersedia {p.stock} pcs). Pesanan <b>tetap dapat diajukan</b> — peringatan lunak (#41).
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}

        {itemCount > 0 && (
          <Box onClick={() => setDraft((d) => ({ ...d, step: 'review' }))} sx={{
            position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: 398, bgcolor: 'primary.main', color: '#fff',
            borderRadius: 2, px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', cursor: 'pointer', zIndex: 1150, boxShadow: 4,
          }}>
            <Box>
              <Typography fontWeight={800} fontSize={14}>{itemCount} item</Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>{formatRupiah(draftTotals.total)}</Typography>
            </Box>
            <Typography fontWeight={700} fontSize={14}>Lanjut ke Review →</Typography>
          </Box>
        )}
      </Stack>
    );
  }

  /* ===================== VIEW: REVIEW & SUBMIT ===================== */
  return (
    <Stack spacing={1.5}>
      <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />}
        onClick={() => setDraft((d) => ({ ...d, step: 'items' }))} sx={{ alignSelf: 'flex-start' }}>
        Kembali
      </Button>

      <Card>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <Typography fontWeight={700} fontSize={15}>Review Pesanan</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {outlet.name} • {outlet.address}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produk</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Jumlah</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.items.map((i) => {
                const p = (db.products || []).find((x) => x.id === i.productId);
                return (
                  <TableRow key={i.productId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatRupiah(p.price)} / {p.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{i.qty} {p.unit}</Typography>
                      {p.pcsPerUnit > 1 && (
                        <Typography variant="caption" color="text.secondary" display="block">= {i.qty * p.pcsPerUnit} pcs</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700}>{formatRupiah(p.price * i.qty)}</Typography></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Stack spacing={0.5} sx={{ mt: 1.5 }}>
            <KV label="Subtotal" value={formatRupiah(draftTotals.subtotal)} />
            <KV label={`PPN ${Math.round(TAX_RATE * 100)}%`} value={formatRupiah(draftTotals.tax)} />
            <KV label="TOTAL" value={<Typography color="primary" fontWeight={800}>{formatRupiah(draftTotals.total)}</Typography>} />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
          <TextField label="Catatan (opsional, maks 255)" multiline minRows={2} value={note}
            onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 255 }} />
        </CardContent>
      </Card>

      <Button variant="contained" size="large" disabled={submitting || !itemCount} onClick={submitOrder}>
        {submitting ? 'Menyimpan…' : 'Simpan & Ajukan Pesanan'}
      </Button>
      <Typography variant="caption" color="text.secondary" align="center">
        Nomor order unik digenerate otomatis oleh sistem (#42). Tombol terkunci saat penyimpanan — mencegah order ganda (#48).
      </Typography>
    </Stack>
  );
}