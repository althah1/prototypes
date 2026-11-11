import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

export default function FilterToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Cari data…',
  hideSearch = false,
  searchWidth = { minWidth: 210, maxWidth: 320 },
  label = 'Filter',
  countText,
  shownCount,
  totalCount,
  unitLabel = 'data',
  hasActiveFilter = false,
  onReset,
  rightSlot = null,
  children,
  sx,
}) {
  const summary =
    countText ??
    (shownCount != null && totalCount != null
      ? `Menampilkan ${shownCount} dari ${totalCount} ${unitLabel}`
      : null);

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.25,
        bgcolor: 'background.paper',
        p: 1.5,
        mb: 2,
        ...sx,
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          flexWrap: 'wrap',
          rowGap: 1.25,
          alignItems: 'center',
        }}
      >
        {label && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.5, flexShrink: 0 }}
          >
            <FilterListRoundedIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.825rem' }}>
              {label}
            </Typography>
          </Stack>
        )}

        {!hideSearch && onSearchChange && (
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{
              flexGrow: 1,
              minWidth: searchWidth.minWidth || 210,
              maxWidth: searchWidth.maxWidth || 320,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchValue ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Hapus pencarian"
                    onClick={() => onSearchChange('')}
                    sx={{ p: 0.35 }}
                  >
                    <CloseRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        )}

        {children}

        {hasActiveFilter && onReset && (
          <Button
            size="small"
            variant="text"
            color="inherit"
            startIcon={<RestartAltRoundedIcon fontSize="small" />}
            onClick={onReset}
            sx={{ color: 'text.secondary', fontWeight: 600, px: 1 }}
          >
            Reset
          </Button>
        )}

        {(summary || rightSlot) && (
          <Box
            sx={{
              ml: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              flexShrink: 0,
            }}
          >
            {summary && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {summary}
              </Typography>
            )}
            {rightSlot}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
