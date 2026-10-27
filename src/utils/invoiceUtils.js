import { addDays, nowStamp, todayISO } from './helpers';

/* ============================================================
   Pembuatan, pencarian, dan utilitas rekening/jatuh tempo INVOICE
   (BR-INV-004, BR-INV-006, Tabel 32 & Tabel 33).
   ============================================================ */

/* Filter khusus Rekening Aktif milik Perusahaan (bukan Rekening Supplier) */
export function isCompanyBank(bank) {
  if (!bank) return false;
  if (bank.status && bank.status !== 'active') return false;
  const rawKat = String(
    bank.kategori ?? bank.kategoriRekening ?? bank.jenisRekening ?? bank.tipe ?? ''
  ).trim().toLowerCase();
  if (!rawKat) return true; /* Data bawaan (seed) tanpa field kategori adalah rekening perusahaan */
  if (rawKat.includes('supplier') || rawKat.includes('pihak ketiga') || rawKat === 'pihak_ketiga') {
    return false;
  }
  return rawKat === 'perusahaan' || rawKat === 'rekening perusahaan' || rawKat === 'company';
}

export function getActiveCompanyBanks(db) {
  return (db?.banks || []).filter(isCompanyBank);
}

/* Resolusi daftar ID rekening perusahaan aktif untuk sebuah invoice */
export function resolveInvoiceBankIds(invoice, db) {
  const companyBanks = getActiveCompanyBanks(db);
  const validSet = new Set(companyBanks.map((b) => String(b.id)));

  const rawArr = Array.isArray(invoice?.rekening_bank_ids)
    ? invoice.rekening_bank_ids
    : Array.isArray(invoice?.rekeningBankIds)
      ? invoice.rekeningBankIds
      : null;

  if (rawArr && rawArr.length > 0) {
    const matched = companyBanks
      .filter((b) => rawArr.some((id) => String(id) === String(b.id)))
      .map((b) => b.id);
    if (matched.length > 0) return matched;
  }

  const singleId = invoice?.bankId ?? invoice?.viaBankId ?? null;
  if (singleId != null && validSet.has(String(singleId))) {
    const found = companyBanks.find((b) => String(b.id) === String(singleId));
    if (found) return [found.id];
  }

  return companyBanks.map((b) => b.id);
}

/* Validasi due_date >= tanggal terbit invoice (Tabel 32 & Tabel 33) */
export function isValidInvoiceDueDate(invoiceDate, dueDate) {
  if (!dueDate) return false;
  if (!invoiceDate) return true;
  return String(dueDate) >= String(invoiceDate);
}

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

/* Bangun invoice dari order — dipanggil saat approval Supervisor */
export function buildInvoiceFromOrder(order, db = null) {
  const metode = order.metodePembayaran || 'tunai';
  const isTerminKonsinyasi = metode === 'termin' || metode === 'konsinyasi';

  /* Inisialisasi rekening_bank_ids dari order atau seluruh rekening perusahaan aktif */
  const companyBanks = db ? getActiveCompanyBanks(db) : [];
  const preferredBankId = metode === 'transfer'
    ? (order.bankId ?? null)
    : (isTerminKonsinyasi && order.viaPembayaran === 'transfer' ? (order.viaBankId ?? null) : null);

  let initialBankIds = null;
  if (preferredBankId != null) {
    initialBankIds = [preferredBankId];
  } else if (companyBanks.length > 0) {
    initialBankIds = companyBanks.map((b) => b.id);
  }

  const inv = {
    orderId: order.id,
    orderNo: order.no,
    date: order.date,
    salesId: order.salesId,
    outletId: order.outletId,
    items: (order.items || []).map((it) => ({
      productId: it.productId,
      sku: it.sku,
      name: it.name,
      unit: it.unit,
      qty: it.qty,
      price: it.price,
      disc: it.disc || 0,
      line: it.line,
    })),
    subtotal: order.subtotal,
    taxRate: order.taxRate,
    tax: order.tax,
    total: order.total,

    /* ===== Syarat pembayaran — disalin lengkap dari order ===== */
    metodePembayaran: metode,
    bankId: metode === 'transfer' ? (order.bankId ?? null) : null,
    rekening_bank_ids: initialBankIds,
    rekeningBankIds: initialBankIds,
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

  /* ===== Jatuh tempo awal per metode (selalu >= tanggal terbit) ===== */
  if (metode === 'termin') inv.jatuhTempo = addDays(inv.date, inv.terminHari);
  else if (metode === 'konsinyasi') inv.jatuhTempo = addDays(inv.date, inv.konsinyasiHari);
  else if (metode === 'tunai' || metode === 'transfer') inv.jatuhTempo = addDays(inv.date, 7);
  else inv.jatuhTempo = addDays(inv.date, 30 * Math.max(1, inv.jumlahCicilan || 1));

  inv.due_date = inv.jatuhTempo;

  /* ===== Cicilan: DP sebagai pembayaran awal + jadwal angsuran ===== */
  if (metode === 'cicilan') {
    const sisa = Math.max(0, inv.total - inv.cicilanDP);
    if (inv.cicilanDP > 0) {
      inv.payments.push({
        ts: nowStamp(),
        nominal: inv.cicilanDP,
        metode: 'Transfer Bank',
        keterangan: 'DP (Uang Muka) — pembayaran awal cicilan',
        petugasNama: order.approvedBy || 'Sistem',
        catatan_pembayaran: '',
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
      inv.jatuhTempo = inv.installments[inv.installments.length - 1].jatuhTempo;
      inv.due_date = inv.jatuhTempo;
    }
  }

  return inv;
}
