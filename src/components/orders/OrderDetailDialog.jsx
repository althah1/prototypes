import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
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
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
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
import { restoreStockByOrder } from '../../utils/gudangUtils';
import { buildInvoiceFromOrder, genInvoiceNo, findInvoiceByOrder } from '../../utils/invoiceUtils';

const STATUS_LABEL = {
  submitted: 'Diajukan', approved: 'Disetujui', processing: 'Diproses',
  shipped: 'Dikirim', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan',
};

/* component="div" pada nilai → chip/typography bersarang tidak memicu
   warning validateDOMNesting (div/p dalam <p>). */
const KV = ({ label, value }) => (
  <Stack sx={{ py: 0.5 }}>
    <Typography variant="caption" color="text.secondary"
      sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10.5, mb: 0.4, display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600} component="div"
      sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.25, py: 0.75, overflowWrap: 'anywhere', display: 'block' }}>
      {value}
    </Typography>
  </Stack>
);

/*
 * OrderDetailDialog — dipakai OrderDesktop (canApprove Supervisor) & OrderMobile
 * (Sales: view-only). Admin/Finance view-only. Status bergerak linier maju;
 * tolak saat Submitted; batalkan Supervisor saat Submitted/Approved. Invoice
 * terbit otomatis saat approval; stok dikembalikan saat tolak/batalkan.
 *
 * DESAIN RESPONSIF BERBASIS ROUTE (bukan ukuran layar): mobile (/app) menutup
 * via tombol X di pojok judul (hemat ruang bawah untuk tombol aksi); desktop
 * menutup via tombol Tutup di bawah (judul bersih). Deteksi route benar
 * walau tampilan mobile dibuka di browser desktop.
 */
export default function OrderDetailDialog({ open, orderId, onClose, canApprove = false }) {
  const { user } = useAuth();
  const { db, update, mutate, insert } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();

  /* Semua hooks di paling atas — sebelum early return */
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isMobile = useLocation().pathname.startsWith('/app');

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

  /* Metode pembayaran (terbawa dari quotation saat konversi) */
  const payLabel = (o) => {
    switch (o.metodePembayaran) {
      case 'transfer': {
        const b = (db.banks || []).find((x) => x.id === o.bankId);
        return b ? `Transfer — ${b.nama} (${b.noRekening})` : 'Transfer Bank';
      }
      case 'termin': return `Termin ${o.terminHari || 14} hari`;
      case 'cicilan': return 'Cicilan';
      case 'konsinyasi': return 'Konsinyasi';
      default: return 'Tunai (COD)';
    }
  };

  /* ---------- Aksi Supervisor ---------- */
  const approveOrder = () => {
    update('orders', order.id, { status: 'approved', approvedBy: user.name, approvedAt: nowStamp() });

    /* Langkah 1 alur tim: invoice terbit OTOMATIS saat transaksi disetujui (BR-INV-001/002) */
    let invNo = null;
    if (!findInvoiceByOrder(db, order.id)) {
      const inv = buildInvoiceFromOrder(order);
      inv.no = genInvoiceNo(db);
      inv.createdAt = nowStamp();
      insert('invoices', inv);
      invNo = inv.no;
    }
    if (salesUser) notify(salesUser.id, 'Order Disetujui',
      `${order.no} disetujui Supervisor${invNo ? ` — invoice ${invNo} terbit` : ''}.`);
    toast(invNo ? `Order disetujui — invoice ${invNo} terbit otomatis.` : 'Order disetujui.', 'success');
  };

  const submitReject = () => {
    const v = reason.trim();
    if (!v) { setReasonErr('Alasan penolakan wajib diisi.'); return; }
    if (v.length < 10) { setReasonErr('Alasan penolakan minimal 10 karakter.'); return; }
    update('orders', order.id, { status: 'rejected', rejectReason: v, decidedBy: user.name, decidedAt: nowStamp() });
    restoreStockByOrder(mutate, order.items); /* stok dikembalikan ke gudang */
    if (salesUser) notify(salesUser.id, 'Order Ditolak', `${order.no} ditolak: ${v}`);
    toast('Order ditolak.', 'warning');
    setRejectOpen(false);
  };

  const cancelOrder = () => {
    update('orders', order.id, { status: 'cancelled', cancelledBy: user.name, cancelledAt: nowStamp() });
    restoreStockByOrder(mutate, order.items); /* stok dikembalikan ke gudang */
    /* Order dibatalkan setelah approved → invoice ikut Dibatalkan */
    const inv = findInvoiceByOrder(db, order.id);
    if (inv) update('invoices', inv.id, { status: 'dibatalkan', cancelledAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Order Dibatalkan', `${order.no} dibatalkan oleh Supervisor.`);
    toast('Order dibatalkan (hanya Supervisor, status Submitted/Approved).', 'warning');
    setConfirmCancel(false);
  };

  /* Maju linier: approved → processing → shipped → completed */
  const advance = (to) => {
    const extra = to === 'shipped' ? { shippedAt: nowStamp() }
      : to === 'completed' ? { completedAt: nowStamp() } : {};
    update('orders', order.id, { status: to, ...extra });
    toast(`Status ${order.no} → ${STATUS_LABEL[to]}.`, 'success');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, pr: isMobile ? 6 : 3, position: 'relative' }}>
          Detail Order {order.no}
          {isMobile && (
            <IconButton onClick={onClose} size="small" aria-label="Tutup"
              sx={{ position: 'absolute', right: 12, top: 12 }}>
              <CloseRoundedIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <KV label="Tanggal" value={order.date} />
            <KV label="Sales" value={salesName} />
            <KV label="Outlet" value={outlet.name || '-'} />
            <KV label="Status" value={<StatusChip kind="order" status={order.status} />} />
            {order.approvedBy && <KV label="Disetujui oleh" value={`${order.approvedBy} • ${order.approvedAt}`} />}
            {order.rejectReason && <KV label="Alasan Ditolak" value={order.rejectReason} />}
            {order.metodePembayaran && <KV label="Metode Pembayaran" value={payLabel(order)} />}
            <KV label="Pembayaran" value={order.paid
              ? <Chip size="small" color="success" icon={<PaymentsRoundedIcon />} label={`Lunas — ${order.paidMethod || '-'} • ${order.paidAt || '-'}`} />
              : <Chip size="small" variant="outlined" label="Belum dibayar — ditandai di modul Billing" />} />
          </Stack>

          {order.status === 'submitted' && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Menunggu persetujuan Supervisor — Admin &amp; Finance hanya dapat melihat.
            </Alert>
          )}
          {order.status === 'rejected' && (
            <Alert severity="error" sx={{ mb: 2 }}>Order ditolak Supervisor — tidak diproses lebih lanjut.</Alert>
          )}
          {order.status === 'cancelled' && (
            <Alert severity="error" icon={<BlockRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
              Order dibatalkan — pembatalan hanya oleh Supervisor saat status Submitted/Approved.
            </Alert>
          )}
          {order.status === 'completed' && (
            <Alert severity="success" icon={<CheckCircleRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
              Order selesai{order.paid ? ' dan sudah dibayar' : ' — tagihan belum lunas (modul Billing)'}.
            </Alert>
          )}

          {/* Rincian item — gaya keranjang (konsisten dengan review mobile) */}
          <Stack spacing={1}>
            {order.items.map((i) => (
              <Box key={i.productId} sx={{ borderBottom: '1px dashed', borderColor: 'divider', pb: 1, '&:last-child': { borderBottom: 0, pb: 0 } }}>
                <Typography fontWeight={700} fontSize={13} noWrap sx={{ mb: 0.25 }}>
                  {i.name}
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {i.qty} {i.unit} × {formatRupiah(i.price)}{(i.disc || 0) > 0 ? ` (disc ${i.disc}%)` : ''}
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                    {formatRupiah(i.line)}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>

          <Stack spacing={0.5} sx={{ mt: 1.5 }}>
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

        <DialogActions sx={isMobile
          ? { flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2 }
          : { gap: 1, p: 2 }}>
          {!isMobile && <Button onClick={onClose}>Tutup</Button>}

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
        PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle>Tolak Order — {order.no}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
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
        message={`Batalkan ${order.no}? Pembatalan hanya diizinkan Supervisor saat status Submitted/Approved. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Batalkan"
        confirmColor="error"
      />
    </>
  );
}