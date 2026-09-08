import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import OrderDetailDialog from '../../components/orders/OrderDetailDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { todayISO, formatRupiah } from '../../utils/helpers';

export default function OrderDesktop() {
  const { user } = useAuth();
  const { db } = useDb();
  const canApprove = user.role === 'supervisor'; /* matriks RBAC: Admin/Finance = View Only */

  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);

  const orders = [...(db.orders || [])].reverse();
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const today = todayISO();

  const filtered = orders.filter((o) =>
    (statusFilter === 'all' || o.status === statusFilter) &&
    (!dateFilter || o.date === dateFilter) &&
    (!q.trim() ||
      o.no.toLowerCase().includes(q.trim().toLowerCase()) ||
      outletName(o.outletId).toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <Box>
      <PageHeader
        title="Entry Order"
        subtitle={`Pemantauan transaksi & persetujuan order lapangan${canApprove ? '' : ' (View Only — matriks RBAC #5)'}.`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<ReceiptLongRoundedIcon />} value={(db.orders || []).filter((o) => o.date === today).length} label="Order hari ini" />
        <StatCard icon={<ScheduleRoundedIcon />} value={(db.orders || []).filter((o) => o.status === 'submitted').length} label="Menunggu approval" color="warning" />
        <StatCard icon={<CheckCircleRoundedIcon />} value={(db.orders || []).filter((o) => o.status === 'approved').length} label="Disetujui" color="success" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah((db.orders || []).filter((o) => o.date === today).reduce((s, o) => s + o.total, 0))} label="Nilai order hari ini" />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        <TextField select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="submitted">Diajukan</MenuItem>
          <MenuItem value="approved">Disetujui</MenuItem>
          <MenuItem value="processing">Diproses</MenuItem>
          <MenuItem value="shipped">Dikirim</MenuItem>
          <MenuItem value="completed">Selesai</MenuItem>
          <MenuItem value="rejected">Ditolak</MenuItem>
          <MenuItem value="cancelled">Dibatalkan</MenuItem>
        </TextField>
        <TextField type="date" label="Tanggal" value={dateFilter} InputLabelProps={{ shrink: true }}
          onChange={(e) => setDateFilter(e.target.value)} sx={{ minWidth: 160 }} />
        <TextField label="Cari no. order / outlet…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 240 }} />
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No. Order</TableCell><TableCell>Tanggal</TableCell><TableCell>Sales</TableCell>
              <TableCell>Outlet</TableCell><TableCell align="right">Item</TableCell><TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.map((o) => (
              <TableRow key={o.id} sx={{ cursor: 'pointer' }} onClick={() => setDetailId(o.id)}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{o.no}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{o.date}</TableCell>
                <TableCell>{salesName(o.salesId)}</TableCell>
                <TableCell>{outletName(o.outletId)}</TableCell>
                <TableCell align="right">{o.items.length}</TableCell>
                <TableCell align="right"><b>{formatRupiah(o.total)}</b></TableCell>
                <TableCell><StatusChip kind="order" status={o.status} /></TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="Detail"><IconButton size="small" onClick={() => setDetailId(o.id)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={8}><EmptyState message="Tidak ada order sesuai filter." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 2 }}>
        Status order bergerak <b>linier maju</b>: Submitted → Approved → Processing → Shipped → Completed (#43).
        Pembatalan hanya oleh Supervisor saat status masih <b>Submitted/Approved</b> (#45).
      </Alert>

      <OrderDetailDialog open={!!detailId} orderId={detailId} onClose={() => setDetailId(null)} canApprove={canApprove} />
    </Box>
  );
}