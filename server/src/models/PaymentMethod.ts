import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface PaymentMethodAttributes {
    id: string;
    user_id: string | null;
    name: string; // UPI, BankTransfer, Card, Cash
    details_json: string | null; // store masked account, upi id, etc
    active: boolean;
    created_at: Date;
    updated_at: Date;
}

export class PaymentMethod extends Model<PaymentMethodAttributes, Optional<PaymentMethodAttributes, 'id' | 'user_id' | 'details_json' | 'active' | 'created_at' | 'updated_at'>> implements PaymentMethodAttributes {
    id!: string; user_id!: string | null; name!: string; details_json!: string | null; active!: boolean; created_at!: Date; updated_at!: Date;
}

PaymentMethod.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    details_json: { type: DataTypes.TEXT, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { sequelize, tableName: 'payment_methods', timestamps: false });



