import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import StatCard from '../../components/ui/StatCard';
import StatusChip from '../../components/ui/StatusChip';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../../components/ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import { nowStamp, formatRupiah, todayISO } from '../../utils/helpers';
import { openInvoicePdf, shareInvoiceWhatsApp } from '../../utils/invoicePdf';
import {
  getActiveCompanyBanks,
  isValidInvoiceDueDate,
  resolveInvoiceBankIds,
} from '../../utils/invoiceUtils';

/* Validasi Bukti Pembayaran sesuai BR-INV-004 & Tabel 32 (.JPG / .PNG / .PDF maks. 2 MB) */
const ALLOWED_PROOF_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_PROOF_EXT = /\.(jpe?g|png|pdf)$/i;
const MAX_PROOF_BYTES = 2 * 1024 * 1024; /* 2 MB */
const MAX_NOTE_LENGTH = 255;

function readProofFile(file, onResult) {
  if (!file) return;
  const extOk = ALLOWED_PROOF_EXT.test(file.name || '');
  const mimeOk = !file.type || ALLOWED_PROOF_MIMES.includes(file.type);
  if (!extOk || !mimeOk) {
    onResult(null, 'Format berkas tidak valid. Gunakan file .JPG, .PNG, atau .PDF.');
    return;
  }
  if (file.size > MAX_PROOF_BYTES) {
    onResult(null, 'Ukuran berkas melebihi batas maksimal 2 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    onResult(
      {
        name: file.name,
        type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        size: file.size,
        dataUrl: ev.target.result,
      },
      ''
    );
  };
  reader.onerror = () => onResult(null, 'Gagal membaca berkas bukti pembayaran.');
  reader.readAsDataURL(file);
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/* Komponen KV Minimalis & Rapi — Seragam di Seluruh Sistem */
const KV = ({ label, value, wrap = false }) => (
  <Box sx={{ py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        color: 'text.secondary',
        fontSize: '0.675rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        display: 'block',
        mb: 0.25,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontWeight: 600,
        fontSize: '0.825rem',
        color: 'text.primary',
        ...(wrap
          ? { whiteSpace: 'normal', overflowWrap: 'anywhere' }
          : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
      }}
    >
      {value}
    </Typography>
  </Box>
);

/* Komponen daftar Riwayat Pembayaran lengkap (Petugas, Catatan, Resi, & Lihat Bukti) */
function PaymentHistoryList({ payments = [], onPreviewProof }) {
  if (!payments.length) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
        Riwayat Penerimaan Pembayaran ({payments.length})
      </Typography>
      <Stack spacing={1}>
        {payments.slice().reverse().map((p, idx) => {
          const note = p.catatan_pembayaran || p.catatanPembayaran || '';
          const officer = p.petugasNama || p.recordedBy || '';
          const proof = p.bukti_pembayaran || p.buktiPembayaran || null;

          return (
            <Paper
              key={idx}
              variant="outlined"
              sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'background.paper' }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={0.75}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2" fontWeight={750}>
                      {p.keterangan || 'Pembayaran'}
                    </Typography>
                    <Chip
                      size="small"
                      label={p.metode || '-'}
                      color={p.metode === 'Transfer Bank' ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                    />
                    {p.noResi && (
                      <Chip
                        size="small"
                        label={`Resi: ${p.noResi}`}
                        sx={{ height: 20, fontSize: '0.7rem', fontFamily: 'monospace' }}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                    {p.ts}
                    {officer ? ` • Dicatat oleh: ${officer}` : ''}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  {proof && proof.dataUrl && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityRoundedIcon fontSize="small" />}
                      onClick={() => onPreviewProof(proof)}
                      sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                    >
                      Lihat Bukti
                    </Button>
                  )}
                  <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    color="success.main"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatRupiah(p.nominal)}
                  </Typography>
                </Stack>
              </Stack>

              {note && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.75,
                    p: 0.75,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  <b>Catatan:</b> {note}
                </Typography>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

/* Komponen blok unggah Bukti Pembayaran seragam untuk Reguler & Angsuran */
function ProofUploadField({ method, proofFile, setProofFile, proofErr, setProofErr }) {
  const isTransfer = method === 'Transfer Bank';
  const isPdf = proofFile && (proofFile.type === 'application/pdf' || /\.pdf$/i.test(proofFile.name || ''));

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Bukti Pembayaran (.JPG / .PNG / .PDF — Maks. 2 MB) {isTransfer ? <b style={{ color: '#dc2626' }}>* Wajib untuk Transfer</b> : '(Opsional untuk Tunai)'}
      </Typography>

      {!proofFile ? (
        <Button
          component="label"
          variant="outlined"
          color={proofErr ? 'error' : 'primary'}
          startIcon={<UploadFileRoundedIcon />}
          fullWidth
          sx={{
            py: 1.25,
            borderStyle: 'dashed',
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 650,
            justifyContent: 'center',
          }}
        >
          Pilih Berkas Bukti Pembayaran (.JPG, .PNG, .PDF)
          <input
            type="file"
            hidden
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              readProofFile(file, (res, errMsg) => {
                if (errMsg) {
                  setProofFile(null);
                  setProofErr(errMsg);
                } else {
                  setProofFile(res);
                  setProofErr('');
                }
              });
            }}
          />
        </Button>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            borderColor: 'success.main',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          {isPdf ? (
            <PictureAsPdfRoundedIcon color="error" />
          ) : (
            <Box
              component="img"
              src={proofFile.dataUrl}
              alt={proofFile.name}
              sx={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap title={proofFile.name}>
              {proofFile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatBytes(proofFile.size)} • Siap dilampirkan
            </Typography>
          </Box>
          <Tooltip title="Hapus berkas">
            <IconButton
              size="small"
              color="error"
              onClick={() => {
                setProofFile(null);
                setProofErr('');
              }}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      )}

      {proofErr && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
          {proofErr}
        </Typography>
      )}
    </Box>
  );
}

export default function Billing() {
  const { user } = useAuth();
  const { db, update } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();
  const isFinance = user.role === 'finance';

  const [payId, setPayId] = useState(null);
  const [detailId, setDetailId] = useState(null);

  /* State Form Catat Pembayaran Reguler */
  const [method, setMethod] = useState('Transfer Bank');
  const [amount, setAmount] = useState('');
  const [noResi, setNoResi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [err, setErr] = useState('');
  const [proofErr, setProofErr] = useState('');
  const [noteErr, setNoteErr] = useState('');

  /* State Form Pelunasan Angsuran (Cicilan — BR-INV-004 tanpa hardcode) */
  const [activeInstKe, setActiveInstKe] = useState(null);
  const [instMethod, setInstMethod] = useState('Transfer Bank');
  const [instResi, setInstResi] = useState('');
  const [instCatatan, setInstCatatan] = useState('');
  const [instProof, setInstProof] = useState(null);
  const [instProofErr, setInstProofErr] = useState('');
  const [instNoteErr, setInstNoteErr] = useState('');

  /* State Pengaturan Invoice (Multi-Rekening Perusahaan & Jatuh Tempo — BR-INV-006, Tabel 32 & 33) */
  const [configId, setConfigId] = useState(null);
  const [cfgDueDate, setCfgDueDate] = useState('');
  const [cfgBankIds, setCfgBankIds] = useState([]);
  const [cfgDueErr, setCfgDueErr] = useState('');
  const [cfgBankErr, setCfgBankErr] = useState('');

  /* Modal Preview Bukti Pembayaran (.JPG / .PNG / .PDF) */
  const [previewProof, setPreviewProof] = useState(null);

  /* Filter & Tabel */
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const invoices = db.invoices || [];
  const companyBanks = useMemo(() => getActiveCompanyBanks(db), [db]);

  /* Hitung akumulasi pembayaran riil (DP + angsuran / riwayat payments) */
  function paidOf(i) {
    if (!i) return 0;
    if (Array.isArray(i.payments) && i.payments.length > 0) {
      return i.payments.reduce((s, p) => s + (Number(p.nominal) || 0), 0);
    }
    if (i.metodePembayaran === 'cicilan' && i.installments) {
      const dp = Number(i.cicilanDP) || 0;
      const inst = i.installments
        .filter((a) => a.status === 'lunas')
        .reduce((s, a) => s + (Number(a.nominal) || 0), 0);
      return dp + inst;
    }
    if (i.status === 'lunas') return Number(i.paidAmount ?? i.total) || 0;
    return 0;
  }

  const getDueDate = (i) => i?.jatuhTempo || i?.due_date || null;

  const overdue = (i) => {
    if (!i || i.status !== 'belum_lunas') return false;
    const due = getDueDate(i);
    if (due && due < todayISO()) return true;
    if (i.metodePembayaran === 'cicilan' && Array.isArray(i.installments)) {
      return i.installments.some((a) => a.status !== 'lunas' && a.jatuhTempo && a.jatuhTempo < todayISO());
    }
    return false;
  };

  const unpaid = invoices.filter((i) => i.status !== 'lunas' && i.status !== 'dibatalkan');
  const paid = invoices.filter((i) => i.status === 'lunas');
  const overdueList = invoices.filter(overdue);

  const payInvoice = invoices.find((i) => i.id === payId);
  const detailInvoice = invoices.find((i) => i.id === detailId);
  const configInvoice = invoices.find((i) => i.id === configId);

  const sisaBayar = payInvoice ? Math.max(0, payInvoice.total - paidOf(payInvoice)) : 0;
  const rawAmountStr = String(amount ?? '').trim();
  const numericAmount = rawAmountStr === '' ? NaN : Number(amount);
  const isOverpayment = Boolean(payInvoice) && !Number.isNaN(numericAmount) && numericAmount > sisaBayar;
  const isPartialPayment = Boolean(payInvoice) && !Number.isNaN(numericAmount) && numericAmount > 0 && numericAmount < sisaBayar;
  const overpayMsg = isOverpayment
    ? `Nominal pembayaran tidak boleh melebihi sisa tagihan aktif (${formatRupiah(sisaBayar)}).`
    : '';

  /* Reset state saat Dialog Catat Pembayaran dibuka */
  useEffect(() => {
    if (payId) {
      const i = invoices.find((x) => x.id === payId);
      const sisa = i ? Math.max(0, i.total - paidOf(i)) : 0;
      setAmount(String(sisa));
      setMethod(i && i.metodePembayaran === 'tunai' ? 'Tunai' : 'Transfer Bank');
      setNoResi('');
      setCatatan('');
      setProofFile(null);
      setErr('');
      setProofErr('');
      setNoteErr('');

      /* Reset form angsuran */
      const nextUnpaid = i?.installments?.find((a) => a.status !== 'lunas');
      setActiveInstKe(nextUnpaid ? nextUnpaid.ke : null);
      setInstMethod('Transfer Bank');
      setInstResi('');
      setInstCatatan('');
      setInstProof(null);
      setInstProofErr('');
      setInstNoteErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payId]);

  /* Inisialisasi state saat Dialog Pengaturan Invoice dibuka */
  useEffect(() => {
    if (configId) {
      const inv = invoices.find((x) => x.id === configId);
      if (inv) {
        const currentDue = getDueDate(inv) || inv.date || todayISO();
        setCfgDueDate(currentDue < inv.date ? inv.date : currentDue);
        setCfgBankIds(resolveInvoiceBankIds(inv, db));
        setCfgDueErr('');
        setCfgBankErr('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const outletName = (id) => (db.outlets || []).find((o) => o.id === id)?.name || '-';
  const salesName = (id) => (db.sales || []).find((s) => s.id === id)?.name || '-';

  function progressLabel(i) {
    if (i.metodePembayaran === 'konsinyasi' && paidOf(i) === 0) return 'Menunggu stock-take';
    if (i.metodePembayaran === 'cicilan' && i.installments) {
      const done = i.installments.filter((a) => a.status === 'lunas').length;
      return `${done}/${i.installments.length} angsuran`;
    }
    const p = paidOf(i);
    if (p === 0) return 'Belum dibayar';
    return `${formatRupiah(p)} / ${formatRupiah(i.total)}`;
  }

  const syaratLabel = (i) => {
    switch (i?.metodePembayaran) {
      case 'transfer': {
        const ids = resolveInvoiceBankIds(i, db);
        const matched = companyBanks.filter((b) => ids.some((id) => String(id) === String(b.id)));
        if (matched.length === 1) return `Transfer — ${matched[0].nama}`;
        if (matched.length > 1) return `Transfer (${matched.length} Rekening)`;
        const fallback = (db.banks || []).find((x) => x.id === i.bankId);
        return fallback ? `Transfer — ${fallback.nama}` : 'Transfer Bank';
      }
      case 'termin':
        return `Termin ${i.terminHari || 14} hari`;
      case 'cicilan':
        return `Cicilan${i?.cicilanDP > 0 ? ` (DP ${formatRupiah(i.cicilanDP)})` : ''}`;
      case 'konsinyasi':
        return 'Konsinyasi';
      default:
        return 'Tunai (COD)';
    }
  };

  const filtered = invoices.filter((i) =>
    (statusFilter === 'all' ||
      (statusFilter === 'lunas' && i.status === 'lunas') ||
      (statusFilter === 'belum' && i.status === 'belum_lunas') ||
      (statusFilter === 'overdue' && overdue(i)) ||
      (statusFilter === 'dibatalkan' && i.status === 'dibatalkan')) &&
    (!dateFilter || i.date === dateFilter) &&
    (!q.trim() ||
      i.no.toLowerCase().includes(q.trim().toLowerCase()) ||
      String(i.orderNo || '').toLowerCase().includes(q.trim().toLowerCase()) ||
      outletName(i.outletId).toLowerCase().includes(q.trim().toLowerCase()))
  );

  const curPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1));
  const paginated = filtered
    .slice()
    .reverse()
    .slice(curPage * rowsPerPage, curPage * rowsPerPage + rowsPerPage);

  /* ===== Simpan Pembayaran Reguler / Parsial (BR-INV-004 & Tabel 32) ===== */
  const submitPay = () => {
    const inv = payInvoice;
    if (!inv) return;

    let hasError = false;
    const amt = Number(amount);

    if (String(amount ?? '').trim() === '' || Number.isNaN(amt) || amt <= 0) {
      setErr('Nominal pembayaran wajib diisi dan harus lebih dari Rp 0.');
      hasError = true;
    } else if (amt > sisaBayar) {
      setErr(`Nominal pembayaran tidak boleh melebihi sisa tagihan aktif (${formatRupiah(sisaBayar)}).`);
      hasError = true;
    }

    if (method === 'Transfer Bank' && !proofFile) {
      setProofErr('Bukti pembayaran (.JPG/.PNG/.PDF maks. 2 MB) wajib diunggah untuk metode Transfer Bank.');
      hasError = true;
    }

    if (catatan.trim().length > MAX_NOTE_LENGTH) {
      setNoteErr(`Catatan pembayaran maksimal ${MAX_NOTE_LENGTH} karakter.`);
      hasError = true;
    }

    if (hasError) return;

    const ts = nowStamp();
    const cleanNote = catatan.trim();
    const cleanResi = noResi.trim();
    const officerName = user?.name || 'Petugas Finance';

    const newPayment = {
      ts,
      nominal: amt,
      metode: method,
      keterangan: amt < sisaBayar ? 'Pembayaran Parsial' : 'Pelunasan Tagihan',
      petugasId: user?.id ?? null,
      petugasNama: officerName,
      recordedBy: officerName,
      noResi: cleanResi || null,
      catatan_pembayaran: cleanNote,
      catatanPembayaran: cleanNote,
      bukti_pembayaran: proofFile || null,
    };

    const payments = [...(inv.payments || []), newPayment];
    const totalPaid = payments.reduce((s, p) => s + (Number(p.nominal) || 0), 0);
    const lunas = totalPaid >= inv.total;

    update('invoices', inv.id, {
      payments,
      status: lunas ? 'lunas' : 'belum_lunas',
      paidAt: lunas ? ts : null,
      paidMethod: lunas ? method : (inv.paidMethod || null),
      paidBy: lunas ? officerName : (inv.paidBy || null),
    });

    if (lunas) {
      update('orders', inv.orderId, {
        paid: true,
        paidAt: ts,
        paidMethod: method,
        paidBy: officerName,
      });
    }

    const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === inv.salesId);
    if (salesUser) {
      notify(
        salesUser.id,
        'Pembayaran Diterima',
        `Invoice ${inv.no}: ${formatRupiah(amt)} diterima (${method}) oleh ${officerName}${
          lunas ? ' — LUNAS' : ` — sisa ${formatRupiah(Math.max(0, inv.total - totalPaid))}`
        }.`
      );
    }

    toast(
      lunas
        ? `Pembayaran tercatat oleh ${officerName} — invoice ${inv.no} LUNAS.`
        : `Pembayaran parsial tercatat — sisa ${formatRupiah(Math.max(0, inv.total - totalPaid))}.`,
      lunas ? 'success' : 'info'
    );
    setPayId(null);
  };

  /* ===== Simpan Pelunasan Angsuran tanpa Hardcode Metode (BR-INV-004) ===== */
  const submitInstallmentPay = () => {
    const inv = payInvoice;
    if (!inv || !activeInstKe) return;

    const target = (inv.installments || []).find((a) => a.ke === activeInstKe);
    if (!target || target.status === 'lunas') return;

    let hasError = false;
    if (instMethod === 'Transfer Bank' && !instProof) {
      setInstProofErr('Bukti pembayaran (.JPG/.PNG/.PDF maks. 2 MB) wajib diunggah untuk metode Transfer Bank.');
      hasError = true;
    }
    if (instCatatan.trim().length > MAX_NOTE_LENGTH) {
      setInstNoteErr(`Catatan pembayaran maksimal ${MAX_NOTE_LENGTH} karakter.`);
      hasError = true;
    }
    if (hasError) return;

    const ts = nowStamp();
    const officerName = user?.name || 'Petugas Finance';
    const cleanNote = instCatatan.trim();
    const cleanResi = instResi.trim();

    const installments = (inv.installments || []).map((a) =>
      a.ke === activeInstKe
        ? {
            ...a,
            status: 'lunas',
            paidAt: ts,
            paidMethod: instMethod,
            petugasId: user?.id ?? null,
            petugasNama: officerName,
            noResi: cleanResi || null,
            catatan_pembayaran: cleanNote,
            catatanPembayaran: cleanNote,
            bukti_pembayaran: instProof || null,
          }
        : a
    );

    const payments = [
      ...(inv.payments || []),
      {
        ts,
        nominal: target.nominal,
        metode: instMethod,
        keterangan: `Angsuran ke-${activeInstKe}`,
        petugasId: user?.id ?? null,
        petugasNama: officerName,
        recordedBy: officerName,
        noResi: cleanResi || null,
        catatan_pembayaran: cleanNote,
        catatanPembayaran: cleanNote,
        bukti_pembayaran: instProof || null,
      },
    ];

    const allPaid = installments.every((a) => a.status === 'lunas');

    update('invoices', inv.id, {
      installments,
      payments,
      status: allPaid ? 'lunas' : 'belum_lunas',
      paidAt: allPaid ? ts : null,
      paidMethod: allPaid ? instMethod : (inv.paidMethod || null),
      paidBy: allPaid ? officerName : (inv.paidBy || null),
    });

    if (allPaid) {
      update('orders', inv.orderId, {
        paid: true,
        paidAt: ts,
        paidMethod: instMethod,
        paidBy: officerName,
      });
    }

    const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === inv.salesId);
    if (salesUser) {
      notify(
        salesUser.id,
        'Angsuran Diterima',
        `Invoice ${inv.no}: angsuran ke-${activeInstKe} lunas via ${instMethod} (dicatat ${officerName})${
          allPaid ? ' — SEMUA ANGSURAN LUNAS' : ''
        }.`
      );
    }

    toast(
      allPaid
        ? `Angsuran ke-${activeInstKe} lunas (${instMethod}) — invoice ${inv.no} berstatus LUNAS.`
        : `Angsuran ke-${activeInstKe} lunas (${instMethod}) — sisa angsuran: ${installments.filter((a) => a.status !== 'lunas').length}.`,
      'success'
    );

    const nextPending = installments.find((a) => a.status !== 'lunas');
    setActiveInstKe(nextPending ? nextPending.ke : null);
    setInstResi('');
    setInstCatatan('');
    setInstProof(null);
    setInstProofErr('');
    setInstNoteErr('');
    if (allPaid) setPayId(null);
  };

  /* ===== Simpan Pengaturan Jatuh Tempo & Multi-Rekening Perusahaan (BR-INV-006, Tabel 32 & 33) ===== */
  const saveInvoiceConfig = () => {
    if (!configInvoice) return;

    let hasErr = false;
    if (!cfgDueDate) {
      setCfgDueErr('Tanggal jatuh tempo wajib diisi.');
      hasErr = true;
    } else if (!isValidInvoiceDueDate(configInvoice.date, cfgDueDate)) {
      setCfgDueErr(`Tanggal jatuh tempo tidak boleh mendahului tanggal terbit invoice (${configInvoice.date}).`);
      hasErr = true;
    }

    if (companyBanks.length > 0 && cfgBankIds.length === 0) {
      setCfgBankErr('Pilih minimal 1 rekening bank aktif milik perusahaan.');
      hasErr = true;
    }

    if (hasErr) return;

    const normalizedIds = companyBanks
      .filter((b) => cfgBankIds.some((id) => String(id) === String(b.id)))
      .map((b) => b.id);

    update('invoices', configInvoice.id, {
      jatuhTempo: cfgDueDate,
      due_date: cfgDueDate,
      rekening_bank_ids: normalizedIds,
      rekeningBankIds: normalizedIds,
      bankId: normalizedIds[0] ?? configInvoice.bankId ?? null,
      updatedBy: user?.name || 'Petugas Finance',
      updatedAt: nowStamp(),
    });

    toast(`Pengaturan jatuh tempo & rekening perusahaan untuk ${configInvoice.no} berhasil disimpan.`, 'success');
    setConfigId(null);
  };

  return (
    <Box>
      <PageHeader
        title="Billing / Penagihan"
        subtitle={`Invoice terbit otomatis saat order disetujui. ${
          isFinance
            ? 'Anda dapat mengatur jatuh tempo & multi-rekening perusahaan serta mencatat pembayaran.'
            : 'Anda hanya dapat melihat.'
        }`}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.5, mb: 2 }}>
        <StatCard icon={<ReceiptLongRoundedIcon />} value={invoices.length} label="Total invoice" />
        <StatCard
          icon={<ScheduleRoundedIcon />}
          value={formatRupiah(unpaid.reduce((s, i) => s + Math.max(0, i.total - paidOf(i)), 0))}
          label="Sisa tagihan"
          color="warning"
        />
        <StatCard icon={<WarningAmberRoundedIcon />} value={overdueList.length} label="Jatuh tempo" color="error" />
        <StatCard
          icon={<PaymentsRoundedIcon />}
          value={formatRupiah(paid.reduce((s, i) => s + paidOf(i), 0))}
          label="Sudah diterima"
          color="success"
        />
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary', pr: 0.75 }}>
            <FilterListRoundedIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={700}>Filter</Typography>
          </Stack>
          <TextField
            size="small"
            type="date"
            label="Tanggal"
            value={dateFilter}
            InputLabelProps={{ shrink: true }}
            onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
            sx={{ width: 170 }}
          />
          <TextField
            size="small"
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ width: 170 }}
          >
            <MenuItem value="all">Semua Status</MenuItem>
            <MenuItem value="belum">Belum Lunas</MenuItem>
            <MenuItem value="overdue">Jatuh Tempo</MenuItem>
            <MenuItem value="lunas">Lunas</MenuItem>
            <MenuItem value="dibatalkan">Dibatalkan</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Cari no. invoice / order / outlet…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            sx={{ flexGrow: 1, minWidth: 220, maxWidth: 340 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Menampilkan {filtered.length} dari {invoices.length} invoice
          </Typography>
        </Stack>
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>No. Invoice</TableCell>
              <TableCell>Tanggal / Jatuh Tempo</TableCell>
              <TableCell>Outlet</TableCell>
              <TableCell>Sales</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Syarat</TableCell>
              <TableCell>Dibayar</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aksi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length ? paginated.map((i) => {
              const due = getDueDate(i);
              return (
                <TableRow
                  key={i.id}
                  onClick={() => setDetailId(i.id)}
                  sx={{ cursor: 'pointer', opacity: i.status === 'dibatalkan' ? 0.55 : 1 }}
                >
                  <TableCell>
                    <Typography
                      sx={{ fontFamily: 'monospace', fontSize: 13, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      fontWeight={700}
                      title={i.no}
                    >
                      {i.no}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontFamily: 'monospace', display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={i.orderNo}
                    >
                      {i.orderNo}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                    <Box>{i.date}</Box>
                    {due && (
                      <Typography variant="caption" color={overdue(i) ? 'error.main' : 'text.secondary'} sx={{ fontFamily: 'monospace' }}>
                        JT: {due}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box title={outletName(i.outletId)} sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {outletName(i.outletId)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box title={salesName(i.salesId)} sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {salesName(i.salesId)}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <b>{formatRupiah(i.total)}</b>
                  </TableCell>
                  <TableCell>
                    <Box title={syaratLabel(i)} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {syaratLabel(i)}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      noWrap
                      color={i.status === 'lunas' ? 'success.main' : paidOf(i) > 0 ? 'info.main' : 'text.secondary'}
                    >
                      {progressLabel(i)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {i.status === 'lunas' ? (
                        <StatusChip kind="paid" status="yes" />
                      ) : i.status === 'dibatalkan' ? (
                        <StatusChip kind="paid" status="cancelled" />
                      ) : paidOf(i) > 0 ? (
                        <StatusChip kind="paid" status="partial" />
                      ) : (
                        <StatusChip kind="paid" status="no" />
                      )}
                      {overdue(i) && (
                        <StatusChip
                          kind="paid"
                          status="overdue"
                          label={`Jatuh Tempo ${due || ''}`.trim()}
                          icon={<WarningAmberRoundedIcon sx={{ fontSize: 13, mr: 0.4 }} />}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {isFinance && i.status !== 'dibatalkan' ? (
                      <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                        <Tooltip title="Atur Jatuh Tempo & Rekening Perusahaan">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => { e.stopPropagation(); setConfigId(i.id); }}
                          >
                            <EditCalendarRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {i.status === 'belum_lunas' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color={i.metodePembayaran === 'cicilan' ? 'warning' : 'success'}
                            sx={{
                              borderRadius: 1,
                              fontWeight: 650,
                              fontSize: 12,
                              textTransform: 'none',
                              px: 1.25,
                              py: 0.35,
                            }}
                            onClick={(e) => { e.stopPropagation(); setPayId(i.id); }}
                          >
                            {i.metodePembayaran === 'cicilan' ? 'Angsuran' : 'Catat Bayar'}
                          </Button>
                        )}
                      </Stack>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState message="Belum ada invoice — terbit otomatis saat Supervisor menyetujui order." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={curPage}
          onPageChange={(e, v) => setPage(v)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Baris per halaman"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} dari ${count}`}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </TableContainer>

      {/* ===== Dialog: Catat Pembayaran / Bayar Angsuran (BR-INV-004 & Tabel 32) ===== */}
      <Dialog
        open={Boolean(payId)}
        onClose={() => setPayId(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 'md' },
            borderRadius: { xs: 0, sm: 2 },
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: { xs: 'none', sm: '0 12px 40px rgba(15,23,42,0.1)' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, px: { xs: 2, sm: 3 } }}>
          {payInvoice?.metodePembayaran === 'cicilan' ? 'Pelunasan Angsuran' : 'Catat Pembayaran'} — {payInvoice?.no}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 1.5, sm: 3 } }}>
          {/* ===== 3 KARTU MINI RINGKASAN TAGIHAN & SISA ===== */}
          {(() => {
            const total = payInvoice?.total || 0;
            const paidAmt = paidOf(payInvoice || {});
            const remaining = Math.max(0, total - paidAmt);
            const progress = total > 0 ? Math.min(100, Math.round((paidAmt / total) * 100)) : 0;

            return (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <Card elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ letterSpacing: '0.04em' }}>
                      TOTAL TAGIHAN
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mt: 0.25 }}>
                      {formatRupiah(total)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {syaratLabel(payInvoice)}
                    </Typography>
                  </CardContent>
                </Card>

                <Card elevation={0} sx={{ borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ letterSpacing: '0.04em' }}>
                      TOTAL TERBAYAR
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="success.main" sx={{ mt: 0.25 }}>
                      {formatRupiah(paidAmt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Terlunasi {progress}%
                    </Typography>
                  </CardContent>
                </Card>

                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: remaining > 0 ? '#fecaca' : '#bbf7d0',
                    bgcolor: remaining > 0 ? '#fef2f2' : '#f0fdf4',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color={remaining > 0 ? 'error.main' : 'success.main'}
                        sx={{ letterSpacing: '0.04em' }}
                      >
                        SISA TAGIHAN
                      </Typography>
                      <StatusChip kind="paid" status={remaining === 0 ? 'yes' : 'partial'} size="small" />
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      fontWeight={850}
                      color={remaining > 0 ? 'error.main' : 'success.main'}
                      sx={{ mt: 0.25 }}
                    >
                      {formatRupiah(remaining)}
                    </Typography>
                    <Typography variant="caption" color={remaining > 0 ? 'error.dark' : 'success.dark'} display="block">
                      {remaining > 0 ? 'Wajib ditagihkan' : 'Lunas sepenuhnya'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            );
          })()}

          {/* Identitas Petugas Pencatat Otomatis */}
          <Alert severity="info" icon={<BadgeRoundedIcon fontSize="small" />} sx={{ mb: 2, borderRadius: 1.5, py: 0.5 }}>
            Petugas Finance Pencatat: <b>{user?.name || 'Finance'}</b>
          </Alert>

          {payInvoice?.metodePembayaran === 'cicilan' && payInvoice.installments ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                  Jadwal Angsuran Bulanan
                </Typography>
                <Stack spacing={1}>
                  {payInvoice.installments.map((a) => {
                    const isSelected = activeInstKe === a.ke && a.status !== 'lunas';
                    return (
                      <Card
                        key={a.ke}
                        elevation={0}
                        sx={{
                          borderRadius: 1.5,
                          border: isSelected ? '2px solid' : '1px solid',
                          borderColor: a.status === 'lunas' ? 'success.main' : isSelected ? 'primary.main' : 'divider',
                          bgcolor: isSelected ? 'action.hover' : 'background.paper',
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography fontWeight={750} fontSize={13.5}>Angsuran ke-{a.ke}</Typography>
                              {a.status === 'lunas' ? (
                                <Chip
                                  size="small"
                                  color="success"
                                  icon={<CheckCircleRoundedIcon />}
                                  label={`Lunas • ${a.paidMethod || '-'}${a.petugasNama ? ` (${a.petugasNama})` : ''}`}
                                  sx={{ height: 22 }}
                                />
                              ) : a.jatuhTempo < todayISO() ? (
                                <Chip size="small" color="error" label={`Jatuh Tempo ${a.jatuhTempo}`} sx={{ height: 20 }} />
                              ) : null}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', display: 'block', mt: 0.25 }}>
                              {formatRupiah(a.nominal)} • Jatuh tempo: {a.jatuhTempo}
                            </Typography>
                          </Box>
                          {a.status !== 'lunas' && isFinance && (
                            <Button
                              size="small"
                              variant={isSelected ? 'contained' : 'outlined'}
                              color="primary"
                              onClick={() => {
                                setActiveInstKe(a.ke);
                                setInstProofErr('');
                                setInstNoteErr('');
                              }}
                            >
                              {isSelected ? 'Dipilih' : 'Pilih Bayar'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>

              {/* Form Pelunasan Angsuran Terpilih (Tidak lagi hardcode Transfer Bank) */}
              {activeInstKe && isFinance && (() => {
                const targetInst = payInvoice.installments.find((a) => a.ke === activeInstKe && a.status !== 'lunas');
                if (!targetInst) return null;
                return (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'primary.main' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1.5 }}>
                      Form Pelunasan Angsuran ke-{targetInst.ke} ({formatRupiah(targetInst.nominal)})
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                          select
                          label="Metode Penerimaan"
                          value={instMethod}
                          onChange={(e) => {
                            setInstMethod(e.target.value);
                            if (e.target.value !== 'Transfer Bank') setInstProofErr('');
                          }}
                          helperText="Pilih metode penerimaan angsuran."
                        >
                          <MenuItem value="Transfer Bank">Transfer Bank</MenuItem>
                          <MenuItem value="Tunai">Tunai</MenuItem>
                        </TextField>

                        <TextField
                          label="Nomor Resi / Referensi (Opsional)"
                          value={instResi}
                          onChange={(e) => setInstResi(e.target.value)}
                          inputProps={{ maxLength: 100 }}
                          helperText="Nomor referensi mutasi / kuitansi."
                        />
                      </Box>

                      <ProofUploadField
                        method={instMethod}
                        proofFile={instProof}
                        setProofFile={setInstProof}
                        proofErr={instProofErr}
                        setProofErr={setInstProofErr}
                      />

                      <TextField
                        label="Catatan Pembayaran (Opsional)"
                        multiline
                        minRows={2}
                        value={instCatatan}
                        onChange={(e) => {
                          setInstCatatan(e.target.value.slice(0, MAX_NOTE_LENGTH));
                          setInstNoteErr('');
                        }}
                        error={Boolean(instNoteErr)}
                        helperText={instNoteErr || `${instCatatan.length}/${MAX_NOTE_LENGTH} karakter`}
                        inputProps={{ maxLength: MAX_NOTE_LENGTH }}
                      />

                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button onClick={() => setActiveInstKe(null)}>Batal Pilih</Button>
                        <Button variant="contained" color="success" onClick={submitInstallmentPay}>
                          Simpan Pelunasan Angsuran ke-{targetInst.ke}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })()}

              <PaymentHistoryList
                payments={payInvoice?.payments || []}
                onPreviewProof={(pf) => setPreviewProof(pf)}
              />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  select
                  label="Metode Penerimaan"
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    if (e.target.value !== 'Transfer Bank') setProofErr('');
                  }}
                  helperText="Bagaimana pembayaran diterima oleh Finance."
                >
                  <MenuItem value="Transfer Bank">Transfer Bank</MenuItem>
                  <MenuItem value="Tunai">Tunai</MenuItem>
                </TextField>

                <TextField
                  type="number"
                  label="Nominal Diterima (Rp) *"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErr(''); }}
                  error={Boolean(overpayMsg || err)}
                  helperText={overpayMsg || err || `Maksimal sebesar sisa tagihan: ${formatRupiah(sisaBayar)}`}
                  inputProps={{ min: 1, max: sisaBayar }}
                />
              </Box>

              {isPartialPayment && (
                <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                  Nominal lebih kecil dari sisa tagihan — akan tercatat sebagai <b>pembayaran parsial</b> (Sisa setelah bayar: {formatRupiah(sisaBayar - numericAmount)}).
                </Alert>
              )}

              <TextField
                label="Nomor Resi / Referensi Pembayaran (Opsional)"
                value={noResi}
                onChange={(e) => setNoResi(e.target.value)}
                inputProps={{ maxLength: 100 }}
                placeholder="Contoh: TRF-20261027-00192"
              />

              <ProofUploadField
                method={method}
                proofFile={proofFile}
                setProofFile={setProofFile}
                proofErr={proofErr}
                setProofErr={setProofErr}
              />

              <TextField
                label="Catatan Pembayaran (Opsional)"
                multiline
                minRows={2}
                value={catatan}
                onChange={(e) => {
                  setCatatan(e.target.value.slice(0, MAX_NOTE_LENGTH));
                  setNoteErr('');
                }}
                error={Boolean(noteErr)}
                helperText={noteErr || `${catatan.length}/${MAX_NOTE_LENGTH} karakter`}
                inputProps={{ maxLength: MAX_NOTE_LENGTH }}
                placeholder="Tambahkan keterangan verifikasi mutasi atau catatan penagihan..."
              />

              <PaymentHistoryList
                payments={payInvoice?.payments || []}
                onPreviewProof={(pf) => setPreviewProof(pf)}
              />
            </Stack>
          )}
        </DialogContent>

        {payInvoice?.metodePembayaran !== 'cicilan' ? (
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setPayId(null)}>Batal</Button>
            <Button variant="contained" color="success" onClick={submitPay} disabled={isOverpayment}>
              Simpan Pembayaran
            </Button>
          </DialogActions>
        ) : (
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPayId(null)}>Tutup</Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ===== Dialog Pengaturan Invoice: Jatuh Tempo & Multi-Rekening Perusahaan (BR-INV-006, Tabel 32 & 33) ===== */}
      <Dialog
        open={Boolean(configId)}
        onClose={() => setConfigId(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Pengaturan Invoice — {configInvoice?.no}
        </DialogTitle>
        <DialogContent dividers>
          {configInvoice && (
            <Stack spacing={2.5} sx={{ mt: 0.5 }}>
              <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                Tanggal Terbit Invoice: <b>{configInvoice.date}</b>. Tanggal jatuh tempo wajib sama dengan atau setelah tanggal terbit, dan rekening tujuan hanya menampilkan rekening aktif milik perusahaan.
              </Alert>

              <TextField
                type="date"
                label="Tanggal Jatuh Tempo (Due Date)"
                value={cfgDueDate}
                onChange={(e) => {
                  setCfgDueDate(e.target.value);
                  setCfgDueErr('');
                }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: configInvoice.date }}
                error={Boolean(cfgDueErr)}
                helperText={cfgDueErr || `Minimal tanggal ${configInvoice.date}`}
                fullWidth
              />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    MULTI-REKENING BANK PERUSAHAAN (AKTIF)
                  </Typography>
                  {companyBanks.length > 0 && (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        sx={{ textTransform: 'none', py: 0, fontSize: 12 }}
                        onClick={() => {
                          setCfgBankIds(companyBanks.map((b) => b.id));
                          setCfgBankErr('');
                        }}
                      >
                        Pilih Semua
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        sx={{ textTransform: 'none', py: 0, fontSize: 12 }}
                        onClick={() => setCfgBankIds([])}
                      >
                        Reset
                      </Button>
                    </Stack>
                  )}
                </Stack>

                <TextField
                  select
                  fullWidth
                  label="Pilih Rekening Pembayaran Perusahaan"
                  value={cfgBankIds}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCfgBankIds(typeof val === 'string' ? val.split(',') : val);
                    setCfgBankErr('');
                  }}
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected) => {
                      const names = companyBanks
                        .filter((b) => selected.some((id) => String(id) === String(b.id)))
                        .map((b) => `${b.nama} (${b.noRekening})`);
                      return names.length ? names.join(', ') : 'Belum ada rekening dipilih';
                    },
                  }}
                  error={Boolean(cfgBankErr)}
                  helperText={
                    cfgBankErr ||
                    (companyBanks.length
                      ? 'Dapat memilih lebih dari 1 rekening aktif perusahaan untuk dicantumkan pada Invoice.'
                      : 'Belum ada Master Bank aktif berkategori Rekening Perusahaan.')
                  }
                >
                  {companyBanks.map((b) => {
                    const checked = cfgBankIds.some((id) => String(id) === String(b.id));
                    return (
                      <MenuItem key={b.id} value={b.id}>
                        <Checkbox size="small" checked={checked} />
                        <ListItemText
                          primary={`${b.nama} — ${b.noRekening}`}
                          secondary={`a.n. ${b.atasNama}`}
                        />
                      </MenuItem>
                    );
                  })}
                </TextField>

                {cfgBankIds.length > 0 && (
                  <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1 }}>
                    {companyBanks
                      .filter((b) => cfgBankIds.some((id) => String(id) === String(b.id)))
                      .map((b) => (
                        <Chip
                          key={b.id}
                          size="small"
                          icon={<AccountBalanceRoundedIcon />}
                          label={`${b.nama} • ${b.noRekening}`}
                          onDelete={() =>
                            setCfgBankIds((prev) => prev.filter((id) => String(id) !== String(b.id)))
                          }
                        />
                      ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setConfigId(null)}>Batal</Button>
          <Button variant="contained" onClick={saveInvoiceConfig}>
            Simpan Pengaturan
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Dialog Detail Invoice — Lebar maxWidth="md", Grid 2 Kolom ===== */}
      <Dialog
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 12px 40px rgba(15,23,42,0.1)',
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Detail Invoice — {detailInvoice?.no}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden', p: { xs: 2, sm: 3 } }}>
          {detailInvoice && (() => {
            const selectedBankIds = resolveInvoiceBankIds(detailInvoice, db);
            const selectedBanks = companyBanks.filter((b) =>
              selectedBankIds.some((id) => String(id) === String(b.id))
            );
            const detailDue = getDueDate(detailInvoice);

            return (
              <>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5, flexWrap: 'wrap' }}>
                  {detailInvoice.status === 'lunas' ? (
                    <StatusChip kind="paid" status="yes" />
                  ) : detailInvoice.status === 'dibatalkan' ? (
                    <Chip size="small" variant="outlined" label="Dibatalkan" />
                  ) : paidOf(detailInvoice) > 0 ? (
                    <Chip size="small" color="warning" label="Belum Lunas (Parsial)" />
                  ) : (
                    <StatusChip kind="paid" status="no" />
                  )}
                  {overdue(detailInvoice) && (
                    <Chip size="small" color="error" label={`Jatuh Tempo ${detailDue || ''}`.trim()} />
                  )}
                </Stack>

                {/* GRID 2 KOLOM METADATA INVOICE */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    columnGap: 3,
                    rowGap: 0.5,
                    mb: 2.5,
                  }}
                >
                  <KV label="No. Invoice" value={detailInvoice.no} />
                  <KV label="Order Sumber" value={detailInvoice.orderNo || '-'} />
                  <KV label="Tanggal Terbit" value={detailInvoice.date} />
                  <KV label="Tanggal Jatuh Tempo" value={detailDue || 'Mengikuti jadwal angsuran'} />
                  <KV label="Outlet Pelanggan" value={outletName(detailInvoice.outletId)} />
                  <KV label="Sales Terkait" value={salesName(detailInvoice.salesId)} />
                  <KV label="Syarat Pembayaran" value={syaratLabel(detailInvoice)} />
                  <KV
                    label="Status Pelunasan"
                    value={
                      detailInvoice.status === 'lunas' ? (
                        <Typography fontWeight={750} color="success.main">
                          Lunas Terverifikasi{detailInvoice.paidBy ? ` (${detailInvoice.paidBy})` : ''}
                        </Typography>
                      ) : (
                        <Typography fontWeight={750} color="warning.main">
                          Sisa Tagihan: {formatRupiah(Math.max(0, detailInvoice.total - paidOf(detailInvoice)))}
                        </Typography>
                      )
                    }
                  />
                </Box>

                {/* Daftar Multi-Rekening Pembayaran Perusahaan (BR-INV-006) */}
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover', mb: 2.5 }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: '0.04em' }}>
                      REKENING PEMBAYARAN PERUSAHAAN ({selectedBanks.length})
                    </Typography>
                    {isFinance && detailInvoice.status !== 'dibatalkan' && (
                      <Button
                        size="small"
                        startIcon={<EditCalendarRoundedIcon fontSize="small" />}
                        sx={{ textTransform: 'none', py: 0, fontSize: 12 }}
                        onClick={() => setConfigId(detailInvoice.id)}
                      >
                        Ubah Jatuh Tempo & Rekening
                      </Button>
                    )}
                  </Stack>
                  {selectedBanks.length > 0 ? (
                    <Stack spacing={0.5}>
                      {selectedBanks.map((b) => (
                        <Typography key={b.id} variant="body2" sx={{ fontSize: '0.82rem' }}>
                          • <b>{b.nama}</b> — <span style={{ fontFamily: 'monospace' }}>{b.noRekening}</span> (a.n. {b.atasNama})
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Belum ada rekening aktif perusahaan yang dipilih.
                    </Typography>
                  )}
                </Paper>

                {/* Rincian Item */}
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25, fontSize: '0.85rem' }}>
                  Rincian Barang Tertagih
                </Typography>
                <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2.5 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Produk</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Harga</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Jumlah</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detailInvoice.items || []).map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={650}>{it.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{it.sku}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{it.qty} {it.unit}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(it.price)}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          <b>{formatRupiah(it.line)}</b>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Ringkasan Finansial Multi-Kolom */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">SUBTOTAL</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(detailInvoice.subtotal)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">PPN {Math.round((detailInvoice.taxRate || 0.11) * 100)}%</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(detailInvoice.tax)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">SUDAH DIBAYAR</Typography>
                    <Typography variant="body2" fontWeight={750} color="success.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(paidOf(detailInvoice))}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="primary.main" fontWeight={800} display="block">TOTAL INVOICE</Typography>
                    <Typography variant="subtitle1" fontWeight={850} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{formatRupiah(detailInvoice.total)}</Typography>
                  </Box>
                </Box>

                {/* Jadwal Angsuran jika Cicilan */}
                {detailInvoice.metodePembayaran === 'cicilan' && detailInvoice.installments && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Jadwal Angsuran</Typography>
                    {detailInvoice.installments.map((a) => (
                      <Stack
                        key={a.ke}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={650}>Angsuran ke-{a.ke}</Typography>
                          {a.status === 'lunas' && (
                            <Typography variant="caption" color="text.secondary">
                              {a.paidMethod || '-'}{a.petugasNama ? ` • Oleh: ${a.petugasNama}` : ''}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Typography variant="caption" color="text.secondary">{a.jatuhTempo}</Typography>
                          <Typography variant="body2" fontWeight={750} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(a.nominal)}</Typography>
                          {a.bukti_pembayaran?.dataUrl && (
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<AttachFileRoundedIcon fontSize="small" />}
                              onClick={() => setPreviewProof(a.bukti_pembayaran)}
                              sx={{ textTransform: 'none', fontSize: 11.5 }}
                            >
                              Bukti
                            </Button>
                          )}
                          {a.status === 'lunas'
                            ? <Chip size="small" color="success" label="Lunas" sx={{ height: 20 }} />
                            : <Chip size="small" variant="outlined" label="Belum" sx={{ height: 20 }} />}
                        </Stack>
                      </Stack>
                    ))}
                  </Box>
                )}

                {/* Riwayat Pembayaran Lengkap */}
                <PaymentHistoryList
                  payments={detailInvoice.payments || []}
                  onPreviewProof={(pf) => setPreviewProof(pf)}
                />
              </>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setDetailId(null)}>Tutup</Button>
          {detailInvoice && isFinance && detailInvoice.status !== 'dibatalkan' && (
            <Button
              variant="outlined"
              startIcon={<EditCalendarRoundedIcon />}
              sx={{ textTransform: 'none' }}
              onClick={() => setConfigId(detailInvoice.id)}
            >
              Atur Jatuh Tempo & Rekening
            </Button>
          )}
          {detailInvoice && (
            <Button
              variant="outlined"
              startIcon={<PrintRoundedIcon />}
              onClick={() => {
                const ok = openInvoicePdf(detailInvoice, db);
                if (!ok) toast('Izinkan popup browser untuk mencetak PDF.', 'warning');
              }}
            >
              Cetak / Unduh PDF
            </Button>
          )}
          {detailInvoice && (
            <Button variant="outlined" onClick={() => shareInvoiceWhatsApp(detailInvoice, db)}>
              Bagikan WhatsApp
            </Button>
          )}
          {detailInvoice && detailInvoice.status === 'belum_lunas' && isFinance && (
            <Button
              variant="contained"
              color={detailInvoice.metodePembayaran === 'cicilan' ? 'warning' : 'success'}
              sx={{ borderRadius: 1, fontWeight: 650, textTransform: 'none' }}
              onClick={() => { setDetailId(null); setPayId(detailInvoice.id); }}
            >
              {detailInvoice.metodePembayaran === 'cicilan' ? 'Bayar Angsuran' : 'Catat Pembayaran'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ===== Dialog Preview Bukti Pembayaran (.JPG / .PNG / .PDF) ===== */}
      <Dialog
        open={Boolean(previewProof)}
        onClose={() => setPreviewProof(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Bukti Pembayaran — {previewProof?.name || 'Lampiran'}
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: 'center', p: 2 }}>
          {previewProof && (
            previewProof.type === 'application/pdf' || /\.pdf$/i.test(previewProof.name || '') ? (
              <Box
                component="iframe"
                src={previewProof.dataUrl}
                title={previewProof.name || 'PDF Bukti Pembayaran'}
                sx={{ width: '100%', height: '68vh', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              />
            ) : (
              <Box
                component="img"
                src={previewProof.dataUrl}
                alt={previewProof.name || 'Bukti Pembayaran'}
                sx={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 1.5, mx: 'auto' }}
              />
            )
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setPreviewProof(null)}>Tutup</Button>
          {previewProof?.dataUrl && (
            <Button
              variant="contained"
              component="a"
              href={previewProof.dataUrl}
              download={previewProof.name || 'bukti-pembayaran'}
              startIcon={<DownloadRoundedIcon />}
            >
              Unduh Berkas
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
