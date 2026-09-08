import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
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

import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import StatusChip from '../ui/StatusChip';
import { nowStamp, formatRupiah, ORDER_STATUS_FLOW } from '../../utils/helpers';

const STATUS_LABEL = {
  submitted: 'Diajukan', approved: 'Disetujui', processing: 'Diproses',
  shipped: 'Dikirim', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan',
};

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.7 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

/* canApprove = true hanya untuk Supervisor (matriks RBAC: lainnya View Only) */
export default function OrderDetailDialog({ open, orderId, onClose, canApprove = false }) {
  const { user } = useAuth();
  const { db, update } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();

  /* Semua hooks di atas — SEBELUM early return */
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonMode, setReasonMode] = useState('reject'); /* 'reject' | 'cancel' */
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); /* 'approve' | 'advance' */

  /* Selalu ambil record TERBARU dari db — tidak menyimpan snapshot basi */
  const order = (db.orders || []).find((o) => o.id === orderId);

  useEffect(() => {
    setReasonOpen(false); setReason(''); setReasonErr(''); setConfirmAction(null);
  }, [orderId]);

  useEffect(() => {
    if (!open) { setReasonOpen(false); setConfirmAction(null); }
  }, [open]);

  if (!order) return null; /* early return SETELAH semua hooks — aman */

  const outlet = (db.outlets || []).find((o) => o.id === order.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === order.salesId)?.name || '-';
  const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === order.salesId);

  /* Alur status linier (#43): maju 1 langkah, tidak bisa melompat */
  const nextStatus = ['approved', 'processing', 'shipped'].includes(order.status)
    ? ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.indexOf(order.status) + 1]
    : null;

  const openReason = (mode) => { setReasonMode(mode); setReason(''); setReasonErr(''); setReasonOpen(true); };

  /* Tolak (#44) & Batalkan (#45) — keduanya WAJIB alasan */
  const submitReason = () => {
    const v = reason.trim();
    if (!v) { setReasonErr('Alasan wajib diisi.'); return; }
    if (reasonMode === 'reject') {
      update('orders', order.id, { status: 'rejected', rejectReason: v, decidedBy: user.name, decidedAt: nowStamp() });
      if (salesUser) notify(salesUser.id, 'Order Ditolak', `${order.no} ditolak: ${v}`);
      toast('Order ditolak.', 'warning');
    } else {
      update('orders', order.id, { status: 'cancelled', cancelReason: v, cancelledBy: user.name, cancelledAt: nowStamp() });
      if (salesUser) notify(salesUser.id, 'Order Dibatalkan', `${order.no} dibatalkan: ${v}`);
      toast('Order dibatalkan.', 'info');
    }
    setReasonOpen(false);
  };

  const doApprove = () => {
    update('orders', order.id, {
      status: 'approved', approvedBy: user.name, approvedAt: nowStamp(),
      forwardedTo: 'Gudang / ERP (simulasi)',
    });
    if (salesUser) notify(salesUser.id, 'Order Disetujui', `${order.no} disetujui & diteruskan ke Gudang/ERP.`);
    toast('Order disetujui & diteruskan ke Gudang/ERP (simulasi).', 'success');
    setConfirmAction(null);
  };

  const doAdvance = () => {
    update('orders', order.id, { status: nextStatus });
    if (salesUser) notify(salesUser.id, 'Status Order Diperbarui', `${order.no} → ${STATUS_LABEL[nextStatus]}.`);
    toast(`Status order: ${STATUS_LABEL[nextStatus]} (alur linier #43).`, 'info');
    setConfirmAction(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Detail Order {order.no}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <KV label="Tanggal" value={order.date} />
            <KV label="Sales" value={salesName} />
            <KV label="Outlet" value={outlet.name || '-'} />
            <KV label="Status" value={(
              <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                <StatusChip kind="order" status={order.status} />
                {order.paid && <StatusChip kind="paid" status="yes" />}
              </Stack>
            )} />
            {order.approvedBy && <KV label="Keputusan" value={`${order.approvedBy} • ${order.approvedAt || ''}`} />}
            {order.forwardedTo && <KV label="Diteruskan ke" value={order.forwardedTo} />}
            {order.rejectReason && <KV label="Alasan Ditolak" value={order.rejectReason} />}
            {order.cancelReason && <KV label="Alasan Dibatalkan" value={order.cancelReason} />}
            {order.paidAt && <KV label="Pembayaran" value={`Lunas • ${order.paidAt} (${order.paidMethod || '-'})`} />}
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produk</TableCell><TableCell align="right">Qty</TableCell>
                <TableCell align="right">Harga</TableCell><TableCell align="right">Jumlah</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((i) => (
                <TableRow key={i.productId}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{i.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{i.sku}</Typography>
                    {i.pcsPerUnit > 1 && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        ≈ {i.qty * i.pcsPerUnit} pcs (konversi satuan #47)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{i.qty} {i.unit}</TableCell>
                  <TableCell align="right">{formatRupiah(i.price)}</TableCell>
                  <TableCell align="right"><b>{formatRupiah(i.line)}</b></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack spacing={0.5} sx={{ mt: 2 }}>
            <KV label="Subtotal" value={formatRupiah(order.subtotal)} />
            <KV label={`PPN ${Math.round((order.taxRate || 0.11) * 100)}%`} value={formatRupiah(order.tax)} />
            <KV label="TOTAL" value={<Typography color="primary" fontWeight={800}>{formatRupiah(order.total)}</Typography>} />
          </Stack>
          {order.note && <Alert severity="info" sx={{ mt: 1.5 }}>📝 {order.note}</Alert>}
        </DialogContent>

        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose}>Tutup</Button>
          {canApprove && order.status === 'submitted' && (
            <>
              <Button color="error" onClick={() => openReason('reject')}>Tolak</Button>
              <Button color="success" variant="contained" onClick={() => setConfirmAction('approve')}>Setujui</Button>
            </>
          )}
          {canApprove && nextStatus && (
            <Button variant="contained" onClick={() => setConfirmAction('advance')}>
              Lanjut ke {STATUS_LABEL[nextStatus]}
            </Button>
          )}
          {canApprove && ['submitted', 'approved'].includes(order.status) && (
            <Button color="warning" onClick={() => openReason('cancel')}>Batalkan</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog alasan — dipakai Tolak & Batalkan */}
      <Dialog open={reasonOpen} onClose={() => setReasonOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{reasonMode === 'reject' ? 'Tolak Order' : 'Batalkan Order'} — {order.no}</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Alasan (wajib — kriteria #44/#45)" multiline minRows={2}
            value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(''); }}
            error={!!reasonErr} helperText={reasonErr || ' '}
            inputProps={{ maxLength: 255 }} autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReasonOpen(false)}>Batal</Button>
          <Button variant="contained" color={reasonMode === 'reject' ? 'error' : 'warning'} onClick={submitReason}>
            {reasonMode === 'reject' ? 'Tolak Order' : 'Batalkan Order'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmAction === 'approve'}
        onClose={() => setConfirmAction(null)}
        onConfirm={doApprove}
        title="Setujui Order"
        message={`Setujui ${order.no} senilai ${formatRupiah(order.total)}? Data akan diteruskan ke Gudang/ERP (simulasi).`}
        confirmLabel="Ya, Setujui" confirmColor="success"
      />
      <ConfirmDialog
        open={confirmAction === 'advance'}
        onClose={() => setConfirmAction(null)}
        onConfirm={doAdvance}
        title="Lanjutkan Status"
        message={`Ubah status ${order.no} menjadi "${nextStatus ? STATUS_LABEL[nextStatus] : '-'}"? Status order hanya bergerak linier maju (kriteria #43).`}
        confirmLabel={nextStatus ? `Ya, Lanjut ke ${STATUS_LABEL[nextStatus]}` : 'Lanjut'}
      />
    </>
  );
}