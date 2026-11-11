import Box from '@mui/material/Box';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

/**
 * ModalHeader — Header dialog standar dengan judul tebal dan tombol X di kanan atas
 */
export function ModalHeader({ title, subtitle, onClose, sx }) {
  return (
    <DialogTitle
      sx={{
        fontWeight: 800,
        fontSize: '1.025rem',
        px: { xs: 2, sm: 3 },
        py: 2,
        position: 'relative',
        pr: onClose ? 6 : 3,
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="inherit" component="div" sx={{ overflowWrap: 'anywhere' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {onClose && (
        <IconButton
          aria-label="Tutup dialog"
          size="small"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 14,
            color: 'text.secondary',
            bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      )}
    </DialogTitle>
  );
}

/**
 * FormSection — Pemisah seksi formulir bersih bergaris tipis pengganti SectionLabel nomor bulat
 */
export function FormSection({ title, subtitle, sx }) {
  return (
    <Box sx={{ pt: 1, pb: 0.5, borderBottom: '1px solid', borderColor: 'divider', mb: 1.5, ...sx }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'text.primary' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

/**
 * CardSectionHeader — Header seragam untuk panel kartu bergaris bawah
 */
export function CardSectionHeader({ title, subtitle, action, sx }) {
  return (
    <Box sx={{
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 750, fontSize: '0.9rem', color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

/**
 * DetailGrid — Penampil field pasangan label-nilai standar (Key-Value)
 */
export default function DetailGrid({ items = [], columns = 1, sx }) {
  const validItems = items.filter(Boolean);
  if (!validItems.length) return null;

  if (columns === 2) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.25,
          bgcolor: 'background.paper',
          overflow: 'hidden',
          ...sx,
        }}
      >
        {validItems.map((item, idx) => {
          const fullSpan = Boolean(item.isLong || item.span === 2);
          const content = item.customNode !== undefined ? item.customNode : (item.value ?? '-');
          return (
            <Box
              key={item.key || item.label || idx}
              sx={{
                gridColumn: fullSpan ? { xs: '1 / -1', sm: '1 / -1' } : 'auto',
                px: 2,
                py: 1.25,
                borderBottom: '1px solid',
                borderRight: { xs: 'none', sm: fullSpan ? 'none' : '1px solid' },
                borderColor: 'divider',
                marginBottom: '-1px',
                marginRight: { xs: 0, sm: fullSpan ? 0 : '-1px' },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  fontSize: '0.685rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 0.35,
                }}
              >
                {item.label}
              </Typography>
              <Typography
                variant="body2"
                component="div"
                sx={{
                  fontWeight: 650,
                  fontSize: '0.845rem',
                  color: 'text.primary',
                  fontFamily: item.mono ? 'monospace' : 'inherit',
                  fontVariantNumeric: item.tabular ? 'tabular-nums' : 'normal',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
                }}
              >
                {content}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.25,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {validItems.map((item, idx) => {
        const isLong = Boolean(item.isLong || item.fullWidth);
        const content = item.customNode !== undefined ? item.customNode : (item.value ?? '-');
        const isLast = idx === validItems.length - 1;

        return (
          <Box
            key={item.key || item.label || idx}
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: isLast ? 'none' : '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: isLong ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isLong ? 'flex-start' : 'center',
              gap: isLong ? 0.5 : 2,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 13, minWidth: 140, flexShrink: 0 }}
            >
              {item.label}
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{
                fontWeight: 650,
                fontSize: 13.5,
                color: 'text.primary',
                textAlign: isLong ? 'left' : 'right',
                fontFamily: item.mono ? 'monospace' : 'inherit',
                fontVariantNumeric: item.tabular ? 'tabular-nums' : 'normal',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'pre-line',
                width: isLong ? '100%' : 'auto',
              }}
            >
              {content}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
