import { todayISO, addDays } from './helpers';

/* ============================================================
   Modul Invoice (alur tim langkah 1 — BR-INV-001 … BR-INV-007).
   Invoice terbit OTOMATIS saat Supervisor menyetujui order;
   seluruh data ditarik dari order (yang mewarisi quotation).
   Cicilan: jadwal angsuran otomatis untuk pemantauan Finance.
============================================================ */

/* BR-INV-001: INV-YYYYMMDD-NNN — urutan global per hari, tanpa kode sales. */
export function genInvoiceNo(db) {
  const t = todayISO().replace(/-/g, '');
  const head = `INV-${t}-`;
  const max = (db.invoices || []).reduce((m, r) => {
    const c = String(r.no || '');
    if (c.startsWith(head)) {
      const n = parseInt(c.slice(head.length), 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }
    return m;
  }, 0);
  return `${head}${String(max + 1).padStart(3, '0')}`;
}

/* Batas waktu pembayaran — dihitung saat invoice terbit:
   termin → tanggal order + terminHari · tunai/transfer → hari itu ·
   cicilan → null (per angsuran, lihat installments) ·
   konsinyasi → null (mengikuti hasil stock-take). */
export function jatuhTempoOf(order) {
  switch (order.metodePembayaran) {
    case 'termin': return addDays(order.date, order.terminHari || 14);
    case 'cicilan': return null;
    case 'konsinyasi': return null;
    default: return order.date;
  }
}

/* Cicilan: jadwal angsuran otomatis — 3× bulanan dibagi rata.
   (Form terstruktur di quotation = roadmap; prototype pakai default.) */
export function generateInstallments(total, startDate) {
  const per = Math.floor(total / 3);
  return [1, 2, 3].map((ke) => ({
    ke,
    nominal: ke === 3 ? total - per * 2 : per,
    jatuhTempo: addDays(startDate, 30 * ke),
    status: 'belum_bayar',
  }));
}

/* BR-INV-002 + BR-INV-003: data ditarik otomatis, nominal terkunci. */
export function buildInvoiceFromOrder(order) {
  const inv = {
    orderId: order.id,
    orderNo: order.no,
    date: todayISO(),
    salesId: order.salesId,
    outletId: order.outletId,
    items: order.items || [],
    subtotal: order.subtotal,
    taxRate: order.taxRate,
    tax: order.tax,
    total: order.total,
    metodePembayaran: order.metodePembayaran || 'tunai',
    bankId: order.metodePembayaran === 'transfer' ? (order.bankId ?? null) : null,
    terminHari: order.metodePembayaran === 'termin' ? (order.terminHari ?? null) : null,
    jatuhTempo: jatuhTempoOf(order),
    status: 'belum_lunas',
    payments: [], /* riwayat pembayaran — dipantau Finance */
  };
  /* Cicilan: jadwal angsuran untuk pemantauan per angsuran */
  if (order.metodePembayaran === 'cicilan') {
    inv.installments = generateInstallments(order.total, order.date);
  }
  return inv;
}

export function findInvoiceByOrder(db, orderId) {
  return (db.invoices || []).find((i) => i.orderId === orderId) || null;
}
