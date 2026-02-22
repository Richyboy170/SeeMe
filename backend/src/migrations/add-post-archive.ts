import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add is_archived column to posts table
 * Allows users to archive posts (hide from feeds) without deleting them
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    // Clean up any leftover backup table from a failed previous rename attempt
    try {
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS `posts_backup`');
    } catch (e) {
      // ignore
    }

    const tableInfo = await queryInterface.describeTable('posts');

    if (tableInfo['is_archived']) {
      console.log('is_archived column already exists, skipping');
      return;
    }

    if (tableInfo['isArchived']) {
      // Column exists with wrong name (camelCase instead of snake_case).
      // Use raw SQL to rename — SQLite 3.25.0+ supports ALTER TABLE RENAME COLUMN
      await queryInterface.sequelize.query(
        'ALTER TABLE `posts` RENAME COLUMN `isArchived` TO `is_archived`'
      );
      console.log('Renamed isArchived column to is_archived');
    } else {
      // Column doesn't exist at all — add it with the correct snake_case name
      await queryInterface.addColumn('posts', 'is_archived', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log('Added is_archived column to posts table');
    }
  } catch (error) {
    console.error('Migration add-post-archive failed:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.removeColumn('posts', 'is_archived');
  } catch (error) {
    console.error('Rollback add-post-archive failed:', error);
  }
}
