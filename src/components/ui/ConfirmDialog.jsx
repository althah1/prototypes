import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, Lanjutkan',
  confirmColor = 'primary',
  loading = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1.25,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 48px rgba(15, 23, 42, 0.12)',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, fontSize: '1rem', overflowWrap: 'anywhere' }}>
        {title}
      </DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden', py: 2 }}>
        <DialogContentText
          sx={{
            color: 'text.primary',
            fontSize: '0.875rem',
            lineHeight: 1.55,
            overflowWrap: 'anywhere',
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'flex-end', gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          disabled={loading}
          sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
        >
          Batal
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          disabled={loading}
          sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 650 }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
