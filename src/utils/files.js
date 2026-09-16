/* Baca berkas gambar menjadi dataURL dengan validasi ukuran (maks 2 MB) */
export function readFileAsDataURL(file, cb) {
  if (!file) return cb(null);
  if (file.size > 2 * 1024 * 1024) return cb(null, 'Ukuran berkas melebihi batas 2 MB.');
  const reader = new FileReader();
  reader.onload = (e) => cb(e.target.result);
  reader.onerror = () => cb(null, 'Gagal membaca berkas.');
  reader.readAsDataURL(file);
}