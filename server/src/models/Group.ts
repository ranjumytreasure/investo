import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface GroupAttributes {
    id: string;
    name: string;
    type: string; // 'deductive'
    amount: number;
    status: 'new' | 'inprogress' | 'closed';
    first_auction_date: Date | null;
    auction_frequency: string | null; // 'weekly' | 'biweekly' | 'monthly'
    number_of_members: number | null;
    billing_charges: number;
    auction_start_at: Date | null;
    auction_end_at: Date | null;
    referred_by: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
}

type GroupCreationAttributes = Optional<
    GroupAttributes,
    'id' | 'status' | 'first_auction_date' | 'auction_frequency' | 'number_of_members' | 'billing_charges' | 'auction_start_at' | 'auction_end_at' | 'referred_by' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'
>;

export class Group extends Model<GroupAttributes, GroupCreationAttributes> implements GroupAttributes {
    id!: string;
    name!: string;
    type!: string;
    amount!: number;
    status!: 'new' | 'inprogress' | 'closed';
    first_auction_date!: Date | null;
    auction_frequency!: string | null;
    number_of_members!: number | null;
    billing_charges!: number;
    auction_start_at!: Date | null;
    auction_end_at!: Date | null;
    referred_by!: string | null;
    created_by!: string | null;
    updated_by!: string | null;
    created_at!: Date;
    updated_at!: Date;
}

Group.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'deductive' },
        amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        status: { type: DataTypes.ENUM('new', 'inprogress', 'closed'), allowNull: false, defaultValue: 'new' },
        first_auction_date: { type: DataTypes.DATE, allowNull: true },
        auction_frequency: { type: DataTypes.STRING, allowNull: true },
        number_of_members: { type: DataTypes.INTEGER, allowNull: true },
        billing_charges: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        auction_start_at: { type: DataTypes.DATE, allowNull: true },
        auction_end_at: { type: DataTypes.DATE, allowNull: true },
        referred_by: { type: DataTypes.UUID, allowNull: true },
        created_by: { type: DataTypes.UUID, allowNull: true },
        updated_by: { type: DataTypes.UUID, allowNull: true },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { sequelize, tableName: 'groups', timestamps: false }
);




