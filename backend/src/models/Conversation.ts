import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Conversation attributes interface
 */
export interface ConversationAttributes {
  id: string;
  user1Id: string;
  user2Id: string;
  lastMessageId: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional attributes for conversation creation
 */
interface ConversationCreationAttributes extends Optional<ConversationAttributes, 'id' | 'lastMessageId' | 'lastMessageAt' | 'createdAt' | 'updatedAt'> {}

/**
 * Conversation model representing a chat between two users
 */
export class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> implements ConversationAttributes {
  public id!: string;
  public user1Id!: string;
  public user2Id!: string;
  public lastMessageId!: string | null;
  public lastMessageAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique conversation identifier'
    },
    user1Id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'First participant user ID'
    },
    user2Id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Second participant user ID'
    },
    lastMessageId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      comment: 'ID of the last message in conversation'
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp of last message'
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
    tableName: 'conversations',
    timestamps: true,
    // Temporarily disable indexes for SQLite compatibility
    // indexes: [
    //   {
    //     fields: ['user_1_id', 'updated_at']
    //   },
    //   {
    //     fields: ['user_2_id', 'updated_at']
    //   },
    //   {
    //     fields: ['last_message_at']
    //   },
    //   {
    //     unique: true,
    //     fields: ['user_1_id', 'user_2_id'],
    //     name: 'conversation_users_unique'
    //   }
    // ]
  }
);

export default Conversation;
