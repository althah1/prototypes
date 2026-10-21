import Box from '@mui/material/Box';

const MAPS = {
  task: {
    pending:     { label: 'Belum Mulai', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
    in_progress: { label: 'Berlangsung', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    done:        { label: 'Selesai',     bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    failed:      { label: 'Gagal',       bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    cancelled:   { label: 'Dibatalkan',  bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  },
  order: {
    submitted:   { label: 'Diajukan',    bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    approved:    { label: 'Disetujui',   bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    processing:  { label: 'Diproses',    bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    shipped:     { label: 'Dikirim',     bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
    completed:   { label: 'Selesai',     bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    rejected:    { label: 'Ditolak',     bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    cancelled:   { label: 'Dibatalkan',  bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
  },
  quote: {
    draft:            { label: 'Draft',             bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
    pending_approval: { label: 'Menunggu Approval', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    sent:             { label: 'Terkirim',          bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    approved:         { label: 'Disetujui',         bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    rejected:         { label: 'Ditolak',           bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    expired:          { label: 'Kadaluarsa',        bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    converted:        { label: 'Jadi Order',        bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  },
  audit: {
    submitted: { label: 'Terkirim', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    draft:     { label: 'Draft',    bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
  },
  active: {
    active:   { label: 'Aktif',    bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    inactive: { label: 'Nonaktif', bg: '#f8fafc', color: '#64748b', border: '#cbd5e1' },
  },
  paid: {
    no:          { label: 'Belum Bayar', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' },
    partial:     { label: 'Belum Lunas', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    yes:         { label: 'Lunas',       bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    cancelled:   { label: 'Dibatalkan',  bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
    overdue:     { label: 'Jatuh Tempo', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  },
};

export default function StatusChip({ kind, status, label, icon = null, size = 'small' }) {
  const conf = MAPS[kind]?.[status] || { label: status || '-', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
  const isSmall = size === 'small';
  const displayLabel = label || conf.label;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: isSmall ? 0.9 : 1.25,
        py: isSmall ? 0.3 : 0.45,
        borderRadius: '4px',
        bgcolor: conf.bg,
        color: conf.color,
        border: '1px solid',
        borderColor: conf.border,
        fontSize: isSmall ? '0.725rem' : '0.8rem',
        fontWeight: 650,
        lineHeight: 1.2,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {icon}
      {displayLabel}
    </Box>
  );
}
