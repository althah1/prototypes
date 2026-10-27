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
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
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
import {
  openQuotePdf,
  shareQuoteWhatsApp,
  shareQuoteWeb,
  sendQuoteEmailBrevo,
  resolveQuoteTarget,
} from '../../utils/quotePdf';
import { maxDiscountOf } from '../../utils/quoteUtils';
import { completeTaskAuto } from '../../utils/taskUtils';
import { reduceStockByOrder } from '../../utils/gudangUtils';

const KV = ({ label, value }) => (
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
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </Typography>
  </Box>
);

const payLabel = (q, db) => {
  switch (q?.metodePembayaran) {
    case 'transfer': {
      const b = (db.banks || []).find((x) => x.id === q.bankId);
      return b ? `Transfer — ${b.nama} (${b.noRekening} a.n. ${b.atasNama})` : 'Transfer Bank';
    }
    case 'termin':
      return `Termin ${q.terminHari || 14} hari`;
    case 'cicilan':
      return `Cicilan${q?.cicilanDP > 0 ? ` (DP ${formatRupiah(q.cicilanDP)})` : ''}`;
    case 'konsinyasi':
      return 'Konsinyasi — bayar sesuai barang terjual';
    default:
      return 'Tunai (COD)';
  }
};

export default function QuoteDetailDialog({
  open,
  quoteId,
  onClose,
  salesActions = false,
  supervisorActions = false,
}) {
  const { user } = useAuth();
  const { db, insert, update, mutate } = useDb();
  const { toast } = useToast();
  const { notify } = useSync();
  const navigate = useNavigate();
  const isMobile = useLocation().pathname.startsWith('/app');

  const [confirmConvert, setConfirmConvert] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');

  /* State Distribusi Email via Brevo API */
  const [emailOpen, setEmailOpen] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [toName, setToName] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const quote = (db.quotations || []).find((q) => q.id === quoteId);

  useEffect(() => {
    setConfirmConvert(false);
    setRejectOpen(false);
    setReason('');
    setReasonErr('');
    setEmailOpen(false);
    setEmailErr('');
  }, [quoteId]);

  useEffect(() => {
    if (!open) {
      setConfirmConvert(false);
      setRejectOpen(false);
      setEmailOpen(false);
    }
  }, [open]);

  if (!quote) return null;

  const today = todayISO();
  const target = resolveQuoteTarget(quote, db);
  const salesName = (db.sales || []).find((s) => s.id === quote.salesId)?.name || '-';
  const salesUser = (db.users || []).find(
    (u) => u.role === 'sales' && u.salesId === quote.salesId
  );
  const convertedOrder = quote.convertedOrderId
    ? (db.orders || []).find((o) => o.id === quote.convertedOrderId)
    : null;

  /* Deteksi otomatis masa kadaluarsa dokumen */
  const isExpired =
    quote.status === 'expired' ||
    (Boolean(quote.validUntil) &&
      quote.validUntil < today &&
      !['approved', 'converted'].includes(quote.status));

  const maxDisc = maxDiscountOf(quote.items);
  const overLimit = maxDisc > QUOTE_DISCOUNT_LIMIT;
  const pdfAllowed = ['sent', 'approved', 'converted'].includes(quote.status);

  const supervisorOfSales = () => {
    const sales = (db.sales || []).find((s) => s.id === quote.salesId);
    const spv = (db.supervisors || []).find((s) => s.id === sales?.supervisorId);
    return (db.users || []).find((u) => u.email === spv?.email);
  };

  /* ===== Aksi Distribusi Dokumen (PDF, Web Share, WhatsApp, Brevo Email) ===== */
  const doPdf = () => {
    const ok = openQuotePdf(quote, db);
    if (!ok) toast('Izinkan popup pada browser untuk mencetak / menyimpan PDF.', 'warning');
  };

  const doWebShare = async () => {
    const res = await shareQuoteWeb(quote, db);
    if (res.cancelled) return;
    if (res.ok) {
      toast(
        res.mode === 'file'
          ? 'Dokumen PDF quotation berhasil dibagikan.'
          : 'Ringkasan quotation berhasil dibagikan.',
        'success'
      );
      return;
    }
    if (res.reason === 'copied') {
      toast(
        'Browser tidak mendukung Web Share — ringkasan penawaran telah disalin ke clipboard.',
        'info'
      );
      return;
    }
    toast(
      'Web Share tidak didukung pada perangkat/browser ini. Gunakan WhatsApp, Email, atau Cetak PDF.',
      'warning'
    );
  };

  const openEmailDialog = () => {
    setToEmail(target.email || quote.lastEmailedTo || '');
    setToName(target.owner || target.name || '');
    setEmailMsg(
      `Yth. ${target.owner || target.name},\nBerikut kami lampirkan dokumen Penawaran Harga ${quote.no} yang berlaku hingga ${quote.validUntil}.`
    );
    setEmailErr('');
    setEmailOpen(true);
  };

  const handleSendEmail = async () => {
    const cleanEmail = toEmail.trim();
    if (!cleanEmail) {
      setEmailErr('Alamat email tujuan wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailErr('Format alamat email tidak valid.');
      return;
    }

    setSendingEmail(true);
    setEmailErr('');
    const res = await sendQuoteEmailBrevo(quote, db, {
      toEmail: cleanEmail,
      toName: toName.trim(),
      customMessage: emailMsg,
    });
    setSendingEmail(false);

    if (!res.ok) {
      setEmailErr(res.message);
      return;
    }

    update('quotations', quote.id, {
      lastEmailedTo: cleanEmail,
      lastEmailedAt: nowStamp(),
    });
    setEmailOpen(false);
    toast(`Quotation ${quote.no} beserta lampiran PDF berhasil dikirim ke ${cleanEmail}.`, 'success');
  };

  /* ===== Aksi Operasional Sales ===== */
  const submitForApproval = () => {
    if (isExpired) {
      toast('Quotation sudah kadaluarsa — tidak dapat diajukan ke Supervisor.', 'error');
      return;
    }
    update('quotations', quote.id, { status: 'pending_approval', submittedAt: nowStamp() });
    const spvUser = supervisorOfSales();
    if (spvUser) {
      notify(
        spvUser.id,
        'Quotation Menunggu Approval',
        `${quote.no} dari ${salesName}${
          overLimit ? ` — diskon ${maxDisc}% melebihi wewenang ${QUOTE_DISCOUNT_LIMIT}%` : ''
        }.`
      );
    }
    toast('Quotation diajukan ke Supervisor — menunggu persetujuan sebelum dapat dikirim.', 'info');
  };

  const customerDecision = (ok) => {
    if (ok && isExpired) {
      toast('Quotation sudah kadaluarsa — pelanggan tidak dapat menyetujui penawaran ini.', 'error');
      return;
    }
    update('quotations', quote.id, {
      status: ok ? 'approved' : 'rejected',
      decidedAt: nowStamp(),
      rejectReason: ok ? undefined : 'Ditolak oleh pelanggan',
    });
    if (ok && target.isProspect && target.id) {
      update('prospects', target.id, { status: 'Disetujui' });
    }
    toast(
      ok
        ? 'Quotation disetujui pelanggan — siap dikonversi ke Entry Order.'
        : 'Quotation ditolak pelanggan.',
      ok ? 'success' : 'warning'
    );
  };

  const convertToOrder = () => {
    if (quote.convertedOrderId) return;
    if (isExpired && quote.status !== 'approved') {
      toast('Quotation telah kadaluarsa — tidak dapat dikonversi ke Order.', 'error');
      return;
    }

    /* Pastikan Outlet resmi sudah terdaftar apabila Quotation berasal dari Prospek */
    let resolvedOutletId = quote.outletId;
    if (!resolvedOutletId && target.isProspect) {
      const matchedOutlet = (db.outlets || []).find(
        (o) =>
          o.status === 'active' &&
          (o.prospectId === quote.prospectId ||
            o.name.trim().toLowerCase() === target.name.trim().toLowerCase())
      );
      if (!matchedOutlet) {
        setConfirmConvert(false);
        toast(
          `Calon mitra "${target.name}" masih berstatus Prospek dan belum terdaftar di Master Outlet aktif. Minta Admin mendaftarkan Master Outlet terlebih dahulu sebelum konversi ke Order.`,
          'warning'
        );
        return;
      }
      resolvedOutletId = matchedOutlet.id;
    }

    const t = todayISO();
    const kodeSales = (db.sales || []).find((s) => s.id === quote.salesId)?.nik || 'SFA';
    const no = `ORD-${t.replace(/-/g, '')}-${kodeSales}-${String(
      (db.orders || []).filter((o) => o.date === t).length + 1
    ).padStart(3, '0')}`;

    const order = {
      no,
      date: t,
      salesId: quote.salesId,
      outletId: resolvedOutletId,
      items: quote.items.map(({ productId, sku, name, unit, qty, price, disc, line, pcsPerUnit }) => ({
        productId,
        sku,
        name,
        unit,
        qty,
        price,
        disc,
        line,
        pcsPerUnit,
      })),
      subtotal: quote.totalAfterDisc,
      taxRate: quote.taxRate,
      tax: quote.tax,
      total: quote.total,
      status: 'submitted',
      note: `Konversi dari Quotation ${quote.no}`,
      paid: false,
      metodePembayaran: quote.metodePembayaran || 'tunai',
      bankId: quote.metodePembayaran === 'transfer' ? (quote.bankId ?? null) : null,
      terminHari: quote.metodePembayaran === 'termin' ? (quote.terminHari ?? null) : null,
      viaPembayaran: ['termin', 'konsinyasi'].includes(quote.metodePembayaran)
        ? (quote.viaPembayaran || 'tunai')
        : null,
      viaBankId:
        ['termin', 'konsinyasi'].includes(quote.metodePembayaran) && quote.viaPembayaran === 'transfer'
          ? (quote.viaBankId ?? null)
          : null,
      konsinyasiHari: quote.metodePembayaran === 'konsinyasi' ? (quote.konsinyasiHari || 30) : null,
      cicilanDP: quote.metodePembayaran === 'cicilan' ? (Number(quote.cicilanDP) || 0) : 0,
      jumlahCicilan: quote.metodePembayaran === 'cicilan' ? (Number(quote.jumlahCicilan) || 3) : null,
    };

    const rec = insert('orders', order);
    reduceStockByOrder(mutate, order.items);
    completeTaskAuto(db, mutate, {
      outletId: resolvedOutletId,
      type: 'order',
      salesId: quote.salesId,
    });

    const spvUser = supervisorOfSales();
    if (spvUser) {
      notify(
        spvUser.id,
        'Order Baru Menunggu Approval',
        `${no} (konversi dari ${quote.no}) — ${formatRupiah(order.total)}.`
      );
    }

    update('quotations', quote.id, {
      outletId: resolvedOutletId,
      status: 'converted',
      convertedOrderId: rec.id,
      convertedAt: nowStamp(),
    });
    setConfirmConvert(false);
    onClose();
    toast(`Quotation dikonversi menjadi order ${no} — dokumen terkunci.`, 'success');
    if (salesActions) navigate('/app/order');
  };

  /* ===== Aksi Supervisor ===== */
  const spvApprove = () => {
    update('quotations', quote.id, {
      status: 'sent',
      spvApprovedAt: nowStamp(),
      spvApprovedBy: user.name,
      sentAt: nowStamp(),
    });
    if (salesUser) {
      notify(
        salesUser.id,
        'Quotation Disetujui Supervisor',
        `${quote.no} disetujui — dokumen dapat dikirim/diunduh dan diajukan ke pelanggan.`
      );
    }
    toast('Quotation disetujui — sales dapat mengirim dokumen ke pelanggan.', 'success');
  };

  const submitSpvReject = () => {
    const v = reason.trim();
    if (!v) {
      setReasonErr('Catatan penolakan wajib diisi.');
      return;
    }
    if (v.length < 10) {
      setReasonErr('Catatan penolakan minimal 10 karakter.');
      return;
    }
    update('quotations', quote.id, {
      status: 'rejected',
      rejectReason: v,
      decidedBy: user.name,
      decidedAt: nowStamp(),
    });
    if (salesUser) notify(salesUser.id, 'Quotation Ditolak', `${quote.no} ditolak: ${v}`);
    toast('Quotation ditolak oleh Supervisor.', 'warning');
    setRejectOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 'md' },
            borderRadius: { xs: 0, sm: 2 },
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderRight: { xs: 'none', sm: '1px solid' },
            borderColor: 'divider',
            boxShadow: { xs: 'none', sm: '0 12px 40px rgba(15,23,42,0.1)' },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            pr: isMobile ? 6 : 3,
            position: 'relative',
            pb: 1,
            px: { xs: 2, sm: 3 },
          }}
        >
          Detail Quotation — {quote.no}
          {isMobile && (
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Tutup"
              sx={{ position: 'absolute', right: 12, top: 12, bgcolor: 'action.hover' }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ overflowX: 'hidden', px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}
        >
          {isExpired && quote.status !== 'converted' && (
            <Alert
              severity="error"
              icon={<EventBusyRoundedIcon fontSize="small" />}
              sx={{ mb: 2.5, borderRadius: 1.5, border: '1px solid #fecaca' }}
            >
              <Typography variant="body2" fontWeight={750}>
                Penawaran Telah Kadaluarsa
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
                Masa berlaku berakhir pada <b>{quote.validUntil}</b>. Dokumen tidak dapat disetujui
                pelanggan atau dikonversi menjadi order.
              </Typography>
            </Alert>
          )}

          {quote.status === 'pending_approval' && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Menunggu persetujuan <b>Supervisor</b> sebelum dapat dikirimkan ke pelanggan.
              {overLimit ? ` Diskon ${maxDisc}% melebihi batas wewenang ${QUOTE_DISCOUNT_LIMIT}%.` : ''}
            </Alert>
          )}
          {quote.status === 'draft' && !isExpired && (
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 1.5 }}>
              Quotation masih draft — klik <b>Ajukan ke Supervisor</b> untuk meminta persetujuan.
            </Alert>
          )}
          {quote.status === 'converted' && (
            <Alert
              severity="info"
              icon={<LockRoundedIcon fontSize="small" />}
              sx={{ mb: 2.5, borderRadius: 1.5 }}
            >
              Telah dikonversi menjadi order <b>{convertedOrder?.no}</b> — dokumen{' '}
              <b>terkunci permanen</b>.
            </Alert>
          )}

          {/* GRID 2 KOLOM METADATA */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 3,
              rowGap: 0.5,
              mb: 3,
            }}
          >
            <KV label="No. Quotation" value={quote.no} />
            <KV
              label="Status Dokumen"
              value={
                isExpired && quote.status !== 'converted' ? (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label="Kadaluarsa"
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <StatusChip kind="quote" status={quote.status} />
                )
              }
            />
            <KV label="Tanggal Terbit" value={quote.date} />
            <KV
              label="Masa Berlaku"
              value={
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>s.d. {quote.validUntil || '-'}</span>
                  {isExpired && quote.status !== 'converted' && (
                    <Chip
                      size="small"
                      color="error"
                      label="Kadaluarsa"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  )}
                </Stack>
              }
            />
            <KV label="Sales Lapangan" value={salesName} />
            <KV label="Syarat Pembayaran" value={payLabel(quote, db)} />
            <KV
              label={target.isProspect ? 'Tujuan Penawaran (Prospek)' : 'Outlet Tujuan'}
              value={
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {target.name}
                  </span>
                  {target.isProspect && (
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label="Prospek"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}
                    />
                  )}
                </Stack>
              }
            />
            <KV
              label="Diskon Maksimal"
              value={
                overLimit ? (
                  <Typography
                    variant="body2"
                    fontWeight={750}
                    color="warning.main"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {maxDisc}% (lewat wewenang {QUOTE_DISCOUNT_LIMIT}%)
                  </Typography>
                ) : (
                  `${maxDisc}%`
                )
              }
            />
            <KV
              label="Kode Verifikasi"
              value={
                <Chip
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={quote.verCode || '-'}
                  sx={{ fontFamily: 'monospace', height: 22 }}
                />
              }
            />
            {quote.lastEmailedTo && (
              <KV
                label="Riwayat Kirim Email"
                value={`${quote.lastEmailedTo} (${quote.lastEmailedAt || '-'})`}
              />
            )}
            {convertedOrder && <KV label="Dikonversi ke Order" value={convertedOrder.no} />}
            {quote.spvApprovedAt && (
              <KV
                label="Approval Supervisor"
                value={`${quote.spvApprovedBy || 'Supervisor'} • ${quote.spvApprovedAt}`}
              />
            )}
            {quote.rejectReason && <KV label="Alasan Ditolak" value={quote.rejectReason} />}
          </Box>

          {/* Rincian Produk: Mobile Kompak vs Desktop Tabel */}
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25, fontSize: '0.85rem' }}>
            Rincian Produk Dipesan ({quote.items.length} item)
          </Typography>

          {isMobile ? (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {quote.items.map((i) => (
                <Box
                  key={i.productId}
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography fontWeight={750} fontSize={13.5} noWrap sx={{ flex: 1 }}>
                      {i.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{ fontVariantNumeric: 'tabular-nums', color: 'primary.main', flexShrink: 0 }}
                    >
                      {formatRupiah(i.line)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {i.qty} {i.unit} × {formatRupiah(i.price)}
                    </Typography>
                    {(i.disc || 0) > 0 && (
                      <Chip
                        size="small"
                        label={`Disc ${i.disc}%`}
                        color="warning"
                        sx={{ height: 20, fontSize: '0.675rem', fontWeight: 700, borderRadius: '4px' }}
                      />
                    )}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : (
            <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2.5 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Produk</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Harga</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700 }}>Disc</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Jumlah</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quote.items.map((i) => (
                  <TableRow key={i.productId}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={650}>{i.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{i.sku}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{i.qty} {i.unit}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(i.price)}</TableCell>
                    <TableCell align="center">{i.disc || 0}%</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      <b>{formatRupiah(i.line)}</b>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

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
              <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(quote.subtotal)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="warning.main" fontWeight={700} display="block">DISKON</Typography>
              <Typography variant="body2" fontWeight={700} color="warning.main" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                − {formatRupiah(quote.discTotal)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">PPN {Math.round((quote.taxRate || 0.11) * 100)}%</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatRupiah(quote.tax)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="primary.main" fontWeight={800} display="block">TOTAL ORDER</Typography>
              <Typography variant="subtitle1" fontWeight={850} color="primary.main" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{formatRupiah(quote.total)}</Typography>
            </Box>
          </Box>

          {quote.note && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5 }} icon={<NoteRoundedIcon fontSize="small" />}>
              <b>Catatan Pesanan:</b> {quote.note}
            </Alert>
          )}
          {quote.catatanSyarat && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5 }} icon={<DescriptionRoundedIcon fontSize="small" />}>
              <b>Syarat &amp; Ketentuan Cetak:</b> {quote.catatanSyarat}
            </Alert>
          )}
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: 1.5 }} icon={<LockRoundedIcon fontSize="small" />}>
            Harga bersifat <b>snapshot</b> saat dokumen dibuat — perubahan katalog di kemudian hari tidak mengubah nilai dokumen ini.
          </Alert>
        </DialogContent>

        <DialogActions
          sx={
            isMobile
              ? { flexDirection: 'column', alignItems: 'stretch', gap: 1, p: 2, px: { xs: 1.5, sm: 3 } }
              : { gap: 1, p: 2, px: { xs: 1.5, sm: 3 } }
          }
        >
          {!isMobile && <Button onClick={onClose}>Tutup</Button>}

          {salesActions && pdfAllowed && (
            <>
              <Button
                variant="outlined"
                startIcon={<IosShareRoundedIcon />}
                onClick={doWebShare}
              >
                Bagikan (Share)
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareRoundedIcon />}
                onClick={() => shareQuoteWhatsApp(quote, db)}
              >
                WhatsApp
              </Button>
              <Button
                variant="outlined"
                startIcon={<EmailRoundedIcon />}
                onClick={openEmailDialog}
              >
                Kirim Email (PDF)
              </Button>
              <Button variant="outlined" startIcon={<PrintRoundedIcon />} onClick={doPdf}>
                Cetak / Unduh PDF
              </Button>
            </>
          )}

          {!salesActions && pdfAllowed && (
            <Button variant="outlined" startIcon={<PrintRoundedIcon />} onClick={doPdf}>
              Cetak / Unduh PDF
            </Button>
          )}

          {salesActions && quote.status === 'draft' && (
            <Button
              variant="contained"
              startIcon={<SendRoundedIcon />}
              onClick={submitForApproval}
              disabled={isExpired}
            >
              {isExpired ? 'Penawaran Kadaluarsa' : 'Ajukan ke Supervisor'}
            </Button>
          )}

          {salesActions && quote.status === 'sent' && !isExpired && (
            <>
              <Button
                color="error"
                startIcon={<CancelRoundedIcon />}
                onClick={() => customerDecision(false)}
              >
                Tolak
              </Button>
              <Button
                color="success"
                variant="contained"
                startIcon={<CheckCircleRoundedIcon />}
                onClick={() => customerDecision(true)}
              >
                Pelanggan Setujui
              </Button>
            </>
          )}

          {salesActions && quote.status === 'approved' && !quote.convertedOrderId && !isExpired && (
            <Button
              variant="contained"
              startIcon={<ShoppingCartRoundedIcon />}
              onClick={() => setConfirmConvert(true)}
            >
              Konversi ke Order
            </Button>
          )}

          {supervisorActions && quote.status === 'pending_approval' && (
            <>
              <Button
                color="error"
                onClick={() => {
                  setReason('');
                  setReasonErr('');
                  setRejectOpen(true);
                }}
              >
                Tolak Quotation
              </Button>
              <Button color="success" variant="contained" onClick={spvApprove} disabled={isExpired}>
                Setujui Quotation
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog Pengiriman Email PDF via Brevo API (Bab 5.3) */}
      <Dialog
        open={emailOpen}
        onClose={() => !sendingEmail && setEmailOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Kirim Email Quotation — {quote.no}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Dokumen <b>{quote.no}.pdf</b> akan dilampirkan otomatis melalui layanan Brevo Email API.
            </Alert>
            <TextField
              label="Email Penerima *"
              type="email"
              value={toEmail}
              onChange={(e) => {
                setToEmail(e.target.value);
                setEmailErr('');
              }}
              error={Boolean(emailErr)}
              helperText={emailErr || 'Contoh: pemilik@tokomanggadua.id'}
              autoFocus
              fullWidth
            />
            <TextField
              label="Nama Penerima"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Pesan Pengantar (opsional)"
              multiline
              minRows={3}
              value={emailMsg}
              onChange={(e) => setEmailMsg(e.target.value)}
              inputProps={{ maxLength: 500 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setEmailOpen(false)} disabled={sendingEmail}>
            Batal
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailRoundedIcon />}
            onClick={handleSendEmail}
            disabled={sendingEmail}
          >
            {sendingEmail ? 'Mengirim…' : 'Kirim Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Alasan Tolak Quotation (Supervisor) */}
      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Tolak Quotation — {quote.no}</DialogTitle>
        <DialogContent dividers sx={{ overflowX: 'hidden' }}>
          <TextField
            label="Alasan penolakan (wajib)"
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonErr('');
            }}
            error={Boolean(reasonErr)}
            helperText={reasonErr || 'Minimal 10 karakter alasan penolakan.'}
            inputProps={{ maxLength: 255 }}
            autoFocus
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRejectOpen(false)}>Batal</Button>
          <Button variant="contained" color="error" onClick={submitSpvReject}>
            Tolak Dokumen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Konfirmasi Konversi ke Order */}
      <ConfirmDialog
        open={confirmConvert}
        onClose={() => setConfirmConvert(false)}
        onConfirm={convertToOrder}
        title="Konversi ke Entry Order"
        message={`Konversi ${quote.no} menjadi Entry Order tanpa input ulang? Seluruh syarat deal (${payLabel(
          quote,
          db
        )}) akan terbawa otomatis. Setelah dikonversi, dokumen quotation akan TERKUNCI permanen.`}
        confirmLabel="Ya, Konversi ke Order"
      />
    </>
  );
}
