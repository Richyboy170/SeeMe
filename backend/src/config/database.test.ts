/**
 * Test Database Configuration
 * Uses the main sequelize instance which will be SQLite in test mode
 */

import { sequelize } from './database';

let isSetup = false;

export const setupTestDatabase = async () => {
  if (!isSetup) {
    // Don't setup associations in tests - they cause index conflicts
    // Just sync the database schema
    try {
      await sequelize.sync();
      isSetup = true;
    } catch (error) {
      console.error('Database sync error:', error);
      throw error;
    }
  } else {
    // Subsequent setups - truncate all tables
    await clearTestDatabase();
  }
  return sequelize;
};

export const cleanupTestDatabase = async () => {
  // Don't close in tests - causes issues with subsequent tests
  // await sequelize.close();
};

export const clearTestDatabase = async () => {
  // Truncate all tables instead of dropping and recreating
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();

  for (const table of tables) {
    try {
      await sequelize.query(`DELETE FROM "${table}";`);
    } catch (error) {
      // Ignore errors for tables that can't be truncated
    }
  }
};

export const getTestDatabase = () => {
  return sequelize;
};
