import { User } from './User';
import { Post } from './Post';
import { Follow } from './Follow';
import { Like } from './Like';
import { Comment } from './Comment';
import { PositivityCoins } from './PositivityCoins';
import { CoinTransaction } from './CoinTransaction';
import { CoinGivingActivity } from './CoinGivingActivity';
import { Conversation } from './Conversation';
import { Message } from './Message';
import { BlockedUser } from './BlockedUser';

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
};
