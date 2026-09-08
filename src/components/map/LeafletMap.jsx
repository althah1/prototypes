import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MapRoundedIcon from '@mui/icons-material/MapRounded';

/*
 * Peta digital: OpenStreetMap + Leaflet.js (#82 — peta gratis, bukan Google Maps).
 * Jika CDN Leaflet tidak termuat (offline), komponen menampilkan fallback —
 * mode daftar rute di halaman tetap berfungsi.
 *
 * Props:
 *  - height  : tinggi peta (px)
 *  - center  : { lat, lng } untuk view awal
 *  - zoom    : zoom awal
 *  - markers : [{ lat, lng, kind: 'num'|'me'|'outlet', label, tooltip, done }]
 *  - lines   : [{ coords: [[lat,lng],...], color, weight, dashArray, tooltip }]
 *  - circles : [{ lat, lng, radius, color, label }]
 *  - fit     : boolean — sesuaikan view ke seluruh titik
 */
export default function LeafletMap({
  height = 250, center, zoom = 14, markers = [], lines = [], circles = [], fit = true,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const styleInjectedRef = useRef(false);
  const [offline, setOffline] = useState(!window.L);

  /* CSS marker bernomor — disuntik sekali ke <head> */
  useEffect(() => {
    if (styleInjectedRef.current) return;
    styleInjectedRef.current = true;
    const id = 'leaflet-num-marker-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        .num-marker{background:#2563eb;color:#fff;border:2px solid #fff;border-radius:50%;
          width:28px!important;height:28px!important;display:flex!important;align-items:center;
          justify-content:center;font-weight:800;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.3)}
        .num-marker.done{background:#16a34a}
      `;
      document.head.appendChild(style);
    }
  }, []);

  /* Init peta — sekali */
  useEffect(() => {
    if (!window.L || !containerRef.current) { setOffline(true); return undefined; }
    setOffline(false);
    const map = window.L.map(containerRef.current, { zoomControl: true })
      .setView([center.lat, center.lng], zoom);
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
    return () => {
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Redraw seluruh layer saat data berubah */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;

    layersRef.current.forEach((l) => { try { l.remove(); } catch (e) { /* ignore */ } });
    layersRef.current = [];

    /* Lingkaran batas area (geofencing #73/#75) */
    (circles || []).forEach((c) => {
      const circle = window.L.circle([c.lat, c.lng], {
        radius: c.radius, color: c.color || '#16a34a', weight: 1,
        fillColor: c.color || '#16a34a', fillOpacity: 0.07,
      }).addTo(map);
      if (c.label) circle.bindTooltip(c.label);
      layersRef.current.push(circle);
    });

    /* Garis rute / riwayat */
    (lines || []).forEach((ln) => {
      if (!ln.coords || ln.coords.length < 2) return;
      const line = window.L.polyline(ln.coords, {
        color: ln.color || '#2563eb', weight: ln.weight || 3,
        dashArray: ln.dashArray || undefined,
      }).addTo(map);
      if (ln.tooltip) line.bindTooltip(ln.tooltip);
      layersRef.current.push(line);
    });

    /* Marker */
    (markers || []).forEach((m) => {
      let layer;
      if (m.kind === 'me') {
        layer = window.L.circleMarker([m.lat, m.lng], {
          radius: 9, color: '#ffffff', fillColor: '#2563eb', fillOpacity: 1, weight: 3,
        }).addTo(map);
      } else if (m.kind === 'outlet') {
        layer = window.L.circleMarker([m.lat, m.lng], {
          radius: 4.5, color: '#64748b', weight: 1, fillColor: '#94a3b8', fillOpacity: 0.85,
        }).addTo(map);
      } else {
        layer = window.L.marker([m.lat, m.lng], {
          icon: window.L.divIcon({
            className: m.done ? 'num-marker done' : 'num-marker',
            html: `<span>${m.label ?? ''}</span>`,
            iconSize: [28, 28],
          }),
        }).addTo(map);
      }
      if (m.tooltip) layer.bindTooltip(m.tooltip);
      layersRef.current.push(layer);
    });

    /* Fit bounds ke seluruh titik */
    if (fit) {
      const pts = [...(markers || []).map((m) => [m.lat, m.lng]),
        ...(lines || []).flatMap((ln) => ln.coords || [])];
      if (pts.length > 1) {
        try { map.fitBounds(window.L.latLngBounds(pts).pad(0.18)); } catch (e) { /* ignore */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers), JSON.stringify(lines), JSON.stringify(circles), fit]);

  if (offline) {
    return (
      <Box sx={{
        height, borderRadius: 2.5, border: '1px solid', borderColor: 'divider',
        bgcolor: 'grey.100', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1, p: 2,
      }}>
        <MapRoundedIcon color="action" />
        <Typography variant="body2" color="text.secondary" align="center">
          Peta OpenStreetMap tidak tersedia (CDN offline) — mode daftar rute tetap berfungsi.
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} sx={{ height, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', zIndex: 1 }} />
  );
}