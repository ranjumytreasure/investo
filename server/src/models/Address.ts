import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface UserAddressAttributes {
    id: string;
    user_id: string;
    address_type: string;
    address_line1: string | null;
    address_line2: string | null;
    landmark: string | null;
    city: string | null;
    state: string | null;
    country: string;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    proof_type: string | null;
    proof_document_url: string | null;
    verified: boolean;
    verified_date: Date | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: Date;
    updated_at: Date;
}

export class UserAddress extends Model<UserAddressAttributes, Optional<UserAddressAttributes, 'id' | 'address_type' | 'address_line1' | 'address_line2' | 'landmark' | 'city' | 'state' | 'pincode' | 'latitude' | 'longitude' | 'proof_type' | 'proof_document_url' | 'verified' | 'verified_date' | 'created_by' | 'updated_by' | 'created_at' | 'updated_at'>> implements UserAddressAttributes {
    id!: string; user_id!: string; address_type!: string; address_line1!: string | null; address_line2!: string | null; landmark!: string | null; city!: string | null; state!: string | null; country!: string; pincode!: string | null; latitude!: number | null; longitude!: number | null; proof_type!: string | null; proof_document_url!: string | null; verified!: boolean; verified_date!: Date | null; created_by!: string | null; updated_by!: string | null; created_at!: Date; updated_at!: Date;
}

UserAddress.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    address_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'home' },
    address_line1: { type: DataTypes.STRING, allowNull: true },
    address_line2: { type: DataTypes.STRING, allowNull: true },
    landmark: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: false, defaultValue: 'India' },
    pincode: { type: DataTypes.STRING, allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    proof_type: { type: DataTypes.STRING, allowNull: true },
    proof_document_url: { type: DataTypes.STRING, allowNull: true },
    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    verified_date: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, { sequelize, tableName: 'user_addresses', timestamps: false });




