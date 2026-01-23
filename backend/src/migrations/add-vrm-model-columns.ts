/**
 * Migration: Add VRM model columns to full_body_avatars table
 * Phase 3.1.3: Full Integration
 *
 * Adds:
 * - model_id: VRM model identifier (e.g., 'avatar_sakura')
 * - skin_color, hair_color, eye_color: Hex color strings for VRM customization
 * - hair_color_index, eye_color_index: Renamed legacy index columns
 */

import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Add model_id column
    await queryInterface.addColumn(
      'full_body_avatars',
      'model_id',
      {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'avatar_sakura',
      },
      { transaction }
    );

    // Add skin_color column (hex string)
    await queryInterface.addColumn(
      'full_body_avatars',
      'skin_color',
      {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: '#FFE0BD',
      },
      { transaction }
    );

    // Check if hair_color exists as INTEGER and rename to hair_color_index
    const tableDescription = await queryInterface.describeTable('full_body_avatars');

    if (tableDescription.hair_color && tableDescription.hair_color.type === 'INTEGER') {
      // Rename hair_color to hair_color_index
      await queryInterface.renameColumn(
        'full_body_avatars',
        'hair_color',
        'hair_color_index',
        { transaction }
      );

      // Add new hair_color as STRING
      await queryInterface.addColumn(
        'full_body_avatars',
        'hair_color',
        {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: '#2C1810',
        },
        { transaction }
      );
    }

    if (tableDescription.eye_color && tableDescription.eye_color.type === 'INTEGER') {
      // Rename eye_color to eye_color_index
      await queryInterface.renameColumn(
        'full_body_avatars',
        'eye_color',
        'eye_color_index',
        { transaction }
      );

      // Add new eye_color as STRING
      await queryInterface.addColumn(
        'full_body_avatars',
        'eye_color',
        {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: '#4A3728',
        },
        { transaction }
      );
    }

    await transaction.commit();
    logger.info('Migration complete: Added VRM model columns to full_body_avatars');
  } catch (error) {
    await transaction.rollback();
    logger.error('Migration failed: add-vrm-model-columns', error);
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    // Remove the new columns
    await queryInterface.removeColumn('full_body_avatars', 'model_id', { transaction });
    await queryInterface.removeColumn('full_body_avatars', 'skin_color', { transaction });

    // Check and revert hair_color changes
    const tableDescription = await queryInterface.describeTable('full_body_avatars');

    if (tableDescription.hair_color_index) {
      await queryInterface.removeColumn('full_body_avatars', 'hair_color', { transaction });
      await queryInterface.renameColumn(
        'full_body_avatars',
        'hair_color_index',
        'hair_color',
        { transaction }
      );
    }

    if (tableDescription.eye_color_index) {
      await queryInterface.removeColumn('full_body_avatars', 'eye_color', { transaction });
      await queryInterface.renameColumn(
        'full_body_avatars',
        'eye_color_index',
        'eye_color',
        { transaction }
      );
    }

    await transaction.commit();
    logger.info('Migration reverted: Removed VRM model columns from full_body_avatars');
  } catch (error) {
    await transaction.rollback();
    logger.error('Migration rollback failed: add-vrm-model-columns', error);
    throw error;
  }
}
