import React, { createContext, useContext } from 'react';

// Unread count context
export interface UnreadContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: (amount?: number) => void;
}

export const UnreadContext = createContext<UnreadContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnreadCount: () => {},
});

export const useUnreadCount = () => useContext(UnreadContext);

// Navigation Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type CoinsStackParamList = {
  CoinsHome: undefined;
  GiveLeaderboard: undefined;
  CoinHistory: undefined;
  GivingActivity: undefined;
};

export type ChatStackParamList = {
  Conversations: undefined;
  Chat: {
    conversationId: string;
    otherUser: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
  };
};

export type SearchStackParamList = {
  SearchUsers: undefined;
  UserProfile: {
    userId: string;
    username: string;
  };
};

export type DiscoverStackParamList = {
  DiscoverHome: undefined;
  UserProfile: {
    userId: string;
    username: string;
  };
  TopicPage: {
    topicSlug: string;
  };
  CreateTopic: undefined;
  Comments: {
    postId: string;
  };
};

export type FeedStackParamList = {
  FeedHome: undefined;
  Comments: {
    postId: string;
  };
  UserProfile: {
    userId: string;
    username: string;
  };
  Conversations: undefined;
  Chat: {
    conversationId: string;
    otherUser: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
  };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  AvatarCustomization: {
    avatarId?: string;
  };
  FollowRequests: undefined;
};

export type CreatePostStackParamList = {
  CreatePostHome: undefined;
  FullBodyAvatar: {
    imageUri?: string;
  };
};

export type TopicsStackParamList = {
  BrowseTopics: undefined;
  TopicPage: {
    topicSlug: string;
  };
  CreateTopic: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Discover: undefined;
  CreatePost: undefined;
  Coins: undefined;
  Profile: undefined;
};
