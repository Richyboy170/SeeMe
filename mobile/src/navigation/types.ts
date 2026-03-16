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
  FriendshipDetail: {
    otherUserId: string;
    otherUsername: string;
    otherAvatarUrl?: string;
    otherActiveAvatar?: {
      id: string;
      style: 'cartoon' | 'anime' | 'minimalist';
      customizations: any;
    } | null;
  };
  UserProfile: {
    userId: string;
    username: string;
  };
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
  MyProfile: undefined;
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
  FriendshipDetail: {
    otherUserId: string;
    otherUsername: string;
    otherAvatarUrl?: string;
    otherActiveAvatar?: {
      id: string;
      style: 'cartoon' | 'anime' | 'minimalist';
      customizations: any;
    } | null;
  };
  PendingRequests: {
    topicId: string;
  };
  BroadcasterManagement: {
    topicId: string;
  };
  AvatarCustomization: {
    avatarId?: string;
  };
  FollowRequests: undefined;
  ArchivedPosts: undefined;
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
  TopicPage: {
    topicSlug: string;
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
  FriendshipDetail: {
    otherUserId: string;
    otherUsername: string;
    otherAvatarUrl?: string;
    otherActiveAvatar?: {
      id: string;
      style: 'cartoon' | 'anime' | 'minimalist';
      customizations: any;
    } | null;
  };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  AvatarCustomization: {
    avatarId?: string;
  };
  FollowRequests: undefined;
  ArchivedPosts: undefined;
};

export type CreatePostStackParamList = {
  CreatePostHome: {
    resumeDraftId?: string;
    activityId?: string;
    activityTitle?: string;
    activityDescription?: string;
    activityResearch?: string;
    activityTopicId?: string;
    activityTopicName?: string;
  } | undefined;
  DraftsGallery: undefined;
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

export type FriendshipMeetupStackParamList = {
  FriendshipHome: undefined;
  CreateSession: undefined;
  JoinSession: undefined;
  PhotoBooth: {
    sessionId: string;
    poses: string[];
    isHost: boolean;
  };
  PhotoStrip: {
    sessionId: string;
    photos: string[];
    poses: string[];
    partnerUsername: string;
    partnerUserId?: string;
  };
  MeetupDetail: {
    meetup: any;
  };
  FriendshipDetail: {
    otherUserId: string;
    otherUsername: string;
    otherAvatarUrl?: string;
    otherActiveAvatar?: {
      id: string;
      style: 'cartoon' | 'anime' | 'minimalist';
      customizations: any;
    } | null;
  };
};

export type MainTabParamList = {
  Feed: undefined;
  Discover: undefined;
  CreatePost: undefined;
  Fillup: undefined;
  Coins: undefined;
};
