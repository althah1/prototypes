import { nowStamp } from './helpers';

/* Angka acak deterministik 0–1 — hanya dipakai MIGRASI SEKALI & variasi data demo */
const frac = (a, b) => (((Math.imul(a + 7, 2654435761) ^ Math.imul(b + 13, 40503)) >>> 0) % 1000) / 1000;
const MIN_POOL = [5, 10, 20, 25, 50];

/* ============================================================
   MIGRASI SEKALI: buat tabel gudangDetails dari stok produk lama.
   Setelah tabel ada, tambah gudang/produk TIDAK lagi menyentuh
   alokasi yang sudah tersimpan — gudang baru pasti kosong.

   buildGudangDetails() = MURNI (hanya baca db, tanpa mutate) →
   dipanggil DbContext.loadInitial() saat app start, supaya migrasi
   terjadi SEBELUM interaksi user apa pun. Ini menutup celah timing
   lama: migrasi dulu baru jalan saat halaman Produk/GudangDetail
   dibuka, sehingga gudang yang ditambah sebelum itu ikut kebagian
   stok.
   ============================================================ */
export function buildGudangDetails(db) {
  const rows = [];
  const products = (db.products || []).filter((p) => p.status === 'active');
  const warehouses = (db.warehouses || []).filter((w) => w.status === 'active');
  if (!warehouses.length) return rows;
  products.forEach((p) => {
    const weights = warehouses.map((w) => 0.4 + frac(w.id, 101));
    const total = weights.reduce((s, v) => s + v, 0) || 1;
    let allocated = 0;
    warehouses.forEach((w, i) => {
      const qty = i === warehouses.length - 1
        ? Math.max(0, (p.stock || 0) - allocated)
        : Math.round((p.stock || 0) * (weights[i] / total));
      allocated += qty;
      if (qty > 0) {
        const erp = frac(p.id, 7) > 0.72;
        rows.push({
          gudangId: w.id, productId: p.id, stokTercatat: qty,
          stokMinimum: MIN_POOL[Math.floor(frac(p.id, 3) * MIN_POOL.length) % MIN_POOL.length],
          sumberStok: erp ? 'ERP Odoo' : 'Manual SFA',
          statusSync: erp ? 'Tersinkron' : 'Tidak Digunakan',
          createdAt: nowStamp(),
        });
      }
    });
  });
  return rows;
}

/* Jaring pengaman (lazy) — idempotent. Dipertahankan untuk halaman
   yang dibuka langsung tanpa lewat loadInitial (mis. data lama). */
export function ensureGudangDetails(db, mutate) {
  if (Array.isArray(db.gudangDetails)) return false;
  if (!(db.warehouses || []).some((w) => w.status === 'active')) return false; /* coba lagi setelah gudang tersedia */
  const rows = buildGudangDetails(db);
  mutate((d) => { d.gudangDetails = rows; });
  return true;
}

/* Peta alokasi { gudangId: qty } milik satu produk (untuk form edit) */
export function allocMapOf(db, productId) {
  const map = {};
  (db.gudangDetails || []).forEach((r) => {
    if (r.productId === productId) map[r.gudangId] = r.stokTercatat;
  });
  return map;
}

export const allocTotal = (map) =>
  Object.values(map || {}).reduce((s, v) => s + (Number(v) || 0), 0);

/* ============================================================
   Sinkronisasi alokasi dari form Produk → tabel gudangDetails.
   Baris dengan jumlah 0 dihapus (produk "belum ditempatkan" di
   gudang itu). Total disimpan ke products.stock oleh EntityPage.
   ============================================================ */
export function syncAllocation(mutate, productId, map) {
  mutate((d) => {
    if (!Array.isArray(d.gudangDetails)) d.gudangDetails = [];
    d.gudangDetails = d.gudangDetails.filter((r) => r.productId !== productId);
    Object.entries(map || {}).forEach(([gid, qty]) => {
      const n = Number(qty) || 0;
      if (n > 0) {
        d.gudangDetails.push({
          gudangId: Number(gid), productId, stokTercatat: n,
          stokMinimum: 10, /* ambang default — kelak bisa dibuat editable */
          sumberStok: 'Manual SFA', statusSync: 'Tidak Digunakan',
          createdAt: nowStamp(), updatedAt: nowStamp(),
        });
      }
    });
  });
}

/* ============================================================
   Hapus gudang PERMANEN — pengecualian FSD 3.3 (keputusan tim):
   gudang bisa benar-benar ditutup / salah input. Menghapus baris
   gudang + seluruh alokasinya, lalu stok produk TERDAMPAK dihitung
   ulang dari sisa alokasi (gudangDetails = sumber kebenaran;
   selaras desain DB: gudang_details.gudang_id ON DELETE CASCADE).
   ============================================================ */
export function removeGudangPermanent(mutate, gudangId) {
  mutate((d) => {
    const removed = (d.gudangDetails || []).filter((r) => r.gudangId === gudangId);
    const affected = [...new Set(removed.map((r) => r.productId))];
    d.gudangDetails = (d.gudangDetails || []).filter((r) => r.gudangId !== gudangId);
    d.warehouses = (d.warehouses || []).filter((w) => w.id !== gudangId);
    affected.forEach((pid) => {
      const p = (d.products || []).find((x) => x.id === pid);
      if (p) {
        p.stock = (d.gudangDetails || [])
          .filter((r) => r.productId === pid)
          .reduce((s, r) => s + (Number(r.stokTercatat) || 0), 0);
      }
    });
  });
}

/* Reserved per produk = item order AKTIF (pcs) — barang terikat pesanan */
export function reservedByProduct(db) {
  const out = {};
  (db.orders || [])
    .filter((o) => ['submitted', 'approved', 'processing'].includes(o.status))
    .forEach((o) => (o.items || []).forEach((it) => {
      out[it.productId] = (out[it.productId] || 0) + it.qty * (it.pcsPerUnit || 1);
    }));
  return out;
}

/* Distribusi reserved ke baris gudang — gudang stok terbanyak menanggung duluan */
export function reservedByRow(db) {
  const reserved = reservedByProduct(db);
  const out = {};
  Object.entries(reserved).forEach(([pid, qty]) => {
    let sisa = qty;
    (db.gudangDetails || [])
      .filter((r) => r.productId === Number(pid))
      .sort((a, b) => b.stokTercatat - a.stokTercatat)
      .forEach((r) => {
        if (sisa <= 0) return;
        const ambil = Math.min(r.stokTercatat, sisa);
        out[`${r.gudangId}-${r.productId}`] = ambil;
        sisa -= ambil;
      });
  });
  return out;
}