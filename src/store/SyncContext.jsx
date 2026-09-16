import { createContext, useContext, useState } from 'react';
import { useDb } from './DbContext';
import { useToast } from '../components/ui/ToastProvider';
import { nowStamp } from '../utils/helpers';

const KEY = 'sfa_react_online';
const SyncContext = createContext(null);

/*
 * Pemakaian:
 *  - const { online, toggleOnline, queueCount } = useSync();  → indikator & toggle
 *  - enqueue('order', payload) / enqueue('audit', payload)    → simpan offline (dipakai modul Order & Audit)
 *  - notify(userId, title, body)                              → kirim notifikasi ke pengguna
 */
export function SyncProvider({ children }) {
  const { db, mutate } = useDb();
  const { toast } = useToast();
  const [online, setOnline] = useState(() => localStorage.getItem(KEY) !== '0');

  /* Terapkan seluruh antrean offline ke database (dipakai waktu koneksi pulih) */
  const processQueue = () => {
    const count = mutate((d) => {
      let n = 0;
      (d.syncQueue || []).forEach((item) => {
        if (item.kind === 'order') {
          const id = d.orders.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
          d.orders.push({ ...item.payload, id, createdAt: nowStamp() });
          /* Auto-complete tugas terkait (BR-TASK-003) — pakai waktu pengerjaan asli */
          const t = d.tasks.find((x) =>
            x.date === item.payload.date && x.outletId === item.payload.outletId &&
            x.type === 'order' && x.salesId === item.payload.salesId && x.status === 'in_progress');
          if (t) { t.status = 'done'; t.completedAt = nowStamp(); }
          n++;
        } else if (item.kind === 'audit') {
          const id = d.audits.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
          d.audits.push({ ...item.payload, id, createdAt: nowStamp() });
          const t = d.tasks.find((x) =>
            x.date === item.payload.date && x.outletId === item.payload.outletId &&
            x.type === 'audit' && x.salesId === item.payload.salesId && x.status === 'in_progress');
          if (t) { t.status = 'done'; t.completedAt = nowStamp(); }
          n++;
        }
      });
      d.syncQueue = [];
      return n;
    });
    if (count > 0) toast(`Sinkronisasi otomatis: ${count} data terkirim ke server pusat.`, 'success');
  };

  const toggleOnline = () => {
    const next = !online;
    setOnline(next);
    localStorage.setItem(KEY, next ? '1' : '0');
    if (next) {
      toast('Koneksi pulih — sinkronisasi latar belakang aktif (protokol offline-sync, simulasi instan).', 'info');
      setTimeout(() => processQueue(), 900); /* retry berkala disimulasikan instan */
    } else {
      toast('Mode offline aktif. Data transaksi akan disimpan sementara di penyimpanan lokal perangkat.', 'warning', 5000);
    }
  };

  /* Simpan payload ke antrean lokal (dipanggil modul transaksi saat offline) */
  const enqueue = (kind, payload) => {
    mutate((d) => {
      if (!d.syncQueue) d.syncQueue = [];
      const id = d.syncQueue.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
      d.syncQueue.push({ id, kind, payload, ts: nowStamp() });
    });
  };

  /* Notifikasi in-app (simulasi push notification) */
  const notify = (userId, title, body) => {
    mutate((d) => {
      if (!d.notifications) d.notifications = [];
      const id = d.notifications.reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
      d.notifications.push({ id, userId, title, body, read: false, createdAt: nowStamp() });
    });
  };

  const queueCount = db.syncQueue?.length || 0;

  return (
    <SyncContext.Provider value={{ online, toggleOnline, enqueue, processQueue, notify, queueCount }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);