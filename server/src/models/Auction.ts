import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface AuctionAttributes {
    id: string;
    group_account_id: string | null;
    group_id: string;
    group_usershare_id: string | null; // Share that placed this bid
    user_id: string | null; // User who placed the bid
    amount: number;
    is_winning_bid: boolean; // Whether this is the current winning bid
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
}

type AuctionCreation = Optional<AuctionAttributes, 'id' | 'group_account_id' | 'group_usershare_id' | 'user_id' | 'is_winning_bid' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'>;

export class Auction extends Model<AuctionAttributes, AuctionCreation> implements AuctionAttributes {
    id!: string;
    group_account_id!: string | null;
    group_id!: string;
    group_usershare_id!: string | null;
    user_id!: string | null;
    amount!: number;
    is_winning_bid!: boolean;
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
        group_usershare_id: { type: DataTypes.UUID, allowNull: true },
        user_id: { type: DataTypes.UUID, allowNull: true },
        amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        is_winning_bid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: DataTypes.UUID, allowNull: true },
        updated_by: { type: DataTypes.UUID, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { sequelize, tableName: 'auctions', timestamps: false }
);




