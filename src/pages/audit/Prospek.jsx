import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { todayISO } from '../../utils/helpers';
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_STYLES,
  normalizeProspectStatus,
} from '../../utils/auditUtils';

const CAT_STYLES = {
  'Hot Lead':  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  'Warm Lead': { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  'Cold Lead': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
};

export default function Prospek() {
  const { user } = useAuth();
  const { db, insert, update } = useDb();
  const { toast } = useToast();

  /* Semua hooks di paling atas sebelum guard role */
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');
  const [picId, setPicId] = useState(null);
  const [picSales, setPicSales] = useState('');
  const [manageCatId, setManageCatId] = useState('');
  const [manageStatus, setManageStatus] = useState('Prospek');
  const [detailProspect, setDetailProspect] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', owner: '', phone: '', address: '', areaId: '', salesId: '', categoryId: '', status: 'Prospek', note: '',
  });
  const [formErr, setFormErr] = useState({});

  if (user.role !== 'supervisor') {
    return <Alert severity="error">Akses ditolak — halaman Prospek &amp; Klasifikasi hanya untuk <b>Supervisor</b>.</Alert>;
  }

  /* BR-MD-SPV-001: Isolasi data prospek khusus tim Supervisor yang login */
  const spv = (db.supervisors || []).find((s) => s.email === user.email);
  const teamSales = (db.sales || []).filter((s) => s.status === 'active' && (!spv || s.supervisorId === spv.id));
  const teamSalesIds = spv ? new Set(teamSales.map((s) => s.id)) : null;

  const prospects = [...(db.prospects || [])]
    .reverse()
    .filter((p) => {
      if (!teamSalesIds) return true;
      if (p.salesId) return teamSalesIds.has(p.salesId);
      return spv ? p.areaId === spv.areaId : true;
    });

  const activeCategories = (db.prospectCategories || []).filter((c) => (c.status || 'active') === 'active');
  const areaName = (id) => (db.areas || []).find((a) => a.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const catOf = (id) => (db.prospectCategories || []).find((c) => c.id === id);

  const filtered = prospects.filter((p) =>
    (catFilter === 'all' || String(p.categoryId) === catFilter) &&
    (statusFilter === 'all' || normalizeProspectStatus(p.status) === statusFilter) &&
    (!q.trim() ||
      p.name.toLowerCase().includes(q.trim().toLowerCase()) ||
      (p.owner || '').toLowerCase().includes(q.trim().toLowerCase()) ||
      (p.address || '').toLowerCase().includes(q.trim().toLowerCase()))
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
          whiteSpace: 'nowrap',
        }}
      >
        {c?.name || '-'}
      </Box>
    );
  };

  const statusChip = (s) => {
    const norm = normalizeProspectStatus(s);
    const style = PROSPECT_STATUS_STYLES[norm] || { bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
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
          whiteSpace: 'nowrap',
        }}
      >
        {norm || '-'}
      </Box>
    );
  };

  const savePic = () => {
    if (!picSales) return;
    update('prospects', picId, { salesId: Number(picSales) });
    toast(`PIC prospek diperbarui → ${salesName(Number(picSales))}.`, 'success');
    setPicId(null);
  };

  const saveManage = () => {
    const p = (db.prospects || []).find((x) => x.id === picId);
    if (!p) return;
    const newCatId = manageCatId ? Number(manageCatId) : null;
    const normalizedStatus = normalizeProspectStatus(manageStatus);
    update('prospects', p.id, {
      salesId: picSales ? Number(picSales) : null,
      categoryId: newCatId,
      status: normalizedStatus,
    });

    /* Sinkron balik ke seluruh audit yang terhubung valid dengan prospek ini */
    (db.audits || []).forEach((a) => {
      const linked =
        (p.id != null && a.prospectId != null && a.prospectId === p.id) ||
        (p.outletId != null && a.outletId != null && a.outletId === p.outletId);
      if (linked) {
        update('audits', a.id, { prospectStatus: normalizedStatus, categoryId: newCatId });
      }
    });

    toast('Prospek & riwayat audit terkait diperbarui.', 'success');
    setPicId(null);
  };

  const submitAdd = () => {
    const errs = {};
    const digits = form.phone.replace(/\D/g, '');
    if (!form.name.trim()) errs.name = 'Nama prospek wajib diisi.';
    if (!form.categoryId) errs.categoryId = 'Kategori prospek wajib dipilih.';
    if (!form.areaId) errs.areaId = 'Area kerja wajib dipilih.';
    if (form.phone.trim() && (digits.length < 10 || digits.length > 15)) {
      errs.phone = 'Nomor telepon wajib 10–15 digit angka.';
    }
    setFormErr(errs);
    if (Object.keys(errs).length) return;

    insert('prospects', {
      name: form.name.trim(),
      owner: form.owner.trim(),
      phone: digits,
      address: form.address.trim(),
      areaId: Number(form.areaId),
      salesId: form.salesId ? Number(form.salesId) : null,
      categoryId: Number(form.categoryId),
      status: form.status,
      source: 'supervisor_web',
      date: todayISO(),
      note: form.note.trim(),
    });
    toast('Prospek baru berhasil ditambahkan.', 'success');
    setAddOpen(false);
    setForm({ name: '', owner: '', phone: '', address: '', areaId: '', salesId: '', categoryId: '', status: 'Prospek', note: '' });
  };

  const countCat = (name) => prospects.filter((p) => catOf(p.categoryId)?.name === name).length;

  return (
    <Box>
      <PageHeader
        title="Prospek & Klasifikasi"
        subtitle="Daftar akuisisi toko prospek baru dari Sales lapangan maupun hasil evaluasi audit."
        action={(
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setAddOpen(true)}>
            Tambah Prospek
          </Button>
        )}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<TrackChangesRoundedIcon />} value={prospects.length} label="Total prospek tim" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Hot Lead')} label="Hot Lead" color="error" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Warm Lead')} label="Warm Lead" color="warning" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={countCat('Cold Lead')} label="Cold Lead" color="info" />
      </Box>

      {/* Toolbar Filter */}
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
            {(db.prospectCategories || []).map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
            ))}
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
            {PROSPECT_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>

          <TextField
            size="small"
            label="Cari prospek / pemilik / alamat…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {filtered.length} dari {prospects.length} prospek
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nama Prospek / Outlet</TableCell>
              <TableCell>Pemilik</TableCell>
              <TableCell>Kontak</TableCell>
              <TableCell>Area</TableCell>
              <TableCell>PIC Sales</TableCell>
              <TableCell>Sumber</TableCell>
              <TableCell>Kategori</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length ? filtered.map((p) => (
              <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetailProspect(p)}>
                <TableCell>
                  <Box title={p.name} sx={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                  </Box>
                  <Box title={p.address || '-'} sx={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Typography variant="caption" color="text.secondary">{p.address || '-'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{p.owner || '-'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5, whiteSpace: 'nowrap' }}>{p.phone || '-'}</TableCell>
                <TableCell>{areaName(p.areaId)}</TableCell>
                <TableCell>
                  {p.salesId
                    ? salesName(p.salesId)
                    : <Typography variant="caption" color="text.secondary">belum ada</Typography>}
                </TableCell>
                <TableCell>
                  {p.source === 'mobile_sales' ? (
                    <Chip size="small" color="primary" variant="outlined" icon={<PhoneAndroidRoundedIcon />} label="Sales Mobile" sx={{ height: 22, fontSize: 11 }} />
                  ) : p.outletId ? (
                    <Chip size="small" variant="outlined" label="Hasil Audit" sx={{ height: 22, fontSize: 11 }} />
                  ) : (
                    <Chip size="small" variant="outlined" label="Web / Seed" sx={{ height: 22, fontSize: 11 }} />
                  )}
                </TableCell>
                <TableCell>{catChip(p.categoryId)}</TableCell>
                <TableCell>{statusChip(p.status)}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Lihat Detail & Tindak Lanjut">
                      <IconButton size="small" onClick={() => setDetailProspect(p)}>
                        <VisibilityRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ManageAccountsRoundedIcon fontSize="small" />}
                      onClick={() => {
                        setPicId(p.id);
                        setPicSales(p.salesId ? String(p.salesId) : '');
                        setManageCatId(p.categoryId ? String(p.categoryId) : '');
                        setManageStatus(normalizeProspectStatus(p.status || 'Prospek'));
                      }}
                      sx={{ borderRadius: 1, fontWeight: 650, fontSize: 12, textTransform: 'none', px: 1.1, py: 0.3 }}
                    >
                      Kelola
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="Belum ada prospek — dapat diakuisisi Sales dari aplikasi mobile atau diklasifikasikan dari audit." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Detail & Update Status Prospek (termasuk foto & GPS dari Sales Mobile) */}
      <Dialog open={!!detailProspect} onClose={() => setDetailProspect(null)} maxWidth="sm" fullWidth>
        {detailProspect && (() => {
          const fresh = (db.prospects || []).find((x) => x.id === detailProspect.id) || detailProspect;
          return (
            <>
              <DialogTitle sx={{ fontWeight: 800 }}>Detail Prospek — {fresh.name}</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Pemilik / PIC Toko</Typography>
                      <Typography variant="body2" fontWeight={700}>{fresh.owner || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">No. Telepon</Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>{fresh.phone || '-'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Area Kerja</Typography>
                      <Typography variant="body2" fontWeight={600}>{areaName(fresh.areaId)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Sales Akuisisi / PIC</Typography>
                      <Typography variant="body2" fontWeight={600}>{fresh.salesId ? salesName(fresh.salesId) : 'Belum ditentukan'}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                      <Typography variant="caption" color="text.secondary" display="block">Alamat Lengkap</Typography>
                      <Typography variant="body2" fontWeight={600}>{fresh.address || '-'}</Typography>
                      {fresh.lat && fresh.lng && (
                        <Typography variant="caption" color="primary.main" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.35 }}>
                          Koordinat GPS: {fresh.lat}, {fresh.lng}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {fresh.note && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      <b>Catatan Potensi:</b> {fresh.note}
                    </Alert>
                  )}

                  {fresh.photos?.length > 0 && (
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                        FOTO DOKUMENTASI AKUISISI LAPANGAN
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                        {fresh.photos.map((ph, idx) => (
                          <Box
                            key={idx}
                            component="img"
                            src={ph}
                            onClick={() => setZoomPhoto(ph)}
                            sx={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 1.5, border: '1px solid', borderColor: 'divider', cursor: 'zoom-in' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      select
                      size="small"
                      label="Kategori Prospek"
                      value={fresh.categoryId ? String(fresh.categoryId) : ''}
                      onChange={(e) => {
                        update('prospects', fresh.id, { categoryId: e.target.value ? Number(e.target.value) : null });
                        toast('Kategori prospek diperbarui.', 'success');
                      }}
                      fullWidth
                    >
                      <MenuItem value="">— Belum diklasifikasi —</MenuItem>
                      {activeCategories.map((c) => (
                        <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      select
                      size="small"
                      label="Status Tindak Lanjut"
                      value={normalizeProspectStatus(fresh.status) || 'Prospek'}
                      onChange={(e) => {
                        const norm = normalizeProspectStatus(e.target.value);
                        update('prospects', fresh.id, { status: norm });
                        toast(`Status prospek diubah ke ${norm}.`, 'success');
                      }}
                      fullWidth
                    >
                      {PROSPECT_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDetailProspect(null)}>Tutup</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Dialog Zoom Foto Prospek */}
      <Dialog open={!!zoomPhoto} onClose={() => setZoomPhoto(null)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ p: 0 }}>
          {zoomPhoto && <Box component="img" src={zoomPhoto} sx={{ width: '100%', display: 'block' }} />}
        </DialogContent>
      </Dialog>

      {/* Dialog Kelola Prospek (PIC, Kategori, Status — sinkron balik ke audit terkait) */}
      <Dialog open={!!picId} onClose={() => setPicId(null)} maxWidth="sm" fullWidth>
        {(() => {
          const p = (db.prospects || []).find((x) => x.id === picId);
          if (!p) return null;
          return (
            <>
              <DialogTitle>Kelola Prospek — {p.name}</DialogTitle>
              <DialogContent dividers sx={{ overflowX: 'hidden' }}>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Sales Penanggung Jawab"
                    value={picSales}
                    onChange={(e) => setPicSales(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">— Belum ditentukan —</MenuItem>
                    {teamSales.map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>{s.name} — {areaName(s.areaId)}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Kategori Prospek"
                    value={manageCatId}
                    onChange={(e) => setManageCatId(e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">— Belum diklasifikasi —</MenuItem>
                    {activeCategories.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Status Prospek"
                    value={manageStatus}
                    onChange={(e) => setManageStatus(e.target.value)}
                    fullWidth
                  >
                    {PROSPECT_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPicId(null)}>Batal</Button>
                <Button variant="contained" onClick={saveManage}>
                  Simpan
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Dialog Tambah Prospek Desktop */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tambah Prospek Baru</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <Stack spacing={2}>
            <TextField
              label="Nama Prospek / Toko *"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErr((p) => ({ ...p, name: '' })); }}
              error={!!formErr.name}
              helperText={formErr.name || ''}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              select
              label="Kategori Prospek *"
              value={form.categoryId}
              onChange={(e) => { setForm((f) => ({ ...f, categoryId: e.target.value })); setFormErr((p) => ({ ...p, categoryId: '' })); }}
              error={!!formErr.categoryId}
              helperText={formErr.categoryId || ''}
            >
              {activeCategories.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nama Pemilik"
              value={form.owner}
              onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="No. Telepon"
              value={form.phone}
              onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value.replace(/[^\d+]/g, '') })); setFormErr((p) => ({ ...p, phone: '' })); }}
              error={!!formErr.phone}
              helperText={formErr.phone || ''}
              inputProps={{ maxLength: 15 }}
            />
            <TextField
              label="Alamat"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              select
              label="Area Kerja *"
              value={form.areaId}
              onChange={(e) => { setForm((f) => ({ ...f, areaId: e.target.value })); setFormErr((p) => ({ ...p, areaId: '' })); }}
              error={!!formErr.areaId}
              helperText={formErr.areaId || ''}
            >
              {(db.areas || []).filter((a) => a.status === 'active').map((a) => (
                <MenuItem key={a.id} value={String(a.id)}>{a.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="PIC Sales" value={form.salesId} onChange={(e) => setForm((f) => ({ ...f, salesId: e.target.value }))}>
              <MenuItem value="">— Belum ditentukan —</MenuItem>
              {teamSales.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {PROSPECT_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField
              label="Catatan"
              multiline
              minRows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              inputProps={{ maxLength: 255 }}
            />
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
