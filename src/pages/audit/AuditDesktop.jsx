import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
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

import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import GradeRoundedIcon from '@mui/icons-material/GradeRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';

import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import AuditDetailDialog from '../../components/audit/AuditDetailDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { exportAuditsCsv } from '../../utils/auditUtils';

export default function AuditDesktop() {
  const { user } = useAuth();
  const { db } = useDb();
  const { toast } = useToast();

  /* Hooks dulu — baru guard role (RBAC #5/#14: Admin & Finance tanpa akses) */
  const [dateFilter, setDateFilter] = useState('');
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);

  if (user.role !== 'supervisor') {
    return (
      <Alert severity="error">
        Akses ditolak — modul <b>Audit &amp; Survey</b> hanya dapat diakses <b>Supervisor</b> (matriks RBAC #5 &amp; #14).
      </Alert>
    );
  }

  const audits = [...(db.audits || [])].reverse();
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const catOf = (id) => (db.prospectCategories || []).find((c) => c.id === id);
  const today = new Date().toISOString().slice(0, 10);

  const filtered = audits.filter((a) =>
    (!dateFilter || a.date === dateFilter) &&
    (!q.trim() || a.no.toLowerCase().includes(q.trim().toLowerCase()) || outletName(a.outletId).toLowerCase().includes(q.trim().toLowerCase()))
  );
  const avgScore = audits.length ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length) : 0;
  const totalDev = audits.reduce((s, a) => s + (a.stocks || []).reduce((x, y) => x + Math.abs(y.diff || 0), 0), 0);

  const doExport = () => {
    const n = exportAuditsCsv(db);
    if (n) toast(`${n} baris hasil audit diekspor ke CSV (#71).`, 'success');
    else toast('Belum ada data audit untuk diekspor.', 'info');
  };

  return (
    <Box>
      <PageHeader
        title="Audit & Survey"
        subtitle="Evaluasi laporan kunjungan outlet & klasifikasi prospek."
        action={(
          <Button variant="contained" startIcon={<FileDownloadRoundedIcon />} onClick={doExport}>
            Export CSV (#71)
          </Button>
        )}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<FactCheckRoundedIcon />} value={audits.filter((a) => a.date === today).length} label="Audit hari ini" />
        <StatCard icon={<GradeRoundedIcon />} value={`${avgScore}/100`} label="Skor rata-rata" color="success" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={(db.prospects || []).length} label="Prospek terdata" color="secondary" />
        <StatCard icon={<Inventory2RoundedIcon />} value={`${totalDev} unit`} label="Total selisih stok" color="warning" />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        <TextField type="date" label="Tanggal" value={dateFilter} InputLabelProps={{ shrink: true }}
          onChange={(e) => setDateFilter(e.target.value)} sx={{ minWidth: 160 }} />
        <TextField label="Cari no. audit / outlet…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 260 }} />
      </Stack>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No Audit</TableCell><TableCell>Tanggal</TableCell><TableCell>Sales</TableCell>
              <TableCell>Outlet</TableCell><TableCell>Skor</TableCell><TableCell align="center">Foto</TableCell>
              <TableCell align="center">Selisih Stok</TableCell><TableCell>Kategori</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.map((a) => {
              const dev = (a.stocks || []).reduce((s, x) => s + Math.abs(x.diff || 0), 0);
              const cat = catOf(a.categoryId);
              return (
                <TableRow key={a.id} sx={{ cursor: 'pointer' }} onClick={() => setDetailId(a.id)}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{a.no}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{a.date}</TableCell>
                  <TableCell>{salesName(a.salesId)}</TableCell>
                  <TableCell>{outletName(a.outletId)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 110 }}>
                      <LinearProgress variant="determinate" value={a.score} sx={{ flex: 1, height: 7, borderRadius: 99 }} />
                      <Typography variant="caption" fontWeight={700}>{a.score}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">{a.photos?.length || 0}</TableCell>
                  <TableCell align="center">
                    {dev > 0 ? <Chip size="small" color="error" label={`${dev} unit`} /> : <Chip size="small" color="success" variant="outlined" label="sesuai" />}
                  </TableCell>
                  <TableCell>
                    {cat ? <Chip size="small" variant="outlined" label={cat.name} /> : <Typography variant="caption" color="text.secondary">belum</Typography>}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Tinjau"><IconButton size="small" onClick={() => setDetailId(a.id)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={9}><EmptyState message="Belum ada laporan audit sesuai filter." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" sx={{ mt: 2 }} icon={<LockRoundedIcon fontSize="small" />}>
        Form audit <b>terkunci setelah submit</b> — satu submit per outlet per kunjungan (#66). Struktur form yang sudah
        terjadwal tidak diubah sepihak; revisi besar dibuat sebagai versi form baru (#67). Hasil evaluasi terintegrasi
        dengan data <b>GPS Route Planning</b> (#70) dan dapat diekspor ke CSV/Excel (#71).
      </Alert>

      <AuditDetailDialog open={!!detailId} auditId={detailId} onClose={() => setDetailId(null)} canClassify />
    </Box>
  );
}