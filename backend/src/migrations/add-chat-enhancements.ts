import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add chat enhancement fields:
 * - messages: is_unsent, reply_to_id, duration, waveform
 * - message_reactions table
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add missing columns to messages table
  const tableInfo = await queryInterface.describeTable('messages');

  if (!tableInfo['is_unsent']) {
    await queryInterface.addColumn('messages', 'is_unsent', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }

  if (!tableInfo['reply_to_id']) {
    await queryInterface.addColumn('messages', 'reply_to_id', {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'messages',
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  }

  if (!tableInfo['duration']) {
    await queryInterface.addColumn('messages', 'duration', {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null
    });
  }

  if (!tableInfo['waveform']) {
    await queryInterface.addColumn('messages', 'waveform', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });
  }

  // Create message_reactions table
  const tables = await queryInterface.showAllTables();
  if (!tables.includes('message_reactions')) {
    await queryInterface.createTable('message_reactions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      message_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'messages',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      emoji: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('message_reactions');
  await queryInterface.removeColumn('messages', 'is_unsent');
  await queryInterface.removeColumn('messages', 'reply_to_id');
  await queryInterface.removeColumn('messages', 'duration');
  await queryInterface.removeColumn('messages', 'waveform');
}
