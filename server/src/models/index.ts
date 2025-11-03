export * from './User';
export * from './Address';
export * from './UserVerification';
export * from './Group';
export * from './GroupUserShare';
export * from './GroupAccount';
export * from './Auction';
export * from './Finance';
export * from './PaymentMethod';
export * from './CompanyAccount';
export * from './Complaint';
export * from './FeatureConfig';
export * from './GroupFeature';

// Associations (kept minimal; can be expanded as needed)
// Note: Importing inside prevents circular evaluation at module load
import { User } from './User';
import { UserAddress } from './Address';
import { UserVerification } from './UserVerification';
import { Group } from './Group';
import { GroupUserShare } from './GroupUserShare';
import { GroupAccount } from './GroupAccount';
import { Auction } from './Auction';
import { Receivable, Receipt, Payable, Payment } from './Finance';
import { PaymentMethod } from './PaymentMethod';
import { FeatureConfig } from './FeatureConfig';
import { GroupFeature } from './GroupFeature';

// Users
User.hasMany(UserAddress, { foreignKey: 'user_id' });
UserAddress.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(UserVerification, { foreignKey: 'user_id' });
UserVerification.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(PaymentMethod, { foreignKey: 'user_id' });
PaymentMethod.belongsTo(User, { foreignKey: 'user_id' });

// Groups & membership
Group.hasMany(GroupUserShare, { foreignKey: 'group_id' });
GroupUserShare.belongsTo(Group, { foreignKey: 'group_id' });
User.hasMany(GroupUserShare, { foreignKey: 'user_id' });
GroupUserShare.belongsTo(User, { foreignKey: 'user_id' }); // user_id is nullable for pending invites

// Accounts & auctions
Group.hasMany(GroupAccount, { foreignKey: 'group_id' });
GroupAccount.belongsTo(Group, { foreignKey: 'group_id' });
Group.hasMany(Auction, { foreignKey: 'group_id' });
Auction.belongsTo(Group, { foreignKey: 'group_id' });
GroupAccount.hasMany(Auction, { foreignKey: 'group_account_id' });
Auction.belongsTo(GroupAccount, { foreignKey: 'group_account_id' });
User.hasMany(Auction, { foreignKey: 'user_id' });
Auction.belongsTo(User, { foreignKey: 'user_id' });

// Finance
Group.hasMany(Receivable, { foreignKey: 'group_id' });
Receivable.belongsTo(Group, { foreignKey: 'group_id' });
User.hasMany(Receivable, { foreignKey: 'user_id' });
Receivable.belongsTo(User, { foreignKey: 'user_id' });
Receivable.hasMany(Receipt, { foreignKey: 'receivable_id' });
Receipt.belongsTo(Receivable, { foreignKey: 'receivable_id' });
User.hasMany(Receipt, { foreignKey: 'user_id' });
Receipt.belongsTo(User, { foreignKey: 'user_id' });
Group.hasMany(Payable, { foreignKey: 'group_id' });
Payable.belongsTo(Group, { foreignKey: 'group_id' });
User.hasMany(Payable, { foreignKey: 'user_id' });
Payable.belongsTo(User, { foreignKey: 'user_id' });
Payable.hasMany(Payment, { foreignKey: 'payable_id' });
Payment.belongsTo(Payable, { foreignKey: 'payable_id' });
User.hasMany(Payment, { foreignKey: 'user_id' });
Payment.belongsTo(User, { foreignKey: 'user_id' });

// Group Features
Group.hasMany(GroupFeature, { foreignKey: 'group_id' });
GroupFeature.belongsTo(Group, { foreignKey: 'group_id' });
FeatureConfig.hasMany(GroupFeature, { foreignKey: 'feature_id' });
GroupFeature.belongsTo(FeatureConfig, { foreignKey: 'feature_id' });



