import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface ReceivableAttributes {
    id: string;
    group_id: string;
    user_id: string;
    group_share_id: string | null;
    expected_amount: number;
    due_date: Date | null;
    status: string; // pending, paid, overdue
}

export class Receivable extends Model<ReceivableAttributes, Optional<ReceivableAttributes, 'id' | 'group_share_id' | 'due_date' | 'status'>> implements ReceivableAttributes {
    id!: string; group_id!: string; user_id!: string; group_share_id!: string | null; expected_amount!: number; due_date!: Date | null; status!: string;
}

Receivable.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    group_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    group_share_id: { type: DataTypes.UUID, allowNull: true },
    expected_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    due_date: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' }
}, { sequelize, tableName: 'receivables', timestamps: false });

export interface ReceiptAttributes {
    id: string;
    receivable_id: string;
    user_id: string;
    amount: number;
    payment_method: string;
    trx_number: string | null;
    status: string; // success, failed, pending
}

export class Receipt extends Model<ReceiptAttributes, Optional<ReceiptAttributes, 'id' | 'trx_number' | 'status'>> implements ReceiptAttributes {
    id!: string; receivable_id!: string; user_id!: string; amount!: number; payment_method!: string; trx_number!: string | null; status!: string;
}

Receipt.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    receivable_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: false },
    trx_number: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'success' }
}, { sequelize, tableName: 'receipts', timestamps: false });

export interface PayableAttributes {
    id: string; group_id: string; user_id: string; amount: number;
}

export class Payable extends Model<PayableAttributes, Optional<PayableAttributes, 'id'>> implements PayableAttributes {
    id!: string; group_id!: string; user_id!: string; amount!: number;
}

Payable.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    group_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
}, { sequelize, tableName: 'payables', timestamps: false });

export interface PaymentAttributes { id: string; payable_id: string; group_id: string; user_id: string; amount: number; }

export class Payment extends Model<PaymentAttributes, Optional<PaymentAttributes, 'id'>> implements PaymentAttributes {
    id!: string; payable_id!: string; group_id!: string; user_id!: string; amount!: number;
}

Payment.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    payable_id: { type: DataTypes.UUID, allowNull: false },
    group_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
}, { sequelize, tableName: 'payments', timestamps: false });

export interface LedgerEntryAttributes { id: string; group_id: string; user_id: string | null; type: string; amount: number; description: string | null; created_at: Date; }

export class LedgerEntry extends Model<LedgerEntryAttributes, Optional<LedgerEntryAttributes, 'id' | 'user_id' | 'description' | 'created_at'>> implements LedgerEntryAttributes {
    id!: string; group_id!: string; user_id!: string | null; type!: string; amount!: number; description!: string | null; created_at!: Date;
}

LedgerEntry.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    group_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { sequelize, tableName: 'ledger_entries', timestamps: false });




