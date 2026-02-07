import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Message attributes interface
 */
export interface MessageAttributes {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  messageType: 'text' | 'image' | 'gif' | 'voice' | 'post_share' | 'system';
  content: string | null;
  mediaUrl: string | null;
  sharedPostId: string | null;
  replyToId: string | null;
  isRead: boolean;
  readAt: Date | null;
  isDeletedBySender: boolean;
  isDeletedByReceiver: boolean;
  isUnsent: boolean;
  // Image message fields
  imageViewMode: 'keep' | 'view_once' | 'time_bomb' | null;
  viewedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
  // Voice message fields
  duration: number | null;
  waveform: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for message creation
 */
interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'content' | 'mediaUrl' | 'sharedPostId' | 'replyToId' | 'isRead' | 'readAt' | 'isDeletedBySender' | 'isDeletedByReceiver' | 'isUnsent' | 'imageViewMode' | 'viewedAt' | 'expiresAt' | 'isExpired' | 'duration' | 'waveform' | 'createdAt' | 'updatedAt'> {}

/**
 * Message model representing a chat message
 */
export class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: string;
  public conversationId!: string;
  public senderId!: string;
  public receiverId!: string;
  public messageType!: 'text' | 'image' | 'gif' | 'voice' | 'post_share' | 'system';
  public content!: string | null;
  public mediaUrl!: string | null;
  public sharedPostId!: string | null;
  public replyToId!: string | null;
  public isRead!: boolean;
  public readAt!: Date | null;
  public isDeletedBySender!: boolean;
  public isDeletedByReceiver!: boolean;
  public isUnsent!: boolean;
  // Image message fields
  public imageViewMode!: 'keep' | 'view_once' | 'time_bomb' | null;
  public viewedAt!: Date | null;
  public expiresAt!: Date | null;
  public isExpired!: boolean;
  // Voice message fields
  public duration!: number | null;
  public waveform!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique message identifier'
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the conversation this message belongs to'
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who sent the message'
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'ID of the user who receives the message'
    },
    messageType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'text',
      validate: {
        isIn: {
          args: [['text', 'image', 'gif', 'voice', 'post_share', 'system']],
          msg: 'Invalid message type'
        }
      },
      comment: 'Type of message: text, image, gif, voice, post_share, or system'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Text content of the message'
    },
    mediaUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'URL for image messages'
    },
    sharedPostId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'ID of shared post if message type is post_share'
    },
    replyToId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'messages',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'ID of the message being replied to'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the message has been read'
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp when message was read'
    },
    isDeletedBySender: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether sender has deleted this message'
    },
    isDeletedByReceiver: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether receiver has deleted this message'
    },
    isUnsent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the message has been unsent by the sender'
    },
    imageViewMode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
      validate: {
        isIn: {
          args: [['keep', 'view_once', 'time_bomb', null]],
          msg: 'Invalid image view mode'
        }
      },
      comment: 'View mode for image messages: keep, view_once, or time_bomb'
    },
    viewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp when view_once image was viewed'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Expiration time for time_bomb images'
    },
    isExpired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the image message has expired'
    },
    duration: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
      comment: 'Duration of voice message in seconds'
    },
    waveform: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'Waveform amplitude data for voice messages (JSON string)'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
    // Temporarily disable indexes for SQLite compatibility
    // indexes: [
    //   {
    //     fields: ['conversation_id', 'created_at']
    //   },
    //   {
    //     fields: ['sender_id', 'created_at']
    //   },
    //   {
    //     fields: ['receiver_id', 'created_at']
    //   },
    //   {
    //     fields: ['receiver_id', 'is_read'],
    //     where: {
    //       is_read: false
    //     }
    //   }
    // ]
  }
);

export default Message;
