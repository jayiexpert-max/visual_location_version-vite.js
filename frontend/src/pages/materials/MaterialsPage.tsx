import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/layout/PageHeader';
import * as materialsService from '../../services/materialsService';
import { getErrorMessage } from '../../services/apiClient';

export function MaterialsPage() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [materialCode, setMaterialCode] = useState('');
  const [description, setDescription] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['materials', search],
    queryFn: () => materialsService.listMaterials({ page: 1, limit: 100, search }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        return materialsService.updateMaterial(editId, { materialCode, description });
      }
      return materialsService.createMaterial({ materialCode, description });
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setEditId(null);
      setSuccess(t('common:success'));
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (err) => setError(getErrorMessage(err, t('common:error'), t)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => materialsService.deleteMaterial(id),
    onSuccess: async () => {
      setDeleteId(null);
      setSuccess(t('common:success'));
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => materialsService.importMaterialsCsv(file),
    onSuccess: async (result) => {
      setImportOpen(false);
      setImportFile(null);
      setSuccess(
        t('pages:materialsImportSuccess', {
          total: result.total,
          added: result.added,
          updated: result.updated,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (err) => setError(getErrorMessage(err, t('common:error'), t)),
  });

  const handleExport = async () => {
    setError(null);
    try {
      await materialsService.exportMaterialsCsv(
        search,
        i18n.language.startsWith('en') ? 'en' : 'th',
      );
      setSuccess(t('pages:materialsExportSuccess'));
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    }
  };

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'materialCode', headerName: t('pages:materialCode'), flex: 1, minWidth: 160 },
      { field: 'description', headerName: t('common:description'), flex: 2, minWidth: 220 },
      {
        field: 'actions',
        headerName: t('common:actions'),
        width: 180,
        sortable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() => {
                setEditId(params.row.id);
                setMaterialCode(params.row.materialCode);
                setDescription(params.row.description ?? '');
                setDialogOpen(true);
              }}
            >
              {t('common:edit')}
            </Button>
            <Button size="small" color="error" onClick={() => setDeleteId(params.row.id)}>
              {t('common:delete')}
            </Button>
          </Stack>
        ),
      },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader title={t('pages:materialsTitle')} />

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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField
          size="small"
          label={t('pages:materialsSearchLabel')}
          placeholder={t('pages:materialsSearchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 420 }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => void handleExport()}>
            {t('pages:materialsExportCsv')}
          </Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setImportOpen(true)}>
            {t('pages:materialsImportCsv')}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setEditId(null);
              setMaterialCode('');
              setDescription('');
              setDialogOpen(true);
            }}
          >
            {t('pages:addMaterial')}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={listQuery.data?.items ?? []}
          columns={columns}
          loading={listQuery.isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? t('pages:editMaterial') : t('pages:addMaterial')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t('pages:materialCode')}
              value={materialCode}
              onChange={(e) => setMaterialCode(e.target.value)}
              required
              fullWidth
              autoFocus={!editId}
            />
            <TextField
              label={t('common:description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={!materialCode.trim()}>
            {t('common:save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('pages:materialsImportTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('pages:materialsImportDesc')}
            </Typography>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadFileIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {t('pages:materialsImportSelectFile')}
              </Typography>
              {importFile && (
                <Typography variant="body2" fontWeight={600} color="primary" sx={{ mt: 1 }}>
                  {importFile.name}
                </Typography>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </Box>
            <Box
              component="pre"
              sx={{
                bgcolor: 'action.hover',
                p: 2,
                borderRadius: 1,
                fontSize: '0.85rem',
                overflow: 'auto',
              }}
            >
              {t('pages:materialsImportFormat')}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)}>{t('common:cancel')}</Button>
          <Button
            variant="contained"
            disabled={!importFile || importMutation.isPending}
            onClick={() => importFile && importMutation.mutate(importFile)}
          >
            {importMutation.isPending ? t('common:loading') : t('pages:materialsImportSubmit')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteId != null}
        title={t('common:confirmDelete')}
        message={t('pages:confirmDeleteMaterial')}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </Box>
  );
}
