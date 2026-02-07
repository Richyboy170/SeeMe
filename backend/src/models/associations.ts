import { User } from './User';
import { Post } from './Post';
import { Follow } from './Follow';
import { Like } from './Like';
import { Comment } from './Comment';
import { SavedPost } from './SavedPost';
import { Repost } from './Repost';
import { PositivityCoins } from './PositivityCoins';
import { CoinTransaction } from './CoinTransaction';
import { CoinGivingActivity } from './CoinGivingActivity';
import { Conversation } from './Conversation';
import { Message } from './Message';
import { BlockedUser } from './BlockedUser';
import { MessageReaction } from './MessageReaction';

// Phase 3.3: Community/Topic imports
import { Topic } from './Topic';
import { TopicFollow } from './TopicFollow';
import { TopicAdmin } from './TopicAdmin';
import { PostTopic } from './PostTopic';
import { UserFavorite } from './UserFavorite';
import { UserTopicStatus } from './UserTopicStatus';
import { EncouragementStreak } from './EncouragementStreak';
import { UserCommunityMedal } from './UserCommunityMedal';
import { UserGlobalMedal } from './UserGlobalMedal';

// Trust Score imports
import { FriendTrust } from './FriendTrust';
import { FriendTrustDailyLog } from './FriendTrustDailyLog';

/**
 * Set up model associations
 * This file should be imported after all models are defined
 */
export const setupAssociations = () => {
  // User -> Post: One-to-Many
  // A user can have many posts
  User.hasMany(Post, {
    foreignKey: 'userId',
    as: 'posts',
    onDelete: 'CASCADE'
  });

  // Post -> User: Many-to-One
  // A post belongs to a user
  Post.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // User -> Follow (as Follower): One-to-Many
  // A user can follow many users
  User.hasMany(Follow, {
    foreignKey: 'followerId',
    as: 'following',
    onDelete: 'CASCADE'
  });

  // User -> Follow (as Following): One-to-Many
  // A user can be followed by many users
  User.hasMany(Follow, {
    foreignKey: 'followingId',
    as: 'followers',
    onDelete: 'CASCADE'
  });

  // Follow -> User (Follower): Many-to-One
  Follow.belongsTo(User, {
    foreignKey: 'followerId',
    as: 'follower'
  });

  // Follow -> User (Following): Many-to-One
  Follow.belongsTo(User, {
    foreignKey: 'followingId',
    as: 'followingUser'
  });

  // User -> User: Many-to-Many through Follow
  // This creates a self-referential relationship
  User.belongsToMany(User, {
    through: Follow,
    as: 'followedUsers',
    foreignKey: 'followerId',
    otherKey: 'followingId'
  });

  User.belongsToMany(User, {
    through: Follow,
    as: 'followerUsers',
    foreignKey: 'followingId',
    otherKey: 'followerId'
  });

  // Post -> Like: One-to-Many
  // A post can have many likes
  Post.hasMany(Like, {
    foreignKey: 'postId',
    as: 'likes',
    onDelete: 'CASCADE'
  });

  // Like -> Post: Many-to-One
  Like.belongsTo(Post, {
    foreignKey: 'postId',
    as: 'post'
  });

  // User -> Like: One-to-Many
  // A user can like many posts
  User.hasMany(Like, {
    foreignKey: 'userId',
    as: 'likes',
    onDelete: 'CASCADE'
  });

  // Like -> User: Many-to-One
  Like.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // User -> SavedPost: One-to-Many
  // A user can save many posts
  User.hasMany(SavedPost, {
    foreignKey: 'userId',
    as: 'savedPosts',
    onDelete: 'CASCADE'
  });

  // SavedPost -> User: Many-to-One
  SavedPost.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // Post -> SavedPost: One-to-Many
  // A post can be saved by many users
  Post.hasMany(SavedPost, {
    foreignKey: 'postId',
    as: 'saves',
    onDelete: 'CASCADE'
  });

  // SavedPost -> Post: Many-to-One
  SavedPost.belongsTo(Post, {
    foreignKey: 'postId',
    as: 'post'
  });

  // ===== REPOST ASSOCIATIONS =====

  // User -> Repost: One-to-Many
  // A user can repost many posts
  User.hasMany(Repost, {
    foreignKey: 'userId',
    as: 'reposts',
    onDelete: 'CASCADE'
  });

  // Repost -> User: Many-to-One
  Repost.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // Post -> Repost: One-to-Many
  // A post can be reposted many times
  Post.hasMany(Repost, {
    foreignKey: 'originalPostId',
    as: 'reposts',
    onDelete: 'CASCADE'
  });

  // Repost -> Post: Many-to-One
  Repost.belongsTo(Post, {
    foreignKey: 'originalPostId',
    as: 'originalPost'
  });

  // Post -> Comment: One-to-Many
  // A post can have many comments
  Post.hasMany(Comment, {
    foreignKey: 'postId',
    as: 'comments',
    onDelete: 'CASCADE'
  });

  // Comment -> Post: Many-to-One
  Comment.belongsTo(Post, {
    foreignKey: 'postId',
    as: 'post'
  });

  // User -> Comment: One-to-Many
  // A user can write many comments
  User.hasMany(Comment, {
    foreignKey: 'userId',
    as: 'comments',
    onDelete: 'CASCADE'
  });

  // Comment -> User: Many-to-One
  Comment.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // Comment -> Comment: Self-referential for replies
  // A comment can have many replies
  Comment.hasMany(Comment, {
    foreignKey: 'parentCommentId',
    as: 'replies',
    onDelete: 'CASCADE'
  });

  // Comment -> Comment: Parent relationship
  Comment.belongsTo(Comment, {
    foreignKey: 'parentCommentId',
    as: 'parentComment'
  });

  // User -> PositivityCoins: One-to-One
  // A user has one coins record
  User.hasOne(PositivityCoins, {
    foreignKey: 'userId',
    as: 'coins',
    onDelete: 'CASCADE'
  });

  // PositivityCoins -> User: One-to-One
  PositivityCoins.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // CoinTransaction -> User (from): Many-to-One
  // Transaction sender
  CoinTransaction.belongsTo(User, {
    foreignKey: 'fromUserId',
    as: 'fromUser'
  });

  // CoinTransaction -> User (to): Many-to-One
  // Transaction receiver
  CoinTransaction.belongsTo(User, {
    foreignKey: 'toUserId',
    as: 'toUser'
  });

  // CoinTransaction -> Post: Many-to-One
  CoinTransaction.belongsTo(Post, {
    foreignKey: 'relatedPostId',
    as: 'relatedPost'
  });

  // CoinTransaction -> Comment: Many-to-One
  CoinTransaction.belongsTo(Comment, {
    foreignKey: 'relatedCommentId',
    as: 'relatedComment'
  });

  // User -> CoinTransaction (sent): One-to-Many
  User.hasMany(CoinTransaction, {
    foreignKey: 'fromUserId',
    as: 'sentTransactions',
    onDelete: 'SET NULL'
  });

  // User -> CoinTransaction (received): One-to-Many
  User.hasMany(CoinTransaction, {
    foreignKey: 'toUserId',
    as: 'receivedTransactions',
    onDelete: 'CASCADE'
  });

  // CoinGivingActivity -> User (giver): Many-to-One
  CoinGivingActivity.belongsTo(User, {
    foreignKey: 'giverId',
    as: 'giver'
  });

  // CoinGivingActivity -> User (receiver): Many-to-One
  CoinGivingActivity.belongsTo(User, {
    foreignKey: 'receiverId',
    as: 'receiver'
  });

  // User -> CoinGivingActivity (given): One-to-Many
  User.hasMany(CoinGivingActivity, {
    foreignKey: 'giverId',
    as: 'coinsGiven',
    onDelete: 'CASCADE'
  });

  // User -> CoinGivingActivity (received): One-to-Many
  User.hasMany(CoinGivingActivity, {
    foreignKey: 'receiverId',
    as: 'coinsReceived',
    onDelete: 'CASCADE'
  });

  // ===== CHAT ASSOCIATIONS =====

  // Conversation -> User (user1): Many-to-One
  Conversation.belongsTo(User, {
    foreignKey: 'user1Id',
    as: 'user1'
  });

  // Conversation -> User (user2): Many-to-One
  Conversation.belongsTo(User, {
    foreignKey: 'user2Id',
    as: 'user2'
  });

  // User -> Conversation (as user1): One-to-Many
  User.hasMany(Conversation, {
    foreignKey: 'user1Id',
    as: 'conversationsAsUser1',
    onDelete: 'CASCADE'
  });

  // User -> Conversation (as user2): One-to-Many
  User.hasMany(Conversation, {
    foreignKey: 'user2Id',
    as: 'conversationsAsUser2',
    onDelete: 'CASCADE'
  });

  // Message -> Conversation: Many-to-One
  Message.belongsTo(Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation'
  });

  // Conversation -> Message: One-to-Many
  Conversation.hasMany(Message, {
    foreignKey: 'conversationId',
    as: 'messages',
    onDelete: 'CASCADE'
  });

  // Conversation -> Message (last message): One-to-One
  Conversation.belongsTo(Message, {
    foreignKey: 'lastMessageId',
    as: 'lastMessage'
  });

  // Message -> User (sender): Many-to-One
  Message.belongsTo(User, {
    foreignKey: 'senderId',
    as: 'sender'
  });

  // Message -> User (receiver): Many-to-One
  Message.belongsTo(User, {
    foreignKey: 'receiverId',
    as: 'receiver'
  });

  // User -> Message (sent): One-to-Many
  User.hasMany(Message, {
    foreignKey: 'senderId',
    as: 'sentMessages',
    onDelete: 'CASCADE'
  });

  // User -> Message (received): One-to-Many
  User.hasMany(Message, {
    foreignKey: 'receiverId',
    as: 'receivedMessages',
    onDelete: 'CASCADE'
  });

  // Message -> Post (shared post): Many-to-One
  Message.belongsTo(Post, {
    foreignKey: 'sharedPostId',
    as: 'sharedPost'
  });

  // Message -> Message (reply): Self-referential
  Message.belongsTo(Message, {
    foreignKey: 'replyToId',
    as: 'replyTo'
  });

  // Message -> MessageReaction: One-to-Many
  Message.hasMany(MessageReaction, {
    foreignKey: 'messageId',
    as: 'reactions',
    onDelete: 'CASCADE'
  });

  // MessageReaction -> Message: Many-to-One
  MessageReaction.belongsTo(Message, {
    foreignKey: 'messageId',
    as: 'message'
  });

  // MessageReaction -> User: Many-to-One
  MessageReaction.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // BlockedUser -> User (blocker): Many-to-One
  BlockedUser.belongsTo(User, {
    foreignKey: 'blockerId',
    as: 'blocker'
  });

  // BlockedUser -> User (blocked): Many-to-One
  BlockedUser.belongsTo(User, {
    foreignKey: 'blockedId',
    as: 'blocked'
  });

  // User -> BlockedUser (as blocker): One-to-Many
  User.hasMany(BlockedUser, {
    foreignKey: 'blockerId',
    as: 'blockedUsers',
    onDelete: 'CASCADE'
  });

  // User -> BlockedUser (as blocked): One-to-Many
  User.hasMany(BlockedUser, {
    foreignKey: 'blockedId',
    as: 'blockedByUsers',
    onDelete: 'CASCADE'
  });

  // ===== PHASE 3.3: COMMUNITY/TOPIC ASSOCIATIONS =====

  // Topic -> User (creator): Many-to-One
  Topic.belongsTo(User, {
    foreignKey: 'creatorId',
    as: 'creator'
  });

  // User -> Topic (created topics): One-to-Many
  User.hasMany(Topic, {
    foreignKey: 'creatorId',
    as: 'createdTopics',
    onDelete: 'SET NULL'
  });

  // TopicFollow -> User: Many-to-One
  TopicFollow.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // TopicFollow -> Topic: Many-to-One
  TopicFollow.belongsTo(Topic, {
    foreignKey: 'topicId',
    as: 'topic'
  });

  // User -> TopicFollow: One-to-Many
  User.hasMany(TopicFollow, {
    foreignKey: 'userId',
    as: 'topicFollows',
    onDelete: 'CASCADE'
  });

  // Topic -> TopicFollow: One-to-Many
  Topic.hasMany(TopicFollow, {
    foreignKey: 'topicId',
    as: 'topicFollows',
    onDelete: 'CASCADE'
  });

  // PostTopic -> Post: Many-to-One
  PostTopic.belongsTo(Post, {
    foreignKey: 'postId',
    as: 'post'
  });

  // PostTopic -> Topic: Many-to-One
  PostTopic.belongsTo(Topic, {
    foreignKey: 'topicId',
    as: 'topic'
  });

  // Post -> PostTopic: One-to-Many
  Post.hasMany(PostTopic, {
    foreignKey: 'postId',
    as: 'postTopics',
    onDelete: 'CASCADE'
  });

  // Topic -> PostTopic: One-to-Many
  Topic.hasMany(PostTopic, {
    foreignKey: 'topicId',
    as: 'postTopics',
    onDelete: 'CASCADE'
  });

  // Post <-> Topic: Many-to-Many through PostTopic
  Post.belongsToMany(Topic, {
    through: PostTopic,
    as: 'topics',
    foreignKey: 'postId',
    otherKey: 'topicId'
  });

  Topic.belongsToMany(Post, {
    through: PostTopic,
    as: 'posts',
    foreignKey: 'topicId',
    otherKey: 'postId'
  });

  // ===== TOPIC ADMIN ASSOCIATIONS =====

  // TopicAdmin -> User: Many-to-One
  TopicAdmin.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // TopicAdmin -> Topic: Many-to-One
  TopicAdmin.belongsTo(Topic, {
    foreignKey: 'topicId',
    as: 'topic'
  });

  // User -> TopicAdmin: One-to-Many
  User.hasMany(TopicAdmin, {
    foreignKey: 'userId',
    as: 'topicAdminRoles',
    onDelete: 'CASCADE'
  });

  // Topic -> TopicAdmin: One-to-Many
  Topic.hasMany(TopicAdmin, {
    foreignKey: 'topicId',
    as: 'admins',
    onDelete: 'CASCADE'
  });

  // UserFavorite -> User (who favorites): Many-to-One
  UserFavorite.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // UserFavorite -> User (favorited): Many-to-One
  UserFavorite.belongsTo(User, {
    foreignKey: 'favoriteUserId',
    as: 'favoriteUser'
  });

  // User -> UserFavorite (my favorites): One-to-Many
  User.hasMany(UserFavorite, {
    foreignKey: 'userId',
    as: 'favorites',
    onDelete: 'CASCADE'
  });

  // User -> UserFavorite (favorited by): One-to-Many
  User.hasMany(UserFavorite, {
    foreignKey: 'favoriteUserId',
    as: 'favoritedBy',
    onDelete: 'CASCADE'
  });

  // UserTopicStatus -> User: Many-to-One
  UserTopicStatus.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // UserTopicStatus -> Topic: Many-to-One
  UserTopicStatus.belongsTo(Topic, {
    foreignKey: 'topicId',
    as: 'topic'
  });

  // User -> UserTopicStatus: One-to-Many
  User.hasMany(UserTopicStatus, {
    foreignKey: 'userId',
    as: 'topicStatuses',
    onDelete: 'CASCADE'
  });

  // Topic -> UserTopicStatus: One-to-Many
  Topic.hasMany(UserTopicStatus, {
    foreignKey: 'topicId',
    as: 'userStatuses',
    onDelete: 'CASCADE'
  });

  // EncouragementStreak -> User: Many-to-One
  EncouragementStreak.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // EncouragementStreak -> Topic: Many-to-One
  EncouragementStreak.belongsTo(Topic, {
    foreignKey: 'topicId',
    as: 'topic'
  });

  // User -> EncouragementStreak: One-to-Many
  User.hasMany(EncouragementStreak, {
    foreignKey: 'userId',
    as: 'encouragementStreaks',
    onDelete: 'CASCADE'
  });

  // Topic -> EncouragementStreak: One-to-Many
  Topic.hasMany(EncouragementStreak, {
    foreignKey: 'topicId',
    as: 'encouragementStreaks',
    onDelete: 'CASCADE'
  });

  // UserCommunityMedal -> User: Many-to-One
  UserCommunityMedal.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // UserCommunityMedal -> Topic: Many-to-One
  UserCommunityMedal.belongsTo(Topic, {
    foreignKey: 'topicId',
    as: 'topic'
  });

  // User -> UserCommunityMedal: One-to-Many
  User.hasMany(UserCommunityMedal, {
    foreignKey: 'userId',
    as: 'communityMedals',
    onDelete: 'CASCADE'
  });

  // Topic -> UserCommunityMedal: One-to-Many
  Topic.hasMany(UserCommunityMedal, {
    foreignKey: 'topicId',
    as: 'communityMedals',
    onDelete: 'CASCADE'
  });

  // UserGlobalMedal -> User: Many-to-One
  UserGlobalMedal.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // User -> UserGlobalMedal: One-to-Many
  User.hasMany(UserGlobalMedal, {
    foreignKey: 'userId',
    as: 'globalMedals',
    onDelete: 'CASCADE'
  });

  // CoinTransaction -> Topic (for topic-specific coins): Many-to-One
  CoinTransaction.belongsTo(Topic, {
    foreignKey: 'topicId',
    as: 'topic'
  });

  // Topic -> CoinTransaction: One-to-Many
  Topic.hasMany(CoinTransaction, {
    foreignKey: 'topicId',
    as: 'coinTransactions',
    onDelete: 'SET NULL'
  });

  // ===== TRUST SCORE ASSOCIATIONS =====

  // FriendTrust -> User (userA): Many-to-One
  FriendTrust.belongsTo(User, {
    foreignKey: 'userIdA',
    as: 'userA'
  });

  // FriendTrust -> User (userB): Many-to-One
  FriendTrust.belongsTo(User, {
    foreignKey: 'userIdB',
    as: 'userB'
  });

  // User -> FriendTrust (as userA): One-to-Many
  User.hasMany(FriendTrust, {
    foreignKey: 'userIdA',
    as: 'trustConnectionsAsA',
    onDelete: 'CASCADE'
  });

  // User -> FriendTrust (as userB): One-to-Many
  User.hasMany(FriendTrust, {
    foreignKey: 'userIdB',
    as: 'trustConnectionsAsB',
    onDelete: 'CASCADE'
  });

  // FriendTrust -> FriendTrustDailyLog: One-to-Many
  FriendTrust.hasMany(FriendTrustDailyLog, {
    foreignKey: 'friendTrustId',
    as: 'dailyLogs',
    onDelete: 'CASCADE'
  });

  // FriendTrustDailyLog -> FriendTrust: Many-to-One
  FriendTrustDailyLog.belongsTo(FriendTrust, {
    foreignKey: 'friendTrustId',
    as: 'friendTrust'
  });
};
