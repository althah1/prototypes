import { todayISO, QUOTE_DISCOUNT_LIMIT } from './helpers';

/* #54: quotation Draft/Pending/Sent yang melewati masa berlaku
   otomatis menjadi Expired (dicek tiap halaman quotation dibuka). */
export function expireQuotes(db, mutate) {
  const today = todayISO();
  const ACTIVE = ['draft', 'pending_approval', 'sent'];
  const stale = (db.quotations || []).filter(
    (q) => ACTIVE.includes(q.status) && q.validUntil < today
  );
  if (!stale.length) return 0;
  mutate((d) => {
    d.quotations.forEach((q) => {
      if (ACTIVE.includes(q.status) && q.validUntil < today) q.status = 'expired';
    });
  });
  return stale.length;
}

/* #53: diskon melebihi batas wewenang → status Pending Approval */
export function quoteStatusForDiscount(items) {
  const maxDisc = items.reduce((m, i) => Math.max(m, i.disc || 0), 0);
  return maxDisc > QUOTE_DISCOUNT_LIMIT ? 'pending_approval' : 'draft';
}

export const maxDiscountOf = (items) => items.reduce((m, i) => Math.max(m, i.disc || 0), 0);