import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { checkLabel } from '../../utils/auditUtils';

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.7 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

const scoreColor = (s) => (s >= 75 ? 'success' : s >= 50 ? 'warning' : 'error');

/*
 * canClassify = true → panel klasifikasi prospek untuk Supervisor (#69).
 * Sisi Sales memakai dialog ini read-only (form terkunci #66).
 */
export default function AuditDetailDialog({ open, auditId, onClose, canClassify = false }) {
  const { db, update, insert } = useDb();
  const { toast } = useToast();

  /* Semua hooks di atas — sebelum early return */
  const [photoIdx, setPhotoIdx] = useState(null);
  const [catId, setCatId] = useState('');
  const [status, setStatus] = useState('Prospek');

  const audit = (db.audits || []).find((a) => a.id === auditId);

  useEffect(() => {
    setPhotoIdx(null);
    if (audit) {
      setCatId(audit.categoryId ? String(audit.categoryId) : '');
      setStatus(audit.prospectStatus || 'Prospek');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, open]);

  if (!audit) return null; /* early return SETELAH semua hooks — aman */

  const outlet = (db.outlets || []).find((o) => o.id === audit.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === audit.salesId)?.name || '-';
  const areaName = (db.areas || []).find((a) => a.id === outlet.areaId)?.name || '-';
  const cat = (db.prospectCategories || []).find((c) => c.id === audit.categoryId);

  /* #69: simpan klasifikasi + upsert data prospek (terhubung GPS Route Planning #70) */
  const saveClassification = () => {
    const cid = catId ? Number(catId) : null;
    update('audits', audit.id, { categoryId: cid, prospectStatus: status });
    const existing = (db.prospects || []).find((p) => p.outletId === audit.outletId);
    if (existing) {
      update('prospects', existing.id, { categoryId: cid, status });
    } else {
      insert('prospects', {
        name: outlet.name, outletId: audit.outletId, owner: outlet.owner || '',
        phone: outlet.phone || '', address: outlet.address || '', areaId: outlet.areaId,
        salesId: audit.salesId, categoryId: cid, status, note: audit.note || '',
      });
    }
    toast('Klasifikasi tersimpan & terintegrasi dengan data Prospek (terhubung GPS Route Planning #70).', 'success');
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Laporan Audit {audit.no}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <KV label="Outlet" value={outlet.name || '-'} />
            <KV label="Area" value={areaName} />
            <KV label="Sales" value={salesName} />
            <KV label="Tanggal" value={audit.date} />
            <KV label="Skor" value={(
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ width: 150 }}>
                <LinearProgress variant="determinate" value={audit.score} sx={{ flex: 1, height: 7, borderRadius: 99 }} />
                <Chip size="small" color={scoreColor(audit.score)} variant="outlined" label={`${audit.score}/100`} />
              </Stack>
            )} />
            {cat && <KV label="Kategori Prospek" value={`${cat.name} • ${audit.prospectStatus || '-'}`} />}
          </Stack>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Checklist Kondisi &amp; Kebersihan (#62)</Typography>
          {audit.checklist.map((c) => (
            <Stack key={c.item} direction="row" justifyContent="space-between" alignItems="center"
              sx={{ py: 0.6, borderBottom: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="body2">{c.item}</Typography>
              <Chip size="small" variant="outlined"
                color={c.score === 3 ? 'success' : c.score === 2 ? 'warning' : 'error'}
                label={checkLabel(c.score)} />
            </Stack>
          ))}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Evaluasi Stok vs Data Gudang (#63/#69)</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produk</TableCell><TableCell align="right">Sistem</TableCell>
                <TableCell align="right">Aktual</TableCell><TableCell align="center">Selisih</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {audit.stocks.map((x) => (
                <TableRow key={x.productId}>
                  <TableCell>{x.name}</TableCell>
                  <TableCell align="right">{x.systemStock}</TableCell>
                  <TableCell align="right">{x.actualStock}</TableCell>
                  <TableCell align="center">
                    {x.diff === 0
                      ? <Chip size="small" color="success" variant="outlined" label="sesuai" />
                      : <Chip size="small" color="error" label={`${x.diff > 0 ? '+' : ''}${x.diff}`} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Foto Bukti (#64)</Typography>
          {audit.photos?.length ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {audit.photos.map((ph, i) => (
                <Box key={i} onClick={() => setPhotoIdx(i)}
                  sx={{ cursor: 'zoom-in', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">Tidak ada foto bukti pada audit ini.</Typography>
          )}

          {audit.note && <Alert severity="info" sx={{ mt: 2 }}>📝 {audit.note}</Alert>}

          {canClassify && (
            <Card variant="outlined" sx={{ mt: 2.5 }}>
              <CardHeader title="Klasifikasi Outlet / Prospek (#69)" titleTypographyProps={{ fontSize: 14, fontWeight: 700 }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={1.5}>
                  <TextField select label="Kategori Prospek" value={catId} onChange={(e) => setCatId(e.target.value)}>
                    {(db.prospectCategories || []).filter((c) => c.status === 'active').map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.name} — prioritas {c.priority}</MenuItem>
                    ))}
                  </TextField>
                  <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {['Prospek', 'Negosiasi', 'Disetujui', 'Ditolak'].map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                  <Button variant="contained" onClick={saveClassification}>Simpan Klasifikasi</Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* Perbesar foto */}
      <Dialog open={photoIdx !== null} onClose={() => setPhotoIdx(null)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {photoIdx !== null && (
            <Box component="img" src={audit.photos[photoIdx]} sx={{ width: '100%', display: 'block' }} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}