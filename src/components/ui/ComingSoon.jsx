import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import PageHeader from './PageHeader';

export default function ComingSoon({ title, prompt }) {
  return (
    <Box>
      <PageHeader title={title} subtitle="Modul dalam pengembangan bertahap (roadmap prompt)." />
      <Alert severity="info" icon={<ConstructionRoundedIcon fontSize="small" />}>
        Halaman <b>{title}</b> dibangun pada <b>Prompt {prompt}</b>. Struktur menu &amp; routing sudah disiapkan.
      </Alert>
    </Box>
  );
}