import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import { nowStamp, formatRupiah, todayISO } from '../../utils/helpers';
import { openInvoicePdf, shareInvoiceWhatsApp } from '../../utils/invoicePdf';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';

const KV = ({ label, value }) => (
  <Stack sx={{ py: 0.5 }}>
    <Typography variant="caption" color="text.secondary"
      sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10.5, mb: 0.4, display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}
      sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.25, py: 0.75, overflowWrap: 'anywhere', display: 'block' }}>
      {value}
    </Typography>
  </Stack>
);

/* ============================================================
   Billing / Penagihan — alur 3 langkah tim:
   1. Invoice terbit otomatis saat Supervisor menyetujui order.
   2. Sistem memantau batas waktu (jatuh tempo) + progress cicilan.
   3. Finance memverifikasi & memperbarui status Lunas / Belum / Jatuh Tempo.
   Monitoring per metode:
   - Termin: jatuh tempo + sisa tagihan (pembayaran parsial).
   - Cicilan: jadwal angsuran — Finance bayar per angsuran.
   - Konsinyasi: menunggu stock-take (indikator).
============================================================ */
export default function Billing() {
  const { user } = useAuth();
  const { db, update } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();
  const isFinance = user.role === 'finance';

  const [payId, setPayId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [method, setMethod] = useState('Transfer Bank');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [q, setQ] = useState('');

  const invoices = db.invoices || [];
  const unpaid = invoices.filter((i) => i.status !== 'lunas' && i.status !== 'dibatalkan');
  const paid = invoices.filter((i) => i.status === 'lunas');
  const overdueList = invoices.filter((i) =>
    i.status === 'belum_lunas' && i.jatuhTempo && i.jatuhTempo < todayISO());

  const payInvoice = invoices.find((i) => i.id === payId);
  const detailInvoice = invoices.find((i) => i.id === detailId);
  const mismatch = payInvoice && Number(amount) !== (payInvoice.total - paidOf(payInvoice));

  useEffect(() => {
    if (payId) {
      const i = invoices.find((x) => x.id === payId);
      setAmount(i ? String(i.total - paidOf(i)) : '');
      setMethod(i && i.metodePembayaran === 'tunai' ? 'Tunai' : 'Transfer Bank');
      setErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payId]);

  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';

  /* ===== Progress & status per metode ===== */
  function paidOf(i) {
    if (i.metodePembayaran === 'cicilan' && i.installments) {
      return i.installments.filter((a) => a.status === 'lunas').reduce((s, a) => s + a.nominal, 0);
    }
    return (i.payments || []).reduce((s, p) => s + p.nominal, 0);
  }

  function progressLabel(i) {
    if (i.metodePembayaran === 'konsinyasi') return 'Menunggu stock-take';
    if (i.metodePembayaran === 'cicilan' && i.installments) {
      const done = i.installments.filter((a) => a.status === 'lunas').length;
      return `${done}/${i.installments.length} angsuran`;
    }
    const paid = paidOf(i);
    if (paid === 0) return 'Belum dibayar';
    return `${formatRupiah(paid)} / ${formatRupiah(i.total)}`;
  }

  const syaratLabel = (i) => {
    switch (i?.metodePembayaran) {
      case 'transfer': {
        const b = (db.banks || []).find((x) => x.id === i.bankId);
        return b ? `Transfer — ${b.nama}` : 'Transfer Bank';
      }
      case 'termin': return `Termin ${i.terminHari || 14} hari`;
      case 'cicilan': return 'Cicilan';
      case 'konsinyasi': return 'Konsinyasi (bayar sesuai terjual)';
      default: return 'Tunai (COD)';
    }
  };

  const overdue = (i) => i.status === 'belum_lunas' && i.jatuhTempo && i.jatuhTempo < todayISO();

  const filtered = invoices.filter((i) =>
    (statusFilter === 'all' ||
      (statusFilter === 'lunas' && i.status === 'lunas') ||
      (statusFilter === 'belum' && i.status === 'belum_lunas') ||
      (statusFilter === 'overdue' && overdue(i)) ||
      (statusFilter === 'dibatalkan' && i.status === 'dibatalkan')) &&
    (!dateFilter || i.date === dateFilter) &&
    (!q.trim() || i.no.toLowerCase().includes(q.trim().toLowerCase()) ||
      String(i.orderNo || '').toLowerCase().includes(q.trim().toLowerCase()) ||
      outletName(i.outletId).toLowerCase().includes(q.trim().toLowerCase()))
  );

  /* ===== Aksi: catat pembayaran (non-cicilan) ===== */
  const submitPay = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr('Nominal diterima wajib diisi.'); return; }
    const inv = payInvoice;
    const payments = [...(inv.payments || []), { ts: nowStamp(), nominal: amt, metode: method, keterangan: 'Pembayaran' }];
    const totalPaid = payments.reduce((s, p) => s + p.nominal, 0);
    const lunas = totalPaid >= inv.total;
    update('invoices', inv.id, { payments, status: lunas ? 'lunas' : 'belum_lunas', paidAt: lunas ? nowStamp() : null });
    if (lunas) update('orders', inv.orderId, { paid: true, paidAt: nowStamp(), paidMethod: method });
    const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === inv.salesId);
    if (salesUser) notify(salesUser.id, 'Pembayaran Diterima',
      `Invoice ${inv.no}: ${formatRupiah(amt)} diterima (${method})${lunas ? ' — LUNAS' : ` — sisa ${formatRupiah(inv.total - totalPaid)}`}.`);
    toast(lunas ? `Pembayaran tercatat — invoice ${inv.no} LUNAS.` : `Pembayaran parsial tercatat — sisa ${formatRupiah(inv.total - totalPaid)}.`, lunas ? 'success' : 'info');
    setPayId(null);
  };

  /* ===== Aksi: bayar angsuran (cicilan) ===== */
  const payInstallment = (inv, ke) => {
    const installments = (inv.installments || []).map((a) =>
      a.ke === ke ? { ...a, status: 'lunas', paidAt: nowStamp(), paidMethod: 'Transfer Bank' } : a);
    const payments = [...(inv.payments || []), { ts: nowStamp(), nominal: installments.find(a => a.ke === ke).nominal, metode: 'Transfer Bank', keterangan: `Angsuran ${ke}` }];
    const allPaid = installments.every((a) => a.status === 'lunas');
    update('invoices', inv.id, { installments, payments, status: allPaid ? 'lunas' : 'belum_lunas' });
    if (allPaid) update('orders', inv.orderId, { paid: true, paidAt: nowStamp() });
    const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === inv.salesId);
    if (salesUser) notify(salesUser.id, 'Angsuran Diterima',
      `Invoice ${inv.no}: angsuran ${ke} lunas${allPaid ? ' — SEMUA ANGSURAN LUNAS' : ''}.`);
    toast(allPaid ? `Angsuran ${ke} lunas — invoice ${inv.no} berstatus LUNAS.` : `Angsuran ${ke} lunas — sisa angsuran: ${installments.filter(a => a.status !== 'lunas').length}.`, 'success');
  };

  return (
    <Box>
      <PageHeader
        title="Billing / Penagihan"
        subtitle={`Invoice terbit otomatis saat order disetujui. ${isFinance ? 'Anda dapat mencatat pembayaran & memantau progress.' : 'Anda hanya dapat melihat.'}`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<ReceiptLongRoundedIcon />} value={invoices.length} label="Total invoice" />
        <StatCard icon={<ScheduleRoundedIcon />} value={formatRupiah(unpaid.reduce((s, i) => s + (i.total - paidOf(i)), 0))} label="Sisa tagihan" color="warning" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={overdueList.length} label="Jatuh tempo" color="error" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(paid.reduce((s, i) => s + paidOf(i), 0))} label="Sudah diterima" color="success" />
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
            <FilterListRoundedIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
          </Stack>
          <TextField size="small" type="date" label="Tanggal" value={dateFilter}
            InputLabelProps={{ shrink: true }} onChange={(e) => setDateFilter(e.target.value)} sx={{ width: 170 }} />
          <TextField size="small" select label="Status" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 170 }}>
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="belum">Belum Lunas</MenuItem>
            <MenuItem value="overdue">Jatuh Tempo</MenuItem>
            <MenuItem value="lunas">Lunas</MenuItem>
            <MenuItem value="dibatalkan">Dibatalkan</MenuItem>
          </TextField>
          <TextField size="small" label="Cari no. invoice / order / outlet…" value={q}
            onChange={(e) => setQ(e.target.value)} sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }} />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {filtered.length} dari {invoices.length} invoice
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No. Invoice</TableCell><TableCell>Tanggal</TableCell><TableCell>Outlet</TableCell>
              <TableCell>Sales</TableCell><TableCell align="right">Total</TableCell>
              <TableCell>Syarat</TableCell><TableCell>Dibayar</TableCell><TableCell>Status</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.slice().reverse().map((i) => (
              <TableRow key={i.id} onClick={() => setDetailId(i.id)}
                sx={{ cursor: 'pointer', opacity: i.status === 'dibatalkan' ? 0.55 : 1 }}>
                <TableCell>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }} fontWeight={700}>{i.no}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{i.orderNo}</Typography>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{i.date}</TableCell>
                <TableCell>{outletName(i.outletId)}</TableCell>
                <TableCell>{salesName(i.salesId)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><b>{formatRupiah(i.total)}</b></TableCell>
                <TableCell>{syaratLabel(i)}</TableCell>
                <TableCell>
                  <Typography variant="caption" fontWeight={700} color={i.status === 'lunas' ? 'success.main' : paidOf(i) > 0 ? 'info.main' : 'text.secondary'}>
                    {progressLabel(i)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {i.status === 'lunas' ? (
                      <StatusChip kind="paid" status="yes" />
                    ) : i.status === 'dibatalkan' ? (
                      <Chip size="small" variant="outlined" label="Dibatalkan" />
                    ) : paidOf(i) > 0 ? (
                      <Chip size="small" color="warning" label="Belum Lunas" />
                    ) : (
                      <StatusChip kind="paid" status="no" />
                    )}
                    {overdue(i) && <Chip size="small" color="error" label={`Jatuh Tempo ${i.jatuhTempo}`} />}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {i.status === 'belum_lunas' && isFinance ? (
                    <Button size="small" variant="contained" color="success" onClick={() => setPayId(i.id)}>
                      {i.metodePembayaran === 'cicilan' ? 'Angsuran' : 'Payment'}
                    </Button>
                  ) : '—'}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={9}><EmptyState message="Belum ada invoice — terbit otomatis saat Supervisor menyetujui order." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ===== Dialog: catat pembayaran / bayar angsuran ===== */}
      <Dialog open={!!payId} onClose={() => setPayId(null)} maxWidth={payInvoice?.metodePembayaran === 'cicilan' ? 'sm' : 'xs'} fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle>Catat Pembayaran — {payInvoice?.no}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <KV label="Total Tagihan" value={formatRupiah(payInvoice?.total || 0)} />
          <KV label="Syarat (dari Quotation)" value={syaratLabel(payInvoice)} />
          <KV label="Order Sumber" value={payInvoice?.orderNo || '-'} />
          <KV label="Sudah Dibayar" value={formatRupiah(paidOf(payInvoice || {}))} />
          <KV label="Sisa Tagihan" value={formatRupiah((payInvoice?.total || 0) - paidOf(payInvoice || {}))} />

          {/* ===== CICILAN: daftar angsuran dengan tombol bayar per angsuran ===== */}
          {payInvoice?.metodePembayaran === 'cicilan' && payInvoice.installments ? (
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>Jadwal Angsuran</Typography>
              {payInvoice.installments.map((a) => (
                <Card key={a.ke} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: a.status === 'lunas' ? 'success.main' : 'divider' }}>
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={700} fontSize={13}>Angsuran {a.ke}</Typography>
                        {a.status === 'lunas' ? (
                          <Chip size="small" color="success" icon={<CheckCircleRoundedIcon />} label={`Lunas${a.paidAt ? ` • ${a.paidMethod || ''}` : ''}`} />
                        ) : a.jatuhTempo < todayISO() ? (
                          <Chip size="small" color="error" label={`Jatuh Tempo ${a.jatuhTempo}`} />
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {formatRupiah(a.nominal)} • jatuh tempo {a.jatuhTempo}
                      </Typography>
                    </Box>
                    {a.status !== 'lunas' && isFinance && (
                      <Button size="small" variant="contained" color="success" onClick={() => payInstallment(payInvoice, a.ke)}>
                        Bayar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Metode Penerimaan" value={method} onChange={(e) => setMethod(e.target.value)}
              helperText="Bagaimana uang diterima — mengikuti syarat deal secara default.">
              <MenuItem value="Transfer Bank">Transfer Bank</MenuItem>
              <MenuItem value="Tunai">Tunai</MenuItem>
            </TextField>
            <TextField type="number" label="Nominal Diterima (Rp)" value={amount}
              onChange={(e) => { setAmount(e.target.value); setErr(''); }}
              error={!!err} helperText={err || ' '} inputProps={{ min: 0 }} />
            {mismatch && (
              <Alert severity="warning">
                Nominal berbeda dengan sisa tagihan — akan tercatat sebagai pembayaran parsial.
              </Alert>
            )}
            {(payInvoice?.payments || []).length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>Riwayat Pembayaran</Typography>
                {(payInvoice.payments || []).slice().reverse().map((p, idx) => (
                  <Stack key={idx} direction="row" justifyContent="space-between"
                    sx={{ py: 0.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">{p.ts}</Typography>
                    <Typography variant="caption">{p.keterangan || 'Pembayaran'} — {p.metode}</Typography>
                    <Typography variant="caption" fontWeight={700}>{formatRupiah(p.nominal)}</Typography>
                  </Stack>
                ))}
              </Box>
            )}
          </Stack>
          )}
        </DialogContent>
        {payInvoice?.metodePembayaran !== 'cicilan' && (
          <DialogActions>
            <Button onClick={() => setPayId(null)}>Batal</Button>
            <Button variant="contained" color="success" onClick={submitPay}>Simpan Pembayaran</Button>
          </DialogActions>
        )}
        {payInvoice?.metodePembayaran === 'cicilan' && (
          <DialogActions>
            <Button onClick={() => setPayId(null)}>Tutup</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ===== Dialog Detail Invoice — klik baris untuk membuka ===== */}
      <Dialog open={!!detailId} onClose={() => setDetailId(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
          Detail Invoice — {detailInvoice?.no}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          {detailInvoice && (
            <>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                {detailInvoice.status === 'lunas' ? (
                  <StatusChip kind="paid" status="yes" />
                ) : detailInvoice.status === 'dibatalkan' ? (
                  <Chip size="small" variant="outlined" label="Dibatalkan" />
                ) : paidOf(detailInvoice) > 0 ? (
                  <Chip size="small" color="warning" label="Belum Lunas" />
                ) : (
                  <StatusChip kind="paid" status="no" />
                )}
                {overdue(detailInvoice) && <Chip size="small" color="error" label={`Jatuh Tempo ${detailInvoice.jatuhTempo}`} />}
              </Stack>
              <Stack spacing={0.5}>
                <KV label="No. Invoice" value={detailInvoice.no} />
                <KV label="Order Sumber" value={detailInvoice.orderNo || '-'} />
                <KV label="Tanggal Terbit" value={detailInvoice.date} />
                <KV label="Outlet" value={outletName(detailInvoice.outletId)} />
                <KV label="Sales" value={salesName(detailInvoice.salesId)} />
                <KV label="Syarat (dari Quotation)" value={syaratLabel(detailInvoice)} />
                <KV label="Batas Waktu" value={detailInvoice.jatuhTempo || 'Mengikuti stock-take / per angsuran'} />
                <KV label="Sudah Dibayar" value={formatRupiah(paidOf(detailInvoice))} />
                <KV label="Sisa Tagihan" value={formatRupiah(detailInvoice.total - paidOf(detailInvoice))} />
              </Stack>

              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 0.75 }}>Rincian Item</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produk</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Harga</TableCell>
                    <TableCell align="right">Jumlah</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailInvoice.items || []).map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{it.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{it.sku}</Typography>
                      </TableCell>
                      <TableCell align="right">{it.qty} {it.unit}</TableCell>
                      <TableCell align="right">{formatRupiah(it.price)}</TableCell>
                      <TableCell align="right"><b>{formatRupiah(it.line)}</b></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                <KV label="Subtotal" value={formatRupiah(detailInvoice.subtotal)} />
                <KV label={`PPN ${Math.round((detailInvoice.taxRate || 0.11) * 100)}%`} value={formatRupiah(detailInvoice.tax)} />
                <KV label="TOTAL" value={<Typography color="primary" fontWeight={800}>{formatRupiah(detailInvoice.total)}</Typography>} />
              </Stack>

              {detailInvoice.metodePembayaran === 'cicilan' && detailInvoice.installments && (
                <>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 0.75 }}>Jadwal Angsuran</Typography>
                  {detailInvoice.installments.map((a) => (
                    <Stack key={a.ke} direction="row" justifyContent="space-between" alignItems="center"
                      sx={{ py: 0.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="body2">Angsuran {a.ke}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">{a.jatuhTempo}</Typography>
                        <Typography variant="body2" fontWeight={700}>{formatRupiah(a.nominal)}</Typography>
                        {a.status === 'lunas'
                          ? <Chip size="small" color="success" label="Lunas" />
                          : <Chip size="small" variant="outlined" label="Belum" />}
                      </Stack>
                    </Stack>
                  ))}
                </>
              )}

              {(detailInvoice.payments || []).length > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 0.75 }}>Riwayat Pembayaran</Typography>
                  {detailInvoice.payments.slice().reverse().map((p, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between"
                      sx={{ py: 0.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">{p.ts}</Typography>
                      <Typography variant="caption">{p.keterangan || 'Pembayaran'} — {p.metode}</Typography>
                      <Typography variant="caption" fontWeight={700}>{formatRupiah(p.nominal)}</Typography>
                    </Stack>
                  ))}
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setDetailId(null)}>Tutup</Button>
          {detailInvoice && (
            <Button variant="outlined" startIcon={<PrintRoundedIcon />}
              onClick={() => { const ok = openInvoicePdf(detailInvoice, db); if (!ok) toast('Izinkan popup pada browser untuk mencetak / menyimpan PDF.', 'warning'); }}>
              Cetak / Unduh PDF
            </Button>
          )}
          {detailInvoice && (
            <Button variant="outlined" onClick={() => shareInvoiceWhatsApp(detailInvoice, db)}>
              Bagikan WhatsApp
            </Button>
          )}
          {detailInvoice && detailInvoice.status === 'belum_lunas' && isFinance && (
            <Button variant="contained" color="success"
              onClick={() => { setDetailId(null); setPayId(detailInvoice.id); }}>
              {detailInvoice.metodePembayaran === 'cicilan' ? 'Bayar Angsuran' : 'Catat Pembayaran'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
