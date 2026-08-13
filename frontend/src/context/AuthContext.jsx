import { createContext, useContext, useEffect, useState } from 'react';
import {
  sendOTP as apiSendOTP,
  loginUser as apiLoginUser,
  registerUser as apiRegisterUser,
  verifyMe as apiVerifyMe,
  logoutUser as apiLogoutUser,
} from '../services/api';

const AuthContext = createContext(null);

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate backend session token on app initialization
  useEffect(() => {
    async function checkAuthSession() {
      const token = localStorage.getItem('geo_auth_token');
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const res = await apiVerifyMe();
        const activeUser = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: 'Location Strategist',
          avatar: DEFAULT_AVATAR,
        };
        setUser(activeUser);
        setIsAuthenticated(true);
        localStorage.setItem('geo_auth_user', JSON.stringify(activeUser));
      } catch (err) {
        // Invalid or expired token: clear local state
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('geo_auth_token');
        localStorage.removeItem('geo_auth_user');
      } finally {
        setLoading(false);
      }
    }

    checkAuthSession();
  }, []);

  const requestOTP = async (email, purpose = 'registration') => {
    const res = await apiSendOTP(email, purpose);
    return res;
  };

  const register = async (userData) => {
    const res = await apiRegisterUser(userData);
    if (res.token && res.user) {
      const activeUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: 'Location Strategist',
        avatar: DEFAULT_AVATAR,
      };
      setUser(activeUser);
      setIsAuthenticated(true);
      localStorage.setItem('geo_auth_token', res.token);
      localStorage.setItem('geo_auth_user', JSON.stringify(activeUser));
    }
    return res;
  };

  const login = async (email, password) => {
    const res = await apiLoginUser(email, password);
    const activeUser = {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      role: 'Location Strategist',
      avatar: DEFAULT_AVATAR,
    };
    setUser(activeUser);
    setIsAuthenticated(true);
    localStorage.setItem('geo_auth_token', res.token);
    localStorage.setItem('geo_auth_user', JSON.stringify(activeUser));
    return res;
  };

  const logout = async () => {
    await apiLogoutUser();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('geo_auth_token');
    localStorage.removeItem('geo_auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        requestOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
