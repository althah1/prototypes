import { todayISO, addDays, nowStamp, TAX_RATE } from '../utils/helpers';

export function seed() {
  const t = todayISO();
  const y = addDays(t, -1);
  const ymd = (d) => d.replace(/-/g, '');
  const yr = new Date().getFullYear(); /* kode outlet OUT-YYYY-NNN */

  return {
    users: [
      { id: 1, name: 'Raka Admin',     email: 'admin@sfa.co.id',      password: 'Admin123',   role: 'admin',      phone: '081200000001', status: 'active' },
      { id: 2, name: 'Budi Santoso',   email: 'supervisor@sfa.co.id', password: 'Super123',   role: 'supervisor', phone: '081200000002', status: 'active' },
      { id: 3, name: 'Andi Wijaya',    email: 'sales@sfa.co.id',      password: 'Sales123',   role: 'sales',      phone: '081200000003', status: 'active', salesId: 1 },
      { id: 4, name: 'Sari Wulandari', email: 'finance@sfa.co.id',    password: 'Finance123', role: 'finance',    phone: '081200000004', status: 'active' },
    ],
    categories: ['Minuman', 'Snack', 'Sembako', 'Perawatan'],
    /* hargaJual dipakai transaksi (order/quotation); hargaBeli = harga perolehan
       dari supplier. stock = total (jumlah penempatan semua gudang, termigrasi). */
    products: [
      { id: 1,  sku: 'PRD-001', name: 'Teh Kotak 250ml',          category: 'Minuman',   unit: 'pcs', hargaJual: 3500,  hargaBeli: 2600,  stock: 1200, pcsPerUnit: 1,  status: 'active' },
      { id: 2,  sku: 'PRD-002', name: 'Kopi Susu Sachet 20gr',    category: 'Minuman',   unit: 'pcs', hargaJual: 1500,  hargaBeli: 1100,  stock: 2000, pcsPerUnit: 1,  status: 'active' },
      { id: 3,  sku: 'PRD-003', name: 'Air Mineral 600ml',        category: 'Minuman',   unit: 'pcs', hargaJual: 2800,  hargaBeli: 2000,  stock: 1500, pcsPerUnit: 1,  status: 'active' },
      { id: 4,  sku: 'PRD-004', name: 'Keripik Singkong 100gr',   category: 'Snack',     unit: 'pcs', hargaJual: 8500,  hargaBeli: 6200,  stock: 450,  pcsPerUnit: 1,  status: 'active' },
      { id: 5,  sku: 'PRD-005', name: 'Biskuit Coklat 120gr',     category: 'Snack',     unit: 'pcs', hargaJual: 9500,  hargaBeli: 7000,  stock: 380,  pcsPerUnit: 1,  status: 'active' },
      { id: 6,  sku: 'PRD-006', name: 'Wafer Stroberi (Box)',     category: 'Snack',     unit: 'box', hargaJual: 54000, hargaBeli: 40000, stock: 120,  pcsPerUnit: 12, status: 'active' },
      { id: 7,  sku: 'PRD-007', name: 'Beras Premium 5kg',        category: 'Sembako',   unit: 'pcs', hargaJual: 68000, hargaBeli: 52000, stock: 90,   pcsPerUnit: 1,  status: 'active' },
      { id: 8,  sku: 'PRD-008', name: 'Minyak Goreng 1L',         category: 'Sembako',   unit: 'pcs', hargaJual: 17500, hargaBeli: 13500, stock: 260,  pcsPerUnit: 1,  status: 'active' },
      { id: 9,  sku: 'PRD-009', name: 'Gula Pasir 1kg',           category: 'Sembako',   unit: 'pcs', hargaJual: 15500, hargaBeli: 12000, stock: 300,  pcsPerUnit: 1,  status: 'active' },
      { id: 10, sku: 'PRD-010', name: 'Sabun Mandi Cair 450ml',   category: 'Perawatan', unit: 'pcs', hargaJual: 18500, hargaBeli: 14000, stock: 210,  pcsPerUnit: 1,  status: 'active' },
      { id: 11, sku: 'PRD-011', name: 'Sampo Anti Ketombe 170ml', category: 'Perawatan', unit: 'pcs', hargaJual: 26500, hargaBeli: 20000, stock: 160,  pcsPerUnit: 1,  status: 'active' },
      { id: 12, sku: 'PRD-012', name: 'Pasta Gigi 190gr',         category: 'Perawatan', unit: 'pcs', hargaJual: 14800, hargaBeli: 11000, stock: 240,  pcsPerUnit: 1,  status: 'active' },
    ],
    companies: [
      { id: 1, name: 'PT Distribusi Nusantara', npwp: '01.234.567.8-901.000',
        address: 'Jl. Malioboro No. 52, Yogyakarta 55271', phone: '0274-555123',
        email: 'info@distribusinusantara.co.id', logo: '', status: 'active' },
    ],
    /* Rekening bank perusahaan — dipakai pembayaran transfer (Gelombang 2) */
    banks: [
      { id: 1, kode: 'BCA-01', nama: 'Bank Central Asia (BCA)',    noRekening: '0123456789',    atasNama: 'PT Distribusi Nusantara', status: 'active' },
      { id: 2, kode: 'BRI-01', nama: 'Bank Rakyat Indonesia (BRI)', noRekening: '0123456789012', atasNama: 'PT Distribusi Nusantara', status: 'active' },
      { id: 3, kode: 'MDR-01', nama: 'Bank Mandiri',                noRekening: '0987654321',    atasNama: 'PT Distribusi Nusantara', status: 'active' },
    ],
    warehouses: [
      { id: 1, code: 'GDG-YK1', name: 'Gudang Yogyakarta Pusat', address: 'Jl. Kaliurang KM 5, Sleman', status: 'active' },
      { id: 2, code: 'GDG-SLM', name: 'Gudang Sleman Cabang',    address: 'Jl. Magelang KM 8, Sleman', status: 'active' },
    ],
    suppliers: [
      { id: 1, code: 'SUP-001', name: 'CV Sumber Pangan',   picId: 1, phone: '081234500001', address: 'Jl. Solo KM 10, Yogyakarta',  productIds: [1, 2, 4],  status: 'active' },
      { id: 2, code: 'SUP-002', name: 'PT Sembako Jaya',    picId: 2, phone: '081234500002', address: 'Jl. Ring Road Utara, Sleman', productIds: [7, 8, 9],  status: 'active' },
      { id: 3, code: 'SUP-003', name: 'PT Perawatan Sehat', picId: 2, phone: '081234500003', address: 'Kawasan Industri Bantul',     productIds: [10, 11, 12], status: 'inactive' },
    ],
    supervisors: [
      { id: 1, nik: '3201012307850001', name: 'Budi Santoso', email: 'supervisor@sfa.co.id', phone: '081200000002', areaId: 1, status: 'active' },
      { id: 2, nik: '3201024808900002', name: 'Sari Wulandari', email: 'sari.spv@sfa.co.id', phone: '081200000004', areaId: 3, status: 'active' },
    ],
    areas: [
      { id: 1, code: 'AR-YK1', name: 'Area Jogja Pusat', desc: 'Kawasan Malioboro & sekitarnya', lat: -7.7956, lng: 110.3695, radiusKm: 5, status: 'active' },
      { id: 2, code: 'AR-YK2', name: 'Area Sleman',      desc: 'Kaliurang, Gejayan, Seturan',   lat: -7.7355, lng: 110.3780, radiusKm: 6, status: 'active' },
      { id: 3, code: 'AR-YK3', name: 'Area Bantul',      desc: 'Jalur Bantul & Imogiri',        lat: -7.8580, lng: 110.3280, radiusKm: 6, status: 'active' },
    ],
    outlets: [
      { id: 1,  code: `OUT-${yr}-001`, name: 'Toko Sinar Rejeki',    owner: 'Bu Tini',    address: 'Jl. Malioboro No. 10',      lat: -7.7955, lng: 110.3690, phone: '081310000001', areaId: 1, category: 'Retail',      status: 'active' },
      { id: 2,  code: `OUT-${yr}-002`, name: 'Warung Barokah',       owner: 'Pak Slamet', address: 'Jl. Sosrowijayan No. 8',   lat: -7.7900, lng: 110.3720, phone: '081310000002', areaId: 1, category: 'Warung',      status: 'active' },
      { id: 3,  code: `OUT-${yr}-003`, name: 'Toko Makmur Jaya',     owner: 'Ibu Yuli',   address: 'Jl. Prawirotaman No. 15',  lat: -7.8010, lng: 110.3640, phone: '081310000003', areaId: 1, category: 'Retail',      status: 'active' },
      { id: 4,  code: `OUT-${yr}-004`, name: 'Minimarket Sejahtera', owner: 'Bpk. Hadi',  address: 'Jl. Godean No. 45',        lat: -7.7880, lng: 110.3750, phone: '081310000004', areaId: 1, category: 'Minimarket',  status: 'active' },
      { id: 5,  code: `OUT-${yr}-005`, name: 'Toko Jaya Abadi',      owner: 'Pak Wawan',  address: 'Jl. Kaliurang KM 4',       lat: -7.7130, lng: 110.3730, phone: '081310000005', areaId: 2, category: 'Retail',      status: 'active' },
      { id: 6,  code: `OUT-${yr}-006`, name: 'Warung Dewi Sari',     owner: 'Bu Dewi',    address: 'Jl. Gejayan No. 22',       lat: -7.7180, lng: 110.3790, phone: '081310000006', areaId: 2, category: 'Warung',      status: 'active' },
      { id: 7,  code: `OUT-${yr}-007`, name: 'Toko Berkah Ilmu',     owner: 'Pak Rudi',   address: 'Jl. Seturan No. 5',        lat: -7.7470, lng: 110.3870, phone: '081310000007', areaId: 2, category: 'Retail',      status: 'active' },
      { id: 8,  code: `OUT-${yr}-008`, name: 'Toko Maju Makmur',     owner: 'Bu Sri',     address: 'Jl. Parangtritis No. 30',  lat: -7.8560, lng: 110.3300, phone: '081310000008', areaId: 3, category: 'Retail',      status: 'active' },
      { id: 9,  code: `OUT-${yr}-009`, name: 'Warung Sumber Rejeki', owner: 'Pak Darto',  address: 'Jl. Bantul No. 12',        lat: -7.8600, lng: 110.3260, phone: '081310000009', areaId: 3, category: 'Warung',      status: 'active' },
      { id: 10, code: `OUT-${yr}-010`, name: 'Toko Harum',           owner: 'Bu Narti',   address: 'Jl. Imogiri No. 7',        lat: -7.8530, lng: 110.3340, phone: '081310000010', areaId: 3, category: 'Warung',      status: 'active' },
    ],
    sales: [
      { id: 1, nik: '3201012509980001', name: 'Andi Wijaya', email: 'sales@sfa.co.id', phone: '081200000003', supervisorId: 1, areaId: 1, target: 50000000, status: 'active' },
      { id: 2, nik: '3201024509950002', name: 'Rina Kusuma', email: 'rina@sfa.co.id', phone: '081200000005', supervisorId: 1, areaId: 2, target: 45000000, status: 'active' },
      { id: 3, nik: '3201031709970003', name: 'Dimas Prakoso', email: 'dimas@sfa.co.id', phone: '081200000006', supervisorId: 2, areaId: 3, target: 40000000, status: 'active' },
    ],
    prospectCategories: [
      { id: 1, name: 'Hot Lead',  desc: 'Potensi tinggi, segera ditindaklanjuti (≤ 3 hari)', priority: 'Tinggi', status: 'active' },
      { id: 2, name: 'Warm Lead', desc: 'Potensi menengah, follow-up berkala',               priority: 'Sedang', status: 'active' },
      { id: 3, name: 'Cold Lead', desc: 'Potensi rendah, pantau berkala',                    priority: 'Rendah', status: 'active' },
    ],
    taskTypes: [
      { id: 1, name: 'Entry Order',       type: 'order',   desc: 'Pencatatan pesanan produk di outlet',    estMinutes: 15, status: 'active' },
      { id: 2, name: 'Audit Stok & Toko', type: 'audit',   desc: 'Audit kondisi toko dan stock-take',      estMinutes: 20, status: 'active' },
      { id: 3, name: 'Foto Display',      type: 'display', desc: 'Dokumentasi pajangan (kamera langsung)', estMinutes: 10, status: 'active' },
      { id: 4, name: 'Penagihan',         type: 'billing', desc: 'Penagihan tagihan outlet',               estMinutes: 10, status: 'active' },
    ],
    tasks: [
      { id: 1, date: t, salesId: 1, outletId: 1, type: 'order',   status: 'pending', note: 'Prioritas outlet besar.', createdAt: nowStamp() },
      { id: 2, date: t, salesId: 1, outletId: 2, type: 'audit',   status: 'pending', note: '', createdAt: nowStamp() },
      { id: 3, date: t, salesId: 1, outletId: 4, type: 'display', status: 'pending', note: 'Rak depan harus rapi.', createdAt: nowStamp() },
      { id: 4, date: t, salesId: 2, outletId: 5, type: 'order',   status: 'pending', note: '', createdAt: nowStamp() },
      { id: 5, date: t, salesId: 3, outletId: 8, type: 'billing', status: 'pending', note: '', createdAt: nowStamp() },
      { id: 6, date: y, salesId: 1, outletId: 3, type: 'order',   status: 'done', note: '', createdAt: nowStamp(), completedAt: nowStamp() },
    ],
    orders: [
      { id: 1, no: `ORD-${ymd(t)}-SAL-001-001`, date: t, salesId: 1, outletId: 2,
        items: [
          { productId: 1, sku: 'PRD-001', name: 'Teh Kotak 250ml', unit: 'pcs', qty: 24, price: 3500, disc: 0, line: 84000 },
          { productId: 4, sku: 'PRD-004', name: 'Keripik Singkong 100gr', unit: 'pcs', qty: 10, price: 8500, disc: 0, line: 85000 },
        ],
        subtotal: 169000, taxRate: TAX_RATE, tax: 18590, total: 187590,
        status: 'submitted', note: '', paid: false, metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp() },
      { id: 2, no: `ORD-${ymd(y)}-SAL-002-001`, date: y, salesId: 2, outletId: 5,
        items: [{ productId: 8, sku: 'PRD-008', name: 'Minyak Goreng 1L', unit: 'pcs', qty: 12, price: 17500, disc: 0, line: 210000 }],
        subtotal: 210000, taxRate: TAX_RATE, tax: 23100, total: 233100,
        status: 'approved', approvedBy: 'Budi Santoso', approvedAt: nowStamp(), paid: false, metodePembayaran: 'transfer', bankId: 2, createdAt: nowStamp() },
      { id: 3, no: `ORD-${ymd(y)}-SAL-001-002`, date: y, salesId: 1, outletId: 1,
        items: [{ productId: 10, sku: 'PRD-010', name: 'Sabun Mandi Cair 450ml', unit: 'pcs', qty: 5, price: 18500, disc: 0, line: 92500 }],
        subtotal: 92500, taxRate: TAX_RATE, tax: 10175, total: 102675,
        status: 'completed', approvedBy: 'Budi Santoso', paid: true, paidAt: nowStamp(), paidMethod: 'Transfer Bank', metodePembayaran: 'tunai', createdAt: nowStamp() },
      { id: 4, no: `ORD-${ymd(y)}-SAL-001-003`, date: y, salesId: 1, outletId: 4,
        items: [{ productId: 5, sku: 'PRD-005', name: 'Biskuit Coklat 120gr', unit: 'pcs', qty: 10, price: 9500, disc: 0, line: 95000 }],
        subtotal: 95000, taxRate: TAX_RATE, tax: 10450, total: 105450,
        status: 'approved', approvedBy: 'Budi Santoso', approvedAt: nowStamp(), paid: false, metodePembayaran: 'cicilan', createdAt: nowStamp() },
    ],
    /* Invoice terbit otomatis saat order disetujui (alur tim langkah 1).
       Demo: order #2 (approved, transfer) & #3 (completed, lunas) — order #1 masih submitted → belum ada invoice. */
    invoices: [
      { id: 1, no: `INV-${ymd(y)}-001`, orderId: 2, orderNo: `ORD-${ymd(y)}-SAL-002-001`, date: y,
        salesId: 2, outletId: 5,
        items: [{ productId: 8, sku: 'PRD-008', name: 'Minyak Goreng 1L', unit: 'pcs', qty: 12, price: 17500, disc: 0, line: 210000 }],
        subtotal: 210000, taxRate: TAX_RATE, tax: 23100, total: 233100,
        metodePembayaran: 'transfer', bankId: 2, terminHari: null, jatuhTempo: y,
        status: 'belum_lunas', createdAt: nowStamp() },
      { id: 2, no: `INV-${ymd(y)}-002`, orderId: 3, orderNo: `ORD-${ymd(y)}-SAL-001-002`, date: y,
        salesId: 1, outletId: 1,
        items: [{ productId: 10, sku: 'PRD-010', name: 'Sabun Mandi Cair 450ml', unit: 'pcs', qty: 5, price: 18500, disc: 0, line: 92500 }],
        subtotal: 92500, taxRate: TAX_RATE, tax: 10175, total: 102675,
        metodePembayaran: 'tunai', bankId: null, terminHari: null, jatuhTempo: y,
        status: 'lunas', paidAt: nowStamp(), paidMethod: 'Tunai', paidAmount: 102675, createdAt: nowStamp() },
      { id: 3, no: `INV-${ymd(y)}-003`, orderId: 4, orderNo: `ORD-${ymd(y)}-SAL-001-003`, date: y,
        salesId: 1, outletId: 4,
        items: [{ productId: 5, sku: 'PRD-005', name: 'Biskuit Coklat 120gr', unit: 'pcs', qty: 10, price: 9500, disc: 0, line: 95000 }],
        subtotal: 95000, taxRate: TAX_RATE, tax: 10450, total: 105450,
        metodePembayaran: 'cicilan', bankId: null, terminHari: null, jatuhTempo: null,
        installments: [
          { ke: 1, nominal: 35150, jatuhTempo: addDays(y, 30), status: 'lunas', paidAt: nowStamp(), paidMethod: 'Tunai' },
          { ke: 2, nominal: 35150, jatuhTempo: addDays(y, 60), status: 'belum_bayar' },
          { ke: 3, nominal: 35150, jatuhTempo: addDays(y, 90), status: 'belum_bayar' },
        ],
        payments: [{ ts: nowStamp(), nominal: 35150, metode: 'Tunai', keterangan: 'Angsuran 1' }],
        status: 'belum_lunas', createdAt: nowStamp() },
    ],

    quotations: [
      { id: 1, no: `QUO-${ymd(t)}-SAL-001-001`, date: t, salesId: 1, outletId: 3,
        items: [{ productId: 5, sku: 'PRD-005', name: 'Biskuit Coklat 120gr', unit: 'pcs', qty: 20, price: 9500, disc: 5, line: 180500 }],
        subtotal: 190000, discTotal: 9500, totalAfterDisc: 180500, taxRate: TAX_RATE, tax: 19855, total: 200355,
        status: 'draft', validUntil: addDays(t, 14), note: 'Harga dapat dinegosiasi ringan.',
        metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp() },
      { id: 2, no: `QUO-${ymd(y)}-SAL-001-001`, date: y, salesId: 1, outletId: 1,
        items: [{ productId: 2, sku: 'PRD-002', name: 'Kopi Susu Sachet 20gr', unit: 'pcs', qty: 100, price: 1500, disc: 0, line: 150000 }],
        subtotal: 150000, discTotal: 0, totalAfterDisc: 150000, taxRate: TAX_RATE, tax: 16500, total: 166500,
        status: 'sent', validUntil: addDays(t, 7), note: '', metodePembayaran: 'transfer', bankId: 1, createdAt: nowStamp() },
      { id: 3, no: `QUO-${ymd(y)}-SAL-002-002`, date: y, salesId: 2, outletId: 6,
        items: [{ productId: 8, sku: 'PRD-008', name: 'Minyak Goreng 1L', unit: 'pcs', qty: 10, price: 17500, disc: 10, line: 157500 }],
        subtotal: 175000, discTotal: 17500, totalAfterDisc: 157500, taxRate: TAX_RATE, tax: 17325, total: 174825,
        status: 'approved', validUntil: addDays(t, 10), note: 'Pelanggan setuju — siap konversi ke order.', metodePembayaran: 'tunai', createdAt: nowStamp() },
    ],
    audits: [
      { id: 1, no: `AUD-${ymd(y)}-001`, date: y, salesId: 2, outletId: 6,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 2 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 2 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 1 },
        ],
        score: 73,
        stocks: [{ productId: 1, name: 'Teh Kotak 250ml', systemStock: 1200, actualStock: 1150, diff: -50 }],
        photos: [], note: 'POSM sudah usai, perlu penggantian.',
        status: 'submitted', categoryId: 2, prospectStatus: 'Prospek', createdAt: nowStamp() },
    ],
    prospects: [
      { id: 1, name: 'Toko Mangga Dua', owner: 'Pak Aan', phone: '081390000001', address: 'Jl. Kaliurang KM 3', areaId: 1, salesId: 1, categoryId: 2, status: 'Prospek', note: 'Menunggu konfirmasi pemilik.', createdAt: nowStamp() },
      { id: 2, name: 'Warung Melati',   owner: 'Bu Wati', phone: '081390000002', address: 'Jl. Imogiri No. 20',  areaId: 3, salesId: 3, categoryId: 1, status: 'Negosiasi', note: 'Minat besar pada produk sembako.', createdAt: nowStamp() },
    ],
    checkins: [
      { id: 1, date: y, ts: nowStamp(), salesId: 1, outletId: 3, lat: -7.8011, lng: 110.3639, distM: 42, areaOk: true, note: '' },
    ],
    violations: [],
    notifications: [],
    syncQueue: [],
  };
}