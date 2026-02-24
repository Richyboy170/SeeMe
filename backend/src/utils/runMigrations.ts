import { sequelize } from '../config/database';
import { logger } from './logger';
import * as addFcmFields from '../migrations/add-fcm-fields';
import * as addImageMessageFields from '../migrations/add-image-message-fields';
import * as addUserInteractionsTable from '../migrations/add-user-interactions-table';
import * as addAvatarConfigsTable from '../migrations/add-avatar-configs-table';
import * as addPrivacySettings from '../migrations/add-privacy-settings';
import * as addFullBodyAvatarsTable from '../migrations/add-full-body-avatars-table';
import * as addPhase33CommunityTables from '../migrations/add-phase-3-3-community-tables';
import * as addSavedPostsTable from '../migrations/add-saved-posts-table';
import * as addRepostsTable from '../migrations/add-reposts-table';
import * as addFriendTrustTables from '../migrations/add-friend-trust-tables';
import * as addTopicAdminsAndIconImage from '../migrations/add-topic-admins-and-icon-image';
import * as addChatEnhancements from '../migrations/add-chat-enhancements';
import * as addPostCoinCost from '../migrations/add-post-coin-cost';
import * as addPostArchive from '../migrations/add-post-archive';
import * as addTopicSearchKeywords from '../migrations/add-topic-search-keywords';
import * as addSkyCoins from '../migrations/add-sky-coins';
import * as addDecorationStore from '../migrations/add-decoration-store';
import * as addStoryOfMeTable from '../migrations/add-story-of-me-table';
import * as addCoinCollectedFlag from '../migrations/add-coin-collected-flag';
import * as addAvatarUrl from '../migrations/add-avatar-url';
import * as addPostLocationTime from '../migrations/add-post-location-time';
import * as addAvatarGenderFields from '../migrations/add-avatar-gender-fields';

/**
 * Run database migrations
 * This script runs all pending migrations in order
 */

const migrations = [
  {
    name: 'add-fcm-fields',
    up: addFcmFields.up,
    down: addFcmFields.down
  },
  {
    name: 'add-image-message-fields',
    up: addImageMessageFields.up,
    down: addImageMessageFields.down
  },
  {
    name: 'add-user-interactions-table',
    up: addUserInteractionsTable.up,
    down: addUserInteractionsTable.down
  },
  {
    name: 'add-avatar-configs-table',
    up: addAvatarConfigsTable.up,
    down: addAvatarConfigsTable.down
  },
  {
    name: 'add-privacy-settings',
    up: addPrivacySettings.up,
    down: addPrivacySettings.down
  },
  {
    name: 'add-full-body-avatars-table',
    up: addFullBodyAvatarsTable.up,
    down: addFullBodyAvatarsTable.down
  },
  {
    name: 'add-phase-3-3-community-tables',
    up: addPhase33CommunityTables.up,
    down: addPhase33CommunityTables.down
  },
  {
    name: 'add-saved-posts-table',
    up: addSavedPostsTable.up,
    down: addSavedPostsTable.down
  },
  {
    name: 'add-reposts-table',
    up: addRepostsTable.up,
    down: addRepostsTable.down
  },
  {
    name: 'add-friend-trust-tables',
    up: addFriendTrustTables.up,
    down: addFriendTrustTables.down
  },
  {
    name: 'add-topic-admins-and-icon-image',
    up: addTopicAdminsAndIconImage.up,
    down: addTopicAdminsAndIconImage.down
  },
  {
    name: 'add-chat-enhancements',
    up: addChatEnhancements.up,
    down: addChatEnhancements.down
  },
  {
    name: 'add-post-coin-cost',
    up: addPostCoinCost.up,
    down: addPostCoinCost.down
  },
  {
    name: 'add-post-archive',
    up: addPostArchive.up,
    down: addPostArchive.down
  },
  {
    name: 'add-topic-search-keywords',
    up: addTopicSearchKeywords.up,
    down: addTopicSearchKeywords.down
  },
  {
    name: 'add-sky-coins',
    up: addSkyCoins.up,
    down: addSkyCoins.down
  },
  {
    name: 'add-decoration-store',
    up: addDecorationStore.up,
    down: addDecorationStore.down
  },
  {
    name: 'add-story-of-me-table',
    up: addStoryOfMeTable.up,
    down: addStoryOfMeTable.down
  },
  {
    name: 'add-coin-collected-flag',
    up: addCoinCollectedFlag.up,
    down: addCoinCollectedFlag.down
  },
  {
    name: 'add-avatar-url',
    up: addAvatarUrl.up,
    down: addAvatarUrl.down
  },
  {
    name: 'add-post-location-time',
    up: addPostLocationTime.up,
    down: addPostLocationTime.down
  },
  {
    name: 'add-avatar-gender-fields',
    up: addAvatarGenderFields.up,
    down: addAvatarGenderFields.down
  }
  // Add more migrations here as needed
];

export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Starting database migrations');

    const queryInterface = sequelize.getQueryInterface();

    // Run each migration
    for (const migration of migrations) {
      try {
        logger.info(`Running migration: ${migration.name}`);
        await migration.up(queryInterface);
        logger.info(`Migration completed: ${migration.name}`);
      } catch (error) {
        logger.error(`Migration failed: ${migration.name}`, { error });
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration process failed', { error });
    throw error;
  }
};

export const rollbackMigrations = async (): Promise<void> => {
  try {
    logger.info('Starting migration rollback');

    const queryInterface = sequelize.getQueryInterface();

    // Rollback migrations in reverse order
    for (let i = migrations.length - 1; i >= 0; i--) {
      const migration = migrations[i];
      try {
        logger.info(`Rolling back migration: ${migration.name}`);
        await migration.down(queryInterface);
        logger.info(`Rollback completed: ${migration.name}`);
      } catch (error) {
        logger.error(`Rollback failed: ${migration.name}`, { error });
        throw error;
      }
    }

    logger.info('All migrations rolled back successfully');
  } catch (error) {
    logger.error('Rollback process failed', { error });
    throw error;
  }
};

// Allow running from command line
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established');

      if (command === 'up') {
        await runMigrations();
      } else if (command === 'down') {
        await rollbackMigrations();
      } else {
        logger.info('Usage: ts-node runMigrations.ts [up|down]');
        logger.info('  up   - Run all pending migrations');
        logger.info('  down - Rollback all migrations');
      }

      await sequelize.close();
      process.exit(0);
    } catch (error) {
      logger.error('Migration script error', { error });
      await sequelize.close();
      process.exit(1);
    }
  })();
}
