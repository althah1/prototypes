import { createContext, useContext, useState } from 'react';
import { useDb } from './DbContext';
import { nowStamp, todayISO } from '../utils/helpers';

const SESSION_KEY = 'sfa_react_session';
const ATTEMPTS_KEY = 'sfa_react_attempts';
const OTP_KEY = 'sfa_react_otp';
const OTP_META_KEY = 'sfa_react_otp_meta';
const LOGOUT_REASON_KEY = 'sfa_react_logout_reason';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lsRead = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const lsWrite = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* BR-A01: min 8 karakter, 1 huruf besar, 1 huruf kecil, 1 angka */
export function passwordPolicy(p) {
  if (!p || p.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (!/[A-Z]/.test(p)) return 'Wajib mengandung minimal 1 huruf besar.';
  if (!/[a-z]/.test(p)) return 'Wajib mengandung minimal 1 huruf kecil.';
  if (!/[0-9]/.test(p)) return 'Wajib mengandung minimal 1 angka.';
  return null;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { db, update } = useDb();

  const [user, setUser] = useState(() => {
    const s = lsRead(SESSION_KEY, null);
    if (!s) return null;
    const u = db.users.find((x) => x.id === s.userId);
    return u && u.status === 'active' ? { ...u, loginAt: s.at } : null;
  });

  /* Login: cek 3 tahap — format → kredensial → status akun (kriteria #13) */
  const login = (email, password) => {
    email = (email || '').trim();
    if (!EMAIL_RE.test(email)) return { field: 'email', message: 'Format email tidak valid.' };
    if (!password) return { field: 'password', message: 'Kolom ini wajib diisi.' };

    const key = email.toLowerCase();
    const att = lsRead(ATTEMPTS_KEY, {});
    if (att[key]?.until && Date.now() < att[key].until) {
      return { blocked: true, minutes: Math.ceil((att[key].until - Date.now()) / 60000) };
    }

    const u = db.users.find((x) => x.email.toLowerCase() === key);
    if (!u || u.password !== password) {
      const rec = att[key] || { count: 0 };
      rec.count += 1;
      if (rec.count >= 5) { rec.until = Date.now() + 15 * 60 * 1000; rec.count = 0; } // BR-A02
      att[key] = rec;
      lsWrite(ATTEMPTS_KEY, att);
      return rec.until
        ? { blocked: true, minutes: 15 }
        : { message: 'Email atau kata sandi yang Anda masukkan salah.' };
    }
    if (u.status !== 'active') return { message: 'Akun Anda terblokir / non-aktif. Hubungi Administrator.' };

    delete att[key];
    lsWrite(ATTEMPTS_KEY, att);
    lsWrite(SESSION_KEY, { userId: u.id, at: nowStamp() });
    setUser({ ...u, loginAt: nowStamp() });
    return { ok: true, user: u };
  };

  const logout = (reason) => {
    localStorage.removeItem(SESSION_KEY);
    if (reason) sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
    setUser(null);
  };

  const consumeLogoutReason = () => {
    const r = sessionStorage.getItem(LOGOUT_REASON_KEY);
    sessionStorage.removeItem(LOGOUT_REASON_KEY);
    return r;
  };

  /* BR-A06: OTP 6 digit, 5 menit, cooldown 60 dtk, maks 3/hari */
  const requestOtp = (email) => {
    email = (email || '').trim();
    if (!EMAIL_RE.test(email)) return { field: 'email', message: 'Format email tidak valid.' };
    const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return { field: 'email', message: 'Email tidak terdaftar di dalam sistem SFA.' };

    const meta = lsRead(OTP_META_KEY, {});
    const m = meta[email.toLowerCase()];
    if (m && m.date === todayISO() && m.count >= 3)
      return { limit: 'Batas permintaan OTP harian telah tercapai. Silakan hubungi Administrator Anda.' };
    if (m && m.last && Date.now() - m.last < 60000)
      return { cooldown: Math.ceil((60000 - (Date.now() - m.last)) / 1000) };

    const code = String(Math.floor(100000 + Math.random() * 900000));
    lsWrite(OTP_KEY, { email: email.toLowerCase(), code, expiresAt: Date.now() + 5 * 60 * 1000 });
    meta[email.toLowerCase()] = {
      date: todayISO(),
      count: (m && m.date === todayISO() ? m.count : 0) + 1,
      last: Date.now(),
    };
    lsWrite(OTP_META_KEY, meta);
    return { ok: true, code, email };
  };

  const verifyOtp = (code) => {
    const otp = lsRead(OTP_KEY, null);
    if (!otp || String(code || '').trim() !== otp.code || Date.now() > otp.expiresAt)
      return { message: 'Kode OTP tidak valid atau masa berlakunya telah habis. Silakan minta kode baru.' };
    return { ok: true, email: otp.email };
  };

  /* Setelah berhasil: OTP dicabut + password tersimpan (di sistem nyata: hash bcrypt) */
  const resetPassword = (p1, p2) => {
    const v = passwordPolicy(p1);
    if (v) return { field: 'p1', message: v };
    if (p1 !== p2) return { field: 'p2', message: 'Konfirmasi kata sandi tidak sama.' };
    const otp = lsRead(OTP_KEY, null);
    if (!otp) return { message: 'Sesi reset tidak ditemukan. Ulangi proses lupa kata sandi.' };
    const u = db.users.find((x) => x.email.toLowerCase() === otp.email);
    if (!u) return { message: 'Pengguna tidak ditemukan.' };
    update('users', u.id, { password: p1 });
    localStorage.removeItem(OTP_KEY);
    return { ok: true };
  };

  const homePath = (role) => (role === 'sales' ? '/app' : '/dashboard');

  return (
    <AuthContext.Provider value={{ user, login, logout, requestOtp, verifyOtp, resetPassword, homePath, consumeLogoutReason }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);