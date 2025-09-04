import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ActiveUser } from '../types/session';

interface SessionContextType {
  activeUser: ActiveUser | null;
  setActiveUser: (user: ActiveUser | null) => void;
  clearSession: () => void;
  isSessionLoaded: boolean;
}

const SessionContext = createContext<SessionContextType | null>(null);

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [activeUser, setActiveUserState] = useState<ActiveUser | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Load session from sessionStorage on mount
  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem('activeUser');
      if (savedUser) {
        const user = JSON.parse(savedUser) as ActiveUser;
        setActiveUserState(user);
      }
    } catch (error) {
      console.error('Failed to load session from storage:', error);
    } finally {
      setIsSessionLoaded(true);
    }
  }, []);

  // Save to sessionStorage whenever activeUser changes
  const setActiveUser = (user: ActiveUser | null) => {
    setActiveUserState(user);
    
    try {
      if (user) {
        sessionStorage.setItem('activeUser', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('activeUser');
      }
    } catch (error) {
      console.error('Failed to save session to storage:', error);
    }
  };

  const clearSession = () => {
    setActiveUser(null);
  };

  return (
    <SessionContext.Provider
      value={{
        activeUser,
        setActiveUser,
        clearSession,
        isSessionLoaded,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};