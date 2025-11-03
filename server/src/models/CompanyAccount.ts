import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface CompanyAccountAttributes {
    id: string;
    name: string; // Company master account display name
    account_type: string; // e.g., Settlement, Commission, Reserve
    details_json: string | null; // bank/upi details
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

export class CompanyAccount extends Model<CompanyAccountAttributes, Optional<CompanyAccountAttributes, 'id' | 'details_json' | 'active' | 'created_at' | 'updated_at'>> implements CompanyAccountAttributes {
    id!: string; name!: string; account_type!: string; details_json!: string | null; active!: boolean; created_at!: Date; updated_at!: Date;
}

CompanyAccount.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    account_type: { type: DataTypes.STRING, allowNull: false },
    details_json: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { sequelize, tableName: 'company_accounts', timestamps: false });



