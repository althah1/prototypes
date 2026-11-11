import { useEffect, useMemo, useRef, useState } from 'react';
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
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import FilterToolbar from '../../components/ui/FilterToolbar';
import QuoteDetailDialog from '../../components/quotes/QuoteDetailDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { formatRupiah } from '../../utils/helpers';
import { expireQuotes, maxDiscountOf } from '../../utils/quoteUtils';

export default function QuoteDesktop() {
  const { user } = useAuth();
  const { db, mutate } = useDb();
  const { toast } = useToast();
  const canApproveDiscount = user.role === 'supervisor';

  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailId, setDetailId] = useState(null);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireQuotes(db, mutate);
    if (n) toast(`${n} quotation kedaluwarsa otomatis ditandai Expired.`, 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quotes = useMemo(() => [...(db.quotations || [])].reverse(), [db.quotations]);
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';

  const filtered = useMemo(() => {
    return quotes.filter(
      (qt) =>
        (statusFilter === 'all' || qt.status === statusFilter) &&
        (!dateFilter || qt.date === dateFilter) &&
        (!q.trim() ||
          qt.no.toLowerCase().includes(q.trim().toLowerCase()) ||
          outletName(qt.outletId).toLowerCase().includes(q.trim().toLowerCase()))
    );
  }, [quotes, statusFilter, dateFilter, q, db.outlets]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  const approvedQuotes = quotes.filter((x) => x.status === 'approved');
  const approvedTotal = approvedQuotes.reduce((s, x) => s + (Number(x.total) || 0), 0);

  return (
    <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
      <PageHeader
        title="Quotation"
        subtitle={`Monitoring riwayat penawaran resmi${canApproveDiscount ? ' & persetujuan diskon supervisor' : ' (Akses Lihat Saja)'}.`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 2.5 }}>
        <StatCard icon={<DescriptionRoundedIcon />} value={quotes.length} label="Total Penawaran" />
        <StatCard icon={<ScheduleRoundedIcon />} value={quotes.filter((x) => x.status === 'draft').length} label="Draft" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={quotes.filter((x) => x.status === 'pending_approval').length} label="Menunggu Approval" color="warning" />
        <StatCard icon={<SendRoundedIcon />} value={quotes.filter((x) => x.status === 'sent').length} label="Terkirim" color="info" />
        <StatCard icon={<CheckCircleRoundedIcon />} value={approvedQuotes.length} label="Disetujui" color="success" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(approvedTotal)} label="Nilai Disetujui" />
      </Box>

      <FilterToolbar
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(0); }}
        searchPlaceholder="Cari no. quotation atau outlet…"
        shownCount={filtered.length}
        totalCount={quotes.length}
        unitLabel="quotation"
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
          label="Status Penawaran"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ width: 185 }}
        >
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="pending_approval">Menunggu Approval</MenuItem>
          <MenuItem value="sent">Terkirim</MenuItem>
          <MenuItem value="approved">Disetujui</MenuItem>
          <MenuItem value="rejected">Ditolak</MenuItem>
          <MenuItem value="expired">Kadaluarsa</MenuItem>
          <MenuItem value="converted">Jadi Order</MenuItem>
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
              <TableCell>No. Quotation</TableCell>
              <TableCell>Tanggal</TableCell>
              <TableCell>Sales</TableCell>
              <TableCell>Outlet</TableCell>
              <TableCell>Berlaku s.d</TableCell>
              <TableCell align="center">Diskon Maks</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? (
              paginated.map((qt) => {
                const md = maxDiscountOf(qt.items);
                return (
                  <TableRow
                    key={qt.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => setDetailId(qt.id)}
                  >
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                      {qt.no}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {qt.date}
                    </TableCell>
                    <TableCell>
                      <Box title={salesName(qt.salesId)} sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {salesName(qt.salesId)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box title={outletName(qt.outletId)} sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {outletName(qt.outletId)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {qt.validUntil}
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      {md > 0 ? (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <StatusChip kind="quote" status={md > 10 ? 'pending_approval' : 'draft'} label={`${md}%`} />
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatRupiah(qt.total)}
                    </TableCell>
                    <TableCell>
                      <StatusChip kind="quote" status={qt.status} />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Lihat Detail Quotation">
                        <IconButton size="small" onClick={() => setDetailId(qt.id)} sx={{ '&:hover': { color: 'primary.main' } }}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="Tidak ada dokumen quotation yang sesuai dengan filter." />
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

      <Alert severity="info" sx={{ mt: 2 }} icon={<LockRoundedIcon fontSize="small" />}>
        Harga quotation merupakan <b>snapshot harga terkunci</b> saat penawaran dibuat. Perubahan harga pada master data produk tidak akan mengubah nominal dokumen yang telah terbit.
      </Alert>

      <QuoteDetailDialog
        open={Boolean(detailId)}
        quoteId={detailId}
        onClose={() => setDetailId(null)}
        canApproveDiscount={canApproveDiscount}
      />
    </Box>
  );
}
