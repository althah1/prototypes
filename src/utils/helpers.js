/* ===== Konstanta yang bisa kamu ubah ===== */
export const GEOFENCE_RADIUS_M = 100;   // FSD GPS: 100 m. Ubah ke 50 untuk ikut BR-TASK-002.
export const TAX_RATE = 0.11;           // PPN 11%
export const QUOTE_DISCOUNT_LIMIT = 10; // % — di atas ini quotation → Pending Approval Supervisor

/* Alur status order WAJIB linier (kriteria #43) */
export const ORDER_STATUS_FLOW = ['submitted', 'approved', 'processing', 'shipped', 'completed'];

export const TASK_TYPE_LABEL = {
  order: 'Entry Order',
  audit: 'Audit Stok',
  display: 'Foto Display',
  billing: 'Penagihan',
};

const pad = (n) => String(n).padStart(2, '0');

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Format standar sistem: YYYY-MM-DD HH:MM:SS (WIB) */
export function nowStamp(d = new Date()) {
  return `${todayISO(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function dateID(iso) {
  if (!iso) return '-';
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/* Uang: bilangan bulat di data, tampil Rupiah dengan pemisah ribuan */
export function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

/* Haversine — komputasi geofencing mandiri, tanpa API pihak ketiga */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const t = (x) => (x * Math.PI) / 180;
  const dLat = t(lat2 - lat1);
  const dLon = t(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export function formatDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}