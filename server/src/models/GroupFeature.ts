import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface GroupFeatureAttributes {
    id: string;
    group_id: string;
    feature_id: string | null;
    feature_name: string;
    charge_percent: number;
    charge_amount: number;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
}

type GroupFeatureCreationAttributes = Optional<
    GroupFeatureAttributes,
    'id' | 'feature_id' | 'enabled' | 'created_at' | 'updated_at'
>;

export class GroupFeature extends Model<GroupFeatureAttributes, GroupFeatureCreationAttributes> implements GroupFeatureAttributes {
    id!: string;
    group_id!: string;
    feature_id!: string | null;
    feature_name!: string;
    charge_percent!: number;
    charge_amount!: number;
    enabled!: boolean;
    created_at!: Date;
    updated_at!: Date;
}

GroupFeature.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        group_id: { type: DataTypes.UUID, allowNull: false },
        feature_id: { type: DataTypes.UUID, allowNull: true },
        feature_name: { type: DataTypes.STRING, allowNull: false },
        charge_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        charge_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { sequelize, tableName: 'group_features', timestamps: false }
);

