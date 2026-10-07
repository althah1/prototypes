/* Stempel otomatis pada foto bukti (kriteria #10 & #37):
   nama sales, nama outlet, tanggal/jam, koordinat GPS. */
export function addWatermark(dataUrl, lines = []) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      /* F-28: persempit foto besar (sisi panjang maks 1280 px) — hemat kuota localStorage */
      const MAXPX = 1280;
      const scale = Math.min(1, MAXPX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const fontSize = Math.max(12, Math.round(canvas.width / 34));
      const pad = Math.round(fontSize * 0.7);
      const blockH = Math.round(fontSize * lines.length * 1.45) + pad * 2;

      ctx.fillStyle = 'rgba(15,23,42,0.62)';
      ctx.fillRect(0, canvas.height - blockH, canvas.width, blockH);
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${fontSize}px sans-serif`;
      lines.forEach((l, i) => {
        ctx.fillText(l, pad, canvas.height - blockH + pad + Math.round(fontSize * (i + 0.85)));
      });

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl); /* gagal dekode — kirim apa adanya */
    img.src = dataUrl;
  });
}