import { formatRupiah } from './helpers';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* #56: dokumen PDF (cetak → "Simpan sebagai PDF" pada dialog print browser) */
export function openQuotePdf(quote, db) {
  const comp = (db.companies || [])[0] || {};
  const outlet = (db.outlets || []).find((o) => o.id === quote.outletId) || {};
  const sales = (db.sales || []).find((s) => s.id === quote.salesId) || {};

  const rows = quote.items.map((i, ix) => `
    <tr>
      <td class="c">${ix + 1}</td>
      <td>${esc(i.name)}<br/><small>${esc(i.sku)}</small></td>
      <td class="c">${i.qty} ${esc(i.unit)}</td>
      <td class="r">${formatRupiah(i.price)}</td>
      <td class="c">${i.disc || 0}%</td>
      <td class="r">${formatRupiah(i.line)}</td>
    </tr>`).join('');

  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/>
<title>Quotation ${esc(quote.no)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;font-size:12.5px;margin:32px;max-width:780px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563eb;padding-bottom:14px}
  .comp small{color:#64748b}
  .title{text-align:right}
  .title h1{margin:0;color:#2563eb;font-size:26px;letter-spacing:2px}
  .meta{font-size:11.5px;text-align:right;color:#334155;line-height:1.6}
  .to{margin:18px 0 4px;padding:10px 14px;background:#eff6ff;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11.5px}
  th,td{border:1px solid #cbd5e1;padding:7px 9px}
  th{background:#f1f5f9;text-align:left}
  .c{text-align:center}.r{text-align:right}
  .totals{margin-top:14px;width:310px;margin-left:auto;font-size:12px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0}
  .grand{font-weight:800;font-size:15px;color:#1d4ed8;border-top:2px solid #2563eb;margin-top:4px;padding-top:6px}
  .tnc{margin-top:18px;font-size:11px;color:#334155}
  .tnc ol{margin-left:18px;padding-left:0}
  .vercode{margin-top:10px;font-size:11px;background:#f8fafc;border:1px dashed #94a3b8;border-radius:6px;padding:8px 10px}
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
      <h1>QUOTATION</h1>
      <div class="meta">
        No: <b>${esc(quote.no)}</b><br/>
        Tanggal: ${esc(quote.date)}<br/>
        Berlaku s.d: <b>${esc(quote.validUntil)}</b><br/>
        Kode Verifikasi: <b>${esc(quote.verCode)}</b>
      </div>
    </div>
  </div>

  <div class="to">
    <b>Kepada Yth.</b><br/>
    ${esc(outlet.name)} — ${esc(outlet.owner || '')}<br/>
    ${esc(outlet.address || '')}${outlet.phone ? ` • ${esc(outlet.phone)}` : ''}
  </div>

  <table>
    <thead><tr><th>#</th><th>Produk</th><th class="c">Qty</th><th class="r">Harga</th><th class="c">Diskon</th><th class="r">Jumlah</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><b>${formatRupiah(quote.subtotal)}</b></div>
    <div><span>Diskon</span><b>− ${formatRupiah(quote.discTotal)}</b></div>
    <div><span>PPN ${Math.round((quote.taxRate || 0.11) * 100)}%</span><b>${formatRupiah(quote.tax)}</b></div>
    <div class="grand"><span>TOTAL</span><span>${formatRupiah(quote.total)}</span></div>
  </div>

  <div class="tnc">
    <b>Syarat &amp; Ketentuan:</b>
    <ol>
      <li>Penawaran berlaku hingga <b>${esc(quote.validUntil)}</b> — setelah lewat, harga dapat berubah.</li>
      <li>Harga sudah termasuk PPN ${Math.round((quote.taxRate || 0.11) * 100)}%.</li>
      <li>Harga bersifat mengikat (<i>price freeze</i>) selama masa berlaku dokumen ini.</li>
      <li>Pengiriman 2–3 hari kerja setelah konfirmasi PO.</li>
      <li>Pembayaran: DP 50%, pelunasan sebelum pengiriman${comp.bankAccount ? ` — transfer ke <b>${esc(comp.bankName)} ${esc(comp.bankAccount)}</b> a.n. <b>${esc(comp.bankHolder)}</b>` : ''}.</li>
    </ol>
    ${quote.catatanSyarat ? `<p style="margin-bottom:4px"><b>Syarat &amp; ketentuan khusus penawaran ini:</b></p><p style="white-space:pre-line;margin-top:2px">${esc(quote.catatanSyarat)}</p>` : ''}
    ${quote.note ? `<p>Catatan: ${esc(quote.note)}</p>` : ''}
  </div>

  <div class="vercode">
    Verifikasi keaslian dokumen: kode <b>${esc(quote.verCode)}</b> — diterbitkan ${esc(quote.createdAt || quote.date)} WIB oleh sistem SFA.
  </div>

  <div class="sign">
    <div>Hormat kami,<br/><br/><br/><b>${esc(sales.name || '-')}</b><br/>Sales</div>
    <div>Disetujui oleh,<br/><br/><br/><b>${esc(outlet.name)}</b><br/>Pelanggan</div>
  </div>

  <div class="foot">Dokumen digenerate otomatis oleh Web SFA — ${esc(comp.name)}.</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=860,height=940');
  if (!w) return false; /* popup diblokir */
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/* #57: bagikan ringkasan ke WhatsApp (dokumen PDF diunduh terpisah dari aplikasi) */
export function shareQuoteWhatsApp(quote, db) {
  const outlet = (db.outlets || []).find((o) => o.id === quote.outletId) || {};
  const msg = [
    `*PENAWARAN ${quote.no}*`,
    `Kepada: ${outlet.name || '-'}`,
    `Berlaku s.d: ${quote.validUntil}`,
    '',
    ...quote.items.map((i) => `• ${i.name} x${i.qty}${i.disc ? ` (disc ${i.disc}%)` : ''} = ${formatRupiah(i.line)}`),
    '',
    `Total: *${formatRupiah(quote.total)}*`,
    `Kode verifikasi: ${quote.verCode}`,
    '',
    '(Dokumen PDF lengkap dapat diunduh dari aplikasi SFA)',
  ].join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}