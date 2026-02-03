import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

/**
 * Migration to create friend trust tables for trust score system
 * Trust connections are created by coin exchanges between users
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-friend-trust-tables');

  // Create friend_trusts table
  await queryInterface.createTable('friend_trusts', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id_a: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Lexicographically smaller user ID'
    },
    user_id_b: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Lexicographically larger user ID'
    },
    current_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Consecutive days with any exchange'
    },
    longest_streak: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Best streak ever achieved'
    },
    last_exchange_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Last day coins were exchanged'
    },
    total_exchange_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total unique days with exchanges'
    },
    total_coins_a_to_b: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cumulative coins A sent to B'
    },
    total_coins_b_to_a: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cumulative coins B sent to A'
    },
    exchange_count_a_to_b: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of transactions A to B'
    },
    exchange_count_b_to_a: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of transactions B to A'
    },
    bidirectional_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Days where BOTH users exchanged'
    },
    trust_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cached trust score (0-100)'
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

  // Add unique constraint for user pair (canonical ordering)
  try {
    await queryInterface.addIndex('friend_trusts', ['user_id_a', 'user_id_b'], {
      unique: true,
      name: 'idx_friend_trust_user_pair_unique'
    });
  } catch (error) {
    logger.info('idx_friend_trust_user_pair_unique index may already exist');
  }

  // Add indexes for querying by user
  try {
    await queryInterface.addIndex('friend_trusts', ['user_id_a'], {
      name: 'idx_friend_trusts_user_a'
    });
  } catch (error) {
    logger.info('idx_friend_trusts_user_a index may already exist');
  }

  try {
    await queryInterface.addIndex('friend_trusts', ['user_id_b'], {
      name: 'idx_friend_trusts_user_b'
    });
  } catch (error) {
    logger.info('idx_friend_trusts_user_b index may already exist');
  }

  // Add index for trust score (for leaderboards)
  try {
    await queryInterface.addIndex('friend_trusts', ['trust_score'], {
      name: 'idx_friend_trusts_score'
    });
  } catch (error) {
    logger.info('idx_friend_trusts_score index may already exist');
  }

  // Create friend_trust_daily_logs table
  await queryInterface.createTable('friend_trust_daily_logs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    friend_trust_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'friend_trusts',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'FK to friend_trusts'
    },
    log_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'The date of this log entry'
    },
    coins_a_to_b: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Coins A sent to B that day'
    },
    coins_b_to_a: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Coins B sent to A that day'
    },
    is_bidirectional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Both directions had activity'
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

  // Add unique constraint for trust + date
  try {
    await queryInterface.addIndex('friend_trust_daily_logs', ['friend_trust_id', 'log_date'], {
      unique: true,
      name: 'idx_friend_trust_daily_log_unique'
    });
  } catch (error) {
    logger.info('idx_friend_trust_daily_log_unique index may already exist');
  }

  // Add index for querying by date
  try {
    await queryInterface.addIndex('friend_trust_daily_logs', ['log_date'], {
      name: 'idx_friend_trust_daily_logs_date'
    });
  } catch (error) {
    logger.info('idx_friend_trust_daily_logs_date index may already exist');
  }

  logger.info('Migration completed: add-friend-trust-tables');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-friend-trust-tables');

  // Drop daily logs table first (has FK to friend_trusts)
  await queryInterface.dropTable('friend_trust_daily_logs');

  // Drop friend_trusts table
  await queryInterface.dropTable('friend_trusts');

  logger.info('Rollback completed: add-friend-trust-tables');
}
