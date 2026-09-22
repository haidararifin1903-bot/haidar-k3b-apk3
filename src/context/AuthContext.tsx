import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { firebaseAuth } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys to enforce clean mandatory login
const AUTH_STORAGE_KEY = 'haicontainer_auth_active_tab_v5';
const REMEMBER_ME_KEY = 'haicontainer_remember_me_v5';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Clear any obsolete legacy auto-login keys from previous versions
    localStorage.removeItem('haicontainer_session_user');
    localStorage.removeItem('haicontainer_auth_user');
    localStorage.removeItem('haicontainer_auth_user_v1');
    localStorage.removeItem('haicontainer_auth_user_v2');
    localStorage.removeItem('haicontainer_remember_me_v2');
    sessionStorage.removeItem('haicontainer_auth_user_v2');
    sessionStorage.removeItem('haicontainer_auth_user');

    // 2. Wajib Login di Halaman Pertama:
    // Periksa sessionStorage hanya jika pengguna sudah aktif login dalam tab sesi saat ini
    const sessionSaved = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (sessionSaved) {
      try {
        const parsed = JSON.parse(sessionSaved);
        setUser(parsed);
      } catch (e) {
        console.error('Failed to parse session user', e);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
      }
    } else {
      // Pastikan pengguna wajib login terlebih dahulu
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Try Firebase Auth
    if (firebaseAuth) {
      try {
        const userCred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPassword);
        if (userCred && userCred.user) {
          const profile: UserProfile = {
            id: userCred.user.uid,
            email: userCred.user.email || cleanEmail,
            full_name: userCred.user.displayName || 'Terminal Administrator',
            role: cleanEmail.includes('operator') ? 'operator' : cleanEmail.includes('spv') ? 'supervisor' : 'admin',
            terminal: 'Pelabuhan Tanjung Priok - Terminal 01',
          };
          saveUserSession(profile, rememberMe);
          setUser(profile);
          setIsLoading(false);
          return { success: true };
        }
      } catch (err) {
        // Fall back to terminal accounts below
      }
    }

    // 2. Local Terminal Accounts Validation
    // Super Admin
    if (
      (cleanEmail === 'admin@haicontainer.id' && cleanPassword === 'admin123') ||
      (cleanEmail === 'haidararifin1903@gmail.com' && cleanPassword === 'admin123')
    ) {
      const profile: UserProfile = {
        id: 'usr-admin-01',
        email: cleanEmail,
        full_name: 'Haidar Arifin (Terminal Manager)',
        role: 'admin',
        terminal: 'Pelabuhan Tanjung Priok - Terminal 01',
      };
      saveUserSession(profile, rememberMe);
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    }

    // Terminal Operator (Gate & Yard)
    if (cleanEmail === 'operator@haicontainer.id' && cleanPassword === 'operator123') {
      const profile: UserProfile = {
        id: 'usr-operator-01',
        email: cleanEmail,
        full_name: 'Bambang Wijaya (Gate & Yard Operator)',
        role: 'operator',
        terminal: 'Pelabuhan Tanjung Priok - Terminal 01',
      };
      saveUserSession(profile, rememberMe);
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    }

    // Yard & Vessel Supervisor
    if (cleanEmail === 'supervisor@haicontainer.id' && cleanPassword === 'supervisor123') {
      const profile: UserProfile = {
        id: 'usr-supervisor-01',
        email: cleanEmail,
        full_name: 'Surya Pratama (Operations Supervisor)',
        role: 'supervisor',
        terminal: 'Pelabuhan Tanjung Priok - Terminal 01',
      };
      saveUserSession(profile, rememberMe);
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    }

    // Enterprise fallback: any valid enterprise email with password >= 6 characters
    if (cleanEmail.includes('@') && cleanPassword.length >= 6) {
      const namePart = cleanEmail.split('@')[0];
      const formattedName = namePart
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      const profile: UserProfile = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        full_name: `${formattedName} (Terminal Staff)`,
        role: cleanEmail.includes('admin') ? 'admin' : cleanEmail.includes('super') ? 'supervisor' : 'operator',
        terminal: 'Pelabuhan Tanjung Priok - Terminal 01',
      };
      saveUserSession(profile, rememberMe);
      setUser(profile);
      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return {
      success: false,
      error: 'Kredensial tidak valid. Silakan gunakan akun admin/operator yang terdaftar atau periksa kembali kata sandi (minimal 6 karakter).',
    };
  };

  const saveUserSession = (profile: UserProfile, rememberMe: boolean) => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (firebaseAuth) {
      try {
        await fbSignOut(firebaseAuth);
      } catch (err) {
        console.warn('Firebase signOut error:', err);
      }
    }
    setUser(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    setIsLoading(false);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      if (localStorage.getItem(REMEMBER_ME_KEY) === 'true') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
