import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Card,
  CardHeader,
  CardContent,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  Alert,
  Tooltip,
  Checkbox,
  FormControlLabel
} from '@mui/material';

// Icons
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';

// UI Components
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FilterToolbar from '../../components/ui/FilterToolbar';
import { ModalHeader, FormSection } from '../../components/ui/DetailGrid';

// Contexts & Helpers
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, dateID, TASK_TYPE_LABEL } from '../../utils/helpers';
import { expireTasks } from '../../utils/taskUtils';

/* ============ Dialog: BUAT JADWAL TUGAS ============ */
function CreateScheduleDialog({ open, onClose }) {
  const { user } = useAuth();
  const { db, insert } = useDb();
  const { notify } = useSync();
  const { toast } = useToast();

  const areas = db.areas || [];
  const spv = (db.supervisors || []).find((s) => s.email === user?.email);
  const teamSales = (db.sales || []).filter((s) => s.status === 'active' && (!spv || s.supervisorId === spv.id));

  const [salesId, setSalesId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState('order');
  const [outletIds, setOutletIds] = useState([]);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSalesId(teamSales[0] ? String(teamSales[0].id) : '');
      setDate(todayISO());
      setType('order');
      setOutletIds([]);
      setNote('');
      setErrors({});
    }
  }, [open]);

  const selectedSales = (db.sales || []).find((s) => s.id === Number(salesId));
  const areaOutlets = (db.outlets || []).filter(
    (o) => o.status === 'active' && selectedSales && o.areaId === selectedSales.areaId
  );

  const toggleOutlet = (id) => {
    setOutletIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setErrors((p) => ({ ...p, outlets: '' }));
  };

  const submit = () => {
    const errs = {};
    if (!salesId) errs.salesId = 'Pilih sales.';
    if (!date) errs.date = 'Tanggal wajib dipilih.';
    else if (date < todayISO()) errs.date = 'Tidak dapat menjadwalkan tugas untuk tanggal yang sudah lewat.';
    if (!outletIds.length) errs.outlets = 'Pilih minimal 1 outlet.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setTimeout(() => {
      outletIds.forEach((outletId) =>
        insert('tasks', { date, salesId: Number(salesId), outletId, type, status: 'pending', note: note.trim() })
      );
      const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === Number(salesId));
      if (salesUser) notify(salesUser.id, 'Penugasan Baru', `Anda mendapatkan ${outletIds.length} tugas baru pada ${dateID(date)}.`);
      toast(`${outletIds.length} tugas berhasil didistribusikan ke Web Mobile sales.`, 'success');
      setSaving(false);
      onClose();
    }, 400);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 48px rgba(15,23,42,0.12)',
        },
      }}
    >
      <ModalHeader
        title="Buat Jadwal Tugas"
        subtitle="Distribusi rute & aktivitas harian tim sales — otomatis ke Web Mobile."
        onClose={saving ? undefined : onClose}
      />
      <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <Box>
            <FormSection title="Penanggung Jawab & Tanggal" />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                select
                label="Sales (bawahan) *"
                value={salesId}
                onChange={(e) => {
                  setSalesId(e.target.value);
                  setOutletIds([]);
                  setErrors((p) => ({ ...p, salesId: '' }));
                }}
                error={!!errors.salesId}
                helperText={errors.salesId || 'Daftar otomatis hanya menampilkan Sales di bawah Supervisor Anda.'}
              >
                {teamSales.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}>
                    {s.name} — {areas.find((a) => a.id === s.areaId)?.name || ''}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="date"
                label="Tanggal Tugas *"
                value={date}
                InputLabelProps={{ shrink: true }}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((p) => ({ ...p, date: '' }));
                }}
                inputProps={{ min: todayISO() }}
                error={!!errors.date}
                helperText={errors.date || 'Tidak boleh tanggal lampau (no backdating).'}
              />
            </Box>
          </Box>

          <Box>
            <FormSection title="Jenis & Outlet Tujuan" />
            <TextField select label="Jenis Tugas *" value={type} onChange={(e) => setType(e.target.value)} fullWidth>
              {(db.taskTypes || []).filter((t) => t.status === 'active').map((t) => (
                <MenuItem key={t.id} value={t.type}>{t.name}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Outlet Tujuan (sesuai Area Kerja sales) *
              </Typography>
              <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1 }}>
                {areaOutlets.length ? areaOutlets.map((o) => (
                  <FormControlLabel
                    key={o.id}
                    control={<Checkbox size="small" checked={outletIds.includes(o.id)} onChange={() => toggleOutlet(o.id)} />}
                    label={<Typography variant="body2"><b>{o.name}</b> <span style={{ color: '#64748b' }}>— {o.address}</span></Typography>}
                    sx={{ display: 'flex', m: 0, py: 0.25, alignItems: 'flex-start' }}
                  />
                )) : (
                  <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>Tidak ada outlet aktif di area sales ini.</Typography>
                )}
              </Box>
              {errors.outlets && <Typography variant="caption" color="error">{errors.outlets}</Typography>}
            </Box>
          </Box>

          <Box>
            <FormSection title="Catatan Tambahan" />
            <TextField
              label="Catatan Khusus (opsional, maks 255)"
              multiline
              minRows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 255 }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, justifyContent: 'flex-end', gap: 1.25 }}>
        <Button onClick={onClose} disabled={saving} variant="outlined" color="inherit" sx={{ borderRadius: 1, fontWeight: 600 }}>
          Batal
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving}
          sx={{ borderRadius: 1, fontWeight: 650, px: 2.5 }}
        >
          {saving ? 'Mendistribusikan…' : 'Distribusikan Tugas'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============ Dialog: UBAH JADWAL ============ */
function EditTaskDialog({ open, task, onClose }) {
  const { db, update } = useDb();
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState('order');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open && task) {
      setDate(task.date || todayISO());
      setType(task.type || 'order');
      setNote(task.note || '');
      setErr('');
    }
  }, [open, task]);

  const submit = () => {
    if (!date) return setErr('Tanggal wajib dipilih.');
    if (date < todayISO()) return setErr('Tidak dapat menjadwalkan tugas untuk tanggal yang sudah lewat.');
    update('tasks', task.id, { date, type, note: note.trim() });
    toast('Jadwal tugas diperbarui.', 'success');
    onClose();
  };

  return (
    <Dialog open={Boolean(open && task)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Ubah Jadwal Tugas</DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden' }}>
        <Stack spacing={2}>
          <TextField
            type="date"
            label="Tanggal Tugas *"
            value={date}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => { setDate(e.target.value); setErr(''); }}
            inputProps={{ min: todayISO() }}
          />
          <TextField select label="Jenis Tugas" value={type} onChange={(e) => setType(e.target.value)}>
            {(db.taskTypes || []).filter((t) => t.status === 'active').map((t) => (
              <MenuItem key={t.id} value={t.type}>{t.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Catatan (maks 255)"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            inputProps={{ maxLength: 255 }}
          />
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Batal</Button>
        <Button variant="contained" onClick={submit}>Simpan Perubahan</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============ Dialog: DETAIL TUGAS (MENGOTAK TEGAS PERSIS QUOTATION) ============ */
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

function TaskDetailDialog({ open, task, onClose, onEdit, isSupervisor }) {
  const { db } = useDb();
  if (!task) return null;

  const sales = (db.sales || []).find((s) => s.id === task.salesId);
  const outlet = (db.outlets || []).find((o) => o.id === task.outletId);
  const area = (db.areas || []).find((a) => a.id === outlet?.areaId);

  return (
    <Dialog
      open={Boolean(open && task)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 1.5 } }}
    >
      <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 2 }}>
        Detail Penugasan Harian — #TGS-{String(task.id).padStart(4, '0')}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {(task.status === 'failed' || task.status === 'cancelled') && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>
            Tugas ini berstatus <b>{task.status === 'failed' ? 'Kedaluwarsa / Gagal' : 'Dibatalkan'}</b> dan tidak dapat dilanjutkan.
          </Alert>
        )}

        {/* Grid Metadata 2 Kolom */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 0.5, mb: 3 }}>
          <KV label="ID Tugas" value={`#TGS-${String(task.id).padStart(4, '0')}`} />
          <KV label="Status Tugas" value={<StatusChip kind="task" status={task.status} />} />
          <KV label="Tanggal Tugas" value={task.date || '-'} />
          <KV label="Jenis Aktivitas" value={TASK_TYPE_LABEL[task.type] || task.type} />
          <KV label="Sales Penanggung Jawab (PIC)" value={sales?.name || '-'} />
          <KV label="Outlet Tujuan" value={outlet?.name || '-'} />
          <KV label="Wilayah / Area Kerja" value={area?.name || '-'} />
          <KV label="Alamat Outlet" value={outlet?.address || '-'} />
        </Box>

        {/* Tabel Rincian Produk */}
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          Rincian Parameter Aktivitas Lapangan (1 penugasan)
        </Typography>

        <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2.5 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Parameter Penugasan</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Target Eksekusi</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Batas Wilayah</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Verifikasi GPS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{TASK_TYPE_LABEL[task.type] || task.type}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Distribusi otomatis ke Web Mobile</Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{outlet?.name || '-'}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{area?.name || '-'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {task.status === 'done' ? 'Tervalidasi GPS (< 50m)' : 'Terkunci Geofence'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Ringkasan Total */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, p: 2, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>TANGGAL JADWAL</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{task.date || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>WAKTU SELESAI</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{task.completedAt || 'Belum selesai'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block' }}>STATUS AKHIR</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 850, color: 'primary.main' }}>
              {task.status === 'done' ? 'TERSELESAIKAN' : (task.status || 'PENDING').toUpperCase()}
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 1 }}>
          Tutup
        </Button>
        {isSupervisor && task.status === 'pending' && (
          <Button variant="contained" color="primary" onClick={() => { onClose(); onEdit(task); }} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Ubah Jadwal
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ============ HALAMAN UTAMA TASK DESKTOP ============ */
export default function TaskDesktop() {
  const { user } = useAuth();
  const { db, mutate, remove } = useDb();
  const { toast } = useToast();
  const isSupervisor = user?.role === 'supervisor';

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [detailTask, setDetailTask] = useState(null);

  // Auto-expire tugas kemarin yang masih pending/in-progress saat mount
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireTasks(db, mutate);
    if (n > 0) toast(`${n} tugas kedaluwarsa otomatis ditandai Gagal.`, 'info');
  }, []);

  const allForDate = useMemo(() => {
    return (db.tasks || []).filter((t) => t.date === dateFilter);
  }, [db.tasks, dateFilter]);

  const searchLower = search.trim().toLowerCase();

  const filteredTasks = useMemo(() => {
    return allForDate.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!searchLower) return true;

      const sName = (db.sales || []).find((s) => s.id === t.salesId)?.name?.toLowerCase() || '';
      const o = (db.outlets || []).find((out) => out.id === t.outletId);
      const oName = o?.name?.toLowerCase() || '';
      const oAddr = o?.address?.toLowerCase() || '';
      const tLabel = (TASK_TYPE_LABEL[t.type] || t.type || '').toLowerCase();
      const tId = `#tgs-${String(t.id).padStart(4, '0')}`.toLowerCase();

      return (
        sName.includes(searchLower) ||
        oName.includes(searchLower) ||
        oAddr.includes(searchLower) ||
        tLabel.includes(searchLower) ||
        tId.includes(searchLower)
      );
    });
  }, [allForDate, statusFilter, searchLower, db.sales, db.outlets]);

  const cnt = (s) => allForDate.filter((t) => t.status === s).length;
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};
  const areaName = (id) => (db.areas || []).find((a) => a.id === id)?.name || '-';

  return (
    <Box>
      <PageHeader
        title="Otomatisasi Tugas"
        subtitle="Penjadwalan rute & aktivitas harian tim sales — distribusi otomatis ke Web Mobile."
        action={isSupervisor && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)}>
            Buat Jadwal Tugas
          </Button>
        )}
      />

      {/* KPI Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<AssignmentRoundedIcon />} value={allForDate.length} label="Total Tugas" />
        <StatCard icon={<ScheduleRoundedIcon />} value={cnt('pending')} label="Pending" color="warning" />
        <StatCard icon={<AutorenewRoundedIcon />} value={cnt('in_progress')} label="Berlangsung" color="info" />
        <StatCard icon={<CancelRoundedIcon />} value={cnt('done')} label="Selesai" color="success" />
        <StatCard icon={<CancelRoundedIcon />} value={cnt('failed') + cnt('cancelled')} label="Gagal / Dibatalkan" color="error" />
      </Box>

      {/* Toolbar Filter Standar (Tanpa pembungkus Card berulang) */}
      <FilterToolbar
        searchPlaceholder="Cari no. tugas, outlet, atau sales…"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        shownCount={filteredTasks.length}
        totalCount={allForDate.length}
        unitLabel="tugas"
        hasActiveFilter={search !== '' || statusFilter !== 'all' || dateFilter !== todayISO()}
        onReset={() => {
          setSearch('');
          setStatusFilter('all');
          setDateFilter(todayISO());
        }}
      >
        <TextField
          type="date"
          label="Tanggal"
          value={dateFilter}
          InputLabelProps={{ shrink: true }}
          onChange={(e) => setDateFilter(e.target.value || todayISO())}
          sx={{ width: 165 }}
        />

        <TextField
          size="small"
          select
          label="Status Tugas"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 175 }}
        >
          <MenuItem value="all">Semua Status</MenuItem>
          <MenuItem value="pending">Belum Mulai</MenuItem>
          <MenuItem value="in_progress">Berlangsung</MenuItem>
          <MenuItem value="done">Selesai</MenuItem>
          <MenuItem value="failed">Gagal</MenuItem>
          <MenuItem value="cancelled">Dibatalkan</MenuItem>
        </TextField>
      </FilterToolbar>

      {/* Tabel Data Tugas */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto', mt: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tanggal</TableCell>
              <TableCell>Sales</TableCell>
              <TableCell>Outlet</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>Jenis Tugas</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Catatan</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.length ? filteredTasks.map((t) => {
              const o = outletOf(t.outletId);
              return (
                <TableRow
                  hover
                  key={t.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setDetailTask(t)}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{t.date}</TableCell>
                  <TableCell>
                    <Box title={salesName(t.salesId)} sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {salesName(t.salesId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box title={o.name || '-'} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.name || '-'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box title={areaName(o.areaId)} sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {areaName(o.areaId)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{TASK_TYPE_LABEL[t.type] || t.type}</TableCell>
                  <TableCell><StatusChip kind="task" status={t.status} /></TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {t.note || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                      <Tooltip title="Detail">
                        <IconButton size="small" onClick={() => setDetailTask(t)}>
                          <VisibilityRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isSupervisor && t.status === 'pending' && (
                        <>
                          <Tooltip title="Ubah">
                            <IconButton size="small" onClick={() => setEditTask(t)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hapus">
                            <IconButton size="small" color="error" onClick={() => setToDelete(t)}>
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState message="Belum ada jadwal pada tanggal/filter ini." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Ringkasan Progres per Sales */}
      <Card sx={{ mt: 2 }}>
        <CardHeader
          title={`Progres per Sales (${dateFilter})`}
          titleTypographyProps={{ fontSize: 15, fontWeight: 700 }}
        />
        <CardContent>
          {(db.sales || []).filter((s) => s.status === 'active').map((s) => {
            const list = allForDate.filter((t) => t.salesId === s.id);
            const done = list.filter((t) => t.status === 'done').length;
            const pct = list.length ? Math.round((done / list.length) * 100) : 0;
            return (
              <Box key={s.id} sx={{ mb: 1.75, '&:last-child': { mb: 0 } }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{done}/{list.length} • {pct}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 99 }} />
              </Box>
            );
          })}
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mt: 2 }}>
        Tugas yang masih <b>Pending / In-Progress</b> pada pukul 23:59 hari penugasan otomatis
        ditandai <b>Gagal</b> dan terkunci — tidak bisa dikerjakan hari berikutnya.
      </Alert>

      {/* Dialog Modals */}
      <TaskDetailDialog
        open={Boolean(detailTask)}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={(task) => setEditTask(task)}
        isSupervisor={isSupervisor}
      />
      <CreateScheduleDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditTaskDialog open={Boolean(editTask)} task={editTask} onClose={() => setEditTask(null)} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          remove('tasks', toDelete.id);
          setToDelete(null);
          toast('Jadwal tugas dihapus.', 'success');
        }}
        title="Hapus Jadwal Tugas"
        message={
          toDelete
            ? `Hapus tugas "${TASK_TYPE_LABEL[toDelete?.type] || toDelete?.type}" untuk ${salesName(toDelete?.salesId)} di ${outletOf(toDelete?.outletId).name || '-'}?`
            : ''
        }
        confirmLabel="Ya, Hapus"
        confirmColor="error"
      />
    </Box>
  );
}
