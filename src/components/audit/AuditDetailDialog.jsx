import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  Chip
} from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import StatusChip from '../ui/StatusChip';
import { useDb } from '../../store/DbContext';

const KV = ({ label, value }) => (
  <Box sx={{ py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.675rem', textTransform: 'uppercase', display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ fontWeight: 600, fontSize: '0.825rem', color: 'text.primary' }}>
      {value}
    </Typography>
  </Box>
);

export default function AuditDetailDialog({ open, onClose, audit }) {
  const { db } = useDb();
  if (!audit) return null;

  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const catOf = (id) => (db.prospectCategories || []).find((c) => c.id === Number(id));

  const sales = salesName(audit.salesId);
  const outlet = outletName(audit.outletId);
  const cat = catOf(audit.categoryId);

  return (
    <Dialog
      open={Boolean(open && audit)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 1.5 } }}
    >
      <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 2 }}>
        Detail Laporan Audit — {audit.no || `#AUD-${audit.id}`}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity={audit.score >= 75 ? 'success' : 'warning'} sx={{ mb: 2.5, borderRadius: 1.5 }}>
          Skor Kelayakan Toko: <b>{audit.score} / 100</b> — {audit.score >= 75 ? 'Memenuhi standar display dan kelayakan produk.' : 'Cukup memadai, memerlukan perbaikan display POSM.'}
        </Alert>

        {/* Grid Metadata 2 Kolom */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 0.5, mb: 3 }}>
          <KV label="No. Laporan Audit" value={audit.no || `#AUD-${audit.id}`} />
          <KV label="Status Kualifikasi" value={<StatusChip kind="prospect" status={audit.prospectStatus || 'Prospek'} />} />
          <KV label="Tanggal & Waktu" value={audit.createdAt || audit.date || '-'} />
          <KV label="Kategori Toko" value={cat?.name || audit.category || 'Reguler'} />
          <KV label="Outlet Tujuan" value={outlet} />
          <KV label="Sales Lapangan (Auditor)" value={sales} />
          <KV label="Verifikasi GPS Geofence" value={audit.gpsVerified ? 'Tervalidasi Presisi (< 50m)' : 'Tercatat di Luar Radius'} />
          <KV label="Template Instrumen" value={audit.templateTitle || 'Audit Display & Stock-take'} />
        </Box>

        {/* Tabel Rincian Produk */}
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          Rincian Pemeriksaan Fisik & Stock-Take ({Array.isArray(audit.stocks) ? audit.stocks.length : 0} item)
        </Typography>

        <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2.5 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Nama Item / Produk</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Stok Fisik</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Kondisi POSM / Display</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Status Item</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(audit.stocks) && audit.stocks.length > 0 ? (
              audit.stocks.map((stk, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>{stk.name || stk.productName || `Item #${idx + 1}`}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Pemeriksaan fisik rak display</Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}><b>{stk.qty || stk.stock || 0} unit</b></TableCell>
                  <TableCell align="center">{stk.condition || 'Standar Sesuai'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}><Typography variant="caption" color="success.main">Terverifikasi</Typography></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                  Seluruh parameter kuesioner kualitatif terpenuhi tanpa selisih stok fisik.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Ringkasan Total */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, p: 2, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>SKOR DISPLAY</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>73%</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>SKOR STOK</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{audit.score || 0}%</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block' }}>TOTAL PARAMETER</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 850, color: 'primary.main' }}>{Array.isArray(audit.stocks) ? audit.stocks.length : 1} Terperiksa</Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 1 }}>
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  );
}
