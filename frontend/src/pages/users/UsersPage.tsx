import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import type { SupportedLanguage } from '@visual-location/shared';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/apiClient';
import * as usersService from '../../services/usersService';
import type { AuthUser } from '../../types/api';

const PAGE_SIZE = 20;
const ROLES = ['admin', 'material_prep', 'user'] as const;
const LANGS: SupportedLanguage[] = ['th', 'en'];

interface UserFormState {
  username: string;
  password: string;
  role: (typeof ROLES)[number];
  lang: SupportedLanguage;
  email: string;
  remark: string;
}

const emptyForm = (): UserFormState => ({
  username: '',
  password: '',
  role: 'user',
  lang: 'th',
  email: '',
  remark: '',
});

export function UsersPage() {
  const { t } = useTranslation(['pages', 'common']);
  const { hasRole } = useAuth();

  const [rows, setRows] = useState<AuthUser[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await usersService.listUsers(paginationModel.page + 1, paginationModel.pageSize);
      setRows(result.items);
      setRowCount(result.total);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setLoading(false);
    }
  }, [paginationModel, t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (user: AuthUser) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      lang: user.lang,
      email: user.email ?? '',
      remark: user.remark ?? '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        role: form.role,
        lang: form.lang,
        email: form.email.trim() || undefined,
        remark: form.remark.trim() || undefined,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editingUser) {
        await usersService.updateUser(editingUser.id, payload);
        setSuccess(t('common:success'));
      } else {
        if (!form.password.trim()) {
          setError(t('common:password'));
          return;
        }
        payload.password = form.password;
        await usersService.createUser(payload);
        setSuccess(t('common:success'));
      }

      closeDialog();
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await usersService.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      setSuccess(t('common:success'));
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error')));
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef<AuthUser>[] = [
    { field: 'username', headerName: t('common:username'), flex: 1, minWidth: 140 },
    { field: 'role', headerName: t('pages:role'), width: 140 },
    { field: 'lang', headerName: t('common:language'), width: 90 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
    { field: 'remark', headerName: 'Remark', flex: 1, minWidth: 160 },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 160,
      valueFormatter: (value) => {
        try {
          return format(new Date(value as string), 'yyyy-MM-dd HH:mm');
        } catch {
          return String(value ?? '—');
        }
      },
    },
    {
      field: 'actions',
      headerName: t('common:actions'),
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" aria-label={t('common:edit')} onClick={() => openEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" aria-label={t('common:delete')} onClick={() => setDeleteTarget(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  if (!hasRole('admin')) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Box>
      <PageHeader
        title={t('pages:usersTitle')}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            {t('pages:createUser')}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <DataGrid
        autoHeight
        rows={rows}
        columns={columns}
        loading={loading}
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 20, 50]}
        disableRowSelectionOnClick
        sx={{ bgcolor: 'background.paper', borderRadius: 2 }}
      />

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? t('pages:editUser') : t('pages:createUser')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('common:username')}
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label={editingUser ? t('pages:resetPassword') : t('common:password')}
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required={!editingUser}
              helperText={editingUser ? t('pages:resetPassword') : undefined}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>{t('pages:role')}</InputLabel>
              <Select
                label={t('pages:role')}
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserFormState['role'] }))}
              >
                {ROLES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('common:language')}</InputLabel>
              <Select
                label={t('common:language')}
                value={form.lang}
                onChange={(e) => setForm((prev) => ({ ...prev, lang: e.target.value as SupportedLanguage }))}
              >
                {LANGS.map((lang) => (
                  <MenuItem key={lang} value={lang}>
                    {lang === 'th' ? t('common:thai') : t('common:english')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Remark"
              value={form.remark}
              onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>
            {t('common:cancel')}
          </Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving || !form.username.trim()}>
            {saving ? t('common:loading') : t('common:save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('common:delete')}
        message={`${t('pages:disableUser')}: ${deleteTarget?.username ?? ''}`}
        confirmLabel={t('common:delete')}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
