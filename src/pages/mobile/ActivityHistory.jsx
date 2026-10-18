import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';

import EmptyState from '../../components/ui/EmptyState';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { todayISO, formatRupiah, formatDistance } from '../../utils/helpers';

const TYPE_CONFIG = {
  checkin: { label: 'Check-In GPS', icon: LocationOnRoundedIcon, color: 'info' },
  order:   { label: 'Entry Order',   icon: ShoppingCartRoundedIcon, color: 'primary' },
  quote:   { label: 'Quotation',     icon: DescriptionRoundedIcon,  color: 'secondary' },
  audit:   { label: 'Audit Toko',    icon: FactCheckRoundedIcon,    color: 'success' },
  task:    { label: 'Tugas Selesai', icon: CheckCircleRoundedIcon,  color: 'success' },
};

export default function ActivityHistory() {
  const { user } = useAuth();
  const { db } = useDb();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  const today = todayISO();
  const outletOf = (id) => (db.outlets || []).find((o) => o.id === id) || {};

  /* Agregasi semua stream aktivitas sales */
  const activities = useMemo(() => {
    const list = [];
    const sid = user.salesId;

    (db.checkins || []).filter((c) => c.salesId === sid).forEach((c) => {
      const out = outletOf(c.outletId);
      list.push({
        id: `ck-${c.id}`,
        type: 'checkin',
        date: c.date,
        ts: c.ts,
        outletName: out.name || 'Outlet',
        title: `Check-In di ${out.name || 'Outlet'}`,
        desc: `Jarak ${formatDistance(c.distM)} • ${c.note || (c.areaOk ? 'Dalam wilayah' : 'Luar wilayah')}`,
        raw: c,
      });
    });

    (db.orders || []).filter((o) => o.salesId === sid).forEach((o) => {
      const out = outletOf(o.outletId);
      list.push({
        id: `ord-${o.id}`,
        type: 'order',
        date: o.date,
        ts: o.createdAt || `${o.date} 00:00:00`,
        outletName: out.name || 'Outlet',
        title: `Order ${o.no}`,
        desc: `${out.name} • ${formatRupiah(o.total)}`,
        status: o.status,
        statusKind: 'order',
        raw: o,
      });
    });

    (db.quotations || []).filter((q) => q.salesId === sid).forEach((q) => {
      const out = outletOf(q.outletId);
      list.push({
        id: `quo-${q.id}`,
        type: 'quote',
        date: q.date,
        ts: q.createdAt || `${q.date} 00:00:00`,
        outletName: out.name || 'Outlet',
        title: `Quotation ${q.no}`,
        desc: `${out.name} • ${formatRupiah(q.total)} (${q.metodePembayaran})`,
        status: q.status,
        statusKind: 'quote',
        raw: q,
      });
    });

    (db.audits || []).filter((a) => a.salesId === sid).forEach((a) => {
      const out = outletOf(a.outletId);
      list.push({
        id: `aud-${a.id}`,
        type: 'audit',
        date: a.date,
        ts: a.createdAt || `${a.date} 00:00:00`,
        outletName: out.name || 'Outlet',
        title: `Audit ${a.no}`,
        desc: `${out.name} • Skor ${a.score}/100 • ${a.photos?.length || 0} foto`,
        status: a.status,
        statusKind: 'audit',
        raw: a,
      });
    });

    (db.tasks || []).filter((t) => t.salesId === sid && t.status === 'done').forEach((t) => {
      const out = outletOf(t.outletId);
      list.push({
        id: `tsk-${t.id}`,
        type: 'task',
        date: t.date,
        ts: t.completedAt || t.createdAt || `${t.date} 00:00:00`,
        outletName: out.name || 'Outlet',
        title: `Tugas Selesai: ${out.name}`,
        desc: `Tipe tugas: ${t.type.toUpperCase()}`,
        status: 'done',
        statusKind: 'task',
        raw: t,
      });
    });

    /* Urutkan kronologis terbalik (paling baru di atas) */
    return list.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  }, [db, user.salesId]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (filterDate === 'today' && a.date !== today) return false;
      return true;
    });
  }, [activities, filterType, filterDate, today]);

  return (
    <Stack spacing={2} sx={{ pb: 6 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate('/app')} sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} noWrap>Riwayat Aktivitas</Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            Timeline seluruh kunjungan & transaksi lapangan
          </Typography>
        </Box>
        <Chip size="small" variant="outlined" label={`${filtered.length} log`} />
      </Stack>

      {/* Filter Toolbar */}
      <Stack direction="row" spacing={1}>
        <TextField select size="small" label="Waktu" value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)} sx={{ flex: 1 }}>
          <MenuItem value="all">Semua Waktu</MenuItem>
          <MenuItem value="today">Hari Ini</MenuItem>
        </TextField>
        <TextField select size="small" label="Jenis Aktivitas" value={filterType}
          onChange={(e) => setFilterType(e.target.value)} sx={{ flex: 1.5 }}>
          <MenuItem value="all">Semua Aktivitas</MenuItem>
          <MenuItem value="checkin">Check-In GPS</MenuItem>
          <MenuItem value="order">Entry Order</MenuItem>
          <MenuItem value="quote">Quotation</MenuItem>
          <MenuItem value="audit">Audit Toko</MenuItem>
          <MenuItem value="task">Tugas Selesai</MenuItem>
        </TextField>
      </Stack>

      {/* Timeline List */}
      {filtered.length ? filtered.map((act) => {
        const meta = TYPE_CONFIG[act.type] || TYPE_CONFIG.order;
        const Icon = meta.icon;
        return (
          <Card key={act.id} elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar variant="rounded" sx={{ bgcolor: `${meta.color}.main`, width: 38, height: 38, borderRadius: 2 }}>
                  <Icon fontSize="small" sx={{ color: 'common.white' }} />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography fontWeight={700} fontSize={14} noWrap>{act.title}</Typography>
                    {act.status && <StatusChip kind={act.statusKind} status={act.status} />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, mt: 0.25 }} noWrap>
                    {act.desc}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                    {act.ts} WIB
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        );
      }) : (
        <EmptyState message="Belum ada riwayat aktivitas pada filter yang dipilih." />
      )}
    </Stack>
  );
}
