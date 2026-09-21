import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
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

const KV = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ borderBottom: '1px dashed', borderColor: 'divider', py: 0.7 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} component="div" sx={{ textAlign: 'right' }}>{value}</Typography>
  </Stack>
);

/*
 * salesActions      → tombol aksi Sales (PDF, kirim, keputusan pelanggan, konversi)
 * supervisorActions → tombol approval diskon Supervisor (#53)
 */
export default function QuoteDetailDialog({ open, quoteId, onClose, salesActions = false, supervisorActions = false }) {
  const { user } = useAuth();
  const { db, insert, update, mutate } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();
  const navigate = useNavigate();

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
  const company = (db.companies || [])[0];
  const salesName = (db.sales || []).find((s) => s.id === quote.salesId)?.name || '-';
  const salesUser = (db.users || []).find((u) => u.role === 'sales' && u.salesId === quote.salesId);
  const convertedOrder = quote.convertedOrderId
    ? (db.orders || []).find((o) => o.id === quote.convertedOrderId)
    : null;

  const maxDisc = maxDiscountOf(quote.items);
  const needsSpv = maxDisc > QUOTE_DISCOUNT_LIMIT;
  /* PDF hanya boleh bila bukan pending-approval (#53) */
  const pdfAllowed = ['draft', 'sent', 'approved'].includes(quote.status)
    && (!needsSpv || quote.spvApprovedAt);

  const supervisorOfSales = () => {
    const sales = (db.sales || []).find((s) => s.id === quote.salesId);
    const spv = (db.supervisors || []).find((s) => s.id === sales?.supervisorId);
    return (db.users || []).find((u) => u.email === spv?.email);
  };

  /* ---------- Aksi Sales ---------- */
  const doPdf = () => {
    const ok = openQuotePdf(quote, db);
    if (!ok) toast('Izinkan popup pada browser untuk mencetak / menyimpan PDF (#56).', 'warning');
  };

  const markSent = () => {
    update('quotations', quote.id, { status: 'sent', sentAt: nowStamp() });
    toast('Dokumen ditandai terkirim ke pelanggan.', 'success');
  };

  const customerDecision = (ok) => {
    update('quotations', quote.id, {
      status: ok ? 'approved' : 'rejected',
      decidedAt: nowStamp(),
      rejectReason: ok ? undefined : 'Ditolak oleh pelanggan',
    });
    toast(ok
      ? 'Quotation disetujui pelanggan — siap dikonversi ke Entry Order (#59).'
      : 'Quotation ditolak pelanggan.', ok ? 'success' : 'warning');
  };

  /* #59 & #60: konversi 1-klik tanpa input ulang → order; quotation TERKUNCI */
  const convertToOrder = () => {
    if (quote.convertedOrderId) return; /* anti konversi ganda */
    const t = todayISO();
    const no = `ORD-${t.replace(/-/g, '')}-${String((db.orders || []).filter((o) => o.date === t).length + 1).padStart(3, '0')}`;
    const order = {
      no, date: t, salesId: quote.salesId, outletId: quote.outletId,
      items: quote.items.map(({ productId, sku, name, unit, qty, price, disc, line, pcsPerUnit }) => (
        { productId, sku, name, unit, qty, price, disc, line, pcsPerUnit }
      )),
      subtotal: quote.totalAfterDisc, taxRate: quote.taxRate, tax: quote.tax, total: quote.total,
      status: 'submitted', note: `Konversi dari Quotation ${quote.no}`, paid: false,
    };
    const rec = insert('orders', order);

    /* Kurangi stok (satuan dasar) + auto-complete tugas order bila ada */
    mutate((d) => {
      order.items.forEach((it) => {
        const p = d.products.find((x) => x.id === it.productId);
        if (p) p.stock = Math.max(0, p.stock - it.qty * (p.pcsPerUnit || 1));
      });
    });
    completeTaskAuto(db, mutate, { outletId: quote.outletId, type: 'order', salesId: quote.salesId });

    const spvUser = supervisorOfSales();
    if (spvUser) notify(spvUser.id, 'Order Baru Menunggu Approval', `${no} (konversi dari ${quote.no}) — ${formatRupiah(order.total)}.`);

    update('quotations', quote.id, { status: 'converted', convertedOrderId: rec.id, convertedAt: nowStamp() });
    setConfirmConvert(false);
    onClose();
    toast(`Quotation dikonversi menjadi order ${no} — dokumen terkunci (#60).`, 'success');
    if (salesActions) navigate('/app/order');
  };

  /* ---------- Aksi Supervisor (#53) ---------- */
  const spvApprove = () => {
    update('quotations', quote.id, { status: 'draft', spvApprovedAt: nowStamp(), spvApprovedBy: user.name });
    if (salesUser) notify(salesUser.id, 'Diskon Quotation Disetujui', `${quote.no} — diskon ${maxDisc}% disetujui Supervisor. Dokumen dapat dikirim.`);
    toast('Diskon disetujui — quotation dapat dikirim / diunduh pelanggan.', 'success');
  };

  const submitSpvReject = () => {
const v = reason.trim();
if (!v) { setReasonErr('Catatan penolakan wajib diisi.'); return; }
if (v.length < 10) { setReasonErr('Catatan penolakan minimal 10 karakter (catatan_penolakan).'); return; }
    update('quotations', quote.id, { status: 'rejected', rejectReason: v, decidedBy: user.name, decidedAt: nowStamp() });
    if (salesUser) notify(salesUser.id, 'Quotation Ditolak Supervisor', `${quote.no} ditolak: ${v}`);
    toast('Quotation ditolak oleh Supervisor.', 'warning');
    setRejectOpen(false);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Detail Quotation {quote.no}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <KV label="Tanggal" value={quote.date} />
            <KV label="Sales" value={salesName} />
<KV label="Outlet" value={outlet.name || '-'} />
<KV label="Perusahaan" value={company?.name || '-'} />
<KV label="Masa Berlaku" value={quote.validUntil} />
            <KV label="Diskon Maks" value={`${maxDisc}%${needsSpv ? ` (batas wewenang ${QUOTE_DISCOUNT_LIMIT}%)` : ''}`} />
            <KV label="Status" value={<StatusChip kind="quote" status={quote.status} />} />
            <KV label="Kode Verifikasi" value={<Chip size="small" variant="outlined" color="primary" label={quote.verCode || '-'} />} />
            {quote.spvApprovedAt && <KV label="Approval Diskon" value={`${quote.spvApprovedBy || 'Supervisor'} • ${quote.spvApprovedAt}`} />}
            {quote.sentAt && <KV label="Dikirim" value={quote.sentAt} />}
            {quote.rejectReason && <KV label="Alasan Ditolak" value={quote.rejectReason} />}
            {convertedOrder && <KV label="Dikonversi ke Order" value={convertedOrder.no} />}
          </Stack>

          {quote.status === 'pending_approval' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Diskon {maxDisc}% melebihi batas wewenang {QUOTE_DISCOUNT_LIMIT}% — dokumen <b>tidak dapat dikirim/diunduh</b> sebelum disetujui Supervisor (#53).
            </Alert>
          )}
          {quote.status === 'converted' && (
            <Alert severity="info" icon={<LockRoundedIcon fontSize="small" />} sx={{ mb: 2 }}>
              Telah dikonversi menjadi order <b>{convertedOrder?.no}</b> — dokumen <b>terkunci</b>, tidak dapat diubah atau dikonversi ulang (#60).
            </Alert>
          )}
          {quote.status === 'expired' && (
            <Alert severity="error" sx={{ mb: 2 }}>Masa berlaku quotation telah habis — otomatis Kadaluarsa (#54).</Alert>
          )}

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
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{i.sku}</Typography>
                  </TableCell>
                  <TableCell align="right">{i.qty} {i.unit}</TableCell>
                  <TableCell align="right">{formatRupiah(i.price)}</TableCell>
                  <TableCell align="center">{i.disc || 0}%</TableCell>
                  <TableCell align="right"><b>{formatRupiah(i.line)}</b></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack spacing={0.5} sx={{ mt: 2 }}>
            <KV label="Subtotal" value={formatRupiah(quote.subtotal)} />
            <KV label="Diskon" value={`− ${formatRupiah(quote.discTotal)}`} />
            <KV label={`PPN ${Math.round((quote.taxRate || 0.11) * 100)}%`} value={formatRupiah(quote.tax)} />
            <KV label="Grand Total" value={<Typography color="primary" fontWeight={800}>{formatRupiah(quote.total)}</Typography>} />
          </Stack>

          {quote.note && <Alert severity="info" sx={{ mt: 1.5 }}>{quote.note}</Alert>}
          {quote.catatanSyarat && (
            <Alert severity="info" sx={{ mt: 1.5 }} icon={<DescriptionRoundedIcon fontSize="small" />}>
              <b>Syarat &amp; Ketentuan (catatan_syarat — tercetak di PDF):</b> {quote.catatanSyarat}
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 1.5 }} icon={<LockRoundedIcon fontSize="small" />}>
            Harga merupakan <b>snapshot</b> saat dokumen dibuat (price freeze #55) — perubahan Master Data tidak mengubah dokumen (#61).
          </Alert>
        </DialogContent>

        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose}>Tutup</Button>

          {salesActions && pdfAllowed && (
            <>
              <Button startIcon={<ShareRoundedIcon />} onClick={() => shareQuoteWhatsApp(quote, db)}>Bagikan</Button>
              <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={doPdf}>Unduh / Cetak PDF</Button>
            </>
          )}
          {salesActions && quote.status === 'draft' && pdfAllowed && (
            <Button color="success" startIcon={<SendRoundedIcon />} onClick={markSent}>Tandai Terkirim</Button>
          )}
          {salesActions && quote.status === 'sent' && (
            <>
              <Button color="error" startIcon={<CancelRoundedIcon />} onClick={() => customerDecision(false)}>Ditolak Pelanggan</Button>
              <Button color="success" variant="contained" startIcon={<CheckCircleRoundedIcon />} onClick={() => customerDecision(true)}>Disetujui Pelanggan</Button>
            </>
          )}
          {salesActions && quote.status === 'approved' && !quote.convertedOrderId && (
            <Button variant="contained" startIcon={<ShoppingCartRoundedIcon />} onClick={() => setConfirmConvert(true)}>
              Konversi ke Entry Order
            </Button>
          )}
          {supervisorActions && quote.status === 'pending_approval' && (
            <>
              <Button color="error" onClick={() => { setReason(''); setReasonErr(''); setRejectOpen(true); }}>Tolak Diskon</Button>
              <Button color="success" variant="contained" onClick={spvApprove}>Setujui Diskon</Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog alasan tolak diskon (Supervisor) */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tolak Diskon — {quote.no}</DialogTitle>
        <DialogContent dividers>
          <TextField label="Alasan penolakan (wajib)" multiline minRows={2} value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonErr(''); }}
            error={!!reasonErr} helperText={reasonErr || ' '}
            inputProps={{ maxLength: 255 }} autoFocus />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={submitSpvReject}>Tolak Quotation</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmConvert}
        onClose={() => setConfirmConvert(false)}
        onConfirm={convertToOrder}
        title="Konversi ke Entry Order"
        message={`Konversi ${quote.no} menjadi Entry Order tanpa input ulang (#59)? Setelah dikonversi, quotation akan TERKUNCI dan tidak dapat dikonversi ulang (#60).`}
        confirmLabel="Ya, Konversi"
      />
    </>
  );
}