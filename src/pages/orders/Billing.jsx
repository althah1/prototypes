import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
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

import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import FilterToolbar from '../../components/ui/FilterToolbar';
import DetailGrid, { FormSection, ModalHeader } from '../../components/ui/DetailGrid';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import { nowStamp, formatRupiah, todayISO } from '../../utils/helpers';
import { openInvoicePdf, shareInvoiceWhatsApp } from '../../utils/invoicePdf';

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

  function paidOf(i) {
    if (!i) return 0;
    // Jika sudah lunas, kembalikan total penuh agar progress menampilkan nominal terbayar
    if (i.status === 'lunas') return i.total || 0;
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
  const overdueList = invoices.filter((i) => i.status === 'belum_lunas' && i.jatuhTempo && i.jatuhTempo < todayISO());

  const payInvoice = invoices.find((i) => i.id === payId);
  const detailInvoice = invoices.find((i) => i.id === detailId);
  const sisaBayar = payInvoice ? Math.max(0, payInvoice.total - paidOf(payInvoice)) : 0;

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

  const filtered = useMemo(() => {
    return invoices.filter(
      (i) =>
        (statusFilter === 'all' ||
          (statusFilter === 'lunas' && i.status === 'lunas') ||
          (statusFilter === 'belum' && i.status === 'belum_lunas') ||
          (statusFilter === 'overdue' && overdue(i)) ||
          (statusFilter === 'dibatalkan' && i.status === 'dibatalkan')) &&
        (!dateFilter || i.date === dateFilter) &&
        (!q.trim() ||
          i.no.toLowerCase().includes(q.trim().toLowerCase()) ||
          String(i.orderNo || '').toLowerCase().includes(q.trim().toLowerCase()) ||
          outletName(i.outletId).toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [invoices, statusFilter, dateFilter, q, db.outlets]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice().reverse().slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  const submitPay = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr('Nominal diterima wajib diisi.'); return; }
    if (amt > sisaBayar) { setErr(`Nominal pembayaran melebihi sisa tagihan (${formatRupiah(sisaBayar)}).`); return; }

    const inv = payInvoice;
    const payments = [...(inv.payments || []), { ts: nowStamp(), nominal: amt, metode: method, keterangan: 'Pembayaran' }];
    const totalPaid = payments.reduce((s, p) => s + p.nominal, 0);
    const lunas = totalPaid >= inv.total;
    update('invoices', inv.id, { payments, status: lunas ? 'lunas' : 'belum_lunas', paidAt: lunas ? nowStamp() : null });
    if (lunas) update('orders', inv.orderId, { paid: true, paidAt: nowStamp(), paidMethod: method });
    const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === inv.salesId);
    if (salesUser) {
      notify(salesUser.id, 'Pembayaran Diterima', `Invoice ${inv.no}: ${formatRupiah(amt)} diterima (${method})${lunas ? ' — LUNAS' : ` — sisa ${formatRupiah(Math.max(0, inv.total - totalPaid))}`}.`);
    }
    toast(lunas ? `Pembayaran tercatat — invoice ${inv.no} LUNAS.` : `Pembayaran tercatat — sisa ${formatRupiah(Math.max(0, inv.total - totalPaid))}.`, lunas ? 'success' : 'info');
    setPayId(null);
  };

  const payInstallment = (inv, ke) => {
    const installments = (inv.installments || []).map((a) =>
      a.ke === ke ? { ...a, status: 'lunas', paidAt: nowStamp(), paidMethod: 'Transfer Bank' } : a
    );
    const instTarget = installments.find((a) => a.ke === ke);
    const payments = [...(inv.payments || []), { ts: nowStamp(), nominal: instTarget.nominal, metode: 'Transfer Bank', keterangan: `Angsuran ke-${ke}` }];
    const allPaid = installments.every((a) => a.status === 'lunas');
    update('invoices', inv.id, { installments, payments, status: allPaid ? 'lunas' : 'belum_lunas', paidAt: allPaid ? nowStamp() : null });
    if (allPaid) update('orders', inv.orderId, { paid: true, paidAt: nowStamp(), paidMethod: 'Transfer Bank' });
    const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === inv.salesId);
    if (salesUser) notify(salesUser.id, 'Angsuran Diterima', `Invoice ${inv.no}: angsuran ${ke} lunas.`);
    toast(allPaid ? `Angsuran ${ke} lunas — invoice ${inv.no} LUNAS.` : `Angsuran ${ke} berhasil dicatat lunas.`, 'success');
  };

  const detailMetadata = detailInvoice
    ? [
        { label: 'Nomor Invoice', value: detailInvoice.no, mono: true },
        { label: 'Nomor Order Acuan', value: detailInvoice.orderNo || '-', mono: true },
        { label: 'Tanggal Terbit', value: detailInvoice.date, mono: true },
        { label: 'Jatuh Tempo', value: detailInvoice.jatuhTempo || '-', mono: true },
        { label: 'Outlet Pelanggan', value: outletName(detailInvoice.outletId) },
        { label: 'Sales Pengampu', value: salesName(detailInvoice.salesId) },
        { label: 'Metode Pembayaran', value: syaratLabel(detailInvoice) },
        {
          label: 'Status Tagihan',
          customNode: (
            <StatusChip
              kind="paid"
              status={
                detailInvoice.status === 'lunas'
                  ? 'yes'
                  : detailInvoice.status === 'dibatalkan'
                  ? 'cancelled'
                  : paidOf(detailInvoice) > 0
                  ? 'partial'
                  : 'no'
              }
            />
          ),
        },
      ]
    : [];

  return (
    <Box>
      <PageHeader
        title="Billing / Penagihan"
        subtitle={`Invoice diterbitkan otomatis saat Supervisor menyetujui order. ${isFinance ? 'Anda memiliki akses mencatat pembayaran & verifikasi tagihan.' : 'Akses pemantauan (Lihat Saja).'}`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 2.5 }}>
        <StatCard icon={<ReceiptLongRoundedIcon />} value={invoices.length} label="Total Invoice" />
        <StatCard icon={<ScheduleRoundedIcon />} value={formatRupiah(unpaid.reduce((s, i) => s + Math.max(0, i.total - paidOf(i)), 0))} label="Sisa Tagihan Aktif" color="warning" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={overdueList.length} label="Jatuh Tempo" color="error" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(paid.reduce((s, i) => s + paidOf(i), 0))} label="Dana Diterima" color="success" />
      </Box>

      <FilterToolbar
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(0); }}
        searchPlaceholder="Cari no. invoice, order, atau outlet…"
        shownCount={filtered.length}
        totalCount={invoices.length}
        unitLabel="invoice"
        hasActiveFilter={q !== '' || statusFilter !== 'all' || dateFilter !== ''}
        onReset={() => { setQ(''); setStatusFilter('all'); setDateFilter(''); setPage(0); }}
      >
        <TextField
          size="small"
          type="date"
          label="Tanggal"
          value={dateFilter}
          InputLabelProps={{ shrink: true }}
          onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
          sx={{ width: 165 }}
        />

        <TextField
          size="small"
          select
          label="Status Tagihan"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ width: 165 }}
        >
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="belum">Belum Lunas</MenuItem>
          <MenuItem value="overdue">Jatuh Tempo</MenuItem>
          <MenuItem value="lunas">Lunas</MenuItem>
          <MenuItem value="dibatalkan">Dibatalkan</MenuItem>
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
              <TableCell>No. Invoice</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Outlet</TableCell>
              <TableCell>Sales</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Syarat</TableCell>
              <TableCell>Progress Bayar</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? (
              paginated.map((i) => (
                <TableRow
                  key={i.id}
                  hover
                  onClick={() => setDetailId(i.id)}
                  sx={{
                    cursor: 'pointer',
                    opacity: i.status === 'dibatalkan' ? 0.6 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }} title={i.no}>
                      {i.no}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }} title={i.orderNo}>
                      {i.orderNo}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{i.date}</TableCell>
                  <TableCell>
                    <Box title={outletName(i.outletId)} sx={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {outletName(i.outletId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box title={salesName(i.salesId)} sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {salesName(i.salesId)}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(i.total)}
                  </TableCell>
                  <TableCell>
                    <Box title={syaratLabel(i)} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
                      {syaratLabel(i)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                    <Typography variant="caption" fontWeight={700} color={i.status === 'lunas' ? 'success.main' : paidOf(i) > 0 ? 'info.main' : 'text.secondary'}>
                      {progressLabel(i)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <StatusChip
                        kind="paid"
                        status={
                          i.status === 'lunas'
                            ? 'yes'
                            : i.status === 'dibatalkan'
                            ? 'cancelled'
                            : paidOf(i) > 0
                            ? 'partial'
                            : 'no'
                        }
                      />
                      {overdue(i) && (
                        <StatusChip
                          kind="paid"
                          status="overdue"
                          label={`Jatuh Tempo ${i.jatuhTempo}`}
                          icon={<WarningAmberRoundedIcon sx={{ fontSize: 13, mr: 0.3 }} />}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Detail">
                        <IconButton size="small" onClick={() => setDetailId(i.id)} sx={{ '&:hover': { color: 'primary.main' } }}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {i.status === 'belum_lunas' && isFinance && (
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
                          onClick={() => setPayId(i.id)}
                        >
                          {i.metodePembayaran === 'cicilan' ? 'Angsuran' : 'Bayar'}
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="Tidak ada dokumen invoice yang sesuai dengan filter." />
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

      {/* Modal Dialog Catat Pembayaran / Angsuran */}
      <Dialog
        open={Boolean(payId)}
        onClose={() => setPayId(null)}
        maxWidth={payInvoice?.metodePembayaran === 'cicilan' ? 'md' : 'sm'}
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
          title={`Penerimaan Dana — ${payInvoice?.no}`}
          subtitle={`Outlet ${outletName(payInvoice?.outletId)} • Tagihan ${formatRupiah(payInvoice?.total || 0)}`}
          onClose={() => setPayId(null)}
        />
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
          {/* Ringkasan Angka Datar Bersih (Tanpa Nested Card) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.25,
              p: 1.5,
              mb: 2.5,
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ pr: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: 10 }}>
                Total Tagihan
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatRupiah(payInvoice?.total || 0)}
              </Typography>
            </Box>
            <Box sx={{ px: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: 10 }}>
                Sudah Diterima
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} color="success.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatRupiah(paidOf(payInvoice))}
              </Typography>
            </Box>
            <Box sx={{ pl: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: 10 }}>
                Sisa Tagihan
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} color="warning.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatRupiah(sisaBayar)}
              </Typography>
            </Box>
          </Box>

          {/* Metode Cicilan: Rincian Angsuran */}
          {payInvoice?.metodePembayaran === 'cicilan' ? (
            <Box>
              <FormSection title="Daftar Jadwal Angsuran" subtitle="Klik tombol Lunas pada baris angsuran yang telah diterima dan diverifikasi" />
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.25, mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Angsuran</TableCell>
                      <TableCell>Jatuh Tempo</TableCell>
                      <TableCell align="right">Nominal</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Aksi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payInvoice.installments?.map((a) => (
                      <TableRow key={a.ke} hover>
                        <TableCell sx={{ fontWeight: 650 }}>Angsuran ke-{a.ke}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{a.jatuhTempo || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {formatRupiah(a.nominal)}
                        </TableCell>
                        <TableCell>
                          <StatusChip kind="paid" status={a.status === 'lunas' ? 'yes' : 'no'} />
                        </TableCell>
                        <TableCell align="right">
                          {a.status !== 'lunas' ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => payInstallment(payInvoice, a.ke)}
                              sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 650, px: 1.5, py: 0.25 }}
                            >
                              Catat Lunas
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Lunas ({a.paidAt?.slice(0, 10)})
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Stack spacing={2}>
              <FormSection title="Formulir Penerimaan Pembayaran" />
              {err && <Alert severity="error">{err}</Alert>}
              <TextField
                select
                label="Metode Pembayaran *"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <MenuItem value="Transfer Bank">Transfer Bank</MenuItem>
                <MenuItem value="Tunai">Tunai / Cash</MenuItem>
                <MenuItem value="Giro / Cek">Giro / Cek</MenuItem>
              </TextField>
              <TextField
                type="number"
                label="Nominal Pembayaran Diterima (Rp) *"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErr(''); }}
                helperText={`Sisa tagihan aktif: ${formatRupiah(sisaBayar)}`}
                inputProps={{ min: 1, max: sisaBayar }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={() => setPayId(null)} sx={{ borderRadius: 1, fontWeight: 600 }}>
            Tutup
          </Button>
          {payInvoice?.metodePembayaran !== 'cicilan' && (
            <Button variant="contained" color="primary" onClick={submitPay} sx={{ borderRadius: 1, fontWeight: 650, px: 2.5 }}>
              Simpan Pembayaran
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal Detail Invoice Penuh */}
      <Dialog
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
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
          title={`Detail Tagihan — ${detailInvoice?.no}`}
          subtitle={`Lembar invoice resmi transaksi order ${detailInvoice?.orderNo || ''}`}
          onClose={() => setDetailId(null)}
        />
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
          {detailInvoice && (
            <Stack spacing={2.5}>
              <DetailGrid items={detailMetadata} columns={2} />

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
                  Rincian Barang Tagihan
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.25, mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nama Barang</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Harga</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailInvoice.items?.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={650}>{it.productName || it.name}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{it.sku}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{it.qty} {it.unit || 'pcs'}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.price)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.total || it.price * it.qty)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 1 }}>
                  <Box sx={{ width: 280 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body2" fontWeight={650}>{formatRupiah(detailInvoice.subtotal || detailInvoice.total)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">PPN (11%)</Typography>
                      <Typography variant="body2" fontWeight={650}>{formatRupiah(detailInvoice.tax || 0)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle1" fontWeight={800}>Total Tagihan</Typography>
                      <Typography variant="subtitle1" fontWeight={800} color="primary.main">{formatRupiah(detailInvoice.total)}</Typography>
                    </Stack>
                  </Box>
                </Box>
              </Box>

              {/* Riwayat Pembayaran Masuk */}
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
                  Riwayat Pembayaran Diterima
                </Typography>
                {detailInvoice.payments?.length ? (
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.25 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Waktu</TableCell>
                          <TableCell>Metode</TableCell>
                          <TableCell>Keterangan</TableCell>
                          <TableCell align="right">Nominal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailInvoice.payments.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{p.ts}</TableCell>
                            <TableCell>{p.metode}</TableCell>
                            <TableCell>{p.keterangan || '-'}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                              {formatRupiah(p.nominal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Belum ada riwayat pembayaran tercatat untuk tagihan ini.
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, justifyContent: 'flex-end', gap: 1.25 }}>
          <Button variant="outlined" color="inherit" onClick={() => setDetailId(null)} sx={{ borderRadius: 1, fontWeight: 600 }}>
            Tutup
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PrintRoundedIcon />}
            onClick={() => {
              const comp = (db.companies || [])[0] || {};
              const ot = (db.outlets || []).find((o) => o.id === detailInvoice?.outletId) || {};
              const sl = (db.sales || []).find((s) => s.id === detailInvoice?.salesId) || {};
              openInvoicePdf({ invoice: detailInvoice, outlet: ot, sales: sl, company: comp });
            }}
            sx={{ borderRadius: 1, fontWeight: 650 }}
          >
            Cetak PDF
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<ShareRoundedIcon />}
            onClick={() => {
              const comp = (db.companies || [])[0] || {};
              const ot = (db.outlets || []).find((o) => o.id === detailInvoice?.outletId) || {};
              const sl = (db.sales || []).find((s) => s.id === detailInvoice?.salesId) || {};
              shareInvoiceWhatsApp({ invoice: detailInvoice, outlet: ot, sales: sl, company: comp });
            }}
            sx={{ borderRadius: 1, fontWeight: 650 }}
          >
            Kirim WhatsApp
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
