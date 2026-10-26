import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import DomainRoundedIcon from '@mui/icons-material/DomainRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import L from 'leaflet';

import { MASTER_CONFIG } from './masterConfig';
import ProdukPage from './Produk';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import StatusChip from '../../components/ui/StatusChip';
import { formatRupiah, TASK_TYPE_LABEL } from '../../utils/helpers';
import { readFileAsDataURL } from '../../utils/files';
import { allocMapOf, allocTotal, ensureGudangDetails, syncAllocation } from '../../utils/gudangUtils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Detail: label kecil kapital di atas, nilai dalam wadah lembut — teks panjang
   membungkus rapi di dalam wadah, tidak pernah scroll kiri/kanan. */
const KVRow = ({ label, value }) => (
  <Stack sx={{ py: 0.5 }}>
    <Typography variant="caption" color="text.secondary"
      sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10.5, mb: 0.4 }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}
      sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.25, py: 0.75, overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>
      {value}
    </Typography>
  </Stack>
);

function resolveOptions(f, db) {
  if (f.options) return f.options;
  if (!f.optionsFrom) return [];
  const { table, label = 'name', onlyActive = false } = f.optionsFrom;
  if (table === 'categories') return (db.categories || []).map((c) => ({ v: c, l: c }));
  let list = db[table] || [];
  if (onlyActive) list = list.filter((r) => !r.status || r.status === 'active');
  return list.map((r) => ({ v: r.id, l: r[label] ?? r.name }));
}

/* Saran kode PREFIX-YYYY-NNN — prefill editable (cfg.codeGen). */
function suggestCode(rows, prefix) {
  const year = new Date().getFullYear();
  const head = `${prefix}-${year}-`;
  const max = (rows || []).reduce((m, r) => {
    const c = String(r.code || '');
    if (c.startsWith(head)) {
      const n = parseInt(c.slice(head.length), 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }
    return m;
  }, 0);
  return `${head}${String(max + 1).padStart(3, '0')}`;
}

/* Kode sistem tersembunyi (cfg.autoGen) — PREFIX-NNN berurutan, mis. BNK-001.
   Untuk data yang butuh pengenal unik tetapi tidak perlu dilihat pengguna. */
function nextAutoCode(rows, field, prefix) {
  let max = 0;
  (rows || []).forEach((r) => {
    const m = String(r[field] || '').match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/* Pemilih Titik Peta Interaktif (Leaflet) + Nominatim Reverse Geocoding (FSD Bab 4.2.8 & Bab 5.2) */
function OutletPinPicker({ latVal, lngVal, areaId, areas, onPickCoords, onFillAddress }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circlesRef = useRef([]);
  const abortRef = useRef(null);
  const internalPickRef = useRef(false);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoInfo, setGeoInfo] = useState('');
  const [geoError, setGeoError] = useState('');

  const parsedCoords = useMemo(() => {
    const rawLat = String(latVal ?? '').trim();
    const rawLng = String(lngVal ?? '').trim();
    if (rawLat === '' || rawLng === '') return null;
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    if (lat === 0 && lng === 0) return null;
    return { lat, lng };
  }, [latVal, lngVal]);

  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: 'outlet-pin-marker',
        html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 6px rgba(15,23,42,0.35))">
          <path d="M16 0C7.163 0 0 7.163 0 16C0 27.25 14.2 40.55 15.15 41.42C15.63 41.86 16.37 41.86 16.85 41.42C17.8 40.55 32 27.25 32 16C32 7.163 24.837 0 16 0Z" fill="#dc2626"/>
          <circle cx="16" cy="15.5" r="6" fill="#ffffff"/>
        </svg>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
      }),
    []
  );

  /* Reverse Geocoding via OpenStreetMap Nominatim */
  const fetchReverseGeocode = async (lat, lng) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeoLoading(true);
    setGeoError('');
    setGeoInfo('');

    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&accept-language=id`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const addr = String(data?.display_name || '').trim();
      if (addr) {
        const clipped = addr.slice(0, 200).trim();
        onFillAddress(clipped);
        setGeoInfo('Alamat otomatis berhasil diisi dari titik peta.');
      } else {
        setGeoError('Titik tersimpan, namun detail alamat tidak ditemukan — silakan isi alamat manual.');
      }
    } catch (err) {
      if (err?.name === 'AbortError' && abortRef.current !== controller) return;
      setGeoError('Koordinat tersimpan. Layanan alamat otomatis sedang tidak terjangkau (offline) — silakan isi alamat manual.');
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) setGeoLoading(false);
    }
  };

  const applyPickedPoint = (lat, lng, shouldGeocode = true) => {
    const cleanLat = Number(lat.toFixed(6));
    const cleanLng = Number(lng.toFixed(6));
    if (cleanLat === 0 && cleanLng === 0) {
      setGeoError('Pasangan titik (0, 0) tidak diizinkan — silakan pilih titik lokasi yang valid.');
      return;
    }
    internalPickRef.current = true;
    onPickCoords(cleanLat.toFixed(6), cleanLng.toFixed(6));
    if (shouldGeocode) fetchReverseGeocode(cleanLat, cleanLng);
  };

  /* Inisialisasi peta Leaflet di dalam Dialog MUI */
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const activeAreas = (areas || []).filter((a) => (a.status || 'active') === 'active');
    const selectedArea = activeAreas.find((a) => String(a.id) === String(areaId));
    const fallbackArea = selectedArea || activeAreas[0];
    const initCenter = parsedCoords
      ? [parsedCoords.lat, parsedCoords.lng]
      : fallbackArea
        ? [Number(fallbackArea.lat) || -7.7956, Number(fallbackArea.lng) || 110.3695]
        : [-6.2, 106.8166];
    const initZoom = parsedCoords ? 16 : 13;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(initCenter, initZoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.on('click', (e) => {
      applyPickedPoint(e.latlng.lat, e.latlng.lng, true);
    });

    mapRef.current = map;

    /* Pastikan ukuran tile utuh setelah animasi buka Dialog MUI */
    const t1 = setTimeout(() => map.invalidateSize(), 120);
    const t2 = setTimeout(() => map.invalidateSize(), 360);
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      if (abortRef.current) abortRef.current.abort();
      try { map.remove(); } catch (e) { /* ignore */ }
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Gambar lingkaran referensi Area Kerja & arahkan peta saat Area dipilih (jika pin belum diisi) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    circlesRef.current.forEach((c) => { try { c.remove(); } catch (e) { /* ignore */ } });
    circlesRef.current = [];

    const activeAreas = (areas || []).filter((a) => (a.status || 'active') === 'active');
    activeAreas.forEach((a) => {
      const isSelected = String(a.id) === String(areaId);
      if (a.lat == null || a.lng == null) return;
      const circle = L.circle([Number(a.lat), Number(a.lng)], {
        radius: (Number(a.radiusKm) || 5) * 1000,
        color: isSelected ? '#2563eb' : '#16a34a',
        weight: isSelected ? 1.75 : 1,
        dashArray: isSelected ? undefined : '4 4',
        fillColor: isSelected ? '#2563eb' : '#16a34a',
        fillOpacity: isSelected ? 0.08 : 0.04,
      }).addTo(map);
      circle.bindTooltip(`Area: ${a.name} (${a.radiusKm || 5} km)`);
      circlesRef.current.push(circle);
    });

    if (!parsedCoords && areaId) {
      const target = activeAreas.find((a) => String(a.id) === String(areaId));
      if (target && target.lat != null && target.lng != null) {
        map.setView([Number(target.lat), Number(target.lng)], 13);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, areas]);

  /* Sinkronisasi dua arah antara input angka (lat/lng) dengan marker pin di peta */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!parsedCoords) {
      if (markerRef.current) {
        try { markerRef.current.remove(); } catch (e) { /* ignore */ }
        markerRef.current = null;
      }
      return;
    }

    const pos = [parsedCoords.lat, parsedCoords.lng];
    if (!markerRef.current) {
      const m = L.marker(pos, { draggable: true, icon: pinIcon }).addTo(map);
      m.bindTooltip('Geser pin untuk menyesuaikan titik lokasi outlet');
      m.on('dragend', () => {
        const p = m.getLatLng();
        applyPickedPoint(p.lat, p.lng, true);
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng(pos);
    }

    if (!internalPickRef.current) {
      map.setView(pos, Math.max(map.getZoom(), 15));
    }
    internalPickRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedCoords?.lat, parsedCoords?.lng]);

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setGeoError('Browser tidak mendukung fitur GPS Geolocation.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 16);
        applyPickedPoint(latitude, longitude, true);
      },
      () => {
        setGeoLoading(false);
        setGeoError('Gagal mengakses lokasi perangkat — izinkan akses lokasi atau klik langsung di peta.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 1.5,
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={750} fontSize={13.5}>
            Pilih Titik Lokasi di Peta (Pin Picker) *
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Klik pada peta atau geser pin merah untuk mengisi koordinat &amp; alamat secara otomatis.
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MyLocationRoundedIcon fontSize="small" />}
            onClick={handleUseCurrentGps}
            disabled={geoLoading}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
          >
            Lokasi Saat Ini
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PlaceRoundedIcon fontSize="small" />}
            onClick={() => parsedCoords && fetchReverseGeocode(parsedCoords.lat, parsedCoords.lng)}
            disabled={!parsedCoords || geoLoading}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
          >
            Ambil Alamat
          </Button>
        </Stack>
      </Stack>

      <Box
        ref={containerRef}
        sx={{
          height: 250,
          width: '100%',
          borderRadius: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          zIndex: 1,
          '& .outlet-pin-marker': { background: 'transparent', border: 'none' },
        }}
      />

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.85, minHeight: 20 }}>
        {geoLoading && (
          <>
            <CircularProgress size={13} thickness={5} />
            <Typography variant="caption" color="primary.main" fontWeight={600}>
              Mengambil alamat otomatis dari koordinat (Nominatim)…
            </Typography>
          </>
        )}
        {!geoLoading && geoInfo && (
          <Typography variant="caption" color="success.main" fontWeight={600}>
            {geoInfo}
          </Typography>
        )}
        {!geoLoading && geoError && (
          <Typography variant="caption" color="warning.main" fontWeight={600}>
            {geoError}
          </Typography>
        )}
        {!geoLoading && !geoInfo && !geoError && (
          <Typography variant="caption" color="text.secondary">
            {parsedCoords
              ? `Titik aktif: ${parsedCoords.lat.toFixed(6)}, ${parsedCoords.lng.toFixed(6)}`
              : 'Belum ada pin dipilih — klik area peta untuk menempatkan pin outlet.'}
    </Typography>
        )}
      </Stack>
    </Box>
  );
}

/* Produk = halaman kustom (baris = 1 produk × 1 gudang). Wrapper memisahkan
   komponen supaya Rules of Hooks aman. */
export default function EntityPage({ slug }) {
  if (slug === 'produk') return <ProdukPage />;
  return <EntityPageInner slug={slug} />;
}

function EntityPageInner({ slug }) {
  const cfg = MASTER_CONFIG[slug];
  const { user } = useAuth();
  /* Finance: seluruh Master Data = lihat saja; Master Sales & Master Bank eksklusif Admin */
  const readOnly = user?.role === 'finance' || ((slug === 'sales' || slug === 'bank') && user?.role !== 'admin');
  const { db, insert, update, mutate, remove } = useDb();
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ===== Semua hooks di paling atas — Rules of Hooks ===== */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refFilters, setRefFilters] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);

  /* ---------- Scroll Restoration & Dialog Lifecycle ---------- */
  const scrollPosRef = useRef(null);
  const closingSnapshotRef = useRef(null);

  const captureScrollPos = () => {
    closingSnapshotRef.current = null;
    const mainEl = document.querySelector('main');
    scrollPosRef.current = {
      x: window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
      y: window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0,
      mainX: mainEl ? mainEl.scrollLeft : 0,
      mainY: mainEl ? mainEl.scrollTop : 0,
    };
  };

  const handleCloseForm = () => {
    if (scrollPosRef.current) {
      closingSnapshotRef.current = scrollPosRef.current;
      scrollPosRef.current = null;
    }
    setFormOpen(false);
  };

  const handleUserDismiss = () => {
    if (saving) return;
    handleCloseForm();
  };

  const handleFormExited = () => {
    if (formOpen) return;
    const toRestore = closingSnapshotRef.current;
    closingSnapshotRef.current = null;
    if (!toRestore) return;

    window.scrollTo(toRestore.x, toRestore.y);
    if (document.documentElement) {
      document.documentElement.scrollLeft = toRestore.x;
      document.documentElement.scrollTop = toRestore.y;
    }
    if (document.body) {
      document.body.scrollLeft = toRestore.x;
      document.body.scrollTop = toRestore.y;
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollLeft = toRestore.mainX;
      mainEl.scrollTop = toRestore.mainY;
    }
  };

  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* Migrasi sekali untuk tabel alokasi stok (jaring pengaman lama) */
  const allocRef = useRef(false);
  useEffect(() => {
    if (cfg.table !== 'products' || allocRef.current) return;
    allocRef.current = true;
    ensureGudangDetails(db, mutate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = db[cfg.table] || [];
  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter === 'active') list = list.filter((r) => (r.status || 'active') === 'active');
    if (statusFilter === 'inactive') list = list.filter((r) => r.status === 'inactive');
    (cfg.filterRefs || []).forEach(({ field }) => {
      const val = refFilters[field];
      if (val && val !== 'all') {
        list = list.filter((r) => String(r[field]) === String(val));
      }
    });
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => (cfg.search || []).some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    return list;
  }, [rows, search, statusFilter, refFilters, cfg.search, cfg.filterRefs]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const curPage = Math.min(page, pageCount - 1);
  const paginated = filtered.slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  /* ---------- Helper ---------- */
  const labelOf = (r) => r?.name || r?.nama || r?.code || r?.kode || r?.nik || r?.sku || 'Data';
  const allocField = cfg.fields.find((f) => f.type === 'gudangAlloc');

  const resetForm = () => {
    const init = {};
    cfg.fields.forEach((f) => {
      init[f.k] = f.type === 'gudangAlloc'
        ? {}
        : f.type === 'multiSelect'
          ? []
          : (f.default != null ? String(f.default) : '');
    });
    if (cfg.codeGen) init[cfg.codeGen.field] = suggestCode(rows, cfg.codeGen.prefix);
    setValues(init);
    setErrors({});
    setEditing(null);
  };

  const openCreate = () => {
    if (readOnly) return;
    captureScrollPos();
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (rec) => {
    if (readOnly) return;
    captureScrollPos();
    const init = {};
    cfg.fields.forEach((f) => {
      init[f.k] = f.type === 'gudangAlloc'
        ? allocMapOf(db, rec.id)
        : f.type === 'multiSelect'
          ? [...(Array.isArray(rec[f.k]) ? rec[f.k] : [])]
          : (rec[f.k] == null ? (f.default != null ? String(f.default) : '') : String(rec[f.k]));
    });
    setValues(init); setErrors({}); setEditing(rec); setFormOpen(true);
  };

  const setVal = (k, v) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  /* ---------- Referensi & kaskade ---------- */
  const refStats = (rec) => {
    if (!rec) return { total: 0, list: [] };
    const list = [];
    (cfg.refs || []).forEach(({ table, field, label, matchSelf, selfField, viaSelfField, viaSelfItems }) => {
      let n = 0;
      if (selfField) {
        const ids = (rec[selfField] || []).map(String);
        n = ids.length ? (db[table] || []).filter((x) => ids.includes(String(x.id))).length : 0;
      } else if (viaSelfField) {
        const ids = (rec[viaSelfField] || []).map(String);
        n = ids.length ? (db[table] || []).filter((x) => ids.includes(String(x[field]))).length : 0;
      } else if (viaSelfItems) {
        const ids = (rec[viaSelfItems] || []).map(String);
        n = ids.length
          ? (db[table] || []).filter((r) => (r[field] || []).some((it) => ids.includes(String(it.productId)))).length
          : 0;
      } else {
        const want = matchSelf ? rec[field] : rec.id;
        n = (db[table] || []).filter((x) => x[field] === want).length;
      }
      if (n) list.push({ label, n });
    });
    (cfg.refsItems || []).forEach(({ table, field, label }) => {
      const n = (db[table] || []).filter((r) => (r[field] || []).some((it) => it.productId === rec.id)).length;
      if (n) list.push({ label, n });
    });
    (cfg.refsArrays || []).forEach(({ table, field, label }) => {
      const n = (db[table] || []).filter((x) => Array.isArray(x[field]) && x[field].includes(rec.id)).length;
      if (n) list.push({ label, n });
    });
    return { total: list.reduce((s, x) => s + x.n, 0), list };
  };

  const cascadeIds = (rec) =>
    (cfg.cascade || []).map(({ table, field }) => ({
      table,
      ids: (db[table] || []).filter((x) => x[field] === rec.id).map((x) => x.id),
    }));

  const setStatusCascade = (rec, to) => {
    const casc = cascadeIds(rec);
    mutate((d) => {
      const me = (d[cfg.table] || []).find((r) => r.id === rec.id);
      if (me) me.status = to;
      casc.forEach(({ table, ids }) => {
        ids.forEach((cid) => {
          const row = (d[table] || []).find((r) => r.id === cid);
          if (row) row.status = to;
        });
      });
    });
    return casc.reduce((s, c) => s + c.ids.length, 0);
  };

  /* ---------- Validasi ---------- */
  const validateAll = () => {
    const errs = {};
    cfg.fields.forEach((f) => {
      if (f.type === 'multiSelect') {
        if (f.required && !(values[f.k] || []).length) errs[f.k] = `${f.l} wajib dipilih minimal 1 produk.`;
        return;
      }
      if (f.type === 'gudangAlloc') {
        const bad = Object.entries(values[f.k] || {}).some(
          ([, v]) => v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)
        );
        if (bad) errs[f.k] = 'Penempatan stok harus berupa angka ≥ 0.';
        return;
      }
      let v = values[f.k];
      if (f.type === 'number') v = v === '' ? '' : Number(v);
      else v = String(v ?? '').trim();

      if (f.required && (v === '' || v == null)) { errs[f.k] = `${f.l} wajib diisi.`; return; }
      if (v === '' || v == null) return;

      if (f.type === 'number') {
        if (f.min != null && v < f.min) errs[f.k] = `${f.l} tidak boleh kurang dari ${f.min}.`;
        if (f.max != null && v > f.max) errs[f.k] = `${f.l} tidak boleh lebih dari ${f.max}.`;
        if (f.notZero && v === 0) errs[f.k] = `${f.l} tidak boleh bernilai 0.`;
      } else {
        if (f.max && String(v).length > f.max) errs[f.k] = `${f.l} maksimal ${f.max} karakter.`;
        if (f.pattern && !f.pattern.test(v)) errs[f.k] = f.patternMsg || `${f.l}: format tidak sesuai.`;
        if (f.email && !EMAIL_RE.test(v)) errs[f.k] = 'Format email tidak valid — gunakan bentuk seperti nama@perusahaan.com.';
      }
    });

    (cfg.uniques || []).forEach((k) => {
      if (errs[k]) return;
      const f = cfg.fields.find((x) => x.k === k);
      const v = String(values[k] ?? '').trim().toLowerCase();
      if (!v) return;
      const dup = (db[cfg.table] || []).find(
        (r) => String(r[k] ?? '').toLowerCase() === v && (!editing || r.id !== editing.id)
      );
      if (dup) errs[k] = `${f ? f.l : k} sudah terdaftar.`;
    });

    if (cfg.validate) {
      Object.entries(cfg.validate(values, db, editing) || {}).forEach(([k, msg]) => { if (msg) errs[k] = msg; });
    }
    return errs;
  };

  /* ---------- Simpan ---------- */
  const handleSubmit = (andAgain = false) => {
    const errs = validateAll();
    setErrors(errs);
    if (Object.keys(errs).length) return toast('Periksa kembali isian formulir.', 'warning');

    setSaving(true);
    setTimeout(() => {
      const payload = {};
      cfg.fields.forEach((f) => {
        let v = values[f.k];
        if (f.type === 'gudangAlloc') v = allocTotal(values[f.k]);
        else if (f.type === 'multiSelect') v = values[f.k] || [];
        else if (f.type === 'number') v = v === '' ? (f.default ?? 0) : Number(v);
        else if (f.optionsFrom && f.optionsFrom.table !== 'categories') v = v === '' ? '' : Number(v);
        else v = String(v ?? '').trim();
        payload[f.k] = v;
      });

      if (editing) {
        update(cfg.table, editing.id, payload);
        if (allocField) syncAllocation(mutate, editing.id, values[allocField.k]);
        toast('Data berhasil diperbarui.', 'success');
      } else {
        payload.status = payload.status || 'active'; /* default Aktif — bisa Nonaktif dari form (Gudang) */
        if (cfg.autoGen) payload[cfg.autoGen.field] = nextAutoCode(rows, cfg.autoGen.field, cfg.autoGen.prefix);
        const rec = insert(cfg.table, payload);
        if (allocField) syncAllocation(mutate, rec.id, values[allocField.k]);
        toast('Data baru berhasil disimpan.', 'success');
      }
      setSaving(false);
      if (andAgain) resetForm(); else handleCloseForm();
    }, 400);
  };

  /* ---------- Nonaktifkan / aktifkan ---------- */
  const toggleStatus = (rec) => {
    const to = rec.status === 'active' ? 'inactive' : 'active';
    const n = setStatusCascade(rec, to);
    toast(
      to === 'active'
        ? `"${labelOf(rec)}" diaktifkan kembali${n ? ` (+ ${n} data bawahan)` : ''}.`
        : `"${labelOf(rec)}" dinonaktifkan${n ? ` — ${n} data bawahan ikut nonaktif sementara` : ''}. Riwayat transaksi tetap tersimpan.`,
      to === 'active' ? 'success' : 'info'
    );
  };

  /* ---------- Hapus ---------- */
  const delStats = confirmDelete ? refStats(confirmDelete) : { total: 0, list: [] };
  const delCascCount = confirmDelete
    ? cascadeIds(confirmDelete).reduce((s, c) => s + c.ids.length, 0)
    : 0;

  const executeDelete = () => {
    const rec = confirmDelete;
    if (!rec) return;
    if (delStats.total > 0) {
      const n = setStatusCascade(rec, 'inactive');
      toast(
        `"${labelOf(rec)}" dipakai ${delStats.total} transaksi/relasi — dinonaktifkan, bukan dihapus${n ? `. ${n} data bawahan ikut nonaktif.` : ''}. Riwayat tetap tersimpan.`,
        'info', 5500
      );
    } else {
      remove(cfg.table, rec.id);
      toast(`"${labelOf(rec)}" dihapus permanen — data belum pernah dipakai transaksi mana pun.`, 'success');
    }
    setConfirmDelete(null);
  };

  /* ---------- Upload logo ---------- */
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileAsDataURL(file, (url, err) => {
      if (err || !url) { setErrors((p) => ({ ...p, logo: err || 'Gagal membaca berkas.' })); return; }
      setVal('logo', url);
    });
  };

  /* ---------- Render sel tabel ---------- */
  const renderCell = (r, c) => {
    if (c.render) return c.render(r, db);
    const v = r[c.k];
    switch (c.fmt) {
      case 'rupiah': return formatRupiah(v);
      case 'status': return <StatusChip kind="active" status={r.status || 'active'} />;
      case 'coords':
        return <Typography sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{(+r.lat).toFixed(5)}, {(+r.lng).toFixed(5)}</Typography>;
      case 'tasktype': return TASK_TYPE_LABEL[v] || v;
      case 'km': return `${v} km`;
      default:
        if (Array.isArray(v)) return v.join(', ');
        return v ?? '-';
    }
  };

  /* ---------- Nilai field untuk dialog detail ---------- */
  const renderDetailValue = (f, rec) => {
    const v = rec?.[f.k] ?? f.default;

    // 1. Alokasi Stok Gudang: Sub-Tabel Kompak Bergaris Tipis Halus
    if (f.type === 'gudangAlloc') {
      const list = (db.gudangDetails || []).filter((r) => r.productId === rec.id);
      if (!list.length) {
        return (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Belum ditempatkan di gudang mana pun
          </Typography>
        );
      }
      const totalStok = list.reduce((sum, item) => sum + (Number(item.stokTercatat) || 0), 0);

      return (
        <Box sx={{ width: '100%', mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>Gudang</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>Kode</TableCell>
                <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>Stok Fisik</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((r) => {
                const w = (db.warehouses || []).find((x) => x.id === r.gudangId);
                return (
                  <TableRow key={r.id || r.gudangId}>
                    <TableCell sx={{ fontSize: 12.5, py: 0.75, px: 1.5, fontWeight: 600 }}>{w?.name || '-'}</TableCell>
                    <TableCell sx={{ fontSize: 12, py: 0.75, px: 1.5, color: 'text.secondary' }}>{w?.code || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12.5, py: 0.75, px: 1.5 }}>
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          px: 1,
                          py: 0.25,
                          borderRadius: '4px',
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {r.stokTercatat} pcs
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell colSpan={2} sx={{ fontSize: 12, fontWeight: 750, py: 0.75, px: 1.5 }}>
                  Total Akumulasi Stok
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 800, py: 0.75, px: 1.5, color: 'primary.main' }}>
                  {totalStok} pcs
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      );
    }

    // 2. Multi-Select: Sub-Tabel Baris Penuh Vertikal ke Bawah (Full-Width, Selaras Dialog Detail Produk)
    if (f.type === 'multiSelect') {
      const ids = rec?.[f.k] || [];
      if (!ids.length) {
        return (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Belum ada produk yang terdaftar
          </Typography>
        );
      }
      const isProductTable = f.optionsFrom?.table === 'products';
      return (
        <Box sx={{ width: '100%', mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {isProductTable && (
                  <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary', width: 105 }}>
                    Kode SKU
                  </TableCell>
                )}
                <TableCell sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary' }}>
                  {isProductTable ? 'Nama Produk' : 'Item'}
                </TableCell>
                {isProductTable && (
                  <TableCell align="right" sx={{ fontSize: 11, fontWeight: 700, py: 0.75, px: 1.5, color: 'text.secondary', width: 90 }}>
                    Satuan
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {ids.map((id) => {
                const r2 = (db[f.optionsFrom?.table] || []).find((x) => String(x.id) === String(id));
                const inactive = r2?.status === 'inactive';
                return (
                  <TableRow key={id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    {isProductTable && (
                      <TableCell sx={{ fontSize: 12, py: 0.75, px: 1.5, color: 'text.secondary', fontFamily: 'monospace', verticalAlign: 'top' }}>
                        {r2?.sku || `#${id}`}
                      </TableCell>
                    )}
                    <TableCell sx={{ fontSize: 12.5, py: 0.75, px: 1.5, fontWeight: 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      {r2 ? r2.name : `Produk #${id} (Tidak ditemukan)`}
                      {inactive ? ' (Nonaktif)' : ''}
                    </TableCell>
                    {isProductTable && (
                      <TableCell align="right" sx={{ fontSize: 12, py: 0.75, px: 1.5, verticalAlign: 'top' }}>
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.2,
                            borderRadius: '4px',
                            bgcolor: 'action.hover',
                            border: '1px solid',
                            borderColor: 'divider',
                            fontWeight: 700,
                            fontSize: 11.5,
                          }}
                        >
                          {r2?.unit || '-'}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell colSpan={isProductTable ? 2 : 1} sx={{ fontSize: 12, fontWeight: 750, py: 0.75, px: 1.5 }}>
                  Total {f.l}
                </TableCell>
                {isProductTable && (
                  <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 800, py: 0.75, px: 1.5, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                    {ids.length} produk
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      );
    }

    if (v == null || v === '') return '-';

    // 3. Foto / Berkas: Thumbnail Berbingkai Halus
    if (f.type === 'file') {
      return (
        <Box sx={{ mt: 0.5 }}>
          <Avatar
            src={v}
            variant="rounded"
            sx={{
              width: 72,
              height: 72,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
            }}
          />
        </Box>
      );
    }

    // 4. Dropdown Select Relasi
    if (f.type === 'select') {
      if (f.optionsFrom && f.optionsFrom.table !== 'categories') {
        const ref = (db[f.optionsFrom.table] || []).find((x) => String(x.id) === String(v));
        if (ref) return ref[f.optionsFrom.label || 'name'] ?? ref.name ?? String(v);
      }
      const o = resolveOptions(f, db).find((x) => String(x.v) === String(v));
      return o ? o.l : String(v);
    }

    // 5. Format Rupiah
    if (f.fmt === 'rupiah') return formatRupiah(Number(v));
    return String(v);
  };

  /* ---------- Render field form ---------- */
  /* Penjelasan syarat isi — diturunkan otomatis dari aturan validasi field
     (format angka/huruf, panjang maksimal, format email, rentang angka)
     supaya pengguna tahu ketentuannya SEBELUM terjadi kesalahan. */
  const fieldHint = (f) => {
    if (['select', 'multiSelect', 'file', 'gudangAlloc'].includes(f.type)) return '';
    const parts = [];
    if (f.email) parts.push('Format email, contoh: nama@perusahaan.com.');
    if (f.patternMsg) parts.push(f.patternMsg);
    if (f.type === 'number') {
      if (f.min != null && f.max != null) parts.push(`Isi angka ${f.min}–${f.max}.`);
      else if (f.min != null) parts.push(`Isi angka minimal ${f.min}.`);
      if (f.notZero) parts.push('Tidak boleh 0.');
    } else if (f.max && !f.patternMsg) {
      parts.push(`Maksimal ${f.max} karakter.`);
    }
    return parts.join(' ');
  };

  const fieldProps = (f) => ({
    label: `${f.l}${f.required ? ' *' : ''}`,
    value: values[f.k] ?? '',
    onChange: (e) => setVal(f.k, e.target.value),
    error: !!errors[f.k],
    helperText: errors[f.k] || f.hint || ' ',
  });

  const renderField = (f) => {
    if (f.type === 'gudangAlloc') {
      const activeG = (db.warehouses || []).filter((w) => w.status === 'active');
      const map = values[f.k] || {};
      const inactivePlaced = (db.warehouses || []).filter(
        (w) => w.status !== 'active' && Number(map[w.id]) > 0
      );
      const rowsW = [...activeG, ...inactivePlaced];
      return (
        <Box key={f.k}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {f.l} — stok total produk = penjumlahan penempatan (pcs)
          </Typography>
          {rowsW.length ? (
            <Stack spacing={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
              {rowsW.map((w) => {
                const off = w.status !== 'active';
                return (
                  <Stack key={w.id} direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" noWrap
                      sx={{ flex: 1, minWidth: 0, color: off ? 'text.secondary' : undefined }}>
                      {w.code} — {w.name}{off ? ' (Nonaktif)' : ''}
                    </Typography>
                    <TextField size="small" type="number" placeholder="0" sx={{ width: 110 }}
                      disabled={off}
                      value={map[w.id] ?? ''}
                      onChange={(e) => setVal(f.k, {
                        ...map,
                        [w.id]: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }} />
                  </Stack>
                );
              })}
              <Stack direction="row" justifyContent="space-between"
                sx={{ pt: 0.75, borderTop: '1px dashed', borderColor: 'divider' }}>
                <Typography variant="body2" fontWeight={700}>Total stok produk</Typography>
                <Typography variant="body2" fontWeight={800} color="primary.main">{allocTotal(map)} pcs</Typography>
              </Stack>
            </Stack>
          ) : null}
          {activeG.length === 0 && (
            <Alert severity="info">Belum ada gudang aktif — tambahkan gudang terlebih dahulu di Master Data → Gudang.</Alert>
          )}
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>{errors[f.k]}</Typography>
        </Box>
      );
    }

    if (f.type === 'multiSelect') {
      const { table, onlyActive = false } = f.optionsFrom || {};
      const all = db[table] || [];
      const cur = values[f.k] || [];
      const q = String(values[`${f.k}__q`] ?? '').trim().toLowerCase();
      const isOn = (id) => cur.some((x) => String(x) === String(id));
      const list = onlyActive
        ? [
            ...all.filter((r) => !r.status || r.status === 'active'),
            ...all.filter((r) => r.status === 'inactive' && isOn(r.id)),
          ]
        : all;
      const shown = q
        ? list.filter((r) => `${r.sku || ''} ${r.name}`.toLowerCase().includes(q))
        : list;
      const toggle = (id) => setVal(f.k,
        isOn(id) ? cur.filter((x) => String(x) !== String(id)) : [...cur, Number(id)]
      );
      return (
        <Box key={f.k}>
          <Typography variant="caption" color={errors[f.k] ? 'error' : 'text.secondary'} fontWeight={errors[f.k] ? 700 : 400} sx={{ display: 'block', mb: 0.5 }}>
            {f.l}{f.required ? ' *' : ''} — {cur.length} item dipilih
          </Typography>
          <TextField size="small" fullWidth placeholder="Cari item (SKU / nama)…"
            value={String(values[`${f.k}__q`] ?? '')}
            onChange={(e) => setVal(`${f.k}__q`, e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }}
            sx={{ mb: 1 }} />
          <Stack spacing={0.25}
            sx={{ border: '1px solid', borderColor: errors[f.k] ? 'error.main' : 'divider', borderRadius: 2, p: 0.75, maxHeight: 240, overflowY: 'auto' }}>
            {shown.length ? shown.map((r) => (
              <Stack key={r.id} direction="row" alignItems="center" spacing={0.75}
                onClick={() => toggle(r.id)}
                sx={{ cursor: 'pointer', borderRadius: 1, py: 0.25, px: 0.5, '&:hover': { bgcolor: 'action.hover' } }}>
                <Checkbox size="small" checked={isOn(r.id)} tabIndex={-1} disableRipple />
                <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0, color: r.status === 'inactive' ? 'text.secondary' : undefined }}>
                  {r.sku ? `${r.sku} — ` : ''}{r.name}{r.status === 'inactive' ? ' (Nonaktif)' : ''}
                </Typography>
              </Stack>
            )) : (
              <Typography variant="caption" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                {q ? 'Tidak ada item yang cocok dengan pencarian.' : 'Belum ada data untuk dipilih.'}
              </Typography>
            )}
          </Stack>
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>{errors[f.k]}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {f.hint || 'Centang untuk memilih — daftar dapat digulir dan dicari.'}
          </Typography>
        </Box>
      );
    }

    if (f.type === 'select') {
      let opts = resolveOptions(f, db);
      const cur = values[f.k];
      if (f.optionsFrom && f.optionsFrom.table !== 'categories' && cur !== '' && cur != null
        && !opts.some((o) => String(o.v) === String(cur))) {
        const rec = (db[f.optionsFrom.table] || []).find((x) => String(x.id) === String(cur));
        if (rec) opts = [{ v: cur, l: `${rec.name || cur}${rec.status && rec.status !== 'active' ? ' (Nonaktif)' : ''}` }, ...opts];
      }
      return (
        <TextField key={f.k} select {...fieldProps(f)}>
          {opts.map((o) => (
            <MenuItem key={String(o.v)} value={String(o.v)}>{o.l}</MenuItem>
          ))}
        </TextField>
      );
    }
    if (f.type === 'textarea') {
      return <TextField key={f.k} multiline minRows={2} {...fieldProps(f)} inputProps={{ maxLength: f.max }} />;
    }
    if (f.type === 'number') {
      const numInput = (
        <TextField key={f.k} type="number" {...fieldProps(f)}
          inputProps={{ min: f.min, max: f.max, step: f.step || 1 }} />
      );
      if (cfg.mapPicker && f.k === cfg.mapPicker.latField) {
        const mp = cfg.mapPicker;
        return (
          <Stack key={f.k} spacing={2}>
            <OutletPinPicker
              latVal={values[mp.latField]}
              lngVal={values[mp.lngField]}
              areaId={values[mp.areaField]}
              areas={db.areas || []}
              onPickCoords={(newLat, newLng) => {
                setValues((p) => ({ ...p, [mp.latField]: newLat, [mp.lngField]: newLng }));
                setErrors((p) => ({ ...p, [mp.latField]: '', [mp.lngField]: '', _form: '' }));
              }}
              onFillAddress={(addr) => {
                if (mp.addressField) {
                  setValues((p) => ({ ...p, [mp.addressField]: addr }));
                  setErrors((p) => ({ ...p, [mp.addressField]: '' }));
                }
              }}
            />
            {numInput}
          </Stack>
        );
      }
      return numInput;
    }
    if (f.type === 'file') {
      return (
        <Box key={f.k}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {f.l}{f.required ? ' *' : ''}
          </Typography>
          <input hidden id={`file-${f.k}`} type="file" accept="image/png,image/jpeg" onChange={handleLogoChange} />
          <label htmlFor={`file-${f.k}`}>
            <Button component="span" variant="outlined" startIcon={<UploadFileRoundedIcon />}>Pilih Berkas</Button>
          </label>
          {values[f.k] ? (
            <Avatar src={values[f.k]} variant="rounded" sx={{ mt: 1, width: 72, height: 72, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Belum ada berkas — maksimal 2 MB.</Typography>
          )}
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>{errors[f.k]}</Typography>
        </Box>
      );
    }
    return <TextField key={f.k} {...fieldProps(f)} inputProps={{ maxLength: f.max }} />;
  };

  /* ---------- Dialog form ---------- */
  const formDialog = (
    <Dialog
      open={formOpen}
      onClose={handleUserDismiss}
      TransitionProps={{ onExited: handleFormExited }}
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.25, // 10px — agak tajam dan selaras dengan card lain
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 48px rgba(15,23,42,0.12)',
          m: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: '100%' },
          maxWidth: { xs: '100%', sm: 700 },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2, sm: 3.5 }, pt: 2.5, pb: 1.5, fontWeight: 800, fontSize: 16.5 }}>
        {editing ? `Ubah — ${cfg.title}` : `Tambah — ${cfg.title}`}
      </DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden', px: { xs: 2, sm: 3.5 }, py: 2.5 }}>
        {errors._form && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{errors._form}</Alert>}
        <Stack spacing={2}>{cfg.fields.map(renderField)}</Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3.5 },
          py: 2,
          flexWrap: 'wrap',
          gap: 1.25,
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          '& > button': {
            flex: { xs: '1 1 auto', sm: 'none' },
          },
        }}
      >
        <Button onClick={handleUserDismiss} disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Batal
        </Button>
        {!editing && (
          <Button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Simpan &amp; Tambah Lagi
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => handleSubmit(false)}
          disabled={saving}
          sx={{ textTransform: 'none', fontWeight: 650 }}
        >
          {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  /* ---------- Dialog nonaktifkan / aktifkan ---------- */
  const toggleCascCount = confirmToggle
    ? cascadeIds(confirmToggle).reduce((s, c) => s + c.ids.length, 0)
    : 0;

  const confirmDialog = (
    <ConfirmDialog
      open={!!confirmToggle}
      onClose={() => setConfirmToggle(null)}
      onConfirm={() => { toggleStatus(confirmToggle); setConfirmToggle(null); }}
      title={confirmToggle?.status === 'active' ? 'Nonaktifkan Data' : 'Aktifkan Kembali'}
      message={confirmToggle?.status === 'active'
        ? `Nonaktifkan "${labelOf(confirmToggle)}"?${toggleCascCount ? ` ${toggleCascCount} data bawahan akan ikut nonaktif sementara.` : ''} Data tidak dihapus — hanya berhenti aktif, dan bisa diaktifkan kembali.`
        : `Aktifkan kembali "${labelOf(confirmToggle)}"?${toggleCascCount ? ` ${toggleCascCount} data bawahan akan ikut diaktifkan.` : ''}`}
      confirmLabel={confirmToggle?.status === 'active' ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
      confirmColor={confirmToggle?.status === 'active' ? 'warning' : 'primary'}
    />
  );

  /* ---------- Dialog DETAIL (Baris Daftar Bergaris Tipis Halus) ---------- */
  const detailStats = detailRow ? refStats(detailRow) : { total: 0, list: [] };

  const detailDialog = (
    <Dialog
      open={!!detailRow}
      onClose={() => setDetailRow(null)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.25, // 10px — seragam agak tajam
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 48px rgba(15,23,42,0.12)',
          m: { xs: 1, sm: 2 },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: 16, px: { xs: 2, sm: 3 }, py: 2 }}>
        Detail {cfg.addLabel} — {detailRow ? labelOf(detailRow) : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden', px: { xs: 2, sm: 3 }, py: 2 }}>
        {detailRow && (
          <>
            {/* Header Status & Waktu */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <StatusChip kind="active" status={detailRow.status || 'active'} />
              <Stack direction="row" spacing={0.75}>
                {detailRow.createdAt && (
                  <Box
                    component="span"
                    sx={{
                      px: 0.8,
                      py: 0.3,
                      borderRadius: '4px',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      fontSize: '0.725rem',
                      color: 'text.secondary',
                    }}
                  >
                    Dibuat {detailRow.createdAt}
                  </Box>
                )}
                {detailRow.updatedAt && (
                  <Box
                    component="span"
                    sx={{
                      px: 0.8,
                      py: 0.3,
                      borderRadius: '4px',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      fontSize: '0.725rem',
                      color: 'text.secondary',
                    }}
                  >
                    Diubah {detailRow.updatedAt}
                  </Box>
                )}
              </Stack>
            </Stack>

            {/* Daftar Informasi: Baris Horizontal Bergaris Tipis Halus (Tanpa Kotak Abu) */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden', mb: 2 }}>
              {cfg.fields.map((f, idx) => {
                const val = renderDetailValue(f, detailRow);
                const isBlockNode = f.type === 'gudangAlloc' || f.type === 'multiSelect' || f.type === 'file';
                const isLong = f.type === 'textarea' || isBlockNode;
                return (
                  <Box
                    key={f.k}
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderBottom: idx === cfg.fields.length - 1 ? 'none' : '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: isLong ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: isLong ? 'flex-start' : 'center',
                      gap: isLong ? 0.5 : 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" fontSize={13} sx={{ minWidth: 140, flexShrink: 0 }}>
                      {f.l}
                    </Typography>
                    {isBlockNode ? (
                      <Box sx={{ width: '100%' }}>
                        {val}
                      </Box>
                    ) : (
                      <Typography
                        variant="body2"
                        fontWeight={650}
                        fontSize={13.5}
                        color="text.primary"
                        textAlign={isLong ? 'left' : 'right'}
                        sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word', width: isLong ? '100%' : 'auto' }}
                      >
                        {val}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Seksi Penggunaan Data */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.75 }}>
                Penggunaan Data
              </Typography>
              {detailStats.total > 0 ? (
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                  {detailStats.list.map((s) => (
                    <Box
                      key={s.label}
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.35,
                        borderRadius: '4px',
                        bgcolor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                      }}
                    >
                      {s.n} {s.label}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary" display="block">
                  Belum dipakai transaksi/relasi mana pun — aman untuk dihapus permanen.
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: { xs: 1.5, sm: 2 }, justifyContent: 'flex-end', gap: 1.25 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => setDetailRow(null)}
          sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
        >
          Tutup
        </Button>
        {detailRow && !readOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditRoundedIcon fontSize="small" />}
            onClick={() => { const rec = detailRow; setDetailRow(null); openEdit(rec); }}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 650 }}
          >
            Ubah Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  /* ---------- Dialog HAPUS ---------- */
  const deleteDialog = (
    <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 1.25 } }}>
      <DialogTitle sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
        Hapus {cfg.addLabel} — {confirmDelete ? labelOf(confirmDelete) : ''}
      </DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden' }}>
        {confirmDelete && (delStats.total > 0 ? (
          <>
            <Alert severity="error" sx={{ mb: 1.5 }}>
              <b>PERINGATAN:</b> data ini sudah dipakai oleh <b>{delStats.total}</b> transaksi/relasi.
              Data yang sudah tercatat dalam transaksi <b>tidak bisa dihapus permanen</b> — supaya
              riwayat transaksi lama tetap lengkap. Pilihan yang aman: <b>Nonaktifkan</b>
              (data berhenti aktif, tetapi semua riwayatnya tetap tersimpan).
            </Alert>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, mb: delCascCount ? 1.5 : 0 }}>
              {delStats.list.map((s) => (
                <Chip key={s.label} size="small" color="error" variant="outlined" label={`${s.n} ${s.label}`} />
              ))}
            </Stack>
            {delCascCount > 0 && (
              <Alert severity="warning">
                Nonaktifkan juga <b>{delCascCount} data bawahan</b> yang mengikuti {cfg.addLabel} ini.
              </Alert>
            )}
          </>
        ) : (
          <Alert severity="warning">
            Data ini <b>belum dipakai</b> transaksi/relasi mana pun dan dapat dihapus permanen.
            <b> Tindakan ini tidak dapat dibatalkan.</b>
          </Alert>
        ))}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={() => setConfirmDelete(null)}>Batal</Button>
        {delStats.total > 0 ? (
          <Button variant="contained" color="warning" onClick={() => executeDelete()}>Nonaktifkan Data</Button>
        ) : (
          <Button variant="contained" color="error" onClick={() => executeDelete()}>Hapus Permanen</Button>
        )}
      </DialogActions>
    </Dialog>
  );

  /* ===== Tampilan khusus: profil tunggal PERUSAHAAN ===== */
  if (cfg.single) {
    const rec = rows[0];
    return (
      <Box>
        <PageHeader
          title={cfg.title}
          subtitle={cfg.sub}
          action={rec && !readOnly && (
            <Button variant="contained" startIcon={<EditRoundedIcon />} onClick={() => openEdit(rec)}>
              Ubah Profil
            </Button>
          )}
        />
        {!rec ? (
          <EmptyState message="Profil perusahaan belum diisi." />
        ) : (
          <Card elevation={0} sx={{ maxWidth: 640, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
                {rec.logo ? (
                  <Avatar variant="rounded" src={rec.logo} sx={{ width: 64, height: 64, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} />
                ) : (
                  <Avatar variant="rounded" sx={{ width: 64, height: 64, borderRadius: 2, bgcolor: 'primary.main' }}><DomainRoundedIcon /></Avatar>
                )}
                <Box>
                  <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{rec.name}</Typography>
                  <Chip size="small" variant="outlined" color="primary" label="Identitas resmi dokumen" />
                </Box>
              </Stack>
              <List dense disablePadding>
                {[
                  { icon: <BadgeRoundedIcon fontSize="small" />, label: 'NPWP', value: rec.npwp || '-' },
                  { icon: <MapRoundedIcon fontSize="small" />, label: 'Alamat', value: rec.address || '-' },
                  { icon: <PhoneRoundedIcon fontSize="small" />, label: 'Kontak', value: rec.phone || '-' },
                  { icon: <MailRoundedIcon fontSize="small" />, label: 'Email', value: rec.email || '-' },
                ].map((r) => (
                  <ListItem key={r.label} disableGutters sx={{ py: 0.9, borderBottom: '1px dashed', borderColor: 'divider' }}>
                    <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{r.icon}</ListItemIcon>
                    <ListItemText
                      primary={r.label}
                      secondary={r.value}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{
                        sx: { fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere', wordBreak: 'break-word' },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
              <Alert severity="info" sx={{ mt: 2 }} icon={<InfoRoundedIcon fontSize="small" />}>
                Identitas ini otomatis dipakai pada <b>kop dokumen Quotation &amp; Invoice</b>.
                Rekening pembayaran perusahaan dikelola di <b>Master Data → Bank</b>.
              </Alert>
            </CardContent>
          </Card>
        )}
        {formDialog}
      </Box>
    );
  }

  /* ===== Tampilan standar: tabel CRUD ===== */
  return (
    <Box>
      <PageHeader
        title={cfg.title}
        subtitle={readOnly && (slug === 'sales' || slug === 'bank')
          ? `${cfg.sub} (Akses Lihat Saja — pengelolaan khusus Administrator)`
          : readOnly
            ? `${cfg.sub} (Akses Lihat Saja)`
            : cfg.sub}
        action={!readOnly && (
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate}>
            Tambah {cfg.addLabel}
          </Button>
        )}
      />

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
            <FilterListRoundedIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
          </Stack>
          <TextField size="small" placeholder="Cari data…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flexGrow: 1, minWidth: 200, maxWidth: 340 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>) }} />
          <TextField size="small" select label="Status" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} sx={{ width: 150 }}>
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="active">Aktif</MenuItem>
            <MenuItem value="inactive">Nonaktif</MenuItem>
          </TextField>
          {(cfg.filterRefs || []).map(({ table, field, label }) => (
            <TextField
              size="small"
              select
              label={label}
              value={refFilters[field] || 'all'}
              onChange={(e) => { setRefFilters((p) => ({ ...p, [field]: e.target.value })); }}
              sx={{ width: 170 }}
            >
              <MenuItem value="all">Semua {label}</MenuItem>
              {(db[table] || []).map((r) => (
                <MenuItem key={r.id} value={String(r.id)}>
                  {r.name}{r.status === 'inactive' ? ' (Nonaktif)' : ''}
                </MenuItem>
              ))}
            </TextField>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {filtered.length} dari {rows.length} data
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {cfg.columns.map((c) => <TableCell key={c.k}>{c.l}</TableCell>)}
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? paginated.map((r) => (
              <TableRow key={r.id} sx={{ opacity: r.status === 'inactive' ? 0.55 : 1 }}>
                {cfg.columns.map((c) => (
                  <TableCell key={c.k}>
                    <Box title={typeof r[c.k] === 'string' ? r[c.k] : undefined}
                      sx={{ maxWidth: c.maxW || 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {renderCell(r, c)}
                    </Box>
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title={cfg.detailPage ? 'Detail (halaman khusus)' : 'Detail data'}>
                      <IconButton size="small"
                        onClick={() => (cfg.detailPage ? navigate(`${cfg.detailPage}/${r.id}`) : setDetailRow(r))}>
                        <VisibilityRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!readOnly && (<>
                    <Tooltip title="Ubah data">
                      <IconButton size="small" onClick={() => openEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={r.status === 'active' ? 'Nonaktifkan' : 'Aktifkan kembali'}>
                      <IconButton size="small" color={r.status === 'active' ? 'warning' : 'success'} onClick={() => setConfirmToggle(r)}>
                        {r.status === 'active' ? <LockRoundedIcon fontSize="small" /> : <LockOpenRoundedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Hapus">
                      <IconButton size="small" color="error" onClick={() => setConfirmDelete(r)}>
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    </>)}
                  </Stack>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={cfg.columns.length + 1}><EmptyState message="Data tidak ditemukan." /></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={filtered.length} page={curPage}
          onPageChange={(e, v) => setPage(v)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Baris per halaman"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }} />
      </TableContainer>

      {readOnly && (slug === 'sales' || slug === 'bank') ? (
        <Alert severity="info" sx={{ mt: 1.5 }} icon={<InfoRoundedIcon fontSize="small" />}>
          Pengelolaan data utama <b>{slug === 'bank' ? 'Master Bank' : 'Master Sales'}</b> (Tambah, Ubah, Nonaktifkan/Hapus) dilakukan secara eksklusif oleh <b>Administrator</b>.
        </Alert>
      ) : readOnly ? (
        <Alert severity="info" sx={{ mt: 1.5 }} icon={<InfoRoundedIcon fontSize="small" />}>
          Akses <b>Lihat Saja (Read-Only)</b> — referensi Master Data untuk verifikasi penagihan dan transaksi.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mt: 1.5 }} icon={<InfoRoundedIcon fontSize="small" />}>
          <b>Hapus</b>: data yang belum dipakai transaksi akan dihapus permanen; yang sudah dipakai
          hanya bisa <b>dinonaktifkan</b> (riwayatnya tetap tersimpan). Data bawahan mengikuti status induknya.
        </Alert>
      )}

      {formDialog}
      {confirmDialog}
      {detailDialog}
      {deleteDialog}
    </Box>
  );
}