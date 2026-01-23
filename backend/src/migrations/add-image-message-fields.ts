import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration to add image message fields to the messages table
 * Fields: imageViewMode, viewedAt, expiresAt, isExpired
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Check if columns already exist before adding
  const tableInfo = await queryInterface.describeTable('messages');

  if (!tableInfo['image_view_mode']) {
    await queryInterface.addColumn('messages', 'image_view_mode', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null
    });
  }

  if (!tableInfo['viewed_at']) {
    await queryInterface.addColumn('messages', 'viewed_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    });
  }

  if (!tableInfo['expires_at']) {
    await queryInterface.addColumn('messages', 'expires_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    });
  }

  if (!tableInfo['is_expired']) {
    await queryInterface.addColumn('messages', 'is_expired', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('messages', 'image_view_mode');
  await queryInterface.removeColumn('messages', 'viewed_at');
  await queryInterface.removeColumn('messages', 'expires_at');
  await queryInterface.removeColumn('messages', 'is_expired');
}
