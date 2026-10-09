import { addDays, nowStamp, todayISO } from './helpers';

/* ============================================================
   Pembuatan & pencarian INVOICE (dipakai OrderDetailDialog saat
   Supervisor menyetujui order — invoice terbit otomatis).

   FIX BUG: invoice kini MENYALIN SELURUH field syarat pembayaran
   dari order — dulu tidak disalin → Billing selalu menampilkan
   "Tunai (COD)" walau deal-nya transfer/termin/cicilan/konsinyasi.

   Gelombang 4 — aturan pembayaran (alur tim):
   - Tunai/Transfer  : jatuh tempo = tanggal + 7 hari (batas wajar).
   - Termin          : jatuh tempo = tanggal + terminHari; via
                       tunai/transfer sesuai perjanjian awal.
   - Konsinyasi      : jatuh tempo = tanggal + masa titip; barang
                       terjual dibayar, sisa dikembalikan (retur).
   - Cicilan         : DP (uang muka, via bank pihak ketiga)
                       tercatat sebagai pembayaran awal; sisa dibagi
                       N angsuran (jatuh tempo tiap 30 hari).
   ============================================================ */

/* Cari invoice milik sebuah order — anti invoice ganda */
export function findInvoiceByOrder(db, orderId) {
  return (db.invoices || []).find((i) => i.orderId === orderId) || null;
}

/* Nomor invoice unik: INV-YYYYMMDD-XXX */
export function genInvoiceNo(db) {
  const t = todayISO();
  const count = (db.invoices || []).filter((i) => i.date === t).length + 1;
  return `INV-${t.replace(/-/g, '')}-${String(count).padStart(3, '0')}`;
}

/* Bangun invoice dari order — dipanggil saat approval. */
export function buildInvoiceFromOrder(order) {
  const metode = order.metodePembayaran || 'tunai';
  const isTerminKonsinyasi = metode === 'termin' || metode === 'konsinyasi';

  const inv = {
    orderId: order.id,
    orderNo: order.no,
    date: order.date,
    salesId: order.salesId,
    outletId: order.outletId,
    items: (order.items || []).map((it) => ({
      productId: it.productId, sku: it.sku, name: it.name,
      unit: it.unit, qty: it.qty, price: it.price, disc: it.disc || 0, line: it.line,
    })),
    subtotal: order.subtotal,
    taxRate: order.taxRate,
    tax: order.tax,
    total: order.total,

    /* ===== Syarat pembayaran — disalin LENGKAP dari order ===== */
    metodePembayaran: metode,
    bankId: metode === 'transfer' ? (order.bankId ?? null) : null,
    terminHari: metode === 'termin' ? (order.terminHari || 14) : null,
    viaPembayaran: isTerminKonsinyasi ? (order.viaPembayaran || 'tunai') : null,
    viaBankId: isTerminKonsinyasi && order.viaPembayaran === 'transfer'
      ? (order.viaBankId ?? null) : null,
    konsinyasiHari: metode === 'konsinyasi' ? (Number(order.konsinyasiHari) || 30) : null,
    cicilanDP: metode === 'cicilan' ? Math.min(Number(order.cicilanDP) || 0, order.total) : 0,
    jumlahCicilan: metode === 'cicilan' ? (Number(order.jumlahCicilan) || 3) : null,

    payments: [],
    status: 'belum_lunas',
  };

  /* ===== Jatuh tempo per metode ===== */
  if (metode === 'termin') inv.jatuhTempo = addDays(inv.date, inv.terminHari);
  else if (metode === 'konsinyasi') inv.jatuhTempo = addDays(inv.date, inv.konsinyasiHari);
  else if (metode === 'tunai' || metode === 'transfer') inv.jatuhTempo = addDays(inv.date, 7);
  else inv.jatuhTempo = null; /* cicilan: dipantau per angsuran */

  /* ===== Cicilan: DP sebagai pembayaran awal + jadwal angsuran ===== */
  if (metode === 'cicilan') {
    const sisa = Math.max(0, inv.total - inv.cicilanDP);
    if (inv.cicilanDP > 0) {
      inv.payments.push({
        ts: nowStamp(), nominal: inv.cicilanDP, metode: 'Transfer Bank',
        keterangan: 'DP (Uang Muka) — pembayaran pihak ketiga bank cicilan',
      });
    }
    if (sisa <= 0) {
      inv.installments = [];
      inv.status = 'lunas';
      inv.paidAt = nowStamp();
    } else {
      const n = Math.max(1, inv.jumlahCicilan);
      const base = Math.floor(sisa / n);
      inv.installments = Array.from({ length: n }, (_, idx) => {
        const ke = idx + 1;
        return {
          ke,
          nominal: ke === n ? sisa - base * (n - 1) : base,
          jatuhTempo: addDays(inv.date, 30 * ke),
          status: 'belum_bayar',
        };
      });
    }
  }

  return inv;
}