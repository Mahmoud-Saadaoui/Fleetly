import { useEffect, useState } from 'react';
import { AuthContext } from './auth';
import { authAPI } from '../api/endpoints';
import { getApiErrorMessage } from '../utils/apiError';
import toast from 'react-hot-toast';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('fleetly_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.me();
        if (response.data.success) {
          setUser(response.data.data);
          localStorage.setItem('fleetly_user', JSON.stringify(response.data.data));
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        localStorage.removeItem('fleetly_token');
        localStorage.removeItem('fleetly_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      if (response.data.success) {
        const { accessToken, ...userData } = response.data.data;
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem('fleetly_token', accessToken);
        localStorage.setItem('fleetly_user', JSON.stringify(userData));
        toast.success('Connexion réussie');
        return { success: true, user: userData };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Erreur de connexion');
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      if (response.data.success) {
        const { accessToken, ...newUser } = response.data.data;
        setToken(accessToken);
        setUser(newUser);
        localStorage.setItem('fleetly_token', accessToken);
        localStorage.setItem('fleetly_user', JSON.stringify(newUser));
        toast.success('Compte créé avec succès');
        return { success: true, user: newUser };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      const message = getApiErrorMessage(error, 'Erreur lors de l\'inscription');
      toast.error(message);
      return { success: false, message };
    }
  };

  const loginWithToken = async (accessToken) => {
    try {
      // Persist first so the axios interceptor attaches it to the /me request.
      localStorage.setItem('fleetly_token', accessToken);
      const response = await authAPI.me();
      if (response.data.success) {
        const userData = response.data.data;
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem('fleetly_user', JSON.stringify(userData));
        toast.success('Connexion réussie');
        return { success: true, user: userData };
      }
      localStorage.removeItem('fleetly_token');
      return { success: false, message: response.data.message };
    } catch (error) {
      localStorage.removeItem('fleetly_token');
      localStorage.removeItem('fleetly_user');
      setToken(null);
      setUser(null);
      const message = getApiErrorMessage(error, 'Erreur de connexion');
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('fleetly_token');
    localStorage.removeItem('fleetly_user');
    toast.success('Déconnecté');
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'admin' || user?.isAdmin;
  const isFleetManager = user?.role === 'fleet_manager';
  const isAgent = user?.role === 'agent';
  const isStaff = isAdmin || user?.role === 'agency_manager';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithToken,
        register,
        logout,
        isAuthenticated: !!token && !!user,
        isAdmin,
        isFleetManager,
        isAgent,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
