import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDesc = await queryInterface.describeTable('users');
  if (!tableDesc['avatar_url']) {
    await queryInterface.addColumn('users', 'avatar_url', {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'avatar_url');
}
