import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  TextField,
  MenuItem,
  Alert,
  Stack,
  Button,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import PageHeader from '../../components/ui/PageHeader';
import FilterToolbar from '../../components/ui/FilterToolbar';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import AuditDetailDialog from '../../components/audit/AuditDetailDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import {
  QUESTION_TYPES,
  DEFAULT_AUDIT_TEMPLATE,
  getActiveAuditTemplate,
  exportAuditsCsv,
  exportAuditsExcel
} from '../../utils/auditUtils';
import { useToast } from '../../components/ui/ToastProvider';
import { nowStamp } from '../../utils/helpers';

function AuditTemplateBuilderDialog({ open, onClose }) {
  const { db, mutate } = useDb();
  const { toast } = useToast();
  const activeTpl = getActiveAuditTemplate(db);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [questions, setQuestions] = useState([]);

  // Muat data template aktif saat dialog dibuka
  useEffect(() => {
    if (open && activeTpl) {
      setFormName(activeTpl.name || 'Standar Audit Kondisi & Display Toko');
      setFormDesc(activeTpl.description || 'Kuesioner evaluasi kebersihan, penataan produk, dan materi promosi di outlet.');
      setQuestions(
        Array.isArray(activeTpl.questions) && activeTpl.questions.length > 0
          ? structuredClone(activeTpl.questions)
          : [
              { id: 'q_1', label: 'Kebersihan area pajangan produk', type: 'scale_3', weight: 1, required: true },
              { id: 'q_2', label: 'Kondisi fisik toko (dinding/lantai/atap)', type: 'scale_3', weight: 1, required: true },
              { id: 'q_3', label: 'Pencahayaan & sirkulasi udara', type: 'scale_3', weight: 1, required: true },
              { id: 'q_4', label: 'Kerapian penataan produk', type: 'scale_3', weight: 1, required: true },
              { id: 'q_5', label: 'Ketersediaan materi promosi (POSM)', type: 'scale_3', weight: 1, required: true },
            ]
      );
    }
  }, [open]);

  // Tambah baris pertanyaan baru
  const addQuestion = () => {
    const nextNum = questions.length + 1;
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        label: `Poin Pemeriksaan ${nextNum}`,
        type: 'scale_3',
        weight: 1,
        required: true,
      },
    ]);
  };

  // Hapus baris pertanyaan
  const removeQuestion = (idx) => {
    if (questions.length <= 1) {
      toast('Kuesioner audit minimal harus memiliki 1 pertanyaan.', 'warning');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  // Update atribut pertanyaan
  const updateQuestion = (idx, patch) => {
    setQuestions(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  // Simpan langsung — berlaku seketika di lapangan (Live Update)
  const handleSave = () => {
    if (!formName.trim()) {
      toast('Nama kuesioner wajib diisi.', 'warning');
      return;
    }
    if (questions.some((q) => !q.label.trim())) {
      toast('Seluruh teks pertanyaan wajib diisi (tidak boleh kosong).', 'warning');
      return;
    }

    mutate((draft) => {
      if (!Array.isArray(draft.auditTemplates) || draft.auditTemplates.length === 0) {
        draft.auditTemplates = [structuredClone(DEFAULT_AUDIT_TEMPLATE)];
      }

      // Selalu perbarui template utama aktif
      const target = draft.auditTemplates.find((t) => t.status === 'active') || draft.auditTemplates[0];
      if (target) {
        target.name = formName.trim();
        target.description = formDesc.trim();
        target.questions = structuredClone(questions);
        target.status = 'active';
        target.updatedAt = nowStamp();
      }
    });

    toast('Kuesioner audit berhasil diperbarui dan langsung aktif untuk tim sales di lapangan.', 'success');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 1.5 } }}>
      <DialogTitle
        sx={{
          fontWeight: 800,
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Kelola Formulir Kuesioner Audit</span>
        <Chip label="Aktif di Lapangan" color="success" size="small" sx={{ fontWeight: 700 }} />
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3 }}>
        {/* Pesan Ramah Pengguna (Universal & Bebas Jargon Teknis) */}
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 1.5 }}>
          Perubahan pada formulir ini akan <b>langsung diterapkan</b> pada aplikasi sales saat melakukan audit toko. 
          Pastikan pertanyaan dan bobot penilaian sudah sesuai sebelum menekan tombol simpan.
        </Alert>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField
            label="Nama Formulir Audit *"
            size="small"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Keterangan / Panduan Singkat"
            size="small"
            multiline
            rows={2}
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            fullWidth
          />
        </Stack>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          Daftar Pertanyaan Pemeriksaan ({questions.length} poin)
        </Typography>

        <Stack spacing={2}>
          {questions.map((q, idx) => (
            <Box
              key={q.id || idx}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={700}>
                  Poin #{idx + 1}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => removeQuestion(idx)}
                  disabled={questions.length <= 1}
                  title="Hapus pertanyaan"
                >
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack spacing={1.5}>
                <TextField
                  label="Teks Pertanyaan / Aspek yang Diperiksa *"
                  size="small"
                  value={q.label}
                  onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                  fullWidth
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    label="Pilihan Jawaban *"
                    size="small"
                    value={q.type || 'scale_3'}
                    onChange={(e) => updateQuestion(idx, { type: e.target.value })}
                    sx={{ flex: 1.5 }}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>
                        {t.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Tingkat Kepentingan *"
                    size="small"
                    value={q.weight || 1}
                    onChange={(e) => updateQuestion(idx, { weight: Number(e.target.value) })}
                    sx={{ flex: 0.9 }}
                  >
                    <MenuItem value={1}>Normal (1x)</MenuItem>
                    <MenuItem value={2}>Penting (2x)</MenuItem>
                    <MenuItem value={3}>Kritis (3x)</MenuItem>
                  </TextField>

                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={q.required !== false}
                        onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                      />
                    }
                    label="Wajib Diisi"
                    sx={{ ml: 1 }}
                  />
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>

        <Button
          startIcon={<AddRoundedIcon />}
          onClick={addQuestion}
          variant="outlined"
          sx={{ mt: 2, borderRadius: 1 }}
        >
          Tambah Poin Pertanyaan
        </Button>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Batal
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          sx={{ fontWeight: 700 }}
        >
          Simpan Perubahan Formulir
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AuditDesktop() {
  const { db, update } = useDb();
  const { user } = useAuth();
  const { toast } = useToast();

  const isSupervisor = user.role === 'supervisor';
  const canView = isSupervisor || user.role === 'admin';

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterLead, setFilterLead] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailId, setDetailId] = useState(null);

  if (!canView) {
    return (
      <Alert severity="error">
        Akses ditolak — modul <b>Audit &amp; Survey</b> hanya dapat diakses oleh <b>Supervisor &amp; Admin</b>.
      </Alert>
    );
  }

  const audits = (db.audits || []).slice().reverse();
  const categories = (db.prospectCategories || []).map((c) => c.name);

  const auditList = db.audits || [];
  const avgScore = auditList.length
    ? Math.round(auditList.reduce((acc, a) => acc + (Number(a.score) || 0), 0) / auditList.length)
    : 0;
  const primaCount = auditList.filter((a) => (a.score || 0) >= 75).length;
  const cukupCount = auditList.filter((a) => (a.score || 0) >= 50 && (a.score || 0) < 75).length;
  const kurangCount = auditList.filter((a) => (a.score || 0) < 50).length;

  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const catOf = (id) => (db.prospectCategories || []).find((c) => c.id === Number(id));

  const handleExportCsv = () => {
    const count = exportAuditsCsv(db, filteredList);
    toast(`${count} data audit berhasil diekspor ke format CSV.`, 'success');
  };

  const handleExportExcel = () => {
    const count = exportAuditsExcel(db, filteredList);
    toast(`${count} data audit berhasil diekspor ke Microsoft Excel (.xls).`, 'success');
  };

  const filteredList = useMemo(() => {
    return audits.filter((a) => {
      const matchSearch =
        !search ||
        (a.no && a.no.toLowerCase().includes(search.toLowerCase())) ||
        (outletName(a.outletId) && outletName(a.outletId).toLowerCase().includes(search.toLowerCase())) ||
        (salesName(a.salesId) && salesName(a.salesId).toLowerCase().includes(search.toLowerCase()));

      const matchKategori = !filterKategori || catOf(a.categoryId)?.name === filterKategori;
      const matchLead = !filterLead || a.prospectStatus === filterLead;

      return matchSearch && matchKategori && matchLead;
    });
  }, [audits, search, filterKategori, filterLead]);

  const paginatedList = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, page, rowsPerPage]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleResetFilter = () => {
    setSearch('');
    setFilterKategori('');
    setFilterLead('');
    setPage(0);
  };

  const handleSaveClassification = (auditId, newStatus, newCatatan) => {
    if (update) {
      update('audits', auditId, { prospectStatus: newStatus, note: newCatatan });
    }
  };

  const detailAudit = (db.audits || []).find((a) => a.id === detailId);

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="Audit & Kualifikasi Toko"
        subtitle="Verifikasi hasil audit toko fisik, kuesioner dinamis, dan kualifikasi prospek sales"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              onClick={handleExportCsv}
              sx={{ borderRadius: 1 }}
            >
              Ekspor CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadRoundedIcon />}
              onClick={handleExportExcel}
              sx={{ borderRadius: 1 }}
            >
              Ekspor Excel
            </Button>
            {isSupervisor && (
              <Button
                variant="contained"
                startIcon={<TuneRoundedIcon />}
                onClick={() => setTemplateDialogOpen(true)}
                sx={{ borderRadius: 1, fontWeight: 700 }}
              >
                Form Builder
              </Button>
            )}
          </Stack>
        }
      />

      {/* Stat Cards Row — 1:1 standar modul Quotation & Entry Order */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1.5, mb: 2.5 }}>
        <StatCard icon={<DescriptionRoundedIcon />} value={auditList.length} label="Total Laporan Audit" />
        <StatCard icon={<ScheduleRoundedIcon />} value={primaCount} label="Kelayakan Prima" color="success" />
        <StatCard icon={<CheckCircleOutlineRoundedIcon />} value={cukupCount} label="Kelayakan Cukup" color="warning" />
        <StatCard icon={<ErrorOutlineRoundedIcon />} value={kurangCount} label="Perlu Evaluasi" color="error" />
        <StatCard icon={<AttachMoneyRoundedIcon />} value={avgScore} label="Rata-rata Skor" />
      </Box>

      {/* Toolbar Filter Standar (Tanpa Pembungkus Card) */}
      <FilterToolbar
        searchPlaceholder="Cari no. audit, outlet, atau sales…"
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(0);
        }}
        shownCount={filteredList.length}
        totalCount={audits.length}
        unitLabel="audit"
        hasActiveFilter={search !== '' || filterKategori !== '' || filterLead !== ''}
        onReset={handleResetFilter}
      >
        <TextField
          size="small"
          select
          label="Kategori Toko"
          value={filterKategori}
          onChange={(e) => { setFilterKategori(e.target.value); setPage(0); }}
          sx={{ width: 165 }}
        >
          <MenuItem value="">Semua Kategori</MenuItem>
          {categories.map((k) => (
            <MenuItem key={k} value={k}>
              {k}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          select
          label="Status Prospek"
          value={filterLead}
          onChange={(e) => { setFilterLead(e.target.value); setPage(0); }}
          sx={{ width: 175 }}
        >
          <MenuItem value="">Semua Status</MenuItem>
          <MenuItem value="Prospek">Prospek</MenuItem>
          <MenuItem value="Follow Up">Follow Up</MenuItem>
          <MenuItem value="Negosiasi">Negosiasi</MenuItem>
          <MenuItem value="Disetujui">Disetujui</MenuItem>
          <MenuItem value="Ditolak">Ditolak</MenuItem>
        </TextField>
      </FilterToolbar>

      {/* Tabel Data Audit */}
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 70, textAlign: 'center' }}>No Audit</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tanggal &amp; Waktu</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sales</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Outlet</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Skor</TableCell>
                <TableCell sx={{ fontWeight: 700, align: 'center' }}>Foto</TableCell>
                <TableCell sx={{ fontWeight: 700, align: 'center' }}>Selisih Stok</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Kategori</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 70, textAlign: 'center' }}>Aksi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    Tidak ada data audit yang sesuai dengan filter pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedList.map((a) => {
                  const dev = (a.stocks || []).reduce((s, x) => s + Math.abs(x.diff || 0), 0);
                  const cat = catOf(a.categoryId);
                  return (
                    <TableRow
                      hover
                      key={a.id}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => setDetailId(a.id)}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{a.no}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {a.date}{' '}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          ({a.time || (a.createdAt ? a.createdAt.slice(11, 16) : '09:00')})
                        </Typography>
                      </TableCell>
                      <TableCell>{salesName(a.salesId)}</TableCell>
                      <TableCell>{outletName(a.outletId)}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{a.score || 0}/100</TableCell>
                      <TableCell align="center">{a.photos ? a.photos.length : 0}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{dev}</TableCell>
                      <TableCell>{cat?.name || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Detail">
                          <IconButton size="small" onClick={() => setDetailId(a.id)}>
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={filteredList.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Baris per halaman:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} dari ${count}`}
        />
      </Card>

      {/* Modal Detail & Kualifikasi Prospek */}
      <AuditDetailDialog
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        audit={detailAudit}
        canClassify={isSupervisor}
        onSaveClassification={handleSaveClassification}
      />

      {/* Modal Dynamic Form Builder */}
      <AuditTemplateBuilderDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
      />
    </Box>
  );
}
