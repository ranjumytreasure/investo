import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export interface UserAttributes {
	id: string;
	name: string | null;
	phone: string;
	email: string | null;
	pin: string | null;
	pin_set: boolean;
	role: 'user' | 'admin' | 'productowner';
	otp: string | null;
	otp_expires_at: Date | null;
	referred_by: string | null;
	created_by: string | null;
	updated_by: string | null;
	created_at: Date;
	updated_at: Date;
	status: 'active' | 'inactive' | 'banned';
	kyc_verified: boolean;
	face_scan_url: string | null;
	aadhar_masked: string | null;
	passport_masked: string | null;
}

type UserCreationAttributes = Optional<
	UserAttributes,
	'id' | 'name' | 'email' | 'pin' | 'pin_set' | 'role' | 'otp' | 'otp_expires_at' | 'referred_by' | 'created_by' | 'updated_by' | 'status' | 'kyc_verified' | 'face_scan_url' | 'aadhar_masked' | 'passport_masked' | 'created_at' | 'updated_at'
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
	id!: string;
	name!: string | null;
	phone!: string;
	email!: string | null;
	pin!: string | null;
	pin_set!: boolean;
	role!: 'user' | 'admin' | 'productowner';
	otp!: string | null;
	otp_expires_at!: Date | null;
	referred_by!: string | null;
	created_by!: string | null;
	updated_by!: string | null;
	created_at!: Date;
	updated_at!: Date;
	status!: 'active' | 'inactive' | 'banned';
	kyc_verified!: boolean;
	face_scan_url!: string | null;
	aadhar_masked!: string | null;
	passport_masked!: string | null;
}

User.init(
	{
		id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
		name: { type: DataTypes.STRING, allowNull: true },
		phone: { type: DataTypes.STRING, allowNull: false, unique: true },
		email: { type: DataTypes.STRING, allowNull: true },
		pin: { type: DataTypes.STRING, allowNull: true },
		pin_set: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
		role: { type: DataTypes.ENUM('user', 'admin', 'productowner'), allowNull: false, defaultValue: 'user' },
		otp: { type: DataTypes.STRING, allowNull: true },
		otp_expires_at: { type: DataTypes.DATE, allowNull: true },
		referred_by: { type: DataTypes.UUID, allowNull: true },
		created_by: { type: DataTypes.UUID, allowNull: true },
		updated_by: { type: DataTypes.UUID, allowNull: true },
		created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
		updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
		status: { type: DataTypes.ENUM('active', 'inactive', 'banned'), allowNull: false, defaultValue: 'active' },
		kyc_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
		face_scan_url: { type: DataTypes.STRING, allowNull: true },
		aadhar_masked: { type: DataTypes.STRING, allowNull: true },
		passport_masked: { type: DataTypes.STRING, allowNull: true }
	},
	{ sequelize, tableName: 'users', timestamps: false }
);




