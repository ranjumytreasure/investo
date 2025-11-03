import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface ConfigAttributes { key: string; value: string }

export class Config extends Model<ConfigAttributes, Optional<ConfigAttributes, never>> implements ConfigAttributes {
    key!: string; value!: string;
}

Config.init({
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.STRING, allowNull: false }
}, { sequelize, tableName: 'config', timestamps: false });




