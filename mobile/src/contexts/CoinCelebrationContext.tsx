import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CoinCelebration from '../components/coins/CoinCelebration';

type CelebrationSource = 'post' | 'comment' | 'ad' | 'claim' | 'gift' | 'received';

interface CoinCelebrationContextType {
  showCelebration: (amount: number, source: CelebrationSource, recipientUsername?: string) => void;
}

const CoinCelebrationContext = createContext<CoinCelebrationContextType | undefined>(undefined);

interface CoinCelebrationProviderProps {
  children: ReactNode;
}

export function CoinCelebrationProvider({ children }: CoinCelebrationProviderProps) {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState(0);
  const [source, setSource] = useState<CelebrationSource>('claim');
  const [recipientUsername, setRecipientUsername] = useState<string | undefined>();

  const showCelebration = useCallback((
    coinAmount: number,
    celebrationSource: CelebrationSource,
    recipient?: string
  ) => {
    setAmount(coinAmount);
    setSource(celebrationSource);
    setRecipientUsername(recipient);
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <CoinCelebrationContext.Provider value={{ showCelebration }}>
      {children}
      <CoinCelebration
        visible={visible}
        amount={amount}
        source={source}
        recipientUsername={recipientUsername}
        onClose={handleClose}
      />
    </CoinCelebrationContext.Provider>
  );
}

export function useCoinCelebration() {
  const context = useContext(CoinCelebrationContext);
  if (!context) {
    throw new Error('useCoinCelebration must be used within a CoinCelebrationProvider');
  }
  return context;
}

export default CoinCelebrationContext;
