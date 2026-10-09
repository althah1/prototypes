import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';

import { useAuth } from '../../store/AuthContext';
import { useDb } from '../../store/DbContext';
import { useToast } from '../ui/ToastProvider';
import { useSync } from '../../store/SyncContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import StatusChip from '../ui/StatusChip';
import { todayISO, nowStamp, formatRupiah, QUOTE_DISCOUNT_LIMIT } from '../../utils/helpers';
import { openQuotePdf, shareQuoteWhatsApp } from '../../utils/quotePdf';
import { maxDiscountOf } from '../../utils/quoteUtils';
import { completeTaskAuto } from '../../utils/taskUtils';
import { reduceStockByOrder } from '../../utils/gudangUtils';

/* component="div" pada nilai → chip/typography bersarang tidak memicu warning DOM */
const KV = ({ label, value }) => (
  <Stack sx={{ py: 0.5 }}>
    <Typography variant="caption" color="text.secondary"
      sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10.5, mb: 0.4, display: 'block' }}>
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600} component="div"
      sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.25, py: 0.75, overflowWrap: 'anywhere', display: 'block' }}>
      {value}
    </Typography>
  </Stack>
);

/* Label metode pembayaran quotation/order */
const payLabel = (q, db) => {
  switch (q?.metodePembayaran) {
    case 'transfer': {
      const b = (db.banks || []).find((x) => x.id === q.bankId);
      return b ? `Transfer — ${b.nama} (${b.noRekening} a.n. ${b.atasNama})` : 'Transfer Bank';
    }
    case 'termin': return `Termin ${q.terminHari || 14} hari`;
    case 'cicilan': return 'Cicilan';
    case 'konsinyasi': return 'Konsinyasi — bayar sesuai barang terjual';
    default: return 'Tunai (COD)';
  }
};

/*
 * QuoteDetailDialog — dipakai QuoteMobile (salesActions) & QuoteDesktop
 * (supervisorActions).
 *
 * ALUR BARU (keputusan tim): SEMUA quotation harus disetujui Supervisor
 * sebelum bisa dikirim ke pelanggan —
 * draft (sales edit) → Ajukan ke Supervisor → pending_approval →
 * Supervisor setujui → sent (PDF/share terbuka) → pelanggan setujui →
 * approved → konversi ke order. Order baru bisa disetujui SETELAH
 * quotation-nya disetujui (alur konversi menjamin urutan ini).
 *
 * Desain responsif berbasis route: mobile (/app) tutup via X di judul;
 * desktop tutup via tombol Tutup di bawah.
 */
export default function QuoteDetailDialog({ open, quoteId, onClose, salesActions = false, supervisorActions = false }) {
  const { user } = useAuth();
  const { db, insert, update, mutate } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();
  const navigate = useNavigate();
  const isMobile = useLocation().pathname.startsWith('/app');

  /* Semua hooks di atas — sebelum early return */
  const [confirmConvert, setConfirmConvert] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');

  const quote = (db.quotations || []).find((q) => q.id === quoteId);

  useEffect(() => {
    setConfirmConvert(false); setRejectOpen(false); setReason(''); setReasonErr('');
  }, [quoteId]);

  useEffect(() => {
    if (!open) { setConfirmConvert(false); setRejectOpen(false); }
  }, [open]);

  if (!quote) return null; /* early return SETELAH semua hooks — aman */

  const outlet = (db.outlets || []).find((o) => o.id === quote.outletId) || {};
  const salesName = (db.sales || []).find((s) => s.id === quote.salesId)?.name || '-';
  const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === quote.salesId);
  const convertedOrder = quote.convertedOrderId
    ? (db.orders || []).find((o) => o.id === quote.convertedOrderId)
    : null;

  const maxDisc = maxDiscountOf(quote.items);
  const overLimit = maxDisc > QUOTE_DISCOUNT_LIMIT;
  /* PDF & share hanya SETELAH Supervisor menyetujui (sent/approved) */
  const pdfAllowed = ['sent', 'approved'].includes(quote.status);

  const supervisorOfSales = () => {
    const sales = (db.sales || []).find((s) => s.id === quote.salesId);
    const spv = (db.supervisors || []).find((s) => s.id === sales?.supervisorId);
    return (db.users || []).find((u) => u.email === spv?.email);
  };

  /* ---------- Aksi Sales ---------- */
  const doPdf = () => {
    const ok = openQuotePdf(quote, db);
    if (!ok) toast('Izinkan popup pada browser untuk mencetak / menyimpan PDF.', 'warning');
  };

  /* SEMUA quotation diajukan ke Supervisor sebelum bisa dikirim (alur tim) */
  const submitForApproval = () => {
    update('quotations', quote.id, { status: 'pending_approval', submittedAt: nowStamp() });
    const spvUser = supervisorOfSales();
    if (spvUser) notify(spvUser.id, 'Quotation Menunggu Approval',
      `${quote.no} dari ${salesName}${overLimit ? ` — diskon ${maxDisc}% melebihi wewenang ${QUOTE_DISCOUNT_LIMIT}%` : ''}.`);
    toast('Quotation diajukan ke Supervisor — menunggu persetujuan sebelum dapat dikirim.', 'info');
  };

  const customerDecision = (ok) => {
    update('quotations', quote.id, {
      status: ok ? 'approved' : 'rejected',
      decidedAt: nowStamp(),
      rejectReason: ok ? undefined : 'Ditolak oleh pelanggan',
    });
    toast(ok
      ? 'Quotation disetujui pelanggan — siap dikonversi ke Entry Order.'
      : 'Quotation ditolak pelanggan.', ok ? 'success' : 'warning');
  };

  /* Konversi 1-klik → order; quotation TERKUNCI; metode pembayaran terbawa */
  const convertToOrder = () => {
    if (quote.convertedOrderId) return; /* anti konversi ganda */
    const t = todayISO();
    const kodeSales = (db.sales || []).find((s) => s.id === quote.salesId)?.nik || 'SFA';
    const no = `ORD-${t.replace(/-/g, '')}-${kodeSales}-${String((db.orders || []).filter((o) => o.date === t).length + 1).padStart(3, '0')}`;
    const order = {
      no, date: t, salesId: quote.salesId, outletId: quote.outletId,
      items: quote.items.map(({ productId, sku, name, unit, qty, price, disc, line, pcsPerUnit }) => (
        { productId, sku, name, unit, qty, price, disc, line, pcsPerUnit }
      )),
      subtotal: quote.totalAfterDisc, taxRate: quote.taxRate, tax: quote.tax, total: quote.total,
      status: 'submitted', note: `Konversi dari Quotation ${quote.no}`, paid: false,
      metodePembayaran: quote.metodePembayaran || 'tunai',
      bankId: quote.metodePembayaran === 'transfer' ? (quote.bankId ?? null) : null,
      terminHari: quote.metodePembayaran === 'termin' ? (quote.terminHari ?? null) : null,
      viaPembayaran: ['termin', 'konsinyasi'].includes(quote.metodePembayaran)
        ? (quote.viaPembayaran || 'tunai') : null,
      viaBankId: ['termin', 'konsinyasi'].includes(quote.metodePembayaran)
        && quote.viaPembayaran === 'transfer' ? (quote.viaBankId ?? null) : null,
      konsinyasiHari: quote.metodePembayaran === 'konsinyasi' ? (quote.konsinyasiHari || 30) : null,
      cicilanDP: quote.metodePembayaran === 'cicilan' ? (Number(quote.cicilanDP) || 0) : 0,
      jumlahCicilan: quote.metodePembayaran === 'cicilan' ? (Number(quote.jumlahCicilan) || 3) : null,
    };
    const rec = insert('orders', order);

    /* Kurangi stok per gudang (otomatis, stok terbanyak duluan) + sinkron total */
    reduceStockByOrder(mutate, order.items);
    completeTaskAuto(db, mutate, { outletId: quote.outletId, type: 'order', salesId: quote.salesId });

    const spvUser = supervisorOfSales();
    if (spvUser) notify(spvUser.id, 'Order Baru Menunggu Approval', `${no} (konversi dari ${quote.no}) — ${formatRupiah(order.total)}.`);

    update('quotations', quote.id, { status: 'converted', convertedOrderId: rec.id, convertedAt: nowStamp() });
    setConfirmConvert(false);
    onClose();
    toast(`Quotation dikonversi menjadi order ${no} — dokumen terkunci.`, 'success');
    if (salesActions) navigate('/app/order');
  };

  /* ---------- Aksi Supervisor — approval SEMUA quotation ---------- */
  const spvApprove = () => {
    update('quotations', quote.id, {
      status: 'sent', spvApprovedAt: nowStamp(), spvApprovedBy: user.name, sentAt: nowStamp(),
    });
    if (salesUser) notify(salesUser.id, 'Quotation Disetujui Supervisor',
      `${quote.no} disetujui — dokumen dapat dikirim/diunduh dan diajukan ke pelanggan.`);
    toast('Quotation disetujui — sales dapat mengirim dokumen ke pelanggan.', 'success');
  };

  const submitSpvReject = () => {
    const v = reason.trim();
    if (!v) { setReasonErr('Catatan penolakan wajib diisi.'); return; }
    if (v.length < 10) { setReasonErr('Catatan penolakan minimal 10 karakter.'); return; }
    update('quotations', quote.id, { status: 'rejected', rejectReason: v, decidedBy: user.name, decidedAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Quotation Ditolak', `${quote.no} ditolak: ${v}`);
    toast('Quotation ditolak oleh Supervisor.', 'warning');
    setRejectOpen(false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, pr: isMobile ? 6 : 3, position: 'relative' }}>
          Detail Quotation {quote.no}
          {isMobile && (
            <IconButton onClick={onClose} size="small" aria-label="Tutup"
              sx={{ position: 'absolute', right: 12, top: 12 }}>
              <CloseRoundedIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <KV label="Tanggal" value={quote.date} />
            <KV label="Sales" value={salesName} />
            <KV label="Outlet" value={outlet.name || '-'} />
            <KV label="Berlaku s.d" value={quote.validUntil} />
            <KV label="Metode Pembayaran" value={payLabel(quote, db)} />
            <KV label="Diskon Maks" value={
              overLimit
                ? <Typography variant="body2" fontWeight={800} color="warning.main">
                    {maxDisc}% (lewat batas {QUOTE_DISCOUNT_LIMIT}%)
                  </Typography>
                : `${maxDisc}%`
            } />
            <KV label="Status" value={<StatusChip kind="quote" status={quote.status} />} />
            <KV label="Kode Verifikasi" value={<Chip size="small" variant="outlined" color="primary" label={quote.verCode || '-'} />} />
            {quote.spvApprovedAt && <KV label="Approval Supervisor" value={`${quote.spvApprovedBy || 'Supervisor'} • ${quote.spvApprovedAt}`} />}
            {quote.rejectReason && <KV label="Alasan Ditolak" value={quote.rejectReason} />}
            {convertedOrder && <KV label="Dikonversi ke Order" value={convertedOrder.no} />}
          </Stack>

          {quote.status === 'pending_approval' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Menunggu persetujuan <b>Supervisor</b> — dokumen tidak dapat dikirim/diunduh sebelum
              disetujui.{overLimit ? ` Diskon ${maxDisc}% melebihi wewenang ${QUOTE_DISCOUNT_LIMIT}%.` : ''}
            </Alert>
          )}
          {quote.status === 'draft' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Quotation masih draft — klik <b>Ajukan ke Supervisor</b> untuk meminta persetujuan
              sebelum dikirim ke pelanggan.
            </Alert>
          )}
          {quote.status === 'converted' && (
            <Alert severity="info" icon={<LockRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
              Telah dikonversi menjadi order <b>{convertedOrder?.no}</b> — dokumen <b>terkunci</b>,
              tidak dapat diubah atau dikonversi ulang.
            </Alert>
          )}
          {quote.status === 'expired' && (
            <Alert severity="error" sx={{ mb: 2 }}>Masa berlaku quotation telah habis — otomatis Kadaluarsa.</Alert>
          )}

          {isMobile ? (
            <Stack spacing={1}>
              {quote.items.map((i) => (
                <Box key={i.productId} sx={{ borderBottom: '1px dashed', borderColor: 'divider', pb: 1, '&:last-child': { borderBottom: 0, pb: 0 } }}>
                  <Typography fontWeight={700} fontSize={13} noWrap sx={{ mb: 0.25 }}>{i.name}</Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {i.qty} {i.unit} × {formatRupiah(i.price)}{(i.disc || 0) > 0 ? ` • disc ${i.disc}%` : ''}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} noWrap>{formatRupiah(i.line)}</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produk</TableCell><TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Harga</TableCell><TableCell align="center">Disc</TableCell>
                  <TableCell align="right">Jumlah</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quote.items.map((i) => (
                  <TableRow key={i.productId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{i.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatRupiah(i.price)} / {i.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">{i.qty} {i.unit}</TableCell>
                    <TableCell align="right">{formatRupiah(i.price)}</TableCell>
 <TableCell align="center">{i.disc || 0}%</TableCell>
                    <TableCell align="right"><b>{formatRupiah(i.line)}</b></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Stack spacing={0.5} sx={{ mt: 2 }}>
            <KV label="Subtotal" value={formatRupiah(quote.subtotal)} />
            <KV label="Diskon" value={`− ${formatRupiah(quote.discTotal)}`} />
            <KV label={`PPN ${Math.round((quote.taxRate || 0.11) * 100)}%`} value={formatRupiah(quote.tax)} />
            <KV label="TOTAL" value={<Typography color="primary" fontWeight={800}>{formatRupiah(quote.total)}</Typography>} />
          </Stack>

          {quote.note && (
            <Alert severity="info" sx={{ mt: 1.5 }} icon={<NoteRoundedIcon fontSize="small" />}>
              {quote.note}
            </Alert>
          )}
          {quote.catatanSyarat && (
            <Alert severity="info" sx={{ mt: 1.5 }} icon={<DescriptionRoundedIcon fontSize="small" />}>
              <b>Syarat &amp; Ketentuan (tercetak di PDF):</b> {quote.catatanSyarat}
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 1.5 }} icon={<LockRoundedIcon fontSize="small" />}>
            Harga merupakan <b>snapshot</b> saat dokumen dibuat — perubahan Master Data tidak mengubah dokumen.
          </Alert>
        </DialogContent>

        <DialogActions sx={isMobile
          ? { flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2 }
          : { flexWrap: 'wrap', gap: 1 }}>
          {!isMobile && <Button onClick={onClose}>Tutup</Button>}

          {salesActions && pdfAllowed && (
            <>
              <Button startIcon={<ShareRoundedIcon />} onClick={() => shareQuoteWhatsApp(quote, db)}>Bagikan</Button>
              <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={doPdf}>Cetak PDF</Button>
            </>
          )}
          {salesActions && quote.status === 'draft' && (
            <Button variant="contained" startIcon={<SendRoundedIcon />} onClick={submitForApproval}>
              Ajukan ke Supervisor
            </Button>
          )}
          {salesActions && quote.status === 'sent' && (
            <>
              <Button color="error" startIcon={<CancelRoundedIcon />} onClick={() => customerDecision(false)}>Tolak</Button>
              <Button color="success" variant="contained" startIcon={<CheckCircleRoundedIcon />} onClick={() => customerDecision(true)}>Setujui</Button>
            </>
          )}
          {salesActions && quote.status === 'approved' && !quote.convertedOrderId && (
            <Button variant="contained" startIcon={<ShoppingCartRoundedIcon />} onClick={() => setConfirmConvert(true)}>
              Konversi ke Order
            </Button>
          )}
          {supervisorActions && quote.status === 'pending_approval' && (
            <>
              <Button color="error" onClick={() => { setReason(''); setReasonErr(''); setRejectOpen(true); }}>Tolak Quotation</Button>
              <Button color="success" variant="contained" onClick={spvApprove}>Setujui Quotation</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog alasan tolak quotation (Supervisor) */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle>Tolak Quotation — {quote.no}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <TextField label="Alasan penolakan (wajib)" multiline minRows={2} value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonErr(''); }}
            error={!!reasonErr} helperText={reasonErr || ' '}
            inputProps={{ maxLength: 255 }} autoFocus />
        </DialogContent>
        <DialogActions sx={isMobile
          ? { flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2 }
          : { flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setRejectOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={submitSpvReject}>Tolak Quotation</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmConvert}
        onClose={() => setConfirmConvert(false)}
        onConfirm={convertToOrder}
        title="Konversi ke Entry Order"
        message={`Konversi ${quote.no} menjadi Entry Order tanpa input ulang? Metode pembayaran (${payLabel(quote, db)}) ikut terbawa. Setelah dikonversi, quotation akan TERKUNCI dan tidak dapat dikonversi ulang.`}
        confirmLabel="Ya, Konversi"
      />
    </>
  );
}