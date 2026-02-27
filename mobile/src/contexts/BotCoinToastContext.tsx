import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import BotCoinToast from '../components/coins/BotCoinToast';

interface BotCoinNotification {
  botUsername: string;
  amount: number;
  message: string;
}

interface BotCoinToastContextType {
  showBotCoinToast: (botUsername: string, amount: number, message: string) => void;
}

const BotCoinToastContext = createContext<BotCoinToastContextType | undefined>(undefined);

interface BotCoinToastProviderProps {
  children: ReactNode;
}

export function BotCoinToastProvider({ children }: BotCoinToastProviderProps) {
  const [current, setCurrent] = useState<BotCoinNotification | null>(null);
  const [visible, setVisible] = useState(false);
  const queueRef = useRef<BotCoinNotification[]>([]);
  const isShowingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isShowingRef.current = false;
      return;
    }

    isShowingRef.current = true;
    const next = queueRef.current.shift()!;
    setCurrent(next);
    setVisible(true);
  }, []);

  const showBotCoinToast = useCallback((botUsername: string, amount: number, message: string) => {
    queueRef.current.push({ botUsername, amount, message });

    if (!isShowingRef.current) {
      showNext();
    }
  }, [showNext]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setCurrent(null);

    // Show next toast after a 300ms gap
    setTimeout(() => {
      showNext();
    }, 300);
  }, [showNext]);

  return (
    <BotCoinToastContext.Provider value={{ showBotCoinToast }}>
      {children}
      <BotCoinToast
        visible={visible}
        botUsername={current?.botUsername || ''}
        amount={current?.amount || 0}
        message={current?.message || ''}
        onDismiss={handleDismiss}
      />
    </BotCoinToastContext.Provider>
  );
}

export function useBotCoinToast() {
  const context = useContext(BotCoinToastContext);
  if (!context) {
    throw new Error('useBotCoinToast must be used within a BotCoinToastProvider');
  }
  return context;
}

export default BotCoinToastContext;
