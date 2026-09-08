import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';

const POINTS = [
  { icon: <TaskAltRoundedIcon />, text: 'Otomatisasi tugas & rute kunjungan harian' },
  { icon: <LocationOnRoundedIcon />, text: 'Validasi GPS, geofencing & live tracking' },
  { icon: <DescriptionRoundedIcon />, text: 'Entry Order & Quotation otomatis (PDF)' },
  { icon: <FactCheckRoundedIcon />, text: 'Audit digital + foto bukti kunjungan' },
  { icon: <Inventory2RoundedIcon />, text: 'Master data terpusat (10 entitas inti)' },
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {/* Panel kiri — brand (sembunyi di layar kecil) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 440,
          flexShrink: 0,
          p: 5,
          color: '#fff',
          background: 'linear-gradient(150deg,#1e3a8a,#1e40af 55%,#2563eb)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" sx={{ bgcolor: '#fff', color: 'primary.dark', fontWeight: 800 }}>S</Avatar>
          <Box>
            <Typography fontWeight={800} fontSize={18} lineHeight={1.1}>SFA</Typography>
            <Typography fontSize={12} sx={{ opacity: 0.85 }}>Sales Force Automation</Typography>
          </Box>
        </Stack>

        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ lineHeight: 1.35 }}>
            Digitalisasi Operasional<br />Penjualan Lapangan
          </Typography>
          <List dense sx={{ color: 'rgba(255,255,255,0.92)' }}>
            {POINTS.map((p) => (
              <ListItem key={p.text} disableGutters>
                <ListItemIcon sx={{ minWidth: 34, color: '#fff' }}>{p.icon}</ListItemIcon>
                <ListItemText primary={p.text} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Typography fontSize={11} sx={{ opacity: 0.7 }}>
          SFA Prototype • Sprint 5 — SMK 1 Muhammadiyah Yogyakarta
        </Typography>
      </Box>

      {/* Panel kanan — form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ maxWidth: 430, width: '100%' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" gutterBottom>{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{subtitle}</Typography>
            )}
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}