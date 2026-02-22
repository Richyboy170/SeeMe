import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add `collected` flag to coin_transactions table.
 *
 * Sky Coins from other users are now deferred — they stay as "uncollected"
 * until the receiver taps the heart in the Encouragement modal.
 *
 * - Adds `collected` BOOLEAN column (default false) to coin_transactions
 * - Backfills all existing `received_from_user` rows as collected = true
 *   (they were already credited to skyCoins)
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableInfo = await queryInterface.describeTable('coin_transactions');

    if (!tableInfo['collected']) {
      await queryInterface.addColumn('coin_transactions', 'collected', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
      console.log('Added collected column to coin_transactions');

      // Backfill: mark all existing received_from_user transactions as collected
      // since those coins were already credited to the receiver's skyCoins balance
      await queryInterface.sequelize.query(
        `UPDATE coin_transactions SET collected = true WHERE transaction_type = 'received_from_user'`
      );
      console.log('Backfilled existing received_from_user transactions as collected');
    } else {
      console.log('collected column already exists, skipping');
    }
  } catch (error) {
    console.error('Migration add-coin-collected-flag failed:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableInfo = await queryInterface.describeTable('coin_transactions');

    if (tableInfo['collected']) {
      await queryInterface.removeColumn('coin_transactions', 'collected');
      console.log('Removed collected column from coin_transactions');
    }
  } catch (error) {
    console.error('Rollback add-coin-collected-flag failed:', error);
  }
}
