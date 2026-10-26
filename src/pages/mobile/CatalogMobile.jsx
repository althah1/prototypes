import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';

import EmptyState from '../../components/ui/EmptyState';
import { useDb } from '../../store/DbContext';
import { formatRupiah } from '../../utils/helpers';
import { ensureGudangDetails } from '../../utils/gudangUtils';

export default function CatalogMobile() {
  const { db, mutate } = useDb();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [detailProduct, setDetailProduct] = useState(null);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureGudangDetails(db, mutate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = db.categories || [];
  const warehouses = (db.warehouses || []).filter((w) => w.status === 'active');
  const activeWarehouseIds = useMemo(() => new Set(warehouses.map((w) => w.id)), [warehouses]);

  const stockOfProduct = (p) => {
    const details = (db.gudangDetails || []).filter(
      (r) => r.productId === p.id && activeWarehouseIds.has(r.gudangId)
    );
    if (details.length) {
      return details.reduce((s, r) => s + (Number(r.stokTercatat) || 0), 0);
    }
    return Number(p.stock) || 0;
  };

  const activeProducts = useMemo(
    () => (db.products || []).filter((p) => (p.status || 'active') === 'active'),
    [db.products]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activeProducts.filter((p) => {
      const stk = stockOfProduct(p);
      if (catFilter !== 'all' && p.category !== catFilter) return false;
      if (stockFilter === 'available' && stk <= 0) return false;
      if (stockFilter === 'empty' && stk > 0) return false;
      if (term && !`${p.sku} ${p.name} ${p.category || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProducts, catFilter, stockFilter, q, db.gudangDetails, activeWarehouseIds]);

  const detailPlacements = detailProduct
    ? (db.gudangDetails || []).filter(
        (r) => r.productId === detailProduct.id && activeWarehouseIds.has(r.gudangId)
      )
    : [];

  return (
    <Stack spacing={2} sx={{ pb: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate('/app')} aria-label="Kembali" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} noWrap>Katalog Produk</Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            Referensi harga jual & stok gudang (Lihat Saja)
          </Typography>
        </Box>
        <Chip size="small" color="primary" variant="outlined" label={`${filtered.length} item`} />
      </Stack>

      <Alert severity="info" icon={<LockRoundedIcon fontSize="small" />} sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: 12.5 } }}>
        Mode <b>Read-Only</b> — harga acuan & stok dikelola terpusat oleh Master Data.
      </Alert>

      {/* Pencarian & Filter */}
      <Stack spacing={1.25}>
        <TextField
          size="small"
          fullWidth
          placeholder="Cari nama produk atau kode SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Stack direction="row" spacing={1}>
          <TextField
            select
            size="small"
            label="Kategori"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            sx={{ flex: 1 }}
          >
            <MenuItem value="all">Semua Kategori</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Ketersediaan"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            sx={{ flex: 1 }}
          >
            <MenuItem value="all">Semua Stok</MenuItem>
            <MenuItem value="available">Tersedia (&gt; 0)</MenuItem>
            <MenuItem value="empty">Stok Habis (0)</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {/* Daftar Produk */}
      {filtered.length ? filtered.map((p) => {
        const totalStok = stockOfProduct(p);
        const unitInfo = p.unit === 'box' && Number(p.pcsPerUnit) > 1
          ? `box (1 box = ${p.pcsPerUnit} pcs)`
          : (p.unit || 'pcs');
        return (
          <Card
            key={p.id}
            elevation={0}
            onClick={() => setDetailProduct(p)}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 40, height: 40, borderRadius: 2 }}>
                  <Inventory2RoundedIcon fontSize="small" />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                      {p.sku} • {p.category || '-'}
                    </Typography>
                    <Chip
                      size="small"
                      color={totalStok > 20 ? 'success' : totalStok > 0 ? 'warning' : 'error'}
                      variant={totalStok > 0 ? 'outlined' : 'filled'}
                      label={totalStok > 0 ? `Stok ${totalStok} pcs` : 'Stok Habis'}
                      sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography fontWeight={750} fontSize={14.5} sx={{ mt: 0.25 }} noWrap>
                    {p.name}
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      Satuan: <b>{unitInfo}</b>
                    </Typography>
                    <Typography fontWeight={800} fontSize={14.5} color="primary.main">
                      {formatRupiah(p.hargaJual)}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      }) : (
        <EmptyState message="Produk tidak ditemukan pada filter pencarian ini." />
      )}

      {/* Modal Detail Produk Read-Only */}
      <Dialog
        open={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, m: 1.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          Detail Katalog — {detailProduct?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2, py: 2 }}>
          {detailProduct && (
            <Stack spacing={1.5}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                {[
                  { l: 'Kode SKU', v: detailProduct.sku },
                  { l: 'Kategori', v: detailProduct.category || '-' },
                  {
                    l: 'Satuan Jual',
                    v: detailProduct.unit === 'box' && Number(detailProduct.pcsPerUnit) > 1
                      ? `box (isi ${detailProduct.pcsPerUnit} pcs)`
                      : (detailProduct.unit || 'pcs'),
                  },
                  { l: 'Harga Jual Acuan', v: formatRupiah(detailProduct.hargaJual) },
                  { l: 'Total Stok Tersedia', v: `${stockOfProduct(detailProduct)} pcs` },
                  { l: 'Deskripsi', v: detailProduct.desc || '-' },
                ].map((row, idx, arr) => (
                  <Box
                    key={row.l}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderBottom: idx === arr.length - 1 ? 'none' : '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {row.l}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} fontSize={13} textAlign="right">
                      {row.v}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Stack direction="row" spacing={0.75} alignItems="center">
                <WarehouseRoundedIcon fontSize="small" color="action" />
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                  Sebaran Stok Gudang Aktif
                </Typography>
              </Stack>

              {detailPlacements.length ? (
                <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontSize: 11.5, fontWeight: 700 }}>Gudang</TableCell>
                      <TableCell align="right" sx={{ fontSize: 11.5, fontWeight: 700 }}>Stok</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailPlacements.map((pl) => {
                      const wh = warehouses.find((w) => w.id === pl.gudangId);
                      return (
                        <TableRow key={`${pl.productId}-${pl.gudangId}`}>
                          <TableCell sx={{ fontSize: 12.5 }}>{wh ? `${wh.code} — ${wh.name}` : '-'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 700 }}>{pl.stokTercatat} pcs</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Rincian alokasi per gudang belum tersedia (Total stok tercatat: {stockOfProduct(detailProduct)} pcs).
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button variant="outlined" fullWidth onClick={() => setDetailProduct(null)}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
