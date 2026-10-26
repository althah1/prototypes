import { todayISO, nowStamp } from './helpers';

/* Hitung total pembayaran yang sudah masuk pada sebuah invoice */
export function calcInvoicePaid(inv) {
  if (!inv) return 0;
  if (Array.isArray(inv.payments) && inv.payments.length > 0) {
    return inv.payments.reduce((s, p) => s + (Number(p.nominal) || 0), 0);
  }
  if (inv.metodePembayaran === 'cicilan' && Array.isArray(inv.installments)) {
    const dp = Number(inv.cicilanDP) || 0;
    const inst = inv.installments
      .filter((a) => a.status === 'lunas')
      .reduce((s, a) => s + (Number(a.nominal) || 0), 0);
    return dp + inst;
  }
  return 0;
}

/* Terapkan transaksi penagihan ke draft database (dipakai saat Online maupun flushQueue Offline) */
export function applyBillingPaymentInDraft(d, payload) {
  const inv = (d.invoices || []).find((x) => x.id === payload.invoiceId);
  if (!inv) return null;

  const ts = payload.completedAt || nowStamp();
  const method = payload.metode || 'Tunai';

  if (inv.metodePembayaran === 'cicilan' && Array.isArray(inv.installments) && payload.installmentKe) {
    const targetInst = inv.installments.find((a) => a.ke === Number(payload.installmentKe));
    if (!targetInst || targetInst.status === 'lunas') return inv;

    inv.installments = inv.installments.map((a) =>
      a.ke === Number(payload.installmentKe)
        ? { ...a, status: 'lunas', paidAt: ts, paidMethod: method }
        : a
    );
    inv.payments = [
      ...(inv.payments || []),
      {
        ts,
        nominal: Number(targetInst.nominal) || 0,
        metode: method,
        keterangan: payload.note
          ? `Angsuran ${targetInst.ke} (${payload.note})`
          : `Angsuran ${targetInst.ke} — Penagihan Sales`,
        buktiFoto: payload.proofPhoto || '',
      },
    ];
    const allPaid = inv.installments.every((a) => a.status === 'lunas');
    inv.status = allPaid ? 'lunas' : 'belum_lunas';
    inv.paidAt = allPaid ? ts : null;

    if (allPaid) {
      const ord = (d.orders || []).find((o) => o.id === inv.orderId);
      if (ord) {
        ord.paid = true;
        ord.paidAt = ts;
        ord.paidMethod = method;
      }
    }
    return inv;
  }

  const amt = Number(payload.nominal) || 0;
  if (amt <= 0) return null;

  inv.payments = [
    ...(inv.payments || []),
    {
      ts,
      nominal: amt,
      metode: method,
      keterangan: payload.note ? `Penagihan (${payload.note})` : 'Penagihan Lapangan',
      buktiFoto: payload.proofPhoto || '',
    },
  ];
  const totalPaid = inv.payments.reduce((s, p) => s + (Number(p.nominal) || 0), 0);
  const lunas = totalPaid >= inv.total;
  inv.status = lunas ? 'lunas' : 'belum_lunas';
  inv.paidAt = lunas ? ts : null;

  if (lunas) {
    const ord = (d.orders || []).find((o) => o.id === inv.orderId);
    if (ord) {
      ord.paid = true;
      ord.paidAt = ts;
      ord.paidMethod = method;
    }
  }
  return inv;
}

/* BR-TASK-004: tugas Pending/In Progress yang melewati hari penugasan
   otomatis menjadi Failed & terkunci (simulasi cron 23:59 server). */
export function expireTasks(db, mutate) {
  const today = todayISO();
  const stale = (db.tasks || []).filter(
    (t) => t.date < today && (t.status === 'pending' || t.status === 'in_progress')
  );
  if (!stale.length) return 0;
  mutate((d) => {
    if (!Array.isArray(d.tasks)) return;
    d.tasks.forEach((t) => {
      if (t.date < today && (t.status === 'pending' || t.status === 'in_progress')) {
        t.status = 'failed';
      }
    });
  });
  return stale.length;
}

/* BR-TASK-003 & BR-TASK-006: auto-complete — status menjadi Done OTOMATIS saat seluruh
   syarat aktivitas tersimpan (Order / Audit / Foto Display / Transaksi Penagihan)
   dengan mempertahankan timestamp asli pengerjaan bila dikirim dari antrean offline. */
export function completeTaskAuto(_db, mutate, { outletId, type, salesId, date, completedAt, extra }) {
  const day = date || todayISO();
  let completedTask = null;
  mutate((d) => {
    const t = (d.tasks || []).find(
      (x) =>
        x.date === day &&
        x.outletId === outletId &&
        x.type === type &&
        (salesId ? x.salesId === salesId : true) &&
        x.status === 'in_progress'
    );
    if (t) {
      t.status = 'done';
      t.completedAt = completedAt || nowStamp();
      if (extra && typeof extra === 'object') {
        Object.assign(t, extra);
      }
      completedTask = { ...t };
    }
  });
  return completedTask;
}
