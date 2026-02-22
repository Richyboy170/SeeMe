import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add Sky Coins - a separate currency for coins received from other users.
 * "Positivity from others can make us fly in the sky"
 *
 * - Adds sky_coins column (coins received from other people)
 * - Adds lifetime_sky_coins_earned column
 * - Backfills sky_coins from existing coins_from_other
 * - Subtracts coins_from_other from total_coins so it only reflects activity-earned coins
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableInfo = await queryInterface.describeTable('positivity_coins');

    // Add sky_coins column if not exists
    if (!tableInfo['sky_coins']) {
      await queryInterface.addColumn('positivity_coins', 'sky_coins', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
      console.log('Added sky_coins column to positivity_coins');
    } else {
      console.log('sky_coins column already exists, skipping');
    }

    // Add lifetime_sky_coins_earned column if not exists
    if (!tableInfo['lifetime_sky_coins_earned']) {
      await queryInterface.addColumn('positivity_coins', 'lifetime_sky_coins_earned', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      });
      console.log('Added lifetime_sky_coins_earned column to positivity_coins');
    } else {
      console.log('lifetime_sky_coins_earned column already exists, skipping');
    }

    // Backfill: move coins_from_other into sky_coins and subtract from total_coins
    if (!tableInfo['sky_coins']) {
      // Only backfill on first run (when column was just added)
      await queryInterface.sequelize.query(
        `UPDATE positivity_coins SET sky_coins = coins_from_other, lifetime_sky_coins_earned = coins_from_other, total_coins = MAX(total_coins - coins_from_other, 0) WHERE coins_from_other > 0`
      );
      console.log('Backfilled sky_coins from coins_from_other and adjusted total_coins');
    }
  } catch (error) {
    console.error('Migration add-sky-coins failed:', error);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableInfo = await queryInterface.describeTable('positivity_coins');

    // Restore total_coins before removing sky_coins
    if (tableInfo['sky_coins']) {
      await queryInterface.sequelize.query(
        `UPDATE positivity_coins SET total_coins = total_coins + sky_coins WHERE sky_coins > 0`
      );
      await queryInterface.removeColumn('positivity_coins', 'sky_coins');
      console.log('Removed sky_coins column and restored total_coins');
    }

    if (tableInfo['lifetime_sky_coins_earned']) {
      await queryInterface.removeColumn('positivity_coins', 'lifetime_sky_coins_earned');
      console.log('Removed lifetime_sky_coins_earned column');
    }
  } catch (error) {
    console.error('Rollback add-sky-coins failed:', error);
  }
}
