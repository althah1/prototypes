import Chip from '@mui/material/Chip';

const MAPS = {
  task: {
    pending: { label: 'Belum Mulai', color: 'default' },
    in_progress: { label: 'Berlangsung', color: 'info' },
    done: { label: 'Selesai', color: 'success' },
    failed: { label: 'Gagal', color: 'error' },
    cancelled: { label: 'Dibatalkan', color: 'warning' },
  },
  order: {
    submitted: { label: 'Diajukan', color: 'warning' },
    approved: { label: 'Disetujui', color: 'success' },
    processing: { label: 'Diproses', color: 'info' },
    shipped: { label: 'Dikirim', color: 'secondary' },
    completed: { label: 'Selesai', color: 'success' },
    rejected: { label: 'Ditolak', color: 'error' },
    cancelled: { label: 'Dibatalkan', color: 'default' },
  },
  quote: {
    draft: { label: 'Draft', color: 'default' },
    pending_approval: { label: 'Menunggu Approval', color: 'warning' },
    sent: { label: 'Terkirim', color: 'info' },
    approved: { label: 'Disetujui', color: 'success' },
    rejected: { label: 'Ditolak', color: 'error' },
    expired: { label: 'Kadaluarsa', color: 'default' },
    converted: { label: 'Jadi Order', color: 'secondary' },
  },
  active: {
    active: { label: 'Aktif', color: 'success' },
    inactive: { label: 'Nonaktif', color: 'default' },
  },
  paid: {
    no: { label: 'Belum Bayar', color: 'warning' },
    yes: { label: 'Lunas', color: 'success' },
  },
};

export default function StatusChip({ kind, status, size = 'small' }) {
  const conf = MAPS[kind]?.[status] || { label: status || '-', color: 'default' };
  return (
    <Chip
      label={conf.label}
      color={conf.color}
      size={size}
      variant={conf.color === 'default' ? 'outlined' : 'filled'}
    />
  );
}