import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';

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
      {/* Panel kiri — brand (desktop only) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 440,
          flexShrink: 0,
          p: 5,
          color: '#ffffff',
          background: 'linear-gradient(150deg, #1e3a8a 0%, #1e40af 55%, #2563eb 100%)',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar variant="rounded" sx={{ bgcolor: '#ffffff', color: 'primary.dark', fontWeight: 800, borderRadius: 1.25 }}>
            S
          </Avatar>
          <Box>
            <Typography fontWeight={800} fontSize={18} lineHeight={1.1}>
              SFA
            </Typography>
            <Typography fontSize={12} sx={{ opacity: 0.85 }}>
              Sales Force Automation
            </Typography>
          </Box>
        </Stack>

        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom sx={{ lineHeight: 1.3, letterSpacing: '-0.02em' }}>
            Digitalisasi Operasional<br />Penjualan Lapangan
          </Typography>
          <List dense disablePadding sx={{ color: 'rgba(255,255,255,0.92)', mt: 2 }}>
            {POINTS.map((p) => (
              <ListItem key={p.text} disableGutters sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 32, color: '#ffffff' }}>{p.icon}</ListItemIcon>
                <ListItemText primary={p.text} primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Typography fontSize={11.5} sx={{ opacity: 0.75 }}>
          SFA Prototype • Sprint 5 — SMK 1 Muhammadiyah Yogyakarta
        </Typography>
      </Box>

      {/* Panel kanan — form card */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 3 } }}>
        <Card
          elevation={0}
          sx={{
            maxWidth: 440,
            width: '100%',
            borderRadius: 1.25,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: '0.85rem' }}>
                {subtitle}
              </Typography>
            )}
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
