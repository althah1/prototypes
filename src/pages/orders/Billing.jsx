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
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
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

/* Komponen KV Minimalis & Rapi — Seragam di Seluruh Sistem */
const KV = ({ label, value }) => (
  <Box sx={{ py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        color: 'text.secondary',
        fontSize: '0.675rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        display: 'block',
        mb: 0.25,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: 600,
        fontSize: '0.825rem',
        color: 'text.primary',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </Typography>
  </Box>
);

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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const invoices = db.invoices || [];

  /* Hitung akumulasi pembayaran riil (DP + angsuran cicilan) */
  function paidOf(i) {
    if (!i) return 0;
    if (Array.isArray(i.payments) && i.payments.length > 0) {
      return i.payments.reduce((s, p) => s + (Number(p.nominal) || 0), 0);
    }
    if (i.metodePembayaran === 'cicilan' && i.installments) {
      const dp = Number(i.cicilanDP) || 0;
      const inst = i.installments.filter((a) => a.status === 'lunas').reduce((s, a) => s + (Number(a.nominal) || 0), 0);
      return dp + inst;
    }
    return 0;
  }

  const unpaid = invoices.filter((i) => i.status !== 'lunas' && i.status !== 'dibatalkan');
  const paid = invoices.filter((i) => i.status === 'lunas');
  const overdueList = invoices.filter((i) =>
    i.status === 'belum_lunas' && i.jatuhTempo && i.jatuhTempo < todayISO());

  const payInvoice = invoices.find((i) => i.id === payId);
  const detailInvoice = invoices.find((i) => i.id === detailId);
  const sisaBayar = payInvoice ? Math.max(0, payInvoice.total - paidOf(payInvoice)) : 0;
  const mismatch = payInvoice && Number(amount) !== sisaBayar;

  useEffect(() => {
    if (payId) {
      const i = invoices.find((x) => x.id === payId);
      const sisa = i ? Math.max(0, i.total - paidOf(i)) : 0;
      setAmount(String(sisa));
      setMethod(i && i.metodePembayaran === 'tunai' ? 'Tunai' : 'Transfer Bank');
      setErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payId]);

  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';

  function progressLabel(i) {
    if (i.metodePembayaran === 'konsinyasi') return 'Menunggu stock-take';
    if (i.metodePembayaran === 'cicilan' && i.installments) {
      const done = i.installments.filter((a) => a.status === 'lunas').length;
      return `${done}/${i.installments.length} angsuran`;
    }
    const p = paidOf(i);
    if (p === 0) return 'Belum dibayar';
    return `${formatRupiah(p)} / ${formatRupiah(i.total)}`;
  }

  const syaratLabel = (i) => {
    switch (i?.metodePembayaran) {
      case 'transfer': {
        const b = (db.banks || []).find((x) => x.id === i.bankId);
        return b ? `Transfer — ${b.nama}` : 'Transfer Bank';
      }
      case 'termin':
        return `Termin ${i.terminHari || 14} hari`;
      case 'cicilan':
        return `Cicilan${i?.cicilanDP > 0 ? ` (DP ${formatRupiah(i.cicilanDP)})` : ''}`;
      case 'konsinyasi':
        return 'Konsinyasi';
      default:
        return 'Tunai (COD)';
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

  const curPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const paginated = filtered.slice().reverse().slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

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
      `Invoice ${inv.no}: ${formatRupiah(amt)} diterima (${method})${lunas ? ' — LUNAS' : ` — sisa ${formatRupiah(Math.max(0, inv.total - totalPaid))}`}.`);
    toast(lunas ? `Pembayaran tercatat — invoice ${inv.no} LUNAS.` : `Pembayaran parsial tercatat — sisa ${formatRupiah(Math.max(0, inv.total - totalPaid))}.`, lunas ? 'success' : 'info');
    setPayId(null);
  };

  const payInstallment = (inv, ke) => {
    const installments = (inv.installments || []).map((a) =>
      a.ke === ke ? { ...a, status: 'lunas', paidAt: nowStamp(), paidMethod: 'Transfer Bank' } : a);
    const instTarget = installments.find((a) => a.ke === ke);
    const payments = [...(inv.payments || []), { ts: nowStamp(), nominal: instTarget.nominal, metode: 'Transfer Bank', keterangan: `Angsuran ${ke}` }];
    const allPaid = installments.every((a) => a.status === 'lunas');
    update('invoices', inv.id, { installments, payments, status: allPaid ? 'lunas' : 'belum_lunas', paidAt: allPaid ? nowStamp() : null });
    if (allPaid) update('orders', inv.orderId, { paid: true, paidAt: nowStamp(), paidMethod: 'Transfer Bank' });
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
        <StatCard icon={<ScheduleRoundedIcon />} value={formatRupiah(unpaid.reduce((s, i) => s + Math.max(0, i.total - paidOf(i)), 0))} label="Sisa tagihan" color="warning" />
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
            InputLabelProps={{ shrink: true }} onChange={(e) => { setDateFilter(e.target.value); setPage(0); }} sx={{ width: 170 }} />
          <TextField size="small" select label="Status" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ width: 170 }}>
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="belum">Belum Lunas</MenuItem>
            <MenuItem value="overdue">Jatuh Tempo</MenuItem>
            <MenuItem value="lunas">Lunas</MenuItem>
            <MenuItem value="dibatalkan">Dibatalkan</MenuItem>
          </TextField>
          <TextField size="small" label="Cari no. invoice / order / outlet…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }} sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }} />
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
            {paginated.length ? paginated.map((i) => (
              <TableRow key={i.id} onClick={() => setDetailId(i.id)}
                sx={{ cursor: 'pointer', opacity: i.status === 'dibatalkan' ? 0.55 : 1 }}>
                <TableCell>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} fontWeight={700} title={i.no}>{i.no}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.orderNo}>{i.orderNo}</Typography>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{i.date}</TableCell>
                <TableCell>
                  <Box title={outletName(i.outletId)} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{outletName(i.outletId)}</Box>
                </TableCell>
                <TableCell>
                  <Box title={salesName(i.salesId)} sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{salesName(i.salesId)}</Box>
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}><b>{formatRupiah(i.total)}</b></TableCell>
                <TableCell>
                  <Box title={syaratLabel(i)} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{syaratLabel(i)}</Box>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" fontWeight={700} noWrap color={i.status === 'lunas' ? 'success.main' : paidOf(i) > 0 ? 'info.main' : 'text.secondary'}>
                    {progressLabel(i)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {i.status === 'lunas' ? (
                      <StatusChip kind="paid" status="yes" />
                    ) : i.status === 'dibatalkan' ? (
                      <StatusChip kind="paid" status="cancelled" />
                    ) : paidOf(i) > 0 ? (
                      <StatusChip kind="paid" status="partial" />
                    ) : (
                      <StatusChip kind="paid" status="no" />
                    )}
                    {overdue(i) && (
                      <StatusChip
                        kind="paid"
                        status="overdue"
                        label={`Jatuh Tempo ${i.jatuhTempo}`}
                        icon={<WarningAmberRoundedIcon sx={{ fontSize: 13, mr: 0.4 }} />}
                      />
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {i.status === 'belum_lunas' && isFinance ? (
                    <Button
                      size="small"
                      variant="outlined"
                      color={i.metodePembayaran === 'cicilan' ? 'warning' : 'success'}
                      sx={{
                        borderRadius: 1,
                        fontWeight: 650,
                        fontSize: 12,
                        textTransform: 'none',
                        px: 1.25,
                        py: 0.35,
                      }}
                      onClick={(e) => { e.stopPropagation(); setPayId(i.id); }}
                    >
                      {i.metodePembayaran === 'cicilan' ? 'Angsuran' : 'Catat Bayar'}
                    </Button>
                  ) : '—'}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={9}><EmptyState message="Belum ada invoice — terbit otomatis saat Supervisor menyetujui order." /></TableCell></TableRow>
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

      {/* ===== Dialog: Catat Pembayaran / Bayar Angsuran — Lebar & Proporsional ===== */}
      <Dialog
        open={Boolean(payId)}
        onClose={() => setPayId(null)}
        maxWidth={payInvoice?.metodePembayaran === 'cicilan' ? 'md' : 'sm'}
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: payInvoice?.metodePembayaran === 'cicilan' ? 'md' : 'sm' },
            borderRadius: { xs: 0, sm: 2 },
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderRight: { xs: 'none', sm: '1px solid' },
            borderColor: 'divider',
            boxShadow: { xs: 'none', sm: '0 12px 40px rgba(15,23,42,0.1)' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, px: { xs: 2, sm: 3 } }}>
          Catat Pembayaran — {payInvoice?.no}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 1.5, sm: 3 } }}>
          {/* ===== 3 KARTU MINI RINGKASAN TAGIHAN & SISA ===== */}
          {(() => {
            const total = payInvoice?.total || 0;
            const paid = paidOf(payInvoice || {});
            const remaining = Math.max(0, total - paid);
            const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

            return (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 1.5,
                  mb: 2.5,
                }}
              >
                {/* Kartu 1: Total Tagihan */}
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ letterSpacing: '0.04em' }}>
                      TOTAL TAGIHAN
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.25 }}>
                      {formatRupiah(total)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {syaratLabel(payInvoice)}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Kartu 2: Total Terbayar */}
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ letterSpacing: '0.04em' }}>
                      TOTAL TERBAYAR
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="success.main" sx={{ mt: 0.25 }}>
                      {formatRupiah(paid)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Terlunasi {progress}%
                    </Typography>
                  </CardContent>
                </Card>

                {/* Kartu 3: Sisa Tagihan Tertagih */}
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: remaining > 0 ? '#fecaca' : '#bbf7d0',
                    bgcolor: remaining > 0 ? '#fef2f2' : '#f0fdf4',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={remaining > 0 ? 'error.main' : 'success.main'}
                        sx={{ letterSpacing: '0.04em' }}
                      >
                        SISA TAGIHAN
                      </Typography>
                      <StatusChip
                        kind="paid"
                        status={remaining === 0 ? 'yes' : 'partial'}
                        size="small"
                      />
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      fontWeight={850}
                      color={remaining > 0 ? 'error.main' : 'success.main'}
                      sx={{ mt: 0.25 }}
                    >
                      {formatRupiah(remaining)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={remaining > 0 ? 'error.dark' : 'success.dark'}
                      display="block"
                    >
                      {remaining > 0 ? 'Wajib ditagihkan' : 'Lunas sepenuhnya'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            );
          })()}

          {payInvoice?.metodePembayaran === 'cicilan' && payInvoice.installments ? (
            <Stack spacing={1.25} sx={{ mt: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>Jadwal Angsuran Bulanan</Typography>
              {payInvoice.installments.map((a) => (
                <Card key={a.ke} elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: a.status === 'lunas' ? 'success.main' : 'divider' }}>
                  <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={750} fontSize={13.5}>Angsuran ke-{a.ke}</Typography>
                        {a.status === 'lunas' ? (
                          <Chip size="small" color="success" icon={<CheckCircleRoundedIcon />} label={`Lunas${a.paidAt ? ` • ${a.paidMethod || ''}` : ''}`} sx={{ height: 20 }} />
                        ) : a.jatuhTempo < todayISO() ? (
                          <Chip size="small" color="error" label={`Jatuh Tempo ${a.jatuhTempo}`} sx={{ height: 20 }} />
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', display: 'block', mt: 0.25 }}>
                        {formatRupiah(a.nominal)} • Jatuh tempo: {a.jatuhTempo}
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
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField select label="Metode Penerimaan" value={method} onChange={(e) => setMethod(e.target.value)}
                helperText="Bagaimana uang diterima — default mengikuti syarat awal.">
                <MenuItem value="Transfer Bank">Transfer Bank</MenuItem>
                <MenuItem value="Tunai">Tunai</MenuItem>
              </TextField>
              <TextField type="number" label="Nominal Diterima (Rp)" value={amount}
                onChange={(e) => { setAmount(e.target.value); setErr(''); }}
                error={Boolean(err)} helperText={err || ' '} inputProps={{ min: 0 }} />
              {mismatch && (
                <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                  Nominal berbeda dengan sisa tagihan — akan tercatat sebagai pembayaran parsial.
                </Alert>
              )}
              {(payInvoice?.payments || []).length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Riwayat Penerimaan Pembayaran</Typography>
                  {(payInvoice.payments || []).slice().reverse().map((p, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between"
                      sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">{p.ts}</Typography>
                      <Typography variant="caption">{p.keterangan || 'Pembayaran'} — {p.metode}</Typography>
                      <Typography variant="caption" fontWeight={750} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(p.nominal)}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        {payInvoice?.metodePembayaran !== 'cicilan' && (
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setPayId(null)}>Batal</Button>
            <Button variant="contained" color="success" onClick={submitPay}>Simpan Pembayaran</Button>
          </DialogActions>
        )}
        {payInvoice?.metodePembayaran === 'cicilan' && (
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPayId(null)}>Tutup</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ===== Dialog Detail Invoice — Lebar maxWidth="md", Grid 2 Kolom, Seragam 100% ===== */}
      <Dialog
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 12px 40px rgba(15,23,42,0.1)',
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Detail Invoice — {detailInvoice?.no}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
          {detailInvoice && (
            <>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5, flexWrap: 'wrap' }}>
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

              {/* GRID 2 KOLOM METADATA INVOICE */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  columnGap: 3,
                  rowGap: 0.5,
                  mb: 3,
                }}
              >
                <KV label="No. Invoice" value={detailInvoice.no} />
                <KV label="Order Sumber" value={detailInvoice.orderNo || '-'} />
                <KV label="Tanggal Terbit" value={detailInvoice.date} />
                <KV label="Batas Waktu" value={detailInvoice.jatuhTempo || 'Mengikuti angsuran / stock-take'} />
                <KV label="Outlet Pelanggan" value={outletName(detailInvoice.outletId)} />
                <KV label="Sales Terkait" value={salesName(detailInvoice.salesId)} />
                <KV label="Syarat Pembayaran" value={syaratLabel(detailInvoice)} />
                <KV
                  label="Status Pelunasan"
                  value={
                    detailInvoice.status === 'lunas' ? (
                      <Typography fontWeight={750} color="success.main">Lunas Terverifikasi</Typography>
                    ) : (
                      <Typography fontWeight={750} color="warning.main">
                        Sisa Tagihan: {formatRupiah(Math.max(0, detailInvoice.total - paidOf(detailInvoice)))}
                      </Typography>
                    )
                  }
                />
              </Box>

              {/* Rincian Item */}
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25, fontSize: '0.85rem' }}>
                Rincian Barang Tertagih
              </Typography>
              <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2.5 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Produk</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Harga</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Jumlah</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailInvoice.items || []).map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={650}>{it.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{it.sku}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{it.qty} {it.unit}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.price)}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        <b>{formatRupiah(it.line)}</b>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Ringkasan Finansial Multi-Kolom */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">SUBTOTAL</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(detailInvoice.subtotal)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">PPN {Math.round((detailInvoice.taxRate || 0.11) * 100)}%</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(detailInvoice.tax)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">SUDAH DIBAYAR</Typography>
                  <Typography variant="body2" fontWeight={750} color="success.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(paidOf(detailInvoice))}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="primary.main" fontWeight={800} display="block">TOTAL INVOICE</Typography>
                  <Typography variant="subtitle1" fontWeight={850} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{formatRupiah(detailInvoice.total)}</Typography>
                </Box>
              </Box>

              {/* Jadwal Angsuran jika Cicilan */}
              {detailInvoice.metodePembayaran === 'cicilan' && detailInvoice.installments && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Jadwal Angsuran</Typography>
                  {detailInvoice.installments.map((a) => (
                    <Stack key={a.ke} direction="row" justifyContent="space-between" alignItems="center"
                      sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={600}>Angsuran ke-{a.ke}</Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">{a.jatuhTempo}</Typography>
                        <Typography variant="body2" fontWeight={750} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(a.nominal)}</Typography>
                        {a.status === 'lunas'
                          ? <Chip size="small" color="success" label="Lunas" sx={{ height: 20 }} />
                          : <Chip size="small" variant="outlined" label="Belum" sx={{ height: 20 }} />}
                      </Stack>
                    </Stack>
                  ))}
                </Box>
              )}

              {/* Riwayat Pembayaran */}
              {(detailInvoice.payments || []).length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Riwayat Pembayaran Diterima</Typography>
                  {detailInvoice.payments.slice().reverse().map((p, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between"
                      sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">{p.ts}</Typography>
                      <Typography variant="caption">{p.keterangan || 'Pembayaran'} — {p.metode}</Typography>
                      <Typography variant="caption" fontWeight={750} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(p.nominal)}</Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setDetailId(null)}>Tutup</Button>
          {detailInvoice && (
            <Button variant="outlined" startIcon={<PrintRoundedIcon />}
              onClick={() => { const ok = openInvoicePdf(detailInvoice, db); if (!ok) toast('Izinkan popup browser untuk mencetak PDF.', 'warning'); }}>
              Cetak / Unduh PDF
            </Button>
          )}
          {detailInvoice && (
            <Button variant="outlined" onClick={() => shareInvoiceWhatsApp(detailInvoice, db)}>
              Bagikan WhatsApp
            </Button>
          )}
          {detailInvoice && detailInvoice.status === 'belum_lunas' && isFinance && (
            <Button
              variant="outlined"
              color={detailInvoice.metodePembayaran === 'cicilan' ? 'warning' : 'success'}
              sx={{ borderRadius: 1, fontWeight: 650, textTransform: 'none' }}
              onClick={() => { setDetailId(null); setPayId(detailInvoice.id); }}
            >
              {detailInvoice.metodePembayaran === 'cicilan' ? 'Bayar Angsuran' : 'Catat Pembayaran'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
