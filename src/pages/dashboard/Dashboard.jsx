import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import DirectionsRunRoundedIcon from '@mui/icons-material/DirectionsRunRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { todayISO, formatRupiah } from '../../utils/helpers';

const ORDER_ROW_STYLE = { py: 1, borderBottom: '1px dashed', borderColor: 'divider', cursor: 'pointer' };

export default function Dashboard() {
  const { user } = useAuth();
  const { db } = useDb();
  const navigate = useNavigate();
  const today = todayISO();
  const outletOf = (id) => (db.outlets.find((o) => o.id === id) || {}).name || '-';

  const tasksToday = db.tasks.filter((t) => t.date === today);
  const doneToday = tasksToday.filter((t) => t.status === 'done').length;
  const ordersToday = db.orders.filter((o) => o.date === today);
  const pending = db.orders.filter((o) => o.status === 'submitted');

  /* ===== Tampilan Finance ===== */
  if (user.role === 'finance') {
    const invoices = db.orders.filter((o) => !['submitted', 'rejected', 'cancelled'].includes(o.status));
    const unpaid = invoices.filter((o) => !o.paid);
    const paid = invoices.filter((o) => o.paid);
    return (
      <Box>
        <PageHeader
          title="Dashboard Finance"
          subtitle={`Ringkasan tagihan & pembayaran — ${today}`}
          action={<Button variant="contained" onClick={() => navigate('/dashboard/billing')} endIcon={<ArrowForwardRoundedIcon />}>Kelola Billing</Button>}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 1.5, mb: 2 }}>
          <StatCard icon={<ReceiptLongRoundedIcon />} value={invoices.length} label="Total invoice" />
          <StatCard icon={<ScheduleRoundedIcon />} value={formatRupiah(unpaid.reduce((s, o) => s + o.total, 0))} label="Belum dibayar" color="warning" />
          <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(paid.reduce((s, o) => s + o.total, 0))} label="Sudah lunas" color="success" />
        </Box>
        <Card>
          <CardHeader title="Invoice Terbaru" titleTypographyProps={{ fontSize: 15, fontWeight: 700 }} />
          <CardContent>
            {invoices.length ? invoices.slice(-6).reverse().map((o) => (
              <Stack key={o.id} direction="row" justifyContent="space-between" alignItems="center" sx={ORDER_ROW_STYLE} onClick={() => navigate('/dashboard/billing')}>
                <Box>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{o.no}</Typography>
                  <Typography variant="caption" color="text.secondary">{outletOf(o.outletId)} • {o.date}</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={700}>{formatRupiah(o.total)}</Typography>
                  <StatusChip kind="paid" status={o.paid ? 'yes' : 'no'} />
                </Stack>
              </Stack>
            )) : <EmptyState message="Belum ada invoice dari order yang disetujui." />}
          </CardContent>
        </Card>
      </Box>
    );
  }

  /* ===== Tampilan Admin / Supervisor ===== */
  const recentOrders = [...db.orders].reverse().slice(0, 6);
  const activeSales = db.sales.filter((s) => s.status === 'active');

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle={`Ringkasan operasional penjualan lapangan — ${today}`} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<DirectionsRunRoundedIcon />} value={activeSales.length} label="Sales aktif" />
        <StatCard icon={<StorefrontRoundedIcon />} value={db.outlets.filter((o) => o.status === 'active').length} label="Outlet aktif" color="secondary" />
        <StatCard icon={<TaskAltRoundedIcon />} value={`${doneToday}/${tasksToday.length}`} label="Tugas selesai hari ini" color="success" />
        <StatCard icon={<ReceiptLongRoundedIcon />} value={ordersToday.length} label="Order hari ini" color="warning" />
        <StatCard icon={<ScheduleRoundedIcon />} value={pending.length} label="Menunggu approval" color="error" />
        <StatCard icon={<PaymentsRoundedIcon />} value={formatRupiah(ordersToday.reduce((s, o) => s + o.total, 0))} label="Nilai order hari ini" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { lg: '1.3fr 1fr' }, gap: 2 }}>
        <Card>
          <CardHeader
            title="Progres Tugas per Sales (Hari Ini)"
            titleTypographyProps={{ fontSize: 15, fontWeight: 700 }}
            action={user.role === 'supervisor' && (
              <Button size="small" onClick={() => navigate('/dashboard/tasks')} endIcon={<ArrowForwardRoundedIcon />}>Kelola Jadwal</Button>
            )}
          />
          <CardContent>
            {activeSales.map((s) => {
              const list = tasksToday.filter((t) => t.salesId === s.id);
              const done = list.filter((t) => t.status === 'done').length;
              const pct = list.length ? Math.round((done / list.length) * 100) : 0;
              return (
                <Box key={s.id} sx={{ mb: 1.75, '&:last-child': { mb: 0 } }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{done}/{list.length} • {pct}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 99 }} />
                </Box>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Order Terbaru"
            titleTypographyProps={{ fontSize: 15, fontWeight: 700 }}
            action={<Button size="small" onClick={() => navigate('/dashboard/orders')} endIcon={<ArrowForwardRoundedIcon />}>Lihat Semua</Button>}
          />
          <CardContent>
            {recentOrders.length ? recentOrders.map((o) => (
              <Stack key={o.id} direction="row" justifyContent="space-between" alignItems="center" sx={ORDER_ROW_STYLE} onClick={() => navigate('/dashboard/orders')}>
                <Box>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{o.no}</Typography>
                  <Typography variant="caption" color="text.secondary">{outletOf(o.outletId)} • {o.date}</Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={700}>{formatRupiah(o.total)}</Typography>
                  <StatusChip kind="order" status={o.status} />
                </Stack>
              </Stack>
            )) : <EmptyState message="Belum ada order." />}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}