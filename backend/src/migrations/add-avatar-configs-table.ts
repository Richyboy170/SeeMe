import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    logger.info('Starting migration: add-avatar-configs-table');

    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('avatar_configs');

    if (!tableExists) {
      logger.info('Creating avatar_configs table');

      // First, ensure the enum type exists
      try {
        await queryInterface.sequelize.query(`
          DO $$ BEGIN
            CREATE TYPE "enum_avatar_configs_style" AS ENUM ('cartoon', 'anime', 'minimalist');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;
        `);
      } catch (e) {
        // Enum might already exist, that's ok
      }

      await queryInterface.createTable('avatar_configs', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        style: {
          type: DataTypes.ENUM('cartoon', 'anime', 'minimalist'),
          allowNull: false,
          defaultValue: 'cartoon',
        },
        skin_tone: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: '#FFDBAC',
        },
        eye_color: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: '#8B4513',
        },
        eye_size: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 1.0,
        },
        hair_color: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: '#000000',
        },
        hair_style: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'short',
        },
        glasses: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: null,
        },
        hat: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: null,
        },
        earrings: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: null,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });
      logger.info('avatar_configs table created successfully');
    } else {
      logger.info('avatar_configs table already exists, skipping');
    }

    // Add indexes only if they don't exist
    try {
      const indexes = await queryInterface.showIndex('avatar_configs') as any[];
      const indexNames = indexes.map((idx: any) => idx.name);

      if (!indexNames.includes('avatar_configs_user_id')) {
        await queryInterface.addIndex('avatar_configs', ['user_id']);
        logger.info('Added index avatar_configs_user_id');
      }

      if (!indexNames.includes('avatar_configs_user_id_is_active')) {
        await queryInterface.addIndex('avatar_configs', ['user_id', 'is_active']);
        logger.info('Added index avatar_configs_user_id_is_active');
      }
    } catch (e) {
      // Indexes might already exist or table issues - that's ok
      logger.info('Indexes already exist or could not be verified, skipping');
    }

    logger.info('Migration completed successfully: add-avatar-configs-table');
  } catch (error) {
    logger.error('Migration failed: add-avatar-configs-table', { error });
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('avatar_configs');
}
