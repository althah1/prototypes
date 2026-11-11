import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  actionLabel,
  actionIcon: ActionIcon,
  onActionClick
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        width: '100%',
        mb: 2.5,
        gap: 2
      }}
    >
      {/* Sisi Kiri: Ikon & Judul Halaman */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        {Icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 1.25,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              color: 'primary.main',
              flexShrink: 0
            }}
          >
            <Icon fontSize="medium" />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Sisi Kanan: Tombol Aksi (DIKUNCI RATA KANAN) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: { sm: 'auto' }, flexShrink: 0 }}>
        {action}
        {actionLabel && (
          <Button
            variant="contained"
            color="primary"
            startIcon={ActionIcon ? <ActionIcon /> : <AddRoundedIcon />}
            onClick={onActionClick}
            sx={{
              borderRadius: 1,
              fontWeight: 700,
              textTransform: 'none',
              px: 2.25,
              py: 0.85,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' }
            }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
