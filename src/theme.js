import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#dbeafe', contrastText: '#ffffff' },
    secondary: { main: '#7c3aed' },
    success: { main: '#16a34a', dark: '#15803d', light: '#dcfce7' },
    warning: { main: '#d97706', dark: '#b45309', light: '#fef3c7' },
    error: { main: '#dc2626', dark: '#b91c1c', light: '#fee2e2' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    divider: '#e2e8f0',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700, fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '6px 16px',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: 10,
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: 11.5,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: '#64748b',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        },
        body: {
          fontSize: 13.5,
        },
      },
    },
  },
});

export default theme;
