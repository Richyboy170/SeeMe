import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add isArchived column to posts table
 * Allows users to archive posts (hide from feeds) without deleting them
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableInfo = await queryInterface.describeTable('posts');

    if (!tableInfo['isArchived'] && !tableInfo['is_archived']) {
      await queryInterface.addColumn('posts', 'isArchived', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      console.log('Added isArchived column to posts table');
    } else {
      console.log('isArchived column already exists, skipping');
    }
  } catch (error) {
    console.error('Migration add-post-archive failed:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.removeColumn('posts', 'isArchived');
  } catch (error) {
    console.error('Rollback add-post-archive failed:', error);
  }
}
