/* =====================================================
   Konfigurasi 10 entitas Master Data — URUTAN BARU:
   1. Perusahaan      2. Gudang         3. Supplier
   4. Area Kerja      5. Sales          6. Supervisor
   7. Outlet          8. Kategori Prospek
   9. Tugas (jenis)  10. Produk
   Dipakai oleh EntityPage.jsx (halaman CRUD generik).

   KONVENSI BARU (untuk CRUD penuh):
   - refs      : relasi/transaksi yang MEMAKAI entitas ini —
                 dipakai dialog Detail (statistik) dan tombol Hapus
                 (memutuskan hard delete vs soft delete, FSD 3.3).
                 matchSelf: true = bandingkan x[field] dengan rec[field]
                 (referensi berbasis nilai, bukan id).
   - refsItems : referensi tersimpan dalam array item/stocks (Produk).
   - cascade   : data bawahan yang ikut nonaktif/aktif mengikuti induk.
                 HANYA tabel ber-status siklus hidup (active/inactive) —
                 tabel ber-status alur kerja (tasks, prospects) TIDAK
                 boleh di-cascade karena statusnya punya makna sendiri.
   - detailPage: path halaman detail khusus (tombol mata navigasi,
                 bukan dialog) — dipakai Gudang.
   - fmt:'rupiah' pada field uang agar tampil rupiah di dialog detail.
   - Lookup orang (PIC/Penanggung Jawab): field picId type 'select'
     optionsFrom supervisors → menyimpan ID, nama ditarik lewat
     render (pola sama seperti sales.supervisorId).
===================================================== */
import { removeGudangPermanent } from '../../utils/gudangUtils';

const ALNUM = /^[A-Za-z0-9-]+$/;
const PHONE = /^[0-9]{10,15}$/;

const areaName = (r, db) => (db.areas.find((a) => a.id === r.areaId) || {}).name || '-';
const spvName = (r, db) => (db.supervisors.find((s) => s.id === r.supervisorId) || {}).name || '-';
const spvPic = (r, db) => (db.supervisors.find((s) => s.id === r.picId) || {}).name || '-';

export const MASTER_CONFIG = {
  /* 1 — PERUSAHAAN (profil tunggal: Read/Update via halaman profil, tanpa hapus) */
  perusahaan: {
    title: 'Master Data — Perusahaan',
    sub: 'Identitas legal perusahaan untuk kop dokumen Quotation & Invoice (satu profil).',
    table: 'companies',
    single: true,
    columns: [
      { k: 'name', l: 'Nama Perusahaan' },
      { k: 'npwp', l: 'NPWP' },
      { k: 'phone', l: 'Kontak' },
      { k: 'email', l: 'Email' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'name', l: 'Nama Perusahaan', type: 'text', required: true, max: 100 },
      { k: 'npwp', l: 'NPWP', type: 'text', max: 30 },
      { k: 'address', l: 'Alamat', type: 'textarea', required: true, max: 200 },
      { k: 'phone', l: 'Nomor Kontak', type: 'text', max: 20 },
      { k: 'email', l: 'Email Resmi', type: 'text', required: true, email: true, max: 100 },
      { k: 'bankName', l: 'Nama Bank', type: 'text', max: 50, hint: 'Untuk instruksi pembayaran Invoice (BR-008).' },
      { k: 'bankAccount', l: 'No. Rekening', type: 'text', max: 25 },
      { k: 'bankHolder', l: 'Atas Nama Rekening', type: 'text', max: 100 },
      { k: 'logo', l: 'Logo (.JPG/.PNG maks 2 MB)', type: 'file' },
    ],
    search: ['name', 'npwp'],
  },

  /* 2 — GUDANG (detail khusus: halaman stok per produk) */
  gudang: {
    title: 'Master Data — Gudang',
    sub: 'Lokasi penyimpanan barang & penanggung jawab stok.',
    table: 'warehouses',
    addLabel: 'Gudang',
    uniques: ['code'],
    detailPage: '/dashboard/master/gudang',
    refs: [
      { table: 'gudangDetails', field: 'gudangId', label: 'penempatan produk' },
    ], /* gudang berisi produk → hapus = peringatan keras (FSD 3.3) */
    /* Pengecualian FSD 3.3 (hasil diskusi tim 5.1): gudang boleh dihapus
       permanen walau berisi produk. Konsekuensinya dijelaskan di dialog. */
    hardDelete: (rec, { mutate }) => removeGudangPermanent(mutate, rec.id),
    hardDeleteNote: 'Gudang dihapus permanen BESERTA seluruh penempatan stoknya — stok produk yang tersimpan di gudang ini ikut terhapus dari total stok produk (dihitung ulang otomatis) dan riwayatnya tidak tersisa. Gunakan hanya bila gudang benar-benar sudah tidak beroperasi atau salah input data.',
    columns: [
      { k: 'code', l: 'Kode' },
      { k: 'name', l: 'Nama Gudang' },
      { k: 'address', l: 'Alamat' },
      { k: 'picId', l: 'Penanggung Jawab', render: spvPic },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'code', l: 'Kode Gudang', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Gudang', type: 'text', required: true, max: 100 },
      { k: 'address', l: 'Alamat', type: 'text', max: 200 },
      { k: 'picId', l: 'Penanggung Jawab (Supervisor)', type: 'select', required: true, optionsFrom: { table: 'supervisors', onlyActive: true } },
    ],
    search: ['code', 'name'],
  },

  /* 3 — SUPPLIER */
  supplier: {
    title: 'Master Data — Supplier',
    sub: 'Vendor pemasok barang ke gudang.',
    table: 'suppliers',
    addLabel: 'Supplier',
    uniques: ['code'],
    refs: [], /* prototype: produk belum ber-FK ke supplier → aman hapus permanen */
    columns: [
      { k: 'code', l: 'Kode' },
      { k: 'name', l: 'Nama Supplier' },
      { k: 'picId', l: 'PIC', render: spvPic },
      { k: 'phone', l: 'Telepon' },
      { k: 'products', l: 'Produk Dipasok' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'code', l: 'Kode Supplier', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Supplier', type: 'text', required: true, max: 100 },
      { k: 'picId', l: 'Nama PIC (Supervisor)', type: 'select', required: true, optionsFrom: { table: 'supervisors', onlyActive: true } },
      { k: 'phone', l: 'No. Telepon', type: 'text', required: true, pattern: PHONE, patternMsg: '10–15 digit angka.' },
      { k: 'address', l: 'Alamat', type: 'textarea', max: 200 },
      { k: 'products', l: 'Produk Dipasok (SKU)', type: 'text', max: 200 },
    ],
    search: ['code', 'name'],
  },

  /* 4 — AREA KERJA (induk dari outlet/sales/supervisor → cascade) */
  'area-kerja': {
    title: 'Master Data — Area Kerja',
    sub: 'Zona geografis batas wilayah kerja sales (acuan geofencing & GPS Route Planning).',
    table: 'areas',
    addLabel: 'Area',
    uniques: ['code'],
    refs: [
      { table: 'outlets', field: 'areaId', label: 'outlet' },
      { table: 'sales', field: 'areaId', label: 'sales' },
      { table: 'supervisors', field: 'areaId', label: 'supervisor' },
      { table: 'prospects', field: 'areaId', label: 'prospek' },
    ],
    cascade: [
      { table: 'outlets', field: 'areaId' },
      { table: 'sales', field: 'areaId' },
      { table: 'supervisors', field: 'areaId' },
    ],
    columns: [
      { k: 'code', l: 'Kode Area' },
      { k: 'name', l: 'Nama Area' },
      { k: 'desc', l: 'Deskripsi' },
      { k: 'radiusKm', l: 'Radius', fmt: 'km' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'code', l: 'Kode Area', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Area', type: 'text', required: true, max: 100 },
      { k: 'desc', l: 'Deskripsi', type: 'textarea', max: 200 },
      { k: 'lat', l: 'Titik Tengah — Latitude', type: 'number', required: true, min: -90, max: 90, step: 0.0001 },
      { k: 'lng', l: 'Titik Tengah — Longitude', type: 'number', required: true, min: -180, max: 180, step: 0.0001 },
      { k: 'radiusKm', l: 'Radius (km)', type: 'number', required: true, min: 1, max: 100 },
    ],
    search: ['code', 'name'],
  },

  /* 5 — SALES */
  sales: {
    title: 'Master Data — Sales',
    sub: 'Tenaga penjualan lapangan & struktur penugasan (wajib terhubung Supervisor + Area Kerja).',
    table: 'sales',
    addLabel: 'Sales',
    uniques: ['nik', 'email'],
    refs: [
      { table: 'users', field: 'salesId', label: 'akun login' },
      { table: 'tasks', field: 'salesId', label: 'tugas terjadwal' },
      { table: 'orders', field: 'salesId', label: 'order' },
      { table: 'quotations', field: 'salesId', label: 'quotation' },
      { table: 'audits', field: 'salesId', label: 'audit' },
      { table: 'checkins', field: 'salesId', label: 'check-in GPS' },
      { table: 'violations', field: 'salesId', label: 'catatan pelanggaran' },
      { table: 'prospects', field: 'salesId', label: 'prospek' },
    ],
    cascade: [
      { table: 'users', field: 'salesId' }, /* akun login ikut dibekukan sementara */
    ],
    columns: [
      { k: 'nik', l: 'NIK' },
      { k: 'name', l: 'Nama Lengkap' },
      { k: 'email', l: 'Email' },
      { k: 'supervisorId', l: 'Supervisor', render: spvName },
      { k: 'areaId', l: 'Area Kerja', render: areaName },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'nik', l: 'NIK', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Lengkap', type: 'text', required: true, max: 100 },
      { k: 'email', l: 'Email (untuk login)', type: 'text', required: true, email: true, max: 100 },
      { k: 'phone', l: 'No. HP', type: 'text', required: true, pattern: PHONE, patternMsg: '10–15 digit angka.' },
      { k: 'supervisorId', l: 'Supervisor', type: 'select', required: true, optionsFrom: { table: 'supervisors', onlyActive: true } },
      { k: 'areaId', l: 'Area Kerja', type: 'select', required: true, optionsFrom: { table: 'areas', onlyActive: true } },
      { k: 'target', l: 'Target Penjualan (Rp)', type: 'number', min: 0, fmt: 'rupiah', hint: 'Target bulanan (opsional).' },
    ],
    search: ['nik', 'name', 'email'],
  },

  /* 6 — SUPERVISOR (induk dari sales → cascade) */
  supervisor: {
    title: 'Master Data — Supervisor',
    sub: 'Struktur atasan & hierarki pengawasan tim sales.',
    table: 'supervisors',
    addLabel: 'Supervisor',
    uniques: ['nik', 'email'],
    refs: [
      { table: 'sales', field: 'supervisorId', label: 'sales bawahan' },
      { table: 'users', field: 'email', label: 'akun login', matchSelf: true },
      { table: 'suppliers', field: 'picId', label: 'PIC supplier' },
      { table: 'warehouses', field: 'picId', label: 'penanggung jawab gudang' },
    ],
    cascade: [
      { table: 'sales', field: 'supervisorId' },
    ],
    columns: [
      { k: 'nik', l: 'NIK' },
      { k: 'name', l: 'Nama Supervisor' },
      { k: 'email', l: 'Email' },
      { k: 'phone', l: 'Telepon' },
      { k: 'areaId', l: 'Area Tanggung Jawab', render: areaName },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'nik', l: 'NIK', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Lengkap', type: 'text', required: true, max: 100 },
      { k: 'email', l: 'Email', type: 'text', required: true, email: true, max: 100 },
      { k: 'phone', l: 'No. Telepon', type: 'text', required: true, pattern: PHONE, patternMsg: '10–15 digit angka.' },
      { k: 'areaId', l: 'Area Tanggung Jawab', type: 'select', required: true, optionsFrom: { table: 'areas', onlyActive: true } },
    ],
    search: ['nik', 'name', 'email'],
  },

  /* 7 — OUTLET */
  outlet: {
    title: 'Master Data — Outlet',
    sub: 'Toko/pelanggan ritel lengkap dengan koordinat GPS (wajib valid, bukan 0,0).',
    table: 'outlets',
    addLabel: 'Outlet',
    uniques: ['code'],
    refs: [
      { table: 'tasks', field: 'outletId', label: 'tugas terjadwal' },
      { table: 'orders', field: 'outletId', label: 'order' },
      { table: 'quotations', field: 'outletId', label: 'quotation' },
      { table: 'audits', field: 'outletId', label: 'audit' },
      { table: 'checkins', field: 'outletId', label: 'check-in GPS' },
      { table: 'violations', field: 'outletId', label: 'catatan pelanggaran' },
      { table: 'prospects', field: 'outletId', label: 'prospek' },
    ],
    columns: [
      { k: 'code', l: 'Kode' },
      { k: 'name', l: 'Nama Outlet' },
      { k: 'owner', l: 'Pemilik' },
      { k: 'address', l: 'Alamat' },
      { k: '_coords', l: 'Koordinat GPS', fmt: 'coords' },
      { k: 'areaId', l: 'Area', render: areaName },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'code', l: 'Kode Outlet', type: 'text', required: true, max: 30, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Outlet', type: 'text', required: true, max: 100 },
      { k: 'owner', l: 'Nama Pemilik', type: 'text', max: 100 },
      { k: 'address', l: 'Alamat', type: 'text', required: true, max: 200 },
      { k: 'lat', l: 'Latitude (-90 s.d 90)', type: 'number', required: true, min: -90, max: 90, step: 0.000001, notZero: true, hint: 'Wajib koordinat valid — nilai 0 ditolak (HTTP 400).' },
      { k: 'lng', l: 'Longitude (-180 s.d 180)', type: 'number', required: true, min: -180, max: 180, step: 0.000001, notZero: true },
      { k: 'phone', l: 'Telepon', type: 'text', max: 15 },
      { k: 'areaId', l: 'Area Kerja', type: 'select', required: true, optionsFrom: { table: 'areas', onlyActive: true } },
      { k: 'category', l: 'Kategori Outlet', type: 'select', options: [
        { v: 'Retail', l: 'Retail' }, { v: 'Warung', l: 'Warung' },
        { v: 'Minimarket', l: 'Minimarket' }, { v: 'Grosir', l: 'Grosir' },
      ] },
    ],
    validate: (v) =>
      Number(v.lat) === 0 && Number(v.lng) === 0
        ? { _form: 'Koordinat GPS tidak valid (0,0 ditolak — HTTP 400).' }
        : null,
    search: ['code', 'name', 'owner', 'address'],
  },

  /* 8 — KATEGORI PROSPEK */
  'kategori-prospek': {
    title: 'Master — Kategori Prospek',
    sub: 'Klasifikasi tingkatan potensi calon pelanggan (Hot/Warm/Cold Lead).',
    table: 'prospectCategories',
    addLabel: 'Kategori',
    uniques: ['name'],
    refs: [
      { table: 'prospects', field: 'categoryId', label: 'prospek' },
      { table: 'audits', field: 'categoryId', label: 'hasil audit' },
    ],
    columns: [
      { k: 'name', l: 'Nama Kategori' },
      { k: 'desc', l: 'Deskripsi' },
      { k: 'priority', l: 'Prioritas' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'name', l: 'Nama Kategori', type: 'text', required: true, max: 50, hint: 'Mis. Hot Lead / Warm Lead / Cold Lead.' },
      { k: 'desc', l: 'Deskripsi / Syarat Kelayakan', type: 'textarea', max: 200 },
      { k: 'priority', l: 'Prioritas', type: 'select', required: true, options: [
        { v: 'Tinggi', l: 'Tinggi' }, { v: 'Sedang', l: 'Sedang' }, { v: 'Rendah', l: 'Rendah' },
      ] },
    ],
    search: ['name'],
  },

  /* 9 — TUGAS (JENIS) — referensi berbasis nilai (tasks.type) */
  tugas: {
    title: 'Master — Jenis Tugas',
    sub: 'Standarisasi aktivitas lapangan — menentukan formulir dinamis di Web Mobile.',
    table: 'taskTypes',
    addLabel: 'Jenis Tugas',
    uniques: ['name'],
    refs: [
      { table: 'tasks', field: 'type', label: 'tugas terjadwal', matchSelf: true },
    ],
    columns: [
      { k: 'name', l: 'Nama Tugas' },
      { k: 'type', l: 'Tipe Aktivitas', fmt: 'tasktype' },
      { k: 'desc', l: 'Deskripsi' },
      { k: 'estMinutes', l: 'Estimasi (menit)' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'name', l: 'Nama Tugas', type: 'text', required: true, max: 100 },
      { k: 'type', l: 'Tipe Aktivitas', type: 'select', required: true, options: [
        { v: 'order', l: 'Entry Order' }, { v: 'audit', l: 'Audit Stok' },
        { v: 'display', l: 'Display Visual' }, { v: 'billing', l: 'Penagihan' },
      ], hint: 'Menentukan bentuk formulir dinamis pada aplikasi Sales.' },
      { k: 'desc', l: 'Deskripsi', type: 'textarea', max: 200 },
      { k: 'estMinutes', l: 'Estimasi Durasi (menit)', type: 'number', required: true, min: 1, default: 15 },
    ],
    search: ['name', 'type'],
  },

  /* 10 — PRODUK — referensi tersimpan dalam array item (snapshot) */
  produk: {
    title: 'Master Data — Produk',
    sub: 'Katalog induk produk — sumber acuan harga terkunci untuk Entry Order & Quotation.',
    table: 'products',
    addLabel: 'Produk',
    uniques: ['sku'],
    refsItems: [
      { table: 'orders', field: 'items', label: 'order' },
      { table: 'quotations', field: 'items', label: 'quotation' },
      { table: 'audits', field: 'stocks', label: 'audit (stock-take)' },
    ],
    columns: [
      { k: 'sku', l: 'SKU' },
      { k: 'name', l: 'Nama Produk' },
      { k: 'category', l: 'Kategori' },
      { k: 'unit', l: 'Satuan' },
      { k: 'price', l: 'Harga Dasar', fmt: 'rupiah' },
      { k: 'stock', l: 'Stok' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'sku', l: 'Kode SKU', type: 'text', required: true, max: 30, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Produk', type: 'text', required: true, max: 100 },
      { k: 'category', l: 'Kategori', type: 'select', required: true, optionsFrom: { table: 'categories' } },
      { k: 'unit', l: 'Satuan', type: 'select', required: true, options: [
        { v: 'pcs', l: 'Pcs' }, { v: 'box', l: 'Box' },
      ] },
      { k: 'price', l: 'Harga Dasar (Rp)', type: 'number', required: true, min: 1, fmt: 'rupiah', hint: 'Integer — ditampilkan format Rupiah.' },
      { k: 'stock', l: 'Penempatan Stok per Gudang', type: 'gudangAlloc',
        hint: 'Stok total produk = penjumlahan penempatan semua gudang (pcs). Gudang baru otomatis tampil di sini dan mulai dari 0.' },
      { k: 'pcsPerUnit', l: 'Konversi ke Pcs', type: 'number', required: true, min: 1, default: 1, hint: 'Satuan dasar per satuan jual (mis. 1 box = 12 pcs) — kriteria #47.' },
      { k: 'desc', l: 'Deskripsi', type: 'textarea', max: 200 },
    ],
    search: ['sku', 'name', 'category'],
  },
};