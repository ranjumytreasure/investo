import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface ComplaintAttributes {
    id: string; user_id: string; group_id: string | null; category: string; description: string | null; status: string; created_at: Date;
}

export class Complaint extends Model<ComplaintAttributes, Optional<ComplaintAttributes, 'id' | 'group_id' | 'description' | 'status' | 'created_at'>> implements ComplaintAttributes {
    id!: string; user_id!: string; group_id!: string | null; category!: string; description!: string | null; status!: string; created_at!: Date;
}

Complaint.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    group_id: { type: DataTypes.UUID, allowNull: true },
    category: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'open' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { sequelize, tableName: 'complaints', timestamps: false });




