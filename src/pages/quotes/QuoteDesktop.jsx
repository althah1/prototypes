import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
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
  const canApproveDiscount = user.role === 'supervisor'; /* Admin = View Only (RBAC #5) */

  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);

  /* #54 — auto-expire saat halaman dibuka (sekali) */
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireQuotes(db, mutate);
    if (n) toast(`${n} quotation kedaluwarsa otomatis ditandai Expired (#54).`, 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quotes = [...(db.quotations || [])].reverse();
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';

  const filtered = quotes.filter((qt) =>
    (statusFilter === 'all' || qt.status === statusFilter) &&
    (!dateFilter || qt.date === dateFilter) &&
    (!q.trim() ||
      qt.no.toLowerCase().includes(q.trim().toLowerCase()) ||
      outletName(qt.outletId).toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <Box>
      <PageHeader
        title="Quotation"
        subtitle={`Monitoring riwayat penawaran${canApproveDiscount ? ' + approval diskon melebihi wewenang (#53)' : ' — akses View Only (matriks RBAC #5)'}.`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<DescriptionRoundedIcon />} value={quotes.length} label="Total quotation" />
        <StatCard icon={<ScheduleRoundedIcon />} value={quotes.filter((x) => x.status === 'draft').length} label="Draft" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={quotes.filter((x) => x.status === 'pending_approval').length} label="Menunggu" color="warning" />
        <StatCard icon={<SendRoundedIcon />} value={quotes.filter((x) => x.status === 'sent').length} label="Terkirim" color="info" />
        <StatCard icon={<CheckCircleRoundedIcon />} value={quotes.filter((x) => x.status === 'approved').length} label="Disetujui" color="success" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(quotes.filter((x) => x.status === 'approved').reduce((s, x) => s + x.total, 0))} label="Nilai disetujui" />
      </Box>

      {/* ============ Toolbar Filter: Tanggal + Status + Pencarian ============ */}
<Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
      <FilterListRoundedIcon fontSize="small" />
      <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
    </Stack>

    <TextField
      size="small"
      type="date"
      label="Tanggal"
      value={dateFilter}
      InputLabelProps={{ shrink: true }}
      onChange={(e) => setDateFilter(e.target.value)}
      sx={{ width: 170 }}
    />

    <TextField
      size="small"
      select
      label="Status"
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      sx={{ width: 190 }}
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

    <TextField
      size="small"
      label="Cari no. quotation / outlet (#58)…"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }}
    />

    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
      Menampilkan {filtered.length} dari {quotes.length} quotation
    </Typography>
  </Stack>
</Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No. Quotation</TableCell><TableCell>Tanggal</TableCell><TableCell>Sales</TableCell>
              <TableCell>Outlet</TableCell><TableCell>Berlaku s.d</TableCell>
              <TableCell align="center">Diskon Maks</TableCell><TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.map((qt) => {
              const md = maxDiscountOf(qt.items);
              return (
                <TableRow key={qt.id} sx={{ cursor: 'pointer' }} onClick={() => setDetailId(qt.id)}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{qt.no}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{qt.date}</TableCell>
                  <TableCell>{salesName(qt.salesId)}</TableCell>
                  <TableCell>{outletName(qt.outletId)}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{qt.validUntil}</TableCell>
                  <TableCell align="center">
                    {md > 0 ? (
                      <StatusChip kind="quote" status={md > 10 ? 'pending_approval' : 'draft'} />
                    ) : '—'}
                    <Typography variant="caption" display="block" color="text.secondary">{md}%</Typography>
                  </TableCell>
                  <TableCell align="right"><b>{formatRupiah(qt.total)}</b></TableCell>
                  <TableCell><StatusChip kind="quote" status={qt.status} /></TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Detail"><IconButton size="small" onClick={() => setDetailId(qt.id)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={9}><EmptyState message="Tidak ada quotation sesuai filter (#58)." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 2 }} icon={<LockRoundedIcon fontSize="small" />}>
        Harga quotation = <b>snapshot saat dibuat</b> (price freeze #55) — perubahan Master Data tidak mengubah dokumen (#61).
        Quotation yang sudah dikonversi ke order <b>terkunci</b> dan tidak dapat dikonversi ulang (#60).
      </Alert>

      <QuoteDetailDialog
        open={!!detailId} quoteId={detailId}
        onClose={() => setDetailId(null)}
        supervisorActions={canApproveDiscount}
      />
    </Box>
  );
}