import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, signInWithGoogle, logout, signUpWithEmail, logInWithEmail } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signUpEmail: (email: string, pass: string) => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  loginAsGuest: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      if (!isGuest) {
        setUser(u);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isGuest]);

  const signInGoogle = async () => {
    setIsGuest(false);
    await signInWithGoogle();
  };

  const signUpEmail = async (email: string, pass: string) => {
    setIsGuest(false);
    await signUpWithEmail(email, pass);
  };

  const signInEmail = async (email: string, pass: string) => {
    setIsGuest(false);
    await logInWithEmail(email, pass);
  };

  const signOutUser = async () => {
    setIsGuest(false);
    await logout();
    setUser(null);
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    setUser({
      uid: 'guest-' + Date.now(),
      email: 'guest@offline.local',
      displayName: 'Guest User',
      emailVerified: false,
      isAnonymous: true,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
    } as unknown as User);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInGoogle, signUpEmail, signInEmail, signOutUser, loginAsGuest, isGuest }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};