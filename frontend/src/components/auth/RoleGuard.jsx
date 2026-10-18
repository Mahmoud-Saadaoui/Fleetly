import { useAuth } from '../../hooks/useAuth';

const RoleGuard = ({ children, roles = [], fallback = null }) => {
  const { user } = useAuth();

  if (!user) return fallback;

  const userRole = user.role || (user.isAdmin ? 'admin' : 'user');
  if (roles.length > 0 && !roles.includes(userRole)) {
    return fallback;
  }

  return children;
};

export default RoleGuard;
