import React, { createContext, useContext, useState, useEffect } from 'react';

type WalletMode = 'real' | 'virtual';

interface WalletModeContextType {
  walletMode: WalletMode;
  setWalletMode: (mode: WalletMode) => void;
  toggleWalletMode: () => void;
  isRealMode: boolean;
  isVirtualMode: boolean;
}

const WalletModeContext = createContext<WalletModeContextType | undefined>(undefined);

export function WalletModeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage or default to 'real'
  const [walletMode, setWalletModeState] = useState<WalletMode>(() => {
    const saved = localStorage.getItem('chanspaw_wallet_mode');
    const mode = (saved as WalletMode) || 'real';
    console.log('🎯 WalletModeContext initialized with mode:', mode);
    return mode;
  });

  // Save to localStorage whenever mode changes
  useEffect(() => {
    localStorage.setItem('chanspaw_wallet_mode', walletMode);
    console.log('🔄 Wallet mode changed to:', walletMode);
  }, [walletMode]);

  const setWalletMode = (mode: WalletMode) => {
    setWalletModeState(mode);
  };

  const toggleWalletMode = () => {
    setWalletModeState(prev => prev === 'real' ? 'virtual' : 'real');
  };

  const isRealMode = walletMode === 'real';
  const isVirtualMode = walletMode === 'virtual';

  return (
    <WalletModeContext.Provider value={{
      walletMode,
      setWalletMode,
      toggleWalletMode,
      isRealMode,
      isVirtualMode
    }}>
      {children}
    </WalletModeContext.Provider>
  );
}

export function useWalletMode() {
  const context = useContext(WalletModeContext);
  if (context === undefined) {
    throw new Error('useWalletMode must be used within a WalletModeProvider');
  }
  return context;
} 