import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDesc = await queryInterface.describeTable('avatar_configs');

  if (!tableDesc['gender']) {
    await queryInterface.addColumn('avatar_configs', 'gender', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['face_shape']) {
    await queryInterface.addColumn('avatar_configs', 'face_shape', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['facial_hair']) {
    await queryInterface.addColumn('avatar_configs', 'facial_hair', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['eyebrow_style']) {
    await queryInterface.addColumn('avatar_configs', 'eyebrow_style', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['mouth_style']) {
    await queryInterface.addColumn('avatar_configs', 'mouth_style', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!tableDesc['nose_style']) {
    await queryInterface.addColumn('avatar_configs', 'nose_style', {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('avatar_configs', 'gender');
  await queryInterface.removeColumn('avatar_configs', 'face_shape');
  await queryInterface.removeColumn('avatar_configs', 'facial_hair');
  await queryInterface.removeColumn('avatar_configs', 'eyebrow_style');
  await queryInterface.removeColumn('avatar_configs', 'mouth_style');
  await queryInterface.removeColumn('avatar_configs', 'nose_style');
}
