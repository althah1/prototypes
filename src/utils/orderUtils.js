import { todayISO, TAX_RATE } from './helpers';

export const ORDER_PAYMENT_METHODS = [
  { value: 'tunai', label: 'Tunai (COD)' },
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'termin', label: 'Termin (Tempo)' },
  { value: 'cicilan', label: 'Cicilan' },
  { value: 'konsinyasi', label: 'Konsinyasi (bayar sesuai barang terjual)' },
];

export const ORDER_TERMIN_DAYS = [7, 14, 30];

export const ORDER_STATUS_FLOW = {
  submitted: ['approved', 'rejected', 'cancelled'],
  approved: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function canTransitionOrderStatus(currentStatus, targetStatus) {
  const allowed = ORDER_STATUS_FLOW[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function formatOrderPaymentLabel(order, banks = []) {
  if (!order) return '-';
  switch (order.metodePembayaran) {
    case 'transfer': {
      const b = banks.find((x) => x.id === order.bankId);
      return b ? `Transfer — ${b.nama} (${b.noRekening})` : 'Transfer Bank';
    }
    case 'termin':
      return `Termin ${order.terminHari || 14} hari`;
    case 'cicilan':
      return 'Cicilan';
    case 'konsinyasi':
      return 'Konsinyasi';
    default:
      return 'Tunai (COD)';
  }
}

export function generateOrderNumber(orders = [], syncQueue = [], dateISO, salesId) {
  const t = dateISO || todayISO();
  const kodeSales = salesId ? `SAL-${String(salesId).padStart(3, '0')}` : 'SFA';
  const existingToday = orders.filter((o) => o.date === t && o.salesId === salesId).length;
  const queuedToday = syncQueue.filter(
    (q) => q.kind === 'order' && q.payload?.salesId === salesId && q.payload?.date === t
  ).length;
  const seq = existingToday + queuedToday + 1;
  return `ORD-${t.replace(/-/g, '')}-${kodeSales}-${String(seq).padStart(3, '0')}`;
}
