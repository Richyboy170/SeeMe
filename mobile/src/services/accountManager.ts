import * as SecureStore from 'expo-secure-store';

/**
 * Account Manager Service
 * Handles secure storage and management of multiple user accounts
 * Tokens are encrypted using expo-secure-store
 */

const ACCOUNTS_KEY = 'seeme_accounts';
const ACTIVE_ACCOUNT_KEY = 'seeme_active_account';

export interface StoredAccount {
  id: string;
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  token: string;
  lastActiveAt: number;
}

interface AccountsData {
  accounts: StoredAccount[];
  activeAccountId: string | null;
}

class AccountManager {
  private cachedAccounts: AccountsData | null = null;

  /**
   * Get all stored accounts
   */
  async getStoredAccounts(): Promise<StoredAccount[]> {
    try {
      const data = await this.getAccountsData();
      return data.accounts;
    } catch (error) {
      console.error('Error getting stored accounts:', error);
      return [];
    }
  }

  /**
   * Get the currently active account
   */
  async getActiveAccount(): Promise<StoredAccount | null> {
    try {
      const data = await this.getAccountsData();
      if (!data.activeAccountId) return null;
      return data.accounts.find(acc => acc.id === data.activeAccountId) || null;
    } catch (error) {
      console.error('Error getting active account:', error);
      return null;
    }
  }

  /**
   * Get the active account's token for API requests
   */
  async getActiveToken(): Promise<string | null> {
    const account = await this.getActiveAccount();
    return account?.token || null;
  }

  /**
   * Get the last active account (for quick-switch)
   * Returns the most recently used account that isn't currently active
   */
  async getLastActiveAccount(): Promise<StoredAccount | null> {
    try {
      const data = await this.getAccountsData();
      const activeId = data.activeAccountId;
      
      // Filter out active account and sort by lastActiveAt descending
      const otherAccounts = data.accounts
        .filter(acc => acc.id !== activeId)
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
      
      return otherAccounts[0] || null;
    } catch (error) {
      console.error('Error getting last active account:', error);
      return null;
    }
  }

  /**
   * Add a new account or update existing one
   * If account with same userId exists, update the token
   */
  async addAccount(
    token: string,
    user: { id: string; username: string; email?: string; avatarUrl?: string }
  ): Promise<StoredAccount> {
    const data = await this.getAccountsData();
    
    // Check if account already exists
    const existingIndex = data.accounts.findIndex(acc => acc.userId === user.id);
    
    const account: StoredAccount = {
      id: existingIndex >= 0 ? data.accounts[existingIndex].id : this.generateAccountId(),
      userId: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      token,
      lastActiveAt: Date.now(),
    };

    if (existingIndex >= 0) {
      // Update existing account
      data.accounts[existingIndex] = account;
    } else {
      // Add new account
      data.accounts.push(account);
    }

    // Set as active account
    data.activeAccountId = account.id;
    
    await this.saveAccountsData(data);
    return account;
  }

  /**
   * Switch to a different account
   */
  async switchToAccount(accountId: string): Promise<boolean> {
    try {
      const data = await this.getAccountsData();
      const account = data.accounts.find(acc => acc.id === accountId);
      
      if (!account) {
        console.error('Account not found:', accountId);
        return false;
      }

      // Update last active time for the account we're switching to
      account.lastActiveAt = Date.now();
      data.activeAccountId = accountId;
      
      await this.saveAccountsData(data);
      return true;
    } catch (error) {
      console.error('Error switching account:', error);
      return false;
    }
  }

  /**
   * Quick switch to the last active account
   * Returns the account switched to, or null if no other account available
   */
  async quickSwitch(): Promise<StoredAccount | null> {
    const lastActive = await this.getLastActiveAccount();
    if (lastActive) {
      const success = await this.switchToAccount(lastActive.id);
      if (success) {
        return lastActive;
      }
    }
    return null;
  }

  /**
   * Remove an account from storage
   */
  async removeAccount(accountId: string): Promise<boolean> {
    try {
      const data = await this.getAccountsData();
      const accountIndex = data.accounts.findIndex(acc => acc.id === accountId);
      
      if (accountIndex < 0) {
        return false;
      }

      // Remove the account
      data.accounts.splice(accountIndex, 1);

      // If we removed the active account, switch to another one
      if (data.activeAccountId === accountId) {
        if (data.accounts.length > 0) {
          // Switch to the most recently active account
          const sorted = [...data.accounts].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
          data.activeAccountId = sorted[0].id;
        } else {
          data.activeAccountId = null;
        }
      }

      await this.saveAccountsData(data);
      return true;
    } catch (error) {
      console.error('Error removing account:', error);
      return false;
    }
  }

  /**
   * Clear all accounts (logout from all)
   */
  async clearAllAccounts(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCOUNTS_KEY);
      this.cachedAccounts = null;
    } catch (error) {
      console.error('Error clearing accounts:', error);
    }
  }

  /**
   * Update account profile info (username, avatar, etc.)
   */
  async updateAccountProfile(
    accountId: string,
    updates: Partial<Pick<StoredAccount, 'username' | 'avatarUrl' | 'email'>>
  ): Promise<void> {
    const data = await this.getAccountsData();
    const account = data.accounts.find(acc => acc.id === accountId);
    
    if (account) {
      if (updates.username) account.username = updates.username;
      if (updates.avatarUrl !== undefined) account.avatarUrl = updates.avatarUrl;
      if (updates.email) account.email = updates.email;
      
      await this.saveAccountsData(data);
    }
  }

  /**
   * Check if there are multiple accounts for quick-switch
   */
  async hasMultipleAccounts(): Promise<boolean> {
    const accounts = await this.getStoredAccounts();
    return accounts.length > 1;
  }

  /**
   * Get account count
   */
  async getAccountCount(): Promise<number> {
    const accounts = await this.getStoredAccounts();
    return accounts.length;
  }

  // Private methods

  private async getAccountsData(): Promise<AccountsData> {
    if (this.cachedAccounts) {
      return this.cachedAccounts;
    }

    try {
      const stored = await SecureStore.getItemAsync(ACCOUNTS_KEY);
      if (stored) {
        this.cachedAccounts = JSON.parse(stored);
        return this.cachedAccounts!;
      }
    } catch (error) {
      console.error('Error reading accounts from secure storage:', error);
    }

    // Return empty data if nothing stored
    return { accounts: [], activeAccountId: null };
  }

  private async saveAccountsData(data: AccountsData): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(data));
      this.cachedAccounts = data;
    } catch (error) {
      console.error('Error saving accounts to secure storage:', error);
      throw error;
    }
  }

  private generateAccountId(): string {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Migrate from old AsyncStorage token to new multi-account system
   * Call this once during app startup for existing users
   */
  async migrateFromAsyncStorage(
    oldToken: string | null,
    userInfo: { id: string; username: string; email?: string; avatarUrl?: string } | null
  ): Promise<void> {
    if (!oldToken || !userInfo) return;

    const existingAccounts = await this.getStoredAccounts();
    if (existingAccounts.length > 0) {
      // Already migrated
      return;
    }

    // Migrate the old token to new system
    await this.addAccount(oldToken, userInfo);
    console.log('Migrated existing account to multi-account system');
  }
}

export const accountManager = new AccountManager();
