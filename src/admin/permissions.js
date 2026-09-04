export const ADMIN_ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
};

export const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const isSuperAdmin = (admin) => normalizeRole(admin?.role) === ADMIN_ROLE.SUPER_ADMIN;

export const isAdmin = (admin) => normalizeRole(admin?.role) === ADMIN_ROLE.ADMIN;

export const hasRole = (admin, roles = []) => roles.map(normalizeRole).includes(normalizeRole(admin?.role));

export const canManageAdmins = isSuperAdmin;

export const canManageServices = isSuperAdmin;

export const canManageEnquiries = isSuperAdmin;

export const canViewActivityLogs = isSuperAdmin;
