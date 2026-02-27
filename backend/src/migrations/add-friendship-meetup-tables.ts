import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-friendship-meetup-tables');

  // Create friendship_sessions table
  await queryInterface.createTable('friendship_sessions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    host_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    guest_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL'
    },
    invite_code: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    host_lat: { type: DataTypes.FLOAT, allowNull: true },
    host_lng: { type: DataTypes.FLOAT, allowNull: true },
    guest_lat: { type: DataTypes.FLOAT, allowNull: true },
    guest_lng: { type: DataTypes.FLOAT, allowNull: true },
    assigned_poses: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON array of 4 pose names'
    },
    current_pose_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    expires_at: {
      type: DataTypes.DATE,
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

  // Create friendship_meetups table
  await queryInterface.createTable('friendship_meetups', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'friendship_sessions', key: 'id' },
      onDelete: 'CASCADE'
    },
    user_a_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'Canonical ordering: smaller UUID'
    },
    user_b_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      comment: 'Canonical ordering: larger UUID'
    },
    location_name: { type: DataTypes.STRING(255), allowNull: true },
    lat: { type: DataTypes.FLOAT, allowNull: true },
    lng: { type: DataTypes.FLOAT, allowNull: true },
    photo_strip_url: { type: DataTypes.STRING(500), allowNull: true },
    coins_awarded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  // Create friendship_photos table
  await queryInterface.createTable('friendship_photos', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    meetup_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'friendship_meetups', key: 'id' },
      onDelete: 'CASCADE'
    },
    pose_index: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    pose_name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    photo_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    pose_validated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    validation_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  // Add coinsFromMeetups to positivity_coins
  try {
    await queryInterface.addColumn('positivity_coins', 'coins_from_meetups', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Coins earned from friendship meetups'
    });
  } catch (error) {
    logger.info('coins_from_meetups column may already exist');
  }

  // Add indexes
  try {
    await queryInterface.addIndex('friendship_sessions', ['invite_code'], {
      unique: true,
      name: 'idx_friendship_sessions_invite_code'
    });
  } catch (error) {
    logger.info('idx_friendship_sessions_invite_code may already exist');
  }

  try {
    await queryInterface.addIndex('friendship_sessions', ['host_user_id'], {
      name: 'idx_friendship_sessions_host'
    });
  } catch (error) {
    logger.info('idx_friendship_sessions_host may already exist');
  }

  try {
    await queryInterface.addIndex('friendship_meetups', ['user_a_id', 'user_b_id'], {
      name: 'idx_friendship_meetups_pair'
    });
  } catch (error) {
    logger.info('idx_friendship_meetups_pair may already exist');
  }

  logger.info('Migration completed: add-friendship-meetup-tables');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-friendship-meetup-tables');

  await queryInterface.dropTable('friendship_photos');
  await queryInterface.dropTable('friendship_meetups');
  await queryInterface.dropTable('friendship_sessions');

  try {
    await queryInterface.removeColumn('positivity_coins', 'coins_from_meetups');
  } catch (error) {
    logger.info('coins_from_meetups column may not exist');
  }

  logger.info('Rollback completed: add-friendship-meetup-tables');
}
