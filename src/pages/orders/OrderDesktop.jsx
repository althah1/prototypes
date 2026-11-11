import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
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
import Alert from '@mui/material/Alert';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import FilterToolbar from '../../components/ui/FilterToolbar';
import OrderDetailDialog from '../../components/orders/OrderDetailDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { todayISO, formatRupiah } from '../../utils/helpers';

export default function OrderDesktop() {
  const { user } = useAuth();
  const { db } = useDb();
  const canApprove = user.role === 'supervisor';

  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailId, setDetailId] = useState(null);

  const orders = useMemo(() => [...(db.orders || [])].reverse(), [db.orders]);
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const today = todayISO();

  const filtered = useMemo(() => {
    return orders.filter(
      (o) =>
        (statusFilter === 'all' || o.status === statusFilter) &&
        (!dateFilter || o.date === dateFilter) &&
        (!q.trim() ||
          o.no.toLowerCase().includes(q.trim().toLowerCase()) ||
          outletName(o.outletId).toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [orders, statusFilter, dateFilter, q, db.outlets]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  const todayOrders = orders.filter((o) => o.date === today);
  const pendingOrders = orders.filter((o) => o.status === 'submitted');
  const approvedOrders = orders.filter((o) => o.status === 'approved');
  const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  return (
    <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
      <PageHeader
        title="Entry Order"
        subtitle={`Pemantauan transaksi & persetujuan order lapangan${canApprove ? '' : ' (Akses Lihat Saja)'}.`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5, mb: 2.5 }}>
        <StatCard icon={<ReceiptLongRoundedIcon />} value={todayOrders.length} label="Order Hari Ini" />
        <StatCard icon={<ScheduleRoundedIcon />} value={pendingOrders.length} label="Menunggu Approval" color="warning" />
        <StatCard icon={<CheckCircleRoundedIcon />} value={approvedOrders.length} label="Order Disetujui" color="success" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(todayRevenue)} label="Nilai Order Hari Ini" />
      </Box>

      <FilterToolbar
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(0); }}
        searchPlaceholder="Cari no. order atau outlet…"
        shownCount={filtered.length}
        totalCount={orders.length}
        unitLabel="order"
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
          label="Status Order"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ width: 175 }}
        >
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="submitted">Diajukan</MenuItem>
          <MenuItem value="approved">Disetujui</MenuItem>
          <MenuItem value="processing">Diproses</MenuItem>
          <MenuItem value="shipped">Dikirim</MenuItem>
          <MenuItem value="completed">Selesai</MenuItem>
          <MenuItem value="rejected">Ditolak</MenuItem>
          <MenuItem value="cancelled">Dibatalkan</MenuItem>
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
              <TableCell>No. Order</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Sales</TableCell>
              <TableCell>Outlet</TableCell>
              <TableCell align="right">Item</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? (
              paginated.map((o) => (
                <TableRow
                  key={o.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setDetailId(o.id)}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                    {o.no}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {o.date}
                  </TableCell>
                  <TableCell>
                    <Box title={salesName(o.salesId)} sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {salesName(o.salesId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box title={outletName(o.outletId)} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {outletName(o.outletId)}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {o.items?.length || 0}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatRupiah(o.total)}
                  </TableCell>
                  <TableCell>
                    <StatusChip kind="order" status={o.status} />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Lihat Detail Order">
                      <IconButton size="small" onClick={() => setDetailId(o.id)} sx={{ '&:hover': { color: 'primary.main' } }}>
                        <VisibilityRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState message="Tidak ada transaksi order yang sesuai dengan filter." />
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

      <Alert severity="info" sx={{ mt: 2 }}>
        Status order bergerak <b>linier maju</b>: Diajukan → Disetujui → Diproses → Dikirim → Selesai. Pembatalan hanya dapat dilakukan oleh Supervisor saat status masih Diajukan atau Disetujui.
      </Alert>

      <OrderDetailDialog
        open={Boolean(detailId)}
        orderId={detailId}
        onClose={() => setDetailId(null)}
        canApprove={canApprove}
      />
    </Box>
  );
}
