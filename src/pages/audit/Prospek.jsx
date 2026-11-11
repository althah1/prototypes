import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
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
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import FilterToolbar from '../../components/ui/FilterToolbar';
import { ModalHeader, FormSection } from '../../components/ui/DetailGrid';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';

const CAT_STYLES = {
  'Hot Lead':  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  'Warm Lead': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Cold Lead': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
};

const STATUS_STYLES = {
  'Prospek':   { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
  'Follow Up': { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  'Negosiasi': { bg: '#eff6ff', color: '#1d4ed8', border: '#fecaca' },
  'Disetujui': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Closing':   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Ditolak':   { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
};

const STATUS_LIST = ['Prospek', 'Negosiasi', 'Disetujui', 'Ditolak'];

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

function ProspectDetailDialog({ open, prospect, onClose, onPic, isSupervisor }) {
  const { db } = useDb();
  if (!prospect) return null;

  const area = (db.areas || []).find((a) => a.id === prospect.areaId);
  const sales = (db.sales || []).find((s) => s.id === prospect.salesId);
  const cat = (db.prospectCategories || []).find((c) => c.id === prospect.categoryId);

  return (
    <Dialog
      open={Boolean(open && prospect)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 1.5 } }}
    >
      <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', px: { xs: 2, sm: 3 }, py: 2 }}>
        Detail Calon Mitra Toko — {prospect.name}
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity={prospect.status === 'Disetujui' ? 'success' : prospect.status === 'Ditolak' ? 'error' : 'info'} sx={{ mb: 2.5, borderRadius: 1.5 }}>
          Status Akuisisi: <b>{prospect.status}</b> — Kategori Klasifikasi: <b>{cat?.name || 'Cold Lead (Prospek Awal)'}</b>
        </Alert>

        {/* Grid Metadata 2 Kolom */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 3, rowGap: 0.5, mb: 3 }}>
          <KV label="Nama Toko Prospek" value={prospect.name} />
          <KV label="Kategori Prioritas" value={cat?.name || 'Cold Lead (Prospek Awal)'} />
          <KV label="Nama Pemilik" value={prospect.owner || '-'} />
          <KV label="No. Telepon / WhatsApp" value={prospect.phone || '-'} />
          <KV label="Wilayah / Area Kerja" value={area?.name || '-'} />
          <KV label="PIC Sales Penanggung Jawab" value={sales?.name || 'Belum Ditugaskan'} />
          <KV label="Tanggal Registrasi" value={prospect.createdAt || '-'} />
          <KV label="Alamat Lengkap" value={prospect.address || '-'} />
        </Box>

        {/* Tabel Rincian Produk */}
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          Parameter Kualifikasi Toko & Potensi Bisnis (1 calon mitra)
        </Typography>

        <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2.5 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Parameter Verifikasi</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Standar Kelayakan</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status Verifikasi</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Tindak Lanjut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>{cat?.name || 'Kategori Standar'}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Kelayakan display & estimasi omset</Typography>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Prioritas Akuisisi Toko</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{prospect.status}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>{sales ? 'Penjadwalan Kunjungan' : 'Menunggu Alokasi PIC'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Ringkasan Total */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, p: 2, borderRadius: 1, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>KATEGORI MITRA</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{cat?.name || 'Cold Lead (Prospek Awal)'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>WILAYAH DISTRIBUSI</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{area?.name || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800, display: 'block' }}>TAHAPAN PIPELINE</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 850, color: 'primary.main' }}>{(prospect.status || 'PROSPEK').toUpperCase()}</Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 1 }}>
          Tutup
        </Button>
        {isSupervisor && (
          <Button variant="contained" color="primary" onClick={() => { onClose(); onPic(prospect); }} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Atur PIC Sales
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default function Prospek() {
  const { user } = useAuth();
  const { db, insert, update } = useDb();
  const { toast } = useToast();

  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');
  const [picId, setPicId] = useState(null);
  const [picSales, setPicSales] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [detailProspect, setDetailProspect] = useState(null);
  const [form, setForm] = useState({ name: '', owner: '', phone: '', address: '', areaId: '', salesId: '', categoryId: '', status: 'Prospek', note: '' });
  const [formErr, setFormErr] = useState({});

  const isSupervisor = user.role === 'supervisor';
  const canView = isSupervisor || user.role === 'admin';

  if (!canView) {
    return <Alert severity="error">Akses ditolak — halaman Prospek &amp; Klasifikasi hanya untuk <b>Supervisor &amp; Admin</b>.</Alert>;
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
    const style = CAT_STYLES[c?.name] || { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1,
          py: 0.35,
          borderRadius: '4px',
          bgcolor: style.bg,
          color: style.color,
          border: '1px solid',
          borderColor: style.border,
          fontSize: '0.725rem',
          fontWeight: 650,
          lineHeight: 1.2,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {c?.name || '-'}
      </Box>
    );
  };

  const statusChip = (s) => {
    const style = STATUS_STYLES[s] || { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1,
          py: 0.35,
          borderRadius: '4px',
          bgcolor: style.bg,
          color: style.color,
          border: '1px solid',
          borderColor: style.border,
          fontSize: '0.725rem',
          fontWeight: 650,
          lineHeight: 1.2,
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        {s || '-'}
      </Box>
    );
  };

  const savePic = () => {
    if (!picSales || !picId) return;
    update('prospects', Number(picId), { salesId: Number(picSales) });
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
    toast('Prospek baru ditambahkan.', 'success');
    setAddOpen(false);
    setForm({ name: '', owner: '', phone: '', address: '', areaId: '', salesId: '', categoryId: '', status: 'Prospek', note: '' });
  };

  const countCat = (name) => prospects.filter((p) => catOf(p.categoryId)?.name === name).length;

  return (
    <Box>
      <PageHeader
        title="Prospek & Klasifikasi"
        subtitle={`Hasil pemetaan calon pelanggan dari audit lapangan${isSupervisor ? '' : ' (Mode Pemantauan Admin)'}.`}
        action={isSupervisor && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}>
            Tambah Prospek
          </Button>
        )}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<TrackChangesRoundedIcon />} value={prospects.length} label="Total prospek" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Hot Lead')} label="Hot Lead" color="error" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Warm Lead')} label="Warm Lead" color="warning" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Cold Lead')} label="Cold Lead" color="info" />
      </Box>

      {/* Toolbar Filter Standar */}
      <FilterToolbar
        searchValue={q}
        onSearchChange={(v) => setQ(v)}
        searchPlaceholder="Cari nama prospek atau alamat…"
        shownCount={filtered.length}
        totalCount={prospects.length}
        unitLabel="prospek"
        hasActiveFilter={q !== '' || catFilter !== 'all' || statusFilter !== 'all'}
        onReset={() => { setQ(''); setCatFilter('all'); setStatusFilter('all'); }}
      >
        <TextField
          size="small"
          select
          label="Kategori"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          sx={{ width: 165 }}
        >
          <MenuItem value="all">Semua Kategori</MenuItem>
          {(db.prospectCategories || []).map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          select
          label="Status Prospek"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 175 }}
        >
          <MenuItem value="all">Semua Status</MenuItem>
          {STATUS_LIST.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </FilterToolbar>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
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
              <TableRow
                hover
                key={p.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => setDetailProspect(p)}>
                <TableCell>
                  <Box title={p.name} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                  </Box>
                  <Box title={p.address || '-'} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Typography variant="caption" color="text.secondary">{p.address || '-'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box title={p.owner || '-'} sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.owner || '-'}</Box>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5, whiteSpace: 'nowrap' }}>{p.phone || '-'}</TableCell>
                <TableCell>
                  <Box title={areaName(p.areaId)} sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{areaName(p.areaId)}</Box>
                </TableCell>
                <TableCell>
                  {p.salesId ? (
                    <Box title={salesName(p.salesId)} sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{salesName(p.salesId)}</Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">belum ada</Typography>
                  )}
                </TableCell>
                <TableCell>{catChip(p.categoryId)}</TableCell>
                <TableCell>{statusChip(p.status)}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    <Tooltip title="Detail">
                      <IconButton size="small" onClick={() => setDetailProspect(p)}>
                        <VisibilityRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {isSupervisor && (
                      <Tooltip title="PIC">
                        <IconButton
                          size="small"
                          onClick={() => { setPicId(p.id); setPicSales(p.salesId ? String(p.salesId) : ''); }}
                        >
                          <ManageAccountsRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={8}><EmptyState message="Belum ada prospek — klasifikasikan dari hasil audit." /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Atur PIC — Bersih & Bebas Crash */}
      <Dialog open={Boolean(picId)} onClose={() => setPicId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Atur PIC Sales — {(db.prospects || []).find((p) => String(p.id) === String(picId))?.name || 'Prospek'}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <TextField
            select
            label="Sales Penanggung Jawab"
            value={picSales}
            onChange={(e) => setPicSales(e.target.value)}
            fullWidth
          >
            <MenuItem value="">— Pilih Sales —</MenuItem>
            {(db.sales || []).filter((s) => s.status === 'active').map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name} — {areaName(s.areaId)}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPicId(null)}>Batal</Button>
          <Button variant="contained" onClick={savePic} disabled={!picSales}>Simpan</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Tambah Prospek */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
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
          title="Tambah Prospek Baru"
          subtitle="Isi data calon mitra toko, kontak, dan klasifikasi awal."
          onClose={() => setAddOpen(false)}
        />
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5}>
            <Box>
              <FormSection title="Identitas Toko" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  label="Nama Prospek / Toko *"
                  value={form.name}
                  onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErr((p) => ({ ...p, name: '' })); }}
                  error={!!formErr.name}
                  helperText={formErr.name || ' '}
                  inputProps={{ maxLength: 100 }}
                />
                <TextField label="Nama Pemilik" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} inputProps={{ maxLength: 100 }} />
              </Box>
            </Box>

            <Box>
              <FormSection title="Kontak & Lokasi" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="No. Telepon" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} inputProps={{ maxLength: 15 }} />
                <TextField label="Alamat" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} inputProps={{ maxLength: 200 }} />
              </Box>
            </Box>

            <Box>
              <FormSection title="Klasifikasi & Penanggung Jawab" />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
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
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
                <TextField select label="Kategori Prospek" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                  <MenuItem value="">— Belum diklasifikasi —</MenuItem>
                  {(db.prospectCategories || []).map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {STATUS_LIST.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Box>
            </Box>

            <Box>
              <FormSection title="Catatan Tambahan" />
              <TextField
                label="Catatan"
                multiline
                minRows={2}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                inputProps={{ maxLength: 255 }}
                fullWidth
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, justifyContent: 'flex-end', gap: 1.25 }}>
          <Button onClick={() => setAddOpen(false)} variant="outlined" color="inherit" sx={{ borderRadius: 1, fontWeight: 600 }}>
            Batal
          </Button>
          <Button variant="contained" onClick={submitAdd} sx={{ borderRadius: 1, fontWeight: 650, px: 2.5 }}>
            Simpan Prospek
          </Button>
        </DialogActions>
      </Dialog>

      <ProspectDetailDialog
        open={Boolean(detailProspect)}
        prospect={detailProspect}
        onClose={() => setDetailProspect(null)}
        onPic={(prospect) => { setPicId(prospect.id); setPicSales(prospect.salesId ? String(prospect.salesId) : ''); }}
        isSupervisor={isSupervisor}
      />
    </Box>
  );
}
