import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Alert } from 'react-native';
import { accountManager, StoredAccount } from '../services/accountManager';

export interface AccountContextType {
    accounts: StoredAccount[];
    activeAccount: StoredAccount | null;
    isLoading: boolean;
    isSwitching: boolean;
    switchAccount: (accountId: string) => Promise<boolean>;
    quickSwitch: () => Promise<StoredAccount | null>;
    removeAccount: (accountId: string) => Promise<boolean>;
    refreshAccounts: () => Promise<void>;
    showAccountSwitcher: boolean;
    setShowAccountSwitcher: (show: boolean) => void;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function useAccountContext(): AccountContextType {
    const context = useContext(AccountContext);
    if (!context) {
        throw new Error('useAccountContext must be used within AccountProvider');
    }
    return context;
}

interface AccountProviderProps {
    children: ReactNode;
    onAccountSwitch?: (account: StoredAccount) => void;
}

export function AccountProvider({ children, onAccountSwitch }: AccountProviderProps) {
    const [accounts, setAccounts] = useState<StoredAccount[]>([]);
    const [activeAccount, setActiveAccount] = useState<StoredAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSwitching, setIsSwitching] = useState(false);
    const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setIsLoading(true);
        try {
            const storedAccounts = await accountManager.getStoredAccounts();
            const active = await accountManager.getActiveAccount();
            setAccounts(storedAccounts);
            setActiveAccount(active);
        } catch (error) {
            console.error('Failed to load accounts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshAccounts = useCallback(async () => {
        await loadAccounts();
    }, []);

    const switchAccount = useCallback(async (accountId: string): Promise<boolean> => {
        if (isSwitching) return false;

        setIsSwitching(true);
        try {
            const success = await accountManager.switchToAccount(accountId);
            if (success) {
                const newActive = await accountManager.getActiveAccount();
                setActiveAccount(newActive);

                // Refresh accounts list to update lastActiveAt
                await loadAccounts();

                if (newActive && onAccountSwitch) {
                    onAccountSwitch(newActive);
                }

                return true;
            }
            return false;
        } catch (error) {
            console.error('Error switching account:', error);
            Alert.alert('Error', 'Failed to switch account. Please try again.');
            return false;
        } finally {
            setIsSwitching(false);
        }
    }, [isSwitching, onAccountSwitch]);

    const quickSwitch = useCallback(async (): Promise<StoredAccount | null> => {
        if (accounts.length < 2) {
            return null;
        }

        setIsSwitching(true);
        try {
            const switchedTo = await accountManager.quickSwitch();
            if (switchedTo) {
                setActiveAccount(switchedTo);
                await loadAccounts();

                if (onAccountSwitch) {
                    onAccountSwitch(switchedTo);
                }
            }
            return switchedTo;
        } catch (error) {
            console.error('Error quick switching:', error);
            return null;
        } finally {
            setIsSwitching(false);
        }
    }, [accounts.length, onAccountSwitch]);

    const removeAccount = useCallback(async (accountId: string): Promise<boolean> => {
        try {
            const success = await accountManager.removeAccount(accountId);
            if (success) {
                await loadAccounts();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing account:', error);
            Alert.alert('Error', 'Failed to remove account. Please try again.');
            return false;
        }
    }, []);

    const contextValue = useMemo<AccountContextType>(() => ({
        accounts,
        activeAccount,
        isLoading,
        isSwitching,
        switchAccount,
        quickSwitch,
        removeAccount,
        refreshAccounts,
        showAccountSwitcher,
        setShowAccountSwitcher,
    }), [accounts, activeAccount, isLoading, isSwitching, switchAccount, quickSwitch, removeAccount, refreshAccounts, showAccountSwitcher, setShowAccountSwitcher]);

    return (
        <AccountContext.Provider value={contextValue}>
            {children}
        </AccountContext.Provider>
    );
}

export { AccountContext };
