import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  Chip,
  TextField
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import StatusChip from '../ui/StatusChip';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import { nowStamp, formatRupiah } from '../../utils/helpers';
import { restoreStockByOrder } from '../../utils/gudangUtils';
import { buildInvoiceFromOrder, genInvoiceNo, findInvoiceByOrder } from '../../utils/invoiceUtils';

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

export default function OrderDetailDialog({
  open,
  orderId,
  order: propOrder,
  onClose,
  canApprove = false
}) {
  const { user } = useAuth();
  const { db, update, mutate, insert } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Toleransi format ID (number vs string)
  const activeId = typeof orderId === 'object' && orderId !== null ? orderId.id : orderId;
  const order = (db.orders || []).find((o) => String(o.id) === String(activeId)) || propOrder;

  useEffect(() => {
    setRejectOpen(false);
    setReason('');
    setReasonErr('');
    setConfirmCancel(false);
  }, [orderId, open]);

  // Dialog Shell Pelindung agar tidak crash dan tidak blank putih
  if (!open) return null;

  if (!order) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Detail Sales Order</DialogTitle>
        <DialogContent dividers sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Data order tidak ditemukan atau telah dihapus.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined">Tutup</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const outlet = (db.outlets || []).find((o) => o.id === order.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === order.salesId)?.name || '-';
  const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === order.salesId);
  const taxPct = Math.round((order.taxRate || 0.11) * 100);

  const approveOrder = () => {
    update('orders', order.id, { status: 'approved', approvedBy: user.name, approvedAt: nowStamp() });
    let invNo = null;
    if (!findInvoiceByOrder(db, order.id)) {
      const inv = buildInvoiceFromOrder(order);
      inv.no = genInvoiceNo(db);
      inv.createdAt = nowStamp();
      insert('invoices', inv);
      invNo = inv.no;
    }
    if (salesUser) {
      notify(salesUser.id, 'Order Disetujui', `${order.no} disetujui Supervisor${invNo ? ` — invoice ${invNo} terbit` : ''}.`);
    }
    toast(invNo ? `Order disetujui — invoice ${invNo} terbit otomatis.` : 'Order disetujui.', 'success');
  };

  const submitReject = () => {
    const v = reason.trim();
    if (!v || v.length < 5) {
      setReasonErr('Alasan penolakan minimal 5 karakter.');
      return;
    }
    update('orders', order.id, { status: 'rejected', rejectReason: v, decidedBy: user.name, decidedAt: nowStamp() });
    restoreStockByOrder(mutate, items);
    if (salesUser) notify(salesUser.id, 'Order Ditolak', `${order.no} ditolak: ${v}`);
    toast('Order ditolak.', 'warning');
    setRejectOpen(false);
  };

  const cancelOrder = () => {
    update('orders', order.id, { status: 'cancelled', cancelledBy: user.name, cancelledAt: nowStamp() });
    restoreStockByOrder(mutate, items);
    const inv = findInvoiceByOrder(db, order.id);
    if (inv) update('invoices', inv.id, { status: 'dibatalkan', cancelledAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Order Dibatalkan', `${order.no} dibatalkan oleh Supervisor.`);
    toast('Order dibatalkan.', 'warning');
    setConfirmCancel(false);
  };

  const advance = (to) => {
    const extra = to === 'shipped' ? { shippedAt: nowStamp() } : to === 'completed' ? { completedAt: nowStamp() } : {};
    update('orders', order.id, { status: to, ...extra });
    toast(`Status order berhasil diperbarui ke ${to}.`, 'success');
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
          Detail Sales Order — {order.no}
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {order.status === 'submitted' && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Menunggu persetujuan <strong>Supervisor</strong> sebelum barang diproses dan dikirimkan.
            </Alert>
          )}

          {/* Grid Metadata 2 Kolom */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 0.5, mb: 3 }}>
            <KV label="Nomor Order" value={order.no} />
            <KV label="Status Pesanan" value={<StatusChip kind="order" status={order.status} />} />
            <KV label="Tanggal Transaksi" value={order.date} />
            <KV label="Sales Penanggung Jawab" value={salesName} />
            <KV label="Outlet Tujuan" value={outlet.name || '-'} />
            <KV label="Syarat Pembayaran" value={order.metodePembayaran?.toUpperCase() || 'TUNAI (COD)'} />
            <KV label="Status Tagihan" value={order.paid ? 'LUNAS' : 'MENUNGGU PEMBAYARAN (BILLING)'} />
            <KV label="Verifikasi" value={order.approvedBy ? `Disetujui: ${order.approvedBy}` : 'Belum Diverifikasi'} />
          </Box>

          {/* Tabel Rincian Produk */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Rincian Produk Dipesan ({items.length} item)
          </Typography>

          <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2.5 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Produk</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Harga</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Diskon</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Jumlah</TableCell>
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

          {/* Ringkasan Total */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, p: 2, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>SUBTOTAL</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatRupiah(order.subtotal || 0)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>PPN {taxPct}%</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>{formatRupiah(order.tax || 0)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block' }}>TOTAL PESANAN</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 850, color: 'primary.main' }}>{formatRupiah(order.total || 0)}</Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 1 }}>Tutup</Button>
          {canApprove && order.status === 'submitted' && (
            <>
              <Button color="error" variant="outlined" onClick={() => setRejectOpen(true)} startIcon={<CancelRoundedIcon />} sx={{ borderRadius: 1 }}>
                Tolak Order
              </Button>
              <Button color="success" variant="contained" onClick={approveOrder} startIcon={<CheckCircleRoundedIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
                Setujui Order
              </Button>
            </>
          )}
          {canApprove && order.status === 'approved' && (
            <Button variant="contained" color="primary" onClick={() => advance('processing')} startIcon={<AutorenewRoundedIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Proses Order
            </Button>
          )}
          {canApprove && order.status === 'processing' && (
            <Button variant="contained" color="primary" onClick={() => advance('shipped')} startIcon={<LocalShippingRoundedIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Tandai Dikirim
            </Button>
          )}
          {canApprove && order.status === 'shipped' && (
            <Button variant="contained" color="success" onClick={() => advance('completed')} startIcon={<DoneAllRoundedIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
              Tandai Selesai
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog Tolak Order */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Tolak Sales Order</DialogTitle>
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
          <Button variant="contained" color="error" onClick={submitReject}>Tolak Order</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
