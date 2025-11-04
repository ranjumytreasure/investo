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
    status: 'open' | 'closed' | 'completed';
    winner_share_id: string | null; // group_usershare_id of the winning bid
    created_at: Date;
    updated_at: Date;
}

type GroupAccountCreation = Optional<GroupAccountAttributes, 'id' | 'commission' | 'cash_to_customer' | 'balance' | 'profit_per_person' | 'status' | 'winner_share_id' | 'created_at' | 'updated_at'>;

export class GroupAccount extends Model<GroupAccountAttributes, GroupAccountCreation> implements GroupAccountAttributes {
    id!: string;
    group_id!: string;
    auction_amount!: number;
    commission!: number;
    cash_to_customer!: number;
    balance!: number;
    profit_per_person!: number;
    status!: 'open' | 'closed' | 'completed';
    winner_share_id!: string | null;
    created_at!: Date;
    updated_at!: Date;
}

GroupAccount.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        group_id: { type: DataTypes.UUID, allowNull: false },
        auction_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        commission: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        cash_to_customer: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        profit_per_person: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        status: { type: DataTypes.ENUM('open', 'closed', 'completed'), allowNull: false, defaultValue: 'open' },
        winner_share_id: { type: DataTypes.UUID, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { sequelize, tableName: 'group_accounts', timestamps: false }
);




