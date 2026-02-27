import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDesc = await queryInterface.describeTable('users');

  if (!tableDesc['role']) {
    await queryInterface.addColumn('users', 'role', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'user',
    });
  }

  if (!tableDesc['status']) {
    await queryInterface.addColumn('users', 'status', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
    });
  }

  if (!tableDesc['suspended_until']) {
    await queryInterface.addColumn('users', 'suspended_until', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['ban_reason']) {
    await queryInterface.addColumn('users', 'ban_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['suspend_reason']) {
    await queryInterface.addColumn('users', 'suspend_reason', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'role');
  await queryInterface.removeColumn('users', 'status');
  await queryInterface.removeColumn('users', 'suspended_until');
  await queryInterface.removeColumn('users', 'ban_reason');
  await queryInterface.removeColumn('users', 'suspend_reason');
}
