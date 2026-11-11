import { todayISO, addDays, nowStamp, TAX_RATE } from '../utils/helpers';

export function seed() {
  const t = todayISO();
  const y = addDays(t, -1);
  const d2 = addDays(t, -2);
  const d3 = addDays(t, -3);
  const d5 = addDays(t, -5);
  const d7 = addDays(t, -7);
  const d10 = addDays(t, -10);
  const d14 = addDays(t, -14);
  const ymd = (d) => d.replace(/-/g, '');
  const yr = new Date().getFullYear();

  return {
    /* ============================================================
       1. PENGGUNA SISTEM (RBAC: Admin, Supervisor, Sales, Finance)
       ============================================================ */
    users: [
      { id: 1, name: 'Raka Pratama (Admin)',   email: 'admin@sfa.co.id',      password: 'Admin123',   role: 'admin',      phone: '081200000001', status: 'active' },
      { id: 2, name: 'Budi Santoso (SPV 1)',  email: 'supervisor@sfa.co.id', password: 'Super123',   role: 'supervisor', phone: '081200000002', status: 'active' },
      { id: 3, name: 'Andi Wijaya',            email: 'sales1@sfa.co.id',     password: 'Sales123',   role: 'sales',      phone: '081200000003', status: 'active', salesId: 1 },
      { id: 14, name: 'Sales Umum',            email: 'sales@sfa.co.id',      password: 'Sales123',   role: 'sales',      phone: '081200000014', status: 'active', salesId: 1 },
      { id: 4, name: 'Cindy Claudia (Finance)',email: 'finance@sfa.co.id',    password: 'Finance123', role: 'finance',    phone: '081200000004', status: 'active' },
      { id: 5, name: 'Sari Wulandari (SPV 2)', email: 'sari.spv@sfa.co.id',   password: 'Super123',   role: 'supervisor', phone: '081200000005', status: 'active' },
      { id: 6, name: 'Rina Kusuma',            email: 'sales2@sfa.co.id',     password: 'Sales123',   role: 'sales',      phone: '081200000006', status: 'active', salesId: 2 },
      { id: 7, name: 'Dimas Prakoso',          email: 'sales3@sfa.co.id',     password: 'Sales123',   role: 'sales',      phone: '081200000007', status: 'active', salesId: 3 },
      { id: 8, name: 'Eko Prasetyo',           email: 'sales4@sfa.co.id',     password: 'Sales123',   role: 'sales',      phone: '081200000008', status: 'active', salesId: 4 },
      { id: 9, name: 'Maya Sari Dewi',         email: 'sales5@sfa.co.id',     password: 'Sales123',   role: 'sales',      phone: '081200000009', status: 'active', salesId: 5 },
      { id: 10, name: 'Fajar Hidayat',         email: 'sales6@sfa.co.id',     password: 'Sales123',   role: 'sales',      phone: '081200000010', status: 'active', salesId: 6 },
      { id: 11, name: 'Linda Kurniawan',       email: 'sales7@sfa.co.id',     password: 'Sales123',   role: 'sales',      phone: '081200000011', status: 'active', salesId: 7 },
      { id: 12, name: 'Hendra Setiawan',       email: 'finance2@sfa.co.id',   password: 'Finance123', role: 'finance',    phone: '081200000012', status: 'active' },
      { id: 13, name: 'Aulia Rahma',           email: 'spv3@sfa.co.id',       password: 'Super123',   role: 'supervisor', phone: '081200000013', status: 'active' },
    ],

    /* ============================================================
       2. IDENTITAS LEGAL PERUSAHAAN & BANK PEMBAYARAN
       ============================================================ */
    companies: [
      {
        id: 1,
        name: 'PT Distribusi Nusantara Mandiri',
        npwp: '01.234.567.8-901.000',
        address: 'Kawasan Industri Sleman, Jl. Magelang KM 9.5, Mlati, Sleman, D.I. Yogyakarta 55285',
        phone: '0274-885912',
        email: 'corporate@distribusinusantara.co.id',
        logo: '',
        status: 'active'
      },
    ],

    banks: [
      { id: 1, kode: 'BCA-01', nama: 'Bank Central Asia (BCA)',       noRekening: '8465019283',       atasNama: 'PT Distribusi Nusantara Mandiri', status: 'active' },
      { id: 2, kode: 'BRI-01', nama: 'Bank Rakyat Indonesia (BRI)',   noRekening: '012301002345508',  atasNama: 'PT Distribusi Nusantara Mandiri', status: 'active' },
      { id: 3, kode: 'MDR-01', nama: 'Bank Mandiri',                   noRekening: '1370019827364',    atasNama: 'PT Distribusi Nusantara Mandiri', status: 'active' },
      { id: 4, kode: 'BNI-01', nama: 'Bank Negara Indonesia (BNI)',   noRekening: '0981726354',       atasNama: 'PT Distribusi Nusantara Mandiri', status: 'active' },
      { id: 5, kode: 'BSI-01', nama: 'Bank Syariah Indonesia (BSI)',  noRekening: '7100829182',       atasNama: 'PT Distribusi Nusantara Mandiri', status: 'active' },
    ],

    /* ============================================================
       3. GUDANG LOGISTIK & SUPPLIER
       ============================================================ */
    warehouses: [
      { id: 1, code: 'GDG-SLM', name: 'Gudang Pusat Logistik Sleman', address: 'Jl. Magelang KM 9.5, Mlati, Sleman', status: 'active' },
      { id: 2, code: 'GDG-YK1', name: 'Gudang Hub Yogyakarta Kota',    address: 'Jl. Solo KM 4.5, Gondokusuman, Yogyakarta', status: 'active' },
      { id: 3, code: 'GDG-BTL', name: 'Gudang Distribusi Bantul Hub',  address: 'Kawasan Industri Piyungan, Bantul', status: 'active' },
      { id: 4, code: 'GDG-KP',  name: 'Gudang Cabang Kulon Progo',     address: 'Jl. Wates KM 12, Sentolo, Kulon Progo', status: 'active' },
    ],

    suppliers: [
      { id: 1, code: 'SUP-001', name: 'PT Indofood CBP Sukses Makmur Tbk', picId: 1, phone: '024-7601234', address: 'Kawasan Industri Candi, Semarang', productIds: [1, 2, 7, 8], status: 'active' },
      { id: 2, code: 'SUP-002', name: 'PT Unilever Indonesia Distribusi',  picId: 1, phone: '031-8912345', address: 'Rungkut Industri Kav. 12, Surabaya', productIds: [10, 11, 12, 16], status: 'active' },
      { id: 3, code: 'SUP-003', name: 'PT Mayora Indah Distribusi Tbk',    picId: 2, phone: '021-5912345', address: 'Jl. Daan Mogot KM 18, Tangerang', productIds: [4, 5, 6, 17], status: 'active' },
      { id: 4, code: 'SUP-004', name: 'PT Wings Surya Distribusi Jogja',   picId: 2, phone: '0274-489123', address: 'Jl. Ring Road Timur, Banguntapan, Bantul', productIds: [13, 14, 15], status: 'active' },
      { id: 5, code: 'SUP-005', name: 'CV Sumber Pangan Makmur Abadi',     picId: 1, phone: '0271-654321', address: 'Kompleks Pergudangan Palur, Sukoharjo', productIds: [3, 9, 18, 19, 20], status: 'active' },
      { id: 6, code: 'SUP-006', name: 'PT Nestlé Indonesia Distribusi',    picId: 3, phone: '021-3041234', address: 'Kawasan Industri Karawang, Jawa Barat', productIds: [21, 22, 23], status: 'active' },
      { id: 7, code: 'SUP-007', name: 'PT Garudafood Putra Putri Jaya',    picId: 3, phone: '021-7591234', address: 'Jl. Tanjung Barat, Jakarta Selatan', productIds: [24, 25, 26], status: 'active' },
    ],

    /* ============================================================
       4. WILAYAH KERJA, SUPERVISOR & SALES LAPANGAN
       ============================================================ */
    areas: [
      { id: 1, code: 'AR-YK1', name: 'Area Jogja Pusat & Malioboro', desc: 'Danurejan, Gondokusuman, Kraton, Malioboro', lat: -7.7956, lng: 110.3695, radiusKm: 5, status: 'active' },
      { id: 2, code: 'AR-YK2', name: 'Area Sleman Timur & Kampus',    desc: 'Gejayan, Seturan, Condongcatur, Kaliurang',   lat: -7.7681, lng: 110.3789, radiusKm: 6, status: 'active' },
      { id: 3, code: 'AR-YK3', name: 'Area Bantul & Wisata Selatan',  desc: 'Bantul Kota, Sewon, Imogiri, Parangtritis',   lat: -7.8680, lng: 110.3380, radiusKm: 7, status: 'active' },
      { id: 4, code: 'AR-YK4', name: 'Area Sleman Barat & Kulon Progo', desc: 'Godean, Mlati Barat, Wates, Sentolo',       lat: -7.7850, lng: 110.2850, radiusKm: 8, status: 'active' },
      { id: 5, code: 'AR-YK5', name: 'Area Gunungkidul & Wonosari',   desc: 'Wonosari, Panggang, Tanjungsari, Playen',     lat: -7.8050, lng: 110.5980, radiusKm: 9, status: 'active' },
      { id: 6, code: 'AR-YK6', name: 'Area Sleman Utara & Klaten',    desc: 'Klidon, Ngaglik, Sleman Utara, Prambanan',   lat: -7.7180, lng: 110.4180, radiusKm: 7, status: 'active' },
    ],

    supervisors: [
      { id: 1, nik: '3201012307850001', name: 'Budi Santoso', email: 'supervisor@sfa.co.id', phone: '081200000002', areaId: 1, status: 'active' },
      { id: 2, nik: '3201024808900002', name: 'Sari Wulandari', email: 'sari.spv@sfa.co.id', phone: '081200000005', areaId: 3, status: 'active' },
      { id: 3, nik: '3201031109850003', name: 'Aulia Rahma', email: 'spv3@sfa.co.id', phone: '081200000013', areaId: 5, status: 'active' },
    ],

    sales: [
      { id: 1, nik: '3201012509980001', name: 'Andi Wijaya',   email: 'sales1@sfa.co.id', phone: '081200000003', supervisorId: 1, areaId: 1, target: 60000000, status: 'active' },
      { id: 2, nik: '3201024509950002', name: 'Rina Kusuma',   email: 'sales2@sfa.co.id',  phone: '081200000006', supervisorId: 1, areaId: 2, target: 55000000, status: 'active' },
      { id: 3, nik: '3201031709970003', name: 'Dimas Prakoso', email: 'sales3@sfa.co.id', phone: '081200000007', supervisorId: 2, areaId: 3, target: 50000000, status: 'active' },
      { id: 4, nik: '3201041108960004', name: 'Eko Prasetyo',  email: 'sales4@sfa.co.id',   phone: '081200000008', supervisorId: 2, areaId: 4, target: 45000000, status: 'active' },
      { id: 5, nik: '3201052109990005', name: 'Maya Sari Dewi', email: 'sales5@sfa.co.id', phone: '081200000009', supervisorId: 3, areaId: 5, target: 40000000, status: 'active' },
      { id: 6, nik: '3201061409960006', name: 'Fajar Hidayat', email: 'sales6@sfa.co.id', phone: '081200000010', supervisorId: 3, areaId: 6, target: 38000000, status: 'active' },
      { id: 7, nik: '3201070909940007', name: 'Linda Kurniawan', email: 'sales7@sfa.co.id', phone: '081200000011', supervisorId: 1, areaId: 2, target: 42000000, status: 'active' },
    ],

    /* ============================================================
       5. KATALOG PRODUK FMCG LENGKAP (30 Item)
       ============================================================ */
    categories: ['Minuman', 'Snack', 'Sembako', 'Perawatan Diri', 'Bumbu Dapur', 'Rokok', 'Susu & Makanan Bayi'],

    products: [
      { id: 1,  sku: 'PRD-001', name: 'Teh Kotak Jasmine 250ml',        category: 'Minuman',        unit: 'karton', hargaJual: 72000,  hargaBeli: 61000,  stock: 450,  pcsPerUnit: 24, status: 'active' },
      { id: 2,  sku: 'PRD-002', name: 'Kopi Susu Espresso Sachet 20gr', category: 'Minuman',        unit: 'renceng',hargaJual: 14500,  hargaBeli: 11800,  stock: 1200, pcsPerUnit: 10, status: 'active' },
      { id: 3,  sku: 'PRD-003', name: 'Air Mineral Gunung 600ml',       category: 'Minuman',        unit: 'karton', hargaJual: 46000,  hargaBeli: 38000,  stock: 600,  pcsPerUnit: 24, status: 'active' },
      { id: 4,  sku: 'PRD-004', name: 'Keripik Singkong Pedas Manis',   category: 'Snack',          unit: 'pcs',    hargaJual: 8500,   hargaBeli: 6400,   stock: 580,  pcsPerUnit: 1,  status: 'active' },
      { id: 5,  sku: 'PRD-005', name: 'Biskuit Coklat Sandwich 120gr',  category: 'Snack',          unit: 'karton', hargaJual: 92000,  hargaBeli: 78000,  stock: 220,  pcsPerUnit: 12, status: 'active' },
      { id: 6,  sku: 'PRD-006', name: 'Wafer Keju Crispy Box 150gr',    category: 'Snack',          unit: 'box',    hargaJual: 16500,  hargaBeli: 13200,  stock: 400,  pcsPerUnit: 1,  status: 'active' },
      { id: 7,  sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg',   category: 'Sembako',        unit: 'sak',    hargaJual: 76000,  hargaBeli: 68500,  stock: 350,  pcsPerUnit: 1,  status: 'active' },
      { id: 8,  sku: 'PRD-008', name: 'Minyak Goreng Sawit Pouch 2L',   category: 'Sembako',        unit: 'karton', hargaJual: 204000, hargaBeli: 184000, stock: 280,  pcsPerUnit: 6,  status: 'active' },
      { id: 9,  sku: 'PRD-009', name: 'Gula Pasir Tebu Kristal 1kg',    category: 'Sembako',        unit: 'karton', hargaJual: 340000, hargaBeli: 310000, stock: 190,  pcsPerUnit: 20, status: 'active' },
      { id: 10, sku: 'PRD-010', name: 'Sabun Mandi Cair Refill 450ml',  category: 'Perawatan Diri', unit: 'pcs',    hargaJual: 22500,  hargaBeli: 17800,  stock: 520,  pcsPerUnit: 1,  status: 'active' },
      { id: 11, sku: 'PRD-011', name: 'Sampo Anti Ketombe Menthol 160ml',category: 'Perawatan Diri',unit: 'pcs',    hargaJual: 27500,  hargaBeli: 22000,  stock: 310,  pcsPerUnit: 1,  status: 'active' },
      { id: 12, sku: 'PRD-012', name: 'Pasta Gigi Fresh White 190gr',   category: 'Perawatan Diri', unit: 'pcs',    hargaJual: 15500,  hargaBeli: 12100,  stock: 480,  pcsPerUnit: 1,  status: 'active' },
      { id: 13, sku: 'PRD-013', name: 'Deterjen Bubuk Konsentrat 800gr', category: 'Perawatan Diri', unit: 'karton', hargaJual: 195000, hargaBeli: 168000, stock: 150,  pcsPerUnit: 12, status: 'active' },
      { id: 14, sku: 'PRD-014', name: 'Pencuci Piring Jeruk Nipis 750ml',category: 'Perawatan Diri', unit: 'pcs',    hargaJual: 14000,  hargaBeli: 10800,  stock: 640,  pcsPerUnit: 1,  status: 'active' },
      { id: 15, sku: 'PRD-015', name: 'Pembersih Lantai Lavender 750ml', category: 'Perawatan Diri', unit: 'pcs',    hargaJual: 12500,  hargaBeli: 9700,   stock: 380,  pcsPerUnit: 1,  status: 'active' },
      { id: 16, sku: 'PRD-016', name: 'Kecap Manis Kedelai Hitam 550ml',category: 'Bumbu Dapur',    unit: 'karton', hargaJual: 228000, hargaBeli: 198000, stock: 170,  pcsPerUnit: 12, status: 'active' },
      { id: 17, sku: 'PRD-017', name: 'Saus Sambal Extra Pedas 335ml',  category: 'Bumbu Dapur',    unit: 'karton', hargaJual: 144000, hargaBeli: 122000, stock: 210,  pcsPerUnit: 12, status: 'active' },
      { id: 18, sku: 'PRD-018', name: 'Tepung Terigu Serbaguna 1kg',    category: 'Sembako',        unit: 'karton', hargaJual: 135000, hargaBeli: 118000, stock: 240,  pcsPerUnit: 10, status: 'active' },
      { id: 19, sku: 'PRD-019', name: 'Mie Instan Goreng Spesial',      category: 'Sembako',        unit: 'karton', hargaJual: 118000, hargaBeli: 104000, stock: 500,  pcsPerUnit: 40, status: 'active' },
      { id: 20, sku: 'PRD-020', name: 'Susu Kental Manis Putih 370gr',  category: 'Minuman',        unit: 'karton', hargaJual: 465000, hargaBeli: 410000, stock: 130,  pcsPerUnit: 48, status: 'active' },
      { id: 21, sku: 'PRD-021', name: 'Bubuk Coklat Milo 220gr',        category: 'Minuman',        unit: 'pcs',    hargaJual: 24500,  hargaBeli: 19800,  stock: 320,  pcsPerUnit: 1,  status: 'active' },
      { id: 22, sku: 'PRD-022', name: 'Kopi Kapal Api Sachet 18gr',     category: 'Minuman',        unit: 'karton', hargaJual: 185000, hargaBeli: 158000, stock: 290,  pcsPerUnit: 40, status: 'active' },
      { id: 23, sku: 'PRD-023', name: 'Susu Bubuk Dancow 400gr',        category: 'Susu & Makanan Bayi', unit: 'pcs', hargaJual: 78500,  hargaBeli: 66000,  stock: 210,  pcsPerUnit: 1,  status: 'active' },
      { id: 24, sku: 'PRD-024', name: 'Rokok Surya Mild 16 btng',       category: 'Rokok',          unit: 'bks',    hargaJual: 24500,  hargaBeli: 20500,  stock: 500,  pcsPerUnit: 1,  status: 'active' },
      { id: 25, sku: 'PRD-025', name: 'Rokok Gudang Garam Merah',       category: 'Rokok',          unit: 'bks',    hargaJual: 25500,  hargaBeli: 21200,  stock: 420,  pcsPerUnit: 1,  status: 'active' },
      { id: 26, sku: 'PRD-026', name: 'Permen Kopi Kapsul 40gr',        category: 'Snack',          unit: 'pcs',    hargaJual: 6500,   hargaBeli: 4800,   stock: 700,  pcsPerUnit: 1,  status: 'active' },
      { id: 27, sku: 'PRD-027', name: 'Minyak Kelapa Sawit 1L Botol',   category: 'Sembako',        unit: 'pcs',    hargaJual: 22500,  hargaBeli: 18900,  stock: 410,  pcsPerUnit: 1,  status: 'active' },
      { id: 28, sku: 'PRD-028', name: 'Teh Celup Kotak 25 sachet',      category: 'Minuman',        unit: 'box',    hargaJual: 18500,  hargaBeli: 14200,  stock: 360,  pcsPerUnit: 1,  status: 'active' },
      { id: 29, sku: 'PRD-029', name: 'Sarden Kaleng 155gr',            category: 'Sembako',        unit: 'pcs',    hargaJual: 13500,  hargaBeli: 10500,  stock: 450,  pcsPerUnit: 1,  status: 'active' },
      { id: 30, sku: 'PRD-030', name: 'Biskuit Marie 250gr',            category: 'Snack',          unit: 'pcs',    hargaJual: 9500,   hargaBeli: 7200,   stock: 500,  pcsPerUnit: 1,  status: 'active' },
    ],

    /* ============================================================
       6. MASTER OUTLET PELANGGAN (40 Outlet di 6 Area)
       ============================================================ */
    outlets: [
      { id: 1,  code: `OUT-${yr}-001`, name: 'Toko Kelontong Barokah',     owner: 'Bpk. H. Slamet',  address: 'Jl. Malioboro No. 24, Danurejan',          lat: -7.7942, lng: 110.3661, phone: '081310000001', areaId: 1, category: 'Retail',      status: 'active' },
      { id: 2,  code: `OUT-${yr}-002`, name: 'Minimarket Prawiro Jaya',     owner: 'Ibu Hj. Yuli',    address: 'Jl. Prawirotaman No. 18, Mergangsan',      lat: -7.8185, lng: 110.3702, phone: '081310000002', areaId: 1, category: 'Minimarket',  status: 'active' },
      { id: 3,  code: `OUT-${yr}-003`, name: 'Grosir Sembako Sinar Makmur', owner: 'Bpk. Hendrawan',  address: 'Jl. Brigjen Katamso No. 88, Gondomanan',   lat: -7.8052, lng: 110.3715, phone: '081310000003', areaId: 1, category: 'Grosir',      status: 'active' },
      { id: 4,  code: `OUT-${yr}-004`, name: 'Warung Rejeki Bu Tini',      owner: 'Ibu Tini Hartati',address: 'Jl. Sosrowijayan No. 42, Gedongtengen',    lat: -7.7915, lng: 110.3644, phone: '081310000004', areaId: 1, category: 'Warung',      status: 'active' },
      { id: 5,  code: `OUT-${yr}-005`, name: 'Toko Surya Kencana',          owner: 'Bpk. Agus Santoso',address: 'Jl. Sultan Agung No. 54, Gunungketur',     lat: -7.8021, lng: 110.3768, phone: '081310000005', areaId: 1, category: 'Retail',      status: 'active' },
      { id: 6,  code: `OUT-${yr}-006`, name: 'Minimarket Seturan Sejahtera',owner: 'Ibu Melani',      address: 'Jl. Seturan Raya No. 12, Depok, Sleman',   lat: -7.7712, lng: 110.4085, phone: '081310000006', areaId: 2, category: 'Minimarket',  status: 'active' },
      { id: 7,  code: `OUT-${yr}-007`, name: 'Toko Berkah Gejayan',         owner: 'Bpk. Dwi Cahyo',  address: 'Jl. Affandi (Gejayan) No. 30, Sleman',     lat: -7.7681, lng: 110.3889, phone: '081310000007', areaId: 2, category: 'Retail',      status: 'active' },
      { id: 8,  code: `OUT-${yr}-008`, name: 'Grosir Kaliurang Mandiri',    owner: 'Bpk. Rahmat Subroto', address: 'Jl. Kaliurang KM 6.2, Kentungan, Sleman',lat: -7.7523, lng: 110.3812, phone: '081310000008', areaId: 2, category: 'Grosir',      status: 'active' },
      { id: 9,  code: `OUT-${yr}-009`, name: 'Warung Mahasiswa Bu Dewi',    owner: 'Ibu Dewi Sartika',address: 'Jl. Moses Gatotkaca No. 8, Caturtunggal',  lat: -7.7794, lng: 110.3921, phone: '081310000009', areaId: 2, category: 'Warung',      status: 'active' },
      { id: 10, code: `OUT-${yr}-010`, name: 'Toko Rejeki Condongcatur',    owner: 'Bpk. Gunawan',    address: 'Jl. Anggajaya 1 No. 45, Condongcatur',     lat: -7.7592, lng: 110.4011, phone: '081310000010', areaId: 2, category: 'Retail',      status: 'active' },
      { id: 11, code: `OUT-${yr}-011`, name: 'Toko Maju Makmur Bantul',    owner: 'Ibu Sri Rahayu',  address: 'Jl. Jend. Sudirman No. 30, Bantul Kota',   lat: -7.8891, lng: 110.3294, phone: '081310000011', areaId: 3, category: 'Retail',      status: 'active' },
      { id: 12, code: `OUT-${yr}-012`, name: 'Grosir Sembako Parangtritis',owner: 'Bpk. H. Marzuki', address: 'Jl. Parangtritis KM 7, Sewon, Bantul',     lat: -7.8482, lng: 110.3615, phone: '081310000012', areaId: 3, category: 'Grosir',      status: 'active' },
      { id: 13, code: `OUT-${yr}-013`, name: 'Warung Berkah Imogiri',      owner: 'Ibu Narti',       address: 'Jl. Imogiri Timur KM 10, Jetis, Bantul',   lat: -7.8724, lng: 110.3842, phone: '081310000013', areaId: 3, category: 'Warung',      status: 'active' },
      { id: 14, code: `OUT-${yr}-014`, name: 'Minimarket Kasihan Sehat',   owner: 'Bpk. Tri Wibowo', address: 'Jl. Bibis Raya, Kasihan, Bantul',          lat: -7.8285, lng: 110.3341, phone: '081310000014', areaId: 3, category: 'Minimarket',  status: 'active' },
      { id: 15, code: `OUT-${yr}-015`, name: 'Toko Sumber Rejeki Bantul',  owner: 'Bpk. Darto',      address: 'Jl. Bantul KM 5, Dongkelan, Sewon',        lat: -7.8212, lng: 110.3541, phone: '081310000015', areaId: 3, category: 'Retail',      status: 'active' },
      { id: 16, code: `OUT-${yr}-016`, name: 'Toko Sembako Godean Jaya',   owner: 'Ibu Ratna Susanti', address: 'Jl. Godean KM 8.5, Sidokarto, Sleman',    lat: -7.7694, lng: 110.3012, phone: '081310000016', areaId: 4, category: 'Retail',      status: 'active' },
      { id: 17, code: `OUT-${yr}-017`, name: 'Minimarket Sentolo Sentosa', owner: 'Bpk. Joko Purnomo', address: 'Jl. Wates KM 15, Sentolo, Kulon Progo',   lat: -7.8592, lng: 110.2284, phone: '081310000017', areaId: 4, category: 'Minimarket',  status: 'active' },
      { id: 18, code: `OUT-${yr}-018`, name: 'Grosir Berkah Kulon Progo',  owner: 'Bpk. H. Supardi', address: 'Jl. Diponegoro No. 22, Wates Kota',       lat: -7.8598, lng: 110.1584, phone: '081310000018', areaId: 4, category: 'Grosir',      status: 'active' },
      { id: 19, code: `OUT-${yr}-019`, name: 'Warung Sederhana Bu Warsi',  owner: 'Ibu Warsini',     address: 'Jl. Kebon Agung No. 14, Seyegan, Sleman',  lat: -7.7345, lng: 110.3120, phone: '081310000019', areaId: 4, category: 'Warung',      status: 'active' },
      { id: 20, code: `OUT-${yr}-020`, name: 'Toko Kelontong Mlati Makmur',owner: 'Bpk. Teguh Wibisono', address: 'Jl. Magelang KM 7.5, Mlati, Sleman',   lat: -7.7420, lng: 110.3620, phone: '081310000020', areaId: 4, category: 'Retail',      status: 'active' },
      { id: 21, code: `OUT-${yr}-021`, name: 'Toko Karya Wonosari',        owner: 'Ibu Sri Murni',   address: 'Jl. Sudirman No. 10, Wonosari, Gunungkidul', lat: -7.8050, lng: 110.5980, phone: '081310000021', areaId: 5, category: 'Retail',      status: 'active' },
      { id: 22, code: `OUT-${yr}-022`, name: 'Minimarket Tanjungsari Sejahtera', owner: 'Bpk. H. Bambang', address: 'Jl. Raya Tanjungsari KM 3, Gunungkidul', lat: -7.7820, lng: 110.6120, phone: '081310000022', areaId: 5, category: 'Minimarket',  status: 'active' },
      { id: 23, code: `OUT-${yr}-023`, name: 'Warung Panggang Abadi',      owner: 'Ibu Ratna',       address: 'Jl. Raya Panggang No. 8, Gunungkidul',       lat: -7.8520, lng: 110.6340, phone: '081310000023', areaId: 5, category: 'Warung',      status: 'active' },
      { id: 24, code: `OUT-${yr}-024`, name: 'Grosir Sembako Playen',      owner: 'Bpk. Sugeng',     address: 'Jl. Raya Playen No. 45, Gunungkidul',      lat: -7.7520, lng: 110.5680, phone: '081310000024', areaId: 5, category: 'Grosir',      status: 'active' },
      { id: 25, code: `OUT-${yr}-025`, name: 'Toko Rahayu Klaten',         owner: 'Bpk. Rahmat',     address: 'Jl. Raya Solo No. 67, Klaten',             lat: -7.7180, lng: 110.5980, phone: '081310000025', areaId: 6, category: 'Retail',      status: 'active' },
      { id: 26, code: `OUT-${yr}-026`, name: 'Minimarket Prambanan Indah', owner: 'Ibu Sri',         address: 'Jl. Raya Magelang No. 12, Prambanan',       lat: -7.7050, lng: 110.5020, phone: '081310000026', areaId: 6, category: 'Minimarket',  status: 'active' },
      { id: 27, code: `OUT-${yr}-027`, name: 'Warung Klaten Jaya',         owner: 'Bpk. Joko',       address: 'Jl. Ahmad Yani No. 34, Klaten',            lat: -7.7250, lng: 110.5850, phone: '081310000027', areaId: 6, category: 'Warung',      status: 'active' },
      { id: 28, code: `OUT-${yr}-028`, name: 'Toko Sejahtera Klaten',      owner: 'Ibu Tri',         address: 'Jl. MT Haryono No. 19, Klaten',            lat: -7.7320, lng: 110.5980, phone: '081310000028', areaId: 6, category: 'Retail',      status: 'active' },
      { id: 29, code: `OUT-${yr}-029`, name: 'Grosir Sembako Ngawen',      owner: 'Bpk. Wibowo',     address: 'Jl. Raya Ngawen No. 12, Klaten',           lat: -7.6850, lng: 110.5450, phone: '081310000029', areaId: 6, category: 'Grosir',      status: 'active' },
      { id: 30, code: `OUT-${yr}-030`, name: 'Warung Bu Sri Rejeki',       owner: 'Ibu Sri Rejeki', address: 'Jl. Solo-Klaten No. 8, Klaten',             lat: -7.7450, lng: 110.6020, phone: '081310000030', areaId: 6, category: 'Warung',      status: 'active' },
      { id: 31, code: `OUT-${yr}-031`, name: 'Toko Anugrah Sejahtera',     owner: 'Bpk. Anugrah',    address: 'Jl. Kaliurang KM 10, Cangkringan, Sleman', lat: -7.6920, lng: 110.4120, phone: '081310000031', areaId: 2, category: 'Retail',      status: 'active' },
      { id: 32, code: `OUT-${yr}-032`, name: 'Minimarket Cangkringan Indah',owner: 'Ibu Ratna Dewi', address: 'Jl. Kaliurang KM 12, Cangkringan',         lat: -7.6850, lng: 110.4180, phone: '081310000032', areaId: 2, category: 'Minimarket',  status: 'active' },
      { id: 33, code: `OUT-${yr}-033`, name: 'Warung Bu Sulastri',         owner: 'Ibu Sulastri',   address: 'Jl. Maguwoharjo No. 23, Depok, Sleman',      lat: -7.7650, lng: 110.3980, phone: '081310000033', areaId: 2, category: 'Warung',      status: 'active' },
      { id: 34, code: `OUT-${yr}-034`, name: 'Toko Mandiri Wates',         owner: 'Bpk. Wibisono',   address: 'Jl. Diponegoro No. 5, Wates, Kulon Progo', lat: -7.8550, lng: 110.1950, phone: '081310000034', areaId: 4, category: 'Retail',      status: 'active' },
      { id: 35, code: `OUT-${yr}-035`, name: 'Minimarket Kulon Progo Sejahtera',owner: 'Ibu Yanti',   address: 'Jl. Wates KM 8, Temon, Kulon Progo',       lat: -7.8250, lng: 110.2150, phone: '081310000035', areaId: 4, category: 'Minimarket',  status: 'active' },
      { id: 36, code: `OUT-${yr}-036`, name: 'Grosir Sembako Sentolo',     owner: 'Bpk. Hadi',       address: 'Jl. Wates KM 10, Sentolo',                 lat: -7.8450, lng: 110.2250, phone: '081310000036', areaId: 4, category: 'Grosir',      status: 'active' },
      { id: 37, code: `OUT-${yr}-037`, name: 'Warung Bu Mardi',            owner: 'Ibu Mardi',       address: 'Jl. Magelang KM 10, Mlati, Sleman',        lat: -7.7350, lng: 110.3750, phone: '081310000037', areaId: 4, category: 'Warung',      status: 'active' },
      { id: 38, code: `OUT-${yr}-038`, name: 'Toko Berkat Imogiri',        owner: 'Bpk. Mardi',      address: 'Jl. Imogiri No. 15, Jetis, Bantul',        lat: -7.8750, lng: 110.3820, phone: '081310000038', areaId: 3, category: 'Retail',      status: 'active' },
      { id: 39, code: `OUT-${yr}-039`, name: 'Minimarket Sewon Makmur',    owner: 'Ibu Sartini',     address: 'Jl. Parangtritis KM 5, Sewon, Bantul',       lat: -7.8650, lng: 110.3550, phone: '081310000039', areaId: 3, category: 'Minimarket',  status: 'active' },
      { id: 40, code: `OUT-${yr}-040`, name: 'Toko Abadi Parangtritis',    owner: 'Bpk. H. Imam',    address: 'Jl. Parangtritis KM 8, Sanden, Bantul',    lat: -7.8850, lng: 110.3720, phone: '081310000040', areaId: 3, category: 'Retail',      status: 'active' },
    ],

    /* ============================================================
       7. KATEGORI PROSPEK & JENIS TUGAS
       ============================================================ */
    prospectCategories: [
      { id: 1, name: 'Hot Lead (Prioritas Tinggi)', desc: 'Potensi omzet > Rp 25 Juta/bulan, closing ≤ 3 hari', priority: 'Tinggi', status: 'active' },
      { id: 2, name: 'Warm Lead (Prioritas Sedang)', desc: 'Potensi omzet Rp 10–25 Juta/bulan, butuh presentasi & negosiasi', priority: 'Sedang', status: 'active' },
      { id: 3, name: 'Cold Lead (Prospek Awal)',    desc: 'Toko baru buka atau baru terdata oleh tim survey', priority: 'Rendah', status: 'active' },
    ],

    taskTypes: [
      { id: 1, name: 'Penjualan / Entry Order', type: 'order',   desc: 'Pencatatan pesanan produk dan restock toko',      estMinutes: 20, status: 'active' },
      { id: 2, name: 'Audit Fisik & Stok Toko', type: 'audit',   desc: 'Verifikasi kondisi toko fisik dan stok fisik',    estMinutes: 25, status: 'active' },
      { id: 3, name: 'Dokumentasi Foto Display',type: 'display', desc: 'Pemotretan pajangan produk & materi promosi POSM',estMinutes: 10, status: 'active' },
      { id: 4, name: 'Penagihan Piutang Toko',  type: 'billing', desc: 'Penagihan invoice tempo & tanda terima pembayaran', estMinutes: 15, status: 'active' },
    ],

    /* ============================================================
       8. AGENDA TUGAS RUTE SALES (24 Tugas across multiple dates)
       ============================================================ */
    tasks: [
      { id: 1,  date: t,  salesId: 1, outletId: 1,  type: 'order',   status: 'in_progress', note: 'Restock produk teh kotak & biskuit.', createdAt: nowStamp() },
      { id: 2,  date: t,  salesId: 1, outletId: 3,  type: 'order',   status: 'pending',     note: 'Prioritas grosir, tawarkan promo karton minyak.', createdAt: nowStamp() },
      { id: 3,  date: t,  salesId: 1, outletId: 2,  type: 'audit',   status: 'pending',     note: 'Audit display rak depan dan stock-take.', createdAt: nowStamp() },
      { id: 4,  date: t,  salesId: 2, outletId: 6,  type: 'order',   status: 'in_progress', note: 'Minimarket minta pengiriman pagi.', createdAt: nowStamp() },
      { id: 5,  date: t,  salesId: 2, outletId: 8,  type: 'billing', status: 'pending',     note: 'Tagihan termin 14 hari invoice INV-001.', createdAt: nowStamp() },
      { id: 6,  date: t,  salesId: 3, outletId: 11, type: 'order',   status: 'pending',     note: 'Pesanan beras & minyak goreng.', createdAt: nowStamp() },
      { id: 7,  date: t,  salesId: 3, outletId: 12, type: 'audit',   status: 'pending',     note: 'Audit fisik grosir Sembako Parangtritis.', createdAt: nowStamp() },
      { id: 8,  date: t,  salesId: 4, outletId: 16, type: 'order',   status: 'pending',     note: 'Restock toko sembako Godean.', createdAt: nowStamp() },
      { id: 9,  date: t,  salesId: 4, outletId: 17, type: 'billing', status: 'pending',     note: 'Tagihan piutang termin 30 hari.', createdAt: nowStamp() },
      { id: 10, date: t,  salesId: 5, outletId: 21, type: 'order',   status: 'pending',     note: 'Order beras dan gula Wonosari.', createdAt: nowStamp() },
      { id: 11, date: t,  salesId: 5, outletId: 22, type: 'order',   status: 'pending',     note: 'Minimarket Tanjungsari butuh restock.', createdAt: nowStamp() },
      { id: 12, date: t,  salesId: 6, outletId: 25, type: 'order',   status: 'pending',     note: 'Order rutin toko Klaten.', createdAt: nowStamp() },
      { id: 13, date: t,  salesId: 6, outletId: 26, type: 'order',   status: 'pending',     note: 'Restock minimarket Prambanan.', createdAt: nowStamp() },
      { id: 14, date: t,  salesId: 7, outletId: 7,  type: 'order',   status: 'pending',     note: 'Restock Toko Berkah Gejayan.', createdAt: nowStamp() },
      { id: 15, date: t,  salesId: 7, outletId: 10, type: 'order',   status: 'pending',     note: 'Order toko Condongcatur.', createdAt: nowStamp() },
      { id: 16, date: y,  salesId: 1, outletId: 4,  type: 'order',   status: 'done',        note: 'Selesai entry order Rp 1.480.000.', createdAt: nowStamp(), completedAt: nowStamp() },
      { id: 17, date: y,  salesId: 1, outletId: 5,  type: 'display', status: 'done',        note: 'Foto display rak depan sudah diunggah.', createdAt: nowStamp(), completedAt: nowStamp() },
      { id: 18, date: y,  salesId: 2, outletId: 7,  type: 'audit',   status: 'done',        note: 'Audit toko skor 88, layak plafon kredit.', createdAt: nowStamp(), completedAt: nowStamp() },
      { id: 19, date: y,  salesId: 2, outletId: 9,  type: 'billing', status: 'done',        note: 'Penagihan lunas via transfer bank.', createdAt: nowStamp(), completedAt: nowStamp() },
      { id: 20, date: d2, salesId: 3, outletId: 13, type: 'order',   status: 'done',        note: 'Selesai order sederhana.', createdAt: nowStamp(), completedAt: nowStamp() },
      { id: 21, date: d2, salesId: 3, outletId: 14, type: 'audit',   status: 'done',        note: 'Audit fisik dan POSM.', createdAt: nowStamp(), completedAt: nowStamp() },
      { id: 22, date: d2, salesId: 4, outletId: 18, type: 'order',   status: 'failed',      note: 'Toko tutup saat sales berkunjung (hari libur keluarga).', createdAt: nowStamp() },
      { id: 23, date: d3, salesId: 4, outletId: 19, type: 'billing', status: 'done',        note: 'Tagihan lunas tunai.', createdAt: nowStamp(), completedAt: nowStamp() },
      { id: 24, date: d3, salesId: 1, outletId: 2,  type: 'order',   status: 'done',        note: 'Restock teh kotak 40 karton.', createdAt: nowStamp(), completedAt: nowStamp() },
    ],

    /* ============================================================
       9. SALES ORDERS AKTIF & RIWAYAT (20 Transaksi)
       ============================================================ */
    orders: [
      {
        id: 1, no: `ORD-${ymd(t)}-SAL-001-001`, date: t, salesId: 1, outletId: 3,
        items: [
          { productId: 1, sku: 'PRD-001', name: 'Teh Kotak Jasmine 250ml', unit: 'karton', qty: 15, price: 72000, disc: 2, line: 1058400 },
          { productId: 8, sku: 'PRD-008', name: 'Minyak Goreng Sawit Pouch 2L', unit: 'karton', qty: 10, price: 204000, disc: 0, line: 2040000 },
          { productId: 9, sku: 'PRD-009', name: 'Gula Pasir Tebu Kristal 1kg', unit: 'karton', qty: 5, price: 340000, disc: 0, line: 1700000 },
        ],
        subtotal: 4798400, taxRate: TAX_RATE, tax: 527824, total: 5326224,
        status: 'submitted', note: 'Pengiriman via truk gudang Sleman.', paid: false, metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp()
      },
      {
        id: 2, no: `ORD-${ymd(t)}-SAL-002-001`, date: t, salesId: 2, outletId: 6,
        items: [
          { productId: 5, sku: 'PRD-005', name: 'Biskuit Coklat Sandwich 120gr', unit: 'karton', qty: 8, price: 92000, disc: 0, line: 736000 },
          { productId: 6, sku: 'PRD-006', name: 'Wafer Keju Crispy Box 150gr', unit: 'box', qty: 25, price: 16500, disc: 0, line: 412500 },
        ],
        subtotal: 1148500, taxRate: TAX_RATE, tax: 126335, total: 1274835,
        status: 'submitted', note: 'Menunggu approval diskon promo.', paid: false, metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 3, no: `ORD-${ymd(t)}-SAL-003-001`, date: t, salesId: 3, outletId: 11,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 30, price: 76000, disc: 5, line: 2166000 },
          { productId: 8, sku: 'PRD-008', name: 'Minyak Goreng Sawit Pouch 2L', unit: 'karton', qty: 20, price: 204000, disc: 0, line: 4080000 },
        ],
        subtotal: 6246000, taxRate: TAX_RATE, tax: 687060, total: 6933060,
        status: 'submitted', note: 'Order grosir beras dan minyak.', paid: false, metodePembayaran: 'transfer', bankId: 3, terminHari: 14, createdAt: nowStamp()
      },
      {
        id: 4, no: `ORD-${ymd(t)}-SAL-004-001`, date: t, salesId: 4, outletId: 16,
        items: [
          { productId: 18, sku: 'PRD-018', name: 'Tepung Terigu Serbaguna 1kg', unit: 'karton', qty: 25, price: 135000, disc: 0, line: 3375000 },
          { productId: 19, sku: 'PRD-019', name: 'Mie Instan Goreng Spesial', unit: 'karton', qty: 30, price: 118000, disc: 0, line: 3540000 },
        ],
        subtotal: 6915000, taxRate: TAX_RATE, tax: 760650, total: 7675650,
        status: 'submitted', note: 'Pengiriman ke gudang Godean.', paid: false, metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp()
      },
      {
        id: 5, no: `ORD-${ymd(t)}-SAL-005-001`, date: t, salesId: 5, outletId: 21,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 15, price: 76000, disc: 0, line: 1140000 },
          { productId: 9, sku: 'PRD-009', name: 'Gula Pasir Tebu Kristal 1kg', unit: 'karton', qty: 5, price: 340000, disc: 0, line: 1700000 },
        ],
        subtotal: 2840000, taxRate: TAX_RATE, tax: 312400, total: 3152400,
        status: 'submitted', note: 'Order sembako Wonosari.', paid: false, metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 6, no: `ORD-${ymd(t)}-SAL-006-001`, date: t, salesId: 6, outletId: 25,
        items: [
          { productId: 22, sku: 'PRD-022', name: 'Kopi Kapal Api Sachet 18gr', unit: 'karton', qty: 10, price: 185000, disc: 0, line: 1850000 },
          { productId: 24, sku: 'PRD-024', name: 'Rokok Surya Mild 16 btng', unit: 'bks', qty: 50, price: 24500, disc: 0, line: 1225000 },
        ],
        subtotal: 3075000, taxRate: TAX_RATE, tax: 338250, total: 3413250,
        status: 'submitted', note: 'Order rokok dan kopi.', paid: false, metodePembayaran: 'transfer', bankId: 1, createdAt: nowStamp()
      },
      {
        id: 7, no: `ORD-${ymd(t)}-SAL-007-001`, date: t, salesId: 7, outletId: 7,
        items: [
          { productId: 2, sku: 'PRD-002', name: 'Kopi Susu Espresso Sachet 20gr', unit: 'renceng', qty: 30, price: 14500, disc: 0, line: 435000 },
          { productId: 4, sku: 'PRD-004', name: 'Keripik Singkong Pedas Manis', unit: 'pcs', qty: 100, price: 8500, disc: 0, line: 850000 },
        ],
        subtotal: 1285000, taxRate: TAX_RATE, tax: 141350, total: 1426350,
        status: 'submitted', note: 'Minuman dan snack.', paid: false, metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 8, no: `ORD-${ymd(y)}-SAL-001-002`, date: y, salesId: 1, outletId: 1,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 20, price: 76000, disc: 0, line: 1520000 },
          { productId: 19, sku: 'PRD-019', name: 'Mie Instan Goreng Spesial', unit: 'karton', qty: 12, price: 118000, disc: 0, line: 1416000 },
        ],
        subtotal: 2936000, taxRate: TAX_RATE, tax: 322960, total: 3258960,
        status: 'approved', approvedBy: 'Budi Santoso', approvedAt: nowStamp(), paid: false, metodePembayaran: 'transfer', bankId: 1, createdAt: nowStamp()
      },
      {
        id: 9, no: `ORD-${ymd(y)}-SAL-002-002`, date: y, salesId: 2, outletId: 8,
        items: [
          { productId: 8, sku: 'PRD-008', name: 'Minyak Goreng Sawit Pouch 2L', unit: 'karton', qty: 25, price: 204000, disc: 3, line: 4947000 },
          { productId: 16, sku: 'PRD-016', name: 'Kecap Manis Kedelai Hitam 550ml', unit: 'karton', qty: 10, price: 228000, disc: 0, line: 2280000 },
        ],
        subtotal: 7227000, taxRate: TAX_RATE, tax: 794970, total: 8021970,
        status: 'processing', approvedBy: 'Budi Santoso', approvedAt: nowStamp(), paid: false, metodePembayaran: 'termin', terminHari: 30, createdAt: nowStamp()
      },
      {
        id: 10, no: `ORD-${ymd(y)}-SAL-003-001`, date: y, salesId: 3, outletId: 12,
        items: [
          { productId: 10, sku: 'PRD-010', name: 'Sabun Mandi Cair Refill 450ml', unit: 'pcs', qty: 30, price: 22500, disc: 0, line: 675000 },
          { productId: 11, sku: 'PRD-011', name: 'Sampo Anti Ketombe Menthol 160ml', unit: 'pcs', qty: 20, price: 27500, disc: 0, line: 550000 },
          { productId: 13, sku: 'PRD-013', name: 'Deterjen Bubuk Konsentrat 800gr', unit: 'karton', qty: 6, price: 195000, disc: 0, line: 1170000 },
        ],
        subtotal: 2395000, taxRate: TAX_RATE, tax: 263450, total: 2658450,
        status: 'shipped', shippedAt: nowStamp(), approvedBy: 'Sari Wulandari', paid: false, metodePembayaran: 'transfer', bankId: 3, createdAt: nowStamp()
      },
      {
        id: 11, no: `ORD-${ymd(d2)}-SAL-001-003`, date: d2, salesId: 1, outletId: 2,
        items: [
          { productId: 3, sku: 'PRD-003', name: 'Air Mineral Gunung 600ml', unit: 'karton', qty: 40, price: 46000, disc: 0, line: 1840000 },
          { productId: 2, sku: 'PRD-002', name: 'Kopi Susu Espresso Sachet 20gr', unit: 'renceng', qty: 50, price: 14500, disc: 0, line: 725000 },
        ],
        subtotal: 2565000, taxRate: TAX_RATE, tax: 282150, total: 2847150,
        status: 'completed', completedAt: nowStamp(), approvedBy: 'Budi Santoso', paid: true, paidAt: nowStamp(), paidMethod: 'Transfer BCA', metodePembayaran: 'transfer', bankId: 1, createdAt: nowStamp()
      },
      {
        id: 12, no: `ORD-${ymd(d2)}-SAL-004-001`, date: d2, salesId: 4, outletId: 17,
        items: [
          { productId: 14, sku: 'PRD-014', name: 'Pencuci Piring Jeruk Nipis 750ml', unit: 'pcs', qty: 48, price: 14000, disc: 0, line: 672000 },
          { productId: 15, sku: 'PRD-015', name: 'Pembersih Lantai Lavender 750ml', unit: 'pcs', qty: 36, price: 12500, disc: 0, line: 450000 },
        ],
        subtotal: 1122000, taxRate: TAX_RATE, tax: 123420, total: 1245420,
        status: 'completed', completedAt: nowStamp(), approvedBy: 'Sari Wulandari', paid: true, paidAt: nowStamp(), paidMethod: 'Tunai COD', metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 13, no: `ORD-${ymd(d3)}-SAL-003-002`, date: d3, salesId: 3, outletId: 13,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 50, price: 76000, disc: 5, line: 3610000 },
          { productId: 9, sku: 'PRD-009', name: 'Gula Pasir Tebu Kristal 1kg', unit: 'karton', qty: 10, price: 340000, disc: 0, line: 3400000 },
        ],
        subtotal: 7010000, taxRate: TAX_RATE, tax: 771100, total: 7781100,
        status: 'approved', approvedBy: 'Sari Wulandari', approvedAt: nowStamp(), paid: false, metodePembayaran: 'cicilan', createdAt: nowStamp()
      },
      {
        id: 14, no: `ORD-${ymd(d3)}-SAL-005-001`, date: d3, salesId: 5, outletId: 22,
        items: [
          { productId: 18, sku: 'PRD-018', name: 'Tepung Terigu Serbaguna 1kg', unit: 'karton', qty: 30, price: 135000, disc: 0, line: 4050000 },
          { productId: 29, sku: 'PRD-029', name: 'Sarden Kaleng 155gr', unit: 'pcs', qty: 60, price: 13500, disc: 0, line: 810000 },
        ],
        subtotal: 4860000, taxRate: TAX_RATE, tax: 534600, total: 5394600,
        status: 'completed', completedAt: nowStamp(), approvedBy: 'Aulia Rahma', paid: true, paidAt: nowStamp(), paidMethod: 'Transfer BRI', metodePembayaran: 'transfer', bankId: 2, createdAt: nowStamp()
      },
      {
        id: 15, no: `ORD-${ymd(d3)}-SAL-002-003`, date: d3, salesId: 2, outletId: 10,
        items: [
          { productId: 4, sku: 'PRD-004', name: 'Keripik Singkong Pedas Manis', unit: 'pcs', qty: 20, price: 8500, disc: 0, line: 170000 },
        ],
        subtotal: 170000, taxRate: TAX_RATE, tax: 18700, total: 188700,
        status: 'cancelled', cancelledBy: 'Budi Santoso', note: 'Dibatalkan oleh outlet karena kendala ruang simpan.', paid: false, metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 16, no: `ORD-${ymd(d5)}-SAL-004-002`, date: d5, salesId: 4, outletId: 18,
        items: [
          { productId: 18, sku: 'PRD-018', name: 'Tepung Terigu Serbaguna 1kg', unit: 'karton', qty: 30, price: 135000, disc: 12, line: 3564000 },
        ],
        subtotal: 3564000, taxRate: TAX_RATE, tax: 392040, total: 3956040,
        status: 'rejected', decidedBy: 'Sari Wulandari', rejectReason: 'Diskon 12% melebihi margin minimum yang diperkenankan kantor pusat.', paid: false, metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 17, no: `ORD-${ymd(d5)}-SAL-001-004`, date: d5, salesId: 1, outletId: 5,
        items: [
          { productId: 20, sku: 'PRD-020', name: 'Susu Kental Manis Putih 370gr', unit: 'karton', qty: 10, price: 465000, disc: 0, line: 4650000 },
        ],
        subtotal: 4650000, taxRate: TAX_RATE, tax: 511500, total: 5161500,
        status: 'approved', approvedBy: 'Budi Santoso', approvedAt: nowStamp(), paid: false, metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp()
      },
      {
        id: 18, no: `ORD-${ymd(d7)}-SAL-006-001`, date: d7, salesId: 6, outletId: 28,
        items: [
          { productId: 25, sku: 'PRD-025', name: 'Rokok Gudang Garam Merah', unit: 'bks', qty: 60, price: 25500, disc: 0, line: 1530000 },
          { productId: 26, sku: 'PRD-026', name: 'Permen Kopi Kapsul 40gr', unit: 'pcs', qty: 50, price: 6500, disc: 0, line: 325000 },
        ],
        subtotal: 1855000, taxRate: TAX_RATE, tax: 204050, total: 2059050,
        status: 'completed', completedAt: nowStamp(), approvedBy: 'Aulia Rahma', paid: true, paidAt: nowStamp(), paidMethod: 'Tunai', metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 19, no: `ORD-${ymd(d10)}-SAL-005-002`, date: d10, salesId: 5, outletId: 24,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 40, price: 76000, disc: 0, line: 3040000 },
        ],
        subtotal: 3040000, taxRate: TAX_RATE, tax: 334400, total: 3374400,
        status: 'approved', approvedBy: 'Aulia Rahma', approvedAt: nowStamp(), paid: false, metodePembayaran: 'transfer', bankId: 3, terminHari: 30, createdAt: nowStamp()
      },
      {
        id: 20, no: `ORD-${ymd(d14)}-SAL-003-003`, date: d14, salesId: 3, outletId: 14,
        items: [
          { productId: 12, sku: 'PRD-012', name: 'Pasta Gigi Fresh White 190gr', unit: 'pcs', qty: 30, price: 15500, disc: 0, line: 465000 },
          { productId: 10, sku: 'PRD-010', name: 'Sabun Mandi Cair Refill 450ml', unit: 'pcs', qty: 40, price: 22500, disc: 0, line: 900000 },
        ],
        subtotal: 1365000, taxRate: TAX_RATE, tax: 150150, total: 1515150,
        status: 'submitted', note: 'Order perlengkapan mandi.', paid: false, metodePembayaran: 'tunai', createdAt: nowStamp()
      },
    ],

    /* ============================================================
       10. FAKTUR & INVOICE PENAGIHAN (BILLING)
       ============================================================ */
    invoices: [
      {
        id: 1, no: `INV-${ymd(y)}-001`, orderId: 8, orderNo: `ORD-${ymd(y)}-SAL-001-002`, date: y,
        salesId: 1, outletId: 1,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 20, price: 76000, disc: 0, line: 1520000 },
          { productId: 19, sku: 'PRD-019', name: 'Mie Instan Goreng Spesial', unit: 'karton', qty: 12, price: 118000, disc: 0, line: 1416000 },
        ],
        subtotal: 2936000, taxRate: TAX_RATE, tax: 322960, total: 3258960,
        metodePembayaran: 'transfer', bankId: 1, terminHari: null, jatuhTempo: addDays(y, 7),
        status: 'belum_lunas', createdAt: nowStamp()
      },
      {
        id: 2, no: `INV-${ymd(y)}-002`, orderId: 9, orderNo: `ORD-${ymd(y)}-SAL-002-002`, date: y,
        salesId: 2, outletId: 8,
        items: [
          { productId: 8, sku: 'PRD-008', name: 'Minyak Goreng Sawit Pouch 2L', unit: 'karton', qty: 25, price: 204000, disc: 3, line: 4947000 },
          { productId: 16, sku: 'PRD-016', name: 'Kecap Manis Kedelai Hitam 550ml', unit: 'karton', qty: 10, price: 228000, disc: 0, line: 2280000 },
        ],
        subtotal: 7227000, taxRate: TAX_RATE, tax: 794970, total: 8021970,
        metodePembayaran: 'termin', bankId: null, terminHari: 30, jatuhTempo: addDays(y, 30),
        status: 'belum_lunas', createdAt: nowStamp()
      },
      {
        id: 3, no: `INV-${ymd(y)}-003`, orderId: 10, orderNo: `ORD-${ymd(y)}-SAL-003-001`, date: y,
        salesId: 3, outletId: 12,
        items: [
          { productId: 10, sku: 'PRD-010', name: 'Sabun Mandi Cair Refill 450ml', unit: 'pcs', qty: 30, price: 22500, disc: 0, line: 675000 },
          { productId: 11, sku: 'PRD-011', name: 'Sampo Anti Ketombe Menthol 160ml', unit: 'pcs', qty: 20, price: 27500, disc: 0, line: 550000 },
          { productId: 13, sku: 'PRD-013', name: 'Deterjen Bubuk Konsentrat 800gr', unit: 'karton', qty: 6, price: 195000, disc: 0, line: 1170000 },
        ],
        subtotal: 2395000, taxRate: TAX_RATE, tax: 263450, total: 2658450,
        metodePembayaran: 'transfer', bankId: 3, terminHari: null, jatuhTempo: addDays(y, 14),
        status: 'lunas', paidAt: nowStamp(), paidMethod: 'Transfer Mandiri', paidAmount: 2658450, createdAt: nowStamp()
      },
      {
        id: 4, no: `INV-${ymd(d2)}-001`, orderId: 11, orderNo: `ORD-${ymd(d2)}-SAL-001-003`, date: d2,
        salesId: 1, outletId: 2,
        items: [
          { productId: 3, sku: 'PRD-003', name: 'Air Mineral Gunung 600ml', unit: 'karton', qty: 40, price: 46000, disc: 0, line: 1840000 },
          { productId: 2, sku: 'PRD-002', name: 'Kopi Susu Espresso Sachet 20gr', unit: 'renceng', qty: 50, price: 14500, disc: 0, line: 725000 },
        ],
        subtotal: 2565000, taxRate: TAX_RATE, tax: 282150, total: 2847150,
        metodePembayaran: 'transfer', bankId: 1, terminHari: null, jatuhTempo: d2,
        status: 'lunas', paidAt: nowStamp(), paidMethod: 'Transfer BCA', paidAmount: 2847150, createdAt: nowStamp()
      },
      {
        id: 5, no: `INV-${ymd(d2)}-002`, orderId: 12, orderNo: `ORD-${ymd(d2)}-SAL-004-001`, date: d2,
        salesId: 4, outletId: 17,
        items: [
          { productId: 14, sku: 'PRD-014', name: 'Pencuci Piring Jeruk Nipis 750ml', unit: 'pcs', qty: 48, price: 14000, disc: 0, line: 672000 },
          { productId: 15, sku: 'PRD-015', name: 'Pembersih Lantai Lavender 750ml', unit: 'pcs', qty: 36, price: 12500, disc: 0, line: 450000 },
        ],
        subtotal: 1122000, taxRate: TAX_RATE, tax: 123420, total: 1245420,
        metodePembayaran: 'tunai', bankId: null, terminHari: null, jatuhTempo: d2,
        status: 'lunas', paidAt: nowStamp(), paidMethod: 'Tunai COD', paidAmount: 1245420, createdAt: nowStamp()
      },
      {
        id: 6, no: `INV-${ymd(d3)}-001`, orderId: 13, orderNo: `ORD-${ymd(d3)}-SAL-003-002`, date: d3,
        salesId: 3, outletId: 13,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 50, price: 76000, disc: 5, line: 3610000 },
          { productId: 9, sku: 'PRD-009', name: 'Gula Pasir Tebu Kristal 1kg', unit: 'karton', qty: 10, price: 340000, disc: 0, line: 3400000 },
        ],
        subtotal: 7010000, taxRate: TAX_RATE, tax: 771100, total: 7781100,
        metodePembayaran: 'cicilan', bankId: null, terminHari: null, jatuhTempo: null,
        installments: [
          { ke: 1, nominal: 2593700, jatuhTempo: addDays(d3, 30), status: 'lunas', paidAt: nowStamp(), paidMethod: 'Transfer Mandiri' },
          { ke: 2, nominal: 2593700, jatuhTempo: addDays(d3, 60), status: 'belum_bayar' },
          { ke: 3, nominal: 2593700, jatuhTempo: addDays(d3, 90), status: 'belum_bayar' },
        ],
        payments: [{ ts: nowStamp(), nominal: 2593700, metode: 'Transfer Mandiri', keterangan: 'Pembayaran DP / Angsuran 1' }],
        status: 'belum_lunas', createdAt: nowStamp()
      },
      {
        id: 7, no: `INV-${ymd(d3)}-002`, orderId: 14, orderNo: `ORD-${ymd(d3)}-SAL-005-001`, date: d3,
        salesId: 5, outletId: 22,
        items: [
          { productId: 18, sku: 'PRD-018', name: 'Tepung Terigu Serbaguna 1kg', unit: 'karton', qty: 30, price: 135000, disc: 0, line: 4050000 },
          { productId: 29, sku: 'PRD-029', name: 'Sarden Kaleng 155gr', unit: 'pcs', qty: 60, price: 13500, disc: 0, line: 810000 },
        ],
        subtotal: 4860000, taxRate: TAX_RATE, tax: 534600, total: 5394600,
        metodePembayaran: 'transfer', bankId: 2, terminHari: null, jatuhTempo: addDays(d3, 7),
        status: 'lunas', paidAt: nowStamp(), paidMethod: 'Transfer BRI', paidAmount: 5394600, createdAt: nowStamp()
      },
      {
        id: 8, no: `INV-${ymd(d5)}-001`, orderId: 17, orderNo: `ORD-${ymd(d5)}-SAL-001-004`, date: d5,
        salesId: 1, outletId: 5,
        items: [
          { productId: 20, sku: 'PRD-020', name: 'Susu Kental Manis Putih 370gr', unit: 'karton', qty: 10, price: 465000, disc: 0, line: 4650000 },
        ],
        subtotal: 4650000, taxRate: TAX_RATE, tax: 511500, total: 5161500,
        metodePembayaran: 'termin', bankId: null, terminHari: 14, jatuhTempo: addDays(d5, 14),
        status: 'belum_lunas', createdAt: nowStamp()
      },
    ],

    /* ============================================================
       11. PENAWARAN HARGA (QUOTATIONS - 12 Dokumen)
       ============================================================ */
    quotations: [
      {
        id: 1, no: `QUO-${ymd(t)}-SAL-001-001`, date: t, salesId: 1, outletId: 3,
        items: [
          { productId: 1, sku: 'PRD-001', name: 'Teh Kotak Jasmine 250ml', unit: 'karton', qty: 30, price: 72000, disc: 3, line: 2095200 },
          { productId: 5, sku: 'PRD-005', name: 'Biskuit Coklat Sandwich 120gr', unit: 'karton', qty: 15, price: 92000, disc: 0, line: 1380000 },
        ],
        subtotal: 3475200, discTotal: 64800, totalAfterDisc: 3475200, taxRate: TAX_RATE, tax: 382272, total: 3857472,
        status: 'draft', validUntil: addDays(t, 14), note: 'Penawaran paket bundling awal bulan.',
        metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp()
      },
      {
        id: 2, no: `QUO-${ymd(t)}-SAL-002-001`, date: t, salesId: 2, outletId: 6,
        items: [
          { productId: 8, sku: 'PRD-008', name: 'Minyak Goreng Sawit Pouch 2L', unit: 'karton', qty: 40, price: 204000, disc: 15, line: 6936000 },
        ],
        subtotal: 8160000, discTotal: 1224000, totalAfterDisc: 6936000, taxRate: TAX_RATE, tax: 762960, total: 7698960,
        status: 'pending_approval', validUntil: addDays(t, 7), note: 'Diskon 15% untuk pembukaan minimarket cabang baru (perlu izin supervisor).',
        metodePembayaran: 'transfer', bankId: 1, createdAt: nowStamp()
      },
      {
        id: 3, no: `QUO-${ymd(t)}-SAL-003-001`, date: t, salesId: 3, outletId: 11,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 50, price: 76000, disc: 5, line: 3610000 },
        ],
        subtotal: 3800000, discTotal: 190000, totalAfterDisc: 3610000, taxRate: TAX_RATE, tax: 397100, total: 4007100,
        status: 'sent', validUntil: addDays(t, 10), note: 'Diskon 5% grosir beras 50 sak.', metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 4, no: `QUO-${ymd(t)}-SAL-004-001`, date: t, salesId: 4, outletId: 16,
        items: [
          { productId: 18, sku: 'PRD-018', name: 'Tepung Terigu Serbaguna 1kg', unit: 'karton', qty: 50, price: 135000, disc: 0, line: 6750000 },
        ],
        subtotal: 6750000, discTotal: 0, totalAfterDisc: 6750000, taxRate: TAX_RATE, tax: 742500, total: 7492500,
        status: 'draft', validUntil: addDays(t, 7), note: 'Penawaran tepung terigu 50 karton.', metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp()
      },
      {
        id: 5, no: `QUO-${ymd(y)}-SAL-001-002`, date: y, salesId: 1, outletId: 2,
        items: [
          { productId: 2, sku: 'PRD-002', name: 'Kopi Susu Espresso Sachet 20gr', unit: 'renceng', qty: 100, price: 14500, disc: 0, line: 1450000 },
        ],
        subtotal: 1450000, discTotal: 0, totalAfterDisc: 1450000, taxRate: TAX_RATE, tax: 159500, total: 1609500,
        status: 'sent', validUntil: addDays(t, 7), note: 'Dokumen penawaran telah dikirim via WhatsApp ke pemilik.', metodePembayaran: 'transfer', bankId: 1, createdAt: nowStamp()
      },
      {
        id: 6, no: `QUO-${ymd(y)}-SAL-003-001`, date: y, salesId: 3, outletId: 11,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 40, price: 76000, disc: 4, line: 2918400 },
        ],
        subtotal: 3040000, discTotal: 121600, totalAfterDisc: 2918400, taxRate: TAX_RATE, tax: 321024, total: 3239424,
        status: 'approved', validUntil: addDays(t, 10), note: 'Diskon 4% disetujui Supervisor — siap konversi ke order.', metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 7, no: `QUO-${ymd(y)}-SAL-005-001`, date: y, salesId: 5, outletId: 21,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 30, price: 76000, disc: 3, line: 2209200 },
        ],
        subtotal: 2280000, discTotal: 68400, totalAfterDisc: 2211600, taxRate: TAX_RATE, tax: 243276, total: 2454876,
        status: 'approved', validUntil: addDays(t, 7), note: 'Diskon 3% grosir beras Wonosari.', metodePembayaran: 'transfer', bankId: 2, createdAt: nowStamp()
      },
      {
        id: 8, no: `QUO-${ymd(d5)}-SAL-004-001`, date: d5, salesId: 4, outletId: 18,
        items: [
          { productId: 18, sku: 'PRD-018', name: 'Tepung Terigu Serbaguna 1kg', unit: 'karton', qty: 50, price: 135000, disc: 0, line: 6750000 },
        ],
        subtotal: 6750000, discTotal: 0, totalAfterDisc: 6750000, taxRate: TAX_RATE, tax: 742500, total: 7492500,
        status: 'expired', validUntil: y, note: 'Masa berlaku penawaran berakhir sebelum konfirmasi.', metodePembayaran: 'termin', terminHari: 14, createdAt: nowStamp()
      },
      {
        id: 9, no: `QUO-${ymd(d5)}-SAL-006-001`, date: d5, salesId: 6, outletId: 25,
        items: [
          { productId: 24, sku: 'PRD-024', name: 'Rokok Surya Mild 16 btng', unit: 'bks', qty: 100, price: 24500, disc: 0, line: 2450000 },
          { productId: 25, sku: 'PRD-025', name: 'Rokok Gudang Garam Merah', unit: 'bks', qty: 100, price: 25500, disc: 0, line: 2550000 },
        ],
        subtotal: 5000000, discTotal: 0, totalAfterDisc: 5000000, taxRate: TAX_RATE, tax: 550000, total: 5550000,
        status: 'converted', validUntil: addDays(t, 3), note: 'Sudah dikonversi menjadi order.', metodePembayaran: 'tunai', createdAt: nowStamp()
      },
      {
        id: 10, no: `QUO-${ymd(d7)}-SAL-002-002`, date: d7, salesId: 2, outletId: 7,
        items: [
          { productId: 5, sku: 'PRD-005', name: 'Biskuit Coklat Sandwich 120gr', unit: 'karton', qty: 20, price: 92000, disc: 10, line: 1656000 },
        ],
        subtotal: 1840000, discTotal: 184000, totalAfterDisc: 1656000, taxRate: TAX_RATE, tax: 182160, total: 1838160,
        status: 'rejected', validUntil: d7, note: 'Ditolak karena target diskon terlalu tinggi.', metodePembayaran: 'termin', terminHari: 7, createdAt: nowStamp()
      },
      {
        id: 11, no: `QUO-${ymd(d10)}-SAL-007-001`, date: d10, salesId: 7, outletId: 10,
        items: [
          { productId: 3, sku: 'PRD-003', name: 'Air Mineral Gunung 600ml', unit: 'karton', qty: 50, price: 46000, disc: 0, line: 2300000 },
          { productId: 22, sku: 'PRD-022', name: 'Kopi Kapal Api Sachet 18gr', unit: 'karton', qty: 5, price: 185000, disc: 0, line: 925000 },
        ],
        subtotal: 3225000, discTotal: 0, totalAfterDisc: 3225000, taxRate: TAX_RATE, tax: 354750, total: 3579750,
        status: 'pending_approval', validUntil: addDays(d10, 5), note: 'Permintaan diskon 8% untuk order air mineral.', metodePembayaran: 'transfer', bankId: 1, createdAt: nowStamp()
      },
      {
        id: 12, no: `QUO-${ymd(d14)}-SAL-005-002`, date: d14, salesId: 5, outletId: 23,
        items: [
          { productId: 7, sku: 'PRD-007', name: 'Beras Pandan Wangi Super 5kg', unit: 'sak', qty: 20, price: 76000, disc: 0, line: 1520000 },
          { productId: 9, sku: 'PRD-009', name: 'Gula Pasir Tebu Kristal 1kg', unit: 'karton', qty: 5, price: 340000, disc: 0, line: 1700000 },
        ],
        subtotal: 3220000, discTotal: 0, totalAfterDisc: 3220000, taxRate: TAX_RATE, tax: 354200, total: 3574200,
        status: 'draft', validUntil: addDays(d14, 10), note: 'Penawaran sembako awal bulan.', metodePembayaran: 'tunai', createdAt: nowStamp()
      },
    ],

    /* ============================================================
       12. AUDIT LAPANGAN FISIK TOKO (12 Data Audit)
       ============================================================ */
    audits: [
      { id: 1, no: `AUD-${ymd(y)}-001`, date: y, time: '09:15', salesId: 1, outletId: 1,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 3 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 2 },
        ],
        score: 92,
        stocks: [{ productId: 1, name: 'Teh Kotak 250ml', systemStock: 1200, actualStock: 1200, diff: 0 }],
        photos: [], note: 'Toko sangat rapi, display produk prima.',
        status: 'submitted', categoryId: 1, prospectStatus: 'Disetujui', createdAt: `${y} 09:15:00` },
      { id: 2, no: `AUD-${ymd(y)}-002`, date: y, time: '11:30', salesId: 2, outletId: 6,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 2 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 2 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 1 },
        ],
        score: 73,
        stocks: [{ productId: 1, name: 'Teh Kotak 250ml', systemStock: 1200, actualStock: 1150, diff: -50 }],
        photos: [], note: 'POSM sudah usai, perlu materi promosi baru.',
        status: 'submitted', categoryId: 2, prospectStatus: 'Prospek', createdAt: `${y} 11:30:00` },
      { id: 3, no: `AUD-${ymd(y)}-003`, date: y, time: '14:20', salesId: 3, outletId: 8,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 2 },
          { item: 'Kerapian penataan produk', score: 2 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 2 },
        ],
        score: 84,
        stocks: [{ productId: 8, name: 'Minyak Goreng 1L', systemStock: 260, actualStock: 255, diff: -5 }],
        photos: [], note: 'Peminatan tinggi pada paket grosir minyak & gula.',
        status: 'submitted', categoryId: 1, prospectStatus: 'Negosiasi', createdAt: `${y} 14:20:00` },
      { id: 4, no: `AUD-${ymd(t)}-001`, date: t, time: '08:45', salesId: 1, outletId: 3,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 2 },
          { item: 'Kondisi fisik toko', score: 2 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 2 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 1 },
        ],
        score: 68,
        stocks: [{ productId: 5, name: 'Biskuit Coklat 120gr', systemStock: 380, actualStock: 350, diff: -30 }],
        photos: [], note: 'Stok menipis di rak depan, perlu re-order segera.',
        status: 'submitted', categoryId: 3, prospectStatus: 'Prospek', createdAt: `${t} 08:45:00` },
      { id: 5, no: `AUD-${ymd(t)}-002`, date: t, time: '10:15', salesId: 2, outletId: 5,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 2 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 3 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 2 },
        ],
        score: 80,
        stocks: [{ productId: 7, name: 'Beras Pandan Wangi Super 5kg', systemStock: 90, actualStock: 88, diff: -2 }],
        photos: [], note: 'Pemilik toko menyambut baik penawaran termin pembayaran.',
        status: 'submitted', categoryId: 2, prospectStatus: 'Negosiasi', createdAt: `${t} 10:15:00` },
      { id: 6, no: `AUD-${ymd(t)}-003`, date: t, time: '13:00', salesId: 3, outletId: 11,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 3 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 3 },
        ],
        score: 95,
        stocks: [{ productId: 7, name: 'Beras Pandan Wangi Super 5kg', systemStock: 150, actualStock: 148, diff: -2 }],
        photos: [], note: 'Toko prima, display rapi, stok mencukupi.',
        status: 'submitted', categoryId: 1, prospectStatus: 'Disetujui', createdAt: `${t} 13:00:00` },
      { id: 7, no: `AUD-${ymd(d2)}-001`, date: d2, time: '09:30', salesId: 4, outletId: 16,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 2 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 2 },
          { item: 'Kerapian penataan produk', score: 2 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 1 },
        ],
        score: 62,
        stocks: [{ productId: 18, name: 'Tepung Terigu 1kg', systemStock: 200, actualStock: 180, diff: -20 }],
        photos: [], note: 'POSM kurang, perlu tambah materi promosi.',
        status: 'submitted', categoryId: 3, prospectStatus: 'Prospek', createdAt: `${d2} 09:30:00` },
      { id: 8, no: `AUD-${ymd(d2)}-002`, date: d2, time: '11:45', salesId: 4, outletId: 17,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 3 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 2 },
        ],
        score: 88,
        stocks: [{ productId: 14, name: 'Pencuci Piring Jeruk Nipis', systemStock: 400, actualStock: 395, diff: -5 }],
        photos: [], note: 'Toko rapi dan stok aman.',
        status: 'submitted', categoryId: 2, prospectStatus: 'Negosiasi', createdAt: `${d2} 11:45:00` },
      { id: 9, no: `AUD-${ymd(d3)}-001`, date: d3, time: '10:00', salesId: 5, outletId: 21,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 2 },
          { item: 'Kerapian penataan produk', score: 3 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 2 },
        ],
        score: 84,
        stocks: [{ productId: 7, name: 'Beras Pandan Wangi Super 5kg', systemStock: 80, actualStock: 78, diff: -2 }],
        photos: [], note: 'Stok mencukupi, pelanggan setia.',
        status: 'submitted', categoryId: 2, prospectStatus: 'Negosiasi', createdAt: `${d3} 10:00:00` },
      { id: 10, no: `AUD-${ymd(d3)}-002`, date: d3, time: '14:30', salesId: 6, outletId: 25,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 2 },
          { item: 'Kondisi fisik toko', score: 2 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 2 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 1 },
        ],
        score: 65,
        stocks: [{ productId: 24, name: 'Rokok Surya Mild', systemStock: 300, actualStock: 280, diff: -20 }],
        photos: [], note: 'Toko kurang rapi, perlu perbaikan layout.',
        status: 'submitted', categoryId: 3, prospectStatus: 'Prospek', createdAt: `${d3} 14:30:00` },
      { id: 11, no: `AUD-${ymd(d5)}-001`, date: d5, time: '08:00', salesId: 7, outletId: 7,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 3 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 3 },
        ],
        score: 97,
        stocks: [{ productId: 2, name: 'Kopi Susu Espresso', systemStock: 500, actualStock: 500, diff: 0 }],
        photos: [], note: 'Toko terbaik di area, standar prima.',
        status: 'submitted', categoryId: 1, prospectStatus: 'Disetujui', createdAt: `${d5} 08:00:00` },
      { id: 12, no: `AUD-${ymd(d5)}-002`, date: d5, time: '10:30', salesId: 1, outletId: 2,
        checklist: [
          { item: 'Kebersihan area pajangan produk', score: 3 },
          { item: 'Kondisi fisik toko', score: 3 },
          { item: 'Pencahayaan & sirkulasi udara', score: 3 },
          { item: 'Kerapian penataan produk', score: 2 },
          { item: 'Ketersediaan materi promosi (POSM)', score: 2 },
        ],
        score: 86,
        stocks: [{ productId: 3, name: 'Air Mineral Gunung', systemStock: 600, actualStock: 590, diff: -10 }],
        photos: [], note: 'Display POSM sudah terpasang.',
        status: 'submitted', categoryId: 2, prospectStatus: 'Negosiasi', createdAt: `${d5} 10:30:00` },
    ],

    /* ============================================================
       13. PIPELINE PROSPEK TOKO BARU (12 Toko Prospek)
       ============================================================ */
    prospects: [
      { id: 1, name: 'Toko Mangga Dua', owner: 'Pak Aan', phone: '081390000001', address: 'Jl. Kaliurang KM 3 No. 12', areaId: 1, salesId: 1, categoryId: 2, status: 'Prospek', note: 'Menunggu konfirmasi pemilik untuk jadwal pengiriman.', createdAt: `${y} 08:30:00` },
      { id: 2, name: 'Warung Melati', owner: 'Bu Wati', phone: '081390000002', address: 'Jl. Imogiri No. 20', areaId: 3, salesId: 3, categoryId: 1, status: 'Negosiasi', note: 'Minat besar pada produk sembako dan minyak goreng.', createdAt: `${y} 09:45:00` },
      { id: 3, name: 'Toko Sumber Rezeki', owner: 'Pak Hendra', phone: '081390000003', address: 'Jl. Gejayan No. 45', areaId: 2, salesId: 2, categoryId: 1, status: 'Disetujui', note: 'Akun prospek telah disetujui untuk aktivasi sebagai outlet resmi.', createdAt: `${y} 13:10:00` },
      { id: 4, name: 'Kios Berkah Jaya', owner: 'Bu Rahma', phone: '081390000004', address: 'Jl. Malioboro No. 88', areaId: 1, salesId: 1, categoryId: 3, status: 'Prospek', note: 'Sedang mengevaluasi perputaran barang kompetitor.', createdAt: `${t} 08:00:00` },
      { id: 5, name: 'Warung Barokah 2', owner: 'Pak Subagyo', phone: '081390000005', address: 'Jl. Parangtritis KM 6', areaId: 3, salesId: 3, categoryId: 2, status: 'Negosiasi', note: 'Meminta diskon tambahan untuk pembelanjaan awal.', createdAt: `${t} 10:30:00` },
      { id: 6, name: 'Toko Sinar Abadi', owner: 'Pak Budi', phone: '081390000006', address: 'Jl. Wates KM 12, Sentolo', areaId: 4, salesId: 4, categoryId: 2, status: 'Prospek', note: 'Baru buka toko, butuh katalog produk.', createdAt: `${t} 11:15:00` },
      { id: 7, name: 'Minimarket Indah Permai', owner: 'Ibu Lestari', phone: '081390000007', address: 'Jl. Seturan Raya No. 50', areaId: 2, salesId: 2, categoryId: 1, status: 'Negosiasi', note: 'Minat pada produk rokok dan minuman.', createdAt: `${y} 15:20:00` },
      { id: 8, name: 'Toko Mandiri Bersama', owner: 'Pak Andi', phone: '081390000008', address: 'Jl. Magelang KM 15, Mlati', areaId: 4, salesId: 4, categoryId: 3, status: 'Prospek', note: 'Survey lokasi selesai, menunggu keputusan pemilik.', createdAt: `${t} 09:00:00` },
      { id: 9, name: 'Warung Rezeki Bu Sri', owner: 'Bu Sri', phone: '081390000009', address: 'Jl. Parangtritis KM 10', areaId: 3, salesId: 3, categoryId: 2, status: 'Negosiasi', note: 'Meminta pembiayaan pengiriman gratis.', createdAt: `${d2} 10:00:00` },
      { id: 10, name: 'Toko Harapan Makmur', owner: 'Pak Joko', phone: '081390000010', address: 'Jl. Solo No. 80, Klaten', areaId: 6, salesId: 6, categoryId: 1, status: 'Prospek', note: 'Baru beroperasi, membutuhkan daftar produk.', createdAt: `${d3} 09:00:00` },
      { id: 11, name: 'Minimarket Sumber Rejeki', owner: 'Ibu Wulan', phone: '081390000011', address: 'Jl. Godean KM 10', areaId: 4, salesId: 4, categoryId: 1, status: 'Disetujui', note: 'Sudah disetujui, siap aktivasi outlet.', createdAt: `${d5} 11:00:00` },
      { id: 12, name: 'Toko Cahaya Baru', owner: 'Pak Rudi', phone: '081390000012', address: 'Jl. Wates KM 5, Sentolo', areaId: 4, salesId: 4, categoryId: 3, status: 'Cold Lead', note: 'Baru terdata survey, belum dikontak.', createdAt: `${d7} 14:00:00` },
    ],

    /* ============================================================
       14. GPS CHECKIN & TRACKING SALES
       ============================================================ */
    checkins: [
      { id: 1, date: t, ts: nowStamp(), salesId: 1, outletId: 1, lat: -7.7942, lng: 110.3661, distM: 18, areaOk: true, note: 'Checkin aman dalam radius toko' },
      { id: 2, date: t, ts: nowStamp(), salesId: 2, outletId: 6, lat: -7.7712, lng: 110.4085, distM: 25, areaOk: true, note: 'Kunjungan rutin pagi hari' },
      { id: 3, date: y, ts: nowStamp(), salesId: 3, outletId: 11, lat: -7.8891, lng: 110.3294, distM: 42, areaOk: true, note: 'Selesai penagihan lunas' },
      { id: 4, date: y, ts: nowStamp(), salesId: 4, outletId: 16, lat: -7.7694, lng: 110.3012, distM: 30, areaOk: true, note: 'Restock sembako selesai' },
      { id: 5, date: d2, ts: nowStamp(), salesId: 5, outletId: 21, lat: -7.8050, lng: 110.5980, distM: 15, areaOk: true, note: 'Order sembako Wonosari' },
      { id: 6, date: d2, ts: nowStamp(), salesId: 6, outletId: 25, lat: -7.7180, lng: 110.5980, distM: 22, areaOk: true, note: 'Order rokok dan kopi' },
      { id: 7, date: d3, ts: nowStamp(), salesId: 7, outletId: 7, lat: -7.7681, lng: 110.3889, distM: 10, areaOk: true, note: 'Audit dan restock Toko Berkah' },
      { id: 8, date: d5, ts: nowStamp(), salesId: 1, outletId: 2, lat: -7.8185, lng: 110.3702, distM: 35, areaOk: true, note: 'Transfer lunas order air mineral' },
    ],

    violations: [
      { id: 1, date: d3, ts: nowStamp(), salesId: 3, outletId: 13, lat: -7.8724, lng: 110.3842, distM: 210, areaOk: false, note: 'Checkin di luar radius tolerance 200m', status: 'pelanggaran' },
      { id: 2, date: d5, ts: nowStamp(), salesId: 6, outletId: 26, lat: -7.7050, lng: 110.5020, distM: 450, areaOk: false, note: 'Sales tidak berada di area tujuan outlet', status: 'pelanggaran' },
    ],

    notifications: [
      { id: 1, userId: 2, title: 'Penagihan Piutang', message: 'Outlet Toko Maju Makmur Bantul memiliki invoice tempo yang telah jatuh tempo.', type: 'warning', read: false, createdAt: nowStamp() },
      { id: 2, userId: 1, title: 'Quotation Menunggu Approval', message: 'Minimarket Seturan Sejahtera mengajukan diskon 15%, perlu persetujuan supervisor.', type: 'info', read: false, createdAt: nowStamp() },
      { id: 3, userId: 5, title: 'GPS Pelanggaran', message: 'Terdeteksi checkin di luar radius outlet oleh sales lapangan.', type: 'error', read: false, createdAt: nowStamp() },
      { id: 4, userId: 3, title: 'Tugas Baru', message: 'Anda memiliki 3 tugas baru untuk hari ini.', type: 'success', read: true, createdAt: nowStamp() },
      { id: 5, userId: 4, title: 'Pembayaran Masuk', message: 'Pembayaran invoice INV-003 telah diterima via Transfer Mandiri.', type: 'success', read: true, createdAt: nowStamp() },
    ],

    syncQueue: [],
  };
}
