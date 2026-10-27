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
  submitted: 'Diajukan',
  approved: 'Disetujui',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

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

export default function OrderDetailDialog({ open, orderId, onClose, canApprove = false }) {
  const { user } = useAuth();
  const { db, update, mutate, insert } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const isMobile = useLocation().pathname.startsWith('/app');

  const order = (db.orders || []).find((o) => o.id === orderId);

  useEffect(() => {
    setRejectOpen(false);
    setReason('');
    setReasonErr('');
    setConfirmCancel(false);
  }, [orderId]);

  useEffect(() => {
    if (!open) {
      setRejectOpen(false);
      setConfirmCancel(false);
    }
  }, [open]);

  if (!order) return null;

  const outlet = (db.outlets || []).find((o) => o.id === order.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === order.salesId)?.name || '-';
  const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === order.salesId);
  const taxPct = Math.round((order.taxRate || 0.11) * 100);

  const payLabel = (o) => {
    switch (o.metodePembayaran) {
      case 'transfer': {
        const b = (db.banks || []).find((x) => x.id === o.bankId);
        return b ? `Transfer — ${b.nama} (${b.noRekening})` : 'Transfer Bank';
      }
      case 'termin':
        return `Termin ${o.terminHari || 14} hari`;
      case 'cicilan':
        return 'Cicilan';
      case 'konsinyasi':
        return 'Konsinyasi';
      default:
        return 'Tunai (COD)';
    }
  };

  /* Aksi Supervisor */
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
      notify(
        salesUser.id,
        'Order Disetujui',
        `${order.no} disetujui Supervisor${invNo ? ` — invoice ${invNo} terbit` : ''}.`
      );
    }
    toast(invNo ? `Order disetujui — invoice ${invNo} terbit otomatis.` : 'Order disetujui.', 'success');
  };

  const submitReject = () => {
    const v = reason.trim();
    if (!v) { setReasonErr('Alasan penolakan wajib diisi.'); return; }
    if (v.length < 10) { setReasonErr('Alasan penolakan minimal 10 karakter.'); return; }
    update('orders', order.id, { status: 'rejected', rejectReason: v, decidedBy: user.name, decidedAt: nowStamp() });
    restoreStockByOrder(mutate, order.items);
    if (salesUser) notify(salesUser.id, 'Order Ditolak', `${order.no} ditolak: ${v}`);
    toast('Order ditolak.', 'warning');
    setRejectOpen(false);
  };

  const cancelOrder = () => {
    if (!canApprove || !['submitted', 'approved'].includes(order.status)) {
      setConfirmCancel(false);
      return;
    }
    update('orders', order.id, { status: 'cancelled', cancelledBy: user.name, cancelledAt: nowStamp() });
    restoreStockByOrder(mutate, order.items);
    const inv = findInvoiceByOrder(db, order.id);
    if (inv) update('invoices', inv.id, { status: 'dibatalkan', cancelledAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Order Dibatalkan', `${order.no} dibatalkan oleh Supervisor.`);
    toast('Order dibatalkan dan stok gudang telah dipulihkan.', 'warning');
    setConfirmCancel(false);
  };

  const advance = (to) => {
    const extra = to === 'shipped' ? { shippedAt: nowStamp() }
      : to === 'completed' ? { completedAt: nowStamp() } : {};
    update('orders', order.id, { status: to, ...extra });
    toast(`Status ${order.no} → ${STATUS_LABEL[to]}.`, 'success');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 'md' },
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
        <DialogTitle sx={{ fontWeight: 800, pr: isMobile ? 6 : 3, position: 'relative', pb: 1, px: { xs: 2, sm: 3 } }}>
          Detail Order — {order.no}
          {isMobile && (
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Tutup"
              sx={{ position: 'absolute', right: 12, top: 12, bgcolor: 'action.hover' }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent dividers sx={{ overflowX: 'hidden', px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}>
          {/* Status Alerts */}
          {order.status === 'submitted' && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Menunggu persetujuan <b>Supervisor</b> — Admin &amp; Finance hanya dapat memantau data.
            </Alert>
          )}
          {order.status === 'rejected' && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Order ditolak Supervisor — proses tidak dilanjutkan.
            </Alert>
          )}
          {order.status === 'cancelled' && (
            <Alert severity="error" icon={<BlockRoundedIcon fontSize="small" />} sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Order dibatalkan — stok barang telah dikembalikan ke gudang penyimpanan.
            </Alert>
          )}
          {order.status === 'completed' && (
            <Alert severity="success" icon={<CheckCircleRoundedIcon fontSize="small" />} sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Order selesai{order.paid ? ' dan pembayaran sudah lunas.' : ' — menunggu penyelesaian tagihan di modul Billing.'}
            </Alert>
          )}

          {/* GRID 2 KOLOM METADATA */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 3,
              rowGap: 0.5,
              mb: 3,
            }}
          >
            <KV label="No. Pesanan" value={order.no} />
            <KV label="Status Pesanan" value={<StatusChip kind="order" status={order.status} />} />
            <KV label="Tanggal Order" value={order.date} />
            <KV
              label="Status Pembayaran"
              value={
                order.paid ? (
                  <Chip
                    size="small"
                    color="success"
                    icon={<PaymentsRoundedIcon />}
                    label={`Lunas — ${order.paidMethod || 'Terverifikasi'}`}
                    sx={{ height: 22, fontWeight: 700 }}
                  />
                ) : (
                  <Chip size="small" variant="outlined" label="Belum Lunas (Modul Billing)" sx={{ height: 22 }} />
                )
              }
            />
            <KV label="Sales Lapangan" value={salesName} />
            <KV label="Syarat Pembayaran" value={payLabel(order)} />
            <KV label="Outlet Tujuan" value={outlet.name || '-'} />
            {order.approvedBy ? (
              <KV label="Disetujui Oleh" value={`${order.approvedBy} • ${order.approvedAt}`} />
            ) : order.rejectReason ? (
              <KV label="Alasan Ditolak" value={order.rejectReason} />
            ) : (
              <KV label="Alur Approval" value="Menunggu verifikasi supervisor" />
            )}
          </Box>

          {/* Rincian Produk: Mobile Kompak vs Desktop Tabel */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25, fontSize: '0.85rem' }}>
            Rincian Produk Dipesan ({order.items.length} item)
          </Typography>

          {isMobile ? (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {order.items.map((i) => (
                <Box
                  key={i.productId}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography fontWeight={750} fontSize={13.5} noWrap sx={{ flex: 1 }}>
                      {i.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{ fontVariantNumeric: 'tabular-nums', color: 'primary.main', flexShrink: 0 }}
                    >
                      {formatRupiah(i.line)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {i.qty} {i.unit} × {formatRupiah(i.price)}
                      {(i.pcsPerUnit || 1) > 1 ? ` (baseQty: ${i.baseQty || i.qty * (i.pcsPerUnit || 1)} pcs)` : ''}
                    </Typography>
                    {(i.disc || 0) > 0 && (
                      <Chip
                        size="small"
                        label={`Disc ${i.disc}%`}
                        color="warning"
                        sx={{ height: 20, fontSize: '0.675rem', fontWeight: 700, borderRadius: '4px' }}
                      />
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2.5 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Produk</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Harga</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Disc</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Jumlah</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.items.map((i) => (
                  <TableRow key={i.productId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={650}>{i.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{i.sku}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {i.qty} {i.unit}
                      {(i.pcsPerUnit || 1) > 1 && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Setara {i.baseQty || i.qty * (i.pcsPerUnit || 1)} pcs
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(i.price)}</TableCell>
                    <TableCell align="center">{i.disc || 0}%</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      <b>{formatRupiah(i.line)}</b>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Ringkasan Finansial Multi-Kolom */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: (order.discTotal || 0) > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
              },
              gap: 1.5,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              mb: 2,
            }}
          >
            {(order.discTotal || 0) > 0 && (
              <Box>
                <Typography variant="caption" color="warning.dark" fontWeight={700} display="block">TOTAL DISKON</Typography>
                <Typography variant="body2" fontWeight={700} color="warning.dark" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  -{formatRupiah(order.discTotal)}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">SUBTOTAL</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(order.subtotal)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">PPN {taxPct}%</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(order.tax)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="primary.main" fontWeight={800} display="block">TOTAL ORDER</Typography>
              <Typography variant="subtitle1" fontWeight={850} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{formatRupiah(order.total)}</Typography>
            </Box>
          </Box>

          {order.note && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5 }} icon={<NoteRoundedIcon fontSize="small" />}>
              <b>Catatan Pesanan:</b> {order.note}
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5 }} icon={<LockRoundedIcon fontSize="small" />}>
            Harga bersifat <b>snapshot</b> saat dokumen dibuat — perubahan katalog di kemudian hari tidak mengubah nilai pesanan ini.
          </Alert>
        </DialogContent>

        <DialogActions
          sx={
            isMobile
              ? { flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2, px: { xs: 1.5, sm: 3 } }
              : { gap: 1, p: 2, px: { xs: 1.5, sm: 3 } }
          }
        >
          {!isMobile && <Button onClick={onClose}>Tutup</Button>}

          {canApprove && (order.status === 'submitted' || order.status === 'approved') && (
            <Button
              color="error"
              variant="outlined"
              startIcon={<BlockRoundedIcon />}
              onClick={() => setConfirmCancel(true)}
            >
              Batalkan
            </Button>
          )}
          {canApprove && order.status === 'submitted' && (
            <>
              <Button
                color="error"
                startIcon={<CancelRoundedIcon />}
                onClick={() => { setReason(''); setReasonErr(''); setRejectOpen(true); }}
              >
                Tolak Order
              </Button>
              <Button color="success" variant="contained" startIcon={<CheckCircleRoundedIcon />} onClick={approveOrder}>
                Setujui Order
              </Button>
            </>
          )}
          {canApprove && order.status === 'approved' && (
            <Button variant="contained" startIcon={<AutorenewRoundedIcon />} onClick={() => advance('processing')}>
              Proses Order
            </Button>
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

      {/* Dialog Alasan Tolak Order (Supervisor) */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Tolak Order — {order.no}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <TextField
            label="Alasan penolakan (wajib)"
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonErr(''); }}
            error={Boolean(reasonErr)}
            helperText={reasonErr || 'Minimal 10 karakter alasan penolakan.'}
            inputProps={{ maxLength: 255 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRejectOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={submitReject}>
            Tolak Order
          </Button>
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
