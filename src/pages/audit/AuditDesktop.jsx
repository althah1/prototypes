import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
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
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DynamicFormRoundedIcon from '@mui/icons-material/DynamicFormRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import GradeRoundedIcon from '@mui/icons-material/GradeRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PublishedWithChangesRoundedIcon from '@mui/icons-material/PublishedWithChangesRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import TableViewRoundedIcon from '@mui/icons-material/TableViewRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';

import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import AuditDetailDialog from '../../components/audit/AuditDetailDialog';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { nowStamp, todayISO } from '../../utils/helpers';
import {
  DEFAULT_AUDIT_TEMPLATE,
  QUESTION_TYPES,
  exportAuditsCsv,
  exportAuditsExcel,
  getActiveAuditTemplate,
  getAuditTemplates,
  isTemplateLocked,
} from '../../utils/auditUtils';

/* ============ Komponen Grafik Analitik Rekapitulasi Audit (FSD Bab 4.6) ============ */
function AuditAnalyticsPanel({ audits, db, outletName }) {
  /* 1. Rata-rata capaian per item pertanyaan kuesioner */
  const itemStats = useMemo(() => {
    const map = new Map();
    audits.forEach((a) => {
      (a.checklist || []).forEach((c) => {
        if ((c.type || 'scale_3') === 'text') return;
        const maxS = Number(c.maxScore) || 3;
        const pct = Math.round(((Number(c.score) || 0) / maxS) * 100);
        const cur = map.get(c.item) || { label: c.item, sum: 0, count: 0 };
        cur.sum += pct;
        cur.count += 1;
        map.set(c.item, cur);
      });
    });
    return [...map.values()]
      .map((x) => ({ ...x, avg: x.count ? Math.round(x.sum / x.count) : 0 }))
      .sort((a, b) => a.avg - b.avg);
  }, [audits]);

  /* 2. Skor kunjungan terbaru (maks 8 laporan terakhir) */
  const recentBars = useMemo(
    () => audits.slice(0, 8).reverse(),
    [audits]
  );

  /* 3. Distribusi klasifikasi prospek dari hasil audit */
  const catDist = useMemo(() => {
    const palette = ['#dc2626', '#d97706', '#2563eb', '#059669', '#7c3aed'];
    const counts = new Map();
    let unclassified = 0;
    audits.forEach((a) => {
      if (!a.categoryId) {
        unclassified += 1;
        return;
      }
      const cat = (db.prospectCategories || []).find((c) => c.id === a.categoryId);
      const name = cat?.name || `Kategori #${a.categoryId}`;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const slices = [...counts.entries()].map(([label, value], i) => ({
      label,
      value,
      color: palette[i % palette.length],
    }));
    if (unclassified > 0) {
      slices.push({ label: 'Belum Diklasifikasi', value: unclassified, color: '#94a3b8' });
    }
    return slices;
  }, [audits, db.prospectCategories]);

  const accurateStockCount = audits.filter(
    (a) => (a.stocks || []).every((s) => (s.diff || 0) === 0)
  ).length;
  const stockAccuracyPct = audits.length ? Math.round((accurateStockCount / audits.length) * 100) : 0;

  if (!audits.length) {
    return (
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3 }}>
        <EmptyState message="Belum ada data audit untuk divisualisasikan pada grafik analitik." />
      </Paper>
    );
  }

  /* Hitung segmen SVG Donut Chart */
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let accOffset = 0;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 2 }}>
      {/* Kartu 1: Rata-rata Skor per Aspek Kuesioner */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.25 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          Capaian Rata-Rata per Aspek Kuesioner
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Diurutkan dari aspek terendah untuk membantu identifikasi prioritas pembinaan outlet.
        </Typography>
        <Stack spacing={1.5}>
          {itemStats.length ? itemStats.map((it) => {
            const barColor = it.avg >= 75 ? 'success' : it.avg >= 55 ? 'warning' : 'error';
            return (
              <Box key={it.label}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ pr: 1 }}>{it.label}</Typography>
                  <Typography variant="caption" fontWeight={800}>
                    {it.avg}% ({it.count} audit)
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={it.avg}
                  color={barColor}
                  sx={{ height: 8, borderRadius: 99 }}
                />
              </Box>
            );
          }) : (
            <Typography variant="caption" color="text.secondary">
              Belum ada pertanyaan berskor numerik pada data audit ini.
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Kartu 2: Distribusi Klasifikasi Prospek & Akurasi Stok */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.25 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          Distribusi Klasifikasi Prospek &amp; Akurasi Stok
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Proporsi hasil klasifikasi kunjungan audit beserta tingkat kesesuaian stok fisik toko.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="center">
          <Box sx={{ position: 'relative', width: 136, height: 136, flexShrink: 0 }}>
            <svg width="136" height="136" viewBox="0 0 136 136">
              <circle cx="68" cy="68" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />
              {catDist.map((s) => {
                const frac = s.value / audits.length;
                const dash = frac * circumference;
                const strokeDashoffset = -accOffset;
                accOffset += dash;
                return (
                  <circle
                    key={s.label}
                    cx="68"
                    cy="68"
                    r={radius}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="18"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 68 68)"
                  />
                );
              })}
            </svg>
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" fontWeight={800} lineHeight={1}>{audits.length}</Typography>
              <Typography variant="caption" color="text.secondary" fontSize={10.5}>Total Audit</Typography>
            </Box>
          </Box>

          <Stack spacing={1} sx={{ flex: 1, width: '100%' }}>
            {catDist.map((s) => (
              <Stack key={s.label} direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                  <Typography variant="body2" fontSize={13}>{s.label}</Typography>
                </Stack>
                <Typography variant="caption" fontWeight={700}>
                  {s.value} ({Math.round((s.value / audits.length) * 100)}%)
                </Typography>
              </Stack>
            ))}
            <Divider sx={{ my: 0.75 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Kesesuaian Stok Tanpa Selisih
              </Typography>
              <Chip
                size="small"
                color={stockAccuracyPct >= 75 ? 'success' : 'warning'}
                variant="outlined"
                label={`${stockAccuracyPct}% (${accurateStockCount}/${audits.length})`}
              />
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* Kartu 3: Grafik Batang Skor Kunjungan Terbaru per Outlet */}
      <Paper elevation={0} sx={{ gridColumn: { xs: '1', lg: '1 / -1' }, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.25 }}>
        <Typography variant="subtitle1" fontWeight={800}>
          Tren Skor Kondisi Outlet (8 Laporan Terakhir)
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Perbandingan skor kualitas kondisi toko antar kunjungan (Hijau &ge; 75, Kuning 50–74, Merah &lt; 50).
        </Typography>

        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <Box sx={{ minWidth: 520, pt: 1 }}>
            <svg width="100%" height="210" viewBox={`0 0 ${Math.max(520, recentBars.length * 88)} 210`}>
              {[0, 25, 50, 75, 100].map((tick) => {
                const y = 165 - (tick / 100) * 135;
                return (
                  <g key={tick}>
                    <line x1="36" y1={y} x2="98%" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <text x="28" y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{tick}</text>
                  </g>
                );
              })}
              {recentBars.map((a, idx) => {
                const slotW = (Math.max(520, recentBars.length * 88) - 56) / recentBars.length;
                const barW = Math.min(42, slotW * 0.56);
                const x = 48 + idx * slotW + (slotW - barW) / 2;
                const barH = Math.max(4, (a.score / 100) * 135);
                const y = 165 - barH;
                const fill = a.score >= 75 ? '#16a34a' : a.score >= 50 ? '#d97706' : '#dc2626';
                const shortName = outletName(a.outletId).slice(0, 13);
                return (
                  <g key={a.id}>
                    <rect x={x} y={y} width={barW} height={barH} rx="5" fill={fill} />
                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a">
                      {a.score}
                    </text>
                    <text x={x + barW / 2} y="183" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#334155">
                      {shortName}
                    </text>
                    <text x={x + barW / 2} y="197" textAnchor="middle" fontSize="9.5" fill="#64748b">
                      {a.date.slice(5)} • v{a.templateVersion || 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

/* ============ Komponen Dynamic Form Builder & Versioning (BR-AUD-001 & BR-AUD-007) ============ */
function DynamicFormBuilderPanel({ db, mutate, user, toast }) {
  const templates = useMemo(() => getAuditTemplates(db), [db]);
  const activeTpl = useMemo(() => getActiveAuditTemplate(db), [db]);

  const [selectedId, setSelectedId] = useState(activeTpl.id);
  const selectedTpl = templates.find((t) => t.id === selectedId) || activeTpl;
  const lockInfo = isTemplateLocked(db, selectedTpl);
  const isArchived = selectedTpl.status !== 'active';

  const [name, setName] = useState(selectedTpl.name);
  const [description, setDescription] = useState(selectedTpl.description || '');
  const [questions, setQuestions] = useState(selectedTpl.questions || []);

  useEffect(() => {
    setName(selectedTpl.name || '');
    setDescription(selectedTpl.description || '');
    setQuestions((selectedTpl.questions || []).map((q, i) => ({
      id: q.id || `q_${i + 1}`,
      label: q.label || '',
      type: q.type || 'scale_3',
      weight: Number(q.weight) || 1,
      required: q.required !== false,
    })));
  }, [selectedTpl.id, selectedTpl.version]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        label: '',
        type: 'scale_3',
        weight: 1,
        required: true,
      },
    ]);
  };

  const updateQuestion = (idx, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const moveQuestion = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) {
      toast('Minimal harus terdapat 1 pertanyaan pada kuesioner audit.', 'warning');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateBuilder = () => {
    if (!name.trim()) {
      toast('Nama template kuesioner wajib diisi.', 'error');
      return null;
    }
    const cleaned = questions.map((q, idx) => ({
      id: q.id || `q_${idx + 1}`,
      label: q.label.trim(),
      type: q.type || 'scale_3',
      weight: Math.min(5, Math.max(1, Number(q.weight) || 1)),
      required: Boolean(q.required),
    }));
    if (!cleaned.length) {
      toast('Tambahkan minimal 1 pertanyaan kuesioner.', 'error');
      return null;
    }
    const emptyIdx = cleaned.findIndex((q) => !q.label);
    if (emptyIdx !== -1) {
      toast(`Teks pertanyaan nomor ${emptyIdx + 1} belum diisi.`, 'error');
      return null;
    }
    return cleaned;
  };

  /* Simpan: jika terkunci atau paksa versi baru → terbitkan v(N+1) otomatis (BR-AUD-007) */
  const handleSaveTemplate = (forceNewVersion = false) => {
    const cleaned = validateBuilder();
    if (!cleaned) return;

    const mustVersion = forceNewVersion || lockInfo.locked || isArchived;
    let savedId = selectedTpl.id;
    let savedVersion = selectedTpl.version || 1;

    mutate((draft) => {
      if (!Array.isArray(draft.auditTemplates) || !draft.auditTemplates.length) {
        draft.auditTemplates = [structuredClone(DEFAULT_AUDIT_TEMPLATE)];
      }

      if (mustVersion) {
        const maxVer = draft.auditTemplates.reduce((m, t) => Math.max(m, Number(t.version) || 1), 1);
        const maxId = draft.auditTemplates.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
        savedVersion = maxVer + 1;
        savedId = maxId + 1;

        draft.auditTemplates.forEach((t) => {
          t.status = 'archived';
        });

        draft.auditTemplates.push({
          id: savedId,
          code: selectedTpl.code || 'TPL-AUD-001',
          name: name.trim(),
          description: description.trim(),
          version: savedVersion,
          parentVersion: selectedTpl.version || 1,
          status: 'active',
          questions: cleaned,
          createdBy: user.name,
          createdAt: nowStamp(),
        });
      } else {
        const target = draft.auditTemplates.find((t) => t.id === selectedTpl.id);
        if (target) {
          target.name = name.trim();
          target.description = description.trim();
          target.questions = cleaned;
          target.updatedBy = user.name;
          target.updatedAt = nowStamp();
        }
      }
    });

    setSelectedId(savedId);
    if (mustVersion) {
      toast(`Versi lama tetap terkunci aman — Kuesioner baru berhasil diterbitkan & diaktifkan sebagai v${savedVersion}.`, 'success');
    } else {
      toast(`Perubahan kuesioner v${savedVersion} berhasil disimpan.`, 'success');
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '290px 1fr' }, gap: 2, alignItems: 'start' }}>
      {/* Kolom Kiri: Daftar Riwayat Versi Form */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <HistoryRoundedIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={800}>Riwayat Versi Form</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          Versi yang sudah dipakai terkunci otomatis. Revisi akan diterbitkan sebagai versi baru (v1 &rarr; v2).
        </Typography>
        <Stack spacing={1}>
          {templates.map((t) => {
            const lk = isTemplateLocked(db, t);
            const active = t.id === selectedTpl.id;
            return (
              <Paper
                key={t.id}
                elevation={0}
                onClick={() => setSelectedId(t.id)}
                sx={{
                  p: 1.25,
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  bgcolor: active ? 'action.selected' : 'background.paper',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight={800}>
                    Versi v{t.version}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {lk.locked && (
                      <Chip size="small" icon={<LockRoundedIcon />} label="Terkunci" sx={{ height: 20, fontSize: 10.5 }} />
                    )}
                    <Chip
                      size="small"
                      color={t.status === 'active' ? 'success' : 'default'}
                      variant={t.status === 'active' ? 'filled' : 'outlined'}
                      label={t.status === 'active' ? 'Aktif' : 'Arsip'}
                      sx={{ height: 20, fontSize: 10.5 }}
                    />
                  </Stack>
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ mt: 0.35 }}>
                  {t.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: 11 }}>
                  {(t.questions || []).length} pertanyaan • {lk.auditCount} audit
                </Typography>
              </Paper>
            );
          })}
        </Stack>
      </Paper>

      {/* Kolom Kanan: Penyusun Pertanyaan Kuesioner Dinamis */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={800}>
                Penyusun Kuesioner (v{selectedTpl.version})
              </Typography>
              <Chip
                size="small"
                color={selectedTpl.status === 'active' ? 'success' : 'default'}
                label={selectedTpl.status === 'active' ? 'Template Aktif Lapangan' : 'Arsip Versi Lama'}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Disusun oleh Admin / Supervisor • Kode Form: {selectedTpl.code || 'TPL-AUD-001'}
            </Typography>
          </Box>
          <Button variant="outlined" size="small" startIcon={<AddRoundedIcon />} onClick={addQuestion}>
            Tambah Pertanyaan
          </Button>
        </Stack>

        {(lockInfo.locked || isArchived) && (
          <Alert severity="warning" icon={<LockRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
            {lockInfo.locked ? (
              <>
                <b>Template v{selectedTpl.version} sudah digunakan</b> ({lockInfo.auditCount} laporan audit &amp; {lockInfo.taskCount} jadwal aktif) sehingga struktur aslinya <b>dikunci</b> sesuai <b>BR-AUD-007</b>.
                Anda tetap dapat menyusun perubahan di bawah — saat disimpan, sistem otomatis menerbitkannya sebagai <b>Versi Baru (v{templates[0].version + 1})</b> tanpa merusak histori lama.
              </>
            ) : (
              <>
                Anda sedang meninjau arsip <b>v{selectedTpl.version}</b>. Menyimpan perubahan dari arsip ini akan menerbitkannya sebagai <b>Versi Baru (v{templates[0].version + 1})</b> yang aktif.
              </>
            )}
          </Alert>
        )}

        <Stack spacing={2} sx={{ mb: 2.5 }}>
          <TextField
            size="small"
            label="Judul Template Kuesioner *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 120 }}
            fullWidth
          />
          <TextField
            size="small"
            label="Deskripsi / Instruksi Singkat untuk Sales"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 255 }}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
          Daftar Pertanyaan Kuesioner ({questions.length} Item)
        </Typography>

        <Stack spacing={1.5}>
          {questions.map((q, idx) => (
            <Paper
              key={q.id || idx}
              elevation={0}
              sx={{ p: 1.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}
            >
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={`#${idx + 1}`} sx={{ fontWeight: 800 }} />
                  <TextField
                    size="small"
                    placeholder="Tulis pertanyaan evaluasi audit di outlet…"
                    value={q.label}
                    onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                    inputProps={{ maxLength: 200 }}
                    sx={{ flex: 1, bgcolor: 'background.paper' }}
                  />
                  <Tooltip title="Naikkan urutan">
                    <span>
                      <IconButton size="small" disabled={idx === 0} onClick={() => moveQuestion(idx, -1)}>
                        <ArrowUpwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Turunkan urutan">
                    <span>
                      <IconButton size="small" disabled={idx === questions.length - 1} onClick={() => moveQuestion(idx, 1)}>
                        <ArrowDownwardRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Hapus pertanyaan">
                    <IconButton size="small" color="error" onClick={() => removeQuestion(idx)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                  <TextField
                    select
                    size="small"
                    label="Tipe Jawaban"
                    value={q.type}
                    onChange={(e) => updateQuestion(idx, { type: e.target.value })}
                    sx={{ minWidth: 250, bgcolor: 'background.paper' }}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                    ))}
                  </TextField>

                  {q.type !== 'text' && (
                    <TextField
                      select
                      size="small"
                      label="Bobot Skor"
                      value={q.weight}
                      onChange={(e) => updateQuestion(idx, { weight: Number(e.target.value) })}
                      sx={{ width: { xs: '100%', sm: 135 }, bgcolor: 'background.paper' }}
                    >
                      {[1, 2, 3, 4, 5].map((w) => (
                        <MenuItem key={w} value={w}>{w}x Bobot</MenuItem>
                      ))}
                    </TextField>
                  )}

                  <FormControlLabel
                    control={(
                      <Checkbox
                        size="small"
                        checked={Boolean(q.required)}
                        onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                      />
                    )}
                    label={<Typography variant="caption" fontWeight={700}>Wajib Diisi</Typography>}
                  />
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={addQuestion}>
            Tambah Pertanyaan Baru
          </Button>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {!lockInfo.locked && !isArchived && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PublishedWithChangesRoundedIcon />}
                onClick={() => handleSaveTemplate(true)}
              >
                Terbitkan Versi Baru (v{templates[0].version + 1})
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={(lockInfo.locked || isArchived) ? <PublishedWithChangesRoundedIcon /> : <SaveRoundedIcon />}
              onClick={() => handleSaveTemplate(false)}
            >
              {(lockInfo.locked || isArchived)
                ? `Simpan sebagai Versi Baru (v${templates[0].version + 1})`
                : `Simpan Perubahan (v${selectedTpl.version})`}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

/* ============ Halaman Utama Audit & Survey Desktop ============ */
export default function AuditDesktop() {
  const { user } = useAuth();
  const { db, mutate } = useDb();
  const { toast } = useToast();

  /* Semua Hooks di paling atas sebelum guard RBAC */
  const [tab, setTab] = useState('list');
  const [dateFilter, setDateFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('all');
  const [q, setQ] = useState('');
  const [detailId, setDetailId] = useState(null);

  if (!['admin', 'supervisor'].includes(user.role)) {
    return (
      <Alert severity="error">
        Akses ditolak — modul <b>Audit &amp; Survey</b> hanya dapat diakses oleh <b>Admin</b> dan <b>Supervisor</b>.
      </Alert>
    );
  }

  /* BR-MD-SPV-001: Isolasi data tim Supervisor (Admin melihat lintas tim) */
  const spv = user.role === 'supervisor'
    ? (db.supervisors || []).find((s) => s.email === user.email)
    : null;
  const teamSalesIds = spv
    ? new Set((db.sales || []).filter((s) => s.supervisorId === spv.id).map((s) => s.id))
    : null;

  const audits = [...(db.audits || [])]
    .reverse()
    .filter((a) => !teamSalesIds || teamSalesIds.has(a.salesId));

  const teamProspects = (db.prospects || []).filter((p) => {
    if (!teamSalesIds) return true;
    if (p.salesId) return teamSalesIds.has(p.salesId);
    return spv ? p.areaId === spv.areaId : true;
  });

  const templates = getAuditTemplates(db);
  const activeTemplate = getActiveAuditTemplate(db);
  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const catOf = (id) => (db.prospectCategories || []).find((c) => c.id === id);
  const today = todayISO();

  const filtered = audits.filter((a) =>
    (!dateFilter || a.date === dateFilter) &&
    (versionFilter === 'all' || String(a.templateVersion || 1) === versionFilter) &&
    (!q.trim() ||
      a.no.toLowerCase().includes(q.trim().toLowerCase()) ||
      outletName(a.outletId).toLowerCase().includes(q.trim().toLowerCase()) ||
      salesName(a.salesId).toLowerCase().includes(q.trim().toLowerCase()))
  );

  const avgScore = filtered.length
    ? Math.round(filtered.reduce((s, a) => s + (a.score || 0), 0) / filtered.length)
    : 0;
  const totalDev = filtered.reduce(
    (s, a) => s + (a.stocks || []).reduce((x, y) => x + Math.abs(y.diff || 0), 0),
    0
  );

  const doExportCsv = () => {
    const n = exportAuditsCsv(db, filtered);
    if (n) toast(`${n} baris hasil audit diekspor ke CSV.`, 'success');
    else toast('Belum ada data audit sesuai filter untuk diekspor.', 'info');
  };

  const doExportExcel = () => {
    const n = exportAuditsExcel(db, filtered);
    if (n) toast(`${n} baris hasil audit diekspor ke Excel (.xls).`, 'success');
    else toast('Belum ada data audit sesuai filter untuk diekspor.', 'info');
  };

  return (
    <Box>
      <PageHeader
        title="Audit & Survey"
        subtitle="Evaluasi laporan kunjungan outlet, analitik rekapitulasi, & penyusunan kuesioner dinamis."
        action={(
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<DynamicFormRoundedIcon />} onClick={() => setTab('builder')}>
              Form Aktif: v{activeTemplate.version}
            </Button>
            <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={doExportCsv}>
              Export CSV
            </Button>
            <Button variant="contained" startIcon={<TableViewRoundedIcon />} onClick={doExportExcel}>
              Export Excel
            </Button>
          </Stack>
        )}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<FactCheckRoundedIcon />} value={audits.filter((a) => a.date === today).length} label="Audit hari ini" />
        <StatCard icon={<GradeRoundedIcon />} value={`${avgScore}/100`} label="Skor rata-rata" color="success" />
        <StatCard icon={<TrackChangesRoundedIcon />} value={teamProspects.length} label="Prospek terdata" color="secondary" />
        <StatCard icon={<Inventory2RoundedIcon />} value={`${totalDev} unit`} label="Total selisih stok" color="warning" />
      </Box>

      {/* Navigasi Sub-Modul Audit */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 46 }}
        >
          <Tab value="list" icon={<FactCheckRoundedIcon fontSize="small" />} iconPosition="start" label={`Laporan Audit (${filtered.length})`} sx={{ minHeight: 46, textTransform: 'none', fontWeight: 700 }} />
          <Tab value="analytics" icon={<BarChartRoundedIcon fontSize="small" />} iconPosition="start" label="Grafik Analitik" sx={{ minHeight: 46, textTransform: 'none', fontWeight: 700 }} />
          <Tab value="builder" icon={<DynamicFormRoundedIcon fontSize="small" />} iconPosition="start" label={`Form Builder & Versi (v${activeTemplate.version})`} sx={{ minHeight: 46, textTransform: 'none', fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {tab === 'builder' ? (
        <DynamicFormBuilderPanel db={db} mutate={mutate} user={user} toast={toast} />
      ) : (
        <>
          {/* Toolbar Filter Berlaku untuk Tabel & Grafik Analitik */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
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
                onChange={(e) => setDateFilter(e.target.value)}
                sx={{ width: 165 }}
              />

              <TextField
                size="small"
                select
                label="Versi Form"
                value={versionFilter}
                onChange={(e) => setVersionFilter(e.target.value)}
                sx={{ width: 150 }}
              >
                <MenuItem value="all">Semua Versi</MenuItem>
                {templates.map((t) => (
                  <MenuItem key={t.id} value={String(t.version)}>Versi v{t.version}</MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="Cari no. audit / outlet / sales…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }}
              />

              {(dateFilter || versionFilter !== 'all' || q) && (
                <Button size="small" onClick={() => { setDateFilter(''); setVersionFilter('all'); setQ(''); }}>
                  Reset
                </Button>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                Menampilkan {filtered.length} dari {audits.length} audit
              </Typography>
            </Stack>
          </Paper>

          {tab === 'analytics' ? (
            <AuditAnalyticsPanel audits={filtered} db={db} outletName={outletName} />
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>No Audit</TableCell>
                    <TableCell>Tanggal</TableCell>
                    <TableCell>Versi</TableCell>
                    <TableCell>Sales</TableCell>
                    <TableCell>Outlet</TableCell>
                    <TableCell>Skor</TableCell>
                    <TableCell align="center">Foto</TableCell>
                    <TableCell align="center">Selisih Stok</TableCell>
                    <TableCell>Kategori</TableCell>
                    <TableCell align="right">Aksi</TableCell>
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
                        <TableCell>
                          <Chip size="small" variant="outlined" color="primary" label={`v${a.templateVersion || 1}`} sx={{ height: 22, fontSize: 11.5, fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          <Box title={salesName(a.salesId)} sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {salesName(a.salesId)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box title={outletName(a.outletId)} sx={{ maxWidth: 175, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {outletName(a.outletId)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 110 }}>
                            <LinearProgress
                              variant="determinate"
                              value={a.score}
                              color={a.score >= 75 ? 'success' : a.score >= 50 ? 'warning' : 'error'}
                              sx={{ flex: 1, height: 7, borderRadius: 99 }}
                            />
                            <Typography variant="caption" fontWeight={700}>{a.score}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">{a.photos?.length || 0}</TableCell>
                        <TableCell align="center">
                          {dev > 0
                            ? <Chip size="small" color="error" label={`${dev} unit`} />
                            : <Chip size="small" color="success" variant="outlined" label="sesuai" />}
                        </TableCell>
                        <TableCell>
                          {cat
                            ? <Chip size="small" variant="outlined" label={cat.name} />
                            : <Typography variant="caption" color="text.secondary">belum</Typography>}
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Tinjau Detail">
                            <IconButton size="small" onClick={() => setDetailId(a.id)}>
                              <VisibilityRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <EmptyState message="Belum ada laporan audit sesuai filter." />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Alert severity="info" sx={{ mt: 2 }} icon={<LockRoundedIcon fontSize="small" />}>
        Form audit <b>terkunci setelah submit</b> — satu submit per outlet per kunjungan. Struktur kuesioner yang sudah
        digunakan terkunci otomatis (<b>BR-AUD-007</b>) dan setiap revisi diterbitkan sebagai versi baru (v1 &rarr; v2).
        Hasil evaluasi dapat dianalisis secara visual maupun diekspor ke <b>CSV &amp; Excel</b>.
      </Alert>

      <AuditDetailDialog
        open={!!detailId}
        auditId={detailId}
        onClose={() => setDetailId(null)}
        canClassify={user.role === 'supervisor'}
      />
    </Box>
  );
}
