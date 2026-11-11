import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  Chip,
  Button,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined';
import PageHeader from '../../components/ui/PageHeader';
import { CardSectionHeader } from '../../components/ui/DetailGrid';
import LeafletMap from '../../components/map/LeafletMap';
import StatusChip from '../../components/ui/StatusChip';

// Data simulasi posisi GPS sales lapangan
const INITIAL_SALES_LOCATIONS = [
  {
    id: 'SLS-001',
    name: 'Budi Santoso',
    wilayah: 'Yogyakarta Kota',
    status: 'Bergerak',
    lat: -7.7956,
    lng: 110.3695,
    lastUpdate: '10 detik yang lalu',
    tokoTujuan: 'Toko Berkah Malioboro',
    dalamRadius: true
  },
  {
    id: 'SLS-002',
    name: 'Dewi Lestari',
    wilayah: 'Sleman Timur',
    status: 'Kunjungan Toko',
    lat: -7.7681,
    lng: 110.3789,
    lastUpdate: '1 menit yang lalu',
    tokoTujuan: 'Minimarket Barokah Gejayan',
    dalamRadius: true
  },
  {
    id: 'SLS-003',
    name: 'Rian Pratama',
    wilayah: 'Bantul Utara',
    status: 'Di Luar Radius',
    lat: -7.8285,
    lng: 110.3541,
    lastUpdate: '3 menit yang lalu',
    tokoTujuan: 'Grosir Sembako Bantul',
    dalamRadius: false
  },
  {
    id: 'SLS-004',
    name: 'Siti Rahma',
    wilayah: 'Kulon Progo',
    status: 'Offline',
    lat: -7.8592,
    lng: 110.1584,
    lastUpdate: '25 menit yang lalu',
    tokoTujuan: 'Outlet Sentolo',
    dalamRadius: true
  }
];

export default function GpsDesktop() {
  const [salesList] = useState(INITIAL_SALES_LOCATIONS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [selectedSales, setSelectedSales] = useState(INITIAL_SALES_LOCATIONS[0]);

  // Filter daftar sales
  const filteredSales = useMemo(() => {
    return salesList.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.wilayah.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        filterStatus === 'Semua' ||
        (filterStatus === 'Aktif' && ['Bergerak', 'Kunjungan Toko'].includes(s.status)) ||
        (filterStatus === 'Pelanggaran' && !s.dalamRadius) ||
        (filterStatus === 'Offline' && s.status === 'Offline');

      return matchSearch && matchStatus;
    });
  }, [salesList, search, filterStatus]);

  // Siapkan marker untuk LeafletMap
  const mapMarkers = useMemo(() => {
    return filteredSales.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      kind: s.dalamRadius ? (s.status === 'Bergerak' ? 'num' : 'outlet') : 'num',
      label: s.name.charAt(0),
      title: s.name,
      subtitle: `${s.status} • ${s.wilayah}`,
      tooltip: `${s.name} — ${s.status}`,
      details: {
        'Toko Tujuan': s.tokoTujuan,
        'Pembaruan Terakhir': s.lastUpdate,
        'Kepatuhan Rute': s.dalamRadius ? 'Dalam Radius (Aman)' : 'Di Luar Radius Toleransi!'
      },
      color: !s.dalamRadius ? 'error' : s.status === 'Offline' ? 'default' : s.status === 'Bergerak' ? 'primary' : 'success'
    }));
  }, [filteredSales]);

  const center = selectedSales ? { lat: selectedSales.lat, lng: selectedSales.lng } : { lat: -7.7956, lng: 110.3695 };

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="Live GPS Tracking & Geofencing"
        subtitle="Pemantauan posisi waktu-nyata sales lapangan, rute perjalanan, dan verifikasi radius kunjungan toko"
        action={
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            onClick={() => {}}
            sx={{ borderRadius: 1 }}
          >
            Segarkan Data
          </Button>
        }
      />

      <Grid container spacing={2.5}>
        {/* PANEL KIRI: Daftar Petugas Sales */}
        <Grid item xs={12} md={4.5} lg={4}>
          <Card sx={{ height: '720px', display: 'flex', flexDirection: 'column' }}>
            <CardSectionHeader
              title="Daftar Sales Lapangan"
              action={
                <Chip
                  label={`${filteredSales.length} Petugas`}
                  size="small"
                  sx={{ fontWeight: 700, borderRadius: '6px' }}
                />
              }
            />

            {/* Pencarian & Filter Cepat */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                size="small"
                placeholder="Cari nama sales atau wilayah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  )
                }}
                fullWidth
              />

              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {['Semua', 'Aktif', 'Pelanggaran', 'Offline'].map((st) => (
                  <Chip
                    key={st}
                    label={st}
                    size="small"
                    onClick={() => setFilterStatus(st)}
                    color={filterStatus === st ? 'primary' : 'default'}
                    variant={filterStatus === st ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* List Petugas Sales */}
            <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
              {filteredSales.map((s) => {
                const isSelected = selectedSales?.id === s.id;
                return (
                  <ListItem key={s.id} disablePadding divider>
                    <ListItemButton
                      onClick={() => setSelectedSales(s)}
                      selected={isSelected}
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 1,
                        bgcolor: isSelected ? 'action.selected' : 'inherit'
                      }}
                    >
                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {s.name}
                        </Typography>
                        <StatusChip kind="gps" status={s.status} size="small" />
                      </Box>

                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Wilayah: <strong>{s.wilayah}</strong> • Menuju: {s.tokoTujuan}
                      </Typography>

                      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          Terakhir: {s.lastUpdate}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Card>
        </Grid>

        {/* PANEL KANAN: Peta Leaflet Interaktif */}
        <Grid item xs={12} md={7.5} lg={8}>
          <Card sx={{ height: '720px', display: 'flex', flexDirection: 'column' }}>
            <CardSectionHeader
              title="Peta Sebaran Real-Time & Geofencing"
              action={
                selectedSales && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<MyLocationOutlinedIcon />}
                    onClick={() => {}}
                    sx={{ borderRadius: 1 }}
                  >
                    Fokus: {selectedSales.name}
                  </Button>
                )
              }
            />
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
              <LeafletMap
                center={center}
                zoom={14}
                markers={mapMarkers}
                height="100%"
              />
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
