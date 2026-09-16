import { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const ToastContext = createContext({ toast: () => {} });

/* Pemakaian: const { toast } = useToast(); toast('Pesan', 'success'|'error'|'warning'|'info'); */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, severity = 'info', duration = 3400) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, severity, duration }]);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.map((t) => (
        <Snackbar
          key={t.id}
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          autoHideDuration={t.duration}
          onClose={() => dismiss(t.id)}
        >
          <Alert
            severity={t.severity}
            variant="filled"
            onClose={() => dismiss(t.id)}
            sx={{ minWidth: 280, '& .MuiAlert-message': { fontSize: 14 } }}
          >
            {t.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);