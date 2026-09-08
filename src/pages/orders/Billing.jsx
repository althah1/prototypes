import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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

import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import { nowStamp, formatRupiah } from '../../utils/helpers';

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.7 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value}</Typography>
  </Stack>
);

export default function Billing() {
  const { user } = useAuth();
  const { db, update } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();
  const isFinance = user.role === 'finance'; /* hanya Finance boleh mencatat pembayaran */

  const [payId, setPayId] = useState(null);
  const [method, setMethod] = useState('Transfer Bank');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');

  /* Invoice = order yang sudah lewat tahap Submitted (tidak ditolak/dibatalkan) */
  const invoices = (db.orders || []).filter((o) => !['submitted', 'rejected', 'cancelled'].includes(o.status));
  const unpaid = invoices.filter((o) => !o.paid);
  const paid = invoices.filter((o) => o.paid);

  const payOrder = invoices.find((o) => o.id === payId);
  const mismatch = payOrder && Number(amount) !== payOrder.total;

  useEffect(() => {
    if (payId) {
      const o = invoices.find((x) => x.id === payId);
      setAmount(o ? String(o.total) : '');
      setMethod('Transfer Bank');
      setErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payId]);

  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';

  const submitPay = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setErr('Nominal diterima wajib diisi.'); return; }
    update('orders', payId, { paid: true, paidAt: nowStamp(), paidMethod: method, paidAmount: amt });
    const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === payOrder.salesId);
    if (salesUser) notify(salesUser.id, 'Pembayaran Diterima', `${payOrder.no} tercatat lunas (${method}).`);
    if (amt !== payOrder.total) {
      toast('⚠️ Nominal tidak cocok dengan total tagihan — mismatch tercatat & notifikasi dikirim (simulasi).', 'warning', 5500);
    } else {
      toast('Pembayaran tercatat.', 'success');
    }
    setPayId(null);
  };

  return (
    <Box>
      <PageHeader
        title="Billing / Penagihan"
        subtitle={`Tagihan dari order yang telah disetujui. ${isFinance ? 'Anda dapat mencatat pembayaran.' : 'View Only sesuai matriks RBAC (#5).'}`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<ReceiptLongRoundedIcon />} value={invoices.length} label="Total invoice" />
        <StatCard icon={<ScheduleRoundedIcon />} value={formatRupiah(unpaid.reduce((s, o) => s + o.total, 0))} label="Belum dibayar" color="warning" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(paid.reduce((s, o) => s + o.total, 0))} label="Sudah lunas" color="success" />
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No. Invoice/Order</TableCell><TableCell>Tanggal</TableCell><TableCell>Outlet</TableCell>
              <TableCell>Sales</TableCell><TableCell align="right">Total</TableCell>
              <TableCell>Status Bayar</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length ? invoices.slice().reverse().map((o) => (
              <TableRow key={o.id}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{o.no}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{o.date}</TableCell>
                <TableCell>{outletName(o.outletId)}</TableCell>
                <TableCell>{salesName(o.salesId)}</TableCell>
                <TableCell align="right"><b>{formatRupiah(o.total)}</b></TableCell>
                <TableCell><StatusChip kind="paid" status={o.paid ? 'yes' : 'no'} /></TableCell>
                <TableCell align="right">
                  {!o.paid && isFinance ? (
                    <Button size="small" variant="contained" color="success" onClick={() => setPayId(o.id)}>Tandai Lunas</Button>
                  ) : '—'}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={7}><EmptyState message="Belum ada invoice dari order yang disetujui." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog catat pembayaran */}
      <Dialog open={!!payId} onClose={() => setPayId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Catat Pembayaran — {payOrder?.no}</DialogTitle>
        <DialogContent dividers>
          <KV label="Total Tagihan" value={formatRupiah(payOrder?.total || 0)} />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField select label="Metode Pembayaran" value={method} onChange={(e) => setMethod(e.target.value)}>
              <MenuItem value="Transfer Bank">Transfer Bank</MenuItem>
              <MenuItem value="Tunai">Tunai</MenuItem>
              <MenuItem value="QRIS">QRIS</MenuItem>
            </TextField>
            <TextField type="number" label="Nominal Diterima (Rp)" value={amount}
              onChange={(e) => { setAmount(e.target.value); setErr(''); }}
              error={!!err} helperText={err || ' '} inputProps={{ min: 0 }} />
            {mismatch && (
              <Alert severity="warning">
                Nominal berbeda dengan total tagihan — akan dicatat sebagai <b>mismatch</b> dan notifikasi dikirim.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayId(null)}>Batal</Button>
          <Button variant="contained" color="success" onClick={submitPay}>Simpan Pembayaran</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}