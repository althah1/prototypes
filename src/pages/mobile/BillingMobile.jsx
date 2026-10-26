import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import EmptyState from '../../components/ui/EmptyState';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { formatRupiah, nowStamp, todayISO } from '../../utils/helpers';
import { openInvoicePdf, shareInvoiceWhatsApp } from '../../utils/invoicePdf';

function paidOf(i) {
  if (!i) return 0;
  if (Array.isArray(i.payments) && i.payments.length > 0) {
    return i.payments.reduce((s, p) => s + (Number(p.nominal) || 0), 0);
  }
  if (i.metodePembayaran === 'cicilan' && i.installments) {
    const dp = Number(i.cicilanDP) || 0;
    const inst = i.installments
      .filter((a) => a.status === 'lunas')
      .reduce((s, a) => s + (Number(a.nominal) || 0), 0);
    return dp + inst;
  }
  if (i.status === 'lunas') return Number(i.paidAmount ?? i.total) || 0;
  return 0;
}

export default function BillingMobile() {
  const { user } = useAuth();
  const { db, update } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailId, setDetailId] = useState(null);

  const today = todayISO();
  const salesProfile = (db.sales || []).find((s) => s.id === user.salesId);
  const areaOutletIds = useMemo(
    () => new Set(
      (db.outlets || [])
        .filter((o) => salesProfile && o.areaId === salesProfile.areaId)
        .map((o) => o.id)
    ),
    [db.outlets, salesProfile]
  );

  /* Tagihan khusus outlet di Area Kerja Sales atau transaksi milik Sales sendiri */
  const areaInvoices = useMemo(
    () => [...(db.invoices || [])]
      .filter((i) => areaOutletIds.has(i.outletId) || i.salesId === user.salesId)
      .reverse(),
    [db.invoices, areaOutletIds, user.salesId]
  );

  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};
  const isOverdue = (i) => i.status === 'belum_lunas' && Boolean(i.jatuhTempo && i.jatuhTempo < today);

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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return areaInvoices.filter((i) => {
      if (statusFilter === 'belum' && i.status !== 'belum_lunas') return false;
      if (statusFilter === 'overdue' && !isOverdue(i)) return false;
      if (statusFilter === 'lunas' && i.status !== 'lunas') return false;
      if (statusFilter === 'dibatalkan' && i.status !== 'dibatalkan') return false;
      if (term) {
        const outName = outletOf(i.outletId).name || '';
        if (!`${i.no} ${i.orderNo || ''} ${outName}`.toLowerCase().includes(term)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaInvoices, statusFilter, q, db.outlets, today]);

  const totalPiutang = areaInvoices
    .filter((i) => i.status !== 'lunas' && i.status !== 'dibatalkan')
    .reduce((s, i) => s + Math.max(0, i.total - paidOf(i)), 0);
  const overdueCount = areaInvoices.filter(isOverdue).length;

  const detailInvoice = areaInvoices.find((i) => i.id === detailId) || null;

  /* Catatan Integrasi Tabel 1 FSD: Sales hanya diizinkan memperbarui status pengiriman faktur di lapangan */
  const markInvoiceDelivered = (inv) => {
    update('invoices', inv.id, {
      fakturDelivered: true,
      fakturDeliveredAt: nowStamp(),
      fakturDeliveredBy: user.name,
    });
    toast(`Faktur ${inv.no} ditandai telah diserahkan ke pelanggan.`, 'success');
  };

  return (
    <Stack spacing={2} sx={{ pb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate('/app')} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} noWrap>Billing Pelanggan</Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            Daftar tagihan & piutang outlet area Anda (Read-Only)
          </Typography>
        </Box>
        <Chip size="small" color="primary" variant="outlined" label={`${filtered.length} faktur`} />
      </Stack>

      {/* Ringkasan Piutang Area */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 1.25 }}>
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Sisa Piutang Area
            </Typography>
            <Typography fontWeight={800} fontSize={15.5} color="warning.main" sx={{ mt: 0.25 }}>
              {formatRupiah(totalPiutang)}
            </Typography>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              Jatuh Tempo
            </Typography>
            <Typography fontWeight={800} fontSize={15.5} color={overdueCount > 0 ? 'error.main' : 'success.main'} sx={{ mt: 0.25 }}>
              {overdueCount} faktur
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Alert severity="info" icon={<LockRoundedIcon fontSize="small" />} sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: 12.5 } }}>
        Verifikasi pelunasan dikelola oleh <b>Finance</b>. Sales dapat memantau piutang, mengunduh PDF faktur, dan menandai penyerahan faktur di outlet.
      </Alert>

      {/* Filter & Pencarian */}
      <Stack spacing={1.25}>
        <TextField
          size="small"
          fullWidth
          placeholder="Cari no. invoice atau nama outlet…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          label="Status Tagihan"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          fullWidth
        >
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="belum">Belum Lunas</MenuItem>
          <MenuItem value="overdue">Jatuh Tempo</MenuItem>
          <MenuItem value="lunas">Lunas</MenuItem>
          <MenuItem value="dibatalkan">Dibatalkan</MenuItem>
        </TextField>
      </Stack>

      {/* Daftar Invoice */}
      {filtered.length ? filtered.map((inv) => {
        const outlet = outletOf(inv.outletId);
        const sisa = Math.max(0, inv.total - paidOf(inv));
        const over = isOverdue(inv);
        const chipStatus = inv.status === 'lunas'
          ? 'yes'
          : inv.status === 'dibatalkan'
            ? 'cancelled'
            : over
              ? 'overdue'
              : paidOf(inv) > 0
                ? 'partial'
                : 'no';

        return (
          <Card
            key={inv.id}
            elevation={0}
            onClick={() => setDetailId(inv.id)}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              border: '1px solid',
              borderColor: over ? 'error.light' : 'divider',
            }}
          >
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Avatar variant="rounded" sx={{ bgcolor: inv.status === 'lunas' ? 'success.main' : 'info.main', width: 38, height: 38, borderRadius: 2 }}>
                  <PaymentsRoundedIcon fontSize="small" sx={{ color: 'common.white' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography fontFamily="monospace" fontWeight={800} fontSize={12.5} noWrap>
                      {inv.no}
                    </Typography>
                    <StatusChip kind="paid" status={chipStatus} />
                  </Stack>
                  <Typography fontWeight={700} fontSize={14} noWrap sx={{ mt: 0.25 }}>
                    {outlet.name || '-'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {syaratLabel(inv)} • Jatuh tempo: {inv.jatuhTempo || 'Sesuai angsuran'}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color={inv.fakturDelivered ? 'success.main' : 'text.secondary'} fontWeight={600}>
                      {inv.fakturDelivered ? '✓ Faktur diserahkan' : 'Faktur belum diserahkan'}
                    </Typography>
                    <Typography fontWeight={800} fontSize={13.5} color={inv.status === 'lunas' ? 'success.main' : 'text.primary'}>
                      {inv.status === 'lunas' ? formatRupiah(inv.total) : `Sisa ${formatRupiah(sisa)}`}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      }) : (
        <EmptyState message="Tidak ada tagihan pelanggan pada filter yang dipilih." />
      )}

      {/* Dialog Detail Invoice Read-Only */}
      <Dialog
        open={Boolean(detailInvoice)}
        onClose={() => setDetailId(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, m: 1.25 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          Detail Tagihan — {detailInvoice?.no}
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2, py: 2 }}>
          {detailInvoice && (
            <Stack spacing={1.75}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                {[
                  { l: 'Outlet', v: outletOf(detailInvoice.outletId).name || '-' },
                  { l: 'No. Order', v: detailInvoice.orderNo || '-' },
                  { l: 'Tanggal Terbit', v: detailInvoice.date },
                  { l: 'Jatuh Tempo', v: detailInvoice.jatuhTempo || 'Sesuai jadwal angsuran' },
                  { l: 'Metode Bayar', v: syaratLabel(detailInvoice) },
                  { l: 'Total Faktur', v: formatRupiah(detailInvoice.total) },
                  { l: 'Sudah Dibayar', v: formatRupiah(paidOf(detailInvoice)) },
                  {
                    l: 'Sisa Tagihan',
                    v: detailInvoice.status === 'lunas'
                      ? 'Rp 0 (Lunas)'
                      : formatRupiah(Math.max(0, detailInvoice.total - paidOf(detailInvoice))),
                  },
                  {
                    l: 'Status Faktur Fisik',
                    v: detailInvoice.fakturDelivered
                      ? `Diserahkan (${detailInvoice.fakturDeliveredAt || '-'})`
                      : 'Belum diserahkan ke toko',
                  },
                ].map((row, idx, arr) => (
                  <Box
                    key={row.l}
                    sx={{
                      px: 1.5,
                      py: 0.9,
                      borderBottom: idx === arr.length - 1 ? 'none' : '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {row.l}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} fontSize={12.5} textAlign="right">
                      {row.v}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Rincian Item */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                  Rincian Produk
                </Typography>
                <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Item</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700 }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detailInvoice.items || []).map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontSize: 12 }}>{it.name}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12 }}>{it.qty} {it.unit}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>{formatRupiah(it.line)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Konfirmasi Penyerahan Faktur di Lapangan (Catatan Integrasi Tabel 1 FSD) */}
              {!detailInvoice.fakturDelivered ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<LocalShippingRoundedIcon />}
                  onClick={() => markInvoiceDelivered(detailInvoice)}
                  sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700 }}
                >
                  Tandai Faktur Telah Diserahkan ke Pelanggan
                </Button>
              ) : (
                <Alert severity="success" icon={<CheckCircleRoundedIcon fontSize="small" />} sx={{ py: 0.5 }}>
                  Faktur telah diserahkan oleh <b>{detailInvoice.fakturDeliveredBy || 'Sales'}</b> pada {detailInvoice.fakturDeliveredAt}.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
          {detailInvoice && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PrintRoundedIcon />}
              onClick={() => {
                const ok = openInvoicePdf(detailInvoice, db);
                if (!ok) toast('Izinkan popup browser untuk mencetak PDF.', 'warning');
              }}
            >
              PDF
            </Button>
          )}
          {detailInvoice && (
            <Button size="small" variant="outlined" onClick={() => shareInvoiceWhatsApp(detailInvoice, db)}>
              WhatsApp
            </Button>
          )}
          <Button size="small" variant="contained" onClick={() => setDetailId(null)} sx={{ ml: 'auto' }}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
