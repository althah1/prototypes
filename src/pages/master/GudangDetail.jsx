import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import FilterToolbar from '../../components/ui/FilterToolbar';
import DetailGrid, { CardSectionHeader } from '../../components/ui/DetailGrid';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { ensureGudangDetails, reservedByRow } from '../../utils/gudangUtils';

const STOK_COLOR = { Tersedia: 'success', Menipis: 'warning', Habis: 'error' };

export default function GudangDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { db, mutate } = useDb();

  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureGudangDetails(db, mutate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = useMemo(() => {
    const w = (db.warehouses || []).find((x) => x.id === Number(id));
    if (!w) return null;
    const reserved = reservedByRow(db);
    const list = (db.gudangDetails || [])
      .filter((r) => r.gudangId === w.id)
      .map((r) => {
        const p = (db.products || []).find((x) => x.id === r.productId);
        if (!p) return null;
        const rsv = reserved[`${w.id}-${r.productId}`] || 0;
        const tersedia = Math.max(0, r.stokTercatat - rsv);
        const status = tersedia === 0 ? 'Habis' : tersedia <= (r.stokMinimum || 0) ? 'Menipis' : 'Tersedia';
        return {
          id: r.productId,
          name: p.name,
          sku: p.sku,
          tercatat: r.stokTercatat,
          reserved: rsv,
          tersedia,
          minimum: r.stokMinimum || 0,
          status,
          sumber: r.sumberStok || 'Manual SFA',
          sync: r.statusSync || 'Tidak Digunakan',
          lastUpdate: r.updatedAt || r.createdAt || '-',
        };
      })
      .filter(Boolean);
    return { warehouse: w, list };
  }, [db.warehouses, db.products, db.gudangDetails, db.orders, id]);

  if (!['admin', 'supervisor'].includes(user.role)) {
    return (
      <Alert severity="error">
        Akses ditolak — modul <b>Gudang</b> hanya dapat diakses oleh <b>Admin &amp; Supervisor</b>.
      </Alert>
    );
  }

  if (!data) {
    return (
      <Stack spacing={2}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => navigate('/dashboard/master/gudang')}
          sx={{ alignSelf: 'flex-start', borderRadius: 1 }}
        >
          Kembali ke Master Gudang
        </Button>
        <EmptyState message="Data gudang tidak ditemukan." />
      </Stack>
    );
  }

  const { warehouse, list } = data;
  const filtered = list.filter(
    (r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()) || r.sku.toLowerCase().includes(q.trim().toLowerCase()))
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  const cnt = (s) => list.filter((r) => r.status === s).length;
  const unplaced = (db.products || []).filter(
    (p) => p.status === 'active' && !(db.gudangDetails || []).some((r) => r.productId === p.id)
  ).length;

  const spvPic = (db.supervisors || []).find((s) => s.id === warehouse.picId)?.name || '-';

  const warehouseInfoItems = [
    { label: 'Kode Gudang', value: warehouse.code, mono: true },
    { label: 'Nama Lokasi', value: warehouse.name },
    { label: 'Penanggung Jawab (PIC)', value: spvPic },
    { label: 'Alamat Fasilitas', value: warehouse.address || '-', isLong: true },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
        <IconButton
          onClick={() => navigate('/dashboard/master/gudang')}
          aria-label="Kembali ke Master Gudang"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.25 }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>
            Detail Inventaris — {warehouse.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Rincian stok fisik, alokasi pesanan (reserved), dan ketersediaan barang di gudang
            {unplaced > 0 ? ` • ${unplaced} produk belum dialokasikan` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusChip kind="active" status={warehouse.status || 'active'} />
          <Chip label={warehouse.code} color="primary" variant="outlined" size="small" sx={{ borderRadius: '6px', fontWeight: 700 }} />
        </Stack>
      </Stack>

      <Card elevation={0} sx={{ borderRadius: 1.25, border: '1px solid', borderColor: 'divider', mb: 2.5 }}>
        <CardSectionHeader title="Informasi Fasilitas Gudang" subtitle="Data identitas lokasi penyimpanan fisik" />
        <CardContent sx={{ p: 2 }}>
          <DetailGrid items={warehouseInfoItems} columns={2} />
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5, mb: 2.5 }}>
        <StatCard icon={<Inventory2RoundedIcon />} value={list.length} label="Total SKU tercatat" />
        <StatCard icon={<CheckCircleRoundedIcon />} value={cnt('Tersedia')} label="Stok Tersedia" color="success" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={cnt('Menipis')} label="Stok Menipis" color="warning" />
        <StatCard icon={<BlockRoundedIcon />} value={cnt('Habis')} label="Stok Habis" color="error" />
      </Box>

      <FilterToolbar
        searchValue={q}
        onSearchChange={(v) => { setQ(v); setPage(0); }}
        searchPlaceholder="Cari nama produk atau SKU…"
        shownCount={filtered.length}
        totalCount={list.length}
        unitLabel="produk"
        hasActiveFilter={q !== '' || statusFilter !== 'all'}
        onReset={() => { setQ(''); setStatusFilter('all'); setPage(0); }}
      >
        <TextField
          size="small"
          select
          label="Status Stok"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ width: 170 }}
        >
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="Tersedia">Tersedia</MenuItem>
          <MenuItem value="Menipis">Menipis</MenuItem>
          <MenuItem value="Habis">Habis</MenuItem>
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
              <TableCell>Produk</TableCell>
              <TableCell align="right">Stok Fisik</TableCell>
              <TableCell align="right">Reserved</TableCell>
              <TableCell align="right">Tersedia</TableCell>
              <TableCell align="right">Min. Stok</TableCell>
              <TableCell>Status Stok</TableCell>
              <TableCell>Sumber</TableCell>
              <TableCell>Pembaruan</TableCell>
              <TableCell>Sinkronisasi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? (
              paginated.map((r) => (
                <TableRow key={r.id} hover sx={{ transition: 'background-color 0.15s ease' }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={650} noWrap title={r.name} sx={{ maxWidth: 260 }}>
                      {r.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {r.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {r.tercatat}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13, color: r.reserved > 0 ? 'warning.dark' : 'text.secondary' }}>
                    {r.reserved}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Typography variant="body2" fontWeight={750} color={r.tersedia === 0 ? 'error.main' : 'text.primary'}>
                      {r.tersedia}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.secondary' }}>
                    {r.minimum}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={STOK_COLOR[r.status]}
                      variant="outlined"
                      label={r.status}
                      sx={{ borderRadius: '6px', fontWeight: 650 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant={r.sumber === 'ERP Odoo' ? 'filled' : 'outlined'}
                      color={r.sumber === 'ERP Odoo' ? 'info' : 'default'}
                      label={r.sumber}
                      sx={{ borderRadius: '6px', fontSize: 11 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                    {r.lastUpdate}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {r.sync}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="Belum ada produk yang ditempatkan di gudang ini." />
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
        <b>Rumus Inventaris:</b> Stok Tersedia = Stok Fisik − Stok Reserved. Stok Reserved dialokasikan otomatis dari order aktif yang menunggu pengiriman.
      </Alert>
    </Box>
  );
}
