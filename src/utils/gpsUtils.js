import { haversine } from './helpers';

/* Posisi "saat ini" sales — simulasi koordinat.
   Di sistem nyata: HTML5 Geolocation dikirim berkala ke server (#77). */
export function currentPosSim(db, salesId) {
  const sales = (db.sales || []).find((s) => s.id === salesId);
  const area = (db.areas || []).find((a) => a.id === (sales || {}).areaId) || (db.areas || [])[0] || {};
  return {
    lat: (area.lat ?? -7.7956) + (salesId || 1) * 0.0007,
    lng: (area.lng ?? 110.3695) + (salesId || 1) * 0.0009,
    areaId: area.id,
    areaName: area.name || '-',
  };
}

/* #72: greedy nearest-neighbor — urutan rute berdasarkan jarak terdekat (Haversine, #79 instan) */
export function optimizeRoute(start, stops) {
  const remaining = [...stops];
  const order = [];
  let cur = { lat: start.lat, lng: start.lng };
  while (remaining.length) {
    let best = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = haversine(cur.lat, cur.lng, s.lat, s.lng);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    const next = remaining.splice(best, 1)[0];
    order.push({ stop: next, dist: bestDist });
    cur = { lat: next.lat, lng: next.lng };
  }
  return order;
}

/* #77/#78: riwayat check-in (track history) sales pada tanggal tertentu */
export function checkinTrail(db, salesId, date) {
  return (db.checkins || [])
    .filter((c) => c.salesId === salesId && c.date === date)
    .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
}

export const SPEED_KMH = 25; /* estimasi kecepatan untuk perhitungan ETA */