import { formatRupiah } from './helpers';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

/* Sanitasi teks ke ASCII 7-bit aman untuk stream PDF standar (Type1 Helvetica) */
const toPdfText = (s) =>
  String(s ?? '')
    .replace(/[—–−]/g, '-')
    .replace(/[•·]/g, '*')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const uint8ToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

/* Resolver tujuan penawaran: mendukung Outlet Terdaftar (db.outlets) maupun Prospek (db.prospects) */
export function resolveQuoteTarget(quote, db) {
  if (!quote) {
    return { isProspect: false, id: null, name: '-', owner: '', phone: '', address: '', email: '' };
  }
  const isProspect =
    quote.targetType === 'prospect' || (quote.outletId == null && quote.prospectId != null);

  if (isProspect) {
    const p = (db?.prospects || []).find((x) => x.id === quote.prospectId);
    return {
      isProspect: true,
      id: quote.prospectId ?? null,
      name: p?.name || quote.customerName || '-',
      owner: p?.owner || quote.customerOwner || '',
      phone: p?.phone || quote.customerPhone || '',
      address: p?.address || quote.customerAddress || '',
      email: p?.email || quote.customerEmail || '',
    };
  }

  const o = (db?.outlets || []).find((x) => x.id === quote.outletId);
  return {
    isProspect: false,
    id: quote.outletId ?? null,
    name: o?.name || quote.customerName || '-',
    owner: o?.owner || quote.customerOwner || '',
    phone: o?.phone || quote.customerPhone || '',
    address: o?.address || quote.customerAddress || '',
    email: o?.email || quote.customerEmail || '',
  };
}

function getPaymentLineText(quote, db, asHtml = false) {
  const bank = (db?.banks || []).find((x) => x.id === quote.bankId);
  switch (quote.metodePembayaran) {
    case 'transfer':
      if (bank) {
        return asHtml
          ? `Pembayaran via transfer ke <b>${esc(bank.nama)}</b>, No. Rekening <b>${esc(bank.noRekening)}</b> a.n. <b>${esc(bank.atasNama)}</b>.`
          : `Pembayaran via transfer ke ${bank.nama}, No. Rekening ${bank.noRekening} a.n. ${bank.atasNama}.`;
      }
      return 'Pembayaran via transfer bank - rekening tujuan dikonfirmasi tim keuangan.';
    case 'termin':
      return asHtml
        ? `Pembayaran tempo <b>${quote.terminHari || 14} hari</b> setelah barang diterima.`
        : `Pembayaran tempo ${quote.terminHari || 14} hari setelah barang diterima.`;
    case 'cicilan':
      return 'Pembayaran mengangsur sesuai kesepakatan (lihat syarat khusus bila ada).';
    case 'konsinyasi':
      return 'Konsinyasi - penagihan mengikuti jumlah barang yang terjual di outlet.';
    default:
      return 'Pembayaran tunai saat penyerahan barang.';
  }
}

/* Bangun HTML dokumen Quotation (dipakai cetak PDF browser & body HTML email Brevo) */
export function buildQuoteHtml(quote, db, extraIntro = '') {
  const comp = (db?.companies || [])[0] || {};
  const target = resolveQuoteTarget(quote, db);
  const sales = (db?.sales || []).find((s) => s.id === quote.salesId) || {};
  const payLine = getPaymentLineText(quote, db, true);

  const rows = (quote.items || [])
    .map(
      (i, ix) => `
    <tr>
      <td class="c">${ix + 1}</td>
      <td>${esc(i.name)}<br/><small>${esc(i.sku)}</small></td>
      <td class="c">${i.qty} ${esc(i.unit)}</td>
      <td class="r">${formatRupiah(i.price)}</td>
      <td class="c">${i.disc || 0}%</td>
      <td class="r">${formatRupiah(i.line)}</td>
    </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"/>
<title>Quotation ${esc(quote.no)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;font-size:12.5px;margin:32px;max-width:780px}
  .intro{margin-bottom:16px;padding:12px 14px;background:#f8fafc;border-left:4px solid #2563eb;border-radius:4px;white-space:pre-line}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2563eb;padding-bottom:14px}
  .comp small{color:#64748b}
  .title{text-align:right}
  .title h1{margin:0;color:#2563eb;font-size:26px;letter-spacing:2px}
  .meta{font-size:11.5px;text-align:right;color:#334155;line-height:1.6}
  .to{margin:18px 0 4px;padding:10px 14px;background:#eff6ff;border-radius:8px}
  .badge-prospect{display:inline-block;padding:2px 6px;font-size:10px;font-weight:700;background:#dbeafe;color:#1d4ed8;border-radius:4px;margin-left:6px}
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
  @media print{body{margin:12mm}.intro{display:none}}
</style></head><body>
  ${extraIntro ? `<div class="intro">${esc(extraIntro)}</div>` : ''}
  <div class="head">
    <div class="comp">
      ${comp.logo ? `<img src="${comp.logo}" style="max-height:56px;display:block;margin-bottom:6px"/>` : ''}
      <div style="font-size:17px;font-weight:800">${esc(comp.name || 'Perusahaan Distribusi')}</div>
      <small>${esc(comp.address || '-')}</small><br/>
      <small>${esc(comp.phone || '-')} • ${esc(comp.email || '-')}</small><br/>
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
    <b>Kepada Yth.</b>${target.isProspect ? '<span class="badge-prospect">CALON MITRA / PROSPEK</span>' : ''}<br/>
    <b>${esc(target.name)}</b>${target.owner ? ` — ${esc(target.owner)}` : ''}<br/>
    ${esc(target.address || '-')}${target.phone ? ` • ${esc(target.phone)}` : ''}
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
      <li>Harga bersifat mengikat selama masa berlaku dokumen ini.</li>
      <li>Pengiriman 2–3 hari kerja setelah konfirmasi PO.</li>
      <li>${payLine}</li>
    </ol>
    ${quote.catatanSyarat ? `<p style="margin-bottom:4px"><b>Syarat &amp; ketentuan khusus penawaran ini:</b></p><p style="white-space:pre-line;margin-top:2px">${esc(quote.catatanSyarat)}</p>` : ''}
    ${quote.note ? `<p>Catatan: ${esc(quote.note)}</p>` : ''}
  </div>

  <div class="vercode">
    Verifikasi keaslian dokumen: kode <b>${esc(quote.verCode)}</b> — diterbitkan ${esc(quote.createdAt || quote.date)} WIB oleh sistem SFA.
  </div>

  <div class="sign">
    <div>Hormat kami,<br/><br/><br/><b>${esc(sales.name || '-')}</b><br/>Sales</div>
    <div>Disetujui oleh,<br/><br/><br/><b>${esc(target.name)}</b><br/>Pelanggan</div>
  </div>

  <div class="foot">Dokumen digenerate otomatis oleh Web SFA — ${esc(comp.name || 'SFA')}.</div>
</body></html>`;
}

/* Generator biner PDF 1.4 A4 murni (tanpa library eksternal) untuk lampiran Email Brevo & Web Share */
export function buildQuotePdfBytes(quote, db) {
  const comp = (db?.companies || [])[0] || {};
  const target = resolveQuoteTarget(quote, db);
  const sales = (db?.sales || []).find((s) => s.id === quote.salesId) || {};
  const payLine = getPaymentLineText(quote, db, false);

  const pages = [];
  let cmds = [];
  const pushPage = () => {
    if (cmds.length) {
      pages.push(cmds.join('\n'));
      cmds = [];
    }
  };

  const text = (x, y, str, bold = false, size = 9.5, rgb = '0.06 0.09 0.16') => {
    cmds.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb} rg 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${toPdfText(str)}) Tj ET`);
  };
  const rectFill = (x, y, w, h, rgb) => {
    cmds.push(`${rgb} rg ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
  };
  const line = (x1, y1, x2, y2, w = 0.7, rgb = '0.80 0.84 0.88') => {
    cmds.push(`${w} w ${rgb} RG ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
  };

  let y = 800;
  /* Header Perusahaan & Dokumen */
  text(40, y, comp.name || 'PT Distribu09 0.16');
  text(420, y, 'QUOTATION', true, 18, '0.15 0.39 0.92');
  y -= 14;
  text(40, y, String(comp.address || '-').slice(0, 62), false, 8.5, '0.39 0.45 0.55');
  text(390, y, `No: ${quote.no}`, true, 9);
  y -= 12;
  text(40, y, `${comp.phone || '-'} | ${comp.email || '-'}`, false, 8.5, '0.39 0.45 0.55');
  text(390, y, `Tanggal: ${quote.date}`, false, 9);
  y -= 12;
  text(40, y, `NPWP: ${comp.npwp || '-'}`, false, 8.5, '0.39 0.45 0.55');
  text(390, y, `Berlaku s.d: ${quote.validUntil}`, true, 9);
  y -= 12;
  text(390, y, `Verifikasi: ${quote.verCode || '-'}`, false, 8.5, '0.39 0.45 0.55');
  y -= 10;
  line(40, y, 555, y, 2, '0.15 0.39 0.92');

  /* Kotak Tujuan Penawaran */
  y -= 52;
  rectFill(40, y, 515, 44, '0.94 0.96 1.00');
  text(
    50,
    y + 30,
    `Kepada Yth.${target.isProspect ? ' [CALON MITRA / PROSPEK]' : ''}:`,
    true,
    9,
    '0.11 0.31 0.85'
  );
  text(50, y + 17, `${target.name}${target.owner ? ` - ${target.owner}` : ''}`, true, 10);
  text(
    50,
    y + 5,
    `${String(target.address || '-').slice(0, 75)}${target.phone ? ` | Telp: ${target.phone}` : ''}`,
    false,
    8.5,
    '0.25 0.32 0.42'
  );

  /* Header Tabel Item */
  const drawTableHead = (topY) => {
    rectFill(40, topY - 18, 515, 20, '0.94 0.96 0.98');
    line(40, topY + 2, 555, topY + 2, 0.8);
    line(40, topY - 18, 555, topY - 18, 0.8);
    text(46, topY - 11, '#', true, 8.5);
    text(68, topY - 11, 'Produk (SKU)', true, 8.5);
    text(285, topY - 11, 'Qty', true, 8.5);
    text(345, topY - 11, 'Harga', true, 8.5);
    text(430, topY - 11, 'Disc', true, 8.5);
    text(475, topY - 11, 'Jumlah', true, 8.5);
    return topY - 18;
  };

  y -= 14;
  y = drawTableHead(y);

  (quote.items || []).forEach((it, idx) => {
    if (y < 150) {
      pushPage();
      y = 790;
      y = drawTableHead(y);
    }
    const rowTop = y;
    const rowBottom = y - 22;
    text(46, rowTop - 13, String(idx + 1), false, 8.5);
    text(68, rowTop - 10, `${String(it.name || '').slice(0, 36)}`, true, 8.5);
    text(68, rowTop - 19, `${it.sku || ''}`, false, 7.5, '0.40 0.45 0.55');
    text(285, rowTop - 13, `${it.qty} ${it.unit || ''}`, false, 8.5);
    text(345, rowTop - 13, formatRupiah(it.price), false, 8.5);
    text(430, rowTop - 13, `${it.disc || 0}%`, false, 8.5);
    text(475, rowTop - 13, formatRupiah(it.line), true, 8.5);
    line(40, rowBottom, 555, rowBottom, 0.5);
    y = rowBottom;
  });

  if (y < 230) {
    pushPage();
    y = 780;
  }

  /* Ringkasan Total */
  y -= 18;
  text(365, y, 'Subtotal:', false, 9.5);
  text(465, y, formatRupiah(quote.subtotal), true, 9.5);
  y -= 14;
  text(365, y, 'Diskon:', false, 9.5);
  text(465, y, `- ${formatRupiah(quote.discTotal)}`, true, 9.5);
  y -= 14;
  text(365, y, `PPN ${Math.round((quote.taxRate || 0.11) * 100)}%:`, false, 9.5);
  text(465, y, formatRupiah(quote.tax), true, 9.5);
  y -= 6;
  line(365, y, 555, y, 1.2, '0.15 0.39 0.92');
  y -= 15;
  text(365, y, 'TOTAL:', true, 11, '0.11 0.31 0.85');
  text(465, y, formatRupiah(quote.total), true, 11, '0.11 0.31 0.85');

  /* Syarat & Ketentuan */
  y -= 24;
  text(40, y, 'Syarat & Ketentuan:', true, 9);
  y -= 12;
  text(48, y, `1. Penawaran berlaku s.d. ${quote.validUntil} (harga mengikat selama masa berlaku).`, false, 8.2);
  y -= 11;
  text(48, y, `2. Harga termasuk PPN ${Math.round((quote.taxRate || 0.11) * 100)}%. Pengiriman 2-3 hari kerja setelah PO.`, false, 8.2);
  y -= 11;
  text(48, y, `3. ${payLine.slice(0, 95)}`, false, 8.2);
  if (quote.catatanSyarat) {
    y -= 12;
    text(48, y, `Ketentuan Khusus: ${String(quote.catatanSyarat).replace(/\s+/g, ' ').slice(0, 88)}`, false, 8.2);
  }
  if (quote.note) {
    y -= 12;
    text(48, y, `Catatan: ${String(quote.note).replace(/\s+/g, ' ').slice(0, 92)}`, false, 8.2);
  }

  /* Tanda Tangan */
  y -= 32;
  text(80, y, 'Hormat kami,', false, 9);
  text(400, y, 'Disetujui oleh,', false, 9);
  y -= 36;
  text(80, y, sales.name || '-', true, 9);
  text(400, y, String(target.name || '-').slice(0, 28), true, 9);

  pushPage();

  /* Rakit objek PDF 1.4 */
  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontRegularId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pagesRootId = addObj(''); /* placeholder Pages */

  const pageIds = pages.map((stream) => {
    const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    return addObj(
      `<< /Type /Page /Parent ${pagesRootId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  });

  objects[pagesRootId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesRootId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function buildQuoteSummaryText(quote, db) {
  const target = resolveQuoteTarget(quote, db);
  return [
    `*PENAWARAN ${quote.no}*`,
    `Kepada: ${target.name}${target.isProspect ? ' (Prospek)' : ''}`,
    `Berlaku s.d: ${quote.validUntil}`,
    '',
    ...(quote.items || []).map(
      (i) => `• ${i.name} x${i.qty} ${i.unit || ''}${i.disc ? ` (disc ${i.disc}%)` : ''} = ${formatRupiah(i.line)}`
    ),
    '',
    `Total: *${formatRupiah(quote.total)}*`,
    `Kode verifikasi: ${quote.verCode}`,
  ].join('\n');
}

/* Cetak / Simpan sebagai PDF melalui browser print preview (dengan fallback unduh PDF langsung) */
export function openQuotePdf(quote, db) {
  const html = buildQuoteHtml(quote, db);
  const w = window.open('', '_blank', 'width=860,height=940');
  if (!w) {
    /* Fallback: unduh file PDF langsung jika popup diblokir browser */
    const bytes = buildQuotePdfBytes(quote, db);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quote.no}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return true;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

/* Bagikan ringkasan ke WhatsApp */
export function shareQuoteWhatsApp(quote, db) {
  const msg = `${buildQuoteSummaryText(quote, db)}\n\n(Dokumen PDF lengkap diterbitkan melalui sistem Web SFA)`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

/* Bab 4.5.2 & Bab 5.3: Distribusi via Web Share API (navigator.share) beserta lampiran PDF */
export async function shareQuoteWeb(quote, db) {
  const text = buildQuoteSummaryText(quote, db).replace(/\*/g, '');
  const title = `Quotation ${quote.no}`;

  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return { ok: false, reason: 'copied' };
      } catch {
        /* ignore */
      }
    }
    return { ok: false, reason: 'unsupported' };
  }

  try {
    const bytes = buildQuotePdfBytes(quote, db);
    const pdfFile = new File([bytes], `${quote.no}.pdf`, { type: 'application/pdf' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({ title, text, files: [pdfFile] });
      return { ok: true, mode: 'file' };
    }

    await navigator.share({ title, text });
    return { ok: true, mode: 'text' };
  } catch (err) {
    if (err?.name === 'AbortError') return { ok: false, cancelled: true };
    return { ok: false, reason: err?.message || 'share_failed' };
  }
}

/* Bab 5.3: Pengiriman Email Dokumen Quotation + Lampiran PDF via Brevo Transactional Email API */
export async function sendQuoteEmailBrevo(quote, db, { toEmail, toName = '', customMessage = '' } = {}) {
  const email = String(toEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Format alamat email tujuan tidak valid.' };
  }

  const apiKey = import.meta.env.VITE_BREVO_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      missingKey: true,
      message: 'Konfigurasi VITE_BREVO_API_KEY belum diset pada environment (.env).',
    };
  }

  const comp = (db?.companies || [])[0] || {};
  const target = resolveQuoteTarget(quote, db);
  const senderEmail =
    import.meta.env.VITE_BREVO_SENDER_EMAIL || comp.email || 'noreply@distribusi-nusantara.co.id';
  const senderName =
    import.meta.env.VITE_BREVO_SENDER_NAME || comp.name || 'Web SFA';

  const htmlContent = buildQuoteHtml(quote, db, customMessage.trim());
  const pdfBase64 = uint8ToBase64(buildQuotePdfBytes(quote, db));

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email, name: (toName || target.name || 'Pelanggan').trim() }],
        subject: `Penawaran Harga ${quote.no} - ${comp.name || 'Web SFA'}`,
        htmlContent,
        attachment: [
          {
            name: `${quote.no}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        message: data?.message || `Gagal mengirim email melalui Brevo (HTTP ${res.status}).`,
      };
    }

    return { ok: true, messageId: data?.messageId || '' };
  } catch (err) {
    return {
      ok: false,
      message: err?.message || 'Gagal terhubung ke layanan Brevo API. Periksa koneksi internet Anda.',
    };
  }
}
