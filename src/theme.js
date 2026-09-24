import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#dbeafe', contrastText: '#fff' },
    secondary: { main: '#7c3aed' },
    success: { main: '#16a34a' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
    divider: '#e2e8f0',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700, fontSize: '1.05rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          border: '1px solid',
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase',
          letterSpacing: 0.4, color: '#64748b', backgroundColor: '#f8fafc',
        },
      },
    },
  },
});

export default theme;