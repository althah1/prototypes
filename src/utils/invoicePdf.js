import { formatRupiah, todayISO } from './helpers';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* BR-INV: dokumen invoice (cetak → "Simpan sebagai PDF" pada dialog print browser) */
export function openInvoicePdf(invoice, db) {
  const comp = (db.companies || [])[0] || {};
  const outlet = (db.outlets || []).find((o) => o.id === invoice.outletId) || {};
  const sales = (db.sales || []).find((s) => s.id === invoice.salesId) || {};
  const banks = (db.banks || []).filter((b) => b.status === 'active');

  /* Syarat pembayaran */
  const syaratText = (() => {
    switch (invoice.metodePembayaran) {
      case 'transfer': {
        const b = banks.find((x) => x.id === invoice.bankId);
        return b ? `Transfer ke <b>${esc(b.nama)}</b>, No. Rekening <b>${esc(b.noRekening)}</b> a.n. <b>${esc(b.atasNama)}</b>.` : 'Transfer bank.';
      }
      case 'termin': return `Pembayaran tempo <b>${invoice.terminHari || 14} hari</b> — jatuh tempo <b>${invoice.jatuhTempo || '-'}</b>.`;
      case 'cicilan': return 'Pembayaran mengangsur sesuai jadwal angsuran di bawah.';
      case 'konsinyasi': return 'Penagihan mengikuti hasil stock-take (jumlah barang yang terjual di outlet).';
      default: return 'Pembayaran tunai saat penyerahan barang.';
    }
  })();

  /* Status stamp */
  const statusText = invoice.status === 'lunas' ? 'LUNAS' :
    invoice.status === 'dibatalkan' ? 'DIBATALKAN' :
    (invoice.jatuhTempo && invoice.jatuhTempo < todayISO() ? 'JATUH TEMPO' : 'BELUM LUNAS');
  const statusColor = invoice.status === 'lunas' ? '#16a34a' :
    invoice.status === 'dibatalkan' ? '#64748b' :
    (invoice.jatuhTempo && invoice.jatuhTempo < todayISO() ? '#dc2626' : '#f59e0b');

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
      <thead><tr><th>Angsuran</th><th class="r">Nominal</th><th class="c">Jatuh Tempo</th><th class="c">Status</th></tr></thead>
      <tbody>
        ${invoice.installments.map((a) => `
          <tr>
            <td>Angsuran ${a.ke}</td>
            <td class="r">${formatRupiah(a.nominal)}</td>
            <td class="c">${a.jatuhTempo}</td>
            <td class="c">${a.status === 'lunas' ? '<b style="color:#16a34a">LUNAS</b>' : 'Belum Bayar'}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

  /* Riwayat pembayaran */
  const paymentTable = (invoice.payments || []).length ? `
    <h3>Riwayat Pembayaran</h3>
    <table>
      <thead><tr><th class="c">Tanggal</th><th>Keterangan</th><th class="c">Metode</th><th class="r">Nominal</th></tr></thead>
      <tbody>
        ${invoice.payments.map((p) => `
          <tr>
            <td class="c">${p.ts}</td>
            <td>${esc(p.keterangan || 'Pembayaran')}</td>
            <td class="c">${esc(p.metode)}</td>
            <td class="r">${formatRupiah(p.nominal)}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : '';

  /* BR-INV-006: rekening bank di footer */
  const bankFooter = banks.length ? `
    <div class="banks">
      <b>Rekening Pembayaran Perusahaan:</b><br/>
      ${banks.map((b) => `${esc(b.nama)} — ${esc(b.noRekening)} a.n. ${esc(b.atasNama)}`).join('<br/>')}
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
  .banks{margin-top:14px;padding:10px 14px;background:#f8fafc;border:1px dashed #94a3b8;border-radius:8px;font-size:11px}
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
        Tanggal: ${esc(invoice.date)}<br/>
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
    ${invoice.status === 'lunas' ? `<b>Pembayaran telah diterima — ${esc(invoice.paidAt || '')} (${esc(invoice.paidMethod || '')}).</b>` : ''}
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

/* Bagikan ringkasan invoice ke WhatsApp */
export function shareInvoiceWhatsApp(invoice, db) {
  const outlet = (db.outlets || []).find((o) => o.id === invoice.outletId) || {};
  const msg = [
    `*INVOICE ${invoice.no}*`,
    `Kepada: ${outlet.name || '-'}`,
    `Total: *${formatRupiah(invoice.total)}*`,
    `Status: ${invoice.status === 'lunas' ? 'LUNAS' : 'Belum Lunas'}`,
    invoice.jatuhTempo ? `Jatuh tempo: ${invoice.jatuhTempo}` : '',
    '',
    '(Dokumen PDF lengkap dapat diunduh dari aplikasi SFA)',
  ].filter(Boolean).join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}
