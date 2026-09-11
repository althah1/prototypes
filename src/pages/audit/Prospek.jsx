import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';

import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';

const CAT_COLOR = { 'Hot Lead': 'error', 'Warm Lead': 'warning', 'Cold Lead': 'info' };
const STATUS_COLOR = { 'Prospek': 'default', 'Negosiasi': 'info', 'Disetujui': 'success', 'Ditolak': 'error' };
const STATUS_LIST = ['Prospek', 'Negosiasi', 'Disetujui', 'Ditolak'];

export default function Prospek() {
  const { user } = useAuth();
  const { db, insert, update } = useDb();
  const { toast } = useToast();

  /* Hooks dulu — baru guard role */
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');
  const [picId, setPicId] = useState(null);          /* prospek yang sedang diatur PIC-nya */
  const [picSales, setPicSales] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', owner: '', phone: '', address: '', areaId: '', salesId: '', categoryId: '', status: 'Prospek', note: '' });
  const [formErr, setFormErr] = useState({});

  if (user.role !== 'supervisor') {
    return <Alert severity="error">Akses ditolak — halaman Prospek &amp; Klasifikasi hanya untuk <b>Supervisor</b> (RBAC #5).</Alert>;
  }

  const prospects = db.prospects || [];
  const areaName = (id) => (db.areas || []).find((a) => a.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const catOf = (id) => (db.prospectCategories || []).find((c) => c.id === id);

  const filtered = prospects.filter((p) =>
    (catFilter === 'all' || String(p.categoryId) === catFilter) &&
    (statusFilter === 'all' || p.status === statusFilter) &&
    (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()) || (p.address || '').toLowerCase().includes(q.trim().toLowerCase()))
  );

  const catChip = (cid) => {
    const c = catOf(cid);
    const color = CAT_COLOR[c?.name] || 'default';
    return <Chip size="small" color={color} label={c?.name || '-'} variant={color === 'default' ? 'outlined' : 'filled'} />;
  };
  const statusChip = (s) => {
    const color = STATUS_COLOR[s] || 'default';
    return <Chip size="small" color={color} label={s} variant={color === 'default' ? 'outlined' : 'filled'} />;
  };

  const savePic = () => {
    if (!picSales) return;
    update('prospects', picId, { salesId: Number(picSales) });
    toast(`PIC prospek diperbarui → ${salesName(Number(picSales))}.`, 'success');
    setPicId(null);
  };

  const submitAdd = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nama prospek wajib diisi.';
    if (!form.areaId) errs.areaId = 'Area kerja wajib dipilih.';
    setFormErr(errs);
    if (Object.keys(errs).length) return;
    insert('prospects', {
      name: form.name.trim(), owner: form.owner.trim(), phone: form.phone.trim(),
      address: form.address.trim(), areaId: Number(form.areaId),
      salesId: form.salesId ? Number(form.salesId) : null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      status: form.status, note: form.note.trim(),
    });
    toast('Prospek baru ditambahkan (#27).', 'success');
    setAddOpen(false);
    setForm({ name: '', owner: '', phone: '', address: '', areaId: '', salesId: '', categoryId: '', status: 'Prospek', note: '' });
  };

  const countCat = (name) => prospects.filter((p) => catOf(p.categoryId)?.name === name).length;

  return (
    <Box>
      <PageHeader
        title="Prospek & Klasifikasi"
        subtitle="Hasil pemetaan calon pelanggan dari audit lapangan — integrasi Kategori Prospek & GPS Route Planning (#28/#70)."
        action={(
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}>
            Tambah Prospek (#27)
          </Button>
        )}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<TrackChangesRoundedIcon />} value={prospects.length} label="Total prospek" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Hot Lead')} label="Hot Lead" color="error" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Warm Lead')} label="Warm Lead" color="warning" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Cold Lead')} label="Cold Lead" color="info" />
      </Box>

      {/* ============ Toolbar Filter: Kategori + Status + Pencarian ============ */}
<Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
  <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
      <FilterListRoundedIcon fontSize="small" />
      <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
    </Stack>

    <TextField
      size="small"
      select
      label="Kategori"
      value={catFilter}
      onChange={(e) => setCatFilter(e.target.value)}
      sx={{ width: 170 }}
    >
      <MenuItem value="all">Semua Kategori</MenuItem>
      {(db.prospectCategories || []).map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
    </TextField>

    <TextField
      size="small"
      select
      label="Status"
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      sx={{ width: 170 }}
    >
      <MenuItem value="all">Semua Status</MenuItem>
      {STATUS_LIST.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
    </TextField>

    <TextField
      size="small"
      label="Cari prospek / alamat…"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }}
    />

    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
      Menampilkan {filtered.length} dari {prospects.length} prospek
    </Typography>
  </Stack>
</Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nama Prospek / Outlet</TableCell><TableCell>Pemilik</TableCell><TableCell>Kontak</TableCell>
              <TableCell>Area</TableCell><TableCell>PIC Sales</TableCell><TableCell>Kategori</TableCell>
              <TableCell>Status</TableCell><TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.address || '-'}</Typography>
                </TableCell>
                <TableCell>{p.owner || '-'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{p.phone || '-'}</TableCell>
                <TableCell>{areaName(p.areaId)}</TableCell>
                <TableCell>{p.salesId ? salesName(p.salesId) : <Typography variant="caption" color="text.secondary">belum ada</Typography>}</TableCell>
                <TableCell>{catChip(p.categoryId)}</TableCell>
                <TableCell>{statusChip(p.status)}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" startIcon={<ManageAccountsRoundedIcon />}
                    onClick={() => { setPicId(p.id); setPicSales(p.salesId ? String(p.salesId) : ''); }}>
                    Atur PIC
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={8}><EmptyState message="Belum ada prospek — klasifikasikan dari hasil audit (#69)." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Atur PIC */}
      <Dialog open={!!picId} onClose={() => setPicId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Atur PIC Sales — {(db.prospects || []).find((p) => p.id === picId)?.name}</DialogTitle>
        <DialogContent dividers>
          <TextField select label="Sales Penanggung Jawab" value={picSales} onChange={(e) => setPicSales(e.target.value)} fullWidth>
            {(db.sales || []).filter((s) => s.status === 'active').map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>{s.name} — {areaName(s.areaId)}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicId(null)}>Batal</Button>
          <Button variant="contained" onClick={savePic} disabled={!picSales}>Simpan</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Tambah Prospek */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tambah Prospek Baru (#27)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Nama Prospek / Toko *" value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErr((p) => ({ ...p, name: '' })); }}
              error={!!formErr.name} helperText={formErr.name || ' '} inputProps={{ maxLength: 100 }} />
            <TextField label="Nama Pemilik" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} inputProps={{ maxLength: 100 }} />
            <TextField label="No. Telepon" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} inputProps={{ maxLength: 15 }} />
            <TextField label="Alamat" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} inputProps={{ maxLength: 200 }} />
            <TextField select label="Area Kerja *" value={form.areaId}
              onChange={(e) => { setForm((f) => ({ ...f, areaId: e.target.value })); setFormErr((p) => ({ ...p, areaId: '' })); }}
              error={!!formErr.areaId} helperText={formErr.areaId || ' '}>
              {(db.areas || []).filter((a) => a.status === 'active').map((a) => (
                <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="PIC Sales" value={form.salesId} onChange={(e) => setForm((f) => ({ ...f, salesId: e.target.value }))}>
              <MenuItem value="">— Belum ditentukan —</MenuItem>
              {(db.sales || []).filter((s) => s.status === 'active').map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Kategori Prospek" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
              <MenuItem value="">— Belum diklasifikasi —</MenuItem>
              {(db.prospectCategories || []).map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUS_LIST.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Catatan" multiline minRows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} inputProps={{ maxLength: 255 }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Batal</Button>
          <Button variant="contained" onClick={submitAdd}>Simpan Prospek</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}