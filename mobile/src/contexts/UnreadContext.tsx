import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';

// Unread count context
interface UnreadContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: (amount?: number) => void;
}

const UnreadContext = createContext<UnreadContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnreadCount: () => {},
});

export const useUnreadCount = () => useContext(UnreadContext);

interface UnreadProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function UnreadProvider({ children, isAuthenticated }: UnreadProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count from API
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await api.getTotalUnreadCount();
      if (response.success && typeof response.unreadCount === 'number') {
        setUnreadCount(response.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Decrement unread count locally (when reading messages)
  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount));
  }, []);

  // Fetch unread count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshUnreadCount();
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, refreshUnreadCount]);

  // Listen for new messages to update unread count
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewMessage = (data: any) => {
      if (data && data.message) {
        refreshUnreadCount();
      }
    };

    const handleMessagesRead = () => {
      refreshUnreadCount();
    };

    const setupSocketListeners = () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('chat:new_message', handleNewMessage);
        socket.on('chat:messages_read', handleMessagesRead);
        return true;
      }
      return false;
    };

    if (!setupSocketListeners()) {
      const retryTimeout = setTimeout(() => {
        setupSocketListeners();
      }, 1000);

      return () => {
        clearTimeout(retryTimeout);
        const socket = socketService.getSocket();
        if (socket) {
          socket.off('chat:new_message', handleNewMessage);
          socket.off('chat:messages_read', handleMessagesRead);
        }
      };
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('chat:new_message', handleNewMessage);
        socket.off('chat:messages_read', handleMessagesRead);
      }
    };
  }, [isAuthenticated, refreshUnreadCount]);

  const contextValue: UnreadContextType = {
    unreadCount,
    refreshUnreadCount,
    decrementUnreadCount,
  };

  return (
    <UnreadContext.Provider value={contextValue}>
      {children}
    </UnreadContext.Provider>
  );
}
