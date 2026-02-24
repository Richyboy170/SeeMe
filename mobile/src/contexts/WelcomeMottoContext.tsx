import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import WelcomeMottoModal from '../components/WelcomeMottoModal';

interface WelcomeMottoContextType {
  triggerWelcomeMotto: () => void;
}

const WelcomeMottoContext = createContext<WelcomeMottoContextType | undefined>(undefined);

interface WelcomeMottoProviderProps {
  children: ReactNode;
}

export function WelcomeMottoProvider({ children }: WelcomeMottoProviderProps) {
  const [visible, setVisible] = useState(false);

  const triggerWelcomeMotto = useCallback(() => {
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <WelcomeMottoContext.Provider value={{ triggerWelcomeMotto }}>
      {children}
      <WelcomeMottoModal visible={visible} onClose={handleClose} />
    </WelcomeMottoContext.Provider>
  );
}

export function useWelcomeMotto() {
  const context = useContext(WelcomeMottoContext);
  if (!context) {
    throw new Error('useWelcomeMotto must be used within a WelcomeMottoProvider');
  }
  return context;
}

export default WelcomeMottoContext;
