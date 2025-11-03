import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface GroupAccountAttributes {
    id: string;
    group_id: string;
    auction_amount: number;
    commission: number;
    cash_to_customer: number;
    balance: number;
    profit_per_person: number;
}

type GroupAccountCreation = Optional<GroupAccountAttributes, 'id' | 'commission' | 'cash_to_customer' | 'balance' | 'profit_per_person'>;

export class GroupAccount extends Model<GroupAccountAttributes, GroupAccountCreation> implements GroupAccountAttributes {
    id!: string;
    group_id!: string;
    auction_amount!: number;
    commission!: number;
    cash_to_customer!: number;
    balance!: number;
    profit_per_person!: number;
}

GroupAccount.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        group_id: { type: DataTypes.UUID, allowNull: false },
        auction_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        commission: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        cash_to_customer: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        profit_per_person: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }
    },
    { sequelize, tableName: 'group_accounts', timestamps: false }
);




