import { formatRupiah, todayISO } from './helpers';
import { getActiveCompanyBanks, resolveInvoiceBankIds } from './invoiceUtils';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* BR-INV & BR-INV-006: Dokumen cetak/PDF invoice dengan multi-rekening perusahaan & jatuh tempo */
export function openInvoicePdf(invoice, db) {
  const comp = (db.companies || [])[0] || {};
  const outlet = (db.outlets || []).find((o) => o.id === invoice.outletId) || {};
  const sales = (db.sales || []).find((s) => s.id === invoice.salesId) || {};

  const companyBanks = getActiveCompanyBanks(db);
  const selectedIds = resolveInvoiceBankIds(invoice, db);
  const selectedBanks = companyBanks.filter((b) =>
    selectedIds.some((id) => String(id) === String(b.id))
  );

  const dueDate = invoice.jatuhTempo || invoice.due_date || null;

  /* Syarat pembayaran */
  const syaratText = (() => {
    switch (invoice.metodePembayaran) {
      case 'transfer': {
        if (selectedBanks.length === 1) {
          const b = selectedBanks[0];
          return `Transfer ke <b>${esc(b.nama)}</b>, No. Rekening <b>${esc(b.noRekening)}</b> a.n. <b>${esc(b.atasNama)}</b>.`;
        }
        if (selectedBanks.length > 1) {
          return `Transfer ke salah satu <b>Rekening Pembayaran Perusahaan</b> yang tercantum di bawah dokumen ini.`;
        }
        return 'Transfer bank.';
      }
      case 'termin': {
        const viaT = invoice.viaPembayaran === 'transfer' ? 'transfer bank' : 'tunai';
        const viaB = invoice.viaPembayaran === 'transfer'
          ? (companyBanks.find((x) => x.id === invoice.viaBankId) || {}) : {};
        return `Pembayaran tempo <b>${invoice.terminHari || 14} hari</b> via <b>${viaT}</b>`
          + (viaB.nama ? ` ke <b>${esc(viaB.nama)}</b> No. <b>${esc(viaB.noRekening)}</b>` : '')
          + ` — jatuh tempo <b>${esc(dueDate || '-')}</b>.`;
      }
      case 'cicilan':
        return `Pembayaran mengangsur sesuai jadwal angsuran di bawah${invoice.cicilanDP > 0 ? ` (DP ${formatRupiah(invoice.cicilanDP)})` : ''}.`;
      case 'konsinyasi':
        return `Konsinyasi ${invoice.konsinyasiHari || 30} hari — penagihan mengikuti hasil stock-take (jumlah barang terjual). Pembayaran via <b>${invoice.viaPembayaran === 'transfer' ? 'transfer bank' : 'tunai'}</b>.`;
      default:
        return 'Pembayaran tunai saat penyerahan barang.';
    }
  })();

  /* Status stamp */
  const isOverdue = invoice.status === 'belum_lunas' && dueDate && dueDate < todayISO();
  const statusText = invoice.status === 'lunas' ? 'LUNAS'
    : invoice.status === 'dibatalkan' ? 'DIBATALKAN'
      : (isOverdue ? 'JATUH TEMPO' : 'BELUM LUNAS');
  const statusColor = invoice.status === 'lunas' ? '#16a34a'
    : invoice.status === 'dibatalkan' ? '#64748b'
      : (isOverdue ? '#dc2626' : '#f59e0b');

  /* Baris item */
  const rows = (invoice.items || []).map((it, ix) => `
    <tr>
      <td class="c">${ix + 1}</td>
      <td>${esc(it.name)}<br/><small>${esc(it.sku)}</small></td>
      <td class="c">${it.qty} ${esc(it.unit)}</td>
      <td class="r">${formatRupiah(it.price)}</td>
      <td class="r">${formatRupiah(it.line)}</td>
    </tr>`).join('');

  /* Jadwal angsuran (cicilan) */
  const installmentTable = invoice.installments ? `
    <h3>Jadwal Angsuran</h3>
    <table>
      <thead><tr><th>Angsuran</th><th class="r">Nominal</th><th class="c">Jatuh Tempo</th><th class="c">Metode / Petugas</th><th class="c">Status</th></tr></thead>
      <tbody>
        ${invoice.installments.map((a) => `
          <tr>
            <td>Angsuran ${a.ke}</td>
            <td class="r">${formatRupiah(a.nominal)}</td>
            <td class="c">${esc(a.jatuhTempo)}</td>
            <td class="c">${a.status === 'lunas' ? `${esc(a.paidMethod || '-')}${a.petugasNama ? ` (${esc(a.petugasNama)})` : ''}` : '-'}</td>
            <td class="c">${a.status === 'lunas' ? '<b style="color:#16a34a">LUNAS</b>' : 'Belum Bayar'}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

  /* Riwayat pembayaran lengkap dengan Petugas Finance & Catatan */
  const paymentTable = (invoice.payments || []).length ? `
    <h3>Riwayat Pembayaran</h3>
    <table>
      <thead>
        <tr>
          <th class="c">Waktu</th>
          <th>Keterangan &amp; Catatan</th>
          <th class="c">Metode</th>
          <th class="c">Petugas Finance</th>
          <th class="r">Nominal</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.payments.map((p) => {
          const note = p.catatan_pembayaran || p.catatanPembayaran || '';
          const resi = p.noResi ? `Resi: ${esc(p.noResi)}` : '';
          const buktiTag = p.bukti_pembayaran ? '[Bukti Terlampir]' : '';
          const subInfo = [resi, note ? esc(note) : '', buktiTag].filter(Boolean).join(' • ');
          return `
          <tr>
            <td class="c">${esc(p.ts)}</td>
            <td>
              <b>${esc(p.keterangan || 'Pembayaran')}</b>
              ${subInfo ? `<br/><small style="color:#475569">${subInfo}</small>` : ''}
            </td>
            <td class="c">${esc(p.metode)}</td>
            <td class="c">${esc(p.petugasNama || p.recordedBy || '-')}</td>
            <td class="r">${formatRupiah(p.nominal)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>` : '';

  /* BR-INV-006: Daftar multi-rekening aktif milik perusahaan sesuai pilihan pada invoice */
  const bankFooter = selectedBanks.length ? `
    <div class="banks">
      <b>Rekening Pembayaran Resmi Perusahaan:</b><br/>
      ${selectedBanks.map((b) => `• <b>${esc(b.nama)}</b> — No. Rek: <b>${esc(b.noRekening)}</b> a.n. ${esc(b.atasNama)}`).join('<br/>')}
    </div>` : '';

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/>
<title>Invoice ${esc(invoice.no)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;font-size:12.5px;margin:32px;max-width:780px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #dc2626;padding-bottom:14px}
  .comp small{color:#64748b}
  .title{text-align:right}
  .title h1{margin:0;color:#dc2626;font-size:26px;letter-spacing:2px}
  .meta{font-size:11.5px;text-align:right;color:#334155;line-height:1.6}
  .to{margin:18px 0 4px;padding:10px 14px;background:#fef2f2;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11.5px}
  th,td{border:1px solid #cbd5e1;padding:7px 9px}
  th{background:#f1f5f9;text-align:left}
  .c{text-align:center}.r{text-align:right}
  .totals{margin-top:14px;width:310px;margin-left:auto;font-size:12px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0}
  .grand{font-weight:800;font-size:15px;color:#dc2626;border-top:2px solid #dc2626;margin-top:4px;padding-top:6px}
  .stamp{display:inline-block;padding:6px 18px;border:3px solid ${statusColor};color:${statusColor};border-radius:8px;font-size:18px;font-weight:800;letter-spacing:2px;margin:10px 0}
  .banks{margin-top:14px;padding:10px 14px;background:#f8fafc;border:1px dashed #94a3b8;border-radius:8px;font-size:11px;line-height:1.6}
  .tnc{margin-top:16px;font-size:11px;color:#334155}
  .sign{display:flex;justify-content:space-between;margin-top:56px;text-align:center;font-size:11.5px}
  .foot{margin-top:28px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:10px;color:#94a3b8;text-align:center}
  @media print{body{margin:12mm}}
</style></head><body>
  <div class="head">
    <div class="comp">
      ${comp.logo ? `<img src="${comp.logo}" style="max-height:56px;display:block;margin-bottom:6px"/>` : ''}
      <div style="font-size:17px;font-weight:800">${esc(comp.name)}</div>
      <small>${esc(comp.address)}</small><br/>
      <small>${esc(comp.phone)} • ${esc(comp.email)}</small><br/>
      <small>NPWP: ${esc(comp.npwp || '-')}</small>
    </div>
    <div class="title">
      <h1>INVOICE</h1>
      <div class="meta">
        No: <b>${esc(invoice.no)}</b><br/>
        Tanggal Terbit: ${esc(invoice.date)}<br/>
        Jatuh Tempo: <b>${esc(dueDate || '-')}</b><br/>
        Order: <b>${esc(invoice.orderNo || '-')}</b>
      </div>
    </div>
  </div>

  <div class="to">
    <b>Kepada Yth.</b><br/>
    ${esc(outlet.name)} — ${esc(outlet.owner || '')}<br/>
    ${esc(outlet.address || '')}${outlet.phone ? ` • ${esc(outlet.phone)}` : ''}
  </div>

  <div class="stamp">${statusText}</div>

  <table>
    <thead><tr><th>#</th><th>Produk</th><th class="c">Qty</th><th class="r">Harga</th><th class="r">Jumlah</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><b>${formatRupiah(invoice.subtotal)}</b></div>
    <div><span>PPN ${Math.round((invoice.taxRate || 0.11) * 100)}%</span><b>${formatRupiah(invoice.tax)}</b></div>
    <div class="grand"><span>TOTAL</span><span>${formatRupiah(invoice.total)}</span></div>
  </div>

  <div class="tnc">
    <b>Syarat Pembayaran:</b> ${syaratText}<br/>
    ${dueDate ? `<b>Batas Jatuh Tempo Pembayaran:</b> ${esc(dueDate)}<br/>` : ''}
    ${invoice.status === 'lunas' ? `<b>Pembayaran telah diterima lunas — ${esc(invoice.paidAt || '')}${invoice.paidMethod ? ` (${esc(invoice.paidMethod)})` : ''}.</b>` : ''}
  </div>

  ${installmentTable}
  ${paymentTable}
  ${bankFooter}

  <div class="sign">
    <div>Hormat kami,<br/><br/><br/><b>${esc(sales.name || '-')}</b><br/>Sales</div>
    <div>Diterima oleh,<br/><br/><br/><b>${esc(outlet.name)}</b><br/>Pelanggan</div>
  </div>

  <div class="foot">Dokumen digenerate otomatis oleh Web SFA — ${esc(comp.name)}.</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=860,height=940');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/* Bagikan ringkasan invoice ke WhatsApp (menyertakan jatuh tempo & rekening perusahaan terpilih) */
export function shareInvoiceWhatsApp(invoice, db) {
  const outlet = (db.outlets || []).find((o) => o.id === invoice.outletId) || {};
  const companyBanks = getActiveCompanyBanks(db);
  const selectedIds = resolveInvoiceBankIds(invoice, db);
  const selectedBanks = companyBanks.filter((b) =>
    selectedIds.some((id) => String(id) === String(b.id))
  );
  const dueDate = invoice.jatuhTempo || invoice.due_date || null;

  const bankLines = selectedBanks.length
    ? ['*Rekening Pembayaran:*', ...selectedBanks.map((b) => `- ${b.nama}: ${b.noRekening} (a.n. ${b.atasNama})`)]
    : [];

  const msg = [
    `*INVOICE ${invoice.no}*`,
    `Kepada: ${outlet.name || '-'}`,
    `Tanggal Terbit: ${invoice.date}`,
    dueDate ? `Jatuh Tempo: *${dueDate}*` : '',
    `Total: *${formatRupiah(invoice.total)}*`,
    `Status: ${invoice.status === 'lunas' ? 'LUNAS' : 'Belum Lunas'}`,
    ...bankLines,
    '',
    '(Dokumen PDF lengkap dapat diunduh dari aplikasi SFA)',
  ].filter(Boolean).join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}
