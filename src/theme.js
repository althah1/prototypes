import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#2563eb', dark: '#1d4ed8', light: '#dbeafe', contrastText: '#ffffff' },
    secondary: { main: '#7c3aed', dark: '#6d28d9', light: '#ede9fe', contrastText: '#ffffff' },
    info: { main: '#0284c7', dark: '#0369a1', light: '#e0f2fe', contrastText: '#ffffff' },
    success: { main: '#16a34a', dark: '#15803d', light: '#dcfce7', contrastText: '#ffffff' },
    warning: { main: '#d97706', dark: '#b45309', light: '#fef3c7', contrastText: '#ffffff' },
    error: { main: '#dc2626', dark: '#b91c1c', light: '#fee2e2', contrastText: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    divider: '#e2e8f0',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 },
    h6: { fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em', lineHeight: 1.3 },
    subtitle1: { fontWeight: 700, lineHeight: 1.35 },
    subtitle2: { fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.35 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '6px 16px',
          fontWeight: 600,
          textTransform: 'none',
        },
        outlinedInherit: {
          borderColor: '#cbd5e1',
          color: '#334155',
          '&:hover': {
            borderColor: '#94a3b8',
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#cbd5e1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94a3b8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1.5,
          },
          '&.Mui-disabled': {
            backgroundColor: '#f8fafc',
          },
        },
        inputSizeSmall: {
          fontSize: '0.875rem',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        sizeSmall: {
          fontSize: '0.85rem',
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 2,
          marginRight: 2,
          fontSize: '0.735rem',
          lineHeight: 1.35,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          border: '1px solid',
          borderColor: t.palette.divider,
          borderRadius: 10,
          backgroundImage: 'none',
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: 10,
          border: '1px solid',
          borderColor: t.palette.divider,
          boxShadow: '0 16px 48px rgba(15, 23, 42, 0.12)',
          backgroundImage: 'none',
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 800,
          fontSize: '1.025rem',
          padding: '16px 24px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '20px 24px',
        },
        dividers: ({ theme: t }) => ({
          borderColor: t.palette.divider,
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '14px 24px',
          gap: 10,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.84rem',
          alignItems: 'center',
        },
        standardInfo: {
          backgroundColor: '#eff6ff',
          color: '#1e3a8a',
          border: '1px solid #bfdbfe',
          '& .MuiAlert-icon': { color: '#2563eb' },
        },
        standardWarning: {
          backgroundColor: '#fffbeb',
          color: '#78350f',
          border: '1px solid #fde68a',
          '& .MuiAlert-icon': { color: '#d97706' },
        },
        standardError: {
          backgroundColor: '#fef2f2',
          color: '#7f1d1d',
          border: '1px solid #fecaca',
          '& .MuiAlert-icon': { color: '#dc2626' },
        },
        standardSuccess: {
          backgroundColor: '#f0fdf4',
          color: '#14532d',
          border: '1px solid #bbf7d0',
          '& .MuiAlert-icon': { color: '#16a34a' },
        },
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
          whiteSpace: 'nowrap',
        },
        body: {
          fontSize: 13.5,
          borderBottom: '1px solid #f1f5f9',
        },
      },
    },
  },
});

export default theme;
