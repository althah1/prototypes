import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Konfirmasi', message,
  confirmLabel = 'Ya, Lanjutkan', confirmColor = 'primary',
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ overflowWrap: 'anywhere' }}>{title}</DialogTitle>
      <DialogContent sx={{ overflowX: 'hidden' }}>
        <DialogContentText sx={{ overflowWrap: 'anywhere' }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Batal</Button>
        <Button onClick={onConfirm} variant="contained" color={confirmColor}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}