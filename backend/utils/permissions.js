const ROLE_HIERARCHY = {
  user: 0,
  agency_manager: 1,
  admin: 2,
};

const hasRole = (user, ...roles) => {
  if (!user) return false;
  const role = user.isAdmin ? 'admin' : user.role || 'user';
  return roles.includes(role);
};

const isAtLeast = (user, minimumRole) => {
  if (!user) return false;
  const role = user.isAdmin ? 'admin' : user.role || 'user';
  const userLevel = ROLE_HIERARCHY[role] ?? -1;
  const minLevel = ROLE_HIERARCHY[minimumRole] ?? Infinity;
  return userLevel >= minLevel;
};

const canManageUser = (actor, targetRole) => {
  if (!actor) return false;
  const actorRole = actor.isAdmin ? 'admin' : actor.role || 'user';
  if (actorRole === 'admin') return true;
  if (actorRole === 'agency_manager') {
    return targetRole === 'user';
  }
  return false;
};

module.exports = { ROLE_HIERARCHY, hasRole, isAtLeast, canManageUser };
