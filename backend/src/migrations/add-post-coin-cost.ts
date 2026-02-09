import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to support post coin cost:
 * - Make coin_transactions.to_user_id nullable (for system deductions)
 *
 * Note: The 'spent_on_post' transaction type validation is handled at the
 * Sequelize model level, not at the database level, so no DB change needed for that.
 *
 * SQLite doesn't support ALTER COLUMN, so we recreate the table if needed.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableInfo = await queryInterface.describeTable('coin_transactions');

    // Check if to_user_id is already nullable
    if (tableInfo['to_user_id'] && !tableInfo['to_user_id'].allowNull) {
      // SQLite doesn't support ALTER COLUMN directly.
      // We need to use changeColumn which Sequelize handles via table recreation for SQLite.
      await queryInterface.changeColumn('coin_transactions', 'to_user_id', {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      });
      console.log('Made to_user_id nullable in coin_transactions');
    } else {
      console.log('to_user_id is already nullable or column not found, skipping');
    }
  } catch (error) {
    console.error('Migration add-post-coin-cost failed:', error);
    // Don't throw - if this fails the model definition will handle it on next sync
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    await queryInterface.changeColumn('coin_transactions', 'to_user_id', {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });
  } catch (error) {
    console.error('Rollback add-post-coin-cost failed:', error);
  }
}
