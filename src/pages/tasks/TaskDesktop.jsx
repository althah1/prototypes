import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
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

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useSync } from '../../store/SyncContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO, dateID, TASK_TYPE_LABEL } from '../../utils/helpers';
import { expireTasks } from '../../utils/taskUtils';

/* ============ Dialog: BUAT JADWAL (BR-TASK-001 & #30) ============ */
function CreateScheduleDialog({ open, onClose }) {
  const { user } = useAuth();
  const { db, insert } = useDb();
  const { notify } = useSync();
  const { toast } = useToast();

  /* FIX: guard tabel areas — dialog TERTUTUP pun tetap mengeksekusi
     render function ini, jadi semua akses db di sini wajib aman. */
  const areas = db.areas || [];

  /* BR-TASK-001: Supervisor hanya menjadwalkan SALES BAWAHANNYA */
  const spv = (db.supervisors || []).find((s) => s.email === user.email);
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
      setDate(todayISO()); setType('order'); setOutletIds([]); setNote(''); setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedSales = (db.sales || []).find((s) => s.id === Number(salesId));
  /* BR-TASK-001: hanya OUTLET dalam Area Kerja sales terpilih */
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Buat Jadwal Tugas</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField select label="Sales (bawahan) *" value={salesId}
            onChange={(e) => { setSalesId(e.target.value); setOutletIds([]); setErrors((p) => ({ ...p, salesId: '' })); }}
            error={!!errors.salesId} helperText={errors.salesId || 'Difilter otomatis sesuai hierarki Supervisor (BR-TASK-001).'}>
            {teamSales.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name} — {areas.find((a) => a.id === s.areaId)?.name || ''}
              </MenuItem>
            ))}
          </TextField>

          <TextField type="date" label="Tanggal Tugas *" value={date} InputLabelProps={{ shrink: true }}
            onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: '' })); }}
            inputProps={{ min: todayISO() }}
            error={!!errors.date} helperText={errors.date || 'Tidak boleh tanggal lampau (no backdating).'} />

          <TextField select label="Jenis Tugas *" value={type} onChange={(e) => setType(e.target.value)}>
            {(db.taskTypes || []).filter((t) => t.status === 'active').map((t) => (
              <MenuItem key={t.id} value={t.type}>{t.name}</MenuItem>
            ))}
          </TextField>

          <Box>
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

          <TextField label="Catatan Khusus (opsional, maks 255)" multiline minRows={2}
            value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 255 }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Batal</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
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
    if (open && task) { setDate(task.date); setType(task.type); setNote(task.note || ''); setErr(''); }
  }, [open, task]);

  const submit = () => {
    if (!date) return setErr('Tanggal wajib dipilih.');
    if (date < todayISO()) return setErr('Tidak dapat menjadwalkan tugas untuk tanggal yang sudah lewat.');
    update('tasks', task.id, { date, type, note: note.trim() });
    toast('Jadwal tugas diperbarui.', 'success');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ubah Jadwal Tugas</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField type="date" label="Tanggal Tugas *" value={date} InputLabelProps={{ shrink: true }}
            onChange={(e) => { setDate(e.target.value); setErr(''); }} inputProps={{ min: todayISO() }} />
          <TextField select label="Jenis Tugas" value={type} onChange={(e) => setType(e.target.value)}>
            {(db.taskTypes || []).filter((t) => t.status === 'active').map((t) => (
              <MenuItem key={t.id} value={t.type}>{t.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Catatan (maks 255)" multiline minRows={2} value={note}
            onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 255 }} />
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Batal</Button>
        <Button variant="contained" onClick={submit}>Simpan Perubahan</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============ Halaman utama ============ */
export default function TaskDesktop() {
  const { user } = useAuth();
  const { db, mutate, remove } = useDb();
  const { toast } = useToast();
  const isSupervisor = user.role === 'supervisor';

  const [dateFilter, setDateFilter] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  /* BR-TASK-004 — kedaluwarsa harian (simulasi cron, dijalankan sekali) */
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = expireTasks(db, mutate);
    if (n > 0) toast(`${n} tugas kedaluwarsa otomatis ditandai Gagal (BR-TASK-004).`, 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allForDate = (db.tasks || []).filter((t) => t.date === dateFilter);
  const rows = statusFilter === 'all' ? allForDate : allForDate.filter((t) => t.status === statusFilter);
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

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<AssignmentRoundedIcon />} value={allForDate.length} label="Total Tugas" />
        <StatCard icon={<ScheduleRoundedIcon />} value={cnt('pending')} label="Pending" color="warning" />
        <StatCard icon={<AutorenewRoundedIcon />} value={cnt('in_progress')} label="Berlangsung" color="info" />
        <StatCard icon={<CheckCircleRoundedIcon />} value={cnt('done')} label="Selesai" color="success" />
        <StatCard icon={<CancelRoundedIcon />} value={cnt('failed') + cnt('cancelled')} label="Gagal / Dibatalkan" color="error" />
      </Box>

      {/* ============ Toolbar Filter: Tanggal + Status (simetris & menyatu dengan tabel) ============ */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}
      >
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
            onChange={(e) => setDateFilter(e.target.value || todayISO())}
            sx={{ width: 170 }}
          />

          <TextField
            size="small"
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ width: 170 }}
          >
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="pending">Belum Mulai</MenuItem>
            <MenuItem value="in_progress">Berlangsung</MenuItem>
            <MenuItem value="done">Selesai</MenuItem>
            <MenuItem value="failed">Gagal</MenuItem>
            <MenuItem value="cancelled">Dibatalkan</MenuItem>
          </TextField>

          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {rows.length} dari {allForDate.length} tugas
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tanggal</TableCell><TableCell>Sales</TableCell><TableCell>Outlet</TableCell>
              <TableCell>Area</TableCell><TableCell>Jenis Tugas</TableCell><TableCell>Status</TableCell>
              <TableCell>Catatan</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length ? rows.map((t) => {
              const o = outletOf(t.outletId);
              return (
                <TableRow key={t.id}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{t.date}</TableCell>
                  <TableCell>{salesName(t.salesId)}</TableCell>
                  <TableCell>{o.name || '-'}</TableCell>
                  <TableCell>{areaName(o.areaId)}</TableCell>
                  <TableCell>{TASK_TYPE_LABEL[t.type] || t.type}</TableCell>
                  <TableCell><StatusChip kind="task" status={t.status} /></TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">{t.note || '-'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    {isSupervisor && t.status === 'pending' ? (
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Ubah jadwal"><IconButton size="small" onClick={() => setEditTask(t)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Hapus jadwal"><IconButton size="small" color="error" onClick={() => setToDelete(t)}><DeleteRoundedIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={8}><EmptyState message="Belum ada jadwal pada tanggal/filter ini." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Card sx={{ mt: 2 }}>
        <CardHeader title={`Progres per Sales (${dateFilter})`} titleTypographyProps={{ fontSize: 15, fontWeight: 700 }} />
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
        Tugas <b>Pending / In-Progress</b> pada pukul 23:59 hari penugasan otomatis menjadi <b>Gagal</b> dan terkunci (BR-TASK-004 — cron backend, disimulasikan saat halaman dibuka).
      </Alert>

      <CreateScheduleDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditTaskDialog open={!!editTask} task={editTask} onClose={() => setEditTask(null)} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => { remove('tasks', toDelete.id); setToDelete(null); toast('Jadwal tugas dihapus.', 'success'); }}
        title="Hapus Jadwal Tugas"
        message={`Hapus tugas "${TASK_TYPE_LABEL[toDelete?.type]}" untuk ${salesName(toDelete?.salesId)} di ${outletOf(toDelete?.outletId).name || '-'}?`}
        confirmLabel="Ya, Hapus"
        confirmColor="error"
      />
    </Box>
  );
}