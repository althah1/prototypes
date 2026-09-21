import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';

import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatusChip from '../../components/ui/StatusChip';
import { nowStamp, formatRupiah } from '../../utils/helpers';

const STATUS_LABEL = {
  submitted: 'Diajukan', approved: 'Disetujui', processing: 'Diproses',
  shipped: 'Dikirim', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan',
};

/* component="div" pada nilai → chip/typography bersarang tidak memicu
   warning validateDOMNesting (div/p dalam <p>). */
const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center"
    sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.7 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} component="div" sx={{ textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

/*
 * OrderDetailDialog — dipakai OrderDesktop (canApprove untuk Supervisor)
 * & OrderMobile (Sales: view-only). Admin/Finance View Only (RBAC #5).
 * Status bergerak linier maju (#43); tolak saat Submitted; batalkan oleh
 * Supervisor saat Submitted/Approved (#45). Pembayaran ditandai di modul Billing.
 */
export default function OrderDetailDialog({ open, orderId, onClose, canApprove = false }) {
  const { user } = useAuth();
  const { db, update } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();

  /* Semua hooks di paling atas — sebelum early return */
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  const order = (db.orders || []).find((o) => o.id === orderId);

  useEffect(() => {
    setRejectOpen(false); setReason(''); setReasonErr(''); setConfirmCancel(false);
  }, [orderId]);

  useEffect(() => {
    if (!open) { setRejectOpen(false); setConfirmCancel(false); }
  }, [open]);

  if (!order) return null; /* early return SETELAH semua hooks — aman */

  const outlet = (db.outlets || []).find((o) => o.id === order.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === order.salesId)?.name || '-';
  const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === order.salesId);
  const taxPct = Math.round((order.taxRate || 0.11) * 100);

  /* ---------- Aksi Supervisor ---------- */
  const approveOrder = () => {
    update('orders', order.id, { status: 'approved', approvedBy: user.name, approvedAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Order Disetujui', `${order.no} disetujui Supervisor — siap diproses.`);
    toast('Order disetujui.', 'success');
  };

  const submitReject = () => {
    const v = reason.trim();
    if (!v) { setReasonErr('Alasan penolakan wajib diisi.'); return; }
    if (v.length < 10) { setReasonErr('Alasan penolakan minimal 10 karakter.'); return; }
    update('orders', order.id, { status: 'rejected', rejectReason: v, decidedBy: user.name, decidedAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Order Ditolak', `${order.no} ditolak: ${v}`);
    toast('Order ditolak.', 'warning');
    setRejectOpen(false);
  };

  const cancelOrder = () => {
    update('orders', order.id, { status: 'cancelled', cancelledBy: user.name, cancelledAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Order Dibatalkan', `${order.no} dibatalkan oleh Supervisor (#45).`);
    toast('Order dibatalkan (hanya Supervisor, status Submitted/Approved — #45).', 'warning');
    setConfirmCancel(false);
  };

  /* Maju linier: approved → processing → shipped → completed (#43) */
  const advance = (to) => {
    const extra = to === 'shipped' ? { shippedAt: nowStamp() }
      : to === 'completed' ? { completedAt: nowStamp() } : {};
    update('orders', order.id, { status: to, ...extra });
    toast(`Status ${order.no} → ${STATUS_LABEL[to]} (#43).`, 'success');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Detail Order {order.no}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <KV label="Tanggal" value={order.date} />
            <KV label="Sales" value={salesName} />
            <KV label="Outlet" value={outlet.name || '-'} />
            <KV label="Status" value={<StatusChip kind="order" status={order.status} />} />
            {order.approvedBy && <KV label="Disetujui oleh" value={`${order.approvedBy} • ${order.approvedAt}`} />}
            {order.rejectReason && <KV label="Alasan Ditolak" value={order.rejectReason} />}
            <KV label="Pembayaran" value={order.paid
              ? <Chip size="small" color="success" icon={<PaymentsRoundedIcon />} label={`Lunas — ${order.paidMethod || '-'} • ${order.paidAt || '-'}`} />
              : <Chip size="small" variant="outlined" label="Belum dibayar — ditandai di modul Billing" />} />
          </Stack>

          {order.status === 'submitted' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Menunggu persetujuan Supervisor — Admin &amp; Finance View Only (matriks RBAC #5).
            </Alert>
          )}
          {order.status === 'rejected' && (
            <Alert severity="error" sx={{ mb: 2 }}>Order ditolak Supervisor — tidak diproses lebih lanjut.</Alert>
          )}
          {order.status === 'cancelled' && (
            <Alert severity="error" icon={<BlockRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
              Order dibatalkan — pembatalan hanya oleh Supervisor saat status Submitted/Approved (#45).
            </Alert>
          )}
          {order.status === 'completed' && (
            <Alert severity="success" icon={<CheckCircleRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
              Order selesai{order.paid ? ' dan sudah dibayar' : ' — tagihan belum lunas (modul Billing)'}.
            </Alert>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produk</TableCell><TableCell align="right">Qty</TableCell>
                <TableCell align="right">Harga</TableCell><TableCell align="center">Disc</TableCell>
                <TableCell align="right">Jumlah</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((i) => (
                <TableRow key={i.productId}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{i.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{i.sku}</Typography>
                  </TableCell>
                  <TableCell align="right">{i.qty} {i.unit}</TableCell>
                  <TableCell align="right">{formatRupiah(i.price)}</TableCell>
                  <TableCell align="center">{i.disc || 0}%</TableCell>
                  <TableCell align="right"><b>{formatRupiah(i.line)}</b></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack spacing={0.5} sx={{ mt: 2 }}>
            <KV label="Subtotal" value={formatRupiah(order.subtotal)} />
            <KV label={`PPN ${taxPct}%`} value={formatRupiah(order.tax)} />
            <KV label="TOTAL" value={<Typography color="primary" fontWeight={800}>{formatRupiah(order.total)}</Typography>} />
          </Stack>

          {order.note && (
            <Alert severity="info" sx={{ mt: 1.5 }} icon={<NoteRoundedIcon fontSize="small" />}>{order.note}</Alert>
          )}
          <Alert severity="info" sx={{ mt: 1.5 }} icon={<LockRoundedIcon fontSize="small" />}>
            Harga merupakan <b>snapshot</b> saat order dibuat — perubahan Master Data tidak mengubah dokumen.
          </Alert>
        </DialogContent>

        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose}>Tutup</Button>

          {canApprove && order.status === 'submitted' && (
            <>
              <Button color="error" startIcon={<CancelRoundedIcon />}
                onClick={() => { setReason(''); setReasonErr(''); setRejectOpen(true); }}>Tolak Order</Button>
              <Button color="success" variant="contained" startIcon={<CheckCircleRoundedIcon />} onClick={approveOrder}>
                Setujui Order
              </Button>
            </>
          )}
          {canApprove && order.status === 'approved' && (
            <>
              <Button color="error" startIcon={<BlockRoundedIcon />} onClick={() => setConfirmCancel(true)}>Batalkan</Button>
              <Button variant="contained" startIcon={<AutorenewRoundedIcon />} onClick={() => advance('processing')}>
                Proses Order
              </Button>
            </>
          )}
          {canApprove && order.status === 'processing' && (
            <Button variant="contained" startIcon={<LocalShippingRoundedIcon />} onClick={() => advance('shipped')}>
              Tandai Dikirim
            </Button>
          )}
          {canApprove && order.status === 'shipped' && (
            <Button variant="contained" color="success" startIcon={<DoneAllRoundedIcon />} onClick={() => advance('completed')}>
              Tandai Selesai
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog alasan tolak order (Supervisor) */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Tolak Order — {order.no}</DialogTitle>
        <DialogContent dividers>
          <TextField label="Alasan penolakan (wajib)" multiline minRows={2} value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonErr(''); }}
            error={!!reasonErr} helperText={reasonErr || ' '}
            inputProps={{ maxLength: 255 }} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={submitReject}>Tolak Order</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancelOrder}
        title="Batalkan Order"
        message={`Batalkan ${order.no}? Pembatalan hanya diizinkan Supervisor saat status Submitted/Approved (#45). Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Batalkan"
        confirmColor="error"
      />
    </>
  );
}