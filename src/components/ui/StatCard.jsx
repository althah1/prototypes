import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

export default function StatCard({ icon, value, label, color = 'primary' }) {
  const theme = useTheme();
  const paletteColor = theme.palette[color] || theme.palette.primary;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'all 0.18s ease-in-out',
        '&:hover': {
          borderColor: alpha(paletteColor.main, 0.4),
          boxShadow: `0 4px 16px ${alpha(paletteColor.main, 0.08)}`,
        },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: 2, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: alpha(paletteColor.main, 0.1),
            color: paletteColor.main,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.2,
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{
              display: 'block',
              fontWeight: 650,
              fontSize: '0.725rem',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              mt: 0.35,
            }}
          >
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
