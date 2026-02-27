import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface) {
  const tableDesc = await queryInterface.describeTable('friendship_meetups');

  if (!tableDesc['decorated_strip_url']) {
    await queryInterface.addColumn('friendship_meetups', 'decorated_strip_url', {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    });
  }
}

export async function down(queryInterface: QueryInterface) {
  const tableDesc = await queryInterface.describeTable('friendship_meetups');
  if (tableDesc['decorated_strip_url']) {
    await queryInterface.removeColumn('friendship_meetups', 'decorated_strip_url');
  }
}
