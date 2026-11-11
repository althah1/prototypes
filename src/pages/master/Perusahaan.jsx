import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import DomainRoundedIcon from '@mui/icons-material/DomainRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import PageHeader from '../../components/ui/PageHeader';
import { useDb } from '../../store/DbContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';

export default function Perusahaan() {
  const { user } = useAuth();
  const { db, update, insert } = useDb();
  const { toast } = useToast();
  // Hanya Admin yang berhak mengubah identitas legal perusahaan. Supervisor dan Finance = Lihat Saja
  const readOnly = user?.role === 'finance' || user?.role === 'supervisor';

  const companyList = db.companies || [];
  const company = companyList[0] || {
    id: 1,
    name: 'PT Distribusi Nusantara',
    npwp: '01.234.567.8-901.000',
    address: 'Jl. Malioboro No. 52, Yogyakarta 55271',
    phone: '0274-555123',
    email: 'info@distribusinusantara.co.id',
    status: 'active'
  };

  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({ ...company });

  const handleOpenEdit = () => {
    setFormData({ ...company });
    setOpenModal(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast('Nama Perusahaan wajib diisi!', 'warning');
      return;
    }

    if (companyList.length > 0) {
      update('companies', company.id, formData);
    } else {
      insert('companies', formData);
    }

    toast('Profil legal perusahaan berhasil diperbarui.', 'success');
    setOpenModal(false);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="Master Data — Perusahaan"
        subtitle="Identitas legal perusahaan resmi untuk kop dokumen Quotation, Sales Order, dan Invoice"
        icon={DomainRoundedIcon}
        action={
          !readOnly && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditRoundedIcon />}
              onClick={handleOpenEdit}
              sx={{ borderRadius: 1, fontWeight: 700, textTransform: 'none' }}
            >
              Ubah Profil Perusahaan
            </Button>
          )
        }
      />

      <Card elevation={0} sx={{ width: '100%', maxWidth: 800, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 3 }}>
            <Avatar variant="rounded" sx={{ width: 68, height: 68, borderRadius: 1.5, bgcolor: 'primary.main', color: '#fff' }}>
              <DomainRoundedIcon sx={{ fontSize: 36 }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{company.name}</Typography>
              <Chip size="small" variant="outlined" color="primary" label="Identitas Resmi Dokumen SFA" sx={{ borderRadius: '6px', mt: 0.5, fontWeight: 600 }} />
            </Box>
          </Stack>

          <List dense disablePadding>
            {[
              { icon: <BadgeRoundedIcon fontSize="small" />, label: 'Nomor Pokok Wajib Pajak (NPWP)', value: company.npwp || '-' },
              { icon: <MapRoundedIcon fontSize="small" />, label: 'Alamat Kantor Pusat', value: company.address || '-' },
              { icon: <PhoneRoundedIcon fontSize="small" />, label: 'Nomor Telepon / Kontak', value: company.phone || '-' },
              { icon: <MailRoundedIcon fontSize="small" />, label: 'Email Resmi Perusahaan', value: company.email || '-' },
            ].map((r) => (
              <ListItem key={r.label} disableGutters sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{r.icon}</ListItemIcon>
                <ListItemText
                  primary={r.label}
                  secondary={r.value}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary', fontWeight: 600 }}
                  secondaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', mt: 0.25 } }}
                />
              </ListItem>
            ))}
          </List>

          <Alert severity="info" sx={{ mt: 3, borderRadius: 1 }} icon={<InfoRoundedIcon fontSize="small" />}>
            Identitas ini otomatis disinkronkan ke seluruh <strong>Kop Dokumen Resmi Quotation &amp; Invoice</strong>. Rekening bank pembayaran dikelola terpisah pada modul <strong>Master Data → Bank</strong>.
          </Alert>
        </CardContent>
      </Card>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 2 }}>
          Ubah Profil Legal Perusahaan
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="Nama Resmi Perusahaan"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              size="small"
              label="NPWP Perusahaan"
              value={formData.npwp || ''}
              onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
              placeholder="Contoh: 01.234.567.8-901.000"
              fullWidth
            />
            <TextField
              size="small"
              label="Nomor Telepon / Hotline"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              size="small"
              label="Email Resmi Perusahaan"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              size="small"
              label="Alamat Lengkap Kantor Pusat"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" color="inherit" onClick={() => setOpenModal(false)} startIcon={<CloseRoundedIcon />} sx={{ borderRadius: 1 }}>
            Batal
          </Button>
          <Button variant="contained" color="primary" onClick={handleSave} startIcon={<SaveRoundedIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Simpan Perubahan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
