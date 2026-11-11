import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  Chip,
  Stack,
  TextField
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';
import StatusChip from '../ui/StatusChip';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import { todayISO, nowStamp, formatRupiah, QUOTE_DISCOUNT_LIMIT } from '../../utils/helpers';
import { reduceStockByOrder } from '../../utils/gudangUtils';

const KV = ({ label, value }) => (
  <Box sx={{ py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.675rem', textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ fontWeight: 600, fontSize: '0.825rem', color: 'text.primary' }}>
      {value}
    </Typography>
  </Box>
);

export default function QuoteDetailDialog({
  open,
  quoteId,
  quote: propQuote,
  onClose,
  salesActions = false,
  canApproveDiscount = false
}) {
  const { user } = useAuth();
  const { db, update, mutate } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();
  const navigate = useNavigate();
  const isMobile = typeof window !== 'undefined' && window.location.pathname.startsWith('/app');

  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');

  // Toleransi format ID (number vs string)
  const activeId = typeof quoteId === 'object' && quoteId !== null ? quoteId.id : quoteId;
  const quote = (db.quotations || []).find((q) => String(q.id) === String(activeId)) || propQuote;

  useEffect(() => {
    setRejectOpen(false);
    setReason('');
    setReasonErr('');
    setConfirmApprove(false);
    setConfirmConvert(false);
  }, [quoteId, open]);

  // Dialog Shell Pelindung agar tidak crash dan tidak blank putih
  if (!open) return null;

  if (!quote) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Detail Quotation</DialogTitle>
        <DialogContent dividers sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Data quotation tidak ditemukan atau telah kedaluwarsa.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">Tutup</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const items = Array.isArray(quote.items) ? quote.items : [];
  const outlet = (db.outlets || []).find((o) => o.id === quote.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === quote.salesId)?.name || '-';
  const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === quote.salesId);
  const isExpired = quote.validUntil && quote.validUntil < todayISO();

  // FIX FATAL ERROR: Hitung diskon maksimal dari items (bukan quote object)
  const maxDisc = items.reduce((m, i) => Math.max(m, Number(i.disc) || 0), 0);
  const overLimit = maxDisc > QUOTE_DISCOUNT_LIMIT;
  const taxPct = Math.round((quote.taxRate || 0.11) * 100);

  const spvApprove = () => {
    update('quotations', quote.id, {
      status: 'sent',
      spvApprovedAt: nowStamp(),
      spvApprovedBy: user.name,
      sentAt: nowStamp()
    });
    if (salesUser) {
      notify(salesUser.id, 'Quotation Disetujui Supervisor', `${quote.no} disetujui — dapat dikirimkan ke pelanggan.`);
    }
    toast('Quotation disetujui oleh Supervisor.', 'success');
  };

  const submitSpvReject = () => {
    const v = reason.trim();
    if (!v || v.length < 5) {
      setReasonErr('Catatan penolakan minimal 5 karakter.');
      return;
    }
    update('quotations', quote.id, {
      status: 'rejected',
      rejectReason: v,
      decidedBy: user.name,
      decidedAt: nowStamp()
    });
    if (salesUser) notify(salesUser.id, 'Quotation Ditolak', `${quote.no} ditolak: ${v}`);
    toast('Quotation ditolak.', 'warning');
    setRejectOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 2 }}>
          Detail Quotation — {quote.no}
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {isExpired && quote.status !== 'converted' && (
            <Alert severity="error" icon={<EventBusyRoundedIcon fontSize="small" />} sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Masa berlaku penawaran telah berakhir pada <strong>{quote.validUntil}</strong>. Dokumen tidak dapat disetujui pelanggan.
            </Alert>
          )}

          {quote.status === 'pending_approval' && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Menunggu persetujuan <strong>Supervisor</strong> sebelum diajukan ke pelanggan.
              {overLimit ? ` Diskon ${maxDisc}% melebihi batas wewenang ${QUOTE_DISCOUNT_LIMIT}%.` : ''}
            </Alert>
          )}

          {/* Grid Informasi Metadata */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 0.5, mb: 3 }}>
            <KV label="Nomor Dokumen" value={quote.no} />
            <KV label="Status Dokumen" value={<StatusChip kind="quote" status={quote.status} />} />
            <KV label="Tanggal Diterbitkan" value={quote.date} />
            <KV label="Berlaku Sampai" value={quote.validUntil || '-'} />
            <KV label="Sales Penanggung Jawab" value={salesName} />
            <KV label="Outlet Pelanggan" value={outlet.name || '-'} />
            <KV label="Metode Pembayaran" value={quote.metodePembayaran?.toUpperCase() || 'TUNAI (COD)'} />
            <KV label="Catatan Diskon" value={overLimit ? `Diskon Tertinggi: ${maxDisc}% (Perlu Izin)` : `Diskon Normal: ${maxDisc}%`} />
          </Box>

          {/* Tabel Rincian Produk */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Rincian Item Penawaran ({items.length} produk)
          </Typography>

          <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2.5 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Produk</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Harga Satuan</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Diskon</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => (
                <TableRow key={it.productId || idx}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>{it.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{it.sku}</Typography>
                  </TableCell>
                  <TableCell align="right">{it.qty} {it.unit}</TableCell>
                  <TableCell align="right">{formatRupiah(it.price)}</TableCell>
                  <TableCell align="center">{it.disc || 0}%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatRupiah(it.line)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Ringkasan Finansial */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, p: 2, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>SUBTOTAL</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatRupiah(quote.subtotal || 0)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>PPN {taxPct}%</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatRupiah(quote.tax || 0)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block' }}>TOTAL PENAWARAN</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 850, color: 'primary.main' }}>{formatRupiah(quote.total || 0)}</Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 1 }}>Tutup</Button>
          {canApproveDiscount && quote.status === 'pending_approval' && (
            <>
              <Button color="error" variant="outlined" onClick={() => setRejectOpen(true)} startIcon={<CancelRoundedIcon />} sx={{ borderRadius: 1 }}>
                Tolak Diskon
              </Button>
              <Button color="success" variant="contained" onClick={spvApprove} startIcon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Setujui Diskon
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog Tolak Penawaran */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Tolak Penawaran / Diskon</DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <TextField
            label="Alasan Penolakan"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            error={Boolean(reasonErr)}
            helperText={reasonErr}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'flex-end' }}>
          <Button onClick={() => setRejectOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={submitSpvReject}>Tolak</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
