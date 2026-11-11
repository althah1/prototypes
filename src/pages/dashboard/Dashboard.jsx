import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import StoreOutlinedIcon from '@mui/icons-material/StoreOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import { CardSectionHeader } from '../../components/ui/DetailGrid';
import { useDb } from '../../store/DbContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { db } = useDb();

  const orders = db.orders || [];
  const tasks = db.tasks || [];
  const audits = db.audits || [];
  const prospects = db.prospects || [];

  const stats = useMemo(() => {
    const totalOmzet = orders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const orderSelesai = orders.filter((o) => ['Selesai', 'Terkirim', 'Lunas', 'completed'].includes(o.status)).length;
    const taskSelesai = tasks.filter((t) => ['Selesai', 'Completed', 'done'].includes(t.status)).length;
    const totalToko = prospects.length + audits.length;

    return {
      omzet: totalOmzet,
      orderCount: orders.length,
      orderSuccessRate: orders.length ? Math.round((orderSelesai / orders.length) * 100) : 0,
      taskProgress: tasks.length ? Math.round((taskSelesai / tasks.length) * 100) : 0,
      totalToko
    };
  }, [orders, tasks, audits, prospects]);

  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 5);
  }, [orders]);

  const recentAudits = useMemo(() => {
    return [...audits].slice(0, 5);
  }, [audits]);

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="Ringkasan Operasional Sales"
        subtitle="Pantau kinerja penjualan, progres kunjungan lapangan, dan pemantauan toko secara terpusat"
      />

      {/* Grid Kartu Metrik Utama */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUpOutlinedIcon />}
            value={`Rp ${stats.omzet.toLocaleString('id-ID')}`}
            label="Total Estimasi Omzet"
            subtitle="Akumulasi seluruh Sales Order aktif"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ShoppingCartOutlinedIcon />}
            value={stats.orderCount}
            label="Total Sales Order"
            subtitle={`${stats.orderSuccessRate}% pesanan telah terselesaikan`}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AssignmentOutlinedIcon />}
            value={`${stats.taskProgress}%`}
            label="Tugas & Kunjungan Sales"
            subtitle="Persentase penyelesaian agenda rute"
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<StoreOutlinedIcon />}
            value={stats.totalToko}
            label="Basis Toko & Prospek"
            subtitle="Total toko teraudit & prospek baru"
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Konten 2 Kolom: Order Terbaru & Progres Sales */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Kolom Kiri: Tabel Order Terbaru */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardSectionHeader
              title="Sales Order Terbaru"
              action={
                <Tooltip title="Buka Halaman Transaksi Order">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => navigate('/dashboard/transaksi/order')}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <ArrowForwardOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            />
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>No. Order / Toko</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sales / Waktu</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Total Nilai</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
                        Belum ada transaksi sales order yang tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentOrders.map((ord, idx) => (
                      <TableRow key={ord.id || idx} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {ord.nomor || `ORD-${ord.id}`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {ord.namaToko || ord.customer || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {ord.sales || ord.salesName || '-'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {ord.tanggal || ord.date || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 700 }}>
                          Rp {Number(ord.total || 0).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <StatusChip kind="order" status={ord.status || 'Draft'} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Kolom Kanan: Ringkasan Kunjungan & Audit */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardSectionHeader
              title="Aktivitas Audit Toko Terakhir"
              action={
                <Tooltip title="Lihat Seluruh Audit">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => navigate('/dashboard/audit/kualifikasi')}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <ArrowForwardOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            />
            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentAudits.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">Belum ada data audit toko fisik.</Typography>
                </Box>
              ) : (
                recentAudits.map((item, i) => (
                  <Box
                    key={item.id || i}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.75,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.namaToko || item.name || '-'}
                      </Typography>
                      <StatusChip kind="prospect" status={item.statusLead || item.status || 'Prospek'} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Auditor: {item.auditor || item.salesName || '-'}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Skor: {item.skor || item.score || 0}/100
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(item.skor || item.score || 0, 100)}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Peringatan Pelanggaran Wilayah / Geofencing */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <WarningAmberOutlinedIcon color="warning" />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Informasi Kepatuhan Rute & Geofencing Sales
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Seluruh koordinat GPS sales diperbarui setiap 30 detik saat jam operasional. Petugas lapangan yang berada di luar toleransi radius kunjungan (200 meter dari toko) akan otomatis ditandai sebagai deviasi rute pada modul Live Monitoring.
        </Typography>
      </Card>
    </Box>
  );
}
