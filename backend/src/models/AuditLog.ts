import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AuditLogAttributes {
  id: string;
  adminUserId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'targetType' | 'targetId' | 'details' | 'ipAddress' | 'createdAt'> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: string;
  public adminUserId!: string;
  public action!: string;
  public targetType!: string | null;
  public targetId!: string | null;
  public details!: string | null;
  public ipAddress!: string | null;
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    adminUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    targetType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    targetId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'admin_audit_logs',
    timestamps: true,
    updatedAt: false,
  }
);

export default AuditLog;
