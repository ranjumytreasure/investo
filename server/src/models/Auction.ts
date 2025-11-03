import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface AuctionAttributes {
    id: string;
    group_account_id: string | null;
    group_id: string;
    user_id: string | null; // winner
    amount: number;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
}

type AuctionCreation = Optional<AuctionAttributes, 'id' | 'group_account_id' | 'user_id' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'>;

export class Auction extends Model<AuctionAttributes, AuctionCreation> implements AuctionAttributes {
    id!: string;
    group_account_id!: string | null;
    group_id!: string;
    user_id!: string | null;
    amount!: number;
    created_by!: string | null;
    updated_by!: string | null;
    created_at!: Date;
    updated_at!: Date;
}

Auction.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        group_account_id: { type: DataTypes.UUID, allowNull: true },
        group_id: { type: DataTypes.UUID, allowNull: false },
        user_id: { type: DataTypes.UUID, allowNull: true },
        amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        created_by: { type: DataTypes.UUID, allowNull: true },
        updated_by: { type: DataTypes.UUID, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { sequelize, tableName: 'auctions', timestamps: false }
);




