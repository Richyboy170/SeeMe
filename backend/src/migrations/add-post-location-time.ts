import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDesc = await queryInterface.describeTable('posts');

  if (!tableDesc['location_name']) {
    await queryInterface.addColumn('posts', 'location_name', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['location_lat']) {
    await queryInterface.addColumn('posts', 'location_lat', {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['location_lng']) {
    await queryInterface.addColumn('posts', 'location_lng', {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['photo_taken_at']) {
    await queryInterface.addColumn('posts', 'photo_taken_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('posts', 'location_name');
  await queryInterface.removeColumn('posts', 'location_lat');
  await queryInterface.removeColumn('posts', 'location_lng');
  await queryInterface.removeColumn('posts', 'photo_taken_at');
}
