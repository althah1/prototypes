import { todayISO, nowStamp } from './helpers';

/* BR-TASK-004: tugas Pending/In Progress yang melewati hari penugasan
   otomatis menjadi Failed & terkunci (simulasi cron 23:59 server). */
export function expireTasks(db, mutate) {
  const today = todayISO();
  const stale = (db.tasks || []).filter(
    (t) => t.date < today && (t.status === 'pending' || t.status === 'in_progress')
  );
  if (!stale.length) return 0;
  mutate((d) => {
    if (!Array.isArray(d.tasks)) return; /* guard: data lama tanpa tabel tasks */
    d.tasks.forEach((t) => {
      if (t.date < today && (t.status === 'pending' || t.status === 'in_progress')) {
        t.status = 'failed';
      }
    });
  });
  return stale.length;
}

/* BR-TASK-003: auto-complete — status menjadi Done OTOMATIS saat seluruh
   syarat aktivitas tersimpan (dipanggil modul Order/Audit/Foto/Penagihan). */
export function completeTaskAuto(db, mutate, { outletId, type, salesId, date }) {
  const day = date || todayISO();
  const task = (db.tasks || []).find(
    (t) => t.date === day && t.outletId === outletId && t.type === type &&
    (salesId ? t.salesId === salesId : true) && t.status === 'in_progress'
  );
  if (!task) return null;
  mutate((d) => {
    const t = (d.tasks || []).find((x) => x.id === task.id);
    if (t) { t.status = 'done'; t.completedAt = nowStamp(); }
  });
  return { ...task, status: 'done' };
}

/* Sinkronisasi pagi (simulasi): bila sales belum punya jadwal hari ini,
   buat tugas contoh dari outlet area kerjanya. */
export function ensureTodayTasks(db, insert, salesId) {
  const today = todayISO();
  const flag = `sfa_ensure_${salesId}_${today}`;
  if (localStorage.getItem(flag)) return false;
  localStorage.setItem(flag, '1');
  if ((db.tasks || []).some((t) => t.salesId === salesId && t.date === today)) return false;
  const sales = (db.sales || []).find((s) => s.id === salesId);
  if (!sales) return false;
  const outs = (db.outlets || []).filter((o) => o.areaId === sales.areaId && o.status === 'active').slice(0, 3);
  ['order', 'audit', 'display'].forEach((type, i) => {
    if (outs[i]) insert('tasks', { date: today, salesId, outletId: outs[i].id, type, status: 'pending', note: '' });
  });
  return true;
}