/* =====================================================
   Konfigurasi entitas Master Data — dipakai EntityPage.jsx
   (CRUD generik): Perusahaan, Gudang, Supplier, Area Kerja,
   Sales, Supervisor, Outlet, Kategori Prospek, Jenis Tugas.
   PRODUK = halaman kustom (Produk.jsx) — baris = produk × gudang.

   KONVENSI:
   - refs / refsItems / multiSelect / codeGen / cascade / fmt — lihat riwayat.
   - Validasi khusus Perusahaan (hasil diskusi tim): NPWP, telepon,
     rekening berpola; Nama Bank = dropdown statis (siap pindah ke
     Master Data Bank via optionsFrom kalau tim memutuskan).
===================================================== */

const ALNUM = /^[A-Za-z0-9-]+$/;
const PHONE = /^[0-9]{10,15}$/;

/* Validasi Perusahaan */
const NPWP_RE = /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/; /* 15 digit, 2 titik, 1 strip */
const TELP_RE = /^[0-9]{2,4}-?[0-9]{6,10}$/;              /* 0274-555123 / 081234567890 */
const REK_RE = /^[0-9]{8,16}$/;                             /* rekening bank: angka murni */

/* Nama bank umum — statis dulu; kalau jadi Master Data Bank,
   ganti field ini menjadi optionsFrom { table: 'banks' }. */
const BANKS = ['Bank BRI', 'Bank BCA', 'Bank Mandiri', 'Bank BNI', 'Bank Syariah Indonesia (BSI)',
  'Bank CIMB Niaga', 'Bank Danamon', 'Bank Permata', 'Bank OCBC NRI', 'Bank Panin',
  'Bank Maybank', 'Bank BTN', 'Bank BTPN'];

const areaName = (r, db) => (db.areas.find((a) => a.id === r.areaId) || {}).name || '-';
const spvName = (r, db) => (db.supervisors.find((s) => s.id === r.supervisorId) || {}).name || '-';
const spvPic = (r, db) => (db.supervisors.find((s) => s.id === r.picId) || {}).name || '-';
/* Tabel daftar supplier: hanya SKU (ringkas). Detail menampilkan SKU — Nama. */
const supProducts = (r, db) => {
  const ids = r.productIds || [];
  if (!ids.length) return '-';
  return ids.map((id) => {
    const p = (db.products || []).find((x) => x.id === id);
    return p ? p.sku : `#${id}`;
  }).join(', ');
};

export const MASTER_CONFIG = {
  /* 1 — PERUSAHAAN (profil tunggal) */
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
      { k: 'npwp', l: 'NPWP', type: 'text', max: 20, pattern: NPWP_RE,
        patternMsg: 'Format NPWP: 15 digit, 2 titik, 1 strip (contoh: 01.234.567.8-901.000).',
        hint: 'Sesuai kartu NPWP perusahaan.' },
      { k: 'address', l: 'Alamat', type: 'textarea', required: true, max: 200 },
      { k: 'phone', l: 'Nomor Kontak', type: 'text', max: 16, pattern: TELP_RE,
        patternMsg: 'Nomor tidak valid — 8–14 digit angka, boleh 1 tanda hubung (contoh: 0274-555123).' },
      { k: 'email', l: 'Email Resmi', type: 'text', required: true, email: true, max: 100 },
      { k: 'logo', l: 'Logo (.JPG/.PNG maks 2 MB)', type: 'file' },
    ],
    search: ['name', 'npwp'],
  },

    /* 2 — BANK (daftar rekening perusahaan — dipakai Quotation/Order & Billing) */
  bank: {
    title: 'Master Data — Bank',
    sub: 'Daftar rekening bank perusahaan — sumber pilihan pembayaran transfer.',
    table: 'banks',
    addLabel: 'Rekening Bank',
    uniques: ['kode'],
    refs: [
      { table: 'quotations', field: 'bankId', label: 'quotation' },
      { table: 'orders', field: 'bankId', label: 'order' },
    ], /* aktif dipakai di Gelombang 2 (pembayaran transfer) — proteksi hapus */
    columns: [
      { k: 'kode', l: 'Kode' },
      { k: 'nama', l: 'Nama Bank' },
      { k: 'noRekening', l: 'No. Rekening' },
      { k: 'atasNama', l: 'Atas Nama' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'kode', l: 'Kode Rekening', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.', hint: 'Pengenal singkat, mis. BCA-01.' },
      { k: 'nama', l: 'Nama Bank', type: 'text', required: true, max: 60, hint: 'Nama resmi bank, mis. Bank Central Asia (BCA).' },
      { k: 'noRekening', l: 'No. Rekening', type: 'text', required: true, max: 16, pattern: /^[0-9]{8,16}$/, patternMsg: '8–16 digit angka tanpa spasi.' },
      { k: 'atasNama', l: 'Atas Nama', type: 'text', required: true, max: 100, hint: 'Biasanya nama perusahaan.' },
    ],
    search: ['kode', 'nama'],
  },

  /* 2 — GUDANG (kode, nama, alamat + status saat pembuatan) */
  gudang: {
    title: 'Master Data — Gudang',
    sub: 'Lokasi fisik penyimpanan barang.',
    table: 'warehouses',
    addLabel: 'Gudang',
    uniques: ['code'],
    refs: [
      { table: 'gudangDetails', field: 'gudangId', label: 'penempatan produk' },
    ], /* gudang berisi produk → hapus = peringatan keras (FSD 3.3) */
    columns: [
      { k: 'code', l: 'Kode' },
      { k: 'name', l: 'Nama Gudang' },
      { k: 'address', l: 'Alamat' },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'code', l: 'Kode Gudang', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Gudang', type: 'text', required: true, max: 100 },
      { k: 'address', l: 'Alamat', type: 'text', max: 200 },
      { k: 'status', l: 'Status Gudang', type: 'select', required: true, default: 'active',
        options: [{ v: 'active', l: 'Aktif' }, { v: 'inactive', l: 'Nonaktif' }],
        hint: 'Nonaktif = tidak bisa dipilih untuk penempatan stok baru.' },
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
    refs: [],
    columns: [
      { k: 'code', l: 'Kode' },
      { k: 'name', l: 'Nama Supplier' },
      { k: 'picId', l: 'PIC', render: spvPic },
      { k: 'phone', l: 'Telepon' },
      { k: 'productIds', l: 'Produk Dipasok', render: supProducts },
      { k: 'status', l: 'Status', fmt: 'status' },
    ],
    fields: [
      { k: 'code', l: 'Kode Supplier', type: 'text', required: true, max: 20, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.' },
      { k: 'name', l: 'Nama Supplier', type: 'text', required: true, max: 100 },
      { k: 'picId', l: 'Nama PIC (Supervisor)', type: 'select', required: true, optionsFrom: { table: 'supervisors', onlyActive: true } },
      { k: 'phone', l: 'No. Telepon', type: 'text', required: true, pattern: PHONE, patternMsg: '10–15 digit angka.' },
      { k: 'address', l: 'Alamat', type: 'textarea', max: 200 },
      { k: 'productIds', l: 'Produk Dipasok', type: 'multiSelect', optionsFrom: { table: 'products', onlyActive: true },
        hint: 'Pilih dari katalog produk — boleh dikosongkan, bisa dilengkapi nanti lewat Ubah.' },
    ],
    search: ['code', 'name'],
  },

  /* 4 — AREA KERJA */
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
      { table: 'users', field: 'salesId' },
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

  /* 6 — SUPERVISOR */
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
    codeGen: { field: 'code', prefix: 'OUT' },
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
      { k: 'code', l: 'Kode Outlet', type: 'text', required: true, max: 30, pattern: ALNUM, patternMsg: 'Alfanumerik tanpa spasi.',
        hint: 'Otomatis terisi saran kode berikutnya — boleh dihapus dan diketik ulang.' },
      { k: 'name', l: 'Nama Outlet', type: 'text', required: true, max: 100 },
      { k: 'owner', l: 'Nama Pemilik', type: 'text', max: 100 },
      { k: 'address', l: 'Alamat', type: 'text', required: true, max: 200 },
      { k: 'lat', l: 'Latitude (-90 s.d 90)', type: 'number', required: true, min: -90, max: 90, step: 0.000001, notZero: true, hint: 'Wajib koordinat valid — nilai 0 tidak diterima.' },
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
        ? { _form: 'Koordinat GPS tidak valid — nilai 0,0 tidak diterima.' }
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

  /* 9 — TUGAS (JENIS) */
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

  /* 10 — PRODUK: halaman KUSTOM (Produk.jsx) — baris = 1 produk × 1 gudang. */
};