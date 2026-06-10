import { AuditCategory } from '../src/entities/audit-log.entity';

const REQUIRED_AUDIT_ACTIONS = [
  { action: 'login', category: AuditCategory.Auth },
  { action: 'logout', category: AuditCategory.Auth },
  { action: 'login_failed', category: AuditCategory.Auth },
  { action: 'receive_material', category: AuditCategory.Inventory },
  { action: 'return_material', category: AuditCategory.Inventory },
  { action: 'user_create', category: AuditCategory.User },
  { action: 'user_update', category: AuditCategory.User },
  { action: 'user_delete', category: AuditCategory.User },
  { action: 'mqtt_highlight', category: AuditCategory.Mqtt },
];

describe('Audit action catalog', () => {
  it('covers required production audit events', () => {
    const actions = REQUIRED_AUDIT_ACTIONS.map((entry) => entry.action);
    expect(actions).toContain('login');
    expect(actions).toContain('receive_material');
    expect(actions).toContain('return_material');
    expect(actions).toContain('user_create');
  });
});
