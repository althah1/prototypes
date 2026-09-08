import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

export default function StatCard({ icon, value, label, color = 'primary' }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, '&:last-child': { pb: 2 } }}>
        <Avatar variant="rounded" sx={{ bgcolor: `${color}.main`, width: 44, height: 44 }}>
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" noWrap>{value}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}