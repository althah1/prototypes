import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
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

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { ensureGudangDetails, reservedByRow } from '../../utils/gudangUtils';

const STOK_COLOR = { Tersedia: 'success', Menipis: 'warning', Habis: 'error' };

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.7 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

export default function GudangDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { db, mutate } = useDb();
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');

  /* Migrasi sekali: tabel gudangDetails dari stok produk lama */
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
          id: r.productId, name: p.name, sku: p.sku,
          tercatat: r.stokTercatat, reserved: rsv, tersedia, minimum: r.stokMinimum || 0, status,
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
        Akses ditolak — modul <b>Gudang</b> hanya dapat diakses <b>Admin &amp; Supervisor</b> (matriks RBAC #5).
      </Alert>
    );
  }

  if (!data) {
    return (
      <Stack spacing={2}>
        <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/dashboard/master/gudang')} sx={{ alignSelf: 'flex-start' }}>
          Kembali ke Master Gudang
        </Button>
        <EmptyState message="Gudang tidak ditemukan." />
      </Stack>
    );
  }

  const { warehouse, list } = data;
  const filtered = list.filter((r) =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (!q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()) || r.sku.toLowerCase().includes(q.trim().toLowerCase()))
  );
  const cnt = (s) => list.filter((r) => r.status === s).length;
  const unplaced = (db.products || []).filter(
    (p) => p.status === 'active' && !(db.gudangDetails || []).some((r) => r.productId === p.id)
  ).length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/dashboard/master/gudang')} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800} noWrap>Detail Gudang — {warehouse.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            Rincian ketersediaan stok per produk (gudang_details)
            {unplaced > 0 ? ` • ${unplaced} produk belum ditempatkan di gudang mana pun` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <StatusChip kind="active" status={warehouse.status || 'active'} />
          <Chip label={warehouse.code} color="primary" variant="outlined" />
        </Stack>
      </Stack>

      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <KV label="Kode Gudang" value={warehouse.code} />
          <KV label="Nama Gudang" value={warehouse.name} />
          <KV label="Alamat" value={warehouse.address || '-'} />
          <KV label="Penanggung Jawab"
            value={((db.supervisors || []).find((s) => s.id === warehouse.picId) || {}).name || '-'} />
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<Inventory2RoundedIcon />} value={list.length} label="Total SKU tercatat" />
        <StatCard icon={<CheckCircleRoundedIcon />} value={cnt('Tersedia')} label="Status Tersedia" color="success" />
        <StatCard icon={<WarningAmberRoundedIcon />} value={cnt('Menipis')} label="Status Menipis" color="warning" />
        <StatCard icon={<BlockRoundedIcon />} value={cnt('Habis')} label="Status Habis" color="error" />
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
            <FilterListRoundedIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
          </Stack>
          <TextField size="small" label="Cari produk / SKU…" value={q} onChange={(e) => setQ(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
          <TextField size="small" select label="Status Stok" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 170 }}>
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="Tersedia">Tersedia</MenuItem>
            <MenuItem value="Menipis">Menipis</MenuItem>
            <MenuItem value="Habis">Habis</MenuItem>
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {filtered.length} dari {list.length} produk
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Produk</TableCell>
              <TableCell align="right">Stok Tercatat</TableCell>
              <TableCell align="right">Stok Reserved</TableCell>
              <TableCell align="right">Stok Tersedia</TableCell>
              <TableCell align="right">Stok Minimum</TableCell>
              <TableCell>Status Stok</TableCell>
              <TableCell>Sumber Stok</TableCell>
              <TableCell>Last Update</TableCell>
              <TableCell>Status Sync</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{r.sku}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.tercatat}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13, color: r.reserved > 0 ? 'warning.dark' : 'text.secondary' }}>
                  {r.reserved}
                </TableCell>
                <TableCell align="right"><Typography variant="body2" fontWeight={700}>{r.tersedia}</Typography></TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 13 }}>{r.minimum}</TableCell>
                <TableCell><Chip size="small" color={STOK_COLOR[r.status]} variant="outlined" label={r.status} /></TableCell>
                <TableCell>
                  <Chip size="small" variant={r.sumber === 'ERP Odoo' ? 'filled' : 'outlined'}
                    color={r.sumber === 'ERP Odoo' ? 'info' : 'default'} label={r.sumber} />
                </TableCell>
                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{r.lastUpdate}</Typography></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{r.sync}</Typography></TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="Belum ada produk yang ditempatkan di gudang ini. Atur penempatan lewat Master Data → Produk (Penempatan Stok per Gudang)." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 2 }}>
        <b>stok_tersedia = stok_tercatat − stok_reserved</b> (#formula gudang_details). Reserved dihitung otomatis dari
        order <b>aktif</b> (Submitted/Approved/Processing). Stok <b>fisik</b> berubah lewat realokasi di form Produk atau hasil
        <b> Audit stock-take</b> — persis alur operasional nyata. Saat integrasi backend, halaman ini cukup diganti
        pembacaan tabel <b>gudang_details</b> dari API.
      </Alert>
    </Box>
  );
}