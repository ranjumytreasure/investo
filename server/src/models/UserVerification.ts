import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface UserVerificationAttributes {
    id: string;
    user_id: string;
    type: string; // e.g., document, selfie, aadhaar, passport
    url: string;
    is_verified: boolean;
    verified_at: Date | null;
    created_at: Date;
}

export class UserVerification extends Model<UserVerificationAttributes, Optional<UserVerificationAttributes, 'id' | 'is_verified' | 'verified_at' | 'created_at'>> implements UserVerificationAttributes {
    id!: string; user_id!: string; type!: string; url!: string; is_verified!: boolean; verified_at!: Date | null; created_at!: Date;
}

UserVerification.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    is_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    verified_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { sequelize, tableName: 'user_verifications', timestamps: false });



