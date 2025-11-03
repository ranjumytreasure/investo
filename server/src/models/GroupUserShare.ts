import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface GroupUserShareAttributes {
    id: string;
    group_id: string;
    user_id: string | null; // Nullable for pending invites
    phone: string | null; // Phone number for invites to non-registered users
    share_no: number;
    share_percent: number;
    contribution_amount: number;
    status: string; // 'pending', 'accepted', 'active', 'declined'
    invited_by: string | null; // User ID who sent the invite
    can_invite: boolean; // Permission to invite other users
    invite_otp: string | null; // OTP for invite verification
    invite_otp_expires_at: Date | null;
    invite_link: string | null; // Saved invite link for resending
    created_at: Date;
    updated_at: Date;
}

type GroupUserShareCreation = Optional<
    GroupUserShareAttributes,
    'id' | 'user_id' | 'phone' | 'status' | 'invited_by' | 'can_invite' | 'invite_otp' | 'invite_otp_expires_at' | 'invite_link' | 'created_at' | 'updated_at'
>;

export class GroupUserShare extends Model<GroupUserShareAttributes, GroupUserShareCreation> implements GroupUserShareAttributes {
    id!: string;
    group_id!: string;
    user_id!: string | null;
    phone!: string | null;
    share_no!: number;
    share_percent!: number;
    contribution_amount!: number;
    status!: string;
    invited_by!: string | null;
    can_invite!: boolean;
    invite_otp!: string | null;
    invite_otp_expires_at!: Date | null;
    invite_link!: string | null;
    created_at!: Date;
    updated_at!: Date;
}

GroupUserShare.init(
    {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        group_id: { type: DataTypes.UUID, allowNull: false },
        user_id: { type: DataTypes.UUID, allowNull: true }, // Nullable for pending invites
        phone: { type: DataTypes.STRING, allowNull: true }, // For invites
        share_no: { type: DataTypes.INTEGER, allowNull: false },
        share_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
        contribution_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
        invited_by: { type: DataTypes.UUID, allowNull: true },
        can_invite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        invite_otp: { type: DataTypes.STRING, allowNull: true },
        invite_otp_expires_at: { type: DataTypes.DATE, allowNull: true },
        invite_link: { type: DataTypes.TEXT, allowNull: true }, // Save invite link for resending
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { sequelize, tableName: 'group_usershares', timestamps: false }
);




