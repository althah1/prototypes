import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export default function EmptyState({ message = 'Belum ada data.', icon: Icon }) {
  const Ico = Icon || InboxOutlinedIcon;
  return (
    <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
      <Ico sx={{ fontSize: 42, mb: 1 }} />
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
}