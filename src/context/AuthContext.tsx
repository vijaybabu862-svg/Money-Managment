import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, FirstRunLinkingChoice } from '../types/sync';
import { AuthService } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { globalSyncEngine } from '../services/syncEngine';
import { StorageService } from '../services/storage';
import { CloudRepository } from '../services/cloudRepository';

interface AuthContextType {
  authState: AuthState;
  isConfigured: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  showFirstRunModal: boolean;
  dismissFirstRunModal: () => void;
  handleFirstRunChoice: (choice: FirstRunLinkingChoice) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FIRST_RUN_COMPLETED_KEY = 'cashflow_first_run_linking_done';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [showFirstRunModal, setShowFirstRunModal] = useState<boolean>(false);
  const isConfigured = isFirebaseConfigured();

  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuthChanges((state) => {
      setAuthState(state);
      if (state.status === 'signed_in' && state.userId) {
        globalSyncEngine.setUserId(state.userId);
        globalSyncEngine.syncNow();
      } else {
        globalSyncEngine.setUserId(null);
        setShowFirstRunModal(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const res = await AuthService.signInWithGoogle();
    if (res.success && res.user) {
      setAuthState(res.user);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const logout = async () => {
    await AuthService.signOut();
    setAuthState({ status: 'signed_out' });
  };

  const dismissFirstRunModal = () => {
    if (authState.userId) {
      localStorage.setItem(`${FIRST_RUN_COMPLETED_KEY}_${authState.userId}`, 'true');
    }
    setShowFirstRunModal(false);
  };

  const handleFirstRunChoice = async (choice: FirstRunLinkingChoice) => {
    if (!authState.userId) return;

    if (choice === 'UPLOAD_LOCAL') {
      const currentState = StorageService.loadState();
      await CloudRepository.uploadFullState(authState.userId, currentState);
      await globalSyncEngine.syncNow();
    } else if (choice === 'DOWNLOAD_CLOUD') {
      await globalSyncEngine.syncNow();
    } else if (choice === 'KEEP_LOCAL_ONLY') {
      // Do nothing, keep local only
    }

    dismissFirstRunModal();
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        isConfigured,
        loginWithGoogle,
        logout,
        showFirstRunModal,
        dismissFirstRunModal,
        handleFirstRunChoice,
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
