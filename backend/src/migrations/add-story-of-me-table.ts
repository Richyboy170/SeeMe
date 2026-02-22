import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add the story_of_me table.
 * Stores auto-generated "Story of Me" summaries for user profiles.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    // Check if table already exists
    try {
      await queryInterface.describeTable('story_of_me');
      console.log('story_of_me table already exists, skipping');
    } catch {
      await queryInterface.createTable('story_of_me', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
        },
        period_type: {
          type: DataTypes.STRING(10),
          allowNull: false,
        },
        period_start: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        period_end: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        title: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        stats: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        caption_excerpts: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: '[]',
        },
        is_published: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
      console.log('Created story_of_me table');
    }

    // Add unique index to prevent duplicate stories
    try {
      await queryInterface.addIndex('story_of_me', ['user_id', 'period_type', 'period_start'], {
        unique: true,
        name: 'story_of_me_user_period_unique',
      });
      console.log('Added unique index on story_of_me (user_id, period_type, period_start)');
    } catch {
      console.log('Unique index on story_of_me already exists, skipping');
    }

    // Add user_id index for faster lookups
    try {
      await queryInterface.addIndex('story_of_me', ['user_id'], {
        name: 'story_of_me_user_id_idx',
      });
      console.log('Added user_id index on story_of_me');
    } catch {
      console.log('user_id index on story_of_me already exists, skipping');
    }
  } catch (error) {
    console.error('Migration add-story-of-me-table failed:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.dropTable('story_of_me');
    console.log('Dropped story_of_me table');
  } catch (error) {
    console.error('Rollback add-story-of-me-table failed:', error);
  }
}
