import '../../styles/users-page.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { SupportedLanguage, UserRole } from '@visual-location/shared';
import { getAssignableRoles, canManageUser } from '@visual-location/shared';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmployeePhotoDialog } from '../../components/common/EmployeePhotoDialog';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/apiClient';
import * as usersService from '../../services/usersService';
import type { AuthUser } from '../../types/api';
import { getEmployeePhotoUrl, isEmployeePhotoUsername } from '../../utils/employeePhoto';

const PAGE_SIZE = 20;
const LANGS: SupportedLanguage[] = ['th', 'en'];

interface UserFormState {
  username: string;
  password: string;
  role: UserRole;
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
  const { hasRole, user: currentUser } = useAuth();

  const assignableRoles = useMemo(
    () => (currentUser ? getAssignableRoles(currentUser.role) : []),
    [currentUser],
  );

  const [rows, setRows] = useState<AuthUser[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const roleFieldReadOnly = Boolean(
    editingUser && !assignableRoles.includes(editingUser.role),
  );
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusTarget, setStatusTarget] = useState<AuthUser | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ username: string; url: string } | null>(
    null,
  );

  const canToggleStatus = hasRole('admin', 'manage');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await usersService.listUsers(page, PAGE_SIZE);
      setRows(result.items);
      setRowCount(result.total);
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setLoading(false);
    }
  }, [page, t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreateClick = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const canManageTarget = useCallback(
    (targetRole: UserRole) =>
      currentUser ? canManageUser(currentUser.role, targetRole) : false,
    [currentUser],
  );

  const handleEditClick = (user: AuthUser) => {
    if (!canManageTarget(user.role)) return;
    setEditingUser(user);
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      lang: user.lang,
      email: user.email ?? '',
      remark: user.remark ?? '',
    });
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setForm(emptyForm());
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!roleFieldReadOnly && !assignableRoles.includes(form.role)) {
        setError(t('pages:usersRoleAssignDenied'));
        return;
      }

      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        lang: form.lang,
        email: form.email.trim() || undefined,
        remark: form.remark.trim() || undefined,
      };

      if (!roleFieldReadOnly) {
        payload.role = form.role;
      }

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

      setShowForm(false);
      setEditingUser(null);
      setForm(emptyForm());
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
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
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setTogglingStatus(true);
    setError(null);
    try {
      await usersService.toggleUserStatus(statusTarget.id, !statusTarget.isActive);
      setSuccess(
        statusTarget.isActive
          ? t('pages:usersDeactivated')
          : t('pages:usersActivated'),
      );
      setStatusTarget(null);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, t('common:error'), t));
    } finally {
      setTogglingStatus(false);
    }
  };

  const filteredRows = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(r =>
        r.username.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.remark ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'active') result = result.filter(r => r.isActive);
    if (statusFilter === 'inactive') result = result.filter(r => !r.isActive);
    return result;
  }, [rows, search, statusFilter]);

  const totalPages = Math.ceil(rowCount / PAGE_SIZE);
  const pageNums = useMemo(() => {
    if (totalPages <= 1) return [];
    const nums: (number | 0)[] = [];
    const radius = 2;
    const start = Math.max(1, page - radius);
    const end = Math.min(totalPages, page + radius);
    if (start > 1) { nums.push(1); if (start > 2) nums.push(0); }
    for (let i = start; i <= end; i++) nums.push(i);
    if (end < totalPages) { if (end < totalPages - 1) nums.push(0); nums.push(totalPages); }
    return nums;
  }, [page, totalPages]);

  if (!hasRole('admin', 'manage')) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="users-page-container">
      <div className="users-header">
        <div className="users-header-title">
          <h1>{t('pages:usersTitle')}</h1>
          <p>{t('pages:usersSubtitle')}</p>
        </div>
        {!showForm && (
          <button className="fx-btn fx-btn-accent" onClick={handleCreateClick}>
            <i className="fas fa-user-plus"></i> {t('pages:createUser')}
          </button>
        )}
      </div>

      {error && (
        <div className="fx-alert fx-alert-danger" style={{ marginBottom: 20 }}>
          <span><i className="fas fa-exclamation-triangle"></i> {error}</span>
          <button type="button" onClick={() => setError(null)} style={{ background:'transparent', border:'none', cursor:'pointer' }}>✕</button>
        </div>
      )}
      {success && (
        <div className="fx-alert fx-alert-success" style={{ marginBottom: 20 }}>
          <span><i className="fas fa-check-circle"></i> {success}</span>
          <button type="button" onClick={() => setSuccess(null)} style={{ background:'transparent', border:'none', cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Form Card — shown only when showForm is true */}
      {showForm && (
      <div className="user-card user-card--form-open">
        <div className="user-card-header">
          <i className={editingUser ? "fas fa-edit" : "fas fa-user-plus"}></i>
          {editingUser ? t('pages:editUser') : t('pages:createUser')}
        </div>
        <div className="user-card-content">
          <form onSubmit={handleSave}>
            <div className="user-form-grid">
              <div className="user-form-group">
                <label className="user-form-label"><i className="fas fa-id-badge"></i> {t('common:username')} *</label>
                <input 
                  type="text" 
                  className="user-form-input" 
                  value={form.username}
                  onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                  required
                />
              </div>

              <div className="user-form-group">
                <label className="user-form-label">
                  <i className="fas fa-lock"></i> {editingUser ? t('pages:resetPassword') : t('common:password')} {!editingUser && '*'}
                </label>
                <input 
                  type="password" 
                  className="user-form-input" 
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  required={!editingUser}
                  placeholder={editingUser ? t('pages:usersPasswordKeepBlank') : ''}
                />
              </div>

              <div className="user-form-group">
                <label className="user-form-label"><i className="fas fa-user-tag"></i> {t('pages:role')}</label>
                {roleFieldReadOnly ? (
                  <input
                    type="text"
                    className="user-form-input"
                    value={form.role}
                    readOnly
                    title={t('pages:usersRoleChangeDenied')}
                  />
                ) : (
                  <select
                    className="user-form-input"
                    value={form.role}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, role: e.target.value as UserRole }))
                    }
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="user-form-group">
                <label className="user-form-label">
                  <i className="fas fa-envelope"></i> Email {form.role === 'admin' ? <span style={{ color: '#ef4444' }}>*</span> : ''}
                </label>
                <input 
                  type="email" 
                  className="user-form-input" 
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  required={form.role === 'admin'}
                />
              </div>

              <div className="user-form-group">
                <label className="user-form-label"><i className="fas fa-globe"></i> {t('common:language')}</label>
                <select 
                  className="user-form-input"
                  value={form.lang}
                  onChange={(e) => setForm(p => ({ ...p, lang: e.target.value as SupportedLanguage }))}
                >
                  {LANGS.map(lang => <option key={lang} value={lang}>{lang === 'th' ? t('common:thai') : t('common:english')}</option>)}
                </select>
              </div>

              <div className="user-form-group">
                <label className="user-form-label"><i className="fas fa-comment-alt"></i> {t('common:remark')}</label>
                <input 
                  type="text" 
                  className="user-form-input" 
                  value={form.remark}
                  onChange={(e) => setForm(p => ({ ...p, remark: e.target.value }))}
                />
              </div>
            </div>

            <div className="user-form-actions">
              <button type="button" className="fx-btn fx-btn-secondary" onClick={cancelEdit} disabled={saving}>
                {t('common:cancel')}
              </button>
              <button type="submit" className="fx-btn fx-btn-accent" disabled={saving || !form.username.trim()}>
                {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} {t('common:save')}
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Table Card */}
      <div className="user-card" style={{ animationDelay: '0.1s' }}>
        <div className="user-card-header">
          <i className="fas fa-users"></i>
          {t('pages:usersAllUsers')}
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--fx-text-muted)', fontWeight: 'normal' }}>
            {t('pages:usersAccountCount', { filtered: filteredRows.length, total: rowCount })}
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--fx-border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: 'var(--fx-bg)' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem' }}></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('pages:usersSearchPlaceholder')}
              style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--fx-border)', borderRadius: 'var(--fx-radius)', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', background: 'var(--fx-surface)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  background: statusFilter === s ? '#2563eb' : '#f1f5f9',
                  color: statusFilter === s ? '#fff' : '#475569'
                }}
              >
                {s === 'all' ? t('common:allStatus') : s === 'active' ? t('common:active') : t('common:inactive')}
              </button>
            ))}
          </div>
        </div>
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>#</th>
                <th>{t('common:username')}</th>
                <th>Email</th>
                <th>{t('pages:role')}</th>
                <th>{t('common:language')}</th>
                <th>{t('common:created')}</th>
                <th style={{ textAlign: 'center', width: 160 }}>{t('common:actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', marginBottom: 15 }}></i>
                    <p>{t('common:loading')}</p>
                  </td>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row, i) => {
                  const isEditing = editingUser?.id === row.id;
                  
                  let badgeClass = 'role-user';
                  let icon = 'fa-user';
                  let roleName = 'User';
                  if (row.role === 'admin') { badgeClass = 'role-admin'; icon = 'fa-shield-alt'; roleName = 'Admin'; }
                  else if (row.role === 'manage') { badgeClass = 'role-admin'; icon = 'fa-users-cog'; roleName = 'Manage'; }
                  else if (row.role === 'material_prep') { badgeClass = 'role-material_prep'; icon = 'fa-dolly'; roleName = 'Material Prep'; }

                  const createdStr = row.createdAt ? format(new Date(row.createdAt), 'dd/MM/yyyy') : '—';
                  const canManageRow = canManageTarget(row.role);
                  const hasPhoto = isEmployeePhotoUsername(row.username);
                  const photoUrl = hasPhoto ? getEmployeePhotoUrl(row.username) : '';

                  return (
                    <tr key={row.id} className={isEditing ? 'editing' : ''}>
                      <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 'bold' }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td>
                        <div className="user-info">
                          {hasPhoto ? (
                            <button
                              type="button"
                              className="user-avatar user-avatar--clickable"
                              onClick={() => setPhotoPreview({ username: row.username, url: photoUrl })}
                              title={t('pages:usersViewPhoto')}
                            >
                              <img
                                src={photoUrl}
                                alt={row.username}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const iconEl = e.currentTarget.nextElementSibling;
                                  if (iconEl) (iconEl as HTMLElement).style.display = 'block';
                                }}
                              />
                              <i className={`fas ${icon}`} style={{ display: 'none' }} />
                            </button>
                          ) : (
                            <div className="user-avatar">
                              <i className={`fas ${icon}`} />
                            </div>
                          )}
                          <div>
                            <div className="user-name">{row.username}</div>
                            {row.remark && <div style={{ fontSize: '0.8rem', color: 'var(--fx-text-muted)' }}>{row.remark}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {row.email ? (
                          <div className="user-email"><i className="far fa-envelope"></i> {row.email}</div>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>- {t('pages:usersNotSpecified')} -</span>
                        )}
                      </td>
                      <td>
                        <span className={`role-badge ${badgeClass}`}>
                          <i className={`fas ${icon}`}></i> {roleName}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--fx-text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 600 }}>
                          {row.lang}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--fx-text-muted)', fontSize: '0.9rem' }}>{createdStr}</span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {canToggleStatus && canManageRow ? (
                          <button
                            type="button"
                            onClick={() => setStatusTarget(row)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 12,
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              transition: 'all 0.2s',
                              background: row.isActive ? '#dcfce7' : '#fee2e2',
                              color: row.isActive ? '#16a34a' : '#dc2626',
                              marginRight: 8,
                              verticalAlign: 'middle',
                            }}
                            title={
                              row.isActive
                                ? t('pages:usersClickDeactivate')
                                : t('pages:usersClickActivate')
                            }
                          >
                            {row.isActive ? (
                              <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
                            ) : (
                              <BlockIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-top' }} />
                            )}
                            {row.isActive ? t('common:active') : t('common:inactive')}
                          </button>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 12,
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              background: row.isActive ? '#dcfce7' : '#fee2e2',
                              color: row.isActive ? '#16a34a' : '#dc2626',
                              marginRight: 8,
                              verticalAlign: 'middle',
                            }}
                          >
                            {row.isActive ? t('common:active') : t('common:inactive')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditClick(row)}
                          disabled={!canManageRow}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: canManageRow ? '#3b82f6' : '#cbd5e1',
                            cursor: canManageRow ? 'pointer' : 'not-allowed',
                            padding: '4px',
                            verticalAlign: 'middle',
                          }}
                          title={
                            canManageRow
                              ? t('common:edit')
                              : t('pages:usersEditDenied')
                          }
                        >
                          <EditIcon sx={{ fontSize: 20 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => canManageRow && setDeleteTarget(row)}
                          disabled={!canManageRow}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: canManageRow ? '#ef4444' : '#cbd5e1',
                            cursor: canManageRow ? 'pointer' : 'not-allowed',
                            padding: '4px',
                            marginLeft: 4,
                            verticalAlign: 'middle',
                          }}
                          title={
                            canManageRow
                              ? t('common:delete')
                              : t('pages:usersDeleteDenied')
                          }
                        >
                          <DeleteIcon sx={{ fontSize: 20 }} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <i className="fas fa-users-slash" style={{ fontSize: '3rem', marginBottom: 15, opacity: 0.3 }}></i>
                    <p>{search ? t('pages:usersNoMatch') : t('common:noData')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button
            type="button"
            className="fx-btn fx-btn-secondary"
            style={{ padding: '8px 12px', opacity: page <= 1 ? 0.5 : 1 }}
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <i className="fas fa-chevron-left" />
          </button>
          {pageNums.map((p, i) =>
            p === 0 ? (
              <span key={`ellipsis-${i}`} style={{ padding: '8px 4px', color: '#94a3b8', fontWeight: 'bold' }}>…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`fx-btn ${p === page ? 'fx-btn-accent' : 'fx-btn-secondary'}`}
                style={{ padding: '8px 14px' }}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className="fx-btn fx-btn-secondary"
            style={{ padding: '8px 12px', opacity: page >= totalPages ? 0.5 : 1 }}
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.isActive
            ? t('pages:usersDeactivateTitle')
            : t('pages:usersActivateTitle')
        }
        message={
          statusTarget?.isActive
            ? t('pages:usersDeactivateMessage', { username: statusTarget.username })
            : t('pages:usersActivateMessage', { username: statusTarget?.username ?? '' })
        }
        confirmLabel={
          statusTarget?.isActive
            ? t('pages:usersDeactivateConfirm')
            : t('pages:usersActivateConfirm')
        }
        loading={togglingStatus}
        onConfirm={() => void handleToggleStatus()}
        onCancel={() => setStatusTarget(null)}
      />

      <EmployeePhotoDialog
        open={Boolean(photoPreview)}
        username={photoPreview?.username ?? ''}
        photoUrl={photoPreview?.url ?? ''}
        onClose={() => setPhotoPreview(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('common:delete')}
        message={`${t('pages:disableUser')}: ${deleteTarget?.username ?? ''}`}
        confirmLabel={t('common:delete')}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
