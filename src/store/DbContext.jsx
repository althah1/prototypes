import { createContext, useContext, useRef, useState } from 'react';
import { seed } from '../data/seed';
import { nowStamp, todayISO } from '../utils/helpers';
import { buildGudangDetails } from '../utils/gudangUtils';

const STORAGE_KEY = 'sfa_react_db_v1'; // beda dari prototype vanilla agar tidak bentrok
const DbContext = createContext(null);

/* Pastikan tabel gudangDetails ada (murni — tanpa mutate) */
function hydrateGudang(db) {
  if (!Array.isArray(db.gudangDetails)) db.gudangDetails = buildGudangDetails(db);
  return db;
}

function loadInitial() {
  let db = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.users) db = parsed;
    }
  } catch { /* data rusak → seed ulang */ }
  if (!db) db = seed();

  /* Migrasi gudangDetails SEKALI saat app start — SEBELUM interaksi user
     apa pun. Menutup celah timing lama: gudang yang ditambah sebelum
     migrasi jalan ikut kebagian stok. Hasil migrasi dipersist. */
  hydrateGudang(db);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  return db;
}

export function DataProvider({ children }) {
  const [data, setData] = useState(loadInitial);
  const dataRef = useRef(data);
  dataRef.current = data;

  const persist = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    dataRef.current = next;
    setData(next);
  };

  /* mutate: aman dipanggil beberapa kali dalam satu event handler */
  const mutate = (fn) => {
    const draft = structuredClone(dataRef.current);
    const result = fn(draft);
    persist(draft);
    return result;
  };

  const insert = (table, row) =>
    mutate((db) => {
      if (!db[table]) db[table] = [];
      const id = db[table].reduce((m, r) => Math.max(m, r.id || 0), 0) + 1;
      const created = { ...row, id, createdAt: nowStamp() };
      db[table].push(created);
      return created;
    });

  const update = (table, id, patch) =>
    mutate((db) => {
      const row = (db[table] || []).find((r) => r.id === id);
      if (row) Object.assign(row, patch, { updatedAt: nowStamp() });
      return row ? { ...row } : null;
    });

  const remove = (table, id) =>
    mutate((db) => {
      db[table] = (db[table] || []).filter((r) => r.id !== id);
      return true;
    });

  /* Nomor dokumen unik otomatis: ORD-/QT-/AUD- + tanggal + urutan */
  const nextNo = (prefix, table) => {
    const t = todayISO();
    const count = (dataRef.current[table] || []).filter((r) => String(r.date || '').startsWith(t)).length + 1;
    return `${prefix}-${t.replace(/-/g, '')}-${String(count).padStart(3, '0')}`;
  };

  const reset = () => persist(hydrateGudang(seed()));

  return (
    <DbContext.Provider value={{ db: data, insert, update, remove, reset, nextNo, mutate, dataRef }}>
      {children}
    </DbContext.Provider>
  );
}

export const useDb = () => useContext(DbContext);