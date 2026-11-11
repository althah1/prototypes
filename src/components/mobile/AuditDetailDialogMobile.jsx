import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
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

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { DEFAULT_AUDIT_TEMPLATE, formatChecklistAnswer, getOutletStockHealth, formatStockMovement, PROSPECT_STATUSES, normalizeProspectStatus } from '../../utils/auditUtils';
import StatusChip from './StatusChipMobile';

const KV = ({ label, value }) => (
  <Box sx={{ py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        color: 'text.secondary',
        fontSize: '0.675rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        display: 'block',
        mb: 0.25,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: 600,
        fontSize: '0.825rem',
        color: 'text.primary',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const scoreColor = (s) => (s >= 75 ? 'success' : s >= 50 ? 'warning' : 'error');

export default function AuditDetailDialog({ open, auditId, onClose, canClassify = false }) {
  const { db, update, insert } = useDb();
  const { toast } = useToast();

  const [photoIdx, setPhotoIdx] = useState(null);
  const [catId, setCatId] = useState('');
  const [status, setStatus] = useState('Prospek');

  const audit = (db.audits || []).find((a) => a.id === auditId);

  const linkedProspect = audit
    ? (db.prospects || []).find(
        (p) =>
          (audit.prospectId != null && p.id === audit.prospectId) ||
          (audit.outletId != null && p.outletId === audit.outletId),
      )
    : null;

  const effectiveCatId = linkedProspect?.categoryId ?? audit?.categoryId;
  const effectiveStatus = linkedProspect?.status || audit?.prospectStatus || 'Prospek';
  const normStatus = normalizeProspectStatus(effectiveStatus);
  const effCat = (db.prospectCategories || []).find((c) => c.id === effectiveCatId);

  useEffect(() => {
    setPhotoIdx(null);
    if (audit) {
      setCatId(effectiveCatId ? String(effectiveCatId) : '');
      setStatus(normStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, open, linkedProspect?.categoryId, linkedProspect?.status]);

  if (!audit) return null;

  const outlet = (db.outlets || []).find((o) => o.id === audit.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === audit.salesId)?.name || '-';
  const areaName = (db.areas || []).find((a) => a.id === outlet.areaId)?.name || '-';

  const saveClassification = () => {
    const cid = catId ? Number(catId) : null;
    const normalizedStatus = normalizeProspectStatus(status);

    update('audits', audit.id, { categoryId: cid, prospectStatus: normalizedStatus });

    (db.audits || []).forEach((a) => {
      if (a.id === audit.id) return;
      const sameProspect = audit.prospectId != null && a.prospectId != null && a.prospectId === audit.prospectId;
      const sameOutlet = audit.outletId != null && a.outletId != null && a.outletId === audit.outletId;
      if (sameProspect || sameOutlet) {
        update('audits', a.id, { categoryId: cid, prospectStatus: normalizedStatus });
      }
    });

    if (linkedProspect) {
      update('prospects', linkedProspect.id, { categoryId: cid, status: normalizedStatus });
    } else {
      insert('prospects', {
        name: outlet.name, outletId: audit.outletId, owner: outlet.owner || '',
        phone: outlet.phone || '', address: outlet.address || '', areaId: outlet.areaId,
        salesId: audit.salesId, categoryId: cid, status: normalizedStatus, note: audit.note || '',
      });
    }
    toast('Klasifikasi tersimpan & terintegrasi dengan data Prospek.', 'success');
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 'md' },
            borderRadius: { xs: 0, sm: 1 },
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderRight: { xs: 'none', sm: '1px solid' },
            borderColor: 'divider',
            boxShadow: { xs: 'none', sm: '0 12px 40px rgba(15,23,42,0.1)' },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            pr: 6,
            position: 'relative',
            pb: 1,
            px: { xs: 2, sm: 3 },
          }}
        >
          Laporan Audit
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="Tutup"
            sx={{ position: 'absolute', right: 12, top: 12, bgcolor: 'action.hover' }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ overflowX: 'hidden', px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}
        >
          {/* GRID 2 KOLOM METADATA */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 3,
              rowGap: 0.5,
              mb: 3,
            }}
          >
            <KV label="Outlet" value={outlet.name || '-'} />
            <KV label="Area Kerja" value={areaName} />
            <KV label="Sales Penanggung Jawab" value={salesName} />
            <KV label="Tanggal Audit" value={audit.date} />
            {effCat && (
              <KV label="Klasifikasi Prospek" value={effCat.name} />
            )}
            <KV label="Skor Kondisi Toko" value={
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>{audit.score}/100</Typography>
                <StatusChip kind="active" status={audit.score >= 80 ? 'active' : 'inactive'} label={audit.score >= 80 ? 'Aktif' : 'Tidak Aktif'} />
              </Stack>
            } />
            <LinearProgress
              variant="determinate"
              value={audit.score}
              color={audit.score >= 80 ? 'success' : audit.score >= 60 ? 'warning' : 'error'}
              sx={{ height: 6, borderRadius: 1, mb: 0 }}
            />
          </Box>

          {/* Checklist Kondisi Toko (Dinamis per Versi Form) */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25, fontSize: '0.85rem' }}>
            Jawaban Kuesioner Audit
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 2.5 }}>
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

          {/* Hasil Stock-Take */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25, fontSize: '0.85rem' }}>
            Hasil Stock-Take Produk di Outlet
          </Typography>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', mb: 2.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Produk</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Riwayat Toko</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Aktual Toko</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Status &amp; Pergerakan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(audit.stocks || []).map((x) => {
                  const legacyBad = x.systemStock != null && x.systemStock >= 100 && x.actualStock <= 50 && x.stockStatus === undefined;
                  const ref = legacyBad ? null : x.systemStock;
                  const actual = Number(x.actualStock ?? 0);
                  const health = getOutletStockHealth(actual);
                  const movement = formatStockMovement({ systemStock: ref, actualStock: actual });
                  return (
                    <TableRow key={x.productId}>
                      <TableCell sx={{ fontSize: 13 }}>{x.name}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13 }}>{ref != null ? `${ref} pcs` : '-'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 13 }}>{actual} pcs</TableCell>
                      <TableCell align="center" sx={{ fontSize: 12 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <Chip size="small" color={health.color} variant={health.key === 'ok' ? 'outlined' : 'filled'} label={health.label} sx={{ borderRadius: 1 }} />
                          <Typography variant="caption" color="text.secondary" fontSize={10.5} sx={{ whiteSpace: 'nowrap' }}>
                            {movement}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Foto Bukti */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25, fontSize: '0.85rem' }}>
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
                    borderRadius: 1,
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
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1 }}>
              {audit.note}
            </Alert>
          )}

          {canClassify && (
            <Card elevation={0} sx={{ mt: 2.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
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
                    {PROSPECT_STATUSES.map((s) => (
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

        <DialogActions
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: 2,
            px: { xs: 1.5, sm: 3 },
          }}
        >
          {canClassify && (
            <Button
              variant="outlined"
              color="primary"
              onClick={saveClassification}
              sx={{ justifyContent: 'flex-start', borderRadius: 1, textTransform: 'none', py: 0.75, width: '100%' }}
            >
              Simpan Klasifikasi
            </Button>
          )}
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
