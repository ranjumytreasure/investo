import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface FeatureConfigAttributes {
    id: string;
    name: string;
    description: string | null;
    charge_percent: number;
    is_active: boolean;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
}

type FeatureConfigCreationAttributes = Optional<
    FeatureConfigAttributes,
    'id' | 'description' | 'is_active' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>;

export class FeatureConfig extends Model<FeatureConfigAttributes, FeatureConfigCreationAttributes> implements FeatureConfigAttributes {
    id!: string;
    name!: string;
    description!: string | null;
    charge_percent!: number;
    is_active!: boolean;
    created_by!: string | null;
    updated_by!: string | null;
    created_at!: Date;
    updated_at!: Date;
}

FeatureConfig.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: true },
        charge_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: { type: DataTypes.UUID, allowNull: true },
        updated_by: { type: DataTypes.UUID, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { sequelize, tableName: 'feature_configs', timestamps: false }
);

