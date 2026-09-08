import { todayISO } from './helpers';

/* #62: checklist kondisi & kebersihan toko (skala 1–3) */
export const CHECKLIST_ITEMS = [
  'Kebersihan area pajangan produk',
  'Kondisi fisik toko (dinding/lantai/atap)',
  'Pencahayaan & sirkulasi udara',
  'Kerapian penataan produk',
  'Ketersediaan materi promosi (POSM)',
];

export const CHECK_OPTIONS = [
  { v: 3, l: 'Baik' }, { v: 2, l: 'Cukup' }, { v: 1, l: 'Kurang' },
];

export const checkLabel = (score) => ({ 3: 'Baik', 2: 'Cukup', 1: 'Kurang' }[score] || '-');

export function auditScore(checklist) {
  if (!checklist?.length) return 0;
  return Math.round((checklist.reduce((s, c) => s + (c.score || 0), 0) / (checklist.length * 3)) * 100);
}

/* #66: satu submit per outlet per kunjungan (per tanggal) — form terkunci */
export function findSubmittedAudit(db, outletId, date = todayISO()) {
  return (db.audits || []).find((a) => a.outletId === outletId && a.date === date);
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/* #71: export hasil audit ke CSV (pemisah ";" + BOM UTF-8 agar rapi di Excel Indonesia) */
export function exportAuditsCsv(db) {
  const rows = [...(db.audits || [])].reverse();
  if (!rows.length) return 0;

  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};
  const areaName = (id) => (db.areas || []).find((a) => a.id === id)?.name || '-';
  const catName = (id) => (db.prospectCategories || []).find((c) => c.id === id)?.name || '-';

  const header = ['No Audit', 'Tanggal', 'Sales', 'Outlet', 'Area', 'Skor', 'Jumlah Foto',
    'Total Selisih Stok', 'Kategori Prospek', 'Status Prospek', 'Catatan'];
  const lines = rows.map((a) => {
    const o = outletOf(a.outletId);
    const dev = (a.stocks || []).reduce((s, x) => s + Math.abs(x.diff || 0), 0);
    return [
      a.no, a.date, salesName(a.salesId), o.name || '-', areaName(o.areaId),
      `${a.score}/100`, (a.photos || []).length, dev,
      catName(a.categoryId), a.prospectStatus || '-', (a.note || '').replace(/[\r\n;]+/g, ' '),
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