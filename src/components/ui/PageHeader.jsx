import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 2.5, flexWrap: 'wrap' }}
    >
      <Box>
        <Typography variant="h5" gutterBottom>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}