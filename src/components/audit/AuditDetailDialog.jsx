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
import { DEFAULT_AUDIT_TEMPLATE, formatChecklistAnswer } from '../../utils/auditUtils';
import StatusChip from '../ui/StatusChip';

const KV = ({ label, value }) => (
  <Stack sx={{ py: 0.5 }}>
    <Typography variant="caption" color="text.secondary"
      sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10.5, mb: 0.4, display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}
      sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.25, py: 0.75, overflowWrap: 'anywhere', display: 'block' }}>
      {value}
    </Typography>
  </Stack>
);

const scoreColor = (s) => (s >= 75 ? 'success' : s >= 50 ? 'warning' : 'error');

/*
 * canClassify = true → panel klasifikasi prospek untuk Supervisor.
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
    toast('Klasifikasi tersimpan & terintegrasi dengan data Prospek.', 'success');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 'sm' },
            borderRadius: { xs: 0, sm: 2 },
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderRight: { xs: 'none', sm: '1px solid' },
            borderColor: 'divider',
            boxShadow: { xs: 'none', sm: '0 12px 40px rgba(15,23,42,0.1)' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, px: { xs: 2, sm: 3 } }}>
          Laporan Audit {audit.no}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', px: { xs: 1.5, sm: 3 }, py: 2 }}>
          {/* Ringkasan Metadata 2 Kolom Bersih */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.25,
              mb: 2.5,
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Outlet</Typography>
              <Typography variant="body2" fontWeight={700}>{outlet.name || '-'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Area Kerja</Typography>
              <Typography variant="body2" fontWeight={600}>{areaName}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Sales Penanggung Jawab</Typography>
              <Typography variant="body2" fontWeight={600}>{salesName}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Tanggal Audit</Typography>
              <Typography variant="body2" fontWeight={600}>{audit.date}</Typography>
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <Typography variant="caption" color="text.secondary" display="block">Template Kuesioner</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600}>
                  {audit.templateName || DEFAULT_AUDIT_TEMPLATE.name}
                </Typography>
                <Chip size="small" color="primary" variant="outlined" label={`v${audit.templateVersion || 1}`} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
              </Stack>
            </Box>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">Skor Kondisi Toko</Typography>
                <StatusChip
                  kind="active"
                  status={audit.score >= 80 ? 'active' : 'inactive'}
                  label={`${audit.score}/100`}
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={audit.score}
                color={audit.score >= 80 ? 'success' : audit.score >= 60 ? 'warning' : 'error'}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>
            {cat && (
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="caption" color="text.secondary" display="block">Klasifikasi Prospek</Typography>
                <Typography variant="body2" fontWeight={600}>{cat.name} • {audit.prospectStatus || '-'}</Typography>
              </Box>
            )}
          </Box>

          {/* Checklist Kondisi Toko (Dinamis per Versi Form) */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
            Jawaban Kuesioner Audit (v{audit.templateVersion || 1})
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', mb: 2.5 }}>
            {(audit.checklist || []).map((c, idx) => {
              const type = c.type || 'scale_3';
              const maxS = Number(c.maxScore) || 3;
              const ratio = maxS > 0 ? (Number(c.score) || 0) / maxS : 1;
              return (
                <Stack
                  key={c.questionId || `${c.item}_${idx}`}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={0.75}
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderBottom: idx === audit.checklist.length - 1 ? 'none' : '1px solid',
                    borderColor: 'divider',
                    bgcolor: idx % 2 === 0 ? 'transparent' : 'action.hover',
                  }}
                >
                  <Box sx={{ pr: 1 }}>
                    <Typography variant="body2" fontSize={13} fontWeight={500}>{c.item}</Typography>
                    {Number(c.weight) > 1 && (
                      <Typography variant="caption" color="text.secondary">Bobot penilaian: {c.weight}x</Typography>
                    )}
                  </Box>
                  {type === 'text' ? (
                    <Typography variant="caption" fontWeight={600} sx={{ bgcolor: 'background.paper', px: 1, py: 0.4, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      {formatChecklistAnswer(c)}
                    </Typography>
                  ) : (
                    <StatusChip
                      kind={ratio >= 0.8 ? 'active' : 'task'}
                      status={ratio >= 0.8 ? 'active' : ratio >= 0.5 ? 'pending' : 'failed'}
                      label={formatChecklistAnswer(c)}
                    />
                  )}
                </Stack>
              );
            })}
          </Box>

          {/* Evaluasi Stok */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
            Evaluasi Stok vs Data Gudang
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', mb: 2.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Produk</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Sistem</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Aktual</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Selisih</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {audit.stocks.map((x) => (
                  <TableRow key={x.productId}>
                    <TableCell sx={{ fontSize: 13 }}>{x.name}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 13 }}>{x.systemStock}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 13 }}>{x.actualStock}</TableCell>
                    <TableCell align="center">
                      <StatusChip
                        kind="active"
                        status={x.diff === 0 ? 'active' : 'task'}
                        label={x.diff === 0 ? 'Sesuai' : `${x.diff > 0 ? '+' : ''}${x.diff}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* Foto Bukti */}
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
            Foto Bukti Dokumentasi
          </Typography>
          {audit.photos?.length ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {audit.photos.map((ph, i) => (
                <Box
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  sx={{
                    cursor: 'zoom-in',
                    aspectRatio: '1',
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box component="img" src={ph} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" display="block">
              Tidak ada foto bukti pada audit ini.
            </Typography>
          )}

          {audit.note && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5 }}>
              {audit.note}
            </Alert>
          )}

          {canClassify && (
            <Card elevation={0} sx={{ mt: 2.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Klasifikasi Prospek Outlet
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    size="small"
                    label="Kategori Prospek"
                    value={catId}
                    onChange={(e) => setCatId(e.target.value)}
                  >
                    <MenuItem value="">Pilih Kategori...</MenuItem>
                    {(db.prospectCategories || [])
                      .filter((c) => (c.status || 'active') === 'active' || String(c.id) === String(catId))
                      .map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Status Prospek"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {['Prospek', 'Follow Up', 'Negosiasi', 'Closing'].map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={saveClassification}
                    sx={{ borderRadius: 1, fontWeight: 650, textTransform: 'none' }}
                  >
                    Simpan Klasifikasi
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 1.5, sm: 3 }, py: 1.5 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 1, fontWeight: 600, textTransform: 'none' }}
          >
            Tutup
          </Button>
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