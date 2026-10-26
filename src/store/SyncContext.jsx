import { createContext, useContext, useState } from 'react';
import { useDb } from './DbContext';
import { useToast } from '../components/ui/ToastProvider';
import { nowStamp, todayISO } from '../utils/helpers';
import { applyBillingPaymentInDraft } from '../utils/taskUtils';

const ONLINE_KEY = 'sfa_react_online';
const SyncContext = createContext(null);

/*
 * Pemakaian:
 *  - const { online, toggleOnline, flushQueue, queueCount } = useSync();  → indikator & toggle
 *  - enqueue('order', payload) / enqueue('audit', payload) / enqueue('prospect', payload)
 *      / enqueue('display_photo', payload) / enqueue('billing_collection', payload) → simpan offline
 *  - notify(userId, title, body)                                         → kirim notifikasi ke pengguna
 */
export function SyncProvider({ children }) {
  const { db, insert, mutate } = useDb();
  const { toast } = useToast();

  const [online, setOnline] = useState(() => {
    try {
      const raw = localStorage.getItem(ONLINE_KEY);
      return raw == null ? true : JSON.parse(raw);
    } catch {
      return true;
    }
  });

  const queue = db.syncQueue || [];
  const queueCount = queue.length;

  const notify = (userId, title, body) => {
    if (!userId) return;
    insert('notifications', {
      userId,
      title,
      body,
      read: false,
      createdAt: nowStamp(),
    });
  };

  const enqueue = (kind, payload) => {
    mutate((d) => {
      if (!Array.isArray(d.syncQueue)) d.syncQueue = [];
      d.syncQueue.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        kind,
        payload,
        queuedAt: nowStamp(),
      });
    });
  };

  const flushQueue = () => {
    const pending = db.syncQueue || [];
    if (!pending.length) return 0;
    const count = pending.length;
    const syncTime = nowStamp();

    mutate((d) => {
      (d.syncQueue || []).forEach((item) => {
        const p = item.payload || {};
        const originalTs = p.completedAt || p.createdAt || item.queuedAt || syncTime;

        /* 1. BR-TASK-006: Sinkronisasi tugas Foto Display dengan timestamp asli pengerjaan */
        if (item.kind === 'display_photo') {
          const t = (d.tasks || []).find((x) => x.id === p.taskId);
          if (t) {
            t.status = 'done';
            t.photos = p.photos || [];
            t.completedAt = originalTs;
            t.syncedAt = syncTime;
          }
          return;
        }

        /* 2. BR-TASK-003 & BR-TASK-006: Sinkronisasi Transaksi Penagihan Lapangan + Auto-Complete Tugas Billing */
        if (item.kind === 'billing_collection') {
          const updatedInv = applyBillingPaymentInDraft(d, { ...p, completedAt: originalTs });
          if (updatedInv) {
            const t = (d.tasks || []).find(
              (x) =>
                (p.taskId ? x.id === p.taskId : x.outletId === p.outletId && x.type === 'billing' && x.date === (p.date || todayISO())) &&
                x.salesId === p.salesId &&
                x.status !== 'done'
            );
            if (t) {
              t.status = 'done';
              t.completedAt = originalTs;
              t.syncedAt = syncTime;
              t.billingRef = {
                invoiceNo: updatedInv.no,
                nominal: p.nominal,
                metode: p.metode,
              };
              if (p.proofPhoto) t.photos = [p.proofPhoto];
            }
          }
          return;
        }

        /* 3. Sinkronisasi entitas standar: Order, Audit, dan Prospek Baru */
        const target =
          item.kind === 'order'
            ? 'orders'
            : item.kind === 'audit'
              ? 'audits'
              : item.kind === 'prospect'
                ? 'prospects'
                : null;
        if (!target) return;

        if (!Array.isArray(d[target])) d[target] = [];
        const nextId = d[target].reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
        d[target].push({
          ...p,
          id: nextId,
          syncedAt: syncTime,
          createdAt: originalTs,
        });

        /* Auto-complete tugas Order / Audit yang dikerjakan saat offline beserta timestamp asli (BR-TASK-003 & BR-TASK-006) */
        if (item.kind === 'order' || item.kind === 'audit') {
          const t = (d.tasks || []).find(
            (x) =>
              x.date === (p.date || todayISO()) &&
              x.outletId === p.outletId &&
              x.type === item.kind &&
              x.salesId === p.salesId &&
              x.status === 'in_progress'
          );
          if (t) {
            t.status = 'done';
            t.completedAt = originalTs;
            t.syncedAt = syncTime;
          }
        }
      });

      d.syncQueue = [];
    });

    toast(`${count} data tertunda berhasil disinkronkan ke server.`, 'success');
    return count;
  };

  const toggleOnline = () => {
    const next = !online;
    setOnline(next);
    localStorage.setItem(ONLINE_KEY, JSON.stringify(next));
    if (next) {
      const synced = flushQueue();
      if (!synced) toast('Koneksi kembali Online.', 'success');
    } else {
      toast('Mode Offline aktif — transaksi baru akan disimpan ke antrean lokal.', 'warning');
    }
  };

  return (
    <SyncContext.Provider value={{ online, toggleOnline, enqueue, flushQueue, queueCount, notify }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => useContext(SyncContext);
