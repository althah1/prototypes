import { todayISO } from './helpers';

/* Pertanyaan bawaan untuk inisialisasi awal v1 & kompatibilitas data lama */
export const CHECKLIST_ITEMS = [
  'Kebersihan area pajangan produk',
  'Kondisi fisik toko (dinding/lantai/atap)',
  'Pencahayaan & sirkulasi udara',
  'Kerapian penataan produk',
  'Ketersediaan materi promosi (POSM)',
];

export const CHECK_OPTIONS = [
  { v: 3, l: 'Baik' },
  { v: 2, l: 'Cukup' },
  { v: 1, l: 'Kurang' },
];

export const QUESTION_TYPES = [
  { value: 'scale_3', label: 'Skala Kondisi (Baik / Cukup / Kurang)', maxScore: 3 },
  { value: 'yes_no',  label: 'Pilihan Ya / Tidak',                    maxScore: 3 },
  { value: 'scale_5', label: 'Rating Angka (1 s/d 5)',                maxScore: 5 },
  { value: 'text',    label: 'Isian Teks Singkat (Observasi)',        maxScore: 0 },
];

export const DEFAULT_AUDIT_TEMPLATE = {
  id: 1,
  code: 'TPL-AUD-001',
  name: 'Standar Audit Kondisi & Display Toko',
  description: 'Kuesioner standar evaluasi kebersihan, fisik bangunan, kerapian display, dan ketersediaan POSM di outlet.',
  version: 1,
  status: 'active',
  createdBy: 'Sistem (Default FSD)',
  createdAt: '2025-01-01 08:00:00',
  questions: CHECKLIST_ITEMS.map((label, idx) => ({
    id: `q_${idx + 1}`,
    label,
    type: 'scale_3',
    weight: 1,
    required: true,
  })),
};

export const checkLabel = (score) => ({ 3: 'Baik', 2: 'Cukup', 1: 'Kurang' }[score] || '-');

/* Ambil daftar seluruh versi template kuesioner (fallback aman bila db.auditTemplates belum ada) */
export function getAuditTemplates(db) {
  const list = Array.isArray(db?.auditTemplates) && db.auditTemplates.length
    ? db.auditTemplates
    : [DEFAULT_AUDIT_TEMPLATE];
  return [...list].sort((a, b) => (b.version || 1) - (a.version || 1));
}

/* Ambil template kuesioner aktif saat ini */
export function getActiveAuditTemplate(db) {
  const list = getAuditTemplates(db);
  return list.find((t) => t.status === 'active') || list[0] || DEFAULT_AUDIT_TEMPLATE;
}

/* BR-AUD-001 & BR-AUD-007: Cek apakah versi template sudah pernah dipakai di laporan audit atau jadwal tugas */
export function isTemplateLocked(db, tpl) {
  if (!tpl) return { locked: false, auditCount: 0, taskCount: 0 };
  const audits = db?.audits || [];
  const tasks = db?.tasks || [];

  const auditCount = audits.filter((a) => {
    if (a.templateId != null) return Number(a.templateId) === Number(tpl.id);
    return Number(tpl.version || 1) === 1;
  }).length;

  const taskCount = tasks.filter((t) => {
    if (t.type !== 'audit') return false;
    if (t.templateId != null) return Number(t.templateId) === Number(tpl.id);
    return tpl.status === 'active' && (t.status === 'pending' || t.status === 'in_progress');
  }).length;

  return {
    locked: auditCount > 0 || taskCount > 0,
    auditCount,
    taskCount,
  };
}

/* Bentuk label jawaban yang bersih untuk tiap tipe pertanyaan */
export function formatChecklistAnswer(item) {
  if (!item) return '-';
  if (item.answerLabel) return item.answerLabel;
  const type = item.type || 'scale_3';
  if (type === 'text') return String(item.value ?? '').trim() || '-';
  if (type === 'yes_no') return item.value === 'yes' || item.score === 3 ? 'Ya' : 'Tidak';
  if (type === 'scale_5') return `${item.value ?? item.score ?? 0}/5`;
  return checkLabel(item.score);
}

/* Susun snapshot jawaban checklist agar histori laporan tetap utuh walau versi form berubah */
export function buildChecklistSnapshot(questions = [], answers = {}) {
  return questions.map((q, idx) => {
    const key = q.id || String(idx);
    const raw = answers[key] ?? answers[idx];
    const type = q.type || 'scale_3';
    const weight = Math.max(1, Number(q.weight) || 1);

    if (type === 'text') {
      const val = String(raw ?? '').trim();
      return {
        questionId: key,
        item: q.label,
        type,
        weight,
        required: q.required !== false,
        value: val,
        score: 0,
        maxScore: 0,
        answerLabel: val || '-',
      };
    }

    if (type === 'yes_no') {
      const isYes = raw === 'yes' || raw === 3 || raw === true;
      const score = raw == null ? 0 : (isYes ? 3 : 1);
      return {
        questionId: key,
        item: q.label,
        type,
        weight,
        required: q.required !== false,
        value: raw == null ? null : (isYes ? 'yes' : 'no'),
        score,
        maxScore: 3,
        answerLabel: raw == null ? '-' : (isYes ? 'Ya' : 'Tidak'),
      };
    }

    if (type === 'scale_5') {
      const num = Math.min(5, Math.max(0, Number(raw) || 0));
      return {
        questionId: key,
        item: q.label,
        type,
        weight,
        required: q.required !== false,
        value: num || null,
        score: num,
        maxScore: 5,
        answerLabel: num ? `${num}/5` : '-',
      };
    }

    /* Default: scale_3 (Baik=3, Cukup=2, Kurang=1) */
    const num = Number(raw) || 0;
    return {
      questionId: key,
      item: q.label,
      type: 'scale_3',
      weight,
      required: q.required !== false,
      value: num || null,
      score: num,
      maxScore: 3,
      answerLabel: checkLabel(num),
    };
  });
}

/* Hitung skor 0–100 (mendukung data lama skala 1–3 maupun pertanyaan dinamis berbobot) */
export function auditScore(checklist) {
  if (!checklist?.length) return 0;
  const scoredItems = checklist.filter((c) => (c.type || 'scale_3') !== 'text');
  if (!scoredItems.length) {
    const filled = checklist.filter((c) => String(c.value ?? '').trim().length > 0).length;
    return Math.round((filled / checklist.length) * 100);
  }

  let earnedWeighted = 0;
  let maxWeighted = 0;
  scoredItems.forEach((c) => {
    const w = Math.max(1, Number(c.weight) || 1);
    const maxS = Number(c.maxScore) || 3;
    const curS = Math.max(0, Number(c.score) || 0);
    earnedWeighted += (curS / maxS) * w;
    maxWeighted += w;
  });

  if (!maxWeighted) return 0;
  return Math.round((earnedWeighted / maxWeighted) * 100);
}

/* Satu submit per outlet per kunjungan (per tanggal) — form terkunci */
export function findSubmittedAudit(db, outletId, date = todayISO()) {
  return (db?.audits || []).find((a) => a.outletId === outletId && a.date === date);
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const xmlEsc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* Ekspor hasil audit ke CSV (UTF-8 BOM + pemisah ";") */
export function exportAuditsCsv(db, rowsOverride = null) {
  const rows = Array.isArray(rowsOverride) ? rowsOverride : [...(db.audits || [])].reverse();
  if (!rows.length) return 0;

  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};
  const areaName = (id) => (db.areas || []).find((a) => a.id === id)?.name || '-';
  const catName = (id) => (db.prospectCategories || []).find((c) => c.id === id)?.name || '-';

  const header = [
    'No Audit', 'Tanggal', 'Versi Form', 'Nama Template', 'Sales', 'Outlet', 'Area',
    'Skor', 'Jumlah Foto', 'Total Selisih Stok', 'Kategori Prospek', 'Status Prospek',
    'Ringkasan Kuesioner', 'Catatan',
  ];

  const lines = rows.map((a) => {
    const o = outletOf(a.outletId);
    const dev = (a.stocks || []).reduce((s, x) => s + Math.abs(x.diff || 0), 0);
    const ver = `v${a.templateVersion || 1}`;
    const tplName = a.templateName || DEFAULT_AUDIT_TEMPLATE.name;
    const summary = (a.checklist || [])
      .map((c) => `${c.item}: ${formatChecklistAnswer(c)}`)
      .join(' | ');

    return [
      a.no,
      a.date,
      ver,
      tplName,
      salesName(a.salesId),
      o.name || '-',
      areaName(o.areaId),
      `${a.score}/100`,
      (a.photos || []).length,
      dev,
      catName(a.categoryId),
      a.prospectStatus || '-',
      summary,
      (a.note || '').replace(/[\r\n;]+/g, ' '),
    ].map(csvCell).join(';');
  });

  const csv = '\uFEFF' + [header.map(csvCell).join(';'), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-survey-${todayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
}

/* Ekspor hasil audit ke Microsoft Excel (.xls SpreadsheetML 2 Sheet: Rekapitulasi & Detail Checklist/Stok) */
export function exportAuditsExcel(db, rowsOverride = null) {
  const rows = Array.isArray(rowsOverride) ? rowsOverride : [...(db.audits || [])].reverse();
  if (!rows.length) return 0;

  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};
  const areaName = (id) => (db.areas || []).find((a) => a.id === id)?.name || '-';
  const catName = (id) => (db.prospectCategories || []).find((c) => c.id === id)?.name || '-';

  const cellStr = (v, style = 'sBody') => `<Cell ss:StyleID="${style}"><Data ss:Type="String">${xmlEsc(v)}</Data></Cell>`;
  const cellNum = (v, style = 'sNum') => `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${Number(v) || 0}</Data></Cell>`;

  const summaryHeader = [
    'No Audit', 'Tanggal', 'Versi Form', 'Nama Template', 'Sales', 'Outlet', 'Area',
    'Skor (/100)', 'Jumlah Foto', 'Total Selisih Stok (Unit)', 'Kategori Prospek', 'Status Prospek', 'Catatan',
  ].map((h) => cellStr(h, 'sHead')).join('');

  const summaryRows = rows.map((a) => {
    const o = outletOf(a.outletId);
    const dev = (a.stocks || []).reduce((s, x) => s + Math.abs(x.diff || 0), 0);
    return `<Row>${[
      cellStr(a.no),
      cellStr(a.date),
      cellStr(`v${a.templateVersion || 1}`),
      cellStr(a.templateName || DEFAULT_AUDIT_TEMPLATE.name),
      cellStr(salesName(a.salesId)),
      cellStr(o.name || '-'),
      cellStr(areaName(o.areaId)),
      cellNum(a.score),
      cellNum((a.photos || []).length),
      cellNum(dev),
      cellStr(catName(a.categoryId)),
      cellStr(a.prospectStatus || '-'),
      cellStr((a.note || '').replace(/[\r\n]+/g, ' ')),
    ].join('')}</Row>`;
  }).join('');

  const detailHeader = [
    'No Audit', 'Tanggal', 'Versi Form', 'Outlet', 'Jenis Item', 'Pertanyaan / Produk', 'Jawaban / Aktual', 'Keterangan / Selisih',
  ].map((h) => cellStr(h, 'sHead')).join('');

  const detailRows = [];
  rows.forEach((a) => {
    const oName = outletOf(a.outletId).name || '-';
    const ver = `v${a.templateVersion || 1}`;
    (a.checklist || []).forEach((c) => {
      detailRows.push(`<Row>${[
        cellStr(a.no),
        cellStr(a.date),
        cellStr(ver),
        cellStr(oName),
        cellStr('Checklist Kuesioner'),
        cellStr(c.item),
        cellStr(formatChecklistAnswer(c)),
        cellStr((c.type || 'scale_3') === 'text' ? 'Observasi Teks' : `Bobot ${c.weight || 1}`),
      ].join('')}</Row>`);
    });
    (a.stocks || []).forEach((s) => {
      detailRows.push(`<Row>${[
        cellStr(a.no),
        cellStr(a.date),
        cellStr(ver),
        cellStr(oName),
        cellStr('Stock-Take Produk'),
        cellStr(s.name),
        cellStr(`Aktual: ${s.actualStock} (Sistem: ${s.systemStock})`),
        cellStr(s.diff === 0 ? 'Sesuai' : `Selisih ${s.diff > 0 ? '+' : ''}${s.diff} unit`),
      ].join('')}</Row>`);
    });
  });

  const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="sHead">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sBody">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="sNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Top"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Rekapitulasi Audit">
  <Table>
   <Row>${summaryHeader}</Row>
   ${summaryRows}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Detail Checklist dan Stok">
  <Table>
   <Row>${detailHeader}</Row>
   ${detailRows.join('')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rekap-audit-survey-${todayISO()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
}
